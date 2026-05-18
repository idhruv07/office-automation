---
trigger: always_on
---

Database rules
DB
Passwords always hashed with bcrypt, cost factor 12 — never stored plain
DB
Use parameterised queries everywhere — no raw SQL string interpolation
DB
claim_name + claim_date are required before submission (NOT NULL constraint)
DB
Draft claims (status=draft) can be hard-deleted by the owner only, only before submission
DB
Pending/approved/rejected claims cannot be deleted — only returned for correction
DB
audit_log rows are INSERT-only — no UPDATE or DELETE ever
File system rules
FS
User folder /storage/{username}/ created atomically during user creation — if it fails, roll back DB insert
FS
Subfolders /bills/ and /claims/ created inside user folder on creation
FS
Claim file named {claim_id}.html — never user-chosen filenames
FS
Overwrite action replaces existing file — old version is not kept on disk (DB version field tracks history)
FS
New claim type creation auto-creates /claims/{slug}/ folder and places template.html
Security rules
SEC
JWT tokens — 8 hour expiry for individuals, 12 hour for admin
SEC
All API routes check role from token — no client-side role trust
SEC
must_reset_password=true forces redirect to change-password before any other page
SEC
Users can only read/write their own storage path — path validated server-side against token user_id
UI rules (reminder)
UI
No code in main HTML files — only script src references to global files
UI
No inline styles — all styling via global style.css
UI
menu.js is the single source of truth for navigation — no nav HTML in page files
UI
Claim list visible on dashboard via "My Claims" button — not auto-loaded on every page
UI
Claim name and date always shown together in every list and panel view