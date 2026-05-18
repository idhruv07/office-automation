const db = require('./config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');

async function createDhruv() {
    try {
        const passwordHash = await bcrypt.hash('1', 12);
        
        // Get Individual role
        const roleRes = await db.query("SELECT id FROM roles WHERE name = 'Individual'");
        const roleId = roleRes.rows[0].id;

        const result = await db.query(
            `INSERT INTO users (username, password_hash, name, role_id, cghs_ben_id, must_reset_password) 
             VALUES ($1, $2, $3, $4, $5, false) RETURNING id`,
            ['dhruv', passwordHash, 'Dhruv', roleId, '1234']
        );
        const userId = result.rows[0].id;

        // Insert dependents
        await db.query(
            `INSERT INTO dependents (user_id, name, relationship, cghs_ben_id, dob) VALUES 
             ($1, 'Jyoti Sharma', 'Spouse', '1235', '1994-04-15'),
             ($1, 'Dhriti Bhardwaj', 'Daughter', '1236', '2020-06-17'),
             ($1, 'Dharvi', 'Daughter', NULL, '2026-03-17')`,
            [userId]
        );

        // Create storage directories
        const userStoragePath = path.join(__dirname, 'server', 'storage', 'dhruv');
        await fs.ensureDir(path.join(userStoragePath, 'bills'));
        await fs.ensureDir(path.join(userStoragePath, 'claims'));

        console.log('Dhruv created successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
createDhruv();
