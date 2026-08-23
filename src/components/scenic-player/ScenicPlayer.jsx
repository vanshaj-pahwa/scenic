import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import apiConfig from "../../api/apiConfig";
import tmdbApi from "../../api/tmdbApi";
import Subtitles from "./Subtitles";
import { SUB_DEFAULTS, SOURCE_NAMES } from "../../constants/constants";
import { strokeCss, hexToRgba, cueLines } from "./subtitleStyle";
import { playbackProgress, progressKey } from "../../utils/playbackProgress";
import { watchedEpisodes } from "../../utils/watchedEpisodes";
import { continueWatching } from "../../utils/continueWatching";
import "./scenic-player.scss";


const S = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />
);

const Ic = {
  play: <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.87l11-6.8a1 1 0 0 0 0-1.74l-11-6.8A1 1 0 0 0 8 5.2Z" /></svg>,
  pause: <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true"><rect x="6.5" y="3.5" width="4" height="17" rx="1.4" /><rect x="13.5" y="3.5" width="4" height="17" rx="1.4" /></svg>,
  back10: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <g transform="translate(12 12) scale(0.9) translate(-12 -12)">
        <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
        <text x="12" y="16" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor">10</text>
      </g>
    </svg>
  ),
  fwd10: (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true">
      <g transform="translate(12 12) scale(0.9) translate(-12 -12)">
        <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
        <text x="12" y="16" fontSize="7" fontWeight="700" textAnchor="middle" fill="currentColor">10</text>
      </g>
    </svg>
  ),
  volHigh: <S><path d="M3 8.5v7h4l6 5V3.5L7 8.5H3Z" fill="currentColor" stroke="none" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19.5 5.5a9 9 0 0 1 0 13" /></S>,
  volLow: <S><path d="M3 8.5v7h4l6 5V3.5L7 8.5H3Z" fill="currentColor" stroke="none" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></S>,
  volMute: <S><path d="M3 8.5v7h4l6 5V3.5L7 8.5H3Z" fill="currentColor" stroke="none" /><path d="m17 9.5 4 4M21 9.5l-4 4" /></S>,
  cc: <S><rect x="2.5" y="3.5" width="19" height="17" rx="4" /><path d="M10 9.8a2.9 2.9 0 1 0 0 4.4" /><path d="M17 9.8a2.9 2.9 0 1 0 0 4.4" /></S>,
  gear: <S strokeWidth="2.45"><g transform="translate(12 12) scale(0.82) translate(-12 -12)"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></g></S>,
  pip: <S><rect x="2.5" y="3.5" width="19" height="17" rx="3.5" /><rect x="11.5" y="11" width="8" height="6.5" rx="1.5" fill="currentColor" stroke="none" /></S>,
  full: <S><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" /></S>,
  exit: <S><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M16 21v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></S>,
  alert: <S><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></S>,
  kbd: <S><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M6 9.6h.01M9.5 9.6h.01M13 9.6h.01M16.5 9.6h.01M6 13h.01M18 13h.01M9 13h6" /></S>,
  server: <S><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></S>,
  chevron: <S><path d="M6 9l6 6 6-6" /></S>,
  sun: <S><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></S>,
  spinner: <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className="scenic-player__spin" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.22)" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>,
};

const fmtTime = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
};

// Prefer an English audio track when the source defaults to another language.
const preferredAudio = (tracks) => {
  const en = tracks.findIndex((t) => /^en/i.test(t.lang || t.name || ""));
  return en >= 0 ? en : -1;
};

const ScenicPlayer = ({ media, title, subtitle, onFatal, onNext, hasNext }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const hideTimer = useRef(null);
  const volRef = useRef(null);
  const touchRef = useRef(null);
  const swipeConsumed = useRef(false);
  const gestureTimer = useRef(null);
  // Kept in refs so the once-mounted event/keyboard effects read fresh values.
  const mediaRef = useRef(media);
  const hasNextRef = useRef(hasNext);
  const onNextRef = useRef(onNext);
  const lastSaveRef = useRef(0);
  const didResumeRef = useRef(false);
  const markedRef = useRef(false);
  const tapRef = useRef(null); // { time, side } for double-tap seek
  const singleTapTimer = useRef(null);
  const failedRef = useRef({}); // { [src]: true } sources that failed to play
  const sourceListRef = useRef([]); // mirror of sourceList for the once-mounted effects
  const activeSubRef = useRef(null); // mirror of activeSub so toggleFullscreen stays non-reactive
  mediaRef.current = media;
  hasNextRef.current = hasNext;
  onNextRef.current = onNext;

  // Friendly name for a source index, by its position in the resolved list.
  const nameOf = useCallback((src) => {
    const i = sourceListRef.current.findIndex((s) => s.src === src);
    return i >= 0 ? SOURCE_NAMES[i] || `Source ${i + 1}` : "";
  }, []);

  // Choose the next source to try on failure, preferring direct-play sources
  // (catalog HLS + MP4) over proxied HLS so we don't route video through our
  // functions (Fast Origin Transfer) unless nothing direct is left. Falls back
  // to the server-suggested index while the full list is still loading.
  const pickNextSrc = useCallback((serverNext) => {
    const list = sourceListRef.current;
    const failed = failedRef.current;
    if (list && list.length) {
      const avail = list.filter((s) => !failed[s.src]);
      const direct = avail.filter((s) => s.direct).map((s) => s.src);
      const proxied = avail.filter((s) => !s.direct).map((s) => s.src);
      const nx = [...direct, ...proxied][0];
      if (nx != null) return nx;
    }
    return serverNext != null && !failed[serverNext] ? serverNext : null;
  }, []);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [started, setStarted] = useState(false);

  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto
  const [activeHeight, setActiveHeight] = useState(0); // resolution actually playing
  const [extSubs, setExtSubs] = useState([]); // {lang, label, url} from the source
  const [activeSub, setActiveSub] = useState(null); // {key, url, lang, label} | null
  activeSubRef.current = activeSub;
  const [cueText, setCueText] = useState(""); // current subtitle text (custom overlay)
  const [subStyle, setSubStyle] = useState(() => {
    try {
      return { ...SUB_DEFAULTS, ...JSON.parse(localStorage.getItem("scenic:substyle") || "{}") };
    } catch {
      return SUB_DEFAULTS;
    }
  });
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudio, setCurrentAudio] = useState(-1);
  const fileRef = useRef(null);

  const [menu, setMenu] = useState(null); // null | 'settings' | 'cc'
  const [isFs, setIsFs] = useState(false);
  const [hover, setHover] = useState(null); // { pct, time } while scrubbing
  const [brightness, setBrightness] = useState(1); // CSS-simulated screen brightness
  const [gesture, setGesture] = useState(null); // { mode, pct } during a touch swipe
  const [backdrop, setBackdrop] = useState(""); // TMDB backdrop shown while not playing
  const [countdown, setCountdown] = useState(null); // seconds until autoplay-next, or null
  const [showHelp, setShowHelp] = useState(false); // keyboard shortcuts overlay
  const [seekFx, setSeekFx] = useState(null); // { side, amount } double-tap seek ripple
  const [pendingName, setPendingName] = useState(""); // name of the source being switched to
  // The source list is taller than the menu, and people were missing the items
  // past the fold. Tracks whether the list is scrolled to the bottom so the
  // "more below" edge fade can turn itself off once there genuinely is no more.
  const [srcAtEnd, setSrcAtEnd] = useState(true);
  const srcListRef = useRef(null);
  const [sourceList, setSourceList] = useState([]); // [{src, type, subs}] all available sources
  sourceListRef.current = sourceList;
  const [srcIdx, setSrcIdx] = useState(0); // which ordered source to resolve (0 = primary)
  const [switching, setSwitching] = useState(false); // falling back to another source

  // A new title starts from the primary source again.
  useEffect(() => {
    setSrcIdx(0);
    setSwitching(false);
    setCountdown(null);
    failedRef.current = {};
    setSourceList([]);
    setPendingName("");
    didResumeRef.current = false;
    markedRef.current = false;
  }, [media?.type, media?.id, media?.season, media?.episode]);

  // Load the full source list in the background so the picker shows every
  // available server at once (playback isn't blocked on this).
  useEffect(() => {
    if (!media?.id) return undefined;
    let alive = true;
    const params = new URLSearchParams({ type: media.type || "movie", id: String(media.id) });
    if (media.type === "tv") {
      params.set("season", String(media.season));
      params.set("episode", String(media.episode));
    }
    fetch(`/api/sources?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setSourceList(Array.isArray(d.sources) ? d.sources : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [media?.type, media?.id, media?.season, media?.episode]);

  // Fetch the stream URL from /api/stream, then attach hls.js. On resolve or
  // playback failure, fall through to the next source (`next`) with a loader.
  useEffect(() => {
    if (!media?.id) return undefined;
    let cancelled = false;
    setStatus("loading");
    setStarted(false);

    const params = new URLSearchParams({ type: media.type || "movie", id: String(media.id), src: String(srcIdx) });
    if (media.type === "tv") {
      params.set("season", String(media.season));
      params.set("episode", String(media.episode));
    }

    const video = videoRef.current;
    const nextRef = { current: null };
    let watchdog = null;
    // Seek to the stored position for this title once, when playback is ready.
    const resume = () => {
      if (didResumeRef.current) return;
      didResumeRef.current = true;
      const saved = playbackProgress.get(progressKey(mediaRef.current));
      if (saved && saved.time > 5 && (!saved.duration || saved.time < saved.duration - 15)) {
        try { video.currentTime = saved.time; } catch { /* ignore */ }
      }
    };
    const fallback = () => {
      if (cancelled) return;
      clearTimeout(watchdog);
      // A source that resolved but couldn't play is marked unavailable so the
      // dropdown can show it dimmed.
      failedRef.current[srcIdx] = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      const nx = pickNextSrc(nextRef.current);
      if (nx != null) {
        setSwitching(true);
        setPendingName(nameOf(nx));
        setSrcIdx(nx);
      } else {
        setErrorMsg("No ad-free source found for this title.");
        setStatus("error");
      }
    };

    const attach = (url, kind) => {
      // No crossOrigin: stream hosts (MP4/HLS) send no CORS headers, and every
      // subtitle track is proxied same-origin, so cues load either way. Setting
      // crossOrigin="anonymous" here would break same-origin track cues on HLS.
      video.crossOrigin = null;
      // Direct progressive MP4 (the browser range-requests it, no proxy).
      if (kind === "mp4") {
        setLevels([]);
        setAudioTracks([]);
        setCurrentAudio(-1);
        // Don't gate on canPlayType — it's unreliable for HEVC (Chromium and
        // Safari both report "" for encodes they actually decode). Attach and let
        // real decode decide: a playable encode fires `loadeddata` (a decoded
        // frame); one the browser can't decode fires `error`, and the watchdog
        // falls through to the next source if neither happens.
        // If a prior HLS source left hls.js/MSE on the element, destroy it and
        // set src before load() so the media-load algorithm re-runs cleanly.
        if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
        watchdog = setTimeout(() => { if (!cancelled) fallback(); }, 12000);
        video.src = url;
        video.load();
        // Wait for a decoded frame (loadeddata), not just parsed metadata: an
        // undecodable encode fires loadedmetadata but never loadeddata, so this
        // keeps the watchdog armed until the source is genuinely playable.
        video.addEventListener("loadeddata", () => {
          if (cancelled) return;
          clearTimeout(watchdog);
          setActiveHeight(video.videoHeight || 0);
          setStatus("ready");
          setSwitching(false);
          resume();
          video.play().catch(() => {});
        }, { once: true });
        video.addEventListener("error", () => {
          if (cancelled) return;
          clearTimeout(watchdog);
          fallback();
        }, { once: true });
        return;
      }
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startFragPrefetch: true,
          maxBufferLength: 30,
          backBufferLength: 30,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        // Some mirror encodes resolve fine but the browser can't decode them:
        // hls emits non-fatal append errors forever and nothing ever buffers.
        // Watch for "no data appended" and fall through to the next encode.
        let appended = false;
        let appendFails = 0;
        watchdog = setTimeout(() => { if (!cancelled && !appended) fallback(); }, 12000);
        hls.on(Hls.Events.BUFFER_APPENDED, () => { appended = true; clearTimeout(watchdog); });

        hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
          if (cancelled) return;
          setLevels(data.levels || []);
          const at = (hls.audioTracks || []).map((t, i) => ({ id: i, name: t.name || t.lang || `Audio ${i + 1}` }));
          setAudioTracks(at);
          const pref = preferredAudio(hls.audioTracks || []);
          if (pref >= 0) { hls.audioTrack = pref; setCurrentAudio(pref); }
          else setCurrentAudio(hls.audioTrack);
          setStatus("ready");
          setSwitching(false);
          resume();
          video.play().catch(() => {});
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => {
          setCurrentLevel(hls.autoLevelEnabled ? -1 : d.level);
          setActiveHeight(hls.levels?.[d.level]?.height || 0);
        });
        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_e, d) => setCurrentAudio(d.id));

        hls.on(Hls.Events.ERROR, (_e, data) => {
          const D = Hls.ErrorDetails;
          // Undecodable encode: repeated append errors before any data buffered.
          if (!appended && (data.details === D.BUFFER_APPEND_ERROR || data.details === D.BUFFER_APPENDING_ERROR)) {
            if (++appendFails >= 3 && nextRef.current != null) { fallback(); return; }
          }
          if (!data.fatal) return;
          const manifestDead =
            data.details === D.MANIFEST_LOAD_ERROR ||
            data.details === D.MANIFEST_LOAD_TIMEOUT ||
            data.details === D.MANIFEST_PARSING_ERROR;
          // Unreachable/broken manifest with an encode left → try the next one.
          if (manifestDead && nextRef.current != null) { fallback(); return; }
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else if (nextRef.current != null) { fallback(); }
          else { setErrorMsg("Playback failed for this title."); setStatus("error"); }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS.
        video.src = url;
        video.addEventListener("loadedmetadata", () => { setStatus("ready"); setSwitching(false); resume(); video.play().catch(() => {}); }, { once: true });
      } else {
        setErrorMsg("Your browser can't play this stream."); setStatus("error");
      }
    };

    fetch(`/api/stream?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        nextRef.current = data?.next ?? null;
        if (!data?.url) { fallback(); return; }
        setExtSubs(Array.isArray(data.subtitles) ? data.subtitles : []);
        attach(data.url, data.type);
      })
      .catch(() => {
        if (cancelled) return;
        fallback();
      });

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [media?.type, media?.id, media?.season, media?.episode, srcIdx, nameOf, pickNextSrc]);

  // TMDB backdrop, shown behind the video while loading/buffering/paused.
  useEffect(() => {
    if (!media?.id) return undefined;
    let alive = true;
    setBackdrop("");
    const cate = media.type === "tv" ? "tv" : "movie";
    // Route through tmdbApi so the key stays server-side via the /api/tmdb
    // proxy in prod; a direct api.themoviedb.org call has no key there and 401s.
    tmdbApi
      .detail(cate, media.id, { params: {} })
      .then((d) => {
        if (alive && d?.backdrop_path) setBackdrop(apiConfig.w1280Image(d.backdrop_path));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [media?.type, media?.id]);

  useEffect(() => { setActiveSub(null); }, [media?.type, media?.id, media?.season, media?.episode]);
  // Turn subtitles off when the source changes — a different server won't carry
  // the same track, and the media reload resets it anyway.
  useEffect(() => { setActiveSub(null); setCueText(""); }, [srcIdx]);
  useEffect(() => {
    try { localStorage.setItem("scenic:substyle", JSON.stringify(subStyle)); } catch { /* ignore */ }
  }, [subStyle]);

  // We render subtitles ourselves (::cue is styled unreliably by browsers), so
  // keep the chosen track "hidden" (still fires cues) and mirror its text.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) { setCueText(""); return undefined; }
    let track = null;
    const attach = () => {
      Array.from(v.textTracks).forEach((t) => { t.mode = "disabled"; });
      track = activeSub ? Array.from(v.textTracks).find((t) => t.label === activeSub.label) : null;
      if (track) {
        track.mode = "hidden";
        track.addEventListener("cuechange", onCue);
        onCue();
      } else {
        setCueText("");
      }
    };
    const onCue = () => {
      const cues = track ? Array.from(track.activeCues || []) : [];
      setCueText(cues.map((c) => c.text).join("\n"));
    };
    const id = setTimeout(attach, 0);
    return () => {
      clearTimeout(id);
      if (track) track.removeEventListener("cuechange", onCue);
    };
  }, [activeSub]);

  const goNext = useCallback(() => {
    setCountdown(null);
    if (hasNextRef.current && onNextRef.current) onNextRef.current();
  }, []);

  const syncSrcAtEnd = useCallback(() => {
    const el = srcListRef.current;
    if (!el) return;
    setSrcAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
  }, []);

  // On open, bring the active source into view — with 16 sources, someone on
  // Cosmos would otherwise open the menu at the top and have to hunt for the
  // row they're already on.
  useEffect(() => {
    if (menu !== "source") return;
    const el = srcListRef.current;
    if (!el) return;
    el.querySelector(".sel")?.scrollIntoView({ block: "nearest" });
    syncSrcAtEnd();
  }, [menu, syncSrcAtEnd]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    // Mark a TV episode watched (adds the tick) once, near the end.
    const markEpisodeWatched = () => {
      if (markedRef.current) return;
      markedRef.current = true;
      const m = mediaRef.current;
      if (m?.type === "tv" && m.id != null) watchedEpisodes.markWatched(String(m.id), m.season, m.episode);
    };
    const onTime = () => {
      setCurrent(v.currentTime);
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
      if (v.duration && v.currentTime / v.duration > 0.9) markEpisodeWatched();
      const now = Date.now();
      if (now - lastSaveRef.current > 5000 && v.currentTime > 5) {
        lastSaveRef.current = now;
        playbackProgress.save(progressKey(mediaRef.current), v.currentTime, v.duration);
      }
    };
    const onDur = () => setDuration(v.duration || 0);
    const onPlay = () => { setPlaying(true); setStarted(true); };
    const onPause = () => {
      setPlaying(false);
      if (v.currentTime > 5) playbackProgress.save(progressKey(mediaRef.current), v.currentTime, v.duration);
    };
    const onVol = () => { setMuted(v.muted); setVolume(v.volume); };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    // End of title: finished, so clear resume, tick the episode, offer next.
    // A finished movie (or the final episode of a series) drops off Continue
    // Watching; a series with more episodes stays and autoplays the next one.
    const onEnded = () => {
      const m = mediaRef.current;
      playbackProgress.clear(progressKey(m));
      markEpisodeWatched();
      if (m?.id == null) return;
      if (m.type === "tv") {
        if (hasNextRef.current && onNextRef.current) setCountdown(10);
        else continueWatching.remove(m.id, "tv");
      } else {
        continueWatching.remove(m.id, "movie");
      }
    };

    v.addEventListener("timeupdate", onTime);
    v.addEventListener("durationchange", onDur);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("ended", onEnded);
    return () => {
      if (v.currentTime > 5 && v.duration && v.currentTime < v.duration - 15) {
        playbackProgress.save(progressKey(mediaRef.current), v.currentTime, v.duration);
      }
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("durationchange", onDur);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  // Autoplay-next countdown tick.
  useEffect(() => {
    if (countdown == null) return undefined;
    if (countdown <= 0) { goNext(); return undefined; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, goNext]);

  useEffect(() => {
    if (status === "error" && onFatal) onFatal(errorMsg);
  }, [status, errorMsg, onFatal]);

  useEffect(() => {
    const onFs = () => {
      const fs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFs(fs);
      if (!fs) {
        try {
          window.screen?.orientation?.unlock?.();
        } catch {
          /* ignore */
        }
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    // iOS native <video> fullscreen fires these on the element, not `document`.
    const v = videoRef.current;
    const onBegin = () => setIsFs(true);
    const onEnd = () => {
      setIsFs(false);
      // Revert any track we flipped to "showing" for the native player so our
      // own overlay resumes and cues aren't rendered twice.
      Array.from(v?.textTracks || []).forEach((t) => {
        if (t.mode === "showing") t.mode = "hidden";
      });
    };
    v?.addEventListener("webkitbeginfullscreen", onBegin);
    v?.addEventListener("webkitendfullscreen", onEnd);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
      v?.removeEventListener("webkitbeginfullscreen", onBegin);
      v?.removeEventListener("webkitendfullscreen", onEnd);
    };
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekBy = useCallback((delta) => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
  }, []);

  const adjustVolume = useCallback((delta) => {
    const v = videoRef.current;
    if (!v) return;
    const nv = Math.min(1, Math.max(0, (v.muted ? 0 : v.volume) + delta));
    v.volume = nv;
    v.muted = nv === 0;
  }, []);

  // Toggle captions between off and the first source track (keyboard 'c').
  const toggleCaptions = useCallback(() => {
    setActiveSub((cur) => {
      if (cur) return null;
      const s = extSubs[0];
      return s ? { key: "src-0", url: s.url, lang: s.lang || "en", label: s.label || "Subtitle 1" } : cur;
    });
  }, [extSubs]);

  // Manual source switch. Auto-fallback still runs until a source plays; this
  // lets the user jump straight to any resolved source (e.g. for 4K/subs), or
  // discover the next one.
  const jumpToSource = useCallback(
    (target) => {
      if (target == null || target === srcIdx) { setMenu(null); return; }
      setPendingName(nameOf(target));
      setSwitching(true);
      setMenu(null);
      setSrcIdx(target);
    },
    [srcIdx, nameOf]
  );


  const seekTo = (e) => {
    const v = videoRef.current;
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
    if (v && v.duration) v.currentTime = pct * v.duration;
  };

  const onScrubHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
    setHover({ pct, time: pct * (duration || 0) });
  };

  const toggleMute = () => { const v = videoRef.current; if (v) v.muted = !v.muted; };

  const setVolFromX = (clientX) => {
    const el = volRef.current;
    const v = videoRef.current;
    if (!el || !v) return;
    const r = el.getBoundingClientRect();
    const pct = Math.min(Math.max(0, (clientX - r.left) / r.width), 1);
    v.volume = pct;
    v.muted = pct === 0;
  };

  const onVolPointerDown = (e) => {
    e.preventDefault();
    setVolFromX(e.clientX);
    const move = (ev) => setVolFromX(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Mobile touch:
  //  • vertical swipe (fullscreen only) — left half = volume, right half = brightness
  //  • double-tap left / right thirds — seek ∓10s
  //  • double-tap centre — toggle fullscreen (works in and out of fullscreen)
  //  • single tap — reveal controls (fullscreen) or play/pause (windowed)
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const isRight = t.clientX - rect.left > rect.width / 2;
    // Swipe adjust is fullscreen-only (so it doesn't hijack page scroll in the
    // modal) and never on the bottom control strip.
    const swipe = isFs && t.clientY <= rect.bottom - 72;
    touchRef.current = {
      startY: t.clientY,
      startX: t.clientX,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      target: e.target,
      swipe,
      mode: isRight ? "brightness" : "volume",
      startVal: isRight ? brightness : muted ? 0 : volume,
      moved: false,
    };
  };

  const onTouchMove = (e) => {
    const st = touchRef.current;
    if (!st || e.touches.length !== 1) return;
    const dy = st.startY - e.touches[0].clientY;
    if (!st.swipe) {
      // Windowed / control strip: any real movement is a scroll, so cancel the
      // pending tap rather than adjusting volume/brightness.
      const dx = e.touches[0].clientX - st.startX;
      if (Math.abs(dy) > 12 || Math.abs(dx) > 12) st.moved = true;
      return;
    }
    if (!st.moved && Math.abs(dy) < 10) return;
    st.moved = true;
    const min = st.mode === "brightness" ? 0.2 : 0;
    const val = Math.min(1, Math.max(min, st.startVal + dy / (st.height * 0.6)));
    if (st.mode === "volume") {
      const v = videoRef.current;
      if (v) { v.volume = val; v.muted = val === 0; }
    } else {
      setBrightness(val);
    }
    setGesture({ mode: st.mode, pct: Math.round(val * 100) });
  };

  const onTouchEnd = () => {
    const st = touchRef.current;
    touchRef.current = null;
    clearTimeout(gestureTimer.current);
    gestureTimer.current = setTimeout(() => setGesture(null), 500);
    if (!st) return;
    if (st.moved) { if (st.swipe) swipeConsumed.current = true; return; }
    // Only the video/empty area is a "player tap" — let real controls (buttons,
    // menus) receive their own touches untouched.
    const tgt = st.target;
    if (tgt && tgt !== containerRef.current && tgt.tagName !== "VIDEO") return;
    swipeConsumed.current = true; // suppress the container's click-to-toggle
    const rel = st.startX - st.left;
    const side = rel < st.width * 0.35 ? "left" : rel > st.width * 0.65 ? "right" : "center";
    const now = Date.now();
    const prev = tapRef.current;
    if (prev && now - prev.time < 300 && prev.side === side) {
      clearTimeout(singleTapTimer.current);
      tapRef.current = null;
      if (side === "center") {
        toggleFullscreen();
      } else {
        const amount = side === "right" ? 10 : -10;
        seekBy(amount);
        setSeekFx({ side, amount, id: now });
        setTimeout(() => setSeekFx((f) => (f && f.id === now ? null : f)), 550);
      }
    } else {
      tapRef.current = { time: now, side };
      clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(() => {
        if (isFs) showControls();
        else togglePlay();
        tapRef.current = null;
      }, 280);
    }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    const v = videoRef.current;
    try {
      // Already fullscreen (standard or WebKit desktop) → exit.
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
        return;
      }
      // Standard element Fullscreen API — Android Chrome, desktop, etc.
      if (el?.requestFullscreen) {
        await el.requestFullscreen();
        // Rotate to landscape on mobile; unsupported on desktop/iOS (ignored).
        try {
          await window.screen?.orientation?.lock?.("landscape");
        } catch {
          /* orientation lock not available */
        }
        return;
      }
      if (el?.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
        return;
      }
      // iOS (Safari/Chrome/all WebKit): elements can't go fullscreen, only the
      // <video> can via its own native player. Push the active subtitle track to
      // "showing" so cues still appear inside Apple's player (we normally render
      // them ourselves); webkitendfullscreen reverts it.
      if (v?.webkitEnterFullscreen && v.webkitSupportsFullscreen !== false) {
        const sub = activeSubRef.current;
        if (sub) {
          const t = Array.from(v.textTracks || []).find((x) => x.label === sub.label);
          if (t) t.mode = "showing";
        }
        v.webkitEnterFullscreen();
      }
    } catch {
      /* fullscreen not available */
    }
  };

  const togglePip = async () => {
    const v = videoRef.current;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (v?.requestPictureInPicture) await v.requestPictureInPicture();
    } catch { /* ignore */ }
  };

  const pickQuality = (lvl) => {
    if (hlsRef.current) hlsRef.current.currentLevel = lvl;
    setCurrentLevel(lvl);
    if (lvl >= 0 && levels[lvl]) setActiveHeight(levels[lvl].height);
    setMenu(null);
  };
  const pickAudio = (id) => {
    if (hlsRef.current) hlsRef.current.audioTrack = id;
    setCurrentAudio(id);
    setMenu(null);
  };
  const selectSub = (sub) => { setActiveSub(sub); setMenu(null); };
  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let text = String(reader.result || "");
      if (!/^﻿?WEBVTT/.test(text.trimStart())) {
        text = "WEBVTT\n\n" + text.replace(/\r+/g, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
      }
      const url = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
      selectSub({ key: `up-${file.name}`, url, lang: "und", label: `Uploaded · ${file.name}` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "Escape") { if (showHelp) setShowHelp(false); return; }
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "ArrowLeft": case "j": seekBy(-10); break;
        case "ArrowRight": case "l": seekBy(10); break;
        case "ArrowUp": e.preventDefault(); adjustVolume(0.1); break;
        case "ArrowDown": e.preventDefault(); adjustVolume(-0.1); break;
        case "f": toggleFullscreen(); break;
        case "m": toggleMute(); break;
        case "c": toggleCaptions(); break;
        case "n": goNext(); break;
        case "?": setShowHelp((h) => !h); break;
        default: return;
      }
      showControls();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, showControls, adjustVolume, toggleCaptions, goNext, showHelp]);

  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;
  const qualityTag = activeHeight >= 2160 ? "4K" : activeHeight >= 720 ? "HD" : "";
  const paused = started && !playing && !buffering && status === "ready";
  const showBackdrop = !!backdrop && (status === "loading" || buffering || !started);
  const showNowWatching = status === "ready" && !buffering && (!started || paused);
  const activeName = nameOf(srcIdx);
  const isTvEp = media?.type === "tv" && media?.season != null;
  const epTag = isTvEp ? `${title} · S${media.season}:E${media.episode}` : title;
  // Pause-card metadata: TV shows season/episode + episode title + synopsis;
  // movies show the year + synopsis.
  const nwMeta = isTvEp ? `Season ${media.season}: Episode ${media.episode}` : media?.year || "";
  const nwName = isTvEp && media?.episodeName && media.episodeName !== `Episode ${media.episode}` ? media.episodeName : "";
  const nwDesc = isTvEp ? media?.episodeOverview || "" : media?.overview || "";

  return (
    <div
      ref={containerRef}
      className={`scenic-player${controlsVisible || !playing || menu ? " controls-on" : ""}`}
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={(e) => {
        if (swipeConsumed.current) { swipeConsumed.current = false; return; }
        if (e.target === e.currentTarget || e.target.tagName === "VIDEO") togglePlay();
      }}
    >
      <video
        ref={videoRef}
        className="scenic-player__video"
        playsInline
        poster={backdrop || undefined}
        style={{ filter: `brightness(${brightness})` }}
      >
        {activeSub && (
          <track
            key={activeSub.key}
            kind="subtitles"
            src={activeSub.url}
            srcLang={activeSub.lang}
            label={activeSub.label}
          />
        )}
      </video>

      {/* Custom subtitle overlay — full control, no ::cue quirks */}
      {cueText && (
        <div className="scenic-player__cue" style={{ bottom: `${subStyle.position}%`, fontSize: `${(4.6 * subStyle.size) / 100}cqh` }}>
          {cueLines(cueText).map((line, i) => (
            <span
              key={i}
              className="scenic-player__cue-line"
              style={{
                fontFamily: `'${subStyle.family}', sans-serif`,
                fontWeight: subStyle.weight,
                color: subStyle.color,
                background: hexToRgba("#000000", subStyle.background / 100),
                textShadow: strokeCss(subStyle.stroke, subStyle.strokeWidth),
              }}
            >
              {line}
            </span>
          ))}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".srt,.vtt,text/plain"
        style={{ display: "none" }}
        onChange={onUpload}
      />

      {/* Backdrop behind the video while there's no frame (loading/buffering) */}
      {showBackdrop && (
        <div
          className="scenic-player__backdrop"
          style={{ backgroundImage: `url(${backdrop})` }}
          aria-hidden="true"
        />
      )}

      {/* Netflix-style dim over the paused frame */}
      {paused && <div className="scenic-player__pause-dim" aria-hidden="true" />}

      {/* "You're Watching" card — before start and while paused */}
      {showNowWatching && (
        <div className={`scenic-player__nowwatching${paused ? " is-paused" : ""}`}>
          <span className="scenic-player__nw-eyebrow">You're watching</span>
          <strong>{title}</strong>
          {nwMeta && <span className="scenic-player__nw-se">{nwMeta}</span>}
          {nwName && <span className="scenic-player__nw-epname">{nwName}</span>}
          {nwDesc && <p className="scenic-player__nw-desc">{nwDesc}</p>}
        </div>
      )}

      {/* Netflix-style "Paused" tag, bottom-right */}
      {paused && <span className="scenic-player__paused-tag">Paused</span>}

      {/* Title over the backdrop while the stream is loading */}
      {status === "loading" && (
        <div className="scenic-player__nowwatching">
          <span className="scenic-player__nw-eyebrow">Now Playing</span>
          <strong>{epTag}</strong>
        </div>
      )}

      {/* Loading / buffering */}
      {(status === "loading" || buffering) && status !== "error" && (
        <div className="scenic-player__spinner">
          {Ic.spinner}
          {switching && (
            <span className="scenic-player__spinner-note">
              {pendingName ? `Trying ${pendingName}…` : "Trying another source…"}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="scenic-player__error">
          {Ic.alert}
          <p>{errorMsg}</p>
          <span>Switching to another server...</span>
        </div>
      )}

      {/* Source (server) selector — top-left, hidden in fullscreen */}
      {status === "ready" && !isFs && sourceList.length > 0 && (
        <div className="scenic-player__srcwrap" onClick={(e) => e.stopPropagation()}>
          <button
            className={`scenic-player__srcbtn${menu === "source" ? " is-open" : ""}`}
            onClick={() => setMenu(menu === "source" ? null : "source")}
            aria-label="Select source"
          >
            <span className="scenic-player__srcbtn-icon">{Ic.server}</span>
            <span className="scenic-player__srcbtn-name">{activeName || "Source"}</span>
            <span className="scenic-player__srcbtn-chev">{Ic.chevron}</span>
          </button>
          {menu === "source" && (
            <div className={`scenic-player__srcmenu${srcAtEnd ? " is-end" : ""}`}>
              {/* Header sits outside the scroller so it stays put, and carries
                  the total — the count is how you learn the list is long
                  before you start scrolling it. */}
              <div className="scenic-player__srcmenu-title">
                Select source
                <span className="scenic-player__srcmenu-count">{sourceList.length}</span>
              </div>
              <div
                className="scenic-player__srcmenu-list"
                ref={srcListRef}
                onScroll={syncSrcAtEnd}
              >
                {sourceList.map((s, i) => {
                  const active = s.src === srcIdx;
                  const failed = failedRef.current[s.src];
                  return (
                    <button
                      key={s.src}
                      className={`scenic-player__source-item${active ? " sel" : ""}${failed ? " is-failed" : ""}`}
                      onClick={() => jumpToSource(s.src)}
                    >
                      <span className="scenic-player__source-item-name">{SOURCE_NAMES[i] || `Source ${i + 1}`}</span>
                      <span className="scenic-player__source-tags">
                        {active && qualityTag && <em className="is-q">{qualityTag}</em>}
                        {s.subs > 0 && <em>{s.subs} CC</em>}
                        {failed && <em className="is-bad">off</em>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Touch gesture feedback (volume / brightness) */}
      {gesture && (
        <div className={`scenic-player__gesture scenic-player__gesture--${gesture.mode}`}>
          {gesture.mode === "brightness"
            ? Ic.sun
            : gesture.pct === 0 ? Ic.volMute : Ic.volHigh}
          <div className="scenic-player__gesture-bar">
            <span style={{ height: `${gesture.pct}%` }} />
          </div>
          <span className="scenic-player__gesture-val">{gesture.pct}%</span>
        </div>
      )}

      {/* Double-tap seek ripple */}
      {seekFx && (
        <div className={`scenic-player__seekfx scenic-player__seekfx--${seekFx.side}`} aria-hidden="true">
          {seekFx.amount < 0 ? Ic.back10 : Ic.fwd10}
          <span>{Math.abs(seekFx.amount)}s</span>
        </div>
      )}

      {/* Autoplay next episode card */}
      {countdown != null && (
        <div className="scenic-player__nextcard">
          <span className="scenic-player__nextcard-eyebrow">Next episode</span>
          <p className="scenic-player__nextcard-count">Playing in {countdown}s</p>
          <div className="scenic-player__nextcard-actions">
            <button className="scenic-player__nextcard-play" onClick={goNext}>Play now</button>
            <button className="scenic-player__nextcard-cancel" onClick={() => setCountdown(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {showHelp && (
        <div className="scenic-player__help" onClick={() => setShowHelp(false)}>
          <div className="scenic-player__help-panel" onClick={(e) => e.stopPropagation()}>
            <div className="scenic-player__help-head">
              <span>Keyboard shortcuts</span>
              <button onClick={() => setShowHelp(false)} aria-label="Close">{Ic.exit}</button>
            </div>
            <ul>
              <li><kbd>Space</kbd><kbd>K</kbd><span>Play / pause</span></li>
              <li><kbd>J</kbd><kbd>←</kbd><span>Back 10s</span></li>
              <li><kbd>L</kbd><kbd>→</kbd><span>Forward 10s</span></li>
              <li><kbd>↑</kbd><kbd>↓</kbd><span>Volume</span></li>
              <li><kbd>M</kbd><span>Mute</span></li>
              <li><kbd>C</kbd><span>Captions on / off</span></li>
              <li><kbd>F</kbd><span>Fullscreen</span></li>
              {hasNext && <li><kbd>N</kbd><span>Next episode</span></li>}
              <li><kbd>?</kbd><span>This help</span></li>
            </ul>
          </div>
        </div>
      )}

      {/* Big center play button when paused */}
      {status === "ready" && !playing && !buffering && countdown == null && (
        <button className="scenic-player__bigplay" onClick={togglePlay} aria-label="Play">
          {Ic.play}
        </button>
      )}

      {/* Bottom controls */}
      {status === "ready" && (
        <div className="scenic-player__controls" onClick={(e) => e.stopPropagation()}>
          <div
            className="scenic-player__scrub"
            onClick={seekTo}
            onMouseMove={onScrubHover}
            onMouseLeave={() => setHover(null)}
          >
            {hover && (
              <span className="scenic-player__scrub-tip" style={{ left: `${hover.pct * 100}%` }}>
                {fmtTime(hover.time)}
              </span>
            )}
            {hover && <div className="scenic-player__scrub-hover" style={{ width: `${hover.pct * 100}%` }} />}
            <div className="scenic-player__scrub-buffered" style={{ width: `${bufPct}%` }} />
            <div className="scenic-player__scrub-played" style={{ width: `${pct}%` }}>
              <span className="scenic-player__scrub-knob" />
            </div>
          </div>

          <div className="scenic-player__bar">
            <div className="scenic-player__group scenic-player__group--left">
              <button className="scenic-player__play" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                {playing ? Ic.pause : Ic.play}
              </button>
              <button onClick={() => seekBy(-10)} aria-label="Back 10 seconds">{Ic.back10}</button>
              <button onClick={() => seekBy(10)} aria-label="Forward 10 seconds">{Ic.fwd10}</button>

              <div className="scenic-player__volume">
                <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                  {muted || volume === 0 ? Ic.volMute : volume < 0.5 ? Ic.volLow : Ic.volHigh}
                </button>
                <div
                  ref={volRef}
                  className="scenic-player__vol"
                  onPointerDown={onVolPointerDown}
                  role="slider"
                  aria-label="Volume"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((muted ? 0 : volume) * 100)}
                >
                  <div className="scenic-player__vol-fill" style={{ width: `${(muted ? 0 : volume) * 100}%` }}>
                    <span className="scenic-player__vol-knob" />
                  </div>
                </div>
              </div>

              <span className="scenic-player__time">
                {fmtTime(current)} <em>/</em> {fmtTime(duration)}
              </span>
            </div>

            <div className="scenic-player__group scenic-player__group--right">
              <Subtitles
                media={media}
                extSubs={extSubs}
                activeSub={activeSub}
                onSelect={selectSub}
                onOff={() => setActiveSub(null)}
                onUploadClick={() => fileRef.current && fileRef.current.click()}
                menu={menu}
                setMenu={setMenu}
                ccIcon={Ic.cc}
                subStyle={subStyle}
                setSubStyle={setSubStyle}
              />

              <div className="scenic-player__menuwrap">
                <button onClick={() => setMenu(menu === "settings" ? null : "settings")} aria-label="Settings">
                  {Ic.gear}
                  {qualityTag && <span className="scenic-player__hd">{qualityTag}</span>}
                </button>
                {menu === "settings" && (
                  <div className="scenic-player__menu scenic-player__menu--wide">
                    <div className="scenic-player__menu-title">Quality</div>
                    <button className={currentLevel === -1 ? "sel" : ""} onClick={() => pickQuality(-1)}>Auto</button>
                    {levels.map((l, i) => (
                      <button key={i} className={currentLevel === i ? "sel" : ""} onClick={() => pickQuality(i)}>{l.height}p</button>
                    ))}
                    {audioTracks.length > 1 && (
                      <>
                        <div className="scenic-player__menu-title">Audio</div>
                        {audioTracks.map((a) => (
                          <button key={a.id} className={currentAudio === a.id ? "sel" : ""} onClick={() => pickAudio(a.id)}>{a.name}</button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                className="scenic-player__kbd-btn"
                onClick={() => setShowHelp(true)}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (?)"
              >
                {Ic.kbd}
              </button>
              {document.pictureInPictureEnabled && (
                <button onClick={togglePip} aria-label="Picture in picture">{Ic.pip}</button>
              )}
              <button onClick={toggleFullscreen} aria-label="Fullscreen">
                {isFs ? Ic.exit : Ic.full}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenicPlayer;
