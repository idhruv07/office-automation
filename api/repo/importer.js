const mammoth = require("mammoth");
const db = require("../../config/repo_db");
const { processHtml } = require("./processor");
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const util = require('util');
const crypto = require('crypto');
const libre = require('libreoffice-convert');
libre.convertAsync = require('util').promisify(libre.convertWithOptions);


const customStyleMap = [
    "p[style-name='Normal'] => p:fresh",
    "p[style-name='Body Text'] => p:fresh",
    "table => table.table.table-bordered"
];

/**
 * Generate a 768-dim embedding vector from text using local Ollama nomic-embed-text.
 * Returns a formatted postgres vector string '[0.1, 0.2, ...]' or null on failure.
 */
async function getEmbedding(text) {
    try {
        const http = require('http');
        const body = JSON.stringify({ model: 'nomic-embed-text', prompt: text });
        return await new Promise((resolve, reject) => {
            const req = http.request(
                { hostname: '127.0.0.1', port: 11434, path: '/api/embeddings', method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
                (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            const vec = parsed.embedding;
                            if (Array.isArray(vec) && vec.length > 0) {
                                resolve('[' + vec.join(',') + ']');
                            } else {
                                resolve(null);
                            }
                        } catch { resolve(null); }
                    });
                }
            );
            req.on('error', () => resolve(null));
            req.write(body);
            req.end();
        });
    } catch { return null; }
}


async function runPythonPdfExtractor(pdfPath) {
    const scriptPath = path.join(__dirname, '../../scripts/extract_pdf.py');
    return new Promise((resolve, reject) => {
        execFile('python', [scriptPath, pdfPath], { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
            if (error) {
                console.error('Python Extractor Error:', stderr || error);
                resolve(""); // Fallback to empty text
                return;
            }
            try {
                const parsed = JSON.parse(stdout.trim());
                resolve(parsed.text || "");
            } catch (e) {
                resolve(stdout.trim());
            }
        });
    });
}

async function processDocumentJob(job) {
    const { filePath, folderId, officeId, originalName } = job.data;
    const ext = path.extname(originalName).toLowerCase();
    let finalFilePath = filePath;
    
    try {
        console.log(`[Importer] Processing file: ${originalName} (${ext})`);
        
        let isPdf = ext === '.pdf';
        
        // 1. If not DOCX (e.g. .doc or .odt), convert to DOCX via LibreOffice
        if (ext !== '.docx' && ext !== '.pdf') {
            console.log(`[Importer] Converting ${originalName} to DOCX...`);
            const fileBuf = fs.readFileSync(filePath);
            const docxBuf = await libre.convertAsync(fileBuf, 'docx', undefined, { fileName: 'source' + ext });
            const tempDir = path.join(__dirname, '../../temp_conversions');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            finalFilePath = path.join(tempDir, `${crypto.randomUUID()}.docx`);
            fs.writeFileSync(finalFilePath, docxBuf);
            // DO NOT set isPdf = true. Let it fall through to the fast mammoth DOCX flow!
        }



        let docId;
        let title = originalName.replace(ext, '');
        
        const docRes = await db.query(
            `INSERT INTO documents (folder_id, title, reference_no, status, owner_type, owner_office_id)
             VALUES ($1, $2, $3, 'active', 'office', $4)
             RETURNING id`,
             [folderId, title, title.substring(0,20), officeId]
        );
        docId = docRes.rows[0].id;

        if (isPdf) {
            // PDF Flow
            console.log(`[Importer] Processing as PDF...`);
            
            // Hash and save PDF
            const fileBuf = fs.readFileSync(finalFilePath);
            const hash = crypto.createHash('sha256').update(fileBuf).digest('hex');
            const newPdfPath = path.join(__dirname, '../../public/storage/documents', `${hash}.pdf`);
            
            // Ensure dir exists
            fs.mkdirSync(path.dirname(newPdfPath), { recursive: true });
            fs.copyFileSync(finalFilePath, newPdfPath);
            
            const pdfUrl = `/storage/documents/${hash}.pdf`;
            const iframeHtml = `<div style="padding: 20px;"><iframe src="${pdfUrl}" width="100%" height="800px" style="border:1px solid #ccc; border-radius: 8px;"></iframe><p><br></p></div>`;
            
            // Insert Page
            const pageRes = await db.query(
                `INSERT INTO document_pages (document_id, sequence_no, page_date, html_content, is_editable)
                 VALUES ($1, 1, CURRENT_DATE, $2, false)
                 RETURNING id`,
                [docId, iframeHtml]
            );
            const pageId = pageRes.rows[0].id;
            
            await db.query(
                `INSERT INTO document_page_versions (page_id, version, html_content, diff_summary)
                 VALUES ($1, 1, $2, 'Initial PDF Import')`,
                [pageId, iframeHtml]
            );

            // Extract Text using Python/Ollama
            console.log(`[Importer] Running AI OCR Extraction on ${originalName}...`);
            const aiText = await runPythonPdfExtractor(finalFilePath);
            

            // Store OCR text in html_content and generate embedding vector
            if (aiText) {
                await db.query(
                    `UPDATE document_pages SET html_content = $1 WHERE id = $2`,
                    [aiText, pageId]
                );
                // Generate 768-dim vector from local nomic-embed-text model
                const vector = await getEmbedding(aiText.substring(0, 8000)); // cap at 8k chars
                if (vector) {
                    await db.query(
                        `INSERT INTO page_embeddings (page_id, embedding, office_id, updated_at)
                         VALUES ($1, $2::vector, $3, NOW())
                         ON CONFLICT (page_id) DO UPDATE
                         SET embedding = EXCLUDED.embedding, updated_at = NOW()`,
                        [pageId, vector, officeId]
                    );
                    console.log(`[Importer] Embedding stored for ${originalName}`);
                } else {
                    console.warn(`[Importer] Embedding skipped for ${originalName} (Ollama unavailable)`);
                }
            }


            console.log(`[Importer] Success: ${originalName} imported as PDF.`);
            return { success: true, docId, pages: 1 };
        } else {
            // DOCX Flow (Mammoth)
            console.log(`[Importer] Processing as DOCX...`);
            const result = await mammoth.convertToHtml({path: finalFilePath}, {
                styleMap: customStyleMap,
                convertImage: mammoth.images.imgElement(function(image) {
                    return image.read("base64").then(function(imageBuffer) {
                        return { src: "data:" + image.contentType + ";base64," + imageBuffer };
                    });
                })
            });
            
            let html = result.value;

            // A. Header (also acts as split marker)
            const headerRegex = /<p><a href="mailto:itsdcsec-cda@nic\.in"><img[^>]+>(?:(?!<\/p>).)*?<\/a><\/p>\s*<p>[^<]*<(strong|b)>[^<]*OFFICE OF THE CDA \( IT &amp; SDC\)[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Mornington Road, PAO\(ORs\)AOC Compound,[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Trimulgherry, Secunderabad – 500 015\.[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Email: itsdcsec-cda@nic\.in[^<]*<\/(strong|b)>[^<]*<\/p>\s*<p>[^<]*<(strong|b)>[^<]*Phone\/ Fax No: 040-27742553\/29805085[^<]*<\/(strong|b)>[^<]*<\/p>/ig;
            const replacementHeader = `
            <hr style="border-top: 3px dashed #ccc; margin: 40px 0;" class="page-split-marker" />
            <div class="fwd-letterhead">
              <div class="fwd-lh-img"><img src="/admin/images/emblem.png" alt="Emblem" onerror="this.style.display='none'"></div>
              <div class="fwd-lh-center">
                <div class="fwd-lh-title">OFFICE OF THE CDA ( IT &amp; SDC )</div>
                <div class="fwd-lh-sub">Mornington Road, PAO(ORs)AOC Compound,</div>
                <div class="fwd-lh-sub">Trimulgherry, Secunderabad – 500 015.</div>
                <div class="fwd-lh-email">Email: itsdcsec-cda@nic.in</div>
                <div class="fwd-lh-phone">Phone/ Fax No: 040-27742553/29805085</div>
              </div>
              <div class="fwd-lh-img"><img src="/admin/images/azadi.png" alt="Logo Right" onerror="this.style.display='none'"></div>
            </div>`;
            if (headerRegex.test(html)) {
                headerRegex.lastIndex = 0;
                html = html.replace(headerRegex, replacementHeader);
            }

            // B. Meta Row (Letter No & Date)
            const metaRowRegex = /<p>(?:(?!<\/p>).)*?No\.\s*((?:(?!Dated:)(?!<\/p>).)*?)Dated:\s*((?:(?!<\/p>).)*?)<\/p>/ig;
            html = html.replace(metaRowRegex, (match, p1, p2) => {
                const no = p1.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                const dated = p2.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                return `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; margin-bottom: 20px; font-weight: bold; border-bottom: 2px solid #ccc; padding-bottom: 10px;">
                   <div style="text-align: left;">No. ${no}</div>
                   <div style="text-align: right;">Dated: ${dated}</div>
                </div>`;
            });

            // C. Office Note Title
            const titleRegex = /<p>(?:(?!<\/p>).)*?OFFICE NOTE(?:(?!<\/p>).)*?<\/p>/ig;
            const replacementTitle = `
            <h3 style="text-align: center; margin-top: 30px; margin-bottom: 30px; text-decoration: underline; font-weight: bold; font-size: 20px;">OFFICE NOTE</h3>
            `;
            if (titleRegex.test(html)) {
                titleRegex.lastIndex = 0;
                html = html.replace(titleRegex, replacementTitle);
            }

            // D. Signature
            const replacementSig = `
            <div style="margin-top: 40px; text-align: left; padding-left: 5%;">Submitted for approval, please.</div>
            <div style="display: flex; justify-content: flex-end; margin-top: 40px; margin-bottom: 40px; padding-right: 10%;">
               <div style="text-align: center;">
                   <div style="font-weight: bold; margin-bottom: 20px;">AAO</div>
                   <div style="font-weight: bold; margin-bottom: 20px;">SAO</div>
                   <div style="font-weight: bold;">JCDA</div>
               </div>
            </div>
            `;
            const sigRegex = /<p>[^<]*Submitted for approval, please\.[^]*?AAO[^]*?SAO[^]*?JCDA[^]*?<\/p>/ig;
            if (sigRegex.test(html)) {
                sigRegex.lastIndex = 0;
                html = html.replace(sigRegex, replacementSig);
            }

            // 3. Process DOM (Sanitize, Hash images, Split pages)
            const { pages, assets } = processHtml(html);

            // Insert extracted assets into shared_assets table
            for (const asset of assets) {
                await db.query(`
                    INSERT INTO shared_assets (file_hash, file_path, type)
                    VALUES ($1, $2, 'image')
                    ON CONFLICT (file_hash) DO NOTHING
                `, [asset.hash, asset.publicUrl]);
            }

            let seqNo = 1;
            for (const pageHtml of pages) {
                // Add global padding wrapper
                const paddedHtml = `<div style="padding: 20px; font-family: Arial, sans-serif;">${pageHtml}</div>`;
                
                const pageRes = await db.query(
                    `INSERT INTO document_pages (document_id, sequence_no, page_date, html_content, is_editable)
                     VALUES ($1, $2, CURRENT_DATE, $3, true)
                     RETURNING id`,
                    [docId, seqNo, paddedHtml]
                );
                const pageId = pageRes.rows[0].id;
                
                await db.query(
                    `INSERT INTO document_page_versions (page_id, version, html_content, diff_summary, edited_by)
                     VALUES ($1, 1, $2, 'Initial Mammoth Extraction', NULL)`,
                    [pageId, paddedHtml]
                );

                // Generate embedding for DOCX page
                const cleanText = pageHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                if (cleanText.length > 0) {
                    const vector = await getEmbedding(cleanText.substring(0, 8000));
                    if (vector) {
                        await db.query(
                            `INSERT INTO page_embeddings (page_id, embedding, office_id, updated_at)
                             VALUES ($1, $2::vector, $3, NOW())
                             ON CONFLICT (page_id) DO UPDATE
                             SET embedding = EXCLUDED.embedding, updated_at = NOW()`,
                            [pageId, vector, officeId]
                        );
                        console.log(`[Importer] Embedding stored for ${originalName} page ${seqNo}`);
                    }
                }
                
                // Link assets to this page
                for (const asset of assets) {
                    // Determine if this asset is actually used in THIS specific page
                    if (paddedHtml.includes(asset.publicUrl)) {
                        await db.query(`
                            INSERT INTO page_assets (page_id, shared_asset_id, role)
                            SELECT $1, id, 'body' FROM shared_assets WHERE file_hash = $2
                        `, [pageId, asset.hash]);
                    }
                }

                seqNo++;
            }
            
            console.log(`[Importer] Success: ${originalName} imported as ${pages.length} pages.`);
            return { success: true, docId, pages: pages.length };
        }
        
    } catch (err) {
        console.error(`[Importer] Failed on ${filePath}:`, err);
        throw err;
    } finally {
        if (finalFilePath && finalFilePath !== filePath) {
            try {
                if (fs.existsSync(finalFilePath)) {
                    fs.unlinkSync(finalFilePath);
                    console.log(`[Importer] Cleaned up temp file: ${finalFilePath}`);
                }
            } catch (cleanupErr) {
                console.warn(`[Importer] Failed to clean up temp file: ${finalFilePath}`, cleanupErr.message);
            }
        }
    }
}

module.exports = { processDocumentJob };
