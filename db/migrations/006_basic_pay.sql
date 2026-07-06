-- Add basic_pay column for LTC Final Claim auto-fill
ALTER TABLE users ADD COLUMN IF NOT EXISTS basic_pay VARCHAR(100);
