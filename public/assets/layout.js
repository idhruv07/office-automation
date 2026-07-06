document.addEventListener('DOMContentLoaded', () => {
    // Inject Tailwind and theme fonts for all pages
    if (!document.getElementById('tailwind-script')) {
        const fonts = document.createElement('link');
        fonts.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap";
        fonts.rel = "stylesheet";
        document.head.appendChild(fonts);

        const icons = document.createElement('link');
        icons.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap";
        icons.rel = "stylesheet";
        document.head.appendChild(icons);

        const twConfig = document.createElement('script');
        twConfig.id = "tailwind-config";
        twConfig.innerHTML = `
          try {
            window.tailwind = window.tailwind || {};
            window.tailwind.config = {
              darkMode: "class",
              theme: {
                extend: {
                  colors: {
                    "primary": "#2563eb",
                    "primary-hover": "#1d4ed8",
                    "secondary": "#4f46e5",
                    "success": "#10b981",
                    "error": "#ef4444",
                    "warning": "#f59e0b",
                    "background": "#f8fafc",
                    "surface": "#ffffff",
                    "on-surface": "#0f172a",
                    "on-surface-variant": "#64748b",
                    "border": "#e2e8f0"
                  },
                  fontFamily: {
                    "headline": ["Inter", "sans-serif"], 
                    "body": ["Inter", "sans-serif"], 
                    "label": ["Inter", "sans-serif"]
                  }
                }
              }
            };
          } catch (e) {
            console.error("Tailwind config error:", e);
          }
        `;
        document.head.appendChild(twConfig);

        const tw = document.createElement('script');
        tw.id = "tailwind-script";
        tw.src = "/assets/tailwind.js";
        tw.onerror = () => {
            console.warn("Tailwind failed to load locally.");
        };
        document.head.appendChild(tw);

        document.body.classList.add('bg-surface', 'font-body', 'text-on-surface', 'logged-in');
    }

    // Skip layout for login and change password pages
    if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '/change-password.html') {
        return;
    }

    const token = localStorage.getItem('token');
    const mustReset = localStorage.getItem('must_reset') === 'true';

    if (!token) {
        window.location.href = '/';
        return;
    }

    if (mustReset) {
        window.location.href = '/change-password.html';
        return;
    }

    const savedTheme = localStorage.getItem('themePref') || '';
    const justLoggedIn = sessionStorage.getItem('justLoggedIn') === 'true';
    if (justLoggedIn) {
        sessionStorage.removeItem('justLoggedIn');
    }

    const appHtml = `
        <div id="app-container" class="${justLoggedIn ? 'tv-on' : ''}">
            <aside id="sidebar">
                <header>
                    <a href="/dashboard.html" class="sidebar-logo-link" style="display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit; width: 100%; cursor: pointer;">
                        <!-- Beautiful SVG Logo icon for IT&SDC -->
                        <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 6px rgba(56, 189, 248, 0.3)); flex-shrink: 0;">
                            <defs>
                                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stop-color="#38bdf8" />
                                    <stop offset="100%" stop-color="#4f46e5" />
                                </linearGradient>
                            </defs>
                            <!-- Outer glowing hex/shield shape -->
                            <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="url(#logoGrad)" />
                            <polygon points="50,11 84,28 84,72 50,89 16,72 16,28" fill="#1e1b4b" />
                            <!-- Inner Core Globe/Lines of Network Connectivity -->
                            <circle cx="50" cy="50" r="22" stroke="url(#logoGrad)" stroke-width="2.5" stroke-dasharray="4 2" />
                            <!-- Dynamic tech letters IT inside -->
                            <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="900" font-size="24" fill="#ffffff" letter-spacing="1">IT</text>
                        </svg>
                        
                        <!-- Title Text block -->
                        <div style="display: flex; flex-direction: column; line-height: 1.1;">
                            <span style="font-size: 15px; font-weight: 900; letter-spacing: 0.05em; color: white;">IT & SDC</span>
                            <span style="font-size: 8px; font-weight: 700; opacity: 0.65; text-transform: uppercase; color: #38bdf8; letter-spacing: 0.02em;">Systems Dev Center</span>
                        </div>
                    </a>
                </header>
                <nav style="flex: 1;">
                    <ul id="nav-menu">
                        <li><a href="/dashboard.html">Home (Static)</a></li>
                    </ul>
                </nav>
                <div class="sidebar-user-block" style="padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); margin-top: auto; display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.02);">
                    <a href="/profile.html" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; width: 100%; cursor: pointer;">
                        <img id="sidebar-avatar" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='12' fill='%23e2e8f0'/><circle cx='12' cy='8' r='4' fill='%2394a3b8'/><path d='M12 14c-4.42 0-8 2.58-8 6v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1c0-3.42-3.58-6-8-6z' fill='%2394a3b8'/></svg>" style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.2); object-fit: cover; flex-shrink: 0;">
                        <div style="display: flex; flex-direction: column; overflow: hidden; line-height: 1.2;">
                            <span id="sidebar-user-name" style="font-size: 13px; font-weight: 700; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Loading...</span>
                            <span id="sidebar-user-desig" style="font-size: 10px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">—</span>
                        </div>
                    </a>
                </div>
                <div class="theme-selector" id="theme-dropdown-selector">
                    <button type="button" class="theme-dropdown-btn" id="theme-dropdown-btn">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary-color);">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.32598 19.4746 5.86718 19.8732 6.46747 20.1772C7.06775 20.4812 7.72473 20.6775 8.41421 20.75L12 22Z"></path>
                            <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"></circle>
                            <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor"></circle>
                            <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor"></circle>
                            <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor"></circle>
                        </svg>
                        <span id="active-theme-name" style="margin-left: 2px;">Royal Indigo</span>
                        <span style="font-size: 8px; opacity: 0.6; margin-left: 1px;">▼</span>
                    </button>
                    <div class="theme-dropdown-content" id="theme-dropdown-content">
                        <div class="theme-dropdown-header">Workspace Theme</div>
                        <div class="theme-grid">
                            <div class="theme-opt" data-theme="">
                                <div class="theme-opt-preview" style="background: linear-gradient(135deg, #4f46e5 50%, #0d9488 50%);"></div>
                                <div class="theme-opt-info">
                                    <div class="theme-opt-title">Royal Indigo & Teal</div>
                                    <div class="theme-opt-desc">Default elegant system colors</div>
                                </div>
                            </div>
                            <div class="theme-opt" data-theme="theme-emerald">
                                <div class="theme-opt-preview" style="background: linear-gradient(135deg, #059669 50%, #0d9488 50%);"></div>
                                <div class="theme-opt-info">
                                    <div class="theme-opt-title">Emerald Wealth & Sage</div>
                                    <div class="theme-opt-desc">Soft corporate green shades</div>
                                </div>
                            </div>
                            <div class="theme-opt" data-theme="theme-slate">
                                <div class="theme-opt-preview" style="background: linear-gradient(135deg, #7C3AED 50%, #8B5CF6 50%);"></div>
                                <div class="theme-opt-info">
                                    <div class="theme-opt-title">Slate Gray & Violet</div>
                                    <div class="theme-opt-desc">Modern dark purple electric vibes</div>
                                </div>
                            </div>
                            <div class="theme-opt" data-theme="theme-ocean">
                                <div class="theme-opt-preview" style="background: linear-gradient(135deg, #2563EB 50%, #0284C7 50%);"></div>
                                <div class="theme-opt-info">
                                    <div class="theme-opt-title">Ocean Navy & Azure</div>
                                    <div class="theme-opt-desc">Calming water marine tones</div>
                                </div>
                            </div>
                            <div class="theme-opt" data-theme="theme-amber">
                                <div class="theme-opt-preview" style="background: linear-gradient(135deg, #D97706 50%, #0a0a0a 50%);"></div>
                                <div class="theme-opt-info">
                                    <div class="theme-opt-title">Midnight Amber</div>
                                    <div class="theme-opt-desc">Obsidian dark with amber highlights</div>
                                </div>
                            </div>
                            <div class="theme-opt" data-theme="theme-cyberpunk">
                                <div class="theme-opt-preview" style="background: linear-gradient(135deg, #ff007f 50%, #00f0ff 50%);"></div>
                                <div class="theme-opt-info">
                                    <div class="theme-opt-title">Cyberpunk Neon</div>
                                    <div class="theme-opt-desc">Synthwave hot pink and cyan glow</div>
                                </div>
                            </div>
                            <div class="theme-opt" data-theme="theme-aurora">
                                <div class="theme-opt-preview" style="background: linear-gradient(135deg, #10b981 50%, #a3e635 50%);"></div>
                                <div class="theme-opt-info">
                                    <div class="theme-opt-title">Aurora Forest</div>
                                    <div class="theme-opt-desc">Nordic lights lime and moss emerald</div>
                                </div>
                            </div>
                            <div class="theme-opt" data-theme="theme-sunset">
                                <div class="theme-opt-preview" style="background: linear-gradient(135deg, #e11d48 50%, #f59e0b 50%);"></div>
                                <div class="theme-opt-info">
                                    <div class="theme-opt-title">Crimson Sunset</div>
                                    <div class="theme-opt-desc">Deep velvet red and golden haze</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
            <main id="main-content">
                <div class="main-top-bar">
                    <div class="top-bar-left" style="display: flex; align-items: center;">
                        <button id="sidebar-toggle" title="Toggle Sidebar">
                            <span class="material-symbols-outlined" style="font-size: 22px;">menu</span>
                        </button>
                        <span class="top-bar-tag">Workspace</span>
                        <span class="top-bar-arrow">/</span>
                        <span id="top-bar-title" class="top-bar-title-text">Dashboard</span>
                    </div>
                    <div class="top-bar-right">
                        <div class="theme-badge-glow">
                            <span class="glow-dot"></span>
                            <span id="current-theme-badge-text">Royal Indigo & Teal</span>
                        </div>
                    </div>
                </div>
                <div class="theme-separator-line"></div>

                <section id="content">
                    <!-- Page specific content will be moved here -->
                </section>
                <footer id="footer">
                    <span>&copy; 2026 Office Automation System</span>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span id="footer-user-info" class="footer-user-badge"></span>
                        <img id="footer-avatar" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='12' fill='%23e2e8f0'/><circle cx='12' cy='8' r='4' fill='%2394a3b8'/><path d='M12 14c-4.42 0-8 2.58-8 6v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1c0-3.42-3.58-6-8-6z' fill='%2394a3b8'/></svg>" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                    </div>
                </footer>
            </main>
        </div>
    `;

    const existingContent = document.body.innerHTML;
    document.body.innerHTML = appHtml;
    document.getElementById('content').innerHTML = existingContent;

    if (savedTheme) {
        document.body.classList.add(savedTheme);
    }

    // Theme Dropdown Toggle logic
    const themeSelector = document.getElementById('theme-dropdown-selector');
    const themeBtn = document.getElementById('theme-dropdown-btn');
    if (themeSelector && themeBtn) {
        themeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            themeSelector.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!themeSelector.contains(e.target)) {
                themeSelector.classList.remove('open');
            }
        });
    }

    const themeSwatches = document.querySelectorAll('.theme-opt');
    if (themeSwatches.length > 0) {
        themeSwatches.forEach(swatch => {
            if (swatch.dataset.theme === savedTheme) {
                swatch.classList.add('active');
            }
            swatch.addEventListener('click', () => {
                const themes = ['theme-emerald', 'theme-slate', 'theme-ocean', 'theme-amber', 'theme-cyberpunk', 'theme-aurora', 'theme-sunset'];
                document.body.classList.remove(...themes);
                themeSwatches.forEach(s => s.classList.remove('active'));

                swatch.classList.add('active');
                if (swatch.dataset.theme) {
                    document.body.classList.add(swatch.dataset.theme);
                }
                localStorage.setItem('themePref', swatch.dataset.theme);
                updateThemeBadge(swatch.dataset.theme);
                
                // Auto-close dropdown upon selection
                if (themeSelector) themeSelector.classList.remove('open');

                // Save to database
                const token = localStorage.getItem('token');
                if (token) {
                    fetch('/api/auth/theme', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ theme: swatch.dataset.theme })
                    }).catch(err => console.error('Failed to save theme to DB', err));
                }

                // Real-time chart hot-reloading
                setTimeout(() => {
                    if (window.statusChartInstance && window.historyChartInstance) {
                        const getThemeColor = (varName, fallback) => {
                            return getComputedStyle(document.body).getPropertyValue(varName).trim() || fallback;
                        };
                        const primaryColor = getThemeColor('--primary-color', '#4f46e5');
                        const accentColor = getThemeColor('--accent-color', '#0d9488');

                        window.statusChartInstance.data.datasets[0].backgroundColor[0] = primaryColor;
                        window.statusChartInstance.data.datasets[0].backgroundColor[1] = accentColor;
                        window.statusChartInstance.update();

                        window.historyChartInstance.data.datasets[0].backgroundColor = primaryColor;
                        window.historyChartInstance.update();
                    }
                }, 50);
            });
        });
    }

    const footerUser = document.getElementById('footer-user-info');
    if (footerUser) {
        // Fallback placeholder while loading
        let displayUser = localStorage.getItem('username');
        if (!displayUser || displayUser === 'undefined') displayUser = 'Employee';
        footerUser.textContent = displayUser;

        // Fetch real name dynamically for accuracy
        const token = localStorage.getItem('token');
        fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data) {
                    const fullName = data.name || data.username || 'Employee';
                    const designation = data.designation || '';
                    footerUser.textContent = fullName;

                    const sidebarName = document.getElementById('sidebar-user-name');
                    const sidebarDesig = document.getElementById('sidebar-user-desig');
                    if (sidebarName) sidebarName.textContent = fullName;
                    if (sidebarDesig) sidebarDesig.textContent = designation;
                }
                // Sync theme from DB if different
                if (data && data.theme_pref !== undefined && data.theme_pref !== localStorage.getItem('themePref')) {
                    const dbTheme = data.theme_pref;
                    localStorage.setItem('themePref', dbTheme);
                    updateThemeBadge(dbTheme);
                    const themes = ['theme-emerald', 'theme-slate', 'theme-ocean', 'theme-amber', 'theme-cyberpunk', 'theme-aurora', 'theme-sunset'];
                    document.body.classList.remove(...themes);
                    if (dbTheme) {
                        document.body.classList.add(dbTheme);
                    }
                    // Update active swatch
                    themeSwatches.forEach(s => {
                        s.classList.remove('active');
                        if (s.dataset.theme === dbTheme) s.classList.add('active');
                    });
                }
            })
            .catch(err => console.error('Failed to fetch user data', err));

        // Fetch Avatar
        fetch('/api/auth/avatar', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error();
                return res.blob();
            })
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const footerAvatar = document.getElementById('footer-avatar');
                if (footerAvatar) {
                    footerAvatar.src = url;
                    footerAvatar.style.display = 'block';
                }
                const profileAvatar = document.getElementById('profile-avatar');
                if (profileAvatar) {
                    profileAvatar.src = url;
                }
                const sidebarAvatar = document.getElementById('sidebar-avatar');
                if (sidebarAvatar) {
                    sidebarAvatar.src = url;
                }
            })
            .catch(() => { });
    }

    // Function to update the theme badge text
    function updateThemeBadge(themeClass) {
        const badgeText = document.getElementById('current-theme-badge-text');
        const activeNameText = document.getElementById('active-theme-name');
        if (!badgeText) return;
        
        let label = 'Royal Indigo & Teal';
        if (themeClass === 'theme-emerald') label = 'Emerald Wealth & Sage';
        else if (themeClass === 'theme-slate') label = 'Slate Gray & Electric Violet';
        else if (themeClass === 'theme-ocean') label = 'Ocean Navy & Azure';
        else if (themeClass === 'theme-amber') label = 'Midnight Charcoal & Amber';
        else if (themeClass === 'theme-cyberpunk') label = 'Cyberpunk Neon';
        else if (themeClass === 'theme-aurora') label = 'Aurora Forest';
        else if (themeClass === 'theme-sunset') label = 'Crimson Sunset';
        
        badgeText.textContent = label;
        if (activeNameText) {
            let shortLabel = label.split(' & ')[0];
            // Remove prefix 'Theme X' or anything long
            activeNameText.textContent = shortLabel;
        }
    }

    // Set dynamic page title
    const topBarTitle = document.getElementById('top-bar-title');
    if (topBarTitle) {
        const titleText = document.title ? document.title.replace(' - Office Auto', '') : 'Workspace';
        topBarTitle.textContent = titleText;
    }

    // Call initially
    updateThemeBadge(savedTheme);

    if (window.MenuRenderer) {
        const menuRenderer = new window.MenuRenderer('nav-menu');
        menuRenderer.render();
    }

    // Sidebar toggle functionality (Repository Pages Only)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        const isRepository = window.location.pathname.includes('/repository');
        if (isRepository) {
            sidebarToggle.style.display = 'flex';

            sidebarToggle.addEventListener('click', () => {
                const appContainer = document.getElementById('app-container');
                if (appContainer) {
                    appContainer.classList.toggle('sidebar-collapsed');
                    const collapsed = appContainer.classList.contains('sidebar-collapsed');
                    localStorage.setItem('repo_sidebar_collapsed', collapsed ? 'true' : 'false');
                }
            });

            // Restore state on load
            if (localStorage.getItem('repo_sidebar_collapsed') === 'true') {
                const appContainer = document.getElementById('app-container');
                if (appContainer) {
                    appContainer.classList.add('sidebar-collapsed');
                }
            }
        } else {
            sidebarToggle.style.display = 'none';
        }
    }
});
