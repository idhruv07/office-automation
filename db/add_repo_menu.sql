-- 1. Give all non-INDIVIDUAL roles 'can_view_repository: true'
UPDATE roles 
SET permissions = jsonb_set(permissions, '{can_view_repository}', 'true', true) 
WHERE code != 'INDIVIDUAL';

-- 2. Give SYSADMIN and OFFICE_ADMIN 'can_manage_repository: true'
UPDATE roles 
SET permissions = jsonb_set(permissions, '{can_manage_repository}', 'true', true) 
WHERE code IN ('SYSADMIN', 'OFFICE_ADMIN');

-- 3. Insert 'Repository' top-level menu
INSERT INTO menu_items (label, link, permission_required, parent_id, display_order)
VALUES ('Repository', '#', 'can_view_repository', NULL, 1) RETURNING id;

-- Wait, returning id in a multi-statement block is hard to use dynamically in psql.
-- I'll use DO block or CTE to link them.

DO $$
DECLARE
    repo_id INT;
BEGIN
    -- Delete existing if re-running
    DELETE FROM menu_items WHERE label IN ('Repository', 'Document Repository', 'Review Queue');

    -- Insert Repository Header
    INSERT INTO menu_items (label, link, permission_required, parent_id, display_order)
    VALUES ('Repository', '#', 'can_view_repository', NULL, 2)
    RETURNING id INTO repo_id;

    -- Insert Document Repository Link
    INSERT INTO menu_items (label, link, permission_required, parent_id, display_order)
    VALUES ('Document Repository', '/repository/index.html', 'can_view_repository', repo_id, 1);

    -- Insert Review Queue Link (Admin only)
    INSERT INTO menu_items (label, link, permission_required, parent_id, display_order)
    VALUES ('Review Queue', '/repository/admin/review.html', 'can_manage_repository', repo_id, 2);
END $$;
