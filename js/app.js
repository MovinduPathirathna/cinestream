/**
 * CineStream Main Application Script
 * Single Page App Router, View Controllers, Modal Managers.
 */

import { API } from './api.js';
import { Storage } from './storage.js';
import { Player } from './player.js';
import { SpatialNavigation } from './navigation.js';

class CineStreamApp {
    constructor() {
        this.player = new Player('player-modal');
        this.nav = new SpatialNavigation();
        this.currentView = 'home';
        this.searchTimeout = null;
        this.genresMap = {};

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadGenres();
        this.loadView('home');
    }

    bindEvents() {
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                if (view) this.loadView(view);
            });
        });

        // Logo button -> Home
        document.getElementById('logo-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadView('home');
        });

        // Sticky Header scroll styling
        window.addEventListener('scroll', () => {
            const header = document.getElementById('main-header');
            if (window.scrollY > 40) {
                header?.classList.add('scrolled');
            } else {
                header?.classList.remove('scrolled');
            }
        });

        // Search Input
        const searchInput = document.getElementById('search-input');
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value;
            if (query.trim().length >= 2) {
                this.searchTimeout = setTimeout(() => this.handleSearch(query), 350);
            } else if (query.trim().length === 0 && this.currentView === 'search') {
                this.loadView('home');
            }
        });

        // Settings Modal
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        const tmdbInput = document.getElementById('tmdb-key-input');

        settingsBtn?.addEventListener('click', () => {
            tmdbInput.value = Storage.getApiKey();
            settingsModal.classList.remove('hidden');
        });

        closeSettingsBtn?.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        saveSettingsBtn?.addEventListener('click', () => {
            Storage.setApiKey(tmdbInput.value);
            settingsModal.classList.add('hidden');
            alert('API Key updated successfully!');
            this.loadView(this.currentView);
        });

        // Filters for Movies view
        document.getElementById('movie-genre-select')?.addEventListener('change', () => this.loadMoviesView());
        document.getElementById('movie-sort-select')?.addEventListener('change', () => this.loadMoviesView());

        // Filters for TV view
        document.getElementById('tv-genre-select')?.addEventListener('change', () => this.loadTVShowsView());
        document.getElementById('tv-sort-select')?.addEventListener('change', () => this.loadTVShowsView());
    }

    async loadGenres() {
        try {
            const [mRes, tRes] = await Promise.all([
                API.getGenres('movie'),
                API.getGenres('tv')
            ]);

            const movieGenres = mRes.genres || [];
            const tvGenres = tRes.genres || [];

            movieGenres.forEach(g => { this.genresMap[g.id] = g.name; });
            tvGenres.forEach(g => { this.genresMap[g.id] = g.name; });

            // Populate select options
            const mSelect = document.getElementById('movie-genre-select');
            if (mSelect) {
                mSelect.innerHTML = '<option value="">All Genres</option>' + 
                    movieGenres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
            }

            const tSelect = document.getElementById('tv-genre-select');
            if (tSelect) {
                tSelect.innerHTML = '<option value="">All Genres</option>' + 
                    tvGenres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
            }
        } catch (e) {
            console.warn('Could not load genres:', e);
        }
    }

    loadView(viewName) {
        this.currentView = viewName;

        // Update nav styling
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        // Hide all views
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));

        // Show target view
        const target = document.getElementById(`${viewName}-view`);
        if (target) target.classList.remove('hidden');

        // Scroll to top
        window.scrollTo(0, 0);

        // Load data for view
        switch (viewName) {
            case 'home':
                this.loadHomeView();
                break;
            case 'movies':
                this.loadMoviesView();
                break;
            case 'tvshows':
                this.loadTVShowsView();
                break;
            case 'mylist':
                this.loadMyListView();
                break;
        }

        setTimeout(() => this.nav.focusDefault(), 400);
    }

    // HOME VIEW
    async loadHomeView() {
        try {
            // Load Hero Banner with trending item
            const trendingRes = await API.getTrending('all', 'day');
            const trendingList = trendingRes.results || [];

            if (trendingList.length > 0) {
                this.renderHero(trendingList[0]);
                this.renderCarousel('trending-carousel', trendingList);
            }

            // Suggested Row based on Watch History
            this.loadSuggestedRow();

            // Load Popular Movies
            const popMovies = await API.getPopularMovies();
            this.renderCarousel('popular-movies-carousel', popMovies.results || []);

            // Load Top Rated TV
            const topTV = await API.getTopRatedTV();
            this.renderCarousel('top-tv-carousel', topTV.results || []);

            // Load Action Movies (Genre ID 28)
            const actionRes = await API.discover('movie', { with_genres: 28 });
            this.renderCarousel('action-carousel', actionRes.results || []);

            // Load Sci-Fi (Genre ID 878)
            const scifiRes = await API.discover('movie', { with_genres: 878 });
            this.renderCarousel('scifi-carousel', scifiRes.results || []);

        } catch (err) {
            console.error('Error loading home view:', err);
        }
    }

    async loadSuggestedRow() {
        const topGenres = Storage.getTopGenresFromHistory();
        const suggestedRow = document.getElementById('suggested-row');
        if (!topGenres.length) {
            suggestedRow?.classList.add('hidden');
            return;
        }

        try {
            const genreId = topGenres[0];
            const res = await API.discover('movie', { with_genres: genreId, sort_by: 'popularity.desc' });
            if (res.results && res.results.length) {
                suggestedRow?.classList.remove('hidden');
                this.renderCarousel('suggested-carousel', res.results);
            }
        } catch (e) {
            console.warn('Suggested row error:', e);
        }
    }

    renderHero(item) {
        const heroBanner = document.getElementById('hero-banner');
        const heroContent = document.getElementById('hero-content');
        if (!heroBanner || !heroContent) return;

        const backdrop = API.getBackdropUrl(item.backdrop_path);
        const title = item.title || item.name;
        const type = item.media_type || (item.title ? 'movie' : 'tv');
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);

        heroBanner.style.backgroundImage = `url('${backdrop}')`;

        heroContent.innerHTML = `
            <div class="hero-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                #1 Featured Today
            </div>
            <h1 class="hero-title">${this.escapeHtml(title)}</h1>
            <div class="hero-meta">
                <span class="rating-badge">${rating} TMDB</span>
                <span>${year}</span>
                <span style="text-transform: uppercase; border: 1px solid var(--border-gray); padding: 1px 6px; border-radius: 3px; font-size: 0.8rem;">
                    ${type}
                </span>
            </div>
            <p class="hero-overview">${this.escapeHtml(item.overview || '')}</p>
            <div class="hero-buttons">
                <button class="btn btn-red" id="hero-play-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    Play Now
                </button>
                <button class="btn btn-secondary" id="hero-info-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    More Info
                </button>
            </div>
        `;

        document.getElementById('hero-play-btn')?.addEventListener('click', () => {
            this.player.open(item);
        });

        document.getElementById('hero-info-btn')?.addEventListener('click', () => {
            this.openDetailModal(type, item.id);
        });
    }

    renderCarousel(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = items.map(item => this.createCardHtml(item)).join('');
        this.bindCardEvents(container);
    }

    // MOVIES VIEW
    async loadMoviesView() {
        const genre = document.getElementById('movie-genre-select')?.value || '';
        const sort = document.getElementById('movie-sort-select')?.value || 'popularity.desc';
        const grid = document.getElementById('movies-grid');
        if (!grid) return;

        grid.innerHTML = '<p style="color: var(--text-muted);">Loading movies...</p>';

        try {
            const params = { sort_by: sort };
            if (genre) params.with_genres = genre;

            const res = await API.discover('movie', params);
            grid.innerHTML = (res.results || []).map(item => this.createCardHtml({ ...item, media_type: 'movie' })).join('');
            this.bindCardEvents(grid);
        } catch (err) {
            grid.innerHTML = '<p>Error loading movies.</p>';
        }
    }

    // TV SHOWS VIEW
    async loadTVShowsView() {
        const genre = document.getElementById('tv-genre-select')?.value || '';
        const sort = document.getElementById('tv-sort-select')?.value || 'popularity.desc';
        const grid = document.getElementById('tvshows-grid');
        if (!grid) return;

        grid.innerHTML = '<p style="color: var(--text-muted);">Loading TV shows...</p>';

        try {
            const params = { sort_by: sort };
            if (genre) params.with_genres = genre;

            const res = await API.discover('tv', params);
            grid.innerHTML = (res.results || []).map(item => this.createCardHtml({ ...item, media_type: 'tv' })).join('');
            this.bindCardEvents(grid);
        } catch (err) {
            grid.innerHTML = '<p>Error loading TV shows.</p>';
        }
    }

    // MY LIST VIEW
    loadMyListView() {
        const grid = document.getElementById('mylist-grid');
        if (!grid) return;

        const list = Storage.getMyList();
        if (!list.length) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: var(--text-muted);">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    <h3>Your list is empty</h3>
                    <p style="margin-top: 6px;">Add movies and TV shows to your watchlist to watch them later.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = list.map(item => this.createCardHtml(item)).join('');
        this.bindCardEvents(grid);
    }

    // SEARCH VIEW
    async handleSearch(query) {
        this.loadView('search');
        const titleEl = document.getElementById('search-title');
        const grid = document.getElementById('search-grid');
        if (titleEl) titleEl.textContent = `Search Results for "${query}"`;
        if (grid) grid.innerHTML = '<p style="color: var(--text-muted);">Searching...</p>';

        try {
            const res = await API.searchMulti(query);
            const validResults = (res.results || []).filter(item => item.media_type === 'movie' || item.media_type === 'tv');

            if (!validResults.length) {
                if (grid) grid.innerHTML = `<p style="grid-column: 1 / -1; color: var(--text-muted);">No movies or TV shows found matching "${query}".</p>`;
                return;
            }

            if (grid) {
                grid.innerHTML = validResults.map(item => this.createCardHtml(item)).join('');
                this.bindCardEvents(grid);
            }
        } catch (err) {
            if (grid) grid.innerHTML = '<p>Error searching content.</p>';
        }
    }

    createCardHtml(item) {
        const title = item.title || item.name;
        const type = item.media_type || (item.title ? 'movie' : 'tv');
        const poster = API.getImageUrl(item.poster_path, 'w500');
        const vote = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const year = (item.release_date || item.first_air_date || '').substring(0, 4);
        const isBookmarked = Storage.isInMyList(item.id, type);

        return `
            <div class="media-card" data-id="${item.id}" data-type="${type}">
                <button class="card-bookmark-btn ${isBookmarked ? 'active' : ''}" title="Save to My List" data-id="${item.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>

                <img class="poster-img" src="${poster}" alt="${this.escapeHtml(title)}" loading="lazy">

                <div class="card-play-btn">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>

                <div class="media-card-overlay">
                    <div class="card-title">${this.escapeHtml(title)}</div>
                    <div class="card-meta">
                        <span class="card-vote">★ ${vote}</span>
                        <span>${year}</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindCardEvents(container) {
        // Click card -> Open Detail Modal
        container.querySelectorAll('.media-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // If clicked bookmark button, don't trigger modal
                if (e.target.closest('.card-bookmark-btn')) return;

                const id = card.dataset.id;
                const type = card.dataset.type;
                this.openDetailModal(type, id);
            });
        });

        // Bookmark toggle
        container.querySelectorAll('.card-bookmark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.media-card');
                const id = card.dataset.id;
                const type = card.dataset.type;

                const isAdded = Storage.toggleMyList({ id, media_type: type, title: card.querySelector('.card-title')?.textContent });
                btn.classList.toggle('active', isAdded);

                // If currently on mylist view, refresh
                if (this.currentView === 'mylist') {
                    this.loadMyListView();
                }
            });
        });
    }

    async openDetailModal(type, id) {
        const modal = document.getElementById('detail-modal');
        const content = document.getElementById('detail-modal-content');
        if (!modal || !content) return;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        content.innerHTML = '<div style="padding: 50px; text-align: center;">Loading details...</div>';

        try {
            const data = await API.getDetails(type, id);
            const title = data.title || data.name;
            const backdrop = API.getBackdropUrl(data.backdrop_path);
            const year = (data.release_date || data.first_air_date || '').substring(0, 4);
            const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
            const runtime = data.runtime ? `${data.runtime} mins` : (data.number_of_seasons ? `${data.number_of_seasons} Seasons` : '');
            const isBookmarked = Storage.isInMyList(data.id, type);

            content.innerHTML = `
                <div class="detail-banner" style="background-image: url('${backdrop}')">
                    <div class="detail-banner-overlay"></div>
                    <button class="icon-btn" id="close-detail-btn" style="position: absolute; top: 16px; right: 16px; z-index: 10; background: rgba(0,0,0,0.6);" aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <div class="detail-header-content">
                        <h1 class="detail-title">${this.escapeHtml(title)}</h1>
                        <div class="hero-meta">
                            <span class="rating-badge">${rating} TMDB</span>
                            <span>${year}</span>
                            <span>${runtime}</span>
                        </div>
                        <div class="hero-buttons">
                            <button class="btn btn-red" id="modal-play-btn">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                Watch Now
                            </button>
                            <button class="btn btn-secondary" id="modal-bookmark-btn">
                                ${isBookmarked ? '✓ In My List' : '+ Add to My List'}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="detail-body">
                    <div class="detail-grid">
                        <div>
                            <h3 style="margin-bottom: 8px; font-size: 1.1rem;">Overview</h3>
                            <p style="color: var(--text-gray-light); line-height: 1.6; margin-bottom: 20px;">
                                ${this.escapeHtml(data.overview || 'No overview available.')}
                            </p>

                            ${data.credits && data.credits.cast && data.credits.cast.length ? `
                                <h3 style="margin-bottom: 12px; font-size: 1.1rem;">Top Cast</h3>
                                <div class="cast-list">
                                    ${data.credits.cast.slice(0, 8).map(c => `
                                        <div class="cast-item">
                                            <img class="cast-avatar" src="${API.getImageUrl(c.profile_path, 'w185')}" alt="${this.escapeHtml(c.name)}">
                                            <div class="cast-name">${this.escapeHtml(c.name)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>

                        <div>
                            <div style="background: var(--bg-card); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-gray);">
                                <h4 style="margin-bottom: 10px; font-size: 0.95rem; color: var(--text-muted);">Genres</h4>
                                <div class="genre-tags">
                                    ${(data.genres || []).map(g => `<span class="genre-tag">${g.name}</span>`).join('')}
                                </div>
                                
                                ${data.status ? `
                                    <div style="margin-top: 14px; font-size: 0.85rem;">
                                        <span style="color: var(--text-muted);">Status: </span>
                                        <strong>${data.status}</strong>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Modal event handlers
            document.getElementById('close-detail-btn')?.addEventListener('click', () => {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            });

            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            };

            document.getElementById('modal-play-btn')?.addEventListener('click', () => {
                modal.classList.add('hidden');
                this.player.open(data);
            });

            const bookmarkBtn = document.getElementById('modal-bookmark-btn');
            bookmarkBtn?.addEventListener('click', () => {
                const added = Storage.toggleMyList(data);
                bookmarkBtn.textContent = added ? '✓ In My List' : '+ Add to My List';
            });

        } catch (err) {
            content.innerHTML = '<div style="padding: 30px;">Error loading title details.</div>';
        }
    }

    escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, match => {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return map[match];
        });
    }
}

// Instantiate app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CineStreamApp();
});
