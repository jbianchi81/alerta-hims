// latex_functions.js

'use strict'

const latex = require('node-latex')
const fs = require('fs')
const fsPromises = require('fs').promises
const pandoc = require('node-pandoc')
//~ const dateFormat = require('dateformat')
var async = require('asyncawait/async');
var await = require('asyncawait/await');
const dir = "public/latex"
const webdir = "latex"
const config = require('config')

exports.print_informe = function (client,pars) {
	return new Promise( (resolve, reject) => {
		if(!client) {
			//~ console.error("client missing!")
			reject("client missing")
		}
		if(!pars) {
			//~ console.error("pars missing!")
			reject("pars missing")
		}
		if(!pars.fecha) {
			//~ console.error("fecha missing!")
			reject("fecha missing")
		}
		console.log("corriendo print_informe, fecha:" + pars.fecha)
		try {
			client.connect()
		} catch (e) {
			console.error(e)
			reject('connect failed')
		}
		client.query("SELECT to_char(fecha,'DD/TMmon/YYYY'::text) fecha , clima_trimestre , to_char(clima_proximaactualizacion,'DD/TMmon/YYYY'::text) clima_proximaactualizacion, situacion_meteorologica , tendencia_climatica_file, synop_semanal_file , synop_text, comentario_final from informe_complementario WHERE fecha=$1",[pars.fecha], (err, res) => {
			if(err) {
				console.error("db connection error",err)
				reject(err)
			} 
			if(res.rows.length <= 0) {
				console.error("Data not found")
				reject(err)
			}
			const args=res.rows[0]
			var files_promises  = Object.keys(args).map( (key) => {
				if(/_file$/.test(key)) {
					return fsPromises.copyFile(args[key],dir + "/" + key + ".png")
				} else {
					console.log("converting " + key + " to latex")
					return new Promise ((res, rej)=> {
						pandoc(args[key], "-f html -t latex", (err, result) => {
							if (err) {
								rej('pandoc conversion error: ',err)
							}
							console.log("writing " + dir + "/" + key + ".tex")
							res(fsPromises.writeFile( dir + "/" + key + ".tex", result)) // args[key]) //~ , function (err) {
						})
					})
				}
			})
			//~ LEE hidro
			client.query("SELECT id, name, text from informe_complementario_hidro WHERE fecha=$1 ORDER BY orden",[pars.fecha], (err, res) => {
				if(err) {
					reject("db connection error",err)
				} 
				if(res.rows.length <= 0) {
					reject("Hidro Data not found")
				}
				console.log("Hidro: found " + res.rows.length + " rows")
				const hidro=res.rows
				//~ console.log(hidro)
				var hidro_html = hidro.map( (it,i) => {
					return "<li><b style=\"text-decoration: underline\">" + it.name + "</b>: " + it.text + "</li>"
				})
				hidro_html = "<ul>" + hidro_html.join("") + "</ul>"
				files_promises.push(
					new Promise ((res, rej)=> {
						pandoc(hidro_html, "-f html -t latex", (err, result) => {
							if (err) {
								rej('pandoc conversion error: ',err)
							}
							res(fsPromises.writeFile( dir + "/hidro.tex", result))
						})
					})
				)
				Promise.all(files_promises).then(()=>{
					setTimeout( ()=>{
					//~ COMPILA TEX a PDF
						const input = fs.createReadStream(dir  + '/informe_complementario.tex')
						input.on('error', err => {
							reject(err)
						})
						const output = fs.createWriteStream(dir  + '/informe_complementario_' + pars.fecha + '.pdf')
						output.on('error', err => {
							reject(err)
						})
						const pdf = latex(input,{inputs:config.latex.location, cmd:"pdflatex",errorLogs:config.latex.location + "errorLog"})
						pdf.pipe(output)
						pdf.on('error', err => {
							reject(err)
						})
						pdf.on('finish', () => {
							console.log('PDF generated!')
							const pdf_url = webdir + "/" + 'informe_complementario_' + pars.fecha + '.pdf'
							resolve({pdf_url:pdf_url})
							//~ console.log("callback called")
						})
					}, 500)
				})
			})
		})
	})
} 


exports.print_informe_paraguay = function (client,pars, callback) {
	const niveles_alerta = {bneg: [5,5.5], conc: [6,7], pilc: [5.35,6], form:[7.8,8.3]}
	if(!client) {
		console.error("client missing!")
		return
	}
	if(!pars) {
		console.error("pars missing!")
		return
	}
	if(!pars.fecha) {
		console.error("fecha missing!")
		return
	}
	console.log("corriendo print_informe_paraguay, fecha:" + pars.fecha)
	client.connect()
	client.query("SELECT to_char(fecha,'DD\" de \"TMmonth\" de \"YYYY'::text) fecha, to_char(fecha,'DD/TMmon/YYYY'::text) fecha_format, to_char(fecha::date - 7,'DD/TMmon/YYYY'::text) fecha_pasada, prono_diario_comentario, tabla_bombas, comentario_final, to_char(fecha_proximo,'TMday DD/TMmon/YYYY'::text) fecha_proximo, synop_pasada, synop_presente, to_char(horiz_mensual,'DD/TMmon/YYYY'::text) horizonte from informe_paraguay WHERE fecha=$1",[pars.fecha], (err, res) => {
		if(err) {
			console.error("db connection error",err)
			callback(err)
			return
		} 
		if(res.rows.length <= 0) {
			console.error("Data not found")
			callback(err)
			return
		}
		const args=res.rows[0]
		Object.keys(args).map( (key) => {
			if(/^synop_/.test(key) || /^tabla_bombas$/.test(key)) {
				var file = args[key].replace(/^\.\.\//,"")
				file = file.replace(/^(public\/)?/,"public/")
				console.log(dir + "/" + key + ".png")
				try {
					fs.copyFileSync(file,dir + "/" + key + ".png")
				} catch(e) {
					if(e) {
						callback(e)
						return
					}
				}
			} else {
				pandoc(args[key], "-f html -t latex", (err, result) => {
					if (err) console.error('pandoc conversion error: ',err)
					console.log( dir + "/" + key + ".tex")
					fs.writeFileSync( dir + "/" + key + ".tex", result) // args[key]) //~ , function (err) {
					return result
				})
					//~ if (err) throw err;
					//~ console.log(dir + "/" + key + '.tex Saved!');
				//~ })
			}
		})
		//~ LEE prono diario

		query_diario(client,{fecha:pars.fecha, niveles_alerta: niveles_alerta}, (err) => {
			if(err) {
				callback(err)
				return
			}
			// LEE PRONO MENSUAL
			query_mensual(client,{fecha:pars.fecha}, (err) => {
				if(err) {
					callback(err)
					return
				}
				
				// Copiar hidrogramas
				Promise.all([fsPromises.copyFile("/home/alerta5/07-DATOS_HIDRO/GRAFICOS_CUANTILES_ANIOMOVIL/graficonivel_153_Bahia_Negra.png", dir + "/niveles_bneg.png"), fsPromises.copyFile("/home/alerta5/07-DATOS_HIDRO/GRAFICOS_CUANTILES_ANIOMOVIL/graficonivel_155_Concepcion.png", dir + "/niveles_conc.png"), fsPromises.copyFile(  "/home/alerta5/07-DATOS_HIDRO/GRAFICOS_CUANTILES_ANIOMOVIL/graficonivel_55_Puerto_Pilcomayo.png", dir + "/niveles_pilc.png"), fsPromises.copyFile(  "/home/alerta5/07-DATOS_HIDRO/GRAFICOS_CUANTILES_ANIOMOVIL/graficonivel_57_Puerto_Formosa.png", dir + "/niveles_form.png")])
					.then( ()=>{
						setTimeout( ()=>{
						//~ COMPILA TEX a PDF
							const input = fs.createReadStream(dir  + '/informe_paraguay.tex')
							input.on('error', err => {
								console.error(err)
								callback(err)
								})
							const output = fs.createWriteStream(dir  + '/informe_paraguay_' + pars.fecha + '.pdf')
							output.on('error', err => {
								console.error(err)
								callback(err)
								})
							const pdf = latex(input,{inputs:"/home/alerta5/44-NODEJS_APIS/informe_complementario/public/latex/", cmd:"pdflatex",errorLogs:"/home/alerta5/44-NODEJS_APIS/informe_complementario/public/latex/errorLog"})
							pdf.pipe(output)
							pdf.on('error', err => {
								console.error(err)
								callback(err)
								return
							})
							pdf.on('finish', () => {
								console.log('PDF generated!')
								if(callback) {
									const pdf_url = webdir + "/" + 'informe_paraguay_' + pars.fecha + '.pdf'
									callback(null,{pdf_url:pdf_url})
									console.log("callback called")
								}
							})
						}, 500)
					})
					.catch(()=>{
						console.log("Error al intentar copiar hidrogramas")
						callback("Error al intentar copiar hidrogramas")
					})
			}) 
		}) 
	})
}

var query_diario = function (client,args,callback) {
	const res = client.query("SELECT fecha_informe, to_char(fecha, 'DD/MM'::text) fecha, bneg, conc, pilc, form from informe_paraguay_prono_diario WHERE fecha_informe=$1 ORDER BY informe_paraguay_prono_diario.fecha",[args.fecha], (err, res) => {
		if(!res.rows) {
			console.error("diario data query error")
			callback("diario data query error")
			return
		}
		if(res.rows.length <= 0) {
			console.error("diario Data not found")
			callback("diario Data not found")
			return
		}
		console.log("Diario: found " + res.rows.length + " rows")
		const hidro=res.rows
		var hidro_tex = hidro.map( (it,i) => {
			var date = (i == 0) ? "HOY" : it.fecha
			var values={}
			var colors={}
			Object.keys(args.niveles_alerta).forEach((key) =>{
				colors[key] = (it[key] < args.niveles_alerta[key][0]) ? '' : (it[key] < args.niveles_alerta[key][1]) ? '\\cellcolor{yellow}' : '\\cellcolor{red}'
				values[key] = it[key].toString().replace(/\./,",")
			})
			return "\\hline\r\n\\textbf{" + date + "} & " + colors.bneg + " " + values.bneg + " & " + colors.conc + " " + values.conc + " & " + colors.pilc + " " + values.pilc + " & " + colors.form + " " + values.form + " \\\\\r\n"
		})
		hidro_tex = "\\begin{tabular}{|c|c|c|c|c|}\r\n\\hline\r\n\\textbf{Fecha} & \\textbf{B. Negra} & \\textbf{Concepción} & \\textbf{P. Pilcomayo} & \\textbf{Formosa} \\\\\r\n" + hidro_tex.join("") + "\\hline\r\n\\end{tabular}"
		fs.writeFile( dir + "/prono_diario.tex", hidro_tex, (err) => {
			if(err) {
				console.log({message:"prono diario writefile error",err:err})
				callback({message:"prono diario writefile error",err:err})
				return
			}
			// Success!
			callback()
		})
	})
}

var query_mensual = function (client,args, callback) {
	client.query("SELECT fecha_informe, to_char(mes, 'TMmonth'::text) mes, bneg, conc, pilc, form from informe_paraguay_prono_mensual WHERE fecha_informe=$1 ORDER BY informe_paraguay_prono_mensual.mes",[args.fecha], (err, res) => {
		if(!res.rows) {
			console.error("mensual Data query error")
			callback("mensual Data query error")
			return
		}
		if(res.rows.length <= 0) {
			console.error("mensual Data not found")
			callback("mensual Data not found")
			return
		}
		console.log("Mensual: found " + res.rows.length + " rows")
		const hidro=res.rows
		var hidro_tex = hidro.map( (it,i) => {
			var values = {}
			Object.keys(it).forEach( (key) => {
				values[key] = it[key].toString().replace(/\./,",")
			})
			return "\\hline\r\n\\textbf{" + it.mes + "} & " + values.bneg + " & " + values.conc + " & " + values.pilc + " & " + values.form + " \\\\\r\n"
		})
		hidro_tex = "\\begin{tabular}{|c|c|c|c|c|}\r\n\\hline\r\n\\textbf{Mes} & \\textbf{B. Negra} & \\textbf{Concepción} & \\textbf{P. Pilcomayo} & \\textbf{Formosa} \\\\\r\n" + hidro_tex.join("") + "\\hline\r\n\\end{tabular}"
		fs.writeFile( dir + "/prono_mensual.tex", hidro_tex, (err) => {
			if(err) {
				console.log({message:"prono mensual writefile error",err:err})
				callback({message:"prono mensual writefile error",err:err})
				return
			}
			// success!
			callback()
		})
	})
}


exports.print_informe_arco_portuario = function (client,pars) {
	return new Promise( (resolve, reject) => {
		if(!client) {
			reject("client missing!")
		}
		if(!pars) {
			reject("pars missing!")
		}
		if(!pars.fecha) {
			reject("fecha missing!")
		}
		console.log("corriendo print_informe_arco_portuario, fecha:" + pars.fecha)
		client.query("SELECT to_char(fecha,'DD\" de \"TMmonth\" de \"YYYY'::text) fecha_texto, to_char(fecha,'DD/TMmon/YYYY'::text) fecha_format, to_char(fecha-7,'DD/TMmon/YYYY'::text) fecha_pasada, situacion_general, smn_map_file, texto_mapa_semanal, tendencia_climatica, pronostico_meteorologico, perspectiva_hidrometrica, synop_presente from informe_arco_portuario_rio_parana WHERE fecha=$1",[pars.fecha], (err, res) => {
			if(err) {
				console.error("query error")
				reject(err)
			} 
			if(res.rows.length <= 0) {
				reject("Data not found")
			}
			var args=res.rows[0]
			var files_promises  = Object.keys(args).map( (key) => {
				if(/^synop_/.test(key) || /^smn_/.test(key)) { // || /^cptec_/.test(key)) {
					if(!args[key]) {
						reject( key + " faltante. Abortando impresión de informe")
						return
					}
					var file = args[key].replace(/^\.\.\//,"")
					file = file.replace(/^(public\/)?/,"public/")
					console.log(dir + "/" + key + ".png")
					return fsPromises.copyFile(file,dir + "/" + key + ".png")
				} else {
					console.log("converting " + key + " to latex")
					return new Promise ((res, rej)=> {
						pandoc(args[key], "-f html -t latex", (err, result) => {
							if (err) {
								rej('pandoc conversion error: ',err)
							}
							console.log("writing " + dir + "/" + key + ".tex")
							res(fsPromises.writeFile( dir + "/" + key + ".tex", result)) // args[key]) //~ , function (err) {
						})
					})
				}
			})
			files_promises.push(query_semanal(client,{fecha:pars.fecha}))
			Promise.all(files_promises).then(()=>{
				setTimeout( ()=>{
				//~ COMPILA TEX a PDF
					const input = fs.createReadStream(dir  + '/informe_arco_portuario.tex')
					input.on('error', err => {
						console.error(err)
						callback(err)
						})
					const output = fs.createWriteStream(dir  + '/informe_arco_portuario_' + pars.fecha + '.pdf')
					output.on('error', err => {
						console.error(err)
						callback(err)
					})
					const pdf = latex(input,{inputs:config.latex.location, cmd:"pdflatex",errorLogs:config.latex.location + "errorLog"})
					pdf.pipe(output)
					pdf.on('error', err => {
						reject(err)
					})
					pdf.on('finish', () => {
						console.log('PDF generated!')
						const pdf_url = webdir + "/" + 'informe_arco_portuario_' + pars.fecha + '.pdf'
						resolve({pdf_url:pdf_url})
						//~ console.log("callback called")
					})
				}, 500)
			})
			.catch(e=>{
				reject(e)
			})
		})
	})		 
}

var query_semanal = function (client,args) {
	return new Promise ( (resolve,reject) => {
		client.query("SELECT fecha_emision, to_char(fecha, 'DD-TMmon-YYYY'::text) fecha_format, json_object_agg(estacion_id, valor) valores from informe_arco_portuario_rio_parana_niveles WHERE fecha_emision=$1 GROUP BY fecha_emision,fecha ORDER BY fecha",[args.fecha], (err, res) => {
			if(!res)  {
				console.error("prono data query error")
				reject("prono data query error")
			}
			if(!res.rows) {
				console.error("prono data query error")
				reject("prono data query error")
			}
			if(res.rows.length <= 0) {
				console.error("prono Data not found")
				reject("prono Data not found")
			}
			console.log("semanal: found " + res.rows.length + " rows")
			const hidro=res.rows
			var tabla_ids = [
				[18, 19, 20 ,21, 22],
				[23, 24, 25, 26, 29], 
				[30, 31, 32, 33, 34],
				[35, 36, 37, 38, 45]
			]
			var tabla_nombres = [
				["P. PATRIA", "CORRIENTES", "BARRANQUERAS", "EMPEDRADO", "BELLA VISTA"], 
				["GOYA", "RECONQUISTA", "ESQUINA", "LA PAZ", "PARANÁ"], 
				["SANTA FE", "DIAMANTE", "VICTORIA", "SAN MARTÍN", "ROSARIO"], 
				["V. CONSTITUCIÓN", "SAN NICOLÁS", "RAMALLO", "SAN PEDRO", "IBICUY"]
			]
			var tabla_prono_rows = tabla_ids.map((ids,index)=>{
				var filas = hidro.map( (it,i) => {
					var date = it.fecha_format
					var values= ids.map(id=>{
						return it.valores[id].toString().replace(/\./,",")
					})
					if(i == 0) {
						return "\\hline\r\n\\textbf{" + date + "} & " + values.join("(*) & ") + "(*) \\\\"
					} else {
						return "\\hline\r\n\\textbf{" + date + "} & " + values.join(" & ") + " \\\\"
					}
				})
				var header = "\\rowcolor{Black}\\rowfont{\\color{white}}SEMANA AL & " + tabla_nombres[index].map(nombre=> nombre).join(" & ") + " \\\\\r\n"
				return header + filas.join("\r\n") + "\\hline"
			})
			//~ var tabla_prono = "\\begin{tabular}{|c|c|c|c|c|c|}\r\n\\hline\r\n" + tabla_prono_rows.join("\r\n") + "\r\n\\end{tabular}"
			var tabla_prono = "\\begin{tabular}{*{6}{>{\\rowfonttype}c}<{\\rowfont{}}}\r\n\\hline\r\n" + tabla_prono_rows.join("\r\n") + "\r\n\\end{tabular}"
			resolve(fsPromises.writeFile( dir + "/prono_semanal.tex", tabla_prono))
		})
	})
}
