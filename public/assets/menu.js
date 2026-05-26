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
                            <a href="#">${item.label}</a>
                            <ul class="submenu">
                                ${children.map(child => {
                                    const grandchildren = child.children || [];
                                    if (grandchildren.length > 0) {
                                        const hasActiveGc = grandchildren.some(gc => currentPath === gc.link || currentPath.startsWith(gc.link.split('?')[0]));
                                        return `
                                            <li class="has-submenu submenu-nested ${hasActiveGc ? 'active' : ''}">
                                                <a href="#">${child.label}</a>
                                                <ul class="submenu submenu-level2">
                                                    ${grandchildren.map(gc => {
                                                        const isActive = currentPath === gc.link || currentPath.startsWith(gc.link.split('?')[0]);
                                                        return `<li><a href="${gc.link}" class="${isActive ? 'active' : ''}">${gc.label}</a></li>`;
                                                    }).join('')}
                                                </ul>
                                            </li>`;
                                    }
                                    const isActive = currentPath === child.link || currentPath.startsWith(child.link.split('?')[0]);
                                    return `<li><a href="${child.link}" class="${isActive ? 'active' : ''}">${child.label}</a></li>`;
                                }).join('')}
                            </ul>
                        </li>`;
                }

                const isActive = currentPath === item.link;
                return `<li class="${isActive ? 'active' : ''}"><a href="${item.link}" ${item.id ? `id="${item.id}"` : ''}>${item.label}</a></li>`;
            }).join('');

            // Submenu click handler (prevent jump for # links, hover handles expansion)
            this.navContainer.querySelectorAll('.has-submenu > a').forEach(link => {
                link.addEventListener('click', (e) => {
                    if (link.getAttribute('href') === '#') {
                        e.preventDefault();
                    }
                });
            });

            // Auto-open active groups on page load
            this.navContainer.querySelectorAll('.has-submenu.active').forEach(li => {
                li.classList.add('open');
            });

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
