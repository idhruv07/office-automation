const db = require('../config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');

async function createDhruv() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        const username = 'dhruv';
        const name = 'Dhruv Bhardwaj';
        const passwordHash = await bcrypt.hash('1', 12);
        const designation = 'AAO';
        const email = 'dhruv.dad@gov.in';
        const personal_no = '98347760';
        const gender = 'Male';
        
        const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', ['Individual']);
        const roleId = roleRes.rows[0].id;
        const storagePath = `/storage/${username}/`;
        
        // Delete any existing conflicting user just in case
        await client.query('DELETE FROM users WHERE username = $1 OR personal_no = $2 OR email = $3', [username, personal_no, email]);

        const result = await client.query(
            'INSERT INTO users (username, password_hash, name, designation, email, personal_no, role_id, gender, storage_path, must_reset_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING id',
            [username, passwordHash, name, designation, email, personal_no, roleId, gender, storagePath]
        );
        
        const userStoragePath = path.join(__dirname, '..', 'server', 'storage', username);
        await fs.ensureDir(path.join(userStoragePath, 'bills'));
        await fs.ensureDir(path.join(userStoragePath, 'claims'));
        
        await client.query('COMMIT');
        console.log('Successfully created Dhruv Bhardwaj! ID:', result.rows[0].id);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error creating user:', e);
    } finally {
        client.release();
        process.exit();
    }
}
createDhruv();
