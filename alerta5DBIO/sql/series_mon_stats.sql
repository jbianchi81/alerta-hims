--
-- Name: series_mon_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.series_mon_stats (
    tipo character varying NOT NULL,
    series_id integer NOT NULL,
    mon integer NOT NULL,
    count integer,
    min real,
    max real,
    mean real,
    p01 real,
    p10 real,
    p50 real,
    p90 real,
    p99 real,
    timestart timestamp without time zone,
    timeend timestamp without time zone
);


--
-- Name: series_mon_stats_tipo_series_id_mon_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.series_mon_stats
    ADD CONSTRAINT series_mon_stats_tipo_series_id_mon_key UNIQUE (tipo, series_id, mon);


--
-- Name: TABLE series_mon_stats; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.series_mon_stats TO actualiza;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.series_mon_stats TO sololectura;


--
-- PostgreSQL database dump complete
--

