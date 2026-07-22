const db = require('../config/repo_db');

async function recreateFolderStructure() {
    try {
        console.log('Recreating original folder structure for imported documents...');

        // 1. Fetch the ID of the 'Unsorted Imports' folder
        const unsortedRes = await db.query("SELECT id FROM folder_nodes WHERE name = 'Unsorted Imports' LIMIT 1");
        if (unsortedRes.rows.length === 0) {
            console.log("No 'Unsorted Imports' folder found. Hierarchy might already be sorted.");
            return;
        }
        const unsortedFolderId = unsortedRes.rows[0].id;

        // 2. Fetch all documents in the 'Unsorted Imports' folder along with their raw source paths
        const docsRes = await db.query(`
            SELECT d.id as doc_id, d.title, dp.raw_source_path 
            FROM documents d
            JOIN document_pages dp ON dp.document_id = d.id
            WHERE d.folder_id = $1 AND dp.raw_source_path IS NOT NULL
        `, [unsortedFolderId]);

        console.log(`Found ${docsRes.rows.length} documents to sort.`);

        // Cache for existing folder IDs to avoid duplicate queries
        // key format: "name_parentId" -> folderId
        const folderCache = {};

        for (const doc of docsRes.rows) {
            const rawPath = doc.raw_source_path;
            const prefix = 'D:\\Admin_Sharing\\';
            
            if (!rawPath.startsWith(prefix)) {
                console.log(`Skipping document ${doc.doc_id} (${doc.title}) — path doesn't start with expected prefix: ${rawPath}`);
                continue;
            }

            const relativePath = rawPath.substring(prefix.length);
            const pathParts = relativePath.split('\\');
            const fileName = pathParts.pop(); // Remove file name

            let currentParentId = null;

            // If the file was directly in D:\Admin_Sharing\, place it in 'General Admin' (ID 1)
            if (pathParts.length === 0) {
                currentParentId = 1;
            } else {
                // Recreate the folders sequentially
                for (const part of pathParts) {
                    const cleanPartName = part.trim();
                    if (!cleanPartName) continue;

                    const cacheKey = `${cleanPartName}_${currentParentId}`;

                    if (folderCache[cacheKey]) {
                        currentParentId = folderCache[cacheKey];
                    } else {
                        // Check DB if folder exists
                        const checkRes = await db.query(
                            'SELECT id FROM folder_nodes WHERE name = $1 AND (parent_id = $2 OR (parent_id IS NULL AND $2 IS NULL)) LIMIT 1',
                            [cleanPartName, currentParentId]
                        );

                        if (checkRes.rows.length > 0) {
                            currentParentId = checkRes.rows[0].id;
                        } else {
                            // Insert folder
                            const insertRes = await db.query(
                                'INSERT INTO folder_nodes (name, parent_id, office_id) VALUES ($1, $2, 1) RETURNING id',
                                [cleanPartName, currentParentId]
                            );
                            currentParentId = insertRes.rows[0].id;
                            console.log(`Created folder: "${cleanPartName}" (Parent ID: ${insertRes.rows[0].parent_id})`);
                        }
                        folderCache[cacheKey] = currentParentId;
                    }
                }
            }

            // Move the document to the leaf folder
            await db.query('UPDATE documents SET folder_id = $1 WHERE id = $2', [currentParentId, doc.doc_id]);
            console.log(`Moved document ${doc.doc_id} ("${doc.title}") to folder ID ${currentParentId}`);
        }

        // 3. Clean up: Delete 'Unsorted Imports' folder
        await db.query('DELETE FROM folder_nodes WHERE id = $1', [unsortedFolderId]);
        console.log("Deleted 'Unsorted Imports' folder.");

        console.log('Folder structure recreation complete!');
        process.exit(0);
    } catch (err) {
        console.error('Error recreating folder structure:', err);
        process.exit(1);
    }
}

recreateFolderStructure();
