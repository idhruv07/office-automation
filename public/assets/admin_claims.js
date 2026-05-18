document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const viewTitle = document.getElementById('view-title');
    const contentDiv = document.getElementById('admin-claims-dynamic-content');
    const yearSelect = document.getElementById('filter-year');

    let currentClaimId = null;
    let currentAction = null;
    let currentStatusFilter = '';

    // Populate years
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        const opt = document.createElement('option');
        opt.value = currentYear - i;
        opt.textContent = currentYear - i;
        yearSelect.appendChild(opt);
    }

    async function loadClaims(statusFilter = '') {
        currentStatusFilter = statusFilter;
        const selectedYear = yearSelect.value;
        contentDiv.innerHTML = '<p style="padding: 1rem; color: #64748b;">Loading claim data...</p>';

        try {
            let url = `/api/admin/claims?status=${statusFilter}`;
            if (selectedYear) url += `&year=${selectedYear}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const claims = await res.json();

            // Update Stats (only on initial load or "All" view to get full picture)
            // Actually, better to fetch ALL once for stats or compute from current if not filtered
            updateDashboardStats(claims, statusFilter);
            document.getElementById('result-count').textContent = `${claims.length} Results`;

            if (claims.length === 0) {
                contentDiv.innerHTML = `<p style="padding: 1rem; color: #64748b;">No claims found for ${selectedYear || 'the last 6 months'}.</p>`;
                return;
            }

            // Group by type
            const grouped = {};
            claims.forEach(c => {
                if (!grouped[c.type_name]) grouped[c.type_name] = [];
                grouped[c.type_name].push(c);
            });

            contentDiv.innerHTML = Object.keys(grouped).map(typeName => `
                <div class="claim-type-section" style="margin-bottom: 2rem; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <h3 style="background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; font-weight: 700; color: #334155;">
                        ${typeName} <span style="font-weight: 400; color: #94a3b8; font-size: 0.8rem; margin-left: 10px;">${grouped[typeName].length} items</span>
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                        <thead>
                            <tr style="background: white;">
                                <th style="border-bottom: 2px solid #f1f5f9; padding: 12px 20px; width: 200px; font-size: 0.75rem; text-transform: uppercase; color: #64748b;">User Details</th>
                                <th style="border-bottom: 2px solid #f1f5f9; padding: 12px 20px; font-size: 0.75rem; text-transform: uppercase; color: #64748b;">Claim Details</th>
                                <th style="border-bottom: 2px solid #f1f5f9; padding: 12px 20px; width: 140px; font-size: 0.75rem; text-transform: uppercase; color: #64748b;">Submitted</th>
                                <th style="border-bottom: 2px solid #f1f5f9; padding: 12px 20px; width: 100px; font-size: 0.75rem; text-transform: uppercase; color: #64748b;">Status</th>
                                <th style="border-bottom: 2px solid #f1f5f9; padding: 12px 20px; width: 120px; font-size: 0.75rem; text-transform: uppercase; color: #64748b;">Documents</th>
                                <th style="border-bottom: 2px solid #f1f5f9; padding: 12px 20px; width: 220px; font-size: 0.75rem; text-transform: uppercase; color: #64748b;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${grouped[typeName].map(c => `
                                <tr style="border-bottom: 1px solid #f1f5f9;">
                                    <td style="padding: 12px 20px; font-size: 11px;">
                                        <div style="font-weight: 700; color: #1e293b;">${c.user_name}</div>
                                        <div style="color: #64748b;">${c.designation}</div>
                                    </td>
                                    <td style="padding: 12px 20px; font-size: 12px;">
                                        <div style="font-weight: 700; color: #1e293b;">${c.claim_name}</div>
                                        <div style="color: #64748b; font-size: 11px;">Date: ${new Date(c.claim_date).toLocaleDateString()}</div>
                                    </td>
                                    <td style="padding: 12px 20px; text-align: center; font-size: 11px; color: #64748b;">
                                        <div style="font-weight: 600;">${new Date(c.submitted_at).toLocaleDateString()}</div>
                                        <div>${new Date(c.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                    </td>
                                    <td style="padding: 12px 20px; text-align: center;">
                                        <span style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; background: ${getStatusBg(c.status)}; color: white;">
                                            ${c.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style="padding: 12px 20px; font-size: 11px; text-align: center;">
                                        <a href="${c.file_path ? '/' + c.file_path.trim() : `/storage/${c.username}/claims/${c.folder_name ? c.folder_name + '/' : ''}${c.id}.html`}" target="_blank" style="display: block; color: #2563eb; font-weight: 700; margin-bottom: 4px; text-decoration: none;">View Claim</a>
                                        <a href="/admin/fwd_note.html?id=${c.id}" target="_blank" style="display: block; color: #6366f1; text-decoration: none;">Forward Note</a>
                                    </td>
                                    <td style="padding: 12px 20px;">
                                        ${c.status === 'Pending' ? `
                                            <div style="display: flex; gap: 6px; justify-content: center;">
                                                <button class="btn-sm" style="background: #059669; color:white; border:none; padding: 6px 12px; border-radius: 6px; cursor:pointer; font-weight: 700;" onclick="openModal(${c.id}, 'Approved')">Approve</button>
                                                <button class="btn-sm" style="background: #d97706; color:white; border:none; padding: 6px 12px; border-radius: 6px; cursor:pointer; font-weight: 700;" onclick="openModal(${c.id}, 'Returned')">Return</button>
                                                <button class="btn-sm" style="background: #dc2626; color:white; border:none; padding: 6px 12px; border-radius: 6px; cursor:pointer; font-weight: 700;" onclick="openModal(${c.id}, 'Rejected')">Reject</button>
                                            </div>
                                        ` : `
                                            <div style="text-align:center; font-size:11px; color:#94a3b8; font-style: italic;">No actions pending</div>
                                        `}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('');

        } catch (err) {
            contentDiv.innerHTML = '<p style="padding: 1rem; color:#dc2626; font-weight: 600;">Error loading claims. Please try again.</p>';
        }
    }

    async function updateDashboardStats(currentClaims, statusFilter) {
        // If we have a filter, we might not have the full data for stats.
        // For a true dashboard, we should fetch All claims once or from a separate stats endpoint.
        // For now, let's just compute from the "All" view or if filtered, just show what we have.
        if (statusFilter === '') {
            const total = currentClaims.length;
            const pending = currentClaims.filter(c => c.status === 'Pending').length;
            const approved = currentClaims.filter(c => c.status === 'Approved').length;
            
            document.getElementById('stat-total').textContent = total;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('stat-approved').textContent = approved;
        }
    }

    function setActiveTab(id) {
        document.querySelectorAll('.adm-filter-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    function getStatusBg(status) {
        switch(status) {
            case 'Pending': return '#3b82f6';
            case 'Approved': return '#059669';
            case 'Returned': return '#d97706';
            case 'Rejected': return '#dc2626';
            default: return '#64748b';
        }
    }

    window.openModal = function(id, action) {
        currentClaimId = id;
        currentAction = action;
        document.getElementById('modal-title').textContent = `${action} Claim #${id}`;
        document.getElementById('action-remarks').value = '';
        document.getElementById('action-modal').style.display = 'flex';
    };

    document.getElementById('btn-confirm-action').addEventListener('click', async () => {
        const remarks = document.getElementById('action-remarks').value;
        try {
            const res = await fetch(`/api/admin/claims/${currentClaimId}/status`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: currentAction, remarks })
            });
            if(res.ok) {
                alert(`Claim ${currentAction}`);
                document.getElementById('action-modal').style.display = 'none';
                loadClaims(currentStatusFilter);
            } else {
                const data = await res.json();
                alert(data.message || 'Error updating status');
            }
        } catch(err) {
            alert('Network error');
        }
    });

    // Event Listeners for Filters
    yearSelect.addEventListener('change', () => loadClaims(currentStatusFilter));
    document.getElementById('btn-show-all').addEventListener('click', () => { setActiveTab('btn-show-all'); viewTitle.textContent = 'All Submitted Claims'; loadClaims(''); });
    document.getElementById('btn-show-pending').addEventListener('click', () => { setActiveTab('btn-show-pending'); viewTitle.textContent = 'Pending Claims'; loadClaims('Pending'); });
    document.getElementById('btn-show-approved').addEventListener('click', () => { setActiveTab('btn-show-approved'); viewTitle.textContent = 'Approved Claims'; loadClaims('Approved'); });
    document.getElementById('btn-show-returned').addEventListener('click', () => { setActiveTab('btn-show-returned'); viewTitle.textContent = 'Returned Claims'; loadClaims('Returned'); });
    document.getElementById('btn-show-rejected').addEventListener('click', () => { setActiveTab('btn-show-rejected'); viewTitle.textContent = 'Rejected Claims'; loadClaims('Rejected'); });

    loadClaims('');
});