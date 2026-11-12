export type OrderType = "dine-in" | "takeaway" | "delivery";
export type OrderSource = "counter" | "online";
export type PaymentMethod = "mpesa" | "cash";
/** pending = online order whose payment the cashier hasn't checked yet. */
export type PaymentStatus = "pending" | "paid" | "unpaid";

export type Payment = {
  method: PaymentMethod;
  status: PaymentStatus;
  /** M-Pesa confirmation code the customer gave, if any. */
  reference?: string | undefined;
  /** Phone the M-Pesa payment prompt was sent to, as 2547XXXXXXXX. */
  phone?: string | undefined;
};

/* ----------------------------- Item customization ----------------------------- */

export const PORTIONS = [
  { id: "regular", label: "Regular", extra: 0 },
  { id: "large", label: "Large", extra: 150 },
] as const;
export type PortionId = (typeof PORTIONS)[number]["id"];

export const SAUCES = [
  { id: "garlic", label: "Garlic Sauce", extra: 50 },
  { id: "bbq", label: "BBQ Sauce", extra: 50 },
  { id: "chilli", label: "Chilli Sauce", extra: 50 },
  { id: "tomato", label: "Tomato Sauce", extra: 0 },
] as const;
export type SauceId = (typeof SAUCES)[number]["id"];

export type Customization = { portion: PortionId; sauces: SauceId[]; notes: string[] };

export const DEFAULT_CUSTOMIZATION: Customization = { portion: "regular", sauces: [], notes: [] };

/** Price of one customized item: base + portion upgrade + each extra sauce. */
export function customizedUnitPrice(base: number, c: Customization) {
  const portion = PORTIONS.find((p) => p.id === c.portion)?.extra ?? 0;
  const sauces = c.sauces.reduce((sum, id) => sum + (SAUCES.find((s) => s.id === id)?.extra ?? 0), 0);
  return base + portion + sauces;
}

/** Short labels the kitchen sees under the item, e.g. ["Large", "+ Garlic Sauce", "No Vinegar"]. */
export function customizationLabels(c: Customization): string[] {
  const labels: string[] = [];
  if (c.portion !== "regular") labels.push(PORTIONS.find((p) => p.id === c.portion)?.label ?? c.portion);
  for (const id of c.sauces) labels.push(`+ ${SAUCES.find((s) => s.id === id)?.label ?? id}`);
  return [...labels, ...c.notes];
}

/* --------------------------------- M-Pesa --------------------------------- */

/**
 * Turn a Kenyan mobile number into the 2547XXXXXXXX / 2541XXXXXXXX form M-Pesa uses.
 * Accepts 07.., 01.., 7.., +254.., 254.. with spaces or dashes. Returns null if invalid.
 */
export function normalizeMpesaPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  let local: string | null = null;
  if (digits.length === 12 && digits.startsWith("254")) local = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("0")) local = digits.slice(1);
  else if (digits.length === 9) local = digits;
  if (!local || !/^[17]\d{8}$/.test(local)) return null;
  return `254${local}`;
}

/** 254712345678 -> "0712 345 678" for display. */
export const formatMpesaPhone = (phone: string) => {
  const local = `0${phone.slice(3)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
};

export const ORDER_TYPES: OrderType[] = ["dine-in", "takeaway", "delivery"];

export const ORDER_TYPE_LABEL: Record<OrderType, string> = {
  "dine-in": "Dine-in",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  cash: "Cash",
};

export const INSTRUCTION_TAGS = ["Extra Salt", "No Vinegar", "Separate Packaging"] as const;

export const TAX_RATE = 0.08;

export const DEFAULT_COUNTER_PAYMENT: Payment = { method: "cash", status: "paid" };

/** An order can only go to the kitchen once its payment has been checked. */
export const canDispatch = (payment: Payment) => payment.status !== "pending";

/** Next ticket number: one above the highest number already handed out. */
export const nextOrderNumber = (orders: { number: number }[]) =>
  orders.reduce((max, o) => Math.max(max, o.number), 0) + 1;

export const withTax = (subtotal: number) => ({
  subtotal,
  tax: subtotal * TAX_RATE,
  total: subtotal * (1 + TAX_RATE),
});

/* ---------------------------- Customer QR menu ---------------------------- */

/** Ticket number as customers see it: at least 3 digits, e.g. 42 -> "#042". */
export const formatOrderNumber = (n: number) => `#${String(n).padStart(3, "0")}`;

/** Same dish with the same choices shares one cart line; different choices get their own. */
export const cartLineKey = (menuId: string, c: Customization) =>
  [menuId, c.portion, [...c.sauces].sort().join("+"), c.notes.map((n) => n.trim().toLowerCase()).join("|")].join("::");

/** Customer QR orders: eat at a table or pick up at the counter. */
export type CustomerOrderType = Extract<OrderType, "dine-in" | "takeaway">;
export type CustomerPayChoice = "mpesa" | "counter";

export type CheckoutInput = {
  type: CustomerOrderType;
  table: string;
  name: string;
  pay: CustomerPayChoice;
  phone: string;
};

/** First problem with the customer's checkout details, or null if it can be submitted. */
export function validateCheckout(input: CheckoutInput): string | null {
  if (input.type === "dine-in" && !/^\d{1,3}$/.test(input.table.trim())) return "Enter your table number.";
  if (input.type === "takeaway" && !input.name.trim()) return "Enter a name for pick-up.";
  if (input.pay === "mpesa" && !normalizeMpesaPhone(input.phone))
    return "Enter your M-Pesa number, e.g. 0712 345 678 or 0110 123 456.";
  return null;
}

/** Name shown on staff screens for a customer order, e.g. "Table 7 · Achieng" or "Achieng". */
export function customerLabel(input: Pick<CheckoutInput, "type" | "table" | "name">) {
  const name = input.name.trim();
  if (input.type === "dine-in") return name ? `Table ${input.table.trim()} · ${name}` : `Table ${input.table.trim()}`;
  return name;
}

/** Payment for a QR order: always waits for the cashier to check it before cooking. */
export function customerPayment(input: Pick<CheckoutInput, "pay" | "phone">): Payment {
  if (input.pay === "mpesa") {
    const phone = normalizeMpesaPhone(input.phone);
    return { method: "mpesa", status: "pending", ...(phone && { phone }) };
  }
  return { method: "cash", status: "pending" };
}

/** Add the tag if missing, remove it if present. */
export const toggleTag = (tags: string[], tag: string) =>
  tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];

/* --------------------------------- QR cart --------------------------------- */

/** Most of one dish (with the same choices) a customer can add to a cart line. */
export const MAX_LINE_QTY = 20;

export type CartLine = { key: string; menuId: string; qty: number; customization: Customization };

/** Add a dish; the same dish with the same choices stacks onto its existing line. */
export function addToCart(cart: CartLine[], menuId: string, customization: Customization, qty: number): CartLine[] {
  const key = cartLineKey(menuId, customization);
  const existing = cart.find((l) => l.key === key);
  if (existing)
    return cart.map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_LINE_QTY, l.qty + qty) } : l));
  return [...cart, { key, menuId, customization, qty: Math.min(MAX_LINE_QTY, Math.max(1, qty)) }];
}

/** Change a line's quantity; dropping to 0 removes it. */
export function changeCartQty(cart: CartLine[], key: string, delta: number): CartLine[] {
  return cart
    .map((l) => (l.key === key ? { ...l, qty: Math.min(MAX_LINE_QTY, l.qty + delta) } : l))
    .filter((l) => l.qty > 0);
}

/** Item count, subtotal at live menu prices, and names of dishes that sold out or were removed. */
export function cartTotals(
  cart: CartLine[],
  menu: { id: string; name: string; price: number; available: boolean }[],
) {
  let count = 0;
  let subtotal = 0;
  const unavailable: string[] = [];
  for (const line of cart) {
    const item = menu.find((m) => m.id === line.menuId);
    if (!item || !item.available) {
      unavailable.push(item?.name ?? "A removed dish");
      continue;
    }
    count += line.qty;
    subtotal += customizedUnitPrice(item.price, line.customization) * line.qty;
  }
  return { count, subtotal, unavailable };
}

/** Customer tracking steps: 0 waiting for cashier, 1 in kitchen queue, 2 cooking, 3 ready, 4 collected. */
export function trackingStep(status: "awaiting" | "new" | "preparing" | "ready" | "completed") {
  return { awaiting: 0, new: 1, preparing: 2, ready: 3, completed: 4 }[status];
}
