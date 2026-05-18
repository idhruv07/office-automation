document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const userData = {
        username: document.getElementById('new-username').value,
        password: document.getElementById('new-password').value,
        name: document.getElementById('new-name').value,
        designation: document.getElementById('new-designation').value,
        email: document.getElementById('new-email').value,
        personal_no: document.getElementById('new-personal_no').value,
        gender: document.getElementById('new-gender').value,
        role_name: 'Individual'
    };

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
            await loadUsers(); // Auto-reload list on success
        } else {
            alert(data.message || 'Error creating user');
        }
    } catch (err) {
        console.error(err);
        alert('Network error');
    }
});

let allUsers = [];
let currentFilter = 'all';

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
        if (currentFilter === 'online') {
            if (!user.last_active_at) return false;
            const lastActive = new Date(user.last_active_at).getTime();
            const now = Date.now();
            // Online if active in the last 5 minutes
            return (now - lastActive) < 5 * 60 * 1000;
        }
        return true;
    });

    // Update user count in table header
    const resultCount = document.getElementById('result-count');
    if (resultCount) {
        resultCount.textContent = `${filtered.length} Users`;
    }

    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">
                    No users found matching this filter.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(user => {
        // Calculate online/offline status based on activity in last 5 minutes
        let isOnline = false;
        if (user.last_active_at) {
            const lastActive = new Date(user.last_active_at).getTime();
            const now = Date.now();
            isOnline = (now - lastActive) < 5 * 60 * 1000;
        }

        // Format last login timestamp nicely
        let lastLoginText = '-';
        if (user.last_login_at) {
            lastLoginText = new Date(user.last_login_at).toLocaleString();
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: #64748b;">#${user.id}</td>
            <td><strong>${user.username}</strong></td>
            <td>
                <span class="status-badge" style="background: ${isOnline ? '#dcfce7' : '#f1f5f9'}; color: ${isOnline ? '#15803d' : '#475569'}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: ${isOnline ? '#22c55e' : '#94a3b8'}; display: inline-block;"></span>
                    ${isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
            </td>
            <td>${user.name || '-'}</td>
            <td>${user.designation || '-'}</td>
            <td>${user.personal_no || '-'}</td>
            <td style="font-size: 0.85rem; color: #475569; font-weight: 500;">${lastLoginText}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Setup filter listeners
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();

    const filterAllBtn = document.getElementById('filter-all');
    const filterOnlineBtn = document.getElementById('filter-online');

    if (filterAllBtn && filterOnlineBtn) {
        filterAllBtn.onclick = () => {
            filterAllBtn.classList.add('active');
            filterOnlineBtn.classList.remove('active');
            currentFilter = 'all';
            renderUsers();
        };

        filterOnlineBtn.onclick = () => {
            filterOnlineBtn.classList.add('active');
            filterAllBtn.classList.remove('active');
            currentFilter = 'online';
            renderUsers();
        };
    }
});