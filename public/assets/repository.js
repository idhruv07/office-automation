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
            renderTree(currentTree, treeContainer);

            // Auto-select folder if folderId query parameter is present in URL
            const urlParams = new URLSearchParams(window.location.search);
            const folderId = urlParams.get('folderId');
            if (folderId) {
                const targetNode = treeContainer.querySelector(`.tree-node-content[data-id="${folderId}"]`);
                if (targetNode) {
                    targetNode.click();
                }
            }
        } catch (err) {
            console.error(err);
            treeContainer.innerHTML = '<span style="color:#ef4444">Error loading folders</span>';
        }
    }

    function renderTree(nodes, container, isRoot = true) {
        container.innerHTML = '';
        nodes.forEach(node => {
            const nodeEl = document.createElement('div');
            nodeEl.className = 'tree-node';
            
            const contentEl = document.createElement('div');
            contentEl.className = 'tree-node-content';
            contentEl.dataset.id = node.id;
            contentEl.innerHTML = `<span class="tree-icon">📁</span><span>${node.name}</span>`;
            
            // Drag and Drop
            if (canManageFolders) {
                // Add delete button
                const actionsSpan = document.createElement('span');
                actionsSpan.style.marginLeft = 'auto';
                actionsSpan.innerHTML = `<span class="folder-del-btn" style="cursor:pointer; opacity:0.5;" title="Delete empty folder">🗑️</span>`;
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
                document.querySelectorAll('.tree-node-content').forEach(el => el.classList.remove('selected'));
                contentEl.classList.add('selected');
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
                    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 16px;">
                        <h3 style="color:white; margin:0;">${folderName}</h3>
                    </div>
                    <div style="color: #94a3b8; text-align:center; margin-top:40px;">No documents in this folder.</div>
                `;
                return;
            }

            let html = `
                <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 16px; margin-bottom: 16px; display: flex; justify-content: space-between;">
                    <h3 style="color:white; margin:0;">${folderName}</h3>
                </div>
                <div class="doc-list">
            `;
            
            docs.forEach(doc => {
                const dateStr = doc.latest_page_date ? new Date(doc.latest_page_date).toLocaleDateString() : 'Unknown';
                html += `
                    <div class="doc-item">
                        <div class="doc-info">
                            <h4>${doc.title}</h4>
                            <div class="doc-meta">Ref: ${doc.reference_no} • ${doc.page_count} Pages • Last Updated: ${dateStr}</div>
                        </div>
                        <button class="btn-primary" style="padding: 6px 12px; font-size:12px;" onclick="viewDocument(${doc.id})">View Pages</button>
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
                    <div class="search-result-item" onclick="window.location.href='/repository/document.html?id=${r.document_id}'">
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
});
