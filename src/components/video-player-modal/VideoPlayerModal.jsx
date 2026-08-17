import React, { useState, useEffect } from "react";
import "./VideoPlayerModal.scss";
import { servers, AD_FREE_SERVER, AD_FREE_LABEL, AD_FREE_ENABLED } from "../../constants/constants";
import DownloadButton from "../download-button/DownloadButton";
import ScenicPlayer from "../scenic-player/ScenicPlayer";

const VideoPlayerModal = ({
  isOpen,
  onClose,
  serverUrl,
  title,
  subtitle,
  onServerChange,
  selectedServer,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  download,
  streamMedia,
  mirrorCount = 0,
  mirrorIndex = 1,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [serverTimedOut, setServerTimedOut] = useState(false);
  const [autoSwitchMsg, setAutoSwitchMsg] = useState("");

  const switchMirror = () => {
    setSpinning(true);
    onServerChange(selectedServer);
    setTimeout(() => setSpinning(false), 550);
  };

  // When the ad-free source fails, quietly advance to the next server instead
  // of dumping the user into the server menu.
  const handleStreamFatal = () => {
    const next = selectedServer === AD_FREE_SERVER ? 0 : selectedServer + 1;
    if (next < servers.length) {
      setAutoSwitchMsg("Scenic+ isn't available for this title. Switching to the next server...");
      onServerChange(next);
    } else {
      setAutoSwitchMsg("No source found. Pick a server above to try another.");
      setDropdownOpen(true);
    }
  };

  useEffect(() => {
    if (!autoSwitchMsg) return undefined;
    const t = setTimeout(() => setAutoSwitchMsg(""), 3500);
    return () => clearTimeout(t);
  }, [autoSwitchMsg]);

  useEffect(() => {
    setIframeLoaded(false);
    setServerTimedOut(false);
  }, [serverUrl]);

  // If the server never finishes loading, assume it's down and prompt a switch.
  useEffect(() => {
    if (!serverUrl || iframeLoaded) return;
    const timer = setTimeout(() => setServerTimedOut(true), 22000);
    return () => clearTimeout(timer);
  }, [serverUrl, iframeLoaded]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      // Clear the inline override (not "unset", which resolves to `visible` and
      // clobbers the stylesheet's `overflow-x: hidden`, letting the fixed header
      // stretch past the viewport and pushing the search button off-screen).
      document.body.style.overflow = "";
      setDropdownOpen(false); // Close dropdown when modal closes
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="video-modal-backdrop" onClick={handleBackdropClick}>
      <div className="video-modal-container">
        <div className="video-modal-header">
          <div className="video-modal-title-section">
            <div className="title-with-nav">
              {hasPrevious && onPrevious && (
                <button className="nav-button" onClick={onPrevious}>
                  <i className="bx bx-chevron-left"></i>
                </button>
              )}
              <div className="title-wrapper">
                <h2 className="video-modal-title">{title}</h2>
                {subtitle && <p className="video-modal-subtitle">{subtitle}</p>}
              </div>
              {hasNext && onNext && (
                <button className="nav-button" onClick={onNext}>
                  <i className="bx bx-chevron-right"></i>
                </button>
              )}
            </div>
          </div>

          <div className="video-modal-controls">
            {download && download.id && (
              <DownloadButton
                mediaType={download.mediaType}
                id={download.id}
                title={download.title}
                season={download.season}
                episode={download.episode}
                available={download.available}
                onDownloaded={onClose}
              />
            )}
            {mirrorCount > 1 && (
              <button
                className={`mirror-switch${spinning ? " is-spinning" : ""}`}
                onClick={switchMirror}
                title="Try another source"
              >
                <i className="bx bx-revision"></i>
                <span className="mirror-switch__label">Try another source</span>
                <span className="mirror-switch__count">
                  {mirrorIndex}/{mirrorCount}
                </span>
              </button>
            )}
            <span className="server-hint">
              {mirrorCount > 1
                ? "If none load, switch server →"
                : "Video not loading? Try changing server →"}
            </span>
            <div className="server-dropdown">
              <button
                className="server-dropdown-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <i className="bx bx-server"></i>
                <span>
                  {selectedServer === AD_FREE_SERVER
                    ? AD_FREE_LABEL
                    : servers[selectedServer] || "Select Server"}
                </span>
                <i
                  className={`bx bx-chevron-down ${dropdownOpen ? "rotate" : ""}`}
                ></i>
              </button>

              {dropdownOpen && (
                <div className="server-dropdown-menu">
                  {AD_FREE_ENABLED && (
                    <div
                      className={`server-option server-option--adfree ${
                        selectedServer === AD_FREE_SERVER ? "active" : ""
                      }`}
                      onClick={() => {
                        onServerChange(AD_FREE_SERVER);
                        setDropdownOpen(false);
                      }}
                    >
                      <span>{AD_FREE_LABEL}</span>
                      {selectedServer === AD_FREE_SERVER && <i className="bx bx-check"></i>}
                    </div>
                  )}
                  {servers.map((server, index) => (
                    <div
                      key={index}
                      className={`server-option ${
                        selectedServer === index ? "active" : ""
                      }`}
                      onClick={() => {
                        onServerChange(index);
                        setDropdownOpen(false);
                      }}
                    >
                      <span>{server}</span>
                      {selectedServer === index && (
                        <i className="bx bx-check"></i>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="close-button" onClick={onClose}>
              <i className="bx bx-x"></i>
            </button>
          </div>

          {mirrorCount > 1 ? (
            <div className="server-hint-mobile server-hint-mobile--stack">
              <button
                type="button"
                className={`mirror-chip${spinning ? " is-spinning" : ""}`}
                onClick={switchMirror}
              >
                <i className="bx bx-revision"></i>
                Try another source ({mirrorIndex}/{mirrorCount})
              </button>
              <span>If none load, tap the "Server" button to switch</span>
            </div>
          ) : (
            <span className="server-hint-mobile">
              Not loading? Tap the "Server" button to switch
            </span>
          )}
        </div>

        <div className="video-modal-player">
          {autoSwitchMsg && (
            <div className="video-modal-toast">
              <i className="bx bx-loader-alt bx-spin"></i>
              <span>{autoSwitchMsg}</span>
            </div>
          )}
          {AD_FREE_ENABLED && selectedServer === AD_FREE_SERVER ? (
            <ScenicPlayer
              media={streamMedia}
              title={title}
              subtitle={subtitle}
              onFatal={handleStreamFatal}
              onNext={onNext}
              hasNext={hasNext}
            />
          ) : (
            <>
              {serverUrl && (
                <iframe
                  src={serverUrl}
                  allowFullScreen
                  // Each feature needs an explicit `*` allowlist. Bare
                  // `fullscreen` defaults to 'src', which is the origin in the
                  // src attribute above — and several embeds redirect
                  // cross-origin on load (vidfast.pro -> vidfast.vc,
                  // vidcore.net -> vidcore.io). Once the frame lands on the new
                  // origin the 'src' grant no longer matches it and fullscreen
                  // is denied, which is why those servers couldn't go
                  // fullscreen while same-origin ones could.
                  allow="autoplay *; encrypted-media *; fullscreen *; picture-in-picture *"
                  title={title}
                  onLoad={() => setIframeLoaded(true)}
                />
              )}
              {serverUrl && !iframeLoaded && serverTimedOut ? (
                <div className="video-modal-timeout">
                  <i className="bx bx-error-circle"></i>
                  <p>This server is taking too long to respond. It might be down right now, so try another one.</p>
                  <button
                    className="video-modal-timeout__action"
                    onClick={() => setDropdownOpen(true)}
                  >
                    Try another source
                  </button>
                </div>
              ) : (
                (!serverUrl || !iframeLoaded) && (
                  <div className="video-modal-loader skeleton" aria-hidden="true">
                    <i className="bx bx-loader-alt bx-spin"></i>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
