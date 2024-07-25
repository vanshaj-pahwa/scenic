import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import Slider from "react-slick";
import "./movie-list.scss";
import tmdbApi, { category } from "../../api/tmdbApi";
import MovieCard from "../movie-card/MovieCard";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const MovieList = ({ category: cat, type, id }) => {
  const [items, setItems] = useState([]);

  const getList = useCallback(async () => {
    try {
      let response;
      const params = {};

      if (type !== "similar") {
        response =
          cat === category.movie
            ? await tmdbApi.getMoviesList(type, { params })
            : await tmdbApi.getTvList(type, { params });
      } else {
        if (!id) throw new Error("ID is required for similar content");
        response = await tmdbApi.similar(cat, id);
      }

      setItems(response.results);
    } catch (error) {
      console.error("Failed to fetch movie/TV list:", error);
    }
  }, [cat, type, id]);

  useEffect(() => {
    getList();
  }, [getList]);

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 6,
    slidesToScroll: 3,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 3,
          infinite: true,
          dots: true,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 3,
          initialSlide: 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 2,
        },
      },
    ],
  };

  return (
    <div className="movie-list">
      {items.length > 0 && (
        <Slider {...settings}>
          {items.map((item) => (
            <div key={item.id}>
              <MovieCard item={item} category={cat} />
            </div>
          ))}
        </Slider>
      )}
    </div>
  );
};

MovieList.propTypes = {
  category: PropTypes.oneOf([category.movie, category.tv]).isRequired,
  type: PropTypes.string.isRequired,
  id: PropTypes.number,
};

export default MovieList;
