-- Migration 014: Add GPF Advance claim type
INSERT INTO claim_types (name, folder_name, is_active)
VALUES ('GPF Advance', 'gpf_advance', true);
