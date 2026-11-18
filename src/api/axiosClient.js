import axios from 'axios';
import queryString from 'query-string';

import apiConfig from './apiConfig';

// In production the key must never reach the browser, so all calls go through
// the serverless proxy at /api/tmdb (which adds the key server-side).
// In local `npm start` dev the proxy isn't running, so fall back to calling
// TMDB directly with the dev key from .env. The dev bundle is only served on
// localhost and is never deployed, so the key stays out of the public bundle.
//
// Set REACT_APP_USE_PROXY=true (and serve the build with `npx wrangler pages dev build`) to exercise the real
// proxy locally instead of the direct fallback.
const forceProxy = process.env.REACT_APP_USE_PROXY === 'true';
const useDirect =
    !forceProxy &&
    process.env.NODE_ENV === 'development' &&
    Boolean(apiConfig.apiKey);

const axiosClient = axios.create({
    baseURL: useDirect ? apiConfig.baseUrl : '/api/tmdb/',
    headers: {
        'Content-Type': 'application/json'
    },
    paramsSerializer: params =>
        queryString.stringify(
            useDirect ? { ...params, api_key: apiConfig.apiKey } : params
        )
});

axiosClient.interceptors.request.use(async (config) => config);

axiosClient.interceptors.response.use((response) => {
    if (response && response.data) {
        return response.data;
    }

    return response;
}, (error) => {
    throw error;
});

export default axiosClient;