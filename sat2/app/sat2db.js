'use strict'

const internal = {}
const { Pool, Client } = require('pg')

internal.Equipo = class{
	constructor(idEquipo, descripcion, lat, lng, NroSerie, fechaAlta, sensores){
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
    }
    toString(sep=",") {
		var sensores
		if(this.sensores) {
			if(this.sensores.length>0) {
				sensores = this.sensores.map(it=> "{" + it.toString() + "}").join(sep)
			}
		}
		return "idEquipo: " + this.idEquipo + sep + " descripcion: " + this.descripcion + sep + " lat: " + this.lat + sep + "lng: " + this.lng + sep + " NroSerie: " + this.NroSerie + sep + " fechaAlta: " + ((this.fechaAlta) ? this.fechaAlta.toISOString() : "null") + sep + " sensores: [" + ((sensores) ? sensores : "") + "]"
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
}

internal.Asociacion = class {
	constructor(idEquipo,idSensor) {
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
	}
	toString(sep=",") {
		return "idEquipo: " + this.idEquipo + sep + " idSensor: " + this.idSensor
	}
}

internal.Dato = class{
	constructor(idEquipo, idSensor, fecha, valor){
        //~ validtypes:(int, int, Date|string, float);
        if(!idEquipo || !idSensor || !fecha || !valor) {
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
		if(!parseFloat(valor)) {
			throw "valor incorrecto"
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
	
	readEquipos(idEquipo) {
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
			//~ console.log("filter")
			//~ console.log(filter)
			this.pool.query("SELECT equipos.\"idEquipo\", equipos.descripcion, st_y(geom) AS lng, st_x(geom) AS lat, \"NroSerie\", to_char(\"fechaAlta\", 'YYYY-MM-DD\"T\"HH24:MI:SS')  AS \"fechaAlta\" , json_agg(json_build_object('idSensor', sensores.\"idSensor\", 'nombre', sensores.\"nombre\", 'Icono', sensores.\"Icono\")) AS sensores \
			FROM equipos,sensores,\"sensoresPorEquipo\" \
			WHERE equipos.\"idEquipo\"=\"sensoresPorEquipo\".\"idEquipo\" \
			AND sensores.\"idSensor\"=\"sensoresPorEquipo\".\"idSensor\" " + filter + " \
			GROUP BY equipos.\"idEquipo\", equipos.descripcion, geom, \"NroSerie\", \"fechaAlta\" ")
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
						const equipo = new internal.Equipo(res.rows[i].idEquipo,res.rows[i].descripcion,res.rows[i].lat,res.rows[i].lng,res.rows[i].NroSerie, res.rows[i].fechaAlta, sensores) 
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
	
	deleteEquipos(idEquipo) {
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
				filter = "WHERE equipos.\"idEquipo\" = ANY (ARRAY[" + idEquipo.join(",") + "])"
			} else if (parseInt(idEquipo)) {
				filter = "WHERE equipos.\"idEquipo\" = " + parseInt(idEquipo)
			} else if(idEquipo) {
				idEquipo = idEquipo.toString()
				if(idEquipo.match(/[';]/)) {
					throw "Invalid characters for string matching"
					return
				}
				filter = "WHERE lower(equipos.descripcion) ~ lower('" + idEquipo + "')" 
			}
			console.log("filter")
			console.log(filter)
			this.pool.query("DELETE FROM historicos USING equipos WHERE historicos.\"idEquipo\"=equipos.\"idEquipo\" " + filter)
			.then(()=>{ 
				return this.pool.query("DELETE FROM \"sensoresPorEquipo\" USING equipos WHERE \"sensoresPorEquipo\".\"idEquipo\"=equipos.\"idEquipo\" " + filter)
			})
			.then(()=>{
				return this.pool.query("DELETE FROM equipos " + filter + " RETURNING \"idEquipo\", descripcion, st_y(geom) AS lng, st_x(geom) AS lat, \"NroSerie\", to_char(\"fechaAlta\", 'YYYY-MM-DD\"T\"HH24:MI:SS') AS \"fechaAlta\" ")
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
				filter = "WHERE sensores.\"idSensor\" = ANY (ARRAY[" + idSensor.join(",") + "])"
			} else if (parseInt(idSensor)) {
				filter = "WHERE sensores.\"idSensor\" = " + parseInt(idSensor)
			} else {
				if(idSensor) {
					idSensor = idSensor.toString()
					if(idSensor.match(/[';]/)) {
						throw "Invalid characters for string matching"
						return
					}
					filter = "WHERE lower(sensores.nombre) ~ lower('" + idSensor + "')" 
				}
			}
			console.log("filter")
			console.log(filter)
			this.pool.query("DELETE FROM historicos USING sensores WHERE historicos.\"idSensor\"=sensores.\"idSensor\" " + filter)
			.then(()=>{ 
				return this.pool.query("DELETE FROM \"sensoresPorEquipo\" USING sensores WHERE \"sensoresPorEquipo\".\"idSensor\"=sensores.\"idSensor\" " + filter)
			})
			.then(()=>{
				return this.pool.query("DELETE FROM sensores " + filter + " RETURNING \"idSensor\", nombre, \"Icono\" ")
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
	insertDatos(datos) {
		return new Promise( (resolve, reject) => {
			if(!datos) {
				throw "Falta argumento datos Dato[]"
				return
			}
			const stmt = "INSERT INTO historicos (\"idEquipo\",\"idSensor\",fecha, valor) \
			VALUES ($1,$2,$3,$4) \
			ON CONFLICT (\"idEquipo\",\"idSensor\",fecha) \
			DO UPDATE SET valor=$4 \
			RETURNING  \"idEquipo\", \"idSensor\", \"fecha\", \"valor\""
			var insertlist = [] 
			if(Array.isArray(datos)) {
				for(var i =0; i< datos.length; i++) {
					if(! datos[i] instanceof internal.Dato) {
						console.error("datos[" + i + "] incorrecto, debe ser instancia de Dato")
						throw "datos[" + i + "] incorrecto, debe ser instancia de Dato"
						return
					}
					insertlist.push(this.pool.query(stmt,[datos[i].idEquipo, datos[i].idSensor, datos[i].fecha,datos[i].valor]))
				}
			} else {
				if(! datos instanceof internal.Dato) {
					console.error("datos incorrecto, debe ser instancia de Dato")
					throw "datos incorrecto, debe ser instancia de Dato"
					return
				} else {
					insertlist.push(this.pool.query(stmt,[datos.idEquipo, datos.idSensor, datos.fecha, datos.valor]))
				}
			}
			Promise.all(insertlist)
			.then(result => {
				var datos = []
				for(var j=0;j<result.length;j++) {
					if(result[j].rows) {
						for(var i=0; i<result[j].rows.length;i++) {
							const dato = new internal.Dato(result[j].rows[i].idEquipo, result[j].rows[i].idSensor,result[j].rows[i].fecha,result[j].rows[i].valor) 
							datos.push(dato)
						}
					} else {
						console.log("No rows inserted in query "+j)
					}
				}
				resolve(datos)
			})
			.catch(e=>{
				console.error(e)
				reject(e)
			})
		})
	}
	
	readDatos(idEquipo,idSensor,fechaInicial, fechaFinal) {
		return new Promise( (resolve, reject) => {
			// idSensor int|int[]|string default null
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
			//~ console.log("filter")
			//~ console.log(filter)
			this.pool.query("SELECT \"idEquipo\",\"idSensor\", fecha, valor FROM historicos " + filter)
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
	
	readAsociaciones(idEquipo,idSensor) {
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
			this.pool.query("SELECT equipos.\"idEquipo\", equipos.descripcion, sensores.\"idSensor\", sensores.nombre \
				FROM \"sensoresPorEquipo\",equipos, sensores \
				WHERE equipos.\"idEquipo\"=\"sensoresPorEquipo\".\"idEquipo\" \
				AND sensores.\"idSensor\"=\"sensoresPorEquipo\".\"idSensor\" " + filter)
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
	
	deleteAsociaciones(idEquipo, idSensor) {
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
			return new Date(
				parseInt(d[0]), 
				parseInt(d[1]-1), 
				parseInt(d[2]),
				parseInt(t[0]),
				parseInt(t[1])
			)
		} else {
			var m2 = new Date(fecha)
			if(m2 == 'Invalid Date') {
				throw "fecha incorrecta"
				return
			} else {
				return m2
			}
		}
	}
}	
	


module.exports = internal
