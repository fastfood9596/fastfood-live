import { describe, expect, it } from "vitest";
import { newOrderRow, normalizeStatus, orderFromRow, orderStateRow, type OrderRow } from "@/lib/kds-db";
import { TEST_ITEMS } from "./fixtures";

const row = (patch: Partial<OrderRow> = {}): OrderRow => ({
  id: "o1",
  order_number: 42,
  customer_name: "Achieng",
  order_type: "takeaway",
  status: "awaiting",
  source: "online",
  payment: { method: "mpesa", status: "pending", phone: "254712345678" },
  notes: [],
  items: [{ key: "k1", menuId: "b1", name: "Classic Smash", qty: 2, price: 800, done: false, options: ["Large"] }],
  total_amount: 1728,
  created_at: "2026-11-09T05:00:00.000Z",
  kitchen_at: null,
  ready_at: null,
  updated_at: "2026-11-09T05:00:00.000Z",
  ...patch,
});

describe("saved orders", () => {
  it("QR orders are saved waiting for the cashier; counter orders go straight to the kitchen", () => {
    const base = { customer: "Achieng", type: "takeaway" as const, notes: [], items: [{ menuId: "b1", qty: 1 }] };
    const online = newOrderRow({ ...base, source: "online", payment: { method: "mpesa", status: "pending" } }, TEST_ITEMS);
    expect(online.status).toBe("awaiting");
    expect(online.kitchen_at).toBeNull();
    const counter = newOrderRow({ ...base, payment: { method: "cash", status: "paid" } }, TEST_ITEMS, 0);
    expect(counter.status).toBe("new");
    expect(counter.kitchen_at).toBe(new Date(0).toISOString());
  });

  it("saves the total including 8% tax, at live menu prices", () => {
    const r = newOrderRow(
      { customer: "", type: "dine-in", notes: [], payment: { method: "cash", status: "paid" }, items: [{ menuId: "b1", qty: 2 }, { menuId: "d1", qty: 1 }] },
      TEST_ITEMS,
    );
    expect(r.total_amount).toBe(1533.6); // (650*2 + 120) * 1.08
    expect(r.customer_name).toBeNull();
  });

  it("an unknown or 'pending' status waits for the cashier instead of skipping the payment check", () => {
    expect(normalizeStatus("pending")).toBe("awaiting");
    expect(normalizeStatus(null)).toBe("awaiting");
    expect(normalizeStatus("ready")).toBe("ready");
  });

  it("kitchen timer starts when the ticket reaches the kitchen, not when the customer ordered", () => {
    const o = orderFromRow(row({ status: "new", kitchen_at: "2026-11-09T05:07:00.000Z" }));
    expect(o.createdAt).toBe(Date.parse("2026-11-09T05:07:00.000Z"));
    expect(o.placedAt).toBe(Date.parse("2026-11-09T05:00:00.000Z"));
  });

  it("staff changes round-trip through the database row", () => {
    const o = orderFromRow(row());
    const sent = { ...o, status: "new" as const, payment: { ...o.payment, status: "paid" as const }, createdAt: Date.parse("2026-11-09T05:05:00.000Z") };
    const back = orderFromRow({ ...row(), ...orderStateRow(sent) } as OrderRow);
    expect(back.status).toBe("new");
    expect(back.payment.status).toBe("paid");
    expect(back.items[0]?.options).toEqual(["Large"]);
    expect(back.createdAt).toBe(sent.createdAt);
  });
});
