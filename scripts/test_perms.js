const { Client } = require('pg');
const { resolvePermission } = require('../api/lib/permissions');
const db = require('../config/repo_db');

async function test() {
    // 1. Get user 103 details
    const userRes = await db.query(
        `SELECT u.id, u.username, r.code, r.rank, u.office_id 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.id = 103`
    );
    console.log('User 103:', userRes.rows[0]);

    // 2. Get some folders
    const foldersRes = await db.query(`SELECT id, name, office_id FROM folder_nodes LIMIT 5`);
    console.log('Sample Folders:', foldersRes.rows);

    // 3. Test resolvePermission for user 103 on each sample folder
    for (const folder of foldersRes.rows) {
        const perm = await resolvePermission(103, 'folder', folder.id, db);
        console.log(`Permission for folder ${folder.name} (ID: ${folder.id}):`, perm);
    }
}

test()
    .then(() => db.pool.end())
    .catch(err => { console.error(err); db.pool.end(); });
