import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Phone, QrCode, Send, Smartphone, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, money, orderTotal, useKds, useNow, type Order } from "@/lib/kds-store";
import { canDispatch, withTax, type Payment, type PaymentMethod, type PaymentStatus } from "@/lib/orders";
import { iconFor } from "@/lib/menu-icons";
import { Thumb } from "./PhotoField";
import { OrderTypeBadge, ORDER_TYPE_BORDER, PaymentBadge, safeOrderType } from "./badges";

export function OnlineOrders() {
  const { orders } = useKds();
  const now = useNow();
  const [sent, setSent] = useState<number | null>(null);
  const queue = orders.filter((o) => o.status === "awaiting").sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="space-y-4">
      {sent !== null && (
        <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status">
          <CheckCircle2 className="size-4" aria-hidden />
          Order #{sent} sent to the kitchen.
        </div>
      )}

      {queue.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-20 text-center">
          <QrCode className="mb-3 size-10 text-muted-foreground" aria-hidden />
          <p className="font-semibold">No online orders waiting</p>
          <p className="max-w-xs text-sm text-muted-foreground">Orders customers place from the QR menu will show up here.</p>
          <Link to="/" target="_blank" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:border-primary/60">
            <QrCode className="size-4" aria-hidden /> Open customer menu
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {queue.map((o) => (
            <OnlineOrderCard key={o.id} order={o} now={now} onSent={setSent} />
          ))}
        </div>
      )}
    </div>
  );
}

function OnlineOrderCard({ order, now, onSent }: { order: Order; now: number | null; onSent: (n: number) => void }) {
  const { setPayment, dispatchOnline, items: menu, categories } = useKds();
  const photoFor = (menuId: string) => menu.find((m) => m.id === menuId);
  const iconForMenu = (menuId: string) =>
    iconFor(categories.find((c) => c.id === photoFor(menuId)?.categoryId)?.icon ?? "utensils");
  const { total } = withTax(orderTotal(order));
  const ready = canDispatch(order.payment);
  const update = (patch: Partial<Payment>) => setPayment(order.id, { ...order.payment, ...patch });

  return (
    <article className={cn("animate-ticket-in flex flex-col overflow-hidden rounded-2xl border border-l-4 bg-card", ORDER_TYPE_BORDER[safeOrderType(order.type)])}>
      <header className="flex items-start justify-between gap-3 bg-surface px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-extrabold tabular">#{order.number}</span>
            <OrderTypeBadge type={order.type} />
          </div>
         <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <QrCode className="size-3.5 shrink-0" aria-hidden />
            {order.customer}
          </p>
          {(order.phone || order.payment.phone) && (
            <a
              href={`tel:${order.phone || order.payment.phone}`}
              className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-primary hover:underline"
              title="Call customer"
            >
              <Phone className="size-3 shrink-0" aria-hidden />
              {order.phone || order.payment.phone}
            </a>
          )}
        </div>
        <span className="flex items-center gap-1 font-mono text-sm tabular text-muted-foreground" title="Time since the customer ordered">
          <Clock className="size-3.5" aria-hidden />
          {now ? formatDuration(now - (order.placedAt ?? order.createdAt)) : "--:--"}
        </span>
      </header>

      <ul className="divide-y divide-border px-4">
        {order.items.map((i) => (
          <li key={i.key} className="flex items-center gap-3 py-2 text-sm">
            <Thumb src={photoFor(i.menuId)?.image} icon={iconForMenu(i.menuId)} className="size-8" />
            <span className="font-mono font-bold tabular text-primary">{i.qty}×</span>
            <span className="min-w-0 flex-1">
              {i.name}
              {i.options && i.options.length > 0 && (
                <span className="block text-xs text-muted-foreground">{i.options.join(" · ")}</span>
              )}
            </span>
            <span className="font-mono tabular text-muted-foreground">{money(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>

      {order.notes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-1 pt-2">
          {order.notes.map((n) => (
            <span key={n} className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
              {n}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto space-y-3 border-t border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <PaymentBadge payment={order.payment} />
          <span className="font-mono text-lg font-bold tabular">{money(total)}</span>
        </div>

        <Segmented<PaymentMethod>
          label="Payment method"
          value={order.payment.method}
          onChange={(method) => update({ method })}
          options={[
            { id: "mpesa", label: "M-Pesa", icon: Smartphone },
            { id: "cash", label: "Cash", icon: Banknote },
          ]}
        />
        {order.payment.method === "mpesa" && order.payment.reference && (
          <p className="text-xs text-muted-foreground">
            Customer's M-Pesa code: <span className="font-mono font-semibold text-foreground">{order.payment.reference}</span>
          </p>
        )}
        <Segmented<PaymentStatus>
          label="Payment check"
          value={order.payment.status}
          onChange={(status) => update({ status })}
          options={[
            { id: "paid", label: "Payment received" },
            { id: "unpaid", label: "Pay on collection" },
          ]}
        />

        <button
          onClick={() => dispatchOnline(order.id) && onSent(order.number)}
          disabled={!ready}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <Send className="size-4" aria-hidden />
          Send to Kitchen
        </button>
        {!ready && <p className="text-center text-xs text-muted-foreground">Check the payment first.</p>}
      </div>
    </article>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: typeof Send; activeClass?: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-background p-1">
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.id;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold transition-colors",
              active ? (o.activeClass ?? "bg-secondary text-foreground") : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-3.5" aria-hidden />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
