

## Project rules

- Order and menu (categories/items) state live in a single React context (`src/lib/kds-store.tsx`, mounted in `__root.tsx`) backed by Supabase with realtime subscriptions, shared by customer and staff screens; row mapping lives in `src/lib/kds-db.ts`.
- Three portals with separate routes: customer menu at `/` (no staff links or controls), staff hub at `/restaurant` (tabs via `?view=`), superadmin at `/admin`; `/order` permanently redirects to `/` so printed QR codes keep working. Search parsing lives in `src/lib/portal-search.ts`.
- Menu business rules (formatting, validation, cascade deletes, orderability) are pure functions in `src/lib/menu.ts` so they can be unit-tested without rendering.
- Order rules (order types, payment, instruction tags, numbering, dispatch eligibility, tax) are pure functions/constants in `src/lib/orders.ts`; online QR orders live in the same orders list with status `awaiting` until the cashier dispatches them, so kitchen and board views ignore them automatically.
- Order-type colors are semantic tokens (`takeaway`, `dine-in`, `delivery`) in `src/styles.css`, applied only through `src/components/kds/badges.tsx` so every screen stays consistent.
- Time-dependent UI (timers, ticket ages, clocks) reads from `useNow()`, which is null until mount, to avoid SSR hydration mismatches.
