//~ FUNCION CLEARALL ON NO DATA FOUND
var clearAll = function(table_container_id,chart_container_id) {
	var datatable = $("#"+table_container_id).DataTable();
	datatable.clear();
	datatable.draw();
	if($('#'+chart_container_id).highcharts()) {
	  var chart = $('#'+chart_container_id).highcharts();
	  for(var i = chart.series.length -1; i> -1; i--) {
		  chart.series[i].remove();
	  }
	  chart.destroy(); //~ = new Highcharts.Chart();
	}
};
//~ FUNCION CARGA GRAFICO HIGHCARTS          
Highcharts.setOptions ({
  lang: {
		months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
		shortMonths: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
	  },
	  global: {
		  timezone: 'Brasilia',
		  useUTC: false
	  },
  }); 
var loadChart = function(getseriesbysiteandvarobj,table_container_id,chart_container_id, options, callback) {
	callback = callback || function(){};
	//~ console.log("funcion loadChart");
	if(!getseriesbysiteandvarobj) {
		//~ console.log("no data for chart");
		clearAll();
		return {};
	}
	var data = extractTimeSeries(getseriesbysiteandvarobj.observaciones);
	if(!data) {
		//~ console.log("no data for chart");
		return {};
	}
	//~ console.log(data);
	//~ var height = 800
	var chart = {
	   type: 'spline',
	   zoomType: 'xy',
	   //~ events: {
			//~ load: function() {
				//~ this.renderer.image('http://10.10.9.14:8080/logo_ina.png', 80, 40, 100, 75)
				//~ .add();      
			//~ }
		//~ },
		exporting: {
			chartOptions: { // specific options for the exported image
				plotOptions: {
					series: {
						dataLabels: {
							enabled: true
						}
					}
				}
			},
			fallbackToExportServer: false
		},
		//~ minHeight: 400
		//~ height: 700,
		//~ width:1600
	}; 
	var title = {
	   text: getseriesbysiteandvarobj.var.nombre + " en " + getseriesbysiteandvarobj.estacion.nombre // 'Serie temporal'   
	};
	var subtitle = {
	   text: "var_id: " + getseriesbysiteandvarobj.var.id + ", estacion_id: " + getseriesbysiteandvarobj.estacion.id //'Portal de datos SIyAH - INA'
	};
	var xAxis = {
		type: 'datetime',
		title: {
			text: 'Fecha'
		},
		dateTimeLabelFormats: {
		  day: '%e %b %Y',
		  month: '%e %b %Y',
		  week: '%e %b %Y',
		  year: '%e %b %Y'
		}, 
		 minRange: 1 * 24 * 3600000, // 1 days
		plotLines: [{
			color: 'black',
			dashStyle: 'dashdot',
			value: Date.parse(new Date()),
			width:1,
			label: {
				text: "ahora"
			},
			zIndex:9
		}] 
	};
	var yAxis = {
	   title: {
		  text: '',
		  align: 'low'
	   },
	   plotLines: [{
		  value: 0,
		  width: 1,
		  color: '#808080'
	   }]
	};   

	var tooltip = {
	   headerFormat: '<b>{series.name}</b><br>',
	   pointFormat: '{point.x:%e %b %H:%M}: {point.y:.2f}'
	};
	var plotOptions = {
	   spline: {
		  marker: {
			 enabledThreshold: 2,
			 radius: 2,
			 symbol: 'circle'
		  }
	   },
	   area: {
		  marker: {
			 enabledThreshold: 2,
			 radius: 2,
			 symbol: 'circle'
		  }
	   },
		animation: false,
		enableMouseTracking: false
	};
	var legend = {
	   layout: 'horizontal',
	   align: 'center',
	   verticalAlign: 'bottom',
	   borderWidth: 0,
	   itemWidth: 130,
	   itemStyle: {
          width: 110
        },
        maxHeight: 40   //   test! 
	};
	var responsive = {
		rules:[{
			condition: {
				maxHeight: 400
			},
			chartOptions: {
				legend: {
					maxHeight: 35
				}
			}
		}]
	}
			
	var series =  [];

	var json = {};
	json.chart= chart;
	json.plotOptions = plotOptions;
	json.title = title;
	json.subtitle = subtitle;
	json.xAxis = xAxis;
	json.yAxis = yAxis;
	json.tooltip = tooltip;
	json.legend = legend;
	json.series = series;
	//~ json.responsive = responsive
//~ CARGA TABLA DATATABLE
	if ($.fn.DataTable.isDataTable( '#' + table_container_id ) ) {
				var regTable = $('#' + table_container_id).DataTable();
				regTable.destroy();
	}
	//~ $('#'+table_container_id).empty();
	var datatable = $("#"+table_container_id).DataTable({
		"scrollX": false,
		//~ "scrollY": 650,
		//~ "scrollCollapse": true,
		"paging":         false,
		"bInfo": false,
		lengthChange: false,
		dom: 'Blfrtip',
		buttons: [
			'copy', 
			'csv',
			{
				text: "json",
				action: function ( e, dt, node, config )  {
					getObsJsonUrl()
				}
            }
		],
		language: {
          searchPlaceholder: "buscar registros",
          search: "",
        }
	});
	datatable.clear();
//~				$("#tbodyid").empty();
	var seriesdata = data.map(function(currentValue) {
		return [currentValue[0].getTime(),currentValue[1]]
		//~ var d = new Date(currentValue[0]);
		//~ return [currentValue[0].getTime()+3*3600*1000,currentValue[1]];
	});
	//~ if(options) {
		//~ if(options.dt) {
			//~ seriesdata = extractRegularTS(seriesdata,options.dt)
		//~ }
	//~ }
	//~ console.log({seriesdata:seriesdata})

	var xMin= Math.min(...seriesdata.map(d=>d[0]))
	var xMax= Math.max(...seriesdata.map(d=>d[0]))
	var timezone_offset = (new Date().getTimezoneOffset() * 60 * 1000) * -1
	var seriesdataformat = data.map(function(currentValue) {
		var ldate = new Date(currentValue[0].getTime() + timezone_offset).toISOString().substring(0,19).replace("T"," ")
		return [ldate, currentValue[1]]; // [currentValue[0].toISOString().substring(0,19), currentValue[1]];
	});
	datatable.rows.add(seriesdataformat);
	//~ $("#"+table_container_id).show();
	datatable.draw();
	
	// PLOT CHART
	json.series[0] = {
		data: seriesdata,
		key: "obs",
		lineWidth:3,
		marker: {
			radius: 3
		},
		zIndex: 100,
		color: "#0000FF"
	};
	json.yAxis.max = (seriesdata.length>0) ? Math.max(...seriesdata.map(el => el[1]).filter(o=>!isNaN(o))) : undefined;
	json.yAxis.min = (seriesdata.length>0) ? Math.min(...seriesdata.map(el => el[1]).filter(o=>!isNaN(o))) : undefined;
	if(getseriesbysiteandvarobj.estacion.nombre) {
		json.series[0].name = getseriesbysiteandvarobj.estacion.nombre.substring(0,16);
	} else if (getseriesbysiteandvarobj.estacion.abrev) {
		json.series[0].name = getseriesbysiteandvarobj.estacion.abrev
	}
	if(getseriesbysiteandvarobj.var.abrev) {
		//~ json.series[0].name += ' - ' + properties.var_abrev.substring(0,7);
		json.yAxis.title.text= getseriesbysiteandvarobj.var.abrev;
	} else if (getseriesbysiteandvarobj.var.nombre) {
		json.yAxis.title.text= getseriesbysiteandvarobj.var.nombre.substring(0,16)
	}
	if(getseriesbysiteandvarobj.unidades.abrev) {
		json.yAxis.title.text += ' [' + getseriesbysiteandvarobj.unidades.abrev + ']';
	}
	if(getseriesbysiteandvarobj.var.id) {
		if([1,27,31,34,48].indexOf(getseriesbysiteandvarobj.var.id) >= 0) { 
			json.chart.type = 'area';
			json.plotOptions.area = {fillOpacity: 0.2,
				lineWidth: 1,
				step: 'left',
				 marker: {
					enabled: false
				}
			};
			//~ json.chart.type = 'line';
			//~ json.series[0].step = 'left';
			
		}
	 
		if(getseriesbysiteandvarobj.var.id == 2 && getseriesbysiteandvarobj.estacion.nivel_alerta) {
			json.yAxis.plotLines.push({
				id: 1,
				color: 'yellow',
				dashStyle: 'dashdot',
				value: getseriesbysiteandvarobj.estacion.nivel_alerta,
				width:1,
				label: {
					text: "nivel de alerta"
				},
				zIndex: 10
			});
			json.yAxis.max = Math.max(getseriesbysiteandvarobj.estacion.nivel_alerta,json.yAxis.max) // ...seriesdata.map(function(el) { return el[1]})); 
			json.yAxis.min = Math.min(getseriesbysiteandvarobj.estacion.nivel_alerta,json.yAxis.min) // ...seriesdata.map(function(el) { return el[1]})); 
		}
		if(getseriesbysiteandvarobj.var.id == 2 && getseriesbysiteandvarobj.estacion.nivel_evacuacion) {
			json.yAxis.plotLines.push({
				id: 2,
				color: 'red',
				dashStyle: 'dashdot',
				value: getseriesbysiteandvarobj.estacion.nivel_evacuacion,
				width:1,
				label: {
					text: "nivel de evacuación"
				},
				zIndex:10
			});
			json.yAxis.max = Math.max(getseriesbysiteandvarobj.estacion.nivel_evacuacion,...seriesdata.map(function(el) { return el[1]})); 
			if (!json.yAxis.min) {
				json.yAxis.min = Math.min(getseriesbysiteandvarobj.estacion.nivel_evacuacion,...seriesdata.map(function(el) { return el[1]})); 
			}
		}	//~ $('#'+chart_container_id).show();
		if(getseriesbysiteandvarobj.var.id == 2 && getseriesbysiteandvarobj.estacion.nivel_aguas_bajas) {
			json.yAxis.plotLines.push({
				id: 3,
				color: 'orange',
				dashStyle: 'dashdot',
				value: getseriesbysiteandvarobj.estacion.nivel_aguas_bajas,
				width:1,
				label: {
					text: "nivel de aguas bajas"
				},
				zIndex:10
			});
			json.yAxis.max = Math.max(getseriesbysiteandvarobj.estacion.nivel_aguas_bajas,...seriesdata.map(function(el) { return el[1]})); 
			if (!json.yAxis.min) {
				json.yAxis.min = Math.min(getseriesbysiteandvarobj.estacion.nivel_aguas_bajas,...seriesdata.map(function(el) { return el[1]})); 
			}
		}	//~ $('#'+chart_container_id).show();
	}
	var datatable_prono
	if(getseriesbysiteandvarobj.pronosticos) {
		if(getseriesbysiteandvarobj.pronosticos.length>0) {
			var datekey_length = (getseriesbysiteandvarobj.pronosticos[0].dt) ? (interval2epochSync(getseriesbysiteandvarobj.pronosticos[0].dt) < 3600*24) ? 13 : 10: 10
			var hoh = {}
			for(var i=seriesdata.length-1;i=0;i--){
				var o = seriesdata[i]
				var key = o[0].toISOString().substring(0,datekey_length)
				hoh[key] = {obs:o[1]}
			}
			var prono_series = []
			var index=0
			getseriesbysiteandvarobj.pronosticos.map((p,i)=>{
				if(!p.corrida) {
					return
				}
				if(!p.corrida.series) {
					return
				}
				// ADD VERTICAL LINE FORECAST_DATE
				if(p.corrida && p.corrida.forecast_date) { 
					json.xAxis.plotLines.push({
						id: i+1,
						color: 'black',
						dashStyle: 'dashdot',
						value: Date.parse(p.corrida.forecast_date),
						width:1,
						label: {
							text: "fecha de emisión (" + p.corrida.cal_id + ")"
						},
						zIndex: 10
					});
					console.log("added fd plotline")
				}
				// ADD SERIES
				p.corrida.series.forEach(s=>{
					var s_key = p.id.toString() + "_" + s.qualifier
					var name = (p.nombre) ? p.nombre : (p.modelo) ? p.modelo : (p.id) ? "cal_id:" + p.id : "pronóstico";
					name += "(" + s.qualifier + ")"
					prono_series[index] = {
						data: extractTimeSeries(s.pronosticos).map(function(o) {
							var key = o[0].toISOString().substring(0,datekey_length)
							if(hoh[key]) {
								hoh[key][s_key] = o[1]
							} else {
								hoh[key] = {}
								hoh[key][s_key] = o[1]
							}
							//~ // adjust chart y range
							if(!isNaN(o[1]) && typeof(json.yAxis.min) !== 'undefined') {
								json.yAxis.min=Math.min(o[1],json.yAxis.min)
								json.yAxis.max=Math.max(o[1],json.yAxis.max)
							}
							return [o[0].getTime(), o[1]]
						}),
						name: name, 
						key: s_key,
						cal_id: p.id, 
						forzantes: p.forzantes, 
						model_id: (p.forzantes) ? p.forzantes.model_id : undefined, 
						cor_id: p.corrida.id, 
						forecast_date: p.corrida.date,
						qualifier: s.qualifier,
						zIndex: 1
					}
					xMin = Math.min(xMin, ...prono_series[index].data.map(d=>d[0]))
					xMax = Math.max(xMax, ...prono_series[index].data.map(d=>d[0]))
					index++
				})
			})
			//~ console.log({yAxismin:json.yAxis.min,yAxismax:json.yAxis.max})
			//~ console.log(hoh)								
			json.series = json.series.concat(prono_series)
			if(options) {
				if(options.prono_table) {
					var dates = Object.keys(hoh).sort()
					var aoa = dates.map((d, i)=> {
						// for(var j=0;j<prono_series.length;j++) {
						var row = prono_series.map(p=>{
							return (hoh[d][p.key]) ? hoh[d][p.key] : null
						})
						return [d, ...row]
					})
					var headers = '<th>Fecha</th>'
					prono_series.map(p=>{
						headers+='<th>' + p.key + '</th>'
						//~ headers+='<th>'+p.nombre+' [' + p.id + ']</th>'
					})
					$("#" + options.prono_table + " thead tr").empty().append(headers)
					datatable_prono = $("#"+options.prono_table).DataTable({
						"scrollX": false,
						"scrollY": 650,
						"scrollCollapse": true,
						"paging":         false,
						"bInfo": false,
						lengthChange: false,
						dom: 'Blfrtip',
						buttons: [
							'copy', 'csv',
							{
								text: "json",
								action: function ( e, dt, node, config )  {
									getPronosJsonUrl()
								}
							}
						],
						language: {
						  searchPlaceholder: "buscar registros",
						  search: "",
						}
					})
					datatable_prono.clear()
					datatable_prono.rows.add(aoa)
					datatable_prono.draw()
				}
			}
		}
	}
	// dailyDoyStats (percentiles)
	if(getseriesbysiteandvarobj.dailyDoyStats.length>0) {
		//~ var percArray=getseriesbysiteandvarobj.dailyDoyStats.map(d=>{
			//~ return [d.p01, d.p10, d.p50, d.p90, d.p99]
		//~ })
		var percentiles = [
			{key:"p99",name:"permanencia 1%",type:"area",data:[],zIndex:-1,lineWidth:1,color:'#d0d0d0',marker:{enabled:false}},
			{key:"p90",name:"permanencia 10%",type:"area",data:[],zIndex:-1,lineWidth:1,fillColor:'#ffffff',color:"#939393",dashStyle:"ShortDash",marker:{enabled:false}},
			{key:"p50",name:"permanencia 50%",type:"area",data:[],zIndex:-1,lineWidth:1,fillColor:'#ffffff',color:"#939393",dashStyle:"ShortDash",marker:{enabled:false}},
			{key:"p10",name:"permanencia 90%",type:"area",data:[],zIndex:-1,lineWidth:1,fillColor:'#d0d0d0',color:"#939393",dashStyle:"ShortDash",marker:{enabled:false}},
			{key:"p01",name:"permanencia 99%",type:"area",data:[],zIndex:-1,lineWidth:1,fillColor:'#ffffff',color:'#d0d0d0',marker:{enabled:false}}
		]
		//~ for(var i=xMin; i<=xMax;i=i+24*3600*1000) {
		for(var i=new Date(getseriesbysiteandvarobj.request_params.timestart).getTime(); i<=new Date(getseriesbysiteandvarobj.request_params.timeend).getTime();i=i+24*3600*1000) {
			var date = new Date(i)
			var first = new Date(date.getFullYear(),0,1)
			var doy = Math.round(((date - first) /24/3600/1000 + .5),0)
			percentiles[0].data.push([i,getseriesbysiteandvarobj.dailyDoyStats[doy-1].p99])
			percentiles[1].data.push([i,getseriesbysiteandvarobj.dailyDoyStats[doy-1].p90])
			percentiles[2].data.push([i,getseriesbysiteandvarobj.dailyDoyStats[doy-1].p50])
			percentiles[3].data.push([i,getseriesbysiteandvarobj.dailyDoyStats[doy-1].p10])
			percentiles[4].data.push([i,getseriesbysiteandvarobj.dailyDoyStats[doy-1].p01])
		}
		json.series = json.series.concat(percentiles)
		json.yAxis.max = (parseFloat(json.yAxis.max).toString() !== 'NaN') ? Math.max(json.yAxis.max, ...percentiles[0].data.map(d => d[1])) : Math.max(...percentiles[0].data.map(d => d[1]))
		json.yAxis.min = (parseFloat(json.yAxis.min).toString() !== 'NaN') ? Math.min(json.yAxis.min, ...percentiles[4].data.map(d => d[1])) : Math.min(...percentiles[4].data.map(d => d[1]));
	}
	if(chart_container_id) {
		var highchart = Highcharts.chart(chart_container_id,json,
			function(chart) { // on complete
				//~ chart.renderer.button('add series', 0, 0)
					//~ .attr({
						//~ zIndex: 15
					//~ })
					//~ .on('click', function () {
						//~ $("#"+chart_container_id).parent().find("div#chartModal").show().modal()
					//~ })
					//~ .add();
				//~ chart.renderer.button('remove series', 0, 32)
					//~ .attr({
						//~ zIndex: 15,
						//disabled: true,
						//~ id: "removeSeriesButton"
					//~ })
					//~ .on('click', function () {
						//~ if(chart.series.length == 0) {
							//~ return
						//~ }
						//~ chart.series[chart.series.length-1].remove(true)
						//~ if(chart.series.length == 0) {  // remove horizontal lines when main series is removed
							//~ console.log("removing horizontal lines")
							//~ var pl=[]
							 //~ chart.yAxis[0].plotLinesAndBands.forEach(i=>{
								 //~ console.log(i)
								 //~ pl.push(i.id)
							 //~ })
							 //~ console.log(pl)
							 //~ for(var i=1;i<pl.length;i++) {
								 //~ console.log("removing plotline "+ i)
								 //~ chart.yAxis[0].removePlotLine( i )
							 //~ }
						 //~ }
						//~ adjustChartAxes(chart)
					//~ })
					//~ .add();
				//~ if(chart.series.some(s=> /^permanencia\s\d\d?\%$/.test(s.name))) {
					//~ chart.renderer.button('toggle stats', 0, 64)
						//~ .attr({
							//~ zIndex: 15
						//~ })
						//~ .on('click', function () {
							//~ chart.series.forEach(s=>{  
							   //~ if(/^permanencia\s\d\d?\%$/.test(s.name)) {
								//~ if(s.visible) {
									//~ s.hide()
								//~ } else {
									//~ s.show()
								//~ }
							  //~ }
							//~ })
						//~ })
						//~ .add();
					//~ chart.renderer.button('downld stats',0, 96)
						//~ .attr({
							//~ zIndex: 15
						//~ })
						//~ .on('click', function () {
							//~ var doystats = chart.series.filter(s=> /^permanencia\s99\%$/.test(s.name))[0].data.map( (d,i) => {
								//~ var date = new Date(d.x).toISOString().substring(0,10)
								//~ var values = chart.series.filter(s=> /^permanencia\s\d\d?\%$/.test(s.name)).map(s=> {
									//~ return s.data[i].y
								//~ })
								//~ return [date,...values]	
							//~ })
							//~ var colnames = ["date",...chart.series.filter(s=> /^permanencia\s\d\d?\%$/.test(s.name)).map(s=>s.name)]
							//~ var csv = colnames.join(",") + "\n" + doystats.map(d=>d.join(",")).join("\n")
							//~ var gblob = new Blob([csv], {type: "octet/stream"})
							//~ var gurl = window.URL.createObjectURL(gblob);
							//~ $("#myModal span#exportcsv a").attr('href',gurl).html("Selected " + doystats.length + " stats rows to download as CSV").on("click", e=>{
								// $("#myModal").modal("hide")
							//~ })
							//~ $("div#myModal span#exportcsv").show()
							//~ $("div#myModal div#authentication").hide()
							//~ $("div#myModal div#authentication input").attr("disabled",true)
							//~ $("div#myModal").modal('show').on('hide.bs.modal', function (e) {
								//~ $(e.target).find("span#exportcsv").hide()
								//~ $(e.target).find("span#exportcsv a").attr("href",null)
								//~ $(e.target).find("div#authentication").show()
								//~ $(e.target).find("div#authentication input").attr("disabled",false)
							//~ })
						//~ })
						//~ .add();
					//~ chart.renderer.button('add percentile',0, 128)
						//~ .attr({
							//~ zIndex: 15
						//~ })
						//~ .on('click', function () {
							//~ $("div#chartModal2").modal('show').on('hide.bs.modal', function (e) {
								//~ $(e.target).find("select[name=percentil]").val([])
							//~ })
						//~ })
						//~ .add();
				//~ }
		})
		highchart.reflow()
		if(datatable_prono) {
			callback(datatable, highchart,datatable_prono)
		} else {
			callback(datatable, highchart)
		}
	} else {
		callback(datatable)
	}
};
function extractTimeSeries(serie) {
	var data = [];
	if(Array.isArray(serie)) {
		data = serie.map ( obs=> {
			if(Array.isArray(obs)) {
				if(obs.length>2) {
					return [toDate(obs[0]), parseFloat(obs[2])]
				} else {
					return [toDate(obs[0]), parseFloat(obs[1])]
				}
			} else {
				return [(obs.date) ? toDate(obs.date) : toDate(obs.timestart), parseFloat(obs.valor)]
			}
		})
	} else {
		return 
	}
	return data
}

function extractRegularTS(data,dt) {
	var interval = interval2epochSync(dt)
	if(!interval) {
		console.log("bad dt:" + interval)
		return data
	}
	if(interval < 60 * 1000) {
		console.log("dt too small:" + dt)
		return data
	}
	var sd = data[0][0]
	var ed = data[data.length-1][0]
	var filtered_data = data.filter(d=> (d[0] - sd) % dt == 0)
	var index=0
	var filled_data = []
	var i=sd
	while(i <= ed) {
		if(data[index][0] == i) {
			filled_data.push(data[index])
			index++
		} else { // if (data[index][0] > i) {
			filled_data.push([i,null])
		}
		i=advance_dt(i,dt)
	}
	return filled_data
}

function advance_dt(d,dt) {  // d in milliseconds or as date object, dt as object. returns milliseconds
	var date = new Date(d)
	Object.keys(dt).map(k=>{
		if(['year','years'].indexOf(k.toLowerCase()) >= 0) {
			date.setFullYear(date.getFullYear()+dt[k])
		} else if(['mon','month','months'].indexOf(k.toLowerCase()) >= 0) {
			date.setMonth(date.getMonth()+dt[k])
		} else if (['day','days'].indexOf(k.toLowerCase()) >= 0) {
			date.setDate(date.getDate()+dt[k])
		} else {
			var interval = {}
			interval[k] = dt[k]
			date.setMilliseconds(date.getMilliseconds() + interval2epochSync(interval) * 1000)
		}
	})
	return date.getTime()
}

function addPronoToChart (pronostico,table_container_id,chart_container_id) {
	if(!pronostico.corrida) {
		return
	}
	if(!pronostico.corrida.series) {
		return
	}
	var data = extractTimeSeries(pronostico.corrida.series)
	if(!data) {
		console.log("no data for chart")
		return;
	}
	var seriesdata = data.map(function(currentValue) {
		return [currentValue[0].getTime(), currentValue[1]]
	});
	var name = (pronostico.nombre) ? pronostico.nombre : (pronostico.modelo) ? pronostico.modelo : (pronostico.id) ? "cal_id:" + pronostico.id : "pronóstico";
	console.log("addPronoToChart")
	if(chart_container_id) {
		//~ $("#"+chart_container_id).highcharts().addSeries(pronostico);
		adjustChartAxes($("#"+chart_container_id).highcharts(),seriesdata)
		console.log({xRange:xRange,yRange:yRange})
	}
	return;
}


function addSeriesToChart (series,table_container_id,chart_container_id) {
	var data = extractTimeSeries(series.series)
	if(!data) {
		console.log("no data for chart")
		return;
	}
	var seriesdata = data.map(function(currentValue) {
		return [currentValue[0].getTime(), currentValue[1]]
	});
	//~ var name = series.name
	series.data = seriesdata
	console.log("addSeriesToChart")
	if(chart_container_id) {
		//~ var yRange = [Math.min($("#"+chart_container_id).highcharts().yAxis[0].min,...seriesdata.map(el => el[1])),
			//~ Math.max($("#"+chart_container_id).highcharts().yAxis[0].max,...seriesdata.map(el => el[1]))]
		//~ $("#"+chart_container_id).highcharts().yAxis[0].setExtremes(yRange[0],yRange[1]);
		//~ var xRange = [Math.min($("#"+chart_container_id).highcharts().xAxis[0].min,...seriesdata.map( el => el[0])),
			//~ Math.max($("#"+chart_container_id).highcharts().xAxis[0].max,...seriesdata.map( el => el[0]))]
		//~ $("#"+chart_container_id).highcharts().xAxis[0].setExtremes(xRange[0], xRange[1]);
		adjustChartAxes($("#"+chart_container_id).highcharts(),seriesdata)
		$("#"+chart_container_id).highcharts().addSeries(series,true)
		//~ {
			//~ data: seriesdata, 
			//~ name: name
		//~ }, true)
	}
	return;
}

function adjustChartAxes(chart,seriesdata) {
	var xRange, yRange
	var xvalues = chart.series.map(s=>{
			return s.data.map(i=>i.x) 
		}).flat() 
	var yvalues = chart.series.map(s=>{
			return s.data.map(i=>i.y) 
		}).flat() 
	yvalues.push(...chart.yAxis[0].plotLinesAndBands.map(p=>p.options.value))  // add horizontal lines
	console.log({xvalues:xvalues, yvalues:yvalues})
	if(seriesdata) {
		xvalues.push(...seriesdata.map(el => el[0]))
		yvalues.push(...seriesdata.map(el => el[1]))
	}
	yvalues = yvalues.filter(v=>(v.toString() !== "NaN"))
	xRange = [Math.min(...xvalues),Math.max(...xvalues)]
	yRange = [Math.min(...yvalues),Math.max(...yvalues)]
	console.log({xRange:xRange, yRange:yRange})
	chart.xAxis[0].setExtremes(xRange[0], xRange[1]);
	chart.yAxis[0].setExtremes(yRange[0], yRange[1]);
}
	
function toDate(d) {
	if(d instanceof Date) {
		return d
	} else {
		var d2;
		if(/^\d{4}-\d{2}-\d{2}\s*$/.test(d)) {
			d2 = d.replace(/\s+/,"");
			d2 = d2 + "T00:00:00.000Z";
		} else if(/^\d{4}-\d{2}-\d{2}[\s|T]\d{2}(:\d{2})?(:\d{2})?$/.test(d)) {
			d2 = d.replace(/\s/,"T") + ":00:00.000Z".substring(d.length-13);
		} else {
			d2=d;
		}			
		return new Date(d2);
	}
}

function interval2epochSync(interval) {
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
