const {Client} = require('pg'); 
const fs = require('fs');
const c = new Client('postgres://postgres:postgrespassword@127.0.0.1:5433/repo_db'); 
c.connect().then(() => 
    c.query('SELECT dp.html_content, dp.id FROM document_pages dp JOIN documents d ON dp.document_id = d.id WHERE d.id = 7 ORDER BY dp.sequence_no ASC LIMIT 1')
).then(res => { 
    if (res.rows.length > 0) {
        fs.writeFileSync('doc7_page1.html', res.rows[0].html_content);
        console.log('Saved to doc7_page1.html. Page ID:', res.rows[0].id);
    } else {
        console.log('No page found.');
    }
    c.end(); 
}).catch(err => { 
    console.error(err); 
    c.end(); 
});
