const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'repo_db', password: 'postgrespassword', port: 5433 });
async function check() {
  const jobs = await pool.query('SELECT state, count(*) FROM pgboss.job GROUP BY state');
  const docs = await pool.query('SELECT count(*) FROM documents');
  const failed = await pool.query(`SELECT data->>'originalName' as file, output FROM pgboss.job WHERE state='failed' LIMIT 5`);
  console.log('Queue:', JSON.stringify(jobs.rows, null, 2));
  console.log('Total documents in DB:', docs.rows[0].count);
  console.log('Sample failed jobs:', JSON.stringify(failed.rows, null, 2));
  pool.end();
}
check().catch(console.error);
