-- ~ pg_dump -d meteorology -U jbianchi -h correo.ina.gob.ar -p 9049 -t users -t user_roles > users.sql

--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.24
-- Dumped by pg_dump version 12.6 (Ubuntu 12.6-0ubuntu0.20.04.1)

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

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: alerta5
--

CREATE TABLE public.user_roles (
    name character varying NOT NULL
);


-- ~ ALTER TABLE public.user_roles OWNER TO alerta5;

--
-- Name: users; Type: TABLE; Schema: public; Owner: alerta5
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying NOT NULL,
    pass_enc bytea,
    role character varying,
    password character varying,
    token bytea
);


-- ~ ALTER TABLE public.users OWNER TO alerta5;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: alerta5
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


-- ~ ALTER TABLE public.users_id_seq OWNER TO alerta5;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: alerta5
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: alerta5
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: alerta5
--

COPY public.user_roles (name) FROM stdin;
reader
writer
admin
public
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: alerta5
--

COPY public.users (id, name, pass_enc, role, password, token) FROM stdin;
10	public	\N	public	\N	\N
5	ina	\\x61383761323165663239636334373062653161623863373136653265396665366362336630353732333432383738323764643730333135636338323935613731	reader	ina1620	\\x63653365373234313834326631656534303132393235646530343264333330646133666163353564383732633363626336386533353433313131303666653663
7	jbianchi	\\x63333839316534663233633732613734363438316130326434326331643961346538356638623066386438346362393930346133393331663965646634323435	admin	\N	\\x64313336636534323935633262336537363033353266363434353730373433623062303662396464653864626533323638656661333831343966326334623863
4	actualiza	\\x64373638343363383033383862643038323635373734633038666237666463363663316263613538376565616164343039663134613638306236366239356232	writer	alturas	\\x61336530376263363739303832346532333562623764366531633663333230636363636331373339353631333737663065326536323562626666376563653639
8	lgiordano	\\x34366331613031303330626134643465313465626666663236633062383838343236363738366139323562336563346537363834613134646338623861646362	writer	\N	\\x61643638363037643936623466376539336137643165646234626231386234376264653763346438316631356633393366663836653863343739363536313337
9	gcontreras	\\x66643433623539333365333838613136303061303664643735346166343566383831346437343834643663623238666361666166333730366537326665646162	writer	\N	\\x36393130356361666336363563383761323330363334353433663336623637636338393239633761383130373532326664643365383962353833353937653533
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alerta5
--

SELECT pg_catalog.setval('public.users_id_seq', 10, true);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: alerta5
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (name);


--
-- Name: users users_id_key; Type: CONSTRAINT; Schema: public; Owner: alerta5
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_key UNIQUE (id);


--
-- Name: users users_name_key; Type: CONSTRAINT; Schema: public; Owner: alerta5
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_name_key UNIQUE (name);


--
-- Name: users users_role_fkey; Type: FK CONSTRAINT; Schema: public; Owner: alerta5
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_fkey FOREIGN KEY (role) REFERENCES public.user_roles(name);


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: alerta5
--

-- ~ REVOKE ALL ON TABLE public.user_roles FROM PUBLIC;
-- ~ REVOKE ALL ON TABLE public.user_roles FROM alerta5;
-- ~ GRANT ALL ON TABLE public.user_roles TO alerta5;
-- ~ GRANT SELECT ON TABLE public.user_roles TO actualiza;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: alerta5
--

-- ~ REVOKE ALL ON TABLE public.users FROM PUBLIC;
-- ~ REVOKE ALL ON TABLE public.users FROM alerta5;
-- ~ GRANT ALL ON TABLE public.users TO alerta5;
-- ~ GRANT SELECT,INSERT,UPDATE ON TABLE public.users TO actualiza;


--
-- Name: SEQUENCE users_id_seq; Type: ACL; Schema: public; Owner: alerta5
--

-- ~ REVOKE ALL ON SEQUENCE public.users_id_seq FROM PUBLIC;
-- ~ REVOKE ALL ON SEQUENCE public.users_id_seq FROM alerta5;
-- ~ GRANT ALL ON SEQUENCE public.users_id_seq TO alerta5;
-- ~ GRANT ALL ON SEQUENCE public.users_id_seq TO actualiza;


--
-- PostgreSQL database dump complete
--

