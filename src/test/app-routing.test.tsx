import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { parseCustomerSearch, parseStaffSearch } from "@/lib/portal-search";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
  const leaf = (path: string) => router.matchRoutes(path).at(-1)?.routeId;

  it("serves the customer menu at /", () => {
    expect(leaf("/")).toBe("/");
    expect(leaf("/")).not.toBe(rootRouteId);
  });

  it("serves the staff hub at /restaurant", () => {
    expect(leaf("/restaurant")).toBe("/restaurant");
  });

  it("serves the superadmin console at /admin", () => {
    expect(leaf("/admin")).toBe("/admin");
  });
});

describe("Portal search params", () => {
  it("keeps a QR table number and tracked order on the customer menu", () => {
    expect(parseCustomerSearch({ table: "7", order: "abc" })).toEqual({ table: "7", order: "abc" });
    expect(parseCustomerSearch({ table: 12 })).toEqual({ table: "12" });
  });

  it("drops invalid table numbers", () => {
    expect(parseCustomerSearch({ table: "1234" })).toEqual({});
    expect(parseCustomerSearch({ table: "seven" })).toEqual({});
  });

  it("only accepts the three staff screens", () => {
    expect(parseStaffSearch({ view: "cashier" })).toEqual({ view: "cashier" });
    expect(parseStaffSearch({ view: "admin" })).toEqual({});
  });
});
