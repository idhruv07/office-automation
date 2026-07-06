/**
 * api/repo/locks.js
 * Write-access checkout (acquire, takeover, release)
 */
const express = require('express');
const router = express.Router();
const db = require('../../config/repo_db');
const { authenticateToken } = require('../middleware');
const { resolvePermission, isOfficeAdminHierarchy } = require('../lib/permissions');

// POST /api/repo/locks/:page_id/acquire — checkout edit lock
router.post('/:page_id/acquire', authenticateToken, async (req, res) => {
    const pageId = parseInt(req.params.page_id);

    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const perm = await resolvePermission(req.user.id, 'page', pageId, db);
        if (perm !== 'edit') {
            return res.status(403).json({ message: 'Forbidden: edit permission required to acquire lock' });
        }

        // Get the requesting user's rank
        const userRes = await db.query(
            'SELECT r.rank FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
            [req.user.id]
        );
        const requesterRank = userRes.rows[0].rank;

        // Check for existing lock
        const existing = await db.query(
            `SELECT pel.*, u.name as holder_name, r.name as holder_role, r.rank as holder_rank
             FROM page_edit_locks pel
             JOIN users u ON pel.held_by = u.id
             JOIN roles r ON u.role_id = r.id
             WHERE pel.page_id = $1`,
            [pageId]
        );

        if (existing.rows.length === 0) {
            // Lock is free — acquire immediately
            await db.query(
                `INSERT INTO page_edit_locks (page_id, held_by, held_by_rank)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (page_id) DO UPDATE SET held_by=$2, held_by_rank=$3, acquired_at=now()`,
                [pageId, req.user.id, requesterRank]
            );
            return res.json({ acquired: true, message: 'Lock acquired' });
        }

        const holder = existing.rows[0];

        // Already held by the same user
        if (holder.held_by === req.user.id) {
            return res.json({ acquired: true, message: 'You already hold the lock' });
        }

        // Lock held by someone else — return takeover info for confirmation prompt
        return res.json({
            acquired: false,
            requires_confirmation: true,
            held_by: {
                id: holder.held_by,
                name: holder.holder_name,
                role: holder.holder_role,
                rank: holder.holder_rank,
            },
            requester_rank: requesterRank,
            lower_rank_takeover: requesterRank > holder.holder_rank, // requester outranked by holder
            message: `This page is being edited by ${holder.holder_name} (${holder.holder_role})`,
        });
    } catch (err) {
        console.error('POST /api/repo/locks/:page_id/acquire error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/repo/locks/:page_id/takeover — confirm takeover after prompt
router.post('/:page_id/takeover', authenticateToken, async (req, res) => {
    const pageId = parseInt(req.params.page_id);
    const client = await db.pool.connect();

    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const perm = await resolvePermission(req.user.id, 'page', pageId, db);
        if (perm !== 'edit') {
            return res.status(403).json({ message: 'Forbidden: edit permission required' });
        }

        const userRes = await db.query(
            'SELECT r.rank FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
            [req.user.id]
        );
        const requesterRank = userRes.rows[0].rank;

        const existing = await db.query(
            `SELECT pel.*, u.name as holder_name, r.rank as holder_rank
             FROM page_edit_locks pel
             JOIN users u ON pel.held_by = u.id
             JOIN roles r ON u.role_id = r.id
             WHERE pel.page_id = $1`,
            [pageId]
        );

        await client.query('BEGIN');

        if (existing.rows.length > 0) {
            const holder = existing.rows[0];
            const isLowerRankTakeover = requesterRank > holder.holder_rank;

            // Save the displaced user's in-progress draft as a version (nothing is lost)
            const currentPage = await client.query(
                'SELECT version, html_content FROM document_pages WHERE id=$1', [pageId]
            );
            if (currentPage.rows.length > 0) {
                await client.query(
                    `INSERT INTO document_page_versions (page_id, version, html_content, edited_by, diff_summary)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                        pageId,
                        currentPage.rows[0].version,
                        currentPage.rows[0].html_content,
                        holder.held_by,
                        isLowerRankTakeover
                            ? `[DRAFT] Saved by system when lock taken over by lower-ranked user ${req.user.username}`
                            : `[DRAFT] Saved by system when lock taken over by ${req.user.username}`,
                    ]
                );
            }

            // Log more prominently if lower rank is taking over
            if (isLowerRankTakeover) {
                await client.query(
                    `INSERT INTO audit_log (user_id, action, remarks)
                     VALUES ($1, 'LOCK_TAKEOVER_BY_LOWER_RANK', $2)`,
                    [
                        req.user.id,
                        `User ${req.user.id} (rank ${requesterRank}) took over edit lock on page ${pageId} from user ${holder.held_by} (rank ${holder.holder_rank})`
                    ]
                );
            }
        }

        // Transfer lock to requester
        await client.query(
            `INSERT INTO page_edit_locks (page_id, held_by, held_by_rank)
             VALUES ($1, $2, $3)
             ON CONFLICT (page_id) DO UPDATE SET held_by=$2, held_by_rank=$3, acquired_at=now()`,
            [pageId, req.user.id, requesterRank]
        );

        await client.query('COMMIT');
        res.json({ acquired: true, message: 'Lock taken over successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('POST /api/repo/locks/:page_id/takeover error:', err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// DELETE /api/repo/locks/:page_id — release lock explicitly
router.delete('/:page_id', authenticateToken, async (req, res) => {
    const pageId = parseInt(req.params.page_id);
    try {
        // Only the lock holder (or SysAdmin) can release
        const lockRes = await db.query('SELECT held_by FROM page_edit_locks WHERE page_id=$1', [pageId]);
        if (lockRes.rows.length === 0) {
            return res.json({ message: 'No lock to release' });
        }

        const userRoleRes = await db.query(
            'SELECT r.code FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
            [req.user.id]
        );
        const code = userRoleRes.rows[0]?.code;
        const isSysAdmin = code === 'SYSADMIN';

        if (lockRes.rows[0].held_by !== req.user.id && !isSysAdmin) {
            return res.status(403).json({ message: 'Only the lock holder or SysAdmin can release the lock' });
        }

        await db.query('DELETE FROM page_edit_locks WHERE page_id=$1', [pageId]);
        res.json({ message: 'Lock released' });
    } catch (err) {
        console.error('DELETE /api/repo/locks/:page_id error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
