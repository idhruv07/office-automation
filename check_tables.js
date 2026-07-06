const {Client} = require('pg'); 
const c = new Client('postgres://postgres:postgrespassword@127.0.0.1:5433/repo_db'); 
c.connect()
  .then(()=>c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
  .then(res => { 
    console.log(res.rows.map(r=>r.table_name).join(', ')); 
    c.end(); 
  })
  .catch(err => { console.error(err); c.end(); });
