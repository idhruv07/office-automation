CREATE EXTENSION IF NOT EXISTS vector;

--
-- PostgreSQL database dump
--

\restrict ZDC67asrMkYKC5ZacVlPSSXb9FxJQimUTF2YIaCqxVovyXu6DvWiguX4W3FqVtZ

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: acl_overrides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.acl_overrides (
    id integer NOT NULL,
    subject_type character varying(10) NOT NULL,
    subject_id integer NOT NULL,
    role_id integer,
    user_id integer,
    permission character varying(10) NOT NULL,
    granted_by integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.acl_overrides OWNER TO postgres;

--
-- Name: acl_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.acl_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.acl_overrides_id_seq OWNER TO postgres;

--
-- Name: acl_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.acl_overrides_id_seq OWNED BY public.acl_overrides.id;


--
-- Name: document_number_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_number_sequences (
    id integer NOT NULL,
    folder_id integer,
    name_pattern character varying(200) NOT NULL,
    current_counter integer DEFAULT 0 NOT NULL,
    financial_year character varying(9),
    reset_on_fy_change boolean DEFAULT true,
    configured_by integer,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.document_number_sequences OWNER TO postgres;

--
-- Name: document_number_sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_number_sequences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_number_sequences_id_seq OWNER TO postgres;

--
-- Name: document_number_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_number_sequences_id_seq OWNED BY public.document_number_sequences.id;


--
-- Name: document_page_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_page_versions (
    id integer NOT NULL,
    page_id integer,
    version integer NOT NULL,
    html_content text NOT NULL,
    edited_by integer,
    edited_at timestamp without time zone DEFAULT now(),
    diff_summary text
);


ALTER TABLE public.document_page_versions OWNER TO postgres;

--
-- Name: document_page_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_page_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_page_versions_id_seq OWNER TO postgres;

--
-- Name: document_page_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_page_versions_id_seq OWNED BY public.document_page_versions.id;


--
-- Name: document_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_pages (
    id integer NOT NULL,
    document_id integer,
    page_date date NOT NULL,
    sequence_no integer NOT NULL,
    title character varying(300),
    html_content text NOT NULL,
    raw_source_path text,
    is_editable boolean DEFAULT false,
    version integer DEFAULT 1
);


ALTER TABLE public.document_pages OWNER TO postgres;

--
-- Name: document_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_pages_id_seq OWNER TO postgres;

--
-- Name: document_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_pages_id_seq OWNED BY public.document_pages.id;


--
-- Name: document_transfer_reversals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_transfer_reversals (
    id integer NOT NULL,
    transfer_id integer,
    reversed_by integer,
    reversed_at timestamp without time zone DEFAULT now(),
    comment text NOT NULL
);


ALTER TABLE public.document_transfer_reversals OWNER TO postgres;

--
-- Name: document_transfer_reversals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_transfer_reversals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_transfer_reversals_id_seq OWNER TO postgres;

--
-- Name: document_transfer_reversals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_transfer_reversals_id_seq OWNED BY public.document_transfer_reversals.id;


--
-- Name: document_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_transfers (
    id integer NOT NULL,
    original_document_id integer,
    new_document_id integer,
    transferred_to_office_id integer,
    transferred_by integer,
    transferred_at timestamp without time zone DEFAULT now(),
    reason text
);


ALTER TABLE public.document_transfers OWNER TO postgres;

--
-- Name: document_transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_transfers_id_seq OWNER TO postgres;

--
-- Name: document_transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_transfers_id_seq OWNED BY public.document_transfers.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    folder_id integer,
    title character varying(300) NOT NULL,
    reference_no character varying(100),
    status character varying(20) DEFAULT 'active'::character varying,
    created_from_import_id integer,
    created_at timestamp without time zone DEFAULT now(),
    owner_type character varying(15) DEFAULT 'sysadmin'::character varying,
    owner_office_id integer,
    transferred_from_id integer
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: folder_nodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.folder_nodes (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    parent_id integer,
    office_id integer,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.folder_nodes OWNER TO postgres;

--
-- Name: folder_nodes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.folder_nodes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.folder_nodes_id_seq OWNER TO postgres;

--
-- Name: folder_nodes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.folder_nodes_id_seq OWNED BY public.folder_nodes.id;


--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.import_jobs (
    id integer NOT NULL,
    source_path text NOT NULL,
    status character varying(20) DEFAULT 'queued'::character varying,
    detected_dates jsonb,
    error_log text,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone,
    file_hash character varying(64),
    file_size_bytes bigint,
    original_filename character varying(300)
);


ALTER TABLE public.import_jobs OWNER TO postgres;

--
-- Name: import_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.import_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.import_jobs_id_seq OWNER TO postgres;

--
-- Name: import_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.import_jobs_id_seq OWNED BY public.import_jobs.id;


--
-- Name: page_edit_locks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_edit_locks (
    page_id integer NOT NULL,
    held_by integer,
    held_by_rank integer NOT NULL,
    acquired_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.page_edit_locks OWNER TO postgres;

--
-- Name: page_embeddings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_embeddings (
    page_id integer NOT NULL,
    embedding public.vector(768),
    office_id integer,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.page_embeddings OWNER TO postgres;

--
-- Name: acl_overrides id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.acl_overrides ALTER COLUMN id SET DEFAULT nextval('public.acl_overrides_id_seq'::regclass);


--
-- Name: document_number_sequences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_number_sequences ALTER COLUMN id SET DEFAULT nextval('public.document_number_sequences_id_seq'::regclass);


--
-- Name: document_page_versions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_page_versions ALTER COLUMN id SET DEFAULT nextval('public.document_page_versions_id_seq'::regclass);


--
-- Name: document_pages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_pages ALTER COLUMN id SET DEFAULT nextval('public.document_pages_id_seq'::regclass);


--
-- Name: document_transfer_reversals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_transfer_reversals ALTER COLUMN id SET DEFAULT nextval('public.document_transfer_reversals_id_seq'::regclass);


--
-- Name: document_transfers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_transfers ALTER COLUMN id SET DEFAULT nextval('public.document_transfers_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: folder_nodes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_nodes ALTER COLUMN id SET DEFAULT nextval('public.folder_nodes_id_seq'::regclass);


--
-- Name: import_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_jobs ALTER COLUMN id SET DEFAULT nextval('public.import_jobs_id_seq'::regclass);


--
-- Name: acl_overrides acl_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.acl_overrides
    ADD CONSTRAINT acl_overrides_pkey PRIMARY KEY (id);


--
-- Name: document_number_sequences document_number_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_number_sequences
    ADD CONSTRAINT document_number_sequences_pkey PRIMARY KEY (id);


--
-- Name: document_page_versions document_page_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_page_versions
    ADD CONSTRAINT document_page_versions_pkey PRIMARY KEY (id);


--
-- Name: document_pages document_pages_document_id_page_date_sequence_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_pages
    ADD CONSTRAINT document_pages_document_id_page_date_sequence_no_key UNIQUE (document_id, page_date, sequence_no);


--
-- Name: document_pages document_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_pages
    ADD CONSTRAINT document_pages_pkey PRIMARY KEY (id);


--
-- Name: document_transfer_reversals document_transfer_reversals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_transfer_reversals
    ADD CONSTRAINT document_transfer_reversals_pkey PRIMARY KEY (id);


--
-- Name: document_transfers document_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_transfers
    ADD CONSTRAINT document_transfers_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: folder_nodes folder_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_nodes
    ADD CONSTRAINT folder_nodes_pkey PRIMARY KEY (id);


--
-- Name: import_jobs import_jobs_file_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_file_hash_key UNIQUE (file_hash);


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.import_jobs
    ADD CONSTRAINT import_jobs_pkey PRIMARY KEY (id);


--
-- Name: page_edit_locks page_edit_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_edit_locks
    ADD CONSTRAINT page_edit_locks_pkey PRIMARY KEY (page_id);


--
-- Name: page_embeddings page_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_embeddings
    ADD CONSTRAINT page_embeddings_pkey PRIMARY KEY (page_id);


--
-- Name: acl_overrides acl_overrides_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: acl_overrides acl_overrides_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: acl_overrides acl_overrides_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: document_number_sequences document_number_sequences_configured_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: document_number_sequences document_number_sequences_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_number_sequences
    ADD CONSTRAINT document_number_sequences_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folder_nodes(id);


--
-- Name: document_page_versions document_page_versions_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: document_page_versions document_page_versions_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_page_versions
    ADD CONSTRAINT document_page_versions_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.document_pages(id);


--
-- Name: document_pages document_pages_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_pages
    ADD CONSTRAINT document_pages_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id);


--
-- Name: document_transfer_reversals document_transfer_reversals_reversed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: document_transfer_reversals document_transfer_reversals_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_transfer_reversals
    ADD CONSTRAINT document_transfer_reversals_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.document_transfers(id);


--
-- Name: document_transfers document_transfers_new_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_transfers
    ADD CONSTRAINT document_transfers_new_document_id_fkey FOREIGN KEY (new_document_id) REFERENCES public.documents(id);


--
-- Name: document_transfers document_transfers_original_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_transfers
    ADD CONSTRAINT document_transfers_original_document_id_fkey FOREIGN KEY (original_document_id) REFERENCES public.documents(id);


--
-- Name: document_transfers document_transfers_transferred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: document_transfers document_transfers_transferred_to_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: documents documents_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folder_nodes(id);


--
-- Name: documents documents_owner_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: documents documents_transferred_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_transferred_from_id_fkey FOREIGN KEY (transferred_from_id) REFERENCES public.documents(id);


--
-- Name: folder_nodes folder_nodes_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: folder_nodes folder_nodes_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.folder_nodes
    ADD CONSTRAINT folder_nodes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.folder_nodes(id);


--
-- Name: page_edit_locks page_edit_locks_held_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: page_edit_locks page_edit_locks_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_edit_locks
    ADD CONSTRAINT page_edit_locks_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.document_pages(id);


--
-- Name: page_embeddings page_embeddings_office_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

-- Dropped cross-db FK


--
-- Name: page_embeddings page_embeddings_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_embeddings
    ADD CONSTRAINT page_embeddings_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.document_pages(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ZDC67asrMkYKC5ZacVlPSSXb9FxJQimUTF2YIaCqxVovyXu6DvWiguX4W3FqVtZ

