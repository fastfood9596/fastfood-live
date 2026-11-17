import { BellRing, CookingPot, HandPlatter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKds, useNow } from "@/lib/kds-store";
import { OrderTypeBadge, ORDER_TYPE_BORDER, safeOrderType } from "./badges";

interface ReadyBoardProps {
  restaurantId: string | null;
}

export function ReadyBoard({ restaurantId }: ReadyBoardProps) {
  const { orders, advance } = useKds();
  const now = useNow();
  const preparing = orders
    .filter((o) => o.status === "new" || o.status === "preparing")
    .sort((a, b) => a.number - b.number);
  const ready = orders
    .filter((o) => o.status === "ready")
    .sort((a, b) => (b.readyAt ?? 0) - (a.readyAt ?? 0));

  const clock = now
    ? new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Order status</p>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Watch for your number</h2>
        </div>
        <span className="font-mono text-2xl font-bold tabular text-muted-foreground sm:text-3xl">{clock}</span>
      </div>

      <div className="grid gap-5 md:grid-cols-[2fr_3fr]">
        <section className="rounded-2xl border border-border bg-card p-5" aria-label="Preparing">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-muted-foreground">
            <CookingPot className="size-5 text-warning" aria-hidden />
            Preparing
            <span className="ml-auto font-mono text-sm tabular">{preparing.length}</span>
          </h3>
          {preparing.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No orders in the kitchen.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-3">
              {preparing.map((o) => (
                <div
                  key={o.id}
                  className={cn(
                    "animate-ticket-in flex flex-col items-center gap-1.5 rounded-xl border border-b-4 bg-surface py-3",
                    ORDER_TYPE_BORDER[safeOrderType(o.type)],
                  )}
                >
                  <span className="font-mono text-3xl font-bold tabular text-muted-foreground sm:text-4xl">{o.number}</span>
                  <OrderTypeBadge type={o.type} size="xs" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-success/40 bg-gradient-ready p-5" aria-label="Ready for pickup">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-success">
            <BellRing className="size-5" aria-hidden />
            Ready for pickup
            <span className="ml-auto font-mono text-sm tabular">{ready.length}</span>
          </h3>
          {ready.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Ready orders will appear here.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {ready.map((o, idx) => (
                <button
                  key={o.id}
                  onClick={() => advance(o.id)}
                  title="Mark as picked up"
                  className="animate-ticket-in group relative flex flex-col items-center gap-1 rounded-2xl bg-card/60 py-6 shadow-success transition-transform hover:scale-[1.02]"
                >
                  {idx === 0 && (
                    <span className="absolute right-3 top-3 size-2.5 animate-pulse rounded-full bg-success" aria-hidden />
                  )}
                  <span className="font-mono text-5xl font-extrabold tabular text-success sm:text-6xl">{o.number}</span>
                  <span className="max-w-full truncate px-3 text-sm font-medium text-foreground/80">{o.customer}</span>
                  <OrderTypeBadge type={o.type} className="mt-1" />
                  <span className="mt-1 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    <HandPlatter className="size-3" aria-hidden /> Tap when collected
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
