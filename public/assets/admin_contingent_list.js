document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const contentDiv = document.getElementById('contingent-list-content');
    const folderListDiv = document.getElementById('folder-list');
    const resultCount = document.getElementById('result-count');
    const folderTitle = document.getElementById('current-folder-title');

    let allContingentClaims = [];
    let currentFolder = null;

    async function fetchContingentBills() {
        try {
            // Fetch only contingent bills (type_id=7)
            const res = await fetch('/api/admin/claims?type_id=7&months=60', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');
            
            // Note: Our current API might return ALL types, so we filter here to be safe
            const data = await res.json();
            allContingentClaims = data.filter(c => c.type_id === 7);
            
            renderFolders();
            renderClaims(null); // Show root by default
        } catch (err) {
            contentDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        }
    }

    function renderFolders() {
        const folders = new Set();
        allContingentClaims.forEach(c => {
            const f = (c.folder_name || '').trim();
            if (f) folders.add(f);
        });

        let html = `<button class="adm-filter-btn ${(!currentFolder) ? 'active' : ''}" data-folder="">Root (No Folder)</button>`;
        folders.forEach(f => {
            html += `<button class="adm-filter-btn ${currentFolder === f ? 'active' : ''}" data-folder="${f}">${f}</button>`;
        });

        folderListDiv.innerHTML = html;

        folderListDiv.querySelectorAll('button').forEach(btn => {
            btn.onclick = () => {
                currentFolder = btn.dataset.folder || '';
                renderFolders(); // Re-render for active state
                renderClaims(currentFolder);
            };
        });
    }

    function renderClaims(folder) {
        const filtered = allContingentClaims.filter(c => {
            const cFolder = (c.folder_name || '').trim();
            const targetFolder = (folder || '').trim();
            return cFolder === targetFolder;
        });
        resultCount.textContent = `${filtered.length} Results`;
        folderTitle.textContent = (folder === null || folder === '') ? 'Root Folder' : `Folder: ${folder}`;

        if (filtered.length === 0) {
            contentDiv.innerHTML = '<p style="padding: 1rem; color: #64748b;">No bills found in this folder.</p>';
            return;
        }

        contentDiv.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Claim Name</th>
                        <th>Submitted By</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(c => `
                        <tr>
                            <td>${new Date(c.claim_date).toLocaleDateString()}</td>
                            <td>
                                <strong>${c.claim_name}</strong>
                                <div style="font-size: 0.75rem; color: #64748b;">ID: #${c.id}</div>
                            </td>
                            <td>
                                <div>${c.user_name}</div>
                                <div style="font-size: 0.75rem; color: #64748b;">${c.personal_no}</div>
                            </td>
                            <td>
                                <span class="status-badge" style="background: ${getStatusColor(c.status)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                    ${c.status.toUpperCase()}
                                </span>
                            </td>
                            <td>
                                <a href="/storage/${c.username}/claims/${c.folder_name ? c.folder_name + '/' : ''}${c.id}.html" target="_blank" style="display: block; color: #2563eb; font-weight: 700; margin-bottom: 4px; text-decoration: none;">View Claim</a>
                                <a href="/admin/fwd_note.html?id=${c.id}" target="_blank" style="display: block; color: #6366f1; text-decoration: none; font-size: 11px; margin-bottom: 4px;">Forward Note</a>
                                ${c.status !== 'Approved' && c.status !== 'Rejected' ? `
                                    <a href="/claims/new.html?edit_id=${c.id}" style="display: block; color: #3b82f6; text-decoration: none; font-size: 11px; font-weight: 700; margin-bottom: 4px;">Edit Bill</a>
                                ` : ''}
                                <button type="button" onclick="event.preventDefault(); event.stopPropagation(); deleteContingent(${c.id})" style="background: none; border: none; color: #ef4444; font-weight: 700; cursor: pointer; padding: 0; display: block; text-align: left; font-size: 11px;">Delete Bill</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    window.deleteContingent = async function (id) {
        if (window.deleteContingent.isDeleting) return;
        window.deleteContingent.isDeleting = true;
        try {
            const res = await fetch(`/api/claims/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Contingent Bill deleted successfully');
                await fetchContingentBills(); // Reload the list
            } else {
                const data = await res.json();
                alert(data.message || 'Error deleting Contingent Bill');
            }
        } catch (err) {
            console.error('Deletion error:', err);
            alert('Network error');
        } finally {
            window.deleteContingent.isDeleting = false;
        }
    };

    function getStatusColor(status) {
        switch(status) {
            case 'Pending': return '#3b82f6';
            case 'Approved': return '#10b981';
            case 'Rejected': return '#ef4444';
            case 'Returned': return '#f59e0b';
            default: return '#64748b';
        }
    }

    fetchContingentBills();
});
