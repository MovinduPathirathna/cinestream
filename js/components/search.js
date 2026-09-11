/* ============================================================
   js/components/search.js — Search Screen
   Uses the TV's native on-screen keyboard via <input> focus
   ============================================================ */
var SearchScreen = (function () {

  var _debounceTimer = null;
  var _lastQuery = '';

  function _buildCard(item) {
    var type   = API.getMediaType(item);
    var title  = API.getTitle(item);
    var year   = API.getReleaseYear(item);
    var rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    var poster = API.imgUrl(item.poster_path, API.IMG_W500);

    var card = document.createElement('div');
    card.className = 'card search-result-item';
    card.setAttribute('tabindex', '0');
    card.title = title;

    card.innerHTML =
      (poster
        ? '<img class="card-poster" src="' + poster + '" alt="' + _esc(title) + '" loading="lazy">'
        : '<div class="card-poster-placeholder">' + (type === 'tv' ? '📺' : '🎬') + '</div>') +
      '<div class="card-play-overlay"><div class="card-play-btn">▶</div></div>' +
      '<span class="card-badge ' + (type === 'tv' ? 'tv' : '') + '">' + (type === 'tv' ? 'TV' : 'Movie') + '</span>' +
      '<div class="card-info">' +
        '<div class="card-title">' + _esc(title) + '</div>' +
        '<div class="card-meta"><span>' + year + '</span><span class="card-rating">★ ' + rating + '</span></div>' +
      '</div>';

    card.addEventListener('click', function () {
      App.navigate('detail', { id: item.id, type: type, item: item });
    });

    return card;
  }

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _doSearch(q) {
    q = (q || '').trim();
    if (q === _lastQuery) return;
    _lastQuery = q;

    var grid  = document.getElementById('search-grid');
    var label = document.getElementById('search-grid-title');
    if (!grid) return;

    if (!q) {
      grid.innerHTML = '';
      if (label) label.textContent = 'Start typing to search for movies & TV shows…';
      return;
    }

    if (label) label.textContent = 'Searching for "' + q + '"…';
    grid.innerHTML = '';
    for (var i = 0; i < 8; i++) {
      var sk = document.createElement('div');
      sk.className = 'skeleton skeleton-card';
      grid.appendChild(sk);
    }

    API.search(q).then(function (data) {
      grid.innerHTML = '';
      var results = (data.results || []).filter(function (item) {
        return item.media_type === 'movie' || item.media_type === 'tv';
      });
      if (results.length === 0) {
        grid.innerHTML =
          '<div class="search-empty" style="grid-column:1/-1;">' +
            '<div class="icon">🔍</div>' +
            '<div>No results for "<strong>' + _esc(q) + '</strong>"</div>' +
            '<div style="font-size:14px;color:var(--text-muted);">Try a different spelling or keyword</div>' +
          '</div>';
        if (label) label.textContent = 'No results found';
      } else {
        results.forEach(function (item) { grid.appendChild(_buildCard(item)); });
        if (label) label.textContent = results.length + ' results for "' + _esc(q) + '"';
      }
    }).catch(function () {
      grid.innerHTML = '<div style="padding:40px;color:var(--text-muted);grid-column:1/-1;">Error fetching results. Check your API key.</div>';
    });
  }

  function render(container) {
    _lastQuery = '';

    container.innerHTML =
      '<div class="scrollable" style="overflow-y:auto;height:100%;">' +
        '<div style="padding:40px 60px 24px;">' +
          '<h1 style="font-family:\'Bebas Neue\',sans-serif;font-size:48px;letter-spacing:2px;margin-bottom:8px;">🔍 Search</h1>' +
          '<p style="color:var(--text-muted);font-size:14px;margin-bottom:24px;">Click the search bar and type using your TV keyboard</p>' +
          '<div class="search-bar" id="search-bar" style="margin-bottom:0;">' +
            '<span class="search-icon">🔍</span>' +
            '<input' +
            '  id="search-text-input"' +
            '  class="search-input"' +
            '  type="search"' +
            '  placeholder="Search movies &amp; TV shows…"' +
            '  autocomplete="off"' +
            '  autocorrect="off"' +
            '  spellcheck="false"' +
            '  style="font-size:28px;padding:6px 0;"' +
            '>' +
            '<button id="search-clear-btn" class="search-clear" style="font-size:22px;padding:8px;cursor:pointer;" title="Clear">✕</button>' +
          '</div>' +
        '</div>' +

        '<div id="search-grid-title" style="padding:0 60px 16px;color:var(--text-muted);font-size:15px;">Start typing to search for movies &amp; TV shows…</div>' +

        '<div id="search-grid" style="' +
          'display:grid;' +
          'grid-template-columns:repeat(auto-fill,minmax(200px,1fr));' +
          'gap:18px;' +
          'padding:0 60px 60px;' +
          'min-height:200px;' +
        '"></div>' +
      '</div>';

    var input = document.getElementById('search-text-input');
    var clearBtn = document.getElementById('search-clear-btn');

    // When user types — triggers TV's native keyboard when focused
    input.addEventListener('input', function () {
      var q = input.value;
      if (_debounceTimer) clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(function () { _doSearch(q); }, 600);
    });

    input.addEventListener('focus', function () {
      document.getElementById('search-bar').classList.add('active');
    });
    input.addEventListener('blur', function () {
      document.getElementById('search-bar').classList.remove('active');
    });

    // Submit on Enter
    input.addEventListener('keydown', function (e) {
      if (e.keyCode === 13) {
        if (_debounceTimer) clearTimeout(_debounceTimer);
        _doSearch(input.value);
      }
    });

    clearBtn.addEventListener('click', function () {
      input.value = '';
      _lastQuery = '';
      document.getElementById('search-grid').innerHTML = '';
      document.getElementById('search-grid-title').textContent = 'Start typing to search for movies & TV shows…';
      input.focus();
    });

    // Auto-focus input so TV keyboard appears on open
    setTimeout(function () { input.focus(); }, 200);
  }

  return { render };
})();
