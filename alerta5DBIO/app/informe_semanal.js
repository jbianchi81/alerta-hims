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
const { client } = require('./wmlclient');

internal.informe_semanal = class {
    constructor(fecha,texto_general,contenido) {
        this.fecha = fecha // new Date(fecha)
        this.texto_general = texto_general.toString()
        if(contenido) {
            this.contenido = contenido.map(item=>{
                return {
                    region_id: item.region_id.toString(),
                    texto: item.texto.toString()
                }
            })
        }
    }
    setContenido(contenido) {
        this.contenido = contenido.map(item=>{
            return {
                region_id: item.region_id.toString(),
                texto: item.texto.toString()
            }
        })
    }
}

internal.crud = class {
	constructor(pool,config){
        this.pool = pool
		if(config) {
			this.config = config
			if(config.database) {
				this.dbConnectionString = "host=" + config.database.host + " user=" + config.database.user + " dbname=" + config.database.database + " password=" + config.database.password + " port=" + config.database.port
			}
            if(!this.config.informe_semanal) {
                this.config.informe_semanal = {
                    informes_limit: 100
                }
            } else if (!this.config.informe_semanal.informes_limit) {
                this.config.informe_semanal.informes_limit = 100
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
    async deleteRegiones(id) {
        var result
        if(id) {
            if(Array.isArray(id)) {
                for (var i in id) {
                    if(/[';]/.test(id[i])) {
                        throw("Invalid characters in id filter")
                    }
                }
                var id_list = id.map(i=>`'${i.toString()}'`).join(",")
                try {
                    result = await this.pool.query(`DELETE FROM informe_semanal_regiones WHERE id IN (${id_list}) RETURNING *`)
                } catch(e) {
                    throw(e)
                }
            } else {
                try {
                    result = await this.pool.query("DELETE FROM informe_semanal_regiones WHERE id=$1  RETURNING *",[id])
                } catch(e) {
                    throw(e)
                }
            }
        } else {
            try {
                result = await this.pool.query("DELETE FROM informe_semanal_regiones RETURNING *")
            } catch(e) {
                throw(e)
            }
        }
        return result.rows
    }
    async createInforme(fecha,texto_general,contenido) {
        var result
        var client
        const abort = err =>{
            try {
                client.query("ROLLBACK")
            } catch(e) {
                client.end()
                throw(e)
            }
            client.end()
            throw(err)
        }
        try {
            client = await this.pool.connect()
        } catch(e) {
            throw(e)
        }
        try {
            await client.query("BEGIN")
            result = await client.query("INSERT INTO informe_semanal (fecha,texto_general) VALUES ($1,$2) ON CONFLICT (fecha) DO UPDATE SET texto_general=EXCLUDED.texto_general RETURNING *",[fecha, texto_general])
        } catch(e) {
            abort(e)
        }
        if(!result.rows.length) {
            throw(`createInforme: nothing inserted`)
        }
        const informe_semanal = new internal.informe_semanal(result.rows[0].fecha,result.rows[0].texto_general)
            if(contenido) {
            try {
                var inserted_contenido = await this.createContenido(informe_semanal.fecha,contenido,client)
                informe_semanal.setContenido(inserted_contenido)
            } catch(e) {
                abort(e)
            }
        }
        try {
            await client.query("COMMIT")
            await client.end()
        } catch(e) {
            throw(e)
        }
        return informe_semanal
    }
    async readInforme(fecha) {
        var result
        if(fecha) {
            try {
                result = await this.pool.query("SELECT informe_semanal.fecha, texto_general, json_agg(json_build_object('region_id', region_id,'texto', texto)) filter (where region_id is not null) AS contenido FROM informe_semanal LEFT OUTER JOIN informe_semanal_contenido ON (informe_semanal.fecha=informe_semanal_contenido.fecha) WHERE informe_semanal.fecha=$1::date GROUP BY informe_semanal.fecha",[fecha])
            } catch(e) {
                throw(e)
            }
        } else {
            try {
                result = await this.pool.query("WITH last AS (SELECT max(fecha) as fecha FROM informe_semanal) SELECT informe_semanal.fecha, texto_general, json_agg(json_build_object('region_id', region_id,'texto', texto)) filter (where region_id is not null) AS contenido FROM informe_semanal JOIN last ON (informe_semanal.fecha = last.fecha) LEFT OUTER JOIN informe_semanal_contenido ON (informe_semanal.fecha=informe_semanal_contenido.fecha) GROUP BY informe_semanal.fecha")
            } catch(e) {
                throw(e)
            }
        }
        if(!result.rows.length) {
            throw("readInforme: nothing found")
        }
        return result.rows[0]
    }
    async readInformes(fecha_inicio,fecha_fin) {
        var result
        if(fecha_inicio && fecha_fin) {
            try {
                result = await this.pool.query("SELECT informe_semanal.fecha, texto_general, json_agg(json_build_object('region_id', region_id,'texto', texto)) filter (where region_id is not null) AS contenido FROM informe_semanal LEFT OUTER JOIN informe_semanal_contenido ON (informe_semanal.fecha=informe_semanal_contenido.fecha) WHERE informe_semanal.fecha BETWEEN $1 AND $2 GROUP BY informe_semanal.fecha ORDER BY informe_semanal.fecha LIMIT $3",[fecha_inicio,fecha_fin, this.config.informe_semanal.informes_limit])
            } catch(e) {
                throw(e)
            }
        } else if(fecha_inicio) {
            try {
                result = await this.pool.query("SELECT informe_semanal.fecha, texto_general, json_agg(json_build_object('region_id', region_id,'texto', texto)) filter (where region_id is not null) AS contenido FROM informe_semanal LEFT OUTER JOIN informe_semanal_contenido ON (informe_semanal.fecha=informe_semanal_contenido.fecha) WHERE informe_semanal.fecha >= $1 GROUP BY informe_semanal.fecha ORDER BY informe_semanal.fecha LIMIT $2",[fecha_inicio, this.config.informe_semanal.informes_limit])
            } catch(e) {
                throw(e)
            }
        } else if(fecha_fin) {
            try {
                result = await this.pool.query("SELECT informe_semanal.fecha, texto_general, json_agg(json_build_object('region_id', region_id,'texto', texto)) filter (where region_id is not null) AS contenido FROM informe_semanal LEFT OUTER JOIN informe_semanal_contenido ON (informe_semanal.fecha=informe_semanal_contenido.fecha) WHERE informe_semanal.fecha <= $1 GROUP BY informe_semanal.fecha ORDER BY informe_semanal.fecha LIMIT $2",[fecha_fin,this.config.informe_semanal.informes_limit])
            } catch(e) {
                throw(e)
            }
        } else {
            try {
                result = await this.pool.query("SELECT informe_semanal.fecha, texto_general, json_agg(json_build_object('region_id', region_id,'texto', texto)) as contenido FROM informe_semanal LEFT OUTER JOIN informe_semanal_contenido ON (informe_semanal.fecha=informe_semanal_contenido.fecha) GROUP BY informe_semanal.fecha ORDER BY informe_semanal.fecha LIMIT $1",[this.config.informe_semanal.informes_limit])
            } catch(e) {
                throw(e)
            }
        }
        return result.rows
    }
    
    async deleteInforme(fecha) {
        var result
        if(!fecha) { // DELETE last
            try {
                result = await this.pool.query("WITH last AS (SELECT max(fecha) as fecha FROM informe_semanal)DELETE FROM informe_semanal USING last WHERE informe_semanal.fecha=last.fecha RETURNING *",[fecha])
            } catch(e) {
                throw(e)
            }
        } else {
            try {
                result = await this.pool.query("DELETE FROM informe_semanal WHERE fecha=$1::date RETURNING *",[fecha])
            } catch(e) {
                throw(e)
            }
        }
        if(!result.rows.length) {
            throw("deleteInforme: nothing deleted")
        }
        return result.rows[0]
    }

    async deleteInformes(fecha_inicio,fecha_fin) {
        // TO DO
    }

    async createContenido(fecha,contenido,client) {
        var flag_commit_at_end = false
        if(!client) {
            flag_commit_at_end = true
            try {
                client = await this.pool.connect()
                await client.query("BEGIN")
            } catch(e) {
                throw(e)
            }
        }
        const abort = err =>{
            try {
                client.query("ROLLBACK")
            } catch(e) {
                client.end()
                throw(e)
            }
            client.end()
            throw(err)
        }
        if(!Array.isArray(contenido)) {
            contenido = [contenido]
        }
        var inserted_contenido = []
        for(var i in contenido) {
            try {
                var inserted = await client.query("INSERT INTO informe_semanal_contenido (fecha,region_id,texto) VALUES ($1::date,$2,$3) ON CONFLICT (fecha,region_id) DO UPDATE SET texto=EXCLUDED.texto RETURNING *",[fecha,contenido[i].region_id,contenido[i].texto])
            } catch(e) {
                abort(e)
            }
            if(!inserted.rows.length) {
                abort(`createContenido: row ${i}: nothing inserted`)
            }
            inserted_contenido.push(inserted.rows[0])
        }
        if(flag_commit_at_end) {
            try {
                await client.query("COMMIT")
                await client.end()
            } catch(e) {
                throw(e)
            }
        }
        return inserted_contenido
    }

}

module.exports = internal
