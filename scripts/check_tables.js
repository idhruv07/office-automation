const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgrespassword@127.0.0.1:5433/repo_db' });
async function check() {
    await client.connect();
    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log(res.rows.map(r => r.table_name).sort());
    await client.end();
}
check().catch(console.error);
