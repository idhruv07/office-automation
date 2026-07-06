-- Add Saved Contingent Bills menu item for Individual users
INSERT INTO menu_items (label, link, permission_required, display_order) 
VALUES ('My Saved Bills', '/claims/contingent_list.html', 'can_submit_claims', 14);
