import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MovieCard from "../movie-card/MovieCard";
import tmdbApi from "../../api/tmdbApi";
import { category } from "../../api/tmdbApi";
import "./MultiSearch.scss";
import Input from "../input/Input";
import Button from "../button/Button";

const MultiSearch = () => {
  const { keyword } = useParams();
  const [searchResults, setSearchResults] = useState([]);
  const [searchInput, setSearchInput] = useState(keyword || "");

  const navigate = useNavigate();

  const goToSearch = useCallback(() => {
    if (searchInput.trim().length > 0) {
      navigate(`/search/${searchInput}`);
    }
  }, [searchInput, navigate]);

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      goToSearch();
    }
  };

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

  const getSearchResults = useCallback(async () => {
    if (!keyword) return;
    try {
      const params = {
        query: keyword,
      };
      const response = await tmdbApi.search(category.multi, { params });
      setSearchResults(response.results);
    } catch (error) {
      console.error("Error searching:", error);
    }
  }, [keyword]);

  useEffect(() => {
    getSearchResults();
  }, [getSearchResults]);

  useEffect(() => {
    setSearchInput(keyword || "");
  }, [keyword]);

  return (
    <div className="search-page">
      <div className="search-container">
        <div className="movie-search">
          <Input
            type="text"
            placeholder="Search Movies/Series"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button className="small" onClick={goToSearch}>
            Search
          </Button>
        </div>
      </div>
      <div className="container">
        <h2>Search Results for "{keyword}"</h2>
        <div className="movie-grid">
          {searchResults
            .filter((item) => item.backdrop_path || item.poster_path)
            .map((item, i) => (
              <MovieCard category={item.media_type} item={item} key={i} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default MultiSearch;
