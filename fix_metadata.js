const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'repo_db',
  password: 'postgrespassword',
  port: 5433,
});

async function run() {
    // Only select the ones that haven't been manually fixed yet
    const res = await pool.query(`SELECT id, html_content FROM document_pages WHERE html_content LIKE '%>No. 0%'`);
    console.log(`Found ${res.rows.length} pages to process.`);

    for (const row of res.rows) {
        let html = row.html_content;

        const metaBlockPattern = /<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 20px; font-weight: bold; border-bottom: 2px solid #ccc; padding-bottom: 10px;">\s*<div style="text-align: left;">(.*?)<\/div>\s*<div style="text-align: right;">(.*?)<\/div>\s*<\/div>/gs;

        const matches = [...html.matchAll(metaBlockPattern)];

        if (matches.length >= 2) {
            const fakeBlock = matches[0][0];
            const realBlock = matches[matches.length - 1][0];
            
            if (fakeBlock.includes('No. 0')) {
                html = html.replace(fakeBlock, realBlock);
                const realBlockIndex = html.lastIndexOf(realBlock);
                if (realBlockIndex !== -1) {
                    html = html.substring(0, realBlockIndex) + html.substring(realBlockIndex + realBlock.length);
                }
                
                await pool.query('UPDATE document_pages SET html_content = $1 WHERE id = $2', [html, row.id]);
                console.log(`Fixed page ID: ${row.id}`);
            }
        } else if (matches.length === 1 && matches[0][0].includes('No. 0')) {
            html = html.replace(matches[0][0], '');
            await pool.query('UPDATE document_pages SET html_content = $1 WHERE id = $2', [html, row.id]);
            console.log(`Fixed page ID (Removed fake, no real found): ${row.id}`);
        }
    }
    console.log('Done.');
    pool.end();
}
run();
