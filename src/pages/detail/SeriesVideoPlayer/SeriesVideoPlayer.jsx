import React, { useState, useEffect } from "react";
import "./SeriesVideoPlayer.scss";
import Card from "../../../components/card/Card";
import { embededSeriesUrls } from "../../../constants/constants";
import apiConfig from "../../../api/apiConfig";
import Button from "../../../components/button/Button";
import tmdbApi from "../../../api/tmdbApi";
import Select from "react-select";

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
    if (selectedServer !== null && selectedEpisode !== null) {
      handleServerClick(selectedServer);
    }
    // eslint-disable-next-line
  }, [selectedEpisode, selectedServer]);

  const handlePlayButtonClick = () => {
    setSelectedSeason(1);
    setSelectedEpisode(1);
    setServerUrl(
      `${embededSeriesUrls.server1}?tmdb=${id}&season=1&episode=1`
    );
    setSelectedServer(0);
  };

  const handleSeasonChange = (option) => {
    const season = Number(option.value);
    setSelectedSeason(season);
    setSelectedEpisode(null);
    setEpisodes([]);
  };

  const handleEpisodeClick = (episode_number) => {
    setSelectedEpisode(episode_number);
  };

  useEffect(() => {
    if (selectedSeason > 0) {
      tmdbApi.getSeason(id, selectedSeason).then((response) => {
        setEpisodes(response.episodes);
      });
    }
  }, [selectedSeason, id]);

  const seasonOptions = series.seasons
    ? series.seasons
        .filter(season => season.season_number !== 0)
        .map(season => ({
          value: season.season_number,
          label: `Season ${season.season_number}`
        }))
    : [];

    const customSelectStyles = {
      control: (provided) => ({
        ...provided,
        backgroundColor: "black",
        color: "white",
        borderColor: "white",
        minWidth: '12rem',
        maxWidth: '12rem'
      }),
      singleValue: (provided) => ({
        ...provided,
        color: "white",
      }),
      menu: (provided) => ({
        ...provided,
        backgroundColor: "black",
        maxWidth: '12rem'
      }),
      option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected ? "#333" : "black",
        color: "white",
        cursor: 'pointer',
        "&:hover": {
          backgroundColor: "#555",
        },
        maxWidth: '12rem'
      }),
      placeholder: (provided) => ({
        ...provided,
        color: "gray",
      }),
      input: (provided) => ({
        ...provided,
        color: "white",
      }),
    };

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
            <Select
            options={seasonOptions}
            onChange={handleSeasonChange}
              value={seasonOptions.find(
                (option) => option.value === selectedSeason
              )}
            placeholder="Select a season"
            isSearchable={false}
            styles={customSelectStyles}
          />
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