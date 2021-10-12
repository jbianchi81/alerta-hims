'use strict'

var fs =require("promise-fs")
const path = require('path');
const tar = require('tar');
var sprintf = require('sprintf-js').sprintf
const { exec, spawn } = require('child_process');

const internal = {}

function DayOfTheYear(date) {
    var now = new Date(date);
    var start = new Date(now.getUTCFullYear(), 0, 0);
    var diff = now - start;
    var oneDay = 1000 * 60 * 60 * 24;
    var day = Math.floor(diff / oneDay);
    return day // console.log('Day of year: ' + day);
}

function getForecastHours(forecast_date,timestart) {
    var diff = timestart - forecast_date
    var oneHour = 1000 * 60 * 60
    var hour = Math.floor(diff / oneHour)
    return hour
}

function replace_patron_nombre(obs,patron_nombre="gefs.YYYYMMDD/HH/gefs.wave.tHHz.c00.global.0p25.fTTT.grib2") {
    // const patrones = {
    //     "path": ["PPP","PP"],
    //     "row": ["RRR","RR"],
    //     "version": ["VVV","V"],
    //     "date": "YYYYMMDD",
    //     "datej": "YYYYDDD",
    //     "time": ["HHMMSS"],
    //     "year":["YYYY"],
    //     "month":["MM"],
    //     "day":["DD"],
    //     "hour": ["HH"],
    //     "timestart": ["TTT"]
    // }
    const patrones = [
        {
            name:"path",
            pattern: "PPP",
            repl_str: sprintf("%03d",(obs.path) ? obs.path : 0)
        },
        {
            name:"path",
            pattern: "PP",
            repl_str: sprintf("%02d",(obs.path) ? obs.path : 0)
        },
        {
            name:"row",
            pattern: "RRR",
            repl_str: sprintf("%03d",(obs.row) ? obs.row : 0)
        },
        {
            name:"row",
            pattern: "RR",
            repl_str: sprintf("%02d",(obs.row) ? obs.row : 0)
        },
        {
            name:"version",
            pattern: "VVV",
            repl_str: sprintf("%03d",(obs.version) ? obs.version : 0)
        },
        {
            name:"version",
            pattern: "V",
            repl_str: sprintf("%01d",(obs.version) ? obs.version : 0)
        },
        {
            name:"date",
            pattern: "YYYYMMDD",
            repl_str: sprintf("%04d%02d%02d",obs.timestart.getUTCFullYear(), obs.timestart.getUTCMonth()+1, obs.timestart.getUTCDate())
        },
        {
            name:"datej",
            pattern: "YYYYDDD",
            repl_str: sprintf("%04d%03d",obs.timestart.getUTCFullYear(), DayOfTheYear(obs.timestart))
        },
        {
            name:"time",
            pattern: "HHMMSS",
            repl_str: sprintf("%02d%02d%02d",obs.timestart.getUTCHours(), obs.timestart.getUTCMinutes(), obs.timestart.getUTCSeconds())
        },
        {
            name:"year",
            pattern: "YYYY",
            repl_str: sprintf("%04d",obs.timestart.getUTCFullYear())
        },
        {
            name:"month",
            pattern: "MM",
            repl_str: sprintf("%02d",obs.timestart.getUTCMonth()+1)
        },
        {
            name:"day",
            pattern: "DD",
            repl_str: sprintf("%02d",obs.timestart.getUTCDate())
        },
        {
            name:"hour",
            pattern: "HH",
            repl_str: sprintf("%02d",obs.timestart.getUTCHours())
        },
        {
            name:"timestart",
            pattern: "TTT",
            repl_str: sprintf("%03d",(obs.timeupdate) ? getForecastHours(obs.timeupdate,obs.timestart) : 0)
        }
    ]
    var fname = patron_nombre.slice()
    for(var i = 0;i<patrones.length;i++) {
        if(fname.indexOf(patrones[i].pattern) >= 0) {
            fname = fname.replace(patrones[i].pattern, patrones[i].repl_str,'g')
        }
    }
    // for(var key of ["path", "row", "version"]) {
    //     for(var i=0;i<patrones[key].length;i++) {
    //         var index = fname.indexOf(patrones[key][i])
    //         if( index >= 0 ) {
    //             var repl_str = "%0" + patrones[key][i].length + "d" 
    //             fname = fname.replace(patrones[key][i], sprintf(repl_str, obs[key]),"g")
    //             continue
    //         }
    //     }
    // }
    // if(fname.indexOf(patrones["date"]) >= 0) {
    //     var repl_str = "%04d%02d%02d" 
    //     fname = fname.replace(patrones["date"], sprintf(repl_str, obs.timestart.getUTCYear(), obs.timestart.getUTCMonth()+1, obs.timestart.getUTCDate()),"g")
    // } else if (fname.indexOf(patrones["datej"]) >= 0) {
    //     var repl_str = "%04d%03d" 
    //     fname = fname.replace(patrones["datej"], sprintf(repl_str, obs.timestart.getUTCYear(), DayOfTheYear(obs.timestart)),"g")
    //         continue
    //     }
    // }
    // if (fname.indexOf(patrones["year"]) >= 0) {
    //     var repl_str = "%04d"
    //     fname = fname.replace(patrones["year"],sprintf(repl_str, obs.timestart.getUTCYear())
    // }
    return fname
}

internal.print_rast = function(options,serie,obs) {
	// console.log({obs:obs})
	options.format = (options.format) ? options.format : "GTIff"
	var prefix = (options.prefix) ? options.prefix : "rast"
	var location = (options.location) ? options.location : "../public"
    var fname = sprintf("%s_%05d_%s_%s\.%s", prefix, obs.series_id, obs.timestart.toISOString().substring(0,10), obs.timeend.toISOString().substring(0,10), options.format)
    if(options.patron_nombre) {
        fname = replace_patron_nombre(obs,options.patron_nombre)
    }
	const filename = path.resolve(__dirname, location, fname)
	console.log("rest.print_rast: filename: " +filename)
	return fs.writeFile(filename, obs.valor,{encoding:"utf8"})
	.then(()=>{
		var addMD = exec('gdal_edit.py -mo "series_id=' + obs.series_id + '" -mo "timestart=' + obs.timestart.toISOString() + '" -mo "timeend=' + obs.timeend.toISOString() + '" ' + filename)
		return promiseFromChildProcess(addMD,filename)
	})
	.then(filename=>{
		if(serie && options.series_metadata) {
			var addMD = exec('gdal_edit.py -mo "var_id=' + serie["var"].id + '" -mo "var_nombre=' + serie["var"].nombre + '" -mo "unit_id=' + serie.unidades.id + '" -mo "unit_nombre=' + serie.unidades.nombre + '" -mo "proc_id=' + serie.procedimiento.id + '" -mo "proc_nombre=' + serie.procedimiento.nombre + '" -mo "fuente_id=' + serie.fuente.id + '" -mo "fuente_nombre=' + serie.fuente.nombre + '" ' + filename)
			return promiseFromChildProcess(addMD,filename)
		} else {
			return filename
		}
	})
	.then(filename=>{
		if(options.funcion) {
			var addMD=exec('gdal_edit.py -mo "agg_func=' + options.funcion + '" -mo "count=' + obs.count + '" ' + filename)
			return promiseFromChildProcess(addMD,filename)
		} else {
			return filename
		}
	})
	.then(filename=>{
		console.log("Se creó el archivo " + filename)
		var result = obs
		delete result.valor
		result.funcion = options.funcion
		result.filename = filename
		if(serie && options.series_metadata) {
			result.serie = {"var":serie["var"], unidades: serie.unidades, procedimiento: serie.procedimiento, fuente: serie.fuente}
		}
		return result
	})
}

internal.print_rast_series = async function (serie,options={}) {
    if(!serie || !serie.observaciones || ! serie.observaciones.length) {
        return Promise.reject("Empty series")
    }
    var results = []
    for (var i = 0; i < serie.observaciones.length ; i++) {
        const obs = serie.observaciones[i]
        try {
            var result = await internal.print_rast(options,serie,obs)
        }
        catch(e) {
            return Promise.reject(e)
        }
        results.push(result)
    }
    if(options.tar) {
        var tarfile = results[0].filename + ".tgz"
        console.log("creando " + tarfile)
        return tar.c(
            {
                gzip: true,
                file: tarfile,
                cwd: path.dirname(results[0].filename) // "public/rast"
            },
            results.map(r=> path.basename(r.filename))
        ).then(_ => {
            console.log("tarball file " + tarfile)
			if(!options.keep_files) {
				results.forEach(file=>{
					fs.unlinkSync(path.resolve(file.filename))
				})
			}
            return path.resolve(tarfile)
        })
    } else {
        return Promise.resolve(results)
    }
}

internal.makeBrowse = function(data,options={}) {
    var width = (options.width) ? parseInt(options.width) : 300
    var height = (options.height) ? parseInt(options.height) : 300
    var colormap = (options.colormap) ? options.colormap : "pseudocolor"
    if(["grayscale","greyscale","pseudocolor","fire","bluered"].indexOf(colormap) < 0) {
        return Promise.reject('Bad parameter colormap. Valid values: "grayscale","greyscale","pseudocolor","fire","bluered"')
    }
    return pool2.connect()
    .then(client=>{
        return client.query("BEGIN;")
        .then(()=>{
            return client.query("CREATE temporary table obs (series_id int,tipo varchar, id int, timestart timestamp, timeend timestamp, timeupdate timestamp, valor raster, browse raster);")

        })
        .then(()=>{
            var rows = data.map(obs=>{
                return "(" + obs.series_id + ",'" + obs.tipo + "' ," + obs.id + " ,'" + obs.timestart.toISOString() + "'::timestamptz ,'"  + obs.timeend.toISOString() + "'::timestamptz ,'" + obs.timeupdate.toISOString() + "'::timestamptz ,ST_fromgdalraster('\\x" + obs.valor.toString('hex') + "') )"
            }).join(",")
            var query = "INSERT INTO obs VALUES " + rows
            // console.log(query)
            return client.query(query)
        })
        .then(()=>{
            var query = "SELECT series_id,\
                        tipo,\
                        id,\
                        timestart,\
                        timeend,\
                        valor,\
                        ST_asGDALRaster(\
                            st_colormap(\
                                st_resize(\
                                    st_reclass(\
                                        valor,\
                                        '[' || (st_summarystats(valor)).min || '-' || (st_summarystats(valor)).max || ']:1-255, ' || st_bandnodatavalue(valor) || ':0',\
                                        '8BUI'\
                                    ),\
                                    " + width + ",\
                                    " + height + "\
                                ),\
                                1,\
                                '" + colormap + "',\
                                'nearest'\
                            ),\
                            'PNG'\
                        ) AS browse\
                    FROM obs ORDER BY series_id,timestart;"
            // console.log(query)
            return client.query(query)
        })
        .then(result=>{
            client.release()
            return result.rows
        })
        .catch(e=>{
            console.error(e)
            return client.release() // query("ROLLBACK")
        })
    })
    .catch(e=>{
        console.error(e)
        return
    })
}


internal.makeBrowseAsync = async function (data,options={}) {
    var width = (options.width) ? parseInt(options.width) : 300
    var height = (options.height) ? parseInt(options.height) : 300
    var colormap = (options.colormap) ? options.colormap : "pseudocolor"
    if(["grayscale","greyscale","pseudocolor","fire","bluered"].indexOf(colormap) < 0) {
        return Promise.reject('Bad parameter colormap. Valid values: "grayscale","greyscale","pseudocolor","fire","bluered"')
    }
    var results = []
    for(var i=0;i<data.length;i++) {
        console.log(i)
        var obs = data[i]
        var client
        try {
            client = await pool2.connect()
        } catch (e) {
            // console.error(e)
            return Promise.reject(e)
        }
        try {
            await client.query("BEGIN;")
            await client.query("CREATE temporary table obs (series_id int,tipo varchar, id int, timestart timestamp, timeend timestamp, timeupdate timestamp, valor raster, browse raster);")
            var row = "(" + obs.series_id + ",'" + obs.tipo + "' ," + obs.id + " ,'" + obs.timestart.toISOString() + "'::timestamptz ,'"  + obs.timeend.toISOString() + "'::timestamptz ,'" + obs.timeupdate.toISOString() + "'::timestamptz ,ST_fromgdalraster('\\x" + obs.valor.toString('hex') + "') )"
            var query = "INSERT INTO obs VALUES " + row
            // console.log(query)
            await client.query(query)
            var query = "SELECT series_id,\
                        tipo,\
                        id,\
                        timestart,\
                        timeend,\
                        valor,\
                        ST_asGDALRaster(\
                            st_colormap(\
                                st_resize(\
                                    st_reclass(\
                                        valor,\
                                        '[' || (st_summarystats(valor)).min || '-' || (st_summarystats(valor)).max || ']:1-255, ' || st_bandnodatavalue(valor) || ':0',\
                                        '8BUI'\
                                    ),\
                                    " + width + ",\
                                    " + height + "\
                                ),\
                                1,\
                                '" + colormap + "',\
                                'nearest'\
                            ),\
                            'PNG'\
                        ) AS browse\
                    FROM obs ORDER BY series_id,timestart;"
            // console.log(query)
            var result = await client.query(query)
            results[i] = result.rows[0]
        }
        catch (e){
            await client.query("ROLLBACK")
            client.release()
            return Promise.reject(e)
        }
        finally {
            await client.query("ROLLBACK")
            client.release()
        }
    }
    return Promise.resolve(results)
}


function promiseFromChildProcess(child,filename) {
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



module.exports = internal
