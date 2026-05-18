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
                            <h3 style="background: #f1f5f9; padding: 8px; border-left: 5px solid var(--primary-color);">${typeName}</h3>
                            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed;">
                                <thead>
                                    <tr style="background: #f8fafc;">
                                        <th style="border: 1px solid #e2e8f0; padding: 8px; width: 50px;">ID</th>
                                        <th style="border: 1px solid #e2e8f0; padding: 8px; width: 30%;">Claim Name</th>
                                        <th style="border: 1px solid #e2e8f0; padding: 8px; width: 100px;">Date</th>
                                        <th style="border: 1px solid #e2e8f0; padding: 8px; width: 100px;">Status</th>
                                        <th style="border: 1px solid #e2e8f0; padding: 8px;">Remarks</th>
                                        <th style="border: 1px solid #e2e8f0; padding: 8px; width: 180px;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${grouped[typeName].map(c => `
                                        <tr>
                                            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${c.id}</td>
                                            <td style="border: 1px solid #e2e8f0; padding: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.claim_name}">${c.claim_name}</td>
                                            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;">${new Date(c.claim_date).toLocaleDateString()}</td>
                                            <td style="border: 1px solid #e2e8f0; padding: 8px; text-align: center;"><strong style="color: ${c.status === 'Returned' ? '#dc3545' : 'inherit'}">${c.status}</strong></td>
                                            <td style="border: 1px solid #e2e8f0; padding: 8px; font-size: 11px;">${c.remarks || '-'}</td>
                                            <td style="border: 1px solid #e2e8f0; padding: 8px;">
                                                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                                                    <button class="btn-sm" style="background: var(--primary-color); cursor: pointer;" onclick="viewClaimPrint(${c.id})" title="View / Print">👁️</button>
                                                    <button class="btn-sm" style="background: #6c757d; cursor: pointer;" onclick="window.location.href='/claims/new.html?edit_id=${c.id}'" title="Edit Claim">✏️</button>
                                                    ${['Draft', 'Returned', 'Rejected'].includes(c.status) ? `<button class="btn-sm" style="background: #dc3545; cursor: pointer;" onclick="deleteDraft(${c.id})" title="Delete">🗑️</button>` : ''}
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
        let username = (claim && claim.username) ? claim.username : '';
        if (!username || username === 'undefined') {
            username = currentUsername || localStorage.getItem('username') || '';
            if (!username || username === 'undefined') {
                username = 'default';
            }
        }
        // Include folder_name in path — files may be saved in subfolders
        const folderSegment = (claim && claim.folder_name && claim.folder_name.trim() !== '')
            ? `${claim.folder_name.trim()}/`
            : '';
        const url = `/storage/${username}/claims/${folderSegment}${id}.html`;
        const win = window.open(url, '_blank');
        if (!win) alert('Please allow popups to view the claim.');
    };

    loadClaims('');
});