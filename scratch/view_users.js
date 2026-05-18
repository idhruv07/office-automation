require('dotenv').config();
const db = require('../config/db');

async function view() {
    try {
        const res = await db.query("SELECT id, username, name, email, mobile_no, address, cghs_ben_id, pay_level, basic_pay FROM users");
        console.log('Current users in database:');
        console.log(res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

view();
