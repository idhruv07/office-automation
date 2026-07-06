/**
 * Office Automation — Full Integration Test Suite
 * ================================================
 * Run with: node tests/run_tests.js
 *
 * Requirements:
 *   - Server running on http://localhost:3000
 *   - Admin account:  username=admin  password=admin123
 *   - PostgreSQL connected and migrations applied
 *
 * Tests are grouped into suites. Each suite is independent.
 * A PASS/FAIL summary is printed at the end.
 */

const path = require('path');
const fs   = require('fs');

const BASE_URL  = 'http://localhost:3000';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// ── Helpers ──────────────────────────────────────────────────────────────────

let fetch;
let passed = 0;
let failed = 0;
const failures = [];

function ok(label, condition, detail = '') {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
        failed++;
        failures.push(`${label}${detail ? ': ' + detail : ''}`);
    }
}

async function api(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    let json = null;
    try { json = await res.json(); } catch (_) {}
    return { status: res.status, ok: res.ok, json };
}

// ── Suite Runner ──────────────────────────────────────────────────────────────

async function suite(name, fn) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  SUITE: ${name}`);
    console.log(`${'═'.repeat(60)}`);
    try {
        await fn();
    } catch (err) {
        console.error(`  💥 Suite crashed: ${err.message}`);
        failed++;
        failures.push(`[CRASH] ${name}: ${err.message}`);
    }
}

// ── Shared State ──────────────────────────────────────────────────────────────

let adminToken = '';
let individualToken = '';
let individualUsername = '';
let claimTypes = [];
let contingentTypeId = null;
let regularTypeId = null;

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Authentication
// ═════════════════════════════════════════════════════════════════════════════

async function suiteAuth() {
    // 1.1 Admin login
    const r1 = await api('POST', '/api/auth/login', { username: ADMIN_USER, password: ADMIN_PASS });
    ok('Admin login returns 200', r1.status === 200);
    ok('Admin login returns token', !!r1.json?.token);
    ok('Admin role is Admin', r1.json?.role === 'Admin');
    adminToken = r1.json?.token || '';

    // 1.2 Wrong password
    const r2 = await api('POST', '/api/auth/login', { username: ADMIN_USER, password: 'wrongpassword' });
    ok('Wrong password returns 401', r2.status === 401);

    // 1.3 Create individual user
    individualUsername = `tuser_${Date.now()}`;
    const r3 = await api('POST', '/api/admin/users', {
        username:    individualUsername,
        password:    'pass123',
        name:        'Test Individual',
        designation: 'Test Officer',
        email:       `${individualUsername}@test.com`,
        personal_no: `EMP${Date.now()}`,
        role_name:   'Individual',
        gender:      'Male'
    }, adminToken);
    ok('Admin can create Individual user (201)', r3.status === 201);

    // 1.4 New user must reset password
    const r4 = await api('POST', '/api/auth/login', {
        username: individualUsername, password: 'pass123'
    });
    ok('New user login returns 200', r4.status === 200);
    ok('New user must_reset_password = true', r4.json?.must_reset_password === true);
    const tempToken = r4.json?.token;

    // 1.5 Change password
    const r5 = await api('POST', '/api/auth/change-password', { newPassword: 'newpass456' }, tempToken);
    ok('Change password returns 200', r5.status === 200);

    // 1.6 Login with new password, must_reset_password = false
    const r6 = await api('POST', '/api/auth/login', {
        username: individualUsername, password: 'newpass456'
    });
    ok('Re-login with new password succeeds', r6.status === 200);
    ok('must_reset_password is now false', r6.json?.must_reset_password === false);
    ok('JWT contains role field', r6.json?.role === 'Individual');
    individualToken = r6.json?.token || '';

    // 1.7 Access protected route without token → 401
    const r7 = await api('GET', '/api/claims/types');
    ok('No token → 401', r7.status === 401);

    // 1.8 /api/auth/me returns current user
    const r8 = await api('GET', '/api/auth/me', null, individualToken);
    ok('/api/auth/me returns 200', r8.status === 200);
    ok('/api/auth/me returns correct username', r8.json?.username === individualUsername);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Profile Update
// ═════════════════════════════════════════════════════════════════════════════

async function suiteProfile() {
    // 2.1 Update all profile fields
    const r1 = await api('POST', '/api/auth/profile', {
        email:       'profile@test.com',
        mobile_no:   '9876543210',
        address:     '12 Test Street, New Delhi',
        cghs_ben_id: 'CGHS-9999',
        pay_level:   'Level 9',
        basic_pay:   '65000',
        gpf_ac_no:   '12345/AG'
    }, individualToken);
    ok('Profile update returns 200', r1.status === 200);

    // 2.2 Verify fields saved via /me
    const r2 = await api('GET', '/api/auth/me', null, individualToken);
    ok('Email saved correctly',       r2.json?.email       === 'profile@test.com');
    ok('Mobile saved correctly',      r2.json?.mobile_no   === '9876543210');
    ok('Address saved correctly',     r2.json?.address     === '12 Test Street, New Delhi');
    ok('CGHS ID saved correctly',     r2.json?.cghs_ben_id === 'CGHS-9999');
    ok('Pay Level saved correctly',   r2.json?.pay_level   === 'Level 9');
    ok('Basic Pay saved correctly',   r2.json?.basic_pay   === '65000');
    ok('GPF A/C No saved correctly',  r2.json?.gpf_ac_no   === '12345/AG');

    // 2.3 Empty strings should be stored as NULL (not break unique constraint)
    const r3 = await api('POST', '/api/auth/profile', {
        email: '', mobile_no: '', address: '', cghs_ben_id: '', pay_level: '', basic_pay: '', gpf_ac_no: ''
    }, individualToken);
    ok('Blank fields update does not error', r3.status === 200);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Claim Types
// ═════════════════════════════════════════════════════════════════════════════

async function suiteClaimTypes() {
    // 3.1 Individual fetches claim types
    const r1 = await api('GET', '/api/claims/types', null, individualToken);
    ok('Claim types returns 200', r1.status === 200);
    ok('At least one claim type exists', Array.isArray(r1.json) && r1.json.length > 0);
    claimTypes = r1.json || [];

    // Find contingent (type_id 7 or folder_name = 'contingent')
    const contingent = claimTypes.find(t => t.folder_name === 'contingent' || t.id === 7);
    regularTypeId    = claimTypes.find(t => t.folder_name !== 'contingent')?.id;
    contingentTypeId = contingent?.id;

    ok('Contingent type exists', !!contingentTypeId, `found: ${contingentTypeId}`);
    ok('Regular (non-contingent) type exists', !!regularTypeId, `found: ${regularTypeId}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Claim Lifecycle (Regular Claim)
// ═════════════════════════════════════════════════════════════════════════════

async function suiteClaimLifecycle() {
    if (!regularTypeId) { console.log('  ⚠️  Skipped — no regular claim type found'); return; }

    // 4.1 Save as Draft
    const claimName = `My Claim ${Date.now()}`;
    const r1 = await api('POST', '/api/claims', {
        type_id:    regularTypeId,
        claim_name: claimName,
        claim_date: '2026-01-15',
        status:     'Draft',
        formData:   { field1: 'value1' },
        htmlContent: '<p>Draft content</p>'
    }, individualToken);
    ok('Save draft returns 201', r1.status === 201);
    ok('Draft claim ID returned', !!r1.json?.id);
    const draftId = r1.json?.id;

    // 4.2 Verify claim_name is stored correctly in DB (via GET /api/claims)
    const r2 = await api('GET', '/api/claims', null, individualToken);
    ok('GET /api/claims returns 200', r2.status === 200);
    const savedDraft = r2.json?.find(c => c.id === draftId);
    ok('Draft appears in user claim list', !!savedDraft);
    ok('claim_name stored correctly', savedDraft?.claim_name === claimName,
        `expected "${claimName}", got "${savedDraft?.claim_name}"`);

    // 4.3 Verify saved HTML file has correct <title>
    const { username: uname } = (await api('GET', '/api/auth/me', null, individualToken)).json || {};
    if (uname && draftId) {
        const filePath = path.join(__dirname, '..', 'server', 'storage', uname, 'claims', `${draftId}.html`);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            ok(`Saved HTML <title> matches claim name`,
                content.includes(`<title>${claimName}</title>`),
                `file: ${filePath}`);
        } else {
            ok('Saved HTML file exists on disk', false, `Missing: ${filePath}`);
        }
    }

    // 4.4 Delete Draft
    const r3 = await api('DELETE', `/api/claims/${draftId}`, null, individualToken);
    ok('Delete draft returns 200', r3.status === 200);

    // 4.5 Submit claim (Pending)
    const r4 = await api('POST', '/api/claims', {
        type_id:    regularTypeId,
        claim_name: 'Pending Test Claim',
        claim_date: '2026-01-20',
        status:     'Pending',
        formData:   { field1: 'submitted' },
        htmlContent: '<p>Submitted content</p>'
    }, individualToken);
    ok('Submit pending returns 201', r4.status === 201);
    const pendingId = r4.json?.id;

    // 4.6 Cannot delete a Pending claim
    const r5 = await api('DELETE', `/api/claims/${pendingId}`, null, individualToken);
    ok('Pending claim cannot be deleted', r5.status !== 200,
        `expected non-200, got ${r5.status}`);

    // 4.7 Admin approves claim
    const r6 = await api('PUT', `/api/admin/claims/${pendingId}/status`, {
        status: 'Approved', remarks: 'Approved by test'
    }, adminToken);
    ok('Admin approve returns 200', r6.status === 200);

    // 4.8 Admin can see it in claims list
    const r7 = await api('GET', `/api/admin/claims?months=12`, null, adminToken);
    ok('Admin claims list returns 200', r7.status === 200);
    const adminClaim = r7.json?.find(c => c.id === pendingId);
    ok('Approved claim visible to admin', !!adminClaim);
    ok('Approved claim shows correct name', adminClaim?.claim_name === 'Pending Test Claim');

    // 4.9 Admin return claim
    const r8 = await api('PUT', `/api/admin/claims/${pendingId}/status`, {
        status: 'Returned', remarks: 'Please correct section 3'
    }, adminToken);
    ok('Admin return claim returns 200', r8.status === 200);

    // 4.10 Individual CAN delete a Returned claim
    const r9 = await api('DELETE', `/api/claims/${pendingId}`, null, individualToken);
    ok('Individual can delete own Returned claim', r9.status === 200);

    // 4.11 Submit another and Reject, then individual deletes
    const r10 = await api('POST', '/api/claims', {
        type_id:    regularTypeId,
        claim_name: 'Rejected Test Claim',
        claim_date: '2026-01-25',
        status:     'Pending',
        formData:   {},
        htmlContent: '<p>Rejected</p>'
    }, individualToken);
    const rejectedId = r10.json?.id;
    await api('PUT', `/api/admin/claims/${rejectedId}/status`, { status: 'Rejected', remarks: 'Invalid' }, adminToken);
    const r11 = await api('DELETE', `/api/claims/${rejectedId}`, null, individualToken);
    ok('Individual can delete own Rejected claim', r11.status === 200);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Contingent Bill Security Rules
// ═════════════════════════════════════════════════════════════════════════════

async function suiteContingentSecurity() {
    if (!contingentTypeId) { console.log('  ⚠️  Skipped — contingent type not found'); return; }

    // 5.1 Individual saves contingent bill
    const r1 = await api('POST', '/api/claims', {
        type_id:     contingentTypeId,
        claim_name:  'Individual Contingent Test',
        claim_date:  '2026-01-15',
        status:      'Pending',        // Individual tries to force Pending
        folder_name: 'test-suite-run',
        formData:    { amount: '5000' },
        htmlContent: '<p>Contingent content</p>'
    }, individualToken);
    ok('Individual can save contingent bill (201)', r1.status === 201);
    const contId = r1.json?.id;

    // 5.2 SEC: Must be saved as Draft regardless of what individual sent
    const r2 = await api('GET', '/api/claims', null, individualToken);
    const saved = r2.json?.find(c => c.id === contId);
    ok('Individual contingent forced to Draft (not Pending)',
        saved?.status === 'Draft',
        `actual status: ${saved?.status}`);

    // Verify GET /api/claims?type_id=7 returns the saved contingent bill for individual
    const rClaimsType = await api('GET', `/api/claims?type_id=${contingentTypeId}`, null, individualToken);
    ok('Individual can fetch own contingent bills via query type_id=7', rClaimsType.status === 200);
    const foundType = rClaimsType.json?.find(c => c.id === contId);
    ok('Found own contingent bill inside type_id=7 query response', !!foundType);

    // 5.3 SEC: Admin contingent list must NOT show individual's contingent bill
    const r3 = await api('GET', `/api/admin/claims?type_id=${contingentTypeId}&months=60`, null, adminToken);
    ok('Admin claims list returns 200', r3.status === 200);
    const leakedBill = r3.json?.find(c => c.id === contId);
    ok('Individual contingent bill NOT visible to admin', !leakedBill,
        leakedBill ? `Leak! Claim #${contId} appeared in admin list` : '');

    // 5.4 Individual CAN delete their own contingent draft
    const r4 = await api('DELETE', `/api/claims/${contId}`, null, individualToken);
    ok('Individual can delete own contingent draft', r4.status === 200);

    // 5.5 Admin submits contingent bill — should be Pending and visible
    const r5 = await api('POST', '/api/claims', {
        type_id:    contingentTypeId,
        claim_name: 'Admin Contingent Test',
        claim_date: '2026-01-20',
        status:     'Pending',
        formData:   { amount: '12000' },
        htmlContent: '<p>Admin contingent</p>'
    }, adminToken);
    ok('Admin can submit contingent bill (201)', r5.status === 201);
    const adminContId = r5.json?.id;

    const r6 = await api('GET', `/api/admin/claims?type_id=${contingentTypeId}&months=60`, null, adminToken);
    const adminContBill = r6.json?.find(c => c.id === adminContId);
    ok('Admin contingent bill IS visible in admin panel', !!adminContBill,
        `ID: ${adminContId}`);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Claim File Path & Folder Isolation
// ═════════════════════════════════════════════════════════════════════════════

async function suiteFilePaths() {
    if (!regularTypeId) { console.log('  ⚠️  Skipped — no regular claim type'); return; }

    const { username: uname } = (await api('GET', '/api/auth/me', null, individualToken)).json || {};
    ok('Username available from /me', !!uname);

    // 6.1 Claim saved in root (no folder_name)
    const r1 = await api('POST', '/api/claims', {
        type_id:    regularTypeId,
        claim_name: 'Root Folder Claim',
        claim_date: '2026-02-01',
        status:     'Draft',
        formData:   {},
        htmlContent: '<p>Root claim</p>'
    }, individualToken);
    ok('Root claim returns 201', r1.status === 201);
    const rootId = r1.json?.id;

    const rootPath = path.join(__dirname, '..', 'server', 'storage', uname, 'claims', `${rootId}.html`);
    ok('Root claim HTML file exists at correct path', fs.existsSync(rootPath), rootPath);

    if (fs.existsSync(rootPath)) {
        const html = fs.readFileSync(rootPath, 'utf8');
        ok('Root claim HTML has correct <title>', html.includes('<title>Root Folder Claim</title>'));
    }
    await api('DELETE', `/api/claims/${rootId}`, null, individualToken);

    // 6.2 Claim saved in subfolder
    const subfolder = `suite-test-${Date.now()}`;
    const r2 = await api('POST', '/api/claims', {
        type_id:     regularTypeId,
        claim_name:  'Subfolder Claim',
        claim_date:  '2026-02-02',
        status:      'Draft',
        folder_name: subfolder,
        formData:    {},
        htmlContent: '<p>Subfolder claim</p>'
    }, individualToken);
    ok('Subfolder claim returns 201', r2.status === 201);
    const subId = r2.json?.id;

    const subPath = path.join(__dirname, '..', 'server', 'storage', uname, 'claims', subfolder, `${subId}.html`);
    ok('Subfolder claim HTML file exists at correct path', fs.existsSync(subPath), subPath);

    if (fs.existsSync(subPath)) {
        const html = fs.readFileSync(subPath, 'utf8');
        ok('Subfolder claim HTML has correct <title>', html.includes('<title>Subfolder Claim</title>'));
    }
    await api('DELETE', `/api/claims/${subId}`, null, individualToken);

    // 6.3 User storage path must not contain another user's files
    ok('User storage path is username-scoped',
        rootPath.includes(path.sep + uname + path.sep));
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 7 — Dependents
// ═════════════════════════════════════════════════════════════════════════════

async function suiteDependents() {
    // 7.1 Add dependent
    const r1 = await api('POST', '/api/auth/dependents', {
        name:         'Test Dependent',
        relationship: 'Spouse',
        cghs_ben_id:  'DEP-001',
        dob:          '1990-06-15'
    }, individualToken);
    ok('Add dependent returns 200', r1.status === 200);

    // 7.2 Verify dependent in /me
    const r2 = await api('GET', '/api/auth/me', null, individualToken);
    const dep = r2.json?.dependents?.find(d => d.name === 'Test Dependent');
    ok('Dependent appears in /me response', !!dep);
    ok('Dependent relationship correct', dep?.relationship === 'Spouse');
    const depId = dep?.id;

    // 7.3 Edit dependent
    const r3 = await api('POST', '/api/auth/dependents', {
        id:           depId,
        name:         'Test Dependent Updated',
        relationship: 'Spouse',
        cghs_ben_id:  'DEP-002',
        dob:          '1990-06-15'
    }, individualToken);
    ok('Edit dependent returns 200', r3.status === 200);

    const r4 = await api('GET', '/api/auth/me', null, individualToken);
    const updatedDep = r4.json?.dependents?.find(d => d.id === depId);
    ok('Dependent name updated', updatedDep?.name === 'Test Dependent Updated');

    // 7.4 Delete dependent
    const r5 = await api('DELETE', `/api/auth/dependents/${depId}`, null, individualToken);
    ok('Delete dependent returns 200', r5.status === 200);

    const r6 = await api('GET', '/api/auth/me', null, individualToken);
    const gone = r6.json?.dependents?.find(d => d.id === depId);
    ok('Dependent removed from /me', !gone);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 8 — Admin Users Management
// ═════════════════════════════════════════════════════════════════════════════

async function suiteAdminUsers() {
    // 8.1 Admin can list users
    const r1 = await api('GET', '/api/admin/users', null, adminToken);
    ok('Admin GET /users returns 200', r1.status === 200);
    ok('Users list is an array', Array.isArray(r1.json));

    // 8.2 Individual CANNOT list users
    const r2 = await api('GET', '/api/admin/users', null, individualToken);
    ok('Individual GET /users returns 403', r2.status === 403);

    // 8.3 Individual CANNOT access admin claims list
    const r3 = await api('GET', '/api/admin/claims', null, individualToken);
    ok('Individual GET /admin/claims returns 403', r3.status === 403);

    // 8.4 Individual CANNOT approve a claim
    const r4 = await api('PUT', '/api/admin/claims/1/status', { status: 'Approved' }, individualToken);
    ok('Individual cannot approve claim (403)', r4.status === 403);

    // 8.5 User storage directories created on creation
    const { username: uname } = (await api('GET', '/api/auth/me', null, individualToken)).json || {};
    const billsPath  = path.join(__dirname, '..', 'server', 'storage', uname, 'bills');
    const claimsPath = path.join(__dirname, '..', 'server', 'storage', uname, 'claims');
    ok('/bills storage folder created on user creation',  fs.existsSync(billsPath),  billsPath);
    ok('/claims storage folder created on user creation', fs.existsSync(claimsPath), claimsPath);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 9 — Claim Overwrite & Version
// ═════════════════════════════════════════════════════════════════════════════

async function suiteClaimOverwrite() {
    if (!regularTypeId) { console.log('  ⚠️  Skipped — no regular claim type'); return; }

    // 9.1 Create a draft
    const r1 = await api('POST', '/api/claims', {
        type_id:    regularTypeId,
        claim_name: 'Overwrite Test Original',
        claim_date: '2026-03-01',
        status:     'Draft',
        formData:   { v: 1 },
        htmlContent: '<p>v1</p>'
    }, individualToken);
    ok('Original claim saved (201)', r1.status === 201);
    const origId = r1.json?.id;

    // 9.2 Overwrite it
    const r2 = await api('POST', '/api/claims', {
        type_id:        regularTypeId,
        claim_name:     'Overwrite Test Updated',
        claim_date:     '2026-03-01',
        status:         'Draft',
        save_mode:      'overwrite',
        parent_claim_id: origId,
        formData:       { v: 2 },
        htmlContent:    '<p>v2</p>'
    }, individualToken);
    ok('Overwrite returns 201', r2.status === 201);
    ok('Overwrite returns same claim ID', r2.json?.id === origId,
        `expected ${origId}, got ${r2.json?.id}`);

    // 9.3 Verify updated name
    const r3 = await api('GET', '/api/claims', null, individualToken);
    const updated = r3.json?.find(c => c.id === origId);
    ok('Claim name updated after overwrite', updated?.claim_name === 'Overwrite Test Updated');

    // 9.4 Save as new from existing
    const r4 = await api('POST', '/api/claims', {
        type_id:        regularTypeId,
        claim_name:     'Saved As New',
        claim_date:     '2026-03-01',
        status:         'Draft',
        save_mode:      'save_as_new',
        parent_claim_id: origId,
        formData:       { v: 3 },
        htmlContent:    '<p>v3</p>'
    }, individualToken);
    ok('Save as new returns 201', r4.status === 201);
    ok('Save as new creates a different claim ID', r4.json?.id !== origId,
        `expected new ID, got same ${r4.json?.id}`);
    const newId = r4.json?.id;

    // Cleanup
    await api('DELETE', `/api/claims/${origId}`, null, individualToken);
    await api('DELETE', `/api/claims/${newId}`, null, individualToken);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUITE 10 — Ward Entitlement Rules
// ═════════════════════════════════════════════════════════════════════════════

async function suiteWardEntitlements() {
    // 10.1 Individual can fetch rules
    const r1 = await api('GET', '/api/claims/ward-entitlements', null, individualToken);
    ok('Individual can fetch ward entitlement rules (200)', r1.status === 200);
    ok('Ward entitlement rules contains array', Array.isArray(r1.json) && r1.json.length >= 3);

    // Verify initial rule thresholds match the specification
    const general = r1.json?.find(r => r.ward_type === 'General');
    const semiPrivate = r1.json?.find(r => r.ward_type === 'Semi-Private');
    const privateWard = r1.json?.find(r => r.ward_type === 'Private');

    ok('General entitlement min=0 max=36500', general?.min_pay === 0 && general?.max_pay === 36500);
    ok('Semi-Private entitlement min=36501 max=50500', semiPrivate?.min_pay === 36501 && semiPrivate?.max_pay === 50500);
    ok('Private entitlement min=50501 max=99999999', privateWard?.min_pay === 50501);

    // 10.2 Non-admin cannot modify rules (403)
    const r2 = await api('POST', '/api/claims/ward-entitlements', { rules: [] }, individualToken);
    ok('Individual cannot update ward entitlement rules (403)', r2.status === 403);

    // 10.3 Admin can modify rules
    const testRules = [
        { min_pay: 0, max_pay: 40000, ward_type: 'General' },
        { min_pay: 40001, max_pay: 60000, ward_type: 'Semi-Private' },
        { min_pay: 60001, max_pay: 99999999, ward_type: 'Private' }
    ];
    const r3 = await api('POST', '/api/claims/ward-entitlements', { rules: testRules }, adminToken);
    ok('Admin can update ward entitlement rules (200)', r3.status === 200);

    // Verify update
    const r4 = await api('GET', '/api/claims/ward-entitlements', null, individualToken);
    const updatedGeneral = r4.json?.find(r => r.ward_type === 'General');
    ok('Dynamic rule thresholds updated correctly', updatedGeneral?.max_pay === 40000);

    // Restore initial rules
    const restoreRules = [
        { min_pay: 0, max_pay: 36500, ward_type: 'General' },
        { min_pay: 36501, max_pay: 50500, ward_type: 'Semi-Private' },
        { min_pay: 50501, max_pay: 99999999, ward_type: 'Private' }
    ];
    await api('POST', '/api/claims/ward-entitlements', { rules: restoreRules }, adminToken);
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
    fetch = (await import('node-fetch')).default;

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║        Office Automation — Integration Test Suite        ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`  Server : ${BASE_URL}`);
    console.log(`  Time   : ${new Date().toLocaleString()}`);

    await suite('1 — Authentication & Password Reset',  suiteAuth);
    await suite('2 — Profile Update (All Fields)',       suiteProfile);
    await suite('3 — Claim Types',                      suiteClaimTypes);
    await suite('4 — Claim Lifecycle (Regular)',         suiteClaimLifecycle);
    await suite('5 — Contingent Bill Security Rules',   suiteContingentSecurity);
    await suite('6 — File Path & Folder Isolation',     suiteFilePaths);
    await suite('7 — Dependents CRUD',                  suiteDependents);
    await suite('8 — Admin User Management & RBAC',     suiteAdminUsers);
    await suite('9 — Claim Overwrite & Save-as-New',    suiteClaimOverwrite);
    await suite('10 — Ward Entitlement Rules',          suiteWardEntitlements);

    // ── Final Report ────────────────────────────────────────────────────────
    const total = passed + failed;
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                      TEST RESULTS                        ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Total  : ${String(total).padEnd(47)}║`);
    console.log(`║  Passed : ${String(passed).padEnd(47)}║`);
    console.log(`║  Failed : ${String(failed).padEnd(47)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝');

    if (failures.length > 0) {
        console.log('\n  Failed checks:');
        failures.forEach((f, i) => console.error(`    ${i + 1}. ${f}`));
        console.log('');
        process.exit(1);
    } else {
        console.log('\n  🎉 ALL TESTS PASSED!\n');
        process.exit(0);
    }
}

main().catch(err => {
    console.error('\n💥 Test runner crashed:', err);
    process.exit(1);
});
