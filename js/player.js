/**
 * CineStream Video Player Module
 * Cleaner embed sources + aggressive popup/ad blocker + TV remote support
 */

import { Storage } from './storage.js';
import { API } from './api.js';

// ─── Popup / Ad Blocker ──────────────────────────────────────────────────────
// Override window.open so that ANY popup from the page or its iframes is killed
(function installPopupKiller() {
    // Block window.open globally
    const _origOpen = window.open.bind(window);
    window.open = function(url, target, features) {
        // Allow only same-origin or empty calls (e.g., print dialog)
        if (!url || url === 'about:blank') return _origOpen(url, target, features);
        console.info('[AdBlocker] Killed popup:', url);
        return null;
    };

    // Observer to nuke any DOM elements injected outside the player container
    // (some ads inject divs/iframes at top level)
    const adPatterns = [
        /doubleclick/i, /googlesyndication/i, /adnxs/i, /adsrvr/i,
        /popads/i, /popcash/i, /trafficjunky/i, /exoclick/i,
        /adsterra/i, /hilltopads/i, /propellerads/i, /ad\.js/i,
        /ads\.js/i, /banner/i
    ];

    function isAdElement(el) {
        const src = el.src || el.href || el.action || '';
        const id  = el.id  || '';
        const cls = el.className || '';
        return adPatterns.some(p => p.test(src) || p.test(id) || p.test(cls));
    }

    const bodyObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return; // element nodes only
                // Kill ad iframes / scripts injected into <body>
                if ((node.tagName === 'IFRAME' || node.tagName === 'SCRIPT') && isAdElement(node)) {
                    console.info('[AdBlocker] Removed injected ad element:', node.src);
                    node.remove();
                    return;
                }
                // Kill overlay divs with very high z-index (ad popover pattern)
                if (node.tagName === 'DIV' || node.tagName === 'A') {
                    const style = window.getComputedStyle(node);
                    const z = parseInt(style.zIndex, 10);
                    if (z > 9000 && style.position === 'fixed' && isAdElement(node)) {
                        console.info('[AdBlocker] Removed high-z ad overlay');
                        node.remove();
                    }
                }
            });
        });
    });
    bodyObserver.observe(document.body, { childList: true, subtree: false });
})();

// ─── Server Definitions ──────────────────────────────────────────────────────
// Servers ordered by cleanliness (fewest ads first)
export const SERVERS = [
    {
        id: 'vidsrcto',
        name: 'VidSrc.to',
        badge: 'Recommended',
        hasSubs: true,
        getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
        getTvUrl:    (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`
    },
    {
        id: 'autoembed',
        name: 'AutoEmbed (Clean)',
        badge: 'Clean',
        hasSubs: true,
        getMovieUrl: (id) => `https://autoembed.cc/movie/tmdb/${id}`,
        getTvUrl:    (id, s, e) => `https://autoembed.cc/tv/tmdb/${id}-${s}-${e}`
    },
    {
        id: 'vidsrcxyz',
        name: 'VidSrc.xyz',
        badge: 'Clean',
        hasSubs: true,
        getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
        getTvUrl:    (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`
    },
    {
        id: 'embed3',
        name: 'embed3.me',
        badge: 'Fast',
        hasSubs: true,
        getMovieUrl: (id) => `https://www.embed3.me/embed/movie/${id}`,
        getTvUrl:    (id, s, e) => `https://www.embed3.me/embed/tv/${id}/${s}/${e}`
    },
    {
        id: 'multiembed',
        name: 'MultiEmbed',
        badge: 'Multi',
        hasSubs: true,
        getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
        getTvUrl:    (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`
    },
    {
        id: 'embed2',
        name: '2Embed',
        badge: 'HD',
        hasSubs: true,
        getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
        getTvUrl:    (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`
    }
];


// ─── Player Class ────────────────────────────────────────────────────────────
export class Player {
    constructor(containerId) {
        this.container      = document.getElementById(containerId);
        this.currentMedia   = null;
        this.currentServer  = SERVERS[0];
        this.currentSeason  = 1;
        this.currentEpisode = 1;
        this.tvData         = null;
        this._overlayTimer  = null;
    }

    async open(media, season = 1, episode = 1) {
        this.currentMedia   = media;
        this.currentSeason  = season;
        this.currentEpisode = episode;

        Storage.addToHistory({ ...media, season, episode });

        this.container.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        this.renderPlayerModal();

        if (media.media_type === 'tv' || media.first_air_date) {
            await this.loadTVDetails(media.id);
        }
    }

    close() {
        this.container.classList.add('hidden');
        document.body.style.overflow = '';
        this.container.innerHTML = '';
        this.currentMedia = null;
        if (this._overlayTimer) clearInterval(this._overlayTimer);
    }

    async loadTVDetails(id) {
        try {
            this.tvData = await API.getDetails('tv', id);
            this.updateEpisodeSelectors();
        } catch (err) {
            console.warn('Could not fetch TV details:', err);
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────
    renderPlayerModal() {
        const isTv  = this.currentMedia.media_type === 'tv' || !!this.currentMedia.first_air_date;
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
                        <div class="ad-shield-status" title="Ad-Shield Active — Popups & Overlays Blocked">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                            </svg>
                            <span>Ad-Shield Active</span>
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
                        <span class="toolbar-label">Server:</span>
                        ${SERVERS.map(srv => `
                            <button class="server-pill focusable ${srv.id === this.currentServer.id ? 'active' : ''}" data-server-id="${srv.id}">
                                <span>${srv.name}</span>
                                <span class="sub-badge">${srv.badge}</span>
                            </button>
                        `).join('')}
                    </div>

                    ${isTv ? `
                    <div class="tv-navigation-controls">
                        <div class="select-wrapper">
                            <label>Season:</label>
                            <select id="season-select" class="player-select focusable">
                                <option value="${this.currentSeason}">Season ${this.currentSeason}</option>
                            </select>
                        </div>
                        <div class="select-wrapper">
                            <label>Episode:</label>
                            <select id="episode-select" class="player-select focusable">
                                <option value="${this.currentEpisode}">Episode ${this.currentEpisode}</option>
                            </select>
                        </div>
                        <button id="next-episode-btn" class="next-ep-btn focusable">
                            Next Episode ⏭
                        </button>
                    </div>
                    ` : ''}
                </div>

                <div class="video-frame-container" id="video-frame-container">
                    <!-- Shield overlay: absorbs the first click which would normally trigger an ad -->
                    <div class="ad-shield-click-layer" id="ad-shield-click-layer">
                        <div class="ad-shield-click-banner">
                            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                            </svg>
                            <span>Press <kbd>Enter / OK</kbd> to Start — Ad-Shield Active</span>
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

                <div class="subtitle-hint-bar">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>
                    </svg>
                    <span><strong>Subtitles:</strong> Use the CC / Subtitles button inside the player. If missing, try a different server above.</span>
                </div>
            </div>
        `;

        this.bindEvents();
        this.startAdSweeper();
    }

    // ── Periodic Ad Sweeper ──────────────────────────────────────────────────
    // Runs every 500 ms and kills any popup/overlay iframes injected outside the player
    startAdSweeper() {
        const playerModal = this.container;

        this._overlayTimer = setInterval(() => {
            // Remove any <iframe> added outside #player-modal (ad popups)
            document.querySelectorAll('body > iframe, body > div > iframe').forEach(f => {
                if (!playerModal.contains(f)) {
                    f.remove();
                }
            });

            // Kill fixed-position overlays with insane z-index outside player
            document.querySelectorAll('body > div, body > a').forEach(el => {
                if (playerModal.contains(el)) return;
                const st = window.getComputedStyle(el);
                if (st.position === 'fixed' && parseInt(st.zIndex, 10) > 9000) {
                    el.remove();
                }
            });
        }, 500);
    }

    // ── Events ───────────────────────────────────────────────────────────────
    bindEvents() {
        document.getElementById('close-player-btn')
            ?.addEventListener('click', () => this.close());
        document.getElementById('player-backdrop')
            ?.addEventListener('click', () => this.close());

        // Shield click layer — dismiss it on click OR Enter key (TV remote)
        const clickLayer = document.getElementById('ad-shield-click-layer');
        if (clickLayer) {
            const dismiss = () => { clickLayer.style.display = 'none'; };
            clickLayer.addEventListener('click', dismiss);
            clickLayer.addEventListener('keydown', e => { if (e.key === 'Enter') dismiss(); });
        }

        // Server pills
        this.container.querySelectorAll('.server-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                const found = SERVERS.find(s => s.id === pill.dataset.serverId);
                if (found && found.id !== this.currentServer.id) {
                    this.currentServer = found;
                    this.switchServer();
                }
            });
        });

        // TV selectors
        const seasonSelect  = document.getElementById('season-select');
        const episodeSelect = document.getElementById('episode-select');
        const nextEpBtn     = document.getElementById('next-episode-btn');

        seasonSelect?.addEventListener('change', (e) => {
            this.currentSeason  = parseInt(e.target.value, 10);
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

    // ── Server Switch ────────────────────────────────────────────────────────
    switchServer() {
        const isTv  = this.currentMedia.media_type === 'tv' || !!this.currentMedia.first_air_date;
        const iframe = document.getElementById('player-iframe');
        if (!iframe) return;

        // Update active pill
        this.container.querySelectorAll('.server-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.serverId === this.currentServer.id);
        });

        Storage.addToHistory({
            ...this.currentMedia,
            season:  this.currentSeason,
            episode: this.currentEpisode
        });

        const badge = this.container.querySelector('.player-badge');
        if (badge && isTv) badge.textContent = `S${this.currentSeason} E${this.currentEpisode}`;

        const newUrl = isTv
            ? this.currentServer.getTvUrl(this.currentMedia.id, this.currentSeason, this.currentEpisode)
            : this.currentServer.getMovieUrl(this.currentMedia.id);

        iframe.src = newUrl;

        // Re-show shield briefly after server change
        const clickLayer = document.getElementById('ad-shield-click-layer');
        if (clickLayer) clickLayer.style.display = 'flex';
    }

    // ── Episode Selectors ────────────────────────────────────────────────────
    updateEpisodeSelectors() {
        if (!this.tvData?.seasons) return;
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

        let epCount = 24;
        if (this.tvData?.seasons) {
            const sObj = this.tvData.seasons.find(s => s.season_number === this.currentSeason);
            if (sObj) epCount = sObj.episode_count;
        }

        let options = '';
        for (let i = 1; i <= epCount; i++) {
            options += `<option value="${i}" ${i === this.currentEpisode ? 'selected' : ''}>Episode ${i}</option>`;
        }
        episodeSelect.innerHTML = options;
    }

    // ── Utility ──────────────────────────────────────────────────────────────
    escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }
}
