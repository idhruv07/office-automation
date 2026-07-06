const db = require('../../config/db');

async function seedRepo() {
    console.log('Seeding repository dummy data...');
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Clear existing data to prevent conflicts
        await client.query('TRUNCATE folder_nodes, documents, document_pages CASCADE');

        // Find offices
        const offices = await client.query('SELECT id, name FROM offices ORDER BY id');
        if (offices.rows.length === 0) throw new Error('No offices found to seed');
        const hqId = offices.rows.find(o => o.name === 'Headquarters')?.id || offices.rows[0].id;
        const branchId = offices.rows.find(o => o.name !== 'Headquarters')?.id || offices.rows[0].id;

        // Find users (SysAdmin and an Auditor/Office Admin)
        const sysAdmin = await client.query("SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.code = 'SYSADMIN' LIMIT 1");
        const sysAdminId = sysAdmin.rows[0]?.id || 1;

        // Insert Folders
        const f1 = await client.query("INSERT INTO folder_nodes (name, office_id, sort_order) VALUES ('General Admin', $1, 1) RETURNING id", [hqId]);
        const folder1Id = f1.rows[0].id;

        const f2 = await client.query("INSERT INTO folder_nodes (name, parent_id, office_id, sort_order) VALUES ('Circulars', $1, $2, 1) RETURNING id", [folder1Id, hqId]);
        const folder2Id = f2.rows[0].id;

        const f3 = await client.query("INSERT INTO folder_nodes (name, parent_id, office_id, sort_order) VALUES ('Internal Orders', $1, $2, 2) RETURNING id", [folder1Id, hqId]);
        const folder3Id = f3.rows[0].id;

        const f4 = await client.query("INSERT INTO folder_nodes (name, office_id, sort_order) VALUES ('IT Assets', $1, 2) RETURNING id", [branchId]);
        const folder4Id = f4.rows[0].id;

        // Insert Documents
        const d1 = await client.query("INSERT INTO documents (folder_id, reference_no, title, owner_type, owner_office_id) VALUES ($1, 'CIR-2026-001', 'Office Timings Update', 'office', $2) RETURNING id", [folder2Id, hqId]);
        const doc1Id = d1.rows[0].id;

        const d2 = await client.query("INSERT INTO documents (folder_id, reference_no, title, owner_type, owner_office_id) VALUES ($1, 'ORD-2026-042', 'New Travel Policy', 'office', $2) RETURNING id", [folder3Id, hqId]);
        const doc2Id = d2.rows[0].id;

        const d3 = await client.query("INSERT INTO documents (folder_id, reference_no, title, owner_type, owner_office_id) VALUES ($1, 'IT-SYS-99', 'Server Maintenance Schedule', 'system', $2) RETURNING id", [folder4Id, branchId]);
        const doc3Id = d3.rows[0].id;

        // Insert Pages
        await client.query("INSERT INTO document_pages (document_id, page_date, sequence_no, title, is_editable, html_content) VALUES ($1, '2026-01-10', 1, 'Original Circular', true, '<p>Office timings will be 09:30 to 18:00 effective immediately.</p>')", [doc1Id]);
        await client.query("INSERT INTO document_pages (document_id, page_date, sequence_no, title, is_editable, html_content) VALUES ($1, '2026-01-15', 2, 'Amendment', true, '<p>Grace period of 15 minutes is allowed.</p>')", [doc1Id]);

        await client.query("INSERT INTO document_pages (document_id, page_date, sequence_no, title, is_editable, html_content) VALUES ($1, '2026-02-01', 1, 'Policy Document', true, '<p>All domestic travel must use economy class.</p>')", [doc2Id]);

        await client.query("INSERT INTO document_pages (document_id, page_date, sequence_no, title, is_editable, html_content) VALUES ($1, '2026-03-01', 1, 'Maintenance Log', true, '<p>Servers will be down on Sunday 2am-4am.</p>')", [doc3Id]);

        await client.query('COMMIT');
        console.log('Repository dummy data seeded successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding repo data:', err);
    } finally {
        client.release();
    }
}

seedRepo().then(() => process.exit(0));
