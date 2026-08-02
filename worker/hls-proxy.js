// Cloudflare Worker port of api/hls-proxy.js.
//
// Why it lives here: proxying segments through a Vercel function bills every
// byte as Fast Origin Transfer (Hobby caps at 10 GB/mo — about four hours of
// 1080p). Workers charge requests and CPU only, never egress, so the same
// traffic is free up to 100k requests/day (~160 h of video at 6s segments).
//
// The one rule that keeps it inside the 10ms free-tier CPU budget: never
// buffer a segment. Binary bodies are handed to Response as a stream, so the
// Worker touches no video bytes. Only manifests (small text) are read, and
// only so their URIs can be rewritten back through here — segments and keys
// must carry the same injected Referer/Origin the browser can't set itself.
//
// Params: url = upstream URL, h = base64(JSON) headers, conv=vtt for subtitles.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/150 Safari/537.36";

// Content types that are definitely media — stream these without sniffing.
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

// The stream origin intermittently returns 5xx (Cloudflare origin errors) or
// resets the connection; retry transient failures before relaying. Retries only
// happen before the body is touched, so the stream is never half-consumed.
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

// Manifest URIs point back at this Worker (self origin) rather than a relative
// path — the player loads them cross-origin from the Vercel-hosted page.
function rewriteManifest(text, baseUrl, hParam, selfOrigin) {
  const wrap = (u) => {
    const abs = new URL(u, baseUrl).toString();
    return `${selfOrigin}/?url=${encodeURIComponent(abs)}&h=${encodeURIComponent(hParam)}`;
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

// An open proxy on a free plan invites abuse. When ALLOWED_HOSTS is set, only
// upstream hosts matching one of its comma-separated suffixes are relayed.
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

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS" } });
    }

    const self = new URL(request.url);
    const target = self.searchParams.get("url");
    const h = self.searchParams.get("h") || "";

    if (!target) return jsonErr(400, "Missing url");
    if (!hostAllowed(target, env.ALLOWED_HOSTS)) return jsonErr(403, "Host not allowed");

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
        // Cloudflare would otherwise serve video from its CDN cache; keep this a
        // pure compute passthrough.
        cf: { cacheEverything: false },
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
        new Response(rewriteManifest(text, base, h, self.origin), {
          status: upstream.status,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "no-store",
            ...CORS,
          },
        });

      if (isPlaylist(target, contentType)) return sendManifest(await upstream.text());

      // Segment / key: hand the body straight to Response so no video byte is
      // read into the isolate. Content-Length is only safe to forward when the
      // body wasn't decompressed in transit.
      const passthrough = () => {
        const headers = new Headers(CORS);
        for (const k of ["content-type", "content-range", "accept-ranges"]) {
          const v = upstream.headers.get(k);
          if (v) headers.set(k, v);
        }
        const len = upstream.headers.get("content-length");
        if (len && !upstream.headers.get("content-encoding")) headers.set("content-length", len);
        headers.set("Cache-Control", "public, max-age=3600");
        return new Response(upstream.body, { status: upstream.status, headers });
      };

      if (BINARY_CT.test(contentType) || !upstream.body) return passthrough();

      // Extension-less playlists (query-string routing) can carry an off
      // content-type. Sniff via tee so an unrecognised segment still streams
      // rather than being buffered.
      const [sniff, rest] = upstream.body.tee();
      const reader = sniff.getReader();
      const first = await reader.read();
      reader.cancel().catch(() => {});
      const head = new TextDecoder().decode(first.value || new Uint8Array()).trimStart();

      if (head.startsWith("#EXTM3U")) {
        return sendManifest(await new Response(rest).text());
      }

      const headers = new Headers(CORS);
      for (const k of ["content-type", "content-range", "accept-ranges"]) {
        const v = upstream.headers.get(k);
        if (v) headers.set(k, v);
      }
      headers.set("Cache-Control", "public, max-age=3600");
      return new Response(rest, { status: upstream.status, headers });
    } catch (e) {
      return jsonErr(502, e.message || "Proxy failed");
    }
  },
};
