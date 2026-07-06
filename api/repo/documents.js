/**
 * api/repo/documents.js
 * Document and page listing, retrieval, and basic management
 */
const express = require('express');
const router = express.Router();
const db = require('../../config/repo_db');
const { authenticateToken, authorizeRoleCode } = require('../middleware');
const { resolvePermission, isOfficeAdminHierarchy } = require('../lib/permissions');

// GET /api/repo/documents?folder_id=X — list documents in a folder (kept for general UI use)
router.get('/documents', authenticateToken, async (req, res) => {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { folder_id } = req.query;
        if (!folder_id) return res.status(400).json({ message: 'folder_id is required' });

        const perm = await resolvePermission(req.user.id, 'folder', parseInt(folder_id), db);
        if (perm === 'none') return res.status(403).json({ message: 'Forbidden: no access to this folder' });

        const result = await db.query(
            `SELECT d.*, o.name as owner_office_name,
                    COUNT(dp.id)::int as page_count,
                    MAX(dp.page_date) as latest_page_date
             FROM documents d
             LEFT JOIN offices o ON d.owner_office_id = o.id
             LEFT JOIN document_pages dp ON dp.document_id = d.id
             WHERE d.folder_id = $1 AND d.status = 'active'
             GROUP BY d.id, o.name
             ORDER BY d.title ASC`,
            [folder_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/repo/documents error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/repo/document/:id/pages — list pages for a document (as requested)
router.get('/document/:id/pages', authenticateToken, async (req, res) => {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const docId = parseInt(req.params.id);
        const perm = await resolvePermission(req.user.id, 'file', docId, db);
        if (perm === 'none') return res.status(403).json({ message: 'Forbidden: no access to this document' });

        const pagesRes = await db.query(
            `SELECT id, page_date, sequence_no, title, is_editable, version
             FROM document_pages WHERE document_id = $1
             ORDER BY page_date ASC, sequence_no ASC`,
            [docId]
        );

        res.json(pagesRes.rows);
    } catch (err) {
        console.error('GET /api/repo/document/:id/pages error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/repo/page/:id — render a single page (as requested)
router.get('/page/:id', authenticateToken, async (req, res) => {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const pageId = parseInt(req.params.id);
        const pagePerm = await resolvePermission(req.user.id, 'page', pageId, db);
        if (pagePerm === 'none') return res.status(403).json({ message: 'Forbidden: no access to this page' });

        const pageRes = await db.query('SELECT * FROM document_pages WHERE id=$1', [pageId]);
        if (pageRes.rows.length === 0) return res.status(404).json({ message: 'Page not found' });

        const page = pageRes.rows[0];

        // Check if someone else holds an edit lock
        const lockRes = await db.query(
            `SELECT pel.*, u.name as holder_name, r.name as holder_role
             FROM page_edit_locks pel
             JOIN users u ON pel.held_by = u.id
             JOIN roles r ON u.role_id = r.id
             WHERE pel.page_id = $1`,
            [pageId]
        );
        const lock = lockRes.rows.length > 0 ? lockRes.rows[0] : null;
        const lockedByOther = lock && lock.held_by !== req.user.id;

        res.json({
            page,
            user_permission: pagePerm,
            is_editable: page.is_editable && pagePerm === 'edit',
            lock: lockedByOther ? {
                held_by: lock.held_by,
                holder_name: lock.holder_name,
                holder_role: lock.holder_role,
                acquired_at: lock.acquired_at,
            } : null,
        });
    } catch (err) {
        console.error('GET /api/repo/page/:id error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/repo/document/:id/transfer — clone a document (SysAdmin -> Office Admin)
router.post('/document/:id/transfer', authenticateToken, authorizeRoleCode(['SYSADMIN', 'OFFICE_ADMIN']), async (req, res) => {
    const originalDocId = parseInt(req.params.id);
    const { target_office_id, target_folder_id } = req.body;

    if (!target_office_id || !target_folder_id) {
        return res.status(400).json({ message: 'target_office_id and target_folder_id are required' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // Ensure user has access to read original document
        const perm = await resolvePermission(req.user.id, 'file', originalDocId, db);
        if (perm === 'none') {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Forbidden: Cannot access original document' });
        }

        const originalDocRes = await client.query('SELECT * FROM documents WHERE id = $1', [originalDocId]);
        if (originalDocRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Original document not found' });
        }
        const origDoc = originalDocRes.rows[0];

        // Deep clone document
        const newDocRes = await client.query(
            `INSERT INTO documents (folder_id, reference_no, title, owner_type, owner_office_id, transferred_from_id)
             VALUES ($1, $2, $3, 'office', $4, $5) RETURNING id`,
            [target_folder_id, origDoc.reference_no, origDoc.title, target_office_id, originalDocId]
        );
        const newDocId = newDocRes.rows[0].id;

        // Clone pages
        const pagesRes = await client.query('SELECT * FROM document_pages WHERE document_id = $1', [originalDocId]);
        for (const page of pagesRes.rows) {
            await client.query(
                `INSERT INTO document_pages (document_id, page_date, sequence_no, title, is_editable, html_content, version)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [newDocId, page.page_date, page.sequence_no, page.title, page.is_editable, page.html_content, 1]
            );
        }

        // Record transfer
        await client.query(
            `INSERT INTO document_transfers (original_document_id, new_document_id, transferred_by, transferred_to_office_id)
             VALUES ($1, $2, $3, $4)`,
            [originalDocId, newDocId, req.user.id, target_office_id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Document transferred (cloned) successfully', new_document_id: newDocId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /api/repo/document/:id/transfer error:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// POST /api/repo/document/:id/transfer/:transferId/reverse — append reversal comment
router.post('/document/:id/transfer/:transferId/reverse', authenticateToken, authorizeRoleCode(['SYSADMIN', 'OFFICE_ADMIN']), async (req, res) => {
    const { transferId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim() === '') {
        return res.status(400).json({ message: 'Reversal comment is required' });
    }

    try {
        const transferRes = await db.query('SELECT * FROM document_transfers WHERE id = $1', [transferId]);
        if (transferRes.rows.length === 0) return res.status(404).json({ message: 'Transfer not found' });

        await db.query(
            'INSERT INTO document_transfer_reversals (transfer_id, reversed_by, comment) VALUES ($1, $2, $3)',
            [transferId, req.user.id, comment]
        );

        res.json({ message: 'Reversal comment added successfully' });
    } catch (err) {
        console.error('POST /api/repo/document/:id/transfer/:transferId/reverse error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/repo/page/:id — save edits with rank-prevails conflict resolution
router.put('/page/:id', authenticateToken, async (req, res) => {
    const pageId = parseInt(req.params.id);
    const { html_content, base_version } = req.body;

    if (!html_content || base_version === undefined) {
        return res.status(400).json({ message: 'html_content and base_version are required' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Permission check
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Forbidden' });
        }

        const perm = await resolvePermission(req.user.id, 'page', pageId, db);
        if (perm !== 'edit') {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Forbidden: edit permission required' });
        }

        // 2. Fetch current page state
        const pageRes = await client.query('SELECT version, html_content FROM document_pages WHERE id=$1 FOR UPDATE', [pageId]);
        if (pageRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Page not found' });
        }
        const currentPage = pageRes.rows[0];
        const currentVersion = currentPage.version;

        // 3. Fetch requester rank
        const reqUserRes = await db.query('SELECT r.rank FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id=$1', [req.user.id]);
        const requesterRank = reqUserRes.rows[0].rank;

        let isConflict = false;
        let requesterWins = true;

        if (parseInt(base_version) !== currentVersion) {
            isConflict = true;

            // Fetch the rank of the user who made the current version
            // Find the latest version row to see who saved it
            const lastVerRes = await client.query(
                `SELECT dpv.edited_by, r.rank as editor_rank 
                 FROM document_page_versions dpv
                 LEFT JOIN users u ON dpv.edited_by = u.id
                 LEFT JOIN roles r ON u.role_id = r.id
                 WHERE dpv.page_id = $1 AND dpv.version = $2
                ORDER BY dpv.edited_at DESC LIMIT 1`,
                [pageId, currentVersion]
            );

            let currentEditorRank = 999; // Assume lowest possible rank if unknown
            let currentEditorId = null;

            if (lastVerRes.rows.length > 0) {
                currentEditorRank = lastVerRes.rows[0].editor_rank || 999;
                currentEditorId = lastVerRes.rows[0].edited_by;
            }

            // Conflict resolution: lower number = higher rank
            if (requesterRank > currentEditorRank) {
                requesterWins = false; // Requester loses
            } else {
                requesterWins = true; // Requester wins (higher rank, or equal rank = most-recent-wins)
            }
        }

        if (isConflict && !requesterWins) {
            // Requester loses: save their work as a draft, but don't update the live page.
            await client.query(
                `INSERT INTO document_page_versions (page_id, version, html_content, edited_by, diff_summary)
                 VALUES ($1, $2, $3, $4, $5)`,
                [pageId, base_version, html_content, req.user.id, `[REJECTED CONFLICT] Outranked by user ${currentEditorId || 'unknown'}`]
            );

            await client.query(
                `INSERT INTO audit_log (user_id, action, remarks) VALUES ($1, 'SAVE_REJECTED_RANK_CONFLICT', $2)`,
                [req.user.id, `Save rejected on page ${pageId}. Rank ${requesterRank} lost to rank ${currentEditorRank}`]
            );

            await client.query('COMMIT');
            return res.status(409).json({
                message: 'Conflict: Your save was rejected because a higher-ranking user modified the page. Your draft has been saved to history.',
                current_html: currentPage.html_content
            });
        }

        // Success Path (No conflict OR Requester Wins conflict)

        // a) Archive the current DB state before overwriting
        await client.query(
            `INSERT INTO document_page_versions (page_id, version, html_content, edited_by, diff_summary)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                pageId,
                currentVersion,
                currentPage.html_content,
                req.user.id,
                isConflict ? `[OVERWRITTEN] Rank ${requesterRank} prevailed in conflict` : `Standard update`
            ]
        );

        // b) Update page
        const nextVersion = currentVersion + 1;
        await client.query(
            'UPDATE document_pages SET html_content=$1, version=$2 WHERE id=$3',
            [html_content, nextVersion, pageId]
        );

        // c) Release lock
        await client.query('DELETE FROM page_edit_locks WHERE page_id=$1', [pageId]);

        await client.query('COMMIT');
        res.json({ message: 'Page saved successfully', new_version: nextVersion });

        // e) Background task: Generate and store pgvector/array embedding via Ollama
        (async () => {
            try {
                // Remove HTML tags for better embedding quality
                const textContent = html_content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
                
                // Get office_id for this document to scope retrieval
                const docRes = await db.query(
                    `SELECT d.owner_office_id FROM documents d JOIN document_pages dp ON dp.document_id = d.id WHERE dp.id = $1`,
                    [pageId]
                );
                const officeId = docRes.rows[0]?.owner_office_id;

                const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
                
                const response = await fetch(`${ollamaUrl}/api/embeddings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'nomic-embed-text',
                        prompt: textContent
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const embeddingArray = data.embedding; // array of floats
                    // pgvector requires '[x,y,...]' format for vector type column
                    const vectorStr = `[${embeddingArray.join(',')}]`;
                    
                    // Upsert into page_embeddings (column type is 'vector')
                    await db.query(
                        `INSERT INTO page_embeddings (page_id, embedding, office_id, updated_at)
                         VALUES ($1, $2::vector, $3, now())
                         ON CONFLICT (page_id) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()`,
                        [pageId, vectorStr, officeId]
                    );
                    console.log(`[AI] Embedded page ${pageId} successfully.`);
                } else {
                    console.error(`[AI] Ollama embedding failed for page ${pageId}:`, response.statusText);
                }
            } catch (err) {
                console.error(`[AI] Background embedding error for page ${pageId}:`, err);
            }
        })();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('PUT /api/repo/page/:id error:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// GET /api/repo/page/:id/versions — list history
router.get('/page/:id/versions', authenticateToken, async (req, res) => {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const pageId = parseInt(req.params.id);
        const perm = await resolvePermission(req.user.id, 'page', pageId, db);
        if (perm === 'none') return res.status(403).json({ message: 'Forbidden' });

        const result = await db.query(
            `SELECT dpv.id, dpv.version, dpv.edited_at, dpv.diff_summary, dpv.html_content, u.name as editor_name
             FROM document_page_versions dpv
             LEFT JOIN users u ON dpv.edited_by = u.id
             WHERE dpv.page_id = $1
             ORDER BY dpv.edited_at DESC`,
            [pageId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/repo/page/:id/versions error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/repo/search?q=keyword — Full-text search across repository documents
router.get('/search', authenticateToken, async (req, res) => {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const q = (req.query.q || '').trim();
        if (q.length < 2) return res.status(400).json({ message: 'Query too short' });

        // Strip HTML tags from content and do a ILIKE full-text search
        const result = await db.query(
            `SELECT 
                dp.id as page_id,
                d.id as document_id,
                d.title as doc_title,
                fn.name as folder_name,
                REGEXP_REPLACE(dp.html_content, '<[^>]+>', ' ', 'g') as plain_text
             FROM document_pages dp
             JOIN documents d ON dp.document_id = d.id
             LEFT JOIN folder_nodes fn ON d.folder_id = fn.id
             WHERE REGEXP_REPLACE(dp.html_content, '<[^>]+>', ' ', 'g') ILIKE $1
               AND (d.owner_office_id = (SELECT office_id FROM users WHERE id = $2) OR d.owner_office_id IS NULL)
             LIMIT 20`,
            [`%${q}%`, req.user.id]
        );

        const results = result.rows.map(row => {
            // Find snippet around the match
            const plainText = (row.plain_text || '').replace(/\s+/g, ' ').trim();
            const idx = plainText.toLowerCase().indexOf(q.toLowerCase());
            const start = Math.max(0, idx - 80);
            const end = Math.min(plainText.length, idx + q.length + 120);
            const snippet = (start > 0 ? '...' : '') + plainText.slice(start, end) + (end < plainText.length ? '...' : '');
            return {
                page_id: row.page_id,
                document_id: row.document_id,
                doc_title: row.doc_title,
                folder_path: row.folder_name,
                snippet
            };
        });

        res.json({ results });
    } catch (err) {
        console.error('GET /api/repo/search error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
