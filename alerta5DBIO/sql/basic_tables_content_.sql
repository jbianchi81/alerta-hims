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
-- Data for Name: accessors; Type: TABLE DATA; Schema: public; Owner: alerta5
--

COPY public.accessors (class, url, series_tipo, series_source_id, time_update, name, config, series_id, upload_fields, title) FROM stdin;
ecmwf_mensual	https://cds.climate.copernicus.eu/api/v2	raster	45	\N	ecmwf_mensual	{"localcopy":"/tmp/ecmwfMensual.grib","outputdir":"../data/cds","series_id":6,"url":"https://cds.climate.copernicus.eu/api/v2","key":"","variable": "total_precipitation", "dataset": "seasonal-monthly-single-levels"}	6	\N	\N
mch_py	https://mch-api.meteorologia.gov.py/api	puntual	29	\N	mch_py	{"url": "https://mch-api.meteorologia.gov.py/api", "token": "", "variable_map": {"1": "precipitacion", "6": "temperatura_maxima", "7": "temperatura_minima", "57": "direccion_viento", "13": "insolacion", "60": "presion_nivel_estacion", "62": "nubosidad", "63": "presion_nivel_mar", "42": "visibilidad", "43": "temperatura_punto_rocio", "45": "temperatura_bulbo_humedo", "55": "velocidad_viento"}}	\N	\N	DMH Paraguay - PCH API
gfs_smn	ftp://200.16.116.5/vila	raster	42	\N	gfs_smn	{"ftp_connection_pars": {"host":"200.16.116.5", "user": "", "password": ""},"localcopy": "/tmp/gfs.local-copy.grb", "outputdir": "/tmp"}	\N	\N	\N
prefe	https://192.231.120.130/alturas/?page=historico&tiempo=7&id=	puntual	10	\N	prefe	\N	\N	\N	\N
ons	http://sdro.ons.org.br/SDRO/DIARIO/	puntual	18	\N	ons	\N	\N	\N	\N
tabprono	/mount/win/CRITICO/Alerta/Planillas_Juan_Borús/	puntual	10	\N	tabprono	{"file":"../public/planillas/Tabprono.xls"}	\N	{"forecast_date":{"type":"date", "required":true,"description":"fecha de pronóstico"}}	Tabprono (pronósticos Paraná)
alturas_pna	\N	puntual	10	\N	alturas_pna	{  "date_row":5,  "data_start_row":8,  "data_columns": [1,2],  "file": "../public/planillas/alturas_pna.xlsx",  "csvFile": "../public/planillas/alturas_pna.csv",  "site_codes": {"Andresito":8,"Iguazú":9,"Libertad":10,"Eldorado":11,"Libertador":12,"Santa Ana":13,"Puerto Mani":131,"Posadas":14,"Ituzaingó":15,"Ita Ibaté":16,"Itatí":17,"Paso dela Patria":18,"Corrientes":19,"Barranqueras":20,"Empedrado":21,"Bella Vista":22,"Goya":23,"Reconquista":24,"Esquina":25,"La Paz":26,"Santa Elena":27,"Hernandarias":28,"Parana":29,"Santa Fe":30,"Diamante":31,"Victoria":32,"San Lorenzo (San Martín)":33,"Rosario":34,"Villa Constitución":35,"San Nicolás":36,"Ramallo":37,"San Pedro":38,"Baradero":39,"Zárate":40,"Campana":41,"Escobar":42,"Paranacito":43,"Canal Nuevo":44,"Ibicuy":45,"Martín García":47,"Guazucito":48,"Tigre":49,"Dique Luján":50,"Chaná Miní":51,"San Fernando":52,"San Isidro":53,"Olivos":54,"Pilcomayo":55,"Bouvier":56,"Formosa":57,"Bermejo":58,"Isla del Cerrito":59,"San Javier":65,"Barra Concepción":66,"Garruchos":67,"Santo Tomé":68,"Alvear":69,"La Cruz":70,"Yapeyú":71,"Paso de los Libres":72,"Bonpland":73,"Monte Caseros":74,"Mocoretá":75,"Federación":76,"Federación Embalse":5430,"Salto Grande Arriba":77,"Salto Grande Abajo":78,"Concordia":79,"Colón":80,"Concep. del Uruguay":81,"Campichuelo":82,"Pto. Gualeguaychú":83,"Boca Gualeguaychú":84,"Pto Ruiz":46,"Buenos Aires":85,"La Plata":86  }  }	\N	{}	Alturas de PNA
ctm	\N	\N	\N	\N	ctm	{\n   "date_row": 5,\n   "data_start_row": 9,\n   "data_end_row": 30,\n   "columns": {\n    "estacion": {\n     "start_column": 40,\n     "end_column": 60\n    },\n    "nivel_ayer": {\n     "start_column": 61,\n     "end_column": 74\n    },\n    "caudal_ayer": {\n     "start_column": 75,\n     "end_column": 89\n    },\n    "nivel_hoy": {\n     "start_column": 90,\n     "end_column": 100\n    },\n    "caudal_hoy": {\n     "start_column": 107,\n     "end_column": 114\n    }\n   },\n   "series_map": {\n  "Pepiri Mini": {\n   "estacion_id": 60,\n   "altura_series_id": 60\n  },\n  "El Soberbio": {\n   "estacion_id": 61,\n   "altura_series_id": 61,\n   "caudal_series_id": 910\n  },\n  "Alicia": {\n   "estacion_id": 62,\n   "altura_series_id": 62\n  },\n  "Alba Pose": {\n   "estacion_id": 63,\n   "altura_series_id": 63\n  },\n  "Panambi": {\n   "estacion_id": 64,\n   "altura_series_id": 64\n  },\n  "San Javier": {\n   "estacion_id": 65,\n   "altura_series_id": 65,\n   "caudal_series_id": 914\n  },\n  "Barra Concepcion": {\n   "estacion_id": 66,\n   "altura_series_id": 66\n  },\n  "Garruchos": {\n   "estacion_id": 67,\n   "altura_series_id": 67\n  },\n  "Santo Tome": {\n   "estacion_id": 68,\n   "altura_series_id": 68,\n   "caudal_series_id": 917\n  },\n  "Alvear": {\n   "estacion_id": 69,\n   "altura_series_id": 69,\n   "caudal_series_id": 918\n  },\n  "La Cruz": {\n   "estacion_id": 70,\n   "altura_series_id": 70\n  },\n  "Yapeyu": {\n   "estacion_id": 71,\n   "altura_series_id": 71\n  },\n  "Paso de los Libres": {\n   "estacion_id": 72,\n   "altura_series_id": 72,\n   "caudal_series_id": 921\n  },\n  "Bompland": {\n   "estacion_id": 73,\n   "altura_series_id": 73\n  },\n  "Monte Caseros": {\n   "estacion_id": 74,\n   "altura_series_id": 74\n  },\n  "Mocoreta": {\n   "estacion_id": 75,\n   "altura_series_id": 75\n  },\n  "Federacion": {\n   "estacion_id": 76,\n   "altura_series_id": 76\n  },\n  "Embalse": {\n   "estacion_id": 77,\n   "altura_series_id": 77\n  },\n  "Restitucion": {\n   "estacion_id": 78,\n   "altura_series_id": 78\n  },\n  "Concordia": {\n   "estacion_id": 79,\n   "altura_series_id": 79\n  },\n  "Aporte": {\n   "estacion_id": 89,\n   "altura_series_id": 89,\n   "caudal_series_id": 938\n  },\n  "Erogado": {\n   "estacion_id": 90,\n   "altura_series_id": 90,\n   "caudal_series_id": 939\n  }\n   },\n   "file": "../public/planillas/ctm.pdf",\n   "txtFile": "../public/planillas/ctm.txt"\n  }	\N	{}	Alturas y caudales de Salto Grande (CTM)
eby	\N	\N	\N	\N	eby	{\n   "data_row": 18,\n   "prono_rows": [25, 26, 27, 28, 29], \n   "date_column": 3,\n   "series_map": {\n    "afluente": {\n     "column": 4,\n     "obs_series_id": 936,\n     "prono_series_id": 1414,\n     "prono_cal_id": 224\n    },\n    "descargado": {\n     "column": 5,\n     "obs_series_id": 937,\n     "prono_series_id": 1533,\n     "prono_cal_id": 427\n    }\n   },\n   "file": "../public/planillas/eby.xlsx",\n   "csvFile": "../public/planillas/eby.csv"\n  }	\N	{}	Caudales Yacyretá (EBY)
sqpe_smn	ftp://200.16.116.5/SQPE	raster	44	\N	sqpe_smn	{"host":"200.16.116.5","user":"","password":"","path":"/SQPE","download_dir":"../data/sqpe_smn"}	5	\N	\N
ana	http://telemetriaws1.ana.gov.br/serviceANA.asmx	puntual	19	\N	ana	{"estacion_ids": [[191, 260, 262, 264, 269, 272, 274, 293, 298, 303, 307, 311, 314, 318], [4089, 4090, 4091, 4092, 4095, 4096, 4099, 4100, 4101, 4102, 4103, 4107, 4109, 4110], [4111, 4112, 4113, 4114, 4116, 4119, 4122, 4124, 4125, 4126, 4130, 4143, 4145, 4147], [4148, 4149, 4151, 4152, 4153, 4154, 4155, 4156, 4157, 4158, 4159, 4160, 4161, 4164], [4165, 4168, 4169, 4170, 4171, 4172, 4173, 4174, 4175, 4176, 4177, 4178, 4180, 4182], [4183, 4184, 4185, 4186, 4189, 4193, 4197, 4198, 4201, 4202, 4203, 4211, 4213, 4214], [4215, 4216, 4217, 4218, 4219, 4220, 4221, 4222, 4223, 4225, 4226, 4228, 4229, 4230], [4231, 4232, 4233, 4234, 4236, 4237, 4238, 4239, 4240, 4242, 4243, 4244, 4247, 4248], [4249, 4250, 4252, 4253, 4254, 4256, 4258, 4259, 4260, 4261, 4262, 4263, 4265, 4266], [4267, 4268, 4269, 4270, 4271, 4272, 4273, 4277, 4279, 4280, 4281, 4282, 4284, 4286], [4287, 4289, 4290, 4291, 4292, 4293, 4294, 4295, 4296, 4297, 4298, 4301, 4303, 4304], [4305, 4306, 4313, 4314, 4315, 4317, 4318, 4319, 4320, 4322, 4323, 4324, 4326, 4327], [4328, 4329, 4330, 4331, 4336, 4337, 4339, 4340, 4341, 4342, 4343, 4345, 4346, 4347], [4348, 4349, 4350, 4351, 4352, 4354, 4355, 4356, 4357, 4358, 4359, 4360, 4361, 4362], [4364, 4365, 4366, 4368, 4370, 4371, 4373, 4374, 4376, 4377, 4386, 4387, 4392, 4394], [4400, 4402, 4403, 4405, 4406, 4407, 4410, 4413, 4415, 4416, 4417, 4418, 4420, 4423], [4425, 4426, 4427, 4428, 4430, 4433, 4434, 4435, 4436, 4437, 4438, 4440, 4441, 4444], [4445, 4446, 4447, 4448, 4449, 4450, 4451, 4454, 4455, 4456, 4457, 4459, 4461, 4462], [4463, 4464, 4465, 4466, 4467, 4468, 4469, 4470, 4471, 4472, 4473, 4475, 4477, 4478], [4479, 4480, 4483, 4484, 4485, 4488, 4491, 4492, 4495, 4496, 4502, 4507, 4510, 4514], [4517, 4521, 4529, 4532, 4533, 4535, 4536, 4537, 4538, 4540, 4541, 4542, 4543, 4548], [4549, 4550, 4556, 4557, 4560, 4565, 4566, 4567, 4570, 4579, 4582, 4584, 4585, 4586], [4588, 4590, 4592, 4593, 4595, 4597, 4598, 4600, 4601, 4603, 4604, 4605, 4606, 4607], [4608, 4610, 4611, 4614, 4616, 4617, 4618, 4619, 4620, 4621, 4622, 4623, 4624, 4625], [4626, 4627, 4628, 4629, 4630, 4631, 4633, 4634, 4636, 4637, 4639, 4641, 4642, 4643], [4646, 4647, 4648, 4649, 4650, 4651, 4652, 4656, 4657, 4658, 4659, 4660, 4661, 4662], [4663, 4664, 4665, 4667, 4668, 4669, 4670, 4674, 4676, 4677, 4678, 4679, 4682, 4683], [4684, 4685, 4686, 4687, 4688, 4691, 4692, 4693, 4695, 4696, 4697, 4698, 4699, 4703], [4707, 4708, 4709, 4710, 4712, 4714, 4716, 4717, 4721, 4722, 4727, 4730, 4731, 4733], [4734, 4735, 4737, 4739, 4740, 4741, 4742, 4743, 4746, 4751, 4752, 4754, 4755, 4756], [4757, 4758, 4760, 4764, 4765, 4766, 4767, 4768, 4771, 4774, 4775, 4776, 4777, 4778], [4779, 4780, 4781, 4782, 4783, 4784, 4786, 4788, 4789, 4790, 4791, 4792, 4793, 4794], [4795, 4796, 4797, 4798, 4799, 4800, 4801, 4802, 4803, 4804, 4805, 4806, 4807, 4808], [4809, 4810, 4811, 4812, 4816, 4817, 4819, 4820, 4824, 4826, 4829, 4831, 4833], [4835, 4836, 4837, 4838, 4840, 4841, 4842, 4843, 4845, 4846, 4847, 4848, 4849], [4851, 4852, 4853, 4854, 4855, 4856, 4857, 4858, 4859, 4860, 4861, 4862, 4863], [4864, 4868, 4870, 4871, 4874, 4875, 4877, 4878, 4879, 4880, 4881, 4882, 4883], [4885, 4886, 4887, 4888, 4890, 4891, 4892, 4893, 4895, 4898, 4899, 4900, 4901], [4902, 4903, 4904, 4905, 4907, 4908, 4910, 4911, 4912, 4913, 4914, 4915, 4916], [4917, 4919, 4920, 4922, 4923, 4924, 4926, 4928, 4932, 4933, 4934, 4935, 4936], [4938, 4939, 4940, 4942, 4943, 4945, 4946, 4947, 4948, 4949, 4950, 4951, 4952], [4955, 4956, 4957, 4958, 4959, 4961, 4962, 4963, 4965, 4967, 4971, 4972, 4973], [4977, 4980, 4983, 4984, 4986, 4987, 4988, 4990, 4992, 4993, 4995, 4996, 4998], [5000, 5002, 5003, 5004, 5006, 5007, 5008, 5009, 5010, 5012, 5015, 5016, 5018], [5019, 5020, 5021, 5023, 5024, 5025, 5026, 5027, 5028, 5029, 5031, 5033, 5034], [5035, 5037, 5038, 5040, 5043, 5044, 5045, 5046, 5048, 5051, 5052, 5053, 5054], [5055, 5056, 5057, 5058, 5059, 5060, 5061, 5062, 5063, 5064, 5066, 5067, 5069], [5070, 5071, 5072, 5074, 5078, 5085, 5086, 5087, 5088, 5089, 5090, 5091, 5092], [5093, 5094, 5095, 5096, 5097, 5100, 5101, 5103, 5105, 5107, 5108, 5112, 5113], [5114, 5115, 5117, 5122, 5123, 5124, 5125, 5126, 5127, 5129, 5130, 5132, 5133], [5134, 5136, 5142, 5145, 5146, 5147, 5148, 5149, 5151, 5152, 5154, 5155, 5158], [5159, 5161, 5163, 5166, 5167, 5168, 5170, 5171, 5172, 5173, 5174, 5177, 5178], [5181, 5182, 5183, 5187, 5189, 5190, 5191, 5192, 5196, 5197, 5199, 5201, 5205], [5206, 5207, 5211, 5212, 5214, 5215, 5216, 5222, 5223, 5224, 5225, 5226, 5228], [5230, 5231, 5232, 5233, 5236, 5238, 5239, 5243, 5246, 5249, 5252, 5253, 5263], [5264, 5265, 5266, 5267, 5270, 5271, 5273, 5281, 5282, 5283, 5284, 5286, 5288], [5289, 5293, 5294, 5296, 5298, 5303, 5308, 5309, 5311, 5312, 5313, 5314, 5317], [5318, 5322, 5323, 5324, 5325, 5326, 5328, 5331, 5332, 5333, 5335, 5336, 5337], [5338, 5339, 5340, 5341, 5342, 5343, 5344, 5346, 5347, 5351, 5352, 5357, 5358], [5359, 5360, 5361, 5362, 5364, 5366, 5367, 5368, 5369, 5371, 5375, 5379, 5380]], "precip_estacion_ids": [4977, 4971, 4961, 4687, 4880, 4174, 4298, 4126, 4247, 4096, 4229, 4319, 4402, 4215, 4346, 4457, 4616, 4535, 4597, 4847, 4691, 4807, 5006, 5375, 5023, 5063, 5078, 5046, 5371, 5004, 5035, 5142, 5346, 5064, 5243, 4709, 4746, 4870, 4888, 4892, 5115, 5087, 5192, 5317, 5366, 5358, 303, 5293, 318, 4952, 4842, 4826, 4864, 4840, 4817, 4496, 4676, 4693, 5070, 5063, 5058, 4164, 5015, 4284, 4262, 4239, 4226, 4214, 4158, 4180, 4096]}	\N	\N	\N
ecmwf_mensual	https://cds.climate.copernicus.eu/api/v2	raster	46	\N	ecmwf_mensual_anom	{"localcopy":"/tmp/ecmwfMensual.grib","outputdir":"../data/cds","series_id":7,"url":"https://cds.climate.copernicus.eu/api/v2","key":"","variable": "total_precipitation_anomalous_rate_of_accumulation", "dataset": "seasonal-postprocessed-single-levels"}	7	{}	ECMWF mensual - anomalía de precipitación
telex	/mount/win/CRITICO/Alerta/telex/	puntual	10	\N	telex	{"file":"../public/planillas/Telex.xls"}	\N	{"timestart":{"type":"date", "required":false, "description":"fecha inicial"}}	Telex
paraguay09	/mount/win/CRITICO/Alerta/Planillas_Juan_Borús/Paraguay_09.xls	puntual	10	\N	paraguay09	{"file":"../public/planillas/Paraguay_09.xls"}	\N	{"timestart":{"type":"date", "required":false, "description":"fecha inicial"}}	Paraguay_09
sarws	http://sarws.ana.gov.br/SarWebService.asmx	puntual	18	\N	sarws	{"estacion_ids":[1230,1231,1232,1240,1237,1234,1236,1235,1238,1239,1241,1186,1187,1188,1189,1190,1191,1192,1193,1194,1195,1196,1197,1198,1199,1200,1201,1202,1203,1204,1205,1206,1207,1208,1209,1210,1211,1212,1213,1214,1179,1180,1182,1183,1184,1185,1215,1217,1218,1219,1220,1222,1256,1242,1243,1244,1245,1246,1247,1248,1249,1250,1251,1253,1254,1255,1252,1226,1227,1228,1229,1221,1223,1224,1225,1178,1233,1216,1181]}	\N	{}	web service reservatorios SIN ANA - Brasil
sihn	\N	\N	\N	\N	sihn	{\n\t"url": "http://www.hidro.gob.ar/api/v1/AlturasHorarias/geojsonRiopla",\n\t"series_map": {\n\t\t"ATAL": {"series_id": 3344, "estacion_id": 1739}, \n\t\t"OYAR": {"series_id": 3312, "estacion_id": 1706},\n\t\t"LPLA": {"series_id": 3314, "estacion_id": 1708}, \n\t\t"BSAS": {"series_id": 85, "estacion_id": 85},\n\t\t"SFER": {"series_id": 52, "estacion_id": 52}\n\t}}	\N	{}	Alturas mareógrafos RDP, últimos registros. SIHN
snih	https://snih.hidricosargentina.gob.ar/Filtros.aspx	puntual	\N	\N	snih	{"variable_map": {  "1": {"var_id": 2,"unit_id": 11,"descripcion": "Altura"  },  "4": {"var_id": 55,"unit_id": 13,"descripcion": "Velocidad del Viento"  },  "12": {"var_id": 14,"unit_id": 356,"descripcion": "Radiacion Solar"  },  "14": {"var_id": 53,"unit_id": 12,"descripcion": "Temperatura Bulbo Seco"  },  "15": {"var_id": 45,"unit_id": 12,"descripcion": "Temperatura Bulbo Humedo"  },  "16": {"var_id": 6,"unit_id": 12,"descripcion": "Temperatura Máxima"  },  "17": {"var_id": 5,"unit_id": 12,"descripcion": "Temperatura Mínima"  },  "19": {"var_id": 72,"unit_id": 15,"descripcion": "Humedad Max"  },  "20": {"var_id": 27,"unit_id": 9,"descripcion": "Precipitación"  },  "101": {"var_id": 40,"unit_id": 10,"descripcion": "Caudal Medio Diario"  },  "102": {"var_id": 48,"unit_id": 10,"descripcion": "Caudal Medio Mensual"  },  "103": {"var_id": 70,"unit_id": 10,"descripcion": "QMax Instantáneo"  },  "104": {"var_id": 71,"unit_id": 10,"descripcion": "QMin Instantáneo"  },  "105": {"var_id": 68,"unit_id": 10,"descripcion": "Caudal Medio Diario Máximo"  },  "106": {"var_id": 69,"unit_id": 10,"descripcion": "Caudal Medio Diario Mínimo"  },  "206": {"var_id": 73,"unit_id": 12,"descripcion": "TEMPERATURA DEL AGUA"  },  "218": {"var_id": 60,"unit_id": 18,"descripcion": "Presión Atmosférica [mBar]"  },  "300": {"var_id": 7,"unit_id": 12,"descripcion": "Temperatura Media"  },  "301": {"var_id": 10,"unit_id": 13,"descripcion": "Velocidad del viento media"  },  "302": {"var_id": 9,"unit_id": 13,"descripcion": "Velocidad del viento máxima"  },  "351": {"var_id": 60,"unit_id": 357,"descripcion": "Presión Atmosférica [mmHg]"  },  "-1": {"var_id": 19,"unit_id": 21,"descripcion": "Aforo"  }},"asociaciones": "config/SNIH_listaAsociaciones.json", "provincias_map": {"13": "Buenos Aires","2": "Catamarca","21": "Chaco","12": "Chubut", "22": "Córdoba","20": "Corrientes","23": "Entre Ríos","14": "Formosa","1": "Jujuy","19": "La Pampa","6": "La Rioja","8": "Mendoza","18": "Misiones","11": "Neuquén","10": "Río Negro","4": "Salta","15": "Santa Cruz","16": "Santa Fe","5": "Santiago del Estero","7": "San Juan","9": "San Luis","17": "Tierra del Fuego","3": "Tucumán"}}	\N	{}	Sistema Nacional de Información Hídrica - SIPH
conae_api	ftp://ftp4.conae.gov.ar	raster	47	\N	conae_api	{"localcopy": "/tmp/conae_api.zip", "outputdir": "../data/conae_api", "series_id": 9, "ftp_connection_pars": {"host": "ftp4.conae.gov.ar", "user": "", "password": ""}}	9	{}	CONAE - API
fdx	http://cloud-beta.fdx-ingenieria.com.ar/api_new	puntual	\N	\N	fdx	{"url": "http://cloud-beta.fdx-ingenieria.com.ar/api_new","sites": [{"id":7,"user":"","estacion_id":1257},{"id":24,"user":"","estacion_id":1696},{"id":6,"user":"","estacion_id":1698},{"id":22,"user":"","estacion_id":1701},{"id":3,"user":"","estacion_id":1743},{"id":5,"user":"","estacion_id":1744},{"id":28,"user":"","estacion_id":1877},{"id":25,"user":"","estacion_id":2230},{"id":29,"user":"","estacion_id":5873},{"id":8,"user":"","estacion_id":5874},{"id":30,"user":"","estacion_id":5876}]}	\N	{}	API de sensores hidrométricos de FdX
gefs_wave	https://nomads.ncep.noaa.gov/cgi-bin/filter_gefs_wave_0p25.pl	\N	\N	\N	gefs_wave	{"dt": 3, "bbox": {"toplat": -31, "leftlon": -61, "rightlon": -50, "bottomlat": -41}, "levels": ["surface"], "api_url": "https://nomads.ncep.noaa.gov/cgi-bin/filter_gefs_wave_0p25.pl", "data_dir": "/../data/gefs_wave/", "end_hour": 384, "files_url": "https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/", "variables": ["UGRD", "VGRD"], "start_hour": 0, "variable_map": {"UGRD": {"name": "ugrd", "var_id": 65, "proc_id": 5, "unit_id": 355, "series_id": 11}, "VGRD": {"name": "vgrd", "var_id": 66, "proc_id": 5, "unit_id": 355, "series_id": 12}}}	\N	{}	NCEP WAVE Model Forecasts
conae_gc	\N	\N	\N	\N	conae_gc	{\n\t"url": "ftp01.uss.saocom.conae.gov.ar",\n\t"user": "",\n\t"password": "",\n\t"local_dir": "../data/conae_gc",\n\t"areas_map": {\n\t\t"1": {\n\t\t\t"id": 478,\n\t\t\t"exutorio_id": 1678,\n\t\t\t"nombre": "Gualeguay @ Federal"\n\t\t},\n\t\t"2": {\n\t\t\t"id": 479,\n\t\t\t"exutorio_id": 4,\n\t\t\t"nombre": "Gualeguay @ Villaguay"\n\t\t},\n\t\t"3": {\n\t\t\t"id": 2,\n\t\t\t"exutorio_id": 2,\n\t\t\t"nombre": "Gualeguay @ Rosario Tala"\n\t\t},\n\t\t"4": {\n\t\t\t"id": 477,\n\t\t\t"exutorio_id": 132,\n\t\t\t"nombre": "Matanza - Riachuelo @ Ricchieri"\n\t\t},\n\t\t"5": {\n\t\t\t"id": 480,\n\t\t\t"exutorio_id": 5890,\n\t\t\t"nombre": "Pergamino @ Pergamino"\n\t\t},\n\t\t"6": {\n\t\t\t"id": 481,\n\t\t\t"exutorio_id": 1259,\n\t\t\t"nombre": "Colón @ Colón"\n\t\t},\n\t\t"7": {\n\t\t\t"id": 482,\n\t\t\t"exutorio_id": 145,\n\t\t\t"nombre": "Rojas @ Rojas"\n\t\t},\n\t\t"8": {\n\t\t\t"id": 101,\n\t\t\t"exutorio_id": 101,\n\t\t\t"nombre": "Salto @ Salto"\n\t\t},\n\t\t"9": {\n\t\t\t"id": 100,\n\t\t\t"exutorio_id": 100,\n\t\t\t"nombre": "Arrecifes @ Arrecifes"\n\t\t},\n\t\t"10": {\n\t\t\t"id": 103,\n\t\t\t"exutorio_id": 103,\n\t\t\t"nombre": "Salado Norte @ Recreo"\n\t\t},\n\t\t"11": {\n\t\t\t"id": 483,\n\t\t\t"exutorio_id": 158,\n\t\t\t"nombre": "Lujan @ Mercedes"\n\t\t},\n\t\t"12": {\n\t\t\t"id": 215,\n\t\t\t"exutorio_id": 7,\n\t\t\t"nombre": "Lujan @ Jauregui"\n\t\t},\n\t\t"13": {\n\t\t\t"id": 115,\n\t\t\t"exutorio_id": 115,\n\t\t\t"nombre": "Pergamino @ Urquiza"\n\t\t},\n\t\t"14": {\n\t\t\t"id": 484,\n\t\t\t"exutorio_id": 5891,\n\t\t\t"nombre": "Villaguay @ Villaguay"\n\t\t},\n\t\t"15": {\n\t\t\t"id": 142,\n\t\t\t"exutorio_id": 2214,\n\t\t\t"nombre": "Areco @ Carmen de Areco"\n\t\t},\n\t\t"16": {\n\t\t\t"id": 113,\n\t\t\t"exutorio_id": 2215,\n\t\t\t"nombre": "Areco @ San Antonio de Areco"\n\t\t},\n\t\t"17": {\n\t\t\t"id": 334,\n\t\t\t"exutorio_id": 2050,\n\t\t\t"nombre": "Gualeguaychú @ RN136"\n\t\t},\n\t\t"18": {\n\t\t\t"id": 5,\n\t\t\t"exutorio_id": 2158,\n\t\t\t"nombre": "Feliciano @ Paso Medina"\n\t\t},\n\t\t"19": {\n\t\t\t"id": 118,\n\t\t\t"exutorio_id": 2204,\n\t\t\t"nombre": "Carcarañá @ Pueblo Andino"\n\t\t}\n\t}\n}	\N	{}	Guía de crecidas HEM - SAOCOM, CONAE
delta_qmeddiario	\N	\N	\N	\N	delta_qmeddiario	{ "series_ids": [25480, 25479, 25481], "first_data_col": 2, "file": "../public/planillas/delta_qmeddiario.xls", "csvfile": "../public/planillas/delta_qmeddiario.txt" }	\N	{"timestart":{"description":"fecha inicial","type":"date","required":false},"timeend":{"description":"fecha final","type":"date","required":false}}	Caudal medio diario frente del delta del Paraná-Uruguay
conae_hem	\N	\N	\N	\N	conae_hem	{"ftp_connection_pars":{"host":"ftp01.uss.saocom.conae.gov.ar", "user": "", "password": "","path":"/"},"localcopy": "/tmp/conae_hem.zip","outputdir": "../data/conae_hem"}	\N	{}	CONAE HEM
fieldclimate	https://api.fieldclimate.com/v1	\N	\N	\N	fieldclimate	{"url": "https://api.fieldclimate.com/v1", "users": {"fuentes": {"password": "", "stations": {"00000477": {"name": "Fuentes", "estacion_id": 857}}, "public_key": "", "private_key": ""}, "villa eloisa": {"password": "", "stations": {"00000492": {"name": "Villa Eloisa", "estacion_id": 871}}, "public_key": "", "private_key": ""}, "venado tuerto": {"password": "", "stations": {"00000491": {"name": "Venado Tuerto", "estacion_id": 869}}, "public_key": "", "private_key": ""}}, "variable_ids": {"5": {"name": "Wind speed", "unit": "m/s", "var_id": 56, "unit_id": 355}, "6": {"name": "Precipitation", "unit": "mm", "var_id": 31, "unit_id": 9}, "21": {"name": "Dew point", "unit": "°C", "var_id": 43, "unit_id": 12}, "143": {"name": "Wind direction", "unit": "deg", "var_id": 57, "unit_id": 16}, "506": {"name": "HC Air temperature", "unit": "°C", "var_id": 54, "unit_id": 12}, "507": {"name": "HC Relative humidity", "unit": "%", "var_id": 59, "unit_id": 15}, "600": {"name": "Solar radiation", "unit": "W/m2", "var_id": 14, "unit_id": 33}, "16895": {"name": "Air pressure", "unit": "mbar", "var_id": 61, "unit_id": 18}}}	\N	{}	\N
sat2	\N	\N	\N	\N	sat2	{"7": {"var_id": 38, "proc_id": 1, "unit_id": 9}, "10": {"var_id": 55, "proc_id": 1, "unit_id": 13}, "11": {"var_id": 57, "proc_id": 1, "unit_id": 16}, "12": {"var_id": 53, "proc_id": 1, "unit_id": 12}, "13": {"var_id": 58, "proc_id": 1, "unit_id": 15}, "14": {"var_id": 14, "proc_id": 1, "unit_id": 33}, "15": {"var_id": 60, "proc_id": 1, "unit_id": 17}, "146": {"var_id": 2, "proc_id": 1, "unit_id": 11}, "147": {"var_id": 2, "proc_id": 1, "unit_id": 11}, "148": {"var_id": 2, "proc_id": 1, "unit_id": 11}, "149": {"var_id": 37, "proc_id": 1, "unit_id": 11}, "162": {"var_id": 2, "proc_id": 1, "unit_id": 11}}	\N	{}	Sistema Nacional de Información Hídrica - estaciones telemétricas - API JSON
sissa	https://api.crc-sas.org/ws-api	\N	\N	\N	sissa	{\n  "url": "https://api.crc-sas.org/ws-api",\n  "username": "",\n  "password": "",\n  "variable_map": {\n   "helio":13,\n   "hr":12,\n   "nub":17,\n   "prcp":1,\n   "pres_est":16,\n   "pres_nm":18,\n   "td":43,\n   "tmax":6,\n   "tmed":7,\n   "tmin":5,\n   "vmax_d":11,\n   "vmax_f":9,\n   "vmed":10\n  },\n  "tmp_dir" : "/tmp",\n  "estacion_ids": [ 5431,5432,5433,5434,5435,5436,5437,5438,5439,5440,5441,5442,5443,5444,5445,5446,5447,5448,5449,5450,5451,5452,5453,5454,5455,5456,5457,5458,5459,5460,5461,5462,5463,5464,5465,5466,5467,5468,5469,5470,5471,5472,5473,5474,5475,5476,5477,5478,5479,5480,5481,5482,5483,5484,5485,5486,5487,5488,5489,5490,5491,5492,5493,5494,5495,5496,5497,5498,5499,5500,5501,5502,5503,5504,5505,5506,5507,5508,5509,5510,5511,5512,5513,5514,5515,5516,5517,5518,5519,5520,5521,5522,5523,5524,5525,5526,5527,5528,5529,5530,5531,5532,5533,5535,5536,5537,5538,5539,5540,5541,5542,5543,5544,5545,5546,5547,5548,5549,5550,5551,5552,5553,5554,5555,5556,5557,5558,5559,5560,5561,5562,5563,5564,5580,5581,5582,5583,5584,5585,5586,5587,5588,5589,5590,5591,5592,5593,5594,5595,5596,5597,5598,5599,5600,5601,5602,5603,5604,5605,5606,5607,5608,5609,5610,5611,5612,5613,5614,5615,5616,5617,5618,5619,5620,5621,5622,5623,5624,5625,5626,5627,5628,5629,5630,5631,5632,5633,5634,5635,5636,5637,5638,5639,5640,5641,5642,5643,5644,5645,5646,5647,5648,5649,5650,5651,5652,5653,5654,5655,5656,5657,5658,5659,5660,5661,5662,5663,5664,5665,5666,5667,5668,5669,5670,5671,5672,5673,5674,5675,5676,5677,5678,5679,5680,5681,5682,5683,5684,5685,5686,5687,5688,5689,5690,5691,5692,5693,5694,5695,5696,5697,5698,5699,5700,5701,5702,5703,5704,5705,5706,5707,5708,5709,5710,5711,5712,5713,5714,5715,5716,5717,5718,5719,5720,5721,5722,5723,5724,5725,5726,5727,5728,5729,5730,5731,5732,5733,5734,5735,5736,5737,5738,5739,5740,5741,5749,5750,5751,5752,5753,5754,5755,5756,5758,5759,5760,5761,5762,5763,5764,5765,5766,5767,5768,5769,5770,5771,5772,5773,5774,5775,5777,5778,5779,5797,5802,5803,5806,5807,5808,5809,5810,5811,5812,5813,5814,5816,5817,5818,5819,5820,5821,5822,5823,5824,5825,5826,5827,5828,5829,5830,5831,5833,5834,5835,5836,5837,5838,5839,5840,5841,5842,5843,5844,5845,5846,5847,5848,5849,5850,5851,5852,5853,5854,5855,5856,5857,5858,5859,5861,5862,5863,5864,5865,5866,5867 ]\n }	\N	{}	CRC-SAS SISSA API
\.


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

