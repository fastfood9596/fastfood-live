import { useEffect, useRef } from "react";
import { Bell, Check, ChefHat, Clock, Flame, PartyPopper, ReceiptText, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { money, orderTotal, type Order } from "@/lib/kds-store";
import { TAX_RATE, formatMpesaPhone, formatOrderNumber, trackingStep, withTax } from "@/lib/orders";
import { OrderTypeBadge } from "@/components/kds/badges";
import { playOrderReadyChime } from "@/lib/chime";

const STEPS = [
  { title: "Order received", wait: "Waiting for the cashier to confirm", icon: ReceiptText },
  { title: "In the kitchen queue", wait: "Your ticket is with the kitchen", icon: Clock },
  { title: "Being prepared", wait: "The cooks are on it", icon: ChefHat },
  { title: "Ready", wait: "Come and collect", icon: Bell },
] as const;

/** Receipt with live kitchen tracking for a customer's QR order. */
export function OrderReceipt({ order, onOrderMore }: { order: Order; onOrderMore: () => void }) {
  const step = trackingStep(order.status);
  const { subtotal, tax, total } = withTax(orderTotal(order));
  const ready = order.status === "ready";
  const collected = order.status === "completed";
  const prevStatusRef = useRef<Order["status"] | undefined>(order.status);

  useEffect(() => {
    const currentStatus = order.status;
    if (prevStatusRef.current && prevStatusRef.current !== "ready" && currentStatus === "ready") {
      playOrderReadyChime();
    }
    prevStatusRef.current = currentStatus;
  }, [order.status]);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Flame className="size-5 text-primary-foreground" aria-hidden />
          </div>
          <span className="text-lg font-extrabold tracking-tight">Fast Food</span>
        </div>

        <section
          className={cn(
            "rounded-3xl border p-6 text-center transition-colors",
            ready ? "border-success/50 bg-success/10" : "border-border bg-card",
          )}
          aria-live="polite"
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Your order number</p>
          <p
            className={cn(
              "mt-1 font-mono text-7xl font-extrabold tabular tracking-tight",
              ready ? "text-success" : "text-foreground",
            )}
          >
            {formatOrderNumber(order.number)}
          </p>
          <div className="mt-3 flex justify-center">
            <OrderTypeBadge type={order.type} size="lg" />
          </div>
          <p className={cn("mt-4 text-lg font-bold", ready && "text-success")}>
            {collected ? (
              <span className="inline-flex items-center gap-2">
                <PartyPopper className="size-5" aria-hidden /> Enjoy your meal!
              </span>
            ) : ready ? (
              order.type === "dine-in" ? "Ready! We're bringing it to your table." : "Ready! Collect at the counter."
            ) : (
              STEPS[step]?.wait
            )}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{order.customer}</p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5" aria-label="Order progress">
          <ol className="space-y-0">
            {STEPS.map((s, i) => {
              const done = step > i;
              const current = step === i;
              const Icon = s.icon;
              return (
                <li key={s.title} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <span
                      className={cn("absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5", done ? "bg-success" : "bg-border")}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      "relative grid size-8 shrink-0 place-items-center rounded-full border-2",
                      done && "border-success bg-success text-success-foreground",
                      current && "border-primary bg-primary/15 text-primary",
                      !done && !current && "border-border text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : <Icon className="size-4" aria-hidden />}
                    {current && <span className="absolute inset-0 animate-ping rounded-full border-2 border-primary opacity-40" />}
                  </span>
                  <div className="pt-1">
                    <p className={cn("font-semibold leading-tight", !done && !current && "text-muted-foreground")}>{s.title}</p>
                    {current && <p className="text-sm text-muted-foreground">{s.wait}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {order.payment.method === "mpesa" && order.payment.phone && (
          <section className="flex gap-3 rounded-2xl border border-success/40 bg-success/10 p-4">
            <Smartphone className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <div className="text-sm">
              {order.payment.status === "paid" ? (
                <p className="font-semibold text-success">M-Pesa payment confirmed. Thank you!</p>
              ) : (
                <>
                  <p className="font-semibold">
                    M-Pesa request for {money(total)} to{" "}
                    <span className="font-mono">{formatMpesaPhone(order.payment.phone)}</span>
                  </p>
                  <p className="text-muted-foreground">Enter your M-Pesa PIN when prompted. The cashier confirms payment before cooking starts.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Demo: no real M-Pesa prompt is sent yet.</p>
                </>
              )}
            </div>
          </section>
        )}
        {order.payment.method === "cash" && order.payment.status === "pending" && (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Please pay <span className="font-mono font-semibold text-foreground">{money(total)}</span> at the counter.
            Quote order <span className="font-mono font-semibold text-foreground">{formatOrderNumber(order.number)}</span>.
          </p>
        )}

        <section className="rounded-3xl border border-border bg-card p-5" aria-label="Receipt">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Receipt</h2>
          <ul className="space-y-2.5">
            {order.items.map((i) => (
              <li key={i.key} className="flex gap-3 text-sm">
                <span className="font-mono font-bold tabular text-primary">{i.qty}×</span>
                <span className="flex-1">
                  <span className="font-medium">{i.name}</span>
                  {i.options && i.options.length > 0 && (
                    <span className="block text-xs text-muted-foreground">{i.options.join(" · ")}</span>
                  )}
                </span>
                <span className="font-mono tabular">{money(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="font-mono tabular">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>VAT ({Math.round(TAX_RATE * 100)}%)</dt>
              <dd className="font-mono tabular">{money(tax)}</dd>
            </div>
            <div className="flex justify-between text-base font-bold">
              <dt>Total</dt>
              <dd className="font-mono tabular">{money(total)}</dd>
            </div>
          </dl>
        </section>

        <button
          type="button"
          onClick={onOrderMore}
          className="h-12 w-full rounded-2xl border border-border bg-card font-bold transition-colors hover:bg-secondary"
        >
          Order something else
        </button>
      </div>
    </div>
  );
}
