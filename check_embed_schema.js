const {Client} = require('pg');
const c = new Client('postgres://postgres:postgrespassword@127.0.0.1:5433/repo_db');
c.connect()
  .then(()=>c.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'page_embeddings'"))
  .then(res => { console.log(JSON.stringify(res.rows, null, 2)); c.end(); })
  .catch(err => { console.error(err); c.end(); });
