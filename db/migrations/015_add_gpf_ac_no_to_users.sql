-- Migration 015: Add gpf_ac_no column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS gpf_ac_no VARCHAR(100);
