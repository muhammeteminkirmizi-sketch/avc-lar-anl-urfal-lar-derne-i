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
            const p = document.getElementById('heroImagePreview');
            p.src = data.settings.heroImage;
            p.style.display = 'block';
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
        renderBlogs(data.blogs);
    } catch(e) { console.log(e); }
}

// Color Pickers
document.getElementById('setThemePrimary').addEventListener('input', (e) => { document.getElementById('setThemePrimaryHex').value = e.target.value; });
document.getElementById('setThemePrimaryHex').addEventListener('input', (e) => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) document.getElementById('setThemePrimary').value = e.target.value; });
document.getElementById('setThemeAccent').addEventListener('input', (e) => { document.getElementById('setThemeAccentHex').value = e.target.value; });
document.getElementById('setThemeAccentHex').addEventListener('input', (e) => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) document.getElementById('setThemeAccent').value = e.target.value; });

// Slider
document.getElementById('blogBgPosition').addEventListener('input', (e) => { document.getElementById('blogBgPositionVal').innerText = e.target.value + '%'; });

// Custom ID hint
document.getElementById('blogCustomId').addEventListener('input', (e) => { document.getElementById('customIdHint').innerText = e.target.value || '...'; });

// Hero image upload
document.getElementById('heroImageFile').addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    const fd = new FormData(); fd.append('image', e.target.files[0]);
    try {
        const res = await apiCall('/upload', 'POST', fd, true);
        if (res.success) {
            document.getElementById('setHeroImage').value = res.imageUrl;
            const p = document.getElementById('heroImagePreview');
            p.src = res.imageUrl; p.style.display = 'block';
        }
    } catch(e) { alert('Yükleme başarısız!'); }
});

// Blog image upload
document.getElementById('blogImageFile').addEventListener('change', async (e) => {
    if (!e.target.files[0]) return;
    const fd = new FormData(); fd.append('image', e.target.files[0]);
    try {
        const res = await apiCall('/upload', 'POST', fd, true);
        if (res.success) {
            document.getElementById('blogImage').value = res.imageUrl;
            const p = document.getElementById('blogImagePreview');
            p.src = res.imageUrl; p.style.display = 'block';
        }
    } catch(e) { alert('Yükleme başarısız!'); }
});

// Save Settings
document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const settings = {
        heroTitle: document.getElementById('setHeroTitle').value,
        heroSubtitle: document.getElementById('setHeroSubtitle').value,
        heroImage: document.getElementById('setHeroImage').value,
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

function renderBlogs(blogs) {
    const haberler = blogs.filter(b => b.type === 'Haber' || b.type === 'Duyuru');
    const sayfalar = blogs.filter(b => b.type === 'Sayfa');
    const temel = blogs.filter(b => b.type === 'TemelDeger');

    renderGroup('listHaberler', haberler);
    renderGroup('listSayfalar', sayfalar);
    renderGroup('listTemelDeger', temel);
    lucide.createIcons();
}

function renderGroup(containerId, items) {
    const el = document.getElementById(containerId);
    if (!items.length) { el.innerHTML = `<div style="color:#bbb;font-size:.8rem;padding:.5rem;text-align:center;">Henüz içerik yok</div>`; return; }
    el.innerHTML = items.map(b => `
        <div class="content-card" id="card-${b.id}" onclick="editBlog('${b.id}')">
            <div class="content-card-info">
                <div style="display:flex;align-items:center;gap:.4rem;">${badgeHtml(b.type)}<span class="content-card-title">${b.title}</span></div>
                <div class="content-card-meta">${b.date || ''}${b.type === 'Sayfa' ? ` · page.html?id=${b.id}` : ''}</div>
            </div>
            <i data-lucide="chevron-right" style="width:16px;height:16px;color:#ccc;flex-shrink:0;"></i>
        </div>
    `).join('');
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
    document.getElementById('blogContent').value = blog.content || '';
    document.getElementById('blogLink').value = blog.link || '';
    document.getElementById('blogIcon').value = blog.icon || '';
    document.getElementById('blogImage').value = blog.image || '';
    document.getElementById('blogSlider').checked = blog.slider === true || blog.slider === 'true';

    const imgPreview = document.getElementById('blogImagePreview');
    if (blog.image) { imgPreview.src = blog.image; imgPreview.style.display = 'block'; }
    else imgPreview.style.display = 'none';

    let pos = blog.bgPosition || '50';
    if (pos === 'top') pos = '0'; if (pos === 'center') pos = '50'; if (pos === 'bottom') pos = '100';
    document.getElementById('blogBgPosition').value = pos;
    document.getElementById('blogBgPositionVal').innerText = pos + '%';

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
    document.getElementById('blogContent').value = '';
    document.getElementById('blogLink').value = '';
    document.getElementById('blogSlider').checked = false;
    document.getElementById('blogIcon').value = '';
    document.getElementById('blogImage').value = '';
    document.getElementById('blogImagePreview').style.display = 'none';
    document.getElementById('blogBgPosition').value = '50';
    document.getElementById('blogBgPositionVal').innerText = '50%';
    document.getElementById('blogCustomId').value = '';
    document.getElementById('customIdHint').innerText = '...';
    document.getElementById('iconPreview').innerHTML = '';

    setTypeUI(type);
    document.getElementById('editPanelTitle').innerText = 'Yeni ' + { Haber: 'Haber', Duyuru: 'Duyuru', Sayfa: 'Menü Sayfası', TemelDeger: 'Temel Değer' }[type];
    document.getElementById('deleteBlogBtn').onclick = null;
    document.getElementById('deleteBlogBtn').style.display = 'none';

    // Switch to blogs tab
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
    document.getElementById('imageFieldGroup').style.display = type === 'TemelDeger' ? 'none' : 'block';
    document.getElementById('bgPosFieldGroup').style.display = (type === 'Sayfa') ? 'block' : 'none';
    document.getElementById('customIdFieldGroup').style.display = type === 'Sayfa' ? 'block' : 'none';
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
        bgPosition: document.getElementById('blogBgPosition').value,
        content: document.getElementById('blogContent').value,
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
