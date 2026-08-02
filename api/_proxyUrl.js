// Where proxied HLS/subtitle URLs point. Segment bytes relayed by a Vercel
// function bill as Fast Origin Transfer (Hobby: 10 GB/mo — roughly four hours
// of 1080p), so set PROXY_BASE to the Cloudflare Worker in worker/hls-proxy.js,
// where egress isn't billed. Unset falls back to the in-repo Vercel function,
// which is also what local dev (src/setupProxy.js) serves.
const LOCAL = "/api/hls-proxy";
const PROXY_BASE = (process.env.PROXY_BASE || "").replace(/\/+$/, "");

function proxied(url, headers) {
  const h = Buffer.from(JSON.stringify(headers)).toString("base64");
  const base = PROXY_BASE ? `${PROXY_BASE}/` : LOCAL;
  return `${base}?url=${encodeURIComponent(url)}&h=${encodeURIComponent(h)}`;
}

// True when a resolved stream URL routes through us rather than playing
// browser->CDN. Checks both forms so the answer doesn't change with PROXY_BASE.
const isProxied = (url) => {
  const s = String(url || "");
  return s.startsWith(LOCAL) || (!!PROXY_BASE && s.startsWith(PROXY_BASE));
};

module.exports = { proxied, isProxied };
