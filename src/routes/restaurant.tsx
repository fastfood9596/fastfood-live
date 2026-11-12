import { createFileRoute } from "@tanstack/react-router";
import { TopNav } from "@/components/kds/TopNav";
import { CashierView } from "@/components/kds/CashierView";
import { KitchenView } from "@/components/kds/KitchenView";
import { ReadyBoard } from "@/components/kds/ReadyBoard";
import { DEFAULT_STAFF_VIEW, parseStaffSearch } from "@/lib/portal-search";

export const Route = createFileRoute("/restaurant")({
  validateSearch: parseStaffSearch,
  head: () => ({
    meta: [
      { title: "Staff Hub — Fast Food" },
      {
        name: "description",
        content: "Cashier terminal, kitchen display and ready board for Fast Food staff, synced live.",
      },
      { property: "og:title", content: "Staff Hub — Fast Food" },
      { property: "og:description", content: "Take orders, run the kitchen line and manage online orders in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffHub,
});

function StaffHub() {
  const view = Route.useSearch().view ?? DEFAULT_STAFF_VIEW;
  const navigate = Route.useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <TopNav view={view} onChange={(v) => navigate({ search: { view: v }, replace: true })} />
      <main className="mx-auto max-w-[1600px] px-4 py-5 lg:px-6 lg:py-6">
        {view === "cashier" && <CashierView />}
        {view === "kitchen" && <KitchenView />}
        {view === "board" && <ReadyBoard />}
      </main>
    </div>
  );
}
