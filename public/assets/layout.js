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
                <nav>
                    <ul id="nav-menu">
                        <li><a href="/dashboard.html">Home (Static)</a></li>
                    </ul>
                </nav>
            </aside>
            <main id="main-content">
                <header id="header">
                    <span id="user-info">Not Logged In</span>
                    <select id="theme-switcher" style="margin-left: auto; margin-right: 1rem; padding: 0.3rem 0.8rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-size: 0.875rem; font-family: var(--font-body); font-weight: 600; cursor: pointer;">
                        <option value="">Theme: Royal Indigo & Teal</option>
                        <option value="theme-emerald">Theme: Emerald Wealth & Sage</option>
                        <option value="theme-slate">Theme: Slate Gray & Violet</option>
                        <option value="theme-ocean">Theme: Ocean Navy & Azure</option>
                        <option value="theme-amber">Theme: Midnight Charcoal & Amber</option>
                    </select>
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

    const themeSwitcher = document.getElementById('theme-switcher');
    if (themeSwitcher) {
        themeSwitcher.value = savedTheme;
        themeSwitcher.addEventListener('change', (e) => {
            const themes = ['theme-emerald', 'theme-slate', 'theme-ocean', 'theme-amber'];
            document.body.classList.remove(...themes);
            if (e.target.value) {
                document.body.classList.add(e.target.value);
            }
            localStorage.setItem('themePref', e.target.value);
        });
    }

    const role = localStorage.getItem('role') || 'Employee';
    document.getElementById('user-info').textContent = `Role: ${role}`;

    if (window.MenuRenderer) {
        const menuRenderer = new window.MenuRenderer('nav-menu');
        menuRenderer.render();
    }
});
