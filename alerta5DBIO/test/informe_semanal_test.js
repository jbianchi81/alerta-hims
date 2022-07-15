const { Pool, Client } = require('pg')
const config = require('config');
const pool = new Pool(config.database)
var Crud = require('../app/informe_semanal.js').crud
var crud = new Crud(pool,config)
var fs = require('fs')

const internal = {}

// TESTS
internal.Tests = class {
    constructor() {
        this.pool = pool
        this.config = config
        this.errors = []
    }

    // CREATE REGIONES
    async test_7() {
        var geojson = fs.readFileSync('tmp/regiones_semanal.geojson',{encoding: "utf-8"})
        geojson = JSON.parse(geojson)
        this.results = []
        return crud.createRegionesFromGeoJson(geojson).then(r=>{
            this.results = r
            if(this.results.length == geojson.features.length) {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // READ REGIONES
    // FILTER by ID
    async test_8() {
        this.results = []
        return crud.readRegiones("parana_delta").then(r=>{
            this.results = r
            fs.writeFileSync("tmp/regiones.geojson",JSON.stringify(r))
            if(this.results.features && this.results.features.length == 1 && this.results.features[0].properties.id == "parana_delta") {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // ALL
    async test_9() {
        this.results = []
        return crud.readRegiones().then(r=>{
            this.results = r
            fs.writeFileSync("tmp/regiones.geojson",JSON.stringify(this.results))
            if(this.results.features && this.results.features.length == 14) {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // no geom
    async test_10() {
        this.results = []
        return crud.readRegiones(undefined,false).then(r=>{
            this.results = r
            fs.writeFileSync("tmp/regiones.json",JSON.stringify(regiones))
            if(this.results.length == 12) {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // DELETE REGIONES
    // SINGLE ID
    async test_11() {
        this.results = []
        return crud.deleteRegiones("salado_bsas").then(r=>{
            this.results = r
            if(this.results.length == 1) {
                return this.test_7() // restore regiones
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }
    // ARRAY OF IDS
    async test_12() {
        this.results = []
        return crud.deleteRegiones(["parana_alto","parana_bajo"]).then(r=>{
            this.results = r
            if(this.results.length == 2) {
                return this.test_7() // restore regiones
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // ALL
    async test_13() {
        this.results = []
        return crud.deleteRegiones().then(r=>{
            this.results = r
            if(this.results.length == 12) {
                return this.test_7() // restore regiones
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // CREATE INFORME
    async test_5() {
        this.results = {}
        return crud.createInforme(new Date("2022-05-06T03:00:00Z"),"informe de prueba 3").then(r=>{
            this.results = r
            if(this.results.fecha.toISOString().substring(0,10) == "2022-05-06") {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // CREATE INFORME con contenido
    async test_6() {
        this.results = {}
        return crud.createInforme(internal.informe_semanal_test.fecha,internal.informe_semanal_test.texto_general,internal.informe_semanal_test.contenido).then(r=>{
            this.results = r
            if(this.results.fecha.toISOString().substring(0,10) == internal.informe_semanal_test.fecha && this.results.contenido.length == internal.informe_semanal_test.contenido.length) {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // READ INFORME
    async test_14() {
        this.results = {}
        return crud.readInforme("2022-05-06").then(r=>{
            this.results = r
            if(this.results.fecha.toISOString().substring(0,10) == "2022-05-06") {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            this.errors.push(e.toString())
            return false
        })
    }

    // último
    async test_15() {
        this.results = {}
        return crud.readInforme().then(r=>{
            this.results = r
            if(this.results.fecha.toISOString().substring(0,10) == "2022-05-06") {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // por intervalo de fechas 
    async test_0() {
        this.results = []
        fecha = "2022-05-06"
        return crud.readInformes(fecha, fecha).then(r=>{
            this.results = r
            if(this.results.length == 1) {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // solo inicial
    async test_1() {
        this.results = []
        fecha = "2022-05-06"
        return crud.readInformes(fecha).then(r=>{
            this.results = r
            if(this.results.length == 1 && this.results[0].fecha.toISOString().substring(0,10) == fecha) {
                return true 
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // solo final
    async test_2() {
        this.results = []
        fecha = "2022-05-05"
        return crud.readInformes(undefined,fecha).then(r=>{
            this.results = r
            if(this.results.length == 1 && this.results[0].fecha.toISOString().substring(0,10) == fecha) {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // crea/actualiza contenido
    async test_3() {
        this.results = []
        return crud.createContenido(internal.informe_semanal_test.fecha,internal.informe_semanal_test.contenido).then(r=>{
            this.results = r
            if(this.results.length == 6) {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // delete informe by fecha and restore
    async test_4() {
        fecha = "2022-05-05"
        this.results = {}
        return crud.deleteInforme(fecha).then(r=>{
            this.results = r
            if (this.results.fecha.toISOString().substring(0,10) == fecha) {
                return test_6() // restore informe
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // read contenido no params
    async test_16() {
        this.results = {}
        return crud.readContenido().then(r=>{
            this.results = r
            if(this.results.length && this.results[0].fecha.toISOString().substring(0,10) == "2022-05-06") {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // read contenido fecha
    async test_17() {
        this.results = {}
        return crud.readContenido("2022-05-05").then(r=>{
            this.results = r
            if(this.results.length && this.results[0].fecha.toISOString().substring(0,10) == "2022-05-05") {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // read contenido region_id
    async test_18() {
        this.results = {}
        return crud.readContenido(undefined, "parana_delta").then(r=>{
            this.results = r
            if(this.results.length && this.results[0].fecha.toISOString().substring(0,10) == "2022-05-06" && this.results[0].region_id == "parana_delta") {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // read contenido fecha region_id
    async test_19() {
        this.results = {}
        return crud.readContenido("2022-05-05","parana_delta").then(r=>{
            this.results = r
            if(this.results.length && this.results[0].fecha.toISOString().substring(0,10) == "2022-05-05"  && this.results[0].region_id == "parana_delta") {
                return true
            } else {
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // delete contenido by fecha + region_id
    async test_20() {
        this.results = {}
        return crud.deleteContenido(internal.informe_semanal_test.fecha,["parana_delta","parana_alto"]).then(r=>{
            this.results = r
            if(this.results.length == 2 && this.results[0].fecha.toISOString().substring(0,10) == internal.informe_semanal_test.fecha) {
                return this.test_3() // restore
            } else {
                this.test_3()
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

    // delete contenido by fecha (all regiones)
    async test_21() {
        this.results = {}
        return crud.deleteContenido(internal.informe_semanal_test.fecha).then(r=>{
            this.results = r
            if(this.results.length > 2 && this.results[0].fecha.toISOString().substring(0,10) == internal.informe_semanal_test.fecha) {
                return this.test_3() // restore
            } else {
                this.test_3()
                return false
            }
        }).catch(e=>{
            console.error(e)
            this.errors.push(e.toString())
            return false
        })
    }

}

internal.informe_semanal_test = {
    "fecha": "2022-05-20",
    "texto_general": "informe de prueba con tramos",
    "contenido": [
        {
            "region_id": "parana_alto",
            "texto": "contenido parana_alto"
        },
        {
            "region_id": "parana_bajo",
            "texto": "contenido parana_bajo",
            "tramos": [
                {"tramo_id": "parana_delta", "texto": "texto tramo parana delta"}
            ]
        },
        {
            "region_id": "parana_medio",
            "texto": "contenido parana_medio"
        },
        {
            "region_id": "paraguay",
            "texto": "contenido paraguay",
            "tramos": [
                {"tramo_id": "paraguay_bajo", "texto": "texto tramo paraguay bajo"},
                {"tramo_id": "paraguay_medio", "texto": "texto tramo paraguay medio"},
                {"tramo_id": "paraguay_alto", "texto": "texto tramo paraguay alto"} 
            ]
        }
    ]
}


module.exports = internal
