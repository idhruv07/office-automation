const db = require('../config/repo_db');

(async () => {
    try {
        console.log('Fetching Page 183...');
        const page183 = await db.query('SELECT id, html_content FROM document_pages WHERE id = 183');
        if (page183.rows.length > 0) {
            let html = page183.rows[0].html_content;
            console.log('Page 183 original length:', html.length);
            
            // Replace the date block with flex container
            const updatedHtml = html.replace(
                /<div class="n6owBd awi2gc"[\s\S]*?Dated: 11\.08\.2026[\s\S]*?<\/div>/gi,
                '<div class="doc-ref-date-row" style="display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; flex-wrap: nowrap !important; margin: 12px 0 16px 0;"><strong>No. ITSDC/AN/CGHS/2026</strong><strong>Dated: 11.08.2026</strong></div>'
            );

            await db.query('UPDATE document_pages SET html_content = $1 WHERE id = 183', [updatedHtml]);
            console.log('✅ Page 183 updated successfully!');
        }

        console.log('Fetching Page 184...');
        const page184 = await db.query('SELECT id, html_content FROM document_pages WHERE id = 184');
        if (page184.rows.length > 0) {
            let html = page184.rows[0].html_content;
            console.log('Page 184 original length:', html.length);
            
            const updatedHtml = html.replace(
                /<p>\s*No:\s*IT&amp;SDC\/Estt\/Vol-VII[\s\S]*?Dt:\s*18\.02\.2026\s*<\/p>/gi,
                '<div class="doc-ref-date-row" style="display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; flex-wrap: nowrap !important; margin: 12px 0 16px 0;"><strong>No: IT&amp;SDC/Estt/Vol-VII</strong><strong>Dt: 18.02.2026</strong></div>'
            );

            await db.query('UPDATE document_pages SET html_content = $1 WHERE id = 184', [updatedHtml]);
            console.log('✅ Page 184 updated successfully!');
        }
    } catch (err) {
        console.error('Error updating pages:', err);
    }
    process.exit(0);
})();
