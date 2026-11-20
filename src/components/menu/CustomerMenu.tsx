import { useMemo, useState } from "react";
import { Flame, LayoutGrid, Loader2, Plus, Search, ShoppingBag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { money, useKds } from "@/lib/kds-store";
import { iconFor } from "@/lib/menu-icons";
import type { Category, MenuItem } from "@/lib/menu";
import { addToCart, cartTotals, withTax, type CartLine } from "@/lib/orders";
import { DishPhoto } from "./DishPhoto";
import { ItemSheet } from "./ItemSheet";
import { CartDrawer } from "./CartDrawer";
import { OrderReceipt } from "./OrderReceipt";

export function CustomerMenu({
  table,
  trackingId,
  onTrack,
  onBackToMenu,
  restaurantId,
  customerId,
}: {
  table?: string | undefined;
  trackingId?: string | undefined;
  onTrack: (orderId: string) => void;
  onBackToMenu: () => void;
  restaurantId?: string | null;
  customerId?: string | null;
}) {
  const { categories, items, orders, menuReady, ordersReady } = useKds();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [openItem, setOpenItem] = useState<MenuItem | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const iconForItem = (item: MenuItem | null) =>
    iconFor(categories.find((c) => c.id === item?.categoryId)?.icon ?? "utensils");

  // Only dishes filed under a live category appear; sold-out ones stay visible but locked.
  const visible = useMemo(() => {
    const catIds = new Set(categories.map((c) => c.id));
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        catIds.has(i.categoryId) &&
        (activeCat === "all" || i.categoryId === activeCat) &&
        (!q || i.name.toLowerCase().includes(q)),
    );
  }, [items, categories, activeCat, query]);

  const { count, subtotal } = cartTotals(cart, items);
  const { total } = withTax(subtotal);
  const tracked = trackingId ? orders.find((o) => o.id === trackingId) : undefined;

  if (tracked) return <OrderReceipt order={tracked} onOrderMore={onBackToMenu} />;
  if (trackingId && !ordersReady)
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-label="Loading your order" />
      </div>
    );

  const grouped = activeCat === "all" && !query.trim();

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
                <Flame className="size-5 text-primary-foreground" aria-hidden />
              </div>
              <div className="leading-tight">
                <h1 className="text-xl font-extrabold tracking-tight">Cravinos</h1>
                {table && <p className="text-xs font-semibold text-dine-in">Table {table}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1.5 text-success">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="text-xs font-semibold">Open • Prep 5-10 mins</span>
            </div>
          </div>

          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search burgers, fries, drinks…"
              aria-label="Search the menu"
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-10 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </label>
        </div>

        <nav aria-label="Menu categories" className="scrollbar-none mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 pb-3">
          <CategoryPill active={activeCat === "all"} onClick={() => setActiveCat("all")} label="All">
            <span className="grid size-9 place-items-center rounded-full bg-surface text-primary">
              <LayoutGrid className="size-4" aria-hidden />
            </span>
          </CategoryPill>
          {categories.map((c) => (
            <CategoryPill key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} label={c.label}>
              <DishPhoto src={c.image} icon={iconFor(c.icon)} className="size-9 shrink-0 rounded-full" iconSize="size-4" />
            </CategoryPill>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4">
        {!menuReady ? (
          <div className="grid place-items-center py-16 text-muted-foreground" role="status">
            <Loader2 className="mb-3 size-8 animate-spin" aria-hidden />
            <p className="text-sm">Loading the menu…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
            <Search className="mb-3 size-8 text-muted-foreground" aria-hidden />
            <p className="font-semibold">No dishes found</p>
            <p className="text-sm text-muted-foreground">Try another search or category.</p>
          </div>
        ) : grouped ? (
          categories.map((c) => {
            const list = visible.filter((i) => i.categoryId === c.id);
            if (list.length === 0) return null;
            return (
              <section key={c.id} className="mb-7" aria-labelledby={`cat-${c.id}`}>
                <h2 id={`cat-${c.id}`} className="mb-3 text-lg font-extrabold tracking-tight">
                  {c.label}
                </h2>
                <DishGrid list={list} category={c} onOpen={setOpenItem} />
              </section>
            );
          })
        ) : (
          <DishGrid list={visible} categories={categories} onOpen={setOpenItem} />
        )}

        <p className="py-6 text-center text-xs text-muted-foreground">
          VAT is added at checkout.
        </p>
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="animate-ticket-in mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 rounded-2xl bg-gradient-primary px-5 font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.99]"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-5" aria-hidden />
              View Cart
            </span>
            <span className="font-mono tabular">
              {count} {count === 1 ? "Item" : "Items"} • {money(total)}
            </span>
          </button>
        </div>
      )}

      <ItemSheet
        item={openItem}
        icon={iconForItem(openItem)}
        onClose={() => setOpenItem(null)}
        onAdd={(item, customization, qty) => {
          setCart((c) => addToCart(c, item.id, customization, qty));
          setOpenItem(null);
        }}
      />

      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        setCart={setCart}
        table={table}
        restaurantId={restaurantId}
        onPlaced={(orderId) => {
          setCart([]);
          setCartOpen(false);
          onTrack(orderId);
        }}
      />
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-4 text-sm font-semibold transition-colors",
        active ? "border-primary bg-primary/15 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {label}
    </button>
  );
}

function DishGrid({
  list,
  category,
  categories,
  onOpen,
}: {
  list: MenuItem[];
  category?: Category;
  categories?: Category[];
  onOpen: (item: MenuItem) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {list.map((item) => {
        const cat = category ?? categories?.find((c) => c.id === item.categoryId);
        return <DishCard key={item.id} item={item} icon={iconFor(cat?.icon ?? "utensils")} onOpen={() => onOpen(item)} />;
      })}
    </div>
  );
}

function DishCard({ item, icon, onOpen }: { item: MenuItem; icon: typeof Plus; onOpen: () => void }) {
  const soldOut = !item.available;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={soldOut}
      aria-label={soldOut ? `${item.name}, sold out` : `${item.name}, ${money(item.price)}. Add to order`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-all hover:border-primary/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:border-border"
    >
      <div className="relative">
        <DishPhoto src={item.image} icon={icon} className={cn("aspect-[4/3]", soldOut && "opacity-40 grayscale")} />
        {soldOut && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="rounded-md bg-background/90 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-destructive">
              Sold out
            </span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <span className={cn("font-semibold leading-tight", soldOut && "text-muted-foreground")}>{item.name}</span>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-mono text-sm font-bold tabular text-primary">{money(item.price)}</span>
          {!soldOut && (
            <span className="flex items-center gap-0.5 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground transition-transform group-hover:scale-105">
              <Plus className="size-3.5" strokeWidth={3} aria-hidden />
              Add
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
