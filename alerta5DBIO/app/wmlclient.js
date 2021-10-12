// index.js
'use strict'

const soap = require('soap')
// const fs = require('fs')
// const request = require('request')
// const xml = require('xml')

var internal = {}

internal.Site = class {
	constructor(siteName,network, siteCode, longitude, latitude) {
		this.siteName = siteName
		this.network = network
		this.siteCode = siteCode
		this.longitude = longitude
		this.latitude = latitude
		this.series = []
	}
	toString() {
		var seriesString = (this.series.length > 0) ? this.series.map(item=> item.toString()).join(", ") : ""
		return "siteName:" + this.siteName + " ,network:" + this.network + ", siteCode:" + this.siteCode + ", longitude:" + this.longitude + ", latitude:" + this.latitude + ", series: [" + seriesString + "]"
	}
	toCSV() {
		var seriesString = (this.series.length > 0) ? this.series.map(item=> item.toCSV()).join(",") : ""
		return this.siteName + "," + this.network + "," + this.siteCode + "," + this.longitude + "," + this.latitude + "," + seriesString
	}
	toGeoJSON() {
		return {
		  type: "Feature",
		  geometry: {
			type: "Point",
			coordinates: [this.longitude, this.latitude]
		  },
		  "properties": {
			siteName: this.siteName,
			network: this.network,
			siteCode: this.siteCode,
			longitude: this.longitude,
			latitude: this.latitude
		  }
		}
	}
	
}

internal.Unit = class {
	constructor(unitName, unitType, unitAbbreviation, unitCode) {
		this.unitName = unitName
		this.unitType = unitType
		this.unitAbbreviation = unitAbbreviation
		this.unitCode = unitCode
	}
	toString() {
		return "unitName:" + this.unitName + ", unitType: " + this.unitType + ", unitAbbreviation: " + this.unitAbbreviation + ", unitCode: " + this.unitCode
	}
	toCSV() {
		return this.unitName + "," + this.unitType + "," + this.unitAbbreviation + "," + this.unitCode
	}
}

internal.TimeScale = class {
	constructor(IsRegular, unit, TimeSupport) {
		this.IsRegular = IsRegular
		this.unit = (unit) ? unit : new internal.Unit()
		this.TimeSupport = TimeSupport
	}
	toString() {
		return "IsRegular:" + this.IsRegular + ", unit:{" + this.unit.toString() + "}, TimeSupport:" + this.TimeSupport
	}
	toCSV() {
		return this.IsRegular + "," + this.unit.toCSV() + "," + this.TimeSupport
	}
}

internal.Variable = class {
	constructor(variableCode, variableName, valueType, dataType, generalCategory, sampleMedium, unit, noDataValue, timeScale, speciation) {
		this.variableCode = variableCode
		this.variableName = variableName
		this.valueType = valueType
		this.dataType = dataType
		this.generalCategory = generalCategory
		this.sampleMedium = sampleMedium
		this.unit = (unit) ? unit : new internal.Unit()
		this.noDataValue = noDataValue
		this.timeScale = (timeScale) ? timeScale : new internal.TimeScale()
		this.speciation = speciation
	}
	toString() {
		return "variableCode:" + this.variableCode + ", variableName;" + this.variableName + ", valueType:" + this.valueType + ", dataType:" + this.dataType + ", generalCategory:" + this.generalCategory + ", sampleMedium:" + this.sampleMedium + ", unit:{" + this.unit.toString() + "}, noDataValue:" + this.noDataValue + ", timeScale:{" + this.timeScale.toString() + "}, speciation:" + this.speciation
	}
	toCSV() {
		return this.variableCode + "," + this.variableName + "," + this.valueType + "," + this.dataType + "," + this.generalCategory + "," + this.sampleMedium + "," + this.unit.toCSV() + "," + this.noDataValue + "," + this.timeScale.toCSV() + "," + this.speciation
	}
}

internal.Method = class {
	constructor(methodId,methodCode,methodDescription,methodLink) {
		this.methodId = methodId
		this.methodCode = methodCode
		this.methodDescription = methodDescription
		this.methodLink = methodLink
	}
	toString() {
		return "methodId:" + this.methodID + ", methodCode:" + this.methodCode + ", methodDescription:" + this.methodDescription + ", methodLink:" + this.methodLink
	}
	toCSV() {
		return this.methodID + "," + this.methodCode + "," + this.methodDescription + "," + this.methodLink
	}
}

internal.Source = class {
	constructor(sourceID,organization,citation) {
		this.sourceID = sourceID
		this.organization = organization
		this.citation = citation
	}
	toString() {
		return "sourceID:" + this.sourceID + ", organization:" + this.organization + ", citation:" + this.citation
	}
	toCSV() {
		return this.sourceID + "," + this.organization + "," + this.citation
	}
}

internal.QualityControlLevel = class {
	constructor(qualityControlLevelID,qualityControlLevelCode,qualityControlLevelDefinition) {
		this.qualityControlLevelID = qualityControlLevelID
		this.qualityControlLevelCode = qualityControlLevelCode
		this.qualityControlLevelDefinition = qualityControlLevelDefinition
	}
	toString() {
		return "qualityControlLevelID:" + this.qualityControlLevelID + ", qualityControlLevelCode:" + this.qualityControlLevelCode + ", qualityControlLevelDefinition:" + this.qualityControlLevelDefinition
	}
	toCSV() {
		return this.qualityControlLevelID + "," + this.qualityControlLevelCode + "," + this.qualityControlLevelDefinition
	}
}

internal.Series = class {
	constructor(site, variable, valueCount, beginDateTimeUTC, endDateTimeUTC, method, source, qualityControlLevel) {
		this.site = site
		this.variable = variable
		this.valueCount = valueCount
		this.beginDateTimeUTC = beginDateTimeUTC
		this.endDateTimeUTC = endDateTimeUTC
		this.method = method
		this.source = source
		this.qualityControlLevel = qualityControlLevel
	}
	toString() {
		//~ console.log(this.site)
		//~ console.log(this.variable)
		//~ console.log(this.valueCount)
		//~ console.log(this.beginDateTimeUTC)
		//~ console.log(this.endDateTimeUTC)
		//~ console.log(this.method)
		//~ console.log(this.source)
		//~ console.log(this.qualityControlLevel)
		//~ console.log("site:{" + this.site + "}, variable:{" + this.variable + "}, valueCount:" + this.valueCount + ", beginDateTimeUTC:" + this.beginDateTimeUTC + ", endDateTimeUTC:" + this.endDateTimeUTC + ", method:{" + this.method + "}, source:{" + this.source + ", qualityControlLevel:{" + this.qualityControlLevel + "}")
		return "site:{" + this.site.toString() + "}, variable:{" + this.variable.toString() + "}, valueCount:" + this.valueCount + ", beginDateTimeUTC:" + this.beginDateTimeUTC + ", endDateTimeUTC:" + this.endDateTimeUTC + ", method:{" + this.method.toString() + "}, source:{" + this.source.toString() + ", qualityControlLevel:{" + this.qualityControlLevel.toString() + "}"
	}
	toCSV() {
		return  this.site.toString()+ "," + this.variable.toCSV() + "," + this.valueCount + ","  + this.beginDateTimeUTC + "," + this.endDateTimeUTC + "," + this.method.toCSV() + "," + this.source.toCSV() + "," + this.qualityControlLevel.toCSV()
	}
	toGeoJSON() {
		return {
		  type: "Feature",
		  geometry: {
			type: "Point",
			coordinates: [this.site.longitude, this.site.latitude]
		  },
		  "properties": {
			siteName: this.site.siteName,
			network: this.site.network,
			siteCode: this.site.siteCode,
			longitude: this.site.longitude,
			latitude: this.site.latitude,
			variableCode: this.variable.variableCode,
			variableName: this.variable.variableName,
			valueType: this.variable.valueType,
			dataType: this.variable.dataType,
			generalCategory: this.variable.generalCategory,
			sampleMedium: this.variable.sampleMedium,
			unitName: this.variable.unit.unitName,
			unitType: this.variable.unit.unitType,
			unitAbbreviation: this.variable.unit.unitAbbreviation,
			unitCode: this.variable.unit.unitCode,
			noDataValue: this.variable.noDataValue,
			timeScaleIsRegular: this.variable.timeScale.IsRegular,
			timeScaleUnit: this.variable.timeScale.unit,
			timeScaleTimeSupport: this.variable.timeScale.timeSupport,
			speciation: this.variable.speciation,
			valueCount: this.valueCount,
			beginDateTimeUTC: this.beginDateTimeUTC,
			endDateTimeUTC: this.endDateTimeUTC,
			methodId: this.method.methodId,
			methodCode: this.method.methodCode,
			methodDescription: this.method.methodDescription,
			methodLink: this.method.methodLink,
			sourceID: this.source.sourceID,
			organization: this.source.organization,
			citation: this.source.citation,
			qualityControlLevelID: this.qualityControlLevel.qualityControlLevelID,
			qualityControlLevelCode: this.qualityControlLevel.ControlLevelCode,
			qualityControlLevelDefinition: this.qualityControlLevel.qualityControlLevelDefinition
		  }
		}
	}
}

internal.Value = class {
	constructor(censorCode,dateTime,qualityControlLevel,methodID,sourceID,sampleID,value) {
		this.censorCode = censorCode
		this.dateTime =dateTime
		this.qualityControlLevel = qualityControlLevel
		this.methodID = methodID
		this.sourceID = sourceID
		this.sampleID = sampleID
		this.value = value
	}
	toString() {
		return "censorCode:" + this.censorCode + ", dateTime:" + this.dateTime + ", qualityControlLevel:" + this.qualityControlLevel + ", methodID:" + this.methodID + ", sourceID:" + this.sourceID + ", sampleID:" + this.sampleID + ", value:" + this.value
	}
	toCSV() {
		return  this.censorCode + "," + this.dateTime + "," + this.qualityControlLevel + ","  + this.qualityControlLevel + "," + this.methodID + "," + this.sourceID + "," + this.sampleID + "," + this.value
	}
}
		

internal.client = class {
	constructor(endpoint, options) {
		this.endpoint = endpoint
		this.soap_client_options = options
	}
	getSites(north,south,east,west,includeSeries=false) {
		return new Promise ( (resolve, reject) => {
			const wsdl_headers = this.soap_client_options.wsdl_headers
			if(north && south && east && west) {
				soap.createClient(this.endpoint, this.soap_client_options, function(err, client) {
					if(err) {
						reject(err)
						//~ console.error(err)
						return
					}
					Object.keys(wsdl_headers).forEach(key=>{
						client.addHttpHeader(key, wsdl_headers[key])
						//~ 'Origin','https://alerta.ina.gob.ar')
					//~ client.addHttpHeader('Referer','https://alerta.ina.gob.ar/wmlclient/wml/')
					})
					client.GetSitesByBoxObject({north: north, south: south, east: east, west: west, IncludeSeries: includeSeries}, function(err, result, rawResponse) {
					  if(err) {
						  reject({message:"waterML server error",error:err})
						  //~ console.error(err)
						  return 
					  }
					  //~ console.log(client.lastRequest)
					  //~ console.log(rawResponse)	
					  var siteslist = []
					  if(result.sitesResponse.hasOwnProperty("site")) {
						  result.sitesResponse.site.forEach(function(site) {
							  if(Array.isArray(site.siteInfo.siteCode)) {
									console.log("siteCode is array!")
									site.siteInfo.siteCode = site.siteInfo.siteCode[0]
							  }							  
							  //~ console.log(JSON.stringify(site.seriesCatalog,null,2))
							  const siteObj = new internal.Site(site.siteInfo.siteName,site.siteInfo.siteCode.attributes.network,site.siteInfo.siteCode["$value"],site.siteInfo.geoLocation.geogLocation.longitude,site.siteInfo.geoLocation.geogLocation.latitude)
							  if(includeSeries) { 
								  site.seriesCatalog.forEach(catalog=>{
									  catalog.series.forEach(item=>{
										  //~ console.log(JSON.stringify(serie,null,2))
										  siteObj.series.push(internal.makeSeries(siteObj,item))
									  })
								  })
							  }
							  siteslist.push(siteObj)
							  //~ console.log(JSON.stringify(siteObj.series,null,2))
							  
						  })
						  //~ console.log(siteslist)  
						  resolve(siteslist)
						  console.log('getSites success')
					  } else {
						  resolve([])
						  console.log("Empty response from GetSitesByBoxObject")
					  }
					})
				})
			} else {
				reject("Faltan parámetros")
			}
		})
	}
	
	
	
	getSiteInfo(SiteCode) {
		return new Promise( (resolve, reject) => {
			if(!SiteCode) {
				reject("SiteCode missing")
				return
			}
			const wsdl_headers = this.soap_client_options.wsdl_headers
			soap.createClient(this.endpoint, this.soap_client_options, function(err, client) {
				if(err) {
					reject(err)
					return
				}
				Object.keys(wsdl_headers).forEach(key=>{
					client.addHttpHeader(key, wsdl_headers[key])
				})
				client.GetSiteInfoObject({site: SiteCode}, function(err, result, rawResponse) {
					if(err) {
						reject(err)
						return 
					}
					var serieslist = []
					if(result.sitesResponse.hasOwnProperty("site")) {
						result.sitesResponse.site.forEach(function(site) {
							var siteObj = new internal.Site(site.siteInfo.siteName,site.siteInfo.siteCode[0].attributes.network,site.siteInfo.siteCode[0]["$value"],site.siteInfo.geoLocation.geogLocation.longitude,site.siteInfo.geoLocation.geogLocation.latitude)
							if(site.seriesCatalog.length > 0) {
								if(site.seriesCatalog[0].series.length > 0) {
									site.seriesCatalog[0].series.forEach(function(item) {
										var seriesObj =  internal.makeSeries(siteObj,item)
										serieslist.push(seriesObj)
									})
								} 
							}
						})
						resolve(serieslist)
					} else {
						reject("Nothing found")
					}
				})
			})
		})
	}
	
	getValues(siteCode,variableCode,startDate,endDate,hideNoDataValues=true) {
		return new Promise( (resolve, reject) => {
			if(!siteCode || !variableCode || !startDate || !endDate) {
				reject("Faltan parametros")
				return
			}
			// console.log({endpoint:this.endpoint, soap_client_options: this.soap_client_options})
			const wsdl_headers = this.soap_client_options.wsdl_headers
			soap.createClient(this.endpoint, this.soap_client_options, function(err, client) {
				if(err) {
					reject(err)
					return
				}
				Object.keys(wsdl_headers).forEach(key=>{
					client.addHttpHeader(key, wsdl_headers[key])
				})
				client.GetValuesObject({location: siteCode, variable: variableCode, startDate: startDate, endDate: endDate,hideNoDataValues:hideNoDataValues}, function(err, result, rawResponse) {
					if(err) {
						reject(err)
						return
					}
					var valueslist = []
					var Series
					if(result.timeSeriesResponse.hasOwnProperty("timeSeries")) {
						if(Array.isArray(result.timeSeriesResponse.timeSeries)) {
							console.log("timeSeries es array!")
							result.timeSeriesResponse.timeSeries = result.timeSeriesResponse.timeSeries[0]
						}
					    console.log({timeSeries: result.timeSeriesResponse.timeSeries})
						if(!result.timeSeriesResponse.timeSeries.sourceInfo.siteCode) {
							reject("missing siteCode")
							return
						}
						if(Array.isArray(result.timeSeriesResponse.timeSeries.sourceInfo.siteCode)) {
							console.log("siteCode is array!")
							result.timeSeriesResponse.timeSeries.sourceInfo.siteCode = result.timeSeriesResponse.timeSeries.sourceInfo.siteCode[0]
						}
					    console.log({siteCode: result.timeSeriesResponse.timeSeries.sourceInfo.siteCode})
						Series = new internal.Series (  // site, variable, valueCount, beginDateTimeUTC, endDateTimeUTC, method, source, qualityControlLevel
							new internal.Site ( //  siteName,network, siteCode, longitude, latitude
								result.timeSeriesResponse.timeSeries.sourceInfo.siteName,
								(result.timeSeriesResponse.timeSeries.sourceInfo.siteCode.attributes) ? result.timeSeriesResponse.timeSeries.sourceInfo.siteCode.attributes.network : null,
								result.timeSeriesResponse.timeSeries.sourceInfo.siteCode.$value,
								(result.timeSeriesResponse.timeSeries.sourceInfo.geoLocation) ? result.timeSeriesResponse.timeSeries.sourceInfo.geoLocation.geogLocation.longitude : null,
								(result.timeSeriesResponse.timeSeries.sourceInfo.geoLocation) ? result.timeSeriesResponse.timeSeries.sourceInfo.geoLocation.geogLocation.latitude: null
							),
							new internal.Variable ( // variableCode, variableName, valueType, dataType, generalCategory, sampleMedium, unit, noDataValue, timeScale, speciation
								(Array.isArray(result.timeSeriesResponse.timeSeries.variable.variableCode)) ? result.timeSeriesResponse.timeSeries.variable.variableCode[0].$value : result.timeSeriesResponse.timeSeries.variable.variableCode.$value,
								result.timeSeriesResponse.timeSeries.variable.variableName,
								result.timeSeriesResponse.timeSeries.variable.valueType,
								result.timeSeriesResponse.timeSeries.variable.dataType,
								result.timeSeriesResponse.timeSeries.variable.generalCategory,
								result.timeSeriesResponse.timeSeries.variable.sampleMedium,
								new internal.Unit( // unitName, unitType, unitAbbreviation, unitCode
									result.timeSeriesResponse.timeSeries.variable.unit.unitName,
									null,
									result.timeSeriesResponse.timeSeries.variable.unit.unitAbbreviation,
									result.timeSeriesResponse.timeSeries.variable.unit.unitCode
								),
								result.timeSeriesResponse.timeSeries.variable.NoDataValue,
								//~ new internal.timeScale( // IsRegular, unit, TimeSupport
								result.timeSeriesResponse.timeSeries.variable.timeScale,
								result.timeSeriesResponse.timeSeries.variable.speciation
							),
							0,
							null, 
							null, 
							new internal.Method(), 
							new internal.Source(),
							new internal.QualityControlLevel()
						)
						if(result.timeSeriesResponse.timeSeries.values) { 
							if(Array.isArray(result.timeSeriesResponse.timeSeries.values)) {
								console.log("values is array!")
								if(result.timeSeriesResponse.timeSeries.values.length<=0) {
									console.log("No Data Values")
									resolve({seriesInfo: Series, values:[]})
									return
								}
								result.timeSeriesResponse.timeSeries.values = result.timeSeriesResponse.timeSeries.values[0]
							}
							if(!result.timeSeriesResponse.timeSeries.values) {
								console.log("No Data Values")
								resolve({seriesInfo:Series, values:[]})
								return
							}
							if(! result.timeSeriesResponse.timeSeries.values.hasOwnProperty("value")) {
								console.log("no value property found")
								resolve({seriesInfo:Series, values:[]})
								return
							}
							if(! Array.isArray(result.timeSeriesResponse.timeSeries.values.value)) {
								console.log("value property is not an array!")
								resolve({seriesInfo:Series, values:[]})
								return
							}
							if(result.timeSeriesResponse.timeSeries.values.value.length <= 0) {
								console.log("value property is of length 0")
								resolve({seriesInfo:Series, values:[]})
								return
							}
							console.log("Found " + result.timeSeriesResponse.timeSeries.values.value.length + " values")
							result.timeSeriesResponse.timeSeries.values.value.forEach(function(value) {
								valueslist.push(new internal.Value (
									value.attributes.censorCode,
									value.attributes.dateTime,
									value.attributes.qualityControlLevel,
									value.attributes.methodID,
									value.attributes.sourceID,
									value.attributes.sampleID,
									value.$value
								))
							})
					  //~ console.log(renderlist)  
							Series.valueCount = result.timeSeriesResponse.timeSeries.values.value.length
							resolve({seriesInfo:Series, values:valueslist})
							console.log('success')
						} else {
							console.log("No values found")
							resolve({seriesInfo:Series, values:[]})
							return
						}
					
					} else {
						reject("timeSeries not found")
						return
					}
				})
			})
		})
	}
}

internal.makeSeries = function(siteObj,item) {  // Creates internal.Series class object factory from array element of getSiteInfoObject->Site->SeriesCatalog->series //
		
	var unitObj = new internal.Unit(
		item.variable.unit.unitName,
		item.variable.unit.unitType,
		item.variable.unit.unitAbbreviation,
		item.variable.unit.unitCode
	)
	var timeUnitObj = new internal.Unit(
		(item.variable.timeScale.unit) ? item.variable.timeScale.unit.unitName : null,
		(item.variable.timeScale.unit) ? item.variable.timeScale.unit.unitType : null,
		(item.variable.timeScale.unit) ? item.variable.timeScale.unit.unitAbbreviation : null,
		(item.variable.timeScale.unit) ? item.variable.timeScale.unit.unitCode : null
	)
	var timeScaleObj = new internal.TimeScale(
		item.variable.timeScale.attributes.isRegular,
		timeUnitObj,
		(item.variable.timeScale.timeSupport) ? item.variable.timeScale.timeSupport : null
	)
	
	var variableObj = new internal.Variable(  // variableCode, variableName, valueType, dataType, generalCategory, sampleMedium, unit, noDataValue, timeScale, speciation
		(item.variable.variableCode[0].$value) ? item.variable.variableCode[0].$value : item.variable.variableCode[0].attributes.vocabulary + ":" + item.variable.variableCode[0].attributes.variableID, 
		item.variable.variableName,
		item.variable.valueType,
		item.variable.dataType,
		item.variable.generalCategory,
		item.variable.sampleMedium,
		unitObj,
		item.variable.noDataValue,
		timeScaleObj,
		item.variable.speciation
	)
	var methodObj = new internal.Method(
		(item.method) ? item.method.attributes.methodID : null,
		(item.method) ? item.method.methodCode: null,
		(item.method) ? item.method.methodDescription : null,
		(item.method) ? item.method.methodLink : null
	)
	var sourceObj = new internal.Source(
		item.source.attributes.sourceID,
		item.source.organization,
		item.source.citation
	)
	var qualityControlLevelObj = new internal.QualityControlLevel(
		(item.qualityControlLevel) ? item.qualityControlLevel.attributes.qualityControlLevelID : null,
		(item.qualityControlLevel) ? item.qualityControlLevel.qualityControlLevelCode : null,
		(item.qualityControlLevel) ? item.qualityControlLevel.definition : null
	)
	var newSiteObj = new internal.Site(siteObj.siteName,siteObj.network, siteObj.siteCode, siteObj.longitude, siteObj.latitude)   // to avoid circular reference
	var seriesObj = new internal.Series(  //  site, variable, valueCount, beginDateTimeUTC, endDateTimeUTC, method, source, qualityControlLevel
		newSiteObj,
		variableObj,
		item.valueCount,
		item.variableTimeInterval.beginDateTimeUTC,
		item.variableTimeInterval.endDateTimeUTC,
		methodObj,
		sourceObj,
		qualityControlLevelObj
	) 
	return seriesObj  
}

module.exports = internal
