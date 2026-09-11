/* ============================================================
   js/components/home.js — Home Screen
   ============================================================ */
var HomeScreen = (function () {

  var _heroItems = [];
  var _heroIdx   = 0;
  var _heroTimer = null;

  // ── Build a card element ──
  function _buildCard(item, badgeLabel, badgeClass) {
    var type    = API.getMediaType(item);
    var title   = API.getTitle(item);
    var year    = API.getReleaseYear(item);
    var rating  = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    var poster  = API.imgUrl(item.poster_path, API.IMG_W500);

    var card = document.createElement('div');
    card.className = 'card focusable';
    card.setAttribute('tabindex', '0');
    card.setAttribute('data-id',   item.id);
    card.setAttribute('data-type', type);
    card.title = title;

    if (poster) {
      card.innerHTML =
        '<img class="card-poster" src="' + poster + '" alt="' + title + '" loading="lazy">' +
        '<div class="card-play-overlay"><div class="card-play-btn">▶</div></div>' +
        (badgeLabel ? '<span class="card-badge ' + (badgeClass||'') + '">' + badgeLabel + '</span>' : '') +
        '<div class="card-info">' +
          '<div class="card-title">' + title + '</div>' +
          '<div class="card-meta"><span>' + year + '</span><span class="card-rating">★ ' + rating + '</span></div>' +
        '</div>';
    } else {
      card.innerHTML =
        '<div class="card-poster-placeholder">🎬</div>' +
        '<div class="card-play-overlay"><div class="card-play-btn">▶</div></div>' +
        (badgeLabel ? '<span class="card-badge ' + (badgeClass||'') + '">' + badgeLabel + '</span>' : '') +
        '<div class="card-info">' +
          '<div class="card-title">' + title + '</div>' +
          '<div class="card-meta"><span>' + year + '</span><span class="card-rating">★ ' + rating + '</span></div>' +
        '</div>';
    }

    card.addEventListener('click', function () {
      App.navigate('detail', { id: item.id, type: type, item: item });
    });

    return card;
  }

  // ── Skeleton cards ──
  function _buildSkeletons(count, wide) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = document.createElement('div');
      s.className = 'skeleton skeleton-card' + (wide ? ' wide' : '');
      frag.appendChild(s);
    }
    return frag;
  }

  // ── Build a section row ──
  function _buildRow(title, icon, items, badgeLabel, badgeClass) {
    var section = document.createElement('div');
    section.className = 'content-section';

    var header = document.createElement('div');
    header.className = 'section-header';
    header.innerHTML =
      '<h2 class="section-title"><span class="icon">' + icon + '</span>' + title + '</h2>';
    section.appendChild(header);

    var wrapper = document.createElement('div');
    wrapper.className = 'row-scroll-wrapper';

    var row = document.createElement('div');
    row.className = 'row-scroll';

    if (!items || items.length === 0) {
      row.appendChild(_buildSkeletons(8));
    } else {
      items.forEach(function (item) {
        row.appendChild(_buildCard(item, badgeLabel, badgeClass));
      });
    }

    wrapper.appendChild(row);
    section.appendChild(wrapper);
    return section;
  }

  // ── Hero Banner ──
  function _buildHero(items) {
    var hero = document.getElementById('hero-banner');
    if (!hero || !items || items.length === 0) return;
    hero.innerHTML = '';
    _heroItems = items.slice(0, 8);
    _heroIdx = 0;

    _heroItems.forEach(function (item, idx) {
      var type     = API.getMediaType(item);
      var title    = API.getTitle(item);
      var year     = API.getReleaseYear(item);
      var rating   = item.vote_average ? item.vote_average.toFixed(1) : '';
      var overview = (item.overview || '').substring(0, 200);
      var backdrop = API.imgUrl(item.backdrop_path, API.IMG_W1280);

      var slide = document.createElement('div');
      slide.className = 'hero-slide' + (idx === 0 ? ' active' : '');

      slide.innerHTML =
        (backdrop ? '<img class="hero-bg" src="' + backdrop + '" alt="">' : '<div class="hero-bg" style="background:#111118;"></div>') +
        '<div class="hero-gradient"></div>' +
        '<div class="hero-content">' +
          '<span class="hero-badge">' + (type === 'movie' ? '🎬 Movie' : '📺 Series') + '</span>' +
          '<div class="hero-title">' + title + '</div>' +
          '<div class="hero-meta">' +
            (rating ? '<span class="rating">★ ' + rating + '/10</span>' : '') +
            (year   ? '<span>' + year + '</span>' : '') +
            '<span>' + (type === 'movie' ? 'Movie' : 'TV Show') + '</span>' +
          '</div>' +
          '<div class="hero-description">' + overview + '</div>' +
          '<div class="hero-actions">' +
            '<button class="btn-hero-play btn-ripple focusable" tabindex="0" data-id="' + item.id + '" data-type="' + type + '">' +
              '<span>▶</span> Play Now' +
            '</button>' +
            '<button class="btn-hero-info btn-ripple focusable" tabindex="0" data-id="' + item.id + '" data-type="' + type + '">' +
              '<span>ℹ</span> More Info' +
            '</button>' +
          '</div>' +
        '</div>';

      hero.appendChild(slide);
    });

    // Dots
    var dotsEl = document.getElementById('hero-dots');
    if (dotsEl) {
      dotsEl.innerHTML = '';
      _heroItems.forEach(function (_, idx) {
        var dot = document.createElement('div');
        dot.className = 'hero-dot' + (idx === 0 ? ' active' : '');
        dot.addEventListener('click', function () { _goToHeroSlide(idx); });
        dotsEl.appendChild(dot);
      });
    }

    // Button listeners
    hero.querySelectorAll('.btn-hero-play').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id   = btn.getAttribute('data-id');
        var type = btn.getAttribute('data-type');
        Storage.addToHistory({ id: id, type: type, title: API.getTitle(_heroItems[_heroIdx]), poster_path: _heroItems[_heroIdx].poster_path });
        App.navigate('player', { id: id, type: type });
      });
    });
    hero.querySelectorAll('.btn-hero-info').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id   = btn.getAttribute('data-id');
        var type = btn.getAttribute('data-type');
        App.navigate('detail', { id: id, type: type, item: _heroItems[_heroIdx] });
      });
    });

    _startHeroTimer();
  }

  function _goToHeroSlide(idx) {
    var slides = document.querySelectorAll('#hero-banner .hero-slide');
    var dots   = document.querySelectorAll('#hero-dots .hero-dot');
    if (slides[_heroIdx]) slides[_heroIdx].classList.remove('active');
    if (dots[_heroIdx])   dots[_heroIdx].classList.remove('active');
    _heroIdx = (idx + _heroItems.length) % _heroItems.length;
    if (slides[_heroIdx]) slides[_heroIdx].classList.add('active');
    if (dots[_heroIdx])   dots[_heroIdx].classList.add('active');
  }

  function _startHeroTimer() {
    if (_heroTimer) clearInterval(_heroTimer);
    _heroTimer = setInterval(function () {
      _goToHeroSlide(_heroIdx + 1);
    }, 8000);
  }

  // ── Render home page ──
  function render(container) {
    container.innerHTML =
      '<div id="hero-banner"></div>' +
      '<div id="hero-dots" class="hero-dots"></div>' +
      '<div id="home-rows"></div>';

    var rowsEl = document.getElementById('home-rows');

    // Show skeletons immediately
    rowsEl.appendChild(_buildRow('Trending Now', '🔥', null));
    rowsEl.appendChild(_buildRow('Popular Movies', '🎬', null));
    rowsEl.appendChild(_buildRow('Popular TV Shows', '📺', null));
    rowsEl.appendChild(_buildRow('Top Rated', '⭐', null));
    rowsEl.appendChild(_buildRow('Suggested For You', '💡', null));

    // Load data
    _loadData(rowsEl);
    Navigation.focusFirst(container);
  }

  function _loadData(rowsEl) {
    // Hero + Trending
    API.getTrending('all', 'week').then(function (data) {
      var items = data.results || [];
      _buildHero(items);
      _replaceRow(rowsEl, 0, 'Trending Now', '🔥', items);
    }).catch(function (e) { console.error('trending', e); });

    // Popular Movies
    API.getPopular('movie').then(function (data) {
      _replaceRow(rowsEl, 1, 'Popular Movies', '🎬', data.results || []);
    }).catch(function (e) { console.error('popular movies', e); });

    // Popular TV
    API.getPopular('tv').then(function (data) {
      _replaceRow(rowsEl, 2, 'Popular TV Shows', '📺', data.results || [], null, 'tv');
    }).catch(function (e) { console.error('popular tv', e); });

    // Top Rated (movies)
    API.getTopRated('movie').then(function (data) {
      _replaceRow(rowsEl, 3, 'Top Rated', '⭐', data.results || [], 'TOP', 'top');
    }).catch(function (e) { console.error('top rated', e); });

    // Suggested
    var seeds = Storage.getSuggestedSeeds();
    if (seeds.length > 0) {
      API.getSuggestedFromHistory(seeds).then(function (data) {
        var items = data.results || [];
        if (items.length > 0) {
          _replaceRow(rowsEl, 4, 'Suggested For You', '💡', items);
        } else {
          _loadFallbackSuggested(rowsEl);
        }
      }).catch(function () { _loadFallbackSuggested(rowsEl); });
    } else {
      _loadFallbackSuggested(rowsEl);
    }
  }

  function _loadFallbackSuggested(rowsEl) {
    API.getTrending('movie', 'day').then(function (data) {
      _replaceRow(rowsEl, 4, 'You Might Like', '💡', (data.results || []).slice(5, 25));
    }).catch(function () {});
  }

  function _replaceRow(rowsEl, idx, title, icon, items, badge, badgeClass) {
    var newRow = _buildRow(title, icon, items, badge, badgeClass);
    var existing = rowsEl.children[idx];
    if (existing) {
      rowsEl.replaceChild(newRow, existing);
    } else {
      rowsEl.appendChild(newRow);
    }
  }

  function destroy() {
    if (_heroTimer) clearInterval(_heroTimer);
    _heroTimer = null;
  }

  return { render, destroy };
})();
