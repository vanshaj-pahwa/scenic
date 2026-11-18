import { server8Domains, serverMirrors } from "../constants/constants";

// Per-server query suffix appended after the {id}[/{season}/{episode}] path.
const SUFFIX = {
  0: "?autoplay=true",
  1: "?theme=6366f1",
  3: "?autoplay=true&colour=6366f1",
  14: "?skin=onyx&welcome_page=on&autoplay=off",
};

export const buildServerUrl = ({
  mediaType,
  index,
  id,
  season,
  episode,
  mirrorIndex = -1,
}) => {
  const isTv = mediaType === "tv";

  // Server 8: rotating vidsrc mirror domains (no env base).
  if (index === 7) {
    const host = server8Domains[mirrorIndex] || server8Domains[0] || "";
    return isTv
      ? `https://${host}/embed/tv/${id}/${season}/${episode}`
      : `https://${host}/embed/movie/${id}`;
  }

  const base =
    process.env[`REACT_APP_${isTv ? "TV" : "MOVIE"}_SERVER${index + 1}`] || "";

  // Server 12 on TV takes season/episode as query params, not a path.
  if (index === 11 && isTv) {
    return `${base}${id}&tmdb=1&s=${season}&e=${episode}`;
  }

  const path = isTv ? `${id}/${season}/${episode}` : `${id}`;
  const url = `${base}${path}${SUFFIX[index] || ""}`;

  // Mirror 0 is the configured base; later ones swap in an alternate host.
  const altHost = mirrorIndex > 0 && serverMirrors[index]?.[mirrorIndex - 1];
  if (altHost && base) {
    const u = new URL(url);
    u.host = altHost;
    return u.toString();
  }
  return url;
};
