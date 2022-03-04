'use strict'

const internal = {}
var parsePGinterval = require('postgres-interval')

internal.createInterval = function(value) {
	if(!value) {
		return //  parsePGinterval()
	}
	if(value.constructor && value.constructor.name == 'PostgresInterval') {
		var interval = {}
		Object.assign(interval,value)
		return interval
	}
	if(value instanceof Object) {
		var interval = parsePGinterval()
		Object.keys(value).map(k=>{
			switch(k) {
				case "milliseconds":
				case "millisecond":
					interval.milliseconds = value[k]
					break
				case "seconds":
				case "second":
					interval.seconds = value[k]
					break
				case "minutes":
				case "minute":
					interval.minutes = value[k]
					break
				case "hours":
				case "hour":
					interval.hours = value[k]
					break
				case "days":
				case "day":
					interval.days = value[k]
					break
				case "months":
				case "month":
				case "mon":
					interval.months = value[k]
					break
				case "years":
				case "year":
					interval.years = value[k]
					break
				default:
					break
			}
		})
		return interval
	}
	if(typeof value == 'string') {
		return parsePGinterval(value)
	} else {
		console.error("timeSteps.createInterval: Invalid value")
		return
	}
}

internal.interval2string = function(interval) {
	if(!interval) {
		return "00:00:00"
	}
	if(interval instanceof Object) {
		if(Object.keys(interval).length == 0) {
			return "00:00:00"
		} else {
			var string = ""
			Object.keys(interval).forEach(key=>{
				string += interval[key] + " " + key + " "
			})
			return string.replace(/\s$/,"")
		}
	} else {
		return interval.toString()
	}
}

internal.interval2epochSync = function(interval) {
	if(!interval) {
		return 0
	}
	if(!interval instanceof Object) {
		console.error("interval must be an postgresInterval object")
		return
	}
	var seconds = 0
	Object.keys(interval).map(k=>{
		switch(k) {
			case "milliseconds":
			case "millisecond":
				seconds = seconds + interval[k] * 0.001
				break
			case "seconds":
			case "second":
				seconds = seconds + interval[k]
				break
			case "minutes":
			case "minute":
				seconds = seconds + interval[k] * 60
				break
			case "hours":
			case "hour":
				seconds = seconds + interval[k] * 3600
				break
			case "days":
			case "day":
				seconds = seconds + interval[k] * 86400
				break
			case "weeks":
			case "week":
				seconds = seconds + interval[k] * 86400 * 7
				break
			case "months":
			case "month":
			case "mon":
				seconds = seconds + interval[k] * 86400 * 31
				break
			case "years":
			case "year":
				seconds = seconds + interval[k] * 86400 * 365
				break
			default:
				break
		}
	})
	return seconds
}	



internal.getPreviousTimeStep = function(timestamp,def_hora_corte,timeSupport) {
	var timeSupport_e = internal.interval2epochSync(timeSupport) * 1000
	var def_hora_corte_e = internal.interval2epochSync(def_hora_corte) * 1000
	console.log({timeSupport_e:timeSupport_e,def_hora_corte_e:def_hora_corte_e})
	if(timeSupport_e >= 86400000) {
		timestamp = new Date(timestamp.getFullYear(),timestamp.getMonth(),timestamp.getDate(),0,0,0,0) // timestamp % (24 * 60 * 60 * 1000)
		timestamp.setTime(timestamp.getTime() + def_hora_corte_e)
	} else {
		var timestamp_d = new Date(timestamp.getFullYear(),timestamp.getMonth(),timestamp.getDate(),0,0,0,0)
		console.log({timestamp_d:timestamp_d})
		var time = timestamp.getTime() -  timestamp_d.getTime() //% (24 * 60 * 60 * 1000)
		console.log({time:time})
		timestamp -= time
		if(time < def_hora_corte_e) {
			timestamp += def_hora_corte_e
			timestamp -= timeSupport_e
		} else {
			time -= def_hora_corte_e
			time -= time % timeSupport_e
			timestamp += time + def_hora_corte_e
		}
	}
	console.log({timestamp:timestamp})
	return new Date(timestamp)
}
	
internal.advanceTimeStep = function(start_timestamp,timeSupport) {
	var timestamp = new Date(start_timestamp) 
	Object.keys(timeSupport).forEach(key=>{
		switch(key.toLowerCase()) {
			case "milliseconds":
			case "millisecond":
				timestamp.setMilliseconds(timestamp.getMilliseconds()+timeSupport[key])
				break
			case "seconds":
			case "second":
				timestamp.setSeconds(timestamp.getSeconds()+timeSupport[key])
				break
			case "minutes":
			case "minute":
				timestamp.setMinutes(timestamp.getMinutes()+timeSupport[key])
				break
			case "hours":
			case "hour":
				timestamp.setHours(timestamp.getHours()+timeSupport[key])
				break
			case "days":
			case "day":
				timestamp.setDate(timestamp.getDate()+timeSupport[key])
				break
			case "weeks":
			case "week":
				timestamp.setDate(timestamp.getDate()+timeSupport[key]*7)
				break
			case "months":
			case "month":
			case "mon":
				timestamp.setMonth(timestamp.getMonth()+timeSupport[key])
				break
			case "years":
			case "year":
				timestamp.setYear(timestamp.getFullYear()+timeSupport[key])
				break
			default:
				break
		}
	})
	return timestamp
}

internal.advanceInterval = function(date,interval={hours:1}) {
	if(!interval instanceof Object) {
		console.error("interval must be an postgresInterval object")
		return
	}
	var new_date = date
	Object.keys(interval).map(k=>{
		switch(k) {
			case "milliseconds":
			case "millisecond":
				date.setUTCMilliseconds(date.getUTCMilliseconds() + interval[k])
				break
			case "seconds":
			case "second":
				date.setUTCSeconds(date.getUTCSeconds() + interval[k])
				break
			case "minutes":
			case "minute":
				date.setUTCMinutes(date.getUTCMinutes() + interval[k])
				break
			case "hours":
			case "hour":
				date.setUTCHours(date.getUTCHours() + interval[k])
				break
			case "days":
			case "day":
				date.setUTCDate(date.getUTCDate() + interval[k])
				break
			case "weeks":
			case "week":
				date.setUTCDate(date.getUTCDate() + interval[k]*7)
				break
			case "months":
			case "month":
			case "mon":
				date.setUTCMonth(date.getUTCMonth() + interval[k])
				break
			case "years":
			case "year":
				date.setUTCFullYear(date.getUTCFullYear() + interval[k])
				break
			default:
				break
		}
	})
	return new_date
}

internal.dateSeq = function (timestart,timeend,interval) {
	var seq = []
	var date = new Date(timestart)
	var end = new Date(timeend)
	while(date<=end) {
		seq.push(new Date(date))
		date = internal.advanceInterval(date,interval)
	}
	return seq
}

internal.date2tste = function(date) {
	var ts = new Date(date)
	ts = new Date(ts.getUTCFullYear(),ts.getUTCMonth(),ts.getUTCDate())
	var te = new Date(ts)
	te.setDate(te.getDate() + 1)
	return [ts, te]
}
// internal.string2interval(string=>{
// 	if(!string) {
// 		return {}
// 	}
// 	if(typeof string == "string") {
// 		var a = string.split(/\s+/)
// 		for(var i=0;i<a.length;i=i+2) {
// 			switch
// 		}
// 	}
// })

internal.doy2month = function(doy) {
    var date = new Date(2022,0,1)
    date.setUTCDate(doy)
    return date.getUTCMonth()
}


module.exports = internal


// 

//~ var def_hora_corte = null
//~ var timeSupport = {years: 1}
//~ var ts = new Date(725857200000) // new Date('1993-01-01T03:00:00.000Z')
//~ var pts = getPreviousTimeStep(ts,def_hora_corte,timeSupport)
//~ console.log(pts)
//~ console.log(pts.toISOString())
