import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const connectionKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    if (!lovableApiKey || !connectionKey) {
      return json({ error: "Search Console is not connected for this project" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("user_id", userId)
      .single();
    if (!profile || profile.role !== "school_admin") {
      return json({ error: "Access denied" }, 403);
    }

    const gwHeaders = {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    };

    const call = async (path: string, init?: RequestInit) => {
      const res = await fetch(`${GATEWAY}${path}`, { ...init, headers: gwHeaders });
      const text = await res.text();
      if (!res.ok) {
        console.error(`Search Console request failed [${res.status}]: ${text}`);
        throw new Error(`[${res.status}] ${text}`);
      }
      return text ? JSON.parse(text) : {};
    };

    // Resolve verified properties
    const sitesRes = await call("/webmasters/v3/sites");
    const verified: Array<{ siteUrl: string; permissionLevel?: string }> = (
      sitesRes.siteEntry ?? []
    ).filter((e: { permissionLevel?: string }) => e.permissionLevel !== "siteUnverifiedUser");

    if (verified.length === 0) return json({ status: "no_property", sites: [] });

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const requested = typeof body.siteUrl === "string" ? body.siteUrl : undefined;

    let siteUrl: string;
    if (requested) {
      const match = verified.find((v) => v.siteUrl === requested);
      if (!match) return json({ error: "Property is not verified for this account" }, 403);
      siteUrl = match.siteUrl;
    } else if (verified.length === 1) {
      siteUrl = verified[0].siteUrl;
    } else {
      return json({
        status: "selection_required",
        sites: verified.map((v) => v.siteUrl),
      });
    }

    const days = Number.isFinite(body.days) ? Math.min(Math.max(Number(body.days), 7), 90) : 28;
    const end = new Date(Date.now() - 2 * 86400000);
    const start = new Date(end.getTime() - (days - 1) * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const encoded = encodeURIComponent(siteUrl);

    const query = (dimensions: string[], rowLimit = 10) =>
      call(`/webmasters/v3/sites/${encoded}/searchAnalytics/query`, {
        method: "POST",
        body: JSON.stringify({
          startDate: fmt(start),
          endDate: fmt(end),
          dimensions,
          rowLimit,
        }),
      });

    const [totals, byDate, queries, pages, countries, sitemaps] = await Promise.all([
      query([], 1),
      query(["date"], 90),
      query(["query"], 25),
      query(["page"], 25),
      query(["country"], 10),
      call(`/webmasters/v3/sites/${encoded}/sitemaps`).catch(() => ({ sitemap: [] })),
    ]);

    return json({
      status: "ok",
      siteUrl,
      sites: verified.map((v) => v.siteUrl),
      range: { startDate: fmt(start), endDate: fmt(end) },
      totals: totals.rows?.[0] ?? null,
      byDate: byDate.rows ?? [],
      queries: queries.rows ?? [],
      pages: pages.rows ?? [],
      countries: countries.rows ?? [],
      sitemaps: sitemaps.sitemap ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("search-console-report error:", message);
    return json({ error: "Search Console request failed", details: message }, 500);
  }
});
