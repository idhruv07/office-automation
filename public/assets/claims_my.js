document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const viewTitle = document.getElementById('view-title');
    const contentDiv = document.getElementById('claims-dynamic-content');

    // Map of claim id -> claim object so viewClaimPrint can look up folder_name
    let claimsById = {};
    let currentUsername = localStorage.getItem('username') || '';

    // Verify and fetch accurate username from session to prevent 'undefined' issues
    if (token) {
        fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.username) {
                currentUsername = data.username;
                localStorage.setItem('username', data.username); // heal localStorage too
            }
        })
        .catch(err => console.error('Failed to pre-fetch profile username', err));
    }

    async function updateReturnedCount() {
        try {
            const res = await fetch('/api/claims?status=Returned', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const claims = await res.json();
            const badge = document.getElementById('returned-count');
            if (badge) {
                if (claims.length > 0) {
                    badge.textContent = claims.length;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        } catch (err) {
            console.error('Error updating badge:', err);
        }
    }

    const yearSelect = document.getElementById('filter-year');
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        const opt = document.createElement('option');
        opt.value = currentYear - i;
        opt.textContent = currentYear - i;
        yearSelect.appendChild(opt);
    }

    let currentStatusFilter = '';

    async function loadClaims(statusFilter = '') {
        currentStatusFilter = statusFilter;
        const selectedYear = yearSelect.value;

        contentDiv.innerHTML = '<p>Loading claims...</p>';
        try {
            let url = `/api/claims?status=${statusFilter}`;
            if (selectedYear) {
                url += `&year=${selectedYear}`;
            }

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const claims = await res.json();

            // Build lookup map for folder_name resolution in viewClaimPrint
            claimsById = {};
            claims.forEach(c => { claimsById[c.id] = c; });

            if (claims.length === 0) {
                contentDiv.innerHTML = `<p>No claims found for ${selectedYear || 'the last 6 months'}.</p>`;
                return;
            }

            // Group claims by type
            const grouped = {};
            claims.forEach(c => {
                if (!grouped[c.type_name]) grouped[c.type_name] = [];
                grouped[c.type_name].push(c);
            });

            contentDiv.innerHTML = Object.keys(grouped).map(typeName => `
                        <div class="claim-type-section" style="margin-bottom: 30px;">
                            <h3 style="background: rgba(255,255,255,0.08); padding: 8px 16px; border-left: 4px solid var(--secondary-color); border-radius: 4px; color: white; font-size: 0.95rem; font-weight: 700; margin-top: 0; margin-bottom: 12px; display: inline-block;">${typeName}</h3>
                            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                                <thead>
                                    <tr>
                                        <th style="width: 50px;">ID</th>
                                        <th style="width: 30%;">Claim Name</th>
                                        <th style="width: 100px;">Date</th>
                                        <th style="width: 110px;">Status</th>
                                        <th>Remarks</th>
                                        <th style="width: 140px;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${grouped[typeName].map(c => `
                                        <tr>
                                            <td style="text-align: center;">${c.id}</td>
                                            <td style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.claim_name}">${c.claim_name}</td>
                                            <td style="text-align: center;">${new Date(c.claim_date).toLocaleDateString()}</td>
                                            <td style="text-align: center;">
                                                <span class="status-badge" style="background: ${getStatusColor(c.status)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; display: inline-block;">
                                                    ${c.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style="font-size: 11px; opacity: 0.95;">${c.remarks || '-'}</td>
                                            <td>
                                                <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-direction: row;">
                                                    <button class="claim-action-btn btn-view" onclick="viewClaimPrint(${c.id})" data-tooltip="View / Print">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                    </button>
                                                    <button class="claim-action-btn btn-edit" onclick="window.location.href='/claims/new.html?edit_id=${c.id}'" data-tooltip="Edit Claim">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                    </button>
                                                    ${['Draft', 'Returned', 'Rejected'].includes(c.status) ? `
                                                    <button class="claim-action-btn btn-delete" onclick="deleteDraft(${c.id})" data-tooltip="Delete">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                    </button>` : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `).join('');

        } catch (err) {
            contentDiv.innerHTML = '<p style="color:red;">Error loading claims.</p>';
        }
        updateReturnedCount();
    }

    yearSelect.addEventListener('change', () => {
        loadClaims(currentStatusFilter);
    });

    function setActiveButton(activeId) {
        const buttons = ['btn-show-all', 'btn-show-submitted', 'btn-show-drafts', 'btn-show-returned'];
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                if (id === activeId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }

    document.getElementById('btn-show-all').addEventListener('click', (e) => {
        e.preventDefault();
        setActiveButton('btn-show-all');
        viewTitle.textContent = 'All Claims';
        loadClaims('');
    });

    document.getElementById('btn-show-submitted').addEventListener('click', (e) => {
        e.preventDefault();
        setActiveButton('btn-show-submitted');
        viewTitle.textContent = 'Submitted Claims';
        loadClaims('Submitted');
    });

    document.getElementById('btn-show-drafts').addEventListener('click', (e) => {
        e.preventDefault();
        setActiveButton('btn-show-drafts');
        viewTitle.textContent = 'My Drafts';
        loadClaims('Draft');
    });

    document.getElementById('btn-show-returned').addEventListener('click', (e) => {
        e.preventDefault();
        setActiveButton('btn-show-returned');
        viewTitle.textContent = 'Returned Claims';
        loadClaims('Returned');
    });

    window.deleteDraft = async function (id) {
        if (!confirm('Are you sure you want to delete this draft?')) return;
        try {
            const res = await fetch(`/api/claims/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Draft deleted');
                loadClaims('Draft');
            } else {
                const data = await res.json();
                alert(data.message || 'Error deleting');
            }
        } catch (err) {
            alert('Network error');
        }
    };

    window.viewClaimPrint = function (id) {
        const claim = claimsById[id];
        let url = '';
        if (claim && claim.file_path && claim.file_path.trim() !== '') {
            url = '/' + claim.file_path.trim();
        } else {
            let username = (claim && claim.username) ? claim.username : '';
            if (!username || username === 'undefined') {
                username = currentUsername || localStorage.getItem('username') || '';
                if (!username || username === 'undefined') {
                    username = 'default';
                }
            }
            const folderSegment = (claim && claim.folder_name && claim.folder_name.trim() !== '')
                ? `${claim.folder_name.trim()}/`
                : '';
            url = `/storage/${username}/claims/${folderSegment}${id}.html`;
        }
        const win = window.open(url, '_blank');
        if (!win) alert('Please allow popups to view the claim.');
    };

    function getStatusColor(status) {
        switch(status) {
            case 'Pending': return 'var(--primary-color)';
            case 'Approved': return 'var(--success-color)';
            case 'Rejected': return 'var(--danger-color)';
            case 'Returned': return 'var(--warning-color)';
            default: return 'var(--text-muted)';
        }
    }

    loadClaims('');
});