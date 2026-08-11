-- Migration 025: Report Reminders module tables

CREATE TABLE IF NOT EXISTS report_reminders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    recurrence_rule JSONB DEFAULT NULL,
    end_condition JSONB DEFAULT NULL,
    urgency VARCHAR(20) DEFAULT 'Medium',
    created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminder_assignees (
    id SERIAL PRIMARY KEY,
    reminder_id INTEGER REFERENCES report_reminders(id) ON DELETE CASCADE,
    assignee_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reminder_attachments (
    id SERIAL PRIMARY KEY,
    reminder_id INTEGER REFERENCES report_reminders(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminder_logs (
    id SERIAL PRIMARY KEY,
    reminder_id INTEGER REFERENCES report_reminders(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add menu item for Report Reminders
INSERT INTO menu_items (label, link, permission_required, display_order)
SELECT 'Report Reminders', '/reminders.html', NULL, 16
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE link = '/reminders.html'
);
