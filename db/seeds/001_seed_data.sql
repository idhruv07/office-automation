INSERT INTO roles (name) VALUES ('Admin'), ('Employee');

INSERT INTO users (username, password_hash, role_id) 
VALUES ('admin', 'hashed_password_placeholder', (SELECT id FROM roles WHERE name = 'Admin'));

INSERT INTO claim_types (name, folder_name) VALUES 
('TD', 'td'),
('Medical', 'medical'),
('Office Note', 'notes'),
('Newspaper Bill', 'newspaper');
