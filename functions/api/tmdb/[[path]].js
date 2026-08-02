// Server-side proxy for the TMDB API. The browser calls /api/tmdb/<path> and
// this catch-all receives the segments in context.params.path, replacing the
// vercel.json rewrite to ?proxyPath=. The secret key is attached here so it is
// never shipped in the client bundle — TMDB_API_KEY (server-only), not the
// REACT_APP_-prefixed var, which CRA would embed.
import { bindEnv, tmdbKey } from "../../../lib/env.js";
import { fetchRetry } from "../../../lib/http.js";

const TMDB_BASE = "https://api.themoviedb.org/3";

const jsonError = (status, message) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export async function onRequest(context) {
  bindEnv(context.env);

  const url = new URL(context.request.url);
  const params = new URLSearchParams(url.search);
  // Also accept ?proxyPath= so an old client bundle keeps working.
  params.delete("proxyPath");

  const segs = context.params.path;
  const proxyPath = (Array.isArray(segs) ? segs.join("/") : segs || url.searchParams.get("proxyPath") || "").replace(
    /^\/+/,
    ""
  );
  if (!proxyPath) return jsonError(400, "Missing TMDB path");

  const apiKey = tmdbKey();
  if (!apiKey) return jsonError(500, "TMDB API key not configured");

  params.set("api_key", apiKey);

  try {
    const tmdbRes = await fetchRetry(`${TMDB_BASE}/${proxyPath}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    const body = await tmdbRes.text();
    return new Response(body, {
      status: tmdbRes.status,
      headers: {
        "Content-Type": "application/json",
        // Cache at the edge to cut TMDB calls; safe for read-only data.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (_) {
    return jsonError(502, "Upstream TMDB request failed");
  }
}
