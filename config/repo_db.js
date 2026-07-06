const { Pool } = require('pg');

const repoPool = new Pool({
  user: process.env.REPO_DB_USER || 'postgres',
  host: process.env.REPO_DB_HOST || '127.0.0.1',
  database: process.env.REPO_DB_NAME || 'repo_db',
  password: process.env.REPO_DB_PASSWORD || 'postgrespassword',
  port: parseInt(process.env.REPO_DB_PORT) || 5433,
});

repoPool.on('error', (err) => {
  console.error('[REPO DB] Unexpected error on idle client:', err.message);
});

module.exports = {
  query: (text, params) => repoPool.query(text, params),
  pool: repoPool,
};
