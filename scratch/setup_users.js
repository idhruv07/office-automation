const db = require('../config/db');
const fs = require('fs-extra');
const path = require('path');
const bcrypt = require('bcryptjs');

async function setupUsers() {
    try {
        console.log('Starting users setup...');

        // 1. Update Srinath's designation to 'GO'
        await db.query("UPDATE users SET designation = 'GO' WHERE username = 'srinath'");
        console.log("Updated Srinath's designation to 'GO'.");

        // 2. Check if Prithvi Prasad exists
        const prithviCheck = await db.query("SELECT id FROM users WHERE username = 'prithvi'");
        if (prithviCheck.rows.length === 0) {
            // Get Individual role
            const roleRes = await db.query("SELECT id FROM roles WHERE name = 'Individual'");
            const roleId = roleRes.rows[0].id;

            // Generate password hash for '1'
            const passwordHash = await bcrypt.hash('1', 12);

            // Insert Prithvi Prasad
            const insertRes = await db.query(
                `INSERT INTO users (username, password_hash, name, designation, role_id, must_reset_password) 
                 VALUES ($1, $2, $3, $4, $5, false) RETURNING id`,
                ['prithvi', passwordHash, 'Prithvi Prasad', 'Auditor', roleId]
            );
            console.log("Created user 'prithvi' (Prithvi Prasad) with designation 'Auditor'.");
        } else {
            // Update Prithvi's designation just in case
            await db.query("UPDATE users SET designation = 'Auditor', name = 'Prithvi Prasad' WHERE username = 'prithvi'");
            console.log("Updated existing user 'prithvi' to designation 'Auditor'.");
        }

        // 3. Create storage directories for prithvi in local repository
        const localStorage = path.join(__dirname, '..', 'server', 'storage', 'prithvi');
        await fs.ensureDir(path.join(localStorage, 'bills'));
        await fs.ensureDir(path.join(localStorage, 'claims'));
        console.log("Created storage directories in local repository.");

        // 4. Create storage directories for prithvi in production (/opt/office-automation)
        const prodStorage = path.join('/opt/office-automation', 'server', 'storage', 'prithvi');
        await fs.ensureDir(path.join(prodStorage, 'bills'));
        await fs.ensureDir(path.join(prodStorage, 'claims'));
        console.log("Created storage directories in /opt/office-automation.");

        console.log('Users setup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up users:', err);
        process.exit(1);
    }
}

setupUsers();
