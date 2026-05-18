# Office Automation — Project Workflow & Architecture
> Context document for Antigravity AI. Read this at the start of every session.

---

## 1. Project Overview

A Node.js / Express web application for government office claim management.
Users (Individual employees) submit reimbursement claims. Admins review, approve, return, or reject them.

**Stack:**
- **Backend:** Node.js + Express (`server.js`)
- **Database:** PostgreSQL only — via `pg` Pool (`config/db.js`)
- **Frontend:** Vanilla HTML + CSS + JS (no framework)
- **Auth:** JWT (`jsonwebtoken`) — role encoded in token payload
- **File Storage:** `server/storage/{username}/claims/` and `/bills/`
- **Server Port:** 3000

---

## 2. Folder Structure

```
/Office Automation
  /public                    ← All frontend files served statically
    /assets
      style.css              ← GLOBAL stylesheet — only CSS file
      menu.js                ← Single source of truth for nav (role-aware)
      layout.js              ← Page shell: header, footer, sidebar
      claims_new.js          ← New/edit claim form logic
      claims_my.js           ← My Claims list page logic
      profile.js             ← Profile page logic
      admin_claims.js        ← Admin claims panel logic
      admin_users.js         ← Admin user management logic
      admin_contingent_list.js ← Admin contingent bill list
      fwd_note.js            ← Forwarding note generation
    /claims
      new.html               ← New/edit claim page (skeleton only)
      my.html                ← My Claims page (skeleton only)
      /contingent/template.html
      /medical/template.html
      /td/template.html
      /ltc_final/template.html
      /ltc_intimation/template.html
      /newspaper/template.html
    /admin
      users.html             ← Admin user management page
      contingent_list.html   ← Admin contingent bill list
      ...
    profile.html
    dashboard.html
    index.html               ← Login page

  /server
    /storage
      /{username}/
        /bills/              ← Created atomically on user creation
        /claims/             ← Saved claim HTML snapshots
          /{folder_name}/    ← Optional subfolder (user-specified)
            {claim_id}.html  ← ALWAYS named by claim_id, never by user title

  /api                       ← All backend routes
    auth.js                  ← Login, /me, profile update, change-password, dependents
    claims.js                ← Claim CRUD, file save, delete logic
    admin.js                 ← Admin: users, claims list, status update, claim types
    middleware.js            ← JWT auth + role check + last_active_at update

  /db
    /migrations/             ← SQL migration files (applied in order)
      001_initial_schema.sql
      002_user_profile.sql
      003_dependents.sql
      003_claim_filing.sql
      004_m3_updates.sql
      005_folders.sql
      006_basic_pay.sql
      007_pay_level.sql
      008_codeheads.sql
      009_gender.sql
      010_menu_items.sql
      011_login_tracking.sql

  /config
    db.js                    ← PostgreSQL Pool — exports { query, pool }

  /tests
    run_tests.js             ← Full integration test suite (77 cases)
                               Run: node tests/run_tests.js

  test_all.js                ← Legacy quick smoke test (11 cases)
                               Run: node test_all.js
  server.js                  ← Express entry point
```

---

## 3. Database Schema (Key Tables)

### `users`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| username | VARCHAR UNIQUE | Login identifier |
| password_hash | VARCHAR | bcrypt cost=12 |
| role_id | INTEGER → roles | |
| name | VARCHAR | Full name |
| designation | VARCHAR | |
| email | VARCHAR UNIQUE | Nullable — use NULL not empty string |
| personal_no | VARCHAR | Employee number |
| gender | VARCHAR | Male / Female |
| cghs_ben_id | VARCHAR | |
| address | TEXT | |
| mobile_no | VARCHAR | |
| basic_pay | VARCHAR | |
| pay_level | VARCHAR | |
| orders_for_move | VARCHAR | |
| move_date | DATE | |
| authority | VARCHAR | |
| must_reset_password | BOOLEAN | true on creation |
| storage_path | VARCHAR | |
| last_login_at | TIMESTAMP | |
| last_active_at | TIMESTAMP | Updated on every authenticated request |

### `roles`
| name |
|---|
| Admin |
| Individual |

### `claim_types`
| Column | Notes |
|---|---|
| id | |
| name | Human label |
| folder_name | Slug — maps to `/public/claims/{folder_name}/template.html` |
| is_active | Boolean |

**Known claim types (IDs may vary):**
- Medical Reimbursement
- TD Claim
- LTC Intimation
- Newspaper Bill
- LTC Final Claim
- **Contingent Bill** (`folder_name=contingent`, special security rules)

### `claims`
| Column | Notes |
|---|---|
| id | SERIAL PK |
| user_id | → users |
| type_id | → claim_types |
| status | `Draft` / `Pending` / `Approved` / `Rejected` / `Returned` |
| claim_name | User-entered title — shown in lists |
| claim_date | DATE |
| data | JSONB — form field values |
| remarks | Admin remarks on return/reject |
| submitted_at | Set when status=Pending |
| decided_at | Set when Approved/Rejected/Returned |
| parent_claim_id | For save-as-new / overwrite tracking |
| folder_name | Subfolder within user's claims storage |
| version | Integer, increments on overwrite |
| folder_name | Subfolder within /storage/{username}/claims/ |

### `dependents`
Linked to users. Fields: name, relationship, cghs_ben_id, dob.

### `audit_log`
INSERT-ONLY. Never UPDATE or DELETE. Logs every claim action.

### `bill_files`
Tracks HTML snapshot paths. claim_id → file_path.

---

## 4. Authentication & JWT

- JWT signed with `process.env.JWT_SECRET`
- Payload: `{ id, username, role, must_reset }`
- Admin expiry: 12h | Individual expiry: 8h
- `req.user.role` = `'Admin'` or `'Individual'`
- `must_reset_password=true` → frontend redirects to change-password before any other page
- Middleware also fires `UPDATE users SET last_active_at = NOW()` on every authenticated request

---

## 5. Business Rules (CRITICAL — enforce in all code)

### Claim Status Flow
```
[New] → Draft → Pending → Approved
                        ↘ Rejected
                        ↘ Returned → (user edits) → Pending again
```

### Deletion Rules (Updated)
| Status | Who can delete |
|---|---|
| Draft | Owner only |
| Returned | Owner only |
| Rejected | Owner only |
| Pending | Nobody |
| Approved | Nobody |

### Contingent Bill (type_id=7) Special Rules
- **Individual users:** Always saved as `Draft` regardless of what frontend sends (enforced server-side in `api/claims.js`)
- **Individual contingent drafts:** Owner can delete
- **Individual contingent bills:** NEVER visible in admin panel
- **Admin-submitted contingent bills:** Visible in admin panel, Admin can delete
- The admin contingent list query filters: `WHERE c.type_id = 7 AND c.status != 'Draft' AND r.name = 'Admin'`

### File Storage Rules
- File path: `server/storage/{username}/claims/{folder_name?}/{claim_id}.html`
- Filename is ALWAYS `{claim_id}.html` — never the user's claim title
- The `<title>` tag INSIDE the HTML file contains the user's `claim_name`
- The frontend sends raw `innerHTML` to the backend; the backend wraps it in a full HTML document
- When viewing a claim, `viewClaimPrint()` must include `folder_name` in the URL path
- User storage folders (`/bills/`, `/claims/`) created atomically on user creation — roll back DB if it fails

### Password Rules
- bcrypt cost factor: 12
- New users: `must_reset_password = true` — enforced by frontend redirect

### Security
- All API routes check role from JWT — no client-side role trust
- Parameterized queries everywhere — no raw SQL string interpolation
- User can only read/write their own storage path — validated server-side against token user_id

---

## 6. API Routes Reference

### Auth (`/api/auth`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/login` | None | Returns JWT token + user info |
| GET | `/me` | Token | Returns full user profile + dependents |
| POST | `/profile` | Token | Updates email, mobile_no, address, cghs_ben_id, pay_level, basic_pay. Empty strings → NULL |
| POST | `/change-password` | Token | Sets new password, clears must_reset |
| POST | `/dependents` | Token | Add or edit dependent (id field = edit) |
| DELETE | `/dependents/:id` | Token | Delete dependent |

### Claims (`/api/claims`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/types` | Token | Active claim types only |
| POST | `/` | Token | Create or overwrite claim. `save_mode=overwrite` + `parent_claim_id` to overwrite |
| GET | `/` | Token | User's own claims. Params: `status`, `months`, `year` |
| GET | `/:id` | Token | Single claim (own only) |
| DELETE | `/:id` | Token | Delete Draft/Returned/Rejected (own). Contingent non-Draft: Admin only |
| GET | `/:id/docx` | Token | Export claim as DOCX |

### Admin (`/api/admin`)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/users` | Admin | Create user + storage dirs |
| GET | `/users` | Admin | All users with last_login_at, last_active_at |
| GET | `/claims` | Admin | All non-draft, non-contingent claims. `type_id=7` for contingent (Admin-submitted only) |
| PUT | `/claims/:id/status` | Admin | Set Approved/Rejected/Returned + remarks |
| POST | `/claims/:id/fwd-note` | Admin | Save forwarding note HTML |
| POST | `/claim-types` | Admin | Create new claim type + template upload |
| GET | `/claim-types` | Admin | List all claim types |
| PUT | `/claim-types/:id/toggle` | Admin | Toggle is_active |

---

## 7. Frontend Architecture Rules

- **No logic in HTML files** — only `<script src="...">` references
- **No inline styles** — all via `style.css`
- `menu.js` is the single source of truth for navigation (role-aware)
- `layout.js` handles page shell, header, footer, sidebar
- Each claim type template is a standalone HTML fragment loaded into `#dynamic-template-container`
- `claims_new.js` handles the universal new/edit claim form
- Frontend sends raw `templateContainer.innerHTML` as `htmlContent` — NOT a full HTML document

---

## 8. Database Transaction Pattern

Use `db.pool.connect()` for multi-step transactions (not `db.query('BEGIN')` directly):

```js
const client = await db.pool.connect();
try {
    await client.query('BEGIN');
    // ... all operations use client.query(...)
    await client.query('COMMIT');
    client.release();
    res.json({ ... });
} catch (err) {
    await client.query('ROLLBACK');
    client.release();
    res.status(500).json({ message: 'Error' });
}
```

---

## 9. Running the Project

```bash
# Start server
npm start          # node server.js — runs on port 3000

# Run full test suite (77 test cases, 9 suites)
node tests/run_tests.js

# Run legacy smoke test (11 cases)
node test_all.js

# Apply a new migration
node db/migrate.js   # or: psql -U postgres -d office_automation -f db/migrations/NNN_name.sql
```

**Prerequisites:**
- PostgreSQL running on localhost:5432
- Database: `office_automation`
- Credentials in `.env`: DB_USER, DB_PASSWORD, DB_NAME, DB_HOST, DB_PORT, JWT_SECRET
- Admin account: `admin` / `admin123`

---

## 10. Known Gotchas & Past Fixes

| Issue | Root Cause | Fix Applied |
|---|---|---|
| Transactions not atomic | `db.query('BEGIN')` on Pool picks different connections | Use `db.pool.connect()` for transaction blocks |
| Profile fields not saving | Empty string `""` violates UNIQUE on email column | Backend sanitizes empty strings → NULL |
| Claim file not opening | `viewClaimPrint` ignored `folder_name` in URL path | Now builds `/{folder_name}/{id}.html` correctly |
| Contingent bills sent to admin | Frontend forced `Pending` for type_id=7; admin query showed all | Backend enforces Draft for Individual; admin query filters `r.name='Admin'` |
| `uzpdateFields` typo | Typo in variable name caused `ReferenceError` | Fixed to `updateFields` |
| HTML title mismatch in saved file | Frontend sent full HTML doc; backend wrapped it again (nested docs) | Frontend now sends raw `innerHTML` only |

---

## 11. Adding a New Claim Type (Checklist)

1. Create `/public/claims/{slug}/template.html` (claim form fragment)
2. Via Admin Panel → Manage Templates → Upload template file
3. Backend auto-creates DB record in `claim_types` and folder on disk
4. Claim type appears in dropdown for users immediately

---

## 12. Adding a New Migration

1. Create file: `db/migrations/NNN_description.sql`
2. Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for safety
3. Apply: `psql -U postgres -d office_automation -f db/migrations/NNN_description.sql`
4. Never edit production schema directly — always via migrations

---

*Last updated: 2026-05-18 | Maintained by Antigravity*
