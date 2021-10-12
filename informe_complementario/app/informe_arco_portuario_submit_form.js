const generarInformeArcoPortuario = function (pool,req,callback) {
	console.log("generarInformeArcoPortuario...")
	new formidable.IncomingForm().parse(req, (err, fields, files) => {
		if (err) {
		  console.error('Error', err)
		  callback({status:500,message:"parse error",error:err})
		  return
		} 
		if(!fields.fecha) {
			console.log("ERRor falta fecha!")
			callback({status:400,message:"Error: falta fecha"})
			return
		}
		var smn_map_file
		if(files.smn_map_file.size <= 0 ) {
			smn_map_file = (fields.smn_map_file) ? fields.smn_map_file.replace(/^/,"public/") : "public/img/smn_map_file_" + fields.fecha + ".png"
			if(!fs.existsSync(smn_map_file)) {
				console.log("Error falta imagen smn. <a href=\"javascript:history.back()\">Volver</a>")
				callback({status:400,message:"Error: falta imagen smn"})
				return
			}
		} else {
			if(!fs.existsSync(files.smn_map_file.path)) {
				console.log("smn file not found")
				callback({status:400,message:"file not found"})
				return
			}
			smn_map_file = "public/img/smn_map_file_" + fields.fecha + ".png"
			fs.copyFileSync(files.smn_map_file.path,smn_map_file)
			console.log(' smn_map_file copied to  ' + smn_map_file)
		}
		var cptec_map_file
		if(files.cptec_map_file.size <= 0 ) {
			cptec_map_file = (fields.cptec_map_file) ? fields.cptec_map_file.replace(/^/,"public/") : "public/img/cptec_map_file_" + fields.fecha + ".png"
			if(!fs.existsSync(cptec_map_file)) {
				console.log("Error falta imagen cptec. <a href=\"javascript:history.back()\">Volver</a>")
				callback({status:400,message:"Error: falta imagen cptec"})
				return
			}
		} else {
			if(!fs.existsSync(files.cptec_map_file.path)) {
				console.log("cptec file not found")
				callback({status:400,message:"file not found"})
				return
			}
			cptec_map_file = "public/img/cptec_map_file_" + fields.fecha + ".png"
			fs.copyFileSync(files.cptec_map_file.path,cptec_map_file)
			console.log(' cptec_map_file copied to  ' + cptec_map_file)
		}
		pool.connect( async (err,client,done) => {
		try {
			const result = await client.query("INSERT INTO informe_arco_portuario_rio_parana (fecha, situacion_general, smn_map_file, cptec_map_file, tendencia_climatica, pronostico_meteorologico, tendencia_hidrometrica, synop_pasada, synop_presente) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (fecha) DO UPDATE SET situacion_general=excluded.situacion_general, smn_map_file=excluded.smn_map_file, cptec_map_file=excluded.cptec_map_file, tendencia_climatica=excluded.tendencia_climatica, pronostico_meteorologico=excluded.pronostico_meteorologico, tendencia_hidrometrica=excluded.tendencia_hidrometrica, synop_pasada=excluded.synop_pasada, synop_presente=excluded.synop_presente RETURNING fecha", [fields.fecha, fields.situacion_general, fields.smn_map_file, fields.cptec_map_file, fields.tendencia_climatica, fields.pronostico_meteorologico, fields.tendencia_hidrometrica, fields.synop_pasada, fields.synop_presente])
			console.log("row inserted")
			//~ PRONO MEDIAS SEMANALES //
			if(!fields.pronosticos) {
				console.log("pronosticos property missing")
				await client.query("ROLLBACK")
				//~ client.end()
				callback({status:400, message:"prono_diario property missing"})
				return
			}
			var pronosticos = JSON.parse(fields.pronosticos)
			if(!Array.isArray(pronosticos)) {
				console.log("pronosticos property is not an Array")
				await client.query("ROLLBACK")
				//~ client.end()
				callback({status:400, message:"prono_diario property is not an Array"})
				return
			}
			if(pronosticos.length <= 0) {
				console.log("pronosticos property is empty")
				await client.query("ROLLBACK")
				//~ client.end()
				callback({status:400, message:"prono_diario property is empty"})
				return
			}
			await client.query("DELETE FROM informe_arco_portuario_rio_parana_niveles WHERE fecha_emision=$1",[fields.fecha])
			var hrows = pronosticos.map(p=>{
				return "('" + p.fecha_emision + "','" + p.fecha + "'," + parseInt(p.estacion_id) + "," + parseFloat(p.valor) + ")"
			}).join(",")
			h = await client.query("INSERT INTO informe_paraguay_prono_diario (fecha_emision, fecha, estacion_id, valor) VALUES " + hrows + " ON CONFLICT (fecha,fecha_emision,estacion_id) DO UPDATE SET valor=excluded.valor RETURNING fecha")
			await client.query("COMMIT")
			// INSERT_CORRIDAS
			insert_corridas_semanal(pool,fields.fecha)
			// IMPRIME INFORME
			console.log("run latex_functions.print_informe_arco_portuario, fecha: " + fields.fecha)
			//~ setTimeout(
				print_informe_arco_portuario(fields.fecha, (err,result) => {
					if(err) {
						callback({status:err.status, message:err.message, error: err.error})
						return
					}
					console.log("printinf_paraguay success!")
					callback(null, result)
				})
				//~ , 500
				//~ )
			} catch(err) {
					await client.query('ROLLBACK')
					//~ client.end()
					console.error("Insert informe_arco_portuario pg error", err.error)
					callback({status:500, message: "Server Error: " + err, error:err})
					//~ throw err
					//~ throw new Error("Server Error")
			} finally {
				client.release()
			}
		})
	})
}

function insert_corridas_semanal(pool,fecha) {
	var cal_id=434
	pool.connect(async client=>{
		await client.query("BEGIN")
		var corrida = await client.query("insert into corridas (cal_id,date) values ($1,$2) on conflict (cal_id,date) do update set series_n=corridas.series_n+1 returning *",[cal_id,fecha])
		var pronosticos = await client.query("with p as (\
			insert into pronosticos (cor_id,series_id,timestart,timeend)\
				select $1, series.id, informe_arco_portuario_rio_parana_niveles.fecha, informe_arco_portuario_rio_parana_niveles.fecha\
				FROM series,informe_arco_portuario_rio_parana_niveles\
				WHERE series.estacion_id=informe_arco_portuario_rio_parana_niveles.estacion_id\
				AND series.var_id=67\
				AND series.proc_id=1\
				AND series.unit_id=11\
				AND informe_arco_portuario_rio_parana_niveles.fecha_emision=$2\
			ON CONFLICT DO UPDATE SET timeupdate=excluded.timeupdate\
			RETURNING *\
			)\
			insert into valores_prono_num (prono_id,valor)\
				SELECT p.id, informe_arco_portuario_rio_parana_niveles.valor\
				FROM p,informe_arco_portuario_rio_parana_niveles\
				WHERE informe_arco_portuario_rio_parana_niveles.fecha_emision=$2\
			ON CONFLICT DO UPDATE SET valor=excluded.valor\
			RETURNING *",[cal_id,fecha])
		await client.query("COMMIT")
	})
}
