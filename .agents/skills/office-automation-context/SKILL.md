---
name: office-automation-context
description: >
  Full context skill for the Office Automation project (d:\Office Automation).
  Activates when working on this Node.js/Electron app — covers the repository module,
  background queue, database config, known bugs, fixes, and coding rules.
  Always read this skill before making any changes to the Office Automation codebase.
---

# Office Automation — Project Context Skill

This skill provides complete project context for the **Office Automation** system built
at `d:\Office Automation`. Read every section before writing or changing any code.

---

## 1. Project Overview

A Node.js + Electron desktop application serving an internal office document management
system. Key modules:

- **Auth / Users** — JWT login, role-based access (SYSADMIN, AAO, AUDITOR, INDIVIDUAL)
- **Claims** — Leave/medical/TA claims workflow
- **Repository** — Document repository backed by PostgreSQL with a background pg-boss queue
- **UI** — Vanilla HTML/CSS/JS served by Express at `http://localhost:3000`

---

## 2. Stack & Environment

| Item | Detail |
|------|--------|
| Runtime | Node.js v20.20.2 (Electron CommonJS — no ESM) |
| Database | PostgreSQL 15 on port **5433** (not default 5432) |
| DB name | `repo_db` |
| DB user | `postgres` / `postgrespassword` |
| Queue | `pg-boss` v10.4.2 |
| File conversion | `libreoffice-convert` (headless LibreOffice) |
| Document parsing | `mammoth` (DOCX->HTML), Python `extract_pdf.py` (PDF OCR) |
| Shared network folder | `D:\Admin_Sharing` (source of all documents) |

---

## 3. Critical Configuration Rules

### Database Connection — ALWAYS use 127.0.0.1, NEVER localhost
After a system sleep/wake cycle, localhost resolves to IPv6 (::1) and causes
ECONNRESET errors that silently crash the worker. Both files must use 127.0.0.1:

- `config/repo_db.js` — main DB pool: host set to 127.0.0.1
- `api/repo/queue.js` — pg-boss connection string: @127.0.0.1:5433/repo_db

### pg-boss v10 Worker Pattern
pg-boss v10 passes an array of jobs to the worker function, not a single job.
Always handle both cases and guard against missing filePath:

```js
await queue.work('document-import', async (jobs) => {
    const jobArray = Array.isArray(jobs) ? jobs : [jobs];
    for (const job of jobArray) {
        const data = job.data;
        if (!data || !data.filePath) {
            console.warn('Skipping job ' + job.id + ' - missing filePath');
            continue;
        }
        try {
            await processDocumentJob(job);
        } catch (err) {
            console.error('Job ' + job.id + ' failed:', err.message);
            throw err;
        }
    }
});
```

### pg-boss Partitions
The pgboss.job table is partitioned. Insert jobs into the partition table
pgboss.job_document_import, NOT pgboss.job directly.

---

## 4. Allowed File Extensions (Repository Sync)

Excel/spreadsheet and PowerPoint files are EXCLUDED by user decision — too complex/opaque to convert.

```js
const ALLOWED_EXTENSIONS = new Set([
    '.docx', '.doc',
    '.odt',
    // EXCLUDED: '.pdf', '.xlsx', '.xls', '.ods', '.pptx', '.ppt'
]);
```

---

## 5. Directory Sync Rules

scripts/directory_sync.js performs a differential/upsert sync:

1. Folders — SELECT for existing folder by (name, parent_id) before inserting.
   Do NOT delete and re-create all folders — this destroys already-imported documents.
2. Files — SELECT for existing document by (title, folder_id) before enqueuing.
3. Root source: D:\Admin_Sharing, mapped to office_id = 1.

---

## 6. Permissions System

File: api/lib/permissions.js

Resolution order:
1. User-level ACL override
2. Role-level ACL override
3. Walk up folder_nodes tree checking role overrides
4. Default fallback — if subjectOfficeId === user.office_id:
   - Rank <= 8 (AAO and above) -> 'edit'
   - Other office admin hierarchy -> 'view'
   - Different office -> 'none'

- INDIVIDUAL role -> always 'none'
- SYSADMIN role -> always 'edit'

---

## 7. Key File Map

| File | Purpose |
|------|---------|
| server.js | Express entry, calls queue.startWorker() on startup |
| config/repo_db.js | pg Pool — must use 127.0.0.1 |
| api/repo/queue.js | pg-boss instance + startWorker() |
| api/repo/importer.js | LibreOffice convert -> PDF -> OCR -> DB insert |
| api/repo/documents.js | GET /api/repo/documents |
| api/lib/permissions.js | resolvePermission, canManageFolder, isOfficeAdminHierarchy |
| scripts/directory_sync.js | Scans D:\Admin_Sharing, creates folders, enqueues jobs |
| scripts/extract_pdf.py | Python PDF OCR extractor |
| scripts/check_status.js | Shows queue state + document count |
| scripts/reset_failed_jobs.js | Resets failed/retry jobs back to created state |
| scripts/remove_excel_jobs.js | Removes Excel file jobs from queue |
| public/storage/documents/ | Converted PDFs stored by SHA-256 hash |

---

## 8. Database Schema (Repository)

```sql
folder_nodes   (id, name, parent_id, office_id, sort_order, created_at)
documents      (id, folder_id, title, reference_no, status, owner_type, owner_office_id, created_at)
document_pages (id, document_id, page_number, content_html, pdf_path, created_at)
acl_overrides  (id, subject_type, subject_id, role_id, user_id, permission, granted_by, created_at)
page_embeddings(page_id, embedding, office_id, updated_at)
```

page_embeddings column: `vector(768)` — requires numeric vector, NOT raw text.

Correct embedding insert pattern (via nomic-embed-text):
```js
// In importer.js — getEmbedding() calls Ollama nomic-embed-text
const vector = await getEmbedding(aiText.substring(0, 8000));
if (vector) {
    await db.query(
        `INSERT INTO page_embeddings (page_id, embedding, office_id, updated_at)
         VALUES ($1, $2::vector, $3, NOW())
         ON CONFLICT (page_id) DO UPDATE
         SET embedding = EXCLUDED.embedding, updated_at = NOW()`,
        [pageId, vector, officeId]
    );
}
```

acl_overrides is INSERT-only — never UPDATE or DELETE.

---

## 9. Known Issues & Fixes Applied

| Issue | Fix |
|-------|-----|
| ECONNRESET after sleep | Use 127.0.0.1 not localhost in all DB connections |
| pg-boss jobs silently dropped | Insert into pgboss.job_document_import partition |
| Worker crashes on malformed job | Guard: check job.data?.filePath before calling processDocumentJob |
| 403 on newly synced folders | resolvePermission default grants access when subjectOfficeId === user.office_id |
| jsdom ESM crash in Electron | Downgraded jsdom to v22 |
| Legacy .doc/.xls/.ppt missing | Added to ALLOWED_EXTENSIONS (xls/xlsx/ods later removed) |
| Duplicate jobs after re-sync | Differential sync: check existing before insert |
| embedding_text column missing | page_embeddings.embedding is vector(768) — use nomic-embed-text via Ollama, cast as ::vector |
| Excel files excluded | User decision: .xlsx, .xls, .ods removed from ALLOWED_EXTENSIONS and queue |
| Embedding pipeline | OCR text -> nomic-embed-text (768-dim) -> stored in page_embeddings.embedding as pgvector |

---

## 10. Diagnostic Commands

```powershell
# Check queue status + document count
node scripts\check_status.js

# Re-sync directory (safe to re-run, differential)
node scripts\directory_sync.js

# Reset failed jobs for retry
node scripts\reset_failed_jobs.js

# Remove Excel/spreadsheet jobs from queue
node scripts\remove_excel_jobs.js

# Check PostgreSQL service
Get-Service | Where-Object {$_.Name -like "*postgres*"}

# Watch live server log (replace TASK_ID)
Get-Content "C:\Users\itsdc\.gemini\antigravity\brain\865afba5-8079-4a6d-8c5a-05526193b357\.system_generated\tasks\TASK_ID.log" -Wait -Tail 30
```

---

## 11. UI Rules

- No inline code in main HTML — only script src references
- No inline styles — all via global style.css
- menu.js is the single source of truth for navigation
- Claim name and date always shown together in every list/panel view

---

## 12. Security Rules

- Passwords hashed with bcrypt, cost factor 12
- Parameterised queries everywhere — no raw SQL string interpolation
- JWT: 8h expiry (individual), 12h (admin)
- All API routes check role from token — no client-side role trust
- must_reset_password=true forces redirect before any other page
- Users can only access their own /storage/{username}/ path (validated server-side)
