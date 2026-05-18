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
        tw.src = "https://cdn.tailwindcss.com?plugins=forms,container-queries";
        tw.onerror = () => {
            console.warn("Tailwind CDN failed to load. Falling back to global style.css.");
        };
        document.head.appendChild(tw);

        document.body.classList.add('bg-surface', 'font-body', 'text-on-surface');
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

    const appHtml = `
        <div id="app-container">
            <aside id="sidebar">
                <header>
                    <a href="/dashboard.html" style="display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; width: 100%; cursor: pointer;">
                        <img id="sidebar-avatar" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='12' fill='%23e2e8f0'/><circle cx='12' cy='8' r='4' fill='%2394a3b8'/><path d='M12 14c-4.42 0-8 2.58-8 6v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1c0-3.42-3.58-6-8-6z' fill='%2394a3b8'/></svg>" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid rgba(255,255,255,0.6); box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                        <span>Office Auto</span>
                    </a>
                </header>
                <nav style="flex: 1;">
                    <ul id="nav-menu">
                        <li><a href="/dashboard.html">Home (Static)</a></li>
                    </ul>
                </nav>
                <div class="theme-selector">
                    <p class="theme-title">Theme Palette</p>
                    <div class="theme-swatches" id="theme-swatch-container">
                        <button type="button" class="theme-swatch" data-theme="" style="background: linear-gradient(135deg, #4f46e5 50%, #0d9488 50%);" title="Royal Indigo & Teal"></button>
                        <button type="button" class="theme-swatch" data-theme="theme-emerald" style="background: linear-gradient(135deg, #059669 50%, #0d9488 50%);" title="Emerald Wealth & Sage"></button>
                        <button type="button" class="theme-swatch" data-theme="theme-slate" style="background: linear-gradient(135deg, #7C3AED 50%, #8B5CF6 50%);" title="Slate Gray & Violet"></button>
                        <button type="button" class="theme-swatch" data-theme="theme-ocean" style="background: linear-gradient(135deg, #2563EB 50%, #0284C7 50%);" title="Ocean Navy & Azure"></button>
                        <button type="button" class="theme-swatch" data-theme="theme-amber" style="background: linear-gradient(135deg, #D97706 50%, #0a0a0a 50%);" title="Midnight Charcoal & Amber"></button>
                    </div>
                </div>
            </aside>
            <main id="main-content">
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

    const themeSwatches = document.querySelectorAll('.theme-swatch');
    if (themeSwatches.length > 0) {
        themeSwatches.forEach(swatch => {
            if (swatch.dataset.theme === savedTheme) {
                swatch.classList.add('active');
            }
            swatch.addEventListener('click', () => {
                const themes = ['theme-emerald', 'theme-slate', 'theme-ocean', 'theme-amber'];
                document.body.classList.remove(...themes);
                themeSwatches.forEach(s => s.classList.remove('active'));

                swatch.classList.add('active');
                if (swatch.dataset.theme) {
                    document.body.classList.add(swatch.dataset.theme);
                }
                localStorage.setItem('themePref', swatch.dataset.theme);

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
                if (data && (data.name || data.username)) {
                    footerUser.textContent = data.name || data.username;
                }
                // Sync theme from DB if different
                if (data && data.theme_pref !== undefined && data.theme_pref !== localStorage.getItem('themePref')) {
                    const dbTheme = data.theme_pref;
                    localStorage.setItem('themePref', dbTheme);
                    const themes = ['theme-emerald', 'theme-slate', 'theme-ocean', 'theme-amber'];
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

    if (window.MenuRenderer) {
        const menuRenderer = new window.MenuRenderer('nav-menu');
        menuRenderer.render();
    }
});
