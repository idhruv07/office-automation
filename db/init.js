const db = require('../config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs-extra');
const path = require('path');

async function init() {
    try {
        console.log('Starting DB Initialization...');

        // 1. Initial Schema
        const schema = await fs.readFile(path.join(__dirname, 'migrations', '001_initial_schema.sql'), 'utf8');
        await db.query(schema);
        console.log('Schema 001 applied.');

        // 2. M1 Updates
        const updates = await fs.readFile(path.join(__dirname, 'migrations', '002_m1_updates.sql'), 'utf8');
        await db.query(updates);
        console.log('Schema 002 applied.');

        // 3. Clear existing seed logic and insert fresh data
        await db.query('TRUNCATE roles, users RESTART IDENTITY CASCADE');

        await db.query(`
            INSERT INTO roles (name, permissions) VALUES 
            ('Admin', '{"can_manage_users": true}'),
            ('Individual', '{"can_submit_claims": true}')
        `);

        const adminPass = await bcrypt.hash('admin123', 12);
        await db.query(`
            INSERT INTO users (username, password_hash, role_id, name) 
            VALUES ('admin', $1, (SELECT id FROM roles WHERE name = 'Admin'), 'System Admin')
        `, [adminPass]);

        console.log('Seed data inserted. Admin user created: admin / admin123');
        process.exit(0);
    } catch (err) {
        console.error('Initialization failed:', err);
        process.exit(1);
    }
}

init();
