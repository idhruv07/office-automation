const http = require('http');

function postJson(url, data) {
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(data);
        const req = http.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });
        req.on('error', reject);
        req.write(bodyStr);
        req.end();
    });
}

function getJson(url, token) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function testMenu() {
    try {
        console.log('Logging in as dhruv...');
        const loginData = await postJson('http://localhost:3000/api/auth/login', { username: 'dhruv', password: '1' });
        const token = loginData.token;
        console.log('Login successful. Token obtained.');

        console.log('Fetching menu items...');
        const menuTree = await getJson('http://localhost:3000/api/auth/menu', token);
        console.log('Menu tree returned:');
        console.log(JSON.stringify(menuTree, null, 2));
    } catch (err) {
        console.error('Test error:', err);
    }
}

testMenu();
