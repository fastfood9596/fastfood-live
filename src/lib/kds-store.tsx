import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Context, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKsh, removeCategory, upsert, type Category, type MenuItem } from "./menu";
import { canDispatch, type OrderSource, type OrderType, type Payment } from "./orders";
import {
  ORDER_WINDOW_MS,
  categoryFromRow,
  itemFromRow,
  newOrderRow,
  orderFromRow,
  orderStateRow,
  sortCategories,
  type CategoryRow,
  type MenuItemRow,
  type NewOrderInput,
  type OrderRow,
} from "./kds-db";

export type { OrderType } from "./orders";
/** awaiting = online order the cashier hasn't sent to the kitchen yet. */
export type OrderStatus = "awaiting" | "new" | "preparing" | "ready" | "completed";

export type OrderItem = {
  key: string;
  menuId: string;
  name: string;
  qty: number;
  /** Unit price including portion/sauce extras. */
  price: number;
  done: boolean;
  /** Customer choices shown to the kitchen, e.g. "Large", "+ Garlic Sauce". */
  options?: string[] | undefined;
};

export type Order = {
  id: string;
  number: number;
  customer: string;
  phone?: string | undefined;
  type: OrderType;
  items: OrderItem[];
  status: OrderStatus;
  source: OrderSource;
  payment: Payment;
  /** Quick instruction tags, e.g. "Extra Salt". */
  notes: string[];
  /** When the kitchen got the ticket (or, while awaiting, when the customer ordered). */
  createdAt: number;
  /** When the customer submitted an online order. */
  placedAt?: number | undefined;
  readyAt?: number | undefined;
};

/** connecting = first load; live = receiving changes from other devices; offline = connection lost. */
export type MpesaConfig = {
  mode: "till" | "paybill";
  tillNumber: string;
  businessNumber: string;
  accountNumber: string;
};

const DEFAULT_MPESA_CONFIG: MpesaConfig = {
  mode: "till",
  tillNumber: "",
  businessNumber: "",
  accountNumber: "",
};
export type SyncStatus = "connecting" | "live" | "offline";

export const orderTotal = (o: Pick<Order, "items">) =>
  o.items.reduce((sum, i) => sum + i.price * i.qty, 0);

export const nextStatus = (s: OrderStatus): OrderStatus =>
  s === "awaiting" ? "new" : s === "new" ? "preparing" : s === "preparing" ? "ready" : "completed";

/** Ticket age level used to color kitchen tickets. */
export const ageLevel = (ms: number): "fresh" | "warn" | "late" =>
  ms >= 10 * 60_000 ? "late" : ms >= 5 * 60_000 ? "warn" : "fresh";

export const formatDuration = (ms: number, withHours = false) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return withHours || h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const money = formatKsh;

type Store = {
  orders: Order[];
  /** Saves the order; the database assigns its number. Throws if it couldn't be saved. */
  placeOrder: (input: NewOrderInput) => Promise<Order>;
  setPayment: (orderId: string, payment: Payment) => void;
  /** Send an awaiting online order to the kitchen. Returns false if payment isn't checked. */
  dispatchOnline: (orderId: string) => boolean;
  advance: (id: string) => void;
  recall: (id: string) => void;
  toggleItem: (orderId: string, itemKey: string) => void;
  lastBumped: Order | undefined;
  categories: Category[];
  items: MenuItem[];
  menuReady: boolean;
  ordersReady: boolean;
  sync: SyncStatus;
  mpesaConfig: MpesaConfig;
  saveMpesaConfig: (config: MpesaConfig) => Promise<void>;
  saveCategory: (input: Omit<Category, "id"> & { id?: string | undefined }) => Category;
  deleteCategory: (id: string) => void;
  saveItem: (input: Omit<MenuItem, "id"> & { id?: string | undefined }) => MenuItem;
  deleteItem: (id: string) => void;
  setItemAvailable: (id: string, available: boolean) => void;
};

// Reuse one context instance across hot reloads: re-evaluating this module would
// otherwise create a new context, so the mounted provider and consumers mismatch.
const globalForKds = globalThis as typeof globalThis & {
  __kdsContext?: Context<Store | null>;
};
const KdsContext = (globalForKds.__kdsContext ??= createContext<Store | null>(null));

export function KdsProvider({ 
  children, 
  restaurantId: restaurantIdProp 
}: { 
  children: ReactNode; 
  restaurantId?: string | null 
}) {
  const restaurantId = restaurantIdProp || import.meta.env["VITE_RESTAURANT_ID"];

  const [orders, setOrders] = useState<Order[]>([]);
  const [lastBumpedId, setLastBumpedId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [menuReady, setMenuReady] = useState(false);
  const [ordersReady, setOrdersReady] = useState(false);
  const [sync, setSync] = useState<SyncStatus>("connecting");
 const [mpesaConfig, setMpesaConfig] = useState<MpesaConfig>(DEFAULT_MPESA_CONFIG);

  useEffect(() => {
    if (!restaurantId) {
      setMpesaConfig(DEFAULT_MPESA_CONFIG);
      return;
    }

    let cancelled = false;

    async function loadMpesaConfig() {
      const { data, error } = await (supabase as any)
        .from("restaurants")
        .select("mpesa_mode, mpesa_till_number, mpesa_business_number, mpesa_account_number")
        .eq("id", restaurantId)
        .maybeSingle();

      if (cancelled || error || !data) return;

      setMpesaConfig({
        mode: data.mpesa_mode === "paybill" ? "paybill" : "till",
        tillNumber: data.mpesa_till_number ?? "",
        businessNumber: data.mpesa_business_number ?? "",
        accountNumber: data.mpesa_account_number ?? "",
      });
    }

    loadMpesaConfig();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const saveMpesaConfig = useCallback(
    async (config: MpesaConfig) => {
      setMpesaConfig(config);
      if (!restaurantId) {
        toast.error("Missing restaurant ID.");
        return;
      }

      const { error } = await (supabase as any)
        .from("restaurants")
        .update({
          mpesa_mode: config.mode,
          mpesa_till_number: config.tillNumber.trim() || null,
          mpesa_business_number: config.businessNumber.trim() || null,
          mpesa_account_number: config.accountNumber.trim() || null,
        })
        .eq("id", restaurantId);

      if (error) {
        console.error(error);
        toast.error("Could not save M-Pesa settings to database.");
        return;
      }

      toast.success("Lipa na M-Pesa details saved.");
    },
    [restaurantId],
  );

  const ordersRef = useRef(orders);
  const itemsRef = useRef(items);
  const categoriesRef = useRef(categories);
  useEffect(() => {
    ordersRef.current = orders;
    itemsRef.current = items;
    categoriesRef.current = categories;
  }, [orders, items, categories]);

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;

    const [cats, dishes] = await Promise.all([
      supabase.from("categories").select("*").eq("restaurant_id" as any, restaurantId).order("sort_order").order("created_at"),
      supabase.from("menu_items").select("*").eq("restaurant_id" as any, restaurantId).order("created_at"),
    ]);
    if (cats.error || dishes.error) {
      console.error(cats.error ?? dishes.error);
      toast.error("Couldn't load the menu. Check the connection and refresh.");
      return;
    }
    setCategories(sortCategories(cats.data.map(categoryFromRow)));
    setItems(dishes.data.map(itemFromRow));
    setMenuReady(true);
  }, [restaurantId]);

  const loadOrders = useCallback(async () => {
    if (!restaurantId) return;

    const since = new Date(Date.now() - ORDER_WINDOW_MS).toISOString();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id" as any, restaurantId)
      .gte("created_at", since)
      .order("created_at")
      .limit(1000);
    if (error) {
      console.error(error);
      toast.error("Couldn't load orders. Check the connection and refresh.");
      return;
    }
    setOrders(data.map(orderFromRow));
    setOrdersReady(true);
  }, [restaurantId]);

  // Initial load + live changes scoped strictly to this restaurant ID
  useEffect(() => {
    if (!restaurantId) return;

    void loadMenu();
    void loadOrders();
    let subscribedBefore = false;
    const channel = supabase
      .channel(`kds-${restaurantId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as Partial<OrderRow>).id;
          setOrders((prev) => prev.filter((o) => o.id !== id));
          return;
        }
        const order = orderFromRow(p.new as OrderRow);
        setOrders((prev) => upsert(prev, order));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: `restaurant_id=eq.${restaurantId}` }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as Partial<CategoryRow>).id;
          setCategories((prev) => prev.filter((c) => c.id !== id));
          return;
        }
        const cat = categoryFromRow(p.new as CategoryRow);
        setCategories((prev) => sortCategories(upsert(prev, cat)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items", filter: `restaurant_id=eq.${restaurantId}` }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as Partial<MenuItemRow>).id;
          setItems((prev) => prev.filter((i) => i.id !== id));
          return;
        }
        const item = itemFromRow(p.new as MenuItemRow);
        setItems((prev) => upsert(prev, item));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setSync("live");
          if (subscribedBefore) {
            void loadOrders();
            void loadMenu();
          }
          subscribedBefore = true;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setSync("offline");
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, loadMenu, loadOrders]);

  // ... (keep the rest of the store functions: placeOrder, advance, etc. exactly the same)

  const failed = useCallback(
    (what: string, error: unknown) => {
      console.error(error);
      toast.error(`${what} didn't save. Check the connection and try again.`);
      // Put screens back in line with what's really saved.
      void loadOrders();
      void loadMenu();
    },
    [loadMenu, loadOrders],
  );

  /** Apply a change on screen immediately, then save it; other devices get it in real time. */
  const updateOrder = useCallback(
    (id: string, change: (o: Order) => Order) => {
      const current = ordersRef.current.find((o) => o.id === id);
      if (!current) return;
      const next = change(current);
      ordersRef.current = ordersRef.current.map((o) => (o.id === id ? next : o));
      setOrders((prev) => prev.map((o) => (o.id === id ? next : o)));
      void supabase
        .from("orders")
        .update(orderStateRow(next))
        .eq("id", id)
        .then(({ error }) => error && failed("That order change", error));
    },
    [failed],
  );

  const placeOrder: Store["placeOrder"] = useCallback(async (input) => {
    const { data, error } = await supabase
      .from("orders")
      .insert(newOrderRow(input, itemsRef.current))
      .select()
      .single();
    if (error) {
      console.error(error);
      throw new Error("Your order didn't go through. Check the connection and try again.");
    }
    const order = orderFromRow(data);
    setOrders((prev) => upsert(prev, order));
    return order;
  }, []);

  const setPayment = useCallback(
    (orderId: string, payment: Payment) => updateOrder(orderId, (o) => ({ ...o, payment })),
    [updateOrder],
  );

  const dispatchOnline = useCallback(
    (orderId: string) => {
      const order = ordersRef.current.find((o) => o.id === orderId);
      if (!order || order.status !== "awaiting" || !canDispatch(order.payment)) return false;
      // The kitchen timer starts when the ticket reaches the kitchen.
      updateOrder(orderId, (o) => ({ ...o, status: "new", createdAt: Date.now() }));
      return true;
    },
    [updateOrder],
  );

  const advance = useCallback(
    (id: string) => {
      updateOrder(id, (o) => {
        const status = nextStatus(o.status);
        return {
          ...o,
          status,
          readyAt: status === "ready" ? Date.now() : o.readyAt,
          items: status === "ready" ? o.items.map((i) => ({ ...i, done: true })) : o.items,
        };
      });
      setLastBumpedId(id);
    },
    [updateOrder],
  );

  const recall = useCallback(
    (id: string) => {
      updateOrder(id, (o) => ({ ...o, status: "preparing", readyAt: undefined }));
      setLastBumpedId(null);
    },
    [updateOrder],
  );

  const toggleItem = useCallback(
    (orderId: string, itemKey: string) =>
      updateOrder(orderId, (o) => ({
        ...o,
        status: o.status === "new" ? "preparing" : o.status,
        items: o.items.map((i) => (i.key === itemKey ? { ...i, done: !i.done } : i)),
      })),
    [updateOrder],
  );

 const saveCategory: Store["saveCategory"] = useCallback(
    (input) => {
      const existing = input.id ? categoriesRef.current.find((c) => c.id === input.id) : undefined;
      const saved: Category = {
        id: input.id ?? crypto.randomUUID(),
        label: input.label.trim(),
        icon: input.icon,
        image: input.image?.trim() || undefined,
        sortOrder: existing?.sortOrder ?? categoriesRef.current.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), 0) + 1,
      };
      setCategories((prev) => sortCategories(upsert(prev, saved)));
    void supabase
        .from("categories")
        .upsert({ 
          id: saved.id, 
          name: saved.label, 
          icon: saved.icon, 
          image_url: saved.image ?? null, 
          sort_order: saved.sortOrder ?? 0,
          restaurant_id: restaurantId 
        } as any) // <-- Add "as any" here
        .then(({ error }) => error && failed("The category", error));
      return saved;
    },
    [failed, restaurantId],
  );

  const deleteCategory = useCallback(
    (id: string) => {
      // Dishes in the category are deleted with it (locally and in the database).
      const next = removeCategory(categoriesRef.current, itemsRef.current, id);
      setCategories(next.categories);
      setItems(next.items);
      void supabase
        .from("categories")
        .delete()
        .eq("id", id)
        .then(({ error }) => error && failed("Deleting the category", error));
    },
    [failed],
  );

  const saveItem: Store["saveItem"] = useCallback(
    (input) => {
      const saved: MenuItem = {
        id: input.id ?? crypto.randomUUID(),
        name: input.name.trim(),
        price: input.price,
        categoryId: input.categoryId,
        available: input.available,
        image: input.image?.trim() || undefined,
      };
      setItems((prev) => upsert(prev, saved));
      void supabase
        .from("menu_items")
        .upsert({
          id: saved.id,
          name: saved.name,
          price: saved.price,
          category_id: saved.categoryId,
          is_available: saved.available,
          image_url: saved.image ?? null,
          restaurant_id: restaurantId, // <-- Add this
        } as any) // <-- Add this
        .then(({ error }) => error && failed("The menu item", error));
      return saved;
    },
    [failed],
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      void supabase
        .from("menu_items")
        .delete()
        .eq("id", id)
        .then(({ error }) => error && failed("Deleting the item", error));
    },
    [failed],
  );

  const setItemAvailable = useCallback(
    (id: string, available: boolean) => {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, available } : i)));
      void supabase
        .from("menu_items")
        .update({ is_available: available })
        .eq("id", id)
        .then(({ error }) => error && failed("The stock change", error));
    },
    [failed],
  );

  const value = useMemo<Store>(
    () => ({
      orders,
      placeOrder,
      setPayment,
      dispatchOnline,
      advance,
      recall,
      toggleItem,
      lastBumped: orders.find((o) => o.id === lastBumpedId && o.status === "ready"),
      categories,
      items,
      menuReady,
      ordersReady,
      sync,
      saveCategory,
      deleteCategory,
      saveItem,
      deleteItem,
      setItemAvailable,
      mpesaConfig,       
      saveMpesaConfig,
    }),
    [
      orders,
      placeOrder,
      setPayment,
      dispatchOnline,
      advance,
      recall,
      toggleItem,
      lastBumpedId,
      categories,
      items,
      menuReady,
      ordersReady,
      sync,
      saveCategory,
      deleteCategory,
      saveItem,
      deleteItem,
      setItemAvailable,
      mpesaConfig,   
      saveMpesaConfig,
    ],
  );

  return <KdsContext.Provider value={value}>{children}</KdsContext.Provider>;
}

export function useKds() {
  const ctx = useContext(KdsContext);
  if (!ctx) throw new Error("useKds must be used inside KdsProvider");
  return ctx;
}

/** Current time, ticking every second. Null until mounted to avoid hydration mismatch. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
