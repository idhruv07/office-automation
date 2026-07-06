const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { resolvePermission } = require('./lib/permissions');

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
        const userRole = req.user.role;
        const isAuthorized = 
            userRole === roleName || 
            (roleName === 'Admin' && userRole === 'SysAdmin') ||
            (roleName === 'SysAdmin' && userRole === 'Admin');

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};

/**
 * authorizeRoleCode — accepts an array of role codes (e.g. ['SYSADMIN', 'OFFICE_ADMIN'])
 * and checks the user's actual role code from the DB (not the JWT claim) for security.
 */
const authorizeRoleCode = (allowedCodes) => {
    return async (req, res, next) => {
        try {
            const result = await db.query(
                'SELECT r.code FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
                [req.user.id]
            );
            if (result.rows.length === 0) return res.status(403).json({ message: 'Forbidden' });
            const code = result.rows[0].code;
            if (!allowedCodes.includes(code)) {
                return res.status(403).json({ message: 'Forbidden: insufficient role' });
            }
            req.user.roleCode = code;
            next();
        } catch (err) {
            console.error('authorizeRoleCode error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    };
};

/**
 * authorizeMinRank — allows access if the user's rank is <= the specified threshold
 * Lower rank number = higher authority (SYSADMIN=1, AUDITOR=8)
 */
const authorizeMinRank = (maxRankAllowed) => {
    return async (req, res, next) => {
        try {
            const result = await db.query(
                'SELECT r.rank, r.code FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
                [req.user.id]
            );
            if (result.rows.length === 0) return res.status(403).json({ message: 'Forbidden' });
            const { rank, code } = result.rows[0];
            if (code === 'INDIVIDUAL' || rank > maxRankAllowed) {
                return res.status(403).json({ message: 'Forbidden: insufficient rank' });
            }
            req.user.roleCode = code;
            req.user.rank = rank;
            next();
        } catch (err) {
            console.error('authorizeMinRank error:', err);
            res.status(500).json({ message: 'Server error' });
        }
    };
};

module.exports = { authenticateToken, authorizeRole, authorizeRoleCode, authorizeMinRank };
