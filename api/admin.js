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
            SELECT u.id, u.username, u.name, u.designation, u.email, u.personal_no, u.cghs_ben_id, u.gender, r.name as role_name, u.created_at, u.last_login_at, u.last_active_at
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

// Get all claims (grouped by type, sorted by submitted_at DESC)
router.get('/claims', authenticateToken, authorizeRole('Admin'), async (req, res) => {
    try {
        const { status, months, year, type_id } = req.query;
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

        if (year && year !== '') {
            query += ` AND (c.submitted_at IS NULL OR EXTRACT(YEAR FROM c.submitted_at) = $${++pCount})`;
            params.push(parseInt(year));
        } else {
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

module.exports = router;
