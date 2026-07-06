function getMenuIcon(label) {
    const l = (label || '').toLowerCase();
    
    // Dashboard icon
    if (l.includes('dashboard') || l.includes('home')) {
        return `
            <svg class="menu-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
                <rect x="3" y="3" width="7" height="9"></rect>
                <rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect>
                <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
        `;
    }
    
    // Claims icon
    if (l.includes('claim')) {
        return `
            <svg class="menu-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
        `;
    }
    
    // Repository / Document icon
    if (l.includes('repo') || l.includes('document')) {
        return `
            <svg class="menu-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
        `;
    }
    
    // Profile / User / Personal details icon
    if (l.includes('profile') || l.includes('user') || l.includes('personal')) {
        return `
            <svg class="menu-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        `;
    }
    
    // Logout icon
    if (l.includes('logout') || l.includes('signout')) {
        return `
            <svg class="menu-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
        `;
    }
    
    // Settings / Admin icon
    if (l.includes('admin') || l.includes('manage') || l.includes('setting')) {
        return `
            <svg class="menu-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; display: inline-block; vertical-align: middle;">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
        `;
    }

    // Default icon (tiny bullet outline)
    return `
        <svg class="menu-icon" width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" style="margin-right: 8px; display: inline-block; vertical-align: middle; opacity: 0.5;">
            <circle cx="12" cy="12" r="8"></circle>
        </svg>
    `;
}

class MenuRenderer {
    constructor(navContainerId) {
        this.navContainerId = navContainerId;
    }

    async render() {
        this.navContainer = document.getElementById(this.navContainerId);
        if (!this.navContainer) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Fetch nested menu tree from API
            const res = await fetch('/api/auth/menu', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;

            let menuTree = await res.json();

            // Inject "New Claim" children dynamically into the Claims group
            try {
                const typesRes = await fetch('/api/claims/types', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (typesRes.ok) {
                    const types = await typesRes.json();
                    if (types.length > 0) {
                        const claimsGroup = menuTree.find(i => i.label === 'Claims');
                        const newClaimChildren = types.map(type => ({
                            label: type.name,
                            link: `/claims/new.html?type_id=${type.id}`
                        }));
                        const newClaimItem = {
                            label: 'New Claim',
                            link: '#',
                            display_order: 0,
                            children: newClaimChildren
                        };
                        if (claimsGroup) {
                            // Prepend "New Claim" to the Claims group
                            claimsGroup.children.unshift(newClaimItem);
                        } else {
                            // Fallback: add as top-level group
                            menuTree.splice(1, 0, newClaimItem);
                        }
                    }
                }
            } catch (e) {}

            if (menuTree.length === 0) {
                menuTree.push({ label: 'Dashboard', link: '/dashboard.html', display_order: 1, children: [] });
            }

            // Append Logout at end
            menuTree.push({ label: 'Logout', link: '#', id: 'logout-btn', children: [] });

            const currentPath = window.location.pathname;

            this.navContainer.innerHTML = menuTree.map(item => {
                const children = item.children || [];

                if (children.length > 0) {
                    // Check if any child (or grandchild for New Claim) is active
                    const hasActiveChild = children.some(child => {
                        if (child.children && child.children.length > 0) {
                            return child.children.some(gc => currentPath === gc.link || currentPath.startsWith(gc.link.split('?')[0]));
                        }
                        return currentPath === child.link || currentPath.startsWith(child.link.split('?')[0]);
                    });

                    return `
                        <li class="has-submenu ${hasActiveChild ? 'active' : ''}">
                            <a href="#">${getMenuIcon(item.label)}${item.label}</a>
                            <ul class="submenu">
                                ${children.map(child => {
                                    const grandchildren = child.children || [];
                                    if (grandchildren.length > 0) {
                                        const hasActiveGc = grandchildren.some(gc => currentPath === gc.link || currentPath.startsWith(gc.link.split('?')[0]));
                                        return `
                                            <li class="has-submenu submenu-nested ${hasActiveGc ? 'active' : ''}">
                                                <a href="#">${getMenuIcon(child.label)}${child.label}</a>
                                                <ul class="submenu submenu-level2">
                                                    ${grandchildren.map(gc => {
                                                        const isActive = currentPath === gc.link || currentPath.startsWith(gc.link.split('?')[0]);
                                                        return `<li><a href="${gc.link}" class="${isActive ? 'active' : ''}">${getMenuIcon(gc.label)}${gc.label}</a></li>`;
                                                    }).join('')}
                                                </ul>
                                            </li>`;
                                    }
                                    const isActive = currentPath === child.link || currentPath.startsWith(child.link.split('?')[0]);
                                    return `<li><a href="${child.link}" class="${isActive ? 'active' : ''}">${getMenuIcon(child.label)}${child.label}</a></li>`;
                                }).join('')}
                            </ul>
                        </li>`;
                }

                const isActive = currentPath === item.link;
                return `<li class="${isActive ? 'active' : ''}"><a href="${item.link}" ${item.id ? `id="${item.id}"` : ''}>${getMenuIcon(item.label)}${item.label}</a></li>`;
            }).join('');

            // Submenu click handler (prevent jump for # links, hover handles expansion)
            this.navContainer.querySelectorAll('.has-submenu > a').forEach(link => {
                link.addEventListener('click', (e) => {
                    if (link.getAttribute('href') === '#') {
                        e.preventDefault();
                    }
                });
            });

            // Auto-open active groups on page load (Disabled for top-bar hover menus)
            // this.navContainer.querySelectorAll('.has-submenu.active').forEach(li => {
            //     li.classList.add('open');
            // });

            // Logout handler
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const app = document.getElementById('app-container');
                    if (app) {
                        app.classList.add('tv-off');
                        setTimeout(() => {
                            localStorage.clear();
                            window.location.href = '/';
                        }, 1350);
                    } else {
                        localStorage.clear();
                        window.location.href = '/';
                    }
                });
            }

        } catch (err) {
            console.error('Menu rendering failed:', err);
        }
    }
}

window.MenuRenderer = MenuRenderer;
