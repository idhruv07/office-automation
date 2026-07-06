const db = require('../config/db');

async function run() {
    try {
        const res = await db.query("SELECT id, name, username FROM users WHERE name ILIKE '%test%' OR username ILIKE '%test%'");
        console.log('Found users to delete:', res.rows);
        
        if (res.rows.length > 0) {
            const result = await db.query("DELETE FROM users WHERE name ILIKE '%test%' OR username ILIKE '%test%' RETURNING id, name");
            console.log('Deleted:', result.rows);
        } else {
            console.log('No test users found.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
