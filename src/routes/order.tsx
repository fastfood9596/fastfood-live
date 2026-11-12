import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseCustomerSearch } from "@/lib/portal-search";

// Old QR codes pointed at /order; the customer menu now lives at the site root.
export const Route = createFileRoute("/order")({
  validateSearch: parseCustomerSearch,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/", search, statusCode: 301 });
  },
});
