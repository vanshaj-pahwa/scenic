// Ordered ad-free stream sources flattened into a single index the client walks
// via the returned `next` on any resolve/playback failure. Each tier reserves a
// range of indices so a tier can offer several encodes before handing off:
//   src 0      -> primary catalog source
//   src 1..8   -> mirror encodes   (candidate = src - 1)
//   src 9..16  -> relay encodes    (candidate = src - 9)
// Some encodes resolve but produce bitstreams the browser can't decode, so each
// is its own step and the client falls through with a loader until one plays.
const { getStreamSource } = require("./_streamSource");
const { getMirrorSource } = require("./_mirrorSource");
const { getRelaySource } = require("./_relaySource");
const { isProxied } = require("./_proxyUrl");

const catalogOK = () => !!(process.env.CATALOG_BASE && process.env.CATALOG_PLAYER_ACTION);
const mirrorOK = () => !!process.env.MIRROR_BASE;
const relayOK = () => !!(process.env.RELAY_BASE && process.env.RELAY_PROVIDER);

const TIERS = [
  { base: 0, slots: 1, ok: catalogOK, resolve: async (a) => ({ stream: await getStreamSource(a), total: 1 }) },
  { base: 1, slots: 8, ok: mirrorOK, resolve: (a, c) => getMirrorSource({ ...a, candidate: c }) },
  { base: 9, slots: 8, ok: relayOK, resolve: (a, c) => getRelaySource({ ...a, candidate: c }) },
];

const tierAt = (idx) => TIERS.find((t) => idx >= t.base && idx < t.base + t.slots);
function nextTierBase(afterIdx) {
  for (const t of TIERS) if (t.base > afterIdx && t.ok()) return t.base;
  return null;
}

async function resolveStream({ type, id, season, episode, src }) {
  const idx = Math.max(0, Number(src) || 0);
  const tier = tierAt(idx) || TIERS[0];
  const lastOfTier = tier.base + tier.slots - 1;

  if (!tier.ok()) {
    return { stream: { url: null, _diag: { stage: "unconfigured" } }, src: idx, next: nextTierBase(lastOfTier) };
  }

  const candidate = idx - tier.base;
  const { stream, total } = await tier.resolve({ type, id, season, episode }, candidate);
  const moreInTier = candidate + 1 < Math.min(total ?? tier.slots, tier.slots);
  const next = moreInTier ? tier.base + candidate + 1 : nextTierBase(lastOfTier);
  return { stream, src: idx, next };
}

// A single slow/hanging upstream (internal retry loops) must not sink the whole
// response and trip Vercel's function timeout — cap each candidate and treat a
// timeout as "no source" so the rest still return.
const CANDIDATE_TIMEOUT_MS = 7000;
const withTimeout = (p) =>
  Promise.race([
    Promise.resolve(p).catch(() => null),
    new Promise((res) => setTimeout(() => res(null), CANDIDATE_TIMEOUT_MS)),
  ]);

// Resolve every configured source in parallel and return the ones that resolved,
// ordered by index, with light metadata for the source picker.
async function listSources({ type, id, season, episode }) {
  const args = { type, id, season, episode };
  const jobs = [];
  for (const tier of TIERS) {
    if (!tier.ok()) continue;
    for (let c = 0; c < tier.slots; c++) {
      const src = tier.base + c;
      jobs.push(
        withTimeout(tier.resolve(args, c))
          .then((r) =>
            r?.stream?.url
              ? {
                  src,
                  type: r.stream.type === "mp4" ? "mp4" : "hls",
                  subs: (r.stream.subtitles || []).length,
                  // Direct = plays browser->CDN (no proxy hop), so it costs us
                  // nothing. Proxied HLS routes every video byte through us.
                  direct: !isProxied(r.stream.url),
                }
              : null
          )
          .catch(() => null)
      );
    }
  }
  return (await Promise.all(jobs)).filter(Boolean).sort((a, b) => a.src - b.src);
}

module.exports = { resolveStream, listSources };
