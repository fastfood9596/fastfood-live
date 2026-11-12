import type { Database, Json } from "@/integrations/supabase/types";
import { ICON_KEYS, type IconKey } from "./menu-icons";
import type { Category, MenuItem } from "./menu";
import {
  ORDER_TYPES,
  customizationLabels,
  customizedUnitPrice,
  withTax,
  type Customization,
  type OrderSource,
  type OrderType,
  type Payment,
} from "./orders";
import type { Order, OrderItem, OrderStatus } from "./kds-store";

type Tables = Database["public"]["Tables"];
export type CategoryRow = Tables["categories"]["Row"];
export type MenuItemRow = Tables["menu_items"]["Row"];
export type OrderRow = Tables["orders"]["Row"];
export type OrderInsert = Tables["orders"]["Insert"];
export type OrderUpdate = Tables["orders"]["Update"];

/** Staff screens and customer tracking load orders placed within this window. */
export const ORDER_WINDOW_MS = 24 * 60 * 60_000;

const STATUSES: OrderStatus[] = ["awaiting", "new", "preparing", "ready", "completed"];

/** Unknown or legacy statuses ("pending") wait for the cashier, so nothing skips the payment check. */
export const normalizeStatus = (s: string | null | undefined): OrderStatus =>
  STATUSES.includes(s as OrderStatus) ? (s as OrderStatus) : "awaiting";

export const normalizeOrderType = (t: string | null | undefined): OrderType =>
  ORDER_TYPES.includes(t as OrderType) ? (t as OrderType) : "takeaway";

const toTime = (iso: string | null | undefined) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : undefined;
};
const toIso = (ms: number | undefined) => (ms === undefined ? null : new Date(ms).toISOString());

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function categoryFromRow(r: CategoryRow): Category {
  return {
    id: r.id,
    label: r.name,
    icon: ICON_KEYS.includes(r.icon as IconKey) ? (r.icon as IconKey) : "utensils",
    image: r.image_url || undefined,
    sortOrder: r.sort_order ?? 0,
  };
}

export function itemFromRow(r: MenuItemRow): MenuItem {
  return {
    id: r.id,
    name: r.name,
    price: Number(r.price),
    categoryId: r.category_id ?? "",
    available: r.is_available !== false,
    image: r.image_url || undefined,
  };
}

export const sortCategories = (list: Category[]) =>
  [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

function parsePayment(v: Json): Payment {
  const p = isObject(v) ? v : {};
  const method = p["method"] === "mpesa" ? "mpesa" : "cash";
  const status = p["status"] === "paid" || p["status"] === "unpaid" ? p["status"] : "pending";
  return {
    method,
    status,
    ...(typeof p["reference"] === "string" && p["reference"] && { reference: p["reference"] }),
    ...(typeof p["phone"] === "string" && p["phone"] && { phone: p["phone"] }),
  };
}

function parseItems(v: Json): OrderItem[] {
  if (!Array.isArray(v)) return [];
  const rows = (v as unknown[]).filter(isObject);
  return rows.map((i, idx) => {
    const options = Array.isArray(i["options"]) ? i["options"].filter((o): o is string => typeof o === "string") : [];
    return {
      key: typeof i["key"] === "string" ? i["key"] : `line-${idx}`,
      menuId: typeof i["menuId"] === "string" ? i["menuId"] : "",
      name: typeof i["name"] === "string" ? i["name"] : "Item",
      qty: Math.max(1, Number(i["qty"]) || 1),
      price: Number(i["price"]) || 0,
      done: i["done"] === true,
      ...(options.length > 0 && { options }),
    };
  });
}

export function orderFromRow(r: OrderRow): Order {
  const placed = toTime(r.created_at) ?? Date.now();
  const source: OrderSource = r.source === "online" ? "online" : "counter";
  return {
    id: r.id,
    number: r.order_number,
    customer: r.customer_name?.trim() || `Guest ${r.order_number}`,
    type: normalizeOrderType(r.order_type),
    items: parseItems(r.items),
    status: normalizeStatus(r.status),
    source,
    payment: parsePayment(r.payment),
    notes: r.notes ?? [],
    // Kitchen timers start when the ticket reaches the kitchen.
    createdAt: toTime(r.kitchen_at) ?? placed,
    placedAt: source === "online" ? placed : undefined,
    readyAt: toTime(r.ready_at),
  };
}

/** The fields staff change on an order (status, payment, ticked items, timers). */
export function orderStateRow(o: Order): OrderUpdate {
  return {
    status: o.status,
    payment: o.payment as unknown as Json,
    items: o.items as unknown as Json,
    notes: o.notes,
    kitchen_at: o.status === "awaiting" ? null : toIso(o.createdAt),
    ready_at: toIso(o.readyAt),
  };
}

export type NewOrderInput = {
  customer: string;
  type: OrderType;
  items: { menuId: string; qty: number; customization?: Customization | undefined }[];
  payment: Payment;
  notes: string[];
  /** "online" = customer QR menu; lands in the cashier's Online Orders queue. */
  source?: OrderSource | undefined;
};

export function orderLine(menu: MenuItem[], menuId: string, qty: number, customization?: Customization): OrderItem | null {
  const m = menu.find((i) => i.id === menuId);
  if (!m) return null;
  const options = customization ? customizationLabels(customization) : [];
  return {
    key: `${menuId}-${Math.random().toString(36).slice(2, 7)}`,
    menuId,
    name: m.name,
    qty,
    price: customization ? customizedUnitPrice(m.price, customization) : m.price,
    done: false,
    ...(options.length > 0 && { options }),
  };
}

/**
 * Row for a new order. Online (QR) orders wait for the cashier; counter orders go straight
 * to the kitchen. The database assigns the order number. Total includes tax.
 */
export function newOrderRow(input: NewOrderInput, menu: MenuItem[], now = Date.now()): OrderInsert {
  const online = input.source === "online";
  const items = input.items.flatMap((i) => orderLine(menu, i.menuId, i.qty, i.customization) ?? []);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  return {
    customer_name: input.customer.trim() || null,
    order_type: input.type,
    status: online ? "awaiting" : "new",
    source: online ? "online" : "counter",
    payment: input.payment as unknown as Json,
    notes: input.notes,
    items: items as unknown as Json,
    total_amount: Math.round(withTax(subtotal).total * 100) / 100,
    kitchen_at: online ? null : new Date(now).toISOString(),
  };
}
