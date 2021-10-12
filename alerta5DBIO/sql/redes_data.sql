--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.24
-- Dumped by pg_dump version 9.5.24

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: redes; Type: TABLE DATA; Schema: public; Owner: alerta5
--

COPY public.redes (tabla_id, id, nombre, public, public_his_plata) FROM stdin;
red_ana_pluvio	3	red ANA Brasil	t	f
red_inta	6	red INTA	t	f
alturas_chapeco	11	Foz do Chapeco	t	f
alturas_dinac	12	red hidrológica DINAC - Paraguay	t	f
presas	18	Embalses ONS Brasil	t	f
red_ana_hidro	19	red ANA Brasil. Estaciones hidrologicas	t	f
red_areco	4	red cuenca Areco	f	f
alturas_genica	9	limnígrafos CONAE	f	f
lujan_api	13	red hidrológica cuenca Luján - UNLU	f	f
emas_sinarame	14	red EMAs SINARAME -SSRH	f	f
otros_registros	20	otros registros	t	f
estaciones_virtuales	21	Estaciones Virtuales	f	f
alturas_bdhi	5	Red Hidrológica Nacional - SSRH	t	t
alturas_prefe	10	escalas Prefectura Nacional	t	t
alturas_varios	17	Otras redes hidrológicas	t	t
estaciones_pvnymm	22	Estaciones mareográficas - PVNyMM	t	t
estaciones_shn	23	Mareógrafos SHN	t	t
red_acumar	1	red ACUMAR	t	t
estaciones_salto_grande	15	red hidrometeorológica represa Salto Grande	t	t
emas	16	red EMAs Entre Ríos	t	t
red_salado	8	red Salado Santa Fe	t	t
stations	2	red SYNOP SMN	f	f
puntos_FDelta	25	puntos del frente del Delta del Paraná/Uruguay	t	f
lujan_pluvio	26	Red hidrometeorológica UNLU cuenca Luján	f	f
voluntarios_unlu	24	Red comunitaria de pluviómetros de UNLU	t	f
stations_cdp	7	red SYNOP países limítrofes	f	f
sat2	27	RHN - SAT	t	t
whos_plata	28	OMM - WHOS Cuenca del Plata	t	f
ina_delta	32	red INA Delta y AMBA	t	t
MCH_DMH_PY	29	DMH Paraguay	f	f
sissa	30	SISSA - CRC/SAS	f	f
\.


--
-- Name: redes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alerta5
--

SELECT pg_catalog.setval('public.redes_id_seq', 32, true);


--
-- PostgreSQL database dump complete
--

