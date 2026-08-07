const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const db = require('../config/db');
const { authenticateToken } = require('./middleware');

// Helper to parse date string to YYYY-MM-DD for PostgreSQL DATE type
function parseDateToISO(dateStr) {
    if (!dateStr || String(dateStr).trim() === '') {
        return null;
    }
    const cleanStr = String(dateStr).trim();

    // 1. If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return cleanStr;
    }

    // 2. If it's DD/MM/YYYY or DD-MM-YYYY
    const matchFull = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (matchFull) {
        const day = matchFull[1].padStart(2, '0');
        const month = matchFull[2].padStart(2, '0');
        const year = matchFull[3];
        return `${year}-${month}-${day}`;
    }

    // 3. If it's DD/MM/YY or DD-MM-YY
    const matchShort = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (matchShort) {
        const day = matchShort[1].padStart(2, '0');
        const month = matchShort[2].padStart(2, '0');
        const year = '20' + matchShort[3]; // Assume 20xx
        return `${year}-${month}-${day}`;
    }

    // 4. Try parsing with standard Date constructor as fallback
    const parsed = new Date(cleanStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return null;
}

// Fetch claim types
router.get('/types', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM claim_types WHERE is_active = true');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching types' });
    }
});

// Fetch active ward entitlement rules
router.get('/ward-entitlements', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM ward_entitlement_rules ORDER BY min_pay ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching ward entitlements' });
    }
});

// Update ward entitlement rules (Admin only)
router.post('/ward-entitlements', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Forbidden' });
    }
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
        return res.status(400).json({ message: 'Invalid rules array' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM ward_entitlement_rules');
        for (const rule of rules) {
            await client.query(
                'INSERT INTO ward_entitlement_rules (min_pay, max_pay, ward_type) VALUES ($1, $2, $3)',
                [rule.min_pay, rule.max_pay, rule.ward_type]
            );
        }
        await client.query('COMMIT');
        client.release();
        res.json({ message: 'Ward entitlement rules updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        res.status(500).json({ message: 'Error updating ward entitlements' });
    }
});

// Create or Overwrite a claim (Draft or Pending)
router.post('/', authenticateToken, async (req, res) => {
    const { type_id, claim_name, claim_date, remarks, status, formData, htmlContent, save_mode, parent_claim_id, folder_name } = req.body;

    // SEC: Contingent bills (type_id=7) submitted by non-Admin users are ALWAYS Draft — never sent to admin
    const isAdmin = req.user.role === 'Admin';
    const isContingent = String(type_id) === '7';
    const finalStatus = (isContingent && !isAdmin) ? 'Draft' : (status === 'Pending' ? 'Pending' : 'Draft');
    const submittedAt = finalStatus === 'Pending' ? new Date() : null;

    let finalFolderName = folder_name || null;
    if (isContingent) {
        const trimmed = (folder_name || '').trim();
        if (trimmed === '') {
            finalFolderName = 'contingent';
        } else if (trimmed === 'contingent' || trimmed.startsWith('contingent/')) {
            finalFolderName = trimmed;
        } else {
            finalFolderName = `contingent/${trimmed}`;
        }
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        let claimId;
        let shouldOverwrite = false;
        let overwriteClaimId = null;
        let currentVersion = 1;

        if (finalStatus === 'Draft') {
            // Check if there is an existing draft with the same name for this user
            const existingDraft = await client.query(
                "SELECT id, version FROM claims WHERE user_id = $1 AND claim_name = $2 AND status = 'Draft'",
                [req.user.id, claim_name]
            );
            if (existingDraft.rows.length > 0) {
                shouldOverwrite = true;
                overwriteClaimId = existingDraft.rows[0].id;
                currentVersion = existingDraft.rows[0].version || 1;
            } else if (save_mode === 'overwrite' && parent_claim_id) {
                // If there's a parent_claim_id, check if the parent claim exists and is owned by the user
                const check = await client.query('SELECT version, claim_name FROM claims WHERE id = $1 AND user_id = $2', [parent_claim_id, req.user.id]);
                if (check.rows.length > 0) {
                    shouldOverwrite = true;
                    overwriteClaimId = parent_claim_id;
                    currentVersion = check.rows[0].version || 1;
                }
            }
        } else {
            // For pending claims, follow the save_mode / parent_claim_id
            if (save_mode === 'overwrite' && parent_claim_id) {
                const check = await client.query('SELECT version, claim_name FROM claims WHERE id = $1 AND user_id = $2', [parent_claim_id, req.user.id]);
                if (check.rows.length > 0) {
                    shouldOverwrite = true;
                    overwriteClaimId = parent_claim_id;
                    currentVersion = check.rows[0].version || 1;
                }
            }
        }

        if (shouldOverwrite) {
            const result = await client.query(
                `UPDATE claims 
                 SET status = $1, data = $2, claim_name = $3, claim_date = $4, remarks = $5, submitted_at = $6, version = $7, folder_name = $8, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $9 RETURNING id`,
                [finalStatus, formData, claim_name, claim_date, remarks, submittedAt, currentVersion + 1, finalFolderName, overwriteClaimId]
            );
            claimId = result.rows[0].id;

            // Audit Log
            const actionText = finalStatus === 'Pending' ? 'Claim Overwritten & Submitted' : 'Claim Overwritten & Saved as Draft';
            await client.query(
                `INSERT INTO audit_log (claim_id, user_id, action, remarks) VALUES ($1, $2, $3, $4)`,
                [claimId, req.user.id, actionText, `Version ${currentVersion + 1}`]
            );
        } else {
            // Save as New or Normal Create
            const result = await client.query(
                `INSERT INTO claims (user_id, type_id, status, data, claim_name, claim_date, remarks, submitted_at, parent_claim_id, folder_name) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
                [req.user.id, type_id, finalStatus, formData, claim_name, claim_date, remarks, submittedAt, parent_claim_id || null, finalFolderName]
            );
            claimId = result.rows[0].id;

            // Audit Log
            const actionText = finalStatus === 'Pending' ? 'Claim Submitted' : 'Claim Saved as Draft';
            await client.query(
                `INSERT INTO audit_log (claim_id, user_id, action, remarks) VALUES ($1, $2, $3, $4)`,
                [claimId, req.user.id, actionText, parent_claim_id ? `Saved as new from #${parent_claim_id}` : '']
            );
        }

        // Generate HTML content snapshot (only the actual claim template)
        // Read CSS to embed it for better portable viewing from file system
        let embeddedStyle = '';
        try {
            embeddedStyle = await fs.readFile(path.join(__dirname, '..', 'public', 'assets', 'style.css'), 'utf8');
        } catch (e) {
            console.error('Failed to read style.css for embedding:', e);
        }

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${claim_name}</title>
                <style>
                    ${embeddedStyle}
                    .no-print { display: none !important; }
                    input[type="time"]::-webkit-calendar-picker-indicator { display: none !important; }
                    .editable-td { word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: pre-wrap !important; }
                </style>
            </head>
            <body style="background: #f1f5f9; padding: 40px; display: flex; justify-content: center;">
                <div class="printable-area" style="background: white; padding: 40px; width: 210mm; min-height: 297mm; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin: 0 auto;">
                    ${req.body.htmlContent}
                </div>
            </body>
            </html>
        `;

        // Retrieve the owner's username to ensure it is saved in their folder
        const ownerRes = await client.query(
            'SELECT username FROM users WHERE id = (SELECT user_id FROM claims WHERE id = $1) OR id = $2',
            [claimId, req.user.id]
        );
        const ownerUsername = ownerRes.rows.length > 0 ? ownerRes.rows[0].username : req.user.username;

        // Save HTML File to storage
        const userStoragePath = path.join(__dirname, '..', 'server', 'storage', ownerUsername, 'claims');
        await fs.ensureDir(userStoragePath);
        let saveDir = userStoragePath;
        if (finalFolderName && finalFolderName.trim() !== '') {
            saveDir = path.join(userStoragePath, finalFolderName.trim());
            await fs.ensureDir(saveDir);
        }
        
        const filePath = path.join(saveDir, `${claimId}.html`);
        await fs.outputFile(filePath, html);

        // Record or Update the generated file in bill_files table
        const relativePath = path.join('storage', ownerUsername, 'claims', finalFolderName ? finalFolderName.trim() : '', `${claimId}.html`);
        
        const existingFile = await client.query('SELECT id FROM bill_files WHERE claim_id = $1 AND file_path LIKE $2', [claimId, '%.html']);
        if (existingFile.rows.length > 0) {
            await client.query('UPDATE bill_files SET file_path = $1 WHERE id = $2', [relativePath, existingFile.rows[0].id]);
        } else {
            await client.query(
                `INSERT INTO bill_files (claim_id, file_path) VALUES ($1, $2)`,
                [claimId, relativePath]
            );
        }

        // If Pending, generate forwarding note
        if (finalStatus === 'Pending') {
            const fwdNotePath = path.join(userStoragePath, `${claimId}_forwarding_note.txt`);
            const noteContent = `Forwarding Note for Claim #${claimId}\nName: ${ownerUsername}\nDate: ${new Date().toISOString()}`;
            await fs.outputFile(fwdNotePath, noteContent);
        }

        // Save Orders for Move, Move Date, Authority to employee table if provided
        const { orders_for_move, move_date, authority } = formData;
        if (orders_for_move || move_date || authority) {
            let updateQuery = 'UPDATE users SET ';
            const updateFields = [];
            const updateValues = [];
            let varIndex = 1;

            if (orders_for_move) { updateFields.push(`orders_for_move = $${varIndex++}`); updateValues.push(orders_for_move); }
            if (move_date) { updateFields.push(`move_date = $${varIndex++}`); updateValues.push(parseDateToISO(move_date)); }
            if (authority) { updateFields.push(`authority = $${varIndex++}`); updateValues.push(authority); }

            if (updateFields.length > 0) {
                updateQuery += updateFields.join(', ') + ` WHERE id = $${varIndex}`;
                updateValues.push(req.user.id);
                await client.query(updateQuery, updateValues);
            }
        }

        await client.query('COMMIT');
        client.release();
        res.status(201).json({ message: 'Claim saved', id: claimId });
    } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        console.error(err);
        res.status(500).json({ message: 'Error saving claim' });
    }
});

// Fetch user's claims
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, months, year, type_id } = req.query;
        let query = `
            SELECT c.*, t.name as type_name, t.folder_name as type_folder_name, u.username, bf.file_path 
            FROM claims c 
            JOIN claim_types t ON c.type_id = t.id 
            JOIN users u ON c.user_id = u.id
            LEFT JOIN bill_files bf ON bf.claim_id = c.id AND bf.file_path LIKE '%.html'
            WHERE c.user_id = $1 
        `;
        let params = [req.user.id];
        let pCount = 1;

        if (type_id) {
            query += ` AND c.type_id = $${++pCount}`;
            params.push(type_id);
        }

        if (year) {
            query += ` AND EXTRACT(YEAR FROM c.updated_at) = $${++pCount}`;
            params.push(year);
        } else {
            const m = parseInt(months) || 6;
            query += ` AND c.updated_at >= CURRENT_DATE - INTERVAL '${m} months'`;
        }

        if (status === 'Submitted') {
            query += " AND c.status != 'Draft'";
        } else if (status) {
            query += ` AND c.status = $${++pCount}`;
            params.push(status);
        }

        query += ' ORDER BY t.name ASC, c.updated_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching claims' });
    }
});

// Fetch a single claim
router.get('/:id', authenticateToken, async (req, res) => {
    if (isNaN(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    try {
        const result = await db.query(
            'SELECT c.*, t.folder_name as type_folder_name, t.name as type_name FROM claims c JOIN claim_types t ON c.type_id = t.id WHERE c.id = $1 AND c.user_id = $2',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Claim not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching claim' });
    }
});

// Delete Draft Claim (or Contingent Bill by Admin)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Fetch the claim to check ownership, type, and folder_name before deleting
        const claimRes = await db.query(
            'SELECT c.user_id, c.type_id, c.status, c.folder_name, u.username FROM claims c JOIN users u ON c.user_id = u.id WHERE c.id = $1',
            [req.params.id]
        );

        if (claimRes.rows.length === 0) {
            return res.status(404).json({ message: 'Claim not found or it does not exist' });
        }

        const claim = claimRes.rows[0];

        // Deletable statuses for claim owners:
        //   Draft, Returned, Rejected  — owner can delete
        //   Pending, Approved          — cannot be deleted by anyone except Admin for Contingent
        // Contingent bills (type_id=7):
        //   Draft                      — owner can delete
        //   Non-draft                  — Admin only
        const isContingent = claim.type_id === 7;
        const isAdmin = req.user.role === 'Admin';
        const isOwner = claim.user_id === req.user.id;
        const deletableStatuses = ['Draft', 'Returned', 'Rejected'];
        const isDeletableStatus = deletableStatuses.includes(claim.status);

        if (isContingent && claim.status !== 'Draft') {
            if (!isAdmin) {
                return res.status(403).json({ message: 'Only Admins can delete submitted Contingent Bills' });
            }
        } else if (!isOwner) {
            return res.status(403).json({ message: 'Cannot delete this claim' });
        } else if (!isDeletableStatus) {
            return res.status(403).json({ message: `Claims with status '${claim.status}' cannot be deleted` });
        }

        const folderName = claim.folder_name || '';

        const result = await db.query(
            'DELETE FROM claims WHERE id = $1 RETURNING id',
            [req.params.id]
        );

        // Also remove file
        const filePath = path.join(
            __dirname,
            '..',
            'server',
            'storage',
            claim.username,
            'claims',
            folderName.trim(),
            `${req.params.id}.html`
        );
        if (await fs.pathExists(filePath)) {
            await fs.unlink(filePath);
        }

        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error('Error deleting draft/contingent claim:', err);
        res.status(500).json({ message: 'Error deleting claim' });
    }
});

// Export claim as DOCX
router.get('/:id/docx', authenticateToken, async (req, res) => {
    try {
        const HTMLtoDOCX = require('html-to-docx');

        // Find the claim
        const result = await db.query('SELECT c.*, u.username FROM claims c JOIN users u ON c.user_id = u.id WHERE c.id = $1 AND (c.user_id = $2 OR $3 = \'Admin\')', [req.params.id, req.user.id, req.user.role]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Claim not found' });
        const claim = result.rows[0];

        const filePath = path.join(__dirname, '..', 'server', 'storage', claim.username, 'claims', `${claim.id}.html`);
        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ message: 'HTML file not found' });
        }

        const htmlString = await fs.readFile(filePath, 'utf8');

        const fileBuffer = await HTMLtoDOCX(htmlString, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=Claim_${claim.id}.docx`);
        res.send(fileBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error generating docx' });
    }
});

module.exports = router;
