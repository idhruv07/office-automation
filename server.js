// Shim Web Streams and Blob for Node 16 compatibility with newer packages (e.g. undici, cheerio, node-fetch)
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
const { Blob } = require('buffer');
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;
global.Blob = Blob;

class File extends Blob {
    constructor(parts, name, options) {
        super(parts, options);
        this.name = name;
    }
}
global.File = File;

class DOMException extends Error {
    constructor(message, name) {
        super(message);
        this.name = name || 'DOMException';
    }
}
global.DOMException = DOMException;



require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs-extra');

const app = express();
const PORT = process.env.PORT || 3000;



app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Dynamic healing middleware for missing claim HTML snapshots (e.g. after database-only restoration)
const cheerio = require('cheerio');
const db = require('./config/db');

app.get(/^\/storage\/([^\/]+)\/claims\/(.+)$/, async (req, res, next) => {
    const username = req.params[0];
    const fileOrFolder = req.params[1];
    const fullPath = path.join(__dirname, 'server', 'storage', username, 'claims', fileOrFolder);
    
    if (fs.existsSync(fullPath)) {
        return next();
    }

    const match = fileOrFolder.match(/(?:^|\/)(\d+)\.html$/);
    if (!match) {
        return next();
    }

    const claimId = parseInt(match[1], 10);
    try {
        const result = await db.query(
            `SELECT c.*, ct.folder_name as template_folder, ct.name as type_name, u.username 
             FROM claims c 
             JOIN claim_types ct ON c.type_id = ct.id 
             JOIN users u ON c.user_id = u.id 
             WHERE c.id = $1`,
            [claimId]
        );

        if (result.rows.length === 0) {
            return next();
        }

        const claim = result.rows[0];
        const templatePath = path.join(__dirname, 'public', 'claims', claim.template_folder, 'template.html');
        if (!fs.existsSync(templatePath)) {
            return next();
        }

        const templateHtml = await fs.readFile(templatePath, 'utf8');
        let styleCss = '';
        try {
            styleCss = await fs.readFile(path.join(__dirname, 'public', 'assets', 'style.css'), 'utf8');
        } catch (e) {
            console.error('Failed to read style.css for dynamic recovery:', e);
        }

        const $ = cheerio.load(templateHtml);

        if (claim.data) {
            Object.keys(claim.data).forEach(key => {
                const val = claim.data[key];
                $(`input[name="${key}"], textarea[name="${key}"], select[name="${key}"]`).each((i, el) => {
                    const type = $(el).attr('type');
                    if (type === 'checkbox' || type === 'radio') {
                        if (val === $(el).val() || val === 'on' || val === true) {
                            $(el).attr('checked', 'checked');
                        }
                    } else {
                        $(el).attr('value', val);
                        if (el.tagName === 'textarea') {
                            $(el).text(val);
                        }
                    }
                });
                $(`div[data-name="${key}"], span[data-name="${key}"]`).text(val);
            });
        }

        const finalHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${claim.claim_name}</title>
                <style>
                    ${styleCss}
                    .no-print { display: none !important; }
                    input[type="time"]::-webkit-calendar-picker-indicator { display: none !important; }
                    .editable-td { word-wrap: break-word !important; word-break: break-word !important; overflow-wrap: break-word !important; white-space: pre-wrap !important; }
                </style>
            </head>
            <body style="background: #f1f5f9; padding: 40px; display: flex; justify-content: center;">
                <div class="printable-area" style="background: white; padding: 40px; width: 210mm; min-height: 297mm; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin: 0 auto;">
                    ${$.html()}
                </div>
            </body>
            </html>
        `;

        await fs.ensureDir(path.dirname(fullPath));
        await fs.outputFile(fullPath, finalHtml);

        console.log(`[Dynamic Healing] Recovered missing claim HTML for #${claimId} at ${fullPath}`);
        return res.sendFile(fullPath);
    } catch (err) {
        console.error('Error generating dynamic claim HTML:', err);
        return next();
    }
});

app.use('/storage', express.static(path.join(__dirname, 'server', 'storage')));

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/admin', require('./api/admin'));
app.use('/api/claims', require('./api/claims'));
app.use('/api/repo', require('./api/repo/index'));   // Document Repository module (Office Admin hierarchy only)

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Fallback to index.html for SPA-like behavior
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ensure required directories exist on startup
const fwdTemplatesDir = path.join(__dirname, 'server', 'storage', 'fwd_templates');
fs.ensureDirSync(fwdTemplatesDir);

// Auto-heal PG FDW configuration for dynamic host IP changes
(async () => {
    const repoDb = require('./config/repo_db');
    const port = process.env.DB_PORT || 5432;
    const dbname = process.env.DB_NAME || 'office_automation';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';

    let targetHost = '127.0.0.1';
    
    // Test if 127.0.0.1 works
    try {
        await repoDb.query('CREATE EXTENSION IF NOT EXISTS dblink');
        await repoDb.query(`
            SELECT * FROM dblink('host=127.0.0.1 port=${port} dbname=${dbname} user=${user} password=${password}', 'SELECT 1') 
            AS t(a int)
        `);
        targetHost = '127.0.0.1';
        console.log('[Auto-Heal] FDW connection test succeeded using 127.0.0.1');
    } catch (err) {
        console.log('[Auto-Heal] FDW connection test failed using 127.0.0.1. Trying host.docker.internal...');
        // Test if host.docker.internal works
        try {
            await repoDb.query(`
                SELECT * FROM dblink('host=host.docker.internal port=${port} dbname=${dbname} user=${user} password=${password}', 'SELECT 1') 
                AS t(a int)
            `);
            targetHost = 'host.docker.internal';
            console.log('[Auto-Heal] FDW connection test succeeded using host.docker.internal');
        } catch (err2) {
            console.error('[Auto-Heal] Both 127.0.0.1 and host.docker.internal FDW tests failed. Defaulting to 127.0.0.1');
            targetHost = '127.0.0.1';
        }
    }

    try {
        await repoDb.query(`ALTER SERVER core_db OPTIONS (SET host '${targetHost}')`);
        console.log(`[Auto-Heal] Successfully updated core_db foreign server host to ${targetHost}`);
    } catch (e) {
        console.error('[Auto-Heal] Failed to update core_db foreign server host:', e.message);
    }
})();


const queue = require('./api/repo/queue');
queue.start()
    .then(() => {
        console.log('pg-boss queue started on repo_db');
        return queue.startWorker();
    })
    .catch(err => console.error('Error starting pg-boss:', err));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT} and accessible on the network`);
});
