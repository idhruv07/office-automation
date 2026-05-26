const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const upload = multer({ dest: '/tmp/oa_uploads' });
const db = require('../config/db');
const { authenticateToken, authorizeRole } = require('./middleware');

router.post('/users', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    const { username, password, name, designation, email, personal_no, role_name, gender } = req.body;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const passwordHash = await bcrypt.hash(password, 12);
        
        // Get role id
        const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [role_name || 'Individual']);
        if (roleRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Invalid role' });
        }
        const roleId = roleRes.rows[0].id;

        const storagePath = `/storage/${username}/`;

        const result = await client.query(
            'INSERT INTO users (username, password_hash, name, designation, email, personal_no, role_id, gender, storage_path, must_reset_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING id',
            [username, passwordHash, name, designation, email, personal_no, roleId, gender || 'Male', storagePath]
        );

        // Create storage directories
        const userStoragePath = path.join(__dirname, '..', 'server', 'storage', username);
        await fs.ensureDir(path.join(userStoragePath, 'bills'));
        await fs.ensureDir(path.join(userStoragePath, 'claims'));

        await client.query('COMMIT');
        res.status(201).json({ message: 'User created successfully', userId: result.rows[0].id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Error creating user' });
    } finally {
        client.release();
    }
});

// Get active users
router.get('/users', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.username, u.name, u.designation, u.email, u.personal_no, u.cghs_ben_id, u.gender, r.name as role_name, u.created_at, u.last_login_at, u.last_active_at, u.is_active
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Update user active status (Toggle)
router.put('/users/:id/status', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    const userId = req.params.id;
    const { is_active } = req.body;
    
    try {
        await db.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, userId]);
        res.json({ message: 'User status updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error updating user status' });
    }
});

// Update user details
router.put('/users/:id', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    const userId = req.params.id;
    const { name, designation, email, personal_no, gender, role_name } = req.body;
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // Get role id
        const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [role_name || 'Individual']);
        if (roleRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Invalid role' });
        }
        const roleId = roleRes.rows[0].id;
        
        await client.query(
            'UPDATE users SET name = $1, designation = $2, email = $3, personal_no = $4, gender = $5, role_id = $6 WHERE id = $7',
            [name, designation, email, personal_no, gender || 'Male', roleId, userId]
        );
        
        await client.query('COMMIT');
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Error updating user details' });
    } finally {
        client.release();
    }
});


// Get all claims (grouped by type, sorted by submitted_at DESC)
router.get('/claims', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const { status, months, year, type_id, period, from_date, to_date } = req.query;
        let query = `
            SELECT c.*, t.name as type_name, t.folder_name as type_folder_name, u.username, u.name as user_name, u.designation, u.personal_no, u.gender, bf.file_path 
            FROM claims c 
            JOIN claim_types t ON c.type_id = t.id 
            JOIN users u ON c.user_id = u.id
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN bill_files bf ON bf.claim_id = c.id AND bf.file_path LIKE '%.html'
        `;
        if (type_id === '7') {
            // Contingent bills: only Admin-role users; never show individual submissions
            query += " WHERE c.type_id = 7 AND r.name = 'Admin'";
        } else {
            query += " WHERE c.status != 'Draft' AND c.type_id != 7";
        }

        let params = [];
        let pCount = 0;

        if (type_id) {
            query += ` AND c.type_id = $${++pCount}`;
            params.push(type_id);
        }

        // Period filter: period=5d | 3w | 1m  OR  from_date + to_date for custom
        if (from_date && to_date) {
            query += ` AND DATE(c.submitted_at) BETWEEN $${++pCount} AND $${++pCount}`;
            params.push(from_date, to_date);
        } else if (period) {
            const intervalMap = { '5d': '5 days', '3w': '21 days', '1m': '1 month' };
            const interval = intervalMap[period] || '5 days';
            query += ` AND (c.submitted_at IS NULL OR c.submitted_at >= CURRENT_DATE - INTERVAL '${interval}')`;
        } else if (year && year !== '') {
            query += ` AND (c.submitted_at IS NULL OR EXTRACT(YEAR FROM c.submitted_at) = $${++pCount})`;
            params.push(parseInt(year));
        } else {
            // legacy default fallback — last 6 months
            const m = parseInt(months) || 6;
            query += ` AND (c.submitted_at IS NULL OR c.submitted_at >= CURRENT_DATE - INTERVAL '1 month' * $${++pCount})`;
            params.push(m);
        }

        if (status && status !== '') {
            query += ` AND TRIM(c.status) = $${++pCount}`;
            params.push(status);
        }

        query += ' ORDER BY t.name ASC, c.submitted_at DESC';
        console.log('DEBUG ADMIN CLAIMS QUERY:', query);
        console.log('DEBUG ADMIN CLAIMS PARAMS:', params);

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('FETCH CLAIMS ERROR:', err);
        res.status(500).json({ message: 'Error fetching claims' });
    }
});

// Update claim status (Approve/Reject/Return)
router.put('/claims/:id/status', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    const { status, remarks } = req.body;
    const claimId = req.params.id;

    try {
        await db.query('BEGIN');
        
        const updateRes = await db.query(
            'UPDATE claims SET status = $1, remarks = $2, decided_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id',
            [status, remarks || '', claimId]
        );

        if (updateRes.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ message: 'Claim not found' });
        }

        // Audit Log
        const actionText = `Claim ${status}`;
        await db.query(
            `INSERT INTO audit_log (claim_id, user_id, action, remarks) VALUES ($1, $2, $3, $4)`,
            [claimId, req.user.id, actionText, remarks || '']
        );

        await db.query('COMMIT');
        res.json({ message: `Claim updated to ${status}` });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Error updating claim status' });
    }
});

// Save Forwarding Note
router.post('/claims/:id/fwd-note', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    const claimId = req.params.id;
    const { htmlContent } = req.body;
    
    try {
        const result = await db.query('SELECT u.username FROM claims c JOIN users u ON c.user_id = u.id WHERE c.id = $1', [claimId]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Claim not found' });
        
        const username = result.rows[0].username;
        const fwdNotePath = path.join(__dirname, '..', 'server', 'storage', username, 'claims', `${claimId}_forwarding_note.html`);
        
        await fs.writeFile(fwdNotePath, htmlContent);
        res.json({ message: 'Forwarding note saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error saving forwarding note' });
    }
});

// Save Multi-Forwarding Note to multiple claims
router.post('/claims/multi-fwd-note', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    const { claimIds, htmlContent } = req.body;
    if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
        return res.status(400).json({ message: 'No claims selected' });
    }
    
    try {
        // Fetch usernames for all provided claim IDs
        const query = 'SELECT c.id, u.username FROM claims c JOIN users u ON c.user_id = u.id WHERE c.id = ANY($1::int[])';
        const result = await db.query(query, [claimIds]);
        
        // Save the same note to each individual's directory
        const savePromises = result.rows.map(row => {
            const fwdNotePath = path.join(__dirname, '..', 'server', 'storage', row.username, 'claims', `${row.id}_forwarding_note.html`);
            return fs.outputFile(fwdNotePath, htmlContent);
        });
        
        await Promise.all(savePromises);
        res.json({ message: 'Multi-Forwarding note saved against all selected individuals' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error saving multi-forwarding note' });
    }
});

// Add claim type
router.post('/claim-types', authenticateToken, authorizeRole('Admin'), upload.single('templateFile'), async (req, res) => {
    const { name, is_active } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const active = is_active === 'true' || is_active === true;
    
    try {
        await db.query('BEGIN');
        
        // Check if exists
        const exists = await db.query('SELECT id FROM claim_types WHERE name = $1 OR folder_name = $2', [name, slug]);
        if (exists.rows.length > 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({ message: 'Claim type with this name or slug already exists' });
        }
        
        const result = await db.query(
            'INSERT INTO claim_types (name, folder_name, is_active) VALUES ($1, $2, $3) RETURNING id',
            [name, slug, active]
        );
        
        // Handle folder creation and file save
        const folderPath = path.join(__dirname, '..', 'public', 'claims', slug);
        await fs.ensureDir(folderPath);
        
        if (req.file) {
            await fs.move(req.file.path, path.join(folderPath, 'template.html'), { overwrite: true });
        } else {
            await db.query('ROLLBACK');
            return res.status(400).json({ message: 'Template HTML file is required' });
        }

        await db.query('COMMIT');
        res.status(201).json({ message: 'Claim type created successfully' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Error creating claim type' });
    }
});

// Get all claim types for Admin
router.get('/claim-types', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM claim_types ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching claim types' });
    }
});

// Toggle claim type active status
router.put('/claim-types/:id/toggle', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE claim_types SET is_active = NOT is_active WHERE id = $1 RETURNING is_active',
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Claim type not found' });
        res.json({ message: 'Status toggled', is_active: result.rows[0].is_active });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error toggling status' });
    }
});

// Get a specific user's full profile (Admin only)
router.get('/users/:id', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const userRes = await db.query(
            'SELECT id, username, name, designation, email, personal_no, role_id, cghs_ben_id, address, mobile_no, basic_pay, pay_level, orders_for_move, TO_CHAR(move_date, \'YYYY-MM-DD\') as move_date, authority, gpf_ac_no, theme_pref, gender FROM users WHERE id = $1',
            [req.params.id]
        );
        if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        const user = userRes.rows[0];

        const depResult = await db.query('SELECT * FROM dependents WHERE user_id = $1', [req.params.id]);
        user.dependents = depResult.rows;

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching user profile' });
    }
});

// Get a specific user's avatar (Admin only)
router.get('/users/:id/avatar', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const result = await db.query('SELECT username FROM users WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
        
        const username = result.rows[0].username;
        const avatarPath = path.join(__dirname, '..', 'server', 'storage', username, 'avatar.jpg');
        if (fs.existsSync(avatarPath)) {
            res.sendFile(avatarPath);
        } else {
            res.status(404).send('No avatar found');
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching avatar' });
    }
});

// ── OFFICE CONFIG ──────────────────────────────────────────────────────────────

// GET current office config (used by fwd_note.js on every page load — any authenticated user)
router.get('/office-config', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM office_config ORDER BY id DESC LIMIT 1');
        res.json(result.rows[0] || {});
    } catch (err) {
        console.error('GET office-config error:', err);
        res.status(500).json({ message: 'Error fetching office config' });
    }
});

// POST to update office config (Admin only)
router.post('/office-config', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    const {
        office_name, office_address, office_sub_address, city_state_pin,
        phone, email, fwd_ref_no, signatory_name, signatory_dept,
        logo_left_url, logo_right_url
    } = req.body;

    if (!office_name || !office_address) {
        return res.status(400).json({ message: 'Office name and address are required.' });
    }

    try {
        await db.query(
            `INSERT INTO office_config
              (office_name, office_address, office_sub_address, city_state_pin,
               phone, email, fwd_ref_no, signatory_name, signatory_dept,
               logo_left_url, logo_right_url, updated_by, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
            [
                office_name, office_address, office_sub_address || null, city_state_pin || null,
                phone || null, email || null, fwd_ref_no || null,
                signatory_name || null, signatory_dept || null,
                logo_left_url || null, logo_right_url || null,
                req.user.id
            ]
        );
        res.json({ message: 'Office config saved successfully.' });
    } catch (err) {
        console.error('POST office-config error:', err);
        res.status(500).json({ message: 'Error saving office config' });
    }
});

// ── FWD TEMPLATES ──────────────────────────────────────────────────────────────

const fwdTemplatesDir = path.join(__dirname, '..', 'server', 'storage', 'fwd_templates');
// Ensure the directory exists when the module loads
fs.ensureDir(fwdTemplatesDir).catch(err => console.error('Could not create fwd_templates dir:', err));

// List all saved FWD templates
router.get('/fwd-templates', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const result = await db.query(
            `SELECT ft.*, u.name as created_by_name
             FROM fwd_templates ft
             LEFT JOIN users u ON ft.created_by = u.id
             ORDER BY ft.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('GET fwd-templates error:', err);
        res.status(500).json({ message: 'Error fetching FWD templates' });
    }
});

// Save or Update a FWD template
router.post('/fwd-templates', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    const { template_id, template_name, folder_name, description, htmlContent } = req.body;
    if (!template_name || !htmlContent) {
        return res.status(400).json({ message: 'Template name and content are required.' });
    }

    try {
        await fs.ensureDir(fwdTemplatesDir);
        let finalId;
        const finalFolder = folder_name || 'General';

        if (template_id) {
            // Update existing template
            await db.query(
                `UPDATE fwd_templates 
                 SET template_name=$1, folder_name=$2, description=$3
                 WHERE id=$4`,
                [template_name, finalFolder, description || null, template_id]
            );
            finalId = template_id;
        } else {
            // Insert new template
            const result = await db.query(
                `INSERT INTO fwd_templates (template_name, folder_name, description, file_path, created_by)
                 VALUES ($1, $2, $3, 'pending', $4) RETURNING id`,
                [template_name, finalFolder, description || null, req.user.id]
            );
            finalId = result.rows[0].id;
        }

        const filePath = path.join(fwdTemplatesDir, `${finalId}.html`);
        const relativePath = `storage/fwd_templates/${finalId}.html`;

        await fs.writeFile(filePath, htmlContent);
        
        if (!template_id) {
            await db.query('UPDATE fwd_templates SET file_path=$1 WHERE id=$2', [relativePath, finalId]);
        }

        res.json({ message: template_id ? 'Template overwritten successfully.' : 'Template saved successfully.', id: finalId });
    } catch (err) {
        console.error('POST fwd-templates error:', err);
        res.status(500).json({ message: 'Error saving FWD template' });
    }
});

// Serve a FWD template file for preview
router.get('/fwd-templates/:id/file', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const result = await db.query('SELECT file_path FROM fwd_templates WHERE id=$1', [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ message: 'Template not found' });
        const fullPath = path.join(__dirname, '..', 'server', result.rows[0].file_path);
        if (!await fs.pathExists(fullPath)) return res.status(404).json({ message: 'File not found on disk' });
        res.sendFile(fullPath);
    } catch (err) {
        console.error('GET fwd-templates/:id/file error:', err);
        res.status(500).json({ message: 'Error serving template file' });
    }
});

// Delete a FWD template
router.delete('/fwd-templates/:id', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const result = await db.query('SELECT file_path FROM fwd_templates WHERE id=$1', [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ message: 'Template not found' });
        const fullPath = path.join(__dirname, '..', 'server', result.rows[0].file_path);
        await fs.remove(fullPath).catch(() => {}); // silently ignore if already gone
        await db.query('DELETE FROM fwd_templates WHERE id=$1', [req.params.id]);
        res.json({ message: 'Template deleted successfully.' });
    } catch (err) {
        console.error('DELETE fwd-templates/:id error:', err);
        res.status(500).json({ message: 'Error deleting FWD template' });
    }
});

// ─── Claim-Type Reference Numbers ───────────────────────────────────────────

// GET all claim types with their current active ref_no
router.get('/claim-ref-nos', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        // For each claim type, get the ref_no with the latest valid_from <= today
        const result = await db.query(`
            SELECT
                ct.id           AS claim_type_id,
                ct.name         AS claim_type_name,
                r.id            AS ref_id,
                r.ref_no,
                r.valid_from,
                r.created_at,
                u.name          AS set_by
            FROM claim_types ct
            LEFT JOIN LATERAL (
                SELECT cr.id, cr.ref_no, cr.valid_from, cr.created_at, cr.created_by
                FROM claim_type_ref_nos cr
                WHERE cr.claim_type_id = ct.id
                  AND cr.valid_from <= CURRENT_DATE
                ORDER BY cr.valid_from DESC, cr.created_at DESC
                LIMIT 1
            ) r ON true
            LEFT JOIN users u ON u.id = r.created_by
            ORDER BY ct.name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('GET claim-ref-nos error:', err);
        res.status(500).json({ message: 'Error fetching reference numbers' });
    }
});

// GET history for a specific claim type
router.get('/claim-ref-nos/:claim_type_id/history', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT cr.id, cr.ref_no, cr.valid_from, cr.created_at, u.name AS set_by
            FROM claim_type_ref_nos cr
            LEFT JOIN users u ON u.id = cr.created_by
            WHERE cr.claim_type_id = $1
            ORDER BY cr.valid_from DESC, cr.created_at DESC
        `, [req.params.claim_type_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching history' });
    }
});

// POST — set a new ref_no for a claim type (valid from today)
router.post('/claim-ref-nos', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    const { claim_type_id, ref_no, valid_from } = req.body;
    if (!claim_type_id || !ref_no || !ref_no.trim()) {
        return res.status(400).json({ message: 'claim_type_id and ref_no are required' });
    }
    try {
        const validDate = valid_from || new Date().toISOString().slice(0, 10);
        const result = await db.query(`
            INSERT INTO claim_type_ref_nos (claim_type_id, ref_no, valid_from, created_by)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [claim_type_id, ref_no.trim(), validDate, req.user.id]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('POST claim-ref-nos error:', err);
        res.status(500).json({ message: 'Error saving reference number' });
    }
});

// GET current active ref_no for a specific claim type (used by fwd_note.js)
router.get('/claim-ref-nos/:claim_type_id/current', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT ref_no, valid_from
            FROM claim_type_ref_nos
            WHERE claim_type_id = $1
              AND valid_from <= CURRENT_DATE
            ORDER BY valid_from DESC, created_at DESC
            LIMIT 1
        `, [req.params.claim_type_id]);
        if (result.rows.length === 0) return res.json({ ref_no: null });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching current ref no' });
    }
});

module.exports = router;

