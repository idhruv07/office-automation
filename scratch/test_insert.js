const db = require('../config/db');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs-extra');

async function run() {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', ['Individual']);
        const roleId = roleRes.rows[0].id;
        
        const username = 'user_dhruv_123';
        const passwordHash = await bcrypt.hash('1', 12);
        
        const result = await client.query(
            'INSERT INTO users (username, password_hash, name, designation, email, personal_no, role_id, gender, storage_path, must_reset_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING id',
            [username, passwordHash, 'Dhruv Bhardwaj', 'SAO', 'dhruv@test.com', 'P123456', roleId, 'Male', `/storage/${username}/`]
        );
        console.log('Inserted ID:', result.rows[0].id);
        await client.query('ROLLBACK'); // rollback immediately
        console.log('Success test');
    } catch (e) {
        console.error('ERROR inserting:', e);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        process.exit();
    }
}
run();
