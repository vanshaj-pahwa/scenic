const apiConfig = {
    baseUrl: 'https://api.themoviedb.org/3/',
    apiKey: '68e094699525b18a70bab2f86b1fa706',
    originalImage: (imgPath) => `https://image.tmdb.org/t/p/original/${imgPath}`,
    w500Image: (imgPath) => `https://image.tmdb.org/t/p/w500/${imgPath}`
}

export default apiConfig;