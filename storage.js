/**
 * CineStream Storage Module
 * LocalStorage wrapper for settings, watch history, bookmarks, and recommendations.
 */

const KEYS = {
    API_KEY: 'cinestream_tmdb_api_key',
    HISTORY: 'cinestream_watch_history',
    MY_LIST: 'cinestream_my_list',
    SUBTITLE_LANG: 'cinestream_subtitle_lang'
};

export const Storage = {
    // API Key
    getApiKey() {
        const key = localStorage.getItem(KEYS.API_KEY) || '';
        if (key === '842470725a74e50882e31f729b806b29') {
            localStorage.removeItem(KEYS.API_KEY);
            return '';
        }
        return key;
    },
    setApiKey(key) {
        if (key) {
            localStorage.setItem(KEYS.API_KEY, key.trim());
        } else {
            localStorage.removeItem(KEYS.API_KEY);
        }
    },

    // Subtitle Language Preference
    getSubtitleLang() {
        return localStorage.getItem(KEYS.SUBTITLE_LANG) || 'en';
    },
    setSubtitleLang(lang) {
        localStorage.setItem(KEYS.SUBTITLE_LANG, lang);
    },

    // Watch History
    getHistory() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.HISTORY)) || [];
        } catch (e) {
            return [];
        }
    },
    addToHistory(media) {
        if (!media || !media.id) return;
        let history = this.getHistory();
        // Remove duplicate if exists
        history = history.filter(item => !(item.id === media.id && item.media_type === media.media_type));
        // Add to front with timestamp
        history.unshift({
            id: media.id,
            title: media.title || media.name,
            poster_path: media.poster_path,
            backdrop_path: media.backdrop_path,
            media_type: media.media_type || (media.title ? 'movie' : 'tv'),
            genre_ids: media.genre_ids || (media.genres ? media.genres.map(g => g.id) : []),
            vote_average: media.vote_average,
            season: media.season || 1,
            episode: media.episode || 1,
            timestamp: Date.now()
        });
        // Limit history to 50 items
        if (history.length > 50) history.pop();
        localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
    },

    // My List (Bookmarks)
    getMyList() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.MY_LIST)) || [];
        } catch (e) {
            return [];
        }
    },
    isInMyList(id, media_type) {
        const list = this.getMyList();
        return list.some(item => item.id == id && (item.media_type === media_type || !media_type));
    },
    toggleMyList(media) {
        if (!media || !media.id) return false;
        let list = this.getMyList();
        const type = media.media_type || (media.title ? 'movie' : 'tv');
        const index = list.findIndex(item => item.id == media.id && item.media_type === type);
        
        let isAdded = false;
        if (index > -1) {
            list.splice(index, 1);
        } else {
            list.unshift({
                id: media.id,
                title: media.title || media.name,
                poster_path: media.poster_path,
                backdrop_path: media.backdrop_path,
                media_type: type,
                vote_average: media.vote_average,
                addedAt: Date.now()
            });
            isAdded = true;
        }
        localStorage.setItem(KEYS.MY_LIST, JSON.stringify(list));
        return isAdded;
    },

    // Recommendation Engine: Get top 3 most watched genre IDs
    getTopGenresFromHistory() {
        const history = this.getHistory();
        if (!history.length) return [];
        const genreCounts = {};
        history.forEach(item => {
            if (item.genre_ids && Array.isArray(item.genre_ids)) {
                item.genre_ids.forEach(gid => {
                    genreCounts[gid] = (genreCounts[gid] || 0) + 1;
                });
            }
        });
        const sorted = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);
        return sorted.slice(0, 3).map(Number);
    }
};
