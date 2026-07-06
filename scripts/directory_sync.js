const fs = require('fs').promises;
const path = require('path');
const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

const ROOT_DIR = 'D:\\Admin_Sharing';
// PDFs and PPTs excluded by user decision. Folders containing ONLY excluded types are skipped entirely.
const ALLOWED_EXTENSIONS = new Set(['.docx', '.doc', '.odt']);


const connectionString = 'postgres://postgres:postgrespassword@127.0.0.1:5433/repo_db';

/**
 * Recursively checks whether a directory has at least one allowed file anywhere
 * in its subtree. Used to skip PDF-only (or otherwise empty) folders.
 */
async function hasAllowedFiles(dirPath) {
    let entries;
    try { entries = await fs.readdir(dirPath, { withFileTypes: true }); }
    catch { return false; }
    for (const entry of entries) {
        if (entry.isFile()) {
            if (ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) return true;
        } else if (entry.isDirectory()) {
            if (await hasAllowedFiles(path.join(dirPath, entry.name))) return true;
        }
    }
    return false;
}

async function main() {
    console.log('Connecting to database...');
    const client = new Client({ connectionString });
    await client.connect();
    console.log('Differential sync starting at', ROOT_DIR);

    const folderMap = new Map();

    async function processDirectory(currentPath, parentId = null) {
        let entries;
        try { entries = await fs.readdir(currentPath, { withFileTypes: true }); }
        catch (err) { console.error('Error reading', currentPath, err.message); return; }

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                // Skip if no allowed files anywhere inside
                if (!(await hasAllowedFiles(fullPath))) {
                    console.log('Skipping (no allowed files):', entry.name);
                    continue;
                }
                try {
                    let newFolderId;
                    const existing = await client.query(
                        'SELECT id FROM folder_nodes WHERE name = $1 AND (parent_id = $2 OR ($2 IS NULL AND parent_id IS NULL))',
                        [entry.name, parentId]
                    );
                    if (existing.rows.length > 0) {
                        newFolderId = existing.rows[0].id;
                    } else {
                        const res = await client.query(
                            'INSERT INTO folder_nodes (name, parent_id, office_id, sort_order) VALUES ($1, $2, 1, 0) RETURNING id',
                            [entry.name, parentId]
                        );
                        newFolderId = res.rows[0].id;
                        console.log('Created folder:', entry.name, '(ID:', newFolderId + ')');
                    }
                    folderMap.set(fullPath, newFolderId);
                    await processDirectory(fullPath, newFolderId);
                } catch (err) {
                    console.error('Error processing directory', fullPath, err.message);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (entry.name.toLowerCase().endsWith('.odt.docx') || entry.name.toLowerCase().endsWith('.doc.docx')) {
                    continue;
                }
                if (ALLOWED_EXTENSIONS.has(ext)) {
                    try {
                        const titleWithoutExt = entry.name.slice(0, -ext.length);
                        const existingDoc = await client.query(
                            'SELECT id FROM documents WHERE title = $1 AND folder_id = $2',
                            [titleWithoutExt, parentId]
                        );
                        if (existingDoc.rows.length === 0) {
                            const jobId = crypto.randomUUID();
                            await client.query(
                                "INSERT INTO pgboss.job (id, name, data, state, created_on) VALUES ($1, 'document-import', $2, 'created', now())",
                                [jobId, { filePath: fullPath, originalName: entry.name, folderId: parentId, officeId: 1 }]
                            );
                            console.log('Enqueued:', entry.name);
                        }
                    } catch (err) {
                        console.error('Error enqueueing', fullPath, err.message);
                    }
                }
            }
        }
    }

    try {
        await processDirectory(ROOT_DIR, null);
        console.log('Scan complete.');
    } catch (err) {
        console.error('Error during sync:', err);
    } finally {
        await client.end();
        console.log('Done.');
    }
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
