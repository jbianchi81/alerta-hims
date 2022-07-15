'use strict'

var fs = require('fs')
var fsPromises = require('promise-fs')
var sprintf = require('sprintf-js').sprintf
const { exec, execSync } = require('child_process')
var pexec = require('child-process-promise').exec;
var PromiseFtp = require("promise-ftp")
var ftp = new PromiseFtp();
//~ var Client = require('ftp')
//~ var c = new Client()
const parse = require("node-html-parser").parse;
const https = require('https');
const http = require("http")
//~ require('https').globalAgent.options.ca = require('ssl-root-cas/latest').create();
var axios = require("axios")
const xml2js = require('xml2js');
const xmlparser = new xml2js.Parser({ attrkey: "ATTR" });
const { PassThrough } = require('stream');
const { Pool, Client } = require('pg')
const config = require('config');
const pool = new Pool(config.database)
const CRUD = require('./CRUD')
const crud = new CRUD.CRUD(pool,config)
const crypto = require('crypto')
const request = require('request')
const timeSteps = require('./timeSteps')
//~ const curl = new (require( 'curl-request' ))();
const basicFtp = require('basic-ftp')
const path = require('path');
const wof = require('./wmlclient')
const printRast = require('./print_rast')
const utils = require('./utils')
const { estacion } = require('./CRUD')

var internal = {}

// Promise.allSettled polyfill

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

//

//~ internal.Accessor = class {
	//~ constructor(type, parameters) {
		//~ switch (type.toLowerCase()) {
			//~ case "gfs":
				//~ this.type = "gfs"
				//~ this.object = new internal.gfs(parameters)
				//~ this.get = this.object.getAndReadGFS
				//~ this.testConnect = this.object.testConnect
				//~ break
			//~ default:
				//~ this.type = null
				//~ this.object = null
				//~ break
		//~ }
	//~ }
	//~ printObs(format="object") {
		//~ if(!this.object) {
			//~ console.error("gfs object not instantiated")
			//~ return
		//~ }
		//~ if(!this.object.observaciones) {
			//~ console.error("no observations found")
			//~ return
		//~ }
		//~ switch(format.toLowerCase()) {
			//~ case "csv":
				//~ return this.object.observaciones.map(o=>o.toCSV()).join("\n")
				//~ break
			//~ case "txt":
				//~ return this.object.observaciones.map(o=>o.toString()).join("\n")
				//~ break
			//~ case "json":
				//~ return JSON.stringify(this.object.observaciones)
				//~ break
			//~ case "pretty":
			//~ case "pretty_json":
			//~ case "json_pretty":
				//~ return  JSON.stringify(this.object.observaciones,null,2)
				//~ break
			//~ default:
				//~ return this.object.observaciones
		//~ }
	//~ }

//~ }

internal.new = function(name) {
	if(!name) {
		return Promise.reject("name missing")
	}
	return crud.pool.query("SELECT * from accessors where name=$1",[name])
	.then(result=>{
		if(result.rows.length==0) {
			console.error("accessor not found")
			throw("accessor not found")
		}
		return new internal.Accessor({"class":result.rows[0].class, "url": result.rows[0].url, "series_tipo": result.rows[0].series_tipo, "series_source_id": result.rows[0].series_source_id, "config": result.rows[0].config, title: result.rows[0].title, upload_fields: result.rows[0].upload_fields, name: result.rows[0].name})
	})
}


internal.Accessor = class {
	constructor(fields={}) { // clase, url, series_tipo, series_source_id,config,series_id) {
		this.clase=fields.class.toLowerCase()
		this.url=fields.url
		this.series_tipo=fields.series_tipo
		this.series_source_id=fields.series_source_id
		if(! internal[this.clase]) {
			console.error("Invalid accessor class")
			return
		}
		this.engine = new internal[this.clase](fields.config)
		if(fields.series_id) {
			this.series_id = fields.series_id
			this.engine.config.series_id = fields.series_id
		}
		this.title = fields.title
		this.upload_fields = fields.upload_fields
		this.name = fields.name
		this.config = fields.config
	}
	//~ this.testConnect = 
		//~ switch (type.toLowerCase()) {
			//~ case "gfs":
				//~ this.type = "gfs"
				//~ this.object = new internal.gfs(parameters)
				//~ this.get = this.object.getAndReadGFS
				//~ this.testConnect = this.object.testConnect
				//~ break
			//~ default:
				//~ this.type = null
				//~ this.object = null
				//~ break
		//~ }
	//~ }

}

// GFS_SMN

internal.gfs_smn = class {
	constructor(config) {
		this.default_config = {
			ftp_connection_pars: {host:"", user: "", password: ""},
			localcopy: '/tmp/gfs.local-copy.grb',
			outputdir: "/tmp", 
			series_id: undefined
		}
		this.config = this.default_config
		if(config) {
			Object.keys(config).forEach(key=>{
				this.config[key] = config[key]
			})
		}
	}
	test() {
		return ftp.connect(this.config.ftp_connection_pars)
		.then( serverMessage=>{
			console.log('serverMessage:'+serverMessage)
			ftp.end()
			return true
		}).catch(e=>{
			console.error(e)
			ftp.end()
			return false
		})
	}
	get(filter,options={}) {
		console.log({options:options})
		var time = (options.time) ? options.time : 6
		return this.getAndReadGFS(time,undefined,options)
	}	
	update(filter={},options={}) {
		var time = (options.time) ? options.time : 6
		var series_id = (filter.series_id) ? filter.series_id : 2
		return this.gfs2db(crud,series_id,time,options)
	}
	async getGFS(time,output=this.config.localcopy,options={}) {
		var url = sprintf("vila/precip_%02d_gfs.grb", time)
		console.log({url:url,ftp_connection_pars:this.config.ftp_connection_pars})
		try {
			var serverMessage = await ftp.connect(this.config.ftp_connection_pars)
			console.log('serverMessage:'+serverMessage)
		} catch (e) {
			ftp.end()
			throw(e)
		}
		if(options.no_download) {
			return true
		} else {
			try {
				var read_stream = await ftp.get(url)
				console.log("got file " + url)
				await new Promise((resolve,reject)=>{
					let write_stream = fs.createWriteStream(output)
					read_stream.pipe(write_stream)
					write_stream.on('finish',resolve)
					write_stream.on('error',reject)
				})
			} catch(e) {
				ftp.end()
				throw(e)
			} 
			return ftp.end()
		}
	}

	// readBands: lee bandas de archivo GRIB, crea archivos GTIFF de cada banda y devuelve arreglo de observaciones

	readBands(input=this.config.localcopy,outputdir=this.config.outputdir,series_id) {
		return new Promise( (resolve, reject) => {
			exec('gdalinfo -json '+input, async (error, stdout, stderr) => {
				if(error) {
					console.error(error)
					reject(error)
					return
				}
				var gdalinfo = JSON.parse(stdout)
				var previous_time
				var promises=[]
				this.time_update = new Date(parseInt(gdalinfo.bands[0].metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
				console.log(gdalinfo.bands.length + " bands found")
				for(var i=0;i<gdalinfo.bands.length;i++) {
					var band = gdalinfo.bands[i]
					//~ console.log("band:"+band.band)
					//~ console.log("description:"+band.description)
					//~ console.log("comment:"+band.metadata[""].GRIB_COMMENT)
					//~ console.log("forecast_seconds:"+band.metadata[""].GRIB_FORECAST_SECONDS)
					//~ console.log("ref_time:"+band.metadata[""].GRIB_REF_TIME)
					//~ console.log("valid_time:"+band.metadata[""].GRIB_VALID_TIME)
					var ref_time = new Date(parseInt(band.metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
					var valid_time = new Date(parseInt(band.metadata[""].GRIB_VALID_TIME.split(/\s/)[0])*1000)   // timeend
					//~ console.log("ref_time:"+ref_time)
					//~ console.log("valid_time:"+valid_time)                       
					previous_time = (previous_time) ? previous_time : ref_time  //  timestart
					var interval = valid_time.getTime() - previous_time.getTime()
					//~ console.log("interval:"+interval)
					if(band.metadata[""].GRIB_ELEMENT == "APCP03") {
						var ref_time_str = ref_time.toISOString().substring(0,13).replace(/-/g,"").replace(/T/,"")
						var valid_time_str = valid_time.toISOString().substring(0,13).replace(/-/g,"").replace(/T/,"")
						var gtiff_filename = outputdir + "/precip_gfs_" + ref_time_str + "_" + valid_time_str + ".GTiff"
						execSync('gdal_translate -b ' + band.band + ' -a_srs EPSG:4326 -a_ullr -150 0 20 -90 -of GTiff ' + input + ' ' + gtiff_filename)
						execSync('gdal_edit.py -mo "UNITS=millimeters" ' + gtiff_filename)  // -scale 10800
						console.log("pushing layer " + i +", valid_time " + valid_time.toISOString())
						var obs = await this.rast2obs(gtiff_filename)
						//~ var child = exec('gdal_translate -b ' + band.band + ' -a_srs EPSG:4326 -a_ullr -150 0 20 -90 -of GTiff ' + input + ' ' + gtiff_filename)
						//~ var obs = await promiseFromChildProcess(child,gtiff_filename)
						//~ .then(filename=>{
							//~ var child2 = exec('gdal_edit.py -scale 10800 -mo "UNITS=millimeters" ' + filename)
							//~ return promiseFromChildProcess(child2,filename)
						//~ })
						//~ .then(filename=>{
							//~ console.log("Se escribió el archivo " + filename)
							//~ return this.rast2obs(filename)
						//~ })
						//~ .catch(e=>{
							//~ console.error(e.toString())
							//~ reject(e)
						//~ })
						promises.push(obs)
					}
					previous_time = valid_time
				}
				resolve(Promise.all(promises)
				.then(observaciones=>{
					console.log("got " + observaciones.length + " observaciones")
					if(series_id) {
						observaciones = observaciones.map(o=> {
							o.series_id = series_id
							//~ o.scale = 10800
							return o
						})
					}
					return observaciones
				})
				.catch(e=>{
					console.error(e)
				}))
			})
		})
	}
	rast2obs(filename) {
		return new Promise( (resolve, reject) => {
			exec('gdalinfo -json '+filename, (err, stdout, stderr)=> {
				if (err) {
					console.error(err);
					reject(err);
					return
				}
				var gdalinfo = JSON.parse(stdout)
				var band = gdalinfo.bands[0]
				var ref_time = new Date(parseInt(band.metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
				var valid_time = new Date(parseInt(band.metadata[""].GRIB_VALID_TIME.split(/\s/)[0])*1000)
				var timestart = new Date()
				timestart.setTime(valid_time.getTime() - 3*60*60*1000)
				fs.readFile(filename, 'hex', (error, data) => {
					if(error) {
						console.error("readFile error")
						reject(error)
						return
					}
					resolve({tipo:"rast",timeupdate:ref_time,timestart: timestart, timeend: valid_time, valor: '\\x' + data}) //new CRUD.observacion({tipo: "rast", series_id:series_id, timestart: previous_time, timeend: valid_time, valor: data}))
				})
			})
		})
	}

	getAndReadGFS(time,localcopy=this.localcopy,options) {
		return this.getGFS(time,localcopy,options)
		.then(()=>{
			return this.readBands(localcopy,this.outputdir,this.series_id)
			//~ const gdalinfo = spawn('gdalinfo', ['-json', localcopy])
		})
		.then(observaciones=>{
			console.log("Got " + observaciones.length + " observaciones")
			//~ observaciones.map(obs=>{
				//~ console.log(obs.timestart)
			//~ })
			this.observaciones = observaciones
			return observaciones
		})
		.catch(e=>{
			console.error(e)
		})
	}
	gfs2db(crud,series_id,time=6,options) {
		return this.getAndReadGFS(time,undefined,options)
		.then(obs=>{
			//~ console.log(arguments)
			if(series_id) {
				obs = obs.map(o=> {
					//~ o = new CRUD.observacion(o)
					o.series_id = series_id
					//~ o.scale = 10800
					//~ console.log({series_id:o.series_id,timestart:o.timestart.toISOString(),timeupdate:o.timeupdate.toISOString()})
					return o
				})
			}
			return crud.upsertObservaciones(obs)
		})
	}
}
//~ readBands(localcopy,"public/gfs/gtiff",2)

internal.wrf_smn = class { // WRF_SMN
	constructor(config) {
		this.default_config = {
			ftp_connection_pars: {host:"", user: "", password: ""},
			local_dir: 'data/wrf_smn',
			path: "/vila/prohmsat",
			series_id: 15
		}
		this.config = this.default_config
		this.ftp = new PromiseFtp()
		if(config) {
			Object.keys(config).forEach(key=>{
				this.config[key] = config[key]
			})
		}
	}
	test() {
		return this.ftp.connect(this.config.ftp_connection_pars)
		.then( serverMessage=>{
			console.log('serverMessage:'+serverMessage)
			this.ftp.end()
			return true
		}).catch(e=>{
			console.error(e)
			this.ftp.end()
			return false
		})
	}

	async get(filter,options={}) {
		try {
			await this.connect()
			if(options.no_download) {
				return true
			}
			var list = await this.getList()
			var observaciones = await this.getFiles(list,filter,options)
		} catch(e) {
			throw e
		}
		this.ftp.end()
		return observaciones
	}

	update(filter={},options={}) {
		return this.get(filter,options)
		.then(observaciones=>{
			return crud.upsertObservaciones(observaciones)
		})
	}

	async connect(ftp_connection_pars) {
		if(!ftp_connection_pars) {
			ftp_connection_pars = this.config.ftp_connection_pars
		}
		try {
			var serverMessage = await this.ftp.connect(ftp_connection_pars)
			console.log('serverMessage:' + serverMessage)
			return
		} catch (e) {
			throw e
		}
	}

	async getList(path) {
		if(!path) {
			path = this.config.path
		}
		try {
			var list = await this.ftp.list(this.config.path)
			return list
		} catch(e) {
			this.ftp.end()
			throw e
		}
	}

	async getFile(filename,skip_download) {
		try {
			var local_path = this.getLocalPath(filename)
			var output = local_path + "/" + filename
			var warped_filename = local_path + "/" + filename + "_geo.tif"
			if(!skip_download) {
				stream = await this.ftp.get(this.config.path + "/" + filename)
				console.log("got file " + this.config.path + "/" + filename)
				await this.writeStreamToFile(stream,output)
				await this.warp(output,"/tmp/wrf_b2.tif",warped_filename)
			}
			var obs = await this.rast2obs(warped_filename)
		} catch (e) {
			throw e
		}
		return obs
	}

	async getFiles(list,filter={},options={}) {
		var errors = []
		var filenames = list.map(i=>i.name)
		var observaciones = []
		for(var i=0;i<filenames.length;i++) {
			console.log(this.config.path + "/" + filenames[i])
			var forecast_date = this.getForecastDate(filenames[i])
			var valid_time = this.getValidTime(filenames[i])
			if(filter.forecast_date) {
				var ffd = new Date(filter.forecast_date)
				if(ffd.getTime() != forecast_date.getTime()) {
					console.log("skipping forecast date " + forecast_date.toISOString())
					continue
				}
			}
			if(filter.forecast_timestart) {
				var ffts = new Date(filter.forecast_timestart)
				if(forecast_date.getTime() < ffts.getTime() ) {
					continue
				}
			}
			if(filter.forecast_timeend) {
				var ffte = new Date(filter.forecast_timeend)
				if(forecast_date.getTime() > ffte.getTime() ) {
					continue
				}
			}
			if(filter.valid_time) {
				var t = parseInt(filter.valid_time)
				if(t != valid_time) {
					console.log("skipping time " + valid_time)
					continue
				}
			} else if(valid_time==0) {
				// SKIP HOUR 000 (initial state: zero rain accumulation)
				continue
			}
			try {
				var obs = await this.getFile(filenames[i],options.skip_download)
				observaciones.push(obs)
			} catch(e) {
				console.error(e)
				errors.push(e)
			}
		}
		if(errors.length && !observaciones.length) {
			throw new Error(errors)
		}
		return observaciones
	}

	getForecastDate(filename) {
		var datestring = filename.split("_")[1]
		var year = datestring.substring(0,4)
		var month = datestring.substring(4,6)
		var day = datestring.substring(6,8)
		var hour = filename.split("_")[2]
		return new Date(Date.UTC(year,month-1,day,hour))
	}

	getValidTime(filename) {
		return  parseInt(filename.split(".")[1])
	}

	getLocalPath(filename) {
		var datestring = filename.split("_")[1]
		var year = datestring.substring(0,4)
		var month = datestring.substring(4,6)
		var day = datestring.substring(6,8)
		var hour = filename.split("_")[2]
		var year_path = sprintf("%s/%04d", path.resolve(__dirname, this.config.local_dir), year)
		if(!fs.existsSync(year_path)) {
			fs.mkdirSync(year_path)
		}
		var month_path = sprintf("%s/%02d", year_path, month)
		if(!fs.existsSync(month_path)) {
			fs.mkdirSync(month_path)
		}
		var day_path = sprintf("%s/%02d", month_path, day)
		if(!fs.existsSync(day_path)) {
			fs.mkdirSync(day_path)
		}
		var hour_path = sprintf("%s/%04d", day_path, hour)
		if(!fs.existsSync(hour_path)) {
			fs.mkdirSync(hour_path)
		}
		return hour_path
	}

	writeStreamToFile(stream,output) {
		return new Promise(function (resolve, reject) {
			stream.once('close', resolve)
			stream.once('error', reject)
			stream.pipe(fs.createWriteStream(output))
		});
	}

	async warp(filename,tif_filename="/tmp/wrf_b2.tif",warped_filename="/tmp/wrf_warped.geo.tif") {
		try {
			await pexec('gdal_translate -b 2 -of GTiff ' + filename + ' ' + tif_filename)
			await pexec('gdalwarp -t_srs EPSG:4326 -of GTiff -te -70 -40 -40 -10 -overwrite ' + tif_filename + ' ' + warped_filename)
		} catch (e) {
			throw e
		}
		return
	}

	async rast2obs(filename,series_id=this.config.series_id) {
		console.log("rast2obs. filename: " + filename)
		if(!fs.existsSync(filename)) {
			throw new Error("File " + filename + " not found")
		}
		try {
			var result = await pexec('gdalinfo -json ' + filename)
			if(result.stderr) {
				console.error(result.stderr)
				throw new Error(result.stderr)
			}
			var gdalinfo = JSON.parse(result.stdout)
			var band = gdalinfo.bands[0]
			var ref_time = new Date(parseInt(band.metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
			var valid_time = new Date(parseInt(band.metadata[""].GRIB_VALID_TIME.split(/\s/)[0])*1000)
			var timestart = new Date()
			timestart.setTime(valid_time.getTime() - 1*60*60*1000)
			var data = fs.readFileSync(filename, 'hex')
			return ({
				tipo:"rast",
				series_id: series_id,
				timeupdate: ref_time,
				timestart: timestart, 
				timeend: valid_time, 
				valor: '\\x' + data
			})
		} catch (e) {
			throw e
		}
	}
}


internal.ecmwf_mensual = class {
	constructor(config) {
		this.default_config = {
			localcopy: '/tmp/ecmwfMensual.grib',
			outputdir: "../data/cds", 
			series_id: 6, // 7
			url: "https://cds.climate.copernicus.eu/api/v2",
			key: "userid:userkey",
			variable: 'total_precipitation',// 'total_precipitation_anomalous_rate_of_accumulation'
			dataset: 'seasonal-monthly-single-levels' // 'seasonal-postprocessed-single-levels'
		}
		this.config = this.default_config
		if(config) {
			Object.keys(config).forEach(key=>{
				this.config[key] = config[key]
			})
		}
	}
	test() {
		return this.getCDS('ecmwf',2020,7,'/tmp/cds_test.grib',this.config.dataset,this.config.variable)
	}
	get(filter,options) {
		var date = (filter.date) ? new Date(filter.date) : new Date()
		var anio = date.getUTCFullYear(date)
		var mes = date.getUTCMonth() + 1
		var rval
		var output = (filter.file) ? filter.file : __dirname + "/" + this.config.outputdir + "/ecmwf_" + sprintf("%04d%02d",anio,mes) + ".grib"
		if(options.no_download) {
			if(filter.file) {
				rval = Promise.resolve(output)
			} else {
				rval = Promise.resolve(output)
			}
		} else {
			rval = this.getCDS('ecmwf',anio,mes,output,this.config.dataset,this.config.variable) 
		}
		return rval
		.then(localcopy=>{
			return this.readBands(localcopy,filter.outputdir,6)
		})
	}
	update(filter={},options={}) {
		var date = (filter.date) ? new Date(filter.date) : new Date()
		var anio = date.getUTCFullYear(date)
		var mes = date.getUTCMonth() + 1
		var rval
		var output = (filter.file) ? filter.file : __dirname + "/" + this.config.outputdir + "/ecmwf_" + sprintf("%04d%02d",anio,mes) + ".grib"
		if(options.no_download) {
			if(filter.file) {
				rval = Promise.resolve(output)
			} else {
				rval = Promise.resolve(output)
			}
		} else {
			rval = this.getCDS('ecmwf',anio,mes,output,this.config.dataset,this.config.variable) 
		}
		return rval
		.then(localcopy=>{
			var series_id = (filter.series_id) ? filter.series_id : this.config.series_id
			return this.readBands(localcopy,__dirname + "/" + this.config.outputdir,series_id)
		})
		.then(obs=>{
			if(filter.series_id) {
				obs = obs.map(o=> {
					o.series_id = series_id
					return o
				})
			}
			return crud.upsertObservaciones(obs)
		})
	}
	
	getCDS(producto,anio,mes,output,dataset,variable) {
		return new Promise((resolve,reject)=>{
			output = (output) ? output : __dirname + "/" + this.config.outputdir + "/" + producto + "_" + sprintf("%04d%02d",anio,mes) + ".grib"
			//~ console.log({output:output})
			return exec('python3 ' + __dirname + '/../py/prueba_ecmwf.py ' + producto + ' ' + anio + ' ' + mes + ' ' + output + ' ' + dataset + ' ' + variable, (error, stdout, stderr)=>{
				if(error) {
					console.error(error)
					reject(error)
					return
				}
				resolve(output)
			})
		})
	}

	// readBands: lee bandas de archivo GRIB, crea archivos GTIFF de cada banda y devuelve arreglo de observaciones

	readBands(input=this.config.localcopy,outputdir=__dirname + "/" + this.config.outputdir,series_id) {
		return new Promise( (resolve, reject) => {
			exec('gdalinfo -json '+input, async (error, stdout, stderr) => {
				if(error) {
					console.error(error)
					reject(error)
					return
				}
				var jsonfile = stdout.replace(/^[.\s\S]*?\{/,"{")
				//~ console.log(jsonfile)
				var gdalinfo
				try {
					gdalinfo = JSON.parse(jsonfile)
				} catch(e) {
					reject(e)
					return
				}
				var previous_time
				var promises=[]
				this.time_update = new Date(parseInt(gdalinfo.bands[0].metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
				for(var i=0;i<gdalinfo.bands.length;i++) {
					var band = gdalinfo.bands[i]
					var ref_time = new Date(parseInt(band.metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
					var valid_time = new Date(parseInt(band.metadata[""].GRIB_VALID_TIME.split(/\s/)[0])*1000)   // timeend
					//~ console.log("ref_time:"+ref_time)
					//~ console.log("valid_time:"+valid_time)                       
					previous_time = (previous_time) ? previous_time : ref_time  //  timestart
					var previous_time_str = new Date(previous_time.getTime() + 3*3600*1000).toISOString().substring(0,8).replace(/-/g,"")
					var interval = valid_time.getTime() - previous_time.getTime()
					var interval_days = interval/1000/3600/24
					var scale = 1000*60*60*24*interval_days
					console.log("interval:"+interval)
					if(band.metadata[""].GRIB_ELEMENT == "var228") {
						var ref_time_str = ref_time.toISOString().substring(0,13).replace(/-/g,"").replace(/T/,"")
						var valid_time_str = valid_time.toISOString().substring(0,13).replace(/-/g,"").replace(/T/,"")
						var gtiff_filename = outputdir + "/precip_ecmwfMensual_" + ref_time_str + "_" + previous_time_str + ".GTiff"
						try {
							execSync('gdal_translate -b ' + band.band + ' -a_srs EPSG:4326 -a_ullr -70 -10 -40 -40 -of GTiff ' + input + ' ' + gtiff_filename)
							execSync('gdal_edit.py -scale ' + scale + ' -offset 0 -mo "UNITS=millimeters" ' + gtiff_filename)
							var obs = await this.rast2obs(gtiff_filename,series_id,previous_time,valid_time,ref_time,scale)
						} 
						catch (e) {
							reject(e)
						}
						
						promises.push(obs)
					}
					previous_time = valid_time 
				}
				resolve(Promise.all(promises)
				.then(observaciones=>{
					console.log("got " + observaciones.length + " observaciones")
					observaciones = observaciones.map(o=> {
						if(series_id) {
							o.series_id = series_id
						}
						return o
					})
					return observaciones
				})
				.catch(e=>{
					console.error(e)
				}))
			})
		})
	}
	rast2obs(filename,series_id=this.config.series_id,timestart,timeend,time_update,scale) {
		return new Promise( (resolve, reject) => {
			exec('gdalinfo -json '+filename, (err, stdout, stderr)=> {
				if (err) {
					console.error(err);
					reject(err);
					return
				}
				var jsonfile = stdout.replace(/^.*\{/,"{")
				var gdalinfo = JSON.parse(jsonfile)
				var band = gdalinfo.bands[0]
				//~ var ref_time = new Date(parseInt(band.metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
				//~ var valid_time = new Date(parseInt(band.metadata[""].GRIB_VALID_TIME.split(/\s/)[0])*1000)
				//~ var forecast_time = parseInt(band.metadata[""].GRIB_FORECAST_SECONDS.split(/\s/)[0])*1000
				//~ start_time.setTime(valid_time)
				//~ timestart.setTime(timestart.getTime() - 3*60*60*1000)
				//~ timeend.setTime(timeend.getTime() - 3*60*60*1000)
				fs.readFile(filename, 'hex', (error, data) => {
					if(error) {
						console.error("readFile error")
						reject(error)
						return
					}
					resolve({tipo:"rast",series_id: series_id, timeupdate:time_update,timestart: timestart, timeend: timeend, scale: scale, valor: '\\x' + data}) //new CRUD.observacion({tipo: "rast", series_id:series_id, timestart: previous_time, timeend: valid_time, valor: data}))
				})
			})
		})
	}
}

internal.atucha = class {
	constructor(config) {
		this.config = config
	}
	get(filter,options) {
		var file
		if(!filter.file) {
			file = __dirname + "/" + this.config.file
		} else {
			file = filter.file
		}
		return this.read_atucha_xls(file)
	}

	update(filter,options) {
		var file
		if(!filter.file) {
			file = __dirname + "/" + this.config.file
		} else {
			file = filter.file
		}
		return this.read_atucha_xls(file)
		.then(obs=>{
			return crud.upsertObservaciones(obs,"puntual",this.config.series_id)
		})
	}
	
	read_atucha_xls(filename,format) {
		return pexec('ssconvert -T Gnumeric_stf:stf_assistant -O separator=";" ' + filename + " fd://1")
		.then(result=>{
			var csv = result.stdout
			var data = csv.split("\n")
			var header = data.shift()
			data = data.map(row=>{            
				console.log(row)
				return row.split(";").map(e=>e.replace(/\"/g,"")) // JSON.parse("[" + row + "]")
			})
			var obs = data.map(row=>{
				var date = new Date(row[0])
				var value
				if(row[1]) {
					if(typeof row[1] == "string") {
						value = parseFloat(row[1].replace(",","."))
					} else {
						value = row[1]
					}
				} 
				return [date,date,value]
			}).filter(row=> row[0].toString() != "Invalid Date")
			if(format=="csv") {
				return obs.map(row=>{
					return [row[0].toISOString(),row[1].toISOString(),row[2]].join(",")
				}).join("\n")
			} else {
				obs = obs.map(row=>{
					return {
						timestart: row[0],
						timeend: row[1],
						valor: row[2],
						series_id: this.config.series_id
					}
				})
				if(format=="json") {
					return JSON.stringify(obs.map(o=>{
						o.timestart = o.timestart.toISOString()
						o.timeend = o.timeend.toISOString()
						return o
					}))
				} else {
					return obs
				}
			}
		})
	}
}

internal.delta_mensual = class {
	constructor(config) {
		this.config = config
	}
	get(filter,options) {
		var file
		if(!filter.file) {
			file = __dirname + "/" + this.config.file
		} else {
			file = filter.file
		}
		return this.read_xls(file)
	}

	update(filter,options) {
		var file
		if(!filter.file) {
			file = __dirname + "/" + this.config.file
		} else {
			file = filter.file
		}
		return this.read_xls(file)
		.then(corrida=>{
			return crud.upsertCorrida(corrida)
		})
		.then(result=>{
			return this.refresh_alturas_mensuales_prono()
			.then(()=>{
				return result
			})
		})
	}
	
	refresh_alturas_mensuales_prono() {
		return crud.pool.query("REFRESH MATERIALIZED VIEW alturas_mensuales_prono_view")
	}

	read_xls(filename,format) {
		return pexec('ssconvert -T Gnumeric_stf:stf_assistant -O separator=";" ' + filename + " fd://1")
		.then(async result=>{
			var csv = result.stdout
			var data = csv.split("\n")
            var header = []
            var vrow_0 = this.config.first_data_row // 9
			for(var i=1;i<vrow_0;i++) {
                header.push(data.shift())
            }
            var forecast_date = new Date()
            forecast_date = new Date(forecast_date.getUTCFullYear(),forecast_date.getUTCMonth(),forecast_date.getUTCDate())
            var corrida = {
                cal_id: this.config.cal_id,
                forecast_date: forecast_date.toISOString(),
                series:[]
            }
            var date_0 = new Date(forecast_date.getUTCFullYear(),forecast_date.getUTCMonth(),1)
            var date_1 = new Date(forecast_date.getUTCFullYear(),forecast_date.getUTCMonth()+1,1)
            var date_2 = new Date(forecast_date.getUTCFullYear(),forecast_date.getUTCMonth()+2,1)
            var date_3 = new Date(forecast_date.getUTCFullYear(),forecast_date.getUTCMonth()+3,1)
            var vcol_0 = this.config.first_data_column // 7
            var vcol_1 = vcol_0 + 1
            var vcol_2 = vcol_0 + 2
            for(var i=0;i<=11;i++) {
				if(!this.config.estacion_id_list[i]) {
					console.error("Fin de estacion_id_list")
					continue
				}
                var row = data.shift()
                row = row.split(";").map(d=>d.replace(/\"/g,"").replace(",","."))
				// console.log({row:row})
                try {
                    var series = await crud.getSeries("puntual",{estacion_id:this.config.estacion_id_list[i],var_id:33,proc_id:8},{no_metadata:true})
                } catch (e) {
                    console.error("accessors/delta_mensual:" + e.toString())
                    break
                }    
                if(!series || series.length == 0) {
                    console.error("accessors/delta_mensual:No se encontró serie para estacion_id:" + this.config.estacion_id_list[i])
                    break
                }
				// console.log({series:series})
                corrida.series.push({
                    series_id: series[0].id,
                    estacion_id: series[0].estacion_id,
                    var_id: series[0].var_id,
                    pronosticos: [
                        {
                            timestart: date_0.toISOString(),
                            timeend: date_1.toISOString(),
                            valor: parseFloat(parseFloat(row[vcol_0]).toFixed(2)),
                            qualifier: "main"
                        },
                        {
                            timestart: date_1.toISOString(),
                            timeend: date_2.toISOString(),
                            valor: parseFloat(parseFloat(row[vcol_1]).toFixed(2)),
                            qualifier: "main"
                        },
                        {
                            timestart: date_2.toISOString(),
                            timeend: date_3.toISOString(),
                            valor: parseFloat(parseFloat(row[vcol_2]).toFixed(2)),
                            qualifier: "main"
                        }
                    ]
                })
            }
			return corrida
		})
	}
}

internal.telex = class {
	constructor(config) {
		this.config = config
	}
	test() {
		return fsPromises.access(__dirname + "/" + this.config.file)
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
	}
	get(filter,options) {
		return this.getTelex(filter.timestart,filter.estacion_id,filter.file)
	}
	update(filter,options) {
		return this.getTelex(filter.timestart,filter.estacion_id,filter.file)
		.then(data=>{
			var observaciones  = data[0].map(d=> {
				var obs = new CRUD.observacion(d)
				  //~ console.log(obs.toString())
				return obs
			}) // .filter(o=> parseFloat(o.valor).toString()!=='NaN')
			if(data[1]) {
				console.log({corrida:data[1]})
				return Promise.all([crud.upsertObservaciones(observaciones,"puntual"),crud.upsertCorrida(data[1])])
			} else {
				return crud.upsertObservaciones(observaciones,"puntual")
			}
		})
	}


	getTelex(startdate,id_list,file) { // donde YYYY-MM-DD es la fecha inicial (opcional, si se omite actualiza desde el comienzo del año), id1,id2,... son id de estaciones a actualizar (opcional, si se omite se actualizan todas las estaciones). Si no se ingresa fecha lee el archivo completo.\n";
		if(!file) {
			file = __dirname + "/" + this.config.file
		}
		if(id_list) {
			if(Array.isArray(id_list)) {
				id_list = id_list.map(i=>parseInt(i))
			} else {
				id_list = [parseInt(id_list)]
			}
		}
		var ahora = new Date();
		// print "Corriendo read_telex.pl. $ahora\n";
		if(!file) {
			if(!this.config.file) {
				return Promise.reject("Falta file")
			} else {
				file  = this.config.file
			}
		}
		var rows_h=[]
		var rows_q=[ 80, 81, 82, 83, 84, 85, 87, 90, 96] // //números de fila de caudales Telex ... SAFE no por ahora (curva de gasto problem!) 92,
		var rows_Q=[ 89,94,95,98, 99, 100, 101, 102] // números de fila de caudales (estaciones sin altura) Telex
		for(var i=0;i<=104;i++) {
			if(i>=2 && i<=44 || i>=46 && i<=47 || i>=49 && i<=78 || i>=103 && i<=104 ){ // números de fila de alturas Telex   .... PILCO desactivado!!!! 2018/07/13, SFER DESACTIVADO 2020/10/02
				rows_h.push(i)
			}
		}

	//~ my %rows_h=map{$_ => 1} @rows_h;
	//~ my %rows_q=map{$_ => 1} @rows_q;
	//~ my %rows_Q=map{$_ => 1} @rows_Q;

		startdate = (startdate) ? new Date(startdate) : new Date(ahora.getFullYear(),0,1)

		//~ var @selectbyid = (id_list) ? id_l;
	//~ if(defined $args[1])
	//~ {
		 //~ @selectbyid=split(/,/,$args[1]);
	//~ }
	//~ my %selectbyid=map{$_ => 1} @selectbyid;	

		var ids=[-1,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,47,48,49,50,51,52,53,54,-1,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,99,84,46,-1,61,65,68,72,77,78,-1,8,-1,104,19,-1,30,-1,87,88,55,-1,91,92,93,94,95,85,86]  // SFER DESACTIVADO!
		var q_ids=[-1,857,858,859,860,861,862,863,864,865,866,867,868,869,870,871,872,873,874,875,876,877,878,879,880,881,882,883,884,885,886,887,888,889,890,891,892,893,894,896,897,898,899,900,901,902,903,-1,905,906,907,908,909,910,911,912,913,914,915,916,917,918,919,920,921,922,923,924,925,926,927,928,929,930,931,948,933,895,-1,910,914,917,921,926,927,-1,857,-1,953,868,-1,879,-1,936,937,904,-1,940,941,942,943,944,934,935]
		var h_sim_ids=[-1,-1,3051,-1,-1,-1,-1,-1,-1,-1,-1,-1,1540,3523,-1,9618,3524,3526,-1,3527,-1,-1,3408,1542,3409,3419,3411,3412,3413,3414,3415,3416,3418,3510,3405,3398,5985,3397,3420,-1,-1,3400,3399,3401,-1,-1,-1,-1,-1,3127,-1,-1,-1,3273,-1,-1,-1,7828,-1,3272,7824,-1,-1,-1,3271,-1,-1,-1,-1,-1,7834,7836,-1,3270,-1,-1,-1,5982,-1,3273,7828,7824,3271,-1,7834,-1,-1,-1,-1,1540,-1,1542,-1,3265,1531,1525,-1,3104,-1,3159,-1,-1,-1,-1]
		var q_sim_ids=[-1,-1,3050,-1,-1,-1,-1,-1,-1,-1,-1,-1,1538,-1,-1,9617,-1,-1,-1,-1,-1,-1,3462,1544,3463,1459,3465,3466,3467,3468,3469,3470,3472,3509,3459,3452,-1,3451,3474,-1,-1,3454,3453,3455,-1,-1,-1,-1,-1,3126,-1,-1,-1,3266,-1,-1,-1,1509,-1,3267,7823,-1,-1,-1,3268,-1,-1,-1,-1,-1,7833,7835,-1,3269,-1,-1,-1,5987,-1,3266,1509,7823,3268,-1,7833,-1,-1,-1,-1,1538,-1,1544,-1,1414,1533,1526,-1,3103,-1,1415,-1,-1,-1,-1]

			return new Promise( ( resolve, reject)=> {
				exec('ssconvert -S -O locale=en_US.utf8 '+file+' /tmp/telex.txt', (err,stdout,stderr) => { // ssconvert -S -O "locale=en_US.utf8 separator=, quoting-mode=never" '+input+' /tmp/Paraguay_09.txt', (err,stdout,stderr) => {
					if(err) {
						console.error(err)
						reject(err)
						return
					}
					//~ console.log(`stdout: ${stdout}`);
					//~ console.error(`stderr: ${stderr}`);
					resolve(fsPromises.readFile('/tmp/telex.txt.0',{encoding:'ascii'}))
				})
			})
			.then(data=>{
				console.log("txt file read at " + new Date())
				var data = data.split("\n").map(r=> r.split(","))
				var dates=data[0].map(d=>new Date(d)) //.filter(d=> /\d+/.test(d))
				//~ console.log(dates)
				var observaciones=[]
				var series_prono={}
				for(var h=1;h<data.length;h++) {
					//~ console.log({h:h})
					if(!ids[h]) {
						console.log("last, breaking loop")
						break
					}
					if(id_list) {
						if(!id_list.includes(ids[h])) {
							continue
						}
					}
					for(i=1;i<data[h].length;i++)
					{
			//~ $a[$i]=~s/\"//g;
						if(!/\d+/.test(data[h][i])) {
							continue
						}
						if(i==6) {
							continue
						}
						if(!dates[i]) {
							continue
						}
						if(dates[i].toString() == "Invalid Date") {
							continue
						}
						var date=dates[i] 
						if(date<startdate) {
							continue
						}
						if(rows_h.includes(h+1))
						{
							var H=data[h][i]/100
							if(date > ahora) {
								if(h_sim_ids[h] != -1) {
									if(! series_prono[h_sim_ids[h]]) {
										series_prono[h_sim_ids[h]] = {
											series_table: "series",
											series_id: h_sim_ids[h],
											pronosticos: [{timestart:date,timeend:date,valor:H}]
										}
									} else {
										series_prono[h_sim_ids[h]].pronosticos.push({timestart:date,timeend:date,valor:H})
									}
								}
							} else {
								observaciones.push({series_id:ids[h],timestart:date,timeend:date,valor:H})
							}
						}
						else if(rows_q.includes(h+1))
						{
							var Q = data[h][i]
							if(date > ahora) { 
								if(q_sim_ids[h] != -1) {
									if(! series_prono[q_sim_ids[h]]) {
										series_prono[q_sim_ids[h]] = {
											series_table: "series",
											series_id: q_sim_ids[h],
											pronosticos: [{timestart:date,timeend:date,valor:Q}]
										}
									} else {
										series_prono[q_sim_ids[h]].pronosticos.push({timestart:date,timeend:date,valor:Q})
									}
								}
							} else {
								observaciones.push({series_id: q_ids[h],timestart:date,timeend:date,valor:Q})
							}
						}
						else if(rows_Q.includes(h+1))
						{
							var Q=data[h][i];
							if(date > ahora) { 
								if(q_sim_ids[h] != -1) {
									if(! series_prono[q_sim_ids[h]]) {
										series_prono[q_sim_ids[h]] = {
											series_table: "series",
											series_id: q_sim_ids[h],
											pronosticos: [{timestart:date,timeend:date,valor:Q}]
										}
									} else {
										series_prono[q_sim_ids[h]].pronosticos.push({timestart:date,timeend:date,valor:Q})
									}
								}
							} else {
								observaciones.push({series_id: q_ids[h],timestart:date,timeend:date,valor:Q})
							}
						}
					}
				}
				var series_prono_ids = Object.keys(series_prono)
				if(series_prono_ids.length>0) {
					var corrida = {
						cal_id: 429,
						forecast_date: new Date(ahora.getFullYear(),ahora.getMonth(),ahora.getDate()),
						series: series_prono_ids.map(id=> series_prono[id])
					}
					return [observaciones,corrida]
				} else {
					return [observaciones,null]
				}
			})
		//~ })
	}
}

internal.paraguay09 = class {
	constructor(config) {
		this.config = config
	}
	test() {
		return fsPromises.access(__dirname + "/" + this.config.file)
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
	}
	get(filter,options) {
		return this.getParaguay09(filter.timestart,filter.timeend,filter.file)
	}
	update(filter,options) {
		return this.getParaguay09(filter.timestart,filter.timeend,filter.file)
		.then(data=>{
			var observaciones  = data.map(d=> {
				var obs = new CRUD.observacion(d)
				  //~ console.log(obs.toString())
				return obs
			}) // .filter(o=> parseFloat(o.valor).toString()!=='NaN')
			return crud.upsertObservaciones(observaciones)
		})
	}	

	getParaguay09(startDate,endDate=new Date(), input= __dirname + "/" + this.config.file) {
		// get Paraguay alturas from borus at win "/mount/win/CRITICO/Alerta/Planillas_Juan_Borús/Paraguay_09.xls"
		
		if(startDate) {
			startDate = toDate(startDate)
		}
		endDate = toDate(endDate)
		var filename = '/tmp/Paraguay_09.txt.1'
		return new Promise( ( resolve, reject)=> {
			exec('ssconvert -S -O "locale=en_US.utf8 separator=, quoting-mode=never" '+input+' /tmp/Paraguay_09.txt', (err,stdout,stderr) => {
				if(err) {
					console.error(err)
					reject(err)
					return
				}
				console.log(`stdout: ${stdout}`);
				console.error(`stderr: ${stderr}`);
				//~ promiseFromChildProcess(child,filename)
		//~ .then(filename=>{
			//~ var filename = '/tmp/Paraguay_09.csv.1'
			//~ console.log("xls converted, waiting 3 seconds to read file at " + new Date())
			//~ return delay(3000)
		//~ })
		//~ .then(() => {
				resolve(fsPromises.readFile(filename,{encoding:'ascii'}))
			})
		})
		.then(data=>{
			console.log("csv file read at " + new Date())
			var observaciones = []
			var data = data.split("\n").map(r=> r.split(","))
			for(var i = 0;i < data.length;i++) {
				var r = data[i]
				if(! /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(r[0])) { continue }
				var d = r[0].split("/")
				var date = new Date(d[0],d[1]-1,d[2])
				if(startDate) {
					if(date < startDate) { continue }
				}
				if(date > endDate) { continue }
				var sids = [153,155,55,57] // series_id de altura hidrométrica de bneg, pcon, pilc y form
				//~ console.log(r)
				for(var j=0;j<sids.length;j++) {
					if(! /^\d+\.?\d*$/.test(r[j+1])) { continue }
					observaciones.push({tipo: "puntual", series_id:sids[j], timestart: date, timeend: date, valor: Math.round(r[j+1])/100})
				}
				if (r[5] != "") { 
					console.log("Found HOY")
					break
				}
			}
			return observaciones
		})
		.catch(e => {
			console.error(e)
		})
	}
}

internal.prefe = class {
	constructor(config) {
		this.config = config
	}
	//~ init() {
		//~ return crud.getSeries("puntual",{var_id:2,proc_id:1,tabla:"alturas_prefe"})
		//~ .then(result=>{
			//~ this.seriesMap = {}
			//~ result.forEach(s=>{
				//~ this.seriesMap[s.estacion_id] = s
			//~ })
			//~ return true
		//~ })
		//~ .catch(e=>{
			//~ console.error(e.toString)
			//~ return false
		//~ })
	//~ }
		

	test() {
		return new Promise( (resolve,reject) => {
			process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
			https.get("https://192.231.120.130/alturas", (res) => {
				process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1
				console.log("got server response code:" + res.statusCode)
				resolve(true)
			}).on('error', function(e) {
			    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1
				console.log("Got error: " + e.message);
				resolve(false)
			});
		})
	}
	get(filter,options) {
		return this.getPrefe(filter.estacion_id)
	}
	update(filter,options) {
		return this.getPrefe(filter.estacion_id,filter.timestart,filter.timeend)
		then(data=>{
			var observaciones  = data.map(d=> {
				var obs = new CRUD.observacion(d)
				  //~ console.log(obs.toString())
				return obs
			}) // .filter(o=> parseFloat(o.valor).toString()!=='NaN')
			return crud.upsertObservaciones(observaciones)
		})
	}	

	getPrefe(estacion_id,timestart,timeend) {
		return crud.getSeries("puntual",{estacion_id:estacion_id,var_id:2,proc_id:1,tabla:"alturas_prefe"})
		.then(series=>{
			if(series.length==0) {
				throw("Serie no encontrada")
			}
			var serie = series[0]
			//~ var series = this.seriesMap[estacion_id]
			//~ console.log({series:series})
		//~ if(!series) {
			//~ return Promise.reject("series no encontrada")
		//~ }
		//~ return pool.query("SELECT estaciones.id_externo,series.id series_id FROM estaciones,series WHERE estaciones.unid=$1 AND estaciones.unid=series.estacion_id AND series.var_id=2 AND series.proc_id=1 AND estaciones.tabla='alturas_prefe'",[unid])
		//~ .then(result=>{
			//~ if(!result.rows) {
				//~ console.error("series not found")
				//~ throw "series not found"
				//~ return
			//~ }
			//~ if(result.rows.length==0) {
				//~ console.error("unid not found")
				//~ throw "unid not found"
				//~ return
			//~ }
			process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
			return new Promise ( (resolve, reject) => {
				https.get("https://192.231.120.130/alturas/?page=historico&tiempo=7&id="+serie.estacion.id_externo, (res) => {
				  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 1
				  //~ console.log('statusCode:', res.statusCode);
				  //~ console.log('headers:', res.headers);
				  var htmlstring = ""
				  res.on('data', (d) => {
					  htmlstring += d.toString()
					  //~ console.log("data: " + d.toString())
				  })
				  res.on('end', () => {
					  var root = parse(htmlstring);
					  var rows = root.querySelectorAll("table.fpTable tr")
					  var obs = []
					  for(var i=0;i<rows.length;i++) {
						  var r=rows[i]
					  //~ rows.forEach( r=>{
						  var cols = r.querySelectorAll("td")
						  if(cols.length>0) {
							  //~ console.log(date.text)
							  //~ var value = r.querySelector("td:nth-child(2)")
							//~ console.log("date: "+cols[0].text +", value: "+cols[1].text)
							var date = new Date(cols[0].text.replace(/^\s+/,"").replace(/\s$/,"").replace(/\s+/,"T") + ":00")
							var value = parseFloat(cols[1].text.replace(/^\s+/,"").replace(/\s.+$/,""))
							if(timestart) {
								if(date < timestart) {
									continue;
								}
							}
							if(timeend) {
								if(date > timeend) {
									continue;
								}
							}
							obs.push({tipo: "puntual", series_id: serie.id, timestart:date, timeend: date, valor: value})
						  }
					  }
					  resolve(obs)
				  });

				}).on('error', (e) => {
				  console.error(e);
				  reject(e)
				});
			})
		})
		.catch(e=>{
			console.error(e.toString())
			return
		})
	}
}

internal.alturas_pna = class {    //SFER eliminado 2020/10/02!! ver config.site_codes
	constructor(config) {
		this.config = config
	}
	test() {
		return fsPromises.access(__dirname + "/" + this.config.file)
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
	}
	get(filter,options) {
		return this.convertAndReadObs(filter.file)	
	}
	update(filter,options) {
		return this.convertAndReadObs(filter.file)	
		.then(data=>{
			var observaciones  = data.map(d=> {
				var obs = new CRUD.observacion(d)
				  //~ console.log(obs.toString())
				return obs
			}) // .filter(o=> parseFloat(o.valor).toString()!=='NaN')
			return crud.upsertObservaciones(observaciones)
		})
	}
	convertAndReadObs(file) {
		if(!this.config) {
			return Promise.reject("config missing")
		}
		return crud.pool.query("select nombre,unid estacion_id,series.id series_id from estaciones,series where tabla='alturas_prefe' and series.estacion_id=unid and series.var_id=2 and series.proc_id=1 and series.unit_id=11 order by unid")
		.then(result=>{
			if(!result) {
				throw("query error")
			}
			var series_map = {}
			result.rows.forEach(r=>{
				series_map[r.estacion_id] = r.series_id
			})
		
			if(!file) {
				file = __dirname + this.config.file
			}
			var csvFile = (this.config.csvFile) ? __dirname + "/" + this.config.csvFile : "/tmp/alturas_pna.csv"
			return new Promise( ( resolve, reject)=> {
				exec("ssconvert -S --export-type=Gnumeric_stf:stf_assistant -O 'quoting-mode=never separator=,' " + file + ' ' + csvFile, (err,stdout,stderr) => { // ssconvert -S -O "locale=en_US.utf8 
					if(err) {
						console.error(err)
						reject(err)
						return
					}
					//~ console.log(`stdout: ${stdout}`);
					//~ console.error(`stderr: ${stderr}`);
					resolve(fsPromises.readFile(csvFile + ".0",{encoding:'utf-8'}))
				})
			})
			.then(contents=>{
				//~ console.log({contents:contents})
				var data = contents.split(/\n/).map(row=> row.split(/,/))
				var date_row
				for(var i=0;i<data.length;i++) {
					if(data[i][0].replace(/^\s+|\s+$/g,'').toLowerCase() == "estacion") {
						date_row=i
					}
				}
				if(!date_row) {
					throw("date row not found")
				}
				var dates = this.config.data_columns.map(col=>data[date_row][col]).map(date=>new Date(date))
				dates.forEach(date=>{
					if(date.toString() == 'Invalid Date') {
						throw("Invalid date")
					}
				})
				var obs = []
				data.forEach(row=>{
					if(row[0] == "") {
						return
					}
					//~ console.log("nombre: "+row[0])
					if(!this.config.site_codes[row[0]]) {
						//~ console.log("nombre no encontrado")
						return
					}
					var estacion_id = this.config.site_codes[row[0]]
					var series_id = series_map[estacion_id]
					this.config.data_columns.forEach((col,i)=>{
						if(row[col] && row[col].toString() != "" && row[col].toString() != "S//E") {
							var altura = parseInt(row[col])  // altura en centímetros
							if(altura.toString == "NaN") {
								console.error(row[0] + ". altura invalida")
							} else {
								obs.push({"series_id": series_id, "timestart":dates[i], "timeend":dates[i], valor: altura*0.01})
							}
						}
					})
				})
				return obs
			})
		}) 
	} 

}

internal.eby = class {
	constructor(config) {
		this.config = config
	}
	test() {
		return fsPromises.access(__dirname + "/" + this.config.file)
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
	}
	get(filter,options) {
		return this.convertAndReadObs(filter.file)	
	}
	update(filter,options) {
		return this.convertAndReadObs(filter.file)	
		.then(results=>{
			//~ console.log({obs:results[0],corrida1:results[1][0],corrida2:results[1][1]})
			var observaciones  = results[0].map(d=> {
				var obs = new CRUD.observacion(d)
				  //~ console.log(obs.toString())
				return obs
			}) // .filter(o=> parseFloat(o.valor).toString()!=='NaN')
			
			return Promise.all([crud.upsertObservaciones(observaciones),crud.upsertCorrida(results[1][0]),crud.upsertCorrida(results[1][1])])
		})
	}
	convertAndReadObs(file) {
		if(!this.config) {
			return Promise.reject("config missing")
		}
		if(!file) {
			file = __dirname + this.config.file
		}
		var csvFile = (this.config.csvFile) ? __dirname + "/" + this.config.csvFile : "/tmp/eby.csv"
		return new Promise( ( resolve, reject)=> {
			exec("ssconvert -S --export-type=Gnumeric_stf:stf_assistant -O 'quoting-mode=never separator=,' " + file + ' ' + csvFile, (err,stdout,stderr) => { // ssconvert -S -O "locale=en_US.utf8 
				if(err) {
					console.error(err)
					reject(err)
					return
				}
				//~ console.log(`stdout: ${stdout}`);
				//~ console.error(`stderr: ${stderr}`);
				resolve(fsPromises.readFile(csvFile + ".0",{encoding:'utf-8'}))
			})
		})
		.then(contents=>{
			var data = contents.split(/\n/).map(row=> row.split(/,/))
			var obs_date = new Date(data[this.config.data_row][this.config.date_column])
			if(obs_date.toString() == "Invalid Date") {
				throw("Invalid date on row " + this.config.data_row + ", column " + this.config.date_column)
			}
			var obs = []
			var prono = []	
			Object.keys(this.config.series_map).forEach(key=>{
				// obs
				var series_id = this.config.series_map[key].obs_series_id
				var valor = parseFloat(data[this.config.data_row][this.config.series_map[key].column])
				if(valor.toString() == "NaN") {
					throw("Invalid value at row" + this.config.data_row + ", column " + this.config.series_map[key].column)
				}
				obs.push({series_id:series_id,timestart:obs_date,timeend:obs_date,valor:valor})
				// prono
				var prono_series_id = this.config.series_map[key].prono_series_id
				var prono_cal_id = this.config.series_map[key].prono_cal_id
				var pronosticos = []
				this.config.prono_rows.forEach(row=>{
					var date = new Date(data[row][this.config.date_column])
					if(date.toString() == "Invalid Date") {
						throw("Invalid date at row" + row + ", column " + this.config.date_column)
					}
					var valor = parseFloat(data[row][this.config.series_map[key].column])
					if(valor.toString() == "NaN") {
						throw("Invalid value at row" + row + ", column " + this.config.series_map[key].column)
					}
					pronosticos.push({timestart:date,timeend:date,valor:valor})
				})
				prono.push({
					cal_id: prono_cal_id,
					forecast_date: obs_date,
					series: [
						{
							series_table: "series",
							series_id: prono_series_id,
							pronosticos: pronosticos
						}
					]
				})
			})
			return [obs,prono]
		})
	}
}

internal.ctm = class {
	constructor(config) {
		this.config = config
	}
	test() {
		return fsPromises.access(__dirname + "/" + this.config.file)
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
	}
	get(filter,options) {
		return this.convertAndReadObs(filter.file)	
	}
	update(filter,options) {
		return this.convertAndReadObs(filter.file)	
		.then(results=>{
			//~ console.log({obs:results[0],corrida1:results[1][0],corrida2:results[1][1]})
			var observaciones  = results.map(d=> {
				var obs = new CRUD.observacion(d)
				  //~ console.log(obs.toString())
				return obs
			}) // .filter(o=> parseFloat(o.valor).toString()!=='NaN')
			
			return crud.upsertObservaciones(observaciones)
		})
	}
	convertAndReadObs(file) {
		if(!this.config) {
			return Promise.reject("config missing")
		}
		if(!file) {
			file = __dirname + this.config.file
		}
		var txtFile = (this.config.txtFile) ? __dirname + "/" + this.config.txtFile : "/tmp/ctm.txt"
		return new Promise( ( resolve, reject)=> {
			exec("pdftotext -layout " + file + " " + txtFile, (err,stdout,stderr) => { // ssconvert -S -O "locale=en_US.utf8 
				if(err) {
					console.error(err)
					reject(err)
					return
				}
				//~ console.log(`stdout: ${stdout}`);
				//~ console.error(`stderr: ${stderr}`);
				resolve(fsPromises.readFile(txtFile,{encoding:'utf-8'}))
			})
		})
		.then(contents=>{
			var data = contents.split(/\n/)
			var date_arr = data[this.config.date_row].match(/\d{2}\/\d{2}\/\d{4}/)[0].split(/\//)
			var date = new Date(date_arr[2], date_arr[1]-1, date_arr[0])
			if(date.toString() == "Invalid Date") {
				throw("Invalid date on row " + this.config.date_row)
			}
			var date_ayer = new Date(date.getTime() - 24*3600*1000)
			var obs=[]
			for(var i=this.config.data_start_row;i<=this.config.data_end_row;i++) {
				var row = {}
				Object.keys(this.config.columns).forEach(key=>{
					row[key] = data[i].substring(this.config.columns[key].start_column,this.config.columns[key].end_column).replace(/^\s+|\s+$/g,"")
				})
				if(!this.config.series_map[row.estacion]) {
					console.error("Estación:" + row.estacion + " no encontrada")
					continue
				}
				if(row.nivel_ayer != "" && row.nivel_ayer != "S/D") {
					var valor = parseFloat(row.nivel_ayer)
					if(valor.toString == "NaN") {
						console.error("Invalid value at estacion " + row.estacion + " column nivel_ayer")
					} else {
						obs.push({series_id: this.config.series_map[row.estacion].altura_series_id, timestart: date_ayer, timeend: date_ayer, valor: valor})
					}
				}
				if(row.caudal_ayer != "" && row.caudal_ayer != "S/D") {
					var valor = parseFloat(row.caudal_ayer)
					if(valor.toString == "NaN") {
						console.error("Invalid value at estacion " + row.estacion + " column caudal_ayer")
					} else {
						obs.push({series_id: this.config.series_map[row.estacion].caudal_series_id, timestart: date_ayer, timeend: date_ayer, valor: valor})
					}
				}
				if(row.nivel_hoy != "" && row.nivel_hoy != "S/D") {
					var valor = parseFloat(row.nivel_hoy)
					if(valor.toString == "NaN") {
						console.error("Invalid value at estacion " + row.estacion + " column nivel_hoy")
					} else {
						obs.push({series_id: this.config.series_map[row.estacion].altura_series_id, timestart: date, timeend: date, valor: valor})
					}
				}
				if(row.caudal_hoy != "" && row.caudal_hoy != "S/D") {
					var valor = parseFloat(row.caudal_hoy)
					if(valor.toString == "NaN") {
						console.error("Invalid value at estacion " + row.estacion + " column caudal_hoy")
					} else {
						obs.push({series_id: this.config.series_map[row.estacion].caudal_series_id, timestart: date, timeend: date, valor: valor})
					}
				}
			}
			return obs
		})
	}
}


internal.getFromSource2 = function (crud,tipo="puntual",series_id,timestart,timeend) {
	return crud.getSerie(tipo,series_id)
	.then(serie=>{
		return crud.getRedesAccessors({tipo:tipo,tabla_id:serie.estacion.tabla,var_id:serie.var.id})
		.then(redesAccessors=>{
			if(redesAccessors.length == 0) {
				throw("No se encontró la fuente de la serie " + serie.tipo + " " + serie.id)
			}
			const redAccessor = redesAccessors[0]
			if(redAccessor.accessor) {
				return internal.new(redAccessor.accessor)
				.then(accessor=>{
					return accessor.engine.get({estacion_id:serie.estacion.id,var_id:serie.var.id,timestart:timestart,timeend:timeend})
				})
			} else {
				return internal.getFromAsociaciones(crud,tipo,series_id,timestart,timeend)
			}
		})
	})
}

internal.getFromSource = function (crud,tipo="puntual",series_id,timestart,timeend) {
	if(tipo=="puntual") {
		return crud.pool.query("SELECT estaciones.unid estacion_id,\
								  estaciones.id_externo,\
								  estaciones.tabla,\
								  series.id series_id,\
								  series.var_id var_id\
						  FROM estaciones,series\
						  WHERE estaciones.unid=series.estacion_id \
						  AND series.id=$1",[series_id])
		.then(result=>{
			if(!result.rows) {
				throw("bad series_id")
				return
			}			
			timestart = (timestart) ? new Date(timestart) : undefined
			timeend = (timeend) ? new Date(timeend) : undefined
			if(!result.rows[0]) {
				throw("Series not found")
			}
			switch(result.rows[0].tabla) {
				case "alturas_prefe":
					switch(result.rows[0].var_id) {
						case 2:
						case 4:
							return internal.new("prefe")
							.then(accessor=>{
								return accessor.engine.get({estacion_id:result.rows[0].estacion_id,timestart:timestart,timeend:timeend})
							})
							break;
						case 33:
						case 48:
						case 49:
						case 50:
						case 51:
						case 52:
							return crud.runAsociaciones({
								source_tipo:"puntual",
								dest_tipo:"puntual",
								dest_series_id:result.rows[0].series_id,
								timestart:timestart,
								timeend:timeend},
								{no_insert:true})
							break;
						default:
							throw("getFromSource not defined for tabla=altura_prefe, var_id"+result.rows[0].var_id)
							return
							break;
					}
					break
				case "red_ana_hidro":
					if(result.rows[0].var_id==1) {
						return internal.getFromAsociaciones(crud,"puntual",series_id,timestart,timeend)
					} else if(result.rows[0].var_id==31) {
						return internal.getFromAsociaciones(crud,"puntual",series_id,timestart,timeend)
					} else {
						return internal.new("ana")
						.then(accessor=>{
							return accessor.engine.get({timestart:timestart,timeend:timeend, estacion_id:result.rows[0].estacion_id,var_id:result.rows[0].var_id})
						})
					}  
					break;
				case "sissa":
					return internal.new("sissa")
					.then(accessor=>{
						return accessor.engine.get({timestart:timestart, timeend:timeend, estacion_id: result.rows[0].estacion_id, var_id: result.rows[0].var_id})
					})
					break;
				case "MCH_DMH_PY": 
					return internal.new("mch_py")
					.then(accessor=>{
						return accessor.engine.get({timestart:timestart, timeend:timeend, estacion_id: result.rows[0].estacion_id, var_id: result.rows[0].var_id})
					})
					break;
				case "sat2":
					return internal.new("sat2")
					.then(accessor=>{
						return accessor.engine.get({timestart:timestart, timeend:timeend, estacion_id: result.rows[0].estacion_id, var_id: result.rows[0].var_id})
					})
					break;
				case "estaciones_salto_grande":
					switch(result.rows[0].var_id) {
						case 1:
						case 31:
						case 34:
						case 33:
						case 40:
						case 48:
							return internal.getFromAsociaciones(crud,"puntual",series_id,timestart,timeend)
							break;
						default:
							throw("getFromSource not defined for tabla=estaciones_salto_grande, var_id=" + result.rows[0].var_id)
					}
					break;
				case "ina_delta":
					return internal.new("fdx")
					.then(accessor=>{
						return accessor.engine.get({timestart:timestart, timeend:timeend, estacion_id: result.rows[0].estacion_id, var_id: result.rows[0].var_id})
					})
					break;
				case "alturas_dinac":
					switch(result.rows[0].var_id) {
						case 33:
						case 39:
						case 40:
						case 48:
							return internal.getFromAsociaciones(crud,"puntual",series_id,timestart,timeend)
							break;
						default:
							throw("getFromSource not defined for tabla=alturas_dinac, var_id=" + result.rows[0].var_id)
					}
					break;
				case "presas":
					return internal.new("sarws")
					.then(accessor=>{
						return accessor.engine.get({timestart:timestart, timeend:timeend, estacion_id: result.rows[0].estacion_id, var_id: result.rows[0].var_id})
					})
					break;
				case "alturas_bdhi":
					return internal.new("snih")
					.then(accessor=>{
						return accessor.engine.get({timestart:timestart, timeend:timeend, series_id: result.rows[0].series_id})
					})
					break;
				default:
					throw("getFromSource not defined for tabla="+result.rows[0].tabla)
					return 
					break;
			}
		})
	} else {
		throw("getFromSource not defined for tipo="+tipo)
	}
}

internal.getFromAsociaciones = function (crud,tipo="puntual",series_id,timestart,timeend) {
	return crud.runAsociaciones({dest_tipo:tipo,dest_series_id:series_id,timestart:timestart,timeend:timeend},{no_insert:true})
}

internal.tabprono = class {
	constructor(config) {
		this.config = config
	}
	get(filter,options) {
		if(!filter.forecast_date) {
			return Promise.reject("Falta forecast_date")
		}
		var forecast_date = new Date(filter.forecast_date)
		if(forecast_date.toString() == 'Invalid Date') {
			return Promise.reject("forecast_date incorrecta")
		}
		var dow = forecast_date.getUTCDay()
		if(!filter.file) {
			if(!this.config.file) {
				return Promise.reject("falta file")
			} else {
				filter.file = __dirname + "/" + this.config.file
			}
		}
		return this.getTabprono(filter.forecast_date,dow,filter.file)
	}
	update(filter,options) {
		if(!filter.forecast_date) {
			return Promise.reject("Falta forecast_date")
		}
		var forecast_date = new Date(filter.forecast_date)
		if(forecast_date.toString() == 'Invalid Date') {
			return Promise.reject("forecast_date incorrecta")
		}
		var dow = forecast_date.getUTCDay()
		if(!filter.file) {
			return Promise.reject("falta file")
		}
		return this.getTabprono(filter.forecast_date,dow,filter.file)
		.then(result=>{		
			if (filter.insert_obs) {
				return Promise.all([this.insertTabprono(result.tabprono_geojson,true),crud.upsertCorrida(result.pronosticos_central),crud.upsertCorrida(result.pronosticos_min),crud.upsertCorrida(result.pronosticos_max)])
			} else {
				return Promise.all([this.insertTabprono(result.tabprono_geojson,false),crud.upsertCorrida(result.pronosticos_central),crud.upsertCorrida(result.pronosticos_min),crud.upsertCorrida(result.pronosticos_max)])
			} 
		})

	}
	getTabprono(forecast_date,dow,file) {
		if(!file) {
			return Promise.reject("Falta file")
		}
		var csvfile = "/tmp/tabprono.csv"
		var unid = [19,20,23,24,26,29,30,34] 
		const geometries = [{"unid" : 19, "x" : -58.8388696, "y" : -27.46364349}, {"unid" : 20, "x" : -58.9333333333333, "y" : -27.4833333333333}, {"unid" : 23, "x" : -59.27303952, "y" : -29.14376844}, {"unid" : 24, "x" : -59.58115833, "y" : -29.23756092}, {"unid" : 26, "x" : -59.6381167, "y" : -30.73419972}, {"unid" : 29, "x" : -60.5225697750899, "y" : -31.7182378629681}, {"unid" : 30, "x" : -60.7002319185745, "y" : -31.6514772196376}, {"unid" : 34, "x" : -60.6308206029857, "y" : -32.9432699442268}, ]	
		var keys = ["corr","barr","goy","reco","lap","para","safe","rosa"]
		const series_id = [1540, 3523, 3524, 3526, 3527, 3408, 1542, 3412]
		//~ var results = {}
		//~ keys.forEach(k=> {
			//~ results[k] = []
		//~ })
		var stats = fs.statSync(file)
		//~ var mtime = stats.mtime
		var mod_date = (forecast_date) ? (forecast_date.toString() == "now") ? new Date() : (forecast_date.toString() == "last") ? stats.mtime : new Date(forecast_date) : stats.mtime
		mod_date = new Date(mod_date.getUTCFullYear(),mod_date.getUTCMonth(),mod_date.getUTCDate())
		//~ mod_date.setTime(mod_date.getTime() + 3*3600*1000)	
		var day = (dow) ? dow : mod_date.getDay()
		day = (day == 0) ? 6 : day-1
		console.log("mod_date: "+mod_date.toISOString()+", w: "+day)
		return new Promise( ( resolve, reject)=> {
			exec("ssconvert -T Gnumeric_stf:stf_assistant -S -O 'locale=en_US.utf8 separator=; quoting-mode=never' "+file+" "+csvfile, (err,stdout,stderr) => { 
				if(err) {
					console.error(err)
					reject(err)
					return
				}
				//~ console.log(`stdout: ${stdout}`);
				//~ console.error(`stderr: ${stderr}`);
				console.log("leyendo " + csvfile+"."+day)
				resolve(fsPromises.readFile(csvfile+"."+day,{encoding:'utf-8'}))
			})
		})
		.then(data=>{
			console.log("csv file read at " + new Date())
			var data = data.split("\n").map(r=> r.split(";"))
			var dates = [mod_date, new Date(mod_date.getTime()+(8-day)*24*3600*1000), new Date(mod_date.getTime()+(15-day)*24*3600*1000)]
			var daterownum = [2,7,9]
			var tabprono_geojson = { "type" : "FeatureCollection", "features" : []}
			var pronosticos_central = {cal_id:289, forecast_date: mod_date, series: []} 
			var pronosticos_min = {cal_id:376, forecast_date: mod_date, series: []} 
			var pronosticos_max = {cal_id:377, forecast_date: mod_date, series: []} 
			//~ var csvdata
			const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
			
			for(var i=0;i<data.length;i++) {
				var r=data[i]
			//~ data.forEach(r=>{
				if(! r[0]) { 		
					continue
				}
				r[0] = parseInt(r[0])
				if(r[0].toString == "NaN") {
					continue
				}
				for(var k=0;k<unid.length;k++) {
					if(r[0] == unid[k]) {
						var mes = monthNames[dates[0].getMonth()]
						var estado_prono = (r[10]) ? (/^\w/.test(r[10])) ? r[10].match(/^\w/)[0].toLowerCase() : "n" : "n"
						var estado_tendencia = (r[14]) ? (/^\w/.test(r[14])) ? r[14].match(/^\w/)[0].toLowerCase() : "n" : "n"
						var x = geometries[k].x
						var y = geometries[k].y
						var row = {
							type: "Feature",
							id: r[1].toString().replace('"',''),	
							geometry: {
								type: "Point",
								coordinates: [x, y]
							},
							properties: {
								estacion_id: r[0],
								estacion_nombre: r[1].toString(),
								nivel_hoy: [dates[0], roundTo(r[2],2)],
								"altura_media_mensual(1994-2018)": [mes, parseFloat(r[3])],
								nivel_de_aguas_bajas: parseFloat(r[4]),
								nivel_de_alerta: parseFloat(r[5]),
								nivel_de_evacuacion: parseFloat(r[6]),
								pronostico: [dates[1], roundTo(r[7],2), roundTo(r[8],2), roundTo(r[9],2)],
								estado_pronostico: estado_prono,
								tendencia: [dates[2], roundTo(r[11],2), roundTo(r[12],2), roundTo(r[13],2)],
								estado_tendencia: estado_tendencia
							}
						}
						tabprono_geojson.features.push(row)
						pronosticos_central.series.push({
							series_id:series_id[k],
							estacion_id:unid[k],
							var_id:2,
							pronosticos: [
								{ timestart: dates[0].toISOString(), timeend: dates[0].toISOString(), valor: roundTo(r[2],2) },
								{ timestart: dates[1].toISOString(), timeend: dates[1].toISOString(), valor: roundTo(r[8],2) },
								{ timestart: dates[2].toISOString(), timeend: dates[2].toISOString(), valor: roundTo(r[12],2) }
							]})
						pronosticos_min.series.push({
							series_id:series_id[k],
							estacion_id:unid[k],
							var_id:2,
							pronosticos: [
								{ timestart: dates[0].toISOString(), timeend: dates[0].toISOString(), valor: roundTo(r[2],2) },
								{ timestart: dates[1].toISOString(), timeend: dates[1].toISOString(), valor: roundTo(r[7],2) },
								{ timestart: dates[2].toISOString(), timeend: dates[2].toISOString(), valor: roundTo(r[11],2) }
							]})
						pronosticos_max.series.push({
							series_id:series_id[k],
							estacion_id:unid[k],
							var_id:2,
							pronosticos: [
								{ timestart: dates[0].toISOString(), timeend: dates[0].toISOString(), valor: roundTo(r[2],2) },
								{ timestart: dates[1].toISOString(), timeend: dates[1].toISOString(), valor: roundTo(r[9],2) },
								{ timestart: dates[2].toISOString(), timeend: dates[2].toISOString(), valor: roundTo(r[13],2) }
							]})
						break
					}
				}
			}
			return {tabprono_geojson:tabprono_geojson,pronosticos_central:pronosticos_central,pronosticos_min:pronosticos_min,pronosticos_max:pronosticos_max}
		})
		
	}
	insertTabprono(tabprono_geojson,insert_obs=true) {
		var promises = []
		tabprono_geojson.features.forEach(f=>{
			promises.push(pool.query("INSERT INTO tabprono_parana (unid, estacion_nombre, geom, fecha_hoy, altura_hoy, mes, altura_media_mes, nivel_de_aguas_bajas, nivel_de_alerta, nivel_de_evacuacion, fecha_pronostico, altura_pronostico_min, altura_pronostico, altura_pronostico_max, estado_pronostico, fecha_tendencia, altura_tendencia_min, altura_tendencia, altura_tendencia_max, estado_tendencia,valor) VALUES\
			($1, $2, st_setsrid(st_point($3,$4),4326), $5, $6, $7, $8, $9, $10, $11, $12::timestamptz, $13, $14, $15, $16, $17::timestamptz, $18, $19, $20, $21, null)\
			ON CONFLICT (unid) DO UPDATE SET estacion_nombre=excluded.estacion_nombre, geom=excluded.geom, fecha_hoy=excluded.fecha_hoy, altura_hoy=excluded.altura_hoy, mes=excluded.mes, altura_media_mes=excluded.altura_media_mes, nivel_de_aguas_bajas=excluded.nivel_de_aguas_bajas, nivel_de_alerta=excluded.nivel_de_alerta, nivel_de_evacuacion=excluded.nivel_de_evacuacion, fecha_pronostico=excluded.fecha_pronostico, altura_pronostico_min=excluded.altura_pronostico_min, altura_pronostico=excluded.altura_pronostico,altura_pronostico_max=excluded.altura_pronostico_max, estado_pronostico=excluded.estado_pronostico, fecha_tendencia=excluded.fecha_tendencia, altura_tendencia_min=excluded.altura_tendencia_min, altura_tendencia=excluded.altura_tendencia, altura_tendencia_max=excluded.altura_tendencia_max, estado_tendencia=excluded.estado_tendencia, valor=excluded.valor\
			RETURNING *",[f.properties.estacion_id, f.properties.estacion_nombre, f.geometry.coordinates[0], f.geometry.coordinates[1], f.properties.nivel_hoy[0], f.properties.nivel_hoy[1], f.properties["altura_media_mensual(1994-2018)"][0], f.properties["altura_media_mensual(1994-2018)"][1], f.properties.nivel_de_aguas_bajas, f.properties.nivel_de_alerta, f.properties.nivel_de_evacuacion, f.properties.pronostico[0], f.properties.pronostico[1], f.properties.pronostico[2], f.properties.pronostico[3], f.properties.estado_pronostico, f.properties.tendencia[0], f.properties.tendencia[1], f.properties.tendencia[2], f.properties.tendencia[3], f.properties.estado_tendencia]))
		})
		return Promise.all(promises)
		.then(result=>{
			pool.query("insert into tabprono_parana_historia (unid, estacion_nombre, geom, fecha_hoy, altura_hoy, mes, altura_media_mes, nivel_de_aguas_bajas, nivel_de_alerta, nivel_de_evacuacion, fecha_pronostico, altura_pronostico, estado_pronostico, fecha_tendencia, altura_tendencia, estado_tendencia) select unid, estacion_nombre, geom, fecha_hoy, altura_hoy, mes, altura_media_mes, nivel_de_aguas_bajas, nivel_de_alerta, nivel_de_evacuacion, fecha_pronostico, altura_pronostico, estado_pronostico, fecha_tendencia, altura_tendencia, estado_tendencia from tabprono_parana ON CONFLICT (unid,fecha_hoy) do nothing")
			.then(()=>{
				console.log("Insert into tabprono_parana_historia OK")
			}).catch(e=>{
				console.error(e)
			})
			if(insert_obs) {
				// upsert pronosticos
				var pronos=[]
				const prono_sid = {19: 1541, 20: 3381, 23: 3382, 24: 3383, 26: 3384, 29: 3385, 30: 1543, 34: 3387} // id de serie var_id=2 proc_id=8
				result.forEach(r=>{
					r = r.rows[0]
					//~ console.log(r)
					pronos.push(new CRUD.observacion({tipo: "puntual", series_id: prono_sid[r.unid], timestart: r.fecha_hoy, timeend: r.fecha_hoy, valor: r.altura_hoy}))
					pronos.push(new CRUD.observacion({tipo: "puntual", series_id: prono_sid[r.unid], timestart: r.fecha_pronostico, timeend: r.fecha_pronostico, valor: r.altura_pronostico}))
					pronos.push(new CRUD.observacion({tipo: "puntual", series_id: prono_sid[r.unid], timestart: r.fecha_tendencia, timeend: r.fecha_tendencia, valor: r.altura_tendencia}))
				})
				return crud.upsertObservaciones(pronos)
			} else {
				return result.map(r=>r.rows[0])
			}
		})
	}


}
//~ #-----------------------------------------------------------------------------------
//~ # DESRIPCION:
//~ # script que descarga las planillas de los embalses de la ONS para los Subsitemas
//~ # sur y Sudeste-Centro y Oeste
//~ # CODIGO: 2001101
//~ # FECHA CREACION: 2018-03-13
//~ # JFB en base a JPG
//~ #-----------------------------------------------------------------------------------
//~ #0. toma parametros pg.pool, config={download_dir: "../data/ons", tmp_dir: "/tmp"}, timestart (default hoy - 14 dias) , timeend (default hoy)

internal.ons = class {
	constructor(config) {
		this.config = config
	}
	test() {
		return axios.get("http://sdro.ons.org.br/SDRO/DIARIO/")
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
	}
	get(filter,options) {
		return this.getONS(filter.timestart,filter.timeend)
	}
	update(filter,options) {
		return this.getONS(filter.timestart,filter.timeend)
		.then(result=>{
			crud.upsertObservaciones(result,"puntual")
		})
	}

	getONS(timestart=new Date(new Date().getTime()-14*24*3600*1000),timeend=new Date()) {
		var config = (this.config) ? this.config : {
			download_dir: "../data/ons",
			tmp_dir: "/tmp"
		}
		timestart = new Date(timestart)
		timeend = new Date(timeend)
		if(timestart.toString() == 'Invalid Date') {
			return Promise.reject("invalid timestart")
		}
		if(timeend.toString() == 'Invalid Date') {
			return Promise.reject("invalid timeend")
		}
		//~ console.log({timestart:timestart,timeend:timeend})
		// get Code Map
		return pool.query("select estaciones.unid,\
								  estaciones.id_externo,\
								  json_object_agg(series.var_id,series.id) AS series\
						  from estaciones,series \
						  where estaciones.tabla='presas' and \
						  series.estacion_id=estaciones.unid and \
						  series.proc_id<=2 \
						  group by estaciones.unid, estaciones.id_externo;")
		.then(result=>{
			var codeMap = {}
			result.rows.forEach(r=>{
				codeMap[r.id_externo]={unid:r.unid,series:r.series}
			})
			//~ console.log(codeMap)
		//~ #1. FORMACION DE LOS LINKS DE DESCARGA
		//~ # fecha final de descarga
			var dates = []
			var dia=timestart
			console.log(typeof dia)
			for(dia=timestart;dia<=timeend;dia=new Date(dia.getTime()+24*3600*1000)) {
				dates.push(dia)
			}
			return Promise.all(dates.map(dia=>{
				dia = new Date(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(),0)
				var timeend = new Date(dia.getTime()+24*3600*1000)
				console.log({dia:dia})
				//~ # link Subsistema Sur
				var link_sss = 
				sprintf("http://sdro.ons.org.br/SDRO/DIARIO/%04d_%02d_%02d/HTML/23_SituacaoPrincipaisReservatorios_Regiao_%02d-%02d-%04d.xlsx", dia.getUTCFullYear(), dia.getUTCMonth()+1, dia.getUTCDate(), dia.getUTCDate(), dia.getUTCMonth()+1, dia.getUTCFullYear())
				//~ # link Subsitema Sudeste-Centro y Oeste
				var link_sssco = 
						sprintf("http://sdro.ons.org.br/SDRO/DIARIO/%04d_%02d_%02d/HTML/24_SituacaoPrincipaisReservatorios_Regiao_%02d-%02d-%04d.xlsx", dia.getUTCFullYear(), dia.getUTCMonth()+1, dia.getUTCDate(), dia.getUTCDate(), dia.getUTCMonth()+1, dia.getUTCFullYear())
				//~ #archivo guardado
				var file_sss = 
				sprintf("%s/%s/23_SituacaoPrincipaisReservatorios_Regiao_%02d-%02d-%04d.xlsx", __dirname, config.download_dir, dia.getUTCDate(), dia.getUTCMonth()+1, dia.getUTCFullYear())
				var file_sssco = 
				sprintf("%s/%s/24_SituacaoPrincipaisReservatorios_Regiao_%02d-%02d-%04d.xlsx", __dirname, config.download_dir, dia.getUTCDate(), dia.getUTCMonth()+1, dia.getUTCFullYear())
				//~ console.log({file_sss:file_sss,file_sssco:file_sssco})
				var filenames = [file_sss,file_sssco]
				var filenames_txt = [
					sprintf("%s/23_SituacaoPrincipaisReservatorios_Regiao_%02d-%02d-%04d.txt", config.tmp_dir, dia.getUTCDate(), dia.getUTCMonth()+1, dia.getUTCFullYear()),
					sprintf("%s/24_SituacaoPrincipaisReservatorios_Regiao_%02d-%02d-%04d.txt", config.tmp_dir, dia.getUTCDate(), dia.getUTCMonth()+1, dia.getUTCFullYear())
				]
				const writer1 = fs.createWriteStream(filenames[0])
				const writer2 = fs.createWriteStream(filenames[1])
				//~ # Download the file save it locally:
				return axios.all([axios.get(link_sss,{responseType:'stream'}), axios.get(link_sssco,{responseType:'stream'})])
				.then(axios.spread((response1,response2)=>{
					//~ console.log({status1:response1.status,status2:response2.status})
					response1.data.pipe(writer1)
					response2.data.pipe(writer2)
					return Promise.all([
						new Promise( (resolve, reject) => {
							writer1.on('finish', resolve)
							writer1.on('error', reject)
						}),
						new Promise( (resolve, reject) => {
							writer2.on('finish', resolve)
							writer2.on('error', reject)
						})
					])

				}))
				.then(()=>{
					return Promise.all([
						new Promise( ( resolve, reject)=> {
							exec('ssconvert -S -O "locale=en_US.utf8 separator=, quoting-mode=never" '+filenames[0] + ' ' + filenames_txt[0], (err,stdout,stderr) => {
								if(err) {
									console.error(err)
									reject(err)
									return
								}
								console.log(`stdout: ${stdout}`);
								console.error(`stderr: ${stderr}`);
								resolve(fsPromises.readFile(filenames_txt[0] + '.0',{encoding:'ascii'}))
							})
						}),
						new Promise( ( resolve, reject)=> {
							exec('ssconvert -S -O "locale=en_US.utf8 separator=, quoting-mode=never" '+filenames[1] + ' ' + filenames_txt[1], (err,stdout,stderr) => {
								if(err) {
									console.error(err)
									reject(err)
									return
								}
								console.log(`stdout: ${stdout}`);
								console.error(`stderr: ${stderr}`);
								resolve(fsPromises.readFile(filenames_txt[1] + '.0',{encoding:'utf-8'}))
							})
						})])
				})
				.then(result=>{
					//~ console.log({sss:result[0],sssco:result[1]})
					var registros = []
					result.forEach(filecontent=>{
						var rows = filecontent.split("\n")
						rows.splice(0,7)
						for(var i=0;i<rows.length;i++) {
							var r = rows[i]
						//~ rows.forEach(r=>{
							var data=r.split(",")
							if(!codeMap[data[1]]) {
								console.error("codeMap item for "+data[1]+" not found")
								continue
							}
							var unid = codeMap[data[1]].unid
							var series = codeMap[data[1]].series
							var col=3
							var var_ids = [2,26,22,23,24,25]
							var_ids.forEach(var_id=>{
								var valor = (var_id == 2 || var_id == 26) ? roundTo(data[col],2) : roundTo(data[col],0)
								registros.push({tipo:"puntual", series_id:series[var_id], estacion_id: unid, id_externo: data[1], var_id: var_id, timestart: dia, timeend: timeend, valor: valor}) 
								if(var_id==2) { // inserta H media diaria var_id=33
									registros.push({tipo:"puntual", series_id:series[39], estacion_id: unid, id_externo: data[1], var_id: 39, timestart: dia, timeend: timeend, valor: valor})
								}
								col++
							})
							registros.push({tipo:"puntual", series_id:series[4], estacion_id: unid, id_externo: data[1], var_id: 4, timestart: dia, timeend: timeend, valor: roundTo(data[6],0)})
							// inserta Q medio diario var_id=48
							registros.push({tipo:"puntual", series_id:series[40], estacion_id: unid, id_externo: data[1], var_id: 40, timestart: dia, timeend: timeend, valor: roundTo(data[6],0)})
						}
					})
					return registros
				})
				.catch(e=>{
					console.error({message:"error en date: " + dia.toISOString() + ", salteando",error:e})
					return []
				})
			}))
			.then(result=>{
				//~ console.log(registros)//.flat())
				var registros = []
				result.forEach(r=>{
					registros.push(...r)
				})
				return registros //.flat()
			})
		})
	}
}

internal.ana = class {
	constructor(config) {
		this.config = config
	}
	test() {
		return axios.get("http://telemetriaws1.ana.gov.br/serviceANA.asmx")
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
	}
	get(filter,options={}) {
		options.update=false
		return this.getDadosANABatch(filter,options)
		.then(result=>{
			return flatten(result).filter(o=>o)
		})
	}
	async getAll(filter,options={}) {
		options.update=false
		for(var i=0;i<this.config.estacion_ids;i++) {
			filter.estacion_id = this.config.estacion_ids[i]
			try {
				var obs = await this.getDadosANABatch(filter,options)
				observaciones.push(obs)
			} catch (e) {
				console.error(e)
			}
		}
		return Promise.resolve(observaciones)
	}
	update(filter,options={}) {
		options.update=true
		return this.getDadosANABatch(filter,options)
	}
	async updateAll(filter,options={}) {
		//~ console.log({config:this.config.estacion})
		options.update=true
		var observaciones = []
		for(var i=0;i<this.config.estacion_ids.length;i++) {
			filter.estacion_id = this.config.estacion_ids[i]
			console.log({filter:filter})
			try {
				var obs = await this.getDadosANABatch(filter,options)
				observaciones.push(obs)
			} catch (e) {
				console.error(e)
			}
		}
		return Promise.resolve(observaciones)
	}
	getANA(estacion_id,timestart,timeend,var_id=2) {
		return pool.query("SELECT estaciones.id_externo,series.id series_id FROM estaciones,series WHERE estaciones.unid=$1 AND tabla='red_ana_hidro' AND series.estacion_id=estaciones.unid AND series.var_id=$2 AND series.proc_id=1",[estacion_id,var_id])
		.then(result=>{
			if(!result) {
				throw new Error("getANA: estacion_id not found")
				return
			}
			if(result.rows.length==0)  {
				throw new Error("getANA: estacion_id not found")
				return
			}
			var series = (var_id==2) ? {Nivel: result.rows[0].series_id} : (var_id==4) ? {Vazao: result.rows[0].series_id} : (var_id==27) ? {Chuva: result.rows[0].series_id} : null
			return this.getDadosANA(result.rows[0].id_externo,timestart,timeend,series)
		})
	//~ .then(result=>{
		//~ if(!result) {
			//~ throw new Error("getANA: data not found")
			//~ return
		//~ }
		//~ if(result.length==0)  {
			//~ throw new Error("getANA: data not found")
			//~ return
		//~ }
		//~ return result.map(r=> {
			//~ return [r.timestart,r.timeend,r.valor]
		//~ })
	//~ })
	}

	getDadosANABatch(filter,options) {
		//~ console.log({filter:filter})
		var getestacionesfilter = {tabla:"red_ana_hidro"}
		if(filter.estacion_id) {
			getestacionesfilter.unid = filter.estacion_id
		}
		var timestart=new Date()
		timestart.setTime(timestart.getTime() - 7*24*3600*1000)
		var timeend=new Date()
		if(filter.timestart) {
			timestart = new Date(filter.timestart)
		}
		if(filter.timeend) {
			timeend = new Date(filter.timeend)
		}
		return crud.getEstaciones(getestacionesfilter)
		.then(estaciones=>{
		  var o = (async ()=>{
			//~ console.log(estaciones)
			if(estaciones.length==0) {
				console.error("no estaciones found")
				throw new Error("no estaciones found")
				return
			}
			var observaciones = []
			for(var i=0;i<estaciones.length;i++) {
				var e = estaciones[i]
				if(!e.id_externo) {
					console.log("missing id_externo for estacion_id:"+e.unid)
					return
				}
				//~ console.log({id_externo:e.id_externo})
				var s = await crud.getSeries('puntual',{estacion_id:e.id,proc_id:1,var_id:filter.var_id})
				.then(series=>{
					//~ console.log({series:series})
					var series_id = {}
					series.forEach(s=>{
						if(s.var.id==2) {
							series_id.Nivel = s.id
						}
						if(s.var.id==4) {
							series_id.Vazao = s.id
						}
						if(s.var.id==27 && (filter.estacion_id || this.config.precip_estacion_ids.indexOf(s.estacion.id) >= 0)) {
							console.log("estacion: " + s.estacion.id + " precip series:id:" + s.id)
							series_id.Chuva = s.id
						}
					})
					return this.getDadosANA(e.id_externo,timestart,timeend,series_id)  // el ws ignora la hora
					.then(obs=>{
						console.log("got " + obs.length + " observaciones from station " + e.id)
						if(options.update) {
							return crud.upsertObservaciones(obs)
							.then(upserted=>{
								var length = upserted.length
								console.log("upserted " + length + " registros for station " + e.id)
								upserted=""
								obs=""
								if(options.run_asociaciones) {
									return crud.runAsociaciones({estacion_id:e.id,source_var_id:27,source_proc_id:1,timestart:timestart,timeend:timeend},{inst:true,no_send_data:true})
									.then(result=>{
										if(!result) {
											console.error("No records created from estacion_id="+e.id+" var_id=27 for asoc")
										} else {																		//~ return [...upserted,...result]
											length+=result.length
										}
										result=""
										return crud.runAsociaciones({estacion_id:e.id,source_var_id:31,source_proc_id:1,timestart:timestart,timeend:timeend},{no_send_data:true})
										.then(result=>{
											if(!result) {
												console.error("No records created from estacion_id="+e.id+" var_id=31 for asoc")
											} else {
										//~ return [...upserted,...result]
												length+=result.length
											}
											result=""
											return crud.runAsociaciones({estacion_id:e.id,source_var_id:4,source_proc_id:1,timestart:timestart,timeend:timeend},{no_send_data:true})
											.then(result=>{
												if(!result) {
													console.error("no records created from estacion_id="+e.id+" var_id=4 for asoc")
												} else {
													length+= result.length
												}
												result=""
												return length
											})
										})
									})
								} else {
									return length
								}
							})
						} else {
							return obs
						}
					})
					.catch(e=>{
						console.error({error:e.toString()})
						return
					})
				})
				observaciones.push(s)
			}
			var obs = await Promise.all(observaciones)
			//~ var obs=observaciones
			//~ .then(obs=>{
				if(options.update) {
					console.log("upserted "+ obs + " registros")
					return {registros_actualizados:obs}
				} else if(obs.length==0) {
					console.error("no data found")
					return {registros_actualizados:0}
				}
				var full_length = obs.map(o=> (o) ? o.length : 0).reduce((t,l)=>t+l)
				console.log("got " + full_length + " observaciones from " + obs.length + " estaciones") 
				var allobs = [].concat(...obs)
				//~ if(options.update) {
					//~ return crud.upsertObservaciones(allobs)
					//~ .then(upserted=>{
						//~ console.log("upserted " + upserted.length + " registros for station " + e.id)
						//~ res.send(upserted)
					//~ })
			//~ } else {
					//~ res.send(allobs)
				//~ }
				return obs
		  })()	//~ })
		  return o
		})
	}

	getDadosANA(codEstacao,dataInicio,dataFim,series_id={}) {
		console.log({series_id:series_id})
		return axios.get("http://telemetriaws1.ana.gov.br/serviceANA.asmx/DadosHidrometeorologicos", {
			params: {
				codEstacao: codEstacao,
				dataInicio: dataInicio,
				dataFim: dataFim
			}
		}) //,{responseType:'stream'})
		.then(response=>{
			//~ console.log(response.data) 
			return new Promise((resolve, reject)=> {
				var data = xmlparser.parseString(response.data, function(error, result) {
					if(error === null) {
						//~ console.log(result.DataTable["diffgr:diffgram"][0].DocumentElement[0]);
						if(!result.DataTable["diffgr:diffgram"][0].DocumentElement[0].DadosHidrometereologicos) {
							console.error("no data found")
							reject(result.DataTable["diffgr:diffgram"][0].DocumentElement[0].ErrorTable)
							return
						}
						var observaciones = []
						result.DataTable["diffgr:diffgram"][0].DocumentElement[0].DadosHidrometereologicos.forEach(d=>{
							if(series_id.Vazao && d.Vazao[0] != "") {
								observaciones.push({
									series_id: series_id.Vazao,
									timestart: new Date(d.DataHora[0].replace(/\s+$/,"")),
									timeend: new Date(d.DataHora[0].replace(/\s+$/,"")),
									valor: parseFloat(d.Vazao[0])
								})
							}
							if(series_id.Nivel && d.Nivel[0] != "") {
								observaciones.push({
									series_id: series_id.Nivel,
									timestart: new Date(d.DataHora[0].replace(/\s+$/,"")),
									timeend: new Date(d.DataHora[0].replace(/\s+$/,"")),
									valor: parseFloat(d.Nivel[0])*0.01
								})
							}
							if(series_id.Chuva && d.Chuva[0] != "") {
								observaciones.push({
									series_id: series_id.Chuva,
									timestart: new Date(d.DataHora[0].replace(/\s+$/,"")), // new Date(new Date(d.DataHora[0].replace(/\s+$/,"")).getTime()-1000*3600),
									timeend: new Date(d.DataHora[0].replace(/\s+$/,"")),
									valor: parseFloat(d.Chuva[0])
								})
							}
						})
						//~ console.log({observaciones: observaciones})
						resolve(observaciones)
					}
					else {
						console.log(error);
						reject(error)
					}
				})
			})
		})
	}
	getSitesANA(file="/home/leyden/Downloads/ListaEstacoesTelemetricas.xml",download=false,statusEstacoes=0,origem=1,format="json") {
		return new Promise((resolve,reject)=>{
			if(download) {
				const writer = fs.createWriteStream(file)
				return axios.get("http://telemetriaws1.ana.gov.br/serviceANA.asmx/ListaEstacoesTelemetricas", {
					params: {
						statusEstacoes: statusEstacoes, 
						origem: origem
					},
					responseType:'stream'})
				.then(response=>{
					response.data.pipe(writer)
					//~ return new Promise( (resolve, reject) => {
					writer1.on('finish', resolve)
					//~ })
				})
				.catch(e=>{
					reject(e)
				})
			} else {
				resolve()
			}
		})
		.then(()=>{
			return(fsPromises.readFile(file,{encoding:'utf-8'}))
		})
		.then(fileContent=>{
			console.log("read file " + file)
			return new Promise((resolve, reject)=> {
				var data = xmlparser.parseString(fileContent, function(error, result) {
					//~ console.log(result)
					console.log("parsing file")
					if(error === null) {
						console.log("success");
						var estaciones = []
						result.DataSet["diffgr:diffgram"][0].Estacoes[0].Table.forEach(e=>{
							//~ console.log({estacion:e})
							estaciones.push({
								id: (e.CodEstacao) ? parseInt(e.CodEstacao[0]) : null,
								id_externo: (e.CodEstacao) ? e.CodEstacao[0] : null,
								tabla: "red_ana_hidro",
								nombre: (e.NomeEstacao) ? e.NomeEstacao[0] : null,
								cuenca: (e.Bacia) ? parseInt(e.Bacia[0]) : null,
								subcuenca: (e.SubBacia) ? parseInt(e.SubBacia[0]) : null,
								propietario: "ANA",
								provincia: (e["Municipio-UF"]) ? e["Municipio-UF"][0].split("-")[1] : null,
								localidad: (e["Municipio-UF"]) ? e["Municipio-UF"][0].split("-")[0] : null,
								geom: {
									type: "Point",
									coordinates: [
										parseFloat(e.Longitude),
										parseFloat(e.Latitude)
									]
								},
								cero_ign: parseFloat(e.Altitude),
								rio: e.NomeRio[0],
								pais: "Brasil",
								automatica: true,
								tipo: "A",
								has_obs: (e.StatusEstacao) ? (e.StatusEstacao[0] == "Ativo") ? 1 : 0 : 0,
								url: "http://telemetriaws1.ana.gov.br/serviceANA.asmx/ListaEstacoesTelemetricas",
								habilitar: true,
								real: true
							})
						})
						//~ console.log({estaciones:estaciones})
						 if(format=="geojson") {
							console.log("returning geojson")
							resolve({ 
								"type" : "FeatureCollection", 
								"features" : estaciones.map(e=>{
									return {
										type: "Feature",
										geometry: e.geom,
										properties: e
									}
								})
							})
						} else {
							console.log("returning json")
							resolve(estaciones)
						}
					} else {
						console.log("parse error")
						console.error(result)
						reject(result)
					}
				})
			})
		})
	}
}

// sarws - ANA SIN (presas)

internal.sarws = class {
	constructor(config) {
		this.config = config
	}
	test() {
		return axios.get("http://sarws.ana.gov.br/SarWebService.asmx")
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
	}
	get(filter,options={}) {
		options.update=false
		return this.getDadosHistoricosSINBatch(filter,options)
		.then(result=>{
			return flatten(result).filter(o=>o)
		})
	}
	async getAll(filter,options={}) {
		options.update=false
		for(var i=0;i<this.config.estacion_ids;i++) {
			filter.estacion_id = this.config.estacion_ids[i]
			try {
				var obs = await this.getDadosHistoricosSINBatch(filter,options)
				observaciones.push(obs)
			} catch (e) {
				console.error(e)
			}
		}
		return Promise.resolve(observaciones)
	}
	update(filter,options={}) {
		options.update=true
		return this.getDadosHistoricosSINBatch(filter,options)
	}
	async updateAll(filter,options={}) {
		//~ console.log({config:this.config.estacion})
		options.update=true
		var observaciones = []
		for(var i=0;i<this.config.estacion_ids.length;i++) {
			filter.estacion_id = this.config.estacion_ids[i]
			console.log({filter:filter})
			try {
				var obs = await this.getDadosHistoricosSINBatch(filter,options)
				observaciones.push(obs)
			} catch (e) {
				console.error(e)
			}
		}
		return Promise.resolve(observaciones)
	}
	
	getDadosHistoricosSIN(codigoReservatorio,DataInicial,DataFinal,series_id={}) {
		var ts = sprintf("%02d/%02d/%04d", DataInicial.getUTCDate(), DataInicial.getUTCMonth()+1, DataInicial.getUTCFullYear())
		var te = sprintf("%02d/%02d/%04d", DataFinal.getUTCDate(), DataFinal.getUTCMonth()+1, DataFinal.getUTCFullYear())
		//~ console.log({series_id:series_id, ts: ts, te: te, codigoReservatorio: codigoReservatorio})
		return axios.get("http://sarws.ana.gov.br/SarWebService.asmx/DadosHistoricosSIN", {
			params: {
				codigoReservatorio: codigoReservatorio,
				DataInicial: ts,
				DataFinal: te
			}
		})
		.then(response=>{
			//~ console.log(response.data) 
			return new Promise((resolve, reject)=> {
				var data = xmlparser.parseString(response.data, function(error, result) {
					if(error === null) {
						//~ console.log(JSON.stringify(result,null,2))
						if(!result.ArrayOfDadoHistoricoSIN) {
							console.error("no data found: " + result.toString())
							reject("no data found")
							return
						}
						var observaciones = []
						if(!result.ArrayOfDadoHistoricoSIN) {
							reject("missing ArrayOfDadoHistoricoSIN")
						}
						if(!result.ArrayOfDadoHistoricoSIN.DadoHistoricoSIN) {
							reject("missing ArrayOfDadoHistoricoSIN")
						}
						var series_id_keys = Object.keys(series_id)
						for (var i in result.ArrayOfDadoHistoricoSIN.DadoHistoricoSIN) {
							var d = result.ArrayOfDadoHistoricoSIN.DadoHistoricoSIN[i]
							for (var j in series_id_keys) {
								var key = series_id_keys[j] // afluencia, defluencia, cota, volumeUtil
								if(d[key] && d[key][0] != "") {
									var timeend = (key == "cota") ? new Date(d.data_medicao[0]) : new Date(new Date(d.data_medicao[0]).getTime() + 24*3600*1000) // cota y caudal son instantaneas, el resto diarias
									observaciones.push({
										series_id: series_id[key],
										timestart: new Date(d.data_medicao[0]),
										timeend: timeend,
										valor: parseFloat(d[key][0])
									})
								}
							}
							if(series_id.caudal && d.defluencia[0] != "") {
								observaciones.push({
									series_id: series_id.caudal,
									timestart: new Date(d.data_medicao[0]),
									timeend: new Date(d.data_medicao[0]),
									valor: parseFloat(d.defluencia[0])
								})
							}
						}
						//~ console.log({observaciones: observaciones})
						resolve(observaciones)
					}
					else {
						console.log(error);
						reject(error)
					}
				})
			})
		})
	}

	
	getDadosHistoricosSINBatch(filter,options) {
		//~ console.log({filter:filter})
		var getestacionesfilter = {tabla:"presas"}
		if(filter.estacion_id) {
			getestacionesfilter.unid = filter.estacion_id
		}
		var timestart=new Date()
		timestart.setTime(timestart.getTime() - 7*24*3600*1000)
		var timeend=new Date()
		if(filter.timestart) {
			timestart = new Date(filter.timestart)
		}
		if(filter.timeend) {
			timeend = new Date(filter.timeend)
		}
		return crud.getEstaciones(getestacionesfilter)
		.then(estaciones=>{
		  var o = (async ()=>{
			//~ console.log(estaciones)
			if(estaciones.length==0) {
				console.error("no estaciones found")
				throw new Error("no estaciones found")
				return
			}
			var observaciones = []
			for(var i=0;i<estaciones.length;i++) {
				var e = estaciones[i]
				if(!e.id_externo) {
					console.log("missing id_externo for estacion_id:"+e.unid)
					return
				}
				//~ console.log({id_externo:e.id_externo})
				var s = await crud.getSeries('puntual',{estacion_id:e.id,proc_id:1,var_id:filter.var_id})
				.then(series=>{
					//~ console.log({series:series})
					var series_id = {}
					series.forEach(s=>{
						if(s.var.id==2) {
							series_id.cota = s.id
						}
						if(s.var.id==4) {
							series_id.caudal = s.id
						}
						if(s.var.id==22) {
							series_id.afluencia = s.id
						}
						if(s.var.id==23) {
							series_id.defluencia = s.id
						}
						if(s.var.id==26) {
							series_id.volumeUtil = s.id
						}
					})
					return this.getDadosHistoricosSIN(e.id_externo,timestart,timeend,series_id)  // el ws ignora la hora
					.then(obs=>{
						console.log("got " + obs.length + " observaciones from station " + e.id)
						//~ fs.writeFileSync('/tmp/observaciones.json',JSON.stringify(obs,null,2))
						if(options.update) {
							return crud.upsertObservaciones(obs)
							.then(upserted=>{
								var length = upserted.length
								console.log("upserted " + length + " registros for station " + e.id)
								upserted=""
								obs=""
								return length
							})
						} else {
							return obs
						}
					})
					.catch(e=>{
						console.error({error:e.toString()})
						return
					})
				})
				observaciones.push(s)
			}
			var obs = await Promise.all(observaciones)
			if(options.update) {
				console.log("upserted "+ obs + " registros")
				return {registros_actualizados:obs}
			} else if(obs.length==0) {
				console.error("no data found")
				return {registros_actualizados:0}
			}
			var full_length = obs.map(o=> (o) ? o.length : 0).reduce((t,l)=>t+l)
			console.log("got " + full_length + " observaciones from " + obs.length + " estaciones") 
			var allobs = [].concat(...obs)
			return obs
		  })()
		  return o
		})
	}
	getSites(filter,options) {
		var download = (options.no_download) ? false : true
		return this.getSitesSIN(undefined,download, options.format) 
	}
	getSitesSIN(file="/home/leyden/Downloads/reservatoriosSIN.xml",download=false,format="json") {
		return new Promise((resolve,reject)=>{
			if(download) {
				console.log("GET http://sarws.ana.gov.br/SarWebService.asmx/ReservatoriosSIN?")
				const writer = fs.createWriteStream(file)
				return axios.get("http://sarws.ana.gov.br/SarWebService.asmx/ReservatoriosSIN?", {
					params: {},
					responseType:'stream'})
				.then(response=>{
					response.data.pipe(writer)
					writer.on('finish', resolve)
				})
				.catch(e=>{
					reject(e)
				})
			} else {
				resolve()
			}
		})
		.then(()=>{
			return(fsPromises.readFile(file,{encoding:'utf-8'}))
		})
		.then(fileContent=>{
			console.log("read file " + file)
			return new Promise((resolve, reject)=> {
				var data = xmlparser.parseString(fileContent, function(error, result) {
					console.log(JSON.stringify(result,null,2))
					console.log("parsing file")
					if(error === null) {
						console.log("success");
						if(!result.ArrayOfReservatorioSIN) {
							reject("missing ArrayOfReservatorioSIN")
						}
						if(!result.ArrayOfReservatorioSIN.ReservatorioSIN) {
							reject("missing ArrayOfReservatorioSIN.ReservatorioSIN")
						}
						var estaciones = result.ArrayOfReservatorioSIN.ReservatorioSIN.map(e=> {
							//~ console.log({estacion:e})
							var nome = (e.nome_reservatorio) ? e.nome_reservatorio[0].replace(/\s+$/,"") : null
							var estado = (e.estado) ? e.estado[0].replace(/\s+$/,"") : null
							var municipio = (e.municipio) ? e.municipio[0].replace(/\s+$/,"") : null
							if(!e.codigo_reservatorio) {
								return
							}
							console.log("UPDATE estaciones SET id_externo='"+e.codigo_reservatorio[0]+"' WHERE tabla='presas' AND nombre='" + nome + "';")
							return {
								id: (e.cod_reservatorio) ? parseInt(e.cod_reservatorio[0]) : null,
								id_externo: (e.cod_reservatorio) ? e.cod_reservatorio[0] : null,
								tabla: "presas",
								nombre: nome,
								propietario: "ANA",
								provincia: estado,
								localidad: municipio,
								// geom: {
								// 	type: "Point",
								// 	coordinates: [
								// 		parseFloat(e.Longitude),
								// 		parseFloat(e.Latitude)
								// 	]
								// },
								pais: "Brasil",
								automatica: true,
								tipo: "P",
								has_obs: 1,
								url: "http://sarws.ana.gov.br/SarWebService.asmx/ReservatoriosSIN",
								habilitar: true,
								real: true
							}
						})
						//~ console.log({estaciones:estaciones})
						 if(format=="geojson") {
							console.log("returning geojson")
							resolve({ 
								"type" : "FeatureCollection", 
								"features" : estaciones.map(e=>{
									return {
										type: "Feature",
										geometry: e.geom,
										properties: e
									}
								})
							})
						} else {
							console.log("returning json")
							resolve(estaciones)
						}
					} else {
						console.log("parse error")
						console.error(result)
						reject(result)
					}
				})
			})
		})
	}
}

// SQPE SMN

internal.sqpe_smn = class {
	constructor(config) {
		this.config = config
	}
	test() {
		return ftp.connect(this.config)
		.then( serverMessage=>{
			console.log('serverMessage:'+serverMessage)
			ftp.end()
			return true
		}).catch(e=>{
			console.error(e)
			ftp.end()
			return false
		})
	}
	get(filter,options={}) {
		options.no_update=true
		var series_id = (filter.series_id) ? filter.series : this.config.series_id
		console.log({options:options})
		return this.getSQPESMN(filter.timestart,filter.timeend,series_id,options)	
	}	
	update(filter={},options={}) {
		var series_id = (filter.series_id) ? filter.series : this.config.series_id
		options.no_update=false
		return this.getSQPESMN(filter.timestart,filter.timeend,series_id,options)	
	}	
	getSQPESMN(timestart,timeend,series_id,options) {
		if(!this.config) {
			return Promise.reject("missing config")
		}
		var config = this.config
		const getSQPE = function (ftp,date,config) {
			var year = date.getUTCFullYear()
			var ymd = sprintf ("%04d%02d%02d", date.getUTCFullYear(), date.getUTCMonth()+1, date.getUTCDate())
			var fullpath = config.path + "/" + year
			//~ console.log("fullpath: "+fullpath + ", ymd:" + ymd)
			var sd = new Date(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),9)
			var ed = new Date(sd.getTime() + 24*3600*1000)
			//~ console.log({sd:sd,ed:ed})
				// host/path/YYYY/Ajuste_20200427_D110_E1,5.tif

			return ftp.list(fullpath)
			.then( list => {
				//~ console.log('Directory listing:');
				//~ console.dir(list);
				var matches = list.filter(i=> i.name.split("_")[1] == ymd)
				if(matches.length==0) {
					console.error("date not found")
					return
				}
				var localfilepath = __dirname + "/" + config.download_dir + "/" + matches[0].name 
				if(options.no_update) {
					if(fs.existsSync(localfilepath)) {
						console.log("File exists locally, Skipping download")
						return fsPromises.readFile(localfilepath,'hex')
					}
				}
				return ftp.get(fullpath + "/" + matches[0].name)
				.then(stream => {
					console.log("got file " + matches[0].name +", writing into file" + localfilepath)
					return new Promise(function (resolve, reject) {
						var writeStream = fs.createWriteStream(localfilepath,{emitClose:true})
						writeStream.on('close', ()=>{
							//~ console.log("write closed")
							fs.readFile(localfilepath,'hex',(error,data)=>{
								if(error) {
									reject(new Error(error))
									return
								}
								resolve(data)
							})
						})
						//~ stream.once('end', ()=>{
							//~ console.log("read end")
						//~ })
						stream.pipe(writeStream,{end:true});
						stream.once('error',(error)=>reject(error))
					})
				})
			})
			.then(data=>{
				if(!data) {
					return
				}
				console.log("data.length: "+data.length + ".")
				if(options.no_insert) {
					return {tipo:"rast", series_id:series_id, timeupdate:new Date(), timestart: sd, timeend: ed, valor: '\\x' + data}
				}
				return crud.upsertObservacion({tipo:"rast", series_id:series_id, timeupdate:new Date(), timestart: sd, timeend: ed, valor: '\\x' + data})
			})
		}
		timestart = (timestart) ? new Date(timestart) : new Date()
		timeend = (timeend) ? new Date(timeend) : new Date()
		var ftp = new PromiseFtp();
		return ftp.connect(config)
		.then(async function (serverMessage) {
			console.log('Server message: '+serverMessage)
			var results=[]
			for(var i=timestart.getTime();i<=timeend.getTime();i=i+24*3600*1000) {
				var date = new Date(i)
				//~ dates.push(date)
				results.push(await getSQPE(ftp,date,config))
			}
			ftp.end()
			return results.filter(r=>r)
		})
	}
}

internal.mch_py = class {
	constructor(config) {
		this.config = config
	}
	test() {
		return axios.get(this.config.url + "/stations",{headers: { Authorization: `Bearer ${this.config.token}`}})
		.then(()=>{
			console.log("test ok")
			return true
		})
		.catch(e=>{
			console.error(e)
			return false
		})
	}
	getSites(filter,options={}) {
		const sites = []
		return this.getSitesPage(this.config.url + "/stations",undefined,sites,(options.return_raw) ? true : false)
	}
	getSitesPage(url,params,sites=[],return_raw=false) {
		return axios.get(url,{headers: { Authorization: `Bearer ${this.config.token}`},accept:"application/json"})
		.then(result=>{
			if(!result) {
				throw("getSites failed. Empty response from source")
			}
			if(!result.data) {
				throw("getSites failed. no data in response")
			}
			// console.log({data:result.data})
			if(!result.data.payload || !result.data.payload.stations || !result.data.payload.stations.data) {
				throw("getSites failed: payload.stations.data missing from response")
			}
			if(return_raw) {
				sites.push(result.data)
			} else {
				sites.push(...result.data.payload.stations.data.map(station=>{
					return new CRUD.estacion({
						nombre: station.name,
						id_externo: station.code,
						geom: {
							type: "Point",
							coordinates: [ station.longitude, station.latitude ]
						},
						altitud: station.altitude,
						tabla: "MCH_DMH_PY"
					})
				}))
			}
			if(result.data.payload.stations.next_page_url) {
				return this.getSitesPage(result.data.payload.stations.next_page_url,undefined,sites,return_raw)
			} else {
				return sites
			}
		})
	}
	updateSites(filter,options) {
		return this.getSites(filter,options)
		.then(estaciones=>{
			return crud.upsertEstaciones(estaciones)		
		})
	}
	getSeries(filter,options={}) {
		const series = []
		return this.getSeriesPage(this.config.url + "/stations",undefined,series,(options.return_raw) ? true : false)
	}
	getSeriesPage(url,params,series=[],return_raw=false) {
		return axios.get(url,{headers: { Authorization: `Bearer ${this.config.token}`},accept:"application/json"})
		.then(async result=>{
			if(!result) {
				throw("getSeries failed. Empty response from source")
			}
			if(!result.data) {
				throw("getSeries failed. no data in response")
			}
			// console.log({data:result.data})
			if(!result.data.payload || !result.data.payload.stations || !result.data.payload.stations.data) {
				throw("getSeries failed: payload.stations.data missing from response")
			}
			var this_series = []
			var estaciones_map_py = {}
			result.data.payload.stations.data.forEach(station=>{
				estaciones_map_py[station.code] = station.id
				this_series.push(...station.variables)
			})
			if(return_raw) {
				series.push(...this_series)
			} else {
				var estaciones_map = {}
				try {
					const estaciones = await crud.getEstaciones({tabla: "MCH_DMH_PY" })
					for(var estacion of estaciones) {
						var key = estaciones_map_py[estacion.id_externo]
						if(key) {
							estaciones_map[key] = estacion.id
							console.log("estaciones_map[" + key + "] = " + estaciones_map[key])
						}
					}
				} catch(e) {
					throw(e)
				}
				const var_map = {}
				for(var key of Object.keys(this.config.variable_map)) {
					var_map[this.config.variable_map[key]] = key
				}
				for(var serie of this_series) {
					if(!estaciones_map[serie.station_id]) {
						console.error("estacion not found, id: " + serie.station_id)
						continue
					}
					series.push(new CRUD.serie({
						estacion_id: estaciones_map[serie.station_id],
						var_id: var_map[serie.variable_name],
						unit_id: this.config.unit_map[serie.variable_name],
						proc_id: 1
					}))
				}
			}
			if(result.data.payload.stations.next_page_url) {
				return this.getSeriesPage(result.data.payload.stations.next_page_url,undefined,series,return_raw)
			} else {
				return series
			}
		})
	}
	updateSeries(filter,options) {
		return this.getSeries(filter,options)
		.then(series=>{
			return crud.upsertSeries(series)		
		})
	}
	async get(filter,options={},update=false) {
		if(!filter.estacion_id) {
			return Promise.reject("Falta estacion_id")
		}
		if(!filter.var_id) {
			return Promise.reject("Falta var_id")
		}
		if(!filter.timestart || !filter.timeend) {
			return Promise.reject("Falta timestart y/o timeend")
		}
		var timestart = new Date(filter.timestart)
		if(timestart.toString() == "Invalid Date") {
			return Promise.reject("timestart inválido")
		}
		var timeend = new Date(filter.timeend)
		if(timeend.toString() == "Invalid Date") {
			return Promise.reject("timeend inválido")
		}
		var observaciones = []
		if(Array.isArray(filter.estacion_id)) {
			for(var i=0;i<filter.estacion_id.length;i++) {
				var e_id = filter.estacion_id[i]
				// console.log({estacion_id:e_id})
				if(Array.isArray(filter.var_id)) {
					for(var j=0;j<filter.var_id.length;j++) {
						var v_id = filter.var_id[j]
						try {
							var obs = await this.getObservations(e_id,v_id,timestart,timeend,update)
							observaciones.push(...obs)
						} catch (e) {
							if(config.verbose) {
								console.error(e)
							} else {
								printAxiosGetError(e)
							}
						}
					}
				} else {
					try {
						var obs = await this.getObservations(e_id,filter.var_id,timestart,timeend,update)
						observaciones.push(...obs)
					} catch (e) {
						if(config.verbose) {
							console.error(e)
						} else {
							printAxiosGetError(e)
						}
					}
				}
			}
		} else if(Array.isArray(filter.var_id)) {
			for(var j=0;j<filter.var_id.length;j++) {
				var v_id = filter.var_id[j]
				try {
					var obs = await this.getObservations(filter.estacion_id,v_id,timestart,timeend,update)
					observaciones.push(...obs)
				} catch (e) {
					if(config.verbose) {
						console.error(e)
					} else {
						printAxiosGetError(e)
					}
				}
			}
		} else {
			try {
				var obs = await this.getObservations(filter.estacion_id,filter.var_id,timestart,timeend,update)
				observaciones.push(...obs)
			} catch (e) {
				if(config.verbose) {
					console.error(e)
				} else {
					printAxiosGetError(e)
				}
			}
		}
		return observaciones
	}
	update(filter,options={}) {
		return this.get(filter,options,true)
		//~ .then(result=>{
			//~ return crud.upsertObservaciones(result)
		//~ })
	}
	
	getAll(filter,options={}) {
		return crud.getEstaciones({tabla:"MCH_DMH_PY"})
		.then(estaciones=>{
			if(!filter.estacion_id) {
				filter.estacion_id = estaciones.map(e=>e.id)
			}
			if(!filter.var_id) {
				filter.var_id = Object.keys(this.config.variable_map)
			}
			// console.log(filter)
			return this.get(filter,options)
		})
	}
	updateAll(filter,options={}) {
		return crud.getEstaciones({tabla:"MCH_DMH_PY"})
		.then(estaciones=>{
			if(!filter.estacion_id) {
				filter.estacion_id = estaciones.map(e=>e.id)
			}
			if(!filter.var_id) {
				filter.var_id = Object.keys(this.config.variable_map)
			}
			return this.update(filter,options)
			.then(result=>{
				console.log("updated " + result.length + " observations from mch_py")
			})
		})
	}	
	getObservations(estacion_id,var_id,timestart,timeend,update=false) {
		//~ console.log({estacion_id:estacion_id,var_id:var_id,timestart:timestart,timeend:timeend})
		// station_code, variable, date_start, date_end
		if(!this.config.variable_map[var_id]) {
			return Promise.reject("var_id incorrecto")
		}
		const daily_vars = [39]
		var daily = (daily_vars.indexOf(var_id) >= 0)
		var date_start = (daily) ? timestart.toISOString().substring(0,10) : timestart.toISOString().substring(0,19)
		var date_end =  (daily) ? timeend.toISOString().substring(0,10) : timeend.toISOString().substring(0,19)
		return crud.getEstacion(estacion_id)
		.then(estacion=>{
			if(!estacion) {
				throw("estacion not found")
			}
			return crud.getSeries('puntual',{estacion_id:estacion_id,var_id:var_id,proc_id:1})
			.then(series=>{
				if(!series) {
					throw("serie not found")
				}
				if(series.length==0) {
					throw("serie not found")
				}
				var serie = series[0]
				var series_id = serie.id
				return this.getObservationsPage(undefined,{station_code: estacion.id_externo, variable: this.config.variable_map[var_id], date_start: date_start, date_end: date_end},series_id,undefined,daily)
				.then(observaciones=>{
					if(update) {
						return crud.upsertObservaciones(observaciones,'puntual')
						.then(observaciones=>{
							return observaciones
						})
						.catch(e=>{
							if(config.verbose) {
								console.error(e)
							} else {
								console.error(e.toString())
							}
							return []
						})
					} else {
						return observaciones
					}
				})
			})
		})
	}
	getObservationsPage(url,params,series_id,observations=[],daily=false) {
		var var_daily_0 = ["temperatura_maxima", "temperatura_minima" ]
		var var_daily_9 = [ "precipitacion" ]
		var options
		if(!url) {
			url = (daily) ? `${this.config.url}/daily_observations` : `${this.config.url}/observations`
			options = {headers: { Authorization: `Bearer ${this.config.token}`}, params:params,accept:"application/json"}
		} else {
			options = {headers: { Authorization: `Bearer ${this.config.token}`}, accept:"application/json"}
		}
		//console.log({url:url,options:options})
		return axios.get(url,options)
		.then((result)=>{
			if(!result) {
				throw("getObservations failed. Empty response from source")
			}
			if(!result.data) {
				throw("getObservations failed. no data in response")
			}
			if(!result.data.payload || !result.data.payload.observations || !result.data.payload.observations.data) {
				throw("getObservations failed: payload.observations.data missing from response")
			}
			// console.log({current_page:result.data.payload.observations.current_page})
			result.data.payload.observations.data.forEach(observation=>{
				// if (daily) {console.log(observation.date)}
				var date_time = (daily) ? new Date(observation.date + "T03:00:00Z") : new Date(observation.date_time)
				var timestart = (var_daily_9.indexOf(params.variable) >= 0) ? new Date(date_time.getTime() + 9*3600*1000) : date_time 
				var timeend = (var_daily_0.concat(var_daily_9).indexOf(params.variable) >= 0 || daily) ? new Date(timestart.getTime() + 24*3600*1000) : new Date(timestart.getTime() + 3*3600*1000)
				observations.push(new CRUD.observacion({tipo:"puntual", series_id: series_id, timestart: timestart, timeend: timeend, valor: observation.value}))
			})
			if(result.data.payload.observations.next_page_url) {
				return this.getObservationsPage(result.data.payload.observations.next_page_url,params,series_id,observations)
			} else {
				return observations
			}
		})		
	}
}

internal.sissa = class {
	constructor(config) {
		this.config = config
	}
	
	getSites(filter,options) {
		return axios.get(this.config.url + "/estaciones",{auth: {username: this.config.username, password: this.config.password}, params: filter})
		.then(result=>{
			//~ console.log(result.data)
			var estaciones = result.data.map(e=>{
				return new CRUD.estacion({tabla: "sissa", id_externo:  e.omm_id.toString(), nombre: e.nombre, geom: new CRUD.geometry({type: "Point", coordinates: [e.longitud, e.latitud]}), cero_ign: e.elevacion, provincia: e.nivel_adm1, localidad: e.nivel_adm2})
			})
			if(options.update) {
				return crud.upsertEstaciones(estaciones)
			} else {
				return estaciones
			}
		})
	}
	
	get(filter,options={}) {
		if(!filter.estacion_id || !filter.timestart || !filter.timeend) {
			return Promise.reject("Falta estacion_id y/o timestart y/o timeend")
		}
		var timestart = new Date(filter.timestart)
		if(timestart.toString() == "Invalid Date") {
			return Promise.reject("timestart inválido")
		}
		var timeend = new Date(filter.timeend)
		if(timeend.toString() == "Invalid Date") {
			return Promise.reject("timeend inválido")
		}
		var ts = timestart.toISOString().substring(0,19)
		var te = timeend.toISOString().substring(0,19)
		return crud.getEstaciones({tabla:"sissa",unid:filter.estacion_id})
		.then(estaciones=> {
			if(estaciones.length==0) {
				throw("No se encontraron estaciones")
			}
			return this.asyncForLoop(estaciones,filter.var_id,ts,te,options.doUpdate)
		})
		
	}
	
	getAll(filter,options={}) {
		filter.estacion_id = this.config.estacion_ids
		return this.get(filter,options)
	}

	updateAll(filter,options={}) {
		filter.estacion_id = this.config.estacion_ids
		options.doUpdate=true
		return this.get(filter,options)
	}
		
	
	async asyncForLoop(estaciones,var_id,ts,te,update) {
		var writeStream
		var csvFile
		if(update) {
			var tmp_dir = (this.config.tmp_dir) ? this.config.tmp_dir : "/tmp"
			csvFile = tmp_dir + "/observaciones_" + Math.round(Math.random()*10000000).toString() + ".csv"
			writeStream = fs.createWriteStream(csvFile, {flags: 'a', emitClose:true});
		}
		var results = []
		for(var e=0; e<estaciones.length;e++) {
			var estacion = estaciones[e]
			if(var_id) {
				var keys= Object.keys(this.config.variable_map)
				if(Array.isArray(var_id)) {
					for(var f=0;f<var_id.length;f++) {
						for(var i=0;i<keys.length;i++) {
							var key = keys[i]
							if(this.config.variable_map[key] == var_id[f]) {
								var registros
								try {
									if(update) {
										registros = await this.getRegistrosDiarios(estacion.id_externo,key,ts,te).then(reg=> {
											return crud.upsertObservaciones(reg,"puntual")
										})
									} else {
										registros = await this.getRegistrosDiarios(estacion.id_externo,key,ts,te)
									}
								} catch (e) {
									console.error(e)
								}
								if(registros) {
									results.push(...registros)
								}
							}
						}
					}
				} else {
					for(var i=0;i<keys.length;i++) {
						var key = keys[i]
						if(this.config.variable_map[key] == var_id) {
							var registros
							try {
								if(update) {
									registros = await this.getRegistrosDiarios(estacion.id_externo,key,ts,te).then(reg=> {
										return crud.upsertObservaciones(reg,"puntual")
									})
								} else {
									registros = await this.getRegistrosDiarios(estacion.id_externo,key,ts,te)
								}
							} catch (e) {
								console.error(e)
							}
							if(registros) {
								console.log("omm_id: " + estacion.id_externo + ", got " + registros.length + " registros")
								results.push(...registros)
							}
						}
					}						
				}
			} else {
				var registros
				try {
					if(update) {
						registros = await this.getRegistrosDiarios(estacion.id_externo,undefined,ts,te,writeStream)
						//~ .then(reg=> {
							//~ console.log({reg:reg})
							//~ return crud.upsertObservacionesFromCSV(csvfile)
							//~ return crud.upsertObservaciones(reg,"puntual")
						//~ })
					} else {
						registros = await this.getRegistrosDiarios(estacion.id_externo,undefined,ts,te)
					}
				} catch (e) {
					console.error(e)
				}
				if(registros) {
					//~ console.log({registros:registros})
					console.log("omm_id: " + estacion.id_externo + ", got " + registros.length + " registros")
					results.push(...registros)
				}
			}
		}
		return new Promise((resolve,reject) => {
			if(update) {
				console.log({csvFile:csvFile}) 
				writeStream.on('close',()=>{
					resolve(crud.upsertObservacionesFromCSV("puntual",csvFile)
					.then(result=>{
						fs.unlinkSync(csvFile)
						return result
					})
					.catch(e=>{
						fs.unlinkSync(csvFile)
						throw(e)
					}))
				})
				writeStream.end()
			} else {
				resolve(results)
			}
		})
	}
	
	
	update(filter,options={}) {
		options.doUpdate=true
		return this.get(filter,options)
		//~ .then(results=>{
			//~ return crud.upsertObservaciones(results,"puntual")
		//~ })
	}
	
	getRegistrosDiarios(omm_id, variable_id, timestart, timeend, writeStream) {
		var url = (variable_id) ? this.config.url + "/registros_diarios/" + omm_id + "/" + variable_id + "/" + timestart + "/" + timeend : this.config.url + "/registros_diarios/" + omm_id + "/" + timestart + "/" + timeend
		return crud.getSeries("puntual",{tabla:"sissa",id_externo:omm_id})
		.then(series=>{
			var series_map = {} 
			if(!series) {
				throw("No series found for id_externo="  + omm_id)
			}
			series.forEach(s=>{
				Object.keys(this.config.variable_map).forEach(key=>{
					if(this.config.variable_map[key] == s.var.id) {
						series_map[key] = s
					}
				})
			})
			return axios.get(url,{auth: {username: this.config.username, password: this.config.password}})
			.then(result=>{
				console.log("got response from url: " + url)
				//~ console.log({registros_diarios:result.data})
				return result.data.map(e=>{
					if(typeof e.valor == "undefined") {
						return
					}
					var timestart = new Date(e.fecha + "T00:00:00")
					//~ console.log({timestart:timestart.toISOString()})
					if(e.variable_id == "prcp") {
						timestart.setTime(timestart.getTime() + 9*3600*1000)
					}
					var timeend = new Date(timestart.getTime() + 24*3600*1000)
					var obs = new CRUD.observacion({tipo:"puntual", series_id: series_map[e.variable_id].id, timestart: timestart, timeend: timeend, valor: e.valor})
					if(writeStream) {
						writeStream.write(obs.toCSVless() + '\n')
					}
					return obs
				}).filter(o=>o)
			})
		})
	}
}

internal.fieldclimate = class {
	constructor(config) {
		this.config = config
		this.config.estacion_ids = [].concat.apply([],Object.keys(this.config.users).map(key=>{
			return Object.keys(this.config.users[key].stations).map(skey=>{
				return this.config.users[key].stations[skey].estacion_id
			})
		}))
	}
	
	test() {
		var userkeys = Object.keys(this.config.users)
		var pubkey = this.config.users[userkeys[0]].public_key // '953119785fac49e347f56c8c489ecfcd83672d1a7999acd0'
		var prikey = this.config.users[userkeys[0]].private_key // '206edd09c5f6781a1fc1545a3e5e8b7d9d1c87c633ffd5a4'
		var method = "GET"
		// var station_keys = Object.keys(this.config.users(userkeys[0]).stations)
		// var station_id = station_keys[0] // "00000477"
		// timeend = new Date()
		// timestart = new Date(timeend.getTime() - 1*24*3600*1000)
		var request = "/user" //"/system/sensors" //"/data/optimized/" + station_id + "/hourly/from/" + Math.round(timestart.getTime()/1000).toString() + "/to/" + Math.round(timeend.getTime()/1000).toString() //"/user/stations"
		var apiurl = this.config.url // "https://api.fieldclimate.com/v1"
		var timestamp = new Date().toUTCString()
		var content_to_sign = method + request + timestamp + pubkey
		// console.log(content_to_sign)
		var signature = crypto.createHmac('sha256',prikey).update(content_to_sign).digest('hex')
		// console.log(signature)
		return axios.get(
			apiurl + request,
			{headers: { Accept: "application/json", 
					    Authorization: "hmac " + pubkey + ":" + signature, 
						Date: timestamp}}
		).then(result=> {
			return true
			// console.log(JSON.stringify(result.data,null,2))
			//~ result.data.forEach(d=>{
				//~ console.log({name:d.name})
			//~ })
			//~ fs.writeFile('/tmp/sensors.json',JSON.stringify(result.data,null,2), ()=> {
				//~ console.log("done")
			//~ })
		}).catch(e=>{
			console.error(e)
			return false
		})
	}
	
	get(filter={},options={}) {
		if(!filter.estacion_id || !filter.timestart || !filter.timeend) {
			return Promise.reject("Falta estacion_id y/o timestart y/o timeend")
		}
		options.update = false
		return this.getHourlyData(filter,options)
	}
	update(filter={},options={}) {
		if(!filter.estacion_id || !filter.timestart || !filter.timeend) {
			return Promise.reject("Falta estacion_id y/o timestart y/o timeend")
		}
		options.update = true
		return this.getHourlyData(filter,options)
	}
	getAll(filter={},options={}) {
		if(!filter.timestart || !filter.timeend) {
			return Promise.reject("Falta timestart y/o timeend")
		}
		filter.estacion_id = this.config.estacion_ids
		options.update = false
		return this.getMultipleStationsHourlyData(filter,options)
	}
	updateAll(filter={},options={}) {
		if(!filter.timestart || !filter.timeend) {
			return Promise.reject("Falta timestart y/o timeend")
		}
		filter.estacion_id = this.config.estacion_ids
		options.update = true
		return this.getMultipleStationsHourlyData(filter,options)
	}
	updateSites(filter,options) {
		options.update = true
		return this.getSites(filter,options)
	}
	
	getUserSites(user,filter={}) {
		var pubkey = user.public_key // '953119785fac49e347f56c8c489ecfcd83672d1a7999acd0'
		var prikey = user.private_key // '206edd09c5f6781a1fc1545a3e5e8b7d9d1c87c633ffd5a4'
		var method = "GET"
		var request = "/user/stations"
		var apiurl = this.config.url
		var timestamp = new Date().toUTCString()
		var content_to_sign = method + request + timestamp + pubkey
		var signature = crypto.createHmac('sha256',prikey).update(content_to_sign).digest('hex')
		return axios.get(
			apiurl + request,
			{headers: { Accept: "application/json", 
					    Authorization: "hmac " + pubkey + ":" + signature, 
						Date: timestamp}}
		).then(result=>{
			return result.data.map(s=>{
				return new CRUD.estacion({
					id_externo: s.name.original.toString(),
					nombre: s.name.custom,
					tabla: "red_salado",
					propietario: "GSF",
					URL: this.config.url,
					tipo: "M",
					automatica: true,
					real: true,
					has_obs: true,
					geom: new CRUD.geometry({
						type: "Point",
						coordinates: s.position.geo.coordinates
					}),
					altitud: s.position.altitude
				})
			}).filter(estacion=>{
				if(filter.id_externo) {
					if(estacion.id_externo == filter.id_externo) {
						return true
					} else {
						return false
					}
				} else {
					return true
				}
			})
		})
	}
	getSites(filter,options) {
		if(filter.user) {
			if(!this.config.users[user]) {
				return Promise.reject("user not found")
			}
			return getUserSites(this.config.users[user],filter)
			.then(results=>{
				if(options.update) {
					return crud.upsertEstaciones(results)
				} else {
					return results
				}
			})
		}
		var userkeys = Object.keys(this.config.users)
		return Promise.allSettled(userkeys.map(key=>{
			return this.getUserSites(this.config.users[key])
		}))
		.then(results=>{
			console.log({results:results})
			var stations = results.map(r=>{
				if(r.status == "fulfilled") {
					return r.value
				} else {
					console.error({reason:r.reason})
					return
				}
			})
			stations = [].concat.apply([], stations)
			if(options.update) {							// IF options.update THEN UPSERT ESTACIONES AND UPSERT SERIES
				return crud.upsertEstaciones(stations)
				.then(stations=>{
					var series = [].concat.apply([],stations.map(estacion=>{		// UPSERT SERIES
						return Object.keys(this.config.variable_ids).map(v_key=>{
							return new CRUD.serie({tipo:"puntual", estacion_id:estacion.id, var_id: this.config.variable_ids[v_key].var_id, unit_id: this.config.variable_ids[v_key].unit_id, proc_id: 1})
						})
					}))
					return Promise.all([stations,crud.upsertSeries(series)])
				})
			} else {
				return stations
			}
		})
	}
	getHourlyData(filter={},options={}) {
		if(!filter.estacion_id || !filter.timestart || !filter.timeend) {
			return Promise.reject("Missing estacion_id and/or timestart and/or timeend")
		}
		if(parseInt(filter.estacion_id).toString() == "NaN") {
			return Promise.reject("estacion_id debe ser un número entero")
		}
		var	timestart = new Date(filter.timestart)
		if(timestart.toString() == "Invalid Date") {
			return Promise.reject("invalid timestart")
		}
		var	timeend = new Date(filter.timeend)
		if(timeend.toString() == "Invalid Date") {
			return Promise.reject("invalid timeend")
		}
		return crud.getEstacion(filter.estacion_id)
		.then(estacion=>{
			//~ console.log("found estacion, id_externo:" + estacion.id_externo)
			var userkeys = Object.keys(this.config.users)
			var user
			var station
			for(var i=0;i<userkeys.length;i++) {
				if(this.config.users[userkeys[i]].stations[estacion.id_externo]) {
					//~ console.log("estacion found on user " + userkeys[i])
					user = this.config.users[userkeys[i]]
					station = this.config.users[userkeys[i]].stations[estacion.id_externo]
				}
			}
			if(!user) {
				throw("Station not found in accessor config")
			}
			var pubkey = user.public_key // '953119785fac49e347f56c8c489ecfcd83672d1a7999acd0'
			var prikey = user.private_key // '206edd09c5f6781a1fc1545a3e5e8b7d9d1c87c633ffd5a4'
			var method = "GET"
			var station_id = estacion.id_externo // station.station_keys[0] // "00000477"
			var request = "/data/optimized/" + station_id + "/hourly/from/" + Math.round(timestart.getTime()/1000).toString() + "/to/" + Math.round(timeend.getTime()/1000).toString()
			var apiurl = this.config.url // "https://api.fieldclimate.com/v1"
			var timestamp = new Date().toUTCString()
			var content_to_sign = method + request + timestamp + pubkey
			// console.log(content_to_sign)
			var signature = crypto.createHmac('sha256',prikey).update(content_to_sign).digest('hex')
			// console.log(signature)
			return axios.get(
				apiurl + request,
				{headers: { Accept: "application/json", 
							Authorization: "hmac " + pubkey + ":" + signature, 
							Date: timestamp}}
			).then(result=> {
				if(!result.data) {
					throw("No data found 1")
				}
				if(!result.data.data) {
					throw("No data found 2")
				}
				var dates = result.data.dates.map(d=>new Date(d))
				// console.log(JSON.stringify(result.data,null,2))
				var data_keys = Object.keys(result.data.data)
				return Promise.allSettled(data_keys.filter(key=>{
					if(this.config.variable_ids[result.data.data[key].code]) {
						if(filter.var_id) {
							var var_id = this.config.variable_ids[result.data.data[key].code].var_id
							if(Array.isArray(filter.var_id)) {   // 	if filter.var_id, filter by var_id
								if(filter.var_id.indexOf(var_id) >= 0) {
									return true
								} else {
									return false
								}
							} else if (filter.var_id == var_id) {
								return true
							} else {
								return false
							}
						} else {
							return true
						}
					} else {
						//~ console.log("skipping variable " + result.data.data[key].code + ", not found in accessor config")
						return false
					}
				}).map(key=> {
					//~ console.log({data_key:key})
					var vardata = result.data.data[key]
					var var_id = this.config.variable_ids[vardata.code].var_id
					var unit_id = this.config.variable_ids[vardata.code].unit_id
					if(! vardata.aggr.avg) {
						console.error("no avg data found for key:"+key) 
						return Promise.reject("no avg data found for key:"+key)
					}
					return crud.getSeries("puntual",{estacion_id: filter.estacion_id, var_id: var_id, unit_id: unit_id, proc_id:1})
					.then(series=>{
						if(series.length==0) {
							console.log({message:"series not found",params:{estacion_id: filter.estacion_id, var_id: var_id, unit_id: unit_id, proc_id:1}})
							throw({message:"series not found",params:{estacion_id: filter.estacion_id, var_id: var_id, unit_id: unit_id, proc_id:1}})
						}
						//~ console.log("found series_id:"+series[0].id)
						var series_id = series[0].id
						return vardata.aggr.avg.map( (avg,i)=> {
							return new CRUD.observacion({tipo: "puntual", series_id:series_id, timestart: new Date(dates[i].getTime() - 3600*1000), timeend: dates[i], valor: avg})
						})
					})
					.then(observaciones=>{
						observaciones = [].concat.apply([],observaciones)
						if(options.update) {
							return crud.upsertObservaciones(observaciones)
						} else {
							return observaciones
						}
					})
				}))
				.then(results=>{
					console.log({results:results})
					return results.filter(r=>{
						if(r.status == "fulfilled") {
							return true
						} else {
							return false
						}
					}).map(r=>r.value)
				})
			})
				//~ fs.writeFile('/tmp/sensors.json',JSON.stringify(result.data,null,2), ()=> {
					//~ console.log("done")
				//~ })
		})
	}
	
	getMultipleStationsHourlyData(filter,options) {
		if(Array.isArray(filter.estacion_id)) {
			return Promise.allSettled(filter.estacion_id.map(e_id=>{
				var e_filter = filter
				e_filter.estacion_id = e_id
				return this.getHourlyData(filter,options)
			}))
			.then(results=>{
				return results.filter(r=>{
					if(r.status == "fulfilled") {
						return true
					} else {
						return false
					}
				}).map(r=>r.value)
			})
		} else {
			return this.getHourlyData(filter,options)
		}
	}
}

internal.conae_api = class {
	constructor(config) {
		this.default_config = {
			ftp_connection_pars: {host:"", user: "", password: ""},
			localcopy: '/tmp/conae_api.zip',
			outputdir: "../data/conae_api", 
			series_id: undefined
		}
		this.config = this.default_config
		if(config) {
			Object.keys(config).forEach(key=>{
				this.config[key] = config[key]
			})
		}
	}
	test() {
		return ftp.connect(this.config.ftp_connection_pars)
		.then( serverMessage=>{
			console.log('serverMessage:'+serverMessage)
			ftp.end()
			return true
		}).catch(e=>{
			console.error(e)
			ftp.end()
			return false
		})
	}
	get(filter={},options={}) {
		var timestart,timeend
		if(!filter.timestart && !filter.timeend) {
			if(!filter.date) {
				return Promise.reject("date missing")
			}
			timeend = new Date(filter.date)
			if(timeend.toString() == "Invalid Date") {
				return Promise.reject("invalid date")
			}
			timestart = new Date(timeend.getTime() - 6*24*3600*1000)
		} else {
			if(filter.timestart) {
				timestart = new Date(filter.timestart)
				if(timestart.toString() == "Invalid Date") {
					return Promise.reject("invalid date")
				}
				timeend = new Date(timestart.getTime() + 6*24*3600*1000)
			} else {
				timeend = new Date(filter.timeend)
				if(timeend.toString() == "Invalid Date") {
					return Promise.reject("invalid date")
				}
				timestart = new Date(timeend.getTime() - 6*24*3600*1000)
			}
		}
		var url = sprintf ("CONAE_MOD_MHS_GPMIMERG_PCNTLAPI_%s_%s_v001.zip", timestart.toISOString().substring(0,10).replace(/-/g,""), timeend.toISOString().substring(0,10).replace(/-/g,"")) 
		var dir = __dirname + "/" + this.config.outputdir + "/" + timeend.toISOString().substring(0,10).replace(/-/g,"")
		if(!fs.existsSync(dir)) {
			fs.mkdirSync(dir)
		}
		var output = dir + "/" + url
		var gtiff_file = dir + "/" + url.replace(/\.zip$/,".tif")
		return this.getFile(url,output,options)
		.then(()=>{
			return new Promise( (resolve, reject) => {
				console.log('unzip -o ' + output + ' -d ' + dir)
				exec('unzip -o ' + output + ' -d ' + dir, (error, stdout, stderr) => {
					if(error) {
						reject(error)
						return
					}
					if(stdout) {
						console.log(stdout)
					}
					if(stderr) {
						console.log(stderr)
					}
					resolve(gtiff_file)
				})
			})
		})
		.then(gtiff_file=>{
			return new Promise( (resolve, reject) => {
				exec('gdal_edit.py -a_nodata -9999 ' + gtiff_file, (error, stdout, stderr) => {
					if(error) {
						reject(error)
						return
					}
					if(stdout) {
						console.log(stdout)
					}
					if(stderr) {
						console.log(stderr)
					}
					resolve(fsPromises.readFile(gtiff_file,{encoding:'hex'}))
				})
			})
		})
		.then(data=>{
			var new_timestart = new Date(new Date(timestart.toISOString().substring(0,10)).getTime() + 6*24*3600*1000)
			var new_timeend = new Date(new_timestart.getTime() + 1*24*3600*1000)
			console.log("read observacion from tif file, data length:" + data.length)
			return new CRUD.observacion({tipo:"raster",series_id:this.config.series_id,timestart:new_timestart,timeend:new_timeend,valor: '\\x' + data})
		})
	}
	
	update(filter,options) {
		return this.get(filter,options)
		.then(observacion=>{
			return crud.upsertObservacion(observacion)
		})
	}
	
	getFile(url,output = this.config.localcopy,options) {
		return ftp.connect(this.config.ftp_connection_pars)
		.then( serverMessage=>{
			console.log('serverMessage:'+serverMessage)
			return ftp.get(url)
			.then( stream=>{
				console.log("got file " + url)
				return new Promise(function (resolve, reject) {
				  stream.once('close', ()=>{
					  console.log("stream closed")
					  ftp.end()
					  resolve(output)
				  })
				  stream.once('error', err=>{
					  console.log("stream error")
					  ftp.end()
					  reject(err)
			      })
				  stream.pipe(fs.createWriteStream(output))
				});
			})
			//~ .then( () => {
				//~ return ftp.end()
			//~ }).catch(e=>{
				//~ console.error(e)
				//~ ftp.end()
				//~ throw(e)
			//~ })
		})
	}
}


internal.conae_hem = class {
	constructor(config) {
		this.default_config = {
			ftp_connection_pars: {host:"", user: "", password: "", path: "/"},
			localcopy: '/tmp/conae_hem.zip',
			outputdir: "../data/conae_hem" 
		}
		this.config = this.default_config
		if(config) {
			Object.keys(config).forEach(key=>{
				this.config[key] = config[key]
			})
		}
	}
	test() {
		return ftp.connect(this.config.ftp_connection_pars)
		.then( serverMessage=>{
			console.log('serverMessage:'+serverMessage)
			ftp.end()
			return true
		}).catch(e=>{
			console.error(e)
			ftp.end()
			return false
		})
	}
	get(filter={},options={}) {
		var ftp_pars = this.config.ftp_connection_pars
		return new Promise( (resolve, reject) => {
			exec('curl "ftp://' + ftp_pars.user + ':' + ftp_pars.password + '@' + ftp_pars.host+'/"', (error,stdout,stderr)=>{  //  GET DIR LIST
				if(error) {
					console.error(error)
					reject(error)
					return
				}
				if(!stdout) {
					console.error("no output")
					reject("no output")
					return
				}
				if(stderr) {
					console.log(stderr)
				}
				var list = stdout.split(/\n/).map(i=> {
					var r = i.split(/\s+/)
					return r[r.length-1]
				}).filter(i=> i != "")
				//~ console.log({list:list})
				var lastDirName = list[list.length-1]
				console.log("lastDirName: "+lastDirName)
				var localdirpath = __dirname + "/" + this.config.outputdir + "/" + lastDirName
				var localfilepath = __dirname + "/" + this.config.outputdir + "/" + lastDirName + "/VA_HEMBATCH.zip"
				exec("mkdir -p " + localdirpath, (error, stdout, stderr) => {   // MAKE LOCAL DIR
					if(error) {
						console.error(error)
						reject(error)
						return
					}
					if(stdout) {
							console.log(stdout)
					}
					if(stderr) {
							console.log(stderr)
					}
					exec('curl "ftp://' + ftp_pars.user + ':' + ftp_pars.password + '@'+ ftp_pars.host+'/'+lastDirName+'/VA_HEMBATCH.zip" >'+localfilepath, (error,stdout,stderr)=>{  // GET FILE
						if(error) {
							console.error(error)
							reject(error)
							return
						}
						if(stdout) {
							console.log(stdout)
						}
						if(stderr) {
							console.log(stderr)
						}
						exec( "unzip " + localfilepath + " -d " + localdirpath, (error, stdout, stderr) => {   // UNZIP FILE
							if(error) {
								console.error(error)
								reject(error)
								return
							}
							if(stdout) {
								console.log(stdout)
							}
							if(stderr) {
								console.log(stderr)
							}
							resolve(fsPromises.readdir(localdirpath))  // POR AHORA TERMINA ASÍ
						})
					})
				})
			})
		})
	}

		//~ var ftp = new PromiseFtp();
		//~ return ftp.connect(this.config.ftp_connection_pars)
		//~ .then(serverMessage => {
			//~ console.log('serverMessage:'+serverMessage)
			//~ return ftp.list() // 	GET DIR LIST OF ROOT PATH
		//~ })
		//~ .then(list=>{
			//~ console.log('Directory listing:');
			//~ console.dir(list);
			//~ var lastDir = list[list.length-1]  // GET LAST DIR
			//~ var localdirpath = __dirname + "/" + config.download_dir + "/" + lastDir.name 
			//~ var localfilepath = __dirname + "/" + config.download_dir + "/" + lastDir.name + "/VA_HEMBATCH.zip"
			//~ if(options.no_update) {
				//~ if(fs.existsSync(localfilepath)) {
					//~ console.log("File exists locally, Skipping download")
					//~ return fsPromises.readdir(localdirpath)
				//~ }
			//~ }
			//~ return ftp.get("/" + lastDir.name + "/VA_HEMBATCH.zip")
			//~ .then(stream => {
				//~ console.log("got file " + lastDir.name + "/VA_HEMBATCH.zip" +", writing into file" + localfilepath)
				//~ return new Promise(function (resolve, reject) {
					//~ exec("mkdir -p " + localdirpath, (error, stdout, stderr) => {   // MAKE LOCAL DIR
						//~ if(error) {
							//~ console.error(error)
							//~ reject(error)
							//~ return
						//~ }
						//~ if(stdout) {
							//~ console.log(stdout)
						//~ }
						//~ if(stderr) {
							//~ console.log(stderr)
						//~ }
						//~ var writeStream = fs.createWriteStream(localfilepath,{emitClose:true}) // WRITE LOCAL FILE
						//~ writeStream.on('close', ()=>{ // UNZIP ON CLOSE LOCAL FILE 
							//~ ftp.end()
							//~ console.log("write closed")
							//~ exec( "unzip " + localfilepath + " -d " + localdirpath, (error, stdout, stderr) => {   
								//~ if(error) {
									//~ console.error(error)
									//~ reject(error)
									//~ return
								//~ }
								//~ if(stdout) {
									//~ console.log(stdout)
								//~ }
								//~ if(stderr) {
									//~ console.log(stderr)
								//~ }
								//~ resolve(fsPromises.readdir(localdirpath))  // POR AHORA TERMINA ASÍ
							//~ })
						//~ })
						//~ stream.pipe(writeStream,{end:true});
						//~ stream.once('error',(error)=>reject(error))
					//~ }) 
				//~ })
			//~ })
		//~ })
	//~ }
	update(filter={},options={}) {
		return this.get(filter,options)
	}
}

internal.delta_qmeddiario = class {
	constructor(config) {
		this.default_config = {
			series_ids: [25480, 25479, 25481],
			first_data_col: 2,
			file: '../public/planillas/delta_qmeddiario.xls',
			csvfile: "../public/planillas/delta_qmeddiario.txt" 
		}
		this.config = this.default_config
		if(config) {
			Object.keys(config).forEach(key=>{
				this.config[key] = config[key]
			})
		}
	}
	test() {
		return fsPromises.access(__dirname + "/" + this.config.localcopy)
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
	}
	get(filter={},options) {
		return this.convertAndReadObs(filter.file,{timestart:filter.timestart,timeend:filter.timeend})	
	}
	update(filter={},options) {
		return this.convertAndReadObs(filter.file,{timestart:filter.timestart,timeend:filter.timeend})	
		.then(data=>{
			var observaciones  = data.map(d=> {
				var obs = new CRUD.observacion(d)
				  //~ console.log(obs.toString())
				return obs
			}) // .filter(o=> parseFloat(o.valor).toString()!=='NaN')
			return crud.upsertObservaciones(observaciones)
		})
	}
	convertAndReadObs(file,options) {
		return new Promise( (resolve, reject) => {
			exec('ssconvert -O locale=en_US.utf8 ' + file + " " + __dirname + "/" + this.config.csvfile, (error,stdout,stderr)=> {
				if(error) {
					reject(error)
					return
				}
				if(stdout) {
					console.log(stdout)
				}
				if(stderr) {
					console.error(stderr)
				}
				resolve(fsPromises.readFile( __dirname + "/" + this.config.csvfile,{encoding:'ascii'}))
			})
		})
		.then(data=>{
			console.log("txt file read at " + new Date())
			var data = data.split("\n").map(r=> r.split(","))
			var header = data.shift()
			var observaciones = []
			for(var i=0;i<data.length;i++) {
				//~ console.log({i:i,row:data[i]})
				var timestart=new Date(data[i][0])
				if(timestart.toString() == "Invalid Date") {
					console.error("invalid date: " + data[i][0])
					continue
				}
				var timeend = new Date()
				timeend.setTime(timestart.getTime() + 24*3600*1000)
				if(options.timestart) {
					if(timestart < new Date(options.timestart)) { // skip row
						continue
					}
				}
				if(options.timeend) {
					if(timeend > new Date(options.timeend)) { // skip row
						continue
					}
				}
				for(var j=0;j< this.config.series_ids.length;j++) {
					var col = this.config.first_data_col + j
					var obs = {series_id: this.config.series_ids[j], timestart:timestart, timeend: timeend, valor: parseFloat(data[i][col])}
					if(obs.valor.toString() == "NaN") {
						console.error("invalid obs: " + obs.toString())
						continue
					}
					console.log(obs) 
					observaciones.push(obs)
				}
			}
			//~ console.log({observaciones:observaciones})
			return observaciones
		})
	}
}

internal.sat2 = class {
	constructor(config) {
		this.default_config = {
			sensores: {
				"7": {"var_id": 38, "proc_id": 1, "unit_id": 9}, 
				"10": {"var_id": 55, "proc_id": 1, "unit_id": 13}, 
				"11": {"var_id": 57, "proc_id": 1, "unit_id": 16}, 
				"12": {"var_id": 53, "proc_id": 1, "unit_id": 12}, 
				"13": {"var_id": 58, "proc_id": 1, "unit_id": 15}, 
				"14": {"var_id": 14, "proc_id": 1, "unit_id": 33}, 
				"15": {"var_id": 60, "proc_id": 1, "unit_id": 17}, 
				"146": {"var_id": 2, "proc_id": 1, "unit_id": 11}, 
				"147": {"var_id": 2, "proc_id": 1, "unit_id": 11}, 
				"148": {"var_id": 2, "proc_id": 1, "unit_id": 11}, 
				"149": {"var_id": 37, "proc_id": 1, "unit_id": 11}, 
				"162": {"var_id": 2, "proc_id": 1, "unit_id": 11}
				//~ "13": { "var_id":12, "unit_id":15, "proc_id":1},  //          # humedad
				//~ "15": {"var_id":16, "unit_id":17, "proc_id":1}, //            # presion
                //~ "7": {"var_id":38, "unit_id":9, "proc_id":1},              // pluviometro
                //~ "146": {"var_id":2, "unit_id":11, "proc_id":1},            // limnimetro
                //~ "11": {"var_id":11, "unit_id":16, "proc_id":1},            // veleta
                //~ "147": {"var_id":2, "unit_id":11, "proc_id":1},            // limnimetro
                //~ "12": {"var_id":53, "unit_id":12, "proc_id":1},             // temperatura
                //~ "162": {"var_id":2, "unit_id":11, "proc_id":1},            // limnimetro
                //~ "148": {"var_id":2, "unit_id":11, "proc_id":1},            // nivel radar
                //~ "10": {"var_id":55, "unit_id":13, "proc_id":1},            // anemometro
                //~ "149": {"var_id":37, "unit_id":11, "proc_id":1},           // nivel nieve
                //~ "14": {"var_id":14, "unit_id":33, "proc_id":1}            // radiacion
			},
			user: "RHN",
			password: "1R2H",
			url: "http://utr.gsm.ina.gob.ar:5667/SAT2Rest/api/"
		}
		this.config = this.default_config
		if(config) {
			Object.keys(config).forEach(key=>{
				this.config[key] = config[key]
			})
		}
	}
	test() {
		var cookieJar = request.jar()
		return this.AutenticarUsuario(cookieJar)
		.then(result=>{
			console.log({idCliente:result.idCliente})
			return true
		})
		.catch(e=>{
			return false
		})
	}
	getSites(filter) {  // filter.id_externo = idEquipo, filter.nombre =~ descripcion
		console.log({filter:filter})
		var cookieJar = request.jar()
		return this.AutenticarUsuario(cookieJar)
		.then(result=> {
			console.log({idCliente:result.idCliente})
			return this.RecuperarEquipos(result.idCliente,cookieJar)
		})
		.then(estaciones=>{
			if(filter) {
				if(filter.id_externo) {
					if(Array.isArray(filter.id_externo)) {
						estaciones = estaciones.filter(e=> filter.id_externo.indexOf(e.idEquipo.toString()) >= 0)
					} else { 
						estaciones = estaciones.filter(e=> e.idEquipo.toString() == filter.id_externo)
					}
				}
				if(filter.nombre) {
					estaciones = estaciones.filter(e=> new RegExp(filter.nombre).test(e.descripcion))
				}
				if(filter.id_grupo) {
					estaciones = estaciones.filter(e=> e.idGrupo == filter.id_grupo)
				}
			}
			return estaciones.map(estacion=>{
				console.log({estacion:estacion})  // idEquipo, descripcion, lat, lng, NroSerie, fechaAlta, sensores, idGrupo
				return {
					nombre: estacion.descripcion,
					id_externo: estacion.idEquipo,
					geom: {
						type: "Point",
						coordinates: [ -1*estacion.lng, -1*estacion.lat ]
					},
					tabla: "sat2",
					series: estacion.sensores.map(sensor=> this.config.sensores[sensor.idSensor]).filter(s=>s)
				}
			})
		})
	}
	updateSites(filter) {
		return this.getSites(filter)
		.then(estaciones=>{
			return Promise.all(estaciones.map(estacion=>{ //for(var i=0;i<estaciones.length;i++) {
				
				estacion = new CRUD.estacion(estacion)
				return Promise.all([crud.upsertEstacion(estacion),estacion.series])
				.then(result=>{
					var [estacion, series] = result
					if(series && series.length>0) {
						series = series.map(serie=>{
							serie.tipo = "puntual"
							serie.estacion_id = estacion.id
						})
						return Promise.all([estacion,crud.upsertSeries(series)])
					} else {
						return Promise.all([estacion,[]])
					}
				})
				.then(result=>{
					var [estacion, series] = result
					if(estacion) {
						estacion.series = series
						return estacion
					} else {
						return
					}
				})
			}))
		})
	}
	get(filter={},options) {
		if(!filter.timestart || !filter.timeend) {
			return Promise.reject("timestart or timeend missing")
		}
		var cookieJar = request.jar()
		return this.AutenticarUsuario(cookieJar)												// AUTENTICACION
		.then(result=> {
			filter.tabla = "sat2"
			return crud.getEstaciones(filter)													// GETESTACIONES DE DB
			.then(estaciones=>{
				return Promise.all(estaciones.map(estacion=>{
					//~ console.log({estacion:estacion})
					var seriesFilter = filter
					seriesFilter.estacion_id = estacion.id
					seriesFilter.proc_id = 1
					//~ console.log({seriesFilter:seriesFilter})
					return Promise.all([estacion,crud.getSeries("puntual",seriesFilter)])		// GETSERIES DE DB
					.then(result=>{
						var [estacion, series] = result
						return Promise.all(series.map(serie=>{
							//~ console.log({serie:serie})
							//~ console.log({var_id: serie.var.id})								// BUSCA IDSENSOR EN CONFIG
							var idSensores = Object.keys(this.config.sensores).filter(key=> this.config.sensores[key].var_id == serie.var.id && this.config.sensores[key].unit_id == serie.unidades.id)
							if(idSensores.length==0) {
								//~ console.log("idSensor not found")
								return null
							}
							return Promise.all(idSensores.map(idSensor=>{						// DESCARGA DATOS DE EQUIPO POR SENSOR DE API 
								return Promise.all([serie,this.RecuperarHistoricosDeEquipoPorSensor(estacion.id_externo,idSensor,filter.timestart,filter.timeend,cookieJar)])
								.then(result=>{ // idEquipo, idSensor, fecha, valor
									var [serie,historicos] = result
									//~ console.log({historicos:historicos})
									return crud.removeDuplicates(historicos.body.map(observacion=>{
										return {
											tipo: "puntual",
											series_id: serie.id,
											timestart: observacion.fecha,
											timeend: observacion.fecha,
											valor: observacion.valor
										}
									}))
								})
							}))
						}))
					})
				}))
			})
		})
		.then(result=>{
			return flatten(result).filter(o=>o)
		})
	}
	update(filter={},options) {
		return this.get(filter,options)
		.then(observaciones=>{
			return crud.upsertObservaciones(observaciones)
		})
	}
	
	AutenticarUsuario(cookieJar) {
		return new Promise( (resolve, reject) => {
			request.post({url: this.config.url + 'AutenticarUsuario',jar:cookieJar, 
			  json: {
				nombreDeUsuario: this.config.user,
				clave: this.config.password
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
	RecuperarEquipos(idCliente,cookieJar) {
		return new Promise( (resolve, reject) => {
			request.post({url: this.config.url + 'RecuperarEquipos',jar:cookieJar, json: {
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
	
}

// NCEP WAVE Model Forecasts
internal.gefs_wave = class {
	constructor(config) {
		this.default_config = {
			api_url: "https://nomads.ncep.noaa.gov/cgi-bin/filter_gefs_wave_0p25.pl",
			files_url: "https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/",
			data_dir: "/../data/gefs_wave/",
			bbox: { leftlon: -61, rightlon: -50, toplat: -31, bottomlat:-41},
			start_hour: 0,
			end_hour: 96,   // 96
			dt: 3,
			levels: [ "surface"],
			variables: [ "UGRD", "VGRD" ],
			variable_map: {
				"UGRD": {
					name: "ugrd",
					var_id: 65,
					proc_id:5,
					unit_id: 355,
					series_id:11
				},
				"VGRD": {
					name: "vgrd",
					var_id: 66,
					proc_id: 5,
					unit_id: 355,
					series_id:12
				}
			}
		}
		this.config = {}
		Object.keys(this.default_config).forEach(key=>{
			this.config[key] = config[key]
		})
		if(config) {
			Object.keys(config).forEach(key=>{
				this.config[key] = config[key]
			})
		}
	}
	test() {
		return axios.get(this.config.api_url)
		.then(()=>{
			console.log("accessor test ok")
			return true
		})
		.catch(e=>{
			console.log("accessor test failed")
			return false
		})
	}
	get(filter={},options={}) {
		try {
			var dates = this.getDates(filter) 
		} catch(e) {
			return Promise.reject(e)
		}
		var forecast_date = dates.forecast_date
		var timestart = dates.timestart
		var timeend = dates.timeend
		var dates_dir = dates.dates_dir
		var times_dir = dates.times_dir
		var forecast_date_path = dates.forecast_date_path
		var forecast_time_path = dates.forecast_time_path
		if(! fs.existsSync(forecast_date_path)) {
			fs.mkdirSync(forecast_date_path)
		}
		if(! fs.existsSync(forecast_time_path)) {
			fs.mkdirSync(forecast_time_path)
		}
		console.log("accessors.gefs_wave.get: path:" + this.path)
		var hours = []
		for(var i=this.config.start_hour;i<=this.config.end_hour;i=i+this.config.dt) {
			if(i>240 && i%2!=0) {
				continue
			}
			var forecast_time = new Date(forecast_date.getTime() + 1000*3600*i)
			// SKIPS DATES OUT OF RANGE
			if(timestart && forecast_time < timestart) {
				continue
			}
			if(timeend && forecast_time > timeend) {
				continue
			}
			hours.push(i)
		}
		return Promise.allSettled(hours.map(async i=>{
			var file = sprintf ("gefs.wave.t%02dz.c00.global.0p25.f%03d.grib2", forecast_date.getUTCHours(), i)
			//~ console.log({file:file})
			//~ if(files.indexOf(file) < 0) {
				//~ throw("file not found")
			//~ }
			var params = {
				file: file,
				subregion: "",
				dir: "/" + dates_dir + times_dir + "wave/gridded"
			}
			Object.keys(this.config.bbox).forEach(key=>{
				params[key] = this.config.bbox[key]
			})
			this.config.levels.forEach(level=>{
				params["lev_"+level] = "on"
			})
			this.config.variables.forEach(variable=>{
				params["var_"+variable] = "on"
			})
			var localfilepath = __dirname + this.config.data_dir + dates_dir + times_dir + file
			//~ console.log({localfilepath:localfilepath})
			var writer = fs.createWriteStream(localfilepath)
			try {
				var response = await axios.get(this.config.api_url, {params:params, responseType:'stream'})
			} catch (e) {
				return Promise.reject(e)
			}
			// .then(response=>{
				//~ console.log({localfilepath_:localfilepath})
			response.data.pipe(writer)
			return new Promise((resolve, reject) => {
				writer.once('finish', ()=>{
					setTimeout(()=>{
						resolve(grib2obs({filepath:localfilepath,variable_map:this.config.variable_map,bbox:this.config.bbox,units:"metros_por_segundo"})) //this.grib2obs(localfilepath))
					},1000)
				})
				writer.on('error', reject)
				//~ response.data.on('end',()=>{
					//~ resolve(this.grib2obs(localfilepath))
				//~ })
				response.data.on('error', (e) =>{
					reject("file:" + localfilepath + " write failed, error:" + e.toString())
				})
			})
			// })
		}))
		.then(results=>{
			var observaciones = flatten(results.map(result=>{
				if(result.status == "rejected") {
					if(config.verbose) {
						console.error(result.reason)
					} else {
						printAxiosGetError(result.reason)
					}
					return null
				}
				return result.value
			}).filter(r=>r))
			return observaciones
		})
	}
	update(filter={},options={}) {
		return this.get(filter,options)
		.then(observaciones=>{
			console.log({length:observaciones.length})
			return crud.upsertObservaciones(observaciones)
		})
		.then(result=>{
			if(options.no_send_data) {
				if(result && result.length > 0) {
					var timestart = new Date(result.map(o=>o.timestart).reduce((a,b)=>Math.min(a,b)))
					var timeend = new Date(result.map(o=>o.timeend).reduce((a,b)=>Math.max(a,b)))
					var count = result.length
					return {
						path: this.path,
						count: count,
						timestart: timestart,
						timeend: timeend
					}
				} else {
					return {
						path: this.path
					}
				}
			} else {
				return result
			}
		})
	}
	getDates(filter) {
		var forecast_date = (filter.forecast_date) ? new Date(filter.forecast_date) : new Date()
		if(forecast_date.toString() == "Invalid Date") {
			throw("Invalid forecast date")
		}
		var timestart, timeend
		if(filter.timestart) {
			timestart = new Date(filter.timestart)
			if(timestart.toString() == "Invalid Date") {
				throw("Invalid timestart")
			}
		}
		if(filter.timeend) {
			timeend = new Date(filter.timeend)
			if(timeend.toString() == "Invalid Date") {
				throw("Invalid timeend")
			}
		}
		// 	SET TIME TO MULTIPLE OF 6 //
		forecast_date.setUTCHours(forecast_date.getUTCHours() - forecast_date.getUTCHours()%6)
		var dates_dir = sprintf ("gefs.%04d%02d%02d/",forecast_date.getUTCFullYear(),forecast_date.getUTCMonth()+1,forecast_date.getUTCDate())
		var times_dir = sprintf ("%02d/", forecast_date.getUTCHours())
		// console.log({forecast_date: forecast_date.toISOString(),times_dir:times_dir, dates_dir:dates_dir})
		var forecast_date_path = __dirname + this.config.data_dir + dates_dir.replace(/\/$/,"")
		var forecast_time_path = __dirname + this.config.data_dir + dates_dir + times_dir.replace(/\/$/,"")
		this.path = forecast_time_path
		return {
			forecast_date: forecast_date,
			timestart: timestart,
			timeend: timeend,
			dates_dir: dates_dir,
			times_dir: times_dir,
			forecast_date_path: forecast_date_path,
			forecast_time_path: forecast_time_path
		}
	}
	printMaps(forecast_date) {
		return this.getDates({forecast_date:forecast_date})
		.then(dates=>{
			return this.callPrintMaps(dates.forecast_date_path)
		})
	}
	callPrintMaps(path,skip_print) {
		var mapset = sprintf("%04d",Math.floor(Math.random()*10000))
		var location = sprintf("%s/%s",config.grass.location,mapset) // sprintf("%s/GISDATABASE/WGS84/%s",process.env.HOME,mapset)
		var batchjob = sprintf("%s/../py/print_wind_map.py",__dirname)
		if(path) {
			console.log("callPrintWindMap: path: " + path)
			process.env.gefs_run_path = path
		}
		if(skip_print) {
			process.env.skip_print = "True"
		}
		var command = sprintf("grass %s -c --exec %s", location, batchjob)
		return pexec(command)
		.then(result=>{
			console.log("batch job called")
			var stdout = result.stdout
			var stderr = result.stderr
			if(stdout) {
				console.log(stdout)
			}
			if(stderr) {
				console.error(stderr)
			}
			process.env.gefs_run_path = undefined
		})
	}
}

internal.fdx = class {
	constructor(config) {
		if(config) {
			this.config = config
		} else {
			this.config = config.fdx
		}
	}
	get (filter={}, options) {
		if(!filter.timestart) {
			filter.timestart = new Date(new Date().getTime() - 8*24*3600*1000)
		} else {
			filter.timestart = new Date(filter.timestart)
			if(filter.timestart.toString() == "Invalid Date") {
				return promise.reject("Invalid timestart")
			}
		}
		if(!filter.timeend) {
			filter.timeend = new Date()
		} else {
			filter.timeend = new Date(filter.timeend)
			if(filter.timeend.toString() == "Invalid Date") {
				return promise.reject("Invalid timeend")
			}
		}
		//~ var getIds
		//~ if(!filter.estacion_id) {
			//~ getIds = pool.query("SELECT unid,nombre,id_externo from estaciones where tabla='ina_delta' ORDEr BY unid") 
		//~ } else {
			//~ if(Array.isArray(filter.estacion_id)) {
				//~ getIds = pool.query("SELECT unid,nombre,id_externo from estaciones where tabla='ina_delta' AND unid IN ($1)",[filter.estacion_id.join(",")])
			//~ } else {
				//~ getIds = pool.query("SELECT unid,nombre,id_externo from estaciones where tabla='ina_delta' AND unid=$1",[parseInt(filter.estacion_id)])
			//~ }
		//~ }
		
		//~ return getIds
		//~ .then(result=>{
			//~ if(result.rows.length == 0) {
				//~ throw("estacion_id not found")
			//~ }
		//~ var sites = config.sites.filter(site=>{
			//~ if(filter.estacion_id) {
				//~ if(Array.isArray(filter.estacion_id)) {
					//~ if(filter.estacion_id.indexOf(site.id) > 0) {
						//~ return true
					//~ } else {
						//~ return false
					//~ }
				//~ } else {
					//~ if(filter.estacion_id == site.id) {
						//~ return true
					//~ } else {
						//~ return false
					//~ }
				//~ }
			//~ } else {
				//~ return true
			//~ }
		//~ })
		return crud.getSeries('puntual',{
			estacion_id: filter.estacion_id, 
			id: filter.series_id, 
			tabla: "ina_delta", 
			var_id: 2, 
			proc_id: 1, 
			unit_id: 11
		})
		.then(series=>{
			//~ console.log(JSON.stringify(series))
			var promises = []
			series.forEach(serie=>{
				var sites = this.config.sites.filter(s=>{
					return (s.estacion_id == serie.estacion.id)
				})
				if(sites.length == 0) {
					// console.log("skipping series.id=" + serie.id)
					return
				}
				var site = sites[0]
				promises.push(axios.get(this.config.url,{
						params: {
							user: site.user, 
							site_id: site.id, 
							query: "filter_site", 
							date: filter.timestart.toISOString().substring(0,19).replace("T"," ") + "@" + filter.timeend.toISOString().substring(0,19).replace("T"," ")
						},
						responseType: "json"
					})
					.then(response=>{
						if(response.data) {
							//~ console.log({data:response.data})
							if(!Array.isArray(response.data)) {
								console.error("Error. Data must be array")
								return []
							}
							console.log({data_length: response.data.length})
							return response.data.map(d=> {
								return new CRUD.observacion({
									series_id: serie.id,
									timestart: d.hora,
									timeend: d.hora,
									timeupdate: new Date(),
									valor: d.nivel
								})
							})
						} else {
							console.log("no data for series_id=" + serie.id)
							return []
						}
					})
					.catch(error=>{
						if(config.verbose) {
							console.error(error)
						} else {
							console.error("accessors/fdx error: " + error.response.statusText + ". " + error.res.responseUrl)
						}
						return []
					})
				)
			})
			return Promise.all(promises)
			.then(results=>{
				var observaciones = []
				results.forEach(r=>{
					observaciones = [...observaciones, ...r]
				})
				return observaciones
			})
		})
	}
	update(filter,options) {
		return this.get(filter,options)
		.then(observaciones=>{
			return crud.upsertObservaciones(observaciones,"puntual")
		})
	}
	test() {
		return axios.get(this.config.url,{params: {user:this.config.sites[0].user, site_id: this.config.sites[0].id, query: "filter_site", date: "2020-01-01 00:00:00@2020-01-31 00:00:00"},responseType:"json"})
		.then(response=>{
			if(response.data) {
				return true
			} else {
				console.error("accessor test failed, empty response")
				return false
			}
		})
		.catch(error=>{
			console.error(error)
			return false
		})
	}
}

// SNIH

internal.snih = class {
	constructor(config) {
		if(config) {
			this.config = config
		} else {
			this.config = config.snih
		}
	}
	get (filter={}, options) {
		var codigoVariable, codigoEstacion, fechaDesde, fechaHasta
		if(!filter.series_id) {
			if(!filter.estacion_id) {
				return Promise.reject("falta estacion_id")
			} 
			if(!filter.var_id) {
				return Promise.reject("falta var_id")
			}
		} else {
			filter.id = filter.series_id
		}
		if(!filter.timestart || !filter.timeend) {
			return Promise.reject("Falta timestart y/o timeend")
		}
		fechaDesde = filter.timestart
		fechaHasta = filter.timeend
		delete filter.timestart
		delete filter.timeend
		delete filter.series_id
		filter.proc_id = [1,2]
		return crud.getSeries("puntual",filter)
		.then(series=>{
			if(!series) {
				throw "serie no encontrada"
			}
			if(series.length==0) {
				throw "serie no encontrada"
			}
			Object.keys(this.config.variable_map).forEach(key=> {
				if(this.config.variable_map[key].var_id == series[0].var.id) {
					codigoVariable = key
				}
			})
			//~ console.log({codigoEstacion:codigoEstacion, codigoVariable: codigoVariable})
			return fsPromises.readFile(this.config.asociaciones,{encoding:"utf8"})
			.then(data=>{
				const asociaciones = JSON.parse(data).filter(a=> {
					var id_externo = a.Estacion % 10000 // codigoEstacion = 10000*a.Red + parseInt(series[0].estacion.id_externo) 
					return (series[0].estacion.id_externo == id_externo && a.Codigo == codigoVariable)
				})
				if(asociaciones.length == 0) {
					throw ("No se encontraron asociaciones")
				}
				codigoEstacion = asociaciones[0].Estacion
				return this.getDatosHistoricos({timestart:fechaDesde,timeend:fechaHasta,estacion:codigoEstacion,codigo:codigoVariable,output:"/tmp/historicos.json"})
			})
			.then(listaDatosHistoricos=>{
				if(!listaDatosHistoricos) {
					throw "No se obtuvieron resultados"
				}
				return this.parseHistoricos(listaDatosHistoricos,{series_id:series[0].id,"var":series[0].var})
			})
		})
	}
	getDatosHistoricos(options={}) {
		const instance = axios.create({
		  httpsAgent: new https.Agent({  
			rejectUnauthorized: false
		  })
		});

		if(!options.timestart || ! options.timeend || !options.estacion || !options.codigo) {
			return Promise.reject("Faltan parametros")
		}
		var body = {"fechaDesde":options.timestart,"fechaHasta":options.timeend,"estacion":options.estacion,"codigo":options.codigo,"validados":(options.validados) ? options.validados : true}
		console.log({AccessorRequestBody:body})
		return instance.post("https://snih.hidricosargentina.gob.ar/MuestraDatos.aspx/LeerDatosHistoricos",JSON.stringify(body),{headers:{Accept: 'application/json, text/javascript, */*; q=0.01', 'Content-Type': 'application/json; charset=utf-8'}})
		.then(response=>{
			if(!response.data) {
				return
			}
			//~ var listaDatosHistoricos = response.data.d
			if(options && options.output) {
				fs.writeFile(options.output,JSON.stringify(response.data.d.Mediciones,null,2),{encoding:"utf8"},(err) => {
				  if (err) throw err;
				  console.log('The file ' + options.output + ' has been saved!');
				})
			}
			return response.data.d.Mediciones
		})
	}
	parseHistoricos(listaDatosHistoricos,options) {
		// {"FechaHora":"/Date(473425200000)/","Medicion":1.38,"Calificador":" ","Validado":true}
		return listaDatosHistoricos.map(d=>{
			var timestart =  new Date(new Date().setTime(d.FechaHora.match(/\d+/)[0]))
			var timeend = new Date(new Date().setTime(d.FechaHora.match(/\d+/)[0]))
			//~ console.log({timestart_:timestart.toISOString(), timeend_: timeend.toISOString(),timeSupport: options.var.timeSupport, timeSupport_e: timeSteps.interval2epochSync(options.var.timeSupport)})
			if(options && options.var && options.var.timeSupport && timeSteps.interval2epochSync(options.var.timeSupport) != 0) {
				//~ console.log("timeSupport not 0/null")
				if(options.var.def_hora_corte) {
					timestart = timeSteps.getPreviousTimeStep(timestart,options.var.def_hora_corte,options.var.timeSupport)
				} else {
					timestart = timeSteps.getPreviousTimeStep(timestart,null,options.var.timeSupport)
				}
				timeend = timeSteps.advanceTimeStep(timestart,options.var.timeSupport)
			}
			var observacion = {
				timestart: timestart,
				timeend: timeend,
				valor: d.Medicion,
				descripcion: "calificador:" + d.Calificador + ",validado:" + d.Validado
			}
			//~ console.log({timestart:timestart.toISOString(), timeend: timeend.toISOString()})
			if(options && options.series_id) {
				observacion.series_id = options.series_id
			}
			return observacion
		})
	}
	
	update(filter,options) {
		return this.get(filter,options)
		.then(result=>{
			return crud.upsertObservaciones(result)
		})
	}
	
	getSites(filter) {
		return this.getEstacionesSNIH()
		.then(listaEstaciones=>{
			if(filter && filter.id_externo) {
				if(!Array.isArray(filter.id_externo)) {
					filter.id_externo = [filter.id_externo]
				}
				//~ var Codigos = filter.id_externo.map(i=>parseInt(i) + 10000)
				listaEstaciones = listaEstaciones.filter(e=> {
					var Codigos = filter.id_externo.map(i=> e.Red*10000 + parseInt(i))
					//~ console.log(Codigos)
					return (Codigos.indexOf(e.Codigo) >= 0)
				})
			} 
			if(filter && filter.red_id) {
				if(!Array.isArray(filter.red_id)) {
					filter.red_id = [filter.red_id]
				}
				listaEstaciones = listaEstaciones.filter(e=> filter.red_id.indexOf(e.Red) >= 0)
			} 
			if(filter && filter.nombre) {
				listaEstaciones = listaEstaciones.filter(e=> {
					var matches = e.Descripcion.match(filter.red_id)
					if(matches) {
						return true
					} else {
						return false
					}
				})
			} 
			return this.parseEstaciones(listaEstaciones)
		})
		.then(estaciones=>{
			if(filter && filter.estacion_id) {
				filter.id = filter.estacion_id
			}
			//~ var valid_filters = ["id"] // ,"id_externo"]
			//~ for(var key of valid_filters) {
				//~ if(filter[key]) {
					//~ estaciones = estaciones.filter(e=> (e[key] == filter[key]))
				//~ }
			//~ }
			if(filter && filter.id) {
				if(!Array.isArray(filter.id)) {
					filter.id = [filter.id]
				}
				estaciones = estaciones.filter(e=> filter.id.indexOf(e.id) >= 0)
			}
			return estaciones
		})
	}
	
	getEstacionesSNIH() {
		const instance = axios.create({
		  httpsAgent: new https.Agent({  
			rejectUnauthorized: false
		  })
		});
		return instance.post("https://snih.hidricosargentina.gob.ar/Filtros.aspx/LeerEstaciones",'',{headers:{Accept: 'application/json, text/javascript, */*; q=0.01', 'Content-Type': 'application/json; charset=utf-8'}})
		.then(response=>{
			if(!response.data) {
				return
			}
			return response.data.d
		})
	}
	parseEstaciones(estaciones) {
		return Promise.all(estaciones.map(e=>{
			var tipo = (/HM/.test(e.Tipo)) ? "A" : (/H/.test(e.Tipo)) ? "H" : (/M/.test(e.Tipo)) ? "M" : undefined 
			var estacion = {
				id_externo: (e.Codigo % 10000).toString(),
				tabla: "alturas_bdhi",
				nombre: e.Descripcion,
				rio: e.Rio,
				localidad: e.Poblado,
				pais: "Argentina",
				distrito: this.config.provincias_map[e.Provincia],
				cero_ign: (e.CeroEscala != -999) ? e.CeroEscala : null,
				geom: {
					type: "Point",
					coordinates: [ -1 * e.Longitud, -1 * e.Latitud ]
				},
				altitud: e.Cota,
				automatica: (e.Transmision == 'T' || e.Transmision == 'A') ? true : false,
				tipo: tipo,
				has_obs: true,
				habilitar: e.Habilitada,
				propietario: "snih:" + e.Red,
				real: true
			}
			estacion = new CRUD.estacion(estacion)
			return estacion.getEstacionId(pool)
			.then(()=>{
				//~ console.log(estacion.toString())
				return estacion
			})
		}))
	}
	
	updateSites(filter,options) {
		return this.getSites(filter)
		.then(estaciones=>{
			console.log("got " + estaciones.length + " estaciones")
			return crud.upsertEstaciones(estaciones)
		})
	}
	//~ "Codigo": 13449,
    //~ "Descripcion": "San Javier",
    //~ "Regional": 2,
    //~ "Sistema": 2,
    //~ "Cuenca": 39,
    //~ "Red": 1,
    //~ "Subcuenca": "Río de la Plata",
    //~ "Provincia": 18,
    //~ "Rio": "Uruguay",
    //~ "Lugar": "San Javier",
    //~ "Poblado": "San Javier",
    //~ "Area": 95200,
    //~ "Cota": 79.77,
    //~ "Latitud": 27.8690833333333,
    //~ "Longitud": 55.13025,
    //~ "MesHidrologico": 1,
    //~ "NivelPsicrometrico": 1003.75,
    //~ "Ventilador": false,
    //~ "Alta": "/Date(-1459630800000)/",
    //~ "Baja": "/Date(7289578800000)/",
    //~ "CeroEscala": 79.77,
    //~ "SistemaCota": 5,
    //~ "AfluenteDe": "Río de la Plata",
    //~ "EsNavegable": "SI",
    //~ "Departamento": "San Javier",
    //~ "DistanciaDesembocadura": "960",
    //~ "Habilitada": true,
    //~ "Tipo": "HA",
    //~ "Transmision": "M",
    //~ "ModoDeLlegar": "Desde Corrientes por RN Nº 12 hasta el empalme con RN Nº 120. Continuar por la RN Nº 120, hasta el empalme con la RN Nº 14. Por esta última, hasta San José, y desde San José por la RP Nº 1 hasta la localidad de Azara. Desde Azara, tomar la R P Nº 2 hasta San Javier. Los caminos del recorrido, no presentan inconvenientes para acceder a la estación. \nTotal Recorrido: 460 Km.\n",
    //~ "Actual": "S",
    //~ "RegistroValidoHasta": "/Date(7289578800000)/",
    //~ "Autor": 115,
    //~ "Registro": "/Date(1578670814000)/"

	getSeries(filter,options) {
		if(filter && filter.id_externo && !Array.isArray(filter.id_externo)) {
			filter.id_externo = [filter.id_externo]
		}
		if(filter && filter.estacion_id && !Array.isArray(filter.estacion_id)) {
			filter.estacion_id = [filter.estacion_id]
		}
		if(filter && filter.var_id && !Array.isArray(filter.var_id)) {
			filter.var_id = [filter.var_id]
		}
		if(filter && filter.unit_id && !Array.isArray(filter.unit_id)) {
			filter.unit_id = [filter.unit_id]
		}
		return this.getEstacionMap()
		.then(()=>{
			fs.writeFile("/tmp/estacion_map.json",JSON.stringify(this.config.estacion_map,null,2),{encoding:"utf8"},err=>{
				if(err) throw err
				console.log("Se escribió el archivo /tmp/estacion_map.json")
			})
			return this.getAsociaciones(options)
			.then(listaAsociaciones=>{
				//~ return Promise.all(
				return listaAsociaciones.map(a=>{
					var id_externo = (a.Estacion % 10000).toString()
					//~ console.log({id_externo:id_externo,filter_id_externo:filter.id_externo})
					if(filter.id_externo && filter.id_externo.indexOf(id_externo)<0) {
						return
					}
					if(!this.config.estacion_map[id_externo]) {
						console.error("no existe estacion_map." + id_externo)
						return
					}
					var estacion_id = this.config.estacion_map[id_externo].id
					if(filter.estacion_id && filter.estacion_id.indexOf(estacion_id)<0) {
						return
					}
					if(!this.config.variable_map[a.Codigo]) {
						console.error("no existe variable_map." + a.Codigo)
						return
					}
					var var_id = this.config.variable_map[a.Codigo].var_id
					if(filter.var_id && filter.var_id.indexOf(var_id)<0) {
						return
					}
					var unit_id = this.config.variable_map[a.Codigo].unit_id
					if(filter.unit_id && filter.unit_id.indexOf(unit_id)<0) {
						return
					}
					//~ return crud.getEstaciones({tabla:"alturas_bdhi",id_externo:id_externo})
					//~ .then(estaciones=>{
						//~ if(estaciones.length==0) {
							//~ console.error("No existe la estación " + id_externo)
							//~ return
						//~ }
						//~ if(filter.estacion_id && estaciones[0].id != filter.estacion_id) {
							//~ return
						//~ }
					return {
						var_id: var_id,
						proc_id: 1,
						unit_id: unit_id,
						estacion_id: estacion_id // estaciones[0].id
					}
					//~ })
				}).filter(s=>s)
					
					//~ const valid_filters = ["var_id","proc_id","unit_id","estacion_id","id_externo"]
					//~ for(var key of valid_filters) {
						//~ if(filter[key]) {
							//~ series = series.filter(s=> (s[key] == filter[key]))
						//~ }
					//~ }
					//~ return series
				//~ })
			})
		})
	}
	
	upsertSeries(filter,options) {
		return this.getSeries(filter,options)
		.then(series=>{
			return crud.upsertSeries(series)
		})
	}
	//~ "__type": "Compartido.Contenedor.CAsociacionesCN",
    //~ "Estacion": 13858,
    //~ "Codigo": 206,
    //~ "Desde": "/Date(1464800707000)/",
    //~ "Hasta": "/Date(7289578800000)/",
    //~ "Minimo": 14,
    //~ "Maximo": 30,
    //~ "TipoValidacion": 11,
    //~ "Actual": "S",
    //~ "RegistroValidoHasta": "/Date(7289578800000)/",
    //~ "Autor": 3,
    //~ "Registro": "/Date(1508267336000)/"
	
	getAsociaciones(options) {
		const instance = axios.create({
		  httpsAgent: new https.Agent({  
			rejectUnauthorized: false
		  })
		});
		return instance.post("https://snih.hidricosargentina.gob.ar/MuestraDatos.aspx/LeerListaAsociaciones",'',{headers:{Accept: 'application/json, text/javascript, */*; q=0.01', 'Content-Type': 'application/json; charset=utf-8'}})
		.then(response=>{
			if(!response.data) {
				return
			}
			//~ listaAsociaciones = response.data.d
			if(options && options.output) {
				fs.writeFile(options.output,JSON.stringify(response.data.d,null,2),{encoding:"utf8"},(err) => {
				  if (err) throw err;
				  console.log('The file ' + options.output + ' has been saved!');
				})
			}
			return response.data.d
		})
	}
	
	getEstacionMap() {
		return crud.getEstaciones({tabla:"alturas_bdhi"})
		.then(estaciones=>{
			this.config.estacion_map = {}
			estaciones.forEach(e=>{
				this.config.estacion_map[e.id_externo] = {
					id: e.id,
					nombre: e.nombre
				}
			})
			return
		})
	}
}

internal.conae_gc = class {
	constructor(config) {
		if(config) {
			this.config = config
		} else {
			this.config = config.conae_gc
		}
	}
	test () {
		return ftp.connect({host: this.config.url, user: this.config.user, password: this.config.password})
		.then(()=>{
			ftp.end()
			return true
		})
		.catch(e=>{
			console.error(e)
			ftp.end()
			return false
		})
	}
	get (filter={}, options) {
		var filename, forecastDate, local_zipfile_location, dateformat, areas_id, estaciones_id, timestart_24, timeend_24, timestart_48, timeend_48
		areas_id = Object.keys(this.config.areas_map).map(key=>{
			return this.config.areas_map[key].id
		})
		estaciones_id = Object.keys(this.config.areas_map).map(key=>{
			return this.config.areas_map[key].exutorio_id
		})
		return Promise.all([crud.getSeries("puntual",{var_id:74,unit_id:9,proc_id:4,estacion_id:estaciones_id}),crud.getSeries("areal",{var_id:74,unit_id:9,proc_id:4,fuentes_id:49,area_id:areas_id})])
		.then(results=>{
			//~ console.log({results:results})
			results[0].forEach(s=>{   // series puntuales: exutorios
				Object.keys(this.config.areas_map).forEach(key=>{
					if(s.estacion.id == this.config.areas_map[key].exutorio_id) {
						//~ console.log({row_id: key, series_id: s.id})
						this.config.areas_map[key].exutorio_series_id = s.id
					}
				})
			})
			results[1].forEach(s=>{    // series areales: cuencas
				Object.keys(this.config.areas_map).forEach(key=>{
					if(s.estacion.id == this.config.areas_map[key].id) {
						//~ console.log({row_id: key, series_id: s.id})
						this.config.areas_map[key].series_id = s.id
					}
				})
			})
			//~ console.log({estaciones_map:this.config.estaciones_map})
			const client = new basicFtp.Client()
			client.ftp.verbose = false
			return client.access({host: this.config.url, user: this.config.user, password: this.config.password,secure:false})
			.then(()=>{
				return client.list()
			})
			.then(list=>{
				//~ console.log(list)
				if (filter.forecast_date) {
					forecastDate = new Date(filter.forecast_date)
					dateformat = sprintf ("%04d%02d%02d",forecastDate.getUTCFullYear(), (forecastDate.getUTCMonth()+1), forecastDate.getUTCDate())
					filename = sprintf ("GuiaCrecidas%s_v001.zip",dateformat)
					if(list.map(i=>i.name).indexOf(filename) < 0) {
						throw("File: " + filename + " no existe")
					}
				} else {
					filename = list.map(i=>i.name).filter(i=> (/^GuiaCrecidas/.test(i))).sort().reverse()[0]
					dateformat = filename.match(/\d{8}/)[0]
					forecastDate = new Date(dateformat.substring(0,4),dateformat.substring(4,6)-1,dateformat.substring(6,8))
				}
				console.log({filename: filename})
				local_zipfile_location = __dirname + "/" + this.config.local_dir + "/" + filename
				timestart_24 = new Date(forecastDate.getTime() + 9*3600*1000)
				timeend_24 = new Date(timestart_24.getTime() + 24*3600*1000)
				timestart_48 = timeend_24
				timeend_48 = new Date(timestart_48.getTime() + 24*3600*1000)
				if(options.no_download && fs.existsSync(local_zipfile_location)) {
					return
				} else {
					return client.downloadTo(local_zipfile_location,filename)
				}
			})
			.then(()=> {
				return new Promise( (resolve, reject) => {
					exec('unzip -o ' + local_zipfile_location + ' -d ' + __dirname + "/" + this.config.local_dir, (error, stdout, stderr) => {
						if(error) {
							reject(error)
							return
						}
						if(stdout) {
							console.log(stdout)
						}
						if(stderr) {
							console.log(stderr)
						}
						resolve();
					})
				})
			})
			.then(()=>{
				return fsPromises.readFile(__dirname + "/" + this.config.local_dir + "/" + dateformat  + "_GuiaCrecidas.csv",{encoding:'ascii'})
			})
			.then(data=>{
				// "ID","Cuenca","Ac_km2","Lon","Lat","CN","THR24_mm","GC24_mm","THR48_mm","GC48_mm","QPF24_mm","PLG24_mm","QPF48_mm","PLG48_mm"
				// 
				var data = data.split("\n").map(r=> r.split(","))
				var registros = []
				var pronostico = {
					cal_id: 438,
					forecast_date: forecastDate,
					series: []
				}
				data.forEach(row=>{
					if(!this.config.areas_map[row[0]]) {
						console.error("falta id de area de la fila " + row[0])
						return
					}
					var series_id = this.config.areas_map[row[0]].series_id
					var exutorio_series_id = this.config.areas_map[row[0]].exutorio_series_id
					if(!series_id) {
						console.error("Falta id de series de la fila " + row[0])
						return
					}
					registros.push(
						{ tipo: "areal", series_id: series_id, timestart: timestart_24, timeend: timeend_24, valor: row[7]},
						{ tipo: "areal", series_id: series_id, timestart: timestart_48, timeend: timeend_48, valor: row[9]}
					)
					pronostico.series.push(
						{
							series_table: "series",
							series_id: exutorio_series_id,
							pronosticos: [
								{
									timestart: timestart_24,
									timeend: timeend_24,
									valor: parseFloat(row[7]),
									qualifier: "main"
								},
								{
									timestart: timestart_48,
									timeend: timeend_48,
									valor: parseFloat(row[9]),
									qualifier: "main"
								}
							]
						}
					)
				})
				client.close()
				return {registros: registros, pronostico: pronostico}
				//~ return pronostico
			})
			.catch(e=>{
				client.close()
				throw e
			})
		})
	}
	update(filter={},options) {
		return this.get(filter,options)
		.then(result=>{
			return Promise.all([crud.upsertCorrida(result.pronostico),crud.upsertObservaciones(result.registros,"areal")])
		})
	}
}

internal.sihn = class {
//~ estacion_id |  id  
//~ -------------+------
          //~ 52 |   52
          //~ 85 |   85
        //~ 1706 | 3312
        //~ 1708 | 3314
        //~ 1739 | 3344
    constructor(config) {
		this.config = (config) ? config : config.sihn
	}
	
	test() {
		return axios.get(url,{responseType:"json"})
		.then(response=>{
			if(response.status >=400) {
				console.error(response.status + " " + response.statusText)
				return false
			}
			return true
		})
		.catch(e=>{
			console.error(e.toString())
			return false
		})
	}
	
	get(filter,options) {
		var ids = {}
		var estacion_ids = {}
		Object.keys(this.config.series_map).map(key=>{
			ids[key] = this.config.series_map[key].series_id
			estacion_ids[key] = this.config.series_map[key].estacion_id
		})
		var url = this.config.url // "http://www.hidro.gob.ar/api/v1/AlturasHorarias/geojsonRiopla" // ; # "http://geoportal.ddns.net/Api/AAHH/geoJsonRiopla";
		return axios.get(url,{responseType:"json"})
		.then(response=>{
			var data = response.data
			if( !data ) {
				throw "No se pudo decodificar el contenido de " + url + ", saliendo";
			}
			//~ console.log(data)
			if(!data.features) {
				throw "propiedad features no definida, saliendo";
			}
			if(!Array.isArray(data.features)) {
				throw "Features no es un ARRAY, saliendo";
			}
			var reg = []
			for(var i=0;i<data.features.length;i++) {
				var id = data.features[i].id;
				if(!id) {
					throw "no se encontró propiedad id para feature número " + i + ", saliendo"
				}
				if(!ids[id]) {
					console.error("No se encontró estación correspondiente al id " + id + ", salteando")
					continue
				}
				if(filter.estacion_id) {
					filter.estacion_id = (Array.isArray(filter.estacion_id)) ? filter.estacion_id : [filter.estacion_id]
					if(filter.estacion_id.indexOf(estacion_ids[id]) < 0) {
						console.log("salteando estacion " + estacion_ids[id])
						continue
					} 
				}
				if(filter.series_id) {
					filter.series_id = (Array.isArray(filter.series_id)) ? filter.series_id : [filter.series_id]
					if(filter.series_id.indexOf(ids[id]) < 0) {
						console.log("salteando serie " + ids[id])
						continue
					}
				}
				if(!data.features[i].properties) {
					throw "propiedad properties no definida en features " + i + ", saliendo"
				}
				if(!data.features[i].properties.valores) {
					throw "propiedad valores no definida en properties de features " + i + ", saliendo";
				}
				if(!Array.isArray(data.features[i].properties.valores)) {
					console.error("valores no es un ARRAY, salteando")
					continue
				}
				for(var j=0;j<data.features[i].properties.valores.length;j++) {
					var fecha = data.features[i].properties.valores[j][0]
					var valor = data.features[i].properties.valores[j][1]
					if(!fecha) {
						console.error("fecha no definida en elemento " + j + " de valores de feature " + i + ", salteando")
						continue
					}			
					if(!valor) {
						console.error("valor no definido en elemento " + j + " de valores de feature " + i + ", salteando")
						continue
					}
					var timestamp = new Date(fecha) 
					if(timestamp.toString() == "Invalid Date") {//$fecha !~ /^\d\d\d\d-\d\d-\d\dT\d\d\:\d\d\:\d\d$/) {
						console.error("Fecha " + fecha + " no válida en elemento " + j + " de feature " + i + ", salteando")
						continue
					}
					if(parseFloat(valor).toString() == "NaN") { //  !~ /^\d+(\.\d+)?$/) {
						console.error("Valor " + valor  + " no válido en elemento " + j +  " de feature " + i + ", salteando")
						continue
					}
					reg.push({series_id: ids[id], timestart:timestamp,timeend:timestamp,valor:parseFloat(valor)})
				}
				if(reg.length<=0) {
					console.error("No se encontraron registros para unid " + ids[id] + ", salteando")
					continue
				}
			}
			return reg
		})
	}
	
	update(filter,options) {
		return this.get(filter,options)
		.then(observaciones=>{
			return crud.upsertObservaciones(observaciones,true)
		})
	}
}

// a5

internal.a5 = class {
	constructor(cfig) {
		if(cfig) {
			this.config = cfig
		} else {
			this.config = config.a5
		}
	}
	get (filter={}, options) {
		if(!filter.series_id) {
			return Promise.reject("Missing series_id")
		}
		if(Array.isArray(filter.series_id)) {
			filter.series_id = filter.series_id.map(s=>parseInt(s)).join(",")
		}
		if(!filter.timestart) {
			filter.timestart = new Date(new Date().getTime() - 8*24*3600*1000)
		} else {
			filter.timestart = new Date(filter.timestart)
			if(filter.timestart.toString() == "Invalid Date") {
				return promise.reject("Invalid timestart")
			}
		}
		if(!filter.timeend) {
			filter.timeend = new Date()
		} else {
			filter.timeend = new Date(filter.timeend)
			if(filter.timeend.toString() == "Invalid Date") {
				return promise.reject("Invalid timeend")
			}
		}
		if(!filter.tipo) {
			filter.tipo = "puntual"
		}
		var params = {
			series_id: filter.series_id,
			timestart: filter.timestart.toISOString(),
			timeend: filter.timeend.toISOString()			
		}
		console.log({params:params})
		return axios.get(this.config.url + "obs/" + filter.tipo + "/observaciones",{
			headers: {"Authorization": "Bearer " + this.config.token},
			params:params
		})
		.then(response=>{
			return response.data
		})
	}
	update(filter={},options={}) {
		return this.get(filter,options)
		.then(result=>{
			return crud.upsertObservaciones(result)
		})
	}
	getSeries(filter={},options={}) {
		if(!filter.tipo) {
			filter.tipo = "puntual"
		}
		if(filter.series_id) {
			filter.id = (filter.id) ? filter.id : filter.series_id
		}
		const params = {
			var_id: filter.var_id,
			proc_id: filter.proc_id,
			unit_id: filter.unit_id,
			fuentes_id: filter.fuentes_id
		}
		if(filter.tipo == "puntual") {
			params.estacion_id = filter.estacion_id
			params.tabla = filter.tabla
			params.id_externo = filter.id_externo
		} else if (filter.tipo == "areal") {
			params.area_id = filter.area_id
			if(options.include_geom) {
				params.include_geom = options.include_geom
			}
		} else if (filter.tipo == "raster") {
			params.escena_id = filter.escena_id
		}
		return axios.get(this.config.url + "obs/" + filter.tipo + "/series",{
			headers: {"Authorization": "Bearer " + this.config.token},
			params: params
		})
		.then(response=>{
			return response.data
		})
	}
	upsertSeries(filter={},options={}) {
		return this.getSeries(filter,options)
		.then(result=>{
			return crud.upsertSeries(result,true)
		})
	}
}

internal.gpm_3h = class {
	constructor(cfig) {
		if(cfig) {
			this.config = cfig
		} else {
			this.config = config.gpm_3h
		}
	}
	get (filter={}, options) {
		if(!filter.timestart) {
			filter.timestart = new Date(new Date().getTime() - 8*24*3600*1000)
		} else {
			filter.timestart = new Date(filter.timestart)
			if(filter.timestart.toString() == "Invalid Date") {
				return promise.reject("Invalid timestart")
			}
		}
		if(!filter.timeend) {
			filter.timeend = new Date()
		} else {
			filter.timeend = new Date(filter.timeend)
			if(filter.timeend.toString() == "Invalid Date") {
				return promise.reject("Invalid timeend")
			}
		}
		const params = {...this.config.search_params}
			// q: "precip_3hr",
			// lat: "-25",
			// lon: "-45",
			// limit: "56",
		params.startTime =  filter.timestart.toISOString().substring(0,10)
		params.endTime = filter.timeend.toISOString().substring(0,10)
		// console.log({url:this.config.url,params:params})
		return axios.get(this.config.url,{params:params})
		.then(response=>{
			// console.log(response.data)
			if(!response.data || !response.data.items || response.data.items.length==0) {
				console.error("accessors/gpm_3h: No products found")
				return []
			}
			var product_urls = []
			var product_ids = []
			for(var i in response.data.items) {
				var item = response.data.items[i]
				if(item["@type"] !=	"geoss:precipitation") {
					continue
				}
				for(var j in item.action) {
					var action = item.action[j]
					if(action["@type"] != "ojo:download") {
						continue
					}
					for(var k in action.using) {
						var using = action.using[k]
						if(using.mediaType == "image/tiff") {
							product_urls.push(using.url)
							product_ids.push(using["@id"])
						}
					}
				}
			}
			var local_filenames = product_ids.map(id => {
				return path.resolve(this.config.local_path, id)
			})
			return this.downloadFiles(product_urls,local_filenames)
			.then(downloaded_files=>{
				return new Promise((resolve,reject)=>{
					setTimeout(()=>{
						resolve(this.rast2obsList(downloaded_files))
					},5000)  // espera para que se terminen de escribir los archivos antes de intentar utilizarlos
				})
				.then(observaciones=>{
					downloaded_files.forEach(file=>{
						fs.unlink(file,(e)=>{
							if(e) {
								console.error(e)
							}
							return
						})
					})
					return observaciones
				})
			})
		})
	}

	update(filter={},options) {
		return this.get(filter,options)
		.then(observaciones=>{
			if(!observaciones || observaciones.length == 0) {
				console.error("accessors/gpm_3h/update: Nothing retrieved")
				return []
			}
			return crud.upsertObservaciones(observaciones,"raster",this.config.series_id)
			.then(result_3h=>{
				this.getDiario(filter,options)
				.then(result_diario=>{
					fs.writeFileSync("/tmp/gpm_dia.json",result_diario)
				})
				.catch(e=>{
					console.error(e)
				})
				return result_3h
			})
		})
	}

	test() {
		const params = {...this.config.search_params}
		params.startTime =  new Date().toISOString().substring(0,10)
		params.endTime = new Date().toISOString().substring(0,10)
		return axios.get(this.config.url,{params:params})
		.then(response=>{
			if(response.status<=299) {
				return true
			} else {
				return false
			}
		})
		.catch(e=>{
			console.error(e)
			return false
		})
	}

	async downloadFiles(product_urls,local_filenames) {
		// var downloaded_files = []
		var promises = []
		for(var u in product_urls) {
			var filename = local_filenames[u]
			console.log("accessors/gpm_3h: downloading: " + product_urls[u])
			try {
				const response = await axios.get(product_urls[u],{responseType:"stream"})
				var writer = fs.createWriteStream(filename)
				// fs.writeFileSync(local_filenames[u],response.data)
				response.data.pipe(writer)
				
			} catch (e) {
				console.error(e)
				continue
			}	
			promises.push(
				new Promise((resolve,reject)=>{
					writer.on("finish", resolve(filename))
					writer.on("error",reject)
				})
			)
			// downloaded_files.push(local_filenames[u])
		}
		return Promise.all(promises)
		// return downloaded_files
	}

	async rast2obsList(filenames) {
		// console.log(JSON.stringify(filenames))
		var observaciones = []
		for(var i in filenames) {
			var filename = filenames[i]
			var filename2 = filename.replace(/\.tif$/,"_subset.tif")
			var base = path.basename(filename)
			var b = base.split(".")
			var timestart = new Date(Date.UTC(b[1].substring(0,4), b[1].substring(4,6) - 1, b[1].substring(6,8),b[2].substring(0,2)) - 2*3600*1000)
			var timeend = new Date(timestart.getTime() + 3*3600*1000)
			var scale = this.config.scale
			// return new Promise( (resolve, reject) => {
			try {
				await pexec('gdal_translate -projwin ' + this.config.bbox.join(" ") + ' -a_nodata 9999 ' + filename + ' ' + filename2) // ('gdal_translate -a_scale 0.1 -unscale -projwin ' + this.config.bbox.join(" ") + ' ' + filename + ' ' + filename2)  this.config.tmpfile)  // ulx uly lrx lrt
			} catch(e) {
				console.error(e)
				continue
			}
			try {				
				var data = fs.readFileSync(filename2,'hex')
			} catch (e) {
				console.error(e)
				continue
			}
			
			observaciones.push({tipo:"raster",series_id: this.config.series_id, timestart: timestart, timeend: timeend, scale: scale, valor: '\\x' + data})

				// fs.readFile(filename, 'hex', (error, data) => {
				// 	if(error) {
				// 		console.error("readFile error")
				// 		reject(error)
				// 		return
				// 	}
					// resolve({tipo:"rast",timestart: timestart, timeend: timeend, valor: '\\x' + data}) 
				// })
			// })
		}
		return observaciones
	}
	getDiario(filter,options={}) {
		// console.log({config:this.config})
		options.insertSeriesId=this.config.dia_series_id
		options.t_offset = "12:00:00"
		return crud.getRegularSeries("raster",this.config.series_id,{days:1},filter.timestart,filter.timeend,options)
		.then(result=>{
			const dia_location = path.resolve(this.config.dia_local_path)
			return printRast.print_rast_series({
				id:13,
				observaciones: result
			},{
				location:dia_location,
				format:"GTiff",
				patron_nombre: "gpm_dia.YYYYMMDD.HHMMSS.tif"
			})
		})
	}
	printMaps(timestart,timeend) {
		return this.callPrintMaps(timestart,timeend)
	}
	callPrintMaps(timestart,timeend,skip_print) {
		var mapset = sprintf("%04d",Math.floor(Math.random()*10000))
		var location = sprintf("%s/%s",config.grass.location,mapset) // sprintf("%s/GISDATABASE/WGS84/%s",process.env.HOME,mapset)
		var batchjob = path.resolve(__dirname,"../py/print_precip_map.py")
		if(timestart) {
			// console.log("callPrintMaps: timestart: " + timestart.toISOString().replace("Z",""))
			process.env.timestart = timestart.toISOString().replace("Z","")
		}
		if(timeend) {
			// console.log("callPrintMaps: timeend: " + timeend.toISOString().replace("Z",""))
			process.env.timeend = timeend.toISOString().replace("Z","")
		}
		if(skip_print) {
			process.env.skip_print = "True"
		}
		var command = sprintf("grass %s -c --exec %s", location, batchjob)
		return pexec(command)
		.then(result=>{
			// console.log("batch job called")
			var stdout = result.stdout
			var stderr = result.stderr
			if(stdout) {
				console.log(stdout)
			}
			if(stderr) {
				console.error(stderr)
			}
			process.env.timestart = undefined
			process.env.timeend = undefined
			process.env.skip_print = undefined
		})
	}
	async printMapSemanal(timestart,timeend) {
		const location = path.resolve("data/gpm/semanal") // this.config.mes_local_path
		var ts = new Date(timestart.getTime())
		var te = new Date(timestart.getTime())
		te.setUTCDate(te.getUTCDate()+7)
		var results = []
		while(te <= timeend) {
			console.log({ts:ts.toISOString(),te:te.toISOString()})
			try {
				var serie = await crud.rastExtract(13,ts,te,{funcion:"SUM",min_count:7})
				if(!serie.observaciones || !serie.observaciones.length) {
					throw("No se encontraron suficientes observaciones")
				}
				var result = await printRast.print_rast({prefix:"",location:location,patron_nombre:"gpm_semanal.YYYYMMDD.HHMMSS.tif"},undefined,serie.observaciones[0])
				results.push(result)
			} catch (e) {
				console.error(e)
			}
			ts.setUTCDate(ts.getUTCDate()+1)
			te.setUTCDate(te.getUTCDate()+1)
		}
		var new_timeend = new Date(timeend)
		new_timeend.setDate(new_timeend.getDate()-7) 
		await this.printSemanalPNG(timestart,new_timeend)
		return results
	}
	printSemanalPNG(timestart,timeend,skip_print) {
		var mapset = sprintf("%04d",Math.floor(Math.random()*10000))
		var location = sprintf("%s/%s",config.grass.location,mapset) // sprintf("%s/GISDATABASE/WGS84/%s",process.env.HOME,mapset)
		var batchjob = path.resolve(__dirname,"../py/print_precip_map.py")
		if(timestart) {
			// console.log("callPrintMaps: timestart: " + timestart.toISOString().replace("Z",""))
			process.env.timestart = timestart.toISOString().replace("Z","")
		}
		if(timeend) {
			// console.log("callPrintMaps: timeend: " + timeend.toISOString().replace("Z",""))
			process.env.timeend = timeend.toISOString().replace("Z","")
		}
		if(skip_print) {
			process.env.skip_print = "True"
		}
		process.env.base_path = "data/gpm/semanal" // this.config.local_path
		process.env.type = "semanal"
		var command = sprintf("grass %s -c --exec %s", location, batchjob)
		return pexec(command)
		.then(result=>{
			// console.log("batch job called")
			var stdout = result.stdout
			var stderr = result.stderr
			if(stdout) {
				console.log(stdout)
			}
			if(stderr) {
				console.error(stderr)
			}
			process.env.timestart = undefined
			process.env.timeend = undefined
			process.env.skip_print = undefined
		})		
	}
}

internal.wof = class {
	constructor(cfig) {
		// console.log("wof accessor started")
		if(cfig) {
			this.config = cfig
		} else {
			this.config = config.wof
		}
		// console.log({config:this.config})
		let soap_client_options = { 'request' : request.defaults(this.config.request_defaults), wsdl_headers: this.config.wsdl_headers}
		this.client = new wof.client(this.config.wml_endpoint, soap_client_options)
	}
	get (filter,options) {
		if(!filter.timestart || !filter.timeend) {
			return Promise.reject("accessors/wof.get: missing timestart and/or timeend")
		}
		var startDate = new Date(filter.timestart).toISOString().substring(0,19)
		var endDate = new Date(filter.timeend).toISOString().substring(0,19)
		delete filter.timestart
		delete filter.timeend
		filter.id = (filter.series_id) ? filter.series_id : undefined
		return this.getSeriesSiteCodes(filter)
		.then(async series=>{
			var observaciones = []
			for(var s of series) {
				try {
					// console.log("try getValues, siteCode:" + s.siteCode + ", variableCode:" + s.variableCode)
					var result = await this.client.getValues(s.siteCode,s.variableCode, startDate, endDate, true)
					// console.log(result)
					s.timeSupport = this.timeScale2interval(result.seriesInfo.variable.timeScale)
					for(var v of result.values) {
						observaciones.push(this.value2observacion(v,s))
					}
				} catch (e) {
					console.error(e)
				}
			}
			return observaciones
		})
	}
	update(filter,options) {
		return this.get(filter,options)
		.then(observaciones=>{
			if(observaciones.length == 0) {
				console.log("accessors/wof.update: Nothing found")
				return []
			}
			return crud.upsertObservaciones(observaciones,"puntual")
		})
	}
	value2observacion(value,serie) {
		var rescale = this.config.variable_map[serie.variableCode].rescale
		var valor = (rescale) ? rescale * value.value : value.value
		var timestart = new Date(value.dateTime)
		var timeend = (serie.timeSupport) ? timeSteps.advanceTimeStep(timestart,serie.timeSupport) : timestart 
		return {
			series_id: serie.id,
			timestart: timestart,
			timeend: timeend,
			valor: valor
		}
	}
	timeScale2interval(timeScale) {
		var interval = {}
		if(timeScale) {
			interval[timeScale.unitName] = timeScale.timeSupport
		}
		return interval
	}
	getSiteCodes(id) {
		var filter = {tabla: 'whos_plata'}
		if(id) {
			filter.estacion_id = id
		} 
		return crud.getEstaciones(filter)
		.then(estaciones=>{
			return estaciones.map(e=>{
				return {
					id: e.id,
					siteCode: e.id_externo,
					propietario: e.propietario
				}
			})
		})
	}
	getSeriesSiteCodes(filter={}) {
		// console.log("getSeriesSiteCodes")
		filter.tabla = 'whos_plata'
		return crud.getSeries("puntual",filter)
		.then(series=>{
			console.log("got series: " + series.length)
			return series.map(s=>{
				var variableCode
				for(var v of Object.keys(this.config.variable_map)) {
					var propietario = this.config.propietarios_map[this.config.variable_map[v].propietario]
					// console.log({v: this.config.variable_map[v].var_id, p: propietario})
					if(this.config.variable_map[v].var_id == s.var.id && propietario == s.estacion.propietario) {
						variableCode = v
					}
				}
				return {
					id: s.id,
					estacion_id: s.estacion.id,
					siteCode: s.estacion.id_externo,
					propietario: s.estacion.propietario,
					var_id: s.var.id,
					variableCode: variableCode				
				}
			})
		})
	}
}

// EMAS SINARAME

internal.emas_sinarame = class {
    constructor(config) {
        this.config = {
            url:"http://ftp-ema.smn.gob.ar", 
            auth: {
                username: "ina", 
                password: "FhiypoWL"
            },
			local_path: "../data/emas_sinarame/downloads",
			columns: ["unid", "date", "tempinst", "tempmedia", "tempmin", "tempmax", "tempstatus", "presioninst", "presionmedia", "presionmin", "presionmax", "presionstatus", "humrelinst", "humrelmedia", "humrelmin", "humrelmax", "humrelstatus", "precipinst", "precipmedia", "precipmin", "precipmax", "precipstatus", "velvientoinst", "velvientomedia", "velvientomin", "velvientomax", "velvientostatus", "dirvientoinst", "dirvientomedia", "dirvientomin", "dirvientomax", "dirvientostatus", "disdr_precipint", "disdr_precipacum", "disdr_weathercode", "disdr_radarref", "disdr_morvis", "disdr_kinet", "disdr_temp", "disdr_signal", "disdr_numberofpart", "disdr_sensorstatus","precipsum"],
			variable_map: {
				precipsum: 27
			},
			proc_id: 1,
			red_id: 14
        }
        if(config) {
            this.config = config
        }
		this.axios_instance = axios.create({
			auth: this.config.auth,
			httpAgent: new http.Agent({ keepAlive: true }) 
		})
    }
	createDir(id,timestamp) {
		if(!fs.existsSync(path.resolve(this.config.local_path,id))) {
			fs.mkdirSync(path.resolve(this.config.local_path,id))
		}
		var year_dir = sprintf ("%s/%s/%04d", this.config.local_path, id, timestamp.getUTCFullYear())
		var month_dir = sprintf ("%s/%s/%04d/%02d", this.config.local_path, id, timestamp.getUTCFullYear(),timestamp.getUTCMonth() + 1)
		var day_dir = sprintf("%s/%s/%04d/%02d/%02d", this.config.local_path, id, timestamp.getUTCFullYear(),timestamp.getUTCMonth() + 1, timestamp.getUTCDate())
		if(!fs.existsSync(path.resolve(year_dir))) {
			fs.mkdirSync(path.resolve(year_dir))
		}
		if(!fs.existsSync(path.resolve(month_dir))) {
			fs.mkdirSync(path.resolve(month_dir))
		}
		if(!fs.existsSync(path.resolve(day_dir))) {
			fs.mkdirSync(path.resolve(day_dir))
		}
		return day_dir
	}

	async get(filter={},options={}) {
		options.no_update = true
		return this.getReports(filter,options)
	}
	async update(filter,options={}) {
		options.no_update = false
		options.no_update_observaciones = false
		return this.getReports(filter,options)
		// .then(tuples=>{
		// 	return this.upsertEmasSinarameRecords(tuples)
		// }).then(emasSinarameRecords=>{
		// 	return this.emasSinarameRecords2Observaciones(emasSinarameRecords)
		// }).then(observaciones=>{
		// 	return crud.upsertObservaciones(observaciones,"puntual")
		// })
	}

    async getReports(filter={},options={}) {
        // get({unid:<int>,timestart:<date>,timeend:<date>}, {no_update:false, no_download:false})
        var timestart, timeend
		var tuples = []
		var emasSinarameRecords = []
		var observaciones = []
        if(filter.timestart) {
            timestart = new Date(filter.timestart)
            if(timestart.toString() == 'Invalid Date') {
                throw("accessors:sinarame: Invalid timestart")
            }
        }
        if(filter.timeend) {
            timeend = new Date(filter.timeend)
            if(timeend.toString() == 'Invalid Date') {
                throw("accessors:sinarame: Invalid timeend")
            }
        }
		filter.tabla = "emas_sinarame"
        try {
            var estaciones = await crud.getEstaciones(filter)
        } catch(e) {
            throw(e)
        }
		var unids = {}
		estaciones.forEach(e=>{
			unids[e.id_externo] = e.id
		})
        if(!estaciones.length) {
            throw("accessors:sinarame: No se encontraron estaciones")
        }

        try {
            var result = await axios.get(this.config.url + "/EMA/meas", {auth: this.config.auth}) // "http://ina:FhiypoWL\@ftp-ema.smn.gob.ar/EMA/meas")
			var root = parse(result.data)
        } catch(e){
            throw(e)
        }
        var id_list = root.querySelectorAll("a").map(a=>a.getAttribute("href").replace("/","")).filter(id=>(unids[id]))
		for(var id of id_list) {
			var station_tuples = []
			console.log("searching estacion " + id)
			try {
				var result = await axios.get(`${this.config.url}/EMA/meas/${id}/`, {auth: this.config.auth})
				var root = parse(result.data)
			} catch (e) {
				throw(e)
			}
			var year_list = root.querySelectorAll("a").map(a=>a.getAttribute("href").replace("/","")).filter(href=>(/^[0-9]{4}$/.test(href)))
			for(var year of year_list) {
				// console.log("year:" + year)
				if(timestart &&  parseInt(year) < timestart.getUTCFullYear()) {
					continue
				}
				if(timeend &&  parseInt(year) > timeend.getUTCFullYear()) {
					continue
				}
				console.log("searching year:" + year)
				try {
					var result = await axios.get(`${this.config.url}/EMA/meas/${id}/${year}/`, {auth: this.config.auth})
					var root = parse(result.data)
				} catch (e) {
					throw(e)
				}
				var month_list = root.querySelectorAll("a").map(a=>a.getAttribute("href").replace("/","")).filter(href=>(/^[0-9]{2}$/.test(href)))
				for(var month of month_list) {
					// console.log("month:" + month)
					if(timestart) {
						var end_of_month = new Date(year,parseInt(month),1)
						if(end_of_month < timestart) {
							continue
						}
					}
					if(timeend) {
						var start_of_month = new Date(year,parseInt(month)-1,1)
						if(start_of_month > timeend) {
							continue
						}
					}
					console.log("searching month:" + month)
					try {
						var result = await axios.get(`${this.config.url}/EMA/meas/${id}/${year}/${month}/`, {auth: this.config.auth})
						var root = parse(result.data)
					} catch (e) {
						throw(e)
					}
					var day_list = root.querySelectorAll("a").map(a=>a.getAttribute("href").replace("/","")).filter(href=>(/^[0-9]{2}$/.test(href)))
					for(var day of day_list) {
						// console.log("day:" + day)
						if(timestart) {
							var end_of_day = new Date(year,parseInt(month)-1,parseInt(day)+1)
							if(end_of_day < timestart) {
								continue
							}
						}
						if(timeend) {
							var start_of_day = new Date(year,parseInt(month)-1,parseInt(day))
							if(start_of_day > timeend) {
								continue
							}
						}
						console.log("searching day:" + day)
						try {
							var result = await axios.get(`${this.config.url}/EMA/meas/${id}/${year}/${month}/${day}/`, {auth: this.config.auth})
							var root = parse(result.data)
						} catch (e) {
							throw(e)
						}
						var file_list = root.querySelectorAll("a").map(a=>a.getAttribute("href")).filter(href=>(new RegExp(`^meas${id}[0-9]{12}\.rep$`).test(href)))
						for(var file of file_list) {
							// console.log("file:" + file)
							var timestamp = new Date(Date.UTC(year,month-1,day))
							if(id.length == 7) { 
								timestamp.setUTCHours(file.substring(17,19))
								timestamp.setUTCMinutes(file.substring(19,21))
								timestamp.setUTCSeconds(file.substring(21,23))
							} else if (id.length == 8) {
								timestamp.setUTCHours(file.substring(18,20))
								timestamp.setUTCMinutes(file.substring(20,22))
								timestamp.setUTCSeconds(file.substring(22,24))
							} else {
								continue
							}
							if(timestart && timestamp < timestart) {
								continue
							}
							if(timeend && timestamp > timeend) {
								continue
							}
							// console.log("found file:" + file)
							var day_dir = this.createDir(id,timestamp)
							var file_destination = path.resolve(`${day_dir}/${file}`)
							if(fs.existsSync(file_destination)) {
								console.log(`file ${file} already in disk`)
							} else {
								if(options.no_download) {
									console.log(`no_download: file ${file} skipped`)	
								} else {
									try {
										console.log("Downloading: " + file)
										await this.downloadToFile(`${this.config.url}/EMA/meas/${id}/${year}/${month}/${day}/${file}`,file_destination)
									} catch(e) {
										throw(e)
									}
								}
							}
							var tuple = this.parseWSReport(file_destination,unids[id],timestamp) 
							station_tuples.push(tuple)
						}
					}
				}
			}
			if(!station_tuples.length) {
				console.log("station " + id + ": no reports found")
				continue
			}
			tuples = tuples.concat(station_tuples)
			if(options.no_update) {
				continue
			} 
			try {
				var station_records = await this.upsertEmasSinarameRecords(station_tuples)
				emasSinarameRecords = emasSinarameRecords.concat(station_records)
			} catch(e) {
				console.error(e.toString())
				continue
			}
			if(options.no_update_observaciones) {
				continue
			} else {
				try {
					var station_observaciones = await this.emasSinarameRecords2Observaciones(station_records)
					var station_upserted = await crud.upsertObservaciones(station_observaciones,"puntual")
					observaciones = observaciones.concat(station_upserted)
				} catch(e) {
					console.error(e.toString())
					continue
				}
			}
		}
		if(options.no_update) {
			return tuples
		} else if(options.no_update_observaciones){
			return emasSinarameRecords
		} else {
			return observaciones
		}
    }


	parseWSReport(file,estacion_id,timestamp) {
		const disdr = {
			"disdr_precipint" : "Rain intensity 32 bits", 
			"disdr_precipacum" : "Rain amount accumulated", 
			"disdr_weathercode": "Weather code SYNOP", 
			"disdr_radarref": "Radar reflectivity", 
			"disdr_morvis": "MOR visibility in the precipitation", 
			"disdr_kinet": "Kinetic energy", 
			"disdr_temp": "Temperature in the sensor", 
			"disdr_signal": "Signal amplitude of the laser strip",
			"disdr_numberofpart": "Number of detected particles",
			"disdr_sensorstatus": "Sensor status"
		}
		var temp = [null,null,null,null,null];
		var pres = [null,null,null,null,null];
		var humrel = [null,null,null,null,null];
		var precip = [null,null,null,null,null];
		var velviento = [null,null,null,null,null];
		var dirviento = [null,null,null,null,null];
		var disdr_val = {}
		Object.keys(disdr).forEach(key=>{
			disdr_val[key] = null
		})
		var disdr_flag = 0 

		if(!fs.existsSync(file)) {
			console.error("File " + file + " not found on disk")
			return []
		}
		var data = fs.readFileSync(file,'utf-8')
		var lines = data.split("\n")
		for(var line of lines) {
			line = line.replace(/\r/g,"")
			var cells = line.split("\t").map(cell=>cell.trim())
			var row_key = cells[0]
			row_key = row_key.trim() // replace(/\s+$/,"")
			if(disdr_flag == 1 && cells[1]) {
				cells[1] =cells[1].trim()
				Object.keys(disdr).forEach(key=> {
					if ( row_key.includes(disdr[key])) {
						disdr_val[key] = (/^[0-9]+\.?[0-9]*/.test(cells[1])) ? cells[1] : null
					}
				})
				continue
			}
			if(/Air temperature/.test(row_key)) {
				temp = this.parseRow(cells,"signed_float")
			} else if(/Air pressure/.test(row_key)) {
				pres = this.parseRow(cells,"unsigned_float")
			} else if (/Relative humidity/.test(row_key)) {
				humrel = this.parseRow(cells,"unsigned_integer")
			} else if (/Precipitation amount/.test(row_key)) {
				precip = this.parseRow(cells,"unsigned_float")
			} else if (/Wind speed/.test(row_key)) {
				velviento = this.parseRow(cells,"unsigned_float")
			} else if (/Wind direction/.test(row_key)) {
				dirviento = this.parseRow(cells,"unsigned_integer")
			} else if (/DISDROMETER/.test(row_key)) {
				disdr_flag = 1
			}
		}
		var tuple = [estacion_id,timestamp].concat(temp).concat(pres).concat(humrel).concat(precip).concat(velviento).concat(dirviento).concat([disdr_val.disdr_precipint,disdr_val.disdr_precipacum,disdr_val.disdr_weathercode,disdr_val.disdr_radarref, disdr_val.disdr_morvis, disdr_val.disdr_kinet,	disdr_val.disdr_temp, disdr_val.disdr_signal, disdr_val.disdr_numberofpart, disdr_val.disdr_sensorstatus])
		return tuple
	}

	parseRow(row,data_type) {
		var data = [...row]
		data.splice(0,2)
		var validation_regexp
		switch(data_type) {
			case "signed_float":
				validation_regexp = new RegExp(/^\-?[0-9]+\.?[0-9]*$/)
				break;
			case "unsigned_float":
				validation_regexp = new RegExp(/^[0-9]+\.?[0-9]*$/)
				break;
			case "unsigned_integer":
				validation_regexp = new RegExp(/^[0-9]+$/)
				break;
			default:
				validation_regexp = new RegExp(/^\-?[0-9]+\.?[0-9]*$/)
				break;
		}
		for(var i=0;i<=3;i++) {
			data[i] = (validation_regexp.test(data[i])) ? parseFloat(data[i]) : null
		}
		return data
	}

	async upsertEmasSinarameRecords(tuples) {
		if(!tuples.length) {
			console.error("upsertEmasSinarameRecords: Empty array")
			return []
		}
		var template_row = Array(42).fill().map((element,index)=> `$${index + 1}`).join(",")
		var values = tuples.map(tuple=>{
			return utils.pasteIntoSQLQuery(`(${template_row})`,tuple)
		}).join(",")
		var stmt = "INSERT INTO emas_sinarame_records (unid, date, tempinst, tempmedia, tempmin, tempmax, tempstatus, presioninst, presionmedia, presionmin, presionmax, presionstatus, humrelinst, humrelmedia, humrelmin, humrelmax, humrelstatus, precipinst, precipmedia, precipmin, precipmax, precipstatus, velvientoinst, velvientomedia, velvientomin, velvientomax, velvientostatus, dirvientoinst, dirvientomedia, dirvientomin, dirvientomax, dirvientostatus, disdr_precipint, disdr_precipacum, disdr_weathercode, disdr_radarref, disdr_morvis, disdr_kinet, disdr_temp, disdr_signal, disdr_numberofpart, disdr_sensorstatus) VALUES " + values + " ON CONFLICT (unid,date) DO UPDATE SET \
		tempinst=excluded.tempinst, tempmedia=excluded.tempmedia, tempmin=excluded.tempmin, tempmax=excluded.tempmax, tempstatus=excluded.tempstatus, presioninst=excluded.presioninst, presionmedia=excluded.presionmedia, presionmin=excluded.presionmin, presionmax=excluded.presionmax, presionstatus=excluded.presionstatus, humrelinst=excluded.humrelinst, humrelmedia=excluded.humrelmedia, humrelmin=excluded.humrelmin, humrelmax=excluded.humrelmax, humrelstatus=excluded.humrelstatus, precipinst=excluded.precipinst, precipmedia=excluded.precipmedia, precipmin=excluded.precipmin, precipmax=excluded.precipmax, precipstatus=excluded.precipstatus, velvientoinst=excluded.velvientoinst, velvientomedia=excluded.velvientomedia, velvientomin=excluded.velvientomin, velvientomax=excluded.velvientomax, velvientostatus=excluded.velvientostatus, dirvientoinst=excluded.dirvientoinst, dirvientomedia=excluded.dirvientomedia, dirvientomin=excluded.dirvientomin, dirvientomax=excluded.dirvientomax, dirvientostatus=excluded.dirvientostatus, disdr_precipint=excluded.disdr_precipint, disdr_precipacum=excluded.disdr_precipacum, disdr_weathercode=excluded.disdr_weathercode, disdr_radarref=excluded.disdr_radarref, disdr_morvis=excluded.disdr_morvis, disdr_kinet=excluded.disdr_kinet, disdr_temp=excluded.disdr_temp, disdr_signal=excluded.disdr_signal, disdr_numberofpart=excluded.disdr_numberofpart, disdr_sensorstatus=excluded.disdr_sensorstatus\
		 RETURNING *";
		return crud.pool.query(stmt)
		.then(result=>{
			return result.rows
		})
	}

	async readEmasSinarameRecords(filter) {
		var valid_filters = {
			unid: {
				type: "integer"
			},
			estacion_id: {
				type: "integer",
				column:  "unid"
			},
			date: {
				type: "date"
			},
			timestart: {
				column: "date",
				type: "timestart"
			},
			timeend: {
				column: "date",
				type: "timeend"
			}
		}
		var filter_string = utils.control_filter2(valid_filters,filter,"emas_sinarame_records")
		return crud.pool.query("SELECT * from emas_sinarame_records WHERE 1=1 " + filter_string + " ORDER BY unid, date")
		.then(result=>{
			return result.rows
		})
	}

	async emasSinarameRecords2Observaciones(emasSinarameRecords) {
		var series_filter = {
			red_id: this.config.red_id,
			var_id: Object.values(this.config.variable_map),
			proc_id: this.config.proc_id
		}
		try {
			var series = await crud.getSeries("puntual",series_filter,{no_metadata:true})
		} catch(e){
			throw(e)
		}
		var observaciones = []
		for(var record of emasSinarameRecords) {
			for(var key of Object.keys(this.config.variable_map)) {
				var var_id = this.config.variable_map[key]
				var valor = record[key]
				if(parseFloat(valor).toString() == 'NaN') {
					console.error("emasSinarameRecords2Observaciones: Invalid or null value")
					continue
				}
				var serie = series.filter(s=>(record.unid == s.estacion_id && s.var_id == var_id))
				if(!serie.length) {
					console.error("emasSinarameRecords2Observaciones: Series not found for unid:" + record.unid + ", var_id:" + var_id)
					continue
				}
				serie = serie[0]
				observaciones.push({
					tipo: "puntual",
					series_id: serie.id,
					timestart: record.date,
					timeend: record.date,
					valor: valor
				})
			}
		}
		return observaciones
	}

	async downloadToFile(url,file_destination) {
		// console.log(new Date())
		return this.axios_instance.get(url, {responseType: "stream"})
		.then(response=>{
			// console.log(new Date())
			return new Promise((resolve,reject)=>{
				var writer = fs.createWriteStream(file_destination)
				response.data.pipe(writer)
				let error = null
				writer.on('error',e=>{
					error = e
					writer.close()
					reject(e)
				})
				writer.on('close',()=>{		
					// console.log(new Date())
					if(!error) {
						resolve()
					}
				})
			})
		})
	}


}



internal.acumar = class {

    constructor(config) {
		this.default_config = {
			"url": "http://www.bdh.acumar.gov.ar/bdh3/meteo",
			"filename": "downld08.txt",
			"proc_id": 1,
			"estaciones_map": {
				"872": {
					id:"boca",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/boca/downld08.txt",
					parser: "acumar"
				},
				"873": {
					id: "moron",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/moron/downld08.txt",
					parser: "acumar"
				},
				"874": {
					id: "merlo",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/merlo/downld08.txt",
					parser: "acumar"
				},
				"875": {
					id: "mpaz",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/mpaz/downld08.txt",
					parser: "acumar"
				},
				"876": {
					id: "lanus",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/lanus/downld08.txt",
					parser: "acumar"
				},
				"877": {
					id: "avellaneda",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/avellaneda/downld08.txt",
					parser: "acumar"
				},
				"878": {
					id: "abrown",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/abrown/downld08.txt",
					parser: "acumar"
				},
				"879": {
					id: "echeverria",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/echeverria/downld08.txt",
					parser: "acumar"
				},
				"880": {
					id: "lzamora",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/lzamora/downld08.txt",
					parser: "acumar"
				},
				"881": {
					id: "svicente",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/svicente/downld08.txt",
					parser: "acumar"
				},
				"882": {
					id: "peron",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/peron/downld08.txt",
					parser: "acumar"
				},
				"883": {
					id: "matanza",
					url: "http://www.bdh.acumar.gov.ar/bdh3/meteo/matanza/downld08.txt",
					parser: "acumar"
				},
				"884": {
					id: "ezeiza",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/ezeiza/downld08.txt",
					parser: "acumar"
				},
				"885": {
					id: "canuelas",
					url:"http://www.bdh.acumar.gov.ar/bdh3/meteo/canuelas/downld08.txt",
					parser: "acumar"
				},
				"887": {
					id: "mercobras",
					url:"http://www.mercobras.com.ar/datos/downld08.txt",
					parser: "mercobras"
				},
				"893": {
					id: "campana",
					url: "http://meteo.frd.utn.edu.ar/downld08.txt",
					parser: "utn"
				},
				"895": {
					id: "varela",
					url: "http://www.varela.gov.ar/servmetfv/downld08.txt",
					parser: "acumar"
				},
				"5954": {
					id: "lheras",
					url: "http://www.bdh.acumar.gov.ar/bdh3/meteo/lheras/downld08.txt",
					parser: "acumar"
				}
			},
			"columns": [
				{
					"name": "tempmedia",
					"var_id": 53,
					"type": "number"
				},{
					"name": "tempmax",
					"var_id": null,
					"type": "number"
				},{
					"name": "tempmin",
					"var_id": null,
					"type": "number"
				},{
					"name": "humrel",
					"var_id": 58,
					"type": "number"
				},{
					"name": "puntorocio",
					"var_id": 43,
					"type": "number"
				},{
					"name": "velvientomedia",
					"var_id": 55,
					"type": "number"
				},{
					"name": "dirviento",
					"var_id": 57,
					"type": "string"
				},{
					"name": "recviento",
					"var_id": null,
					"type": "number"
				},{
					"name": "velvientomax",
					"var_id": null,
					"type": "number"
				},{
					"name": "dirvientomax",
					"var_id": null,
					"type": "string"
				},{
					"name": "sensterm",
					"var_id": null,
					"type": "number"
				},{
					"name": "indcalor",
					"var_id": null,
					"type": "number"
				},{
					"name": "indthw",
					"var_id": null,
					"type": "number"
				},{
					"name": "presion",
					"var_id": 60,
					"type": "number"
				},{
					"name": "precip",
					"var_id": 27,
					"type": "number"
				},{
					"name": "intprecip",
					"var_id": null,
					"type": "number"
				},{
					"name": "graddcalor",
					"var_id": null,
					"type": "number"
				},{
					"name": "graddfrio",
					"var_id": null,
					"type": "number"
				},{
					"name": "tempint",
					"var_id": null,
					"type": "number"
				},{
					"name": "humint",
					"var_id": null,
					"type": "number"
				},{
					"name": "rocioint",
					"var_id": null,
					"type": "number"
				},{
					"name": "incalint",
					"var_id": null,
					"type": "number"
				},{
					"name": "muestviento",
					"var_id": null,
					"type": "number"
				},{
					"name": "txviento",
					"var_id": null,
					"type": "number"
				},{
					"name": "recepiss",
					"var_id": null,
					"type": "number"
				},{
					"name": "intarc",
					"var_id": null,
					"type": "number"
				}
			]
		}
		this.config = this.default_config
        if(config) {
            for(var key in Object.keys(config)) {
                this.config[key] = config[key]
            }
        }
		this.parsers = {
			"acumar": this.parseAcumar.bind(this),
			"mercobras": this.parseMercobras.bind(this),
			"utn": this.parseUTN.bind(this)
		}
    }
    
    test() {
		return axios.get(this.config.estaciones_map["872"].url)
		.then(()=>{
			return true
		})
		.catch(e=>{
			return false
		})
    }

    async get(filter={},options={}) {
		var estacion_ids = []
		if(filter.estacion_id) {
			if(Array.isArray(filter.estacion_id)) {
				for(var estacion_id of filter.estacion_id) {
					if(!this.config.estaciones_map[estacion_id]) {
						throw("estacion_id inválido")
					}
					estacion_ids.push(estacion_id)
				}
			} else {
				estacion_ids.push(filter.estacion_id)
			}
		} else {
			estacion_ids = Object.keys(this.config.estaciones_map)
		}
		var results = []
		for(var estacion_id of estacion_ids) {
			try {
				var result = await this.getData(estacion_id)
				results.push(...result)
			} catch(e) {
				console.error(e.toString())
			}
		}
		if(filter.timestart) {
			var timestart = new Date(filter.timestart)
			results = results.filter(o=>(o.timestart >= timestart))
		}
		if(filter.timeend) {
			var timeend = new Date(filter.timeend)
			results = results.filter(o=>(o.timeend <= timeend))
		}
		if(filter.var_id) {
			var var_id
			if(!Array.isArray(var_id)) {
				var_id = [filter.var_id]
			} else {
				var_id = filter.var_id
			}
			results = results.filter(o=>(var_id.indexOf(o.var_id) >= 0))
		}
		if(options.group_by_series) {
			var series_ids = Array.from(new Set(results.map(o=>o.series_id)))
			var series = []
			for(var id of series_ids) {
				var data = results.filter(o=>(o.series_id==id))
				data.sort((a,b)=>a.timestart - b.timestart)
				series.push({
					id: id,
					var_id: data[0].var_id,
					observaciones: data,
					timestart: data[0].timestart,
					timeend: data[data.length-1].timeend,
					count: data.length
				})
			}
			return series
		}
		return results
    }

	async getData(estacion_id) {
		// FOR A ESTACION_ID DOWNLOADS AND PARSES DATA
		if(!this.config.estaciones_map[estacion_id]) {
			throw("estacion_id not in config.estaciones_map")
		}
		var url = this.config.estaciones_map[estacion_id].url // `${this.config.url}/${this.config.estaciones_map[estacion_id]}/${this.config.filename}`
		console.log({url:url})
		return axios.get(url,{responseType: "text"})
		.then(response=>{
			this.last_response = response.data
			return this.parseData(response.data,this.config.estaciones_map[estacion_id].parser)
		}).then(async data=>{
			if(!data.length) {
				return []
			}
			this.last_retrieved_data = data
			var var_ids = Array.from(new Set(data.map(d=>d.var_id)))
			try {
				var var_series_map = await this.getVarSeriesMap(estacion_id,var_ids)
			} catch(e) {
				throw(e)
			}
			this.last_var_series_map = var_series_map
			return data.map(d=>{
				d.series_id = var_series_map[d.var_id] // ASSIGN SERIES_ID TO OBSERVACIONES ACCORDING TO RESULT OF crud.getSeries (var_id+estacion_id+proc_id)
				// delete d.var_id
				return d
			}).filter(d=>(d.series_id)) // FILTER OUT OBSERVACIONES WITH NO SERIES_ID
		})
	}

	async getVarSeriesMap(estacion_id,var_ids) {
		// FOR A ESTACION_ID GET MAPPING OF VAR_ID INTO SERIES_ID 
		return crud.getSeries("puntual",{var_id:[var_ids],estacion_id:estacion_id,proc_id:this.config.proc_id},{no_metadata:true})
		.then(series=>{
			if(!series.length) {
				throw("No series found")
			}
			var var_series_map = {}
			series.forEach(s=>{
				var_series_map[s.var_id] = s.id
			})
			return var_series_map
		})
	}

	parseData(data,parser) {
		// PARSE TEXT RESPONSE OF HTTP GET INTO OBSERVACIONES ARRAY 
		return this.parsers[parser](data)  
	}

	parseUTN(data) {
		var columns = ["tempmedia","tempmax","tempmin","humrel","puntorocio","velvientomedia","dirviento","recviento","velvientomax","dirvientomax","sensterm","indcalor","indthw","indthsw","presion","precip","intprecip","radsolar","enersolar","maxradsolar","indiceuv","dosisuv","uvmax","graddcalor","graddfrio","tempint","humint","rocioint","ET","incalint","muestviento","txviento","recepiss","intarc"]
		columns = columns.map(c=>{
			var index = this.config.columns.map(col=>col.name).indexOf(c)
			if(index>=0) {
				return this.config.columns[index]
			} else {
				return {
					"name": c
				}
			}
		})
		var rows = data.split("\n")
		var h1 = rows.shift()
		var h2 = rows.shift()
		var h3 = rows.shift()
		var result = []
		for(var i in rows) {
			var row = rows[i].split(/\s+/)
			if(row.length < 2) {
				continue
			}
			this.current_row = [...row]
			while(row[0] == "") {
				row.shift()
			}
			var datetime = this.parseDate(row.shift(),row.shift())
			if(!datetime) {
				console.error("invalid date on row " + i)
				continue
			}
			// this.current_row = row
			for(var i in row) {
				if(i >= columns.length) {
					break
				}
				var val = row[i]
				if(val == "---") {
					continue
				}
				if(!columns[i].var_id) {
					continue
				}
				result.push({
					timestart: datetime,
					timeend: datetime,
					var_id: columns[i].var_id,
					valor: (columns[i].type == "number") ? parseFloat(val) : val
				})
			}
		}
		return result
	}

	parseMercobras(data) {
		var columns = ["tempmedia","tempmax","tempmin","humrel","puntorocio","velvientomedia","dirviento","recviento","velvientomax","dirvientomax","sensterm","indcalor","indthw","presion","precip","intprecip","graddcalor","graddfrio","tempint","humint","rocioint","incalint","emcint","densintaire","muestviento","txviento","recepiss","intarc"]
		columns = columns.map(c=>{
			var index = this.config.columns.map(col=>col.name).indexOf(c)
			if(index>=0) {
				return this.config.columns[index]
			} else {
				return {
					"name": c
				}
			}
		})
		var rows = data.split("\n")
		var h1 = rows.shift()
		var h2 = rows.shift()
		var h3 = rows.shift()
		var result = []
		for(var i in rows) {
			var row = rows[i].split(/\s+/)
			if(row.length < 2) {
				continue
			}
			this.current_row = [...row]
			while(row[0] == "") {
				row.shift()
			}
			var datetime = this.parseDate(row.shift(),row.shift())
			if(!datetime) {
				console.error("invalid date on row " + i)
				continue
			}
			// this.current_row = row
			for(var i in row) {
				if(i >= columns.length) {
					break
				}
				var val = row[i]
				if(val == "---") {
					continue
				}
				if(!columns[i].var_id) {
					continue
				}
				result.push({
					timestart: datetime,
					timeend: datetime,
					var_id: columns[i].var_id,
					valor: (columns[i].type == "number") ? parseFloat(val) : val
				})
			}
		}
		return result
	}

	parseAcumar(data) {
		var rows = data.split("\n")
		var h1 = rows.shift()
		var h2 = rows.shift()
		var h3 = rows.shift()
		var result = []
		for(var i in rows) {
			var row = rows[i].split(/\s+/)
			if(row.length < 2) {
				continue
			}
			this.current_row = [...row]
			while(row[0] == "") {
				row.shift()
			}
			var datetime = this.parseDate(row.shift(),row.shift())
			if(!datetime) {
				console.error("invalid date on row " + i)
				continue
			}
			// this.current_row = row
			for(var i in row) {
				if(i >= this.config.columns.length) {
					break
				}
				var val = row[i]
				if(val == "---") {
					continue
				}
				if(!this.config.columns[i].var_id) {
					continue
				}
				result.push({
					timestart: datetime,
					timeend: datetime,
					var_id: this.config.columns[i].var_id,
					valor: (this.config.columns[i].type == "number") ? parseFloat(val) : val
				})
			}
		}
		return result
	}

	// parseDateAMPM(date,time) {
	// 	var ampm = time.slice(-1);
	// 	time = time.slice(time.length-1,time.length)
	// 	try {
	// 		var d = date.split("/").map(i=>parseInt(i))
	// 		var t = time.split(":").map(i=>parseInt(i))
	// 	} catch(e) {
	// 		console.error(e)
	// 		return undefined
	// 	}
	// 	if(ampm == "p") {
	// 		t[0] += (t[0] >= 12) ? 0 : 12
	// 	} else if (ampm == "a") {
	// 		t[0] += (t[0] >= 12) ? -12 : 0
	// 	} else {
	// 		throw("Bad ampm date")
	// 	}
	// 	try {
	// 		var datetime = new Date(d[2]+2000,d[1]-1,d[0],t[0],t[1])
	// 	} catch(e) {
	// 		console.error(e)
	// 		return undefined
	// 	}
	// 	return datetime
	// }

	parseDate(date,time) {
		var ampm = (time.slice(-1)=="a") ? 1: (time.slice(-1)=="p") ? 2 : 0
		if(ampm) {
			time = time.slice(0,time.length-1)
		}
		try {
			var d = date.split("/").map(i=>parseInt(i))
			var t = time.split(":").map(i=>parseInt(i))
		} catch(e) {
			console.error(e)
			return undefined
		}
		if(ampm == 2 && t[0] < 12) {
			t[0] = t[0] + 12
		} else if (ampm == 1 && t[0] >= 12) {
			t[0] = t[0] - 12
		}
		try {
			var datetime = new Date(d[2]+2000,d[1]-1,d[0],t[0],t[1])
		} catch(e) {
			console.error(e)
			return undefined
		}
		return datetime
	}

    update(filter,options) {
        return this.get(filter,options)
		.then(observaciones=>{
			return crud.upsertObservaciones(observaciones,"puntual")
		})
    }
}

internal.api_smn = class {

    constructor(config) {
		this.default_config = {
			url: "https://api-test.smn.gob.ar/v1",
			username: "username",
			password: "password"
		}
		this.config = this.default_config
		if(config) {
			Object.keys(config).forEach(key=>{
				this.config[key] = config[key]
			})
		}
		// this.getToken()
	}
	
	async getNewToken(save=true) {
		var url = `${this.config.url}/api-token/auth`
		return axios.post(url, {
			username: this.config.username,
			password: this.config.password
		})
		.then(async response=>{
			this.token = response.data.token
			this.token_expiry_date = new Date(new Date().getTime() + 24*3600*1000)
			if(save) {
				try {
					await crud.updateAccessorToken("api_smn",this.token,this.token_expiry_date)
				} catch(e) {
					throw(e)
				}
			}
			return response.data.token
		})
	}

	async getSavedToken() {
		return crud.getAccessorToken("api_smn")
		.then(result=>{
			if(!result.token) {
				console.log("Saved token not found")
				return
			} 
			if(result.token_expiry_date < new Date()) {
				console.log("Saved token is expired")
				return
			}
			this.token = result.token
			this.token_expiry_date = result.token_expiry_date
			return result.token
		})
	}

	async getToken() {
		// lee this.token y chequea fecha de caducidad
		if(this.token && this.token_expiry_date > new Date()) {
			return this.token
		}
		// si no lo encuentra o está vencido busca el token guardado en BD
		try {
			var token = await this.getSavedToken()
		} catch(e) {
			throw(e)
		}
		// si no encuentra en BD o está vencido solicita uno nuevo a la api
		if(!token) {
			console.log("Solicitando nuevo token")
			try {
				token = await this.getNewToken()
			} catch(e) {
				throw(e)
			}
		}
		return token
	}

	async getStations() {
		try {
			var token = await this.getToken()
		} catch(e) {
			throw(e)
		}
		return axios.get(`${this.config.url}/georef/station`,{
			headers: {
				"Authorization": `JWT ${token}`
			}
		})
		.then(response=>{
			return response.data
		})
	}
	parseStation(station) {
		return {
			id_externo: station.id,
			nombre: station.name,
			distrito: station.province,
			geom: {
				type: "Point",
				coordinates: [station.coord.lon, station.coord.lat]
			},
			tabla: "stations"
		}
	}

	getStationsMap() {
		return crud.getEstaciones({tabla:"stations"})
		.then(results=>{
			this.config.estaciones_map = {}
			results.forEach(es=>{
				if(parseInt(es.id_externo).toString() != "NaN") {
					this.config.estaciones_map[es.id] = parseInt(es.id_externo)
				}
			})
			return
		})
	}

	getStationsMapInv() {
		return crud.getEstaciones({tabla:"stations"})
		.then(results=>{
			this.config.estaciones_map_inv = {}
			results.forEach(es=>{
				this.config.estaciones_map_inv[es.id_externo] = es.id
			})
			return
		})
	}

	getSites(filter) {
		return this.getStations()
		.then(stations=>{
			return stations.map(s=>this.parseStation(s))
		})
		.then(estaciones=>{
			if(filter && filter.id_externo) {
				estaciones = estaciones.filter(e=>(e.id == filter.id_externo))
			}
			return estaciones
		})
	}

	updateSites(filter) {
		return this.getSites(filter)
		.then(sites=>{
			return crud.upsertEstaciones(sites)
		})
	}

	async getPrecip(estacion_id,timestart,timeend) {
		try {
			var token = await this.getToken()
		} catch(e) {
			throw(e)
		}
		if(!this.config.estaciones_map) {
			try {
				await this.getStationsMap()
			} catch(e) {
				throw(e)
			}
		}
		if(!this.config.series_map) {
			try {
				await this.getSeriesMap()
			} catch(e) {
				throw(e)
			}
		}
		var series_id = this.seriesLookUp(estacion_id,1)
		var stationId = this.config.estaciones_map[estacion_id]
		if(!stationId) {
			throw("invalid estacion_id")
		}
		var url = `${this.config.url}/history/precipitation/station/${stationId}`
		console.log({url: url})
		return axios.get(url,{
			params: {
				start: new Date(timestart).toISOString(),
				end: new Date(timeend).toISOString() 
			},
			headers: {
				"Authorization": `JWT ${token}`
			}
		})
		.then(response=>{
			this.last_response_data = response.data
			return this.parsePrecipList(response.data.list,series_id)
		})
		.catch(error=>{
			this.last_error = error
			if(error.response) {
				if(error.response.status == 404) {
					console.error({estacion_id:estacion_id,url:url,data:error.response.data})
					if(this.error_stack) {
						this.error_stack.push({estacion_id:estacion_id,url:url,data:error.response.data})
					}
					return []
				} else {
					throw(error)
				}
			} else {
				throw(error)
			}
		})
	}

	getSeriesMap() {
		return crud.getSeries("puntual",{tabla_id:"stations",proc_id:1},{no_metadata:true})
		.then(series=>{
			this.config.series_map = series
			return
		})
	}

	seriesLookUp(estacion_id,var_id) {
		for(var serie of this.config.series_map) {
			if(serie.estacion_id == estacion_id && serie.var_id == var_id) {
				return serie.id
			}
		}
		return
	}

	parsePrecipList(list,series_id) {
		return list.filter(item=>(item.valid)).map(item=>{
			return {
				series_id: series_id,
				timestart: new Date(item.date),
				timeend: new Date(new Date(item.date).getTime() + 24*3600*1000),
				valor: (item.precipitation) ? item.precipitation : 0
			}			
		})
	}

	async getTemp(estacion_id,timestart,timeend,var_id=[5,6]) {
		try {
			var token = await this.getToken()
		} catch(e) {
			throw(e)
		}
		if(!this.config.estaciones_map) {
			try {
				await this.getStationsMap()
			} catch(e) {
				throw(e)
			}
		}
		if(!this.config.series_map) {
			try {
				await this.getSeriesMap()
			} catch(e) {
				throw(e)
			}
		}
		var series_id_temp_max = (var_id.indexOf(6) >= 0) ? this.seriesLookUp(estacion_id,6) : undefined
		var series_id_temp_min = (var_id.indexOf(5) >= 0) ? this.seriesLookUp(estacion_id,5) : undefined
		var stationId = this.config.estaciones_map[estacion_id]
		if(!stationId) {
			throw("invalid estacion_id")
		}
		var url = `${this.config.url}/history/temperature/station/${stationId}`
		console.log({url: url})
		return axios.get(url,{
			params: {
				start: new Date(timestart).toISOString().substring(0,10),
				end: new Date(timeend).toISOString().substring(0,10) 
			},
			headers: {
				"Authorization": `JWT ${token}`
			}
		})
		.then(response=>{
			this.last_response_data = response.data
			return this.parseTempList(response.data.list,series_id_temp_min,series_id_temp_max)
		})
		.catch(error=>{
			this.last_error = error
			if(error.response) {
				if(error.response.status == 404) {
					console.error({estacion_id:estacion_id,url:url,data:error.response.data})
					if(this.error_stack) {
						this.error_stack.push({estacion_id:estacion_id,url:url,data:error.response.data})
					}
					return []
				} else {
					throw(error)
				}
			} else {
				throw(error)
			}
		})
	}

	parseTempList(list,series_id_temp_min,series_id_temp_max) {
		var obs_temp_min = (series_id_temp_min) ? list.map(item=>{
			return {
				series_id: series_id_temp_min,
				timestart: new Date(new Date(item.date).getTime() + 3*3600*1000),
				timeend: new Date(new Date(item.date).getTime() + 27*3600*1000),
				valor: item.temp_min
			}
		}) : []
		var obs_temp_max = (series_id_temp_max) ? list.map(item=>{
			return {
				series_id: series_id_temp_max,
				timestart: new Date(new Date(item.date).getTime() + 3*3600*1000),
				timeend: new Date(new Date(item.date).getTime() + 27*3600*1000),
				valor: item.temp_max
			}
		}) : []
		return [...obs_temp_min,...obs_temp_max]
	}

	async get(filter={},options={}) {
		this.error_stack = []
		if(!filter.timestart || !filter.timeend) {
			throw("Missing filter timestart and timeend")
		}
		if(filter.estacion_id && !Array.isArray(filter.estacion_id)) {
			filter.estacion_id = [filter.estacion_id]
		}
		if(filter.var_id) {
			if(!Array.isArray(filter.var_id)) {
				filter.var_id = [filter.var_id]
			}
		} else {
			filter.var_id = [1,5,6]
		}
		if(!this.config.estaciones_map) {
			try {
				await this.getStationsMap()
			} catch(e) {
				throw(e)
			}
		}
		if(!this.config.series_map) {
			try {
				await this.getSeriesMap()
			} catch(e) {
				throw(e)
			}
		}
		var observaciones = []
		for(var estacion_id of Object.keys(this.config.estaciones_map)) {
			if(filter.estacion_id) {
				if(filter.estacion_id.indexOf(parseInt(estacion_id)) < 0) {
					console.log("skipping estacion_id " + estacion_id)
					continue
				}
			}
			if(filter.var_id.indexOf(1) >= 0) {
				try {
					var obs = await this.getPrecip(estacion_id,filter.timestart,filter.timeend)
				} catch(e) {
					throw(e)
				}
				if(options.update) {
					try {
						var upserted = await crud.upsertObservaciones(obs,"puntual")
					} catch(e){
						throw(e)
					}
					observaciones.push(...upserted)
				} else {
					observaciones.push(...obs)
				}
			} else {
				console.log("skipping precip")
			}
			if(filter.var_id.indexOf(5) >= 0 || filter.var_id.indexOf(6) >= 0) {
				try {
					var obs = await this.getTemp(estacion_id,filter.timestart,filter.timeend,filter.var_id)
				} catch(e) {
					throw(e)
				}
				if(options.update) {
					try {
						var upserted = await crud.upsertObservaciones(obs,"puntual")
					} catch(e){
						throw(e)
					}
					observaciones.push(...upserted)
				} else {
					observaciones.push(...obs)
				}
			} else {
				console.log("skipping temp")
			}
		}
		return observaciones
	}

	async update(filter={},options={}) {
		options.update = true
		return this.get(filter,options)
	}

	async test() {
		return this.getSites()
		.then(sites=>{
			if(!sites.length) {
				return false
			} else {
				return true
			}
		})
		.catch(e=>{
			console.error(e)
			return false
		})
	}
}

// aux functions 

function grib2obs(config={}) { // LEE 1 GRIB, GENERA GTIFFs  // config={filepath:string, variable_map:{"key":{var_id:int,proc_id:int,unit_id:int,series_id:int},...},bbox:{leftlon:number,toplat:number, rightlon:number,bottomlat:number}, units: string}
	if(!config.filepath) {
		return Promise.reject("Falta filepath")
	}
	if(!config.variable_map) {
		return Promise.reject("Falta variable_map")
	}
	return pexec('gdalinfo -json ' + config.filepath)
	.then(result=>{
		var stdout = result.stdout
		var stderr = result.stderr
		var gdalinfo = JSON.parse(stdout)
		//~ var time_update = new Date(parseInt(gdalinfo.bands[0].metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
		return Promise.all(gdalinfo.bands.map(band=> {
			var ref_time = new Date(parseInt(band.metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
			var valid_time = new Date(parseInt(band.metadata[""].GRIB_VALID_TIME.split(/\s/)[0])*1000)
			var var_index  =  Object.keys(config.variable_map).indexOf(band.metadata[""].GRIB_ELEMENT)
			if(var_index >= 0) {
				var variable = config.variable_map[band.metadata[""].GRIB_ELEMENT]
				var gtiff_filename = config.filepath.replace(/\.grib2$/,"." + variable.name + ".tif")
				return pexec('gdal_translate -b ' + band.band + ' -a_srs EPSG:4326 -a_ullr ' + config.bbox.leftlon + ' ' + config.bbox.toplat + ' ' + config.bbox.rightlon + ' ' + config.bbox.bottomlat + ' -of GTiff ' + config.filepath + ' ' + gtiff_filename)
				.then(()=>{
					return pexec('gdal_edit.py -mo "UNITS=meters_per_second" ' + gtiff_filename)
				}).then(()=>{
					//~ console.log({gtiff_filename:gtiff_filename,series_id:variable.series_id})
					return rast2obs(gtiff_filename,variable.series_id)
				})
			} else {
				console.error("band not mapped:"+band.metadata[""].GRIB_ELEMENT)
				return
			}
		}))
		//~ return Promise.all(promises)
		.then(observaciones=>{
			console.log("got " + observaciones.filter(o=>o).length + " observaciones")
			//~ if(series_id) {
				//~ observaciones = observaciones.map(o=> {
					//~ o.series_id = series_id
					//~ return o
				//~ })
			//~ }
			return observaciones.filter(o=>o)
		})
	})
}
function rast2obs(filename,series_id) { // LEE GTIFF , GENERA observación  // filename, series_id, 
	var observacion = {}
	return pexec('gdalinfo -json '+filename)
	.then(result=>{
		var stdout = result.stdout
		var stderr = result.stderr
		if(stderr) {
			console.error(stderr)
		}
		var gdalinfo = JSON.parse(stdout)
		var band = gdalinfo.bands[0]
		var ref_time = new Date(parseInt(band.metadata[""].GRIB_REF_TIME.split(/\s/)[0])*1000)
		var valid_time = new Date(parseInt(band.metadata[""].GRIB_VALID_TIME.split(/\s/)[0])*1000)
		observacion = {tipo:"rast",timeupdate:ref_time,timestart: valid_time, timeend: valid_time}
		if(series_id) {
			observacion.series_id = series_id
		}
		return fsPromises.readFile(filename, 'hex')
	})
	.then(data => {
		observacion.valor = '\\x' + data
		return observacion //new CRUD.observacion({tipo: "rast", series_id:series_id, timestart: previous_time, timeend: valid_time, valor: data}))
	})
}

function roundTo(value,precision) {
	value = parseFloat(value.toString().replace(/\s.*$/,"").replace(",","."))
	var regexp = new RegExp("^(\\d+\\." + "\\d".repeat(precision) + ")\\d+$")
	return parseFloat((value+.5/10**precision).toString().replace(regexp,"$1"))
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

var promiseFromChildProcess = function (child,filename) {
	return new Promise(function (resolve, reject) {
		child.addListener("error", reject);
		child.addListener("exit", resolve(filename));
		child.stdout.on('data', function(data) {
			console.log('stdout: ' + data);
		});
		child.stderr.on('data', function(data) {
			console.log('stderr: ' + data);
		});
	});
}
	
function toDate(d) {
	if(d instanceof Date) {
		return d
	} else {
		var d2;
		if(/^\d{4}-\d{2}-\d{2}\s*$/.test(d)) {
			d2 = d.replace(/\s+/,"");
			d2 = d2 + "T00:00:00.000Z";
		} else if(/^\d{4}-\d{2}-\d{2}[\s|T]\d{2}(:\d{2})?(:\d{2})?$/.test(d)) {
			d2 = d.replace(/\s/,"T") + ":00:00.000Z".substring(d.length-13);
		} else {
			d2=d;
		}			
		return new Date(d2);
	}
}
function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

function printAxiosGetError(error) {
	if(error && error.response) {
		console.error(error.toString() + ". " + error.response.statusText + ": " + error.request.res.responseUrl)	
	} else {
		console.error(error.toString())
	}

}

module.exports = internal
