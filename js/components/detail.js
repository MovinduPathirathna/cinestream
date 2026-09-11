/* ============================================================
   js/components/detail.js — Detail / Info Screen
   ============================================================ */
var DetailScreen = (function () {

  var _currentItem = null;
  var _currentSeason = 1;
  var _seasons = [];

  function _formatRuntime(minutes) {
    if (!minutes) return '';
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return (h > 0 ? h + 'h ' : '') + m + 'm';
  }

  function _buildSimilarCard(item) {
    var type   = API.getMediaType(item);
    var title  = API.getTitle(item);
    var poster = API.imgUrl(item.poster_path, API.IMG_W500);
    var rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    var card = document.createElement('div');
    card.className = 'card focusable';
    card.setAttribute('tabindex', '0');
    card.style.width = '160px';
    card.title = title;

    card.innerHTML =
      (poster
        ? '<img class="card-poster" src="' + poster + '" alt="' + title + '" loading="lazy" style="height:240px;">'
        : '<div class="card-poster-placeholder" style="height:240px;">🎬</div>') +
      '<div class="card-play-overlay"><div class="card-play-btn">▶</div></div>' +
      '<div class="card-info">' +
        '<div class="card-title">' + title + '</div>' +
        '<div class="card-meta"><span class="card-rating">★ ' + rating + '</span></div>' +
      '</div>';

    card.addEventListener('click', function () {
      App.navigate('detail', { id: item.id, type: type, item: item });
    });
    return card;
  }

  function _renderEpisodes(tvId, season, container) {
    container.innerHTML = '<div style="color:var(--text-muted);padding:8px;">Loading episodes…</div>';
    API.getSeasonDetails(tvId, season).then(function (data) {
      container.innerHTML = '';
      (data.episodes || []).forEach(function (ep) {
        var row = document.createElement('div');
        row.className = 'episode-row focusable';
        row.setAttribute('tabindex', '0');
        row.innerHTML =
          '<span class="episode-num">E' + ep.episode_number + '</span>' +
          '<span class="episode-title">' + (ep.name || 'Episode ' + ep.episode_number) + '</span>' +
          '<span class="episode-runtime">' + _formatRuntime(ep.runtime) + '</span>' +
          '<div class="episode-play-btn">▶</div>';

        row.addEventListener('click', function () {
          Storage.addToHistory({
            id: tvId,
            type: 'tv',
            title: _currentItem ? API.getTitle(_currentItem) : '',
            poster_path: _currentItem ? _currentItem.poster_path : null
          });
          App.navigate('player', { id: tvId, type: 'tv', season: season, episode: ep.episode_number });
        });
        container.appendChild(row);
      });
    }).catch(function () {
      container.innerHTML = '<div style="color:var(--text-muted);padding:8px;">Could not load episodes.</div>';
    });
  }

  function render(container, params) {
    params = params || {};
    var id   = params.id;
    var type = params.type || 'movie';

    // Show loading
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:20px;">' +
        '<div class="spinner"></div>' +
        '<div style="color:var(--text-muted);">Loading…</div>' +
      '</div>';

    API.getDetails(type, id).then(function (data) {
      _currentItem = data;
      _renderDetail(container, data, type);
    }).catch(function (e) {
      console.error('detail', e);
      // Use basic info if available
      if (params.item) {
        _renderDetail(container, params.item, type);
      } else {
        container.innerHTML = '<div style="padding:60px;color:var(--text-muted);">Failed to load details.</div>';
      }
    });

    // Back button
    Navigation.onBack(function () { App.goBack(); });
  }

  function _renderDetail(container, data, type) {
    var title    = API.getTitle(data);
    var year     = API.getReleaseYear(data);
    var rating   = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
    var runtime  = type === 'movie' ? _formatRuntime(data.runtime) : ((data.number_of_seasons || 1) + ' Season' + (data.number_of_seasons !== 1 ? 's' : ''));
    var overview = data.overview || '';
    var backdrop = API.imgUrl(data.backdrop_path, API.IMG_W1280);
    var poster   = API.imgUrl(data.poster_path, API.IMG_W500);
    var genres   = (data.genres || []).map(function (g) { return '<span class="detail-genre">' + g.name + '</span>'; }).join('');
    var cast     = ((data.credits && data.credits.cast) || []).slice(0, 12);

    _seasons = data.seasons || [];
    _currentSeason = 1;

    container.innerHTML =
      '<div class="scrollable detail-enter">' +
        '<div class="detail-backdrop">' +
          (backdrop ? '<img class="detail-backdrop-img" src="' + backdrop + '" alt="">' : '<div class="detail-backdrop-img" style="background:#111;"></div>') +
          '<div class="detail-backdrop-gradient"></div>' +
        '</div>' +

        '<div class="detail-content">' +
          (poster
            ? '<img class="detail-poster" src="' + poster + '" alt="' + title + '">'
            : '<div class="detail-poster-placeholder">' + (type === 'tv' ? '📺' : '🎬') + '</div>') +

          '<div class="detail-info">' +
            '<div class="detail-genres">' + genres + '</div>' +
            '<div class="detail-title">' + title + '</div>' +
            '<div class="detail-meta">' +
              '<span class="rating">★ ' + rating + '<span style="font-size:12px;color:var(--text-muted);font-weight:400;">/10</span></span>' +
              (year ? '<span>' + year + '</span>' : '') +
              (runtime ? '<span>' + runtime + '</span>' : '') +
              '<span style="background:var(--bg-elevated);padding:3px 10px;border-radius:4px;font-size:12px;">' + (type === 'movie' ? 'Movie' : 'TV Series') + '</span>' +
            '</div>' +
            '<div class="detail-description">' + overview + '</div>' +

            '<div class="detail-actions">' +
              '<button id="detail-play-btn" class="btn-play btn-ripple focusable" tabindex="0">▶ ' + (type === 'tv' ? 'Watch S1 E1' : 'Play Movie') + '</button>' +
              '<button id="detail-trailer-btn" class="btn-outline focusable" tabindex="0">▶ Trailer</button>' +
            '</div>' +

            // TV: Season/Episode picker
            (type === 'tv' && _seasons.length > 0 ?
              '<div class="seasons-section">' +
                '<div style="font-size:18px;font-weight:700;margin-bottom:12px;">Episodes</div>' +
                '<div class="season-tabs" id="season-tabs"></div>' +
                '<div class="episodes-grid" id="episodes-grid"></div>' +
              '</div>' : '') +

            // Cast
            (cast.length > 0 ?
              '<div class="cast-section">' +
                '<div class="cast-section-title">Cast</div>' +
                '<div class="cast-row" id="cast-row"></div>' +
              '</div>' : '') +

          '</div>' +
        '</div>' +

        // Similar titles row
        '<div style="padding:0 60px 60px;">' +
          '<div style="font-size:20px;font-weight:700;margin-bottom:16px;">More Like This</div>' +
          '<div style="display:flex;gap:16px;overflow-x:auto;padding-bottom:8px;" id="similar-row"></div>' +
        '</div>' +

      '</div>';

    // Play button
    var playBtn = document.getElementById('detail-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', function () {
        Storage.addToHistory({ id: data.id, type: type, title: title, poster_path: data.poster_path });
        if (type === 'movie') {
          App.navigate('player', { id: data.id, type: 'movie' });
        } else {
          App.navigate('player', { id: data.id, type: 'tv', season: 1, episode: 1 });
        }
      });
    }

    // Trailer button
    var trailerBtn = document.getElementById('detail-trailer-btn');
    if (trailerBtn) {
      var videos = (data.videos && data.videos.results) || [];
      var trailers = videos.filter(function (v) { return v.type === 'Trailer' && v.site === 'YouTube'; });
      var trailer = trailers.length > 0 ? trailers[0] : videos[0];
      if (trailer) {
        trailerBtn.addEventListener('click', function () {
          var iframe = document.createElement('iframe');
          iframe.src = 'https://www.youtube.com/embed/' + trailer.key + '?autoplay=1';
          iframe.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:9999;background:#000;border:none;';
          iframe.setAttribute('allowfullscreen', '');
          document.body.appendChild(iframe);
          Navigation.onBack(function () {
            document.body.removeChild(iframe);
            Navigation.offBack(arguments.callee);
          });
        });
      } else {
        trailerBtn.style.opacity = '0.4';
        trailerBtn.disabled = true;
      }
    }

    // Season tabs
    if (type === 'tv' && _seasons.length > 0) {
      var tabsEl = document.getElementById('season-tabs');
      var epGrid = document.getElementById('episodes-grid');
      if (tabsEl) {
        var filteredSeasons = _seasons.filter(function (s) { return s.season_number > 0; });
        filteredSeasons.forEach(function (s) {
          var tab = document.createElement('button');
          tab.className = 'season-tab focusable' + (s.season_number === 1 ? ' active' : '');
          tab.setAttribute('tabindex', '0');
          tab.textContent = 'Season ' + s.season_number;
          tab.addEventListener('click', function () {
            _currentSeason = s.season_number;
            tabsEl.querySelectorAll('.season-tab').forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            if (epGrid) _renderEpisodes(data.id, s.season_number, epGrid);
          });
          tabsEl.appendChild(tab);
        });
        if (epGrid && filteredSeasons.length > 0) {
          _renderEpisodes(data.id, 1, epGrid);
        }
      }
    }

    // Cast row
    var castRow = document.getElementById('cast-row');
    if (castRow) {
      cast.forEach(function (person) {
        var avatar = API.imgUrl(person.profile_path, API.IMG_W500);
        var castCard = document.createElement('div');
        castCard.className = 'cast-card focusable';
        castCard.setAttribute('tabindex', '0');
        castCard.innerHTML =
          (avatar ? '<img class="cast-avatar" src="' + avatar + '" alt="' + person.name + '">' : '<div class="cast-avatar" style="background:var(--bg-elevated);border-radius:50%;width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:32px;">👤</div>') +
          '<div class="cast-name">' + person.name + '</div>' +
          '<div class="cast-role">' + (person.character || '') + '</div>';
        castRow.appendChild(castCard);
      });
    }

    // Similar row
    var similar = (data.recommendations && data.recommendations.results) ||
                  (data.similar && data.similar.results) || [];
    var similarRow = document.getElementById('similar-row');
    if (similarRow && similar.length > 0) {
      similar.slice(0, 16).forEach(function (item) {
        similarRow.appendChild(_buildSimilarCard(item));
      });
    }

    Navigation.focusFirst(container);
  }

  return { render };
})();
