import { describe, expect, it } from "vitest";
import {
  checkPhotoFile,
  validatePhotoUrl,
  formatKsh,
  orderableItems,
  removeCategory,
  validateCategory,
  validateItem,
} from "@/lib/menu";
import { TEST_CATEGORIES as DEFAULT_CATEGORIES, TEST_ITEMS as DEFAULT_ITEMS } from "./fixtures";

describe("menu rules", () => {
  it("shows prices in Kenyan Shillings", () => {
    expect(formatKsh(1250)).toBe("KSh 1,250");
  });

  it("deleting a category removes its items", () => {
    const { categories, items } = removeCategory(DEFAULT_CATEGORIES, DEFAULT_ITEMS, "drinks");
    expect(categories.some((c) => c.id === "drinks")).toBe(false);
    expect(items.some((i) => i.categoryId === "drinks")).toBe(false);
    expect(items.length).toBe(DEFAULT_ITEMS.length - 3);
  });

  it("out-of-stock items cannot be ordered", () => {
    const items = DEFAULT_ITEMS.map((i) => (i.id === "s1" ? { ...i, available: false } : i));
    expect(orderableItems(items, DEFAULT_CATEGORIES).some((i) => i.id === "s1")).toBe(false);
  });

  it("rejects duplicate category names", () => {
    expect(validateCategory(" burgers ", DEFAULT_CATEGORIES)).not.toBeNull();
    expect(validateCategory("Kebabs", DEFAULT_CATEGORIES)).toBeNull();
  });

  it("requires a price above zero and an existing category", () => {
    expect(validateItem({ name: "Kebab", price: "0", categoryId: "burgers" }, DEFAULT_CATEGORIES)).not.toBeNull();
    expect(validateItem({ name: "Kebab", price: "350", categoryId: "gone" }, DEFAULT_CATEGORIES)).not.toBeNull();
    expect(validateItem({ name: "Kebab", price: "350", categoryId: "burgers" }, DEFAULT_CATEGORIES)).toBeNull();
  });
});

describe("menu photos", () => {
  it("accepts image files up to 10 MB and rejects others", () => {
    expect(checkPhotoFile({ type: "image/jpeg", size: 2_000_000 })).toBeNull();
    expect(checkPhotoFile({ type: "application/pdf", size: 1000 })).not.toBeNull();
    expect(checkPhotoFile({ type: "image/png", size: 11 * 1024 * 1024 })).not.toBeNull();
  });
  it("accepts web image links and an empty value, rejects other text", () => {
    expect(validatePhotoUrl("https://example.com/burger.jpg")).toBeNull();
    expect(validatePhotoUrl("")).toBeNull();
    expect(validatePhotoUrl("burger.jpg")).not.toBeNull();
  });
});
