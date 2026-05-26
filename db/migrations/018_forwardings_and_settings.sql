-- Office Settings table: configurable key-value store (admin-editable values)
CREATE TABLE IF NOT EXISTS office_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default FWD note "To" address
INSERT INTO office_settings (key, value) VALUES
('fwd_note_address', 'The Officer in charge
Admin-Pay
O/o the CDA Secunderabad
No. 1 Staff Road
Secunderabad-09')
ON CONFLICT (key) DO NOTHING;

-- Seed default FWD note reference number
INSERT INTO office_settings (key, value) VALUES
('fwd_note_ref', 'IT&SDC/Estt/Vol-VI')
ON CONFLICT (key) DO NOTHING;

-- Add Forwardings menu item for Admin (display_order 13, after All Claims)
INSERT INTO menu_items (label, link, permission_required, display_order)
SELECT 'Forwardings', '/admin/forwardings.html', 'can_manage_claims', 13
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE link = '/admin/forwardings.html'
);
