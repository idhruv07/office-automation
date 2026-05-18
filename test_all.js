const fs = require('fs');
const path = require('path');

async function testAll() {
    console.log('Starting Unit Tests...');
    const fetch = (await import('node-fetch')).default;

    // 1. Admin Login
    console.log('Testing Admin Login...');
    let res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    if (!res.ok) throw new Error('Admin login failed');
    const adminData = await res.json();
    console.log('✅ Admin login successful');

    // 2. Create User
    console.log('Testing User Creation...');
    const testUser = `user_${Date.now()}`;
    res = await fetch('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminData.token
        },
        body: JSON.stringify({
            username: testUser,
            password: 'password123',
            name: 'Test User',
            designation: 'Tester',
            email: `${testUser}@test.com`,
            personal_no: `EMP_${Date.now()}`,
            role_name: 'Individual'
        })
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`User creation failed: ${errText}`);
    }
    console.log('✅ User created successfully');

    // 3. User Login
    console.log('Testing Individual Login...');
    res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUser, password: 'password123' })
    });
    if (!res.ok) throw new Error('User login failed');
    const userData = await res.json();
    console.log('✅ Individual login successful. must_reset_password:', userData.must_reset_password);

    // 4. Change Password
    console.log('Testing Change Password...');
    res = await fetch('http://localhost:3000/api/auth/change-password', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + userData.token
        },
        body: JSON.stringify({ newPassword: 'newpassword123' })
    });
    if (!res.ok) throw new Error('Change password failed');
    console.log('✅ Change password successful');

    // 5. Login with new password
    console.log('Testing Login with new password...');
    res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUser, password: 'newpassword123' })
    });
    const updatedUserData = await res.json();
    console.log('✅ Re-login successful. must_reset_password:', updatedUserData.must_reset_password);

    // 6. Fetch Claim Types
    console.log('Testing Fetch Claim Types...');
    res = await fetch('http://localhost:3000/api/claims/types', {
        headers: { 'Authorization': 'Bearer ' + updatedUserData.token }
    });
    const types = await res.json();
    const typeId = types[0].id;
    console.log('✅ Fetched claim types, found:', types.length);

    // 7. Submit Claim (Draft)
    console.log('Testing Save Claim as Draft...');
    res = await fetch('http://localhost:3000/api/claims', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + updatedUserData.token
        },
        body: JSON.stringify({
            type_id: typeId,
            claim_name: 'Test Draft Claim',
            claim_date: '2023-10-01',
            remarks: 'Draft remarks',
            status: 'Draft',
            formData: { test: '123' },
            htmlContent: '<html><body>Draft</body></html>'
        })
    });
    let claimData = await res.json();
    console.log('✅ Saved claim as draft. ID:', claimData.id);

    // 8. Delete Draft
    console.log('Testing Delete Draft...');
    res = await fetch(`http://localhost:3000/api/claims/${claimData.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + updatedUserData.token }
    });
    if (!res.ok) throw new Error('Delete draft failed');
    console.log('✅ Deleted draft successfully');

    // 9. Submit Claim (Pending)
    console.log('Testing Submit Pending Claim...');
    res = await fetch('http://localhost:3000/api/claims', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + updatedUserData.token
        },
        body: JSON.stringify({
            type_id: typeId,
            claim_name: 'Test Pending Claim',
            claim_date: '2023-10-01',
            remarks: 'Pending remarks',
            status: 'Pending',
            formData: { test: '456' },
            htmlContent: '<html><body><h1>Pending Claim</h1></body></html>'
        })
    });
    claimData = await res.json();
    const pendingId = claimData.id;
    console.log('✅ Submitted pending claim. ID:', pendingId);

    // 10. Generate DOCX
    console.log('Testing DOCX Generation...');
    res = await fetch(`http://localhost:3000/api/claims/${pendingId}/docx`, {
        headers: { 'Authorization': 'Bearer ' + updatedUserData.token }
    });
    if (!res.ok) throw new Error('DOCX generation failed');
    console.log('✅ DOCX generation successful');

    // 11. Admin Approve Claim
    console.log('Testing Admin Approve Claim...');
    res = await fetch(`http://localhost:3000/api/admin/claims/${pendingId}/status`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminData.token
        },
        body: JSON.stringify({ status: 'Approved', remarks: 'Looks good' })
    });
    if (!res.ok) throw new Error('Admin approve failed');
    console.log('✅ Admin approve successful');

    console.log('\n🎉 ALL TESTS PASSED!');
}

testAll().catch(err => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
});
