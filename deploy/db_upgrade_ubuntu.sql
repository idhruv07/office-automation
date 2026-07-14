-- ============================================================
-- SQL UPGRADE SCRIPT FOR EXISTING office_automation DATABASE
-- Upgrades the old schema with new fields, configurations, settings,
-- ward entitlements, and forwarding templates.
-- Idempotent: Can be run multiple times safely.
-- ============================================================

-- 1. Add optional GPF Account Number column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS gpf_ac_no VARCHAR(100);

-- 2. Add theme preference column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_pref VARCHAR(50) DEFAULT 'royal_indigo';

-- 3. Add active status tracking column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 4. Create Ward Entitlement Rules table if not exists
CREATE TABLE IF NOT EXISTS ward_entitlement_rules (
    id SERIAL PRIMARY KEY,
    min_pay INT NOT NULL,
    max_pay INT NOT NULL,
    ward_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial Ward Entitlement rules if table is empty
INSERT INTO ward_entitlement_rules (min_pay, max_pay, ward_type) 
SELECT 0, 36500, 'General'
WHERE NOT EXISTS (SELECT 1 FROM ward_entitlement_rules WHERE ward_type = 'General');

INSERT INTO ward_entitlement_rules (min_pay, max_pay, ward_type) 
SELECT 36501, 50500, 'Semi-Private'
WHERE NOT EXISTS (SELECT 1 FROM ward_entitlement_rules WHERE ward_type = 'Semi-Private');

INSERT INTO ward_entitlement_rules (min_pay, max_pay, ward_type) 
SELECT 50501, 99999999, 'Private'
WHERE NOT EXISTS (SELECT 1 FROM ward_entitlement_rules WHERE ward_type = 'Private');

-- 5. Create Office Settings table
CREATE TABLE IF NOT EXISTS office_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default FWD note address
INSERT INTO office_settings (key, value) 
VALUES ('fwd_note_address', 'The Officer in charge
Admin-Pay
O/o the CDA Secunderabad
No. 1 Staff Road
Secunderabad-09')
ON CONFLICT (key) DO NOTHING;

-- Seed default FWD note reference number
INSERT INTO office_settings (key, value) 
VALUES ('fwd_note_ref', 'IT&SDC/Estt/Vol-VI')
ON CONFLICT (key) DO NOTHING;

-- 6. Create Office Config (rich header config) table
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

-- Seed default row for office config
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

-- 7. Create Forwarding Templates table
CREATE TABLE IF NOT EXISTS fwd_templates (
    id SERIAL PRIMARY KEY,
    template_name TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Add new claim types if missing
INSERT INTO claim_types (name, folder_name, is_active)
SELECT 'GPF Advance', 'gpf_advance', true
WHERE NOT EXISTS (SELECT 1 FROM claim_types WHERE name = 'GPF Advance');

INSERT INTO claim_types (name, folder_name, is_active)
SELECT 'Pay TA Advance', 'pay_ta_advance', true
WHERE NOT EXISTS (SELECT 1 FROM claim_types WHERE name = 'Pay TA Advance');

-- 9. Setup system menu items if missing
INSERT INTO menu_items (label, link, permission_required, display_order)
SELECT 'My Saved Bills', '/claims/contingent_list.html', 'can_submit_claims', 14
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE link = '/claims/contingent_list.html');

INSERT INTO menu_items (label, link, permission_required, display_order)
SELECT 'Forwardings', '/admin/forwardings.html', 'can_manage_claims', 13
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE link = '/admin/forwardings.html');

INSERT INTO menu_items (label, link, permission_required, display_order)
SELECT 'Office Settings', '/admin/office_settings.html', 'can_manage_claims', 14
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE link = '/admin/office_settings.html');

INSERT INTO menu_items (label, link, permission_required, display_order)
SELECT 'FWD Templates', '/admin/fwd_templates.html', 'can_manage_claims', 15
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE link = '/admin/fwd_templates.html');
