const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'repo_db', password: 'postgrespassword', port: 5433 });

async function removeExcelJobs() {
  // Delete all pending/created/retry jobs for excel files
  const res = await pool.query(`
    DELETE FROM pgboss.job
    WHERE name = 'document-import'
    AND state IN ('created', 'retry', 'failed')
    AND (
      data->>'originalName' ILIKE '%.xlsx'
      OR data->>'originalName' ILIKE '%.xls'
      OR data->>'originalName' ILIKE '%.ods'
    )
  `);
  console.log('Removed Excel jobs from queue:', res.rowCount);

  const counts = await pool.query('SELECT state, count(*) FROM pgboss.job GROUP BY state');
  console.log('Queue after cleanup:', JSON.stringify(counts.rows, null, 2));
  pool.end();
}
removeExcelJobs().catch(console.error);
