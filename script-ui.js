/* UI MANAGEMENT: NAVIGATION, CLOCK, THEME, CAROUSEL */

const UI = {
    pages: document.querySelectorAll('.page'),
    themeToggle: document.getElementById('theme-toggle'),
    clock: document.getElementById('system-clock'),
    date: document.getElementById('system-date'),
    loading: document.getElementById('loading-screen'),
    modal: document.getElementById('category-modal'),
    patchModal: document.getElementById('patch-modal'),
    viewer: document.getElementById('image-viewer'),
    viewerImg: document.getElementById('viewer-img'),
    
    // NAVIGATION - FIX SCROLL BUG
    showPage(pageId) {
        this.pages.forEach(p => {
            p.classList.remove('active');
            p.scrollTop = 0; // Reset scroll position for each page
        });
        const target = document.getElementById(pageId);
        target.classList.add('active');
        window.scrollTo(0, 0); // Ensure main window is at top
    },

    // CLOCK & DATE
    updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        this.clock.innerText = `${h}:${m}:${s}`;
        
        const d = String(now.getDate()).padStart(2, '0');
        const mon = now.toLocaleString('default', { month: 'short' }).toUpperCase();
        const y = now.getFullYear();
        this.date.innerText = `${d} ${mon} ${y}`;
    },

    // THEME TOGGLE
    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        this.themeToggle.innerHTML = next === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    },

    // CAROUSEL LOGIC - FIXED FOR POPUP
    handleCarousel(el) {
        const track = document.getElementById('carousel-track');
        const imgs = Array.from(track.querySelectorAll('.extra-img'));
        
        if (el.classList.contains('active')) {
            // Show Popup
            this.viewerImg.src = el.src;
            this.viewer.classList.remove('hidden');
        } else {
            // Reorder for center
            const index = imgs.indexOf(el);
            if (index === 0) {
                track.insertBefore(imgs[imgs.length - 1], imgs[0]);
            } else if (index === 2) {
                track.appendChild(imgs[0]);
            }
            
            // Refresh active
            const newImgs = Array.from(track.querySelectorAll('.extra-img'));
            newImgs.forEach(img => img.classList.remove('active'));
            newImgs[1].classList.add('active');
        }
    }
};

// Initialize Clock
setInterval(() => UI.updateClock(), 1000);
UI.updateClock();

// Theme Event
UI.themeToggle.onclick = () => UI.toggleTheme();

// Close Viewer
document.querySelector('.close-viewer').onclick = () => UI.viewer.classList.add('hidden');
document.getElementById('close-patch').onclick = () => UI.patchModal.classList.add('hidden');
