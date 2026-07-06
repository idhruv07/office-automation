const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userDir = path.join(__dirname, '..', 'server', 'storage', req.user.username);
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'avatar.jpg');
    }
});
const upload = multer({ storage: storage });

router.post('/avatar', require('./middleware').authenticateToken, upload.single('avatar'), (req, res) => {
    res.json({ message: 'Profile photo updated successfully' });
});

router.get('/avatar', require('./middleware').authenticateToken, (req, res) => {
    const avatarPath = path.join(__dirname, '..', 'server', 'storage', req.user.username, 'avatar.jpg');
    if (fs.existsSync(avatarPath)) {
        res.sendFile(avatarPath);
    } else {
        res.status(404).json({ message: 'Avatar not found' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query(
            'SELECT u.*, r.name as role_name, r.code as role_code, r.rank as rank FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        // For development/initial seed, we might have plain text or placeholders. 
        // Real production would use bcrypt.compare(password, user.password_hash)
        // Let's assume bcrypt for now.
        const validPassword = await bcrypt.compare(password, user.password_hash).catch(() => password === user.password_hash); // Fallback for simple seeds

        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const expiresIn = user.role_code === 'SYSADMIN' ? '12h' : '8h';

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role_name, roleCode: user.role_code, rank: user.rank, must_reset: user.must_reset_password },
            process.env.JWT_SECRET,
            { expiresIn }
        );

        await db.query(
            'UPDATE users SET last_login_at = NOW(), last_active_at = NOW() WHERE id = $1',
            [user.id]
        );

        res.json({
            token,
            role: user.role_name,
            username: user.username,
            must_reset_password: user.must_reset_password,
            theme_pref: user.theme_pref
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', require('./middleware').authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, name, designation, email, personal_no, role_id, cghs_ben_id, address, mobile_no, basic_pay, pay_level, orders_for_move, TO_CHAR(move_date, \'YYYY-MM-DD\') as move_date, authority, gpf_ac_no, theme_pref FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = result.rows[0];
        const depResult = await db.query('SELECT * FROM dependents WHERE user_id = $1', [req.user.id]);
        user.dependents = depResult.rows;

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/profile', require('./middleware').authenticateToken, async (req, res) => {
    try {
        const allowedFields = ['cghs_ben_id', 'address', 'mobile_no', 'email', 'basic_pay', 'pay_level', 'gpf_ac_no'];
        const updates = [];
        const values = [];
        let index = 1;

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = $${index}`);
                const val = req.body[field];
                values.push(val && String(val).trim() !== '' ? String(val).trim() : null);
                index++;
            }
        }

        if (updates.length > 0) {
            values.push(req.user.id);
            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${index}`;
            await db.query(query, values);
        }
        res.json({ message: 'Profile updated' });
    } catch (err) {
        console.error('Profile update failed:', err);
        if (err.code === '23505') {
            return res.status(400).json({ message: 'Email address is already in use by another user' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/dependents', require('./middleware').authenticateToken, async (req, res) => {
    const { id, name, relationship, cghs_ben_id, dob } = req.body;
    try {
        if (id) {
            await db.query(
                'UPDATE dependents SET name=$1, relationship=$2, cghs_ben_id=$3, dob=$4 WHERE id=$5 AND user_id=$6',
                [name, relationship, cghs_ben_id || null, dob || null, id, req.user.id]
            );
        } else {
            await db.query(
                'INSERT INTO dependents (user_id, name, relationship, cghs_ben_id, dob) VALUES ($1, $2, $3, $4, $5)',
                [req.user.id, name, relationship, cghs_ben_id || null, dob || null]
            );
        }
        res.json({ message: 'Dependent saved' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/dependents/:id', require('./middleware').authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM dependents WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
        res.json({ message: 'Dependent deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/change-password', require('./middleware').authenticateToken, async (req, res) => {
    const { newPassword } = req.body;
    try {
        const passwordHash = await bcrypt.hash(newPassword, 12);
        await db.query(
            'UPDATE users SET password_hash = $1, must_reset_password = false WHERE id = $2',
            [passwordHash, req.user.id]
        );
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/theme', require('./middleware').authenticateToken, async (req, res) => {
    try {
        const { theme } = req.body;
        await db.query('UPDATE users SET theme_pref = $1 WHERE id = $2', [theme || '', req.user.id]);
        res.json({ message: 'Theme updated successfully' });
    } catch (err) {
        console.error('Update theme error:', err);
        res.status(500).json({ message: 'Server error updating theme' });
    }
});

router.get('/menu', require('./middleware').authenticateToken, async (req, res) => {
    try {
        const userResult = await db.query('SELECT r.permissions, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [req.user.id]);
        if (userResult.rows.length === 0) return res.json([]);

        let permissions = userResult.rows[0].permissions || {};
        const roleName = userResult.rows[0].role_name;
        console.log(`Menu API: Fetching menu for user ${req.user.id} (${roleName})`);

        if (typeof permissions === 'string') {
            try { permissions = JSON.parse(permissions); } catch (e) { permissions = {}; }
        }

        const menuResult = await db.query('SELECT * FROM menu_items ORDER BY display_order ASC');
        const allItems = menuResult.rows;

        // Filter items the user has permission to see
        const allowed = allItems.filter(item => {
            const reqPerm = item.permission_required;
            if (!reqPerm || reqPerm.trim() === '') return true;
            return permissions[reqPerm] === true;
        });

        const allowedIds = new Set(allowed.map(i => i.id));

        // Build nested tree: top-level items with children array
        const topLevel = allowed
            .filter(i => !i.parent_id)
            .map(i => ({ ...i, children: [] }));

        const topMap = new Map(topLevel.map(i => [i.id, i]));

        // Attach children to parents
        allowed
            .filter(i => i.parent_id && topMap.has(i.parent_id))
            .forEach(i => topMap.get(i.parent_id).children.push(i));

        // Remove group-headers that have no visible children after filtering
        const tree = topLevel.filter(i => i.link !== '#' || i.children.length > 0);

        console.log(`Menu API: Returning ${tree.length} top-level items`);
        res.json(tree);
    } catch (err) {
        console.error('Menu API error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
