// informes.js

const formidable = require('formidable')

exports.generarInformeComplementario = function (pool,req,callback) {
	new formidable.IncomingForm().parse(req, (err, fields, files) => {
		if (err) {
		  console.error('Error', err)
		  callback({status:500,message:"parse error",error:err})
		} else {
		//~ if(!fields.user || !fields.password) {
			//~ console.error("User o password missing!")
			//~ res.status(400).send("Error: falta usuario y/o contraseña")
			//~ return
		//~ }
			pool.connect( (err, client, done) => {
				if(err) {
					console.error("pool.connect error!")
					client.end()
					callback({status:500,message:"Server error: Database connection failed. <a href=\"javascript:history.back()\">Volver</a>",error:err})
				} else {
					console.log("login correcto")
					client.end()
					//~ console.log('Fields', fields)
					//~ console.log('Files', files)
					//~ Object.keys(files).map(file => {
						//~ console.log(file)
					  //~ console.log(files[file])
					//~ })
					if(!fields.fecha) {
						console.log("ERRor falta fecha!")
						callback({status:400,message:"Error: falta fecha"})
					} else {
						//~ var smn_map_filename
						var tendencia_climatica_file
						if(files.tendencia_climatica_file.size <= 0 ) {
							//~ smn_map_filename = (fields.smn_map_filename) ? fields.smn_map_filename.replace(/(\.\.\/)+/,"public/") : "public/img/smn_map_" + fields.fecha + ".png"
							//~ if(!fs.existsSync(smn_map_filename)) {
								//~ console.log("Error falta imagen SMN" + ". <a href=\"javascript:history.back()\">Volver</a>")
								//~ callback({status:400,message:"Error: falta imagen SMN"})
								//~ return
							//~ }
								tendencia_climatica_file = (fields.tendencia_climatica_file) ? fields.tendencia_climatica_file.replace(/(\.\.\/)+/,"public/") : "public/img/tendencia_climatica_" + fields.fecha + ".png"
								if(!fs.existsSync(tendencia_climatica_file)) {
									console.log("Error falta imagen de tendencia climática" + ". <a href=\"javascript:history.back()\">Volver</a>")
									callback({status:400,message:"Error: falta imagen de tendencia climática"})
									return
								}
						} else {
							//~ if(!fs.existsSync(files.smn_clima_mapa_file.path)) {
								//~ callback({status:400,message:"file not found"})
								//~ return
							//~ }
							//~ smn_map_filename = "public/img/smn_map_" + fields.fecha + ".png"
							//~ fs.copyFileSync(files.smn_clima_mapa_file.path,smn_map_filename)
							//~ console.log(' SMN file copied to  ' + smn_map_filename)
							if(!fs.existsSync(files.tendencia_climatica_file.path)) {
								callback({status:400,message:"file not found"})
								return
							}
							tendencia_climatica_file = "public/img/tendencia_climatica_" + fields.fecha + ".png"
							fs.copyFileSync(files.tendencia_climatica_file.path,tendencia_climatica_file)
							console.log(' SMN file copied to  ' + tendencia_climatica_file)
						}
						//~ var cptec_map_filename
						//~ if(files.cptec_clima_mapa_file.size <= 0) {
							//~ cptec_map_filename = (fields.cptec_map_filename) ? fields.cptec_map_filename.replace(/(\.\.\/)+/,"public/") : "public/img/cptec_map_" + fields.fecha + ".png"
							//~ if(!fs.existsSync(cptec_map_filename)) {
								//~ console.log("Error falta imagen CPTEC")
								//~ callback({status:400,message:"Error: falta imagen CPTEC" + ". <a href=\"javascript:history.back()\">Volver</a>"})
								//~ return
							//~ }
						//~ } else {
							//~ cptec_map_filename = "public/img/cptec_map_" + fields.fecha + ".png"
							//~ if(!fs.existsSync(files.cptec_clima_mapa_file.path)) {
								//~ callback({status:400,message:"file not found"})
								//~ return
							//~ }
							//~ fs.copyFileSync(files.cptec_clima_mapa_file.path,cptec_map_filename)
							//~ console.log(' CPTEC file copied to  ' + cptec_map_filename)
						//~ }
						var synop_map_filename
						if(files.synop_semanal_file.size <= 0) {
							synop_map_filename = (fields.synop_map_filename) ? fields.synop_map_filename.replace(/(\.\.\/)+/,"public/") : "public/img/synop_map_" + fields.fecha + ".png"
							if(!fs.existsSync(synop_map_filename)) {
								console.log("Error falta imagen SYNOP")
								callback({status:400,message:"Error: falta imagen SYNOP" + ". <a href=\"javascript:history.back()\">Volver</a>"})
								return
							}
						} else {
							synop_map_filename = "public/img/synop_map_" + fields.fecha + ".png"
							//~ if(files.synop_semanal_file.size <=0) {
								//~ console.log("no se cargó la imagen SYNOP")
							//~ } else {
							if(!fs.existsSync(files.synop_semanal_file.path)) {
								callback({status:400,message:"file not found"})
							}
							fs.copyFileSync(files.synop_semanal_file.path,synop_map_filename)
							 //~ (err) => {
								//~ if(err) throw err
								console.log(' SYNOP file copied to  ' + synop_map_filename)
							//~ })
							//~ }
						}
						if(! fields.clima_trimestre || ! fields.clima_proximaactualizacion || ! fields.situacion_meteorologica || ! fields.synop_text) {
							console.error("faltan parametros")
							callback({status:400, message:"Faltan parametros"})
							return
						}
						if(!/.+/.test(fields.clima_trimestre) || !/.+/.test(fields.clima_proximaactualizacion) || !/.+/.test(fields.situacion_meteorologica) || !/.+/.test(fields.synop_text)) {
							console.error("2, faltan parametros ")
							callback({status:400, message:"2, Faltan parametros"})
							return
						}
						(async () => {
							const client = await pool.connect()
							try {
								//~ await client.query("BEGIN")
								const result = await client.query("INSERT INTO informe_complementario (fecha, clima_trimestre, tendencia_climatica_file, clima_proximaactualizacion, situacion_meteorologica, synop_semanal_file, synop_text, comentario_final) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (fecha) DO UPDATE SET clima_trimestre=excluded.clima_trimestre, tendencia_climatica_file=excluded.tendencia_climatica_file, clima_proximaactualizacion=excluded.clima_proximaactualizacion, situacion_meteorologica=excluded.situacion_meteorologica, synop_semanal_file=excluded.synop_semanal_file, synop_text=excluded.synop_text, comentario_final=excluded.comentario_final RETURNING fecha", [fields.fecha, fields.clima_trimestre, tendencia_climatica_file, fields.clima_proximaactualizacion, fields.situacion_meteorologica, synop_map_filename, fields.synop_text, fields.comentario_final])
								console.log("row inserted")
								if(fields.hidro) {
									var hidro = JSON.parse(fields.hidro)
									if(Array.isArray(hidro)) {
										if(hidro.length > 0) {
											await client.query("DELETE FROM informe_complementario_hidro WHERE fecha=$1",[fields.fecha])
											var hresult = []
											for (var i = 0, len = hidro.length; i< len;i++) {// var hresult = hidro.map( async (element,i ) => {
												const h = await client.query("INSERT INTO informe_complementario_hidro (fecha, orden, id, name, text) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (fecha,id) DO UPDATE SET orden=excluded.orden, name=excluded.name, text=excluded.text RETURNING id",[fields.fecha, i, hidro[i].id, hidro[i].name, hidro[i].text])
												hresult[i] = h.rows[0].id
												console.log("hidro row, id:"+ h.rows[0].id)
											}
											console.log("Hidro inserted. Rows:" + hresult.length)
											await client.query("COMMIT")
											console.log("run latex_functions.print_informe, fecha: " + fields.fecha)
											setTimeout(
												printinf(fields.fecha, (err,result) => {
													if(err) {
														callback({status:err.status, message:err.message, error: err.error})
														return
													}
													console.log("printinf success!")
													callback(null, result)
												}), 500
											)
										} else {
											console.log("hidro property is empty")
											await client.query("ROLLBACK")
											callback({status:400, message:"hidro property is empty"})
										}
									} else {
										console.log("hidro property is not an Array")
										await client.query("ROLLBACK")
										callback({status:400, message:"hidro property is not an array"})
											//~ throw new Error("hidro property is not an array")
									}
								} else {
									console.log("hidro property missing")
									await client.query("ROLLBACK")
									callback({status:400, message:"hidro property missing"})
									//~ throw new Error("hidro property missing")
								}
								
								//~ res.send("Se insertó la información correctamente para la fecha " + result.rows[0].fecha + ". <a href=\"informe_complementario\">Volver al formulario</a>")
							} catch(err) {
									await client.query('ROLLBACK')
									console.error("database error", err)
									//~ callback({status:500, message: "Server Error", error:err})
									throw err
									//~ throw new Error("Server Error")
							} finally {
								client.release()
							}
						})().catch(e => {
							console.error(e.stack)
							//~ res.status(500).send("Server Error")
							callback({status:500, message: "Server Error", error:err})
						})
					}
				}
			})
		}
	})
}


const printinf = function (fecha,callback) { 
	latex_functions.print_informe(new Client({database: 'meteorology', user: 'actualiza', password: 'alturas'}), {fecha:fecha}, (err, result) => {
		if(err) {
			console.error("Print error",err)
			callback({status:400, message:"Print error",error:err})
			return
			//~ throw new Error("print error")
		}
		if(!result.pdf_url) {
			console.error("pdf_url not found!")
			callback({status:400, message:"pdf_url not found!"})
			return
			//~ throw new Error("pdf_url not found")
		}						
		//~ res.send("Informe generado correctamente. <a href=\"" + result.pdf_url + "\">Ver el informe</a>")
		callback(null,result)
		return
	})
}

exports.generarInformeParaguay = function (pool,req,callback) {
	new formidable.IncomingForm().parse(req, (err, fields, files) => {
		if (err) {
		  console.error('Error', err)
		  callback({status:500,message:"parse error",error:err})
		} else {
		//~ if(!fields.user || !fields.password) {
			//~ console.error("User o password missing!")
			//~ res.status(400).send("Error: falta usuario y/o contraseña")
			//~ return
		//~ }
			pool.connect( (err, client, done) => {
				if(err) {
					console.error("pool.connect error!")
					client.end()
					callback({status:500,message:"Server error: Database connection failed. <a href=\"javascript:history.back()\">Volver</a>",error:err})
				} else {
					console.log("login correcto")
					client.end()
					//~ console.log('Fields', fields)
					//~ console.log('Files', files)
					//~ Object.keys(files).map(file => {
						//~ console.log(file)
					  //~ console.log(files[file])
					//~ })
					if(!fields.fecha) {
						console.log("ERRor falta fecha!")
						callback({status:400,message:"Error: falta fecha"})
					} else {
						var tabla_bombas_filename
						if(files.tabla_bombas.size <= 0 ) {
							tabla_bombas_filename = (fields.tabla_bombas_filename) ? fields.tabla_bombas_filename.replace(/(\.\.\/)+/,"public/") : "public/img/tabla_bombas_" + fields.fecha + ".png"
							if(!fs.existsSync(tabla_bombas_filename)) {
								console.log("Error falta imagen tabla bombas" + ". <a href=\"javascript:history.back()\">Volver</a>")
								callback({status:400,message:"Error: falta imagen tabla bombas"})
								return
							}
						} else {
							//~ if(files.smn_clima_mapa_file.size <= 0) {
								//~ console.log("no se cargó la imagen SMN")
							//~ } else {
								if(!fs.existsSync(files.tabla_bombas.path)) {
									callback({status:400,message:"file not found"})
									return
								}
								smn_map_filename = "public/img/tabla_bombas_" + fields.fecha + ".png"
								fs.copyFileSync(files.tabla_bombas.path,tabla_bombas_filename)
								//~ , (err) => {
									//~ if(err) {
										//~ callback({status:500,message:"No se pudo copiar mapa smn",error:err})
										//~ return
									//~ }
								console.log(' tabla bombas file copied to  ' + tabla_bombas_filename)
								//~ })
							//~ }
						}
						if(! fields.prono_diario_comentario || ! fields.comentario_final || ! fields.fecha_proximo) {
							console.error("faltan parametros")
							callback({status:400, message:"Faltan parametros"})
							return
						}
						if(!/.+/.test(fields.fecha_proximo)) {
							console.error("2, faltan parametros ")
							callback({status:400, message:"2, Faltan parametros"})
							return
						}
						(async () => {
							const client = await pool.connect()
							try {
								//~ await client.query("BEGIN")
								const result = await client.query("INSERT INTO informe_paraguay (fecha, prono_diario_comentario, tabla_bombas, comentario_final, fecha_proximo) VALUES ( $1, $2, $3, $4, $5) ON CONFLICT (fecha) DO UPDATE SET prono_diario_comentario=excluded.prono_diario_comentario, tabla_bombas=excluded.tabla_bombas, comentario_final=excluded.comentario_final, fecha_proximo=excluded.fecha_proximo RETURNING fecha", [fields.fecha, fields.prono_diario_comentario, tabla_bombas_filename, fields.comentario_final, fields.fecha_proximo])
								console.log("row inserted")
								//~ PRONO DIARIO //
								if(fields.prono_diario) {
									var hidro_diario = JSON.parse(fields.prono_diario)
									if(Array.isArray(hidro_diario)) {
										if(hidro_diario.length > 0) {
											await client.query("DELETE FROM informe_paraguay_prono_diario WHERE fecha=$1",[fields.fecha])
											var hresult = []
											for (var i = 0, len = hidro_diario.length; i< len;i++) {// var hresult = hidro.map( async (element,i ) => {
												const h = await client.query("INSERT INTO informe_paraguay_prono_diario (fecha_informe, fecha, bneg, conc, pilc, form) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (fecha,fecha_informe) DO UPDATE SET bneg=excluded.bneg, conc=excluded.conc, pilc=excluded.pilc, form=excluded.form RETURNING fecha",[fields.fecha, hidro_diario[i].fecha_prono, hidro_diario[i].bneg, hidro_diario[i].conc, hidro_diario[i].pilc, hidro_diario[i].form])
												hresult[i] = h.rows[0].fecha
												console.log("diario hidro row, fecha:"+ h.rows[0].fecha)
											}
											console.log("Hidro inserted. Rows:" + hresult.length)
											//~ PRONO MENSUAL
											if(fields.prono_mensual) {
												var hidro_mensual = JSON.parse(fields.prono_mensual)
												if(Array.isArray(hidro_mensual)) {
													if(hidro_mensual.length > 0) {
														await client.query("DELETE FROM informe_paraguay_prono_mensual WHERE fecha=$1",[fields.fecha])
														var hresult = []
														for (var i = 0, len = hidro_mensual.length; i< len;i++) {// var hresult = hidro.map( async (element,i ) => {
															const h = await client.query("INSERT INTO informe_paraguay_prono_mensual (fecha_informe, mes, bneg, conc, pilc, form) VALUES ($1, $2::date - (extract(day from $2::date)-1 || ' days')::interval , $3, $4, $5, $6) ON CONFLICT (fecha,fecha_informe) DO UPDATE SET bneg=excluded.bneg, conc=excluded.conc, pilc=excluded.pilc, form=excluded.form RETURNING fecha",[fields.fecha, hidro_mensual[i].fecha_prono, hidro_mensual[i].bneg, hidro_mensual[i].conc, hidro_mensual[i].pilc, hidro_mensual[i].form])
															hresult[i] = h.rows[0].fecha
															console.log("mensual hidro row, fecha:"+ h.rows[0].fecha)
														}
														console.log("Hidro inserted. Rows:" + hresult.length)
														await client.query("COMMIT")
														// INSERT_CORRIDAS DIARIO
														const series_diario = [["bneg",1546, ["conc",1527], ["pilc",1525], ["form", 3127]]
														for(var i=0, len = series_diario.length; i < len;i++) {
															var key =  series_diario[i][0]
															var data = hidro_diario.map( x => [x.fecha,x.fecha,x[key]] )
															insert_corridas(client,312,series_diario[i][1],data,{forecast_date:fields.fecha,series_table:"series"}, (err,res)=>{
																if(err) {
																	console.error("error al intentar insertar corridas para " + key)
																	return
																}
																if(res) {
																	console.log("corrida insertada correctamente para " + key + ". " + res)
																}
																return
															})
														}
														// INSERT_CORRIDAS MENSUAL
														const series_mensual = [["bneg", 3528], ["conc", 3529],["pilc", 3530],["form", 3531]]
														for(var i=0, len = series_mensual.length; i < len;i++) {
															var key =  series_mensual[i][0]
															var data = hidro_mensual.map( x => [x.fecha,x.fecha,x[key]] )
															insert_corridas(client,289,series_mensual[i][1],data,{forecast_date:fields.fecha,series_table:"series"}, (err,res)=>{
																if(err) {
																	console.error("error al intentar insertar corrida mensual para " + key)
																	return
																}
																if(res) {
																	console.log("corrida mensual insertada correctamente para " + key + ". " + res)
																}
																return
															})
														}
														// IMPRIME INFORME
														console.log("run latex_functions.print_informe_paraguay, fecha: " + fields.fecha)
														setTimeout(
															printinf_paraguay(fields.fecha, (err,result) => {
																if(err) {
																	callback({status:err.status, message:err.message, error: err.error})
																	return
																}
																console.log("printinf_paraguay success!")
																callback(null, result)
															}), 500
														)
													} else {
														console.log("prono_mensual not valid!")
														await client.query("ROLLBACK")
														callback({status:400, message:"prono_mensual is empty"})
													}
												} else {
													console.log("prono_mensual not valid!")
													await client.query("ROLLBACK")
													callback({status:400, message:"prono_mensual not valid!"})
												}
											} else {
												console.log("prono_mensual not found!")
												await client.query("ROLLBACK")
												callback({status:400, message:"prono_mensual not found!"})
											}
											
										} else {
											console.log("prono_diario property is empty")
											await client.query("ROLLBACK")
											callback({status:400, message:"prono_diario property is empty"})
										}
									} else {
										console.log("prono_diario property is not an Array")
										await client.query("ROLLBACK")
										callback({status:400, message:"prono_diario property is not an Array"})
											//~ throw new Error("hidro property is not an array")
									}
								} else {
									console.log("prono_diario property missing")
									await client.query("ROLLBACK")
									callback({status:400, message:"prono_diario property missing"})
									//~ throw new Error("hidro property missing")
								}
								
								//~ res.send("Se insertó la información correctamente para la fecha " + result.rows[0].fecha + ". <a href=\"informe_complementario\">Volver al formulario</a>")
							} catch(err) {
									await client.query('ROLLBACK')
									console.error("database error", err)
									//~ callback({status:500, message: "Server Error", error:err})
									throw err
									//~ throw new Error("Server Error")
							} finally {
								client.release()
							}
						})().catch(e => {
							console.error(e.stack)
							//~ res.status(500).send("Server Error")
							callback({status:500, message: "Server Error", error:err})
						})
					}
				}
			})
		}
	})
}

const printinf_paraguay = function (fecha,callback) { 
	latex_functions.print_informe_paraguay(new Client({database: 'meteorology', user: 'actualiza', password: 'alturas'}), {fecha:fecha}, (err, result) => {
		if(err) {
			console.error("Print error",err)
			callback({status:400, message:"Print error",error:err})
			return
			//~ throw new Error("print error")
		}
		if(!result.pdf_url) {
			console.error("pdf_url not found!")
			callback({status:400, message:"pdf_url not found!"})
			return
			//~ throw new Error("pdf_url not found")
		}						
		//~ res.send("Informe generado correctamente. <a href=\"" + result.pdf_url + "\">Ver el informe</a>")
		callback(null,result)
		return
	})
}

const insert_corridas = function (client,cal_id,series_id,data,options, callback) {
	
	
	if(!client) {
		console.error("cliente no definido")
		callback("cliente no definido")
		return
	}
	
	if(!cal_id) {
		console.error("falta cal_id")
		callback("falta cal_id")
		return
	}
	if(! /^\d+$/.test(cal_id)) {
		console.error("cal_id incorrecto")
		callback("cal_id incorrecto")
		return
	}
	var forecast_date = options.forecast_date || new Date()
	 var fd_iso = forecast_date.toISOString()
	console.log("forecast_date: " + fd_iso)
	if(! series_id) {
		console.error("falta series_id")
		callback("falta series_id")
		return
	}
	if(! /^\d+$/.test(series_id)) {
		console.error("series_id incorrecto")
		callback("series_id incorrecto")
		return
	}
	var series_table = options.series_table || "series_areal";
	if(series_table != "series" && series_table != "series_areal")  {
		console.error("series_table incorrecto")
		callback("series_table incorrecto")
		return
	}
	if(! valores) {
		console.error("falta valores")
		callback("falta valores")
		return
	}
	if(typeof (values) != "ARRAY") {
		console.error("values debe ser un array")
		callback("values debe ser un array")
		return
	}
	//~ my $values_for_ins = arr2insert($values);
	//~ $dbh->{AutoCommit} = 0;
	//~ $dbh->{RaiseError} = 1;
	//~ my $rows;
	var inserted
	(async () => {
		try {
			await client.query('BEGIN')
			const result = await client.query("insert into corridas (cal_id,date) values ($1,$2) on conflict (cal_id,date) do update set series_n=corridas.series_n+1 returning id",[cal_id,fd_iso])
			var corrida_id = result.rows[0].id
			await client.query("create temporary table prono_tmp (timestart timestamp,timeend timestamp,value real, timeupdate timestamp) ON COMMIT DROP")
			for(var i=0, len = values.length; i<len; i++) {
				if(values[i].length < 3) {
					console.error("Longitud de registro incorrecta, debe tener ser timestart,timeend,value[,timeupdate]")
					callback("Longitud de registro incorrecta, debe tener ser timestart,timeend,value[,timeupdate]")
					return
				}
				await client.query("insert into prono_tmp (timestart,timeend,value) values ($1,$2,$3)",[values[i][0],values[i][1],values[i][2]])
			}
			await client.query("insert into pronosticos (cor_id,series_id,timestart,timeend) select $1,$2,prono_tmp.timestart,prono_tmp.timeend from prono_tmp on conflict(cor_id,series_id,timestart,timeend,qualifier) do update set timestart=excluded.timestart",[corrida_id,series_id])
			inserted = await client.query("insert into valores_prono_num (prono_id,valor) select pronosticos.id,value from prono_tmp,pronosticos where cor_id=$1 and series_id=$2 and pronosticos.timestart=prono_tmp.timestart on conflict(prono_id) do update set valor=excluded.valor RETURNING prono_id,valor",[corrida_id,series_id])
			await client.query("COMMIT")
			console.log("insert_corridas: commit exitoso!\n" + inserted.rows.length() + " registros insertados")
		} catch(err) {
				await client.query('ROLLBACK')
				console.error("database query error", err)
				callback("database query Server error")
				return
				//~ throw new Error("Server Error")
		} 
		callback(null,"insert_corridas: commit exitoso!\n" + inserted.rows.length() + " registros insertados")
		return
	})
}
