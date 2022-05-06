'use strict'

const internal = {};
// var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf
// var fs =require("promise-fs")
// const { exec, spawn } = require('child_process');
// const pexec = require('child-process-promise').exec;
// const ogr2ogr = require("ogr2ogr")
var path = require('path');
// const validFilename = require('valid-filename');
const config = require('config');


internal.crud = class {
	constructor(pool,config){
        this.pool = pool
		if(config) {
			this.config = config
			if(config.database) {
				this.dbConnectionString = "host=" + config.database.host + " user=" + config.database.user + " dbname=" + config.database.database + " password=" + config.database.password + " port=" + config.database.port
			}
		}
	}    
    async createRegionesFromGeoJson(geojson) {
        if(!geojson.features) {
            throw("Missing features")
        }
        const results = []
        for (var i in geojson.features) {
            const region = {}
            region.id = geojson.features[i].properties.id
            region.nombre = geojson.features[i].properties.nombre
            region.geom = JSON.stringify(geojson.features[i].geometry)
            try {
                const result = await this.createRegion(region) 
                results.push(result)
            } catch(e) {
                console.error(e.toString())
            }
        }
        if(!results.length) {
            throw("No rows inserted")
        }
        return results
    }
    async createRegion(region) {
        return this.pool.query("INSERT INTO informe_semanal_regiones (id,nombre,geom) VALUES ($1,$2,st_GeomFromGeoJSON($3)) ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, geom=EXCLUDED.geom RETURNING *",[region.id,region.nombre,region.geom])
        .then(results=>{
            if(!results.rows.length) {
                throw("Nothing inserted")
            }
            return results.rows[0]
        })
    }
    async readRegiones(id,geojson=true) {
        var result
        if(id) {
            try {
                result = await this.pool.query("SELECT id, nombre, st_asgeojson(geom) geom FROM informe_semanal_regiones WHERE id=$1",[id])
            } catch(e) {
                throw(e)
            }
        } else {
            try {
                result = await this.pool.query("SELECT id, nombre, st_asgeojson(geom) geom FROM informe_semanal_regiones")
            } catch(e) {
                throw(e)
            }
        }
        if(!geojson) {
            return result.rows.map(r=>{
                return {
                    id: r.id,
                    nombre: r.nombre
                }
            })
        }
        return {
            "type": "FeatureCollection",
            "name": "informe_semanal_regiones",
            "features": result.rows.map(r=>{
                return {
                    type: "Feature",
                    properties: {
                        id: r.id,
                        nombre: r.nombre
                    },
                    geometry: JSON.parse(r.geom)
                }
            })
        }
    }
    async createInforme(fecha,texto_general) {
        return this.pool.query("INSERT INTO informe_semanal (fecha,texto_general) VALUES ($1,$2) ON CONFLICT (fecha) DO UPDATE SET texto_general=EXCLUDED.texto_general RETURNING *",[fecha, texto_general])
        .then(results=>{
            if(!results.rows.length) {
                throw("Nothing inserted")
            }
            return results.rows[0]
        })
    }
}

module.exports = internal
