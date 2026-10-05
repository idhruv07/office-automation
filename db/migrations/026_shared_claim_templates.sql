-- Shared Claim Templates: allows users to share prefill data for TD claims with colleagues
CREATE TABLE IF NOT EXISTS shared_claim_templates (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    claim_type_id INTEGER REFERENCES claim_types(id) ON DELETE CASCADE,
    shared_data JSONB NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_dismissed BOOLEAN DEFAULT FALSE,
    is_used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sct_recipient ON shared_claim_templates(recipient_id);
CREATE INDEX IF NOT EXISTS idx_sct_sender ON shared_claim_templates(sender_id);
