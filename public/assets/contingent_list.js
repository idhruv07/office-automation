document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    let currentUsername = localStorage.getItem('username') || '';
    const contentDiv = document.getElementById('contingent-list-content');
    const folderListDiv = document.getElementById('folder-list');
    const resultCount = document.getElementById('result-count');
    const folderTitle = document.getElementById('current-folder-title');

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

    let allContingentClaims = [];
    let currentFolder = 'contingent';

    async function fetchContingentBills() {
        try {
            // Fetch contingent bills for the logged-in Individual
            const res = await fetch('/api/claims?type_id=7&months=60', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch');

            const data = await res.json();
            allContingentClaims = data.filter(c => c.type_id === 7);

            renderFolders();
            renderClaims('contingent'); // Show contingent by default
        } catch (err) {
            contentDiv.innerHTML = `<p class="text-center font-bold" style="color: var(--danger-color);">Error: ${err.message}</p>`;
        }
    }

    function buildFolderTree(claims) {
        const root = { name: 'Root', fullPath: '', children: {} };
        claims.forEach(c => {
            const f = (c.folder_name || '').trim();
            if (!f) return;
            const parts = f.split('/');
            let current = root;
            let pathAccumulator = '';
            parts.forEach(part => {
                pathAccumulator = pathAccumulator ? `${pathAccumulator}/${part}` : part;
                if (!current.children[part]) {
                    current.children[part] = { name: part, fullPath: pathAccumulator, children: {} };
                }
                current = current.children[part];
            });
        });
        return root;
    }

    function renderTreeHTML(node, level = 0) {
        const hasChildren = Object.keys(node.children).length > 0;
        const isActive = currentFolder === node.fullPath;
        
        let html = '';
        if (node.fullPath !== '') { // Don't render the virtual root node itself
            html += `
                <div class="tree-node" style="padding-left: ${level * 12}px; margin: 4px 0;">
                    <div class="tree-node-row ${isActive ? 'active' : ''}" data-path="${node.fullPath}" style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 12px; border-radius: 8px; transition: all 0.2s ease;">
                        ${hasChildren ? `
                            <span class="tree-toggle" style="cursor: pointer; transition: transform 0.2s ease; display: inline-flex; align-items: center; font-size: 10px;">▶</span>
                        ` : '<span style="width: 10px;"></span>'}
                        <span class="tree-icon" style="font-size: 14px;">📁</span>
                        <span class="tree-label" style="font-size: 13px; font-weight: 600;">${node.name}</span>
                    </div>
                    ${hasChildren ? `
                        <div class="tree-children" style="display: block;">
                            ${Object.values(node.children).map(child => renderTreeHTML(child, level + 1)).join('')}
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            // Virtual Root: Render children directly
            html += `
                <div class="tree-node-row ${currentFolder === '' ? 'active' : ''}" data-path="" style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 12px; border-radius: 8px; margin-bottom: 8px;">
                    <span style="width: 10px;"></span>
                    <span class="tree-icon" style="font-size: 14px;">📦</span>
                    <span class="tree-label" style="font-size: 13px; font-weight: 800;">All Folders / Root</span>
                </div>
                <div class="tree-children">
                    ${Object.values(node.children).map(child => renderTreeHTML(child, level)).join('')}
                </div>
            `;
        }
        return html;
    }

    function renderFolders() {
        const treeRoot = buildFolderTree(allContingentClaims);
        folderListDiv.innerHTML = renderTreeHTML(treeRoot);

        // Bind click event to nodes
        folderListDiv.querySelectorAll('.tree-node-row').forEach(row => {
            row.onclick = (e) => {
                e.stopPropagation();
                const path = row.getAttribute('data-path');
                currentFolder = path;
                
                // Highlight active node
                folderListDiv.querySelectorAll('.tree-node-row').forEach(r => r.classList.remove('active'));
                row.classList.add('active');
                
                renderClaims(currentFolder);
            };
        });

        // Bind collapse/expand to toggles
        folderListDiv.querySelectorAll('.tree-toggle').forEach(toggle => {
            toggle.onclick = (e) => {
                e.stopPropagation();
                const node = toggle.closest('.tree-node');
                const childrenContainer = node.querySelector('.tree-children');
                if (childrenContainer) {
                    if (childrenContainer.style.display === 'none') {
                        childrenContainer.style.display = 'block';
                        toggle.style.transform = 'rotate(90deg)';
                    } else {
                        childrenContainer.style.display = 'none';
                        toggle.style.transform = 'rotate(0deg)';
                    }
                }
            };
            // Default state: expanded (rotate 90 deg)
            toggle.style.transform = 'rotate(90deg)';
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
            contentDiv.innerHTML = '<p class="text-center font-bold" style="padding: 1.5rem; color: var(--text-muted);">No bills found in this folder.</p>';
            return;
        }

        contentDiv.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Claim Name</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(c => `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${new Date(c.updated_at || c.claim_date).toLocaleDateString()}</div>
                                <div style="font-size: 0.75rem; opacity: 0.85;">${new Date(c.updated_at || c.claim_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </td>
                            <td>
                                <strong>${c.claim_name}</strong>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">ID: #${c.id}</div>
                            </td>
                            <td>
                                <span class="status-badge" style="background: ${getStatusColor(c.status)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                    ${c.status.toUpperCase()}
                                </span>
                            </td>
                            <td>
                                <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-direction: row;">
                                    <a class="claim-action-btn btn-view" href="${c.file_path ? '/' + c.file_path.trim() : `/storage/${(() => { let u = c.username || currentUsername || localStorage.getItem('username') || ''; return (!u || u === 'undefined') ? 'default' : u; })()}/claims/${c.folder_name ? c.folder_name + '/' : ''}${c.id}.html`}" target="_blank" data-tooltip="View / Print">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    </a>
                                    ${c.status === 'Draft' ? `
                                        <a class="claim-action-btn btn-edit" href="/claims/new.html?edit_id=${c.id}" data-tooltip="Edit Bill">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                        </a>
                                        <button class="claim-action-btn btn-delete" type="button" onclick="event.preventDefault(); event.stopPropagation(); deleteContingent(${c.id})" data-tooltip="Delete Bill">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    window.deleteContingent = async function (id) {
        if (window.deleteContingent.isDeleting) return;
        if (!confirm('Are you sure you want to delete this Contingent Bill?')) return;
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
        switch (status) {
            case 'Pending': return 'var(--primary-color)';
            case 'Approved': return 'var(--success-color)';
            case 'Rejected': return 'var(--danger-color)';
            case 'Returned': return 'var(--warning-color)';
            default: return 'var(--text-muted)';
        }
    }

    fetchContingentBills();
});
