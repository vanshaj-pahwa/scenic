import React, { useState, useEffect } from "react";
import "./SeriesVideoPlayer.scss";
import Card from "../../../components/card/Card";
import { embededSeriesUrls } from "../../../constants/constants";
import apiConfig from "../../../api/apiConfig";
import Button from "../../../components/button/Button";
import tmdbApi from "../../../api/tmdbApi";

const SeriesVideoPlayer = ({ id, title, series }) => {
  const [selectedServer, setSelectedServer] = useState(0);
  const [serverUrl, setServerUrl] = useState("");
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const servers = ["Server 1", "Server 2", "Server 3", "Server 4"];

  const handleServerClick = (index) => {
    setSelectedServer(index);
    let url = "";
    if (index === 0) {
      url = `${embededSeriesUrls.server1}${id}/${selectedSeason}/${selectedEpisode}`;
    } else if (index === 1) {
      url = `${embededSeriesUrls.server2}${id}/${selectedSeason}/${selectedEpisode}`;
    } else if (index === 2) {
      url = `${embededSeriesUrls.server3}?tmdb=${id}&season=${selectedSeason}&episode=${selectedEpisode}`;
      console.log(url);
    } else {
      url = `${embededSeriesUrls.server4}${id}&tmdb=1&s=${selectedSeason}&e=${selectedEpisode}`;
    }
    setServerUrl(url);
  };

  useEffect(() => {
    handleServerClick(selectedServer);
    handleEpisodeClick(selectedEpisode);
  }, [selectedEpisode, selectedServer]);

  const handlePlayButtonClick = () => {
    setSelectedSeason(1);
    setSelectedEpisode(1);
    setServerUrl(
      `${embededSeriesUrls.server1}?tmdb=${id}&season=${selectedSeason}&episode=${selectedEpisode}`
    );
    setSelectedServer(0);
  };

  const handleSeasonChange = (event) => {
    setSelectedSeason(Number(event.target.value));
    setSelectedEpisode(null);
  };

  const handleEpisodeClick = (episode_number) => {
    setSelectedEpisode(episode_number);
    setSelectedServer(selectedServer);
  };

  useEffect(() => {
    if (selectedSeason > 0) {
      tmdbApi.getSeason(id, selectedSeason).then((response) => {
        setEpisodes(response.episodes);
      });
    }
  }, [selectedSeason, id]);

  return (
    <React.Fragment>
      <div className="series-player-container">
        {serverUrl && selectedEpisode ? (
          <iframe src={serverUrl} allowFullScreen title={title} />
        ) : (
          <div
            className="series-poster-container"
            onClick={handlePlayButtonClick}
          >
            <img
              src={`${apiConfig.originalImage(series.poster_path)}`}
              alt={title}
              className="series-poster-image"
            />
            <div className="series-gradient-overlay" />
            <Button onClick={handlePlayButtonClick}>
              <i className="bx bx-play"></i>
            </Button>
          </div>
        )}
      </div>
      <div>
        {selectedEpisode && (
          <div className="series-server-container">
            <div>
              If the current server doesn't work, please try other servers
              below.
            </div>
            <div className="series-server-card-container">
              {servers.map((server, index) => (
                <Card
                  key={index}
                  className={`series-server-card ${
                    selectedServer === index ? "selected" : ""
                  }`}
                  onClick={() => handleServerClick(index)}
                >
                  {server}
                </Card>
              ))}
            </div>
          </div>
        )}
        {series.seasons && series.seasons.length > 0 && (
          <div className="season-container">
            <select
              id="season-select"
              value={selectedSeason}
              onChange={handleSeasonChange}
              className="season-select"
            >
              <option value={0}>Select a season</option>
              {series.seasons.map((season) => (
                <option key={season.id} value={season.season_number}>
                  Season {season.season_number}
                </option>
              ))}
            </select>
            {episodes.length > 0 && (
              <div className="episode-container">
                <h3>Episodes</h3>
                <div className="episode-list">
                  {episodes.map((episode) => (
                    <Card
                      key={episode.id}
                      onClick={() => handleEpisodeClick(episode.episode_number)}
                      className={`series-episode-card ${
                        selectedEpisode === episode.episode_number
                          ? "selected"
                          : ""
                      }`}
                    >
                      Episode {episode.episode_number}: {episode.name}
                    </Card>
                  ))}
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
