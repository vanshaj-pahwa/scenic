// Where proxied HLS/subtitle URLs point. PROXY_BASE should be the Cloudflare
// Worker (worker/hls-proxy.js), where egress isn't billed. Unset falls back to
// the same-origin Pages Function, which works but routes video through this
// deployment's request quota.
//
// Base64 via btoa rather than Buffer: the payload is a JSON object of ASCII
// header values, so btoa is exact and this module stays free of nodejs_compat.
import { cfg } from "./env.js";

const LOCAL = "/api/hls-proxy";

const base = () => cfg("PROXY_BASE").replace(/\/+$/, "");

export function proxied(url, headers) {
  const h = btoa(JSON.stringify(headers));
  const b = base();
  const prefix = b ? `${b}/` : LOCAL;
  return `${prefix}?url=${encodeURIComponent(url)}&h=${encodeURIComponent(h)}`;
}

// True when a resolved stream URL routes through us rather than playing
// browser->CDN. Checks both forms so the answer doesn't change with PROXY_BASE.
export function isProxied(url) {
  const s = String(url || "");
  const b = base();
  return s.startsWith(LOCAL) || (!!b && s.startsWith(b));
}
