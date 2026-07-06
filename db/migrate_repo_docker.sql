-- ============================================================
-- office_repo database schema
-- Runs on: PostgreSQL 17 + pgvector (Docker container)
-- Port: 5433
-- ============================================================

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Offices (mirror of claims DB, needed for ACL scoping) ────────────────────
CREATE TABLE IF NOT EXISTS offices (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT UNIQUE,
    parent_id   INT REFERENCES offices(id)
);

-- ── Roles (mirror, needed for rank-prevails) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id      SERIAL PRIMARY KEY,
    code    TEXT UNIQUE NOT NULL,
    name    TEXT NOT NULL,
    rank    INT NOT NULL
);

-- ── Users (mirror — read-only shadow, no passwords stored here) ───────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    username    TEXT UNIQUE NOT NULL,
    role_id     INT REFERENCES roles(id),
    office_id   INT REFERENCES offices(id)
);

-- ── Folder Tree ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folder_nodes (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   INT REFERENCES folder_nodes(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── ACL Overrides ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS acl_overrides (
    id              SERIAL PRIMARY KEY,
    target_type     TEXT NOT NULL CHECK (target_type IN ('folder','file','page')),
    target_id       INT NOT NULL,
    grantee_type    TEXT NOT NULL CHECK (grantee_type IN ('user','office','role')),
    grantee_id      INT NOT NULL,
    permission      TEXT NOT NULL CHECK (permission IN ('none','read','comment','edit')),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Documents ─────────────────────────────────────────────────────────────────
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

-- ── Document Pages ────────────────────────────────────────────────────────────
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

-- ── Document Page Versions (history, insert-only) ────────────────────────────
CREATE TABLE IF NOT EXISTS document_page_versions (
    id              SERIAL PRIMARY KEY,
    page_id         INT NOT NULL REFERENCES document_pages(id),
    version         INT NOT NULL,
    html_content    TEXT,
    edited_by       INT REFERENCES users(id),
    diff_summary    TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Shared Assets (deduplicated images) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_assets (
    id              SERIAL PRIMARY KEY,
    content_hash    TEXT UNIQUE NOT NULL,
    storage_path    TEXT NOT NULL,
    mime_type       TEXT,
    reference_count INT DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Page Assets (links pages to images, with role tagging) ───────────────────
CREATE TABLE IF NOT EXISTS page_assets (
    id              SERIAL PRIMARY KEY,
    page_id         INT NOT NULL REFERENCES document_pages(id) ON DELETE CASCADE,
    shared_asset_id INT NOT NULL REFERENCES shared_assets(id),
    role            TEXT CHECK (role IN ('header','body','footer'))
);

-- ── Edit Locks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_edit_locks (
    page_id         INT PRIMARY KEY REFERENCES document_pages(id) ON DELETE CASCADE,
    held_by         INT NOT NULL REFERENCES users(id),
    held_by_rank    INT NOT NULL,
    acquired_at     TIMESTAMPTZ DEFAULT now()
);

-- ── Document Transfers (clones, never overwrites) ─────────────────────────────
CREATE TABLE IF NOT EXISTS document_transfers (
    id                      SERIAL PRIMARY KEY,
    original_document_id    INT REFERENCES documents(id),
    new_document_id         INT REFERENCES documents(id),
    transferred_by          INT REFERENCES users(id),
    transferred_to_office_id INT REFERENCES offices(id),
    transferred_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Transfer Reversals (append-only comments) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS document_transfer_reversals (
    id              SERIAL PRIMARY KEY,
    transfer_id     INT NOT NULL REFERENCES document_transfers(id),
    reversed_by     INT REFERENCES users(id),
    comment         TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Document Number Sequences ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_number_sequences (
    id              SERIAL PRIMARY KEY,
    folder_id       INT NOT NULL REFERENCES folder_nodes(id),
    name_pattern    TEXT NOT NULL,
    current_counter INT NOT NULL DEFAULT 0,
    reset_on_fy     BOOLEAN DEFAULT true,
    created_by      INT REFERENCES users(id),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Import Jobs ───────────────────────────────────────────────────────────────
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

-- ── Audit Log (insert-only) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          SERIAL PRIMARY KEY,
    user_id     INT REFERENCES users(id),
    action      TEXT NOT NULL,
    remarks     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Ward Entitlement Rules ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ward_entitlement_rules (
    id          SERIAL PRIMARY KEY,
    rank_code   TEXT NOT NULL,
    threshold   NUMERIC(10,2),
    updated_by  INT REFERENCES users(id),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- pgvector — Page Embeddings (Phase 5 AI)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS page_embeddings (
    page_id     INT PRIMARY KEY REFERENCES document_pages(id) ON DELETE CASCADE,
    embedding   vector(768),          -- nomic-embed-text output dimension
    office_id   INT REFERENCES offices(id),  -- scope for per-office retrieval
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Cosine similarity index using HNSW (pgvector's fastest ANN algorithm)
CREATE INDEX IF NOT EXISTS idx_page_embeddings_vector
    ON page_embeddings USING hnsw (embedding vector_cosine_ops);
