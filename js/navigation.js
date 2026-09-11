/**
 * CineStream Spatial Navigation (D-Pad TV Remote Controller)
 * Handles Up, Down, Left, Right, Select, Back, Home, and Options key navigation for TV remotes.
 */

export class SpatialNavigation {
    constructor() {
        this.currentFocused = null;
        this.enabled = true;
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Auto-focus first element when DOM is ready or view changes
        setTimeout(() => this.focusDefault(), 300);
    }

    getFocusableElements() {
        // Collect all currently visible, interactive elements on screen
        const selector = 'a[data-view], button:not(:disabled), input, select, .media-card, .server-pill, .next-ep-btn, #ad-shield-click-layer';
        const all = Array.from(document.querySelectorAll(selector));
        
        return all.filter(el => {
            if (el.offsetParent === null) return false; // hidden
            if (el.closest('.hidden')) return false; // in hidden modal/view
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });
    }

    focusDefault() {
        const elements = this.getFocusableElements();
        if (elements.length > 0) {
            this.setFocus(elements[0]);
        }
    }

    setFocus(element) {
        if (!element) return;
        if (this.currentFocused) {
            this.currentFocused.classList.remove('focused');
            this.currentFocused.blur();
        }
        this.currentFocused = element;
        this.currentFocused.classList.add('focused');
        this.currentFocused.focus();

        // Scroll element into view nicely
        this.currentFocused.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
        });
    }

    handleKeyDown(e) {
        if (!this.enabled) return;

        const key = e.key;
        const code = e.keyCode;

        // Key code mapping for TV remotes
        const isUp = key === 'ArrowUp' || code === 38;
        const isDown = key === 'ArrowDown' || code === 40;
        const isLeft = key === 'ArrowLeft' || code === 37;
        const isRight = key === 'ArrowRight' || code === 39;
        const isSelect = key === 'Enter' || code === 13 || code === 10009;
        const isBack = key === 'Escape' || key === 'Backspace' || code === 27 || code === 8 || code === 461 || code === 10009;
        const isHome = key === 'Home' || key === 'h' || key === 'H' || code === 36 || code === 72;
        const isOptions = key === 'Options' || key === 'o' || key === 'O' || code === 79 || code === 18;

        if (isUp || isDown || isLeft || isRight) {
            e.preventDefault();
            this.navigateDirection(isUp ? 'up' : isDown ? 'down' : isLeft ? 'left' : 'right');
        } else if (isSelect) {
            if (this.currentFocused) {
                // If it's an input field, focus it for text typing
                if (this.currentFocused.tagName === 'INPUT' || this.currentFocused.tagName === 'SELECT') {
                    this.currentFocused.focus();
                } else {
                    e.preventDefault();
                    this.currentFocused.click();
                }
            }
        } else if (isBack) {
            e.preventDefault();
            this.handleBackKey();
        } else if (isHome) {
            e.preventDefault();
            window.app?.loadView('home');
            setTimeout(() => this.focusDefault(), 200);
        } else if (isOptions) {
            e.preventDefault();
            document.getElementById('settings-btn')?.click();
        }
    }

    navigateDirection(direction) {
        const elements = this.getFocusableElements();
        if (!elements.length) return;

        if (!this.currentFocused || !elements.includes(this.currentFocused)) {
            this.setFocus(elements[0]);
            return;
        }

        const currentRect = this.currentFocused.getBoundingClientRect();
        const currentCenter = {
            x: currentRect.left + currentRect.width / 2,
            y: currentRect.top + currentRect.height / 2
        };

        let bestMatch = null;
        let minDistance = Infinity;

        elements.forEach(el => {
            if (el === this.currentFocused) return;
            const rect = el.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            let isValidInDirection = false;
            if (direction === 'up' && center.y < currentCenter.y - 5) isValidInDirection = true;
            if (direction === 'down' && center.y > currentCenter.y + 5) isValidInDirection = true;
            if (direction === 'left' && center.x < currentCenter.x - 5) isValidInDirection = true;
            if (direction === 'right' && center.x > currentCenter.x + 5) isValidInDirection = true;

            if (isValidInDirection) {
                // Euclidean distance + directional penalty
                const dx = center.x - currentCenter.x;
                const dy = center.y - currentCenter.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                // Add penalty for orthogonal offset to keep direction natural
                if (direction === 'up' || direction === 'down') {
                    distance += Math.abs(dx) * 1.5;
                } else {
                    distance += Math.abs(dy) * 1.5;
                }

                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatch = el;
                }
            }
        });

        if (bestMatch) {
            this.setFocus(bestMatch);
        }
    }

    handleBackKey() {
        // Player modal open?
        const playerModal = document.getElementById('player-modal');
        if (playerModal && !playerModal.classList.contains('hidden')) {
            document.getElementById('close-player-btn')?.click();
            return;
        }

        // Detail modal open?
        const detailModal = document.getElementById('detail-modal');
        if (detailModal && !detailModal.classList.contains('hidden')) {
            document.getElementById('close-detail-btn')?.click();
            return;
        }

        // Settings modal open?
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            document.getElementById('close-settings-btn')?.click();
            return;
        }

        // Search view active?
        if (window.app?.currentView === 'search') {
            const input = document.getElementById('search-input');
            if (input) input.value = '';
            window.app.loadView('home');
            return;
        }

        // Return to home if on another view
        if (window.app?.currentView !== 'home') {
            window.app?.loadView('home');
        }
    }
}
