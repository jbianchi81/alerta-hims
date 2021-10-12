-- pg_dump -d meteorology -U jbianchi -h correo.ina.gob.ar -p 9049 -t unidades -t var -t procedimiento -t fuentes -t accessors -t tipo_estaciones -a > basic_tables_content.sql

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


--
-- Data for Name: procedimiento; Type: TABLE DATA; Schema: public; Owner: alerta5
--

COPY public.procedimiento (id, nombre, abrev, descripcion) FROM stdin;
1	medición directa	medicion	Medición directa
2	Curva de gasto	curva	Obtenido a partir de curva de gasto
3	Interpolado	interp	Interpolado linealmente a partir de datos observados en la vecindad espaciotemporal
5	Estimado	est	Estimado a partir de observaciones indirectas
4	Simulado	sim	Simulado mediante un modelo
6	Análisis	anal	Análisis a partir de datos observados
7	Climatología	clim	Promedios climáticos
8	Traza	traza	Traza pronosticada
9	Derivado	deriv	Derivado de datos observados
\.


--
-- Data for Name: unidades; Type: TABLE DATA; Schema: public; Owner: alerta5
--

COPY public.unidades (id, nombre, abrev, "UnitsID", "UnitsType") FROM stdin;
14	adimensional	-	0	Unknown
21	metros,metros cúbicos por segundo	m,m^3/s	0	Unknown
9	milímetros	mm	54	Length
11	metros	m	52	Length
19	centímetros	cm	47	Length
20	kilómetros	km	51	Length
10	metros cúbicos por segundo	m^3/s	36	Flow
12	grados centígrados	ºC	96	Temperature
13	kilómetros por hora	km/h	116	Velocity
15	porcentaje	%	1	Proportion
16	grados	º	2	Angle
17	hectoPascales	hP	315	Pressure
18	miliBares	mBar	90	Pressure
22	milímetros por día	mm/d	305	velocity
23	contenido volumétrico	v/v	350	Proportion
24	desvíos estándar * 1000	sd*1000	351	deviation
0	Unknown		0	Unknown
144	MegaJoules por metro cuadrado	MJ/m^2	144	Energy per Area
353	Okta	Okta	353	Proportion
312	Hectómetro cúbico	(hm)^3	312	Volume
33	Watts por metro cuadrado	W/m^2	33	Energy Flux
104	day	d	104	Time
102	minute	min	102	Time
103	hour	h	103	Time
356	kilocalorías por centímetro cuadrado por día	kcal/cm2/dia	0	EnergyFlux
357	milímetros de mercurio	mmHg	86	Pressure/Stress
355	metros por segundo	m/s	119	Velocity
106	month	mon	106	Time
\.


--
-- Data for Name: var; Type: TABLE DATA; Schema: public; Owner: alerta5
--

COPY public.var (id, var, nombre, abrev, type, datatype, valuetype, "GeneralCategory", "VariableName", "SampleMedium", arr_names, def_unit_id, "timeSupport", def_hora_corte) FROM stdin;
67	Hms	Altura hidrométrica media semanal	alturamediasemana	num	Average	Field Observation	Hydrology	Gage height	Surface Water	\N	11	7 days	00:00:00
42	visib	visibilidad	visib	num	Continuous	Field Observation	Meteorology	Visibility	Air	\N	15	00:00:00	\N
70	QMaxIn	QMax Instantáneo	QMaxIn	num	Maximum	Field Observation	Hydrology	Discharge	Unknown	\N	10	00:00:00	\N
71	QMinIn	QMin Instantáneo	QMinIn	num	Minimum	Field Observation	Hydrology	Discharge	Surface Water	\N	10	00:00:00	\N
72	Hmax	Humedad relativa máxima diaria	Hmax	num	Maximum	Field Observation	Meteorology	Relative humidity	Air	\N	15	24:00:00	\N
73	TAgua	Temperatura del agua	TAgua	num	Continuous	Field Observation	Water Quality	Temperature	Surface Water	\N	12	00:00:00	\N
69	QMDmin	Caudal Medio Diario Mínimo	QMDmin	num	Minimum	Field Observation	Hydrology	Discharge	Surface Water	\N	10	1 year	\N
68	QMDmax	Caudal Medio Diario Máximo	QMDmax	num	Maximum	Field Observation	Hydrology	Discharge	Surface Water	\N	10	1 year	\N
74	gc	guía de crecidas	gc	num	Cumulative	Model Simulation Result	Hydrology	flood guidance	Precipitation	\N	9	24:00:00	\N
50	Hmmax	Altura hidrométrica máxima mensual	alturamaxmes	num	Maximum	Field Observation	Hydrology	Gage height	Surface Water	\N	11	720:00:00	00:00:00
14	SRad	Radiación solar	solarrad	num	Average	Field Observation	Climate	Global Radiation	Air	\N	144	00:00:00	\N
19	HQ	par Altura/Caudal	parHQ	numarr	Sporadic	Field Observation	Hydrology	\N	Surface Water	\N	21	00:00:00	\N
4	Q	Caudal	caudal	num	Continuous	Derived Value	Hydrology	Discharge	Surface Water	\N	10	00:00:00	\N
2	H	Altura hidrométrica	altura	num	Continuous	Field Observation	Hydrology	Gage height	Surface Water	\N	11	00:00:00	\N
39	Hmd	Altura hidrométrica media diaria	alturamediadia	num	Average	Field Observation	Hydrology	Gage height	Surface Water	\N	11	1 day	00:00:00
47	api	índice de precipitación antecedente	API	num	Average	Model Simulation Result	Hydrology	antecedent precipitation index	Soil	\N	14	7 days	\N
38	Pacum	precipicación acumulada	Pacum	num	Cumulative	Field Observation	Unknown	Precipitation	Unknown	\N	9	\N	\N
15	ETP	Evapotranspiración potencial	etp	num	Cumulative	Derived Value	Climate	Evapotranspiration	Air	\N	22	1 day	09:00:00
1	P	precipitación diaria 12Z	precip_diaria_met	num	Cumulative	Field Observation	Climate	Precipitation	Precipitation	\N	22	1 day	09:00:00
35	Htide	Altura de marea astronómica	altura_marea	num	Continuous	Model Simulation Result	Hydrology	Tidal stage	Surface Water	\N	11	00:00:00	\N
36	Hmeteo	Altura de marea meteorológica	altura_marea_meteo	num	Continuous	Model Simulation Result	Hydrology	Water level	Surface water	\N	11	00:00:00	\N
37	nieve	nivel de nieve	nieve	num	Continuous	Field Observation	Unknown	Snow depth	Unknown	\N	11	00:00:00	\N
43	Trocio	temperatura de rocío	Trocio	num	Continuous	Field Observation	Meteorology	Temperature, dew point	Atmosphere	\N	12	\N	\N
20	SM	Humedad del suelo	SM	num	Sporadic	Derived Value	Hydrology	Volumetric water content	Soil	\N	23	1 day	\N
21	FM	Magnitud de inundación	FM	num	Sporadic	Derived Value	Hydrology	Flood magnitude	Surface Water	\N	24	1 day	\N
9	Vmax	Velocidad del viento máxima	velvientomax	num	Maximum	Field Observation	Climate	Wind speed	Air	\N	13	1 day	00:00:00
45	Tbulbo	temperatura de bulbo húmedo	Tbulbo	num	Continuous	Field Observation	Climate	Temperature	Atmosphere	\N	12	\N	\N
46	PmesAn	anomalía de precipitación mensual	PmesAn	num	Cumulative	Field Observation	Climate	Precipitation	Precipitation	\N	9	744:00:00	\N
48	Qmm	caudal medio mensual	caudalmediomes	num	Average	Field Observation	Hydrology	Gage height	Surface Water	\N	11	1 mon	00:00:00
49	Hmmin	Altura hidrométrica mínima mensual	alturaminmes	num	Average	Field Observation	Hydrology	Gage height	Surface Water	\N	11	1 mon	00:00:00
10	Vmed	Velocidad del viento media	velvientomedia	num	Minimum	Field Observation	Climate	Wind speed	Air	\N	13	1 day	00:00:00
17	nubdia	nubosidad media diaria	nubdia	num	Average	Field Observation	Climate	Cloud cover	Air	\N	353	1 day	00:00:00
13	Hel	Heliofanía	helio	num	Cumulative	Field Observation	Climate	Sunshine duration	Air	\N	103	1 day	00:00:00
30	WE	Area Saturada	areasat	numarr	Continuous	Derived Value	Hydrology	Water extent	Surface Water	{sat,"no sat",nubes}	14	00:00:00	\N
32	Hgeo	Altura geométrica	Hgeo	num	Continuous	Field Observation	Unknown	\N	Unknown	\N	0	00:00:00	\N
28	a:H	Aforos:Altura	altura	num	Sporadic	Field Observation	Hydrology	Gage height	Surface Water	\N	11	00:00:00	\N
64	Vdh	Dirección del viento modal horaria	dirvientohora	num	Continuous	Field Observation	Climate	Wind Direction	Air	\N	16	01:00:00	00:00:00
51	Qmmin	Caudal mínimo mensual	caudalminmes	num	Average	Field Observation	Hydrology	Discharge	Surface Water	\N	10	1 mon	00:00:00
29	a:Q	Aforos:Caudal	caudal	num	Sporadic	Field Observation	Hydrology	Discharge	Surface Water	\N	10	00:00:00	\N
52	Qmmax	Caudal máximo mensual	caudalmaxmes	num	Average	Field Observation	Hydrology	Discharge	Surface Water	\N	10	1 mon	00:00:00
33	Hmm	Altura hidrométrica media mensual	alturamediames	num	Average	Field Observation	Hydrology	Gage height	Surface Water	\N	11	1 mon	00:00:00
53	T	Temperatura	temp	num	Continuous	Field Observation	Climate	Temperature	Air	\N	12	\N	\N
55	Vv	Velocidad del viento	velviento	num	Continuous	Field Observation	Climate	Wind Speed	Air	\N	13	\N	\N
57	Vd	Dirección del viento	dirviento	num	Continuous	Field Observation	Climate	Wind Direction	Air	\N	16	\N	\N
58	Hr	Humedad relativa	humrel	num	Continuous	Field Observation	Climate	Relative humidity	Air	\N	15	\N	\N
60	Pr	Presión barométrica	pres	num	Continuous	Field Observation	Climate	Barometric pressure	Air	\N	17	\N	\N
56	Vvh	Velocidad del viento horaria	velvientohora	num	Average	Field Observation	Climate	Wind Speed	Air	\N	13	01:00:00	00:00:00
62	nub	nubosidad	nub	num	continuous	Field Observation	Climate	Cloud cover	Air	\N	353	\N	\N
63	pnm	presión al nivel del mar	pres_nm	num	Continuous	Field Observation	Climate	Sea-level pressure	Air	\N	17	\N	\N
27	Pi	Precipitación a intervalo nativo	precip_inst	num	Incremental	Field Observation	Climate	Precipitation	Precipitation	\N	9	\N	\N
40	Qmd	Caudal medio diario	caudalmediodia	num	Average	Field Observation	Hydrology	Discharge	Surface Water	\N	10	1 day	00:00:00
22	Qafl	Caudal Afluente	Qafluente	num	Continuous	Field Observation	Hydrology	Reservoir inflow	Surface Water	\N	10	1 day	00:00:00
25	Qtra	Caudal Transferido	Qtransfer	num	Continuous	Field Observation	Hydrology	Transfered discharge	Surface Water	\N	10	1 day	00:00:00
26	Vut	Volumen Útil	Vutil	num	Continuous	Field Observation	Hydrology	Reservoir storage	Surface Water	\N	312	1 day	00:00:00
41	Pmes	precipitación mensual	Pmensual	num	Cumulative	Field Observation	Climate	Precipitation	Precipitation	\N	9	1 mon	00:00:00
5	Tmin	Temperatura mínima	tempmin	num	Minimum	Field Observation	Climate	Temperature	Air	\N	12	1 day	00:00:00
7	Tmed	Temperatura media	tempmed	num	Average	Field Observation	Climate	Temperature	Air	\N	12	1 day	00:00:00
6	Tmax	Temperatura máxima	tempmax	num	Maximum	Field Observation	Climate	Temperature	Air	\N	12	1 day	00:00:00
8	Tsue	Temperatura del suelo	tempsuelo	num	Average	Field Observation	Climate	Temperature	Air	\N	12	1 day	00:00:00
18	pnmdia	presión al nivel del mar media diaria	pnmdia	num	Average	Field Observation	Climate	Sea-level pressure	Air	\N	17	1 day	00:00:00
23	Qefl	Caudal Efluente	Qefluente	num	Continuous	Field Observation	Hydrology	Reservoir outflow	Surface Water	\N	10	1 day	00:00:00
12	HR	Humedad relativa media diaria	humrel	num	Average	Field Observation	Climate	Relative humidity	Air	\N	15	1 day	00:00:00
16	Pmed	Presión barométrica media diaria	presionmedia	num	Average	Field Observation	Climate	Barometric pressure	Air	\N	17	1 day	00:00:00
24	Qver	Caudal Vertido	Qvertido	num	Continuous	Field Observation	Hydrology	Reservoir spilled	Surface Water	\N	10	1 day	00:00:00
11	Vdir	dirección del viento modal diaria	dirviento	num	Average	Field Observation	Climate	Wind direction	Air	\N	16	1 day	00:00:00
31	Ph	precipitación horaria	precip_horaria	num	Cumulative	Field Observation	Climate	Precipitation	Precipitation	\N	9	01:00:00	00:00:00
54	Th	Temperatura horaria	temp	num	Average	Field Observation	Climate	Temperature	Air	\N	12	01:00:00	00:00:00
34	P3h	precipitación 3 horaria	precip_3h	num	Cumulative	Field Observation	Climate	Precipitation	Precipitation	\N	9	03:00:00	00:00:00
59	Hrh	Humedad relativa media horaria	humrelhora	num	Average	Field Observation	Climate	Relative humidity	Air	\N	15	\N	00:00:00
61	Prh	Presión barométrica media horaria	preshora	num	Average	Field Observation	Climate	Barometric pressure	Air	\N	17	01:00:00	00:00:00
65	ugrd	Viento - componente u	ugrd	num	Continuous	Model Simulation Result	Meteorology	Wind speed	Air	\N	355	00:00:00	\N
66	vgrd	Viento - componente v	vgrd	num	Continuous	Model Simulation Result	Meteorology	Wind speed	Air	\N	355	00:00:00	\N
\.


--
-- Data for Name: fuentes; Type: TABLE DATA; Schema: public; Owner: alerta5
--

COPY public.fuentes (id, nombre, data_table, data_column, tipo, def_proc_id, def_dt, hora_corte, def_unit_id, def_var_id, fd_column, mad_table, scale_factor, data_offset, def_pixel_height, def_pixel_width, def_srid, def_extent, date_column, def_pixeltype, abstract, source, public) FROM stdin;
16	etpd_santi	\N	\N	C	7	1 day	09:00:00	22	15	\N	etpd_santi	\N	\N	\N	\N	4326	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	date	32BF	\N	\N	t
32	marea_riodelaplata	marea_riodelaplata	rast	\N	4	01:00:00	00:00:00	11	36	fecha_emision	\N	\N	\N	0.0500000007	0.0500000007	4326	0103000020E61000000100000005000000713D0AD7A3404DC0F6285C8FC20541C00AD7A3703D7A4BC0F6285C8FC20541C00AD7A3703D7A4BC05C8FC2F5282C42C0713D0AD7A3404DC05C8FC2F5282C42C0713D0AD7A3404DC0F6285C8FC20541C0	date	64BF	Altura geométrica sobre tabla de mareas. Fuente: SMN/SHN	http://www3.smn.gob.ar/pronos/ondatormenta_plataformario.php?id=2	t
6	gpm	pp_gpm	rast	QPE	5	1 day	09:00:00	22	1	\N	pmad_gpm	\N	\N	0.100000001	0.100000001	4326	0103000020E6100000010000000500000000000000008056C000000000000024400000000000003EC000000000000024400000000000003EC00000000000004EC000000000008056C00000000000004EC000000000008056C00000000000002440	date	32BF	Estimación satelital de la precipitación a paso diario de la misión GPM. Fuente NASA	ftp://jsimpson.pps.eosdis.nasa.gov/data/imerg/early/	t
17	MODIS NRT FLOOD MAPPING PRODUCT	nrt_global_floodmap	rast	WE	5	1 day	00:00:00	14	30	\N	\N	\N	\N	0.00219683652	0.00219683652	4326	0103000020E6100000010000000500000000000000008051C01A5C2200000024C000000000000044C01A5C2200000024C000000000000044C007970800000044C000000000008051C007970800000044C000000000008051C01A5C2200000024C0	time	8BUI	\N	\N	t
31	etp_wm_view	etp_wm_view	rast	ETP	7	1 day	00:00:00	9	15	\N	etpd_wm	\N	\N	0.5	0.5	4326	0103000020E610000001000000050000000000000000C052C000000000000024C000000000000044C000000000000024C000000000000044C000000000000049C00000000000C052C000000000000049C00000000000C052C000000000000024C0	date	32BF	\N	\N	t
13	pp_gpm_3h	pp_gpm_3h	rast	QPE	5	03:00:00	00:00:00	9	34	\N	pmad_gpm_3h	1	0	0.100000001	0.100000001	4326	0103000020E6100000010000000500000000000000008056C000000000000024400000000000003EC000000000000024400000000000003EC00000000000004EC000000000008056C00000000000004EC000000000008056C00000000000002440	date	32BF	Estimación satelital de la precipitación a paso 3 horario de la misión GPM. Fuente NASA	ftp://jsimpson.pps.eosdis.nasa.gov/data/imerg/early/	t
4	eta_3h	pp_eta_3h	rast	QPF	4	03:00:00	00:00:00	22	1	fecha_emision	\N	\N	\N	0.333333343	0.333333343	4326	0103000020E610000001000000050000003E555555557551C0D6955555555524C076655555551544C0D6955555555524C076655555551544C07CAAAAAAAAEA43C03E555555557551C07CAAAAAAAAEA43C03E555555557551C0D6955555555524C0	date	32BF	\N	\N	t
7	campo	pp_emas	rast	PI	3	1 day	09:00:00	22	1	\N	pmad_emas	\N	\N	0.100000001	0.100000001	4326	0103000020E61000000100000005000000FFFFFFFFFF7F51C0FFFFFFFFFFFF23C000000000000044C0FFFFFFFFFFFF23C000000000000044C0FEFFFFFFFFFF43C0FFFFFFFFFF7F51C0FEFFFFFFFFFF43C0FFFFFFFFFF7F51C0FFFFFFFFFFFF23C0	date	32BF	Precipitación acumulada a paso diario [mm] de la red de estaciones meteorológicas convencionales para la Cuenca del Plata. Diagrama de Voronoi	http://www.smn.gob.ar	t
3	wm	etp_wm	rast	C	7	1 day	09:00:00	22	15	\N	etpd_wm	\N	\N	0.5	0.5	4326	0103000020E610000001000000050000000000000000C052C000000000000024C000000000000044C000000000000024C000000000000044C000000000000049C00000000000C052C000000000000049C00000000000C052C000000000000024C0	date	32BF	\N	\N	t
2	cpc	pp_cpc	rast	PA	6	1 day	-03:00:00	22	1	\N	pmad_cpc	\N	\N	0.5	0.5	4326	0103000020E6100000010000000500000000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C000000000008051C000000000000024C0	date	32BF	Análisis de la precipitación a paso diario realizado sobre la base de la red internacional de estaciones meteorológicas	ftp://ftp.cdc.noaa.gov/Datasets/cpc_global_precip	t
41	mod09a1_water_surface_view	ndwi37_floodmap	rast	WE	5	1 day	09:00:00	14	30	\N	\N	\N	\N	\N	\N	4326	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	\N	32BF	\N	\N	t
40	mod09a1_ndwi37c_agua_superficial	modis_water_surface	rast	WE	5	1 day	09:00:00	14	30	\N	\N	\N	\N	\N	\N	4326	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	\N	32BF	\N	\N	t
8	smap	smap	rast	SM	5	1 day	-03:00:00	23	20	\N	smad_smap	\N	\N	0.379746825	0.379746825	4326	0103000020E6100000010000000500000000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C000000000008051C000000000000024C0	date	64BF	\N	\N	t
47	conae_api	conae_api	rast	SM	4	1 day	-03:00:00	14	47	\N	ma_conae_api	\N	\N	0.100000001	0.100000001	4326	0103000020E61000000100000005000000EB84C05F666652C03E7E7EFECCCC22C0C187B2BACC8C41C03E7E7EFECCCC22C0C187B2BACC8C41C0528EAE4433F348C0EB84C05F666652C0528EAE4433F348C0EB84C05F666652C03E7E7EFECCCC22C0	timestart	32BF	índice de precipitación antecedente para el sur de Sudamérica - CONAE - Simulado a partir de campo de precipitación GPM - Valor medio de 7 días	ftp://ftp4.conae.gov.ar	t
48	gefs_wave	gefs_wave	rast	\N	5	00:00:00	00:00:00	355	65	fecha_emision	\N	\N	\N	0.25	0.25	4326	0103000020E610000001000000050000000000000000804EC00000000000003FC000000000000049C00000000000003FC000000000000049C000000000008044C00000000000804EC000000000008044C00000000000804EC00000000000003FC0	date	64BF	NCEP WAVE Model Forecasts	https://nomads.ncep.noaa.gov/cgi-bin/filter_gefs_wave_0p25.pl	t
18	fraccion_anegada_modis_nrt_5km	resample_nrt	rast	WE	5	1 day	00:00:00	14	30	\N	\N	\N	\N	0.0444444455	0.0444444455	4326	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	date	16BUI	Fracción de área inundada MODIS [0-1000]. Resolución 5 km	https://floodmap.modaps.eosdis.nasa.gov/	t
9	amsr2_mag_4days	amsr2_mag_4days	rast	FM	5	1 day	-03:00:00	24	21	\N	fmad_amsr2	\N	\N	0.0900000036	0.0900000036	4326	0103000020E610000001000000050000002EF015DD7A8451C0206AA2CF47E123C0005169C4CC0C44C0206AA2CF47E123C0005169C4CC0C44C0E429ABE97AF443C02EF015DD7A8451C0E429ABE97AF443C02EF015DD7A8451C0206AA2CF47E123C0	date	32BSI	Magnitud de inundación de AMSR2, medida en desvíos estándar * 1000.	http://www.gdacs.org/flooddetection/DATA/ALL/AvgMagTiffs	t
15	smops	smops	rast	SM	5	1 day	-03:00:00	23	20	\N	smad_smops	\N	\N	0.25	0.25	4326	0103000020E6100000010000000500000000000000008056C000000000000024400000000000003EC000000000000024400000000000003EC00000000000004EC000000000008056C00000000000004EC000000000008056C00000000000002440	date	64BF	Humedad del suelo volumétrica de fusión de productos satelitales SMOPS. Fuente NOAA	http://satepsanone.nesdis.noaa.gov/pub/product/smops/TestData	t
38	COSMO 7KM 3-horario INMET	cosmo_3h	rast	QPF	4	03:00:00	00:00:00	9	34	fecha_emision	\N	\N	\N	0.0625	0.0625	4326	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	\N	32BF	\N	\N	f
14	hidroestimador_semanal	hidroestimador_semanal	rast	QPE	5	7 days	09:00:00	22	1	\N	\N	\N	\N	0.0359000005	0.0419000015	4326	0103000020E61000000100000005000000956588635DC252C0BE9F1A2FDDFC33C06A6FF085C9A845C0BE9F1A2FDDFC33C06A6FF085C9A845C027A089B0E18546C0956588635DC252C027A089B0E18546C0956588635DC252C0BE9F1A2FDDFC33C0	date	16BUI	\N	\N	f
49	conae_gc	\N	\N	QPF	4	1 day	09:00:00	9	74	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t
10	rqpe_smn_1h_adv	rqpe_smn_1h_adv	rast	PI	5	01:00:00	00:00:00	9	1	\N	pmah_rqpe	0.00999999978	\N	0.0225225221	0.0224719103	4326	0103000020E610000001000000050000000000000000004FC000000000000040C00000000000004CC000000000000040C00000000000004CC000000000008042C00000000000004FC000000000008042C00000000000004FC000000000000040C0	date	16BUI	Campo raster precipitación horaria estimada sobre datos de radar meteorológico RMA2, con correciónd e advección. Fuente: SMN (Proyecto QPE)	\N	f
33	campo_splines	pp_emas_spl	rast	PI	3	1 day	09:00:00	22	1	\N	pmad_emas	\N	\N	0.100000001	0.100000001	4326	0103000020E61000000100000005000000FFFFFFFFFF7F51C0FFFFFFFFFFFF23C000000000000044C0FFFFFFFFFFFF23C000000000000044C0FEFFFFFFFFFF43C0FFFFFFFFFF7F51C0FEFFFFFFFFFF43C0FFFFFFFFFF7F51C0FFFFFFFFFFFF23C0	date	32BF	Precipitación acumulada a paso diario [mm] de la red de estaciones meteorológicas convencionales para la Cuenca del Plata. Interpolación por splines	http://www.smn.gob.ar	t
37	campo_3h_spl	pp_emas_3h_spl	rast	PI	3	03:00:00	00:00:00	9	34	\N	\N	\N	\N	0.100000001	0.100000001	4326	0103000020E61000000100000005000000FFFFFFFFFF7F51C0FFFFFFFFFFFF23C000000000000044C0FFFFFFFFFFFF23C000000000000044C0FEFFFFFFFFFF43C0FFFFFFFFFF7F51C0FEFFFFFFFFFF43C0FFFFFFFFFF7F51C0FFFFFFFFFFFF23C0	date	32BF	Precipitación acumulada a 3 horario [mm] combinada de las redes automáticas y convencionales de la Cuenca del Plata. Interpolación mediante método de Splines	http://www.smn.gob.ar	t
36	campo_3h	pp_emas_3h	rast	PI	3	03:00:00	00:00:00	9	34	\N	\N	\N	\N	0.100000001	0.100000001	4326	0103000020E610000001000000050000009E6377FFFF7F51C09BDA72FFFFFF23C04D781764010044C0226D1DD8FFFF23C0396EEE06060044C00A3DA269000044C0C81F17FFFF7F51C036DE89FFFFFF43C09E6377FFFF7F51C09BDA72FFFFFF23C0	date	32BF	Precipitación acumulada a 3 horario [mm] combinada de las redes automáticas y convencionales de la Cuenca del Plata. Interpolación mediante método de Thiessen	http://www.smn.gob.ar	t
44	sqpe_smn	sqpe_smn	rast	QPE	5	1 day	09:00:00	22	1	\N	sqpe_smn_mad	\N	\N	0.100000001	0.100000001	4326	0103000020E6100000010000000500000066666666668650C06666666666E63BC066666666668650C0CDCCCCCCCC0C45C03333333333F34BC0CDCCCCCCCC0C45C03333333333F34BC06666666666E63BC066666666668650C06666666666E63BC0	date	32BF	Estimación satelital de precipitación a paso diario con corrección con datos de campo. Producto experimental SMN	Servicio Meteorológico Nacional	f
11	hidroestimador_diario	hidroestimador_diario_table	rast	QPE	5	1 day	09:00:00	22	1	\N	\N	\N	\N	0.0359000005	0.0419000015	4326	0103000020E61000000100000005000000956588635DC252C0BE9F1A2FDDFC33C06A6FF085C9A845C0BE9F1A2FDDFC33C06A6FF085C9A845C027A089B0E18546C0956588635DC252C027A089B0E18546C0956588635DC252C0BE9F1A2FDDFC33C0	date	16BUI	Estimación satelital de la precipitación a paso diario de la misión GOES, producto Hidrestimador. Fuente: SMN	http://www.smn.gob.ar	f
39	COSMO 7KM diario INMET	cosmo_diario	rast	QPF	4	1 day	09:00:00	22	1	fecha_emision	\N	\N	\N	0.0625	0.0625	4326	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	\N	32BF	\N	\N	f
12	hidroestimador_3h	hidroestimador_3h	rast	QPE	5	03:00:00	00:00:00	22	1	\N	\N	\N	\N	0.0359000005	0.0419000015	4326	0103000020E61000000100000005000000956588635DC252C0BE9F1A2FDDFC33C06A6FF085C9A845C0BE9F1A2FDDFC33C06A6FF085C9A845C027A089B0E18546C0956588635DC252C027A089B0E18546C0956588635DC252C0BE9F1A2FDDFC33C0	date	16BUI	Estimación satelital de la precipitación a paso 3 horario de la misión GOES, producto Hidrestimador. Fuente: SMN	http://www.smn.gob.ar	f
42	GFS SMN diario	gfs_diario_view	rast	QPF	4	1 day	09:00:00	22	1	fecha_emision	pmad_gfs	\N	\N	0.248962656	0.248756215	4326	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	date	32BF	\N	\N	f
43	precip GFS 3-horario - SMN	gfs_3h_view	rast	QPF	4	03:00:00	00:00:00	9	34	fecha_emision	\N	\N	\N	0.25	0.25	4326	0106000020E610000001000000010300000001000000050000000000000000C462C0000000000000C03F0000000000203440000000000000C03F000000000020344000000000008856C00000000000C462C000000000008856C00000000000C462C0000000000000C03F	date	64BF	Pronóstico de precipitación a paso 3-horario del modelo GFS - SMN	http://www.smn.gob.ar	f
1	eta	pp_eta	rast	QPF	4	1 day	09:00:00	22	1	fecha_emision	pmad_eta	\N	\N	0.333333343	0.333333343	4326	0103000020E610000001000000050000003E555555557551C0D6955555555524C076655555551544C0D6955555555524C076655555551544C07CAAAAAAAAEA43C03E555555557551C07CAAAAAAAAEA43C03E555555557551C0D6955555555524C0	date	32BF	Pronóstico de precipitación a paso diario del modelo ETA - SMN	http://www.smn.gob.ar	f
35	precip GFS 3-horario - SMN	gfs_3h	rast	QPF	4	03:00:00	00:00:00	9	34	fecha_emision	\N	\N	\N	0.25	0.25	4326	0106000020E610000001000000010300000001000000050000000000000000C462C0000000000000C03F0000000000203440000000000000C03F000000000020344000000000008856C00000000000C462C000000000008856C00000000000C462C0000000000000C03F	date	64BF	Pronóstico de precipitación a paso 3-horario del modelo GFS - SMN	http://www.smn.gob.ar	f
5	gfs_diario	gfs_diario	rast	QPF	4	1 day	09:00:00	22	1	fecha_emision	pmad_gfs	\N	\N	0.248962656	0.248756215	4326	0103000020E6100000010000000500000000000000008056C000000000000024C000000000000044C000000000000024C000000000000044C000000000008051C000000000008056C000000000008051C000000000008056C000000000000024C0	date	64BF	Pronóstico de precipitación a paso diario del modelo GFS	http://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl	f
46	ecmwf_mensual_anom	ecmwf_mensual_anom	rast	QPF	4	1 mon	-03:00:00	9	46	fecha_emision	apma_ecmwf	\N	\N	1	1	4326	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	date	64BF	anomalía de precipitación mensual según pronóstico del modelo ECMWF	https://cds.climate.copernicus.eu/api/v2	t
45	ecmwf_mensual	ecmwf_mensual	rast	QPF	4	1 mon	-03:00:00	9	41	fecha_emision	pmam_ecmwf	\N	\N	1	1	4326	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	date	64BF	pronóstico de precipitaciones mensuales del modelo ECMWF	https://cds.climate.copernicus.eu/api/v2	t
\.


--
-- Data for Name: tipo_estaciones; Type: TABLE DATA; Schema: public; Owner: alerta5
--

COPY public.tipo_estaciones (tipo, id, nombre) FROM stdin;
H	2	Hidrológica
M	1	Meteorológica
P	3	Pluviométrica
A	4	Combinada
E	5	Embalse
V	6	Virtual
\.


--
-- Name: fuentes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alerta5
--

SELECT pg_catalog.setval('public.fuentes_id_seq', 10, true);


--
-- Name: procedimiento_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alerta5
--

SELECT pg_catalog.setval('public.procedimiento_id_seq', 5, true);


--
-- Name: tipo_estaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alerta5
--

SELECT pg_catalog.setval('public.tipo_estaciones_id_seq', 3, true);


--
-- Name: unidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alerta5
--

SELECT pg_catalog.setval('public.unidades_id_seq', 355, true);


--
-- Name: var_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alerta5
--

SELECT pg_catalog.setval('public.var_id_seq', 48, true);

--- escenas

COPY public.escenas (id, geom, nombre) FROM stdin;
7	0103000020E61000000100000005000000FFFFFFFFFF7F51C0FFFFFFFFFFFF23C000000000000044C0FFFFFFFFFFFF23C000000000000044C0FEFFFFFFFFFF43C0FFFFFFFFFF7F51C0FEFFFFFFFFFF43C0FFFFFFFFFF7F51C0FFFFFFFFFFFF23C0	campo_splines
11	0103000020E6100000010000000500000000000000008056C000000000000024400000000000003EC000000000000024400000000000003EC00000000000004EC000000000008056C00000000000004EC000000000008056C00000000000002440	pp_gpm_3h
12	0103000020E610000001000000050000000000000000C052C000000000000024C000000000000044C000000000000024C000000000000044C000000000000049C00000000000C052C000000000000049C00000000000C052C000000000000024C0	etp_wm_view
13	0103000020E61000000100000005000000956588635DC252C0BE9F1A2FDDFC33C06A6FF085C9A845C0BE9F1A2FDDFC33C06A6FF085C9A845C027A089B0E18546C0956588635DC252C027A089B0E18546C0956588635DC252C0BE9F1A2FDDFC33C0	hidroestimador_diario
14	0103000020E61000000100000005000000713D0AD7A3404DC0F6285C8FC20541C00AD7A3703D7A4BC0F6285C8FC20541C00AD7A3703D7A4BC05C8FC2F5282C42C0713D0AD7A3404DC05C8FC2F5282C42C0713D0AD7A3404DC0F6285C8FC20541C0	marea_riodelaplata
15	0103000020E6100000010000000500000000000000008056C000000000000024C000000000000044C000000000000024C000000000000044C000000000008051C000000000008056C000000000008051C000000000008056C000000000000024C0	gfs_diario
18	0103000020E6100000010000000500000066666666668650C06666666666E63BC066666666668650C0CDCCCCCCCC0C45C03333333333F34BC0CDCCCCCCCC0C45C03333333333F34BC06666666666E63BC066666666668650C06666666666E63BC0	sqpe_smn
20	0103000020E61000000100000005000000EB84C05F666652C03E7E7EFECCCC22C0C187B2BACC8C41C03E7E7EFECCCC22C0C187B2BACC8C41C0528EAE4433F348C0EB84C05F666652C0528EAE4433F348C0EB84C05F666652C03E7E7EFECCCC22C0	conae_api
21	0103000020E610000001000000050000000000000000804EC00000000000003FC000000000000049C00000000000003FC000000000000049C000000000008044C00000000000804EC000000000008044C00000000000804EC00000000000003FC0	gefs_wave
19	0103000020E6100000010000000500000000000000008051C000000000000044C000000000008051C000000000000024C000000000000044C000000000000024C000000000000044C000000000000044C000000000008051C000000000000044C0	ecmwf_mensual
16	0103000020E610000001000000050000000000000000C462C0000000000000C03F0000000000203440000000000000C03F000000000020344000000000008856C00000000000C462C000000000008856C00000000000C462C0000000000000C03F	precip GFS 3-horario - SMN
\.


--
-- Name: escenas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: alerta5
--

SELECT pg_catalog.setval('public.escenas_id_seq', 21, true);

--
-- PostgreSQL database dump complete
--

