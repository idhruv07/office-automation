const db = require('../config/repo_db');

// Full reconstruction of page 183 HTML structure
// Problem: The HTML is 317KB of bloated Google Docs HTML with invisible empty divs, bad inline styles
// Solution: Parse and rebuild a clean version preserving only the text content and minimal formatting

(async () => {
    try {
        const res = await db.query('SELECT html_content FROM document_pages WHERE id = 183');
        let html = res.rows[0].html_content;
        
        // Final pass: Remove all empty block elements that are invisible
        // Empty divs: <div ...><br></div>, <div ...></div>, <div ...> </div>
        let prev = '';
        let iterations = 0;
        while (prev !== html && iterations < 20) {
            prev = html;
            iterations++;
            // Remove divs that contain only whitespace, <br> tags, or nothing
            html = html.replace(/<div[^>]*>\s*(<br\s*\/?>\s*)*<\/div>/gi, '');
            // Remove strong/span elements that only contain a <br>
            html = html.replace(/<strong[^>]*>\s*<br\s*\/?>\s*<\/strong>/gi, '');
            html = html.replace(/<span[^>]*>\s*<br\s*\/?>\s*<\/span>/gi, '');
            // Remove divs that only have border-bottom style (Google Docs spacer)
            html = html.replace(/<div style="[^"]*border-bottom: 0px[^"]*">\s*<\/div>/gi, '');
        }
        
        // Strip border-bottom: 0px from remaining inline styles (it's invisible and just Google junk)
        html = html.replace(/\s*border-bottom:\s*0px\s*[^;]*;?\s*/gi, '');
        
        // Strip Google Fonts references (replace with system fonts)  
        html = html.replace(/font-family:\s*["']?Google Sans["']?,\s*sans-serif\s*;?/gi, 'font-family: Arial, sans-serif;');
        
        // Strip the residual empty style attrs
        html = html.replace(/\s*style="\s*"/gi, '');
        
        // Collapse runs of <br>
        html = html.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
        
        // Collapse multiple blank lines
        html = html.replace(/\n{3,}/g, '\n\n');
        
        await db.query('UPDATE document_pages SET html_content = $1 WHERE id = 183', [html]);
        console.log('✅ Page 183 final cleaned!');
        console.log('Final size:', html.length);
        
        console.log('\n--- First 1200 chars ---');
        console.log(html.substring(0, 1200));
        
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
})();
