-- Add folder_name to fwd_templates
ALTER TABLE fwd_templates ADD COLUMN folder_name TEXT DEFAULT 'General';
