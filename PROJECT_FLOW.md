# Office Automation System - Project Flow & Architecture

Welcome to the **Office Automation** project documentation. This file provides a comprehensive overview of the system's architecture, data flow, and functional workflows, making it easy for developers to understand and contribute to the project.

---

## 1. System Architecture
This is a monolithic application with a clear separation between the client and server.

- **Frontend**: Vanilla HTML5, CSS3, and JavaScript. It functions as a Single Page Application (SPA)-like environment where `index.html` serves as the entry point and routes handle UI updates dynamically via AJAX/Fetch API calls.
- **Backend**: Node.js with Express.js framework, acting as a REST API.
- **Database**: PostgreSQL (v15+) for relational data storage and JSONB for flexible claim form data.
- **Storage**: Physical filesystem storage (`/server/storage`) is used to store static HTML snapshots of user claims and uploaded PDF bills.

---

## 2. Directory Structure

```text
/ (Project Root)
├── api/                  # Express Router modules (auth.js, admin.js, claims.js)
├── config/               # Configuration files (db.js for PostgreSQL pool setup)
├── public/               # Frontend Assets (served statically to the browser)
│   ├── assets/           # CSS styles, frontend JS logic, images
│   ├── claims/           # HTML templates for different claim types (e.g. contingent, ltc)
│   ├── index.html        # Login Page (default fallback route)
│   ├── dashboard.html    # Admin Dashboard
│   ├── dashboard-user.html # Regular User Dashboard
│   └── ...               # Other HTML views
├── server/
│   └── storage/          # System File Storage (Claim snapshots & Bill uploads)
│       └── {username}/   # User-specific directories
│           ├── claims/   # Auto-generated .html files for submitted/draft claims
│           └── bills/    # Uploaded receipt/bill files (PDF, images)
├── scripts/              # Setup and maintenance scripts (e.g., hash_passwords.js)
├── tests/                # Automated integration tests
├── .env                  # Environment Variables (DB connection, JWT secret)
└── server.js             # Main Backend Entry Point
```

---

## 3. Core Workflows & Project Flow

### A. Authentication & Routing
1. **Login**: Users land on `index.html`. They log in via `/api/auth/login`.
2. **Token Generation**: The server validates credentials, generates a **JWT (JSON Web Token)**, and returns it.
3. **Session Storage**: The frontend stores the token in `localStorage` and includes it in the `Authorization: Bearer <token>` header for all subsequent API requests.
4. **Role-Based Redirect**: Based on the role (`Admin`, `Individual`, etc.), the user is redirected to the appropriate dashboard.

### B. Creating a Claim (`claims/new.html`)
1. **Template Loading**: When a user selects a claim type (e.g., "LTC"), the frontend fetches the raw HTML template from `/public/claims/{type}/template.html` and injects it into the DOM.
2. **Auto-Filling**: The frontend JavaScript (`claims_new.js`) automatically populates standard fields (Name, Employee ID, Date) from the user's profile context.
3. **Draft / Submission**: 
   - When the user clicks "Save Draft" or "Submit", the frontend collects all form inputs into a JSON object.
   - It sends a `POST /api/claims` request with the JSON payload.
4. **Server Processing**:
   - The server inserts or updates the record in the `claims` table, storing the form payload as a flexible `JSONB` object in the `data` column.
   - **Static Snapshot Generation**: The server wraps the HTML form (populated with the user's data) inside a standalone HTML document along with the embedded CSS, and saves it as a `.html` file in `/server/storage/{username}/claims/`.

### C. Viewing a Claim (`claims/my.html`)
1. **Listing**: The frontend fetches the user's claims via `GET /api/claims/my`.
2. **Viewing**: When a user clicks "View", the browser requests `/storage/{username}/claims/{id}.html`.
3. **Dynamic Healing**: If the static HTML file is missing from the physical disk (e.g., after restoring from a database-only backup), a special **healing middleware** in `server.js` intercepts the request, queries the `claims.data` JSONB from PostgreSQL, dynamically re-populates the original template on-the-fly, saves it back to the disk, and seamlessly serves it to the browser.

### D. Admin Approval Flow
1. Admins view pending claims via `dashboard.html`.
2. They can review the static snapshot or the data.
3. Admins can update the claim status to **Approved**, **Rejected**, or **Returned** (sent back to the user for corrections).
4. All state changes are immutably logged into the `audit_log` table.

---

## 4. Key Rules and Architectural Constraints

> [!IMPORTANT]
> The following rules strictly govern the system architecture and MUST be followed during development.

* **Database Constraints**: Parameterized queries are mandatory to prevent SQL injection. Passwords are never stored in plain text (bcrypt, cost factor 12).
* **Audit Logging**: The `audit_log` table is **INSERT-ONLY**. Records must never be updated or deleted to maintain strict compliance and traceability.
* **Immutability of Statuses**: Claims that are `Pending`, `Approved`, or `Rejected` cannot be deleted. Only `Draft` claims can be hard-deleted, and only by their owner.
* **Storage Isolation**: User folders under `/server/storage/` are isolated. Server-side validation ensures a user can only access and write to their own path using their JWT `user_id`.
* **Frontend Architecture**: No inline JavaScript or `<style>` blocks in primary HTML files. All logic must reside in global files under `/public/assets/` to ensure maintainability.

### E. Forwarding Letters & Multi-Approval Workflows
1. **Generating Forwarding Notes**: When claims are reviewed by administrators, they generate a forwarding note. For Contingent Bills, administrators can dynamically customize the forwarding recipient via a database-persisted selector dropdown (`Admin Pay`, `Admin I`, `Admin II`, `Admin III`, `Other`).
2. **Bulk Approvals**: Administrators can select multiple pending claims from their dashboard and approve them simultaneously. The backend processes status modifications and logs audit rows inside a single database transaction (`PUT /api/admin/claims/bulk-status`) to maintain consistent states.
3. **Forwardings List**: The administrator panel includes a horizontal layout routing to `/admin/forwardings.html`. This page dynamically queries generated `{claimId}_forwarding_note.html` files directly from the physical disk, displaying them in a tabular summary.

### F. Document Editor Page Break Spacing & Cursor Focus
1. **Page Break Insertion**: Triggering a page break (via toolbar button or Ctrl + Enter) appends a `<hr class="pb-break" />` page break marker.
2. **Margin Spacing**: Empty line spaces (`<p><br></p>`) are automatically padded before the page break line and after the new page's letterhead to prevent layout compression.
3. **Smart Caret Shifting**: A selection range transfer focuses the cursor inside the new blank line of the new page automatically, enabling continuous document editing.
4. **Content-Aware Prepending**: If a page break is executed on a blank edit (or before any user text has been typed), the editor shifts the entire current page (along with its header and reference line) to Page 2, and creates a fresh blank Page 1 at the top.

---

## 5. Environment Setup & Starting the Server

Ensure you have a PostgreSQL 15+ database running. Create the `.env` file with the following variables:
```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=office_automation
JWT_SECRET=supersecret_jwt_key
PORT=3000
```

Start the application using:
```bash
node server.js
```
