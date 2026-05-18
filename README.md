# Office Automation

A web application for government office claim management. This system allows individuals to submit various reimbursement claims (Temporary Duty, Medical, LTC, Contingent Bills, etc.) and allows Administrators to review, approve, return, or reject them.

## Features
- **Role-based Access Control**: Distinct features and views for `Admin` and `Individual` users.
- **Dynamic Claim Templates**: Submit different claims through a generic form with tailored templates.
- **Contingent Bill Security**: Special server-side security checks ensuring Individual-submitted Contingent Bills cannot be directly processed without Admin approval.
- **Dynamic Ward Entitlements**: Automatically sets Ward Entitlement for Medical Reimbursement claims based on PostgreSQL database-defined pay thresholds, fully editable by Admins.
- **Profile & Dependent Management**: Users can manage their personal profiles, designations, pay details, and dependents.
- **Export to DOCX**: Claims can be exported to Word format for easy physical printing.

## Prerequisites
- **Node.js** (v14+ recommended)
- **PostgreSQL** database

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/idhruv07/office-automation.git
   cd office-automation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Database Configuration:**
   - Create a PostgreSQL database (e.g., `office_automation`).
   - Create a `.env` file in the root directory and add your database credentials:
     ```env
     PORT=3000
     DB_USER=postgres
     DB_HOST=localhost
     DB_NAME=office_automation
     DB_PASSWORD=your_password
     DB_PORT=5432
     JWT_SECRET=your_super_secret_jwt_key
     ```

4. **Run Database Migrations:**
   You can apply migrations sequentially. Run all files located in the `db/migrations/` folder in order.
   ```bash
   psql -U postgres -d office_automation -f db/migrations/001_initial_schema.sql
   # ... apply all remaining migrations in numerical order
   ```

## Running the Application

1. **Start the server:**
   ```bash
   npm start
   ```
2. The application will be running at `http://localhost:3000`.

## Testing
The application features a comprehensive integration test suite covering authentication, claims lifecycles, file path isolations, ward entitlement engines, and RBAC rules.
To run the full suite (85 tests):
```bash
node tests/run_tests.js
```

## Architecture & Workflow
For detailed documentation on the database schema, business rules, API routes, and development guidelines, refer to the [office_automation_workflow.md](./office_automation_workflow.md) file included in the repository.
