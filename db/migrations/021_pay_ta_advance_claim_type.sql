-- Migration 021: Add Pay/TA Advance claim type
INSERT INTO claim_types (name, folder_name, is_active)
VALUES ('Advance of Pay/TA', 'pay_ta_advance', true);
