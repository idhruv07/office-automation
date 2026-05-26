-- Migration 022: Claim Type Reference Numbers
-- Each claim type can have its own fwd reference number, valid from a specific date.

CREATE TABLE IF NOT EXISTS claim_type_ref_nos (
    id            SERIAL PRIMARY KEY,
    claim_type_id INT NOT NULL REFERENCES claim_types(id) ON DELETE CASCADE,
    ref_no        VARCHAR(255) NOT NULL,
    valid_from    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by    INT REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_type_ref_nos_type_date
    ON claim_type_ref_nos (claim_type_id, valid_from DESC);

COMMENT ON TABLE claim_type_ref_nos IS
    'Stores per-claim-type forwarding reference numbers. Latest valid_from <= today is the active one.';
