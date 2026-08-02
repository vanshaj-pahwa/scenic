// SSR of the SPA shell for /movie/:id and /tv/:id — injects title, description,
// OG/Twitter tags and Movie/TVSeries JSON-LD so crawlers and link unfurlers see
// real metadata instead of the empty CRA shell.
//
// On Vercel the shell was fetched over HTTP from the deployment's own origin.
// Pages exposes the static assets as an ASSETS binding, so it's read directly —
// no self-request, and it works before the deployment has a public URL.
import { tmdbKey } from "./env.js";
import { fetchRetry } from "./http.js";

let cachedHtml = null;

async function loadHtml(env, request) {
  if (cachedHtml) return cachedHtml;
  const url = new URL("/index.html", request.url);
  const res = await env.ASSETS.fetch(new Request(url, { headers: { Accept: "text/html" } }));
  if (!res.ok) throw new Error(`Failed to load index.html: ${res.status}`);
  cachedHtml = await res.text();
  return cachedHtml;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(str, n) {
  const s = String(str || "").trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

// minutes -> ISO 8601 duration (PT2H53M)
function isoDuration(mins) {
  const m = Number(mins);
  if (!m || m <= 0) return null;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `PT${h ? `${h}H` : ""}${r ? `${r}M` : ""}`;
}

export async function renderTitlePage({ type, id, request, env }) {
  const origin = new URL(request.url).origin;
  const baseHeaders = { "Content-Type": "text/html; charset=utf-8" };

  let html;
  try {
    html = await loadHtml(env, request);
  } catch (_) {
    return new Response("Server error", { status: 500 });
  }

  // Not a title URL (e.g. /movie/abc) — hand back the untouched SPA shell and
  // let client-side routing deal with it.
  if (!type || !id || !["movie", "tv"].includes(type) || !/^\d+$/.test(id)) {
    return new Response(html, { status: 200, headers: baseHeaders });
  }

  try {
    const apiKey = tmdbKey();
    if (!apiKey) throw new Error("Missing TMDB API key");

    const tmdbRes = await fetchRetry(
      `https://api.themoviedb.org/3/${type}/${id}?api_key=${encodeURIComponent(apiKey)}&append_to_response=credits`
    );

    if (tmdbRes.ok) {
      const data = await tmdbRes.json();
      const title = data.title || data.name || "Scenic";
      const releaseDate = data.release_date || data.first_air_date || "";
      const year = releaseDate.slice(0, 4);
      const posterPath = data.backdrop_path || data.poster_path;
      const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : "";
      const fullUrl = `${origin}/${type}/${id}`;
      const genres = (data.genres || []).map((g) => g.name).filter(Boolean);
      const cast = (data.credits?.cast || [])
        .slice(0, 6)
        .map((c) => c.name)
        .filter(Boolean);
      const directors = (data.credits?.crew || [])
        .filter((c) => c.job === "Director")
        .map((c) => c.name)
        .filter(Boolean);

      const displayTitle = year ? `${title} (${year}) - Scenic` : `${title} - Scenic`;

      // Real synopsis makes the page rank for the title; fall back to a
      // descriptive line when TMDB has no overview.
      const description =
        truncate(data.overview, 160) ||
        `Watch ${title}${year ? ` (${year})` : ""} on Scenic.${
          genres.length ? ` ${genres.join(", ")}.` : ""
        } Stream instantly and watch the trailer, no signup needed.`;

      const keywords = [
        title,
        year ? `${title} ${year}` : "",
        `watch ${title} online`,
        `${title} ${type === "movie" ? "full movie" : "series"}`,
        ...genres,
        "Scenic",
      ]
        .filter(Boolean)
        .join(", ");

      // Movie / TVSeries structured data -> rich results (poster, rating, cast).
      const ld = {
        "@context": "https://schema.org",
        "@type": type === "movie" ? "Movie" : "TVSeries",
        name: title,
        url: fullUrl,
        description: String(data.overview || description),
      };
      if (posterUrl) ld.image = posterUrl;
      if (releaseDate) ld.datePublished = releaseDate;
      if (genres.length) ld.genre = genres;
      const dur = isoDuration(data.runtime || (data.episode_run_time && data.episode_run_time[0]));
      if (dur) ld.duration = dur;
      if (data.vote_count > 0 && data.vote_average > 0) {
        ld.aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: Number(data.vote_average).toFixed(1),
          ratingCount: data.vote_count,
          bestRating: 10,
          worstRating: 1,
        };
      }
      if (cast.length) ld.actor = cast.map((n) => ({ "@type": "Person", name: n }));
      if (type === "movie" && directors.length) {
        ld.director = directors.map((n) => ({ "@type": "Person", name: n }));
      }
      if (type === "tv") {
        if (data.number_of_seasons) ld.numberOfSeasons = data.number_of_seasons;
        if (data.number_of_episodes) ld.numberOfEpisodes = data.number_of_episodes;
      }
      // Escape < so a synopsis containing markup can't break out of the script.
      const ldJson = JSON.stringify(ld).replace(/</g, "\\u003c");

      const ogBlock = [
        `<title>${escapeHtml(displayTitle)}</title>`,
        `<meta name="description" content="${escapeHtml(description)}" />`,
        `<meta name="keywords" content="${escapeHtml(keywords)}" />`,
        `<link rel="canonical" href="${escapeHtml(fullUrl)}" />`,
        `<meta property="og:type" content="video.${type === "movie" ? "movie" : "tv_show"}" />`,
        `<meta property="og:site_name" content="Scenic" />`,
        `<meta property="og:title" content="${escapeHtml(displayTitle)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:url" content="${escapeHtml(fullUrl)}" />`,
        posterUrl ? `<meta property="og:image" content="${escapeHtml(posterUrl)}" />` : "",
        posterUrl ? `<meta property="og:image:alt" content="${escapeHtml(`${title} poster`)}" />` : "",
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${escapeHtml(displayTitle)}" />`,
        `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
        posterUrl ? `<meta name="twitter:image" content="${escapeHtml(posterUrl)}" />` : "",
        `<script type="application/ld+json">${ldJson}</script>`,
      ]
        .filter(Boolean)
        .join("\n    ");

      // Remove the static tags we're overriding (incl. the homepage canonical).
      html = html.replace(/<title>[^<]*<\/title>/i, "");
      html = html.replace(/<meta\s+name="description"[^>]*\/?>/i, "");
      html = html.replace(/<meta\s+name="keywords"[^>]*\/?>/i, "");
      html = html.replace(/<link\s+rel="canonical"[^>]*\/?>/i, "");
      html = html.replace(/<meta\s+property="og:[^"]*"[^>]*\/?>/gi, "");
      html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*\/?>/gi, "");
      html = html.replace("</head>", `    ${ogBlock}\n  </head>`);
    }

    return new Response(html, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (_) {
    return new Response(html, { status: 200, headers: baseHeaders });
  }
}
