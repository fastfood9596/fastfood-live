import { Bike, CircleCheck, CircleDashed, CircleAlert, ShoppingBag, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_TYPE_LABEL, PAYMENT_METHOD_LABEL, type OrderType, type Payment } from "@/lib/orders";

export const ORDER_TYPE_ICON: Record<OrderType, typeof Utensils> = {
  "dine-in": Utensils,
  takeaway: ShoppingBag,
  delivery: Bike,
};

/** Solid fills used for badges and the selected order-type button. */
export const ORDER_TYPE_SOLID: Record<OrderType, string> = {
  "dine-in": "bg-dine-in text-dine-in-foreground",
  takeaway: "bg-takeaway text-takeaway-foreground",
  delivery: "bg-delivery text-delivery-foreground",
};

/** Accent border colors for tiles and cards. */
export const ORDER_TYPE_BORDER: Record<OrderType, string> = {
  "dine-in": "border-dine-in",
  takeaway: "border-takeaway",
  delivery: "border-delivery",
};

/** Tickets saved under the old "takeout" name (or any unknown type) render as takeaway instead of crashing. */
export const safeOrderType = (type: string): OrderType => (type in ORDER_TYPE_ICON ? (type as OrderType) : "takeaway");

export function OrderTypeBadge({ type: raw, size = "md", className }: { type: OrderType; size?: "xs" | "md" | "lg"; className?: string }) {
  const type = safeOrderType(raw);
  const Icon = ORDER_TYPE_ICON[type];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md font-extrabold uppercase tracking-wider",
        ORDER_TYPE_SOLID[type],
        size === "xs" && "px-1.5 py-0.5 text-[9px]",
        size === "md" && "px-2 py-1 text-[11px]",
        size === "lg" && "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <Icon className={size === "xs" ? "size-3" : "size-3.5"} strokeWidth={2.5} aria-hidden />
      {ORDER_TYPE_LABEL[type]}
    </span>
  );
}

export function PaymentBadge({ payment, className }: { payment: Payment; className?: string }) {
  const Icon = payment.status === "paid" ? CircleCheck : payment.status === "pending" ? CircleDashed : CircleAlert;
  const label = payment.status === "paid" ? "Paid" : payment.status === "pending" ? "Verify" : "Unpaid";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wider",
        payment.status === "paid" && "bg-success/15 text-success",
        payment.status === "pending" && "bg-warning/15 text-warning",
        payment.status === "unpaid" && "bg-destructive/15 text-destructive",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label} · {PAYMENT_METHOD_LABEL[payment.method]}
    </span>
  );
}
