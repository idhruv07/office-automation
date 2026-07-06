const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'repo_db',
  password: 'postgrespassword',
  port: 5433,
});

async function purge() {
  const res = await pool.query(`
    DELETE FROM pgboss.job
    WHERE state = 'created'
    AND id NOT IN (
      SELECT (array_agg(id ORDER BY created_on ASC))[1]
      FROM pgboss.job
      GROUP BY data->>'filePath'
    )
  `);
  console.log('Deleted duplicate jobs:', res.rowCount);
  pool.end();
}
purge().catch(console.error);
