const db = require('../config/repo_db');
const { JSDOM } = require('jsdom');

// Check if jsdom is available first
let jsdomAvailable = false;
try {
    require.resolve('jsdom');
    jsdomAvailable = true;
} catch(e) {}

(async () => {
    try {
        const res = await db.query('SELECT html_content FROM document_pages WHERE id = 183');
        const html = res.rows[0].html_content;

        // Custom HTML cleaner without jsdom
        function cleanGoogleDocHtml(html) {
            let clean = html;
            
            // Remove data-* attributes used by Google Docs JS controllers
            clean = clean.replace(/\s*data-sfc-cp="[^"]*"/gi, '');
            clean = clean.replace(/\s*jsaction="[^"]*"/gi, '');
            clean = clean.replace(/\s*jscontroller="[^"]*"/gi, '');
            clean = clean.replace(/\s*data-sfc-root="[^"]*"/gi, '');
            clean = clean.replace(/\s*jsuid="[^"]*"/gi, '');
            clean = clean.replace(/\s*data-complete="[^"]*"/gi, '');
            clean = clean.replace(/\s*data-processed="[^"]*"/gi, '');
            clean = clean.replace(/\s*data-hveid="[^"]*"/gi, '');
            clean = clean.replace(/\s*data-sfc-inited="[^"]*"/gi, '');
            clean = clean.replace(/\s*data-copy-service-computed-style="[^"]*"/gi, '');
            clean = clean.replace(/\s*data-animation-nesting="[^"]*"/gi, '');
            clean = clean.replace(/\s*data-sae="[^"]*"/gi, '');
            clean = clean.replace(/\s*aria-owns="[^"]*"/gi, '');
            clean = clean.replace(/\s*data-ved="[^"]*"/gi, '');
            
            // Remove Google HTML comments like <!--TgQPHd|||[]-->
            clean = clean.replace(/<!--TgQPHd\|\|\|\[.*?\]-->/gi, '');
            
            // Strip Google Docs specific class names from divs (keep the div, just clean class)
            // Replace n6owBd awi2gc divs with plain divs (but keep inline styles)
            clean = clean.replace(/<div class="n6owBd awi2gc"([^>]*)>/gi, '<div$1>');
            clean = clean.replace(/<div class="otQkpb"([^>]*)>/gi, '<div$1>');
            clean = clean.replace(/<div class="Fsg96"([^>]*)>/gi, '<div$1>');
            clean = clean.replace(/<div class="Fv6NCb"([^>]*)>/gi, '<div$1>');
            
            // Strip Google-specific class names from strong/span elements
            clean = clean.replace(/<strong class="rQesXe MPyX"([^>]*)>/gi, '<strong$1>');
            clean = clean.replace(/<span class="[A-Za-z0-9_ ]+"([^>]*)>(?=[^<]*<\/span>)/gi, '<span$1>');
            
            // Strip bloated --tw-* CSS variables from inline styles
            // Replace styles that only have --tw-* variables and no real CSS properties
            clean = clean.replace(/\s*style="([^"]*)"/gi, (match, styleContent) => {
                // Remove all --tw-* CSS variable declarations
                let cleaned = styleContent.replace(/--tw-[^:]+:[^;]+;?\s*/gi, '');
                // Remove other junk variables
                cleaned = cleaned.replace(/-webkit-font-smoothing:[^;]+;?\s*/gi, '');
                cleaned = cleaned.replace(/box-sizing: border-box;?\s*/gi, '');
                cleaned = cleaned.replace(/\s+/g, ' ').trim();
                // Remove empty or near-empty style attributes
                if (!cleaned || cleaned === ';' || cleaned.length < 3) return '';
                return ` style="${cleaned}"`;
            });
            
            // Remove table colgroup/col attributes that cause invisible rendering
            clean = clean.replace(/<col[^>]*>/gi, '<col>');
            clean = clean.replace(/<colgroup[^>]*>/gi, '<colgroup>');
            
            // Collapse multiple empty lines
            clean = clean.replace(/\n{3,}/g, '\n\n');
            clean = clean.replace(/>\s{2,}</g, '>\n<');
            
            return clean;
        }
        
        const cleaned = cleanGoogleDocHtml(html);
        
        await db.query('UPDATE document_pages SET html_content = $1 WHERE id = 183', [cleaned]);
        console.log('✅ Page 183 cleaned successfully!');
        console.log('Original size:', html.length, '→ Cleaned size:', cleaned.length);
        
        // Show what the start looks like now
        console.log('\n--- Cleaned start ---');
        console.log(cleaned.substring(0, 500));
        
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
})();
