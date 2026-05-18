-- Migration: Add last_login_at and last_active_at to users table
ALTER TABLE users 
ADD COLUMN last_login_at TIMESTAMP,
ADD COLUMN last_active_at TIMESTAMP;
