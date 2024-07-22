import React, { useState, useEffect, useRef } from "react";
import SwiperCore from "swiper";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import Button, { OutlineButton } from "../button/Button";
import Modal, { ModalContent } from "../modal/Modal";
import tmdbApi, { category, movieType } from "../../api/tmdbApi";
import apiConfig from "../../api/apiConfig";
import "./hero-slide.scss";
import { useNavigate } from "react-router";
import { PlayIcon } from "../../assets/icons/PlayIcon";
import { InfoIcon } from "../../assets/icons/InfoIcon";

const HeroSlide = () => {
  SwiperCore.use([Autoplay]);

  const [movieItems, setMovieItems] = useState([]);

  useEffect(() => {
    const getMovies = async () => {
      const params = { page: 1 };
      try {
        const response = await tmdbApi.getMoviesList(movieType.popular, {
          params,
        });
        setMovieItems(response.results.slice(1, 4));
        console.log(response);
      } catch {
        console.log("error");
      }
    };
    getMovies();
  }, []);

  return (
    <div className="hero-slide">
      <Swiper
        modules={[Autoplay]}
        grabCursor={true}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 6000 }}
      >
        {movieItems.map((item, i) => (
          <SwiperSlide key={i}>
            {({ isActive }) => (
              <HeroSlideItem
                item={item}
                className={`${isActive ? "active" : ""}`}
              />
            )}
          </SwiperSlide>
        ))}
      </Swiper>
      {movieItems.map((item, i) => (
        <TrailerModal key={i} item={item} />
      ))}
    </div>
  );
};

const HeroSlideItem = (props) => {
    let navigate = useNavigate();
    const item = props.item;
    const [isHovered, setIsHovered] = useState(false);
    const [trailerUrl, setTrailerUrl] = useState("");
  
    const background = apiConfig.originalImage(
      item.backdrop_path ? item.backdrop_path : item.poster_path
    );
  
    const fetchTrailer = async () => {
      try {
        const videos = await tmdbApi.getVideos(category.movie, item.id);
        if (videos.results.length > 0) {
          const videoKey = videos.results[0].key;
          setTrailerUrl(`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1`);
        }
      } catch (error) {
        console.error("Error fetching trailer:", error);
      }
    };
  
    useEffect(() => {
      if (isHovered) {
        fetchTrailer();
      } else {
        setTrailerUrl("");
      }
    }, [isHovered]);
  
    return (
      <div
        className={`hero-slide__item ${props.className}`}
        style={{ backgroundImage: `url(${background})` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="hero-slide__item__content container">
          <div className="hero-slide__item__content__info">
            <h2 className="title">{item.title}</h2>
            <div className="overview">{item.overview}</div>
            <div className="btns">
              <Button onClick={() => navigate("/movie/" + item.id)} icon={<PlayIcon />}>
                Play now
              </Button>
              <OutlineButton icon={<InfoIcon />} >More Info</OutlineButton>
            </div>
          </div>
          <div className="hero-slide__item__content__poster">
              <img src={apiConfig.w500Image(item.poster_path)} alt="" />
          </div>
        </div>
      </div>
    );
  };

const TrailerModal = (props) => {
  const item = props.item;

  const iframeRef = useRef(null);

  const onClose = () => iframeRef.current.setAttribute("src", "");

  return (
    <Modal active={false} id={`modal_${item.id}`}>
      <ModalContent onClose={onClose}>
        <iframe
          ref={iframeRef}
          width="100%"
          height="500px"
          title="trailer"
        ></iframe>
      </ModalContent>
    </Modal>
  );
};

export default HeroSlide;
