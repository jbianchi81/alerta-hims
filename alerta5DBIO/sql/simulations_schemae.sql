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

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: calibrados_grupos; Type: TABLE; Schema: public; Owner: jbianchi
--

CREATE TABLE public.calibrados_grupos (
    id integer NOT NULL,
    nombre character varying
);

--
-- Name: calibrados_grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: jbianchi
--

CREATE SEQUENCE public.calibrados_grupos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: calibrados_grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: jbianchi
--

ALTER SEQUENCE public.calibrados_grupos_id_seq OWNED BY public.calibrados_grupos.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: jbianchi
--

ALTER TABLE ONLY public.calibrados_grupos ALTER COLUMN id SET DEFAULT nextval('public.calibrados_grupos_id_seq'::regclass);


--
-- Name: calibrados_grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: jbianchi
--

ALTER TABLE ONLY public.calibrados_grupos
    ADD CONSTRAINT calibrados_grupos_pkey PRIMARY KEY (id);

GRANT SELECT ON TABLE public.calibrados_grupos TO actualiza;


--
-- Name: calibrados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calibrados (
    id integer NOT NULL,
    nombre character varying(40),
    modelo character varying(40),
    parametros real[],
    estados_iniciales real[],
    activar boolean,
    selected boolean DEFAULT false,
    out_id integer,
    area_id integer,
    in_id integer[],
    model_id integer,
    tramo_id integer,
    dt interval DEFAULT '1 day'::interval NOT NULL,
    t_offset interval DEFAULT '09:00:00'::interval NOT NULL,
    public boolean DEFAULT false,
    grupo_id integer,
    CONSTRAINT calibrados_in_id_check CHECK (public.check_key_tab(in_id, 'estaciones'::character varying, 'unid'::character varying))
);

--
-- Name: planes; Type: TABLE; Schema: public; Owner: alerta5
--

CREATE TABLE public.planes (
    id integer NOT NULL,
    nombre character varying,
    def_warmup_days integer DEFAULT '-90'::integer,
    def_horiz_days integer DEFAULT 7,
    cal_ids integer[] NOT NULL,
    def_t_offset interval DEFAULT '00:00:00'::interval
);

--
-- Name: planes_corridas; Type: TABLE; Schema: public; Owner: alerta5
--

CREATE TABLE public.planes_corridas (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    series_n integer DEFAULT 1
);

--
-- Name: corridas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corridas (
    cal_id integer NOT NULL,
    date timestamp without time zone NOT NULL,
    id integer NOT NULL,
    series_n integer DEFAULT 1,
    plan_cor_id integer
);


--
-- Name: modelos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modelos (
    id integer NOT NULL,
    nombre character varying(40),
    parametros text[],
    estados text[],
    n_estados integer,
    n_parametros integer,
    script text,
    tipo character varying DEFAULT 'P-Q'::character varying,
    def_var_id integer DEFAULT 4 NOT NULL,
    def_unit_id integer DEFAULT 10 NOT NULL
);


--
-- Name: pronosticos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pronosticos (
    id integer NOT NULL,
    cor_id integer NOT NULL,
    series_id integer NOT NULL,
    timestart timestamp without time zone NOT NULL,
    timeend timestamp without time zone NOT NULL,
    qualifier character varying(50) DEFAULT 'main'::character varying
);


--
-- Name: valores_prono_num; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.valores_prono_num (
    prono_id integer NOT NULL,
    valor real
);


--
-- Name: cal_estados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cal_estados (
    id integer NOT NULL,
    cal_id integer NOT NULL,
    model_id integer DEFAULT 1 NOT NULL,
    orden integer NOT NULL,
    valor real NOT NULL
);


--
-- Name: cal_estados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cal_estados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cal_estados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cal_estados_id_seq OWNED BY public.cal_estados.id;


--
-- Name: cal_pars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cal_pars (
    id integer NOT NULL,
    cal_id integer NOT NULL,
    valor real NOT NULL,
    orden integer DEFAULT 1,
    model_id integer DEFAULT 1
);


--
-- Name: cal_pars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cal_pars_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cal_pars_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cal_pars_id_seq OWNED BY public.cal_pars.id;


--
-- Name: cal_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cal_stats (
    id integer NOT NULL,
    cal_id integer NOT NULL,
    model_id integer NOT NULL,
    timestart timestamp without time zone,
    timeend timestamp without time zone,
    n_cal integer,
    rnash_cal real[],
    rnash_val real[],
    beta real,
    omega real,
    repetir integer,
    iter integer,
    rmse real[],
    stats_json json,
    pvalues real[],
    calib_period timestamp without time zone[]
);


--
-- Name: cal_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cal_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cal_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cal_stats_id_seq OWNED BY public.cal_stats.id;


--
-- Name: calibrados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calibrados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calibrados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calibrados_id_seq OWNED BY public.calibrados.id;


--
-- Name: calibrados_out; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calibrados_out (
    id integer NOT NULL,
    cal_id integer NOT NULL,
    out_id integer NOT NULL
);


--
-- Name: calibrados_out_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calibrados_out_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calibrados_out_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calibrados_out_id_seq OWNED BY public.calibrados_out.id;


--
-- Name: corridas_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corridas_data (
    cor_id integer NOT NULL,
    data jsonb NOT NULL
);


--
-- Name: corridas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.corridas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: corridas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.corridas_id_seq OWNED BY public.corridas.id;

--
-- Name: planes_id_seq; Type: SEQUENCE; Schema: public; Owner: alerta5
--

CREATE SEQUENCE public.planes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: id; Type: DEFAULT; Schema: public; Owner: alerta5
--

ALTER TABLE ONLY public.planes ALTER COLUMN id SET DEFAULT nextval('public.planes_id_seq'::regclass);


--
-- Name: planes_pkey; Type: CONSTRAINT; Schema: public; Owner: alerta5
--

ALTER TABLE ONLY public.planes
    ADD CONSTRAINT planes_pkey PRIMARY KEY (id);


--
-- Name: TABLE planes; Type: ACL; Schema: public; Owner: alerta5
--

GRANT ALL ON TABLE public.planes TO actualiza;
GRANT SELECT ON TABLE public.planes TO sololectura;

--
-- Name: SEQUENCE planes_id_seq; Type: ACL; Schema: public; Owner: alerta5
--

GRANT ALL ON SEQUENCE public.planes_id_seq TO actualiza;

--
-- Name: planes_corridas_id_seq; Type: SEQUENCE; Schema: public; Owner: alerta5
--

CREATE SEQUENCE public.planes_corridas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.planes_corridas ALTER COLUMN id SET DEFAULT nextval('public.planes_corridas_id_seq'::regclass);

ALTER TABLE ONLY public.planes_corridas
    ADD CONSTRAINT planes_corridas_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.planes_corridas
    ADD CONSTRAINT planes_corridas_plan_id_date_key UNIQUE (plan_id, date);

ALTER TABLE ONLY public.planes_corridas
    ADD CONSTRAINT planes_corridas_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.planes(id);

REVOKE ALL ON TABLE public.planes_corridas FROM PUBLIC;
REVOKE ALL ON TABLE public.planes_corridas FROM alerta5;
GRANT ALL ON TABLE public.planes_corridas TO alerta5;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.planes_corridas TO actualiza;


REVOKE ALL ON SEQUENCE public.planes_corridas_id_seq FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.planes_corridas_id_seq FROM alerta5;
GRANT ALL ON SEQUENCE public.planes_corridas_id_seq TO alerta5;
GRANT ALL ON SEQUENCE public.planes_corridas_id_seq TO actualiza;


--
-- Name: estados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estados (
    id integer NOT NULL,
    model_id integer NOT NULL,
    nombre character varying NOT NULL,
    range_min real NOT NULL,
    range_max real NOT NULL,
    def_val real,
    orden integer DEFAULT 1
);


--
-- Name: estados_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estados_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estados_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estados_id_seq OWNED BY public.estados.id;


--
-- Name: forzantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forzantes (
    id integer NOT NULL,
    cal_id integer NOT NULL,
    series_table character varying NOT NULL,
    series_id integer NOT NULL,
    cal boolean DEFAULT false,
    orden integer DEFAULT 1,
    model_id integer DEFAULT 1,
    CONSTRAINT forzantes_check CHECK (public.check_key_tab(ARRAY[series_id], series_table, 'id'::character varying)),
    CONSTRAINT forzantes_series_table_check CHECK ((((series_table)::text = 'series'::text) OR ((series_table)::text = 'series_areal'::text)))
);


--
-- Name: forzantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.forzantes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: forzantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.forzantes_id_seq OWNED BY public.forzantes.id;


--
-- Name: modelos_forzantes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modelos_forzantes (
    id integer NOT NULL,
    model_id integer,
    orden integer DEFAULT 1,
    var_id integer,
    unit_id integer,
    nombre character varying,
    inst boolean DEFAULT true,
    tipo character varying DEFAULT 'areal'::character varying NOT NULL,
    required boolean DEFAULT true
);


--
-- Name: tramos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tramos (
    unid integer NOT NULL,
    nombre character varying,
    out_id integer,
    in_id integer,
    area_id integer,
    longitud real,
    geom public.geometry(LineString,4326),
    rio character varying
);


--
-- Name: modelos_forzantes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modelos_forzantes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modelos_forzantes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modelos_forzantes_id_seq OWNED BY public.modelos_forzantes.id;


--
-- Name: modelos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modelos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modelos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modelos_id_seq OWNED BY public.modelos.id;


--
-- Name: parametros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parametros (
    id integer NOT NULL,
    model_id integer,
    nombre character varying NOT NULL,
    lim_inf real,
    range_min real NOT NULL,
    range_max real NOT NULL,
    lim_sup real DEFAULT 'Infinity'::real,
    orden integer DEFAULT 1
);


--
-- Name: parametros_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parametros_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parametros_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parametros_id_seq OWNED BY public.parametros.id;


--
-- Name: pronosticos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pronosticos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pronosticos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pronosticos_id_seq OWNED BY public.pronosticos.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_estados ALTER COLUMN id SET DEFAULT nextval('public.cal_estados_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_pars ALTER COLUMN id SET DEFAULT nextval('public.cal_pars_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_stats ALTER COLUMN id SET DEFAULT nextval('public.cal_stats_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados ALTER COLUMN id SET DEFAULT nextval('public.calibrados_id_seq'::regclass);

ALTER TABLE ONLY public.calibrados
    ADD CONSTRAINT calibrados_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.calibrados_grupos(id);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados_out ALTER COLUMN id SET DEFAULT nextval('public.calibrados_out_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corridas ALTER COLUMN id SET DEFAULT nextval('public.corridas_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados ALTER COLUMN id SET DEFAULT nextval('public.estados_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forzantes ALTER COLUMN id SET DEFAULT nextval('public.forzantes_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos ALTER COLUMN id SET DEFAULT nextval('public.modelos_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_forzantes ALTER COLUMN id SET DEFAULT nextval('public.modelos_forzantes_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros ALTER COLUMN id SET DEFAULT nextval('public.parametros_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos ALTER COLUMN id SET DEFAULT nextval('public.pronosticos_id_seq'::regclass);


--
-- Name: cal_estados_cal_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_estados
    ADD CONSTRAINT cal_estados_cal_id_orden_key UNIQUE (cal_id, orden);


--
-- Name: cal_pars_cal_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_pars
    ADD CONSTRAINT cal_pars_cal_id_orden_key UNIQUE (cal_id, orden);


--
-- Name: cal_stats_cal_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_stats
    ADD CONSTRAINT cal_stats_cal_id_key UNIQUE (cal_id);


--
-- Name: calibrados_out_cal_id_out_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados_out
    ADD CONSTRAINT calibrados_out_cal_id_out_id_key UNIQUE (cal_id, out_id);


--
-- Name: calibrados_out_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados_out
    ADD CONSTRAINT calibrados_out_pkey PRIMARY KEY (id);


--
-- Name: calibrados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados
    ADD CONSTRAINT calibrados_pkey PRIMARY KEY (id);


--
-- Name: corridas_cal_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corridas
    ADD CONSTRAINT corridas_cal_id_date_key UNIQUE (cal_id, date);


--
-- Name: corridas_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corridas_data
    ADD CONSTRAINT corridas_data_pkey PRIMARY KEY (cor_id);


--
-- Name: corridas_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corridas
    ADD CONSTRAINT corridas_id_key UNIQUE (id);


--
-- Name: estados_model_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_model_id_orden_key UNIQUE (model_id, orden);


--
-- Name: forzantes_cal_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forzantes
    ADD CONSTRAINT forzantes_cal_id_orden_key UNIQUE (cal_id, orden);


--
-- Name: forzantes_cal_id_series_table_series_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forzantes
    ADD CONSTRAINT forzantes_cal_id_series_table_series_id_key UNIQUE (cal_id, series_table, series_id);


--
-- Name: modelos_forzantes_model_id_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_forzantes
    ADD CONSTRAINT modelos_forzantes_model_id_nombre_key UNIQUE (model_id, nombre);


--
-- Name: modelos_forzantes_model_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_forzantes
    ADD CONSTRAINT modelos_forzantes_model_id_orden_key UNIQUE (model_id, orden);


--
-- Name: modelos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos
    ADD CONSTRAINT modelos_nombre_key UNIQUE (nombre);


--
-- Name: modelos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos
    ADD CONSTRAINT modelos_pkey PRIMARY KEY (id);


--
-- Name: parametros_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros
    ADD CONSTRAINT parametros_id_key UNIQUE (id);


--
-- Name: parametros_model_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros
    ADD CONSTRAINT parametros_model_id_orden_key UNIQUE (model_id, orden);


--
-- Name: pronosticos_cor_id_series_id_timestart_timeend_qualifier_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos
    ADD CONSTRAINT pronosticos_cor_id_series_id_timestart_timeend_qualifier_key UNIQUE (cor_id, series_id, timestart, timeend, qualifier);


--
-- Name: pronosticos_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos
    ADD CONSTRAINT pronosticos_id_key UNIQUE (id);


--
-- Name: tramos_unid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramos
    ADD CONSTRAINT tramos_unid_key UNIQUE (unid);


--
-- Name: valores_prono_num_prono_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valores_prono_num
    ADD CONSTRAINT valores_prono_num_prono_id_key UNIQUE (prono_id);


--
-- Name: check_par_lims; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER check_par_lims BEFORE INSERT ON public.cal_pars FOR EACH ROW EXECUTE PROCEDURE public.check_par_lims();


--
-- Name: est_get_mid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER est_get_mid BEFORE INSERT ON public.cal_estados FOR EACH ROW EXECUTE PROCEDURE public.get_model_id();


--
-- Name: est_ord; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER est_ord BEFORE INSERT ON public.estados FOR EACH ROW EXECUTE PROCEDURE public.orden_model_forz();


--
-- Name: get_mid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER get_mid BEFORE INSERT ON public.forzantes FOR EACH ROW EXECUTE PROCEDURE public.get_model_id();


--
-- Name: get_model_id_calstats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER get_model_id_calstats BEFORE INSERT ON public.cal_stats FOR EACH ROW EXECUTE PROCEDURE public.get_model_id();


--
-- Name: mod_forz_ord; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER mod_forz_ord BEFORE INSERT ON public.modelos_forzantes FOR EACH ROW EXECUTE PROCEDURE public.orden_model_forz();


--
-- Name: par_ord; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER par_ord BEFORE INSERT ON public.parametros FOR EACH ROW EXECUTE PROCEDURE public.orden_model_forz();


--
-- Name: pars_get_mid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pars_get_mid BEFORE INSERT ON public.cal_pars FOR EACH ROW EXECUTE PROCEDURE public.get_model_id();


--
-- Name: cal_estados_cal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_estados
    ADD CONSTRAINT cal_estados_cal_id_fkey FOREIGN KEY (cal_id) REFERENCES public.calibrados(id);


--
-- Name: cal_estados_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_estados
    ADD CONSTRAINT cal_estados_model_id_fkey FOREIGN KEY (model_id, orden) REFERENCES public.estados(model_id, orden);


--
-- Name: cal_pars_cal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_pars
    ADD CONSTRAINT cal_pars_cal_id_fkey FOREIGN KEY (cal_id) REFERENCES public.calibrados(id);


--
-- Name: cal_pars_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_pars
    ADD CONSTRAINT cal_pars_model_id_fkey FOREIGN KEY (model_id, orden) REFERENCES public.parametros(model_id, orden);


--
-- Name: cal_stats_cal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_stats
    ADD CONSTRAINT cal_stats_cal_id_fkey FOREIGN KEY (cal_id) REFERENCES public.calibrados(id);


--
-- Name: cal_stats_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_stats
    ADD CONSTRAINT cal_stats_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.modelos(id);


--
-- Name: calibrados_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados
    ADD CONSTRAINT calibrados_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas_pluvio(unid);


--
-- Name: calibrados_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados
    ADD CONSTRAINT calibrados_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.modelos(id);


--
-- Name: calibrados_out_cal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados_out
    ADD CONSTRAINT calibrados_out_cal_id_fkey FOREIGN KEY (cal_id) REFERENCES public.calibrados(id);


--
-- Name: calibrados_out_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados
    ADD CONSTRAINT calibrados_out_id_fkey FOREIGN KEY (out_id) REFERENCES public.estaciones(unid);


--
-- Name: calibrados_out_out_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados_out
    ADD CONSTRAINT calibrados_out_out_id_fkey FOREIGN KEY (out_id) REFERENCES public.estaciones(unid);


--
-- Name: calibrados_tramo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calibrados
    ADD CONSTRAINT calibrados_tramo_id_fkey FOREIGN KEY (tramo_id) REFERENCES public.tramos(unid);


--
-- Name: corridas_cal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corridas
    ADD CONSTRAINT corridas_cal_id_fkey FOREIGN KEY (cal_id) REFERENCES public.calibrados(id);


--
-- Name: corridas_data_cor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corridas_data
    ADD CONSTRAINT corridas_data_cor_id_fkey FOREIGN KEY (cor_id) REFERENCES public.corridas(id);


--
-- Name: corridas_plan_cor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corridas
    ADD CONSTRAINT corridas_plan_cor_id_fkey FOREIGN KEY (plan_cor_id) REFERENCES public.planes_corridas(id);


--
-- Name: estados_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.modelos(id);


--
-- Name: forzantes_cal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forzantes
    ADD CONSTRAINT forzantes_cal_id_fkey FOREIGN KEY (cal_id) REFERENCES public.calibrados(id);


--
-- Name: forzantes_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forzantes
    ADD CONSTRAINT forzantes_model_id_fkey FOREIGN KEY (model_id, orden) REFERENCES public.modelos_forzantes(model_id, orden);


--
-- Name: modelos_def_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos
    ADD CONSTRAINT modelos_def_unit_id_fkey FOREIGN KEY (def_unit_id) REFERENCES public.unidades(id);


--
-- Name: modelos_def_var_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos
    ADD CONSTRAINT modelos_def_var_id_fkey FOREIGN KEY (def_var_id) REFERENCES public.var(id);


--
-- Name: modelos_forzantes_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_forzantes
    ADD CONSTRAINT modelos_forzantes_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.modelos(id);


--
-- Name: modelos_forzantes_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_forzantes
    ADD CONSTRAINT modelos_forzantes_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unidades(id);


--
-- Name: modelos_forzantes_var_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_forzantes
    ADD CONSTRAINT modelos_forzantes_var_id_fkey FOREIGN KEY (var_id) REFERENCES public.var(id);


--
-- Name: parametros_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parametros
    ADD CONSTRAINT parametros_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.modelos(id);


--
-- Name: pronosticos_cor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos
    ADD CONSTRAINT pronosticos_cor_id_fkey FOREIGN KEY (cor_id) REFERENCES public.corridas(id);


--
-- Name: pronosticos_series_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pronosticos
    ADD CONSTRAINT pronosticos_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id);


--
-- Name: tramos_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramos
    ADD CONSTRAINT tramos_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas_pluvio(unid);


--
-- Name: tramos_in_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramos
    ADD CONSTRAINT tramos_in_id_fkey FOREIGN KEY (in_id) REFERENCES public.estaciones(unid);


--
-- Name: tramos_out_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tramos
    ADD CONSTRAINT tramos_out_id_fkey FOREIGN KEY (out_id) REFERENCES public.estaciones(unid);


--
-- Name: valores_prono_num_prono_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valores_prono_num
    ADD CONSTRAINT valores_prono_num_prono_id_fkey FOREIGN KEY (prono_id) REFERENCES public.pronosticos(id);

--
-- Name: modelos_out; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modelos_out (
    id integer NOT NULL,
    model_id integer NOT NULL,
    orden integer DEFAULT 1 NOT NULL,
    var_id integer NOT NULL,
    unit_id integer NOT NULL,
    nombre character varying,
    inst boolean DEFAULT true,
    series_table character varying DEFAULT 'series'::character varying NOT NULL,
    CONSTRAINT modelos_out_series_table_check CHECK ((((series_table)::text = 'series'::text) OR ((series_table)::text = 'series_areal'::text)))
);


--
-- Name: modelos_out_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.modelos_out_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: modelos_out_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.modelos_out_id_seq OWNED BY public.modelos_out.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_out ALTER COLUMN id SET DEFAULT nextval('public.modelos_out_id_seq'::regclass);


--
-- Name: modelos_out_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_out
    ADD CONSTRAINT modelos_out_pkey PRIMARY KEY (model_id, orden);


--
-- Name: modelos_out_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_out
    ADD CONSTRAINT modelos_out_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.modelos(id);


--
-- Name: modelos_out_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_out
    ADD CONSTRAINT modelos_out_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unidades(id);


--
-- Name: modelos_out_var_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modelos_out
    ADD CONSTRAINT modelos_out_var_id_fkey FOREIGN KEY (var_id) REFERENCES public.var(id);


--
-- Name: TABLE modelos_out; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.modelos_out TO actualiza;
GRANT SELECT ON TABLE public.modelos_out TO sololectura;


--
-- Name: SEQUENCE modelos_out_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT USAGE ON SEQUENCE public.modelos_out_id_seq TO actualiza;

--
-- Name: cal_out; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cal_out (
    id integer NOT NULL,
    cal_id integer NOT NULL,
    series_table character varying DEFAULT 'series'::character varying NOT NULL,
    series_id integer NOT NULL,
    orden integer DEFAULT 1 NOT NULL,
    model_id integer NOT NULL,
    CONSTRAINT series_id_foreign_key_check CHECK (public.check_key_tab(ARRAY[series_id], series_table, 'id'::character varying)),
    CONSTRAINT series_table_constraint CHECK ((((series_table)::text = 'series'::text) OR ((series_table)::text = 'series_areal'::text)))
);


--
-- Name: cal_out_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cal_out_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cal_out_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cal_out_id_seq OWNED BY public.cal_out.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_out ALTER COLUMN id SET DEFAULT nextval('public.cal_out_id_seq'::regclass);


--
-- Name: cal_out_cal_id_orden_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_out
    ADD CONSTRAINT cal_out_cal_id_orden_key UNIQUE (cal_id, orden);


--
-- Name: cal_out_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_out
    ADD CONSTRAINT cal_out_pkey PRIMARY KEY (id);


--
-- Name: get_mid; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER get_mid BEFORE INSERT ON public.cal_out FOR EACH ROW EXECUTE PROCEDURE public.get_model_id();


--
-- Name: cal_out_cal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_out
    ADD CONSTRAINT cal_out_cal_id_fkey FOREIGN KEY (cal_id) REFERENCES public.calibrados(id) ON DELETE CASCADE;


--
-- Name: cal_out_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_out
    ADD CONSTRAINT cal_out_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.modelos(id);


--
-- Name: cal_out_modelos_out_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cal_out
    ADD CONSTRAINT cal_out_modelos_out_fkey FOREIGN KEY (model_id, orden) REFERENCES public.modelos_out(model_id, orden);


--
-- Name: TABLE cal_out; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.cal_out TO actualiza;
GRANT SELECT ON TABLE public.cal_out TO sololectura;


--
-- Name: SEQUENCE cal_out_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.cal_out_id_seq TO alerta5;
GRANT USAGE ON SEQUENCE public.cal_out_id_seq TO actualiza;


--
-- PostgreSQL database dump complete
--

