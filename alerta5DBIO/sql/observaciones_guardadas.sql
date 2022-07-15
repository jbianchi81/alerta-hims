BEGIN;
CREATE TABLE public.observaciones_guardadas (
    id bigint NOT NULL,
    series_id integer,
    timestart timestamp without time zone,
    timeend timestamp without time zone,
    nombre character varying,
    descripcion character varying,
    unit_id integer,
    timeupdate timestamp without time zone DEFAULT now(),
    valor real not null
);

CREATE TABLE public.observaciones_areal_guardadas (
    id integer NOT NULL,
    series_id integer NOT NULL,
    timestart timestamp without time zone,
    timeend timestamp without time zone,
    nombre character varying,
    descripcion character varying,
    unit_id integer,
    timeupdate timestamp without time zone DEFAULT now(),
    valor real not null
);


ALTER TABLE ONLY public.observaciones_areal_guardadas
    ADD CONSTRAINT observaciones_areal_guardadas_pkey PRIMARY KEY (id);


--
-- Name: observaciones_areal_guardadas_series_id_timestart_timeend_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observaciones_areal_guardadas
    ADD CONSTRAINT observaciones_areal_guardadas_series_id_timestart_timeend_key UNIQUE (series_id, timestart, timeend);


--
-- Name: observaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observaciones_guardadas
    ADD CONSTRAINT observaciones_guardadas_pkey PRIMARY KEY (id);


--
-- Name: observaciones_series_id_timestart_timeend_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observaciones_guardadas
    ADD CONSTRAINT observaciones_guardadas_series_id_timestart_timeend_key UNIQUE (series_id, timestart, timeend);


ALTER TABLE ONLY public.observaciones_areal_guardadas
    ADD CONSTRAINT observaciones_areal_guardadas_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series_areal(id);

ALTER TABLE ONLY public.observaciones_areal_guardadas
    ADD CONSTRAINT observaciones_areal_guardadas_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unidades(id);

ALTER TABLE ONLY public.observaciones_guardadas
    ADD CONSTRAINT observaciones_guardadas_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id) ON DELETE CASCADE;


--
-- Name: observaciones_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.observaciones_guardadas
    ADD CONSTRAINT observaciones_guardadas_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unidades(id);

CREATE TABLE public.observaciones_rast_guardadas (
    id integer NOT NULL,
    series_id integer NOT NULL,
    timestart timestamp without time zone NOT NULL,
    timeend timestamp without time zone NOT NULL,
    valor public.raster NOT NULL,
    timeupdate timestamp without time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.observaciones_rast_guardadas
    ADD CONSTRAINT observaciones_rast_guardadas_pkey PRIMARY KEY (id);


--
-- Name: observaciones_rast_guardadas observaciones_rast_guardadas_series_id_timestart_timeend_key; Type: CONSTRAINT; Schema: public; Owner: alerta5
--

ALTER TABLE ONLY public.observaciones_rast_guardadas
    ADD CONSTRAINT observaciones_rast_guardadas_series_id_timestart_timeend_key UNIQUE (series_id, timestart, timeend);


ALTER TABLE ONLY public.observaciones_rast_guardadas
    ADD CONSTRAINT observaciones_rast_guardadas_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series_rast(id);

grant select,delete,update,insert on observaciones_guardadas to actualiza;
grant select,delete,update,insert on observaciones_areal_guardadas to actualiza;
grant select,delete,update,insert on observaciones_rast_guardadas to actualiza;


COMMIT;