import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import "./movie-grid.scss";
import MovieCard from "../movie-card/MovieCard";
import Button, { OutlineButton } from "../button/Button";
import Input from "../input/Input";
import tmdbApi, { category, movieType, tvType } from "../../api/tmdbApi";
import Select from "react-select";

const MovieGrid = (props) => {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPage, setTotalPage] = useState(0);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);

  const { keyword } = useParams();

  useEffect(() => {
    const getGenres = async () => {
      try {
        const response = await tmdbApi.getGenreList(props.category);
        setGenres(
          response.genres.map((genre) => ({
            value: genre.id,
            label: genre.name,
          }))
        );
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    const getCountries = async () => {
      try {
        const response = await tmdbApi.getCountryList();
        setCountries(
          response.map((country) => ({
            value: country.iso_3166_1,
            label: country.english_name,
          }))
        );
      } catch (error) {
        console.error("Error fetching countries:", error);
      }
    };

    getGenres();
    getCountries();
  }, [props.category]);

  const getList = async () => {
    let response = null;
    const params = {};
    if (keyword === undefined && !selectedGenre && !selectedCountry) {
      switch (props.category) {
        case category.movie:
          response = await tmdbApi.getMoviesList(movieType.popular, { params });
          break;
        default:
          response = await tmdbApi.getTvList(tvType.popular, { params });
      }
    } else if (keyword === undefined && (selectedGenre || selectedCountry)) {
      const param = {
        page: 1,
        include_adult: false,
        include_video: false,
        language: "en-US",
        sort_by: "popularity.desc",
      };
      if (selectedGenre) param.with_genres = selectedGenre.value;
      if (selectedCountry) param.with_origin_country = selectedCountry.value;

      if (props.category === category.movie) {
        response = await tmdbApi.getMoviesByGenre(param);
      } else {
        response = await tmdbApi.getTvByGenre(param);
      }
    } else {
      params.query = keyword;
      response = await tmdbApi.search(props.category, { params });
    }
    setItems(response.results);
    setTotalPage(response.total_pages);
  };

  useEffect(() => {
    getList();
    // eslint-disable-next-line
  }, [props.category, keyword, selectedGenre, selectedCountry]);

  const loadMore = async () => {
    let response = null;
    const params = {
      page: page + 1,
    };
    if (keyword === undefined && !selectedGenre && !selectedCountry) {
      switch (props.category) {
        case category.movie:
          response = await tmdbApi.getMoviesList(movieType.popular, { params });
          break;
        default:
          response = await tmdbApi.getTvList(tvType.popular, { params });
      }
    } else if (keyword === undefined && (selectedGenre || selectedCountry)) {
      const param = {
        page: page + 1,
        include_adult: false,
        include_video: false,
        language: "en-US",
        sort_by: "popularity.desc",
      };
      if (selectedGenre) param.with_genres = selectedGenre.value;
      if (selectedCountry) param.with_origin_country = selectedCountry.value;

      if (props.category === category.movie) {
        response = await tmdbApi.getMoviesByGenre(param);
      } else {
        response = await tmdbApi.getTvByGenre(param);
      }
    } else {
      params.query = keyword;
      response = await tmdbApi.search(props.category, { params });
    }
    setItems([...items, ...response.results]);
    setPage(page + 1);
  };

  // Custom styles for the Select component
  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: "black",
      color: "white",
      borderColor: "white",
      minWidth: '12rem',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "white",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "black",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#333" : "black",
      color: "white",
      cursor: 'pointer',
      "&:hover": {
        backgroundColor: "#555",
      },
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
    <>
      <div className="section mb-3">
        <div style={{ display: "flex", justifyContent: "center" }}>
          <MovieSearch category={props.category} keyword={keyword} />
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <Select
            options={genres}
            onChange={(genre) => setSelectedGenre(genre)}
            value={selectedGenre}
            placeholder="Select a genre"
            isSearchable={true}
            isClearable={true}
            styles={customSelectStyles}
          />
          <Select
            options={countries}
            onChange={(country) => setSelectedCountry(country)}
            value={selectedCountry}
            placeholder="Select a country"
            isSearchable={true}
            isClearable={true}
            styles={customSelectStyles}
          />
        </div>
      </div>
      <div className="movie-grid">
        {items.map((item, i) => (
          (item.poster_path || item.backdrop_path) && <MovieCard category={props.category} item={item} key={i} />
        ))}
      </div>
      {page < totalPage ? (
        <div className="movie-grid__loadmore">
          <OutlineButton className="small" onClick={loadMore}>
            Load more
          </OutlineButton>
        </div>
      ) : null}
    </>
  );
};

const MovieSearch = (props) => {
  const navigate = useNavigate();

  const [keyword, setKeyword] = useState(props.keyword ? props.keyword : "");

  const goToSearch = useCallback(() => {
    if (keyword.trim().length > 0) {
      navigate(`/${category[props.category]}/search/${keyword}`);
    }
  }, [keyword, props.category, navigate]);

  useEffect(() => {
    const enterEvent = (e) => {
      e.preventDefault();
      if (e.keyCode === 13) {
        goToSearch();
      }
    };
    document.addEventListener("keyup", enterEvent);
    return () => {
      document.removeEventListener("keyup", enterEvent);
    };
  }, [keyword, goToSearch]);

  return (
    <div className="movie-search">
      <Input
        type="text"
        placeholder={`Search ${
          category[props.category] === "tv" ? "Series" : "Movies"
        }`}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      <Button className="small" onClick={goToSearch}>
        Search
      </Button>
    </div>
  );
};

export default MovieGrid;