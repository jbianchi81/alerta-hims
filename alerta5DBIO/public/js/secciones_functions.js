function rgbToHex(rgb) { 
	var hex = Number(rgb).toString(16);
	if (hex.length < 2) {
		hex = "0" + hex;
	}
	return hex;
}

function reloadWithPars(evt) {
	var ts = $("input#timestart").val()
	var te = $("input#timeend").val()
	var series_id = evt.currentTarget.id
	var var_id = $("select#varId").val()
	var red_id = $("select#redId").val()
	var estacion_id = $("select#estacionId").val()
	var prono_args = ""
	if($(".form-control[name=has_prono]").prop("checked")) {
		prono_args = "&has_prono=true" 
		prono_args += ($(".form-control[name=cal_grupo_id]").val()) ? "&cal_grupo_id=" + $(".form-control[name=cal_grupo_id]").val() : ""
		prono_args += ($(".form-control[name=cal_id]").val()) ? "&cal_id=" + $(".form-control[name=cal_id]").val() : ""
	}
	if($(".form-control[name=data_availability]").val() != "") {
		prono_args += "&data_availability=" + $(".form-control[name=data_availability]").val()
	}
	if($(".form-control[name=north]").val() != "" && $(".form-control[name=south]").val() != "" &&$(".form-control[name=west]").val() != "" && $(".form-control[name=east]").val() != "") {
		for(i of ["north","south","east","west"]) {
			prono_args += "&" + i + "=" + $(".form-control[name=" + i + "]").val()
		}
	}
	$('a#maptab').click()
	window.location.search = '?varId=' + var_id + '&seriesId=' + series_id + ((ts) ? '&timestart=' + ts : '') + ((te) ? '&timeend=' + te : '') + ((red_id) ? '&redId=' + red_id : '') + ((estacion_id) ? '&estacionId=' + estacion_id : '') + prono_args
}

function addToChart(evt) {
	$('div.popover').remove()
	$('a#charttab').click()
	$("form#chooseaddseries select[name=series_id]").val(evt.currentTarget.id)
	$("form#chooseaddseries").submit()
}

// get var list

function getVarList(varId) {  // 2,4,22,23,24,25,26,33,39,40,48,49,50,51,52,67,68,69,73
	return fetch("getMonitoredVars?tipo=puntual")
	.then(response=>{
		return response.json()
	})
	.then(json=>{
		var hidro = json.filter(v=> (v.tipo2 == 'hidro')).map(v=> {
			return {id: v.id, name: v.nombre}
		})
		var meteo = json.filter(v=> (v.tipo2 == 'meteo')).map(v=> {
			return {id: v.id, name: v.nombre}
		})
		var varList = [...hidro,{id:-1, name:"Meteorológicas (todas)"},...meteo]
		varList.forEach(v=>{
			var selected = (varId) ? (v.id == varId) ? "selected" : "" : ""
			$("form#selectorform select[name=varId]").append(
				$("<option value=" + v.id + " " + selected + ">" + v.name + "(" + v.id + ")</option>")
			)
		})
	})
	.catch(e=>{
		console.error(e.toString())
	})
		//~ [
		//~ {id:2, name:"altura"},
		//~ {id:4, name:"caudal"},
		//~ {id:26, name:"volumen útil"},
		//~ {id:39, name: "altura media diaria"},
		//~ {id:67, name: "altura media semanal"},
		//~ {id:33, name: "altura media mensual"},
		//~ {id:40, name: "caudal medio diario"},
		//~ {id:48, name: "caudal medio mensual"},
		//~ {id:49, name: "altura mínima mensual"},
		//~ {id:50, name: "altura máxima mensual"},
		//~ {id:51, name: "caudal mínimo mensual"},
		//~ {id:52, name: "caudal máximo mensual"},
		//~ {id:22, name: "caudal afluente"},
		//~ {id:23, name: "caudal efluente"},
		//~ {id:24, name: "caudal vertido"},
		//~ {id:25, name: "caudal transferido"},
		//~ {id:35, name: "Altura de marea astronómica"},
		//~ {id:36, name: "Altura de marea meteorológica"},
		//~ {id:-1, name: "Meteorológicas (todas)"},
		//~ {id:1, name: "Precipitación diaria 12Z"},
		//~ {id:27, name: "Precipitación a intervalo nativo"},
		//~ {id:31, name: "Precipitación horaria"},
		//~ {id:34, name: "Precipitación 3-horaria"},
		//~ {id:38, name: "Precipitación acumulada"},
		//~ {id:5, name: "Temperatura mínima diaria"},
		//~ {id:6, name: "Temperatura máxima diaria"},
		//~ {id:7, name: "Temperatura media diaria"},
		//~ {id:53, name: "temperatura"},
		//~ {id:54, name: "temperatura horaria"},
		//~ {id:9, name: "Velocidad del viento máxima diaria"},
		//~ {id:10, name: "Velocidad del viento media diaria"},
		//~ {id:11, name: "Dirección del viento modal diaria"},
		//~ {id:57, name: "Dirección del viento"},
		//~ {id:55, name: "velocidad del viento"},
		//~ {id:56, name: "velocidad del viento horaria"},
		//~ {id:12, name: "humedad relativa media diaria"},
		//~ {id:58, name: "humedad relativa"},
		//~ {id:59, name: "humedad relativa media horaria"},
		//~ {id:13, name: "Heliofanía"},
		//~ {id:16, name: "Presión barométrica media diaria"},
		//~ {id:60, name: "Presión barométrica"},
		//~ {id:61, name: "Presión barométrica media horaria"},
		//~ {id:17, name: "nubosidad media diaria"},
		//~ {id:62, name: "nubosidad"},
		//~ {id:18, name: "presión al nivel del mar media diaria"},
		//~ {id:63, name: "presión al nivel del mar"},
		//~ {id:43, name: "temperatura de rocío"},
		//~ {id:14, name: "radiación solar"}
	//~ ].forEach(v=>{
		//~ var selected = (varId) ? (v.id == varId) ? "selected" : "" : ""
		//~ $("form#selectorform select[name=varId]").append(
			//~ $("<option value=" + v.id + " " + selected + ">" + v.name + "(" + v.id + ")</option>")
		//~ )
	//~ })
}

// create prono resumen

function getPronoResumen(series) {
	var index = 0
	if(!series.pronosticos) {
		return []
	}
	var prono_resumen = []
	for(var i=0;i<series.pronosticos.length;i++) {
		if(series.pronosticos[i].corrida) {
			prono_resumen[index] = {
				cal_id: series.pronosticos[i].id,
				nombre: series.pronosticos[i].nombre,
				modelo: series.pronosticos[i].modelo,
				activar: series.pronosticos[i].activar,
				selected: series.pronosticos[i].selected,
				cor_id: series.pronosticos[i].corrida.cor_id,
				forecast_date: series.pronosticos[i].corrida.forecast_date,
			}
			if(series.pronosticos[i].corrida.series) {
				if(series.pronosticos[i].corrida.series.length>0) {
					prono_resumen[index].count = series.pronosticos[i].corrida.series.map(s=>s.pronosticos.length).reduce((total,l)=>total+l)
					prono_resumen[index].fecha_fin = new Date(Math.min(series.pronosticos[i].corrida.series.map(s=>new Date(s.pronosticos[s.pronosticos.length-1][0]).getTime())))
				}
			}
			index++
		}
	}
	return prono_resumen
}

// get geom as geoJSON

function getGeomAsGeoJSON(series) {
	return {
		type:"Feature", 
			geometry: series.estacion.geom, 
			properties: { 
				id: series.estacion.id,
				nombre: series.estacion.nombre,
				id_externo: series.estacion.id_externo,
				longitud: series.estacion.geom.coordinates[0],
				latitud: series.estacion.geom.coordinates[1],
				provincia: series.estacion.provincia,
				pais: series.estacion.pais,
				rio: series.estacion.rio,
				automatica: series.estacion.automatica,
				propietario: series.estacion.propietario,
				abreviatura: series.estacion.abreviatura,
				URL: series.estacion.URL,
				localidad: series.estacion.localidad,
				real: series.estacion.real,
				nivel_alerta: series.estacion.nivel_alerta,
				nivel_evacuacion: series.estacion.nivel_evacuacion
			}
	}
}
 
// create style for rendering points acording to their 'data_availability' attribute

var defaultStyle = new ol.style.Style({
	image: new ol.style.Circle({
	  radius: 6,
	  stroke: new ol.style.Stroke({
		color: [220,220,220,1]
	  }),
	  fill: new ol.style.Fill({
		color: [250,250,250,1]
	  })
	})
})
var altStyles={}
var stylePars = { 
	'N': {fill:[110,110,110,1], radius: 8, stroke:[220,220,220,0], fontColor: "white", zIndex: 1},
	'S': {fill: [110,110,110,1], radius: 7,stroke:[0,220,220,1], fontColor: "white", zIndex: 2},
	'H': {fill: [0,128,255,1], radius: 8, stroke: [220,220,220,0], fontColor: "white", zIndex: 3},
	'H+S': {fill: [0,128,255,1], radius: 7, stroke:[0,220,220,1], fontColor: "white", zIndex: 4},
	'C': {fill: [0,60,220,1], radius: 8, stroke: [220,220,220,0], fontColor: "white", zIndex: 5},
	'C+S': {fill: [0,60,220,1], radius: 7, stroke:[0,220,220,1], fontColor: "white", zIndex: 6},
	'NRT': {fill: [0,102,0,1], radius: 8, stroke: [220,220,220,0], fontColor: "white", zIndex: 7},
	'NRT+S': {fill: [0,102,0,1], radius: 7, stroke:[0,220,220,1], fontColor: "white", zIndex: 8},
	'RT': {fill: [0,255,0,1], radius: 8, stroke: [220,220,220,0], fontColor: "black", zIndex: 9},
	'RT+S': {fill: [0,255,0,1], radius: 7, stroke:[0,220,220,1], fontColor: "black", zIndex: 10}
}
function styleFunction(feature, resolution) {
	var data_availability = feature.get('data_availability')
	if(!data_availability) {
		return [defaultStyle]
	}
	if(altStyles[data_availability]) {
		return [altStyles[data_availability]]
	} else if (stylePars[data_availability]) {
		altStyles[data_availability] = new ol.style.Style({
			image: new ol.style.Circle({
			  radius: stylePars[data_availability].radius,
			  stroke: new ol.style.Stroke({
				color: stylePars[data_availability].stroke,
				width: 3
			  }),
			  fill: new ol.style.Fill({
				color: stylePars[data_availability].fill
			  })
			}),
			zIndex: stylePars[data_availability].zIndex
		})
		return [altStyles[data_availability]]
	} else {
		return [defaultStyle]
	}
}

// add series to chart form 

function chooseAddSeries(event) {
	event.preventDefault();
	$("body").css("cursor","progress")
	if($(event.currentTarget).find("input[name=timestart]").val() == "") {
		var timestart = new Date()
		timestart.setDate(timestart.getDate() - 90)
		$(event.currentTarget).find("input[name=timestart]").val(timestart.toISOString().substring(0,10))
	}
	if($(event.currentTarget).find("input[name=timeend]").val() == "") {
		var timeend = new Date()
		timeend.setDate(timeend.getDate() + 15)
		$(event.currentTarget).find("input[name=timeend]").val(timeend.toISOString().substring(0,10))
	}
	$.post($(event.currentTarget).attr('action'),$(event.currentTarget).serialize(),function(response) {
		if(response.length <= 0) {
			alert("No data found")
			$("body").css("cursor","default")
			return
		}				
		var name = $(event.currentTarget).find("select[name=series_id] option:selected").html()
		addSeriesToChart({name:name,series:response},undefined,"chart_container")
		//~ $("div#chart_container").highcharts().renderer.point(
		$("div#chartModal").modal("hide")
		$("body").css("cursor","default")
		if(!global.extra_series) {
			global.extra_series = {}
		}
		global.extra_series[name] = response
	})
	.fail(e=>{
		$("body").css("cursor","default")
		alert("getObservaciones error")
		$("div#chartModal").hide()
	})
}

// add percentile(s) to chart

function choosePercentile(event) {
	event.preventDefault();
	$("body").css("cursor","progress")
	$(event.currentTarget).find("input[type=submit]").prop('disabled',true)
	if($(event.currentTarget).find("input[name=timestart]").val() == "") {
		var timestart = new Date()
		timestart.setDate(timestart.getDate() - 90)
		$(event.currentTarget).find("input[name=timestart]").val(timestart.toISOString().substring(0,10))
	}
	if($(event.currentTarget).find("input[name=timeend]").val() == "") {
		var timeend = new Date()
		timeend.setDate(timeend.getDate() + 15)
		$(event.currentTarget).find("input[name=timeend]").val(timeend.toISOString().substring(0,10))
	}
	$.post($(event.currentTarget).attr('action'),$(event.currentTarget).serialize(),function(response) {
		if(response.length <= 0) {
			alert("No data found")
			$("body").css("cursor","default")
			return
		}	
		//~ console.log(response)
		$("div.tabcontent#grafico").find("button.downld-percentile").prop('disabled',false)
		response.forEach(r=>{
			addSeriesToChart({name:"percentil "+r.percentil,series:r.data,zIndex:1,lineWidth:1,color:"black",dashStyle:"LongDash",marker:{enabled:false}},undefined,"chart_container")
			if(!global.extra_series) {
				global.extra_series = {}
			}
			global.extra_series["percentil "+r.percentil] = response
		})
		$("div#chartModal2").modal("hide")
		$("form#choosepercentile input[type=submit]").prop('disabled',false)
		$("body").css("cursor","default")
	})
	.fail(e=>{
		$("body").css("cursor","default")
		alert("getPercentilesDiariosBetweenDates error")
		$("div#chartModal2").modal("hide")
		$("form#choosepercentile input[type=submit]").prop('disabled',false)
	})	
}

function copyTextToClipboard(elementId) {
  var copyText = document.getElementById(elementId);
  copyText.select();
  copyText.setSelectionRange(0, 99999); /* For mobile devices */
  document.execCommand("copy");
  console.log("Copied the text: " + copyText.value + " del elemento id: " + elementId);
  alert("Se copió la URL al portapapeles")
} 


// display modal para copiar link de pronos json
function getPronosJsonUrl() {
	if(!global.series) {
		alert("no series")
		return
	}
	$("#myModal span#exportcsv a").click(downldTablePronoCSV).removeAttr("href").text("descargar CSV").css("color","#007bff")
	$("#myModal span#exportjson input#exportjsonurl").val(window.location.origin + window.location.pathname.replace(/[^/]*$/,"") + "sim/calibrados?estacion_id=" + global.series.estacion.id + "&var_id=" + global.series.var.id + "&includeCorr=true&timestart=" + global.series.timestart + "&timeend=" + global.series.timeend).removeAttr("disabled")
	$("div#myModal span#exportcsv").show()
	$("div#myModal span#exportjson").show()
	$("div#myModal div#authentication").hide()
	$("div#myModal div#authentication input").attr("disabled",true)
	$("div#myModal").modal('show').on('hide.bs.modal', function (e) {
		$(e.target).find("span#exportcsv").hide()
		$(e.target).find("span#exportcsv a").unbind("click", downldTablePronoCSV).text("").attr("href","").css("color","inherited")
		$(e.target).find("span#exportjson").hide()
		$(e.target).find("span#exportjson input#exportjsonurl").val("").attr("disabled","disabled")
		$(e.target).find("div#authentication").show()
		$(e.target).find("div#authentication input").attr("disabled",false)
	})
}
function getObsJsonUrl() {
	if(!global.series) {
		alert("no series")
		return
	}
	$("#myModal span#exportjson input#exportjsonurl").val(window.location.origin + window.location.pathname.replace(/[^/]*$/,"") + "obs/puntual/series/" + global.series.id + "/observaciones?timestart=" + global.series.timestart + "&timeend=" + global.series.timeend).removeAttr("disabled")
	$("div#myModal span#exportjson").show()
	$("div#myModal div#authentication").hide()
	$("div#myModal div#authentication input").attr("disabled",true)
	$("div#myModal").modal('show').on('hide.bs.modal', function (e) {
		$(e.target).find("span#exportjson").hide()
		$("#myModal span#exportjson input#exportjsonurl").val("").attr("disabled","disabled")
		$(e.target).find("span#exportcsv a").attr({"href":null,download:'observaciones.csv'})
		$(e.target).find("div#authentication").show()
		$(e.target).find("div#authentication input").attr("disabled",false)
	})
}

function downldTablePronoCSV() {
	$("button.buttons-csv[aria-controls=table_container_prono]").click()
}

function getSerieStats(observaciones) {
	if(observaciones.length == 0) {
		return;
	}
	var o_timestart = observaciones[0][0] // observaciones.map(o=> o[0]).reduce((a,b)=> (a < b) ? a : b) //observaciones[0][0]
	var o_timeend = observaciones[0][1] // observaciones.map(o=> o[1]).reduce((a,b)=> (a > b) ? a : b) // observaciones[0][1]
	var minval = observaciones[0][2] // observaciones.map(o=> o[2]).reduce((a,b)=> (a !== null) ? (b !== null) ? (a < b) ? a : b : a : b) //observaciones[0][2]
	var maxval = observaciones[0][2] // observaciones.map(o=> o[2]).reduce((a,b)=> (a !== null) ? (b !== null) ? (a > b) ? a : b : a : b) // observaciones[0][2]
	var sum=0
	var count=0
	observaciones.map(o=> {
		o_timestart = (o[0] < o_timestart) ? o[0] : o_timestart
		o_timeend = (o[1] > o_timeend) ? o[1] : o_timeend
		minval = (o[2] !== null) ? (minval !== null) ? (o[2] < minval) ? o[2] : minval : o[2] : minval // (o[2] < minval) ? o[2] : minval
		maxval = (o[2] !== null) ? (maxval !== null) ? (o[2] > maxval) ? o[2] : maxval : o[2] : maxval  // (o[2] > maxval) ? o[2] : maxval
		sum = sum + o[2]
		count = count + ((o[2] !== null) ? 1 : 0)
	})
	var count_nulls = observaciones.length - count
	return {timestart: o_timestart, timeend: o_timeend, count: count, min: minval, max: maxval, avg: sum/count, nulls: count_nulls}
}

function metadataEdit(evt) {
	//~ $("div#myModalMetadata div#estacion .edit").removeAttr("disabled");
	//~ ['tabla','nombre','cero_ign','provincia','pais','rio'].forEach(key=> {
		//~ $("div#myModalMetadata div#estacion .edit[name=" + key + "]").val(global.series.estacion[key])
	//~ })
	//~ $("div#myModalMetadata div#estacion .edit[name=longitud]").val(global.series.estacion.geom.coordinates[0])
	//~ $("div#myModalMetadata div#estacion .edit[name=latitud]").val(global.series.estacion.geom.coordinates[1])
	//~ $("h4#estacionHeading").text("Estacion id: " + global.series.estacion.id)
	//~ $("div#myModalMetadata div#estacion").show()
	var metadataElement = evt.target.id
	$("div#myModalMetadata form#confirm").html(buildMetadataForm(metadataElement))
	$("div#myModalMetadata").modal('show')
}

function onSubmitMetadataEdit(event) {
	$(this).find("button[type=submit]").prop('disabled', true);
	event.preventDefault()
	$("body").css("cursor", "progress")
	var metadataElement = $(this).find("input[name=metadataElement]").val()
	var id = $(this).find("input[name=id]").val()
	var requestBody = {}
	var objectName = metadataElements[metadataElement].objectName
	requestBody[objectName] = {}
	//~ requestBody[metadataElement] = global.series[metadataElement]
		//~ estacion: {...global.series.estacion}
	//~ };
	//~ console.log({metadataElement:metadataElement,id:id})
	var md_keys = Object.keys(metadataElements[metadataElement].properties)
	for(var i in md_keys) {
		var key = md_keys[i]
		var value = $(this).find(".edit[name=" + key + "]").val()  
		if(metadataElements[metadataElement].properties[key].type == "boolean") {
			//~ value = $(this).find(".edit[name=" + key + "]").val()
			value = (value !== null) ? (value.toString() !== "") ? (value.toString() === "true") ? true : false : "" : ""
		}
		if(value.toString()=="") {
			if(metadataElements[metadataElement].properties.required) { // $(this).find(".edit[name=" + key + "]").attr("required")) {
				alert("Falta atributo " + key)
				$(this).find("button[type=submit]").prop('disabled', false);
				$("body").css("cursor", "default")
				return
			} 
		} else {
			if(metadataElements[metadataElement].properties[key].type == "number") {
				if(metadataElements[metadataElement].properties[key].step) {
					requestBody[objectName][key] = (parseFloat(value).toString() != "NaN") ? parseFloat(value) : null
				} else {
					requestBody[objectName][key] = (parseInt(value).toString() != "NaN") ? parseInt(value) : null
				}
			} else {
				requestBody[objectName][key] = value
			}
		}
	}
	if(metadataElement == "estacion") {
		requestBody[objectName].geom = {
			type: "point",
			coordinates: [
				parseFloat(requestBody[objectName].longitud),
				parseFloat(requestBody[objectName].latitud)
			]
		}
		requestBody[objectName].longitud = undefined
		requestBody[objectName].latitud = undefined
	}
	//~ console.log({requestBody:requestBody, requestUrl: metadataElements[metadataElement].endpoint + "/" + id})
	// comentar
				//~ $("div#myModalMetadata").modal("hide")
				//~ $("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
				//~ return
	//	
	var jqxhr = $.ajax({
		url: metadataElements[metadataElement].endpoint + "/" + id,
		type:"PUT",
		data:JSON.stringify(requestBody),
		contentType:"application/json; charset=utf-8",
		dataType:"json",
		success: function(response){
			$("body").css("cursor","default")
			console.log({response:response})
			if(!response.id) {
				alert("Nothing done")
				$("div#myModalMetadata").modal("hide")
				$("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
				return
			}
			alert("Se actualizaron los metadatos de " + objectName + " id:" + id)
			//~ $("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
			//~ updateMetadata({estacion:response.data})
			//~ $("div#myModalMetadata").modal("hide")
			location.reload()
		},
		error: function(xhr) {
			$("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
			$("body").css("cursor","default")
			if(xhr.responseText) {
				alert(xhr.responseText)
			} else {
				alert("Input error")
			}
			$('div#myModalMetadata').modal('hide')
		}
	})
}

function updateMetadata(newMetadata) {
	if(newMetadata.estacion) {
		global.series.estacion = newMetadata.estacion
		
	}
}

var metadataElements = {
	estacion: {
		properties: {
			tabla: {
				type: "select",
				title: "fuentes (red)",
				required: true
			},
			id: {
				type: "number",
				title: "id",
				required: true,
				disabled: true
			},
			nombre: {
				type: "text",
				title: "nombre",
				required: true
			},
			longitud: {
				type: "number",
				step: 0.000000001,
				title: "longitud",
				required: true
			},
			latitud: {
				type: "number",
				step: 0.000000001,
				title: "latitud",
				required: true
			},
			cero_ign: {
				type: "number",
				step: 0.000000001,
				title: "altitud/cero de escala",
				required: false
			},
			provincia: {
				type: "text",
				title: "provincia",
				required: false
			},
			pais: {
				type: "text",
				title: "país",
				required: false
			},
			rio: {
				type: "text",
				title: "río",
				required: false
			},
			automatica: {
				type: "boolean",
				title: "automática",
				required: false
			},
			propietario: {
				type: "text",
				title: "propietario",
				required: false
			},
			abrev: {
				type: "text",
				title: "abreviatura",
				required: false
			},
			url: {
				type: "text",
				title: "URL",
				required: false
			},
			localidad: {
				type: "text",
				title: "localidad",
				required: false
			},
			real: {
				type: "boolean",
				title: "real",
				required: false
			},
			nivel_alerta: {
				type: "number",
				step: 0.000000001,
				title: "nivel de alerta",
				required: false
			},
			nivel_evacuacion: {
				type: "number",
				step: 0.000000001,
				title: "nivel de evacuación",
				required: false
			},
			nivel_aguas_bajas: {
				type: "number",
				step: 0.000000001,
				title: "nivel de aguas bajas",
				required: false
			}
		},
		endpoint: "obs/puntual/estaciones",
		objectName: "estacion"
	},
	"var": {
		properties: {
			id: {
				type: "number",
				required: true,
				title: "id",
				disabled: true
			},
			"var": {
				type: "text",
				maxLength: 6,
				title: "código",
				required: true
			},
			nombre: {
				type: "text",
				maxLength: 6,
				title: "código",
				required: true
			},
			abrev:{
				type: "text",
				title: "abreviatura",
				required: false
			},
			type:{
				type: "select",
				title: "type",
				required: true,
				options: [{nombre:"numérico",valor:"num"},{nombre:"arreglo numérico",valor:"numarr"}].map(o=> '<option value="' + o.valor + '">' + o.nombre + '</option>').join(""),
				default: "num"
			},
			datatype:{
				type: "select",
				title: "dataType",
				required: true,
				options: ["Minimum","Average","Incremental","Continuous","Sporadic","Maximum","Cumulative","Constant Over Interval","Categorical"].map(o=> '<option value="' + o + '">' + o + '</option>').join(""),
				default: "Continuous"
			},
			valuetype:{
				type: "select",
				title: "valueType",
				required: true,
				options: ["Model Simulation Result","Field Observation","Derived Value","Sample"].map(o=> '<option value="' + o + '">' + o + '</option>').join(""),
				default: "Field Observation"
			},
			GeneralCategory: {
				type: "select",
				title: "GeneralCategory",
				required: true,
				options: ["Unknown","Water Quality","Climate","Hydrology","Biota","Geology"].map(o=> '<option value="' + o + '">' + o + '</option>').join(""),
				default: "Unknown"
			},
			VariableName:{
				type: "text",
				title: "VariableName",
				required: false
			},
			SampleMedium: {
				type: "select",
				title: "SampleMedium",
				required: true,
				options: ["Unknown","Surface Water","Ground Water","Sediment","Soil","Air","Tissue","Precipitation"].map(o=> '<option value="' + o + '">' + o + '</option>').join(""),
				default: "Unknown"
			},
			def_unit_id: {
				type: "number",
				title: "ID de unidades",
				required: true,
				default: 0
			},
			timeSupport: {
				type: "interval",
				title: "timeSupport",
				required: false,
				placeholder: "3 hours|03:00:00"
			},
			def_hora_corte: {
				type: "interval",
				title: "hora de corte",
				required: false,
				placeholder:"9 hours|09:00:00"
			}
		},
		endpoint: "obs/variables",
		objectName: "variable"
	}
}


function buildMetadataForm(metadataElement) {
	if(!metadataElements[metadataElement]) {
		console.log("metadataElement " + metadataElement + " not found")
		return
	}
	return $("<div></div>")
		.attr('id',metadataElement)
		.attr('style',"display: block;")
		.append(
		  $("<h4</h4>").attr('id',metadataElement+"Heading"),
		  $("<input hidden disabled=disabled name=metadataElement></input>").val(metadataElement), //~ $('<input hidden name=id class="confirm edit"></input>').val(global.series[metadataElement].id),
		  Object.keys(metadataElements[metadataElement].properties).map(key=>{
			var e = metadataElements[metadataElement].properties[key]
			var label = $('<label></label>').attr('for',key).text(e.title)
			var input
			if(e.type=="select") {
				//~ console.log(e.options)
				input = $('<select></select>')
					.append($(e.options))
			} else if(e.type=="boolean") {
				input = $('<select></select>')
				  .append(
					$('<option value="">desconocido</option>'),
					$('<option value="true">verdadero</option>'),
					$('<option value="false">falso</option>')
				  );
				if(global.series[metadataElement][key] !== null) {
					if(global.series[metadataElement][key].toString() != "") {
						//~ $(input).val('checked',true)
						$(input).val(global.series[metadataElement][key])
					}
				}
			//~ } else if (e.type=="interval") {
				//~ input = $('<input type=number style="length: 120px;">').after(
					//~ $('<select></select>)')
					  //~ .append(
						//~ ["milliseconds","seconds","minutes","hours","days","weeks","months","years"].map(a=> "<option value=" + a + ">" + a + "</option>")
					  //~ )
				//~ )
			} else {
				input = $('<input></input>')
				//~ if(e.type=="boolean") {
					//~ $(input).attr('type',"checkbox")
					//~ if(global.series[metadataElement][key]) {
						//~ $(input).attr('checked',true)
					//~ }
				//~ } else {
					$(input).attr('type',e.type)
				//~ }
				if(e.step) {
					$(input).attr('step',e.step)
				}
			}
			var value = (key == "longitud") ? global.series[metadataElement].geom.coordinates[0] : (key == "latitud") ? global.series[metadataElement].geom.coordinates[1] : (e.type == "interval") ? interval2string(global.series[metadataElement][key]) : global.series[metadataElement][key]
			$(input).attr('class', 'confirm edit')
					.attr('disabled',false)
					.attr('name',key)
					.attr('title',e.title)
					.val(value);
			if(e.required) {
				$(input).attr('required','required')
			}
			if(e.style) {
				$(input).attr('style',e.style)
			} else {
				$(input).attr('style',"width: 260px")
			}
			if(e.hidden) {
				$(input).attr('hidden',true)
			}
			if(e.placeholder) {
				$(input).attr('placeholder', e.placeholder)
			}
			if(e.disabled) {
				$(input).attr('disabled', 'disabled')
			}
			return $("<div></div>")
				.addClass("row")
				.append(
				  $("<div></div>")
					.addClass("col-sm")
					.append(label),
				  $("<div></div>")
					 .addClass("col-sm")
					 .append(input)
				);
		  }),
		  $("<div></div>")
		    .addClass("row")
		    .append("<button type=submit>Confirma</button>")
	    )
}

function buildMetadataForm2(mdElement,mdKey,formContainer,values={}) {
	if(!mdElement) {
		console.log("metadataElement not found")
		return
	}
	$("div#myModalMetadata form#confirm").submit(onSubmitMetadata)
	var formContent = $("<div></div>")
			.attr('id',mdKey)
			.attr('style',"display: block;")
			.append(
			  $("<h4></h4>").attr('id',"Heading"),
			  $('<div class=row>\
				<input type=file class="confirm upload" name=file style="display: none;">\
				<input type=text class="confirm upload" name=content readonly=readonly style="display: none;text-overflow: ellipsis: overflow: hidden; white-space: nowrap; width: 250px;">\
				</div>'),
			  Object.keys(mdElement.properties).map(key=>{
				var e = mdElement.properties[key]
				if(e.no_md) {
					return
				}
				var label = $('<label></label>').attr('for',key).text(e.title)
				var input
				if(e.type=="select" || e.type=="select_api") {
					if(!e.options) {
						input = $("<input></input>")
					} else {
						var options = e.options.map(o=> {
							if(typeof o == "object") {
								return '<option value="' + o.valor + '">' + o.nombre + '</option>'
							} else {
								return '<option value="' + o + '">' + o + '</option>'
							}
						}).join("")
						input = $('<select></select>').append(
							$('<option value=""></option>'),
							$(options)
						)
					}
				} else if(e.type=="boolean") {
					input = $('<select></select>')
					  .append(
						$('<option value="">desconocido</option>'),
						$('<option value="true">verdadero</option>'),
						$('<option value="false">falso</option>')
					  );
					if(values[key] && values[key] !== null) {
						if(values[key].toString() != "") {
							$(input).val(values[key])
						}
					}
				} else if (e.type == "geometry") {
					input = $('<textarea></textarea>')
				} else {
					input = $('<input></input>')
						$(input).attr('type',e.type)
					if(e.step) {
						$(input).attr('step',e.step)
					}
				}
				var value = (key == "longitud") ? (values.geom) ? values.geom.coordinates[0] : null : (key == "latitud") ? (values.geom) ? values.geom.coordinates[1] : null : (e.type == "interval") ? interval2string(values[key]) : values[key]
				if (key == "longitud_exutorio") {
					value = (values.exutorio) ? values.exutorio.coordinates[0] : null
				} else if (key == "latitud_exutorio") {
					value = (values.exutorio) ? values.exutorio.coordinates[1] : null
				} else if (e.type == "geometry") {
					value = (typeof values[key] == "object") ?  JSON.stringify(values[key]) : null
				}
				var input_title = (e.description) ? e.description : (e.type == "text") ? "Introduzca una cadena de caracteres" : (e.type == "number") ? (e.step) ? "Introduzca un número decimal" : "Introduzca un número entero" : (e.type == "select" || e.type == "select_api" || e.type == "boolean") ? "Seleccione un elemento de la lista" : (e.type == "interval") ? "Introduzca un intervalo temporal (p.ej: '3 hours' o '03:00:00')" : e.title
				$(input).attr('class', 'confirm edit')
						.attr('disabled',false)
						.attr('name',key)
						.attr('title',input_title)
						.val(value);
				if(e.required) {
					$(input).attr('required','required')
				}
				if(e.style) {
					$(input).attr('style',e.style)
				} else {
					$(input).attr('style',"width: 260px")
				}
				//~ if(e.hidden) {
					//~ $(input).attr('hidden',true)
				//~ }
				if(e.placeholder) {
					$(input).attr('placeholder', e.placeholder)
				}
				if(e.disabled) {
					$(input).attr('disabled', 'disabled')
				}
				if(parseInt(e.min).toString() != 'NaN') {
					$(input).attr('min',e.min)
				}
				return $("<div></div>")
					.addClass("row")
					.append(
					  $("<div></div>")
						.addClass("col-sm")
						.append(label),
					  $("<div></div>")
						 .addClass("col-sm")
						 .append(input)
					);
			  }),
			  $("<div></div>")
				.addClass("row")
				.append(
					$("<button type=submit>Confirma</button>")
				)
			)
	//~ console.log(formContent)
	$(formContainer).empty().append(formContent)
	$(formContainer).find("input.confirm.upload[name=file]").change( evt=> {
	    var files = evt.target.files;
	    var file = files[0];
	    var reader = new FileReader();
	    reader.onload = function(event) {
			var content = JSON.parse(event.target.result)
			//~ if(!Array.isArray(content)) {
				//~ content = [content]
			//~ }
			console.log(content)
			$(formContainer).find("input.confirm.upload[name=content]").val(JSON.stringify(content))
	    }
	    reader.readAsText(file)
    })
	return
}

function setMetadataForm(mdElement,mdKey,formContainer,values={},action='create') {
	$(formContainer).find("input.confirm.upload").removeAttr('required').hide()
	console.log(values)
	switch(action) {
		case "create":
			$("div#myModalMetadata div.modal-content div.modal-header h4.modal-title").text("Crear " + mdElement.objectName)
			$(formContainer).find(".confirm.edit").val("").show()
			$(formContainer).find("label").show()
			$(formContainer).attr('action','#create').attr('method',"POST")
			$(formContainer).find("button[type=submit]").removeAttr('formnovalidate')
			$(formContainer).find("input.confirm.edit[name=id]").removeAttr('required')
			//~ $(formContainer).find("button[type=submit]").unbind('submit').submit(onSubmitMetadata)
			break;
		case "upload":
			$("div#myModalMetadata div.modal-content div.modal-header h4.modal-title").text("Importar " + mdElement.objectName + " (JSON)")
			$(formContainer).find(".confirm.edit").hide()
			$(formContainer).find("label").hide()
			$(formContainer).find("input.confirm.upload").attr('required','required').show()
			$(formContainer).attr('action','#upload').attr('method','POST')
			$(formContainer).find("button[type=submit]").attr('formnovalidate',"formnovalidate")
			break;
		case "edit":
			$("div#myModalMetadata div.modal-content div.modal-header h4.modal-title").text("Editar " + mdElement.objectName)
			$(formContainer).find(".confirm.edit").each((i,e)=>{
				var key = $(e).attr('name')
				var value = (key == "longitud") ? (values.longitud) ? values.longitud : (values.geom) ? values.geom.coordinates[0] : null : (key == "latitud") ? (values.latitud) ? values.latitud : (values.geom) ? values.geom.coordinates[1] : null : (e.type == "interval") ? interval2string(values[key]) : (typeof values[key] == "object") ? JSON.stringify(values[key]) : values[key]
				$(e).val(value)
			}).show()
			$(formContainer).find("label").show()
			$(formContainer).attr('action','#edit').attr('method','PUT')
			$(formContainer).find("button[type=submit]").removeAttr('formnovalidate')
			$(formContainer).find("input.confirm.edit[name=id]").attr('required','required')
			//~ $(formContainer).find("button[type=submit]").unbind('submit').submit(onSubmitMetadata)
			break;
		case "delete":
			$("div#myModalMetadata div.modal-content div.modal-header h4.modal-title").text("Eliminar " + mdElement.objectName + " id:" + values.id)
			$(formContainer).find(".confirm.edit").hide()
			$(formContainer).find("label").hide()
			$(formContainer).find(".confirm.edit[name=id]").val(values.id).attr('required','required')
			$(formContainer).attr('action','#delete').attr('method','DELETE')
			$(formContainer).find("button[type=submit]").attr('formnovalidate',"formnovalidate")
			//~ $(formContainer).find("button[type=submit]").unbind('submit').submit(onSubmitMetadataRemove)
			break;		
		default:
			console.error("bad action")
			return
			break;
	}
	$("div#myModalMetadata").modal("show")
}

function onSubmitMetadata(event) {
	$(this).find("button[type=submit]").prop('disabled', true);
	event.preventDefault()
	$("body").css("cursor", "progress")
	var action = $(this).attr('action').replace(/^#/,"")
	var id = $(this).find("input[name=id]").val()
	var requestBody = {}
	var objectName = global.mdElement.objectName
	var objectNamePlural = global.mdElement.objectNamePlural
	requestBody[objectName] = {}
	var md_keys = Object.keys(global.mdElement.properties).filter(p=>(!global.mdElement.properties[p].no_md && global.mdElement.properties[p].edit))
	if(action != "delete" && action != "upload") {
		for(var i in md_keys) {
			var key = md_keys[i]
			var value = $(this).find(".edit[name=" + key + "]").val()  
			if(global.mdElement.properties[key].type == "boolean") {
				//~ value = $(this).find(".edit[name=" + key + "]").val()
				value = (value !== null) ? (value.toString() !== "") ? (value.toString() === "true") ? true : false : "" : ""
			}
			if(value.toString()=="") {
				if(global.mdElement.properties.required) { // $(this).find(".edit[name=" + key + "]").attr("required")) {
					alert("Falta atributo " + key)
					$(this).find("button[type=submit]").prop('disabled', false);
					$("body").css("cursor", "default")
					return
				} 
			} else if (global.mdElement.properties[key].type == "geometry") {
				if(typeof value == "string") {
					requestBody[objectName][key] = JSON.parse(value)
				} else {
					requestBody[objectName][key] = value
				}
			} else {
				if(global.mdElement.properties[key].type == "number") {
					if(global.mdElement.properties[key].step) {
						requestBody[objectName][key] = (parseFloat(value).toString() != "NaN") ? parseFloat(value) : null
					} else {
						requestBody[objectName][key] = (parseInt(value).toString() != "NaN") ? parseInt(value) : null
					}
				} else {
					requestBody[objectName][key] = value
				}
			}
		}
		if(global.mdKey == "estacion") {
			requestBody[objectName].geom = {
				type: "point",
				coordinates: [
					parseFloat(requestBody[objectName].longitud),
					parseFloat(requestBody[objectName].latitud)
				]
			}
			delete requestBody[objectName].longitud
			delete requestBody[objectName].latitud
		}
		if(global.mdKey == "area") {
			if(requestBody[objectName].longitud_exutorio && requestBody[objectName].latitud_exutorio) {
				requestBody[objectName].exutorio = {
					type: "point",
					coordinates: [
						parseFloat(requestBody[objectName].longitud_exutorio),
						parseFloat(requestBody[objectName].latitud_exutorio)
					]
				}
			} else {
				requestBody[objectName].exutorio = null
			}
			delete requestBody[objectName].longitud_exutorio
			delete requestBody[objectName].latitud_exutorio
		}
	}
	var ajaxParams = {}
	//~ var url = buildMetadataSearchRequestUrl(global.mdElement,
	switch(action) {
		case "edit": 
			ajaxParams = {
				url: global.mdElement.endpoint + "/" + id,
				type: "PUT",
				data: JSON.stringify(requestBody),
				contentType:"application/json; charset=utf-8",
				dataType:"json",
				success: function(response){
					$("body").css("cursor","default")
					//~ console.log({response:response})
					if(!response.id) {
						alert("Nothing done")
						$("div#myModalMetadata").modal("hide")
						$("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
						return
					}
					alert("Se actualizaron los metadatos de " + objectName + " id:" + id)
					//~ $("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
					//~ updateMetadata({estacion:response.data})
					//~ $("div#myModalMetadata").modal("hide")
					loadMDElement(response)//~ location.reload()
					//~ for(var i in global.features) {
						//~ if(global.features[i].id == response.id) {
							//~ global.features[i] = response
						//~ }
					//~ }
					global.selectedFeature = response
					$("div#myModalMetadata").modal('hide')
					$("form#selectorform").submit()
				}
			}
			break;
		case "create":
			var requestBodyP = {}
			requestBodyP[objectNamePlural] = [requestBody[objectName]]
			ajaxParams = {
				url: global.mdElement.endpoint,
				type: "POST",
				data: JSON.stringify(requestBodyP),
				contentType:"application/json; charset=utf-8",
				dataType:"json",
				success: function(response){
					$("body").css("cursor","default")
					console.log({response:response})
					if(!response[0] || !response[0].id) {
						alert("Nothing done")
						$("div#myModalMetadata").modal("hide")
						$("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
						return
					}
					alert("Se creó el elemento " + objectName + " id:" + response[0].id)
					global.selectedFeature = response
					loadMDElement(response[0])//~ location.reload()
					$("div#myModalMetadata").modal('hide')
					$("form#selectorform").submit()
				}
			}
			break;
		case "upload": 
			var requestBodyP = $("input.confirm.upload[name=content]").val()
			//~ console.log(requestBodyP)
			if(requestBodyP == "") {
				alert("Archivo no válido o ausente")
				return
			}
			//~ requestBodyP[objectNamePlural] = [requestBody[objectName]]
			ajaxParams = {
				url: buildMetadataUploadRequestUrl(global.mdElement),
				type: "POST",
				data: requestBodyP,
				contentType:"application/json; charset=utf-8",
				dataType:"json",
				success: function(response){
					$("body").css("cursor","default")
					console.log({response:response})
					if(!response[0] || !response[0].id) {
						alert("Nothing done")
						$("div#myModalMetadata").modal("hide")
						$("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
						return
					}
					alert("Se creó el elemento " + objectName + " id:" + response[0].id)
					//~ global.selectedFeature = response
					//~ loadMDElement(response[0])//~ location.reload()
					$("div#myModalMetadata").modal('hide')
					//~ $("form#selectorform").submit()
				}
			}
			break;
		case "delete": 
			ajaxParams = {
				url: global.mdElement.endpoint + "/" + id,
				type: "DELETE",
				dataType: "json",
				success: function(response){
					$("body").css("cursor","default")
					console.log({response:response})
					if(!response.id) {
						alert("Nothing done")
						$("div#myModalMetadata").modal("hide")
						$("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
						return
					}
					alert("Se eliminó el elemento " + objectName + " id:" + id)
					global.selectedFeature = undefined
					$("div#myModalMetadata").modal('hide')
					loadMDElement()//~ location.reload()
					$("form#selectorform").submit()
				}
			}
			break;
		default:
			console.error("bad action")
			return
			break;
	}
	ajaxParams.error = function(xhr) {
		$("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
		$("body").css("cursor","default")
		if(xhr.responseText) {
			alert(xhr.responseText)
		} else {
			alert("error")
		}
		$('div#myModalMetadata').modal('hide')
	}
	// comentar
				//~ console.log({requestBody:ajaxParams.data, requestUrl: ajaxParams.url, method: ajaxParams.type})
				//~ $("div#myModalMetadata").modal("hide")
				//~ $("div#myModalMetadata form#confirm").find("button[type=submit]").prop('disabled',false)
				//~ $("body").css("cursor","default")
				//~ return
	//	
	global.metadataRequest = $.ajax(ajaxParams)
}

function onCloseModalHide (event) {
	console.log("modal close 1")
	$("body").css("cursor","default")
		if(global.metadataRequest && (global.metadataRequest.status < 200 || global.metadataRequest.status  >299)) {
		global.metadataRequest.abort("Solicitud abortada por el usuario")
	}
	$("div#myModalMetadata form#confirm button[type=submit]").prop('disabled',false)
}

function onCloseModalDownload(e) {
	$(e.target).find("a.download-link").attr("href",null).text("")
}
//~ function onSubmitMetadataCreate(event) {
	//~ $(this).find("button[type=submit]").prop('disabled', true);
	//~ event.preventDefault()
	//~ $("body").css("cursor", "progress")
	
	
//~ }

//~ function onSubmitMetadataRemove(event) {
	//~ $(this).find("button[type=submit]").prop('disabled', true);
	//~ event.preventDefault()
	//~ $("body").css("cursor", "progress")
	
	
//~ }

function interval2string(interval) {
	if(!interval) {
		return ""
	}
	if(interval === null) {
		return ""
	} else if(interval instanceof Object) {
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

function buildFilter(metadataObject,filterContainer,editFormContainer) {
	if(!metadataObject) {
		console.log("metadataObject is undefined")
		return
	}
	return Promise.all(
		Object.keys(metadataObject.properties).filter(key=> metadataObject.properties[key].filter).map(key=>{
			var e = metadataObject.properties[key]
			var promise
			if(e.type=="select") {
				//~ console.log(e.options)
				var options = e.options.map(o=>{
					if(typeof o == "object") {
						return '<option value="' + o.valor + '">' + o.nombre + ' ['  + o.valor + ']</option>'
					} else {
						return '<option value="' + o + '">' + o + '</option>'
					}
				}).join("")
				var input = $('<select></select>')
				if(!e.requiredInFilter) {
					input.append($('<option value=""></option>'))
				} else {
					input.attr('required','required')
				}
				input.append($(options))
				promise = Promise.resolve(input)
			} else if(e.type=="select_api") {
				promise = fetch(e.api.url)
				.then(response=>{
					return response.json()
				})
				.then(json=>{
					var g_options = []
					var options = json.map(o=>{
						g_options.push(o[e.api.value_prop])
						return '<option value="' + o[e.api.value_prop] + '">' + o[e.api.name_prop] + '</option>'
					}).join("")
					metadataObject.properties[key].options = g_options
					return $('<select></select>').append(
						$('<option value=""></option>'),
						$(options)
					)
				})
			} else if(e.type=="boolean") {
				promise = Promise.resolve($('<select></select>')
				  .append(
					$('<option value=""></option>'),
					$('<option value="true">verdadero</option>'),
					$('<option value="false">falso</option>')
				  ));
			} else if(e.type=="bbox") {
				var input = $('<input></input>').attr({type:"text",pattern:"^\\s*-?\\d+(\\.\\d+)?\\s*,\\s*-?\\d+(\\.\\d+)?((\\s*,\\s*-?\\d+(\\.\\d+)?){2})?$"}).addClass("bbox")
				promise = Promise.resolve(input)
			} else {
				var input = $('<input></input>')
				$(input).attr('type',e.type)
				if(e.step) {
					$(input).attr('step',e.step)
				}
				promise = Promise.resolve(input)
			}
			return promise
			.then(input=>{
				var label = $('<label></label>').attr('for',key).text(e.title)
				var input_title = (e.description) ? e.description : (e.type == "text") ? "Introduzca un patrón de búsqueda" : (e.type == "number") ? (e.step) ? "Introduzca un número decimal" : "Introduzca un número entero" : (e.type == "select" || e.type == "select_api" || e.type == "boolean") ? "Seleccione un elemento de la lista" : (e.type == "interval") ? "Introduzca un intervalo temporal (p.ej: '3 hours' o '03:00:00')" : e.title
				$(input).addClass('form-control')
						.attr('name', (e.filterName) ? e.filterName : key)
						.attr('title',input_title)
				if(e.style) {
					$(input).attr('style',e.style)
				} 
				if(e.placeholder) {
					$(input).attr('placeholder', e.placeholder)
				}
				if(parseInt(e.min).toString() != 'NaN') {
					$(input).attr('min',e.min)
				}
				if(e.filterRequired) {
					$(input).attr('required',true)
				}
				return $('<div></div>').append(
					$(label),
					$(input)
				)
			})
		})
	)
	.then(inputs=>{
		//~ console.log(inputs)
		$(filterContainer).empty().append(
			$('<div></div>')
				.addClass("filter-container")
				.attr('id',"filters")
				.css('background-color','#6a96ff')
				.append(
					inputs,
					$("<div></div>")
						.addClass("row")
						.append("<button type=submit>Buscar</button>")
				)
		);
		//~ $(filterContainer).find(".form-control[type=datetime-local]").datetimepicker()
		return setFilterValuesFromUrlParams(filterContainer) // returns integer count of filters 
	})
}

function setFilterValuesFromUrlParams(filterContainer) {
	const urlParams = new URLSearchParams(window.location.search);
	var count = 0
	for(const key of Object.keys(global.mdElement.properties)) {
		var filterName = (global.mdElement.properties[key].filterName) ? global.mdElement.properties[key].filterName : key 
		if (urlParams.get(filterName) !== null) {
			$(filterContainer).find(".form-control[name=" + filterName + "]").val(urlParams.get(filterName))
			count++
		}
	}
	return count
}

function onSubmitMetadataSearch(event,metadataElement) {
	$(this).find("button[type=submit]").prop('disabled', true);
	event.preventDefault()
	$("body").css("cursor", "progress")
	const formData = new FormData(event.target) 
	var searchParams = new URLSearchParams(formData)
	var requestUrl = buildMetadataSearchRequestUrl(metadataElement,formData)
	global.lastSearchParams = searchParams
	//~ console.log({requestUrl:requestUrl})
	return fetch(requestUrl)
	.then(response=>{
		$("body").css("cursor","default")
		//~ console.log({response:response})
		if(!response.ok) {
			//~ alert("Error en la consulta: " + response.statusText)
			var errorMessage = response.statusText
			return response.json()
			.then(content=> {
				var errorMessage = response.statusText
				if(content.error) {
					errorMessage = content.error
				} else if(content.message) {
					errorMessage = content.message
				}
				console.log("Error en la consulta: " + errorMessage)
				throw("Error en la consulta: " + errorMessage)
			})
		}
		return response.json()
	}).then(content=>{
		//~ console.log(content)
		alert("Se encontraron " + content.length + " resultados de " + metadataElement.objectName)
		$(this).find("button[type=submit]").prop('disabled',false)
		return content
	})
	.catch(error=>{
		$(this).find("button[type=submit]").prop('disabled',false)
		$("body").css("cursor","default")
		if(error) {
			//~ alert(error.toString())
			throw(error)
		} else {
			//~ alert("Error en la consulta")
			throw("Error en la consulta")
		}
	})
}

function showLastFilterParams() {
	$("section#lastfilterparams").empty().append($("<h4>Filtros</h4>"))
	if(!global.lastSearchParams) {
		return
	}
	for (const [key, value] of global.lastSearchParams) {
		if(value != "") {
			$("section#lastfilterparams").append(
				$("<div></div>").text( key + ": " + value)
			)
		}
	}
}


function buildMetadataSearchRequestUrl(metadataElement,searchParams,useEndpoint2) {
	var formData = new URLSearchParams(searchParams)
	var baseurl = (useEndpoint2) ? metadataElement.endpoint2 : metadataElement.endpoint
	var keys = Object.keys(metadataElement.properties)
	for(var key of keys) {
		var property = metadataElement.properties[key]
		//~ console.log(key + ":" + formData.get(key))
		if(property.where && property.where=="path") {
			var regexp = "{" + key + "}"
			baseurl = baseurl.replace(regexp,formData.get(key))
			formData.delete(key)
		}
	}
	//~ console.log(baseurl)
	if(metadataElement.fixedParameters) {
		var fp_keys = Object.keys(metadataElement.fixedParameters)
		for(var key of fp_keys) {
			formData.set(key,metadataElement.fixedParameters[key])
		}
	}
	var searchParams = new URLSearchParams(formData)
	return baseurl + "?" + searchParams.toString()
}

function buildMetadataUploadRequestUrl(metadataElement,useEndpoint2) {
	var baseurl = (useEndpoint2) ? metadataElement.endpoint2 : metadataElement.endpoint
	var keys = Object.keys(metadataElement.properties)
	for(var key of keys) {
		var property = metadataElement.properties[key]
		//~ console.log(key + ":" + formData.get(key))
		if(property.where && property.where=="path" && property.value) {
			var regexp = "{" + key + "}"
			baseurl = baseurl.replace(regexp,property.value)
		}
	}
	return baseurl
}

function makeMDTable(metadataElement,container,isWriter) {
	if(!isWriter) { 
		$(container).find("button.add-new").hide()
		$(container).find("button.upload-new").hide()
		$(container).find("button.remove-selected").hide()
		$(container).find("button.import-csv").hide()
	}
	// create table header
	$(container).find("table.md_edit_table thead tr").append(
		Object.keys(metadataElement.properties).map(key=> {
			var prop = metadataElement.properties[key];
			if(!prop.no_md) {
				var data_formatter = (prop.type == "geometry") ? "cellAttrGeom" : "cellAttr"
				return $('<th data-sortable="true" data-formatter="' + data_formatter + '"></th>').text(prop.title).attr('data-field',key);
			}
		})
	)
	// create popover
	$(container).popover({
		html: true,
		template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
		trigger: "click",
		content: function() {
			return "<div class=popovercontent id="+$(this).parent().parent().attr('data-uniqueid')+"></div>"
		},
		selector: "a[data-toggle=popover]"  // "table.series_edit_table tr td:nth-child(n+3)"
	})
	.on('show.bs.popover', function (evt) {
		//~ $(cells).parent('tr[data-toggle="popover"][data-uniqueid!='+$(evt.target).parent().attr('data-uniqueid')+']').find("td:nth-child(n+3)").popover('hide')
		$(container).find("a[data-toggle=popover]").popover('hide')
	})
	.on('shown.bs.popover', function (evt) {
		//~ console.log("popover shown")
		$("div#"+$(evt.target).parent().parent().attr('data-uniqueid')+".popovercontent").empty().append(
			$("<button>ver metadatos</button>").attr({
				id: $(evt.target).parent().parent().attr('data-uniqueid')
			}).on('click',getMDElementHandler)						
		)
	})		
	// instantiate bootstrapTable
	var $bstable = $(container).find("table.md_edit_table").bootstrapTable({
		onSort: ()=> {
			$(container).find("a[data-toggle=popover]").popover("hide")
			$("body").find("div.popover").hide()
			//~ addPopoverToRows($(container).find("table.series_edit_table tr td:nth-child(n+3)"))
		},
		onSearch: ()=> {
			//~ console.log("searching")
			$(container).find("a[data-toggle=popover]").popover("hide")
			$("body").find("div.popover").hide()
			//~ addPopoverToRows($(container).find("table.series_edit_table tr td:nth-child(n+3)"))
		},
		onPageChange: () => {
			$(container).find("a[data-toggle=popover]").popover("hide")
			$("body").find("div.popover").hide()
		}
	})
	// add button actions
	$(container).on("click", ".edit", function(){		
		$(this).tooltip('hide')
		var id = $(this).parents("tr").attr("data-uniqueid") // find("td:first-child").eq(1).html()
		var oldData = $(container).find("table.md_edit_table").bootstrapTable('getRowByUniqueId',id)
		setMetadataForm(global.mdElement,global.mdKey,$("div#myModalMetadata form#confirm"),oldData,"edit")
	})
	$(container).on("click", ".delete", function(){		
		$(this).tooltip('hide')
		var id = $(this).parents("tr").attr("data-uniqueid") // find("td:first-child").eq(1).html()
		setMetadataForm(global.mdElement,global.mdKey,$("div#myModalMetadata form#confirm"),{id:id},"delete")
	})
	$(container).on("click", ".view", function(){		
		$(this).tooltip('hide')
		var id = $(this).parents("tr").attr("data-uniqueid") // find("td:first-child").eq(1).html()
		var content = $(container).find("table.md_edit_table").bootstrapTable('getRowByUniqueId',id)
		loadMDElement(content)
	})
	// select all rows on all pages on click
	$(container).find(".select-all").click(function(){
		//~ $(container).find("table.series_edit_table").bootstrapTable('togglePagination')
		$(container).find("table.md_edit_table").bootstrapTable('checkAll')
		//~ $(container).find("table.series_edit_table").bootstrapTable('togglePagination')
	})
	// invert row selection on all pages on click
	$(container).find(".invert-select").click(function(){
		$(container).find("table.md_edit_table").bootstrapTable('checkInvert')
	})
	$(container).find(".export-csv").click(e=>{
		exportCSV(e,false)
	}) 
	// Export All CSV data
	$(container).find(".export-csv-all").click(e=>{
		exportCSV(e,true)
	})
		//~ function(){
			//~ var data = $(container).find("table.series_edit_table").bootstrapTable('getData')
			//~ var header = "tipo,series_id,estacion_id,var_id,proc_id,unit_id,timestart,timeend\n"
			//~ var csv = header + seriesarr2csv(data)
			//~ var gblob = new Blob([csv], {type: "octet/stream"})
			//~ var gurl = window.URL.createObjectURL(gblob);
			//~ $("div#myModalSeries span#exportcsv a").attr('href',gurl).html("All " + data.length + " rows to download as CSV").on("click", e=>{
			//~ })
			//~ var exportjsonurl = window.location.origin + window.location.pathname.replace(/[^/]*$/,"") + "getMonitoredPoints?" + Object.keys(global.monitoredpointsparams).map(k=> k + "=" + global.monitoredpointsparams[k]).join("&")
			//~ $("div#myModalSeries span#exportjson input#exportjsonurlseries").val(exportjsonurl).removeAttr("disabled")
			//~ $("div#myModalSeries span#exportcsv").show()
			//~ $("div#myModalSeries span#exportjson").show()
			//~ $("div#myModalSeries div#authentication").hide()
			//~ $("div#myModalSeries div#authentication input").attr("disabled",true)
			//~ $("div#myModalSeries").modal('show').on('hide.bs.modal', function (e) {
				//~ $(e.target).find("span#exportcsv").hide()
				//~ $(e.target).find("span#exportjson").hide()
				//~ $("div#myModalSeries span#exportjson input#exportjsonurlseries").val("").attr("disabled","disabled")
				//~ $(e.target).find("span#exportcsv a").attr("href",null)
				//~ $(e.target).find("div#authentication").show()
				//~ $(e.target).find("div#authentication input").attr("disabled",false)
			//~ })
		//~ })
	$(container).find("table.md_edit_table").on('check.bs.table', ()=>{
	   $(container).find("button.remove-selected").removeAttr('disabled')
	   $(container).find("button.export-csv").removeAttr('disabled')
	})
	$(container).find("table.md_edit_table").on('check-all.bs.table',()=>{
	  var checked = $(container).find("table.md_edit_table").bootstrapTable('getAllSelections')
	  if (checked.length > 0) {
		$(container).find("button.remove-selected").removeAttr('disabled')
		$(container).find("button.export-csv").removeAttr('disabled')
	  } else {
		$(container).find("button.remove-selected").attr('disabled','true')
		$(container).find("button.export-csv").attr('disabled','true')
	  }
	})
	$(container).find("table.md_edit_table").on('uncheck.bs.table', ()=>{
	  var checked = $(container).find("table.md_edit_table").bootstrapTable('getAllSelections')
	  if (checked.length > 0) {
		$(container).find("button.remove-selected").removeAttr('disabled')
		$(container).find("button.export-csv").removeAttr('disabled')
	  } else {
		$(container).find("button.remove-selected").attr('disabled','true')
		$(container).find("button.export-csv").attr('disabled','true')
	  }
	})
	$(container).find("button.export-csv").attr('disabled','true')
	return Promise.resolve()
} 

function exportCSV(e,all){
	$("div#myModalDownload span#exportjson").hide()
	var data = (all) ? $("table.md_edit_table").bootstrapTable('getData',{unfiltered:true}) : $("table.md_edit_table").bootstrapTable('getAllSelections')
	data.forEach(it=> {
		delete it.action
	})
	var headers = $("table.md_edit_table").bootstrapTable('getVisibleColumns').map(it => it.field).filter(it=> (it != "action"))
	var csv = md2csv(headers,data)
	//~ console.log(csv)
	var gblob = new Blob([csv], {type: "octet/stream"})
	var gurl = window.URL.createObjectURL(gblob);
	$("div#myModalDownload a.download-link")
	.attr('href',gurl)
	.text("Descargar CSV (" + data.length + " registros)")
	.attr("download",global.mdKey + ".csv")
	//~ .on("click", e=>{
		//~ $("#myModal").modal("hide")
	//~ })
	if(all && global.lastSearchParams) {
		var url = buildMetadataSearchRequestUrl(global.mdElement, global.lastSearchParams)
		$("div#myModalDownload a.download-link-json")
		.attr('href',url) // global.mdElement.endpoint + "?" + global.lastSearchParams.toString())
		.text("Descargar JSON (" + data.length + " registros)")
		.attr("download",global.mdKey + ".json")
		//~ $("div#myModalDownload input.api-link")
		//~ .val(new URL (global.mdElement.endpoint + "?" + global.lastSearchParams.toString(),document.baseURI).href)
		$("div#myModalDownload span#exportjson").show()
		if(global.mdElement.endpoint2) {
			var url2 = buildMetadataSearchRequestUrl(global.mdElement, global.lastSearchParams,true) + "&format=mnemos"
			$("div#myModalDownload a.download-link-mnemos")
			.attr('href',url2)
			.text("Descargar Mnemos (" + data.length + " registros)")
			.attr("download",global.mdKey + ".mnemos.csv")
			$("div#myModalDownload span#exportmnemos").show()
		}
		if(global.mdElement.properties.geom) {
			$("div#myModalDownload a.download-link-geojson")
			.attr('href',url + "&format=geojson") // global.mdElement.endpoint + "?" + global.lastSearchParams.toString())
			.text("Descargar GeoJSON (" + data.length + " registros)")
			.attr("download",global.mdKey + ".geojson")
			//~ $("div#myModalDownload input.api-link")
			//~ .val(new URL (global.mdElement.endpoint + "?" + global.lastSearchParams.toString(),document.baseURI).href)
			$("div#myModalDownload span#exportgeojson").show()
		}
	}
	$("div#myModalDownload").modal('show')
}

function md2csv(headers,data) {
	return JSON.stringify(headers).slice(1,-1) + "\n" + data.map(d=>{
		return JSON.stringify(headers.map(i=> d[i])).slice(1,-1)
	}).join("\n")
}

function loadMDTable(content,container,isWriter) {
	var actions = '<a class="edit" title="Editar" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a> ' +
						'<a class="delete" title="Eliminar" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>' +
						'<a class="view" title="Ver metadatos" data-toggle="tooltip"><i class="material-icons">adjust</i></a>'
	var public_actions = '<a class="view" title="Ver metadatos" data-toggle="tooltip"><i class="material-icons">adjust</i></a>'
	// parse result into table rows
	var rows = content.map(f=>{
		//~ console.log({feature:f})
		var row = {}
		Object.keys(global.mdElement.properties).forEach(key=>{
			var prop = global.mdElement.properties[key]
			var value = (key == "longitud") ? (f.geom) ? f.geom.coordinates[0] : 'undefined' : (key == "latitud") ? (f.geom) ? f.geom.coordinates[1] : 'undefined' : (prop.type == "interval") ? interval2string(f[key]) : f[key]
			if(key == "longitud_exutorio") {
				value = (f.exutorio) ? f.exutorio.coordinates[0] : 'undefined'
			} else if(key == "latitud_exutorio")  {
				value = (f.exutorio) ? f.exutorio.coordinates[1] : 'undefined'
			} else if (prop.type == "geometry") {
				value = (typeof f[key] == "object") ? JSON.stringify(f[key]) : 'undefined'
			} else if (prop.type == "array") {
				// value = featuresArray2table(f[key],prop.items)//
				value = (typeof f[key] == "object") ? JSON.stringify(f[key]) : 'undefined'
			}
			row[key] = value 
		})
		row.action = (isWriter) ? actions : public_actions
		return row
	})
	//replace old rows by new
	$(container).find("table.md_edit_table").bootstrapTable("removeAll").bootstrapTable("append",rows)
	window.dispatchEvent(new Event('resize'));
}

// function featuresArray2table(features,featureType) {
// 	var headers = global.md

// }

function cellAttr(value) {
	var cellval
	if(typeof value == "string" && value.length > 40) {
		cellval = value.substring(0,40) + "..."
	} else {
		cellval = value
	}
	//~ var cellval = value
	return '<a 	style="cursor:pointer" data-toggle=popover data-placement=top title="acción">' + cellval + '</a>'
}

function cellAttrGeom(value) {
	return '<a 	style="cursor:pointer" data-toggle=popover data-placement=top title="acción">' + value.substring(0,40)  + '...</a>'
}

function getMDElementHandler(event) {
	var id = $(event.target).attr('id')
	$("div.popover").remove()
	loadMDElement($("table.md_edit_table").bootstrapTable("getRowByUniqueId",id))
	//~ getMDElementByID(id)
	//~ .then(content=>{
		//~ $("div.popover").remove()
		//~ loadMDElement(content)
	//~ })
}

function getMDElementByID(id) {
	$("body").css("cursor","progress")
	return fetch(global.mdElement.endpoint + "/" + id)
	.then(response=>{
		$("body").css("cursor","default")
		//~ console.log({response:response})
		if(!response.ok) {
			alert("Error en la consulta. Ver consola")
			console.log({statusText:response.statusText})
			return
		}
		return response.json()
	}).then(content=>{
		if(!content) {
			throw("no se encontró el elemento " + global.mdElement.objectName + " id:" + id)
		}
		alert("Se encontró el elemento " + global.mdElement.objectName + " id:" + id)
		$(this).find("button[type=submit]").prop('disabled',false)
		return content
	})
	.catch(error=>{
		$(this).find("button[type=submit]").prop('disabled',false)
		$("body").css("cursor","default")
		if(error) {
			alert(error.toString())
		} else {
			alert("Error en la consulta")
		}
	})
}

function loadMDElement(content) {
	global.selectedFeature = content 
	var feature = {...global.selectedFeature}
	delete feature.action
	var headers = $("table.md_edit_table").bootstrapTable('getVisibleColumns').map(it => it.field).filter(it=> (it != "action"))
	var csv = md2csv(headers,[feature])
	//~ console.log(csv)
	var gblob = new Blob([csv], {type: "octet/stream"})
	var gurl = window.URL.createObjectURL(gblob);
	if(!content) {
		$("div.tab-pane#general").empty().append(
			$('<div style="display:flex; justify-content: space-between;" id=generalHeadingRow></div>').append(
				$("<p>Realice una búsqueda y luego seleccione un elemento en la tabla o el mapa</p>"),
				$('<a class="add" title="Crear nuevo" data-toggle="tooltip"><i class="material-icons">add</i></a>')
				.click(event=>{
					setMetadataForm(global.mdElement,global.mdKey,$("div#myModalMetadata form#confirm"),global.selectedFeature,"create")
				})
			)
		)
		return
	}
	var actions = [$('<a class="export-feature-csv" title="descargar csv" data-toggle="tooltip" target=_blank style="color: black;"><i class="fa fa-download" aria-hidden="true"></i>csv</a>')
		.attr('href',gurl)
		.attr("download",global.mdKey + ".csv"),
		$('<a class="export-feature-json" title="descargar json" data-toggle="tooltip" target=_blank style="color: black;"><i class="fa fa-download" aria-hidden="true"></i>json</a>')
		.attr('href',global.mdElement.endpoint + "/" + global.selectedFeature.id),
		$('<a class="export-feature-geojson" title="descargar geojson" data-toggle="tooltip" target=_blank style="color: black;"><i class="fa fa-download" aria-hidden="true"></i>geojson</a>')
		.attr('href',global.mdElement.endpoint + "/" + global.selectedFeature.id + "?format=geojson")];
	if (global.isWriter) {
		actions.push($('<a class="edit" title="Editar" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a>')
			.click(event=>{
				setMetadataForm(global.mdElement,global.mdKey,$("div#myModalMetadata form#confirm"),global.selectedFeature,"edit")
			}))
		actions.push($('<a class="delete" title="Eliminar" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>')
			.click(event=>{
				setMetadataForm(global.mdElement,global.mdKey,$("div#myModalMetadata form#confirm"),{id:global.selectedFeature.id},"delete")
			}))
		actions.push($('<a class="add" title="Crear nuevo" data-toggle="tooltip"><i class="material-icons">add</i></a>')
			.click(event=>{
				setMetadataForm(global.mdElement,global.mdKey,$("div#myModalMetadata form#confirm"),global.selectedFeature,"create")
			}))
	}
	$("div.tab-pane#general").empty().append(
		$('<div style="display:flex; justify-content: space-between;" id=generalHeadingRow></div>').append(
			$("<h4></h4>").text(global.mdElement.objectName + " " + content.id + " - " + content[global.mdElement.nameProperty]),
			$("<div id=generalHeadingActions></div>").append(
				actions
			)
		), 
		//~ $("<ul id=general></ul>").append(
		$("<div></div>")
		.css("display","flex")
		.css("align-content","center")
		.append(
			$("<table id=general></table>").append(
				Object.keys(global.mdElement.properties).map(key=>{
					var prop = global.mdElement.properties[key]
					if(prop.no_md) {
						return
					}
					var value = (key == "longitud") ? (content.longitud) ? content.longitud : (content.geom) ? content.geom.coordinates[0] : 'undefined' : (key == "latitud") ? (content.latitud) ? content.latitud : (content.geom) ? content.geom.coordinates[1] : 'undefined' : (prop.type == "interval") ? interval2string(content[key]) : content[key];
					//~ return $("<li>" + key + ": <b>" + value + "</b></li>")
					if(prop.type == "geometry") {
						value = (content[key]) ? (typeof content[key] == "string") ? content[key].substring(0,20) + "..." : JSON.stringify(content[key]).substring(0,20) : 'undefined'
					}
					value = (typeof value == "string" && value.length > 40) ? value.substring(0,40) + "..." : value
					var row = $("<tr><td>" + key + "</td><td> : </td><td>" + value + "</td></tr>") 
					// AGREGA HLINKS
					if(prop.link) {
						if(!Array.isArray(prop.link)) {
							prop.link = [prop.link]
						}
						for(var link of prop.link) {
							var href
							var vfilters = (link.filters) ? Object.keys(link.filters).map(key=>{
								return link.filters[key] + "=" + content[key]
							}) : []
							var fixed = (link.fixed) ? Object.keys(link.fixed).map(key=>{
								return key + "=" + link.fixed[key]
							}) : []
							var filters = [...vfilters,...fixed].join("&")
							if(link.external) {
								href = link.external + "?" + filters
							} else {
								var element = (typeof link.element == "string") ? link.element : (link.element.switch) ? link.element.case[content[link.element.switch]] : ""
								href = "metadatos?element=" + element + "&" + filters
							}
							row.append(
								$("<td></td>").append(
									$("<a></a>").attr({'href':href, title: href}).text("Ir a " + link.name)
								)
							)
						}
					}
					return row
				})
			)
		)
	)
	$("table#general tr td:first-child").css("text-align","right")
	$("table#general tr td:nth-child(3)").css("text-align","left").css("font-weight","bold")
	$('a.nav-link[href="#general"]').click()
	if(global.mdElement.geomFilter) {
		map.removeLayer(selectedFeatureLayer)
		var selectedFeature = (new ol.format.GeoJSON()).readFeatures(array2geoJson(global.features.filter(f=>f.id==content.id)))
		//~ console.log({selectedFeature:JSON.stringify(selectedFeature)})
		var selectedFeatureSource = new ol.source.Vector({
			projection: 'EPSG:4326',
			features: selectedFeature
		})
		selectedFeatureLayer.setSource(selectedFeatureSource)
		map.addLayer(selectedFeatureLayer)
		if(selectedFeature[0].getGeometry().getType() == "Polygon") {
			map.getView().fit(selectedFeatureLayer.getSource().getExtent())
		} else {
			map.getView().setCenter(selectedFeature[0].getGeometry().getCoordinates())
			map.getView().setZoom(8)			
		}
	}
}

function loadMap(points,container,isWriter) {
	//~ global.features = array2geoJson(points)
	if (document.getElementById("toggleDraw").checked == true) {
		$("input#toggleDraw").click()
	}
	map.removeLayer(layerEstaciones)
	map.removeLayer(selectedFeatureLayer)
	var featEstaciones = (new ol.format.GeoJSON()).readFeatures(array2geoJson(points))
	layerEstaciones = new ol.layer.Vector({
		source: new ol.source.Vector({
			projection: 'EPSG:4326',
			features: featEstaciones
		}),
		zIndex: 1
	})
	map.addLayer(layerEstaciones)
}

function array2geoJson (points) {
	return {
		type: "FeatureCollection", 
		features: points.map(f=>{
			var properties = {...f}
			delete properties.geom
			return {
				type: "Feature",
				geometry: f.geom,
				properties: properties,
			}
		})
	}
}

// interacción de mapa, al cliquear sobre feature despliega popup con tabla para seleccionar
function mapOnSingleClick(evt) {
	$('div.popover').remove()
	var pixel = evt.pixel
	var coordinate = evt.coordinate
	var features = map.getFeaturesAtPixel(pixel, {layerFilter:function(layerCandidate) {
			if(layerCandidate.getZIndex() == 1) {
				return true
			} else {
				return false
			}
		}, hitTolerance: 10})
	var popupContent = [
		$("<h4></h4>").text(global.mdElement.objectNamePlural),
		$("<table></table>").css("margin-left",10).append(
			$("<thead><tr><th>tabla</th><th>id</th><th>nombre</th></tr></thead>"),
			$("<tbody></tbody>").append(
				features.map(f=>{
					return $("<tr></tr>")
					.attr({'id':f.get('id'),"data-toggle":"popover", "data-placement":"top", "title": "acción"})
					.append(
						$("<td></td>").text(f.get('tabla')),
						$("<td></td>").text(f.get('id')),
						$("<td></td>").text(f.get(global.mdElement.nameProperty))
					)
				})
			)
		)
	]
	$("div#popup-content").empty().append(popupContent)
	$('div#popup-content tr[data-toggle="popover"]').popover({
		html: true,
		template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
		trigger: "click",
		content: function() {
			return "<div class=popovercontent id="+$(this).attr('id')+"></div>"
		}
	})
	.on('show.bs.popover', function (evt) {
		$('div#popup-content tr[data-toggle="popover"][id!='+$(evt.target).attr('id')+']').popover('hide')
	})
	.on('shown.bs.popover', function (evt) {
		console.log("popover shown")
		$("div#"+$(evt.target).attr('id')+".popovercontent").empty().append(
			$("<button>Seleccionar</button>").attr({
				id: $(evt.target).attr('id')
			}).on('click',loadMDElementById)						
		)
	})
	overlay.setPosition(coordinate)
}

// add map interaction on hover point change cursor to pointer & display station name and id
function mapOnHover(evt) {
	if (!evt.dragging) {
		if(map.hasFeatureAtPixel(map.getEventPixel(evt.originalEvent))) {
			var features = map.getFeaturesAtPixel(map.getEventPixel(evt.originalEvent),{layerFilter:function(layerCandidate) {
				if(layerCandidate.getZIndex() == 1) {
					return true
				} else {
					return false
				}
			}, hitTolerance: 10})
			if(features.length>0) {
				map.getTargetElement().style.cursor = 'pointer';
				feature = features[0]
				$("div#popup-content2").text(feature.get(global.mdElement.nameProperty) + " (" + feature.get("id") + ")")
				container2.setPosition(evt.coordinate);
				$("#popup2").show()
			}
		} else {
			map.getTargetElement().style.cursor = '';
			$("#popup2").hide()
		}
	}
}

function loadMDElementById(event) {
	$("div.popover.show").hide()
	var id = $(event.target).attr('id')
	var matchFeatures = global.features.filter(f=>f.id == id)
	if(feature.length == 0) {
		alert("Feature no encontrado")
		return
	}
	$("div#popup a#popup-closer").click()
	return loadMDElement(matchFeatures[0])
}

function refreshWithFilters(event) {
	const urlParams = new URLSearchParams(window.location.search);
	const formData = new FormData(document.getElementById("selectorform")) 
	var searchParams = new URLSearchParams(formData)
	var new_url = location.origin + location.pathname + "?element=" + urlParams.get('element') + "&" + searchParams.toString()
	window.location.href = new_url
}

function getRedesAccessors() {
	return fetch('redesAccessors')
	.then(response=>{
		return response.json()
	})
	.catch(e=>{
		console.error(e)
		return
	})
}
