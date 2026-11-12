import type { Category, MenuItem } from "@/lib/menu";

/** Small menu used only by tests. The real menu lives in the database. */
export const TEST_CATEGORIES: Category[] = [
  { id: "burgers", label: "Burgers", icon: "burger" },
  { id: "sides", label: "Sides", icon: "fries" },
  { id: "drinks", label: "Drinks", icon: "soda" },
];

export const TEST_ITEMS: MenuItem[] = [
  { id: "b1", name: "Classic Smash", price: 650, categoryId: "burgers", available: true },
  { id: "s1", name: "Fries", price: 250, categoryId: "sides", available: true },
  { id: "d1", name: "Cola", price: 120, categoryId: "drinks", available: true },
  { id: "d2", name: "Lemonade", price: 200, categoryId: "drinks", available: true },
  { id: "d3", name: "Iced Coffee", price: 300, categoryId: "drinks", available: true },
];
