ALTER TABLE users 
ADD COLUMN cghs_ben_id VARCHAR(50),
ADD COLUMN address TEXT,
ADD COLUMN mobile_no VARCHAR(20);

CREATE TABLE dependents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    cghs_ben_id VARCHAR(50),
    dob DATE
);
