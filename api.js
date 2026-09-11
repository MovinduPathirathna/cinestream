/**
 * CineStream API Module
 * Modern fetch client for TMDB API v3.
 */

import { Storage } from './storage.js';

const DEFAULT_API_KEYS = [
    'a07e22bc18f5cb106bfe4cc1f83ad8ed',
    '4e44d9029b1270a757cddc766a1bcb63'
];
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

export const API = {
    getApiKeyList() {
        const custom = Storage.getApiKey();
        if (custom) return [custom, ...DEFAULT_API_KEYS];
        return DEFAULT_API_KEYS;
    },

    getImageUrl(path, size = 'w500') {
        if (!path) return 'assets/no-poster.png';
        if (path.startsWith('http')) return path;
        return `${IMAGE_BASE_URL}${size}${path}`;
    },

    getBackdropUrl(path, size = 'original') {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${IMAGE_BASE_URL}${size}${path}`;
    },

    async fetch(endpoint, params = {}) {
        const keys = this.getApiKeyList();
        let lastError = null;

        for (const apiKey of keys) {
            const urlParams = new URLSearchParams({
                api_key: apiKey,
                language: 'en-US',
                ...params
            });

            const url = `${BASE_URL}${endpoint}?${urlParams.toString()}`;

            try {
                const res = await fetch(url);
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.status_message || `HTTP ${res.status}`);
                }
                return await res.json();
            } catch (err) {
                lastError = err;
                console.warn(`TMDB key ${apiKey.substring(0, 6)}... failed for [${endpoint}], trying fallback key.`, err);
            }
        }

        console.error(`All TMDB API Keys failed for [${endpoint}]:`, lastError);
        throw lastError;
    },

    // Trending
    async getTrending(mediaType = 'all', timeWindow = 'day') {
        return this.fetch(`/trending/${mediaType}/${timeWindow}`);
    },

    // Movies
    async getPopularMovies(page = 1) {
        return this.fetch('/movie/popular', { page });
    },
    async getTopRatedMovies(page = 1) {
        return this.fetch('/movie/top_rated', { page });
    },

    // TV Shows
    async getPopularTV(page = 1) {
        return this.fetch('/tv/popular', { page });
    },
    async getTopRatedTV(page = 1) {
        return this.fetch('/tv/top_rated', { page });
    },

    // Genres
    async getGenres(mediaType = 'movie') {
        return this.fetch(`/genre/${mediaType}/list`);
    },

    // Discover by Genre / Filter
    async discover(mediaType = 'movie', params = {}) {
        return this.fetch(`/discover/${mediaType}`, params);
    },

    // Search
    async searchMulti(query, page = 1) {
        if (!query || !query.trim()) return { results: [] };
        return this.fetch('/search/multi', { query: query.trim(), page, include_adult: false });
    },

    // Details (includes credits, trailers, recommendations)
    async getDetails(mediaType, id) {
        return this.fetch(`/${mediaType}/${id}`, {
            append_to_response: 'videos,credits,recommendations,similar'
        });
    },

    // TV Season Details (episodes)
    async getTVSeason(id, seasonNumber) {
        return this.fetch(`/tv/${id}/season/${seasonNumber}`);
    }
};
