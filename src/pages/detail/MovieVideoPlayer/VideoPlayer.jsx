import { useState, useEffect, useCallback, useRef } from "react";
import "./VideoPlayer.scss";
import VideoPlayerModal from "../../../components/video-player-modal/VideoPlayerModal";
import { mirrorCountFor, AD_FREE_SERVER, AD_FREE_ENABLED } from "../../../constants/constants";
import { buildServerUrl } from "../../../utils/serverUrl";
import useDownloadAvailability from "../../../hooks/useDownloadAvailability";

const serverKey = (id) => `scenic:movie-server:${id}`;

const readSavedServer = (id) => {
  // Default to Scenic+ (the ad-free player) when enabled; else Server 1.
  const fallback = AD_FREE_ENABLED ? AD_FREE_SERVER : 0;
  if (!id || typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(serverKey(id));
    if (raw == null) return fallback;
    const n = parseInt(raw, 10);
    // Honor an explicitly saved Scenic+ (-1) only while it's enabled; otherwise
    // default to Server 1 (so an old saved -1 doesn't strand users).
    const min = AD_FREE_ENABLED ? AD_FREE_SERVER : 0;
    return Number.isFinite(n) && n >= min ? n : 0;
  } catch {
    return fallback;
  }
};

const VideoPlayer = ({ id, title, overview, year, shouldOpenPlayer, onPlayerOpen }) => {
  const [selectedServer, setSelectedServer] = useState(() => readSavedServer(id));
  const [serverUrl, setServerUrl] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mirrorRef = useRef(-1);
  const downloadAvailable = useDownloadAvailability("movie", id);

  const handleServerClick = (index) => {
    setSelectedServer(index);
    try {
      if (id) localStorage.setItem(serverKey(id), String(index));
    } catch {
      /* ignore */
    }
    setServerUrl(
      index === AD_FREE_SERVER
        ? ""
        : buildServerUrl({ mediaType: "movie", index, id, mirrorIndex: mirrorRef.current })
    );
  };

  const handleServerSelect = (index) => {
    // Re-picking the same server advances to its next mirror; a different
    // server starts from its first host.
    const count = mirrorCountFor(index);
    if (count) mirrorRef.current = index === selectedServer ? (mirrorRef.current + 1) % count : 0;
    handleServerClick(index);
  };

  const handlePlayButtonClick = useCallback(() => {
    // Resume on the same server the user last picked for this title.
    const idx = readSavedServer(id);
    setServerUrl(
      idx === AD_FREE_SERVER
        ? ""
        : buildServerUrl({ mediaType: "movie", index: idx, id, mirrorIndex: mirrorRef.current })
    );
    setSelectedServer(idx);
    setIsModalOpen(true);
  }, [id]);

  useEffect(() => {
    if (shouldOpenPlayer) {
      handlePlayButtonClick();
      if (onPlayerOpen) {
        onPlayerOpen();
      }
    }
  }, [shouldOpenPlayer, handlePlayButtonClick, onPlayerOpen]);

  return (
    <VideoPlayerModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      serverUrl={serverUrl}
      title={title}
      onServerChange={handleServerSelect}
      selectedServer={selectedServer}
      mirrorCount={mirrorCountFor(selectedServer)}
      mirrorIndex={Math.max(mirrorRef.current, 0) + 1}
      hasPrevious={false}
      hasNext={false}
      streamMedia={{ type: "movie", id, overview, year }}
      download={{ mediaType: "movie", id, title, available: downloadAvailable }}
    />
  );
};

export default VideoPlayer;
