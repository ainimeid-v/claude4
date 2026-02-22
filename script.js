/* CONSOLIDATED RPG SCRIPT SYSTEM - REVISED */

const CONFIG = {
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTfX6o_W1y8q6v_r1R_S1p_S1p_S1p_S1p_S1p_S1p_S1p_S1p_S1p_S1p_S1p/pub?output=csv',
    categories: ['Character', 'Monster', 'Pet', 'Item', 'Magic', 'Area']
};

let rawData = [];
let currentCat = localStorage.getItem('currentCat') || 'Character';
let filters = { search: '', rarity: '', tags: [] };
let lastScrollY = 0;

const UI = {
    pages: document.querySelectorAll('.page'),
    themeToggle: document.getElementById('theme-toggle'),
    clock: document.getElementById('system-clock'),
    date: document.getElementById('system-date'),
    loading: document.getElementById('loading-screen'),
    progressBar: document.getElementById('progress-bar'),
    progressVal: document.getElementById('progress-val'),
    modal: document.getElementById('category-modal'),
    patchModal: document.getElementById('patch-modal'),
    viewer: document.getElementById('image-viewer'),
    viewerImg: document.getElementById('viewer-img'),
    refreshBtn: document.getElementById('refresh-btn'),
    calendarModal: document.getElementById('calendar-modal'),
    calendarDays: document.getElementById('calendar-days'),
    calendarMonthYear: document.getElementById('calendar-month-year'),
    
    showPage(pageId, save = true) {
        this.pages.forEach(p => {
            p.classList.remove('active');
            p.scrollTop = 0;
        });
        const target = document.getElementById(pageId);
        if (!target) return;
        target.classList.add('active');
        if (save) localStorage.setItem('lastPage', pageId);

        // Update visibility for clock/date and tiktok text
        const hud = document.getElementById('top-hud');
        const tiktok = document.getElementById('tiktok-text');
        if (pageId === 'page-1') {
            if (hud) hud.style.display = 'flex';
            if (tiktok) tiktok.style.display = 'block';
        } else {
            if (hud) hud.style.display = 'none';
            if (tiktok) tiktok.style.display = 'none';
        }
        
        // Reset scroll nav state for page 3
        if (pageId === 'page-3') {
            const nav = document.querySelector('.detail-nav-static');
            if (nav) {
                nav.classList.remove('nav-hidden');
                lastScrollY = 0;
            }
        }
    },

    updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        if (this.clock) this.clock.innerText = `${h}:${m}:${s}`;
        
        const d = String(now.getDate()).padStart(2, '0');
        const mon = now.toLocaleString('default', { month: 'short' }).toUpperCase();
        const y = now.getFullYear();
        if (this.date) this.date.innerText = `${d} ${mon} ${y}`;
    },

    handleRefresh() {
        if (this.refreshBtn) {
            this.refreshBtn.classList.add('spinning');
            if (this.loading) {
                this.loading.classList.remove('hidden');
                this.loading.style.opacity = '1';
                if (this.progressBar) this.progressBar.style.width = '0%';
                if (this.progressVal) this.progressVal.innerText = '0';
            }
            setTimeout(() => {
                location.reload();
            }, 800);
        }
    },

    renderCalendar(date) {
        if (!this.calendarDays || !this.calendarMonthYear) return;
        this.calendarDays.innerHTML = '';
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        this.calendarMonthYear.innerText = date.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            this.calendarDays.appendChild(empty);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                dayEl.classList.add('today');
            }
            dayEl.innerText = d;
            this.calendarDays.appendChild(dayEl);
        }
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        if (this.themeToggle) this.themeToggle.innerHTML = next === 'dark' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
    },

    handleCarousel(el) {
        const track = document.getElementById('carousel-track');
        if (!track) return;
        const imgs = Array.from(track.querySelectorAll('.extra-img'));
        
        // If the clicked image is already the focused one -> open viewer
        if (el.classList.contains('active')) {
            if (this.viewerImg) this.viewerImg.src = el.src;
            if (this.viewer) this.viewer.classList.remove('hidden');
            return;
        }

        const index = imgs.indexOf(el);

        // Safe rotation logic: only rotate if 3+ images; handle 2 images gracefully
        if (imgs.length >= 3) {
            if (index === 0) track.insertBefore(imgs[imgs.length - 1], imgs[0]);
            else if (index === 2) track.appendChild(imgs[0]);
        } else if (imgs.length === 2) {
            // swap positions if first clicked; no crash if index calculation weird
            if (index === 0) track.appendChild(imgs[0]);
        }

        const newImgs = Array.from(track.querySelectorAll('.extra-img'));
        newImgs.forEach(img => img.classList.remove('active'));
        if (newImgs[1]) newImgs[1].classList.add('active');
    }
};

async function loadRealmData() {
    try {
        if (CONFIG.csvUrl.includes('S1p_S1p')) {
            rawData = getMockArchive();
        } else {
            const response = await fetch(CONFIG.csvUrl);
            const csvText = await response.text();
            rawData = parseCSV(csvText);
        }
    } catch (e) {
        rawData = getMockArchive();
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_'));
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, i) => { obj[header] = values[i] || ''; });
        return obj;
    });
}

function getMockArchive() {
    const data = [];
    const images = [
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=600&fit=crop',
        'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=600&fit=crop',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=600&fit=crop'
    ];
    CONFIG.categories.forEach(cat => {
        for (let i = 1; i <= 3; i++) {
            data.push({
                category: cat, name: `${cat} Legend ${i}`, nickname: `Title of ${cat}`,
                rarity: ['S', 'A', 'B', 'C', 'D'][Math.floor(Math.random() * 5)],
                main_image_url: images[i-1] || images[0],
                extra_image_1: 'https://picsum.photos/400/400?random=1',
                extra_image_2: 'https://picsum.photos/400/400?random=2',
                extra_image_3: 'https://picsum.photos/400/400?random=3',
                tags: `${cat}, Power, Ancient`,
                story: `Born from the fragments of the old world, this ${cat} possesses power beyond mortal comprehension.`
            });
        }
    });
    return data;
}

async function startLoadingAnimation() {
    let progress = 0;
    return new Promise(resolve => {
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 10) + 2;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(resolve, 500);
            }
            if (UI.progressBar) UI.progressBar.style.width = `${progress}%`;
            if (UI.progressVal) UI.progressVal.innerText = progress;
        }, 100);
    });
}

async function init() {
    // Force dark mode only
    document.documentElement.setAttribute("data-theme", "dark"); localStorage.setItem("theme","dark");

    
    const dataPromise = loadRealmData();
    await startLoadingAnimation();
    await dataPromise;
    
    if (UI.loading) {
        UI.loading.style.opacity = '0';
        setTimeout(() => UI.loading.classList.add('hidden'), 500);
    }

    const lastPage = localStorage.getItem('lastPage') || 'page-1';
    const lastUnit = localStorage.getItem('lastUnit');
    
    if (lastPage === 'page-3' && lastUnit) {
        selectRealm(currentCat, false);
        showLegendDetail(lastUnit);
    } else if (lastPage !== 'page-1') {
        selectRealm(currentCat, false);
        UI.showPage(lastPage);
    } else {
        UI.showPage('page-1');
    }

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.onclick = () => {
            startBtn.classList.add('hidden');
            const patchBtn = document.getElementById('patch-btn');
            if (patchBtn) patchBtn.classList.add('hidden');
            const verText = document.querySelector('.patch-ver-text');
            if (verText) verText.classList.add('hidden');
            const catGrid = document.getElementById('category-grid');
            if (catGrid) catGrid.classList.remove('hidden');
        };
    }

    const cancelBtn = document.getElementById('cancel-cat-btn');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            const startBtn2 = document.getElementById('start-btn');
            if (startBtn2) startBtn2.classList.remove('hidden');
            const patchBtn2 = document.getElementById('patch-btn');
            if (patchBtn2) patchBtn2.classList.remove('hidden');
            const verText = document.querySelector('.patch-ver-text');
            if (verText) verText.classList.remove('hidden');
            const catGrid = document.getElementById('category-grid');
            if (catGrid) catGrid.classList.add('hidden');
        };
    }

    const patchBtn = document.getElementById('patch-btn');
    if (patchBtn) {
        patchBtn.onclick = () => {
            const patchTextEl = document.getElementById('patch-text');
            if (patchTextEl) patchTextEl.innerHTML = `
                <strong>UPDATE v1.0.8 - REVISED</strong><br><br>
                - New Unique Wallpapers for every category.<br>
                - Modern Loading Animation (0-100%).<br>
                - Auto-hide navigation on scroll down.<br>
                - Persistent page state on refresh.<br>
                - Fixed contrast for subtitle and version text.<br>
                - Removed all glowing effects for a cleaner look.<br><br>
                <em>System fully optimized.</em>
            `;
            if (UI.patchModal) UI.patchModal.classList.remove('hidden');
        };
    }

    document.querySelectorAll('.cat-card').forEach(card => {
        card.onclick = () => selectRealm(card.dataset.category);
    });

    document.querySelectorAll('.back-to-1').forEach(btn => btn.onclick = () => UI.showPage('page-1'));
    document.querySelectorAll('.back-to-2').forEach(btn => btn.onclick = () => UI.showPage('page-2'));
    
    const filterBtn = document.getElementById('filter-btn');
    if (filterBtn) {
        filterBtn.onclick = () => {
            const panel = document.getElementById('filter-panel');
            if (panel) panel.classList.toggle('hidden');
        };
    }

    const quickBtn = document.getElementById('quick-change-btn');
    if (quickBtn) {
        quickBtn.onclick = () => {
            const modalList = document.getElementById('mini-cat-list');
            if (!modalList) return;
            modalList.innerHTML = CONFIG.categories
                .filter(c => c !== currentCat)
                .map(c => `<div class="m-cat" onclick="selectRealm('${c}')">${c}</div>`)
                .join('');
            if (UI.modal) UI.modal.classList.remove('hidden');
        };
    }

    const unitSearch = document.getElementById('unit-search');
    if (unitSearch) {
        unitSearch.oninput = (e) => {
            filters.search = e.target.value.toLowerCase();
            renderArchive();
        };
    }

    document.querySelectorAll('.r-chip').forEach(chip => {
        chip.onclick = () => {
            if (chip.classList.contains('active')) { chip.classList.remove('active'); filters.rarity = ''; }
            else {
                document.querySelectorAll('.r-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active'); filters.rarity = chip.dataset.rarity;
            }
            renderArchive();
        };
    });

    const resetFilters = document.getElementById('reset-filters');
    if (resetFilters) {
        resetFilters.onclick = () => {
            filters = { search: '', rarity: '', tags: [] };
            const unitSearch2 = document.getElementById('unit-search');
            if (unitSearch2) unitSearch2.value = '';
            document.querySelectorAll('.r-chip, .t-chip').forEach(c => c.classList.remove('active'));
            renderArchive();
        };
    }

    const closeModalBtn = document.getElementById('close-modal');
    if (closeModalBtn) closeModalBtn.onclick = () => UI.modal.classList.add('hidden');
    const closePatchBtn = document.getElementById('close-patch');
    if (closePatchBtn) closePatchBtn.onclick = () => UI.patchModal.classList.add('hidden');
    const closeViewerBtn = document.querySelector('.close-viewer');
    if (closeViewerBtn) closeViewerBtn.onclick = () => UI.viewer.classList.add('hidden');

    if (UI.refreshBtn) UI.refreshBtn.onclick = () => UI.handleRefresh();
    
    let calendarDate = new Date();
    if (UI.date) {
        UI.date.onclick = () => {
            calendarDate = new Date();
            UI.renderCalendar(calendarDate);
            if (UI.calendarModal) UI.calendarModal.classList.remove('hidden');
        };
    }
    const closeCal = document.getElementById('close-calendar');
    if (closeCal) closeCal.onclick = () => UI.calendarModal.classList.add('hidden');
    const prevMonth = document.getElementById('prev-month');
    if (prevMonth) prevMonth.onclick = () => { calendarDate.setMonth(calendarDate.getMonth() - 1); UI.renderCalendar(calendarDate); };
    const nextMonth = document.getElementById('next-month');
    if (nextMonth) nextMonth.onclick = () => { calendarDate.setMonth(calendarDate.getMonth() + 1); UI.renderCalendar(calendarDate); };

    setInterval(() => UI.updateClock(), 1000);
    UI.updateClock();

    // REVISI 3: SCROLL HANDLER FOR PAGE 3 - AUTO HIDE/SHOW NAV
    const page3 = document.getElementById('page-3');
    if (page3) {
        page3.addEventListener('scroll', () => {
            const currentScrollY = page3.scrollTop;
            const nav = document.querySelector('.detail-nav-static');
            if (!nav) return;

            // Threshold to prevent flickering
            if (Math.abs(currentScrollY - lastScrollY) < 5) return;

            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                nav.classList.add('nav-hidden'); // Scroll Down - Hide
            } else {
                nav.classList.remove('nav-hidden'); // Scroll Up or at top - Show
            }
            lastScrollY = currentScrollY;
        }, { passive: true });
    }
}

function selectRealm(cat, show = true) {
    currentCat = cat;
    localStorage.setItem('currentCat', cat);
    document.body.className = `theme-${cat.toLowerCase()}`;
    const titleEl = document.getElementById('category-title');
    if (titleEl) titleEl.innerText = cat.toUpperCase();
    if (UI.modal) UI.modal.classList.add('hidden');
    filters = { search: '', rarity: '', tags: [] };
    const unitSearch = document.getElementById('unit-search');
    if (unitSearch) unitSearch.value = '';
    document.querySelectorAll('.r-chip').forEach(c => c.classList.remove('active'));
    populateTags();
    renderArchive();
    if (show) UI.showPage('page-2');
}

function populateTags() {
    const tags = new Set();
    rawData.filter(u => u.category === currentCat).forEach(u => {
        if (u.tags) u.tags.split(',').forEach(t => tags.add(t.trim()));
    });
    const container = document.getElementById('dynamic-tags');
    if (!container) return;
    container.innerHTML = '';
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 't-chip';
        span.innerText = tag;
        span.onclick = () => {
            if (span.classList.contains('active')) {
                span.classList.remove('active');
                filters.tags = filters.tags.filter(t => t !== tag);
            } else {
                span.classList.add('active');
                filters.tags.push(tag);
            }
            renderArchive();
        };
        container.appendChild(span);
    });
}

function renderArchive() {
    const grid = document.getElementById('unit-grid');
    if (!grid) return;
    const filtered = rawData.filter(u => {
        const matchCat = u.category === currentCat;
        const matchSearch = (u.name || '').toLowerCase().includes(filters.search || '');
        const matchRarity = filters.rarity ? u.rarity === filters.rarity : true;
        const matchTags = filters.tags && filters.tags.length > 0 ? filters.tags.every(t => u.tags && u.tags.includes(t)) : true;
        return matchCat && matchSearch && matchRarity && matchTags;
    });
    grid.innerHTML = filtered.map(u => `
        <div class="unit-card" onclick="showLegendDetail('${u.name.replace(/'/g, "\\'")}')">
            <div style="position:relative">
                <img src="${u.main_image_url || ''}" alt="${u.name || ''}">
                <div class="unit-rarity">${u.rarity || ''}</div>
            </div>
            <div class="unit-info"><div class="name">${u.name || ''}</div></div>
        </div>
    `).join('');

    /* REVISI: Auto-toggle scrolling for page-2: disable scroll when content is small.
       This checks grid height vs container height and adds .no-scroll to #page-2 when content fits. */
    (function adjustPage2Scroll() {
        try {
            const page2 = document.getElementById('page-2');
            if (!page2) return;
            const container = page2.querySelector('.page-container') || page2;
            // small delay to allow images/layout to settle
            const doCheck = () => {
                const gridHeight = grid.scrollHeight || grid.offsetHeight || 0;
                const containerHeight = (container.clientHeight || container.offsetHeight || page2.clientHeight || 0);
                const threshold = 80; // leave some room (headers)
                if (gridHeight > containerHeight - threshold) {
                    page2.classList.remove('no-scroll');
                } else {
                    page2.classList.add('no-scroll');
                }
            };
            setTimeout(doCheck, 80);
            // re-run when images finish loading (in case layout changes)
            Array.from(grid.querySelectorAll('img')).forEach(img => {
                if (img.complete) return; // already loaded
                img.onload = () => setTimeout(doCheck, 80);
                img.onerror = () => setTimeout(doCheck, 80);
            });
        } catch (e) {
            // silent - keep original behavior if something unexpected
        }
    })();
}

function showLegendDetail(name) {
    const unit = rawData.find(u => u.name === name);
    if (!unit) return;
    localStorage.setItem('lastUnit', name);
    const detailImg = document.getElementById('detail-img');
    if (detailImg) detailImg.src = unit.main_image_url || '';
    const rarityBadge = document.getElementById('detail-rarity-badge');
    if (rarityBadge) rarityBadge.innerText = unit.rarity || '';
    const detailName = document.getElementById('detail-name');
    if (detailName) detailName.innerText = unit.name || '';
    const detailNick = document.getElementById('detail-nickname');
    if (detailNick) detailNick.innerText = unit.nickname ? `"${unit.nickname}"` : "";
    const detailStory = document.getElementById('detail-story');
    if (detailStory) detailStory.innerText = unit.story || '';
    const tagContainer = document.getElementById('detail-tags-container');
    if (tagContainer) tagContainer.innerHTML = unit.tags ? unit.tags.split(',').map(t => `<span class="tag" onclick="jumpToTag('${t.trim().replace(/'/g, "\\'")}')">${t.trim()}</span>`).join('') : '';
    const track = document.getElementById('carousel-track');
    if (track) {
        const images = [unit.extra_image_1, unit.extra_image_2, unit.extra_image_3].filter(Boolean);
        const activeIndex = Math.max(0, Math.min(images.length - 1, Math.floor(images.length / 2)));
        track.innerHTML = images.map((img, i) => `<img class="extra-img ${i === activeIndex ? 'active' : ''}" src="${img}" onclick="UI.handleCarousel(this)">`).join('');
    }
    UI.showPage('page-3');
}

function jumpToTag(tag) {
    UI.showPage('page-2');
    const panel = document.getElementById('filter-panel');
    if (panel) panel.classList.remove('hidden');
    filters.tags = [tag];
    renderArchive();
    document.querySelectorAll('.t-chip').forEach(c => {
        if (c.innerText === tag) c.classList.add('active');
        else c.classList.remove('active');
    });
}

// Auto-hide buttons on scroll for Page 3
document.getElementById('page-3').addEventListener('scroll', function() {
    const nav = document.querySelector('.detail-nav-static');
    if (!nav) return;
    
    const currentScrollY = this.scrollTop;
    
    if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down - hide
        nav.classList.add('nav-hidden');
    } else {
        // Scrolling up - show
        nav.classList.remove('nav-hidden');
    }
    lastScrollY = currentScrollY;
});

init();

/* FULL AUTO WATERMARK GRID - ANTI-AI RESISTANT - 50-70% COVERAGE */
function addWatermarkToImage(canvas, ctx) {
    const watermarkText = 'TikTok : ainime.id';
    const w = canvas.width;
    const h = canvas.height;

    // ── LAYER 1: Dense diagonal text grid (main coverage ~40%) ──
    const fontSize1 = Math.max(w / 22, 11);
    ctx.save();
    ctx.rotate(-35 * Math.PI / 180);
    ctx.font = `bold ${fontSize1}px Orbitron, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const stepX1 = w / 2.8;
    const stepY1 = h / 5;
    for (let x = -w * 1.5; x < w * 2.5; x += stepX1) {
        for (let y = -h; y < h * 2; y += stepY1) {
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = 'rgba(255,255,255,1)';
            ctx.fillText(watermarkText, x, y);
            // Slight color shadow offset for anti-AI
            ctx.globalAlpha = 0.10;
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.fillText(watermarkText, x + 2, y + 2);
        }
    }
    ctx.restore();

    // ── LAYER 2: Horizontal grid offset (additional coverage ~20%) ──
    const fontSize2 = Math.max(w / 30, 9);
    ctx.save();
    ctx.rotate(-15 * Math.PI / 180);
    ctx.font = `${fontSize2}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const stepX2 = w / 3.5;
    const stepY2 = h / 7;
    for (let x = -w; x < w * 2; x += stepX2) {
        for (let y = -h * 0.5; y < h * 2; y += stepY2) {
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = 'rgba(255,255,255,1)';
            ctx.fillText('ainime.id', x + stepX2 * 0.5, y + stepY2 * 0.5);
        }
    }
    ctx.restore();

    // ── LAYER 3: Per-character randomized text (disrupts AI segmentation) ──
    const chars = watermarkText.split('');
    const fontSize3 = Math.max(w / 28, 10);
    const cols = Math.ceil(w / (fontSize3 * 2.5));
    const rows = Math.ceil(h / (fontSize3 * 3.5));
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const charIndex = (row * cols + col) % chars.length;
            const cx = (col + 0.5) * (w / cols) + (Math.random() - 0.5) * (fontSize3 * 0.8);
            const cy = (row + 0.5) * (h / rows) + (Math.random() - 0.5) * (fontSize3 * 0.8);
            const charRot = (Math.random() - 0.5) * 0.6;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(charRot);
            ctx.font = `bold ${fontSize3 + Math.random() * 4}px Orbitron, Arial`;
            ctx.globalAlpha = 0.12 + Math.random() * 0.10;
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,1)' : 'rgba(200,200,200,1)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(chars[charIndex], 0, 0);
            ctx.restore();
        }
    }

    // ── LAYER 4: Random noise dots (disrupts AI inpainting) ──
    const noiseDensity = Math.floor(w * h * 0.015); // ~1.5% pixel noise
    for (let i = 0; i < noiseDensity; i++) {
        const nx = Math.random() * w;
        const ny = Math.random() * h;
        const nr = Math.random() * 1.5 + 0.3;
        ctx.globalAlpha = 0.08 + Math.random() * 0.12;
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,1)' : 'rgba(180,180,255,1)';
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, Math.PI * 2);
        ctx.fill();
    }

    // ── LAYER 5: Semi-transparent overlay strip watermarks (border areas) ──
    const fontSize5 = Math.max(w / 35, 8);
    ctx.save();
    ctx.font = `${fontSize5}px Orbitron, Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Top strip
    for (let x = 0; x < w; x += w / 4) {
        ctx.globalAlpha = 0.20;
        ctx.fillStyle = 'rgba(255,255,255,1)';
        ctx.fillText(watermarkText, x + 5, fontSize5 + 3);
        // Bottom strip
        ctx.fillText(watermarkText, x + 5, h - fontSize5 - 3);
    }
    ctx.restore();

    // Reset
    ctx.globalAlpha = 1.0;
}

/* INTERCEPT IMAGE DOWNLOADS - RIGHT CLICK CONTEXT MENU */
document.addEventListener('contextmenu', function(e) {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
        const img = e.target;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.onload = function() {
            canvas.width = tempImg.width;
            canvas.height = tempImg.height;
            ctx.drawImage(tempImg, 0, 0);
            addWatermarkToImage(canvas, ctx);
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'ainime-' + Date.now() + '.png';
            link.click();
        };
        tempImg.src = img.src;
    }
}, true);
