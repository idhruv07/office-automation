const coreDb = require('../config/db');
const repoDb = require('../config/repo_db');

async function setup() {
    try {
        console.log('Starting Roles & Users setup on core and repo DBs...');

        // 1. Roles Definition
        const roles = [
            { id: 1, code: 'SYSADMIN', name: 'Admin', rank: 1, permissions: { can_manage_users: true, can_manage_claims: true, can_manage_claim_types: true, can_view_repository: true, can_manage_repository: true } },
            { id: 2, code: 'INDIVIDUAL', name: 'Individual', rank: 99, permissions: { can_submit_claims: true } },
            { id: 3, code: 'ADDN_CDA', name: 'Addn Cda', rank: 3, permissions: { can_view_repository: true, can_submit_claims: true, can_manage_claims: true } },
            { id: 4, code: 'GO', name: 'GO', rank: 4, permissions: { can_view_repository: true, can_submit_claims: true, can_manage_claims: true } },
            { id: 5, code: 'SAO', name: 'SAO', rank: 5, permissions: { can_view_repository: true, can_submit_claims: true, can_manage_claims: true } },
            { id: 6, code: 'AAO', name: 'AAO', rank: 6, permissions: { can_view_repository: true, can_submit_claims: true, can_manage_claims: true } },
            { id: 7, code: 'SR_AUD', name: 'Sr Auditor', rank: 7, permissions: { can_view_repository: true, can_submit_claims: true, can_manage_claims: true } },
            { id: 8, code: 'AUDITOR', name: 'Auditor', rank: 8, permissions: { can_view_repository: true, can_submit_claims: true, can_manage_claims: true } }
        ];

        // 2. Insert/Sync Roles in Core DB
        for (const r of roles) {
            await coreDb.query(`
                INSERT INTO roles (id, code, name, rank, permissions) VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, rank = EXCLUDED.rank, permissions = EXCLUDED.permissions
            `, [r.id, r.code, r.name, r.rank, JSON.stringify(r.permissions)]);
        }
        await coreDb.query("SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles))");
        console.log('Roles setup complete in Core DB.');

        // 3. Insert/Sync Roles in Repo DB
        for (const r of roles) {
            await repoDb.query(`
                INSERT INTO roles (id, code, name, rank) VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name, rank = EXCLUDED.rank
            `, [r.id, r.code, r.name, r.rank]);
        }
        await repoDb.query("SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles))");
        console.log('Roles setup complete in Repo DB.');

        // 4. Update Users role_id in Core DB based on their designation
        const users = await coreDb.query("SELECT id, username, name, designation, role_id FROM users");
        for (const u of users.rows) {
            let roleId = 2; // Default to Individual
            const desig = (u.designation || '').toUpperCase().trim();

            if (u.username === 'admin') {
                roleId = 1; // Admin stays Admin
            } else if (desig === 'ADDN CDA' || desig === 'ADDL CDA') {
                roleId = 3;
            } else if (desig === 'GO' || desig === 'ACDA') {
                roleId = 4;
            } else if (desig === 'SAO') {
                roleId = 5;
            } else if (desig === 'AAO') {
                roleId = 6;
            } else if (desig === 'SR AUDITOR') {
                roleId = 7;
            } else if (desig === 'AUDITOR') {
                roleId = 8;
            }

            // Update in core DB
            await coreDb.query("UPDATE users SET role_id = $1 WHERE id = $2", [roleId, u.id]);

            // Sync/Upsert to repo DB
            await repoDb.query(`
                INSERT INTO users (id, name, username, role_id, office_id)
                VALUES ($1, $2, $3, $4, 1)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username, role_id = EXCLUDED.role_id
            `, [u.id, u.name || 'Unknown', u.username, roleId]);
        }
        await repoDb.query("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
        console.log('Users mapped to roles and synchronized in both DBs successfully.');

        // 5. Add Menu Items in Core DB
        await coreDb.query("DELETE FROM menu_items WHERE label IN ('Repository', 'Document Repository', 'Review Queue')");
        
        const parentMenu = await coreDb.query(`
            INSERT INTO menu_items (label, link, permission_required, parent_id, display_order)
            VALUES ('Repository', '#', 'can_view_repository', NULL, 15)
            RETURNING id
        `);
        const parentId = parentMenu.rows[0].id;

        await coreDb.query(`
            INSERT INTO menu_items (label, link, permission_required, parent_id, display_order)
            VALUES ('Document Repository', '/repository/index.html', 'can_view_repository', $1, 1)
        `, [parentId]);

        await coreDb.query(`
            INSERT INTO menu_items (label, link, permission_required, parent_id, display_order)
            VALUES ('Review Queue', '/repository/admin/review.html', 'can_manage_repository', $1, 2)
        `, [parentId]);

        console.log('Repository menu items added to Core DB.');
        console.log('Upgrade setup completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
}

setup();
