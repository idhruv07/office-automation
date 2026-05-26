document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const viewTitle = document.getElementById('view-title');
    const contentDiv = document.getElementById('admin-claims-dynamic-content');
    const periodSelect = document.getElementById('filter-period');
    const customDateInput = document.getElementById('filter-custom-date');

    let currentStatusFilter = '';

    function getPeriodParam() {
        const val = periodSelect.value;
        if (val === 'custom') {
            const d = customDateInput.value;
            return d ? `&from_date=${d}&to_date=${d}` : '';
        }
        return `&period=${val}`;
    }

    periodSelect.addEventListener('change', () => {
        if (periodSelect.value === 'custom') {
            customDateInput.style.display = 'inline-block';
            customDateInput.valueAsDate = new Date();
        } else {
            customDateInput.style.display = 'none';
        }
        loadClaims(currentStatusFilter);
    });

    customDateInput.addEventListener('change', () => loadClaims(currentStatusFilter));

    async function loadClaims(statusFilter = '') {
        currentStatusFilter = statusFilter;
        contentDiv.innerHTML = '<p style="padding: 1rem; color: #64748b;">Loading claim data...</p>';

        try {
            let url = `/api/admin/claims?status=${statusFilter}${getPeriodParam()}`;

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
                    <h3 style="background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem; font-weight: 700; color: #334155; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            ${typeName} <span style="font-weight: 400; color: #94a3b8; font-size: 0.8rem; margin-left: 10px;">${grouped[typeName].length} items</span>
                        </div>
                        <button onclick="generateMultiFwdNote('${typeName.replace(/'/g, "\\'")}')" style="background: #4f46e5; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">Generate Multi-Forward Note</button>
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                        <thead>
                            <tr style="background: white;">
                                <th style="border-bottom: 2px solid #f1f5f9; padding: 12px 10px 12px 20px; width: 40px;"><input type="checkbox" onclick="toggleGroup(this, '${typeName.replace(/'/g, "\\'")}')"></th>
                                <th style="border-bottom: 2px solid #f1f5f9; padding: 12px 20px; width: 180px; font-size: 0.75rem; text-transform: uppercase; color: #64748b;">User Details</th>
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
                                    <td style="padding: 12px 10px 12px 20px;">
                                        <input type="checkbox" class="claim-cb claim-cb-${typeName.replace(/[^a-zA-Z0-9]/g, '')}" value="${c.id}" data-type="${typeName.replace(/'/g, "\\'")}" data-name="${c.user_name || ''}" data-desig="${c.designation || ''}" data-pno="${c.personal_no || ''}" data-gender="${c.gender || ''}">
                                    </td>
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
                                            <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-direction: row;">
                                                <button class="claim-action-btn btn-approve" onclick="openModal(${c.id}, 'Approved')" data-tooltip="Approve Claim">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </button>
                                                <button class="claim-action-btn btn-return" onclick="openModal(${c.id}, 'Returned')" data-tooltip="Return to User">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"></path><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path></svg>
                                                </button>
                                                <button class="claim-action-btn btn-reject" onclick="openModal(${c.id}, 'Rejected')" data-tooltip="Reject Claim">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
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

    // Event Listeners for Status Filters
    document.getElementById('btn-show-all').addEventListener('click', () => { setActiveTab('btn-show-all'); viewTitle.textContent = 'All Submitted Claims'; loadClaims(''); });
    document.getElementById('btn-show-pending').addEventListener('click', () => { setActiveTab('btn-show-pending'); viewTitle.textContent = 'Pending Claims'; loadClaims('Pending'); });
    document.getElementById('btn-show-approved').addEventListener('click', () => { setActiveTab('btn-show-approved'); viewTitle.textContent = 'Approved Claims'; loadClaims('Approved'); });
    document.getElementById('btn-show-returned').addEventListener('click', () => { setActiveTab('btn-show-returned'); viewTitle.textContent = 'Returned Claims'; loadClaims('Returned'); });
    document.getElementById('btn-show-rejected').addEventListener('click', () => { setActiveTab('btn-show-rejected'); viewTitle.textContent = 'Rejected Claims'; loadClaims('Rejected'); });

    window.toggleGroup = function(masterCb, typeName) {
        const safeName = typeName.replace(/[^a-zA-Z0-9]/g, '');
        document.querySelectorAll(`.claim-cb-${safeName}`).forEach(cb => cb.checked = masterCb.checked);
    };

    window.generateMultiFwdNote = function(typeName) {
        const safeName = typeName.replace(/[^a-zA-Z0-9]/g, '');
        const selectedCbs = document.querySelectorAll(`.claim-cb-${safeName}:checked`);
        if (selectedCbs.length === 0) {
            alert('Please select at least one claim to generate a Forwarding Note.');
            return;
        }

        // Pack selected individuals into sessionStorage and navigate to multi_fwd_note page
        const individuals = Array.from(selectedCbs).map(cb => ({
            id:     cb.value,
            name:   cb.getAttribute('data-name'),
            desig:  cb.getAttribute('data-desig'),
            pno:    cb.getAttribute('data-pno'),
            gender: cb.getAttribute('data-gender')
        }));

        sessionStorage.setItem('multiFwdNote', JSON.stringify({
            typeName,
            individuals,
            claimIds: individuals.map(i => i.id)
        }));

        window.open('/admin/multi_fwd_note.html', '_blank');
    };

    loadClaims('');
});