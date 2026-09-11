/**
 * CineStream Spatial Navigation — TV Remote D-Pad Controller
 *
 * Keys handled:
 *   Arrow Up/Down/Left/Right  → navigate between focusable elements
 *   Enter / OK (keyCode 13)   → select / click focused element
 *   Escape / Back (27, 461)   → go back / close modal
 *   Home (36)                 → go to Home view
 *   Options / Alt (18, 79)    → open settings
 *
 * Mouse is fully disabled: pointer events are suppressed and cursor hidden.
 */

export class SpatialNavigation {
    constructor() {
        this.currentFocused = null;
        this.enabled = true;
        this._lastMouseMove = 0;

        this._init();
    }

    // ─── Initialise ──────────────────────────────────────────────────────────
    _init() {
        // 1. Hide the cursor at the CSS level (fastest, applies before JS runs)
        this._injectCursorStyle();

        // 2. Kill all mouse click events so the TV remote is the only input
        this._killMouse();

        // 3. Listen for D-pad / remote key presses
        document.addEventListener('keydown', (e) => this._onKey(e));

        // 4. Auto-focus the first element after page is interactive
        setTimeout(() => this.focusDefault(), 500);
    }

    // ─── Cursor & Mouse Blocking ─────────────────────────────────────────────
    _injectCursorStyle() {
        const style = document.createElement('style');
        style.id = 'tv-no-cursor';
        style.textContent = `
            * { cursor: none !important; }
            *:hover { cursor: none !important; }
        `;
        document.head.appendChild(style);
    }

    _killMouse() {
        // Suppress click events triggered by a physical mouse movement + click.
        // We track mouse movement — if the mouse moved recently (within 300 ms),
        // any click from it is blocked. Keyboard-synthesised clicks are not
        // preceded by mousemove events, so they pass through fine.
        document.addEventListener('mousemove', () => {
            this._lastMouseMove = Date.now();
        }, { passive: true });

        document.addEventListener('click', (e) => {
            if (Date.now() - this._lastMouseMove < 300) {
                // Block mouse-driven click
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }, true); // capture phase so we run before any other handlers
    }

    // ─── Focusable Element Discovery ─────────────────────────────────────────
    /**
     * Returns all currently visible, interactive elements that can receive focus.
     * Order: DOM order (top-to-bottom, left-to-right).
     */
    _getFocusable() {
        // Selector covers nav links, buttons, inputs, selects, and media cards
        const sel = [
            'a[data-view]',
            'button:not(:disabled)',
            'input:not([type="hidden"])',
            'select',
            '.media-card[tabindex]',
        ].join(', ');

        return Array.from(document.querySelectorAll(sel)).filter(el => {
            // Skip elements inside hidden containers
            if (el.closest('.hidden')) return false;
            // Skip elements with zero layout area
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight + 500;
        });
    }

    // ─── Focus Management ────────────────────────────────────────────────────
    setFocus(el) {
        if (!el) return;

        // Remove from old element
        if (this.currentFocused && this.currentFocused !== el) {
            this.currentFocused.classList.remove('focused');
            this.currentFocused.blur();
        }

        this.currentFocused = el;
        el.classList.add('focused');
        el.focus({ preventScroll: true });

        // Smooth scroll into view — keep it centred horizontally in carousels
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    focusDefault() {
        // Prefer to keep existing focus if the element is still visible
        if (this.currentFocused && this._getFocusable().includes(this.currentFocused)) {
            return;
        }
        const els = this._getFocusable();
        if (els.length) this.setFocus(els[0]);
    }

    /** Call this whenever the view changes or a modal opens/closes */
    refocus(preferredEl = null) {
        if (preferredEl && document.contains(preferredEl)) {
            this.setFocus(preferredEl);
            return;
        }
        // Small delay to let DOM settle after modal animation
        setTimeout(() => {
            const els = this._getFocusable();
            if (els.length) this.setFocus(els[0]);
        }, 100);
    }

    // ─── Key Handler ─────────────────────────────────────────────────────────
    _onKey(e) {
        if (!this.enabled) return;

        const k = e.key;
        const c = e.keyCode;

        const UP    = k === 'ArrowUp'    || c === 38;
        const DOWN  = k === 'ArrowDown'  || c === 40;
        const LEFT  = k === 'ArrowLeft'  || c === 37;
        const RIGHT = k === 'ArrowRight' || c === 39;
        const OK    = k === 'Enter'      || c === 13;
        // LG TV remote "Back" key is 461; Escape / Backspace as fallback
        const BACK  = k === 'Escape' || k === 'Backspace' || c === 27 || c === 8 || c === 461 || c === 10009;
        const HOME  = k === 'Home'  || c === 36;
        const OPT   = k === 'Alt'   || c === 18 || c === 79; // Options key

        if (UP || DOWN || LEFT || RIGHT) {
            e.preventDefault();
            const dir = UP ? 'up' : DOWN ? 'down' : LEFT ? 'left' : 'right';
            this._navigate(dir);
            return;
        }

        if (OK) {
            if (!this.currentFocused) { this.focusDefault(); return; }

            // For <select> and <input>, Enter just activates the element
            const tag = this.currentFocused.tagName;
            if (tag === 'INPUT' || tag === 'SELECT') {
                this.currentFocused.focus();
                return;
            }

            // For the ad-shield overlay, dismiss it
            if (this.currentFocused.id === 'ad-shield-click-layer') {
                this.currentFocused.style.display = 'none';
                return;
            }

            e.preventDefault();
            this.currentFocused.click();
            return;
        }

        if (BACK) {
            e.preventDefault();
            this._handleBack();
            return;
        }

        if (HOME) {
            e.preventDefault();
            window.app?.loadView('home');
            return;
        }

        if (OPT) {
            e.preventDefault();
            document.getElementById('settings-btn')?.click();
            return;
        }
    }

    // ─── Directional Navigation ──────────────────────────────────────────────
    /**
     * Pick the best next element in `direction` using a weighted Euclidean
     * distance that heavily penalises orthogonal offset.
     */
    _navigate(direction) {
        const all = this._getFocusable();
        if (!all.length) return;

        if (!this.currentFocused || !all.includes(this.currentFocused)) {
            this.setFocus(all[0]);
            return;
        }

        const cr = this.currentFocused.getBoundingClientRect();
        const cx = cr.left + cr.width  / 2;
        const cy = cr.top  + cr.height / 2;

        let best = null;
        let bestScore = Infinity;

        for (const el of all) {
            if (el === this.currentFocused) continue;

            const r  = el.getBoundingClientRect();
            const ex = r.left + r.width  / 2;
            const ey = r.top  + r.height / 2;

            const dx = ex - cx;
            const dy = ey - cy;

            // Strict directional filter — element must be meaningfully in that direction
            const threshold = 8; // px — prevents firing on sub-pixel neighbours
            if (direction === 'up'    && dy > -threshold) continue;
            if (direction === 'down'  && dy <  threshold) continue;
            if (direction === 'left'  && dx > -threshold) continue;
            if (direction === 'right' && dx <  threshold) continue;

            // Primary distance: distance along the intended axis
            // Secondary (penalty): distance along the perpendicular axis
            let primary, perp;
            if (direction === 'up'   || direction === 'down')  { primary = Math.abs(dy); perp = Math.abs(dx); }
            else                                                { primary = Math.abs(dx); perp = Math.abs(dy); }

            // Score: primary axis matters more; perpendicular is penalised 2×
            const score = primary + perp * 2;

            if (score < bestScore) {
                bestScore = score;
                best = el;
            }
        }

        if (best) this.setFocus(best);
    }

    // ─── Back Key Logic ──────────────────────────────────────────────────────
    _handleBack() {
        // Close player if open
        const player = document.getElementById('player-modal');
        if (player && !player.classList.contains('hidden')) {
            document.getElementById('close-player-btn')?.click();
            setTimeout(() => this.focusDefault(), 150);
            return;
        }

        // Close detail modal if open
        const detail = document.getElementById('detail-modal');
        if (detail && !detail.classList.contains('hidden')) {
            document.getElementById('close-detail-btn')?.click();
            setTimeout(() => this.focusDefault(), 150);
            return;
        }

        // Close settings modal if open
        const settings = document.getElementById('settings-modal');
        if (settings && !settings.classList.contains('hidden')) {
            document.getElementById('close-settings-btn')?.click();
            setTimeout(() => this.focusDefault(), 150);
            return;
        }

        // Return to home if on another view
        if (window.app?.currentView !== 'home') {
            window.app?.loadView('home');
        }
    }
}
