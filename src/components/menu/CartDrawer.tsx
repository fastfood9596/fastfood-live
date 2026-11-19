import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Check, Minus, Plus, Utensils, ShoppingBag, Truck, Trash2, Smartphone, Store, Wallet, Copy, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { money, useKds } from "@/lib/kds-store";
import { iconFor } from "@/lib/menu-icons";
import {
  MAX_LINE_QTY,
  TAX_RATE,
  cartTotals,
  changeCartQty,
  customerLabel,
  customerPayment,
  customizationLabels,
  customizedUnitPrice,
  validateCheckout,
  withTax,
  type CartLine,
  type CustomerOrderType,
  type CustomerPayChoice,
} from "@/lib/orders";
import { ORDER_TYPE_SOLID } from "@/components/kds/badges";
import { DishPhoto } from "./DishPhoto";

export function CartDrawer({
  open,
  onOpenChange,
  cart,
  setCart,
  table,
  restaurantId,
  onPlaced,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartLine[];
  setCart: Dispatch<SetStateAction<CartLine[]>>;
  table?: string | undefined;
  restaurantId?: string | null | undefined;
  onPlaced: (orderId: string) => void;
}) {
  const { items, categories, placeOrder, mpesaConfig } = useKds();
  const [type, setType] = useState<CustomerOrderType>(table ? "dine-in" : "takeaway");
  const [tableNo, setTableNo] = useState(table ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState<CustomerPayChoice>("mpesa");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { count, subtotal, unavailable } = cartTotals(cart, items);
  const { tax, total } = withTax(subtotal);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (unavailable.length > 0) {
      setError(`${unavailable.join(", ")} just sold out. Remove it to continue.`);
      return;
    }
    // Pass empty string for phone since we use manual Lipa na M-Pesa verification
    const input = { type, table: tableNo, name, pay, phone };
    const problem = validateCheckout(input);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const order = await placeOrder({
        source: "online",
        customer: customerLabel(input),
        phone: input.phone,
        type,
        notes: [],
        payment: customerPayment(input),
        restaurantId,
        items: cart.map((l) => ({ menuId: l.menuId, qty: l.qty, customization: l.customization })),
      });
      onPlaced(order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your order didn't go through. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="mx-auto max-h-[94dvh] max-w-lg border-border bg-card">
        <form onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
            <div>
              <DrawerTitle className="text-2xl font-extrabold tracking-tight">Your order</DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground">
                {count} {count === 1 ? "item" : "items"}
              </DrawerDescription>
            </div>

            {cart.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-border py-10 text-center">
                <ShoppingBag className="mb-2 size-8 text-muted-foreground" aria-hidden />
                <p className="font-semibold">Your cart is empty</p>
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
                {cart.map((l) => {
                  const item = items.find((m) => m.id === l.menuId);
                  const icon = iconFor(categories.find((c) => c.id === item?.categoryId)?.icon ?? "utensils");
                  const labels = customizationLabels(l.customization);
                  const soldOut = !item || !item.available;
                  return (
                    <li key={l.key} className="flex gap-3 p-3">
                      <DishPhoto src={item?.image} icon={icon} className="size-14 shrink-0 rounded-xl" iconSize="size-5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold leading-tight">{item?.name ?? "Removed dish"}</span>
                          <span className="shrink-0 font-mono text-sm tabular">
                            {item ? money(customizedUnitPrice(item.price, l.customization) * l.qty) : "—"}
                          </span>
                        </div>
                        {labels.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{labels.join(" · ")}</p>}
                        {soldOut && <p className="mt-0.5 text-xs font-semibold text-destructive">Sold out — please remove</p>}
                        <div className="mt-2 flex items-center gap-1">
                          <QtyButton label={l.qty === 1 ? "Remove" : "One less"} onClick={() => setCart((c) => changeCartQty(c, l.key, -1))}>
                            {l.qty === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
                          </QtyButton>
                          <span className="w-7 text-center font-mono text-sm font-bold tabular">{l.qty}</span>
                          <QtyButton label="One more" disabled={l.qty >= MAX_LINE_QTY} onClick={() => setCart((c) => changeCartQty(c, l.key, 1))}>
                            <Plus className="size-3.5" />
                          </QtyButton>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <fieldset>
              <Legend>How are you eating?</Legend>
              <div role="radiogroup" aria-label="Order type" className="grid grid-cols-3 gap-2">
                <ChoiceCard
                  on={type === "dine-in"}
                  onClick={() => setType("dine-in")}
                  icon={Utensils}
                  title="Dine-In"
                  sub="At my table"
                  onClass={ORDER_TYPE_SOLID["dine-in"]}
                />
                <ChoiceCard
                  on={type === "takeaway"}
                  onClick={() => setType("takeaway")}
                  icon={ShoppingBag}
                  title="Takeaway"
                  sub="Pick-up at counter"
                  onClass={ORDER_TYPE_SOLID.takeaway}
                />
                <ChoiceCard
                  on={type === "delivery"}
                  onClick={() => setType("delivery")}
                  icon={Truck}
                  title="Delivery"
                  sub="To your door"
                  onClass={ORDER_TYPE_SOLID.delivery}
                />
              </div>
              <div className="mt-3 grid gap-2">
                
                <Field label={type === "takeaway" ? "Name for pick-up" : type === "delivery" ? "Your name for delivery" : "Your name (optional)"}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={30}
                    autoComplete="given-name"
                    placeholder="e.g. Achieng"
                    className={inputClass}
                  />
                </Field>
                {type === "delivery" && (
                  <Field label="Delivery location / address">
                    <input
                      value={tableNo}
                      onChange={(e) => setTableNo(e.target.value)}
                      maxLength={60}
                      placeholder="e.g. Lower Kabete"
                      className={inputClass}
                    />
                  </Field>
                )}
                <Field label={type === "delivery" ? "Phone number for delivery" : "Phone number (for pickup / updates)"}>
  <input
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    type="tel"
    inputMode="tel"
    autoComplete="tel"
    placeholder="e.g. 0712 345 678"
    className={cn(inputClass, "font-mono")}
  />
</Field>
              </div>
            </fieldset>

            <fieldset>
              <Legend>Payment</Legend>
              <div role="radiogroup" aria-label="Payment" className="grid grid-cols-2 gap-2">
                <ChoiceCard
                  on={pay === "mpesa"}
                  onClick={() => setPay("mpesa")}
                  icon={Smartphone}
                  title="Lipa na M-Pesa"
                  sub="Till / Paybill transfer"
                  onClass="bg-emerald-600 text-white"
                />
                <ChoiceCard
                  on={pay === "counter"}
                  onClick={() => setPay("counter")}
                  icon={Store}
                  title="Pay at Counter"
                  sub="Cash or Card"
                  onClass="bg-secondary text-foreground ring-2 ring-primary"
                />
              </div>

              {pay === "mpesa" && (
                <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <Wallet className="size-4" />
                      <span>M-Pesa Payment Details</span>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                      {mpesaConfig.mode === "till" ? "Buy Goods & Services" : "Paybill"}
                    </span>
                  </div>

                  {mpesaConfig.mode === "till" ? (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Till Number (Buy Goods)</span>
                      <div className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                        <span className="font-mono text-base font-bold">{mpesaConfig.tillNumber || "Not configured"}</span>
                        {mpesaConfig.tillNumber && (
                          <button
                            type="button"
                            onClick={() => handleCopy(mpesaConfig.tillNumber)}
                            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500"
                          >
                            {copied ? <CheckCheck className="size-4" /> : <Copy className="size-4" />}
                            <span>{copied ? "Copied" : "Copy"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground block">Business No.</span>
                        <div className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                          <span className="font-mono text-sm font-bold">{mpesaConfig.businessNumber || "—"}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground block">Account No.</span>
                        <div className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                          <span className="font-mono text-sm font-bold truncate">{mpesaConfig.accountNumber || "Order"}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Please complete the payment on your phone using the details above. Staff will verify your transaction upon order submission.
                  </p>
                </div>
              )}
            </fieldset>

            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label={`VAT (${Math.round(TAX_RATE * 100)}%)`} value={money(tax)} />
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd className="font-mono tabular">{money(total)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-2 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {error && (
              <p role="alert" className="rounded-lg bg-destructive/15 px-3 py-2 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={count === 0 || submitting}
              className="flex h-14 w-full items-center justify-between rounded-2xl bg-gradient-primary px-5 font-bold text-primary-foreground shadow-glow transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:shadow-none"
            >
              <span>{submitting ? "Sending your order…" : pay === "mpesa" ? "Place M-Pesa Order" : "Place Order"}</span>
              <span className="font-mono tabular">{money(total)}</span>
            </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-input bg-background px-3.5 text-base outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

function Legend({ children }: { children: string }) {
  return <legend className="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{children}</legend>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <dt>{label}</dt>
      <dd className="font-mono tabular">{value}</dd>
    </div>
  );
}

function QtyButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function ChoiceCard({
  on,
  onClick,
  icon: Icon,
  title,
  sub,
  onClass,
}: {
  on: boolean;
  onClick: () => void;
  icon: typeof Plus;
  title: string;
  sub: string;
  onClass: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border px-3.5 py-3 text-left transition-all",
        on ? cn("border-transparent", onClass) : "border-border bg-background text-foreground hover:border-primary/50",
      )}
    >
      <Icon className="size-5" aria-hidden />
      <span className="font-bold leading-tight">{title}</span>
      <span className={cn("text-xs", on ? "opacity-85" : "text-muted-foreground")}>{sub}</span>
    </button>
  );
}