// Initialize Icons
lucide.createIcons();

// DOM Elements
const navbar = document.getElementById('navbar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

// Load dynamic data from Node.js Backend
async function loadDynamicData() {
    try {
        const res = await fetch('/api/data');
        if (!res.ok) return;
        const data = await res.json();
        
        // Update Settings
        if(data.settings) {
            if (data.settings.themePrimary) {
                document.documentElement.style.setProperty('--primary', data.settings.themePrimary);
            }
            if (data.settings.themeAccent) {
                document.documentElement.style.setProperty('--accent', data.settings.themeAccent);
            }
            
            const titleEl = document.querySelector('.hero-title');
            if(titleEl && data.settings.heroTitle) titleEl.innerHTML = data.settings.heroTitle;
            
            const subtitleEl = document.querySelector('.hero-subtitle');
            if(subtitleEl && data.settings.heroSubtitle) subtitleEl.innerHTML = data.settings.heroSubtitle;
            
            const homeEl = document.getElementById('home');
            if(homeEl && data.settings.heroImage) {
                const imgUrl = data.settings.heroImage;
                homeEl.style.backgroundImage = `linear-gradient(rgba(15, 118, 110, 0.4), rgba(20, 40, 50, 0.7)), url('${imgUrl}')`;
            }
            
            // Social Links
            const socialLinksEl = document.querySelector('.social-links');
            if (socialLinksEl) {
                let sHtml = '';
                sHtml += `<a href="${data.settings.socialFacebook || '#'}" target="_blank" class="social-icon" style="background: white; padding: 8px;" title="Facebook"><img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" style="width: 100%; height: 100%; object-fit: contain;"></a>`;
                sHtml += `<a href="${data.settings.socialTwitter || '#'}" target="_blank" class="social-icon" style="background: white; padding: 8px;" title="Twitter / X"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg" style="width: 100%; height: 100%; object-fit: contain;"></a>`;
                sHtml += `<a href="${data.settings.socialInstagram || '#'}" target="_blank" class="social-icon" style="background: white; padding: 6px;" title="Instagram"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg" style="width: 100%; height: 100%; object-fit: contain;"></a>`;
                sHtml += `<a href="${data.settings.socialYoutube || '#'}" target="_blank" class="social-icon" style="background: white; padding: 8px;" title="YouTube"><img src="https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg" style="width: 100%; height: 100%; object-fit: contain;"></a>`;
                
                socialLinksEl.innerHTML = sHtml;
            }
        }
        
        // Update Stats
        if(data.stats) {
            const statNumbers = document.querySelectorAll('.stat-number');
            if(statNumbers.length >= 4) {
                statNumbers[0].setAttribute('data-target', data.stats.students);
                statNumbers[1].setAttribute('data-target', data.stats.programs);
                statNumbers[2].setAttribute('data-target', data.stats.established);
                statNumbers[3].setAttribute('data-target', data.stats.alumni);
            }
        }

        // Build Haber Slider
        buildNewsSlider(data.blogs || []);

        // Render News and Blogs
        const newsGrid = document.getElementById('newsGrid');
        if(newsGrid) {
            newsGrid.innerHTML = '';
            
            if(data.news && data.news.length > 0) {
                data.news.forEach(item => {
                    const color = item.type === 'Duyuru' ? 'var(--accent)' : 'var(--primary)';
                    newsGrid.innerHTML += `
                        <div class="glass-panel reveal-up" style="padding: 2rem;">
                            <span style="color: ${color}; font-weight: 600; font-size: 0.875rem; margin-bottom: 0.5rem; display: block;">${item.type} - ${item.date}</span>
                            <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">${item.title}</h3>
                            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${item.description}</p>
                            <a href="#" class="card-link">Devamını Oku <i data-lucide="arrow-right"></i></a>
                        </div>
                    `;
                });
            }

            if(data.blogs && data.blogs.length > 0) {
                data.blogs.forEach(blog => {
                    if(blog.type === "Sayfa" || blog.type === "TemelDeger") return; // Bunları haber akışında gösterme
                    
                    let imageHtml = blog.image 
                        ? `<div style="height: 150px; background-image: url('${blog.image}'); background-size: cover; background-position: center; border-radius: 8px; margin-bottom: 1rem;"></div>` 
                        : '';
                        
                    newsGrid.innerHTML += `
                        <div class="glass-panel reveal-up" style="padding: 2rem;">
                            ${imageHtml}
                            <span style="color: var(--text-muted); font-weight: 600; font-size: 0.875rem; margin-bottom: 0.5rem; display: block;">${blog.type || 'Blog'} - ${blog.date}</span>
                            <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">${blog.title}</h3>
                            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${blog.content.substring(0, 80)}...</p>
                            <a href="page.html?id=${blog.id}" class="card-link">Okumaya Devam Et <i data-lucide="arrow-right"></i></a>
                        </div>
                    `;
                });
            }
            lucide.createIcons();
        }
        
        // Temel Değerlerimiz section
        const facultiesGrid = document.querySelector('.faculties-grid');
        if (facultiesGrid && data.blogs) {
            const temelDegerler = data.blogs.filter(b => b.type === 'TemelDeger');
            if (temelDegerler.length > 0) {
                facultiesGrid.innerHTML = temelDegerler.map(td => `
                    <div class="faculty-card glass-panel reveal-up">
                        <div class="card-content" style="padding-top: 2.5rem;">
                            <div class="card-icon"><i data-lucide="${td.icon || 'star'}"></i></div>
                            <h3>${td.title}</h3>
                            <p>${td.content}</p>
                            <a href="${td.link || '#'}" class="card-link">Detaylı Bilgi <i data-lucide="arrow-right"></i></a>
                        </div>
                    </div>
                `).join('');
                lucide.createIcons();
            }
        }
        
        // Page.html içeriğini yükleme (Eğer page.html sayfasındaysak)
        const urlParams = new URLSearchParams(window.location.search);
        const pageId = urlParams.get('id');
        if (pageId && data.blogs) {
            const pageData = data.blogs.find(b => b.id === pageId);
            const pageContainer = document.getElementById('dynamicPageContent');
            const pageTitle = document.getElementById('dynamicPageTitle');
            if (pageData && pageContainer) {
                if(pageTitle) pageTitle.innerText = pageData.title;
                
                let html = '';
                if(pageData.image) {
                    const pageHeader = document.querySelector('.page-header');
                    if (pageHeader) {
                        const imgUrl = pageData.image;
                        pageHeader.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6)), url('${imgUrl}')`;
                        pageHeader.style.backgroundSize = 'cover';
                        
                        let pos = pageData.bgPosition || '50';
                        if (pos === 'top') pos = '0';
                        if (pos === 'center') pos = '50';
                        if (pos === 'bottom') pos = '100';
                        pageHeader.style.backgroundPosition = `center ${pos}%`;
                    }
                }
                
                // Basit markdown-vari satır sonu çevrimi
                const formattedContent = pageData.content.replace(/\n/g, '<br/>');
                html += `<div style="font-size: 1.125rem; line-height: 1.8; color: var(--text-main);">${formattedContent}</div>`;
                
                pageContainer.innerHTML = html;
            } else if (pageContainer) {
                pageContainer.innerHTML = "<h3>Sayfa bulunamadı.</h3>";
            }
        }
        
    } catch(e) {
        console.log("Could not load dynamic data, using static defaults. Did you run 'node server.js'?");
    } finally {
        initObservers();
    }
}

// Navbar Scroll Effect
if (navbar) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Mobile Menu Toggle
let isMenuOpen = false;
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        isMenuOpen = !isMenuOpen;
        mobileMenuOverlay.classList.toggle('active');
        
        const icon = mobileMenuBtn.querySelector('i');
        if (isMenuOpen) {
            icon.setAttribute('data-lucide', 'x');
        } else {
            icon.setAttribute('data-lucide', 'menu');
        }
        lucide.createIcons();
        document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    });
}

if (mobileMenuOverlay) {
    const mobileLinks = mobileMenuOverlay.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            isMenuOpen = false;
            mobileMenuOverlay.classList.remove('active');
            if (mobileMenuBtn) {
                const icon = mobileMenuBtn.querySelector('i');
                icon.setAttribute('data-lucide', 'menu');
                lucide.createIcons();
            }
            document.body.style.overflow = '';
        });
    });
}

function initObservers() {
    const revealElements = document.querySelectorAll('.reveal-up');
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const revealOptions = { threshold: 0.15, rootMargin: "0px 0px -50px 0px" };
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);

    revealElements.forEach(el => { revealObserver.observe(el); });

    const animateCounter = (element) => {
        const target = parseInt(element.getAttribute('data-target'));
        if (isNaN(target)) return;
        
        const duration = 2000; 
        const step = Math.max(1, Math.floor(target / (duration / 16)));
        let current = 0;
        
        const updateCounter = () => {
            current += step;
            
            // Eğer yıl ise noktalı format yapma
            const isYear = element.classList.contains('year-stat');
            
            if (current < target) {
                element.innerText = isYear ? current : current.toLocaleString('tr-TR');
                requestAnimationFrame(updateCounter);
            } else {
                element.innerText = isYear ? target : target.toLocaleString('tr-TR');
            }
        };
        updateCounter();
    };

    const statsOptions = { threshold: 0.5, rootMargin: "0px" };
    const statsObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, statsOptions);

    statNumbers.forEach(stat => { statsObserver.observe(stat); });
}

// ===== NEWS SLIDER =====
let sliderIndex = 0;
let sliderItems = [];
let sliderTimer = null;

function buildNewsSlider(blogs) {
    const section = document.getElementById('newsSliderSection');
    const track = document.getElementById('newsSliderTrack');
    const dotsEl = document.getElementById('sliderDots');
    if (!section || !track) return;

    // Filter blogs with slider:true
    sliderItems = blogs.filter(b => b.slider === true || b.slider === 'true');

    if (sliderItems.length === 0) { section.style.display = 'none'; return; }

    section.style.display = 'block';
    sliderIndex = 0;

    track.innerHTML = sliderItems.map(b => {
        const imgUrl = b.image ? b.image : 'https://images.unsplash.com/photo-1596306499300-0b7b168f19fe?q=80&w=2070&auto=format&fit=crop';
        const typeClass = b.type === 'Duyuru' ? 'slide-type-duyuru' : 'slide-type-haber';
        return `
            <div class="news-slide" style="background-image:url('${imgUrl}');">
                <div class="news-slide-overlay"></div>
                <div class="news-slide-content">
                    <span class="news-slide-type ${typeClass}">${b.type || 'Haber'}</span>
                    <h2 class="news-slide-title">${b.title}</h2>
                </div>
            </div>`;
    }).join('');

    // Dots
    dotsEl.innerHTML = sliderItems.map((_, i) =>
        `<button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></button>`
    ).join('');

    // Arrows
    document.getElementById('sliderPrev').onclick = () => { sliderMove(-1); resetTimer(); };
    document.getElementById('sliderNext').onclick = () => { sliderMove(1); resetTimer(); };

    lucide.createIcons();
    startTimer();
}

function goToSlide(idx) {
    sliderIndex = idx;
    updateSlider();
    resetTimer();
}

function sliderMove(dir) {
    sliderIndex = (sliderIndex + dir + sliderItems.length) % sliderItems.length;
    updateSlider();
}

function updateSlider() {
    const track = document.getElementById('newsSliderTrack');
    if (track) track.style.transform = `translateX(-${sliderIndex * 100}%)`;
    document.querySelectorAll('.slider-dot').forEach((d, i) => d.classList.toggle('active', i === sliderIndex));
}

function startTimer() {
    sliderTimer = setInterval(() => { sliderMove(1); }, 3000);
}

function resetTimer() {
    clearInterval(sliderTimer);
    startTimer();
}

// Kick off
loadDynamicData();
