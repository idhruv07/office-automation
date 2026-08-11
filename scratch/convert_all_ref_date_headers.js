const db = require('../config/repo_db');

(async () => {
    try {
        const res = await db.query('SELECT id, document_id, html_content FROM document_pages WHERE html_content ILIKE \'%&nbsp;%\' OR html_content ILIKE \'%Dated%\' OR html_content ILIKE \'%Dt:%\'');
        console.log(`Found ${res.rows.length} candidate pages to check...`);

        let fixedCount = 0;

        for (const row of res.rows) {
            let html = row.html_content;
            if (!html) continue;

            let modified = false;

            // Pattern 1: Paragraphs/divs with &nbsp; padding between left text (No./Ref/DO) and right date (Dated/Dt/Date)
            const newHtml = html.replace(/<(div|p|strong|span)[^>]*>\s*([^\n<]+?)(?:&nbsp;|\s){3,}(Dated[\.:]|Date[\.:]|Dt[\.:])\s*(?:&nbsp;|\s)*([^\n<]+?)\s*<\/\1>/gi, (match, tag, left, dateLabel, dateVal) => {
                const cleanLeft = left.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                const cleanDateLabel = dateLabel.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                const cleanDateVal = dateVal.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                
                // Only convert if left has a reference indicator or non-empty string
                if (cleanLeft.length > 0 && cleanDateVal.length > 0) {
                    modified = true;
                    return `<div class="doc-ref-date-row" style="display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; flex-wrap: nowrap !important; margin: 10px 0 14px 0;"><strong>${cleanLeft}</strong><strong>${cleanDateLabel} ${cleanDateVal}</strong></div>`;
                }
                return match;
            });

            if (modified) {
                await db.query('UPDATE document_pages SET html_content = $1 WHERE id = $2', [newHtml, row.id]);
                fixedCount++;
                console.log(`Updated Page ID ${row.id} (Doc ID ${row.document_id})`);
            }
        }

        console.log(`\n🎉 Done! Converted ${fixedCount} pages in database.`);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
