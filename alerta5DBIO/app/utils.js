'use strict'

const internal = {}

internal.control_filter = function (valid_filters, filter, tablename) {
	var filter_string = " "
	var control_flag = 0
	Object.keys(valid_filters).forEach(key=>{
		var fullkey = (tablename) ? "\"" + tablename + "\".\"" + key + "\"" : "\"" + key + "\""
		if(filter[key]) {
			if(/[';]/.test(filter[key])) {
				console.error("Invalid filter value")
				control_flag++
			}
			if(valid_filters[key] == "regex_string") {
				var regex = filter[key].replace('\\','\\\\')
				filter_string += " AND " + fullkey  + " ~* '" + filter[key] + "'"
			} else if(valid_filters[key] == "string") {
				filter_string += " AND "+ fullkey + "='" + filter[key] + "'"
			} else if (valid_filters[key] == "boolean") {
				var boolean = (/^[yYtTvVsS1]/.test(filter[key])) ? "true" : "false"
				filter_string += " AND "+ fullkey + "=" + boolean + ""
			} else if (valid_filters[key] == "boolean_only_true") {
				if (/^[yYtTvVsS1]/.test(filter[key])) {
					filter_string += " AND "+ fullkey + "=true"
				} 
			} else if (valid_filters[key] == "boolean_only_false") {
				if (!/^[yYtTvVsS1]/.test(filter[key])) {
					filter_string += " AND "+ fullkey + "=false"
				} 
			} else if (valid_filters[key] == "geometry") {
				if(! filter[key] instanceof internal.geometry) {
					console.error("Invalid geometry object")
					control_flag++
				} else {
					filter_string += "  AND ST_Distance(st_transform(" + fullkey + ",4326),st_transform(" + filter[key].toSQL() + ",4326)) < 0.001" 
				}
			} else if (valid_filters[key] == "timestart") {
				var offset = (new Date().getTimezoneOffset() * 60 * 1000) * -1
				if(filter[key] instanceof Date) {
					var ldate = new Date(filter[key].getTime()  + offset).toISOString()
					filter_string += " AND " + fullkey + ">='" + ldate + "'"
				} else {
					var d = new Date(filter[key])
					var ldate = new Date(d.getTime()  + offset).toISOString()
					filter_string += " AND " + fullkey + ">='" + ldate + "'"
				}
			} else if (valid_filters[key] == "timeend") {
				var offset = (new Date().getTimezoneOffset() * 60 * 1000) * -1
				if(filter[key] instanceof Date) {
					var ldate = new Date(filter[key].getTime()  + offset).toISOString()
					filter_string += " AND " + fullkey + "<='" + ldate + "'"
				} else {
					var d = new Date(filter[key])
					var ldate = new Date(d.getTime()  + offset).toISOString()
					filter_string += " AND " + fullkey + "<='" + ldate + "'"
				}
			} else if (valid_filters[key] == "numeric_interval") {
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
		}
	})
	if(control_flag > 0) {
		return null
	} else {
		return filter_string
	}
}

internal.control_filter2 = function (valid_filters, filter, default_table) {
	// valid_filters = { column1: { table: "table_name", type: "data_type", required: bool}, ... }  
	// filter = { column1: "value1", column2: "value2", ....}
	// default_table = "table"
	var filter_string = " "
	var control_flag = 0
	Object.keys(valid_filters).forEach(key=>{
		var fullkey = (valid_filters[key].table) ? "\"" + valid_filters[key].table + "\".\"" + key + "\"" : (default_table) ? "\"" + default_table + "\".\"" + key + "\"" : "\"" + key + "\""
		if(typeof filter[key] != "undefined" && filter[key] !== null) {
			if(/[';]/.test(filter[key])) {
				console.error("Invalid filter value")
				control_flag++
			}
			if(valid_filters[key].type == "regex_string") {
				var regex = filter[key].replace('\\','\\\\')
				filter_string += " AND " + fullkey  + " ~* '" + filter[key] + "'"
			} else if(valid_filters[key].type == "string") {
				filter_string += " AND "+ fullkey + "='" + filter[key] + "'"
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
			} else if (valid_filters[key].type == "date") {
                let d
				if(filter[key] instanceof Date) {
                    d = filter[key]
                } else {
                    d = new Date(filter[key])
                }
				filter_string += " AND " + fullkey + "='" + d.toISOString() + "'::timestamptz"
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
            } else if (valid_filters[key].type == "integer") {
                if(Array.isArray(filter[key])) {
                    var values = filter[key].map(v=>parseInt(v)).filter(v=>v.toString()!="NaN")
                    if(!values.length) {
                        console.error("Invalid integer")
                        control_flag++
                    } else {
    					filter_string += " AND "+ fullkey + " IN (" + values.join(",") + ")"
                    }
				} else {
                    var value = parseInt(filter[key])
                    if(value.toString() == "NaN") {
                        console.error("Invalid integer")
                        control_flag++
                    } else {
                        filter_string += " AND "+ fullkey + "=" + value + ""
                    }
				}
            } else if (valid_filters[key].type == "number" || valid_filters[key].type == "float") {
                if(Array.isArray(filter[key])) {
                    var values = filter[key].map(v=>parseFloat(v)).filter(v=>v.toString()!="NaN")
                    if(!values.length) {
                        console.error("Invalid float")
                        control_flag++
                    } else {
                        filter_string += " AND "+ fullkey + " IN (" + values.join(",") + ")"
                    }
                } else {
                    var value = parseFloat(filter[key])
                    if(value.toString() == "NaN") {
                        console.error("Invalid integer")
                        control_flag++
                    } else {
                        filter_string += " AND "+ fullkey + "=" + value + ""
                    }
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

internal.pasteIntoSQLQuery = function pasteIntoSQLQuery(query,params) {
	for(var i=params.length-1;i>=0;i--) {
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
				} else if(params[i] === null) {
					value = "NULL"
				} else if (params[i].constructor && params[i].constructor.name == 'PostgresInterval') {
						value = "'" + params[i].toPostgres() + "'::interval"
				} else {
					value = params[i].toString()
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