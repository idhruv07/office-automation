const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        db.query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [user.id])
            .catch(err => console.error('Activity update failed:', err));
        next();
    });
};

const authorizeRole = (roleName) => {
    return (req, res, next) => {
        if (req.user.role !== roleName) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRole };
