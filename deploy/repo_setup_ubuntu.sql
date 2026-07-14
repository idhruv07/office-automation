-- ============================================================
-- SQL REPOSITORY INITIALIZATION SCRIPT FOR repo_db DATABASE
-- Enables Vector extension, defines repository tables, audit logs,
-- pgvector indexing, and establishes FDW links to core db.
-- Idempotent: Can be run multiple times safely.
-- ============================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable postgres_fdw extension
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create Foreign Server linking to core office_automation database
-- Note: Host IP is automatically managed and healed by the app at startup,
-- but we define local defaults here.
CREATE SERVER IF NOT EXISTS core_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host '127.0.0.1', port '5432', dbname 'office_automation');

-- Create User Mapping for FDW connection
CREATE USER MAPPING IF NOT EXISTS FOR postgres
SERVER core_db
OPTIONS (user 'postgres', password 'postgres');

-- Mirror: Offices (mirror of core DB, needed for ACL scoping)
CREATE TABLE IF NOT EXISTS offices (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT UNIQUE,
    parent_id   INT REFERENCES offices(id)
);

-- Mirror: Roles (mirror of core DB)
CREATE TABLE IF NOT EXISTS roles (
    id      SERIAL PRIMARY KEY,
    code    TEXT UNIQUE NOT NULL,
    name    TEXT NOT NULL,
    rank    INT NOT NULL
);

-- Mirror: Users (mirror of core DB)
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    username    TEXT UNIQUE NOT NULL,
    role_id     INT REFERENCES roles(id),
    office_id   INT REFERENCES offices(id)
);

-- Folder Tree for Explorer navigation
CREATE TABLE IF NOT EXISTS folder_nodes (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   INT REFERENCES folder_nodes(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ACL Overrides for folder/document access control
CREATE TABLE IF NOT EXISTS acl_overrides (
    id              SERIAL PRIMARY KEY,
    target_type     TEXT NOT NULL CHECK (target_type IN ('folder','file','page')),
    target_id       INT NOT NULL,
    grantee_type    TEXT NOT NULL CHECK (grantee_type IN ('user','office','role')),
    grantee_id      INT NOT NULL,
    permission      TEXT NOT NULL CHECK (permission IN ('none','read','comment','edit')),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Document Registry
CREATE TABLE IF NOT EXISTS documents (
    id                      SERIAL PRIMARY KEY,
    folder_id               INT REFERENCES folder_nodes(id),
    title                   TEXT NOT NULL,
    reference_no            TEXT,
    owner_type              TEXT CHECK (owner_type IN ('system','office')),
    owner_office_id         INT REFERENCES offices(id),
    transferred_from_id     INT REFERENCES documents(id),
    created_from_import_id  INT,
    status                  TEXT NOT NULL DEFAULT 'active',
    created_at              TIMESTAMPTZ DEFAULT now()
);

-- Document Pages
CREATE TABLE IF NOT EXISTS document_pages (
    id              SERIAL PRIMARY KEY,
    document_id     INT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_date       DATE,
    sequence_no     INT NOT NULL DEFAULT 1,
    title           TEXT,
    is_editable     BOOLEAN DEFAULT true,
    html_content    TEXT,
    raw_source_path TEXT,
    version         INT NOT NULL DEFAULT 1,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Document Page Versions (History audit trail, insert-only)
CREATE TABLE IF NOT EXISTS document_page_versions (
    id              SERIAL PRIMARY KEY,
    page_id         INT NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
    version         INT NOT NULL,
    html_content    TEXT,
    edited_by       INT REFERENCES users(id),
    diff_summary    TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Shared Assets (Deduplicated images, e.g. letterheads)
CREATE TABLE IF NOT EXISTS shared_assets (
    id              SERIAL PRIMARY KEY,
    content_hash    TEXT UNIQUE NOT NULL,
    storage_path    TEXT NOT NULL,
    mime_type       TEXT,
    reference_count INT DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Page Assets linking
CREATE TABLE IF NOT EXISTS page_assets (
    id              SERIAL PRIMARY KEY,
    page_id         INT NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
    shared_asset_id INT NOT NULL REFERENCES shared_assets(id),
    role            TEXT CHECK (role IN ('header','body','footer'))
);

-- Edit Locks
CREATE TABLE IF NOT EXISTS page_edit_locks (
    page_id         INT PRIMARY KEY REFERENCES document_pages(id) ON DELETE CASCADE,
    held_by         INT NOT NULL REFERENCES users(id),
    held_by_rank    INT NOT NULL,
    acquired_at     TIMESTAMPTZ DEFAULT now()
);

-- Document Transfers
CREATE TABLE IF NOT EXISTS document_transfers (
    id                      SERIAL PRIMARY KEY,
    original_document_id    INT REFERENCES documents(id),
    new_document_id         INT REFERENCES documents(id),
    transferred_by          INT REFERENCES users(id),
    transferred_to_office_id INT REFERENCES offices(id),
    transferred_at          TIMESTAMPTZ DEFAULT now()
);

-- Transfer Reversals
CREATE TABLE IF NOT EXISTS document_transfer_reversals (
    id              SERIAL PRIMARY KEY,
    transfer_id     INT NOT NULL REFERENCES document_transfers(id) ON DELETE CASCADE,
    reversed_by     INT REFERENCES users(id),
    comment         TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Document Number Sequences config
CREATE TABLE IF NOT EXISTS document_number_sequences (
    id              SERIAL PRIMARY KEY,
    folder_id       INT NOT NULL REFERENCES folder_nodes(id),
    name_pattern    TEXT NOT NULL,
    current_counter INT NOT NULL DEFAULT 0,
    reset_on_fy     BOOLEAN DEFAULT true,
    created_by      INT REFERENCES users(id),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Import Jobs Tracker
CREATE TABLE IF NOT EXISTS import_jobs (
    id                  SERIAL PRIMARY KEY,
    source_path         TEXT NOT NULL,
    original_filename   TEXT NOT NULL,
    file_hash           TEXT,
    status              TEXT NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued','processing','done','needs_review','failed')),
    detected_dates      JSONB,
    error_log           TEXT,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- Audit Log (insert-only)
CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    action      TEXT NOT NULL,
    remarks     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Ward Entitlement Rules mirror
CREATE TABLE IF NOT EXISTS ward_entitlement_rules (
    id          SERIAL PRIMARY KEY,
    rank_code   TEXT NOT NULL,
    threshold   NUMERIC(10,2),
    updated_by  INT REFERENCES users(id),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- pgvector - Page Embeddings for AI semantic search
CREATE TABLE IF NOT EXISTS page_embeddings (
    page_id     INT PRIMARY KEY REFERENCES document_pages(id) ON DELETE CASCADE,
    embedding   vector(768),
    office_id   INT REFERENCES offices(id),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Cosine similarity index using HNSW for high performance
CREATE INDEX IF NOT EXISTS idx_page_embeddings_vector
    ON page_embeddings USING hnsw (embedding vector_cosine_ops);
