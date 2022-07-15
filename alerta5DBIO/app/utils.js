'use strict'

const internal = {}
const timeSteps = require('./timeSteps')
const Geometry = require('./CRUD').geometry
var Validator = require('jsonschema').Validator;
const fs = require('fs')
var apidoc = JSON.parse(fs.readFileSync('public/json/apidocs.json','utf-8'))
var schemas = apidoc.components.schemas
traverse(schemas,changeRef)
var g = new Validator();
for(var key in schemas) {
    g.addSchema(schemas[key],"/" + key)
}

internal.validate_with_model = function (instance,model) {
	if(!schemas.hasOwnProperty(model)) {
		throw("model " + model + " no encontrado en schema")
	}
	var result = g.validate(instance,schemas[model])
	if(result.errors.length) {
		console.error(result.toString())
		return { "valid": false, "reason": result.toString() } 
	}
	return { "valid": true}
}

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
			} else if (valid_filters[key].type == "numeric" || valid_filters[key].type == "number" || valid_filters[key].type == "float") {
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
						console.error("Invalid number")
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
		}
	})
	if(control_flag > 0) {
		return null
	} else {
		return filter_string
	}
}

internal.control_filter2 = function (valid_filters, filter, default_table) {
	// valid_filters = { column1: { table: "table_name", type: "data_type", required: bool, column: "column_name"}, ... }  
	// filter = { column1: "value1", column2: "value2", ....}
	// default_table = "table"
	var filter_string = " "
	var control_flag = 0
	Object.keys(valid_filters).forEach(key=>{
		var table_prefix = (valid_filters[key].table) ? '"' + valid_filters[key].table + '".' :  (default_table) ? '"' + default_table + '".' : ""
		var column_name = (valid_filters[key].column) ? '"' + valid_filters[key].column + '"' : '"' + key + '"'
		var fullkey = table_prefix + column_name
		if(typeof filter[key] != "undefined" && filter[key] !== null) {
			if(/[';]/.test(filter[key])) {
				console.error("Invalid filter value")
				control_flag++
			}
			if(valid_filters[key].type == "regex_string") {
				var regex = filter[key].replace('\\','\\\\')
				filter_string += " AND " + fullkey  + " ~* '" + filter[key] + "'"
			} else if(valid_filters[key].type == "string") {
				if(valid_filters[key].case_insensitive) {
					filter_string += ` AND lower(${fullkey})=lower('${filter[key]}')`
				} else {
					filter_string += " AND "+ fullkey + "='" + filter[key] + "'"
				}
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
			} else if(valid_filters[key].type == "numeric_min") {
				filter_string += " AND " + fullkey + ">=" + parseFloat(filter[key])
			} else if(valid_filters[key].type == "numeric_max") {
				filter_string += " AND " + fullkey + "<=" + parseFloat(filter[key])
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

internal.build_group_by_clause = function (valid_columns,columns=[],default_table) {
	// valid_columns = { "column_name_or_alias": {"column":"column_name", "table": "table_name" (optional), "extract":"date_part" (optional)},...}
	// columns = ["column_name_or_alias1","column_name_or_alias2",...]
	// default_table = "table_name"
	// RETURNS {select:array,group_by:array,order_by:array}

	var select_arr = []
	var group_by_arr = []
	var order_by_arr = []
	var control_flag = 0
	var columns
	for(var key of Object.keys(valid_columns)) {
		const c = valid_columns[key]
		if(!columns.includes(key)) {
			continue
		}
		var name = (c.column) ? c.column : key
		var g = (c.table) ? "\"" + c.table + "\".\"" + name + "\"" : (default_table) ? "\"" + default_table + "\".\"" + name + "\"" : "\"" + name + "\""
		if(c.date_part) {
			if(c.type) {
				g += "::" + c.type
			} else {
				g += "::timestamp"
			}
			g = "date_part('" + c.date_part + "'," + g + ")"
		} else if(c.date_trunc) {
			if(c.type) {
				g += "::" + c.type
			} else {
				g += "::timestamp"
			}
			g = "date_trunc('" + c.date_trunc + "'," + g + ")"
		} else {
			if(c.type) {
				g += "::" + c.type
			}
		}
		group_by_arr.push(g)
		var s =  g + ' AS "' + key + '"'
		select_arr.push(s)
		order_by_arr.push('"' + key + '"')
	}
	if(!select_arr.length) {
		return
	}
	return {select: select_arr, group_by: group_by_arr, order_by: order_by_arr}
}	

internal.pasteIntoSQLQuery = function (query,params) {
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
					value = "'{" + params[i].join(",") + "}'" // .map(v=> (typeof v == "number") ? v : "'" + v.toString() + "'")
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

internal.build_read_query = function(model_name,filter,table_name,options) {
	if(!schemas.hasOwnProperty(model_name)) {
		throw("model name not found")
	}
	var model = schemas[model_name]
	if(!table_name) {
		table_name = model.table_name
	}
	var child_tables = {}
	var meta_tables = {}
	var selected_columns = Object.keys(model.properties).filter(key=>{
		if(model.properties[key].type == 'array' && model.properties[key].hasOwnProperty("items") && model.properties[key].items.hasOwnProperty("$ref")) {
			child_tables[key] = model.properties[key].items.$ref.split("/").pop()
			return false
		} else if (model.properties[key].hasOwnProperty("$ref")) {
			meta_tables[key] = model.properties[key].$ref.split("/").pop()
		} else {
			return true
		}
	})
	var filter_string = internal.control_filter3(model,filter,table_name)
	if(!filter_string) {
		throw("Invalid filter")
	}
	const order_by_clause = ""
	if (options && options.order_by) {
		var order_by
		if(!Array.isArray(options.order_by)) {
			if(options.order_by.indexOf(",") >= 0) {
				order_by = options.order_by.split(",")
			} else {
				order_by = [options.order_by]
			}
		} else {
			order_by = options.order_by
		}
		for(var i in order_by) {
			if(selected_columns.indexOf(order_by[i]) == -1) {
				throw("invalid order_by option - invalid property")
			}
		}
		order_by_clause = " ORDER BY " + order_by.map(key=>getFullKey(model,key,table_name)).join(",")
	}
	return {
		query: "SELECT " + selected_columns.map(key=> getFullKey(model,key,table_name)).join(", ") + " FROM " + '"' + table_name + '" WHERE 1=1 ' + filter_string + order_by_clause,
		child_tables: child_tables,
		meta_tables: meta_tables,
		table_name: table_name
	}
}

function getFullKey(model,key,default_table) {
	return (model.table_name) ? "\"" + model.table_name + "\".\"" + key + "\"" : (default_table) ? "\"" + default_table + "\".\"" + key + "\"" : "\"" + key + "\""
}

internal.getFullKey = getFullKey

internal.control_filter3 = function (model, filter, default_table) {
	var filter_string = " "
	var control_flag = 0
	for(const key of Object.keys(model.properties)) {
		const property = model.properties[key]
		if(property.type == 'array' && property.items && property.items["$href"]) {
			continue
		} else if (!property.type && property.$ref) {
			property.type = property.$ref.split("/").pop()
		}
		var fullkey = getFullKey(model,key,default_table)
		if(typeof filter[key] == "undefined" || filter[key] === null) {
			// if (model.required.indexOf(key) >= 0) {
			// 	console.error("Falta valor para filtro obligatorio " + key)
			// 	control_flag++
			// }
			continue
		}
		const value = filter[key]
		if(/[';]/.test(value)) {
			console.error("Invalid filter value for property " + key +": invalid characters")
			control_flag++
			continue
		}
		if(property.type) {
			if(property.type == "string") {
				if(property.format == "regexp") {
					var regexp = value.replace('\\','\\\\')
					filter_string += " AND " + fullkey  + " ~* '" + regexp + "'"
				} else if (property.format == "date" || property.format == "date-time") {
					let date
					if(value instanceof Date) {
						date = value
					} else {
						date = new Date(value)
					}
					if(date.toString() == "Invalid Date") {
						console.error("Invalid filter value for property " + key + ": invalid date")
						control_flag++
						continue
					} 
					if (property.interval) {
						if(property.interval == "begin") {
							filter_string += " AND " + fullkey + ">='" + date.toISOString() + "'::timestamptz"
						} else if (property.interval == "end") {
							filter_string += " AND " + fullkey + "<='" + date.toISOString() + "'::timestamptz"
						} else {
							filter_string += " AND " + fullkey + "='" + date.toISOString() + "'::timestamptz"		
						}
					} else {
						filter_string += " AND " + fullkey + "='" + date.toISOString() + "'::timestamptz"
					}
				} else if (property.format == "time-interval") {
					const interval = timeSteps.createInterval(value)
					if(!interval) {
						control_flag++
						continue
					}
					filter_string += " AND " + fullkey + "='" + timeSteps.interval2string(interval) + "'::interval"
				} else {
					filter_string += " AND " + fullkey + "='" + value + "'"
				}
			} else if (property.type == "TimeInterval") {
				const interval = timeSteps.createInterval(value)
				if(!interval) {
					control_flag++
					continue
				}
				filter_string += " AND " + fullkey + "='" + timeSteps.interval2string(interval) + "'::interval"
			} else if (property.type == "boolean") {
				const boolean = /^[yYtTvVsS1]/.test(value)
				if(property.format) {
					if(!boolean && property.format == "only-true") {
						continue
					} else if (boolean && property.format == "only-false") {
						continue
					} else {
						filter_string += " AND "+ fullkey + "=" + boolean.toString()	
					}
				} else {
					filter_string += " AND "+ fullkey + "=" + boolean.toString()
				}
			} 
			//   else if (valid_filters[key].type == "numeric_interval") {
			// 	if(Array.isArray(value)) {
			// 		if(value.length < 2) {
			// 			console.error("numeric_interval debe ser de al menos 2 valores")
			// 			control_flag++
			// 		} else {
			// 			filter_string += " AND " + fullkey + ">=" + parseFloat(value[0]) + " AND " + key + "<=" + parseFloat(value[1])
			// 		}
			// 	} else {
			// 		filter_string += " AND " + fullkey + "=" + parseFloat(value)
			// 	}
			// } 
			  else if (property.type == "integer") {
				if(Array.isArray(value)) {
					console.log("array of integers: " + value.join(","))
					var values = value.map(v=>parseInt(v)).filter(v=>v.toString()!="NaN")
					if(!values.length) {
						console.error("Invalid integer")
						control_flag++
						continue
					} 
					filter_string += " AND "+ fullkey + " IN (" + values.join(",") + ")"
				} else {
					var integer = parseInt(value)
					if(integer.toString() == "NaN") {
						console.error("Invalid integer")
						control_flag++
						continue
					}
					filter_string += " AND "+ fullkey + "=" + integer + ""
				}
			} else if (property.type == "number") {
				if(Array.isArray(value)) {
					var values = value.map(v=>parseFloat(v)).filter(v=>v.toString()!="NaN")
					if(!values.length) {
						console.error("Invalid float")
						control_flag++
						continue
					}
					filter_string += " AND "+ fullkey + " IN (" + values.join(",") + ")"
				} else {
					var number = parseFloat(value)
					if(number.toString() == "NaN") {
						console.error("Invalid integer")
						control_flag++
						continue
					}
					filter_string += " AND "+ fullkey + "=" + number + ""
				}
			} else {
				if(Array.isArray(value)) {
					filter_string += " AND "+ fullkey + " IN (" + value.join(",") + ")"
				} else {
					filter_string += " AND "+ fullkey + "=" + value + ""
				}
			}
		} else if (property["$ref"]) {
			if(property["$ref"] == "#/components/schemas/Geometry") {
				let geometry 
				if(!value instanceof Geometry) { // value.constructor && value.constructor.name == "geometry") {
					geometry = new Geometry(value)
				} else {
					geometry = value
				}
				if(!geometry) {
					control_flag++
					continue
				}
				filter_string += "  AND ST_Distance(st_transform(" + fullkey + ",4326),st_transform(" + geometry.toSQL() + ",4326)) < 0.001"
			}
		}
	}
	if(control_flag > 0) {
		return null
	} else {
		return filter_string
	}
}

function changeRef(object,key) {
    if(key == "$ref") {
        object[key] = "/" + object[key].split("/").pop()
    }
}

function traverse(o,func) {
    for (var i in o) {
        func.apply(this,[o,i]);  
        if (o[i] !== null && typeof(o[i])=="object") {
            //going one step down in the object tree!!
            traverse(o[i],func);
        }
    }
}

module.exports = internal