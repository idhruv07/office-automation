const db = require('../config/db');

async function run() {
    try {
        const res = await db.query("SELECT id, name, username, is_active FROM users WHERE name ILIKE '%Dhruv%' ORDER BY id DESC LIMIT 5");
        console.log('Dhruv users:', res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
run();
