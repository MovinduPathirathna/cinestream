/* ============================================================
   js/components/tvshows.js — TV Shows Section
   ============================================================ */
var TVShowsScreen = (function () {

  var GENRES = [
    { id: '',    name: 'All' },
    { id: 10759, name: 'Action' },
    { id: 16,    name: 'Animation' },
    { id: 35,    name: 'Comedy' },
    { id: 80,    name: 'Crime' },
    { id: 99,    name: 'Documentary' },
    { id: 18,    name: 'Drama' },
    { id: 10765, name: 'Sci-Fi' },
    { id: 10764, name: 'Reality' },
    { id: 10767, name: 'Talk Show' },
    { id: 9648,  name: 'Mystery' },
    { id: 10766, name: 'Soap' }
  ];

  var _activeGenre = '';
  var _sort = 'popularity.desc';
  var _page = 1;
  var _loading = false;

  function _buildCard(item) {
    var title  = API.getTitle(item);
    var year   = API.getReleaseYear(item);
    var rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    var poster = API.imgUrl(item.poster_path, API.IMG_W500);

    var card = document.createElement('div');
    card.className = 'card focusable';
    card.setAttribute('tabindex', '0');
    card.title = title;

    card.innerHTML =
      (poster
        ? '<img class="card-poster" src="' + poster + '" alt="' + title + '" loading="lazy">'
        : '<div class="card-poster-placeholder">📺</div>') +
      '<div class="card-play-overlay"><div class="card-play-btn">▶</div></div>' +
      '<span class="card-badge tv">TV</span>' +
      '<div class="card-info">' +
        '<div class="card-title">' + title + '</div>' +
        '<div class="card-meta"><span>' + year + '</span><span class="card-rating">★ ' + rating + '</span></div>' +
      '</div>';

    card.addEventListener('click', function () {
      App.navigate('detail', { id: item.id, type: 'tv', item: item });
    });

    return card;
  }

  function _loadShows(append) {
    if (_loading) return;
    _loading = true;
    var grid = document.getElementById('tv-grid');
    if (!grid) return;

    if (!append) {
      grid.innerHTML = '';
      for (var i = 0; i < 16; i++) {
        var sk = document.createElement('div');
        sk.className = 'skeleton skeleton-card';
        grid.appendChild(sk);
      }
    }

    var params = { sort_by: _sort, page: _page };
    if (_activeGenre) params['with_genres'] = _activeGenre;

    API.discover('tv', params).then(function (data) {
      if (!append) grid.innerHTML = '';
      (data.results || []).forEach(function (item) {
        grid.appendChild(_buildCard(item));
      });
      _loading = false;
    }).catch(function (e) {
      console.error('tv load', e);
      _loading = false;
    });
  }

  function render(container) {
    container.innerHTML =
      '<div class="scrollable">' +
        '<div style="padding:40px 60px 24px;">' +
          '<h1 style="font-family:\'Bebas Neue\',sans-serif;font-size:48px;letter-spacing:2px;margin-bottom:4px;">📺 TV Shows</h1>' +
          '<p style="color:var(--text-muted);font-size:14px;">Binge-worthy series from across the globe</p>' +
        '</div>' +
        '<div class="genre-bar" id="tv-genre-bar"></div>' +
        '<div style="display:flex;align-items:center;gap:16px;padding:16px 60px;">' +
          '<span style="font-size:13px;color:var(--text-muted);">Sort by:</span>' +
          '<select id="tv-sort" style="background:var(--bg-elevated);color:#fff;border:1px solid var(--border-subtle);border-radius:8px;padding:8px 14px;font-size:14px;outline:none;cursor:pointer;">' +
            '<option value="popularity.desc">Most Popular</option>' +
            '<option value="vote_average.desc">Highest Rated</option>' +
            '<option value="first_air_date.desc">Newest</option>' +
          '</select>' +
        '</div>' +
        '<div id="tv-grid" style="display:grid;grid-template-columns:repeat(8,1fr);gap:16px;padding:0 60px 40px;"></div>' +
        '<div style="padding:0 60px 40px;text-align:center;">' +
          '<button id="tv-load-more" class="btn-outline focusable" tabindex="0" style="padding:14px 48px;font-size:15px;">Load More</button>' +
        '</div>' +
      '</div>';

    // Genre bar
    var genreBar = document.getElementById('tv-genre-bar');
    GENRES.forEach(function (g) {
      var chip = document.createElement('div');
      chip.className = 'genre-chip focusable' + (g.id === _activeGenre ? ' active' : '');
      chip.setAttribute('tabindex', '0');
      chip.textContent = g.name;
      chip.addEventListener('click', function () {
        _activeGenre = g.id;
        _page = 1;
        genreBar.querySelectorAll('.genre-chip').forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        _loadShows(false);
      });
      genreBar.appendChild(chip);
    });

    // Sort
    var sortEl = document.getElementById('tv-sort');
    sortEl.value = _sort;
    sortEl.addEventListener('change', function () {
      _sort = sortEl.value;
      _page = 1;
      _loadShows(false);
    });

    // Load more
    var loadMore = document.getElementById('tv-load-more');
    loadMore.addEventListener('click', function () {
      _page++;
      _loadShows(true);
    });

    _page = 1;
    _loadShows(false);
    Navigation.focusFirst(container);
  }

  return { render };
})();
