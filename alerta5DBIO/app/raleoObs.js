'use strict'

const { Pool, Client } = require('pg')
const config = require('config');
const CRUD = require('./CRUD')
const pool = new Pool(config.database)
const crud = new CRUD.CRUD(pool,config)
const program = require('commander')
const fs = require('fs')

//  PROGRAM //////////////////////////////////////////////////////////////

program
  .version('0.0.1')
  .description('thin observations');

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
        filter.fuentes_id = options.fuentes_id
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

program.parse(process.argv);
