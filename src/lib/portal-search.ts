import type { ViewId } from "@/components/kds/TopNav";

export type CustomerSearch = {
  /** Table number printed on the QR code, e.g. /?table=7. */
  table?: string | undefined;
  /** Order being tracked after checkout. */
  order?: string | undefined;
};

/** Keeps only a 1–3 digit table number and a tracked order id; anything else is dropped. */
export function parseCustomerSearch(search: Record<string, unknown>): CustomerSearch {
  const rawTable = search["table"];
  const rawOrder = search["order"];
  const table = typeof rawTable === "string" || typeof rawTable === "number" ? String(rawTable) : undefined;
  const order = typeof rawOrder === "string" ? rawOrder : undefined;
  return {
    ...(table && /^\d{1,3}$/.test(table) && { table }),
    ...(order && { order }),
  };
}

export const STAFF_VIEWS: readonly ViewId[] = ["cashier", "kitchen", "board"];
export const DEFAULT_STAFF_VIEW: ViewId = "kitchen";

export type StaffSearch = { view?: ViewId | undefined };

/** Lets each staff device bookmark its own screen, e.g. /restaurant?view=cashier. */
export function parseStaffSearch(search: Record<string, unknown>): StaffSearch {
  const raw = search["view"];
  return typeof raw === "string" && (STAFF_VIEWS as readonly string[]).includes(raw) ? { view: raw as ViewId } : {};
}
