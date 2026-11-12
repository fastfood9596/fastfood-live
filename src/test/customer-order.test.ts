import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOMIZATION,
  addToCart,
  cartTotals,
  changeCartQty,
  customerPayment,
  formatOrderNumber,
  normalizeMpesaPhone,
  trackingStep,
  validateCheckout,
} from "@/lib/orders";

const menu = [
  { id: "b1", name: "Classic Smash", price: 650, available: true },
  { id: "s1", name: "Fries", price: 250, available: false },
];
const large = { portion: "large" as const, sauces: ["garlic" as const], notes: ["No Vinegar"] };

describe("customer QR orders", () => {
  it("shows order numbers with at least 3 digits", () => {
    expect(formatOrderNumber(42)).toBe("#042");
    expect(formatOrderNumber(107)).toBe("#107");
  });

  it("stacks the same dish with the same choices, keeps different choices separate", () => {
    let cart = addToCart([], "b1", DEFAULT_CUSTOMIZATION, 1);
    cart = addToCart(cart, "b1", DEFAULT_CUSTOMIZATION, 2);
    cart = addToCart(cart, "b1", large, 1);
    expect(cart).toHaveLength(2);
    expect(cart[0]?.qty).toBe(3);
  });

  it("removes a cart line when its quantity drops to zero", () => {
    const cart = addToCart([], "b1", DEFAULT_CUSTOMIZATION, 1);
    expect(changeCartQty(cart, cart[0]!.key, -1)).toEqual([]);
  });

  it("prices large portions and extra sauces, and flags sold-out dishes", () => {
    let cart = addToCart([], "b1", large, 2); // (650 + 150 + 50) x 2
    cart = addToCart(cart, "s1", DEFAULT_CUSTOMIZATION, 1);
    expect(cartTotals(cart, menu)).toEqual({ count: 2, subtotal: 1700, unavailable: ["Fries"] });
  });

  it("dine-in needs a table, takeaway needs a name, M-Pesa needs a 07/01 number", () => {
    const base = { type: "dine-in" as const, table: "7", name: "", pay: "counter" as const, phone: "" };
    expect(validateCheckout(base)).toBeNull();
    expect(validateCheckout({ ...base, table: "" })).not.toBeNull();
    expect(validateCheckout({ ...base, type: "takeaway" })).not.toBeNull();
    expect(validateCheckout({ ...base, pay: "mpesa", phone: "0812 345 678" })).not.toBeNull();
    expect(validateCheckout({ ...base, pay: "mpesa", phone: "0110 123 456" })).toBeNull();
    expect(normalizeMpesaPhone("0712 345 678")).toBe("254712345678");
  });

  it("every QR order waits for the cashier to check payment", () => {
    expect(customerPayment({ pay: "mpesa", phone: "0712345678" })).toEqual({ method: "mpesa", status: "pending", phone: "254712345678" });
    expect(customerPayment({ pay: "counter", phone: "" }).status).toBe("pending");
  });

  it("tracks the order from cashier check to collection", () => {
    expect(trackingStep("awaiting")).toBe(0);
    expect(trackingStep("preparing")).toBe(2);
    expect(trackingStep("ready")).toBe(3);
  });
});
