import { bindEnv } from "../../lib/env.js";
import { listSources } from "../../lib/sources.js";

const json = (body, cache) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": cache },
  });

export async function onRequest(context) {
  bindEnv(context.env);

  const q = new URL(context.request.url).searchParams;
  const id = q.get("id");
  const type = q.get("type") === "tv" ? "tv" : "movie";

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  try {
    const sources = await listSources({
      type,
      id,
      season: q.get("season"),
      episode: q.get("episode"),
    });
    // Short edge cache: the list is stable for a title within a session.
    return json({ sources }, "public, max-age=60, s-maxage=300");
  } catch (_) {
    return json({ sources: [] }, "no-store");
  }
}
