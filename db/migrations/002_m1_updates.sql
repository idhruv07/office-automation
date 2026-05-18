-- Roles update
ALTER TABLE roles ADD COLUMN permissions JSONB DEFAULT '{}';

-- Users update
ALTER TABLE users 
ADD COLUMN name VARCHAR(100),
ADD COLUMN designation VARCHAR(100),
ADD COLUMN email VARCHAR(100) UNIQUE,
ADD COLUMN personal_no VARCHAR(50) UNIQUE,
ADD COLUMN must_reset_password BOOLEAN DEFAULT FALSE,
ADD COLUMN storage_path VARCHAR(255);

-- Update seed data placeholders
UPDATE roles SET permissions = '{"can_manage_users": true, "can_view_all_claims": true}' WHERE name = 'Admin';
UPDATE roles SET permissions = '{"can_submit_claims": true}' WHERE name = 'Employee';
UPDATE roles SET name = 'Individual' WHERE name = 'Employee'; -- per user's prompt (admin / individual)
