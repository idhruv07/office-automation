const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query(
            'SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = $1',
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

        const expiresIn = user.role_name === 'Admin' ? '12h' : '8h';

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role_name, must_reset: user.must_reset_password },
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
            usezrname: user.username,
            must_reset_password: user.must_reset_password
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/me', require('./middleware').authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, name, designation, email, personal_no, role_id, cghs_ben_id, address, mobile_no, basic_pay, pay_level, orders_for_move, TO_CHAR(move_date, \'YYYY-MM-DD\') as move_date, authority FROM users WHERE id = $1', [req.user.id]);
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
    const { cghs_ben_id, address, mobile_no, email, basic_pay, pay_level } = req.body;
    try {
        const cleanCghsBenId = cghs_ben_id && cghs_ben_id.trim() !== '' ? cghs_ben_id.trim() : null;
        const cleanAddress = address && address.trim() !== '' ? address.trim() : null;
        const cleanMobileNo = mobile_no && mobile_no.trim() !== '' ? mobile_no.trim() : null;
        const cleanEmail = email && email.trim() !== '' ? email.trim() : null;
        const cleanBasicPay = basic_pay && basic_pay.trim() !== '' ? basic_pay.trim() : null;
        const cleanPayLevel = pay_level && pay_level.trim() !== '' ? pay_level.trim() : null;

        await db.query(
            'UPDATE users SET cghs_ben_id = $1, address = $2, mobile_no = $3, email = $4, basic_pay = $6, pay_level = $7 WHERE id = $5',
            [cleanCghsBenId, cleanAddress, cleanMobileNo, cleanEmail, req.user.id, cleanBasicPay, cleanPayLevel]
        );
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

router.get('/menu', require('./middleware').authenticateToken, async (req, res) => {
    try {
        const userResult = await db.query('SELECT r.permissions, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [req.user.id]);
        if (userResult.rows.length === 0) {
            console.log('Menu API: User/Role not found for ID', req.user.id);
            return res.json([]);
        }

        let permissions = userResult.rows[0].permissions || {};
        const roleName = userResult.rows[0].role_name;
        console.log(`Menu API: Fetching menu for user ${req.user.id} (${roleName})`);

        if (typeof permissions === 'string') {
            try { permissions = JSON.parse(permissions); } catch (e) { permissions = {}; }
        }

        const menuResult = await db.query('SELECT * FROM menu_items ORDER BY display_order ASC');
        const items = menuResult.rows;
        console.log(`Menu API: Total menu items in DB: ${items.length}`);

        const filteredMenu = items.filter(item => {
            const reqPerm = item.permission_required;
            if (!reqPerm || (typeof reqPerm === 'string' && reqPerm.trim() === '')) return true;
            const hasPerm = permissions[reqPerm] === true;
            return hasPerm;
        });

        console.log(`Menu API: Returning ${filteredMenu.length} items`);
        res.json(filteredMenu);
    } catch (err) {
        console.error('Menu API error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
