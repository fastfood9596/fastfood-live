import { describe, expect, it } from "vitest";
import { canDispatch, nextOrderNumber, toggleTag } from "@/lib/orders";

describe("order rules", () => {
  it("online orders can't go to the kitchen until payment is checked", () => {
    expect(canDispatch({ method: "mpesa", status: "pending" })).toBe(false);
    expect(canDispatch({ method: "mpesa", status: "paid" })).toBe(true);
    expect(canDispatch({ method: "cash", status: "unpaid" })).toBe(true);
  });

  it("order numbers continue after the highest one handed out", () => {
    expect(nextOrderNumber([{ number: 104 }, { number: 106 }, { number: 105 }])).toBe(107);
  });

  it("instruction tags toggle on and off", () => {
    expect(toggleTag([], "Extra Salt")).toEqual(["Extra Salt"]);
    expect(toggleTag(["Extra Salt", "No Vinegar"], "Extra Salt")).toEqual(["No Vinegar"]);
  });
});
