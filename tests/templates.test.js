const request = require('supertest');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

// I'll just query the DB and check filesystem directly for the templates since server.js might start listening immediately
describe('Claim Templates Integrity', () => {
    let claimTypes = [];

    beforeAll(async () => {
        const result = await db.query('SELECT * FROM claim_types WHERE is_active = true');
        claimTypes = result.rows;
    });

    afterAll(async () => {
        await db.pool.end();
    });

    test('All active claim types should have a corresponding folder and template.html', () => {
        expect(claimTypes.length).toBeGreaterThan(0);

        claimTypes.forEach(type => {
            const templatePath = path.join(__dirname, '..', 'public', 'claims', type.folder_name, 'template.html');
            const exists = fs.existsSync(templatePath);
            expect(exists).toBe(true);
        });
    });

    test('Template HTML files should not contain global <script> tags to avoid conflicts', () => {
        claimTypes.forEach(type => {
            const templatePath = path.join(__dirname, '..', 'public', 'claims', type.folder_name, 'template.html');
            const content = fs.readFileSync(templatePath, 'utf8');
            // Allow scripts if they are extremely contained, but generally we shouldn't have inline scripts
            // I'll test if there are any <script> tags that might bleed globally
            const scriptMatches = content.match(/<script>/gi);
            if (scriptMatches) {
                console.warn(`Warning: ${type.name} template has inline <script> tags.`);
            }
            // For strict adherence to rules:
            expect(scriptMatches).toBeNull();
        });
    });

    test('Template HTML files should not contain full HTML structure (e.g. <html>, <head>, <body>)', () => {
        claimTypes.forEach(type => {
            const templatePath = path.join(__dirname, '..', 'public', 'claims', type.folder_name, 'template.html');
            const content = fs.readFileSync(templatePath, 'utf8');
            expect(content).not.toMatch(/<html/i);
            expect(content).not.toMatch(/<head/i);
            expect(content).not.toMatch(/<body/i);
        });
    });
});
