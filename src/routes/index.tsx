import { createFileRoute } from "@tanstack/react-router";
import { CustomerMenu } from "@/components/menu/CustomerMenu";
import { parseCustomerSearch } from "@/lib/portal-search";

export const Route = createFileRoute("/")({
  validateSearch: parseCustomerSearch,
  head: () => ({
    meta: [
      { title: "Order Online — Fast Food" },
      {
        name: "description",
        content: "Browse the Fast Food menu, customise your meal, pay with M-Pesa or at the counter, and track your order live.",
      },
      { property: "og:title", content: "Order Online — Fast Food" },
      {
        property: "og:description",
        content: "Scan, order and track your food from your table or for pick-up.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerPortal,
});

function CustomerPortal() {
  const { table, order } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CustomerMenu
      table={table}
      trackingId={order}
      onTrack={(id) => navigate({ search: (prev) => ({ ...prev, order: id }) })}
      onBackToMenu={() => navigate({ search: (prev) => ({ ...prev, order: undefined }) })}
    />
  );
}
