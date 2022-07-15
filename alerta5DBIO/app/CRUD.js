'use strict'

const internal = {};
const Wkt = require('wicket')
var wkt = new Wkt.Wkt()
var parsePGinterval = require('postgres-interval')
//~ const Accessors = require('./accessors.js')
var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf
var fs =require("promise-fs")
const { exec, spawn } = require('child_process');
const pexec = require('child-process-promise').exec;
const ogr2ogr = require("ogr2ogr")
var path = require('path');
const validFilename = require('valid-filename');
const printMap = require("./printMap")
//~ const Client2 = require('pg-native')
//~ const Pool2 = require('pg-pool')
//~ var pool2 = new Pool2({Client:Client2})
//~ var client2 = new Client2()
//~ var client2conn = client2.connect(config.database)
const config = require('config');
const timeSteps = require('./timeSteps')
const utils = require('./utils')
const control_filter = utils.control_filter
const control_filter2 = utils.control_filter2
const pasteIntoSQLQuery = utils.pasteIntoSQLQuery
const build_group_by_clause = utils.build_group_by_clause
const QueryStream = require('pg-query-stream')
const JSONStream = require('JSONStream')

var Validator = require('jsonschema').Validator;
const { errorMonitor } = require('events');
var turfHelpers = require("@turf/helpers")
var bboxPolygon = require("@turf/bbox-polygon")
var pointsWithinPolygon = require("@turf/points-within-polygon")
// const { createCipheriv } = require('crypto');

const series2waterml2 = require('./series2waterml2')

const apidoc = JSON.parse(fs.readFileSync('public/json/apidocs.json','utf-8'))
var schemas = apidoc.components.schemas
traverse(schemas,changeRef)
var v = new Validator();
for(var key in schemas) {
    v.addSchema(schemas[key],"/" + key)
}

function changeRef(object,key) {
    if(key == "$ref") {
        object[key] = "/" + object[key].split("/").pop()
    }
}

function traverse(o,func) {
    for (var i in o) {
        func.apply(this,[o,i]);  
        if (o[i] !== null && typeof(o[i])=="object") {
            //going one step down in the object tree!!
            traverse(o[i],func);
        }
    }
}

if (!Promise.allSettled) {
  Promise.allSettled = promises =>
    Promise.all(
      promises.map((promise, i) =>
        promise
          .then(value => ({
            status: "fulfilled",
            value,
          }))
          .catch(reason => ({
            status: "rejected",
            reason,
          }))
      )
    );
}

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

internal.geometry = class {
	constructor() {
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) === "string") {   // WKT
					var geom = wkt.read(arguments[0]).toJson()
					this.type = geom.type
					this.coordinates = geom.coordinates
				} else {
					this.type = arguments[0].type
					this.coordinates = arguments[0].coordinates
				}
				break;
			default:
				this.type = arguments[0]
				this.coordinates = arguments[1]
				break;
		}
		if(this.type.toUpperCase() == "BOX") {
			this.type = "Polygon"
			var coords = Array.isArray(this.coordinates) ? this.coordinates : this.coordinates.split(",").map(c=>parseFloat(c))
			if(coords.length<2) {
				console.error("Faltan coordenadas")
				throw new Error("Faltan coordenadas")
			} 
			for(var i=0;i<coords.length;i++) {
				if(coords[i].toString() == "NaN") {
					throw new Error("Coordenadas incorrectas")
				}
			}
			if(coords.length<4) {
				this.type = "Point"
				this.coordinates = [ coords[0], coords[1] ]
			} else {
				this.coordinates =  [ [ [ coords[0], coords[1] ], [ coords[0], coords[3] ], [ coords[2], coords[3] ], [ coords[2], coords[1] ], [ coords[0], coords[1] ] ] ]
			}
			// console.log(JSON.stringify(this))
		} 
	}
	toString() {  // WKT
		return wkt.fromObject(this).write()
	}
	toCSV() {
		return wkt.fromObject(this).write() // this.type + "," + this.coordinates.join(",")
	}
	toSQL() {
		//~ return "ST_GeomFromText('" + this.toString() + "', 4326)"
		if(this.type.toUpperCase() == "POINT") {
			return "ST_SetSRID(ST_Point(" + this.coordinates.join(",") + "),4326)"
		} else if (this.type.toUpperCase() == "POLYGON") {
			//return "st_geomfromtext('" + this.toString()+ "',4326)" 
			//  "ST_Polygon('LINESTRING(" + this.coordinates.map(it=> it.join(" ")).join(",") + ")'::geometry,4326)"
			return "st_geomfromtext('POLYGON((" + this.coordinates[0].map(p=> p.join(" ")).join(",")+ "))',4326)"
		} else if (this.type.toUpperCase() == "LINESTRING") {
			//~ return "st_geomfromtext('" + this.toString()+ "',4326)" // "ST_GeomFromText('LINESTRING(" + this.coordinates.map(it=> it.join(" ")).join(",") + ")',4326)"
			return "st_geomfromtext('LINESTRING((" + this.coordinates.map(p=> p.join(" ")).join(",")+ "))',4326)"
		} else {
			console.error("Unknown geometry type")
			return null
		}
	}
	toGeoJSON(properties) {
		return turfHelpers.feature(this,properties)
		// var geojson
		// switch(this.geom.type.toLowerCase()) {
		// 	case "point":
		// 		geojson = turfHelpers.point(this.geom.coordinates)
		// 		break;
		// 	case "polygon":
		// 		geojson = turfHelpers.polygon(this.geom.coordinates)
		// 		break;
		// 	case "line":
		// 		geojson = turfHelpers.line()
		// }
		// return geojson
	}
	distance(feature) {
		if(feature instanceof internal.geometry) {
			feature = feature.toGeoJSON()
		}
		if(this.type != "Point" || feature.geometry.type != "Point") {
			console.error("distance only works for points")
			return
		}
		return this.distance(feature,this.toGeoJSON(),{units:"kilometers"})
	}
}

internal.red = class {
	constructor() {
		this.id = undefined
		switch (arguments.length) {
			case 1:
				if(typeof(arguments[0]) == "string") {
					[this.id,this.tabla_id, this.nombre,this.is_public,this.public_his_plata] = arguments[0].split(",")
				} else {
					this.id = arguments[0].id
					this.tabla_id = arguments[0].tabla_id
					this.nombre = arguments[0].nombre
					this.public = arguments[0].public
					this.public_his_plata = arguments[0].public_his_plata 
				}
				break;
			default:
				[this.id,this.tabla_id, this.nombre,this.is_public,this.public_his_plata] = arguments
				break;
		}
		this.public = (!this.public) ? false : this.public
		this.public_his_plata = (!this.public_his_plata) ? false : this.public_his_plata
	}
	toString() {
		return "{tabla_id: " + this.tabla_id + ", nombre: " + this.nombre + ", public: " + this.public + ", public_his_plata: " + this.public_his_plata + ", id: " + this.id + "}"
	}
	toCSV() {
		return this.tabla_id + "," + this.nombre + "," + this.public + "," + this.public_his_plata + "," + this.id
	}
	toCSVless() {
		return this.tabla_id + "," + this.nombre + "," + this.id
	}
	getId(pool) {
		return pool.query("\
		SELECT id \
		FROM redes \
		WHERE tabla_id = $1\
		",[this.tabla_id])
		.then(res=>{
			if (res.rows.length>0) {
				this.id = res.rows[0].id
				return
			} else {
				return pool.query("\
				SELECT max(id)+1 AS id\
				FROM redes\
				")
				.then(res=>{
					this.id = res.rows[0].id
				})
			}
		})
		.catch(e=>{
			console.error(e)
		})
	}		
}

internal.red.build_read_query = function (filter) {
	//~ console.log(filter)
	const valid_filters = {nombre:"regex_string", tabla_id:"string", public:"boolean", public_his_plata:"boolean", id:"integer"}
	var filter_string=""
	var control_flag=0
	Object.keys(valid_filters).forEach(key=>{
		if(filter[key]) {
			if(/[';]/.test(filter[key])) {
				console.error("Invalid filter value")
				control_flag++
			}
			if(valid_filters[key] == "regex_string") {
				var regex = filter[key].replace('\\','\\\\')
				filter_string += " AND " + key  + " ~* '" + filter[key] + "'"
			} else if(valid_filters[key] == "string") {
				filter_string += " AND "+ key + "='" + filter[key] + "'"
			} else if (valid_filters[key] == "boolean") {
				var boolean = (/^[yYtTvVsS1]/.test(filter[key])) ? "true" : "false"
				filter_string += " AND "+ key + "=" + boolean + ""
			} else {
				filter_string += " AND "+ key + "=" + filter[key] + ""
			}
		}
	})
	if(control_flag > 0) {
		return Promise.reject(new Error("invalid filter value"))
	}
	//~ console.log("filter_string:" + filter_string)
	return "SELECT * from redes WHERE 1=1 " + filter_string
}

internal.estacion = class {
	constructor() {
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) === "string") {
					var arg_arr =  arguments[0].split(",")
					this.id = arg_arr[0]
					this.nombre = arg_arr[1]
					this.id_externo = arg_arr[2]
					this.geom = new internal.geometry(arg_arr[3])
					this.tabla = arg_arr[4]
					this.provincia = arg_arr[5]
					this.pais = arg_arr[6]
					this.rio=arg_arr[7]
					this.has_obs= arg_arr[8]
					this.tipo =arg_arr[9]
					this.automatica =arg_arr[10]
					this.habilitar =arg_arr[11]
					this.propietario =arg_arr[12]
					this.abreviatura =arg_arr[13]
					this.URL =arg_arr[14]
					this.localidad =arg_arr[15]
					this.real =arg_arr[16]
					this.nivel_alerta = arg_arr[17]
					this.nivel_evacuacion = arg_arr[18]
					this.nivel_aguas_bajas = arg_arr[19]
					this.altitud = arg_arr[19]
					this.public = arg_arr[20]
					this.cero_ign = arg_arr[21]
				} else {
					this.id = arguments[0].id
					this.nombre = arguments[0].nombre
					this.id_externo = arguments[0].id_externo
					this.geom = (arguments[0].geom) ? new internal.geometry(arguments[0].geom) : undefined
					this.tabla = arguments[0].tabla
					this.provincia = (arguments[0].provincia) ? arguments[0].provincia : arguments[0].distrito
					this.pais = arguments[0].pais
					this.rio=arguments[0].rio
					this.has_obs= arguments[0].has_obs
					this.tipo =arguments[0].tipo
					this.automatica =arguments[0].automatica
					this.habilitar =arguments[0].habilitar
					this.propietario =arguments[0].propietario
					this.abreviatura =arguments[0].abreviatura
					this.URL =arguments[0].URL
					this.localidad =arguments[0].localidad
					this.real =arguments[0].real
					this.nivel_alerta = arguments[0].nivel_alerta
					this.nivel_evacuacion = arguments[0].nivel_evacuacion
					this.nivel_aguas_bajas = arguments[0].nivel_aguas_bajas
					this.altitud = arguments[0].altitud
					this.public = arguments[0].public
					this.cero_ign = arguments[0].cero_ign
				}
				break;
			default:
				this.nombre = arguments[0]
				this.id_externo = arguments[1]
				this.geom = arguments[2]
				this.tabla = arguments[3]
				this.provincia = arguments[4]
				this.pais = arguments[5]
				this.rio=arguments[6]
				this.has_obs= arguments[7]
				this.tipo =arguments[8]
				this.automatica =arguments[9]
				this.habilitar =arguments[10]
				this.propietario =arguments[11]
				this.abreviatura =arguments[12]
				this.URL =arguments[13]
				this.localidad =arguments[14]
				this.real =arguments[15]
				this.nivel_alerta = arguments[16]
				this.nivel_evacuacion = arguments[17]
				this.nivel_aguas_bajas = arguments[18]
				this.altitud = arguments[19]
				this.public = arguments[20]
				this.cero_ign = arguments[21]
				break;
		}
		//~ console.log({estacion:this})
	}
	getId(pool) {
		if(this.id) {
			return Promise.resolve()
		} // else
		return pool.query("\
		SELECT id \
		FROM estaciones \
		WHERE id_externo = $1\
		AND tabla = $2\
		",[this.id_externo,this.tabla])
		.then(res=>{
			if (res.rows.length>0) {
				this.id = res.rows[0].id
				return
			} 
		})
		.catch(e=>{
			console.error(e)
			return
		})
	}
	getEstacionId(pool) {
		if(!this.id_externo || !this.tabla) {
			return this
		}
		return pool.query("\
		SELECT unid \
		FROM estaciones \
		WHERE id_externo = $1\
		AND tabla = $2\
		",[this.id_externo,this.tabla])
		.then(res=>{
			if (res.rows.length>0) {
				this.id = res.rows[0].unid
				//~ console.log({getEstacionId_id:res.rows[0].unid})
			}
			return this
		})
	}
	toString() {
		return "{id:" + this.id + ", nombre: " + this.nombre + ", id_externo: " + this.id_externo + ", geom: " + this.geom.toString() + ", tabla: " + this.tabla + ", provincia: " + this.provincia + ", pais: " + this.pais + ", rio: " + this.rio + ", has_obs: " + this.has_obs + ", tipo: " + this.tipo + ", automatica: " + this.automatica + ", habilitar: " + this.habilitar + ", propietario: " + this.propietario + ", abreviatura: " + this.abreviatura + ", URL:" + this.URL + ", localidad: " + this.localidad + ", real: " + this.real + ", nivel_alerta: " + this.nivel_alerta + ", nivel_evacuacion: " + this.nivel_evacuacion + ", nivel_aguas_bajas: " + this.nivel_aguas_bajas + ",altitud:" + this.altitud + "}"
	}
	toCSV() {
		return this.id + "," + this.nombre + "," + this.id_externo + "," + this.geom.toString() + "," + this.tabla + "," + this.provincia + "," + this.pais + "," + this.rio + "," + this.has_obs + "," + this.tipo + "," + this.automatica + "," + this.habilitar + "," + this.propietario + "," + this.abreviatura + "," + this.URL + "," + this.localidad + "," + this.real + "," + this.nivel_alerta + "," + this.nivel_evacuacion + "," + this.nivel_aguas_bajas + "," + this.altitud
	}
	toCSVless() {
		return this.id + "," + this.nombre + "," + this.tabla + "," + this.geom.toString()
	}
	toGeoJSON(includeProperties=true) {
		var geojson
		geojson = turfHelpers.point(this.geom.coordinates)
		if(includeProperties) {
			geojson.properties = {}
			Object.keys(this).forEach(key=>{
				if(key == "geom") {
					return
				}
				geojson.properties[key] = this[key]
			})
		}
		return geojson
	}
	isWithinPolygon(polygon) {
		if(polygon instanceof internal.geometry) {
			if(polygon.type.toLowerCase() != "polygon") {
				console.error("bad geometry for polygon")
				return false
			}
			polygon = polygon.toGeoJSON()
		}
		if(!this.geom || !this.geom.coordinates || this.geom.coordinates.length < 2) {
			console.error("isWithinPolygon: Missing geometry for estacion")
			return false
		}
		var point = this.toGeoJSON(false) // turfHelpers.point([this.geom.coordinates[0],this.geom.coordinates[1]])
		var within = pointsWithinPolygon(point,polygon)
		if(within.features.length) {
			return true
		} else {
			return false
		}
	}
}

internal.area = class {
	constructor() {
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) === "string") {
					var arg_arr = arguments[0].split(",")
					this.id = arg_arr[0]
					this.nombre = arg_arr[1]
					this.geom = new internal.geometry(arg_arr[2])
					this.exutorio = (arg_arr[3]) ? new internal.geometry(arg_arr[3]) : null
					this.exutorio_id = arg_arr[4]
				} else {
					this.id = arguments[0].id
					this.nombre = arguments[0].nombre
					this.geom = new internal.geometry(arguments[0].geom)
					this.exutorio = (arguments[0].exutorio) ? new internal.geometry(arguments[0].exutorio) : null
					this.exutorio_id = arguments[0].exutorio_id
				}
				break;
			default:
				this.nombre = arguments[0]
				this.geom = arguments[1]
				this.exutorio = (arguments[2]) ? arguments[2] : null
				this.exutorio_id = arguments[3]
				break;
		}
	}
	getId(pool) {
		return pool.query("\
		SELECT unid \
		FROM areas_pluvio \
		WHERE nombre = $1\
		AND geom = st_geomfromtext($2,4326)\
		",[this.nombre, this.geom.toString()])
		.then(res=>{
			if (res.rows.length>0) {
				this.id = res.rows[0].unid
				return
			} else {
				return pool.query("\
				SELECT max(unid)+1 AS id\
				FROM areas_pluvio\
				")
				.then(res=>{
					this.id = res.rows[0].id
				})
			}
		})
		.catch(e=>{
			console.error(e)
		})
	}
	toString() {
		return "{id:" + this.id + ",nombre: " + this.nombre + ",exutorio_id: " + this.exutorio_id + "}"
	}
	toCSV() {
		return this.id + "," + this.nombre + "," + this.exutorio_id
	}
	toCSVless() {
		return this.id + "," + this.nombre
	}
}

internal.escena = class {
	constructor() {
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) === "string") {
					var arg_arr = arguments[0].split(",")
					this.id = arg_arr[0]
					this.nombre = arg_arr[1]
					this.geom = new internal.geometry(arg_arr[2])
				} else {
					this.id = arguments[0].id
					this.nombre = arguments[0].nombre
					this.geom = new internal.geometry(arguments[0].geom)
				}
				break;
			default:
				this.nombre = arguments[0]
				this.geom = arguments[1]
				break;
		}
	}
	getId(pool) {
		return pool.query("\
		SELECT id \
		FROM escenas \
		WHERE nombre = $1\
		AND geom = st_geomfromtext($2,4326)\
		",[this.nombre, this.geom.toString()])
		.then(res=>{
			if (res.rows.length>0) {
				this.id = res.rows[0].id
				return
			} else {
				return pool.query("\
				SELECT max(unid)+1 AS id\
				FROM areas_pluvio\
				")
				.then(res=>{
					this.id = res.rows[0].id
				})
			}
		})
		.catch(e=>{
			console.error(e)
		})
	}
	toString() {
		return "{id:" + this.id + ",nombre: " + this.nombre + "}"
	}
	toCSV() {
		return this.id + "," + this.nombre
	}
	toCSVless() {
		return this.id + "," + this.nombre
	}
}

internal["var"] = class {
	constructor() {
		// variable,nombre,abrev,type,datatype,valuetype,GeneralCategory,VariableName,SampleMedium,def_unit_id,timeSupport
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) === "string") {
					var arg_arr = arguments[0].split(",")
					this.id =arg_arr[0]
					this["var"] = arg_arr[1]
					this.nombre = arg_arr[2]
					this.abrev =arg_arr[3]
					this.type= arg_arr[4]
					this.datatype= arg_arr[5]
					this.valuetype=arg_arr[6]
					this.GeneralCategory = arg_arr[7]
					this.VariableName =  arg_arr[8]
					this.SampleMedium = arg_arr[9]
					this.def_unit_id = arg_arr[10]
					this.timeSupport = arg_arr[11]
					this.def_hora_corte = arg_arr[12]
				} else {
					this.id =arguments[0].id
					this["var"] = arguments[0]["var"]
					this.nombre = arguments[0].nombre
					this.abrev =arguments[0].abrev
					this.type= arguments[0].type
					this.datatype= arguments[0].datatype
					this.valuetype=arguments[0].valuetype
					this.GeneralCategory = arguments[0].GeneralCategory
					this.VariableName =  arguments[0].VariableName
					this.SampleMedium = arguments[0].SampleMedium
					this.def_unit_id = arguments[0].def_unit_id
					this.timeSupport = arguments[0].timeSupport
					this.def_hora_corte = arguments[0].def_hora_corte
				}
				break;
			default:
				this["var"] = arguments[0]
				this.nombre = arguments[1]
				this.abrev =arguments[2]
				this.type= arguments[3]
				this.datatype= arguments[4]
				this.valuetype=arguments[5]
				this.GeneralCategory = arguments[6]
				this.VariableName =  arguments[7]
				this.SampleMedium = arguments[8]
				this.def_unit_id = arguments[9]
				this.timeSupport = arguments[10]
				this.def_hora_corte = arguments[11]
				break;
		}
	}
	getId(pool) {
		return pool.query("\
			SELECT id FROM var WHERE var=$1 AND \"GeneralCategory\"=$2\
		",[this["var"], this.GeneralCategory]
		).then(res=>{
			if (res.rows.length>0) {
				this.id = res.rows[0].id
				return
			} else {
				return pool.query("\
				SELECT max(id)+1 AS id\
				FROM var\
				")
				.then(res=>{
					this.id = res.rows[0].id
				})
			}
		})
	}
	toString() {
		return "{id:" + this.id + ",var:" + this["var"]+ ", nombre:" + this.nombre + ",abrev:" + this.abrev + ",type:" + this.type + ",datatype: " + this.datatype + ",valuetype:" + this.valuetype + ",GeneralCategory:" + this.GeneralCategory + ",VariableName:" + this.VariableName + ",SampleMedium:" + this.SampleMedium + ",def_unit_id:" + this.def_unit_id + ",timeSupport:" + JSON.stringify(this.timeSupport) + "}"
	}
	toCSV() {
		return this.id + "," + this["var"]+ "," + this.nombre + "," + this.abrev + "," + this.type + "," + this.datatype + "," + this.valuetype + "," + this.GeneralCategory + "," + this.VariableName + "," + this.SampleMedium + "," + this.def_unit_id + "," + JSON.stringify(this.timeSupport)
	}
	toCSVless() {
		return this.id + "," + this["var"]+ "," + this.nombre
	}
}

internal.procedimiento = class {
	constructor() { // nombre, abrev, descripcion
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) === "string") {
					var arg_arr = arguments[0].split(",")
					this.id = arg_arr[0]
					this.nombre = arg_arr[1]
					this.abrev = arg_arr[2]
					this.descripcion =arg_arr[3]
				} else {
					this.id = arguments[0].id
					this.nombre = arguments[0].nombre
					this.abrev = arguments[0].abrev
					this.descripcion =arguments[0].descripcion
				}
				break;
			default:
				this.nombre = arguments[0]
				this.abrev = arguments[1]
				this.descripcion =arguments[2]
				break;
		}
	}
	getId(pool) {
		return pool.query("\
			SELECT id FROM procedimiento WHERE nombre=$1 AND descripcion=$2\
		",[this.nombre, this.descripcion]
		).then(res=>{
			if (res.rows.length>0) {
				this.id = res.rows[0].id
				return
			} else {
				return pool.query("\
				SELECT max(id)+1 AS id\
				FROM procedimiento\
				")
				.then(res=>{
					this.id = res.rows[0].id
				})
			}
		})
	}
	toString() {
		return "{id:" + this.id + ",nombre:" + this.nombre + ", abrev:" + this.abrev + ",descripcion:"  + this.descripcion + "}"
	}
	toCSV() {
		return this.id + "," + this.nombre + "," + this.abrev + "," + this.descripcion
	}
	toCSVless() {
		return this.id + "," + this.nombre
	}
}

internal.unidades = class {
	constructor() { // nombre, abrev, UnitsID, UnitsType
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) === "string") {
					var arg_arr = arguments[0].split(",")
					this.id = arg_arr[0]
					this.nombre = arg_arr[1]
					this.abrev = arg_arr[2]
					this.UnitsID = arg_arr[3]
					this.UnitsType = arg_arr[4]
				} else {
					this.id = arguments[0].id
					this.nombre = arguments[0].nombre
					this.abrev = arguments[0].abrev
					this.UnitsID = arguments[0].UnitsID
					this.UnitsType = arguments[0].UnitsType
				}
				break;
			default:
				//~ this.id = arguments[0]
				this.nombre = arguments[0]
				this.abrev = arguments[1]
				this.UnitsID = arguments[2]
				this.UnitsType = arguments[3]
				break;
		}
	}
	getId(pool) {
		return pool.query("\
			SELECT id FROM unidades WHERE nombre=$1 AND \"UnitsID\"=$2 AND \"UnitsType\"=$3\
		",[this.nombre, this.UnitsID, this.UnitsType]
		).then(res=>{
			if (res.rows.length>0) {
				this.id = res.rows[0].id
				return
			} else {
				return pool.query("\
				SELECT max(id)+1 AS id\
				FROM unidades\
				")
				.then(res=>{
					this.id = res.rows[0].id
				})
			}
		})
	}
	toString() {
		return "{id:" + this.id + ",nombre:" + this.nombre + ", abrev:" + this.abrev + ",UnitsID:" + this.UnitsID + ", UnitsType:" + this.UnitsType + "}"
	}
	toCSV() {
		return this.id + "," + this.nombre + "," + this.abrev + "," + this.UnitsID + "," + this.UnitsType
	}
	toCSVless() {
		return this.id + "," + this.nombre
	}
}

internal.fuente = class {
	constructor() {  // nombre, data_table, data_column, tipo, def_proc_id, def_dt, hora_corte, def_unit_id, def_var_id, fd_column, mad_table, scale_factor, data_offset, def_pixel_height, def_pixel_width, def_srid, def_extent, date_column, def_pixeltype, abstract, source
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) === "string") {
					var arg_arr = arguments[0].split(",")
					this.id = arg_arr[0]
					this.nombre = arg_arr[1]
					this.data_table = arg_arr[2]
					this.data_column = arg_arr[3]
					this.tipo = arg_arr[4]
					this.def_proc_id= arg_arr[5]
					this.def_dt = timeSteps.createInterval(arg_arr[6])
					this.hora_corte = timeSteps.createInterval(arg_arr[7])
					this.def_unit_id = arg_arr[8]
					this.def_var_id = arg_arr[9]
					this.fd_column = arg_arr[10]
					this.mad_table = arg_arr[11]
					this.scale_factor = arg_arr[12]
					this.data_offset = arg_arr[13]
					this.def_pixel_height = arg_arr[14]
					this.def_pixel_width = arg_arr[15]
					this.def_srid = arg_arr[16]
					this.def_extent = (arg_arr[17]) ? new internal.geometry(arg_arr[17]) : undefined
					this.date_column = arg_arr[18]
					this.def_pixeltype = arg_arr[19]
					this.abstract = arg_arr[20]
					this.source = arg_arr[21]
					this.public = arg_arr[22]
				} else {
					this.id = arguments[0].id
					this.nombre = arguments[0].nombre
					this.data_table = arguments[0].data_table
					this.data_column = arguments[0].data_column
					this.tipo = arguments[0].tipo
					this.def_proc_id= arguments[0].def_proc_id
					this.def_dt = timeSteps.createInterval(arguments[0].def_dt)
					this.hora_corte = timeSteps.createInterval(arguments[0].hora_corte)
					this.def_unit_id = arguments[0].def_unit_id
					this.def_var_id = arguments[0].def_var_id
					this.fd_column = arguments[0].fd_column
					this.mad_table = arguments[0].mad_table
					this.scale_factor = arguments[0].scale_factor
					this.data_offset = arguments[0].data_offset
					this.def_pixel_height = arguments[0].def_pixel_height
					this.def_pixel_width = arguments[0].def_pixel_width
					this.def_srid = arguments[0].def_srid
					this.def_extent = (arguments[0].def_extent) ? new internal.geometry(arguments[0].def_extent) : undefined
					this.date_column = arguments[0].date_column
					this.def_pixeltype = arguments[0].def_pixeltype
					this.abstract = arguments[0].abstract
					this.source = arguments[0].source
					this.public = arguments[0].public
				}
				break;
			default:
				this.nombre = arguments[0]
				this.data_table = arguments[1]
				this.data_column = arguments[2]
				this.tipo = arguments[3]
				this.def_proc_id= arguments[4]
				this.def_dt = timeSteps.createInterval(arguments[5])
				this.hora_corte = timeSteps.createInterval(arguments[6])
				this.def_unit_id = arguments[7]
				this.def_var_id = arguments[8]
				this.fd_column = arguments[9]
				this.mad_table = arguments[10]
				this.scale_factor = arguments[11]
				this.data_offset = arguments[12]
				this.def_pixel_height = arguments[13]
				this.def_pixel_width = arguments[14]
				this.def_srid = arguments[15]
				this.def_extent = (arguments[16]) ? new internal.geometry(arguments[16]) : undefined
				this.date_column = arguments[17]
				this.def_pixeltype = arguments[18]
				this.abstract = arguments[19]
				this.source = arguments[20]
				this.public = arguments[21]
				break;
		}
	}
	getId(pool) {
		return pool.query("\
			SELECT id FROM fuentes WHERE nombre=$1 and tipo=$2\
		",[this.nombre, this.tipo]
		).then(res=>{
			if (res.rows.length>0) {
				this.id = res.rows[0].id
				return
			} else {
				return pool.query("\
				SELECT max(id)+1 AS id\
				FROM fuentes\
				")
				.then(res=>{
					this.id = res.rows[0].id
				})
			}
		})
	}
	toString() {
		return "{id:" + this.id + ",nombre:" + this.nombre + ", data_table:" + this.data_table + ", data_column:" + this.data_column + ", tipo:" + this.tipo + ", def_proc_id:" + this.def_proc_id + ", def_dt:" + JSON.stringify(this.def_dt) + ", hora_corte:" + JSON.stringify(this.hora_corte) + ", def_unit_id:" + this.def_unit_id + ", def_var_id:"+ this.def_var_id  + ", fd_column:"+  this.fd_column + ", mad_table:" + this.mad_table + ", scale_factor:" + this.scale_factor + ", data_offset:" + this.data_offset + ", def_pixel_height:" + this.def_pixel_height + ", def_pixel_width:" + this.def_pixel_width + ", def_srid:" + this.def_srid + ", def_extent:" + this.def_extent + ", date_column:" + this.date_column + ", def_pixeltype:" + this.def_pixeltype + ", abstract:" + this.abstract + ", source:" + this.source + "}"
	}
	toCSV() {
		return this.id + "," + this.nombre + "," + this.data_table + "," + this.data_column + "," + this.tipo + "," + this.def_proc_id + "," + JSON.stringify(this.def_dt) + "," + JSON.stringify(this.hora_corte) + "," + this.def_unit_id + ","+ this.def_var_id  + "," + this.fd_column + "," + this.mad_table + "," + this.scale_factor + "," + this.data_offset + "," + this.def_pixel_height + "," + this.def_pixel_width + "," + this.def_srid + "," + this.def_extent + "," + this.date_column + "," + this.def_pixeltype + "," + this.abstract + "," + this.source
	}
	toCSVless() {
		return this.id + "," + this.nombre + "," + this.source
	}
}

internal.fuente.build_read_query = function(filter) {
	if(filter && filter.tipo && filter.tipo.toLowerCase() == "puntual") {
		return internal.red.build_read_query(filter)
	}
	if(filter && filter.geom) {
		filter.def_extent = filter.geom
	}
	const valid_filters = {id: "numeric", nombre: "regex_string", data_table: "string", data_column: "string", tipo: "string", def_proc_id: "numeric", def_dt: "string", hora_corte: "string", def_unit_id: "numeric", def_var_id: "numeric", fd_column: "string", mad_table: "string", scale_factor: "numeric", data_offset: "numeric", def_pixel_height: "numeric", def_pixel_width: "numeric", def_srid: "numeric", def_extent: "geometry", date_column: "string", def_pixeltype: "string", abstract: "regex_string", source: "regex_string",public:"boolean_only_true"}
	var filter_string = control_filter(valid_filters,filter)
	if(!filter_string) {
		return Promise.reject(new Error("invalid filter value"))
	}
	console.log("filter_string:" + filter_string)
	return "SELECT id, nombre, data_table, data_column, tipo, def_proc_id, def_dt, hora_corte, def_unit_id, def_var_id, fd_column, mad_table, scale_factor, data_offset, def_pixel_height, def_pixel_width, def_srid, st_asgeojson(def_extent)::json def_extent, date_column, def_pixeltype, abstract, source, public\
	 FROM fuentes \
	 WHERE 1=1 " + filter_string
}



internal.serie = class {
	constructor() {
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) === "string") {
					var args_arr = arguments[0].split(",") // [this.id,this.estacion_id, this.var_id, this.proc_id, this.unit_id, this.tipo, this.fuentes_id] 
					this.id = args_arr[0]
					this.tipo = args_arr[5]
					this["var"]  = internal.CRUD.getVar(args_arr[2])
					this.procedimiento  = internal.CRUD.getProcedimiento(args_arr[3])
					this.unidades = internal.CRUD.getUnidad(args_arr[4])
					if(this.tipo == "areal") {
						this.fuente = internal.CRUD.getFuente(args_arr[6])
						this.estacion = internal.CRUD.getArea(args_arr[1])
					} else if(this.tipo == "rast" || this.tipo == "raster") {
						this.fuente = internal.CRUD.getFuente(args_arr[6])
						this.estacion = internal.CRUD.getEscena(args_arr[1])
					} else {
						this.estacion = internal.CRUD.getEstacion(args_arr[1])
					}
				} else {
					this.id = arguments[0].id
					this.tipo = arguments[0].tipo;
					if (arguments[0].estacion) {
						if(this.tipo == "areal") {
							this.estacion = new internal.area(arguments[0].estacion)
						} else if (this.tipo == "rast" || this.tipo == "raster") {
							this.estacion = new internal.escena(arguments[0].estacion)
						} else {
							this.estacion = new internal.estacion(arguments[0].estacion)
						}
					} else if (arguments[0].estacion_id) {
						this.estacion = {id:arguments[0].estacion_id}
					} else if (this.tipo == "areal") {
						if(arguments[0].area) {
							this.estacion = new internal.area(arguments[0].area)
						} else if(arguments[0].area_id) {
							this.estacion = {id:arguments[0].area_id}
						} else {
							this.estacion = {}
						}
					} else if (this.tipo == "rast" || this.tipo == "raster") {
						if(arguments[0].escena) {
							this.estacion = new internal.escena(arguments[0].escena)
						} else if(arguments[0].escena_id) {
							this.estacion = {id:arguments[0].escena_id}
						} else {
							this.estacion = {}
						}
					} else {
						this.estacion = {}
					}
					if (arguments[0]["var"]) {
						this["var"] =  new internal["var"](arguments[0]["var"])
					} else if (arguments[0].var_id) {
						this["var"] = {id:arguments[0].var_id}
					} else {
						this["var"] = {} 
					}
					if (arguments[0].procedimiento) {
						this.procedimiento = new internal.procedimiento(arguments[0].procedimiento)
					} else if (arguments[0].proc_id) {
						this.procedimiento = {id:arguments[0].proc_id}
					} else {
						this.procedimiento = {}
					}
					if (arguments[0].unidades) {
						this.unidades = new internal.unidades(arguments[0].unidades)
					} else if (arguments[0].unit_id) {
						this.unidades = {id:arguments[0].unit_id}
					} else {
						this.unidades = {}
					}
					if(this.tipo == "areal" || this.tipo == "rast" || this.tipo == "raster") {
						if (arguments[0].fuente) {
							this.fuente = new internal.fuente(arguments[0].fuente)
						} else if (arguments[0].fuentes_id) {
							this.fuente = {id:arguments[0].fuentes_id}
						} else {
							this.fuente = {}
						}
					} else {
						this.fuente = {}
					}
					if( (arguments[0].observaciones)) {
						this.observaciones = new internal.observaciones(arguments[0].observaciones)
					}
					this.date_range = arguments[0].date_range
				}
				break;
			default:
				[this.estacion, this["var"], this.procedimiento, this.unidades, this.tipo, this.fuente] = arguments
				break;
		}
		//~ console.log({serie:this})
	}
	toString() {
		if (this.tipo == "areal") {
			return "{id:" + this.id + ", area:" + this.estacion.toString() + ", var:" + this["var"].toString() + ", procedimiento:" + this.procedimiento.toString() + ", unidades:" + this.unidades.toString() + ", tipo:" + this.tipo + ", fuente:" + this.fuente.toString() + "}" 
		} else {
			return "{id:" + this.id + ", estacion:" + this.estacion.toString() + ", var:" + this["var"].toString() + ", procedimiento:" + this.procedimiento.toString() + ", unidades:" + this.unidades.toString() + ", tipo:" + this.tipo
		}
	}
	toCSV() {
		if (this.tipo == "areal") {
			return this.id + "," + this.estacion.id +"," + this["var"].id + "," + this.procedimiento.id + "," + this.unidades.id + "," + this.tipo + "," + this.fuente.id + "," + this.beginTime + "," + this.endTime + "," + this.count + "," + this.minValor + "," + this.maxValor
		} else {
			return this.id + "," + this.estacion.id +"," + this["var"].id + "," + this.procedimiento.id + "," + this.unidades.id + "," + this.tipo + "," + this.beginTime + "," + this.endTime + "," + this.count + "," + this.minValor + "," + this.maxValor
		}
	}
	toCSVless() {
		if (this.tipo == "areal") {
			return this.id + "," + this.estacion.id +"," + this["var"].id + "," + this.procedimiento.id + "," + this.unidades.id + "," + this.tipo + "," + this.fuente.id
		} else {
			return this.id + "," + this.estacion.id +"," + this["var"].id + "," + this.procedimiento.id + "," + this.unidades.id + "," + this.tipo
		}
	}
	toMnemos() {
		var var_matches = Object.keys(config.snih.variable_map).filter(key=>{
			return (config.snih.variable_map[key].var_id == this.var.id)
		})
		var codigo_de_variable
		if(var_matches.length <= 0) {
			console.error("Variable id " + this.var.id + " no encontrado en config.snih.variable_map")
			codigo_de_variable = null
		} else {
			codigo_de_variable = var_matches[0]
		}
		var observaciones = this.observaciones.map(o=>{
			return {
				codigo_de_estacion: this.estacion.id,
				codigo_de_variable: codigo_de_variable,
				dia: sprintf("%02d",o.timestart.getDate()), 
				mes: sprintf("%02d", o.timestart.getMonth()+1),
				anio: sprintf("%04d", o.timestart.getFullYear()),
				hora: sprintf("%02d", o.timestart.getHours()),
				minuto: sprintf("%02d", o.timestart.getMinutes()),
				valor: o.valor
			}
		})
		return this.arr2csv(observaciones)
	}
	arr2csv(arr) {
		if(! Array.isArray(arr)) {
			throw "arr2csv: Array incorrecto" 
		}
		var lines = arr.map(line=> {
			console.log(line)
			return [line.codigo_de_estacion, line.codigo_de_variable, line.dia, line.mes, line.anio, line.hora, line.minuto, line. valor].join(",")
		})
		return lines.join("\n")
	}
	
	getId(pool) {
		if(this.tipo == "areal") {
			//~ console.log([this.estacion.id, this["var"].id, this.procedimiento.id, this.unidades.id, this.fuente.id])
			return pool.query("\
				SELECT id FROM series_areal WHERE area_id=$1 AND var_id=$2 AND proc_id=$3 AND unit_id=$4 AND fuentes_id=$5\
			",[this.estacion.id, this["var"].id, this.procedimiento.id, this.unidades.id, this.fuente.id]
			).then(res=>{
				if (res.rows.length>0) {
					this.id = res.rows[0].id
					return this.id
				} else {
					return pool.query("\
					SELECT max(id)+1 AS id\
					FROM series_areal\
					")
					.then(res=>{
						this.id = res.rows[0].id
						return this.id
					})
				}
			})
		} else {
			return pool.query("\
				SELECT id FROM series WHERE estacion_id=$1 AND var_id=$2 AND proc_id=$3 AND unit_id=$4\
			",[this.estacion.id, this["var"].id, this.procedimiento.id, this.unidades.id]
			).then(res=>{
				if (res.rows.length>0) {
					this.id = res.rows[0].id
					return
				} else {
					return pool.query("\
					SELECT max(id)+1 AS id\
					FROM series\
					")
					.then(res=>{
						this.id = res.rows[0].id
					})
				}
			})
		}
	}
	
	
	getStats(pool) {
		if(!this.id) {
			console.error("Se necesita el id de serie para obtener las estadísticas")
			return this
		}
		if(this.tipo == "areal") {
			return pool.query("\
				SELECT min(timestart) begintime,max(timestart) endtime, count(timestart) count, min(valor) minValor, max(valor) maxValor FROM observaciones_areal,valores_num_areal WHERE series_id=$1  AND observaciones_areal.id=valores_num_areal.obs_id\
			",[this.id]
			).then(res=>{
				if (res.rows.length>0) {
					this.beginTime = res.rows[0].begintime
					this.endTime = res.rows[0].endtime
					this.count = res.rows[0].count
					this.minValor = res.rows[0].minvalor
					this.maxValor = res.rows[0].maxvalor
					return this
				} else {
					this.count = 0
					return this
				}
			})
		} else if (this.tipo == "rast" || this.tipo == "raster") {
			return pool.query("\
				WITH stats as (\
					SELECT min(timestart) begintime,\
					max(timestart) endtime, \
					count(timestart) count, \
					ST_SummaryStatsAgg(valor,1,true) stats \
				FROM observaciones_rast WHERE series_id=$1\
				)\
				SELECT begintime, \
					   endtime, \
					   count, \
					   round((stats).sum::numeric, 3) sum,\
						round((stats).mean::numeric, 3) mean,\
						round((stats).stddev::numeric, 3) stddev,\
						round((stats).min::numeric, 3) min,\
						round((stats).max::numeric, 3) max\
				FROM stats\
				",[this.id]
			).then(res=>{
				if (res.rows.length>0) {
					this.beginTime = res.rows[0].begintime
					this.endTime = res.rows[0].endtime
					this.count = res.rows[0].count
					this.rastStats = {sum: res.rows[0].sum, mean: res.rows[0].mean, stddev: res.rows[0].stddev, min: res.rows[0].min, max: res.rows[0].max} 
					return this
				} else {
					this.count = 0
					return this
				}
			})
		} else {
			return pool.query("\
				SELECT min(timestart) begintime,max(timestart) endtime, count(timestart) count, min(valor) minValor, max(valor) maxValor FROM observaciones,valores_num WHERE series_id=$1 AND observaciones.id=valores_num.obs_id\
			",[this.id]
			).then(res=>{
				if (res.rows.length>0) {
					this.beginTime = res.rows[0].begintime
					this.endTime = res.rows[0].endtime
					this.count = res.rows[0].count
					this.minValor = res.rows[0].minvalor
					this.maxValor = res.rows[0].maxvalor
					return this
				} else {
					this.count = 0
					return this
				}
			})
		}
	}
	
		
	getDateRange(pool) {
		if(!this.id) {
			return Promise.reject("falta serie.id")
		} 
		var table = (this.tipo) ? (this.tipo == "puntual") ? "series_date_range" : (this.tipo == "areal") ? "series_areal_date_range" : (this.tipo == "rast" || this.tipo == "raster") ? "series_rast_date_range" : "series_date_range"  : "series_date_range"
		return pool.query("SELECT * FROM " + table + " WHERE series_id=$1",[this.id]) 
		.then(result=>{
			if(result.rows.length == 0) {
				console.error("no se encontró rango de fechas de la serie " + this.tipo + " id:"+ this.id)
				return {
					timestart: undefined,
					timeend: undefined,
					count: 0
				}
			}
			this.date_range = {
				timestart: result.rows[0].timestart,
				timeend: result.rows[0].timeend,
				count: result.rows[0].count
			}
			return true
		})
	}

	tipo_guess() {
		if(!this.observaciones || this.observaciones.length == 0) {
			return
		}
		if(!this.tipo && this.observaciones[0].tipo) {
			var tipo_guess = this.observaciones[0].tipo
			var count = 0
			for(var i in this.observaciones) {
				if (this.observaciones[i].tipo != tipo_guess) {
					break
				}
				count++
			}
			if(count == this.observaciones.length) {
				this.tipo = tipo_guess
			}
		}
	}

	idIntoObs() {
		if(this.id && this.observaciones) {
			for(var i in this.observaciones) {
				observaciones[i].series_id = this.id
			}
		}
	}
}

internal.serie.build_read_query = function(filter={},options) {
	// var model = apidoc.serie
	var valid_filters
	var table
	var tipo
	var order_string
	if(!filter.tipo) {
		tipo = "puntual"
	} else {
		tipo = filter.tipo
	}
	if(!filter.id && filter.series_id) {
		filter.id = filter.series_id
		delete filter.series_id
	}
	var properties
	if(tipo.toUpperCase() == "AREAL" ) {
		valid_filters = {
			id:{
				type: "integer",
				table: "series_areal"
			},area_id:{
				type:"integer",
				table: "series_areal"
			},var_id:{
				type:"integer",
				table: "series_areal"
			},proc_id:{
				type:"integer",
				table: "series_areal"
			},unit_id:{
				type: "integer",
				table: "series_areal"
			},fuentes_id:{
				type:"integer",
				table: "series_areal"
			},public: {
				type:"boolean_only_true",
				table: "redes"
			},date_range_before: {
				column: "timestart",
				type: "timeend",
				table: "series_areal_date_range"
			},date_range_after: {
				column: "timeend",
				type: "timestart",
				table: "series_areal_date_range"
			},
			count: {
				type: "numeric_min",
				table: "series_areal_date_range"
			}

		}
		table = "series_areal join (select id f_id,nombre fuentes_nombre,public from fuentes) fuentes on (fuentes.f_id=series_areal.fuentes_id) join (select unid id,nombre area_nombre from areas_pluvio) areas on (areas.id=series_areal.area_id) join (select id,nombre var_nombre from var) var on (var.id=series_areal.var_id) join (select id,nombre proc_nombre from procedimiento) procedimiento on (procedimiento.id=series_areal.proc_id) join (select id,nombre unit_nombre from unidades) unidades on (unidades.id=series_areal.unit_id)\
			left join series_areal_date_range on (series_areal.id=series_areal_date_range.series_id)"
		properties = ["series_areal.id","area_id","area_nombre","proc_id","proc_nombre","var_id","var_nombre","unit_id","unit_nombre","fuentes_id","fuentes_nombre","series_areal_date_range.timestart","series_areal_date_range.timeend","series_areal_date_range.count"]
		order_string = " ORDER BY series_areal.id"
	} else if (tipo.toUpperCase() == "RASTER" || tipo.toUpperCase() == "RAST") {
		valid_filters = {
			id:{
				type:"integer",
				table: "series_rast"
			},escena_id:{
				type:"integer",
				table: "series_rast"
			},var_id:{
				type:"integer",
				table: "series_rast"
			},proc_id:{
				type: "integer",
				table: "series_rast"
			},unit_id:{
				type: "integer",
				table: "series_rast"
			},fuentes_id:{
				type:"integer",
				table: "series_rast"
			},public: {
				type:"boolean_only_true",
				table: "redes"
			}
		}
		table = "series_rast join (select id f_id,nombre fuentes_nombre,public from fuentes) fuentes on (fuentes.f_id=series_rast.fuentes_id) join (select id,nombre escena_nombre from escenas) escenas on (escenas.id=series_rast.escena_id) join (select id,nombre var_nombre from var) var on (var.id=series_rast.var_id) join (select id,nombre proc_nombre from procedimiento) procedimiento on (procedimiento.id=series_rast.proc_id) join (select id,nombre unit_nombre from unidades) unidades on (unidades.id=series_rast.unit_id)\
		left join series_rast_date_range on (series_rast.id=series_rast_date_range.series_id)"
		properties = ["series_rast.id","nombre","escena_id","escena_nombre","proc_id","proc_nombre","var_id","var_nombre", "unit_id","unit_nombre", "fuentes_id","fuentes_nombre","public","series_rast_date_range.timestart","series_rast_date_range.timeend","series_rast_date_range.count"]
		order_string = " ORDER BY series_rast.id"
	} else if (tipo.toUpperCase() == "PUNTUAL") {
		filter.red_id = (filter.red_id) ? filter.red_id : (filter.fuentes_id) ? filter.fuentes_id : undefined 
		valid_filters = {
			"id":{
				type:"arrInteger",
				table: "series"
			},
			var_id:{
				type:"arrInteger",
				table:"series"
			},
			proc_id:{
				type:"arrInteger",
				table: "series"
			},
			unit_id:{
				type:"arrInteger",
				table:"series"
			},
			estacion_id:{
				type:"arrInteger",
				table: "series"
			},
			tabla_id:{
				type:"string",
				table: "redes"
			},
			id_externo:{
				type:"string",
				table: "estaciones"
			},
			geom:{
				type: "geometry",
				table: "estaciones"
			},
			red_id:{
				type:"arrInteger",
				table:"redes"
			},
			public: {
				type:"boolean_only_true",
				table: "redes"
			},
			timestart_min: {
				column: "timestart",
				type: "date_min",
				table: "series_date_range"
			},date_range_before: {
				column: "timestart",
				type: "timeend",
				table: "series_date_range"
			},date_range_after: {
				column: "timeend",
				type: "timestart",
				table: "series_date_range"
			},
			count: {
				type: "numeric_min",
				table: "series_date_range"
			}
		}
		table = "series join (select unid,id_externo,tabla,geom,nombre estacion_nombre from estaciones) estaciones on (series.estacion_id=estaciones.unid) join (select id red_id,tabla_id,nombre red_nombre,public from redes) redes on (redes.tabla_id = estaciones.tabla) join (select id,nombre var_nombre from var) var on (var.id=series.var_id) join (select id,nombre proc_nombre from procedimiento) procedimiento on (procedimiento.id=series.proc_id) join (select id,nombre unit_nombre from unidades ) unidades on (unidades.id=series.unit_id)\
		left join series_date_range on (series.id=series_date_range.series_id)"
		properties = ["series.id","estacion_id","estacion_nombre","proc_id","proc_nombre","var_id","var_nombre","unit_id","unit_nombre","id_externo","tabla","st_asgeojson(geom) geom","red_nombre","public","series_date_range.timestart","series_date_range.timeend","series_date_range.count"]
		if(filter.geom) {
			filter.geom = new internal.geometry(filter.geom)
		}
		order_string = " ORDER BY series.id"
	} else {
		console.error("invalid tipo")
		throw "invalid tipo"
	}
	var filter_string=control_filter2(valid_filters,filter)

	return "SELECT  " + properties.join(",") + "  FROM " + table + " WHERE 1=1 " + filter_string + order_string
		// .then(res=>{
		// 	for(var i in res.rows) {
		// 		res.rows[i].date_range = {timestart: res.rows[i].timestart, timeend: res.rows[i].timeend, count: res.rows[i].count}
		// 		delete res.rows[i].timestart
		// 		delete res.rows[i].timeend
		// 		delete res.rows[i].count
		// 	}
		// 	if(options.no_metadata) {  // RETURN WITH NO METADATA (SOLO IDS)
		// 		return res.rows.map(r=> {
		// 			//~ delete r.geom
		// 			//~ console.log(r.geom)
		// 			if(r.geom) {
		// 				r.geom = JSON.parse(r.geom)
		// 			} 
		// 			r.tipo = tipo
		// 			return r
		// 		})
		// 	}
}


internal.serieRegular = class {
	constructor() {
		switch(arguments.length) {
			case 1:
				this.fromSeries = arguments[0].fromSeries  // internal.serie
				this.timestart= arguments[0].timestart  // date
				this.timeend = arguments[0].timeend     // date
				this.dt = arguments[0].dt               // interval
				this.t_offset = arguments[0].t_offset   // interval
				this.funcion = arguments[0].funcion // string
				this.data = arguments[0].data           //  array [[timestart,timeend,value],...]
				break;
			default:
				this.fromSeries = arguments[0]  // internal.serie
				this.timestart= arguments[1]  // date
				this.timeend = arguments[2]     // date
				this.dt = arguments[3]               // interval
				this.t_offset = arguments[4]   // interval
				this.funcion = arguments[5] // string
				this.data = arguments[6]           //  array [[timestart,timeend,value],...]
				break;
		}
	}
	toString() {
		return 
	}
	toCSV() {
		return
	}
	toCSVless() {
		return
	}
	
}

internal.campo2 = class {
	constructor() {
		switch(arguments.length) {
			case 1: 
				this.var_id= arguments[0].var_id
				this.proc_id= arguments[0].proc_id
				this.unit_id= arguments[0].unit_id
				this.timestart= new Date(arguments[0].timestart)
				this.timeend= new Date(arguments[0].timeend)
				this.geom= (arguments[0].geom) ? new internal.geometry(arguments[0].geom) : null
				this.estacion_id= arguments[0].estacion_id
				this.red_id= arguments[0].red_id
				this.options= arguments[0].options
				this.seriesRegulares= arguments[0].seriesRegulares //(arguments[0].seriesRegulares) ? arguments[0].seriesRegulares.map(s=> new internal.serieRegular(s)) : []
				break;
			default:
				this.var_id= arguments[0]
				this.proc_id= arguments[1]
				this.unit_id= arguments[2]
				this.timestart= new Date(arguments[3])
				this.timeend= new Date(arguments[4])
				this.geom= (arguments[5]) ? new internal.geometry(arguments[5]) : null
				this.estacion_id= arguments[6]
				this.red_id= arguments[7]
				this.options= arguments[8]
				this.seriesRegulares= arguments[9] // (arguments[9]) ? arguments[9].map(s=> new internal.serieRegular(s)) : []
				break;
		}
	}
	toString() {
		return  "var_id:" + this.var_id + ", proc_id:" + this.proc_id + ", unit_id:" + this.unit_id + ", timestart:" + this.timestart.toISOString() + ", timeend:" + this.timeend.toISOString() + ", geom:" + this.geom.toString() + ", estacion_id:" + this.estacion_id + ", red_id:" + this.red_id + ", options:" + this.options.toString() + ", seriesRegulares:" + (this.seriesRegulares) ? ("[" + this.seriesRegulares.map(s=>s.toString()).join(",") + "]") : "[]"
	}
	toCSV() {
		return
	}
	toCSVless() {
		return
	}
}

internal.campo = class {
	constructor() {
		switch(arguments.length) {
			case 1: 
				this.filter = arguments[0].filter
				this.options = arguments[0].options
				this.proc_id = arguments[0].proc_id
				this.procedimiento = arguments[0].procedimiento
				this.series = arguments[0].series
				this.timestart = arguments[0].timestart
				this.timeend = arguments[0].timeend
	            this.unidades=arguments[0].unidades
	            this.unit_id=arguments[0].unit_id
				this.var_id=arguments[0].var_id
				this.variable=arguments[0].variable
				break;
			default:
				this.filter = arguments[0]
				this.options = arguments[1]
				this.proc_id = arguments[2]
				this.procedimiento = arguments[3]
				this.series = arguments[4]
				this.timestart = arguments[5]
				this.timeend = arguments[6]
	            this.unidades=arguments[7]
	            this.unit_id=arguments[8]
				this.var_id=arguments[9]
				this.variable=arguments[10]
				break;
		}
	}
	toString() {
		return JSON.stringify(this)
	}
	toCSV() {
		var csv = [
			"# VARIABLE=" + this.variable.abrev,
			"# TIMESTART=" + this.timestart.toISOString(),
			"# TIMEEND=" + this.timeend.toISOString(),
			"# PROCEDIMIENTO=" + this.procedimiento.abrev,
			"# UNIDADES=" + this.unidades.abrev,
			"",
			"lon,lat,estacion_id,nombre,tabla,red_id,valor,count"
		]
		return csv.concat(this.series.map(s=> sprintf("%.5f,%.5f,%d,%-40s,%-24s,%d,%f,%d", s.estacion.geom.coordinates[0],s.estacion.geom.coordinates[1],s.estacion.id,s.estacion.nombre,s.estacion.tabla,s.estacion.red_id,parseFloat(s.valor),s.count))).join("\n")
	}
	toCSVless() {
		return
	}
	toGeoJSON() {
		var features = this.series.map(s=> {
			return  {
				type: "Feature",
				geometry: s.estacion.geom,
				properties: {
					estacion_id: s.estacion.id,
					nombre: s.estacion.nombre,
					tabla: s.estacion.tabla,
					red_id: s.estacion.red_id,
					series_id: s.id,
					variable: this.variable.abrev,
					procedimiento: this.procedimiento.abrev,
					unidades: this.unidades.abrev,
					timestart: this.timestart,
					timeend: this.timeend,
					valor: parseFloat(s.valor),
					count: s.count
				}
		    }
		})
		return  {
			type: "FeatureCollection", 
			features: features, 
			"@properties": {
				filter: this.filter,
				options: this.options,
				proc_id: this.proc_id,
				procedimiento: this.procedimiento,
				timestart: this.timestart,
				timeend: this.timeend,
	            unidades: this.unidades,
	            unit_id: this.unit_id,
				var_id: this.var_id
			}
		}
	}
	toGrid(params={}) {
		var rand = Math.random().toString().substring(2,8)
		var geojson_file = (params.geojson_file) ? params.geojson_file : "/tmp/campo_" + rand + ".geojson" 
		var grid_file = (params.grid_file) ? params.grid_file : "/tmp/campo_" + rand + ".tif" 
		return fs.writeFile(geojson_file,JSON.stringify(this.toGeoJSON()))
		.then(()=> {
			var sys_call
			sys_call = "gdal_grid -zfield valor -l campo -outsize 300 300 -txe -70.0 -40.0 -tye -10.0 -40.0 -a nearest:radius1=2.0:radius2=2.0:angle=0.0:nodata=9999.0 -of GTiff " + geojson_file + " " + grid_file
			return new Promise( (resolve,reject) =>{
				exec(sys_call, (err, stdout, stderr)=>{
					if(err) {
						reject(err)
					}
					resolve(stdout)
				})
			})
			.then(result=>{
				console.log(result)
				return fs.readFile(grid_file,{encoding:'hex'})
			}).then(data=>{
				if (params.series_id) {
					return new internal.observacion({tipo:"raster",series_id:params.series_id,timestart:this.timestart,timeend:this.timeend,valor: '\\x' + data})
				}					
				return new internal.observacion({tipo:"raster",timestart:this.timestart,timeend:this.timeend,valor:'\\x' + data})
			})
		})
	}
}

internal.observacion = class {
	constructor() {
		var tipo, series_id, timestart, timeend, nombre, descripcion, unit_id, timeupdate, valor, scale, offset, options, stats
		var opt_fields = ['id','descripcion','nombre','unit_id','timeupdate']
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) == "string") {
					[this.id,this.tipo, this.series_id, this.timestart, this.timeend, this.nombre, this.descripcion, this.unit_id, this.timeupdate, this.valor, this.scale, this.offset, this.count, this.options, this.stats] = arguments[0].split(",")
					opt_fields.forEach(key=>{
						if(this[key]) {
							if(this[key] == "undefined") {
								this[key] = undefined
							}
						}
					})
				} else {
					if(arguments[0].valor) {
						if(arguments[0].valor instanceof Buffer) {
							this.valor = arguments[0].valor
						} else if(arguments[0].valor instanceof Object && arguments[0].valor.type == "Buffer") {
							this.valor = Buffer.from(arguments[0].valor.data)
						} else {
							this.valor = arguments[0].valor
						}
					}
					this.id = arguments[0].id
					this.tipo = arguments[0].tipo
					this.series_id=arguments[0].series_id
					this.timestart=arguments[0].timestart
					this.timeend=arguments[0].timeend
					this.nombre=arguments[0].nombre
					this.descripcion=arguments[0].descripcion
					this.unit_id=arguments[0].unit_id
					this.timeupdate= arguments[0].timeupdate ? new Date(arguments[0].timeupdate) : new Date()
					
					this.scale=arguments[0].scale
					this.offset=arguments[0].offset
					this.count=arguments[0].count
					this.options=arguments[0].options
					this.stats=arguments[0].stats
				}
				break;
			default:
				[this.tipo, this.series_id, this.timestart, this.timeend, this.nombre, this.descripcion, this.unit_id, this.timeupdate, this.valor, this.scale, this.offset, this.count, this.options, this.stats] = arguments
				break;
		}
		this.timeupdate = (this.timeupdate) ? this.timeupdate : new Date()
		//~ console.log(this.timestart instanceof Date)
		//~ if(! this.timestart instanceof Date) {
			//~ this.timestart = new Date(this.timestart)
		//~ }
		//~ console.log(this.timeend instanceof Date)
		//~ if(! this.timeend instanceof Date) {
			//~ this.timeend = new Date(this.timeend)
		//~ }
		this.timestart = (typeof this.timestart) == 'string' ? new Date(this.timestart) : this.timestart
		this.timeend = (typeof this.timeend) == 'string' ? new Date(this.timeend) : this.timeend
		//~ console.log({timestart:this.timestart,timeend:this.timeend})
	}
	isValid() {
		var tipos = ["puntual","areal","raster"]
		return ( this.timestart.toString() == 'Invalid Date' || this.timeend.toString() == 'Invalid Date' || parseInt(this.series_id).toString() == "NaN" || !this.isValidValue() || !tipos.includes(this.tipo)) ? false : true
	}
	isValidValue() {
		if(this.valor === null) {
			return true
		}
		this.setValType()
		switch(this.val_type) {
			case "num":
				return (parseFloat(this.valor).toString() != "NaN")
				break;
			case "numarr":
				var numarr = this.valor.filter(v=>parseFloat(v).toString() != "NaN")
				if(numarr.length == this.valor.length) {
					return true
				} else {
					return false
				}
				break;
			case "rast":
				return (this.value instanceof Buffer)
				break;
			default:
				return false
		}
	}
				
	setValType(valType) {  // si valType es nulo y this.valor es no nulo se determina val_type de acuerdo al tipo de this.valor
		if(valType) {
			const valid = ["num","numarr","rast"]
			if(valType == "num") {
				this.val_type = "num"
			} else if(valType == "numarr") {
				this.val_type = "numarr"
			} else if (valType == "rast") {
				this.val_type
			} else {
				console.error("invalid value type")
				
			}
		} else if (!this.val_type && this.valor) {
			if(Array.isArray(this.valor)) {
				var numarr = this.valor.filter(v=>parseFloat(v).toString() != "NaN")
				if(numarr.length > 0) {
					this.val_type = "numarr"
				} else {
					console.error("value type no detectado: array no numérico")
				}
			} else if (parseFloat(this.valor).toString() != "NaN") {
				this.val_type = "num"
			} else if (this.valor instanceof Buffer) {
				this.val_type = "rast"
			} else {
				console.error("value type no detectado")
			}
		}
		return this.val_type
	}
	getId(pool) {
		if(this.tipo == "areal") {
			return pool.query("\
				SELECT id FROM observaciones_areal WHERE series_id=$1 AND timestart=$2 AND timeend=$3\
			",[this.series_id, this.timestart, this.timeend]
			).then(res=>{
				if (res.rows.length>0) {
					this.id = res.rows[0].id
					return this.id
				} else {
					return pool.query("\
					SELECT max(id)+1 AS id\
					FROM observaciones_areal\
					")
					.then(res=>{
						this.id = res.rows[0].id
						return this.id
					})
				}
			})
		} else if (this.tipo == "rast") {
			return pool.query("\
				SELECT id FROM observaciones_rast WHERE series_id=$1 AND timestart=$2 AND timeend=$3\
			",[this.series_id, this.timestart, this.timeend]
			).then(res=>{
				if (res.rows.length>0) {
					this.id = res.rows[0].id
					return this.id
				} else {
					return pool.query("\
					SELECT max(id)+1 AS id\
					FROM observaciones_rast\
					")
					.then(res=>{
						this.id = res.rows[0].id
						return this.id
					})
				}
			})
		} else {
			return pool.query("\
				SELECT id FROM observaciones WHERE series_id=$1 AND timestart=$2 AND timeend=$3\
			",[this.series_id, this.timestart, this.timeend]
			).then(res=>{
				if (res.rows.length>0) {
					this.id = res.rows[0].id
					return
				} else {
					return pool.query("\
					SELECT max(id)+1 AS id\
					FROM observaciones\
					")
					.then(res=>{
						this.id = res.rows[0].id
					})
				}
			})
		}
	}
	toString() {
		var valor = (this.tipo == "rast" || this.tipo == "raster") ? "rasterFile" : this.valor.toString()
		return "{" + "id:" + this.id + ", tipo:" + this.tipo + ", series_id:" + this.series_id + ", timestart:" + this.timestart.toISOString() + ", timeend:" + this.timeend.toISOString() + ", nombre:" + this.nombre + ", descrpcion:" + this.descripcion + ", unit_id:" + this.unit_id + ", timeupdate:" + this.timeupdate.toISOString() + ", valor:" + valor + "}"
	}
	toCSV() {
		return this.id + "," + this.tipo + "," + this.series_id + "," + ((this.timestart) ? this.timestart.toISOString() : "null") + "," + ((this.timeend) ? this.timeend.toISOString() : "null") + "," + this.nombre + "," + this.descripcion + "," + this.unit_id + "," + ((this.timeupdate) ? this.timeupdate.toISOString() : "null") + "," + ((parseFloat(this.valor).toString() !== 'NaN') ? this.valor.toString() : "null")
	}
	toCSVless() {
		//~ return this.series_id + "," + ((this.timestart) ? this.timestart.toISOString() : "null") + "," +  ((parseFloat(this.valor)) ? this.valor.toString() : "null")
		return ((this.series_id) ? this.series_id : "null") + "," + ((this.timestart) ? this.timestart.toISOString() : "null") + "," + ((this.timeend) ? this.timeend.toISOString() : "null") + "," +  ((parseFloat(this.valor).toString() !== 'NaN') ? this.valor.toString() : "null")
	}
	toMnemos(codigo_de_estacion,codigo_de_variable) {
		return [codigo_de_estacion,codigo_de_variable,sprintf("%02d",this.timestart.getDate()),sprintf("%02d", this.timestart.getMonth()+1),sprintf("%04d", this.timestart.getFullYear()),sprintf("%02d", this.timestart.getHours()),sprintf("%02d", this.timestart.getMinutes()),...this.valor].join(",")
	}
}

internal.observaciones = class extends Array {
	constructor(arr,options) {
		if(arr) {
			super(...[])
			for (const x of arr) this.push(x)
		}
		this.getObsClass()
		if(options) {
			this.metadata = {}
			var valid_md_keys = ["dt","t_offset","timestart","timeend","var_id","proc_id","estacion_id","fuentes_id","pivot","skip_nulls"]
			for(var key of valid_md_keys) {
				if(options[key]) {
					this.metadata[key] = options[key]
				}
			}
			if(options && options.pivot) {
				if(options.skip_nulls) {
					this.pivot()
				} else {
					if(this.metadata.timestart && this.metadata.timeend && this.metadata.dt && this.metadata.t_offset) {
						this.pivotRegular()
					} else {
						this.pivot()
					}
				}
			}
		}
	}
	getObsClass() {
		this.forEach(o=>{
			if(!o instanceof internal.observacion) {
				o = new internal.observacion(o)
			}
		})
	}
    toString() {
        return this.map(o=>o.toString()).join("\n")
    }
    toCSV(sep=",") {
		if(this.metadata && this.metadata.pivot) {
			var headers = Array.from(this.headers)
			var h1 = headers.shift()
			var h2 = headers.shift()
			headers.sort((a,b)=>a-b)
			var header = `${h1}${sep}${h2}${sep}${headers.join(sep)}\n`
			var body = this.map(o=>{
				var values = headers.map(key=>{
					if(o[key]) {
						return o[key]
					} else {
						return "NULL"
					}
				}).join(sep)
				return `${o.timestart.toISOString()}${sep}${o.timeend.toISOString()}${sep}${values}`
			}).join("\n")
			return `${header}${body}`
		} else {
			return this.map(o=>o.toCSV()).join("\n")
		}
	}
    toCSVless() {
        return this.map(o=>o.toCSVless()).join("\n")
    }
    toMnemos(estacion_id,var_id) {
		var var_matches = Object.keys(config.snih.variable_map).filter(key=>{
			return (config.snih.variable_map[key].var_id == var_id)
		})
		var codigo_de_variable
		if(var_matches.length <= 0) {
			console.error("Variable id " + var_id + " no encontrado en config.snih.variable_map")
			codigo_de_variable = null
		} else {
			codigo_de_variable = var_matches[0]
		}
		return this.map(o=>o.toMnemos(estacion_id,codigo_de_variable)).join("\n")
    }
    removeDuplicates() {   // elimina observaciones con timestart duplicado
		var timestarts = []
		for(var i=0;i<this.length;i++) { 
			if(timestarts.indexOf(this[i].timestart) >= 0) {
				console.log("removing duplicate observacion, timestart:"+o.timestart)
				this.splice(i,1)
				i--
			} 
		}
	}
	map(fn) {
		var result = []
		this.forEach(o=>{
			if(!fn) {
				result.push(o)
			} else {
				if(typeof fn !== 'function') {
					throw("map argument must be a function")
				}
				result.push(fn(o))
			}
		})
		return result
	}
	pivot(inline=true) {
		var pivoted = {}
		var headers = new Set(["timestart","timeend"])
		this.forEach(o=>{
			if(!o.series_id) {
				throw("can't pivot: missing series_id")
			}
			const key = o.timestart.toISOString()
			if(!pivoted[key]) {
				pivoted[key] = {
					timestart: o.timestart, 
					timeend: o.timeend
				}
			}
			pivoted[key][o.series_id] = o.valor
			headers.add(o.series_id)
		})
		var result = Object.keys(pivoted).sort().map(key=>{
			return pivoted[key]
		})
		if(inline) {
			this.length = 0
			this.push(...result)
			this.headers = headers
		}
		return result
	}
	pivotRegular(timestart,timeend,dt,t_offset,inline=true) {
		if(!timestart) {
			if(!this.metadata || !this.metadata.timestart) {
				throw("missing timestart")
			}
			timestart = this.metadata.timestart
		}
		if(!timeend) {
			if(!this.metadata || !this.metadata.timeend) {
				throw("missing timeend")
			}
			timeend = this.metadata.timeend
		}
		if(!dt) {
			if(!this.metadata.dt) {
				dt = {days:1}
			}
			dt = this.metadata.dt
		}
		if(!t_offset) {
			if(!this.metadata.t_offset) {
				t_offset = {hours:0}
			}
			t_offset = this.metadata.t_offset
		}
		timestart = timeSteps.setTOffset(timestart,t_offset)
		var dates = timeSteps.dateSeq(timestart,timeend,dt)
		this.sort((a,b)=>(a.timestart.getTime() - b.timestart.getTime()))
		var start = 0
		var end = response.length - 1
		var headers = new Set(["timestart","timeend"])
		var pivoted = dates.map(date=>{
			var row = {
				timestart: date,
				timeend: timeSteps.advanceInterval(date,dt)
			}
			for(var i=start;i<=end;i++) {
				var o = this[i]
				if(o.timestart.getTime() == date.getTime()) {
					row[o.series_id] = o.valor
					headers.add(o.series_id)
				} else if (o.timestart.getTime() > date.getTime()) {
					start = i
					break
				}
			}
			return row
		})
		if(inline) {
			this.length = 0
			this.push(...pivoted)
			this.headers = headers // Array.from(headers)
		}
		return pivoted
	}
}


internal.dailyStats = class {
	constructor() {
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) == "string") {
					[this.tipo,this.series_id,this.doy, this.count, this.min, this.max, this.mean, this.p01, this.p10, this.p50, this.p90, this.p99, this.window_size,this.timestart, this.timeend] = arguments[0].split(",")
				} else {
					this.tipo = arguments[0].tipo
					this.series_id = arguments[0].series_id
					this.doy = arguments[0].doy
					this.count=arguments[0].count
					this.min=arguments[0].min
					this.max=arguments[0].max
					this.mean=arguments[0].mean
					this.p01=arguments[0].p01
					this.p10=arguments[0].p10
					this.p50=arguments[0].p50
					this.p90=arguments[0].p90
					this.p99=arguments[0].p99
					this.window_size=arguments[0].window_size
					this.timestart=arguments[0].timestart
					this.timeend=arguments[0].timeend
				}
				break;
			default:
				[this.tipo, this.series_id, this.doy, this.count, this.min, this.max, this.mean, this.p01, this.p10, this.p50, this.p90, this.p99, this.window_size, this.timestart, this.timeend] = arguments
				break;
		}
	}
	toString() {
		return JSON.stringify({tipo:this.tipo,series_id:this.series_id,doy:this.doy,count:this.count, min:this.min, max:this.max, mean:this.mean, p01:this.p01, p10:this.p10, p50:this.p50, p90:this.p90, p99:this.p99, window_size:this.window_size, timestart:this.timestart, timeend:this.timeend})
	}
	toCSV() {
		return this.tipo + "," + this.series_id + "," + this.doy+ "," + this.count+ "," + this.min+ "," + this.max+ "," + this.mean+ "," + this.p01 + "," + this.p10+ "," + this.p50+ "," + this.p90+ "," + this.p99 + "," + this.window_size + "," + this.timestart.toISOString() + "," + this.timeend.toISOString()
	}
	toCSVless() {
		return this.tipo + "," + this.series_id + "," + this.doy+ "," + this.count+ "," + this.min+ "," + this.max+ "," + this.mean+ "," + this.p01 + "," + this.p10+ "," + this.p50+ "," + this.p90+ "," + this.p99 + "," + this.window_size + "," + this.timestart.toISOString() + "," + this.timeend.toISOString()
	}
}

internal.monthlyStats = class {
	constructor() {
		switch(arguments.length) {
			case 1:
				if(typeof(arguments[0]) == "string") {
					[this.tipo,this.series_id,this.mon, this.count, this.min, this.max, this.mean, this.p01, this.p10, this.p50, this.p90, this.p99, this.timestart, this.timeend] = arguments[0].split(",")
				} else {
					this.tipo = arguments[0].tipo
					this.series_id = arguments[0].series_id
					this.mon = arguments[0].mon
					this.count=arguments[0].count
					this.min=arguments[0].min
					this.max=arguments[0].max
					this.mean=arguments[0].mean
					this.p01=arguments[0].p01
					this.p10=arguments[0].p10
					this.p50=arguments[0].p50
					this.p90=arguments[0].p90
					this.p99=arguments[0].p99
					this.timestart=arguments[0].timestart
					this.timeend=arguments[0].timeend
				}
				break;
			default:
				[this.tipo, this.series_id, this.mon, this.count, this.min, this.max, this.mean, this.p01, this.p10, this.p50, this.p90, this.p99, this.timestart, this.timeend] = arguments
				break;
		}
	}
	toString() {
		return JSON.stringify({tipo:this.tipo,series_id:this.series_id,mon:this.mon,count:this.count, min:this.min, max:this.max, mean:this.mean, p01:this.p01, p10:this.p10, p50:this.p50, p90:this.p90, p99:this.p99, timestart:this.timestart, timeend:this.timeend})
	}
	toCSV() {
		return this.tipo + "," + this.series_id + "," + this.mon + "," + this.count+ "," + this.min+ "," + this.max+ "," + this.mean+ "," + this.p01 + "," + this.p10+ "," + this.p50+ "," + this.p90+ "," + this.p99 + "," + this.timestart.toISOString() + "," + this.timeend.toISOString()
	}
	toCSVless() {
		return this.tipo + "," + this.series_id + "," + this.doy+ "," + this.count+ "," + this.min+ "," + this.max+ "," + this.mean+ "," + this.p01 + "," + this.p10+ "," + this.p50+ "," + this.p90+ "," + this.p99 + "," + this.timestart.toISOString() + "," + this.timeend.toISOString()
	}
}

internal.monthlyStatsList = class {
	constructor() {
		this.varNames = ["tipo", "series_id", "mon", "count", "min", "max", "mean", "p01", "p10", "p50", "p90", "p99", "timestart", "timeend"]
		this.values = arguments[0].map(v=>{
			if(v instanceof internal.monthlyStats) {
				return v
			} else {
				return new internal.monthlyStats(v)
			}
		})
	}
	toString() {
		return JSON.stringify(this.values)
	}
	toCSV() {
		return "# " + this.varNames.join(",") + "\n" + this.values.map(v=>v.toCSV()).join("\n")
	}
	toCSVless() {
		return "# " + this.varNames.join(",") + "\n" + this.values.map(v=>v.toCSVless()).join("\n")
	}
}

internal.dailyStatsList = class {
	constructor() {
		this.varNames = ["tipo", "series_id", "doy", "count", "min", "max", "mean", "p01", "p10", "p50", "p90", "p99", "window_size", "timestart", "timeend"]
		this.values = arguments[0].map(v=>{
			if(v instanceof internal.dailyStats) {
				return v
			} else {
				return new internal.dailyStats(v)
			}
		})
	}
	toString() {
		return JSON.stringify(this.values)
	}
	toCSV() {
		return "# " + this.varNames.join(",") + "\n" + this.values.map(v=>v.toCSV()).join("\n")
	}
	toCSVless() {
		return "# " + this.varNames.join(",") + "\n" + this.values.map(v=>v.toCSVless()).join("\n")
	}

	getMonthlyValues2() {
		var monthly = {}
		this.values.filter(v=>(timeSteps.doy2date(v.doy) == 15)).forEach(v=>{
			var mon = timeSteps.doy2month(v.doy)
			monthly[mon] = v
			delete monthly[mon].doy
			delete monthly[mon].window_size
		})
		return monthly
	}
	
	getMonthlyValues() {
		var monthly = {}
		this.values.forEach(v=>{
			var month = timeSteps.doy2month(v.doy)
			if(!monthly[month]) {
				monthly[month] = {
					values: [v]
				}
			} else {
				monthly[month].values.push(v)
			}
		})
		Object.keys(monthly).forEach(key=>{
			monthly[key].min = monthly[key].values.reduce((a,b)=>(a<b.min)?a:b.min,monthly[key].values[0].min)
			monthly[key].max = monthly[key].values.reduce((a,b)=>(a>b.max)?a:b.max,monthly[key].values[0].max)
			monthly[key].mean = monthly[key].values.reduce((a,b)=>a+b.mean,0) / monthly[key].values.length
			var p01 = monthly[key].values.map(v=>v.p01).sort((a, b) => a - b)
			monthly[key].p01 = p01[parseInt(p01.length/2)]
			var p10 = monthly[key].values.map(v=>v.p10).sort((a, b) => a - b)
			monthly[key].p10 = p10[parseInt(p10.length/2)]
			var p50 = monthly[key].values.map(v=>v.p50).sort((a, b) => a - b)
			monthly[key].p50 = p50[parseInt(p50.length/2)]
			var p90 = monthly[key].values.map(v=>v.p90).sort((a, b) => a - b)
			monthly[key].p90 = p90[parseInt(p90.length/2)]
			var p99 = monthly[key].values.map(v=>v.p99).sort((a, b) => a - b)
			monthly[key].p99 = p99[parseInt(p99.length/2)]
			monthly[key].count = monthly[key].values.reduce((a,b)=>a+b.count,0)
			monthly[key].timestart = monthly[key].values.reduce((a,b)=>(a.getTime()<b.timestart.getTime())?a:b.timestart,monthly[key].values[0].timestart)
			monthly[key].timeend = monthly[key].values.reduce((a,b)=>(a.getTime()>b.timeend.getTime())?a:b.timeend,monthly[key].values[0].timeend)
			delete monthly[key].values
		})
		return monthly
	}
	
}

internal.doy_percentil = class {
	constructor() {
		for (let [key, value] of Object.entries(arguments[0])) {
			this[key] = value
		}
	}
	toString() {
		return JSON.stringify(this)
	}
	toCSV() {
		return this.tipo + "," + this.series_id+ "," + this.doy+ "," + this.percentil+ "," + this.valor+ "," + this.count+ "," + this.timestart.toISOString().substring(0,10)+ "," + this.timeend.toISOString().substring(0,10) + "," + this.window_size
	} 
	toCSVless() {
		return this.tipo + "," + this.series_id+ "," + this.doy+ "," + this.percentil+ "," + this.valor
	}
} 

internal.percentiles = class {
	constructor() {
		this.tipo = arguments[0].tipo
		this.series_id = arguments[0].series_id
		this.percentiles = arguments[0].percentiles.map(p=>new internal.percentil(p))
	}
	toString() {
		return JSON.stringify(this)
	}
	toCSV() {
		return this.percentiles.map(p=>p.toCSV(this.tipo,this.series_id)).join("\n")
	} 
	toCSVless() {
		return this.percentiles.map(p=>p.toCSVless(this.tipo,this.series_id)).join("\n")
	}
}

internal.percentil = class {
	constructor() {
		// for (let [key, value] of Object.entries(arguments[0])) {
		// 	this[key] = value
		// }
		this.tipo = arguments[0].tipo
		this.series_id = arguments[0].series_id
		this.percentile = arguments[0].percentile
		this.valor = arguments[0].valor
		this.timestart = arguments[0].timestart
		this.timeend = arguments[0].timeend
		this.count = arguments[0].count
		
	}
	toString() {
		return JSON.stringify(this)
	}
	toCSV(tipo,series_id) {
		var tipo = (tipo) ? tipo : this.tipo
		var series_id = (series_id) ? series_id : this.series_id
		return tipo + "," + series_id + "," + this.percentile+ "," + this.valor+ "," + this.count+ "," + this.timestart.toISOString().substring(0,10)+ "," + this.timeend.toISOString().substring(0,10)
	} 
	toCSVless(tipo,series_id) {
		var tipo = (tipo) ? tipo : this.tipo
		var series_id = (series_id) ? series_id : this.series_id
		return tipo + "," + series_id+ "," + this.percentile + "," + this.valor
	}
} 

internal.observacionDia = class {
	constructor() {
		this.date = arguments[0].date
		this.series_id = arguments[0].series_id
		this.var_id = arguments[0].var_id
		this.proc_id = arguments[0].proc_id
		this.unit_id = arguments[0].unit_id
		this.estacion_id = arguments[0].estacion_id
		this.valor = arguments[0].valor
		this.fuentes_id = arguments[0].fuentes_id
		this.area_id = arguments[0].area_id
	}
	toString() {
		return JSON.stringify(this)
	}
	toCSV() {
		return this.series_id + "," + this.date + "," + this.var_id + "," + this.proc_id  + "," + this.unit_id  + "," + this.estacion_id  + "," + this.valor
	}
	toCSVless() {
		return this.series_id + "," + this.date + "," + this.valor
	}
}

// sim

internal.modelo = class {
	constructor() {
		var m = arguments[0]
		this.id = (m.id) ? parseInt(m.id) : undefined
		this.nombre = (m.nombre) ? m.nombre.toString() : undefined
		this.tipo = (m.tipo) ? m.tipo.toString() : undefined
		this.parametros = (m.parametros) ? m.parametros.map(p=>new internal.modelo_parametro(p)) : undefined
		this.forzantes = (m.forzantes) ? m.forzantes.map(f=>new internal.modelo_forzante(f)) : undefined
		this.estados = (m.estados) ? m.estados.map(e=>new internal.modelo_estado(e)) : undefined
		this.outputs = (m.outputs) ? m.estados.map(o=>new internal.modelo_output(o)) : undefined
		this.sortArrays()
	}
	sortArrays() {
		sortByOrden(this.parametros)
		sortByOrden(this.forzantes)
		sortByOrden(this.estados)
		sortByOrden(this.outputs)
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.id + "," + this.nombre + "," + this.tipo
	} 
	toCSVless() {
		return this.id + "," + this.nombre + "," + this.tipo
	} 
}

internal.modelo_parametro = class {
	constructor() {
		var m = arguments[0]
		this.orden = parseInt(m.orden)
		this.nombre = (m.nombre) ? m.nombre.toString() : undefined
		this.lim_inf = (m.lim_inf) ? parseFloat(m.lim_inf) : -Infinity 
		this.lim_sup= (m.lim_sup) ? parseFloat(m.lim_sup) : Infinity
		this.range_min = (m.range_min) ? parseFloat(m.range_min) : undefined
		this.range_max = (m.range_max) ? parseFloat(m.range_max) : undefined
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.orden + "," + this.nombre + "," + this.lim_inf + "," + this.lim_sup + "," + this.range_min + "," + this.range_max
	} 
	toCSVless() {
		return this.orden + "," + this.nombre
	} 
}

internal.modelo_forzante = class {
	constructor() {
		var m = arguments[0]
		this.orden = parseInt(m.orden)
		this.nombre = (m.nombre) ? m.nombre.toString() : undefined
		this.var_id = (m.var_id) ? parseInt(m.var_id) : undefined
		this.unit_id = (m.unit_id) ? parseInt(m.unit_id) : undefined
		this.inst = (m.hasOwnProperty("inst")) ? m.inst : undefined
		this.tipo = (m.tipo) ? (m.tipo == 'puntual') ? "puntual" : "areal" : "areal"
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.orden + "," + this.nombre + "," + this.var_id + "," + this.unit_id + "," + this.inst + "," + this.tipo
	} 
	toCSVless() {
		return this.orden + "," + this.nombre
	} 
}
internal.modelo_estado = class {
	constructor() {
		var m = arguments[0]
		this.orden = parseInt(m.orden)
		this.nombre = (m.nombre) ? m.nombre.toString() : undefined
		this.range_min = m.range_min
		this.range_max = m.range_max
		this.def_val = m.def_val
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.orden + "," + this.nombre + "," + this.range_min + "," + this.range_max + "," + this.def_val
	} 
	toCSVless() {
		return this.orden + "," + this.nombre
	} 
}

internal.modelo_output = class {
	constructor() {
		var m = arguments[0]
		this.orden = parseInt(m.orden)
		this.nombre = (m.nombre) ? m.nombre.toString() : undefined
		this.var_id = m.var_id
		this.unit_id = m.unit_id
		this.inst = (m.hasOwnProperty("inst")) ? m.inst : undefined
		this.series_table = (m.series_table) ? (m.series_table == 'series_areal') ? "series_areal" : "series" : "series"
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.orden + "," + this.nombre + "," + this.var_id + "," + this.unit_id + "," + this.inst + "," + this.series_table
	} 
	toCSVless() {
		return this.orden + "," + this.nombre
	}
}

const classes = {
	"Calibrado": internal.Calibrado
}

internal.genericModel = class {
	constructor(model_name) {
		this.schema = model_name
	}
	// getModelName() {
		// var model_name = this.constructor.name
		// return model_name.charAt(0).toUpperCase() + model_name.slice(1)
	// 	return this.schema
	// }
	remove_null_properties() {
		for(var key in this) {
			if(this[key] === null) {
				delete this[key]
			}
		}
	}
	validate() {
		this.remove_null_properties()
		return utils.validate_with_model(this,this.schema)
	}
	
}

internal.calibrado = class extends internal.genericModel {
	constructor() {
		super("Calibrado")
		var m = arguments[0]
		if(m.estados_iniciales && ! m.estados) {
			m.estados = m.estados_iniciales
		}
		this.id = (m.id) ? parseInt(m.id) : undefined
		this.nombre = (m.nombre) ? m.nombre.toString() : undefined
		this.model_id = parseInt(m.model_id)
		this.activar = (m.hasOwnProperty("activar")) ? m.activar : true
		this.parametros = this.getParametros(m.parametros)
		this.forzantes = this.getForzantes(m.forzantes)
		this.estados = this.getParametros(m.estados)
		this.outputs = this.getForzantes(m.outputs)
		this.selected = (m.hasOwnProperty("selected")) ? m.selected : false
		this.out_id = m.out_id
		this.area_id = m.area_id
		this.tramo_id = m.tramo_id
		this.dt = m.dt
		this.t_offset = m.t_offset
		this.stats = m.stats

		this.sortArrays()
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.id + "," + this.nombre + "," + this.model_id + "," + this.activar + "," + this.selected + "," + this.out_id + "," + this.area_id + "," + this.tramo_id + "," + this.dt + "," + this.t_offset
	} 
	toCSVless() {
		return this.orden + "," + this.nombre
	}
	setArrayProperties() {
		this.parametros = getValoresAndOrder(this.parametros)
		this.estados = getValoresAndOrder(this.estados)
		return
	}
	sortArrays() {
		sortByOrden(this.parametros)
		sortByOrden(this.estados)
		sortByOrden(this.forzantes)
		sortByOrden(this.outputs)
	}
	getParametros(parametros) {
		if(!parametros) {
			return
		}
		var orden = 0
		return parametros.map(p=>{
			orden = orden + 1
			var parametro = {}
			if(typeof p == "number") {
				parametro.valor = p
				parametro.orden = orden
			} else {
				parametro.valor = p.valor
				parametro.orden = (p.orden) ? p.orden : orden
			}
			if(parseFloat(parametro.valor).toString() == "NaN") {
				throw(`invalid parametro: ${parametro.valor}`)
			}
			return new internal.parametro(parametro)
		})
	}
	getForzantes(forzantes) {
		if(!forzantes) {
			return
		}
		var orden = 0 
		return forzantes.map(f=>{
			orden = orden + 1
			var forzante = {}
			if(typeof f == "number") {
				forzante.series_id = f 
				forzante.series_table = "series"
				forzante.orden = orden
			} else {
				forzante.series_id = f.series_id
				forzante.series_table = f.series_table
				forzante.orden = (f.orden) ? f.orden : orden
			}
			if(parseInt(forzante.series_id).toString() == "NaN") {
				throw(`invalid forzante: ${forzante.series_id}`)
			}
			return new internal.forzante(forzante)
		})
	}
}

function getValoresAndOrder(array) {
	var uniques = []
	var ordenes = []
	if(!array || !Array.isArray(array) || array.length == 0) {
		return array
	}
	array.forEach(p=>{
		if(!ordenes.includes(p.orden)) {
			ordenes.push(p.orden)
			uniques.push(p)
		}
	})
	uniques.sort((a,b)=>{
		return a.orden - b.orden
	})
	return uniques.map(p=>p.valor)
}

function sortByOrden(array) {
	if(!array || !Array.isArray(array) || array.length == 0) {
		return
	}
	array.sort((a,b)=>{
		if (a.orden && b.orden) {
			return a.orden - b.orden
		} else {
			return -1
		}
	})
}

internal.parametro = class {
	constructor() {
		var m = arguments[0]
		this.orden = parseInt(m.orden)
		this.valor = parseFloat(m.valor)
		this.cal_id = m.cal_id
		this.id = m.id
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.orden + "," + this.valor
	} 
	toCSVless() {
		return this.orden + "," + this.valor
	} 
}

internal.parametroDeModelo = class {
	constructor() {
		var m = arguments[0]
		this.id = m.id
		this.model_id = m.model_id
		this.nombre = m.nombre
		this.lim_inf = m.lim_inf
		this.range_min = m.range_min
		this.range_max = m.range_max
		this.lim_sup = m.lim_sup
		this.orden = m.orden
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return [this.id,this.model_id,this.nombre,this.lim_inf,this.range_max,this.range_min,this.lim_sup,this.orden].join(",")
	} 
	toCSVless() {
		return this.orden + "," + this.nombre
	} 
}


internal.forzante = class {
	constructor() {
		var m = arguments[0]
		this.orden = parseInt(m.orden)
		this.series_id = parseInt(m.series_id)
		this.series_table = (m.series_table) ? (m.series_tabla == "series_areal") ? "series_areal" : "series" : "series" 
		this.cal_id = m.cal_id
		this.id = m.id
		this.model_id = m.model_id
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.orden + "," + this.series_id + "," + this.series_table
	} 
	toCSVless() {
		return this.orden + "," + this.series_id + "," + this.series_table
	} 
	async getSerie(pool) {
		var tipo = (this.series_table == "series") ? "puntual" : (this.series_table == "series_areal") ? "areal" : "puntual"
		try {
			const crud = new internal.CRUD(pool)
			this.serie = await crud.getSerie(tipo,this.series_id,undefined,undefined,{no_metadata:true})
		} catch(e) {
			console.error("crud: forzante: no se encontró serie")
		}
	}
}

internal.forzanteDeModelo = class {
	constructor() {
		var m = arguments[0]
		this.id = m.id
		this.model_id = m.model_id
		this.orden = parseInt(m.orden)
		this.var_id = parseInt(m.var_id)
		this.unit_id = parseInt(m.unit_id)
		this.nombre = m.nombre
		this.inst = m.inst
		this.tipo = m.tipo
		this.required = m.required
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return [this.id,this.model_id,this.orden,this.var_id,this.unit_id,this.nombre,this.inst,this.tipo,this.required].join(",")
	} 
	toCSVless() {
		return [this.model_id,this.orden,this.nombre].join(",")
	} 
}

internal.estado = class {
	constructor() {
		var m = arguments[0]
		this.orden = parseInt(m.orden)
		this.valor = parseFloat(m.valor)
		this.cal_id = m.cal_id
		this.id = m.id
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.orden + "," + this.valor
	} 
	toCSVless() {
		return this.orden + "," + this.valor
	} 
}

internal.estadoDeModelo = class {
	constructor() {
		var m = arguments[0]
		this.id = m.id
		this.model_id = parseInt(m.model_id)
		this.orden = parseInt(m.orden)
		this.nombre = m.nombre
		this.range_min = m.range_min
		this.range_max = m.range_max
		this.def_val = m.def_val
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return [this.id,this.model_id,this.orden,this.nombre,this.range_min,this.range_max,this.def_val].join(",")
	} 
	toCSVless() {
		return this.orden + "," + this.nombre
	} 
}


internal.output = class {
	constructor() {
		var m = arguments[0]
		this.orden = parseInt(m.orden)
		this.series_id = parseInt(m.series_id)
		this.series_table = (m.tipo) ? (m.tipo == 'series_areal') ? "series_areal" : "series" : "series"
		this.cal_id = m.cal_id
		this.id = m.id
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.orden + "," + this.series_id + "," + this.series_table
	} 
	toCSVless() {
		return this.orden + "," + this.series_id + "," + this.series_table
	}
	async getSerie(pool) {
		var tipo = (this.series_table == "series") ? "puntual" : (this.series_table == "series_areal") ? "areal" : "puntual"
		try {
			const crud = new internal.CRUD(pool)
			this.serie = await crud.getSerie(tipo,this.series_id,undefined,undefined,{no_metadata:true})
		} catch(e) {
			console.error("crud: forzante: no se encontró serie")
		}
	}
}

internal.corrida = class {
	constructor() {
		var m = arguments[0]
		this.id = m.id
		this.forecast_date = new Date(m.forecast_date)
		this.series = m.series.map(s=>new internal.SerieTemporalSim(s))
		this.cal_id = m.cal_id
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return "# cor_id=" + this.id + "\n# forecast_date=" + this.forecast_date + "\n\n\t" + this.series.map(s=>s.toCSV()).join("\n").replace(/\n/g,"\n\t")
	} 
	toCSVless() {
		return this.id + "," + this.forecast_date
	}
}

internal.SerieTemporalSim = class {
	constructor() {
		var m = arguments[0]
		this.series_table = m.series_table
		this.series_id = m.series_id
		this.pronosticos = m.pronosticos.map(p=>new internal.pronostico(p))
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return "# series_table=" + this.series_table + "\n# series_id=" + this.series_id + "\n\n" + this.pronosticos.map(p=>p.toCSV()).join("\n")
	} 
	toCSVless() {
		return this.id + "," + this.forecast_date
	}
}

internal.pronostico = class {
	constructor() {
		var m = arguments[0]
		this.id = m.id
		this.timestart = m.timestart
		this.timeend = m.timeend
		this.valor = m.valor
		this.qualifier = m.qualifier
	}
	toString() {
		return JSON.stringify(this)
	} 
	toCSV() {
		return this.id + "," + this.timestart.toISOString() + "," + this.timeend.toISOString() + "," + this.valor + "," + this.qualifier
	} 
	toCSVless() {
		return this.id + "," + this.timestart.toISOString() + "," + this.timeend.toISOString() + "," + this.valor + "," + this.qualifier
	}
}	

// accessors

internal.Accessor = class {
	constructor(type, parameters) {
		switch (type.toLowerCase()) {
			case "gfs":
				this.type = "gfs"
				this.object = new Accessors.gfs(parameters)
				this.get = this.object.getAndReadGFS
				this.testConnect = this.object.testConnect
				break
			default:
				this.type = null
				this.object = null
				break
		}
	}
	printObs(format="object") {
		if(!this.object) {
			console.error("gfs object not instantiated")
			return
		}
		if(!this.object.observaciones) {
			console.error("no observations found")
			return
		}
		switch(format.toLowerCase()) {
			case "csv":
				return this.object.observaciones.map(o=>o.toCSV()).join("\n")
				break
			case "txt":
				return this.object.observaciones.map(o=>o.toString()).join("\n")
				break
			case "json":
				return JSON.stringify(this.object.observaciones)
				break
			case "pretty":
			case "pretty_json":
			case "json_pretty":
				return  JSON.stringify(this.object.observaciones,null,2)
				break
			default:
				return this.object.observaciones
		}
	}
}

internal.engine = class {
	constructor(pool,config_,schemas_){
        this.pool = pool
		if(config_) {
			this.config = config_
			if(this.config.database) {
				this.dbConnectionString = "host=" + this.config.database.host + " user=" + this.config.database.user + " dbname=" + this.config.database.database + " password=" + this.config.database.password + " port=" + this.config.database.port
			}
		} else {
			this.config = config
		}
		this.models = {
			"Calibrado": internal.calibrado,
			"Output": internal.output,
			"Forzante": internal.forzante,
			"Parametro": internal.parametro,
			"Estado": internal.estado,
			"Serie": internal.serie,
			"Fuente": internal.fuente,
			"Unidad": internal.unidades,
			"Procedimiento": internal.procedimiento,
			"Estacion": internal.estacion,
			"Variable": internal.var
		}
		this.foreign_keys_alias = {
			"calibrados_id": "cal_id",
			"variables_id": "var_id"
		}
		this.schemas = (schemas_) ? schemas_ : schemas		
	}    

	
	build_read_query(model_name,filter,table_name,options) {
		if(!schemas.hasOwnProperty(model_name)) {
			throw("model name not found")
		}
		var model = schemas[model_name]
		if(!model) {
			throw("model not found")
		}
		var model_class = this.models[model_name]
		// console.log({model_name: model_name, model:model, model_class: model_class})
		if(model_class.build_read_query) {
			return model_class.build_read_query(model_name,filter,table_name,options)
		}
		if(!table_name) {
			table_name = model.table_name
		}
		var child_tables = {}
		var meta_tables = {}
		var selected_columns = Object.keys(model.properties).filter(key=>{
			if(model.properties[key].type == 'array' && model.properties[key].hasOwnProperty("items") && model.properties[key].items.hasOwnProperty("$ref")) {
				child_tables[key] = model.properties[key].items.$ref.split("/").pop()
				return false
			} else if (model.properties[key].hasOwnProperty("$ref") && model.properties[key].hasOwnProperty("foreign_key")) {
				meta_tables[key] = model.properties[key].$ref.split("/").pop()
				return false
			} else {
				return true
			}
		})
		var filter_string = utils.control_filter3(model,filter,table_name)
		if(!filter_string) {
			throw("Invalid filter")
		}
		const order_by_clause = ""
		if (options && options.order_by) {
			var order_by
			if(!Array.isArray(options.order_by)) {
				if(options.order_by.indexOf(",") >= 0) {
					order_by = options.order_by.split(",")
				} else {
					order_by = [options.order_by]
				}
			} else {
				order_by = options.order_by
			}
			for(var i in order_by) {
				if(selected_columns.indexOf(order_by[i]) == -1) {
					throw("invalid order_by option - invalid property")
				}
			}
			order_by_clause = ` ORDER BY ${order_by.map(key => utils.getFullKey(model, key, table_name)).join(",")}`
		}
		return {
			query: `SELECT ${selected_columns.map(key => utils.getFullKey(model, key, table_name)).join(", ")} FROM "${table_name}" WHERE 1=1 ${filter_string}${order_by_clause}`,
			child_tables: child_tables,
			meta_tables: meta_tables,
			table_name: table_name
		}
	}

	read(model_name,filter) {
		if(!this.models.hasOwnProperty(model_name)) {
			return Promise.reject("Invalid model_name")
		}
		try {
			var parent_query = this.build_read_query(model_name,filter)
		} catch(e) {
			return Promise.reject(e)
		}
		console.log(parent_query.query)
		return this.pool.query(parent_query.query)
		.then(result=>{
			// console.log("model_name: " + model_name)
			// console.log("typeof:" + typeof this.models[model_name])
			return result.rows.map(i=>new this.models[model_name](i))
		})
		.then(async parents=>{
			// console.log({child_tables:parent_query.child_tables})
			if(Object.keys(parent_query.child_tables).length) {
				for (var parent of parents) {
					for(var key in parent_query.child_tables) {
						var foreign_key = parent_query.table_name + "_id"
						foreign_key = (this.foreign_keys_alias[foreign_key]) ? this.foreign_keys_alias[foreign_key] : foreign_key
						var child_filter = {}
						child_filter[foreign_key] = parent.id
						var child_query  = this.build_read_query(parent_query.child_tables[key],child_filter)
						var query_result = await this.pool.query(child_query.query)
						// console.log({query_result:query_result.rows})
						parent[key] = query_result.rows.map(j=> new this.models[parent_query.child_tables[key]](j))
					}
				}
			}
			if(Object.keys(parent_query.meta_tables).length) {
				for (var parent of parents) {
					for(var key in parent_query.meta_tables) {
						var foreign_key = key + "s_id" // parent_query.table_name + "_id"
						foreign_key = (this.foreign_keys_alias[foreign_key]) ? this.foreign_keys_alias[foreign_key] : foreign_key
						var meta_filter = {
							"id": parent[foreign_key]
						}
						var meta_table_name = (parent.hasOwnProperty("series_table")) ? parent.series_table : undefined
						var meta_query  = this.build_read_query(parent_query.meta_tables[key],meta_filter,meta_table_name)
						console.log(meta_query.query)
						var query_result = await this.pool.query(meta_query.query)
						// console.log({query_result:query_result.rows})
						if(!query_result.rows.length) {
							console.error("meta element not found")
						} else {
							parent[key] = query_result.rows.map(j=> new this.models[parent_query.meta_tables[key]](j))
						}
					}
				}
			}
			return parents
		})
	}

	
}




internal.CRUD = class {
	constructor(pool,config){
        this.pool = pool
		if(config) {
			this.config = config
			if(config.database) {
				this.dbConnectionString = "host=" + config.database.host + " user=" + config.database.user + " dbname=" + config.database.database + " password=" + config.database.password + " port=" + config.database.port
			}
		}
	}    

    // red //
    
	upsertRed(red) {
		return red.getId(this.pool)
		.then(()=>{
			return this.pool.query("\
			INSERT INTO redes (id,tabla_id,nombre,public,public_his_plata)\
			VALUES ($1,$2,$3,$4,$5)\
			ON CONFLICT (id)\
			DO UPDATE SET nombre=$3, public=$4, public_his_plata=$5\
			RETURNING *",[red.id,red.tabla_id,red.nombre,red.public,red.public_his_plata])
		}).then(result=>{
			if(result.rows.length<=0) {
				console.error("Upsert failed")
				return
			}
			console.log("Upserted redes.id=" + result.rows[0].id)
			return new internal.red(result.rows[0])
		}).catch(e=>{
			console.error(e)
		})
	}
	
	upsertRedes(redes) {
		var promises = []
		for(var i = 0; i < redes.length; i++) {
			promises.push(this.upsertRed(new internal.red(redes[i])))
		}
		return Promise.all(promises)
	}
	
	deleteRed(id) {
		return this.pool.query("\
			DELETE FROM redes\
			WHERE id=$1\
			RETURNING *",[id]
		).then(result=>{
			if(result.rows.length<=0) {
				console.log("id not found")
				return 
			}
			console.log("Deleted redes.id=" + result.rows[0].id)
			return new internal.red(result.rows[0])
		}).catch(e=>{
			console.error(e)
		})
	}
	getRed(id) {
		return this.pool.query("\
		SELECT id,tabla_id,nombre,public,public_his_plata from redes \
		WHERE id=$1",[id])
		.then(result=>{
			if(result.rows.length<=0) {
				console.log("Red no encontrada")
				return
			}
			return result.rows[0]
			//~ const red = new internal.red(result.rows[0].tabla_id, result.rows[0].nombre, result.rows[0].public, result.rows[0].public_his_plata)
			//~ red.getId(this.pool)
			//~ .then(()=>{
				//~ return red
			//~ })
		})
	}
	getRedes(filter) {
		//~ console.log(filter)
		const valid_filters = {nombre:"regex_string", tabla_id:"string", public:"boolean", public_his_plata:"boolean", id:"integer"}
		var filter_string=""
		var control_flag=0
		Object.keys(valid_filters).forEach(key=>{
			if(filter[key]) {
				if(/[';]/.test(filter[key])) {
					console.error("Invalid filter value")
					control_flag++
				}
				if(valid_filters[key] == "regex_string") {
					var regex = filter[key].replace('\\','\\\\')
					filter_string += " AND " + key  + " ~* '" + filter[key] + "'"
				} else if(valid_filters[key] == "string") {
					filter_string += " AND "+ key + "='" + filter[key] + "'"
				} else if (valid_filters[key] == "boolean") {
					var boolean = (/^[yYtTvVsS1]/.test(filter[key])) ? "true" : "false"
					filter_string += " AND "+ key + "=" + boolean + ""
				} else {
					filter_string += " AND "+ key + "=" + filter[key] + ""
				}
			}
		})
		if(control_flag > 0) {
			return Promise.reject(new Error("invalid filter value"))
		}
		//~ console.log("filter_string:" + filter_string)
		return this.pool.query("SELECT * from redes WHERE 1=1 " + filter_string)
		.then(res=>{
			var redes = res.rows.map(red=>{
				return new internal.red(red)
			})
			return redes
		})
		.catch(e=>{
			console.error(e)
			return null
		})
	}
	
	
	// estacion //
	
	upsertEstacion(estacion,options={}) {
		return estacion.getEstacionId(this.pool)
		.then(()=>{
			console.log({id:estacion.id})
			var query = this.upsertEstacionQuery(estacion,options)
			return this.pool.query(query)
		}).then(result=>{
			if(result.rows.length<=0) {
				console.error("Upsert failed")
				return
			}
			console.log("Upserted estacion: " + JSON.stringify(result.rows[0],null,2))
			Object.keys(result.rows[0]).forEach(key=>{
				estacion[key] = result.rows[0][key]
			})
			if(estacion.nivel_alerta || estacion.nivel_evacuacion || estacion.nivel_aguas_bajas) {
				return this.upsertNivelesAlerta(estacion)
				.then(estacion=>{
					return new internal.estacion(estacion)
				})
			} else {
				return new internal.estacion(estacion)
			}
		}).catch(e=>{
			console.error(e)
			return
		})
	}

	upsertEstacionQuery(estacion,options={}) {
		var onconflictaction = (options.no_update) ? "DO NOTHING" : (options.no_update_id || !estacion.id) ? "DO UPDATE SET \
				nombre=excluded.nombre,\
				geom=excluded.geom,\
				distrito=excluded.distrito,\
				pais=excluded.pais,\
				rio=excluded.rio,\
				has_obs=excluded.has_obs,\
				tipo=excluded.tipo,\
				automatica=excluded.automatica,\
				habilitar=excluded.habilitar,\
				propietario=excluded.propietario,\
				abrev=excluded.abrev,\
				URL=excluded.URL,\
				localidad=excluded.localidad,\
				real=excluded.real"  : "DO UPDATE SET \
				nombre=excluded.nombre,\
				geom=excluded.geom,\
				distrito=excluded.distrito,\
				pais=excluded.pais,\
				rio=excluded.rio,\
				has_obs=excluded.has_obs,\
				tipo=excluded.tipo,\
				automatica=excluded.automatica,\
				habilitar=excluded.habilitar,\
				propietario=excluded.propietario,\
				abrev=excluded.abrev,\
				URL=excluded.URL,\
				localidad=excluded.localidad,\
				real=excluded.real,\
				cero_ign=excluded.cero_ign,\
				altitud=excluded.altitud,\
				unid=excluded.unid"
		var ins_query = (estacion.id) ? "\
		INSERT INTO estaciones (nombre, id_externo, geom, tabla,  distrito, pais, rio, has_obs, tipo, automatica, habilitar, propietario, abrev, URL, localidad, real, altitud, cero_ign, unid) \
		VALUES ($1, $2, st_setsrid(st_point($3, $4),4326), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)" : "\
		INSERT INTO estaciones (nombre, id_externo, geom, tabla,  distrito, pais, rio, has_obs, tipo, automatica, habilitar, propietario, abrev, URL, localidad, real, altitud, cero_ign) \
		VALUES ($1, $2, st_setsrid(st_point($3, $4),4326), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)" 
		var query = ins_query + " ON CONFLICT (tabla,id_externo) " + onconflictaction + "\
			RETURNING unid id, nombre, id_externo, st_astext(geom) geom, tabla, distrito, pais, rio, has_obs, tipo, automatica, habilitar, propietario, abrev, URL, localidad, real, altitud, cero_ign"
		var params = [estacion.nombre, estacion.id_externo, estacion.geom.coordinates[0], estacion.geom.coordinates[1], estacion.tabla, estacion.provincia, estacion.pais, estacion.rio, estacion.has_obs, estacion.tipo, estacion.automatica, estacion.habilitar, estacion.propietario, estacion.abreviatura, estacion.URL, estacion.localidad, estacion.real, estacion.altitud, estacion.cero_ign]
		if(estacion.id) {
			params.push(estacion.id)
		}
		return pasteIntoSQLQuery(query,params)
	}

	updateEstacion(estacion,options={}) {
		if(!estacion.id) {
			return Promise.reject("Falta id")
		}
		return this.pool.query("\
			UPDATE estaciones \
			SET nombre=coalesce($1,nombre), \
			id_externo=coalesce($2,id_externo), \
			geom=coalesce(st_setsrid(st_point($3, $4),4326),geom), \
			tabla=coalesce($5,tabla),\
			distrito=coalesce($6,distrito), \
			pais=coalesce($7,pais), \
			rio=coalesce($8, rio), \
			has_obs=coalesce($9,has_obs),\
			tipo=coalesce($10,tipo),\
			automatica=coalesce($11,automatica), \
			habilitar=coalesce($12, habilitar), \
			propietario=coalesce($13, propietario), \
			abrev=coalesce($14, abrev),\
			url=coalesce($15, url), \
			localidad=coalesce($16, localidad), \
			real=coalesce($17, real), \
			cero_ign=coalesce($19,cero_ign), \
			altitud=coalesce($20,altitud)\
			WHERE unid = $18\
			RETURNING unid id, nombre, st_astext(geom) geom, distrito, pais, rio, has_obs, tipo, automatica, habilitar, propietario, abrev, URL, localidad, real, cero_ign, altitud",[estacion.nombre, estacion.id_externo, (estacion.geom) ? estacion.geom.coordinates[0] : undefined, (estacion.geom) ? estacion.geom.coordinates[1] : undefined, estacion.tabla, estacion.provincia, estacion.pais, estacion.rio, estacion.has_obs, estacion.tipo, estacion.automatica, estacion.habilitar, estacion.propietario, estacion.abreviatura, estacion.URL, estacion.localidad, estacion.real, estacion.id, estacion.cero_ign, estacion.altitud])
		.then(result=>{
			if(result.rows.length<=0) {
				console.error("No se encontró la estación")
				throw("No se encontró la estación")
			}
			console.log("Updated estaciones.unid=" + result.rows[0].id)
			Object.keys(result.rows[0]).forEach(key=>{
				estacion[key] = result.rows[0][key]
			})
			if(estacion.nivel_alerta || estacion.nivel_evacuacion || estacion.nivel_aguas_bajas) {
				return this.upsertNivelesAlerta(estacion)
				.then(estacion=>{
					return new internal.estacion(estacion)
				})
			} else {
				return new internal.estacion(estacion)
			}
		})
	}
	
	upsertNivelesAlerta(estacion) {
		var promises = []
		var querystring = "INSERT INTO alturas_alerta (unid,nombre,valor,estado) \
		VALUES ($1,$2,$3,$4) \
		ON CONFLICT(unid,estado) DO UPDATE SET nombre=excluded.nombre, valor=excluded.valor \
		RETURNING *"
		if(parseFloat(estacion.nivel_alerta).toString() != "NaN") {
			promises.push(this.pool.query(querystring,[estacion.id,'alerta',estacion.nivel_alerta,'a'])
			.then(result=>{
				if(result && result.rows && result.rows[0]) {
					estacion.nivel_alerta = result.rows[0].valor
				}
				return
			}))
		}
		if(parseFloat(estacion.nivel_evacuacion).toString() != "NaN") {
			promises.push(this.pool.query(querystring,[estacion.id,'evacuación',estacion.nivel_evacuacion,'e'])
			.then(result=>{
				if(result && result.rows && result.rows[0]) {
					estacion.nivel_evacuacion = result.rows[0].valor
				}
				return
			}))
		}
		if(parseFloat(estacion.nivel_aguas_bajas).toString() != "NaN") {
			promises.push(this.pool.query(querystring,[estacion.id,'aguas_bajas',estacion.nivel_aguas_bajas,'b'])
			.then(result=>{
				if(result && result.rows && result.rows[0]) {
					estacion.nivel_aguas_bajas = result.rows[0].valor
				}
				return
			}))
		}
		return Promise.all(promises)
		.then(()=>{
			return estacion
		})
	}
	
	async upsertEstaciones(estaciones,options)  {
		// var upserted=[]
		var queries = []
		for(var i = 0; i < estaciones.length; i++) {
			// var estacion
			// try {
			// 	estacion = await this.upsertEstacion(new internal.estacion(estaciones[i]),options) //,options)
			// } catch (e) {
			// 	console.error(e)
			// }
			// if(estacion) {
			// 	upserted.push(estacion)
			// }
			queries.push(this.upsertEstacionQuery(estaciones[i],options))
		}
		// return upserted // Promise.all(promises)
		return this.executeQueryArray(queries,internal.estacion)
	}
			
	deleteEstacion(unid) {
		return this.pool.query("\
			DELETE FROM estaciones\
			WHERE unid=$1\
			RETURNING *",[unid]
		).then(result=>{
			if(result.rows.length<=0) {
				console.log("unid not found")
				return
			}
			console.log("Deleted estaciones.unid=" + result.rows[0].unid)
			return result.rows[0]
		}).catch(e=>{
			//~ console.error(e)
			throw(e)
		})
	}
	
	deleteEstaciones(filter) {
		if(filter.id) {
			filter.estacion_id = filter.id
			delete filter.id
		}
		return this.getEstaciones(filter)
		.then(estaciones=>{
			if(estaciones.length == 0) {
				return []
			}
			var ids = estaciones.map(e=>e.id)
			return this.pool.query("\
				DELETE FROM estaciones \
				WHERE unid IN (" + ids.join(",") + ")\
				RETURNING *,st_x(geom) geom_x,st_y(geom) geom_y")
			.then(result=>{
				if(result.rows.length == 0) {
					return []
				} 
				return result.rows.map(row=>{
					const geometry = new internal.geometry("Point", [row.geom_x, row.geom_y])
					const estacion = new internal.estacion(row.nombre,row.id_externo,geometry,row.tabla,row.distrito,row.pais,row.rio,row.has_obs,row.tipo,row.automatica,row.habilitar,row.propietario,row.abrev,row.URL,row.localidad,row.real,undefined,undefined,undefined,row.altitud,row.public,row.cero_ign)
					estacion.id = row.unid
					return estacion
				})
			})
		})
	}

	getEstacion(id,isPublic) {
		return this.pool.query("\
		SELECT estaciones.nombre, estaciones.id_externo, st_x(estaciones.geom) geom_x, st_y(estaciones.geom) geom_y, estaciones.tabla,  estaciones.distrito, estaciones.pais, estaciones.rio, estaciones.has_obs, estaciones.tipo, estaciones.automatica, estaciones.habilitar, estaciones.propietario, estaciones.abrev, estaciones.URL, estaciones.localidad, estaciones.real, estaciones.id, estaciones.unid, nivel_alerta.valor nivel_alerta, nivel_evacuacion.valor nivel_evacuacion, nivel_aguas_bajas.valor nivel_aguas_bajas, estaciones.cero_ign, estaciones.altitud, redes.public\
		FROM estaciones\
		LEFT OUTER JOIN redes ON (estaciones.tabla = redes.tabla_id) \
		LEFT OUTER JOIN alturas_alerta nivel_alerta ON (estaciones.unid = nivel_alerta.unid AND nivel_alerta.estado='a') \
		LEFT OUTER JOIN alturas_alerta nivel_evacuacion ON (estaciones.unid = nivel_evacuacion.unid AND nivel_evacuacion.estado='e') \
		LEFT OUTER JOIN alturas_alerta nivel_aguas_bajas ON (estaciones.unid = nivel_aguas_bajas.unid AND nivel_aguas_bajas.estado='b') \
		WHERE estaciones.unid=$1",[id])
		.then(result=>{
			if(result.rows.length<=0) {
				console.log("estacion no encontrada")
				return
			}
			if(isPublic) {
				if(!result.rows[0].public) {
					console.log("estacion no es public")
					throw("el usuario no posee autorización para acceder a esta estación")
				}
			}
			const geometry = new internal.geometry("Point", [result.rows[0].geom_x, result.rows[0].geom_y])
			const estacion = new internal.estacion(result.rows[0].nombre,result.rows[0].id_externo,geometry,result.rows[0].tabla,result.rows[0].distrito,result.rows[0].pais,result.rows[0].rio,result.rows[0].has_obs,result.rows[0].tipo,result.rows[0].automatica,result.rows[0].habilitar,result.rows[0].propietario,result.rows[0].abrev,result.rows[0].URL,result.rows[0].localidad,result.rows[0].real,result.rows[0].nivel_alerta,result.rows[0].nivel_evacuacion,result.rows[0].nivel_aguas_bajas,result.rows[0].altitud,result.rows[0].public,result.rows[0].cero_ign)
			estacion.id =  result.rows[0].unid
			return estacion
		})
	}
	
	getEstaciones(filter) {
		if(filter.estacion_id) {
			filter.unid = filter.estacion_id
		}
		const estaciones_filter = control_filter({nombre:"regex_string", unid:"numeric", id:"numeric", id_externo: "string", distrito: "regex_string", pais: "regex_string", has_obs: "boolean", real: "boolean", habilitar: "boolean", tipo: "string", has_prono: "boolean", rio: "regex_string", geom: "geometry", propietario: "regex_string", automatica: "boolean", ubicacion: "regex_string", localidad: "regex_string", tipo_2: "string",tabla: "string", abrev: "regex_string"}, filter, "estaciones")
		if(!estaciones_filter) {
			return Promise.reject("invalid filter")
		}
		const redes_filter = control_filter({fuentes_id: "integer", tabla_id: "string", public: "boolean_only_true", public_his_plata: "boolean"},filter, "redes")
		if(!redes_filter) {
			return Promise.reject("invalid filter")
		}
		var filter_string= estaciones_filter + " " + redes_filter
		//~ console.log("filter_string:" + filter_string)
		return this.pool.query("SELECT estaciones.nombre, estaciones.id_externo, st_x(estaciones.geom) geom_x, st_y(estaciones.geom) geom_y, estaciones.tabla,  estaciones.distrito, estaciones.pais, estaciones.rio, estaciones.has_obs, estaciones.tipo, estaciones.automatica, estaciones.habilitar, estaciones.propietario, estaciones.abrev, estaciones.URL, estaciones.localidad, estaciones.real, estaciones.id, estaciones.unid, nivel_alerta.valor nivel_alerta, nivel_evacuacion.valor nivel_evacuacion, nivel_aguas_bajas.valor nivel_aguas_bajas, cero_ign, redes.public, altitud\
		FROM estaciones\
		JOIN (select id fuentes_id, tabla_id, public, public_his_plata FROM redes) redes ON (estaciones.tabla=redes.tabla_id)\
		LEFT OUTER JOIN alturas_alerta nivel_alerta ON (estaciones.unid = nivel_alerta.unid AND nivel_alerta.estado='a') \
		LEFT OUTER JOIN alturas_alerta nivel_evacuacion ON (estaciones.unid = nivel_evacuacion.unid AND nivel_evacuacion.estado='e') \
		LEFT OUTER JOIN alturas_alerta nivel_aguas_bajas ON (estaciones.unid = nivel_aguas_bajas.unid AND nivel_aguas_bajas.estado='b') \
		WHERE 1=1 " + filter_string)
		.then(res=>{
			//~ console.log(res)
			var estaciones = res.rows.map(row=>{
				const geometry = new internal.geometry("Point", [row.geom_x, row.geom_y])
				const estacion = new internal.estacion(row.nombre,row.id_externo,geometry,row.tabla,row.distrito,row.pais,row.rio,row.has_obs,row.tipo,row.automatica,row.habilitar,row.propietario,row.abrev,row.URL,row.localidad,row.real,row.nivel_alerta,row.nivel_evacuacion,row.nivel_aguas_bajas,row.altitud,row.public,row.cero_ign)
				estacion.id = row.unid
				return estacion
			})
			return estaciones
		})
		.catch(e=>{
			console.error(e)
			return null
		})
		
		
		
		
	}
			
			
	// AREA //
	
	upsertArea(area) {
		return new Promise((resolve,reject)=>{
			if(area.id) {
				resolve(area)
			} else {
				resolve(area.getId(this.pool))
			}
		})
		.then(()=>{
			if(area.geom && area.geom.type && area.geom.type == "MultiPolygon") {
				area.geom = new internal.geometry({
					type: "Polygon",
					coordinates: area.geom.coordinates[0]
				})
			}
			return this.pool.query(this.upsertAreaQuery(area))
		}).then(result=>{
			if(result.rows.length<=0) {
				console.error("Upsert failed")
				return
			}
			console.log("Upserted areas_pluvio.unid=" + result.rows[0].id)
			//~ console.log(result.rows[0])
			return new internal.area(result.rows[0])
		}).catch(e=>{
			console.error(e)
			return
		})
	}
	
	upsertAreaQuery (area)  {
		var query = ""
		var params = []
		if(area.exutorio) {
			query = "\
			INSERT INTO areas_pluvio (unid, nombre, geom, exutorio, exutorio_id) \
			VALUES ($1, $2, ST_GeomFromText($3,4326), ST_GeomFromText($4,4326), $5)\
			ON CONFLICT (unid) DO UPDATE SET \
				nombre=excluded.nombre,\
				geom=excluded.geom,\
				exutorio=excluded.exutorio,\
				exutorio_id=excluded.exutorio_id\
			RETURNING unid AS id,nombre,st_astext(geom) AS geom, st_astext(exutorio) AS exutorio, exutorio_id"
			params = [area.id,area.nombre,area.geom.toString(),area.exutorio.toString(),area.exutorio_id]
		} else {
			query = "\
			INSERT INTO areas_pluvio (unid, nombre, geom, exutorio_id) \
			VALUES ($1, $2, ST_GeomFromText($3,4326), $4)\
			ON CONFLICT (unid) DO UPDATE SET \
				nombre=excluded.nombre,\
				geom=excluded.geom,\
				exutorio_id=excluded.exutorio_id\
			RETURNING unid AS id,nombre,st_astext(geom) AS geom, st_astext(exutorio) AS exutorio, exutorio_id"
			params = [area.id,area.nombre,area.geom.toString(),area.exutorio_id]
		}
		return pasteIntoSQLQuery(query,params)
	}
	//~ upsertAreas(areas) {
		//~ var promises=[]
		//~ for(var i = 0; i < areas.length; i++) {
			//~ promises.push(this.upsertArea(new internal.area(areas[i])))
		//~ }
		//~ return Promise.all(promises)
	//~ }
	
	upsertAreas(areas) {
		return Promise.all(areas.map(area=>{
			return this.upsertArea(area)
		}).filter(a=>a))
	}
			
	deleteArea(unid) {
		return this.pool.query("\
			DELETE FROM areas_pluvio\
			WHERE unid=$1\
			RETURNING *",[unid]
		).then(result=>{
			if(result.rows.length<=0) {
				console.log("unid not found")
				return
			}
			console.log("Deleted areas_pluvio.unid=" + result.rows[0].unid)
			result.rows[0].id = result.rows[0].unid
			delete result.rows[0].unid
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
		})
	}

	getArea(id,options={}) {
		var query = (options.no_geom) ? "\
		SELECT areas_pluvio.unid AS id, areas_pluvio.nombre, st_astext(areas_pluvio.exutorio) AS exutorio\
		FROM areas_pluvio\
		WHERE unid=$1" : "\
		SELECT areas_pluvio.unid AS id, areas_pluvio.nombre, st_astext(ST_ForcePolygonCCW(areas_pluvio.geom)) AS geom, st_astext(areas_pluvio.exutorio) AS exutorio\
		FROM areas_pluvio\
		WHERE unid=$1"
		return this.pool.query(query,[id])
		.then(result=>{
			if(result.rows.length<=0) {
				console.error("area no encontrada")
				return
			}
			//~ var geom_parsed = JSON.parse(result.rows[0].geom)
			//~ const geom = new internal.geometry(geom_parsed.type, geom_parsed.coordinates)
			//~ var exut_parsed = JSON.parse(result.rows[0].exutorio)
			//~ const exutorio = new internal.geometry(exut_parsed.type, exut_parsed.coordinates)
			//~ const area = new internal.area(result.rows[0].nombre,geom, exutorio)
			//~ area.id = result.rows[0].unid
			//~ return area
			if(options.no_geom) {
				if(result.rows[0].exutorio) {
					result.rows[0].exutorio = new internal.geometry(result.rows[0].exutorio)
				}
				return result.rows[0]
			} else {
				return new internal.area(result.rows[0])
			}
		})
	}
	
	getAreas(filter,options) {
		if(filter.id) {
			filter.unid = filter.id
			delete filter.id
		}
		const valid_filters = {nombre:"regex_string", unid:"numeric", geom: "geometry", exutorio: "geometry", exutorio_id: "numeric"}
		var filter_string=""
		var control_flag=0
		Object.keys(valid_filters).forEach(key=>{
			if(filter[key]) {
				if(/[';]/.test(filter[key])) {
					console.error("Invalid filter value")
					control_flag++
				}
				if(valid_filters[key] == "regex_string") {
					var regex = filter[key].replace('\\','\\\\')
					filter_string += " AND " + key  + " ~* '" + filter[key] + "'"
				} else if(valid_filters[key] == "string") {
					filter_string += " AND "+ key + "='" + filter[key] + "'"
				} else if (valid_filters[key] == "boolean") {
					var boolean = (/^[yYtTvVsS1]/.test(filter[key])) ? "true" : "false"
					filter_string += " AND "+ key + "=" + boolean + ""
				} else if (valid_filters[key] == "geometry") {
					if(! filter[key] instanceof internal.geometry) {
						console.error("Invalid geometry object")
						control_flag++
					}
					filter_string += "  AND ST_Distance(" + key + "," + filter[key].toSQL() + ") < 0.001" 
				} else {
					filter_string += " AND "+ key + "=" + filter[key] + ""
				}
			}
		})
		if(control_flag > 0) {
			return Promise.reject(new Error("invalid filter value"))
		}
		//~ console.log("filter_string:" + filter_string)
		if(options && options.no_geom) {
			return this.pool.query("SELECT areas_pluvio.unid id, areas_pluvio.nombre, st_astext(areas_pluvio.exutorio) exutorio, areas_pluvio.exutorio_id\
			 FROM areas_pluvio \
			 WHERE geom IS NOT NULL " + filter_string)
			.then(res=>{
				return res.rows.map(r=>{
					if(r.exutorio) {
						r.exutorio = new internal.geometry(r.exutorio)
					}
					return r
				})
			})
		} else {
			return this.pool.query("SELECT areas_pluvio.unid id, areas_pluvio.nombre, st_astext(areas_pluvio.geom) geom, st_astext(areas_pluvio.exutorio) exutorio, areas_pluvio.exutorio_id\
			 FROM areas_pluvio \
			 WHERE geom IS NOT NULL " + filter_string)
			.then(res=>{
				//~ console.log(res)
				var areas = res.rows.map(row=>{
					//~ const geom = new internal.geometry(row.geom)
					//~ const exutorio = new internal.geometry(row.exutorio)
					//~ const area = new internal.area(row.nombre,geom, exutorio)
					//~ area.id = row.unid
					return new internal.area(row) 
				})
				return areas
			})
			.catch(e=>{
				console.error(e)
				return null
			})
		}
	}
	
	// ESCENA //
	
	getEscena(id,options) {
		if(options && options.no_geom) {
			return this.pool.query("\
			SELECT escenas.id, escenas.nombre\
			FROM escenas\
			WHERE id=$1",[id])
			.then(result=>{
				if(result.rows.length<=0) {
					console.log("escena no encontrada")
					return
				}
				return result.rows[0]
			})
		} else {
			return this.pool.query("\
			SELECT escenas.id, escenas.nombre, st_astext(escenas.geom) AS geom\
			FROM escenas\
			WHERE id=$1",[id])
			.then(result=>{
				if(result.rows.length<=0) {
					console.log("escena no encontrada")
					return
				}
				//~ var geom_parsed = JSON.parse(result.rows[0].geom)
				//~ const geom = new internal.geometry(geom_parsed.type, geom_parsed.coordinates)
				//~ var exut_parsed = JSON.parse(result.rows[0].exutorio)
				//~ const exutorio = new internal.geometry(exut_parsed.type, exut_parsed.coordinates)
				//~ const area = new internal.area(result.rows[0].nombre,geom, exutorio)
				//~ area.id = result.rows[0].unid
				//~ return area
				return new internal.escena(result.rows[0])
			})
		}
	}
	
	getEscenas(filter,options) {
		const escenas_filter = control_filter({nombre:"regex_string", id:"numeric", geom: "geometry"}, filter, "escenas")
		if(!escenas_filter) {
			return Promise.reject("invalid filter")
		}
		var filter_string= escenas_filter
		console.log({filter_string:filter_string})
		if(options && options.no_geom) {
			return this.pool.query("SELECT escenas.id, escenas.nombre\
			FROM escenas\
			WHERE 1=1 " + filter_string)
			.then(res=>{
				return res.rows
			})
		} else {
			return this.pool.query("SELECT escenas.id, escenas.nombre, st_asgeojson(escenas.geom)::json AS geom\
			FROM escenas\
			WHERE 1=1 " + filter_string)
			.then(res=>{
				//~ console.log(res)
				var escenas = res.rows.map(row=>{
					//~ console.log({row:row})
					//~ const geometry = new internal.geometry("Polygon", row.geom.coordinates)
					const escena = new internal.escena({id:row.id,nombre:row.nombre,geom:row.geom})
					return escena
				})
				return escenas
			})
		}
		//~ .catch(e=>{
			//~ console.error(e)
			//~ return null
		//~ })
	}
	
	upsertEscena(escena) {
		//~ console.log("upsertEscena")
		return new Promise((resolve,reject)=>{
			if(escena.id) {
				resolve(escena)
			} else {
				resolve(escena.getId(this.pool))
			}
		})
		.then(()=>{
			var query = "\
			INSERT INTO escenas (id, nombre,geom) \
			VALUES ($1, $2, st_geomfromtext($3,4326))\
			ON CONFLICT (id) DO UPDATE SET \
				nombre=excluded.nombre,\
				geom=excluded.geom\
			RETURNING *"
			//~ console.log(pasteIntoSQLQuery(query,[escena.id,escena.nombre,escena.geom.toString()]))
			return this.pool.query(query,[escena.id,escena.nombre,escena.geom.toString()])
		}).then(result=>{
			if(result.rows.length<=0) {
				console.error("Upsert failed")
				return
			}
			console.log("Upserted escena.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
			return
		})
	}
	
	upsertEscenas(escenas) {
		return Promise.all(escenas.map(escena=>{
			return this.upsertEscena(escena)
		}).filter(e=>e))
	}
	
	deleteEscena(id) {
		return this.pool.query("\
			DELETE FROM escenas\
			WHERE id=$1\
			RETURNING *",[id]
		).then(result=>{
			if(result.rows.length<=0) {
				console.log("id not found")
				return
			}
			console.log("Deleted escenas.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
		})
	}

			
	deleteEscenas(id) {
		return this.pool.query("\
			DELETE FROM escenas\
			WHERE id=$1\
			RETURNING *",[id]
		).then(result=>{
			if(result.rows.length<=0) {
				console.log("id not found")
				return
			}
			console.log("Deleted escenas.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
		})
	}


	// VAR //
	
	upsertVar(variable) {
		return variable.getId(this.pool)
		.then(()=>{
			return this.interval2epoch(variable.timeSupport)
		}).then(timeSupport=>{
			//~ var timeSupport = (variable.timeSupport) ? (typeof variable.timeSupport == 'object') ? this.interval2epoch(variable.timeSupport) : variable.timeSupport : variable.timeSupport
			return this.pool.query(this.upsertVarQuery(variable))
		}).then(result=>{
			if(result.rows.length<=0) {
				console.error("Upsert failed")
				return
			}
			console.log("Upserted var.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
			return
		})
	}

	upsertVarQuery(variable) {
		var query = "\
		INSERT INTO var (id, var,nombre,abrev,type,datatype,valuetype,\"GeneralCategory\",\"VariableName\",\"SampleMedium\",def_unit_id,\"timeSupport\") \
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)\
		ON CONFLICT (var,\"GeneralCategory\") DO UPDATE SET \
			var=excluded.var,\
			nombre=excluded.nombre,\
			abrev=excluded.abrev,\
			type=excluded.type,\
			datatype=excluded.datatype,\
			valuetype=excluded.valuetype,\
			\"GeneralCategory\"=excluded.\"GeneralCategory\",\
			\"VariableName\"=excluded.\"VariableName\",\
			\"SampleMedium\"=excluded.\"SampleMedium\",\
			def_unit_id=excluded.def_unit_id,\
			\"timeSupport\"=excluded.\"timeSupport\"\
		RETURNING *"
		var params = [variable.id, variable["var"],variable.nombre, variable.abrev, variable.type, variable.datatype, variable.valuetype, variable.GeneralCategory, variable.VariableName, variable.SampleMedium, variable.def_unit_id, timeSteps.interval2string(variable.timeSupport)]
		return pasteIntoSQLQuery(query,params)
	}
	
	upsertVars(variables) {
		return Promise.all(variables.map(variable=>{
			return this.upsertVar(variable)
		}))
	}
			
	deleteVar(id) {
		return this.pool.query("\
			DELETE FROM var\
			WHERE id=$1\
			RETURNING *",[id]
		).then(result=>{
			if(result.rows.length<=0) {
				console.log("id not found")
				return
			}
			console.log("Deleted var.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
		})
	}

	getVar(id) {
		return this.pool.query("\
		SELECT id, \
		       var,\
		       nombre,\
		       abrev,\
		       type,\
		       datatype,\
		       valuetype,\
		       \"GeneralCategory\",\
		       \"VariableName\",\
		       \"SampleMedium\",\
		       def_unit_id,\
		       \"timeSupport\",\
		       def_hora_corte\
		FROM var\
		WHERE id=$1",[id])
		.then(result=>{
			if(result.rows.length<=0) {
				console.log("variable no encontrada")
				return
			}
			const variable = new internal["var"](result.rows[0]["var"],result.rows[0].nombre,result.rows[0].abrev,result.rows[0].type,result.rows[0].datatype,result.rows[0].valuetype,result.rows[0].GeneralCategory,result.rows[0].VariableName,result.rows[0].SampleMedium,result.rows[0].def_unit_id,result.rows[0].timeSupport,result.rows[0].def_hora_corte)
			variable.id = result.rows[0].id
			return variable
		})
	}
	
	getVars(filter) {
		const valid_filters = {id: "numeric", "var": "string",nombre: "regex_string",abrev: "regex_string",type: "string", datatype: "string", valuetype: "string", GeneralCategory: "string", VariableName: "string",SampleMedium: "string",def_unit_id: "numeric",timeSupport: "string", def_hora_corte: "string"}
		var filter_string = control_filter(valid_filters,filter)
		if(!filter_string) {
			return Promise.reject(new Error("invalid filter value"))
		}
		//~ console.log("filter_string:" + filter_string)
		return this.pool.query("SELECT *\
		 FROM var \
		 WHERE 1=1 " + filter_string)
		.then(res=>{
			//~ console.log(res)
			var variables = res.rows.map(row=>{
				const variable = new internal["var"](row["var"],row.nombre,row.abrev,row.type,row.datatype,row.valuetype,row.GeneralCategory,row.VariableName,row.SampleMedium,row.def_unit_id,row.timeSupport,row.def_hora_corte)
				variable.id = row.id
				return variable
				console.log(variable.toString())
			})
			return variables
		})
		.catch(e=>{
			console.error(e)
			return null
		})
	}
	
	// PROCEDIMIENTO //
	
	upsertProcedimiento(procedimiento) {
		return new Promise((resolve, reject) => {
			if(!procedimiento.id) {
				resolve(procedimiento.getId(this.pool))
			} else {
				resolve(procedimiento)
			}
		})
		.then(()=>{
			return this.pool.query(this.upsertProcedimientoQuery(procedimiento))
		}).then(result=>{
			if(result.rows.length<=0) {
				console.error("Upsert failed")
				return
			}
			console.log("Upserted procedimiento.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
			return
		})
	}
	
	upsertProcedimientoQuery(procedimiento) {
		var query = "\
			INSERT INTO procedimiento (id,nombre,abrev,descripcion) \
			VALUES ($1, $2, $3, $4)\
			ON CONFLICT (id) DO UPDATE SET \
				nombre=excluded.nombre,\
				abrev=excluded.abrev,\
				descripcion=excluded.descripcion\
			RETURNING *"
		var params = [procedimiento.id, procedimiento.nombre, procedimiento.abrev, procedimiento.descripcion]
		return pasteIntoSQLQuery(query,params)
	}

	upsertProcedimientos(procedimientos) {
		return Promise.all(procedimientos.map(proc=>{
			return this.upsertProcedimiento(proc)
		}))
	}
			
	deleteProcedimiento(id) {
		return this.pool.query("\
			DELETE FROM procedimiento\
			WHERE id=$1\
			RETURNING *",[id]
		).then(result=>{
			if(result.rows.length<=0) {
				console.log("id not found")
				return
			}
			console.log("Deleted procedimiento.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
		})
	}

	getProcedimiento(id) {
		return this.pool.query("\
		SELECT id, nombre, abrev, descripcion\
		FROM procedimiento\
		WHERE id=$1",[id])
		.then(result=>{
			if(result.rows.length<=0) {
				console.log("procedimiento no encontrado")
				return
			}
			const procedimiento = new internal.procedimiento(result.rows[0].nombre,result.rows[0].abrev,result.rows[0].descripcion)
			procedimiento.id = result.rows[0].id
			return procedimiento
		})
	}
	
	getProcedimientos(filter) {
		const valid_filters = {id: "numeric", nombre: "regex_string",abrev: "regex_string",descripcion: "regex_string"}
		var filter_string = control_filter(valid_filters,filter)
		if(!filter_string) {
			return Promise.reject(new Error("invalid filter value"))
		}
		//~ console.log("filter_string:" + filter_string)
		return this.pool.query("SELECT *\
		 FROM procedimiento \
		 WHERE 1=1 " + filter_string)
		.then(res=>{
			//~ console.log(res)
			var procedimientos = res.rows.map(row=>{
				const procedimiento = new internal.procedimiento(row.nombre,row.abrev,row.descripcion)
				procedimiento.id = row.id
				return procedimiento
				console.log(procedimiento.toString())
			})
			return procedimientos
		})
		.catch(e=>{
			console.error(e)
			return null
		})
	}
	
	// UNIDADES //
	
	upsertUnidades(unidades) {
		return new Promise((resolve,reject)=>{
			if(!unidades.id) {
				resolve(unidades.getId(this.pool))
			} else {
				resolve(unidades)
			}
		})
		.then(()=>{
			return this.pool.query(this.upsertUnidadesQuery(unidades))
		}).then(result=>{
			if(result.rows.length<=0) {
				console.error("Upsert failed")
				return
			}
			console.log("Upserted unidades.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
			return
		})
	}

	upsertUnidadesQuery(unidades) {
		var query = "\
		INSERT INTO unidades (id,nombre, abrev,  \"UnitsID\", \"UnitsType\") \
		VALUES ($1, $2, $3, $4, $5)\
		ON CONFLICT (id) DO UPDATE SET \
			nombre=excluded.nombre,\
			abrev=excluded.abrev,\
			\"UnitsID\"=excluded.\"UnitsID\",\
			\"UnitsType\"=excluded.\"UnitsType\"\
		RETURNING *"
		var params =[unidades.id, unidades.nombre, unidades.abrev, unidades.UnitsID, unidades.UnitsType]
		return pasteIntoSQLQuery(query,params)
	}

	upsertUnidadeses(unidadeses) {
		return Promise.all(unidadeses.map(unit=>{
			return this.upsertUnidades(unit)
		}).filter(u=>u))
	}
			
	deleteUnidades(id) {
		return this.pool.query("\
			DELETE FROM unidades\
			WHERE id=$1\
			RETURNING *",[id]
		).then(result=>{
			if(result.rows.length<=0) {
				console.log("id not found")
				return
			}
			console.log("Deleted unidades.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
		})
	}

	getUnidad(id) {
		return this.pool.query("\
		SELECT id, nombre, abrev,  \"UnitsID\", \"UnitsType\"\
		FROM unidades\
		WHERE id=$1",[id])
		.then(result=>{
			if(result.rows.length<=0) {
				console.log("unidades no encontrado")
				return
			}
			const unidades = new internal.unidades(result.rows[0].nombre,result.rows[0].abrev,result.rows[0].UnitsID,result.rows[0].UnitsType)
			unidades.id = result.rows[0].id
			return unidades
		})
	}
	
	getUnidades(filter) {
		const valid_filters = {id: "numeric", nombre: "regex_string",abrev: "regex_string",UnitsID: "numeric", UnitsType: "string"}
		var filter_string = control_filter(valid_filters,filter)
		if(!filter_string) {
			return Promise.reject(new Error("invalid filter value"))
		}
		console.log("filter_string:" + filter_string)
		return this.pool.query("SELECT *\
		 FROM unidades \
		 WHERE 1=1 " + filter_string)
		.then(res=>{
			//~ console.log(res)
			var unidades = res.rows.map(row=>{
				const unidad = new internal.unidades(row.nombre,row.abrev,row.UnitsID,row.UnitsType)
				unidad.id = row.id
				return unidad
				console.log(unidad.toString())
			})
			return unidades
		})
		.catch(e=>{
			console.error(e)
			return null
		})
	}
	
	// FUENTE //
			
	upsertFuente(fuente) {
		return fuente.getId(this.pool)
		.then(()=>{
			var query = this.upsertFuenteQuery(fuente)
			// if(config.verbose) {
			// 	console.log("crud.upsertFuente: " + query)
			// }
			return this.pool.query(query)
		}).then(result=>{
			if(result.rows.length<=0) {
				console.error("Upsert failed")
				return
			}
			console.log("Upserted fuentes.id=" + result.rows[0].id)
			return result.rows[0]
		}).catch(e=>{
			console.error(e)
			return
		})
	}

	upsertFuenteQuery(fuente) {
		var query = "\
			INSERT INTO fuentes (id, nombre, data_table, data_column, tipo, def_proc_id, def_dt, hora_corte, def_unit_id, def_var_id, fd_column, mad_table, scale_factor, data_offset, def_pixel_height, def_pixel_width, def_srid, def_extent, date_column, def_pixeltype, abstract, source) \
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, st_geomfromtext($18), $19, $20, $21, $22)\
			ON CONFLICT (id) DO UPDATE SET \
				id=excluded.id, \
				nombre=excluded.nombre, \
				data_table=excluded.data_table,\
				data_column=excluded.data_column,\
				tipo=excluded.tipo,\
				def_proc_id=excluded.def_proc_id,\
				def_dt=excluded.def_dt,\
				hora_corte=excluded.hora_corte,\
				def_unit_id=excluded.def_unit_id,\
				def_var_id=excluded.def_var_id,\
				fd_column=excluded.fd_column,\
				mad_table=excluded.mad_table,\
				scale_factor=excluded.scale_factor,\
				data_offset=excluded.data_offset,\
				def_pixel_height=excluded.def_pixel_height,\
				def_pixel_width=excluded.def_pixel_width,\
				def_srid=excluded.def_srid,\
				def_extent=excluded.def_extent,\
				date_column=excluded.date_column,\
				def_pixeltype=excluded.def_pixeltype,\
				abstract=excluded.abstract,\
				source=excluded.source\
			RETURNING *"
		var params = [fuente.id, fuente.nombre, fuente.data_table, fuente.data_column, fuente.tipo, fuente.def_proc_id, fuente.def_dt, fuente.hora_corte, fuente.def_unit_id, fuente.def_var_id, fuente.fd_column, fuente.mad_table, fuente.scale_factor, fuente.data_offset, fuente.def_pixel_height, fuente.def_pixel_width, fuente.def_srid, (fuente.def_extent) ? fuente.def_extent.toString() : null, fuente.date_column, fuente.def_pixeltype, fuente.abstract, fuente.source]
		return pasteIntoSQLQuery(query,params)
	}
	
	upsertFuentes(fuentes) {
		return Promise.all(fuentes.map(f=>{
			return this.upsertFuente(new internal.fuente(f))
		}))
		.then(result=>{
			if(result) {
				return result.filter(f=>f)
			} else {
				return
			}
		})
	}
			
	deleteFuente(id) {
		return this.pool.query("\
			DELETE FROM fuentes\
			WHERE id=$1\
			RETURNING *",[id]
		).then(result=>{
			if(result.rows.length<=0) {
				console.log("id not found")
				return
			}
			console.log("Deleted fuentes.id=" + result.rows[0].id)
		}).catch(e=>{
			console.error(e)
		})
	}

	getFuente(id,isPublic) {
		return this.pool.query("\
		SELECT id, nombre, data_table, data_column, tipo, def_proc_id, def_dt, hora_corte, def_unit_id, def_var_id, fd_column, mad_table, scale_factor, data_offset, def_pixel_height, def_pixel_width, def_srid, st_asgeojson(def_extent)::json def_extent, date_column, def_pixeltype, abstract, source,public\
		FROM fuentes\
		WHERE id=$1",[id])
		.then(result=>{
			if(result.rows.length<=0) {
				console.log("fuentes no encontrado")
				return
			}
			if (isPublic) {
				if (!result.rows[0].public) {
					throw("El usuario no posee autorización para acceder a esta fuente")
				}
			}
			// nombre, data_table, data_column, tipo, def_proc_id, def_dt, hora_corte, def_unit_id, def_var_id, fd_column, mad_table, scale_factor, data_offset, def_pixel_height, def_pixel_width, def_srid, def_extent, date_column, def_pixeltype, abstract, source
			var row = result.rows[0]
			const fuente = new internal.fuente(row) //(row.nombre, row.data_table, row.data_column, row.tipo, row.def_proc_id, row.def_dt, row.hora_corte, row.def_unit_id, row.def_var_id, row.fd_column, row.mad_table, row.scale_factor, row.data_offset, row.def_pixel_height, row.def_pixel_width, row.def_srid, new internal.geometry(def_extent.type, def_extent.coordinates), row.date_column, row.def_pixeltype, row.abstract, row.source)
			fuente.id = row.id
			return fuente
		})
	}
	
	getFuentes(filter) {
		if(filter && filter.geom) {
			filter.def_extent = filter.geom
		}
		const valid_filters = {id: "numeric", nombre: "regex_string", data_table: "string", data_column: "string", tipo: "string", def_proc_id: "numeric", def_dt: "string", hora_corte: "string", def_unit_id: "numeric", def_var_id: "numeric", fd_column: "string", mad_table: "string", scale_factor: "numeric", data_offset: "numeric", def_pixel_height: "numeric", def_pixel_width: "numeric", def_srid: "numeric", def_extent: "geometry", date_column: "string", def_pixeltype: "string", abstract: "regex_string", source: "regex_string",public:"boolean_only_true"}
		var filter_string = control_filter(valid_filters,filter)
		if(!filter_string) {
			return Promise.reject(new Error("invalid filter value"))
		}
		console.log("filter_string:" + filter_string)
		return this.pool.query("SELECT id, nombre, data_table, data_column, tipo, def_proc_id, def_dt, hora_corte, def_unit_id, def_var_id, fd_column, mad_table, scale_factor, data_offset, def_pixel_height, def_pixel_width, def_srid, st_asgeojson(def_extent)::json def_extent, date_column, def_pixeltype, abstract, source, public\
		 FROM fuentes \
		 WHERE 1=1 " + filter_string)
		.then(res=>{
			//~ console.log(res)
			var fuentes = res.rows.map(row=>{
				const fuente = new internal.fuente(row) //(row.id, row.nombre, row.data_table, row.data_column, row.tipo, row.def_proc_id, row.def_dt, row.hora_corte, row.def_unit_id, row.def_var_id, row.fd_column, row.mad_table, row.scale_factor, row.data_offset, row.def_pixel_height, row.def_pixel_width, row.def_srid, row.def_extent, row.date_column, row.def_pixeltype, row.abstract, row.source)
				fuente.id = row.id
				return fuente
				console.log(fuente.toString())
			})
			return fuentes
		})
		.catch(e=>{
			console.error(e)
			return null
		})
	}
	

			
	// SERIE //
	
	upsertSerie(serie,options={}) {
		if(!serie.tipo) {
			serie.tipo = "puntual"
		}
		return new Promise((resolve,reject)=>{
			if(serie.id) {
				resolve(serie)
			} else {
				resolve(serie.getId(this.pool))
			}
		})
		.then(()=>{
			return this.pool.query(this.upsertSerieQuery(serie))
			.then(result=>{
				if(result.rows.length == 0) {
					console.log("nothing inserted")
					return null
				}
				console.log("Upserted serie " + serie.tipo + " id: " + result.rows[0].id)
				result.rows[0].tipo = serie.tipo
				return result.rows[0]
			})
		})
		.then(result=>{
			if(options.series_metadata) {
				console.log("adding series metadata")
				return this.initSerie(result)
			} else {
				return new internal.serie({
					tipo: result.tipo,
					id: result.id, 
					estacion: { id: result.estacion_id },
					"var": { id: result.var_id },
					procedimiento: { id: result.proc_id },
					unidades: { id: result.unit_id },
					fuentes: { id: result.fuentes_id}
				})
			}
		})
		.catch(e=>{
			console.error(e)
		})
	}

	upsertSerieQuery(serie) {
		var query = ""
		var params = []
		if(serie.tipo == "areal") {
			if(serie.id) {
				query = "\
				INSERT INTO series_areal (area_id,var_id,proc_id,unit_id,fuentes_id)\
				VALUES ($1,$2,$3,$4,$5,$6)\
				ON CONFLICT (area_id,var_id,proc_id,unit_id,fuentes_id)\
				DO update set area_id=excluded.area_id\
				RETURNING id,area_id AS estacion_id,var_id,proc_id,unit_id,fuentes_id"
				params = [serie.estacion.id,serie["var"].id,serie.procedimiento.id,serie.unidades.id,serie.fuente.id,id]
			} else {
				query = "\
				INSERT INTO series_areal (area_id,var_id,proc_id,unit_id,fuentes_id)\
				VALUES ($1,$2,$3,$4,$5)\
				ON CONFLICT (area_id,var_id,proc_id,unit_id,fuentes_id)\
				DO update set area_id=excluded.area_id\
				RETURNING id,area_id AS estacion_id,var_id,proc_id,unit_id,fuentes_id"
				params = [serie.estacion.id,serie["var"].id,serie.procedimiento.id,serie.unidades.id,serie.fuente.id]
			}
		} else if (serie.tipo == "rast" || serie.tipo == "raster") {
			if(serie.id) {
				query = "\
				INSERT INTO series_rast (escena_id,var_id,proc_id,unit_id,fuentes_id,id)\
				VALUES ($1,$2,$3,$4,$5,$6)\
				ON CONFLICT (escena_id,var_id,proc_id,unit_id,fuentes_id)\
				DO update set escena_id=excluded.escena_id\
				RETURNING id,escena_id AS estacion_id,var_id,proc_id,unit_id,fuentes_id"
				params = [serie.estacion.id,serie["var"].id,serie.procedimiento.id,serie.unidades.id,serie.fuente.id,serie.id]
			} else {
				query = "\
				INSERT INTO series_rast (escena_id,var_id,proc_id,unit_id,fuentes_id)\
				VALUES ($1,$2,$3,$4,$5)\
				ON CONFLICT (escena_id,var_id,proc_id,unit_id,fuentes_id)\
				DO update set escena_id=excluded.escena_id\
				RETURNING id,escena_id AS estacion_id,var_id,proc_id,unit_id,fuentes_id"
				params = [serie.estacion.id,serie["var"].id,serie.procedimiento.id,serie.unidades.id,serie.fuente.id]
			}
		} else {
			if(serie.id) { // SI SE PROVEE ID Y YA EXISTE LA TUPLA ESTACION+VAR+PROC, ACTUALIZA ID
				query = "\
				INSERT INTO series (estacion_id,var_id,proc_id,unit_id,id)\
				VALUES ($1,$2,$3,$4,$5)\
				ON CONFLICT (estacion_id,var_id,proc_id)\
				DO UPDATE SET unit_id=excluded.unit_id, id=excluded.id\
				RETURNING *"
				params = [serie.estacion.id,serie["var"].id,serie.procedimiento.id,serie.unidades.id,serie.id]
			} else {
				query = "\
				INSERT INTO series (estacion_id,var_id,proc_id,unit_id)\
				VALUES ($1,$2,$3,$4)\
				ON CONFLICT (estacion_id,var_id,proc_id)\
				DO UPDATE SET unit_id=excluded.unit_id\
				RETURNING *"
				params = [serie.estacion.id,serie["var"].id,serie.procedimiento.id,serie.unidades.id]
			}
		} 
		return pasteIntoSQLQuery(query,params)
	}
	
	async upsertSeries(series,all=false) {
		// var promises=[]
		// console.log({all:all})
		var series_result=[]
		var client  = await this.pool.connect() 
		try {
			await client.query("BEGIN")
			for(var i=0; i<series.length; i++) {
				const serie = (series[i] instanceof internal.serie) ? series[i] : new internal.serie(series[i])
				// console.log("new serie: " + JSON.stringify(serie))
				var serie_props = {}
				if(all) {
					if(serie.estacion instanceof internal.estacion) {
						// console.log({estacion:serie.estacion})
						// promises.push(this.upsertEstacion(serie.estacion))
						serie_props.estacion = await client.query(this.upsertEstacionQuery(serie.estacion))
					} else if (serie.estacion instanceof internal.area) {
						//~ console.log("estacion is internal.area")
						// promises.push(this.upsertArea(serie.estacion))
						serie_props.estacion = await client.query(this.upsertAreaQuery(serie.estacion))
					} else if (serie.estacion instanceof internal.escena) {
						serie_props.estacion = await client.query(this.upsertEscenaQuery(serie.estacion))
					}
					if(serie["var"] instanceof internal["var"]) {
						// promises.push(this.upsertVar(serie["var"]))
						serie_props["var"] = await client.query(this.upsertVarQuery(serie["var"]))
					}
					if(serie.procedimiento instanceof internal.procedimiento) {
						// promises.push(this.upsertProcedimiento(serie.procedimiento))
						serie_props.procedimiento = await client.query(this.upsertProcedimientoQuery(serie.procedimiento))
					}
					if(serie.unidades instanceof internal.unidades) {
						// promises.push(this.upsertUnidades(serie.unidades))
						serie_props.unidades = await client.query(this.upsertUnidadesQuery(serie.unidades))
					}
					if(serie.fuente instanceof internal.fuente) {
						// promises.push(this.upsertFuente(serie.fuente))
						serie_props.fuente = await client.query(this.upsertFuenteQuery(serie.fuente))
					}
				}
				var query_string = this.upsertSerieQuery(serie)
				// console.log(query_string)
				var s = await client.query(query_string)
				Object.keys(serie_props).forEach(key=>{
					s[key] = serie_props[key]
				})
				s  = new internal.serie(s)
				if(serie.observaciones instanceof internal.observaciones) {
					s.observaciones = serie.observaciones
					s.observaciones.removeDuplicates()
					s.tipo_guess()
					s.idIntoObs()
					s.observaciones = await client.query(this.upsertObservacionesQuery(serie.observaciones,serie.tipo))
				}
				series_result.push(s)
			}
			console.log("COMMIT")
			await client.query("COMMIT")
		}
		catch (e) {
			console.log("ROLLBACK")
			client.query("ROLLBACK")
			throw(e)
		}
		finally {
			client.release()
		}
		return series_result
// console.log(queries.join(";\n"))
		// return this.executeQueryArray(queries)
		// .then(result=>{
		// 	

		// })
		// return Promise.all(promises)
		// return Promise.resolve([])
	}

	async executeQueryArray(queries,internalClass) {
		var results = []
		for(var i in queries) {
			try {
				var result = await this.pool.query(queries[i])
			} catch (e) {
				console.error(e)
				continue
			}
			var results_ = (internalClass) ? result.rows.map(r=>new internalClass(r)) : result.rows
			results.push(...results_)
		}
		return Promise.resolve(results)
	}
	
	deleteSerie(tipo,id) {
		if(tipo == "areal") {
			return this.pool.query("\
				DELETE FROM series_areal\
				WHERE id=$1\
				RETURNING *",[id]
			).then(result=>{
				if(result.rows.length<=0) {
					console.log("id not found")
					return
				}
				console.log("Deleted series_areal.id=" + result.rows[0].id)
			}).catch(e=>{
				console.error(e)
			})
		} else {
			return this.pool.query("\
				DELETE FROM series\
				WHERE id=$1\
				RETURNING *",[id]
			).then(result=>{
				if(result.rows.length<=0) {
					console.log("id not found")
					return
				}
				console.log("Deleted series.id=" + result.rows[0].id)
				return result.rows[0]
			}).catch(e=>{
				throw(e)
				//~ console.error(e)
			})
		}
	}
	
	deleteSeries(filter) {
		var series_table = (filter.tipo) ? (filter.tipo == "puntual") ? "series" : (filter.tipo == "areal") ? "series_areal" : (filter.tipo == "rast" || filter.tipo == "raster") ? "series_rast" : "puntual" : "puntual"
		return this.getSeries(filter.tipo,filter)
		.then(series=>{
			if(series.length == 0) {
				return []
			}
			var ids = series.map(s=>s.id)
			return this.pool.query("\
				DELETE FROM " + series_table + "\
				WHERE id IN (" + ids.join(",") + ")\
				RETURNING *")
			.then(result=>{
				return result.rows
			})
		})
	}
	
	deleteSeries_Old(filter) {   // ELIMINAR
		var valid_filters
		if(filter.tipo.toLowerCase() == "areal") {
			valid_filters = {id:"integer",area_id:"integer",var_id:"integer",proc_id:"integer",unit_id:"integer",fuentes_id:"integer"}
			var filter_string = control_filter(valid_filters, filter, "series_areal")
			return this.pool.query("\
				DELETE FROM series_areal\
				WHERE series_areal.id=coalesce($1,series_areal.id)\
					  " + filter_string + "\
				RETURNING *",[filter.id]
			).then(result=>{
				if(result.rows.length<=0) {
					console.log("series not found")
					return []
				}
				console.log("Deleted " + result.rows.length + " series_areal")
				return result.rows
			}).catch(e=>{
				console.error(e)
			})
		} else if(filter.tipo.toLowerCase()=="raster"){
			valid_filters = {id:"integer",escena_id:"integer",var_id:"integer",proc_id:"integer",unit_id:"integer",fuentes_id:"integer"}
			var filter_string = control_filter(valid_filters, filter, "series_raster")
			return this.pool.query("\
				DELETE FROM series_raster\
				WHERE series_raster.id=coalesce($1,series_raster.id)\
				" + filter_string + "\
				RETURNING *",[filter.id]
			).then(result=>{
				if(result.rows.length<=0) {
					console.log("series not found")
					return []
				}
				console.log("Deleted " + result.rows.length + " series_raster")
				return result.rows
			}).catch(e=>{
				console.error(e)
			})
		} else {  // puntual
			valid_filters = {var_id:"integer",proc_id:"integer",unit_id:"integer",estacion_id:"integer",tabla:"string",id_externo:"string", id: "integer"}
			var filter_string = control_filter(valid_filters, filter)
			return this.pool.query("\
				DELETE FROM series\
				USING estaciones\
				WHERE series.estacion_id=estaciones.unid\
				AND series.id=coalesce($1,series.id)\
				" + filter_string + "\
				RETURNING *",[filter.id]
			).then(result=>{
				if(result.rows.length<=0) {
					console.log("series not found")
					return []
				}
				console.log("Deleted " + result.rows.length + " series")
				return result.rows
			}).catch(e=>{
				console.error(e)
			})
		}
	}
	
	getSerie(tipo,id,timestart,timeend,options={},isPublic,timeupdate) {
		if(tipo == "areal") {
			return this.pool.query("\
			SELECT series_areal.id,series_areal.area_id,series_areal.var_id,series_areal.proc_id,series_areal.unit_id,series_areal.fuentes_id,fuentes.public,series_areal_date_range.timestart,series_areal_date_range.timeend,series_areal_date_range.count FROM series_areal join fuentes on (series_areal.fuentes_id=fuentes.id) left join series_areal_date_range on (series_areal.id=series_areal_date_range.series_id)\
			WHERE series_areal.id=$1",[id])
			.then(result=>{
				if(result.rows.length<=0) {
					console.log("crud.getSerie: serie no encontrada")
					throw("serie no encontrada")
				}
				if(isPublic) {
					if(!result.rows[0].public) {
						throw("El usuario no posee autorización para acceder a esta serie")
					}
				}
				console.log("crud.getSerie: serie " + tipo + " " + id + " encontrada")
				var row = result.rows[0]
				row.date_range = {timestart: row.timestart, timeend: row.timeend, count: row.count}
				delete row.timestart
				delete row.timeend
				delete row.count
				var promises = []
				if(options.no_metadata) {
					promises =[{id:row.area_id},{id:row.var_id},{id:row.proc_id},{id:row.unit_id}]
				} else {
					promises = [this.getArea(row.area_id), this.getVar(row.var_id), this.getProcedimiento(row.proc_id), this.getUnidad(row.unit_id), this.getFuente(row.fuentes_id)]
				}
				return Promise.all(promises)
				.then( s => {
					const serie = new internal.serie(s[0],s[1],s[2],s[3], "areal", s[4])  // estacion,variable,procedimiento,unidades,tipo,fuente
					serie.date_range = row.date_range
					serie.id=row.id
					var promises = [serie]
					if(timestart && timeend) {
						options.obs_type = serie["var"].type
						promises.push(this.getObservacionesRTS("areal",{series_id:row.id,timestart:timestart,timeend:timeend},options,serie)
						.then(results=>{
							if(results) {
								// console.log("got observaciones for series")
								serie.observaciones = results
							}
							return
						}))
					} else if(timeupdate) {
						options.obs_type = serie["var"].type
						promises.push(this.getObservacionesRTS("areal",{series_id:row.id,timeupdate:timeupdate},options,serie)
						.then(results=>{
							if(results) {
								// console.log("got observaciones for series")
								row.observaciones = results
							}
							return
						}))						
					} else {
						promises.push(null)
					}
					if(options) {
						if(options.getStats) {
							promises.push(serie.getStats(this.pool)
							.then(results=>{
								if(results) {
									console.log("got stats for series")
								}
								return
							}))
						} 
						else {
							promises.push(null)
						}
					} 
					else {
						promises.push(null)
					}
					return Promise.all(promises)
				})
				.then(result=>{
					
					if(result[1]) {
						result[0].observaciones = result[1]
					}
					return result[0]
				})
			})
		} else if (tipo=="rast" || tipo=="raster") {
			return this.pool.query("\
			SELECT series_rast.id,series_rast.escena_id,series_rast.var_id,series_rast.proc_id,series_rast.unit_id,series_rast.fuentes_id,fuentes.public,series_rast_date_range.timestart,series_rast_date_range.timeend,series_rast_date_range.count FROM series_rast JOIN fuentes ON (series_rast.fuentes_id=fuentes.id) left join series_rast_date_range on (series_rast.id=series_rast_date_range.series_id)\
			WHERE series_rast.id=$1",[id])
			.then(result=>{
				if(result.rows.length<=0) {
					console.log("serie no encontrada")
					return Promise.reject("serie no encontrada")
				}
				if(isPublic) {
					if(!result.rows[0].public) {
						throw("El usuario no posee autorización para acceder a esta serie")
					}
				}
				var row = result.rows[0]
				row.date_range = {timestart: row.timestart, timeend: row.timeend, count: row.count}
				delete row.timestart
				delete row.timeend
				delete row.count
				var promises = []
				if(options.no_metadata) {
					promises =[{id:row.area_id},{id:row.var_id},{id:row.proc_id},{id:row.unit_id},{id:row.fuentes_id}]
				} else { 
					promises = [this.getEscena(row.escena_id), this.getVar(row.var_id), this.getProcedimiento(row.proc_id), this.getUnidad(row.unit_id), this.getFuente(row.fuentes_id)]
				}
				if(timestart && timeend) {
					if(!options.format) {
						options.format="hex"
					}
					promises.push(this.getObservacionesRTS("rast",{series_id:row.id,timestart:timestart,timeend:timeend},options)
					.then(results=>{
						if(results) {
							// console.log("got observaciones for series")
							row.observaciones = results
						}
						return
					}))
				}	else if(timeupdate) {
					if(!options.format) {
						options.format="hex"
					}
					promises.push(this.getObservacionesRTS("rast",{series_id:row.id,timeupdate:timeupdate},options)
					.then(results=>{
						if(results) {
							// console.log("got observaciones for series")
							row.observaciones = results
						}
						return
					}))						
				}			
				return Promise.all(promises)
				.then( s => {
					const serie = new internal.serie({estacion:s[0],"var":s[1],procedimiento:s[2],unidades:s[3], tipo:"rast", fuente:s[4]})  // estacion,variable,procedimiento,unidades,tipo,fuente
					serie.observaciones = row.observaciones
					serie.id = row.id
					serie.date_range = row.date_range
					if(options) {
						if(options.getStats) {
							return serie.getStats(this.pool)
							.then(result=>{
								if(result) {
									console.log("got stats for series")
								}
								return result
							})
						} 
						else {
							return serie
						}
					} 
					else {
						return serie
					}
					//~ if(s[5]) {
						//~ serie.observaciones = s[5]
					//~ }
				})
			})
		} else {
			return this.pool.query("\
			SELECT series.id,series.estacion_id,series.var_id,series.proc_id,series.unit_id,redes.public,series_date_range.timestart,series_date_range.timeend,series_date_range.count FROM series \
			JOIN estaciones ON (series.estacion_id=estaciones.unid) JOIN redes ON (estaciones.tabla=redes.tabla_id) left join series_date_range on (series.id=series_date_range.series_id)\
			WHERE series.id=$1",[id])
			.then(result=>{
				if(result.rows.length<=0) {
					console.log("serie no encontrada")
					return Promise.reject("serie no encontrada")
				}
				if(isPublic) {
					if(!result.rows[0].public) {
						throw("El usuario no posee autorización para acceder a esta serie")
					}
				}
				var row = result.rows[0]
				row.date_range = {timestart: row.timestart, timeend: row.timeend, count: row.count}
				delete row.timestart
				delete row.timeend
				delete row.count
				var promises = [this.getEstacion(row.estacion_id), this.getVar(row.var_id), this.getProcedimiento(row.proc_id), this.getUnidad(row.unit_id)]
				return Promise.all(promises)
				.then( s => {
					const serie = new internal.serie(s[0],s[1],s[2],s[3], "puntual")  // estacion,variable,procedimiento,unidades,tipo,fuente
					serie.id=row.id
					serie.date_range = row.date_range
					var promises = [serie]
					if(timestart && timeend) {
						options.obs_type = serie["var"].type
						if(options.regular) {
							promises.push(this.getRegularSeries("puntual",row.id,(options.dt) ? options.dt : "1 days", timestart, timeend,options)
							.then(results=>{
								if(results) {
									// console.log("got observaciones for series")
									serie.observaciones = results
								}
								return
							}))
						} else {
							promises.push(this.getObservacionesRTS("puntual",{series_id:row.id,timestart:timestart,timeend:timeend,timeupdate:timeupdate},options,serie)
							.then(results=>{
								if(results) {
									// console.log("got observaciones for series")
									serie.observaciones = results
								}
								return
							}))
						}
					} else if(timeupdate) {
						options.obs_type = serie["var"].type
						promises.push(this.getObservacionesRTS("puntual",{series_id:row.id,timeupdate:timeupdate},options,serie)
						.then(results=>{
							if(results) {
								// console.log("got observaciones for series")
								row.observaciones = results
							}
							return
						}))						
					}
					if(options && options.getStats) {
						promises.push(serie.getStats(this.pool)
						.then(results=>{
							if(results) {
								console.log("got stats for series")
								return
							}
						}))
					} else {
						promises.push(null)
					}
					if(options && options.getMonthlyStats) {
						promises.push(this.getMonthlyStats("puntual",serie.id)
						.then(monthlyStats=>{
							serie.monthlyStats = monthlyStats.values
							return
						}))
					} else {
						promises.push(null)
					}
					return Promise.all(promises)
				})
				.then( results => {
					//~ if(results[1]) {
						//~ results[0].observaciones = results[1]
					//~ }
					return results[0]
				})
			})
		}
	}
	
	initSerie(serie) {
		//~ console.log({serie:serie})
		var promises=[]
		if(!serie.estacion) {
			if(serie.tipo == "areal") {
				promises.push(this.getArea(serie.estacion_id))
			} else if (serie.tipo == "rast") {
				promises.push(this.getEscena(serie.estacion_id))
			} else {
				promises.push(this.getEstacion(serie.estacion_id))
			}
		} else if (serie.estacion.id) {
			if(serie.tipo == "areal") {
				if(! serie.estacion instanceof internal.area) {
					promises.push(this.getArea(serie.estacion.id))
				} else {
					promises.push(serie.estacion)
				}
			} else if (serie.tipo == "rast") {
				if(! serie.estacion instanceof internal.escena) {
					promises.push(this.getEscena(serie.estacion.id))
				} else {
					promises.push(serie.estacion)
				}
			} else {
				if(! serie.estacion instanceof internal.estacion) {
					console.log("running getEstacion")
					promises.push(this.getEstacion(serie.estacion.id))
				} else {
					promises.push(serie.estacion)
				}
			}
		} else {
			promises.push(null)
		}
		if(!serie["var"]) {
			promises.push(this.getVar(serie.var_id))
		} else if (serie["var"].id) {
			if(! serie["var"] instanceof internal["var"]) {
				promises.push(this.getVar(serie["var"].id))
			} else {
				promises.push(serie["var"])
			}
		} else {
			promises.push(null)
		}
		if(!serie.procedimiento) {
			promises.push(this.getProcedimiento(serie.proc_id))
		} else if (serie.procedimiento.id) {
			if(! serie.procedimiento instanceof internal.procedimiento) {
				promises.push(this.getProcedimiento(serie.procedimiento.id))
			} else {
				promises.push(serie.procedimiento)
			}
		} else {
			promises.push(null)
		}
		if(!serie.unidades) {
			promises.push(this.getUnidad(serie.unit_id))
		} else if (serie.unidades.id) {
			if(!serie.unidades instanceof internal.unidades) {
				promises.push(this.getUnidad(serie.unidades.id))
			} else {
				promises.push(serie.unidades)
			}
		} else {
			promises.push(null)
		}
		if(serie.tipo == "areal") {
			if(!serie.fuente) {
				promises.push(this.getFuente(serie.fuentes_id))
			} else if (serie.fuente.id) {
				if(!serie.fuente instanceof internal.fuente) {
					promises.push(this.getFuente(serie.fuente.id))
				} else {
					promises.push(serie.fuente)
				}
			} else {
				promises.push(null)
			}
		} else {
			promises.push(null)
		}
		return Promise.all(promises)
		.then(res=> {
			serie.estacion = res[0]
			this["var"] = res[1]
			serie.procedimiento = res[2]
			serie.unidades = res[3]
			serie.fuente = res[4]
			//~ console.log({serie:serie})
			return new internal.serie(serie)
		})
		.catch(e=>{
			console.error(e)
		})
	}
	
	async getSeries(tipo,filter,options={}) {
		//~ console.log(options)
		// console.log({filter:filter})
		if(tipo) {
			filter.tipo = tipo
		}
		var query = internal.serie.build_read_query(filter,options)
		// console.log(query)
		try {
			var res = await this.pool.query(query)
		} catch(e) {
			throw(e)
		}
		for(var i in res.rows) {
			res.rows[i].date_range = {timestart: res.rows[i].timestart, timeend: res.rows[i].timeend, count: res.rows[i].count}
			delete res.rows[i].timestart
			delete res.rows[i].timeend
			delete res.rows[i].count
		}
		if(options.no_metadata) {  // RETURN WITH NO METADATA (SOLO IDS)
			return res.rows.map(r=> {
				//~ delete r.geom
				//~ console.log(r.geom)
				if(r.geom) {
					r.geom = JSON.parse(r.geom)
				} 
				r.tipo = tipo
				return r
			})
		}
		var series = []
		for(var i = 0; i < res.rows.length; i++) {
			var row=res.rows[i]
			try {
				var serie = {
					id:row.id,
					var: await this.getVar(row.var_id),
					procedimiento: await this.getProcedimiento(row.proc_id), 
					unidades: await this.getUnidad(row.unit_id)
				}
			} catch(e) {
				throw(e)
			}
			if(filter.timestart && filter.timeend) {
				try {
					serie.observaciones = await this.getObservaciones(tipo,{series_id:row.id,timestart:filter.timestart,timeend:filter.timeend})
				} catch(e){
					throw(e)
				}
			} 
			if(tipo.toUpperCase() == "AREAL") {
				tipo = "areal"
				try {
					serie.estacion = await this.getArea(row.area_id,{no_geom:true})
					serie.fuente = await this.getFuente(row.fuentes_id)
					serie.date_range = row.date_range
				} catch(e){
					throw(e)
				}
				
			} else if (tipo.toUpperCase() == "RAST" || tipo.toUpperCase() == "RASTER") {
				tipo="raster"
				try {
					serie.estacion = await this.getEscena(row.escena_id)
					serie.fuente = await this.getFuente(row.fuentes_id)
				} catch(e) {
					throw(e)
				}
				serie.date_range = row.date_range
				//~ const s = new internal.serie(row.area_id, row.var_id, row.proc_id, row.unit_id, "areal", row.fuentes_id)		
			} else { // puntual
				tipo="puntual"
				try {
					serie.estacion = await this.getEstacion(row.estacion_id)
				} catch(e) {
					throw(e)
				}
				serie.date_range = row.date_range
				//~ const s = new internal.serie(row.estacion_id, row.var_id, row.proc_id, row.unit_id, "puntual")
			}
			serie.tipo = tipo
			if(options.getStats) {
				try {
					serie = new internal.serie(serie)
					await serie.getStats(this.pool)
				} catch(e){
					throw(e)
				}
				series.push(serie)
			} else {
				series.push(new internal.serie(serie))
			}
		}
		return Promise.all(series)
		.then(async series=>{
			if(options.getMonthlyStats) {
				var series_id_list = series.map(s=>s.id)
				try {
					var monthly_stats = await this.getMonthlyStatsSeries(tipo,series_id_list)
					var ms = {}
					monthly_stats.forEach(i=>{
						ms[i.series_id] = i.stats
					})
				} catch(e) {
					throw(e)
				}
				for(var i in series) {
					if(ms[series[i].id]) {
						series[i].monthlyStats = ms[series[i].id]
					}
				}
			}
			if(filter.percentil || options.getPercentiles) {
				var series_id_list = series.map(s=>s.id)
				try {
					var percentiles = await this.getPercentiles(tipo,series_id_list,filter.percentil)
					var perc = {}
					percentiles.forEach(i=>{
						perc[i.series_id] = i.percentiles
					})
				} catch(e) {
					throw(e)
				}
				for(var i in series) {
					if(perc[series[i].id]) {
						series[i].percentiles = perc[series[i].id]
					}
				}
			}
			return series
		})
	}

	getPercentiles(tipo="puntual",series_id,percentiles,isPublic) {
		var filter
		var params
		if(!series_id) {
			filter = "WHERE tipo=$1" 
			params = [tipo]
		} else if(Array.isArray(series_id)) {
			if(series_id.length) {
				var id_list = series_id.map(id=>parseInt(id)).join(",")
				filter = "WHERE tipo=$1 AND series_id IN (" + id_list + ")"
				params = [tipo]
			} else {
				filter = "WHERE tipo=$1" 
				params = [tipo]
			}
		} else {
			filter = "WHERE tipo=$1 AND series_id=$2"
			params = [tipo,series_id]
		}
		if(percentiles) {
			if(Array.isArray(percentiles)) {
				filter = `${filter} AND percentil::text IN (${percentiles.map(p=>`${parseFloat(p).toString()}::text`).join(",")})`
			} else {
				filter = `${filter} AND percentil::text=${parseFloat(percentiles).toString()}::text`
			}
		}
		var stmt = "SELECT tipo,series_id,json_agg(json_build_object('percentile',percentil,'count',count,'timestart',timestart,'timeend',timeend,'valor',valor) ORDER BY percentil) AS percentiles FROM series_percentiles " + filter + " GROUP BY tipo,series_id ORDER BY tipo,series_id"
		console.log(stmt)
		return this.pool.query(stmt,params)
		.then(result=>{
			return result.rows.map(row=>new internal.percentiles(row))
		})
	}
	
	// OBSERVACION //
	
	removeDuplicatesMultiSeries(observaciones) {
		var series_id = new Set(observaciones.map(o=>o.series_id))
		var result = []
		for(var id of series_id) {
			var subset = observaciones.filter(o=>(o.series_id==id))
			if(subset.length) {
				var filtered = this.removeDuplicates(subset)
				for(var x of filtered) result.push(x)
			}
		}
		return result
	}

	removeDuplicates(observaciones) {   // elimina observaciones con timestart duplicado
		// var timestarts = []
		console.log("sorting...")
		observaciones.sort((a,b) => (a.timestart - b.timestart))
		console.log("done")
		var previous_timestart = new Date("1800-01-01")
		console.log("filtering...")
		return observaciones.filter(o=>{ 
			if(o.timestart - previous_timestart == 0) {
				console.log("removing duplicate observacion, timestart:"+o.timestart)
				return false
			} else {
				previous_timestart = o.timestart
				return true
			}
		})
	}

	upsertObservacion(observacion,no_update) {
		//~ console.log(observacion)
		if (!(observacion instanceof internal.observacion)) {
			//~ console.log("create observacion")
			observacion = new internal.observacion(observacion)
		} 
		return observacion.getId(this.pool)
		.then(()=>{
			observacion.timestart = (typeof observacion.timestart) == 'string' ? new Date(observacion.timestart) : observacion.timestart
			observacion.timeend = (typeof observacion.timeend) == 'string' ? new Date(observacion.timeend) : observacion.timeend
			if(config.verbose) {
				console.log("crud.upsertObservacion: " + observacion.toString())
			}
			if(observacion.tipo != "rast" && observacion.tipo != "raster") {
				const val_type = (Array.isArray(observacion.valor)) ? "numarr" : "num"
				const obs_tabla = (observacion.tipo == "areal") ? "observaciones_areal" : "observaciones"
				const val_tabla = (observacion.tipo == "areal") ? (val_type == "numarr") ? "valores_numarr_areal" : "valores_num_areal" : (val_type == "numarr") ? "valores_numarr" : "valores_num"
				var on_conflict_clause_obs = (no_update) ? " NOTHING " : " UPDATE SET nombre=excluded.nombre,\
							  descripcion=excluded.descripcion,\
							  unit_id=excluded.unit_id,\
							  timeupdate=excluded.timeupdate "
				var on_conflict_clause_val = (no_update) ? " NOTHING " : " UPDATE SET valor=excluded.valor "
				return this.pool.connect()
				.then(client => {
					return client.query('BEGIN')
					.then(res => {
						const queryText = "INSERT INTO " + obs_tabla + " (series_id,timestart,timeend,nombre,descripcion,unit_id,timeupdate)\
							VALUES ($1,$2,$3,$4,$5,$6,coalesce($7,now()))\
							ON CONFLICT (series_id,timestart,timeend) DO " + on_conflict_clause_obs + "\
							RETURNING *"
						var stmt = pasteIntoSQLQuery(queryText,[observacion.series_id,observacion.timestart,observacion.timeend,observacion.nombre,observacion.descripcion,observacion.unit_id,observacion.timeupdate])
						// console.log(stmt)
						return client.query(stmt)
						// return client.query(queryText,[observacion.series_id,observacion.timestart,observacion.timeend,observacion.nombre,observacion.descripcion,observacion.unit_id,observacion.timeupdate])
					}).then( res => {
						if(res.rows.length == 0) {
							console.log("No se inserto observacion")
							return client.query('ROLLBACK')
							.then( res=> {
								//~ client.release()
								//~ return
								throw(client.notifications.map(n=>n.message).join(","))
								client.release()
							})
						} else {
							const obs= new internal.observacion(res.rows[0])
							const insertValorText = "INSERT INTO " + val_tabla + " (obs_id,valor)\
								VALUES ($1,$2)\
								ON CONFLICT (obs_id)\
								DO " + on_conflict_clause_val + "\
								RETURNING *"
							return client.query(insertValorText, [obs.id, observacion.valor])
							.then(res => {
								obs.tipo=observacion.tipo
								obs.valor=res.rows[0].valor
								return client.query("COMMIT")
							}).then(res => {
								client.release()
								return obs
							})
						}
					})
				})
			} else {   // RAST //
				var stmt
				var args
				var valor_string
				if(observacion.valor instanceof Buffer) {
					valor_string = "\\x" + observacion.valor.toString('hex')
				} else {
					valor_string = observacion.valor
				}
				// console.log("valor_string:" + valor_string)
				var on_conflict_clause = (no_update) ? " NOTHING " : " UPDATE SET valor=excluded.valor, timeupdate=excluded.timeupdate "
				if(observacion.scale) {
					var scale = parseFloat(observacion.scale)
					var offset = (observacion.offset) ? parseFloat(observacion.offset) : 0
					var expression = "[rast]*" + scale + "+" + offset
					stmt = "INSERT INTO observaciones_rast (series_id, timestart, timeend, valor, timeupdate)\
					VALUES ($1, $2, $3, ST_mapAlgebra(ST_FromGDALRaster($4),'32BF',$5), $6)\
					ON CONFLICT (series_id, timestart, timeend)\
					DO " + on_conflict_clause + "\
					RETURNING id,series_id,timestart,timeend,st_asgdalraster(valor,'GTiff') valor,timeupdate"    // '\\x'||encode(st_asgdalraster(valor,'GTiff')::bytea,'hex')
					args = [observacion.series_id, observacion.timestart, observacion.timeend, valor_string, expression, observacion.timeupdate]
				} else {
					stmt = "INSERT INTO observaciones_rast (series_id, timestart, timeend, valor, timeupdate)\
					VALUES ($1, $2, $3, ST_FromGDALRaster($4), $5)\
					ON CONFLICT (series_id, timestart, timeend)\
					DO " + on_conflict_clause + "\
					RETURNING id,series_id,timestart,timeend,st_asgdalraster(valor, 'GTIff') valor,timeupdate" // '\\x'||encode(st_asgdalraster(valor,'GTiff')::bytea,'hex')
					args = [observacion.series_id, observacion.timestart, observacion.timeend, valor_string, observacion.timeupdate]
				}	
				//~ if(options.hex) {
					//~ args[3] = '\\x' + args[3]
				//~ }
				//~ console.log(args)
				return this.pool.query(stmt,args)
				.then(upserted=>{
					if(upserted.rows.length == 0) {
						console.log("nothing upserted")
						throw("nothing upserted")
					} else {
						//~ console.log("raster upserted")
						upserted.rows[0].tipo="rast"
						return new internal.observacion(upserted.rows[0])
					}
				})
				//~ .catch(e=>{
					//~ throw(e)
				//~ })
			}
		})
	}
	
	upsertObservacionesQuery(observaciones,tipo) {
		var query
		switch(tipo.toLowerCase()) {
			case "areal":
				break;
			case "rast":
			case "raster":
				break;
			default: // "puntual"
		}
		
		var query = "\
			INSERT INTO fuentes (id, nombre, data_table, data_column, tipo, def_proc_id, def_dt, hora_corte, def_unit_id, def_var_id, fd_column, mad_table, scale_factor, data_offset, def_pixel_height, def_pixel_width, def_srid, def_extent, date_column, def_pixeltype, abstract, source) \
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, st_geomfromtext($18), $19, $20, $21, $22)\
			ON CONFLICT (id) DO UPDATE SET \
				id=excluded.id, \
				nombre=excluded.nombre, \
				data_table=excluded.data_table,\
				data_column=excluded.data_column,\
				tipo=excluded.tipo,\
				def_proc_id=excluded.def_proc_id,\
				def_dt=excluded.def_dt,\
				hora_corte=excluded.hora_corte,\
				def_unit_id=excluded.def_unit_id,\
				def_var_id=excluded.def_var_id,\
				fd_column=excluded.fd_column,\
				mad_table=excluded.mad_table,\
				scale_factor=excluded.scale_factor,\
				data_offset=excluded.data_offset,\
				def_pixel_height=excluded.def_pixel_height,\
				def_pixel_width=excluded.def_pixel_width,\
				def_srid=excluded.def_srid,\
				def_extent=excluded.def_extent,\
				date_column=excluded.date_column,\
				def_pixeltype=excluded.def_pixeltype,\
				abstract=excluded.abstract,\
				source=excluded.source\
			RETURNING *"
		var params = [fuente.id, fuente.nombre, fuente.data_table, fuente.data_column, fuente.tipo, fuente.def_proc_id, fuente.def_dt, fuente.hora_corte, fuente.def_unit_id, fuente.def_var_id, fuente.fd_column, fuente.mad_table, fuente.scale_factor, fuente.data_offset, fuente.def_pixel_height, fuente.def_pixel_width, fuente.def_srid, (fuente.def_extent) ? fuente.def_extent.toString() : null, fuente.date_column, fuente.def_pixeltype, fuente.abstract, fuente.source]
		return pasteIntoSQLQuery(query,params)
	}

	async upsertObservaciones(observaciones,tipo,series_id,options={}) {
		if(!observaciones) {
			return Promise.reject("falta observaciones")
		}
		if(observaciones.length==0) {
			console.log("upsertObservaciones: nothing to upsert (length==0)")
			return Promise.resolve([]) // "upsertObservaciones: nothing to upsert (length==0)")
		}
		var serie
		if(series_id) {
			// console.log("setting series_id in each obs...")
			observaciones = observaciones.map(o=>{
				o.series_id = series_id
				return o
			})
			observaciones = this.removeDuplicates(observaciones)
			// console.log("done")
		} else {
			observaciones = this.removeDuplicatesMultiSeries(observaciones)
		}
		if(!tipo && observaciones[0].tipo) {
			var tipo_guess = observaciones[0].tipo
			var count = 0
			for(var i in observaciones) {
				if (observaciones[i].tipo != tipo_guess) {
					break
				}
				count++
			}
			if(count == observaciones.length) {
				tipo = tipo_guess
			}
		}
		if(series_id && tipo) {
			console.log("try read series_id " + series_id)
			try {
				serie = await this.getSerie(tipo,series_id,undefined,undefined,{no_metadata:true})
				console.log("try read var_id " + serie.var.id)
				serie.var = await this.getVar(serie.var.id) 
			} catch(e) {
				throw(e)
			}
			console.log("got series, var.timeSupport=" + serie.var.timeSupport.toString())
		}
		if(config.verbose) {
			console.log("crud.upsertObservaciones: tipo: " + tipo)
		}
		if(tipo) {
			if(tipo=="puntual") {
				return this.upsertObservacionesPuntual(observaciones,options.skip_nulls,options.no_update,(serie) ? serie.var.timeSupport : undefined)
			} else if(tipo=="areal") {
				return this.upsertObservacionesAreal(observaciones,options.skip_nulls,options.no_update, (serie) ? serie.var.timeSupport : undefined)
			}
			observaciones = observaciones.map(o=>{
				o.tipo = tipo
				return o
			})
		} 
		if(config.verbose) {
			console.log("crud.upsertObservaciones: tipo: " + tipo)
		}
		var upserted = []
		var errors = []
		for(var i=0; i<observaciones.length; i++) {
			const observacion = new internal.observacion(observaciones[i])
			// console.log("pushing obs:"+observacion.toCSVless())
			//~ console.log("valor.length:"+observacion.valor.length)
			if(options.skip_nulls && (observacion.valor === null || observacion.valor === undefined )) {
				console.log("skipping null value, series_id:" + observacion.series_id + " timestart:" + observacion.timestart) 
			} else {
				try {
					var o = await this.upsertObservacion(observacion,options.no_update)
					upserted.push(o)
				} catch (e) {
					errors.push(e)
				}
			}
		}
		if(!upserted.length && errors.length) {
			throw(errors)
		}
		return upserted
		// Promise.allSettled(promises)
		// .then(results=>{
		// 	return results.map(r=>{
		// 		if(r.status == "fulfilled") {
		// 			return r.value //valuetype
		// 		} else {
		// 			console.error("upsert rejected, reason:" + r.reason)
		// 			return
		// 		}
		// 	}).filter(r=>r)
		// })
	}
	
			
	upsertObservacionesPuntual(observaciones,skip_nulls,no_update,timeSupport) {
		//~ console.log({observaciones:observaciones})
		var obs_values = []
		observaciones = observaciones.map(observacion=> {
			if(!observacion.series_id) {
				console.error("missing series_id")
				return
			}
			observacion.series_id = parseInt(observacion.series_id)
			if(observacion.series_id.toString()=='NaN')
			{
				console.error("invalid series_id")
				return
			}
			observacion.timestart = !(observacion.timestart instanceof Date) ? new Date(observacion.timestart) : observacion.timestart
			if(observacion.timestart.toString()=='Invalid Date') {
				console.error("invalid timestart")
				return
			}
			observacion.timeend = (timeSupport) ? timeSteps.advanceTimeStep(observacion.timestart,timeSupport) : !(observacion.timeend instanceof Date) ? new Date(observacion.timeend) : observacion.timeend
			if(observacion.timeend.toString()=='Invalid Date')  {
				console.error("invalid timeend")
				return
			}
			observacion.valor = parseFloat(observacion.valor)
			if(observacion.valor.toString()=='NaN')
			{
				console.error("invalid valor")
				return
			}
			if(skip_nulls && observacion.valor === null) {
				console.log("skipping null value, series_id:" + observacion.valor + ", timestart:" + observacion.timestart.toISOString())
				return
			}
			obs_values.push(sprintf("(%d,'%s'::timestamptz,'%s'::timestamptz,'upsertObservacionesPuntual',now(),%f)", observacion.series_id, observacion.timestart.toISOString(), observacion.timeend.toISOString(),observacion.valor))
			return observacion
		}).filter(o=>o)
		//~ console.log({observaciones:observaciones})
		//~ console.log({obs_values:obs_values})
		if(obs_values.length == 0) {
			return Promise.reject("no valid observations")
		}
		obs_values = obs_values.join(",")
		var on_conflict_clause_obs = (no_update) ? " NOTHING " : " UPDATE SET nombre=excluded.nombre,\
					  timeupdate=excluded.timeupdate"
		var on_conflict_clause_val = (no_update) ? " NOTHING " : " UPDATE SET valor=excluded.valor"
		var disable_trigger = (timeSupport) ? "ALTER TABLE observaciones DISABLE TRIGGER obs_puntual_dt_constraint_trigger;" : ""
		var enable_trigger = (timeSupport) ? "ALTER TABLE observaciones ENABLE TRIGGER obs_puntual_dt_constraint_trigger;" : ""
		return this.pool.connect()
		.then(client => {
			//~ console.log({obs_values:obs_values})
			return client.query('BEGIN')
			.then( () => {
				return client.query("\
					" + disable_trigger  + "\
					CREATE TEMPORARY TABLE obs (series_id int,timestart timestamp,timeend timestamp,nombre varchar,timeupdate timestamp,valor real) ON COMMIT DROP ;\
					INSERT INTO obs (series_id,timestart,timeend,nombre,timeupdate,valor)\
					VALUES " + obs_values + ";")
			}).then( ()=>{
				return client.query("\
				    INSERT INTO observaciones (series_id,timestart,timeend,nombre,timeupdate)\
					SELECT series_id,timestart,timeend,nombre,timeupdate\
					FROM obs \
					ON CONFLICT (series_id,timestart,timeend)\
					DO " + on_conflict_clause_obs)
			}).then( ()=>{
				return client.query("\
					INSERT INTO valores_num (obs_id,valor)\
					SELECT observaciones.id,obs.valor\
					FROM observaciones,obs\
					WHERE observaciones.series_id=obs.series_id\
					AND observaciones.timestart=obs.timestart\
					AND observaciones.timeend=obs.timeend \
					ON CONFLICT(obs_id)\
					DO " + on_conflict_clause_val)
			}).then( ()=>{
				return client.query("\
					SELECT observaciones.id,\
					       observaciones.series_id,\
					       observaciones.timestart,\
					       observaciones.timeend,\
					       observaciones.nombre,\
					       observaciones.timeupdate,\
					       valores_num.valor\
					FROM observaciones,valores_num,obs\
					WHERE observaciones.series_id=obs.series_id\
					AND observaciones.timestart=obs.timestart\
					AND observaciones.timeend=obs.timeend\
					AND observaciones.id=valores_num.obs_id\
					ORDER BY observaciones.series_id,observaciones.timestart")
			}).then( result => {
				if(!result.rows) {
					throw("No se insertaron registros, " + client.notifications.map(n=>n.message).join(","))
				}
				if(result.rows.length==0) {
					if(client.notifications) {
						throw(client.notifications.map(n=>n.message).join(",")) //"No observaciones inserted")
					} else {
						throw("No observaciones inserted")
					}
				}
				return client.query(enable_trigger + "\
				COMMIT;")
				.then(()=>{
					client.release()
					console.log("upserted: " + result.rows.length + " obs_puntuales")
					return result.rows
				})
			})
			.catch(e=>{
				// console.error({message: "upsertObservacionesPuntual error",error:e})
				return client.query("ROLLBACK")
				.then(()=>{
					client.release()
					throw(e)
				})
			})
		})	
	}
	
	upsertObservacionesAreal(observaciones,skip_nulls,no_update, timeSupport) {
		var obs_values = []
		observaciones = observaciones.map(observacion=> {
			if(!observacion.series_id) {
				console.error("missing series_id")
				return
			}
			observacion.series_id = parseInt(observacion.series_id)
			if(observacion.series_id.toString()=='NaN')
			{
				console.error("invalid series_id")
				return
			}
			observacion.timestart = !(observacion.timestart instanceof Date) ? new Date(observacion.timestart) : observacion.timestart
			if(observacion.timestart.toString()=='Invalid Date') {
				console.error("invalid timestart")
				return
			}
			observacion.timeend = (timeSupport) ? timeSteps.advanceTimeStep(observacion.timestart,timeSupport) : !(observacion.timeend instanceof Date) ? new Date(observacion.timeend) : observacion.timeend
			if(observacion.timeend.toString()=='Invalid Date')  {
				console.error("invalid timeend")
				return
			}
			observacion.valor = parseFloat(observacion.valor)
			if(observacion.valor.toString()=='NaN')
			{
				console.error("invalid valor")
				return
			}
			if(skip_nulls && observacion.valor === null) {
				console.log("skipping null value, series_id:" + observacion.valor + ", timestart:" + observacion.timestart.toISOString())
				return
			}
			obs_values.push(sprintf("(%d,'%s'::timestamptz,'%s'::timestamptz,'upsertObservacionesAreal',now())", observacion.series_id, observacion.timestart.toISOString(), observacion.timeend.toISOString()))
			return observacion
		}).filter(o=>o)
		if(config.verbose) {
			console.log("crud.upsertObservacionesAreal: obs_values:" + JSON.stringify(obs_values))
		}
		obs_values = obs_values.join(",")
		var on_conflict_clause_obs = (no_update) ? " NOTHING " : " UPDATE SET nombre=excluded.nombre,\
					  timeupdate=excluded.timeupdate " 
		var on_conflict_clause_val = (no_update) ? " NOTHING " : " UPDATE SET valor=excluded.valor "
		var disable_trigger = (timeSupport) ? "ALTER TABLE observaciones_areal DISABLE TRIGGER obs_dt_trig;" : ""
		var enable_trigger = (timeSupport) ? "ALTER TABLE observaciones_areal ENABLE TRIGGER obs_dt_trig;" : "" 
		return this.pool.connect()
		.then(client => {
			return client.query('BEGIN;' + disable_trigger)
			.then( () => {
				return client.query("\
					INSERT INTO observaciones_areal (series_id,timestart,timeend,nombre,timeupdate)\
					VALUES " + obs_values + "\
					ON CONFLICT (series_id,timestart,timeend)\
					DO " + on_conflict_clause_obs + "\
					RETURNING *")
			})
			.then( result => {
				if(!result) {
					throw("query error")
					client.release()
					return
				}
				if(result.rows.length==0){
					throw("No observaciones inserted")
					client.release()
					return
				}
				//~ console.log(result.rows)
				var val_values = observaciones.map((obs,i)=>{
					if(config.verbose) {
						console.log("crud.upsertObservacionesAreal: obs:" + JSON.stringify(obs))
					}
					var o = result.rows.shift()
					if(config.verbose) {
						console.log("crud.upsertObservacionesAreal: o:" + JSON.stringify(o))
					}
					if(obs.series_id == o.series_id && obs.timestart.toISOString() == o.timestart.toISOString() && obs.timeend.toISOString() == o.timeend.toISOString()) {
						observaciones[i].id = o.id
						//~ console.log({obs:obs, o:o})
						return sprintf("(%d,%f)", o.id, obs.valor)
					} else {
						return
					}
				}).filter(o=>o).join(",")
				//~ console.log({val_values:val_values})
				return client.query("INSERT INTO valores_num_areal (obs_id,valor)\
					VALUES " + val_values + "\
					ON CONFLICT (obs_id)\
					DO " + on_conflict_clause_val + "\
					RETURNING *")
			})
			.then(result=>{
				client.query(enable_trigger + " COMMIT;")
			})
			.then(res => {
				client.release()
				return observaciones
			})
			.catch(e=>{
				console.error(e)
				client.release()
				throw(e)
			})
		})	
	}
	
	upsertObservacionesFromCSV(tipo="puntual",csvFile) {
		if(!csvFile) {
			return Promise.reject("csvFile missing")
		}
		if(!fs.existsSync(csvFile)) {
			return Promise.reject("file " + csvFile + " not found")
		}
					//~ if(tipo.toLowerCase() == "puntual") {
		return this.runSqlCommand(this.config.database,"BEGIN;\
			CREATE TEMPORARY TABLE obs_temp (series_id int,timestart timestamptz,timeend timestamptz,valor real) ON COMMIT DROP;\
			COPY obs_temp (series_id,timestart,timeend,valor) FROM STDIN WITH DELIMITER ',';\
			INSERT INTO observaciones (series_id,timestart,timeend)\
				SELECT series_id,timestart::timestamp,timeend::timestamp FROM obs_temp \
				ON CONFLICT(series_id,timestart,timeend) \
				DO UPDATE SET timeupdate=excluded.timeupdate\
				RETURNING *;\
				INSERT INTO valores_num (obs_id,valor) select observaciones.id,obs_temp.valor from observaciones,obs_temp where observaciones.series_id=obs_temp.series_id and observaciones.timestart=obs_temp.timestart::timestamp and observaciones.timeend=obs_temp.timeend::timestamp ON CONFLICT(obs_id) DO UPDATE SET valor=excluded.valor;\
			COMMIT;",csvFile)
		//~ return new Promise( (resolve, reject) => {
			//~ (async () => {
				//~ const client = await this.pool.connect()
				//~ var results
				//~ try {
					//~ await client.query('BEGIN;')
					//~ await client.query("CREATE TEMPORARY TABLE obs_temp (series_id int,timestart timestamp,timeend timestamp,valor real) ON COMMIT DROP;")
					//~ await client.query('\copy obs_temp (series_id,timestart,timeend,valor) FROM \''+csvFile+"' WITH DELIMITER ','")
					//~ if(tipo.toLowerCase() == "puntual") {
						//~ results = await client.query("INSERT INTO observaciones (series_id,timestart,timeend,valor)\
							//~ SELECT series_id,timestart,timeend,valor FROM obs_temp \
							//~ ON CONFLICT(series_id,timestart,timeend) \
							//~ DO UPDATE SET valor=excluded.valor, timeupdate=excluded.timeupdate\
							//~ RETURNING *")
					//~ } else if (tipo.toLowerCase() == "areal") {
						//~ results = await client.query("INSERT INTO observaciones_areal (series_id,timestart,timeend,valor)\
							//~ SELECT series_id,timestart,timeend,valor FROM obs_temp \
							//~ ON CONFLICT(series_id,timestart,timeend) \
							//~ DO UPDATE SET valor=excluded.valor, timeupdate=excluded.timeupdate\
							//~ RETURNING *")
					//~ } else if (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") {
						//~ results = await client.query("INSERT INTO observaciones_rast (series_id,timestart,timeend,valor)\
							//~ SELECT series_id,timestart,timeend,valor FROM obs_temp \
							//~ ON CONFLICT(series_id,timestart,timeend) \
							//~ DO UPDATE SET valor=excluded.valor, timeupdate=excluded.timeupdate\
							//~ RETURNING *")
					//~ } else {
						//~ throw("bad 'tipo'")
					//~ }
					//~ client.query("COMMIT")
				//~ } catch (e) {
					//~ console.error({message:"query error",error:e})
					//~ client.query("ROLLBACK")
					//~ client.end()
					//~ reject(e)
					//~ return
				//~ }
				//~ client.end()
				//~ if(!results) {
					//~ reject("query error")
					//~ return
				//~ }
				//~ if(results.rows.length==0) {
					//~ console.log("0 registros insertados")
					//~ resolve([])
				//~ }
				//~ console.log(results.rows.length + " registros insertados")
				//~ resolve(results.rows.map(r=>{
					//~ return internal.observacion(r)
				//~ }))
			//~ })()
		//~ })	
	}
	
	// removeDuplicates(observaciones) {
	// 	var unique_date_series = []
	// 	return observaciones.filter(o=> {
	// 		if(unique_date_series.indexOf(o.series_id + "_" + o.timestart.toString()) >= 0) {
	// 			return false
	// 		} else {
	// 			unique_date_series.push(o.series_id + "_" + o.timestart.toString())
	// 			return true
	// 		}
	// 	})
	// }
	
	runSqlCommand(dbconfig,sql,input_file) {
		return new Promise( (resolve,reject) =>{
			var sys_call = "PGPASSWORD=" + dbconfig.password + " psql " + dbconfig.database + " " + dbconfig.user + " -h " + dbconfig.host + " -p " + dbconfig.port + " -c \"" + sql + "\" -w" 
			if(input_file) {
				sys_call = "less " + input_file + " | " + sys_call
			}
			exec(sys_call, (err, stdout, stderr)=>{
				if(err) {
					reject(err)
				}
				resolve(stdout)
			})
		})
	}
	
	updateObservacionById(o) {
		var observacion = new internal.observacion(o)
		//~ console.log({observacion:observacion})
		var validFieldsObs = ["timestart","timeend","timeupdate"]
		if(! observacion.id || ! observacion.tipo) {
			console.log("missing observacion.id y/o observacion.tipo")
			return Promise.reject()
		}
		var promises = []
		var fieldsObs = validFieldsObs.filter(f=>observacion[f])
		var obstable = (observacion.tipo == "areal") ? "observaciones_areal" : "observaciones"
		var valtable = (observacion.tipo == "areal") ? "valores_num_areal" : "valores_num"
		return this.pool.connect()
		.then(client=>{
			if(fieldsObs.length > 0) {
				var setfieldsObs = fieldsObs.map( (f,i) => f + "=$" + (i+1))
				var valuesObs = fieldsObs.map(f=> observacion[f])
				var promises = []
				var stmt = "UPDATE " + obstable + " SET " + setfieldsObs.join(",") + " WHERE id=$" + (fieldsObs.length+1) + " RETURNING *"
				valuesObs.push(observacion.id)
				promises.push(client.query(stmt, valuesObs))
				console.log(pasteIntoSQLQuery(stmt,valuesObs))
			} else {
				promises.push(client.query("SELECT * from " + obstable + " WHERE id=$1",[observacion.id]))
				console.log(pasteIntoSQLQuery("SELECT * from " + obstable + " WHERE id=$1",[observacion.id]))
			}
			if(observacion.valor) {
				var stmt = "UPDATE " + valtable + " SET valor=$1 WHERE obs_id=$2 RETURNING *"
				promises.push(client.query(stmt,[observacion.valor, observacion.id]))
				console.log(pasteIntoSQLQuery(stmt,[observacion.valor, observacion.id]))
			} else {
				promises.push(client.query("SELECT * from " + valtable + " WHERE obs_id=$1",[observacion.id]))
				console.log(pasteIntoSQLQuery("SELECT * from " + valtable + " WHERE obs_id=$1",[observacion.id]))
			}
			return Promise.all(promises)
			.then(result=>{
				if(!result[0].rows) {
					throw client.notifications[client.notifications.length-1].message
				}
				if(result[0].rows.length == 0) {
					if(client.notifications && client.notifications.length > 0) {
						throw client.notifications[client.notifications.length-1].message
					} else {
						throw "id de observación no encontrado"
					}
				}
				var obs = result[0].rows[0]
				if(result[1].rows) {
					obs.valor = result[1].rows[0].valor
					obs.tipo = "puntual"
					return new internal.observacion(obs)
				} else {
					throw client.notifications[client.notifications.length-1].message
				}
			})
		})
	}
		
	deleteObservacion(tipo,id) {
		if(parseInt(id).toString() == "NaN") {
			return Promise.reject("id inválido")
		}
		const obs_tabla = (tipo == "areal") ? "observaciones_areal" : (tipo == "rast" || tipo == "raster") ? "observaciones_rast" : "observaciones"
		const val_tabla = (tipo == "areal") ? "valores_num_areal" : (tipo == "rast" || tipo == "raster") ? "" : "valores_num"
		return new Promise( (resolve, reject) => {
			(async () => {
				const client = await this.pool.connect()
				try {
					await client.query('BEGIN')
					var res_v
					var deleteObsText
					if(val_tabla != "") { // PUNTUAL o AREAL
						const deleteValorText = "DELETE FROM " + val_tabla + "\
							WHERE obs_id=$1\
							RETURNING *"
						res_v = await client.query(deleteValorText,[id])
						deleteObsText = "DELETE FROM " + obs_tabla + "\
							WHERE id=$1\
							RETURNING *"
					} else { // RASTER
						deleteObsText = "DELETE FROM " + obs_tabla + "\
							WHERE id=$1\
							RETURNING series_id,id,timestart,timeend,'\\x' || encode(st_asgdalraster(valor, 'GTIff')::bytea,'hex') valor, timeupdate"
					}
					//~ var obs=res.rows[0]
					const res_o = await client.query(deleteObsText, [id])
							//~ obs.tipo=tipo
							//~ obs.valor=res.rows[0].valor
					await client.query("COMMIT")
					if(val_tabla != "") { // PUNTUAL o AREAL
						if(res_v.rows.length>0 && res_o.rows.length>0) {
							resolve(new internal.observacion({id:res_o.rows[0].id,tipo:res_o.rows[0].tipo, series_id:res_o.rows[0].series_id, timestart:res_o.rows[0].timestart, timeend:res_o.rows[0].timeend, nombre:res_o.rows[0].nombre, descripcion:res_o.rows[0].descripcion, unit_id:res_o.rows[0].unit_id, timeupdate:res_o.rows[0].timeupdate, valor:res_v.rows[0].valor}))
						} else {
							resolve({})
						}
					} else { // RASTER
						if(res_o.rows.length>0) {
							resolve(new internal.observacion({id:res_o.rows[0].id,tipo:"raster", series_id:res_o.rows[0].series_id, timestart:res_o.rows[0].timestart, timeend:res_o.rows[0].timeend, timeupdate:res_o.rows[0].timeupdate, valor:res_o.rows[0].valor}))
						} else {
							resolve({})
						}
					}
				} catch(e) {
					await client.query('ROLLBACK')
					throw e
				} finally {
					client.release()
				}
			})().catch(e => {
				console.error(e.stack)
				reject(e)
			})
		})
	}
	
	async deleteObservacionesById(tipo,id,no_send_data=false) {
		// var max_ids_per_statements = 500
		if(Array.isArray(id)) { 	
			if(no_send_data) {
				for(var i of id) {
					try {
						await this.deleteObservacion(tipo,i)
					} catch (e) {
						console.error(e.toString())
					}
				}
				return
			} else {
				return Promise.allSettled(id.map(i=>{
					return this.deleteObservacion(tipo,i)
				}))
				.then(results=>{
					return results.filter(r=>r.status == "fulfilled").map(r=>r.value)
				})
			}
		} else {
			return this.deleteObservacion(tipo,id)
			.then(result=>{
				if(no_send_data) {
					return
				} else {
					return result
				}
			})
		}
	}
	
	deleteObservaciones2(tipo,filter,options) {
		var stmt = this.build_delete_observaciones_query(tipo,filter,options)
		return this.pool.query(stmt)
		.then(result=>{
			return result.rows
		})	
	}

	deleteObservaciones(tipo,filter,options) { // con options.no_send_data devuelve count de registros eliminados, si no devuelve array de registros eliminados
		return new Promise ( (resolve, reject) => {
			tipo = (tipo.toLowerCase() == "areal") ? "areal" : (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") ? "rast" : "puntual"
			if(tipo == "rast") {
				var stmt
				var args
				var returning_clause = (options && options.no_send_data) ? " RETURNING 1 AS d" : " RETURNING series_id,id,timestart,timeend,'\\x' || encode(st_asgdalraster(valor, 'GTIff')::bytea,'hex') valor, timeupdate"
				var select_deleted_clause = (options && options.no_send_data) ? " SELECT count(d) FROM deleted" : "SELECT * FROM deleted"
				if(filter.id) {
					stmt = "WITH deleted AS (DELETE FROM observaciones_rast WHERE id=$1 " + returning_clause + ") " +  select_deleted_clause
					args = [parseInt(filter.id)]
				} else {
					var valid_filters = {series_id:"integer",timestart:"timestart",timeend:"timeend",timeupdate:"string"}
					var filter_string = control_filter(valid_filters,filter)
					if(!filter_string) {
						return Promise.reject(new Error("invalid filter value"))
					}
					stmt = "WITH delete AS (DELETE FROM observaciones_rast WHERE 1=1 " + filter_string + returning_clause + ") " + select_deleted_clause
					args=[]
				}
				resolve(this.pool.query(stmt,args)
				.then(result=>{
					if(!result.rows) {
						console.log("Error in transaction: no rows returned")
						return (options && options.no_send_data) ? 0 : []
					}
					if(result.rows.length == 0) {
						console.log("0 rows deleted")
						return (options && options.no_send_data) ? 0 : []
					}
					if (options && options.no_send_data) {
						console.log(result.rows[0].count + " rows deleted")
						return parseInt(result.rows[0].count)
					} else {
						var observaciones = []
						for(var i=0; i< result.rows.length;i++) {
							const deleted_observacion = new internal.observacion(tipo, result.rows[i].series_id, result.rows[i].timestart, result.rows[i].timeend, result.rows[i].timeupdate, result.rows[i].valor)
							deleted_observacion.id = result.rows[i].id
							observaciones.push(deleted_observacion)
						}
						return observaciones
					}
				}).catch(e=>{
					console.error(e)
				}))
			} else {
				const obs_tabla = (tipo == "areal") ? "observaciones_areal" : "observaciones"
				const val_tabla = (tipo == "areal") ? "valores_num_areal" : "valores_num"
				var deleteValorText
				var deleteObsText
				var returning_clause = (options && options.no_send_data) ? " RETURNING 1 AS d" : " RETURNING *"
				var select_deleted_clause = (options && options.no_send_data) ? " SELECT count(d) FROM deleted" : "SELECT * FROM deleted"
				if(filter.id) {
					if(Array.isArray(filter.id)) {
						if(filter.id.length == 0) {
							console.log("crud/deleteObservaciones: Nothing to delete (passed zero length id array)")
							return Promise.resolve([])
						}
						deleteValorText = "WITH deleted AS (DELETE FROM " + val_tabla + " WHERE obs_id IN (" + filter.id.join(",") + ") " + returning_clause + ") " + select_deleted_clause
						deleteObsText = "WITH deleted AS (DELETE FROM " + obs_tabla + " WHERE id IN (" + filter.id.join(",") + ") " + returning_clause + ") " + select_deleted_clause
					} else {
						deleteValorText = "WITH deleted AS (DELETE FROM " + val_tabla + " WHERE obs_id=" + parseInt(filter.id) +  + returning_clause + ") " + select_deleted_clause
						deleteObsText = "WITH deleted AS (DELETE FROM " + obs_tabla + " WHERE id=" + parseInt(filter.id)  + returning_clause + ") " + select_deleted_clause
					}
				} else {
					var valid_filters = {series_id:"integer",timestart:"timestart",timeend:"timeend",unit_id:"integer",timeupdate:"string",valor:"numeric_interval"}
					var filter_string = control_filter(valid_filters,filter)
					if(!filter_string) {
						return Promise.reject(new Error("invalid filter value"))
					}
					deleteValorText = "WITH deleted AS (DELETE FROM " + val_tabla + " USING " + obs_tabla +" \
						WHERE " + obs_tabla + ".id=" + val_tabla + ".obs_id " + filter_string + " \
						"  + returning_clause + ") " + select_deleted_clause
					deleteObsText = "		WITH deleted AS (DELETE FROM " + obs_tabla + " \
					WHERE 1=1 " + filter_string + " \
					"  + returning_clause + ") " + select_deleted_clause
				}
				// ~ console.log(deleteObsText)
				this.pool.connect( (err, client, done) => {
					const shouldAbort = err => {
						if (err) {
						  console.error('Error in transaction', err.stack)
						  client.query('ROLLBACK', err => {
							if (err) {
							  console.error('Error rolling back client', err.stack)
							}
							// release the client back to the pool
							done()
						  })
						}
						return !!err
					}
					client.query('BEGIN', err => {
						if (shouldAbort(err)) {
							reject(err)
							return
						}
						client.query(deleteValorText, (err, res) => {
							if (shouldAbort(err)) {
								reject(err)
								return
							}
							if(res.rows.length == 0) {
								console.log("No se eliminó ningun valor")
							}
							var deleted_valores={}
							if(options && options.no_send_data) {
								console.log(res.rows[0].count + " valores marked for deletion")
							} else {
								res.rows.forEach(row=> {
									deleted_valores[row.obs_id] = row.valor 
								})
							}
							client.query(deleteObsText, (err, res) => {
								if (shouldAbort(err)) {
									reject(err)
									return
								}
								if(res.rows.length == 0) {
									console.log("No se eliminó ninguna observacion")
								}
								var deleted_observaciones
								if(options && options.no_send_data) {
									console.log(res.rows[0].count + " observaciones marked for deletion")
								} else {
									deleted_observaciones = res.rows
								}
								client.query("COMMIT", err => {
									done()
									if (err) {
										console.error('Error committing transaction', err.stack)
										reject(err)
										return
									}
									if(options && options.no_send_data) {
										console.log("Deleted " + res.rows[0].count + " rows from " + obs_tabla)
										resolve(parseInt(res.rows[0].count))
									} else {
										console.log("Deleted " + deleted_observaciones.length + " observaciones from " + obs_tabla)
										var observaciones=[]
										for(var i=0; i< deleted_observaciones.length;i++) {
											var valor = deleted_valores[deleted_observaciones[i].id]
											const deleted_observacion = new internal.observacion(tipo, deleted_observaciones[i].series_id, deleted_observaciones[i].timestart, deleted_observaciones[i].timeend, deleted_observaciones[i].nombre, deleted_observaciones[i].descripcion, deleted_observaciones[i].unit_id, deleted_observaciones[i].timeupdate, valor)
											deleted_observacion.id = deleted_observaciones[i].id
											
											observaciones.push(deleted_observacion)
										}
										resolve(observaciones)
									}
								})
							})
						})
					})
				})
			}
		})
	}

	getObservacion(tipo,id,filter) {
		var stmt
		var valid_filters = {series_id:"integer",timestart:"timestart",timeend:"timeend",unit_id:"integer",timeupdate:"string"}
		var filter_string = control_filter(valid_filters,filter)
		if(!filter_string) {
			return Promise.reject(new Error("invalid filter value"))
		}
		if (tipo.toLowerCase() == "areal") {
			stmt = "SELECT observaciones_areal.*, valores_num_areal.valor,fuentes.public FROM observaciones_areal,valores_num_areal,series_areal,fuentes WHERE observaciones_areal.series_id=series_areal.id AND series_areal.fuentes_id=fuentes.id AND observaciones_areal.id=valores_num_areal.obs_id AND observaciones_areal.id=$1 " + filter_string
		} else if (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") {
			stmt = "SELECT observaciones_rast.id,observaciones_rast.series_id,observaciones_rast.timestart,observaciones_rast.timeend,ST_AsGDALRaster(observaciones_rast.valor, 'GTIff') valor,observaciones_rast.timeupdate,fuentes.public FROM observaciones_rast,series_rast,fuentes WHERE observaciones_rast.series_id=series_rast.id AND series_rast.fuentes_id=fuentes.id AND observaciones_rast.id=$1 " + filter_string
		} else {
			stmt = "SELECT observaciones.*, valores_num.valor,redes.public FROM observaciones,valores_num,series,estaciones,redes WHERE observaciones.series_id=series.id AND series.estacion_id=estaciones.unid AND estaciones.tabla=redes.tabla_id AND observaciones.id=valores_num.obs_id AND observaciones.id=$1 " + filter_string
		}
		return this.pool.query(stmt,[id])
		.then(result=>{
			if(result.rows.length<=0) {
				console.log("observación no encontrada")
				return
			}
			if(filter.public) {
				if(!result.rows[0].public) {
					throw("El usuario no posee autorización para acceder a esta observación")
				}
			}
			var obs = result.rows[0]
			const observacion = new internal.observacion(tipo, obs.series_id, obs.timestart, obs.timeend, obs.nombre, obs.descripcion, obs.unit_id, obs.timeupdate, obs.valor)
			observacion.id = obs.id
			// console.log({observacion:observacion})
			return observacion
		})
	} 

	getObservacionesGroupByClause(tipo,columns) {
		if(!columns) {
			return
		}
		if(typeof columns == "string") {
			columns = columns.split(",")
		}
		var valid_columns = {
			series_id:{},
			timestart:{},
			timeend:{},
			date:{type:"date",column:"timestart"},
			millennium:{column:"timestart",date_trunc:"millennium"},
			century:{column:"timestart",date_trunc:"century"},
			decade:{column:"timestart",date_trunc:"decade"},
			year:{column:"timestart",date_trunc:"year"},
			quarter:{column:"timestart",date_trunc:"quarter"},
			month:{column:"timestart",date_trunc:"month"},
			week:{column:"timestart",date_trunc:"week"},
			day:{column:"timestart",date_trunc:"day"},
			hour:{column:"timestart",date_trunc:"hour"},
			minute:{column:"timestart",date_trunc:"minute"},
			second:{column:"timestart",date_trunc:"second"},
			millisecond:{column:"timestart",date_trunc:"millisecond"},
			microsecond:{column:"timestart",date_trunc:"microsecond"},
			part_millennium:{column:"timestart",date_part:"millennium"},
			part_century:{column:"timestart",date_part:"century"},
			part_decade:{column:"timestart",date_part:"decade"},
			part_year:{column:"timestart",date_part:"year"},
			part_quarter:{column:"timestart",date_part:"quarter"},
			part_month:{column:"timestart",date_part:"month"},
			part_week:{column:"timestart",date_part:"week"},
			part_day:{column:"timestart",date_part:"day"},
			part_hour:{column:"timestart",date_part:"hour"},
			part_minute:{column:"timestart",date_part:"minute"},
			part_second:{column:"timestart",date_part:"second"},
			part_millisecond:{column:"timestart",date_part:"millisecond"},
			part_microsecond:{column:"timestart",date_part:"microsecond"}
		}
		var default_table
		switch (tipo) {
			case "puntual":
				valid_columns['unit_id'] = {table:"series"}
				valid_columns['var_id'] = {table:"series"}
				valid_columns['proc_id'] = {table:"series"}
				valid_columns['estacion_id'] = {table:"series"}
				valid_columns['red_id'] = {table:"redes",column:"id"}
				valid_columns['tabla_id'] = {table:"estaciones",column:"tabla"}
				valid_columns['timeupdate'] = {}
				default_table = "observaciones"
				break;
			case "areal":
				valid_columns['unit_id'] = {table:"series_areal"}
				valid_columns['var_id'] = {table:"series_areal"}
				valid_columns['proc_id'] = {table:"series_areal"}
				valid_columns['estacion_id'] = {table:"series_areal"}
				valid_columns['fuentes_id'] = {table:"series_areal"}
				default_table = "observaciones_areal"
				break;
			case "raster":
				valid_columns['unit_id'] = {table:"series_rast"}
				valid_columns['var_id'] = {table:"series_rast"}
				valid_columns['proc_id'] = {table:"series_rast"}
				valid_columns['estacion_id'] = {table:"series_rast"}
				valid_columns['fuentes_id'] = {table:"series_rast"}
				default_table = "observaciones_rast"
				break;
			default:
				break;
		} 
		return build_group_by_clause(valid_columns,columns,default_table)
	}
	
	// STUB
	getObservacionesCount(tipo,filter,options={}) { 
		var filter_string = (filter) ? this.getObservacionesFilterString(tipo,filter,options) : ""
		// console.log("filter string:" + filter_string)
		var group_by_clause = this.getObservacionesGroupByClause(tipo,options.group_by)
		var group_by_string = (group_by_clause) ? " GROUP BY " + group_by_clause.group_by.join(",") : ""
		// console.log("group by string:" + group_by_string)
		var order_by_string = (group_by_clause) ? " ORDER BY " + group_by_clause.order_by.join(",") : ""
		var stmt
		if (tipo.toLowerCase() == "areal") {
			var select_string = "count(observaciones_areal.timestart) AS count"
			if (group_by_clause) {
				group_by_clause.select.push("count(observaciones_areal.timestart) AS count")
				select_string = group_by_clause.select.join(",")
			}
			stmt =  "SELECT " + select_string + " FROM observaciones_areal,series_areal,fuentes WHERE observaciones_areal.series_id=series_areal.id AND series_areal.fuentes_id=fuentes.id " + filter_string + group_by_string + order_by_string
		} else if (tipo.toLowerCase() == "puntual") {
			var select_string = "count(observaciones.timestart) AS count"
			if(group_by_clause) {
				group_by_clause.select.push("count(observaciones.timestart) AS count")
				select_string = group_by_clause.select.join(",")
			}
			stmt = "SELECT " + select_string  + " FROM observaciones, series,estaciones,redes WHERE observaciones.series_id=series.id AND series.estacion_id=estaciones.unid AND estaciones.tabla=redes.tabla_id " + filter_string + group_by_string + order_by_string
		} else {
			var select_string = "count(observaciones_rast.timestart) AS count"
			if(group_by_clause) {
				group_by_clause.select.push("count(observaciones_rast.timestart) AS count")
				select_string = group_by_clause.select.join(",")
			}
			stmt = "SELECT " + select_string + " FROM observaciones_rast,series_rast,fuentes WHERE observaciones_rast.series_id=series_rast.id AND series_rast.fuentes_id=fuentes.id " + filter_string + filter_string + group_by_string + order_by_string
		}
		console.log(stmt)
		return this.pool.query(stmt)
		.then(result=>{
			return result.rows
		})
	}

	getObservacionesFilterString(tipo,filter,options) {
		var series_table = (tipo=="puntual") ? "series" : (tipo=="areal") ? "series_areal" : "series_rast"
		var observaciones_table = (tipo=="puntual") ? "observaciones" : (tipo=="areal") ? "observaciones_areal" : "observaciones_rast" 
		var valores_table = (tipo.toLowerCase() == "areal") ? (options && options.obs_type && options.obs_type.toLowerCase() == 'numarr') ? "valores_numarr_areal" : "valores_num_areal" : (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") ? "observaciones_rast" : (options && options.obs_type && options.obs_type.toLowerCase() == 'numarr') ? "valores_numarr" : "valores_num"
		var fuentes_table = (tipo.toLowerCase() == "areal") ? "fuentes" : (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") ? "fuentes" : "redes"
		var filter_string = "" 
		var valid_filters = {
			id:{type:"integer"},
			series_id:{type:"integer"},
			timestart:{type:"timestart"},
			timeend:{type:"timeend"},
			unit_id:{type:"integer"},
			timeupdate:{type:"date"},
			var_id:{type:"integer",table:series_table},
			proc_id:{type:"integer",table:series_table}
		}
		if(tipo=="puntual") {
			valid_filters["red_id"] = {type:"integer",table:"redes",column:"id"}
			valid_filters["tabla_id"] = {type:"integer",table:"redes"}
			valid_filters["estacion_id"] = {type:"integer",table: series_table}
		} else if(tipo=="areal") {
			valid_filters["fuentes_id"] = {type:"integer",table:series_table}
			valid_filters["area_id"] = {type:"integer",table: series_table}
		} else { // "raster"
			valid_filters["fuentes_id"] = {type:"integer",table:series_table}
			valid_filters["escena_id"] = {type:"integer",table: series_table}
		}
		filter_string += control_filter2(valid_filters,filter,observaciones_table)
		// filter_string += control_filter({id:"integer",series_id:"integer",timestart:"timestart",timeend:"timeend",unit_id:"integer",timeupdate:"string"},filter, (tipo.toLowerCase() == "areal") ? "observaciones_areal" : (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") ? "observaciones_rast" : "observaciones")
		filter_string += control_filter({valor:"numeric_interval"},filter, valores_table)
		filter_string += control_filter({public:"boolean_only_true"},filter, fuentes_table)
		console.log(filter_string)
		return filter_string
	}

	getObservacionesGuardadasFilterString(tipo,filter,options) {
		var series_table = (tipo=="puntual") ? "series" : (tipo=="areal") ? "series_areal" : "series_rast"
		var observaciones_table = (tipo=="puntual") ? "observaciones_guardadas" : (tipo=="areal") ? "observaciones_areal_guardadas" : "observaciones_rast_guardadas" 
		var fuentes_table = (tipo.toLowerCase() == "areal") ? "fuentes" : (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") ? "fuentes" : "redes"
		var filter_string = "" 
		var valid_filters = {
			id:{type:"integer"},
			series_id:{type:"integer"},
			timestart:{type:"timestart"},
			timeend:{type:"timeend"},
			unit_id:{type:"integer"},
			timeupdate:{type:"timestamp"},
			var_id:{type:"integer",table:series_table},
			proc_id:{type:"integer",table:series_table}
		}
		if(tipo=="puntual") {
			valid_filters["red_id"] = {type:"integer",table:"redes",column:"id"}
			valid_filters["tabla_id"] = {type:"integer",table:"redes"}
			valid_filters["estacion_id"] = {type:"integer",table: series_table}
		} else if(tipo=="areal") {
			valid_filters["fuentes_id"] = {type:"integer",table:series_table}
			valid_filters["area_id"] = {type:"integer",table: series_table}
		} else { // "raster"
			valid_filters["fuentes_id"] = {type:"integer",table:series_table}
			valid_filters["escena_id"] = {type:"integer",table: series_table}
		}
		filter_string += control_filter2(valid_filters,filter,observaciones_table)
		// filter_string += control_filter({id:"integer",series_id:"integer",timestart:"timestart",timeend:"timeend",unit_id:"integer",timeupdate:"string"},filter, (tipo.toLowerCase() == "areal") ? "observaciones_areal" : (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") ? "observaciones_rast" : "observaciones")
		filter_string += control_filter({valor:"numeric_interval"},filter, observaciones_table)
		return filter_string
	}

	getTipo(tipo) {
		if(tipo.toLowerCase() == "areal") {
			return "areal"
		} else if (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") {
			return "raster"
		} else {
			return "puntual"
		}
	}

	async backupObservaciones(tipo,filter,options) {
		try {
			var series = this.getSeries(tipo,filter)
		} catch (e) {
			throw(e)
		}
		if(!series.length) {
			throw("No series found")
		}
		var results = []
		for(var i in series) {
			var series_id = series[i].id
			var tipo = series[i].tipo
			var output = (options.output) ? path.resolve(options.output) : path.resolve(this.config.crud.backup_base_dir,'obs',tipo,series_id,'observaciones_' + new Date().toISOString() + ".json")
			try {
				var result = await this.streamObservaciones(tipo,{series_id:series_id,timestart:filter.timestart,timeend:filter.timeend},options,output)
			} catch(e) {
				console.error(e)
			}
			results.push(result)
		}
		return results
	}

	async streamObservaciones(tipo,filter,options,output) {
		try {
			var stmt = this.build_observaciones_query(tipo,filter,options)
			await this.streamQuery(stmt,options,output)
		} catch(e) {
			throw(e)
		}
		return
	}

	streamQuery(stmt,options,output) {
		return new Promise((resolve,reject)=>{
			var file = fs.createWriteStream(output)
			this.pool.connect((err,client,done)=>{
				if (err) {
					reject(err)
				}
				var query = new QueryStream(stmt)
				var stream = client.query(query)
				stream.on('end',()=>{
					done()
					resolve()
				})
				stream.pipe(JSONStream.stringify()).pipe(file)
			})
		})
	}

	build_delete_observaciones_query(tipo,filter,options={}) {
		tipo = this.getTipo(tipo)
		var filter_string = this.getObservacionesFilterString(tipo,filter,options) 
		//~ console.log({filter_string:filter_string})
		if(filter_string == "") {
			throw "invalid filter value"
		}
		var stmt
		if (tipo.toLowerCase() == "raster") {
			const returning_clause = (options.no_send_data  && !options.save) ? "" : "RETURNING %s.id,%s.series_id,%s.timestart,%s.timeend,%s.timeupdate,%s.valor".replace(/%s/g,"observaciones_rast")
			var select_deleted_clause = (options.no_send_data && !options.save) ? "SELECT 1" : "SELECT deleted_obs.id,deleted_obs.series_id,deleted_obs.timestart,deleted_obs.timeend,deleted_obs.timeupdate,deleted_obs.valor FROM deleted_obs WHERE deleted_obs.valor IS NOT NULL"
			if(options.save) {
				select_deleted_clause = this.build_save_query(tipo,select_deleted_clause,options)
			}
			stmt = "WITH deleted_obs AS (DELETE FROM observaciones_rast USING series_rast WHERE observaciones_rast.series_id=series_rast.id\
			" + filter_string + " \
			" + returning_clause + ") " + select_deleted_clause
		} else {
			const obs_tabla = (tipo == "areal") ? "observaciones_areal" : "observaciones"
			const val_tabla = (tipo == "areal") ? (options.obs_type && options.obs_type.toLowerCase() == 'numarr') ?"valores_numarr_areal" : "valores_num_areal" : (options.obs_type && options.obs_type.toLowerCase() == 'numarr') ? "valores_numarr" : "valores_num"
			const val_using_clause = (tipo == "areal") ? "USING observaciones_areal JOIN series_areal ON (observaciones_areal.series_id=series_areal.id)" : "USING observaciones JOIN series ON (observaciones.series_id=series.id) JOIN estaciones ON (series.estacion_id=estaciones.unid) JOIN redes ON (estaciones.tabla = redes.tabla_id)"
			const obs_using_clause = (tipo == "areal") ? "USING series_areal WHERE observaciones_areal.series_id=series_areal.id" : "USING series JOIN estaciones ON (series.estacion_id=estaciones.unid) JOIN redes ON (estaciones.tabla = redes.tabla_id) WHERE observaciones.series_id=series.id"
			const returning_clause = (options.no_send_data  && !options.save) ? "RETURNING 1 as d" : "RETURNING %s.id,%s.series_id,%s.timestart,%s.timeend,%s.nombre,%s.descripcion,%s.unit_id,%s.timeupdate".replace(/%s/g,obs_tabla)
			var select_deleted_clause = (options.no_send_data && !options.save) ? "SELECT count(d) from deleted_obs" : "SELECT deleted_obs.id,deleted_obs.series_id,deleted_obs.timestart,deleted_obs.timeend,deleted_obs.nombre,deleted_obs.descripcion,deleted_obs.unit_id,deleted_obs.timeupdate,deleted_val.valor FROM deleted_val JOIN deleted_obs ON (deleted_val.obs_id=deleted_obs.id) WHERE deleted_val.valor IS NOT NULL"
			if(options.save) {
				select_deleted_clause = this.build_save_query(tipo,select_deleted_clause,options)
			}

			stmt = "WITH deleted_val AS (DELETE FROM " + val_tabla + " " + val_using_clause + " \
						WHERE " + obs_tabla + ".id=" + val_tabla + ".obs_id " + filter_string + " \
						RETURNING obs_id,valor),\
						deleted_obs AS (DELETE FROM " + obs_tabla + " " + obs_using_clause + "\
						" + filter_string + " \
						" + returning_clause + ") " + select_deleted_clause
		}
		return stmt
	}

	build_save_query(tipo,select_clause,options) {
		var insert_stmt
		var returning_clause = (options.no_send_data) ? " RETURNING 1 AS d" : " RETURNING *"
		var on_conflict_clause = (options.no_update) ? " ON CONFLICT (series_id, timestart, timeend) DO NOTHING" : " ON CONFLICT (series_id, timestart, timeend) DO UPDATE SET timeupdate=excluded.timeupdate, valor=excluded.valor"
		switch(tipo) {
			case "puntual":
				insert_stmt = "INSERT INTO observaciones_guardadas (id,series_id,timestart,timeend,nombre,descripcion,unit_id,timeupdate,valor) " + select_clause + on_conflict_clause + returning_clause
				break;
			case "areal":
				insert_stmt = "INSERT INTO observaciones_areal_guardadas (id,series_id,timestart,timeend,nombre,descripcion,unit_id,timeupdate,valor) " + select_clause + on_conflict_clause  + returning_clause
				break;
			case "raster":
				insert_stmt = "INSERT INTO observaciones_rast_guardadas (id,series_id,timestart,timeend,timeupdate,valor) " + select_clause + on_conflict_clause  + returning_clause
		}
		var select_return_clause = (options.no_send_data) ? "SELECT count(d) FROM saved" : "SELECT * from saved"
		var stmt = ", saved AS (" + insert_stmt + ") " + select_return_clause 
		return stmt
	}

	build_observaciones_query(tipo,filter,options) {
		tipo = this.getTipo(tipo)
		var filter_string = this.getObservacionesFilterString(tipo,filter,options) 
		//~ console.log({filter_string:filter_string})
		if(filter_string == "") {
			throw "invalid filter value"
		}
		var stmt
		if (tipo.toLowerCase() == "areal") {
			var valtablename = (options) ? (options.obs_type) ? (options.obs_type.toLowerCase() == 'numarr') ? "valores_numarr_areal" : "valores_num_areal" : "valores_num_areal" : "valores_num_areal"
			stmt =  "SELECT observaciones_areal.id, \
			observaciones_areal.series_id,\
			observaciones_areal.timestart,\
			observaciones_areal.timeend,\
			observaciones_areal.nombre,\
			observaciones_areal.descripcion,\
			observaciones_areal.unit_id,\
			observaciones_areal.timeupdate,\
			" + valtablename + ".valor \
			FROM observaciones_areal, " + valtablename + ",series_areal,fuentes\
			WHERE observaciones_areal.series_id=series_areal.id \
			AND series_areal.fuentes_id=fuentes.id \
			AND observaciones_areal.id=" + valtablename + ".obs_id \
			" + filter_string + "\
			ORDER BY timestart"
		} else if (tipo.toLowerCase() == "rast" || tipo.toLowerCase() == "raster") {
			var format = (options) ? (options.format) ? options.format : "GTiff" : "GTiff"
			switch(format.toLowerCase()) {
				case "postgres":
					stmt =  "SELECT observaciones_rast.id,observaciones_rast.series_id,observaciones_rast.timestart,observaciones_rast.timeend,observaciones_rast.valor,observaciones_rast.timeupdate FROM observaciones_rast,series_rast,fuentes WHERE observaciones_rast.series_id=series_rast.id AND series_rast.fuentes_id=fuentes.id " + filter_string + " ORDER BY timestart"
					break;				case "GTiff":
					stmt =  "SELECT observaciones_rast.id,observaciones_rast.series_id,observaciones_rast.timestart,observaciones_rast.timeend,ST_AsGDALRaster(observaciones_rast.valor,'GTIff') valor,(st_summarystats(observaciones_rast.valor)).*,observaciones_rast.timeupdate FROM observaciones_rast,series_rast,fuentes WHERE observaciones_rast.series_id=series_rast.id AND series_rast.fuentes_id=fuentes.id " + filter_string + " ORDER BY timestart"
					break;
				case "hex":
					stmt =  "SELECT observaciones_rast.id,observaciones_rast.series_id,observaciones_rast.timestart,observaciones_rast.timeend,'\\x' || encode(ST_AsGDALRaster(observaciones_rast.valor,'GTIff')::bytea,'hex') valor,(st_summarystats(observaciones_rast.valor)).*,observaciones_rast.timeupdate FROM observaciones_rast,series_rast,fuentes WHERE observaciones_rast.series_id=series_rast.id AND series_rast.fuentes_id=fuentes.id " + filter_string + " ORDER BY timestart"
					break;
				case "png":
					var width = (options.width) ? parseInt(options.width) : 300
					var height = (options.height) ? parseInt(options.height) : 300
					stmt =  "SELECT id,series_id,timestart,timeend,ST_asGDALRaster(st_colormap(st_resize(st_reclass(valor,'[' || (st_summarystats(valor)).min || '-' || (st_summarystats(valor)).max || ']:1-255, ' || st_bandnodatavalue(valor) || ':0','8BUI')," + width + "," + height + "),1,'grayscale','nearest'),'PNG') valor,(st_summarystats(valor)).*,timeupdate FROM observaciones_rast,series_rast,fuentes WHERE observaciones_rast.series_id=series_rast.id AND series_rast.fuentes_id=fuentes.id " + filter_string + " ORDER BY timestart"
					break;
				case "geojson":
				case "json":
					stmt = "WITH values AS (\
								SELECT observaciones_rast.id,\
					               observaciones_rast.series_id,\
					               observaciones_rast.timestart,\
								   observaciones_rast.timeend,\
								   (ST_PixelAsCentroids(observaciones_rast.valor, 1, true)).*,\
								   (st_summarystats(observaciones_rast.valor)).*,\
								   observaciones_rast.timeupdate \
								FROM observaciones_rast,series_rast,fuentes WHERE observaciones_rast.series_id=series_rast.id AND series_rast.fuentes_id=fuentes.id " + filter_string + " ORDER BY timestart)\
							SELECT id,\
							       series_id,\
							       timestart,\
							       timeend,\
							       json_build_object('type','Feature', 'geometry', json_build_object('type', 'GeometryCollection', 'geometries', json_agg(json_build_object('type', 'Point', 'coordinates', ARRAY[ST_X(geom),ST_Y(geom),values.val]))), 'properties',json_build_object('id',values.id, 'series_id', values.series_id, 'timestart', values.timestart, 'timeend', values.timeend, 'stats', json_build_object('count',values.count, 'sum', values.sum, 'mean', values.mean, 'stddev', values.stddev, 'min', values.min, 'max', values.max))) valor,\
							       values.count,\
							       values.sum,\
							       values.mean,\
							       values.stddev,\
							       values.min,\
							       values.max\
							FROM values\
							GROUP BY id, series_id, timestart, timeend, count, sum, mean, stddev, min, max\
							ORDER BY timestart"
					break
				default:
					stmt =  "SELECT observaciones_rast.id,observaciones_rast.series_id,observaciones_rast.timestart,observaciones_rast.timeend,ST_AsGDALRaster(observaciones_rast.valor,'GTIff') valor,(st_summarystats(observaciones_rast.valor)).*,observaciones_rast.timeupdate FROM observaciones_rast,series_rast,fuentes WHERE observaciones_rast.series_id=series_rast.id AND series_rast.fuentes_id=fuentes.id " + filter_string + " ORDER BY timestart"
					break;
			}
		} else {
			var valtablename = (options && options.obs_type && options.obs_type.toLowerCase() == 'numarr') ? "valores_numarr" : "valores_num"
			stmt =  "SELECT observaciones.id,\
			observaciones.series_id,\
			observaciones.timestart,\
			observaciones.timeend,\
			observaciones.nombre,\
			observaciones.descripcion,\
			observaciones.unit_id,\
			observaciones.timeupdate,\
			"+valtablename+".valor \
			FROM observaciones, "+valtablename+",series,estaciones,redes \
			WHERE observaciones.series_id=series.id \
			AND series.estacion_id=estaciones.unid \
			AND estaciones.tabla=redes.tabla_id \
			AND observaciones.id="+valtablename+".obs_id \
			" + filter_string  + "\
			ORDER BY timestart"
		}
		if(filter.limit) {
			stmt += " LIMIT " + parseInt(filter.limit)
		}
		return stmt
	}

	async restoreObservaciones(tipo,filter,options={}) {
		var stmt = this.buildRestoreObservacionesQuery(tipo,filter,options)
		return this.pool.query(stmt)
		.then(result=>{
			return result.rows
		})
	}

	buildRestoreObservacionesQuery(tipo,filter,options={}) {
		tipo = this.getTipo(tipo)
		var filter_string = this.getObservacionesGuardadasFilterString(tipo,filter,options)
		var stmt
		if(tipo == "raster") {
			var select_return_clause = (options.no_send_data) ? "SELECT count(id) AS count FROM restored_obs" : "SELECT restored_obs.id, restored_obs.series_id, restored_obs.timestart, restored_obs.timeend, restored_obs.timeupdate, restored_obs.valor\
			FROM restored_obs"
			stmt = "WITH deleted_obs AS (\
				DELETE FROM observaciones_rast_guardadas \
				USING series_rast \
				WHERE observaciones_rast_guardadas.series_id=series_rast.id\
				" + filter_string + " \
				RETURNING observaciones_rast_guardadas.id, observaciones_rast_guardadas.series_id, observaciones_rast_guardadas.timestart, observaciones_rast_guardadas.timeend, observaciones_rast_guardadas.timeupdate, observaciones_rast_guardadas.valor\
			), restored_obs AS (\
				INSERT INTO observaciones_rast (series_id,timestart,timeend,timeupdate,valor)\
					SELECT deleted_obs.series_id, deleted_obs.timestart, deleted_obs.timeend, deleted_obs.timeupdate, deleted_obs.valor\
					FROM deleted_obs\
				ON CONFLICT (series_id,timestart,timeend)\
				DO UPDATE SET timeupdate=excluded.timeupdate, valor=excluded.valor\
				RETURNING id,series_id,timestart,timeend,timeupdate, valor\
			) " + select_return_clause
		} else if (tipo == "puntual") {
			var select_return_clause = (options.no_send_data) ? "SELECT count(id) AS count FROM restored_obs" : "SELECT restored_obs.id, restored_obs.series_id, restored_obs.timestart, restored_obs.timeend, restored_obs.nombre, restored_obs.descripcion, restored_obs.unit_id, restored_obs.timeupdate, restored_val.valor\
			FROM restored_obs\
			JOIN restored_val ON (restored_obs.id=restored_val.obs_id)"
			stmt = "WITH deleted_obs AS (\
				DELETE FROM observaciones_guardadas \
				USING series \
				JOIN estaciones ON (series.estacion_id=estaciones.unid) \
				JOIN redes ON (estaciones.tabla=redes.tabla_id) \
				WHERE observaciones_guardadas.series_id=series.id\
				" + filter_string + " \
				RETURNING observaciones_guardadas.id, observaciones_guardadas.series_id, observaciones_guardadas.timestart, observaciones_guardadas.timeend, observaciones_guardadas.nombre, observaciones_guardadas.descripcion, observaciones_guardadas.unit_id, observaciones_guardadas.timeupdate, observaciones_guardadas.valor\
			), restored_obs AS (\
				INSERT INTO observaciones (series_id,timestart,timeend,nombre,descripcion,unit_id,timeupdate)\
					SELECT deleted_obs.series_id, deleted_obs.timestart, deleted_obs.timeend, deleted_obs.nombre, deleted_obs.descripcion, deleted_obs.unit_id, deleted_obs.timeupdate\
					FROM deleted_obs\
				ON CONFLICT (series_id,timestart,timeend)\
				DO UPDATE SET nombre=excluded.nombre, descripcion=excluded.descripcion, unit_id=excluded.unit_id, timeupdate=excluded.timeupdate\
				RETURNING id,series_id,timestart,timeend,nombre,descripcion,unit_id,timeupdate\
			), restored_val AS (\
				INSERT INTO valores_num (obs_id,valor)\
					SELECT restored_obs.id, deleted_obs.valor\
					FROM restored_obs\
					JOIN deleted_obs ON (restored_obs.series_id=deleted_obs.series_id AND restored_obs.timestart=deleted_obs.timestart AND restored_obs.timeend=deleted_obs.timeend)\
					ON CONFLICT (obs_id) \
					DO UPDATE SET valor=excluded.valor  \
					RETURNING obs_id,valor\
			) " + select_return_clause
		} else { // AREAL 
			var select_return_clause = (options.no_send_data) ? "SELECT count(id) AS count FROM restored_obs" : "SELECT restored_obs.id, restored_obs.series_id, restored_obs.timestart, restored_obs.timeend, restored_obs.nombre, restored_obs.descripcion, restored_obs.unit_id, restored_obs.timeupdate, restored_val.valor\
			FROM restored_obs\
			JOIN restored_val ON (restored_obs.id=restored_val.obs_id)"
			stmt = "WITH deleted_obs AS (\
				DELETE FROM observaciones_areal_guardadas \
				USING series_areal \
				WHERE observaciones_areal_guardadas.series_id=series_areal.id\
				" + filter_string + " \
				RETURNING observaciones_areal_guardadas.id, observaciones_areal_guardadas.series_id, observaciones_areal_guardadas.timestart, observaciones_areal_guardadas.timeend, observaciones_areal_guardadas.nombre, observaciones_areal_guardadas.descripcion, observaciones_areal_guardadas.unit_id, observaciones_areal_guardadas.timeupdate, observaciones_areal_guardadas.valor\
			), restored_obs AS (\
				INSERT INTO observaciones_areal (series_id,timestart,timeend,nombre,descripcion,unit_id,timeupdate)\
					SELECT deleted_obs.series_id, deleted_obs.timestart, deleted_obs.timeend, deleted_obs.nombre, deleted_obs.descripcion, deleted_obs.unit_id, deleted_obs.timeupdate\
					FROM deleted_obs\
				ON CONFLICT (series_id,timestart,timeend)\
				DO UPDATE SET nombre=excluded.nombre, descripcion=excluded.descripcion, unit_id=excluded.unit_id, timeupdate=excluded.timeupdate\
				RETURNING id,series_id,timestart,timeend,nombre,descripcion,unit_id,timeupdate\
			), restored_val AS (\
				INSERT INTO valores_num_areal (obs_id,valor)\
					SELECT restored_obs.id, deleted_obs.valor\
					FROM restored_obs\
					JOIN deleted_obs ON (restored_obs.series_id=deleted_obs.series_id AND restored_obs.timestart=deleted_obs.timestart AND restored_obs.timeend=deleted_obs.timeend)\
					ON CONFLICT (obs_id) \
					DO UPDATE SET valor=excluded.valor  \
					RETURNING obs_id,valor\
			) " + select_return_clause
		}
		return stmt
	}

	async guardarObservaciones(tipo,filter,options={}) {
		tipo = this.getTipo(tipo)
		try {
			var select_stmt = this.build_observaciones_query(tipo,filter,options)
			var insert_stmt
			var returning_clause = (options.no_send_data) ? " RETURNING 1 AS d" : " RETURNING *"
			var on_conflict_clause = (options.no_update) ? " ON CONFLICT (series_id, timestart, timeend) DO NOTHING" : " ON CONFLICT (series_id, timestart, timeend) DO UPDATE SET timeupdate=excluded.timeupdate, valor=excluded.valor"
			switch(tipo) {
				case "puntual":
					insert_stmt = "INSERT INTO observaciones_guardadas (id,series_id,timestart,timeend,nombre,descripcion,unit_id,timeupdate,valor) " + select_stmt + on_conflict_clause + returning_clause
					break;
				case "areal":
					insert_stmt = "INSERT INTO observaciones_areal_guardadas (id,series_id,timestart,timeend,nombre,descripcion,unit_id,timeupdate,valor) " + select_stmt + on_conflict_clause  + returning_clause
					break;
				case "raster":
					options.format = "postgres"
					insert_stmt = "INSERT INTO observaciones_rast_guardadas (id,series_id,timestart,timeend,valor,timeupdate) " + select_stmt + on_conflict_clause  + returning_clause
			}
			//~ console.log({stmt:stmt})
			var res = await this.pool.query(insert_stmt)
			return res.rows
		} catch(e) {
			throw(e)
		}
	}


	async getObservaciones(tipo,filter,options) {
		try {
			var stmt = this.build_observaciones_query(tipo,filter,options)
			var res = await this.pool.query(stmt)
		} catch(e) {
			throw(e)
		}	//~ console.log({stmt:stmt})
		var observaciones = [] // new internal.observaciones
		for(var i = 0; i < res.rows.length; i++) {
			var obs=res.rows[i]
			if(tipo.toLowerCase()=="rast") {
				const observacion = new internal.observacion({tipo:tipo, series_id:obs.series_id, timestart:obs.timestart, timeend:obs.timeend, nombre:obs.nombre, descripcion:obs.descripcion, unit_id: obs.unit_id, timeupdate: obs.timeupdate, valor:obs.valor, stats: {count: obs.count, mean: obs.mean, stddev: obs.stddev, min: obs.min, max: obs.max}})
				observacion.id = obs.id
				observaciones.push(observacion)
			} else if (options && options.asArray) {
				observaciones.push([obs.timestart, obs.timeend, obs.valor, obs.id])
			} else {
				const observacion = new internal.observacion(tipo, obs.series_id, obs.timestart, obs.timeend, obs.nombre, obs.descripcion, obs.unit_id, obs.timeupdate, obs.valor)
				observacion.id = obs.id
				observaciones.push(observacion)
			}
		}
		if(options && options.pivot) {
			if(options.dt && options.t_offset) {
				// ---
			} else if(filter.var_id) {
				const var_id_filter = (Array.isArray(filter.var_id)) ? filter.var_id[0] : filter.var_id
				try {
					var variable = await this.getVar(var_id_filter)
					options.dt = variable.dt
					options.t_offset = variable.t_offset
				} catch(e) {
					throw(e)
				}
			} else if(filter.series_id) { // toma dt y t_offset de 
				const series_id_filter = (Array.isArray(filter.series_id)) ? filter.series_id[0] : filter.series_id
				try {
					var serie = await this.getSerie(filter.tipo,series_id_filter)
					options.dt = serie.var.dt
					options.t_offset = serie.var.t_offset
				} catch(e) {
					throw(e)
				}
			} 
			else {
				// throw("Pivot error: missing dt, var_id or series_id")
				options.dt = {days:1}
				options.t_offset = {days:1}
			}
			options.dt = timeSteps.createInterval(options.dt)
			options.t_offset = timeSteps.createInterval(options.t_offset)
			options.timestart = filter.timestart
			options.timeend = filter.timeend
			options.pivot = true
			observaciones = new internal.observaciones(observaciones,options)
		} else {
			//~ console.log({observaciones:observaciones})
			observaciones = new internal.observaciones(observaciones,options)
		}
		return observaciones
	}

	getObsTable(tipo="puntual") {
		var t  = tipo.toLowerCase()
		return (t == "areal") ? "observaciones_areal" : (t == "rast" || t == "raster") ? "observaciones_rast" : "observaciones"
	}

	getValTable(tipo="puntual") {
		var t  = tipo.toLowerCase()
		return (t == "areal") ? "valores_num_areal" : (t == "rast" || t == "raster") ? "observaciones_rast" : "valores_num"
	}

	async getObservacionesDateRange(tipo,filter,options) {
		var tipo = this.getTipo(tipo)
		var obs_table = this.getObsTable(tipo)
		var filter_string = this.getObservacionesFilterString(tipo,filter,options) 
		//~ console.log({filter_string:filter_string})
		if(filter_string == "") {
			throw "invalid filter value"
		}
		try {
			var result = await this.pool.query("SELECT min(timestart),max(timestart) FROM " + obs_table + " WHERE 1=1 " + filter_string)
			return result.rows[0]
		} catch(e) {
			throw(e)
		}
	}
	
	async getObservacionesRTS(tipo,filter={},options={},serie) {
		//~ console.log({options:options})
		if(options.skip_nulls || !filter.series_id || Array.isArray(filter.series_id)) {
			return this.getObservaciones(tipo,filter,options)
		}
		if(!filter.timestart || !filter.timeend) {
			if(!filter.timeupdate) {
				// return Promise.reject("Faltan parametros: series_id, timestart, timeend, timeupdate")
				throw("Faltan parametros: series_id, timestart, timeend, timeupdate")
			}
		}
		var serie_result
		if(serie) {
			if(filter.public && !serie.estacion.public) {
				console.log("usuario no autorizado para acceder a la serie seleccionada")
				// return Promise.reject("usuario no autorizado para acceder a la serie seleccionada")
				throw("usuario no autorizado para acceder a la serie seleccionada")
			}
			serie_result = serie
		} else {
			try {
				serie_result = await this.getSerie(tipo,filter.series_id,undefined,undefined,undefined,filter.public) // tipo,id,timestart,timeend,options={},isPublic
			} catch(e) {
				throw(e)
			}
		}
		serie = serie_result
		if(!serie) {
			throw("Serie no encontrada")
		}
		if(!serie.var.timeSupport) {
			// console.log("no timeSupport")
			var getObsFilter = {...filter}
			getObsFilter.series_id = serie.id
			return this.getObservaciones(tipo,getObsFilter)
		} 
		try {
			var dateRange = await this.getObservacionesDateRange(tipo,{series_id:serie.id,timestart:filter.timestart,timeend:filter.timeend})
		} catch(e) {
			throw(e)
		}
		if(!dateRange.min) {
			console.error("No observaciones found in date range")
			return []
		}
		var timestart = dateRange.min // new Date(filter.timestart)
		var timeend =  dateRange.max // new Date(filter.timeend)
		var interval = timeSteps.interval2epochSync(serie.var.timeSupport)
		// console.log("interval:" + interval)
		if(!interval) {
			// console.log("timeSupport inválido o nulo")
			if(!options.obs_type && serie.var.type) {
				options.obs_type = serie.var.type
			}
			return  this.getObservaciones(tipo,{series_id:serie.id,timestart:timestart,timeend:timeend,timeupdate:filter.timeupdate},options)
		}
		var interval_string = timeSteps.interval2string(serie.var.timeSupport)
		const obs_tabla = this.getObsTable(tipo)
		const val_tabla = this.getValTable(tipo)
		//~ console.log({keys:Object.keys(serie.var.def_hora_corte).join(","),tostr:timeSteps.interval2string(serie.var.def_hora_corte)})
		var t_offset = (serie.fuente && serie.fuente.hora_corte) ? timeSteps.interval2string(serie.fuente.hora_corte) : (serie.var.def_hora_corte)  ? timeSteps.interval2string(serie.var.def_hora_corte) : "00:00:00"
		// console.log("t_offset:" + t_offset)
		var valuequerystring = (tipo == "rast" || tipo == "raster") ? this.rasterValueQueryString(options.format,options) : val_tabla + ".valor"
		// console.log(valuequerystring)
		var query = "WITH seq AS (\
			SELECT generate_series('" + timestart.toISOString() + "'::date + $3::interval,'" + timeend.toISOString() + "'::timestamp,$2::interval) date)\
			SELECT " + obs_tabla + ".id, \
					$1 AS series_id, \
					seq.date timestart, \
					seq.date + $2::interval AS timeend, \
					" + obs_tabla + ".timeupdate,\
					" + valuequerystring + " valor\
			FROM seq\
			LEFT JOIN " + obs_tabla + " ON (\
				" + obs_tabla + ".series_id=$1\
				AND seq.date=" + obs_tabla + ".timestart\
				AND seq.date>=$4\
				AND seq.date<=$5\
			) "
		if(tipo == "puntual" || tipo == "areal") {
			query += "\
			LEFT JOIN " + val_tabla + " ON (\
				" + obs_tabla + ".id=" + val_tabla + ".obs_id\
			) "
		}
		var query_params = [serie.id, interval_string, t_offset, timestart, timeend]
		if(filter.timeupdate) {
			query += " WHERE " + obs_tabla + ".timeupdate=$6"
			query_params.push(filter.timeupdate)
		}
		query += "ORDER BY seq.date"
		console.log(pasteIntoSQLQuery(query,[serie.id,interval_string,t_offset, timestart, timeend]))
		try {
			var result = await this.pool.query(query, query_params)
		} catch(e){
			throw(e)
		}
		var count = result.rows.map(r=>{
			return (r.valor !== null) ? 1 : 0
		}).reduce((a,b)=>a+b)
		if(count == 0) {
			console.log("No se encontraron registros")
			return []
		}
		//~ console.log({options:options})
		var observaciones = []
		for(var i = 0; i < result.rows.length; i++) {
			var obs=result.rows[i]
			if(tipo.toLowerCase()=="rast") {
				const observacion = new internal.observacion({tipo:tipo, series_id:obs.series_id, timestart:obs.timestart, timeend:obs.timeend, nombre:obs.nombre, descripcion:obs.descripcion, unit_id: obs.unit_id, timeupdate: obs.timeupdate, valor:obs.valor, stats: {count: obs.count, mean: obs.mean, stddev: obs.stddev, min: obs.min, max: obs.max}})
				observacion.id = obs.id
				observaciones.push(observacion)
			} else if (options) {
				if(options.asArray) {
					observaciones.push([obs.timestart, obs.timeend, obs.valor, obs.id])
				} else {
					const observacion = new internal.observacion(tipo, obs.series_id, obs.timestart, obs.timeend, obs.nombre, obs.descripcion, obs.unit_id, obs.timeupdate, obs.valor)
					observacion.id = obs.id
					observaciones.push(observacion)
				}
			} else {
				const observacion = new internal.observacion(tipo, obs.series_id, obs.timestart, obs.timeend, obs.nombre, obs.descripcion, obs.unit_id, obs.timeupdate, obs.valor)
				observacion.id = obs.id
				observaciones.push(observacion)
			}
		}
		//~ console.log(observaciones)
		return observaciones
	}
	
	rasterValueQueryString(format,options) {
		switch(format) {
			case "GTiff":
				return "ST_AsGDALRaster(observaciones_rast.valor,'GTIff')"
				break;
			case "hex":
				return "'\\x' || encode(ST_AsGDALRaster(observaciones_rast.valor,'GTIff')::bytea,'hex')"
				break;
			case "png":
				var width = (options && options.width) ? options.width : 300
				var height = (options && options.height) ? options.height : 300
				return "ST_asGDALRaster(st_colormap(st_resize(st_reclass(valor,'[' || (st_summarystats(valor)).min || '-' || (st_summarystats(valor)).max || ']:1-255, ' || st_bandnodatavalue(valor) || ':0','8BUI')," + width + "," + height + "),1,'grayscale','nearest'),'PNG')"
				break;
			default:
				return "ST_AsGDALRaster(observaciones_rast.valor,'GTIff')"
		}
	}

	
	getObservacionesTimestart(tipo, filter, options) {		// DEVUELVE ARRAY DE OBSERVACIONES CON EL TIMESTART EXACTO INDICADO Y OTROS FILTROS 
		if(!filter) {
			return Promise.reject("filter missing")
		}
		if(!filter.timestart && !filter.date) {
			return Promise.reject("timestart missing")
		}
		var date = (filter.timestart) ? new Date(filter.timestart) : (filter.date) ? new Date(filter.date) : new Date()
		filter.timestart = date
		if(date=='Invalid Date') {
			return Promise.reject("Bad date")
		}
		var series_id = filter.series_id
		var estacion_id = filter.estacion_id
		var area_id = filter.area_id
		var var_id = filter.var_id
		var proc_id = (filter.proc_id) ? filter.proc_id : [1,2] 
		var precision = (filter.precision) ? filter.precision : 3
		var fuentes_id = filter.fuentes_id
		if(!/^\d+$/.test(precision)) {
			return Promise.reject("Bad precision")
		}
		if(!date instanceof Date) {
			return Promise.reject("Bad date")
		}
		var series_table = (tipo.toLowerCase()=='areal') ? "series_areal" : "series"
		var obs_table = (tipo.toLowerCase()=='areal') ? "observaciones_areal" : "observaciones"
		var val_table = (tipo.toLowerCase()=='areal') ? "valores_num_areal" : "valores_num"
		var est_column = (tipo.toLowerCase()=='areal') ? "area_id" : "estacion_id"
		var public_table = (tipo.toLowerCase()=='areal') ? "fuentes" : "redes"
		var public_filter = ""
		if(filter.public) {
			public_filter = " AND " + public_table + ".public=true "
		}
		var query
		if(series_id) {   																			// CON SERIES_ID
			if(Array.isArray(series_id)) {
				series_id= series_id.join(",")
			} 
			if(!/^\d+(,\d+)*$/.test(series_id)) {
				console.error("bad series_id")
				return Promise.reject("bad series_id")
			}
			var stmt
			if(tipo.toLowerCase()=='areal') {
				stmt = "SELECT observaciones_areal.timestart,\
								observaciones.timeend,\
								observaciones_areal.series_id,\
								series_areal.var_id,\
								series_areal.proc_id,\
								series_areal.unit_id,\
								series_areal.fuentes_id,\
								series_areal.area_id,\
							   round(valores_num_areal.valor::numeric,$2::int) valor,\
							   fuentes.public\
						FROM observaciones_areal,valores_num_areal,series_areal,fuentes\
						WHERE observaciones_areal.id=valores_num_areal.obs_id\
						AND series_areal.id=observaciones_areal.series_id\
						AND observaciones_areal.series_id IN ("+series_id+")\
						AND observaciones_areal.timestart=$1\
						AND series_areal.fuentes_id=fuentes.id " + public_filter + "\
						ORDER BY observaciones_areal.series_id;"
			} else if(tipo.toLowerCase()=="puntual") {
				stmt = "SELECT observaciones.timestart,\
								observaciones.timeend,\
								observaciones.series_id,\
								series.var_id,\
								series.proc_id,\
								series.unit_id,\
								series.estacion_id,\
							   round(valores_num.valor::numeric,$2::int) valor,\
							   redes.public\
						FROM observaciones,valores_num,series,estaciones,redes\
						WHERE observaciones.id=valores_num.obs_id\
						AND series.id=observaciones.series_id\
						AND observaciones.series_id IN ("+series_id+")\
						AND observaciones.timestart=$1\
						AND series.estacion_id=estaciones.unid\
						AND estaciones.tabla=redes.tabla_id " + public_filter + "\
						ORDER BY observaciones.series_id;"
			} else {
				return Promise.reject("Bad tipo")
			}
			query = this.pool.query(stmt,[date,precision])
		} else {													// SIN SERIES_ID
			var stmt
			if (tipo.toLowerCase()=='areal') {						// AREAL
				var area_id_filter = ""
				if(area_id) {
					if(Array.isArray(area_id)) {
						area_id = area_id.join(",")
					}
					if(!/^\d+(,\d+)*$/.test(area_id)) {
						console.error("bad area_id")
						return Promise.reject("bad area_id")
					}
					area_id_filter = " AND series_areal.area_id IN ("+area_id+")"
				}
				if(!fuentes_id) {
					return Promise.reject("fuentes_id or series_id missing")
				}
				if(Array.isArray(fuentes_id)) {
					fuentes_id = fuentes_id.join(",")
				}
				if(!/^\d+(,\d+)*$/.test(fuentes_id)) {
					return Promise.reject("bad fuentes_id")
				}
				stmt = "SELECT observaciones_areal.timestart,\
							observaciones.timeend,\
							observaciones_areal.series_id,\
							series_areal.var_id,\
							series_areal.proc_id,\
							series_areal.unit_id,\
							series_areal.fuentes_id,\
							series_areal.area_id,\
							round(valores_num_areal.valor::numeric,$2::int) valor,\
							fuentes.public\
						FROM observaciones_areal,valores_num_areal,series_areal,fuentes\
						WHERE observaciones_areal.id=valores_num_areal.obs_id\
						AND series_areal.id=observaciones_areal.series_id\
						AND observaciones_areal.timestart=$1\
						"+area_id_filter+"\
						AND series_areal.fuentes_id IN ("+fuentes_id+")\
						AND series_areal.fuentes_id=fuentes.id " + public_filter + "\
						ORDER BY observaciones_areal.series_id;"
			} else {												// PUNTUAL, sin SERIES_ID
				var estacion_id_filter = ""
				if(estacion_id) {
					if(Array.isArray(estacion_id)) {
						estacion_id = estacion_id.join(",")
						console.log("estacion_id is array")
					}
					if(!/^\d+(,\d+)*$/.test(estacion_id)) {
						console.error("bad estacion_id")
						return Promise.reject("bad estacion_id")
					}
				estacion_id_filter = " AND series.estacion_id IN ("+estacion_id+")"
				}
				if(!var_id) {
					return Promise.reject("var_id or series_id missing")
				}
				if(Array.isArray(var_id)) {
					var_id = var_id.join(",")
				}
				if(!/^\d+(,\d+)*$/.test(var_id)) {
					//~ console.error("bad var_id")
					return Promise.reject("bad var_id")
				}
				if(Array.isArray(proc_id)) {
					proc_id=proc_id.join(",")
				}
				if(!/^\d+(,\d+)*$/.test(proc_id)) {
					//~ console.error("bad proc_id")
					return Promise.reject("bad proc_id")
				}
				stmt = "SELECT observaciones.timestart,\
							observaciones.timeend,\
							observaciones.series_id,\
							series.var_id,\
							series.proc_id,\
							series.unit_id,\
							series.estacion_id,\
						   round(valores_num.valor::numeric,$2::int) valor,\
						   redes.public\
					FROM observaciones,valores_num,series,estaciones,redes\
					WHERE observaciones.id=valores_num.obs_id\
					AND series.id=observaciones.series_id\
					AND series.var_id IN ("+var_id+")\
					AND series.proc_id IN ("+proc_id+")\
					AND observaciones.timestart=$1\
					"+estacion_id_filter+"\
					AND series.estacion_id=estaciones.unid\
					AND estaciones.tabla=redes.tabla_id " + public_filter + "\
					ORDER BY observaciones.series_id;"
			}
			//~ console.log(stmt)
			query = this.pool.query(stmt,[date,precision])
		}
		return query.then(result=>{
			if(!result.rows) {
				return []
			}
			if(result.rows.length == 0) {
				console.log("no se encontraron observaciones")
				return []
			}
			var observaciones = result.rows
			console.log("got "+observaciones.length+" obs for timestart:" + filter.timestart.toISOString())
			if(options.format) {
				if(options.format.toLowerCase() == "geojson") {
					if(tipo.toLowerCase() == "areal") {
						return this.getAreas({series_id:observaciones.map(obs=>obs.area_id)})
						.then(areas=>{
							//~ var features = []
							var o = []
							areas.forEach(area=>{
								observaciones.forEach(obs=>{
									if(area.id == obs.area_id) {
										obs.geom = area.geom
										obs.area_nombre = area.nombre
										obs.valor = parseFloat(obs.valor)
										o.push(obs)
									}
								})
							})
							return o
						})
					} else { // puntual
						return this.getEstaciones({series_id:observaciones.map(obs=>obs.area_id)})
						.then(estaciones=>{
							//~ var features = []
							var o = []
							estaciones.forEach(estacion=>{
								observaciones.forEach(obs=>{
									if(estacion.id == obs.estacion_id) {
										obs.geom = estacion.geom
										obs.estacion_nombre = estacion.nombre
										obs.fuentes_id = estacion.tabla
										obs.id_externo = estacion.id_externo
										obs.valor = parseFloat(obs.valor)
										o.push(obs)
									}
								})
							})
							return o
						})
					}
				} else {
					return observaciones
				}
			} else {
				return observaciones
			}
		})
	}

	getObservacionesDia(tipo, filter, options) {
//		date=new Date(),tipo="puntual",series_id,estacion_id,var_id,proc_id=[1,2],agg_func="avg")
		return new Promise( (resolve,reject) => {
			if(!filter) {
				reject("filter missing")
				return
			}
			var date = (filter.date) ? new Date(filter.date) : new Date()
			if(date=='Invalid Date') {
				reject("Bad date")
				return
			}
			date = new Date(date.getTime() + date.getTimezoneOffset()*60*1000).toISOString().substring(0,10)
			var series_id = filter.series_id
			var estacion_id = filter.estacion_id
			var area_id = filter.area_id
			var var_id = filter.var_id
			var proc_id = (filter.proc_id) ? filter.proc_id : [1,2] 
			var agg_func = (filter.agg_func) ? filter.agg_func : "avg"
			var precision = (filter.precision) ? filter.precision : 3
			var fuentes_id = filter.fuentes_id
			if(!/^\d+$/.test(precision)) {
				reject("Bad precision")
				return
			}
			if(!date instanceof Date) {
				reject("Bad date")
				return
			}
			if(! {avg:1,sum:1,min:1,max:1,count:1}[agg_func.toLowerCase()]) {
				reject("Bad agg_func")
				return
			}
			var series_table = (tipo.toLowerCase()=='areal') ? "series_areal" : "series"
			var obs_table = (tipo.toLowerCase()=='areal') ? "observaciones_areal" : "observaciones"
			var val_table = (tipo.toLowerCase()=='areal') ? "valores_num_areal" : "valores_num"
			var est_column = (tipo.toLowerCase()=='areal') ? "area_id" : "estacion_id"
			var public_table = (tipo.toLowerCase()=='areal') ? "fuentes" : "redes"
			var public_filter = ""
			if(filter.public) {
				public_filter = " AND " + public_table + ".public=true "
			}
		
			if(series_id) {
				if(Array.isArray(series_id)) {
					series_id= series_id.join(",")
				} 
				if(!/^\d+(,\d+)*$/.test(series_id)) {
					console.error("bad series_id")
					reject("bad series_id")
					return
				}
				var stmt
				if(tipo.toLowerCase()=='areal') {
					stmt = "SELECT observaciones_areal.timestart::date::text date,\
									observaciones_areal.series_id,\
									series_areal.var_id,\
									series_areal.proc_id,\
									series_areal.unit_id,\
									series_areal.fuentes_id,\
									series_areal.area_id,\
								   round("+agg_func+"(valores_num_areal.valor)::numeric,$2::int) valor,\
								   fuentes.public\
							FROM observaciones_areal,valores_num_areal,series_areal,fuentes\
							WHERE observaciones_areal.id=valores_num_areal.obs_id\
							AND series_areal.id=observaciones_areal.series_id\
							AND observaciones_areal.series_id IN ("+series_id+")\
							AND observaciones_areal.timestart::date=$1::date\
							AND series_areal.fuentes_id=fuentes.id " + public_filter + "\
							GROUP BY observaciones_areal.timestart::date::text,\
									 observaciones_areal.series_id,\
									series_areal.var_id,\
									series_areal.proc_id,\
									series_areal.unit_id,\
									series_areal.fuentes_id,\
									series_areal.area_id,\
									fuentes.public\
							ORDER BY observaciones_areal.series_id;"
				} else if(tipo.toLowerCase()=="puntual") {
					stmt = "SELECT observaciones.timestart::date::text date,\
									observaciones.series_id,\
									series.var_id,\
									series.proc_id,\
									series.unit_id,\
									series.estacion_id,\
								   round("+agg_func+"(valores_num.valor)::numeric,$2::int) valor,\
								   redes.public\
							FROM observaciones,valores_num,series,estaciones,redes\
							WHERE observaciones.id=valores_num.obs_id\
							AND series.id=observaciones.series_id\
							AND observaciones.series_id IN ("+series_id+")\
							AND observaciones.timestart::date=$1::date\
							AND series.estacion_id=estaciones.unid\
							AND estaciones.tabla=redes.tabla_id " + public_filter + "\
							GROUP BY observaciones.timestart::date::text,\
									 observaciones.series_id,\
									series.var_id,\
									series.proc_id,\
									series.unit_id,\
									series.estacion_id,\
									redes.public\
							ORDER BY observaciones.series_id;"
				} else {
					reject("Bad tipo")
					return
				}
				resolve(this.pool.query(stmt,[date,precision]))
				return
			} else {
				var stmt
				if (tipo.toLowerCase()=='areal') {
					var area_id_filter = ""
					if(area_id) {
						if(Array.isArray(area_id)) {
							area_id = area_id.join(",")
						}
						if(!/^\d+(,\d+)*$/.test(area_id)) {
							console.error("bad area_id")
							reject("bad area_id")
							return
						}
						area_id_filter = " AND series_areal.area_id IN ("+area_id+")"
					}
					if(!fuentes_id) {
						reject("fuentes_id or series_id missing")
						return
					}
					if(Array.isArray(fuentes_id)) {
						fuentes_id = fuentes_id.join(",")
					}
					if(!/^\d+(,\d+)*$/.test(fuentes_id)) {
						reject("bad fuentes_id")
						return
					}
					stmt = "SELECT observaciones_areal.timestart::date::text date,\
									observaciones_areal.series_id,\
									series_areal.var_id,\
									series_areal.proc_id,\
									series_areal.unit_id,\
									series_areal.fuentes_id,\
									series_areal.area_id,\
								   round("+agg_func+"(valores_num_areal.valor)::numeric,$2::int) valor,\
								   fuentes.public\
							FROM observaciones_areal,valores_num_areal,series_areal,fuentes\
							WHERE observaciones_areal.id=valores_num_areal.obs_id\
							AND series_areal.id=observaciones_areal.series_id\
							AND observaciones_areal.timestart::date=$1::date\
							AND series_areal.fuentes_id=fuentes.id " + public_filter + "\
							"+area_id_filter+"\
							AND series_areal.fuentes_id IN ("+fuentes_id+")\
							GROUP BY observaciones_areal.timestart::date::text,\
									 observaciones_areal.series_id,\
									series_areal.var_id,\
									series_areal.proc_id,\
									series_areal.unit_id,\
									series_areal.area_id,\
									series_areal.fuentes_id,\
									fuentes.public\
							ORDER BY observaciones_areal.series_id;"
				} else {
					var estacion_id_filter = ""
					if(estacion_id) {
						if(Array.isArray(estacion_id)) {
							estacion_id = estacion_id.join(",")
							console.log("estacion_id is array")
						}
						if(!/^\d+(,\d+)*$/.test(estacion_id)) {
							console.error("bad estacion_id")
							reject("bad estacion_id")
							return
						}
						estacion_id_filter = " AND series.estacion_id IN ("+estacion_id+")"
					}
					if(!var_id) {
						reject("var_id or series_id missing")
						return
					}
					if(Array.isArray(var_id)) {
						var_id = var_id.join(",")
					}
					if(!/^\d+(,\d+)*$/.test(var_id)) {
						//~ console.error("bad var_id")
						reject("bad var_id")
						return
					}
					if(Array.isArray(proc_id)) {
						proc_id=proc_id.join(",")
					}
					if(!/^\d+(,\d+)*$/.test(proc_id)) {
						//~ console.error("bad proc_id")
						reject("bad proc_id")
						return
					}
					stmt = "SELECT observaciones.timestart::date::text date,\
								observaciones.series_id,\
								series.var_id,\
								series.proc_id,\
								series.unit_id,\
								series.estacion_id,\
							   round("+agg_func+"(valores_num.valor)::numeric,$2::int) valor,\
							   redes.public\
						FROM observaciones,valores_num,series,estaciones,redes\
						WHERE observaciones.id=valores_num.obs_id\
						AND series.id=observaciones.series_id\
						AND series.var_id IN ("+var_id+")\
						AND series.proc_id IN ("+proc_id+")\
						AND observaciones.timestart::date=$1::date\
						AND series.estacion_id=estaciones.unid\
						AND estaciones.tabla=redes.tabla_id " + public_filter + "\
						"+estacion_id_filter+"\
						GROUP BY observaciones.timestart::date::text,\
								 observaciones.series_id,\
								series.var_id,\
								series.proc_id,\
								series.unit_id,\
								series.estacion_id,\
								redes.public\
						ORDER BY observaciones.series_id;"
				}
				//~ console.log(stmt)
				resolve(this.pool.query(stmt,[date,precision]))
				return
			}
		})
		.then(result=>{
			if(!result.rows) {
				return []
			}
			console.log("got "+result.rows.length+" daily obs")
			return result.rows
		})
	}

	getRastFromCube(fuentes_id,timestart,timeend,forecast_date,isPublic) {
		if(!fuentes_id) {
			return Promise.reject("Missing fuentes_id")
		}
		return this.getFuente(fuentes_id,isPublic)
		.then(fuente=>{
			if(!fuente) {
				return Promise.reject("Data cube not found")
			}
			var data_table = fuente.data_table
			var data_column = (fuente.data_column) ? fuente.data_column : "rast"
			var date_column = (fuente.date_column) ? fuente.date_column : "date"
			if(!fuente.fd_column) { // 	no forecast date
				if(!timestart || !timeend) {
					return Promise.reject("missing timestart and/or timeend")
				}
				timestart = new Date(timestart)
				if(timestart.toString() == "Invalid Date") {
					return Promise.reject("timestart is invalid")
				}
				timeend = new Date(timeend)
				if(timeend.toString() == "Invalid Date") {
					return Promise.reject("timeend is invalid")
				}
				var query = "SELECT " + date_column + "::timestamp AS timestart,ST_AsGDALRaster(" + data_column + ",'GTIff') AS valor FROM " + data_table + " WHERE " + date_column + ">=$1::timestamptz::timestamp AND " + date_column + "<$2::timestamptz::timestamp ORDER BY " + date_column
				return this.pool.query(query,[timestart,timeend])
			} else {
				// 	forecast date
				var fd_column = fuente.fd_column
				var date_filter = ""
				if(forecast_date) {
					forecast_date = new Date(forecast_date)
					if(forecast_date.toString() == "Invalid Date") {
						return Promise.reject("Invalid forecast date")
					}
					date_filter += " AND " + fd_column + "='" + forecast_date.toISOString() + "'::timestamptz::timestamp"
				}
				if(timestart) {
					timestart = new Date(timestart)
					if(timestart.toString() == "Invalid Date") {
						return Promise.reject("timestart is invalid")
					}
					date_filter += " AND " + date_column + ">='" + timestart.toISOString() + "'::timestamptz:timestamp"
				}
				if(timeend) {
					timeend = new Date(timeend)
					if(timeend.toString() == "Invalid Date") {
						return Promise.reject("timeend is invalid")
					}
					date_filter += " AND " + date_column + "<'" + timeend.toISOString() + "'::timestamptz:timestamp"
				}
				if(date_filter == "") {
					return Promise.reject("missing forecast date or timestart or timeend")
				}
				var query = "SELECT id," + fd_column + "::timestamp AS forecast_date," + date_column + "::timestamp AS timestart,ST_AsGDALRaster(" + data_column + ",'GTIff') AS valor FROM " + data_table + " WHERE 1=1 " + date_filter + " ORDER BY " + fd_column + "," + date_column
				return this.pool.query(query)
			}
		})
		.then(result=>{
			if(!result.rows) {
				return []
			}
			return result.rows.map(r=>{
				r.timeend = r.timestart
				r.tipo = "raster"
				return r
			})
		})
	}

	upsertRastFromCube(fuentes_id,timestart,timeend,forecast_date,isPublic,series_id) {
		if(!series_id) {
			return Promise.reject("Missing destination series_id (from series_rast)")
		}
		return this.getRastFromCube(fuentes_id,timestart,timeend,forecast_date,isPublic)
		.then(results=>{
			if(!results.length) {
				return Promise.reject("Nothing found")
			}
			results = results.map(r=>{
				r.series_id = series_id
				return r
			})
			return this.upsertObservaciones(results)
		})
	}

	rastExtract(series_id,timestart,timeend,options,isPublic) {
		return this.getSerie("raster",series_id,undefined,undefined,undefined,isPublic)
		.then(serie=>{
			if(!serie) {
				console.error("serie no encontrada")
				return
			}
			if(!serie.id) {
				console.log("serie no encontrada")
				return
			}
			options.bbox = (!options.bbox) ? serie.fuente.def_extent : options.bbox
			options.pixel_height = (!options.pixel_height) ? serie.fuente.def_pixel_height : options.pixel_height
			options.pixel_width = (!options.pixel_width) ? serie.fuente.def_pixel_width : options.pixel_width
			options.srid = (!options.srid) ? serie.fuente.def_srid : options.srid
			var valid_func = [ 'LAST', 'FIRST', 'MIN', 'MAX', 'COUNT', 'SUM', 'MEAN', 'RANGE']
			options.funcion = (!options.funcion) ? "SUM" : options.funcion.toUpperCase()
			if(valid_func.indexOf(options.funcion) < 0) {
				return Promise.reject("'funcion' inválida. Opciones: 'LAST', 'FIRST', 'MIN', 'MAX', 'COUNT', 'SUM', 'MEAN', 'RANGE'")
			}
			options.format = (!options.format) ? "GTiff" : options.format
			const valid_formats = ["gtiff", "png"]
			if(valid_formats.map(f=> (f == options.format.toLowerCase()) ? 1 : 0).reduce( (a,b)=>a+b) == 0) {
				console.error("Invalid format:" + options.format)
				return
			}
			options.height = (!options.height) ? 300 : options.height
			options.width = (!options.width) ? 300 : options.width
			var rescale_band = (serie.fuente.scale_factor && serie.fuente.data_offset) ? "ST_mapAlgebra(rast,1,'32BF','[rast]*" + series.fuente.scale_factor + "+" + serie.fuente.data_offset + "')" : (serie.fuente.data_offset) ? "ST_MapAlgebra(rast,1,'32BF','[rast]+"  + serie.fuente.data_offset + "')" : "rast";
			var stmt
			var args
			if(options.format.toLowerCase() == "png") {
				stmt = "WITH rasts AS (\
				  SELECT series_id,\
				         count(timestart) as c,\
				         min(timestart) timestart,\
				         max(timestart) timeend, \
				         max(timeupdate) timeupdate, \
				         st_union(ST_Clip(st_rescale(valor,$1),'{1}',st_geomfromtext($2,$3)),$4) as rast\
				   FROM observaciones_rast\
				   WHERE series_id=$5 AND timestart>=$6 AND timeend<=$7\
				   GROUP by series_id),\
				  raststats AS (\
					SELECT st_summarystats(rast) stats\
					FROM rasts)\
				  SELECT series_id, \
				         timestart, \
				         timeend, \
				         timeupdate, \
				         c AS obs_count, \
				         (stats).*,\
				         ST_asGDALRaster(st_colormap(st_resize(st_reclass(rast,'[' || (st_summarystats(rast)).min || '-' || (st_summarystats(rast)).max || ']:1-255, ' || st_bandnodatavalue(rast) || ':0','8BUI'),$8,$9),1,'grayscale','nearest'),$10) valor\
				  FROM rasts, raststats"
				if(options.min_count) {
					stmt += sprintf(" WHERE rasts.c>=%d", options.min_count)
				}
				args = [options.pixel_height, options.bbox.toString(), options.srid, options.funcion, serie.id, timestart, timeend, options.height, options.width, options.format]
				
			} else {
				stmt  = "WITH rasts as (\
				SELECT series_id, timestart, timeend, timeupdate, ST_Clip(observaciones_rast.valor,'{1}',ST_GeomFromText($1,$2)) AS rast\
				FROM observaciones_rast\
				WHERE series_id=$3 AND timestart>=$4 AND timeend<=$5),\
				agg AS (\
					SELECT series_id, min(timestart) timestart,max(timeend) timeend, max(timeupdate) timeupdate, count(timestart) count, sum(timeend - timestart) time_sum, ST_AddBand(ST_Union(" + rescale_band + ",$6),ST_Union(rast,'COUNT')) as rast from rasts group by series_id),\
				raststats AS (\
					SELECT st_summarystats(rast) stats\
					FROM rasts)\
				SELECT series_id,\
				       timestart,\
				       timeend,\
				       timeupdate,\
				       count AS obs_count,\
				       time_sum,\
				         (stats).*,\
				       ST_AsGDALRaster(rast,$7) valor\
				FROM agg,raststats"
				if(options.min_count) {
					stmt += sprintf(" WHERE agg.count>=%d", options.min_count)
				}
			    args = [options.bbox.toString(),options.srid,series_id,timestart,timeend,options.funcion,options.format]
		    }
			return this.pool.query(stmt,args)
			.then(result=>{
				if(!result.rows) {
					console.log("No raster values found")
					return serie
				}
				if(result.rows.length == 0) {
					console.log("No raster values found")
					return serie
				}
				console.log("Unioned " + result.rows[0].obs_count + " values")
				if(!result.rows[0].valor) {
					console.log("No raster values unioned")
					return serie
				}
				const obs = new internal.observacion({tipo:"rast",series_id:result.rows[0].series_id,timestart:result.rows[0].timestart,timeend:result.rows[0].timeend,valor:result.rows[0].valor, nombre:options.funcion, descripcion: "agregación temporal", unit_id: serie.unidades.id, timeupdate: result.rows[0].timeupdate, count: result.rows[0].obs_count, options: options, stats: {count: result.rows[0].count, mean: result.rows[0].mean, stddev: result.rows[0].stddev, min: result.rows[0].min, max: result.rows[0].max}})
				obs.time_sum = result.rows[0].time_sum
				serie.observaciones = [obs]
				return serie
			})
			.catch(e=>{
				console.error(e)
				return serie
			})
		})
	}

	rastExtractByArea(series_id,timestart,timeend,area,options={}) {
		if(!timestart || !timeend) {
			return Promise.reject("falta timestart y/o timeend")
		}
		var promises =[]
		if(parseInt(area).toString() != "NaN") {
			promises.push(this.getArea(parseInt(area)))
		} else {
			promises.push(new internal.area({geom:area}))
		}
		return Promise.all(promises)
		.then(result => {
			area = result[0]
			return this.getSerie("rast",series_id)
			.then(serie=>{
				if(!serie) {
					console.error("serie no encontrada")
					return
				}
				if(!serie.id) {
					console.log("serie no encontrada")
					return
				}
				options.funcion = (!options.funcion) ? "mean" : options.funcion
				const valid_funciones = ['mean','sum','count','min','max','stddev']
				if(valid_funciones.map(f=> (f == options.funcion.toLowerCase()) ? 1 : 0).reduce( (a,b)=>a+b) == 0) {
					console.error("Invalid funcion:" + options.funcion)
					return
				}
				serie.estacion = area
				serie.tipo = "areal"
				serie.id= undefined
				// console.log({geom:area.geom.toString(),srid:serie.fuente.def_srid})
				var stmt = "WITH s as (\
				  SELECT timestart timestart,\
						 timeend timeend,\
						 (st_summarystats(st_clip(st_resample(st_clip(valor,1,st_buffer(st_envelope(st_geomfromtext($1,$2)),0.5),-9999,true),0.05,0.05),1,st_geomfromtext($1,$2),-9999,true)))." + options.funcion.toLowerCase() + " valor\
						FROM observaciones_rast \
						WHERE series_id=$3\
						AND timestart>=$4\
						AND timeend<=$5)\
				  SELECT timestart, timeend, to_char(valor,'S99990.99')::numeric valor\
						FROM s\
						WHERE valor IS NOT NULL\
				  ORDER BY timestart;"
				var args = [area.geom.toString(),serie.fuente.def_srid,series_id,timestart,timeend] // [serie.fuente.hora_corte,serie.fuente.def_dt, area.geom.toString(),serie.fuente.def_srid,timestart,timeend]
				// console.log(pasteIntoSQLQuery(stmt,args))
				return this.pool.query(stmt,args)
				.then(result=>{
					if(!result.rows) {
						console.log("No raster values found")
						if(options.only_obs) {
							return []
						} else {
							return serie
						}
					}
					if(result.rows.length == 0) {
						console.log("No raster values found")
						if(options.only_obs) {
							return []
						} else {
							return serie
						}
					}
					console.log("Found " + result.rows.length + " values")
					const observaciones = result.rows.map(obs=> {
						//~ console.log(obs)
						return new internal.observacion({tipo:"areal",timestart:obs.timestart,timeend:obs.timeend,valor:obs.valor, nombre:options.funcion, descripcion: "agregación espacial", unit_id: serie.unidades.id})
					})
					if(options.only_obs) {
						return observaciones
					} else {
						serie.observaciones = observaciones
						return serie
					}
				})
				.catch(e=>{
					console.error(e)
					if(options.only_obs) {
						return []
					} else {
						return serie
					}
				})
			})
			.catch(e=>{
				console.error(e)
				return null
			})
		})
	}
	
	rast2areal(series_id,timestart,timeend,area,options={}) {
		if(area == "all") {
			var query = "SELECT series_areal.id,series_areal.area_id FROM series_areal,series_rast,areas_pluvio WHERE series_rast.id=$1 AND series_rast.fuentes_id=series_areal.fuentes_id AND areas_pluvio.unid=series_areal.area_id AND areas_pluvio.activar=TRUE ORDER BY series_areal.id"
			// console.log(pasteIntoSQLQuery(query,[series_id]))
			return this.pool.query(query,[series_id])
			.then(result=>{
				if(result.rows.length == 0) {
					console.log("No se encontraron series areal")
					return 
				}
				var promises=[]
				for(var i=0;i<result.rows.length;i++) {
					const serie_areal = result.rows[i]
					//~ console.log([series_id,timestart,timeend,serie_areal.area_id])
					promises.push(this.rastExtractByArea(series_id,timestart,timeend,serie_areal.area_id,options)
					.then(serie=>{
						if(!serie) {
							console.log("serie rast no encontrada")
							return
						}
						if(!serie.observaciones) {
							console.log("observaciones no encontradas")
							return
						}
						if(serie.observaciones.length == 0) {
							console.log("observaciones no encontradas")
							return
						}
						console.log("Found serie_areal.id:" + serie_areal.id)
						serie.observaciones = serie.observaciones.map(obs=> {
							obs.series_id = serie_areal.id
							return obs
						})
						if(options.no_insert) {
							return serie.observaciones
						}
						return this.upsertObservaciones(serie.observaciones,'areal',serie_areal.id)
						.then(upserted=>{
							console.log("Upserted " + upserted.length + " observaciones")
							return upserted
						})
					}))
				}
				return Promise.all(promises)
			})
			.then(result=>{
				if(result.length == 0) {
					console.log("no observaciones areales created")
					return []
				}
				const arr = []
				result.map(s=> {
					if(s) {
						s.map(o=>{
							arr.push(o)
						})
					} else {
						return []
					}
				})
				return arr
			})
		} else {
			return this.rastExtractByArea(series_id,timestart,timeend,area,options)
			.then(serie=>{
				if(!serie) {
					console.log("serie rast no encontrada")
					return
				}
				if(!serie.observaciones) {
					console.log("observaciones no encontradas")
					return
				}
				if(serie.observaciones.length == 0) {
					console.log("observaciones no encontradas")
					return
				}
				// console.log({tipo:"areal", "var":serie["var"], procedimiento:serie.procedimiento, unidades:serie.unidades, estacion:serie.estacion, fuente:serie.fuente})
				const serie_areal = new internal.serie({tipo:"areal", "var":serie["var"], procedimiento:serie.procedimiento, unidades:serie.unidades, estacion:serie.estacion, fuente:serie.fuente})
				return serie_areal.getId(this.pool)
				.then((id)=>{
					console.log("Found serie_areal.id:" + serie_areal.id)
					serie.observaciones = serie.observaciones.map(obs=> {
						obs.series_id = serie_areal.id
						return obs
					})
					if(options.no_insert) {
						return serie.observaciones
					}
					if(config.verbose) {
						console.log("crud.rast2areal: obs:" + JSON.stringify(serie.observaciones))
					}
					return this.upsertObservaciones(serie.observaciones)
					.then(upserted=>{
						console.log("Upserted " + upserted.length + " observaciones")
						return upserted
					})
				})
			})
			// .catch(e=>{
			// 	console.error(e)
			// 	return
			// })
		}
	}


	
	rastExtractByPoint(series_id,timestart,timeend,point,options) {
		var promises =[]
		if(parseInt(point)) {
			promises.push(this.getEstacion(parseInt(point)))
		} else {
			promises.push(new internal.estacion({nombre:"Punto arbitrario", geom: point}))
		}
		return Promise.all(promises)
		.then(result => {
			point = result[0]
			return this.getSerie("rast",series_id)
			.then(serie=>{
				if(!serie) {
					console.error("serie no encontrada")
					return
				}
				if(!serie.id) {
					console.log("serie no encontrada")
					return
				}
				options.funcion = (!options.funcion) ? "nearest" : options.funcion.toLowerCase()
				const valid_funciones = ['mean','sum','count','min','max','stddev','nearest']
				if(valid_funciones.map(f=> (f == options.funcion.toLowerCase()) ? 1 : 0).reduce( (a,b)=>a+b) == 0) {
					console.error("Invalid funcion:" + options.funcion)
					return
				}
				serie.estacion = point
				serie.tipo = "puntual"
				serie.id= undefined
				var max_distance = (options.max_distance) ? parseFloat(options.max_distance) : serie.fuente.def_pixel_width
				var buffer = (options.buffer) ? parseFloat(options.buffer) : serie.fuente.def_pixel_width
				var transform = (serie.fuente.scale_factor) ? " * " + serie.fuente.scale_factor : ""
				transform += (serie.fuente.data_offset) ? " + " + serie.fuente.data_offset : ""
				serie.extractionParameters = {funcion:options.funcion, max_distance: max_distance, buffer: buffer}
				var stmt
				var args
				if(options.funcion.toLowerCase() == "nearest") {
					//~ console.log([series_id,timestart,timeend,serie.estacion.geom.toString(),serie.fuente.def_srid,serie.fuente.hora_corte,serie.fuente.def_dt,max_distance])
					stmt= "WITH centroids AS (\
					  SELECT timestart,val,x,y,geom,timeupdate\
					  FROM (\
					    SELECT timestart,timeupdate,dp.*\
					    FROM observaciones_rast, lateral st_pixelascentroids(observaciones_rast.valor) AS dp\
						WHERE observaciones_rast.series_id=$1\
						AND observaciones_rast.timestart >= $2\
						AND observaciones_rast.timeend<= $3) foo),\
					distancias as (\
						SELECT timestart,\
							   timeupdate,\
							   val,\
							   x,\
							   y,\
							   centroids.geom,\
						       st_distance(ST_GeomFromText($4,$5),centroids.geom) distance,\
						       row_number() over (partition by timestart order by st_distance(st_GeomFromText($4,$5),centroids.geom)) as rk\
						FROM centroids ORDER BY centroids.timestart,centroids.x,centroids.y\
						)\
					SELECT timestart + $6::interval timestart, \
						   timestart + $6::interval + $7::interval timeend,\
						   round(val::numeric,2) valor,\
						   timeupdate\
					FROM distancias\
					WHERE rk=1\
					AND distance<=$8\
					ORDER BY timestart"
					args = [series_id,timestart,timeend,serie.estacion.geom.toString(),serie.fuente.def_srid,serie.fuente.hora_corte,serie.fuente.def_dt,max_distance]
				} else {
					 stmt = "SELECT observaciones_rast.timestart + $1::interval timestart, \
								    observaciones_rast.timestart + $1::interval + $2::interval timeend,\
									round(((st_summarystats(st_clip(observaciones_rast.valor,st_buffer(st_envelope(st_geomfromtext($3,$4)),$5))))." + options.funcion + " " + transform + ")::numeric,2) valor,\
									timeupdate\
									FROM observaciones_rast\
									WHERE series_id=$6\
									AND timestart>=$7\
									AND timeend<=$8\
									ORDER BY observaciones_rast.timestart"
					 args = [serie.fuente.hora_corte, serie.fuente.def_dt, serie.estacion.geom.toString(), serie.fuente.def_srid, buffer, series_id, timestart, timeend]
				}
				return this.pool.query(stmt,args)
				.then(result=>{
					if(!result.rows) {
						console.log("No raster values found")
						return serie
					}
					if(result.rows.length == 0) {
						console.log("No raster values found")
						return serie
					}
					console.log("Found " + result.rows.length + " values")
					const observaciones = result.rows.map(obs=> {
						//~ console.log(obs)
						return new internal.observacion({tipo:"puntual",timestart:obs.timestart,timeend:obs.timeend,valor:obs.valor, nombre:options.funcion, descripcion: "extracción puntual", unit_id: serie.unidades.id})
					})
					serie.observaciones = observaciones
					return serie
				})
				.catch(e=>{
					console.error(e)
					return serie
				})
			})
			.catch(e=>{
				console.error(e)
				return null
			})
		})
	}
	
	getRegularSeries(tipo="puntual",series_id,dt="1 days",timestart,timeend,options) {  // options: t_offset,aggFunction,inst,timeSupport,precision,min_time_fraction,insertSeriesId,timeupdate
		// console.log({tipo:tipo,series_id:series_id,dt:dt,timestart:timestart,timeend:timeend,options:options})
		if(!series_id || !timestart || !timeend) {
			return Promise.reject("series_id, timestart and/or timeend missing")
		}
		timestart = new Date(timestart)
		timeend = new Date(timeend)
		if(timestart.toString() == 'Invalid Date') {
			return Promise.reject("timestart: invalid date")
		}
		if(timeend.toString() == 'Invalid Date') {
			return Promise.reject("timeend: invalid date")
		}
		return this.getSerie(tipo,series_id)
		.then(serie=>{
			if(!serie) {
				console.error("serie not found")
				return
			}
			var def_t_offset = (serie.fuente) ? (serie.fuente.hora_corte) ? serie.fuente.hora_corte.toPostgres() : '0 hours' : '0 hours'
			var t_offset = (options.t_offset) ? options.t_offset : def_t_offset
			if(/[';]/.test(t_offset)) {
				console.error("Invalid t_offset")
				return
			}
			var def_inst
			if(serie["var"].datatype.toLowerCase() == "continuous" || serie["var"].datatype.toLowerCase() == "sporadic") {
				def_inst = true
			} else {
				def_inst = false
			}
			var inst = (options.inst) ? new Boolean(options.inst) : def_inst
			var min_time_fraction = (options.min_time_fraction) ? parseFloat(options.min_time_fraction) : 1
			var dt_epoch
			// RAST //
			if(tipo.toLowerCase() == 'rast' || tipo.toLowerCase() == 'raster')  {
				//~ if (!inst) {
				// SERIE NO INSTANTANEA //
					var timeSupport
					if (!options.timeSupport) {
						timeSupport = serie["var"].timeSupport
					} else {
						if(/[';]/.test(options.timeSupport)) {
							console.error("Invalid timeSupport")
							return
						} else {
							timeSupport = options.timeSupport
						}
					}
					return Promise.all([this.date2obj(timestart),this.date2obj(timeend),this.interval2epoch(dt), this.interval2epoch(t_offset)])
					.then(async (results)=>{
						// console.log({dates:results})
						var timestart =results[0]
						var timeend = results[1] 
						var dt = results[2] * 1000
						dt_epoch = (inst) ? 0 : dt
						var t_offset = results[3] * 1000
						var timestart_time = (timestart.getHours()*3600 + timestart.getMinutes()*60 + timestart.getSeconds()) * 1000 + timestart.getMilliseconds() + timestart.getTimezoneOffset()*60*1000
						if(timestart_time < t_offset) {
							console.log("timestart < t_offset;timestart:" + timestart + ", " + timestart_time + " < " + t_offset)
							timestart.setTime(timestart.getTime() - timestart_time + t_offset)
						} else if (timestart_time > t_offset) {
							console.log("timestart > t_offset;" + timestart + " > " + t_offset)
							timestart.setTime(timestart.getTime() - timestart_time + t_offset + dt)
						}
						var timeend_time = (timeend.getHours()*3600 + timeend.getMinutes()*60 + timeend.getSeconds())*1000 + timeend.getMilliseconds() + timeend.getTimezoneOffset()*60*1000
						if(timeend_time > t_offset) {
							timeend.setTime(timeend.getTime() - timeend_time + t_offset)
						} else if (timeend_time < t_offset) {
							timeend.setTime(timeend.getTime() - timeend_time + t_offset + dt)
						}
						console.log({timestart:timestart,timeend:timeend,dt:dt})
						var results = []
						for(var i=timestart.getTime();i<timeend.getTime();i=i+dt) {
							var stepstart = new Date(i)
							var stepend = new Date(i+dt)
							if(config.verbose) {
								console.log("crud.getRegularSeries: stepstart:" +stepstart.toISOString() + ",stepend:" + stepend.toISOString())
							}
							results.push(await this.rastExtract(series_id,stepstart,stepend,options))
						}
						return results // Promise.all(promises)
					})
					.then(obs=>{
						if(obs) {
							var observaciones = obs.map(o=> (o.observaciones) ? o.observaciones[0] : null).filter(o=> o !== null)
							if(dt_epoch) {
								observaciones = observaciones.filter(o=>{
									var time_sum_epoch = timeSteps.interval2epochSync(o.time_sum) * 1000
									console.log("crud.getRegularSeries: dt:" + dt_epoch, "o.time_sum:"  + time_sum_epoch + ", min_time_fraction: " + min_time_fraction)
									if(time_sum_epoch / dt_epoch < min_time_fraction) {
										console.error("crud.getRegularSeries: la observación no alcanza la mínima fracción de tiempo")
										return false
									} else {
										return true
									}
								})
							}
							if(options.insertSeriesId) {
								observaciones = observaciones.map(o=> {
									o.series_id = options.insertSeriesId
									if (options.timeupdate) {
										o.timeupdate = options.timeupdate
									}
									if(dt / o.time_sum * 1000 < min_time_fraction) {
										console.error("la observación no alcanza la mínima fracción de tiempo")
										return null
									} else {
										return o
									}
								})
								return this.upsertObservaciones(observaciones,undefined,undefined,options)
								//~ .then(results=>{
									//~ return results.map(o=>{
										//~ if(o instanceof Buffer) {
											//~ o.valor = o.toString('hex')
										//~ }
									//~ })
								//~ })
							} else if (options.asArray) {
								observaciones = observaciones.map(o=>{
									return [o.timestart, o.timeend, o.valor]
								})
								return observaciones
							} else {
								return observaciones
							}
						} else {
							return []
						}
					})
			
				//~ }
					
					
			// PUNTUAL, AREAL //
			} else {
				var obs_t = ( tipo.toLowerCase() == "areal" ) ? "observaciones_areal" : "observaciones"
				var val_t = ( tipo.toLowerCase() == "areal" ) ? "valores_num_areal" : "valores_num"
				var stmt
				var args
				var aggFunction
				if (!inst) {
				// SERIE NO INSTANTANEA //
					var timeSupport
					if (!options.timeSupport) {
						timeSupport = serie["var"].timeSupport
					} else {
						if(/[';]/.test(options.timeSupport)) {
							console.error("Invalid timeSupport")
							throw(new Error("Invalid timeSupport"))
							return
						} else {
							timeSupport = options.timeSupport
						}
					}
					aggFunction = (options.aggFunction) ? options.aggFunction : "acum"
					var precision = (options.precision) ? parseInt(options.precision) : 2
					var aggStmt
					switch (aggFunction.toLowerCase()) {
						case "acum":
							aggStmt = "round(sum(extract(epoch from tt)/extract(epoch from '" + timeSupport.toPostgres() + "'::interval)*valor)::numeric," + precision + ")"
							break;
						case "mean":
							aggStmt = "round((sum(extract(epoch from tt)*valor)/sum(extract(epoch from tt)))::numeric," + precision + ")"
							break;
						case "sum":
							aggStmt = "round(sum(valor)::numeric," + precision + ")"
							break;
						case "min":
							aggStmt = "round(least(valor)::numeric," + precision + ")"
							break;
						case "max":
							aggStmt = "round(greatest(valor)::numeric," + precision + ")"
							break
						case "count":
							aggStmt = "count(valor)"
							break;
						case "diff":
							aggStmt = "round((max(valor)-min(valor))::numeric," + precision + ")"
							break;
						case "increment":
							aggStmt = "round((max(valor)-first(valor))::numeric," + precision + ")"
							break;
						case "math": 
							aggStmt = options.expression
							break;
						default:
							console.error("aggFunction incorrecta")
							throw(new Error("aggFunction incorrecta"))
							return
					}
					args = [timestart,t_offset,timeend,dt,series_id]
					//~ console.log({dt_to_string:timeSteps.interval2string(dt)})
					var timeseries_stmt = (timeSteps.interval2string(dt).toLowerCase()=="1 day" || timeSteps.interval2string(dt).toLowerCase()=="1 days" ) ? "SELECT generate_series($1::date + $2::interval, $3::date + $2::interval - $4::interval, $4::interval) AS dd" : "SELECT generate_series($1::timestamp + $2::interval, $3::timestamp + $2::interval - $4::interval, $4::interval) AS dd"
					//~ console.log(timeseries_stmt)
					stmt = "WITH d AS (\
						"+ timeseries_stmt + "\
					),\
					t AS (\
						SELECT d.dd as fecha,\
						case when timestart>=d.dd+$4::interval \
						then '0'::interval\
						when timestart>=d.dd\
						then case when timeend>=d.dd+$4::interval\
								  then d.dd+$4::interval - timestart\
								  else  timeend - timestart\
								  end\
						else case when timeend <= d.dd\
								  then '0'::interval\
								  when timeend<=d.dd + $4::interval\
								  then timeend - d.dd\
								  else $4::interval\
								  end\
						end tt,\
						timestart,\
						timeend,\
						valor\
						FROM d," + obs_t + "," + val_t + "\
						WHERE series_id=$5 \
						AND " + obs_t + ".id=obs_id \
						AND timeend>=$1 \
						AND timestart<=$3::timestamp+$2::interval+$4::interval\
						ORDER BY timestart\
					),\
					v as (\
						SELECT fecha,\
						   " + aggStmt + " valor, \
						   count(tt) count\
						FROM t \
						WHERE extract(epoch from tt)>0 \
						GROUP BY fecha\
						ORDER BY fecha\
						)\
					SELECT d.dd timestart,\
						   d.dd + $4::interval timeend,\
						   v.valor,\
							v.count\
					FROM d\
					LEFT JOIN v on (v.fecha=d.dd)\
					ORDER BY d.dd"
				} else {
					// SERIE INSTANTANEA //
					aggFunction = (options.aggFunction) ? options.aggFunction : "nearest"
					var precision = (options.precision) ? parseInt(options.precision) : 2
					if(aggFunction.toLowerCase() == "nearest") {
						args = [timestart, t_offset, timeend, dt, series_id, precision]
						stmt="WITH d AS (\
								SELECT generate_series($1::timestamp + $2::interval, $3::timestamp + $2::interval - $4::interval, $4::interval) AS dd\
							),\
							t as (\
								SELECT d.dd as fecha,\
												timestart - d.dd tt,\
												timestart,\
												timeend,\
												valor,\
												ROW_NUMBER() over(partition by d.dd order by abs(extract(epoch from (timestart - d.dd))::numeric)) AS rk\
								from d," + obs_t + "," + val_t + "\
								where series_id=$5 \
								and " + obs_t + ".id=obs_id \
								and timestart>=$1\
								and timeend<=$3::timestamp+$2::interval+$4::interval\
								and abs(extract(epoch from (timestart - dd))::numeric) < extract(epoch from $4::interval)::numeric/2\
							),\
							v as (select fecha,\
								   timestart,\
								   tt,\
								   round(valor::numeric,$6) valor\
							from t where rk=1\
							order by fecha\
							)\
							SELECT d.dd timestart,\
								   d.dd timeend,\
								   v.valor\
							FROM d\
							LEFT JOIN v on (v.fecha=d.dd)\
							ORDER BY d.dd"
					} else {
						var aggFunc
						switch (aggFunction.toLowerCase()) {
							case "mean":
								aggFunc="round(avg(valor)::numeric," + precision +")"
								break
							case "avg":
								aggFunc="round(avg(valor)::numeric," + precision +")"
								break
							case "average":
								aggFunc="round(avg(valor)::numeric," + precision +")"
								break
							case "min":
								aggFunc="round(min(valor)::numeric," + precision +")"
								break
							case "max":
								aggFunc="round(max(valor)::numeric," + precision +")"
								break
							case "count":
								aggFunc="count(valor)"
								break
							case "diff":
								aggFunc="round((max(valor)-min(valor))::numeric," + precision +")"
								break
							case "increment":
								aggFunc = "round((max(valor)-first(valor))::numeric," + precision + ")"
								break
							case "sum":
								aggFunc="round(sum(valor)::numeric," + precision +")"
								break
							default:
								console.error("aggFunction incorrecta")
								throw("Bad aggregate function")
								return
						} if (dt.toLowerCase()=="1 days" || dt.toLowerCase()=="1 day" ) {
							console.log("inst, dt 1 days")
							args = [timestart,t_offset, timeend, dt, series_id]
							stmt = "WITH s AS (\
								SELECT generate_series($1::date,$3::date,'1 days'::interval) d\
								), obs AS (\
								SELECT timestart,timeend,valor\
								FROM " + obs_t + "," + val_t + "\
								WHERE series_id=$5\
									AND " + obs_t + ".id=obs_id \
									AND timestart>=$1\
									AND timestart<=$3::timestamp+$2::interval+$4::interval\
									ORDER BY timestart\
								)\
								SELECT s.d+$2::interval timestart,\
									   s.d+$4::interval+$2::interval timeend,\
									   " + aggFunc + " valor\
									   FROM s\
									   LEFT JOIN obs ON (s.d::date=(obs.timestart-$2::interval)::date)\
									   GROUP BY s.d+$2::interval, s.d+$4::interval+$2::interval\
									ORDER BY s.d+$2::interval"
						}
						 else if (dt.toLowerCase()=="1 months" || dt.toLowerCase()=="1 month"  || dt.toLowerCase()=="1 mon" ) {
							console.log("inst, dt 1 month")
							args = [timestart,t_offset, timeend, dt, series_id]
							stmt = "WITH s AS (\
								SELECT generate_series('" + timestart.toISOString() +"'::timestamp,'" + timeend.toISOString() +"'::timestamp - '1 months'::interval,'1 months'::interval) d\
								), obs AS (\
								SELECT timestart,timeend,valor\
								FROM " + obs_t + "," + val_t + "\
								WHERE series_id=$5\
									AND " + obs_t + ".id=obs_id \
									AND timestart>=$1\
									AND timestart<=$3::timestamp+$2::interval+$4::interval\
									ORDER BY timestart\
								)\
								SELECT s.d timestart,\
									   s.d+$4::interval timeend,\
									   " + aggFunc + " valor\
									   FROM s\
									   LEFT JOIN obs ON (extract(month from s.d)=extract(month from obs.timestart) AND extract(year from s.d)=extract(year from obs.timestart))\
									   GROUP BY s.d, s.d+$4::interval\
									ORDER BY s.d"
						} 
						else {
							args = [timestart,t_offset, timeend, dt, series_id]
							//~ console.log("SELECT generate_series('" + timestart.toISOString() + "'::timestamp + '" + t_offset + "'::interval, '" + timeend.toISOString() + "'::timestamp + '" + t_offset + "'::interval - '" + dt + "'::interval, '" + dt + "'::interval)")
							stmt = "WITH d AS (\
								SELECT generate_series($1::timestamp + $2::interval, $3::timestamp + $2::interval - $4::interval, $4::interval) AS dd\
												),\
								data as (\
									SELECT timestart,\
										   valor\
									FROM " + obs_t  + "," + val_t + "\
									WHERE series_id=$5\
									AND " + obs_t + ".id=obs_id \
									AND timestart>=$1\
									AND timestart<=$3::timestamp+$2::interval+$4::interval\
									ORDER BY timestart\
								)\
								SELECT d.dd timestart,\
									   d.dd+$4::interval timeend,\
									   " + aggFunc + " valor,\
									   count(valor) count\
								FROM d\
								LEFT JOIN data ON (data.timestart>=d.dd and data.timestart" + ((aggFunction.toLowerCase()=="increment") ? "<=" : "<") + "d.dd+$4::interval)\
								GROUP BY d.dd\
								ORDER BY d.dd"
						}
					}
				}
				//~ console.log(stmt)
				//~ console.log(args)
				return this.pool.connect()
				.then(client=>{
					return client.query("SET SESSION TIME ZONE '-03'")
					.then(()=>{
						return client.query(stmt,args)
					})
					.then((result)=>{
						client.release()
						return result
					})
				})						//~ return this.pool.query(stmt,args)
				.then(result=>{
					if(!result.rows) {
						console.error("Nothing found")
						return []
					}
					if(result.rows.length == 0) {
						console.error("No observaciones found")
						return []
					}
					//~ console.log(result.rows)
					var observaciones = result.rows.map(obs=> new internal.observacion({timestart:obs.timestart, timeend:obs.timeend, valor:obs.valor, tipo:tipo, nombre:aggFunction, descripcion:"serie regular",series_id:series_id}))
					if(options.insertSeriesId) {
						observaciones = observaciones.map(o=> {
							o.series_id = options.insertSeriesId
							if (options.timeupdate) {
								o.timeupdate = options.timeupdate
							}
							return o
						})
						if(options.no_insert) {
							return observaciones
						}
						return this.upsertObservaciones(observaciones.filter(o=> o.valor),tipo.toLowerCase(),undefined,options)	// filter out null values and return
						.then(obs=>{
							console.log("Inserted " + obs.length + " observaciones")
							if(options.no_send_data) {
								return obs.length
							}
							return obs
						})
						.catch(e=>{
							console.error(e)
							return
						})
					} else if (options.asArray) {
						observaciones = observaciones.map(o=>{
							return [o.timestart, o.timeend, o.valor]
						})
						return observaciones
					} else {
						return observaciones
					}
				})
				.catch(e=>{
					console.error(e)
					return
				})
			}
		})
	}	
	
	getMultipleRegularSeries(series,dt="1 days",timestart,timeend,options) {
		// series: [{tipo:...,id:...},{..},...]
		// returns 2d array with dates in rows and series in columns
		return Promise.all(series.map(s=>{
			return this.getSerie((s.tipo) ? s.tipo : "puntual",{id:s.id})
		}))
		.then(seriesData=>{
			seriesData = seriesData.map(s=>s[0])
			var header0 = ["series_id"]
			var header1 = ["estacion"]
			var header2 = ["variable"]
			return Promise.all(seriesData.map(s=>{
				header0.push(s.id)
				header1.push(s.estacion.nombre)
				header2.push(s.var.nombre)
				return this.getRegularSeries( (s.tipo) ? s.tipo : "puntual",s.id,dt,timestart,timeend,options)
			}))
			.then(regularSeries=>{
				var multipleRegularSeries = [header0,header1,header2]
				if(regularSeries.length>0) {
					regularSeries[0].forEach((r,i)=>{
						var row = [r.timestart.toISOString()]
						regularSeries.forEach(s=>{
							row.push(s[i].valor)
						})
						multipleRegularSeries.push(row)
					})
				}
				return multipleRegularSeries
			})
		})
	}
	
	// getCampo2: obtiene set de series regulares de una variable puntual para un periodo y paso temporal dados, opcionalmente filtrado por recorte espacial (geom), procedimiento, array de ids de estación, id o array de id de red 
	getCampo2(var_id,timestart,timeend,filter={},options={}) {// filter: proc_id,proc_id=1,unit_id,geom,estacion_id,red_id   options: dt="1 days", t_offset,aggFunction,inst,timeSupport,precision,min_time_fraction,timeupdate}) 
		var proc_id = (filter.proc_id) ? filter.proc_id : (var_id==4) ? 2 : 1
		if(!var_id || ! proc_id || !timestart || !timeend) {
			return Promise.reject("Missing parameters. required: var_id proc_id unit_id timestart timeend")
		}
		if(options.agg_func) {
			if(["mean","avg","average","min","max","count","diff","increment","sum","nearest"].indexOf(options.agg_func.toLowerCase()) < 0) {
				return Promise.reject("Bad agg_func. valid values: mean,avg,average,min,max,count,diff,increment,sum")
			}
		}
		var campo = {var_id:var_id, proc_id: proc_id, timestart: timestart, timeend: timeend, filter: {geom: filter.geom,estacion_id: filter.estacion_id,red_id: filter.red_id},options:{aggFunction:options.agg_func,dt:options.dt,t_offset:options.t_offset,inst:options.inst,precision:options.precision}}
		return Promise.all([this.getVar(campo.var_id),this.getProcedimiento(campo.proc_id)])
		.then(results=>{
			if(!results[0]) {
				throw("var_id:"+campo.var_id+" not found")
			}
			if(!results[1]) {
				throw("proc_id:"+campo.proc_id+"not found")
			}
			campo.variable = results[0]
			campo.procedimiento = results[1]
			campo.unit_id = (filter.unit_id) ? filter.unit_id : campo.variable.def_unit_id
			return this.getUnidad(campo.unit_id)
		})
		.then(results=>{
			if(!results) {
				throw("unit_id:" + campo.unit_id + " not found")
			}
			campo.unidades = results
			campo.dt = (options.dt) ? options.dt : (campo.variable.timeSupport) ? campo.variable.timeSupport : "1 days"
			//~ campo.options.t_offset = (options.t_offset) ? options.t_offset : 0
			//~ campo.options.aggFunction = (options.agg_func) ? options.agg_func : "mean" 
			return this.getSeries("puntual",{var_id:campo.var_id,proc_id:campo.proc_id,unit_id:campo.unit_id,red_id:filter.red_id,geom:filter.geom,estacion_id:filter.estacion_id})
		})
		.then(series=>{
			if(!series) {
				throw("series not found")
			}
			return Promise.all(series.map(serie=>{
				return this.getRegularSeries("puntual",serie.id,campo.dt,campo.timestart,campo.timeend,campo.options)  // options: t_offset,aggFunction,inst,timeSupport,precision,min_time_fraction,insertSeriesId,timeupdate
				.then(observaciones=>{
					return {series_id: serie.id, estacion: serie.estacion, observaciones: observaciones}
					//~ return {fromSeries:serie,timestart:campo.timestart,timeend:campo.timeend,data:observaciones,dt:campo.dt,t_offset:campo.t_offset, funcion: campo.aggFunction})

					//~ return new internal.serieRegular({fromSeries:series.id,timestart:timestart,timeend:timeend,data:observaciones,dt:dt,t_offset:t_offset, funcion: aggFunction})
				})
			}))
		})
		.then(seriesRegulares=>{
			campo.data = seriesRegulares
			return campo
				//~ return new internal.campo({var_id:var_id,proc_id:proc_id,unit_id:unit_id,timestart:timestart,timeend:timeend,geom:filter.geom,dt:dt,estacion_id:filter.estacion_id,red_id:filter.red_id,options:options,seriesRegulares:seriesRegulares})
			//~ })
		})
	}
	
	//getCampo: obtiene campo de una variable para un intervalo dado, opcionalmente filtrado por red, estacion, geometría (envolvente). Agregación temporal según parámetro agg_func (default: acum)	
	getCampo(var_id,timestart,timeend,filter={},options={}) {  // options: t_offset,aggFunction,inst,timeSupport,precision,min_time_fraction,insertSeriesId,timeupdate,min_count
		return this.initCampo(var_id,timestart,timeend,filter,options)
		.then(campo=>{
			return this.getSingleCampo(campo)
		})
	}
	// getCampoSerie  GENERA SERIE TEMPORAL CON INTERVALO options.dt (DEFAULT 1 days)  ITERA SOBRE GETSINGLECAMPO, DEVUELVE ARREGLO 
	async getCampoSerie(var_id,timestart,timeend,filter={},options={}) {
		try { 
		 var campo = await this.initCampo(var_id,timestart,timeend,filter,options)
		} catch(e) {
			return Promise.reject(e)
		}
		//~ console.log({campo:campo})
		var dt = (campo.options.dt) ? campo.options.dt : (campo.variable.timeSupport) ? campo.variable.timeSupport : {days: 1} 
		var dates = []
		var timestart = new Date(campo.timestart)
		var timeend = new Date(campo.timeend)
		var campos = []
		var dtepoch
		try {
			var seconds = await this.interval2epoch(dt)
			//~ console.log({seconds:seconds})
			dtepoch = seconds*1000
		} catch(e) {
			return Promise.reject({message:"Bad dt",error:e})
		}
		//~ console.log({dtepoch:dtepoch})
		if(dtepoch.toString() == "NaN") {
			return Promise.reject({message:"Bad dt"})
		}
		for(var i=timestart;i<timeend;i=new Date(i.getTime()+dtepoch)) {
			//~ console.log({i:i})
			var thiscampo = { ...campo }
			dates.push(i)
			thiscampo.timestart = i
			thiscampo.timeend = new Date(i.getTime() +  dtepoch)
			try {
				var result = await this.getSingleCampo(thiscampo)
				//~ console.log({result:result})
				campos.push(result)
			} catch(e) {
				console.error(e)
			}	
		}
		return campos
	}
	
	initCampo(var_id,timestart,timeend,filter={},options={}) {
		var proc_id = (filter.proc_id) ? filter.proc_id : (var_id==4) ? 2 : 1
		if(!var_id || ! proc_id || !timestart || !timeend) {
			return Promise.reject("Missing parameters. required: var_id proc_id unit_id timestart timeend")
		}
		if(options.agg_func) {
			if(["mean","avg","average","min","max","count","diff","increment","sum","nearest","array"].indexOf(options.agg_func.toLowerCase()) < 0) {
				return Promise.reject("Bad agg_func. valid values: mean,avg,average,min,max,count,diff,increment,sum")
			}
		}
		var campo = {var_id:var_id, proc_id: proc_id, timestart: timestart, timeend: timeend, filter: {geom: filter.geom,estacion_id: filter.estacion_id, red_id: filter.red_id}, options: {aggFunction: options.agg_func,dt:options.dt,t_offset:options.t_offset,inst:options.inst,precision:options.precision,timeSupport:options.timeSupport,min_count:options.min_count}}
		return Promise.all([this.getVar(campo.var_id),this.getProcedimiento(campo.proc_id)])
		.then(results=>{
			if(!results[0]) {
				throw("var_id:"+campo.var_id+" not found")
			}
			if(!results[1]) {
				throw("proc_id:"+campo.proc_id+"not found")
			}
			campo.variable = results[0]
			campo.procedimiento = results[1]
			campo.unit_id = (filter.unit_id) ? filter.unit_id : campo.variable.def_unit_id
			if(!campo.options.timeSupport) {
				campo.options.timeSupport = campo.variable.timeSupport
			}
			return this.getUnidad(campo.unit_id)
		})
		.then(results=>{
			if(!results) {
				throw("unit_id:" + campo.unit_id + " not found")
			}
			campo.unidades = results
			if(!campo.options.inst) {
				if(!campo.options.timeSupport) {
					campo.options.inst = true
				} else if (timeSteps.interval2epochSync(campo.options.timeSupport) == 0) {
					campo.options.inst = true
				} else {
					campo.options.inst = false
				}
			}
//			if(serie["var"].datatype.toLowerCase() == "continuous" || serie["var"].datatype.toLowerCase() == "sporadic") {
//				def_inst = true
//			} else {
//				def_inst = false
//			}
			var valid_filters = {estacion_id: "numeric", red_id: "numeric", geom: "geometry", series_id: "numeric", public: "boolean_only_true"}
			return this.pool.query("SELECT series.series_id series_id, series.proc_id, series.var_id, series.unit_id, series.estacion_id, estaciones.tabla, st_x(estaciones.geom) geom_x, st_y(estaciones.geom) geom_y, redes.red_id red_id, estaciones.nombre, estaciones.id_externo, estaciones.public \
			from (select series.id series_id, series.estacion_id, series.proc_id, series.var_id, series.unit_id from series) series,(select unid, tabla,geom,estaciones.nombre,id_externo,public from estaciones,redes where estaciones.tabla=redes.tabla_id AND habilitar=true) estaciones,(select tabla_id,id red_id from redes) redes \
			where var_id=$1 AND proc_id=$2 AND unit_id=$3 AND estaciones.unid=series.estacion_id and redes.tabla_id=estaciones.tabla " + control_filter(valid_filters, {estacion_id: filter.estacion_id, red_id: filter.red_id, geom: filter.geom, series_id: filter.series_id, public:filter.public}) + " ORDER BY series_id",[campo.variable.id,campo.procedimiento.id,campo.unidades.id])
			//~ return this.getSeries("puntual",{var_id:campo.var_id,proc_id:campo.proc_id,unit_id:campo.unit_id,red_id:filter.red_id,geom:filter.geom,estacion_id:filter.estacion_id})
		})
		.then(result=>{
			if(!result) {
				throw("series not found")
			}
			if(result.rows.length==0) {
				throw("no series match")
			}
			console.log("got " + result.rows.length + " series")
			campo.series = result.rows.map(s=>{
				return {id: s.series_id, estacion: {id: s.estacion_id, geom: new internal.geometry({type: "Point", coordinates: [s.geom_x, s.geom_y]}), tabla: s.tabla, red_id: s.red_id, nombre: s.nombre, id_externo: s.id_externo, public: s.public}}
			}) 
			campo.options.min_time_fraction = (options.min_time_fraction) ? parseFloat(options.min_time_fraction) : 1
			return campo
		})
	}

	
	getSingleCampo(campo) {
		var promise
		var stmt
		var args
		var min_count
		if(campo.options.min_count) {
			min_count = parseInt(campo.options.min_count)
		}
		if (!campo.options.inst) {
			// SERIE NO INSTANTANEA //
			if(!campo.options.timeSupport) {
				return Promise.reject("timeSupport missing or null")
			}
			if (!campo.options.aggFunction) {
				campo.options.aggFunction = "acum"
			}
			if (!campo.options.precision) {
				campo.options.precision = 2
			} else {
				campo.options.precision = parseInt(campo.options.precision)
				if(campo.options.precision.toString == "NaN") {
					return Promise.reject("Bad precision. must be integer")
				}
			}
			var aggStmt
			switch (campo.options.aggFunction.toLowerCase()) {
				case "acum":
					aggStmt = "round(sum(extract(epoch from overlap)/extract(epoch from '" + campo.options.timeSupport.toPostgres() + "'::interval)*valor)::numeric," + campo.options.precision + ")"
					break;
				case "mean":
					aggStmt = "round((sum(extract(epoch from overlap)*valor)/sum(extract(epoch from overlap)))::numeric," + campo.options.precision + ")"
					break;
				case "sum":
					aggStmt = "round(sum(valor)::numeric," + campo.options.precision + ")"
					break;
				case "min":
					aggStmt = "round(least(valor)::numeric," + campo.options.precision + ")"
					break;
				case "max":
					aggStmt = "round(greatest(valor)::numeric," + campo.options.precision + ")"
					break
				case "count":
					aggStmt = "count(valor)"
					break;
				case "diff":
					aggStmt = "round((max(valor)-min(valor))::numeric," + campo.options.precision + ")"
					break;
				case "increment":
					aggStmt = "round((max(valor)-first(valor))::numeric," + campo.options.precision + ")"
					break
				case "array":
					aggStmt = "json_agg(json_build_object('timestart',timestart,'valor',valor))"
					break
				default:
					return Promise.reject(new Error("aggFunction incorrecta"))
					break
			}
				  // tsrange(timestart,timeend,'[]') * tsrange($1,$2,'[]') overlap
				  
			promise = this.pool.query("with o as (\
				select series_id,\
			   observaciones.timestart,\
			   valores_num.valor,\
			   case when timestart < $1\
			   then case when timeend < $1 then '00:00:00'::interval\
					else case when timeend < $2 then timeend - $1\
						 else $2::timestamp - $1::timestamp end\
					end\
				else case when timeend < $2 then timeend - timestart\
					 else case when timestart < $2 then $2::timestamp - timestart\
						  else '00:00:00'::interval end\
					 end\
				end AS overlap\
				from observaciones,valores_num \
				where series_id in (" + campo.series.map(s=>s.id).join(",") + ")\
				and observaciones.timeend>$1 \
				and timestart<$2 \
				and observaciones.id=valores_num.obs_id)\
		select o.series_id,\
		   " + aggStmt + " valor,\
		   count(o.valor)\
		from o \
		group by o.series_id \
		order by o.series_id;",[campo.timestart,campo.timeend])
		} else {
				// SERIE INSTANTANEA //
			if(!campo.options.aggFunction) {
				campo.options.aggFunction =  "nearest"
			}
			if (!campo.options.precision) {
				campo.options.precision = 2
			} else {
				campo.options.precision = parseInt(campo.options.precision)
				if(campo.options.precision.toString == "NaN") {
					return Promise.reject("Bad precision. must be integer")
				}
			}
			if(campo.options.aggFunction.toLowerCase() == "nearest") {     // NEAREST  -> toma timestamp más próximo al centro del intervalo timestart-timeend
				promise = this.pool.query("with o as (\
				select series_id,\
			   observaciones.timestart,\
			   valores_num.valor,\
			   rank() over (partition by series_id order by abs(extract(epoch from observaciones.timestart - ($2 - ($2 - $1)/2))),timestart) rank\
				from observaciones,valores_num \
				where series_id in (" + campo.series.map(s=>s.id).join(",") + ")\
				and observaciones.timestart>=$1 \
				and timestart<$2 \
				and observaciones.id=valores_num.obs_id)\
				select o.series_id,\
				   o.timestart,\
				   o.valor,\
				   1 AS count\
				from o \
				where rank=1",[campo.timestart,campo.timeend])
			} else if(campo.options.aggFunction.toLowerCase() == "array") {     // ARRAY  -> toma todas las tuplas contenidas en el intervalo timestart-timeend
				promise = this.pool.query("with o as (\
				select series_id,\
			   observaciones.timestart,\
			   valores_num.valor\
				from observaciones,valores_num \
				where series_id in (" + campo.series.map(s=>s.id).join(",") + ")\
				and observaciones.timestart>=$1 \
				and timestart<$2 \
				and observaciones.id=valores_num.obs_id)\
				select o.series_id,\
				   json_agg(json_build_object('timestart',o.timestart,'valor',o.valor)) as valor,\
				   count(o.valor)\
				from o \
				group by series_id\
				order by series_id",[campo.timestart,campo.timeend])
			} else {
				var aggFunc
				switch (campo.options.aggFunction.toLowerCase()) {
					case "mean":
						aggFunc="round(avg(valor)::numeric," + campo.options.precision +")"
						break
					case "avg":
						aggFunc="round(avg(valor)::numeric," + campo.options.precision +")"
						break
					case "average":
						aggFunc="round(avg(valor)::numeric," + campo.options.precision +")"
						break
					case "min":
						aggFunc="round(min(valor)::numeric," + campo.options.precision +")"
						break
					case "max":
						aggFunc="round(max(valor)::numeric," + campo.options.precision +")"
						break
					case "count":
						aggFunc="count(valor)"
						break
					case "diff":
						aggFunc="round((max(valor)-min(valor))::numeric," + campo.options.precision +")"
						break
					case "increment":
						aggFunc = "round((max(valor)-first(valor))::numeric," + campo.options.precision + ")"
						break
					case "sum":
						aggFunc="round(sum(valor)::numeric," + campo.options.precision +")"
						break
					default:
						return Promise.reject("Bad aggregate function")
						break
				}
				promise = this.pool.query("SELECT series_id,\
			   " + aggFunc + " valor,\
			    count(observaciones.timestart)\
				from observaciones,valores_num \
				where series_id in (" + campo.series.map(s=>s.id).join(",") + ")\
				and observaciones.timestart>=$1 \
				and timestart<$2 \
				and observaciones.id=valores_num.obs_id\
				group by series_id\
				order by series_id",[campo.timestart,campo.timeend])
			}
		}
		return promise.then(data=>{
			if(!data) {
				throw("no data found")
			}
			if(data.rows.length==0) {
				throw("query returned empty, no data found")
			}
			var datadir = {}
			var countdir = {}
			data.rows.forEach(r=>{
				countdir[r.series_id] = parseInt(r.count)
				if(typeof r.valor == "object") {
					datadir[r.series_id] = r.valor
				} else {
					var number = parseFloat(r.valor)
					if(number.toString() ==  "NaN") {
						datadir[r.series_id] = null
					} else {
						datadir[r.series_id] = number
					}
				}
			})
			campo.series = campo.series.map(s=>{        // AGREGA PROPIEDAD VALOR Y COUNT A CAMPO.SERIES[]
				if(s.id in datadir) {
					s.valor = datadir[s.id]
					s.count = countdir[s.id]
					return s
				} else {
					return
				}
			}).filter(s=>{								//  FILTRA NULOS Y puntos con count < min_count (si campo.options.min_count)
				if(s) {
					if(min_count) {
						if(s.count < min_count) {
							return false
						} else {
							return true
						}
					} else {
						return true
					}
				} else {
					return false
				}
			})
			//~ campo.data = data.rows
			if(campo.options.insertSeriesId) {
				return new internal.campo(campo).toGrid({series_id:campo.options.insertSeriesId})
				.then(obs=>{
					return this.upsertObservacion(obs)
				})
			}
			//~ console.log({campo:campo})
			return new internal.campo(campo)
			//~ return campo
		})		
	}
	
	
	// asociaciones
	
	getAsociaciones(filter={source_tipo:"puntual",dest_tipo:"puntual"},options={}) {
		// console.log({filter:filter})
		//~ var tabla_sitios = (filter.source_tipo=="areal") ? "areas_pluvio" : (filter.source_tipo=='raster') ? "escenas" : "estaciones"
		//~ var tabla_series = (filter.source_tipo=="areal") ? "series_areal" : (filter.source_tipo=='raster') ? "series_rast" : "series"
		//~ var tabla_dest_series = (filter.dest_tipo=="areal") ? "series_areal" : (filter.dest_tipo=='raster') ? "series_rast" : "series"
		//~ var series_site_id_col = (filter.source_tipo=="areal") ? "area_id" : (filter.source_tipo=='raster') ? "escena_id" : "estacion_id"
		//~ var site_id_col = (filter.source_tipo=="areal") ? "unid" : (filter.source_tipo=='raster') ? "id" : "unid"
		//~ var provider_col = (filter.source_tipo=="areal") ? "s.fuentes_id" : (filter.source_tipo=='raster') ? "s.fuentes_id" : "e.tabla"
		//~ var params = [filter.source_tipo,filter.source_series_id,filter.estacion_id,filter.provider_id,filter.source_var_id,filter.source_proc_id,filter.dest_tipo,filter.dest_series_id,filter.dest_var_id,filter.dest_proc_id,options.agg_func,options.dt,options.t_offset,filter.habilitar]
	
		var filter_string = control_filter2(
			{id:{type:"integer"},source_tipo: {type: "string"}, source_series_id: {type: "number"}, source_estacion_id: {type: "number"}, source_fuentes_id: {type: "string"}, source_var_id: {type: "number"},  source_proc_id: {type: "number"}, dest_tipo: {type: "string"}, dest_series_id: {type: "number"}, dest_var_id: {type: "number"}, dest_proc_id: {type: "number"}, agg_func: {type: "string"}, dt: {type: "interval"}, t_offset: {type: "interval"},habilitar: {type: "boolean"}}, 
			{source_tipo: filter.source_tipo, source_series_id: filter.source_series_id, source_estacion_id: filter.estacion_id, source_fuentes_id: filter.provider_id, source_var_id: filter.source_var_id,  source_proc_id: filter.source_proc_id, dest_tipo: filter.dest_tipo, dest_series_id: filter.dest_series_id, dest_var_id: filter.dest_var_id, dest_proc_id: filter.dest_proc_id, agg_func: options.agg_func, dt: options.dt, t_offset: options.t_offset},
			"asociaciones_view")
		var query = "SELECT * \
		    FROM asociaciones_view\
		    WHERE 1=1 " + filter_string 
		    //~ source_tipo=coalesce($1,source_tipo)\
		    //~ AND source_series_id=coalesce($2,source_series_id)\
		    //~ AND source_estacion_id=coalesce($3,source_estacion_id)\
		    //~ AND source_fuentes_id=coalesce($4::text,source_fuentes_id::text)\
		    //~ AND source_var_id=coalesce($5,source_var_id)\
		    //~ AND source_proc_id=coalesce($6,source_proc_id)\
		    //~ AND dest_tipo=coalesce($7,dest_tipo)\
		    //~ AND dest_series_id=coalesce($8,dest_series_id)\
		    //~ AND dest_var_id=coalesce($9,dest_var_id)\
		    //~ AND dest_proc_id=coalesce($10,dest_proc_id)\
		    //~ AND agg_func=coalesce($11,agg_func)\
		    //~ AND dt=coalesce($12,dt)\
		    //~ AND t_offset=coalesce($13,t_offset)\
		    //~ AND habilitar=coalesce($14,habilitar)"
		//~ console.log(pasteIntoSQLQuery(query,params))
		//~ return this.pool.query(query,params)
		//~ "SELECT a.id,\
									   //~ a.source_tipo, \
									   //~ a.source_series_id, \
									   //~ a.dest_tipo, \
									   //~ a.dest_series_id, \
									   //~ a.agg_func, \
									   //~ a.dt::text, \
									   //~ a.t_offset::text, \
									   //~ a.precision, \
									   //~ a.source_time_support::text, \
									   //~ a.source_is_inst, \
									   //~ row_to_json(s) source_series, \
									   //~ row_to_json(d) dest_series, \
									   //~ row_to_json(e) site\
		//~ FROM asociaciones a," + tabla_series + " s, "+ tabla_dest_series + " d," + tabla_sitios + " e\
		//~ WHERE a.source_series_id=s.id\
		//~ AND a.dest_series_id=d.id\
		//~ AND s."+series_site_id_col + "=e."+site_id_col+" \
		//~ AND a.source_tipo=coalesce($1,a.source_tipo) \
		//~ and a.source_series_id=coalesce($2,a.source_series_id)\
		//~ AND a.dest_tipo=coalesce($3,a.dest_tipo) \
		//~ and a.dest_series_id=coalesce($4,a.dest_series_id)\
		//~ AND a.agg_func=coalesce($5,a.agg_func)\
		//~ AND a.dt=coalesce($6,a.dt)\
		//~ AND a.t_offset=coalesce($7,a.t_offset)\
		//~ AND s.var_id=coalesce($8,s.var_id)\
		//~ AND d.var_id=coalesce($9,d.var_id)\
		//~ AND s.proc_id=coalesce($10,s.proc_id)\
		//~ AND d.proc_id=coalesce($11,d.proc_id)\
		//~ AND e."+site_id_col+"=coalesce($12,e."+site_id_col+")\
		//~ AND "+provider_col+"=coalesce($13,"+provider_col+")\
		//~ ORDER BY a.id",[filter.source_tipo,filter.source_series_id,filter.dest_tipo,filter.dest_series_id,options.agg_func,options.dt,options.t_offset,filter.source_var_id,filter.dest_var_id,filter.source_proc_id,filter.dest_proc_id,filter.estacion_id,filter.provider_id])
		console.log(query)
		return this.pool.query(query)
		.then(result=>{
			if(result.rows) {
				return result.rows
			} else {
				return []
			}
		})
		.catch(e=>{
			console.error(e)
			return
		})
	}
	
	getAsociacion(id) {
		return this.pool.query("SELECT * from asociaciones WHERE id=$1",[id])
		.then(result=>{
			if(!result) {
				throw("query error")
			}
			if(result.rows.length==0) {
				throw("nothing found")
			}
			var asociacion = result.rows[0]
			var tabla_sitios = (asociacion.source_tipo=="areal") ? "areas_pluvio" : (asociacion.source_tipo=='raster') ? "escenas" : "estaciones"
			var tabla_series = (asociacion.source_tipo=="areal") ? "series_areal" : (asociacion.source_tipo=='raster') ? "series_rast" : "series"
			var tabla_dest_series = (asociacion.dest_tipo=="areal") ? "series_areal" : (asociacion.dest_tipo=='raster') ? "series_rast" : "series"
			var series_site_id_col = (asociacion.source_tipo=="areal") ? "area_id" : (asociacion.source_tipo=='raster') ? "escena_id" : "estacion_id"
			var site_id_col = (asociacion.source_tipo=="areal") ? "unid" : (asociacion.source_tipo=='raster') ? "id" : "unid"
			var provider_col = (asociacion.source_tipo=="areal") ? "s.fuentes_id" : (asociacion.source_tipo=='raster') ? "s.fuentes_id" : "e.tabla"
			return this.pool.query("SELECT a.id,\
									   a.source_tipo, \
									   a.source_series_id, \
									   a.dest_tipo, \
									   a.dest_series_id, \
									   a.agg_func, \
									   a.dt::text, \
									   a.t_offset::text, \
									   a.precision, \
									   a.source_time_support::text, \
									   a.source_is_inst, \
									   a.expresion,\
									   row_to_json(s) source_series, \
									   row_to_json(d) dest_series, \
									   row_to_json(e) site\
				FROM asociaciones a," + tabla_series + " s, "+ tabla_dest_series + " d," + tabla_sitios + " e\
				WHERE a.id=$1 \
				AND a.source_series_id=s.id\
				AND a.dest_series_id=d.id\
				AND s."+series_site_id_col + "=e."+site_id_col,[asociacion.id])
			.then(result=>{
				if(!result) {
					throw("query error")
				}
				if(result.rows.length==0) {
					throw("not found")
				}
				//~ console.log({result:result.rows})
				return result.rows[0]
			})
		})
	}
	
	upsertAsociacion(asociacion) {
		if(!asociacion.source_series_id) {
			return Promise.reject("missing source_series_id")
		}
		if(!asociacion.dest_series_id) {
			return Promise.reject("missing dest_series_id")
		}
		return this.pool.query("INSERT INTO asociaciones (source_tipo, source_series_id, dest_tipo, dest_series_id, agg_func, dt, t_offset, precision, source_time_support, source_is_inst, habilitar, expresion) \
VALUES (coalesce($1,'puntual'),$2,coalesce($3,'puntual'),$4,$5,$6,$7,$8,$9,$10,coalesce($11,true),$12)\
ON CONFLICT (dest_tipo, dest_series_id) DO UPDATE SET\
	source_tipo=excluded.source_tipo,\
	source_series_id=excluded.source_series_id,\
	agg_func=excluded.agg_func,\
	dt=excluded.dt,\
	t_offset=excluded.t_offset,\
	precision=excluded.precision,\
	source_time_support=excluded.source_time_support,\
	source_is_inst=excluded.source_is_inst,\
	habilitar=excluded.habilitar,\
	expresion=excluded.expresion\
	RETURNING *",[asociacion.source_tipo, asociacion.source_series_id, asociacion.dest_tipo, asociacion.dest_series_id, asociacion.agg_func, asociacion.dt, asociacion.t_offset, asociacion.precision, asociacion.source_time_support, asociacion.source_is_inst, asociacion.habilitar, asociacion.expresion])
		.then(result=>{
			//~ console.log({result:result})
			if(!result) {
				console.error("query error")
				throw("query error")
			}
			if(result.rows.length==0){
				console.error("Nothing upserted")
				return
			}
			return result.rows[0]
		})
	}
	
	upsertAsociaciones(asociaciones) {
		if(!asociaciones || asociaciones.length == 0) {
			return Promise.reject("Faltan asociaciones")
		}
		var upserted = asociaciones.map(asociacion=>{
			return this.upsertAsociacion(asociacion)
		})
		return Promise.allSettled(upserted)
		.then(result=>{
			if(result.length == 0) {
				throw("Nada fue acualizado/creado")
			}			
			var errors = []
			var valid_results = result.map(r=>{
				if(r.status == 'fulfilled') {
					return r.value
				} else {
					console.error(r.reason)
					errors.push(r.reason)
					return
				}
			}).filter(r=>r)
			if(valid_results.length == 0) {
				throw(errors[0])
			}
			return valid_results
		})
		
	}
	
	runAsociaciones(filter,options={}) {
		return this.getAsociaciones(filter,options)
		.then(async asociaciones=>{
			if(asociaciones.length==0) {
				console.log("No se encontraron asociaciones")
				return []
			}
			// filter out no habilitadas
			asociaciones = asociaciones.filter(a=>a.habilitar)
			var results = []
			for(var a of asociaciones) {
				var opt = {aggFunction: a.agg_func, t_offset: a.t_offset, insertSeriesId: a.dest_series_id, insertSeriesTipo: a.dest_tipo}
				if(a.source_time_support) {
					opt.source_time_support = a.source_time_support
				}
				if(a.precision) {
					opt.precision = a.precision
				}
				if(options.inst) {
					opt.inst = options.inst
				} else if (a.source_is_inst) {
					opt.inst = a.source_is_inst
				}
				if(options.no_insert) {
					opt.no_insert = true
				}
				if(options.no_send_data) {
					opt.no_send_data = options.no_send_data
				}
				if(options.no_update) {
					opt.no_update = true
				}
				//~ promises.push(a)
				var result
				try {
					if(a.agg_func) {
						if(a.agg_func == "math") {
							if(a.source_tipo != "puntual") {
								throw("Tipo inválido para convertir por expresión (math)")
							}
							result = await  this.getSerieAndConvert(a.source_series_id,filter.timestart,filter.timeend,a.expresion,a.dest_series_id)
						} else {
							result =  await this.getRegularSeries(a.source_tipo,a.source_series_id,a.dt,filter.timestart,filter.timeend,opt)
						}
					} else if(a.source_tipo=="raster" && a.dest_tipo=="areal") {
						console.log("Running asociacion raster to areal")
						result = await this.getSerie('areal',a.dest_series_id,undefined,undefined,{no_metadata:true})
						.then(series=>{
							return this.rast2areal(a.source_series_id,filter.timestart,filter.timeend,series.estacion.id,options)
						})
					}
					results.push(result)
				} catch (e) {
					console.error(e)
				} 
			}
			return results
		})
		.then(inserts=>{
			if(!inserts) {
				return []
			}
			if(inserts.length==0) {
				return []
			}
			if(options.no_send_data) {
				return inserts.reduce((a,b)=>a+b)
			}
			return flatten(inserts)
			//~ var allinserts = []
			//~ inserts.forEach(i=>{
				//~ allinserts.push(...i)
			//~ })
			//~ return allinserts // .flat()
		})
		//~ .catch(e=>{
			//~ console.error(e)
			//~ return
		//~ })
	}
	
	runAsociacion(id,filter={},options={}) {
		return this.getAsociacion(id)
		.then(a=>{
			console.log("Got asociacion " + a.id)
			var opt = {aggFunction: a.agg_func, t_offset: a.t_offset, insertSeriesId: a.dest_series_id}
			if(a.source_time_support) {
				opt.source_time_support = a.source_time_support
			}
			if(a.precision) {
				opt.precision = a.precision
			}
			if(options.inst) {
				opt.inst = options.inst
			} else if (a.source_is_inst) {
				opt.inst = a.source_is_inst
			}
			if(options.no_insert) {
				opt.no_insert = true
			}
			if(options.no_send_data) {
				opt.no_send_data = options.no_send_data
			}
			if(!filter.timestart || !filter.timeend) {
				throw("missing timestart and/or timeend")
			}
			var timestart = new Date(filter.timestart)
			var timeend = new Date(filter.timeend)
			if(timestart.toString() == "Invalid Date") {
				throw("invalid timestart")
			}
			if(timeend.toString() == "Invalid Date") {
				throw("invalid timeend")
			}
			if(a.agg_func && a.agg_func == "math") {
				if(a.source_tipo != "puntual") {
					throw("Tipo inválido para convertir por expresión (math)")
				}
				return this.getSerieAndConvert(a.source_series_id,timestart,timeend,a.expresion,a.dest_series_id)
			} else {
				return this.getRegularSeries(a.source_tipo,a.source_series_id,a.dt,timestart,timeend,opt)
			}
		})
	}
	
	getSerieAndConvert(series_id,timestart,timeend,expresion,dest_series_id) {
		return this.getSerie('puntual',series_id,timestart,timeend)
		.then(serie=>{
			if(!serie.observaciones) {
				throw("No se encontraron observaciones")
			}
			if(serie.observaciones.length == 0) {
				throw("No se encontraron observaciones")
			}
			return serie.observaciones.map(o=>{
				o.series_id = (dest_series_id) ? dest_series_id : null
				var valor = parseFloat(o.valor)
				o.valor = eval(expresion)
				//console.log(`convert: ${valor} -> ${o.valor}`)
				return o
			})
		})
		.then(observaciones=>{
			if(dest_series_id) {
				return this.upsertObservacionesPuntual(observaciones)
			} else {
				return observaciones
			}
		})
	}
	
	deleteAsociacion(id) {
		return this.pool.query("DELETE FROM asociaciones WHERE id=$1 RETURNING *",[id])
		.then(result=>{
			if(!result) {
				throw("query error")
			}
			if(result.rows.length==0) {
				throw("nothing deleted")
			}
			return result.rows[0]
		})
	}
	
	// ACCESSORS //
	
	getRedesAccessors(filter={}) {
		var filter_string = control_filter2({"tipo":{type: "string"},"tabla_id":{type:"string"},"var_id":{type:"integer"},"accessor":{type:"string"},"asociacion":{type:"boolean"}},filter,"redes_accessors")
		// console.log(filter_string)
		return this.pool.query("SELECT * from redes_accessors WHERE 1=1 " + filter_string)
		.then(result=>{
			return result.rows
		})
	}

	updateAccessorToken(accessor_id,token,token_expiry_date) {
		return this.pool.query("UPDATE accessors SET token=$1, token_expiry_date=$2 WHERE class=$3 RETURNING class AS accessor_id,token,token_expiry_date",[token,token_expiry_date,accessor_id])
		.then(result=>{
			if(!result.rows.length) {
				throw("updateToken failed, no rows affected")
			}
			return result.rows[0]
		})
	}

	getAccessorToken(accessor_id) {
		return this.pool.query("SELECT class AS accessor_id,token,token_expiry_date FROM accessors WHERE class=$1",[accessor_id])
		.then(result=>{
			if(!result.rows.length) {
				throw("getToken failed, no rows matched")
			}
			return result.rows[0]
		})
	}
	//~ upsertAccessor(accessor) {
		//~ return this.pool.query("INSERT INTO accessors (type,name,parameters) VALUES ($1,$2,$3) ON CONFLICT (type,name) DO UPDATE SET parameters=excluded.parameters RETURNING *",
		    //~ [accessor.type, accessor.name, accessor.parameters]) 
		//~ .then(results=>{
			//~ if(!results.rows) {
				//~ console.error("Query error")
				//~ return
			//~ }
			//~ if(results.rows.length < 1) {
				//~ console.error("Nothing inserted")
				//~ return
			//~ }
			//~ var r = results.rows[0]
			//~ return new internal.Accessor(r.type, r.parameters)
		//~ })
	//~ }
	
	//~ getAccessorByID(id) {
		//~ return this.pool.query("SELECT * from accessors where id=$1",[id])
		//~ .then(results=>{
			//~ if(!results.rows) {
				//~ console.error("Query error")
				//~ return
			//~ }
			//~ if(results.rows.length < 1) {
				//~ console.error("Nothing inserted")
				//~ return
			//~ }
			//~ var r = results.rows[0]
			//~ return new internal.Accessor(r.type, r.parameters)
		//~ })
		//~ .catch(e=>{
			//~ console.error(e)
			//~ return
		//~ })
	//~ }
	
	//~ getAccessors(filter) {
		//~ var filter_string = control_filter({id:"int", type: "string", name: "regex_string"}, filter, "accessors")
		//~ return this.pool.query("SELECT * from accessors where 1=1 " + filter_string)
		//~ .then(results=>{
			//~ if(!results.rows) {
				//~ console.error("Query error")
				//~ return
			//~ }
			//~ if(results.rows.length < 1) {
				//~ console.error("Nothing found")
				//~ return []
			//~ }
			//~ var observaciones = []
			//~ for(var i=0;i<results.rows.length;i++) {
				//~ var r = results.rows[i]
				//~ observaciones.push(new internal.Accessor(r.type, r.parameters))
			//~ }
			//~ return observaciones
		//~ })
		//~ .catch(e=>{
			//~ console.error(e)
			//~ return
		//~ })
	//~ }
	
	//~ deleteAccessors(filter) {
		//~ var filter_string = control_filter({id:"int", type: "string", name: "regex_string"}, filter, "accessors")
		//~ return this.pool.query("DELETE from accessors where 1=1 " + filter_string + " RETURNING *")
		//~ .then(results=>{
			//~ if(!results.rows) {
				//~ console.error("Query error")
				//~ return
			//~ }
			//~ if(results.rows.length < 1) {
				//~ console.error("Nothing found")
				//~ return []
			//~ }
			//~ var observaciones = []
			//~ for(var i=0;i<results.rows.length;i++) {
				//~ var r = results.rows[i]
				//~ observaciones.push(new internal.Accessor(r.type, r.parameters))
			//~ }
			//~ return observaciones
		//~ })
		//~ .catch(e=>{
			//~ console.error(e)
			//~ return
		//~ })
	//~ }
	
	
	interval2epoch(interval) {
		if(interval instanceof Object) {
			interval = timeSteps.interval2string(interval)
			//~ var seconds = 0
			//~ Object.keys(interval).map(k=>{
				//~ switch(k) {
					//~ case "seconds":
					//~ case "second":
						//~ seconds = seconds + interval[k]
						//~ break
					//~ case "minutes":
					//~ case "minute":
						//~ seconds = seconds + interval[k] * 60
						//~ break
					//~ case "hours":
					//~ case "hour":
						//~ seconds = seconds + interval[k] * 3600
						//~ break
					//~ case "days":
					//~ case "day":
						//~ seconds = seconds + interval[k] * 86400
						//~ break
					//~ case "weeks":
					//~ case "week":
						//~ seconds = seconds + interval[k] * 86400 * 7
						//~ break
					//~ case "months":
					//~ case "month":
					//~ case "mon":
						//~ seconds = seconds + interval[k] * 86400 * 31
						//~ break
					//~ case "years":
					//~ case "year":
						//~ seconds = seconds + interval[k] * 86400 * 365
						//~ break
					//~ default:
						//~ break
				//~ }
			//~ })
			//~ return Promise.resolve(seconds)
		}
		if(!interval) {
			return 0
		} 
		//~ else {
			console.log({interval:interval})
			//~ var client2 = new Client2()
			//~ client2.connectSync(this.dbConnectionString)
			//~ var result = client2.querySync("SELECT extract(epoch from $1::interval) AS epoch",[interval.toString()])
			return this.pool.query("SELECT extract(epoch from $1::interval) AS epoch",[interval.toString()])
			.then(result=>{
				return result.rows[0].epoch
			})
			//~ client2.end()
			//~ console.log({result:result})
			//~ return result[0].epoch
		//~ }
	}
	
	date2epoch(date) {
		return this.pool.query("SELECT extract(epoch from $1::timestamp) AS epoch",[date])
		.then((result)=>{
			return result.rows[0].epoch
		})
		.catch(e=>{
			console.error(e)
		})
	}
	
	date2obj(date) {
		if(date instanceof Date) {
			return date
		}
		return this.pool.query("SELECT $1::timestamp AS date",[date])
		.then((result)=>{
			return result.rows[0].date
		})
		.catch(e=>{
			console.error(e)
		})
	}
	
	getAlturas2Mnemos(estacion_id,startdate,enddate) {
		return new Promise( (resolve, reject) => {
			if(!estacion_id) {
				reject("falta estacion_id")
			}
			if(! parseInt(estacion_id)) {
				reject("estacion_id incorrecto")
			}
			if(! startdate) {
				reject("falta startdate")
			}
			var sd = new Date(startdate) 
			if(isNaN(sd)) {
				reject("startdate incorrecto")
			}
			if(! enddate) {
				reject("falta enddate")
			}
			var ed = new Date(enddate)
			if(isNaN(ed)) {
				reject("enddate incorrecto")
			}
			resolve(this.pool.query("SELECT series.estacion_id codigo_de_estacion,1 codigo_de_variable,to_char(observaciones.timestart,'DD') dia, to_char(observaciones.timestart,'MM') mes, to_char(observaciones.timestart,'YYYY') anio,extract(hour from timestart) hora,extract(minute from timestart) minuto,valor FROM series,observaciones,valores_num where series.estacion_id=$1 AND series.var_id=2 and series.proc_id=1 AND series.id=observaciones.series_id and observaciones.id=valores_num.obs_id AND timestart>=$2 and timestart<=$3 order by timestart", [estacion_id,sd,ed]))
		})
	}
	
	// ESTADISTICAS
	
	getCuantilesDiariosSuavizados(tipo="puntual",series_id,timestart='1974-01-01',timeend='2020-01-01',range=15,t_offset='0 hours', precision=3,isPublic) {
		if(!series_id) {
			return Promise.reject("missing series_id")
		}
		var obs_t = ( tipo.toLowerCase() == "areal" ) ? "observaciones_areal" : "observaciones"
		var val_t = ( tipo.toLowerCase() == "areal" ) ? "valores_num_areal" : "valores_num"
		return this.getSerie(tipo,series_id,undefined,undefined,undefined,isPublic)
		.then(serie=>{
			return this.pool.query("WITH s AS (\
				SELECT generate_series($1::date,$3::date,'1 days'::interval) d\
				), obs AS (\
				SELECT timestart,timeend,valor\
				FROM " + obs_t + "," + val_t + "\
				WHERE series_id=$5\
					AND " + obs_t + ".id=obs_id \
					AND timestart>=$1\
					AND timestart<=$3::timestamp+$2::interval+$4::interval\
				), obs_diaria as (\
				SELECT s.d+$2::interval timestart,\
					   s.d+$4::interval+$2::interval timeend,\
					   avg(obs.valor) valor\
					   FROM s\
					   LEFT JOIN obs ON (s.d::date=(obs.timestart-$2::interval)::date)\
					   GROUP BY s.d+$2::interval, s.d+$4::interval+$2::interval\
				), doys as ( select generate_series(1,366,1) doy\
				), wfunc as (\
	   select doys.doy,\
			  extract(doy from obs_diaria.timestart) obs_doy,\
			  obs_diaria.timestart,\
			  obs_diaria.valor\
	   from obs_diaria, doys\
	   where is_within_doy_range(doys.doy,obs_diaria.timestart::date,$6::int) = true\
	   and obs_diaria.valor is not null\
	   )\
		select $8::text tipo,\
				  $5 series_id,\
			   doy,\
			   round(min(valor)::numeric,$7::integer) as min,\
			   round(avg(valor)::numeric,$7::integer) as mean,\
			   round(max(valor)::numeric,$7::integer) as max,\
			   count(valor) as count,\
			   round(percentile_cont(0.01) within group (order by valor)::numeric,$7::integer) as p01 ,\
			   round(percentile_cont(0.1) within group (order by valor)::numeric,$7::integer) as p10 ,\
			   round(percentile_cont(0.5) within group (order by valor)::numeric,$7::integer) as p50 ,\
			   round(percentile_cont(0.9) within group (order by valor)::numeric,$7::integer) as p90 ,\
			   round(percentile_cont(0.99) within group (order by valor)::numeric,$7::integer) as p99, \
			   $6::integer as window_size,\
			   min(timestart)::date timestart,\
			   max(timestart)::date timeend\
		from wfunc\
		group by doy\
		order by doy",[timestart,t_offset, timeend, '1 days', series_id, range, precision, tipo])
	    }).then(result=>{
		   if(!result.rows) {
			   throw("Nothing found")
			   return
		   }
		   return new internal.dailyStatsList(result.rows)
	   })
	}
	
	getCuantilDiarioSuavizado(tipo="puntual",series_id,cuantil,timestart='1974-01-01',timeend='2020-01-01',range=15,t_offset='0 hours', precision=3,isPublic) {
		if(!series_id) {
			return Promise.reject("missing series_id")
		}
		if(!cuantil) {
			return Promise.reject("missing cuantil (0-1)")
		}
		return this.getSerie(tipo,series_id,undefined,undefined,undefined,isPublic)
		.then(series=>{
			//~ console.log("got series_id:"+series_id+", tipo:"+tipo)
			var obs_t = ( tipo.toLowerCase() == "areal" ) ? "observaciones_areal" : "observaciones"
			var val_t = ( tipo.toLowerCase() == "areal" ) ? "valores_num_areal" : "valores_num"
			return this.pool.query("WITH s AS (\
				SELECT generate_series($1::date,$3::date,'1 days'::interval) d\
				), obs AS (\
				SELECT timestart,timeend,valor\
				FROM " + obs_t + "," + val_t + "\
				WHERE series_id=$5\
					AND " + obs_t + ".id=obs_id \
					AND timestart>=$1\
					AND timestart<=$3::timestamp+$2::interval+$4::interval\
				), obs_diaria as (\
				SELECT s.d+$2::interval timestart,\
					   s.d+$4::interval+$2::interval timeend,\
					   avg(obs.valor) valor\
					   FROM s\
					   LEFT JOIN obs ON (s.d::date=(obs.timestart-$2::interval)::date)\
					   GROUP BY s.d+$2::interval, s.d+$4::interval+$2::interval\
				), doys as ( select generate_series(1,366,1) doy\
				), wfunc as (\
	   select doys.doy,\
			  extract(doy from obs_diaria.timestart) obs_doy,\
			  obs_diaria.timestart,\
			  obs_diaria.valor\
	   from obs_diaria, doys\
	   where is_within_doy_range(doys.doy,obs_diaria.timestart::date,$6::int) = true\
	   and obs_diaria.valor is not null\
	   )\
		select $8::text tipo,\
			   $5::integer series_id,\
			   $9::numeric as cuantil,\
			   $6::integer as window_size,\
			   doy,\
			   min(timestart)::date timestart,\
			   max(timestart)::date timeend,\
			   count(valor) as count,\
			   round(percentile_cont($9) within group (order by valor)::numeric,$7::integer) as valor\
		from wfunc\
		group by doy\
		order by doy",[timestart,t_offset, timeend, '1 days', series_id, range, precision, tipo, cuantil])
	   })
	   .then(result=>{
		   if(!result.rows) {
			   throw("Nothing found")
			   return
		   }
		   return result.rows
	   })
	}
	
	async upsertDailyDoyStats2(tipo,series_id,timestart,timeend,range,t_offset,precision,is_public) {
		return this.getCuantilesDiariosSuavizados(tipo,series_id,timestart,timeend,range,t_offset,precision,is_public)
		.then(dailyStats=>{
			//~ console.log(dailyStats)
			return this.upsertDailyDoyStats(dailyStats)
		})
	}

	upsertDailyDoyStats(dailyStatsList) {
		var promises = dailyStatsList.values.map(i=>{
			return this.pool.query("INSERT INTO series_doy_stats (tipo, series_id,doy, count, min, max, mean, p01, p10, p50, p90, p99, window_size, timestart, timeend) VALUES\
		 ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)\
		 ON CONFLICT (tipo,series_id,doy)\
		 DO UPDATE SET count=excluded.count,\
					   min=excluded.min,\
					   max=excluded.max,\
					   mean=excluded.mean,\
					   p01=excluded.p01,\
					   p10=excluded.p10,\
					   p50=excluded.p50,\
					   p90=excluded.p90,\
					   p99=excluded.p99,\
					   window_size=excluded.window_size,\
					   timestart=excluded.timestart,\
					   timeend=excluded.timeend\
		 RETURNING *",[i.tipo, i.series_id,i.doy, i.count, i.min, i.max, i.mean, i.p01, i.p10, i.p50, i.p90, i.p99, i.window_size, i.timestart, i.timeend])
			.then(result=>{
				return result.rows[0]
			})
		})
	 return Promise.all(promises)
	 .then(results=>{
		 return new internal.dailyStatsList(results)
	 })
    }
    
    getDailyDoyStats(tipo="puntual",series_id,isPublic) {
		return this.getSerie(tipo,series_id,undefined,undefined,undefined,isPublic)
		.then(serie=>{
			return this.pool.query("SELECT * FROM series_doy_stats WHERE tipo=$1 AND series_id=$2 ORDER BY doy",[tipo,series_id])
		})
		.then(result=>{
			if(!result.rows) {
				throw("Nothing found")
				return
			}
			return new internal.dailyStatsList(result.rows)
		})
	}
    
	upsertMonthlyStats(tipo,series_id) {
		return this.getDailyDoyStats(tipo,series_id)
		.then(dailyStatsList=>{
			var cuantiles_mensuales = dailyStatsList.getMonthlyValues2()
			var values = Object.keys(cuantiles_mensuales).map(key=>{
				// console.log("key:"+key)
				var m = cuantiles_mensuales[key]
				return pasteIntoSQLQuery("('puntual',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",[series_id,parseInt(key),m.count,m.min,m.max,m.mean,m.p01,m.p10,m.p50,m.p90,m.p99,m.timestart.toISOString(),m.timeend.toISOString()])
			}).join(",")
			if(!values.length) {
				console.log("No stats found")
				return []
			}
			var stmt = `INSERT INTO series_mon_stats (tipo, series_id, mon,count ,min ,max ,mean ,p01 ,p10 ,p50 ,p90 ,p99 ,timestart ,timeend) \
			VALUES ${values} \
			ON CONFLICT (tipo,series_id,mon) DO UPDATE SET count=excluded.count ,min=excluded.min ,max=excluded.max ,mean=excluded.mean ,p01=excluded.p01 ,p10=excluded.p10 ,p50=excluded.p50 ,p90=excluded.p90 ,p99=excluded.p99 ,timestart=excluded.timestart ,timeend=excluded.timeend RETURNING *`
			// console.log(stmt)
			return this.pool.query(stmt)
			.then(result=>{
				return new internal.monthlyStatsList(result.rows)
			})
		})
	}

	getMonthlyStats(tipo="puntual",series_id,isPublic) {
		return this.getSerie(tipo,series_id,undefined,undefined,undefined,isPublic)
		.then(serie=>{
			return this.pool.query("SELECT * FROM series_mon_stats WHERE tipo=$1 AND series_id=$2 ORDER BY mon",[tipo,series_id])
		})
		.then(result=>{
			if(!result.rows) {
				throw("Nothing found")
				return
			}
			return new internal.monthlyStatsList(result.rows)
		})
	}

	getMonthlyStatsSeries(tipo="puntual",series_id,isPublic) {
		var filter
		var params
		if(!series_id) {
			filter = "WHERE tipo=$1" 
			params = [tipo]
		} else if(Array.isArray(series_id)) {
			if(series_id.length) {
				var id_list = series_id.map(id=>parseInt(id)).join(",")
				filter = "WHERE tipo=$1 AND series_id IN (" + id_list + ")"
				params = [tipo]
			} else {
				filter = "WHERE tipo=$1" 
				params = [tipo]
			}
		} else {
			filter = "WHERE tipo=$1 AND series_id=$2"
			params = [tipo,series_id]
		}
		var stmt = "SELECT tipo,series_id,json_agg(json_build_object('mon',mon,'count',count,'min',min,'max',max,'mean',mean,'p01',p01,'p10',p10,'p50',p50,'p90',p90,'p99',p99,'timestart',timestart,'timeend',timeend) ORDER BY mon) AS stats FROM series_mon_stats " + filter + " GROUP BY tipo,series_id ORDER BY tipo,series_id"
		console.log(stmt)
		return this.pool.query(stmt,params)
		.then(result=>{
			return result.rows
		})
	}

	extract_doy_from_date(date) {
		date = new Date(date)
		var first = new Date(date.getUTCFullYear(),0,1)
		return Math.round((date - first)/24/3600/1000 + 1,0)
	}
	is_within_doy_range(date,doy,range) {
		if(Math.abs(doy - this.extract_doy_from_date(date)) < range) {
			return true
		} else if (Math.abs(doy - (this.extract_doy_from_date(date)-365)) < range) {
			return true
		} else if (Math.abs((doy-365) - this.extract_doy_from_date(date)) < range) {
			return true
		} else {
			return false
		}          
	}
	roundTo(value,precision) {
		var regexp = new RegExp("^(\\d+\\." + "\\d".repeat(precision) + ")\\d+$")
		return parseFloat((parseFloat(value)+.5/10**precision).toString().replace(regexp,"$1"))
	}
	//~ getCuantilesDiariosSuavizadosTodos
	calcPercentilesDiarios(tipo="puntual",series_id,timestart='1974-01-01',timeend='2020-01-01',range=15,t_offset='0 hours', precision=3,isPublic,update=false) {
		if(!series_id) {
			return Promise.reject("missing series_id")
		}
		return this.getSerie(tipo,series_id,undefined,undefined,undefined,isPublic)
		.then(serie=>{
			var obs_t = ( tipo.toLowerCase() == "areal" ) ? "observaciones_areal" : "observaciones"
			var val_t = ( tipo.toLowerCase() == "areal" ) ? "valores_num_areal" : "valores_num"
			// queries for daily means
			return this.pool.query("WITH s AS (\
				SELECT generate_series($1::date,$3::date,'1 days'::interval) d\
				), obs AS (\
				SELECT timestart,timeend,valor\
				FROM " + obs_t + "," + val_t + "\
				WHERE series_id=$4\
					AND " + obs_t + ".id=obs_id \
					AND timestart>=$1\
					AND timestart<=$3::timestamp+$2::interval+'1 days'::interval\
					AND valor is not null\
				) \
				SELECT s.d+$2::interval timestart,\
					   s.d+'1 days'::interval+$2::interval timeend,\
					   avg(obs.valor) valor\
					   FROM s\
					   JOIN obs ON (s.d::date=(obs.timestart-$2::interval)::date)\
					   GROUP BY s.d+$2::interval, s.d+'1 days'::interval+$2::interval",[timestart,t_offset,timeend,series_id])
		})
		.then(result=>{
			if(!result.rows) {
				throw("No observations found")
				return
			}
			if(result.rows.length==0){
				throw("No observations found")
				return
			}
			var obs_diarias=result.rows
			//~ var doys = []
			var percentiles = []
			for(var doy=1; doy<=366;doy++) {
				var obs = obs_diarias.filter(d=> this.is_within_doy_range(d.timestart,doy,range))
				var valores = obs.map(o=>parseFloat(o.valor)).sort((a,b)=>a-b)
				//~ console.log(valores.join(","))
				var dates = obs.map(o=>o.timestart).sort()
				var obslength=obs.length
				var timestart = dates[0]
				var timeend=dates[obslength-1]
				for(var percentil=1;percentil<=99;percentil++) {
					var index = obslength*percentil/100
					var value
					if(Math.round(index,0) == index) {
						value = (valores[index-1] + valores[index])/2
					} else {
						value = valores[Math.round(index)-1]
					}
					//~ value = (precision != 0) ? 1/(10 ** precision) * Math.round(value * 10 ** precision) : value
					var v = this.roundTo(value,precision) // value.toString().replace(/^(\d+\.\d\d\d)\d+$/,"$1") // .replace(/\.\d+$/,x=> x.substring(0,precision+1))
					//~ console.log({percentil:percentil,value:v})
					//~ var v = value
					//~ console.log(typeof v)
					percentiles.push(new internal.doy_percentil({doy:doy,percentil:percentil/100,valor:v,window_size:range,timestart:timestart,timeend:timeend,count:obslength}))
				}
				//~ doys.push({doy:doy,count:obslength,percentiles:percentiles})
			}
			return percentiles // doys
		})
		.then(percentiles=>{
			if(update) {
				return this.upsertPercentilesDiarios(tipo,series_id,percentiles)
			} else {
				return percentiles
			}
		})
	}
	
	upsertPercentilesDiarios(tipo="puntual",series_id,percentiles) {
		if(!series_id) {
			return Promise.reject("Missing series_id")
		}
		if(percentiles.length==0) {
			return Promise.reject("missing percentiles, length 0")
		}
		var rows = percentiles.map(d=> {
			var d_clean = {}
			for (let [key, value] of Object.entries(d)) {
				d_clean[key] = (typeof value=='string') ? value.replace(/'/g,"") : (value instanceof Date) ? value.toISOString().substring(0,10) : value
			}
			return d_clean
		}).map(d=> {
			if(d.valor.toString() == "NaN") {
				return
			}
			return `('${tipo}',${series_id}, ${d.doy}, ${d.percentil}, ${d.valor}, ${d.window_size}, '${d.timestart}'::date, '${d.timeend}'::date, ${d.count})`
		}).filter(r=>r)
		return this.pool.query("INSERT INTO series_doy_percentiles (tipo,series_id, doy, percentil, valor, window_size, timestart, timeend, count)\
		    VALUES " + rows.join(",") + " \
		    ON CONFLICT (tipo,series_id,doy,percentil) \
		    DO UPDATE SET valor=excluded.valor, window_size=excluded.window_size, timestart=excluded.timestart, timeend=excluded.timeend, count=excluded.count \
		    RETURNING *")
		.then(result=>{
			if(!result.rows) {
				throw("Nothing upserted")
				return
			}
			console.log("Upserted " + result.rows.length + " percentiles")
			return result.rows.map(r=>new internal.doy_percentil(r))
		})
	}
	
	getPercentilesDiarios(tipo="puntual",series_id,percentil,doy,isPublic) {
		if(!series_id) {
			return Promise.reject("Missing series_id")
		}
		return this.getSerie(tipo,series_id,undefined,undefined,undefined,isPublic)
		.then(serie=>{
			var doy_filter = ""
			if(doy) {
				if(Array.isArray(doy)) {
					doy_filter = " AND series_doy_percentiles.doy IN (" + doy.map(d=>parseInt(d)).join(",") + ")"
				} else {
					doy_filter = " AND series_doy_percentiles.doy = " + parseInt(doy)
				}
			}
			var promise
			if(percentil) {
				if(Array.isArray(percentil)) {
					if(Array.isArray(series_id)) {
						promise = this.pool.query("SELECT * from series_doy_percentiles WHERE tipo=$1 AND series_id IN (" + series_id.map(s=>parseInt(s)).join(",") + ") AND percentil IN (" + percentil.map(p=>parseFloat(p)).join(",") + ") " + doy_filter + " ORDER BY percentil,doy",[tipo])
					} else {					
						promise = this.pool.query("SELECT * from series_doy_percentiles WHERE tipo=$1 AND series_id=$2 AND percentil IN (" + percentil.map(p=>parseFloat(p)).join(",") + ") " + doy_filter + " ORDER BY percentil,doy",[tipo,series_id])
					}
				} else {
					if(Array.isArray(series_id)) {
						promise = this.pool.query("SELECT * from series_doy_percentiles WHERE tipo=$1 AND series_id IN (" + series_id.map(s=>parseInt(s)).join(",") + ") AND percentil=$2  " + doy_filter + " ORDER BY percentil,doy",[tipo,percentil])
					} else {
						promise = this.pool.query("SELECT * from series_doy_percentiles WHERE tipo=$1 AND series_id=$2 AND percentil=$3  " + doy_filter + " ORDER BY percentil,doy",[tipo,series_id,percentil])
					}
				}
			} else {
				promise = this.pool.query("SELECT * from series_doy_percentiles WHERE tipo=$1 AND series_id=$2  " + doy_filter + " ORDER BY percentil,doy",[tipo,series_id])
			}
			return promise
		})
		.then(result=>{
			if(!result.rows) {
				throw("Nothing found")
				return
			}
			return result.rows.map(r=>new internal.doy_percentil(r))
		})
	}
	
	getPercentilesDiariosBetweenDates(tipo="puntual",series_id,percentil,timestart,timeend,isPublic) {
		if(!series_id || !timestart || !timeend) {
			return Promise.reject("Missing series_id, timestart or timeend")
		}
		return this.getSerie(tipo,series_id,undefined,undefined,undefined,isPublic)
		.then(serie=>{
			var percentil_filter = ""
			if(percentil) {
				if(Array.isArray(percentil)) {
					percentil_filter = " AND percentil IN (" + percentil.map(p=>parseFloat(p)).join(",") + ")"
					//~ promise = this.pool.query("SELECT * from series_doy_percentiles WHERE tipo=$1 AND series_id=$2  ORDER BY percentil,doy",[tipo,series_id])
				} else {
					percentil_filter = "AND percentil::numeric=" + parseFloat(percentil) + "::numeric"
					//~ promise = this.pool.query("SELECT * from series_doy_percentiles WHERE tipo=$1 AND series_id=$2 AND percentil=$3  ORDER BY percentil,doy",[tipo,series_id,percentil])
				}
			} 
			return this.pool.query("WITH dates as (\
				SELECT generate_series($1::date,$2::date,'1 days'::interval) date\
				), data as (\
				SELECT series_doy_percentiles.percentil AS percentil,\
						 json_build_object('date',dates.date,'doy',series_doy_percentiles.doy,'tipo',series_doy_percentiles.tipo,'series_id',series_doy_percentiles.series_id,'valor',series_doy_percentiles.valor) AS data\
				FROM dates, series_doy_percentiles\
				WHERE extract(doy from dates.date)=series_doy_percentiles.doy\
				AND series_doy_percentiles.tipo=$3\
				AND series_doy_percentiles.series_id=$4\
				"+ percentil_filter+"\
				ORDER BY percentil,dates.date\
				) SELECT data.percentil,array_agg(data) AS data FROM DATA\
				GROUP BY percentil\
				ORDER BY percentil",[timestart,timeend,tipo,series_id])
		})
		.then(result=>{
			if(!result.rows) {
				throw("Nothing found")
				return
			}
			console.log("found " + result.rows.length + " percentile arrays")
			return result.rows // .map(r=>new internal.doy_percentil(r))
		})
	}
	
	matchPercentil(obs) {
		var date = new Date(obs.date)
		var doy = this.extract_doy_from_date(date)
		//~ console.log({date:date,doy:doy})
		obs.doy = doy
		return this.getPercentilesDiarios(obs.tipo,obs.series_id,undefined,doy)
		.then(percentiles=>{
			if(percentiles.length>0) {
				for(var i=0;i<percentiles.length;i++) {
					if(obs.valor <= percentiles[i].valor) {
						obs.cume_dist = percentiles[i].percentil
						break
					}
				}
				if(!obs.cume_dist) {
					obs.cume_dist = 1
				}
			} else {
				obs.cume_dist = null
			}
			return obs
		})
	}
	
	//~ getCuantilesDiarios(series_id) {
		//~ return this.pool.query("\
			//~ SELECT * \
			//~ FROM obs_diaria_cuantiles\
			//~ WHERE series_id=$1\
			//~ ORDER BY doy",[series_id])
		//~ .then(stats=>{
			//~ if(stats.rows) {
				//~ return new internal.dailyStatsList(stats.rows)
			//~ } else {
				//~ return {}
			//~ }
		//~ })
		//~ .catch(e=>{
			//~ console.error(e)
		//~ })
	//~ }
	
	// MODELOS
	
	async deleteModelos(model_id,tipo) {
		var modelos
		try {
			modelos = await this.getModelos(model_id,tipo)
		} catch(e) {
			throw(e)
		}
		var deleted = []
		for(var i=0;i<modelos.length;i++) {
			try {
				var query = pasteIntoSQLQuery("DELETE FROM modelos WHERE id=$1 RETURNING *",[modelos[i].id])
				// console.log(query)
				var result = await this.pool.query(query)
				var m = result.rows[0]
				deleted.push(m)
			} catch (e) {
				throw(e)
			} 
		}
		return deleted
	}

	getModelos(model_id,tipo,name_contains) {
		return this.pool.query("WITH mod as (\
SELECT modelos.id, \
       modelos.nombre, \
       modelos.tipo, \
       modelos.def_var_id, \
       modelos.def_unit_id\
		FROM modelos\
		WHERE modelos.id = coalesce($1, modelos.id)\
		AND modelos.tipo = coalesce($2::text, modelos.tipo)\
		AND modelos.nombre ~ coalesce($3::text,'')\
		ORDER BY modelos.id),\
par as (SELECT mod.id model_id,\
               json_agg(parametros.*) parametros \
        FROM parametros,mod \
        WHERE parametros.model_id=mod.id \
        GROUP BY mod.id), \
est as (SELECT mod.id model_id,\
               json_agg(estados.*) estados \
        FROM estados,mod \
        WHERE estados.model_id=mod.id \
        GROUP BY mod.id), \
forz as (SELECT mod.id model_id,\
                json_agg(modelos_forzantes.*) forzantes \
         FROM modelos_forzantes,mod \
         WHERE modelos_forzantes.model_id=mod.id \
         GROUP BY mod.id), \
out as (SELECT mod.id model_id,\
               json_agg(modelos_out.*) outputs \
        FROM modelos_out,mod \
        WHERE modelos_out.model_id=mod.id \
        GROUP BY mod.id) \
SELECT mod.id, \
       mod.nombre, \
       par.parametros, \
       est.estados, \
       forz.forzantes, \
       out.outputs, \
       mod.tipo, \
       mod.def_var_id, \
       mod.def_unit_id\
		FROM mod\
		LEFT JOIN par ON par.model_id = mod.id\
		LEFT JOIN est ON est.model_id = mod.id\
		LEFT JOIN forz ON forz.model_id = mod.id\
		LEFT JOIN out ON out.model_id = mod.id\
		ORDER BY mod.id;",[model_id, tipo, name_contains])
		.then(result=>{
			if(result.rows) {
				return result.rows
			} else {
				return []
			}
		})
	}

	async upsertModelos(modelos) {
		if(!modelos) {
			return Promise.reject("crud.upsertModelos: arguments missing")
		}
		if(!Array.isArray(modelos)) {
			modelos = [modelos]
		}
		if(modelos.length<=0) {
			return Promise.reject("crud.upsertModelos: empty array")
		}
		var rows = modelos.map(m=>{
			var modelo = new internal.modelo(m)
			return sprintf("('%s','%s',%d,%d)",m.nombre,m.tipo,m.def_var_id,m.def_unit_id)
		})
		const client = await this.pool.connect()
		try {
			await client.query("BEGIN")
			var result = await client.query("INSERT INTO modelos (nombre,tipo,def_var_id,def_unit_id) VALUES " + rows.join(",") + " ON CONFLICT (nombre) DO UPDATE SET tipo=excluded.tipo, def_var_id=excluded.def_var_id, def_unit_id=excluded.def_unit_id RETURNING *")
			for(var i = 0;i<result.rows.length;i++) {
				modelos[i].id = result.rows[i].id
				if(modelos[i].parametros) {
					for(var j=0;j<modelos[i].parametros.length;j++) {
						// console.log(modelos[i].parametros[j])
						modelos[i].parametros[j].model_id = result.rows[i].id 
						const parametro = await this.upsertParametroDeModelo(client,modelos[i].parametros[j])
						modelos[i].parametros[j].id = parametro.id
					}
				}
				if(modelos[i].estados) {
					for(var j=0;j<modelos[i].estados.length;j++) {
						// console.log(modelos[i].estados[j])
						modelos[i].estados[j].model_id = result.rows[i].id 
						const estado = await this.upsertEstadoDeModelo(client,modelos[i].estados[j])
						modelos[i].estados[j].id = estado.id
					}
				}
				if(modelos[i].forzantes) {
					for(var j=0;j<modelos[i].forzantes.length;j++) {
						modelos[i].forzantes[j].model_id = result.rows[i].id 
						const forzante = await this.upsertForzanteDeModelo(client,modelos[i].forzantes[j])
						modelos[i].forzantes[j].id = forzante.id
					}
				}
				if(modelos[i].outputs) {
					for(var j=0;j<modelos[i].outputs.length;j++) {
						modelos[i].outputs[j].model_id = result.rows[i].id 
						const output = await this.upsertOutputDeModelo(client,modelos[i].outputs[j])
						modelos[i].outputs[j].id = output.id
					}
				}
			}
			await client.query("COMMIT")
		} catch(e) {
			console.log("ROLLBACK")
			client.query("ROLLBACK")
			throw(e)
		} finally {
			client.release()
		}
		return modelos
	}
	
	getCalibrados_(estacion_id,var_id,includeCorr=false,timestart,timeend,cal_id,model_id,qualifier,isPublic,grupo_id,no_metadata,group_by_cal,forecast_date,includeInactive) {
		// console.log({includeCorr:includeCorr, isPublic: isPublic})
		var public_filter = (isPublic) ? "AND calibrados.public=true" : ""
		var activar_filter = (includeInactive) ? "" : "AND calibrados.activar = TRUE"
		var grupo_filter = (grupo_id) ? "AND series_prono_last.cal_grupo_id=" + parseInt(grupo_id) : ""
		var cal_join = (estacion_id || var_id || includeCorr || timestart || timeend || grupo_id) ? "JOIN" : "LEFT OUTER JOIN"
		var base_query
		if(group_by_cal) {
			base_query = "WITH pronos as (\
				select series_prono_last.cal_id,\
				series_prono_last.cor_id,\
				series_prono_last.fecha_emision,\
				json_agg(json_build_object('estacion_id',series.estacion_id,'var_id',series.var_id,'proc_id',series.proc_id,'unit_id',series.unit_id)) series\
				from series_prono_last,series\
				WHERE series_prono_last.series_id=series.id\
				AND series.estacion_id=coalesce($1,series.estacion_id)\
				AND series.var_id=coalesce($2,series.var_id)\
				AND series_prono_last.cal_id=coalesce($3,series_prono_last.cal_id)\
				AND series_prono_last.model_id=coalesce($4,series_prono_last.model_id)\
				" + grupo_filter + "\
				GROUP BY series_prono_last.cal_id,series_prono_last.cor_id,series_prono_last.fecha_emision\
			  ),\
			  cal as (\
		        SELECT calibrados.id cal_id, \
				 pronos.series out_id, \
				 calibrados.area_id, \
				 calibrados.in_id, \
				 calibrados.nombre, \
				 calibrados.model_id, \
				 calibrados.modelo, \
				 calibrados.activar, \
				 calibrados.selected, \
				 calibrados.dt, \
				 calibrados.t_offset \
		        FROM calibrados \
				" + cal_join + " pronos\
				ON (calibrados.id=pronos.cal_id) \
				WHERE calibrados.id = coalesce($3,calibrados.id) \
				AND calibrados.model_id = coalesce($4,calibrados.model_id) \
		        " + activar_filter + "\
				" + public_filter + "\
		    )"
		} else {
			base_query = "WITH pronos as (\
				select series_prono_last.cal_id,\
				series_prono_last.cor_id,\
				series_prono_last.fecha_emision,\
				series.estacion_id,\
				series.var_id,\
				series.proc_id,\
				series.unit_id\
				from series_prono_last,series\
				WHERE series_prono_last.series_id=series.id\
				AND series.estacion_id=coalesce($1,series.estacion_id)\
				AND series.var_id=coalesce($2,series.var_id)\
				AND series_prono_last.cal_id=coalesce($3,series_prono_last.cal_id)\
				AND series_prono_last.model_id=coalesce($4,series_prono_last.model_id)\
				" + grupo_filter + "\
			  ),\
			  cal as (\
				SELECT calibrados.id cal_id, \
				pronos.estacion_id out_id, \
				pronos.var_id, \
				pronos.unit_id, \
				calibrados.area_id, \
				calibrados.in_id, \
				calibrados.nombre, \
				calibrados.modelo, \
				calibrados.model_id, \
				calibrados.activar, \
				calibrados.selected, \
				calibrados.dt, \
				calibrados.t_offset \
				FROM calibrados \
				" + cal_join + " pronos\
				ON (calibrados.id=pronos.cal_id) \
				WHERE calibrados.id = coalesce($3,calibrados.id) \
				AND calibrados.model_id = coalesce($4,calibrados.model_id) \
		        " + activar_filter + "\
				" + public_filter + "\
			)"
		}
		var query
		if(no_metadata) {
			query = `${base_query} SELECT cal.cal_id id, \
			cal.out_id, \
			cal.area_id, \
			cal.in_id, \
			cal.nombre, \
			cal.modelo, \
			cal.model_id, \
			cal.activar, \
			cal.selected, \
			cal.dt, \
			cal.t_offset \
	 FROM cal ORDER BY cal.cal_id`
		} else {
			query = `${base_query},  pars as ( \
	select cal_pars.cal_id, \
		   json_agg(cal_pars) arr \
	from cal_pars, cal \
	where cal_pars.cal_id=cal.cal_id \
	group by cal_pars.cal_id\
),\
states as ( \
	select cal_estados.cal_id,\
		   json_agg(cal_estados) arr \
	from cal_estados, cal \
	where cal_estados.cal_id=cal.cal_id \
	group by cal_estados.cal_id \
),\
forcings as (\
	select forzantes.cal_id, \
		   json_agg(forzantes) arr \
	from forzantes, cal \
	where forzantes.cal_id=cal.cal_id \
	group by forzantes.cal_id \
)\
SELECT cal.cal_id id, \
       cal.out_id, \
       cal.area_id, \
       cal.in_id, \
       cal.nombre, \
       cal.modelo, \
	   cal.model_id, \
       cal.activar, \
       cal.selected, \
       cal.dt, \
       cal.t_offset, \
       pars.arr parametros, \
       states.arr estados_iniciales, \
       forcings.arr forzantes, \
	   row_to_json(extra_pars.*) as extra_pars \
FROM cal \
LEFT OUTER JOIN extra_pars ON (extra_pars.cal_id=cal.cal_id) \
LEFT OUTER JOIN pars  ON (cal.cal_id=pars.cal_id ) \
LEFT OUTER JOIN states ON (states.cal_id=cal.cal_id) \
LEFT OUTER JOIN forcings ON (forcings.cal_id=cal.cal_id) \
ORDER BY cal.cal_id`
		}
		// console.log(pasteIntoSQLQuery(query,[estacion_id,var_id,cal_id,model_id]))
		return this.pool.query(query,[estacion_id,var_id,cal_id,model_id])
		.then(result=>{
			if(!result.rows) {
				return Promise.reject()
			}
			var calibrados = result.rows
			//~ console.log({calibrados:calibrados})
			var extraqueries = []
			if(cal_id) {
				extraqueries.push(this.pool.query("SELECT  * from cal_out WHERE cal_id=$1 order by orden",[cal_id])
				.then(result=>{
					if(result.rows) {
						calibrados.forEach((c,i)=>{
							//~ console.log("cal i:"+i)
							c.outputs = result.rows
						})
					}
					return
				}))
			}
			if(includeCorr) {
				//~ var promises = []
				extraqueries.push(...calibrados.map((c,i)=>{ // for(var i=0;i<calibrados.length;i++) {
					//~ extraqueries.push(
					if(forecast_date) {
						return  this.getPronosticos(undefined,c.id,undefined,undefined,forecast_date,timestart,timeend,qualifier,c.out_id,var_id,true,isPublic,undefined,false,undefined,true)
						.then(corridas=>{
							if(corridas.length > 0) {
								calibrados[i].corrida = corridas[0]
							} else {
								calibrados[i].corrida = null
							}
							return
						})
					} else {
						return this.getLastCorrida(c.out_id,var_id,c.id,timestart,timeend,qualifier,isPublic)
						.then(corrida=>{
							//~ console.log({corrida:corrida})
							//~ for(var i=0;i<calibrados.length;i++) {
							calibrados[i].corrida = corrida
							return
							//~ }
						})
					}
				}))
			}
			if(!no_metadata) {
				var get_forzantes_series = Promise.all(calibrados.map(async cal=>{
					if(!cal.forzantes || !cal.forzantes.length) {
						return
					}
					for(var i in cal.forzantes) {
						const f = new internal.forzante(cal.forzantes[i])
						await f.getSerie(this.pool)
						cal.forzantes[i] = f
					}
					return
				}))
				extraqueries.push(get_forzantes_series)
			}
			return Promise.all(extraqueries)
			.then(()=>{
				return calibrados
			})
		})
		.catch(e=>{
			console.error({error:e,message:"getCalibrados error"})
		})
	}
	
	getCalibradosGrupos(cal_grupo_id) {
		var promise
		if(cal_grupo_id) {
			if(parseInt(cal_grupo_id).toString() == "NaN") {
				return Promise.reject("Bad parameter: cal_grupo_id must be an integer")
			}
			promise = this.pool.query("SELECT * FROM calibrados_grupos WHERE id=$1",[cal_grupo_id]) 
		} else {
			promise = this.pool.query("SELECT * FROM calibrados_grupos ORDER BY id")
		}
		return promise.then(results=>{
			return results.rows
		})
	}

	getSeriesPronoLast(filter={}) {
		var grupo_filter = (filter.grupo_id) ? "AND series_prono_last.cal_grupo_id=" + parseInt(filter.grupo_id) : ""
		var query = "\
		SELECT series_prono_last.cal_id,\
			series_prono_last.cor_id,\
			series_prono_last.fecha_emision,\
			json_agg(json_build_object('id',series.id,'estacion_id',series.estacion_id,'var_id',series.var_id,'proc_id',series.proc_id,'unit_id',series.unit_id)) series\
			from series_prono_last,series\
		WHERE series_prono_last.series_id=series.id\
		AND series.estacion_id=coalesce($1,series.estacion_id)\
		AND series.var_id=coalesce($2,series.var_id)\
		AND series_prono_last.cal_id=coalesce($3,series_prono_last.cal_id)\
		AND series_prono_last.model_id=coalesce($4,series_prono_last.model_id)\
		AND series.id=coalesce($5,series_id)\
		" + grupo_filter + "\
		GROUP BY series_prono_last.cal_id,series_prono_last.cor_id,series_prono_last.fecha_emision"
		return this.pool.query(query,[filter.estacion_id,filter.var_id,filter.cal_id,filter.model_id,filter.series_id])
		.then(result=>{
			return result.rows
		})
	}

	async getCalibrado(id) {
		if(!id) {
			throw("missing id")
		}
		const engine = new internal.engine(this.pool)
		var filter = {id:id}
		try {
			var calibrados = await engine.read("Calibrado",filter)
		} catch(e) {
			throw(e)
		}
		if(!calibrados.length) {
			throw("Calibrado not found")
		}
		return calibrados[0]
	}

	async getCalibrados(estacion_id,var_id,includeCorr=false,timestart,timeend,cal_id,model_id,qualifier,isPublic,grupo_id,no_metadata,group_by_cal,forecast_date,includeInactive,series_id) {
		const engine = new internal.engine(this.pool)
		var filter = {id:cal_id,model_id:model_id,grupo_id:grupo_id}
		if(!includeInactive) {
			filter.activar = true
		}
		var calibrados
		var series_prono_last
		if(estacion_id || var_id || includeCorr || qualifier || forecast_date || series_id) {
			series_prono_last = await this.getSeriesPronoLast({cal_id:cal_id,model_id:model_id,grupo_id:filter.grupo_id,estacion_id:estacion_id,var_id:var_id,forecast_date:forecast_date,series_id:series_id})
			console.log({series_prono_last:series_prono_last})
			const cal_ids = new Set(series_prono_last.map(result=>result.cal_id))
			filter.id = Array.from(cal_ids)
			if(!filter.id.length) {
				console.error("No series_prono found")
				return []
			}
			calibrados = await engine.read("Calibrado",filter)
		} else {
			calibrados = await engine.read("Calibrado",filter)
		}
		if(includeCorr) {
			var series_id
			if(series_prono_last && series_prono_last.length) {
				const series_ids = Array.from(new Set(flatten(series_prono_last.map(p=> p.series.map(s=>s.id)))))
				if(series_ids.length) {
					series_id = series_ids
				}
			}
			if(forecast_date) {
				for(var i in calibrados) {
					const corridas = await this.getPronosticos(undefined,calibrados[i].id,undefined,undefined,forecast_date,timestart,timeend,qualifier,calibrados[i].out_id,var_id,true,isPublic,series_id,false,undefined,true)
					if(corridas.length > 0) {
						calibrados[i].corrida = corridas[0]
					} else {
						calibrados[i].corrida = null
					}
				}
			} else {
				for(var i in calibrados) {
					const corrida = await this.getLastCorrida(calibrados[i].out_id,var_id,calibrados[i].id,timestart,timeend,qualifier,true,isPublic,series_id)
					calibrados[i].corrida = corrida
				}
			}
		}
		return calibrados
	}

	getLastCorrida(estacion_id,var_id,cal_id,timestart,timeend,qualifier,includeProno=true,isPublic,series_id,series_metadata) {
		var corrida = {}
		var public_filter = (isPublic) ? "AND calibrados.public=true" : ""
		//~ console.log([estacion_id,var_id,cal_id,timestart,timeend])
		var query = "with last as (\
			select max(date) \
			from corridas,calibrados \
			where cal_id=$1 \
			AND corridas.cal_id=calibrados.id \
			" + public_filter + ") \
		select corridas.* \
		from corridas,last \
		where cal_id=$1 \
		and date=last.max;"
		// console.log(pasteIntoSQLQuery(query,[cal_id]))
		return this.pool.query(query,[cal_id])
		.then(result=>{
			if(!result.rows) {
				console.log("No rows found for cal_id:"+cal_id)
				return
			} else if (result.rows.length == 0) {
				console.log("No rows found for cal_id:"+cal_id)
				return
			} else {
				//~ console.log({cal_id:cal_id,rows:result.rows})
				corrida = {cor_id:result.rows[0].id,cal_id:result.rows[0].cal_id,forecast_date:result.rows[0].date}
				//~ console.log(corrida) 
				if(!includeProno) {
					return corrida
				}
				var filter_string = control_filter2({timestart:{type:"timestart","table":"pronosticos"},timeend:{type:"timeend","table":"pronosticos"},estacion_id:{type:"integer","table":"series"},var_id:{type:"integer","table":"series"},qualifier:{type:"string","table":"pronosticos"},series_id:{type:"integer","table":"pronosticos"}},{timestart:timestart,timeend:timeend,estacion_id:estacion_id,var_id:var_id,qualifier:qualifier,series_id:series_id})
				// var date_filter = ""
				// date_filter += (timestart) ? " AND pronosticos.timestart>='" + new Date(timestart).toISOString() + "' " : "" 
				// date_filter += (timeend) ?  " AND pronosticos.timeend<='" +  new Date(timeend).toISOString() + "' " : ""
				var query = pasteIntoSQLQuery("select pronosticos.series_id,\
				pronosticos.qualifier,\
				json_agg(ARRAY [to_char(pronosticos.timestart::timestamptz at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'), to_char(pronosticos.timeend::timestamptz at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'),valores_prono_num.valor::text,pronosticos.qualifier::text]) pronosticos\
				from series,pronosticos,valores_prono_num  \
				WHERE valores_prono_num.prono_id=pronosticos.id \
				and series.id=pronosticos.series_id\
				AND pronosticos.cor_id=$1\
				" + filter_string + "\
				group by pronosticos.series_id,pronosticos.qualifier;",[corrida.cor_id])
				console.log(query)
				return this.pool.query(query) 										
										// "\
										// where cor_id=$1 and valores_prono_num.prono_id=pronosticos.id and series.id=pronosticos.series_id\
										// AND series.estacion_id=coalesce($2,series.estacion_id)\
										// AND series.var_id=coalesce($3,series.var_id)\
										// AND pronosticos.qualifier=coalesce($4,pronosticos.qualifier)\
										// AND series.id=coalesce($5,series.id)\
										// " + date_filter + "\
										// "group by pronosticos.series_id,pronosticos.qualifier;") ,[corrida.cor_id,estacion_id,var_id,qualifier,series_id])
				.then(result=>{
					if(!result.rows) {
						console.log("No rows found for cor_id:"+corrida.cor_id)
						corrida.series = []
						return corrida 
					} else if (result.rows.length == 0) {
						console.log("No rows found for cor_id:"+corrida.cor_id)
						corrida.series = []
						return corrida
					}
					corrida.series = result.rows
					if(series_metadata) {
						var promises = []
						corrida.series.forEach(serie=>{
							promises.push(this.getSerie("puntual",serie.series_id)
							.then(result=>{
								serie.metadata = result
								return
							}))
						})
						return Promise.all(promises)
						.then(()=>{
							return corrida
						})
					} else {
					//~ .map(s=>{
						//~ return {series_id: s.series_id,
								//~ qualifier: s.qualifier,
								//~ pronosticos = s.json_agg //.map(r=>[r[0]
						//~ }
					//~ })
						return corrida
					}
				})
				.catch(e=>{
					console.error({error:e,message:"getLastCorrida error 1"})
				})
			}
		})
		.catch(e=>{
			console.error({error:e,message:"getLastCorrida error 2", cal_id:cal_id})
		})
	}
	
	deleteCalibrado(cal_id) {
		return this.pool.query("DELETE FROM calibrados WHERE id=$1 RETURNING *",[cal_id])
		.then(result=>{
			if(result.rows) {
				return result.rows[0]
			} else {
				return
			}
		})
	}

	async deleteCalibrados(filter) {
		if(filter.cal_id) {
			filter.id = filter.cal_id
		}
		var valid_filters = {"id":{table:"calibrados",type:"integer"},"model_id":{table:"calibrados",type:"integer"}}
		var filter_string = utils.control_filter2(valid_filters,filter,"calibrados") 
		if(filter_string == "") {
			throw("deleteCalibrados error: at least one filter is required")
		}
		var stmt = `DELETE FROM calibrados WHERE id=id ${filter_string} RETURNING *`
		// console.log(stmt)
		return this.pool.query(stmt)
	}
	
	async upsertCalibrados(calibrados) {
		var upserted = []
		for(var i in calibrados) {
			calibrado = await this.upsertCalibrado(calibrados[i])
			upserted.push(calibrado) 
		}
		return upserted
	}

	upsertCalibrado(input_cal) {
		// console.log("is_calibrado:" + input_cal instanceof internal.calibrado)
		// if(! input_cal instanceof internal.calibrado) {
		// 	input_cal = new internal.calibrado(input_cal)
		// }
		// console.log("is_calibrado:" + input_cal instanceof internal.calibrado)

		input_cal.setArrayProperties()
		if(!input_cal.model_id) {
			return Promise.reject("Missing model_id")
		}
		var calibrado
		return this.pool.connect()
		.then(async client=>{
			try {
				await client.query("BEGIN")
				var upserted
				if(input_cal.id) {
					var stmt = pasteIntoSQLQuery("INSERT INTO calibrados (id,nombre, modelo, parametros, estados_iniciales, activar, selected, out_id, area_id, in_id, model_id, tramo_id, dt, t_offset) VALUES \
					($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,coalesce($13,'1 days'::interval),coalesce($14,'9 hours'::interval))\
					ON CONFLICT (id)\
					DO UPDATE SET nombre=coalesce(excluded.nombre,calibrados.nombre), modelo=coalesce(excluded.modelo,calibrados.modelo), parametros=coalesce(excluded.parametros,calibrados.parametros), estados_iniciales=coalesce(excluded.estados_iniciales,calibrados.estados_iniciales), activar=coalesce(excluded.activar,calibrados.activar), selected=coalesce(excluded.selected,calibrados.selected), out_id=coalesce(excluded.out_id,calibrados.out_id), area_id=coalesce(excluded.area_id,calibrados.area_id), in_id=coalesce(excluded.in_id,calibrados.in_id), model_id=coalesce(excluded.model_id,calibrados.model_id), tramo_id=coalesce(excluded.tramo_id,calibrados.tramo_id), dt=coalesce(excluded.dt,calibrados.dt), t_offset=coalesce(excluded.t_offset,calibrados.t_offset)\
					RETURNING *",[input_cal.id, input_cal.nombre, input_cal.modelo, input_cal.parametros, input_cal.estados, input_cal.activar, input_cal.selected, input_cal.out_id, input_cal.area_id, input_cal.in_id, input_cal.model_id, input_cal.tramo_id, input_cal.dt, input_cal.t_offset])
					// console.log(stmt)
					upserted = await client.query(stmt)
				} else {
					var stmt = pasteIntoSQLQuery("INSERT INTO calibrados (id,nombre, modelo, parametros, estados_iniciales, activar, selected, out_id, area_id, in_id, model_id, tramo_id, dt, t_offset) VALUES \
					(nextval('calibrados_id_seq'),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,coalesce($12,'1 days'::interval),coalesce($13,'9 hours'::interval))\
					RETURNING *",[input_cal.nombre, input_cal.modelo, input_cal.parametros, input_cal.estados, input_cal.activar, input_cal.selected, input_cal.out_id, input_cal.area_id, input_cal.in_id, input_cal.model_id, input_cal.tramo_id, timeSteps.interval2string(input_cal.dt), timeSteps.interval2string(input_cal.t_offset)])
					// console.log(stmt)
					upserted = await client.query(stmt)
				}
			} catch(e) {
				await client.query("ROLLBACK")
				client.end()
				throw(e)
			}
			calibrado = upserted.rows[0]
			if(!calibrado) {
				await client.query("ROLLBACK")
				client.end()
				throw("No se insertó calibrado")
			}
			if(input_cal.parametros) {
				console.log({parametros:input_cal.parametros})
				try {
					var parametros = await this.upsertParametros(client,calibrado.id,input_cal.parametros)
				} catch(e) {
					await client.query("ROLLBACK")
					client.end()
					throw(e)
				}
				// var parametros = []
				// for(var i=0;i<input_cal.parametros.length;i++) {
				// 	try {
				// 		var parametro = await this.upsertParametro(client,{cal_id:calibrado.id, orden:i+1, valor:input_cal.parametros[i]})
				// 		if(!parametro) {
				// 			throw("no se insertó parámetro")
				// 		}
				// 		parametros.push(parametro)
				// 	} catch(e) {
				// 		await client.query("ROLLBACK")
				// 		client.end()
				// 		throw(e)
				// 	}
				// }
				calibrado.parametros = parametros
			} 
			if(input_cal.estados) {
				try {
					var estados = await this.upsertEstadosIniciales(client,calibrado.id,input_cal.estados)
				} catch(e) {
					await client.query("ROLLBACK")
					client.end()
					throw(e)
				}
				// var estados_iniciales = []
				// for(var i=0;i>input_cal.estados_iniciales.length;i++) {
				// 	try {
				// 		var estado_inicial =  await this.upsertEstadoInicial(client,{cal_id:calibrado.id, orden:i+1, valor:input_cal.estados_iniciales[i]})
				// 		if(!estado_inicial) {
				// 			throw("no se insertó estado_inicial")
				// 		}
				// 		estados_iniciales.push(estado_inicial)
				// 	} catch(e) {
				// 		await client.query("ROLLBACK")
				// 		client.end()
				// 		throw(e)
				// 	}
				// }
				calibrado.estados_iniciales = estados
			} 
			if(input_cal.forzantes) {
				console.log(input_cal.forzantes)
				try {
					var forzantes = await this.upsertForzantes2(client,calibrado.id,input_cal.forzantes)
				} catch(e) {
					await client.query("ROLLBACK")
					client.end()
					throw(e)
				}
				// var forzantes = []
				// for(var i=0;i>input_cal.forzantes.length;i++) {
				// 	try {
				// 		var forzante =  await this.upsertForzante(client,{cal_id:calibrado.id, orden:(input_cal.forzantes[i].orden)?input_cal.forzantes[i].orden:i+1, series_table:input_cal.forzantes[i].series_table, series_id:input_cal.forzantes[i].series_id})
				// 		if(!forzantes) {
				// 			throw("no se insertó forzante")
				// 		}
				// 		forzantes.push(forzante)
				// 	} catch(e) {
				// 		await client.query("ROLLBACK")
				// 		client.end()
				// 		throw(e)
				// 	}
				// }
				calibrado.forzantes = forzantes
			}
			if(input_cal.outputs) {
				var outputs = []
				for(var i =0;i<input_cal.outputs.length;i++) {
					try {
						var output = await this.upsertOutput(client,{cal_id:calibrado.id, orden:(input_cal.outputs[i].orden)?input_cal.outputs[i].orden:i+1, series_table:input_cal.outputs[i].series_table, series_id:input_cal.outputs[i].series_id})
						if(!output) {
							throw("no se insertó output")
						}
						outputs.push(output)
					} catch(e) {
						endAndThrow(e)
					}
				}
				calibrado.outputs = outputs
			}
			if(input_cal.stats) {
				try {
					var stats = await this.upsertCalStats(client,calibrado.id,input_cal.stats)
				} catch(e) {
					await client.query("ROLLBACK")
					client.end()
					throw(e)
				}
				calibrado.stats = stats
			} 
			try {
				await client.query("COMMIT")
			} catch(e) {
				await client.query("ROLLBACK")
				client.end()
				throw(e)
			}
			client.release()
			return calibrado
		})
	}

	upsertCalStats(client,cal_id,stats) {
		var stmt = pasteIntoSQLQuery("INSERT INTO cal_stats (cal_id,timestart,timeend,n_cal,rnash_cal,rnash_val,beta,omega,repetir,iter,rmse,stats_json,pvalues,calib_period) VALUES \
		($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)\
		ON CONFLICT (cal_id) DO UPDATE SET timestart=excluded.timestart,timeend=excluded.timeend, n_cal=excluded.n_cal, rnash_cal=excluded.rnash_cal,rnash_val=excluded.rnash_val, beta=excluded.beta, omega=excluded.omega, repetir=excluded.repetir, iter=excluded.iter, rmse=excluded.rmse, stats_json=excluded.stats_json, pvalues=excluded.pvalues, calib_period=excluded.calib_period RETURNING *",[cal_id,stats.timestart,stats.timeend,stats.n_cal,stats.rnash_cal,stats.rnash_val,stats.beta,stats.omega,stats.repetir,stats.iter,stats.rmse,JSON.stringify(stats),stats.pvalues,stats.calib_period])
		console.log(stmt)
		return Promise.resolve()
		// return client.query(stmt)
		// .then(result=>{
		// 	console.log(result)
		// 	return result.rows[0]
		// })
	}
	
	upsertParametro(client,parametro) {
		var stmt = pasteIntoSQLQuery("INSERT INTO cal_pars (cal_id,orden,valor) VALUES\
		($1,$2,$3)\
		ON CONFLICT (cal_id,orden)\
		DO UPDATE SET valor=excluded.valor\
		RETURNING *",[parametro.cal_id,parametro.orden,parametro.valor])
		console.log(stmt)
		return client.query(stmt)
		.then(result=>{
			console.log(result)
			return result.rows[0]
		})
	}

	upsertParametros(client,cal_id,parametros) { // parametros::int[]
		var tuples = parametros.map((p,i)=>{
			return `(${[cal_id, i + 1, p].join(",")})`
		})
		var stmt = `INSERT INTO cal_pars (cal_id,orden,valor) VALUES\
		${tuples.join(",")}\
		ON CONFLICT (cal_id,orden)\
		DO UPDATE SET valor=excluded.valor\
		RETURNING *`
		console.log(stmt)
		return client.query(stmt)
		.then(result=>{
			console.log(result)
			return result.rows[0]
		})
	}


	upsertParametroDeModelo(client,parametro) {
		return client.query("INSERT INTO parametros (model_id , nombre , lim_inf , range_min , range_max , lim_sup , orden ) VALUES\
		  ($1,$2,$3,$4,$5,$6,$7)\
		  ON CONFLICT (model_id,orden)\
		  DO UPDATE SET nombre=excluded.nombre,\
		  				lim_inf=excluded.lim_inf,\
						range_min=excluded.range_min,\
						range_max=excluded.range_max,\
							lim_sup=excluded.lim_sup\
		  RETURNING *",[parametro.model_id,parametro.nombre,parametro.lim_inf,parametro.range_min,parametro.range_max,parametro.lim_sup,parametro.orden])
		.then(result=>{
			return new internal.parametroDeModelo(result.rows[0])
		})
	}
	
	upsertEstadoInicial(client,estado_inicial) {
		return client.query("INSERT INTO cal_estados (cal_id,orden,valor) VALUES\
		  ($1,$2,$3)\
		  ON CONFLICT (cal_id,orden)\
		  DO UPDATE SET valor=excluded.valor\
		  RETURNING *",[estado_inicial.cal_id,estado_inicial.orden,estado_inicial.valor])
		.then(result=>{
			return result.rows[0]
		})
	}

	upsertEstadosIniciales(client,cal_id,estados_iniciales) { //  estados_iniciales::int[]
		var tuples = estados_iniciales.map((p,i)=>{
			return `(${[cal_id, i + 1, p].join(",")})`
		})
		var stmt = `INSERT INTO cal_estados (cal_id,orden,valor) VALUES\
		${tuples.join(",")}\
		ON CONFLICT (cal_id,orden)\
		DO UPDATE SET valor=excluded.valor\
		RETURNING *`
		return client.query(stmt)
		.then(result=>{
			return result.rows
		})
	}

	upsertEstadoDeModelo(client,estado) {
		return client.query("INSERT INTO estados (model_id, nombre, range_min, range_max, def_val, orden) VALUES\
		  ($1,$2,$3,$4,$5,$6)\
		  ON CONFLICT (model_id,orden)\
		  DO UPDATE SET nombre=excluded.nombre,\
		                range_min=excluded.range_min,\
						range_max=excluded.range_max,\
						def_val=excluded.def_val\
		  RETURNING *",[estado.model_id,estado.nombre,estado.range_min,estado.range_max,estado.def_val,estado.orden])
		.then(result=>{
			return new internal.estadoDeModelo(result.rows[0])
		})
	}

	upsertOutputDeModelo(client,output) {
		return client.query("INSERT INTO modelos_out (model_id, orden, var_id, unit_id , nombre, inst, series_table) VALUES\
		  ($1,$2,$3,$4,$5,$6,$7)\
		  ON CONFLICT (model_id,orden)\
		  DO UPDATE SET var_id=excluded.var_id,\
		                unit_id=excluded.unit_id,\
						nombre=excluded.nombre,\
						inst=excluded.inst,\
						series_table=excluded.series_table\
		  RETURNING *",[output.model_id,output.orden,output.var_id,output.unit_id,output.nombre,output.inst,output.series_table])
		.then(result=>{
			return new internal.modelo_output(result.rows[0])
		})
	}

	getForzante(cal_id,orden) {
		return this.pool.query("SELECT id, cal_id, series_table, series_id, cal, orden, model_id FROM forzantes WHERE cal_id=$1 AND orden=$2",[cal_id,orden])
		.then(result=>{
			if(!result) {
				return Promise.reject("getForzante: Nothing found")
			}
			return new internal.forzante(result.rows[0])
		})
	}
	
	getForzantes(cal_id,filter={}) {
		return this.pool.query("SELECT id, cal_id, series_table, series_id, cal, orden, model_id FROM forzantes WHERE cal_id=$1 AND orden=coalesce($2,orden) AND series_table=coalesce($3,series_table) and series_id=coalesce($4,series_id) AND cal=coalesce($5,cal) ORDER BY orden",[cal_id,filter.orden,filter.series_table,filter.series_id,filter.cal])
		.then(result=>{
			return result.rows.map(f=> new internal.forzante(f))
		})
	} 
		
	upsertForzante(client,forzante) {
		return client.query("INSERT INTO forzantes (cal_id,orden,series_table,series_id) VALUES\
		  ($1,$2,$3,$4)\
		  ON CONFLICT (cal_id,orden)\
		  DO UPDATE SET series_table=excluded.series_table, series_id=excluded.series_id\
		  RETURNING *",[forzante.cal_id,forzante.orden,forzante.series_table,forzante.series_id])
		.then(result=>{
			return new internal.forzante(result.rows[0])
		})
	}

	upsertForzantes2(client,cal_id,forzantes) { // forzantes = [{series_table:"",series_id:0},...] o [0,1,2] (en el segundo caso asume series_table:"series")
		var tuples = forzantes.map((p,i)=>{
			var series_table = (p.series_table) ? (p.series_table.toLowerCase() == "series_rast") ? "series_rast" : (p.series_table.toLowerCase() == "series_areal") ? "series_areal" : "series" : "series"
			var series_id = (p.series_id) ? p.series_id : parseInt(p)
			return sprintf ("(%d,%d,'%s',%d)", cal_id,i+1,series_table,series_id)
		})
		var stmt = `INSERT INTO forzantes (cal_id,orden,series_table,series_id) VALUES\
		${tuples.join(",")}\
		ON CONFLICT (cal_id,orden)\
		DO UPDATE SET series_table=excluded.series_table, series_id=excluded.series_id\
		RETURNING *`
		return client.query(stmt)
		.then(result=>{
			return result.rows.map(f=>new internal.forzante(f))
		})
	}

	upsertForzanteDeModelo(client,forzante) {
		return client.query("INSERT INTO modelos_forzantes (model_id , orden , var_id , unit_id , nombre , inst , tipo , required) VALUES\
		  ($1,$2,$3,$4,$5,$6,$7,$8)\
		  ON CONFLICT (model_id,nombre)\
		  DO UPDATE SET var_id=excluded.var_id,\
		                unit_id=excluded.unit_id,\
						orden=excluded.orden,\
						inst=excluded.inst,\
						tipo=excluded.tipo,\
						required=excluded.required\
		  RETURNING *",[forzante.model_id,forzante.orden,forzante.var_id,forzante.unit_id,forzante.nombre,forzante.inst,forzante.tipo,forzante.required])
		.then(result=>{
			// if(!result || !result.rows || result.rows.length==0) {
			// 	throw("error trying to create forzanteDeModelo")
			// }
			// console.log(result.rows[0])
			return new internal.forzanteDeModelo(result.rows[0])
		})
	}

	upsertForzantes(cal_id,forzantes) {
		if(forzantes.length==0) {
			return Promise.reject("upsertForzantes: missing forzantes") 
		}
		var values = forzantes.map(f=>{
			var series_table = (f.series_table) ? (f.series_tabla == "series_areal") ? "series_areal" : "series" : "series"
			return sprintf("(%d,%d,'%s',%d)", cal_id, f.orden, series_table, f.series_id)
		}).join(",")
		return this.pool.query(`INSERT INTO forzantes (cal_id, orden, series_table, series_id) VALUES\
		  ${values}\
		  ON CONFLICT (cal_id, orden)\
		  DO UPDATE SET series_table=excluded.series_table, series_id=excluded.series_id\
		  RETURNING *`)
		.then(result=>{
			return new internal.forzante(result.rows[0])
		})
	}
	
	deleteForzantes(cal_id,filter) {
		return this.pool.query("DELETE \
		FROM forzantes \
		WHERE cal_id=$1 \
		AND orden=coalesce($2,orden) \
		AND series_table=coalesce($3,series_table) \
		AND series_id=coalesce($4,series_id) \
		AND cal=coalesce($5,cal) \
		RETURNING *",[cal_id,filter.orden,filter.series_table,filter.series_id,filter.cal])
		.then(result=>{
			return result.rows.map(f=>new internal.forzante(f))
		})
	} 

	deleteForzante(cal_id,orden) {
		return this.pool.query("DELETE \
		FROM forzantes \
		WHERE cal_id=$1 \
		AND orden=$2 \
		RETURNING *",[cal_id,orden])
		.then(result=>{
			return new internal.forzante(result.rows[0])
		})
	} 

	upsertOutput(client,output) {
		//~ console.log({output:output})
		return client.query("INSERT INTO cal_out (cal_id,orden,series_table,series_id) VALUES\
		  ($1,$2,$3,$4)\
		  ON CONFLICT (cal_id,orden)\
		  DO UPDATE SET series_table=excluded.series_table, series_id = excluded.series_id\
		  RETURNING *",[output.cal_id,output.orden,output.series_table,output.series_id])
		.then(result=>{
			var series_table = (output.series_table) ? (output.series_table == "series_areal") ? "series_areal" : "series" : "series" 
			if(!result.rows[0]) {
				throw new Error("error on output upsert")
				return
			}
			return client.query("INSERT INTO calibrados_out (cal_id,out_id)\
				SELECT $1,estacion_id\
				FROM " + series_table + "\
				WHERE id=$2\
				ON CONFLICT (cal_id,out_id) DO NOTHING",[output.cal_id,output.series_id])
			.then(result2=>{
				return new internal.output(result.rows[0])
			})
		})
	}

	upsertOutputs(client,cal_id,outputs) { // outputs = = [{series_table:"",series_id:0},...] o [0,1,2] (en el segundo caso asume series_table:"series")
		var tuples = outputs.map((p,i)=>{
			var series_table = (p.series_table) ? (p.series_table.toLowerCase() == "series_rast") ? "series_rast" : (p.series_table.toLowerCase() == "series_areal") ? "series_areal" : "series" : "series"
			var series_id = (p.series_id) ? p.series_id : parseInt(p)
			return sprintf ("(%d,%d,'%s',%d)", cal_id,i+1,series_table,series_id)
		})
		//~ console.log({output:output})
		var stmt = `INSERT INTO cal_out (cal_id,orden,series_table,series_id) VALUES\
		${tuples.join(",")}\
		ON CONFLICT (cal_id,orden)\
		DO UPDATE SET series_table=excluded.series_table, series_id = excluded.series_id\
		RETURNING *`
		return client.query(stmt)
		.then(result=>{
			if(!result.rows.length) {
				throw new Error("error on output upsert: nothing upserted")
			}
			var calibrados_out = result.rows.map(output=>{
				var series_table = (output.series_table) ? (output.series_table == "series_rast") ? "series_rast" :(output.series_table == "series_areal") ? "series_areal" : "series" : "series" 
				return { cal_id:cal_id, series_table:series_table, series_id: output.series_id}
			})
			return this.upsertCalibradosOut(client,cal_id,calibrados_out)
			.then(result2=>{
				return result.rows.map(r=>new internal.output(r))
			})
	})
	}

	async upsertCalibradosOut(client,cal_id,calibrados_out) {
		if(!calibrados_out.length) {
			throw("upsertCalibradosOut error: calibrados_out is missing or of length 0")
		}
		var tuples = []
		for(var o of calibrados.out){
			var tipo = (o.series_table) ? (o.series_table == "series_rast") ? "raster" :(output.series_table == "series_areal") ? "areal" : "puntual" : "puntual"
			try {
				var serie = await this.getSerie(tipo,o.series_id)
			} catch(e) {
				throw(e)
			}
			tuples.push(`(${cal_id},${serie.estacion.id})`)
		}
		var stmt = `INSERT INTO calibrados_out (cal_id,out_id)\
		${tuples.join(",")}\
		ON CONFLICT (cal_id,out_id) DO NOTHING`
		return client.query(stmt)
	}

	getPronosticos(cor_id,cal_id,forecast_timestart,forecast_timeend,forecast_date,timestart,timeend,qualifier,estacion_id,var_id,includeProno=false,isPublic,series_id,series_metadata,cal_grupo_id,group_by_qualifier,model_id) {
		// console.log({includeProno:includeProno, isPublic: isPublic})
		var model_filter = (model_id) ? "AND calibrados.model_id=" + parseInt(model_id) : ""
		var public_filter = (isPublic) ? "AND calibrados.public=true" : ""
		var grupo_filter = (cal_grupo_id) ? "AND calibrados.grupo_id=" + parseInt(cal_grupo_id) : ""
		var pronosticos = []
		var cor_id_filter = (cor_id) ? (Array.isArray(cor_id)) ? " AND corridas.id IN (" + cor_id.join(",") + ")" : " AND corridas.id=" + cor_id : ""
		var query = "SELECT corridas.id,\
		corridas.date,\
		corridas.cal_id\
		FROM corridas, calibrados\
		WHERE corridas.cal_id=coalesce($1,corridas.cal_id)\
		" + cor_id_filter + "\
		AND corridas.date>=coalesce($2::timestamptz,'1970-01-01'::date)\
		AND corridas.date<coalesce($3::timestamptz,'2100-01-01'::date)\
		AND corridas.date=coalesce($4::timestamptz,corridas.date)\
		AND corridas.cal_id=calibrados.id\
		" + public_filter + "\
		" + grupo_filter + "\
		" + model_filter + "\
		ORDER BY corridas.cal_id, corridas.date"
		var params = [cal_id,forecast_timestart,forecast_timeend,forecast_date]
		// console.log(pasteIntoSQLQuery(query,params))
		return this.pool.query(query,params)
		.then(result=>{
			if(!result.rows) {
				return
			}
			if(!includeProno) {
				return result.rows.map(r=>{
					return {cor_id:r.id,cal_id:r.cal_id,forecast_date:r.date}
				})
			}
			var filter_string = control_filter2({ timestart:{type:"timestart","table":"pronosticos"}, timeend:{type:"timeend","table":"pronosticos"}, cor_id:{type:"integer","table":"pronosticos"}, estacion_id:{type:"integer","table":"series"}, var_id:{type:"integer","table":"series"}, qualifier:{type:"string","table":"pronosticos"}, series_id:{type:"integer","table":"pronosticos"}},{timestart:timestart,timeend:timeend,cor_id:cor_id,estacion_id:estacion_id,var_id:var_id,qualifier:qualifier, series_id:series_id})
			return Promise.all(result.rows.map(r=>{
				return this.pool.query("SELECT series.id series_id,\
											   series.estacion_id,\
											   series.var_id,\
										       to_char(pronosticos.timestart::timestamptz at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') timestart,\
										       to_char(pronosticos.timeend::timestamptz at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') timeend,\
										       valores_prono_num.valor,\
										       pronosticos.qualifier\
										from pronosticos,valores_prono_num,series  \
										where valores_prono_num.prono_id=pronosticos.id\
										and series.id=pronosticos.series_id " + filter_string + "\
										ORDER BY pronosticos.series_id,pronosticos.timestart")
										// pronosticos.cor_id=$1 \
										// and valores_prono_num.prono_id=pronosticos.id\
										// and pronosticos.timestart>=coalesce($2::timestamptz,'1970-01-01'::date)\
										// and pronosticos.timeend<=coalesce($3::timestamptz,'2100-01-01'::date)\
										// AND pronosticos.qualifier=coalesce($4,pronosticos.qualifier)\
										// and series.id=pronosticos.series_id\
										// AND series.estacion_id=coalesce($5,series.estacion_id)\
										// AND series.var_id=coalesce($6,series.var_id)\
										// AND series.id=coalesce($7,series.id)\
										// ORDER BY pronosticos.series_id,pronosticos.timestart",[r.id,timestart,timeend,qualifier,estacion_id,var_id,series_id])
				.then(result=>{
					if(result.rows) {
						var series = {}
						if(group_by_qualifier) {   // one series element for each series_id+qualifier combination
							result.rows.forEach(p=>{
								var key = p.series_id + "_" + p.qualifier
								if(!series[key]) {
									series[key] = {series_id:p.series_id,estacion_id:p.estacion_id,var_id:p.var_id,qualifier:p.qualifier,pronosticos:[]}
								}
								series[key].pronosticos.push({timestart:p.timestart,timeend:p.timeend,valor:p.valor}) // cor_id:r.cor_id,series_id:p.series_id,
							})
						} else {    // one series element for each series_id, regardless of qualifier (results in mixed qualifier series)
							result.rows.forEach(p=>{
								if(!series[p.series_id]) {
									series[p.series_id] = {series_id:p.series_id,estacion_id:p.estacion_id,var_id:p.var_id,pronosticos:[]}
								}
								series[p.series_id].pronosticos.push({timestart:p.timestart,timeend:p.timeend,valor:p.valor,qualifier:p.qualifier}) // cor_id:r.cor_id,series_id:p.series_id,
							})
						}
						var series_data = Object.keys(series).sort().map(k=>series[k]) 
						var corrida = {cor_id:r.id,cal_id:r.cal_id,forecast_date:r.date,series:series_data}
						if(series_metadata) {
							var promises = []
							corrida.series.forEach(serie=>{
								promises.push(this.getSerie("puntual",serie.series_id)
								.then(result=>{
									serie.metadata = result
									return
								}))
							})
							return Promise.all(promises)
							.then(()=>{
								return corrida
							})
						} else {
							return corrida
						}
					} else {
						return
					}
				})
			}))
		})
	}
	
	async deletePronosticos(cor_id,cal_id,forecast_date,timestart,timeend,only_sim=false) {
		try {
			var date_filter = ""
			if(timestart) {
				date_filter += " AND pronosticos.timestart>='" + new Date(timestart).toISOString() + "'::timestamptz" 
			}
			if(timeend) {
				date_filter += " AND pronosticos.timeend<='" + new Date(timeend).toISOString() + "'::timestamptz" 
			}
			if(only_sim) {
				date_filter += " AND pronosticos.timestart<corridas.date"
			}
			var client = await this.pool.connect()
			await client.query("BEGIN")
			var deleted_pronosticos
			if(cor_id) {
				if(Array.isArray(cor_id)) {
					await client.query("DELETE FROM valores_prono_num USING pronosticos,corridas WHERE pronosticos.cor_id=corridas.id AND pronosticos.cor_id IN (" + cor_id.join() + ") AND pronosticos.id=valores_prono_num.prono_id" + date_filter)
					deleted_pronosticos = await client.query("DELETE FROM pronosticos USING corridas WHERE pronosticos.cor_id=corridas.id AND pronosticos.cor_id IN (" + cor_id.join() + ")" + date_filter  + " RETURNING *")
				} else if (parseInt(cor_id).toString() != "NaN") {
					await client.query("DELETE FROM valores_prono_num USING pronosticos,corridas WHERE pronosticos.cor_id=corridas.id AND pronosticos.cor_id=$1 AND pronosticos.id=valores_prono_num.prono_id + date_filter",[cor_id])
					deleted_pronosticos = await client.query("DELETE FROM pronosticos USING corridas WHERE pronosticos.cor_id=corridas.id AND pronosticos.cor_id=$1" + date_filter + " RETURNING *",[cor_id])
				} else {
					client.query("ROLLBACK")
					client.release()
					return Promise.reject("Bad parameter cor_id")
				}
			} else if (cal_id && forecast_date) {
				await client.query("DELETE FROM valores_prono_num USING pronosticos,corridas WHERE corridas.cal_id=$1 AND corridas.date::date=$2::date AND corridas.id=pronosticos.cor_id AND pronosticos.id=valores_prono_num.prono_id" + date_filter,[cal_id,forecast_date])
				deleted_pronosticos = await client.query("DELETE FROM pronosticos USING corridas WHERE corridas.cal_id=$1 AND corridas.date::date=$2::date AND pronosticos.cor_id=corridas.id" + date_filter + " RETURNING *",[cal_id,forecast_date])
			}
			client.query("COMMIT")
		} catch(e) {
			client.release()
			return Promise.reject("crud.deletePronosticos: e.toString()")
		}
		client.release()
		return Promise.resolve(deleted_pronosticos)
	}

	deleteCorrida(cor_id,cal_id,forecast_date) {
		// console.log({cor_id:cor_id})
		var corrida={}
		if(!cor_id && !(cal_id && forecast_date)) {
			return Promise.reject("cor_id or cal_id+forecast_date missing")
		}
		return this.pool.connect()
		.then(client=>{
			return client.query("BEGIN")
			.then(()=>{	
				if(cor_id) {
					if(Array.isArray(cor_id))	{
						if(cor_id.length == 0) {
							throw("crud.deleteCorrida: cor_id is empty array")
						}
						var query = "DELETE FROM valores_prono_num USING pronosticos WHERE pronosticos.cor_id IN (" + cor_id.join(",") + ") AND pronosticos.id=valores_prono_num.prono_id"
						// console.log(query)
						return client.query(query)
					} else {
						return client.query("DELETE FROM valores_prono_num USING pronosticos WHERE pronosticos.cor_id=$1 AND pronosticos.id=valores_prono_num.prono_id",[cor_id])
					}
				} else {
					return client.query("DELETE FROM valores_prono_num USING pronosticos,corridas WHERE corridas.cal_id=$1 AND corridas.date::date=$2::date AND corridas.id=pronosticos.cor_id AND pronosticos.id=valores_prono_num.prono_id",[cal_id,forecast_date])
				}
			})
			.then((result)=>{	
				// console.log({deleted_valores: result.rows})
				corrida.valores = (result.rows) ? result.rows : undefined
				if(cor_id) {
					if(Array.isArray(cor_id)) {
						return client.query("DELETE FROM pronosticos WHERE pronosticos.cor_id IN (" + cor_id.join(",") + ") RETURNING *")	
					} else {
						return client.query("DELETE FROM pronosticos WHERE pronosticos.cor_id=$1 RETURNING *",[cor_id])
					}
				} else {
					return client.query("DELETE FROM pronosticos USING corridas WHERE corridas.cal_id=$1 AND corridas.date::date=$2::date AND pronosticos.cor_id=corridas.id RETURNING *",[cal_id,forecast_date])
				}
			})
			.then((result)=>{	
				corrida.pronosticos = (result.rows) ? result.rows : undefined
				// console.log({deleted_pronos: corrida.pronosticos})
				if(cor_id) {
					if(Array.isArray(cor_id)) {
						return client.query("DELETE FROM corridas WHERE id IN (" + cor_id.join(",") + ")  RETURNING *")
					} else {
						return client.query("DELETE FROM corridas WHERE id=$1 RETURNING *",[cor_id])
					}
				} else {
					return client.query("DELETE FROM corridas WHERE cal_id=$1 and date::date=$2::date RETURNING *",[cal_id,forecast_date])
				}
			}) 
			.then((result)=>{
				if(!result.rows) {
					throw("prono not found")
					return
				}
				if(result.rows.length == 0) {
					throw("prono not found")
					return
				}
				corrida.cor_id = result.rows[0].cor_id
				corrida.cal_id = result.rows[0].cal_id
				corrida.forecast_date = result.rows[0].forecast_date
				return client.query("COMMIT")
			})
			.then(()=>{
				client.release()
				return corrida
			})
			.catch(e=>{
				client.release()
				throw(e)
			})
		})
	}

	deleteCorridas(filter={},options={}) {
		if(filter.skip_cal_id && !Array.isArray(filter.skip_cal_id)) {
			filter.skip_cal_id = [filter.skip_cal_id]
		}
		var getPronoPromise
		if(filter.cor_id) {
			console.log("filter.cor_id")
			getPronoPromise = this.getPronosticos(filter.cor_id)
		} else if (filter.cal_id) {
			console.log("filter.cal_id")	
			if(filter.forecast_date || filter.date || (filter.forecast_timestart && filter.forecast_timeend)) {
				if(filter.forecast_date) { // exact timestamp
					console.log(" + filter.forecast_date")
					getPronoPromise = this.getPronosticos(undefined,filter.cal_id,undefined,undefined,filter.forecast_date)
				}
				else if(filter.date) { // forecast date whole day (no time)  
					console.log("+ filter.date")
					var [ts, te] = timeSteps.date2tste(new Date(filter.date))
					getPronoPromise = this.getPronosticos(undefined,filter.cal_id,ts,te,undefined)
				} else { 
					console.log("filter.forecast_timestart & forecast.timeend")
					getPronoPromise = this.getPronosticos(undefined,filter.cal_id,filter.forecast_timestart,filter.forecast_timeend)
				}
			} else if(filter.forecast_timeend) {
				console.log("   + filter.forecast_timeend")
				getPronoPromise = this.getPronosticos(undefined,filter.cal_id,undefined,filter.forecast_timeend)
			} else {
				return Promise.reject("Invalid options, more filters are required")
			}
		} else if (filter.estacion_id) {
			console.log("filter.estacion_id")
			if(!filter.date) {
				if(!filter.forecast_date) {
					console.error("Falta parametro date o forecast_date")
					return Promise.reject("Falta parametro date o forecast_date")
				} 
				console.log("	+ filter.forecast_date")
				getPronoPromise = this.getPronosticos(undefined,undefined,undefined,undefined,filter.forecast_date,undefined,undefined,undefined,filter.estacion_id)		
			} else {
				console.log("	+ filter.date")
				var [ts, te] = timeSteps.date2tste(new Date(filter.date))
				getPronoPromise = this.getPronosticos(undefined,undefined,ts,te,undefined,undefined,undefined,undefined,filter.estacion_id)
			}
		} else if (filter.model_id) {
			console.log("filter.model_id")
			if(!filter.date) {
				return Promise.reject("crud.deleteCorridas: Falta parametro date")
			}
			var [ts, te] = timeSteps.date2tste(new Date(filter.date))
			return this.getPronosticos(undefined,undefined,ts,te,undefined,undefined,undefined,undefined,undefined,undefined,false,undefined,undefined,undefined,undefined,undefined,filter.model_id)
		} else if (filter.date) {
			if(!filter.skip_cal_id) { 
				return Promise.reject("crud.deleteCorridas: missing skip_cal_id")
			} 
			console.log("filter.date + filter.skip_cal_id")
			var [ts, te] = timeSteps.date2tste(new Date(filter.date))
			getPronoPromise = this.getPronosticos(undefined,undefined,ts,te)
		} else if (filter.forecast_date) {
			if(!filter.skip_cal_id) { 
				return Promise.reject("crud.deleteCorridas: missing skip_cal_id")
			} 
			console.log("filter.forecast_date + filter.skip_cal_id")
			getPronoPromise = this.getPronosticos(undefined,undefined,undefined,undefined,filter.forecast_date)
		} else if (filter.forecast_timeend) {
			if(!filter.skip_cal_id) { 
				return Promise.reject("crud.deleteCorridas: missing skip_cal_id")
			} 
			console.log("filter.forecast_timeend + filter.skip_cal_id")
			getPronoPromise = this.getPronosticos(undefined,undefined,undefined,filter.forecast_timeend)
		}
		return getPronoPromise
		.then(corridas=>{
			if(corridas.length == 0) {
				throw("crud.deleteCorridas: pronosticos not found")
			}
			if(filter.skip_cal_id) {
				corridas = corridas.filter(c=> filter.skip_cal_id.indexOf(c.cal_id) < 0)
			}
			var cor_id = corridas.map(c=>c.cor_id)
			console.log({corridas:corridas,cor_id:cor_id})
			var savePromise
			if(options.save) {
				console.log("options.save, guardando en corridas_guardadas")
				savePromise = this.guardarCorridas(cor_id)
			} else if(options.save_prono) {
				console.log("options.save_prono, guardando prono en corridas_guardadas")
				savePromise = this.guardarCorridas(cor_id,undefined,{only_prono:true})
			} else {
				savePromise = Promise.resolve(corridas)
			}
			return savePromise
			.then(corridas=>{
				if(options.skip_delete) {
					console.log("options.skip_delete")
					return corridas
				}
				if(options.only_sim) {
					console.log("   + options.only_sim")
					return this.deletePronosticos(cor_id,undefined,undefined,undefined,undefined,true)
				}
				return this.deleteCorrida(cor_id)
			})
		})
	}

	async batchDeleteCorridas(options={n:10,skip_cal_id:[288,308,391,400,439,440,441,442,432,433,439,440,441,442,444,445,446,454,457,455,456,458,459,460,461]}) {
		// ELIMINA CORRIDAS DE n + 10 a n DÍAS ATRÁS (cal_id NOT IN skip_cal_id)
		for(var i=0;i<=9;i++) {
		  var cal_id_list = options.skip_cal_id
		  var date = new Date()
		  var deletedCorridas = []
		  date.setTime(date.getTime() + (-1*options.n - 10 + i)*24*3600*1000)
		  try {
			var deleted_corrida = await this.deleteCorridas({date:date,skip_cal_id:cal_id_list},{})  // ({cor_id:[22,23]})
			deletedCorridas.push(deleted_corrida)
		  } catch (e) {
			console.error(e.toString())
		  }
		}
		var forecast_timeend = new Date()
		forecast_timeend.setTime(forecast_timeend.getTime() - options.n*24*3600*1000)
		// ELIMINA PARTE SIMULADA DE CORRIDAS DE MODELOS SELECCIONADOS ANTERIORES A n DÍAS Y ALMACENA LA PARTE PRONOSTICADA
		for(var cal_id of cal_id_list) {
		  try {
			var deleted_corrida = await this.deleteCorridas({forecast_timeend:forecast_timeend,cal_id:cal_id},{only_sim:false,save_prono:true})  // ({cor_id:[22,23]})
			deletedCorridas.push(deleted_corrida)
		  } catch (e) {
			console.error(e.toString())
		  }
		}
		return Promise.resolve(deletedCorridas)
	}
	
	async upsertCorrida(corrida) {
		if(!corrida || !corrida.cal_id || !corrida.forecast_date) {
			return Promise.reject("Faltan parámetros")
		}
		var ups_corrida={}
		try {
			var client = await this.pool.connect()
			await client.query("BEGIN")
			var stmt = pasteIntoSQLQuery("INSERT INTO corridas (cal_id,date) VALUES ($1,$2)\
			ON CONFLICT (cal_id,date) DO UPDATE set date=excluded.date\
			RETURNING *",[corrida.cal_id,corrida.forecast_date])
			var corridas = await client.query(stmt)
			// var corridas = await client.query("INSERT INTO corridas (cal_id,date) VALUES ($1,$2)\
				//   ON CONFLICT (cal_id,date) DO UPDATE set date=excluded.date\
				//   RETURNING *",[corrida.cal_id,corrida.forecast_date])
			ups_corrida.cor_id  = corridas.rows[0].id
			ups_corrida.forecast_date = corridas.rows[0].date
			ups_corrida.cal_id = corridas.rows[0].cal_id
			ups_corrida.series = []
			// return Promise.all(corrida.series.map(s=>{
				// 	return Promise.all(s.pronosticos.map(p=>{
				// 		var pronostico = {
				// 			cor_id: prono.cor_id,
				// 			cal_id: prono.cal_id,
				// 			series_id: s.series_id,
				// 			timestart: p.timestart,
				// 			timeend: p.timeend,
				// 			valor: p.valor,
				// 			qualifier: (p.qualifier) ? p.qualifier : 'main' 
				// 		} 
				// 		return this.upsertPronostico(client,pronostico)
				// 	}))
				// }))
			for(var i=0;i<corrida.series.length;i++) {
				if(corrida.series[i].pronosticos.length == 0) {
					continue
				}
				var pronosticos = corrida.series[i].pronosticos.map(p=>{
					if(Array.isArray(p)) {
						return {
							cor_id: ups_corrida.cor_id,
							cal_id: ups_corrida.cal_id,
							series_id: corrida.series[i].series_id,
							timestart: new Date(p[0]),
							timeend: new Date(p[1]),
							valor: p[2],
							qualifier: (p[3]) ? p[3] : (corrida.series[i].qualifier) ? corrida.series[i].qualifier : 'main' 
						} 
					}
					return {
						cor_id: ups_corrida.cor_id,
						cal_id: ups_corrida.cal_id,
						series_id: corrida.series[i].series_id,
						timestart: new Date(p.timestart),
						timeend: new Date(p.timeend),
						valor: p.valor,
						qualifier: (p.qualifier) ? p.qualifier : (corrida.series[i].qualifier) ? corrida.series[i].qualifier : 'main' 
					} 
				})
				var ups_pronos = await this.upsertPronosticos(client,pronosticos)
				ups_corrida.series[i] = {
					"series_id": corrida.series[i].series_id,
					"pronosticos": ups_pronos
				}
			}
			await client.query("COMMIT")
		}
		catch (e) {
			// if(client) {
			// 	client.release()
			// }
			await client.query("ROLLBACK")
			return Promise.reject(e)
			// throw e
		}
		finally {
			client.release()
		}
		return Promise.resolve(ups_corrida)
	}	

	async guardarCorridas(cor_id,filter={},options={}) {
		if(!cor_id ) {
			return Promise.reject("crud.guardarCorridas: Missing parameter cor_id")
		}
		else if(Array.isArray(cor_id)) {
			for(var i in cor_id) {
				if(parseInt(cor_id[i]).toString() == "NaN") {
					return Promise.reject("crud.guardarCorridas: Bad parameter cor_id")
				}
			}
			var date_filter = ""
			date_filter += (filter.timestart) ? " AND pronosticos.timestart>='" + new Date(timestart).toISOString() + "' " : "" 
			date_filter += (filter.timeend) ?  " AND pronosticos.timeend<='" +  new Date(timeend).toISOString() + "' " : ""
			date_filter += (options.only_prono) ? " AND pronosticos.timestart>=corridas.date" : ""
			try {
				var client = await this.pool.connect()
				await client.query("BEGIN")
				var query = "WITH to_save AS (select * from corridas where id IN (" + cor_id.join(",") + ")) \
				DELETE FROM corridas_guardadas USING to_save WHERE corridas_guardadas.date=to_save.date AND corridas_guardadas.cal_id=to_save.cal_id"
				// console.log(query)
				await client.query(query)
				query = "WITH to_save AS (select * from corridas where id IN (" + cor_id.join(",") + ")) \
				INSERT INTO corridas_guardadas \
				SELECT * FROM to_save \
				ON CONFLICT (cal_id,date) DO NOTHING"
				// console.log(query)
				await client.query(query)
				query = "INSERT INTO pronosticos_guardados \
				SELECT pronosticos.* from pronosticos,corridas \
				WHERE pronosticos.cor_id=corridas.id \
				AND cor_id IN (" + cor_id.join(",") + ") \
				" + date_filter + " \
				ON CONFLICT (cor_id,series_id,timestart,timeend,qualifier) DO NOTHING"
				// console.log(query)
				await client.query(query)
				query = "insert into valores_prono_num_guardados select valores_prono_num.* from valores_prono_num,pronosticos,corridas where pronosticos.cor_id=corridas.id AND  valores_prono_num.prono_id=pronosticos.id and pronosticos.cor_id IN (" + cor_id.join(",") + ") " + date_filter + " ON CONFLICT (prono_id) DO NOTHING"
				// console.log(query)
				await client.query(query)
				await client.query("COMMIT")
			} catch (e) {
				await client.query("ROLLBACK")
				return Promise.reject("crud.guardarCorridas:" +e.toString())
			}
			finally {
				client.release()
			}
			return this.getCorridasGuardadas(cor_id)
		} else if(parseInt(cor_id).toString() == "NaN") {
			return Promise.reject("crud.guardarCorridas: Bad parameter cor_id")
		}
		try {
			var client = await this.pool.connect()
			await client.query("BEGIN")
			var query = "WITH to_save AS (select * from corridas where id=$1) \
			DELETE FROM corridas_guardadas USING to_save WHERE corridas_guardadas.date=to_save.date AND corridas_guardadas.cal_id=to_save.cal_id"
			await client.query(query,[cor_id])
			query ="WITH to_save AS (select * from corridas where id=$1) \
			INSERT INTO corridas_guardadas \
			SELECT * FROM to_save ON CONFLICT (cal_id,date) DO NOTHING"
			await client.query(query,[cor_id])
			var query = "insert into pronosticos_guardados select * from pronosticos,corridas where pronosticos.cor_id=corridas.id AND  cor_id=$1 " + date_filter + " ON CONFLICT DO NOTHING"
			// console.log(this.pasteIntoSQLQuery(query,[cor_id]))
			await client.query(query,[cor_id])
			await client.query("insert into valores_prono_num_guardados select valores_prono_num.* from valores_prono_num,pronosticos,corridas where pronosticos.cor_id=corridas.id AND valores_prono_num.prono_id=pronosticos.id and pronosticos.cor_id=$1 " + date_filter + " ON CONFLICT DO NOTHING",[cor_id])
			await client.query("COMMIT")
		} catch (e) {
			await client.query("ROLLBACK")
			return Promise.reject("crud.guardarCorrida:" +e.toString())
		}
		finally {
			client.release()
		}
		return this.getCorridasGuardadas(cor_id)
	}
	

	getCorridasGuardadas(cor_id,cal_id,forecast_timestart,forecast_timeend,forecast_date,timestart,timeend,qualifier,estacion_id,var_id,includeProno=false,isPublic,series_id,series_metadata,cal_grupo_id,group_by_qualifier) {
		// console.log({includeProno:includeProno, isPublic: isPublic})
		var public_filter = (isPublic) ? "AND calibrados.public=true" : ""
		var grupo_filter = (cal_grupo_id) ? "AND calibrados.grupo_id=" + parseInt(cal_grupo_id) : ""
		var cor_id_filter = (cor_id) ? (Array.isArray(cor_id)) ? " AND corridas_guardadas.id IN (" + cor_id.join(",") + ")" : " AND corridas_guardadas.id=" + cor_id : ""
		var cor_id_filter2 = (cor_id) ? (Array.isArray(cor_id)) ? " AND pronosticos_guardados.cor_id IN (" + cor_id.join(",") + ")" : " AND pronosticos_guardados.cor_id=" + cor_id : ""
		var pronosticos = []
		return this.pool.query("SELECT corridas_guardadas.id,\
		corridas_guardadas.date,\
		corridas_guardadas.cal_id\
			FROM corridas_guardadas, calibrados\
			WHERE corridas_guardadas.cal_id=coalesce($1,corridas_guardadas.cal_id)\
			AND corridas_guardadas.date>=coalesce($2::timestamptz,'1970-01-01'::date)\
			AND corridas_guardadas.date<=coalesce($3::timestamptz,'2100-01-01'::date)\
			AND corridas_guardadas.date=coalesce($4::timestamptz,corridas_guardadas.date)\
			AND corridas_guardadas.cal_id=calibrados.id\
			" + public_filter + "\
			" + grupo_filter + "\
			" + cor_id_filter + "\
			ORDER BY corridas_guardadas.cal_id, corridas_guardadas.date",[cal_id,forecast_timestart,forecast_timeend,forecast_date])
			.then(result=>{
				if(!result.rows) {
					return
				}
				if(!includeProno) {
					return result.rows.map(r=>{
						return {cor_id:r.id,cal_id:r.cal_id,forecast_date:r.date}
					})
				}
				return Promise.all(result.rows.map(r=>{
					return this.pool.query("SELECT series.id series_id,\
												   series.estacion_id,\
												   series.var_id,\
												   to_char(pronosticos_guardados.timestart::timestamptz at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') timestart,\
												   to_char(pronosticos_guardados.timeend::timestamptz at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') timeend,\
												   valores_prono_num_guardados.valor,\
												   pronosticos_guardados.qualifier\
											from pronosticos_guardados,valores_prono_num_guardados,series  \
											where valores_prono_num_guardados.prono_id=pronosticos_guardados.id\
											and pronosticos_guardados.timestart>=coalesce($2::timestamptz,'1970-01-01'::date)\
											and pronosticos_guardados.timeend<=coalesce($3::timestamptz,'2100-01-01'::date)\
											AND pronosticos_guardados.qualifier=coalesce($4,pronosticos_guardados.qualifier)\
											and series.id=pronosticos_guardados.series_id\
											AND series.estacion_id=coalesce($5,series.estacion_id)\
											AND series.var_id=coalesce($6,series.var_id)\
											AND series.id=coalesce($7,series.id)\
											AND pronosticos_guardados.cor_id=$1\
											ORDER BY pronosticos_guardados.series_id,pronosticos_guardados.timestart",[r.id,timestart,timeend,qualifier,estacion_id,var_id,series_id])
				.then(result=>{
					if(result.rows) {
						var series = {}
						if(group_by_qualifier) {   // one series element for each series_id+qualifier combination
							result.rows.forEach(p=>{
								var key = p.series_id + "_" + p.qualifier
								if(!series[key]) {
									series[key] = {series_id:p.series_id,estacion_id:p.estacion_id,var_id:p.var_id,qualifier:p.qualifier,pronosticos:[]}
								}
								series[key].pronosticos.push({timestart:p.timestart,timeend:p.timeend,valor:p.valor}) // cor_id:r.cor_id,series_id:p.series_id,
							})
						} else {    // one series element for each series_id, regardless of qualifier (results in mixed qualifier series)
							result.rows.forEach(p=>{
								if(!series[p.series_id]) {
									series[p.series_id] = {series_id:p.series_id,estacion_id:p.estacion_id,var_id:p.var_id,pronosticos:[]}
								}
								series[p.series_id].pronosticos.push({timestart:p.timestart,timeend:p.timeend,valor:p.valor,qualifier:p.qualifier}) // cor_id:r.cor_id,series_id:p.series_id,
							})
						}
						var series_data = Object.keys(series).sort().map(k=>series[k]) 
						var corrida = {cor_id:r.id,cal_id:r.cal_id,forecast_date:r.date,series:series_data}
						if(series_metadata) {
							var promises = []
							corrida.series.forEach(serie=>{
								promises.push(this.getSerie("puntual",serie.series_id)
								.then(result=>{
									serie.metadata = result
									return
								}))
							})
							return Promise.all(promises)
							.then(()=>{
								return corrida
							})
						} else {
							return corrida
						}
					} else {
						return
					}
				})
			}))
		})
	}

	
	
	upsertPronostico(client,pronostico) {
		//~ return this.pool.connect()
		//~ .then(client => {
			//~ return client.query('BEGIN')
			//~ .then(res => {
		// console.log([pronostico.series_id,pronostico.cor_id,pronostico.timestart,pronostico.timeend,pronostico.qualifier].join(","))
		const queryText = "INSERT INTO pronosticos (series_id,cor_id,timestart,timeend,qualifier)\
			VALUES ($1,$2,$3::timestamptz,$4::timestamptz,$5)\
			ON CONFLICT (series_id,cor_id,timestart,timeend,qualifier)\
			DO update set timestart=excluded.timestart\
			RETURNING *"
		return client.query(queryText,[pronostico.series_id,pronostico.cor_id,pronostico.timestart,pronostico.timeend,pronostico.qualifier])
		.then( result => {
			if(result.rows.length == 0) {
				console.error("No se inserto observacion")
				return Promise.reject("No se inserto observacion")
				//~ return client.query('ROLLBACK')
				//~ .then( res=> {
					//~ client.release()
					//~ return
				//~ })
			} else {
				var prono = result.rows[0]
				const insertValorText = "INSERT INTO valores_prono_num (prono_id,valor)\
					VALUES ($1,$2)\
					ON CONFLICT (prono_id)\
					DO UPDATE SET valor=excluded.valor\
					RETURNING *"
				return client.query(insertValorText, [prono.id, pronostico.valor])
				.then(result => {
					prono.valor=result.rows[0].valor
					//~ return client.query("COMMIT")
				//~ }).then(res => {
					//~ client.release()
					return prono
				})
			}
		})
	}
	
	async upsertPronosticos(client,pronosticos) {
		var values = pronosticos.map(pronostico=>{
			return sprintf("(%d,%d,'%s'::timestamptz,'%s'::timestamptz,'%s',%f)", pronostico.series_id,pronostico.cor_id,pronostico.timestart.toISOString(),pronostico.timeend.toISOString(),pronostico.qualifier,parseFloat(pronostico.valor))
		}).join(",")
		var result
		try {
			var stmt = "CREATE TEMPORARY TABLE prono_tmp (series_id int,cor_id int,timestart timestamp,timeend timestamp,qualifier varchar,valor real);\
			INSERT INTO prono_tmp (series_id,cor_id,timestart,timeend,qualifier,valor)\
			VALUES " + values + ";"
			await client.query(stmt)
			await client.query("INSERT INTO pronosticos (series_id,cor_id,timestart,timeend,qualifier)\
				SELECT series_id,cor_id,timestart,timeend,qualifier \
				FROM prono_tmp \
				ON CONFLICT (series_id,cor_id,timestart,timeend,qualifier)\
				DO update set timestart=excluded.timestart;")
			result = await client.query("WITH inserted_valores AS (\
				INSERT INTO valores_prono_num (prono_id,valor)\
					SELECT pronosticos.id,prono_tmp.valor\
					FROM pronosticos,prono_tmp\
					WHERE pronosticos.series_id=prono_tmp.series_id\
					AND pronosticos.timestart=prono_tmp.timestart\
					AND pronosticos.timeend=prono_tmp.timeend\
					AND pronosticos.qualifier=prono_tmp.qualifier\
					AND pronosticos.cor_id=prono_tmp.cor_id\
				ON CONFLICT (prono_id)\
				DO UPDATE SET valor=excluded.valor\
				RETURNING *\
			  ) SELECT pronosticos.*,inserted_valores.valor\
			    FROM pronosticos,inserted_valores\
			    WHERE pronosticos.id=inserted_valores.prono_id\
			    ORDER BY pronosticos.series_id,pronosticos.qualifier,pronosticos.timestart;")
			console.log("upserted " + result.rows.length + " pronosticos rows")
			await client.query("DROP TABLE prono_tmp")
		} catch(e) {
			return Promise.reject(e)
		}
		return Promise.resolve(result.rows)
	}
	
	getSeriesBySiteAndVar(estacion_id,var_id,startdate,enddate,includeProno=true,regular=false,dt="1 days",proc_id,isPublic,forecast_date) {
		// console.log("getSeriesBySiteAndVar at "  + Date()) 
		proc_id = (proc_id) ? proc_id : (var_id == 4) ? 2 : 1
		return this.pool.query("SELECT series.id,redes.public from series,estaciones,redes where estacion_id=$1 and var_id=$2 and proc_id=$3 and series.estacion_id=estaciones.unid AND estaciones.tabla=redes.tabla_id ",[ estacion_id, var_id, proc_id ])
		.then(result=>{
			// console.log("got series at " + Date())
			if(!result.rows) {
				console.log("No series rows returned")
				return 
			}
			if(result.rows.length == 0) {
				console.log("0 series rows returned")
				return 
			}
			if(isPublic) {
				if (result.rows[0].public == false) {
					console.log("series not public")
					throw("El usuario no está autorizado para acceder a esta serie")
				}
			}
			return this.getSerie('puntual',result.rows[0].id,startdate,enddate,{asArray:true,regular: regular, dt: dt})  // (tipo,id,timestart,timeend,options)
			.then(serie=>{
				// console.log("got serie at " + Date())
				if(includeProno) {
					//~ console.log({estacion_id:estacion_id,startdate:startdate,enddate:enddate})
					return this.getCalibrados(estacion_id,var_id,true,startdate,enddate,undefined,undefined,undefined,isPublic,undefined,undefined,undefined,forecast_date)
					.then(calibrados=>{
						serie.pronosticos = calibrados
						//~ console.log("getSeriesBySiteAndVar done at "  + Date())
						return serie
					})
				} else {
					//~ console.log("getSeriesBySiteAndVar done at "  + Date())
					return serie
				}
			})
			//~ .catch(e=>{
				//~ console.error({error:e})
			//~ })
		})
		//~ .catch(e=>{
			//~ console.error({error:e})
		//~ })
	}
	
	getMonitoredPoints(format="json",filter) {
		filter.solohidro = true
		var hidrovars= [].concat.apply([],config.crud.default_vars.hidro.map(p=> p.var_id)) //[2,4,22,23,24,25,26,35,36,39,40,48,33,49,50,51,52,67]
		if(filter.var_id) {
			if(hidrovars.indexOf(filter.var_id) < 0) {
				filter.solohidro = false
			}
			if(filter.var_id == -1) {
				filter.var_id = undefined
				filter.solometeo = true
			}
		} 
		// console.log({filter:filter})
		var valid_filters = ["var_id","proc_id","unit_id","estacion_id"]
		var hidro_filter = " AND (" + config.crud.default_vars.hidro.map(p=> {
			return "(proc_id=" + p.proc_id + " AND var_id IN (" + p.var_id.join(",") + "))"
		}).join(" OR ") + ")"  
		// " AND ((var_id=2 and proc_id=1) OR (var_id=4 and proc_id=2) OR (var_id=4 AND proc_id=1) OR (var_id=26 and proc_id=1) OR (var_id=39 AND proc_id=1) OR (var_id=40 AND proc_id=1) OR (var_id=40 AND proc_id=5) OR (var_id=22 AND proc_id=1) OR (var_id=23 AND proc_id=1) OR (var_id=24 AND proc_id=1) OR (var_id=25 AND proc_id=1) OR (var_id=48 AND proc_id=1) OR (var_id=48 AND proc_id=5)  OR (var_id=33 AND proc_id=1) OR (var_id=52 AND proc_id=1) OR (var_id=49 AND proc_id=1) OR (var_id=50 AND proc_id=1) OR (var_id=51 AND proc_id=1) OR (var_id=67 AND proc_id=1) OR (var_id=35 AND proc_id=4) OR (var_id=36 AND proc_id=4))"
		var meteo_filter = " AND (" + config.crud.default_vars.meteo.map(p=> {
			return "(proc_id=" + p.proc_id + " AND var_id IN (" + p.var_id.join(",") + "))"
		}).join(" OR ") + ")"
		// " AND var_id IN (27,31,34,38,16,1,13,5,43,11,17,12,10,18,9,6,7,53,54,55,56,57,58,59,14,60,61,62,63) AND proc_id=1 "
		var filter_string = (filter.solohidro) ? hidro_filter  : (filter.solometeo) ?  meteo_filter : " AND proc_id<=2 "
		valid_filters.forEach(f=>{
			if(filter[f]) {
				filter_string += " AND series." + f + "=" + parseInt(filter[f]) + " "
			}
		})
		if(filter.geom) {
			// console.log(JSON.stringify(filter.geom))
			if(!filter.geom.type) {
				return Promise.reject("Bad parameter geom")
			}
			filter_string += " AND estaciones.geom <-> " + filter.geom.toSQL() + " < 0.01"
			// console.log(filter.geom.toSQL())
		}
		var redes_filter = ""
		var public_filter = ""
		if(filter.red_id) {
			if(parseInt(filter.red_id).toString() == "NaN") {
				return Promise.reject("Bad red_id")
			}
			redes_filter = " AND redes.id=" + parseInt(filter.red_id) + " "
		}
		if(filter.public) {
			redes_filter += " AND redes.public=true "
			public_filter += " AND series_prono_last.public=true "
		}
		var series_range_join = ""
		var series_range_filter = ""
		if(filter.data_availability) {
			filter.has_obs = true
		}
		if(filter.has_obs) {
			if(filter.data_availability) {
				switch(filter.data_availability.toLowerCase().substring(0,1)) {
					case "r":
						series_range_filter = " AND now() - series_date_range.timeend < '1 days'::interval"
						break;
					case "n":
						series_range_filter =  " AND now() - series_date_range.timeend < '3 days'::interval"
						break;
					case "c":
						series_range_filter = " AND (series_date_range.timestart <= coalesce($2,now())) and (series_date_range.timeend >= coalesce($1,now()-'90 days'::interval))"
						break;
					case "h":
						series_range_filter = ""
						break;
					default:
						series_range_filter = ""
						break;
				}
			}
		} else {
			series_range_join = "LEFT OUTER"
		}
		var pronos_query = "LEFT OUTER JOIN (select max(series_prono_last.fecha_emision) fecha_emision,series.estacion_id,series.var_id,series.unit_id from series_prono_last,series WHERE series_prono_last.series_id=series.id " + public_filter + " group by series.estacion_id,series.var_id,series.unit_id)"
		if(filter.cal_id) {
			if(parseInt(filter.cal_id).toString() == "NaN") {
				return Promise.reject("Bad parameter: cal_id must be an integer")
			}
			pronos_query = "JOIN (select series_prono_last.fecha_emision,series.estacion_id,series.var_id,series.unit_id from series_prono_last,series WHERE series_prono_last.series_id=series.id AND series_prono_last.cal_id=" + parseInt(filter.cal_id) + " " + public_filter + ")"
		} else if (filter.cal_grupo_id) {
			if(parseInt(filter.cal_grupo_id).toString() == "NaN") {
				return Promise.reject("Bad parameter: cal_grupo_id must be an integer")
			}
			pronos_query = "JOIN (select series_prono_last.fecha_emision,series.estacion_id,series.var_id,series.unit_id from series_prono_last,series,calibrados WHERE series_prono_last.series_id=series.id AND series_prono_last.cal_id=calibrados.id AND calibrados.grupo_id=" + parseInt(filter.cal_grupo_id) + " " + public_filter + ")"
		} else if (filter.has_prono) {
			pronos_query = "JOIN (select max(series_prono_last.fecha_emision) fecha_emision,series.estacion_id,series.var_id,series.unit_id from series_prono_last,series WHERE series_prono_last.series_id=series.id " + public_filter + " group by series.estacion_id,series.var_id,series.unit_id)"
		}
		// console.log({redes_filter: redes_filter})
		return this.pool.query(
		//~ "SELECT series.id series_id,estaciones.nombre,estacion_id,estaciones.rio,var_id,proc_id,unit_id,var.nombre var_name, st_asgeojson(geom)::json geom\
		//~ FROM series,estaciones,var \
		//~ WHERE series.estacion_id=estaciones.unid \
		//~ AND var.id = series.var_id \
		//~ AND ((var_id=2 and proc_id=1) OR (var_id=4 and proc_id=2)) \
		//~ ORDER BY estacion_id,var_id,proc_id"
			//~ "with cor as (\
					 //~ select calibrados_out_full.out_id, max(date) date\
					 //~ from corridas, calibrados_out_full \
					 //~ where corridas.cal_id=calibrados_out_full.cal_id\
					 //~ group by calibrados_out_full.out_id\
			//~ )
			"SELECT series.id series_id,\
				   estaciones.nombre,\
				   series.estacion_id,\
				   estaciones.rio,\
				   estaciones.tabla,\
				   redes.id red_id,\
				   series.var_id,\
				   series.proc_id,\
				   series.unit_id,\
				   var.nombre var_name,\
				   series_date_range.timestart,\
					series_date_range.timeend,\
					COALESCE(series_date_range.count, 0),\
					pronos.fecha_emision forecast_date,\
					case when series_date_range.timeend is not null\
					then \
						case when now() - series_date_range.timeend < '1 days'::interval \
							 then case when pronos.fecha_emision is not null \
								  then 'RT+S'\
								  else 'RT'\
								  end\
							 when now() - series_date_range.timeend < '3 days'::interval\
							 then case when pronos.fecha_emision is not null \
								  then 'NRT+S'\
								  else 'NRT'\
								  end\
							 when (series_date_range.timestart <= coalesce($2,now())) and (series_date_range.timeend >= coalesce($1,now()-'90 days'::interval))\
							 then case when pronos.fecha_emision is not null \
								  then 'C+S'\
								  else 'C'\
								  end\
							 else case when pronos.fecha_emision is not null \
								  then'H+S' \
								  else 'H'\
								  end\
						end\
					when pronos.fecha_emision is not null \
					then 'S'\
					else 'N'\
					end AS data_availability,\
					estaciones.tabla fuente,\
					estaciones.id_externo id_externo,\
				   st_asgeojson(geom)::json geom,\
				   redes.public\
			FROM series\
			JOIN estaciones ON (series.estacion_id=estaciones.unid  " + filter_string + ")\
			JOIN redes ON (estaciones.tabla = redes.tabla_id " + redes_filter + ")\
			join var ON  (var.id = series.var_id )\
			" + series_range_join + " JOIN series_date_range on (series_date_range.series_id=series.id" + series_range_filter + ")\
			" + pronos_query + " pronos ON (pronos.estacion_id=series.estacion_id AND pronos.var_id=series.var_id AND pronos.unit_id=series.unit_id)\
			ORDER BY series.estacion_id,series.var_id,series.proc_id",[filter.timestart,filter.timeend])
		.then(result=>{
			if(!result.rows) {
				//~ console.error("getMonitoredPoints: No rows returned")
				throw("getMonitoredPoints: No rows returned")
			}
			console.log("crud.getMonitoredPoints: found " + result.rows.length + " monitored series")
			if(format && format.toLowerCase()=="geojson") {
				return {
				   "type": "FeatureCollection",
				   "features": result.rows.map(row=> {
					   return {
						   "type": "Feature",
						   "id": row.series_id,
						   "geometry": row.geom,
						   "properties": {
							   "series_id": row.series_id,
							   "nombre": row.nombre,
							   estacion_id: row.estacion_id,
							   rio: row.rio,
							   var_id: row.var_id,
							   proc_id: row.proc_id,
							   unit_id: row.unit_id,
							   var_name: row.var_name,
							   timestart: row.timestart,
							   timeend: row.timeend,
							   count: row.count,
							   forecast_date: row.forecast_date,
							   data_availability: row.data_availability,
							   fuente: row.fuente,
							   id_externo: row.id_externo,
							   public: row.public
						   }
					   }
				   })
				   
				}
			} else {
				return result.rows
			}
		})
		//~ .catch(e=>{
			//~ console.error(e)
		//~ })
	}
	
	getMonitoredVars(tipo="puntual") {
		return this.pool.query("SELECT tipo,id,nombre,tipo2 from monitored_vars where tipo=$1",[tipo])
		.then(result=>{
			if(result.rows) {
				return result.rows
			} else {
				return []
			}
		})
		.catch(e=>{
			if(config.verbose) {
				console.error(e)
			} else {
				console.error(e.toString())
			}
		})
	}
	getMonitoredFuentes(tipo="puntual",var_id,isPublic) {
		var public_filter = (isPublic) ? " AND public=true" : ""
		return this.pool.query("SELECT tipo,var_id,fuentes_id,nombre,public from monitored_fuentes where tipo=$1 AND var_id=$2" + public_filter,[tipo,var_id])
		.then(result=>{
			if(result.rows) {
				return result.rows
			} else {
				return []
			}
		})
		.catch(e=>{
			if(config.verbose) {
				console.error(e)
			} else {
				console.error(e.toString())
			}
		})
	}
	
	getMonitoredAreas(format="json",var_id,fuentes_id) {
		return this.pool.query(
			"SELECT series_areal.id series_id,\
				   areas_pluvio.nombre,\
				   areas_pluvio.unid area_id,\
				   var_id,\
				   fuentes_id,\
				   proc_id,\
				   unit_id,\
				   var.nombre var_name,\
				   fuentes.nombre fuentes_name,\
				   series_areal_date_range.timestart,\
					series_areal_date_range.timeend,\
					COALESCE(series_areal_date_range.count, 0),\
					case when series_areal_date_range.timeend is not null\
					then \
						case when now() - series_areal_date_range.timeend < '1 days'::interval \
							 then  'RT'\
							 when now() - series_areal_date_range.timeend < '3 days'::interval\
							 then 'NRT'\
							 else 'H'\
						end\
					else 'N'\
					end AS data_availability,\
				   st_asgeojson(geom)::json geom\
			FROM series_areal\
			JOIN areas_pluvio ON (series_areal.area_id=areas_pluvio.unid AND areas_pluvio.activar=true AND areas_pluvio.mostrar=true AND series_areal.var_id=$1 AND series_areal.fuentes_id=$2)\
			join var ON  (var.id = series_areal.var_id)\
			join fuentes ON (fuentes.id = series_areal.fuentes_id)\
			LEFT OUTER JOIN series_areal_date_range on (series_areal_date_range.series_id=series_areal.id)\
			ORDER BY area_id,var_id,fuentes_id,proc_id",[var_id,fuentes_id])
		.then(result=>{
			if(!result.rows) {
				console.error("crud.getMonitoredAreas: query error")
				return
			}
			if(format.toLowerCase()=="geojson") {
				return {
				   "type": "FeatureCollection",
				   "features": result.rows.map(row=> {
					   return {
						   "type": "Feature",
						   "id": row.series_id,
						   "geometry": row.geom,
						   "properties": {
							   "series_id": row.series_id,
							   "nombre": row.nombre,
							   area_id: row.area_id,
							   var_id: row.var_id,
							   fuentes_id: row.fuentes_id,
							   proc_id: row.proc_id,
							   unit_id: row.unit_id,
							   var_name: row.var_name,
							   fuentes_name: row.fuentes_name,
							   timestart: row.timestart,
							   timeend: row.timeend,
							   count: row.count,
							   data_availability: row.data_availability
						   }
					   }
				   })
				}
			} else {
				return result.rows
			}
		})
		.catch(e=>{
			if(config.verbose) {
				console.error(e)
			} else {
				console.error(e.toString())
			}
		})
	}
	
	// tabprono
	
	insertTabprono(tabprono_geojson,insert_obs=true) {
		var promises = []
		tabprono_geojson.features.forEach(f=>{
			promises.push(this.pool.query("INSERT INTO tabprono_parana (unid, estacion_nombre, geom, fecha_hoy, altura_hoy, mes, altura_media_mes, nivel_de_alerta, nivel_de_evacuacion, fecha_pronostico, altura_pronostico_min, altura_pronostico, altura_pronostico_max, estado_pronostico, fecha_tendencia, altura_tendencia_min, altura_tendencia, altura_tendencia_max, estado_tendencia,valor) VALUES\
			($1, $2, st_setsrid(st_point($3,$4),4326), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, null)\
			ON CONFLICT (unid) DO UPDATE SET estacion_nombre=excluded.estacion_nombre, geom=excluded.geom, fecha_hoy=excluded.fecha_hoy, altura_hoy=excluded.altura_hoy, mes=excluded.mes, altura_media_mes=excluded.altura_media_mes, nivel_de_alerta=excluded.nivel_de_alerta, nivel_de_evacuacion=excluded.nivel_de_evacuacion, fecha_pronostico=excluded.fecha_pronostico, altura_pronostico_min=excluded.altura_pronostico_min, altura_pronostico=excluded.altura_pronostico,altura_pronostico_max=excluded.altura_pronostico_max, estado_pronostico=excluded.estado_pronostico, fecha_tendencia=excluded.fecha_tendencia, altura_tendencia_min=excluded.altura_tendencia_min, altura_tendencia=excluded.altura_tendencia, altura_tendencia_max=excluded.altura_tendencia_max, estado_tendencia=excluded.estado_tendencia, valor=excluded.valor\
			RETURNING *",[f.properties.estacion_id, f.properties.estacion_nombre, f.geometry.coordinates[0], f.geometry.coordinates[1], f.properties.nivel_hoy[0], f.properties.nivel_hoy[1], f.properties["altura_media_mensual(1994-2018)"][0], f.properties["altura_media_mensual(1994-2018)"][1], f.properties.nivel_de_alerta, f.properties.nivel_de_evacuacion, f.properties.pronostico[0], f.properties.pronostico[1], f.properties.pronostico[2], f.properties.pronostico[3], f.properties.estado_pronostico, f.properties.tendencia[0], f.properties.tendencia[1], f.properties.tendencia[2], f.properties.tendencia[3], f.properties.estado_tendencia]))
		})
		return Promise.all(promises)
		.then(result=>{
			this.pool.query("insert into tabprono_parana_historia (unid, estacion_nombre, geom, fecha_hoy, altura_hoy, mes, altura_media_mes, nivel_de_alerta, nivel_de_evacuacion, fecha_pronostico, altura_pronostico, estado_pronostico, fecha_tendencia, altura_tendencia, estado_tendencia) select unid, estacion_nombre, geom, fecha_hoy, altura_hoy, mes, altura_media_mes, nivel_de_alerta, nivel_de_evacuacion, fecha_pronostico, altura_pronostico, estado_pronostico, fecha_tendencia, altura_tendencia, estado_tendencia from tabprono_parana ON CONFLICT (unid,fecha_hoy) do nothing")
			.then(()=>{
				console.log("Insert into tabprono_parana_historia OK")
			}).catch(e=>{
				if(config.verbose) {
					console.error(e)
				} else {
					console.error(e.toString())
				}
			})
			if(insert_obs) {
				// upsert pronosticos
				var pronos=[]
				const prono_sid = {19: 1541, 20: 3381, 23: 3382, 24: 3383, 26: 3384, 29: 3385, 30: 1543, 34: 3387} // id de serie var_id=2 proc_id=8
				result.forEach(r=>{
					r = r.rows[0]
					//~ console.log(r)
					pronos.push(new internal.observacion({tipo: "puntual", series_id: prono_sid[r.unid], timestart: r.fecha_hoy, timeend: r.fecha_hoy, valor: r.altura_hoy}))
					pronos.push(new internal.observacion({tipo: "puntual", series_id: prono_sid[r.unid], timestart: r.fecha_pronostico, timeend: r.fecha_pronostico, valor: r.altura_pronostico}))
					pronos.push(new internal.observacion({tipo: "puntual", series_id: prono_sid[r.unid], timestart: r.fecha_tendencia, timeend: r.fecha_tendencia, valor: r.altura_tendencia}))
				})
				return this.upsertObservaciones(pronos)
			} else {
				return result.map(r=>r.rows[0])
			}
		})
	}
	
	// tools
	
	points2rast(points,metadata={},options={},upsert) {
		var outputdir = (options.outputdir) ? path.resolve(options.outputdir) : path.resolve(this.config.pp_cdp.outputdir)
		var nmin=(options.nmin) ? options.nmin : this.config.pp_cdp.nmin;
		var radius1= (options.radius1) ? options.radius1 : this.config.pp_cdp.radius1;
		var radius2= (options.radius2) ? options.radius2 : this.config.pp_cdp.radius2;
		var out_x =  (options.out_x) ? options.out_x : this.config.pp_cdp.out_x;
		var out_y =  (options.out_y) ? options.out_y : this.config.pp_cdp.out_y;
		var nullvalue = (options.nullvalue) ? options.nullvalue : this.config.pp_cdp.nullvalue;
		if(!metadata.series_id) {
			metadata.series_id = this.config.pp_cdp.series_id
		}
		var method_ = (options.method) ? options.method : this.config.pp_cdp.method;
		var method
		{
			switch (method_.toLowerCase()) {
				case "invdist":
					method = "invdist:radius1=" + radius1 + ":radius2=" + radius2 + ":max_points=4:min_points=1:nodata=" + nullvalue;
					break;
				case "nearest":
					method = "nearest:radius1=" + radius1 + ":radius2=" + radius2 + ":angle=0:nodata=" + nullvalue;
					break;
				case "linear":
					method = "linear:radius=" + radius1 + ":nodata=" + nullvalue;
					break;
				deafult:
					return Promise.reject("Método incorrecto. Válidos: invdist, nearest, linear");
			}
		}
		var target_extent = (options.target_extent) ? options.target_extent : this.config.pp_cdp.target_extent
		var roifile = (options.roifile) ? options.roifile : path.resolve(this.config.pp_cdp.roifile)
		var srs = (options.srs) ? parseInt(srs) : this.config.pp_cdp.srs
		var makepng = (options.makepng) ? options.makepng : this.config.pp_cdp.makepng 
		var rand = sprintf("%08d",Math.random()*100000000)
		var geojsonfile= (options.geojsonfile) ? path.resolve(options.geojsonfile) : "/tmp/points_"+rand+".geojson"
		var rasterfile="/tmp/grid_"+rand+".tif";
		var rasternonull="/tmp/grid_nonull_"+rand+".tif";
		var tempresultfile="/tmp/grid_nonull_crop_"+rand+".tif";
		var warpedfile= "/tmp/grid_nonull_crop_warped_"+rand+".tif";
		var rules_file = path.resolve( (options.tipo) ? (options.tipo == "diario") ? this.config.pp_cdp.rules_file_diario : this.config.pp_cdp.rules_file_semanal : this.config.pp_cdp.rules_file )
		var zfield = (options.zfield) ? options.zfield : this.config.pp_cdp.zfield
		if(options.output) {
			if(!validFilename(options.output)) {
				return Promise.reject("invalid output filename")
			}
		}
		var resultfile= (options.output) ? outputdir + "/" + options.output : path.resolve(this.config.pp_cdp.outputdir) + "/rast_" + method_ + "_" + radius1 + "_" + radius2 + "_" + out_x + "_" + out_y + ".tif" 
		var pngfile= resultfile.replace(/\.tif$/,".png"); // "/home/alerta5/13-SYNOP/mapas_semanales_gdal/pp_semanal_idw_$label_date.png";

		return this.pool.query("with p as (\
			select st_transform(st_setsrid(st_point($1, $2),4326),$5::int) bl,\
			       st_transform(st_setsrid(st_point($3, $4),4326),$5::int) tr )\
			select st_x(p.bl),st_y(p.bl),st_x(p.tr),st_y(p.tr) from p",[target_extent[0][0],target_extent[0][1],target_extent[1][0],target_extent[1][1],srs])
		.then(result=>{
			if(result.rows.length==0) {
				throw "extent reprojection error"
			}
			return ogr2ogr(points).format("GeoJSON").options(['-t_srs','EPSG:'+srs]).promise()
		}).then(data=>{
			return fs.writeFile(geojsonfile,JSON.stringify(data))
		}).then(()=> {
			return pexec("gdal_grid -txe " + target_extent[0][0] + " " + target_extent[1][0] + " -tye " + target_extent[0][1] + " " + target_extent[1][1] + " -outsize " + out_x + " " + out_y + " -zfield " + zfield + " -ot Float32 -a " + method + " " + geojsonfile + " " + rasterfile)
		}).then(result=>{
			if(result.stdout && config.verbose) {
				console.log("crud.points2rast: stdout: " + result.stdout)	
			}
			return pexec("gdal_translate -a_nodata " + nullvalue + " " + rasterfile + " " + rasternonull)
		}).then(result=>{
			if(result.stdout && config.verbose) {
				console.log("crud.points2rast: stdout: " + result.stdout)
			}
			if(result.stderr && config.verbose) {
				console.error(result.stderr)
			}
			return pexec("gdalwarp -dstnodata " + nullvalue + " -cutline " + roifile + " " + rasternonull + " " + tempresultfile) //("gdal_calc.py --overwrite  -A " + rasternonull + " -B " + roifile + " --outfile=" + tempresultfile + " --NoDataValue=-9999 --calc=\"A*B\"")
		}).then(result=>{
			if(result.stdout && config.verbose) {
				console.log("crud.points2rast: stdout: " + result.stdout)
			}
			if(result.stderr && config.verbose) {
				console.error("crud.points2rast: stderr: " + result.stderr)
			}
			return pexec("gdal_translate -a_nodata NAN " + tempresultfile + " " + resultfile)
		}).then(result=>{
			if(result.stdout  && config.verbose) {
				console.log("crud.points2rast: stdout: " + result.stdout)
			}
			if(result.stderr  && config.verbose) {
				console.error(result.stderr)
			}
			return pexec("gdalwarp -t_srs EPSG:" + srs + " -srcnodata -9999 -dstnodata nan -ot Float32 -overwrite " + tempresultfile + " " + resultfile);
		}).then(result=>{
			if(result.stdout  && config.verbose) {
				console.log("crud.points2rast: stdout: " + result.stdout)
			}
			if(result.stderr  && config.verbose) {
				console.error(result.stderr)
			}
			return pexec("gdalwarp -t_srs EPSG:4326 -dstnodata -9999 -overwrite " + tempresultfile + " " + warpedfile)
		}).then(result=>{
			if(result.stdout  && config.verbose) {
				console.log("crud.points2rast: stdout: " + result.stdout)
			}
			if(result.stderr  && config.verbose) {
				console.error(result.stderr)
			}
			if(makepng) {
				return pexec("gdaldem color-relief " + tempresultfile + " " + rules_file + " " + pngfile + " -of PNG -alpha")
			} else {
				return Promise.resolve()
			}
		}).then(result=>{
			if(result.stdout && config.verbose) {
				console.log("crud.points2rast: stdout: " + result.stdout)
			}
			if(result.stderr && config.verbose) {
				console.error("crud.points2rast: stderr: " + result.stderr)
			}
			return fs.readFile(warpedfile)
		}).then(data=>{
			return {tipo:"rast",series_id:metadata.series_id,timeupdate:metadata.timeupdate,timestart: metadata.timestart, timeend: metadata.timeend, valor: data} 
		}).then(obs=>{
			if(upsert) {
				if(!metadata.series_id) {
					throw("Falta series_id")
				} else {
					//~ console.log("to_update: ts:" + obs.timestart + ", te:" + obs.timeend + ", series_id:" + obs.series_id)
					return this.upsertObservacion(obs)
				}
			} else {
				return obs
			}
		})
	} 
	
	getObservacionesPuntuales2Rast(filter={},options={}) {
		var raster_format = (options.format) ? options.format : "GTiff"
		options.format="GeoJSON"
		return this.getObservacionesTimestart(filter,options)
		.then(observaciones=>{
			if(observaciones.length == 0) {
				throw("no observaciones found")
			}
			var metadata = {
				series_id: options.output_series_id,
				timeupdate: observaciones[0].timeupdate,
				timestart: observaciones[0].timestart,
				timeend: observaciones[0].timeend
			}
			return this.points2rast(observaciones,metadata,options)
		})
	}
	
	get_pp_cdp_diario(fecha,filter={},options={},upsert) {
		const used = process.memoryUsage();
		for (let key in used) {
		  console.log(`${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
		}

		var timestart = (fecha) ? new Date(fecha) : new Date(new Date().getTime() - 1000*3600*35)
		if(timestart.toString() == "Invalid Date") {
			return Promise.reject("fecha: Invalid Date")
		}
		timestart = new Date(timestart.getUTCFullYear(),timestart.getUTCMonth(),timestart.getUTCDate(),9)
		var timeend = new Date(timestart.getTime() + 24*3600*1000)
		console.log({ts:timestart,te:timeend})
		filter.estacion_id = (filter.estacion_id) ? filter.estacion_id : this.config.pp_cdp.estacion_ids
		return this.getCampo(1,timestart,timeend,filter,options)
		.then(campo=>{
			if(!options.skip_count_control) {
				var count_synop = campo.series.reduce((count,s)=> count + ((s.estacion.tabla == 'stations') ? 1 : 0),0)
				var count_synop_cdp = campo.series.reduce((count,s)=> count + ((s.estacion.tabla == 'stations_cdp') ? 1 : 0),0)
				console.log({count_synop:count_synop,count_synop_cdp:count_synop_cdp})
				if(count_synop == 0 || count_synop_cdp == 0) {
					throw("Faltan registros SYNOP")
				}
			}
			options.output = "pp_diaria_" + timestart.toISOString().substring(0,10).replace(/-/g,"") + "_nearest.tif"
			if(!fs.existsSync(path.resolve(sprintf("%s/%04d", this.config.pp_cdp.outputdir, timestart.getUTCFullYear())))) {
				fs.mkdirSync(path.resolve(sprintf("%s/%04d", this.config.pp_cdp.outputdir, timestart.getUTCFullYear())))
			}
			if(!fs.existsSync(path.resolve(sprintf("%s/%04d/%02d", this.config.pp_cdp.outputdir, timestart.getUTCFullYear(), timestart.getUTCMonth()+1)))) {
				fs.mkdirSync(path.resolve(sprintf("%s/%04d/%02d", this.config.pp_cdp.outputdir, timestart.getUTCFullYear(), timestart.getUTCMonth()+1)))
			}
			options.outputdir = path.resolve(sprintf("%s/%04d/%02d", this.config.pp_cdp.outputdir, timestart.getUTCFullYear(), timestart.getUTCMonth()+1))
			var csv_file = path.resolve(options.outputdir + "/" + "pp_diaria_" + timestart.toISOString().substring(0,10).replace(/-/g,"") + ".csv")
			// escribe archivo CSV
			fs.writeFile(csv_file,campo.toCSV())
			.catch(e=>{
				console.error(e)
			})
			//~ options.geojsonfile = path.resolve(options.outputdir + "/" + options.output.replace(/\.tif$/,".json"))
			var surf_file = path.resolve(options.outputdir + "/" + "pp_diaria_" + timestart.toISOString().substring(0,10).replace(/-/g,"") + "_surf.tif")
			var png_file =  path.resolve(options.outputdir + "/" + "pp_diaria_" + timestart.toISOString().substring(0,10).replace(/-/g,"") + "_surf.png")
			var geojson_file = path.resolve(options.outputdir + "/" + "pp_diaria_" + timestart.toISOString().substring(0,10).replace(/-/g,"") +".json")
			var nearest_file = path.resolve(options.outputdir + "/" + options.output)
			// genera raster x vecino más próximo y escribe archivo geojson
			return this.points2rast(campo.toGeoJSON(),{series_id:this.config.pp_cdp.series_id,timestart:timestart,timeend:timeend},{...options,geojsonfile:geojson_file,tipo:"diario"},upsert)
			.then(result=>{
				if(upsert && !options.no_update_areales) {
					// calcula medias areales
					this.rast2areal(this.config.pp_cdp.series_id,timestart,timeend,"all")
					.then(result=>{
						console.log("upserted " + result.length + " into series_areal, series_id:" + this.config.pp_cdp.series_id)
					})
					.catch(e=>{
						console.error(e)
					})
				}
				// genera raster x splines
				var surf_parameters = {...this.config.grass,maskfile: path.resolve(this.config.pp_cdp.maskfile),timestart:timestart,timeend:timeend,res:0.1}
				return printMap.surf(geojson_file,surf_file,surf_parameters)
				.then(output=>{
					console.log(output)
					var parameters = {...this.config.grass, timestart: timestart,timeend: timeend, title: "precipitaciones diarias campo interpolado [mm]"}
					parameters.render_file = undefined
					// imprime mapa splines
					return printMap.print_pp_cdp_diario(surf_file,png_file,parameters,geojson_file)
				})
				.then(output=>{
					console.log(output)
					if(options.no_send_data) {
						return {type:"pp_cdp_diario",timestart:result.timestart,timeend:result.timeend,files:{points_geojson:geojson_file,points_csv:csv_file,nearest_tif:nearest_file,nearest_png:nearest_file.replace(/\.tif$/,".png"),surf_tif:surf_file,surf_png:png_file}}
					} else {
						return result
					}
				})
			})
		})
	}
	get_pp_cdp_semanal(fecha,filter={},options={}) {
		// toma fecha inicial, si falta, por defecto es hoy - 8 días 
		var timestart = (fecha) ? new Date(fecha) : new Date(new Date().getTime() - 1000*3600*(35 + 7*24))
		if(timestart.toString() == "Invalid Date") {
			return Promise.reject("fecha: Invalid Date")
		}
		timestart = new Date(timestart.getUTCFullYear(),timestart.getUTCMonth(),timestart.getUTCDate(),9)
		// toma fecha final = fecha incial + 7 días
		var timeend = new Date(timestart.getTime() + 7*24*3600*1000)
		console.log({ts:timestart,te:timeend})
		// toma filtro de estaciones del archivo de configuración
		filter.estacion_id = (filter.estacion_id) ? filter.estacion_id : this.config.pp_cdp.estacion_ids
		// obtiene campo de precipitaciones puntuales
		return this.getCampo(1,timestart,timeend,filter,options)
		.then(campo=>{
			// elimina estaciones con menos de 6 registros
			campo.series = campo.series.filter(s=>s.count >= 6)
			// controla que haya estaciones SYNOP con 7 registros
			if(!options.skip_count_control) {
				var count_synop = campo.series.reduce((count,s)=> count + ((s.estacion.tabla == 'stations' && s.count >= 7) ? 1 : 0),0)
				var count_synop_cdp = campo.series.reduce((count,s)=> count + ((s.estacion.tabla == 'stations_cdp' && s.count >= 7) ? 1 : 0),0)
				console.log({count_synop:count_synop,count_synop_cdp:count_synop_cdp})
				if(count_synop == 0 || count_synop_cdp == 0) {
					throw("Faltan registros SYNOP")
				}
			}
			// genera nombre de archivo raster y crea directorios YYYY/MM si no existen
			options.output = "pp_semanal_" + timestart.toISOString().substring(0,10).replace(/-/g,"") + "_nearest.tif"
			if(!fs.existsSync(path.resolve(sprintf("%s/%04d", this.config.pp_cdp.outputdir_semanal, timestart.getUTCFullYear())))) {
				fs.mkdirSync(path.resolve(sprintf("%s/%04d", this.config.pp_cdp.outputdir_semanal, timestart.getUTCFullYear())))
			}
			if(!fs.existsSync(path.resolve(sprintf("%s/%04d/%02d", this.config.pp_cdp.outputdir_semanal, timestart.getUTCFullYear(), timestart.getUTCMonth()+1)))) {
				fs.mkdirSync(path.resolve(sprintf("%s/%04d/%02d", this.config.pp_cdp.outputdir_semanal, timestart.getUTCFullYear(), timestart.getUTCMonth()+1)))
			}
			options.outputdir = path.resolve(sprintf("%s/%04d/%02d", this.config.pp_cdp.outputdir_semanal, timestart.getUTCFullYear(), timestart.getUTCMonth()+1))
			var csv_file = path.resolve(options.outputdir + "/" + "pp_semanal_" + timestart.toISOString().substring(0,10).replace(/-/g,"") + ".csv")
			// escribe archivo CSV
			fs.writeFile(csv_file,campo.toCSV())
			.catch(e=>{
				console.error(e)
			})
			//~ options.geojsonfile = path.resolve(options.outputdir + "/" + options.output.replace(/\.tif$/,".json"))
			var surf_file = path.resolve(options.outputdir + "/" + "pp_semanal_" + timestart.toISOString().substring(0,10).replace(/-/g,"") + "_surf.tif")
			var png_file =  path.resolve(options.outputdir + "/" + "pp_semanal_" + timestart.toISOString().substring(0,10).replace(/-/g,"") + "_surf.png")
			var geojson_file = path.resolve(options.outputdir + "/" + "pp_semanal_" + timestart.toISOString().substring(0,10).replace(/-/g,"") + ".json")
			var nearest_file = path.resolve(options.outputdir + "/" + options.output)
			// genera raster x vecino más próximo y escribe archivo geojson
			return this.points2rast(campo.toGeoJSON(),{timestart:timestart,timeend:timeend},{...options,geojsonfile: geojson_file,tipo:"semanal"})
			.then(result=>{
				var surf_parameters = {...this.config.grass,maskfile: path.resolve(this.config.pp_cdp.maskfile),timestart:timestart,timeend:timeend,res:0.1}
				surf_parameters.tension = 80
				// genera raster x splines
				return printMap.surf(geojson_file,surf_file,surf_parameters)
				.then(output=>{
					console.log(output)
					var parameters = {...this.config.grass, timestart: timestart,timeend: timeend, title: "precipitaciones semanales campo interpolado [mm]"}
					parameters.render_file = undefined
					// imprime mapa splines
					return printMap.print_pp_cdp_semanal(surf_file,png_file,parameters,geojson_file)
				})
				.then(output=>{
					console.log(output)
					if(options.no_send_data) {
						return {type:"pp_cdp_semanal",timestart:result.timestart,timeend:result.timeend,files:{points_geojson:geojson_file,points_csv:csv_file,nearest_tif:nearest_file,nearest_png:nearest_file.replace(/\.tif$/,".png"),surf_tif:surf_file,surf_png:png_file}}
					} else {
						return result
					}
				})
			})
		})
	}
	get_pp_cdp_batch(timestart,timeend,filter={},options={},upsert) {
		var timestart_diario = (timestart) ? new Date(timestart) : new Date(new Date().getTime() - 1000*3600*(35 + 14*24))
		if(timestart_diario.toString() == "Invalid Date") {
			return Promise.reject("fecha: Invalid Date")
		}
		var timestart_semanal = timestart_diario
		var timeend_diario = (timeend) ? new Date(timeend) : new Date(new Date().getTime() - 1000*3600*35)
		var timeend_semanal = new Date(timeend_diario.getTime() - 1000*3600*24*6)
		var fechas_diario = []
		for(var i=timestart_diario.getTime();i<=timeend_diario.getTime();i=i+1000*3600*24) {
			fechas_diario.push(new Date(i))
		}
		if(fechas_diario.length == 0) {
			return Promise.reject("intervalo de fechas nulo")
		}
		var fechas_semanal = []
		for(var i=timestart_semanal.getTime();i<=timeend_semanal.getTime();i=i+1000*3600*24) {
			fechas_semanal.push(new Date(i))
		}
		var all_results = []
		var all_errors = []
		options.no_send_data = true
		return Promise.allSettled(
			fechas_diario.map(fecha => this.get_pp_cdp_diario(fecha,filter,options,upsert))
		).then(result=>{
			result.forEach(r=>{
				if(r.status == 'fulfilled') {
					all_results.push(r.value)
				} else {
					all_errors.push(r.reason)
					console.error(r.reason)
				}
			})
			return Promise.allSettled(
				fechas_semanal.map(fecha => this.get_pp_cdp_semanal(fecha,filter,options))
			)
		}).then(result=>{
			result.forEach(r=>{
				if(r.status == 'fulfilled') {
					all_results.push(r.value)
				} else {
					all_errors.push(r.reason)
					console.error(r.reason)
				}
			})
			if(all_results.length == 0) {
				throw(all_errors)
			} else {
				return all_results
			}
		})
	}
	
	checkAuth(user,params={}) {
		switch (user.role) {
			case "admin":
				return true
				break;
			case "writer":
				var series_table = (params.tipo) ? (params.tipo == "puntual") ? "series" : (params.tipo == "areal") ? "series_areal " : (params.tipo == "rast" || params.tipo == "raster") ? "series_rast" : "series" : "series"
				var observaciones_table = (params.tipo) ? (params.tipo == "puntual") ? "observaciones" : (params.tipo == "areal") ? "observaciones_areal" : (params.tipo == "rast" || params.tipo == "raster") ? "observaciones_rast" : "observaciones" : "observaciones"
				var query_promise
				if(params.redId) {
					query_promise = this.pool.query("SELECT 1 FROM redes WHERE user_id=$1 AND id=$2",[user.id,params.redId])
				} else if(params.estacion_id) {
					query_promise = this.pool.query("SELECT 1 FROM estaciones,redes WHERE redes.tabla_id=estaciones.tabla AND redes.user_id=$1 AND estaciones.unid=$2",[user.id,params.estacion_id])
				} else if(params.series_id) {
					query_promise = this.pool.query("SELECT 1 FROM " + series_table + ",estaciones,redes WHERE " + series_table + ".estacion_id=estaciones.unid AND redes.tabla_id=estaciones.tabla AND redes.user_id=$1 AND " + series_table + ".id=$2",[user.id,params.series_id])
				} else if(params.observacion_id) {
					query_promise = this.pool.query("SELECT 1 FROM " + observaciones_table + "," + series_table + ",estaciones,redes WHERE " + observaciones_table + ".series_id=" + series_table + ".id AND " + series_table + ".estacion_id=estaciones.unid AND redes.tabla_id=estaciones.tabla AND redes.user_id=$1 AND " + observaciones_table + ".id=$2",[user.id,params.observaciones_id])
				}
				return query_promise
				.then(result=>{
					if(result.rows.length > 0) {
						return true
					} else {
						return false
					}
				})
				.catch(e=>{
					console.error(e)
					return false
				})
				break;
			case "reader","public":
				return false
				break;
			default:
				return false
		}
	}

	// RALEO (THIN) SERIES - by SERIES_ID OR FUENTES_ID
	thinObs(tipo,filter, options) { // filter:series_id,timestart,timeend; options: interval={'hours':1},deleteSkipped=false,returnSkipped=false) {
		if(!filter.timestart || !filter.timeend) {
			return Promise.reject("crud.thinObs: Missing filter.timestart filter.timeend")
		}
		options.interval = (options.interval) ? options.interval : {'hours':1}
		if(typeof options.interval == "string") {
			options.interval = parsePGinterval(options.interval)
		}
		// CHECK INTERVAL LOWER LIMIT
		if(timeSteps.interval2epochSync(options.interval) < config.thin.interval_lower_limit) {
			return Promise.reject("crud.thinObs: interval lower limit is " + config.thin.interval_lower_limit)
		}
		// GENERATE TIME SEQUENCE
		var seq = timeSteps.dateSeq(filter.timestart,filter.timeend,options.interval)
		// CASE SINGLE SERIES_ID 
		if(filter.series_id && typeof filter.series_id == "number") {
			return this.thinSeries(tipo,{series_id:filter.series_id,timestart:filter.timestart,timeend:filter.timeend},{interval:options.interval,deleteSkipped:options.deleteSkipped,returnSkipped:options.returnSkipped},seq)
			.then(result=>{
				return [
					{
						id:filter.series_id,
						observaciones: result
					}
				]
			})
		// CASE MULTIPLE SERIES_ID OR FUENTES_ID/RED_ID
		} else {
			if(!(tipo == "puntual" && filter.red_id) && !(tipo!="puntual" && filter.fuentes_id) && !filter.series_id) {
				return Promise.reject("Missing filter.series_id OR filter.fuentes_id/red_id")
			}
			filter.id = (filter.series_id) ? filter.series_id : filter.id
			var filter_get_series = {...filter}
			delete filter_get_series.timestart
			delete filter_get_series.timeend
			return this.getSeries(tipo,filter_get_series,{no_metadata:true})
			.then(async series=>{
				if(series.length == 0) {
					console.log("crud.thinObs: no series found")
					return
				}
				var results = []
				for(var i in series) {
					try {
						var result = await this.thinSeries(tipo,{series_id:series[i].id,timestart:filter.timestart,timeend:filter.timeend},options,seq)
					} catch (e) {
						console.error("crud.thinObs: " + e.toString())
						results.push({error:e})
						break
					}
					results.push({values:result})
				}
				var i=-1
				return results.map(r=>{
					i++
					if (r.values) {
						return {
							id: series[i].id,
							observaciones: r.values
						}
					} else {
						return {
							id: series[i].id,
							observaciones: null,
							message: r.error.toString()
						}
					}
				})
			})
		}
	}
	
	thinSeries(tipo='puntual',filter={},options={},seq) {
		// console.log({options:options})
		if(!filter.series_id || !filter.timestart || !filter.timeend || !options.interval) {
			return Promise.reject("Missing filter.series_id, filter.timestart, filter.timeend, options.interval")
		}
		if(!seq) {
			if(typeof options.interval == "string") {
				options.interval = parsePGinterval(options.interval)
			}
			// CHECK INTERVAL LOWER LIMIT
			if(timeSteps.interval2epochSync(options.interval) < config.thin.interval_lower_limit) {
				return Promise.reject("crud.thinObs: interval lower limit is " + config.thin.interval_lower_limit)
			}
			// console.log("interval:" + JSON.stringify(interval))
			seq = timeSteps.dateSeq(filter.timestart,filter.timeend,options.interval) 
		} 
		return this.getObservaciones(tipo,filter)
		.then(observaciones=>{
			console.log("got " + observaciones.length + " observaciones.")
			// console.log(observaciones)
			var i = 0
			var result = []
			var skipped = []
			seqLoop:
			for(var j=0;j<seq.length-1;j++) {
				// console.log(seq[j])
				obsLoop:
				for(var k=i;k<observaciones.length;k++) {
					if(observaciones[k].timestart>=seq[j]) {
						if(observaciones[k].timestart < seq[j+1]) {
							result.push(observaciones[k])
							i = k + 1
							break obsLoop
						} else {
							i = k
							break obsLoop
						}
					} else {
						skipped.push(observaciones[k])
						// if(options.deleteSkipped) {
							// console.log(observaciones[k].timestart.toISOString() + ", id:" + observaciones[k].id)
						// 	this.deleteObservacion(tipo,observaciones[k].id)
						// }
					}
				}
			}
			if(options.deleteSkipped) {
				if(skipped.length == 0) {
					console.log("crud/thinObs: nothing to delete")
					return []
				}
				var obs_ids = skipped.map(o=>o.id) 
				// console.log(obs_ids)
				return this.deleteObservaciones(tipo,{id:obs_ids})
				.then(deleted=>{
					if(options.returnSkipped) {
						return deleted
					} else {
						return result
					}
				})
			}
			if(options.returnSkipped) {
				return skipped
			} else {
				return result
			}
		})
	}

	// 	 SERIES OBS - by SERIES_ID OR FUENTES_ID
	pruneObs(tipo,filter, options={}) { // filter:series_id,timestart,timeend; options: no_send_data=false) {
		if(!filter.timestart || !filter.timeend) {
			return Promise.reject("crud.pruneObs: Missing filter.timestart filter.timeend")
		}
		
		// CASE SINGLE SERIES_ID 
		if(filter.series_id && typeof filter.series_id == "number") {
			return this.deleteObservaciones(tipo,{series_id:filter.series_id,timestart:filter.timestart,timeend:filter.timeend},{no_send_data:options.no_send_data})
			.then(result=>{
				return [
					{
						id:filter.series_id,
						observaciones: result
					}
				]
			})
		// CASE MULTIPLE SERIES_ID OR FUENTES_ID/RED_ID
		} else {
			if(!(tipo == "puntual" && filter.red_id) && !(tipo!="puntual" && filter.fuentes_id) && !filter.series_id) {
				return Promise.reject("crud.pruneObs: Missing filter.series_id OR filter.fuentes_id/red_id")
			}
			filter.id = (filter.series_id) ? filter.series_id : filter.id
			return this.getSeries(tipo,filter,{no_metadata:true})
			.then(async series=>{
				if(series.length == 0) {
					console.log("crud.pruneObs: no series found")
					return
				}
				series = series.filter(s=>s.date_range.timestart && s.date_range.timestart < new Date(filter.timeend) && s.date_range.timeend && s.date_range.timeend >= new Date(filter.timestart))
				var results = []
				var accum_deletes = 0
				console.log("about to prune " + series.length + " series")
				for(var i=0;i<series.length;i++) {
					var series_id = series[i].id
					console.log("index:" + i + ", series_id:" + series_id)
					try {
						var result = await this.deleteObservaciones(tipo,{series_id:series_id,timestart:filter.timestart,timeend:filter.timeend},{no_send_data:options.no_send_data})
					} catch (e) {
						console.error("crud.pruneObs: " + e.toString())
						results.push({error:e})
						break
					}
					if(options.no_send_data) {
						accum_deletes += result
						console.log("accum deletes:" + accum_deletes)
						results.push({
							series_id: series[i].id,
							observaciones: result
						})
					} else {
						results.push({values:result})
					}
				}
				if(options.no_send_data) {
					return results
				} else {
					var i=-1
					return results.map(r=>{
						i++
						if (r.values) {
							return {
								id: series[i].id,
								observaciones: r.values
							}
						} else {
							return {
								id: series[i].id,
								observaciones: null,
								message: r.error.toString()
							}
						}
					})
				}
			})
		}
	}
	async prunePartedByYear(tipo,filter,options) {
		if(!filter.timestart || !filter.timeend) {
			throw("Missing timestart and/or timeend")
		}
		filter.timestart = new Date(filter.timestart)
		filter.timeend = new Date(filter.timeend)
		var startYear = filter.timestart.getUTCFullYear()
		var endYear = filter.timeend.getUTCFullYear()
		var results = []
		for(var y=startYear;y<=endYear;y++) {
			var timestart = new Date(y,0,1)
			if(timestart < filter.timestart) {
				timestart = filter.timestart
			}
			var timeend = new Date(y+1,0,1)
			if(timeend > filter.timeend) {
				timeend = filter.timeend
			}
			var this_filter = {...filter}
			this_filter.timestart = timestart
			this_filter.timeend = timeend
			// console.log(JSON.stringify(this_filter))
			try {
				var result = await this.pruneObs(tipo,this_filter,options)
				results.push(result)
			} catch(e) {
				console.error(e)
			}
		}
		return results
	}
	// pais
	async getPais(id,name) {
		var stmt
		if(!id) {
			if(!name) {
				return Promise.reject("Missing id or name")
			}
			stmt = pasteIntoSQLQuery("SELECT id,nombre,abrev,wmdr_name,wmdr_notation,wmdr_uri FROM paises WHERE lower(nombre)=lower($1)",[name])
		} else {
			stmt = pasteIntoSQLQuery(("SELECT id,nombre,abrev,wmdr_name,wmdr_notation,wmdr_uri FROM paises WHERE id=$1",[parseInt(id)]))
		}
		return this.pool.query(stmt)
		.then(result=>{
			if(!result.rows.length) {
				throw("pais not found")
			}
			return result.rows[0]
		})
	}
	
	async getPaises(filter={}) {
		var filter_string = control_filter2({id:{type:"integer"},nombre:{type:"string",case_insensitive:true},abrev:{type:"string",case_insensitive:true},wmdr_name:{type:"string"},wmdr_notation:{type:"string"},wmdr_uri:{type:"string",case_insensitive:true}},filter,"paises")
		return this.pool.query(`SELECT id,nombre,abrev,wmdr_name,wmdr_notation,wmdr_uri FROM paises WHERE 1=1 ${filter_string}`)
		.then(result=>{
			return result.rows
		})
	}

	async getRegionesOMM(filter={}) {
		var filter_string = control_filter2({id:{type:"integer"},name:{type:"string",case_insensitive:true},notation:{type:"string",case_insensitive:true},uri:{type:"string",case_insensitive:true}},filter,"regiones_omm")
		return this.pool.query(`SELECT id,name,notation,uri FROM regiones_omm WHERE 1=1 ${filter_string}`)
		.then(result=>{
			return result.rows
		})
	}

	async getProcessTypeWaterml2(filter={}) {
		var filter_string = control_filter2({proc_id:{type:"integer"},name:{type:"string",case_insensitive:true},notation:{type:"string",case_insensitive:true},uri:{type:"string",case_insensitive:true}},filter,"process_type_waterml2")
		return this.pool.query(`SELECT proc_id,name,notation,uri FROM process_type_waterml2 WHERE 1=1 ${filter_string}`)
		.then(result=>{
			return result.rows
		})
	}

	async getDataTypes(filter={}) {
		var filter_string = control_filter2({id:{type:"integer"},term:{type:"string",case_insensitive:true},in_waterml1_cv:{type:"boolean"},waterml2_code:{type:"string",case_insensitive:true},waterml2_uri:{type:"string",case_insensitive:true}},filter,"datatypes")
		return this.pool.query(`SELECT id,term,in_waterml1_cv,waterml2_code,waterml2_uri FROM datatypes WHERE 1=1 ${filter_string}`)
		.then(result=>{
			return result.rows
		})
	}

	async series2waterml2(series) {
		return series2waterml2.convert(this,series)
	}
}




module.exports = internal
