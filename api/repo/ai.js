const express = require('express');
const router = express.Router();
const db = require('../../config/repo_db');
const { authenticateToken } = require('../middleware');
const { resolvePermission, isOfficeAdminHierarchy } = require('../lib/permissions');

// POST /api/repo/ai/suggest
router.post('/suggest', authenticateToken, async (req, res) => {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { cursor_context, page_id } = req.body;
        if (!cursor_context || !page_id) {
            return res.status(400).json({ message: 'cursor_context and page_id are required' });
        }

        // 1. Ensure user can read this page
        const perm = await resolvePermission(req.user.id, 'page', page_id, db);
        if (perm === 'none') {
            return res.status(403).json({ message: 'Forbidden: no access to this page' });
        }

        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

        // 2. Embed the cursor context
        const embedRes = await fetch(`${ollamaUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nomic-embed-text',
                prompt: cursor_context
            })
        });

        if (!embedRes.ok) {
            console.error('Ollama embed failed:', embedRes.statusText);
            return res.status(500).json({ message: 'AI embedding service unavailable' });
        }

        const embedData = await embedRes.json();
        // pgvector <=> operator requires '[x,y,...]' format
        const searchVector = `[${embedData.embedding.join(',')}]`;

        // 3. RAG Retrieval (Cosine Similarity)
        // Find top 3 most similar pages in the same office, excluding the current page.
        // We enforce ACL here implicitly by only retrieving from the user's office or permitted scope.
        // To be safe, we join against documents to check owner_office_id.
        const ragQuery = `
            SELECT pe.page_id, dp.html_content, d.title as doc_title,
                   1 - (pe.embedding <=> $1::vector) as similarity
            FROM page_embeddings pe
            JOIN document_pages dp ON pe.page_id = dp.id
            JOIN documents d ON dp.document_id = d.id
            WHERE pe.page_id != $2
              AND (d.owner_office_id = (SELECT office_id FROM users WHERE id = $3) OR d.owner_office_id IS NULL)
            ORDER BY similarity DESC
            LIMIT 3
        `;

        const ragRes = await db.query(ragQuery, [searchVector, page_id, req.user.id]);
        
        let contextSnippets = '';
        if (ragRes.rows.length > 0) {
            contextSnippets = ragRes.rows.map(r => {
                const plainText = (r.html_content || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 1000);
                return `[From Document: ${r.doc_title}]: ${plainText}`;
            }).join('\n\n');
        }

        // 4. Generation via qwen2.5:1.5b-instruct
        const systemPrompt = `You are an AI autocomplete assistant for a government office repository. 
You provide short, precise, formal completions to the user's text. 
Use the provided reference context to mimic the office's writing style and specific vocabulary.
Do not output conversational text or markdown formatting. ONLY output the exact raw text that should be inserted at the cursor. Do not repeat the user's context.`;

        const userPrompt = `
Reference Context (Past Documents):
${contextSnippets || 'None available.'}

User's current text before cursor:
"${cursor_context}"

Complete the sentence or paragraph. Provide a short, logical continuation (max 2-3 sentences).`;

        const genRes = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen:7b',
                system: systemPrompt,
                prompt: userPrompt,
                stream: false,
                options: {
                    temperature: 0.2,
                    num_predict: 50
                }
            })
        });

        if (!genRes.ok) {
            console.error('Ollama generation failed:', genRes.statusText);
            return res.status(500).json({ message: 'AI generation service unavailable' });
        }

        const genData = await genRes.json();
        let suggestion = genData.response.trim();

        res.json({ suggestion });

    } catch (err) {
        console.error('POST /api/repo/ai/suggest error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/repo/ai/instruct
router.post('/instruct', authenticateToken, async (req, res) => {
    try {
        if (!await isOfficeAdminHierarchy(req.user.id, db)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const { cursor_context, instruction } = req.body;
        if (!instruction) {
            return res.status(400).json({ message: 'instruction is required' });
        }

        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

        // 1. Generate embedding for the user's instruction
        const embedRes = await fetch(`${ollamaUrl}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nomic-embed-text',
                prompt: instruction
            })
        });

        let contextSnippets = '';
        if (embedRes.ok) {
            const embedData = await embedRes.json();
            // pgvector <=> operator requires '[x,y,...]' format
            const searchVector = `[${embedData.embedding.join(',')}]`;
            // 2. RAG Retrieval (Cosine Similarity) from pgvector
            const ragQuery = `
                SELECT pe.page_id, dp.html_content, d.title as doc_title,
                       1 - (pe.embedding <=> $1::vector) as similarity
                FROM page_embeddings pe
                JOIN document_pages dp ON pe.page_id = dp.id
                JOIN documents d ON dp.document_id = d.id
                WHERE (d.owner_office_id = (SELECT office_id FROM users WHERE id = $2) OR d.owner_office_id IS NULL)
                ORDER BY similarity DESC
                LIMIT 5
            `;
            try {
                const ragRes = await db.query(ragQuery, [searchVector, req.user.id]);
                if (ragRes.rows.length > 0) {
                    // Keep HTML for document type detection, strip for readable context
                    ragRows = ragRes.rows;
                    contextSnippets = ragRes.rows.map(r => {
                        // Pass structured snippet: stripped text for reading + a small HTML sample
                        const plainText = (r.html_content || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 1500);
                        return `[From Past Document: "${r.doc_title}" | Similarity: ${(r.similarity * 100).toFixed(0)}%]:\n${plainText}`;
                    }).join('\n\n---\n\n');
                }
            } catch (ragErr) {
                console.warn('[AI Instruct] RAG query failed (non-fatal):', ragErr.message);
            }
        } else {
            console.warn('[AI Instruct] Embedding service unavailable, continuing without RAG context.');
        }

        // Detect document type from instruction + RAG HTML samples
        const ragHtmlSamples = ragRows.map(r => r.html_content || '');
        const docType = detectDocumentType(instruction, ragHtmlSamples);
        console.log(`[AI Instruct] Detected document type: ${docType}`);

        // Build type-specific system prompt with the correct format template
        const systemPrompt = buildSystemPrompt(docType, ragHtmlSamples);

        // Build user prompt with RAG context + cursor context
        const cursorContextClean = (cursor_context || '').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').substring(0, 800);
        const userPrompt = `Reference Context (Real Past Documents from this Office — study their structure and language):
${contextSnippets || 'No similar documents found in the repository. Generate based on the document type template in your instructions.'}

Current Page Content (what the user is working on — do NOT duplicate this, only append what is needed):
"${cursorContextClean}"

INSTRUCTION: ${instruction}

IMPORTANT:
- Follow the format template in your system instructions EXACTLY.
- Fill in all placeholder values from the instruction above.
- Output ONLY the HTML body content. No markdown. No conversational text. No explanations.
- If the instruction mentions an amount, period, vendor, or name — include it in the output.`;

        const genRes = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: process.env.OLLAMA_INSTRUCT_MODEL || 'qwen:7b',
                system: systemPrompt,
                prompt: userPrompt,
                stream: false,
                options: {
                    temperature: 0.15,
                    num_predict: 1200,
                    stop: ['```', 'This HTML', 'Note:', 'Please note', 'This document', 'The above']
                }
            })
        });

        if (!genRes.ok) {
            console.error('Ollama generation failed:', genRes.statusText);
            return res.status(500).json({ message: 'AI generation service unavailable' });
        }

        const genData = await genRes.json();
        let suggestion = genData.response.trim();

        // Server-side robust layout cleaning and formatting
        suggestion = formatInstructResponse(suggestion, instruction, docType);

        res.json({ suggestion });

    } catch (err) {
        console.error('POST /api/repo/ai/instruct error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


function detectDocumentType(instruction, ragHtmlSamples) {
    const instr = instruction.toLowerCase();
    
    // Forwarding letter / D.O. letter / memo — uses "To:" block, NOT emblem letterhead
    const isFwdLetter = /forward|forwarding|fwd|contingent.bill|contingency|d\.o\.|demi.official|memo|endorsement/.test(instr);
    // Office Note / Internal Note
    const isOfficeNote = /office.note|note.for|internal.note|put.up/.test(instr);
    // Gazette Notification / Office Order / Circular — uses full letterhead
    const isOrder = /office.order|circular|notification|order|posted|posting/.test(instr);
    // Certificate
    const isCert = /certificate|certif/.test(instr);
    // Satisfaction / Completion
    const isSatisfaction = /satisfaction|satisfactory|completion/.test(instr);

    // Also check if RAG samples show a forwarding letter pattern
    const ragShowsFwd = ragHtmlSamples.some(h => /To\s*<\/p>|The Officer|Forwarding|contingent.bill/i.test(h));
    const ragShowsNote = ragHtmlSamples.some(h => /OFFICE NOTE|office.note/i.test(h));

    if (isFwdLetter || (ragShowsFwd && !isOrder && !isCert)) return 'forwarding_letter';
    if (isOfficeNote || ragShowsNote) return 'office_note';
    if (isCert || isSatisfaction) return 'certificate';
    if (isOrder) return 'office_order';
    return 'generic';
}

function buildSystemPrompt(docType, ragHtmlSamples) {
    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
    
    // Base rules
    const baseRules = `You are an AI assistant for a government office repository (OFFICE OF THE CDA, IT & SDC).
You write formal government documents in clean HTML format.
STRICT RULES:
1. Output ONLY a valid HTML fragment — use <p>, <strong>, <ul>, <li>, <table>, <tr>, <td>, <th> tags.
2. Do NOT output <html>, <head>, <body>, <!DOCTYPE>, markdown code blocks (\`\`\`), or any conversational text.
3. If data is tabular, use <table style="width:100%;border-collapse:collapse;"> with <th style="border:1px solid #333;padding:6px;background:#f0f0f0;"> and <td style="border:1px solid #333;padding:6px;">.
4. ALWAYS follow the exact format shown in the Reference Context below. The Reference Context contains REAL documents from this office — replicate their structure, language, and style precisely.
5. Fill in placeholder values like [Date], [Amount], [Period] based on the instruction.`;

    if (docType === 'forwarding_letter') {
        return `${baseRules}

DOCUMENT TYPE: FORWARDING LETTER / D.O. LETTER
Format to use (copy this structure exactly):
<div class="fwd-meta-row"><div class="fwd-meta-left">No. IT&amp;SDC/[Section]/[Year]/[SeqNo]</div><div class="fwd-meta-right">Dated: ${dateStr}</div></div>
<p><strong>To</strong></p>
<p>[Recipient Designation]<br>[Office Name]<br>[Address Line 1]<br>[City]-[PIN]</p>
<p style="margin-top:16px;"><strong>Subject:</strong> [Subject Line]</p>
<p>[Body paragraph with formal language — mention amount, period, enclosures, and account details if given]</p>
<div style="margin-top:40px;text-align:right;"><p><strong>Sr.AO</strong></p><p>(IT&amp;SDC)</p></div>`;
    }

    if (docType === 'office_note') {
        return `${baseRules}

DOCUMENT TYPE: OFFICE NOTE
Format to use:
<div class="fwd-meta-row"><div class="fwd-meta-left">No. IT&amp;SDC/[Section]/[Year]</div><div class="fwd-meta-right">Dated: ${dateStr}</div></div>
<div style="text-align:center;margin:20px 0;"><h2 style="text-decoration:underline;font-weight:bold;margin:0;">OFFICE NOTE</h2></div>
<p><strong>Subject:</strong> [Subject]</p>
<p>[Body text]</p>
<div style="margin-top:40px;text-align:right;"><p><strong>AAO</strong></p></div>`;
    }

    if (docType === 'certificate') {
        return `${baseRules}

DOCUMENT TYPE: SATISFACTION / COMPLETION CERTIFICATE
Format to use (starts on new page):
<hr style="border-top:3px dashed #ccc;margin:40px 0;" class="page-split-marker"/>
<div class="fwd-letterhead"><div class="fwd-lh-img"><img src="/admin/images/emblem.png" alt="Emblem" onerror="this.style.display='none'"></div><div class="fwd-lh-center"><div class="fwd-lh-title">OFFICE OF THE CDA ( IT &amp; SDC )</div><div class="fwd-lh-sub">Mornington Road, PAO(ORs)AOC Compound,</div><div class="fwd-lh-sub">Trimulgherry, Secunderabad – 500 015.</div><div class="fwd-lh-email">Email: itsdcsec-cda@nic.in</div><div class="fwd-lh-phone">Phone/ Fax No: 040-27742553/29805085</div></div><div class="fwd-lh-img"><img src="/admin/images/azadi.png" alt="Logo Right" onerror="this.style.display='none'"></div></div>
<div class="fwd-meta-row"><div class="fwd-meta-left">No. IT&amp;SDC/[Section]/[Year]</div><div class="fwd-meta-right">Dated: ${dateStr}</div></div>
<div style="text-align:center;margin:20px 0;"><h2 style="text-decoration:underline;font-weight:bold;">SATISFACTION CERTIFICATE</h2></div>
<p>Certified that the work/services rendered by [Vendor/Person Name] for [purpose] for the period from [start date] to [end date] amounting to Rs. [Amount]/- has been found satisfactory.</p>
<div style="margin-top:40px;text-align:right;"><p><strong>Sr.AO</strong></p><p>(IT&amp;SDC)</p></div>`;
    }

    if (docType === 'office_order') {
        return `${baseRules}

DOCUMENT TYPE: OFFICE ORDER / CIRCULAR
Format to use (starts on new page):
<hr style="border-top:3px dashed #ccc;margin:40px 0;" class="page-split-marker"/>
<div class="fwd-letterhead"><div class="fwd-lh-img"><img src="/admin/images/emblem.png" alt="Emblem" onerror="this.style.display='none'"></div><div class="fwd-lh-center"><div class="fwd-lh-title">OFFICE OF THE CDA ( IT &amp; SDC )</div><div class="fwd-lh-sub">Mornington Road, PAO(ORs)AOC Compound,</div><div class="fwd-lh-sub">Trimulgherry, Secunderabad – 500 015.</div><div class="fwd-lh-email">Email: itsdcsec-cda@nic.in</div><div class="fwd-lh-phone">Phone/ Fax No: 040-27742553/29805085</div></div><div class="fwd-lh-img"><img src="/admin/images/azadi.png" alt="Logo Right" onerror="this.style.display='none'"></div></div>
<div class="fwd-meta-row"><div class="fwd-meta-left">No. IT&amp;SDC/Estt/Vol-VII/[SeqNo]</div><div class="fwd-meta-right">Dated: ${dateStr}</div></div>
<div style="text-align:center;margin:20px 0;"><h2 style="text-decoration:underline;font-weight:bold;">OFFICE ORDER</h2></div>
<p>[Body text]</p>
<p>Copy to:</p><ol><li>AN-I Section O/o CDA, Secunderabad</li><li>AN-Pay Section O/o CDA, Secunderabad</li><li>Officials Concerned</li></ol>
<div style="margin-top:40px;text-align:right;"><p><strong>Sr.AO</strong></p><p>(IT&amp;SDC)</p></div>`;
    }

    // Generic
    return `${baseRules}

Study the Reference Context carefully and replicate the format, structure, and language of the most similar document.`;
}

function formatInstructResponse(suggestion, instruction, docType) {
    // 1. Strip markdown wrappers
    let clean = suggestion.replace(/```html?/gi, '').replace(/```/g, '').trim();
    // 2. Strip full HTML document structure
    clean = clean.replace(/<!DOCTYPE[^>]*>/gi, '');
    clean = clean.replace(/<\/?html[^>]*>/gi, '');
    clean = clean.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    clean = clean.replace(/<\/?body[^>]*>/gi, '');
    clean = clean.trim();
    // 3. Remove conversational text
    clean = clean.replace(/^(here is|this is|sure, here is|the following)[^:]*:/i, '');
    clean = clean.replace(/(this is a sample|you can customize|hope this helps|note:|please note:)[^<]*/gi, '');
    // 4. Remove any injected explanatory text after the last closing tag
    const lastTag = clean.lastIndexOf('>');
    if (lastTag > -1) {
        const trailing = clean.substring(lastTag + 1).trim();
        if (trailing && !trailing.startsWith('<')) {
            clean = clean.substring(0, lastTag + 1).trim();
        }
    }
    clean = clean.trim();
    return clean;
}

module.exports = router;
