// public/repository/js/document-search.js

const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');
const searchCount = document.getElementById('search-count');

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchBar.classList.add('visible');
        searchInput.focus();
        searchInput.select();
    }
    if (e.key === 'Escape') closeSearch();

    if ((e.key === 'Enter' || e.keyCode === 13 || e.code === 'Enter') && (e.ctrlKey || e.metaKey)) {
        const activeBlock = getActiveBlock();
        if (activeBlock) {
            e.preventDefault();
            window.insertPageBreak();
        }
    }
});

searchInput.addEventListener('input', () => {
    doSearch(searchInput.value);
});
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); searchNav(e.shiftKey ? -1 : 1); }
});

function doSearch(query) {
    editorEl.querySelectorAll('.search-highlight').forEach(el => {
        el.outerHTML = el.innerHTML;
    });
    editorEl.normalize();
    searchMatches = [];
    searchCurrent = -1;

    if (!query || query.length < 2) {
        searchCount.innerText = '0 / 0';
        return;
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    highlightTextNodes(editorEl, regex);
    searchMatches = Array.from(editorEl.querySelectorAll('.search-highlight'));
    if (searchMatches.length > 0) {
        searchCurrent = 0;
        updateCurrent();
    }
    searchCount.innerText = `${searchMatches.length > 0 ? 1 : 0} / ${searchMatches.length}`;
}

function highlightTextNodes(node, regex) {
    if (node.nodeType === 3) {
        const text = node.textContent;
        if (!regex.test(text)) return;
        regex.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let lastIndex = 0, m;
        while ((m = regex.exec(text)) !== null) {
            frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
            const mark = document.createElement('mark');
            mark.className = 'search-highlight';
            mark.textContent = m[0];
            frag.appendChild(mark);
            lastIndex = regex.lastIndex;
        }
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === 1 && node.nodeName !== 'MARK' && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
        Array.from(node.childNodes).forEach(child => highlightTextNodes(child, regex));
    }
}

window.searchNav = function(dir) {
    if (!searchMatches.length) return;
    searchCurrent = (searchCurrent + dir + searchMatches.length) % searchMatches.length;
    updateCurrent();
};

function updateCurrent() {
    searchMatches.forEach((el, i) => el.classList.toggle('current', i === searchCurrent));
    if (searchMatches[searchCurrent]) {
        searchMatches[searchCurrent].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    searchCount.innerText = `${searchCurrent + 1} / ${searchMatches.length}`;
}

window.closeSearch = function() {
    searchBar.classList.remove('visible');
    editorEl.querySelectorAll('.search-highlight').forEach(el => {
        el.outerHTML = el.innerHTML;
    });
    editorEl.normalize();
    searchMatches = [];
    searchInput.value = '';
    searchCount.innerText = '0 / 0';
}

// GLOBAL REPOSITORY SEARCH
const globalInput = document.getElementById('global-search-input');
const globalResults = document.getElementById('global-search-results');
let globalDebounce = null;

globalInput.addEventListener('input', () => {
    clearTimeout(globalDebounce);
    const q = globalInput.value.trim();
    if (q.length < 3) { globalResults.style.display = 'none'; return; }
    globalDebounce = setTimeout(() => doGlobalSearch(q), 400);
});

globalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { globalResults.style.display = 'none'; globalInput.value = ''; }
});

document.addEventListener('click', (e) => {
    if (!globalInput.contains(e.target) && !globalResults.contains(e.target)) {
        globalResults.style.display = 'none';
    }
});

async function doGlobalSearch(query) {
    globalResults.innerHTML = '<div style="padding:12px;color:#94a3b8;">Searching...</div>';
    globalResults.style.display = 'block';
    try {
        const res = await fetch(`/api/repo/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        if (!data.results || data.results.length === 0) {
            globalResults.innerHTML = '<div style="padding:12px;color:#94a3b8;">No results found.</div>';
            return;
        }
        let html = '';
        data.results.forEach(r => {
            const snippet = r.snippet.replace(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark style="background:#fbbf24;color:black;border-radius:2px;">${m}</mark>`);
            html += `<div onclick="window.location.href='/repository/document.html?id=${r.document_id}&v=${Date.now()}'" style="padding:12px;border-bottom:1px solid #334155;cursor:pointer;transition:0.15s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">
                <div style="font-weight:bold;color:#e2e8f0;font-size:13px;">${r.doc_title}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">${r.folder_path || 'Repository'}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${snippet}</div>
            </div>`;
        });
        globalResults.innerHTML = html;
    } catch (err) {
        globalResults.innerHTML = `<div style="padding:12px;color:#ef4444;">${err.message}</div>`;
    }
}
