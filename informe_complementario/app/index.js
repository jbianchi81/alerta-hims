// index.js
'use strict'

const express = require('express')
const app = express()
const fs = require('fs')
const exphbs = require('express-handlebars')
const Handlebars = require('handlebars')
const bodyParser = require('body-parser')
const Table = require('table-builder')
//~ const request = require('request')
const axios = require("axios")
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
axiosCookieJarSupport(axios);
const dateFormat = require('dateformat')
const config = require('config')
const { Pool, Client } = require('pg')
const pool = new Pool(config.database)
const port = config.rest.port
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use( bodyParser.json({limit: '50mb'}) );
app.use(express.urlencoded())
//~ app.use(bodyParser.urlencoded({ extended: true }));  
app.use(express.static('public'));
const formidable = require('formidable')
const latex_functions = require('./latex_functions.js')
//~ const informes = require('./informes.js')
//~ require("jsdom").env("", function(err, window) {
    //~ if (err) {
        //~ console.error(err);
        //~ return;
    //~ }
 
    //~ var $ = require("jquery")(window);
//~ });

Handlebars.registerHelper('select', function (value, options) {
	return options.fn(this).replace( new RegExp(' value="' + value + '"'), '$& selected="selected"')
		
	//~ var el = ('<select />')
	//~ $(el).find('[value="' + value + '"]').attr({'selected':'selected'})
	//~ return $(el).html()
})

const auth = require('../../appController/app/authentication.js')(app,config,pool)
const passport = auth.passport
//~ const users = [
  //~ {id: '2f24vvg', user: 'ina', password: 'ina1620', role: 'reader'},
  //~ {id: '4agsdfgr5', user: 'actualiza', password: 'alturas', role: 'writer'},
  //~ {id: '99gerns', user: 'jbianchi', password: 'numeral', role: 'admin'}
//~ ]

//~ // configure passport.js to use the local strategy
//~ passport.use(new LocalStrategy(
  //~ { usernameField: 'user' },
  //~ (username, password, done) => {
    //~ console.log('Inside local strategy callback')
    //~ // here is where you make a call to the database
    //~ // to find the user based on their username or email address
    //~ for ( var i = 0, len = users.length; i < len; i++) {
		//~ if(username === users[i].user) {
			//~ if(password === users[i].password) {
				//~ console.log('Local strategy returned true')
				//~ return done(null, users[i])
			//~ }
		//~ }
    //~ }
    //~ return done({message:"Authentication error"},null)
  //~ }
//~ ));


//~ // tell passport how to serialize the user
//~ passport.serializeUser((user, done) => {
  //~ console.log('Inside serializeUser callback. User id is save to the session file store here')
  //~ user.role = 
  //~ done(null, user.id);
//~ });

//~ passport.deserializeUser((id,done) => {
	//~ for ( var i = 0, len = users.length; i < len; i++) {
		//~ if(id === users[i].id) {
			//~ done(null, users[i])
		//~ }
    //~ }
    //~ return false 
//    done({message:"Error, user not found"},null)
//~ });


//~ // add & configure middleware
//~ app.use(session({
  //~ genid: (req) => {
    //~ console.log('Inside session middleware genid function')
    //~ console.log(`Request object sessionID from client: ${req.sessionID}`)
    //~ return uuid() // use UUIDs for session IDs
  //~ },
  //~ store: new FileStore(),
  //~ secret: 'keyboard cat',
  //~ resave: false,
  //~ saveUninitialized: true
//~ }))
//~ app.use(passport.initialize());
//~ app.use(passport.session());

app.get('/exit',auth.isAdmin,(req,res)=>{  // terminate Nodejs process
	res.status(200).send("Terminating Nodejs process")
	console.log("Exit order recieved from client")
	setTimeout(()=>{
		process.exit()
	},500)
})

app.get("/", (req,res) => {
	if(req.user && req.user.role != "public") {
		return res.redirect('index')
	} else {
		return res.redirect('login')
	}
})

// create the login get and post routes
app.get('/login', (req, res) => {
  console.log('Inside GET /login callback')
  console.log(req.sessionID)
  res.render('login')
})

app.post('/login',passport.authenticate('local'), (req, res, next) => {
  console.log('Inside POST /login callback')
  console.log(req.sessionID)
  //~ passport.authenticate('local', (err, user, info) => {
    //~ console.log('Inside passport.authenticate() callback');
	  //~ if(err) {
		  //~ return res.send('Authentication error')
	  //~ }
    //~ console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
    //~ console.log(`req.user: ${JSON.stringify(req.user)}`)
    //~ req.login(user, (err) => {
      //~ console.log('Inside req.login() callback')
//      if(err) {
//		  return res.send("login error");
//	  }
      //~ console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
      //~ console.log(`req.user: ${JSON.stringify(req.user)}`)
//      return res.send('You were authenticated & logged in!\n');
      return res.redirect('index')
    //~ })
  //~ })(req, res, next);
})

app.get('/logout',auth.isAuthenticated, function(req, res) {
	console.log("logging out at " + new Date().toISOString())
	req.session.destroy(function(err) {
		if(err) {
			console.error("Error in logout at " + new Date().toISOString())
			res.status(400).send("Error al intentar logout")
			return
		}
		console.log("logged out at " + new Date().toISOString())
		// res.render('loggedout')
		res.redirect('/');
	})
});


app.get('/index', auth.isAuthenticatedView, (req, res) => {
	//~ if(!req.isAuthenticated()) { 
		//~ res.redirect('login')
		//~ return
	//~ }
	pool.connect( (err,client,done) => {
		if(err) {
			console.log("db error")
			res.status(500).send("server error")
			return
		}
		client.query("SELECT to_char(fecha,'YYYY-MM-DD'::text) fecha, to_char(fecha, 'DD/mon/YYYY'::text) fecha_format from informe_complementario ORDER BY fecha", (err, result) => {
			if(err) {
				console.log("db error")
				res.status(500).send("server error")
				return
			}
			client.query("SELECT to_char(fecha,'YYYY-MM-DD'::text) fecha, to_char(fecha, 'DD/mon/YYYY'::text) fecha_format from informe_paraguay ORDER BY fecha", (err, result1) => {
				if(err) {
					console.log("db error")
					res.status(500).send("server error")
					return
				}
				client.query("SELECT to_char(fecha,'YYYY-MM-DD'::text) fecha, to_char(fecha, 'DD/mon/YYYY'::text) fecha_format from informe_arco_portuario_rio_parana ORDER BY fecha", (err, result2) => {
					if(err) {
						console.log("db error")
						res.status(500).send("server error")
						return
					}	
					res.render('informes',{informe_complementario:result.rows, informe_paraguay:result1.rows, informe_arco_portuario: result2.rows})
					console.log("informes rendered")
					return
				})
	//~ res.render('informes',{})
			})
		})
	})
})

app.get('/informe_complementario', auth.isAuthenticatedView, (req, res) => {
  if(!req.isAuthenticated()) { 
		res.redirect('/login')
		return
  }
  const client = new Client(config.database)
  client.connect()
  if(req.query.fecha) {    // "fecha" especificada, busca en DB, 
	    client.query("SELECT gid , to_char(fecha,'YYYY-MM-DD'::text) fecha, clima_trimestre , to_char(clima_proximaactualizacion,'YYYY-MM-DD'::text) clima_proximaactualizacion, situacion_meteorologica , smn_map_file , cptec_map_file, synop_semanal_file, synop_text, comentario_final FROM informe_complementario WHERE fecha = $1", [req.query.fecha], (err, result) => {
		if(err) {
					console.log(err.stack)
					res.status(500).send("Server Error")
					return
		}
		if(result.rows.length <=0) {
			res.render('edit_form',{fecha:req.query.fecha})
			console.log("fecha no encontrada, imprimiendo formulario vacío")
			return
		}
		//~ result.rows[0].smn_map_file = result.rows[0].smn_map_file.replace(/^public\//,"")
		//~ result.rows[0].cptec_map_file = result.rows[0].cptec_map_file.replace(/^public\//,"")
		result.rows[0].tendencia_climatica_file = (result.rows[0].tendencia_climatica_file) ? result.rows[0].tendencia_climatica_file.replace(/^public\//,"") : null
		result.rows[0].synop_semanal_file = (result.rows[0].synop_semanal_file) ? result.rows[0].synop_semanal_file.replace(/^public\//,"") : null
		//~ busca hidro
		client.query("SELECT gid, id, name, text, condicion FROM informe_complementario_hidro WHERE fecha = $1 ORDER BY orden", [req.query.fecha], (err, hresult) => {
			if(err) {
				console.log(err.stack)
				res.status(500).send("Server error")
				return
			}
			if(hresult.rows.length<=0) {
				res.render("edit_form", result.rows[0])
				console.log("edit_form displayed with fecha, without hidro")
				return
			}
			res.render('edit_form', {...result.rows[0], hidro:hresult.rows})
			console.log('edit_form displayed with fecha and hidro')
		})
	  })			
	} else {
		client.query("SELECT to_char(fecha,'YYYY-MM-DD'::text) fecha FROM informe_complementario ORDER BY fecha DESC", (err, result) => {
			if(err) {
				console.log(err)
				res.status(500).send("Server Error")
				return
			}
			res.render('choose_date',{fechas:result.rows})
			console.log("choose_date rendered")
		})
	}
			
		
	  //~ client.query("SELECT gid , to_char(fecha,'YYYY-MM-DD'::text) fecha, clima_trimestre , clima_proximaactualizacion , situacion_meteorologica , smn_map_file , cptec_map_file FROM informe_complementario ORDER BY fecha DESC LIMIT 1", (err, result) => {
		//~ if(err) {
					//~ console.log(err)
					//~ res.status(500).send("Server Error")
					//~ return
		//~ }
		//~ result.rows[0].smn_map_file = result.rows[0].smn_map_file.replace(/^public\//,"")
		//~ result.rows[0].cptec_map_file = result.rows[0].cptec_map_file.replace(/^public\//,"")
		//~ res.render('edit_form', result.rows[0])
		//~ console.log('edit_form displayed')
	  //~ })	  
})

app.post('/informe_complementario/submit-form', (req, res) => {
	if(!req.isAuthenticated()) { 
		res.redirect('/login')
		return
	}
	generarInformeComplementario(pool,req, (err,result) => {
		if(err) {
			console.error("generarInformeComplementario error", err)
			res.status(err.status).send(err.message)
			return
		}
		console.log("generarInformeComplementario success!. REdirecting to "+result.pdf_url)
		res.redirect("../" + result.pdf_url)
		return
	})
		//~ console.log(req.body)
		//~ res.send("Form submitted")
})

app.get('/paraguay', (req, res) => {
  if(!req.isAuthenticated()) { 
		res.redirect('/login')
		return
	}
  const client = new Client(config.database)
  client.connect()
  if(req.query.fecha) {    // "fecha" especificada, busca en DB, 
	  client.query("SELECT gid , to_char(fecha,'YYYY-MM-DD'::text) fecha, to_char(fecha-7,'YYYY-MM-DD'::text) fecha_semanal_pasada, prono_diario_comentario, tabla_bombas, comentario_final, to_char(fecha_proximo,'YYYY-MM-DD'::text) fecha_proximo, synop_pasada, synop_presente,to_char(horiz_mensual,'YYYY-MM-DD'::text) horiz_mensual FROM informe_paraguay WHERE fecha = $1", [req.query.fecha], (err, result) => {
		if(err) {
					console.log(err.stack)
					res.status(500).send("Server Error")
					return
		}
		if(result.rows.length <=0) {
			const fecha_semana_pasada = new Date(req.query.fecha) - 7*24*3600*1000 + 3*3600*1000
			//~ console.log(dateFormat(fecha_semana_pasada,'isoDate'))
			//~ console.log(dateFormat(new Date(req.query.fecha),'isoDate'))
			//~ console.log(req.query.fecha)
			//~ console.log(new Date(req.query.fecha))
			res.render('edit_paraguay',{fecha:req.query.fecha,fecha_semana_pasada: dateFormat(fecha_semana_pasada,'isoDate'), synop_pasada: "mapas_semanales/" + dateFormat(fecha_semana_pasada,'isoDate').substring(0,4) + "/" + dateFormat(fecha_semana_pasada,'isoDate').substring(5,7) + "/pp_semanal_" + dateFormat(fecha_semana_pasada,'isoDate').replace(/-/g,"") + "_rst.png", synop_presente: "mapas_semanales/" + req.query.fecha.substring(0,4) + "/" + req.query.fecha.substring(5,7) + "/pp_semanal_" + req.query.fecha.replace(/-/g,"") + "_rst.png"})
			console.log("fecha no encontrada, imprimiendo formulario vacío")
			return
		}
		result.rows[0].tabla_bombas = result.rows[0].tabla_bombas.replace(/^public\//,"")
		result.rows[0].synop_pasada = (result.rows[0].synop_pasada) ? result.rows[0].synop_pasada : "mapas_semanales/" + result.rows[0].fecha_semanal_pasada.substring(0,4) + "/" + result.rows[0].fecha_semanal_pasada.substring(5,7) + "/pp_semanal_" + result.rows[0].fecha_semanal_pasada.replace(/-/g,"") + "_rst.png"
		result.rows[0].synop_presente = (result.rows[0].synop_presente) ? result.rows[0].synop_presente : "mapas_semanales/" + result.rows[0].fecha.substring(0,4) + "/" + result.rows[0].fecha.substring(5,7) + "/pp_semanal_" + result.rows[0].fecha.replace(/-/g,"") + "_rst.png"
		console.log(result.rows[0])
		//~ busca prono_diario
		client.query("SELECT gid, to_char(fecha_informe,'YYYY-MM-DD'::text) fecha_informe, to_char(fecha,'YYYY-MM-DD'::text) fecha, bneg, conc, pilc, form FROM informe_paraguay_prono_diario WHERE fecha_informe = $1 ORDER BY fecha", [req.query.fecha], (err, hresult) => {
			if(err) {
				console.log(err.stack)
				res.status(500).send("Server error, prono diario no encontrado")
				return
			}
			if(hresult.rows.length<=0) {
				res.render("edit_paraguay", result.rows[0])
				console.log("edit_paraguay displayed with fecha, without prono_diario")
				return
			}
			//~ BUSCa prono_mensual
			client.query("SELECT gid, to_char(fecha_informe,'YYYY-MM-DD'::text) fecha_informe, to_char(mes,'YYYY-MM-DD'::text) mes, bneg, conc, pilc, form FROM informe_paraguay_prono_mensual WHERE fecha_informe = $1 ORDER BY mes", [req.query.fecha], (err, mresult) => {
				if(err) {
					console.log(err.stack)
					res.status(500).send("Server error, prono_mensual no encontrado")
					return
				}
				if(hresult.rows.length<=0) {
					res.render('edit_paraguay', {...result.rows[0], prono_diario:hresult.rows})
					console.log('edit_paraguay displayed with fecha and prono_diario')
					return
				}
				res.render('edit_paraguay', {...result.rows[0], prono_diario:hresult.rows, prono_mensual:mresult.rows})
				console.log('edit_form displayed with fecha, prono_diario and prono_mensual')
			})
		})
	  })			
	} else {
	 client.query("SELECT to_char(fecha,'YYYY-MM-DD'::text) fecha FROM informe_paraguay ORDER BY fecha DESC", (err, result) => {
			if(err) {
				console.log(err)
				res.status(500).send("Server Error")
				return
			}
			res.render('choose_date_paraguay',{fechas:result.rows})
			console.log("choose_date_paraguay rendered")
		}) 
	  
  }
})

app.post('/paraguay/submit-form', (req, res) => {
	if(!req.isAuthenticated()) { 
		res.redirect('/login')
		return
	}
	generarInformeParaguay(pool,req, (err,result) => {
		if(err) {
			console.error("generarInformeParaguay error", err)
			res.status(err.status).send(err.message)
			return
		}
		console.log("generarInformeParaguay success!. REdirecting to "+result.pdf_url)
		res.redirect("../" + result.pdf_url)
		return
	})
		//~ console.log(req.body)
		//~ res.send("Form submitted")
})

app.get('/informe_complementario/delete', (req,res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login')
		return
	}
	if(!req.query.fecha) {
		res.status(400).send("Error:Falta fecha")
		return
	}
	const client = new Client(config.database)
	delete_informe(client,req.query.fecha).then(response => {
		if(!response.rows) {
			res.send("No se encontró la fecha indicada. Volver a <a href=/informes/index>informes</a>")
			return
		} else if (response.rows.length<=0) {
			res.send("No se encontró la fecha indicada. Volver a <a href=/informes/index>informes</a>")
			return
		} else {
			res.send("Informe eliminado. Fecha:" + response.rows[0].fecha + ". Volver a <a href=/informes/index>informes</a>")
			return
		}
	}).catch(e => {
		console.log("delete informe error")
		res.status(400).send({message:"delete informe error",error:e})
		return
	})
})

app.get('/paraguay/delete', (req,res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login')
		return
	}
	if(!req.query.fecha) {
		res.status(400).send("Error:Falta fecha")
		return
	}
	const client = new Client(config.database)
	delete_informe_paraguay(client,req.query.fecha).then(response => {
		if(!response.rows) {
			res.send("No se encontró la fecha indicada. Volver a <a href=/informes/index>informes</a>")
			return
		} else if (response.rows.length<=0) {
			res.send("No se encontró la fecha indicada. Volver a <a href=/informes/index>informes</a>")
			return
		} else {
			res.send("Informe paraguay eliminado. Fecha:" + response.rows[0].fecha + ". Volver a <a href=/informes/index>informes</a>")
			return
		}
	}).catch(e => {
		console.log("delete informe paraguay error")
		res.status(400).send({message:"delete informe paraguay error",error:e})
		return
	})
})

app.listen(port, (err) => {
        if (err) {
                return console.log('rrr',err)
        }
        console.log(`server listening on port ${port}`)
});




const generarInformeComplementario = function (pool,req,callback) {
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
					if(client) {
						client.end()
					}
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
						var tendencia_climatica_file
						if(files.tendencia_climatica_file.size <= 0 ) {
							tendencia_climatica_file = (fields.tendencia_climatica_file) ? fields.tendencia_climatica_file.replace(/^/,"public/") : "public/img/tendencia_climatica_" + fields.fecha + ".png"
							if(!fs.existsSync(tendencia_climatica_file)) {
								console.log("Error falta imagen tendencia climatica" + ". <a href=\"javascript:history.back()\">Volver</a>")
								callback({status:400,message:"Error: falta imagen tendencia climatica"})
								return
							}
						} else {
							if(!fs.existsSync(files.tendencia_climatica_file.path)) {
								callback({status:400,message:"file not found"})
								return
							}
							tendencia_climatica_file = "public/img/tendencia_climatica_" + fields.fecha + ".png"
							fs.copyFileSync(files.tendencia_climatica_file.path,tendencia_climatica_file)
							console.log(' tendencia_climatica_file copied to  ' + tendencia_climatica_file)
						}
						//~ var smn_map_filename
						//~ if(files.smn_clima_mapa_file.size <= 0 ) {
							//~ smn_map_filename = (fields.smn_map_filename) ? fields.smn_map_filename.replace(/^/,"public/") : "public/img/smn_map_" + fields.fecha + ".png"
							//~ if(!fs.existsSync(smn_map_filename)) {
								//~ console.log("Error falta imagen SMN" + ". <a href=\"javascript:history.back()\">Volver</a>")
								//~ callback({status:400,message:"Error: falta imagen SMN"})
								//~ return
							//~ }
						//~ } else {
								//~ if(!fs.existsSync(files.smn_clima_mapa_file.path)) {
									//~ callback({status:400,message:"file not found"})
									//~ return
								//~ }
								//~ smn_map_filename = "public/img/smn_map_" + fields.fecha + ".png"
								//~ fs.copyFileSync(files.smn_clima_mapa_file.path,smn_map_filename)
								//~ console.log(' SMN file copied to  ' + smn_map_filename)
						//~ }
						//~ var cptec_map_filename
						//~ if(files.cptec_clima_mapa_file.size <= 0) {
							//~ cptec_map_filename = (fields.cptec_map_filename) ? fields.cptec_map_filename.replace(/^/,"public/") : "public/img/cptec_map_" + fields.fecha + ".png"
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
							synop_map_filename = (fields.synop_map_filename) ? fields.synop_map_filename.replace(/^/,"public/") : "public/img/synop_map_" + fields.fecha + ".png"
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
								//~ console.log({row:[fields.fecha, fields.clima_trimestre, tendencia_climatica_file, fields.clima_proximaactualizacion, fields.situacion_meteorologica, synop_map_filename, fields.synop_text, fields.comentario_final]})
								const result = await client.query("INSERT INTO informe_complementario (fecha, clima_trimestre, tendencia_climatica_file, clima_proximaactualizacion, situacion_meteorologica, synop_semanal_file, synop_text, comentario_final) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (fecha) DO UPDATE SET clima_trimestre=excluded.clima_trimestre, tendencia_climatica_file=excluded.tendencia_climatica_file, clima_proximaactualizacion=excluded.clima_proximaactualizacion, situacion_meteorologica=excluded.situacion_meteorologica, synop_semanal_file=excluded.synop_semanal_file, synop_text=excluded.synop_text, comentario_final=excluded.comentario_final RETURNING fecha", [fields.fecha, fields.clima_trimestre, tendencia_climatica_file, fields.clima_proximaactualizacion, fields.situacion_meteorologica, synop_map_filename, fields.synop_text, fields.comentario_final])
								console.log("row inserted")
								if(fields.hidro) {
									var hidro = JSON.parse(fields.hidro)
									if(Array.isArray(hidro)) {
										if(hidro.length > 0) {
											await client.query("DELETE FROM informe_complementario_hidro WHERE fecha=$1",[fields.fecha])
											var hresult = []
											for (var i = 0, len = hidro.length; i< len;i++) {// var hresult = hidro.map( async (element,i ) => {
												const h = await client.query("INSERT INTO informe_complementario_hidro (fecha, orden, id, name, text, condicion) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (fecha,id) DO UPDATE SET orden=excluded.orden, name=excluded.name, text=excluded.text RETURNING id",[fields.fecha, i, hidro[i].id, hidro[i].name, hidro[i].text, hidro[i].condicion])
												hresult[i] = h.rows[0].id
												console.log("hidro row, id:"+ h.rows[0].id)
											}
											console.log("Hidro inserted. Rows:" + hresult.length)
											await client.query("COMMIT")
											console.log("run latex_functions.print_informe, fecha: " + fields.fecha)
											//~ setTimeout(
												printinf(fields.fecha)
												.then(result => {
													console.log("printinf success!")
													callback(null, result)
												})
												.catch(err=>{
													console.log("Print error")
													callback({status:err.status, message:err.message, error: err.error})
													return
												})

												//~ , 500
											//~ )
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


const printinf = function (fecha) { 
	return latex_functions.print_informe(new Client(config.database), {fecha:fecha})
	.then(result => {
		if(!result.pdf_url) {
			console.error("pdf_url not found!")
			callback({status:400, message:"pdf_url not found!"})
			return
			//~ throw new Error("pdf_url not found")
		}						
		//~ res.send("Informe generado correctamente. <a href=\"" + result.pdf_url + "\">Ver el informe</a>")
		return result
	})
	.catch(err=> {
		console.error("Print error",err)
		throw({status:400, message:"Print error",error:err})
	})

}

const generarInformeParaguay = function (pool,req,callback) {
	console.log("generarInformeParaguay...")
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
			//~ pool.connect( (err, client, done) => {
				//~ if(err) {
					//~ console.error("pool.connect error!")
					//~ client.end()
					//~ callback({status:500,message:"Server error: Database connection failed. <a href=\"javascript:history.back()\">Volver</a>",error:err})
				//~ } else {
					//~ console.log("login correcto")
					//~ client.end()
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
							tabla_bombas_filename = (fields.tabla_bombas_filename) ? fields.tabla_bombas_filename.replace(/^/,"public/") : "public/img/tabla_bombas_" + fields.fecha + ".png"
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
									console.log("bombas file not found")
									callback({status:400,message:"file not found"})
									return
								}
								tabla_bombas_filename = "public/img/tabla_bombas_" + fields.fecha + ".png"
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
						if(! fields.fecha_proximo) {
							console.error("faltan parametros")
							callback({status:400, message:"Faltan parametros"})
							return
						}
						if(!/.+/.test(fields.fecha_proximo)) {
							console.error("2, faltan parametros ")
							callback({status:400, message:"2, Faltan parametros"})
							return
						}
						pool.connect( async (err,client,done) => {
							//~ const client = await pool.connect()
							try {
								//~ await client.query("BEGIN")
								const result = await client.query("INSERT INTO informe_paraguay (fecha, prono_diario_comentario, tabla_bombas, comentario_final, fecha_proximo, synop_pasada, synop_presente,horiz_mensual) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (fecha) DO UPDATE SET prono_diario_comentario=excluded.prono_diario_comentario, tabla_bombas=excluded.tabla_bombas, comentario_final=excluded.comentario_final, fecha_proximo=excluded.fecha_proximo, synop_pasada=excluded.synop_pasada, synop_presente=excluded.synop_presente, horiz_mensual=excluded.horiz_mensual RETURNING fecha", [fields.fecha, fields.prono_diario_comentario, tabla_bombas_filename, fields.comentario_final, fields.fecha_proximo, fields.synop_pasada_filename, fields.synop_presente_filename, fields.horiz_mensual])
								console.log("row inserted")
								//~ PRONO DIARIO //
								if(fields.prono_diario) {
									var hidro_d = JSON.parse(fields.prono_diario)
									if(Array.isArray(hidro_d)) {
										if(hidro_d.length > 0) {
											await client.query("DELETE FROM informe_paraguay_prono_diario WHERE fecha=$1",[fields.fecha])
											var hresult = []
											loop1: 
											for (var i = 0, len = hidro_d.length; i< len;i++) {// var hresult = hidro.map( async (element,i ) => {
												var count=0
												for(let j of ["bneg","conc","pilc","form"]) {
													if(! /^\d+(\.\d+)?$/.test(hidro_d[i][j])) {
														count++
													}
												}
												if(count>0) { 
													continue
												}												
												const h = await client.query("INSERT INTO informe_paraguay_prono_diario (fecha_informe, fecha, bneg, conc, pilc, form) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (fecha,fecha_informe) DO UPDATE SET bneg=excluded.bneg, conc=excluded.conc, pilc=excluded.pilc, form=excluded.form RETURNING fecha",[fields.fecha, hidro_d[i].fecha_prono, hidro_d[i].bneg, hidro_d[i].conc, hidro_d[i].pilc, hidro_d[i].form])
												hresult[i] = h.rows[0].fecha
												//~ console.log("diario hidro row, fecha:"+ h.rows[0].fecha)
											}
											//~ console.log("Hidro inserted. Rows:" + hresult.length)
											//~ PRONO MENSUAL
											if(fields.prono_mensual) {
												var hidro_m = JSON.parse(fields.prono_mensual)
												if(Array.isArray(hidro_m)) {
													if(hidro_m.length > 0) {
														await client.query("DELETE FROM informe_paraguay_prono_mensual WHERE mes=$1",[fields.fecha])
														var hresult = []
														loop2: 
														for (var i = 0, len = hidro_m.length; i< len;i++) {// var hresult = hidro.map( async (element,i ) => {
															var count=0
															for(let j of ["bneg","conc","pilc","form"]) {
																if(! /^\d+(\.\d+)?$/.test(hidro_m[i][j])) {
																	count++
																}
															}
															if(count>0) { 
																continue
															}	
															const h = await client.query("INSERT INTO informe_paraguay_prono_mensual (fecha_informe, mes, bneg, conc, pilc, form) VALUES ($1, $2::date - (extract(day from $2::date)-1 || ' days')::interval , $3, $4, $5, $6) ON CONFLICT (mes,fecha_informe) DO UPDATE SET bneg=excluded.bneg, conc=excluded.conc, pilc=excluded.pilc, form=excluded.form RETURNING mes",[fields.fecha, hidro_m[i].fecha_prono, hidro_m[i].bneg, hidro_m[i].conc, hidro_m[i].pilc, hidro_m[i].form])
															hresult[i] = h.rows[0].fecha
															//~ console.log("mensual hidro row, fecha:"+ h.rows[0].mes)
														}
														//~ console.log("Hidro inserted. Rows:" + hresult.length)
														await client.query("COMMIT")
														//~ client.end()
														// INSERT_CORRIDAS DIARIO
														const series_diario = [["bneg",1546], ["conc",1527], ["pilc",1525], ["form", 3127]]
														for(var i=0, len = series_diario.length; i < len;i++) {
															var key =  series_diario[i][0]
															var data = hidro_d.map( x => [x.fecha_prono.replace(/(T.+)?$/,"T09:00:00"),x.fecha_prono.replace(/(T.+)?$/,"T09:00:00"),x[key]] )
															//~ console.log(data)
															insert_corridas(pool,312,series_diario[i][1],data,{forecast_date:fields.fecha,series_table:"series"}, (err,res)=>{
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
															var data = hidro_m.map( x => [x.fecha_prono,x.fecha_prono,x[key]] )
															insert_corridas(pool,289,series_mensual[i][1],data,{forecast_date:fields.fecha,series_table:"series"}, (err,res)=>{
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
														//~ setTimeout(
															printinf_paraguay(fields.fecha, (err,result) => {
																if(err) {
																	callback({status:err.status, message:err.message, error: err.error})
																	return
																}
																console.log("printinf_paraguay success!")
																callback(null, result)
															})
															//~ , 500
														//~ )
													} else {
														console.log("prono_mensual not valid!")
														await client.query("ROLLBACK")
														//~ client.end()
														callback({status:400, message:"prono_mensual is empty"})
													}
												} else {
													console.log("prono_mensual not valid!")
													await client.query("ROLLBACK")
													//~ client.end()
													callback({status:400, message:"prono_mensual not valid!"})
												}
											} else {
												console.log("prono_mensual not found!")
												await client.query("ROLLBACK")
												//~ client.end()
												callback({status:400, message:"prono_mensual not found!"})
											}
											
										} else {
											console.log("prono_diario property is empty")
											await client.query("ROLLBACK")
											//~ client.end()
											callback({status:400, message:"prono_diario property is empty"})
										}
									} else {
										console.log("prono_diario property is not an Array")
										await client.query("ROLLBACK")
										//~ client.end()
										callback({status:400, message:"prono_diario property is not an Array"})
											//~ throw new Error("hidro property is not an array")
									}
								} else {
									console.log("prono_diario property missing")
									await client.query("ROLLBACK")
									//~ client.end()
									callback({status:400, message:"prono_diario property missing"})
									//~ throw new Error("hidro property missing")
								}
								
								//~ res.send("Se insertó la información correctamente para la fecha " + result.rows[0].fecha + ". <a href=\"informe_complementario\">Volver al formulario</a>")
							} catch(err) {
									await client.query('ROLLBACK')
									//~ client.end()
									console.error("Insert informe_paraguay pg error", err.error)
									callback({status:500, message: "Server Error: " + err, error:err})
									//~ throw err
									//~ throw new Error("Server Error")
							} finally {
								client.release()
							}
						})
						//~ ().catch(e => {
							//~ console.error(e.stack)
						
							//~ callback({status:500, message: "Server Error", error:err})
						//~ })
					}
				//~ }
			//~ })
		}
	})
}

const printinf_paraguay = function (fecha,callback) { 
	latex_functions.print_informe_paraguay(new Client(config.database), {fecha:fecha}, (err, result) => {
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

const insert_corridas = async function (pool,cal_id,series_id,data,options, callback) {
	if(!pool) {
		console.error("pool no definido")
		callback("pool no definido")
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
	var fd_iso = options.forecast_date || (new Date()).toISOString.substring(0,19)
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
	if(!data) {
		console.error("falta data")
		callback("falta data")
		return
	}
	if(! Array.isArray(data)) {
		console.error("data debe ser un array")
		callback("data debe ser un array")
		return
	}
	//~ console.log("cal_id:"+cal_id+"series_id:"+series_id)
	//~ my $values_for_ins = arr2insert($values);
	//~ $dbh->{AutoCommit} = 0;
	//~ $dbh->{RaiseError} = 1;
	//~ my $rows;
	var inserted
	pool.connect( async (err, client, done) => {
		if(err) {
			console.error("pool.connect error!")
			client.end()
			callback({status:500,message:"Server error: Database connection failed",error:err})
			return
		}
		try {
			
			await client.query('BEGIN')
			const result = await client.query("insert into corridas (cal_id,date) values ($1,$2) on conflict (cal_id,date) do update set series_n=corridas.series_n+1 returning id",[cal_id,fd_iso])
			var corrida_id = result.rows[0].id
			await client.query("create temporary table prono_tmp (timestart timestamp not null,timeend timestamp not null,value real not null) ON COMMIT DROP")
			for(var i=0, len = data.length; i<len; i++) {
				if(data[i].length < 3) {
					console.error("Longitud de registro incorrecta, debe tener ser timestart,timeend,value")
					callback("Longitud de registro incorrecta, debe tener ser timestart,timeend,value")
					return
				}
				if(!data[i][0]) {
					console.error("timestart incorrecto")
					callback("timestart incorrecto")
					return
				}
				if(!data[i][1]) {
					console.error("timestart incorrecto")
					callback("timestart incorrecto")
					return
				}
				await client.query("insert into prono_tmp (timestart,timeend,value) values ($1,$2,$3)",[data[i][0],data[i][1],data[i][2]])
			}
			var prono_tmp = await client.query("select * from prono_tmp")
			//~ console.log(prono_tmp)
			await client.query("insert into pronosticos (cor_id,series_id,timestart,timeend) select $1,$2,prono_tmp.timestart,prono_tmp.timeend from prono_tmp on conflict(cor_id,series_id,timestart,timeend,qualifier) do update set timestart=excluded.timestart",[corrida_id,series_id])
			inserted = await client.query("insert into valores_prono_num (prono_id,valor) select pronosticos.id,value from prono_tmp,pronosticos where cor_id=$1 and series_id=$2 and pronosticos.timestart=prono_tmp.timestart on conflict(prono_id) do update set valor=excluded.valor RETURNING prono_id,valor",[corrida_id,series_id])
			await client.query("COMMIT")
			console.log("insert_corridas: commit exitoso!\n" + inserted.rows.length + " registros insertados")
		} catch(err) {
				await client.query('ROLLBACK')
				console.error("database query error", err)
				callback("database query Server error")
				return
				//~ throw new Error("Server Error")
		} finally {
			client.release()
		}
		//~ client.end()
		callback(null,"insert_corridas: commit exitoso!\n" + inserted.rows.length + " registros insertados")
		return
	})
}

const delete_informe = function (client,fecha) {
	if(!fecha) {
		console.error("delete_informe: falta fecha")
		return Promise.reject("delete_informe: falta fecha")
	}
	if(! new Date(fecha).getTime()) {
		console.error("delete_informe: fecha incorrecta")
		return Promise.reject("delete_informe: fecha incorrecta")
	}
	if(! client instanceof Client) {
		console.error("delete_informe: client incorrecto")
		return Promise.reject("delete_informe: client incorrecto")
	}
	return client.connect()
	  .then(() => {
		return client.query("BEGIN")
	}).then(()=>{
		return client.query("DELETE FROM informe_complementario_hidro WHERE fecha=$1",[fecha])
	}).then(()=>{
		return client.query("DELETE FROM informe_complementario where fecha=$1 RETURNING to_char(fecha,'YYYY-MM-DD'::text) fecha",[fecha])
	}).then((res)=>{
		return client.query("COMMIT").then(()=> {
			return res
		})
	}).catch(e => {
		console.error({message:"delete_informe: db error",error:e})
		client.query("ROLLBACK")
		throw e
	})
}

const delete_informe_paraguay = function (client,fecha) {
	if(!fecha) {
		console.error("delete_informe_paraguay: falta fecha")
		return Promise.reject("delete_informe_paraguay: falta fecha")
	}
	if(! new Date(fecha).getTime()) {
		console.error("delete_informe_paraguay: fecha incorrecta")
		return Promise.reject("delete_informe_paraguay: fecha incorrecta")
	}
	if(! client instanceof Client) {
		console.error("delete_informe_paraguay: client incorrecto")
		return Promise.reject("delete_informe_paraguay: client incorrecto")
	}
	return client.connect()
	  .then(() => {
		return client.query("BEGIN")
	}).then(()=>{
		return client.query("DELETE FROM informe_paraguay_prono_diario WHERE fecha_informe=$1",[fecha])
	}).then(()=>{
		return client.query("DELETE FROM informe_paraguay_prono_mensual WHERE fecha_informe=$1",[fecha])
	}).then(()=>{
		return client.query("DELETE FROM informe_paraguay where fecha=$1 RETURNING to_char(fecha,'YYYY-MM-DD'::text) fecha",[fecha])
	}).then((res)=>{
		return client.query("COMMIT").then(()=> {
			return res
		})
	}).catch(e => {
		console.error({message:"delete_informe_paraguay: db error",error:e})
		client.query("ROLLBACK")
		throw e
	})
}

app.get('/arco_portuario_rio_parana', (req, res) => {
    if(!req.isAuthenticated()) { 
		res.redirect('/login')
		return
	}
    const client = new Client(config.database)
    client.connect()
    if(req.query.fecha) {    // "fecha" especificada, busca en DB, 
	  client.query("SELECT to_char(fecha,'YYYY-MM-DD'::text) fecha, situacion_general, smn_map_file, cptec_map_file, texto_mapa_semanal, tendencia_climatica, pronostico_meteorologico, perspectiva_hidrometrica, synop_pasada, synop_presente FROM informe_arco_portuario_rio_parana WHERE fecha = $1", [req.query.fecha], (err, result) => {
		if(err) {
					console.log(err.stack)
					res.status(500).send("Server Error")
					return
		}
		var fecha_semana_pasada = new Date(new Date(req.query.fecha).getTime() - 14*24*3600*1000) 
		var fecha_semana_presente = new Date(new Date(req.query.fecha).getTime() - 7*24*3600*1000) 
		if(result.rows.length <=0) {
			res.render('edit_arco_portuario_rio_parana',{fecha:req.query.fecha, fecha_semana_pasada: fecha_semana_pasada, synop_pasada: "mapas_semanales_/" + dateFormat(fecha_semana_pasada,'isoDate').substring(0,4) + "/" + dateFormat(fecha_semana_pasada,'isoDate').substring(5,7) + "/pp_semanal_" + dateFormat(fecha_semana_pasada,'isoDate').replace(/-/g,"") + "_surf.png", synop_presente: "mapas_semanales_/" + dateFormat(fecha_semana_presente,'isoDate').substring(0,4) + "/" + dateFormat(fecha_semana_presente,'isoDate').substring(5,7) + "/pp_semanal_" + dateFormat(fecha_semana_presente,'isoDate').replace(/-/g,"") + "_surf.png"})
			console.log("fecha no encontrada, imprimiendo formulario vacío")
			return
		}
		result.rows[0].smn_map_file = result.rows[0].smn_map_file.replace(/^public\//,"")
		result.rows[0].cptec_map_file = (result.rows[0].cptec_map_file) ? result.rows[0].cptec_map_file.replace(/^public\//,"") : undefined
		result.rows[0].synop_pasada = (result.rows[0].synop_pasada) ? result.rows[0].synop_pasada : "mapas_semanales_/" + dateFormat(fecha_semana_pasada,'isoDate').substring(0,4) + "/" + dateFormat(fecha_semana_pasada,'isoDate').substring(5,7) + "/pp_semanal_" + dateFormat(fecha_semana_pasada,'isoDate').replace(/-/g,"") + "_surf.png"
		result.rows[0].synop_presente = (result.rows[0].synop_presente) ? result.rows[0].synop_presente : "mapas_semanales_/" + dateFormat(fecha_semana_presente,'isoDate').substring(0,4) + "/" + dateFormat(fecha_semana_presente,'isoDate').substring(5,7) + "/pp_semanal_" + dateFormat(fecha_semana_presente,'isoDate').replace(/-/g,"") + "_surf.png"
		console.log(result.rows[0])
		//~ busca niveles
		client.query("SELECT to_char(fecha_emision,'YYYY-MM-DD'::text) fecha_emision, to_char(fecha,'YYYY-MM-DD'::text) fecha, estacion_id, valor FROM informe_arco_portuario_rio_parana_niveles WHERE fecha_emision = $1 ORDER BY fecha,estacion_id", [req.query.fecha], (err, hresult) => {
			if(err) {
				console.log(err.stack)
				res.status(500).send("Server error, niveles no encontrados")
				return
			}
			if(hresult.rows.length<=0) {
				res.render("edit_arco_portuario_rio_parana", {...result.rows[0], fecha_semana_pasada: fecha_semana_pasada})
				console.log("edit_arco_portuario_rio_parana displayed with fecha, without niveles")
				return
			}
			var columns = [ 18, 19, 20 ,21, 22, 23, 24, 25, 26, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 45]
			var fechas = [...new Set(hresult.rows.map(r=>r.fecha))]
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

app.post('/arco_portuario_rio_parana/submit-form', (req, res) => {
	if(!req.isAuthenticated()) { 
		res.redirect('/login')
		return
	}
	generarInformeArcoPortuario(pool,req, (err,result) => {
		if(err) {
			console.error("generarInformeArcoPortuario error", err)
			res.status(err.status).send(err.message)
			return
		}
		console.log("generarInformeArcoPortuario success!. REdirecting to "+result.pdf_url)
		res.redirect("../" + result.pdf_url)
		return
	})
		//~ console.log(req.body)
		//~ res.send("Form submitted")
})

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
		if(!files.smn_map_file) {
			console.log("Error falta imagen smn")
			callback({status:400,message:"Error: falta imagen smn"})
			return
		}
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
		//~ var cptec_map_file
		//~ if(!files.cptec_map_file) {
			//~ console.log("Error falta imagen cptec")
			//~ callback({status:400,message:"Error: falta imagen cptec"})
			//~ return
		//~ }
		//~ if(files.cptec_map_file.size <= 0 ) {
			//~ cptec_map_file = (fields.cptec_map_file) ? fields.cptec_map_file.replace(/^/,"public/") : "public/img/cptec_map_file_" + fields.fecha + ".png"
			//~ if(!fs.existsSync(cptec_map_file)) {
				//~ console.log("Error falta imagen cptec. <a href=\"javascript:history.back()\">Volver</a>")
				//~ callback({status:400,message:"Error: falta imagen cptec"})
				//~ return
			//~ }
		//~ } else {
			//~ if(!fs.existsSync(files.cptec_map_file.path)) {
				//~ console.log("cptec file not found")
				//~ callback({status:400,message:"file not found"})
				//~ return
			//~ }
			//~ cptec_map_file = "public/img/cptec_map_file_" + fields.fecha + ".png"
			//~ fs.copyFileSync(files.cptec_map_file.path,cptec_map_file)
			//~ console.log(' cptec_map_file copied to  ' + cptec_map_file)
		//~ }
		pool.connect( async (err,client,done) => {
			try {
				const result = await client.query("INSERT INTO informe_arco_portuario_rio_parana (fecha, situacion_general, smn_map_file,  texto_mapa_semanal, tendencia_climatica, pronostico_meteorologico, perspectiva_hidrometrica, synop_pasada, synop_presente) VALUES ( $1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (fecha) DO UPDATE SET situacion_general=excluded.situacion_general, smn_map_file=excluded.smn_map_file, texto_mapa_semanal=excluded.texto_mapa_semanal, tendencia_climatica=excluded.tendencia_climatica, pronostico_meteorologico=excluded.pronostico_meteorologico, perspectiva_hidrometrica=excluded.perspectiva_hidrometrica, synop_pasada=excluded.synop_pasada, synop_presente=excluded.synop_presente RETURNING fecha", [fields.fecha, fields.situacion_general, smn_map_file, fields.texto_mapa_semanal, fields.tendencia_climatica, fields.pronostico_meteorologico, fields.perspectiva_hidrometrica, fields.synop_pasada_filename, fields.synop_presente_filename])
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
				var h = await client.query("INSERT INTO informe_arco_portuario_rio_parana_niveles (fecha_emision, fecha, estacion_id, valor) VALUES " + hrows + " ON CONFLICT (fecha,fecha_emision,estacion_id) DO UPDATE SET valor=excluded.valor RETURNING fecha")
				await client.query("COMMIT")
				// INSERT_CORRIDAS
				var cal_id=434
				await client.query("BEGIN")
				var corrida = await client.query("\
				with n as (\
					select informe_arco_portuario_rio_parana_niveles.*,\
						   series.id series_id\
					from informe_arco_portuario_rio_parana_niveles,\
					     series\
					where informe_arco_portuario_rio_parana_niveles.estacion_id =series.estacion_id \
					and series.var_id=67 \
					and series.proc_id=8 \
					and series.unit_id=11 \
					and fecha_emision=$2 \
					order by series.id,fecha\
				), c as (\
					insert into corridas (cal_id,date) values ($1,$2) on conflict (cal_id,date) do update set series_n=corridas.series_n+1 returning *\
				), p as (\
					insert into pronosticos (cor_id,series_id,timestart,timeend)\
						SELECT c.id, \
							   n.series_id, \
							   n.fecha - interval '7 days', \
							   n.fecha\
						FROM c,n\
						WHERE c.date=n.fecha_emision\
					ON CONFLICT (cor_id, series_id, timestart, timeend, qualifier) DO UPDATE SET timestart=excluded.timestart\
					RETURNING *\
					)\
				insert into valores_prono_num (prono_id,valor)\
						SELECT p.id, \
						       n.valor\
						FROM p,n\
						WHERE p.timeend = n.fecha\
						AND p.series_id = n.series_id\
					ON CONFLICT (prono_id) DO UPDATE SET valor=excluded.valor\
					RETURNING *",[cal_id,fields.fecha])
				await client.query("COMMIT")
				// IMPRIME INFORME
				console.log("run latex_functions.print_informe_arco_portuario, fecha: " + fields.fecha)
				//~ setTimeout(
				latex_functions.print_informe_arco_portuario(client,{fecha:fields.fecha})
				.then(result => {
					console.log("print_informe_arco_portuario success!")
					callback(null, result)
				})
				.catch(err=>{
					err.status = (err.status) ? err.status : 500
					callback({status:err.status, message:err.message, error: err.error})
					return
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

const delete_informe_arco_portuario = function (client,fecha) {
	var fecha_emision
	if(!fecha) {
		console.error("delete_informe_arco_portuario: falta fecha")
		return Promise.reject("delete_informe_arco_portuario: falta fecha")
	}
	if(! new Date(fecha).getTime()) {
		console.error("delete_informe_arco_portuario: fecha incorrecta")
		return Promise.reject("delete_informe_arco_portuario: fecha incorrecta")
	}
	if(! client instanceof Client) {
		console.error("delete_informe_arco_portuario: client incorrecto")
		return Promise.reject("delete_informe_arco_portuario: client incorrecto")
	}
	return client.connect()
	  .then(() => {
		return client.query("BEGIN")
	}).then(()=>{
		return client.query("DELETE FROM informe_arco_portuario_rio_parana_niveles WHERE fecha_emision=$1",[fecha])
	}).then(()=>{
		return client.query("DELETE FROM informe_arco_portuario_rio_parana where fecha=$1 RETURNING to_char(fecha,'YYYY-MM-DD'::text) fecha",[fecha])
	}).then(result=>{
		if(result && result.rows && result.rows[0] && result.rows[0].fecha) {
			fecha_emision = result.rows[0].fecha
		}
		return client.query("COMMIT")
	})
	.then(()=> {
		console.log("finally")
		//~ if(fecha_emision) {
		if(!fecha_emision) {
			fecha_emision = fecha
		}
		//~ console.log({fecha_emision:fecha_emision})
		const cookieJar = new tough.CookieJar();
		return deleteCorrida(undefined,434,fecha_emision)
		.then(corrida=>{
			if(corrida) {
				console.log({deleted_corrida:corrida})
				return {fecha:fecha_emision, data: corrida}
			} else {
				console.log("corrida not found")
				return
			}
		})
		//~ return axios.request({url:config.a5.host +"/login", method: "post", jar: cookieJar, withCredentials: true, params: {username: config.a5.user, password: config.a5.password}})
		//~ .then(response=>{
			//~ return axios.request({method: "delete", url: config.a5.host +"/sim/calibrados/434/corridas", params: {forecast_date: fecha_emision},responseType: 'json', jar: cookieJar, withCredentials: true})
		//~ })
		//~ .then(response=>{
			//~ if(response) {
				//~ console.log({data:response.data})
				//~ return {fecha:fecha_emision, data: response.data}
			//~ } else {
				//~ console.log("no response")
				//~ return
			//~ }
		//~ })
		//~ .catch(e=>{
			//~ if(e.response) {
				//~ console.error(e.response.data)
				//~ throw e.response.data
			//~ } else {
				//~ throw e
			//~ }
		//~ })
	})
	.catch(e => {
		console.error({message:"delete_informe_arco_portuario: db error",error:e})
		client.query("ROLLBACK")
		throw e
	})
}

app.get('/arco_portuario_rio_parana/delete', (req,res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login')
		return
	}
	if(!req.query.fecha) {
		res.status(400).send("Error:Falta fecha")
		return
	}
	const client = new Client(config.database)
	delete_informe_arco_portuario(client,req.query.fecha)
	.then(result => {
		console.log(result)
		if(!result) {
			res.send("No se encontró la fecha indicada. Volver a <a href=/informes/index>informes</a>")
			return
		}
		res.send("Informe arco portuario eliminado. Fecha:" + result.fecha + ". Volver a <a href=../index>informes</a>")
		return
	}).catch(e => {
		console.log("delete informe arco portuario error")
		console.error(e)
		res.status(400).send({message:"delete informe arco portuario error",error:e})
		return
	})
})

function deleteCorrida(cor_id,cal_id,forecast_date) {
	var corrida={}
	if(!cor_id && !(cal_id && forecast_date)) {
		return Promise.reject("cor_id or cal_id+forecast_date missing")
	}
	return pool.connect()
	.then(client=>{
		return client.query("BEGIN")
		.then(()=>{	
			if(cor_id) {
				return client.query("DELETE FROM valores_prono_num USING pronosticos WHERE pronosticos.cor_id=$1 AND pronosticos.id=valores_prono_num.prono_id",[cor_id])
			} else {
				return client.query("DELETE FROM valores_prono_num USING pronosticos,corridas WHERE corridas.cal_id=$1 AND corridas.date::date=$2::date AND corridas.id=pronosticos.cor_id AND pronosticos.id=valores_prono_num.prono_id",[cal_id,forecast_date])
			}
		})
		.then((result)=>{	
			corrida.valores = (result.rows) ? result.rows : undefined
			if(cor_id) {
				return client.query("DELETE FROM pronosticos WHERE pronosticos.cor_id=$1 RETURNING *",[cor_id])
			} else {
				return client.query("DELETE FROM pronosticos USING corridas WHERE corridas.cal_id=$1 AND corridas.date::date=$2::date AND pronosticos.cor_id=corridas.id RETURNING *",[cal_id,forecast_date])
			}
		})
		.then((result)=>{	
			corrida.pronosticos = (result.rows) ? result.rows : undefined
			if(cor_id) {
				return client.query("DELETE FROM corridas WHERE id=$1 RETURNING *",[cor_id])
			} else {
				return client.query("DELETE FROM corridas WHERE cal_id=$1 and date::date=$2::date RETURNING *",[cal_id,forecast_date])
			}
		}) 
		.then((result)=>{
			if(!result.rows) {
				throw("prono not found")
				return
			}
			if(result.rows.length == 0) {
				throw("prono not found")
				return
			}
			corrida.cor_id = result.rows[0].cal_id
			corrida.cal_id = result.rows[0].cal_id
			corrida.forecast_date = result.rows[0].cal_id
			return client.query("COMMIT")
		})
		.then(()=>{
			client.release()
			return corrida
		})
		.catch(e=>{
			client.release()
			throw(e)
		})
	})
}

app.get('/arco_portuario_rio_parana/print', (req,res) => {
	if(!req.isAuthenticated()) {
		res.redirect('/login')
		return
	}
	if(!req.query.fecha) {
		res.status(400).send("Error:Falta fecha")
		return
	}
	//~ const client = new Client(config.database)
	pool.connect((err,client,done)=>{
		if(err) {
			console.log("db error")
			res.status(500).send("server error")
			return
		}
		latex_functions.print_informe_arco_portuario(client,{fecha:req.query.fecha})
		.then(result => {
			done()
			if(!result) {
				res.send("No se encontró la fecha indicada. Volver a <a href=../index>informes</a>")
				return
			}
			console.log("print_informe_arco_portuario success!")
			res.redirect("../" + result.pdf_url)
			return
		})
		.catch(error=>{
			done()
			error.status = (error.status) ? error.status : 500
			console.error(error)
			res.status(error.status).send({status:error.status, message:error.message, error: error.error})
			return
		})
	})
})
