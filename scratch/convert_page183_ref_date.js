const db = require('../config/repo_db');

(async () => {
    try {
        const res = await db.query('SELECT html_content FROM document_pages WHERE id = 183');
        let html = res.rows[0].html_content;

        // Convert &nbsp;-padded ref/date blocks into clean .doc-ref-date-row flex divs
        // Match any container element containing ref no + &nbsp; + dated
        html = html.replace(/<(div|p|strong)[^>]*>\s*([^\n<]+?)(?:&nbsp;|\s){3,}(Dated[\.:]|Date[\.:]|Dt[\.:])\s*(?:&nbsp;|\s)*([^\n<]+?)\s*<\/\1>/gi, (match, tag, left, dateLabel, dateVal) => {
            const cleanLeft = left.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
            const cleanDateLabel = dateLabel.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
            const cleanDateVal = dateVal.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
            return `<div class="doc-ref-date-row" style="display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; flex-wrap: nowrap !important; margin: 10px 0 14px 0;"><strong>${cleanLeft}</strong><strong>${cleanDateLabel} ${cleanDateVal}</strong></div>`;
        });

        await db.query('UPDATE document_pages SET html_content = $1 WHERE id = 183', [html]);
        console.log('✅ Page 183 cleaned and converted!');

        const res2 = await db.query('SELECT html_content FROM document_pages WHERE id = 183');
        console.log('\n--- Page 183 start ---');
        console.log(res2.rows[0].html_content.substring(0, 1000));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
})();
