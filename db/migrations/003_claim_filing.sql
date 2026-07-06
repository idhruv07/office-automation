ALTER TABLE claims 
ADD COLUMN claim_name VARCHAR(255) NOT NULL DEFAULT 'Untitled',
ADD COLUMN claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN remarks TEXT,
ADD COLUMN submitted_at TIMESTAMP,
ADD COLUMN decided_at TIMESTAMP;

-- Remove default constraints after adding to existing (if any)
ALTER TABLE claims ALTER COLUMN claim_name DROP DEFAULT;
ALTER TABLE claims ALTER COLUMN claim_date DROP DEFAULT;

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    claim_id INTEGER REFERENCES claims(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
