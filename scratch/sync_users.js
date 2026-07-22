const coreDb = require('../config/db');
const repoDb = require('../config/repo_db');

async function syncUsers() {
    try {
        console.log('Syncing offices, roles, and users to repo_db...');

        // 1. Seed Offices in repo_db
        await repoDb.query(`
            INSERT INTO offices (id, name, code) VALUES 
            (1, 'Headquarters', 'HQ'),
            (2, 'IT&SDC', 'ITSDC')
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code
        `);
        // Reset sequence for offices
        await repoDb.query("SELECT setval('offices_id_seq', (SELECT MAX(id) FROM offices))");
        console.log('Offices seeded in repo_db.');

        // 2. Seed Roles in repo_db
        await repoDb.query(`
            INSERT INTO roles (id, code, name, rank) VALUES 
            (1, 'SYSADMIN', 'Admin', 1),
            (2, 'INDIVIDUAL', 'Individual', 99)
            ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, rank = EXCLUDED.rank
        `);
        // Reset sequence for roles
        await repoDb.query("SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles))");
        console.log('Roles seeded in repo_db.');

        // 3. Fetch users from core office_automation DB
        const coreUsers = await coreDb.query("SELECT id, username, name, role_id FROM users");
        console.log(`Fetched ${coreUsers.rows.length} users from core DB.`);

        // 4. Insert/sync users into repo_db
        for (const user of coreUsers.rows) {
            // Set office_id default to 1 (Headquarters)
            await repoDb.query(`
                INSERT INTO users (id, name, username, role_id, office_id) 
                VALUES ($1, $2, $3, $4, 1)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username, role_id = EXCLUDED.role_id
            `, [user.id, user.name || 'Unknown', user.username, user.role_id]);
        }
        // Reset sequence for users
        await repoDb.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
        console.log('Users successfully synchronized to repo_db.');

        console.log('Sync complete!');
        process.exit(0);
    } catch (err) {
        console.error('Sync failed:', err);
        process.exit(1);
    }
}

syncUsers();
