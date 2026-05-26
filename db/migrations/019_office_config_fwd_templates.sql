-- Migration 019: Office Config (rich header) + FWD Templates

-- Feature 1: Structured office config table
CREATE TABLE IF NOT EXISTS office_config (
    id SERIAL PRIMARY KEY,
    office_name TEXT NOT NULL DEFAULT 'OFFICE OF THE CDA ( IT & SDC)',
    office_address TEXT NOT NULL DEFAULT 'Mornington Road, PAO(ORs)AOC Compound,',
    office_sub_address TEXT DEFAULT 'Trimulgherry, Secunderabad – 500 015.',
    city_state_pin TEXT DEFAULT NULL,
    phone TEXT DEFAULT '040-27742553/29805085',
    email TEXT DEFAULT 'itsdcsec-cda@nic.in',
    fwd_ref_no TEXT DEFAULT 'IT&SDC/Estt/Vol-VI',
    signatory_name TEXT DEFAULT 'Sr. Accounts Officer',
    signatory_dept TEXT DEFAULT '(IT&SDC)',
    logo_left_url TEXT DEFAULT '/admin/images/emblem.png',
    logo_right_url TEXT DEFAULT '/admin/images/azadi.png',
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed one default row so the app always has a config
INSERT INTO office_config (
    office_name, office_address, office_sub_address, phone, email,
    fwd_ref_no, signatory_name, signatory_dept, logo_left_url, logo_right_url
) 
SELECT
    'OFFICE OF THE CDA ( IT & SDC)',
    'Mornington Road, PAO(ORs)AOC Compound,',
    'Trimulgherry, Secunderabad – 500 015.',
    '040-27742553/29805085',
    'itsdcsec-cda@nic.in',
    'IT&SDC/Estt/Vol-VI',
    'Sr. Accounts Officer',
    '(IT&SDC)',
    '/admin/images/emblem.png',
    '/admin/images/azadi.png'
WHERE NOT EXISTS (SELECT 1 FROM office_config LIMIT 1);

-- Feature 2: FWD Templates registry
CREATE TABLE IF NOT EXISTS fwd_templates (
    id SERIAL PRIMARY KEY,
    template_name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add Office Settings admin menu item
INSERT INTO menu_items (label, link, permission_required, display_order)
SELECT 'Office Settings', '/admin/office_settings.html', 'can_manage_claims', 14
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE link = '/admin/office_settings.html'
);

-- Add FWD Templates admin menu item
INSERT INTO menu_items (label, link, permission_required, display_order)
SELECT 'FWD Templates', '/admin/fwd_templates.html', 'can_manage_claims', 15
WHERE NOT EXISTS (
    SELECT 1 FROM menu_items WHERE link = '/admin/fwd_templates.html'
);
