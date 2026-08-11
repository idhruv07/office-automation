const db = require('../config/repo_db');

// This script does a deep clean of page 183 HTML:
// 1. Strip all remaining bloated inline styles (keep only essential visual ones)
// 2. Fix invisible divs at the top (the doc-ref-date-row contains invisible nested divs)
// 3. Ensure the fwd-letterhead and doc-ref-date-row are correct

(async () => {
    try {
        const res = await db.query('SELECT html_content FROM document_pages WHERE id = 183');
        let html = res.rows[0].html_content;
        
        // Deep clean: strip all inline styles that only contain computed/verbose css (not user-set ones)
        // Keep: font-size, font-weight, font-family, color, text-align, margin, padding, border, width, display, flex props
        html = html.replace(/\s*style="([^"]*)"/gi, (match, styleContent) => {
            // Remove verbose computed properties
            let cleaned = styleContent;
            cleaned = cleaned.replace(/border-width:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/border-style:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/border-color:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/font-style:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/font-variant-ligatures:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/font-variant-caps:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/letter-spacing:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/orphans:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/text-indent:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/text-transform:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/widows:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/word-spacing:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/-webkit-text-stroke-width:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/white-space:\s*pre-wrap;?\s*/gi, '');
            cleaned = cleaned.replace(/text-decoration-thickness:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/text-decoration-style:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/text-decoration-color:[^;]+;?\s*/gi, '');
            cleaned = cleaned.replace(/\s+/g, ' ').trim();
            if (!cleaned || cleaned === ';') return '';
            return ` style="${cleaned}"`;
        });
        
        // Fix the doc-ref-date-row: it currently has a nested invisible div with just <br>
        // Replace the whole thing with a clean flex row
        html = html.replace(/<div class="doc-ref-date-row"[^>]*>[\s\S]*?No\. ITSDC\/AN\/CGHS\/2026[\s\S]*?Dated: 11\.08\.2026[\s\S]*?<\/div>/gi,
            '<div class="doc-ref-date-row" style="display:flex;justify-content:space-between;align-items:center;width:100%;flex-wrap:nowrap;margin:10px 0 14px 0;">' +
            '<strong>No. ITSDC/AN/CGHS/2026</strong>' +
            '<strong>Dated: 11.08.2026</strong>' +
            '</div>'
        );
        
        // Remove empty divs at top (divs that contain only whitespace, <br>, or nothing)
        // Repeatedly remove leading empty blocks
        let prev = '';
        while (prev !== html) {
            prev = html;
            html = html.replace(/^(\s*<div[^>]*>\s*(<br\s*\/?>\s*)*<\/div>\s*)+/i, '');
        }
        
        // Collapse runs of <br> tags to max 2
        html = html.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
        
        // Collapse multiple blank lines
        html = html.replace(/\n{3,}/g, '\n\n');
        
        await db.query('UPDATE document_pages SET html_content = $1 WHERE id = 183', [html]);
        console.log('✅ Page 183 deep cleaned successfully!');
        console.log('Final size:', html.length);
        
        console.log('\n--- First 1000 chars ---');
        console.log(html.substring(0, 1000));
        
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
})();
