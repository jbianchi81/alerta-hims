'use strict'

// var fs =require("promise-fs")
const program = require('commander')
var sprintf = require('sprintf-js').sprintf
const { runInNewContext } = require("vm")
const { promisify } = require('util');
const { resolve } = require('path');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const utils = require('./utils')

async function getFiles(dir) {
  const subdirs = await readdir(dir);
  const files = await Promise.all(subdirs.map(async (subdir) => {
    const res = resolve(dir, subdir);
    return (await stat(res)).isDirectory() ? getFiles(res) : res;
  }));
  return files.reduce((a, f) => a.concat(f), []);
}

const internal = {}

internal.coleccion = class {
    constructor(obj,config) {
        Object.keys(obj).forEach(key=>{
            this[key] = obj[key]
        })
        this.getRegExp(config.patrones)
    }
    getRegExp(patrones) {
        this.mdfields = {}
        this.search = this.patron_nombre.slice()
        for(var key of Object.keys(patrones)) {
            for(var i=0;i<patrones[key].length;i++) {
                var p = patrones[key][i]
                var index = this.search.indexOf(p)
                if(index >= 0) {
                    this.mdfields[key] = {
                        pattern: p,
                        begin_position: index,
                        end_position: index + p.length
                    }
                    this.search = this.search.replace(new RegExp(p,"g"),"?".repeat(p.length))
                    break
                }
            }
        }
        this.search = new RegExp(this.search.replace(/\?/g,"\\d") + "$")
        return 
    }
}

internal.producto = class {
    constructor(obj,col,getProp) {
        Object.keys(obj).forEach(key=>{
            this[key] = obj[key]
        })
        if(this.reference && col) {
            this.getMatch(col)
            if(this.match) {
                this.getURL(col)
                if(getProp) {
                    this.getProperties(col)
                }
            }
        }
    }
    getMatch(col) {
        // console.log(col.search instanceof RegExp)
        var matches = this.reference.match(col.search)
        if(matches.length) {
            this.match = matches[0]
        } else {
            console.error("filename does not match pattern")
        }
    }
    getURL(col) {
        if(this.match && col && col.url) {
            this.url = sprintf(col.url + "/" + this.match)
        } else {
            console.error("No se pudo construir url del producto")
        }
    }
    getProperties(col) {
        for(var key of ["path", "row", "version"]) {
            if(col.mdfields[key]) {
                this[key] = this.match.substring(col.mdfields[key].begin_position,col.mdfields[key].end_position)
            }
        }
        if(col.mdfields["date"]) {
            var datestring = this.match.substring(col.mdfields["date"].begin_position,col.mdfields["date"].end_position)
            if(col.is_utc) {
                this["date"] = new Date(Date.UTC(datestring.substring(0,4),datestring.substring(4,6)-1,datestring.substring(6,8)))                        
            } else {
                this["date"] = new Date(datestring.substring(0,4),datestring.substring(4,6)-1,datestring.substring(6,8))
            }
        } else if (col.mdfields["datej"]) {
            var datestring = this.match.substring(col.mdfields["datej"].begin_position,col.mdfields["datej"].end_position)
            if(col.is_utc) {
                this["date"] = new Date(Date.UTC(datestring.substring(0,4),0,1))
                this["date"].setUTCDate(datestring.substring(4,7))
            } else {
                this["date"] = new Date(datestring.substring(0,4),0,1)
                this["date"].setDate(datestring.substring(4,7))
            }
        } else if (col.mdfields["year"]) {
            var yearstring = this.match.substring(col.mdfields["year"].begin_postition,col.mdfields["year"].end_position)
            if(col.is_utc) {
                this["date"] = new Date(Date.UTC(yearstring,0,1))
            } else {
                this["date"] = new Date(yearstring,0,1)
            }
            if(col.mdfields["month"]) {
                var monthstring = this.match.substring(col.mdfields["month"].begin_postition,col.mdfields["month"].end_position)
                if(col.is_utc) {
                    this["date"].setUTCMonth(monthstring-1)
                } else {
                    this["date"].setMonth(monthstring-1)
                }
                if(col.mdfields["day"]) {
                    var daystring = this.match.substring(col.mdfields["day"].begin_postition,col.mdfields["day"].end_position)
                    if(col.is_utc) {
                        this["date"].setUTCDate(daystring)
                    } else {
                        this["date"].setDate(daystring)
                    }
                }
            }
        } else if(col.def_date) {
            this["date"] = col.def_date
        }
        if(col.mdfields["time"]) {
            var timestring = this.match.substring(col.mdfields["time"].begin_position,col.mdfields["time"].end_position)
            if(col.is_utc) {
                this["date"].setUTCHours(timestring.substring(0,2))
                this["date"].setUTCMinutes(timestring.substring(2,4))
                this["date"].setUTCSeconds(timestring.substring(4,6))
            } else {
                this["date"].setHours(timestring.substring(0,2))
                this["date"].setMinutes(timestring.substring(2,4))
                this["date"].setSeconds(timestring.substring(4,6))
            }
        } else if(col.mdfields["hour"]) {
            var hourstring = this.match.substring(col.mdfields["hour"].begin_position,col.mdfields["hour"].end_position)
            if(col.is_utc) {
                this["date"].setUTCHours(parseInt(hourstring))
            } else {
                this["date"].setHours(parseInt(hourstring))
            }
        }
        if(col.mdfields["timestart"]) {
            var ftstring = this.match.substring(col.mdfields["timestart"].begin_position,col.mdfields["timestart"].end_position)
            this["timestart"] = new Date(this["date"])
            if(col.is_utc) {
                this["timestart"].setUTCHours(this["timestart"].getUTCHours() + parseInt(ftstring))
            } else {
                this["timestart"].setHours(this["timestart"].getHours() + parseInt(ftstring))
            }
        } else {
            this["timestart"] = new Date(this["date"])
        }
    }
}

internal.file_indexer = class {
    constructor(pool) {
        this.pool = pool
        this.patrones = {
            "path": ["PPP","PP"],
            "row": ["RRR","RR"],
            "date": ["YYYYMMDD"],
            "datej": ["YYYYDDD"],
            "time": ["HHMMSS"],
            "version": ["VVV","V"],
            "year":["YYYY"],
            "month":["MM"],
            "day":["DD"],
            "hour": ["HH"],
            "timestart": ["TTT"]
        }
    }
    
    index_gridded(col_id) {
        return this.getColeccionesRaster(col_id)
        .then(async colecciones=>{
            var new_rows = []
            for(var c in colecciones) {
                // build matching pattern
                var col = colecciones[c]
                // var search = col.patron_nombre.slice()
                // var mdfields = {}
                // for(var key of Object.keys(this.patrones)) {
                //     for(var i=0;i<this.patrones[key].length;i++) {
                //         var p = this.patrones[key][i]
                //         var index = search.indexOf(p)
                //         if(index >= 0) {
                //             mdfields[key] = {
                //                 pattern: p,
                //                 begin_position: index,
                //                 end_position: index + p.length
                //             }
                //             search = search.replace(new RegExp(p,"g"),"?".repeat(p.length))
                //             break
                //         }
                //     }
                // }
                // var result = this.getRegExp(search)
                // search = result.search
                // var mdfields = result.mdfields
                var search = col.search // .replace(/\./g,"\\.")
                console.log("col_id: " + col.id + ", search:" + search)
                // perform file listing
                var files = await getFiles(col.ubicacion)
                console.log("col_id: " + col.id + ", files.length:" + files.length)
                files = files.filter(fn=> search.test(fn))
                console.log("col_id: " + col.id + ", filtered files.length:" + files.length)
                for(var file of files) {
                    var new_row = new internal.producto({
                        col_id: col.id,
                        reference: resolve(col.ubicacion,file)
                    },col,true)
                    // var matches = file.match(search)
                    // if(!matches) {
                    //     console.error("Error - no se encontró el patrón")
                    //     continue
                    // } 
                    // var match = matches[0]
                    if(!new_row.match) {
                        continue
                    }
                    // new_row.getPropertiesFromFilename(col)
                    new_rows.push(new_row)
                }
            }
            return new_rows
        })
        // .then(result=>{
        //     return result.reduce((a,r)=>a.concat(r),[])
        // })
    }

    getColeccionesRaster(col_id) {
        var col_filter = ""
        if(col_id) {
            if(Array.isArray(col_id)) {
                var ids = col_id.map(i=>parseInt(i)).filter(i=>i.toString()!="NaN")
                if(!ids.length) {
                    return Promise.reject("Invalid col_id")
                }
                col_filter = sprintf(" AND id IN (%s)", ids.join(","))
            } else {
                var id = parseInt(col_id)
                if(id.toString() == "NaN") {
                    return Promise.reject("Invalid col_id")
                }
                col_filter = sprintf(" AND id = %d", id)
            }
        }
        var query = sprintf("SELECT * from colecciones_raster WHERE patron_nombre IS NOT NULL %s ORDER BY id", col_filter)
        // console.log(query)
        return this.pool.query(query)
        .then(result=>{
            return result.rows.map(r=>new internal.coleccion(r,{patrones:this.patrones}))
        })
    }

    async update_gridded(col_id) {
        let gridded
        const client = await this.pool.connect()
        try {
            await client.query("BEGIN")
            // console.log("begun")
            await this.clearGridded(col_id,client)
            gridded = await this.index_gridded(col_id,client)
            // console.log(gridded)
            await this.upsertGridded(gridded,client)
            await client.query("COMMIT")
        }catch(e) {
            console.error("error in transaction:" + e.toString())
            await client.query("ROLLBACK")
            throw e
        } finally {
            client.release()
        }
        return gridded
    }

    async upsertGridded(gridded,client) {
        // col_id, reference, path, row, version, timestart
        var rows = gridded.map(r=> sprintf("(%d,'%s',%s,%s,%s,'%s'::timestamptz,'%s'::timestamptz)", r.col_id, r.reference, (r.path)?r.path:"NULL", (r.row)?r.row:"NULL", (r.version)?r.version:"NULL", r.timestart.toISOString(), r.date.toISOString()))
        if(!rows.length) {
            console.log("file_indexer: upsertGridded: nothing to upsert")
            return [] 
        }
        var conn_flag = 0
        if(!client) {
            client = await this.pool.connect()
            conn_flag = 1
        }
        var query = sprintf("INSERT INTO gridded (col_id, reference, path, row, version, timestart, date) VALUES %s ON CONFLICT (col_id, timestart, path, row, version, date) DO UPDATE SET reference=EXCLUDED.reference RETURNING *", rows.join(","))
        return client.query(query)
        .then(result=>{
            if(conn_flag) {
                client.release()
            }
            return result.rows
        })
    }

    async clearGridded(col_id,client) {
        var conn_flag = 0
        if(!client) {
            client = await this.pool.connect()
            conn_flag = 1
        }
        var col_id_filter = ""
        if(col_id) {
            if(Array.isArray(col_id)) {
                col_id_filter = sprintf(" AND col_id IN (%s)", col_id.map(i=>parseInt(i)).join(","))
            } else {
                col_id_filter = sprintf(" AND col_id = %s", parseInt(col_id))
            }
        }
        var query = sprintf("DELETE FROM gridded WHERE id=id %s RETURNING *", col_id_filter)
        // console.log(query)
        return client.query(query)
        .then(result=>{
            if(conn_flag) {
                client.release()
            }
            return result.rows
        })
    }

    async getGridded(filter={},options={}) {
        if(options.no_metadata) {
            return this.getGriddedFlat(filter)
            .then(productos=>{
                return {
                    productos: productos
                }
            })
        } else {
            return this.getColeccionesRaster(filter.col_id)
            .then(async colecciones=>{
                for(var i=0;i<colecciones.length;i++) {
                    var prod_filter = {...filter}
                    prod_filter.col_id = colecciones[i].id
                    const productos = await this.getGriddedFlat(prod_filter)
                    colecciones[i].productos = productos.map(p=>{
                        return new internal.producto(p, colecciones[i], false)
                    })
                }
                return {
                    colecciones: colecciones
                }
            })
        }
    }

    async getGriddedFlat(filter={},client) {
        // console.log({filter:filter})
        var conn_flag = 0
        if(!client) {
            client = await this.pool.connect()
            conn_flag = 1
        }
        const valid_filters = {
            "col_id": {
                type: "integer"
            },
            "reference": {
                type: "regex_string"
            },
            "path": {
                type: "integer"
            },
            "row": {
                type: "integer"
            },
            "timestart": {
                type: "timestart"
            },
            "timeend": {
                type: "timeend"
            },
            "version": {
                type: "integer"
            },
            "id": {
                type: "integer"
            },
            "date": {
                type: "date"
            }
        }
        var filter_string = utils.control_filter2(valid_filters,filter,"gridded")
        if(!filter_string) {
            return Promise.reject("Invalid filters")
        }
        var query = sprintf("SELECT * FROM gridded WHERE id=id %s ORDER BY col_id,date,timestart", filter_string)
        // console.log(query)
        return client.query(query)
        .then(result=>{
            if(conn_flag) {
                client.release()
            }
            return result.rows
        })
    }
    
    runGridded(col_id,options) {
        let action
        if(options.no_update) {
            action = this.index_gridded(col_id)
        } else {
            action = this.update_gridded(col_id)
        }
        return action
    }
}

module.exports = internal

///////////////////////////////

program
  .version('0.0.1')
  .description('index raster');

program
  .command('run')
  .alias('r')
  .description('indexa rasters')
  .option('-c, --col_id <value>', 'id de colecciones_raster')
  .option('-S, --skip_update','no actualiza gridded',false)
  .option('-o, --output <value>', 'salida')
  .action(options => {
    const config = require('config')
    const { Pool, Client } = require('pg')
    const pool = new Pool(config.database)
    var indexer = new internal.file_indexer(pool)

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
  .command('get')
  .alias('g')
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
    const config = require('config')
    const { Pool, Client } = require('pg')
    const pool = new Pool(config.database)
    var indexer = new internal.file_indexer(pool)

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


program.parse(process.argv);