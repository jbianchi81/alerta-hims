// index.js
'use strict'

const express = require('express')
const app = express()
const fs = require('fs').promises
const request = require('request-promise')
const exphbs = require('express-handlebars')
var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
const config = require('config')
app.use(express.static('public'));
const port = (config.has('options.port')) ? config.get('options.port') : 4001
const { Pool } = require('pg')
const pool = new Pool(config.get('database'))
var def_timestart =  new Date()
def_timestart.setTime(def_timestart.getTime() + config.get('options.def_interval_start') * 24 * 3600 * 1000)
var def_timeend =  new Date()
def_timeend.setTime(def_timeend.getTime() + config.get('options.def_interval_end') * 24 * 3600 * 1000)

const auth = require('../../appController/app/authentication.js')(app,config,pool)
const passport = auth.passport

const Heatmap = require("./heatmap")
const heatmap = new Heatmap.heatmap(pool)

app.get('/exit',auth.isAdmin,(req,res)=>{  // terminate Nodejs process
	res.status(200).send("Terminating Nodejs process")
	console.log("Exit order recieved from client")
	setTimeout(()=>{
		process.exit()
	},500)
})
app.get('/',renderpage)
// app.get('/registrosporred',renderdensidadobs)
// app.get('/estacionesporred',renderdensidadest)
app.get('/heatmap',makeheatmapbytabla)
app.get('/heatmapday',makeheatmapday)
app.get('/heatmapanio',makeheatmapanio)
//~ app.get('/mes',rendermes)
app.get('/tablas',gettablas)
app.get('/var',getvar)
app.get('/proc',getproc)
app.get('/unit',getunit)
app.get('/cal',getcal)

//~ app.get('/dia',renderdia)
//~ app.get('/anio',renderanio)
app.get('/updateanio',updateAnual)
app.get('/updatemes',updateMensual)
app.get('/updatedia',updateDiario)

app.get('/getalturas2mnemos',getalturas2mnemos)

function renderpage(req,res) {
	res.render('home')
}

// function renderpage(req,res) {
// 	res.render('densidadobs')
// }

// function renderpage(req,res) {
// 	res.render('densidadest')
// }

// densityVectors

app.get('/densidad/observaciones',getObsDensityVector)
app.get('/densidad/estaciones',getStationDensityVector)
app.get('/densidad/pronosticos',getPronoDensityVector)
//~ function rendermes(req,res) {
	//~ res.render('mes')
//~ }
//~ function renderdia(req,res) {
	//~ res.render('dia')
//~ }
//~ function renderanio(req,res) {
	//~ res.render('anio')
//~ }

function makeheatmapbytabla(req,res) {
	if(!req.query.tabla) {
		console.error("Falta id de tabla")
		res.status(400).send("Falta id de tabla")
		return
	}
	if(!req.query.varId) {
		console.error("Falta varId ")
		res.status(400).send("Falta varId")
		return
	}
	var timestart = (req.query.timestart) ? req.query.timestart : def_timestart.toISOString()
	var timeend = (req.query.timeend) ? req.query.timeend : def_timeend.toISOString()
	if(req.query.mes) {
		var st = new Date(req.query.mes)
		timestart = st.toISOString()
		var et = new Date(st.setMonth(st.getMonth()+1))
		et.setTime(et.getTime()-1000)
		timeend = et.toISOString()
	}
	console.log([timestart,timeend,req.query.tabla,req.query.varId,req.query.procId,req.query.use_id,req.query.format])
	var format = (req.query.format) ? req.query.format.toLowerCase() : "json"
	var sep = (req.query.sep) ? req.query.sep.substring(0,1) : ";"
	pool.connect()
	.then(client => {
		var  stmt = "SELECT heatmap($1,$2,$3,$4,$5,$6)" // (req.query.procId) ? "SELECT heatmap($1,$2,$3,$4,$5)" : "SELECT heatmap($1,$2,$3,$4)"
		var pars = [timestart,timeend,req.query.tabla,req.query.varId,req.query.procId,req.query.use_id] // (req.query.procId) ? [timestart,timeend,req.query.tabla,req.query.varId,req.query.procId] : [timestart,timeend,req.query.tabla,req.query.varId]
		client.query(stmt,pars)
		.then(result => {
			if(format == 'fwc') {
				maketitle(req.query)
				.then(title => {
					console.log(title)
					var timeInt
					if(req.query.mes) {
						timeInt = "mes"
					}
					res.setHeader('content-type', 'text/plain')
					res.send(title + "\n\n" + heatmap2fwc(result.rows[0].heatmap,timeInt))
					console.log("heatmap table sent!")
				})
				.catch(e=> {
					console.error(e)
					res.status(400).send({message:"Query error",error:e})
				})
			} else if(format == 'csv') {
				makeheader(req.query)
				.then(header=> {
					console.log(header)
					var timeInt
					if(req.query.mes) {
						timeInt = "mes"
					}
					res.setHeader('content-type', 'text/plain')
					res.send(header + "\n\n" + heatmap2csv(result.rows[0].heatmap,timeInt,sep))
					console.log("heatmap csv sent!")
				})
				.catch(e=> {
					console.error(e)
					res.status(400).send({message:"Query error",error:e})
				})
			} else {
				res.send(result.rows[0])
				console.log("heatmap sent!")
			}
			client.release(true)
			return
		})
		.catch( e=>{
			console.error(e)
			res.status(400).send({message:"Query error",error:e})
			client.release(true)
		})
	})
	.catch( e=>{
		console.error(e)
		res.status(400).send({message:"DB error",error:e})
	})
}

function makeheatmapday(req,res) {
	if(!req.query.tabla) {
		console.error("Falta id de tabla")
		res.status(400).send("Falta id de tabla")
		return
	}
	if(!req.query.varId) {
		console.error("Falta varId ")
		res.status(400).send("Falta varId")
		return
	}
	var date = (req.query.date) ? req.query.date : new Date().toISOString().substring(0,10)
	var dt = (req.query.dt) ? req.query.dt : "03:00:00"
	console.log([date,dt,req.query.tabla,req.query.varId,req.query.procId,req.query.use_id,req.query.format])
	var format = (req.query.format) ? req.query.format.toLowerCase() : "json"
	var sep = (req.query.sep) ? req.query.sep.substring(0,1) : ";"
	pool.connect()
	.then(client => {
		var  stmt = "SELECT heatmap_day($1::date,$2::interval,$3,$4,$5,$6) as heatmap" // (req.query.procId) ? "SELECT heatmap_day($1::date,$2::interval,$3,$4,$5) as heatmap" : "SELECT heatmap_day($1::date,$2::interval,$3,$4) as heatmap"
		var pars = [date,dt,req.query.tabla,req.query.varId,req.query.procId,req.query.use_id] // (req.query.procId) ? [date,dt,req.query.tabla,req.query.varId,req.query.procId] : [date,dt,req.query.tabla,req.query.varId]
		client.query(stmt,pars)
		.then(result => {
			if(format == 'fwc') {
				maketitle(req.query)
				.then(title => {
					console.log(title)
					res.setHeader('content-type', 'text/plain')
					res.send(title + "\n\n" + heatmap2fwc(result.rows[0].heatmap,"dia"))
					console.log("heatmap table sent!")
				})
				.catch(e=> {
					console.error(e)
					res.status(400).send({message:"Query error",error:e})
				})
			} else if(format == 'csv') {
				makeheader(req.query)
				.then(header=> {
					console.log(header)
					res.setHeader('content-type', 'text/plain')
					res.send(header + "\n\n" + heatmap2csv(result.rows[0].heatmap,"dia",sep))
					console.log("heatmap csv sent!")
				})
				.catch(e=> {
					console.error(e)
					res.status(400).send({message:"Query error",error:e})
				})
			} else {
				res.send(result.rows[0])
				console.log("heatmap sent!")
			}
			client.release(true)
			return
		})
		.catch( e=>{
			console.error(e)
			res.status(400).send({message:"Query error",error:e})
			client.release(true)
		})
	})
	.catch( e=>{
		console.error(e)
		res.status(400).send({message:"DB error",error:e})
	})
}

function makeheatmapanio(req,res) {
	if(!req.query.tabla) {
		console.error("Falta id de tabla")
		res.status(400).send("Falta id de tabla")
		return
	}
	if(!req.query.varId) {
		console.error("Falta varId ")
		res.status(400).send("Falta varId")
		return
	}
	var anio = (req.query.anio) ? parseInt(req.query.anio) : new Date().getYear()
	console.log([anio,req.query.tabla,req.query.varId,req.query.procId,req.query.use_id,req.query.format])
	var format = (req.query.format) ? req.query.format.toLowerCase() : "json"
	var sep = (req.query.sep) ? req.query.sep.substring(0,1) : ";"
	pool.connect()
	.then(client => {
		var  stmt = "SELECT heatmap_anio($1::int,$2::text,$3::int,$4::int,$5) as heatmap" // (req.query.procId) ? "SELECT heatmap_anio($1::int,$2::text,$3::int,$4::int) as heatmap" : "SELECT heatmap_anio($1::int,$2::text,$3::int) as heatmap"
		var pars = [anio,req.query.tabla,req.query.varId,req.query.procId,req.query.use_id] // (req.query.procId) ? [anio,req.query.tabla,req.query.varId,req.query.procId] : [anio,req.query.tabla,req.query.varId]
		client.query(stmt,pars)
		.then(result => {
			if(format == 'fwc') {
				maketitle(req.query)
				.then(title => {
					console.log(title)
					res.setHeader('content-type', 'text/plain')
					res.send(title + "\n\n" + heatmap2fwc(result.rows[0].heatmap,"anio"))
					console.log("heatmap table sent!")
				})
				.catch(e=> {
					console.error(e)
					res.status(400).send({message:"Query error",error:e})
				})
			} else if(format == 'csv') {
				makeheader(req.query)
				.then(header=> {
					console.log(header)
					res.setHeader('content-type', 'text/plain')
					res.send(header + "\n\n" + heatmap2csv(result.rows[0].heatmap,"anio",sep))
					console.log("heatmap csv sent!")
				})
				.catch(e=> {
					console.error(e)
					res.status(400).send({message:"Query error",error:e})
				})
			} else {
				res.send(result.rows[0])
				console.log("heatmap sent!")
			}
			client.release(true)
			return
		})
		.catch( e=>{
			console.error(e)
			res.status(400).send({message:"Query error",error:e})
			client.release(true)
		})
	})
	.catch( e=>{
		console.error(e)
		res.status(400).send({message:"DB error",error:e})
	})
}

function gettablas(req,res) {
	gettablelist(req.query.tabla)
	.then(result=> {
		res.send(result.rows)
		console.log("redes sent")
	})
	.catch(e=> {
		console.error(e)
		res.status(500).send({message:"Query error",error:e})
	})
}

function gettablelist(tablaId) {
	return new Promise((resolve,reject) => {
		var stmt
		if(!tablaId) {
			// return all tables
			stmt="SELECT * from redes order by id"
		} else if (/^\d+$/.test(tablaId)) {
			//  tabla id numérico
			console.log("id numerico:"+tablaId)
			stmt = "SELECT * from redes where id=" + tablaId
		} else {
			//tabla_id varchar
			console.log("id varchar:"+tablaId)
			if(/[';\s]/.test(tablaId)) {
				console.error("parametro tabla posee caracteres no válidos")
				reject("Error: parametro tabla posee caracteres no válidos")
				return
			}
			stmt = "SELECT * from redes where tabla_id='" + tablaId + "'"
		}
		pool.query(stmt)
		.then(result=> {
			resolve(result)
		})
		.catch(e=>{
			reject(e)
		})
	})
}


function getvar(req,res) {
	getvarlist(req.query.varId)
	.then(result=> {
		res.send(result.rows)
		console.log("var sent")
	})
	.catch(e=> {
		console.log(e)
		res.status(500).send({message:"Query error",error:e})
	})
}
	
function getvarlist(varId) {
	return new Promise((resolve,reject) => {
		var stmt
		if(!varId) {
			// return all vars
			stmt="SELECT * from var order by id"
		} else if (/^\d+$/.test(varId)) {
			//  varId numérico
			console.log("id numerico:"+varId)
			stmt = "SELECT * from var where id=" + varId
		} else {
			//varId varchar
			console.log("id varchar:"+varId)
			if(/[';\s]/.test(varId)) {
				console.error("parametro varId posee caracteres no válidos")
				reject("Error: parametro varId posee caracteres no válidos")
				return
			}
			stmt = "SELECT * from var where var='" + varId + "'"
		}
		resolve(pool.query(stmt))
		return
	})
}

function getproc(req,res) {
	getproclist(req.query.procId)
	.then(proclist=> {
		res.send(proclist)
		console.log("proclist sent")
	})
	.catch(e=> {
		console.log(e)
		res.status(500).send({message:"Query error",error:e})
	})
}

function getproclist(procId) {
	var stmt
	if(!procId) {
		// return all vars
		stmt="SELECT id,nombre from procedimiento order by id"
	} else if (/^\d+$/.test(procId)) {
		//  procId numérico
		console.log("id numerico:"+procId)
		stmt = "SELECT id,nombre from procedimiento where id=" + procId
	} else {
		//varId varchar
		console.log("invalid procId:"+procId)
		return Promise.reject("Error: parametro procId posee caracteres no válidos")
	}
	return pool.query(stmt)
	.then(result=>{
		return result.rows
	})
}

function getunit(req,res) {
	getunitlist(req.query.unitId)
	.then(list=> {
		res.send(list)
		console.log("unitlist sent")
	})
	.catch(e=> {
		console.log(e)
		res.status(500).send({message:"Query error",error:e})
	})
}

function getunitlist(id) {
	var stmt
	if(!id) {
		// return all vars
		stmt="SELECT id,nombre from unidades order by id"
	} else if (/^\d+$/.test(id)) {
		//  id numérico
		console.log("id numerico:"+id)
		stmt = "SELECT id,nombre from unidades where id=" + id
	} else {
		// id varchar
		console.log("invalid unitId:"+id)
		return Promise.reject("Error: parametro unitId posee caracteres no válidos")
	}
	return pool.query(stmt)
	.then(result=>{
		return result.rows
	})
}

function getcal(req,res) {
	getcallist(req.query.calId)
	.then(list=> {
		res.send(list)
		console.log("callist sent")
	})
	.catch(e=> {
		console.log(e)
		res.status(500).send({message:"Query error",error:e})
	})
}

function getcallist(id) {
	var stmt
	if(!id) {
		// return all vars
		stmt="SELECT id,nombre from calibrados WHERE activar=true order by id"
	} else if (/^\d+$/.test(id)) {
		//  id numérico
		console.log("id numerico:"+id)
		stmt = "SELECT id,nombre from calibrados where activar=true AND id=" + id
	} else {
		// id varchar
		console.log("invalid calId:"+id)
		return Promise.reject("Error: parametro calId posee caracteres no válidos")
	}
	return pool.query(stmt)
	.then(result=>{
		return result.rows
	})
}

function heatmap2fwc(heatmap,timeInt) {
	var colwidth=6
	switch(timeInt) {
		case "mes":
			heatmap.dates = heatmap.dates.map(d=> sprintf("%6s",d.replace(/^.+\-/,"").replace(/T.*$/,"")))
			break;
		case "dia":
			heatmap.dates = heatmap.dates.map(d=> sprintf("%6s",d.replace(/^.+T/,"").substring(0,5)))
			break;
		case "anio":
			heatmap.dates = heatmap.dates.map(d=> sprintf("%6s",d.replace(/^\d+\-/,"").replace(/\-.+$/,"")))
			break;
		default:
			colwidth=11
			heatmap.dates = heatmap.dates.map(d=> sprintf("%11s",d.substring(0,10)))
	}

	var tab= "Fecha:                " + heatmap.dates.join("") + "\n"
	var rows=[]
	for(var i=0;i<heatmap.heatmap.length;i++) {
		var x = heatmap.heatmap[i][0]
		var y = heatmap.heatmap[i][1]
		var z = heatmap.heatmap[i][2]
		if(!rows[y]) {
			rows[y]=[]
		}
		rows[y][x]=z
	}
	for(var j=0;j<heatmap.estaciones.length;j++) {
		tab += sprintf("%-22s",heatmap.estaciones[j].substring(0,22)) + "" + rows[j].map(z=> sprintf("%"+colwidth+"s",z)).join("") + "\n"
	}
	return tab
}

function heatmap2csv(heatmap,timeInt,sep=";") {
	switch(timeInt) {
		case "mes":
			heatmap.dates = heatmap.dates.map(d=> d.replace(/^.+\-/,"").replace(/T.*$/,""))
			break;
		case "dia":
			heatmap.dates = heatmap.dates.map(d=> d.replace(/^.+T/,"").substring(0,5))
			break;
		case "anio":
			heatmap.dates = heatmap.dates.map(d=> d.replace(/^\d+\-/,"").replace(/\-.+$/,""))
			break;
		default:
			heatmap.dates = heatmap.dates.map(d=> d.substring(0,10))
	}

	var csv= "Fecha" + sep + heatmap.dates.join(sep) + "\n"
	var rows=[]
	for(var i=0;i<heatmap.heatmap.length;i++) {
		var x = heatmap.heatmap[i][0]
		var y = heatmap.heatmap[i][1]
		var z = heatmap.heatmap[i][2]
		if(!rows[y]) {
			rows[y]=[]
		}
		rows[y][x]=z
	}
	for(var j=0;j<heatmap.estaciones.length;j++) {
		csv += heatmap.estaciones[j].substring(0,22) + sep + rows[j].join(sep) + "\n"
	}
	return csv
}
	
		
function maketitle(query) {
	return Promise.all([gettablelist(query.tabla),getvarlist(query.varId)])
	.then(metadata => {
		var red = (metadata[0].rows[0]) ? metadata[0].rows[0].nombre + " (" + metadata[0].rows[0].tabla_id + " [" + metadata[0].rows[0].id + "])" : ""
		var variable = (metadata[1].rows[0]) ? metadata[1].rows[0].nombre + " (" + metadata[1].rows[0]["var"] + " [" + metadata[1].rows[0].id + "])" : ""
		var title
		if(query.mes) {
			title = "Cantidad de registros por día.\nRed: " + red + ".\nVariable: " + variable + ".\nMes: " + query.mes
		}else if(query.anio) {
			title = "Cantidad de registros por mes.\nRed: " + red + ".\nVariable: " + variable + ".\nAño: " + query.anio
		} else if(query.date) {
			title = "Cantidad de registros por intervalo.\nRed: " + red + ".\nVariable: " + variable + ".\nDía: " + query.date
		} else {
			title = "Cantidad de registros por día.\nRed: " + red + ".\nVariable: " + variable + ".\nInicio: " + query.timestart + "\nFin: " + query.timeend
		}
		return title
	})
}

function makeheader(query) {
	return Promise.all([gettablelist(query.tabla),getvarlist(query.varId)])
	.then(metadata => {
		var redNombre = (metadata[0].rows[0]) ? metadata[0].rows[0].nombre  : ""
		var redTabla = (metadata[0].rows[0]) ? metadata[0].rows[0].tabla_id  : ""
		var redId =  (metadata[0].rows[0]) ? metadata[0].rows[0].id  : ""
		var variableNombre = (metadata[1].rows[0]) ? metadata[1].rows[0].nombre : ""
		var variableCode = (metadata[1].rows[0]) ? metadata[1].rows[0]["var"] : ""
		var variableId = (metadata[1].rows[0]) ? metadata[1].rows[0].id : ""
		var header = "redNombre=" + redNombre + "\nredTabla=" + redTabla + "\nredId="+redId+"\nvariableNombre="+variableNombre+"\nvariableCode="+variableCode+"\nvariableId="+variableId+"\n"
		if(query.mes) {
			header = header + "intervaloTemporal=diario\nfecha=" + query.mes + "\n"
		}else if(query.anio) {
			header = header + "intervaloTemporal=mensual\nfecha="+query.anio + "\n"
		} else if(query.date) {
			var intT = (query.dt) ? query.dt : "03:00"
			header = header + "intervaloTemporal="+intT+"\nfecha=" + query.date + "\n"
		}
		return header
	})
}

function updateAnual(req,res) {
	updrepcuantanual(req.query)
	.then(result=> {
		res.send(result)
	})
	.catch(e=>{
		res.status(400).send(e)
	})
}

function updateMensual(req,res) {
	updrepcuantmensual(req.query)
	.then(result=> {
		res.send(result)
	})
	.catch(e=>{
		console.log(e)
		res.status(400).send(e)
	})
}	

function updateDiario(req,res) {
	updrepcuantdiario(req.query)
	.then(result=> {
		res.send(result)
	})
	.catch(e=>{
		console.log(e)
		res.status(400).send(e)
	})
}	

function updrepcuantanual(query) {
	//~ var head="<!DOCTYPE HTML>\n<head>\n	<meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\">\n</head>\n"
	return new Promise( (resolve, reject) => {
		var tabla = "emas_sinarame"
		var varId= 27
		var location = "/home/alerta5/13-SYNOP/sinarame_rep/cuantitativo/anual/"
		var startdate = (query.startdate) ? new Date(query.startdate) : new Date()
		var enddate = (query.enddate) ? new Date(query.enddate) : new Date()
		startdate.setTime(startdate.getTime()+3*3600*1000)
		enddate.setTime(enddate.getTime()+3*3600*1000)
		var startyear = startdate.getFullYear()
		var endyear = enddate.getFullYear()
		var wpromises=[]
		for(var i=startyear;i<=endyear;i++) {
			var filename = location + "RepCuantAnual_" + i + ".txt"
			wpromises.push(makerepfile("http://localhost:4001/heatmapanio?tabla=" + tabla + "&varId=" + varId + "&anio=" + i + "&use_id=ext&format=fwc",filename))
			var filenamecsv = location + "RepCuantAnual_" + i + ".csv"
			wpromises.push(makerepfile("http://localhost:4001/heatmapanio?tabla=" + tabla + "&varId=" + varId + "&anio=" + i + "&use_id=ext_only&format=csv&sep=,",filenamecsv))
		}
		Promise.all(wpromises)
		.then(results=>{
			var count = results.length
			console.log(count + " archivos creados")
			resolve(results)
		}).catch(e=> {
			console.error(e)
			reject(e)
		})
	})
}

function updrepcuantmensual(query) {
	//~ var head="<!DOCTYPE HTML>\n<head>\n	<meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\">\n</head>\n"
	return new Promise( (resolve, reject) => {
		var tabla = "emas_sinarame"
		var varId= 27
		var location = "/home/alerta5/13-SYNOP/sinarame_rep/cuantitativo/mensual/"
		var startdate = (query.startdate) ? new Date(query.startdate) : new Date()
		var enddate = (query.enddate) ? new Date(query.enddate) : new Date()
		startdate.setTime(startdate.getTime()+3*3600*1000)
		enddate.setTime(enddate.getTime()+3*3600*1000)
		var date = startdate
		var wpromises=[]
		while(date <= enddate) {
			var year = date.getFullYear()
			var month = date.getMonth()+1
			var mes = sprintf("%04d-%02d",year,month)
			var filename = sprintf("%sRepCuantMensual_%04d%02d.txt", location, year, month)
			wpromises.push(makerepfile("http://localhost:4001/heatmap?tabla=" + tabla + "&varId=" + varId + "&mes=" + mes + "&use_id=ext&format=fwc",filename))
			var filenamecsv = sprintf("%sRepCuantMensual_%04d%02d.csv", location, year, month)
			wpromises.push(makerepfile("http://localhost:4001/heatmap?tabla=" + tabla + "&varId=" + varId + "&mes=" + mes + "&use_id=ext_only&format=csv&sep=,",filenamecsv))
			date.setMonth(date.getMonth()+1)
		}
		Promise.all(wpromises)
		.then(results=>{
			var count = results.length
			console.log(count + " archivos creados")
			resolve(results)
		}).catch(e=> {
			console.error(e)
			reject(e)
		})
	})
}

function updrepcuantdiario(query) {
	//~ var head="<!DOCTYPE HTML>\n<head>\n	<meta http-equiv=\"content-type\" content=\"text/html; charset=utf-8\">\n</head>\n"
	return new Promise( (resolve, reject) => {
		var tabla = "emas_sinarame"
		var varId= 27
		var location = "/home/alerta5/13-SYNOP/sinarame_rep/cuantitativo/diario/"
		var startdate = (query.startdate) ? new Date(query.startdate) : new Date()
		var enddate = (query.enddate) ? new Date(query.enddate) : new Date()
		startdate.setTime(startdate.getTime()+3*3600*1000)
		enddate.setTime(enddate.getTime()+3*3600*1000)
		var date = startdate
		var wpromises=[]
		while(date <= enddate) {
			var year = date.getFullYear()
			var month = date.getMonth()+1
			var day = date.getDate()
			var fecha = sprintf("%04d-%02d-%02d",year,month,day)
			var filename = sprintf("%sRepCuantDiario_%04d%02d%02d.txt", location, year, month, day)
			wpromises.push(makerepfile("http://localhost:4001/heatmapday?tabla=" + tabla + "&varId=" + varId + "&date=" + fecha + "&use_id=ext&format=fwc",filename))
			var filenamecsv = sprintf("%sRepCuantDiario_%04d%02d%02d.csv", location, year, month, day)
			wpromises.push(makerepfile("http://localhost:4001/heatmapday?tabla=" + tabla + "&varId=" + varId + "&date=" + fecha + "&use_id=ext_only&format=csv&sep=,",filenamecsv))
			date.setTime(date.getTime()+1000*3600*24)
		}
		Promise.all(wpromises)
		.then(results=>{
			var count = results.length
			console.log(count + " archivos creados")
			resolve(results)
		}).catch(e=> {
			console.error(e)
			reject(e)
		})
	})
}

function makerepfile(url,filename) {
	var body
	var filehandle
	return request(url)
	.then(response  => {
		body = response
		return fs.open(filename,'w')
	})
	.then(f => {
		//~ console.log(values[0])
		filehandle = f
		return fs.writeFile(filehandle,body,{encoding:'latin1'}) // , {encoding: 'ISO-8859-1'}
	})
	.then(values=> {
			console.log("Archivo guardado")
			filehandle.close()
			return filename
	})
	//~ .catch(e=> {
		//~ throw e
		//~ console.error(e)
	//~ })
}

function getalturas2mnemos(req,res) {
	getAlturas2Mnemos(pool,req.query.estacion_id,req.query.startdate,req.query.enddate)
	.then(result=>{
		console.log("got alturas 2 mnemos")
		res.setHeader('content-type', 'text/plain')
		var csv = arr2csv(result.rows)
		res.send(csv)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getAlturas2Mnemos(pool,estacion_id,startdate,enddate) {
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
		resolve(pool.query("SELECT series.estacion_id codigo_de_estacion,1 codigo_de_variable,to_char(observaciones.timestart,'DD/MM/YYYY') fecha,extract(hour from timestart) hora,extract(minute from timestart) minuto,valor FROM series,observaciones,valores_num where series.estacion_id=$1 AND series.var_id=2 and series.proc_id=1 AND series.id=observaciones.series_id and observaciones.id=valores_num.obs_id AND timestart>=$2 and timestart<=$3 order by timestart", [estacion_id,sd,ed]))
	})
}

function arr2csv(arr) {
	if(! Array.isArray(arr)) {
		throw "arr2csv: Array incorrecto" 
	}
	var lines = arr.map(line=> {
		console.log(line)
		return [line.codigo_de_estacion, line.codigo_de_variable, line.fecha, line.hora, line.minuto, line. valor].join(",")
	})
	return lines.join("\n")
}

// densityVectors

function getObsDensityVector(req,res) {
	var filter = {...req.query}
	delete filter.timestart
	delete filter.timeend
	delete filter.dt
	var options = {
		include_timestamps: (req.query.include_timestamps) ? true : false,
		format: (req.query.format) ? req.query.format : undefined
	}
	heatmap.obsDensityVector(req.query.timestart,req.query.timeend,req.query.dt,filter,options)
	.then(result=>{
		res.send(result)
	})
	.catch(err=>{
		console.error(err)
		res.status(400).send(err.toString())
	})
}

function getStationDensityVector(req,res) {
	var filter = {...req.query}
	delete filter.timestart
	delete filter.timeend
	delete filter.dt
	var options = {
		include_timestamps: (req.query.include_timestamps) ? true : false,
		format: (req.query.format) ? req.query.format : undefined
	}
	heatmap.stationDensityVector(req.query.timestart,req.query.timeend,req.query.dt,filter,options)
	.then(result=>{
		res.send(result)
	})
	.catch(err=>{
		console.error(err)
		res.status(400).send(err.toString())
	})
}

function getPronoDensityVector(req,res) {
	var filter = {...req.query}
	delete filter.timestart
	delete filter.timeend
	delete filter.dt
	var options = {
		include_timestamps: (req.query.include_timestamps) ? true : false,
		format: (req.query.format) ? req.query.format : undefined
	}
	heatmap.pronoDensityVector(req.query.timestart,req.query.timeend,req.query.dt,filter,options)
	.then(result=>{
		res.send(result)
	})
	.catch(err=>{
		console.error(err)
		res.status(400).send(err.toString())
	})
}

app.listen(port, (err) => {
	if (err) {
		return console.log('Err',err)
	}
	console.log(`server listening on port ${port}`)
})
