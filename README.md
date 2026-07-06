# Office Automation

A secure web application for government office claim management. This system allows **Individual** users (employees) to submit various reimbursement claims (Temporary Duty, Medical, LTC, Contingent Bills, etc.) and allows **Administrators** to review, approve, return, or reject them.

---

## 1. Features & Capabilities

- **Role-based Access Control**: Distinct features, views, and server-side route validation for `Admin` and `Individual` roles.
- **Dynamic Claim Templates**: Submit different types of claims using form templates dynamically loaded from the server.
- **Contingent Bill Security**: Advanced server-side security ensures that Individual-submitted Contingent Bills cannot be processed directly without Administrator approval.
- **Dynamic Ward Entitlements**: Automatically sets Ward Entitlement for Medical Reimbursement claims based on PostgreSQL-defined pay thresholds, editable by Administrators.
- **Profile & Dependent Management**: Manage personal profiles, designations, basic pay, pay levels, and dependents.
- **Explorer-style Folder Navigation**: Collapsible, recursive directory tree layout for saved claims and bills, supporting deep nested subfolders.
- **Export to DOCX**: Claims can be exported to Word (`.docx`) format for physical printing and processing.

---

## 2. Directory Structure

```
/Office Automation
  /public                    ← Static frontend assets (Vanilla HTML/CSS/JS)
    /assets
      style.css              ← GLOBAL stylesheet — single source of truth for UI styles
      menu.js                ← Single source of truth for navigation (role-aware)
      layout.js              ← Page shell handler: header, footer, sidebar
      claims_new.js          ← New/edit claim form logic
      claims_my.js           ← My Claims list page logic
      profile.js             ← User profile page logic
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

  /api                       ← Backend routes
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
      ...

  /config
    db.js                    ← PostgreSQL Pool — exports { query, pool }

  /tests
    run_tests.js             ← Full integration test suite (85+ test cases)
```

---

## 3. Database Schema

The database consists of the following key tables:

- **`users`**: Stores employee credentials, designation, CGHS ID, pay details, status flags, and storage directory paths.
- **`roles`**: Defines access levels (`Admin`, `Individual`).
- **`claim_types`**: Configurable types of claims with their target templates.
- **`claims`**: Main claim data store featuring status, dates, parent claim tracking (for version history/overwrites), and form data (`JSONB`).
- **`dependents`**: Linked to users for medical reimbursement eligibility verification.
- **`audit_log`**: INSERT-only log tracking all actions on claims.
- **`bill_files`**: Maps HTML snapshot paths of claims.
- **`ward_entitlement_rules`**: Configurable pay-level thresholds for medical ward entitlement calculations.

---

## 4. System Constraints & Business Rules

### Database & Storage Constraints
- **Passwords**: Always hashed with `bcrypt` using a cost factor of **12** (never stored in plain text).
- **Queries**: Parameterized queries are used everywhere to prevent SQL injection. No raw SQL string interpolation.
- **Claim Submission**: `claim_name` and `claim_date` are strictly required (`NOT NULL` constraints) before a claim can be submitted.
- **Claim Deletion**:
  - **Draft/Returned/Rejected** claims can be deleted by their owner (Individual).
  - **Pending** and **Approved** claims can **never** be deleted by anyone (only returned for correction by Admins).
- **Audit Logs**: The `audit_log` table is **INSERT-only**; `UPDATE` or `DELETE` actions are strictly blocked.
- **User Storage**:
  - A user folder `/storage/{username}/` is created atomically during user creation. If creation fails, the DB transaction rolls back.
  - Subfolders `/bills/` and `/claims/` are automatically created inside the user folder.
  - Claim files are named `{claim_id}.html` (never user-chosen filenames).
  - Overwrite action replaces the existing file on disk (the DB `version` field tracks history).
- **New Claim Type**: Creating a new claim type automatically creates the `/claims/{slug}/` folder and places the `template.html` file.

### Security Constraints
- **JWT tokens**: 8-hour expiry for `Individual` users, 12-hour expiry for `Admin` users.
- **API Roles**: All API routes check the role from the token payload (no client-side role trust).
- **Password Reset**: If `must_reset_password = true` is set, the user is redirected to the change-password page and blocked from accessing other pages.
- **Path Isolation**: Users can only read/write their own storage path (validated server-side against the token `user_id`).
- **Entitlement Rules**: Only the `Admin` role can modify the dynamic ward entitlement thresholds (via `POST /api/claims/ward-entitlements`).

### UI Constraints
- **Clean HTML**: No inline styles and no code in main HTML files. All logic is placed in external script files, and all styling is controlled via `style.css`.
- **Navigation**: `menu.js` is the single source of truth for sidebar navigation links.
- **Dashboard**: The claim list is not auto-loaded on dashboard pages; it is visible only when clicking the **"My Claims"** button.
- **Claim List View**: `claim_name` and `claim_date` must always be displayed together in every list or panel view.

---

## 5. Development & Implementation Patterns

### Database Transactions
For multi-step operations, use `db.pool.connect()` to acquire a single client from the pool to run `BEGIN`, `COMMIT`, and `ROLLBACK` blocks correctly:

```js
const client = await db.pool.connect();
try {
  await client.query('BEGIN');
  // run operations using client.query(...)
  await client.query('COMMIT');
  client.release();
  res.json({ success: true });
} catch (err) {
  await client.query('ROLLBACK');
  client.release();
  res.status(500).json({ error: err.message });
}
```

### Adding a New Claim Type
1. Create the template file in `/public/claims/{slug}/template.html`.
2. Navigate to the Admin Panel → Manage Templates → Upload template.
3. The backend creates a record in `claim_types` and auto-creates the corresponding folder structure.

---

## 6. Setup & Running Local Environment

### Prerequisites
- **Node.js** (v14+ recommended)
- **PostgreSQL** database (v15+)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```env
   PORT=3000
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=office_automation
   DB_PASSWORD=postgres
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret_key
   ```

3. Run migrations sequentially from `db/migrations/` using:
   ```bash
   node db/migrate.js
   ```

4. Start the application:
   ```bash
   npm start
   ```
   The application runs locally on `http://localhost:3000`.

### Testing

The test suite covers authentication, RBAC, isolation, dynamic ward entitlements, and claim lifecycles.
To run the full suite (85+ integration tests):
```bash
node tests/run_tests.js
```
