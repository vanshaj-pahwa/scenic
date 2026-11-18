import React, { useState, useEffect, useCallback, useRef } from "react";
import "./SeriesVideoPlayer.scss";
import apiConfig from "../../../api/apiConfig";
import tmdbApi from "../../../api/tmdbApi";
import Loading from "../../../components/loading/Loading";
import VideoPlayerModal from "../../../components/video-player-modal/VideoPlayerModal";
import { mirrorCountFor, AD_FREE_SERVER, AD_FREE_ENABLED } from "../../../constants/constants";
import { buildServerUrl } from "../../../utils/serverUrl";
import { watchedEpisodes } from "../../../utils/watchedEpisodes";
import useListboxKeyboard from "../../../hooks/useListboxKeyboard";
import useDownloadAvailability from "../../../hooks/useDownloadAvailability";

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SeriesVideoPlayer = ({
  id,
  series,
  initialSeason,
  initialEpisode,
  autoPlay = false,
  onAutoPlayConsumed,
  onEpisodeClick,
}) => {
  const [selectedServer, setSelectedServer] = useState(AD_FREE_ENABLED ? AD_FREE_SERVER : 0);
  const [serverUrl, setServerUrl] = useState("");
  const mirrorRef = useRef(-1);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tell the parent when the player opens (so it dismisses the banner trailer).
  useEffect(() => {
    if (isModalOpen && onEpisodeClick) onEpisodeClick();
  }, [isModalOpen, onEpisodeClick]);

  // While playing, the selected episode counts as watched (covers card, < >, season change).
  useEffect(() => {
    if (!isModalOpen || !id || !selectedSeason || !selectedEpisode) return;
    const ep = episodes.find((e) => e.episode_number === selectedEpisode);
    const name = ep?.name || "";
    const still = ep?.still_path || null;
    watchedEpisodes.markWatched(id, selectedSeason, selectedEpisode, {
      episodeName: name,
      stillPath: still,
    });
    watchedEpisodes.trackOpen(id, selectedSeason, selectedEpisode, name, still);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, id, selectedSeason, selectedEpisode, episodes]);

  const [watchedSet, setWatchedSet] = useState(
    () => (id ? watchedEpisodes.getSeriesWatched(id) : new Set())
  );
  const dropdownRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const downloadAvailable = useDownloadAvailability(
    "tv",
    id,
    selectedSeason,
    selectedEpisode
  );

  // Keep local watched state in sync with the util so external mutations
  // (e.g. clearing or another tab) reflect here without a remount.
  useEffect(() => {
    if (!id) return undefined;
    const refresh = () => setWatchedSet(watchedEpisodes.getSeriesWatched(id));
    refresh();
    return watchedEpisodes.subscribe(refresh);
  }, [id]);


  useEffect(() => {
    const handleClickOutside = (event) => {
      // if click is NOT inside dropdown button AND NOT inside menu → close it
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Track whether we've already triggered the autoplay handoff so it
  // fires exactly once per arrival from Continue Watching.
  const autoPlayFiredRef = useRef(false);

  // Auto-select the first non-zero season or restore from localStorage
  useEffect(() => {
    if (series?.seasons?.length > 0 && id) {
      const storageKey = `series_${id}_state`;

      // Override from URL when Continue Watching hands off a specific
      // season/episode — these take precedence over any saved state.
      if (Number.isFinite(initialSeason)) {
        setSelectedSeason(initialSeason);
        if (Number.isFinite(initialEpisode)) {
          setSelectedEpisode(initialEpisode);
        }
        // Still try to restore the server from saved state so we resume
        // on the same provider the user last used.
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
          const min = AD_FREE_ENABLED ? AD_FREE_SERVER : 0;
          if (saved && saved.seriesId === id && Number.isFinite(saved.server) && saved.server >= min) {
            setSelectedServer(saved.server);
          }
        } catch {
          /* ignore */
        }
        return;
      }

      const savedState = localStorage.getItem(storageKey);

      if (savedState) {
        try {
          const { season, episode, server, seriesId } = JSON.parse(savedState);

          // Verify that the saved state is for the current series
          if (seriesId === id) {
            setSelectedSeason(season);
            setSelectedEpisode(episode);
            if (Number.isFinite(server) && server >= (AD_FREE_ENABLED ? AD_FREE_SERVER : 0)) {
              setSelectedServer(server);
            }
          } else {
            // Saved state is for a different series, reset to first season
            const first = series.seasons.find((s) => s.season_number !== 0);
            if (first) setSelectedSeason(first.season_number);
          }
        } catch (error) {
          console.error("Error parsing saved state:", error);
          // Fallback to first season if parsing fails
          const first = series.seasons.find((s) => s.season_number !== 0);
          if (first) setSelectedSeason(first.season_number);
        }
      } else {
        // No saved state, select first season
        const first = series.seasons.find((s) => s.season_number !== 0);
        if (first) setSelectedSeason(first.season_number);
      }
    }
  }, [series, id, initialSeason, initialEpisode]);

  // Autoplay handoff from Continue Watching: open the player once the
  // selected season + episode have settled. Fires at most once.
  useEffect(() => {
    if (
      !autoPlay ||
      autoPlayFiredRef.current ||
      selectedSeason == null ||
      selectedEpisode == null
    ) {
      return;
    }
    autoPlayFiredRef.current = true;
    setIsModalOpen(true);
    if (onAutoPlayConsumed) onAutoPlayConsumed();
  }, [autoPlay, selectedSeason, selectedEpisode, onAutoPlayConsumed]);

  const handleServerClick = (index) => {
    setSelectedServer(index);
    setServerUrl(
      index === AD_FREE_SERVER
        ? ""
        : buildServerUrl({
            mediaType: "tv",
            index,
            id,
            season: selectedSeason,
            episode: selectedEpisode,
            mirrorIndex: mirrorRef.current,
          })
    );
  };

  const handleServerSelect = (index) => {
    // Re-picking the same server advances to its next mirror; a different
    // server starts from its first host.
    const count = mirrorCountFor(index);
    if (count) mirrorRef.current = index === selectedServer ? (mirrorRef.current + 1) % count : 0;
    handleServerClick(index);
  };

  useEffect(() => {
    if (selectedServer !== null && selectedEpisode !== null) {
      handleServerClick(selectedServer);
    }
    // eslint-disable-next-line
  }, [selectedEpisode, selectedServer]);


  const fetchEpisodes = useCallback((seasonNum) => {
    setLoadingEpisodes(true);
    tmdbApi.getSeason(id, seasonNum).then((response) => {
      setEpisodes(response.episodes);
      setLoadingEpisodes(false);
    });
  }, [id]);

  const handleSeasonChange = (option) => {
    const season = Number(option.value);
    setSelectedSeason(season);
    setSelectedEpisode(null);
    setEpisodes([]);
    setLoadingEpisodes(true);

    fetchEpisodes(season);
  };

  // Keyboard / D-pad navigation for the custom season dropdown.
  const seasonOptions = (series?.seasons || []).filter(
    (s) => s.season_number !== 0
  );
  const seasonSelectedIndex = seasonOptions.findIndex(
    (s) => s.season_number === selectedSeason
  );
  const activeSeasonRef = useRef(null);
  const {
    highlighted: seasonHighlight,
    setHighlighted: setSeasonHighlight,
    onKeyDown: onSeasonKeyDown,
  } = useListboxKeyboard({
    isOpen: dropdownOpen,
    itemCount: seasonOptions.length,
    selectedIndex: seasonSelectedIndex,
    onOpen: () => setDropdownOpen(true),
    onClose: () => setDropdownOpen(false),
    onChoose: (i) => {
      handleSeasonChange({ value: seasonOptions[i].season_number });
      setDropdownOpen(false);
    },
  });

  useEffect(() => {
    if (dropdownOpen && activeSeasonRef.current) {
      activeSeasonRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [seasonHighlight, dropdownOpen]);

  // Focus the trigger when the menu opens, so arrow keys reach it even on
  // browsers (e.g. TV) that don't focus on click.
  useEffect(() => {
    if (dropdownOpen && dropdownRef.current) dropdownRef.current.focus();
  }, [dropdownOpen]);

  const handleEpisodeClick = (episode_number, episodeName = "", stillPath = null) => {
    setSelectedEpisode(episode_number);
    setIsModalOpen(true);
    // The serverUrl effect below will compute the URL for the current
    // selectedServer once selectedEpisode updates, so we don't need to
    // hard-code server 0 here.
    // Auto-mark as watched on open. User can still toggle off via the
    // explicit check button if they only sampled it.
    if (id) {
      watchedEpisodes.markWatched(id, selectedSeason, episode_number, {
        episodeName,
        stillPath,
      });
      watchedEpisodes.trackOpen(
        id,
        selectedSeason,
        episode_number,
        episodeName,
        stillPath
      );
    }
  };

  // Toggle from the small check chip without triggering play
  const handleToggleWatched = (e, episode_number, episodeName = "", stillPath = null) => {
    e.stopPropagation();
    if (!id) return;
    watchedEpisodes.toggle(id, selectedSeason, episode_number, {
      episodeName,
      stillPath,
    });
  };

  const handlePreviousEpisode = () => {
    if (selectedEpisode > 1) {
      setSelectedEpisode(selectedEpisode - 1);
    } else if (selectedSeason > 1) {
      const prevSeason = selectedSeason - 1;
      setSelectedSeason(prevSeason);
      // Fetch episodes for previous season and select last episode
      tmdbApi.getSeason(id, prevSeason).then((response) => {
        setEpisodes(response.episodes);
        setSelectedEpisode(response.episodes.length);
      });
    }
  };

  const handleNextEpisode = () => {
    if (episodes.length > 0 && selectedEpisode < episodes.length) {
      setSelectedEpisode(selectedEpisode + 1);
    } else if (series?.seasons && selectedSeason < series.seasons.filter(s => s.season_number !== 0).length) {
      const nextSeason = selectedSeason + 1;
      setSelectedSeason(nextSeason);
      setSelectedEpisode(1);
    }
  };

  const hasPreviousEpisode = () => {
    return selectedEpisode > 1 || selectedSeason > 1;
  };

  const hasNextEpisode = () => {
    // Check if there's a next episode in current season
    if (episodes.length > 0 && selectedEpisode < episodes.length) {
      return true;
    }
    // Check if there's a next season
    const totalSeasons = series?.seasons ? series.seasons.filter(s => s.season_number !== 0).length : 0;
    if (selectedSeason < totalSeasons) {
      return true;
    }
    return false;
  };

  const getCurrentEpisodeTitle = () => {
    return series.name || '';
  };

  const getCurrentEpisodeSubtitle = () => {
    const episode = episodes.find(ep => ep.episode_number === selectedEpisode);
    const episodeInfo = episode ? episode.name : '';
    return `S${selectedSeason} • E${selectedEpisode}${episodeInfo ? ` • ${episodeInfo}` : ''}`;
  };

  useEffect(() => {
    if (selectedSeason) fetchEpisodes(selectedSeason);
  }, [selectedSeason, fetchEpisodes]);

  // Save selected series, season, episode and server to localStorage
  useEffect(() => {
    if (selectedSeason !== null && id) {
      const storageKey = `series_${id}_state`;
      const state = {
        seriesId: id,
        season: selectedSeason,
        episode: selectedEpisode,
        server: selectedServer,
      };
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [selectedSeason, selectedEpisode, selectedServer, id]);

  return (
    <React.Fragment>
      {/* Video Player Modal */}
      <VideoPlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        serverUrl={serverUrl}
        title={getCurrentEpisodeTitle()}
        subtitle={getCurrentEpisodeSubtitle()}
        onServerChange={handleServerSelect}
        selectedServer={selectedServer}
        mirrorCount={mirrorCountFor(selectedServer)}
        mirrorIndex={Math.max(mirrorRef.current, 0) + 1}
        onPrevious={handlePreviousEpisode}
        onNext={handleNextEpisode}
        hasPrevious={hasPreviousEpisode()}
        hasNext={hasNextEpisode()}
        streamMedia={{
          type: "tv",
          id,
          season: selectedSeason,
          episode: selectedEpisode,
          episodeName: episodes.find((e) => e.episode_number === selectedEpisode)?.name || "",
          episodeOverview: episodes.find((e) => e.episode_number === selectedEpisode)?.overview || "",
        }}
        download={{
          mediaType: "tv",
          id,
          title: series?.name || series?.original_name,
          season: selectedSeason,
          episode: selectedEpisode,
          available: downloadAvailable,
        }}
      />

      <div>

        {/* SEASON DROPDOWN */}
        {series?.seasons?.length > 0 && (
          <div className="season-container">
            <div className="season-dropdown">
              <div
                ref={dropdownRef}
                className="season-dropdown-selected compact"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                onKeyDown={onSeasonKeyDown}
                tabIndex={0}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
              >
                <span className="label">Season {selectedSeason}</span>

                {dropdownOpen ? (
                  // Chevron Up
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="chevron-icon"
                  >
                    <path d="m18 15-6-6-6 6" />
                  </svg>
                ) : (
                  // Chevron Down
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="chevron-icon"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                )}
              </div>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="season-dropdown-menu" ref={menuRef} role="listbox">
                  {seasonOptions.map((season, index) => (
                    <div
                      key={season.id}
                      ref={index === seasonHighlight ? activeSeasonRef : null}
                      role="option"
                      aria-selected={season.season_number === selectedSeason}
                      className={`season-option${
                        index === seasonHighlight ? " is-active" : ""
                      }`}
                      onMouseEnter={() => setSeasonHighlight(index)}
                      onClick={() => {
                        handleSeasonChange({ value: season.season_number });
                        setDropdownOpen(false);
                      }}
                    >
                      <img
                        src={apiConfig.w500Image(season.poster_path)}
                        alt={season.name}
                      />

                      <div className="info">
                        <h4>Season {season.season_number}</h4>
                        <p>{season.episode_count} episodes</p>
                      </div>

                      <span className="year">
                        {season.air_date?.split("-")[0] || ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EPISODE LOADER */}
            {loadingEpisodes && <Loading size="small" loadingText="Loading episodes..." />}
            {/* EPISODE LIST */}
            {!loadingEpisodes && episodes.length > 0 && (
              <div className="episode-container">
                <div className="episode-container__head">
                  <h3>Episodes</h3>
                  <span className="episode-progress">
                    {episodes.filter((e) =>
                      watchedSet.has(`S${selectedSeason}E${e.episode_number}`)
                    ).length}
                    /{episodes.length} watched
                  </span>
                </div>
                <div className="episode-list">
                  {episodes.map((episode) => {
                    const isWatched = watchedSet.has(
                      `S${selectedSeason}E${episode.episode_number}`
                    );
                    return (
                      <div
                        key={episode.id}
                        onClick={() =>
                          handleEpisodeClick(
                            episode.episode_number,
                            episode.name,
                            episode.still_path
                          )
                        }
                        className={`episode-card${
                          selectedEpisode === episode.episode_number ? " selected" : ""
                        }${isWatched ? " watched" : ""}`}
                      >
                        <div className="episode-image-container">
                          {episode.still_path ? (
                            <>
                              <img
                                src={apiConfig.w500Image(episode.still_path)}
                                alt={episode.name}
                                className="episode-image"
                              />
                              <div className="episode-overlay">
                                <div className="play-button">
                                  <i className="bx bx-play"></i>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="episode-placeholder">
                              <i className="bx bx-play-circle"></i>
                            </div>
                          )}
                          <div className="episode-number">
                            {episode.episode_number}
                          </div>
                          <button
                            type="button"
                            className={`episode-watch-toggle${
                              isWatched ? " is-watched" : ""
                            }`}
                            onClick={(e) =>
                              handleToggleWatched(
                                e,
                                episode.episode_number,
                                episode.name,
                                episode.still_path
                              )
                            }
                            aria-pressed={isWatched}
                            aria-label={
                              isWatched ? "Mark as unwatched" : "Mark as watched"
                            }
                            title={
                              isWatched ? "Watched - click to unmark" : "Mark as watched"
                            }
                          >
                            <CheckIcon />
                          </button>
                        </div>

                        <div className="episode-content">
                          <div>
                            <h4 className="episode-title">
                              Episode {episode.episode_number}: {episode.name}
                            </h4>
                            <p className="episode-overview">
                              {episode.overview || "No description available."}
                            </p>
                          </div>

                          <div className="episode-meta">
                            {episode.air_date && (
                              <span className="episode-date">
                                {new Date(episode.air_date).toLocaleDateString()}
                              </span>
                            )}
                            {episode.runtime && (
                              <span className="episode-runtime">
                                {episode.runtime}min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export default SeriesVideoPlayer;