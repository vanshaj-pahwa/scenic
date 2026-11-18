import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const BASE = (process.env.SCENIC_URL || "https://scenic-stream.pages.dev").replace(/\/$/, "");
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");

const log = (...a) => console.log("[screenshots]", ...a);

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const go = (path) => page.goto(BASE + path, { waitUntil: "load", timeout: 60000 });
  const shot = (name, target = page) => target.screenshot({ path: join(OUT, name) });

  // Home (hero)
  try {
    await go("/");
    await page.waitForTimeout(4500);
    await shot("home.png");
    log("home");
  } catch (e) {
    log("home failed:", e.message);
  }

  // Movie detail - rotate through well-known titles each week.
  try {
    const MOVIES = [27205, 157336, 155, 872585, 693134, 634649, 569094];
    const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const movieId = MOVIES[weekIndex % MOVIES.length];
    await go("/movie/" + movieId);
    await page.waitForTimeout(4000);
    await shot("detail.png");
    log("detail:", movieId);
  } catch (e) {
    log("detail failed:", e.message);
  }

  // Search results - rotate through a plain keyword and natural-language
  // (smart search) queries so the screenshot varies week to week.
  try {
    const SEARCHES = [
      "inception",
      "punjabi movies",
      "korean dramas",
      "movies like inception",
      "hindi comedy",
      "directed by nolan",
    ];
    const weekIndex = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const query = SEARCHES[weekIndex % SEARCHES.length];
    await go("/search/" + encodeURIComponent(query));
    await page.waitForTimeout(4500);
    await shot("search.png");
    log("search:", query);
  } catch (e) {
    log("search failed:", e.message);
  }

  // Top 10 + provider sections on the home page
  try {
    await go("/");
    await page.waitForTimeout(6000);
    const top = page.locator(".section").filter({ hasText: "Top 10 This Week" }).first();
    await top.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await shot("top10.png", top);
    log("top10");

    const prov = page.locator(".only-on-provider").first();
    if (await prov.count()) {
      await prov.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await shot("providers.png", prov);
      log("providers");
    }
  } catch (e) {
    log("home sections failed:", e.message);
  }

  // TV episode list + season picker
  try {
    await go("/tv/1396");
    await page.waitForTimeout(4500);
    const season = page.locator(".season-container").first();
    await season.scrollIntoViewIfNeeded();
    // Push down so the fixed header does not overlap the season dropdown.
    await page.evaluate(() => window.scrollBy(0, -120));
    await page.waitForTimeout(1500);
    await shot("episodes.png");
    log("episodes");

    await page.locator(".season-dropdown-selected").first().click();
    await page.waitForTimeout(1000);
    await shot("seasons.png");
    log("seasons");
  } catch (e) {
    log("tv failed:", e.message);
  }

  await browser.close();
  log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
