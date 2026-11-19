import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChefHat, Flame, MonitorCheck, QrCode, ReceiptText, Timer, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, useKds, useNow, type MpesaConfig } from "@/lib/kds-store";
import { MenuManager } from "./MenuManager";

export type ViewId = "cashier" | "kitchen" | "board";

const TABS: { id: ViewId; label: string; short: string; icon: typeof ChefHat }[] = [
  { id: "cashier", label: "Cashier Terminal", short: "Cashier", icon: ReceiptText },
  { id: "kitchen", label: "Kitchen Display", short: "Kitchen", icon: ChefHat },
  { id: "board", label: "Ready Board", short: "Ready", icon: MonitorCheck },
];

function ShiftTimer() {
  const now = useNow();
  const [start, setStart] = useState<number | null>(null);
  useEffect(() => setStart(Date.now()), []);
  const value = now && start ? formatDuration(now - start, true) : "00:00:00";
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5 sm:gap-2 sm:px-2.5"
      aria-label="Active shift timer"
    >
      <Timer className="hidden size-4 text-primary min-[400px]:block" aria-hidden />
      <span className="hidden text-xs uppercase tracking-wider text-muted-foreground sm:inline">Shift</span>
      <span className="font-mono text-sm font-semibold tabular text-foreground">{value}</span>
    </div>
  );
}

const SYNC_LOOK = {
  live: { label: "Live Sync", tone: "border-success/40 bg-success/10 text-success", dot: "bg-success" },
  connecting: { label: "Connecting", tone: "border-warning/40 bg-warning/10 text-warning", dot: "bg-warning" },
  offline: { label: "Offline", tone: "border-destructive/40 bg-destructive/10 text-destructive", dot: "bg-destructive" },
} as const;

/** Shows whether this screen is receiving orders from other devices right now. */
function LiveSyncBadge() {
  const { sync } = useKds();
  const look = SYNC_LOOK[sync];
  return (
    <div
      role="status"
      aria-label={`Sync: ${look.label}`}
      className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 sm:gap-2 sm:px-3", look.tone)}
    >
      <span className="relative flex size-2.5">
        {sync !== "offline" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", look.dot)} />}
        <span className={cn("relative inline-flex size-2.5 rounded-full", look.dot)} />
      </span>
      <span className="text-xs font-semibold tracking-wide">{look.label}</span>
    </div>
  );
}

function MpesaSettingsModal() {
  const { mpesaConfig, saveMpesaConfig } = useKds();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MpesaConfig>(mpesaConfig);

  // Keep form in sync when modal opens
  useEffect(() => {
    if (open) setForm(mpesaConfig);
  }, [open, mpesaConfig]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMpesaConfig(form);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Configure Lipa na M-Pesa"
        title="Lipa na M-Pesa Settings"
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:px-2.5"
      >
        <Wallet className="size-4 text-emerald-500" aria-hidden />
        <span className="hidden whitespace-nowrap 2xl:inline">M-Pesa Config</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Wallet className="size-4" />
                </div>
                <h2 className="text-lg font-bold">Lipa na M-Pesa Settings</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-semibold px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-5">
              Configure your restaurant's Buy Goods Till Number or Paybill details. Customers will see these instructions during manual checkout.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, mode: "till" }))}
                    className={cn(
                      "rounded-lg border py-2.5 text-sm font-semibold transition-all",
                      form.mode === "till"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-sm"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    Till Number (Buy Goods)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, mode: "paybill" }))}
                    className={cn(
                      "rounded-lg border py-2.5 text-sm font-semibold transition-all",
                      form.mode === "paybill"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-sm"
                        : "border-border text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    Paybill
                  </button>
                </div>
              </div>

              {form.mode === "till" ? (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Till Number (Store Number)
                  </label>
                  <input
                    type="text"
                    value={form.tillNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, tillNumber: e.target.value }))}
                    placeholder="e.g. 5432100"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Business Number (Paybill)
                    </label>
                    <input
                      type="text"
                      value={form.businessNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, businessNumber: e.target.value }))}
                      placeholder="e.g. 247247"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={form.accountNumber}
                      onChange={(e) => setForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="e.g. RESTAURANT or Leave blank for Name"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition-colors"
                >
                  Save M-Pesa Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function TopNav({ view, onChange }: { view: ViewId; onChange: (v: ViewId) => void }) {
  const { orders } = useKds();
  const counts: Record<ViewId, number> = {
    cashier: orders.filter((o) => o.status === "awaiting").length,
    kitchen: orders.filter((o) => o.status === "new" || o.status === "preparing").length,
    board: orders.filter((o) => o.status === "ready").length,
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 lg:flex-nowrap lg:gap-6 lg:px-6">
        <div className="flex items-center gap-2.5">
          <div className="hidden size-9 place-items-center rounded-lg bg-gradient-primary shadow-glow min-[440px]:grid">
            <Flame className="size-5 text-primary-foreground" aria-hidden />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-extrabold tracking-tight">Fast Food</h1>
            <p className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Kitchen Display System
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 lg:order-3 lg:ml-0">
          <ShiftTimer />
          <LiveSyncBadge />
          <MpesaSettingsModal />
          <Link
            to="/"
            target="_blank"
            aria-label="Open customer QR menu"
            title="Customer QR menu"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground sm:px-2.5"
          >
            <QrCode className="size-4" aria-hidden />
            <span className="hidden whitespace-nowrap 2xl:inline">Customer Menu</span>
          </Link>
          <MenuManager />
        </div>

        <nav
          role="tablist"
          aria-label="Staff views"
          className="order-last grid w-full grid-cols-3 gap-1 rounded-xl border border-border bg-card p-1 lg:order-2 lg:mx-auto lg:w-auto lg:min-w-[560px]"
        >
          {TABS.map((t) => {
            const active = view === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onChange={() => onChange(t.id)}
                onClick={() => onChange(t.id)}
                className={cn(
                  "relative flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition-all",
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
                {counts[t.id] > 0 && (
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 font-mono text-[11px] tabular leading-5",
                      active ? "bg-primary-foreground/20" : t.id === "board" ? "bg-success/20 text-success" : "bg-primary/20 text-primary",
                    )}
                  >
                    {counts[t.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}