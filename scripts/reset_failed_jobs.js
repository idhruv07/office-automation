const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'repo_db', password: 'postgrespassword', port: 5433 });

async function resetFailed() {
  // Reset failed jobs back to created so they get retried with fixed code
  const res = await pool.query(
    `UPDATE pgboss.job SET state = 'created', started_on = NULL, output = NULL, retry_count = 0
     WHERE state IN ('failed', 'retry') AND name = 'document-import'`
  );
  console.log('Reset failed/retry jobs:', res.rowCount);

  const counts = await pool.query('SELECT state, count(*) FROM pgboss.job GROUP BY state');
  console.log('Queue after reset:', JSON.stringify(counts.rows, null, 2));
  pool.end();
}
resetFailed().catch(console.error);
