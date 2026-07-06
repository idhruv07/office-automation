const { Pool } = require('pg');
const pool = new Pool({ user: 'postgres', host: '127.0.0.1', database: 'repo_db', password: 'postgrespassword', port: 5433 });
async function check() {
  const r = await pool.query(`
    SELECT column_name, udt_name,
           character_maximum_length,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS full_type
    FROM information_schema.columns c
    JOIN pg_attribute a ON a.attname = c.column_name
    JOIN pg_class cl ON cl.oid = a.attrelid AND cl.relname = 'page_embeddings'
    WHERE c.table_name = 'page_embeddings'
    ORDER BY ordinal_position
  `);
  console.log('page_embeddings full types:', JSON.stringify(r.rows, null, 2));
  pool.end();
}
check().catch(console.error);
