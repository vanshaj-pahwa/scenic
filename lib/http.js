// TMDB is reached over the same flaky path as the other upstreams in this repo
// (the source modules all carry their own retry loops, and _subtitle notes ISP
// interception). Without a retry the detail-page SSR silently falls back to the
// unmodified shell and /api/tmdb returns intermittent 502s, so both go through
// here.
//
// Only connection-level failures and 5xx are retried — a 4xx from TMDB is a real
// answer (bad id, bad key) and retrying it would just burn time.
export async function fetchRetry(url, opts = {}, tries = 3) {
  let lastRes = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, opts);
      if (res.status < 500) return res;
      lastRes = res;
    } catch {
      lastRes = null;
    }
  }
  if (lastRes) return lastRes;
  throw new Error("upstream unreachable");
}
