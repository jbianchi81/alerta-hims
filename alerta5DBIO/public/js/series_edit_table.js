var series_input_fields = ["estacion_id","var_id","proc_id","unit_id"]
var editable_fields = ["estacion_id","var_id","proc_id","unit_id"]
var actions = '<a class="add" title="Add/Update" data-toggle="tooltip" style="display:none"><i class="material-icons">&#xE03B;</i></a> ' +
					'<a class="edit" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a> ' +
					'<a class="delete" title="Delete" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>' +
					'<a class="cancel" title="Cancel" data-toggle="tooltip" style="display:none"><i class="material-icons">cancel</i></a>' +
					'<a class="view" title="View" data-toggle="tooltip"><i class="material-icons">view</i></a>'
var public_actions = '<a class="view" title="View" data-toggle="tooltip"><i class="material-icons">place</i></a>'
function makeSeriesEditTable(container,monitoringPoints,isWriter) {
	var features = monitoringPoints.features.map(f=>{
		//~ console.log({feature:f})
		var row = f.properties
		if(!f.geometry) {
			row.longitud = null
			row.latitud = null
		} else {
			row.longitud = f.geometry.coordinates[0]
			row.latitud = f.geometry.coordinates[1]
		}
		row.action = isWriter ? '<a class="add" title="Add/Update" data-toggle="tooltip" style="display:none"><i class="material-icons">&#xE03B;</i></a> ' +
			'<a class="edit" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a> ' +
			'<a class="delete" title="Delete" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>' +
			'<a class="cancel" title="Cancel" data-toggle="tooltip" style="display:none"><i class="material-icons">cancel</i></a>' +
			'<a class="view" title="View" data-toggle="tooltip"><i class="material-icons">place</i></a>' : '<a class="view" title="View" data-toggle="tooltip"><i class="material-icons">place</i></a>'
		return row
	})
	var seriesOptions = {estacion_id:[],var_id:[],proc_id:[],unit_id:[]}
	$.get("html/series_edit_table_container.html", html=>{
	//~ .then((html,estaciones,variables,procedimientos,unidades)=>{
		//~ $("form#selectorform select[name=redId]").append($(redes_options)).change(event=>{
			//~ $(event.target).parents("form").submit()
		//~ })
		$(container).append(html)
		//~ $("div#myModal form#confirm input[name=series_id]").val(series.id)
		//~ $("div#myModal form#confirm input[name=tipo]").val(series.tipo)
		if(!isWriter) { 
			$(container).find("button.add-new").hide()
			$(container).find("button.remove-selected").hide()
			$(container).find("button.import-csv").hide()
		}
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
				$("<button>Ir a serie</button>").attr({
					id: $(evt.target).parent().parent().attr('data-uniqueid')
				}).on('click',reloadWithPars)						
			)
			if($("div#chart_container")[0].hasAttribute("data-highcharts-chart")) {
				$("div#"+$(evt.target).parent().parent().attr('data-uniqueid')+".popovercontent").append(
					$("<button>Agregar a gráfico</button>").attr({
						id: $(evt.target).parent().parent().attr('data-uniqueid')
					}).on('click',addToChart)
				)
			}
		})		
		var $bstable = $(container).find("table.series_edit_table").bootstrapTable(
		{
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
		})	 //.attr("data-toggle","table")
		//~ $(container).find("table.series_edit_table").on("all.bs.table", (e, name, args)=> {
			//~ $('td[data-toggle="popover"]').popover('hide')
			//~ addPopoverToRows($(container).find("table.series_edit_table tr td:nth-child(n+3)"))
		//~ })
		//~ $bstable.on('post-footer.bs.table', function () {
			//~ $(container).find('a[data-toggle="tooltip"]').tooltip()
		//~ })
		var jqxhr
		$('div#myModalSeries').on('hidden.bs.modal', function () {
			if(jqxhr) {
				if(jqxhr.status != 200) {
					jqxhr.abort()
				}
			}
			console.log("modal close")
	//~ .on('hide.bs.modal', function (e) {
			$(this).find('table#rowstoinsert').bootstrapTable('destroy')
			$(this).find('table#rowstoinsert').remove()
			$(this).find('span#csvfile').hide()
			$(this).find('input[name=csvfile]').val(null)
			$(this).find('input[name=observaciones]').val(null)
				//~ })
			$("div#myModalSeries form#confirm").find("button[type=submit]").prop('disabled',false)
			$(container).find("button.add-new").prop('disabled',false)
			$("div#myModalSeries form#confirm select.new-series").attr("required",false)
			$("div#myModalSeries form#confirm div.row.new-series").hide()
			$("body").css("cursor","default")
				//~ alert("Request aborted by user")
		});
		function reloadData(container,features) {
			$(container).find("table.series_edit_table").bootstrapTable('removeAll')
			$(container).find("table.series_edit_table").bootstrapTable('append', features)
			//~ addPopoverToRows($(container).find("table.series_edit_table tr td:nth-child(n+3)"))
		}
		$(container).find("table.series_edit_table").on('check.bs.table', ()=>{
		   $("button.remove-selected").removeAttr('disabled')
		   $("button.export-csv").removeAttr('disabled')
		})
		$(container).find("table.series_edit_table").on('check-all.bs.table',()=>{
		  var checked = $(container).find("table.series_edit_table").bootstrapTable('getAllSelections')
		  if (checked.length > 0) {
			$("button.remove-selected").removeAttr('disabled')
			$("button.export-csv").removeAttr('disabled')
		  } else {
			$("button.remove-selected").attr('disabled','true')
		    $("button.export-csv").attr('disabled','true')
		  }
		})
		$(container).find("table.series_edit_table").on('uncheck.bs.table', ()=>{
		  var checked = $(container).find("table.series_edit_table").bootstrapTable('getAllSelections')
		  if (checked.length > 0) {
			$("button.remove-selected").removeAttr('disabled')
			$("button.export-csv").removeAttr('disabled')
		  } else {
			$("button.remove-selected").attr('disabled','true')
		    $("button.export-csv").attr('disabled','true')
		  }
		})
		reloadData(container,features)
		$(container).find('[data-toggle="tooltip"]').tooltip();
		//~ actions = $(container).find("table.series_edit_table td:last-child").html();
		// Show modal for insert new series on 'add new' button click
		$(container).find(".add-new").click(function(){
			$(this).attr("disabled", "disabled");
			//~ alert("set POST request")
			//~ $("div#myModalSeries form#confirm input[name=series]").val(JSON.stringify({series:[seriesObj]}))
			$("div#myModalSeries form#confirm").attr("action","obs/puntual/series")
			$("div#myModalSeries form#confirm").attr("method","POST")
			$("div#myModalSeries form#confirm select.new-series").attr("required",true)
			$("div#myModalSeries form#confirm div.row.new-series").attr("hidden",false).show()
			$("div#myModalSeries form#confirm input[name=series_id]").val("")
			$("div#myModalSeries form#confirm input[name=timestart]").val("")
			$("div#myModalSeries form#confirm input[name=timeend]").val("")
			$("div#myModalSeries form#confirm input[name=series]").val("")
			$("div#myModalSeries").modal('show').on('hide.bs.modal', function (e) {
				$(container).find("button.add-new").attr("disabled",false)
			})
			//~ $(container).find("table.series_edit_table").bootstrapTable('selectPage',1)
			//~ var placeholders = $(container).find("table.series_edit_table tbody tr:first-child td").map((i,e)=> $(e).html())
			//~ varSelect = "<select name=var_id><option value=></option>" + seriesOptions.var_id.map(o=> "<option value=" + o.value + ">" + o.text + "</option>").join("") + "</select>"
			//~ var procSelect = "<select name=proc_id><option value=></option>" + seriesOptions.proc_id.map(o=> "<option value=" + o.value + ">" + o.text + "</option>").join("") + "</select>"
			//~ var estacionSelect = "<select name=estacion_id><option value=></option>" + seriesOptions.estacion_id.map(o=> "<option value=" + o.value + ">" + o.text + "</option>").join("") + "</select>"
			//~ var unitSelect = "<select name=unit_id><option value=></option>" + seriesOptions.unit_id.map(o=> "<option value=" + o.value + ">" + o.text + "</option>").join("") + "</select>"
			//~ $(container).find("table.series_edit_table").bootstrapTable('prepend', 
				//~ {
					//~ series_id:-1, 
					//~ estacion_id: estacionSelect, // '<input type="number" step="1" class="form-control" name="estacion_id" id="estacion_id" placeholder="'+ placeholders[2]+'" style="width: 80px">',  
					//~ nombre: null,
					//~ longitud: null,
					//~ latitud: null,
					//~ rio: null,
					//~ var_id: varSelect, // '<input type="number" step="1" class="form-control" name="var_id" id="var_id" placeholder="'+ placeholders[7]+'" style="width: 80px">',
					//~ var_name: null,
					//~ proc_id: procSelect, //'<input type="number" step="1" class="form-control" name="proc_id" id="proc_id" placeholder="'+ placeholders[9]+'" style="width: 80px">',
					//~ unit_id: unitSelect, // '<input type="number" step="1" class="form-control" name="unit_id" id="unit_id" placeholder="'+ placeholders[7]+'" style="width: 80px">',
					//~ timestart: null,
					//~ timeend: null,
					//~ forecast_date: null,
					//~ data_availability: null,
					//~ fuente: null,
					//~ id_externo: null,
					//~ action: actions
			//~ })
			//~ $(container).find('table.series_edit_table tbody tr[data-uniqueid="-1"]').eq(0).find(".add, .edit, .cancel").toggle(); // eq(index + 1).find(".add, .edit").toggle();
			//~ $(container).find('table.series_edit_table tbody tr[data-uniqueid="-1"] a[data-toggle="tooltip"]').tooltip();
			//~ $(container).find("table.series_edit_table").bootstrapTable('scrollTo',0)
			//~ $(container).find('table.series_edit_table tbody tr[data-uniqueid="-1"] td input:eq(0)').focus()
			//~ $(container).find("ul.pagination li").addClass("disabled");
			//~ $(container).find("span.page-list .btn-secondary").addClass("disabled")
			//~ $(container).find('table.series_edit_table tbody tr[data-uniqueid="-1"] td a.add').click(()=>{
				//~ addRowOnClick(this)
			//~ })
		});
		// Add row on add button click
		$(container).on("click", ".add", function() {
			var empty = false;
			$("div#myModalSeries form#confirm input[name=series]").val("")
			//~ var input = $(this).parents("tr").find('select')  //('input[type="number"]');
			$(this).parents("tr").addClass("rowToAdd")
			var seriesObj = makeSeriesObj($(this).parents("tr").find('select'))
			$(this).parents("tr").find(".error").first().focus();
			if(!empty){
				if($(this).parents("tr").attr("data-uniqueid") == "-1") {   // CREATE NEW SERIES
					//~ alert("set POST request")
					$("div#myModalSeries form#confirm input[name=series]").val(JSON.stringify({series:[seriesObj]}))
					$("div#myModalSeries form#confirm").attr("action","obs/puntual/series")
					$("div#myModalSeries form#confirm").attr("method","POST")
				} else { 												  // UPDATE EXISTING SERIES
					//~ alert("set PUT request")
					$("div#myModalSeries form#confirm input[name=series]").val(JSON.stringify({serie:seriesObj}))
					$("div#myModalSeries form#confirm").attr("action","obs/puntual/series/"+$(this).parents("tr").attr("data-uniqueid") + "?series_metadata=true")
					$("div#myModalSeries form#confirm").attr("method","PUT")
				}
				$("div#myModalSeries").modal('show')
				//~ input.each(function(){
					//~ $(this).parent("td").html($(this).val());
				//~ });			
				//~ $(this).parents("tr").find(".add, .edit").toggle();
				//~ $(".add-new").removeAttr("disabled");
			} else {
				alert("Faltan datos")
			}	
		});
// Edit row on edit button click
		$(container).on("click", ".edit", function(){		
			$(this).tooltip('hide')
			$(container).find("table.series_edit_table tbody").find(".cancel:visible").click()
			var idForEdition = $(this).parents("tr").attr("data-uniqueid") // find("td:first-child").eq(1).html()
			var oldData = $(container).find("table.series_edit_table").bootstrapTable('getRowByUniqueId',idForEdition)
			Object.keys(oldData).forEach((f,i)=>{
				if (editable_fields.indexOf(f) >= 0) {
					var colIndex = $(container).find("table.series_edit_table th[data-field="+f+"]").index() + 1
					var td = $(container).find("table.series_edit_table tbody tr[data-uniqueid="+idForEdition+"] td:nth-of-type("+colIndex+")")
					$(td).html("").append(
						$("<select></select>").attr("name", f).addClass("form-control")
					)
					if(seriesOptions[f]) {
						seriesOptions[f].forEach(o=>{
							var selected = (o.value == oldData[f]) ? "selected" : ""
							$(td).find("select").append(
								$("<option value=" + o.value + " " + selected + ">" + o.text + "</option>")
							)
						})
					}
					$(td).find("select").select2()
					
					//~ var newHtml = '<input type="number" name="'+f+'" class="form-control" value="' + oldData[f] + '" placeholder="' + oldData[f] + '">'
					//~ var colIndex = $(container).find("table.series_edit_table th[data-field="+f+"]").index() + 1
					//~ $(container).find("table.series_edit_table tbody tr[data-uniqueid="+idForEdition+"] td:nth-of-type("+colIndex+")").html(newHtml) // .eq(colIndex)
				}
			})
			//~ $(container).find("table.series_edit_table").bootstrapTable('updateByUniqueId',{id:idForEdition, row: newData})
			$(container).find("table.series_edit_table tbody tr[data-uniqueid="+idForEdition+"]").find(".add, .edit, .cancel").toggle()
			$(container).find("a[data-toggle=tooltip]").tooltip()
			$(container).find(".add-new").attr("disabled", "disabled");
			$(container).find(".export-csv-all").attr("disabled", "disabled");
			$(container).find("ul.pagination li").addClass("disabled");
			$("span.page-list .btn-secondary").addClass("disabled")
			$("div#myModalSeries form#confirm").attr("action","obs/puntual/series/" + idForEdition) 
			$("div#myModalSeries form#confirm").attr("method","PUT")
		});
		// Delete row on delete button click
		$(container).on("click", ".delete", function(){
			var idForDeletion = $(this).parents("tr").attr("data-uniqueid") // find("td:first-child").eq(0).html()
			$(".add-new").removeAttr("disabled");
			if(idForDeletion != -1) {
				$("div#myModalSeries form#confirm").attr("action","obs/puntual/series/" + idForDeletion) 
				$("div#myModalSeries form#confirm").attr("method","DELETE")
				$('div#myModalSeries').modal('show') // $(container).find('#myModal').modal('show')
			} else {
				$(container).find("table.series_edit_table tbody tr[data-uniqueid=-1]").find("a[data-toggle=tooltip]").tooltip('hide')
				$(container).find("table.series_edit_table").bootstrapTable('removeByUniqueId',"-1")
				$(container).find("a[data-toggle=tooltip]").tooltip()
				//~ $(this).parents("tr").remove();
				$(container).find("ul.pagination li").removeClass("disabled");
				$("span.page-list .btn-secondary").removeClass("disabled")
			}
		});
		// Remove selected rows on button click
		$(container).find(".remove-selected").click(function(){
			$("div#myModalSeries form#confirm input[name=id]").remove()
			$(".add-new").removeAttr("disabled");
			var selected = $(container).find("table.series_edit_table").bootstrapTable('getAllSelections')
			//~ console.log(selected)
			selected.forEach((row,i)=> {
				//~ $(container).find("table.series_edit_table").bootstrapTable('removeByUniqueId',uid)
				$("div#myModalSeries form#confirm").append(
					$("<input name=id hidden value="+row.id+">")
				)
			})
			$("div#myModalSeries form#confirm span#removeselected").html("<p>Selected " + selected.length + " rows for deletion</p>").show()
			$("div#myModalSeries form#confirm").attr("action","obs/puntual/series")
			$("div#myModalSeries form#confirm").attr("method","DELETE")
			$('div#myModalSeries').modal('show').on('hide.bs.modal', function (e) {
				$(e.target).find("span#removeselected").hide()
			})
		})
		// select all rows on all pages on click
		$(container).find(".select-all").click(function(){
			$(container).find("table.series_edit_table").bootstrapTable('togglePagination')
			$(container).find("table.series_edit_table").bootstrapTable('checkAll')
			$(container).find("table.series_edit_table").bootstrapTable('togglePagination')
		})
		// invert row selection on all pages on click
		$(container).find(".invert-select").click(function(){
			$(container).find("table.series_edit_table").bootstrapTable('checkInvert')
		})
		// Import CSV data
		$(container).find(".import-csv").click(function(){
			$(".add-new").removeAttr("disabled");
			$("div#myModalSeries form#confirm").attr("action","obs/puntual/series")
			$("div#myModalSeries form#confirm").attr("method","POST")
			$("div#myModalSeries form#confirm span#csvfile").show();
			$('div#myModalSeries').modal('show')
			$("div#myModalSeries form#confirm input#csvfile").change( evt=> {
		       var files = evt.target.files;
			   var file = files[0];
			   var reader = new FileReader();
			   reader.onload = function(event) {
				 $("div#myModalSeries table#rowstoinsert").bootstrapTable('destroy')
				 $("div#myModalSeries table#rowstoinsert").remove()
				 var series = csv2series(event.target.result);
				 if(!series) {
					 alert("Invalid file")
					 return
				 }
				 if(series.length<=0) {
					 alert("Empty file")
					 return
				 }
				 $("div#myModalSeries form#confirm input#csvfile").after(
					$("<table class=bootstraped id=rowstoinsert data-height=300>" + 
						"<thead>" + 
							"<tr>" +
								"<th data-field=estacion_id>estacion_id</th>" +
								"<th data-field=var_id>var_id</th>" +
								"<th data-field=proc_id>proc_id</th>" +
								"<th data-field=unit_id>unit_id</th>" +
							"</th>" +
						"</thead>" +
					"</table")
				 )
				 $("div#myModalSeries table#rowstoinsert").bootstrapTable()
				 //~ {
					//~ onSearch: addPopoverToRows($(container).find("table.series_edit_table tr td:nth-child(n+3)")),
					//~ onSort: addPopoverToRows($(container).find("table.series_edit_table tr td:nth-child(n+3)"))})
				 //~ series = series.map(s=> { 
					 //~ var thisserie = s
					 //~ return thisserie
				 //~ })
				 $("div#myModalSeries table#rowstoinsert").bootstrapTable('append', series)
				 $("div#myModalSeries form#confirm input[name=series]").val(JSON.stringify(series))
			   }
			   reader.readAsText(file)
			})
						//~ $(container).find("form#confirm input#csvfile").trigger("click")
			
		})
		// Get From Source
		//~ $(container).find(".get-from-source").click(function(){
			//~ $(".add-new").removeAttr("disabled");
			//~ $("div#myModal form#confirm").attr("action","getFromSource")
			//~ $("div#myModal div#authentication").hide()
			//~ $("div#myModal span#getfromsource").html('<div class=row>\
					//~ <button type=submit>Sumbit</submit>\
				//~ </div>')
			//~ $("div#myModal input[name=timestart]").val($("form#selectorform input#timestart").val())
			//~ $("div#myModal div#timestart").attr('hidden',false)
			//~ $("div#myModal input[name=timeend]").val($("form#selectorform input#timeend").val())
			//~ $("div#myModal div#timeend").attr('hidden',false)
			//~ $("div#myModal span#getfromsource").show()
			//~ $('div#myModal').modal('show').on('hide.bs.modal', function (e) {
				//~ $(e.target).find('table#rowstoinsert').bootstrapTable('destroy')
				//~ $(e.target).find('table#rowstoinsert').remove()
				//~ $(e.target).find('input[name=observaciones]').val(null)
				//~ $("div#myModal div#authentication").show()
				//~ $("div#myModal span#getfromsource").hide()
				//~ $("div#myModal span#getfromsource").html("")
				//~ $("div#myModal div#timestart").attr('hidden',true)
				//~ $("div#myModal div#timeend").attr('hidden',true)
			//~ })
		//~ })
		// Export selected CSV data
		$(container).find(".export-csv").click(function(){
			var data = $(container).find("table.series_edit_table").bootstrapTable('getAllSelections')
			var header = "tipo,series_id,estacion_id,var_id,proc_id,unit_id,timestart,timeend\n"
			var csv = header + seriesarr2csv(data)
			//~ console.log(csv)
			var gblob = new Blob([csv], {type: "octet/stream"})
			var gurl = window.URL.createObjectURL(gblob);
			$("div#myModalSeries span#exportcsv a").attr('href',gurl).html("Descargar como CSV (" + data.length + " registros)").on("click", e=>{
				//~ $("#myModal").modal("hide")
			})
			$("div#myModalSeries span#exportcsv").show()
			$("div#myModalSeries div#authentication").hide()
			$("div#myModalSeries div#authentication input").attr("disabled",true)
			$("div#myModalSeries").modal('show').on('hide.bs.modal', function (e) {
				$(e.target).find("span#exportcsv").hide()
				$(e.target).find("span#exportcsv a").attr("href",null)
				$(e.target).find("div#authentication").show()
				$(e.target).find("div#authentication input").attr("disabled",false)
			})
		})
		// Export All CSV data
		$(container).find(".export-csv-all").click(function(){
			var data = $(container).find("table.series_edit_table").bootstrapTable('getData')
			var header = "tipo,series_id,estacion_id,var_id,proc_id,unit_id,timestart,timeend\n"
			var csv = header + seriesarr2csv(data)
			//~ console.log(csv)
			var gblob = new Blob([csv], {type: "octet/stream"})
			var gurl = window.URL.createObjectURL(gblob);
			$("div#myModalSeries span#exportcsv a").attr('href',gurl).html("All " + data.length + " rows to download as CSV").on("click", e=>{
				//~ $("#myModal").modal("hide")
			})
			var exportjsonurl = window.location.origin + window.location.pathname.replace(/[^/]*$/,"") + "getMonitoredPoints?" + Object.keys(global.monitoredpointsparams).map(k=> k + "=" + global.monitoredpointsparams[k]).join("&")
			$("div#myModalSeries span#exportjson input#exportjsonurlseries").val(exportjsonurl).removeAttr("disabled")
			$("div#myModalSeries span#exportcsv").show()
			$("div#myModalSeries span#exportjson").show()
			$("div#myModalSeries div#authentication").hide()
			$("div#myModalSeries div#authentication input").attr("disabled",true)
			$("div#myModalSeries").modal('show').on('hide.bs.modal', function (e) {
				$(e.target).find("span#exportcsv").hide()
				$(e.target).find("span#exportjson").hide()
				$("div#myModalSeries span#exportjson input#exportjsonurlseries").val("").attr("disabled","disabled")
				$(e.target).find("span#exportcsv a").attr("href",null)
				$(e.target).find("div#authentication").show()
				$(e.target).find("div#authentication input").attr("disabled",false)
			})
		})
			
			
		// Cancel row edit on button click
		$(container).on("click",".cancel",function(){
			$(this).tooltip("hide")
			var rowId = $(this).parents("tr").attr("data-uniqueid") // find("td:first-child").eq(0).html()
			if(rowId == "-1") {
				//~ $(this).parents("td").find(".delete").click()
				//~ console.log({rowId:rowId})
				//~ $(container).find("table.series_edit_table").bootstrapTable('removeByUniqueId',"null")
				//~ $(this).parents("tr").remove()
				$(container).find("table.series_edit_table tbody tr[data-uniqueid=-1]").find("a[data-toggle=tooltip]").tooltip('hide')
				$(container).find("table.series_edit_table").bootstrapTable('removeByUniqueId',"-1")
				$(container).find(".add-new").removeAttr("disabled");
				$(container).find("a[data-toggle=tooltip]").tooltip()
				//~ reloadData(container,data)
				return
			}
			//~ var restoreData = data.filter(o=> o.id == rowId)[0]
			var newData = {}
			//~ input_fields.forEach(f=>{
				//~ newData[f] = restoreData[f]
			//~ })
			$(container).find("table.series_edit_table tbody tr[data-uniqueid="+rowId+"]").find("input[type=text]").each(function(i) {  // td:not(:first-child):not(:last-child)
				//~ $(this).html(restoreData[input_fields[i]])
				var field=series_input_fields[i]
				newData[field] = $(this).attr("placeholder")
			})
			$(container).find("table.series_edit_table").bootstrapTable('updateByUniqueId',{id:rowId,row:newData})
			$(this).parents("tr").find(".add, .edit, .cancel").toggle();
			$(this).parents("tr").removeClass("rowToAdd")
			$(container).find(".add-new").removeAttr("disabled");
			$(container).find(".export-csv-all").removeAttr("disabled");
			$(container).find("a[data-toggle=tooltip]").tooltip()
			$(container).find("ul.pagination li").removeClass("disabled");
			$("span.page-list .btn-secondary").removeClass("disabled")
			//~ addPopoverToRows($(container).find("table.series_edit_table tr td:nth-child(n+3)"))
		})
		function returnFromReqCallback(jqxhr) {
			//~ series.sortObs()
			// series.reloadChart()
			$(container).find("a[data-toggle=tooltip]").tooltip()
			$(container).find("ul.pagination li").removeClass("disabled");
			$("span.page-list .btn-secondary").removeClass("disabled")
			$('div#myModalSeries').modal('hide')
			closemodal(jqxhr,container)
			location.reload()
		}
		// load series on view button click
		$(container).on("click", ".view", function(){		
			//~ $(this).tooltip('hide')
			//~ $(container).find("table.series_edit_table tbody").find(".cancel:visible").click()
			var seriesId = $(this).parents("tr").attr("data-uniqueid")
			var url = "secciones?seriesId="+seriesId
			var extraparams = ["varId","redId","cal_grupo_id","cal_id"]  // SELECT
			extraparams.forEach(key=>{
				var value = $("form#selectorForm div.form-group select[name="+key+"]").val()
				if(value) {
					url += "&" + key + "=" + value
				}
			})
			extraparams = ["timestart","timeend"]						// INPUT 
			extraparams.forEach(key=>{
				var value = $("form#selectorForm div.form-group input[name="+key+"]").val()
				if(value) {
					url += "&" + key + "=" + value
				}
			})
			extraparams = ["has_prono"]									// CHECKBOX
			extraparams.forEach(key=>{
				if($("form#selectorForm div.form-group input[name="+key+"]").prop('checked')) {
					url += "&" + key + "=on"
				}
			})
			//~ url += "#mapa"
			//~ console.log(url)
			$("a.nav-link#maptab").click()    // change to map tab
			window.location.href = url        // reload page
		})
		
		//~ ON SUBMIT CONFIRMATION FORM
		$("div#myModalSeries form#confirm").submit( function (event) {
			$(this).find("button[type=submit]").prop('disabled', true);
			event.preventDefault();
			$("body").css("cursor","progress")
			//~ var jqxhr
			var reqPars = {
				url:$(event.currentTarget).attr('action'),
				type:$(event.currentTarget).attr('method'),
				dataType:"json",
				error: function(xhr) {
					$("div#myModalSeries form#confirm").find("button[type=submit]").prop('disabled',false)
					$("body").css("cursor","default")
					if(xhr.responseText) {
						alert(xhr.responseText)
					} else {
						alert("Input error")
					}
					$('div#myModalSeries').modal('hide')
					closemodal(jqxhr,container)
				}
			}
			var inputs = {}	// Lee inputs del form
			$(event.currentTarget).serializeArray().filter(i=>!["btSelectItem","btSelectAll"].includes(i.name)).forEach(i=>{
				if (!inputs[i.name]) {
					inputs[i.name] = [i.value]
				} else {
					inputs[i.name].push(i.value)
				}
			})
			Object.keys(inputs).forEach(k=>{ 
				if(inputs[k].length==1) {
					inputs[k] = inputs[k][0]
				}
			})
			console.log({inputs:inputs})
			if(reqPars.type == "POST") {
				console.log("prepara post obs/puntual/series")
				if(inputs.series != "") {   // input series set by csv import
					reqPars.data = '{"series":'+inputs.series+'}'
				} else { // series object parameters set by form select
					reqPars.data = JSON.stringify({series:[makeSeriesObj($(event.currentTarget).find('select.new-series'))]})
				}
				console.log({request_data:reqPars.data})
				reqPars.contentType = "application/json; charset=utf-8"
				reqPars.dataType = "json"
				reqPars.success = function(response){
					if(Array.isArray(response)) {
						alert("Se insertaron/actualizaron " + response.length + " series. Se reiniciará la página")
					} else {
						alert("Se actualizó series_id " + response.id + ". Se reiniciará la página")
					}
					//~ updateSeriesTable(container,features,response)
					returnFromReqCallback(jqxhr)
				}
			} else if(reqPars.type == "PUT") { // reqPars.url == 'obs/puntual/series' ) { // prepara request para POST obs/puntual/series
				console.log("prepara put para obs/puntual/series/:id")
				reqPars.data = inputs.series  //{
					//~ series: [
						//~ {
							//~ tipo: inputs.tipo,
							//~ estacion_id: inputs.estacion_id,
							//~ var_id: inputs.var_id,
							//~ proc_id: inputs.proc_id,
							//~ unit_id: inputs.unit_id
						//~ }
					//~ ]
				//~ }
				reqPars.contentType = "application/json; charset=utf-8"
				reqPars.dataType = "json"
				reqPars.success = function(response){
					if(Array.isArray(response)) {
						alert("Se actualizaron " + response.length + " series. Se reiniciará la página")
					} else {
						alert("Se actualizó series_id " + response.id + ". Se reiniciará la página")
					}
					//~ updateSeriesTable(container,features,response)
					returnFromReqCallback(jqxhr)
				}
			//~ } 
			//~ else if (/^obs\/puntual\/series\/\d+$/.test(reqPars.url)) { // prepara request para PUT obs/puntual/series/:id
				//~ console.log("prepara put obs/puntual/series/:id")
				//~ reqPars.data =  {
					//~ serie: {
							//~ tipo: inputs.tipo,
							//~ estacion_id: inputs.estacion_id,
							//~ var_id: inputs.var_id,
							//~ proc_id: inputs.proc_id,
							//~ unit_id: inputs.unit_id
					//~ }
				//~ }
				//~ reqPars.contentType = "application/json; charset=utf-8"
				//~ reqPars.dataType = "json"
				//~ reqPars.success = function(response){
					//~ updateSeriesTable(container,features,response)
				//~ }
			} else if (reqPars.type == "DELETE") { 
				if(reqPars.url == "obs/puntual/series") { // prepara request para DELETE obs/puntual/series
					reqPars.url += "?id=" + (typeof inputs.id == "object") ? inputs.id.join(",") : inputs.id 
					reqPars.success = function(response) {
						$("div#myModalSeries form#confirm").find("button[type=submit]").prop('disabled',false)
						$("body").css("cursor","default")
						if(Array.isArray(response)) {
								alert("Deleted " + response.length + " series")
								var idsForDeletion = response.map(s=> s.id)
								idsForDeletion.forEach(id=>{
									$(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',id)
								})
								features = features.filter(f=> idsForDeletion.indexOf(f.series_id) < 0)
								$("button.remove-selected").attr("disabled",true)
						} else {
							alert("Nothing done")
						}
						returnFromReqCallback(jqxhr)
					}
				} else { // prepara request para DELETE obs/puntual/series/:id
					reqPars.success = function(response) {
						$("div#myModalSeries form#confirm").find("button[type=submit]").prop('disabled',false)
						$("body").css("cursor","default")
						if(response.id) {
							$(container).find("table.series_edit_table").bootstrapTable('removeByUniqueId',response.id)
							features = features.filter(f=> f.series_id != response.id)
							$("button.remove-selected").attr("disabled",true)
						} else {
							alert("Nothing done")
						}
						returnFromReqCallback(jqxhr)
					}
				}
			} else {
				alert("Bad request method")
				return
			}
			// REALIZA REQUEST
			jqxhr = $.ajax(reqPars)
			return false
		})
	})
	.fail(response=>{
		console.log(response.responseJSON)
		alert(response.responseJSON.error)	
	})
	//~ .fail( (xhr, status, e)=>{
		//~ console.error(e)
		//~ alert(e)
	//~ })
	const urlParams = new URLSearchParams(window.location.search)
	var estacionesUrl = "obs/puntual/estaciones" + ((urlParams.get("redId")) ? ( "?fuentes_id=" + urlParams.get("redId")) : "")  
	$.get(estacionesUrl,estaciones=>{
		seriesOptions.estacion_id = estaciones.map(estacion=>{
			var selected = ""
			//~ var selected = (urlParams.get('redId')) ? (red.id == urlParams.get('redId')) ? "selected" : "" : ""
			return {value: estacion.id, text: estacion.id + " - " + estacion.nombre}
			//~ "<option value=" + estacion.id + " " + selected + ">" + estacion.abrev + "(" + estacion.nombre + ")</option>"
		})
		$("form#confirm").find("select[name=estacion_id]").append(
			seriesOptions.estacion_id.map(o=> "<option value=" + o.value + ">" + o.text + "</option>").join("")
		)
		//~ .join("")
	})
	$.get("obs/variables",variables=>{
		seriesOptions.var_id = variables.map(variable=>{
			var selected = ""
			//~ var selected = (urlParams.get('redId')) ? (red.id == urlParams.get('redId')) ? "selected" : "" : ""
			return {value: variable.id, text: variable.id + " - " + variable.abrev + " (" + variable.nombre + ")"}
			//~ "<option value=" + variable.id + " " + selected + ">" + variable.abrev + "(" + variable.nombre + ")</option>"
		})
		$("form#confirm").find("select[name=var_id]").append(
			seriesOptions.var_id.map(o=> "<option value=" + o.value + ">" + o.text + "</option>").join("")
		)
		//~ .join("")
	})
	$.get("obs/procedimientos",procedimientos=>{
		seriesOptions.proc_id = procedimientos.map(proc=>{
			var selected = ""
			//~ var selected = (urlParams.get('redId')) ? (red.id == urlParams.get('redId')) ? "selected" : "" : ""
			return {value: proc.id, text: proc.id + " - " + proc.abrev + " (" + proc.nombre + ")"}
			//~ "<option value=" + proc.id + " " + selected + ">" + proc.abrev + "(" + proc.nombre + ")</option>"
		})
		$("form#confirm").find("select[name=proc_id]").append(
			seriesOptions.proc_id.map(o=> "<option value=" + o.value + ">" + o.text + "</option>").join("")
		)
		//~ .join("")
	})
	$.get("obs/unidades",unidades=>{
		seriesOptions.unit_id = unidades.map(unidad=>{
			var selected = ""
			//~ var selected = (urlParams.get('redId')) ? (red.id == urlParams.get('redId')) ? "selected" : "" : ""
			return {value: unidad.id, text: unidad.id + " - " + unidad.abrev + " (" + unidad.nombre + ")"}
			//~ "<option value=" + unidad.id + " " + selected + ">" + unidad.abrev + "(" + unidad.nombre + ")</option>"
		})
		$("form#confirm").find("select[name=unit_id]").append(
			seriesOptions.unit_id.map(o=> "<option value=" + o.value + ">" + o.text + "</option>").join("")
		)
		//~ .join("")
	})
}

function closemodal (jqxhr,container) {
		console.log("modal close 1")
	$("div#myModalSeries").hide(()=>{
		if(jqxhr.status != 200) {
			jqxhr.abort()
			$("div#myModalSeries form#confirm").find("button[type=submit]").prop('disabled',false)
			$(container).find("button.add-new").prop('disabled',false)
			$("div#myModalSeries form#confirm select.new-series").attr("required",false)
			$("div#myModalSeries form#confirm div.row.new-series").hide()
			$("body").css("cursor","default")
			//~ alert("Request aborted by user")
		}
	})
}

function csv2obs(tipo,series_id,csv) {
	// CSV fields must be: timestart, timeend, valor
	try {
		var observaciones = []
		var input = csv.trim().split("\n")
		for(var i=0;i < input.length; i++) {
			var row=input[i].split(",")
			var obs = {tipo:tipo, series_id:series_id, timestart: new Date(row[0]), timeend: new Date(row[1]), valor: row[2]}
			if(obs.timestart == "Invalid Date" || obs.timeend == "Invalid Date" || parseFloat(obs.valor) == "NaN") {
				//~ console.log({index:i,invalid_row:obs})
				throw "Invalid CSV"
				break
			}
			observaciones.push(obs)
		}
		return observaciones
	} catch (e) {
		console.log(e)
		return
	}
}

function csv2series(csv) {
	// CSV fields must be: estacion_id, var_id, proc_id, unit_id
	try {
		var series = []
		var input = csv.trim().split("\n")
		for(var i=0;i < input.length; i++) {
			var row=input[i].split(",")
			var serie = {tipo:"puntual", estacion_id:row[0], var_id:row[1], proc_id:row[2],unit_id:row[3]}
			if(parseInt(serie.estacion_id).toString() == "NaN" || parseInt(serie.var_id).toString() == "NaN" || parseInt(serie.proc_id).toString() == "NaN" || parseInt(serie.unit_id).toString() == "NaN") {
				console.log({index:i,invalid_row:serie})
				throw "Invalid CSV"
				break
			}
			//~ console.log({serie:serie})
			series.push(serie)
		}
		return series
	} catch (e) {
		console.log(e)
		return
	}
}


function arr2csv(arr) {
	return arr.map(r=> {
		return r.timestart + "," + r.timeend + "," + r.valor
	}).join("\n").trim()
} 

function seriesarr2csv(arr) {
	return arr.map(r=> {
		return "puntual," + r.series_id + "," + r.estacion_id + "," + r.var_id + "," + r.proc_id + "," + r.unit_id + "," + r.timestart + "," + r.timeend
	}).join("\n").trim()
} 


// función usada por el callback del request (POST o PUT) para actualizar la tabla de series
function updateSeriesTable(container,features,newObs,isWriter) {
	if(!Array.isArray(newObs)) {
		newObs = [newObs]
	}
	var data = $(container).find("table.series_edit_table").bootstrapTable('getData',{unfiltered:true})
	newObs.forEach( (serie,i) => {
		var newData = {
			id:serie.id,
			estacion_id: serie.estacion.id,
			nombre: serie.estacion.nombre,
			longitud: serie.estacion.geom.coordinates[0],
			latitud: serie.estacion.geom.coordinates[1],
			rio: serie.estacion.rio,
			var_id: serie.var.id,
			var_name: serie.var.nombre,
			proc_id: serie.procedimiento.id,
			unit_id: serie.unidades.id,
			timestart: null,
			timeend: null,
			forecast_date: null,
			data_availability: null,
			fuente: serie.estacion.tabla,
			id_externo: serie.estacion.id_externo,
			action: (isWriter) ? actions : public_actions
		}
		var match=false
		for(var i=0;i<data.length;i++) {
			if(data[i].id == newData.id) {
				match = true
				data[i] = newData
				break
			}
		}
		if(match) {
			for(var i=0;i<features.length;i++) {
				if(features[i].series_id == newData.id) {
					features[i] = newData
					break
				}
			}
		} else {
			data.push(newData)
			features.push(newData)
		}
	})
	$(container).find("table.series_edit_table").bootstrapTable('removeAll')
	//~ $(container).find("table.series_edit_table").bootstrapTable('removeByUniqueId',-1)
	$(container).find("table.series_edit_table").bootstrapTable('append',data)
	$(container).find("table.series_edit_table").bootstrapTable('refresh')
	$(container).find(".add-new").removeAttr("disabled");
	$(container).find(".export-csv-all").removeAttr("disabled");
}

function makeSeriesObj(input) {
	var seriesObj = {}
	input.each(function(){
		if(!$(this).val()){
			$(this).addClass("error");
			empty = true;
		} else{
			$(this).removeClass("error");
			var valor = parseInt($(this).val())
			if($(this).attr("name") == "estacion_id") {
				seriesObj.estacion = {id: valor}
			} else if($(this).attr("name") == "var_id") {
				seriesObj.var = {id: valor}
			} else if($(this).attr("name") == "proc_id") {
				seriesObj.procedimiento = {id: valor}
			} else if($(this).attr("name") == "unit_id") {
				seriesObj.unidades = {id: valor}
			}
			//~ seriesObj[$(this).attr("name")] = $(this).val() //("div#myModal form#confirm input.confirm[name="+$(this).attr("name")+"]").val($(this).val())
		}
	});
	return seriesObj
}

function addPopoverToRows(cells) {
	$(cells).popover('hide')
	console.log("add popover to rows")
	cells.css("cursor","pointer").attr({"data-toggle":"popover", "data-placement":"top", "title": "acción"})
}


function cellAttr(value) {
	return '<a 	style="cursor:pointer" data-toggle=popover data-placement=top title="acción">' + value + '</a>'
}
