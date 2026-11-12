import type { Database } from "@/integrations/supabase/types";

export type StaffRole = Database["public"]["Enums"]["staff_role"];
export type RestaurantRow = Database["public"]["Tables"]["restaurants"]["Row"];

export const STAFF_ROLES: readonly { id: StaffRole; label: string; hint: string }[] = [
  { id: "owner", label: "Owner", hint: "Runs the restaurant" },
  { id: "manager", label: "Manager", hint: "Oversees shifts" },
  { id: "cashier", label: "Cashier", hint: "Takes and dispatches orders" },
  { id: "kitchen", label: "Kitchen", hint: "Cooks and bumps tickets" },
];

export const MIN_PASSWORD_LENGTH = 8;

export type RestaurantInput = {
  name: string;
  location: string;
  contactPhone: string;
  contactEmail: string;
};

export type StaffInput = {
  fullName: string;
  email: string;
  password: string;
  role: StaffRole;
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function validateRestaurant(input: RestaurantInput): FieldErrors<RestaurantInput> {
  const errors: FieldErrors<RestaurantInput> = {};
  const name = input.name.trim();
  if (!name) errors.name = "Enter the restaurant's name";
  else if (name.length > 80) errors.name = "Keep the name under 80 characters";
  if (input.location.trim().length > 120) errors.location = "Keep the location under 120 characters";
  const phone = input.contactPhone.trim();
  if (phone && !/^\+?[\d\s-]{7,16}$/.test(phone)) errors.contactPhone = "Enter a valid phone number";
  const email = input.contactEmail.trim();
  if (email && !isValidEmail(email)) errors.contactEmail = "Enter a valid email";
  return errors;
}

/** Shapes form input into a database row: trims text and stores blanks as empty (null). */
export function restaurantRow(input: RestaurantInput) {
  const orNull = (v: string) => (v.trim() ? v.trim() : null);
  return {
    name: input.name.trim(),
    location: orNull(input.location),
    contact_phone: orNull(input.contactPhone),
    contact_email: orNull(input.contactEmail)?.toLowerCase() ?? null,
  };
}

export function validateStaff(input: StaffInput): FieldErrors<StaffInput> {
  const errors: FieldErrors<StaffInput> = {};
  if (!input.fullName.trim()) errors.fullName = "Enter the staff member's name";
  if (!isValidEmail(input.email)) errors.email = "Enter a valid email";
  if (input.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  if (!STAFF_ROLES.some((r) => r.id === input.role)) errors.role = "Pick a role";
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}

export function staffRoleLabel(role: StaffRole): string {
  return STAFF_ROLES.find((r) => r.id === role)?.label ?? role;
}

/** Only same-site paths may be used after sign-in, so a crafted link can't bounce users elsewhere. */
export function safeRedirect(value: unknown, fallback = "/admin"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/auth")) return fallback;
  return value;
}
