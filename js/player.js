/**
 * CineStream Video Player Module
 * Supports multi-server embedding, ad-blocking sandboxing, subtitles, and TV episode navigation.
 */

import { Storage } from './storage.js';
import { API } from './api.js';

export const SERVERS = [
    {
        id: 'vidsrcto',
        name: 'VidSrc.to (HD + Subtitles)',
        badge: 'Recommended',
        hasSubs: true,
        getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
        getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`
    },
    {
        id: 'multiembed',
        name: 'MultiEmbed (Multi-Server)',
        badge: 'Fast',
        hasSubs: true,
        getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
        getTvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
    },
    {
        id: 'embed2',
        name: '2Embed (HD)',
        badge: 'Fast',
        hasSubs: true,
        getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
        getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
    },
    {
        id: 'smashy',
        name: 'SmashyStream',
        badge: 'CC Enabled',
        hasSubs: true,
        getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
        getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`
    },
    {
        id: 'vidsrcme',
        name: 'VidSrc.me',
        badge: 'Fallback',
        hasSubs: false,
        getMovieUrl: (id) => `https://vidsrc.me/embed/movie?tmdb=${id}`,
        getTvUrl: (id, s, e) => `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
    },
    {
        id: 'vidlink',
        name: 'VidLink',
        badge: 'Fallback',
        hasSubs: true,
        getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
        getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`
    }
];

export class Player {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentMedia = null;
        this.currentServer = SERVERS[0];
        this.currentSeason = 1;
        this.currentEpisode = 1;
        this.tvData = null;
    }

    async open(media, season = 1, episode = 1) {
        this.currentMedia = media;
        this.currentSeason = season;
        this.currentEpisode = episode;

        // Save to watch history
        Storage.addToHistory({
            ...media,
            season,
            episode
        });

        // Show player modal
        this.container.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Render controls and player frame
        this.renderPlayerModal();

        // Fetch TV details if media is TV show
        if (media.media_type === 'tv' || media.first_air_date) {
            await this.loadTVDetails(media.id);
        }
    }

    close() {
        this.container.classList.add('hidden');
        document.body.style.overflow = '';
        this.container.innerHTML = '';
        this.currentMedia = null;
    }

    async loadTVDetails(id) {
        try {
            this.tvData = await API.getDetails('tv', id);
            this.updateEpisodeSelectors();
        } catch (err) {
            console.warn('Could not fetch full TV details for episode selector:', err);
        }
    }

    renderPlayerModal() {
        const isTv = this.currentMedia.media_type === 'tv' || !!this.currentMedia.first_air_date;
        const title = this.currentMedia.title || this.currentMedia.name;

        const embedUrl = isTv
            ? this.currentServer.getTvUrl(this.currentMedia.id, this.currentSeason, this.currentEpisode)
            : this.currentServer.getMovieUrl(this.currentMedia.id);

        this.container.innerHTML = `
            <div class="player-modal-backdrop" id="player-backdrop"></div>
            <div class="player-modal-content">
                <header class="player-header">
                    <div class="player-title-info">
                        <span class="player-badge">${isTv ? `S${this.currentSeason} E${this.currentEpisode}` : 'MOVIE'}</span>
                        <h2>${this.escapeHtml(title)}</h2>
                    </div>
                    <div class="player-actions">
                        <div class="ad-shield-status" id="ad-shield-status-btn" style="cursor: pointer;" title="Ad-Blocker Protection Enabled. Click to toggle popup shield.">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                            </svg>
                            <span id="shield-status-text">Ad-Shield Active</span>
                        </div>
                        <button class="icon-btn close-player-btn" id="close-player-btn" aria-label="Close Player">
                            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </header>

                <div class="server-toolbar">
                    <div class="server-list">
                        <span class="toolbar-label">Select Server:</span>
                        ${SERVERS.map(srv => `
                            <button class="server-pill ${srv.id === this.currentServer.id ? 'active' : ''}" data-server-id="${srv.id}">
                                <span>${srv.name}</span>
                                ${srv.hasSubs ? '<span class="sub-badge">CC</span>' : ''}
                            </button>
                        `).join('')}
                    </div>

                    ${isTv ? `
                    <div class="tv-navigation-controls">
                        <div class="select-wrapper">
                            <label>Season:</label>
                            <select id="season-select" class="player-select">
                                <option value="${this.currentSeason}">Season ${this.currentSeason}</option>
                            </select>
                        </div>
                        <div class="select-wrapper">
                            <label>Episode:</label>
                            <select id="episode-select" class="player-select">
                                <option value="${this.currentEpisode}">Episode ${this.currentEpisode}</option>
                            </select>
                        </div>
                        <button id="next-episode-btn" class="next-ep-btn">
                            Next Episode ⏭
                        </button>
                    </div>
                    ` : ''}
                </div>

                <div class="subtitle-hint-bar">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
                    </svg>
                    <span><strong>Subtitle Tip:</strong> Click the <strong>CC / Subtitles</strong> button inside the player controls to turn on English, Spanish, French, German, Hindi, or other subtitles.</span>
                </div>

                <div class="video-frame-container" id="video-frame-container">
                    <div class="ad-shield-click-layer" id="ad-shield-click-layer" title="Click to start video (Ad Shield active)">
                        <div class="ad-shield-click-banner">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                            </svg>
                            <span>Click anywhere to start video</span>
                        </div>
                    </div>
                    <iframe 
                        id="player-iframe"
                        src="${embedUrl}" 
                        allowfullscreen="true" 
                        webkitallowfullscreen="true" 
                        mozallowfullscreen="true"
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                        referrerpolicy="no-referrer"
                        scrolling="no"
                        title="Video Player"
                    ></iframe>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        // Close modal
        document.getElementById('close-player-btn')?.addEventListener('click', () => this.close());
        document.getElementById('player-backdrop')?.addEventListener('click', () => this.close());

        // Ad shield overlay click absorb
        const clickLayer = document.getElementById('ad-shield-click-layer');
        if (clickLayer) {
            clickLayer.addEventListener('click', () => {
                clickLayer.style.display = 'none';
            });
        }

        // Server pills click
        const serverPills = this.container.querySelectorAll('.server-pill');
        serverPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                const srvId = pill.dataset.serverId;
                const found = SERVERS.find(s => s.id === srvId);
                if (found && found.id !== this.currentServer.id) {
                    this.currentServer = found;
                    this.switchServer();
                }
            });
        });

        // TV Selectors
        const seasonSelect = document.getElementById('season-select');
        const episodeSelect = document.getElementById('episode-select');
        const nextEpBtn = document.getElementById('next-episode-btn');

        seasonSelect?.addEventListener('change', (e) => {
            this.currentSeason = parseInt(e.target.value, 10);
            this.currentEpisode = 1;
            this.updateEpisodeOptions();
            this.switchServer();
        });

        episodeSelect?.addEventListener('change', (e) => {
            this.currentEpisode = parseInt(e.target.value, 10);
            this.switchServer();
        });

        nextEpBtn?.addEventListener('click', () => {
            this.currentEpisode += 1;
            if (episodeSelect) episodeSelect.value = this.currentEpisode;
            this.switchServer();
        });
    }

    switchServer() {
        const isTv = this.currentMedia.media_type === 'tv' || !!this.currentMedia.first_air_date;
        const iframe = document.getElementById('player-iframe');
        if (!iframe) return;

        // Update active pill UI
        const pills = this.container.querySelectorAll('.server-pill');
        pills.forEach(p => {
            p.classList.toggle('active', p.dataset.serverId === this.currentServer.id);
        });

        // Save progress to history
        Storage.addToHistory({
            ...this.currentMedia,
            season: this.currentSeason,
            episode: this.currentEpisode
        });

        // Update badge text if TV
        const badge = this.container.querySelector('.player-badge');
        if (badge && isTv) {
            badge.textContent = `S${this.currentSeason} E${this.currentEpisode}`;
        }

        const newUrl = isTv
            ? this.currentServer.getTvUrl(this.currentMedia.id, this.currentSeason, this.currentEpisode)
            : this.currentServer.getMovieUrl(this.currentMedia.id);

        iframe.src = newUrl;
    }

    updateEpisodeSelectors() {
        if (!this.tvData || !this.tvData.seasons) return;
        const seasonSelect = document.getElementById('season-select');
        if (!seasonSelect) return;

        const validSeasons = this.tvData.seasons.filter(s => s.season_number > 0);
        seasonSelect.innerHTML = validSeasons.map(s => `
            <option value="${s.season_number}" ${s.season_number === this.currentSeason ? 'selected' : ''}>
                Season ${s.season_number} (${s.episode_count} eps)
            </option>
        `).join('');

        this.updateEpisodeOptions();
    }

    updateEpisodeOptions() {
        const episodeSelect = document.getElementById('episode-select');
        if (!episodeSelect) return;

        let epCount = 24; // default estimate
        if (this.tvData && this.tvData.seasons) {
            const sObj = this.tvData.seasons.find(s => s.season_number === this.currentSeason);
            if (sObj) epCount = sObj.episode_count;
        }

        let options = '';
        for (let i = 1; i <= epCount; i++) {
            options += `<option value="${i}" ${i === this.currentEpisode ? 'selected' : ''}>Episode ${i}</option>`;
        }
        episodeSelect.innerHTML = options;
    }

    escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, match => {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return map[match];
        });
    }
}
