export const servers = [
  "Server 1",
  "Server 2",
  "Server 3",
  "Server 4",
  "Server 5",
  "Server 6",
  "Server 7",
  "Server 8",
  "Server 9",
  "Server 10",
  "Server 11",
  "Server 12",
  "Server 13",
  "Server 14",
  "Server 15",
  "Server 16",
];

// Sentinel index for the ad-free HLS player; kept out of `servers` so iframe
// server indices and saved preferences stay stable.
export const AD_FREE_SERVER = -1;
export const AD_FREE_LABEL = "Scenic+";
// Env-driven so Scenic+ can be toggled per environment. Defaults off.
export const AD_FREE_ENABLED = process.env.REACT_APP_ADFREE_ENABLED === "true";

export const server8Domains = (process.env.REACT_APP_SERVER8_DOMAINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const SOURCE_NAMES = [
  "Nova", "Pulse", "Orbit", "Comet", "Prime", "Apex", "Vega", "Vortex",
  "Onyx", "Titan", "Helix", "Prism", "Flux", "Photon", "Cosmos", "Halo",
];

// Scenic+ player subtitle appearance options.
export const SUB_FONTS = ["Arial", "Roboto", "Trebuchet MS", "Verdana", "Courier New"];
export const SUB_WEIGHTS = [
  { v: 400, l: "Regular" },
  { v: 700, l: "Bold" },
  { v: 800, l: "Extra Bold" },
];
export const SUB_COLORS = ["#ffffff", "#f5e050", "#5bd1d1", "#b8b8b8"];
export const SUB_STROKES = ["#000000", "#ffffff", "#f5e050", "#5bd1d1"];
export const SUB_DEFAULTS = {
  family: "Trebuchet MS",
  weight: 400,
  color: "#ffffff",
  stroke: "#000000",
  size: 100,
  strokeWidth: 2, // px outline
  background: 0, // 0-100 % opacity behind text
  position: 10, // % up from the bottom
};

// Language code -> [display name, flag] for the captions list.
export const SUB_LANGUAGES = {
  en: ["English", "🇺🇸"], es: ["Spanish", "🇪🇸"], "pt-br": ["Portuguese (BR)", "🇧🇷"],
  pt: ["Portuguese", "🇵🇹"], fr: ["French", "🇫🇷"], de: ["German", "🇩🇪"], it: ["Italian", "🇮🇹"],
  nl: ["Dutch", "🇳🇱"], ar: ["Arabic", "🇸🇦"], hi: ["Hindi", "🇮🇳"], ru: ["Russian", "🇷🇺"],
  ja: ["Japanese", "🇯🇵"], ko: ["Korean", "🇰🇷"], "zh-cn": ["Chinese", "🇨🇳"], "zh-tw": ["Chinese (TW)", "🇹🇼"],
  tr: ["Turkish", "🇹🇷"], pl: ["Polish", "🇵🇱"], sv: ["Swedish", "🇸🇪"], da: ["Danish", "🇩🇰"],
  fi: ["Finnish", "🇫🇮"], no: ["Norwegian", "🇳🇴"], cs: ["Czech", "🇨🇿"], el: ["Greek", "🇬🇷"],
  he: ["Hebrew", "🇮🇱"], id: ["Indonesian", "🇮🇩"], th: ["Thai", "🇹🇭"], vi: ["Vietnamese", "🇻🇳"],
  ro: ["Romanian", "🇷🇴"], hu: ["Hungarian", "🇭🇺"], uk: ["Ukrainian", "🇺🇦"], fa: ["Persian", "🇮🇷"],
};
