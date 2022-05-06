const { Pool, Client } = require('pg')
const config = require('config');
const pool = new Pool(config.database)
var Crud = require('./app/informe_semanal.js').crud
var crud = new Crud(pool,config)
var fs = require('fs')

// CREATE REGIONES
geojson = fs.readFileSync('public/json/informe_semanal_regiones.geojson',{encoding: "utf-8"})
geojson = JSON.parse(geojson)
results = []
crud.createRegionesFromGeoJson(geojson).then(r=>{
    results = r
    console.log(results)
}).catch(e=>{
    console.error(e)
})

// READ REGIONES
// FILTER by ID
var geojson_regiones
crud.readRegiones("alto_paraguay").then(r=>{
    geojson_regiones = r
    fs.writeFileSync("tmp/regiones.geojson",JSON.stringify(geojson_regiones))
    console.log("DONE")
}).catch(e=>{
    console.error(e)
})
// ALL
crud.readRegiones().then(r=>{
    geojson_regiones = r
    fs.writeFileSync("tmp/regiones.geojson",JSON.stringify(geojson_regiones))
    console.log("DONE")
}).catch(e=>{
    console.error(e)
})
// no geom
var regiones
crud.readRegiones(undefined,false).then(r=>{
    regiones = r
    fs.writeFileSync("tmp/regiones.json",JSON.stringify(regiones))
    console.log("DONE")
}).catch(e=>{
    console.error(e)
})

