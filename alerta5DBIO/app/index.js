'use strict'

const request = require('request')
const program = require('commander')
const inquirer = require('inquirer')
const fs = require('fs')
var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf
const { Pool, Client } = require('pg')
var fsPromise =require("promise-fs")
const printMap = require("./printMap")

const config = require('config');
const pool = new Pool(config.database)

const CRUD = require('./CRUD')
const crud = new CRUD.CRUD(pool)
var accessors = require('./accessors')
var gfs = new accessors.gfs_smn(config.smn_ftp, '/tmp/gfs_local-copy.grb', 'data/gfs/gtiff')
const readline = require("readline");

//~ const gdal = require('gdal')

const { exec } = require('child_process');
//~ var ogr2ogr = require('ogr2ogr')


program
  .version('0.0.1')
  .description('observations database CRUD interface');

program
  .command('getRedes')
  .alias('r')
  .description('Get redes from observations database')
  .option('-n, --nombre <value>', 'nombre (regex string)')
  .option('-t, --tabla <value>', 'tabla ID (string)')
  .option('-p, --public <value>', 'is public (boolean)')
  .option('-h, --hisplata <value>', 'is public his-plata (boolean)')
  .option('-o, --output <value>', 'output to file')
  .option('-S, --string','print as one-line strings')
  .option('-P, --pretty','pretty-print JSON')
  .option('-C, --csv', 'print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .action(options => {
	crud.getRedes({nombre:options.nombre, tabla_id:options.tabla, public:options.public,public_his_plata:options.hisplata})
	.then(result=>{
		pool.end()
		console.log("Results: " + result.length)
		print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });
  
program
  .command('insertRed <tabla_id> <nombre> [descripcion] [public] [public_his_plata]')
  .description('insert / update red')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-S, --string','print as one-line strings')
  .option('-P, --pretty','pretty-print JSON')
  .option('-C, --csv', 'print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .action( (tabla_id, nombre, is_public, public_his_plata, options) => {
	crud.upsertRed(new CRUD.red({tabla_id:tabla_id, nombre:nombre, public: is_public, public_his_plata: public_his_plata}))
	.then(upserted=>{
		console.log("Upserted 1 red")
		print_output(options,upserted)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  })

program
  .command('insertRedes <input>')
  .description('Insert / update redes from json/csv file')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action( (input, options) => {
	fs.readFile(input, (err, data) => {
		if (err) throw err;
		var redes
		if(options.csv) {
			redes = data.toString().replace(/\n$/,"").split("\n")
		} else {
			redes = JSON.parse(data)
			if(!Array.isArray(redes)) {
				throw new Error("Archivo erróneo, debe ser JSON ARRAY")
			}
		}
		crud.upsertRedes(redes)
		.then(upserted=>{
			console.log("upserted " + upserted.length + " registros")
			print_output(options,upserted)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	})
  });


program
  .command('deleteRed <tabla_id>')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action( (tabla_id, options) => {
	crud.deleteRed(tabla_id)
	.then(deleted=>{
		if(!deleted) {
			console.log("No se encontró la red")
		} else {
			console.log("Deleted red.id:" + deleted.id + ", tabla_id:" + deleted.tabla_id)
		}
		print_output(options,deleted)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  })

program
  .command('insertEstaciones <input>')
  .description('Crea estaciones a partir de archivo JSON')
  .option('-C, --csv', 'output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action((input,options) => {
	fs.readFile(input, (err, data) => {
		if (err) throw err;
		var estaciones = JSON.parse(data)
		if(!Array.isArray(estaciones)) {
			throw new Error("Archivo erróneo, debe ser JSON ARRAY")
		}
		crud.upsertEstaciones(estaciones)
		.then(upserted=>{
			console.log("Results: " + upserted.length)
			print_output(options,upserted)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	})
  });

program
  .command('getEstaciones')
  .alias('e')
  .description('Get estaciones from observations database')
  .option('-n, --nombre <value>', 'nombre (regex string)')
  .option('-t, --tabla <value>', 'tabla ID (string)')
  .option('-p, --public <value>', 'is public (boolean)')
  .option('-h, --hisplata <value>', 'is public his-plata (boolean)')
  .option('-g, --geom <value>', 'intersecting geometry (geom string)')
  .option('-u, --unid <value>', 'unid unique identifier (integer)')
  .option('-e, --id_externo <value>', 'id_externo identifier (string)')
  .option('-i, --id <value>', 'id per tabla unique identifier (integer)')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action(options => {
	var filter = {}
	if(options.geom) {
		filter.geom = new CRUD.geometry("box",options.geom)
	}
	crud.getEstaciones({nombre:options.nombre, tabla_id:options.tabla, public:options.public,public_his_plata:options.hisplata, geom: filter.geom, unid: options.unid, id_externo:options.id_externo, id: options.id})
	.then(result=>{
		console.log("Results: " + result.length)
		print_output(options,result)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });
  
program
  .command('getEstacionByID <id>')
  .description('Get estación by ID (unid)')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action( (id, options) => {
	var filter = {}
	crud.getEstacion(id)
	.then(estacion=>{
		console.log("Results: " + estacion.nombre)
		print_output(options,estacion)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('insertAreas <input>')
  .description('Crea areas a partir de archivo JSON')
  .option('-C, --csv', 'output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action((input,options) => {
	fs.readFile(input, (err, data) => {
		if (err) throw err;
		var areas = JSON.parse(data)
		if(!Array.isArray(areas)) {
			throw new Error("Archivo erróneo, debe ser JSON ARRAY")
		}
		crud.upsertAreas(areas)
		.then(upserted=>{
			console.log("Results: " + upserted.length)
			print_output(options,upserted)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	})
  });

program
  .command('insertAreasFromOGR <input>')
  .description('Crea areas a partir de archivo OGR')
  //~ .format('-f, --format','input file format')
  .option('-i, --insert','insert into database')
  .option('-C, --csv', 'output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action((input,options) => {
	var ogr = ogr2ogr(input).format("geoJSON")
	ogr.exec(function (er, data) {
	  if (er) {
		  console.error(er)
		  pool.end()
		  return
	  }
	  var areas = JSON.parse(data.toString())
	  if(!areas.features) {
		  console.error("No features found")
		  pool.end()
		  return
	  }
	  if(areas.features.length ==0) {
		  console.error("No features found")
		  pool.end()
		  return
	  }
	  var promises = []
	  var areas_arr = []
	  for(var i=0;i<areas.features.length;i++) {
		  const feature = areas.features[i]
		  var geom = new CRUD.geometry(feature.geometry)
		  var args = feature.properties
		  args.geom = geom
		  const area = new CRUD.area(args)
		  areas_arr.push(area)
		  promises.push(area.getId(pool))
		  //~ console.log(area.toString())
	  }
	  Promise.all(promises)
	  .then(()=>{
		  //~ areas_arr.map(a=> console.log(a.id))
		  if(options.insert) {
			  return crud.upsertAreas(areas_arr)
			  .then(upserted=>{
				console.log("Results: " + upserted.length)
				return upserted
			  })
		  } else {
			  return areas_arr
		  }
	  })
	  .then(result=>{
		  print_output(options,result)
		  pool.end()
	  })
	  .catch(e=>{
		console.error(e)
		pool.end()
	  })
	})
  });

program
  .command('getAreas')
  .description('Get areas from observations database')
  .option('-n, --nombre <value>', 'nombre (regex string)')
  .option('-g, --geom <value>', 'intersecting geometry with area (geom string)')
  .option('-x, --exutorio <value>', 'intersecting geometry with exutorio (geom string)')
  .option('-i, --id <value>', 'id per tabla unique identifier (unid integer)')
  .option('-C, --csv', 'output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-G, --geojson','output as geoJSON')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action(options => {
	var filter = {}
	if(options.geom) {
		filter.geom = new CRUD.geometry("box",options.geom)
	}
	if(options.exutorio) {
		filter.exutorio = new CRUD.geometry("box",options.exutorio)
	}
	crud.getAreas({nombre:options.nombre, unid:options.id, geom: filter.geom, exutorio: filter.exutorio})
	.then(result=>{
		console.log("Results: " + result.length)
		print_output(options,result)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('getAreaByID <id>')
  .description('Get area by ID (unid)')
  .option('-C, --csv', 'output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-G, --geojson','output as geoJSON')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action( (id, options) => {
	var filter = {}
	crud.getArea(id)
	.then(estacion=>{
		if(!estacion) {
			console.log("Area no encontrada")
			pool.end()
			return
		}
		console.log("Results: " + estacion.nombre)
		print_output(options,estacion)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });


program
  .command('insertSeries <input>')
  .description('Crea Series a partir de archivo JSON o CSV')
  .option('-a --all','crea estacion, var, procedimiento, unidades y fuente')
  .option('-C, --csv', 'input/print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'print as one-line string')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action( (input, options) => {
	fs.readFile(input, function(err, data) {
		if (err) throw err;
		var series
		if(options.csv) {
			series = data.toString().replace(/\n$/,"").split("\n")
		} else {
			series = JSON.parse(data)
			if(!Array.isArray(series)) {
				throw new Error("Archivo erróneo, debe ser JSON ARRAY")
			}
		}
		crud.upsertSeries(series,options.all)
		.then(result=>{
			//~ console.log("Upserted: " + result.length + " series")
			print_output(options,result)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	})
  });



program
  .command('getSeries')
  .alias('S')
  .description('Get Series from observations database')
  .option('-t, --tipo <value>', 'puntual(default)|areal')
  .option('-e, --estacion_id <value>', 'estacion/area ID (int)')
  .option('-i, --id <value>', 'series_id (int)')
  .option('-v, --var_id <value>', 'variable id (int)')
  .option('-p, --proc_id <value>', 'procedimiento id (int)')
  .option('-u, --unit_id <value>', 'unidades id (int)')
  .option('-f, --fuentes_id <value>', 'fuentes id (int)')
  .option('-m, --timestart <value>','timestart (de observaciones, requiere timeend)')
  .option('-n, --timeend <value>','timeend  (de observaciones, requiere timestart)')
  .option('-s, --getStats', 'get serie stats')
  .option('-C, --csv', 'print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'print as one-line string')
  .option('-P, --pretty','pretty-print JSON')
  .option('-o, --output <value>','output file')
  .action(options => {
	var filter = {}
	var tipo = (options.tipo) ? (/^areal/.test(options.tipo.toLowerCase())) ? "areal" : (/^rast/.test(options.tipo.toLowerCase())) ? "rast" : "puntual" : "puntual"
	if(tipo == "areal") {
		filter = {id:options.id,area_id:options.estacion_id,var_id:options.var_id,proc_id:options.proc_id,unit_id:options.unit_id,fuentes_id:options.fuentes_id}
	} else if (tipo == "rast") {
		filter = {id:options.id,escena_id:options.estacion_id,var_id:options.var_id,proc_id:options.proc_id,unit_id:options.unit_id,fuentes_id:options.fuentes_id}
	} else {
		filter = {id:options.id,var_id:options.var_id,proc_id:options.proc_id,unit_id:options.unit_id,estacion_id:options.estacion_id}
	}
	if(options.timestart && options.timeend) {
		filter.timestart = new Date(options.timestart)
		filter.timeend = new Date(options.timeend)
	}
	var opts = (options.getStats) ? {getStats:true} : {}
	crud.getSeries(tipo, filter, opts)
	.then(result=>{
		console.log("Results: " + result.length)
		print_output(options,result)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('getSerieByID <tipo> <id>')
  .alias('s')
  .description('Get Serie by ID from observations database')
  .option('-s, --timestart <value>', 'timestart (ISO datetime)')
  .option('-e, --timeend <value>', 'timeend (ISO datetime)')
  .option('-T, --getStats', 'get serie stats')
  .option('-C, --csv', 'print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'print as one-line string')
  .option('-P, --pretty','pretty-print JSON')
  .option('-o, --output <value>', 'output filename')
  .action((tipo, id,options) => {
	var tipo = (/^areal/.test(tipo.toLowerCase())) ? "areal" : (/^rast/.test(tipo.toLowerCase())) ? "rast" : "puntual"
	crud.getSerie(tipo, parseInt(id),options.timestart,options.timeend,options)
	.then(serie=>{
		console.log("Got series tipo: " + serie.tipo + ", id:" + serie.id)
		print_output(options,serie)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('deleteSerie <tipo> <id>')
  .description('elimina serie y sus observaciones por tipo e id')
  .option('-C, --csv', 'print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'print as one-line string')
  .option('-P, --pretty','pretty-print JSON')
  .option('-o, --output <value>', 'output filename')
  .action( (tipo, series_id, options)=> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	return pool.query("\
		SELECT count(id) from observaciones_areal\
		WHERE series_id=$1", [series_id]
	).then(countobs=> {
		rl.question("La serie contiene " + countobs.rows[0].count + " observaciones. Desea eliminarlas (si)?", ok=>{
			if (/^[yYsStTvV1]/.test(ok)) {
				return crud.deleteObservaciones(tipo,{series_id:series_id})
				.then(deletedobs=>{
					return crud.deleteSerie(tipo,series_id)
					.then(deletedserie=>{
						deletedserie.observaciones = deletedobs
						print_output(options,deletedserie)
						pool.end
					})
				})
			} else {
				console.log("Abortando")
				pool.end()
			}
			rl.close()
		})
	}).catch(e=>{
		console.error(e)
		pool.end()
	})
  })
			
		

program
  .command('getObs <tipo> <series_id> <timestart> <timeend>')
  .alias('o')
  .description('Get Observaciones by tipo, series_id, timestart and timeend')
  .option('-C, --csv', 'print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'print as one-line string')
  .option('-P, --pretty','pretty-print JSON')
  .option('-o, --output <value>', 'output filename')
  .action( (tipo, series_id, timestart, timeend, options) => {
	var tipo = (/^areal/.test(tipo.toLowerCase())) ? "areal" : (/^rast/.test(tipo.toLowerCase())) ? "rast" : "puntual"
	crud.getObservaciones(tipo, {series_id:series_id, timestart:timestart, timeend:timeend})
	.then(observaciones=>{
		console.log("Got observaciones: " + observaciones.length + " records.")
		print_output(options,observaciones)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('deleteObs <tipo> <series_id> <timestart> <timeend>')
  .alias('d')
  .description('Delete Observaciones by tipo, series_id, timestart and timeend')
  .option('-C, --csv', 'print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'print as one-line string')
  .option('-P, --pretty','pretty-print JSON')
  .option('-o, --output <value>', 'output filename')
  .action( (tipo, series_id, timestart, timeend, options) => {
	var tipo = (/^areal/.test(tipo.toLowerCase())) ? "areal" : (/^rast/.test(tipo.toLowerCase())) ? "rast" : "puntual"
	crud.deleteObservaciones(tipo, {series_id:series_id, timestart:timestart, timeend:timeend})
	.then(observaciones=>{
		console.log("Deleted observaciones: " + observaciones.length + " records.")
		print_output(options,observaciones)
		var output = ""
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('insertObs <input>')
  .alias('I')
  .description('Insert obs from json file')
  .option('-s, --series_id <value>','series_id de series de destino (sobreescribe la que está en las observaciones')
  .option('-t, --tipo <value>','tipo de serie de destino (sobreescribe el que está en las observaciones')
  .option('-O, --observaciones','lee observaciones de propiedad observaciones')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .option('-q, --quiet', 'no imprime regisros en stdout')
  .action( (input, options) => {
	fs.readFile(input, function(err, data) {
		if (err) throw err;
		var observaciones
		//~ var opt_fields = ['id','descripcion','nombre','unit_id','timeupdate']
		if(options.csv) {
			observaciones = data.toString().replace(/\n$/,"").split("\n")
			observaciones = observaciones.map(o=>{
				var obs = new CRUD.observacion(o)			// instantiate object of class observacion
				//~ opt_fields.forEach(key=>{
					//~ if(obs[key]) {
						//~ if(obs[key] == "undefined") {
							//~ obs[key] = undefined
						//~ }
					//~ }
				//~ })
				return obs
			}).filter(o => !isNaN(o.valor))				// filter out nulls
		} else {
			if(options.observaciones) {
				var data = JSON.parse(data)
				observaciones = data.observaciones
			} else {
				observaciones = JSON.parse(data)
			}
			if(!Array.isArray(observaciones)) {
				throw new Error("Archivo erróneo, debe ser JSON ARRAY")
			}
		}
		if(options.series_id) {
			observaciones = observaciones.map(o => {
				o.series_id = options.series_id
				return o
			})
		}
		if(options.tipo) {
			observaciones = observaciones.map(o => {
				o.tipo = options.tipo
				return o
			})
		}
		//~ console.log(observaciones)
		//~ return 
		crud.upsertObservaciones(observaciones)
		.then(upserted=>{
			console.log("upserted " + upserted.length + " registros")
			print_output(options,upserted)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	})
  });

program
  .command('insertRastObs <input> <series_id> <timestart> <timeend>')
  .description('Insert raster observation from gdal file')
  //~ .option('-C, --csv', 'input/output as CSV')
  //~ .option('-S, --string', 'output as one-line strings')
  //~ .option('-o, --output <value>', 'output filename')
  //~ .option('-P, --pretty','pretty-print JSON')
  //~ .option('-q, --quiet', 'no imprime regisros en stdout')
  .action( (input, series_id, timestart, timeend, options) => {
	fs.readFile(input, 'hex', function(err, data) {
		if (err) throw err;
		
		crud.upsertObservacion(new CRUD.observacion({tipo: "rast", series_id:series_id, timestart: timestart, timeend: timeend, valor: "\\x" + data}))
		.then(upserted=>{
			console.log("upserted id " + upserted.id + ", timeupdate:" + upserted.timeupdate)
			//~ print_output(options,upserted)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	})
  });

program
  .command('getRastObs <series_id> <timestart> <timeend>')
  .description('Get Raster Observaciones as GDAL file by series_id, timestart and timeend')
  .option('-o, --output <value>', 'output filename prefix')
  .option('-s, --series_metadata', 'add series metadata to files')
  .option('-p, --print_color_map', 'Print grass Color Map (PNG)')
  //~ .option('-m, --multi', 'output as a multi-band raster file')
  .action( (series_id, timestart, timeend, options) => {
	crud.getSerie("rast",series_id,timestart,timeend)
	.then(serie=>{
		if(!serie) {
			console.error("No se encontró la serie")
			return
		}
		if(!serie.observaciones) {
			console.error("No se encontraron observaciones")
		}
		//~ crud.getObservaciones("rast", {series_id:series_id, timestart:timestart, timeend:timeend})
		//~ .then(observaciones=>{
		console.log("Got observaciones: " + serie.observaciones.length + " records.")
		for (var i = 0; i < serie.observaciones.length ; i++) {
			const obs = serie.observaciones[i]
			if(options.output) {
				print_rast(options,serie,obs)
				.then(res=>{
					console.log("rast printed")
				})
				.catch(e=>{
					console.error(e)
				})
				//~ const filename = sprintf("%s_%05d_%s_%s\.GTiff", options.output, obs.series_id, obs.timestart.toISOString().substring(0,10), obs.timeend.toISOString().substring(0,10))
				//~ fs.writeFile(filename, obs.valor, err => {
					//~ if (err) throw err;
					//~ exec('gdal_edit.py -mo "series_id=' + obs.series_id + '" -mo "timestart=' + obs.timestart.toISOString() + '" -mo "timeend=' + obs.timeend.toISOString() + '" ' + filename, (error, stdout, stderr) => {
						//~ if (error) {
						//~ console.error(`exec error: ${error}`);
						//~ return;
						//~ }
					//~ });
					//~ if(options.series_metadata) {
						//~ exec('gdal_edit.py -mo "var_id=' + serie["var"].id + '" -mo "var_nombre=' + serie["var"].nombre + '" -mo "unit_id=' + serie.unidades.id + '" -mo "unit_nombre=' + serie.unidades.nombre + '" -mo "proc_id=' + serie.procedimiento.id + '" -mo "proc_nombre=' + serie.procedimiento.nombre + '" -mo "fuente_id=' + serie.fuente.id + '" -mo "fuente_nombre=' + serie.fuente.nombre + '" ' + filename, (error, stdout, stderr) => {
							//~ if (error) {
							//~ console.error(`exec error: ${error}`);
							//~ return;
							//~ }
						//~ });
					//~ }
				//~ })
			} else {
				console.log(obs.valor)
			}
		}
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('rastExtract <series_id> <timestart> <timeend>')
  .description('Get Raster Agregado de Observaciones como GDAL file by series_id, timestart and timeend')
  .option('-o, --output <value>', 'output filename prefix')
  .option('-f, --funcion <value>', 'funcion de agregacion temporal (defaults to SUM')
  .option('-b, --bbox <value>', 'bounding box para subset')
  .option('-p, --pixel_height <value>', 'output pixel size (defaults to fuentes.def_pixel_height')
  .option('-p, --pixel_width <value>', 'output pixel size (defaults to fuentes.def_pixel_height')
  .option('-S, --srid <value>', 'output SRID (defaults to fuentes.def_srid)')
  .option('-F, --format <value>', 'output file format GTiff|PNG (default GTiff)')
  .option('-w, --width <value>', 'output image width (default 300)')
  .option('-h, --height <value>', 'output image height (default 300)')
  .option('-s, --series_metadata', 'add series metadata to files')
  .option('-c, --print_color_map','Imprime mapa rgb')
  //~ .option('-m, --multi', 'output as a multi-band raster file')
  .action( (series_id, timestart, timeend, options) => {
	if(options.bbox) {
		options.bbox = new CRUD.geometry("box",options.bbox)
	}
	crud.rastExtract(series_id,timestart,timeend,options)
	.then(serie=>{
		if(!serie) {
			console.error("No se encontró la serie")
			pool.end()
			return
		}
		if(!serie.observaciones) {
			console.error("No se encontraron observaciones")
			pool.end()
			return
		}
		//~ crud.getObservaciones("rast", {series_id:series_id, timestart:timestart, timeend:timeend})
		//~ .then(observaciones=>{
		console.log("Got observaciones: " + serie.observaciones.length + " records.")
		for (var i = 0; i < serie.observaciones.length ; i++) {
			if(options.output) {
				print_rast(options,serie,serie.observaciones[i])
			} else {
				console.log(obs.valor)
			}
		}
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('rastExtractByArea <series_id> <timestart> <timeend> <area>')
  .description('Get serie temporal agregada espacialmente de Observaciones by series_id, timestart, timeend y area (id or box)')
  .option('-f, --funcion <value>', 'funcion de agregacion espacial (defaults to mean)')
  .option('-i, --insert', 'intenta upsert en serie areal')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .option('-q, --quiet', 'no imprime regisros en stdout')
  .option('-O, --only_obs', 'imprime solo observaciones (no metadatos)')
  //~ .option('-m, --multi', 'output as a multi-band raster file')
  .action( (series_id, timestart, timeend, area, options) => {
	if(!options.insert) {
		area = (parseInt(area)) ? parseInt(area) : new CRUD.geometry("box",options.area)
		crud.rastExtractByArea(series_id,timestart,timeend,area,options) 
		.then(result=>{
			if(!result) {
				console.error("No se encontró la serie")
				pool.end()
				return
			}
			if(options.only_obs) {
				if(result.length==0)  {
					console.error("No se encontraron observaciones")
					pool.end()
					return
				} else {
					console.log("Got observaciones: " + result.length + " records.")
				}
			} else if(!serie.observaciones) {
				console.error("No se encontraron observaciones")
				pool.end()
				return
			} else {
				console.log("Got observaciones: " + result.observaciones.length + " records.")
			}
			print_output(options,result)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	} else {
		crud.rast2areal(series_id,timestart,timeend,area,options) 
		.then(observaciones=>{
			print_output(options,observaciones)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	}
  });

program
  .command('rastExtractByPoint <series_id> <timestart> <timeend>')
  .description('Get serie temporal agregada espacialmente de Observaciones by series_id, timestart, timeend y punto (estacion_id o lon,lat)')
  .option('-g, --geom <value>', 'point coordinates (lon,lat)')
  .option('-i, --estacion_id <value>', 'estacion_id (int, overrides geom)')
  .option('-f, --funcion <value>', 'funcion de agregacion espacial (defaults to nearest)')
  .option('-b, --buffer <value>', 'distancia de buffer (defaults to rast pixel width)')
  .option('-d, --max_distance <value>', 'máxima distancia búsqueda de vecino más próximo (defaults to rast pixel width)')
  //~ .option('-i, --insert', 'intenta upsert en serie areal')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .option('-q, --quiet', 'no imprime regisros en stdout')
  .action( (series_id, timestart, timeend, options) => {
	var point = (options.estacion_id) ? options.estacion_id : (options.geom) ? new CRUD.geometry("Point",options.geom.split(",")) : undefined
	if(!point) {
		console.error("Falta --geom o --estacion_id")
		return
	}
	console.log(point)
	crud.rastExtractByPoint(series_id,timestart,timeend,point,options) 
	.then(serie=>{
		if(!serie) {
			console.error("No se encontró la serie")
			pool.end()
			return
		}
		if(!serie.observaciones) {
			console.error("No se encontraron observaciones")
			pool.end()
			return
		}
		console.log("Got observaciones: " + serie.observaciones.length + " records.")
		print_output(options,serie)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('getRegularSeries <tipo> <series_id> <dt> <timestart> <timeend>')
  .description('Get serie temporal regular de Observaciones by tipo, series_id, dt, timestart, timeend')
  .option('-t, --t_offset <value>', 'time offset (interval)')
  .option('-a, --aggFunction <value>', 'aggregation function (acum, mean, sum, min, max, count, diff, nearest, defaults to mean para series no instantáneas y nearest para series instantáneas)')
  .option('-i, --inst', 'asume como serie de valores instantáneos')
  .option('-T, --timeSupport <value>', 'soporte temporal de la serie original (interval)')
  .option('-I, --insertSeriesId <value>', 'id de series de destino para inserción')
  .option('-p, --precision <value>', 'cantidad de decimales (int)')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .option('-q, --quiet', 'no imprime regisros en stdout')
  .action((tipo,series_id,dt,timestart,timeend,options) => {
	crud.getRegularSeries(tipo,series_id,dt,timestart,timeend,options) // options: t_offset,aggFunction,inst,timeSupport,precision
	.then(result=>{
		//~ console.log(JSON.stringify(result))
		print_output(options,result)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('runAsociaciones <source_tipo> <source_series_id> <timestart> <timeend>')
  .description('actualiza series regulares derivadas')
  .option('-d, --dt <value>', 'time interval (interval)')
  .option('-t, --t_offset <value>', 'time offset (interval)')
  .option('-a, --agg_func <value>', 'aggregation function (acum, mean, sum, min, max, count, diff, nearest, defaults to mean para series no instantáneas y nearest para series instantáneas)')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .option('-q, --quiet', 'no imprime regisros en stdout')
  .action((source_tipo,source_series_id,timestart,timeend,options) => {
	crud.runAsociaciones({source_tipo:source_tipo,source_series_id:source_series_id,timestart:timestart,timeend:timeend},options) // options: t_offset,dt,agg_func
	.then(result=>{
		//~ console.log(JSON.stringify(result))
		print_output(options,result)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

  

program
  .command('gfs2db')
  .description('Obtener modelo GFS de SMN, insertar en DB (series_rast, id=<series_id>), agregar a paso diario (series_rast, id=<series_id_diario>) y extraer arealmente (series_areal, series_id=<series_id_areal>')
  .option('-s, --series_id <value>','id de series_rast 3 horario',2)
  .option('-o, --output <value>','archivo de salida')
  .option('-d, --series_id_diario <value>','id de series_rast diario',3)
  .option('-A, --series_id_areal_3h <value>','id de series_areal 3horario','all')
  .option('-a, --series_id_areal <value>','id de series_areal diario','all')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .option('-q, --quiet', 'no imprime regisros en stdout')
  .option('-c, --print_color_map','Imprime mapas rgb 3horarios y diarios')
  .option('-t, --time <value>','analysis time (hour), default=6',6)
  .option('-D, --dont_download','No descargar')
  .action(options=>{
	  var promise
	  if(options.dont_download) {
		  promise = pool.query("WITH maxfd as (\
			SELECT max(timeupdate) timeupdate \
			FROM observaciones_rast \
			WHERE series_id=$1)\
		  SELECT maxfd.timeupdate, min(timestart), max(timeend)\
		  FROM observaciones_rast, maxfd \
		  WHERE series_id=$1\
		  AND observaciones_rast.timeupdate=maxfd.timeupdate\
		  GROUP BY maxfd.timeupdate",[options.series_id])
		  .then(result=>{
			  console.log(result.rows)
			  return crud.getObservaciones("rast",{series_id:options.series_id, timestart: result.rows[0].min.toISOString(), timeend: result.rows[0].max.toISOString()})
		  })
		  .catch(e=>{
			  console.error(e)
			  return {}
		  })
		} else {
			promise = gfs.gfs2db(crud,options.series_id,options.time)
		}
		promise.then(result=>{
			if(!result) {
				console.error("upsert/get error")
				throw new Error("upsert/get error")
			}
			if(result.length == 0) {
				console.error("upsert/get error")
				throw new Error("gfs2db: no forecasts found")
			}
			console.log("result:"+result.length + " rows found/upserted")
			if (options.print_color_map) {
				var timestart = result[0].timestart
				var timeend= result[0].timeend
				for(var i=0;i<result.length;i++) {
					if(result[i].timestart<timestart) {
						timestart = result[i].timestart
					}
					if(result[i].timeend>timeend) {
						timeend = result[i].timeend
					}
				}
				crud.getSerie("rast",options.series_id,timestart.toISOString(),timeend.toISOString(),{format:"gtiff"})
				.then(serie=>{
					var promises=[]
					for(var i=0;i<serie.observaciones.length;i++) {
						var location = (config.gfs) ? (config.gfs["3h"]) ? config.gfs["3h"].location : config.rast.location : config.rast.location
						var filename = location + "/" + "gfs." + serie.observaciones[i].timeupdate.toISOString().replace(/[-T]/g,"").substring(0,10) + "." + serie.observaciones[i].timestart.toISOString().replace(/[-T]/g,"").substring(0,10) + ".3h.GTiff" 
						var parameters = {title:"Pronóstico GFS-SMN [mm/3h]",filename:filename} // {...options}
						parameters.print_color_map = (options.print_color_map) ? options.print_color_map : false
						//~ result[i].valor = '\\x' + result[i].valor
						promises.push(
							print_rast(parameters,serie,serie.observaciones[i])
						)
					}
					return Promise.all(promises)
				})
				.then(res=>{
					console.log("3h maps generados")
				})
				.catch(e=>{
					console.error(e)
				})
			}
			if(options.output) {
				fs.writeFile(options.output, JSON.stringify(result,null,2), err => {
					if (err) throw err;
					console.log("Output to file:"+options.output)
				})
				return result
			} else {
				return result
			}
		})
		.then(result=>{
			if(result.length == 0) {
				console.error("No se pudo obtener GFS")
				throw new Error("No se pudo obtener GFS")
			}
			var timestart = result[0].timestart
			var timeend = result[0].timeend
			var timeupdate = result[0].timeupdate
			for(var i =0;i<result.length;i++) {
				if(result[i].timestart<timestart) {
					timestart = result[i].timestart
				}
				if(result[i].timeend>timeend) {
					timeend = result[i].timeend
				}
				if(result[i].timeupdate<timeupdate) {
					timeupdate = result[i].timeupdate
				}
			}
			console.log({timestart:timestart,timeend:timeend})
			return crud.getRegularSeries("rast",options.series_id,"1 day",timestart,timeend,{insertSeriesId:options.series_id_diario,timeupdate:timeupdate,t_offset:{hours:12}})   // options: t_offset,aggFunction,inst,timeSupport,precision,min_time_fraction    ,t_offset:{"hours":9}
		})
		.then(result=>{
			var timestart = result[0].timestart
			var timeend = result[0].timeend
			for(var i =0;i<result.length;i++) {
				if(result[i].timestart<timestart) {
					timestart = result[i].timestart
				}
				if(result[i].timeend>timeend) {
					timeend = result[i].timeend
				}
			}
			crud.getSerie("rast",options.series_id_diario,timestart.toISOString(),timeend.toISOString(),{format:"gtiff"})
			.then(serie=>{
				var promises=[]
				for(var i=0;i<serie.observaciones.length;i++) {
					var location = (config.gfs) ? (config.gfs["diario"]) ? config.gfs["diario"].location : config.rast.location : config.rast.location
					var filename = location + "/" + "gfs." + serie.observaciones[i].timeupdate.toISOString().replace(/[-T]/g,"").substring(0,10) + "." + serie.observaciones[i].timestart.toISOString().replace(/[-T]/g,"").substring(0,10) + ".diario.GTiff" 
					var parameters = {title:"Pronóstico GFS-SMN [mm/d]",filename:filename} // {...options}
					parameters.print_color_map = (options.print_color_map) ? options.print_color_map : false
					//~ result[i].valor = '\\x' + result[i].valor
					promises.push(
						print_rast(parameters,serie,serie.observaciones[i])
					)
				}
				console.log({series_id_diario:options.series_id_diario,timestart:timestart,timeend:timeend}) // timestart:timestart.toISOString(),timeend:timeend.toISOString()})
				promises.push(
					crud.rastExtract(options.series_id_diario,timestart,timeend,{format:"GTiff", "function":"SUM"}) // timestart.toISOString(),timeend.toISOString(),{format:"GTiff", "function":"SUM"})
					.then(serie=>{
						if(!serie) {
							console.error("No se encontró la serie diaria")
							return
						}
						if(!serie.observaciones) {
							console.error("No se encontraron observaciones")
							return
						}
						console.log("Got observaciones: " + serie.observaciones.length + " records.")
						var location = (config.gfs) ? (config.gfs["suma"]) ? config.gfs["suma"].location : config.rast.location : config.rast.location
						var filename = location + "/" + "gfs." + serie.observaciones[0].timeupdate.toISOString().replace(/[-T]/g,"").substring(0,10) + "." + serie.observaciones[0].timestart.toISOString().replace(/[-T]/g,"").substring(0,10) + ".suma.GTiff" 
						return print_rast({print_color_map:true, filename:filename, title: "Pronóstico GFS-SMN [mm/6d]"},serie,serie.observaciones[0])
					})
				)
				return Promise.all(promises)
			})
			.then(res=>{
				console.log("Mapas diarios y suma generados")
			})
			.catch(e=>{
				console.error(e)
			})
			return Promise.all([
				crud.rast2areal(options.series_id, timestart, timeend, options.series_id_areal_3h,{}),
				crud.rast2areal(options.series_id_diario,timestart,timeend,options.series_id_areal,{})
			])
		})
		.then(result=>{
			console.log("Inserted " + result[1].length + " registros areales diarios")
			console.log("Inserted " + result[0].length + " registros areales 3horarios")
			print_output(options,result)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
  })
 
program
  .command('insertAccessor <type> <name>')
  .description('insertar Accessor a DB')
  .option('-s, --series_id <value>','id de series',2)
  .option('-p, --parameters <value>','parámetros del Accessor')
  .option('-q, --quiet', 'no imprime en stdout')
  .action((type, name, options)=>{
	  var parameters
	  if(options.parameters) {
		  try {
			  parameters = JSON.parse(options.parameters)
		  }
		  catch (e){
			  console.error("parametros incorrectos, debe ser JSON")
			  return
		  }
	  }
	  crud.upsertAccessor({type:type, name:name, parameters: parameters})
	  .then(result=>{
		  if(!options.quiet) {
			console.log(result)
		  }
	  })
	  .catch(e=>{
		  console.error(e)
	  })
  })
  
program
  .command('getParaguay09')
  .option('-s, --timstart <value>','start date (defaults to start of file)')
  .option('-e, --timeend <value>','end date (defaults to current date)')
  .option('-i, --insert','Upsert into db')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .option('-q, --quiet', 'no imprime regisros en stdout')
  .description("Scrap file Paraguay_09.xls")
  .action(options=>{
	  accessors.getParaguay09(options.timestart,options.timeend)
	  .then(data=>{
		  var observaciones  = data.map(d=> {
			  var obs = new CRUD.observacion(d)
			  //~ console.log(obs.toString())
			  return obs
		  })
		  print_output(options,observaciones)
		  if(options.insert) {
			return crud.upsertObservaciones(observaciones)
			.then(observaciones=>{
				console.log({upsertCount: observaciones.length})
				pool.end()
			})
			.catch(e=>{
				  console.error(e)
			})
		  }
	  })
	  .catch(e=>{
		  console.error(e)
	  })
  })

program
  .command('getPrefe <unid>')
  .option('-s, --timestart <value>','filter by timestart')
  .option('-e, --timeend <value>','filter by timeend')
  .description('bajar alturas web prefectura')
  .action((unid,options={})=>{
	  if(options.timestart) {
		  options.timestart = new Date(options.timestart)
	  }
	  if(options.timeend) {
		  options.timeend = new Date(options.timeend)
	  }
	  accessors.getPrefe(pool,unid,options.timestart,options.timeend)
	  .then(res=>{
		  //~ console.log(res)
		  crud.upsertObservaciones(res)
		  .then(inserted=>{
			  console.log("Se insertaron "+inserted.length+" observaciones de prefectura")
	  		  pool.end()
			  return
		  })
		  .catch(e=>{
			  console.error(e)
			  pool.end()
		  })
		  return
	  })
	  .catch(e=>{
		  console.error(e)
		  pool.end()
	  })
  })

  // RALEO (thin)
  program
  .command('thin')
  .alias('th')
  .description('thin observations by tipo, series_id, timestart, timeend')
  .option('-t, --tipo <value>', 'tabla ID (string)','puntual')
  .option('-i, --series_id <value>', 'series_id (int[,int,...])')
  .option('-s, --timestart <value>', 'timestart (date string)')
  .option('-e, --timeend <value>', 'timeend (date string)')
  .option('-v, --var_id <value>', 'var_id (int)')
  .option('-f, --fuentes_id <value>', 'fuentes_id (int)')
  .option('-p, --proc_id <value>', 'proc_id (int)')
  .option('-u, --unit_id <value>', 'unit_id (int)')
  .option('-n, --interval <value>', 'time interval (interval string)','1 hours')
  .option('-D, --delete_skipped','delete skipped observations (boolean)',false)
  .option('-S, --return_skipped','return skipped observations (boolean)',false)
  .option('-o, --output <value>','output to file (string)')
  .action(options => {
    //   console.log(JSON.stringify([options.tipo,options.series_id,options.timestart,options.timeend,options.interval,options.delete_skipped]))
    if(options.series_id && typeof options.series_id == "string") {
        if(options.series_id.indexOf(",") >= 0) {
            options.series_id = options.series_id.split(",").map(i=>parseInt(i))
        }
    }
    var filter = {series_id:options.series_id,timestart:options.timestart,timeend:options.timeend}
    if(options.proc_id) {
        filter.proc_id = options.proc_id
    }
    if(options.var_id) {
        filter.var_id = options.var_id
    }
    if(options.unit_id) {
        filter.unit_id = options.unit_id
    }
    if(options.fuentes_id) {
		if(options.tipo == "puntual") {
	        filter.red_id = options.fuentes_id
		} else {
			filter.fuentes_id = options.fuentes_id
		}
    }
    var opt = {
        interval: options.interval,
        deleteSkipped: options.delete_skipped,
        returnSkipped: options.return_skipped
    }
    crud.thinObs(options.tipo,filter,opt)
    .then(result=>{
        if(options.output) {
            fs.writeFile(options.output,JSON.stringify(result,null,2),(err)=>{
                if(err) {
                    console.error(err)
                } else {
                    console.log("wrote output:" + options.output)
                }
                return
            })
        } else {
            console.log(JSON.stringify(result,null,2))
            return
        }
    })
    .catch(e=>{
        console.error(e.toString())
        return
    })
  })

// aux functions

function print_output(options,data) {
	var output=""
	if(options.csvless || options.csv || options.string) {
		if(Array.isArray(data)) {
			for(var i=0; i < data.length; i++) {
				if(options.csvless) {
					output += data[i].toCSVless() + "\n"
				} else if(options.csv) {
					output += data[i].toCSV() + "\n"
				} else if (options.string) {
					output += data[i].toString() + "\n"
				}
			}
		} else {
			if(options.csvless) {
				output += data.toCSVless() + "\n"
			} else if(options.csv) {
				output += data.toCSV() + "\n"
			} else if (options.string) {
				output += data.toString() + "\n"
			}
		}
	} else if (options.pretty) {
		output = JSON.stringify(data,null,2)
	} else if (options.geojson) {
		if(Array.isArray(data)) {
			output = {
				type: "FeatureCollection",
				features: data.map(feature=>{
					var thisfeature = {
						type: "Feature",
						properties: {}
					}
					 if(feature.geom) {
						 if(feature.exutorio) {
							 thisfeature.geometry = {
								 type: "GeometryCollection",
								 geometries: [ feature.geom, feature.exutorio ]
							 }
						 } else {
							 thisfeature.geometry = feature.geom
						 }
					 }  
					Object.keys(feature).filter(k=> k != "geom" && k != "exutorio").map(k=> {
						thisfeature.properties[k] = feature[k]
					})
					return thisfeature
				})
			}
			output = JSON.stringify(output)
		} else {
			var output = {
				type: "Feature",
				properties: {}
			}
			 if(data.geom) {
				 if(data.exutorio) {
					 output.geometry = {
						 type: "GeometryCollection",
						 geometries: [ data.geom, data.exutorio ]
					 }
				 } else {
					 output.geometry = data.geom
				 }
			 }  
			Object.keys(data).filter(k=> k != "geom" && k != "exutorio").map(k=> {
				output.properties[k] = data[k]
			})
			output = JSON.stringify(output)
		}
	} else {
		output = JSON.stringify(data)
	}
	if(options.output) {
		fs.writeFileSync(options.output,output)
	} else {
		if(!options.quiet) {
			console.log(output)
		}
	}
}

program
  .command('insertModelos <input>')
  .description('Crea modelos a partir de archivo JSON')
  .option('-C, --csv', 'output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action((input,options) => {
	fs.readFile(input, (err, data) => {
		if (err) throw err;
		var modelos = JSON.parse(data)
		crud.upsertModelos(modelos)
		.then(upserted=>{
			console.log("Results: " + upserted.length)
			print_output(options,upserted)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	})
  });

program 
  .command('deleteModelos')
  .description('elimina modelos')
  .option('-i, --id <value>', 'id (model_id)')
  .option('-t, --tipo <value>', 'tipo')
  .option('-o, --output <value>','output file')
  .action(options=>{
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
    crud.getModelos(options.id,options.tipo)
	.then(result=>{
	    if(!result || result.length == 0) {
			console.log("no se encontraron modelos. Saliendo.")
			pool.end()
			process.exit(1)
		}
		rl.question("Se encontraron " + result.length + " modelos. Desea eliminarlos (si)?", ok=>{
			if (!/^[yYsStTvV1]/.test(ok)) {
				console.log("Abortando.")
				pool.end()
				process.exit(0)
			}
			return crud.deleteModelos(options.id,options.tipo)
			.then(result=>{
				console.log("Se eliminaron " + result.length + " modelos")
				print_output(options,result)
				process.exit(0)
			})
			.catch(e=>{
				console.error(e)
				pool.end()
				process.exit(0)
			})
		})
	})
	.catch(e=>{
		console.error(e)
		pool.end()
		process.exit(0)
	})
 })

program 
  .command('getModelos')
  .description('lee modelos')
  .option('-i, --id <value>', 'id (model_id)')
  .option('-t, --tipo <value>', 'tipo')
  .option('-o, --output <value>','output file')
  .action(options=>{
    crud.getModelos(options.id,options.tipo)
	.then(result=>{
	    if(!result || result.length == 0) {
			console.log("no se encontraron modelos. Saliendo.")
			pool.end()
			process.exit(1)
		}
		console.log("Se encontraron " + result.length + " modelos")
		print_output(options,result)
		process.exit(0)
	})
	.catch(e=>{
		console.error(e)
		process.exit(0)
	})
  })

  // CALIBRADOS
program
  .command('insertCalibrados <input>')
  .description('Crea calibrados a partir de archivo JSON')
  .option('-C, --csv', 'output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-q, --quiet','no output')
  .option('-o, --output <value>','output file')
  .option('-P, --pretty','pretty-print JSON')
  .action((input,options) => {
	fs.readFile(input, (err, data) => {
		if (err) throw err;
		var calibrados = JSON.parse(data)
        var action
        if(Array.isArray(calibrados)) {
			calibrados = calibrados.map(c=>new CRUD.calibrado(c))
    		action = crud.upsertCalibrados(calibrados)
        } else {
			calibrados = new CRUD.calibrado(calibrados)
            action = crud.upsertCalibrado(calibrados)
        }
		action
        .then(upserted=>{
            if(!Array.isArray(upserted)) {
                upserted = [upserted]
            }
			console.log("Results: " + upserted.length)
			print_output(options,upserted)
			pool.end()
		})
		.catch(e=>{
			console.error(e)
			pool.end()
		})
	})
  });

program 
  .command('deleteCalibrados')
  .description('elimina calibrados')
  .option('-i, --id <value>', 'id (cal_id)')
  .option('-e, --estacion_id <value>', 'id de estación (estacion_id)')
  .option('-v, --var_id <value>', 'id de variable (var_id)')
  .option('-g, --grupo_id <value>', 'id de grupo (grupo_id)')
  .option('-m, --model_id <value>', 'id de modelo')
  .option('-o, --output <value>','output file')
  .action(options=>{
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
    //estacion_id,var_id,includeCorr=false,timestart,timeend,cal_id,model_id,qualifier,isPublic,grupo_id,no_metadata,group_by_cal,forecast_date,includeInactive
    crud.getCalibrados(options.estacion_id,options.var_id,false,undefined,undefined,options.id,options.model_id,undefined,undefined,options.grupo_id,false,false,undefined,true)
	.then(result=>{
	    if(!result || result.length == 0) {
			console.log("no se encontraron calibrados. Saliendo.")
			pool.end()
			process.exit(1)
		}
		rl.question("Se encontraron " + result.length + " calibrados. Desea eliminarlos (si)?", ok=>{
			if (!/^[yYsStTvV1]/.test(ok)) {
				console.log("Abortando.")
				pool.end()
				process.exit(0)
			}
            var cal_id = result.map(c=>c.id)
			return crud.deleteCalibrados(cal_id)
			.then(result=>{
				console.log("Se eliminaron " + result.length + " calibrados")
				print_output(options,result)
				process.exit(0)
			})
			.catch(e=>{
				console.error(e)
				pool.end()
				process.exit(0)
			})
		})
	})
	.catch(e=>{
		console.error(e)
		pool.end()
		process.exit(0)
	})
 })

program 
  .command('getCalibrados')
  .description('lee calibrados')
  .option('-i, --id <value>', 'id (cal_id)')
  .option('-e, --estacion_id <value>', 'id de estación (estacion_id)')
  .option('-v, --var_id <value>', 'id de variable (var_id)')
  .option('-c, --include_corr', 'incluye corridas',false)
  .option('-t, --timestart <value>', 'fecha inicial de pronosticos')
  .option('-d, --timeend <value>', 'fecha final de pronosticos')
  .option('-q, --qualifier <value>', 'qualifier de pronosticos')
  .option('-p, --public', 'es público')
  .option('-n, --no_metadata', 'excluye metadatos')
  .option('-r, --group_by_cal', 'group_by_cal')
  .option('-f, --forecast_date <value>', 'fecha de corrida')
  .option('-l, --include_inactive', 'incluye calibrados inactivos')
  .option('-g, --grupo_id <value>', 'id de grupo (grupo_id)')
  .option('-m, --model_id <value>', 'id de modelo')
  .option('-o, --output <value>','output file')
  .action(options=>{
    crud.getCalibrados(options.estacion_id,options.var_id,options.include_corr,options.timestart,options.timeend,options.id,options.model_id,options.qualifier,options.is_public,options.grupo_id,options.no_metadata,options.group_by_cal,options.forecast_date,options.include_inactive)
	.then(result=>{
	    if(!result || result.length == 0) {
			console.log("no se encontraron calibrados. Saliendo.")
			pool.end()
			process.exit(1)
		}
		console.log("Se encontraron " + result.length + " calibrados")
		print_output(options,result)
		process.exit(0)
	})
	.catch(e=>{
		console.error(e)
		process.exit(0)
	})
  })



// AUX FUNCS //
	
function print_rast(options,serie,obs) {
	options.format = (options.format) ? options.format : "GTiff"
	const filename = (options.filename) ? options.filename : sprintf("%s_%05d_%s_%s\.%s", options.output, obs.series_id, obs.timestart.toISOString().substring(0,10), obs.timeend.toISOString().substring(0,10), options.format)
	return fsPromise.writeFile(filename, obs.valor)
	.then (()=>{
		console.log("Se creó el archivo " + filename)
		//~ console.log({forecast_date:options.forecast_date})
		var promises=[]
		if(options.format == "GTiff") {
			promises.push(execShellCommand('gdal_edit.py -mo "series_id=' + obs.series_id + '" -mo "timestart=' + obs.timestart.toISOString() + '" -mo "timeend=' + obs.timeend.toISOString() + '" ' + filename)) //, (error, stdout, stderr) => {
				//~ if (error) {
				//~ console.error(`exec error: ${error}`);
				//~ return;
				//~ }
			//~ });
			if(options.series_metadata) {
				promises.push(execShellCommand('gdal_edit.py -mo "var_id=' + serie["var"].id + '" -mo "var_nombre=' + serie["var"].nombre + '" -mo "unit_id=' + serie.unidades.id + '" -mo "unit_nombre=' + serie.unidades.nombre + '" -mo "proc_id=' + serie.procedimiento.id + '" -mo "proc_nombre=' + serie.procedimiento.nombre + '" -mo "fuente_id=' + serie.fuente.id + '" -mo "fuente_nombre=' + serie.fuente.nombre + '" ' + filename)) //, (error, stdout, stderr) => {
					//~ if (error) {
					//~ console.error(`exec error: ${error}`);
					//~ return;
					//~ }
				//~ });
			}
			if(options.funcion) {
				promises.push(execShellCommand('gdal_edit.py -mo "agg_func=' + options.funcion + '" -mo "count=' + obs.count + '" ' + filename)) //, (error, stdout, stderr) => {
					//~ if (error) {
					//~ console.error(`exec error: ${error}`);
					//~ return;
					//~ }
				//~ });
			}
			if(options.print_color_map) {  // imprime png de grass a partir del gtiff generado
				console.log("Imprimiendo mapa rgb")
				if(config.grass) {
					Object.keys(config.grass).map(key=>{
						options[key] = (options[key]) ? options[key] : config.grass[key]
					})
				}
				//~ console.log(options)
				var output_filename = filename.replace(/(\.GTiff)?$/,".png")
				var parameters = { ...options}
				parameters.title = serie.fuente.nombre
				promises.push(printMap.printRastObsColorMap(filename,output_filename,obs,parameters))
			}
			return Promise.all(promises)
		}
		//~ console.log("Se creó el archivo " + filename)
	})
}

//~ function gfs2db() {
	//~ return gfs.gfs2db(crud,arguments[0].series_id)
	//~ .then(result=>{
		//~ console.log("result:"+result.length + " rows upserted")
		//~ if(arguments[0].output) {
			//~ fs.writeFile(arguments[0].output, JSON.stringify(result,null,2), err => {
				//~ if (err) throw err;
				//~ console.log("Output to file:"+arguments[0].output)
			//~ })
			//~ return result
		//~ } else {
			//~ return result
		//~ }
	//~ })
	//~ .catch(e=>{
		//~ console.error(e)
	//~ })
//~ }
		
function execShellCommand(cmd) {
 const exec = require('child_process').exec;
 return new Promise((resolve, reject) => {
  exec(cmd, (error, stdout, stderr) => {
   if (error) {
    console.warn(error);
   }
   resolve(stdout? stdout : stderr);
  });
 });
}


program.parse(process.argv);
