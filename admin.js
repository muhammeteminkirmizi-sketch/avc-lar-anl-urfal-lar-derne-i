lucide.createIcons();

const API_URL = '/api';
let token = localStorage.getItem('adminToken');

// Elements
const loginOverlay = document.getElementById('loginOverlay');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Init
if (token) { showDashboard(); loadData(); }
else { loginOverlay.style.display = 'flex'; }

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value })
        });
        const data = await res.json();
        if (data.success) { token = data.token; localStorage.setItem('adminToken', token); showDashboard(); loadData(); }
        else { loginError.style.display = 'block'; }
    } catch(err) { alert("Sunucuya bağlanılamadı. Node.js çalışıyor mu?"); }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('adminToken'); token = null;
    dashboard.style.display = 'none'; loginOverlay.style.display = 'flex';
});

function showDashboard() { loginOverlay.style.display = 'none'; dashboard.style.display = 'flex'; }

// Tabs
document.querySelectorAll('.nav-item[data-tab]').forEach(nav => {
    nav.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        nav.classList.add('active');
        document.getElementById(`tab-${nav.dataset.tab}`).classList.add('active');
        lucide.createIcons();
    });
});

// Dropdown
document.addEventListener('click', (e) => {
    const drop = document.getElementById('addDropdown');
    if (!e.target.closest('.dropdown-wrap')) drop.classList.remove('open');
});
function toggleDropdown() { document.getElementById('addDropdown').classList.toggle('open'); lucide.createIcons(); }

// Toast
function showToast(msg, isError = false) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => t.className = 'toast', 3000);
}

// API Helper
async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = { 'Authorization': token };
    if (!isFormData) headers['Content-Type'] = 'application/json';
    const options = { method, headers };
    if (body) options.body = isFormData ? body : JSON.stringify(body);
    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (res.status === 401) { document.getElementById('logoutBtn').click(); throw new Error('Yetkisiz'); }
    return res.json();
}

// Load Data
async function loadData() {
    try {
        const data = await apiCall('/data');

        // Settings
        document.getElementById('setHeroTitle').value = data.settings.heroTitle || '';
        document.getElementById('setHeroSubtitle').value = data.settings.heroSubtitle || '';
        document.getElementById('setHeroImage').value = data.settings.heroImage || '';
        if (data.settings.heroImage) {
            const x = data.settings.heroImageX ?? 50;
            const y = data.settings.heroImageY ?? 50;
            const z = data.settings.heroImageZoom ?? 100;
            document.getElementById('heroImgX').value = x;
            document.getElementById('heroImgY').value = y;
            document.getElementById('heroImgZoom').value = z;
            document.getElementById('setHeroImageX').value = x;
            document.getElementById('setHeroImageY').value = y;
            document.getElementById('setHeroImageZoom').value = z;
            showHeroCropEditor(data.settings.heroImage);
        }
        document.getElementById('setThemePrimary').value = data.settings.themePrimary || '#0f766e';
        document.getElementById('setThemePrimaryHex').value = data.settings.themePrimary || '#0f766e';
        document.getElementById('setThemeAccent').value = data.settings.themeAccent || '#f59e0b';
        document.getElementById('setThemeAccentHex').value = data.settings.themeAccent || '#f59e0b';
        document.getElementById('setSocialFacebook').value = data.settings.socialFacebook || '';
        document.getElementById('setSocialTwitter').value = data.settings.socialTwitter || '';
        document.getElementById('setSocialInstagram').value = data.settings.socialInstagram || '';
        document.getElementById('setSocialYoutube').value = data.settings.socialYoutube || '';

        // Stats
        document.getElementById('statStudents').value = data.stats.students || '';
        document.getElementById('statPrograms').value = data.stats.programs || '';
        document.getElementById('statEstablished').value = data.stats.established || '';
        document.getElementById('statAlumni').value = data.stats.alumni || '';

        // Blogs
        renderBlogs(data.blogs, data.settings?.sectionOrder);
    } catch(e) { console.log(e); }
}

// =============================================
// ===== BLOCK EDITOR ENGINE ===================
// =============================================
let blockDragSrcEl = null;

function addBlock(type, data = {}) {
    const list = document.getElementById('blockList');
    const id = 'blk_' + Date.now() + Math.random().toString(36).slice(2,6);
    const el = document.createElement('div');
    el.className = 'block-item';
    el.dataset.blockType = type;
    el.dataset.blockId = id;
    el.draggable = true;

    const badges = { paragraph: ['P', 'block-badge-paragraph'], heading: ['H2', 'block-badge-heading'], image: ['IMG', 'block-badge-image'], quote: ['"', 'block-badge-quote'] };
    const [badge, badgeClass] = badges[type] || ['?', ''];

    let inner = '';
    if (type === 'paragraph') {
        inner = `<textarea class="block-textarea" placeholder="Paragraf yazın...">${data.value || ''}</textarea>`;
    } else if (type === 'heading') {
        inner = `<input class="block-heading-input" placeholder="Alt başlık..." value="${(data.value || '').replace(/"/g, '&quot;')}">`;
    } else if (type === 'image') {
        const hasImg = data.url ? 'display:block;' : '';
        inner = `
            <div style="display:flex;gap:.4rem;align-items:center;">
                <input type="text" class="block-img-url" placeholder="Görsel URL veya yükle..." value="${data.url || ''}" style="flex:1;font-size:.78rem;border:1px solid #ddd;border-radius:4px;padding:.3rem .5rem;">
                <label style="white-space:nowrap;cursor:pointer;">
                    <input type="file" accept="image/*" style="display:none;" onchange="blockUploadImage(this, '${id}')">
                    <span class="btn btn-outline btn-sm" style="font-size:.7rem;pointer-events:none;">Yükle</span>
                </label>
            </div>
            <img class="block-image-preview" id="bimg_${id}" src="${data.url || ''}" style="${hasImg}max-height:180px;width:100%;object-fit:cover;border-radius:6px;margin-top:.3rem;">
            <input class="block-caption-input" placeholder="Alt yazı (opsiyonel)..." value="${data.caption || ''}">`;
    } else if (type === 'quote') {
        inner = `<textarea class="block-quote-input" placeholder="Alıntı metni...">${data.value || ''}</textarea>`;
    }

    el.innerHTML = `
        <span class="block-drag-handle" title="Sürükle">⠿</span>
        <span class="block-type-badge ${badgeClass}">${badge}</span>
        <div class="block-input-wrap">${inner}</div>
        <button type="button" class="block-del-btn" onclick="removeBlock('${id}')" title="Sil">✕</button>`;

    // Drag events
    el.addEventListener('dragstart', (e) => { blockDragSrcEl = el; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); document.querySelectorAll('.block-item').forEach(b => b.classList.remove('drag-over')); });
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', (e) => {
        e.preventDefault(); el.classList.remove('drag-over');
        if (blockDragSrcEl && blockDragSrcEl !== el) {
            list.insertBefore(blockDragSrcEl, el);
        }
    });

    // URL input → update preview
    if (type === 'image') {
        const urlInput = el.querySelector('.block-img-url');
        urlInput.addEventListener('input', () => {
            const img = el.querySelector('.block-image-preview');
            img.src = urlInput.value;
            img.style.display = urlInput.value ? 'block' : 'none';
        });
    }

    list.appendChild(el);
    lucide.createIcons();
}

async function blockUploadImage(fileInput, blockId) {
    const file = fileInput.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('image', file);
    try {
        const res = await apiCall('/upload', 'POST', fd, true);
        if (res.success) {
            const el = document.querySelector(`[data-block-id="${blockId}"]`);
            if (!el) return;
            const urlInput = el.querySelector('.block-img-url');
            const img = el.querySelector('.block-image-preview');
            urlInput.value = res.imageUrl;
            img.src = res.imageUrl;
            img.style.display = 'block';
        }
    } catch(e) { alert('Yükleme başarısız!'); }
}

function removeBlock(id) {
    const el = document.querySelector(`[data-block-id="${id}"]`);
    if (el) el.remove();
}

function getBlocks() {
    const list = document.getElementById('blockList');
    const blocks = [];
    list.querySelectorAll('.block-item').forEach(el => {
        const type = el.dataset.blockType;
        if (type === 'paragraph' || type === 'quote') {
            blocks.push({ type, value: el.querySelector('textarea').value });
        } else if (type === 'heading') {
            blocks.push({ type, value: el.querySelector('input.block-heading-input').value });
        } else if (type === 'image') {
            blocks.push({
                type,
                url: el.querySelector('.block-img-url').value,
                caption: el.querySelector('.block-caption-input').value
            });
        }
    });
    return blocks;
}

function loadBlocks(blocks) {
    document.getElementById('blockList').innerHTML = '';
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
        // Add one empty paragraph by default
        addBlock('paragraph');
        return;
    }
    blocks.forEach(b => addBlock(b.type, b));
}

// Render blocks to HTML for display
function renderBlocksToHTML(blocks) {
    if (!blocks || !Array.isArray(blocks)) return '';
    return blocks.map(b => {
        if (b.type === 'paragraph') return `<p class="article-paragraph">${(b.value || '').replace(/\n/g, '<br>')}</p>`;
        if (b.type === 'heading')   return `<h2 class="article-heading">${b.value || ''}</h2>`;
        if (b.type === 'quote')     return `<blockquote class="article-quote">${(b.value || '').replace(/\n/g, '<br>')}</blockquote>`;
        if (b.type === 'image')     return `<figure class="article-figure"><img src="${b.url || ''}" alt="${b.caption || ''}" loading="lazy"><figcaption>${b.caption || ''}</figcaption></figure>`;
        return '';
    }).join('');
}

// =============================================

// Color Pickers
document.getElementById('setThemePrimary').addEventListener('input', (e) => { document.getElementById('setThemePrimaryHex').value = e.target.value; });
document.getElementById('setThemePrimaryHex').addEventListener('input', (e) => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) document.getElementById('setThemePrimary').value = e.target.value; });
document.getElementById('setThemeAccent').addEventListener('input', (e) => { document.getElementById('setThemeAccentHex').value = e.target.value; });
document.getElementById('setThemeAccentHex').addEventListener('input', (e) => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) document.getElementById('setThemeAccent').value = e.target.value; });

// Custom ID hint
document.getElementById('blogCustomId').addEventListener('input', (e) => { document.getElementById('customIdHint').innerText = e.target.value || '...'; });

// Hero image upload → opens hero crop editor
document.getElementById('heroImageFile').addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    const fd = new FormData(); fd.append('image', e.target.files[0]);
    try {
        const res = await apiCall('/upload', 'POST', fd, true);
        if (res.success) {
            document.getElementById('setHeroImage').value = res.imageUrl;
            showHeroCropEditor(res.imageUrl);
        }
    } catch(e) { alert('Yükleme başarısız!'); }
});

// ---- HERO CROP EDITOR ----
function showHeroCropEditor(imageUrl) {
    const editor = document.getElementById('heroCropEditor');
    const inner = document.getElementById('heroCropPreviewInner');
    if (!editor || !inner) return;
    inner.style.backgroundImage = `url('${imageUrl}')`;
    updateHeroCropPreview();
    editor.style.display = 'block';
}

function updateHeroCropPreview() {
    const inner = document.getElementById('heroCropPreviewInner');
    const x = document.getElementById('heroImgX').value;
    const y = document.getElementById('heroImgY').value;
    const zoom = document.getElementById('heroImgZoom').value;
    const zoomVal = document.getElementById('heroZoomVal');
    if (!inner) return;
    inner.style.backgroundPosition = `${x}% ${y}%`;
    inner.style.backgroundSize = `${zoom}%`;
    if (zoomVal) zoomVal.textContent = zoom;
    document.getElementById('setHeroImageX').value = x;
    document.getElementById('setHeroImageY').value = y;
    document.getElementById('setHeroImageZoom').value = zoom;
}

// Hero crop drag-to-reposition
let heroCropDragging = false, heroCropStartX = 0, heroCropStartY = 0, heroCropValX = 50, heroCropValY = 50;
function heroCropDragStart(e) {
    heroCropDragging = true;
    heroCropStartX = e.clientX; heroCropStartY = e.clientY;
    heroCropValX = parseInt(document.getElementById('heroImgX').value);
    heroCropValY = parseInt(document.getElementById('heroImgY').value);
    document.addEventListener('mousemove', heroCropDragMove);
    document.addEventListener('mouseup', heroCropDragEnd);
}
function heroCropDragMove(e) {
    if (!heroCropDragging) return;
    const dx = (e.clientX - heroCropStartX) * -0.3;
    const dy = (e.clientY - heroCropStartY) * -0.3;
    document.getElementById('heroImgX').value = Math.max(0, Math.min(100, heroCropValX + dx));
    document.getElementById('heroImgY').value = Math.max(0, Math.min(100, heroCropValY + dy));
    updateHeroCropPreview();
}
function heroCropDragEnd() {
    heroCropDragging = false;
    document.removeEventListener('mousemove', heroCropDragMove);
    document.removeEventListener('mouseup', heroCropDragEnd);
}


// Blog image upload → opens crop editor
document.getElementById('blogImageFile').addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    const fd = new FormData(); fd.append('image', e.target.files[0]);
    try {
        const res = await apiCall('/upload', 'POST', fd, true);
        if (res.success) {
            document.getElementById('blogImage').value = res.imageUrl;
            showCropEditor(res.imageUrl);
        }
    } catch(e) { alert('Yükleme başarısız!'); }
});

// Color pickers sync (title)
document.getElementById('blogTitleColor').addEventListener('input', (e) => { document.getElementById('blogTitleColorHex').value = e.target.value; });
document.getElementById('blogTitleColorHex').addEventListener('input', (e) => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) document.getElementById('blogTitleColor').value = e.target.value; });
// Color pickers sync (content)
document.getElementById('blogContentColor').addEventListener('input', (e) => { document.getElementById('blogContentColorHex').value = e.target.value; });
document.getElementById('blogContentColorHex').addEventListener('input', (e) => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) document.getElementById('blogContentColor').value = e.target.value; });

// ---- IMAGE CROP EDITOR ----
// Dimensions per content type (width x height in px as shown on site)
const CROP_DIMS = {
    Haber:      { w: 1920, h: 1080, label: 'Slider: 1920 × 1080 px (16:9)' },
    Duyuru:     { w: 1920, h: 1080, label: 'Slider: 1920 × 1080 px (16:9)' },
    Blog:       { w: 1920, h: 1080, label: 'Kart: 1920 × 1080 px (16:9)' },
    TemelDeger: { w: 1920, h: 1080, label: 'Kart: 1920 × 1080 px (16:9)' },
    Sayfa:      { w: 1920, h: 1080, label: 'Sayfa: 1920 × 1080 px (16:9)' },
};

function showCropEditor(imageUrl) {
    const editor = document.getElementById('imageCropEditor');
    const inner = document.getElementById('cropPreviewInner');
    const box = document.getElementById('cropPreviewBox');
    const label = document.getElementById('cropSizeLabel');
    if (!editor || !inner || !box) return;

    const type = document.getElementById('blogType').value || 'Haber';
    const dims = CROP_DIMS[type] || CROP_DIMS['Haber'];
    const ratio = dims.h / dims.w;
    box.style.height = Math.round(box.offsetWidth * ratio) + 'px';
    if (label) label.textContent = dims.label;

    inner.style.width = '100%';
    inner.style.height = '100%';
    inner.style.backgroundImage = `url('${imageUrl}')`;
    updateCropPreview();
    editor.style.display = 'block';
}

function updateCropPreview() {
    const inner = document.getElementById('cropPreviewInner');
    const x = document.getElementById('cropX').value;
    const y = document.getElementById('cropY').value;
    const zoom = document.getElementById('cropZoom').value;
    const zoomVal = document.getElementById('cropZoomVal');
    if (!inner) return;
    inner.style.backgroundPosition = `${x}% ${y}%`;
    inner.style.backgroundSize = `${zoom}%`;
    if (zoomVal) zoomVal.textContent = zoom;
    // sync hidden fields
    document.getElementById('blogImageX').value = x;
    document.getElementById('blogImageY').value = y;
    document.getElementById('blogImageZoom').value = zoom;
}

// Drag to reposition image inside crop preview
let cropDragging = false, cropStartX = 0, cropStartY = 0, cropStartValX = 50, cropStartValY = 50;
function cropDragStart(e) {
    cropDragging = true;
    cropStartX = e.clientX; cropStartY = e.clientY;
    cropStartValX = parseInt(document.getElementById('cropX').value);
    cropStartValY = parseInt(document.getElementById('cropY').value);
    document.addEventListener('mousemove', cropDragMove);
    document.addEventListener('mouseup', cropDragEnd);
}
function cropDragMove(e) {
    if (!cropDragging) return;
    const dx = (e.clientX - cropStartX) * -0.3;
    const dy = (e.clientY - cropStartY) * -0.3;
    const newX = Math.max(0, Math.min(100, cropStartValX + dx));
    const newY = Math.max(0, Math.min(100, cropStartValY + dy));
    document.getElementById('cropX').value = newX;
    document.getElementById('cropY').value = newY;
    updateCropPreview();
}
function cropDragEnd() {
    cropDragging = false;
    document.removeEventListener('mousemove', cropDragMove);
    document.removeEventListener('mouseup', cropDragEnd);
}


// Save Settings
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = {
        heroTitle: document.getElementById('setHeroTitle').value,
        heroSubtitle: document.getElementById('setHeroSubtitle').value,
        heroImage: document.getElementById('setHeroImage').value,
        heroImageX: parseInt(document.getElementById('setHeroImageX').value) || 50,
        heroImageY: parseInt(document.getElementById('setHeroImageY').value) || 50,
        heroImageZoom: parseInt(document.getElementById('setHeroImageZoom').value) || 100,
        themePrimary: document.getElementById('setThemePrimaryHex').value,
        themeAccent: document.getElementById('setThemeAccentHex').value,
        socialFacebook: document.getElementById('setSocialFacebook').value,
        socialTwitter: document.getElementById('setSocialTwitter').value,
        socialInstagram: document.getElementById('setSocialInstagram').value,
        socialYoutube: document.getElementById('setSocialYoutube').value
    };
    await apiCall('/settings', 'POST', { settings });
    showToast('Ayarlar kaydedildi!');
});

// Save Stats
document.getElementById('statsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const stats = {
        students: document.getElementById('statStudents').value,
        programs: document.getElementById('statPrograms').value,
        established: document.getElementById('statEstablished').value,
        alumni: document.getElementById('statAlumni').value
    };
    await apiCall('/settings', 'POST', { stats });
    showToast('İstatistikler kaydedildi!');
});

// ---- BLOG MANAGEMENT ----

function badgeHtml(type) {
    const map = { Haber: 'badge-haber', Duyuru: 'badge-duyuru', Sayfa: 'badge-sayfa', TemelDeger: 'badge-temeldeger' };
    const labelMap = { Haber: 'HABER', Duyuru: 'DUYURU', Sayfa: 'SAYFA', TemelDeger: 'DEĞER' };
    return `<span class="type-badge ${map[type] || ''}">${labelMap[type] || type}</span>`;
}

function renderBlogs(blogs, sectionOrder) {
    const haberler = blogs.filter(b => b.type === 'Haber' || b.type === 'Duyuru').sort((a,b) => (a.order||0)-(b.order||0));
    const sayfalar = blogs.filter(b => b.type === 'Sayfa').sort((a,b) => (a.order||0)-(b.order||0));
    const temel = blogs.filter(b => b.type === 'TemelDeger').sort((a,b) => (a.order||0)-(b.order||0));
    const sliderItems = blogs.filter(b => b.slider === true || b.slider === 'true').sort((a,b) => (a.order||0)-(b.order||0));

    renderGroup('listHaberler', haberler);
    renderGroup('listSayfalar', sayfalar);
    renderGroup('listTemelDeger', temel);
    renderSectionOrder(sectionOrder || ['temelDegerler', 'haberler']);
    lucide.createIcons();
}

function renderGroup(containerId, items) {
    const el = document.getElementById(containerId);
    if (!items.length) { el.innerHTML = `<div style="color:#bbb;font-size:.8rem;padding:.5rem;text-align:center;">Henüz içerik yok</div>`; return; }
    el.innerHTML = items.map(b => `
        <div class="content-card" id="card-${b.id}" data-id="${b.id}" draggable="true"
             ondragstart="onDragStart(event,'${containerId}')" ondragover="onDragOver(event)" ondrop="onDrop(event,'${containerId}')" ondragend="onDragEnd(event)">
            <span class="drag-handle" title="Sürükle">⠿</span>
            <div class="content-card-info" onclick="editBlog('${b.id}')">
                <div style="display:flex;align-items:center;gap:.4rem;">${badgeHtml(b.type)}${b.slider ? '<span style="font-size:.7rem;background:#0f766e22;color:var(--primary);padding:.1rem .4rem;border-radius:3px;font-weight:700;">SLIDER</span>' : ''}<span class="content-card-title">${b.title}</span></div>
                <div class="content-card-meta">${b.date || ''}${b.type === 'Sayfa' ? ` · page.html?id=${b.id}` : ''}</div>
            </div>
            <i data-lucide="chevron-right" style="width:16px;height:16px;color:#ccc;flex-shrink:0;" onclick="editBlog('${b.id}')"></i>
        </div>
    `).join('');
    lucide.createIcons();
}

// ---- DRAG & DROP ----
let dragSrcId = null;

function onDragStart(e, groupId) {
    dragSrcId = e.currentTarget.dataset.id;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}
function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}
function onDragEnd(e) {
    document.querySelectorAll('.content-card').forEach(c => c.classList.remove('dragging','drag-over'));
}
async function onDrop(e, groupId) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const targetId = e.currentTarget.dataset.id;
    if (!dragSrcId || dragSrcId === targetId) return;
    const container = document.getElementById(groupId);
    const cards = [...container.querySelectorAll('.content-card')];
    const srcIdx = cards.findIndex(c => c.dataset.id === dragSrcId);
    const tgtIdx = cards.findIndex(c => c.dataset.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [moved] = cards.splice(srcIdx, 1);
    cards.splice(tgtIdx, 0, moved);
    container.innerHTML = '';
    cards.forEach(c => container.appendChild(c));
    const newOrder = cards.map(c => c.dataset.id);
    await apiCall('/reorder', 'POST', { ids: newOrder });
    showToast('Sıralama kaydedildi!');
    lucide.createIcons();
}

// ---- SECTION ORDER ----
let currentSectionOrder = ['temelDegerler', 'haberler'];

function renderSectionOrder(order) {
    currentSectionOrder = order;
    const el = document.getElementById('sectionOrderList');
    if (!el) return;
    const labels = { temelDegerler: '⭐ Temel Değerlerimiz', haberler: '📰 Haberler & Duyurular' };
    el.innerHTML = order.map((s, i) => `
        <div class="section-order-item" data-section="${s}" draggable="true"
             ondragstart="onSectionDragStart(event)" ondragover="onSectionDragOver(event)" ondrop="onSectionDrop(event)">
            <span class="drag-handle">⠿</span>
            <span>${labels[s] || s}</span>
            <span style="margin-left:auto;font-size:.75rem;color:#aaa;">${i === 0 ? '↑ Üst' : '↓ Alt'}</span>
        </div>`).join('');
}

let sectionDragSrc = null;
function onSectionDragStart(e) { sectionDragSrc = e.currentTarget.dataset.section; e.currentTarget.classList.add('dragging'); }
function onSectionDragOver(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }
async function onSectionDrop(e) {
    e.preventDefault();
    document.querySelectorAll('.section-order-item').forEach(c => c.classList.remove('dragging','drag-over'));
    const targetSection = e.currentTarget.dataset.section;
    if (!sectionDragSrc || sectionDragSrc === targetSection) return;
    const newOrder = [...currentSectionOrder];
    const si = newOrder.indexOf(sectionDragSrc), ti = newOrder.indexOf(targetSection);
    [newOrder[si], newOrder[ti]] = [newOrder[ti], newOrder[si]];
    renderSectionOrder(newOrder);
    await apiCall('/section-order', 'POST', { sectionOrder: newOrder });
    showToast('Bölüm sıraması kaydedildi!');
}

let currentBlogId = null;


async function editBlog(id) {
    const data = await apiCall('/data');
    const blog = data.blogs.find(b => b.id === id);
    if (!blog) return;

    currentBlogId = id;

    // Highlight card
    document.querySelectorAll('.content-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById(`card-${id}`);
    if (card) card.classList.add('active');

    // Fill form
    document.getElementById('blogId').value = blog.id;
    document.getElementById('blogTitle').value = blog.title;
    
    // Blocks
    if (blog.contentBlocks && blog.contentBlocks.length > 0) {
        loadBlocks(blog.contentBlocks);
    } else {
        loadBlocks([{ type: 'paragraph', value: blog.content || '' }]);
    }
    document.getElementById('blogLink').value = blog.link || '';
    document.getElementById('blogIcon').value = blog.icon || '';
    document.getElementById('blogImage').value = blog.image || '';
    document.getElementById('blogSlider').checked = blog.slider === true || blog.slider === 'true';

    // Colors
    const titleCol = blog.titleColor || '#1a1a2e';
    const contentCol = blog.contentColor || '#444444';
    document.getElementById('blogTitleColor').value = titleCol;
    document.getElementById('blogTitleColorHex').value = titleCol;
    document.getElementById('blogContentColor').value = contentCol;
    document.getElementById('blogContentColorHex').value = contentCol;

    // Crop editor
    const cropEditor = document.getElementById('imageCropEditor');
    if (blog.image) {
        document.getElementById('cropX').value = blog.imageX ?? 50;
        document.getElementById('cropY').value = blog.imageY ?? 50;
        document.getElementById('cropZoom').value = blog.imageZoom ?? 100;
        document.getElementById('blogImageX').value = blog.imageX ?? 50;
        document.getElementById('blogImageY').value = blog.imageY ?? 50;
        document.getElementById('blogImageZoom').value = blog.imageZoom ?? 100;
        showCropEditor(blog.image);
    } else {
        if (cropEditor) cropEditor.style.display = 'none';
    }

    document.getElementById('blogCustomId').value = blog.id;
    document.getElementById('customIdHint').innerText = blog.id;

    setTypeUI(blog.type || 'Haber');

    if (blog.icon) updateIconPreview(blog.icon);

    document.getElementById('editPanelTitle').innerText = blog.title;
    document.getElementById('deleteBlogBtn').onclick = () => deleteBlog(id);

    showEditPanel();
}

function openNewItem(type) {
    currentBlogId = null;
    document.getElementById('blogId').value = '';
    document.getElementById('blogTitle').value = '';
    loadBlocks([]);
    document.getElementById('blogLink').value = '';
    document.getElementById('blogSlider').checked = false;
    document.getElementById('blogIcon').value = '';
    document.getElementById('blogImage').value = '';
    document.getElementById('blogCustomId').value = '';
    document.getElementById('customIdHint').innerText = '...';
    document.getElementById('iconPreview').innerHTML = '';
    // Reset colors
    document.getElementById('blogTitleColor').value = '#1a1a2e';
    document.getElementById('blogTitleColorHex').value = '#1a1a2e';
    document.getElementById('blogContentColor').value = '#444444';
    document.getElementById('blogContentColorHex').value = '#444444';
    // Reset crop editor
    const cropEditor = document.getElementById('imageCropEditor');
    if (cropEditor) cropEditor.style.display = 'none';
    document.getElementById('cropX').value = 50;
    document.getElementById('cropY').value = 50;
    document.getElementById('cropZoom').value = 100;

    setTypeUI(type);
    document.getElementById('editPanelTitle').innerText = 'Yeni ' + { Haber: 'Haber', Duyuru: 'Duyuru', Sayfa: 'Menü Sayfası', TemelDeger: 'Temel Değer' }[type];
    document.getElementById('deleteBlogBtn').onclick = null;
    document.getElementById('deleteBlogBtn').style.display = 'none';

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-tab="blogs"]').classList.add('active');
    document.getElementById('tab-blogs').classList.add('active');

    showEditPanel();
}

function setTypeUI(type) {
    document.getElementById('blogType').value = type;

    const types = ['Haber', 'Duyuru', 'Sayfa', 'TemelDeger'];
    const labels = { Haber: 'Haber', Duyuru: 'Duyuru', Sayfa: 'Menü Sayfası', TemelDeger: 'Temel Değer' };
    const sel = document.getElementById('typeSelector');
    sel.innerHTML = types.map(t => `<button type="button" class="type-btn ${t === type ? 'active' : ''}" onclick="setTypeUI('${t}')">${labels[t]}</button>`).join('');

    // Show/hide fields
    document.getElementById('iconFieldGroup').style.display = type === 'TemelDeger' ? 'block' : 'none';
    document.getElementById('linkFieldGroup').style.display = type === 'TemelDeger' ? 'block' : 'none';
    document.getElementById('imageFieldGroup').style.display = 'block'; // Tüm türler görsel ekleyebilir

    document.getElementById('customIdFieldGroup').style.display = type === 'Sayfa' ? 'block' : 'none';

    // Refresh crop editor dimensions if image is already set
    const imgUrl = document.getElementById('blogImage').value;
    if (imgUrl) showCropEditor(imgUrl);
}

function showEditPanel() {
    document.getElementById('editPlaceholder').style.display = 'none';
    document.getElementById('editPanelForm').style.display = 'block';
    document.getElementById('deleteBlogBtn').style.display = currentBlogId ? 'inline-flex' : 'none';
    lucide.createIcons();
}

function closeEditPanel() {
    document.getElementById('editPlaceholder').style.display = 'flex';
    document.getElementById('editPanelForm').style.display = 'none';
    document.querySelectorAll('.content-card').forEach(c => c.classList.remove('active'));
    currentBlogId = null;
}

// Save Blog
document.getElementById('blogForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('blogType').value;
    const customId = document.getElementById('blogCustomId').value.trim();
    const existingId = document.getElementById('blogId').value;

    let finalId = existingId;
    if (type === 'Sayfa' && customId && !existingId) finalId = customId;

    const blog = {
        id: finalId,
        title: document.getElementById('blogTitle').value,
        image: document.getElementById('blogImage').value,
        imageX: parseInt(document.getElementById('blogImageX').value) || 50,
        imageY: parseInt(document.getElementById('blogImageY').value) || 50,
        imageZoom: parseInt(document.getElementById('blogImageZoom').value) || 100,
        titleColor: document.getElementById('blogTitleColorHex').value || '#1a1a2e',
        contentColor: document.getElementById('blogContentColorHex').value || '#444444',
        contentBlocks: getBlocks(),
        contentHtml: renderBlocksToHTML(getBlocks()),
        content: getBlocks().map(b => b.value || b.caption || '').join(' ').substring(0, 300),
        type: type,
        icon: document.getElementById('blogIcon').value,
        link: document.getElementById('blogLink').value,
        slider: document.getElementById('blogSlider').checked
    };

    const res = await apiCall('/blogs', 'POST', blog);
    if (res.success) {
        renderBlogs(res.blogs);
        showToast('Başarıyla kaydedildi!');
        if (!existingId && res.blogs) {
            const saved = res.blogs.find(b => b.title === blog.title);
            if (saved) { document.getElementById('blogId').value = saved.id; currentBlogId = saved.id; }
        }
    }
});

async function deleteBlog(id) {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    const res = await apiCall(`/blogs/${id}`, 'DELETE');
    if (res.success) { renderBlogs(res.blogs); closeEditPanel(); showToast('Silindi!'); }
}

// ---- ICON PICKER ----

const ICONS = [
    'heart-handshake','book-open','music','users','calendar','star','globe','home','award',
    'gift','map-pin','phone','mail','shield','building','graduation-cap','handshake',
    'lightbulb','megaphone','flag','sun','leaf','mountain','camera','video','mic',
    'briefcase','coffee','clock','heart','smile','zap','target','trending-up','layers',
    'feather','anchor','compass','gem','crown','fire','bell','badge-check','sparkles','palette'
];

let selectedIcon = '';

function buildIconGrid(filter = '') {
    const grid = document.getElementById('iconGrid');
    const filtered = filter ? ICONS.filter(i => i.includes(filter.toLowerCase())) : ICONS;
    grid.innerHTML = filtered.map(icon => `
        <div class="icon-item ${icon === selectedIcon ? 'selected' : ''}" onclick="selectIcon('${icon}')" title="${icon}">
            <i data-lucide="${icon}"></i>
            <span>${icon}</span>
        </div>
    `).join('');
    lucide.createIcons();
}

function openIconPicker() {
    selectedIcon = document.getElementById('blogIcon').value;
    document.getElementById('iconSearch').value = '';
    document.getElementById('iconPickerModal').classList.add('open');
    buildIconGrid();
}

function closeIconPicker() { document.getElementById('iconPickerModal').classList.remove('open'); }

function filterIcons(val) { buildIconGrid(val); }

function selectIcon(icon) {
    selectedIcon = icon;
    document.getElementById('blogIcon').value = icon;
    updateIconPreview(icon);
    closeIconPicker();
}

function updateIconPreview(icon) {
    const box = document.getElementById('iconPreview');
    box.innerHTML = `<i data-lucide="${icon}"></i>`;
    lucide.createIcons();
}
