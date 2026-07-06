document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const contentDiv = document.getElementById('contingent-list-content');
    const folderListDiv = document.getElementById('folder-list');
    const resultCount = document.getElementById('result-count');
    const folderTitle = document.getElementById('current-folder-title');

    let allContingentClaims = [];
    let currentFolder = 'contingent';

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
            renderClaims('contingent'); // Show contingent by default
        } catch (err) {
            contentDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
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
            contentDiv.innerHTML = '<p style="padding: 1rem; color: #64748b;">No bills found in this folder.</p>';
            return;
        }

        contentDiv.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Claim Name</th>
                        <th>Submitted By</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(c => `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${new Date(c.updated_at || c.claim_date).toLocaleDateString()}</div>
                                <div style="font-size: 0.75rem; color: #64748b;">${new Date(c.updated_at || c.claim_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </td>
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
                                <a href="${c.file_path ? '/' + c.file_path.trim() : `/storage/${c.username}/claims/${c.folder_name ? c.folder_name + '/' : ''}${c.id}.html`}" target="_blank" style="display: block; color: #2563eb; font-weight: 700; margin-bottom: 4px; text-decoration: none;">View Claim</a>
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
