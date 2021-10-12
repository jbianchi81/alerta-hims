'use strict'

const request = require('request')
const internal = {}
const { Pool, Client } = require('pg')
var format = require('pg-format');
const fs = require('fs')
var dateFormat = require('date-format');
var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf

internal.sat2 = class{
	constructor(){
        //~ console.log("Initialize sat2 object");
    }
	AutenticarUsuario(user,pass,cookieJar) {
		return new Promise( (resolve, reject) => {
			request.post({url:'http://utr.gsm.ina.gob.ar:5667/SAT2Rest/api/AutenticarUsuario',jar:cookieJar, 
			  json: {
				nombreDeUsuario: user,
				clave: pass
			  }
			}, (error, res, body) => {
			  if (error) {
				console.error(error)
				reject(error)
				return
			  }
			  //~ console.log(`statusCode: ${res.statusCode}`)
			  //~ console.log(body)
			  resolve(body)
			})
		})
	}

	RecuperarEquipos(idCliente,cookieJar) {
		return new Promise( (resolve, reject) => {
			request.post({url:'http://utr.gsm.ina.gob.ar:5667/SAT2Rest/api/RecuperarEquipos',jar:cookieJar, json: {
				idCliente: idCliente
			  }
			}, (error, res, body) => {
			  if (error) {
				console.error(error)
				reject(error)
				return
			  }
			  console.log(`statusCode: ${res.statusCode}`)
			  //~ console.log(body)
			  resolve(body)
			})
		})
	}

	RecuperarInstantaneosDeEquipo(idEquipo,cookieJar) {
		return new Promise( (resolve, reject) => {
			request.post({url:'http://utr.gsm.ina.gob.ar:5667/SAT2Rest/api/RecuperarInstantaneosDeEquipo',jar:cookieJar, json: {
				idEquipo: idEquipo
			  }
			}, (error, res, body) => {
			  if (error) {
				console.error(error)
				reject(error)
				return
			  }
			  console.log(`statusCode: ${res.statusCode}`)
			  //~ console.log(body)
			  console.log(body.fechaUltimaActualizacionDatos)
			  console.log(body.datosSensores)
			  resolve(body)
			})
		})
	}
	
	RecuperarHistoricosDeEquipoPorSensor(idEquipo,idSensor,fechaDesde,fechaHasta,cookieJar) {    
		return new Promise( (resolve, reject) => {
			request.post({url:'http://utr.gsm.ina.gob.ar:5667/SAT2Rest/api/RecuperarHistoricosDeEquipoPorSensor',jar:cookieJar, json: {
				idEquipo: idEquipo,
				idSensor: idSensor,
				fechaDesde: fechaDesde,
				fechaHasta: fechaHasta
			  }
			}, (error, res, body) => {
			  if (error) {
				console.error(error)
				reject(error)
				return
			  }
			  //~ console.log(`statusCode: ${res.statusCode}`)
			  //~ console.log(JSON.stringify({query:{idEquipo:idEquipo,idSensor:idSensor,fechaDesde:fechaDesde,fechaHasta:fechaHasta}, body:body},null,2))
			  if(! Array.isArray(body)) {
				  reject({query:{idEquipo:idEquipo,idSensor:idSensor,fechaDesde:fechaDesde,fechaHasta:fechaHasta},body:body})
				  return
			  }
			  resolve({query:{idEquipo:idEquipo,idSensor:idSensor,fechaDesde:fechaDesde,fechaHasta:fechaHasta},body:body})
			})
		})
	}
	RecuperarMaximosYMinimos(idEquipo,tipoDeConsulta,cookieJar) {
		return new Promise( (resolve, reject) => {
			request.post({url:'http://utr.gsm.ina.gob.ar:5667/SAT2Rest/api/RecuperarMaximosYMinimos',jar:cookieJar, json: {
				idEquipo: idEquipo,
				tipoDeConsulta: tipoDeConsulta
			  }
			}, (error, res, body) => {
			  if (error) {
				console.error(error)
				reject(error)
				return
			  }
			  console.log(`statusCode: ${res.statusCode}`)
			  resolve(body)
			})
		})
	}
	

	GetEquipos(user,pass) {
		var cookieJar = request.jar()
		return this.AutenticarUsuario(user,pass,cookieJar)
		.then(result=> {
			console.log(result.idCliente)
			return this.RecuperarEquipos(result.idCliente,cookieJar)
		})
		.catch(e=>{
			console.log("falló autenticación")
		})
	}

	GetInstantaneosDeEquipo(user,pass,idEquipo) {
		var cookieJar = request.jar()
		return this.AutenticarUsuario(user,pass,cookieJar)
		.then(result=> {
			//~ console.log(result.idCliente)
			return this.RecuperarInstantaneosDeEquipo(idEquipo,cookieJar)
		})
		.catch(e=>{
			console.log("falló autenticación")
		})
	}
	
	GetHistoricosDeEquipoPorSensor(user,pass,idEquipo,idSensor,fechaDesde,fechaHasta) {
		var cookieJar = request.jar()
		return this.AutenticarUsuario(user,pass,cookieJar)
		.then(result=> {
			//~ console.log("idCliente:"+result.idCliente)
			return this.RecuperarHistoricosDeEquipoPorSensor(idEquipo,idSensor,fechaDesde,fechaHasta,cookieJar)
		})
		.then(historicos => {
			//~ console.log(JSON.stringify(historicos))
			var datos = historicos.body.map(it=> {
				return new internal.Dato(idEquipo, idSensor, it.fecha, it.valor)
			})
			return datos
		})
		.catch(e=>{
			console.error({message:"falló descarga",error:e})
		})
	}
	GetMaximosYMinimos(user,pass,idEquipo,tipoDeConsulta) {
		var cookieJar = request.jar()
		return this.AutenticarUsuario(user,pass,cookieJar)
		.then(result=> {
			//~ console.log(result.idCliente)
			return this.RecuperarMaximosYMinimos(idEquipo,tipoDeConsulta,cookieJar)
		})
		.catch(e=>{
			console.error(e)
		})
	}
}

internal.Equipo = class{
	constructor(idEquipo, descripcion, lat, lng, NroSerie, fechaAlta, sensores, idGrupo){
        //~ validtypes:(int, string, float, float, string|int, Date|string);
        if(!idEquipo || !descripcion || !lat || !lng) {
			throw "faltan argumentos para crear Equipo"
			return
		}
        if(! parseInt(idEquipo)) {
			throw "idEquipo incorrecto"
			return
		}
		if(!parseFloat(lat) || !parseFloat(lng)) {
			throw "lat o lng incorrecto"
			return
		}
        this.idEquipo =  parseInt(idEquipo)
        this.descripcion = String(descripcion)
        this.lng = parseFloat(lng)
        this.lat = parseFloat(lat)
        this.NroSerie = (NroSerie) ? String(NroSerie) : null
        if(fechaAlta) {
			if(fechaAlta instanceof Date) {
				this.fechaAlta = fechaAlta
			} else {
				var m = fechaAlta.match(/\d\d?\/\d\d?\/\d\d\d\d\s\d\d?\:\d\d\:\d\d/)
				if(m) {
					var s = m[0].split(" ")
					var d = s[0].split("/")
					var t = s[1].split(":")
					this.fechaAlta = new Date(
						parseInt(d[2]), 
						parseInt(d[1]-1), 
						parseInt(d[0]),
						parseInt(t[0]),
						parseInt(t[1]),
						parseInt(t[2])
					)
				} else {
					var m2 = new Date(fechaAlta)
					if(m2 == 'Invalid Date') {
						throw "fechaAlta incorrecta"
						return
					} else {
						this.fechaAlta = m2
					}
				}
			}
		} else {
			this.fechaAlta = null
		}
		this.sensores = []
		if(sensores) {
			if(!Array.isArray(sensores)) {
				throw new Error("sensores debe ser un array")
				return
			}
			for(var i=0;i<sensores.length;i++) {
				const sensor = new internal.Sensor(sensores[i].idSensor,sensores[i].nombre,sensores[i].Icono)
				if(! sensor instanceof internal.Sensor) {
					throw new Error("sensor incorrecto")
					return
				}
				this.sensores.push(sensor)
			}
		}
		if(idGrupo) {
			if(parseInt(idGrupo)) {
				this.idGrupo = parseInt(idGrupo)
			} else {
				this.idGrupo = -1
			}
		} else {
			this.idGrupo = -1
		}
    }
    toString(sep=",") {
		var sensores
		if(this.sensores) {
			if(this.sensores.length>0) {
				sensores = this.sensores.map(it=> "{" + it.toString() + "}").join(sep)
			}
		}
		return "idEquipo: " + this.idEquipo + sep + " descripcion: " + this.descripcion + sep + " lat: " + this.lat + sep + "lng: " + this.lng + sep + " idGrupo: " + this.idGrupo + sep + " NroSerie: " + this.NroSerie + sep + " fechaAlta: " + ((this.fechaAlta) ? this.fechaAlta.toISOString() : "null") + sep + " sensores: [" + ((sensores) ? sensores : "") + "]"
	}
	toCSV(sep=",") {
		var sensores
		if(this.sensores) {
			if(this.sensores.length>0) {
				sensores = this.sensores.map(it=> it.toCSV(":")).join(";")
			}
		}
		return this.idEquipo + sep + this.descripcion + sep + this.lat + sep + this.lng + sep + this.NroSerie + sep + ((this.fechaAlta) ? this.fechaAlta.toISOString() : "null") + sep + ((sensores) ? sensores : "")
	}
}

internal.Sensor = class{
	constructor(idSensor, nombre, Icono){
        //~ validtypes:(int, string, int);
        if(!idSensor || !nombre) {
			throw "faltan argumentos para crear Sensor"
			return
		}
        if(! parseInt(idSensor)) {
			throw "idSensor incorrecto"
			return
		}
        this.idSensor =  parseInt(idSensor)
        this.nombre = String(nombre)
        this.icono = parseInt(Icono)
    }
    toString(sep=",") {
		return "idSensor: " + this.idSensor + sep + " nombre: " + this.nombre + sep + " Icono:" + this.Icono
	}
	toCSV(sep=",") {
		return this.idSensor + sep + this.nombre + sep + this.Icono
	}
}

internal.Asociacion = class {
	constructor(idEquipo,idSensor,idGrupo) {
		if(! parseInt(idEquipo)) {
			throw "idEquipo incorrecto"
			return
		}
		if(! parseInt(idSensor)) {
			throw "idSensor incorrecto"
			return
		}
		this.idEquipo = parseInt(idEquipo)
		this.idSensor = parseInt(idSensor)
		this.idGrupo = (idGrupo) ? parseInt(idGrupo) : -1
	}
	toString(sep=",") {
		return "idEquipo: " + this.idEquipo + sep + " idSensor: " + this.idSensor + " idGrupo: " + this.idGrupo
	}
	toCSV(sep=",") {
		return this.idEquipo + sep + this.idSensor + sep  + this.idGrupo
	}
}

internal.Grupo = class {
	constructor(idGrupo,descripcion) {
		if(! parseInt(idGrupo)) {
			throw "idGrupo incorrecto"
			return
		}
		if(! descripcion.toString()) {
			throw "descripcion incorrecto"
			return
		}
		this.idGrupo = parseInt(idGrupo)
		this.descripcion = descripcion.toString()
	}
	toString(sep=",") {
		return "idGrupo: " + this.idGrupo + sep + " descripcion: " + this.descripcion
	}
	toCSV(sep=",") {
		return this.idgrupo + sep + this.descripcion
	}
}

internal.Dato = class{
	constructor(idEquipo, idSensor, fecha, valor){
        //~ validtypes:(int, int, Date|string, float);
        if(!idEquipo || !idSensor || !fecha || valor === undefined || valor === null) {
			throw "faltan argumentos para crear Dato"
			return
		}
        if(! parseInt(idEquipo)) {
			throw "idEquipo incorrecto"
			return
		}
        if(! parseInt(idSensor)) {
			throw "idSensor incorrecto"
			return
		}
		if(parseFloat(valor) === undefined || parseFloat(valor)=== null) {
			throw "valor incorrecto:" + valor
			return
		}
        this.idEquipo =  parseInt(idEquipo)
        this.idSensor = parseInt(idSensor)
        this.valor = parseFloat(valor)
		if(fecha instanceof Date) {
			this.fecha = fecha
		} else {
			var m = fecha.match(/\d\d\d\d\-\d\d\-\d\d\s\d\d\:\d\d/)
			if(m) {
				var s = m[0].split(" ")
				var d = s[0].split("-")
				var t = s[1].split(":")
				this.fecha = new Date(
					parseInt(d[0]), 
					parseInt(d[1]-1), 
					parseInt(d[2]),
					parseInt(t[0]),
					parseInt(t[1])
				)
			} else {
				var m2 = new Date(fecha)
				if(m2 == 'Invalid Date') {
					throw new Error("fecha incorrecta")
					return
				} else {
					this.fecha = m2
				}
			}
		}
    }
    toString(sep=",") {
		return "idEquipo: " + this.idEquipo + sep + " idSensor: " + this.idSensor + sep + " fecha: " + this.fecha.toISOString() + sep + " valor: " + this.valor
	}
	toCSV(sep=",") {
		return  this.idEquipo + sep + this.idSensor + sep + this.fecha.toISOString() + sep + this.valor
	}
}

internal.Heatmap = class {
	constructor(timeInt,fechaDesde,fechaHasta,idGrupo,idSensor,dt){
        //~ console.log("Initialize Heatmap object");
        if(!idGrupo) {
			throw new Error("falta idGrupo")
			return
		}
        if(!idSensor) {
			throw new Error("falta idSensor")
			return
		}
		var def_timestart =  new Date()
		var def_timeend =  new Date()
		this.timeInt = (timeInt == 'mes') ? 'mes' : (timeInt == 'dia') ? 'dia' : (timeInt == 'anio') ? 'anio' : (timeInt == 'fechas') ? 'fechas' : 'fechas'
		var dateformat = "yyyy-MM-dd"
		switch(this.timeInt) {
			case 'fechas':
				def_timestart.setTime(def_timestart.getTime() - 7 * 24 * 3600 * 1000)
				dateformat = "yyyy-MM-dd"
			case 'mes':
				//~ def_timestart.setTime(def_timestart.getTime() - def_timestart.getDate() * 24 * 3600 * 1000)
				//~ def_timeend.setTime(def_timeend.getTime() + 1 * 24 * 3600 * 1000)
				dateformat = "yyyy-MM"
				break;
			case 'dia':
				//~ def_timestart.setTime(def_timestart.getTime() - 1 * 24 * 3600 * 1000)
				//~ def_timeend.setTime(def_timeend.getTime() + 1 * 24 * 3600 * 1000)
				dateformat = "yyyy-MM-dd"
				break;
			case 'anio':
				//~ def_timestart.setTime(def_timestart.getTime() - 265 * 24 * 3600 * 1000)
				dateformat = "yyyy"
				break;
		}
		this.fechaDesde = (fechaDesde) ? dateparser(fechaDesde) : def_timestart
		this.fechaHasta = (fechaHasta) ? dateparser(fechaHasta) : def_timeend
		if(this.fechaDesde === 'Invalid Date') {
			throw new Error("invalid date")
			return
		}
		if(this.fechaHasta === 'Invalid Date') {
			throw new Error("invalid date")
			return
		}
		//~ console.log(this.fechaDesde, this.fechaHasta)
		if(this.timeInt == 'mes') {
			this.fechaDesde = new Date(this.fechaDesde.getUTCFullYear(), this.fechaDesde.getUTCMonth(),1)
			this.fechaHasta.setDate(1)
			this.fechaHasta.setMonth(this.fechaHasta.getMonth()+1)
			this.fechaHasta.setTime( this.fechaHasta.getTime() - 24* 3600 * 1000)
		}
		//~ console.log(this.fechaDesde, this.fechaHasta)
		this.idGrupo = parseInt(idGrupo)
		this.idSensor = parseInt(idSensor)
		this.default_interval = {
			start: def_timestart,
			end: def_timeend
		}
		this.date = dateFormat(dateformat,this.fechaDesde)
		this.dt = (dt) ? dt : "03:00"
		this.heatmap = []
		this.equipos = []
		this.dates = []
    }
    toFWC(firstcolwidth=30) {
		var colwidth=6
		switch(this.timeInt) {
			case "mes":
				this.dates = this.dates.map(d=> sprintf("%6s",d.replace(/^.+\-/,"").replace(/T.*$/,"")))
				break;
			case "dia":
				this.dates = this.dates.map(d=> sprintf("%6s",d.replace(/^.+T/,"").substring(0,5)))
				break;
			case "anio":
				this.dates = this.dates.map(d=> sprintf("%6s",d.replace(/^\d+\-/,"").replace(/\-.+$/,"")))
				break;
			default:
				colwidth=11
				this.dates = this.dates.map(d=> sprintf("%11s",d.substring(0,10)))
		}

		var tab= sprintf("%-"+firstcolwidth+"s","Fecha:") + this.dates.join("") + "\n"
		var rows=[]
		for(var i=0;i<this.heatmap.length;i++) {
			var x = this.heatmap[i][0]
			var y = this.heatmap[i][1]
			var z = this.heatmap[i][2]
			if(!rows[y]) {
				rows[y]=[]
			}
			rows[y][x]=z
		}
		for(var j=0;j<this.equipos.length;j++) {
			var nombre = this.equipos[j].replace(/\t+/," ")
			if(rows[j]) {
				tab += sprintf("%-" + firstcolwidth +"s",nombre.substring(0,firstcolwidth)) + "" + rows[j].map(z=> sprintf("%"+colwidth+"s",z)).join("") + "\n"
			} else {
				tab += sprintf("%-" + firstcolwidth +"s",nombre.substring(0,firstcolwidth)) + "\n"
			}
		}
		return tab
	}

	toCSV(sep=";",firstcolwidth=30) {
		switch(this.timeInt) {
			case "mes":
				this.dates = this.dates.map(d=> d.replace(/^.+\-/,"").replace(/T.*$/,""))
				break;
			case "dia":
				this.dates = this.dates.map(d=> d.replace(/^.+T/,"").substring(0,5))
				break;
			case "anio":
				this.dates = this.dates.map(d=> d.replace(/^\d+\-/,"").replace(/\-.+$/,""))
				break;
			default:
				this.dates = this.dates.map(d=> d.substring(0,10))
		}

		var csv= "Fecha" + sep + this.dates.join(sep) + "\n"
		var rows=[]
		for(var i=0;i<this.heatmap.length;i++) {
			var x = this.heatmap[i][0]
			var y = this.heatmap[i][1]
			var z = this.heatmap[i][2]
			if(!rows[y]) {
				rows[y]=[]
			}
			rows[y][x]=z
		}
		for(var j=0;j<this.equipos.length;j++) {
			var nombre = this.equipos[j].replace(/\t+/," ")
			if(rows[j]) {
				csv += nombre.substring(0,firstcolwidth) + sep + rows[j].join(sep) + "\n"
			} else {
				csv += nombre.substring(0,firstcolwidth) + "\n"
			}
		}
		return csv
	}
}

internal.CRUD = class{
	constructor(pool) {
		if(! pool instanceof Pool) {
			console.error("pool incorrecto, debe ser instancia de Pool")
			throw "pool incorrecto, debe ser instancia de Pool"
			return
		}
		this.pool = pool
	}
			
	insertEquipos(equipos) {
		return new Promise( (resolve, reject) => {
			var eq=[]
			var sensores=[]
			var asociaciones=[]
			if(!equipos) {
				throw "Falta argumento equipos Equipo[]"
				return
			}
			const stmt = "INSERT INTO equipos \
			VALUES ($1,$2,st_setsrid(st_point($3,$4),4326),$5,$6) \
			ON CONFLICT (\"idEquipo\") \
			DO UPDATE SET descripcion=$2, \
						  geom=st_setsrid(st_point($3,$4),4326), \
						  \"NroSerie\"=$5, \
						  \"fechaAlta\"=$6 \
			RETURNING  \"idEquipo\", descripcion, st_y(geom) AS lng, st_x(geom) AS lat, \"NroSerie\", to_char(\"fechaAlta\", 'YYYY-MM-DD\"T\"HH24:MI:SS') AS \"fechaAlta\" "
			var insertlist = [] 
			if(Array.isArray(equipos)) {
				//~ console.log("Parsing array of equipos, length:" + equipos.length)
				for(var i =0; i< equipos.length; i++) {
					if(! equipos[i] instanceof internal.Equipo) {
						console.error("equipo " + i + " incorrecto, debe ser instancia de Equipo")
						throw "equipo " + i + " incorrecto, debe ser instancia de Equipo"
						return
					}
					if(equipos[i].sensores) {
						sensores = sensores.concat(equipos[i].sensores)
						for(var j=0;j<equipos[i].sensores.length;j++) {
							asociaciones.push({idEquipo:equipos[i].idEquipo,idSensor:equipos[i].sensores[j].idSensor})
						}
					}
					//~ console.log("pushing into insertlist: [equipos[i].idEquipo, equipos[i].descripcion,equipos[i].lng,equipos[i].lat,equipos[i].NroSerie, equipos[i].fechaAlta]")
					insertlist.push(this.pool.query(stmt,[equipos[i].idEquipo, equipos[i].descripcion,equipos[i].lng,equipos[i].lat,equipos[i].NroSerie, equipos[i].fechaAlta]))
				}
			} else {
				if(! equipos instanceof internal.Equipo) {
					console.error("equipo " + i + " incorrecto, debe ser instancia de Equipo")
					throw "equipo " + i + " incorrecto, debe ser instancia de Equipo"
					return
				} else {
					if(equipos.sensores) {
						sensores = sensores.concat(equipos.sensores)
						for(var j=0;j<equipos.sensores.length;j++) {
							asociaciones.push({idEquipo:equipos.idEquipo,idSensor:equipos.sensores[j].idSensor})
						}
					}
					//~ console.log("pushing into insertlist: [equipos.idEquipo, equipos.descripcion,equipos.lng,equipos.lat,equipos.NroSerie, equipos.fechaAlta]")
					insertlist.push(this.pool.query(stmt,[equipos.idEquipo, equipos.descripcion,equipos.lng,equipos.lat,equipos.NroSerie, equipos.fechaAlta]))
				}
			}
			Promise.all(insertlist)
			.then(result => {
				for(var j=0;j<result.length;j++) {
					if(result[j].rows) {
						for(var i=0; i<result[j].rows.length;i++) {
							const equipo = new internal.Equipo(result[j].rows[i].idEquipo,result[j].rows[i].descripcion,result[j].rows[i].lat,result[j].rows[i].lng,result[j].rows[i].NroSerie, result[j].rows[i].fechaAlta) 
							eq.push(equipo)
						}
					} else {
						console.log("No rows inserted in query "+j)
					}
				}
				// insert sensores
				if(sensores.length>0) {
					return this.insertSensores(sensores)
				} else {
					return []
				}
			})
			.then(sen=>{
				console.log(sen.length + " sensores guardados")
				// insert asociaciones
				if(asociaciones.length>0) {
					return this.insertAsociaciones(asociaciones)
				} else {
					return []
				}
			})
			.then(asoc=>{
				console.log(asoc.length + " asociaciones guardadas")
				resolve(eq)
			})
			.catch(e=>{
				console.error(e)
				reject(e)
			})
		})
	}
	
	readEquipos(idEquipo,orderBy,idGrupo) {
		return new Promise( (resolve, reject) => {
			// idEquipo int|int[]|string default null
			var filter = ""
			if(Array.isArray(idEquipo)) {
				for(var i=0; i<idEquipo.length;i++) {
					if(!parseInt(idEquipo[i])) {
						throw "idEquipo incorrecto"
						return
					}
					idEquipo[i] = parseInt(idEquipo[i])
				}
				filter = " AND equipos.\"idEquipo\" = ANY (ARRAY[" + idEquipo.join(",") + "])"
			} else if (parseInt(idEquipo)) {
				filter = " AND equipos.\"idEquipo\" = " + parseInt(idEquipo)
			} else if(idEquipo) {
				idEquipo = idEquipo.toString()
				if(idEquipo.match(/[';]/)) {
					throw "Invalid characters for string matching"
					return
				}
				filter = " AND lower(equipos.descripcion) ~ lower('" + idEquipo + "')" 
			}
			if(idGrupo) {
				if(!parseInt(idGrupo)) {
					reject("igGrupo incorrecto")
					return
				}
				filter += " AND equipos.\"idGrupo\"=" + parseInt(idGrupo)
			}
			var orderByClause = ""
			var validColumns = {
				idEquipo: "equipos.\"idEquipo\"",
				descripcion: "equipos.descripcion",
				lng: "st_x(geom)",
				lat: "st_y(geom)",
				NroSerie: "estaciones.\"NroSerie\"",
				fechaAlta: "estaciones.\"fechaAlta\""
			}
			if(orderBy) {
				if(validColumns[orderBy]) {
					orderByClause = "ORDER BY " + validColumns[orderBy]
				} else {
					console.log("invalid orderBy value")
				}
			}
			//~ console.log("filter")
			//~ console.log(filter)
			this.pool.query("SELECT equipos.\"idEquipo\", equipos.descripcion, st_x(geom) AS lng, st_y(geom) AS lat, \"NroSerie\", to_char(\"fechaAlta\", 'YYYY-MM-DD\"T\"HH24:MI:SS')  AS \"fechaAlta\" , json_agg(json_build_object('idSensor', sensores.\"idSensor\", 'nombre', sensores.\"nombre\", 'Icono', sensores.\"Icono\")) AS sensores, equipos.\"idGrupo\" \
			FROM equipos,sensores,\"sensoresPorEquipo\" \
			WHERE equipos.\"idEquipo\"=\"sensoresPorEquipo\".\"idEquipo\" \
			AND sensores.\"idSensor\"=\"sensoresPorEquipo\".\"idSensor\" " + filter + " \
			GROUP BY equipos.\"idEquipo\", equipos.descripcion, geom, \"NroSerie\", \"fechaAlta\" " + orderByClause)
			.then(res=>{
				var equipos=[]
				var promises=[]
				if(res.rows) {
					for(var i=0; i<res.rows.length;i++) {
						var sensores=[]
						if(res.rows[i].sensores) {
							//~ console.log(res.rows[i].sensores)
							sensores = res.rows[i].sensores.map(it=> {
								return new internal.Sensor(it.idSensor, it.nombre, it.Icono)
							})
						}
						const equipo = new internal.Equipo(res.rows[i].idEquipo,res.rows[i].descripcion,res.rows[i].lat,res.rows[i].lng,res.rows[i].NroSerie, res.rows[i].fechaAlta, sensores,res.rows[i].idGrupo) 
						equipos.push(equipo)
					}
				} else {
					console.log("No equipos found!")
				}
				resolve(equipos)
			})
			.catch(e=> {
				console.error("Query error")
				reject(e)
			})
		})
	}
	
	deleteEquipos(idEquipo,idGrupo) {
		return new Promise( (resolve, reject) => {
			// idEquipo int|int[]|string default null
			var filter = ""
			if(Array.isArray(idEquipo)) {
				for(var i=0; i<idEquipo.length;i++) {
					if(!parseInt(idEquipo[i])) {
						throw "idEquipo incorrecto"
						return
					}
					idEquipo[i] = parseInt(idEquipo[i])
				}
				filter = " AND equipos.\"idEquipo\" = ANY (ARRAY[" + idEquipo.join(",") + "])"
			} else if (parseInt(idEquipo)) {
				filter = " AND equipos.\"idEquipo\" = " + parseInt(idEquipo)
			} else if(idEquipo) {
				idEquipo = idEquipo.toString()
				if(idEquipo.match(/[';]/)) {
					throw "Invalid characters for string matching"
					return
				}
				filter = " AND lower(equipos.descripcion) ~ lower('" + idEquipo + "')" 
			}
			if(idGrupo) {
				if(!parseInt(idGrupo)) {
					reject("igGrupo incorrecto")
					return
				}
				filter += " AND equipos.\"idGrupo\"=" + parseInt(idGrupo)
			}
			console.log("filter")
			var stmt = "DELETE FROM historicos USING equipos WHERE historicos.\"idEquipo\"=equipos.\"idEquipo\" " + filter
			//~ console.log(stmt)
			this.pool.query(stmt)
			.then(()=>{ 
				var stmt = "DELETE FROM \"sensoresPorEquipo\" USING equipos WHERE \"sensoresPorEquipo\".\"idEquipo\"=equipos.\"idEquipo\" " + filter
				//~ console.log(stmt)
				return this.pool.query(stmt)
			})
			.then(()=>{
				var stmt = "DELETE FROM equipos WHERE 1=1 " + filter + " RETURNING \"idEquipo\", descripcion, st_y(geom) AS lng, st_x(geom) AS lat, \"NroSerie\", to_char(\"fechaAlta\", 'YYYY-MM-DD\"T\"HH24:MI:SS') AS \"fechaAlta\" "
				//~ console.log(stmt)
				return this.pool.query(stmt)
			})
			.then(res=>{
				var equipos=[]
				if(res.rows) {
					for(var i=0; i<res.rows.length;i++) {
						const equipo = new internal.Equipo(res.rows[i].idEquipo,res.rows[i].descripcion,res.rows[i].lat,res.rows[i].lng,res.rows[i].NroSerie, res.rows[i].fechaAlta) 
						equipos.push(equipo)
					}
				} else {
					console.log("No equipos found!")
				}
				resolve(equipos)
			})
			.catch(e=> {
				console.error("Query error")
				reject(e)
			})
		})
	}
	
	insertSensores(sensores) {
		return new Promise( (resolve, reject) => {
			if(!sensores) {
				throw "Falta argumento sensores Sensor[]"
				return
			}
			const stmt = "INSERT INTO sensores \
			VALUES ($1,$2,$3) \
			ON CONFLICT (\"idSensor\") \
			DO UPDATE SET nombre=$2, \
						  \"Icono\"=$3 \
			RETURNING  \"idSensor\", \"nombre\", \"Icono\""
			var insertlist = [] 
			if(Array.isArray(sensores)) {
				for(var i =0; i< sensores.length; i++) {
					if(! sensores[i] instanceof internal.Sensor) {
						console.error("sensor[" + i + "] incorrecto, debe ser instancia de Sensor")
						throw "sensor[" + i + "] incorrecto, debe ser instancia de Sensor"
						return
					}
					console.log(sensores[i].toString())
					insertlist.push(this.pool.query(stmt,[sensores[i].idSensor, sensores[i].nombre,sensores[i].Icono]))
				}
			} else {
				if(! sensores instanceof internal.Sensor) {
					console.error("Sensor incorrecto, debe ser instancia de Sensor")
					throw "Sensor incorrecto, debe ser instancia de Sensor"
					return
				} else {
					insertlist.push(this.pool.query(stmt,[sensores.idSensor, sensores.nombre, sensores.Icono]))
				}
			}
			Promise.all(insertlist)
			.then(result => {
				var sensores = []
				for(var j=0;j<result.length;j++) {
					if(result[j].rows) {
						for(var i=0; i<result[j].rows.length;i++) {
							const sensor = new internal.Sensor(result[j].rows[i].idSensor,result[j].rows[i].nombre,result[j].rows[i].Icono) 
							sensores.push(sensor)
						}
					} else {
						console.log("No rows inserted in query "+j)
					}
				}
				resolve(sensores)
			})
			.catch(e=>{
				console.error(e)
				reject(e)
			})
		})
	}
	
	readSensores(idSensor) {
		return new Promise( (resolve, reject) => {
			// idSensor int|int[]|string default null
			var filter = ""
			if(Array.isArray(idSensor)) {
				for(var i=0; i<idSensor.length;i++) {
					if(!parseInt(idSensor[i])) {
						throw "idSensor incorrecto"
						return
					}
					idSensor[i] = parseInt(idSensor[i])
				}
				filter = "WHERE \"idSensor\" = ANY (ARRAY[" + idSensor.join(",") + "])"
			} else if (parseInt(idSensor)) {
				filter = "WHERE \"idSensor\" = " + parseInt(idSensor)
			} else if (idSensor) {
				idSensor = idSensor.toString()
				if(idSensor.match(/[';]/)) {
					throw "Invalid characters for string matching"
					return
				}
				filter = "WHERE lower(nombre) ~ lower('" + idSensor + "')" 
			}
			//~ console.log("filter")
			//~ console.log(filter)
			this.pool.query("SELECT \"idSensor\", nombre, \"Icono\" FROM sensores " + filter)
			.then(res=>{
				var sensores=[]
				if(res.rows) {
					for(var i=0; i<res.rows.length;i++) {
						const sensor = new internal.Sensor(res.rows[i].idSensor,res.rows[i].nombre,res.rows[i].Icono) 
						sensores.push(sensor)
					}
				} else {
					console.log("No sensores found!")
				}
				resolve(sensores)
			})
			.catch(e=> {
				console.error("Query error")
				reject(e)
			})
		})
	}
	
	deleteSensores(idSensor) {
		return new Promise( (resolve, reject) => {
			// idSensor int|int[]|string default null
			var filter = ""
			if(Array.isArray(idSensor)) {
				for(var i=0; i<idSensor.length;i++) {
					if(!parseInt(idSensor[i])) {
						throw "idSensor incorrecto"
						return
					}
					idSensor[i] = parseInt(idSensor[i])
				}
				filter = " AND sensores.\"idSensor\" = ANY (ARRAY[" + idSensor.join(",") + "])"
			} else if (parseInt(idSensor)) {
				filter = " AND sensores.\"idSensor\" = " + parseInt(idSensor)
			} else {
				if(idSensor) {
					idSensor = idSensor.toString()
					if(idSensor.match(/[';]/)) {
						throw "Invalid characters for string matching"
						return
					}
					filter = " AND lower(sensores.nombre) ~ lower('" + idSensor + "')" 
				}
			}
			var stmt = "DELETE FROM historicos USING sensores WHERE historicos.\"idSensor\"=sensores.\"idSensor\" " + filter
			console.log(stmt)
			this.pool.query(stmt)
			.then(()=>{ 
				var stmt = "DELETE FROM \"sensoresPorEquipo\" USING sensores WHERE \"sensoresPorEquipo\".\"idSensor\"=sensores.\"idSensor\" " + filter
				console.log(stmt)
				return this.pool.query(stmt)
			})
			.then(()=>{
				var stmt = "DELETE FROM sensores WHERE 1=1 " + filter + " RETURNING \"idSensor\", nombre, \"Icono\" "
				return this.pool.query(stmt)
			})
			.then(res=>{
				var sensores=[]
				if(res.rows) {
					for(var i=0; i<res.rows.length;i++) {
						const sensor = new internal.Sensor(res.rows[i].idSensor,res.rows[i].nombre,res.rows[i].Icono) 
						sensores.push(sensor)
					}
				} else {
					console.log("No sensores found!")
				}
				resolve(sensores)
			})
			.catch(e=> {
				console.error("Query error")
				reject(e)
			})
		})
	}
	insertDatos(datos,update=false) {
		return new Promise( (resolve, reject) => {
			if(!datos) {
				throw "Falta argumento datos Dato[]"
				return
			}
			var insertlist = [] 
			if(Array.isArray(datos)) {
				for(var i =0; i< datos.length; i++) {
					if(! datos[i] instanceof internal.Dato) {
						console.error("datos[" + i + "] incorrecto, debe ser instancia de Dato")
						throw "datos[" + i + "] incorrecto, debe ser instancia de Dato"
						return
					}
					//~ insertlist.push(this.pool.query(stmt,[datos[i].idEquipo, datos[i].idSensor, datos[i].fecha,datos[i].valor]))
					insertlist.push( format(" (%L, %L, timezone('ART',%L), %L)", datos[i].idEquipo, datos[i].idSensor, datos[i].fecha,datos[i].valor))
				}
			} else {
				if(! datos instanceof internal.Dato) {
					console.error("datos incorrecto, debe ser instancia de Dato")
					throw "datos incorrecto, debe ser instancia de Dato"
					return
				} else {
					insertlist.push( format(" (%L, %L, timezone('ART',%L), %L)", datos.idEquipo, datos.idSensor, datos.fecha, datos.valor))
				}
			}
			if(insertlist.length<=0) {
				console.log("No data found to insert")
				resolve()
				return
			}
			var onconflictdo = (update) ? "UPDATE SET valor=excluded.valor" : "NOTHING"
			var stmt = "INSERT INTO historicos (\"idEquipo\",\"idSensor\",fecha, valor) \
			VALUES " + insertlist.join(",\n") + " \
			ON CONFLICT (\"idEquipo\",\"idSensor\",fecha) DO " + onconflictdo + " \
			RETURNING  \"idEquipo\", \"idSensor\", \"fecha\", \"valor\""
			fs.writeFile('/tmp/query.sql',stmt,err=>{
				if(err) {
					console.error(err)
				}
			})
			this.pool.query(stmt)
			.then(result => {
				if(result.rows) {
					for(var i=0; i<result.rows.length;i++) {
						const dato = new internal.Dato(result.rows[i].idEquipo, result.rows[i].idSensor,result.rows[i].fecha,result.rows[i].valor) 
						datos.push(dato)
					}
				} else {
					console.log("No rows inserted in query "+j)
				}
				resolve(datos)
			})
			.catch(e=>{
				console.error(e)
				reject(e)
			})
		})
	}
	
	readDatos(idEquipo,idSensor,fechaInicial, fechaFinal, orderBy) {
		return new Promise( (resolve, reject) => {
			// idSensor int|int[]|string default null
			var filter = "WHERE valor<>-999 "
			if(Array.isArray(idEquipo)) {
				for(var i=0; i<idEquipo.length;i++) {
					if(!parseInt(idEquipo[i])) {
						throw "idEquipo incorrecto"
						return
					}
					idEquipo[i] = parseInt(idEquipo[i])
				}
				filter += " AND \"idEquipo\" = ANY (ARRAY[" + idEquipo.join(",") + "])"
			} else if (parseInt(idEquipo)) {
				filter += " AND \"idEquipo\" = " + parseInt(idEquipo)
			} 
			if(Array.isArray(idSensor)) {
				for(var i=0; i<idSensor.length;i++) {
					if(!parseInt(idSensor[i])) {
						throw "idSensor incorrecto"
						return
					}
					idSensor[i] = parseInt(idSensor[i])
				}
				filter += " AND \"idSensor\" = ANY (ARRAY[" + idSensor.join(",") + "])"
			} else if (parseInt(idSensor)) {
				filter += " AND \"idSensor\" = " + parseInt(idSensor)
			} 
			if(fechaInicial) {
				var sd = dateparser(fechaInicial)
				filter += " AND fecha>='"+sd.toISOString().substring(0,18)+"'"
			}
			if(fechaFinal) {
				var ed = dateparser(fechaFinal)
				filter += " AND fecha<='"+ed.toISOString().substring(0,18)+"'"
			}
			var orderByClause = ""
			const validColumns = {
				idEquipo: "historicos.\"idEquipo\"",
				idSensor: "historicos.\"idSensor\"",
				fecha: "historicos.\"fecha\"",
				valor: "historicos.\"valor\""
			}
			if(orderBy) {
				if(validColumns[orderBy]) {
					orderByClause = "ORDER BY " + validColumns[orderBy]
				} else {
					console.log("invalid orderBy value")
				}
			}
			var stmt = "SELECT \"idEquipo\",\"idSensor\", fecha, valor FROM historicos " + filter + " " + orderByClause
			console.log(stmt)
			this.pool.query(stmt)
			.then(res=>{
				var datos=[]
				if(res.rows) {
					for(var i=0; i<res.rows.length;i++) {
						const dato = new internal.Dato(res.rows[i].idEquipo, res.rows[i].idSensor,res.rows[i].fecha,res.rows[i].valor) 
						datos.push(dato)
					}
				} else {
					console.log("No datos found!")
				}
				resolve(datos)
			})
			.catch(e=> {
				console.error("Query error")
				reject(e)
			})
		})
	}
	
	deleteDatos(idEquipo,idSensor,fechaInicial,fechaFinal) {
		return new Promise( (resolve, reject) => {
			var filter = "WHERE 1=1 "
			if(Array.isArray(idEquipo)) {
				for(var i=0; i<idEquipo.length;i++) {
					if(!parseInt(idEquipo[i])) {
						throw "idEquipo incorrecto"
						return
					}
					idEquipo[i] = parseInt(idEquipo[i])
				}
				filter += " AND \"idEquipo\" = ANY (ARRAY[" + idEquipo.join(",") + "])"
			} else if (parseInt(idSensor)) {
				filter += " AND \"idEquipo\" = " + parseInt(idEquipo)
			} 
			if(Array.isArray(idSensor)) {
				for(var i=0; i<idSensor.length;i++) {
					if(!parseInt(idSensor[i])) {
						throw "idSensor incorrecto"
						return
					}
					idSensor[i] = parseInt(idSensor[i])
				}
				filter += " AND \"idSensor\" = ANY (ARRAY[" + idSensor.join(",") + "])"
			} else if (parseInt(idSensor)) {
				filter += " AND \"idSensor\" = " + parseInt(idSensor)
			} 
			if(fechaInicial) {
				var sd = dateparser(fechaInicial)
				filter += " AND fecha>='"+sd.toISOString().substring(0,18)+"'"
			}
			if(fechaFinal) {
				var ed = dateparser(fechaFinal)
				filter += " AND fecha<='"+ed.toISOString().substring(0,18)+"'"
			}
			this.pool.query("DELETE FROM historicos " + filter + " RETURNING \"idEquipo\",\"idSensor\", fecha, valor ")
			.then(res=>{
				var datos=[]
				if(res.rows) {
					for(var i=0; i<res.rows.length;i++) {
						const dato = new internal.Dato(res.rows[i].idEquipo, res.rows[i].idSensor,res.rows[i].fecha,res.rows[i].valor) 
						datos.push(dato)
					}
				} else {
					console.log("No datos found!")
				}
				resolve(datos)
			})
			.catch(e=> {
				console.error("Query error")
				reject(e)
			})
		})
	}
	insertAsociacion(idEquipo,idSensor) {
		return new Promise ((resolve, reject) => {
			if(!idEquipo || !idSensor) {
				reject(new Error("Faltan argumentos"))
			}
			if(!parseInt(idEquipo) || !parseInt(idSensor)) {
				reject(new Error("Argumentos incorrectos"))
			}
			this.pool.query("INSERT INTO \"sensoresPorEquipo\" (\"idEquipo\",\"idSensor\") VALUES ($1,$2) ON CONFLICT (\"idEquipo\",\"idSensor\") DO NOTHING RETURNING \"idEquipo\",\"idSensor\"", [idEquipo, idSensor])
			.then(res=>{ 
				resolve(res.rows)
			})
			.catch(e=>{
				throw e
				reject(e)
			})
		})
	}
	insertAsociaciones(asociaciones) {
		return new Promise ((resolve, reject) => {
			if(! Array.isArray(asociaciones)) {
				reject(new Error("argumento debe ser un array"))
			}
			var promises=[]
			for(var i=0; i<asociaciones.length;i++) {
				if(!parseInt(asociaciones[i].idEquipo) || !parseInt(asociaciones[i].idSensor)) {
					reject(new Error("Argumentos incorrectos"))
				}
				promises.push(this.pool.query("INSERT INTO \"sensoresPorEquipo\" (\"idEquipo\",\"idSensor\") VALUES ($1,$2) ON CONFLICT (\"idEquipo\",\"idSensor\") DO NOTHING RETURNING \"idEquipo\",\"idSensor\"", [asociaciones[i].idEquipo, asociaciones[i].idSensor]))
			}
			Promise.all(promises)
			.then(res=>{
				var rows=[]
				for(i=0;i<res.length;i++) { 
				  rows.push(res[i].rows)
			    }
			    resolve(rows)
			})
			.catch(e=>{
				console.error(e)
				reject(e)
			})
		})
	}
	
	readAsociaciones(idEquipo,idSensor,idGrupo) {
		return new Promise( (resolve, reject) => {
			var filter = ""
			if(Array.isArray(idEquipo)) {
				for(var i=0; i<idEquipo.length;i++) {
					if(!parseInt(idEquipo[i])) {
						throw "idEquipo incorrecto"
						return
					}
					idEquipo[i] = parseInt(idEquipo[i])
				}
				filter += " AND equipos.\"idEquipo\" = ANY (ARRAY[" + idEquipo.join(",") + "])"
			} else if (parseInt(idEquipo)) {
				filter += " AND equipos.\"idEquipo\" = " + parseInt(idEquipo)
			} else if (idEquipo) {
				idEquipo = idEquipo.toString()
				if(idEquipo.match(/[';]/)) {
					throw "Invalid characters for string matching"
					return
				}
				filter += " AND lower(equipos.descripcion) ~ lower('" + idEquipo + "')" 
			}
			if(Array.isArray(idSensor)) {
				for(var i=0; i<idSensor.length;i++) {
					if(!parseInt(idSensor[i])) {
						throw "idSensor incorrecto"
						return
					}
					idSensor[i] = parseInt(idSensor[i])
				}
				filter += " AND sensores.\"idSensor\" = ANY (ARRAY[" + idSensor.join(",") + "])"
			} else if (parseInt(idSensor)) {
				filter += " AND sensores.\"idSensor\" = " + parseInt(idSensor)
			} else if (idSensor) {
				idSensor = idSensor.toString()
				if(idSensor.match(/[';]/)) {
					throw "Invalid characters for string matching"
					return
				}
				filter += " AND lower(sensores.nombre) ~ lower('" + idSensor + "')" 
			}
			if(idGrupo) {
				if(parseInt(idGrupo)) {
					filter += ' AND equipos."idGrupo"='+parseInt(idGrupo)
				}
			}
			var stmt = "SELECT equipos.\"idEquipo\", equipos.descripcion, sensores.\"idSensor\", sensores.nombre, equipos.\"idGrupo\" \
				FROM \"sensoresPorEquipo\",equipos, sensores \
				WHERE equipos.\"idEquipo\"=\"sensoresPorEquipo\".\"idEquipo\" \
				AND sensores.\"idSensor\"=\"sensoresPorEquipo\".\"idSensor\" " + filter
			//~ console.log(stmt)
			this.pool.query(stmt)
			.then(res=>{
				var asociaciones=[]
				if(res.rows) {
					for(var i=0; i<res.rows.length;i++) {
						const asociacion = new internal.Asociacion(res.rows[i].idEquipo, res.rows[i].idSensor, res.rows[i].idGrupo) 
						asociaciones.push(asociacion)
					}
				} else {
					console.log("No asociaciones found!")
				}
				resolve(asociaciones)
			})
			.catch(e=> {
				console.error("Query error")
				reject(e)
			})
		})
	}
	
	deleteAsociaciones(idEquipo, idSensor, ioGrupo) {
		return new Promise( (resolve, reject) => {
			var filter = ""
			if(Array.isArray(idEquipo)) {
				for(var i=0; i<idEquipo.length;i++) {
					if(!parseInt(idEquipo[i])) {
						throw "idEquipo incorrecto"
						return
					}
					idEquipo[i] = parseInt(idEquipo[i])
				}
				filter += " AND equipos.\"idEquipo\" = ANY (ARRAY[" + idEquipo.join(",") + "])"
			} else if (parseInt(idEquipo)) {
				filter += " AND equipos.\"idEquipo\" = " + parseInt(idEquipo)
			} else if (idEquipo) {
				idEquipo = idEquipo.toString()
				if(idEquipo.match(/[';]/)) {
					throw "Invalid characters for string matching"
					return
				}
				filter += " AND lower(equipos.descripcion) ~ lower('" + idEquipo + "')" 
			}
			if(Array.isArray(idSensor)) {
				for(var i=0; i<idSensor.length;i++) {
					if(!parseInt(idSensor[i])) {
						throw "idSensor incorrecto"
						return
					}
					idSensor[i] = parseInt(idSensor[i])
				}
				filter += " AND sensores.\"idSensor\" = ANY (ARRAY[" + idSensor.join(",") + "])"
			} else if (parseInt(idSensor)) {
				filter += " AND sensores.\"idSensor\" = " + parseInt(idSensor)
			} else if (idSensor) {
				idSensor = idSensor.toString()
				if(idSensor.match(/[';]/)) {
					throw "Invalid characters for string matching"
					return
				}
				filter += " AND lower(sensores.nombre) ~ lower('" + idSensor + "')" 
			}
			if(idGrupo) {
				if(parseInt(idGrupo)) {
					filter += " AND equipos.\"idGrupo\"=" + parseInt(idGrupo)
				}
			}
			this.pool.query("DELETE FROM  \"sensoresPorEquipo\"  \
				USING equipos,sensores \
				WHERE equipos.\"idEquipo\"=\"sensoresPorEquipo\".\"idEquipo\" \
				AND sensores.\"idSensor\"=\"sensoresPorEquipo\".\"idSensor\"   " + filter + " \
				RETURNING equipos.\"idEquipo\", equipos.descripcion, sensores.\"idSensor\", sensores.nombre ")
			.then(res=>{
				var asociaciones=[]
				if(res.rows) {
					for(var i=0; i<res.rows.length;i++) {
						const asociacion = new internal.Asociacion(res.rows[i].idEquipo, res.rows[i].idSensor) 
						asociaciones.push(asociacion)
					}
				} else {
					console.log("No asociaciones found!")
				}
				resolve(asociaciones)
			})
			.catch(e=> {
				console.error("Query error")
				reject(e)
			})
		})
	}
	formatArray(array,format="json") {
		if(format.toLowerCase() == 'txt') {
			var txtres = array.map(el=> {
				return el.toString()
			})
			return txtres.join("\n")
		} else if (format.toLowerCase() == 'csv') {
			var csvres = array.map(el=> {
				return el.toCSV()
			})
			return csvres.join("\n")
		} else {
			return array
		}
	}
	
	// HEATMAP FUNCTIONS
	
	readHeatmap(heatmap, use = 'id', format='json', sep=";") {
	//~ timestart = this.default_interval.start.toISOString(),timeend = this.default_interval.end.toISOString(),tabla,varId,procId,use_id,format = "json",sep = ";") {
		return new Promise( (resolve, reject) => {
			format = format.toLowerCase()
			sep = sep.substring(0,1)
			var stmt, args
			switch(heatmap.timeInt) {
				case "fechas":
					stmt = "SELECT heatmap($1,$2,$3,$4,$5)  AS heatmap"
					args = [heatmap.fechaDesde,heatmap.fechaHasta,heatmap.idGrupo,heatmap.idSensor,use]
					break
				case "mes":
					stmt = "SELECT heatmap_mes_fast($1,$2,$3,$4,$5) AS heatmap"
					args = [heatmap.fechaDesde,heatmap.fechaHasta,heatmap.idGrupo,heatmap.idSensor,use]
					break
				case "dia":
					stmt = "SELECT heatmap_day($1,$2,$3,$4,$5) AS heatmap"
					args = [heatmap.fechaDesde,heatmap.dt,heatmap.idGrupo,heatmap.idSensor,use]
					break
				case "anio":
					stmt = "SELECT heatmap_anio_fast($1,$2,$3,$4) AS heatmap"
					args = [heatmap.fechaDesde.getFullYear(),heatmap.idGrupo,heatmap.idSensor,use]
					break
				default:
					stmt = "SELECT heatmap($1,$2,$3,$4,$5)  AS heatmap"
					args = [heatmap.fechaDesde,heatmap.fechaHasta,heatmap.idGrupo,heatmap.idSensor,use]
			}
			this.pool.query(stmt,args)
			.then(result => {
				//~ console.log(JSON.stringify(result.rows))
				if(!result.rows[0].heatmap.heatmap) {
					console.log("Nada encontrado")
					if(format == 'fwc' || format == 'csv') {
						resolve("")
					} else {
						resolve({
							contentType: "application/json",
							body: null
						})
					}
					return
				}
				heatmap.heatmap = result.rows[0].heatmap.heatmap
				heatmap.equipos = result.rows[0].heatmap.equipos
				heatmap.dates =  result.rows[0].heatmap.dates
				if(format == 'fwc') {
					this.maketitle(heatmap)
					.then(title => {
						//~ console.log(title)
						heatmap.result = title + "\n\n" + heatmap.toFWC()
						//~ {
							//~ contentType: 'text/plain',
							//~ body: title + "\n\n" + heatmap.toFWC()
						//~ }
						//~ console.log("heatmap fwc set!")
						resolve(heatmap.result)
					})
					.catch(e=> {
						console.error(e)
						reject(e)
					})
				} else if(format == 'csv') {
					this.makeHeader(heatmap)
					.then(header=>{
						heatmap.result = header + "\n\n" + heatmap.toCSV(sep)
						//~ {
							//~ contentType: 'text/plain',
							//~ body: header + "\n\n" + heatmap.toCSV(sep)
						//~ }
						//~ console.log("heatmap csv set!")
						resolve(heatmap.result)
					})
					.catch(e=>{
						reject(e)
					})
				} else {
					heatmap.result = {
						contentType: "application/json",
						body: result.rows[0]
					}
					//~ console.log("heatmap json set!")
					resolve(heatmap.result)
				}
			})
			.catch( e=>{
				console.error(e)
				reject(e)
			})
		})
	}

	maketitle(heatmap) {
		return Promise.all([this.readGrupos(heatmap.idGrupo),this.readSensores(heatmap.idSensor)])
		.then(metadata => {
			//~ console.log(JSON.stringify(metadata,null,2))
			var red = (metadata[0][0]) ? metadata[0][0].descripcion + " (" + metadata[0][0].idGrupo + ")" : ""
			var variable = (metadata[1][0]) ? metadata[1][0].nombre + " (" + metadata[1][0].idSensor + ")" : ""
			var title
			if(heatmap.timeInt == 'mes') {
				title = "Cantidad de registros por día.\nRed: " + red + ".\nVariable: " + variable + ".\nMes: " + heatmap.date
			}else if(heatmap.timeInt=='anio') {
				title = "Cantidad de registros por mes.\nRed: " + red + ".\nVariable: " + variable + ".\nAño: " + heatmap.date
			} else if(heatmap.timeInt=='dia') {
				title = "Cantidad de registros por intervalo.\nRed: " + red + ".\nVariable: " + variable + ".\nDía: " + heatmap.date
			} else {
				title = "Cantidad de registros por día.\nRed: " + red + ".\nVariable: " + variable + ".\nInicio: " + heatmap.fechaDesde.toISOString().substring(0,10) + "\nFin: " + heatmap.fechaHasta.toISOString().substring(0,10)
			}
			heatmap.title = title
			return title
		})
	}
	
	readGrupos(idGrupo) {
		return new Promise( (resolve, reject) => {
			var filter = ""
			if(Array.isArray(idGrupo)) {
				for(var i=0; i<idGrupo.length;i++) {
					if(!parseInt(idGrupo[i])) {
						throw "idGrupo incorrecto"
						return
					}
					idGrupo[i] = parseInt(idGrupo[i])
				}
				filter = "WHERE \"idGrupo\" = ANY (ARRAY[" + idGrupo.join(",") + "])"
			} else if (parseInt(idGrupo)) {
				filter = "WHERE \"idGrupo\" = " + parseInt(idGrupo)
			} else if (idGrupo) {
				idGrupo = idGrupo.toString()
				if(idGrupo.match(/[';]/)) {
					throw "Invalid characters for string matching"
					return
				}
				filter = "WHERE lower(descripcion) ~ lower('" + idGrupo + "')" 
			}
			this.pool.query("SELECT \"idGrupo\", descripcion FROM grupos " + filter)
			.then(res=>{
				var grupos=[]
				if(res.rows) {
					for(var i=0; i<res.rows.length;i++) {
						var grupo = new internal.Grupo(res.rows[i].idGrupo,res.rows[i].descripcion) 
						grupos.push(grupo)
					}
				} else {
					console.log("No grupos found!")
				}
				resolve(grupos)
			})
			.catch(e=> {
				console.error("Query error")
				reject(e)
			})
		})
	}

	makeHeader(heatmap,dt='03:00') {
		return Promise.all([this.readGrupos(heatmap.idGrupo),this.readSensores(heatmap.idSensor)])
		.then(metadata => {
			var redNombre = (metadata[0][0]) ? metadata[0][0].descripcion  : ""
			var redId = (metadata[0][0]) ? metadata[0][0].idGrupo  : ""
			var variableNombre = (metadata[1][0]) ? metadata[1][0].nombre : ""
			var variableId = (metadata[1][0]) ? metadata[1][0].idSensor : ""
			var header = "nombreGrupo=" + redNombre + "\nidGrupo="+redId+"\nnombreSensor="+variableNombre+"\nidSensor="+variableId+"\n"
			if(heatmap.timeInt == 'mes') {
				header = header + "intervaloTemporal=diario\nfecha=" + heatmap.date + "\n"
			}else if(heatmap.timeInt == 'anio') {
				header = header + "intervaloTemporal=mensual\nfecha="+ heatmap.date + "\n"
			} else if(heatmap.timeInt == 'dia') {
				header = header + "intervaloTemporal="+dt+"\nfecha=" + heatmap.date + "\n"
			}
			return header
		})
	}
	
	updateCountMonth(asociacion, fechaDesde, fechaHasta) {
		return new Promise( (resolve, reject) => {
			this.pool.query("SELECT heatmap2row_by_month($1,$2,$3,$4)",[fechaDesde, fechaHasta, asociacion.idEquipo, asociacion.idSensor])
			.then(result=>{
				resolve(result.rows[0])
			})
			.catch(e=>{
				console.error(e)
				reject(e)
			})
		})
	}
	
	updateCountDay(asociacion, fechaDesde, fechaHasta) {
		return new Promise( (resolve, reject) => {
			this.pool.query("SELECT heatmap2row_by_day($1,$2,$3,$4)",[fechaDesde, fechaHasta, asociacion.idEquipo, asociacion.idSensor])
			.then(result=>{
				resolve(result.rows[0])
			})
			.catch(e=>{
				console.error(e)
				reject(e)
			})
		})
	}

	updateCount3h(asociacion, fechaDesde, fechaHasta) {
		return new Promise( (resolve, reject) => {
			this.pool.query("SELECT heatmap2row_by_3h($1,$2,$3,$4)",[fechaDesde, fechaHasta, asociacion.idEquipo, asociacion.idSensor])
			.then(result=>{
				resolve(result.rows[0])
			})
			.catch(e=>{
				console.error(e)
				reject(e)
			})
		})
	}


	updateCountAll(timeInt='all',fechaDesde,fechaHasta,idGrupo,idSensor) {
		return new Promise( (resolve, reject) => {
			this.readGrupos(idGrupo)
			.then(grupos=>{
				var results=[];
				(async ()=>{
					for(var i=0;i<grupos.length;i++) {
						const asociaciones = await this.readAsociaciones(null,idSensor,grupos[i].idGrupo)
						for(var j=0; j<asociaciones.length;j++) {
							console.log(asociaciones[j].toString())
							var count = 0
							switch(timeInt) {
								case "mes":
									count = await this.updateCountMonth(asociaciones[j], fechaDesde, fechaHasta, timeInt)
									results.push(count)
									break;
								case "dia":
									count = await this.updateCountDay(asociaciones[j], fechaDesde, fechaHasta, timeInt)
									results.push(count)
									break;
								case "3h":
									count = await this.updateCount3h(asociaciones[j], fechaDesde, fechaHasta, timeInt)
									results.push(count)
									break;
								default:
									count = await this.updateCountMonth(asociaciones[j], fechaDesde, fechaHasta, timeInt)
									results.push(count)
									count = await this.updateCountDay(asociaciones[j], fechaDesde, fechaHasta, timeInt)
									results.push(count)
									count = await this.updateCount3h(asociaciones[j], fechaDesde, fechaHasta, timeInt)
									results.push(count)
							}
						}
					}
					resolve(results)
				})();
			})
			.catch(e=>{
				reject(e)
			})
		})
	}

}


const dateparser = function(fecha) {
	if(fecha instanceof Date) {
		return fecha
	} else {
		var m = fecha.match(/\d\d\d\d\-\d\d\-\d\d\s\d\d\:\d\d/)
		if(m) {
			var s = m[0].split(" ")
			var d = s[0].split("/")
			var t = s[1].split(":")
			var date = new Date(
				parseInt(d[0]), 
				parseInt(d[1]-1), 
				parseInt(d[2]),
				parseInt(t[0]),
				parseInt(t[1])
			)
			return date - Date.prototype.getTimezoneOffset() * 60 * 1000
		} else {
			var m2 = new Date(fecha)
			if(m2 == 'Invalid Date') {
				throw "fecha incorrecta"
				return
			} else {
				m2.setTime(m2.getTime() + 3 * 3600 * 1000)
				return m2
			}
		}
	}
}	
	




module.exports = internal
 
    
// module.exports { AutenticarUsuario, RecuperarEquipos, GetSat2Equipos, GetSat2InstantaneosDeEquipo }
