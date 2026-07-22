--
-- PostgreSQL database dump
--

\restrict GhqPjTqiBaYVdFxCg2Sg2cN9q7kw2gqUZLDA2RjNycS5XMXzPzFzWe0RWVh1fb2

-- Dumped from database version 18.3 (Ubuntu 18.3-1.pgdg24.04+1)
-- Dumped by pg_dump version 18.3 (Ubuntu 18.3-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- Name: audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_log (
    id integer NOT NULL,
    claim_id integer,
    user_id integer,
    action character varying(100) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.audit_log OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_id_seq OWNER TO postgres;

--
-- Name: audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;


--
-- Name: bill_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bill_files (
    id integer NOT NULL,
    claim_id integer,
    file_path character varying(255) NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bill_files OWNER TO postgres;

--
-- Name: bill_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bill_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bill_files_id_seq OWNER TO postgres;

--
-- Name: bill_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bill_files_id_seq OWNED BY public.bill_files.id;


--
-- Name: claim_type_ref_nos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.claim_type_ref_nos (
    id integer NOT NULL,
    claim_type_id integer NOT NULL,
    ref_no character varying(255) NOT NULL,
    valid_from date DEFAULT CURRENT_DATE NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.claim_type_ref_nos OWNER TO postgres;

--
-- Name: TABLE claim_type_ref_nos; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.claim_type_ref_nos IS 'Stores per-claim-type forwarding reference numbers. Latest valid_from <= today is the active one.';


--
-- Name: claim_type_ref_nos_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.claim_type_ref_nos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.claim_type_ref_nos_id_seq OWNER TO postgres;

--
-- Name: claim_type_ref_nos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.claim_type_ref_nos_id_seq OWNED BY public.claim_type_ref_nos.id;


--
-- Name: claim_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.claim_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    folder_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true
);


ALTER TABLE public.claim_types OWNER TO postgres;

--
-- Name: claim_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.claim_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.claim_types_id_seq OWNER TO postgres;

--
-- Name: claim_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.claim_types_id_seq OWNED BY public.claim_types.id;


--
-- Name: claims; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.claims (
    id integer NOT NULL,
    user_id integer,
    type_id integer,
    status character varying(50) DEFAULT 'Pending'::character varying,
    data jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    claim_name character varying(255) NOT NULL,
    claim_date date NOT NULL,
    remarks text,
    submitted_at timestamp without time zone,
    decided_at timestamp without time zone,
    version integer DEFAULT 1,
    parent_claim_id integer,
    folder_name character varying(255)
);


ALTER TABLE public.claims OWNER TO postgres;

--
-- Name: claims_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.claims_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.claims_id_seq OWNER TO postgres;

--
-- Name: claims_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.claims_id_seq OWNED BY public.claims.id;


--
-- Name: codeheads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.codeheads (
    id integer NOT NULL,
    code_head character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.codeheads OWNER TO postgres;

--
-- Name: codeheads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.codeheads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.codeheads_id_seq OWNER TO postgres;

--
-- Name: codeheads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.codeheads_id_seq OWNED BY public.codeheads.id;


--
-- Name: dependents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dependents (
    id integer NOT NULL,
    user_id integer,
    name character varying(100) NOT NULL,
    relationship character varying(50) NOT NULL,
    cghs_ben_id character varying(50),
    dob date,
    gender character varying(10)
);


ALTER TABLE public.dependents OWNER TO postgres;

--
-- Name: dependents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dependents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dependents_id_seq OWNER TO postgres;

--
-- Name: dependents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dependents_id_seq OWNED BY public.dependents.id;


--
-- Name: fwd_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fwd_templates (
    id integer NOT NULL,
    template_name text NOT NULL,
    description text,
    file_path text NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    folder_name text DEFAULT 'General'::text
);


ALTER TABLE public.fwd_templates OWNER TO postgres;

--
-- Name: fwd_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fwd_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fwd_templates_id_seq OWNER TO postgres;

--
-- Name: fwd_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fwd_templates_id_seq OWNED BY public.fwd_templates.id;


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id integer NOT NULL,
    label character varying(100) NOT NULL,
    link character varying(255) NOT NULL,
    permission_required character varying(50),
    parent_id integer,
    display_order integer DEFAULT 0
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_items_id_seq OWNER TO postgres;

--
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- Name: office_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.office_config (
    id integer NOT NULL,
    office_name text DEFAULT 'OFFICE OF THE CDA ( IT & SDC)'::text NOT NULL,
    office_address text DEFAULT 'Mornington Road, PAO(ORs)AOC Compound,'::text NOT NULL,
    office_sub_address text DEFAULT 'Trimulgherry, Secunderabad – 500 015.'::text,
    city_state_pin text,
    phone text DEFAULT '040-27742553/29805085'::text,
    email text DEFAULT 'itsdcsec-cda@nic.in'::text,
    fwd_ref_no text DEFAULT 'IT&SDC/Estt/Vol-VI'::text,
    signatory_name text DEFAULT 'Sr. Accounts Officer'::text,
    signatory_dept text DEFAULT '(IT&SDC)'::text,
    logo_left_url text DEFAULT '/admin/images/emblem.png'::text,
    logo_right_url text DEFAULT '/admin/images/azadi.png'::text,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.office_config OWNER TO postgres;

--
-- Name: office_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.office_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.office_config_id_seq OWNER TO postgres;

--
-- Name: office_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.office_config_id_seq OWNED BY public.office_config.id;


--
-- Name: office_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.office_settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.office_settings OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    permissions jsonb DEFAULT '{}'::jsonb,
    code character varying(50),
    rank integer
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(100),
    designation character varying(100),
    email character varying(100),
    personal_no character varying(50),
    must_reset_password boolean DEFAULT false,
    storage_path character varying(255),
    cghs_ben_id character varying(50),
    address text,
    mobile_no character varying(20),
    basic_pay character varying(100),
    orders_for_move character varying(255),
    move_date date,
    authority character varying(255),
    gender character varying(10) DEFAULT 'Male'::character varying,
    pay_level character varying(50),
    last_login_at timestamp without time zone,
    last_active_at timestamp without time zone,
    gpf_ac_no character varying(100),
    theme_pref character varying(50) DEFAULT ''::character varying,
    is_active boolean DEFAULT true
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ward_entitlement_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ward_entitlement_rules (
    id integer NOT NULL,
    min_pay integer NOT NULL,
    max_pay integer NOT NULL,
    ward_type character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ward_entitlement_rules OWNER TO postgres;

--
-- Name: ward_entitlement_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ward_entitlement_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ward_entitlement_rules_id_seq OWNER TO postgres;

--
-- Name: ward_entitlement_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ward_entitlement_rules_id_seq OWNED BY public.ward_entitlement_rules.id;


--
-- Name: audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN id SET DEFAULT nextval('public.audit_log_id_seq'::regclass);


--
-- Name: bill_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_files ALTER COLUMN id SET DEFAULT nextval('public.bill_files_id_seq'::regclass);


--
-- Name: claim_type_ref_nos id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_type_ref_nos ALTER COLUMN id SET DEFAULT nextval('public.claim_type_ref_nos_id_seq'::regclass);


--
-- Name: claim_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_types ALTER COLUMN id SET DEFAULT nextval('public.claim_types_id_seq'::regclass);


--
-- Name: claims id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claims ALTER COLUMN id SET DEFAULT nextval('public.claims_id_seq'::regclass);


--
-- Name: codeheads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codeheads ALTER COLUMN id SET DEFAULT nextval('public.codeheads_id_seq'::regclass);


--
-- Name: dependents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependents ALTER COLUMN id SET DEFAULT nextval('public.dependents_id_seq'::regclass);


--
-- Name: fwd_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fwd_templates ALTER COLUMN id SET DEFAULT nextval('public.fwd_templates_id_seq'::regclass);


--
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- Name: office_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_config ALTER COLUMN id SET DEFAULT nextval('public.office_config_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: ward_entitlement_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ward_entitlement_rules ALTER COLUMN id SET DEFAULT nextval('public.ward_entitlement_rules_id_seq'::regclass);


--
-- Data for Name: audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_log (id, claim_id, user_id, action, remarks, created_at) FROM stdin;
675	476	31	Claim Submitted		2026-05-21 15:04:25.811177
678	478	33	Claim Submitted		2026-05-21 15:34:44.065632
698	476	1	Claim Approved		2026-05-26 15:00:10.929889
699	478	1	Claim Approved		2026-05-26 15:00:16.398569
768	536	1	Claim Submitted		2026-06-05 11:46:44.300641
769	536	1	Claim Overwritten & Submitted	Version 2	2026-06-05 11:47:06.380613
770	536	1	Claim Overwritten & Submitted	Version 3	2026-06-05 11:53:52.944083
771	536	1	Claim Overwritten & Submitted	Version 4	2026-06-05 12:03:47.922232
772	536	1	Claim Overwritten & Submitted	Version 5	2026-06-05 12:42:33.42954
773	536	1	Claim Overwritten & Submitted	Version 6	2026-06-05 12:53:01.658555
709	499	103	Claim Saved as Draft		2026-05-26 17:46:36.348828
710	499	103	Claim Overwritten & Saved as Draft	Version 2	2026-05-26 17:48:05.094801
711	499	103	Claim Overwritten & Saved as Draft	Version 3	2026-05-26 17:59:36.756839
712	499	103	Claim Overwritten & Saved as Draft	Version 4	2026-05-27 10:22:26.16972
713	500	1	Claim Saved as Draft		2026-05-29 12:16:26.169786
714	501	13	Claim Saved as Draft		2026-05-29 16:10:13.41896
715	501	13	Claim Overwritten & Saved as Draft	Version 2	2026-05-29 16:12:14.472057
716	502	13	Claim Submitted		2026-05-29 16:12:21.458915
717	502	1	Claim Approved		2026-05-29 17:10:29.954353
718	503	1	Claim Submitted		2026-06-01 10:27:45.308657
720	505	22	Claim Saved as Draft		2026-06-01 10:32:14.353949
721	505	22	Claim Overwritten & Saved as Draft	Version 2	2026-06-01 10:40:49.321301
722	505	22	Claim Overwritten & Saved as Draft	Version 3	2026-06-01 10:41:49.014057
723	505	22	Claim Overwritten & Saved as Draft	Version 4	2026-06-01 10:42:44.803386
724	506	16	Claim Submitted		2026-06-01 10:45:46.557658
727	509	7	Claim Submitted		2026-06-01 10:50:11.495809
728	505	22	Claim Overwritten & Saved as Draft	Version 5	2026-06-01 13:43:48.405306
729	509	1	Claim Approved		2026-06-01 14:50:04.547914
730	506	1	Claim Approved		2026-06-01 14:51:41.347081
731	505	22	Claim Overwritten & Submitted	Version 6	2026-06-01 14:52:34.513146
732	505	1	Claim Approved		2026-06-01 14:53:26.980813
733	510	7	Claim Saved as Draft		2026-06-01 17:12:16.571262
740	513	103	Claim Saved as Draft		2026-06-02 16:31:16.678732
756	529	39	Claim Submitted		2026-06-02 16:53:21.650315
757	530	39	Claim Submitted	Saved as new from #529	2026-06-02 17:01:16.216814
759	530	1	Claim Approved		2026-06-03 10:58:39.412369
760	529	1	Claim Rejected		2026-06-03 10:59:42.028116
761	510	7	Claim Overwritten & Submitted	Version 2	2026-06-03 11:16:10.105333
763	533	5	Claim Submitted		2026-06-03 11:55:15.119308
764	533	1	Claim Approved		2026-06-03 14:18:17.396144
765	510	1	Claim Approved		2026-06-03 14:18:27.873393
767	535	1	Claim Submitted	Saved as new from #534	2026-06-05 11:28:01.59022
774	536	1	Claim Overwritten & Submitted	Version 7	2026-06-05 13:05:29.277791
775	536	1	Claim Overwritten & Submitted	Version 8	2026-06-05 14:49:12.429328
776	537	29	Claim Saved as Draft		2026-06-05 15:02:37.901748
777	538	29	Claim Saved as Draft		2026-06-05 15:20:03.743921
778	539	29	Claim Submitted		2026-06-05 15:21:15.530991
780	499	103	Claim Overwritten & Saved as Draft	Version 5	2026-06-05 15:22:07.564156
781	499	103	Claim Overwritten & Saved as Draft	Version 6	2026-06-05 15:38:39.517192
782	499	103	Claim Overwritten & Saved as Draft	Version 7	2026-06-05 15:42:10.109749
783	499	103	Claim Overwritten & Saved as Draft	Version 8	2026-06-05 15:47:37.41917
784	499	103	Claim Overwritten & Saved as Draft	Version 9	2026-06-05 15:51:25.643617
785	499	103	Claim Overwritten & Saved as Draft	Version 10	2026-06-05 15:52:33.309644
786	499	103	Claim Overwritten & Saved as Draft	Version 11	2026-06-05 15:53:27.224882
787	499	103	Claim Overwritten & Submitted	Version 12	2026-06-05 15:53:36.43056
788	541	16	Claim Saved as Draft		2026-06-08 17:11:35.927795
789	541	16	Claim Overwritten & Saved as Draft	Version 2	2026-06-08 17:18:37.169352
790	541	16	Claim Overwritten & Submitted	Version 3	2026-06-09 12:51:26.36621
791	539	1	Claim Approved		2026-06-11 14:41:09.155469
792	542	16	Claim Submitted		2026-06-15 09:57:42.781806
793	543	24	Claim Submitted		2026-06-15 10:29:06.551856
795	541	1	Claim Approved		2026-06-15 12:23:28.415165
796	499	1	Claim Approved		2026-06-15 12:23:42.008595
798	545	1	Claim Submitted		2026-06-15 12:39:09.439739
799	546	1	Claim Submitted		2026-06-15 12:44:30.148337
800	547	1	Claim Submitted	Saved as new from #544	2026-06-15 12:45:07.55664
801	542	1	Claim Approved		2026-06-15 16:37:29.690535
802	548	37	Claim Submitted		2026-06-15 16:55:25.191679
804	550	37	Claim Submitted		2026-06-15 17:15:35.819983
805	551	37	Claim Submitted		2026-06-15 17:19:46.959753
807	551	37	Claim Overwritten & Submitted	Version 2	2026-06-15 17:23:03.91663
808	553	37	Claim Submitted		2026-06-15 17:23:06.889383
809	543	1	Claim Approved		2026-06-15 17:24:45.109144
810	551	37	Claim Overwritten & Submitted	Version 3	2026-06-15 17:24:58.158274
811	548	37	Claim Overwritten & Saved as Draft	Version 2	2026-06-16 10:26:39.364622
812	548	37	Claim Overwritten & Submitted	Version 3	2026-06-16 10:49:14.425868
813	554	6	Claim Saved as Draft		2026-06-16 12:30:15.044935
814	555	6	Claim Submitted		2026-06-16 12:34:54.493588
815	556	1	Claim Submitted		2026-06-16 17:00:10.691795
816	557	16	Claim Submitted		2026-06-17 10:57:47.513204
817	553	1	Claim Rejected		2026-06-17 11:20:15.183092
818	558	12	Claim Submitted		2026-06-18 15:46:55.91901
819	559	12	Claim Submitted		2026-06-18 15:49:36.1398
820	560	103	Claim Submitted		2026-06-20 16:01:38.503319
821	561	39	Claim Saved as Draft		2026-06-22 12:05:53.989149
822	562	39	Claim Submitted		2026-06-22 12:05:56.680865
823	562	1	Claim Approved		2026-06-22 12:28:27.292831
824	560	1	Claim Approved		2026-06-22 12:28:33.444586
825	559	1	Claim Approved		2026-06-22 12:43:15.872162
826	558	1	Claim Approved		2026-06-22 12:43:20.066008
827	557	1	Claim Approved		2026-06-22 12:43:24.309784
828	551	1	Claim Approved		2026-06-22 12:43:28.314977
829	550	1	Claim Approved		2026-06-22 12:43:34.533491
830	555	1	Claim Approved		2026-06-22 12:46:51.026433
831	563	1	Claim Submitted	Saved as new from #536	2026-06-22 13:01:18.30834
832	563	1	Claim Overwritten & Submitted	Version 2	2026-06-22 13:05:38.776591
833	548	1	Claim Approved		2026-06-22 15:07:54.27797
834	564	13	Claim Saved as Draft		2026-06-22 15:26:39.420142
835	564	13	Claim Overwritten & Saved as Draft	Version 2	2026-06-22 15:27:16.386896
836	565	13	Claim Submitted		2026-06-22 15:27:33.377849
837	566	104	Claim Submitted		2026-06-24 11:53:02.769174
838	567	104	Claim Submitted		2026-06-24 12:04:47.359853
839	568	24	Claim Submitted		2026-06-24 15:24:57.724313
840	569	19	Claim Saved as Draft		2026-06-24 17:07:28.480523
841	570	19	Claim Submitted		2026-06-24 17:07:30.846723
842	571	12	Claim Saved as Draft		2026-06-29 15:00:04.37306
843	571	12	Claim Overwritten & Saved as Draft	Version 2	2026-06-29 15:00:49.484986
844	571	12	Claim Overwritten & Saved as Draft	Version 3	2026-06-29 15:02:24.256526
845	571	12	Claim Overwritten & Saved as Draft	Version 4	2026-06-29 15:08:11.067273
846	571	12	Claim Overwritten & Saved as Draft	Version 5	2026-06-29 15:50:01.755229
847	572	15	Claim Saved as Draft		2026-06-30 11:25:55.173473
848	573	15	Claim Submitted		2026-06-30 11:27:25.404517
849	574	7	Claim Submitted		2026-06-30 15:33:38.041459
850	575	7	Claim Submitted		2026-06-30 15:37:55.650349
851	571	12	Claim Overwritten & Saved as Draft	Version 6	2026-07-01 11:21:25.333877
852	571	12	Claim Overwritten & Submitted	Version 7	2026-07-01 11:22:22.0226
853	571	12	Claim Overwritten & Saved as Draft	Version 8	2026-07-01 15:04:05.453704
854	576	12	Claim Submitted	Saved as new from #571	2026-07-01 15:04:23.738332
855	577	1	Claim Submitted		2026-07-01 17:17:38.190003
856	568	1	Claim Approved		2026-07-01 17:30:04.734512
857	565	1	Claim Approved		2026-07-01 17:30:16.781462
858	575	1	Claim Approved		2026-07-01 17:37:50.818576
859	574	1	Claim Approved		2026-07-01 17:37:55.691579
860	573	1	Claim Approved		2026-07-01 17:38:01.295097
861	570	1	Claim Approved		2026-07-01 17:38:05.911718
862	566	1	Claim Approved		2026-07-01 17:38:13.013533
863	576	1	Claim Approved		2026-07-01 17:38:38.129147
864	578	103	Claim Saved as Draft		2026-07-01 18:16:35.012325
865	578	103	Claim Overwritten & Saved as Draft	Version 2	2026-07-01 18:22:14.908288
866	578	103	Claim Overwritten & Saved as Draft	Version 3	2026-07-01 18:27:56.714822
867	579	103	Claim Submitted		2026-07-01 18:28:24.179433
868	580	16	Claim Saved as Draft		2026-07-02 16:05:01.690777
869	580	16	Claim Overwritten & Saved as Draft	Version 2	2026-07-02 16:08:02.72313
870	580	16	Claim Overwritten & Saved as Draft	Version 3	2026-07-02 16:12:15.829183
871	581	39	Claim Saved as Draft		2026-07-03 12:09:14.751375
872	582	39	Claim Submitted		2026-07-03 12:10:12.144272
873	583	14	Claim Submitted		2026-07-06 11:20:46.335927
874	582	1	Claim Approved		2026-07-06 14:32:28.362255
875	584	14	Claim Submitted		2026-07-06 14:33:57.506116
876	584	1	Claim Approved		2026-07-09 13:00:09.174482
877	583	1	Claim Approved		2026-07-09 13:00:13.806621
878	585	1	Claim Submitted	Saved as new from #546	2026-07-09 13:02:05.273892
879	586	38	Claim Saved as Draft		2026-07-09 16:28:57.553772
880	587	105	Claim Saved as Draft		2026-07-09 16:28:57.690722
881	588	105	Claim Submitted		2026-07-09 16:29:01.04887
882	586	38	Claim Overwritten & Saved as Draft	Version 2	2026-07-09 16:33:13.912389
883	586	38	Claim Overwritten & Saved as Draft	Version 3	2026-07-09 16:33:28.984586
884	586	38	Claim Overwritten & Saved as Draft	Version 4	2026-07-09 16:36:42.072008
885	587	105	Claim Overwritten & Saved as Draft	Version 2	2026-07-09 16:38:35.843733
886	587	105	Claim Overwritten & Submitted	Version 3	2026-07-09 16:38:46.857727
887	586	38	Claim Overwritten & Saved as Draft	Version 5	2026-07-09 16:39:48.791202
888	586	38	Claim Overwritten & Submitted	Version 6	2026-07-09 16:40:23.567134
890	590	38	Claim Submitted		2026-07-09 16:43:11.673384
891	591	7	Claim Submitted		2026-07-10 11:00:51.190333
892	592	29	Claim Saved as Draft		2026-07-10 11:03:26.6455
893	593	29	Claim Submitted		2026-07-10 11:03:30.975119
894	594	1	Claim Submitted	Saved as new from #556	2026-07-10 11:23:53.52154
895	588	1	Claim Rejected	Duplicate Claim\n	2026-07-10 11:26:01.622927
896	595	5	Claim Saved as Draft		2026-07-10 11:47:10.69439
897	595	5	Claim Overwritten & Saved as Draft	Version 2	2026-07-10 11:50:23.082251
898	596	5	Claim Submitted		2026-07-10 11:51:27.099919
899	596	5	Claim Overwritten & Submitted	Version 2	2026-07-10 11:57:36.361136
900	597	13	Claim Submitted		2026-07-10 12:00:17.699139
901	598	18	Claim Submitted		2026-07-10 12:10:34.417003
902	599	5	Claim Saved as Draft		2026-07-10 12:11:59.107359
903	600	5	Claim Submitted		2026-07-10 12:12:41.156073
904	601	20	Claim Submitted		2026-07-13 11:05:26.277428
905	602	39	Claim Submitted		2026-07-14 10:40:41.787376
906	603	39	Claim Saved as Draft		2026-07-14 10:50:14.262796
907	604	16	Claim Submitted		2026-07-14 11:56:53.486882
908	605	12	Claim Submitted		2026-07-14 11:57:32.652401
909	606	14	Claim Submitted		2026-07-14 12:17:45.850898
910	607	105	Claim Submitted		2026-07-14 12:19:36.203738
911	608	17	Claim Submitted		2026-07-14 12:24:53.660977
912	609	39	Claim Submitted		2026-07-14 14:20:27.890826
913	602	1	Claim Approved		2026-07-14 15:21:06.67876
914	587	1	Claim Approved		2026-07-14 15:21:19.495747
915	596	1	Claim Approved		2026-07-14 15:22:33.609142
916	567	1	Claim Approved		2026-07-14 15:23:12.257974
917	610	22	Claim Saved as Draft		2026-07-14 15:50:43.070351
918	611	36	Claim Submitted		2026-07-14 15:54:18.4196
919	612	7	Claim Saved as Draft		2026-07-15 13:48:40.33876
920	612	7	Claim Overwritten & Saved as Draft	Version 2	2026-07-15 13:49:41.773781
922	614	23	Claim Submitted		2026-07-15 15:22:53.024903
923	615	37	Claim Submitted		2026-07-15 15:23:11.553869
\.


--
-- Data for Name: bill_files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bill_files (id, claim_id, file_path, uploaded_at) FROM stdin;
475	476	storage/98345856/claims/476.html	2026-05-21 15:04:25.811177
528	545	storage/admin/claims/contingent/545.html	2026-06-15 12:39:09.439739
477	478	storage/98345943/claims/478.html	2026-05-21 15:34:44.065632
529	546	storage/admin/claims/contingent/546.html	2026-06-15 12:44:30.148337
530	547	storage/admin/claims/contingent/547.html	2026-06-15 12:45:07.55664
499	500	storage/admin/claims/500.html	2026-05-29 12:16:26.169786
500	501	storage/98333999/claims/501.html	2026-05-29 16:10:13.41896
501	502	storage/98333999/claims/502.html	2026-05-29 16:12:21.458915
502	503	storage/admin/claims/contingent/503.html	2026-06-01 10:27:45.308657
533	550	storage/98348067/claims/550.html	2026-06-15 17:15:35.819983
505	506	storage/98336522/claims/506.html	2026-06-01 10:45:46.557658
508	509	storage/98332709/claims/509.html	2026-06-01 10:50:11.495809
504	505	storage/98341398/claims/505.html	2026-06-01 10:32:14.353949
571	588	storage/98321463/claims/588.html	2026-07-09 16:29:01.04887
536	553	storage/98348067/claims/553.html	2026-06-15 17:23:06.889383
534	551	storage/98348067/claims/551.html	2026-06-15 17:19:46.959753
583	600	storage/98345722/claims/600.html	2026-07-10 12:12:41.156073
510	513	storage/dhruv/claims/513.html	2026-06-02 16:31:16.678732
512	529	storage/siva/claims/529.html	2026-06-02 16:53:21.650315
513	530	storage/siva/claims/530.html	2026-06-02 17:01:16.216814
509	510	storage/98332709/claims/510.html	2026-06-01 17:12:16.571262
516	533	storage/98345722/claims/533.html	2026-06-03 11:55:15.119308
518	535	storage/admin/claims/contingent/535.html	2026-06-05 11:28:01.59022
531	548	storage/98348067/claims/548.html	2026-06-15 16:55:25.191679
537	554	storage/98320323/claims/554.html	2026-06-16 12:30:15.044935
538	555	storage/98320323/claims/555.html	2026-06-16 12:34:54.493588
539	556	storage/admin/claims/contingent/556.html	2026-06-16 17:00:10.691795
540	557	storage/98336522/claims/557.html	2026-06-17 10:57:47.513204
541	558	storage/98325986/claims/558.html	2026-06-18 15:46:55.91901
519	536	storage/admin/claims/contingent/536.html	2026-06-05 11:46:44.300641
520	537	storage/98345826/claims/537.html	2026-06-05 15:02:37.901748
521	538	storage/98345826/claims/CARDIO/538.html	2026-06-05 15:20:03.743921
522	539	storage/98345826/claims/CARDIO/539.html	2026-06-05 15:21:15.530991
542	559	storage/98325986/claims/559.html	2026-06-18 15:49:36.1398
543	560	storage/dhruv/claims/560.html	2026-06-20 16:01:38.503319
544	561	storage/siva/claims/561.html	2026-06-22 12:05:53.989149
545	562	storage/siva/claims/562.html	2026-06-22 12:05:56.680865
546	563	storage/admin/claims/contingent/563.html	2026-06-22 13:01:18.30834
498	499	storage/dhruv/claims/499.html	2026-05-26 17:46:36.348828
547	564	storage/98333999/claims/564.html	2026-06-22 15:26:39.420142
524	541	storage/98336522/claims/541.html	2026-06-08 17:11:35.927795
525	542	storage/98336522/claims/542.html	2026-06-15 09:57:42.781806
526	543	storage/98345652/claims/543.html	2026-06-15 10:29:06.551856
584	601	storage/98336948/claims/601.html	2026-07-13 11:05:26.277428
548	565	storage/98333999/claims/565.html	2026-06-22 15:27:33.377849
549	566	storage/srinath/claims/566.html	2026-06-24 11:53:02.769174
550	567	storage/srinath/claims/567.html	2026-06-24 12:04:47.359853
551	568	storage/98345652/claims/568.html	2026-06-24 15:24:57.724313
552	569	storage/98336642/claims/569.html	2026-06-24 17:07:28.480523
553	570	storage/98336642/claims/570.html	2026-06-24 17:07:30.846723
585	602	storage/siva/claims/602.html	2026-07-14 10:40:41.787376
586	603	storage/siva/claims/contingent/603.html	2026-07-14 10:50:14.262796
570	587	storage/98321463/claims/587.html	2026-07-09 16:28:57.690722
587	604	storage/98336522/claims/604.html	2026-07-14 11:56:53.486882
555	572	storage/98335515/claims/572.html	2026-06-30 11:25:55.173473
556	573	storage/98335515/claims/573.html	2026-06-30 11:27:25.404517
557	574	storage/98332709/claims/574.html	2026-06-30 15:33:38.041459
558	575	storage/98332709/claims/575.html	2026-06-30 15:37:55.650349
569	586	storage/98352779/claims/586.html	2026-07-09 16:28:57.553772
554	571	storage/98325986/claims/571.html	2026-06-29 15:00:04.37306
559	576	storage/98325986/claims/576.html	2026-07-01 15:04:23.738332
560	577	storage/admin/claims/contingent/577.html	2026-07-01 17:17:38.190003
573	590	storage/98352779/claims/590.html	2026-07-09 16:43:11.673384
561	578	storage/dhruv/claims/578.html	2026-07-01 18:16:35.012325
562	579	storage/dhruv/claims/579.html	2026-07-01 18:28:24.179433
574	591	storage/98332709/claims/591.html	2026-07-10 11:00:51.190333
563	580	storage/98336522/claims/contingent/580.html	2026-07-02 16:05:01.690777
564	581	storage/siva/claims/581.html	2026-07-03 12:09:14.751375
565	582	storage/siva/claims/582.html	2026-07-03 12:10:12.144272
566	583	storage/98334027/claims/583.html	2026-07-06 11:20:46.335927
567	584	storage/98334027/claims/584.html	2026-07-06 14:33:57.506116
568	585	storage/admin/claims/contingent/585.html	2026-07-09 13:02:05.273892
575	592	storage/98345826/claims/592.html	2026-07-10 11:03:26.6455
576	593	storage/98345826/claims/593.html	2026-07-10 11:03:30.975119
577	594	storage/admin/claims/contingent/594.html	2026-07-10 11:23:53.52154
578	595	storage/98345722/claims/595.html	2026-07-10 11:47:10.69439
579	596	storage/98345722/claims/596.html	2026-07-10 11:51:27.099919
580	597	storage/98333999/claims/597.html	2026-07-10 12:00:17.699139
581	598	storage/98336575/claims/598.html	2026-07-10 12:10:34.417003
582	599	storage/98345722/claims/599.html	2026-07-10 12:11:59.107359
588	605	storage/98325986/claims/605.html	2026-07-14 11:57:32.652401
589	606	storage/98334027/claims/606.html	2026-07-14 12:17:45.850898
590	607	storage/98321463/claims/607.html	2026-07-14 12:19:36.203738
591	608	storage/98336528/claims/608.html	2026-07-14 12:24:53.660977
592	609	storage/siva/claims/609.html	2026-07-14 14:20:27.890826
593	610	storage/98341398/claims/610.html	2026-07-14 15:50:43.070351
594	611	storage/98346016/claims/611.html	2026-07-14 15:54:18.4196
595	612	storage/98332709/claims/contingent/612.html	2026-07-15 13:48:40.33876
597	614	storage/98343170/claims/614.html	2026-07-15 15:22:53.024903
598	615	storage/98348067/claims/615.html	2026-07-15 15:23:11.553869
\.


--
-- Data for Name: claim_type_ref_nos; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.claim_type_ref_nos (id, claim_type_id, ref_no, valid_from, created_by, created_at) FROM stdin;
1	7	IT&SDC/Contingent Bills/Misc	2026-05-27	1	2026-05-27 11:37:53.863574+05:30
2	7	IT&SDC/Contingent Bills/2026-27	2026-05-27	1	2026-05-27 11:39:10.656004+05:30
3	3	IT&SDC/Estt/Vol- VIII	2026-05-27	1	2026-05-27 11:40:02.255797+05:30
4	2	IT&SDC/Estt/Vol-VIII	2026-05-29	1	2026-05-29 17:08:59.698024+05:30
5	10	IT&SDC/Estt/Vol-VIII	2026-05-29	1	2026-05-29 17:13:08.600675+05:30
6	5	IT&SDC/Estt/Vol-VIII	2026-05-29	1	2026-05-29 17:13:17.772722+05:30
7	1	IT&SDC/Estt/Vol-VIII	2026-05-29	1	2026-05-29 17:13:22.13407+05:30
8	9	IT&SDC/Estt/Vol-VIII	2026-05-29	1	2026-05-29 17:13:26.653619+05:30
9	8	IT&SDC/Estt/Vol-VIII	2026-05-29	1	2026-05-29 17:13:30.444138+05:30
10	11	IT&SDC/Estt/Vol-VIII	2026-05-29	1	2026-05-29 17:13:34.442661+05:30
11	6	IT&SDC/Contingent Bills/2026-27	2026-05-29	1	2026-05-29 17:13:58.577581+05:30
12	6	IT&SDC/Contingent Bills/2026-27	2026-05-29	1	2026-05-29 17:14:08.240909+05:30
13	7	IT&SDC/Contingent Bills/2026-27	2026-06-01	1	2026-06-01 10:29:35.453181+05:30
\.


--
-- Data for Name: claim_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.claim_types (id, name, folder_name, is_active) FROM stdin;
3	Medical Reimbursement	medical	t
5	LTC Final Claim	ltc_final	t
2	Temporary Duty Claim	td	t
6	Newspaper	newspaper	t
7	Contingent Bill	contingent	t
8	GPF Advance	gpf_advance	t
9	GPF Final Withdrawl	gpf-final-withdrawl	t
10	Permanent Transfer	permanent_transfer	t
11	Advance of Pay/TA	pay_ta_advance	t
1	LTC Intimation	ltc_intimation	t
12	Pay TA Advance	pay_ta_advance	t
13	Office Note	notes	t
\.


--
-- Data for Name: claims; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.claims (id, user_id, type_id, status, data, created_at, updated_at, claim_name, claim_date, remarks, submitted_at, decided_at, version, parent_claim_id, folder_name) FROM stdin;
500	1	5	Draft	{"name": "System Admin", "leave_to": "", "basic_pay": "", "leave_from": "", "balance_due": "", "designation": "", "personal_no": "", "sig_date_p1": "29/05/2026", "block_year_1": "", "block_year_2": "", "less_advance": "", "claimant_name": "System Admin", "authority_date": "", "journey_dist_1": "", "journey_fare_1": "", "journey_mode_1": "", "signature_date": "29/05/2026", "unit_formation": "ITSDC", "claimant_name_p2": "System Admin", "declared_station": "", "declaration_place": "Secunderabad", "journey_persons_1": "", "authority_order_no": "", "journey_arr_date_1": "", "journey_arr_time_1": "", "journey_dep_date_1": "", "journey_dep_time_1": "", "student_concession": "not_availed", "journey_ticket_no_1": "", "journey_total_amt_1": "", "total_journey_claim": "", "claim_preferred_date": "", "claimant_designation": "", "claimant_personal_no": "", "declaration_place_p2": "Secunderabad", "total_amount_claimed": "", "journey_arr_station_1": "", "journey_dep_station_1": "", "claimant_designation_p2": "", "claimant_personal_no_p2": ""}	2026-05-29 12:16:26.169786	2026-05-29 12:16:26.169786	LTC Final Claim_System Admin_2026-05-29	2026-05-29		\N	\N	1	\N	\N
607	105	6	Pending	{"amount": "3000/-", "appName": "K RAMADEVI", "sigName": "K RAMADEVI", "payLevel": "Level 10, Rs. 101400", "dateField": "14 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "SAO"}	2026-07-14 12:19:36.203738	2026-07-14 12:19:36.203738	Newspaper_K RAMADEVI_2026-07-14	2026-07-14		2026-07-14 12:19:36.201	\N	1	\N	\N
476	31	3	Approved	{"email": "skondreddy.dad@gov.in", "opd_amount": "0", "cghs_ben_id": "7480774", "full_address": "H No 14- 101, P & T colony, Dilsukhnagar, Hyderabad", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98345856", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9032653765", "mrc_chk_bills": "on", "mrc_chk_stent": "on", "affidavit_date": "21/05/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "on", "mrc_chk_implant": "on", "card_holder_name": "KONDREDDY SAI KIRAN REDDY", "declaration_date": "21/05/2026", "hospital_details": "Vijaya Diagnostic centre", "mrc_chk_lost_aff": "on", "prior_permission": "No", "ward_entitlement": "General", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "on", "mrc_chk_discharge": "on", "mrc_chk_emergency": "on", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, KONDREDDY SAI KIRAN REDDY, resident of H No 14- 101, P & T colony, Dilsukhnagar, Hyderabad, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "", "treatment_type_test": "on", "declaration_page_date": "21/05/2026", "declaration_signature": "", "generated_declaration": "I {Name Of Individual}, resident of [Adress] hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "on", "declaration_name_desig": "KONDREDDY SAI KIRAN REDDY, AUDITOR", "declaration_page_place": "Secunderabad", "amount_claimed_received": "", "test_investigation_amount": "5670"}	2026-05-21 15:04:25.811177	2026-05-21 15:04:25.811177	Medical Reimbursement_Self_KONDREDDY SAI KIRAN REDDY_2026-05-21	2026-05-21		2026-05-21 15:04:25.81	2026-05-26 15:00:10.929889	1	\N	\N
478	33	3	Approved	{"email": "", "opd_amount": "0", "cghs_ben_id": "7658331", "full_address": "Plot 29, Flat No. 201, Sai Srinivas Towers, Siripuri Colony, Kakaguda, Karkhana, Secunderabad, 500015, telangana", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98345943", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9550394742", "mrc_chk_bills": "on", "mrc_chk_stent": "on", "affidavit_date": "21/05/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "on", "mrc_chk_implant": "on", "card_holder_name": "BHOGYAM VINAY SAI TEJA", "declaration_date": "21/05/2026", "hospital_details": "", "mrc_chk_lost_aff": "on", "prior_permission": "No", "ward_entitlement": "General", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "on", "mrc_chk_discharge": "on", "mrc_chk_emergency": "on", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, BHOGYAM VINAY SAI TEJA, resident of Plot 29, Flat No. 201, Sai Srinivas Towers, Siripuri Colony, Kakaguda, Karkhana, Secunderabad, 500015, telangana, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "7658331", "treatment_type_test": "on", "declaration_page_date": "", "declaration_signature": "BHOGYAM VINAY SAI TEJA", "generated_declaration": "I Bhogyam Vinay Sai Teja, resident of Plot 29, Flat No. 201, Sai Srinivas Towers, Siripuri Colony, Kakaguda, Karkhana, Secunderabad, 500015, telangana hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "on", "declaration_name_desig": "BHOGYAM VINAY SAI TEJA, AUDITOR", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "4830"}	2026-05-21 15:34:44.065632	2026-05-21 15:34:44.065632	Medical Reimbursement_Self_BHOGYAM VINAY SAI TEJA_2026-05-21	2026-05-21		2026-05-21 15:34:44.065	2026-05-26 15:00:16.398569	1	\N	\N
501	13	2	Draft	{"name": "SANTOSH CHANDRAN", "paymode": "neft", "authority": "ITSDC/Contingent Bill/", "basic_pay": "104000 + Level 10", "move_date": "10/05/2026", "claim_date": "29/05/2026", "balance_due": "33298.00", "designation": "SAO", "personal_no": "98333999", "td_rma_days": "", "td_rma_rate": "", "less_advance": "0", "td_favour_of": "SANTOSH CHANDRAN", "td_food_days": "", "td_food_rate": "", "td_rma_total": "", "td_acct_payee": "SANTOSH CHANDRAN", "td_food_total": "", "td_hotel_days": "7", "td_hotel_rate": "1100", "journey_dist_1": "50", "journey_dist_2": "1100", "journey_dist_3": "45", "journey_dist_4": "1401", "journey_dist_5": "1100", "journey_dist_6": "50", "journey_fare_1": "1600", "journey_fare_2": "11307", "journey_fare_3": "1900", "journey_fare_4": "1401", "journey_fare_5": "7590", "journey_fare_6": "1800", "journey_mode_1": "Taxi", "journey_mode_2": "Air", "journey_mode_3": "Taxi", "journey_mode_4": "Taxi", "journey_mode_5": "Air", "journey_mode_6": "Taxi", "td_acct_amount": "", "td_hotel_total": "7700.00", "unit_formation": "ITSDC", "orders_for_move": "", "td_acct_treasury": "", "journey_persons_1": "1", "journey_persons_2": "1", "journey_persons_3": "1", "journey_persons_4": "1", "journey_persons_5": "1", "journey_persons_6": "1", "td_passed_payment": "", "journey_arr_date_1": "10/05/2026", "journey_arr_date_2": "10/05/2026", "journey_arr_date_3": "10/05/2026", "journey_arr_date_4": "16/05/2026", "journey_arr_date_5": "16/05/2026", "journey_arr_date_6": "16/05/2026", "journey_arr_time_1": "09:30", "journey_arr_time_2": "15:30", "journey_arr_time_3": "17:30", "journey_arr_time_4": "07:15", "journey_arr_time_5": "12:00", "journey_arr_time_6": "13:15", "journey_dep_date_1": "10/05/2026", "journey_dep_date_2": "10/05/2026", "journey_dep_date_3": "10/05/2026", "journey_dep_date_4": "16/05/2026", "journey_dep_date_5": "16/05/2026", "journey_dep_date_6": "16/05/2026", "journey_dep_time_1": "08:30", "journey_dep_time_2": "12:40", "journey_dep_time_3": "16:00", "journey_dep_time_4": "06:00", "journey_dep_time_5": "09:40", "journey_dep_time_6": "12:15", "journey_start_from": "Secunderabad", "journey_ticket_no_1": "Taxi Fare Bill Attached", "journey_ticket_no_2": "FB:0505B141B1", "journey_ticket_no_3": "Taxi Fare Bill Attached", "journey_ticket_no_4": "Taxi Fare Bill Attached", "journey_ticket_no_5": "FB:0505CE8D0F", "journey_ticket_no_6": "Taxi Fare Bill Attached", "journey_total_amt_1": "1600.00", "journey_total_amt_2": "11307.00", "journey_total_amt_3": "1900.00", "journey_total_amt_4": "1401.00", "journey_total_amt_5": "7590.00", "journey_total_amt_6": "1800.00", "total_journey_claim": "25598.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "33298.00", "journey_arr_station_1": "Hyderabad Airport", "journey_arr_station_2": "Delhi Airport", "journey_arr_station_3": "Reemedra Hotels, Faridabad", "journey_arr_station_4": "Delhi Airport", "journey_arr_station_5": "Hyderabad Airport", "journey_arr_station_6": "DAD Quarters, Secunderabad", "journey_dep_station_1": "DAD Quarters Secunderabad", "journey_dep_station_2": "Hyderabad Airport", "journey_dep_station_3": "Delhi Airport", "journey_dep_station_4": "Reemedra Hotels, Faridabad", "journey_dep_station_5": "Delhi Airport", "journey_dep_station_6": "Hyderabad Airport"}	2026-05-29 16:10:13.41896	2026-05-29 16:12:14.472057	Temporary Duty Claim_SANTOSH CHANDRAN_2026-05-29	2026-05-29		\N	\N	2	\N	\N
502	13	2	Approved	{"name": "SANTOSH CHANDRAN", "paymode": "neft", "authority": "ITSDC/Contingent Bill/", "basic_pay": "104000 + Level 10", "move_date": "10/05/2026", "claim_date": "29/05/2026", "balance_due": "33298.00", "designation": "SAO", "personal_no": "98333999", "td_rma_days": "", "td_rma_rate": "", "less_advance": "0", "td_favour_of": "SANTOSH CHANDRAN", "td_food_days": "", "td_food_rate": "", "td_rma_total": "", "td_acct_payee": "SANTOSH CHANDRAN", "td_food_total": "", "td_hotel_days": "7", "td_hotel_rate": "1100", "journey_dist_1": "50", "journey_dist_2": "1100", "journey_dist_3": "45", "journey_dist_4": "1401", "journey_dist_5": "1100", "journey_dist_6": "50", "journey_fare_1": "1600", "journey_fare_2": "11307", "journey_fare_3": "1900", "journey_fare_4": "1401", "journey_fare_5": "7590", "journey_fare_6": "1800", "journey_mode_1": "Taxi", "journey_mode_2": "Air", "journey_mode_3": "Taxi", "journey_mode_4": "Taxi", "journey_mode_5": "Air", "journey_mode_6": "Taxi", "td_acct_amount": "", "td_hotel_total": "7700.00", "unit_formation": "ITSDC", "orders_for_move": "", "td_acct_treasury": "", "journey_persons_1": "1", "journey_persons_2": "1", "journey_persons_3": "1", "journey_persons_4": "1", "journey_persons_5": "1", "journey_persons_6": "1", "td_passed_payment": "", "journey_arr_date_1": "10/05/2026", "journey_arr_date_2": "10/05/2026", "journey_arr_date_3": "10/05/2026", "journey_arr_date_4": "16/05/2026", "journey_arr_date_5": "16/05/2026", "journey_arr_date_6": "16/05/2026", "journey_arr_time_1": "09:30", "journey_arr_time_2": "15:30", "journey_arr_time_3": "17:30", "journey_arr_time_4": "07:15", "journey_arr_time_5": "12:00", "journey_arr_time_6": "13:15", "journey_dep_date_1": "10/05/2026", "journey_dep_date_2": "10/05/2026", "journey_dep_date_3": "10/05/2026", "journey_dep_date_4": "16/05/2026", "journey_dep_date_5": "16/05/2026", "journey_dep_date_6": "16/05/2026", "journey_dep_time_1": "08:30", "journey_dep_time_2": "12:40", "journey_dep_time_3": "16:00", "journey_dep_time_4": "06:00", "journey_dep_time_5": "09:40", "journey_dep_time_6": "12:15", "journey_start_from": "Secunderabad", "journey_ticket_no_1": "Taxi Fare Bill Attached", "journey_ticket_no_2": "FB:0505B141B1", "journey_ticket_no_3": "Taxi Fare Bill Attached", "journey_ticket_no_4": "Taxi Fare Bill Attached", "journey_ticket_no_5": "FB:0505CE8D0F", "journey_ticket_no_6": "Taxi Fare Bill Attached", "journey_total_amt_1": "1600.00", "journey_total_amt_2": "11307.00", "journey_total_amt_3": "1900.00", "journey_total_amt_4": "1401.00", "journey_total_amt_5": "7590.00", "journey_total_amt_6": "1800.00", "total_journey_claim": "25598.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "33298.00", "journey_arr_station_1": "Hyderabad Airport", "journey_arr_station_2": "Delhi Airport", "journey_arr_station_3": "Reemedra Hotels, Faridabad", "journey_arr_station_4": "Delhi Airport", "journey_arr_station_5": "Hyderabad Airport", "journey_arr_station_6": "DAD Quarters, Secunderabad", "journey_dep_station_1": "DAD Quarters Secunderabad", "journey_dep_station_2": "Hyderabad Airport", "journey_dep_station_3": "Delhi Airport", "journey_dep_station_4": "Reemedra Hotels, Faridabad", "journey_dep_station_5": "Delhi Airport", "journey_dep_station_6": "Hyderabad Airport"}	2026-05-29 16:12:21.458915	2026-05-29 16:12:21.458915	Temporary Duty Claim_SANTOSH CHANDRAN_2026-05-29	2026-05-29		2026-05-29 16:12:21.458	2026-05-29 17:10:29.954353	1	\N	\N
503	1	7	Pending	{"vr_no": "", "during": "02/2026 to 04/2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "GEMC-511687711243592", "bill_date": "2026-06-01", "cda_month": "", "signature": "", "exp_date_1": "2026-06-01", "payee_name": "", "cda_section": "100", "exp_account": "Conservancy Bills", "incurred_by": "ITSDC", "amount_words": "Three Lakh Sixty-Eight  Thousand Two Hundred and Twenty-Six", "exp_amount_1": "368226", "passed_words": "", "payee_amount": "", "total_amount": "368226.00", "exp_details_1": "Conservancay services for the period Feb 2026 to April 2026", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "04/06/2025", "payee_treasury": "", "name_designation": "ADMIN SAO", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-06-01 10:27:45.308657	2026-06-01 10:27:45.308657	Conservancy Bill	2026-06-01		2026-06-01 10:27:45.306	\N	1	\N	contingent
608	17	6	Pending	{"amount": "3000/-", "appName": "V UDAYA KIRAN", "sigName": "V UDAYA KIRAN", "payLevel": "Level 10, Rs. 101400", "dateField": "14 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "SAO"}	2026-07-14 12:24:53.660977	2026-07-14 12:24:53.660977	Newspaper_V UDAYA KIRAN_2026-07-14	2026-07-14		2026-07-14 12:24:53.66	\N	1	\N	\N
509	7	3	Approved	{"email": "binusnair.dad@hub.nic.in", "opd_amount": "0", "cghs_ben_id": "7029832", "full_address": "TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "RENU K.S", "relationship": "Wife", "employee_code": "98332709", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9447322538", "mrc_chk_bills": "on", "mrc_chk_stent": "on", "affidavit_date": "01/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "on", "mrc_chk_implant": "on", "card_holder_name": "BINU S NAIR", "declaration_date": "01/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "on", "prior_permission": "No", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "on", "mrc_chk_discharge": "on", "mrc_chk_emergency": "on", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, BINU S NAIR, resident of TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "7029834", "treatment_type_test": "on", "declaration_page_date": "01/06/2026", "declaration_signature": "", "generated_declaration": "I BINU S NAIR, resident of TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "on", "declaration_name_desig": "BINU S NAIR, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "3537"}	2026-06-01 10:50:11.495809	2026-06-01 10:50:11.495809	Medical Reimbursement_Dependent_RENU K.S_2026-06-01	2026-06-01		2026-06-01 10:50:11.48	2026-06-01 14:50:04.547914	1	\N	\N
609	39	6	Pending	{"amount": "3000/-", "appName": "K M SIVA SHANKAR", "sigName": "K M SIVA SHANKAR", "payLevel": "Level 13, Rs. 123100", "dateField": "14 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "ADDL CDA"}	2026-07-14 14:20:27.890826	2026-07-14 14:20:27.890826	Newspaper_K M SIVA SHANKAR_2026-07-14	2026-07-14		2026-07-14 14:20:27.888	\N	1	\N	\N
506	16	9	Approved	{"gpf_pay": "101400", "gpf_date": "01/06/26", "gpf_name": "R RAVEENDRA PRASAD", "gpf_purpose": "to repay the housing loan", "gpf_sig_acno": "0992325", "gpf_sig_name": "R RAVEENDRA PRASAD / SAO", "gpf_prev_year": "", "gpf_acc_no_top": "0992325", "gpf_account_no": "0992325", "gpf_bal_refund": "0", "gpf_prev_month": "", "gpf_advance_req": "400000", "gpf_bal_closing": "623743", "gpf_bal_contrib": "60000", "gpf_designation": "SAO", "gpf_net_balance": "683743", "gpf_sig_section": "CDA(ITSDC)SECUNDERABAD", "gpf_half_balance": "₹ 3,41,872", "gpf_joining_date": "07/09/1998", "gpf_bal_withdrawal": "0", "gpf_six_months_pay": "₹ 6,08,400", "gpf_accounts_office": "CDA (Funds) Meerut", "gpf_retirement_date": "31/08/2037", "gpf_sig_placeholder": "", "gpf_bal_closing_year": "2025-2026", "gpf_bal_refund_period": "", "gpf_bal_contrib_period": "Mar-May", "prev_withdrawal_exists": "no", "gpf_bal_withdrawal_period": "", "gpf_three_quarter_balance": "₹ 5,12,807"}	2026-06-01 10:45:46.557658	2026-06-01 10:45:46.557658	GPF Final Withdrawl_R RAVEENDRA PRASAD_2026-06-01	2026-06-01		2026-06-01 10:45:46.555	2026-06-01 14:51:41.347081	1	\N	\N
505	22	5	Approved	{"name": "K V N PRASAD", "leave_to": "29/05/2026", "basic_pay": "50500 + Level 8", "leave_from": "29/05/2026", "balance_due": "9823.00", "designation": "AAO", "personal_no": "98341398", "sig_date_p1": "01/06/26", "block_year_1": "8th year", "block_year_2": "", "family_age_1": "", "less_advance": "", "claimant_name": "K V N PRASAD", "family_name_1": "Self", "authority_date": "", "journey_dist_1": "", "journey_dist_2": "", "journey_mode_1": "Flight", "journey_mode_2": "Flight", "signature_date": "01/06/2026", "unit_formation": "ITSDC", "claimant_name_p2": "K V N PRASAD", "declared_station": "", "declaration_place": "Secunderabad", "authority_order_no": "", "journey_arr_date_1": "29/05/26", "journey_arr_date_2": "29/05/26", "journey_arr_time_1": "11:00", "journey_arr_time_2": "18:20", "journey_dep_date_1": "29/05/26", "journey_dep_date_2": "29/05/26", "journey_dep_time_1": "09:30", "journey_dep_time_2": "16:50", "student_concession": "not_availed", "journey_ticket_no_1": "Air Fare  may be restricted to 2A fare", "journey_ticket_no_2": "Air Fare may be  restricted to 2A fare", "journey_total_amt_1": "5263", "journey_total_amt_2": "4560", "total_journey_claim": "9823.00", "claim_preferred_date": "01/06/2026", "claimant_designation": "AAO", "claimant_personal_no": "98341398", "declaration_place_p2": "Secunderabad", "total_amount_claimed": "9823.00", "family_relationship_1": "Self", "journey_arr_station_1": "Mumbai", "journey_arr_station_2": "Hyderabad", "journey_dep_station_1": "Hyderabad", "journey_dep_station_2": "Mumbai", "claimant_designation_p2": "AAO", "claimant_personal_no_p2": "98341398"}	2026-06-01 10:32:14.353949	2026-06-01 14:52:34.513146	LTC Final Claim_K V N PRASAD_2026-06-01	2026-05-31		2026-06-01 14:52:34.512	2026-06-01 14:53:26.980813	6	\N	\N
571	12	9	Draft	{"gpf_pay": "104400", "gpf_date": "01/07/26", "gpf_name": "C S CHAKRAVARTHY", "gpf_purpose": "Repairs to Own House", "gpf_sig_acno": "0989031H", "gpf_sig_name": "C S CHAKRAVARTHY / SAO", "gpf_prev_year": "", "gpf_acc_no_top": "0989031H", "gpf_account_no": "0989031H", "gpf_bal_refund": "", "gpf_prev_month": "", "gpf_advance_req": "532000", "gpf_bal_closing": "423128", "gpf_bal_contrib": "168000", "gpf_designation": "SAO", "gpf_net_balance": "591128", "gpf_sig_section": "Administration", "gpf_half_balance": "₹ 2,95,564", "gpf_joining_date": "26/03/1993", "gpf_bal_withdrawal": "", "gpf_six_months_pay": "₹ 6,26,400", "gpf_accounts_office": "CDA (Funds) Meerut", "gpf_retirement_date": "31/1/2030", "gpf_sig_placeholder": "", "gpf_bal_closing_year": "2025-26", "gpf_bal_refund_period": "", "gpf_bal_contrib_period": "Mar-June", "prev_withdrawal_exists": "no", "gpf_bal_withdrawal_period": "", "gpf_three_quarter_balance": "₹ 4,43,346"}	2026-06-29 15:00:04.37306	2026-07-01 15:04:05.453704	GPF Final Withdrawl_C S CHAKRAVARTHY_2026-06-29	2026-07-01		\N	\N	8	\N	\N
513	103	11	Draft	{"name": "Dhruv Bhardwaj", "rank": "AAO", "pm_r1": "", "pm_cda": "", "pm_mr2": "", "pm_r1b": "", "pm_r1c": "", "da_ao_1": "", "da_ao_2": "", "da_ao_3": "", "da_so_1": "", "da_so_2": "", "da_so_3": "", "dr_item": "", "dr_page": "", "pm_c3_p": "", "pm_mr2b": "", "pm_mr2c": "", "cda_name": "", "pm_c3_rs": "", "pm_c3b_p": "", "pm_c3c_p": "", "pm_mc4_p": "", "pm_month": "", "pm_vr_no": "", "basic_pay": "50500", "grade_pay": "8", "pm_c3b_rs": "", "pm_c3c_rs": "", "pm_mc4_rs": "", "pm_mc4b_p": "", "pm_mc4c_p": "", "weight_kg": "", "amount_num": "", "corps_dept": "", "da_payee_1": "", "da_payee_2": "", "da_payee_3": "", "pm_mc4b_rs": "", "pm_mc4c_rs": "", "pm_section": "", "cheque_name": "", "da_passed_p": "", "pm_class_c3": "", "pm_class_r1": "", "pm_vr_class": "", "advance_type": "", "amount_words": "", "authority_no": "AN/IX/9010/IT Policy/2026 Dt. 05/02/2026", "da_passed_rs": "", "pm_class_c3b": "", "pm_class_c3c": "", "pm_class_r1b": "", "pm_class_r1c": "", "vehicle_type": "", "cheque_favour": "other", "da_treasury_1": "", "da_treasury_2": "", "da_treasury_3": "", "advance_amount": "", "advance_period": "", "authority_date": "2026-09-03", "family_details": "Dhriti Bhardwaj (Daughter, 5 yrs), Dharvi Bhardwaj (Daughter, 0 yrs), Jyoti Sharma (Spouse, 32 yrs)", "ltc_block_year": "", "signature_note": "", "transport_mode": "", "advance_purpose": "", "da_cheque_amt_1": "", "da_cheque_amt_2": "", "da_cheque_amt_3": "", "da_passed_words": "", "journey_details": "", "ltc_destination": "", "travel_expenses": "", "countersigned_by": "", "da_cheque_date_1": "", "da_cheque_date_2": "", "da_cheque_date_3": "", "issuing_authority": "", "vehicle_authority_ref": ""}	2026-06-02 16:31:16.678732	2026-06-02 16:31:16.678732	Advance of Pay/TA_Dhruv Bhardwaj_2026-06-02	2026-06-02		\N	\N	1	\N	\N
576	12	9	Approved	{"gpf_pay": "104400", "gpf_date": "01/07/26", "gpf_name": "C S CHAKRAVARTHY", "gpf_purpose": "Repairs to Own House", "gpf_sig_acno": "0989031H", "gpf_sig_name": "C S CHAKRAVARTHY / SAO", "gpf_prev_year": "", "gpf_acc_no_top": "0989031H", "gpf_account_no": "0989031H", "gpf_bal_refund": "", "gpf_prev_month": "", "gpf_advance_req": "532000", "gpf_bal_closing": "423128", "gpf_bal_contrib": "168000", "gpf_designation": "SAO", "gpf_net_balance": "591128", "gpf_sig_section": "Administration", "gpf_half_balance": "₹ 2,95,564", "gpf_joining_date": "26/03/1993", "gpf_bal_withdrawal": "", "gpf_six_months_pay": "₹ 6,26,400", "gpf_accounts_office": "CDA (Funds) Meerut", "gpf_retirement_date": "31/1/2030", "gpf_sig_placeholder": "", "gpf_bal_closing_year": "2025-26", "gpf_bal_refund_period": "", "gpf_bal_contrib_period": "Mar-June", "prev_withdrawal_exists": "no", "gpf_bal_withdrawal_period": "", "gpf_three_quarter_balance": "₹ 4,43,346"}	2026-07-01 15:04:23.738332	2026-07-01 15:04:23.738332	GPF Final Withdrawl_C S CHAKRAVARTHY_2026-06-29	2026-07-01		2026-07-01 15:04:23.735	2026-07-01 17:38:38.129147	1	571	\N
578	103	2	Draft	{"name": "Dhruv Bhardwaj", "authority": "CGDA Mech/IUT&S/985/Sys AuditDt.19/06/2026", "basic_pay": "50500 + Level 8", "move_date": "2026-06-19", "claim_date": "01/07/2026", "balance_due": "25345.21", "designation": "AAO", "personal_no": "98347760", "td_rma_days": "3", "td_rma_rate": "281", "less_advance": "0", "td_favour_of": "Dhruv Bhardwaj", "td_food_days": "3", "td_food_rate": "1000", "td_rma_total": "843.00", "td_acct_payee": "Dhruv Bhardwaj", "td_food_total": "3000.00", "td_hotel_days": "3", "td_hotel_rate": "937.5", "journey_dist_1": "34.6 Km ", "journey_dist_2": "1270", "journey_dist_3": "17.5", "journey_dist_4": "17.5", "journey_dist_5": "1270", "journey_dist_6": "34.6", "journey_mode_1": "Taxi", "journey_mode_2": "Economy Air", "journey_mode_3": "Taxi", "journey_mode_4": "Auto", "journey_mode_5": "Economy Air", "journey_mode_6": "Taxi", "td_acct_amount": "", "td_hotel_total": "2812.50", "unit_formation": "ITSDC", "orders_for_move": "", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "21/06/26", "journey_arr_date_2": "21/06/26", "journey_arr_date_3": "21/06/26", "journey_arr_date_4": "23/06/26", "journey_arr_date_5": "23/06/26", "journey_arr_date_6": "24/06/26", "journey_arr_time_1": "03:44 PM ", "journey_arr_time_2": "20:00", "journey_arr_time_3": "22:06", "journey_arr_time_4": "23:44", "journey_arr_time_5": "23:45", "journey_arr_time_6": "01:31", "journey_dep_date_1": "21/06/26", "journey_dep_date_2": "21/06/26", "journey_dep_date_3": "21/06/26", "journey_dep_date_4": "23/06/26", "journey_dep_date_5": "23/06/26", "journey_dep_date_6": "24/06/26", "journey_dep_time_1": "02:39 PM", "journey_dep_time_2": "17:00", "journey_dep_time_3": "21:28", "journey_dep_time_4": "22:55", "journey_dep_time_5": "21:15", "journey_dep_time_6": "00:35", "journey_start_from": "Home", "journey_ticket_no_1": "", "journey_ticket_no_2": "", "journey_ticket_no_3": "", "journey_ticket_no_4": "", "journey_ticket_no_5": "", "journey_ticket_no_6": "", "journey_total_amt_1": "629.08", "journey_total_amt_2": "7843", "journey_total_amt_3": "376.43", "journey_total_amt_4": "450", "journey_total_amt_5": "8043", "journey_total_amt_6": "1348.2", "total_journey_claim": "18689.71", "undertaking_station": "Secunderabad", "total_amount_claimed": "25345.21", "journey_arr_station_1": "Hyderabad Airport", "journey_arr_station_2": "New Delhi Airport", "journey_arr_station_3": "Ladging Hotel, Shastri Nagar", "journey_arr_station_4": "New Delhi Airport", "journey_arr_station_5": "Hyderabad Airport", "journey_arr_station_6": "Home", "journey_dep_station_1": "Home", "journey_dep_station_2": "Hyderabad Airport", "journey_dep_station_3": "New Delhi Airport", "journey_dep_station_4": "Lodging Hotel, Shastri Nagar", "journey_dep_station_5": "New Delhi Airport", "journey_dep_station_6": "Hyderabad Airport"}	2026-07-01 18:16:35.012325	2026-07-01 18:27:56.714822	Temporary Duty Claim_Dhruv Bhardwaj_2026-07-01	2026-07-01		\N	\N	3	\N	\N
530	39	11	Approved	{"name": "K M SIVA SHANKAR", "rank": "ADDL CDA", "pm_r1": "", "pm_cda": "", "pm_mr2": "", "pm_r1b": "", "pm_r1c": "", "da_ao_1": "", "da_ao_2": "", "da_ao_3": "", "da_so_1": "", "da_so_2": "", "da_so_3": "", "dr_item": "", "dr_page": "", "pm_c3_p": "", "pm_mr2b": "", "pm_mr2c": "", "cda_name": "CDA Secunderabad", "pm_c3_rs": "", "pm_c3b_p": "", "pm_c3c_p": "", "pm_mc4_p": "", "pm_month": "", "pm_vr_no": "", "basic_pay": "123100", "grade_pay": "13", "pm_c3b_rs": "", "pm_c3c_rs": "", "pm_mc4_rs": "", "pm_mc4b_p": "", "pm_mc4c_p": "", "weight_kg": "", "amount_num": "14000", "corps_dept": "ITSDC Secunderabad", "da_payee_1": "", "da_payee_2": "", "da_payee_3": "", "pm_mc4b_rs": "", "pm_mc4c_rs": "", "pm_section": "", "da_passed_p": "", "pm_class_c3": "", "pm_class_r1": "", "pm_vr_class": "", "advance_type": "TA Advance", "amount_words": "Fourteen Thousand", "authority_no": "E office note", "bank_account": "", "da_passed_rs": "", "pm_class_c3b": "", "pm_class_c3c": "", "pm_class_r1b": "", "pm_class_r1c": "", "vehicle_type": "", "da_treasury_1": "", "da_treasury_2": "", "da_treasury_3": "", "advance_amount": "14000", "advance_period": "08/06/2026 to 12/06/2026", "authority_date": "2026-06-02", "family_details": "", "ltc_block_year": "", "signature_note": "", "transport_mode": "", "advance_purpose": "TA DA to CDA Chennai", "da_cheque_amt_1": "", "da_cheque_amt_2": "", "da_cheque_amt_3": "", "da_passed_words": "", "journey_details": "Secunderabad to Chennai", "ltc_destination": "", "travel_expenses": "Flight cost:- 10,000/-\\nOther cosr:- 10,000/-", "countersigned_by": "", "da_cheque_date_1": "", "da_cheque_date_2": "", "da_cheque_date_3": "", "issuing_authority": "CDA ITSDC", "vehicle_authority_ref": ""}	2026-06-02 17:01:16.216814	2026-06-02 17:01:16.216814	Advance of Pay/TA_K M SIVA SHANKAR_2026-06-02	2026-06-01		2026-06-02 17:01:16.216	2026-06-03 10:58:39.412369	1	529	\N
579	103	2	Pending	{"name": "Dhruv Bhardwaj", "authority": "CGDA Mech/IUT&S/985/Sys AuditDt.19/06/2026", "basic_pay": "50500 + Level 8", "move_date": "2026-06-19", "claim_date": "01/07/2026", "balance_due": "5345.21", "designation": "AAO", "personal_no": "98347760", "td_rma_days": "3", "td_rma_rate": "281", "less_advance": "20000", "td_favour_of": "Dhruv Bhardwaj", "td_food_days": "3", "td_food_rate": "1000", "td_rma_total": "843.00", "td_acct_payee": "Dhruv Bhardwaj", "td_food_total": "3000.00", "td_hotel_days": "3", "td_hotel_rate": "937.5", "journey_dist_1": "34.6 Km ", "journey_dist_2": "1270", "journey_dist_3": "17.5", "journey_dist_4": "17.5", "journey_dist_5": "1270", "journey_dist_6": "34.6", "journey_mode_1": "Taxi", "journey_mode_2": "Economy Air", "journey_mode_3": "Taxi", "journey_mode_4": "Auto", "journey_mode_5": "Economy Air", "journey_mode_6": "Taxi", "td_acct_amount": "", "td_hotel_total": "2812.50", "unit_formation": "ITSDC", "orders_for_move": "", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "21/06/26", "journey_arr_date_2": "21/06/26", "journey_arr_date_3": "21/06/26", "journey_arr_date_4": "23/06/26", "journey_arr_date_5": "23/06/26", "journey_arr_date_6": "24/06/26", "journey_arr_time_1": "03:44 PM ", "journey_arr_time_2": "20:00", "journey_arr_time_3": "22:06", "journey_arr_time_4": "23:44", "journey_arr_time_5": "23:45", "journey_arr_time_6": "01:31", "journey_dep_date_1": "21/06/26", "journey_dep_date_2": "21/06/26", "journey_dep_date_3": "21/06/26", "journey_dep_date_4": "23/06/26", "journey_dep_date_5": "23/06/26", "journey_dep_date_6": "24/06/26", "journey_dep_time_1": "02:39 PM", "journey_dep_time_2": "17:00", "journey_dep_time_3": "21:28", "journey_dep_time_4": "22:55", "journey_dep_time_5": "21:15", "journey_dep_time_6": "00:35", "journey_start_from": "Home", "journey_ticket_no_1": "", "journey_ticket_no_2": "", "journey_ticket_no_3": "", "journey_ticket_no_4": "", "journey_ticket_no_5": "", "journey_ticket_no_6": "", "journey_total_amt_1": "629.08", "journey_total_amt_2": "7843", "journey_total_amt_3": "376.43", "journey_total_amt_4": "450", "journey_total_amt_5": "8043", "journey_total_amt_6": "1348.2", "total_journey_claim": "18689.71", "undertaking_station": "Secunderabad", "total_amount_claimed": "25345.21", "journey_arr_station_1": "Hyderabad Airport", "journey_arr_station_2": "New Delhi Airport", "journey_arr_station_3": "Ladging Hotel, Shastri Nagar", "journey_arr_station_4": "New Delhi Airport", "journey_arr_station_5": "Hyderabad Airport", "journey_arr_station_6": "Home", "journey_dep_station_1": "Home", "journey_dep_station_2": "Hyderabad Airport", "journey_dep_station_3": "New Delhi Airport", "journey_dep_station_4": "Lodging Hotel, Shastri Nagar", "journey_dep_station_5": "New Delhi Airport", "journey_dep_station_6": "Hyderabad Airport"}	2026-07-01 18:28:24.179433	2026-07-01 18:28:24.179433	Hyderabad to Delhi	2026-07-01		2026-07-01 18:28:24.176	\N	1	\N	\N
580	16	7	Draft	{"vr_no": "", "during": "05/2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/", "bill_date": "2026-07-02", "cda_month": "", "signature": "", "exp_date_1": "2026-07-02", "payee_name": "", "cda_section": "100", "exp_account": "Sy.LTC claim", "incurred_by": "R.Raveendra Prasad", "amount_words": "Six Thousand Seven Hundred and Eighty", "exp_amount_1": "6780", "passed_words": "", "payee_amount": "", "total_amount": "6780.00", "exp_details_1": "Supplementary claim for resubmission of taxi charges under LTC claim", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "02072026", "payee_treasury": "", "name_designation": "R RAVEENDRA PRASAD, SAO", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-07-02 16:05:01.690777	2026-07-02 16:12:15.829183	Contingent Bill_R RAVEENDRA PRASAD_2026-07-02	2026-06-30		\N	\N	3	\N	contingent
529	39	11	Rejected	{"name": "K M SIVA SHANKAR", "rank": "ADDL CDA", "pm_r1": "", "pm_cda": "", "pm_mr2": "", "pm_r1b": "", "pm_r1c": "", "da_ao_1": "", "da_ao_2": "", "da_ao_3": "", "da_so_1": "", "da_so_2": "", "da_so_3": "", "dr_item": "", "dr_page": "", "pm_c3_p": "", "pm_mr2b": "", "pm_mr2c": "", "cda_name": "CDA Secunderabad", "pm_c3_rs": "", "pm_c3b_p": "", "pm_c3c_p": "", "pm_mc4_p": "", "pm_month": "", "pm_vr_no": "", "basic_pay": "123100", "grade_pay": "13", "pm_c3b_rs": "", "pm_c3c_rs": "", "pm_mc4_rs": "", "pm_mc4b_p": "", "pm_mc4c_p": "", "weight_kg": "", "amount_num": "14000", "corps_dept": "ITSDC Secunderabad", "da_payee_1": "", "da_payee_2": "", "da_payee_3": "", "pm_mc4b_rs": "", "pm_mc4c_rs": "", "pm_section": "", "cheque_name": "", "da_passed_p": "", "pm_class_c3": "", "pm_class_r1": "", "pm_vr_class": "", "advance_type": "TA Advance", "amount_words": "Fourteen Thousand", "authority_no": "E office note", "da_passed_rs": "", "pm_class_c3b": "", "pm_class_c3c": "", "pm_class_r1b": "", "pm_class_r1c": "", "vehicle_type": "", "cheque_favour": "other", "da_treasury_1": "", "da_treasury_2": "", "da_treasury_3": "", "advance_amount": "14000", "advance_period": "08/06/2026 to 12/06/2026", "authority_date": "2026-06-02", "family_details": "", "ltc_block_year": "", "signature_note": "", "transport_mode": "", "advance_purpose": "TA DA to CDA Chennai", "da_cheque_amt_1": "", "da_cheque_amt_2": "", "da_cheque_amt_3": "", "da_passed_words": "", "journey_details": "Secunderabad to Chennai", "ltc_destination": "", "travel_expenses": "Flight cost:- 10,000/-\\nOther cosr:- 10,000/-", "countersigned_by": "", "da_cheque_date_1": "", "da_cheque_date_2": "", "da_cheque_date_3": "", "issuing_authority": "CDA ITSDC", "vehicle_authority_ref": ""}	2026-06-02 16:53:21.650315	2026-06-02 16:53:21.650315	Advance of Pay/TA_K M SIVA SHANKAR_2026-06-02	2026-06-02		2026-06-02 16:53:21.648	2026-06-03 10:59:42.028116	1	\N	\N
510	7	2	Approved	{"name": "BINU S NAIR", "authority": "", "basic_pay": "101400 + Level 10", "move_date": "", "claim_date": "01/06/2026", "balance_due": "21654.00", "designation": "SAO", "personal_no": "98332709", "td_rma_days": "4", "td_rma_rate": "100", "less_advance": "30000", "td_favour_of": "BINU S NAIR", "td_food_days": "7", "td_food_rate": "1125", "td_rma_total": "400.00", "td_acct_payee": "BINU S NAIR", "td_food_total": "7875.00", "td_hotel_days": "6", "td_hotel_rate": "2689.5", "journey_dist_1": "45", "journey_dist_2": "", "journey_dist_3": "45", "journey_dist_4": "45", "journey_dist_5": "", "journey_dist_6": "45", "journey_mode_1": "Own Car", "journey_mode_2": "Air", "journey_mode_3": "Taxi", "journey_mode_4": "Taxi", "journey_mode_5": "Air", "journey_mode_6": "Own Car", "td_acct_amount": "", "td_hotel_total": "16137.00", "unit_formation": "ITSDC", "orders_for_move": "", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "24/05/26", "journey_arr_date_2": "24/05/26", "journey_arr_date_3": "24/05/26", "journey_arr_date_4": "30/05/26", "journey_arr_date_5": "30/05/26", "journey_arr_date_6": "30/05/26", "journey_arr_time_1": "11:30", "journey_arr_time_2": "20:20", "journey_arr_time_3": "21:45", "journey_arr_time_4": "07:15", "journey_arr_time_5": "13:40", "journey_arr_time_6": "15:30", "journey_dep_date_1": "24/05/26", "journey_dep_date_2": "24/05/26", "journey_dep_date_3": "24/05/26", "journey_dep_date_4": "30/05/26", "journey_dep_date_5": "30/05/26", "journey_dep_date_6": "30/05/26", "journey_dep_time_1": "10:00", "journey_dep_time_2": "13:55", "journey_dep_time_3": "20:35", "journey_dep_time_4": "06:00", "journey_dep_time_5": "08:45", "journey_dep_time_6": "14:00", "journey_start_from": "Secunderabad", "journey_ticket_no_1": "", "journey_ticket_no_2": "PNR # A3UVHY", "journey_ticket_no_3": "Vehicle provided by PAO DSC", "journey_ticket_no_4": "Vehicle provided by PAO DSC", "journey_ticket_no_5": "PNR # Q9JUYM", "journey_ticket_no_6": "", "journey_total_amt_1": "1350", "journey_total_amt_2": "13889", "journey_total_amt_3": "0", "journey_total_amt_4": "0", "journey_total_amt_5": "10653", "journey_total_amt_6": "1350", "total_journey_claim": "27242.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "51654.00", "journey_arr_station_1": "Hyderabad Air Port", "journey_arr_station_2": "Kannur Air Port", "journey_arr_station_3": "Hotel Harley Residency", "journey_arr_station_4": "Kannur Air Port", "journey_arr_station_5": "Hyderabad Air Port", "journey_arr_station_6": "Residence", "journey_dep_station_1": "Residence", "journey_dep_station_2": "Hyderabad Air Port", "journey_dep_station_3": "Kannur Air Port", "journey_dep_station_4": "Hotel Harley Residency", "journey_dep_station_5": "Kannur Air Port", "journey_dep_station_6": "Hyderabad Air Port"}	2026-06-01 17:12:16.571262	2026-06-03 11:16:10.105333	Temporary Duty Claim_BINU S NAIR_2026-06-01	2026-05-31		2026-06-03 11:16:10.102	2026-06-03 14:18:27.873393	2	\N	\N
533	5	11	Approved	{"name": "P AMARNATH REDDY", "rank": "AAO", "pm_r1": "", "pm_cda": "", "pm_mr2": "", "pm_r1b": "", "pm_r1c": "", "da_ao_1": "", "da_ao_2": "", "da_ao_3": "", "da_so_1": "", "da_so_2": "", "da_so_3": "", "dr_item": "", "dr_page": "", "pm_c3_p": "", "pm_mr2b": "", "pm_mr2c": "", "cda_name": "CDA, Secunderabad", "pm_c3_rs": "", "pm_c3b_p": "", "pm_c3c_p": "", "pm_mc4_p": "", "pm_month": "", "pm_vr_no": "", "basic_pay": "50500", "grade_pay": "8", "pm_c3b_rs": "", "pm_c3c_rs": "", "pm_mc4_rs": "", "pm_mc4b_p": "", "pm_mc4c_p": "", "weight_kg": "", "amount_num": "10000", "corps_dept": "IT&SDC, Secunderabad", "da_payee_1": "", "da_payee_2": "", "da_payee_3": "", "pm_mc4b_rs": "", "pm_mc4c_rs": "", "pm_section": "", "da_passed_p": "", "pm_class_c3": "", "pm_class_r1": "", "pm_vr_class": "", "advance_type": "TA Advance", "amount_words": "Ten Thousand", "authority_no": "252", "bank_account": "111801510956", "da_passed_rs": "", "pm_class_c3b": "", "pm_class_c3c": "", "pm_class_r1b": "", "pm_class_r1c": "", "vehicle_type": "", "da_treasury_1": "", "da_treasury_2": "", "da_treasury_3": "", "advance_amount": "10000", "advance_period": "07/06/2026-12/06/2026", "authority_date": "", "family_details": "A P HANUMANTHA REDDY (FATHER, 57 yrs), A P LALITHA (MOTHER, 50 yrs), P SAHITHI REDDY (WIFE, 29 yrs)", "ltc_block_year": "", "signature_note": "", "transport_mode": "Air", "advance_purpose": "Temporary Duty", "da_cheque_amt_1": "", "da_cheque_amt_2": "", "da_cheque_amt_3": "", "da_passed_words": "", "journey_details": "Hyderabad-Bengaluru", "ltc_destination": "", "travel_expenses": "Air ticket price of onward journey- Rs.4823\\nAir Ticket price of return journey- Rs.4587", "countersigned_by": "", "da_cheque_date_1": "", "da_cheque_date_2": "", "da_cheque_date_3": "", "issuing_authority": "", "vehicle_authority_ref": ""}	2026-06-03 11:55:15.119308	2026-06-03 11:55:15.119308	Advance of Pay/TA_P AMARNATH REDDY_2026-06-03	2026-06-03		2026-06-03 11:55:15.116	2026-06-03 14:18:17.396144	1	\N	\N
535	1	7	Pending	{"vr_no": "", "during": "May 2025 to Mar 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/Misc", "bill_date": "2026-06-05", "cda_month": "", "signature": "", "exp_date_1": "2026-06-05", "payee_name": "", "cda_section": "100", "exp_account": "Office News Paper Bills", "incurred_by": "ITSDC", "amount_words": "Five Thousand Five Hundred", "exp_amount_1": "5500", "passed_words": "", "payee_amount": "", "total_amount": "5500.00", "exp_details_1": "Office News Paper Bills From May 2025 to March 2026", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "05.06.2026", "payee_treasury": "", "name_designation": "ADMIN SAO", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-06-05 11:28:01.59022	2026-06-05 11:28:01.59022	Office News Paper Bill	2026-06-04		2026-06-05 11:28:01.587	\N	1	\N	contingent
538	29	3	Draft	{"email": "naveenkammara.dad@nic.in", "opd_amount": "700", "cghs_ben_id": "6552918", "full_address": "FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98345826", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9989152052", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "05/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "on", "mrc_chk_implant": "", "card_holder_name": "KAMMARA NAVEEN KUMAR", "declaration_date": "05/06/2026", "hospital_details": "KIMS SECUNDERABAD", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Semi-Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "", "treatment_type_opd": "on", "generated_affidavit": "I, KAMMARA NAVEEN KUMAR, resident of FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "6552918", "treatment_type_test": "on", "declaration_page_date": "05/06/2026", "declaration_signature": "", "generated_declaration": "I KAMMARA NAVEEN KUMAR, resident of FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "KAMMARA NAVEEN KUMAR, AAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "1650"}	2026-06-05 15:20:03.743921	2026-06-05 15:20:03.743921	KIMS_CARDIO	2026-06-05		\N	\N	1	\N	CARDIO
536	1	7	Pending	{"vr_no": "", "during": "Mar, Apr & May 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/Misc", "bill_date": "2026-06-05", "cda_month": "", "signature": "", "exp_date_1": "2026-06-05", "payee_name": "", "cda_section": "100", "exp_account": "Miscellaneous Office Expenses", "incurred_by": "ITSDC", "amount_words": "Forty-Eight  Thousand Seven Hundred and Seventy-Seven", "exp_amount_1": "48777", "passed_words": "", "payee_amount": "", "total_amount": "48777.00", "exp_details_1": "Miscellaneous Office Expenses", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "05.06.2026", "payee_treasury": "", "name_designation": "ADMIN SAO", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-06-05 11:46:44.300641	2026-06-05 14:49:12.429328	Misc Expenses	2026-05-29		2026-06-05 14:49:12.427	\N	8	\N	contingent
537	29	3	Draft	{"email": "naveenkammara.dad@nic.in", "opd_amount": "700", "cghs_ben_id": "6552918", "full_address": "FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98345826", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9989152052", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "05/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "KAMMARA NAVEEN KUMAR", "declaration_date": "05/06/2026", "hospital_details": "KIMS SECUNDERABAD", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Semi-Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "", "treatment_type_opd": "on", "generated_affidavit": "I, KAMMARA NAVEEN KUMAR, resident of FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "6552918", "treatment_type_test": "on", "declaration_page_date": "05/06/2026", "declaration_signature": "", "generated_declaration": "I KAMMARA NAVEEN KUMAR, resident of FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "KAMMARA NAVEEN KUMAR, AAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "1650"}	2026-06-05 15:02:37.901748	2026-06-05 15:02:37.901748	Medical Reimbursement_Self_KAMMARA NAVEEN KUMAR_2026-06-05	2026-06-05		\N	\N	1	\N	\N
539	29	3	Approved	{"email": "naveenkammara.dad@nic.in", "opd_amount": "700", "cghs_ben_id": "6552918", "full_address": "FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98345826", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9989152052", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "05/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "on", "mrc_chk_implant": "", "card_holder_name": "KAMMARA NAVEEN KUMAR", "declaration_date": "05/06/2026", "hospital_details": "KIMS SECUNDERABAD", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Semi-Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "", "treatment_type_opd": "on", "generated_affidavit": "I, KAMMARA NAVEEN KUMAR, resident of FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "6552918", "treatment_type_test": "on", "declaration_page_date": "05/06/2026", "declaration_signature": "", "generated_declaration": "I KAMMARA NAVEEN KUMAR, resident of FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "KAMMARA NAVEEN KUMAR, AAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "1650"}	2026-06-05 15:21:15.530991	2026-06-05 15:21:15.530991	KIMS_CARDIO	2026-06-05		2026-06-05 15:21:15.53	2026-06-11 14:41:09.155469	1	\N	CARDIO
499	103	10	Approved	{"name": "Dhruv Bhardwaj", "new_hq": "", "old_hq": "ITSDC Secunderabad", "authority": "AN/IX/9010/IT Policy/2026 Dt. 05/02/2026", "basic_pay": "50500 + Level 8", "move_date": "09/03/2026", "claim_date": "13/05/2026", "balance_due": "42184.78", "designation": "AAO", "personal_no": "98347760", "family_age_1": "", "family_age_2": "5", "family_age_3": "1 month", "family_age_4": "32", "less_advance": "47153", "pt_ctg_total": "0", "td_favour_of": "Dhruv Bhardwaj", "family_name_1": "Self", "family_name_2": "Dhriti Bhardwaj", "family_name_3": "Dharvi Bhardwaj", "family_name_4": "Jyoti Sharma", "td_acct_payee": "Dhruv Bhardwaj", "journey_dist_1": "38 ", "journey_dist_2": "565", "journey_dist_3": "10", "journey_dist_4": "10", "journey_dist_5": "550", "journey_dist_6": "47.4", "journey_mode_1": "Taxi", "journey_mode_2": "Flight", "journey_mode_3": "Auto", "journey_mode_4": "Auto ", "journey_mode_5": "Flight", "journey_mode_6": "Taxi", "pt_ctg_percent": "", "pt_ctg_receipt": "", "pt_vehicle_qty": "1", "td_acct_amount": "", "orders_for_move": "17", "pt_effects_total": "42479.34", "pt_vehicle_total": "17187", "td_acct_treasury": "", "pt_effects_weight": "6000", "td_passed_payment": "", "journey_arr_date_1": "27/04/26", "journey_arr_date_2": "28/04/26", "journey_arr_date_3": "28/04/26", "journey_arr_date_4": "29/04/26", "journey_arr_date_5": "29/04/26", "journey_arr_date_6": "29/04/26", "journey_arr_time_1": "23:16", "journey_arr_time_2": "02:20", "journey_arr_time_3": "03:00", "journey_arr_time_4": "03:20", "journey_arr_time_5": "06:15", "journey_arr_time_6": "08:21", "journey_dep_date_1": "27/04/26", "journey_dep_date_2": "28/04/26", "journey_dep_date_3": "28/04/26", "journey_dep_date_4": "29/04/26", "journey_dep_date_5": "29/04/26", "journey_dep_date_6": "29/04/26", "journey_dep_time_1": "22:12", "journey_dep_time_2": "01:10", "journey_dep_time_3": "02:30", "journey_dep_time_4": "03:00", "journey_dep_time_5": "04:45", "journey_dep_time_6": "06:43", "journey_start_from": "Home, Tirumalgiri 27/04/2026 at 10:12 PM", "pt_effects_receipt": "     KA2627PBS-20492", "pt_vehicle_receipt": "Through Driver", "journey_ticket_no_1": "", "journey_ticket_no_2": "", "journey_ticket_no_3": "MH47AD6541", "journey_ticket_no_4": "MH12QR7794", "journey_ticket_no_5": "H9P2MA", "journey_ticket_no_6": "Ticket Attached", "journey_total_amt_1": "605", "journey_total_amt_2": "4325", "journey_total_amt_3": "500", "journey_total_amt_4": "650", "journey_total_amt_5": "22002", "journey_total_amt_6": "1589.44", "total_journey_claim": "29671.44", "undertaking_station": "Secunderabad", "total_amount_claimed": "89337.78", "total_reloc_expenses": "59666.34", "family_relationship_1": "Self", "family_relationship_2": "Daughter", "family_relationship_3": "Daughter", "family_relationship_4": "Spouse", "journey_arr_station_1": "Hyderabad Airport", "journey_arr_station_2": "Pune Airport", "journey_arr_station_3": "E-203 Ganga Kingston", "journey_arr_station_4": "Pune Airport", "journey_arr_station_5": "Hyderabad Airport", "journey_arr_station_6": "Guest House", "journey_dep_station_1": "Home, Tirumalgiri", "journey_dep_station_2": "Hyderabad Airport", "journey_dep_station_3": "Pune Airport", "journey_dep_station_4": "E-203 Ganga Kingston", "journey_dep_station_5": "Pune Airport", "journey_dep_station_6": "Hyderabad Airport"}	2026-05-26 17:46:36.348828	2026-06-05 15:53:36.43056	Permanent Transfer_Dhruv Bhardwaj_2026-05-26	2026-05-21		2026-06-05 15:53:36.43	2026-06-15 12:23:42.008595	12	\N	\N
542	16	3	Approved	{"email": "rraghupatruni.dad@gov.in", "opd_amount": "6345", "cghs_ben_id": "8735954", "full_address": "Flat No A-307, Mythri's the town, Shaili Gardens, JawaharNagar, yapral", "is_emergency": "No", "mrc_chk_cghs": "", "patient_name": "Self", "relationship": "Self", "employee_code": "98336522", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "8074896042", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "15/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "R RAVEENDRA PRASAD", "declaration_date": "15/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "", "generated_affidavit": "I, R RAVEENDRA PRASAD, resident of Flat No A-307, Mythri's the town, Shaili Gardens, JawaharNagar, yapral, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "8735954", "treatment_type_test": "on", "declaration_page_date": "15/06/2026", "declaration_signature": "", "generated_declaration": "I R RAVEENDRA PRASAD, resident of Flat No A-307, Mythri's the town, Shaili Gardens, JawaharNagar, yapral hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "R RAVEENDRA PRASAD, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "0"}	2026-06-15 09:57:42.781806	2026-06-15 09:57:42.781806	Medical Reimbursement_Self_R RAVEENDRA PRASAD_2026-06-15	2026-06-15		2026-06-15 09:57:42.781	2026-06-15 16:37:29.690535	1	\N	\N
541	16	5	Approved	{"name": "R RAVEENDRA PRASAD", "leave_to": "29/05/2026", "basic_pay": "101400 + Level 10", "leave_from": "25/05/2026", "balance_due": "6562.00", "designation": "SAO", "personal_no": "98336522", "sig_date_p1": "08/06/26", "block_year_1": "2022", "block_year_2": "2025", "family_age_1": "", "family_age_2": "14", "family_age_3": "41", "less_advance": "80000", "claimant_name": "R RAVEENDRA PRASAD", "family_name_1": "Self", "family_name_2": "R ADITYA", "family_name_3": "R VIJAYA PRIYANKA", "authority_date": "02/04/2026", "journey_dist_1": "", "journey_dist_2": "", "journey_dist_3": "", "journey_dist_4": "", "journey_dist_5": "30", "journey_dist_6": "", "journey_mode_1": "AIR", "journey_mode_2": "BY TAXI", "journey_mode_3": "BY TAXI", "journey_mode_4": "BY TAXI", "journey_mode_5": "BY TGSRTC", "journey_mode_6": "BY TAXI", "signature_date": "08/06/2026", "unit_formation": "ITSDC", "claimant_name_p2": "R RAVEENDRA PRASAD", "declared_station": "GANGTOK", "declaration_place": "Secunderabad", "authority_order_no": "", "journey_arr_date_1": "24/05/26", "journey_arr_date_2": "24/05/26", "journey_arr_date_3": "29/05/26", "journey_arr_date_4": "29/05/26", "journey_arr_date_5": "29/05/26", "journey_arr_date_6": "29/05/26", "journey_arr_time_1": "", "journey_arr_time_2": "", "journey_arr_time_3": "", "journey_arr_time_4": "", "journey_arr_time_5": "", "journey_arr_time_6": "", "journey_dep_date_1": "24/05/26", "journey_dep_date_2": "24/05/26", "journey_dep_date_3": "29/05/26", "journey_dep_date_4": "29/05/26", "journey_dep_date_5": "29/05/26", "journey_dep_date_6": "29/05/26-", "journey_dep_time_1": "", "journey_dep_time_2": "", "journey_dep_time_3": "", "journey_dep_time_4": "", "journey_dep_time_5": "", "journey_dep_time_6": "", "student_concession": "availed", "journey_ticket_no_1": "", "journey_ticket_no_2": "1130*3", "journey_ticket_no_3": "1130*3", "journey_ticket_no_4": "", "journey_ticket_no_5": "400 * 3", "journey_ticket_no_6": "NOT CLAIMED", "journey_total_amt_1": "39519", "journey_total_amt_2": "3390", "journey_total_amt_3": "3390", "journey_total_amt_4": "39063", "journey_total_amt_5": "1200", "journey_total_amt_6": "0", "total_journey_claim": "86562.00", "claim_preferred_date": "08/06/2026", "claimant_designation": "SAO", "claimant_personal_no": "98336522", "declaration_place_p2": "Secunderabad", "total_amount_claimed": "86562.00", "family_relationship_1": "Self", "family_relationship_2": "Son", "family_relationship_3": "Wife", "journey_arr_station_1": "BAGDOGRA", "journey_arr_station_2": "GANGTOK", "journey_arr_station_3": "BAGDOGRA", "journey_arr_station_4": "HYDERABAD AIRPORT", "journey_arr_station_5": "JBS BUSSTATION", "journey_arr_station_6": "HOME", "journey_dep_station_1": "HYDERABAD", "journey_dep_station_2": "BAGDOGRA", "journey_dep_station_3": "GANGTOK", "journey_dep_station_4": "BAGDOGRA", "journey_dep_station_5": "HYDERABAD AIRPORT ", "journey_dep_station_6": "JBS BUSSTATION", "claimant_designation_p2": "SAO", "claimant_personal_no_p2": "98336522"}	2026-06-08 17:11:35.927795	2026-06-09 12:51:26.36621	LTC Final Claim_R RAVEENDRA PRASAD_2026-06-08	2026-06-09		2026-06-09 12:51:26.363	2026-06-15 12:23:28.415165	3	\N	\N
548	37	5	Approved	{"name": "AMBER MURTUZA ANSARI", "leave_to": "12/06/2026", "basic_pay": "50500 + Level 8", "leave_from": "26/05/2026", "balance_due": "8799.00", "designation": "AAO", "personal_no": "98348067", "sig_date_p1": "15/06/26", "block_year_1": "2026", "block_year_2": "2027", "family_age_1": "36", "family_age_2": "32", "less_advance": "", "claimant_name": "AMBER MURTUZA ANSARI", "family_name_1": "Self", "family_name_2": "SHAMAILA TAHSIN", "authority_date": "21/05/2026", "journey_dist_1": "1576", "journey_dist_2": "1566", "journey_mode_1": "TRAIN\\n/THIRD\\nAC (3A)\\n\\n\\n\\n\\n\\n\\n\\n\\n", "journey_mode_2": "TRAIN\\n/SECOND\\nAC (2A)\\n", "signature_date": "15/06/2026", "unit_formation": "ITSDC", "claimant_name_p2": "AMBER MURTUZA ANSARI", "declared_station": "KOLKATA", "declaration_place": "Secunderabad", "authority_order_no": "IT&SDC/Estt/Vol-VIII", "journey_arr_date_1": "27/05/26", "journey_arr_date_2": "14/06/26", "journey_arr_time_1": "06:50", "journey_arr_time_2": "17:20", "journey_dep_date_1": "26/05/26", "journey_dep_date_2": "13/06/26", "journey_dep_time_1": "03:55", "journey_dep_time_2": "11:15", "student_concession": "availed", "journey_ticket_no_1": "PNR-\\n4548811260\\n(TRAIN\\nNO:12774/SC\\nSHM AC SF\\nEX)\\n\\n\\n\\n", "journey_ticket_no_2": "PNR-\\n6602146979\\n(TRAIN\\nNO: 18045/\\nEAST\\nCOAST\\nEXP)\\n\\n\\n", "journey_total_amt_1": "3694.50\\n\\n\\n\\n", "journey_total_amt_2": "5104.50\\n\\n\\n\\n", "total_journey_claim": "8799.00", "claim_preferred_date": "15/06/2026", "claimant_designation": "AAO", "claimant_personal_no": "98348067", "declaration_place_p2": "Secunderabad", "total_amount_claimed": "8799.00", "family_relationship_1": "Self", "family_relationship_2": "WIFE", "journey_arr_station_1": "SHALIMAR-SHM(HOWRAH/KOLKATA)\\n\\n\\n", "journey_arr_station_2": "CHARLAPALLI\\n(CHZ) \\n", "journey_dep_station_1": "SECUNDERABAD\\n-SC(SECUNDERABAD)", "journey_dep_station_2": "SHALIMAR-SHM(HOWRAH/KOLKATA)\\n\\n\\n", "claimant_designation_p2": "AAO", "claimant_personal_no_p2": "98348067"}	2026-06-15 16:55:25.191679	2026-06-16 10:49:14.425868	LTC Final Claim_AMBER MURTUZA ANSARI_2026-06-15	2026-06-13		2026-06-16 10:49:14.425	2026-06-22 15:07:54.27797	3	\N	\N
545	1	7	Pending	{"vr_no": "", "during": "May 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/CHT", "bill_date": "2026-06-15", "cda_month": "", "signature": "", "exp_date_1": "2026-06-15", "payee_name": "", "cda_section": "100", "exp_account": "Cab Hiring services", "incurred_by": "ITSDC", "amount_words": "Fifty-Five  Thousand Nine Hundred", "exp_amount_1": "55900", "passed_words": "", "payee_amount": "", "total_amount": "55900.00", "exp_details_1": "Cab hiring services for the month of May 2026", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "15.06.2026", "payee_treasury": "", "name_designation": "SAO-Admin", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-06-15 12:39:09.439739	2026-06-15 12:39:09.439739	CHT Contingent Bill	2026-06-15		2026-06-15 12:39:09.436	\N	1	\N	contingent
546	1	7	Pending	{"vr_no": "", "during": "May 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "GEMC-511687767035389", "bill_date": "2026-06-15", "cda_month": "", "signature": "", "exp_date_1": "2026-06-15", "payee_name": "", "cda_section": "100", "exp_account": "Hiring of IT Manpower", "incurred_by": "ITSDC", "amount_words": "Six Lakh Sixty-Four  Thousand Three Hundred and Forty-One", "exp_amount_1": "664341", "passed_words": "", "payee_amount": "", "total_amount": "664341.00", "exp_details_1": "Hiring of IT Manpower for May 2026", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "24/01/2026", "payee_treasury": "", "name_designation": "SAO-Admin", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-06-15 12:44:30.148337	2026-06-15 12:44:30.148337	Hiring of IT Manpower Contingent Bills	2026-06-15		2026-06-15 12:44:30.146	\N	1	\N	contingent
547	1	7	Pending	{"vr_no": "", "during": "June 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/Personal Telephone", "bill_date": "2026-06-15", "cda_month": "", "signature": "", "exp_date_1": "2026-06-15", "payee_name": "", "cda_section": "100", "exp_account": "Personal Telephone Bills", "incurred_by": "ITSDC", "amount_words": "One Thousand Three Hundred and Twenty-Five", "exp_amount_1": "1325", "passed_words": "", "payee_amount": "", "total_amount": "1325.00", "exp_details_1": "Personal Telephone Bill In r/o Shri KM SIva Shankar, IDAS, Addl.cda", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "15.06.2026", "payee_treasury": "", "name_designation": "SAO-Admin", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-06-15 12:45:07.55664	2026-06-15 12:45:07.55664	Personal Telephone Bills	2026-06-13		2026-06-15 12:45:07.554	\N	1	\N	contingent
553	37	3	Rejected	{"email": "amberansari.dad@hub.nic.in", "opd_amount": "0", "cghs_ben_id": "7086176", "full_address": "c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA", "is_emergency": "Yes", "mrc_chk_cghs": "on", "patient_name": "ZAHRA AMBER", "relationship": "DAUGHTER", "employee_code": "98348067", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9804225042", "mrc_chk_bills": "", "mrc_chk_stent": "", "affidavit_date": "15/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "AMBER MURTUZA ANSARI", "declaration_date": "15/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Semi-Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "on", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, AMBER MURTUZA ANSARI, resident of c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "", "treatment_type_test": "", "declaration_page_date": "15/06/2026", "declaration_signature": "", "generated_declaration": "I AMBER MURTUZA ANSARI, resident of c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "AMBER MURTUZA ANSARI, AAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "0"}	2026-06-15 17:23:06.889383	2026-06-15 17:23:06.889383	try	2026-06-15		2026-06-15 17:23:06.889	2026-06-17 11:20:15.183092	1	\N	\N
543	24	3	Approved	{"email": "shaiknaseerahmed.dad@hub.nic.in", "opd_amount": "2700", "cghs_ben_id": "4723700", "full_address": "c 46 DAD quarters Secundertabad 500015", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "SHAIK MUSHEERA KOKAB", "relationship": "DAUGHTER", "employee_code": "98345652", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9014148589", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "15/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "on", "mrc_chk_implant": "", "card_holder_name": "SHAIK NASEER AHMED", "declaration_date": "15/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Semi-Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, SHAIK NASEER AHMED, resident of c 46 DAD quarters Secundertabad 500015, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "", "treatment_type_test": "on", "declaration_page_date": "15/06/2026", "declaration_signature": "", "generated_declaration": "I SHAIK NASEER AHMED, resident of c 46 DAD quarters Secundertabad 500015 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "SHAIK NASEER AHMED, SR AUDITOR", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "26008"}	2026-06-15 10:29:06.551856	2026-06-15 10:29:06.551856	Medical Reimbursement_Dependent_SHAIK MUSHEERA KOKAB_2026-06-15	2026-06-15		2026-06-15 10:29:06.551	2026-06-15 17:24:45.109144	1	\N	\N
550	37	3	Approved	{"email": "amberansari.dad@hub.nic.in", "opd_amount": "350", "cghs_ben_id": "7086176", "full_address": "c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "SHAKILA KHATOON", "relationship": "Mother", "employee_code": "98348067", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9804225042", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "15/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "AMBER MURTUZA ANSARI", "declaration_date": "15/06/2026", "hospital_details": "1. B.P PODDAR HOSPITAL & MEDICAL RESEARCH LTD. 71/1, HUMANYUN KABIR SARANI, NEW ALIPORE, KOLKATA - 700053.   2. SURAKSHA CLINIC & DIAGNOSTICS ", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Semi-Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, AMBER MURTUZA ANSARI, resident of c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "7086182", "treatment_type_test": "on", "declaration_page_date": "15/06/2026", "declaration_signature": "", "generated_declaration": "I AMBER MURTUZA ANSARI, resident of c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "AMBER MURTUZA ANSARI, AAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "1265"}	2026-06-15 17:15:35.819983	2026-06-15 17:15:35.819983	Medical Reimbursement_Dependent_SHAKILA KHATOON_2026-06-15	2026-06-15		2026-06-15 17:15:35.819	2026-06-22 12:43:34.533491	1	\N	\N
554	6	2	Draft	{"name": "SUBHENDU DE", "paymode": "neft", "authority": "ITSDC/Estt./ConfidentialLr Note #01-05", "basic_pay": "82600 + Level 10", "move_date": "11/06/2026", "claim_date": "16/06/2026", "balance_due": "34198.00", "designation": "SAO", "personal_no": "98320323", "td_rma_days": "", "td_rma_rate": "", "less_advance": "0", "td_favour_of": "SUBHENDU DE", "td_food_days": "", "td_food_rate": "", "td_rma_total": "", "td_acct_payee": "SUBHENDU DE", "td_food_total": "", "td_hotel_days": "", "td_hotel_rate": "", "journey_dist_1": "48", "journey_dist_2": "", "journey_dist_3": "16", "journey_dist_4": "17.9", "journey_dist_5": "", "journey_dist_6": "494", "journey_mode_1": "TAXI", "journey_mode_2": "AIR", "journey_mode_3": "TAXI", "journey_mode_4": "TAXI", "journey_mode_5": "AIR", "journey_mode_6": "TAXI", "td_acct_amount": "", "td_hotel_total": "", "unit_formation": "ITSDC", "orders_for_move": "Admin Order No 39", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "12/06/26", "journey_arr_date_2": "121/06/2026", "journey_arr_date_3": "12/06/26", "journey_arr_date_4": "12/06/26", "journey_arr_date_5": "12/06/26", "journey_arr_date_6": "13/06/26", "journey_arr_time_1": "04:30", "journey_arr_time_2": "08:05", "journey_arr_time_3": "08:57", "journey_arr_time_4": "16:29", "journey_arr_time_5": "22:00", "journey_arr_time_6": "00:11", "journey_dep_date_1": "12/06/26", "journey_dep_date_2": "12/06/26", "journey_dep_date_3": "12/06/26", "journey_dep_date_4": "12/06/26", "journey_dep_date_5": "12/06/26", "journey_dep_date_6": "12/06/26", "journey_dep_time_1": "03:24", "journey_dep_time_2": "05:55", "journey_dep_time_3": "08:21", "journey_dep_time_4": "15:55", "journey_dep_time_5": "19:45", "journey_dep_time_6": "22:30", "journey_start_from": "Secunderabad", "journey_ticket_no_1": "OLA CAB", "journey_ticket_no_2": "Ticket with Boarding Pass attached", "journey_ticket_no_3": "OLA CAB", "journey_ticket_no_4": "OLA CAB", "journey_ticket_no_5": "Ticket with Boarding Pass attached", "journey_ticket_no_6": "OLA CAB", "journey_total_amt_1": "941", "journey_total_amt_2": "9954", "journey_total_amt_3": "516", "journey_total_amt_4": "452", "journey_total_amt_5": "21057", "journey_total_amt_6": "1278", "total_journey_claim": "34198.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "34198.00", "journey_arr_station_1": "RGI Airport Hyderabad", "journey_arr_station_2": "NSC Airport Kolkata", "journey_arr_station_3": "NBCC Square Kolkata", "journey_arr_station_4": "NSC Airport Kolkata", "journey_arr_station_5": "RGI Airport Hyderabad", "journey_arr_station_6": "Residence", "journey_dep_station_1": "Residence", "journey_dep_station_2": "RGI Airport Hyderabad", "journey_dep_station_3": "NSC Airport Kolkata", "journey_dep_station_4": "NBCC Square", "journey_dep_station_5": "NSC Airport Kolkata", "journey_dep_station_6": "RGI Airport Hyderabad"}	2026-06-16 12:30:15.044935	2026-06-16 12:30:15.044935	Temporary Duty Claim_SUBHENDU DE_2026-06-16	2026-06-16		\N	\N	1	\N	\N
556	1	7	Pending	{"vr_no": "", "during": "May 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/Telephone", "bill_date": "2026-06-16", "cda_month": "", "signature": "", "exp_date_1": "2026-06-16", "payee_name": "", "cda_section": "100", "exp_account": "BSNL Telephone Bills", "incurred_by": "ITSDC", "amount_words": "Five Thousand and Sixty-Eight", "exp_amount_1": "5068", "passed_words": "", "payee_amount": "", "total_amount": "5068.00", "exp_details_1": "BSNL Telephone Bills for the month of May 2026", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "16.06.2026", "payee_treasury": "", "name_designation": "SAO-Admin", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-06-16 17:00:10.691795	2026-06-16 17:00:10.691795	BSNL Telephone Bills	2026-06-16		2026-06-16 17:00:10.689	\N	1	\N	contingent
551	37	3	Approved	{"email": "amberansari.dad@hub.nic.in", "opd_amount": "350", "cghs_ben_id": "7086176", "full_address": "c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "ALI MURTUZA ANSARI", "relationship": "Father", "employee_code": "98348067", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9804225042", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "15/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "AMBER MURTUZA ANSARI", "declaration_date": "15/06/2026", "hospital_details": "SHRADHA HEALTH CARE PVT LTD, 15, S.N. ROY ROAD KOLKATA - 700038", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Semi-Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, AMBER MURTUZA ANSARI, resident of c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "7086180", "treatment_type_test": "", "declaration_page_date": "15/06/2026", "declaration_signature": "", "generated_declaration": "I AMBER MURTUZA ANSARI, resident of c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "AMBER MURTUZA ANSARI, AAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "0"}	2026-06-15 17:19:46.959753	2026-06-15 17:24:58.158274	Medical Reimbursement_Dependent_ALI MURTUZA ANSARI_2026-06-15	2026-06-13		2026-06-15 17:24:58.158	2026-06-22 12:43:28.314977	3	\N	\N
555	6	2	Approved	{"name": "SUBHENDU DE", "paymode": "neft", "authority": "ITSDC/Estt./ConfidentialLr Note #01-05", "basic_pay": "82600 + Level 10", "move_date": "11/06/2026", "claim_date": "16/06/2026", "balance_due": "34198.00", "designation": "SAO", "personal_no": "98320323", "td_rma_days": "", "td_rma_rate": "", "less_advance": "0", "td_favour_of": "SUBHENDU DE", "td_food_days": "", "td_food_rate": "", "td_rma_total": "", "td_acct_payee": "SUBHENDU DE", "td_food_total": "", "td_hotel_days": "", "td_hotel_rate": "", "journey_dist_1": "48", "journey_dist_2": "", "journey_dist_3": "16", "journey_dist_4": "17.9", "journey_dist_5": "", "journey_dist_6": "494", "journey_mode_1": "TAXI", "journey_mode_2": "AIR", "journey_mode_3": "TAXI", "journey_mode_4": "TAXI", "journey_mode_5": "AIR", "journey_mode_6": "TAXI", "td_acct_amount": "", "td_hotel_total": "", "unit_formation": "ITSDC", "orders_for_move": "Admin Order No 39", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "12/06/26", "journey_arr_date_2": "121/06/2026", "journey_arr_date_3": "12/06/26", "journey_arr_date_4": "12/06/26", "journey_arr_date_5": "12/06/26", "journey_arr_date_6": "13/06/26", "journey_arr_time_1": "04:30", "journey_arr_time_2": "08:05", "journey_arr_time_3": "08:57", "journey_arr_time_4": "16:29", "journey_arr_time_5": "22:00", "journey_arr_time_6": "00:11", "journey_dep_date_1": "12/06/26", "journey_dep_date_2": "12/06/26", "journey_dep_date_3": "12/06/26", "journey_dep_date_4": "12/06/26", "journey_dep_date_5": "12/06/26", "journey_dep_date_6": "12/06/26", "journey_dep_time_1": "03:24", "journey_dep_time_2": "05:55", "journey_dep_time_3": "08:21", "journey_dep_time_4": "15:55", "journey_dep_time_5": "19:45", "journey_dep_time_6": "22:30", "journey_start_from": "Secunderabad", "journey_ticket_no_1": "OLA CAB", "journey_ticket_no_2": "Ticket with Boarding Pass attached", "journey_ticket_no_3": "OLA CAB", "journey_ticket_no_4": "OLA CAB", "journey_ticket_no_5": "Ticket with Boarding Pass attached", "journey_ticket_no_6": "OLA CAB", "journey_total_amt_1": "941", "journey_total_amt_2": "9954", "journey_total_amt_3": "516", "journey_total_amt_4": "452", "journey_total_amt_5": "21057", "journey_total_amt_6": "1278", "total_journey_claim": "34198.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "34198.00", "journey_arr_station_1": "RGI Airport Hyderabad", "journey_arr_station_2": "NSC Airport Kolkata", "journey_arr_station_3": "NBCC Square Kolkata", "journey_arr_station_4": "NSC Airport Kolkata", "journey_arr_station_5": "RGI Airport Hyderabad", "journey_arr_station_6": "Residence", "journey_dep_station_1": "Residence", "journey_dep_station_2": "RGI Airport Hyderabad", "journey_dep_station_3": "NSC Airport Kolkata", "journey_dep_station_4": "NBCC Square", "journey_dep_station_5": "NSC Airport Kolkata", "journey_dep_station_6": "RGI Airport Hyderabad"}	2026-06-16 12:34:54.493588	2026-06-16 12:34:54.493588	Temporary Duty Claim_SUBHENDU DE_2026-06-16	2026-06-16		2026-06-16 12:34:54.491	2026-06-22 12:46:51.026433	1	\N	\N
561	39	11	Draft	{"name": "K M SIVA SHANKAR", "rank": "ADDL CDA", "pm_r1": "", "pm_cda": "", "pm_mr2": "", "pm_r1b": "", "pm_r1c": "", "da_ao_1": "", "da_ao_2": "", "da_ao_3": "", "da_so_1": "", "da_so_2": "", "da_so_3": "", "dr_item": "", "dr_page": "", "pm_c3_p": "", "pm_mr2b": "", "pm_mr2c": "", "cda_name": "", "pm_c3_rs": "", "pm_c3b_p": "", "pm_c3c_p": "", "pm_mc4_p": "", "pm_month": "", "pm_vr_no": "", "basic_pay": "123100", "grade_pay": "13", "pm_c3b_rs": "", "pm_c3c_rs": "", "pm_mc4_rs": "", "pm_mc4b_p": "", "pm_mc4c_p": "", "weight_kg": "", "amount_num": "35000", "corps_dept": "", "da_payee_1": "", "da_payee_2": "", "da_payee_3": "", "pm_mc4b_rs": "", "pm_mc4c_rs": "", "pm_section": "", "da_passed_p": "", "pm_class_c3": "", "pm_class_r1": "", "pm_vr_class": "", "advance_type": "TA Advance", "amount_words": "Thirty-Five  Thousand", "authority_no": "42", "bank_account": "", "da_passed_rs": "", "pm_class_c3b": "", "pm_class_c3c": "", "pm_class_r1b": "", "pm_class_r1c": "", "vehicle_type": "", "da_treasury_1": "", "da_treasury_2": "", "da_treasury_3": "", "advance_amount": "", "advance_period": "", "authority_date": "2026-06-22", "family_details": "", "ltc_block_year": "", "signature_note": "", "transport_mode": "", "advance_purpose": "", "da_cheque_amt_1": "", "da_cheque_amt_2": "", "da_cheque_amt_3": "", "da_passed_words": "", "journey_details": "", "ltc_destination": "", "travel_expenses": "Tickets: 30000\\nDA: 12500\\nStay: 2000\\nTotal: 445000/-", "countersigned_by": "", "da_cheque_date_1": "", "da_cheque_date_2": "", "da_cheque_date_3": "", "issuing_authority": "CDA (IT&SDC) Secunderabad", "vehicle_authority_ref": ""}	2026-06-22 12:05:53.989149	2026-06-22 12:05:53.989149	Advance of Pay/TA_K M SIVA SHANKAR_2026-06-22	2026-06-22		\N	\N	1	\N	\N
560	103	11	Approved	{"name": "Dhruv Bhardwaj", "rank": "AAO", "pm_r1": "", "pm_cda": "", "pm_mr2": "", "pm_r1b": "", "pm_r1c": "", "da_ao_1": "", "da_ao_2": "", "da_ao_3": "", "da_so_1": "", "da_so_2": "", "da_so_3": "", "dr_item": "", "dr_page": "", "pm_c3_p": "", "pm_mr2b": "", "pm_mr2c": "", "cda_name": "ITSDC", "pm_c3_rs": "", "pm_c3b_p": "", "pm_c3c_p": "", "pm_mc4_p": "", "pm_month": "", "pm_vr_no": "", "basic_pay": "50500", "grade_pay": "8", "pm_c3b_rs": "", "pm_c3c_rs": "", "pm_mc4_rs": "", "pm_mc4b_p": "", "pm_mc4c_p": "", "weight_kg": "", "amount_num": "20000", "corps_dept": "", "da_payee_1": "", "da_payee_2": "", "da_payee_3": "", "pm_mc4b_rs": "", "pm_mc4c_rs": "", "pm_section": "", "da_passed_p": "", "pm_class_c3": "", "pm_class_r1": "", "pm_vr_class": "", "advance_type": "", "amount_words": "Twenty Thousand", "authority_no": "Admin order No. 41", "bank_account": "", "da_passed_rs": "", "pm_class_c3b": "", "pm_class_c3c": "", "pm_class_r1b": "", "pm_class_r1c": "", "vehicle_type": "", "da_treasury_1": "", "da_treasury_2": "", "da_treasury_3": "", "advance_amount": "", "advance_period": "", "authority_date": "2026-06-19", "family_details": "", "ltc_block_year": "", "signature_note": "", "transport_mode": "", "advance_purpose": "Temporary Duty to New Delhi", "da_cheque_amt_1": "", "da_cheque_amt_2": "", "da_cheque_amt_3": "", "da_passed_words": "", "journey_details": "", "ltc_destination": "", "travel_expenses": "Flight Tickets: 14000\\nFood: 3000\\nStay: 3000\\n", "countersigned_by": "", "da_cheque_date_1": "", "da_cheque_date_2": "", "da_cheque_date_3": "", "issuing_authority": "Office of the CDA (IT&SADC)", "vehicle_authority_ref": ""}	2026-06-20 16:01:38.503319	2026-06-20 16:01:38.503319	Advance of Pay/TA_Dhruv Bhardwaj_2026-06-20	2026-06-20		2026-06-20 16:01:38.501	2026-06-22 12:28:33.444586	1	\N	\N
562	39	11	Approved	{"name": "K M SIVA SHANKAR", "rank": "ADDL CDA", "pm_r1": "", "pm_cda": "", "pm_mr2": "", "pm_r1b": "", "pm_r1c": "", "da_ao_1": "", "da_ao_2": "", "da_ao_3": "", "da_so_1": "", "da_so_2": "", "da_so_3": "", "dr_item": "", "dr_page": "", "pm_c3_p": "", "pm_mr2b": "", "pm_mr2c": "", "cda_name": "", "pm_c3_rs": "", "pm_c3b_p": "", "pm_c3c_p": "", "pm_mc4_p": "", "pm_month": "", "pm_vr_no": "", "basic_pay": "123100", "grade_pay": "13", "pm_c3b_rs": "", "pm_c3c_rs": "", "pm_mc4_rs": "", "pm_mc4b_p": "", "pm_mc4c_p": "", "weight_kg": "", "amount_num": "35000", "corps_dept": "", "da_payee_1": "", "da_payee_2": "", "da_payee_3": "", "pm_mc4b_rs": "", "pm_mc4c_rs": "", "pm_section": "", "da_passed_p": "", "pm_class_c3": "", "pm_class_r1": "", "pm_vr_class": "", "advance_type": "TA Advance", "amount_words": "Thirty-Five  Thousand", "authority_no": "42", "bank_account": "", "da_passed_rs": "", "pm_class_c3b": "", "pm_class_c3c": "", "pm_class_r1b": "", "pm_class_r1c": "", "vehicle_type": "", "da_treasury_1": "", "da_treasury_2": "", "da_treasury_3": "", "advance_amount": "", "advance_period": "", "authority_date": "2026-06-22", "family_details": "", "ltc_block_year": "", "signature_note": "", "transport_mode": "", "advance_purpose": "", "da_cheque_amt_1": "", "da_cheque_amt_2": "", "da_cheque_amt_3": "", "da_passed_words": "", "journey_details": "", "ltc_destination": "", "travel_expenses": "Tickets: 30000\\nDA: 12500\\nStay: 2000\\nTotal: 445000/-", "countersigned_by": "", "da_cheque_date_1": "", "da_cheque_date_2": "", "da_cheque_date_3": "", "issuing_authority": "CDA (IT&SDC) Secunderabad", "vehicle_authority_ref": ""}	2026-06-22 12:05:56.680865	2026-06-22 12:05:56.680865	Advance of Pay/TA_K M SIVA SHANKAR_2026-06-22	2026-06-22		2026-06-22 12:05:56.68	2026-06-22 12:28:27.292831	1	\N	\N
559	12	3	Approved	{"email": "srinivaschavali.dad@hub.nic.in", "opd_amount": "700", "cghs_ben_id": "2288441", "full_address": "H No. 5-96/44, SAI CHANDRA COLONY, DAMMAIGUDA, HYDERABAD-500083", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "C.VENKATA LAKSHMI", "relationship": "Wife", "employee_code": "98325986", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "+919492863613", "mrc_chk_bills": "", "mrc_chk_stent": "", "affidavit_date": "18/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "C S CHAKRAVARTHY", "declaration_date": "18/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, C S CHAKRAVARTHY, resident of H No. 5-96/44, SAI CHANDRA COLONY, DAMMAIGUDA, HYDERABAD-500083, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "2588443", "treatment_type_test": "", "declaration_page_date": "18/06/2026", "declaration_signature": "", "generated_declaration": "I C S CHAKRAVARTHY, resident of H No. 5-96/44, SAI CHANDRA COLONY, DAMMAIGUDA, HYDERABAD-500083 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "C S CHAKRAVARTHY, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "0"}	2026-06-18 15:49:36.1398	2026-06-18 15:49:36.1398	Medical Reimbursement_Dependent_C.VENKATA LAKSHMI_2026-06-18	2026-06-18		2026-06-18 15:49:36.139	2026-06-22 12:43:15.872162	1	\N	\N
558	12	3	Approved	{"email": "srinivaschavali.dad@hub.nic.in", "opd_amount": "700", "cghs_ben_id": "2288441", "full_address": "H No. 5-96/44, SAI CHANDRA COLONY, DAMMAIGUDA, HYDERABAD-500083", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98325986", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "+919492863613", "mrc_chk_bills": "", "mrc_chk_stent": "", "affidavit_date": "18/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "C S CHAKRAVARTHY", "declaration_date": "18/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, C S CHAKRAVARTHY, resident of H No. 5-96/44, SAI CHANDRA COLONY, DAMMAIGUDA, HYDERABAD-500083, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "2288441", "treatment_type_test": "", "declaration_page_date": "18/06/2026", "declaration_signature": "", "generated_declaration": "I C S CHAKRAVARTHY, resident of H No. 5-96/44, SAI CHANDRA COLONY, DAMMAIGUDA, HYDERABAD-500083 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "C S CHAKRAVARTHY, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "0"}	2026-06-18 15:46:55.91901	2026-06-18 15:46:55.91901	Medical Reimbursement_Self_C S CHAKRAVARTHY_2026-06-18	2026-06-18		2026-06-18 15:46:55.918	2026-06-22 12:43:20.066008	1	\N	\N
557	16	3	Approved	{"email": "rraghupatruni.dad@gov.in", "opd_amount": "1400", "cghs_ben_id": "8735954", "full_address": "Flat No A-307, Mythri's the town, Shaili Gardens, JawaharNagar, yapral", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "R VIJAYA PRIYANKA", "relationship": "Wife", "employee_code": "98336522", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "8074896042", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "17/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "R RAVEENDRA PRASAD", "declaration_date": "17/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "on", "generated_affidavit": "I, R RAVEENDRA PRASAD, resident of Flat No A-307, Mythri's the town, Shaili Gardens, JawaharNagar, yapral, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "8735956", "treatment_type_test": "on", "declaration_page_date": "17/06/2026", "declaration_signature": "", "generated_declaration": "I R RAVEENDRA PRASAD, resident of Flat No A-307, Mythri's the town, Shaili Gardens, JawaharNagar, yapral hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "R RAVEENDRA PRASAD, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "6420"}	2026-06-17 10:57:47.513204	2026-06-17 10:57:47.513204	Medical Reimbursement_Dependent_R VIJAYA PRIYANKA_2026-06-17	2026-06-17		2026-06-17 10:57:47.512	2026-06-22 12:43:24.309784	1	\N	\N
563	1	7	Pending	{"vr_no": "", "during": "June 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/Misc", "bill_date": "2026-06-22", "cda_month": "", "signature": "", "exp_date_1": "2026-06-22", "payee_name": "", "cda_section": "100", "exp_account": "Miscellaneous Office Expenses", "incurred_by": "ITSDC", "amount_words": "Forty-Three  Thousand Seven Hundred and Fifty", "exp_amount_1": "43750", "passed_words": "", "payee_amount": "", "total_amount": "43750.00", "exp_details_1": "Procuremnt of Yoga Mats", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "20.06.2026", "payee_treasury": "", "name_designation": "ADMIN SAO", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-06-22 13:01:18.30834	2026-06-22 13:05:38.776591	Misc Expenses	2026-05-27		2026-06-22 13:05:38.774	\N	2	536	contingent
564	13	5	Draft	{"name": "SANTOSH CHANDRAN", "leave_to": "19062026", "basic_pay": "104000 + Level 10", "leave_from": "08062026", "balance_due": "21796.00", "designation": "SAO", "personal_no": "98333999", "sig_date_p1": "22/06/2026", "block_year_1": "2025", "block_year_2": "2026", "family_age_1": "53", "family_age_2": "45", "family_age_3": "22", "family_age_4": "20", "less_advance": "45000", "claimant_name": "SANTOSH CHANDRAN", "family_name_1": "SANTOSH CHANDRAN", "family_name_2": "SREEJA SANTOSH", "family_name_3": "ANUSHREE SANTOSH", "family_name_4": "ASHWIN SANTOSH CHANDRAN", "authority_date": "", "journey_dist_1": "50", "journey_dist_2": "1450", "journey_dist_3": "19", "journey_dist_4": "110", "journey_dist_5": "120", "journey_dist_6": "12", "journey_dist_7": "1560", "journey_dist_8": "50", "journey_mode_1": "Taxi", "journey_mode_2": "Air", "journey_mode_3": "Taxi", "journey_mode_4": "Train", "journey_mode_5": "Train", "journey_mode_6": "Taxi", "journey_mode_7": "Air", "journey_mode_8": "Taxi", "signature_date": "22/06/2026", "unit_formation": "ITSDC", "claimant_name_p2": "SANTOSH CHANDRAN", "declared_station": "HARIPAD, ALLEPPEY, KERALA", "declaration_place": "Secunderabad", "authority_order_no": "", "journey_arr_date_1": "07062026", "journey_arr_date_2": "07062026", "journey_arr_date_3": "07062026", "journey_arr_date_4": "07062026", "journey_arr_date_5": "20062026", "journey_arr_date_6": "20062026", "journey_arr_date_7": "20062026", "journey_arr_date_8": "20062026", "journey_arr_time_1": "0700", "journey_arr_time_2": "1130", "journey_arr_time_3": "1245", "journey_arr_time_4": "1815", "journey_arr_time_5": "1330", "journey_arr_time_6": "1500", "journey_arr_time_7": "1930", "journey_arr_time_8": "2200", "journey_dep_date_1": "07062026", "journey_dep_date_2": "07062026", "journey_dep_date_3": "07062026", "journey_dep_date_4": "07062026", "journey_dep_date_5": "20062026", "journey_dep_date_6": "20062026", "journey_dep_date_7": "20062026", "journey_dep_date_8": "20062026", "journey_dep_time_1": "0600", "journey_dep_time_2": "0910", "journey_dep_time_3": "1200", "journey_dep_time_4": "1530", "journey_dep_time_5": "1030", "journey_dep_time_6": "1400", "journey_dep_time_7": "1755", "journey_dep_time_8": "2000", "student_concession": "not_availed", "journey_ticket_no_1": "", "journey_ticket_no_2": "Ticket and Boarding Pass Attached", "journey_ticket_no_3": "", "journey_ticket_no_4": "Ticket Attached", "journey_ticket_no_5": "Ticket Attached", "journey_ticket_no_6": "", "journey_ticket_no_7": "Ticket and Boarding Pass Attached", "journey_ticket_no_8": "", "journey_total_amt_1": "1000", "journey_total_amt_2": "29036", "journey_total_amt_3": "950", "journey_total_amt_4": "2117", "journey_total_amt_5": "2297", "journey_total_amt_6": "800", "journey_total_amt_7": "29396", "journey_total_amt_8": "1200", "total_journey_claim": "66796.00", "claim_preferred_date": "22062026", "claimant_designation": "SAO", "claimant_personal_no": "98333999", "declaration_place_p2": "Secunderabad", "total_amount_claimed": "66796.00", "family_relationship_1": "Self", "family_relationship_2": "WIFE", "family_relationship_3": "DAUGHTER", "family_relationship_4": "SON", "journey_arr_station_1": "Hyderabad Airport", "journey_arr_station_2": "Kochi Airport", "journey_arr_station_3": "Alwaye Railway Station", "journey_arr_station_4": "Haripad Railway Station", "journey_arr_station_5": "Trivandrum Railway Station", "journey_arr_station_6": "Trivandrum Airport", "journey_arr_station_7": "Hyderabad Airport", "journey_arr_station_8": "DAD Quarters, Secunderabad", "journey_dep_station_1": "DAD Quaters, Secunderabad", "journey_dep_station_2": "Hyderabad Airport", "journey_dep_station_3": "Kochi Airport", "journey_dep_station_4": "Alwaye Airport", "journey_dep_station_5": "Kayankumlum Railway Station", "journey_dep_station_6": "Trivandrum Railway Station", "journey_dep_station_7": "Trivandrum Airport", "journey_dep_station_8": "Hyderabad Airport", "claimant_designation_p2": "SAO", "claimant_personal_no_p2": "98333999"}	2026-06-22 15:26:39.420142	2026-06-22 15:27:16.386896	LTC Final Claim_SANTOSH CHANDRAN_2026-06-22	2026-06-22		\N	\N	2	\N	\N
565	13	5	Approved	{"name": "SANTOSH CHANDRAN", "leave_to": "19062026", "basic_pay": "104000 + Level 10", "leave_from": "08062026", "balance_due": "21796.00", "designation": "SAO", "personal_no": "98333999", "sig_date_p1": "22/06/2026", "block_year_1": "2025", "block_year_2": "2026", "family_age_1": "53", "family_age_2": "45", "family_age_3": "22", "family_age_4": "20", "less_advance": "45000", "claimant_name": "SANTOSH CHANDRAN", "family_name_1": "SANTOSH CHANDRAN", "family_name_2": "SREEJA SANTOSH", "family_name_3": "ANUSHREE SANTOSH", "family_name_4": "ASHWIN SANTOSH CHANDRAN", "authority_date": "", "journey_dist_1": "50", "journey_dist_2": "1450", "journey_dist_3": "19", "journey_dist_4": "110", "journey_dist_5": "120", "journey_dist_6": "12", "journey_dist_7": "1560", "journey_dist_8": "50", "journey_mode_1": "Taxi", "journey_mode_2": "Air", "journey_mode_3": "Taxi", "journey_mode_4": "Train", "journey_mode_5": "Train", "journey_mode_6": "Taxi", "journey_mode_7": "Air", "journey_mode_8": "Taxi", "signature_date": "22/06/2026", "unit_formation": "ITSDC", "claimant_name_p2": "SANTOSH CHANDRAN", "declared_station": "HARIPAD, ALLEPPEY, KERALA", "declaration_place": "Secunderabad", "authority_order_no": "", "journey_arr_date_1": "07062026", "journey_arr_date_2": "07062026", "journey_arr_date_3": "07062026", "journey_arr_date_4": "07062026", "journey_arr_date_5": "20062026", "journey_arr_date_6": "20062026", "journey_arr_date_7": "20062026", "journey_arr_date_8": "20062026", "journey_arr_time_1": "0700", "journey_arr_time_2": "1130", "journey_arr_time_3": "1245", "journey_arr_time_4": "1815", "journey_arr_time_5": "1330", "journey_arr_time_6": "1500", "journey_arr_time_7": "1930", "journey_arr_time_8": "2200", "journey_dep_date_1": "07062026", "journey_dep_date_2": "07062026", "journey_dep_date_3": "07062026", "journey_dep_date_4": "07062026", "journey_dep_date_5": "20062026", "journey_dep_date_6": "20062026", "journey_dep_date_7": "20062026", "journey_dep_date_8": "20062026", "journey_dep_time_1": "0600", "journey_dep_time_2": "0910", "journey_dep_time_3": "1200", "journey_dep_time_4": "1530", "journey_dep_time_5": "1030", "journey_dep_time_6": "1400", "journey_dep_time_7": "1755", "journey_dep_time_8": "2000", "student_concession": "not_availed", "journey_ticket_no_1": "", "journey_ticket_no_2": "Ticket and Boarding Pass Attached", "journey_ticket_no_3": "", "journey_ticket_no_4": "Ticket Attached", "journey_ticket_no_5": "Ticket Attached", "journey_ticket_no_6": "", "journey_ticket_no_7": "Ticket and Boarding Pass Attached", "journey_ticket_no_8": "", "journey_total_amt_1": "1000", "journey_total_amt_2": "29036", "journey_total_amt_3": "950", "journey_total_amt_4": "2117", "journey_total_amt_5": "2297", "journey_total_amt_6": "800", "journey_total_amt_7": "29396", "journey_total_amt_8": "1200", "total_journey_claim": "66796.00", "claim_preferred_date": "22062026", "claimant_designation": "SAO", "claimant_personal_no": "98333999", "declaration_place_p2": "Secunderabad", "total_amount_claimed": "66796.00", "family_relationship_1": "Self", "family_relationship_2": "WIFE", "family_relationship_3": "DAUGHTER", "family_relationship_4": "SON", "journey_arr_station_1": "Hyderabad Airport", "journey_arr_station_2": "Kochi Airport", "journey_arr_station_3": "Alwaye Railway Station", "journey_arr_station_4": "Haripad Railway Station", "journey_arr_station_5": "Trivandrum Railway Station", "journey_arr_station_6": "Trivandrum Airport", "journey_arr_station_7": "Hyderabad Airport", "journey_arr_station_8": "DAD Quarters, Secunderabad", "journey_dep_station_1": "DAD Quaters, Secunderabad", "journey_dep_station_2": "Hyderabad Airport", "journey_dep_station_3": "Kochi Airport", "journey_dep_station_4": "Alwaye Airport", "journey_dep_station_5": "Kayankumlum Railway Station", "journey_dep_station_6": "Trivandrum Railway Station", "journey_dep_station_7": "Trivandrum Airport", "journey_dep_station_8": "Hyderabad Airport", "claimant_designation_p2": "SAO", "claimant_personal_no_p2": "98333999"}	2026-06-22 15:27:33.377849	2026-06-22 15:27:33.377849	LTC Final Claim_SANTOSH CHANDRAN_2026-06-22	2026-06-22		2026-06-22 15:27:33.375	2026-07-01 17:30:16.781462	1	\N	\N
566	104	3	Approved	{"email": "mrsrinath.dad@gov.in", "opd_amount": "350", "cghs_ben_id": "8748394", "full_address": "Rudramma DAD transit facility, Kalasiguda, Secunderabad, Telangana 500003", "is_emergency": "Yes", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "23IDTSRI", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "08838137235", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "24/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "Srinath T, IDAS", "declaration_date": "24/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "on", "mrc_chk_permission": "", "treatment_type_opd": "on", "generated_affidavit": "I, Srinath T, IDAS, resident of Rudramma DAD transit facility, Kalasiguda, Secunderabad, Telangana 500003, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "", "treatment_type_test": "on", "declaration_page_date": "24/06/2026", "declaration_signature": "", "generated_declaration": "I Srinath T, IDAS, resident of Rudramma DAD transit facility, Kalasiguda, Secunderabad, Telangana 500003 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "Srinath T, IDAS, ACDA", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "2160"}	2026-06-24 11:53:02.769174	2026-06-24 11:53:02.769174	Medical Reimbursement_Self_Srinath T, IDAS_2026-06-24	2026-06-24		2026-06-24 11:53:02.768	2026-07-01 17:38:13.013533	1	\N	\N
567	104	10	Approved	{"name": "Srinath T, IDAS", "new_hq": "IT&SDC, SECUNDERABAD", "old_hq": "NADFM, PUNE", "authority": "", "basic_pay": "57800 + Level 10", "move_date": "11/6/2026", "claim_date": "24/06/2026", "balance_due": "49690.00", "designation": "ACDA", "personal_no": "23IDTSRI", "family_age_1": "", "less_advance": "0", "pt_ctg_total": "46240", "td_favour_of": "Srinath T, IDAS", "family_name_1": "Self", "td_acct_payee": "Srinath T, IDAS", "journey_dist_1": "572", "journey_mode_1": "2ND AC", "pt_ctg_percent": "80", "pt_ctg_receipt": "", "pt_vehicle_qty": "", "td_acct_amount": "", "orders_for_move": "1294", "pt_effects_total": "3450", "pt_vehicle_total": "", "td_acct_treasury": "", "pt_effects_weight": "75", "td_passed_payment": "", "journey_arr_date_1": "18/06/26", "journey_arr_time_1": "", "journey_dep_date_1": "12/06/26", "journey_dep_time_1": "16.20", "journey_start_from": "PUNE", "pt_effects_receipt": "1070", "pt_vehicle_receipt": "", "journey_ticket_no_1": "0", "journey_total_amt_1": "0", "total_journey_claim": "", "undertaking_station": "Secunderabad", "total_amount_claimed": "49690.00", "total_reloc_expenses": "49690.00", "family_relationship_1": "Self", "journey_arr_station_1": "SECUNDERABAD", "journey_dep_station_1": "PUNE"}	2026-06-24 12:04:47.359853	2026-06-24 12:04:47.359853	Permanent Transfer_Srinath T, IDAS_2026-06-24	2026-06-24		2026-06-24 12:04:47.358	2026-07-14 15:23:12.257974	1	\N	\N
569	19	3	Draft	{"email": "tvanaja.dad@gov.in", "opd_amount": "700", "cghs_ben_id": "1744722", "full_address": "Villa No:48, Oorjita Grand Vie - 2, Gundlapochampally, Hyd - 14", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98336642", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9441300769", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "24/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "on", "mrc_chk_implant": "", "card_holder_name": "TANGELLA VANAJA", "declaration_date": "24/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "", "treatment_type_opd": "on", "generated_affidavit": "I, TANGELLA VANAJA, resident of Villa No:48, Oorjita Grand Vie - 2, Gundlapochampally, Hyd - 14, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "1744722", "treatment_type_test": "on", "declaration_page_date": "24/06/2026", "declaration_signature": "", "generated_declaration": "I TANGELLA VANAJA, resident of Villa No:48, Oorjita Grand Vie - 2, Gundlapochampally, Hyd - 14 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "TANGELLA VANAJA, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "16035"}	2026-06-24 17:07:28.480523	2026-06-24 17:07:28.480523	Medical Reimbursement_Self_TANGELLA VANAJA_2026-06-24	2026-06-24		\N	\N	1	\N	\N
572	15	3	Draft	{"email": "vnagaprasad.dad@gov.in", "opd_amount": "0", "cghs_ben_id": "3256102", "full_address": "", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "V. SREEDEVI", "relationship": "Wife", "employee_code": "98335515", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9618951807", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "30/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "V NAGA PRASAD", "declaration_date": "30/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "", "generated_affidavit": "I, V NAGA PRASAD, resident of , have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "3256111", "treatment_type_test": "on", "declaration_page_date": "30/06/2026", "declaration_signature": "", "generated_declaration": "I V NAGA PRASAD, resident of  hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "V NAGA PRASAD, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "4180"}	2026-06-30 11:25:55.173473	2026-06-30 11:25:55.173473	Medical Reimbursement_Dependent_V. SREEDEVI_2026-06-30	2026-06-30		\N	\N	1	\N	\N
570	19	3	Approved	{"email": "tvanaja.dad@gov.in", "opd_amount": "700", "cghs_ben_id": "1744722", "full_address": "Villa No:48, Oorjita Grand Vie - 2, Gundlapochampally, Hyd - 14", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98336642", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9441300769", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "24/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "on", "mrc_chk_implant": "", "card_holder_name": "TANGELLA VANAJA", "declaration_date": "24/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "", "treatment_type_opd": "on", "generated_affidavit": "I, TANGELLA VANAJA, resident of Villa No:48, Oorjita Grand Vie - 2, Gundlapochampally, Hyd - 14, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "1744722", "treatment_type_test": "on", "declaration_page_date": "24/06/2026", "declaration_signature": "", "generated_declaration": "I TANGELLA VANAJA, resident of Villa No:48, Oorjita Grand Vie - 2, Gundlapochampally, Hyd - 14 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "TANGELLA VANAJA, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "16035"}	2026-06-24 17:07:30.846723	2026-06-24 17:07:30.846723	Medical Reimbursement_Self_TANGELLA VANAJA_2026-06-24	2026-06-24		2026-06-24 17:07:30.846	2026-07-01 17:38:05.911718	1	\N	\N
577	1	7	Pending	{"vr_no": "", "during": "July 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Estt/Vol-VIII", "bill_date": "2026-07-01", "cda_month": "", "signature": "", "exp_date_1": "2026-07-01", "payee_name": "", "cda_section": "100", "exp_account": "GPF Final Withdrawal", "incurred_by": "ITSDC", "amount_words": "Five Lakh Thirty-Two  Thousand", "exp_amount_1": "532000", "passed_words": "", "payee_amount": "", "total_amount": "532000.00", "exp_details_1": "GPF Final Withdrawal in r/o CS Chakravarthy, SAO", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "01.07.2026", "payee_treasury": "", "name_designation": "CS Chakravarthy, SAO", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-07-01 17:17:38.190003	2026-07-01 17:17:38.190003	GPF Final WIthdrawal	2026-07-01		2026-07-01 17:17:38.187	\N	1	\N	contingent
568	24	5	Approved	{"name": "SHAIK NASEER AHMED", "leave_to": "22/05/2026", "basic_pay": "46200 + Level 6", "leave_from": "18/05/2026", "balance_due": "47435.00", "designation": "SR AUDITOR", "personal_no": "98345652", "sig_date_p1": "19/06/2026", "block_year_1": "2022", "block_year_2": "2025", "family_age_1": "37", "family_age_2": "33", "family_age_3": "13", "family_age_4": "11", "family_age_5": "9", "less_advance": "70000", "claimant_name": "SHAIK NASEER AHMED", "family_name_1": "Self", "family_name_2": "shaik tanveer", "family_name_3": "SHAIK TAHIREEN", "family_name_4": "SHAIK MUSHEERA KOKAB", "family_name_5": "SHAIKSHANAWAZ AHMED", "authority_date": "20/04/2026", "journey_dist_1": "", "journey_dist_2": "", "journey_dist_3": "", "journey_dist_4": "", "journey_dist_5": "", "journey_mode_1": "AIR/FLIGHT", "journey_mode_2": "WATER/FERRY", "journey_mode_3": "WATER/FERRY", "journey_mode_4": "WATER/FERRY", "journey_mode_5": "AIR/FLIGHT", "signature_date": "19/06/2026", "unit_formation": "ITSDC", "claimant_name_p2": "SHAIK NASEER AHMED", "declared_station": "ANDAMAN , PORT BLAIR and HAVELOCK", "declaration_place": "Secunderabad", "authority_order_no": "LEAVE-536159993273", "journey_arr_date_1": "16/05/26", "journey_arr_date_2": "17/05/26", "journey_arr_date_3": "19/05/26", "journey_arr_date_4": "19/05/26", "journey_arr_date_5": "21/05/26", "journey_arr_time_1": "09:00", "journey_arr_time_2": "08:45", "journey_arr_time_3": "07:00", "journey_arr_time_4": "19:00", "journey_arr_time_5": "12:05", "journey_dep_date_1": "16/05/26", "journey_dep_date_2": "17/05/26", "journey_dep_date_3": "19/05/26", "journey_dep_date_4": "19/05/26", "journey_dep_date_5": "21/05/26", "journey_dep_time_1": "06:15", "journey_dep_time_2": "06:15", "journey_dep_time_3": "05:30", "journey_dep_time_4": "16:30", "journey_dep_time_5": "09:40", "student_concession": "not_availed", "journey_ticket_no_1": "PNR: Z4WMJL Bill enclosed", "journey_ticket_no_2": "PNR: 3141700000 Bill Enclosed", "journey_ticket_no_3": "PNR: 3159700001 Bill Enclosed", "journey_ticket_no_4": "PNR: 3158900001 Bill Enclosed", "journey_ticket_no_5": "PNR:I5KT2C", "journey_total_amt_1": "42655", "journey_total_amt_2": "3400", "journey_total_amt_3": "3400", "journey_total_amt_4": "3400", "journey_total_amt_5": "64580", "total_journey_claim": "117435.00", "claim_preferred_date": "19/06/2026", "claimant_designation": "SR AUDITOR", "claimant_personal_no": "98345652", "declaration_place_p2": "Secunderabad", "total_amount_claimed": "117435.00", "family_relationship_1": "Self", "family_relationship_2": "WIFE", "family_relationship_3": "DAUGHTER", "family_relationship_4": "Daughter", "family_relationship_5": "SON", "journey_arr_station_1": "PORT BLAIR AIRPORT", "journey_arr_station_2": "SWARAJ DWEEP", "journey_arr_station_3": "SHAHEED DWEEP", "journey_arr_station_4": "SRI VIJAYAPURAM", "journey_arr_station_5": "HYDERABAD AIRPORT", "journey_dep_station_1": "HYDERABAD AIRPORT", "journey_dep_station_2": "SRI VIJAYAPURAM", "journey_dep_station_3": "SWARAJ DWEEP", "journey_dep_station_4": "SHAHEED DWEEP", "journey_dep_station_5": "PORT BLAIR AIRPORT", "claimant_designation_p2": "SR AUDITOR", "claimant_personal_no_p2": "98345652"}	2026-06-24 15:24:57.724313	2026-06-24 15:24:57.724313	LTC Final Claim_SHAIK NASEER AHMED_2026-06-24	2026-06-24		2026-06-24 15:24:57.721	2026-07-01 17:30:04.734512	1	\N	\N
575	7	3	Approved	{"email": "binusnair.dad@hub.nic.in", "opd_amount": "1775", "cghs_ben_id": "7029832", "full_address": "TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "RENU K.S", "relationship": "Wife", "employee_code": "98332709", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9447322538", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "30/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "BINU S NAIR", "declaration_date": "30/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "", "treatment_type_opd": "on", "generated_affidavit": "I, BINU S NAIR, resident of TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "7029834", "treatment_type_test": "", "declaration_page_date": "30/06/2026", "declaration_signature": "", "generated_declaration": "I BINU S NAIR, resident of TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "BINU S NAIR, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "0"}	2026-06-30 15:37:55.650349	2026-06-30 15:37:55.650349	Medical Reimbursement_Dependent_RENU K.S_2026-06-30	2026-06-30		2026-06-30 15:37:55.65	2026-07-01 17:37:50.818576	1	\N	\N
574	7	3	Approved	{"email": "binusnair.dad@hub.nic.in", "opd_amount": "0", "cghs_ben_id": "7029832", "full_address": "TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "THANIYA B NAIR", "relationship": "Daughter", "employee_code": "98332709", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9447322538", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "30/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "BINU S NAIR", "declaration_date": "30/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "", "treatment_type_opd": "", "generated_affidavit": "I, BINU S NAIR, resident of TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "7029838", "treatment_type_test": "on", "declaration_page_date": "30/06/2026", "declaration_signature": "", "generated_declaration": "I BINU S NAIR, resident of TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "BINU S NAIR, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "3490"}	2026-06-30 15:33:38.041459	2026-06-30 15:33:38.041459	Medical Reimbursement_Dependent_THANIYA B NAIR_2026-06-30	2026-06-30		2026-06-30 15:33:38.041	2026-07-01 17:37:55.691579	1	\N	\N
573	15	3	Approved	{"email": "vnagaprasad.dad@gov.in", "opd_amount": "0", "cghs_ben_id": "3256102", "full_address": "", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "V. SREEDEVI", "relationship": "Wife", "employee_code": "98335515", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9618951807", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "30/06/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "V NAGA PRASAD", "declaration_date": "30/06/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "", "generated_affidavit": "I, V NAGA PRASAD, resident of , have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "3256111", "treatment_type_test": "on", "declaration_page_date": "30/06/2026", "declaration_signature": "", "generated_declaration": "I V NAGA PRASAD, resident of  hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "V NAGA PRASAD, SAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "4180"}	2026-06-30 11:27:25.404517	2026-06-30 11:27:25.404517	Medical Reimbursement_Dependent_V. SREEDEVI_2026-06-30	2026-06-30		2026-06-30 11:27:25.404	2026-07-01 17:38:01.295097	1	\N	\N
581	39	2	Draft	{"name": "K M SIVA SHANKAR", "paymode": "neft", "authority": "", "basic_pay": "123100 + Level 13", "move_date": "", "claim_date": "03/07/2026", "balance_due": "1216.00", "designation": "ADDL CDA", "personal_no": "111111", "td_rma_days": "", "td_rma_rate": "", "less_advance": "35000", "td_favour_of": "K M SIVA SHANKAR", "td_food_days": "12", "td_food_rate": "1250", "td_rma_total": "", "td_acct_payee": "K M SIVA SHANKAR", "td_food_total": "15000.00", "td_hotel_days": "3", "td_hotel_rate": "140", "journey_dist_1": "44.21 KM", "journey_dist_2": "-", "journey_dist_3": "-", "journey_dist_4": "-", "journey_dist_5": "-", "journey_dist_6": "-", "journey_dist_7": "-", "journey_dist_8": "-", "journey_dist_9": "-", "journey_mode_1": "Uber", "journey_mode_2": "Indigo", "journey_mode_3": "Taxi", "journey_mode_4": "Taxi", "journey_mode_5": "Flight", "journey_mode_6": "Taxi", "journey_mode_7": "Car", "journey_mode_8": "Bus", "journey_mode_9": "Car", "td_acct_amount": "", "td_hotel_total": "420.00", "unit_formation": "ITSDC", "orders_for_move": "", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "22/06/26", "journey_arr_date_2": "22/06/26", "journey_arr_date_3": "22/06/26", "journey_arr_date_4": "25/06/26", "journey_arr_date_5": "25/06/26", "journey_arr_date_6": "25/06/26", "journey_arr_date_7": "02/07/26", "journey_arr_date_8": "03/07/26", "journey_arr_date_9": "03/07/26", "journey_arr_time_1": "06:29 PM", "journey_arr_time_2": "09:40 PM", "journey_arr_time_3": "10:30 PM", "journey_arr_time_4": "05:00 PM", "journey_arr_time_5": "08:55 PM", "journey_arr_time_6": "10:15 PM", "journey_arr_time_7": "09:00 PM", "journey_arr_time_8": "09:18 AM", "journey_arr_time_9": "09:45 AM", "journey_dep_date_1": "22/06/26", "journey_dep_date_2": "22/06/26", "journey_dep_date_3": "22/06/26", "journey_dep_date_4": "25/06/26", "journey_dep_date_5": "25/06/26", "journey_dep_date_6": "25/06/26", "journey_dep_date_7": "02/07/26", "journey_dep_date_8": "02/07/26", "journey_dep_date_9": "03/07/26", "journey_dep_time_1": "04:53 PM", "journey_dep_time_2": "07:10 PM", "journey_dep_time_3": "10:00 PM", "journey_dep_time_4": "04:30 PM", "journey_dep_time_5": "06:15 PM", "journey_dep_time_6": "09:00 PM", "journey_dep_time_7": "08:00 PM", "journey_dep_time_8": "09:10 PM", "journey_dep_time_9": "09:30 AM", "journey_start_from": "", "journey_ticket_no_1": "Uber Taxi ", "journey_ticket_no_2": "Indigo 6E 6043", "journey_ticket_no_3": "Official Car", "journey_ticket_no_4": "Official Car", "journey_ticket_no_5": "Indigo 6E 950", "journey_ticket_no_6": "Private Airport Taxt AKS Travels. Attahed UPI Receipt", "journey_ticket_no_7": "Travelled in own car", "journey_ticket_no_8": "Booked Through Redbus. UPI Receipt also attached.", "journey_ticket_no_9": "Official Car", "journey_total_amt_1": "756", "journey_total_amt_2": "8150", "journey_total_amt_3": "0", "journey_total_amt_4": "0", "journey_total_amt_5": "10579", "journey_total_amt_6": "850", "journey_total_amt_7": "0", "journey_total_amt_8": "461", "journey_total_amt_9": "0", "total_journey_claim": "20796.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "36216.00", "journey_arr_station_1": "Hyderabad Airport", "journey_arr_station_2": "Delhi Airport", "journey_arr_station_3": "CENTRAD", "journey_arr_station_4": "Delhi Airport", "journey_arr_station_5": "Chennai Airport", "journey_arr_station_6": "Teynampet", "journey_arr_station_7": "Gummidipundi (Chennai Bus stn)", "journey_arr_station_8": "JBS, Secunderabad", "journey_arr_station_9": "ITSDC", "journey_dep_station_1": "ITSDC", "journey_dep_station_2": "Hyderabad Airport", "journey_dep_station_3": "Delhi Airport", "journey_dep_station_4": "CENTRAD", "journey_dep_station_5": "Delhi Airport", "journey_dep_station_6": "Chennai Airport", "journey_dep_station_7": "Teynampet", "journey_dep_station_8": "Gummidipundi (Chennai Bus stn)", "journey_dep_station_9": "JBS, Secunderabad"}	2026-07-03 12:09:14.751375	2026-07-03 12:09:14.751375	Temporary Duty Claim_K M SIVA SHANKAR_2026-07-03	2026-07-03		\N	\N	1	\N	\N
582	39	2	Approved	{"name": "K M SIVA SHANKAR", "paymode": "neft", "authority": "", "basic_pay": "123100 + Level 13", "move_date": "", "claim_date": "03/07/2026", "balance_due": "1216.00", "designation": "ADDL CDA", "personal_no": "111111", "td_rma_days": "", "td_rma_rate": "", "less_advance": "35000", "td_favour_of": "K M SIVA SHANKAR", "td_food_days": "12", "td_food_rate": "1250", "td_rma_total": "", "td_acct_payee": "K M SIVA SHANKAR", "td_food_total": "15000.00", "td_hotel_days": "3", "td_hotel_rate": "140", "journey_dist_1": "44.21 KM", "journey_dist_2": "-", "journey_dist_3": "-", "journey_dist_4": "-", "journey_dist_5": "-", "journey_dist_6": "-", "journey_dist_7": "-", "journey_dist_8": "-", "journey_dist_9": "-", "journey_mode_1": "Uber", "journey_mode_2": "Indigo", "journey_mode_3": "Taxi", "journey_mode_4": "Taxi", "journey_mode_5": "Flight", "journey_mode_6": "Taxi", "journey_mode_7": "Car", "journey_mode_8": "Bus", "journey_mode_9": "Car", "td_acct_amount": "", "td_hotel_total": "420.00", "unit_formation": "ITSDC", "orders_for_move": "", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "22/06/26", "journey_arr_date_2": "22/06/26", "journey_arr_date_3": "22/06/26", "journey_arr_date_4": "25/06/26", "journey_arr_date_5": "25/06/26", "journey_arr_date_6": "25/06/26", "journey_arr_date_7": "02/07/26", "journey_arr_date_8": "03/07/26", "journey_arr_date_9": "03/07/26", "journey_arr_time_1": "06:29 PM", "journey_arr_time_2": "09:40 PM", "journey_arr_time_3": "10:30 PM", "journey_arr_time_4": "05:00 PM", "journey_arr_time_5": "08:55 PM", "journey_arr_time_6": "10:15 PM", "journey_arr_time_7": "09:00 PM", "journey_arr_time_8": "09:18 AM", "journey_arr_time_9": "09:45 AM", "journey_dep_date_1": "22/06/26", "journey_dep_date_2": "22/06/26", "journey_dep_date_3": "22/06/26", "journey_dep_date_4": "25/06/26", "journey_dep_date_5": "25/06/26", "journey_dep_date_6": "25/06/26", "journey_dep_date_7": "02/07/26", "journey_dep_date_8": "02/07/26", "journey_dep_date_9": "03/07/26", "journey_dep_time_1": "04:53 PM", "journey_dep_time_2": "07:10 PM", "journey_dep_time_3": "10:00 PM", "journey_dep_time_4": "04:30 PM", "journey_dep_time_5": "06:15 PM", "journey_dep_time_6": "09:00 PM", "journey_dep_time_7": "08:00 PM", "journey_dep_time_8": "09:10 PM", "journey_dep_time_9": "09:30 AM", "journey_start_from": "", "journey_ticket_no_1": "Uber Taxi ", "journey_ticket_no_2": "Indigo 6E 6043", "journey_ticket_no_3": "Official Car", "journey_ticket_no_4": "Official Car", "journey_ticket_no_5": "Indigo 6E 950", "journey_ticket_no_6": "Private Airport Taxt AKS Travels. Attahed UPI Receipt", "journey_ticket_no_7": "Travelled in own car", "journey_ticket_no_8": "Booked Through Redbus. UPI Receipt also attached.", "journey_ticket_no_9": "Official Car", "journey_total_amt_1": "756", "journey_total_amt_2": "8150", "journey_total_amt_3": "0", "journey_total_amt_4": "0", "journey_total_amt_5": "10579", "journey_total_amt_6": "850", "journey_total_amt_7": "0", "journey_total_amt_8": "461", "journey_total_amt_9": "0", "total_journey_claim": "20796.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "36216.00", "journey_arr_station_1": "Hyderabad Airport", "journey_arr_station_2": "Delhi Airport", "journey_arr_station_3": "CENTRAD", "journey_arr_station_4": "Delhi Airport", "journey_arr_station_5": "Chennai Airport", "journey_arr_station_6": "Teynampet", "journey_arr_station_7": "Gummidipundi (Chennai Bus stn)", "journey_arr_station_8": "JBS, Secunderabad", "journey_arr_station_9": "ITSDC", "journey_dep_station_1": "ITSDC", "journey_dep_station_2": "Hyderabad Airport", "journey_dep_station_3": "Delhi Airport", "journey_dep_station_4": "CENTRAD", "journey_dep_station_5": "Delhi Airport", "journey_dep_station_6": "Chennai Airport", "journey_dep_station_7": "Teynampet", "journey_dep_station_8": "Gummidipundi (Chennai Bus stn)", "journey_dep_station_9": "JBS, Secunderabad"}	2026-07-03 12:10:12.144272	2026-07-03 12:10:12.144272	Temporary Duty Claim_K M SIVA SHANKAR_2026-07-03	2026-07-03		2026-07-03 12:10:12.142	2026-07-06 14:32:28.362255	1	\N	\N
584	14	3	Approved	{"email": "sambarajuvijay.dad@nic.in", "opd_amount": "0", "cghs_ben_id": "1709588", "full_address": "2-2-1105/82 royal residency flat 303 street no 9 tilaknagar hyderabad-500044", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "S. SUNITHA", "relationship": "Spouse", "employee_code": "98334027", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9177779018", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "06/07/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "S VIJAYA BHASKAR RAO", "declaration_date": "06/07/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "", "generated_affidavit": "I, S VIJAYA BHASKAR RAO, resident of 2-2-1105/82 royal residency flat 303 street no 9 tilaknagar hyderabad-500044, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "1709589", "treatment_type_test": "on", "declaration_page_date": "06/07/2026", "declaration_signature": "", "generated_declaration": "I S VIJAYA BHASKAR RAO, resident of 2-2-1105/82 royal residency flat 303 street no 9 tilaknagar hyderabad-500044 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "S VIJAYA BHASKAR RAO, AAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "8775"}	2026-07-06 14:33:57.506116	2026-07-06 14:33:57.506116	Medical Reimbursement_Dependent_S. SUNITHA_2026-07-06	2026-07-06		2026-07-06 14:33:57.505	2026-07-09 13:00:09.174482	1	\N	\N
583	14	3	Approved	{"email": "sambarajuvijay.dad@nic.in", "opd_amount": "0", "cghs_ben_id": "1709588", "full_address": "2-2-1105/82 royal residency flat 303 street no 9 tilaknagar hyderabad-500044", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98334027", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9177779018", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "06/07/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "S VIJAYA BHASKAR RAO", "declaration_date": "06/07/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "Yes", "ward_entitlement": "Private", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "on", "treatment_type_opd": "", "generated_affidavit": "I, S VIJAYA BHASKAR RAO, resident of 2-2-1105/82 royal residency flat 303 street no 9 tilaknagar hyderabad-500044, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "1709588", "treatment_type_test": "on", "declaration_page_date": "06/07/2026", "declaration_signature": "", "generated_declaration": "I S VIJAYA BHASKAR RAO, resident of 2-2-1105/82 royal residency flat 303 street no 9 tilaknagar hyderabad-500044 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "S VIJAYA BHASKAR RAO, AAO", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "1600"}	2026-07-06 11:20:46.335927	2026-07-06 11:20:46.335927	Medical Reimbursement_Self_S VIJAYA BHASKAR RAO_2026-07-06	2026-07-06		2026-07-06 11:20:46.335	2026-07-09 13:00:13.806621	1	\N	\N
585	1	7	Pending	{"vr_no": "", "during": "June 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "GEMC-511687767035389", "bill_date": "09.07.2026", "cda_month": "", "signature": "", "exp_date_1": "2026-07-09", "payee_name": "", "cda_section": "100", "exp_account": "Hiring of IT Manpower", "incurred_by": "ITSDC", "amount_words": "Six Lakh Sixty-Four  Thousand Three Hundred and Forty", "exp_amount_1": "664340", "passed_words": "", "payee_amount": "", "total_amount": "664340.00", "exp_details_1": "Hiring of IT Manpower for June 2026", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "24/01/2026", "payee_treasury": "", "name_designation": "SAO-Admin", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-07-09 13:02:05.273892	2026-07-09 13:02:05.273892	Hiring of IT Manpower Contingent Bills	2026-06-14		2026-07-09 13:02:05.271	\N	1	546	contingent
588	105	11	Rejected	{"name": "K RAMADEVI", "rank": "SAO", "pm_r1": "", "pm_cda": "", "pm_mr2": "", "pm_r1b": "", "pm_r1c": "", "da_ao_1": "", "da_ao_2": "", "da_ao_3": "", "da_so_1": "", "da_so_2": "", "da_so_3": "", "dr_item": "", "dr_page": "", "pm_c3_p": "", "pm_mr2b": "", "pm_mr2c": "", "cda_name": "", "pm_c3_rs": "", "pm_c3b_p": "", "pm_c3c_p": "", "pm_mc4_p": "", "pm_month": "", "pm_vr_no": "", "basic_pay": "101400", "grade_pay": "10", "pm_c3b_rs": "", "pm_c3c_rs": "", "pm_mc4_rs": "", "pm_mc4b_p": "", "pm_mc4c_p": "", "weight_kg": "", "amount_num": "12000", "corps_dept": "IT&SDC SECUNDERABAD", "da_payee_1": "", "da_payee_2": "", "da_payee_3": "", "pm_mc4b_rs": "", "pm_mc4c_rs": "", "pm_section": "", "da_passed_p": "", "pm_class_c3": "", "pm_class_r1": "", "pm_vr_class": "", "advance_type": "", "amount_words": "Twelve Thousand", "authority_no": " Part II order NO. 317 ", "bank_account": "", "da_passed_rs": "", "pm_class_c3b": "", "pm_class_c3c": "", "pm_class_r1b": "", "pm_class_r1c": "", "vehicle_type": "", "da_treasury_1": "", "da_treasury_2": "", "da_treasury_3": "", "advance_amount": "", "advance_period": "", "authority_date": "2026-07-01", "family_details": "", "ltc_block_year": "", "signature_note": "", "transport_mode": "", "advance_purpose": "for Temporary duty to attend training course on \\"Management Development Programme for SAOs of DAD\\" scheduled from 27-07-2026 to 31-07-202 at AJNIFM, Faridabad", "da_cheque_amt_1": "", "da_cheque_amt_2": "", "da_cheque_amt_3": "", "da_passed_words": "", "journey_details": "", "ltc_destination": "", "travel_expenses": "", "countersigned_by": "", "da_cheque_date_1": "", "da_cheque_date_2": "", "da_cheque_date_3": "", "issuing_authority": "CDA SECUNDERABAD", "vehicle_authority_ref": ""}	2026-07-09 16:29:01.04887	2026-07-09 16:29:01.04887	Advance of Pay/TA_K RAMADEVI_2026-07-09	2026-07-09	Duplicate Claim\n	2026-07-09 16:29:01.048	2026-07-10 11:26:01.622927	1	\N	\N
591	7	6	Pending	{"amount": "3000/-", "appName": "BINU S NAIR", "sigName": "BINU S NAIR", "payLevel": "Level 10, Rs. 101400", "dateField": "10 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "SAO"}	2026-07-10 11:00:51.190333	2026-07-10 11:00:51.190333	Newspaper_BINU S NAIR_2026-07-10	2026-07-10		2026-07-10 11:00:51.19	\N	1	\N	\N
586	38	3	Pending	{"email": "noriskongala.dad@gov.in", "opd_amount": "350", "cghs_ben_id": "20432271", "full_address": "1-7-C9, Flat no. G-4, Sri Srinivasa palace, South kamala nagar, Moula ali, secunderabad - 500062", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "Self", "relationship": "Self", "employee_code": "98352779", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9052250093", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "09/07/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "KONGALA NORIS ANUDEEP", "declaration_date": "09/07/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "General", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "", "treatment_type_opd": "on", "generated_affidavit": "I, KONGALA NORIS ANUDEEP, resident of 1-7-C9, Flat no. G-4, Sri Srinivasa palace, South kamala nagar, Moula ali, secunderabad - 500062, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "20432271", "treatment_type_test": "on", "declaration_page_date": "09/07/2026", "declaration_signature": "", "generated_declaration": "I KONGALA NORIS ANUDEEP, resident of 1-7-C9, Flat no. G-4, Sri Srinivasa palace, South kamala nagar, Moula ali, secunderabad - 500062 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "KONGALA NORIS ANUDEEP, AUDITOR", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "2275"}	2026-07-09 16:28:57.553772	2026-07-09 16:40:23.567134	Medical Reimbursement_Self_KONGALA NORIS ANUDEEP_2026-07-09	2026-07-07		2026-07-09 16:40:23.567	\N	6	\N	\N
590	38	3	Pending	{"email": "noriskongala.dad@gov.in", "opd_amount": "350", "cghs_ben_id": "20432271", "full_address": "1-7-C9, Flat no. G-4, Sri Srinivasa palace, South kamala nagar, Moula ali, secunderabad - 500062", "is_emergency": "No", "mrc_chk_cghs": "on", "patient_name": "K Devadas Kumar", "relationship": "Father", "employee_code": "98352779", "indoor_amount": "0", "is_empanelled": "Yes", "mobile_number": "9052250093", "mrc_chk_bills": "on", "mrc_chk_stent": "", "affidavit_date": "09/07/2026", "affidavit_place": "Secunderabad", "mrc_chk_breakup": "", "mrc_chk_implant": "", "card_holder_name": "KONGALA NORIS ANUDEEP", "declaration_date": "09/07/2026", "hospital_details": "", "mrc_chk_lost_aff": "", "prior_permission": "No", "ward_entitlement": "General", "declaration_place": "Secunderabad", "medical_insurance": "No", "mrc_chk_ambulance": "", "mrc_chk_discharge": "", "mrc_chk_emergency": "", "mrc_chk_permission": "", "treatment_type_opd": "on", "generated_affidavit": "I, KONGALA NORIS ANUDEEP, resident of 1-7-C9, Flat no. G-4, Sri Srinivasa palace, South kamala nagar, Moula ali, secunderabad - 500062, have lost/misplaced the original claim papers/bills. I hereby undertake that I have not received any payment against these original bills from any source. If the original papers are traced, I shall not stake claim against them in future.", "patient_cghs_ben_id": "20432272", "treatment_type_test": "on", "declaration_page_date": "09/07/2026", "declaration_signature": "", "generated_declaration": "I KONGALA NORIS ANUDEEP, resident of 1-7-C9, Flat no. G-4, Sri Srinivasa palace, South kamala nagar, Moula ali, secunderabad - 500062 hereby declare that the statements made in the application are true to the best of my knowledge and belief and the person for whom medical expenses were incurred is wholly dependent on me. I am a CGHS beneficiary and the CGHS card was valid at the time of treatment. I agree for the reimbursement as is admissible under the rules.", "medical_advance_taken": "0", "treatment_type_indoor": "", "declaration_name_desig": "KONGALA NORIS ANUDEEP, AUDITOR", "declaration_page_place": "Secunderabad", "amount_claimed_received": "0", "test_investigation_amount": "1530"}	2026-07-09 16:43:11.673384	2026-07-09 16:43:11.673384	Medical Reimbursement_Dependent_K Devadas Kumar_2026-07-09	2026-07-09		2026-07-09 16:43:11.67	\N	1	\N	\N
592	29	6	Draft	{"amount": "3000/-", "appName": "KAMMARA NAVEEN KUMAR", "sigName": "KAMMARA NAVEEN KUMAR", "payLevel": "Level 8, Rs. 50500", "dateField": "10 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "AAO"}	2026-07-10 11:03:26.6455	2026-07-10 11:03:26.6455	Newspaper_KAMMARA NAVEEN KUMAR_2026-07-10	2026-07-10		\N	\N	1	\N	\N
593	29	6	Pending	{"amount": "3000/-", "appName": "KAMMARA NAVEEN KUMAR", "sigName": "KAMMARA NAVEEN KUMAR", "payLevel": "Level 8, Rs. 50500", "dateField": "10 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "AAO"}	2026-07-10 11:03:30.975119	2026-07-10 11:03:30.975119	Newspaper_KAMMARA NAVEEN KUMAR_2026-07-10	2026-07-10		2026-07-10 11:03:30.974	\N	1	\N	\N
594	1	7	Pending	{"vr_no": "", "during": "June 2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/Telephone", "bill_date": "10/07/2026", "cda_month": "", "signature": "", "exp_date_1": "2026-07-10", "payee_name": "", "cda_section": "100", "exp_account": "BSNL Telephone Bills", "incurred_by": "ITSDC", "amount_words": "Five Thousand and Sixty-Seven", "exp_amount_1": "5067", "passed_words": "", "payee_amount": "", "total_amount": "5067.00", "exp_details_1": "BSNL Telephone Bills for the month of June 2026", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "10.07.2026", "payee_treasury": "", "name_designation": "SAO-Admin", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-07-10 11:23:53.52154	2026-07-10 11:23:53.52154	BSNL Telephone Bills	2026-06-15		2026-07-10 11:23:53.519	\N	1	556	contingent
606	14	6	Pending	{"amount": "3000/-", "appName": "S VIJAYA BHASKAR RAO", "sigName": "S VIJAYA BHASKAR RAO", "payLevel": "Level 9, Rs. 85100", "dateField": "14 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "AAO"}	2026-07-14 12:17:45.850898	2026-07-14 12:17:45.850898	Newspaper_S VIJAYA BHASKAR RAO_2026-07-14	2026-07-14		2026-07-14 12:17:45.848	\N	1	\N	\N
595	5	2	Draft	{"name": "P AMARNATH REDDY", "paymode": "neft", "authority": "", "basic_pay": "50500 + Level 8", "move_date": "", "claim_date": "10/07/2026", "balance_due": "13562.00", "designation": "AAO", "personal_no": "98345722", "td_rma_days": "", "td_rma_rate": "", "less_advance": "10000", "td_favour_of": "P AMARNATH REDDY", "td_food_days": "7", "td_food_rate": "1000", "td_rma_total": "", "td_acct_payee": "P AMARNATH REDDY", "td_food_total": "7000.00", "td_hotel_days": "5", "td_hotel_rate": "90", "journey_dist_1": "50", "journey_dist_2": "", "journey_dist_3": "45", "journey_dist_4": "45", "journey_dist_5": "", "journey_dist_6": "50", "journey_mode_1": "Taxi", "journey_mode_2": "Flight", "journey_mode_3": "Taxi", "journey_mode_4": "Taxi", "journey_mode_5": "Flight", "journey_mode_6": "Taxi", "td_acct_amount": "", "td_hotel_total": "450.00", "unit_formation": "ITSDC", "orders_for_move": "252", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "07/06/26", "journey_arr_date_2": "07/06/26", "journey_arr_date_3": "07/06/26", "journey_arr_date_4": "12/06/26", "journey_arr_date_5": "12/06/26", "journey_arr_date_6": "13/06/26", "journey_arr_time_1": "16:30", "journey_arr_time_2": "21:00", "journey_arr_time_3": "22:40", "journey_arr_time_4": "20:00", "journey_arr_time_5": "23:30", "journey_arr_time_6": "01:30", "journey_dep_date_1": "07/06/26", "journey_dep_date_2": "07/06/26", "journey_dep_date_3": "07/06/26", "journey_dep_date_4": "12/06/26", "journey_dep_date_5": "12/06/26", "journey_dep_date_6": "13/06/26", "journey_dep_time_1": "14:30", "journey_dep_time_2": "19:30", "journey_dep_time_3": "21:30", "journey_dep_time_4": "18:00", "journey_dep_time_5": "21:30", "journey_dep_time_6": "00:10", "journey_start_from": "Secunderabad", "journey_ticket_no_1": "(2*20+48*21)\\nTaxi.no: TG08SN2156", "journey_ticket_no_2": "PNR No.B71UPW", "journey_ticket_no_3": "(4*75+41*18)\\nTaxi.No:KA02NG4189", "journey_ticket_no_4": "(4*75+41*18)\\nTaxi.No:KA01AN5143", "journey_ticket_no_5": "PNR No.BF2FVH", "journey_ticket_no_6": "(2*20+48*21)\\nTaxi.no: TG06JM947259", "journey_total_amt_1": "1048 ", "journey_total_amt_2": "4969", "journey_total_amt_3": "1038\\n\\n", "journey_total_amt_4": "1038\\n\\n", "journey_total_amt_5": "6971\\n\\n", "journey_total_amt_6": "1048", "total_journey_claim": "16112.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "23562.00", "journey_arr_station_1": "RGI airport, HYderabad", "journey_arr_station_2": "Kempegowda Airport,Bengaluru", "journey_arr_station_3": "RTC,Bengaluru", "journey_arr_station_4": "Kempegowda Airport,Bengaluru", "journey_arr_station_5": "RGI airport, HYderabad", "journey_arr_station_6": "Home(Yapral),Secunderabad", "journey_dep_station_1": "Home(Yapral),Secunderabad", "journey_dep_station_2": "RGI Airport", "journey_dep_station_3": "Kempegowda Airport,Bengaluru", "journey_dep_station_4": "RTC,Bengaluru", "journey_dep_station_5": "Kempegowda Airport,Bengaluru", "journey_dep_station_6": "RGI airport, HYderabad"}	2026-07-10 11:47:10.69439	2026-07-10 11:50:23.082251	Temporary Duty Claim_P AMARNATH REDDY_2026-07-10	2026-07-10		\N	\N	2	\N	\N
597	13	6	Pending	{"amount": "3000/-", "appName": "SANTOSH CHANDRAN", "sigName": "SANTOSH CHANDRAN", "payLevel": "Level 10, Rs. 104000", "dateField": "10 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "SAO"}	2026-07-10 12:00:17.699139	2026-07-10 12:00:17.699139	Newspaper_SANTOSH CHANDRAN_2026-07-10	2026-07-10		2026-07-10 12:00:17.696	\N	1	\N	\N
598	18	6	Pending	{"amount": "3000/-", "appName": "N RAMACHANDRAN", "sigName": "N RAMACHANDRAN", "payLevel": "Level 10, Rs. 98400", "dateField": "10 July 2026", "periodSel": "jan", "signature": "N Ramachandran", "yearInput": "26", "designation": "SAO"}	2026-07-10 12:10:34.417003	2026-07-10 12:10:34.417003	Newspaper_N RAMACHANDRAN_2026-07-10	2026-07-10		2026-07-10 12:10:34.414	\N	1	\N	\N
599	5	6	Draft	{"amount": "3000/-", "appName": "P AMARNATH REDDY", "sigName": "P AMARNATH REDDY", "payLevel": "Level 8, Rs. 50500", "dateField": "10 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "AAO"}	2026-07-10 12:11:59.107359	2026-07-10 12:11:59.107359	Newspaper_P AMARNATH REDDY_2026-07-10	2026-07-10		\N	\N	1	\N	\N
600	5	6	Pending	{"amount": "3000/-", "appName": "P AMARNATH REDDY", "sigName": "P AMARNATH REDDY", "payLevel": "Level 8, Rs. 50500", "dateField": "10 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "AAO"}	2026-07-10 12:12:41.156073	2026-07-10 12:12:41.156073	Newspaper_P AMARNATH REDDY_2026-07-10	2026-07-10		2026-07-10 12:12:41.153	\N	1	\N	\N
601	20	6	Pending	{"amount": "3000/-", "appName": "PARTHA GHOSH", "sigName": "PARTHA GHOSH", "payLevel": "Level 10, Rs. 92700", "dateField": "13 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "SAO"}	2026-07-13 11:05:26.277428	2026-07-13 11:05:26.277428	Newspaper_PARTHA GHOSH_2026-07-13	2026-07-13		2026-07-13 11:05:26.274	\N	1	\N	\N
603	39	7	Draft	{"vr_no": "", "during": "07/2026", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/", "bill_date": "2026-07-14", "cda_month": "", "signature": "", "exp_date_1": "2026-07-14", "payee_name": "", "cda_section": "100", "exp_account": "Telephone Claim of Addl CDA", "incurred_by": "ITSDC", "amount_words": "One Thousand Three Hundred and Twenty-Five", "exp_amount_1": "1325", "passed_words": "", "payee_amount": "", "total_amount": "1325.00", "exp_details_1": "Expenditure in respect of Sh. K.M. Siva Shankar, IDAS, Additional CDA, towards Telephone claim for the month of JUNE 2026", "month_account": "JUL 2026", "passed_amount": "", "payee_ag_code": "", "authority_date": "14/07/2026", "payee_treasury": "", "name_designation": "K M SIVA SHANKAR, ADDL CDA", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-07-14 10:50:14.262796	2026-07-14 10:50:14.262796	Contingent Bill_K M SIVA SHANKAR_2026-07-14	2026-07-14		\N	\N	1	\N	contingent
604	16	6	Pending	{"amount": "3000/-", "appName": "R RAVEENDRA PRASAD", "sigName": "R RAVEENDRA PRASAD", "payLevel": "Level 10, Rs. 101400", "dateField": "14 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "SAO"}	2026-07-14 11:56:53.486882	2026-07-14 11:56:53.486882	Newspaper_R RAVEENDRA PRASAD_2026-07-14	2026-07-14		2026-07-14 11:56:53.484	\N	1	\N	\N
605	12	6	Pending	{"amount": "3000/-", "appName": "C S CHAKRAVARTHY", "sigName": "C S CHAKRAVARTHY", "payLevel": "Level 10, Rs. 104400", "dateField": "14 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "SAO"}	2026-07-14 11:57:32.652401	2026-07-14 11:57:32.652401	Newspaper_C S CHAKRAVARTHY_2026-07-14	2026-07-14		2026-07-14 11:57:32.652	\N	1	\N	\N
596	5	2	Approved	{"name": "P AMARNATH REDDY", "authority": "", "basic_pay": "50500 + Level 8", "move_date": "", "claim_date": "10/07/2026", "balance_due": "13562.00", "designation": "AAO", "personal_no": "98345722", "td_rma_days": "", "td_rma_rate": "", "less_advance": "10000", "td_favour_of": "P AMARNATH REDDY", "td_food_days": "7", "td_food_rate": "1000", "td_rma_total": "", "td_acct_payee": "P AMARNATH REDDY", "td_food_total": "7000.00", "td_hotel_days": "5", "td_hotel_rate": "90", "journey_dist_1": "50", "journey_dist_2": "", "journey_dist_3": "45", "journey_dist_4": "45", "journey_dist_5": "", "journey_dist_6": "50", "journey_mode_1": "Taxi", "journey_mode_2": "Flight", "journey_mode_3": "Taxi", "journey_mode_4": "Taxi", "journey_mode_5": "Flight", "journey_mode_6": "Taxi", "td_acct_amount": "", "td_hotel_total": "450.00", "unit_formation": "ITSDC", "orders_for_move": "252", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "07/06/26", "journey_arr_date_2": "07/06/26", "journey_arr_date_3": "07/06/26", "journey_arr_date_4": "12/06/26", "journey_arr_date_5": "12/06/26", "journey_arr_date_6": "13/06/26", "journey_arr_time_1": "16:30", "journey_arr_time_2": "21:00", "journey_arr_time_3": "22:40", "journey_arr_time_4": "20:00", "journey_arr_time_5": "23:30", "journey_arr_time_6": "01:30", "journey_dep_date_1": "07/06/26", "journey_dep_date_2": "07/06/26", "journey_dep_date_3": "07/06/26", "journey_dep_date_4": "12/06/26", "journey_dep_date_5": "12/06/26", "journey_dep_date_6": "13/06/26", "journey_dep_time_1": "14:30", "journey_dep_time_2": "19:30", "journey_dep_time_3": "21:30", "journey_dep_time_4": "18:00", "journey_dep_time_5": "21:30", "journey_dep_time_6": "00:10", "journey_start_from": "Secunderabad", "journey_ticket_no_1": "(2*20+48*21)\\nTaxi.no: TG08SN2156", "journey_ticket_no_2": "PNR No.B71UPW", "journey_ticket_no_3": "(4*75+41*18)\\nTaxi.No:KA02NG4189", "journey_ticket_no_4": "(4*75+41*18)\\nTaxi.No:KA01AN5143", "journey_ticket_no_5": "PNR No.BF2FVH", "journey_ticket_no_6": "(2*20+48*21)\\nTaxi.no: TG06JM947259", "journey_total_amt_1": "1048 ", "journey_total_amt_2": "4969", "journey_total_amt_3": "1038\\n\\n", "journey_total_amt_4": "1038\\n\\n", "journey_total_amt_5": "6971\\n\\n", "journey_total_amt_6": "1048", "total_journey_claim": "16112.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "23562.00", "journey_arr_station_1": "RGI airport, HYderabad", "journey_arr_station_2": "Kempegowda Airport,Bengaluru", "journey_arr_station_3": "RTC,Bengaluru", "journey_arr_station_4": "Kempegowda Airport,Bengaluru", "journey_arr_station_5": "RGI airport, HYderabad", "journey_arr_station_6": "Home(Yapral),Secunderabad", "journey_dep_station_1": "Home(Yapral),Secunderabad", "journey_dep_station_2": "RGI Airport", "journey_dep_station_3": "Kempegowda Airport,Bengaluru", "journey_dep_station_4": "RTC,Bengaluru", "journey_dep_station_5": "Kempegowda Airport,Bengaluru", "journey_dep_station_6": "RGI airport, HYderabad"}	2026-07-10 11:51:27.099919	2026-07-10 11:57:36.361136	Temporary Duty Claim_P AMARNATH REDDY_2026-07-10	2026-07-09		2026-07-10 11:57:36.358	2026-07-14 15:22:33.609142	2	\N	\N
602	39	2	Approved	{"name": "K M SIVA SHANKAR", "paymode": "neft", "authority": "TR", "basic_pay": "123100 + Level 13", "move_date": "03/07/2026", "claim_date": "14/07/2026", "balance_due": "42444.00", "designation": "ADDL CDA", "personal_no": "111111", "td_rma_days": "0", "td_rma_rate": "0", "less_advance": "0", "td_favour_of": "K M SIVA SHANKAR", "td_food_days": "10", "td_food_rate": "1250", "td_rma_total": "", "td_acct_payee": "K M SIVA SHANKAR", "td_food_total": "12500.00", "td_hotel_days": "5", "td_hotel_rate": "140", "journey_dist_1": "-", "journey_dist_2": "-", "journey_dist_3": "-", "journey_dist_4": "-", "journey_dist_5": "-", "journey_dist_6": "-", "journey_mode_1": "-", "journey_mode_2": "FLIGHT", "journey_mode_3": "FLIGHT", "journey_mode_4": "TAXI", "journey_mode_5": "TRAIN", "journey_mode_6": "-", "td_acct_amount": "", "td_hotel_total": "700.00", "unit_formation": "ITSDC", "orders_for_move": "44", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "05/07/26", "journey_arr_date_2": "05/07/26", "journey_arr_date_3": "10/07/26", "journey_arr_date_4": "10/07/26", "journey_arr_date_5": "14/07/26", "journey_arr_date_6": "14/07/26", "journey_arr_time_1": "05:00 PM", "journey_arr_time_2": "08:45 PM", "journey_arr_time_3": "09:00 PM", "journey_arr_time_4": "10:15 PM", "journey_arr_time_5": "07:00 AM", "journey_arr_time_6": "08:00 AM", "journey_dep_date_1": "05/07/26", "journey_dep_date_2": "05/07/26", "journey_dep_date_3": "10/07/26", "journey_dep_date_4": "10/07/26", "journey_dep_date_5": "13/07/26", "journey_dep_date_6": "14/07/26", "journey_dep_time_1": "03:00 PM", "journey_dep_time_2": "06:25 PM", "journey_dep_time_3": "06:15 PM", "journey_dep_time_4": "09:15 PM", "journey_dep_time_5": "06:20 PM", "journey_dep_time_6": "07:30 AM", "journey_start_from": "SECUNDERABAD", "journey_ticket_no_1": "OFFICE CAR", "journey_ticket_no_2": "INDIGO 6E 707", "journey_ticket_no_3": "INDIGO 6E 950", "journey_ticket_no_4": "AIRPORT TAXI (Paid receipt Enclosed)", "journey_ticket_no_5": "CHARMINAR EXPRESS", "journey_ticket_no_6": "PERSONAL VEHICLE", "journey_total_amt_1": "0", "journey_total_amt_2": "7618", "journey_total_amt_3": "17921", "journey_total_amt_4": "900", "journey_total_amt_5": "2805", "journey_total_amt_6": "0", "total_journey_claim": "29244.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "42444.00", "journey_arr_station_1": "HYD AIRPORT", "journey_arr_station_2": "DELHI AIRPORT", "journey_arr_station_3": "CHENNAI AIRPORT", "journey_arr_station_4": "TEYNAMPET (HOME)", "journey_arr_station_5": "SECUNDERABAD JN", "journey_arr_station_6": "ITSDC", "journey_dep_station_1": "SECUNDERABAD", "journey_dep_station_2": "HYD AIRPORT", "journey_dep_station_3": "DELHI AIRPORT", "journey_dep_station_4": "CHENNAI AIRPORT", "journey_dep_station_5": "CHENNAI BEACH RLY STATION", "journey_dep_station_6": "SECUNDERABAD JN"}	2026-07-14 10:40:41.787376	2026-07-14 10:40:41.787376	Temporary Duty Claim_K M SIVA SHANKAR_2026-07-14	2026-07-14		2026-07-14 10:40:41.784	2026-07-14 15:21:06.67876	1	\N	\N
587	105	11	Approved	{"name": "K RAMADEVI", "rank": "SAO", "pm_r1": "", "pm_cda": "", "pm_mr2": "", "pm_r1b": "", "pm_r1c": "", "da_ao_1": "", "da_ao_2": "", "da_ao_3": "", "da_so_1": "", "da_so_2": "", "da_so_3": "", "dr_item": "", "dr_page": "", "pm_c3_p": "", "pm_mr2b": "", "pm_mr2c": "", "cda_name": "", "pm_c3_rs": "", "pm_c3b_p": "", "pm_c3c_p": "", "pm_mc4_p": "", "pm_month": "", "pm_vr_no": "", "basic_pay": "101400", "grade_pay": "10", "pm_c3b_rs": "", "pm_c3c_rs": "", "pm_mc4_rs": "", "pm_mc4b_p": "", "pm_mc4c_p": "", "weight_kg": "", "amount_num": "12000", "corps_dept": "IT&SDC SECUNDERABAD", "da_payee_1": "", "da_payee_2": "", "da_payee_3": "", "pm_mc4b_rs": "", "pm_mc4c_rs": "", "pm_section": "", "da_passed_p": "", "pm_class_c3": "", "pm_class_r1": "", "pm_vr_class": "", "advance_type": "", "amount_words": "Twelve Thousand", "authority_no": " Part II order NO. 317 ", "bank_account": "", "da_passed_rs": "", "pm_class_c3b": "", "pm_class_c3c": "", "pm_class_r1b": "", "pm_class_r1c": "", "vehicle_type": "", "da_treasury_1": "", "da_treasury_2": "", "da_treasury_3": "", "advance_amount": "", "advance_period": "", "authority_date": "2026-07-01", "family_details": "", "ltc_block_year": "", "signature_note": "", "transport_mode": "", "advance_purpose": "for Temporary duty to attend training course on \\"Management Development Programme for SAOs of DAD\\" scheduled from 27-07-2026 to 31-07-202 at AJNIFM, Faridabad", "da_cheque_amt_1": "", "da_cheque_amt_2": "", "da_cheque_amt_3": "", "da_passed_words": "", "journey_details": "", "ltc_destination": "", "travel_expenses": "", "countersigned_by": "", "da_cheque_date_1": "", "da_cheque_date_2": "", "da_cheque_date_3": "", "issuing_authority": "CDA SECUNDERABAD", "vehicle_authority_ref": ""}	2026-07-09 16:28:57.690722	2026-07-09 16:38:46.857727	Advance of Pay/TA_K RAMADEVI_2026-07-09	2026-07-08		2026-07-09 16:38:46.855	2026-07-14 15:21:19.495747	3	\N	\N
610	22	2	Draft	{"name": "K V N PRASAD", "paymode": "neft", "authority": "", "basic_pay": "50500 + Level 8", "move_date": "03/07/2026", "claim_date": "14/07/2026", "balance_due": "11426.00", "designation": "AAO", "personal_no": "98341398", "td_rma_days": "", "td_rma_rate": "", "less_advance": "0", "td_favour_of": "K V N PRASAD", "td_food_days": "", "td_food_rate": "", "td_rma_total": "", "td_acct_payee": "K V N PRASAD", "td_food_total": "", "td_hotel_days": "", "td_hotel_rate": "", "journey_dist_1": "25", "journey_dist_2": "", "journey_dist_3": "", "journey_dist_4": "", "journey_dist_5": "", "journey_dist_6": "", "journey_dist_7": "", "journey_mode_1": "CAB", "journey_mode_2": "Flight", "journey_mode_3": "CAB", "journey_mode_4": "", "journey_mode_5": "", "journey_mode_6": "", "journey_mode_7": "", "td_acct_amount": "", "td_hotel_total": "", "unit_formation": "ITSDC", "orders_for_move": "44", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "05/07/26", "journey_arr_date_2": "05/07/26", "journey_arr_date_3": "05/07/26", "journey_arr_date_4": "", "journey_arr_date_5": "", "journey_arr_date_6": "", "journey_arr_date_7": "", "journey_arr_time_1": "14:53", "journey_arr_time_2": "20:10", "journey_arr_time_3": "21:30", "journey_arr_time_4": "", "journey_arr_time_5": "", "journey_arr_time_6": "", "journey_arr_time_7": "", "journey_dep_date_1": "05/07/26", "journey_dep_date_2": "05/07/26", "journey_dep_date_3": "05/07/26", "journey_dep_date_4": "", "journey_dep_date_5": "", "journey_dep_date_6": "", "journey_dep_date_7": "", "journey_dep_time_1": "14:11", "journey_dep_time_2": "17:45", "journey_dep_time_3": "20:10", "journey_dep_time_4": "", "journey_dep_time_5": "", "journey_dep_time_6": "", "journey_dep_time_7": "", "journey_start_from": "Hyderabad", "journey_ticket_no_1": "", "journey_ticket_no_2": "", "journey_ticket_no_3": "", "journey_ticket_no_4": "", "journey_ticket_no_5": "", "journey_ticket_no_6": "", "journey_ticket_no_7": "", "journey_total_amt_1": "507", "journey_total_amt_2": "10150", "journey_total_amt_3": "769", "journey_total_amt_4": "", "journey_total_amt_5": "", "journey_total_amt_6": "", "journey_total_amt_7": "", "total_journey_claim": "11426.00", "undertaking_station": "Secunderabad", "total_amount_claimed": "11426.00", "journey_arr_station_1": "Shamshabad, Hyderababd Intl Airport", "journey_arr_station_2": "Indira Gandhi Intl, New Delhi", "journey_arr_station_3": "ITI Guest House, New Delhi", "journey_arr_station_4": "", "journey_arr_station_5": "", "journey_arr_station_6": "", "journey_arr_station_7": "", "journey_dep_station_1": "Saroornagar, Hyderabad", "journey_dep_station_2": "Shamshabad, Hyderababd Intl Airport", "journey_dep_station_3": "Indira Gandhi Intl, New Delhi", "journey_dep_station_4": "PCDA New Delhi", "journey_dep_station_5": "", "journey_dep_station_6": "", "journey_dep_station_7": ""}	2026-07-14 15:50:43.070351	2026-07-14 15:50:43.070351	Temporary Duty Claim_K V N PRASAD_2026-07-14	2026-07-14		\N	\N	1	\N	\N
611	36	2	Pending	{"name": "SUMIT KUMAR SAINI", "authority": "", "basic_pay": "27100 + Level 4", "move_date": "06.07.2026", "claim_date": "14/07/2026", "balance_due": "7356.25", "designation": "STENO GRADE - II", "personal_no": "98346016", "td_rma_days": "2", "td_rma_rate": "438", "less_advance": "0", "td_favour_of": "SUMIT KUMAR SAINI", "td_food_days": "4", "td_food_rate": "625", "td_rma_total": "876.00", "td_acct_payee": "SUMIT KUMAR SAINI", "td_food_total": "2500.00", "td_hotel_days": "2", "td_hotel_rate": "90", "journey_dist_1": "5 KM ", "journey_dist_2": "705 KM", "journey_dist_3": "16 KM", "journey_dist_4": "10 KM", "journey_dist_5": "616 KM", "journey_dist_6": "12 KM", "journey_mode_1": "Auto ", "journey_mode_2": "Train", "journey_mode_3": "Auto", "journey_mode_4": "Auto", "journey_mode_5": "Train", "journey_mode_6": "Auto", "td_acct_amount": "", "td_hotel_total": "180.00", "unit_formation": "ITSDC", "orders_for_move": "", "td_acct_treasury": "", "td_passed_payment": "", "journey_arr_date_1": "08/07/26", "journey_arr_date_2": "09/07/26", "journey_arr_date_3": "09/07/26", "journey_arr_date_4": "12/07/26", "journey_arr_date_5": "13/07/26", "journey_arr_date_6": "13/07/26", "journey_arr_time_1": "17:20", "journey_arr_time_2": "05:30", "journey_arr_time_3": "", "journey_arr_time_4": "15:20", "journey_arr_time_5": "03:30", "journey_arr_time_6": "04:40", "journey_dep_date_1": "08/07/26", "journey_dep_date_2": "08/07/26", "journey_dep_date_3": "09/07/26", "journey_dep_date_4": "12/07/26", "journey_dep_date_5": "12/07/26", "journey_dep_date_6": "13/07/26", "journey_dep_time_1": "16:40", "journey_dep_time_2": "17:25", "journey_dep_time_3": "05:40", "journey_dep_time_4": "13:50", "journey_dep_time_5": "15:30", "journey_dep_time_6": "03:40", "journey_start_from": "Opp. Women's Care Clinic, New Vasavi Nagar, Secunderabad ", "journey_ticket_no_1": "TS13UC5109", "journey_ticket_no_2": "2954885735", "journey_ticket_no_3": "KA01AH3985", "journey_ticket_no_4": "KA02AE8272", "journey_ticket_no_5": "4240844013", "journey_ticket_no_6": "TS34TB6845", "journey_total_amt_1": "102\\n\\n", "journey_total_amt_2": "1949.25", "journey_total_amt_3": "322", "journey_total_amt_4": "202", "journey_total_amt_5": "983", "journey_total_amt_6": "242", "total_journey_claim": "3800.25", "undertaking_station": "Secunderabad", "total_amount_claimed": "7356.25", "journey_arr_station_1": "Secunderabad Railway Station", "journey_arr_station_2": "K.S Railway Station ", "journey_arr_station_3": "DRDO Phase II RTC Hotel", "journey_arr_station_4": "SMVT Railway Station", "journey_arr_station_5": "Kacheguda Railway Station", "journey_arr_station_6": "Opp. Women's Care Clinic", "journey_dep_station_1": "Opp. Women's Care Clinic", "journey_dep_station_2": "Secunderabad Railway Station ", "journey_dep_station_3": "K.S Railway Station", "journey_dep_station_4": "DRDO Phase II RTC Hotel", "journey_dep_station_5": "SMVT Railway Station", "journey_dep_station_6": "Kacheguda Railway Station"}	2026-07-14 15:54:18.4196	2026-07-14 15:54:18.4196	Temporary Duty Claim_SUMIT KUMAR SAINI_2026-07-14	2026-07-14		2026-07-14 15:54:18.415	\N	1	\N	\N
612	7	7	Draft	{"vr_no": "", "during": "", "station": "Secunderabad", "cda_code": "25", "vr_class": "1", "authority": "ITSDC/Contingent Bill/", "bill_date": "2026-07-15", "cda_month": "", "signature": "", "exp_date_1": "2026-07-15", "exp_date_2": "", "exp_date_3": "", "payee_name": "", "cda_section": "100", "exp_account": "", "incurred_by": "ITSDC", "amount_words": "One Thousand Four Hundred and Forty", "exp_amount_1": "3490", "exp_amount_2": "", "exp_amount_3": "-2050", "passed_words": "", "payee_amount": "", "total_amount": "1440.00", "exp_details_1": "Reimbursement of Medical Claims i/r/o Miss Thaniya B. Nair,", "exp_details_2": " daughter of Shri Binu S. Nair, SAO / 98332709, IT &SDC, Secunderabad", "exp_details_3": "Already passed Rs.2050/- (DAK ID No: R61ANPB1232). ", "month_account": "", "passed_amount": "", "payee_ag_code": "", "authority_date": "", "payee_treasury": "", "name_designation": "BINU S NAIR, SAO", "class_code_c_plus": "", "class_code_r_plus": "", "class_code_c_minus": "", "class_code_r_minus": ""}	2026-07-15 13:48:40.33876	2026-07-15 13:49:41.773781	Contingent Bill_BINU S NAIR_2026-07-15	2026-07-14	Reimbursement of Medical Claims i/r/o Miss Thaniya B. Nair, daughter of Shri Binu S. Nair, SAO / 98332709. Total Amount Rs. 3490/-. Already passed Rs.2050/- (DAK ID No: R61ANPB1232). Balance Rs. 1440/- now claimed.\n	\N	\N	2	\N	contingent
614	23	6	Pending	{"amount": "3000/-", "appName": "A DEEPAK", "sigName": "A DEEPAK", "payLevel": "Level 8, Rs. 50500, Level 8 (GP 4800)", "dateField": "15 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "AAO"}	2026-07-15 15:22:53.024903	2026-07-15 15:22:53.024903	Newspaper_A DEEPAK_2026-07-15	2026-07-15		2026-07-15 15:22:53.022	\N	1	\N	\N
615	37	6	Pending	{"amount": "3000/-", "appName": "AMBER MURTUZA ANSARI", "sigName": "AMBER MURTUZA ANSARI", "payLevel": "Level 8, Rs. 50500", "dateField": "15 July 2026", "periodSel": "jan", "signature": "", "yearInput": "26", "designation": "AAO"}	2026-07-15 15:23:11.553869	2026-07-15 15:23:11.553869	Newspaper_AMBER MURTUZA ANSARI_2026-07-15	2026-07-15		2026-07-15 15:23:11.553	\N	1	\N	\N
\.


--
-- Data for Name: codeheads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.codeheads (id, code_head, description, created_at) FROM stdin;
1	00/045/07	Machinery and Equipment	2026-05-13 17:52:04.944405
2	00/045/08	ICT-Equipments	2026-05-13 17:52:04.944405
3	00/045/09	Furniture & Fixtures	2026-05-13 17:52:04.944405
4	00/094/28	Travel Expenses	2026-05-13 17:52:04.944405
5	00/094/30	Office Expenses	2026-05-13 17:52:04.944405
6	00/094/37	Rent for others	2026-05-13 17:52:04.944405
7	00/094/40	Repair and Maintenance	2026-05-13 17:52:04.944405
8	00/094/41	Other Revenue Exp	2026-05-13 17:52:04.944405
9	00/094/94	Digital Equipment	2026-05-13 17:52:04.944405
\.


--
-- Data for Name: dependents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.dependents (id, user_id, name, relationship, cghs_ben_id, dob, gender) FROM stdin;
5	23	ANVIKA MENON	DAUGHTER	\N	2020-07-30	Female
10	37	ZAHRA AMBER	DAUGHTER	\N	2022-02-24	Female
11	32	Somesula Veera Yamini Sudha	WIFE	\N	1994-01-09	Female
15	12	CVS NEERAJ NANDAN	SON	\N	1999-07-23	Male
16	8	ASHA NANDINI DEVI	WIFE	\N	1994-02-27	Female
17	8	CHINTADA JHANSI	MOTHER	\N	1973-02-02	Female
18	8	CHINTADA RAMA RAO	FATHER	\N	1967-07-15	Male
19	34	B SHARMILA	WIFE	\N	1994-03-28	Female
20	34	G CH SUBBAIAH	FATHER	\N	1960-01-01	Male
21	34	G VIJAYA LAKSHMI	MOTHER	\N	1968-09-07	Female
22	29	KAMSALI LAVANYA	WIFE	\N	1996-07-09	Female
23	29	K MUKUNDA CHARI	FATHER	\N	1958-12-27	Male
24	29	K SAVITHRI	MOTHER	\N	1967-04-28	Female
25	25	KORE VIDHATRI	DAUGHTER	\N	2025-03-20	Female
26	25	KORE VISHNU PRIYA	WIFE	\N	1996-12-27	Female
27	18	ANURADHA RAMACHANDRAN	WIFE	\N	1978-09-09	Female
28	18	RAMACHANDRAN ABHIRAMA SHANKAR	SON	\N	2012-08-16	Male
29	18	RAMACHANDRAN SIVARAMAN	SON	\N	2006-02-26	Male
30	11	SNEHA	DAUGHTER	\N	2000-04-12	Female
31	11	V.LAKSHMINARAYAN	HUSBAND	\N	1962-07-20	Male
32	5	A P HANUMANTHA REDDY	FATHER	\N	1969-03-01	Male
33	5	A P LALITHA	MOTHER	\N	1975-07-01	Female
34	5	P SAHITHI REDDY	WIFE	\N	1997-02-28	Female
35	10	P SARALA DEVI	WIFE	\N	1970-04-05	Female
36	10	P SNEHA	DAUGHTER	\N	1992-04-05	Female
37	10	P SRAVYA	DAUGHTER	\N	1995-06-04	Female
38	20	M.SHASHI SHREE	WIFE	\N	1975-10-22	Female
39	20	SHREYA GHOSH	DAUGHTER	\N	2010-08-15	Female
45	13	ANUSHREE SANTOSH	DAUGHTER	\N	2003-11-08	Female
46	13	ASHWIN SANTOSH CHANDRAN	SON	\N	2006-05-24	Male
47	13	SREEJA SANTOSH	WIFE	\N	1980-07-30	Female
48	24	SHAIK AMJAD ALI	FATHER-IN-LAW	\N	1988-12-23	Male
49	24	SHAIK FATHIMA	MOTHER-IN-LAW	\N	1988-12-23	Female
51	24	SHAIKSHANAWAZ AHMED	SON	\N	2017-03-20	Male
52	24	SHAIK TAHIREEN	DAUGHTER	\N	2012-12-29	Female
53	24	shaik tanveer	WIFE	\N	1993-01-01	Female
54	27	Akriti Srivastava	WIFE	\N	1994-07-23	Female
55	27	ANUJA SRIVASTAVA	MOTHER	\N	1967-08-01	Female
56	6	ISHIKA DE	DAUGHTER	\N	2005-04-07	Female
57	36	HEMLATA	MOTHER	\N	1981-11-28	Female
58	36	JYOTI	SISTER	\N	2000-01-01	Female
59	36	PUSHPENDRA	BROTHER	\N	2011-07-22	Male
60	36	RAM SINGH	FATHER	\N	1982-01-01	Male
61	19	K ABHISHIKTHA V SAGAR	SON	\N	2006-02-06	Male
62	19	RAGHUVEERA	HUSBAND	\N	1975-08-01	Male
63	19	T K LAKSHMI SATHYAVATHI	MOTHER	\N	1958-09-18	Female
64	19	T V NARASIMHA RAO	FATHER	\N	1956-11-12	Male
65	15	V RUTHVIK	SON	\N	2006-07-05	Male
68	17	V. LALITHA	MOTHER	\N	1946-07-01	Female
69	17	V.N.L.SUMANA	WIFE	\N	1982-09-03	Female
70	17	V SRIDA KEYURA	DAUGHTER	\N	2020-12-04	Female
71	17	V. VEDASAI MOUKTIKA	DAUGHTER	\N	2007-07-12	Female
72	26	MADISHETTY BHAVANA	WIFE	\N	1996-06-01	Female
73	26	VELISHALA KALYANI	MOTHER	\N	1975-06-06	Female
74	26	VELISHALA RAMESH	FATHER	\N	1966-11-22	Male
75	28	BANOTHU AMRU	FATHER	\N	1950-01-01	Male
78	28	NIDVITH BANOTHU	SON	\N	2020-07-29	Male
79	28	PRIYANKA BANOTHU	WIFE	\N	1998-08-27	Female
126	38	K Devadas Kumar	Father	20432272	1959-05-18	\N
76	28	BANOTHU MANGAMMA	Mother	6315922	1968-01-01	Female
106	7	THANUSHIYA B NAIR	Daughter	7029836	2006-04-05	\N
13	7	THANIYA B NAIR	Daughter	7029838	2000-04-22	Female
12	7	RENU K.S	Wife	7029834	1974-02-20	Female
77	28	KANISHK BANOTHU	Son	8555183	2023-01-05	Male
44	14	S. SUNITHA	Spouse	1709589	1972-07-15	Female
42	14	S. Keyur	Son	1709891	2002-08-30	Male
127	38	B Sulochana Rani	Mother	20432273	1963-08-18	\N
124	103	Dhriti Bhardwaj	Daughter	\N	2020-06-17	\N
123	103	Dharvi Bhardwaj	Daughter	\N	2026-03-17	\N
6	23	SARIMA GOPAL	Spouse	\N	1991-05-19	Female
125	103	Jyoti Sharma	Spouse	\N	1994-04-15	\N
40	16	R ADITYA	Son	8735955	2011-07-07	Male
41	16	R VIJAYA PRIYANKA	Wife	8735956	1984-08-16	Female
50	24	SHAIK MUSHEERA KOKAB	Daughter	4723704	2015-04-15	Female
14	12	C.VENKATA LAKSHMI	Wife	2588443	1973-12-27	Female
8	37	SHAKILA KHATOON	Mother	7086182	1971-02-12	Female
7	37	ALI MURTUZA ANSARI	Father	7086180	1962-01-11	Male
9	37	SHAMAILA TAHSIN	Wife	7086178	1993-08-16	Female
66	15	V. SREEDEVI	Wife	3256111	1976-05-15	Female
67	15	V VAMSHI	Son	3256117	2008-08-24	Male
\.


--
-- Data for Name: fwd_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.fwd_templates (id, template_name, description, file_path, created_by, created_at, folder_name) FROM stdin;
1	Briefcase	Briefcase	storage/fwd_templates/1.html	1	2026-05-26 12:35:53.214857	General
2	Briefcase	Briefcase	storage/fwd_templates/2.html	1	2026-05-26 12:49:08.947166	Briefcase
3	Briefcase	Briefcase	storage/fwd_templates/3.html	1	2026-05-26 12:49:21.751513	Briefcase
4	Relieving Report	\N	storage/fwd_templates/4.html	1	2026-06-19 17:04:21.265716	TD
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.menu_items (id, label, link, permission_required, parent_id, display_order) FROM stdin;
6	My Claims	/claims/my.html	can_submit_claims	12	1
4	All Claims	/admin/claims.html	can_manage_claims	12	2
7	Contingent Bills	/claims/new.html?type_id=7	can_manage_claims	12	3
8	Saved Contingent Bills	/admin/contingent_list.html	can_manage_claims	12	4
9	Saved Contingent Bills	/claims/contingent_list.html	can_submit_claims	12	5
3	Manage Users	/admin/users.html	can_manage_users	13	1
5	Manage Claim Types	/admin/templates.html	can_manage_claim_types	13	2
11	FWD Templates	/admin/fwd_templates.html	can_manage_claims	13	3
10	Office Settings	/admin/office_settings.html	can_manage_claims	13	4
1	Dashboard	/dashboard.html	\N	\N	1
12	Claims	#	\N	\N	2
13	Administration	#	can_manage_users	\N	3
2	My Profile	/profile.html	\N	\N	100
14	Letter Ref. Numbers	/admin/claim_ref_nos.html	can_manage_claims	13	5
15	Forwardings	/admin/forwardings.html	can_manage_claims	\N	13
16	Repository	#	can_view_repository	\N	15
17	Document Repository	/repository/index.html	can_view_repository	16	1
18	Review Queue	/repository/admin/review.html	can_manage_repository	16	2
\.


--
-- Data for Name: office_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.office_config (id, office_name, office_address, office_sub_address, city_state_pin, phone, email, fwd_ref_no, signatory_name, signatory_dept, logo_left_url, logo_right_url, updated_by, updated_at) FROM stdin;
1	OFFICE OF THE CDA ( IT & SDC)	Mornington Road, PAO(ORs)AOC Compound,	Trimulgherry, Secunderabad – 500 015.	\N	040-27742553/29805085	itsdcsec-cda@nic.in	IT&SDC/Estt/Vol-VI	Sr. Accounts Officer	(IT&SDC)	/admin/images/emblem.png	/admin/images/azadi.png	\N	2026-05-26 10:30:39.256439
2	OFFICE OF THE PCDA ( O)	Mornington Road, PAO(ORs)AOC Compound,	Trimulgherry, Secunderabad – 500 015.	\N	040-27742553/29805085	itsdcsec-cda@nic.in	IT&SDC/Estt/Vol-VI	Sr. Accounts Officer	(IT&SDC)	/admin/images/emblem.png	/admin/images/azadi.png	1	2026-05-26 12:50:11.731422
3	OFFICE OF THE CDA ( IT&SDC)	Mornington Road, PAO(ORs)AOC Compound,	Trimulgherry, Secunderabad – 500 015.	\N	040-27742553/29805085	itsdcsec-cda@nic.in	IT&SDC/Estt/Vol-VI	Sr. Accounts Officer	(IT&SDC)	/admin/images/emblem.png	/admin/images/azadi.png	1	2026-05-26 12:50:31.358042
4	OFFICE OF THE PCDA ( IT&SDC)	Mornington Road, PAO(ORs)AOC Compound,	Trimulgherry, Secunderabad – 500 015.	\N	040-27742553/29805085	itsdcsec-cda@nic.in	IT&SDC/Estt/Vol-VI	Sr. Accounts Officer	(IT&SDC)	/admin/images/emblem.png	/admin/images/azadi.png	1	2026-05-26 13:26:23.228305
5	OFFICE OF THE CDA ( IT&SDC)	Mornington Road, PAO(ORs)AOC Compound,	Trimulgherry, Secunderabad – 500 015.	\N	040-27742553/29805085	itsdcsec-cda@nic.in	IT&SDC/Estt/Vol-VI	Sr. Accounts Officer	(IT&SDC)	/admin/images/emblem.png	/admin/images/azadi.png	1	2026-05-26 15:38:02.35989
\.


--
-- Data for Name: office_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.office_settings (key, value, updated_at) FROM stdin;
fwd_note_address	The Officer in charge\nAdmin-Pay\nO/o the CDA Secunderabad\nNo. 1 Staff Road\nSecunderabad-09	2026-07-14 16:08:53.997321
fwd_note_ref	IT&SDC/Estt/Vol-VI	2026-07-14 16:08:53.998057
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, name, permissions, code, rank) FROM stdin;
1	Admin	{"can_manage_users": true, "can_manage_claims": true, "can_view_repository": true, "can_manage_repository": true, "can_manage_claim_types": true}	SYSADMIN	1
2	Individual	{"can_submit_claims": true}	INDIVIDUAL	99
3	Addn Cda	{"can_manage_claims": true, "can_submit_claims": true, "can_view_repository": true}	ADDN_CDA	3
4	GO	{"can_manage_claims": true, "can_submit_claims": true, "can_view_repository": true}	GO	4
5	SAO	{"can_manage_claims": true, "can_submit_claims": true, "can_view_repository": true}	SAO	5
6	AAO	{"can_manage_claims": true, "can_submit_claims": true, "can_view_repository": true}	AAO	6
7	Sr Auditor	{"can_manage_claims": true, "can_submit_claims": true, "can_view_repository": true}	SR_AUD	7
8	Auditor	{"can_manage_claims": true, "can_submit_claims": true, "can_view_repository": true}	AUDITOR	8
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, role_id, created_at, name, designation, email, personal_no, must_reset_password, storage_path, cghs_ben_id, address, mobile_no, basic_pay, orders_for_move, move_date, authority, gender, pay_level, last_login_at, last_active_at, gpf_ac_no, theme_pref, is_active) FROM stdin;
20	98336948	$2b$12$K1ZwWNZrlH/P8IqHvuMEhu.3OafG7PyTDXjIY5zWy611rT80KDROC	5	2026-05-13 17:10:00.253064	PARTHA GHOSH	SAO	\N	98336948	f	/storage/98336948/	\N	\N	\N	92700	\N	\N	\N	Male	10	2026-07-13 11:02:01.020856	2026-07-13 11:05:28.676467	\N		t
26	98345750	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	7	2026-05-13 17:10:00.259952	VELISHALA KARTHIK	SR AUDITOR	\N	98345750	t	/storage/98345750/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		f
12	98325986	$2b$12$OXI.HgsarPs.F7u1a5Ia2.6yC2T1j65V72kyPREW9f0CO3w.L5.k6	5	2026-05-13 17:10:00.240766	C S CHAKRAVARTHY	SAO	srinivaschavali.dad@hub.nic.in	98325986	f	/storage/98325986/	2288441	H No. 5-96/44, SAI CHANDRA COLONY, DAMMAIGUDA, HYDERABAD-500083	+919492863613	104400	\N	\N	\N	Male	10	2026-07-14 11:57:12.766817	2026-07-14 11:57:50.658006	0989031H		t
9	98347013	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	8	2026-05-13 17:10:00.235514	VIVEK KUMAR SINGH	AUDITOR	\N	98347013	t	/storage/98347013/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		t
27	98345759	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	7	2026-05-13 17:10:00.261142	SHIKHAR SRIVASTAVA	SR AUDITOR	\N	98345759	t	/storage/98345759/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		t
32	98345872	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	8	2026-05-13 17:10:00.266758	ANUGOLU SIVA RAMA KRISHNA	AUDITOR	\N	98345872	t	/storage/98345872/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		t
8	98345942	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	8	2026-05-13 17:10:00.233548	CHINTHADA SIVA PRASAD	AUDITOR	\N	98345942	t	/storage/98345942/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		t
34	98345944	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	8	2026-05-13 17:10:00.270041	GUNDAPANENI PAVAN KUMAR	AUDITOR	\N	98345944	t	/storage/98345944/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		t
35	98345979	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	2	2026-05-13 17:10:00.271152	KAMAL	STENO GRADE - II	\N	98345979	t	/storage/98345979/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		f
15	98335515	$2b$10$ZsePjI8dayHlOKKCwIesh.NW9dA3nr2MvzBc3MqZYVkVj02wRB6zy	5	2026-05-13 17:10:00.245882	V NAGA PRASAD	SAO	vnagaprasad.dad@gov.in	98335515	t	/storage/98335515/	3256102	\N	9618951807	101400	\N	\N	\N	Male	10	2026-06-30 11:13:14.926581	2026-06-30 11:27:34.606442	991678P		t
33	98345943	$2b$12$fVF2n9Je6y9g/eUcDDPj3.FdYHBBQZBHQeQ2HYwZ1cf7vLRjyYscW	8	2026-05-13 17:10:00.268782	BHOGYAM VINAY SAI TEJA	AUDITOR	\N	98345943	f	/storage/98345943/	7658331	Plot 29, Flat No. 201, Sai Srinivas Towers, Siripuri Colony, Kakaguda, Karkhana, Secunderabad, 500015, telangana	9550394742	\N	\N	\N	\N	Male	\N	2026-05-21 16:28:58.200898	2026-05-21 16:28:58.332468	\N		t
21	98340923	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	8	2026-05-13 17:10:00.25416	SUKHABOGHI GAUTHAM	AUDITOR	\N	98340923	t	/storage/98340923/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		t
6	98320323	$2b$12$JUqU7/1YekBG8vD5LCklN.ZVxeGGpfAs1JfSg1EPChg/L9.9tzTOO	5	2026-05-13 17:10:00.202628	SUBHENDU DE	SAO	subhendude.dad@gov.in	98320323	f	/storage/98320323/	\N	B-203 MEGHADRI HEIGHTS , YAPRAL , HYDERABAD, 500087	+919986606164	82600	Admin Order No 39	2026-11-06	ITSDC/Estt./ConfidentialLr Note #01-05	Male	10	2026-06-16 12:07:08.025823	2026-06-16 12:35:27.106388	994415		t
25	98345748	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	7	2026-05-13 17:10:00.258647	KORE VIKRAM	SR AUDITOR	\N	98345748	t	/storage/98345748/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		t
19	98336642	$2b$12$hzcw01D6e/RvLaY23zu.gOR7SWbYqvqTMf14uP2/On.xoPfhwmJH6	5	2026-05-13 17:10:00.251859	TANGELLA VANAJA	SAO	tvanaja.dad@gov.in	98336642	f	/storage/98336642/	1744722	Villa No:48, Oorjita Grand Vie - 2, Gundlapochampally, Hyd - 14	9441300769	95500	\N	\N	\N	Female	10	2026-06-24 17:00:20.888319	2026-06-24 17:08:54.158834	0993564H		t
11	98325354	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	4	2026-05-13 17:10:00.238734	N.V. GIRIJA	ACDA	\N	98325354	t	/storage/98325354/	\N	\N	\N	\N	\N	\N	\N	Female	\N	\N	\N	\N		t
10	98332365	$2b$12$0ySSQKRbM4EOlgWi08nFbOtxxgM03byzjJQzD1Ixn41YPi7dj8k9W	5	2026-05-13 17:10:00.237028	P BRAHMA REDDY	SAO	\N	98332365	t	/storage/98332365/	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		t
36	98346016	$2b$12$gQjZ3ijoqoH2w6dcclMoXuxkHzqm8utQxOQU9Ng71SlDyk/Wi/ZHq	2	2026-05-13 17:10:00.272254	SUMIT KUMAR SAINI	STENO GRADE - II	\N	98346016	f	/storage/98346016/	\N	\N	\N	27100	\N	2026-06-07	\N	Male	4	2026-07-14 15:26:49.699369	2026-07-14 15:54:22.343749	\N		t
18	98336575	$2b$12$.xB65UoNuinA8G414iAqouB.btW2lW8dxgiFh00zwCwkY3l0bQ1F6	5	2026-05-13 17:10:00.250746	N RAMACHANDRAN	SAO	nramachandran.dad@gov.in	98336575	f	/storage/98336575/	5072649	H.No.5-9-48/19, Plot No.19, Street No.4, Raghava Kalyan Estates, Yapral, Secunderabad-500087.	9440745550	98400	\N	\N	\N	Male	10	2026-07-10 12:07:23.58098	2026-07-10 12:10:38.468812	992670		t
37	98348067	$2b$12$/PkaBijBaUWjZZRSBCSWlOi2KslE7LThe/X8XYdsXTa5otOuacg.W	6	2026-05-13 17:10:00.273329	AMBER MURTUZA ANSARI	AAO	amberansari.dad@hub.nic.in	98348067	f	/storage/98348067/	7086176	c-62 DAD RESIDENTIAL COMPLEX, LEKHA NAGAR, KARKHANA, HYDERABAD, TELANGANA	9804225042	50500	\N	\N	\N	Male	8	2026-07-15 15:20:30.617778	2026-07-15 15:23:54.306978	\N		t
22	98341398	$2b$12$COQVBOnezYjI5IQCyUF5MOpR/he402HPVaIsf/zXqI2ZRpG4YpG3e	6	2026-05-13 17:10:00.255236	K V N PRASAD	AAO	\N	98341398	f	/storage/98341398/	\N	\N	9177779018	50500	44	2026-03-07	\N	Male	8	2026-07-15 14:21:19.222704	2026-07-15 15:55:00.849995	\N		t
104	srinath	$2b$12$sc/5eBb.VC9Ob.2A3uVYx.FYqSquJLaj97ywkqy/44o.w.XWBnxbq	4	2026-06-24 11:05:29.179385	Srinath T, IDAS	GO	mrsrinath.dad@gov.in	23IDTSRI	f	/storage/srinath/	8748394	Rudramma DAD transit facility, Kalasiguda, Secunderabad, Telangana 500003	08838137235	57800	1294	2026-11-06	\N	Male	10	2026-06-24 11:09:47.714403	2026-06-24 12:05:55.961637	\N		t
13	98333999	$2b$12$iprUXyvkWCz0oP8krQlVlO1bvqEX9V5MrSR5GCozgwwsmwMtSh5hu	5	2026-05-13 17:10:00.242733	SANTOSH CHANDRAN	SAO	santoshchandran25@gmail.com	98333999	f	/storage/98333999/	312551	D-3 DAD Residential Complex Karkhana Secunderabad Hyderabad SECUNDERABAD	9479463668	104000	\N	2026-10-05	ITSDC/Contingent Bill/	Male	10	2026-07-10 11:59:35.816291	2026-07-10 12:00:20.340739	990873	theme-slate	t
31	98345856	$2b$12$OY6COh700xRndsLUCkgnEO0SfofqTrcIUGqPm64skPGgk5.AtH29W	8	2026-05-13 17:10:00.265671	KONDREDDY SAI KIRAN REDDY	AUDITOR	skondreddy.dad@gov.in	98345856	f	/storage/98345856/	7480774	H No 14- 101, P & T colony, Dilsukhnagar, Hyderabad	9032653765	32900	\N	\N	\N	Male	5	2026-06-01 15:11:45.218019	2026-06-01 15:12:50.000785	\N		t
29	98345826	$2b$12$dLBSwibHEsyuqEuRvTu9dOdZqr2msrKb5r7WhBfv7gVVrEbHX1kfK	6	2026-05-13 17:10:00.263348	KAMMARA NAVEEN KUMAR	AAO	naveenkammara.dad@nic.in	98345826	f	/storage/98345826/	6552918	FLAT 201, MANOHAR ENCLAVE, KRISHI NAGAR, BOWENPALLY, SECUNDERABAD-500011	9989152052	50500	\N	\N	\N	Male	8	2026-07-10 11:01:43.477029	2026-07-10 11:03:33.469242	\N		t
16	98336522	$2b$12$2mJL9GOlOUbuCWUnP4CmOeW2tYjshTjbs7vuxovAK6/kvTUuG5fAS	5	2026-05-13 17:10:00.247571	R RAVEENDRA PRASAD	SAO	rraghupatruni.dad@gov.in	98336522	f	/storage/98336522/	8735954	Flat No A-307, Mythri's the town, Shaili Gardens, JawaharNagar, yapral	8074896042	101400	\N	\N	ITSDC/Contingent Bill/	Male	10	2026-07-14 15:26:29.750928	2026-07-14 15:29:49.345398	\N	theme-ocean	t
17	98336528	$2b$12$zPy.JesYYCMdhctDnSTkl.eCKKLa4ZTdgD6srib4dYYgkR69NqGeG	5	2026-05-13 17:10:00.249368	V UDAYA KIRAN	SAO	\N	98336528	f	/storage/98336528/	3454375	#21North, H.No:1-4-218/PE/21, Praveen Enclave, Kapra, Hyderabad-500062	\N	101400	\N	\N	\N	Male	10	2026-07-14 12:22:02.420005	2026-07-14 12:25:00.021482	992324Y		t
30	98345854	$2b$12$.CYc44yf9VNLOFGwCKCInuENdU9zOLOqma70BQqHenKbAGYQnZlrC	8	2026-05-13 17:10:00.264422	YALLASIRI P V S PRASAD	AUDITOR	PRASADYALLASIRI.DAD@GOV.IN	98345854	f	/storage/98345854/	7629336	FLAT NO: 201, RATNA RESIDENCY, PLOT 119, SHARADA NAGAR, MYSTRY PLACE, MALKAJGIRI	9160872197	32900	\N	\N	\N	Male	5	2026-05-18 17:12:49.59738	2026-05-18 17:17:15.257673	\N	theme-amber	t
5	98345722	$2b$12$ogprlwIX1Un9ayjRTB1/9O5yoXJFb07iebK9TdLjhqfCYgIU0EF6C	6	2026-05-13 17:10:00.195317	P AMARNATH REDDY	AAO	\N	98345722	f	/storage/98345722/	\N	\N	\N	50500	252	\N	\N	Male	8	2026-07-10 10:54:55.407723	2026-07-10 12:12:42.69976	\N		t
23	98343170	$2b$12$Ayw2saD4K5vzoJ8QW3m6R.Tbym6jZpYJCseN1DNkcDlXa2vzvXCsS	6	2026-05-13 17:10:00.256356	A DEEPAK	AAO	\N	98343170	f	/storage/98343170/	\N	\N	\N	50500, Level 8 (GP 4800)	\N	\N	\N	Male	8	2026-07-15 14:33:35.960359	2026-07-15 15:24:02.232246	\N	theme-ocean	t
103	dhruv	$2b$12$2E6dqugW0zGvUxqSQMwNGOE8Kv3yFAckrsVy/.N2u5qxq8zqBmvGO	6	2026-05-26 16:40:26.505178	Dhruv Bhardwaj	AAO	dhruv.dad@gov.in	98347760	f	/storage/dhruv/	\N	Plot No. 24 Ravi Cooperative Society Tirumalgiri, Secundarabad - 500015	9729600336	50500	17	2026-06-19	CGDA Mech/IUT&S/985/Sys AuditDt.19/06/2026	Male	8	2026-07-15 13:22:23.528255	2026-07-15 13:22:30.271016	\N		t
14	98334027	$2b$12$niQ2t/ar/z/S1OLGk8cLt.X7d/FLZ6BxxOOZsgsBbrJYGpw6bVege	6	2026-05-13 17:10:00.244088	S VIJAYA BHASKAR RAO	AAO	sambarajuvijay.dad@nic.in	98334027	f	/storage/98334027/	1709588	2-2-1105/82 royal residency flat 303 street no 9 tilaknagar hyderabad-500044	9177779018	85100	\N	\N	\N	Male	9	2026-07-14 12:16:19.211956	2026-07-14 12:17:47.84954	\N		t
39	siva	$2b$12$dc20a8VSNtlOTgE68pFtNu3yFVdLT7sCS0Ylsk3ROesy.ILlxKe4K	3	2026-05-13 17:10:00.275726	K M SIVA SHANKAR	Addn Cda	\N	111111	f	/storage/111111/	\N	114 A Rostrevor Gardens, Teynampet, Chennai	\N	123100	44	2026-03-07	ITSDC/Contingent Bill/	Male	13	2026-07-14 14:20:05.153974	2026-07-14 14:20:29.661826	\N		t
7	98332709	$2b$12$aYalipaP1NYH6idGT/mCseW1PBD42NyKGwWtLFDiJa/YdPT9GIIva	5	2026-05-13 17:10:00.23138	BINU S NAIR	SAO	binusnair.dad@hub.nic.in	98332709	f	/storage/98332709/	7029832	TC 95/2378, KVRA-174, Thanoos, Ayyankali Road, Kannammoola, Thiruvananthapuram 695011	9447322538	101400	\N	\N	ITSDC/Contingent Bill/	Male	10	2026-07-15 13:41:48.368528	2026-07-15 13:49:43.77269	991585	theme-amber	t
1	admin	$2b$10$ZsePjI8dayHlOKKCwIesh.NW9dA3nr2MvzBc3MqZYVkVj02wRB6zy	1	2026-05-04 11:08:25.624556	System Admin	\N	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	ITSDC/Contingent Bill/Telephone	Male	\N	2026-07-15 14:19:44.060045	2026-07-15 14:19:54.37238	\N	theme-amber	t
106	prithvi	$2b$12$vApzROO8PDWvBqc/slvN/OzioOFOw3yZJ14Qez4nZbtAxdARAm1Sy	8	2026-07-14 16:34:07.089308	Prithvi Prasad	Auditor	\N	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	Male	\N	\N	\N	\N		t
105	98321463	$2b$12$wbOXbxM9OkWhw89mjA0EbOJ8eHktKn85y0jCua4rWuqW7QUMWS7GG	5	2026-07-09 16:06:10.192991	K RAMADEVI	SAO	kanalaramadevi.dad@hub.nic.in	98321463	f	/storage/98321463/	1744607	H.No.5-3-49/4, Road No.1, Gautami Nagar, Vanasthalipuram - 500 070	9440498468	101400	\N	\N	\N	Female	10	2026-07-15 14:20:28.972434	2026-07-15 14:20:35.703503	00991864		t
38	98352779	$2b$12$SfRObOuqI5Fox/u4YRsSsuCfQudvS1cNncWo.vfR5dLKmWATC8Zfy	8	2026-05-13 17:10:00.274429	KONGALA NORIS ANUDEEP	AUDITOR	noriskongala.dad@gov.in	98352779	f	/storage/98352779/	20432271	1-7-C9, Flat no. G-4, Sri Srinivasa palace, South kamala nagar, Moula ali, secunderabad - 500062	9052250093	33900	\N	\N	\N	Male	5	2026-07-09 17:11:13.019418	2026-07-09 17:11:33.097818	\N		t
24	98345652	$2b$12$NPUFV7n6B.FtpaFpqlJlv.3uw2bjVKHILh8ZfXZGrZjy3P38JfK06	7	2026-05-13 17:10:00.257488	SHAIK NASEER AHMED	SR AUDITOR	shaiknaseerahmed.dad@hub.nic.in	98345652	f	/storage/98345652/	4723700	c 46 DAD quarters Secundertabad 500015	9014148589	46200	\N	\N	\N	Male	6	2026-06-24 15:02:36.993925	2026-06-24 15:25:00.427489	\N		t
28	98345805	$2b$12$3bGbKNE0.58i67hPNdd.quRBER5C.0Uqizpxyc7EwLjit6nUfJhya	7	2026-05-13 17:10:00.262269	VIJAY KUMAR B	SR AUDITOR	vijaykumarb.dad@hub.nic.in	98345805	f	/storage/98345805/	6315916	Quarter NO B-59, DAD Residential Complex, Lekhanagar, Karkhana, Secunderabad-500015	9949702821	\N	\N	\N	\N	Male	\N	2026-05-21 09:41:12.977043	2026-05-21 10:14:22.450526	\N		t
\.


--
-- Data for Name: ward_entitlement_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ward_entitlement_rules (id, min_pay, max_pay, ward_type, created_at, updated_at) FROM stdin;
121	0	36500	General	2026-05-26 13:15:18.657793	2026-05-26 13:15:18.657793
122	36501	50500	Semi-Private	2026-05-26 13:15:18.657793	2026-05-26 13:15:18.657793
123	50501	99999999	Private	2026-05-26 13:15:18.657793	2026-05-26 13:15:18.657793
\.


--
-- Name: audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_log_id_seq', 923, true);


--
-- Name: bill_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bill_files_id_seq', 598, true);


--
-- Name: claim_type_ref_nos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.claim_type_ref_nos_id_seq', 13, true);


--
-- Name: claim_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.claim_types_id_seq', 13, true);


--
-- Name: claims_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.claims_id_seq', 615, true);


--
-- Name: codeheads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.codeheads_id_seq', 9, true);


--
-- Name: dependents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.dependents_id_seq', 127, true);


--
-- Name: fwd_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.fwd_templates_id_seq', 4, true);


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 18, true);


--
-- Name: office_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.office_config_id_seq', 5, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.roles_id_seq', 8, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 106, true);


--
-- Name: ward_entitlement_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ward_entitlement_rules_id_seq', 123, true);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: bill_files bill_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_files
    ADD CONSTRAINT bill_files_pkey PRIMARY KEY (id);


--
-- Name: claim_type_ref_nos claim_type_ref_nos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_type_ref_nos
    ADD CONSTRAINT claim_type_ref_nos_pkey PRIMARY KEY (id);


--
-- Name: claim_types claim_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_types
    ADD CONSTRAINT claim_types_name_key UNIQUE (name);


--
-- Name: claim_types claim_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_types
    ADD CONSTRAINT claim_types_pkey PRIMARY KEY (id);


--
-- Name: claims claims_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_pkey PRIMARY KEY (id);


--
-- Name: codeheads codeheads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.codeheads
    ADD CONSTRAINT codeheads_pkey PRIMARY KEY (id);


--
-- Name: dependents dependents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependents
    ADD CONSTRAINT dependents_pkey PRIMARY KEY (id);


--
-- Name: fwd_templates fwd_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fwd_templates
    ADD CONSTRAINT fwd_templates_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: office_config office_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_config
    ADD CONSTRAINT office_config_pkey PRIMARY KEY (id);


--
-- Name: office_settings office_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_settings
    ADD CONSTRAINT office_settings_pkey PRIMARY KEY (key);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_personal_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_personal_no_key UNIQUE (personal_no);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: ward_entitlement_rules ward_entitlement_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ward_entitlement_rules
    ADD CONSTRAINT ward_entitlement_rules_pkey PRIMARY KEY (id);


--
-- Name: idx_claim_type_ref_nos_type_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_claim_type_ref_nos_type_date ON public.claim_type_ref_nos USING btree (claim_type_id, valid_from DESC);


--
-- Name: audit_log audit_log_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE CASCADE;


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bill_files bill_files_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_files
    ADD CONSTRAINT bill_files_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES public.claims(id) ON DELETE CASCADE;


--
-- Name: claim_type_ref_nos claim_type_ref_nos_claim_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_type_ref_nos
    ADD CONSTRAINT claim_type_ref_nos_claim_type_id_fkey FOREIGN KEY (claim_type_id) REFERENCES public.claim_types(id) ON DELETE CASCADE;


--
-- Name: claim_type_ref_nos claim_type_ref_nos_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claim_type_ref_nos
    ADD CONSTRAINT claim_type_ref_nos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: claims claims_parent_claim_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_parent_claim_id_fkey FOREIGN KEY (parent_claim_id) REFERENCES public.claims(id) ON DELETE SET NULL;


--
-- Name: claims claims_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_type_id_fkey FOREIGN KEY (type_id) REFERENCES public.claim_types(id) ON DELETE RESTRICT;


--
-- Name: claims claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.claims
    ADD CONSTRAINT claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: dependents dependents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dependents
    ADD CONSTRAINT dependents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: fwd_templates fwd_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fwd_templates
    ADD CONSTRAINT fwd_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: menu_items menu_items_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.menu_items(id);


--
-- Name: office_config office_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.office_config
    ADD CONSTRAINT office_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict GhqPjTqiBaYVdFxCg2Sg2cN9q7kw2gqUZLDA2RjNycS5XMXzPzFzWe0RWVh1fb2

