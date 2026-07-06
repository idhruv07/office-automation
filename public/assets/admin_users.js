document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    // Wire Modal Open/Close Event Listeners
    const openBtn = document.getElementById('open-create-modal-btn');
    const closeBtn = document.getElementById('close-create-modal-btn');
    const cancelBtn = document.getElementById('cancel-create-modal-btn');

    if (openBtn) openBtn.addEventListener('click', openCreateModal);
    if (closeBtn) closeBtn.addEventListener('click', closeCreateModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeCreateModal);

    // Wire Filter Select Event Listeners
    const roleSelect = document.getElementById('filter-role-select');
    const statusSelect = document.getElementById('filter-status-select');
    const designationSelect = document.getElementById('filter-designation-select');

    if (roleSelect) {
        roleSelect.addEventListener('change', (e) => {
            currentRoleFilter = e.target.value;
            renderUsers();
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            renderUsers();
        });
    }

    if (designationSelect) {
        designationSelect.addEventListener('change', (e) => {
            currentDesignationFilter = e.target.value;
            renderUsers();
        });
    }

    // Wire Search Input
    const searchInput = document.getElementById('filter-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchFilter = e.target.value.toLowerCase().trim();
            renderUsers();
        });
    }


function openCreateModal() {
    const modal = document.getElementById('create-user-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('.transform').classList.remove('scale-95');
    }, 50);
}

function closeCreateModal() {
    const modal = document.getElementById('create-user-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    modal.querySelector('.transform').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        const errDiv = document.getElementById('create-user-error');
        if (errDiv) errDiv.classList.add('hidden');
    }, 300);
}

    document.getElementById('create-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const userData = {
            username: document.getElementById('new-username').value.trim(),
            password: document.getElementById('new-password').value,
            name: document.getElementById('new-name').value.trim(),
            designation: document.getElementById('new-designation').value,
            email: document.getElementById('new-email').value.trim(),
            personal_no: document.getElementById('new-personal_no').value.trim(),
            gender: document.getElementById('new-gender').value,
            role_name: document.getElementById('new-role').value
        };

        const errDiv = document.getElementById('create-user-error');
        if (errDiv) errDiv.classList.add('hidden');

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            if (response.ok) {
                alert('User created successfully and storage initialized!');
                e.target.reset();
                closeCreateModal();
                await loadUsers(); // Auto-reload list on success
            } else {
                const errorMsg = data.message || 'Error creating user';
                if (errDiv) {
                    errDiv.textContent = errorMsg;
                    errDiv.style.color = '#ef4444';
                    errDiv.style.fontSize = '12px';
                    errDiv.style.fontWeight = '600';
                    errDiv.style.marginTop = '8px';
                    errDiv.classList.remove('hidden');
                }
                alert('Failed to create user: ' + errorMsg);
            }
        } catch (err) {
            console.error(err);
            alert('Network error while creating user: ' + err.message);
        }
    });

});

let allUsers = [];
let currentRoleFilter = 'all';
let currentStatusFilter = 'all';
let currentDesignationFilter = 'all';
let currentSearchFilter = '';

async function loadUsers() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            allUsers = await res.json();
            renderUsers();
        }
    } catch (e) {
        console.error('Error fetching users:', e);
    }
}

function renderUsers() {
    const filtered = allUsers.filter(user => {
        // Search filter
        if (currentSearchFilter) {
            const name = (user.name || '').toLowerCase();
            const personalNo = (user.personal_no || '').toLowerCase();
            if (!name.includes(currentSearchFilter) && !personalNo.includes(currentSearchFilter)) {
                return false;
            }
        }
        // Role filter
        if (currentRoleFilter !== 'all') {
            if (user.role_name !== currentRoleFilter) return false;
        }
        // Designation filter
        if (currentDesignationFilter !== 'all') {
            if (user.designation !== currentDesignationFilter) return false;
        }
        // Status filter
        if (currentStatusFilter === 'online') {
            if (!user.last_active_at) return false;
            const lastActive = new Date(user.last_active_at).getTime();
            const now = Date.now();
            const isOnline = (now - lastActive) < 5 * 60 * 1000;
            if (!isOnline) return false;
        } else if (currentStatusFilter === 'offline') {
            let isOnline = false;
            if (user.last_active_at) {
                const lastActive = new Date(user.last_active_at).getTime();
                const now = Date.now();
                isOnline = (now - lastActive) < 5 * 60 * 1000;
            }
            if (isOnline) return false;
        }
        return true;
    });

    // Update user count badge
    const resultCount = document.getElementById('result-count');
    if (resultCount) {
        resultCount.textContent = `${filtered.length} Users`;
    }

    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">
                    No users found matching these filters.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(user => {
        // Calculate online/offline presence
        let isOnline = false;
        if (user.last_active_at) {
            const lastActive = new Date(user.last_active_at).getTime();
            const now = Date.now();
            isOnline = (now - lastActive) < 5 * 60 * 1000;
        }
        
        // Use database is_active status (default to true if undefined)
        const isActive = user.is_active !== false;

        // Format created_at date
        const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : '-';

        // Format last login timestamp nicely
        let lastLoginText = '-';
        if (user.last_login_at) {
            const diffMs = Date.now() - new Date(user.last_login_at).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHrs = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHrs / 24);
            if (diffMins < 1) lastLoginText = 'Just now';
            else if (diffMins < 60) lastLoginText = `${diffMins} min ago`;
            else if (diffHrs < 24) lastLoginText = `${diffHrs} hours ago`;
            else lastLoginText = `${diffDays} days ago`;
        }

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f3f4f6';
        tr.style.transition = 'background-color 0.2s';
        tr.onmouseover = () => tr.style.backgroundColor = 'rgba(249, 250, 251, 0.5)';
        tr.onmouseout = () => tr.style.backgroundColor = 'transparent';
        tr.innerHTML = `
            <td style="text-align: center; padding: 16px;">
                <input type="checkbox" style="width: 16px; height: 16px; border-radius: 4px; border: 1px solid #d1d5db; cursor: pointer;">
            </td>
            <td style="padding: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e7eb;" src="/api/admin/users/${user.id}/avatar" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23f3f4f6\\'/><text x=\\'50%\\' y=\\'55%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'10\\' font-weight=\\'500\\' fill=\\'%236b7280\\'>${(user.name || user.username).substring(0, 2).toUpperCase()}</text></svg>'">
                    <div style="display: flex; flex-direction: column;">
                        <a href="#" class="user-profile-link" style="color: #374151; font-size: 0.875rem; font-weight: 500; cursor: pointer; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#2563eb'" onmouseout="this.style.color='#374151'" data-user-id="${user.id}">
                            ${user.name || '-'}
                        </a>
                        <span style="font-size: 0.75rem; color: #64748b;">@${user.username}</span>
                    </div>
                </div>
            </td>
            <td style="padding: 16px;">
                <span style="color: #4b5563; font-size: 0.875rem; font-weight: 500;">${user.designation || '-'}</span>
            </td>
            <td style="padding: 16px;">
                <span style="color: #6b7280; font-size: 0.875rem;">${user.email || '-'}</span>
            </td>
            <td style="padding: 16px;">
                <span style="color: #4b5563; font-size: 0.875rem;">${user.role_name || 'Individual'}</span>
            </td>
            <td style="padding: 16px;">
                <span style="color: #6b7280; font-size: 0.875rem;">${createdDate}</span>
            </td>
            <td style="padding: 16px;">
                <span style="font-size: 0.875rem; font-weight: 500; color: ${isActive ? '#16a34a' : '#ef4444'};">
                    ${isActive ? 'Active' : 'Disabled'}
                </span>
            </td>
            <td style="padding: 16px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <button class="user-profile-link" style="padding: 4px; color: #9ca3af; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.2s; border-radius: 6px;" onmouseover="this.style.color='#2563eb'; this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.color='#9ca3af'; this.style.backgroundColor='transparent'" data-user-id="${user.id}" title="View Profile">
                        <span class="material-symbols-outlined" style="font-size: 18px;">visibility</span>
                    </button>
                    <button style="padding: 4px; color: #9ca3af; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: color 0.2s; border-radius: 6px;" onmouseover="this.style.color='#16a34a'; this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.color='#9ca3af'; this.style.backgroundColor='transparent'" onclick="window.openEditUserModal('${user.id}')" title="Edit User">
                        <span class="material-symbols-outlined" style="font-size: 18px;">edit</span>
                    </button>
                    <label style="position: relative; display: inline-flex; align-items: center; cursor: pointer; margin-left: 2px;">
                        <input type="checkbox" style="opacity: 0; width: 0; height: 0; position: absolute;" ${isActive ? 'checked' : ''} onchange="window.toggleUserStatus('${user.id}', this, this.nextElementSibling, this.nextElementSibling.firstElementChild)">
                        <div style="width: 32px; height: 18px; background-color: ${isActive ? '#34C759' : '#e5e7eb'}; border-radius: 9999px; transition: background-color 0.2s; position: relative;">
                            <div style="position: absolute; top: 2px; left: 2px; background-color: white; border-radius: 50%; height: 14px; width: 14px; transition: transform 0.2s; transform: ${isActive ? 'translateX(14px)' : 'translateX(0)'}; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"></div>
                        </div>
                    </label>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Add click listeners to links/buttons
    document.querySelectorAll('.user-profile-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const tr = link.closest('tr');
            const userId = link.dataset.userId || link.closest('[data-user-id]').dataset.userId;
            await showUserProfile(userId, tr);
        });
    });
}

async function showUserProfile(userId, tr) {
    const token = localStorage.getItem('token');
    
    // Check if there is already a detail row open right below this row
    const nextRow = tr.nextElementSibling;
    if (nextRow && nextRow.classList.contains('profile-detail-row')) {
        // Toggle closed
        nextRow.remove();
        return;
    }

    // Close any other open detail rows
    document.querySelectorAll('.profile-detail-row').forEach(row => row.remove());

    try {
        const res = await fetch(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch profile details');

        const user = await res.json();
        
        // Create the detail row
        const detailRow = document.createElement('tr');
        detailRow.className = 'profile-detail-row';
        
        // Create full width td
        const td = document.createElement('td');
        td.colSpan = 8;
        td.style.padding = '0';
        td.style.border = 'none';
        
        // Populate the details container
        td.innerHTML = `
            <div class="profile-detail-wrapper" style="padding: 1.5rem; background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; border-top: 1.5px solid #e2e8f0; animation: slideDown 0.3s ease-out;">
                <!-- Main Container using grid -->
                <div style="display: grid; grid-template-columns: 1fr; gap: 1.5rem; max-width: 1100px; margin: 0 auto;">
                    
                    <!-- Profile Card -->
                    <div class="profile-id-card" style="margin: 0; position: relative; padding: 20px; border-radius: 16px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);">
                        <!-- Close Button -->
                        <button type="button" class="close-profile-btn" style="border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 14px; position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.15); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>

                        <!-- Decorative blobs -->
                        <div class="profile-blob profile-blob-1" style="opacity: 0.1; width: 100px; height: 100px;"></div>
                        <div class="profile-blob profile-blob-2" style="opacity: 0.1; width: 100px; height: 100px;"></div>

                        <!-- Avatar + name hero -->
                        <div class="profile-hero" style="margin-bottom: 16px; gap: 16px; display: flex; align-items: center;">
                            <div class="profile-avatar-wrap">
                                <img class="profile-avatar-img" src="/api/admin/users/${user.id}/avatar" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23e0e7ff\\'/><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\' fill=\\'%236366f1\\'/><path d=\\'M12 14c-4.42 0-8 2.58-8 6v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1c0-3.42-3.58-6-8-6z\\' fill=\\'%236366f1\\'/></svg>'" style="width: 56px; height: 56px; border: 2px solid rgba(255,255,255,0.7); box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                            </div>
                            <div class="profile-hero-text">
                                <div class="profile-badge" style="font-size: 10px; padding: 2px 8px; margin-bottom: 2px;">${user.role_name || 'Individual'}</div>
                                <h3 class="profile-hero-name" style="margin: 0; color: #fff; font-size: 1.15rem; font-weight: 700;">${user.name || '-'}</h3>
                                <div class="profile-hero-sub" style="color: rgba(255, 255, 255, 0.7); font-size: 11px; font-weight: 500;">
                                    Designation: ${user.designation || '-'} | Personal No: ${user.personal_no || '-'}
                                </div>
                            </div>
                        </div>

                        <!-- Info chips row -->
                        <div class="profile-chips-row" style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px;">
                            <div class="profile-chip" style="padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                                <span class="profile-chip-icon" style="font-size: 14px;">📧</span>
                                <div>
                                    <div class="profile-chip-label" style="font-size: 9px; color: rgba(255,255,255,0.5);">Email</div>
                                    <div class="profile-chip-val" style="font-size: 11px; color: #fff;" title="${user.email || '-'}">${user.email || '-'}</div>
                                </div>
                            </div>
                            <div class="profile-chip" style="padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                                <span class="profile-chip-icon" style="font-size: 14px;">📱</span>
                                <div>
                                    <div class="profile-chip-label" style="font-size: 9px; color: rgba(255,255,255,0.5);">Mobile</div>
                                    <div class="profile-chip-val" style="font-size: 11px; color: #fff;">${user.mobile_no || '-'}</div>
                                </div>
                            </div>
                            <div class="profile-chip" style="padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                                <span class="profile-chip-icon" style="font-size: 14px;">🏥</span>
                                <div>
                                    <div class="profile-chip-label" style="font-size: 9px; color: rgba(255,255,255,0.5);">CGHS ID</div>
                                    <div class="profile-chip-val" style="font-size: 11px; color: #fff;">${user.cghs_ben_id || '-'}</div>
                                </div>
                            </div>
                            <div class="profile-chip" style="padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                                <span class="profile-chip-icon" style="font-size: 14px;">💰</span>
                                <div>
                                    <div class="profile-chip-label" style="font-size: 9px; color: rgba(255,255,255,0.5);">Pay Level / Basic</div>
                                    <div class="profile-chip-val" style="font-size: 11px; color: #fff;">L${user.pay_level || '-'} / ₹${user.basic_pay || '-'}</div>
                                </div>
                            </div>
                            <div class="profile-chip" style="padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                                <span class="profile-chip-icon" style="font-size: 14px;">📂</span>
                                <div>
                                    <div class="profile-chip-label" style="font-size: 9px; color: rgba(255,255,255,0.5);">GPF A/C</div>
                                    <div class="profile-chip-val" style="font-size: 11px; color: #fff;">${user.gpf_ac_no || '-'}</div>
                                </div>
                            </div>
                            <div class="profile-chip" style="padding: 8px 12px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                                <span class="profile-chip-icon" style="font-size: 14px;">🏠</span>
                                <div>
                                    <div class="profile-chip-label" style="font-size: 9px; color: rgba(255,255,255,0.5);">Address</div>
                                    <div class="profile-chip-val" style="font-size: 11px; color: #fff;" title="${user.address || '-'}">${user.address || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Family Details Panel (Tree Grid) -->
                    <div style="background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <h4 style="margin-top: 0; margin-bottom: 12px; color: var(--primary-color); border-left: 4px solid var(--accent-color); padding-left: 10px; font-size: 1rem; font-weight: 700;">Family Details (Dependents)</h4>
                        <div class="profile-dependents-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
                            <!-- Dependents render dynamically here -->
                        </div>
                    </div>

                </div>
            </div>
        `;

        detailRow.appendChild(td);
        tr.parentNode.insertBefore(detailRow, tr.nextSibling);

        // Render dependents list inside the inline card
        const depsContainer = detailRow.querySelector('.profile-dependents-list');
        if (user.dependents && user.dependents.length > 0) {
            user.dependents.forEach(dep => {
                const dobFormatted = dep.dob ? new Date(dep.dob).toLocaleDateString('en-GB') : '-';
                const depCard = document.createElement('div');
                depCard.className = 'profile-chip';
                depCard.style.background = '#f8fafc';
                depCard.style.borderColor = '#e2e8f0';
                depCard.style.color = '#1e293b';
                depCard.style.padding = '8px 12px';
                depCard.style.borderRadius = '10px';
                depCard.style.display = 'flex';
                depCard.style.alignItems = 'center';
                depCard.style.gap = '10px';
                depCard.innerHTML = `
                    <span class="profile-chip-icon" style="font-size: 18px;">👤</span>
                    <div>
                        <div style="font-weight: 700; font-size: 12px; color: #0f172a;">${dep.name}</div>
                        <div style="font-size: 10px; color: #64748b; margin-top: 1px;">
                            Relation: <strong>${dep.relationship}</strong> | DOB: <strong>${dobFormatted}</strong>
                        </div>
                        ${dep.cghs_card_no ? `<div style="font-size: 9px; color: var(--accent-color); font-weight: 600; margin-top: 2px;">CGHS Card: ${dep.cghs_card_no}</div>` : ''}
                    </div>
                `;
                depsContainer.appendChild(depCard);
            });
        } else {
            depsContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 16px; color: #64748b; background: #f8fafc; border-radius: 10px; border: 1px dashed #e2e8f0; font-size: 11px;">
                    No dependents added for this user.
                </div>
            `;
        }

        // Close button click handler
        detailRow.querySelector('.close-profile-btn').addEventListener('click', () => {
            detailRow.remove();
        });

        // Smooth scroll to the newly inserted details row
        detailRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
        console.error(err);
        alert('Error loading profile card');
    }
}

window.toggleUserStatus = async function(userId, checkbox, bgDiv, circleDiv) {
    const is_active = checkbox.checked;
    // Update visuals optimistically
    bgDiv.style.backgroundColor = is_active ? '#34C759' : '#e5e7eb';
    circleDiv.style.transform = is_active ? 'translateX(14px)' : 'translateX(0)';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ is_active })
        });
        if (!res.ok) throw new Error('Failed to update status');
        loadUsers(); // Refresh the list
    } catch (err) {
        console.error(err);
        alert('Error updating user status');
        // Revert on error
        checkbox.checked = !is_active;
        bgDiv.style.backgroundColor = checkbox.checked ? '#34C759' : '#e5e7eb';
        circleDiv.style.transform = checkbox.checked ? 'translateX(14px)' : 'translateX(0)';
    }
};

window.openEditUserModal = async function(userId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch user');
        const user = await res.json();
        
        document.getElementById('edit-user-id').value = user.id;
        document.getElementById('edit-username').value = user.username;
        document.getElementById('edit-name').value = user.name || '';
        document.getElementById('edit-designation').value = user.designation || '';
        document.getElementById('edit-email').value = user.email || '';
        document.getElementById('edit-personal_no').value = user.personal_no || '';
        document.getElementById('edit-gender').value = user.gender || 'Male';
        document.getElementById('edit-role').value = user.role_name || 'Individual';
        
        const modal = document.getElementById('edit-user-modal');
        modal.classList.remove('hidden');
        // Slight delay for animation
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.transform').classList.remove('scale-95');
        }, 10);
    } catch (err) {
        console.error(err);
        alert('Error fetching user details');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Edit Modal close handlers
    const editModal = document.getElementById('edit-user-modal');
    if (editModal) {
        const closeEditModal = () => {
            editModal.classList.add('opacity-0');
            editModal.querySelector('.transform').classList.add('scale-95');
            setTimeout(() => {
                editModal.classList.add('hidden');
                document.getElementById('edit-user-form').reset();
            }, 300);
        };
        
        document.getElementById('close-edit-modal-btn').addEventListener('click', closeEditModal);
        document.getElementById('cancel-edit-modal-btn').addEventListener('click', closeEditModal);
        
        document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-user-id').value;
            const data = {
                name: document.getElementById('edit-name').value,
                designation: document.getElementById('edit-designation').value,
                email: document.getElementById('edit-email').value,
                personal_no: document.getElementById('edit-personal_no').value,
                gender: document.getElementById('edit-gender').value,
                role_name: document.getElementById('edit-role').value
            };
            
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/admin/users/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
                
                if (!res.ok) {
                    const errData = await res.json();
                    document.getElementById('edit-user-error').innerText = errData.message || 'Update failed';
                    document.getElementById('edit-user-error').classList.remove('hidden');
                    return;
                }
                
                closeEditModal();
                loadUsers();
            } catch (err) {
                console.error(err);
                document.getElementById('edit-user-error').innerText = 'Connection error';
                document.getElementById('edit-user-error').classList.remove('hidden');
            }
        });
    }
});