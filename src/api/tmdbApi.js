import axiosClient from "./axiosClient";

export const category = {
    movie: 'movie',
    tv: 'tv',
    multi: 'multi'
}

export const movieType = {
    upcoming: 'upcoming',
    popular: 'popular',
    top_rated: 'top_rated'
}

export const tvType = {
    popular: 'popular',
    top_rated: 'top_rated',
    on_the_air: 'on_the_air'
}

const tmdbApi = {
    getMoviesList: (type, params) => {
        const url = 'movie/' + movieType[type];
        return axiosClient.get(url, params);
    },
    getTvList: (type, params) => {
        const url = 'tv/' + tvType[type];
        return axiosClient.get(url, params);
    },
    getVideos: (cate, id) => {
        const url = category[cate] + '/' + id + '/videos';
        return axiosClient.get(url, {params: {}});
    },
    search: (cate, params) => {
        const url = 'search/' + category[cate];
        return axiosClient.get(url, params);
    },
    detail: (cate, id, params) => {
        const url = category[cate] + '/' + id;
        return axiosClient.get(url, params);
    },
    credits: (cate, id) => {
        const url = category[cate] + '/' + id + '/credits';
        return axiosClient.get(url, {params: {}});
    },
    similar: (cate, id) => {
        const url = category[cate] + '/' + id + '/similar';
        return axiosClient.get(url, {params: {}});
    },
    getSeason: (id, seasonNumber) => {
        const url = `tv/${id}/season/${seasonNumber}`;
        return axiosClient.get(url, {params: {}});
    },
    getGenreList: (cate) => {
        const url = `genre/${category[cate]}/list`;
        return axiosClient.get(url, {params: {}});
    },
    getMoviesByGenre: (params) => {
        const url = 'discover/movie';
        return axiosClient.get(url, { params });
    },
    getTvByGenre: (params) => {
        const url = 'discover/tv';
        return axiosClient.get(url, { params });
    },
    getCountryList: () => {
        const url = 'configuration/countries';
        return axiosClient.get(url, {params: {}});
    }
}

export default tmdbApi;