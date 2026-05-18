-- Migration: Create codeheads table
-- Created At: 2026-05-13
CREATE TABLE IF NOT EXISTS codeheads (
    id SERIAL PRIMARY KEY,
    code_head VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
