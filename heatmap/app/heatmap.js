'use strict'


const internal = {}

// returns 1d observation density vector
internal.heatmap = class {
    constructor(pool)  {
        this.pool=pool
    }
    obsDensityVector (timestart,timeend,dt="1 day",filter={},options={}) {
        if(!timestart) {
            timestart = new Date()
            timestart = new Date(timestart.getFullYear(),timestart.getMonth(),timestart.getDay())
            timestart.setMonth(timestart.getMonth() - 1)
        }
        if(!timeend) {
            timeend = new Date()
        }
        if(new Date(timestart).toString() == "Invalid Date" || new Date(timeend).toString() == "Invalid Date" || !dt) {
            return Promise.reject("Missing or bad parameters: timestart,timeend,dt")
        }
        var valid_filters= {"var_id": {table:"series",type:"integer"},"tabla_id":{table:"redes",type:"string"},"unit_id":{table:"series",type:"integer"},"estacion_id":{table:"series",type:"integer"},"proc_id":{table:"series",type:"integer"}}
        var count_filters = 0
        Object.keys(valid_filters).forEach(key=>{
            if(filter[key]) {
                count_filters++
            }
        })
        // console.log({count_filters:count_filters})
        if(count_filters == 0) {
            return Promise.reject("Missing at least one filter: var_id, proc_id, unit_id, tabla_id, estacion_id")
        }
        var filter_string = control_filter2(valid_filters,filter)
        var query  = "WITH ts as (\
            SELECT generate_series($1::timestamp,$2::timestamp,$3::interval) t\
            ),\
            tseries as (\
            SELECT t,\
                   row_number() OVER (order by t) x\
            FROM ts\
            ),\
			obs AS (\
			SELECT observaciones.timestart\
			FROM observaciones,series,estaciones,redes\
            WHERE observaciones.timestart >= $1::timestamp\
            AND observaciones.timestart < $2::timestamp\
            AND observaciones.series_id=series.id\
            AND series.estacion_id=estaciones.unid\
            AND estaciones.tabla=redes.tabla_id\
            " + filter_string + ")\
            SELECT tseries.x,\
				   tseries.t,\
                   count(obs.timestart)\
            FROM tseries\
			LEFT JOIN obs ON (obs.timestart >= tseries.t\
            AND obs.timestart < tseries.t+$3::interval)\
            GROUP BY x,t\
            ORDER BY x;"
		var query_string = pasteIntoSQLQuery(query,[timestart,timeend,dt])
        console.log(query_string)
        return this.pool.query(query_string) // query,[timestart,timeend,dt])
        .then(result=>{
            if (!result.rows) {
                throw("Query error")
            }
            var values = result.rows.map(row=>row.count)
			if(options.format && options.format == "tuples") {
				return result.rows.map(row=>{
					return [row.x, row.t, row.count]
				})
			}
            if(options.include_timestamps) {
                return {
                    values: values,
                    timestamps: result.rows.map(row=>row.t)
                }
            } else {
                return {
                    values: values
                }
            }
        })
    }
	stationDensityVector (timestart,timeend,dt="1 day",filter={},options={}) {
        if(!timestart) {
            timestart = new Date()
            timestart = new Date(timestart.getFullYear(),timestart.getMonth(),timestart.getDay())
            timestart.setMonth(timestart.getMonth() - 1)
        }
        if(!timeend) {
            timeend = new Date()
        }
        if(new Date(timestart).toString() == "Invalid Date" || new Date(timeend).toString() == "Invalid Date" || !dt) {
            return Promise.reject("Missing or bad parameters: timestart,timeend,dt")
        }
        var valid_filters= {"var_id": {table:"series",type:"integer"},"tabla_id":{table:"redes",type:"string"},"unit_id":{table:"series",type:"integer"},"estacion_id":{table:"series",type:"integer"},"proc_id":{table:"series",type:"integer"}}
        var count_filters = 0
        Object.keys(valid_filters).forEach(key=>{
            if(filter[key]) {
                count_filters++
            }
        })
        // console.log({count_filters:count_filters})
        if(count_filters == 0) {
            return Promise.reject("Missing at least one filter: var_id, proc_id, unit_id, tabla_id, estacion_id")
        }
        var filter_string = control_filter2(valid_filters,filter)
        var query  = "WITH ts as (\
            SELECT generate_series($1::timestamp,$2::timestamp,$3::interval) t\
            ),\
            tseries as (\
            SELECT t,\
                   row_number() OVER (order by t) x\
            FROM ts\
            ),\
			obs AS (\
			SELECT observaciones.timestart,\
			       series.estacion_id\
			FROM observaciones,series,estaciones,redes\
            WHERE observaciones.timestart >= $1::timestamp\
            AND observaciones.timestart < $2::timestamp\
            AND observaciones.series_id=series.id\
            AND series.estacion_id=estaciones.unid\
            AND estaciones.tabla=redes.tabla_id\
            " + filter_string + ")\
            SELECT tseries.x,\
				   tseries.t,\
                   count(DISTINCT obs.estacion_id)\
            FROM tseries\
			LEFT JOIN obs ON (obs.timestart >= tseries.t\
            AND obs.timestart < tseries.t+$3::interval)\
            GROUP BY x,t\
            ORDER BY x;"
		var query_string = pasteIntoSQLQuery(query,[timestart,timeend,dt])
        // console.log(query_string)
        return this.pool.query(query_string) // query,[timestart,timeend,dt])
        .then(result=>{
            if (!result.rows) {
                throw("Query error")
            }
            var values = result.rows.map(row=>row.count)
			if(options.format && options.format == "tuples") {
				return result.rows.map(row=>{
					return [row.x, row.t, row.count]
				})
			}
            if(options.include_timestamps) {
                return {
                    values: values,
                    timestamps: result.rows.map(row=>row.t)
                }
            } else {
                return {
                    values: values
                }
            }
        })
    }
	pronoDensityVector (timestart,timeend,dt="1 day",filter={},options={}) {
		if(!timestart) {
			timestart = new Date()
			timestart = new Date(timestart.getFullYear(),timestart.getMonth(),timestart.getDay())
			timestart.setMonth(timestart.getMonth() - 1)
		}
		if(!timeend) {
			timeend = new Date()
			timeend.setDate(timeend.getDate()+14)
		}
		if(new Date(timestart).toString() == "Invalid Date" || new Date(timeend).toString() == "Invalid Date" || !dt) {
			return Promise.reject("Missing or bad parameters: timestart,timeend,dt")
		}
		var valid_filters= {"var_id": {table:"series",type:"integer"},"tabla_id":{table:"redes",type:"string"},"unit_id":{table:"series",type:"integer"},"estacion_id":{table:"series",type:"integer"},"proc_id":{table:"series",type:"integer"},cal_id:{table:"corridas_last",type:"integer"}}
		var count_filters = 0
		Object.keys(valid_filters).forEach(key=>{
			if(filter[key]) {
				count_filters++
			}
		})
		// console.log({count_filters:count_filters})
		if(count_filters == 0) {
			return Promise.reject("Missing at least one filter: var_id, proc_id, unit_id, tabla_id, estacion_id, cal_id")
		}
		var filter_string = control_filter2(valid_filters,filter)
		var query  = "WITH ts as (\
			SELECT generate_series($1::timestamp,$2::timestamp,$3::interval) t\
			),\
			tseries as (\
			SELECT t,\
				   row_number() OVER (order by t) x\
			FROM ts\
			),\
			prono AS (\
			SELECT pronosticos.timestart,\
				   corridas_last.id\
			FROM pronosticos,corridas_last,series,estaciones,redes\
			WHERE pronosticos.timestart >= $1::timestamp\
			AND pronosticos.timestart < $2::timestamp\
			AND pronosticos.series_id = series.id\
			AND pronosticos.cor_id = corridas_last.id\
			AND series.estacion_id = estaciones.unid\
			AND estaciones.tabla = redes.tabla_id\
			" + filter_string + ")\
			SELECT tseries.x,\
				   tseries.t,\
				   count(prono.timestart)\
			FROM tseries\
			LEFT JOIN prono ON (prono.timestart >= tseries.t\
			AND prono.timestart < tseries.t+$3::interval)\
			GROUP BY x,t\
			ORDER BY x;"
		var query_string = pasteIntoSQLQuery(query,[timestart,timeend,dt])
		console.log(query_string)
		return this.pool.query(query_string) // query,[timestart,timeend,dt])
		.then(result=>{
			if (!result.rows) {
				throw("Query error")
			}
			var values = result.rows.map(row=>row.count)
			if(options.format && options.format == "tuples") {
				return result.rows.map(row=>{
					return [row.x, row.t, row.count]
				})
			}
			if(options.include_timestamps) {
				return {
					values: values,
					timestamps: result.rows.map(row=>row.t)
				}
			} else {
				return {
					values: values
				}
			}
		})
	}
}
// function getStationDensityVector() {}

//aux
var control_filter2 = function (valid_filters, filter, default_table) {
	// valid_filters = { column1: { table: "table_name", type: "data_type", required: bool}, ... }  
	// filter = { column1: "value1", column2: "value2", ....}
	// default_table = "table"
	var filter_string = " "
	var control_flag = 0
	Object.keys(valid_filters).forEach(key=>{
		var fullkey = (valid_filters[key].table) ? "\"" + valid_filters[key].table + "\".\"" + key + "\"" : (default_table) ? "\"" + default_table + "\".\"" + key + "\"" : "\"" + key + "\""
		if(typeof filter[key] != "undefined" && filter[key] !== null && filter[key] != "") {
			if(/[';]/.test(filter[key])) {
				console.error("Invalid filter value")
				control_flag++
			}
			if(valid_filters[key].type == "regex_string") {
				var regex = filter[key].replace('\\','\\\\')
				filter_string += " AND " + fullkey  + " ~* '" + filter[key] + "'"
			} else if(valid_filters[key].type == "string") {
				filter_string += " AND " + fullkey + "='" + filter[key] + "'"
			} else if (valid_filters[key].type == "boolean") {
				var boolean = (/^[yYtTvVsS1]/.test(filter[key])) ? "true" : "false"
				filter_string += " AND "+ fullkey + "=" + boolean + ""
			} else if (valid_filters[key].type == "boolean_only_true") {
				if (/^[yYtTvVsS1]/.test(filter[key])) {
					filter_string += " AND "+ fullkey + "=true"
				} 
			} else if (valid_filters[key].type == "boolean_only_false") {
				if (!/^[yYtTvVsS1]/.test(filter[key])) {
					filter_string += " AND "+ fullkey + "=false"
				} 
			} else if (valid_filters[key].type == "geometry") {
				if(! filter[key] instanceof internal.geometry) {
					console.error("Invalid geometry object")
					control_flag++
				} else {
					filter_string += "  AND ST_Distance(st_transform(" + fullkey + ",4326),st_transform(" + filter[key].toSQL() + ",4326)) < 0.001" 
				}
			} else if (valid_filters[key].type == "timestart") {
				var offset = (new Date().getTimezoneOffset() * 60 * 1000) * -1
				if(filter[key] instanceof Date) {
					var ldate = new Date(filter[key].getTime()  + offset).toISOString()
					filter_string += " AND " + fullkey + ">='" + ldate + "'"
				} else {
					var d = new Date(filter[key])
					var ldate = new Date(d.getTime()  + offset).toISOString()
					filter_string += " AND " + fullkey + ">='" + ldate + "'"
				}
			} else if (valid_filters[key].type == "timeend") {
				var offset = (new Date().getTimezoneOffset() * 60 * 1000) * -1
				if(filter[key] instanceof Date) {
					var ldate = new Date(filter[key].getTime()  + offset).toISOString()
					filter_string += " AND " + fullkey + "<='" + ldate + "'"
				} else {
					var d = new Date(filter[key])
					var ldate = new Date(d.getTime()  + offset).toISOString()
					filter_string += " AND " + fullkey + "<='" + ldate + "'"
				}
			} else if (valid_filters[key].type == "numeric_interval") {
				if(Array.isArray(filter[key])) {
					if(filter[key].length < 2) {
						console.error("numeric_interval debe ser de al menos 2 valores")
						control_flag++
					} else {
						filter_string += " AND " + fullkey + ">=" + parseFloat(filter[key][0]) + " AND " + key + "<=" + parseFloat(filter[key][1])
					}
				} else {
					 filter_string += " AND " + fullkey + "=" + parseFloat(filter[key])
				}
			} else {
				if(Array.isArray(filter[key])) {
					filter_string += " AND "+ fullkey + " IN (" + filter[key].join(",") + ")"
				} else {
					filter_string += " AND "+ fullkey + "=" + filter[key] + ""
				}
			}
		} else if (valid_filters[key].required) {
			console.error("Falta valor para filtro obligatorio " + key)
			control_flag++
		}
	})
	if(control_flag > 0) {
		return null
	} else {
		return filter_string
	}
}

var pasteIntoSQLQuery = function(query,params) {
	for(var i in params) {
		var value
		switch(typeof params[i]) {
			case "string":
				value = "'" + params[i] + "'"
				break;
			case "number":
				value = params[i]
				break
			case "object":
				if(params[i] instanceof Date) {
					value = "'" + params[i].toISOString() + "'::timestamptz::timestamp"
				} else if(params[i] instanceof Array) {
					value = "{" + params[i].map(v=> (typeof v == "number") ? v : "'" + v.toString() + "'").join(",") + "}"
				} else {
					if(params[i] === null) {
						value = "NULL"
					} else {
						value = params[i].toString()
					}
				}
				break;
			case "undefined": 
				value = "NULL"
				break;
			default:
				value = "'" + params[i].toString() + "'"
		}
		var I = parseInt(i)+1
		var placeholder = "\\$" + I.toString()
		// console.log({placeholder:placeholder,value:value})
		query = query.replace(new RegExp(placeholder,"g"), value)
	}
	return query
}

module.exports = internal
