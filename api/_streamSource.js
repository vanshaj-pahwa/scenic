const { proxied } = require("./_proxyUrl");

const CATALOG_BASE = (process.env.CATALOG_BASE || "").replace(/\/+$/, "");
const PLAYER_ACTION = process.env.CATALOG_PLAYER_ACTION || "";
const TMDB_KEY = process.env.TMDB_API_KEY || process.env.REACT_APP_API_KEY || "";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function tmdbMeta({ type, id }) {
  if (!TMDB_KEY) return null;
  const path = type === "tv" ? `tv/${id}` : `movie/${id}`;
  const res = await tryFetch(`https://api.themoviedb.org/3/${path}?api_key=${TMDB_KEY}`);
  if (!res.ok) return null;
  const j = await res.json();
  return type === "tv"
    ? { title: j.name, year: (j.first_air_date || "").slice(0, 4) }
    : { title: j.title, year: (j.release_date || "").slice(0, 4) };
}

function pagePath({ type, meta, season, episode }) {
  const base = slugify(meta.title) + (meta.year ? `-${meta.year}` : "");
  return type === "tv"
    ? `/episodes/${base}-season-${season}-episode-${episode}/`
    : `/movies/${base}/`;
}

// The catalog + embed hosts intermittently reset the connection / return 5xx;
// retry transient failures before giving up.
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
  return { ok: false, status: last, headers: new Map(), text: async () => null, json: async () => null };
}

async function getPage(url, cookie) {
  const res = await tryFetch(url, {
    headers: { "User-Agent": UA, ...(cookie.v ? { Cookie: cookie.v } : {}) },
  });
  const sc = res.headers.get ? res.headers.get("set-cookie") : null;
  if (sc) cookie.v = sc.split(";")[0];
  return { status: res.status, text: res.ok ? await res.text() : null };
}


async function getStreamSource({ type, id, season, episode }) {
  if (!CATALOG_BASE || !PLAYER_ACTION) return { url: null, _diag: { stage: "unconfigured" } };

  const meta = await tmdbMeta({ type, id });
  if (!meta || !meta.title) return { url: null, _diag: { stage: "tmdb" } };

  const cookie = { v: "" };
  await getPage(`${CATALOG_BASE}/`, cookie);

  const path = pagePath({ type, meta, season, episode });
  const page = await getPage(`${CATALOG_BASE}${path}?nc=${Date.now()}`, cookie);
  if (!page.text) return { url: null, _diag: { stage: "page", status: page.status } };

  const nonce = page.text.match(/"nonce":"([a-f0-9]+)"/)?.[1];
  const btn = page.text.match(/<button[^>]*class="[^"]*server-btn[^"]*"[^>]*>/i)?.[0] || "";
  const post = btn.match(/data-post="(\d+)"/)?.[1];
  const ptype = btn.match(/data-type="([a-z]+)"/i)?.[1];
  const num = btn.match(/data-num="(\d+)"/)?.[1];
  if (!nonce || !post || !ptype || !num) return { url: null, _diag: { stage: "parse" } };

  const ajax = await tryFetch(`${CATALOG_BASE}/wp-admin/admin-ajax.php`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Cookie: cookie.v,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${CATALOG_BASE}${path}`,
    },
    body: `action=${PLAYER_ACTION}&nonce=${nonce}&post=${post}&type=${ptype}&nume=${num}`,
  });
  if (!ajax.ok) return { url: null, _diag: { stage: "ajax", status: ajax.status } };

  const j = await ajax.json().catch(() => null);
  const embedSrc = j?.embed_url?.match(/src="([^"]+)"/)?.[1];
  if (!embedSrc) return { url: null, _diag: { stage: "embed" } };

  const iframe = (embedSrc.startsWith("//") ? `https:${embedSrc}` : embedSrc).replace(/&amp;/g, "&");
  const embedOrigin = new URL(iframe).origin;

  // The embed host throws intermittent origin errors; retry to get the manifest.
  let master = null;
  for (let i = 0; i < 6 && !master; i++) {
    try {
      const r = await fetch(iframe, { headers: { "User-Agent": UA, Referer: `${CATALOG_BASE}/` } });
      if (r.ok) {
        const t = await r.text();
        master = t.match(/https?:\/\/[^"'\s]+master\.m3u8[^"'\s]*/)?.[0] || null;
      }
    } catch {
      /* transient network/origin error — retry */
    }
  }
  if (!master) return { url: null, _diag: { stage: "master" } };

  // The stream host serves CORS and needs no Referer, so the browser plays the
  // master directly — no proxy. Only the subtitle host lacks CORS and is SRT,
  // so that one is routed through the proxy for CORS + SRT->VTT conversion.
  const headers = { Referer: `${embedOrigin}/`, "User-Agent": UA };
  const subRaw = j.embed_url.match(/sub=([^"&]+)/)?.[1];
  const subUrl = subRaw ? decodeURIComponent(subRaw).replace(/^\/\//, "https://") : null;

  return {
    type: "hls",
    url: master,
    subtitles: subUrl
      ? [{ lang: "en", label: "English (source)", url: `${proxied(subUrl, headers)}&conv=vtt` }]
      : [],
  };
}

module.exports = { getStreamSource };
