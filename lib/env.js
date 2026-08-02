// Config access for Pages Functions.
//
// On Vercel these modules read process.env at import time. That doesn't
// translate: Workers hand bindings to the request via context.env, and
// process.env is only populated under nodejs_compat with no documented
// guarantee it's ready at module top-level scope — which is exactly when a
// `const X = process.env.X` would run. So every route binds the incoming env
// first and config is read lazily through cfg() at call time.
let bound = {};

export const bindEnv = (env) => {
  bound = env || {};
};

export const cfg = (key, fallback = "") => {
  const v = bound[key];
  return v === undefined || v === null || v === "" ? fallback : v;
};

// TMDB key: server-only var first, then the CRA-prefixed one as a fallback,
// matching the Vercel handlers.
export const tmdbKey = () => cfg("TMDB_API_KEY") || cfg("REACT_APP_API_KEY");

// Trailing slashes break the `${base}${path}` joins throughout the sources.
export const cfgBase = (key) => cfg(key).replace(/\/+$/, "");

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
