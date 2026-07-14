// public/repository/js/document-editor.js

window.getActiveBlock = function() {
    return editorEl.querySelector('.page-block-content[contenteditable="true"]');
}

window.resetEditorState = function() {
    editorEl.querySelectorAll('.page-block-content').forEach(el => el.contentEditable = 'false');
    toolbarEl.style.display = 'none';
    lockBanner.style.display = 'none';
    btnEdit.style.display = 'none';
    btnSave.style.display = 'none';
    btnCancel.style.display = 'none';
    btnHistory.style.display = 'none';
}

window.acquireLockAndEdit = async function(pageId, pageObj) {
    try {
        const res = await fetch(`/api/repo/locks/${pageId}/acquire`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.requires_confirmation) {
            const confirmMsg = `${data.message}\n\nDo you still want write access? (Rank takeover rules will apply)`;
            if (confirm(confirmMsg)) {
                const takeoverRes = await fetch(`/api/repo/locks/${pageId}/takeover`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!takeoverRes.ok) { alert('Failed to takeover lock.'); return; }
            } else { return; }
        } else if (!data.acquired) {
            alert(data.message || 'Could not acquire lock');
            return;
        }

        const block = editorEl.querySelector(`.page-block[data-page-id="${pageId}"]`);
        const blockContent = block?.querySelector('.page-block-content');
        if (!blockContent) return;

        editorEl.querySelectorAll('.page-block-content').forEach(el => el.contentEditable = 'false');

        const originalHtml = blockContent.innerHTML;

        lockBanner.style.display = 'none';
        blockContent.contentEditable = 'true';

        if (!blockContent.querySelector('.pb-break')) {
            const letterheadHtml = `
                <div class="fwd-letterhead" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin: 0 0 24px 0; color: black; font-family: sans-serif;" contenteditable="true">
                    <div class="fwd-lh-img" style="flex: 0 0 60px;"><img src="/admin/images/emblem.png" alt="Emblem" onerror="this.style.display='none'" style="height: 60px; display: block; margin: 0 auto;"></div>
                    <div class="fwd-lh-center" style="text-align: center; flex: 1; line-height: 1.25;">
                        <div class="fwd-lh-title" style="font-weight: bold; font-size: 16px; letter-spacing: 0.5px;">OFFICE OF THE CDA ( IT &amp; SDC )</div>
                        <div class="fwd-lh-sub" style="font-size: 11.5px; color: #333; margin-top: 2px;">Mornington Road, PAO(ORs)AOC Compound,</div>
                        <div class="fwd-lh-sub" style="font-size: 11.5px; color: #333;">Trimulgherry, Secunderabad – 500 015.</div>
                        <div class="fwd-lh-email" style="font-size: 10.5px; color: #555; margin-top: 1px;">Email: itsdcsec-cda@nic.in</div>
                        <div class="fwd-lh-phone" style="font-size: 10.5px; color: #555;">Phone/ Fax No: 040-27742553/29805085</div>
                    </div>
                    <div class="fwd-lh-img" style="flex: 0 0 60px;"><img src="/admin/images/azadi.png" alt="Logo Right" onerror="this.style.display='none'" style="height: 60px; display: block; margin: 0 auto;"></div>
                </div>
            `;
            blockContent.innerHTML = letterheadHtml + `<p><br></p><hr class="pb-break" />` + blockContent.innerHTML;
        }

        blockContent.focus();
        
        const pNode = blockContent.querySelector('.fwd-letterhead + p');
        if (pNode) {
            try {
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(pNode);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (err) { console.error('Failed to focus on Page 1 body', err); }
        }
        toolbarEl.style.display = 'flex';
        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        btnEdit.style.display = 'none';
        btnSave.style.display = 'block';
        btnCancel.style.display = 'block';
        editingVersion = pageObj._version;

        btnCancel.onclick = async () => {
            blockContent.innerHTML = originalHtml;
            await savePage(pageId, blockContent, true);
            await fetch(`/api/repo/locks/${pageId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
            reloadPageBlock(pageId);
            toolbarEl.style.display = 'none';
            btnSave.style.display = 'none';
            btnCancel.style.display = 'none';
            btnEdit.style.display = 'block';
            btnEdit.onclick = () => acquireLockAndEdit(pageId, pageObj);
        };

        btnSave.onclick = async () => { await savePage(pageId, blockContent, false); };

        blockContent.addEventListener('input', () => {
            if (blockContent.contentEditable !== 'true') return;
            indicator.style.display = 'inline';
            indicator.style.color = '#f59e0b';
            indicator.innerText = 'Unsaved changes...';
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(async () => {
                indicator.innerText = 'Saving...';
                await savePage(pageId, blockContent, true);
                indicator.style.color = '#10b981';
                indicator.innerText = 'Saved';
                setTimeout(() => { if(indicator.innerText==='Saved') indicator.style.display='none'; }, 2000);
            }, 2000);
        });

    } catch (err) {
        console.error(err);
        alert('Error acquiring lock');
    }
};

async function reloadPageBlock(pageId) {
    const block = editorEl.querySelector(`.page-block[data-page-id="${pageId}"]`);
    const blockContent = block?.querySelector('.page-block-content');
    if (!blockContent) return;
    try {
        const res = await fetch(`/api/repo/page/${pageId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            blockContent.innerHTML = data.page.html_content || '<i>Empty Page</i>';
            blockContent.contentEditable = 'false';
            const page = allPages.find(p => p.id == pageId);
            if (page) { page._version = data.page.version; page._lock = data.lock; }
            editingVersion = data.page.version;
            versionBadge.innerText = `v${data.page.version}`;
        }
    } catch(e) { console.error(e); }
}

async function savePage(pageId, blockContent, silent = false) {
    const html = blockContent ? blockContent.innerHTML : '';
    const version = editingVersion;
    
    try {
        const res = await fetch(`/api/repo/page/${pageId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                html_content: html,
                base_version: version
            })
        });

        const data = await res.json();
        
        if (res.status === 409) {
            if (!silent) alert(data.message);
            reloadPageBlock(pageId);
            toolbarEl.style.display = 'none';
            btnSave.style.display = 'none';
            btnCancel.style.display = 'none';
        } else if (res.ok) {
            if (silent) {
                editingVersion = data.new_version || (version + 1);
            } else {
                editingVersion = data.new_version || (version + 1);
                versionBadge.innerText = `v${editingVersion}`;
                const page = allPages.find(p => p.id == pageId);
                if (page) page._version = editingVersion;
                if (!silent) {
                    await fetch(`/api/repo/locks/${pageId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (blockContent) blockContent.contentEditable = 'false';
                    toolbarEl.style.display = 'none';
                    btnSave.style.display = 'none';
                    btnCancel.style.display = 'none';
                    btnEdit.style.display = 'block';
                    const p = allPages.find(pg => pg.id == pageId);
                    btnEdit.onclick = () => acquireLockAndEdit(pageId, p);
                    indicator.style.color = '#10b981';
                    indicator.innerText = 'Saved ✓';
                    indicator.style.display = 'inline';
                    setTimeout(() => { indicator.style.display='none'; }, 3000);
                }
            }
            if (window.rebuildPageNavigation) window.rebuildPageNavigation();
        } else {
            if (!silent) alert('Error saving: ' + data.message);
        }
    } catch (err) {
        console.error(err);
        if (!silent) alert('Fatal error saving page');
    }
}

btnHistory.onclick = async () => {
    document.getElementById('history-modal').style.display = 'flex';
    const histList = document.getElementById('history-list');
    histList.innerHTML = 'Loading...';

    try {
        const res = await fetch(`/api/repo/page/${currentPageId}/versions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const versions = await res.json();
        
        window.loadedPageVersions = versions;
        
        if (versions.length === 0) {
            histList.innerHTML = '<div>No history available.</div>';
            return;
        }

        let html = '';
        versions.forEach(v => {
            const date = v.edited_at ? new Date(v.edited_at).toLocaleString() : 'Initial Seed';
            html += `
                <div class="version-row">
                    <div>
                        <strong style="color:var(--primary-color)">v${v.version}</strong> • ${date}<br>
                        <span style="font-size:12px; color:#cbd5e1">By ${v.editor_name || 'System'}</span><br>
                        <span style="font-size:12px; color:#10b981">${v.diff_summary || ''}</span>
                    </div>
                    <button style="background: #38bdf8; color: #0f172a; border: none; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: bold; cursor: pointer;" onclick="viewRawVersion(${v.id})">View & Compare</button>
                </div>
            `;
        });
        histList.innerHTML = html;
    } catch (err) {
        console.error(err);
        histList.innerHTML = '<span style="color:red">Error loading history</span>';
    }
};

function computeDiffHTML(oldStr, newStr) {
    const oldDiv = document.createElement('div');
    oldDiv.innerHTML = oldStr;
    const oldWords = oldDiv.innerText.split(/\s+/).filter(Boolean);

    const newDiv = document.createElement('div');
    newDiv.innerHTML = newStr;
    const newWords = newDiv.innerText.split(/\s+/).filter(Boolean);

    const dp = Array(oldWords.length + 1).fill(null).map(() => Array(newWords.length + 1).fill(0));
    for (let i = 1; i <= oldWords.length; i++) {
        for (let j = 1; j <= newWords.length; j++) {
            if (oldWords[i-1] === newWords[j-1]) {
                dp[i][j] = dp[i-1][j-1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
            }
        }
    }

    let i = oldWords.length;
    let j = newWords.length;
    const diffOld = [];
    const diffNew = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldWords[i-1] === newWords[j-1]) {
            diffOld.unshift(oldWords[i-1]);
            diffNew.unshift(newWords[j-1]);
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
            diffNew.unshift(`<mark style="background:#bbf7d0; color:#15803d; border-radius:3px; padding:0 3px; font-weight:bold;">${newWords[j-1]}</mark>`);
            j--;
        } else if (i > 0 && (j === 0 || dp[i-1][j] > dp[i][j-1])) {
            diffOld.unshift(`<mark style="background:#fecaca; color:#b91c1c; border-radius:3px; padding:0 3px; text-decoration:line-through;">${oldWords[i-1]}</mark>`);
            i--;
        }
    }

    return {
        historical: diffOld.join(' '),
        live: diffNew.join(' ')
    };
}

window.viewRawVersion = function(id) {
    if (!window.loadedPageVersions) return;
    const v = window.loadedPageVersions.find(item => item.id == id);
    if (!v) return;

    const activeBlockWrapper = editorEl.querySelector(`.page-block[data-page-id="${currentPageId}"]`);
    const blockContent = activeBlockWrapper ? activeBlockWrapper.querySelector('.page-block-content') : null;
    const currentHtml = blockContent ? blockContent.innerHTML : '';
    
    const diff = computeDiffHTML(v.html_content || '', currentHtml || '');

    document.getElementById('diff-historical-content').innerHTML = diff.historical || '<i>Empty Page</i>';
    document.getElementById('diff-live-content').innerHTML = diff.live || '<i>Empty Editor</i>';
    
    document.getElementById('diff-modal').style.display = 'flex';
    
    document.getElementById('btn-restore-version').onclick = async () => {
        if (confirm(`Are you sure you want to restore Version v${v.version} contents into the editor? This will overwrite the current live block content.`)) {
            if (blockContent) {
                blockContent.innerHTML = v.html_content;
                await savePage(currentPageId, blockContent, false);
            }
            document.getElementById('diff-modal').style.display = 'none';
            document.getElementById('history-modal').style.display = 'none';
        }
    };
};

editorEl.addEventListener('keydown', async (e) => {
    const activeBlock = getActiveBlock();
    if (!activeBlock) return;

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        window.insertPageBreak();
        return;
    }

    if (e.key === 'Tab') {
        e.preventDefault();
        if (ghostNode) {
            acceptGhostText();
        } else {
            document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
        }
        return;
    }

    if (ghostNode && e.key !== 'Control' && e.key !== 'Shift') {
        if (e.key === 'Escape') e.preventDefault();
        clearGhostText();
        if (e.key === 'Escape') return;
    }

    if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        if (isGenerating) return;
        
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        
        const preCaretRange = range.cloneRange();
        const activeBlock2 = getActiveBlock();
        if (!activeBlock2) return;
        preCaretRange.selectNodeContents(activeBlock2);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        const fullTextBefore = preCaretRange.toString();
        const contextText = fullTextBefore.slice(-500).trim();

        if (!contextText) return;

        isGenerating = true;
        
        const loadingSpan = document.createElement('span');
        loadingSpan.className = 'ai-loading';
        range.insertNode(loadingSpan);
        range.collapse(false);

        try {
            const res = await fetch('/api/repo/ai/suggest', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cursor_context: contextText,
                    page_id: currentPageId
                })
            });

            loadingSpan.remove();

            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) {
                    showGhostText(data.suggestion, range);
                }
            }
        } catch (err) {
            loadingSpan.remove();
            console.error('AI error:', err);
        } finally {
            isGenerating = false;
        }
    }
});

function showGhostText(text, range) {
    clearGhostText();
    ghostNode = document.createElement('span');
    ghostNode.className = 'ghost-text';
    ghostNode.innerText = text;
    ghostNode.contentEditable = "false";
    
    range.insertNode(ghostNode);
    
    const newRange = document.createRange();
    newRange.setStartBefore(ghostNode);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(newRange);
}

function acceptGhostText() {
    if (!ghostNode) return;
    const text = ghostNode.innerText;
    const parent = ghostNode.parentNode;
    const textNode = document.createTextNode(text);
    
    parent.replaceChild(textNode, ghostNode);
    ghostNode = null;
    
    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(newRange);
}

function clearGhostText() {
    if (ghostNode && ghostNode.parentNode) {
        ghostNode.parentNode.removeChild(ghostNode);
    }
    ghostNode = null;
}

const btnAskAi = document.getElementById('btn-ask-ai');
if (btnAskAi) {
    btnAskAi.addEventListener('mousedown', (e) => {
        if (editorEl.contentEditable === "true") e.preventDefault();
    });

    btnAskAi.addEventListener('click', async () => {
        const activeBlockAI = getActiveBlock();
        if (!activeBlockAI) {
            alert('Please click Edit Page first, then place your cursor in the document.');
            return;
        }

        const selection = window.getSelection();
        if (!selection.rangeCount) {
            alert("Please place your cursor in the editor first.");
            return;
        }
        const range = selection.getRangeAt(0);

        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(activeBlockAI);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        const fullTextBefore = preCaretRange.toString();
        const contextText = fullTextBefore.slice(-500).trim();

        const instruction = prompt('What do you want the AI to write?');
        if (!instruction) return;

        const btnOriginalText = btnAskAi.innerText;
        btnAskAi.innerText = 'Writing...';
        btnAskAi.disabled = true;

        try {
            const res = await fetch('/api/repo/ai/instruct', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cursor_context: contextText,
                    instruction: instruction
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.suggestion) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                    document.execCommand('insertHTML', false, data.suggestion);
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                alert('AI request failed: ' + (errData.message || res.statusText));
            }
        } catch (err) {
            console.error('AI instruction error:', err);
            alert('Error calling AI service');
        } finally {
            btnAskAi.innerText = btnOriginalText;
            btnAskAi.disabled = false;
        }
    });
}

function isSelectionAtStart(container) {
    try {
        const sel = window.getSelection();
        if (!sel.rangeCount) return false;
        const range = sel.getRangeAt(0);
        
        const preRange = document.createRange();
        preRange.selectNodeContents(container);
        preRange.setEnd(range.startContainer, range.startOffset);
        
        const text = preRange.toString().trim();
        const hasElements = preRange.cloneContents().childElementCount > 0;
        return text.length === 0 && !hasElements;
    } catch (e) {
        return false;
    }
}

window.insertPageBreak = function() {
    const activeBlock = getActiveBlock();
    if (!activeBlock) return;
    const blockContent = activeBlock;
    
    const letterheadHtml = `
        <div class="fwd-letterhead" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin: 0 0 24px 0; color: black; font-family: sans-serif;" contenteditable="true">
            <div class="fwd-lh-img" style="flex: 0 0 60px;"><img src="/admin/images/emblem.png" alt="Emblem" onerror="this.style.display='none'" style="height: 60px; display: block; margin: 0 auto;"></div>
            <div class="fwd-lh-center" style="text-align: center; flex: 1; line-height: 1.25;">
                <div class="fwd-lh-title" style="font-weight: bold; font-size: 16px; letter-spacing: 0.5px;">OFFICE OF THE CDA ( IT &amp; SDC )</div>
                <div class="fwd-lh-sub" style="font-size: 11.5px; color: #333; margin-top: 2px;">Mornington Road, PAO(ORs)AOC Compound,</div>
                <div class="fwd-lh-sub" style="font-size: 11.5px; color: #333;">Trimulgherry, Secunderabad – 500 015.</div>
                <div class="fwd-lh-email" style="font-size: 10.5px; color: #555; margin-top: 1px;">Email: itsdcsec-cda@nic.in</div>
                <div class="fwd-lh-phone" style="font-size: 10.5px; color: #555;">Phone/ Fax No: 040-27742553/29805085</div>
            </div>
            <div class="fwd-lh-img" style="flex: 0 0 60px;"><img src="/admin/images/azadi.png" alt="Logo Right" onerror="this.style.display='none'" style="height: 60px; display: block; margin: 0 auto;"></div>
        </div>
    `;

    if (isSelectionAtStart(blockContent)) {
        const fullHtml = letterheadHtml + `<p><br></p><hr class="pb-break" />` + blockContent.innerHTML;
        blockContent.innerHTML = fullHtml;
    } else {
        const insertHtml = `<hr class="pb-break" />` + letterheadHtml + `<p><br></p>`;
        document.execCommand('insertHTML', false, insertHtml);
    }
};

window.applyLineSpacing = function(spacingValue) {
    const activeBlock = getActiveBlock();
    if (!activeBlock) return;
    
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    
    let node = sel.anchorNode;
    if (node.nodeType === 3) node = node.parentNode;
    
    let container = sel.getRangeAt(0).commonAncestorContainer;
    if (container.nodeType === 3) container = container.parentNode;
    
    const elements = container.querySelectorAll ? Array.from(container.querySelectorAll('p, li, div, ul, ol')) : [];
    if (['P', 'LI', 'DIV', 'UL', 'OL'].includes(container.nodeName)) {
        elements.push(container);
    }
    
    if (elements.length === 0) {
         while(node && node !== activeBlock && !['P', 'LI', 'DIV', 'UL', 'OL'].includes(node.nodeName)) {
            node = node.parentNode;
         }
         if (node && node !== activeBlock) elements.push(node);
    }
    
    elements.forEach(el => {
        if (sel.containsNode(el, true) || el === container || el === node) {
            if (spacingValue === '0') {
                el.style.margin = '0px';
                el.style.padding = '0px';
                el.style.lineHeight = '1';
            } else if (spacingValue === '1.0') {
                el.style.margin = '0 0 8px 0';
                el.style.padding = '';
                el.style.lineHeight = '1.15';
            } else if (spacingValue === '1.15') {
                el.style.margin = '0 0 10px 0';
                el.style.padding = '';
                el.style.lineHeight = '1.15';
            } else if (spacingValue === '1.5') {
                el.style.margin = '0 0 12px 0';
                el.style.padding = '';
                el.style.lineHeight = '1.5';
            } else if (spacingValue === '2.0') {
                el.style.margin = '0 0 16px 0';
                el.style.padding = '';
                el.style.lineHeight = '2';
            }
        }
    });
    
    setTimeout(() => {
        const selEl = document.getElementById('line-spacing-select');
        if (selEl) selEl.value = '';
    }, 100);
};

window.addEventListener('beforeunload', () => {
    const activeBlock = getActiveBlock();
    if (activeBlock) {
        const pageId = activeBlock.closest('.page-block').dataset.pageId;
        fetch(`/api/repo/locks/${pageId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
            keepalive: true
        });
    }
});
