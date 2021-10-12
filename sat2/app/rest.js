'use strict'

const request = require('request')
const express = require('express')
const app = express()
const fs = require('fs').promises
// const request = require('request-promise')
const exphbs = require('express-handlebars')
// var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
// const config = require('config')
app.use(express.static('public'));
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
const config = require('config')
const { Pool, Client } = require('pg')
const pool = new Pool(config.sat2_database)
const port = config.rest.port

const serveIndex = require('serve-index')

const Sat2 = require('./sat2')
const sat2 = new Sat2.sat2()    // Este es el cliente de la API REST
const CRUD = new Sat2.CRUD(pool)  // Este es la interfaz con la DB

const auth = require('./authentication.js')(app,config,new Pool(config.database))
const passport = auth.passport

app.get('/exit',auth.isAdmin,(req,res)=>{  // terminate Nodejs process
	res.status(200).send("Terminating Nodejs process")
	console.log("Exit order recieved from client")
	setTimeout(()=>{
		process.exit()
	},500)
})
app.get('/', (req,res)=> {
	res.send("sat2 running")
})
app.post('/sat2/GetEquipos',GetEquipos)
app.post('/sat2/AutenticarUsuario',AutenticarUsuario)
app.post('/sat2/GetInstantaneosDeEquipo',GetInstantaneosDeEquipo)
app.post('/sat2/GetHistoricosDeEquipoPorSensor',GetHistoricosDeEquipoPorSensor)
app.post('/sat2/GetHistoricosPorFechas',GetHistoricosPorFechas)
app.post('/sat2/GetMaximosYMinimos',GetMaximosYMinimos)
app.post('/sat2/ReadEquipos',ReadEquipos)
app.post('/sat2/DeleteEquipos',DeleteEquipos)
app.post('/sat2/ReadSensores',ReadSensores)
app.post('/sat2/DeleteSensores',DeleteSensores)
app.post('/sat2/ReadDatos',ReadDatos)
app.post('/sat2/DeleteDatos',DeleteDatos)
app.post('/sat2/ReadAsociaciones',ReadAsociaciones)
app.post('/sat2/DeleteAsociaciones',DeleteAsociaciones)
app.post('/sat2/ReadGrupos', ReadGrupos)
app.post('/sat2/ReadHeatmap',ReadHeatmap)
app.get('/sat2/seriescontrol',PlotHeatmap)
app.use('/sat2/reportes', express.static('public/reportes'), serveIndex('public/reportes', {'icons': true}))

function GetEquipos (req,res) {
	var description = 'Get equipos SAT2'
	const user = req.body.user
	const pass = req.body.pass
	//~ console.log(req.body)
	if(!user || !pass) {
		console.error("Falta user y/o pass")
		res.status(400).send("Falta user y/o pass")
		return
	}
	const save = req.body.save
	const download = req.body.download
	sat2.GetEquipos(user, pass)
	.then(result=> {
		//~ console.log(result)
		if(! Array.isArray(result)) {
			console.error("result no es un array!")
			res.status(400).send(result)
			return
		}
		console.log("Found "+result.length+" Equipos")
		var equipos=[]
		for(var i=0;i<result.length;i++) { 
			//~ console.log("["+i+"] idEquipo:"+result[i].idEquipo+", descripcion:"+result[i].descripcion+", lat:"+result[i].lat+", lng:"+result[i].lng+", NroSerie:"+result[i].NroSerie+", fechaAlta:"+result[i].fechaAlta)
			const equipo = new Sat2.Equipo(result[i].idEquipo,result[i].descripcion,-1*result[i].lat,-1*result[i].lng,result[i].NroSerie,result[i].fechaAlta,result[i].sensores)
			//~ console.log(equipo.toString())
			equipos.push(equipo)
		}
		if(save && equipos.length>0) {
			console.log("calling insert, n:" + equipos.length)
			CRUD.insertEquipos(equipos)
			.then(r=>{
				//~ console.log("Equipo guardado")
				r.map((equipo,i)=>{
					console.log(equipo.toString())
				})
				console.log(r.length + " equipos guardados")
				if(download) {
					res.send(equipos)
				} else {
					res.send(r.length + " equipos guardados")
				}
			})
			.catch(e=>{
				console.log("Error al intentar guardar Equipo")
				console.error(e)
				res.status(400).send("Error al intentar guardar Equipo")
			})
		} else if (download) {
			res.send(equipos)
		} else {
			res.send("Se descargaron " + equipos.length + " equipos, pero no se hizo nada")
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send("Error al intentar recuperar datos de Sat2")
	})
}

function AutenticarUsuario(req,res) {
	var description = 'Autenticar usuario de SAT2'
	const user = req.body.user
	const pass = req.body.pass
	if(!user || !pass) {
		console.error("Falta user y/o pass")
		res.status(400).send("Falta user y/o pass")
		return
	}	
	sat2.AutenticarUsuario(user,pass)
	.then(result=> {
		console.log(result)
		res.send(result)
	})
	.catch(e=> {
		console.log("Error de autenticación")
		console.error(e)
		res.status(400).send({message:"Error de autenticacion",error:e})
	})
}

function GetInstantaneosDeEquipo(req,res) {
	var description = 'SAT2: vizualizar los datos instantáneos de los equipos'
	const user = req.body.user
	const pass = req.body.pass
	const idEquipo = req.body.idEquipo
	if(!user || !pass || !idEquipo) {
		console.error("Falta user y/o pass y/o  idEquipo")
		res.status(400).send("Falta user y/o pass y/o  idEquipo")
		return
	}	
    sat2.GetInstantaneosDeEquipo(user, pass, idEquipo)
    .then(result=> {
		console.log(result)
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function GetHistoricosDeEquipoPorSensor(req,res) {
	var description = 'para hacer los graficos y las tablas con datos históricos'
	const user = req.body.user
	const pass = req.body.pass
	const idEquipo = req.body.idEquipo
	const idSensor = req.body.idSensor
	const fechaDesde = req.body.fechaDesde
	const fechaHasta = req.body.fechaHasta
	const save = req.body.save
	const download = req.body.download
	if(!user || !pass || !idEquipo || !idSensor || !fechaDesde || !fechaHasta) {
		console.error("Falta user y/o pass y/o  idEquipo, idSensor o fechaDesde o fechaHasta")
		res.status(400).send("Falta user y/o pass y/o  idEquipo, idSensor o fechaDesde o fechaHasta")
		return
	}		
	sat2.GetHistoricosDeEquipoPorSensor(user,pass,idEquipo,idSensor,fechaDesde,fechaHasta)
    .then(result=> {
		console.log(result)
		if(save && result.length>0) {
			CRUD.insertDatos(result)
			.then(r=>{
				//~ r.map((dato,i)=>{
					//~ console.log(dato.toString())
				//~ })
				console.log(r.length + " datos guardados")
				if(download) {
					res.send(r)
				} else {
					res.send(r.length + " datos guardados")
				}
			})
			.catch(e=>{
				console.log("Error al intentar guardar Datos")
				console.error(e)
				res.status(400).send({message:"Error al intentar guardar Datos",error:e})
			})
		} else if(download) {
			res.send(result)
		} else {
			res.send("Se encontraron " + result.length + " registros pero no se hizo nada")
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}


function GetHistoricosPorFechas(req,res) {
	var description = 'para recuperar los datos de todos los equipos y sensores entre las fechas especificadas, opcionalmente filtrando con idEquipo y idSensor'
	const user = req.body.user
	const pass = req.body.pass
	const idEquipo = req.body.idEquipo
	const idSensor = req.body.idSensor
	const fechaDesde = req.body.fechaDesde
	const fechaHasta = req.body.fechaHasta
	const save = req.body.save
	const download = req.body.download
	if(!user || !pass || !fechaDesde || !fechaHasta) {
		console.error("Falta user y/o pass y/o fechaDesde o fechaHasta")
		res.status(400).send("Falta user y/o pass y/o fechaDesde o fechaHasta")
		return
	}
	async function gethistoricos(asociaciones) {
		var inserted = []
		for(var i=0;i<asociaciones.length;i++) {
			console.log("Get equipo:" + asociaciones[i].idEquipo + ", sensor:" + asociaciones[i].idSensor)
			await sat2.GetHistoricosDeEquipoPorSensor(user,pass,asociaciones[i].idEquipo,asociaciones[i].idSensor,fechaDesde,fechaHasta)
			.then(historicos => {
				if(historicos) {
					inserted = inserted.concat(historicos)
					if(save) {
						CRUD.insertDatos(historicos)
					}
				}
			})
			.catch(e=>{
				console.error(e)
			})
		}
		console.log("gethistoricos: Done!")
		return inserted
	}  
	var datos=[]
	CRUD.readAsociaciones(idEquipo,idSensor)
	.then(asociaciones=>{
		var promises=[]
		//~ console.log(asociaciones)
		if(asociaciones.length>0) {
			gethistoricos(asociaciones)
			.then((inserted)=>{
				console.log("Saved " + inserted.length + " rows of data")
				if(download) {
					res.send(inserted)
				} else {
					res.send("Se obtuvieron " + inserted.length + " datos")
				}
			})
			.catch(e=> {
				console.log(e)
				res.status(400).send(e)
			})
		} else {
		   console.log("no asociaciones found")
		   res.status(400).send("no asociaciones found")
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function GetMaximosYMinimos(req,res) {
	var description = 'Acumulada is calculated instead of average (Promedio) for any rainfall data (Sensor name contains “Lluvia” or “Precipitacion”). All -999.9 values have been excluded from calculations. Sensors with no data for this period return “valoresSensor = [ ]”. “tipoDeConsulta” is for time period requested: 1 = Hoy, 2=Ayer, 3 = Mes actual, 4 = Mes anterior.'
	const user = req.body.user
	const pass = req.body.pass
	const idEquipo = req.body.idEquipo
	const tipoDeConsulta = req.body.tipoDeConsulta
	if(!user || !pass || !idEquipo || !tipoDeConsulta) {
		console.error("Falta user y/o pass y/o idEquipo y/o tipoDeConsulta")
		res.status(400).send("Falta user y/o pass y/o idEquipo y/o tipoDeConsulta")
		return
	}
	sat2.GetMaximosYMinimos(user,pass,idEquipo,tipoDeConsulta)
    .then(result=> {
		//~ console.log(body)
		console.log("periodo:"+result.periodo)
		if(result.Datos) {
			console.log("Found "+result.Datos.length+" sensores")
		}
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function ReadEquipos(req,res) {
	var description = 'Lee equipos de base de datos'
	var idEquipo = req.body.idEquipo
	const format = (req.body.format) ? req.body.format : "json"
	const orderBy = (req.body.orderBy) ? req.body.orderBy : "idEquipo"
	if(Array.isArray(idEquipo)) {
		if(idEquipo.length == 1) {
			idEquipo = idEquipo[0]
		} 
	} else if (parseInt(idEquipo)) {
		idEquipo = parseInt(idEquipo)
	} 
	CRUD.readEquipos(idEquipo,orderBy,req.body.idGrupo)
	.then(equipos=> {
		//~ equipos.map( (equipo,i) => {
			//~ console.log(equipo.toString())
		//~ })
		console.log("Se encontraron " + equipos.length + " equipos")
		res.send(CRUD.formatArray(equipos,format))
	})
	.catch(e=> {
		console.error(e)
		res.status(400).send(e)
	})
}

function DeleteEquipos(req,res) {
	var description = 'Elimina equipos de base de datos'
	var idEquipo = req.body.idEquipo
	var confirm = req.body.confirm
	if(Array.isArray(idEquipo)) {
		if(idEquipo.length == 1) {
			idEquipo = idEquipo[0]
		} 
	} else if (parseInt(idEquipo)) {
		idEquipo = parseInt(idEquipo)
	} 
	Promise.all([CRUD.readEquipos(idEquipo), CRUD.readAsociaciones(idEquipo,null), CRUD.readDatos(idEquipo,null)])
	.then(result=> {
		if(!confirm) {
			console.log("Se encontraron " + result[0].length + " equipos, " + result[1].length + " asociaciones y " + result[2].length + " datos. Se eliminarán si utiliza el parámetro confirm: true")
			res.send("Se encontraron " + result[0].length + " equipos, " + result[1].length + " asociaciones y " + result[2].length + " datos. Se eliminarán si utiliza el parámetro confirm: true")
			return
		}
		CRUD.deleteEquipos(idEquipo)
		.then(equipos=> {
			//~ res.map( (equipo,i) => {
				//~ console.log(equipo.toString())
			//~ })
			console.log("Se eliminaron " + equipos.length + " equipos")
			res.send("Se eliminaron " + equipos.length + " equipos")
		})
		.catch(e=> {
			console.error(e)
			res.status(400).send({message:"Error al intentar eliminar equipos",error:e})
		})
	})
	.catch(e=>{
		console.log(e)
		res.status(400).send({message:"Error al leer equipos",error:e})
	})
}

function ReadSensores(req,res) {
	var description = 'Lee sensores de base de datos'
	var idSensor = req.body.idSensor
	const format = (req.body.format) ? req.body.format : "json"
	if(Array.isArray(idSensor)) {
		if(idSensor.length == 1) {
			idSensor = idSensor[0]
		} 
	} else if (parseInt(idSensor)) {
		idSensor = parseInt(idSensor)
	}
	CRUD.readSensores(idSensor)
	.then(sensores=> {
		  //~ sensores.map( (sensor,i) => {
			  //~ console.log(sensor.toString())
		  //~ })
		console.log("Se encontraron " + sensores.length + " sensores")
		res.send(CRUD.formatArray(sensores,format))
	})
	.catch(e=> {
		console.error(e)
		res.status(400).send({message:"Error de lectura de la DB",error:e})
	})
}

function DeleteSensores(req,res) {
	var description = 'Elimina sensores de base de datos'
	var idSensor = req.body.idSensor
	const confirm = req.body.confirm
	if(Array.isArray(idSensor)) {
		if(idSensor.length == 1) {
			idSensor = idSensor[0]
		} 
	} else if (parseInt(idSensor)) {
		idSensor = parseInt(idSensor)
	}
	Promise.all([CRUD.readSensores(idSensor), CRUD.readAsociaciones(null,idSensor), CRUD.readDatos(null,idSensor)])
	.then(result=> {
		if(!confirm) {
			console.log("Se encontraron " + result[0].length + " sensores, " + result[1].length + " asociaciones y " + result[2].length + " datos. Se eliminarán si utiliza la opción confirm:true.")
			res.send("Se encontraron " + result[0].length + " sensores, " + result[1].length + " asociaciones y " + result[2].length + " datos. Se eliminarán si utiliza la opción confirm:true.")
			return
		}
		CRUD.deleteSensores(idSensor)
		.then(sensores=> {
			//~ sensores.map( (sensor,i) => {
				  //~ console.log(sensor.toString())
			//~ })
			console.log("Se eliminaron " + sensores.length + " sensores")
			res.send("Se eliminaron " + sensores.length + " sensores")
		})
		.catch(e=> {
			console.error(e)
			res.status(400).send({message:"Error al intentar eliminar sensores",error:e})
		})
	})
	.catch(e=>{
		  console.log(e)
		  res.status(400).send({message:"Error de lectura de la DB",error:e})
	})
}

function ReadDatos(req,res) {
	var description = 'Lee datos históricos de base de datos'
	const idEquipo = req.body.idEquipo
	const idSensor = req.body.idSensor
	const fechaDesde = req.body.fechaDesde
	const fechaHasta = req.body.fechaHasta
	const format = req.body.format
	const orderBy = req.body.orderBy
	CRUD.readDatos(idEquipo, idSensor, fechaDesde, fechaHasta, orderBy)
	.then(datos=> {
		//~ datos.map( (dato,i) => {
			//~ console.log(dato.toString())
		//~ })
		console.log("Se encontraron " + datos.length + " datos")
		res.send(CRUD.formatArray(datos,format))
	})
	.catch(e=> {
		console.error(e)
		res.status(400).send({message:"Error de lectura de la DB",error:e})
	})
}

function DeleteDatos(req,res) {
	var description = 'Elimina datos históricos de base de datos'
	const idEquipo = req.body.idEquipo
	const idSensor = req.body.idSensor
	const fechaDesde = req.body.fechaDesde
	const fechaHasta = req.body.fechaHasta
	const confirm = req.body.confirm
	CRUD.readDatos(idEquipo, idSensor, fechaDesde, fechaHasta)
	.then(datos=> {
		if(!confirm) {
			console.log("Se encontraron " + datos.length + " datos. Se eliminarán si utiliza el parámetro confirm:true")
			res.send("Se encontraron " + datos.length + " datos. Se eliminarán si utiliza el parámetro confirm:true")
			return
		}
		CRUD.deleteDatos(idEquipo, idSensor, fechaDesde, fechaHasta)
		.then(datos=> {
			//~ datos.map( (dato,i) => {
				//~ console.log(dato.toString())
			//~ })
			console.log("Se eliminaron " + datos.length + " datos")
			res.send("Se eliminaron " + datos.length + " datos")
		})
		.catch(e=> {
			console.error(e)
			res.status(400).send({message:"Error al intentar eliminar datos históricos",error:e})
		})
	})
	.catch(e=>{
		console.log(e)
		res.status(400).send({message:"Error de lectura de la DB",error:e})
	})
}

function ReadAsociaciones(req,res) {
	var description = 'Lee asociaciones de equipos con sensores'
	const idEquipo = req.body.idEquipo
	const idSensor = req.body.idSensor
	const format = req.body.format
	CRUD.readAsociaciones(idEquipo, idSensor,req.body.idGrupo)
	.then(asociaciones=> {
		  //~ asociaciones.map( (asoc,i) => {
			//~ console.log(asoc.toString())
		//~ })
		console.log("Se encontraron " + asociaciones.length + " asociaciones")
		res.send(CRUD.formatArray(asociaciones,format))
	})
	.catch(e=> {
		console.error(e)
		res.status(400).send({message:"Error de lectura de la DB",error:e})
	})
}

function DeleteAsociaciones(req,res) {
	var description = 'Elimina asociaciones de equipos con sensores'
	const idEquipo = req.body.idEquipo
	const idSensor = req.body.idSensor
	const confirm = req.body.confirm
	CRUD.readAsociaciones(idEquipo, idSensor)
	.then(result=> {
		if(!confirm) {
			console.log("Se encontraron " + result.length + " asociaciones. Se eliminarán si utiliza el parámetro confirm:true")
			res.send("Se encontraron " + result.length + " asociaciones. Se eliminarán si utiliza el parámetro confirm:true")
			return
		}
		CRUD.deleteAsociaciones(idEquipo, idSensor)
		.then(asociaciones=> {
			//~ asociaciones.map( (asoc,i) => {
				//~ console.log(asoc.toString())
			//~ })
			console.log("Se eliminaron " + asociaciones.length + " asociaciones")
			res.send("Se eliminaron " + asociaciones.length + " asociaciones")
		})
		.catch(e=> {
			console.error(e)
			res.status(400).send({message:"Error al intentar eliminar asociaciones",error:e})
		})
	})
	.catch(e=>{
		console.log(e)
		res.status(400).send({message:"Error de lectura de la DB",error:e})
	})
}

function ReadGrupos(req, res) {
	var description = "obtener listado de grupos"
	CRUD.readGrupos(req.body.idGrupo)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error("Error al intentar obtener readGrupos")
		res.status(400).send("Error al intentar obtener readGrupos")
	})
}
	


function ReadHeatmap(req, res) {
	var description = "Obtener heatmap del grupo y sensor indicados"
	if(!req.body.idGrupo || !req.body.idSensor) {
		console.error("Falta idGrupo o idSensor")
		res.status(400).send("Falta idGrupo o idSensor")
		return
	}
	const heatmap = new Sat2.Heatmap( req.body.timeInt, req.body.fechaDesde, req.body.fechaHasta, req.body.idGrupo, req.body.idSensor, req.body.dt)
	//~ console.log(heatmap)
	CRUD.readHeatmap(heatmap, req.body.use, req.body.format, req.body.sep)
	.then(result=> {
		//~ console.log(JSON.stringify(result,null,2))
		//~ console.log(heatmap)
		if(req.body.format == 'csv' || req.body.format == 'fwc') {
			res.setHeader('Content-Type','text/plain')
		}
		res.send(result)
		console.log("done!")
	})
	.catch(e=>{
		console.error({message:"readHeatmap error",error:e})
		res.status(400).send({message:"readHeatmap error",error:e})
	})
}
	
	
	
function PlotHeatmap(req,res) {
	res.render('main',{layout:'heatmap'})
}



app.listen(port, (err) => {
	if (err) {
		return console.log('Err',err)
	}
	console.log(`server listening on port ${port}`)
})



