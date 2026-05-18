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

            const res = await fetch('/api/auth/menu', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                let menuItems = await res.json();
                
                const role = localStorage.getItem('role');
                
                // Group all "New [Type]" into a single consolidated menu
                try {
                    const typesRes = await fetch('/api/claims/types', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (typesRes.ok) {
                        const types = await typesRes.json();
                        if (types.length > 0) {
                            menuItems.push({ 
                                label: 'New Claim', 
                                link: '#',
                                display_order: 5,
                                children: types.map(type => ({
                                    label: type.name,
                                    link: `/claims/new.html?type_id=${type.id}`
                                }))
                            });
                        }
                    }
                } catch (e) {}

                if (menuItems.length === 0) {
                    menuItems.push({ label: 'Dashboard', link: '/dashboard.html', display_order: 1 });
                }

                menuItems.sort((a, b) => a.display_order - b.display_order);
                menuItems.push({ label: 'Logout', link: '#', id: 'logout-btn' });

                this.navContainer.innerHTML = menuItems.map(item => {
                    const currentPath = window.location.pathname;
                    const isActive = currentPath === item.link;
                    
                    if (item.children) {
                        const hasActiveChild = item.children.some(child => currentPath === child.link);
                        return `
                            <li class="has-submenu ${hasActiveChild ? 'active' : ''}">
                                <a href="#">${item.label}</a>
                                <ul class="submenu">
                                    ${item.children.map(child => {
                                        const isChildActive = currentPath === child.link;
                                        return `<li><a href="${child.link}" class="${isChildActive ? 'active' : ''}">${child.label}</a></li>`;
                                    }).join('')}
                                </ul>
                            </li>
                        `;
                    }
                    return `<li class="${isActive ? 'active' : ''}"><a href="${item.link}" ${item.id ? `id="${item.id}"` : ''}>${item.label}</a></li>`;
                }).join('');

                // Add Submenu Toggle Logic
                this.navContainer.querySelectorAll('.has-submenu > a').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        link.parentElement.classList.toggle('active');
                    });
                });

                const logoutBtn = document.getElementById('logout-btn');
                if(logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        localStorage.clear();
                        window.location.href = '/';
                    });
                }
            }
        } catch (err) {
            console.error('Menu rendering failed:', err);
        }
    }
}

window.MenuRenderer = MenuRenderer;
