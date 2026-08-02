// Secondary ad-free extractor: resolves a TMDB/IMDb id to an HLS stream via the
// embed host's inline player config (a JW-style playlist.json → master.m3u8).
// Host is env-driven; the stream CDN pins CORS to the embed origin, so the
// master is routed through the HLS proxy (which injects Referer + serves CORS).
const MIRROR_BASE = (process.env.MIRROR_BASE || "").replace(/\/+$/, "");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const { proxied } = require("./_proxyUrl");

// Embed + CDN hosts intermittently reset or return 5xx; retry transient failures.
async function tryFetch(url, opts, tries = 4) {
  let last = 0;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      last = res.status;
    } catch {
      last = 0;
    }
  }
  return { ok: false, status: last, text: async () => null, json: async () => null };
}

function absolute(base, path) {
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

// Resolve one playlist candidate to its HLS master URL (null if it has none).
async function candidateMaster(base, path, headers) {
  const abs = absolute(base, path);
  if (!abs) return null;
  const res = await tryFetch(abs, { headers });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  const sources = j?.playlist?.[0]?.sources || [];
  return (sources.find((s) => /hls/i.test(s.type || "") || /\.m3u8/i.test(s.file || "")) || sources[0])?.file || null;
}

async function subtitles(base, subUrl, headers) {
  if (!subUrl) return [];
  const res = await tryFetch(subUrl, { headers });
  if (!res.ok) return [];
  const list = await res.json().catch(() => null);
  if (!Array.isArray(list)) return [];
  const origin = new URL(subUrl).origin;
  return list
    .filter((s) => s.url)
    .slice(0, 24)
    .map((s) => ({
      lang: (s.language || s.label || "en").slice(0, 2).toLowerCase(),
      label: s.label || s.language || "Subtitle",
      url: proxied(absolute(origin, s.url), { Referer: `${base}/`, "User-Agent": UA }),
    }));
}

// Each title exposes many encodes (primary + backups). Mirrors vary in codec
// profile and some produce bitstreams the browser can't decode, so a single
// `candidate` is resolved per call and the client walks to the next on failure.
// Returns { stream, total } where total is the number of encodes available.
async function getMirrorSource({ type, id, season, episode, candidate = 0 }) {
  if (!MIRROR_BASE) return { stream: { url: null, _diag: { stage: "unconfigured" } }, total: 0 };

  const path = type === "tv" ? `/e/tv/${id}/${season}/${episode}` : `/e/movie/${id}`;
  const referer = `${MIRROR_BASE}/`;
  const headers = { "User-Agent": UA, Referer: referer };

  const page = await tryFetch(`${MIRROR_BASE}${path}?autostart=true`, { headers });
  const html = page.ok ? await page.text() : null;
  if (!html) return { stream: { url: null, _diag: { stage: "embed", status: page.status } }, total: 0 };

  const primary = html.match(/"playlist"\s*:\s*"([^"]+)"/)?.[1];
  const backups = [...html.matchAll(/"url"\s*:\s*"(\/[^"]+playlist\.json)"/g)].map((m) => m[1]);
  const candidates = [primary, ...backups].filter(Boolean);
  const total = candidates.length;
  if (candidate >= total) return { stream: { url: null, _diag: { stage: "exhausted" } }, total };

  const master = await candidateMaster(MIRROR_BASE, candidates[candidate], headers);
  if (!master) return { stream: { url: null, _diag: { stage: "master", candidate } }, total };

  const subUrl = html.match(/var\s+suburl\s*=\s*"([^"]+)"/)?.[1] || null;

  return {
    stream: {
      type: "hls",
      url: proxied(master, { Referer: referer, "User-Agent": UA }),
      subtitles: await subtitles(MIRROR_BASE, subUrl, headers),
    },
    total,
  };
}

module.exports = { getMirrorSource };
