import { bindEnv } from "../../lib/env.js";
import { listSources } from "../../lib/sources.js";

// Pages Functions responses aren't edge-cached just because they carry
// s-maxage — the code has to put them in the cache itself. Without this every
// viewer triggered a fresh probe of every source, which is what was drawing
// 403s from the upstream hosts and leaving the list short or empty.
const TTL_SECONDS = 300;

const json = (body, cache) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": cache },
  });

export async function onRequest(context) {
  bindEnv(context.env);

  const url = new URL(context.request.url);
  const q = url.searchParams;
  const id = q.get("id");
  const type = q.get("type") === "tv" ? "tv" : "movie";

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // Normalised key so ?type=movie&id=1 and ?id=1&type=movie share an entry.
  const key = new URL(url.origin + url.pathname);
  for (const k of ["type", "id", "season", "episode"]) {
    if (q.get(k)) key.searchParams.set(k, q.get(k));
  }
  const cacheKey = new Request(key.toString(), { method: "GET" });
  const cache = caches.default;

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let sources = [];
  try {
    sources = await listSources({
      type,
      id,
      season: q.get("season"),
      episode: q.get("episode"),
    });
  } catch (_) {
    sources = [];
  }

  // Only cache a result that found something. Upstreams are flaky enough that
  // an empty list is usually a bad minute rather than the truth, and pinning
  // that for five minutes would turn a blip into an outage.
  if (!sources.length) return json({ sources: [] }, "no-store");

  const res = json({ sources }, `public, max-age=60, s-maxage=${TTL_SECONDS}`);
  context.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
