// Mock the mirror domains so Server 8 is deterministic.
jest.mock("../constants/constants", () => ({
  server8Domains: ["d0.test", "d1.test", "d2.test", "d3.test"],
}));

import { buildServerUrl } from "./serverUrl";

const ID = 27205;
const SEASON = 2;
const EPISODE = 5;

beforeAll(() => {
  for (let i = 1; i <= 15; i++) {
    process.env[`REACT_APP_MOVIE_SERVER${i}`] = `https://m${i}/`;
    process.env[`REACT_APP_TV_SERVER${i}`] = `https://t${i}/`;
  }
});

// Expected URLs replicate the original (pre-refactor) per-server formulas.
const expectedMovie = [
  `https://m1/${ID}`,
  `https://m2/${ID}`,
  `https://m3/${ID}`,
  `https://m4/${ID}?autoplay=true&colour=6366f1`,
  `https://m5/${ID}`,
  `https://m6/${ID}`,
  `https://m7/${ID}`,
  `https://d0.test/embed/movie/${ID}`,
  `https://m9/${ID}`,
  `https://m10/${ID}?autoplay=true`,
  `https://m11/${ID}?theme=6366f1&startAt=15`,
  `https://m12/${ID}`,
  `https://m13/${ID}`,
  `https://m14/${ID}`,
  `https://m15/${ID}?skin=onyx&welcome_page=on&autoplay=off`,
];

const expectedTv = [
  `https://t1/${ID}/${SEASON}/${EPISODE}`,
  `https://t2/${ID}/${SEASON}/${EPISODE}`,
  `https://t3/${ID}/${SEASON}/${EPISODE}`,
  `https://t4/${ID}/${SEASON}/${EPISODE}?autoplay=true&colour=6366f1`,
  `https://t5/${ID}/${SEASON}/${EPISODE}`,
  `https://t6/${ID}/${SEASON}/${EPISODE}`,
  `https://t7/${ID}/${SEASON}/${EPISODE}`,
  `https://d0.test/embed/tv/${ID}/${SEASON}/${EPISODE}`,
  `https://t9/${ID}/${SEASON}/${EPISODE}`,
  `https://t10/${ID}/${SEASON}/${EPISODE}?autoplay=true`,
  `https://t11/${ID}/${SEASON}/${EPISODE}?theme=6366f1&startAt=15`,
  `https://t12/${ID}&tmdb=1&s=${SEASON}&e=${EPISODE}`,
  `https://t13/${ID}/${SEASON}/${EPISODE}`,
  `https://t14/${ID}/${SEASON}/${EPISODE}`,
  `https://t15/${ID}/${SEASON}/${EPISODE}?skin=onyx&welcome_page=on&autoplay=off`,
];

describe("buildServerUrl - movies", () => {
  expectedMovie.forEach((url, index) => {
    test(`server ${index + 1} builds the expected movie URL`, () => {
      expect(
        buildServerUrl({ mediaType: "movie", index, id: ID, mirrorIndex: -1 })
      ).toBe(url);
    });
  });
});

describe("buildServerUrl - tv", () => {
  expectedTv.forEach((url, index) => {
    test(`server ${index + 1} builds the expected tv URL`, () => {
      expect(
        buildServerUrl({
          mediaType: "tv",
          index,
          id: ID,
          season: SEASON,
          episode: EPISODE,
          mirrorIndex: -1,
        })
      ).toBe(url);
    });
  });
});

describe("Server 8 mirror rotation", () => {
  test("mirrorIndex picks the matching domain (movie)", () => {
    expect(
      buildServerUrl({ mediaType: "movie", index: 7, id: ID, mirrorIndex: 2 })
    ).toBe(`https://d2.test/embed/movie/${ID}`);
  });

  test("mirrorIndex picks the matching domain (tv)", () => {
    expect(
      buildServerUrl({
        mediaType: "tv",
        index: 7,
        id: ID,
        season: SEASON,
        episode: EPISODE,
        mirrorIndex: 3,
      })
    ).toBe(`https://d3.test/embed/tv/${ID}/${SEASON}/${EPISODE}`);
  });

  test("mirrorIndex -1 falls back to the first domain", () => {
    expect(
      buildServerUrl({ mediaType: "movie", index: 7, id: ID, mirrorIndex: -1 })
    ).toBe(`https://d0.test/embed/movie/${ID}`);
  });

  test("mirrorIndex out of range falls back to the first domain", () => {
    expect(
      buildServerUrl({ mediaType: "movie", index: 7, id: ID, mirrorIndex: 99 })
    ).toBe(`https://d0.test/embed/movie/${ID}`);
  });
});
