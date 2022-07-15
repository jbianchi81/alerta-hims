--
-- PostgreSQL database dump
--

-- Dumped from database version 12.8 (Ubuntu 12.8-0ubuntu0.20.04.1)
-- Dumped by pg_dump version 12.8 (Ubuntu 12.8-0ubuntu0.20.04.1)

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
-- Name: colecciones_raster; Type: TABLE; Schema: public; Owner: leyden
--

CREATE TABLE public.colecciones_raster (
    id integer NOT NULL,
    nombre character varying,
    ubicacion character varying,
    patron_nombre character varying,
    resolucion real,
    proyeccion character varying,
    formato character varying,
    fuente character varying,
    descripcion character varying,
    def_date timestamp without time zone,
    sensor_id integer,
    publicar boolean DEFAULT true,
    public boolean DEFAULT true,
    is_utc boolean,
    url character varying
);


--
-- Name: colecciones_raster_id_seq; Type: SEQUENCE; Schema: public; Owner: leyden
--

CREATE SEQUENCE public.colecciones_raster_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: colecciones_raster_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leyden
--

ALTER SEQUENCE public.colecciones_raster_id_seq OWNED BY public.colecciones_raster.id;


--
-- Name: gridded; Type: TABLE; Schema: public; Owner: leyden
--

CREATE TABLE public.gridded (
    col_id integer NOT NULL,
    reference character varying NOT NULL,
    path integer,
    "row" integer,
    timestart timestamp without time zone NOT NULL,
    timeend timestamp without time zone,
    version integer,
    id bigint NOT NULL,
    date timestamp without time zone
);


--
-- Name: gridded_id_seq; Type: SEQUENCE; Schema: public; Owner: leyden
--

CREATE SEQUENCE public.gridded_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gridded_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leyden
--

ALTER SEQUENCE public.gridded_id_seq OWNED BY public.gridded.id;


--
-- Name: sensores_remotos; Type: TABLE; Schema: public; Owner: leyden
--

CREATE TABLE public.sensores_remotos (
    id integer NOT NULL,
    nombre character varying NOT NULL
);


--
-- Name: sensores_remotos_id_seq; Type: SEQUENCE; Schema: public; Owner: leyden
--

CREATE SEQUENCE public.sensores_remotos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sensores_remotos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: leyden
--

ALTER SEQUENCE public.sensores_remotos_id_seq OWNED BY public.sensores_remotos.id;


--
-- Name: colecciones_raster id; Type: DEFAULT; Schema: public; Owner: leyden
--

ALTER TABLE ONLY public.colecciones_raster ALTER COLUMN id SET DEFAULT nextval('public.colecciones_raster_id_seq'::regclass);


--
-- Name: gridded id; Type: DEFAULT; Schema: public; Owner: leyden
--

ALTER TABLE ONLY public.gridded ALTER COLUMN id SET DEFAULT nextval('public.gridded_id_seq'::regclass);


--
-- Name: sensores_remotos id; Type: DEFAULT; Schema: public; Owner: leyden
--

ALTER TABLE ONLY public.sensores_remotos ALTER COLUMN id SET DEFAULT nextval('public.sensores_remotos_id_seq'::regclass);


--
-- Name: colecciones_raster colecciones_raster_id_key; Type: CONSTRAINT; Schema: public; Owner: leyden
--

ALTER TABLE ONLY public.colecciones_raster
    ADD CONSTRAINT colecciones_raster_id_key UNIQUE (id);


--
-- Name: gridded gridded_col_id_timestart_path_row_version_date_key; Type: CONSTRAINT; Schema: public; Owner: leyden
--

ALTER TABLE ONLY public.gridded
    ADD CONSTRAINT gridded_col_id_timestart_path_row_version_date_key UNIQUE (col_id, timestart, path, "row", version, date);


--
-- Name: sensores_remotos sensores_remotos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: leyden
--

ALTER TABLE ONLY public.sensores_remotos
    ADD CONSTRAINT sensores_remotos_nombre_key UNIQUE (nombre);


--
-- Name: sensores_remotos sensores_remotos_pkey; Type: CONSTRAINT; Schema: public; Owner: leyden
--

ALTER TABLE ONLY public.sensores_remotos
    ADD CONSTRAINT sensores_remotos_pkey PRIMARY KEY (id);


--
-- Name: colecciones_raster colecciones_raster_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leyden
--

ALTER TABLE ONLY public.colecciones_raster
    ADD CONSTRAINT colecciones_raster_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensores_remotos(id);


--
-- Name: gridded gridded_col_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: leyden
--

ALTER TABLE ONLY public.gridded
    ADD CONSTRAINT gridded_col_id_fkey FOREIGN KEY (col_id) REFERENCES public.colecciones_raster(id);


--
-- PostgreSQL database dump complete
--

