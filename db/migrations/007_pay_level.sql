-- Add pay_level column for claim auto-fill
ALTER TABLE users ADD COLUMN IF NOT EXISTS pay_level VARCHAR(50);
