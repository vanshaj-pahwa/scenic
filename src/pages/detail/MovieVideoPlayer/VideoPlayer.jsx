import React, { useState } from "react";
import "./VideoPlayer.scss";
import Card from "../../../components/card/Card";
import { embededMovieUrls } from "../../../constants/constants";
import apiConfig from "../../../api/apiConfig";
import Button from "../../../components/button/Button";

const VideoPlayer = ({ id, title, movie }) => {
  const [selectedServer, setSelectedServer] = useState(null);
  const [serverUrl, setServerUrl] = useState("");

  const handleServerClick = (index) => {
    setSelectedServer(index);
    switch (index) {
      case 0:
        setServerUrl(`${embededMovieUrls.server1}${id}`);
        break;
      case 1:
        setServerUrl(`${embededMovieUrls.server2}${id}`);
        break;
      case 2:
        setServerUrl(`${embededMovieUrls.server3}${id}&tmdb=1`);
        break;
      default:
        break;
    }
  };

  const handlePlayButtonClick = () => {
    setServerUrl(`${embededMovieUrls.server1}${id}`);
    setSelectedServer(0);
  };

  return (
    <React.Fragment>
      <div className="video-player-container">
        {serverUrl ? (
          <iframe src={serverUrl} allowFullScreen title={title} />
        ) : (
          <div className="poster-container" onClick={handlePlayButtonClick}>
            <img
              src={`${apiConfig.originalImage(movie.poster_path)}`}
              alt={movie.title}
              className="poster-image"
            />
            <div className="gradient-overlay" />
            <Button onClick={handlePlayButtonClick}>
              <i className="bx bx-play"></i>
            </Button>
          </div>
        )}
      </div>
      <div>
        <div className="server-container">
          <div>
            If the current server doesn't work, please try other servers below.
          </div>
          <div className="server-card-container">
            {["Server 1", "Server 2", "Server 3"].map((server, index) => (
              <Card
                key={index}
                className={`server-card ${
                  selectedServer === index ? "selected" : ""
                }`}
                onClick={() => handleServerClick(index)}
              >
                {server}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default VideoPlayer;
