var obs_input_fields = ["timestart","timeend","valor"]

var actions = '<a class="add" title="Add/Update" data-toggle="tooltip" style="display:none"><i class="material-icons">&#xE03B;</i></a> ' +
					'<a class="edit" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a> ' +
					'<a class="delete" title="Delete" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>' +
					'<a class="cancel" title="Cancel" data-toggle="tooltip" style="display:none"><i class="material-icons">cancel</i></a>'
var isWriter
function makeObsEditTable(container,series,isW) {
	isWriter = (isW) ? isW : false 
	$.get("html/obs_edit_table_container.html", html => { 
		$(container).append(html)
		$("div#myModal form#confirm input[name=series_id]").val(series.id)
		$("div#myModal form#confirm input[name=tipo]").val(series.tipo)
		$.get("json/gettable_sources.json", gettable_sources=>{
			gettable_sources.forEach(s=>{
				if(series.tipo==s.tipo && series.estacion.tabla==s.tabla && series.var.id==s.var_id) {
					$(container).find("button.get-from-source").attr("disabled",false)
				}
			})
		})
		//~ $.get("/getObservaciones",series)
		//~ .done(data=> {
		var $bstable = $(container).find("table.obs_edit_table").bootstrapTable() //.attr("data-toggle","table")
		if(!isWriter) {
			$(container).find("table.obs_edit_table").bootstrapTable('hideColumn','action')
			$(container).find("button.add-new").hide()
			$(container).find("button.remove-selected").hide()
			$(container).find("button.import-csv").hide()
			$(container).find("button.get-from-source").hide()
		}
		//~ $bstable.on('post-footer.bs.table', function () {
			//~ $(container).find('a[data-toggle="tooltip"]').tooltip()
		//~ })
		function reloadData(container,data) {
			$(container).find("table.obs_edit_table").bootstrapTable('removeAll')
			$(container).find("table.obs_edit_table").bootstrapTable('append', 
					//~ {id:r.id, timestart:r.timestart, timeend:r.timeend, valor:r.valor, action: '<a class="add" title="Add" data-toggle="tooltip" style="display:none"><i class="material-icons">&#xE03B;</i></a> ' +
				data.map(r=>{
					var row = {}
					if(Array.isArray(r)) {
						row = {
						  id:r[3], 
						  timestart:r[0], 
						  timeend:r[1], 
						  valor:r[2]
						}
					} else {
						row = {
						  id:r.id, 
						  timestart:r.timestart, 
						  timeend:r.timeend, 
						  valor:r.valor
					    }
					}
					row.action = isWriter ? '<a class="add" title="Add/Update" data-toggle="tooltip" style="display:none"><i class="material-icons">&#xE03B;</i></a> ' +
					'<a class="edit" title="Edit" data-toggle="tooltip"><i class="material-icons">&#xE254;</i></a> ' +
					'<a class="delete" title="Delete" data-toggle="tooltip"><i class="material-icons">&#xE872;</i></a>' +
					'<a class="cancel" title="Cancel" data-toggle="tooltip" style="display:none"><i class="material-icons">cancel</i></a>' : ""
					return row
				})
			)
		}
		$(container).find("table.obs_edit_table").on('check.bs.table', ()=>{
		   $("button.remove-selected").removeAttr('disabled')
		   $("button.export-csv").removeAttr('disabled')
		})
		$(container).find("table.obs_edit_table").on('check-all.bs.table',()=>{
		  var checked = $(container).find("table.obs_edit_table").bootstrapTable('getAllSelections')
		  if (checked.length > 0) {
			$("button.remove-selected").removeAttr('disabled')
			$("button.export-csv").removeAttr('disabled')
		  } else {
			$("button.remove-selected").attr('disabled','true')
		    $("button.export-csv").attr('disabled','true')
		  }
		})
		$(container).find("table.obs_edit_table").on('uncheck.bs.table', ()=>{
		  var checked = $(container).find("table.obs_edit_table").bootstrapTable('getAllSelections')
		  if (checked.length > 0) {
			$("button.remove-selected").removeAttr('disabled')
			$("button.export-csv").removeAttr('disabled')
		  } else {
			$("button.remove-selected").attr('disabled','true')
		    $("button.export-csv").attr('disabled','true')
		  }
		})
		reloadData(container,series.observaciones)
		$(container).find('[data-toggle="tooltip"]').tooltip();
		//~ actions = $(container).find("table.obs_edit_table td:last-child").html();
		// Append table with add row form on add new button click
		$(container).find(".add-new").click(function(){
			$(this).attr("disabled", "disabled");
			$(container).find("table.obs_edit_table").bootstrapTable('selectPage',1)
			var placeholders = $(container).find("table.obs_edit_table tbody tr:first-child td").map((i,e)=> $(e).html())
			$(container).find("table.obs_edit_table").bootstrapTable('prepend', 
				{
					id:-1, 
					timestart: '<input type="text" class="form-control" name="timestart" id="timestart" placeholder="'+ placeholders[2]+'" style="width: 200px" min=10 max=24 pattern="^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3}Z)?)?$">', 
					timeend: '<input type="text" class="form-control" name="timeend" id="timeend" placeholder="'+ placeholders[3]+'" style="width: 200px" min=10 max=24 pattern="^\\d{4}-\\d{2}-\\d{2}(T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3}Z)?)?$">', 
					valor: '<input type="text" class="form-control" name="valor" id="valor" placeholder="'+ placeholders[4]+'" style="width: 140px" pattern="^\\d+(\\.\\d+)?$">',
					action: isWriter ? actions : ""
			})
			//~ $(container).find("table.obs_edit_table").prepend(row);		
			$(container).find('table.obs_edit_table tbody tr[data-uniqueid="-1"]').eq(0).find(".add, .edit, .cancel").toggle(); // eq(index + 1).find(".add, .edit").toggle();
			$(container).find('table.obs_edit_table tbody tr[data-uniqueid="-1"] a[data-toggle="tooltip"]').tooltip();
			$(container).find("table.obs_edit_table").bootstrapTable('scrollTo',0)
			$(container).find('table.obs_edit_table tbody tr[data-uniqueid="-1"] td input:eq(0)').focus()
			$(container).find("ul.pagination li").addClass("disabled");
			$(container).find("span.page-list .btn-secondary").addClass("disabled")
			
		});
		// Add row on add button click
		$(container).on("click", ".add", function(){
			var empty = false;
			$("div#myModal form#confirm input[name=id]").val("")
			$("div#myModal form#confirm input[name=timestart]").val("")
			$("div#myModal form#confirm input[name=timeend]").val("")
			$("div#myModal form#confirm input[name=valor]").val("")
			var input = $(this).parents("tr").find('input[type="text"]');
			$(this).parents("tr").addClass("rowToAdd")
			input.each(function(){
				if(!$(this).val()){
					$(this).addClass("error");
					empty = true;
				} else{
					$(this).removeClass("error");
					$("div#myModal form#confirm input.confirm[name="+$(this).attr("name")+"]").val($(this).val())
				}
			});
			$(this).parents("tr").find(".error").first().focus();
			if(!empty){
				var obs_id = $(this).parents("tr").attr("data-uniqueid")
				if(obs_id == -1) {  // ADD NEW
					$("div#myModal form#confirm").attr("action","upsertObservacion").attr("method","POST")
				} else {  // UPDATE EXISTING
					$("div#myModal form#confirm").attr("action","obs/puntual/observaciones/" + obs_id).attr("method","PUT")
				}
				$("div#myModal").modal('show')
				//~ input.each(function(){
					//~ $(this).parent("td").html($(this).val());
				//~ });			
				//~ $(this).parents("tr").find(".add, .edit").toggle();
				//~ $(".add-new").removeAttr("disabled");
			}		
		});
		// Edit row on edit button click
		$(container).on("click", ".edit", function(){		
			$(this).tooltip('hide')
			$(container).find("table.obs_edit_table tbody").find(".cancel:visible").click()
			var idForEdition = $(this).parents("tr").attr("data-uniqueid") // find("td:first-child").eq(1).html()
			var oldData = $(container).find("table.obs_edit_table").bootstrapTable('getRowByUniqueId',idForEdition)
			var newData = {}
			obs_input_fields.forEach((f,i)=>{
				newData[f] = '<input type="text" name="'+f+'" class="form-control" value="' + oldData[f] + '" placeholder="' + oldData[f] + '">'
				$(container).find("table.obs_edit_table tbody tr[data-uniqueid="+idForEdition+"] td").eq(2+i).html(newData[f])
			})
			//~ $(container).find("table.obs_edit_table").bootstrapTable('updateByUniqueId',{id:idForEdition, row: newData})
			$(container).find("table.obs_edit_table tbody tr[data-uniqueid="+idForEdition+"]").find(".add, .edit, .cancel").toggle()
			$(container).find("a[data-toggle=tooltip]").tooltip()
			$(container).find(".add-new").attr("disabled", "disabled");
			$(container).find(".export-csv-all").attr("disabled", "disabled");
			$(container).find("ul.pagination li").addClass("disabled");
			$("span.page-list .btn-secondary").addClass("disabled")
		});
		// Delete row on delete button click
		$(container).on("click", ".delete", function(){
			var idForDeletion = $(this).parents("tr").attr("data-uniqueid") // find("td:first-child").eq(0).html()
			$(".add-new").removeAttr("disabled");
			if(idForDeletion != -1) {
				$("div#myModal form#confirm").attr("action","deleteObservacion").attr("method","POST") // $(container).find("form#confirm").attr("action","deleteObservacion")
				$("div#myModal form#confirm input[name=id]").val(idForDeletion) // $(container).find("form#confirm input[name=id]").val(idForDeletion)
				$("div#myModal form#confirm input[name=tipo]").val("puntual") // $(container).find("form#confirm input[name=tipo]").val("puntual")
				$('div#myModal').modal('show') // $(container).find('#myModal').modal('show')
			} else {
				$(container).find("table.obs_edit_table tbody tr[data-uniqueid=-1]").find("a[data-toggle=tooltip]").tooltip('hide')
				$(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',"-1")
				$(container).find("a[data-toggle=tooltip]").tooltip()
				//~ $(this).parents("tr").remove();
				$(container).find("ul.pagination li").removeClass("disabled");
				$("span.page-list .btn-secondary").removeClass("disabled")
			}
		});
		// Remove selected rows on button click
		$(container).find(".remove-selected").click(function(){
			$("div#myModal form#confirm input[name=id]").remove()
			$(".add-new").removeAttr("disabled");
			var selected = $(container).find("table.obs_edit_table").bootstrapTable('getAllSelections')
			//~ console.log(selected)
			selected.forEach((row,i)=> {
				//~ $(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',uid)
				$("div#myModal form#confirm").append(
					$("<input name=id hidden value="+row.id+">")
				)
			})
			$("div#myModal form#confirm span#removeselected").html("<p>Selected " + selected.length + " rows for deletion</p>").show()
			$("div#myModal form#confirm").attr("action","deleteObservacionesById").attr("method","POST")
			$("div#myModal form#confirm input[name=tipo]").val("puntual")
			$('div#myModal').modal('show').on('hide.bs.modal', function (e) {
				$(e.target).find("span#removeselected").hide()
			})
		})
		// select all rows on all pages on click
		$(container).find(".select-all").click(function(){
			$(container).find("table.obs_edit_table").bootstrapTable('togglePagination')
			$(container).find("table.obs_edit_table").bootstrapTable('checkAll')
			$(container).find("table.obs_edit_table").bootstrapTable('togglePagination')
		})
		// select all rows on all pages on click
		$(container).find(".invert-select").click(function(){
			$(container).find("table.obs_edit_table").bootstrapTable('checkInvert')
		})
		// Import CSV data
		$(container).find(".import-csv").click(function(){
			$(".add-new").removeAttr("disabled");
			$("div#myModal form#confirm").attr("action","upsertObservaciones").attr("method","POST")
			$("div#myModal form#confirm span#csvfile").show();
			$('div#myModal').modal('show').on('hide.bs.modal', function (e) {
				$(e.target).find('table#rowstoinsert').bootstrapTable('destroy')
				$(e.target).find('table#rowstoinsert').remove()
				$(e.target).find('span#csvfile').hide()
				$(e.target).find('input[name=csvfile]').val(null)
				$(e.target).find('input[name=observaciones]').val(null)
			})
			$("div#myModal form#confirm input#csvfile").change( evt=> {
		       var files = evt.target.files;
			   var file = files[0];
			   var reader = new FileReader();
			   reader.onload = function(event) {
				 $("div#myModal table#rowstoinsert").bootstrapTable('destroy')
				 $("div#myModal table#rowstoinsert").remove()
				 var obs = csv2obs(series.tipo,series.id,event.target.result);
				 if(!obs) {
					 alert("Invalid file")
					 return
				 }
				 if(obs.length<=0) {
					 alert("Empty file")
					 return
				 }
				 $("div#myModal form#confirm input#csvfile").after(
					$("<table class=bootstraped id=rowstoinsert data-height=300>" + 
						"<thead>" + 
							"<tr>" +
								"<th data-field=timestart>timestart</th>" +
								"<th data-field=timeend>timeend</th>" +
								"<th data-field=valor>valor</th>" +
							"</th>" +
						"</thead>" +
					"</table")
				 )
				 $("div#myModal table#rowstoinsert").bootstrapTable()
				 observaciones = obs.map(o=> { 
					 var thisobs = o
					 thisobs.timestart = o.timestart.toISOString()
					 thisobs.timeend = o.timeend.toISOString()
					 return thisobs
				 })
				 $("div#myModal table#rowstoinsert").bootstrapTable('append', observaciones)
				 $("div#myModal form#confirm input[name=observaciones]").val(JSON.stringify(observaciones))
			   }
			   reader.readAsText(file)
			})
						//~ $(container).find("form#confirm input#csvfile").trigger("click")
			
		})
		// Get From Source
		$(container).find(".get-from-source").click(function(){
			$(".add-new").removeAttr("disabled");
			$("div#myModal form#confirm").attr("action","getFromSource").attr("method","POST")
			//~ $(container).find("form#confirm label[for=timestart]").attr("hidden",false)
			//~ $(container).find("form#confirm input[name=timestart]").val($("form#selectorform input#timestart").val()).attr("hidden",false)
			//~ $(container).find("form#confirm label[for=timeend]").attr("hidden",false)
			//~ $(container).find("form#confirm input[name=timeend]").val($("form#selectorform input#timeend").val()).attr("hidden",false)
			$("div#myModal div#authentication").hide()
			//~ '<div class=row>\
					//~ <div class="col-sm">\
						//~ <label for=timestart>timestart</label>\
					//~ </div>\
					//~ <div class="col-sm">\
						//~ <input name=timestart />\
					//~ </div>\
				//~ </div>\
				//~ <div class=row>\
					//~ <div class="col-sm">\
						//~ <label for=timeend>timeend</label>\
					//~ </div>\
					//~ <div class="col-sm">\
						//~ <input name=timeend />\
					//~ </div>\
				//~ </div>\
			
			$("div#myModal span#getfromsource").html('<div class=row>\
					<button type=submit>Sumbit</submit>\
				</div>')
			//~ $("div#myModal span#getfromsource input[name=timestart]").val($("form#selectorform input#timestart").val())
			//~ $("div#myModal span#getfromsource input[name=timeend]").val($("form#selectorform input#timeend").val())
			$("div#myModal input[name=timestart]").val($("form#selectorform input#timestart").val())
			$("div#myModal div#timestart").attr('hidden',false)
			$("div#myModal input[name=timeend]").val($("form#selectorform input#timeend").val())
			$("div#myModal div#timeend").attr('hidden',false)
			$("div#myModal span#getfromsource").show()
			$('div#myModal').modal('show').on('hide.bs.modal', function (e) {
				$(e.target).find('table#rowstoinsert').bootstrapTable('destroy')
				$(e.target).find('table#rowstoinsert').remove()
				$(e.target).find('input[name=observaciones]').val(null)
				//~ $(e.target).find("label[for=timestart]").attr("hidden",true)
				//~ $(e.target).find('input[name=timestart]').val(null).attr("hidden",true)
				//~ $(e.target).find("label[for=timeend]").attr("hidden",true)
				//~ $(e.target).find('input[name=timeend]').val(null).attr("hidden",true)
				$("div#myModal div#authentication").show()
				$("div#myModal span#getfromsource").hide()
				$("div#myModal span#getfromsource").html("")
				$("div#myModal div#timestart").attr('hidden',true)
				$("div#myModal div#timeend").attr('hidden',true)
			})
		})
		// Export selected CSV data
		$(container).find(".export-csv").click(function(){
			var data = $(container).find("table.obs_edit_table").bootstrapTable('getAllSelections')
			var csv = arr2csv(data)
			//~ console.log(csv)
			var gblob = new Blob([csv], {type: "octet/stream"})
			var gurl = window.URL.createObjectURL(gblob);
			$("div#myModal span#exportcsv a").attr('href',gurl).html("Selected " + data.length + " rows to download as CSV").on("click", e=>{
				//~ $("#myModal").modal("hide")
			})
			$("div#myModal span#exportcsv").show()
			$("div#myModal div#authentication").hide()
			$("div#myModal div#authentication input").attr("disabled",true)
			$("div#myModal").modal('show').on('hide.bs.modal', function (e) {
				$(e.target).find("span#exportcsv").hide()
				$(e.target).find("span#exportcsv a").attr("href",null)
				$(e.target).find("div#authentication").show()
				$(e.target).find("div#authentication input").attr("disabled",false)
			})
		})
		// Export All CSV data
		$(container).find(".export-csv-all").click(function(){
			var data = $(container).find("table.obs_edit_table").bootstrapTable('getData')
			var csv = arr2csv(data)
			//~ console.log(csv)
			var gblob = new Blob([csv], {type: "octet/stream"})
			var gurl = window.URL.createObjectURL(gblob);
			$("div#myModal span#exportcsv a").attr('href',gurl).html("Descargar todo como CSV (" + data.length + " registros)").on("click", e=>{
				//~ $("#myModal").modal("hide")
			})
			$("#myModal span#exportjson input#exportjsonurl").val(window.location.origin + window.location.pathname.replace(/[^/]*$/,"") + "obs/puntual/series/" + global.series.id + "/observaciones?timestart=" + global.series.timestart + "&timeend=" + global.series.timeend).removeAttr("disabled")
			$("#myModal span#exportmnemos input#exportmnemosurl").val(window.location.origin + window.location.pathname.replace(/[^/]*$/,"") + "obs/puntual/series/" + global.series.id + "?timestart=" + global.series.timestart + "&timeend=" + global.series.timeend + "&format=mnemos").removeAttr("disabled")
			$("div#myModal span#exportcsv").show()
			$("div#myModal span#exportjson").show()
			$("div#myModal span#exportmnemos").show()
			$("div#myModal div#authentication").hide()
			$("div#myModal div#authentication input").attr("disabled",true)
			$("div#myModal").modal('show').on('hide.bs.modal', function (e) {
				$(e.target).find("span#exportcsv").hide()
				$(e.target).find("span#exportjson").hide()
				$(e.target).find("span#exportmnemos").hide()
				$("#myModal span#exportjson input#exportjsonurl").val("").attr("disabled","disabled")
				$("#myModal span#exportmnemos input#exportmnemosurl").val("").attr("disabled","disabled")
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
				//~ $(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',"null")
				//~ $(this).parents("tr").remove()
				$(container).find("table.obs_edit_table tbody tr[data-uniqueid=-1]").find("a[data-toggle=tooltip]").tooltip('hide')
				$(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',"-1")
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
			$(container).find("table.obs_edit_table tbody tr[data-uniqueid="+rowId+"]").find("input[type=text]").each(function(i) {  // td:not(:first-child):not(:last-child)
				//~ $(this).html(restoreData[input_fields[i]])
				var field=obs_input_fields[i]
				newData[field] = $(this).attr("placeholder")
			})
			$(container).find("table.obs_edit_table").bootstrapTable('updateByUniqueId',{id:rowId,row:newData})
			$(this).parents("tr").find(".add, .edit, .cancel").toggle();
			$(this).parents("tr").removeClass("rowToAdd")
			$(container).find(".add-new").removeAttr("disabled");
			$(container).find(".export-csv-all").removeAttr("disabled");
			$(container).find("a[data-toggle=tooltip]").tooltip()
			$(container).find("ul.pagination li").removeClass("disabled");
			$("span.page-list .btn-secondary").removeClass("disabled")
		})
		$("div#myModal form#confirm").submit( function (event) {
			$(this).find("button[type=submit]").prop('disabled', true);
			event.preventDefault();
			$("body").css("cursor","progress")
			var requestBody = {}
			$(event.currentTarget).serializeArray().filter(i=>!["btSelectItem","btSelectAll"].includes(i.name)).forEach(i=>{
				if (!requestBody[i.name]) {
					requestBody[i.name] = [i.value]
				} else {
					requestBody[i.name].push(i.value)
				}
			})
			Object.keys(requestBody).forEach(k=>{ 
				if(requestBody[k].length==1) {
					requestBody[k] = requestBody[k][0]
				}
			})
			//~ var jqxhr = $.post($(event.currentTarget).attr('action'),requestBody,function(response) {
			var jqxhr = $.ajax({
				url:$(event.currentTarget).attr('action'),
				type:$(event.currentTarget).attr('method'),
				data:JSON.stringify(requestBody),
				contentType:"application/json; charset=utf-8",
				dataType:"json",
				success: function(response){
					$("div#myModal form#confirm").find("button[type=submit]").prop('disabled',false)
					$("body").css("cursor","default")
					if(response.id || Array.isArray(response)) {
						//~ alert("obs id:"+response.id)
						if($(event.currentTarget).attr('action') == "deleteObservacion") {
							//~ $(container).find("table.obs_edit_table tbody tr#"+response.id).remove();
							$(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',response.id)
							series.observaciones = series.observaciones.filter(o=> o[3] != response.id)
							$("button.remove-selected").attr("disabled",true)
						} else if ($(event.currentTarget).attr('action') == "deleteObservacionesById"){
							$("div#myModal form#confirm input[name=id]").remove()
							$("div#myModal form#confirm").append(
								$("<input name=id hidden>")
							)
							if(Array.isArray(response)) {
								alert("Deleted " + response.length + " rows")
								var idsForDeletion = response.map(o=> o.id)
								idsForDeletion.forEach(id=>{
									$(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',id)
								})
								series.observaciones = series.observaciones.filter(obs=> idsForDeletion.indexOf(obs[3]) < 0)
							} else {
								alert("Deleted 1 rows")
								$(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',response.id)
							}
							$("button.remove-selected").attr("disabled",true)
						} else if ($(event.currentTarget).attr('action') == "upsertObservacion") {
							//~ $(container).find("table.obs_edit_table tbody tr[id="+response.id+"]:not(.rowToAdd)").remove()
							updateObsTable(container,series,response)
							
						} else if ($(event.currentTarget).attr('action') == "upsertObservaciones") {
							alert("Upserted " + response.length + " observaciones")
							updateObsTable(container,series,response)
						} else if ($(event.currentTarget).attr('action') == "getFromSource") {
							console.log("Got " + response.length + " observaciones from source")
							$("div#myModal span#getfromsource").hide()
							//~ $("#myModal").css("cursor","progress")
							//~ $(container).find("form#confirm button[type=submit]").attr("disabled",true)
							$("div#myModal form#confirm").attr("action","upsertObservaciones")
						//~ $.get("getFromSource?"+$(container).find("form#confirm").serialize(), obs=>{
							$("div#myModal table#rowstoinsert").bootstrapTable('destroy')
							$("div#myModal table#rowstoinsert").remove()
							if(!response) {
								alert("Nothing retrieved from source")
								return
							}
							if(response.length<=0) {
								alert("Nothing retrieved from source")
								return
							}
							$("div#myModal form#confirm input[name=observaciones]").after(
								$("<table class=bootstraped data-multiple-select-row=true id=rowstoinsert data-height=300>" + 
									"<thead>" + 
										"<tr>" +
											"<th data-field=state data-checkbox=true></th>" +
											"<th data-field=timestart>timestart</th>" +
											"<th data-field=timeend>timeend</th>" +
											"<th data-field=valor>valor</th>" +
										"</th>" +
									"</thead>" +
								"</table")
							)
							$("div#myModal table#rowstoinsert").bootstrapTable()
							$("div#myModal table#rowstoinsert").bootstrapTable('append', response)
							$("div#myModal table#rowstoinsert").bootstrapTable().on('check.bs.table',()=>{
								$("div#myModal form#confirm input[name=observaciones]").val(JSON.stringify($("table#rowstoinsert").bootstrapTable('getAllSelections')))
							})
							$("div#myModal table#rowstoinsert").bootstrapTable().on('uncheck.bs.table',()=>{
								$("div#myModal form#confirm input[name=observaciones]").val(JSON.stringify($("table#rowstoinsert").bootstrapTable('getAllSelections')))
							})
							$("div#myModal table#rowstoinsert").bootstrapTable().on('check-all.bs.table',()=>{
								$("div#myModal form#confirm input[name=observaciones]").val(JSON.stringify($("table#rowstoinsert").bootstrapTable('getAllSelections')))
							})
							$("div#myModal table#rowstoinsert").bootstrapTable().on('uncheck-all.bs.table',()=>{
								$("div#myModal form#confirm input[name=observaciones]").val(JSON.stringify($("table#rowstoinsert").bootstrapTable('getAllSelections')))
							})
							$("div#myModal table#rowstoinsert").bootstrapTable('checkAll')
							//~ $(container).find("form#confirm input[name=observaciones]").val(JSON.stringify(response))
							$("div#myModal div#authentication").show()
							return
						}
						series.sortObs()
						series.reloadChart()
					} else {
						alert("Nothing done")
					}
					$(container).find("a[data-toggle=tooltip]").tooltip()
					$(container).find("ul.pagination li").removeClass("disabled");
					$("span.page-list .btn-secondary").removeClass("disabled")
					$('div#myModal').modal('hide')
					closemodal(jqxhr)
				},
				error: function(xhr) {
					$("div#myModal form#confirm").find("button[type=submit]").prop('disabled',false)
					$("body").css("cursor","default")
					if(xhr.responseText) {
						alert(xhr.responseText)
					} else {
						alert("Input error")
					}
					$('div#myModal').modal('hide')
					closemodal(jqxhr)
				}
			})
			return false
		})
	})
	.fail(response=>{
		console.log(response.responseJSON)
		alert(response.responseJSON.error)	
	})
}

function closemodal (jqxhr) {
	$("div#myModal").hide(()=>{
		if(jqxhr.status != 200) {
			jqxhr.abort()
			$("div#myModal form#confirm").find("button[type=submit]").prop('disabled',false)
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

function arr2csv(arr) {
	return arr.map(r=> {
		return r.timestart + "," + r.timeend + "," + r.valor
	}).join("\n").trim()
} 


//~ function updateObsTable_old(container,series,newObs) {
	//~ if(!Array.isArray(newObs)) {
		//~ newObs = [newObs]
	//~ }
	//~ var oldObs = $(container).find("table.obs_edit_table").bootstrapTable('getData',{unfiltered:true})
	//~ newObs.forEach( (obs,i) => {
		//~ var newData={id:obs.id,action:actions}
		//~ input_fields.forEach(f=>{
			//~ newData[f] = obs[f]
		//~ })
		//~ var oldRow =  $(container).find("table.obs_edit_table").bootstrapTable('getRowByUniqueId',obs.id)
		//~ if(oldRow) {
			//~ $(container).find("table.obs_edit_table").bootstrapTable('updateByUniqueId',{id:obs.id,row:newData})
			//~ var index
			//~ $(container).find("table.obs_edit_table tbody tr[data-uniqueid=" + obs.id + "] .add").hide()
			//~ $(container).find("table.obs_edit_table tbody tr[data-uniqueid=" + obs.id + "] .edit").show()
			//~ $(container).find("table.obs_edit_table tbody tr[data-uniqueid=" + obs.id + "] .cancel").hide()
			//~ for(var i=0;i<series.observaciones.length;i++) {
				//~ if(series.observaciones[i][3] == obs.id) {
					//~ series.observaciones[i] = [obs.timestart, obs.timeend, obs.valor, obs.id]
					//~ break
				//~ }
			//~ }
		//~ } else {
			//~ $(container).find("table.obs_edit_table").bootstrapTable('insertRow',{index:0,row:newData})
			//~ series.observaciones.push([obs.timestart, obs.timeend, obs.valor, obs.id])
		//~ }
	//~ })
	//~ $(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',-1)
	//~ $(container).find("table.obs_edit_table").bootstrapTable('refresh')
	//~ $(container).find(".add-new").removeAttr("disabled");
	//~ $(container).find(".export-csv-all").removeAttr("disabled");

//~ }

function updateObsTable(container,series,newObs) {
	console.log("updateObsTable, isWriter:" + isWriter)
	if(!Array.isArray(newObs)) {
		newObs = [newObs]
	}
	var data = $(container).find("table.obs_edit_table").bootstrapTable('getData',{unfiltered:true})
	newObs.forEach( (obs,i) => {
		var newData={id:obs.id,action: isWriter ? actions : ""}
		obs_input_fields.forEach(f=>{
			newData[f] = obs[f]
		})
		var match=false
		for(var i=0;i<data.length;i++) {
			if(data[i].id == obs.id) {
				match = true
				data[i] = newData
				break
			}
		}
		if(match) {
			for(var i=0;i<series.observaciones.length;i++) {
				if(series.observaciones[i][3] == obs.id) {
					series.observaciones[i] = [obs.timestart, obs.timeend, obs.valor, obs.id]
					break
				}
			}
		} else {
			data.push(newData)
			series.observaciones.push([obs.timestart, obs.timeend, obs.valor, obs.id])
		}
	})
	$(container).find("table.obs_edit_table").bootstrapTable('removeAll')
	//~ $(container).find("table.obs_edit_table").bootstrapTable('removeByUniqueId',-1)
	$(container).find("table.obs_edit_table").bootstrapTable('append',data)
	$(container).find("table.obs_edit_table").bootstrapTable('refresh')
	$(container).find(".add-new").removeAttr("disabled");
	$(container).find(".export-csv-all").removeAttr("disabled");
}
