const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const db = require('../config/db');

const VALID_DOC_EXTS = new Set(['.doc', '.docx', '.odt']);
const MEDIA_EXTS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff']);

async function getFileHash(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', err => reject(err));
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

/**
 * Checks if a directory contains ONLY media files (PDFs/images).
 * Returns true if there are files and ALL of them are media extensions.
 * Ignores subdirectories for this specific check (evaluates files in current level).
 */
async function isMediaOnlyFolder(dirPath) {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    let hasFiles = false;
    let allMedia = true;

    for (const item of items) {
        if (item.isFile()) {
            hasFiles = true;
            const ext = path.extname(item.name).toLowerCase();
            if (!MEDIA_EXTS.has(ext)) {
                allMedia = false;
                break;
            }
        }
    }

    return hasFiles && allMedia;
}

async function scanDirectory(currentPath, officeId, parentFolderId = null) {
    const items = await fs.readdir(currentPath, { withFileTypes: true });
    
    // First, evaluate the folder condition requested by the user
    if (await isMediaOnlyFolder(currentPath)) {
        console.log(`[SCANNER] Ignoring folder (media/pdf only): ${currentPath}`);
        return;
    }

    // Process subdirectories and files
    for (const item of items) {
        const fullPath = path.join(currentPath, item.name);

        if (item.isDirectory()) {
            // Recurse into subdirectory
            await scanDirectory(fullPath, officeId, parentFolderId);
        } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            if (VALID_DOC_EXTS.has(ext)) {
                console.log(`[SCANNER] Processing valid document: ${fullPath}`);
                try {
                    const hash = await getFileHash(fullPath);
                    const stats = await fs.stat(fullPath);
                    
                    // Insert into import_jobs, deduplicating by hash
                    await db.query(
                        `INSERT INTO import_jobs (source_path, file_hash, file_size_bytes, original_filename, status)
                         VALUES ($1, $2, $3, $4, 'queued')
                         ON CONFLICT (file_hash) DO NOTHING`,
                        [fullPath, hash, stats.size, item.name]
                    );
                } catch (err) {
                    console.error(`[SCANNER] Error processing file ${fullPath}:`, err.message);
                }
            }
        }
    }
}

async function runScanner(targetDir) {
    console.log(`[SCANNER] Starting scan of ${targetDir}...`);
    
    try {
        await fs.ensureDir(targetDir);
        
        // Find default office for scanned documents (e.g. Headquarters)
        const officeRes = await db.query("SELECT id FROM offices WHERE name = 'Headquarters' LIMIT 1");
        const defaultOfficeId = officeRes.rows[0]?.id || 1;

        await scanDirectory(targetDir, defaultOfficeId);
        console.log('[SCANNER] Scan complete.');
    } catch (err) {
        console.error('[SCANNER] Fatal error:', err);
    }
}

// Allow running standalone
if (require.main === module) {
    const dir = process.argv[2] || 'D:\\Admin_Sharing';
    runScanner(dir).then(() => process.exit(0));
}

module.exports = { runScanner };
