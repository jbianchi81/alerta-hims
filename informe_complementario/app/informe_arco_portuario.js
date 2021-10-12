app.get('/arco_portuario_rio_parana', (req, res) => {
  if(!req.isAuthenticated()) { 
		res.redirect('/login')
		return
	}
  const client = new Client(config.database)
  client.connect()
  if(req.query.fecha) {    // "fecha" especificada, busca en DB, 
	  client.query("SELECT to_char(fecha,'YYYY-MM-DD'::text) fecha, situacion_general, smn_map_file, cptec_map_file, tendencia_climatica, pronostico_meteorologico, tendencia_hidrometrica, synop_pasada, synop_presente FROM informe_arco_portuario_rio_parana WHERE fecha = $1", [req.query.fecha], (err, result) => {
		if(err) {
					console.log(err.stack)
					res.status(500).send("Server Error")
					return
		}
		var fecha_semana_pasada = new Date(new Date(req.query.fecha).getTime() - 7*24*3600*1000) 
		if(result.rows.length <=0) {
			res.render('edit_arco_portuario_rio_parana',{fecha:req.query.fecha, fecha_semana_pasada: fecha_semana_pasada, synop_pasada: "mapas_semanales/" + dateFormat(fecha_semana_pasada,'isoDate').substring(0,4) + "/" + dateFormat(fecha_semana_pasada,'isoDate').substring(5,7) + "/pp_semanal_" + dateFormat(fecha_semana_pasada,'isoDate').replace(/-/g,"") + "_rst.png", synop_presente: "mapas_semanales/" + req.query.fecha.substring(0,4) + "/" + req.query.fecha.substring(5,7) + "/pp_semanal_" + req.query.fecha.replace(/-/g,"") + "_rst.png"})
			console.log("fecha no encontrada, imprimiendo formulario vacío")
			return
		}
		result.rows[0].smn_map_file = result.rows[0].smn_map_file.replace(/^public\//,"")
		result.rows[0].cptec_map_file = result.rows[0].cptec_map_file.replace(/^public\//,"")
		result.rows[0].synop_pasada = (result.rows[0].synop_pasada) ? result.rows[0].synop_pasada : "mapas_semanales/" + result.rows[0].fecha_semana_pasada.substring(0,4) + "/" + result.rows[0].fecha_semana_pasada.substring(5,7) + "/pp_semanal_" + result.rows[0].fecha_semana_pasada.replace(/-/g,"") + "_rst.png"
		result.rows[0].synop_presente = (result.rows[0].synop_presente) ? result.rows[0].synop_presente : "mapas_semanales/" + result.rows[0].fecha.substring(0,4) + "/" + result.rows[0].fecha.substring(5,7) + "/pp_semanal_" + result.rows[0].fecha.replace(/-/g,"") + "_rst.png"
		console.log(result.rows[0])
		//~ busca niveles
		client.query("SELECT to_char(fecha_emision,'YYYY-MM-DD'::text) fecha_emision, to_char(fecha,'YYYY-MM-DD'::text) fecha, estacion_id, valor FROM informe_arco_portuario_rio_parana_niveles WHERE fecha_emision = $1 ORDER BY fecha,estacion_id", [req.query.fecha], (err, hresult) => {
			if(err) {
				console.log(err.stack)
				res.status(500).send("Server error, niveles no encontrados")
				return
			}
			if(hresult.rows.length<=0) {
				res.render("edit_arco_portuario_rio_parana", {...result.rows[0], fecha_semana_pasada: fecha_semana_pasada)
				console.log("edit_arco_portuario_rio_parana displayed with fecha, without niveles")
				return
			}
			var columns = [ 18, 19, 20 ,21, 22, 23, 24, 25, 26, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 45]
			var fechas = [...Set(hresult.rows.map(r=>r.fecha))]
			var h_table = fechas.map(fecha=>{
				var row = columns.map(estacion_id=>{
					var valor
					for(var i=0;i<hresult.rows.length;i++) {
						if(hresult.rows[i].fecha == fecha && hresult.rows[i].estacion_id == estacion_id) {
							valor = hresult.rows[i].valor
						}
					}
					if(parseFloat(valor) == "NaN") {
						console.error("falta valor para fecha " + fecha + ", estacion_id " + estacion_id)
						return null
					} else {
						return valor
					}
				})
				return [fecha, ...row]
			})
			res.render('edit_arco_portuario_rio_parana', {...result.rows[0], niveles:h_table, fecha_semana_pasada: fecha_semana_pasada })
			console.log('edit_arco_portuario_rio_parana displayed with fecha and niveles')
			return
		})
	  })			
	} else {
	 client.query("SELECT to_char(fecha,'YYYY-MM-DD'::text) fecha FROM informe_arco_portuario_rio_parana ORDER BY fecha DESC", (err, result) => {
		if(err) {
			console.log(err)
			res.status(500).send("Server Error")
			return
		}
		res.render('choose_date_arco_portuario',{fechas:result.rows})
		console.log("choose_date_arco_portuario rendered")
	}) 
	  
  }
})
