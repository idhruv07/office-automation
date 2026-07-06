/**
 * permissions.js — resolvePermission helper
 *
 * Resolution order (most specific wins):
 *   1. User-level override for this exact subject
 *   2. Role-level override for this exact subject
 *   3. Nearest ancestor folder's rank-default (walk up folder_nodes tree)
 *   4. Deny (none)
 *
 * @param {number} userId        - The requesting user's id
 * @param {string} subjectType   - 'folder' | 'file' | 'page'
 * @param {number} subjectId     - The id of the subject
 * @param {object} db            - pg pool/client (must expose .query())
 * @returns {Promise<'view'|'edit'|'none'>}
 */
async function resolvePermission(userId, subjectType, subjectId, db) {
    // 1. User-level override on this exact subject
    const userOverride = await db.query(
        `SELECT permission FROM acl_overrides
         WHERE user_id = $1 AND subject_type = $2 AND subject_id = $3 -- user_level_override
         ORDER BY created_at DESC LIMIT 1`,
        [userId, subjectType, subjectId]
    );
    if (userOverride.rows.length > 0) {
        return userOverride.rows[0].permission;
    }

    // Get the user's role_id and office_id
    const userRes = await db.query(
        `SELECT u.role_id, u.office_id, r.rank, r.code
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1`,
        [userId]
    );
    if (userRes.rows.length === 0) return 'none';

    const { role_id, office_id, rank, code } = userRes.rows[0];

    // INDIVIDUAL role never has access to repository content
    if (code === 'INDIVIDUAL') return 'none';

    // SYSADMIN always has full edit access
    if (code === 'SYSADMIN') return 'edit';

    // 2. Role-level override on this exact subject
    const roleOverride = await db.query(
        `SELECT permission FROM acl_overrides
         WHERE role_id = $1 AND subject_type = $2 AND subject_id = $3 -- role_level_override
         ORDER BY created_at DESC LIMIT 1`,
        [role_id, subjectType, subjectId]
    );
    if (roleOverride.rows.length > 0) {
        return roleOverride.rows[0].permission;
    }

    // 3. Walk up the folder_nodes tree to find the nearest ancestor
    //    with an office-scoped rank-based default.
    //    For 'folder' subjects, start at that folder.
    //    For 'file' subjects, start at documents.folder_id.
    //    For 'page'  subjects, start at document_pages → documents.folder_id.
    let folderId = null;

    if (subjectType === 'folder') {
        folderId = subjectId;
    } else if (subjectType === 'file') {
        const docRes = await db.query('SELECT folder_id FROM documents WHERE id = $1', [subjectId]);
        if (docRes.rows.length > 0) folderId = docRes.rows[0].folder_id;
    } else if (subjectType === 'page') {
        const pageRes = await db.query(
            `SELECT d.folder_id FROM document_pages dp
             JOIN documents d ON dp.document_id = d.id
             WHERE dp.id = $1`,
            [subjectId]
        );
        if (pageRes.rows.length > 0) folderId = pageRes.rows[0].folder_id;
    }

    // Walk ancestors: check each folder in the tree for a role override
    // that applies to this user's rank + office scope
    while (folderId !== null) {
        // Check for a role override on this ancestor folder scoped to same office (or global)
        const folderRoleOverride = await db.query(
            `SELECT ao.permission
             FROM acl_overrides ao
             JOIN roles r2 ON ao.role_id = r2.id
             JOIN folder_nodes fn ON fn.id = $1
             WHERE ao.subject_type = 'folder'
               AND ao.subject_id = $1
               AND (
                 ao.role_id = $2
                 OR ((fn.office_id = $3 OR fn.office_id IS NULL) AND r2.rank >= $4)
               )
             ORDER BY ao.created_at DESC LIMIT 1`,
            [folderId, role_id, office_id, rank]
        );
        if (folderRoleOverride.rows.length > 0) {
            return folderRoleOverride.rows[0].permission;
        }

        // Move up to parent folder
        const parentRes = await db.query(
            'SELECT parent_id FROM folder_nodes WHERE id = $1',
            [folderId]
        );
        if (parentRes.rows.length === 0 || parentRes.rows[0].parent_id === null) {
            // Reached root without finding overrides.
            // Grant default access if the final resolved folder (the original subject)
            // or the root belongs to the user's office (or is global).
            break;
        }
        folderId = parentRes.rows[0].parent_id;
    }

    // 4. Default if no ACL overrides were found in the entire chain:
    // If we can determine the original subject's office_id, check it against the user's office_id.
    let subjectOfficeId = null;
    if (subjectType === 'folder') {
        const res = await db.query('SELECT office_id FROM folder_nodes WHERE id = $1', [subjectId]);
        if (res.rows.length > 0) subjectOfficeId = res.rows[0].office_id;
    } else if (subjectType === 'file') {
        const res = await db.query('SELECT f.office_id FROM documents d JOIN folder_nodes f ON d.folder_id = f.id WHERE d.id = $1', [subjectId]);
        if (res.rows.length > 0) subjectOfficeId = res.rows[0].office_id;
    } else if (subjectType === 'page') {
        const res = await db.query('SELECT f.office_id FROM document_pages dp JOIN documents d ON dp.document_id = d.id JOIN folder_nodes f ON d.folder_id = f.id WHERE dp.id = $1', [subjectId]);
        if (res.rows.length > 0) subjectOfficeId = res.rows[0].office_id;
    }

    // If the folder is in the same office (or global), and the user is Office Admin hierarchy:
    if (subjectOfficeId === office_id || subjectOfficeId === null) {
        // AAO and above (rank <= 8) can edit by default
        if (rank <= 8) return 'edit';
        // Others in office admin hierarchy can view
        return 'view';
    }

    return 'none';
}

/**
 * canManageFolder — checks if a user's role code allows folder creation/reordering
 * Available to Auditor and above (rank <= 8, i.e. not INDIVIDUAL)
 */
async function canManageFolder(userId, db) {
    const res = await db.query(
        `SELECT r.rank, r.code FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
        [userId]
    );
    if (res.rows.length === 0) return false;
    const { rank, code } = res.rows[0];
    return code !== 'INDIVIDUAL' && rank <= 8; // AUDITOR = rank 8
}

/**
 * isOfficeAdminHierarchy — true for any role in the Office Admin tree (not INDIVIDUAL)
 */
async function isOfficeAdminHierarchy(userId, db) {
    const res = await db.query(
        `SELECT r.code FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
        [userId]
    );
    if (res.rows.length === 0) return false;
    return res.rows[0].code !== 'INDIVIDUAL';
}

module.exports = { resolvePermission, canManageFolder, isOfficeAdminHierarchy };
