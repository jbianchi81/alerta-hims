'use strict'

const request = require('request')
const program = require('commander')
const inquirer = require('inquirer')
const { Pool, Client } = require('pg')
const config = require('config');
const pool = new Pool(config.sat2_database) 
const fs = require('fs')
var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf

const Sat2 = require('./sat2')
const sat2 = new Sat2.sat2()
//~ const Sat2db = require('./sat2db')
const CRUD = new Sat2.CRUD(pool)


program
  .version('0.0.1')
  .description('Data providers accessors');

program
  .command('Sat2:GetEquipos <user> <pass>')
  .alias('g')
  .description('Get equipos SAT2')
  .option('-s, --save', 'save into DB')
  .action((user, pass, cmdObj) => {
    sat2.GetEquipos(user, pass)
    .then(result=> {
		//~ console.log(result)
	  if(! Array.isArray(result)) {
		  console.error("result no es un array!")
		  return
	  }
	  console.log("Found "+result.length+" Equipos")
	  var equipos=[]
	  for(var i=0;i<result.length;i++) { // result.map((it,index)=> {
		  //~ console.log("["+i+"] idEquipo:"+result[i].idEquipo+", descripcion:"+result[i].descripcion+", lat:"+result[i].lat+", lng:"+result[i].lng+", NroSerie:"+result[i].NroSerie+", fechaAlta:"+result[i].fechaAlta)
		  const equipo = new Sat2.Equipo(result[i].idEquipo,result[i].descripcion,-1*result[i].lat,-1*result[i].lng,result[i].NroSerie,result[i].fechaAlta,result[i].sensores)
		  //~ console.log(equipo.toString())
		  equipos.push(equipo)
	  }
	  if(cmdObj.save && equipos.length>0) {
		console.log("calling insert, n:" + equipos.length)
		CRUD.insertEquipos(equipos)
		.then(r=>{
		  //~ console.log("Equipo guardado")
		  r.map((equipo,i)=>{
			console.log(equipo.toString())
		  })
		  console.log(r.length + " equipos guardados")
		  pool.end()
		})
		.catch(e=>{
		  console.log("Error al intentar guardar Equipo")
		  console.error(e)
		  pool.end()
		})
	  }
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('Sat2:Auth <user> <pass>')
  .alias('a')
  .description('SAT2: autenticar usuario')
  .action( (user, pass) => {
	sat2.AutenticarUsuario(user,pass)
	.then(result=> {
		console.log(result)
		pool.end()
	})
	.catch(e=> {
		console.log("Error de autenticación")
		console.error(e)
		pool.end()
	})
  })

program
  .command('Sat2:GetInstantaneosDeEquipo <user> <pass> <idEquipo>')
  .alias('i')
  .description('SAT2: vizualizar los datos instantáneos de los equipos')
  .action((user, pass, idEquipo) => {
    sat2.GetInstantaneosDeEquipo(user, pass, idEquipo)
    .then(result=> {
		console.log(result)
		pool.end()
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('Sat2:GetHistoricosDeEquipoPorSensor <user> <pass> <idEquipo> <idSensor> <fechaDesde> <fechaHasta>')
  .alias('h')
  .description('para hacer los graficos y las tablas con datos históricos')
  .option('-s, --save', 'save into DB')  
  .action((user, pass, idEquipo,idSensor,fechaDesde,fechaHasta,cmdObj) => {
	sat2.GetHistoricosDeEquipoPorSensor(user,pass,idEquipo,idSensor,fechaDesde,fechaHasta)
    .then(result=> {
		//~ console.log(result)
		if(!result) {
			console.log("No se encontraron registros")
			return
		}
		if(cmdObj.save && result.length>0) {
			//~ var datos=[]
			//~ for(var i=0;i<result.length;i++) {
				//~ const dato = new Sat2db.Dato(idEquipo,idSensor, result[i].fecha, result[i].valor)
				//~ console.log(dato.toString())
				//~ datos.push(dato)
			//~ }
			//~ CRUD.insertDatos(datos)
			CRUD.insertDatos(result)
			.then(r=>{
				//~ r.map((dato,i)=>{
					//~ console.log(dato.toString())
				//~ })
				console.log(r.length + " datos guardados")
				pool.end()
			})
			.catch(e=>{
				console.log("Error al intentar guardar Datos")
				console.error(e)
				pool.end()
			})
		}
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

//~ program
  //~ .command('Sat2:GetHistoricosPorFechas <user> <pass> <fechaDesde> <fechaHasta> [idEquipo] [idSensor]')
  //~ .alias('H')
  //~ .description('para hacer los graficos y las tablas con datos históricos')
  //~ .option('-s, --save', 'save into DB')  
  //~ .action((user, pass,fechaDesde,fechaHasta, idEquipo,idSensor,cmdObj) => {

	//~ var datos=[]
	//~ CRUD.readAsociaciones(idEquipo,idSensor)
	//~ .then(asociaciones=>{
		//~ var promises=[]

		//~ if(asociaciones.length>0) {
			//~ for(var i=0;i<asociaciones.length;i++) {
			  //~ console.log("Get equipo:" + asociaciones[i].idEquipo + ", sensor:" + asociaciones[i].idSensor)
			  //~ promises.push(
				//~ sat2.GetHistoricosDeEquipoPorSensor(user,pass,asociaciones[i].idEquipo,asociaciones[i].idSensor,fechaDesde,fechaHasta)
				//~ .then(historicos => {
					//~ if(historicos) {
						//~ datos = datos.concat(historicos)
					//~ }
				//~ })
				//~ .catch(e=>{
					//~ console.error(e)
				//~ })
			  //~ )
		   //~ }
		   //~ return Promise.all(promises)
	   //~ } else {
		   //~ console.log("no asociaciones found")
		   //~ return []
	   //~ }
   //~ })
   //~ .then((res)=>{
	  //~ if(datos.length>0) {
		//~ console.log(datos.length + "datos found")
		//~ return CRUD.insertDatos(datos)
	  //~ } else {
		  //~ console.log("no data found")
		  //~ return []
	  //~ }
   //~ })
   //~ .then(res=>{
		//~ console.log("Saved " + res.length + " values")
		//~ pool.end()
	//~ })
	//~ .catch(e=>{
		//~ console.error(e)
		//~ pool.end()
	//~ })
  //~ });

program
  .command('Sat2:GetHistoricosPorFechas <user> <pass> <fechaDesde> <fechaHasta> [idEquipo] [idSensor]')
  .alias('H')
  .description('para recuperar los datos de todos los equipos y sensores entre las fechas especificadas, opcionalmente filtrando con idEquipo y idSensor')
  .option('-s, --save', 'save into DB')  
  .action((user, pass,fechaDesde,fechaHasta, idEquipo,idSensor,cmdObj) => {
	async function gethistoricos(asociaciones) {
		var inserted_count = 0
		for(var i=0;i<asociaciones.length;i++) {
			console.log("Get equipo:" + asociaciones[i].idEquipo + ", sensor:" + asociaciones[i].idSensor)
			await sat2.GetHistoricosDeEquipoPorSensor(user,pass,asociaciones[i].idEquipo,asociaciones[i].idSensor,fechaDesde,fechaHasta)
			.then(historicos => {
				if(historicos) {
					CRUD.insertDatos(historicos)
					.then(datos=>{
						if(datos) {
						   console.log ("Inserted: " + datos.length + " rows")
						   inserted_count += datos.length
					   }
					})
					.catch(e=>{
						console.error({message:"Data insertion error",error:e})
					})
					//~ inserted = inserted.concat(historicos)
				}
			})
			.catch(e=>{
				console.error(e)
			})
		}
		console.log("gethistoricos: Done!")
		return inserted_count
	}  
	var datos=[]
	CRUD.readAsociaciones(idEquipo,idSensor)
	.then(asociaciones=>{
		var promises=[]
		//~ console.log(asociaciones)
		if(asociaciones.length>0) {
			gethistoricos(asociaciones)
			.then((inserted_count)=>{
				console.log("Total inserted: " + inserted_count + " rows of data")
				//~ pool.end()
			})
			.catch(e=> {
				console.log(e)
			})
		} else {
		   console.log("no asociaciones found")
		   return []
		}
		//~ pool.end()
	})
	.catch(e=>{
		console.error(e)
		//~ pool.end()
	})
  });



program
  .command('Sat2:GetMaximosYMinimos <user> <pass> <idEquipo> <tipoDeConsulta>')
  .alias('m')
  .description('Acumulada is calculated instead of average (Promedio) for any rainfall data (Sensor name contains “Lluvia” or “Precipitacion”). All -999.9 values have been excluded from calculations. Sensors with no data for this period return “valoresSensor = [ ]”. “tipoDeConsulta” is for time period requested: 1 = Hoy, 2=Ayer, 3 = Mes actual, 4 = Mes anterior.')
  .action((user, pass, idEquipo, tipoDeConsulta) => {
	console.log("idEquipo:"+idEquipo)
	sat2.GetMaximosYMinimos(user,pass,idEquipo,tipoDeConsulta)
    .then(result=> {
	  //~ console.log(body)
	  console.log("periodo:"+result.periodo)
	  if(result.Datos) {
		  console.log("Found "+result.Datos.length+" sensores")
		  result.Datos.map( (it,index) => {
			  console.log(it)
		  })
		  pool.end()
	  }
	})
	.catch(e=>{
		console.error(e)
		pool.end()
	})
  });

program
  .command('Sat2:ReadEquipos [idEquipo...]')
  .alias('e')
  .description('Lee equipos de base de datos')
  .action( idEquipo => {
	  if(idEquipo.length == 1) {
		  idEquipo = idEquipo[0]
	  } else if (idEquipo.length == 0) {
		idEquipo = undefined
	  }  
	  CRUD.readEquipos(idEquipo)
	  .then(res=> {
		  res.map( (equipo,i) => {
			  console.log(equipo.toString())
		  })
		  console.log("Se encontraron " + res.length + " equipos")
		  pool.end()
	  })
	  .catch(e=> {
		  console.error(e)
		  pool.end()
	  })
  });

program
  .command('Sat2:DeleteEquipos [idEquipo...]')
  .alias('D')
  .description('Elimina equipos de base de datos')
  .action( idEquipo => {
	  if(idEquipo.length == 1) {
		  idEquipo = idEquipo[0]
	  } else if (idEquipo.length == 0) {
		idEquipo = undefined
	  }
	  Promise.all([CRUD.readEquipos(idEquipo), CRUD.readAsociaciones(idEquipo,null), CRUD.readDatos(idEquipo,null)])
	  .then(res=> {
		  console.log("Se encontraron " + res[0].length + " equipos, " + res[1].length + " asociaciones y " + res[2].length + " datos. Desea eliminarlos?")
		  inquirer.prompt([
			{ type: 'input', name: 'confirm', message: '(y/n)'}
		  ]).then(answers=> {
			  if(answers.confirm.match(/^[yYsStTvV1]/)) { 
				  CRUD.deleteEquipos(idEquipo)
				  .then(res=> {
					  res.map( (equipo,i) => {
						  console.log(equipo.toString())
					  })
					  console.log("Se eliminaron " + res.length + " equipos")
					  pool.end()
				  })
				  .catch(e=> {
					  console.error(e)
					  pool.end()
				  })
			  } else {
				  console.log("Abortado por el usuario")
				  pool.end()
			  }
		  })
	  })
	  .catch(e=>{
		  console.log(e)
		  pool.end()
	  })
  });

program
  .command('Sat2:ReadSensores [idSensor...]')
  .alias('s')
  .option('-j, --json','output json')
  .description('Lee sensores de base de datos')
  .action( (idSensor, cmdObj) => {
	  if(idSensor.length == 1) {
		  idSensor = idSensor[0]
	  } else if (idSensor.length == 0) {
		idSensor = undefined
	  }  
	  CRUD.readSensores(idSensor)
	  .then(res=> {
		  res.map( (sensor,i) => {
			  console.log(sensor.toString())
		  })
		  if(cmdObj.json) {
			  console.log(JSON.stringify(res,null,2))
		  } else {
			console.log("Se encontraron " + res.length + " sensores")
		  }  
		  pool.end()
	  })
	  .catch(e=> {
		  console.error(e)
		  pool.end()
	  })
  });

program
  .command('Sat2:DeleteSensores [idSensor...]')
  .alias('S')
  .description('Elimina sensores de base de datos')
  .action( idSensor => {
	  if(idSensor.length == 1) {
		  idSensor = idSensor[0]
	  } else if (idSensor.length == 0) {
		idSensor = undefined
	  }
	  Promise.all([CRUD.readSensores(idSensor), CRUD.readAsociaciones(null,idSensor), CRUD.readDatos(null,idSensor)])
	  .then(res=> {
		  console.log("Se encontraron " + res[0].length + " sensores, " + res[1].length + " asociaciones y " + res[2].length + " datos. Desea eliminarlos?")
		  inquirer.prompt([
			{ type: 'input', name: 'confirm', message: '(y/n)'}
		  ]).then(answers=> {
			  if(answers.confirm.match(/^[yYsStTvV1]/)) { 
				  CRUD.deleteSensores(idSensor)
				  .then(res=> {
					  res.map( (sensor,i) => {
						  console.log(sensor.toString())
					  })
					  console.log("Se eliminaron " + res.length + " sensores")
					  pool.end()
				  })
				  .catch(e=> {
					  console.error(e)
					  pool.end()
				  })
			  } else {
				  console.log("Abortado por el usuario")
				  pool.end()
			  }
		  })
	  })
	  .catch(e=>{
		  console.log(e)
		  pool.end()
	  })
  });

program
  .command('Sat2:ReadDatos [idEquipo] [idSensor] [fechaInical] [fechaFinal] [format]')
  .alias('d')
  .description('Lee datos históricos de base de datos')
  .action( (idEquipo, idSensor, fechaInicial, fechaFinal, format="txt") => {
      //~ if(idEquipo.length == 1) {
		  //~ idEquipo = idEquipo[0]
	  //~ } else if (idEquipo.length == 0) {
		//~ idEquipo = undefined
	  //~ }  
	  //~ if(idSensor.length == 1) {
		  //~ idSensor = idSensor[0]
	  //~ } else if (idSensor.length == 0) {
		//~ idSensor = undefined
	  //~ }  
	  CRUD.readDatos(idEquipo, idSensor, fechaInicial, fechaFinal)
	  .then(res=> {
		  if(format == 'json') {
			  console.log(JSON.stringify(res,null,2))
		  } else {
			  res.map( (dato,i) => {
				  if(format == 'csv') {
					console.log(dato.toCSV())
				  } else {
					console.log(dato.toString())
				  }
			  })
		  }
		  console.log("Se encontraron " + res.length + " datos")
		  pool.end()
	  })
	  .catch(e=> {
		  console.error(e)
		  pool.end()
	  })
  });

program
  .command('Sat2:DeleteDatos [idEquipo] [idSensor] [fechaInical] [fechaFinal]')
  .alias('S')
  .description('Elimina datos históricos de base de datos')
  .action( (idEquipo, idSensor, fechaInicial, fechaFinal) => {
      //~ if(idEquipo.length == 1) {
		  //~ idEquipo = idEquipo[0]
	  //~ } else if (idEquipo.length == 0) {
		//~ idEquipo = undefined
	  //~ }  
	  //~ if(idSensor.length == 1) {
		  //~ idSensor = idSensor[0]
	  //~ } else if (idSensor.length == 0) {
		//~ idSensor = undefined
	  //~ }
	  CRUD.readDatos(idEquipo, idSensor, fechaInicial, fechaFinal)
	  .then(res=> {
		  console.log("Se encontraron " + res.length + " datos. Desea eliminarlos?")
		  inquirer.prompt([
			{ type: 'input', name: 'confirm', message: '(y/n)'}
		  ]).then(answers=> {
			  if(answers.confirm.match(/^[yYsStTvV1]/)) { 
				  CRUD.deleteDatos(idEquipo, idSensor, fechaInicial, fechaFinal)
				  .then(res=> {
					  if(res) {
						  res.map( (dato,i) => {
							  console.log(dato.toString())
						  })
						  console.log("Se eliminaron " + res.length + " datos")
					  } else {
						  console.log("Se eliminaron 0 datos")
					  }
					  pool.end()
				  })
				  .catch(e=> {
					  console.error(e)
					  pool.end()
				  })
			  } else {
				  console.log("Abortado por el usuario")
				  pool.end()
			  }
		  })
	  })
	  .catch(e=>{
		  console.log(e)
		  pool.end()
	  })
  });

program
  .command('Sat2:ReadAsociaciones [idEquipo] [idSensor]')
  .alias('asoc')
  .description('Lee asociaciones de equipos con sensores')
  .action( (idEquipo, idSensor) => {
	  CRUD.readAsociaciones(idEquipo, idSensor)
	  .then(res=> {
		  res.map( (asoc,i) => {
			  console.log(asoc.toString())
		  })
		  console.log("Se encontraron " + res.length + " asociaciones")
		  pool.end()
	  })
	  .catch(e=> {
		  console.error(e)
		  pool.end()
	  })
  });

program
  .command('Sat2:DeleteAsociaciones [idEquipo] [idSensor]')
  .alias('Dasoc')
  .description('Elimina asociaciones de equipos con sensores')
  .action( (idEquipo, idSensor) => {
	  CRUD.readAsociaciones(idEquipo, idSensor)
	  .then(res=> {
		  console.log("Se encontraron " + res.length + " asociaciones. Desea eliminarlos?")
		  inquirer.prompt([
			{ type: 'input', name: 'confirm', message: '(y/n)'}
		  ]).then(answers=> {
			  if(answers.confirm.match(/^[yYsStTvV1]/)) { 
				  CRUD.deleteAsociaciones(idEquipo, idSensor)
				  .then(res=> {
					  res.map( (asoc,i) => {
						  console.log(asoc.toString())
					  })
					  console.log("Se eliminaron " + res.length + " asociaciones")
					  pool.end()
				  })
				  .catch(e=> {
					  console.error(e)
					  pool.end()
				  })
			  } else {
				  console.log("Abortado por el usuario")
				  pool.end()
			  }
		  })
	  })
	  .catch(e=>{
		  console.log(e)
		  pool.end()
	  })
  });

program
  .command('Sat2:GetHeatmap <idGrupo> <idSensor> [timeInt] [fechaDesde] [fechaHasta] [use] [format] [sep]')
  .alias('heatmap')
  .description('Obtiene heatmap')
  .action( (idGrupo, idSensor, timeInt, fechaDesde, fechaHasta, use, format, sep)=> {
	const heatmap = new Sat2.Heatmap( timeInt,fechaDesde,fechaHasta,idGrupo,idSensor)
	console.log(heatmap)
	CRUD.readHeatmap(heatmap, use, format, sep)
	.then(result=> {
		//~ console.log(JSON.stringify(result,null,2))
		console.log(heatmap)
		console.log("done!")
		pool.end()
	})
	.catch(e=>{
		console.error({message:"readHeatmap error",error:e})
		pool.end()
	})
  });
	

program
  .command('Sat2:makedirs')
  .alias('makedirs')
  .description('crea estructura de directorios para los reportes cuantitativos')
  .action( (cmdObj) => {
	  CRUD.readSensores()
	  .then(sensores=>{
		  CRUD.readGrupos()
		  .then(grupos=>{
			  if(!fs.existsSync('public/reportes')) {
				fs.mkdirSync('public/reportes')
			  }
			  //~ if(!fs.existsSync('public/reportes/grupos/')){
				//~ fs.mkdirSync('public/reportes/grupos/')
			  //~ }
			  grupos.map(gr=> {
				  if(!fs.existsSync('public/reportes/grupo_'+gr.idGrupo)) {
					fs.mkdirSync('public/reportes/grupo_'+gr.idGrupo)
				  }
				  sensores.map(se=>{
					  if(!fs.existsSync('public/reportes/grupo_'+gr.idGrupo+'/' + se.nombre)) { //sensor_'+se.idSensor)) {
						fs.mkdirSync('public/reportes/grupo_'+gr.idGrupo+'/' + se.nombre) // sensor_'+se.idSensor)
					  }
					  if(!fs.existsSync('public/reportes/grupo_'+gr.idGrupo+'/' + se.nombre + '/anual')) { // sensor_'+se.idSensor+'/'+'anual')) {
						  fs.mkdirSync('public/reportes/grupo_'+gr.idGrupo+'/' + se.nombre + '/anual') // sensor_'+se.idSensor+'/'+'anual')
					  }
					  if(!fs.existsSync('public/reportes/grupo_'+gr.idGrupo+'/' + se.nombre + '/mensual')) { // sensor_'+se.idSensor+'/'+'mensual')) {
						fs.mkdirSync('public/reportes/grupo_'+gr.idGrupo+'/' + se.nombre + '/mensual') // sensor_'+se.idSensor+'/'+'mensual')
					  } 
					  if(!fs.existsSync('public/reportes/grupo_'+gr.idGrupo+'/' + se.nombre + '/diario')) { // sensor_'+se.idSensor+'/'+'diario')) {
						fs.mkdirSync('public/reportes/grupo_'+gr.idGrupo+'/' + se.nombre + '/diario') // sensor_'+se.idSensor+'/'+'diario')
					  }
				  })
			  })
		  })
	  })
  });

program
  .command('Sat2:updateReportes <timeInt> <fechaDesde> <fechaHasta> [idGrupo] [idSensor]')
  .description('actualiza reportes cuantitativos')
  .action( (timeInt,fechaDesde, fechaHasta, idGrupo, idSensor) => {
	 CRUD.readSensores(idSensor)
	  .then(sensores=>{
		  //~ console.log("got sensores")
		  CRUD.readGrupos(idGrupo)
		  .then(grupos=>{
			  var promises=[] 
	 		  grupos.map(gr=> {
				  //~ console.log(gr.idGrupo)
				  sensores.map(se=>{
					  //~ console.log(se.idSensor)
					  //~ console.log("updrepcuant(" + gr.idGrupo + "," + se.idSensor + "," + timeInt + "," + fechaDesde + "," + fechaHasta + ")")
					promises.push(updrepcuant(gr,se,timeInt,fechaDesde,fechaHasta))
				  })
			  })
			  Promise.all(promises)
			  .then(files=>{
				  console.log(files.length + " files updated")
				  pool.end()
			  })
			  .catch(e=>{
				  console.log(e)
				  pool.end()
			  })
		  })
	  })
  });
	 

program
  .command('Sat2:updateCount <timeInt> <fechaDesde> <fechaHasta> [idGrupo] [idSensor]')
  .alias('updcount')
  .description('actualiza conteo de registros')
  .action( (timeInt,fechaDesde, fechaHasta, idGrupo, idSensor) => {
	  CRUD.updateCountAll(timeInt,fechaDesde,fechaHasta,idGrupo,idSensor)
	  .then(result=>{
		  console.log(JSON.stringify(result))
		  pool.end()
	  })
	  .catch(e=>{
		  console.error(e)
	  })
  });


function updrepcuant(grupo,sensor,timeInt,fechaDesde,fechaHasta) {
	return new Promise( (resolve, reject) => {
		var location = config.get('Reportes.location')
		if(!grupo.idGrupo || !sensor.idSensor || !timeInt) {
			reject("Faltan parametros")
		}
		var startdate = (fechaDesde) ? new dateparser(fechaDesde) : new Date()
		var enddate = (fechaHasta) ? new dateparser(fechaHasta) : new Date()
		var wpromises=[]
		switch(timeInt) {
			case 'anio':
				startdate.setTime(startdate.getTime()+3*3600*1000)
				enddate.setTime(enddate.getTime()+3*3600*1000)
				var startyear = startdate.getFullYear()
				var endyear = enddate.getFullYear()
				for(var i=startyear;i<=endyear;i++) {
					console.log("/grupo_" + grupo.idGrupo + "/" + sensor.nombre + "/anual/RepCuantAnual_" + i) // sensor_" + idSensor + "/anual/RepCuantAnual_" + i)
					var filename = location + "/grupo_" + grupo.idGrupo + "/" + sensor.nombre + "/anual/RepCuantAnual_" + i + ".txt"
					var filenamecsv = location + "/grupo_" + grupo.idGrupo + "/" + sensor.nombre + "/anual/RepCuantAnual_" + i + ".csv"
					var date = new Date(i,0,1)
					const heatmap = new Sat2.Heatmap(timeInt,date,date,grupo.idGrupo,sensor.idSensor)
					wpromises.push(makerepfile(heatmap,filename,'fwc'))
					wpromises.push(makerepfile(heatmap,filenamecsv,'csv'))
				}
				break;
			case 'mes':
				//~ startdate.setTime(startdate.getTime()+3*3600*1000)
				//~ enddate.setTime(enddate.getTime()+3*3600*1000)
				//~ var date = startdate
				//~ console.log("initdate:"+startdate.toString())
				for (var date= startdate; date <= enddate; date.setMonth(date.getMonth()+1)) {
					//~ console.log("date:"+date.toString())
					var sd = new Date(date)
					const heatmap = new Sat2.Heatmap(timeInt,sd,sd,grupo.idGrupo,sensor.idSensor)
					//~ console.log("date:"+date.toString())
					var year = date.getFullYear()
					var month = date.getMonth()+1
					var mes = sprintf("%04d-%02d",year,month)
					//~ console.log("date:" + date.toString() + ",mes: "+mes)
					var filename = sprintf("%s/grupo_%d/%s/mensual/RepCuantMensual_%04d%02d.txt", location, grupo.idGrupo, sensor.nombre, year, month)
					var filenamecsv = sprintf("%s/grupo_%d/%s/mensual/RepCuantMensual_%04d%02d.csv", location, grupo.idGrupo, sensor.nombre, year, month)
					wpromises.push(makerepfile(heatmap, filename, 'fwc'))
					wpromises.push(makerepfile(heatmap, filenamecsv, 'csv'))
					//~ date.setMonth(date.getMonth()+1)
				}
				break;
			case 'dia':
				startdate.setTime(startdate.getTime()+3*3600*1000)
				enddate.setTime(enddate.getTime()+3*3600*1000)
				var date = startdate
				while(date <= enddate) {
					var sd = new Date(date)
					const heatmap = new Sat2.Heatmap(timeInt,sd,sd,grupo.idGrupo,sensor.idSensor)
					var year = date.getFullYear()
					var month = date.getMonth()+1
					var day = date.getDate()
					var fecha = sprintf("%04d-%02d-%02d",year,month,day)
					var filename = sprintf("%s/grupo_%d/%s/diario/RepCuantDiario_%04d%02d%02d.txt", location, grupo.idGrupo, sensor.nombre, year, month, day)
					var filenamecsv = sprintf("%s/grupo_%d/%s/diario/RepCuantDiario_%04d%02d%02d.csv", location, grupo.idGrupo, sensor.nombre, year, month, day)
					wpromises.push(makerepfile(heatmap, filename, 'fwc'))
					wpromises.push(makerepfile(heatmap, filenamecsv, 'csv'))
					date.setTime(date.getTime()+1000*3600*24)
				}
				break;
		}
		Promise.all(wpromises)
		.then(results=>{
			var count = results.length
			//~ console.log(results)
			console.log(count + " archivos creados")
			resolve(results)
		}).catch(e=> {
			console.error(e)
			reject(e)
		})
	})
}

function makerepfile(heatmap,filename,format='fwc') {
	return new Promise ((resolve, reject) => {
		var body
		var filehandle
		CRUD.readHeatmap(heatmap, 'desc', format, ",")
		.then(result  => {
			//~ console.log(filename)
			body = result
			fs.writeFile(filename,body, (err)=>{
					if(err) {
						reject(err)
						return
					}
					//~ console.log("Archivo guardado")
					//~ console.log(filename)
					resolve(filename)
			})
		})
		.catch(e=>{
			console.log("makerepfile error")
			console.error(e)
			reject(e)
		})
	})
	//~ .catch(e=> {
		//~ throw e
		//~ console.error(e)
	//~ })
}

function dateparser(fecha) {
	if(fecha instanceof Date) {
		return fecha
	} else {
		var m = fecha.match(/\d\d\d\d\-\d\d\-\d\d\s\d\d\:\d\d/)
		var m1 = fecha.match(/\d\d\d\d\-\d\d\-\d\d/)
		if(m) {
			var s = m[0].split(" ")
			var d = s[0].split("-")
			var t = s[1].split(":")
			var date = new Date(
				parseInt(d[0]), 
				parseInt(d[1]-1), 
				parseInt(d[2]),
				parseInt(t[0]),
				parseInt(t[1])
			)
			return date - Date.prototype.getTimezoneOffset() * 60 * 1000
		} else if (m1) {
			var d = m1[0].split("-")
			//~ console.log(d)
			var date = new Date(
				parseInt(d[0]), 
				parseInt(d[1]-1), 
				parseInt(d[2]),
				0,
				0
			)
			//~ console.log(date)
			return date // - Date.prototype.getTimezoneOffset() * 60 * 1000
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

program.parse(process.argv);
