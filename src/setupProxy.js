// Dev-only: makes /api/* work under `npm start`, where Pages Functions don't
// run. Rather than reimplementing the handlers (the previous version kept its
// own copy of the HLS proxy, which drifted), this loads the same lib/ modules
// the Functions use and bridges Express req/res to the Web Request/Response
// they speak. Runs in the CRA dev server's Node process.
//
// lib/ is ESM and this file must stay CommonJS, so it's pulled in with a lazy
// dynamic import.
const { Readable } = require("node:stream");

let libsPromise = null;
function libs() {
  if (!libsPromise) {
    libsPromise = (async () => {
      const [env, sources, subtitle, hlsProxy] = await Promise.all([
        import("../lib/env.js"),
        import("../lib/sources.js"),
        import("../lib/subtitle.js"),
        import("../lib/hlsProxy.js"),
      ]);
      // The Functions bind context.env per request; in dev the equivalent is
      // whatever CRA loaded from .env.local into process.env.
      env.bindEnv(process.env);
      return { ...sources, ...subtitle, ...hlsProxy };
    })();
  }
  return libsPromise;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Express req -> Web Request. `mount` is the path the handler was mounted at,
// since Express strips it from req.url.
function toWebRequest(req, mount) {
  const url = `http://${req.headers.host || "localhost"}${mount}${req.url === "/" ? "" : req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
  }
  return new Request(url, { method: req.method, headers });
}

// Web Response -> Express res, streaming the body rather than buffering it.
async function sendWebResponse(res, webRes) {
  res.status(webRes.status);
  webRes.headers.forEach((v, k) => res.set(k, v));
  if (!webRes.body) return res.end();
  return Readable.fromWeb(webRes.body).pipe(res);
}

module.exports = function (app) {
  // Same implementation the Function uses (lib/hlsProxy.js).
  app.use("/api/hls-proxy", async (req, res) => {
    try {
      const { handleHlsProxy } = await libs();
      const webRes = await handleHlsProxy(toWebRequest(req, "/api/hls-proxy"), process.env);
      return sendWebResponse(res, webRes);
    } catch (e) {
      return res.status(502).json({ error: e.message || "Proxy failed" });
    }
  });

  // Mirrors functions/api/subtitle.js — list (all languages) + download (file_id).
  app.use("/api/subtitle", async (req, res) => {
    const { file_id, type = "movie", id, season, episode } = req.query || {};
    res.set("Access-Control-Allow-Origin", "*");
    const { listSubtitles, downloadVtt } = await libs();

    if (file_id) {
      res.set("Content-Type", "text/vtt; charset=utf-8");
      try {
        const vtt = await downloadVtt(file_id);
        return res.status(200).send(vtt || "WEBVTT\n\n");
      } catch {
        return res.status(200).send("WEBVTT\n\n");
      }
    }
    res.set("Content-Type", "application/json");
    if (!id) return res.status(200).json({ total: 0, items: [] });
    try {
      const list = await listSubtitles({ type: type === "tv" ? "tv" : "movie", id, season, episode });
      return res.status(200).json(list);
    } catch {
      return res.status(200).json({ total: 0, items: [] });
    }
  });

  // Mirrors functions/api/stream.js — the ad-free HLS extractor.
  app.use("/api/stream", async (req, res) => {
    const { type = "movie", id, season, episode, src } = req.query || {};
    res.set("Cache-Control", "no-store");

    if (!id) return res.status(400).json({ error: "Missing id" });
    if (type === "tv" && (!season || !episode)) {
      return res.status(400).json({ error: "TV requires season and episode" });
    }

    try {
      const { resolveStream } = await libs();
      const { stream, src: idx, next } = await resolveStream({
        type: type === "tv" ? "tv" : "movie",
        id,
        season,
        episode,
        src,
      });
      if (!stream || !stream.url) {
        return res.json(req.query.debug ? { ...stream, src: idx, next } : { url: null, next });
      }
      return res.json({ ...stream, src: idx, next });
    } catch (e) {
      return res.status(502).json({ error: e.message || "Extraction failed" });
    }
  });

  // Mirrors functions/api/sources.js — the full source list for the picker.
  app.use("/api/sources", async (req, res) => {
    const { type = "movie", id, season, episode } = req.query || {};
    res.set("Cache-Control", "no-store");
    if (!id) return res.status(400).json({ error: "Missing id" });
    try {
      const { listSources } = await libs();
      const sources = await listSources({ type: type === "tv" ? "tv" : "movie", id, season, episode });
      return res.json({ sources });
    } catch {
      return res.json({ sources: [] });
    }
  });

  app.use("/api/download", async (req, res) => {
    const BASE = process.env.DOWNLOAD_BASE_URL;
    const path = (req.url || "").split("?")[0].replace(/^\/+/, "");

    if (!BASE) return res.status(500).json({ error: "Download source not configured" });
    if (!path) return res.status(400).json({ error: "Missing path" });

    try {
      const origin = new URL(BASE).origin;
      const upstream = await fetch(`${BASE.replace(/\/+$/, "")}/${path}`, {
        headers: { "User-Agent": UA, Referer: `${origin}/`, Accept: "application/json" },
      });
      const text = await upstream.text();
      if (text.trim().startsWith("<")) {
        return res.status(502).json({ error: "Provider blocked the request" });
      }

      let payload = text;
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data.downloads)) {
          data.downloads = data.downloads.map((d) => ({
            ...d,
            url: d.url && d.url.startsWith("/") ? `${origin}${d.url}` : d.url,
          }));
          payload = JSON.stringify(data);
        }
      } catch (_) {
        /* pass through */
      }

      res.set("Content-Type", "application/json").send(payload);
    } catch (_) {
      res.status(502).json({ error: "Download lookup failed" });
    }
  });
};
