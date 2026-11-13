import { server8Domains } from "../constants/constants";

// Per-server query suffix appended after the {id}[/{season}/{episode}] path.
const SUFFIX = {
  3: "?autoplay=true&colour=6366f1",
  9: "?autoplay=true",
  10: "?theme=6366f1&startAt=15",
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
  return `${base}${path}${SUFFIX[index] || ""}`;
};
