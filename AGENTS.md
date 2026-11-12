<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Order and menu (categories/items) state live in a single React context (`src/lib/kds-store.tsx`, mounted in `__root.tsx`) backed by Supabase with realtime subscriptions, shared by customer and staff screens; row mapping lives in `src/lib/kds-db.ts`.
- Three portals with separate routes: customer menu at `/` (no staff links or controls), staff hub at `/restaurant` (tabs via `?view=`), superadmin at `/admin`; `/order` permanently redirects to `/` so printed QR codes keep working. Search parsing lives in `src/lib/portal-search.ts`.
- Menu business rules (formatting, validation, cascade deletes, orderability) are pure functions in `src/lib/menu.ts` so they can be unit-tested without rendering.
- Order rules (order types, payment, instruction tags, numbering, dispatch eligibility, tax) are pure functions/constants in `src/lib/orders.ts`; online QR orders live in the same orders list with status `awaiting` until the cashier dispatches them, so kitchen and board views ignore them automatically.
- Order-type colors are semantic tokens (`takeaway`, `dine-in`, `delivery`) in `src/styles.css`, applied only through `src/components/kds/badges.tsx` so every screen stays consistent.
- Time-dependent UI (timers, ticket ages, clocks) reads from `useNow()`, which is null until mount, to avoid SSR hydration mismatches.
