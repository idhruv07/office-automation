CREATE TABLE IF NOT EXISTS ward_entitlement_rules (
    id SERIAL PRIMARY KEY,
    min_pay INT NOT NULL,
    max_pay INT NOT NULL,
    ward_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial rules as defined
INSERT INTO ward_entitlement_rules (min_pay, max_pay, ward_type) VALUES
(0, 36500, 'General'),
(36501, 50500, 'Semi-Private'),
(50501, 99999999, 'Private')
ON CONFLICT DO NOTHING;
