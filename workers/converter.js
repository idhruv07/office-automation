const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const mammoth = require('mammoth');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const db = require('../config/db');

const ASSETS_DIR = path.join(__dirname, '../server/storage/assets');
const TEMP_DIR = path.join(__dirname, '../temp_conversions');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

async function ensureDirs() {
    await fs.ensureDir(ASSETS_DIR);
    await fs.ensureDir(TEMP_DIR);
}

function convertToDocx(sourcePath, outDir) {
    return new Promise((resolve, reject) => {
        const sofficePath = process.platform === 'win32' 
            ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe' 
            : 'soffice';
            
        const args = ['--headless', '--convert-to', 'docx', sourcePath, '--outdir', outDir];
        
        execFile(sofficePath, args, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(`LibreOffice conversion failed: ${stderr || error.message}`));
            }
            const basename = path.basename(sourcePath, path.extname(sourcePath));
            const docxPath = path.join(outDir, `${basename}.docx`);
            resolve(docxPath);
        });
    });
}

// Mammoth image handler
async function handleImage(image) {
    const buffer = await image.read();
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = image.contentType.split('/')[1] || 'png';
    const filename = `${hash}.${ext}`;
    const storagePath = path.join(ASSETS_DIR, filename);

    if (!await fs.pathExists(storagePath)) {
        await fs.writeFile(storagePath, buffer);
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        // Deduplicate against shared_assets
        const res = await client.query(
            `INSERT INTO shared_assets (content_hash, storage_path, mime_type, reference_count) 
             VALUES ($1, $2, $3, 1)
             ON CONFLICT (content_hash) DO UPDATE 
             SET reference_count = shared_assets.reference_count + 1 
             RETURNING id, (xmax = 0) AS inserted`, // xmax=0 means it was newly inserted
            [hash, storagePath, image.contentType]
        );
        
        const isNew = res.rows[0].inserted;
        await client.query('COMMIT');
        
        return {
            src: `/storage/assets/${filename}`,
            'data-asset-hash': hash,
            'data-asset-id': res.rows[0].id.toString(),
            'data-is-new': isNew ? 'true' : 'false'
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Extract metadata using regex
function extractMetadata(text) {
    const dateMatch = text.match(/(?:Date|Dt|Dated)[\.\:\s\-]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    const refMatch = text.match(/(?:Ref(?:erence)?\s*(?:No|Number)?|Letter No)[\.\:\s\-]*([A-Za-z0-9\/\\\-]+)/i);
    const subjMatch = text.match(/(?:Sub(?:ject)?|Subj)[\.\:\s\-]*([^\n]+)/i);

    return {
        date: dateMatch ? dateMatch[1] : null,
        reference: refMatch ? refMatch[1].trim() : null,
        subject: subjMatch ? subjMatch[1].trim() : null
    };
}

async function processJob(job) {
    console.log(`\n[CONVERTER] Processing job ${job.id}: ${job.original_filename}`);
    let docxPath = job.source_path;
    let needsCleanup = false;

    const ext = path.extname(job.source_path).toLowerCase();
    
    if (ext === '.doc' || ext === '.odt') {
        console.log(`[CONVERTER] Converting ${ext} to .docx...`);
        try {
            docxPath = await convertToDocx(job.source_path, TEMP_DIR);
            needsCleanup = true;
        } catch (e) {
            console.error(e.message);
            await db.query("UPDATE import_jobs SET status = 'needs_review', error_log = $1 WHERE id = $2", [e.message, job.id]);
            return;
        }
    }

    try {
        console.log(`[CONVERTER] Extracting HTML and images via mammoth...`);
        const options = {
            convertImage: mammoth.images.imgElement(handleImage),
            styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "table => table.table.table-bordered",
            ]
        };
        
        const result = await mammoth.convertToHtml({ path: docxPath }, options);
        let html = result.value;
        const rawText = (await mammoth.extractRawText({ path: docxPath })).value;

        // Apply DOMPurify sanitization
        html = DOMPurify.sanitize(html, { ADD_ATTR: ['data-asset-hash', 'data-asset-id', 'data-is-new'] });

        const metadata = extractMetadata(rawText);
        console.log(`[CONVERTER] Extracted metadata:`, metadata);

        const jsdom = new JSDOM(html);
        const doc = jsdom.window.document;
        const images = Array.from(doc.querySelectorAll('img'));
        
        let hasNewHeaderImage = false;
        const pageAssetsToInsert = [];

        // Tag roles based on position
        images.forEach((img, idx) => {
            let role = 'body';
            if (idx === 0) role = 'header';
            else if (idx === images.length - 1 && images.length > 1) role = 'footer';
            
            const assetId = img.getAttribute('data-asset-id');
            const isNew = img.getAttribute('data-is-new') === 'true';
            
            if (role === 'header' && isNew) {
                hasNewHeaderImage = true; // Signal for Review Queue
            }

            if (assetId) {
                pageAssetsToInsert.push({ assetId, role });
            }
            
            // Clean up custom attributes before storing
            img.removeAttribute('data-asset-hash');
            img.removeAttribute('data-asset-id');
            img.removeAttribute('data-is-new');
        });

        // Final sanitized HTML to store
        const finalHtml = doc.body.innerHTML;

        // Cardinality detection heuristics
        const refCount = (rawText.match(/(?:Ref(?:erence)?\s*(?:No|Number)?|Letter No)/gi) || []).length;
        const dateCount = (rawText.match(/(?:Date|Dt|Dated)[\.\:\s\-]*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/gi) || []).length;

        let needsReview = false;
        let reviewReason = [];

        // Check if job was previously manually overridden via Queue UI
        const manualOverride = job.detected_dates && job.detected_dates.manual_override;

        if (!manualOverride) {
            if (!metadata.date) {
                needsReview = true;
                reviewReason.push('No date confidently detected');
            }
            if (hasNewHeaderImage) {
                needsReview = true;
                reviewReason.push('Unrecognized new header image hash detected');
            }
            if (refCount > 1 || dateCount > 1) {
                needsReview = true;
                reviewReason.push('Ambiguous document-boundary split (multiple dates/refs detected)');
            }
        }

        if (needsReview) {
            console.log(`[CONVERTER] Flagging job ${job.id} for Review Queue. Reasons: ${reviewReason.join(', ')}`);
            await db.query(
                `UPDATE import_jobs SET status = 'needs_review', error_log = $1, detected_dates = $2 WHERE id = $3`,
                [reviewReason.join(' | '), JSON.stringify(metadata), job.id]
            );
            return;
        }

        // Put in Unsorted Imports
        const folderRes = await db.query("SELECT id FROM folder_nodes WHERE name = 'Unsorted Imports' LIMIT 1");
        let folderId;
        if (folderRes.rows.length > 0) {
            folderId = folderRes.rows[0].id;
        } else {
            const newFolder = await db.query("INSERT INTO folder_nodes (name) VALUES ('Unsorted Imports') RETURNING id");
            folderId = newFolder.rows[0].id;
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            
            // Create Document
            const title = manualOverride ? job.detected_dates.subject : (metadata.subject || job.original_filename.replace(/\.[^/.]+$/, ""));
            const finalFolderId = manualOverride ? job.detected_dates.force_folder_id : folderId;
            const finalDate = manualOverride ? job.detected_dates.date : metadata.date;

            const docRes = await client.query(
                `INSERT INTO documents (folder_id, title, reference_no, created_from_import_id, owner_type) 
                 VALUES ($1, $2, $3, $4, 'office') RETURNING id`,
                [finalFolderId, title, metadata.reference, job.id]
            );
            const docId = docRes.rows[0].id;

            // Try to parse Date for Postgres format
            let pgDate = 'NOW()';
            if (finalDate) {
                const parts = finalDate.split(/[\/\-\.]/);
                if (parts.length === 3) {
                    if (parts[2].length === 2) parts[2] = '20' + parts[2];
                    pgDate = `'${parts[2]}-${parts[1]}-${parts[0]}'`; 
                }
            }

            // Create Page
            const pageRes = await client.query(
                `INSERT INTO document_pages (document_id, page_date, sequence_no, title, html_content, raw_source_path) 
                 VALUES ($1, ${pgDate}, 1, $2, $3, $4) RETURNING id`,
                [docId, 'Imported Page 1', finalHtml, job.source_path]
            );
            const pageId = pageRes.rows[0].id;

            // Link Assets
            for (const pa of pageAssetsToInsert) {
                await client.query(
                    `INSERT INTO page_assets (page_id, shared_asset_id, role) VALUES ($1, $2, $3)`,
                    [pageId, pa.assetId, pa.role]
                );
            }

            // Mark job as done
            await client.query("UPDATE import_jobs SET status = 'done', completed_at = NOW(), detected_dates = $1 WHERE id = $2", [JSON.stringify(metadata), job.id]);
            
            await client.query('COMMIT');
            console.log(`[CONVERTER] Job ${job.id} complete. Document created.`);
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error(`[CONVERTER] Job ${job.id} failed:`, err);
        await db.query("UPDATE import_jobs SET status = 'needs_review', error_log = $1 WHERE id = $2", [err.message, job.id]);
    } finally {
        if (needsCleanup && await fs.pathExists(docxPath)) {
            await fs.remove(docxPath);
        }
    }
}

async function runWorker() {
    await ensureDirs();
    console.log('[CONVERTER] Conversion worker started. Polling for jobs...');

    while (true) {
        try {
            const result = await db.query(`
                UPDATE import_jobs 
                SET status = 'processing' 
                WHERE id = (
                    SELECT id FROM import_jobs 
                    WHERE status = 'queued' 
                    ORDER BY id ASC LIMIT 1 
                    FOR UPDATE SKIP LOCKED
                ) 
                RETURNING *
            `);

            if (result.rows.length > 0) {
                await processJob(result.rows[0]);
            } else {
                await new Promise(res => setTimeout(res, 3000));
            }
        } catch (err) {
            console.error('[CONVERTER] Polling error:', err);
            await new Promise(res => setTimeout(res, 5000));
        }
    }
}

if (require.main === module) {
    runWorker();
}

module.exports = { runWorker };
