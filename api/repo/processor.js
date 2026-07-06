const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const DOMPurify = require('dompurify');

function processHtml(htmlContent, storagePath = 'D:\\Office Automation\\public\\storage\\shared_assets') {
    // 1. Sanitize
    const window = new JSDOM('').window;
    const purify = DOMPurify(window);
    let safeHtml = purify.sanitize(htmlContent, {
        ADD_TAGS: ['hr', 'img'],
        ADD_ATTR: ['class', 'style', 'src', 'alt', 'onerror']
    });

    // 2. Parse into DOM
    const dom = new JSDOM(safeHtml);
    const document = dom.window.document;

    // 3. Process Images (Base64 -> Hash -> File)
    const images = document.querySelectorAll('img[src^="data:image/"]');
    const processedAssets = [];

    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    images.forEach(img => {
        const dataUrl = img.getAttribute('src');
        const matches = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
        
        if (matches) {
            const ext = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Hash it
            const hash = crypto.createHash('sha256').update(buffer).digest('hex');
            const fileName = `${hash}.${ext}`;
            const diskPath = path.join(storagePath, fileName);
            
            if (!fs.existsSync(diskPath)) {
                fs.writeFileSync(diskPath, buffer);
            }
            
            const publicUrl = `/storage/shared_assets/${fileName}`;
            img.setAttribute('src', publicUrl);
            
            processedAssets.push({
                hash,
                fileName,
                publicUrl,
                diskPath
            });
        }
    });

    // 4. Split by page boundaries
    // We inserted <hr style="border-top: 3px dashed #ccc; margin: 40px 0;" class="page-split-marker" />
    
    // An easy way to split the HTML string is just by finding that exact tag, or we can use DOM.
    // DOM splitting is safer but trickier. Let's serialize back to HTML and string split.
    const finalHtml = document.body.innerHTML;
    
    // Our Mammoth parser script injected: <hr style="border-top: 3px dashed #ccc; margin: 40px 0;" class="page-split-marker" />
    // The exact serialization might change slightly, so let's regex match it.
    const splitRegex = /<hr[^>]*class="page-split-marker"[^>]*>/i;
    
    const pages = finalHtml.split(splitRegex).map(p => p.trim()).filter(p => p.length > 0);
    
    return {
        pages,
        assets: processedAssets
    };
}

module.exports = { processHtml };
