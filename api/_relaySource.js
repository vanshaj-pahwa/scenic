// Tertiary ad-free source: an id-native aggregator that returns its stream list
// as a custom-base64 payload decoded here. Host, provider routes, stream referer
// and the subtitle host are env-driven. Streams may be HLS (proxied) or a direct
// MP4; each provider is a fallback candidate the client walks when one fails.
const { proxied } = require("./_proxyUrl");

const RELAY_BASE = (process.env.RELAY_BASE || "").replace(/\/+$/, "");
// Comma-separated provider routes tried in order; coverage varies per title, so
// each is a fallback candidate the client walks.
const PROVIDERS = (process.env.RELAY_PROVIDER || "").split(",").map((s) => s.trim()).filter(Boolean);
const RELAY_REFERER = process.env.RELAY_REFERER || "";
// Optional id-native subtitle host (returns [{label, file}] per title).
const RELAY_SUB_BASE = (process.env.RELAY_SUB_BASE || "").replace(/\/+$/, "");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// The aggregator encodes payloads with a shuffled base64 alphabet.
const ALPHABET = "RB0fpH8ZEyVLkv7c2i6MAJ5u3IKFDxlS1NTsnGaqmXYdUrtzjwObCgQP94hoeW+/=";
function decodePayload(data) {
  const map = {};
  for (let i = 0; i < ALPHABET.length; i++) map[ALPHABET[i]] = i;
  const out = [];
  for (let t = 0; t < data.length; t += 4) {
    let chunk = data.slice(t, t + 4);
    while (chunk.length < 4) chunk += "=";
    const l = [];
    for (let e = 0; e < 4; e++) {
      const v = map[chunk[e]];
      l.push(v !== undefined ? v : 64);
    }
    out.push((l[0] << 2) | (l[1] >> 4));
    if (l[2] !== 64) out.push(((l[1] & 15) << 4) | (l[2] >> 2));
    if (l[3] !== 64) out.push(((l[2] & 3) << 6) | l[3]);
  }
  return Buffer.from(out).toString("utf8");
}


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
  return { ok: false, status: last, json: async () => null };
}

// Walk the arbitrarily-shaped decoded payload and collect playable stream URLs.
function collectStreams(node, acc) {
  if (!node || typeof node !== "object") return acc;
  if (Array.isArray(node)) {
    for (const x of node) collectStreams(x, acc);
    return acc;
  }
  const url = node.url || node.link || node.file || node.playlist;
  const t = String(node.type || "").toLowerCase();
  if (typeof url === "string") {
    if (t === "hls" || /mpegurl/i.test(t) || /\.m3u8|\/pl\//i.test(url)) acc.push({ url, type: "hls" });
    else if (t === "mp4" || /\.mp4(\?|$)/i.test(url)) acc.push({ url, type: "mp4" });
  }
  for (const k in node) if (node[k] && typeof node[k] === "object") collectStreams(node[k], acc);
  return acc;
}

// Id-native subtitles, routed through the proxy so they load same-origin.
async function relaySubs({ type, id, season, episode }) {
  if (!RELAY_SUB_BASE) return [];
  const path = type === "tv" ? `/v2/tv/${id}/${season}/${episode}` : `/v2/movie/${id}`;
  const res = await tryFetch(`${RELAY_SUB_BASE}${path}`, { headers: { "User-Agent": UA } });
  if (!res.ok) return [];
  const list = await res.json().catch(() => null);
  if (!Array.isArray(list)) return [];
  return list
    .map((s) => ({ file: s.file || s.url, label: s.label || s.language }))
    .filter((s) => s.file)
    .slice(0, 30)
    .map((s) => ({
      lang: (s.label || "en").trim().slice(0, 2).toLowerCase(),
      label: s.label || "Subtitle",
      url: proxied(s.file, { "User-Agent": UA }),
    }));
}

async function getRelaySource({ type, id, season, episode, candidate = 0 }) {
  if (!RELAY_BASE || !PROVIDERS.length) return { stream: { url: null, _diag: { stage: "unconfigured" } }, total: 0 };

  const total = PROVIDERS.length;
  if (candidate >= total) return { stream: { url: null, _diag: { stage: "exhausted" } }, total };
  const provider = PROVIDERS[candidate];

  const path = type === "tv" ? `/${provider}/tv/${id}/${season}/${episode}` : `/${provider}/movie/${id}`;
  const res = await tryFetch(`${RELAY_BASE}${path}`, { headers: { "User-Agent": UA, Referer: `${RELAY_BASE}/` } });
  if (!res.ok) return { stream: { url: null, _diag: { stage: "fetch", status: res.status, provider } }, total };

  const j = await res.json().catch(() => null);
  if (!j) return { stream: { url: null, _diag: { stage: "parse", provider } }, total };

  let obj = j;
  if (j.encrypted) {
    try { obj = JSON.parse(decodePayload(j.data || "")); } catch { obj = null; }
  }
  // Prefer a browser-playable direct MP4 (H.264 — plays as-is everywhere, no
  // proxy = no origin-transfer cost) over HLS (which we must proxy). H.265/HEVC
  // MP4s are pushed below HLS: no browser reliably plays them (Chrome/Firefox
  // lack the decoder; Safari rejects the hev1 sample entry), so they're a last
  // resort only. Among HLS, prefer master/variant playlists.
  const seen = new Set();
  const streams = collectStreams(obj, [])
    .filter((s) => !seen.has(s.url) && seen.add(s.url))
    .sort((a, b) => rank(b) - rank(a));
  if (!streams.length) return { stream: { url: null, _diag: { stage: "nostream", provider } }, total };

  const chosen = streams[0];
  const headers = { Referer: RELAY_REFERER || `${RELAY_BASE}/`, "User-Agent": UA };
  const subtitles = await relaySubs({ type, id, season, episode });
  // HLS goes through the proxy (Referer/CORS); a direct MP4 plays as-is.
  return {
    stream: {
      type: chosen.type,
      url: chosen.type === "mp4" ? chosen.url : proxied(chosen.url, headers),
      subtitles,
    },
    total,
  };
}

// H.264 MP4 (4) > HLS master (3) > HLS (2) > H.265/HEVC MP4 (-1, last resort).
const isHevc = (url) => /\/h265\/|hevc|hev1|hvc1/i.test(url);
const rank = (s) => {
  if (s.type === "mp4") return isHevc(s.url) ? -1 : 4;
  return 2 + (/(master|\/pl\/)/i.test(s.url) ? 1 : 0);
};

module.exports = { getRelaySource };
