import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import tmdbApi from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import "./detail.scss";
import CastList from "./CastList/CastList";
import MovieList from "../../components/movie-list/MovieList";
import VideoPlayer from "./MovieVideoPlayer/VideoPlayer";
import Button, { OutlineButton } from "../../components/button/Button";
import SeriesVideoPlayer from "./SeriesVideoPlayer/SeriesVideoPlayer";
import Modal, { ModalContent } from "../../components/modal/Modal";

const Detail = () => {
  const { category, id } = useParams();
  const [item, setItem] = useState(null);
  const videoPlayerRef = useRef(null);

  const [modalActive, setModalActive] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState("");

  const handleWatchTrailer = async () => {
    try {
      const response = await tmdbApi.getVideos(category, id);
      const youtubeTrailer = response.results.find(
        (video) => video.type === "Trailer" && video.site === "YouTube"
      );
      if (youtubeTrailer) {
        setTrailerUrl(`https://www.youtube.com/embed/${youtubeTrailer.key}`);
        setModalActive(true);
      } else {
        alert("Trailer not available");
      }
    } catch (error) {
      console.error("Error fetching trailer:", error);
    }
  };

  const handleCloseModal = () => {
    setModalActive(false);
    setTrailerUrl("");
  };

  const getDetail = async () => {
    const response = await tmdbApi.detail(category, id, { params: {} });
    setItem(response);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    getDetail();
    // eslint-disable-next-line
  }, [category, id]);

  const handlePlayButtonClick = () => {
    videoPlayerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (!item) return null;

  const backgroundImage = apiConfig.originalImage(
    item.backdrop_path || item.poster_path
  );
  const posterImage = apiConfig.originalImage(
    item.poster_path || item.backdrop_path
  );
  const title = item.title || item.name;

  return (
    <>
      <div
        className="banner"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      ></div>
      <div className="mb-3 movie-content container">
        <div className="movie-content__poster">
          <div
            className="movie-content__poster__img"
            style={{ backgroundImage: `url(${posterImage})` }}
          >
            <Button onClick={handlePlayButtonClick}>
              <i className="bx bx-play"></i>
            </Button>
          </div>
        </div>
        <div className="movie-content__info">
          <h1 className="title">{title}</h1>
          <div className="genres">
            {item.genres?.slice(0, 5).map((genre, i) => (
              <span key={i} className="genres__item">
                {genre.name}
              </span>
            ))}
          </div>
          <p className="overview">{item.overview}</p>
          <div className="buttons">
          <div>
            <Button onClick={handleWatchTrailer} className='trailer-btn'>Watch Trailer</Button>
            <Modal active={modalActive} id="trailer-modal">
              <ModalContent onClose={handleCloseModal}>
                <iframe
                  width="100%"
                  height="400"
                  src={trailerUrl}
                  title="Trailer"
                  frameborder="0"
                  allowFullScreen
                ></iframe>
              </ModalContent>
            </Modal>
          </div>
          <div><OutlineButton className='trailer-btn'>Ratings: {item.vote_average}/10</OutlineButton></div>
          </div>
          <div className="cast">
            <div className="section__header">
              <h2>Top Cast</h2>
            </div>
            <CastList id={item.id} />
          </div>
        </div>
      </div>
      <div className="container">
        <div className="section mb-3" ref={videoPlayerRef}>
          {item.seasons ? (
            <SeriesVideoPlayer id={item.id} title={title} series={item} />
          ) : (
            <VideoPlayer id={item.id} title={title} movie={item} />
          )}
        </div>
        <div className="section mb-3">
          <div className="section__header mb-2">
            <h2>Similar</h2>
          </div>
          <MovieList category={category} type="similar" id={item.id} />
        </div>
      </div>
    </>
  );
};

export default Detail;
