const express = require('express');
const router = express.Router();
const db = require('../../config/repo_db');
const { authenticateToken } = require('../middleware');
const { isOfficeAdminHierarchy } = require('../lib/permissions');

// Middleware: Ensure user is Office Admin or SysAdmin
router.use(authenticateToken, async (req, res, next) => {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden: Office Admin access required' });
        }
        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/repo/admin/queue
// List all jobs needing review
router.get('/queue', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, source_path, original_filename, status, detected_dates, error_log, created_at 
             FROM import_jobs 
             WHERE status = 'needs_review' 
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching review queue' });
    }
});

// POST /api/repo/admin/queue/:id/resolve
// Resolve a needs_review job manually
router.post('/queue/:id/resolve', async (req, res) => {
    const jobId = req.params.id;
    const { action, folder_id, document_title, page_date } = req.body;
    
    // action: 'retry' (push back to queued), 'discard' (mark failed/ignored), 'force_import' (create document with provided manual data)

    try {
        if (action === 'retry') {
            await db.query("UPDATE import_jobs SET status = 'queued', error_log = NULL WHERE id = $1", [jobId]);
            return res.json({ message: 'Job re-queued' });
        }
        
        if (action === 'discard') {
            await db.query("UPDATE import_jobs SET status = 'failed', error_log = 'Discarded by admin' WHERE id = $1", [jobId]);
            return res.json({ message: 'Job discarded' });
        }

        if (action === 'force_import') {
            if (!folder_id || !document_title || !page_date) {
                return res.status(400).json({ message: 'Missing required manual data' });
            }
            
            // In a full implementation, we'd trigger a synchronous conversion run here or run the HTML extraction manually.
            // For now, we update the job with the manual overrides and push it back to the queue with a special flag 
            // OR just mark it done if it was a cardinality split issue. 
            // Since this is a queue review, let's just push it back to queue with the explicit overrides stored in detected_dates.
            const manualData = {
                date: page_date,
                subject: document_title,
                force_folder_id: folder_id,
                manual_override: true
            };
            
            await db.query(
                `UPDATE import_jobs 
                 SET status = 'queued', error_log = NULL, detected_dates = $1 
                 WHERE id = $2`, 
                [JSON.stringify(manualData), jobId]
            );
            return res.json({ message: 'Job updated with manual data and re-queued for processing' });
        }

        res.status(400).json({ message: 'Invalid action' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error resolving job' });
    }
});

module.exports = router;
