'use strict'

const program = require('commander')
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
var gfs = new accessors.gfs_smn({ftp_connection_pars:config.smn_ftp,localcopy: '/tmp/gfs_local-copy.grb', outputdir: 'data/gfs/gtiff'})
const readline = require("readline");

//~ const gdal = require('gdal')

const { exec } = require('child_process');
const spawn = require('child_process').spawn;
var ogr2ogr = require('ogr2ogr') // .default

// file_indexer
const file_indexer = require('./file_indexer')
const indexer = new file_indexer.file_indexer(pool)

const path = require('path')
const tmp = require('tmp')

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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .action(options => {
	crud.getRedes({nombre:options.nombre, tabla_id:options.tabla, public:options.public,public_his_plata:options.hisplata})
	.then(result=>{
		pool.end()
		console.log("Results: " + result.length)
		return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
		return print_output(options,upserted)
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
			return print_output(options,upserted)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
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
		return print_output(options,deleted)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
			return print_output(options,upserted)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .action(options => {
	var filter = {}
	if(options.geom) {
		filter.geom = new CRUD.geometry("box",options.geom)
	}
	crud.getEstaciones({nombre:options.nombre, tabla_id:options.tabla, public:options.public,public_his_plata:options.hisplata, geom: filter.geom, unid: options.unid, id_externo:options.id_externo, id: options.id})
	.then(result=>{
		console.log("Results: " + result.length)
		return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
		return print_output(options,estacion)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
			return print_output(options,upserted)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
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
  .action(async (input,options) => {
	  try {
		var areas = await ogr2ogr(input).promise()
		// var stream = await ogr2ogr(data,{format:"geoJSON"})
		// console.log(data)
		// var areas = JSON.parse(data.toString())
	} catch (e) {
		  console.error(e)
		  process.exit(1)
	  }

	// ogr.exec(function (er, data) {
	//   if (er) {
	// 	  console.error(er)
	// 	  pool.end()
	// 	  return
	//   }
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
		  return print_output(options,result)
	  })
	  .catch(e=>{
		console.error(e)
	  })
	  .finally(()=>{
		pool.end()
		process.exit(0)
	  })
  })

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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
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
		return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
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
		return print_output(options,estacion)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
			return print_output(options,result)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
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
		return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .action((tipo, id,options) => {
	var tipo = (/^areal/.test(tipo.toLowerCase())) ? "areal" : (/^rast/.test(tipo.toLowerCase())) ? "rast" : "puntual"
	crud.getSerie(tipo, parseInt(id),options.timestart,options.timeend,options)
	.then(serie=>{
		console.log("Got series tipo: " + serie.tipo + ", id:" + serie.id)
		return print_output(options,serie)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
						return print_output(options,deletedserie)
					})
				})
			} else {
				console.log("Abortando")
				return
			}
			rl.close()
		})
	}).catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .action( (tipo, series_id, timestart, timeend, options) => {
	var tipo = (/^areal/.test(tipo.toLowerCase())) ? "areal" : (/^rast/.test(tipo.toLowerCase())) ? "rast" : "puntual"
	crud.getObservaciones(tipo, {series_id:series_id, timestart:timestart, timeend:timeend})
	.then(observaciones=>{
		console.log("Got observaciones: " + observaciones.length + " records.")
		return print_output(options,observaciones)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
	})
});


program
  .command('getObsCount <tipo> [filter] [group_by]')
  .alias('o')
  .description('Get Observaciones Count with filter and grouped by')
  .option('-C, --csv', 'print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'print as one-line string')
  .option('-P, --pretty','pretty-print JSON')
  .option('-o, --output <value>', 'output filename')
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .action( (tipo, filter, group_by, options) => {
	var tipo = (/^areal/.test(tipo.toLowerCase())) ? "areal" : (/^rast/.test(tipo.toLowerCase())) ? "rast" : "puntual"
	var filter_obj = parseCSKVP(filter)
	var group_by_arr = parseCSV(group_by)
	console.log(JSON.stringify({filter:filter_obj,group_by:group_by_arr},null,2))
	crud.getObservacionesCount(tipo, filter_obj, {group_by:group_by_arr})
	.then(result=>{
		console.log("Got observaciones count: " + result + " records.")
		// return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
	})
});

program
  .command('backupObs <tipo> [filter]')
  .alias('o')
  .description('Backup Observaciones with filter and grouped by')
  .option('-C, --csv', 'print as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'print as one-line string')
  .option('-P, --pretty','pretty-print JSON')
  .option('-o, --output <value>', 'output filename (default backup/obs/{tipo}/series/{id}/obs.json)')
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .option('-D, --delete', 'Eliminar observaciones de la base de datos')
  .action( (tipo, filter, options) => {
	var tipo = (/^areal/.test(tipo.toLowerCase())) ? "areal" : (/^rast/.test(tipo.toLowerCase())) ? "rast" : "puntual"
	var filter_obj = parseCSKVP(filter)
	// console.log(JSON.stringify({filter:filter_obj,group_by:group_by_arr},null,2))
	crud.backupObservaciones(tipo, filter_obj,options)
	.then(result=>{
		console.log("Backed up observaciones: " + result + " series.")
		// return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
	})
});


function parseCSKVP(kvp_string) {
	if(kvp_string && kvp_string.length) {
		var kvp_obj = {}
		var kvp_arr = kvp_string.split(",")
		for(var f of kvp_arr) {
			if(!f.includes("=")) {
				console.error("invalid kvp: " + f)
				process.exit(1)
			}
			var kvp = f.split("=")
			if(kvp.length < 2) {
				console.error("invalid kvp: " + f)
				process.exit(1)
			}
			kvp_obj[kvp[0]] = kvp[1]
		}
		return kvp_obj
	} else {
		return
	}
}

function parseCSV(v_string) {
	if(v_string && v_string.length) {
		var v_arr = v_string.split(",")
		return v_arr
	} else {
		return
	}
}


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
		return print_output(options,observaciones)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
			return print_output(options,upserted)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
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
			return print_output(options,result)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
		})
	} else {
		crud.rast2areal(series_id,timestart,timeend,area,options) 
		.then(observaciones=>{
			return print_output(options,observaciones)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
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
		return print_output(options,serie)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .action((tipo,series_id,dt,timestart,timeend,options) => {
	crud.getRegularSeries(tipo,series_id,dt,timestart,timeend,options) // options: t_offset,aggFunction,inst,timeSupport,precision
	.then(result=>{
		//~ console.log(JSON.stringify(result))
		return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
	})
});

program
  .command('runAsociaciones <source_tipo> <source_series_id> <timestart> <timeend>')
  .description('actualiza series regulares derivadas')
  .option('-i, --id <value>', 'id de asociacion')
  .option('-d, --dt <value>', 'time interval (interval)')
  .option('-t, --t_offset <value>', 'time offset (interval)')
  .option('-a, --agg_func <value>', 'aggregation function (acum, mean, sum, min, max, count, diff, nearest, defaults to mean para series no instantáneas y nearest para series instantáneas)')
  .option('-T, --dest_tipo <value>', 'tipo de serie de destino')
  .option('-s, --dest_series_id <value>', 'id de serie de destino')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .option('-q, --quiet', 'no imprime regisros en stdout')
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .action((source_tipo,source_series_id,timestart,timeend,options) => {
	  var filter = {source_tipo:source_tipo,source_series_id:source_series_id,timestart:timestart,timeend:timeend}
	  if(options.dest_series_id) {
		  filter.dest_series_id = options.dest_series_id
		  delete options.dest_series_id
	  }
	  if(options.dest_tipo) {
		filter.dest_tipo = options.dest_tipo
		// delete options.dest_tipo
	  }
	  if(options.id) {
		filter.id = options.id
		delete options.id
	  }
	  crud.runAsociaciones(filter,options) // options: t_offset,dt,agg_func
	//   crud.runAsociaciones({source_tipo:"raster",dest_tipo:"areal",source_series_id:14,timestart:"2021-10-24",timeend:"2021-10-26"})
	  .then(result=>{
		//~ console.log(JSON.stringify(result))
		return print_output(options,result)
	  })
	  .catch(e=>{
		console.error(e)
	  })
	  .finally(()=>{
		pool.end()
		process.exit(0)
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
			console.log("result:" + result.length + " rows found/upserted")
			if (options.print_color_map) {
				// var timestart = result[0].timestart
				// var timeend= result[0].timeend
				var timeupdate = result[0].timeupdate
				// for(var i=0;i<result.length;i++) {
				// 	if(result[i].timestart<timestart) {
				// 		timestart = result[i].timestart
				// 	}
				// 	if(result[i].timeend>timeend) {
				// 		timeend = result[i].timeend
				// 	}
				// }
				// crud.getSerie("rast",options.series_id,timestart.toISOString(),timeend.toISOString(),{format:"gtiff"})
				crud.getSerie("rast",options.series_id,undefined,undefined,{format:"gtiff"},undefined,timeupdate)
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
			return print_output(options,result)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
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
  .command('getAccessorsList [name]')
  .description('Obtener lista de accessors')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .action((name, options)=>{
	if(name) {
		pool.query("SELECT * from accessors where name=$1",[name])
		.then(result=>{
			print_output(options,result.rows)
			process.exit()
		})
		.catch(e=>{
			console.error(e)
			process.exit(1)
		})
	} else {
		pool.query("SELECT * from accessors order by name")
		.then(result=>{
			print_output(options,result.rows)
			process.exit()
		})
		.catch(e=>{
			console.error(e)
			process.exit(1)
		})
	}
  })


program
  .command("testAccessor <name>")
  .description('Probar accessor')
  .action((name, options)=> {
	accessors.new(name)
	.then(accessor=>{
		return accessor.engine.test()
	})
	.then(result=>{
		if(result) {
			console.log({message:"accessor test ok"})
		} else {
			console.log({message:"accessor test failed"})
		}
		process.exit(0)
	})
	.catch(e=>{
		console.error({"testAccessor error": e})
		process.exit(1)
	})
  })

program
  .command("getFromAccessor <name>")
  .description('Obtener datos usando accessor')
  .option('-f, --filter <value>','filter como pares key=value separados por coma. Ejemplo: -f "timestart=2021-01-01,timeend=2022-01-01,var_id=2"')
  .option('-O, --kvopt <value>','filter como pares key=value separados por coma. Ejemplo: -O "time=6,no_download=true"')
  .option('-i, --insert','Upsert into db')
  .option('-C, --csv', 'input/output as CSV')
  .option('-L, --csvless', 'print as CSVless')
  .option('-S, --string', 'output as one-line strings')
  .option('-o, --output <value>', 'output filename')
  .option('-P, --pretty','pretty-print JSON')
  .option('-q, --quiet', 'no imprime regisros en stdout')
  .action((name, options)=> {
	var filter_obj = {} 
	var options_obj = {}
	if(options.filter) {
		filter_obj = parseCSKVP(options.filter)
	}
	if(options.kvopt) {
		options_obj = parseCSKVP(options.kvopt)
	} 
	accessors.new(name)
	.then(accessor=>{
		if(options.insert) {
			return accessor.engine.update(filter_obj,options_obj)
		} else {
			return accessor.engine.get(filter_obj,options_obj)
		}
	})
	.then(result=>{
		if(result) {
			print_output(options,result)
			process.exit()
		} else {
			console.error("getFromAccesor: no se encontraron observaciones")
			process.exit()
		}
	})
	.catch(e=>{
		if(config.verbose) {
			console.error(e)
		} else {
			console.error(e.toString())
		}
		process.exit(1)
	})
  })


/////////////

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
		  return print_output(options,observaciones)
		  .then(()=>{
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
  .option('-N, --no_send_data','don\'t return observations, only count (boolean)',false)
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
        } else if(options.no_send_data) {
			console.log(result.length)
			return  
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

program
  .command("pruneObs")
  .description("delete obs using filter")
  .option('-t, --tipo <value>', 'tabla ID (string)','puntual')
  .option('-i, --series_id <value>', 'series_id (int[,int,...])')
  .option('-s, --timestart <value>', 'timestart (date string)')
  .option('-e, --timeend <value>', 'timeend (date string)')
  .option('-v, --var_id <value>', 'var_id (int)')
  .option('-f, --fuentes_id <value>', 'fuentes_id (int)')
  .option('-p, --proc_id <value>', 'proc_id (int)')
  .option('-u, --unit_id <value>', 'unit_id (int)')
  .option('-S, --no_send_data','no send deleted observations (boolean)',false)
  .option('-o, --output <value>','output to file (string)')
  .action(options => {
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
		no_send_data: options.no_send_data
    }
    crud.pruneObs(options.tipo,filter,opt)
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
	var postfix = (options.csvless || options.csv) ? ".csv" : (options.string) ? ".txt" : (options.pretty) ? ".json" : (options.geojson) ? ".geojson" : ".json"
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
	if(options.zip) {
		return zipAndSave(output,options.zip,{postfix:postfix})
		.then(size=>{
			console.log(options.zip + " created of " + size + " bytes")
			return
		})
		// .catch(e=>{
		// 	console.error(e)
		// })
	} else if(options.output) {
		fs.writeFileSync(options.output,output)
		return Promise.resolve()
	} else {
		if(!options.quiet) {
			console.log(output)
		}
		return Promise.resolve()
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
			return print_output(options,upserted)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
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
				return print_output(options,result)
			})
			.catch(e=>{
				console.error(e)
			})
			.finally(()=>{
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
		return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
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
			return print_output(options,upserted)
		})
		.catch(e=>{
			console.error(e)
		})
		.finally(()=>{
			pool.end()
			process.exit(0)
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
			return crud.deleteCalibrados({id:cal_id})
			.then(result=>{
				console.log("Se eliminaron " + result.length + " calibrados")
				return print_output(options,result)
			})
			.catch(e=>{
				console.error(e)
			})
			.finally(()=>{
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
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .action(options=>{
    crud.getCalibrados_(options.estacion_id,options.var_id,options.include_corr,options.timestart,options.timeend,options.id,options.model_id,options.qualifier,options.is_public,options.grupo_id,options.no_metadata,options.group_by_cal,options.forecast_date,options.include_inactive)
	.then(result=>{
	    if(!result || result.length == 0) {
			console.log("no se encontraron calibrados. Saliendo.")
			pool.end()
			process.exit(1)
		}
		console.log("Se encontraron " + result.length + " calibrados")
		return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
		pool.end()
		process.exit(0)
	})
  })
  
// PRONOSTICOS

program
  .command('getPronosticos')
  .description("lee pronosticos (corridas)")
  .option('-i, --id <value>','id (cor_id)')
  .option('-c, --cal_id <value>','cal_id')
  .option('-S, --forecast_timestart <value>','forecast timestart')
  .option('-E, --forecast_timeend <value>','forecast timeend')
  .option('-f, --forecast_date <value>','forecast date')
  .option('-s, --timestart <value>','timestart')
  .option('-e, --timeend <value>','timeend')
  .option('-q, --qualifier <value>','qualifier')
  .option('-t, --estacion_id <value>','estacion_id')
  .option('-v, --var_id <value>','var id')
  .option('-p, --includeProno','include prono')
  .option('-P, --public','is public')
  .option('-r, --series_id <value>','series id')
  .option('-m, --series_metadata','include series metadata')
  .option('-g, --cal_grupo_id <value>','cal grupo id')
  .option('-o, --output <value>','archivo de salida')
  .option('-z, --zip <value>','comprimir y crear archivo zip')
  .action(options=>{
	  crud.getPronosticos(options.cor_id,options.cal_id,options.forecast_timestart,options.forecast_timeend,options.forecast_date,options.timestart,options.timeend,options.qualifier,options.estacion_id,options.var_id,options.includeProno,options.public,options.series_id,options.series_metadata,options.cal_grupo_id)
	  .then(result=>{
		if(!result || result.length == 0) {
			console.log("no se encontraron pronosticos. Saliendo.")
			pool.end()
			process.exit(1)
		}
		console.log("Se encontraron " + result.length + " pronosticos")
		return print_output(options,result)
	  })
	  .catch(e=>{
	  	console.error(e)
	  })
	  .finally(()=>{
		pool.end()
		process.exit(0)
	  })
  })

// PRONOSTICOS GUARDADOS	

program
.command('getPronosticosGuardados')
.description("lee pronosticos guardados (corridas)")
.option('-i, --id <value>','id (cor_id)')
.option('-c, --cal_id <value>','cal_id')
.option('-S, --forecast_timestart <value>','forecast timestart')
.option('-E, --forecast_timeend <value>','forecast timeend')
.option('-f, --forecast_date <value>','forecast date')
.option('-s, --timestart <value>','timestart')
.option('-e, --timeend <value>','timeend')
.option('-q, --qualifier <value>','qualifier')
.option('-t, --estacion_id <value>','estacion_id')
.option('-v, --var_id <value>','var id')
.option('-p, --includeProno','include prono')
.option('-P, --public','is public')
.option('-r, --series_id <value>','series id')
.option('-m, --series_metadata','include series metadata')
.option('-g, --cal_grupo_id <value>','cal grupo id')
.option('-Q, --group_by_qualifier','agrupar por qualifier')
.option('-o, --output <value>','archivo de salida')
.option('-z, --zip <value>','comprimir y crear archivo zip')
.action(options=>{
	crud.getCorridasGuardadas(options.cor_id,options.cal_id,options.forecast_timestart,options.forecast_timeend,options.forecast_date,options.timestart,options.timeend,options.qualifier,options.estacion_id,options.var_id,options.includeProno,options.public,options.series_id,options.series_metadata,options.cal_grupo_id,options.group_by_qualifier)
	.then(result=>{
	  if(!result || result.length == 0) {
		  console.log("no se encontraron pronosticos guardados. Saliendo.")
		  pool.end()
		  process.exit(1)
	  }
	  console.log("Se encontraron " + result.length + " pronosticos guardados")
	  return print_output(options,result)
	})
	.catch(e=>{
		console.error(e)
	})
	.finally(()=>{
	  pool.end()
	  process.exit(0)
	})
})


  // GPM

function getGPMRast3h(timestart,timeend,no_send_data=true,skip_download=false) {
    if(!timestart) {
        timestart = new Date()
        timestart.setTime(timestart.getTime() - 5*24*3600*1000)
    }
    if(!timeend) {
        timeend = new Date()
        timeend.setTime(timeend.getTime() - 24*3600*1000)
    }
	if(skip_download) {
		if(no_send_data) {
			return
		} else {
			return crud.getObservaciones("raster",{series_id:4, timestart:timestart, timeend:timeend})
		}
	}
    return accessors.new("gpm_3h")
    .then(accessor=>{
        return accessor.engine.update({timestart:timestart,timeend:timeend},{no_send_data:no_send_data})
    })
}

// "http://localhost:3005/obs/asociaciones/7924?run=true&timestart=$sd&timeend=$ed&no_send_data=true" -o responses/upd_gpm_dia.json
function getGPMRastDia(timestart,timeend,no_send_data=true) {
    if(!timestart) {
        timestart = new Date()
        timestart.setTime(timestart.getTime() - 5*24*3600*1000)
    }
    if(!timeend) {
        timeend = new Date()
        timeend.setTime(timeend.getTime() - 24*3600*1000)
    }
    return crud.runAsociacion(7924,{timestart:timestart,timeend:timeend},{no_send_data:no_send_data})
}

// "http://localhost:3005/obs/asociaciones?source_series_id=13&source_tipo=raster&dest_tipo=areal&run=true&timestart=$sd&timeend=$ed&no_send_data=true"
function getGPMArealDia(timestart,timeend,no_send_data=true) {
    if(!timestart) {
        timestart = new Date()
        timestart.setTime(timestart.getTime() - 5*24*3600*1000)
    }
    if(!timeend) {
        timeend = new Date()
        // timeend.setTime(timeend.getTime() - 24*3600*1000)
    }
    return crud.runAsociaciones({source_series_id:13,source_tipo:"raster",dest_tipo:"areal",timestart:timestart,timeend:timeend},{no_send_data:true})
}

// "http://localhost:3005/obs/asociaciones?source_series_id=4&source_tipo=raster&dest_tipo=areal&run=true&timestart=2021-07-31&timeend=2021-08-03&no_send_data=true"
function getGPMAreal3h(timestart,timeend,no_send_data=true) {
    if(!timestart) {
        timestart = new Date()
        timestart.setTime(timestart.getTime() - 5*24*3600*1000)
    }
    if(!timeend) {
        timeend = new Date()
        // timeend.setTime(timeend.getTime() - 24*3600*1000)
    }
    return crud.runAsociaciones({source_series_id:4,source_tipo:"raster",dest_tipo:"areal",timestart:timestart,timeend:timeend},{no_send_data:true})
}

function getGPMDiaMaps(timestart,timeend) {
    if(!timestart) {
        timestart = new Date()
        timestart.setTime(timestart.getTime() - 5*24*3600*1000)
    }
    if(!timeend) {
        timeend = new Date()
        timeend.setTime(timeend.getTime() - 24*3600*1000)
    }
    return accessors.new("gpm_3h")
    .then(accessor=>{
        return accessor.engine.getDiario({timestart:timestart,timeend:timeend})
        .then(result=>{
            return accessor.engine.printMaps(timestart,timeend)
        })
    })
}

function printGPMMapSemanal(timestart,timeend) {
	if(timestart) {
        timestart = new Date(timestart)
    } else {
        timestart = new Date()
        timestart.setTime(timestart.getTime() - 14*24*3600*1000)
    }
    timestart = new Date(Date.UTC(timestart.getUTCFullYear(),timestart.getUTCMonth(),timestart.getUTCDate(),12,0,0))
    if(timeend) {
        timeend = new Date(timeend)
        timeend = new Date(Date.UTC(timeend.getUTCFullYear(),timeend.getUTCMonth(),timeend.getUTCDate(),12,0,0))
    } else {
        timeend = new Date(timestart.getTime())
        timeend.setUTCDate(timeend.getUTCDate() + 7)
    }
    return accessors.new("gpm_3h")
    .then(accessor=>{
        return accessor.engine.printMapSemanal(timestart,timeend)
    })
}

function gpm_batch(timestart,timeend,skip_download) {
    return getGPMRast3h(timestart,timeend,false,skip_download)
    .then(result=>{
        return fsPromise.writeFile("cron/responses/getGPMRast3h.json", result)
    })
    .then(()=>{
        return getGPMRastDia(timestart,timeend)
    })
    .then(result=>{
        return fsPromise.writeFile("cron/responses/getGPMRastDia.json", result)
    })
    .then(()=>{
        return getGPMArealDia(timestart,timeend)
    })
    .then(result=>{
        return fsPromise.writeFile("cron/responses/getGPMArealDia.json", result)
    })
    .then(()=>{
        return getGPMAreal3h(timestart,timeend)
    })
    .then(result=>{
        return fsPromise.writeFile("cron/responses/getGPMAreal3h.json", result)
    })
    .then(()=>{
        return getGPMDiaMaps(timestart,timeend)
    })
    .then(result=>{
        return fsPromise.writeFile("cron/responses/getGPMDiaMaps.json", result)
    })
    .then(result=>{
        return printGPMMapSemanal(timestart,timeend)
    })
    .then(result=>{
        return fsPromise.writeFile("cron/responses/printMapSemanal.json", result)
    })
}

program
  .command('gpm_batch')
  .description('descarga gpm 3h, actualiza base de datos y genera mapas 3h y diarios')
  .option('-s, --timestart <value>', 'fecha de inicio')
  .option('-e, --timeend <value>', 'fecha final')
  .option('-S, --skip_download',"no descargar")
  .action(options => {
      gpm_batch(options.timestart,options.timeend,options.skip_download)
      .catch(e=>{
          console.error(e)
          process.exit(1)
    })

   })

program
   .command('gpm_mapas_diarios')
   .description('genera mapas diarios')
   .option('-s, --timestart <value>', 'fecha de inicio')
   .option('-e, --timeend <value>', 'fecha final')
   .action(options => {
       getGPMDiaMaps(options.timestart,options.timeend)
       .catch(e=>{
           console.error(e)
           process.exit(1)
     })
 
    })
    
program
   .command('gpm_mapas_semanales')
   .description('genera mapas semanales')
   .option('-s, --timestart <value>', 'fecha de inicio')
   .option('-e, --timeend <value>', 'fecha final')
   .action(options => {
	 printGPMMapSemanal(options.timestart,options.timeend)
       .catch(e=>{
           console.error(e)
           process.exit(1)
     })
 
    })

// file_indexer

program
  .command('getGridded')
  .description('get from gridded')
  .option('-c, --col_id <value>', 'id de colecciones_raster (int)')
  .option('-r, --reference <value>', 'reference (regex)')
  .option('-p, --path <value>', 'path (int)')
  .option('-w, --row <value>', 'row (int)')
  .option('-t, --timestart <value>', 'timestart (date)')
  .option('-e, --timeend <value>', 'timeend (date)')
  .option('-d, --date <value>', 'date: fecha de elaboración (date)')
  .option('-v, --version <value>', 'version (int)')
  .option('-i, --id <value>', 'id (int)')
  .option('-o, --output <value>', 'output (file)')
  .option('-N --no_metadata','no metadata (flat result)',false)
  .action(options => {
    var filter = {}
    Object.keys(options).forEach(key=>{
        filter[key] = options[key]
    })
    return indexer.getGridded(filter,undefined,{no_metadata:options.no_metadata})
    .then(result=>{
        if(options.output) {
            fs.writeFileSync(options.output,JSON.stringify(result,null,2))
            process.exit(0)
        } else {
            console.log(JSON.stringify(result,null,2))
            process.exit(0)
        }
    })
    .catch(e=>{
        console.error("get error:" + e)
        process.exit(1)
    })
  })
	
  program
  .command('runFileIndexer')
  .description('indexa rasters')
  .option('-c, --col_id <value>', 'id de colecciones_raster')
  .option('-S, --skip_update','no actualiza gridded',false)
  .option('-o, --output <value>', 'salida')
  .action(options => {
    indexer.runGridded(options.col_id,{no_update:options.skip_update})
    .then(result=>{
        if(options.output) {
            fs.writeFileSync(options.output,JSON.stringify(result,null,2))
        } else {
            console.log(JSON.stringify(result,null,2))
        }
        process.exit(0)
    })
    .catch(e=>{
        console.error(e)
        process.exit(0)
    })
  })

program
	.command('getColeccionesRaster')
	.description('devuelve listado de colecciones raster')
	.option('-i, --id <value>', 'id de colección (col_id)')
	.option('-o, --output <value>', 'archivo de salida')
	.action(options=>{
		indexer.getColeccionesRaster(options.id)
		.then(result=>{
			if(options.output) {
				return fsPromise.writeFile(options.output,JSON.stringify(result,null,2))
			} else {
				console.log(JSON.stringify(result,null,2))
			}
		})
		.then(()=>{
			process.exit()
		})
		.catch(e=>{
			console.error(e.toString())
			process.exit(1)
		})
	})



function runGridded (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	indexer.runGridded(filter.col_id,options)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(400).send(e.toString())
	})
}

// CUBE TO SERIES_RAST


program
  .command('getRastFromCube <fuentes_id>')
  .description('convierte de cubo raster a observaciones_rast. Si se provee -i --series_id, inserta observaciones en la serie indicada')
  .option('-s, --timestart <value>', 'fecha de inicio')
  .option('-e, --timeend <value>', 'fecha final')
  .option('-f, --forecast_date <value>', 'fecha final')
  .option('-i, --series_id <value>', 'id de serie de destino (de series_rast)')
  .option('-o, --output <value>', 'guardar salida en archivo')
  .option('-f, --format <value>', 'formato de archivo de salida')
  .action((fuentes_id,options) => {
	  var action
	  if(options.series_id) {
		  action = crud.upsertRastFromCube(fuentes_id,options.timestart,options.timeend,options.forecast_date,undefined,options.series_id)
	  } else {
		  action = crud.getRastFromCube(fuentes_id,options.timestart,options.timeend,options.forecast_date,undefined)
	  }
	  action.then(async results=>{
		  if(options.output) {
			//   fs.writeFileSync(options.output,JSON.stringify(results))
			for(var i in results) {
				await print_rast(options,{id:options.series_id,tipo:"raster"},results[i])
			} 
		  } else {
		    console.log("results: " + results.length)
		  }
		  process.exit()
	  })
	  .catch(e=>{
		  console.error(e)
		  process.exit()
	  })
	})

// AUX FUNCS //
	
function print_rast(options,serie,obs) {
	options.format = (options.format) ? options.format : "GTiff"
	obs.series_id  = (obs.series_id) ? obs.series_id : 0
	console.log([options.output, obs.series_id, obs.timestart.toISOString().substring(0,10), obs.timeend.toISOString().substring(0,10), options.format])
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

// 	IF SUCCESSFUL RETURNS SIZE OF ZIP FILE
function zipAndSave(content,output,options) {
	var prefix = (options && options.prefix) ? options.prefix : "content" 
	var postfix = (options && options.postfix) ? options.postfix : ".json" 
	console.log("zipping " + content.length + " chars into " + path.resolve(output))
	var tmpobj = tmp.fileSync({prefix:prefix,postfix:postfix})
	fs.writeFileSync(tmpobj.name,content.toString())
	return new Promise( (resolve,reject)=>{
		var zip = spawn('zip',['-FSrj', path.resolve(output), tmpobj.name])
		zip.stderr.on('data',data=>{
			console.error(data.toString())
		})
		zip.on('error',err=>{
			console.error(err)
		})
		zip.on('exit', (code)=>{
			tmpobj.removeCallback();
			if(code !== 0) {
				reject('zip process exited with code ' + code);
			} else {
				var stats = fs.statSync(path.resolve(output))
				var size = stats.size

				resolve(size);
			}
		})
		// zip.stdin.write(content.toString() + "\n")
		// zip.stdin.end()
	})
}

program.parse(process.argv);
