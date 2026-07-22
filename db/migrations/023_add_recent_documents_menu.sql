-- Migration to add 'Recent Documents' menu under Repository menu group
INSERT INTO menu_items (label, link, permission_required, parent_id, display_order)
VALUES ('Recent Documents', '/repository/index.html', 'can_view_repository', 16, 3);
