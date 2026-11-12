import { useState } from "react";
import { AlarmClock, Check, ChefHat, Flame, Play, QrCode, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ageLevel, formatDuration, useKds, useNow, type Order } from "@/lib/kds-store";
import { OrderTypeBadge, ORDER_TYPE_BORDER, safeOrderType } from "./badges";

type Filter = "all" | "new" | "preparing";

export function KitchenView() {
  const { orders, lastBumped, recall } = useKds();
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("all");

  const active = orders
    .filter((o) => o.status === "new" || o.status === "preparing")
    .sort((a, b) => a.createdAt - b.createdAt);
  const shown = filter === "all" ? active : active.filter((o) => o.status === filter);

  const late = now ? active.filter((o) => ageLevel(now - o.createdAt) === "late").length : 0;
  const avg = now && active.length ? active.reduce((s, o) => s + (now - o.createdAt), 0) / active.length : 0;

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: "All", n: active.length },
    { id: "new", label: "New", n: active.filter((o) => o.status === "new").length },
    { id: "preparing", label: "Cooking", n: active.filter((o) => o.status === "preparing").length },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={ChefHat} label="Active" value={String(active.length)} />
        <Stat icon={AlarmClock} label="Wait" value={now ? formatDuration(avg) : "--:--"} />
        <Stat icon={Flame} label="Late" value={String(late)} tone={late > 0 ? "danger" : undefined} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === f.id ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            <span className="font-mono text-xs tabular opacity-80">{f.n}</span>
          </button>
        ))}
        {lastBumped && (
          <button
            onClick={() => recall(lastBumped.id)}
            className="ml-auto flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-4" aria-hidden />
            Recall #{lastBumped.number}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border py-24 text-center">
          <ChefHat className="mb-3 size-10 text-muted-foreground" aria-hidden />
          <p className="font-semibold">All caught up</p>
          <p className="text-sm text-muted-foreground">New orders from the cashier will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((o) => (
            <Ticket key={o.id} order={o} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof ChefHat; label: string; value: string; tone?: "danger" | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        <span className="truncate text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("mt-1 font-mono text-xl font-bold tabular sm:text-2xl", tone === "danger" && "text-destructive")}>{value}</p>
    </div>
  );
}

function Ticket({ order, now }: { order: Order; now: number | null }) {
  const { advance, toggleItem } = useKds();
  const elapsed = now ? now - order.createdAt : 0;
  const level = now ? ageLevel(elapsed) : "fresh";
  const done = order.items.filter((i) => i.done).length;

  return (
    <article
      className={cn(
        "animate-ticket-in flex flex-col overflow-hidden rounded-2xl border border-t-4 bg-card",
        ORDER_TYPE_BORDER[safeOrderType(order.type)],
        level === "late" ? "border-x-destructive/70 border-b-destructive/70 animate-late" : level === "warn" ? "border-x-warning/60 border-b-warning/60" : "border-x-border border-b-border",
      )}
    >
      <header
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3",
          level === "late" ? "bg-destructive/15" : level === "warn" ? "bg-warning/10" : "bg-surface",
        )}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-extrabold tabular">#{order.number}</span>
            {order.status === "new" && (
              <span className="rounded-md bg-info/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-info">New</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <OrderTypeBadge type={order.type} />
            <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              {order.source === "online" && <QrCode className="size-3.5" aria-label="Online order" />}
              {order.customer}
            </span>
          </div>
        </div>
        <div
          className={cn(
            "rounded-lg px-2.5 py-1 font-mono text-lg font-bold tabular",
            level === "late" ? "text-destructive" : level === "warn" ? "text-warning" : "text-success",
          )}
        >
          {now ? formatDuration(elapsed) : "--:--"}
        </div>
      </header>

      {(order.notes.length > 0 || order.payment.status === "unpaid") && (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
          {order.notes.map((n) => (
            <span key={n} className="rounded-md bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
              {n}
            </span>
          ))}
          {order.payment.status === "unpaid" && (
            <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-destructive">Unpaid</span>
          )}
        </div>
      )}

      <ul className="flex-1 divide-y divide-border">
        {order.items.map((i) => (
          <li key={i.key}>
            <button
              onClick={() => toggleItem(order.id, i.key)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-secondary/50"
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                  i.done ? "border-success bg-success text-success-foreground" : "border-input",
                )}
              >
                {i.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span className={cn("font-mono text-sm font-bold tabular text-primary", i.done && "opacity-50")}>{i.qty}×</span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-medium", i.done && "text-muted-foreground line-through")}>{i.name}</span>
                {i.options && i.options.length > 0 && (
                  <span className={cn("mt-1 flex flex-wrap gap-1", i.done && "opacity-50")}>
                    {i.options.map((opt) => (
                      <span
                        key={opt}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-bold leading-tight",
                          opt.startsWith("+ ") ? "bg-primary/15 text-primary" : opt === "Large" ? "bg-secondary text-foreground" : "bg-warning/15 text-warning",
                        )}
                      >
                        {opt}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <footer className="border-t border-border p-3">
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(done / order.items.length) * 100}%` }} />
        </div>
        {order.status === "new" ? (
          <button
            onClick={() => advance(order.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 py-2.5 font-bold text-primary transition-colors hover:bg-primary/20"
          >
            <Play className="size-4" aria-hidden /> Start cooking
          </button>
        ) : (
          <button
            onClick={() => advance(order.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-2.5 font-bold text-success-foreground transition-all hover:brightness-110"
          >
            <Check className="size-4" strokeWidth={3} aria-hidden /> Bump · Ready
          </button>
        )}
      </footer>
    </article>
  );
}
