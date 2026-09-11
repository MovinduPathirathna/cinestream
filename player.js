/* ============================================================
   js/components/player.js — Video Player Screen
   Multi-source with automatic fallback
   ============================================================ */
var PlayerScreen = (function () {

  var _controlsTimer = null;

  /* ── Embed URL builders for each provider ── */
  var PROVIDERS = [
    {
      name: 'VidSrc SBS',
      movie: function (id) { return 'https://vidsrc.sbs/embed/movie/' + id; },
      tv:    function (id, s, e) { return 'https://vidsrc.sbs/embed/tv/' + id + '/' + s + '/' + e; }
    },
    {
      name: 'VidSrc.me',
      movie: function (id) { return 'https://vidsrc.me/embed/movie?tmdb=' + id; },
      tv:    function (id, s, e) { return 'https://vidsrc.me/embed/tv?tmdb=' + id + '&season=' + s + '&episode=' + e; }
    },
    {
      name: 'VidSrc.net',
      movie: function (id) { return 'https://vidsrc.net/embed/movie/' + id; },
      tv:    function (id, s, e) { return 'https://vidsrc.net/embed/tv/' + id + '/' + s + '/' + e; }
    },
    {
      name: 'VidLink',
      movie: function (id) { return 'https://vidlink.pro/movie/' + id + '?autoplay=true'; },
      tv:    function (id, s, e) { return 'https://vidlink.pro/tv/' + id + '/' + s + '/' + e + '?autoplay=true'; }
    },
    {
      name: 'VidSrc.cc',
      movie: function (id) { return 'https://vidsrc.cc/v2/embed/movie/' + id; },
      tv:    function (id, s, e) { return 'https://vidsrc.cc/v2/embed/tv/' + id + '/' + s + '/' + e; }
    },
    {
      name: 'EmbedSu',
      movie: function (id) { return 'https://embed.su/embed/movie/' + id; },
      tv:    function (id, s, e) { return 'https://embed.su/embed/tv/' + id + '/' + s + '/' + e; }
    }
  ];

  var _currentProvider = 0;
  var _currentParams   = null;

  function _getUrl(provider, params) {
    var id  = params.id;
    var type = params.type || 'movie';
    var s    = params.season  || 1;
    var e    = params.episode || 1;
    if (type === 'movie') return provider.movie(id);
    return provider.tv(id, s, e);
  }

  function _loadSource(providerIdx) {
    var iframe = document.getElementById('player-iframe');
    var label  = document.getElementById('player-source-label');
    var prevBtn  = document.getElementById('player-prev-src');
    var nextBtn  = document.getElementById('player-next-src');
    if (!iframe) return;

    _currentProvider = providerIdx;
    var provider = PROVIDERS[providerIdx];
    var url = _getUrl(provider, _currentParams);

    if (label) label.textContent = 'Source: ' + provider.name + ' (' + (providerIdx + 1) + '/' + PROVIDERS.length + ')';
    if (prevBtn) prevBtn.disabled = (providerIdx === 0);
    if (nextBtn) nextBtn.disabled = (providerIdx === PROVIDERS.length - 1);

    iframe.src = url;
  }

  function render(container, params) {
    _currentParams   = params || {};
    _currentProvider = 0;

    var type    = (_currentParams.type || 'movie');
    var season  = _currentParams.season  || 1;
    var episode = _currentParams.episode || 1;
    var epLabel = type === 'tv' ? ' · S' + season + ' E' + episode : '';

    container.innerHTML =
      /* Player iframe */
      '<iframe id="player-iframe"' +
        ' src="about:blank"' +
        ' allowfullscreen' +
        ' allow="autoplay; fullscreen; encrypted-media; picture-in-picture; web-share"' +
        ' referrerpolicy="no-referrer"' +
        ' style="position:absolute;inset:0;width:100%;height:100%;border:none;background:#000;">' +
      '</iframe>' +

      /* Controls overlay */
      '<div id="player-controls" style="' +
        'position:absolute;top:0;left:0;right:0;' +
        'padding:20px 36px;' +
        'display:flex;align-items:center;gap:14px;' +
        'background:linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,transparent 100%);' +
        'opacity:0;transition:opacity 0.35s;pointer-events:none;' +
      '">' +
        /* Back */
        '<button id="player-back" style="' +
          'display:flex;align-items:center;gap:8px;' +
          'background:rgba(229,9,20,0.9);color:#fff;' +
          'border:none;border-radius:8px;' +
          'font-size:15px;font-weight:700;padding:10px 20px;' +
          'cursor:pointer;pointer-events:all;white-space:nowrap;' +
        '">← Back</button>' +

        /* Source selector */
        '<div style="display:flex;align-items:center;gap:8px;margin-left:auto;">' +
          '<button id="player-prev-src" style="' +
            'background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);' +
            'border-radius:6px;padding:8px 14px;font-size:16px;cursor:pointer;pointer-events:all;' +
          '">◀</button>' +
          '<span id="player-source-label" style="' +
            'font-size:13px;color:rgba(255,255,255,0.8);' +
            'background:rgba(0,0,0,0.5);padding:6px 14px;border-radius:6px;white-space:nowrap;' +
          '"></span>' +
          '<button id="player-next-src" style="' +
            'background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);' +
            'border-radius:6px;padding:8px 14px;font-size:16px;cursor:pointer;pointer-events:all;' +
          '">▶</button>' +
        '</div>' +

        /* Episode label */
        '<span style="color:rgba(255,255,255,0.5);font-size:13px;white-space:nowrap;">' + epLabel + '</span>' +
      '</div>' +

      /* Bottom gradient hint */
      '<div id="player-hint" style="' +
        'position:absolute;bottom:0;left:0;right:0;padding:16px 36px;' +
        'background:linear-gradient(to top,rgba(0,0,0,0.7),transparent);' +
        'text-align:center;font-size:13px;color:rgba(255,255,255,0.4);' +
        'opacity:0;transition:opacity 0.35s;pointer-events:none;' +
      '">Move your pointer to show controls · Use ◀ ▶ to switch video source if not playing</div>';

    /* ── Wire up controls ── */
    var controls = document.getElementById('player-controls');
    var hint     = document.getElementById('player-hint');

    function showControls() {
      controls.style.opacity = '1';
      controls.style.pointerEvents = 'all';
      hint.style.opacity = '1';
      if (_controlsTimer) clearTimeout(_controlsTimer);
      _controlsTimer = setTimeout(hideControls, 4000);
    }
    function hideControls() {
      controls.style.opacity = '0';
      controls.style.pointerEvents = 'none';
      hint.style.opacity = '0';
    }

    container.addEventListener('mousemove', showControls);
    container.addEventListener('click', showControls);

    document.getElementById('player-back').addEventListener('click', function (e) {
      e.stopPropagation();
      if (_controlsTimer) clearTimeout(_controlsTimer);
      App.goBack();
    });

    document.getElementById('player-prev-src').addEventListener('click', function (e) {
      e.stopPropagation();
      if (_currentProvider > 0) _loadSource(_currentProvider - 1);
    });

    document.getElementById('player-next-src').addEventListener('click', function (e) {
      e.stopPropagation();
      if (_currentProvider < PROVIDERS.length - 1) _loadSource(_currentProvider + 1);
    });

    /* LG Back key */
    document.addEventListener('keydown', function _playerKey(e) {
      if (e.keyCode === 461 || e.keyCode === 8) {
        document.removeEventListener('keydown', _playerKey);
        App.goBack();
      } else {
        showControls();
      }
    });

    /* Load first source */
    _loadSource(0);
    showControls();
  }

  function destroy() {
    if (_controlsTimer) clearTimeout(_controlsTimer);
  }

  return { render, destroy };
})();
