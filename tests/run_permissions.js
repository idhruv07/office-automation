/**
 * tests/run_permissions.js
 * Plain Node test runner for resolvePermission — compatible with Node 16
 * No Jest required. Run with: node tests/run_permissions.js
 */

const { resolvePermission } = require('../api/lib/permissions');

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓  ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗  ${name}`);
        console.error(`     ${err.message}`);
        failed++;
    }
}

function expect(actual) {
    return {
        toBe(expected) {
            if (actual !== expected) {
                throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        }
    };
}

// ── DB Mock Builder ──────────────────────────────────────────────────────────
function makeDb(overrides = {}) {
    const cfg = {
        userOverride: null,
        userRole: { role_id: 7, office_id: 1, rank: 6, code: 'AAO' },
        roleOverride: null,
        folderRoleOverride: null,
        folderParent: null,
        docFolder: null,
        pageFolder: null,
        ...overrides,
    };

    return {
        async query(sql) {
            if (sql.includes('SELECT permission FROM acl_overrides') && sql.includes('user_id')) {
                return cfg.userOverride ? { rows: [{ permission: cfg.userOverride }] } : { rows: [] };
            }
            if (sql.includes('SELECT u.role_id')) {
                return cfg.userRole ? { rows: [cfg.userRole] } : { rows: [] };
            }
            if (sql.includes('SELECT permission FROM acl_overrides') && sql.includes('role_id')) {
                return cfg.roleOverride ? { rows: [{ permission: cfg.roleOverride }] } : { rows: [] };
            }
            if (sql.includes('SELECT ao.permission')) {
                return cfg.folderRoleOverride ? { rows: [{ permission: cfg.folderRoleOverride }] } : { rows: [] };
            }
            if (sql.includes('SELECT parent_id FROM folder_nodes')) {
                return cfg.folderParent !== undefined
                    ? { rows: cfg.folderParent !== null ? [{ parent_id: cfg.folderParent }] : [{ parent_id: null }] }
                    : { rows: [] };
            }
            if (sql.includes('SELECT folder_id FROM documents')) {
                return cfg.docFolder !== null ? { rows: [{ folder_id: cfg.docFolder }] } : { rows: [] };
            }
            if (sql.includes('SELECT d.folder_id FROM document_pages')) {
                return cfg.pageFolder !== null ? { rows: [{ folder_id: cfg.pageFolder }] } : { rows: [] };
            }
            return { rows: [] };
        }
    };
}

// ── Test Suite ───────────────────────────────────────────────────────────────
async function run() {
    console.log('\nresolvePermission() Integration Tests\n' + '='.repeat(45));

    await test('1. INDIVIDUAL role is always denied', async () => {
        const db = makeDb({ userRole: { role_id: 2, office_id: 1, rank: 99, code: 'INDIVIDUAL' } });
        expect(await resolvePermission(10, 'folder', 5, db)).toBe('none');
    });

    await test('2. SYSADMIN always receives edit', async () => {
        const db = makeDb({ userRole: { role_id: 1, office_id: null, rank: 1, code: 'SYSADMIN' } });
        expect(await resolvePermission(1, 'folder', 5, db)).toBe('edit');
    });

    await test('3. User-level ACL override wins over role default', async () => {
        const db = makeDb({
            userRole: { role_id: 9, office_id: 1, rank: 8, code: 'AUDITOR' },
            userOverride: 'edit',
            roleOverride: 'view',
        });
        expect(await resolvePermission(50, 'folder', 10, db)).toBe('edit');
    });

    await test('4. Role-level ACL override wins when no user override exists', async () => {
        const db = makeDb({
            userRole: { role_id: 7, office_id: 1, rank: 6, code: 'AAO' },
            userOverride: null,
            roleOverride: 'edit',
            folderRoleOverride: 'view',
        });
        expect(await resolvePermission(20, 'file', 15, db)).toBe('edit');
    });

    await test('5. Nearest ancestor folder ACL applies when no explicit override', async () => {
        const db = makeDb({
            userRole: { role_id: 9, office_id: 2, rank: 8, code: 'AUDITOR' },
            userOverride: null,
            roleOverride: null,
            docFolder: 42,
            folderRoleOverride: 'view',
            folderParent: null,
        });
        expect(await resolvePermission(30, 'file', 200, db)).toBe('view');
    });

    await test('6. Office Admin scoping — no folder override = none (different office)', async () => {
        const db = makeDb({
            userRole: { role_id: 3, office_id: 1, rank: 2, code: 'OFFICE_ADMIN' },
            userOverride: null,
            roleOverride: null,
            pageFolder: 99,
            folderRoleOverride: null,
            folderParent: null,
        });
        expect(await resolvePermission(40, 'page', 300, db)).toBe('none');
    });

    await test('7a. Two Auditors in same office both receive view from folder ACL', async () => {
        const makeAuditorDb = () => makeDb({
            userRole: { role_id: 9, office_id: 3, rank: 8, code: 'AUDITOR' },
            userOverride: null,
            roleOverride: null,
            docFolder: 55,
            folderRoleOverride: 'view',
            folderParent: null,
        });
        const [r1, r2] = await Promise.all([
            resolvePermission(101, 'file', 500, makeAuditorDb()),
            resolvePermission(102, 'file', 500, makeAuditorDb()),
        ]);
        expect(r1).toBe('view');
        expect(r2).toBe('view');
    });

    await test('7b. One Auditor personal edit override, sibling Auditor still gets view', async () => {
        const db101 = makeDb({
            userRole: { role_id: 9, office_id: 3, rank: 8, code: 'AUDITOR' },
            userOverride: 'edit',
        });
        const db102 = makeDb({
            userRole: { role_id: 9, office_id: 3, rank: 8, code: 'AUDITOR' },
            userOverride: null,
            roleOverride: null,
            docFolder: 55,
            folderRoleOverride: 'view',
            folderParent: null,
        });
        expect(await resolvePermission(101, 'file', 500, db101)).toBe('edit');
        expect(await resolvePermission(102, 'file', 500, db102)).toBe('view');
    });

    await test('8. Default deny when no overrides match', async () => {
        const db = makeDb({
            userRole: { role_id: 9, office_id: 1, rank: 8, code: 'AUDITOR' },
            userOverride: null,
            roleOverride: null,
            docFolder: 77,
            folderRoleOverride: null,
            folderParent: null,
        });
        expect(await resolvePermission(99, 'file', 999, db)).toBe('none');
    });

    await test('9. Sr Aud (rank 7) and Auditor (rank 8) both resolve from role override', async () => {
        const srAudDb = makeDb({
            userRole: { role_id: 8, office_id: 1, rank: 7, code: 'SR_AUD' },
            userOverride: null,
            roleOverride: 'view',
        });
        const auditorDb = makeDb({
            userRole: { role_id: 9, office_id: 1, rank: 8, code: 'AUDITOR' },
            userOverride: null,
            roleOverride: 'view',
        });
        expect(await resolvePermission(201, 'folder', 30, srAudDb)).toBe('view');
        expect(await resolvePermission(202, 'folder', 30, auditorDb)).toBe('view');
    });

    console.log('\n' + '='.repeat(45));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('Test runner crashed:', err);
    process.exit(1);
});
