import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasErrors, validateStaff, type StaffInput } from "@/lib/restaurants";

type CreateStaffInput = StaffInput & { restaurantId: string };

/**
 * Superadmin only: creates a sign-in account (or reuses an existing one with the same email)
 * and links it to a restaurant with the chosen role.
 */
export const createStaffAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateStaffInput) => {
    if (typeof input?.restaurantId !== "string" || !input.restaurantId) throw new Error("Pick a restaurant");
    const clean: CreateStaffInput = {
      restaurantId: input.restaurantId,
      fullName: String(input.fullName ?? "").trim(),
      email: String(input.email ?? "").trim().toLowerCase(),
      password: String(input.password ?? ""),
      role: input.role,
    };
    const errors = validateStaff(clean);
    if (hasErrors(errors)) throw new Error(Object.values(errors)[0]);
    return clean;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isSuperadmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "superadmin",
    });
    if (roleError) throw new Error("Could not check your access");
    if (!isSuperadmin) throw new Error("Only superadmins can add staff");

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", data.restaurantId)
      .maybeSingle();
    if (!restaurant) throw new Error("That restaurant no longer exists");

    // Reuse an existing account with this email instead of failing.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    let staffUserId = existing?.id;
    let createdAccount = false;
    if (!staffUserId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
      });
      if (error || !created.user) throw new Error(error?.message ?? "Could not create the account");
      staffUserId = created.user.id;
      createdAccount = true;
    }

    const { error: linkError } = await supabase
      .from("restaurant_staff")
      .insert({ restaurant_id: data.restaurantId, user_id: staffUserId, role: data.role });
    if (linkError) {
      if (linkError.code === "23505") throw new Error("This person is already on this restaurant's staff");
      throw new Error("Could not link the account to the restaurant");
    }

    return { userId: staffUserId, createdAccount };
  });
