const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'repo_db', password: 'postgrespassword', port: 5433 });

async function run() {
    const client = await pool.connect();
    try {
        // 1. Remove all pending/failed/retry PPT jobs from queue
        const qRes = await client.query(`
            DELETE FROM pgboss.job
            WHERE name = 'document-import'
            AND state IN ('created', 'retry', 'failed')
            AND (data->>'originalName' ILIKE '%.ppt' OR data->>'originalName' ILIKE '%.pptx')
        `);
        console.log(`Removed ${qRes.rowCount} pending PPT jobs from queue.`);

        // 2. Find all document IDs that are PPTs
        const pptDocs = await client.query(`
            SELECT id, folder_id FROM documents
            WHERE LOWER(title) LIKE '%.ppt'
               OR LOWER(title) LIKE '%.pptx'
               OR LOWER(title) LIKE '%ppt'
               OR LOWER(title) LIKE '%pptx'
        `);
        console.log(`Found ${pptDocs.rowCount} PPT documents in DB.`);

        if (pptDocs.rowCount > 0) {
            const pptDocIds = pptDocs.rows.map(r => r.id);

            // Delete related page_embeddings
            const emRes = await client.query(
                `DELETE FROM page_embeddings WHERE page_id IN (
                    SELECT id FROM document_pages WHERE document_id = ANY($1)
                )`, [pptDocIds]
            );
            console.log(`Deleted ${emRes.rowCount} embeddings for PPT pages.`);

            // Delete related document_pages
            const dpRes = await client.query(
                `DELETE FROM document_pages WHERE document_id = ANY($1)`,
                [pptDocIds]
            );
            console.log(`Deleted ${dpRes.rowCount} document_pages for PPTs.`);

            // Delete the PPT documents themselves
            const dRes = await client.query(
                `DELETE FROM documents WHERE id = ANY($1)`,
                [pptDocIds]
            );
            console.log(`Deleted ${dRes.rowCount} PPT documents from documents table.`);
        }

        // 3. Find and remove folder_nodes that are now completely empty
        let totalFoldersRemoved = 0;
        let pass = 0;
        while (true) {
            pass++;
            const emptyFolders = await client.query(`
                SELECT id, name FROM folder_nodes fn
                WHERE NOT EXISTS (SELECT 1 FROM documents d WHERE d.folder_id = fn.id)
                  AND NOT EXISTS (SELECT 1 FROM folder_nodes child WHERE child.parent_id = fn.id)
            `);
            if (emptyFolders.rowCount === 0) break;
            const emptyIds = emptyFolders.rows.map(r => r.id);
            const names = emptyFolders.rows.map(r => r.name).join(', ');
            const fRes = await client.query(
                `DELETE FROM folder_nodes WHERE id = ANY($1)`, [emptyIds]
            );
            console.log(`Pass ${pass}: Removed ${fRes.rowCount} empty folder(s): ${names}`);
            totalFoldersRemoved += fRes.rowCount;
        }
        console.log(`Total empty folders removed: ${totalFoldersRemoved}`);

        // Final queue state
        const counts = await client.query('SELECT state, count(*) FROM pgboss.job GROUP BY state');
        const docCount = await client.query('SELECT count(*) FROM documents');
        console.log('\nFinal queue:', JSON.stringify(counts.rows, null, 2));
        console.log('Remaining documents in DB:', docCount.rows[0].count);

    } finally {
        client.release();
        pool.end();
    }
}

run().catch(console.error);
