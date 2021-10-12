var metadataElements = {
	estacion: {
		properties: {
			tabla: {
				type: "select_api",
				title: "fuentes (red)",
				required: true,
				filter: true,
				edit: true,
				api: {
					url:"obs/puntual/fuentes",
					value_prop: "tabla_id",
					name_prop: "nombre"
				},
				description: 'Identificador alfanumérico de la fuente (red). Consultar catálogo -> redes',
				link: {
				element: "redes",
					filters: {
						tabla: "tabla_id"
					},
					name: "Fuente (red)"
				} 
			},
			id: {
				type: "number",
				title: "id",
				required: true,
				hidden: true,
				filter: true,
				description: "Al crear una estación se genera un id nuevo. El id suministrado se almacena en la base de datos (campo id de la tabla estaciones) pero el id generado constituye el identificador único de la estación (campo unid).",
				min: 0,
				filterName: "unid",
				link: {
					element: "seriesPuntuales",
					filters: {
						id: "estacion_id"
					},
					name: "series puntuales"
				}
			},
			id_externo: {
				type: "text",
				title: "id externo",
				required: true,
				filter: true,
				description: "Identificador alfanumérico otorgado por el propietario de la estación. Debe ser único entre las estaciones de la misma fuente (red).",
				edit: true
			},
			nombre: {
				type: "text",
				title: "nombre",
				required: true,
				filter: true,
				edit: true
			},
			longitud: {
				type: "number",
				step: 0.0000000000001,
				title: "longitud",
				required: true,
				edit: true
			},
			latitud: {
				type: "number",
				step: 0.0000000000001,
				title: "latitud",
				required: true,
				edit: true
			},
			cero_ign: {
				type: "number",
				step: 0.000000001,
				title: "cero de escala",
				required: false,
				edit: true
			},
			altitud: {
				type: "number",
				step: "0.000000001",
				title: "altitud",
				required: false,
				edit: true
			},
			provincia: {
				type: "text",
				title: "provincia/distrito",
				required: false,
				edit: true,
				filter: true
			},
			pais: {
				type: "text",
				title: "país",
				required: false,
				edit: true,
				filter: true
			},
			rio: {
				type: "text",
				title: "río",
				required: false,
				edit: true,
				filter: true
			},
			automatica: {
				type: "boolean",
				title: "automática",
				required: false,
				edit: true,
				filter: true
			},
			propietario: {
				type: "text",
				title: "propietario",
				required: false,
				edit: true,
				filter: true
			},
			abreviatura: {
				type: "text",
				title: "abreviatura",
				required: false,
				edit: true,
				filter: true
			},
			url: {
				type: "text",
				title: "URL",
				required: false,
				edit: true
			},
			localidad: {
				type: "text",
				title: "localidad",
				required: false,
				edit: true
			},
			real: {
				type: "boolean",
				title: "real",
				required: false,
				edit: true,
				filter: true,
				description: "Indica si se trata de una estación real (verdadero) o virtual (falso)"
			},
			nivel_alerta: {
				type: "number",
				step: 0.000000001,
				title: "nivel de alerta",
				required: false,
				edit: true,
				description: "nivel hidrométrico de alerta de acuerdo a la autoridad local de protección civil" 
			},
			nivel_evacuacion: {
				type: "number",
				step: 0.000000001,
				title: "nivel de evacuación",
				required: false,
				edit: true,
				description: "nivel hidrométrico de evacuación de acuerdo a la autoridad local de protección civil" 
			},
			nivel_aguas_bajas: {
				type: "number",
				step: 0.000000001,
				title: "nivel de aguas bajas",
				required: false,
				edit: true,
				description: "nivel hidrométrico de aguas bajas de acuerdo a la autoridad local de puertos y/o saneamiento" 
			},
			geom: {
				type: "bbox",
				filter: true,
				edit: false,
				required: false,
				disabled: true,
				description: "ubicación de la estaciones en coordenadas geográficas. 1 par: punto, 2 pares: rectángulo",
				title: "bounding box",
				no_md: true
			},
			tipo: {
				type: "text",
				filter: true,
				edit: true,
				required: false,
				description: "Tipo de estación (H: hidrológica, M: meteorológica, A: Hidrometeorológica, E: embalse)",
				title: "tipo"
			},
			has_obs: {
				type: "boolean",
				filter: true,
				edit: true,
				required: false,
				description: "Variable binaria que indica si la estación actualmente produce datos",
				title: "está activa"
			},
			habilitar: {
				type: "boolean",
				filter: true,
				edit: true,
				required: false,
				description: "Variable binaria que indica si la estación está habilitada en el sistema de información",
				title: "está habilitada"
			}
		},
		endpoint: "obs/puntual/estaciones",
		objectName: "estacion",
		objectNamePlural: "estaciones",
		title: "Estaciones",
		displayMap: true,
		links: [
			"series"
		],
		nameProperty: "nombre",
		geomFilter: "geom"
	},
	"var": {
		properties: {
			id: {
				type: "number",
				required: true,
				title: "id",
				disabled: true,
				filter: true,
				description: "Identificador numérico único generado por el sistema",
				min: 0,
				link: [
					{
						element: "seriesPuntuales",
						filters: {
							id: "var_id"
						},
						name: "series puntuales"
					},
					{
						element: "seriesAreales",
						filters: {
							id: "var_id"
						},
						name: "series areales"
					}
				]
			},
			"var": {
				type: "text",
				maxLength: 6,
				title: "ID alfanumérico",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador alfanumérico de la variable. Debe ser único entre variables con la misma GeneralCategory" 
			},
			nombre: {
				type: "text",
				title: "nombre",
				required: true,
				filter: true,
				edit: true
			},
			abrev:{
				type: "text",
				title: "abreviatura",
				required: false,
				filter: true,
				edit: true,
				maxLength: 6
			},
			type:{
				type: "select",
				title: "type",
				required: true,
				options: [{nombre:"numérico",valor:"num"},{nombre:"arreglo numérico",valor:"numarr"}],
				default: "num",
				filter: true,
				edit: true
			},
			datatype:{
				type: "select",
				title: "dataType",
				required: true,
				options: ["Minimum","Average","Incremental","Continuous","Sporadic","Maximum","Cumulative","Constant Over Interval","Categorical"],
				default: "Continuous",
				filter: true,
				edit: true,
				description: "Typo de dato de acuerdo al lenguaje controlado definido en WaterML 1.1 en la tabla DataTypeCV"
			},
			valuetype:{
				type: "select",
				title: "valueType",
				required: true,
				options: ["Model Simulation Result","Field Observation","Derived Value","Sample"],
				default: "Field Observation",
				filter: true,
				edit: true,
				description: "Tipo de valor de acuerdo al lenguaje controlado definido en WaterML 1.1 en la tabla ValueTypeCV"
			},
			GeneralCategory: {
				type: "select",
				title: "GeneralCategory",
				required: true,
				options: ["Unknown","Water Quality","Climate","Hydrology","Biota","Geology","Meteorology"],
				default: "Unknown",
				filter: true,
				edit: true,
				description: "Categoría general de acuerdo al lenguaje controlado definido en WaterML 1.1 en la tabla GeneralCategoryCV"
			},
			VariableName:{
				type: "text",
				title: "VariableName",
				required: false,
				filter: true,
				edit: true,
				description: "Nombre de variable de acuerdo al lenguaje controlado definido en WaterML 1.1 en la tabla VariableNameCV"
			},
			SampleMedium: {
				type: "select",
				title: "SampleMedium",
				required: true,
				options: ["Unknown","Surface Water","Ground Water","Sediment","Soil","Air","Tissue","Precipitation"],
				default: "Unknown",
				filter: true,
				edit: true,
				description: "Medio de muestreo de acuerdo al lenguaje controlado definido en WaterML 1.1 en la tabla SampleMediumCV"
			},
			def_unit_id: {
				type: "number",
				title: "ID de unidades",
				required: true,
				default: 0,
				filter: true,
				edit: true,
				description: "Identificador numérico único de unidades por defecto de la variable. Ver Catálogo->unidades",
				min: 0,
				link: {
					element: "unidades",
					filters: {
						def_unit_id: "id"
					},
					name: "Unidades"
				} 
			},
			timeSupport: {
				type: "interval",
				title: "timeSupport",
				required: false,
				filter: true,
				edit: true,
				description: "Soporte temporal de la variable en formato SQL, por ejemplo: '3 hours' o '03:00:00'. Para variables a intervalo de tiempo regular"
			},
			def_hora_corte: {
				type: "interval",
				title: "hora de corte",
				required: false,
				filter: true,
				edit: true,
				description: "Hora de corte de la variable en formato SQL, por ejemplo: '3 hours' o '03:00:00'. Para variables a intervalo de tiempo regular"
			}
		},
		endpoint: "obs/variables",
		objectName: "variable",
		objectNamePlural: "variables",
		title: "Variables",
		nameProperty: "nombre"
	},
	procedimiento: {
		properties: {
			id: {
				type: "number",
				required: true,
				title: "id",
				disabled: true,
				filter: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0,
				link: [
					{
						element: "seriesPuntuales",
						filters: {
							id: "proc_id"
						},
						name: "series puntuales"
					},
					{
						element: "seriesAreales",
						filters: {
							id: "proc_id"
						},
						name: "series areales"
					}
				]
			},
			nombre: {
				type: "text",
				title: "nombre",
				required: true,
				filter: true,
				edit: true
			},
			abrev:{
				type: "text",
				title: "abreviatura",
				required: false,
				filter: true,
				edit: true
			},
			descripcion: {
				type: "text",
				title: "descripción",
				required: false,
				filter: true,
				edit: true
			}
		},
		endpoint: "obs/procedimientos",
		objectName: "procedimiento",
		objectNamePlural: "procedimientos",
		title: "Procedimientos",
		links: {
			series: {
				procId: "id"
			}
		},
		nameProperty: "nombre"
	},
	unidades: {
		properties: {
			id: {
				type: "number",
				required: true,
				title: "id",
				disabled: true,
				filter: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0,
				link: [
					{
						element: "seriesPuntuales",
						filters: {
							id: "unit_id"
						},
						name: "series puntuales"
					},
					{
						element: "seriesAreales",
						filters: {
							id: "unit_id"
						},
						name: "series areales"
					}
				]
			},
			nombre: {
				type: "text",
				title: "nombre",
				required: false,
				filter: true,
				edit: true
			},
			abrev:{
				type: "text",
				title: "abreviatura",
				required: false,
				filter: true,
				edit: true
			},
			UnitsID: {
				type: "number",
				title: "UnitsID",
				required: true,
				default: 0,
				filter: true,
				edit: true,
				min: 0,
				description: "Identificador numérico de unidades de acuerdo a WaterML 1.1 tabla UnitsCV"
			},
			UnitsType: {
				type: "select",
				title: "UnitsType",
				required: true,
				default: 0,
				filter: true,
				edit: true,
				options: ["Dimensionless", "Angle", "Area", "Frequency", "Permeability", "Energy", "EnergyFlux", "Flow", "Force", "Length", "Light", "Mass", "Power", "Pressure/Stress", "Pressure", "Stress", "Resolution", "Scale", "Temperature", "Time", "Velocity", "Volume","Unknown"],
				description: "Tipo de unidad de acuerdo a WaterML 1.1 tabla UnitsCV"
			}
		},
		endpoint: "obs/unidades",
		objectName: "unidades",
		objectNamePlural: "unidades",
		title: "Unidades",
		links: {
			"variables": {
				def_unit_id: "id"
			}
		},
		nameProperty: "nombre"
	},
	redes: {
		properties: {
			tabla_id: {
				type: "text",
				title: "id alfanumérico",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador alfanumérico único.",
				link: [
					{
						element: "seriesPuntuales",
						filters: {
							tabla_id: "tabla"
						},
						name: "series puntuales"
					}
				]
			},
			id: {
				type: "number",
				title: "id numérico",
				required: true,
				filter: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera",
				min: 0
			},
			nombre: {
				type: "text",
				title: "nombre",
				required: true,
				filter: true,
				edit: true
			},
			public: {
				type: "boolean",
				title: "abierto al público",
				required: false,
				"default": true,
				filter: true,
				edit: true,
				description: "Indica si los registros correspondientes son de disponibilidad abierta al público general"
			},
			public_his_plata: {
				type: "boolean",
				title: "publicado en HIS-Plata",
				required: true,
				"default": false,
				filter: true,
				edit: true,
				description: "Indica si los registros se publican en el sistema HIS-Plata"
			}
		},
		endpoint: "obs/puntual/fuentes",
		objectName: "red",
		objectNamePlural: "redes",
		title: "Redes",
		links: {
			estaciones: {
				tabla: "tabla_id"
			},
			series: {
				redId: "id"
			}
		},
		nameProperty: "nombre"
	},
	fuentes: {
		properties: {
			id: {
				type: "number",
				required: true,
				title: "id numérico único",
				filter: true,
				disabled: true,
				edit: false,
				description: "identificador numérico único de la fuente ráster",
				link: [
					{
						element: "seriesAreales",
						filters: {
							id: "fuentes_id"
						},
						name: "series areales"
					},
					{
						element: "seriesRaster",
						filters: {
							id: "fuentes_id"
						},
						name: "series raster"
					}
				]
			},
			nombre: {
				type: "text",
				required: true,
				title: "nombre de la fuente",
				edit: true,
				filter: true,
				description: "Nombre de la fuente ráster"
			},
			tipo: {
				type: "select",
				options: [{valor:"PA",nombre:"análisis de precipitación"},{valor:"FM",nombre:"magnitud de inundación"},{valor:"C",nombre:"climatología"},{valor:"QPF",nombre:"pronóstico cuantitativo de precipitación"},{valor:"WE",nombre:"extensión de agua en superficie"},{valor:"SM",nombre:"humedad del suelo"},{valor:"PI",nombre:"precipitación interpolada"},{valor:"QPE",nombre:"estimación cuantitativa de precipitación"},{valor:"ETP",nombre:"evapotranspiración potencial"}],
				required: false,
				title: "tipo de la fuente",
				edit: true,
				filter: true,
				description: "tipo de la fuente ráster"
			},
			def_proc_id: {
				type: "number",
				required: false,
				title: "id de procedimiento",
				edit: true,
				filter: true,
				description: "id de procedimiento por defecto",
				link: {
					element: "procedimiento",
					filters: {
						def_proc_id: "id"
					},
					name: "Procedimiento"
				} 
			},
			def_dt: {
				type: "interval",
				required: false,
				title: "intervalo temporal",
				edit: true,
				filter: true,
				description: "intervalo temporal",
				default: "1 day"
			},
			hora_corte: {
				type: "interval",
				required: false,
				title: "hora inicial",
				edit: true,
				filter: true,
				description: "hora inicial",
				default: "12:00:00"
			},
			def_unit_id: {
				type: "number",
				required: false,
				title: "id de unidades",
				edit: true,
				filter: true,
				description: "id de unidades por defecto",
				link: {
					element: "unidades",
					filters: {
						def_unit_id: "id"
					},
					name: "Unidades"
				} 
			},
			def_var_id: {
				type: "number",
				required: false,
				title: "id de variable",
				edit: true,
				filter: true,
				description: "id de variable por defecto",
				link: {
					element: "var",
					filters: {
						def_var_id: "id"
					},
					name: "Variable"
				} 
			},
			scale_factor: {
				type: "number",
				step: "0.0000001",
				required: false,
				title: "factor de escala",
				edit: true,
				filter: false,
				description: "factor de escala"
			},
			data_offset:  {
				type: "number",
				step: "0.0000001",
				required: false,
				title: "ordenada al origen (offset)",
				edit: true,
				filter: false,
				description: "ordenada al origen (offset)"
			},
			def_pixel_height: {
				type: "number",
				step: "0.0000001",
				required: false,
				title: "alto del píxel",
				edit: true,
				filter: false,
				description: "Tamaño del píxel en el eje Y"
			},
			def_pixel_width: {
				type: "number",
				step: "0.0000001",
				required: false,
				title: "ancho del píxel",
				edit: true,
				filter: false,
				description: "Tamaño del píxel en el eje X"
			},
			def_srid: {
				type: "number",
				required: false,
				default: 4326,
				title: "SRID",
				edit: true,
				filter: true,
				description: "Código SRID de la proyección"
			},
			def_extent: {
				type: "geometry",
				required: false,
				title: "extensión espacial",
				edit: true,
				filter: true,
				description: "extensión espacial del dataset",
				default: "-70,-40,-40,-10",
				filterName: "geom"
			},
			def_pixeltype: {
				type: "select",
				options: [
					{valor:"1BB",nombre:"1-bit boolean"},
					{valor:"2BUI",nombre:"2-bit unsigned integer"},
					{valor:"4BUI",nombre:"4-bit unsigned integer"},
					{valor:"8BSI",nombre:"8-bit signed integer"},
					{valor:"8BUI",nombre:"8-bit unsigned integer"},
					{valor:"16BSI",nombre:"16-bit signed integer"},
					{valor:"16BUI",nombre:"16-bit unsigned integer"},
					{valor:"32BSI",nombre:"32-bit signed integer"},
					{valor:"32BUI",nombre:"32-bit unsigned integer"},
					{valor:"32BF",nombre:"32-bit float"},
					{valor:"64BF",nombre:"64-bit float"}
				],
				required: false,
				default: "32BF",
				title: "tipo de píxel",
				edit: true,
				filter: true,
				description: "tipo del píxel"
			},
			abstract: {
				type: "text",
				required: false,
				title: "resumen",
				edit: true,
				filter: true,
				description: "resumen"
			},
			source: {
				type: "text",
				required: false,
				title: "url",
				edit: true,
				filter: true,
				description: "url de origen del dataset"
			},
			public: {
				type: "boolean",
				title: "abierto al público",
				required: false,
				"default": true,
				filter: true,
				edit: true,
				description: "Indica si los registros correspondientes son de disponibilidad abierta al público general"
			}
		},
		endpoint: "obs/raster/fuentes",
		objectName: "fuente",
		objectNamePlural: "fuentes",
		title: "Fuentes (ráster)",
		nameProperty: "nombre"
	},
	seriesPuntuales: {
		properties: {
			id: {
				type: "number",
				title: "id de serie",
				required: true,
				filter: true,
				disabled: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0,
				//~ link: {
					//~ external: "secciones",
					//~ filters: {
						//~ id: "seriesId",
						//~ var_id: "varId"
					//~ },
					//~ name: "datos"
				//~ }
				link: {
					element: "observacion",
					filters: {
						id: "series_id"
					},
					fixed: {
						tipo: "puntual"
					},
					name: "Observaciones"
				}
			},
			estacion_id: {
				type: "number",
				title: "id de estación",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de estación",
				min: 0,					
				link: {
					element: "estacion",
					filters: {
						estacion_id: "unid"
					},
					name: "Estación"
				} 

			},
			estacion_nombre: {
				type: "text",
				title: "nombre de estación",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de estación",
				disabled: true
			},
			var_id: {
				type: "number",
				title: "id de variable",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de variable",
				min: 0,					
				link: {
					element: "var",
					filters: {
						var_id: "id"
					},
					name: "Variable"
				} 
			},
			var_nombre: {
				type: "text",
				title: "nombre de variable",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de variable",
				disabled: true
			},
			proc_id: {
				type: "number",
				title: "id de procedimiento",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de procedimiento",
				min: 0,
				link: {
					element: "procedimiento",
					filters: {
						proc_id: "id"
					},
					name: "Procedimiento"
				} 
			},
			proc_nombre: {
				type: "text",
				title: "nombre de procedimiento",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de procedimiento",
				disabled: true
			},
			unit_id: {
				type: "number",
				title: "id de unidades",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de unidades",
				min: 0,					
				link: {
					element: "unidades",
					filters: {
						unit_id: "id"
					},
					name: "Unidades"
				} 
			},
			unit_nombre: {
				type: "text",
				title: "nombre de unidad",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de unidad",
				disabled: true
			},
			tabla: {
				type: "select_api",
				title: "fuentes (red)",
				required: true,
				filter: true,
				edit: false,
				api: {
					url:"obs/puntual/fuentes",
					value_prop: "tabla_id",
					name_prop: "nombre"
				},
				description: 'Identificador alfanumérico de la fuente (red). Consultar catálogo -> redes',
				hidden: true,
				disabled: true,					
				link: {
					element: "redes",
					filters: {
						tabla: "tabla_id"
					},
					name: "Fuente (red)"
				} 
			},
			id_externo: {
				type: "text",
				title: "id externo",
				required: true,
				filter: true,
				description: "Identificador alfanumérico otorgado por el propietario de la estación. Debe ser único entre las estaciones de la misma fuente (red).",
				hidden: true,
				disabled: true
			},
			geom: {
				type: "bbox",
				filter: true,
				edit: false,
				required: false,
				disabled: true,
				hidden: true,
				description: "ubicación de la estaciones en coordenadas geográficas. 1 par: punto, 2 pares: rectángulo",
				title: "bounding box",
				no_md: true
			}
		},
		objectName: "serie",
		objectNamePlural: "series",
		title: "Series Puntuales",
		endpoint: "obs/puntual/series",
		fixedParameters: {
			no_metadata: true
		},
		nameProperty: "estacion_nombre",
		geomFilter: "geom"
	},
	seriesAreales: {
		properties: {
			id: {
				type: "number",
				title: "id de serie",
				required: true,
				filter: true,
				disabled: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0,					
				link: {
					element: "observacion",
					filters: {
						id: "series_id"
					},
					fixed: {
						tipo: "areal"
					},
					name: "observaciones"
				} 
			},
			area_id: {
				type: "number",
				title: "id de área",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de área. Ver catálogo -> áreas",
				min: 0,					
				link: {
					element: "area",
					filters: {
						area_id: "id"
					},
					name: "Área"
				} 
			},
			area_nombre: {
				type: "text",
				title: "nombre de área",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de área",
				disabled: true
			},
			var_id: {
				type: "number",
				title: "id de variable",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de variable",
				min: 0,					
				link: {
					element: "var",
					filters: {
						var_id: "id"
					},
					name: "Variable"
				} 
			},
			var_nombre: {
				type: "text",
				title: "nombre de variable",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de variable",
				disabled: true
			},
			proc_id: {
				type: "number",
				title: "id de procedimiento",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de procedimiento",
				min: 0
			},
			proc_nombre: {
				type: "text",
				title: "nombre de procedimiento",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de procedimiento",
				disabled: true
			},
			unit_id: {
				type: "number",
				title: "id de unidades",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de unidades",
				min: 0,					
				link: {
					element: "unidades",
					filters: {
						unit_id: "id"
					},
					name: "Unidades"
				} 
			},
			unit_nombre: {
				type: "text",
				title: "nombre de unidad",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de unidad",
				disabled: true
			},
			fuentes_id: {
				type: "select_api",
				title: "fuentes (raster)",
				required: true,
				filter: true,
				edit: true,
				api: {
					url:"obs/areal/fuentes",
					value_prop: "id",
					name_prop: "nombre"
				},
				description: 'Identificador numérico de la fuente (raster). Consultar catálogo -> fuentes',
				hidden: true,
				disabled: true,					
				link: {
					element: "fuentes",
					filters: {
						fuentes_id: "id"
					},
					name: "Fuentes (raster)"
				} 
			},
			fuentes_nombre: {
				type: "text",
				title: "nombre de fuente (ráster)",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de fuente (ráster)",
				disabled: true
			}
		},
		objectName: "serie",
		objectNamePlural: "series",
		title: "Series Areales",
		endpoint: "obs/areal/series",
		fixedParameters: {
			no_metadata: true
		},
		nameProperty: "id"
	},
	seriesRaster: {
		properties: {
			id: {
				type: "number",
				title: "id de serie",
				required: true,
				filter: true,
				disabled: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0,
				link: [
					{
						element: "observacion",
						filters: {
							id: "series_id"
						},
						fixed: {
							tipo: "raster"
						},
						name: "Observaciones"
					}
				]
			},
			escena_id: {
				type: "number",
				title: "id de escena",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de escena. Ver catálogo -> escenas",
				min: 0,					
				link: {
					element: "escena",
					filters: {
						escena_id: "id"
					},
					name: "Escena"
				} 
			},
			escena_nombre: {
				type: "text",
				title: "nombre de escena",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de escena",
				disabled: true
			},
			var_id: {
				type: "number",
				title: "id de variable",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de variable",
				min: 0,					
				link: {
					element: "var",
					filters: {
						var_id: "id"
					},
					name: "Variable"
				} 
			},
			var_nombre: {
				type: "text",
				title: "nombre de variable",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de variable",
				disabled: true
			},
			proc_id: {
				type: "number",
				title: "id de procedimiento",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de procedimiento",
				min: 0,					
				link: {
					element: "procedimiento",
					filters: {
						proc_id: "id"
					},
					name: "Procedimiento"
				} 
			},
			proc_nombre: {
				type: "text",
				title: "nombre de procedimiento",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de procedimiento",
				disabled: true
			},
			unit_id: {
				type: "number",
				title: "id de unidades",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de unidades",
				min: 0,					
				link: {
					element: "unidades",
					filters: {
						unit_id: "id"
					},
					name: "Unidades"
				} 
			},
			unit_nombre: {
				type: "text",
				title: "nombre de unidad",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de unidad",
				disabled: true
			},
			fuentes_id: {
				type: "select_api",
				title: "fuentes (raster)",
				required: true,
				filter: true,
				edit: true,
				api: {
					url:"obs/areal/fuentes",
					value_prop: "id",
					name_prop: "nombre"
				},
				description: 'Identificador numérico de la fuente (raster). Consultar catálogo -> fuentes',
				hidden: true,
				disabled: true,					
				link: {
					element: "fuentes",
					filters: {
						fuentes_id: "id"
					},
					name: "Fuentes (ráster)"
				} 
			},
			fuentes_nombre: {
				type: "text",
				title: "nombre de fuente (ráster)",
				required: false,
				filter: false,
				edit: false,
				description:"nombre de fuente (ráster)",
				disabled: true
			},
			nombre: {
				type: "text",
				title: "nombre",
				required: false,
				filter: true,
				edit: true,
				description: "Nombre de la serie ráster",
			}
		},
		objectName: "serie",
		objectNamePlural: "series",
		title: "Series Ráster",
		endpoint: "obs/raster/series",
		fixedParameters: {
			no_metadata: true
		},
		nameProperty: "nombre"
	},
	area: {
		properties: {
			id: {
				type: "number",
				title: "id de área",
				required: true,
				filter: true,
				disabled: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0,
				link: {
					element: "seriesAreales",
					filters: {
						id: "area_id"
					},
					name: "series areales"
				}
			},
			nombre: {
				type: "text",
				title: "nombre",
				required: false,
				filter: true,
				edit: true,
				description: "Nombre del área",
			},
			longitud_exutorio: {
				type: "number",
				step: 0.000000001,
				title: "longitud del exutorio (sección de cierre)",
				required: false,
				edit: true
			},
			latitud_exutorio: {
				type: "number",
				step: 0.000000001,
				title: "latitud del exutorio (sección de cierre)",
				required: false,
				edit: true
			},
			geom: {
				type: "geometry",
				title: "Geometría (polígono)",
				required: true,
				edit: true,
				filter: false
			},
			bbox: {
				type: "bbox",
				title: "bounding box",
				required: false,
				edit: false,
				filter: true,
				no_md: true,
				description: "Ubicación del área en coordenadas geográficas. 1 par: punto, 2 pares: rectángulo",
				filterName: "geom"
			},
			exutorio_id: {
				type: "number",
				title: "id de exutorio",
				description: "id de estación del exutorio (para cuencas vertientes)",
				required: false,
				edit: true,
				filter: true,
				min: 0,
				link: {
					element: "estaciones",
					filters: {
						exutorio_id: "id"
					},
					name: "estaciones"
				}
			}
		},
		objectName: "area",
		objectNamePlural: "areas",
		title: "Áreas",
		endpoint: "obs/areal/areas",
		//~ fixedParameters: {
			//~ no_geom: true
		//~ },
		links: {
			seriesAreales: {
				area_id: "unid"
			}
		},
		nameProperty: "nombre",
		geomFilter: "bbox"
	},
	escena: {
		properties: {
			id: {
				type: "number",
				title: "id de escena",
				required: true,
				filter: true,
				disabled: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0,
				link: {
					element: "seriesRaster",
					filters: {
						id: "escena_id"
					},
					name: "series raster"
				}
			},
			nombre: {
				type: "text",
				title: "nombre",
				required: false,
				filter: true,
				edit: true,
				description: "Nombre del área",
			},
			geom: {
				type: "geometry",
				title: "Geometría (polígono)",
				required: true,
				edit: true,
				filter: false
			},
			bbox: {
				type: "bbox",
				filter: true,
				edit: false,
				required: false,
				disabled: true,
				description: "ubicación de las escenas en coordenadas geográficas. 1 par: punto, 2 pares: rectángulo",
				title: "bounding box",
				no_md: true,
				hidden: true,
				filterName: "geom"
			}

		},
		objectName: "escena",
		objectNamePlural: "escenas",
		title: "Escenas",
		endpoint: "obs/raster/escenas",
		//~ fixedParameters: {
			//~ no_geom: true
		//~ },
		links: {
			seriesAreales: {
				escena_id: "id"
			}
		},
		nameProperty: "nombre",
		geomFilter: "bbox"
	},
	asociacion: {
		properties: {
			id: {
				type: "number",
				title: "id de asociación",
				required: true,
				filter: true,
				disabled: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0
			},
			source_tipo: {
				type: "select",
				title: "tipo de serie de origen",
				required: true,
				filter: true,
				edit: true,
				options: ["puntual","areal","raster"],
				description: "tipo de la serie de origen"
			},
			source_series_id: {
				type: "number",
				title: "Id de serie de origen",
				required: true,
				filter: true,
				edit: true,
				description: "id de la serie de origen",
				min: 0,
				link: {
					element: {
						switch: "source_tipo",
						case: {
							puntual: "seriesPuntuales",
							areal: "seriesAreales",
							raster: "seriesRaster"
						}
					},
					filters: {
						source_series_id: "id"
					},
					name: "serie de origen"
				}
			},
			dest_tipo: {
				type: "select",
				title: "tipo de serie de destino",
				required: true,
				filter: true,
				edit: true,
				options: ["puntual","areal","raster"],
				description: "tipo de la serie de destino"
			},
			dest_series_id: {
				type: "number",
				title: "Id de serie de destino",
				required: true,
				filter: true,
				edit: true,
				description: "id de la serie de destino",
				min: 0,
				link: {
					element: {
						switch: "dest_tipo",
						case: {
							puntual: "seriesPuntuales",
							areal: "seriesAreales",
							raster: "seriesRaster"
						}
					},
					filters: {
						dest_series_id: "id"
					},
					name: "serie de destino"
				}
			},
			source_tipo: {
				type: "select",
				title: "tipo de serie de origen",
				required: true,
				filter: true,
				edit: true,
				options: ["puntual","areal","raster"],
				description: "tipo de la serie de origen"
			},
			agg_func: {
				type: "select",
				title: "Función de agregación",
				required: true,
				filter: true,
				edit: true,
				description: "Función de agregación",
				options: ["acum","mean","sum","min","max","count","diff","increment","math","avg","average"],
				default: "mean"
			},
			dt: {
				description: "Intervalo temporal de agregación",
				title: "Intervalo temporal",
				required: false,
				type: "interval",
				filter: true,
				edit: true,
				default: "1 days"
			},
			t_offset:{
				description: "tiempo inicial. p. ej '07:00:00' o '7 hours'",
				title: "tiempo inicial",
				required: false,
				type: "interval",
				filter: true,
				edit: true
			},
			source_var_id: {
				description: "id de variable de la serie de origen",
				title: "id de variable de origen",
				required: false,
				edit: false,
				type: "number",
				min: 0,
				filter:true,
				link: {
					element: "var",
					filters: {
						source_var_id: "id"
					},
					name: "variable de origen"
				},
				disabled: true
			},
			dest_var_id: {
				description: "id de variable de la serie de destino",
				title: "id de variable de destino",
				required: false,
				edit: false,
				type: "number",
				min: 0,
				filter:true,
				link: {
				element: "var",
					filters: {
						dest_var_id: "id"
					},
					name: "variable de destino"
				},
				disabled: true
			},
			source_proc_id: {
				description: "id de procedimiento de la serie de origen",
				title: "id de procedimiento de origen",
				required: false,
				edit: false,
				type: "number",
				min: 0,
				filter:true,
				disabled: true
			},
			dest_proc_id: {
				description: "id de procedimiento de la serie de destino",
				title: "id de procedimiento de destino",
				required: false,
				edit: false,
				type: "number",
				min: 0,
				filter:true,
				disabled: true
			},
			dest_estacion_id:{
				description: "id de estación/área",
				title: "id de estación/área",
				required: false,
				edit: false,
				type: "number",
				min: 0,
				filter:true,
				filterName: "estacion_id",
				disabled: true
			},
			dest_fuentes_id: {
				description: "id de fuente/proveedor",
				title: "id de fuente/proveedor",
				required: false,
				edit: false,
				type: "text",
				min: 0,
				filter:true,
				filterName: "provider_id",
				disabled: true
			},
			habilitar: {
				description: "habilitar/deshabilitar asociación",
				title: "habilitar",
				required: false,
				edit: true,
				filter: false,
				type: "boolean",
				default: true
			},
			expresion: {
				description: "Expresión matemática de la asociación en lenguaje SQL (para agg_func=math)",
				title: "expresión",
				required: false,
				edit: true,
				filter: false,
				type: "text"
			}
		},
		objectName: "asociacion",
		objectNamePlural: "asociaciones",
		title: "Asociaciones",
		endpoint: "obs/asociaciones",
		nameProperty: "id",
	},
	observacion: {
		properties: {
			id: {
				type: "number",
				title: "id de observación",
				required: false,
				filter: true,
				edit: false,
				disabled: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0
			},
			tipo: {
				type: "select",
				options: ["puntual", "areal", "raster"],
				title: "tipo",
				description: "tipo de observación",
				filter: true,
				edit: false,
				where: "path",
				filterRequired: true,
				disabled: true,
			},
			series_id: {
				type: "number",
				title: "id de serie",
				required: true,
				filter: true,
				edit: false,
				description: "Identificador numérico único de serie. Ver catálogo -> seriesPuntuales, seriesAreales y seriesRaster",
				min: 0,					
				where: "path",
				link: {
					element: {
						switch: "tipo",
						case: {
							puntual: "seriesPuntuales",
							areal: "seriesAreales",
							raster: "seriesRaster"
						}
					},
					filters: {
						series_id: "id"
					},
					name: "serie"
				},
				filterRequired: true,
				disabled: true
			},
			timestart: {
				type: "datetime-local",
				title: "fecha/hora inicial",
				required: false,
				filter: true,
				edit: true,
				description: "fecha/hora inicial",
				filterRequired: true
			},
			timeend: {
				type: "datetime-local",
				title: "fecha/hora final",
				required: false,
				filter: true,
				edit: true,
				description: "fecha/hora final",
				filterRequired: true
			},
			valor: {
				type: "number",
				step: "0.00000001",
				title: "valor",
				required: true,
				filter: true,
				edit: true,
				description: "valor"
			},
			unit_id: {
				type: "number",
				title: "id de unidades",
				required: true,
				filter: true,
				edit: true,
				description: "Identificador numérico único de unidades",
				min: 0,					
				link: {
					element: "unidades",
					filters: {
						unit_id: "id"
					},
					name: "Unidades"
				} 
			},
			timeupdate: {
				type: "datetime-local",
				title: "fecha/hora de actualización",
				required: false,
				filter: true,
				edit: true,
				description: "fecha/hora final"
			},
			skip_nulls: {
				type: "boolean",
				title: "saltear registros nulos",
				required: false,
				filter: true,
				edit: false,
				description: "saltear registros nulos",
				no_md: true
			}
		},
		objectName: "observacion",
		objectNamePlural: "observaciones",
		title: "Observaciones",
		endpoint: "obs/{tipo}/series/{series_id}/observaciones",
		endpoint2: "obs/{tipo}/series/{series_id}",
		nameProperty: "id"
	},
	modelo: {
		properties: {
			id: {
				type: "number",
				title: "id de modelo",
				required: false,
				filter: true,
				edit: false,
				disabled: true,
				description: "Identificador numérico único. Si se deja vacío al crear un nuevo registro el sistema lo genera.",
				min: 0
			},
			tipo: {
				type: "select",
				options: ["","P-Q","H","T","+","auto","Q-Q","H-H","P-Q+T","FG","HD","E"],
				title: "tipo",
				description: "tipo de modelo",
				filter: true,
				edit: true,
				filterRequired: false,
				disabled: false
			},
			nombre: {
				type: "string",
				title: "nombre del modelo",
				required: true,
				filter: true,
				edit: true,
				description: "nombre del modelo",
				filterRequired: false,
				disabled: false,
				filterName: "name_contains"
			},
			def_var_id: {
				type: "number",
                min: 0,
				title: "id de variable",
				required: false,
				filter: false,
				edit: true,
				description: "id de variable de la salida por defecto",
				filterRequired: false,					
				link: {
					element: "variable",
					filters: {
						def_var_id: "id"
					},
					name: "Variables"
				} 
			},
			def_unit_id: {
				type: "number",
				title: "id de unidades",
				required: false,
				filter: false,
				edit: true,
				description: "id de unidades de la salida por defecto",
				min: 0,					
				link: {
					element: "unidades",
					filters: {
						def_unit_id: "unit_id"
					},
					name: "Unidades"
				} 
			},
			parametros: {
				type: "array",
				items: "parametro",
				title: "vector parámetros",
				required: false,
				filter: false,
				edit: true,
				description: "vector de parámetros del modelo"
			}
		},
		objectName: "modelo",
		objectNamePlural: "modelos",
		title: "Modelos",
		endpoint: "sim/modelos",
		endpoint2: "sim/modelos/{id}",
		nameProperty: "nombre"
	},
	parametro: {
		properties: {
			id: {
				type: "number",
				title: "id de parámetro",
				edit: false,
				required: false,
				description: "id de parámetro",
				min: 0
			},
			model_id: {
				type: "number",
				title: "id de modelo",
				edit: false,
				required: true,
				description: "id de modelo",
				min: 0
			},	
			nombre: {
				type: "string",
				title: "Nombre del parámetro",
				required: true,
				filter: true,
				edit: true,
				description: "Nombre del parámetro"
			},
			lim_inf: {
				type: "number",
				step:4,
				title: "mínimo valor admitido",
				required: true,
				edit: true,
				description: "mínimo valor admitido"
			},
			range_min: {
				type: "number",
				step:4,
				title: "mínimo del rango inicial",
				required: false,
				edit: true,
				description: "mínimo del rango inicial"
			},
			range_max: {
				type: "number",
				step:4,
				title: "máximo del rango inicial",
				required: false,
				edit: true,
				description: "máximo del rango inicial"
			},
			lim_sup: {
				type: "number",
				step:4,
				title: "máximo valor admitido",
				required: true,
				edit: true,
				description: "máximo valor admitido"
			},
			orden: {
				type: "number",
				step:4,
				title: "numero índice del parámetro",
				required: true,
				edit: true,
				description: "indica la posición del parámetro en el vector de parámetros del modelo",
				min:1
			} 
		},
		objectName: "parámetro",
		objectNamePlural: "parámetros",
		title: "Parámetros",
		nameProperty: "nombre"
	}
}
