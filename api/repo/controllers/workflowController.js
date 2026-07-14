const db = require('../../../config/repo_db');
const { isOfficeAdminHierarchy } = require('../../lib/permissions');

async function getUserRoleAndRank(userId, dbClient) {
    const res = await dbClient.query(
        `SELECT u.name, r.code as role_code, r.rank 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.id = $1`,
        [userId]
    );
    if (res.rows.length === 0) {
        throw new Error('User not found');
    }
    return res.rows[0];
}

async function getUsersByRole(req, res) {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const { role } = req.params;
        let rolesFilter = [role];
        if (role === 'AUDITOR') {
            rolesFilter = ['AUDITOR', 'SR_AUD'];
        }
        
        const result = await db.query(
            `SELECT u.id, u.name, u.designation, r.code as role_code 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE r.code = ANY($1) AND u.is_active = true 
             ORDER BY u.name`,
            [rolesFilter]
        );
        res.json({ users: result.rows });
    } catch (err) {
        console.error('GET /api/repo/users/role error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

async function getDocumentWorkflow(req, res) {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const docId = parseInt(req.params.id);
        
        let wfResult = await db.query(
            'SELECT * FROM document_workflow WHERE document_id = $1',
            [docId]
        );
        
        if (wfResult.rows.length === 0) {
            await db.query(
                `INSERT INTO document_workflow (document_id, status, current_owner_role, comments)
                 VALUES ($1, 'Draft', 'AUDITOR', '[]'::jsonb)`,
                [docId]
            );
            wfResult = await db.query(
                'SELECT * FROM document_workflow WHERE document_id = $1',
                [docId]
            );
        }
        
        const locksRes = await db.query(
            `SELECT l.*, u.name as holder_name, u.username as holder_username 
             FROM page_edit_locks l 
             JOIN users u ON l.held_by = u.id 
             WHERE l.page_id IN (SELECT id FROM document_pages WHERE document_id = $1)`,
            [docId]
        );
        
        const docResult = await db.query(
            `SELECT d.title, f.name as folder_name 
             FROM documents d 
             LEFT JOIN folder_nodes f ON d.folder_id = f.id 
             WHERE d.id = $1`,
            [docId]
        );
        const folderName = docResult.rows[0]?.folder_name || 'Root';

        const userInfo = await getUserRoleAndRank(req.user.id, db);
        const userRole = userInfo.role_code === 'SR_AUD' ? 'AUDITOR' : userInfo.role_code;

        res.json({
            workflow: wfResult.rows[0],
            active_locks: locksRes.rows,
            folder_name: folderName,
            user: {
                name: userInfo.name,
                role: userRole,
                rank: userInfo.rank
            }
        });
    } catch (err) {
        console.error('GET /api/repo/documents/:id/workflow error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

async function executeWorkflowAction(req, res) {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const docId = parseInt(req.params.id);
        const { action, comments, target_role, target_user_name, selected_page_ids } = req.body;
        
        const userInfo = await getUserRoleAndRank(req.user.id, db);
        const userRole = userInfo.role_code === 'SR_AUD' ? 'AUDITOR' : userInfo.role_code;
        const userName = userInfo.name;
        
        let wfResult = await db.query(
            'SELECT * FROM document_workflow WHERE document_id = $1',
            [docId]
        );
        if (wfResult.rows.length === 0) {
            await db.query(
                `INSERT INTO document_workflow (document_id, status, current_owner_role, comments)
                 VALUES ($1, 'Draft', 'AUDITOR', '[]'::jsonb)`,
                [docId]
            );
            wfResult = await db.query(
                'SELECT * FROM document_workflow WHERE document_id = $1',
                [docId]
            );
        }
        const wf = wfResult.rows[0];
        
        let newStatus = wf.status;
        let newOwnerRole = wf.current_owner_role;
        
        if (action === 'submit') {
            if (wf.current_owner_role !== userRole) {
                return res.status(400).json({ message: `Only the current owner (${wf.current_owner_role}) can forward this document.` });
            }
            if (userRole === 'AUDITOR') {
                newStatus = 'Submitted to AAO';
                newOwnerRole = 'AAO';
            } else if (userRole === 'AAO') {
                newStatus = 'Submitted to SAO';
                newOwnerRole = 'SAO';
            } else if (userRole === 'SAO') {
                newStatus = 'Submitted to GO';
                newOwnerRole = 'GO';
            } else if (userRole === 'GO') {
                newStatus = 'Submitted to Addl CDA';
                newOwnerRole = 'ADDN_CDA';
            } else if (userRole === 'ADDN_CDA') {
                newStatus = 'Approved';
                newOwnerRole = 'ADDN_CDA';
            } else {
                return res.status(400).json({ message: 'Invalid role for workflow actions.' });
            }
        } else if (action === 'rollback') {
            if (wf.current_owner_role !== userRole) {
                return res.status(400).json({ message: `Only the current owner (${wf.current_owner_role}) can return this document.` });
            }
            if (!target_role) {
                return res.status(400).json({ message: 'target_role is required for rollback.' });
            }
            const roleRanks = { 'AUDITOR': 8, 'AAO': 6, 'SAO': 5, 'GO': 4, 'ADDN_CDA': 3 };
            if (!roleRanks[target_role] || roleRanks[target_role] <= roleRanks[userRole]) {
                return res.status(400).json({ message: 'Invalid target role for returning (must be a lower authority rank).' });
            }
            
            newStatus = `Returned to ${target_role === 'AUDITOR' ? 'Auditor' : target_role}`;
            newOwnerRole = target_role;
        } else if (action === 'pullback') {
            const pullBackRules = {
                'AUDITOR': { expectedStatus: 'Submitted to AAO', targetStatus: 'Draft' },
                'AAO': { expectedStatus: 'Submitted to SAO', targetStatus: 'Submitted to AAO' },
                'SAO': { expectedStatus: 'Submitted to GO', targetStatus: 'Submitted to SAO' },
                'GO': { expectedStatus: 'Submitted to Addl CDA', targetStatus: 'Submitted to GO' }
            };
            
            const rule = pullBackRules[userRole];
            if (!rule || wf.status !== rule.expectedStatus) {
                return res.status(400).json({ message: `Cannot pull back document in its current status (${wf.status}) for role ${userRole}.` });
            }
            
            newStatus = rule.targetStatus;
            newOwnerRole = userRole;
        } else if (action === 'takeover') {
            newStatus = `Draft (Taken over by ${userRole === 'AUDITOR' ? 'Auditor' : userRole})`;
            newOwnerRole = userRole;
            
            await db.query(
                `DELETE FROM page_edit_locks 
                 WHERE page_id IN (SELECT id FROM document_pages WHERE document_id = $1)`,
                [docId]
            );
        } else {
            return res.status(400).json({ message: 'Invalid action.' });
        }
        
        // Check if we need to split only a subset of pages into a new document for forwarding
        let splitDocId = null;
        if (action === 'submit' && selected_page_ids && Array.isArray(selected_page_ids) && selected_page_ids.length > 0) {
            const allPagesRes = await db.query(
                'SELECT id FROM document_pages WHERE document_id = $1 ORDER BY sequence_no',
                [docId]
            );
            const totalPageCount = allPagesRes.rows.length;
            
            if (selected_page_ids.length < totalPageCount) {
                const client = await db.pool.connect();
                try {
                    await client.query('BEGIN');
                    
                    const docRes = await client.query('SELECT * FROM documents WHERE id = $1', [docId]);
                    const doc = docRes.rows[0];
                    
                    const splitDocRes = await client.query(
                        `INSERT INTO documents (folder_id, reference_no, title, owner_type, owner_office_id, transferred_from_id)
                         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                        [doc.folder_id, doc.reference_no, `${doc.title} (Split Excerpt)`, doc.owner_type, doc.owner_office_id, docId]
                    );
                    splitDocId = splitDocRes.rows[0].id;
                    
                    const pagesToMoveRes = await client.query(
                        'SELECT id, title FROM document_pages WHERE id = ANY($1)',
                        [selected_page_ids]
                    );
                    
                    let seq = 1;
                    for (const pId of selected_page_ids) {
                        await client.query(
                            `UPDATE document_pages 
                             SET document_id = $1, sequence_no = $2 
                             WHERE id = $3`,
                            [splitDocId, seq++, pId]
                        );
                    }
                    
                    const remainingPagesRes = await client.query(
                        'SELECT id FROM document_pages WHERE document_id = $1 ORDER BY sequence_no',
                        [docId]
                    );
                    let remSeq = 1;
                    for (const rp of remainingPagesRes.rows) {
                        await client.query(
                            'UPDATE document_pages SET sequence_no = $1 WHERE id = $2',
                            [remSeq++, rp.id]
                        );
                    }
                    
                    const splitComments = [
                        {
                            role: userRole,
                            user: userName,
                            action: target_user_name ? `Forward to ${target_user_name}` : 'Forward',
                            text: `Split excerpt document created from original note. ${comments || ''}`,
                            date: new Date().toISOString()
                        }
                    ];
                    
                    await client.query(
                        `INSERT INTO document_workflow (document_id, status, current_owner_role, comments)
                         VALUES ($1, $2, $3, $4)`,
                        [splitDocId, newStatus, newOwnerRole, JSON.stringify(splitComments)]
                    );
                    
                    const origLog = {
                        role: userRole,
                        user: userName,
                        action: 'Split & Forward Pages',
                        text: `Split pages [${pagesToMoveRes.rows.map(p => p.title || 'Untitled').join(', ')}] into a new document and forwarded to ${target_user_name || newOwnerRole}.`,
                        date: new Date().toISOString()
                    };
                    const updatedOrigComments = [...(wf.comments || []), origLog];
                    await client.query(
                        `UPDATE document_workflow 
                         SET comments = $1, updated_at = NOW() 
                         WHERE document_id = $2`,
                        [JSON.stringify(updatedOrigComments), docId]
                    );
                    
                    await client.query('COMMIT');
                } catch (err) {
                    await client.query('ROLLBACK');
                    throw err;
                } finally {
                    client.release();
                }
            }
        }
        
        if (splitDocId) {
            return res.json({ 
                message: `Pages successfully split into a new document and forwarded.`, 
                split: true, 
                new_document_id: splitDocId 
            });
        }
        
        const commentObj = {
            role: userRole,
            user: userName,
            action: action === 'submit' ? (userRole === 'ADDN_CDA' ? 'Approve' : (target_user_name ? `Forward to ${target_user_name}` : 'Forward')) : (action === 'rollback' ? 'Return' : 'Pull Back'),
            text: comments || '',
            date: new Date().toISOString()
        };
        
        const updatedComments = [...(wf.comments || []), commentObj];
        
        await db.query(
            `UPDATE document_workflow 
             SET status = $1, current_owner_role = $2, comments = $3, updated_at = NOW() 
             WHERE document_id = $4`,
            [newStatus, newOwnerRole, JSON.stringify(updatedComments), docId]
        );
        
        res.json({ message: 'Workflow action applied successfully', status: newStatus, current_owner_role: newOwnerRole });
    } catch (err) {
        console.error('POST /api/repo/documents/:id/workflow/action error:', err);
        res.status(500).json({ message: 'Server error' });
    }
}

module.exports = {
    getUserRoleAndRank,
    getUsersByRole,
    getDocumentWorkflow,
    executeWorkflowAction
};
