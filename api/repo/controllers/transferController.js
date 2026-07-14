const db = require('../../../config/repo_db');
const { resolvePermission } = require('../../lib/permissions');

async function transferDocument(req, res) {
    const originalDocId = parseInt(req.params.id);
    const { target_office_id, target_folder_id } = req.body;

    if (!target_office_id || !target_folder_id) {
        return res.status(400).json({ message: 'target_office_id and target_folder_id are required' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
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

        const newDocRes = await client.query(
            `INSERT INTO documents (folder_id, reference_no, title, owner_type, owner_office_id, transferred_from_id)
             VALUES ($1, $2, $3, 'office', $4, $5) RETURNING id`,
            [target_folder_id, origDoc.reference_no, origDoc.title, target_office_id, originalDocId]
        );
        const newDocId = newDocRes.rows[0].id;

        const pagesRes = await client.query('SELECT * FROM document_pages WHERE document_id = $1', [originalDocId]);
        for (const page of pagesRes.rows) {
            await client.query(
                `INSERT INTO document_pages (document_id, page_date, sequence_no, title, is_editable, html_content, version)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [newDocId, page.page_date, page.sequence_no, page.title, page.is_editable, page.html_content, 1]
            );
        }

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
}

async function reverseTransfer(req, res) {
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
}

module.exports = {
    transferDocument,
    reverseTransfer
};
