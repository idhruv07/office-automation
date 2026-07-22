// public/repository/js/document-core.js

var urlParams = new URLSearchParams(window.location.search);
var docId = urlParams.get('id');
if (!docId) { window.location.href = '/repository'; }

var token = localStorage.getItem('token');

var currentPageId = null;
var currentVersion = null;
var allPages = [];
var editingPageId = null;
var editingVersion = null;
var currentUserInfo = null;
var currentWfState = null;
var autoSaveTimeout = null;
var ghostNode = null;
var isGenerating = false;
var searchMatches = [];
var searchCurrent = -1;

var pageListEl = document.getElementById('page-list');
var editorEl = document.getElementById('editor-content');
var toolbarEl = document.getElementById('toolbar');
var lockBanner = document.getElementById('lock-banner');
var versionBadge = document.getElementById('version-badge');

var btnEdit = document.getElementById('btn-edit');
var btnSave = document.getElementById('btn-save');
var btnCancel = document.getElementById('btn-cancel');
var btnHistory = document.getElementById('btn-history');

// Document Workflow Routing Logic
var wfStatusVal = document.getElementById('wf-status-val');
var wfOwnerVal = document.getElementById('wf-owner-val');
var wfCommentsInput = document.getElementById('wf-comments-input');
var wfCommentsFeed = document.getElementById('wf-comments-feed');

var wfBtnSubmit = document.getElementById('wf-btn-submit');
var wfBtnRollback = document.getElementById('wf-btn-rollback');
var wfBtnPullback = document.getElementById('wf-btn-pullback');
var wfBtnTakeover = document.getElementById('wf-btn-takeover');
var wfReturnSelectorWrap = document.getElementById('wf-return-selector-wrap');
var wfReturnTarget = document.getElementById('wf-return-target');
var wfForwardSelectorWrap = document.getElementById('wf-forward-selector-wrap');
var wfForwardTarget = document.getElementById('wf-forward-target');
var wfPageSelectorWrap = document.getElementById('wf-page-selector-wrap');
var wfPageCheckboxes = document.getElementById('wf-page-checkboxes');
var indicator = document.getElementById('auto-save-indicator');

window.initializeDocumentViewer = async function() {
    // Load All Pages — Continuous View
    try {
        const res = await fetch(`/api/repo/document/${docId}/pages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load pages');
        allPages = await res.json();
        
        await renderAllPages(allPages);
        rebuildPageNavigation();
        if (window.initTableResizer) window.initTableResizer(editorEl);
        setupScrollSpy();
        if (window.loadDocumentWorkflow) await window.loadDocumentWorkflow();
    } catch (err) {
        console.error(err);
        pageListEl.innerHTML = '<span style="color:red">Error loading</span>';
    }

    // Initialize page layout preferences on load
    setTimeout(() => {
        const savedSize = localStorage.getItem('doc_page_size') || 'a4';
        const savedOrientation = localStorage.getItem('doc_page_orientation') || 'portrait';
        const savedMargins = localStorage.getItem('doc_page_margins') || 'narrow';
        
        const selectSize = document.getElementById('select-page-size');
        const selectOrientation = document.getElementById('select-page-orientation');
        const selectMargins = document.getElementById('select-page-margins');
        
        if (selectSize) selectSize.value = savedSize;
        if (selectOrientation) selectOrientation.value = savedOrientation;
        if (selectMargins) selectMargins.value = savedMargins;
        
        window.updatePageLayout();
    }, 100);
};

async function renderAllPages(pages) {
    editorEl.innerHTML = '';
    for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        // Divider
        const divider = document.createElement('div');
        divider.className = 'page-divider';
        divider.textContent = p.title || `Page ${p.sequence_no || (i+1)}`;
        editorEl.appendChild(divider);
        
        // Fetch page content
        let htmlContent = '<i>Loading...</i>';
        try {
            const res = await fetch(`/api/repo/page/${p.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                htmlContent = data.page.html_content || '<i>Empty Page</i>';
                p._version = data.page.version;
                p._isEditable = data.is_editable;
                p._lock = data.lock;
            }
        } catch(e) { htmlContent = '<span style="color:red">Error loading</span>'; }
        
        const block = document.createElement('div');
        block.className = 'page-block';
        block.dataset.pageId = p.id;
        
        const blockContent = document.createElement('div');
        blockContent.className = 'page-block-content';
        blockContent.contentEditable = 'false';
        blockContent.innerHTML = htmlContent;
        
        block.appendChild(blockContent);
        editorEl.appendChild(block);
    }
    // highlight first page
    highlightSidebarPage(allPages[0]?.id);
}

function scrollToPage(pageId) {
    const block = editorEl.querySelector(`.page-block[data-page-id="${pageId}"]`);
    if (block) {
        block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        highlightSidebarPage(pageId);
    }
}

function highlightSidebarPage(pageId) {
    currentPageId = pageId;
    document.querySelectorAll('.page-item').forEach(el => {
        const isActive = el.dataset.pageId == pageId;
        el.classList.toggle('active', isActive);
        el.classList.toggle('in-view', false);
    });
    // Show edit/history buttons for active page
    const page = allPages.find(p => p.id == pageId);
    if (page) {
        btnHistory.style.display = 'none';
        editingVersion = page._version;
        if (page._isEditable && editorEl.querySelector('.page-block-content[contenteditable="true"]') === null) {
            btnEdit.style.display = 'inline-flex';
            btnEdit.onclick = () => window.acquireLockAndEdit(pageId, page);
        }
        if (page._lock) {
            lockBanner.style.display = 'block';
            lockBanner.innerText = `LOCKED: Being edited by ${page._lock.holder_name} (${page._lock.holder_role})`;
        } else {
            lockBanner.style.display = 'none';
        }
    }
}

function setupScrollSpy() {
    const viewer = document.getElementById('page-viewer');
    
    function updateScrollSpy() {
        // Collect all visual target elements in chronological order
        const targets = [];
        const blocks = Array.from(editorEl.querySelectorAll('.page-block'));
        blocks.forEach(block => {
            // The block start is the first visual page target
            targets.push({ element: block, pageId: block.dataset.pageId });
            // The page breaks within this block are subsequent visual page targets
            const breaks = Array.from(block.querySelectorAll('.page-block-content .pb-break'));
            breaks.forEach(pb => {
                targets.push({ element: pb, pageId: block.dataset.pageId });
            });
        });
        
        if (targets.length === 0) return;
        
        // Find the target element closest to the top of the viewer
        const viewerRect = viewer.getBoundingClientRect();
        let bestIndex = 0;
        let minDistance = Infinity;
        let bestPageId = null;
        
        targets.forEach((target, index) => {
            const rect = target.element.getBoundingClientRect();
            const distance = Math.abs(rect.top - viewerRect.top);
            if (distance < minDistance) {
                minDistance = distance;
                bestIndex = index;
                bestPageId = target.pageId;
            }
        });
        
        // Highlight the page item at the corresponding index in the sidebar page list
        const pageItems = Array.from(document.querySelectorAll('.page-item'));
        pageItems.forEach((el, index) => {
            el.classList.toggle('active', index === bestIndex);
        });
        
        if (bestPageId && bestPageId != currentPageId) {
            currentPageId = bestPageId;
            versionBadge.innerText = '';
            // Update edit button for this page
            if (editorEl.querySelector('.page-block-content[contenteditable="true"]') === null) {
                const page = allPages.find(p => p.id == bestPageId);
                btnEdit.style.display = page?._isEditable ? 'inline-flex' : 'none';
                btnEdit.onclick = () => window.acquireLockAndEdit(bestPageId, page);
                editingVersion = page?._version;
                if (page?._lock) {
                    lockBanner.style.display = 'block';
                    lockBanner.innerText = `LOCKED: Being edited by ${page._lock.holder_name}`;
                } else {
                    lockBanner.style.display = 'none';
                }
            }
        }
    }
    
    viewer.addEventListener('scroll', updateScrollSpy, { passive: true });
    updateScrollSpy();
}

window.rebuildPageNavigation = function() {
    if (!pageListEl) return;
    pageListEl.innerHTML = '';
    
    const blocks = Array.from(editorEl.querySelectorAll('.page-block'));
    let visualPageCount = 1;
    
    blocks.forEach((block) => {
        const blockId = block.dataset.pageId;
        const blockContent = block.querySelector('.page-block-content');
        if (!blockContent) return;
        
        // First page in this block
        const firstItem = document.createElement('div');
        firstItem.className = 'page-item';
        firstItem.dataset.pageId = blockId;
        firstItem.dataset.visualIndex = 0;
        firstItem.innerText = `Page ${visualPageCount}`;
        
        firstItem.onclick = () => {
            block.scrollIntoView({ behavior: 'smooth', block: 'start' });
            highlightSidebarPageItem(firstItem);
        };
        pageListEl.appendChild(firstItem);
        visualPageCount++;
        
        // Search for child page breaks inside this block content
        const pageBreaks = Array.from(blockContent.querySelectorAll('.pb-break'));
        pageBreaks.forEach((pb, pbIdx) => {
            const subItem = document.createElement('div');
            subItem.className = 'page-item page-item-sub';
            subItem.dataset.pageId = blockId;
            subItem.dataset.visualIndex = pbIdx + 1;
            subItem.innerText = `Page ${visualPageCount}`;
            
            subItem.onclick = () => {
                pb.scrollIntoView({ behavior: 'smooth', block: 'start' });
                highlightSidebarPageItem(subItem);
            };
            pageListEl.appendChild(subItem);
            visualPageCount++;
        });
    });
}

window.highlightSidebarPageItem = function(selectedEl) {
    document.querySelectorAll('.page-item').forEach(el => {
        el.classList.remove('active');
    });
    selectedEl.classList.add('active');
}

window.updatePageLayout = function() {
    const selectSize = document.getElementById('select-page-size');
    const selectOrientation = document.getElementById('select-page-orientation');
    const selectMargins = document.getElementById('select-page-margins');
    
    const size = selectSize ? selectSize.value : 'a4';
    const orientation = selectOrientation ? selectOrientation.value : 'portrait';
    const margin = selectMargins ? selectMargins.value : 'narrow';
    
    let styleEl = document.getElementById('dynamic-print-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-print-style';
        document.head.appendChild(styleEl);
    }
    
    let widthMm = 210;
    let heightMm = 297;
    
    if (size === 'letter') {
        widthMm = 215.9;
        heightMm = 279.4;
    } else if (size === 'legal') {
        widthMm = 215.9;
        heightMm = 355.6;
    }
    
    if (orientation === 'landscape') {
        const temp = widthMm;
        widthMm = heightMm;
        heightMm = temp;
    }

    let marginMm = 10; // Narrow margin by default (10mm)
    if (margin === 'none') marginMm = 0;
    else if (margin === 'compact') marginMm = 5;
    else if (margin === 'narrow') marginMm = 10;
    else if (margin === 'moderate') marginMm = 15;
    else if (margin === 'normal') marginMm = 20;
    else if (margin === 'wide') marginMm = 25;
    else if (margin === 'extra-wide') marginMm = 30;
    
    styleEl.innerHTML = `
        @media print {
            @page {
                size: ${size} ${orientation};
                margin: 0mm !important;
            }
            
            body:not(.print-all-pages) .page-block:not(:first-child) {
                display: none !important;
            }

            #sidebar, #sidebar-toggle, .no-print, .claim-action-bar, button, .btn, .theme-selector, aside,
            #toolbar, .toolbar, .toolbar-modern, .page-sidebar, #page-list, .page-divider, #lock-banner, .doc-header-wrapper,
            .main-top-bar, #footer, .breadcrumb-container, .repo-search-container, #workflow-panel, .workflow-sidebar,
            .modal-overlay, .modal-content, #global-search-results {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                opacity: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            body, html, #app-container, .main-content, main, .doc-layout, #page-viewer, .page-content-area, #editor-content {
                background: white !important;
                background-color: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
            }

            .page-block {
                border: none !important;
                box-shadow: none !important;
                margin: 0 !important;
                padding: 0 !important;
                background: transparent !important;
                page-break-after: always !important;
            }
            .page-block:last-child {
                page-break-after: avoid !important;
            }

            .page-block-content {
                width: ${widthMm}mm !important;
                max-width: ${widthMm}mm !important;
                min-height: ${heightMm}mm !important;
                padding: ${marginMm}mm !important;
                margin: 0 auto !important;
                border: none !important;
                box-shadow: none !important;
                box-sizing: border-box !important;
                color: #000000 !important;
                background: transparent !important;
                background-image: none !important;
            }

            .page-block-content::after {
                display: none !important;
                content: none !important;
            }

            .page-block:first-child .page-block-content {
                padding-top: 6mm !important;
            }

            .page-block-content h1,
            .page-block-content h2,
            .page-block-content h3,
            .page-block-content h4,
            .page-block-content h5,
            .page-block-content h6 {
                display: block !important;
                color: #000000 !important;
                background-color: transparent !important;
            }
            
            .page-block-content,
            .page-block-content * {
                color: #000000 !important;
                background-color: transparent !important;
            }
        }
        
        @media screen {
            .page-block-content {
                max-width: 100% !important;
                width: 100% !important;
                min-height: ${heightMm}mm !important;
                margin: 0 auto !important;
                background-color: white !important;
                border: 1px solid #cbd5e1 !important;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;
                padding: ${marginMm}mm !important;
                box-sizing: border-box !important;
                position: relative !important;
            }

            .page-block-content::after {
                content: '' !important;
                position: absolute !important;
                top: ${marginMm}mm !important;
                bottom: ${marginMm}mm !important;
                left: ${marginMm}mm !important;
                right: ${marginMm}mm !important;
                border: 1px dashed rgba(59, 130, 246, 0.4) !important;
                pointer-events: none !important;
                z-index: 1 !important;
            }

            .page-block:first-child .page-block-content {
                padding-top: 6mm !important;
            }
            .page-block:first-child .page-block-content::after {
                top: 6mm !important;
            }
            .page-block:first-child .fwd-letterhead {
                margin-bottom: 12px !important;
            }
        }
    `;
    
    localStorage.setItem('doc_page_size', size);
    localStorage.setItem('doc_page_orientation', orientation);
    localStorage.setItem('doc_page_margins', margin);
};
