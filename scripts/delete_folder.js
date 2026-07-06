const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const connectionString = `postgres://postgres:postgrespassword@localhost:5433/repo_db`;

async function main() {
    const TARGET_FOLDER_ID = 140; // KVN_PC_Backup
    const DIRECTORY_PATH = 'D:\\Admin_Sharing\\KVN_PC_Backup';

    const client = new Client({ connectionString });
    await client.connect();

    try {
        console.log(`[Delete] Starting recursive deletion for folder ID: ${TARGET_FOLDER_ID}`);

        // 1. Get all descendant folder IDs using a recursive CTE
        const cteQuery = `
            WITH RECURSIVE descendants AS (
                SELECT id FROM folder_nodes WHERE id = $1
                UNION ALL
                SELECT f.id FROM folder_nodes f
                INNER JOIN descendants d ON f.parent_id = d.id
            )
            SELECT id FROM descendants;
        `;
        const res = await client.query(cteQuery, [TARGET_FOLDER_ID]);
        const folderIds = res.rows.map(r => r.id);

        if (folderIds.length === 0) {
            console.log(`[Delete] Folder ID ${TARGET_FOLDER_ID} not found.`);
            return;
        }

        console.log(`[Delete] Found ${folderIds.length} descendant folders.`);

        // Begin Transaction
        await client.query('BEGIN');

        // 2. Delete pg-boss jobs associated with these folders
        // pg-boss stores data in a JSONB column 'data'. We can look for data->>'folderId'
        console.log(`[Delete] Cleaning up pg-boss queue jobs...`);
        const jobsRes = await client.query(`
            DELETE FROM pgboss.job 
            WHERE data->>'folderId' IN (${folderIds.map((id, i) => `$${i+1}`).join(',')})
        `, folderIds);
        console.log(`[Delete] Removed ${jobsRes.rowCount} pg-boss jobs.`);

        // 3. Find all document IDs in these folders
        const docsRes = await client.query(`
            SELECT id FROM documents 
            WHERE folder_id = ANY($1::int[])
        `, [folderIds]);
        const docIds = docsRes.rows.map(r => r.id);
        console.log(`[Delete] Found ${docIds.length} documents to delete.`);

        if (docIds.length > 0) {
            // Find all page IDs for these documents
            const pagesRes = await client.query(`
                SELECT id FROM document_pages WHERE document_id = ANY($1::int[])
            `, [docIds]);
            const pageIds = pagesRes.rows.map(r => r.id);

            if (pageIds.length > 0) {
                console.log(`[Delete] Deleting dependencies for ${pageIds.length} pages...`);
                // Delete page_assets, page_embeddings, document_page_versions
                await client.query(`DELETE FROM page_assets WHERE page_id = ANY($1::int[])`, [pageIds]);
                await client.query(`DELETE FROM page_embeddings WHERE page_id = ANY($1::int[])`, [pageIds]);
                await client.query(`DELETE FROM document_page_versions WHERE page_id = ANY($1::int[])`, [pageIds]);
                
                console.log(`[Delete] Deleting ${pageIds.length} document pages...`);
                await client.query(`DELETE FROM document_pages WHERE id = ANY($1::int[])`, [pageIds]);
            }

            console.log(`[Delete] Deleting ${docIds.length} documents...`);
            // document_transfers etc.
            await client.query(`DELETE FROM document_transfers WHERE document_id = ANY($1::int[])`, [docIds]);
            await client.query(`DELETE FROM documents WHERE id = ANY($1::int[])`, [docIds]);
        }

        // 4. Delete the folder nodes (bottom up to avoid foreign key errors, or just use IN since IN doesn't care about order if we don't have cyclic dependencies, but standard FK requires bottom up unless ON DELETE CASCADE. Let's delete bottom up, or just delete in a single query since Postgres can handle self-referential deletes if they are in the same statement)
        console.log(`[Delete] Deleting ${folderIds.length} folder nodes from database...`);
        await client.query(`
            DELETE FROM folder_nodes WHERE id = ANY($1::int[])
        `, [folderIds]);

        // Commit transaction
        await client.query('COMMIT');
        console.log(`[Delete] Database cleanup completed successfully!`);

        // 5. Delete from filesystem
        if (fs.existsSync(DIRECTORY_PATH)) {
            console.log(`[Delete] Deleting physical directory: ${DIRECTORY_PATH}`);
            fs.rmSync(DIRECTORY_PATH, { recursive: true, force: true });
            console.log(`[Delete] Physical directory deleted successfully.`);
        } else {
            console.log(`[Delete] Physical directory ${DIRECTORY_PATH} not found.`);
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Delete] Error during cleanup:`, err);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
