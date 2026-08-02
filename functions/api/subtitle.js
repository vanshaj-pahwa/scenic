import { bindEnv } from "../../lib/env.js";
import { listSubtitles, downloadVtt } from "../../lib/subtitle.js";

const EMPTY_VTT = "WEBVTT\n\n";
const CORS = { "Access-Control-Allow-Origin": "*" };

const vtt = (body, cache) =>
  new Response(body, {
    status: 200,
    headers: { ...CORS, "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": cache },
  });

const json = (body, cache) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": cache },
  });

export async function onRequest(context) {
  bindEnv(context.env);

  const q = new URL(context.request.url).searchParams;
  const fileId = q.get("file_id");

  // Download mode: return the chosen subtitle as WebVTT.
  if (fileId) {
    try {
      const body = await downloadVtt(fileId);
      return vtt(body || EMPTY_VTT, body ? "public, max-age=604800" : "no-store");
    } catch {
      return vtt(EMPTY_VTT, "no-store");
    }
  }

  // List mode: return available subtitles (all languages) for the title.
  const id = q.get("id");
  if (!id) return json({ total: 0, items: [] }, "no-store");

  try {
    const list = await listSubtitles({
      type: q.get("type") === "tv" ? "tv" : "movie",
      id,
      season: q.get("season"),
      episode: q.get("episode"),
    });
    return json(list, "public, max-age=3600, s-maxage=86400");
  } catch {
    return json({ total: 0, items: [] }, "no-store");
  }
}
