import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RestaurantManifestRow = {
  id: string;
  name: string | null;
  slug: string | null;
  logo_url: string | null;
  is_approved: boolean | null;
};

function guessImageMimeType(src: string): string {
  const clean = (src.split("?")[0] ?? "").toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".avif")) return "image/avif";
  if (clean.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}
function getManifestIcons(
  slug: string,
  restaurant?: Pick<RestaurantManifestRow, "logo_url" | "is_approved"> | null,
) {
  const logoUrl = restaurant?.logo_url?.trim();
  const isApproved = restaurant?.is_approved === true;
  const hasValidLogoUrl =
    Boolean(logoUrl) &&
    (logoUrl!.startsWith("https://") ||
      logoUrl!.startsWith("http://") ||
      logoUrl!.startsWith("/"));

  const iconConfig =
    isApproved && hasValidLogoUrl
      ? { src: logoUrl!, type: guessImageMimeType(logoUrl!) }
      : slug === "poland-burger"
        ? { src: "/poland.jfif", type: "image/jpeg" }
        : slug === "days-gone-fry"
          ? { src: "/days.avif", type: "image/avif" }
          : { src: "/Cravinos.jpg", type: "image/jpeg" };

  return [
    {
      src: iconConfig.src,
      sizes: "192x192",
      type: iconConfig.type,
      purpose: "any",
    },
    {
      src: iconConfig.src,
      sizes: "512x512",
      type: iconConfig.type,
      purpose: "any maskable",
    },
  ];
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function getSupabaseCredentials(): { url?: string; key?: string } {
  const procEnv = typeof process !== "undefined" ? process.env : undefined;
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

  const url =
    procEnv?.["VITE_SUPABASE_URL"] ??
    procEnv?.["SUPABASE_URL"] ??
    metaEnv?.["VITE_SUPABASE_URL"] ??
    metaEnv?.["SUPABASE_URL"];

  const key =
    procEnv?.["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    procEnv?.["SUPABASE_PUBLISHABLE_KEY"] ??
    metaEnv?.["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    metaEnv?.["SUPABASE_PUBLISHABLE_KEY"];

  return {
    ...(url ? { url } : {}),
    ...(key ? { key } : {}),
  };
}

async function fetchRestaurantBySlug(slug: string): Promise<RestaurantManifestRow | null> {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key || !slug) return null;

  const endpoint = `${url.replace(/\/$/, "")}/rest/v1/restaurants?slug=eq.${encodeURIComponent(slug)}&select=id,name,slug,logo_url,is_approved&limit=1`;
  const res = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  const rows = (await res.json()) as RestaurantManifestRow[];
  return rows[0] ?? null;
}

async function handleManifestRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawSlug = url.searchParams.get("slug")?.trim() ?? "";
  const cleanSlug = rawSlug.replace(/^\/+|\/+$/g, "");

 let restaurantName = "Cravinos";
  let restaurantRow: RestaurantManifestRow | null = null;
  if (cleanSlug) {
    try {
      restaurantRow = await fetchRestaurantBySlug(cleanSlug);
      if (restaurantRow?.name) {
        restaurantName = restaurantRow.name;
      }
    } catch (err) {
      console.error("Failed to resolve restaurant for manifest:", err);
    }
  }

  const startUrl = cleanSlug ? `/r/${encodeURIComponent(cleanSlug)}` : "/";
  const scope = startUrl;

  const manifest = {
    name: restaurantName,
    short_name: restaurantName,
    start_url: startUrl,
    scope,
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: getManifestIcons(cleanSlug, restaurantRow),
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/api/manifest") {
      return handleManifestRequest(request);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};