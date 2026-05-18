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
                <header>Office Auto</header>
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
                <header id="header">
                    <span id="user-info">Not Logged In</span>
                </header>
                <section id="content">
                    <!-- Page specific content will be moved here -->
                </section>
                <footer id="footer">
                    &copy; 2026 Office Automation System
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
            });
        });
    }

    const role = localStorage.getItem('role') || 'Employee';
    document.getElementById('user-info').textContent = `Role: ${role}`;

    if (window.MenuRenderer) {
        const menuRenderer = new window.MenuRenderer('nav-menu');
        menuRenderer.render();
    }
});
