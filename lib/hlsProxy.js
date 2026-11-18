// Same-origin fallback for the standalone Worker in worker/hls-proxy.js. Used
// only when PROXY_BASE is unset — prefer the Worker, which keeps segment traffic
// off this deployment's request quota.
//
// Binary bodies stream straight to Response so no video byte is buffered; only
// manifests are read, and only to rewrite their URIs back through here so
// segments and keys keep carrying the injected Referer/Origin.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/150 Safari/537.36";

const BINARY_CT = /^(video|audio|image)\/|octet-stream|mp2t|mp4|\bts\b/i;

const isPlaylist = (url, contentType) =>
  /\.m3u8(\?|$)/i.test(url) || /mpegurl/i.test(contentType || "");

// Browsers need WebVTT; upstream subtitles are SRT.
function srtToVtt(srt) {
  const body = srt
    .replace(/^﻿/, "")
    .replace(/\r+/g, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${body.trim()}\n`;
}

// The stream origin intermittently returns 5xx or resets; retry before relaying.
// Retries happen before the body is touched, so the stream is never half-read.
async function fetchRetry(url, opts, tries = 4) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.status < 500) return res;
      last = res;
    } catch {
      last = null;
    }
  }
  if (last) return last;
  throw new Error("upstream unreachable");
}

function rewriteManifest(text, baseUrl, hParam, selfBase) {
  const wrap = (u) => {
    const abs = new URL(u, baseUrl).toString();
    return `${selfBase}?url=${encodeURIComponent(abs)}&h=${encodeURIComponent(hParam)}`;
  };
  return text
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${wrap(u)}"`);
      return wrap(t);
    })
    .join("\n");
}

function hostAllowed(target, allowed) {
  if (!allowed) return true;
  let host;
  try {
    host = new URL(target).hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowed
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Range,Content-Type",
  "Access-Control-Expose-Headers": "Content-Length,Content-Range,Accept-Ranges",
};

const jsonErr = (status, message) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

export async function handleHlsProxy(request, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...CORS, "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS" },
    });
  }

  const self = new URL(request.url);
  const selfBase = `${self.origin}${self.pathname}`;
  const target = self.searchParams.get("url");
  const h = self.searchParams.get("h") || "";

  if (!target) return jsonErr(400, "Missing url");
  if (!hostAllowed(target, env?.ALLOWED_HOSTS)) return jsonErr(403, "Host not allowed");

  let injected = {};
  try {
    if (h) injected = JSON.parse(atob(h));
  } catch {
    /* ignore malformed headers */
  }

  try {
    const upstream = await fetchRetry(target, {
      headers: {
        "User-Agent": UA,
        ...injected,
        ...(request.headers.get("range") ? { Range: request.headers.get("range") } : {}),
      },
    });

    const contentType = upstream.headers.get("content-type") || "";
    const base = upstream.url || target;

    if (self.searchParams.get("conv") === "vtt") {
      return new Response(srtToVtt(await upstream.text()), {
        status: upstream.status,
        headers: { "Content-Type": "text/vtt; charset=utf-8", "Cache-Control": "public, max-age=3600", ...CORS },
      });
    }

    const sendManifest = (text) =>
      new Response(rewriteManifest(text, base, h, selfBase), {
        status: upstream.status,
        headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store", ...CORS },
      });

    if (isPlaylist(target, contentType)) return sendManifest(await upstream.text());

    const mediaHeaders = () => {
      const headers = new Headers(CORS);
      for (const k of ["content-type", "content-range", "accept-ranges"]) {
        const v = upstream.headers.get(k);
        if (v) headers.set(k, v);
      }
      headers.set("Cache-Control", "public, max-age=3600");
      return headers;
    };

    if (BINARY_CT.test(contentType) || !upstream.body) {
      const headers = mediaHeaders();
      const len = upstream.headers.get("content-length");
      if (len && !upstream.headers.get("content-encoding")) headers.set("content-length", len);
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    // Extension-less playlists (query-string routing) can carry an off
    // content-type. Sniff via tee so an unrecognised segment still streams
    // rather than being buffered.
    const [sniff, rest] = upstream.body.tee();
    const reader = sniff.getReader();
    const first = await reader.read();
    reader.cancel().catch(() => {});
    const head = new TextDecoder().decode(first.value || new Uint8Array()).trimStart();

    if (head.startsWith("#EXTM3U")) return sendManifest(await new Response(rest).text());

    return new Response(rest, { status: upstream.status, headers: mediaHeaders() });
  } catch (e) {
    return jsonErr(502, e.message || "Proxy failed");
  }
}
