-- Migration 024: Add fwd_recipient to claims
ALTER TABLE claims ADD COLUMN IF NOT EXISTS fwd_recipient TEXT;
