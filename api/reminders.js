const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const db = require('../config/db');
const { authenticateToken } = require('./middleware');

// Configure Multer for attachments
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const username = req.user.username;
        const uploadDir = path.join(__dirname, '..', 'server', 'storage', username, 'reminders');
        await fs.ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `ref-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ storage });

// Helper to compute next recurrence due date
function computeNextDueDate(currentDueDate, recurrenceRule, endCondition) {
    if (!recurrenceRule || !recurrenceRule.type || recurrenceRule.type === 'none') {
        return null; // No recurrence
    }

    const current = new Date(currentDueDate);
    let next = new Date(current);

    const type = recurrenceRule.type; // 'daily', 'weekly', 'monthly', 'custom'
    const interval = parseInt(recurrenceRule.interval || 1);

    if (type === 'daily') {
        next.setDate(next.getDate() + interval);
    } else if (type === 'weekly') {
        // If specific days are selected (e.g. ['Mon', 'Wed'])
        if (Array.isArray(recurrenceRule.days) && recurrenceRule.days.length > 0) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const targetDayIndices = recurrenceRule.days.map(d => dayNames.findIndex(dn => dn.toLowerCase().startsWith(d.toLowerCase()))).filter(i => i !== -1);
            
            if (targetDayIndices.length > 0) {
                let found = false;
                for (let i = 1; i <= 14; i++) {
                    const checkDate = new Date(current);
                    checkDate.setDate(checkDate.getDate() + i);
                    if (targetDayIndices.includes(checkDate.getDay())) {
                        next = checkDate;
                        found = true;
                        break;
                    }
                }
                if (!found) next.setDate(next.getDate() + (7 * interval));
            } else {
                next.setDate(next.getDate() + (7 * interval));
            }
        } else {
            next.setDate(next.getDate() + (7 * interval));
        }
    } else if (type === 'monthly') {
        if (recurrenceRule.relativeRule === 'last_friday') {
            // Find last Friday of next month
            next.setMonth(next.getMonth() + interval + 1, 0); // Last day of month
            while (next.getDay() !== 5) { // 5 = Friday
                next.setDate(next.getDate() - 1);
            }
        } else {
            const dayOfMonth = parseInt(recurrenceRule.dayOfMonth || current.getDate());
            next.setMonth(next.getMonth() + interval);
            next.setDate(Math.min(dayOfMonth, 28)); // Safe day clamp
        }
    } else if (type === 'custom') {
        const unit = recurrenceRule.unit || 'days'; // 'days', 'weeks', 'months'
        if (unit === 'days') next.setDate(next.getDate() + interval);
        else if (unit === 'weeks') next.setDate(next.getDate() + (7 * interval));
        else if (unit === 'months') next.setMonth(next.getMonth() + interval);
    }

    // Check end condition
    if (endCondition) {
        if (endCondition.type === 'until_date' && endCondition.date) {
            const endDate = new Date(endCondition.date);
            if (next > endDate) return null;
        } else if (endCondition.type === 'count') {
            const remaining = parseInt(endCondition.remaining || 0) - 1;
            if (remaining <= 0) return null;
            endCondition.remaining = remaining; // Decrement counter
        }
    }

    return next;
}

// 1. GET /api/reminders/users - List active users for assignee dropdown
router.get('/users', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, name, designation, personal_no, username 
            FROM users 
            WHERE is_active = TRUE OR is_active IS NULL 
            ORDER BY name ASC
        `);
        const users = result.rows.map(u => ({
            id: u.id,
            name: u.name || u.username,
            designation: u.designation || 'Staff',
            personal_no: u.personal_no || 'N/A',
            label: `${u.designation ? u.designation + ' - ' : ''}${u.name || u.username}${u.personal_no ? ' (' + u.personal_no + ')' : ''}`
        }));
        res.json(users);
    } catch (err) {
        console.error('[Reminders] Error fetching user list:', err);
        res.status(500).json({ error: 'Failed to fetch user list' });
    }
});

// 2. GET /api/reminders/dashboard - Top 5 upcoming & overdue reminders for user
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT DISTINCT r.id, r.title, r.description, r.due_date, r.urgency, r.status, r.created_by,
                   u.name as creator_name
            FROM report_reminders r
            LEFT JOIN reminder_assignees a ON r.id = a.reminder_id
            LEFT JOIN users u ON r.created_by = u.id
            WHERE (r.created_by = $1 OR a.assignee_id = $1)
              AND r.status = 'Pending'
            ORDER BY r.due_date ASC
            LIMIT 5
        `;
        const result = await db.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('[Reminders] Error fetching dashboard reminders:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard reminders' });
    }
});

// 3. GET /api/reminders - List reminders by tab
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const tab = req.query.tab || 'upcoming'; // 'upcoming', 'overdue', 'completed', 'delegated'

        let condition = '';
        const now = new Date().toISOString();

        if (tab === 'upcoming') {
            condition = `(r.created_by = $1 OR a.assignee_id = $1) AND r.status = 'Pending' AND r.due_date >= '${now}'`;
        } else if (tab === 'overdue') {
            condition = `(r.created_by = $1 OR a.assignee_id = $1) AND r.status = 'Pending' AND r.due_date < '${now}'`;
        } else if (tab === 'completed') {
            condition = `(r.created_by = $1 OR a.assignee_id = $1) AND r.status = 'Completed'`;
        } else if (tab === 'delegated') {
            condition = `r.created_by = $1 AND EXISTS (SELECT 1 FROM reminder_assignees ra WHERE ra.reminder_id = r.id AND ra.assignee_id != $1)`;
        } else {
            condition = `(r.created_by = $1 OR a.assignee_id = $1)`;
        }

        const query = `
            SELECT r.*, u.name as creator_name,
                   COALESCE(
                       json_agg(DISTINCT jsonb_build_object('id', au.id, 'name', au.name, 'designation', au.designation))
                       FILTER (WHERE au.id IS NOT NULL), '[]'
                   ) as assignees,
                   COALESCE(
                       json_agg(DISTINCT jsonb_build_object('id', att.id, 'file_path', att.file_path, 'original_name', att.original_name))
                       FILTER (WHERE att.id IS NOT NULL), '[]'
                   ) as attachments
            FROM report_reminders r
            LEFT JOIN reminder_assignees a ON r.id = a.reminder_id
            LEFT JOIN users au ON a.assignee_id = au.id
            LEFT JOIN users u ON r.created_by = u.id
            LEFT JOIN reminder_attachments att ON r.id = att.reminder_id
            WHERE ${condition}
            GROUP BY r.id, u.name
            ORDER BY r.due_date ASC
        `;

        const result = await db.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error('[Reminders] Error listing reminders:', err);
        res.status(500).json({ error: 'Failed to list reminders' });
    }
});

// 4. POST /api/reminders - Create reminder with optional file attachments
router.post('/', authenticateToken, upload.array('attachments'), async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const { title, description, due_date, urgency, assignees, recurrence_rule, end_condition } = req.body;
        const createdBy = req.user.id;

        if (!title || !due_date) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Title and Due Date are required.' });
        }

        const parsedRecurrence = typeof recurrence_rule === 'string' ? JSON.parse(recurrence_rule || '{}') : (recurrence_rule || null);
        const parsedEndCondition = typeof end_condition === 'string' ? JSON.parse(end_condition || '{}') : (end_condition || null);

        // Insert main reminder
        const insertRes = await client.query(`
            INSERT INTO report_reminders (title, description, due_date, recurrence_rule, end_condition, urgency, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [
            title,
            description || '',
            due_date,
            parsedRecurrence ? JSON.stringify(parsedRecurrence) : null,
            parsedEndCondition ? JSON.stringify(parsedEndCondition) : null,
            urgency || 'Medium',
            createdBy
        ]);

        const reminderId = insertRes.rows[0].id;

        // Insert assignees
        let assigneeIds = [];
        if (assignees) {
            if (Array.isArray(assignees)) assigneeIds = assignees;
            else if (typeof assignees === 'string') {
                try { assigneeIds = JSON.parse(assignees); } catch (_) { assigneeIds = assignees.split(',').map(s => s.trim()); }
            }
        }
        if (assigneeIds.length === 0) assigneeIds.push(createdBy); // Default to self

        for (const aid of assigneeIds) {
            await client.query(`
                INSERT INTO reminder_assignees (reminder_id, assignee_id)
                VALUES ($1, $2)
            `, [reminderId, aid]);
        }

        // Insert attachments if uploaded
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const relativePath = `/storage/${req.user.username}/reminders/${file.filename}`;
                await client.query(`
                    INSERT INTO reminder_attachments (reminder_id, file_path, original_name)
                    VALUES ($1, $2, $3)
                `, [reminderId, relativePath, file.originalname]);
            }
        }

        // Insert Audit Log
        await client.query(`
            INSERT INTO reminder_logs (reminder_id, action, performed_by)
            VALUES ($1, 'Created', $2)
        `, [reminderId, createdBy]);

        await client.query('COMMIT');
        res.status(201).json({ id: reminderId, message: 'Reminder created successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Reminders] Error creating reminder:', err);
        res.status(500).json({ error: 'Failed to create reminder' });
    } finally {
        client.release();
    }
});

// 5. PUT /api/reminders/:id/status - Toggle status or process recurrence
router.put('/:id/status', authenticateToken, async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const reminderId = req.params.id;
        const { status } = req.body; // 'Pending' or 'Completed'
        const userId = req.user.id;

        const remRes = await client.query(`SELECT * FROM report_reminders WHERE id = $1`, [reminderId]);
        if (remRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Reminder not found' });
        }

        const reminder = remRes.rows[0];

        if (status === 'Completed' && reminder.recurrence_rule) {
            const recRule = reminder.recurrence_rule;
            const endCond = reminder.end_condition;

            const nextDueDate = computeNextDueDate(reminder.due_date, recRule, endCond);

            if (nextDueDate) {
                // Update due date and keep status as Pending
                await client.query(`
                    UPDATE report_reminders 
                    SET due_date = $1, status = 'Pending', end_condition = $2, updated_at = NOW()
                    WHERE id = $3
                `, [nextDueDate.toISOString(), endCond ? JSON.stringify(endCond) : null, reminderId]);

                await client.query(`
                    INSERT INTO reminder_logs (reminder_id, action, performed_by)
                    VALUES ($1, $2, $3)
                `, [reminderId, `Completed & Recurred to ${nextDueDate.toISOString().substring(0, 10)}`, userId]);

                await client.query('COMMIT');
                return res.json({ message: 'Marked completed. Recurred to next due date.', next_due_date: nextDueDate });
            }
        }

        // Standard status update
        await client.query(`
            UPDATE report_reminders 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
        `, [status, reminderId]);

        await client.query(`
            INSERT INTO reminder_logs (reminder_id, action, performed_by)
            VALUES ($1, $2, $3)
        `, [reminderId, status === 'Completed' ? 'Completed' : 'Reopened', userId]);

        await client.query('COMMIT');
        res.json({ message: `Reminder status updated to ${status}` });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Reminders] Error updating reminder status:', err);
        res.status(500).json({ error: 'Failed to update reminder status' });
    } finally {
        client.release();
    }
});

// 6. DELETE /api/reminders/:id - Delete a reminder
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const reminderId = req.params.id;
        const userId = req.user.id;

        // Check ownership or admin
        const check = await db.query(`SELECT created_by FROM report_reminders WHERE id = $1`, [reminderId]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Reminder not found' });
        }

        if (check.rows[0].created_by !== userId && req.user.role !== 'Admin') {
            return res.status(403).json({ error: 'Permission denied' });
        }

        await db.query(`DELETE FROM report_reminders WHERE id = $1`, [reminderId]);
        res.json({ message: 'Reminder deleted successfully' });
    } catch (err) {
        console.error('[Reminders] Error deleting reminder:', err);
        res.status(500).json({ error: 'Failed to delete reminder' });
    }
});

module.exports = router;
