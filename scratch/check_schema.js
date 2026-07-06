const { Pool } = require('pg');
const pool = new Pool({
  user: 'itsdcsec',
  host: 'localhost',
  database: 'office_automation',
  password: 'password',
  port: 5432,
});

async function run() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';");
  console.log(res.rows);
  pool.end();
}
run();
