const fs = require('fs-extra');
const path = require('path');

const storageDir = path.join(__dirname, '..', 'server', 'storage');

const overrides = `
@media print {
    /* Firefox border and field line printer optimization */
    table, th, td, 
    .mrc-compact table, .mrc-compact table th, .mrc-compact table td,
    .gpf-final-table, .gpf-final-table th, .gpf-final-table td,
    .ltc-compact table, .ltc-compact table th, .ltc-compact table td,
    .td-compact table, .td-compact table th, .td-compact table td,
    .cb-exp-table, .cb-exp-table th, .cb-exp-table td,
    .cb-pay-table, .cb-pay-table th, .cb-pay-table td {
        border: 1.5px solid #000000 !important;
        border-collapse: collapse !important;
    }

    input, select, textarea,
    .mrc-compact input, .mrc-compact select, .mrc-compact textarea,
    .no-border-input, .gpf-final-uline, .ltc-compact input, .td-compact input {
        border: none !important;
        border-bottom: 1.5px solid #000000 !important;
        background: transparent !important;
    }

    /* Support dashed/dotted input lines and ensure they render solid black in Firefox print preview */
    .gpf-final-uline, .gpf-uline, [class*="uline"], [class*="underline"] {
        border-bottom: 1.5px solid #000000 !important;
    }
}
`;

async function walk(dir) {
    let files = [];
    const list = await fs.readdir(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = await fs.stat(fullPath);
        if (stat && stat.isDirectory()) {
            files = files.concat(await walk(fullPath));
        } else if (file.endsWith('.html') && !file.includes('template.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

async function run() {
    if (!await fs.pathExists(storageDir)) {
        console.log('Storage directory not found:', storageDir);
        return;
    }
    console.log('Scanning for storage claims HTML files in:', storageDir);
    const files = await walk(storageDir);
    console.log(`Found ${files.length} HTML files.`);
    
    let patchedCount = 0;
    for (const file of files) {
        let content = await fs.readFile(file, 'utf8');
        if (content.includes('/* Firefox border and field line printer optimization */')) {
            continue;
        }

        const headStyleClose = content.indexOf('</style>');
        if (headStyleClose !== -1) {
            content = content.slice(0, headStyleClose) + overrides + content.slice(headStyleClose);
            await fs.writeFile(file, content, 'utf8');
            patchedCount++;
        }
    }
    console.log(`Successfully patched ${patchedCount} claims HTML files.`);
}

run().catch(console.error);
