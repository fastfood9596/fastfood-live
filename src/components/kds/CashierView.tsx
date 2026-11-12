import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { Banknote, Check, CheckCircle2, Minus, Plus, QrCode, ReceiptText, Send, Smartphone, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { iconFor } from "@/lib/menu-icons";
import { money, useKds, type OrderType } from "@/lib/kds-store";
import {
  DEFAULT_COUNTER_PAYMENT,
  INSTRUCTION_TAGS,
  ORDER_TYPES,
  ORDER_TYPE_LABEL,
  TAX_RATE,
  toggleTag,
  withTax,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/orders";
import { ORDER_TYPE_ICON, ORDER_TYPE_SOLID } from "./badges";
import { OnlineOrders, Segmented } from "./OnlineOrders";
import { Thumb } from "./PhotoField";

type Mode = "counter" | "online";

export function CashierView() {
  const { orders } = useKds();
  const [mode, setMode] = useState<Mode>("counter");
  const waiting = orders.filter((o) => o.status === "awaiting").length;

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Cashier mode" className="inline-grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
        <ModeTab active={mode === "counter"} onClick={() => setMode("counter")} icon={ReceiptText} label="Counter order" />
        <ModeTab active={mode === "online"} onClick={() => setMode("online")} icon={QrCode} label="Online Orders" count={waiting} />
      </div>
      {mode === "counter" ? <CounterOrder /> : <OnlineOrders />}
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
  count = 0,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof QrCode;
  label: string;
  count?: number;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
      {count > 0 && (
        <span className="flex items-center gap-1 rounded-full bg-primary/20 px-1.5 font-mono text-[11px] leading-5 tabular text-primary">
          <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
          {count}
        </span>
      )}
    </button>
  );
}

function CounterOrder() {
  const { placeOrder, categories, items: menu } = useKds();
  const [selected, setSelected] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState("");
  const [type, setType] = useState<OrderType>("dine-in");
  const [notes, setNotes] = useState<string[]>([]);
  const [payment, setPayment] = useState<Payment>(DEFAULT_COUNTER_PAYMENT);
  const [sent, setSent] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  // Fall back to "All" if the selected category was deleted in Manage Menu.
  const category = selected !== "all" && !categoryById.has(selected) ? "all" : selected;
  const items = menu.filter((m) => categoryById.has(m.categoryId) && (category === "all" || m.categoryId === category));
  // Only in-stock items that still exist can be ordered; edited prices apply live.
  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, q]) => q > 0)
        .flatMap(([id, qty]) => {
          const item = menu.find((m) => m.id === id);
          return item && item.available && categoryById.has(item.categoryId) ? [{ item, qty }] : [];
        }),
    [cart, menu, categoryById],
  );
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const { subtotal, tax, total } = withTax(lines.reduce((s, l) => s + l.item.price * l.qty, 0));

  const change = (id: string, delta: number) => {
    setSent(null);
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));
  };

  const reset = () => {
    setCart({});
    setCustomer("");
    setType("dine-in");
    setNotes([]);
    setPayment(DEFAULT_COUNTER_PAYMENT);
  };

  const submit = async () => {
    if (!lines.length || sending) return;
    setSending(true);
    try {
      const order = await placeOrder({ customer, type, notes, payment, items: lines.map((l) => ({ menuId: l.item.id, qty: l.qty })) });
      setSent(order.number);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The order didn't go through.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-5 pb-24 lg:grid-cols-[1fr_400px] lg:pb-0">
      <section aria-label="Menu" className="min-w-0">
        <div className="scrollbar-none -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {[{ id: "all", label: "All items", icon: "utensils", image: undefined }, ...categories].map((c) => {
            const Icon = iconFor(c.icon);
            const active = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <Thumb src={c.image} icon={Icon} className="size-8 rounded-full" />
                {c.label}
              </button>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No items here yet. Add some with the <span className="font-semibold text-foreground">Manage Menu</span> button
            at the top.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((m) => {
            const Icon = iconFor(categoryById.get(m.categoryId)?.icon ?? "utensils");
            const qty = m.available ? (cart[m.id] ?? 0) : 0;
            return (
              <button
                key={m.id}
                onClick={() => change(m.id, 1)}
                disabled={!m.available}
                aria-label={m.available ? `Add ${m.name}` : `${m.name} — out of stock`}
                className={cn(
                  "group relative flex flex-col items-stretch overflow-hidden rounded-xl border bg-card text-left transition-all",
                  m.available ? "hover:-translate-y-0.5 hover:border-primary/60 active:scale-[0.98]" : "cursor-not-allowed",
                  qty > 0 ? "border-primary/70 shadow-glow" : "border-border",
                )}
              >
                <ItemPhoto src={m.image} icon={Icon} />
                <div className="min-w-0 p-3">
                  <p className="font-semibold leading-tight">{m.name}</p>
                  <p className="mt-1 font-mono text-sm tabular text-muted-foreground">{money(m.price)}</p>
                </div>
                {!m.available && (
                  <span className="absolute inset-0 grid place-items-center bg-background/75 backdrop-blur-[1px]">
                    <span className="-rotate-6 rounded-md border-2 border-destructive px-2.5 py-1 text-xs font-extrabold uppercase tracking-widest text-destructive">
                      Out of stock
                    </span>
                  </span>
                )}
                {qty > 0 && (
                  <span className="absolute right-2 top-2 grid size-7 shadow-glow place-items-center rounded-full bg-gradient-primary font-mono text-xs font-bold text-primary-foreground">
                    {qty}
                  </span>
                )}
                {m.available && (
                  <Plus className="absolute bottom-3 right-3 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <aside
        id="cart"
        aria-label="Current order"
        className="flex flex-col rounded-2xl border border-border bg-card lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)]"
      >
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current order</p>
              <h2 className="text-2xl font-extrabold tracking-tight">New order</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted-foreground">{count} items</span>
              {(lines.length > 0 || customer || notes.length > 0) && (
                <button onClick={reset} className="text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-destructive hover:underline">
                  Clear
                </button>
              )}
            </div>
          </div>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Customer name or table"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <div role="radiogroup" aria-label="Order type" className="grid grid-cols-3 gap-1 rounded-lg bg-background p-1">
            {ORDER_TYPES.map((t) => {
              const Icon = ORDER_TYPE_ICON[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold uppercase tracking-wide transition-colors",
                    active ? ORDER_TYPE_SOLID[t] : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {ORDER_TYPE_LABEL[t]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-32 flex-1 overflow-y-auto p-2">
          {sent !== null && !lines.length ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <CheckCircle2 className="size-10 text-success" aria-hidden />
              <p className="font-semibold">Order #{sent} sent to kitchen</p>
              <p className="text-sm text-muted-foreground">Tap a menu item to start a new order.</p>
            </div>
          ) : !lines.length ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Tap menu items to add them to the order.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lines.map(({ item, qty }) => (
                <li key={item.id} className="flex items-center gap-3 px-2 py-3">
                  <Thumb src={item.image} icon={iconFor(categoryById.get(item.categoryId)?.icon ?? "utensils")} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="font-mono text-xs tabular text-muted-foreground">{money(item.price * qty)}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-background">
                    <button onClick={() => change(item.id, -1)} className="grid size-8 place-items-center text-muted-foreground hover:text-foreground" aria-label={`Remove one ${item.name}`}>
                      {qty === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
                    </button>
                    <span className="w-5 text-center font-mono text-sm tabular">{qty}</span>
                    <button onClick={() => change(item.id, 1)} className="grid size-8 place-items-center text-muted-foreground hover:text-foreground" aria-label={`Add one ${item.name}`}>
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-border p-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instructions</p>
            <div className="flex flex-wrap gap-1.5">
              {INSTRUCTION_TAGS.map((tag) => {
                const on = notes.includes(tag);
                return (
                  <button
                    key={tag}
                    aria-pressed={on}
                    onClick={() => setNotes((n) => toggleTag(n, tag))}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      on ? "border-warning bg-warning/15 text-warning" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {on ? <Check className="size-3" strokeWidth={3} aria-hidden /> : <Plus className="size-3" aria-hidden />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment</p>
            <div className="grid grid-cols-2 gap-2">
              <Segmented<PaymentMethod>
                label="Payment method"
                value={payment.method}
                onChange={(method) => setPayment((p) => ({ ...p, method }))}
                options={[
                  { id: "mpesa", label: "M-Pesa", icon: Smartphone },
                  { id: "cash", label: "Cash", icon: Banknote },
                ]}
              />
              <Segmented<PaymentStatus>
                label="Payment status"
                value={payment.status}
                onChange={(status) => setPayment((p) => ({ ...p, status }))}
                options={[
                  { id: "paid", label: "Paid", activeClass: "bg-success/20 text-success" },
                  { id: "unpaid", label: "Unpaid", activeClass: "bg-destructive/20 text-destructive" },
                ]}
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <Row label="Subtotal" value={money(subtotal)} />
            <Row label={`Tax (${Math.round(TAX_RATE * 100)}%)`} value={money(tax)} />
            <div className="flex items-baseline justify-between pt-1">
              <span className="font-semibold">Total</span>
              <span className="font-mono text-2xl font-bold tabular">{money(total)}</span>
            </div>
          </div>
          <button
            onClick={() => void submit()}
            disabled={!lines.length || sending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3.5 font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <Send className="size-4" aria-hidden />
            {sending ? "Sending…" : "Send to Kitchen"}
          </button>
        </div>
      </aside>

      {lines.length > 0 && (
        <a
          href="#cart"
          className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-xl bg-gradient-primary px-5 py-3.5 font-bold text-primary-foreground shadow-glow lg:hidden"
        >
          <span>View order · {count}</span>
          <span className="font-mono tabular">{money(total)}</span>
        </a>
      )}
    </div>
  );
}

/** 4:3 dish photo for menu cards; shows the category icon when there's no photo or it fails to load. */
function ItemPhoto({ src, icon: Icon }: { src?: string | undefined; icon: typeof Plus }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
      {src && !broken ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="grid size-full place-items-center text-primary">
          <Icon className="size-8" aria-hidden />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono tabular">{value}</span>
    </div>
  );
}
