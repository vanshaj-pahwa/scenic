import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import tmdbApi from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import "./detail.scss";
import CastList from "./CastList";
import MovieList from "../../components/movie-list/MovieList";
import VideoPlayer from "./VideoPlayer";
import Button from "../../components/button/Button";
import SeriesVideoPlayer from "./SeriesVideoPlayer/SeriesVideoPlayer";

const Detail = () => {
  const { category, id } = useParams();
  const [item, setItem] = useState(null);
  const videoPlayerRef = useRef(null);

  useEffect(() => {
    const getDetail = async () => {
      const response = await tmdbApi.detail(category, id, { params: {} });
      setItem(response);
      window.scrollTo(0, 0);
    };
    getDetail();
  }, [category, id]);

  const handlePlayButtonClick = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      {item && (
        <>
          <div
            className="banner"
            style={{
              backgroundImage: `url(${apiConfig.originalImage(
                item.backdrop_path || item.poster_path
              )})`,
            }}
          ></div>
          <div className="mb-3 movie-content container">
            <div className="movie-content__poster">
              <div
                className="movie-content__poster__img"
                style={{
                  backgroundImage: `url(${apiConfig.originalImage(
                    item.poster_path || item.backdrop_path
                  )})`,
                }}
              >
                <Button onClick={handlePlayButtonClick}>
                  <i className="bx bx-play"></i>
                </Button>
              </div>
            </div>
            <div className="movie-content__info">
              <h1 className="title">{item.title || item.name}</h1>
              <div className="genres">
                {item.genres &&
                  item.genres.slice(0, 5).map((genre, i) => (
                    <span key={i} className="genres__item">
                      {genre.name}
                    </span>
                  ))}
              </div>
              <p className="overview">{item.overview}</p>
              <div className="cast">
                <div className="section__header">
                  <h2>Casts</h2>
                </div>
                <CastList id={item.id} />
              </div>
            </div>
          </div>
          <div className="container">
            <div className="section mb-3" ref={videoPlayerRef}>
              {!item.seasons ? <VideoPlayer id={item.id} title={item.title} movie={item} /> :
              <SeriesVideoPlayer id={item.id} title={item.title} series={item} />}
            </div>
            <div className="section mb-3">
              <div className="section__header mb-2">
                <h2>Similar</h2>
              </div>
              <MovieList category={category} type="similar" id={item.id} />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Detail;
