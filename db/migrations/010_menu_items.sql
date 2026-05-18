-- Menu Items Table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    link VARCHAR(255) NOT NULL,
    permission_required VARCHAR(50), -- e.g. 'can_manage_users', 'can_submit_claims'
    parent_id INTEGER REFERENCES menu_items(id),
    display_order INTEGER DEFAULT 0
);

-- Seed Menu Items
INSERT INTO menu_items (label, link, permission_required, display_order) VALUES
('Dashboard', '/dashboard.html', NULL, 1),
('My Profile', '/profile.html', NULL, 100),
('Manage Users', '/admin/users.html', 'can_manage_users', 10),
('All Claims', '/admin/claims.html', 'can_manage_claims', 11),
('Manage Claim Types', '/admin/templates.html', 'can_manage_claim_types', 12),
('My Claims', '/claims/my.html', 'can_submit_claims', 2);

-- Update Roles Permissions to match
UPDATE roles SET permissions = '{"can_manage_users": true, "can_manage_claims": true, "can_manage_claim_types": true}' WHERE name = 'Admin';
UPDATE roles SET permissions = '{"can_submit_claims": true}' WHERE name = 'Individual';
