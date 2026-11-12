import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CreditCard, Flame, Plus, ShieldCheck, Store, Users } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Superadmin — Fast Food" },
      { name: "description", content: "Manage client restaurant accounts on the Fast Food platform." },
      { property: "og:title", content: "Superadmin — Fast Food" },
      { property: "og:description", content: "Platform console for client restaurant accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPortal,
});

const PLANNED = [
  { icon: Store, title: "Restaurant accounts", text: "Add, pause or remove client restaurants and their branches." },
  { icon: Users, title: "Staff access", text: "Invite owners and staff, and choose who can use the cashier or kitchen." },
  { icon: CreditCard, title: "Plans & billing", text: "Track each restaurant's subscription and payment status." },
  { icon: ShieldCheck, title: "Activity & safety", text: "See sign-ins and important changes across all restaurants." },
];

function AdminPortal() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 lg:px-6">
          <div className="grid size-9 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <Flame className="size-5 text-primary-foreground" aria-hidden />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-extrabold tracking-tight">Fast Food</h1>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Superadmin Console</p>
          </div>
          <Link
            to="/restaurant"
            className="ml-auto rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            Staff hub
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Client restaurants</h2>
            <p className="mt-1 text-sm text-muted-foreground">Every restaurant using the platform will be listed here.</p>
          </div>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground opacity-50"
          >
            <Plus className="size-4" aria-hidden /> Add restaurant
          </button>
        </div>

        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Building2 className="mb-3 size-10 text-muted-foreground" aria-hidden />
          <p className="font-semibold">No client restaurants yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            This console is a placeholder. Account management will be switched on once sign-in is set up.
          </p>
        </div>

        <h3 className="mt-10 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Coming to this console</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PLANNED.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-5" aria-hidden />
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
