--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.25
-- Dumped by pg_dump version 12.9 (Ubuntu 12.9-0ubuntu0.20.04.1)

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
-- Name: paises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.paises (
    id integer NOT NULL,
    nombre character varying NOT NULL,
    abrev character varying NOT NULL,
    wmdr_name character varying,
    wmdr_notation character varying,
    wmdr_uri character varying
);


--
-- Data for Name: paises; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.paises (id, nombre, abrev, wmdr_name, wmdr_notation, wmdr_uri) FROM stdin;
5	Argentina	ARGENTINA	Argentina	ARG	http://codes.wmo.int/wmdr/TerritoryName/ARG
1	Brasil	BRASIL	Brazil	BRA	http://codes.wmo.int/wmdr/TerritoryName/BRA
4	Bolivia	BOLIVIA	Bolivia, Plurinational State of	BOL	http://codes.wmo.int/wmdr/TerritoryName/BOL
2	Paraguay	PARAGUAY	Paraguay	PRY	http://codes.wmo.int/wmdr/TerritoryName/PRY
3	Uruguay	URUGUAY	Uruguay	URY	http://codes.wmo.int/wmdr/TerritoryName/URY
\.


--
-- Name: paises paises_abrev_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paises
    ADD CONSTRAINT paises_abrev_key UNIQUE (abrev);


--
-- Name: paises paises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.paises
    ADD CONSTRAINT paises_pkey PRIMARY KEY (id);


--
-- Name: TABLE paises; Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON TABLE public.paises FROM PUBLIC;
REVOKE ALL ON TABLE public.paises FROM alerta5;
GRANT ALL ON TABLE public.paises TO alerta5;
GRANT SELECT ON TABLE public.paises TO sololectura;
GRANT SELECT ON TABLE public.paises TO actualiza;


--
-- PostgreSQL database dump complete
--

