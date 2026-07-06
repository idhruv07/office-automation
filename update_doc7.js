const {Client} = require('pg'); 
const fs = require('fs');
const c = new Client('postgres://postgres:postgrespassword@127.0.0.1:5433/repo_db'); 
c.connect().then(() => {
    const content = fs.readFileSync('doc7_page1.html', 'utf8');
    // ID 138 was the page ID we found earlier
    return c.query('UPDATE document_pages SET html_content = $1 WHERE id = 138', [content]);
}).then(() => {
    console.log('Document 7 page 1 updated successfully in DB');
    c.end(); 
}).catch(err => { 
    console.error(err); 
    c.end(); 
});
