const http = require('http');

const runTest = async () => {
    const fetch = (await import('node-fetch')).default;
    
    // 1. Admin Login
    let res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const adminData = await res.json();
    console.log('Admin login:', adminData);
    
    if (!adminData.token) {
        console.error('Failed to login admin');
        process.exit(1);
    }

    // 2. Create Individual User
    res = await fetch('http://localhost:3000/api/admin/users', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + adminData.token
        },
        body: JSON.stringify({
            username: 'john_doe',
            password: 'password123',
            name: 'John Doe',
            designation: 'Engineer',
            email: 'john@example.com',
            personal_no: 'EMP001',
            role_name: 'Individual'
        })
    });
    const createData = await res.json();
    console.log('Create user:', createData);

    // 3. Individual Login
    res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'john_doe', password: 'password123' })
    });
    const indData = await res.json();
    console.log('Individual login:', indData);
    
    // 4. Verify folders
    const fs = require('fs');
    const path = require('path');
    const billsPath = path.join(__dirname, 'server', 'storage', 'john_doe', 'bills');
    const claimsPath = path.join(__dirname, 'server', 'storage', 'john_doe', 'claims');
    
    console.log('bills dir exists:', fs.existsSync(billsPath));
    console.log('claims dir exists:', fs.existsSync(claimsPath));
};

runTest().catch(console.error);
