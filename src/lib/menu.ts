import type { IconKey } from "./menu-icons";

export type Category = {
  id: string;
  label: string;
  icon: IconKey;
  /** Banner/thumbnail photo: an uploaded image (data URL) or a web link. */
  image?: string | undefined;
  /** Position in the category list (lowest first). */
  sortOrder?: number | undefined;
};

export type MenuItem = {
  id: string;
  name: string;
  /** Price in Kenyan Shillings. */
  price: number;
  categoryId: string;
  available: boolean;
  /** Dish photo: an uploaded image (data URL) or a web link. */
  image?: string | undefined;
};

/** Format a Kenyan Shilling amount, rounded to whole shillings. */
export const formatKsh = (n: number) => `KSh ${Math.round(n).toLocaleString("en-US")}`;

/** Insert a record, or replace the one with the same id. */
export function upsert<T extends { id: string }>(list: T[], record: T): T[] {
  return list.some((r) => r.id === record.id)
    ? list.map((r) => (r.id === record.id ? record : r))
    : [...list, record];
}

/** Deleting a category also removes the items filed under it. */
export function removeCategory(categories: Category[], items: MenuItem[], id: string) {
  return {
    categories: categories.filter((c) => c.id !== id),
    items: items.filter((i) => i.categoryId !== id),
  };
}

/** Items a cashier can add to an order: in stock and in an existing category. */
export function orderableItems(items: MenuItem[], categories: Category[]) {
  const ids = new Set(categories.map((c) => c.id));
  return items.filter((i) => i.available && ids.has(i.categoryId));
}

export function validateCategory(label: string, categories: Category[], editingId?: string): string | null {
  const name = label.trim();
  if (!name) return "Enter a category name.";
  if (categories.some((c) => c.id !== editingId && c.label.trim().toLowerCase() === name.toLowerCase()))
    return `"${name}" already exists.`;
  return null;
}

/** Largest photo file staff can upload. */
export const MAX_PHOTO_MB = 10;

/** Check a chosen photo file before reading it. */
export function checkPhotoFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) return "Choose an image file (JPG, PNG or WebP).";
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) return `Photo is too large. Keep it under ${MAX_PHOTO_MB} MB.`;
  return null;
}

/** A pasted photo link must be a web address (http/https). Empty means "no photo". */
export function validatePhotoUrl(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return null;
  } catch {
    // fall through
  }
  return "Paste a full image link starting with https://";
}

export function validateItem(
  input: { name: string; price: string; categoryId: string },
  categories: Category[],
): string | null {
  if (!input.name.trim()) return "Enter an item name.";
  const price = Number(input.price);
  if (input.price.trim() === "" || !Number.isFinite(price) || price <= 0) return "Enter a price above KSh 0.";
  if (!categories.some((c) => c.id === input.categoryId)) return "Choose a category.";
  return null;
}
