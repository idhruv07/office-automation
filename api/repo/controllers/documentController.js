const db = require('../../../config/repo_db');
const { resolvePermission, isOfficeAdminHierarchy } = require('../../lib/permissions');

async function getDocuments(req, res) {
    try {
        const { folder_id } = req.query;
        console.log('[API getDocuments] User:', req.user?.id, 'Folder:', folder_id);
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

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
}

async function getDocumentPages(req, res) {
    try {
        const docId = parseInt(req.params.id);
        console.log('[API getDocumentPages] User:', req.user?.id, 'Doc:', docId);
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

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
}

async function getPage(req, res) {
    try {
        const pageId = parseInt(req.params.id);
        console.log('[API getPage] User:', req.user?.id, 'PageId:', pageId);
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

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
}

async function updatePage(req, res) {
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
            const lastVerRes = await client.query(
                `SELECT dpv.edited_by, r.rank as editor_rank 
                 FROM document_page_versions dpv
                 LEFT JOIN users u ON dpv.edited_by = u.id
                 LEFT JOIN roles r ON u.role_id = r.id
                 WHERE dpv.page_id = $1 AND dpv.version = $2
                 ORDER BY dpv.edited_at DESC LIMIT 1`,
                [pageId, currentVersion]
            );

            let currentEditorRank = 999;
            let currentEditorId = null;

            if (lastVerRes.rows.length > 0) {
                currentEditorRank = lastVerRes.rows[0].editor_rank || 999;
                currentEditorId = lastVerRes.rows[0].edited_by;
            }

            if (requesterRank > currentEditorRank) {
                requesterWins = false;
            } else {
                requesterWins = true;
            }
        }

        if (isConflict && !requesterWins) {
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

        let isSameSession = false;
        let finalVersion = currentVersion + 1;

        if (!isConflict) {
            const lastVerRes = await client.query(
                `SELECT id, edited_by, edited_at FROM document_page_versions 
                 WHERE page_id = $1 
                 ORDER BY version DESC, edited_at DESC LIMIT 1`,
                [pageId]
            );
            if (lastVerRes.rows.length > 0) {
                const lastVer = lastVerRes.rows[0];
                const timeDiffSec = (Date.now() - new Date(lastVer.edited_at).getTime()) / 1000;
                if (lastVer.edited_by === req.user.id && timeDiffSec < 300) {
                    isSameSession = true;
                    finalVersion = currentVersion;
                }
            }
        }

        if (isSameSession) {
            await client.query(
                'UPDATE document_pages SET html_content=$1 WHERE id=$2',
                [html_content, pageId]
            );
            const lastVerRes = await client.query(
                `SELECT id FROM document_page_versions WHERE page_id = $1 ORDER BY version DESC, edited_at DESC LIMIT 1`,
                [pageId]
            );
            if (lastVerRes.rows.length > 0) {
                await client.query('UPDATE document_page_versions SET edited_at=NOW() WHERE id=$1', [lastVerRes.rows[0].id]);
            }
        } else {
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

            await client.query(
                'UPDATE document_pages SET html_content=$1, version=$2 WHERE id=$3',
                [html_content, finalVersion, pageId]
            );
        }

        await client.query('DELETE FROM page_edit_locks WHERE page_id=$1', [pageId]);

        await client.query('COMMIT');
        res.json({ message: 'Page saved successfully', new_version: finalVersion });

        // Background task: Generate embeddings
        (async () => {
            try {
                const textContent = html_content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
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
                    const embeddingArray = data.embedding;
                    const vectorStr = `[${embeddingArray.join(',')}]`;
                    
                    await db.query(
                        `INSERT INTO page_embeddings (page_id, embedding, office_id, updated_at)
                         VALUES ($1, $2::vector, $3, now())
                         ON CONFLICT (page_id) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()`,
                        [pageId, vectorStr, officeId]
                    );
                    console.log(`[AI] Embedded page ${pageId} successfully.`);
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
}

async function getPageVersions(req, res) {
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
             WHERE dpv.page_id = $1 AND dpv.edited_at >= NOW() - INTERVAL '15 days'
             ORDER BY dpv.edited_at DESC`,
            [pageId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/repo/page/:id/versions error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

async function searchRepository(req, res) {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const q = (req.query.q || '').trim();
        if (q.length < 2) return res.status(400).json({ message: 'Query too short' });

        const words = q.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return res.status(400).json({ message: 'Invalid query' });

        // 1. Query repo_db (documents & pages)
        let repoQuery = `
            SELECT 
                dp.id as page_id,
                d.id as document_id,
                d.title as doc_title,
                fn.name as folder_name,
                REGEXP_REPLACE(dp.html_content, '<[^>]+>', ' ', 'g') as plain_text
            FROM document_pages dp
            JOIN documents d ON dp.document_id = d.id
            LEFT JOIN folder_nodes fn ON d.folder_id = fn.id
            WHERE (d.owner_office_id = (SELECT office_id FROM users WHERE id = $1) OR d.owner_office_id IS NULL)
        `;

        let repoParams = [req.user.id];
        let repoParamCount = 1;

        words.forEach(w => {
            repoQuery += ` AND (REGEXP_REPLACE(dp.html_content, '<[^>]+>', ' ', 'g') ILIKE $${++repoParamCount} OR d.title ILIKE $${repoParamCount} OR fn.name ILIKE $${repoParamCount})`;
            repoParams.push(`%${w}%`);
        });

        repoQuery += ` LIMIT 20`;
        const repoRes = await db.query(repoQuery, repoParams);

        // 2. Query core_db (claims & claim_types)
        const coreDb = require('../../../config/db');
        let claimsQuery = `
            SELECT 
                c.id as claim_id,
                c.claim_name as doc_title,
                'Claims / ' || t.name as folder_name,
                'Claim Status: ' || c.status || ' - Date: ' || TO_CHAR(c.claim_date, 'DD-MM-YYYY') as plain_text,
                u.username,
                c.folder_name as claim_folder_name
            FROM claims c
            JOIN claim_types t ON c.type_id = t.id
            JOIN users u ON c.user_id = u.id
            WHERE 1=1
        `;

        let claimsParams = [];
        let claimsParamCount = 0;

        words.forEach(w => {
            claimsQuery += ` AND (c.claim_name ILIKE $${++claimsParamCount} OR t.name ILIKE $${claimsParamCount})`;
            claimsParams.push(`%${w}%`);
        });

        claimsQuery += ` LIMIT 20`;
        const claimsRes = await coreDb.query(claimsQuery, claimsParams);

        // 3. Process and merge results in JS
        const results = [];

        repoRes.rows.forEach(row => {
            const plainText = (row.plain_text || '').replace(/\s+/g, ' ').trim();
            const firstMatchWord = words.find(w => plainText.toLowerCase().includes(w.toLowerCase())) || words[0];
            const idx = plainText.toLowerCase().indexOf(firstMatchWord.toLowerCase());
            
            let snippet = '';
            if (idx !== -1) {
                const start = Math.max(0, idx - 80);
                const end = Math.min(plainText.length, idx + firstMatchWord.length + 120);
                snippet = (start > 0 ? '...' : '') + plainText.slice(start, end) + (end < plainText.length ? '...' : '');
            } else {
                snippet = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');
            }

            results.push({
                page_id: row.page_id,
                document_id: row.document_id,
                claim_id: null,
                doc_title: row.doc_title,
                folder_path: row.folder_name,
                snippet,
                redirect_url: `/repository/document.html?id=${row.document_id}&pageId=${row.page_id}`
            });
        });

        claimsRes.rows.forEach(row => {
            const plainText = (row.plain_text || '').replace(/\s+/g, ' ').trim();
            results.push({
                page_id: null,
                document_id: null,
                claim_id: row.claim_id,
                doc_title: row.doc_title,
                folder_path: row.folder_name,
                snippet: plainText,
                redirect_url: `/storage/${row.username}/claims/${row.claim_folder_name ? row.claim_folder_name + '/' : ''}${row.claim_id}.html`
            });
        });

        res.json({ results: results.slice(0, 20) });
    } catch (err) {
        console.error('GET /api/repo/search error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

async function getRecentDocuments(req, res) {
    try {
        console.log('[API getRecentDocuments] User:', req.user?.id);
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const result = await db.query(
            `SELECT d.*, fn.name as folder_name,
                    COUNT(dp.id)::int as page_count,
                    MAX(dp.page_date) as latest_page_date
             FROM documents d
             LEFT JOIN folder_nodes fn ON d.folder_id = fn.id
             LEFT JOIN document_pages dp ON dp.document_id = d.id
             WHERE (d.owner_office_id = (SELECT office_id FROM users WHERE id = $1) OR d.owner_office_id IS NULL)
               AND d.status = 'active'
             GROUP BY d.id, fn.name
             ORDER BY d.created_at DESC, d.id DESC
             LIMIT 10`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET /api/repo/documents/recent error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    getDocuments,
    getDocumentPages,
    getPage,
    updatePage,
    getPageVersions,
    searchRepository,
    getRecentDocuments
};
