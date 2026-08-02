import { bindEnv } from "../../lib/env.js";
import { resolveStream } from "../../lib/sources.js";

const json = (body, status, cache) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": cache },
  });

export async function onRequest(context) {
  bindEnv(context.env);

  const q = new URL(context.request.url).searchParams;
  const id = q.get("id");
  const type = q.get("type") === "tv" ? "tv" : "movie";
  const season = q.get("season");
  const episode = q.get("episode");

  if (!id) return json({ error: "Missing id" }, 400, "no-store");
  if (type === "tv" && (!season || !episode))
    return json({ error: "TV requires season and episode" }, 400, "no-store");

  try {
    const { stream, src: idx, next } = await resolveStream({
      type,
      id,
      season,
      episode,
      src: q.get("src"),
    });

    // No source: return an empty 200 (not 404) so the client's probe doesn't
    // surface a red error in the console — absence is expected for some titles.
    // `next` tells the client which source to try instead. Pass ?debug=1 for _diag.
    if (!stream || !stream.url) {
      return json(q.get("debug") ? { ...stream, src: idx, next } : { url: null, next }, 200, "no-store");
    }

    // Tokens stay valid for days, so cache the resolved URL on the edge to make
    // repeat opens of the same title near-instant.
    return json(
      { ...stream, src: idx, next },
      200,
      "public, max-age=300, s-maxage=1800, stale-while-revalidate=1800"
    );
  } catch (e) {
    return json({ error: e.message || "Extraction failed" }, 502, "no-store");
  }
}
