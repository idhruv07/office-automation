const db = require('../config/repo_db');

(async () => {
    try {
        const res = await db.query('SELECT html_content FROM document_pages WHERE id = 183');
        const html = res.rows[0].html_content;

        // Write out to a temp file for inspection
        const fs = require('fs');
        fs.writeFileSync('/tmp/page183_full.html', html, 'utf8');

        // Identify problem areas
        const hasGoogleDivsAtTop = html.startsWith('<div class="n6owBd');
        const hasTwVariables = html.includes('--tw-border-spacing-y');
        const hasFwdLetterhead = html.includes('fwd-letterhead');
        const hasDocRefDateRow = html.includes('doc-ref-date-row');
        
        console.log('Starts with Google div:', hasGoogleDivsAtTop);
        console.log('Has Tailwind CSS variables:', hasTwVariables);
        console.log('Has fwd-letterhead:', hasFwdLetterhead);
        console.log('Has doc-ref-date-row:', hasDocRefDateRow);
        
        // Count top-level divs before useful content
        const lines = html.split('\n');
        console.log('\n--- First 5 lines ---');
        lines.slice(0, 5).forEach((l, i) => console.log(i + ':', l.substring(0, 100)));
        
        // Check what the start of the html is
        const idx183 = html.indexOf('No. ITSDC');
        const idx184 = html.indexOf('Dated: 11.08');
        console.log('\n--- Context around No. ITSDC ---');
        if (idx183 > -1) console.log(html.substring(Math.max(0, idx183 - 100), idx183 + 200));
        
        console.log('\n--- Context around Dated ---');
        if (idx184 > -1) console.log(html.substring(Math.max(0, idx184 - 100), idx184 + 200));
        
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
})();
