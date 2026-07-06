/**
 * api/repo/folders.js
 * Folder tree CRUD — available to Auditor and above (rank <= 8)
 */
const express = require('express');
const router = express.Router();
const db = require('../../config/repo_db');
const { authenticateToken, authorizeMinRank } = require('../middleware');
const { canManageFolder, isOfficeAdminHierarchy } = require('../lib/permissions');

// GET /api/repo/tree — full folder tree for the user's office(s)
router.get('/tree', authenticateToken, async (req, res) => {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const userRes = await db.query(
            'SELECT r.code, u.office_id FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
            [req.user.id]
        );
        const { code, office_id } = userRes.rows[0];

        // SysAdmin sees all; others see their own office
        const query = code === 'SYSADMIN'
            ? 'SELECT * FROM folder_nodes ORDER BY office_id, sort_order, name'
            : 'SELECT * FROM folder_nodes WHERE office_id = $1 OR office_id IS NULL ORDER BY sort_order, name';
        const params = code === 'SYSADMIN' ? [] : [office_id];

        const result = await db.query(query, params);

        // Build nested tree
        const byId = {};
        result.rows.forEach(r => { byId[r.id] = { ...r, children: [] }; });
        const roots = [];
        result.rows.forEach(r => {
            if (r.parent_id && byId[r.parent_id]) {
                byId[r.parent_id].children.push(byId[r.id]);
            } else {
                roots.push(byId[r.id]);
            }
        });

        res.json(roots);
    } catch (err) {
        console.error('GET /api/repo/tree error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/repo/folder — create a new folder node (Auditor+)
router.post('/folder', authenticateToken, async (req, res) => {
    const allowed = await canManageFolder(req.user.id, db);
    if (!allowed) return res.status(403).json({ message: 'Forbidden: Auditor or above required' });

    const { name, parent_id, office_id, sort_order } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    try {
        const result = await db.query(
            'INSERT INTO folder_nodes (name, parent_id, office_id, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, parent_id || null, office_id || null, sort_order || 0]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('POST /api/repo/folder error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/repo/folder/:id/move — move/reorder (Auditor+)
router.patch('/folder/:id/move', authenticateToken, async (req, res) => {
    const allowed = await canManageFolder(req.user.id, db);
    if (!allowed) return res.status(403).json({ message: 'Forbidden: Auditor or above required' });

    const { parent_id, sort_order } = req.body;
    const folderId = req.params.id;

    try {
        const updates = [];
        const values = [];
        let i = 1;
        if (parent_id !== undefined)  { updates.push(`parent_id=$${i++}`);  values.push(parent_id); }
        if (sort_order !== undefined) { updates.push(`sort_order=$${i++}`); values.push(sort_order); }

        if (updates.length === 0) return res.status(400).json({ message: 'Nothing to update' });

        values.push(folderId);
        const result = await db.query(
            `UPDATE folder_nodes SET ${updates.join(', ')} WHERE id=$${i} RETURNING *`,
            values
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Folder not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('PATCH /api/repo/folder/:id/move error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/repo/folder/:id — only if empty (Auditor+)
router.delete('/folder/:id', authenticateToken, async (req, res) => {
    const allowed = await canManageFolder(req.user.id, db);
    if (!allowed) return res.status(403).json({ message: 'Forbidden: Auditor or above required' });

    const folderId = req.params.id;
    try {
        // Check if any documents or child folders exist
        const childFolders = await db.query('SELECT id FROM folder_nodes WHERE parent_id=$1 LIMIT 1', [folderId]);
        const childDocs = await db.query('SELECT id FROM documents WHERE folder_id=$1 LIMIT 1', [folderId]);
        if (childFolders.rows.length > 0 || childDocs.rows.length > 0) {
            return res.status(409).json({ message: 'Cannot delete a non-empty folder' });
        }
        await db.query('DELETE FROM folder_nodes WHERE id=$1', [folderId]);
        res.json({ message: 'Folder deleted' });
    } catch (err) {
        console.error('DELETE /api/repo/folder/:id error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/repo/folder/:id/number-sequence
router.post('/folder/:id/number-sequence', authenticateToken, authorizeMinRank(6), async (req, res) => { // AAO (rank 6) or Admin
    const folderId = req.params.id;
    const { name_pattern, current_counter, financial_year, reset_on_fy_change } = req.body;
    
    if (!name_pattern) return res.status(400).json({ message: 'name_pattern is required' });

    try {
        const result = await db.query(
            `INSERT INTO document_number_sequences 
             (folder_id, name_pattern, current_counter, financial_year, reset_on_fy_change, configured_by) 
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (folder_id) DO UPDATE SET
             name_pattern=$2, current_counter=$3, financial_year=$4, reset_on_fy_change=$5, configured_by=$6, updated_at=NOW()
             RETURNING *`,
            [folderId, name_pattern, current_counter || 0, financial_year || null, reset_on_fy_change ?? true, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('POST /api/repo/folder/:id/number-sequence error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
