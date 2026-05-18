-- Migration to add folder_name to claims table for subfolder organization
ALTER TABLE claims ADD COLUMN folder_name VARCHAR(255);
