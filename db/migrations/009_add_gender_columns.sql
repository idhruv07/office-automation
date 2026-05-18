-- Add gender to users and dependents
ALTER TABLE users ADD COLUMN gender VARCHAR(10);
ALTER TABLE dependents ADD COLUMN gender VARCHAR(10);
