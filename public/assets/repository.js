document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }

    // Decode JWT payload to check permissions
    const payload = JSON.parse(atob(token.split('.')[1]));
    const canManageFolders = payload.roleCode === 'SYSADMIN' || payload.rank <= 8;

    const treeContainer = document.getElementById('folder-tree');
    const docContainer = document.getElementById('document-list-container');
    const newFolderBtn = document.getElementById('new-folder-btn');
    
    let currentTree = [];
    let draggedFolderId = null;

    if (canManageFolders) {
        newFolderBtn.style.display = 'block';
    }

    async function loadTree() {
        try {
            const res = await fetch('/api/repo/tree', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load tree');
            currentTree = await res.json();
            
            // Render root "Recent Documents" node
            treeContainer.innerHTML = '';
            const recentNode = document.createElement('div');
            recentNode.className = 'tree-node';
            recentNode.innerHTML = `
                <div class="tree-node-content selected" id="recent-docs-tree-node">
                    <span class="tree-icon-container">
                        <svg class="tree-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
                            <path d="M12 8V12L15 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
                            <circle cx="12" cy="12" r="9" stroke="white" stroke-width="2"/>
                        </svg>
                    </span>
                    <span>Recent Documents</span>
                </div>
            `;
            recentNode.querySelector('.tree-node-content').addEventListener('click', () => {
                document.querySelectorAll('.tree-node-content').forEach(el => {
                    el.classList.remove('selected');
                    const iconSpan = el.querySelector('.tree-icon-container');
                    if (iconSpan && el.id !== 'recent-docs-tree-node') {
                        iconSpan.innerHTML = getFolderIconSvg(false);
                    }
                });
                const contentEl = recentNode.querySelector('.tree-node-content');
                contentEl.classList.add('selected');
                contentEl.querySelector('.tree-icon-container').innerHTML = `
                    <svg class="tree-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
                        <path d="M12 8V12L15 15" stroke="white" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="12" cy="12" r="9" stroke="white" stroke-width="2"/>
                    </svg>
                `;
                loadRecentDocuments();
            });
            treeContainer.appendChild(recentNode);
            
            const treeRoot = document.createElement('div');
            treeContainer.appendChild(treeRoot);
            renderTree(currentTree, treeRoot);

            // Auto-select folder if folderId query parameter is present in URL
            const urlParams = new URLSearchParams(window.location.search);
            const folderId = urlParams.get('folderId');
            if (folderId) {
                const targetNode = treeContainer.querySelector(`.tree-node-content[data-id="${folderId}"]`);
                if (targetNode) {
                    recentNode.querySelector('.tree-node-content').classList.remove('selected');
                    recentNode.querySelector('.tree-icon-container').innerHTML = `
                        <svg class="tree-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
                            <path d="M12 8V12L15 15" stroke="var(--primary-color, #38bdf8)" stroke-width="2" stroke-linecap="round"/>
                            <circle cx="12" cy="12" r="9" stroke="var(--primary-color, #38bdf8)" stroke-width="2"/>
                        </svg>
                    `;
                    targetNode.click();
                }
            } else {
                loadRecentDocuments();
            }
        } catch (err) {
            console.error(err);
            treeContainer.innerHTML = '<span style="color:#ef4444">Error loading folders</span>';
        }
    }

    function getFolderIconSvg(isSelected = false) {
        const color = isSelected ? '#ffffff' : 'var(--primary-color, #38bdf8)';
        return `
            <svg class="tree-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px; transition: transform 0.2s;">
                <path d="M19 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4H10L12 6H19C20.1046 6 21 6.89543 21 8V18C21 19.1046 20.1046 20 19 20Z" 
                      stroke="${color}" stroke-width="2" fill="${isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(56,189,248,0.06)'}" stroke-linejoin="round"/>
            </svg>
        `;
    }

    function renderTree(nodes, container, isRoot = true) {
        container.innerHTML = '';
        nodes.forEach(node => {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'tree-node';
            
            const contentEl = document.createElement('div');
            contentEl.className = 'tree-node-content';
            contentEl.dataset.id = node.id;
            contentEl.innerHTML = `<span class="tree-icon-container">${getFolderIconSvg(false)}</span><span>${node.name}</span>`;
            
            // Drag and Drop
            if (canManageFolders) {
                // Add delete button
                const actionsSpan = document.createElement('span');
                actionsSpan.style.marginLeft = 'auto';
                actionsSpan.innerHTML = `<span class="folder-del-btn" style="cursor:pointer; opacity:0.5; padding: 2px 6px;" title="Delete empty folder">🗑️</span>`;
                contentEl.appendChild(actionsSpan);

                actionsSpan.querySelector('.folder-del-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if(confirm(`Are you sure you want to delete the folder "${node.name}"? Only empty folders can be deleted.`)) {
                        await deleteFolder(node.id);
                    }
                });

                contentEl.draggable = true;
                contentEl.addEventListener('dragstart', (e) => {
                    draggedFolderId = node.id;
                    e.dataTransfer.effectAllowed = 'move';
                });
                
                contentEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (draggedFolderId != node.id) {
                        contentEl.classList.add('drag-over');
                    }
                });
                
                contentEl.addEventListener('dragleave', () => {
                    contentEl.classList.remove('drag-over');
                });
                
                contentEl.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    contentEl.classList.remove('drag-over');
                    if (draggedFolderId && draggedFolderId != node.id) {
                        await moveFolder(draggedFolderId, node.id);
                    }
                });
            }

            contentEl.addEventListener('click', () => {
                document.querySelectorAll('.tree-node-content').forEach(el => {
                    el.classList.remove('selected');
                    const iconSpan = el.querySelector('.tree-icon-container');
                    if (iconSpan) {
                        if (el.id === 'recent-docs-tree-node') {
                            iconSpan.innerHTML = `
                                <svg class="tree-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-right: 8px;">
                                    <path d="M12 8V12L15 15" stroke="var(--primary-color, #38bdf8)" stroke-width="2" stroke-linecap="round"/>
                                    <circle cx="12" cy="12" r="9" stroke="var(--primary-color, #38bdf8)" stroke-width="2"/>
                                </svg>
                            `;
                        } else {
                            iconSpan.innerHTML = getFolderIconSvg(false);
                        }
                    }
                });
                contentEl.classList.add('selected');
                const activeIconSpan = contentEl.querySelector('.tree-icon-container');
                if (activeIconSpan) activeIconSpan.innerHTML = getFolderIconSvg(true);
                loadDocuments(node.id, node.name);
            });

            nodeEl.appendChild(contentEl);

            if (node.children && node.children.length > 0) {
                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-children';
                renderTree(node.children, childrenContainer, false);
                nodeEl.appendChild(childrenContainer);
            }
            
            container.appendChild(nodeEl);
        });
    }

    async function moveFolder(folderId, newParentId) {
        try {
            const res = await fetch(`/api/repo/folder/${folderId}/move`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ parent_id: newParentId })
            });
            if (res.ok) {
                loadTree(); // Reload tree
            } else {
                const data = await res.json();
                alert('Move failed: ' + data.message);
            }
        } catch (err) {
            console.error('Error moving folder', err);
        }
    }

    async function deleteFolder(folderId) {
        try {
            const res = await fetch(`/api/repo/folder/${folderId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadTree(); // Reload tree
            } else {
                const data = await res.json();
                alert('Delete failed: ' + data.message);
            }
        } catch (err) {
            console.error('Error deleting folder', err);
        }
    }

    async function loadDocuments(folderId, folderName) {
        docContainer.innerHTML = '<div style="color: #94a3b8; text-align:center; margin-top:40px;">Loading documents...</div>';
        try {
            const res = await fetch(`/api/repo/documents?folder_id=${folderId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load documents');
            const docs = await res.json();
            
            if (docs.length === 0) {
                docContainer.innerHTML = `
                    <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 18px; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 11px; color: var(--primary-color, #38bdf8); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Directory</span>
                            <span style="color: rgba(255,255,255,0.3); font-size: 11px;">/</span>
                            <h3 style="color:white; margin:0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">${folderName}</h3>
                        </div>
                    </div>
                    <div style="color: #94a3b8; text-align:center; margin-top:40px;">No documents in this folder.</div>
                `;
                return;
            }

            let html = `
                <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 18px; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 11px; color: var(--primary-color, #38bdf8); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Directory</span>
                        <span style="color: rgba(255,255,255,0.3); font-size: 11px;">/</span>
                        <h3 style="color:white; margin:0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">${folderName}</h3>
                    </div>
                </div>
                <div class="modern-file-grid">
            `;
            
            docs.forEach(doc => {
                const dateStr = doc.latest_page_date ? new Date(doc.latest_page_date).toLocaleDateString() : 'Unknown';
                html += `
                    <div class="file-card" onclick="viewDocument(${doc.id})">
                        <div class="file-card-top">
                            <div class="file-icon-wrapper">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" 
                                          stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                                    <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                                    <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <div class="file-badge">${doc.page_count} pgs</div>
                        </div>
                        <div class="file-card-info">
                            <h4 class="file-title" title="${doc.title}">${doc.title}</h4>
                            <div class="file-meta">
                                <span class="meta-label">Ref:</span>
                                <span class="meta-value">${doc.reference_no || '—'}</span>
                            </div>
                            <div class="file-card-footer">
                                <span class="file-date">📅 ${dateStr}</span>
                                <span class="file-action-indicator">Open →</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            docContainer.innerHTML = html;
        } catch (err) {
            console.error(err);
            docContainer.innerHTML = '<span style="color:#ef4444">Error loading documents</span>';
        }
    }

    async function loadRecentDocuments() {
        docContainer.innerHTML = '<div style="color: #94a3b8; text-align:center; margin-top:40px;">Loading recent documents...</div>';
        try {
            const res = await fetch('/api/repo/documents/recent', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load recent documents');
            const docs = await res.json();
            
            if (docs.length === 0) {
                docContainer.innerHTML = `
                    <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 18px; margin-bottom: 24px;">
                        <h3 style="color:white; margin:0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">Recent Documents</h3>
                    </div>
                    <div style="color: #94a3b8; text-align:center; margin-top:40px;">No recent documents found.</div>
                `;
                return;
            }

            let html = `
                <div style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 18px; margin-bottom: 24px;">
                    <h3 style="color:white; margin:0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">Recent Documents</h3>
                </div>
                <div class="modern-file-grid">
            `;
            
            docs.forEach(doc => {
                const dateStr = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'Unknown';
                html += `
                    <div class="file-card" onclick="viewDocument(${doc.id})">
                        <div class="file-card-top">
                            <div class="file-icon-wrapper">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" 
                                          stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                                    <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                                    <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    <path d="M10 9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </div>
                            <div class="file-badge">${doc.page_count} pgs</div>
                        </div>
                        <div class="file-card-info">
                            <h4 class="file-title" title="${doc.title}">${doc.title}</h4>
                            <div class="file-meta">
                                <span class="meta-label">Ref/Subject:</span>
                                <span class="meta-value" title="${doc.reference_no || '—'}">${doc.reference_no || '—'}</span>
                            </div>
                            <div class="file-card-footer">
                                <span class="file-date">📁 ${doc.folder_name || 'Root'}</span>
                                <span class="file-date">📅 ${dateStr}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            docContainer.innerHTML = html;
        } catch (err) {
            console.error(err);
            docContainer.innerHTML = '<span style="color:#ef4444">Error loading recent documents</span>';
        }
    }

    window.viewDocument = function(docId) {
        window.location.href = `/repository/document.html?id=${docId}`;
    };

    // Global Search Functionality
    const globalInput = document.getElementById('global-search-input');
    const globalResults = document.getElementById('global-search-results');
    let globalDebounce = null;

    if (globalInput && globalResults) {
        globalInput.addEventListener('input', () => {
            clearTimeout(globalDebounce);
            const q = globalInput.value.trim();
            if (q.length < 3) { globalResults.style.display = 'none'; return; }
            globalDebounce = setTimeout(() => doGlobalSearch(q), 400);
        });

        // Close search results if clicked outside
        document.addEventListener('click', (e) => {
            if (!globalInput.contains(e.target) && !globalResults.contains(e.target)) {
                globalResults.style.display = 'none';
            }
        });
    }

    async function doGlobalSearch(query) {
        globalResults.innerHTML = '<div style="padding:16px;color:#94a3b8;font-size:13px;text-align:center;">Searching...</div>';
        globalResults.style.display = 'block';
        try {
            const res = await fetch(`/api/repo/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            if (!data.results || data.results.length === 0) {
                globalResults.innerHTML = '<div style="padding:16px;color:#94a3b8;font-size:13px;text-align:center;">No results found.</div>';
                return;
            }
            let html = '';
            data.results.forEach(r => {
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const snippet = r.snippet.replace(new RegExp(escapedQuery, 'gi'), m => `<span class="search-snippet-match">${m}</span>`);
                html += `
                    <div class="search-result-item" onclick="window.location.href='${r.redirect_url}'">
                        <div class="search-result-title">${r.doc_title}</div>
                        <div class="search-result-path">
                            <span style="font-size: 10px;">📁</span> ${r.folder_path || 'Repository'}
                        </div>
                        <div class="search-result-snippet">${snippet}</div>
                    </div>
                `;
            });
            globalResults.innerHTML = html;
        } catch (err) {
            globalResults.innerHTML = `<div style="padding:16px;color:#ef4444;font-size:13px;text-align:center;">${err.message}</div>`;
        }
    }

    // Initialization
    loadTree();

    // Dynamic recent documents refresh: triggered when returning from document editor
    // The editor sets 'repo_recent_refresh' in localStorage after a successful save.
    let _lastRefreshTimestamp = null;

    function checkRecentRefresh() {
        try {
            const ts = localStorage.getItem('repo_recent_refresh');
            if (ts && ts !== _lastRefreshTimestamp) {
                _lastRefreshTimestamp = ts;
                // Only refresh if the Recent Documents panel is currently active
                const recentNodeContent = document.getElementById('recent-docs-tree-node');
                if (recentNodeContent && recentNodeContent.classList.contains('selected')) {
                    loadRecentDocuments();
                }
            }
        } catch (e) { /* ignore */ }
    }

    // Listen for storage changes from the document editor (same window)
    window.addEventListener('storage', checkRecentRefresh);

    // Also re-check when the user returns to this tab after editing
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkRecentRefresh();
        }
    });
});
