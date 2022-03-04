'use strict'

const request = require('request')
var fs =require("promise-fs")
var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')
var bodyParser = require('body-parser')
const { body } = require('express-validator');
const querystring = require('querystring');

const { Pool } = require('pg')
// const readline = require("readline");
// const { exec } = require('child_process');
const spawn = require('child_process').spawn

const crypto = require('crypto')

const config = require('config');

const pool = new Pool(config.database)
const port = config.rest.port
const CRUD = require('./CRUD')
const crud = new CRUD.CRUD(pool,config)

const accessors = require('./accessors')

var default_rast_location = (config.rast) ? (config.rast.location) ? config.rast.location : "public" : "public"

// const basicAuth = require('express-basic-auth')
// var flash = require('express-flash')
// var cookieParser = require('cookie-parser')
var session = require('express-session')
// const FileStore = require('session-file-store')(session);
// const uuid = require('uuid')

var path = require('path');
const tar = require('tar');

pool.on('connect', client=>{
	client.notifications = []
	client.on('notice', msg=>{
		console.log({"pg notice":msg.message})
		client.notifications.push(msg) 
	})
})

// file_indexer
const file_indexer = require('./file_indexer')
const indexer = new file_indexer.file_indexer(pool)

// print_rast
const printRast = require('./print_rast')
const print_rast = printRast.print_rast

// MEMORY USAGE LOG
fs.writeFileSync("logs/memUsage.log","#timestamp,rss,heapTotal,heapUsed,external\n")
setInterval(logMemUsage,10000)

// AUTHENTICATION
const auth = require('../../appController/app/authentication.js')(app,config,pool)
const passport = auth.passport
//~ const passport = require('passport');
// //~ app.use(cookieParser());
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
app.use( bodyParser.json({limit: '50mb'}) );       // to support JSON-encoded bodies
//~ app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  //~ extended: true
//~ })); 
app.use(express.urlencoded())
//~ app.use(session({
	 //~ cookie: { maxAge: 10800000 }, 
	 //~ secret: 'un chapati', 
	 //~ key: "id",
	//~ genid: (req) => {
		//~ console.log('Inside session middleware genid function')
		//~ console.log(`Request object sessionID from client: ${req.sessionID}`)
		//~ return uuid() // use UUIDs for session IDs
	//~ },
	//~ store: new FileStore(),
	//~ resave: false,
	//~ saveUninitialized: true
//~ }));
//~ app.use(passport.initialize());
//~ app.use(passport.session());
//~ app.use(flash());
//~ app.use('/planillas',auth.isWriter);
app.use(express.static('public', {
	setHeaders: function (res, path, stat) {
		res.set('x-timestamp', Date.now())
		//~ console.log({path:path})
		var contenttype = (/\/js\//.test(path)) ? "text/javascript" : (/\/css\//.test(path)) ? "text/css" : (/\/html\//.test(path)) ? "text/html" : (/\/img\//.test(path)) ? (/\.gif$/.test(path)) ? "image/gif" : "image/png" : (/\/planillas\//.test(path)) ?  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"  : (/\/json\//.test(path)) ? "application/json" : "text/html"
		//~ console.log({contenttype:contenttype})
		res.set('Content-Type', contenttype)
		if(/\/planillas\//.test(path)) {
			res.set('Content-Disposition','attachment; filename="' + path.replace(/^.+\//,"") + '"')
			res.set('Content-Transfer-Encoding','binary')
		}
	}	
}));
const LocalStrategy = require('passport-local').Strategy;
//~ const BasicStrategy = require('passport-http').BasicStrategy

const formidable = require('formidable')


// CONTROLLER //

app.get('/', (req,res)=> {
	// setTimeout(()=>{
	// 	res.send("alerta5DBIO running.")
	// },1000)
	pool.query("SELECT now() AS date")
	.then(result=>{
		res.send("alerta5DBIO running. " + result.rows[0].date + ".")
	})
	.catch(e=>{
		console.error(e.toString())
		res.status(500).send("Server error, please contact the administrator (DB connection failed!)")
	})
})

app.get('/exit',auth.isAdmin,(req,res)=>{  // terminate Nodejs process
	res.status(200).send("Terminating Nodejs process")
	console.log("Exit order recieved from client")
	setTimeout(()=>{
		process.exit()
	},500)
})
app.post('/getRedes',auth.isPublic,[
	body('nombre').isString().trim(),
	body('tabla').isString().trim(),
	body('public').toBoolean(),
	body('hisplata').toBoolean(),
	body('format').isString().trim(),
	body('pretty').toBoolean()
],getRedes)
app.get('/getRedes',auth.isPublic,getRedes)
app.post('/insertRedes',auth.isAdmin, upsertRedes)
app.post('/getEstaciones',auth.isPublic,getEstaciones)
app.get('/getEstaciones',auth.isPublic,getEstaciones)
app.post('/getAreas',auth.isPublic,getAreas)
app.get('/getAreas',auth.isPublic,getAreas)
app.post('/getSeries',auth.isPublic,getSeries)
app.get('/getSeries',auth.isPublic,getSeries)
app.post('/getObservaciones',auth.isPublic,getObservaciones)
app.get('/getObservaciones',auth.isPublic,getObservaciones)
app.get('/getObservacionesDia',auth.isPublic,getObservacionesDia)
app.get('/getObservacionesTimestart',auth.isPublic,getObservacionesTimestart)
app.post('/upsertObservaciones',auth.isWriter, upsertObservaciones)
app.post('/upsertObservacionesCSV',auth.isWriter, upsertObservacionesCSV)
app.post('/upsertObservacion',auth.isWriter, upsertObservacion)   // one obs with tipo series_id timestart timeend valor
app.post('/deleteObservaciones',auth.isWriter, deleteObservaciones)  //  by datetime range (timestart timeend), series_di, tipo
app.post('/deleteObservacionesById',auth.isWriter, deleteObservacionesById)   // by tipo, id list
app.post('/deleteObservacion',auth.isWriter, deleteObservacion)               // by id
app.post('/updateObservacionById',auth.isWriter, updateObservacionById)
app.post('/getRastObs',auth.isPublic,getRastObs)
app.get('/getRastObs',auth.isPublic,getRastObs)
app.post('/rastExtract',auth.isPublic,rastExtract)
app.get('/rastExtract',auth.isPublic,rastExtract)
app.get('/rastExtractByArea',auth.isWriter,rastExtractByArea)
//~ app.post('/getFromAccessor',getFromAccessor)
app.get('/getSeriesBySiteAndVar',auth.isPublic, getSeriesBySiteAndVar)
app.post('/getSeriesBySiteAndVar',auth.isPublic, getSeriesBySiteAndVar)
//~ app.get('/secciones',seccionesView)
app.get('/secciones',auth.isPublicView, (req,res)=>{
	var params = (req.query) ? req.query : {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	if(config.verbose) {
		console.log({params:params})
	}
	res.render("secciones_bs",params)
})
app.get('/visor',auth.isAuthenticatedView, (req,res)=>{
	var params = (req.query) ? req.query : {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	//~ console.log({params:params})
	res.render("visor",params)
})
app.get('/metadatos',auth.isPublicView,(req,res)=>{
	var params = (req.query) ? req.query : {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	if(config.verbose) {
		console.log({params:params})
	}
	if(!req.query.element) {
		res.render('catalogo')
	} else {
		//~ res.status(400).send("Falta parámetro element")
	//~ }
		res.render('md',params)
	}
})
app.get('/getMonitoredVars',auth.isPublic,getMonitoredVars)
app.post('/getMonitoredVars',auth.isPublic,getMonitoredVars)
app.get('/getMonitoredFuentes',auth.isPublic,getMonitoredFuentes)
app.post('/getMonitoredFuentes',auth.isPublic,getMonitoredFuentes)
app.get('/getMonitoredPoints',auth.isPublic,getMonitoredPoints)
app.post('/getMonitoredPoints',auth.isPublic,getMonitoredPoints)
app.get('/getMonitoredAreas',auth.isPublic,getMonitoredAreas)
app.post('/getMonitoredAreas',auth.isPublic,getMonitoredAreas)
//~ app.get('/getObsDiarios',auth.isPublic,getObsDiarios)
//~ app.post('/getObsDiarios',auth.isPublic,getObsDiarios)
//~ app.get('/updateObsDiarios',updateObsDiarios)
//~ app.post('/updateObsDiarios',auth.isWriter,updateObsDiarios)
//~ app.get('/getCuantilesDiarios',auth.isAuthenticated,getCuantilesDiarios)
//~ app.post('/getCuantilesDiarios',auth.isAuthenticated,getCuantilesDiarios)
//~ app.get('/updateCuantilesDiarios',updateCuantilesDiarios)
//~ app.post('/updateCuantilesDiarios',auth.isWriter,updateCuantilesDiarios)
//~ app.get('/updateCuantilesDiariosSuavizados',updateCuantilesDiariosSuavizados)
//~ app.post('/updateCuantilesDiariosSuavizados',passport.authenticate('local'),updateCuantilesDiariosSuavizados)
app.post('/upsertCuantilesDiariosSuavizados',auth.isWriter,upsertCuantilesDiariosSuavizados)
app.get('/getRegularSeries',auth.isAuthenticated,getRegularSeries)
app.get('/getMultipleRegularSeries',auth.isAuthenticated,getMultipleRegularSeries)
app.get('/getAsociaciones',auth.isAuthenticated,getAsociaciones)
app.post('/runAsociaciones',auth.isWriter,runAsociaciones)
app.post('/getCuantilesDiariosSuavizados',auth.isWriter,getCuantilesDiariosSuavizados)
app.get('/getCuantilesDiariosSuavizados',auth.isPublic,getDailyDoyStats)
app.get('/getCuantilDiarioSuavizado',auth.isAuthenticated,getCuantilDiarioSuavizado)
app.post('/upsertPercentilesDiarios',auth.isWriter,upsertPercentilesDiarios)
app.post('/getPercentilesDiarios',auth.isPublic,getPercentilesDiarios)
app.get('/getPercentilesDiarios',auth.isPublic,getPercentilesDiarios) // isAuthenticated
app.post('/getPercentilesDiariosBetweenDates',auth.isPublic,getPercentilesDiariosBetweenDates)
app.get('/getPercentilesDiariosBetweenDates',auth.isPublic,getPercentilesDiariosBetweenDates)
// MODELOS
app.get('/getCalibrados',auth.isPublic,getCalibrados)
app.post('/deleteCalibrado',auth.isWriter,deleteCalibrado)
app.post('/upsertCalibrado',auth.isWriter,upsertCalibrado)
app.get('/getPronosticos',auth.isPublic,getPronosticos)
app.post('/upsertPronostico',auth.isWriter,upsertPronostico)
app.post('/deletePronostico',auth.isWriter,deletePronostico)
// ACCESSORS
app.get('/accessors',auth.isAdmin,getAccessorsList)
app.get('/accessors/:name',auth.isAdmin,getAccessorsList)
app.get('/accessors/:name/test',auth.isWriter,testAccessor)
app.get('/accessors/:name/get',auth.isWriter,getFromAccessor)
app.get('/accessors/:name/getAll',auth.isWriter,getAllFromAccessor)
app.get('/accessors/:name/getSites',auth.isWriter,getSitesFromAccessor)
app.get('/accessors/:name/getSeries',auth.isWriter,getSeriesFromAccessor)
app.post('/accessors/:name/updateSites',auth.isWriter,updateSitesFromAccessor)
app.post('/accessors/:name/updateSeries',auth.isWriter,updateSeriesFromAccessor)
app.post('/accessors/:name/update',auth.isWriter,updateFromAccessor)
app.post('/accessors/:name/updateAll',auth.isWriter,updateAllFromAccessor)
app.post('/accessors/:name/upload',auth.isWriter,uploadToAccessor)
app.get('/redesAccessors',auth.isWriter,getRedesAccessors)
app.post('/getParaguay09',auth.isAuthenticated,getParaguay09)
app.get('/postParaguay09',auth.isWriterView,postParaguay09Form)  //,passport.authenticate('local')
app.post('/postParaguay09',auth.isWriter,postParaguay09)  //,passport.authenticate('local')
app.get('/getalturas2mnemos',auth.isAuthenticated,getalturas2mnemos)
app.post('/getPrefe',auth.isAuthenticated,getPrefe)
app.get('/getPrefe',auth.isAuthenticated,getPrefe)
app.post('/getPrefeAndUpdate',auth.isWriter,getPrefeAndUpdate)
app.get('/getFromSource',auth.isAuthenticated,getFromSource)
app.post('/getFromSource',auth.isAuthenticated,getFromSource)
app.get('/getTelex',auth.isAuthenticated,getTelex)
app.post('/postTelex',auth.isWriter,postTelex)
app.get('/postTelex',auth.isWriterView,postTelexForm)
app.get('/cargarPlanillas',auth.isWriterView,(req,res)=> {
	var params = (req.query) ? req.query : {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	//~ console.log({params:params})
	res.render('cargarPlanillas',params)
})
app.get('/accessorUploadForm',auth.isWriterView,renderAccessorUploadForm)
//~ app.get('/planillas',(req,res)=> res.render('cargarPlanillas'))
app.get('/getTabprono',auth.isAuthenticated,getTabprono)
app.post('/postTabprono',auth.isAuthenticated,postTabprono)
app.get('/postTabprono',auth.isWriterView,postTabpronoForm)
app.get('/getONS',auth.isAuthenticated,getONS)
app.post('/postONS',auth.isWriter,postONS)
app.get('/makeONSTables',auth.isWriter,makeONSTables)
app.get('/getDadosANA',auth.isWriter,getDadosANA)
app.get('/getSitesANA',auth.isAuthenticated,getSitesANA)
app.get('/getSQPESMN',auth.isWriter,getSQPESMN)
//~ app.post('/postUruProno',passport.authenticate('local'),postUruProno)
// GEOSERVER
app.get('/createWorkspace',auth.isAuthenticated,geoserverCreateWorkspace)
app.post('/createWorkspace',auth.isAuthenticated,geoserverCreateWorkspace)
app.get('/createDatastore',auth.isAuthenticated,geoserverCreateDatastore)
app.post('/createDatastore',auth.isAuthenticated,geoserverCreateDatastore)
app.get('/createPointsLayer',auth.isAuthenticated,geoserverCreatePointsLayer)
app.post('/createPointsLayer',auth.isAuthenticated,geoserverCreatePointsLayer)
app.get('/createAreasLayer',auth.isAuthenticated,geoserverCreateAreasLayer)
app.post('/createAreasLayer',auth.isAuthenticated,geoserverCreateAreasLayer)
app.get('/deletePointsLayer',auth.isAuthenticated,geoserverDeletePointsLayer)
app.post('/deletePointsLayer',auth.isAuthenticated,geoserverDeletePointsLayer)
app.get('/deleteAreasLayer',auth.isAuthenticated,geoserverDeleteAreasLayer)
app.post('/deleteAreasLayer',auth.isAuthenticated,geoserverDeleteAreasLayer)
// REST API
// UI
app.get('/apiUI',auth.isPublicView,(req,res)=>{
	var params={}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	res.render('apiUI',params)
})
// SIM
app.get('/sim/modelos',auth.isAuthenticated,getModelos)
app.get('/sim/modelos/:id',auth.isAuthenticated,getModelo)
app.get('/sim/calibrados',auth.isPublic,getCalibrados)
app.post('/sim/calibrados',auth.isAdmin,upsertCalibrado)
app.get('/sim/calibrados/:id',auth.isPublic,getCalibrado)
app.put('/sim/calibrados/:id',auth.isAdmin,upsertCalibrado)
app.delete('/sim/calibrados/:id',auth.isAdmin,deleteCalibrado)
app.get('/sim/calibrados_grupos',auth.isPublic,getCalibradosGrupos)
app.get('/sim/calibrados_grupos/:id',auth.isPublic,getCalibradosGrupos)
app.get('/sim/calibrados/:cal_id/corridas',auth.isPublic,getPronosticos)
app.get('/sim/calibrados/:cal_id/corridas_guardadas',auth.isPublic,getCorridasGuardadas)
app.post('/sim/calibrados/:cal_id/corridas',auth.isWriter,upsertPronostico)
app.delete('/sim/calibrados/:cal_id/corridas',auth.isWriter,deletePronostico)
app.get('/sim/calibrados/:cal_id/corridas/:id',auth.isPublic,getPronostico)
app.get('/sim/calibrados/:cal_id/corridas_guardadas/:cor_id',auth.isPublic,getCorridasGuardadas)
app.put('/sim/calibrados/:cal_id/corridas/:id',auth.isWriter,upsertPronostico)
app.delete('/sim/calibrados/:cal_id/corridas/:id',auth.isWriter,deletePronostico)
app.get('/sim/calibrados/:cal_id/forzantes',auth.isAuthenticated,getForzantes)
app.post('/sim/calibrados/:cal_id/forzantes',auth.isAdmin,upsertForzantes)
app.delete('/sim/calibrados/:cal_id/forzantes',auth.isAdmin,deleteForzantes)
app.get('/sim/calibrados/:cal_id/forzantes/:orden',auth.isAuthenticated,getForzante)
app.put('/sim/calibrados/:cal_id/forzantes/:orden',auth.isAdmin,upsertForzante)
app.delete('/sim/calibrados/:cal_id/forzantes/:orden',auth.isAdmin,deleteForzante)
//obs
app.get('/obs/:tipo/fuentes',auth.isPublic,((req,res)=>{
	if(req.params.tipo.toLowerCase()=="puntual") {
		getRedes(req,res)
	} else if(req.params.tipo.toLowerCase()=="areal" || req.params.tipo.toLowerCase()=="raster" || req.params.tipo.toLowerCase()=="rast") {
		req.params.tipo = undefined
		getFuentes(req,res)
	} else {
		res.status(400).send({message:"tipo incorrecto"})
	}
}))
app.post('/obs/:tipo/fuentes',auth.isWriter, ((req,res)=>{
	if(req.params.tipo.toLowerCase()=="puntual") {
		upsertRedes(req,res)
	} else if(req.params.tipo.toLowerCase()=="areal" || req.params.tipo.toLowerCase()=="raster" || req.params.tipo.toLowerCase()=="rast") {
		upsertFuentes(req,res)
	} else {
		res.status(400).send({message:"tipo incorrecto"})
	}
}))
app.get('/obs/:tipo/fuentes/:id',auth.isPublic,((req,res)=>{
	if(req.params.tipo.toLowerCase()=="puntual") {
		getRed(req,res)
	} else if(req.params.tipo.toLowerCase()=="areal" || req.params.tipo.toLowerCase()=="raster" || req.params.tipo.toLowerCase()=="rast") {
		getFuente(req,res)
	} else {
		res.status(400).send({message:"tipo incorrecto"})
	}
}))
app.put('/obs/:tipo/fuentes/:id',auth.isWriter,((req,res)=>{
	if(req.params.tipo.toLowerCase()=="puntual") {
		upsertRed(req,res)
	} else if(req.params.tipo.toLowerCase()=="areal" || req.params.tipo.toLowerCase()=="raster" || req.params.tipo.toLowerCase()=="rast") {
		upsertFuente(req,res)
	} else {
		res.status(400).send({message:"tipo incorrecto"})
	}
}))
app.delete('/obs/:tipo/fuentes/:id',auth.isWriter,((req,res)=>{
	if(req.params.tipo.toLowerCase()=="puntual") {
		deleteRed(req,res)
	} else if(req.params.tipo.toLowerCase()=="areal" || req.params.tipo.toLowerCase()=="raster" || req.params.tipo.toLowerCase()=="rast") {
		deleteFuente(req,res)
	} else {
		res.status(400).send({message:"tipo incorrecto"})
	}
}))


app.get('/obs/variables',auth.isPublic,getVariables) // isAuthenticated,getVariables)
app.post('/obs/variables',auth.isAdmin, upsertVariables)
app.get('/obs/variables/:id',auth.isPublic,getVariable) // isAuthenticated,getVariable)
app.put('/obs/variables/:id',auth.isAdmin,upsertVariable)
app.delete('/obs/variables/:id',auth.isAdmin,deleteVariable)
app.get('/obs/variables/:var_id/from/:timestart/to/:timeend',auth.isPublic,getCampo) // isAuthenticated,
app.get('/obs/variables/:var_id/from/:timestart/to/:timeend/by/:dt',auth.isPublic,getCampoSerie) // isAuthenticated,

app.get('/obs/procedimientos',auth.isPublic,getProcedimientos)
app.post('/obs/procedimientos',auth.isAdmin, upsertProcedimientos)
app.get('/obs/procedimientos/:id',auth.isPublic,getProcedimiento)
app.put('/obs/procedimientos/:id',auth.isAdmin,upsertProcedimiento)
app.delete('/obs/procedimientos/:id',auth.isAdmin,deleteProcedimiento)

app.get('/obs/unidades',auth.isPublic,getUnidades)
app.post('/obs/unidades',auth.isAdmin, upsertUnidades)
app.get('/obs/unidades/:id',auth.isPublic,getUnidad)
app.put('/obs/unidades/:id',auth.isAdmin,upsertUnidad)
app.delete('/obs/unidades/:id',auth.isAdmin,deleteUnidades)

app.get('/obs/puntual/fuentes/:fuentes_id/estaciones',auth.isPublic,getEstaciones)
app.post('/obs/puntual/fuentes/:fuentes_id/estaciones',auth.isAdmin,upsertEstaciones)
app.get('/obs/puntual/fuentes/:fuentes_id/estaciones/:id',auth.isPublic,getEstacion)
app.put('/obs/puntual/fuentes/:fuentes_id/estaciones/:id',auth.isAdmin,updateEstacion)
app.delete('/obs/puntual/fuentes/:fuentes_id/estaciones/:id',auth.isAdmin,deleteEstacion)

app.get('/obs/puntual/estaciones',auth.isPublic,getEstaciones)
app.post('/obs/puntual/estaciones',auth.isAdmin,upsertEstaciones)
app.get('/obs/puntual/estaciones/:id',auth.isPublic,getEstacion)
app.put('/obs/puntual/estaciones/:id',auth.isAdmin,updateEstacion)
app.delete('/obs/puntual/estaciones/:id',auth.isAdmin,deleteEstacion)
app.delete('/obs/puntual/estaciones',auth.isAdmin,deleteEstaciones)

app.get('/obs/raster/escenas',auth.isPublic,getEscenas)
app.post('/obs/raster/escenas',auth.isAdmin,upsertEscenas)
app.get('/obs/raster/escenas/:id',auth.isPublic,getEscena)
app.put('/obs/raster/escenas/:id',auth.isAdmin,upsertEscena)
app.delete('/obs/raster/escenas/:id',auth.isAdmin,deleteEscena)

app.get('/obs/areal/areas',auth.isPublic,getAreas)
app.post('/obs/areal/areas',auth.isAdmin,upsertAreas)
app.get('/obs/areal/areas/:id',auth.isPublic,getArea)
app.put('/obs/areal/areas/:id',auth.isAdmin,upsertArea)
app.delete('/obs/areal/areas/:id',auth.isAdmin,deleteArea)

app.get('/obs/:tipo/series',auth.isPublic,getSeries)
app.post('/obs/:tipo/series',auth.isAdmin,upsertSeries)
app.delete('/obs/:tipo/series',auth.isAdmin,deleteSeries)
app.get('/obs/:tipo/series/:id',auth.isPublic,getSerie)
app.put('/obs/:tipo/series/:id',auth.isAdmin,upsertSerie)
app.delete('/obs/:tipo/series/:id',auth.isAdmin,deleteSerie)

app.get('/obs/:tipo/series/:series_id/observaciones',auth.isPublic,getObservaciones)
app.get('/obs/:tipo/observaciones',auth.isPublic,getObservaciones)
app.post('/obs/:tipo/series/:series_id/observaciones',auth.isWriter,upsertObservaciones) // app.post('/upsertObservacionesCSV',auth.isWriter, upsertObservacionesCSV)
app.post('/obs/:tipo/observaciones',auth.isWriter,upsertObservaciones)
app.delete('/obs/:tipo/series/:series_id/observaciones',auth.isWriter,deleteObservaciones) //  by datetime range (timestart timeend), series_id, tipo // app.post('/deleteObservacionesById',auth.isWriter, deleteObservacionesById)   // by tipo, id list
app.delete('/obs/:tipo/observaciones',auth.isWriter,deleteObservaciones)
app.get('/obs/:tipo/series/:series_id/observaciones/:id',auth.isPublic,getObservacion)
app.get('/obs/:tipo/observaciones/:id',auth.isPublic,getObservacion)
app.get('/obs/:tipo/series/:series_id/observacion',auth.isPublic,getObservacion)
app.get('/obs/:tipo/observacion',auth.isPublic,getObservacion)
app.put('/obs/:tipo/series/:series_id/observaciones/:id',auth.isWriter,updateObservacionById)
app.put('/obs/:tipo/observaciones/:id',auth.isWriter,updateObservacionById)
app.delete('/obs/:tipo/series/:series_id/observaciones/:id',auth.isWriter,deleteObservacion)
app.delete('/obs/:tipo/observaciones/:id',auth.isWriter,deleteObservacion)
app.get('/obs/:tipo/series/:series_id/getFromSource',auth.isPublic,getFromSource)
//~ app.get('/obs/raster/series/:series_id/observaciones',auth.isAuthenticated,getRastObs)
app.get('/obs/raster/series/:series_id/extract',auth.isPublic,rastExtract)
app.get('/obs/raster/series/:series_id/extractByArea',auth.isWriter,rastExtractByArea)
app.get('/obs/:tipo/timestart/:timestart',auth.isPublic,getObservacionesTimestart)
app.get('/obs/:tipo/dia/:date',auth.isPublic,getObservacionesDia)
app.get('/obs/:tipo/series/:series_id/dia/:date',auth.isPublic,getObservacionesDia)
app.get('/obs/:tipo/series/:series_id/regular',auth.isAuthenticated,getRegularSeries)
app.get('/obs/:tipo/regular',auth.isAuthenticated,getMultipleRegularSeries)
app.get('/obs/puntual/campo',auth.isPublic,getCampo) // isAuthenticated
app.get('/obs/puntual/campo',auth.isPublic,getCampoSerie) // isAuthenticated
app.get('/obs/asociaciones',auth.isWriter,(req,res)=>{
	if(req.query.run) {
		runAsociaciones(req,res)
	} else {
		getAsociaciones(req,res)
	}
})
app.post('/obs/asociaciones',auth.isAdmin,upsertAsociaciones)
app.get('/obs/asociaciones/:id',auth.isWriter,(req,res)=>{
	if(req.query.run) {
		runAsociacion(req,res)
	} else {
		getAsociacion(req,res)
	}
})
app.put('/obs/asociaciones/:id',auth.isAdmin,upsertAsociacion)
app.delete('/obs/asociaciones/:id',auth.isAdmin,deleteAsociacion)
app.get('/obs/:tipo/series/:series_id/estadisticosDiariosSuavizados',auth.isPublic,(req,res)=>{
	if(req.query.run) {
		isWriter(req,res,()=> getCuantilesDiariosSuavizados(req,res))
	} else {
		getDailyDoyStats(req,res)
	}
})
app.post('/obs/:tipo/series/:series_id/estadisticosDiariosSuavizados',auth.isWriter,upsertCuantilesDiariosSuavizados)
app.get('/obs/:tipo/series/:series_id/estadisticosDiariosSuavizados/:cuantil',auth.isAuthenticated,getCuantilDiarioSuavizado)
app.get('/obs/:tipo/series/:series_id/percentilesDiarios',auth.isPublic,getPercentilesDiarios)
app.post('/obs/:tipo/series/:series_id/percentilesDiarios',auth.isWriter,upsertPercentilesDiarios)
app.get('/obs/:tipo/series/:series_id/percentilesDiarios/:timestart/:timeend',auth.isPublic,getPercentilesDiariosBetweenDates)

app.post('/tools/geojson2rast',auth.isAuthenticated,geojson2rast)
app.get('/tools/pp_cdp/:timestart',auth.isAuthenticated,read_pp_cdp)
app.put('/tools/pp_cdp/:timestart',auth.isWriter,get_pp_cdp)
app.post('/tools/pp_cdp/:timestart',auth.isWriter,upsert_pp_cdp)
app.put('/tools/pp_cdp_semanal/:timestart',auth.isWriter,get_pp_cdp_semanal)
app.post('/tools/pp_cdp_semanal/:timestart',auth.isWriter,get_pp_cdp_semanal)
app.post('/tools/pp_cdp_batch/:timestart/:timeend',auth.isWriter,get_pp_cdp_batch)
app.post('/tools/pp_cdp_batch/:timestart',auth.isWriter,get_pp_cdp_batch)
app.post('/tools/pp_cdp_batch',auth.isWriter,get_pp_cdp_batch)
app.get('/tools/pp_cdp_product',auth.isAuthenticated,get_pp_cdp_product)
app.get('/pp_cdp_view',auth.isAuthenticatedView,(req,res)=> {
	var params = {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	res.render('pp_cdp_view',params)
})
app.post('/obs/:tipo/series/:series_id/thin',auth.isAdmin,thinObs)
app.post('/obs/:tipo/thin',auth.isAdmin,thinObs)
// file indexer
app.get('/file_index',auth.isPublic,getGridded)
app.put('/file_index',auth.isAdmin,runGridded)
app.get('/file_index/colecciones',auth.isPublic,getColeccionesRaster)
app.get('/file_index/colecciones/:id',auth.isPublic,getColeccionesRaster)
app.get('/file_index/colecciones/:col_id/productos',auth.isPublic,getGridded)
app.put('/file_index/colecciones/:col_id/productos',auth.isAdmin,runGridded)

// LOGIN
app.get('/login',(req,res)=>{
	//~ console.log(req)
	var params = (req.query) ? req.query : {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	if(config.verbose) {
		console.log({params:params})
	}
	res.render("login",params)
})
app.post('/login',passport.authenticate('local'),(req,res)=>{
	if(config.verbose) {
		if(config.verbose) {
			console.log("inside login post")
			console.log("login: " + JSON.stringify(req.user))
		}
	}
	if(req.headers['content-type'] == "application/x-www-form-urlencoded" || req.headers['content-type'] == "multipart/form-data") {
		var path = (req.query) ? (req.query.path) ? req.query.path : "secciones"  : "secciones"
		if(config.verbose) {
			console.log("redirecting to " + path)
		}
		var query = {}
		Object.keys(req.query).forEach(key=> {
			if(key != "path" && key != "redirected" && key != "unauthorized" && key != "loggedout") {
				query[key] = req.query[key]
			}
		})
		var query_string = querystring.stringify(query) // (req.body.class) ? "?class="+req.body.class : ""
		var redirect_url = path
		redirect_url += (query_string != "") ? ("?" + query_string) : ""
		res.redirect(redirect_url)
	} else {
		res.send({message:"Auth success"})
	}
})
app.get('/logout', function(req, res){
    req.logout();
    var path = (req.query) ? (req.query.path) ? req.query.path : "secciones"  : "secciones"
	var query = {}
	Object.keys(req.query).forEach(key=> {
		if(key != "path" && key != "redirected" && key != "unauthorized" && key != "loggedout") {
			query[key] = req.query[key]
		}
	})
	var query_string = querystring.stringify(query) // (req.body.class) ? "?class="+req.body.class : ""
	var redirect_url = 'login?loggedout=true&path=' + path
	redirect_url += (query_string != "") ? ("&" + query_string) : ""
    res.redirect(redirect_url)
});
app.post('logout', function(req, res){
  req.logout();
  res.send({message:"logout correct"});
});
app.get('/users',auth.isWriter,(req,res)=>{
	pool.query("SELECT id,name,role from users order by id")
	.then(result=>{
		res.send(result.rows)
	})
	.catch(e=>{
		if(config.verbose) {
			console.error(e)
		} else {
			console.error(e.toString())
		}
		res.status(400).send(e.toString())
	})
}) 
app.put('/users/:username',auth.isAdmin,(req,res)=>{    // ?password=&role=reader
	var password = (req.query && req.query.password) ? req.query.password : (req.body && req.body.password) ? req.body.password : undefined
	var role = (req.query && req.query.role) ? req.query.role : (req.body && req.body.role) ? req.body.role : undefined
	var token = (req.query && req.query.token) ? req.query.token : (req.body && req.body.token) ? req.body.token : undefined
	pool.query("SELECT name,encode(pass_enc,'escape') pass_enc_esc from users where name=$1",[req.params.username])
	.then(result=>{
		if(result.rows.length==0) {
			if(!password || !role || !token) {
				throw "Falta password o role o token"
			}
			return pool.query("INSERT INTO users (name,pass_enc,role,token) VALUES ($1,$2,coalesce($3,'reader'),$4) RETURNING name,pass_enc,role,token",[req.params.username, crypto.createHash('sha256').update(password).digest('hex'), role,crypto.createHash('sha256').update(token).digest('hex')])
		} else {
			return pool.query("UPDATE users set pass_enc=coalesce($1,pass_enc), role=coalesce($2,role), token=coalesce($4,token) where name=$3 RETURNING name,pass_enc,role,token",[(password) ? crypto.createHash('sha256').update(req.query.password).digest('hex') : undefined, role, req.params.username, (token) ? crypto.createHash('sha256').update(req.query.token).digest('hex') : undefined])
		}
	})
	.then(result=>{
		res.send(result.rows)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
}) 
app.get('/users/:username',auth.isAuthenticated, (req,res)=>{  // passport.authenticate('local'),
	if(! req.params) {
		res.status(400).send("missing params")
		return
	}
	if(req.user.role!="admin" && req.params.username!=req.user.username) {
		res.status(408).send("Unauthorized")
		return
	}
	pool.query("SELECT id,name,role from users where name=$1",[req.params.username])
	.then(result=>{
		//~ var digest = crypto.createHash('sha256').update(result.rows[0].password).digest('hex')
		//~ console.log({digest:digest, pass_enc_hex:result.rows[0].pass_enc_esc})
		//~ if( digest == result.rows[0].pass_enc_esc) {
			//~ console.log("yes my friend")
		//~ } else {
			//~ console.log("no no no")
		//~ }
		res.send(result.rows)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
})

app.get('/user',auth.isAuthenticated, (req,res)=>{ 
	if(!req.query) {
		res.status(400).send("missing username")
		return
	}
	var username
	if(!req.query.username) {
		console.log("missing username, setting to current user")
		username = req.user.username
	} else {
		username = req.query.username
	}
	if(req.params.username!=req.query.username) {
		if(req.user.role!="admin") {
			res.status(408).send("Must be admin to enter this user's config")
			return
		}
		console.log("admin entering " + username + " config")
		return
	} else {
		console.log("user " + username + " entering config")
	} 
	pool.query("SELECT id,name username,role from users where name=$1",[username])
	.then(result=>{
		if(result.rows.length==0) {
			res.status(404).send("user not found")
			return
		}
		res.render('user',result.rows[0])
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
})

app.post('/userChangePassword',auth.isAuthenticated, (req,res)=>{ 
	//~ new formidable.IncomingForm().parse(req, (err, fields) => {
		//~ console.log({fields:fields,files:files})
		//~ if (err) {
		  //~ console.error('Error', err)
		  //~ res.status(500).send({message:"parse error",error:err.toString()})
		  //~ return
		//~ } else {
		//~ console.log(req)
			if(!req.body) {
				res.status(400).send("missing parameters")
				return
			}
			if(!req.body.username) {
				res.status(400).send("username missing")
				return
			}
			if(req.user.role!="admin" && req.body.username!=req.user.username) {
				res.status(408).send("Unauthorized")
				return
			}
			if(!req.body.newpassword) {
				res.status(400).send("New password missing")
				return
			}
			//~ console.log({newpassword:req.body.newpassword})
			pool.query("UPDATE users set pass_enc=$1 where name=$2 RETURNING name,pass_enc,role",[crypto.createHash('sha256').update(req.body.newpassword).digest('hex'),req.body.username])
			.then(result=>{
				if(!result) {
					res.status(400).send("Input error")
					return
				}
				if(result.rows.length==0) {
					res.status(400).send("Nothing updated")
					return
				}
				//~ console.log({user:result.rows[0]})
				res.send("Password actualizado")
			})
			.catch(e=>{
				console.error(e)
				res.status(400).send(e.toString())
			})
		//~ }
	//~ })
})

// CRUD FUNCTION CALLERS //

function getRedes(req,res) {
	// Get redes from observations database 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	console.log("filter:" + JSON.stringify(filter))
	crud.getRedes(filter)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		res.status(500).send({message:"Server error",error:e.toString()})
		console.error(e)
	})
}

function getRed(req,res) {
	// Get red from observations database 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		if(filter.red_id) {
			filter.id = filter.red_id
		} else {
			filter.id = filter.fuentes_id
		}
	}
	console.log("filter:" + JSON.stringify(filter))
	crud.getRed(filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send("Red no encontrada")
			return
		}
		console.log("Results: red_id:" + result.id)
		send_output(options,result,res)
	})
	.catch(e=>{
		res.status(500).send({message:"Server error",error:e.toString()})
		console.error(e)
	})
}
  
function upsertRedes(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var fuentes
	if(!req.body.fuentes) {
		if(!req.body.redes) {
			res.status(400).send({message:"query error",error:"Falta atributo 'fuentes' o 'redes'"})
			return
		}
		req.body.fuentes = req.body.redes
		delete req.body.redes
	}
	if(typeof req.body.fuentes == "string") {
		fuentes = JSON.parse(req.body.fuentes.trim())
	} else {
		fuentes = req.body.fuentes
	}
	if(!Array.isArray(fuentes)) {
		res.status(400).send({message:"query error",error:"Atributo 'fuentes' debe ser un array'"})
		return
	}
	crud.upsertRedes(fuentes)
	.then(result=>{
		console.log("upserted " + result.length + " registros")
		send_output({},result,res)
	})
	.catch(e=>{
		res.status(500).send({message:"Server error",error:e.toString()})
		console.error(e)
	})
}

function upsertRed(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.fuente) {
		res.status(400).send({message:"query error",error:"Falta atributo 'fuente'"})
		return
	}
	var fuente
	if(typeof req.body.red == "string") {
		fuente = JSON.parse(req.body.fuente.trim())
	} else {
		fuente = req.body.fuente
	}
	
	//~ var observaciones = observaciones
	crud.upsertRed(new CRUD.red(fuente))
	.then(result=>{
		if(!result) {
			res.status(400).send("bad request")
			return
		}
		console.log("Upserted: 1 fuente")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}


function deleteRed(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.deleteRed(filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send("bad request")
			return
		}
		console.log("deleted: 1 fuente")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

// FUENTES (raster)

function getFuentes(req,res) {
	// Get fuentes from observations database 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.getFuentes(filter)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		res.status(500).send({message:"Server error",error:e.toString()})
		console.error(e)
	})
}
  
function upsertFuentes(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var fuentes
	if(!req.body.fuentes) {
		if(Array.isArray(req.body)) {
			fuentes = req.body
		} else {
			res.status(400).send({message:"query error",error:"Falta atributo 'fuentes' y el cuerpo del mensaje no es un array"})
			return
		}
	} else if (typeof req.body.fuentes == "string") {
		fuentes = JSON.parse(req.body.fuentes.trim())
	} else {
		fuentes = req.body.fuentes
	}
	if(!Array.isArray(fuentes)) {
		res.status(400).send({message:"query error",error:"Atributo 'fuentes' debe ser un array'"})
		return
	}
	crud.upsertFuentes(fuentes)
	.then(result=>{
		console.log("upserted " + result.length + " registros")
		res.status(201)
		send_output({},result,res)
	})
	.catch(e=>{
		res.status(500).send({message:"Server error",error:e.toString()})
		console.error(e)
	})
}

function getFuente(req,res) {
	// Get fuentes from observations database 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({"message":"missing id"})
		return
	}
	crud.getFuente(filter.id,filter.public)
	.then(result=>{
		if(!result) {
			res.status(404).send({message:"fuente not found"})
			return
		}
		console.log("Results: fuentes.id=" + result.id)
		send_output(options,result,res)
	})
	.catch(e=>{
		res.status(500).send({message:"Server error",error:e.toString()})
		console.error(e)
	})
}

function upsertFuente(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.fuente) {
		res.status(400).send({message:"query error",error:"Falta atributo 'fuente'"})
		return
	}
	var fuente
	if(typeof req.body.fuente == "string") {
		fuente = JSON.parse(req.body.fuente.trim())
	} else {
		fuente = req.body.fuente
	}
	
	//~ var observaciones = observaciones
	crud.upsertFuente(new CRUD.fuente(fuente))
	.then(result=>{
		if(!result) {
			res.status(400).send("bad request")
			return
		}
		console.log("Upserted: 1 fuente")
		res.status(201)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}


function deleteFuente(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.deleteFuente(filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send("bad request")
			return
		}
		console.log("deleted: 1 fuente")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}


// VARIABLES

function getVariables(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.getVars(filter)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}	

function getVariable(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"bad request: missing id"})
		return
	}
	crud.getVar(filter.id)
	.then(result=>{
		if(!result) {
			res.status(404).send({message:"variable not found"})
			return
		}
		console.log("Results: " + (result))
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}	

function upsertVariables(req,res) { 
	// post.body: { 
	//	username:str, 
	//	password:str, 
	//	observaciones: [{timestart: isodatetime, timeend: isodatetime, valor: real, tipo: "puntual"|"areal", series_id: int},...]
	//}
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.variables) {
		res.status(400).send({message:"query error",error:"Falta atributo 'variables'"})
		return
	}
	var variables
	if(typeof req.body.variables == "string") {
		variables = JSON.parse(req.body.variables.trim())
	} else {
		variables = req.body.variables
	}
	if(!Array.isArray(variables)) {
		res.status(400).send({message:"query error",error:"Atributo 'variables debe ser un array'"})
		return
	}
	//~ var observaciones = observaciones
	crud.upsertVars(variables.map(v => {
		var variable = new CRUD.var(v)
		return variable
	}))
	.then(result=>{
		console.log("Upserted: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function upsertVariable(req,res) { 
	// post.body: { 
	//	username:str, 
	//	password:str, 
	//	observaciones: [{timestart: isodatetime, timeend: isodatetime, valor: real, tipo: "puntual"|"areal", series_id: int},...]
	//}
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.variable) {
		res.status(400).send({message:"query error",error:"Falta atributo 'variable'"})
		return
	}
	var variable
	if(typeof req.body.variable == "string") {
		variable = JSON.parse(req.body.variable.trim())
	} else {
		variable = req.body.variable
	}
	
	//~ var observaciones = observaciones
	crud.upsertVar(new CRUD.var(variable))
	.then(result=>{
		if(!result) {
			res.status(400).send("bad request")
			return
		}
		console.log("Upserted: 1 var")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function deleteVariable(req,res) { 
	// post.body: { 
	//	username:str, 
	//	password:str, 
	//	observaciones: [{timestart: isodatetime, timeend: isodatetime, valor: real, tipo: "puntual"|"areal", series_id: int},...]
	//}
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.deleteVar(filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send("bad request")
			return
		}
		console.log("deleted: 1 var")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

// procedimientos

function getProcedimientos(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.getProcedimientos(filter)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}	

function getProcedimiento(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"bad request: missing id"})
		return
	}
	crud.getProcedimiento(filter.id)
	.then(result=>{
		if(!result) {
			res.status(404).send({message:"procedimiento not found"})
			return
		}
		console.log("Results: " + (result))
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}	

function upsertProcedimientos(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.procedimientos) {
		res.status(400).send({message:"query error",error:"Falta atributo 'procedimientos'"})
		return
	}
	var procedimientos
	if(typeof req.body.procedimientos == "string") {
		procedimientos = JSON.parse(req.body.procedimientos.trim())
	} else {
		procedimientos = req.body.procedimientos
	}
	if(!Array.isArray(procedimientos)) {
		res.status(400).send({message:"query error",error:"Atributo 'procedimientos debe ser un array'"})
		return
	}
	crud.upsertProcedimientos(procedimientos.map(v => {
		var procedimiento = new CRUD.procedimiento(v)
		return procedimiento
	}))
	.then(result=>{
		if(!result) {
			console.error("nothing upserted")
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function upsertProcedimiento(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.procedimiento) {
		res.status(400).send({message:"query error",error:"Falta atributo 'procedimiento'"})
		return
	}
	var procedimiento
	if(typeof req.body.procedimiento == "string") {
		procedimiento = JSON.parse(req.body.procedimiento.trim())
	} else {
		procedimiento = req.body.procedimiento
	}
	var proc = new CRUD.procedimiento(procedimiento)
	if(filter.id) {
		proc.id = filter.id
	}
	crud.upsertProcedimiento(proc)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: 1 procedimiento")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function deleteProcedimiento(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.deleteProcedimiento(filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("deleted: 1 procedimiento")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

// unidades

function getUnidades(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.getUnidades(filter)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}	

function getUnidad(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"bad request: missing id"})
		return
	}
	crud.getUnidad(filter.id)
	.then(result=>{
		if(!result) {
			res.status(404).send({message:"unidad not found"})
			return
		}
		console.log("Results: " + (result))
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}	

function upsertUnidades(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.unidades) {
		res.status(400).send({message:"query error",error:"Falta atributo 'unidades'"})
		return
	}
	var unidades
	if(typeof req.body.unidades == "string") {
		unidades = JSON.parse(req.body.unidades.trim())
	} else {
		unidades = req.body.unidades
	}
	if(!Array.isArray(unidades)) {
		res.status(400).send({message:"query error",error:"Atributo 'unidades debe ser un array'"})
		return
	}
	crud.upsertUnidadeses(unidades.map(v => {
		var unidades = new CRUD.unidades(v)
		return unidades
	}))
	.then(result=>{
		if(!result) {
			console.error("nothing upserted")
			res.status(400).send({message:"bad request"})
			return
		}
		if(result.length==0) {
			console.error("nothing upserted")
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: " + result.length)
		res.status(201)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function upsertUnidad(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var unidad
	if(!req.body.unidad) {
		if(!req.body.unidades) {
			res.status(400).send({message:"query error",error:"Falta atributo 'unidad'"})
			return
		} 
		if(typeof req.body.unidades == "string") {
			unidad = JSON.parse(req.body.unidades.trim())
		} else {
			unidad = req.body.unidades
		}
	} else {
		if(typeof req.body.unidad == "string") {
			unidad = JSON.parse(req.body.unidad.trim())
		} else {
			unidad = req.body.unidad
		}
	}
	if(filter.id) {
		unidad.id = filter.id
	}
	crud.upsertUnidades(new CRUD.unidades(unidad))
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: 1 unidades")
		res.status(201)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function deleteUnidades(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.deleteUnidades(filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("deleted: 1 unidades")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

//~ program
  //~ .command('insertEstaciones <input>')
  //~ .description('Crea estaciones a partir de archivo JSON')
  //~ .option('-C, --csv', 'output as CSV')
  //~ .option('-S, --string', 'output as one-line strings')
  //~ .option('-q, --quiet','no output')
  //~ .option('-o, --output <value>','output file')
  //~ .option('-P, --pretty','pretty-print JSON')
  //~ .action((input,options) => {
	//~ fs.readFile(input, (err, data) => {
		//~ if (err) throw err;
		//~ var estaciones = JSON.parse(data)
		//~ if(!Array.isArray(estaciones)) {
			//~ throw new Error("Archivo erróneo, debe ser JSON ARRAY")
		//~ }
		//~ crud.upsertEstaciones(estaciones)
		//~ .then(upserted=>{
			//~ console.log("Results: " + upserted.length)
			//~ print_output(options,upserted)
			//~ pool.end()
		//~ })
		//~ .catch(e=>{
			//~ console.error(e)
			//~ pool.end()
		//~ })
	//~ })
  //~ });

// estaciones

function getEstaciones(req,res) {
  //~ .command('getEstaciones')
  //~ .alias('e')
  //~ .description('Get estaciones from observations database')
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(filter) {
		if(filter.abreviatura) {
			filter.abrev = filter.abreviatura
		}
	}
	console.log({filter:filter})
	crud.getEstaciones(filter)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function getEstacion(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"bad request: missing id"})
		return
	}
	crud.getEstacion(filter.id,filter.public)
	.then(result=>{
		if(!result) {
			res.status(404).send({message:"estacion not found"})
			return
		}
		console.log("Results: " + (result))
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}	

function upsertEstaciones(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var estaciones
	if(!req.body.estaciones) {
		if(!Array.isArray(req.body)) {
			res.status(400).send({message:"query error",error:"Falta atributo 'estaciones' y el cuerpo del mensaje no es un array"})
			return
		}
		estaciones = req.body
	} else {
		if(typeof req.body.estaciones == "string") {
			estaciones = JSON.parse(req.body.estaciones.trim())
		} else {
			estaciones = req.body.estaciones
		}
	}
	if(!Array.isArray(estaciones)) {
		res.status(400).send({message:"query error",error:"Atributo 'estaciones' debe ser un array'"})
		return
	}
	crud.upsertEstaciones(estaciones) // .map(v => {
		//~ var estacion = new CRUD.estacion(v)
		//~ return estacion
	//~ }))
	.then(result=>{
		if(!result) {
			console.error("nothing upserted")
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function upsertEstacion(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.estacion) {
		res.status(400).send({message:"query error",error:"Falta atributo 'estacion'"})
		return
	}
	var estacion
	if(typeof req.body.estacion == "string") {
		estacion = JSON.parse(req.body.estacion.trim())
	} else {
		estacion = req.body.estacion
	}
	//~ if(filter.unid) {
		//~ estacion.unid = filter.unid
	//~ }
	crud.upsertEstacion(new CRUD.estacion(estacion))
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: 1 estacion")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function updateEstacion(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var estacion
	if(req.body && req.body.estacion) {
		if(typeof req.body.estacion == "string") {
			estacion = JSON.parse(req.body.estacion.trim())
		} else {
			estacion = req.body.estacion
		}
		if(filter.id) {
			estacion.id = filter.id
		} else if(filter.estacion_id) {
			estacion.id = filter.estacion_id
		}
	} else {
		var id
		if(filter.id) {
			id = filter.id
		} else if (filter.estacion_id) {
			id = filter.estacion_id
		} else {
			console.error("estacion_id missing")
			res.status(400).send({message:"falta estacion_id"})
			return
		}
		estacion = {...filter}
		estacion.id = id
	}
	console.log({estacion:estacion})
	crud.updateEstacion(new CRUD.estacion(estacion))
	.then(result=>{
		if(!result) {
			console.log("Updated: 0 estacion")
			res.status(400),send({message:"estación no encontrada"})
			return
		}
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({message:"Query error",error:e.toString()})
	})
}


function deleteEstacion(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.deleteEstacion(filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("deleted: 1 estacion")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function deleteEstaciones(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var countFilters = countValidFilters({nombre:"regex_string", unid:"numeric", id:"numeric", id_externo: "string", distrito: "regex_string", pais: "regex_string", has_obs: "boolean", real: "boolean", habilitar: "boolean", tipo: "string", has_prono: "boolean", rio: "regex_string", geom: "geometry", propietario: "regex_string", automatica: "boolean", ubicacion: "regex_string", localidad: "regex_string", tipo_2: "string",tabla: "string", abrev: "regex_string"},filter)
	if(countFilters == 0) {
		res.status(400).send({message:"query error",error:"Bad request. filters missing"})
		return
	}
	crud.deleteEstaciones(filter)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("deleted: " + result.length + " estaciones")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

// escenas

function getEscenas(req,res) {
  //~ .command('getEscenas')
  //~ .alias('e')
  //~ .description('Get escenas from observations database')
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.getEscenas(filter,options)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function getEscena(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"bad request: missing id"})
		return
	}
	crud.getEscena(filter.id,options)
	.then(result=>{
		if(!result) {
			res.status(404).send({message:"escena not found"})
			return
		}
		console.log("Results: " + (result))
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}	

function upsertEscenas(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.escenas) {
		var escenas
		if(Array.isArray(req.body)) {
			escenas = req.body
		} else {
			res.status(400).send({message:"query error",error:"Falta atributo 'escenas' y el cuerpo no es un array"})
			return
		}
	} else if(typeof req.body.escenas == "string") {
		escenas = JSON.parse(req.body.escenas.trim())
	} else {
		escenas = req.body.escenas
	}
	if(!Array.isArray(escenas)) {
		res.status(400).send({message:"query error",error:"Atributo 'escenas debe ser un array'"})
		return
	}
	crud.upsertEscenas(escenas.map(v => {
		var escena = new CRUD.escena(v)
		return escena
	}))
	.then(result=>{
		if(!result) {
			console.error("nothing upserted")
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function upsertEscena(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.escena) {
		res.status(400).send({message:"query error",error:"Falta atributo 'escena'"})
		return
	}
	var escena
	if(typeof req.body.escena == "string") {
		escena = JSON.parse(req.body.escena.trim())
	} else {
		escena = req.body.escena
	}
	crud.upsertEscena(new CRUD.escena(escena))
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: 1 escena")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function deleteEscena(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.deleteEscena(filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("deleted: 1 escena")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}
  
// AREAS

function getAreas(req,res) {
  //~ .command('getAreas')
  //~ .description('Get areas from observations database')
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.getAreas(filter,options)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function getArea(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"bad request: missing id"})
		return
	}
	crud.getArea(filter.id,options)
	.then(result=>{
		if(!result) {
			res.status(404).send({message:"area not found"})
			return
		}
		//~ console.log("Results: " + (result))
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}	

function upsertAreas(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var areas
	if(!req.body.areas) {
		if(!Array.isArray(req.body)) {
			res.status(400).send({message:"query error",error:"Falta atributo 'areas' y el cuerpo del mensaje no es un array"})
		return
		}
		areas = req.body
	} else {
		if(typeof req.body.areas == "string") {
			areas = JSON.parse(req.body.areas.trim())
		} else {
			areas = req.body.areas
		}
	}
	if(!Array.isArray(areas)) {
		res.status(400).send({message:"query error",error:"Atributo 'areas debe ser un array'"})
		return
	}
	crud.upsertAreas(areas.map(v => {
		var area = new CRUD.area(v)
		return area
	}))
	.then(result=>{
		if(!result) {
			console.error("nothing upserted")
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function upsertArea(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.area) {
		res.status(400).send({message:"query error",error:"Falta atributo 'area'"})
		return
	}
	var area
	if(typeof req.body.area == "string") {
		area = JSON.parse(req.body.area.trim())
	} else {
		area = req.body.area
	}
	if(filter.id) {
		area.id = filter.id
	}
	crud.upsertArea(new CRUD.area(area))
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: 1 area")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function deleteArea(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.deleteArea(filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("deleted: 1 area")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

// SERIES

function getSeries(req,res) {
  //~ .command('getSeries')
  //~ .description('Get series from observations database')
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var tipo = (filter.tipo) ? filter.tipo : "puntual"
	filter.tipo = undefined
	crud.getSeries(tipo,filter,options)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function getSerie(req,res) {
  //~ .command('getSeries')
  //~ .description('Get series from observations database')
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.tipo) {
		res.status(400).send({message:"query error",error:"Falta atributo 'tipo'"})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.getSerie(filter.tipo,filter.id,filter.timestart,filter.timeend,options,filter.public)
	.then(result=>{
		console.log("Results: series_id=" + result.id)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}


function upsertSeries(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var series
	if(!req.body.series) {
		if(!Array.isArray(req.body)) {
			res.status(400).send({message:"query error",error:"Falta atributo 'series' y el cuerpo del mensaje no es un array"})
			return
		}
		series = req.body
	} else {
		if(typeof req.body.series == "string") {
			series = JSON.parse(req.body.series.trim())
		} else {
			series = req.body.series
		}
	}
	if(!Array.isArray(series)) {
		res.status(400).send({message:"query error",error:"Atributo 'series debe ser un array'"})
		return
	}
	if(req.params.obsTipo) {
		if(req.params.obsTipo != "puntual" && req.params.obsTipo != "areal" && req.params.obsTipo != "raster") {
			console.error("bad obsTipo")
			res.status(400).send("obsTipo incorrecto")
			return
		}
		series = series.map(s=>{
			s.tipo = req.params.obsTipo
			return s
		})
	}
	//~ console.log({series:series})
	// if(options.series_metadata) { // upsert estacion,var,procedimiento,unidades,fuente
		
	// }
	crud.upsertSeries(series,options.series_metadata)
	.then(result=>{
		if(!result) {
			console.error("nothing upserted")
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function upsertSerie(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.serie) {
		res.status(400).send({message:"query error",error:"Falta atributo 'serie'"})
		return
	}
	var serie
	if(typeof req.body.serie == "string") {
		serie = JSON.parse(req.body.serie.trim())
	} else {
		serie = req.body.serie
	}
	if(filter.tipo) {
		serie.tipo = filter.tipo
	}
	if(filter.id) {
		serie.id = filter.id
	}
	crud.upsertSerie(new CRUD.serie(serie),options)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("Upserted: 1 serie")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function deleteSerie(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.tipo) {
		res.status(400).send({message:"query error",error:"Falta atributo 'tipo'"})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"query error",error:"Falta atributo 'id'"})
		return
	}
	crud.deleteSerie(filter.tipo,filter.id)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("deleted: 1 serie")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function deleteSeries(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.tipo) {
		res.status(400).send({message:"query error",error:"Falta atributo 'tipo'"})
		return
	}
	var valid_filters = {id:"integer",area_id:"integer",var_id:"integer",proc_id:"integer",unit_id:"integer",fuentes_id:"integer",estacion_id:"integer",escena_id:"integer"}
	var count_filters=countValidFilters(valid_filters,filter)
	if(count_filters == 0) {
		res.status(400).send({message:"bad request. filters missing"})
	}
	crud.deleteSeries(filter)
	.then(result=>{
		if(!result) {
			res.status(400).send({message:"bad request"})
			return
		}
		console.log("deleted: " + result.length + " series")
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

// OBSERVACIONES

function getObservaciones(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var tipo = (filter.tipo) ? filter.tipo : "puntual"
	filter.tipo = undefined
	if(!filter.timestart || !filter.timeend || !filter.series_id) {
		res.status(400).send({message:"query error",error:"Faltan parámetros: tipo, series_id, timestart, timeend"})
		return
	}
	crud.getObservacionesRTS(tipo,filter,options)
	.then(result=>{
		console.log("Results: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function getObservacion(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var tipo = (filter.tipo) ? filter.tipo : "puntual"
	filter.tipo = undefined
	var promise
	if(!filter.id) {
		if(!filter.series_id || !filter.timestart) {
			res.status(400).send({message:"query error",error:"Faltan parámetros: id o series_id+timestart"})
			return
		}
		if( new Date(filter.timestart).toString() == 'Invalid Date' || parseInt(filter.series_id).toString() == "NaN") { 
			console.error("invalid parameters")
			res.status(400).send({message:"query error",error:"invalid parameters"})
			return
		}
		filter.limit = 1
		promise = crud.getObservaciones(tipo,filter,options)
		.then(result=>{
			if(result) {
				result = result[0]
			}
			return result
		})
	} else {
		promise = crud.getObservacion(tipo,filter.id,filter)
	}
	promise.then(result=>{
		if(!result) {
			res.status(400).send({message:"observacion not found"})
			return
		}
		console.log("Results: observacion.id=" + result.id)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function getObservacionesTimestart(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var tipo = (filter.tipo) ? filter.tipo : "puntual"
	filter.tipo = undefined
	if(!filter.series_id && !filter.var_id && !filter.fuentes_id) {
		res.status(400).send({message:"query error",error:"Missing parameters: either var_id or series_id or fuentes_id must be specified"})
		return
	}
	crud.getObservacionesTimestart(tipo,filter,options)
	.then(result=>{
		console.log("Results: " + result.length)
		if(options.cume_dist) {
			var obs = []
			result.forEach(r=>{
				r.tipo="puntual"
				obs.push(crud.matchPercentil(r))
			})
			Promise.all(obs)
			.then(obs=>{
				send_output(options,obs,res)
			})
			.catch(e=>{
				console.error(e)
				res.status(400).send({error:e})
			})
		} else {
			send_output(options,result,res)
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({error:e})
	})
}


function getObservacionesDia(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var tipo = (filter.tipo) ? filter.tipo : "puntual"
	filter.tipo = undefined
	if(!filter.series_id && !filter.var_id && !filter.fuentes_id) {
		res.status(400).send({message:"query error",error:"Missing parameters: either var_id or series_id or fuentes_id must be specified"})
		return
	}
	//~ if(filter.series_id) {
		//~ if(/,/.test(filter.series_id)) {
			//~ filter.series_id = filter.series_id.split(",")
		//~ }
	//~ }
	//~ if(filter.var_id) {
		//~ if(/,/.test(filter.var_id)) {
			//~ filter.var_id = filter.var_id.split(",")
		//~ }
	//~ }
	//~ if(filter.proc_id) {
		//~ if(/,/.test(filter.proc_id)) {
			//~ filter.proc_id = filter.proc_id.split(",")
		//~ }
	//~ }
	//~ if(filter.estacion_id) {
		//~ if(/,/.test(filter.estacion_id)) {
			//~ filter.estacion_id = filter.estacion_id.split(",")
		//~ }
	//~ }
	//~ if(filter.area_id) {
		//~ if(/,/.test(filter.area_id)) {
			//~ filter.area_id = filter.area_id.split(",")
		//~ }
	//~ }
	//~ if(filter.fuentes_id) {
		//~ if(/,/.test(filter.fuentes_id)) {
			//~ filter.fuentes_id = filter.fuentes_id.split(",")
		//~ }
	//~ }
	crud.getObservacionesDia(tipo,filter,options)
	.then(result=>{
		console.log("Results: " + result.length)
		if(options.cume_dist) {
			var obs = []
			result.forEach(r=>{
				r.tipo="puntual"
				obs.push(crud.matchPercentil(r))
			})
			Promise.all(obs)
			.then(obs=>{
				send_output(options,obs,res)
			})
			.catch(e=>{
				console.error(e)
				res.status(400).send({error:e})
			})
		} else {
			send_output(options,result,res)
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({error:e})
	})
}


function deleteObservaciones(req,res) { 

	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var required = ["timestart","timeend","tipo","series_id"]
	if (!checkRequiredArgs(required,filter)) {
		res.status(400).send({message:"Error: Missing arguments",required_arguments:required,recieved_arguments:filter})
		return
	}
	crud.deleteObservaciones(filter.tipo,filter)
	.then(result=>{
		console.log("Deleted: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function deleteObservacion(req,res) {   // by id+tipo
	//~ console.log("deleteObservacion")
	//~ console.log(req.body)
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.tipo || ! filter.id) {
		res.status(400).send({message:"Error: Missing arguments",required_arguments:["tipo","id"],recieved_arguments:filter})
		return
	}
	crud.deleteObservacion(filter.tipo,filter.id)
	.then(obs=>{
		if(obs.id) {
			console.log("Deleted: id " + obs.id)
			send_output(options,obs,res)
		} else {
			console.log("Nothing deleted")
			send_output(options,{},res)
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e})
	})
}

function deleteObservacionesById(req,res) {
	//~ console.log(req.body)
	try {
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	//~ if (! req.body.observaciones) {
		//~ res.status(400).send({message:"Error: Missing observaciones"})
		//~ return
	//~ }
	crud.deleteObservacionesById(req.body.tipo, req.body.id)

	//~ var promises = req.body.observaciones.map(o=> crud.deleteObservacion(o.tipo,o.id))
	//~ Promise.all(promises)


	.then(obs=>{
		console.log("got crud response")
		send_output(options,obs,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
	
}


function upsertObservaciones(req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(config.verbose) {
		console.log("res.upsertObservaciones: filter:" + JSON.stringify(filter))
	}
	var observaciones
	if(!req.body.observaciones) {
		if(Array.isArray(req.body)) {
			observaciones = req.body
		} else {
			res.status(400).send({message:"query error",error:"Falta atributo 'observaciones' y el cuerpo no es un array"})
			return
		}
	} else if(typeof req.body.observaciones == "string") {
		observaciones = JSON.parse(req.body.observaciones.trim())
	} else {
		observaciones = req.body.observaciones
	}
	if(!Array.isArray(observaciones)) {
		res.status(400).send({message:"query error",error:"Atributo 'observaciones' debe ser un array"})
		return
	}
	if(options.skip_nulls && options.skip_nulls.toString().toLowerCase() == 'false') {  // SKIP NULLS BY DEFAULT, para admitir nulos, usar skip_nulls=false
		options.skip_nulls = false
	} else {
		options.skip_nulls = true
	}
	//~ var observaciones = observaciones
	crud.upsertObservaciones(observaciones.map(o => {
		var obs = new CRUD.observacion(o)
		return obs
	}),filter.tipo,filter.series_id,options)
	.then(result=>{
		console.log("Upserted: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function upsertObservacionesCSV(req,res) {
	try {
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body.series_id || req.body.tipo || req.body.csvfile) {
		res.status(400).send({message:"query error",error:"Faltan parámetros",required:["tipo","series_id","csvfile"],recieved:Object.keys(req.body)})
		return
	}
	var observaciones = csv2obs(req.body.tipo, req.body.series_id, req.body.csvfile)
	crud.upsertObservaciones(observaciones)
	.then(result=>{
		console.log("Upserted: " + result.length)
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function upsertObservacion(req,res) { 
	// post.body: { 
	//	username:str, 
	//	password:str, 
	//	observacion: {timestart: isodatetime, timeend: isodatetime, valor: real, tipo: "puntual"|"areal", series_id: int}
	//}
	try {
		var options = getOptions(req)
		var filter = getFilter(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var required = ["tipo","series_id","timestart","timeend","valor"]
	if(!checkRequiredArgs(required,filter)) {
		console.error("Missing arguments")
		res.status(400).send({message:"Missing arguments",required:required,got:filter})
		return
	}
	required.forEach(arg=>{   // map to first value if argument is duplicated
		if(Array.isArray(filter[arg])) {
			filter[arg] = filter[arg][0]
		}
	})
	var observacion = new CRUD.observacion(filter)
	if(!observacion.isValid()) {
		console.log("invalid observacion")
		res.status(400).send({message:"Invalid parameters"})
		return
	}
	crud.upsertObservacion(observacion)
	.then(obs=>{
		if(obs) {
			console.log("Upserted id: " + obs.id)
			send_output(options,obs,res)
		} else {
			res.status(400).send({message:"no se insertó observación"})
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({message:"Bad request",error:e.toString()})
	})
}

function updateObservacionById(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id || ! filter.tipo) {
		console.log("missing id or tipo")
		res.status(400).send({message:"Missing id or tipo"})
		return
	}
	if(req.body) {
		if(req.body.observacion) {
			Object.keys(req.body.observacion).forEach(key=>{
				filter[key] = req.body.observacion[key]
			})
		}
	}
	crud.updateObservacionById(filter)
	.then(updated=>{
		//~ console.log({updated:updated})
		if(!updated) {
			console.log("Nothing updated")
			res.status(400).send({message:"observacion.id not found"})
			return
		}
		console.log("Updated obs id: " + updated.id)
		send_output(options,updated,res)
	})
	.catch(e=>{
		console.error({error:e})
		res.status(400).send({message:"Query error",error:e.toString()})
	})
}

//~ program
  //~ .command('insertRastObs <input> <series_id> <timestart> <timeend>')
  //~ .description('Insert raster observation from gdal file')
  //~ .action( (input, series_id, timestart, timeend, options) => {
	//~ fs.readFile(input, 'hex', function(err, data) {
		//~ if (err) throw err;
		
		//~ crud.upsertObservacion(new CRUD.observacion({tipo: "rast", series_id:series_id, timestart: timestart, timeend: timeend, valor: data}))
		//~ .then(upserted=>{
			//~ console.log("upserted id " + upserted.id + ", timeupdate:" + upserted.timeupdate)
			//~ pool.end()
		//~ })
		//~ .catch(e=>{
			//~ console.error(e)
			//~ pool.end()
		//~ })
	//~ })
  //~ });

function getRastObs(req,res) {      // GENERA ARCHIVOS GTIFF Y DEVUELVE LISTADO JSON CON LOS LINKS
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.series_id || !filter.timestart || !filter.timeend) {
		res.status(400).send({message:"query error",error:"Faltan parámetros:series_id, timestart, timeend"})
		return
	}
	// console.log({options:options})
	options.location = default_rast_location
	options.format=(options.format) ? options.format : "GTiff"
	crud.getSerie("rast",filter.series_id, filter.timestart, filter.timeend,options,filter.public)
	.then(serie=>{
		if(!serie) {
			console.error("No se encontró la serie")
			res.status(400).send({message:"query error",error:"No se encontró la serie"})
			return
		}
		if(!serie.observaciones) {
			console.error("No se encontraron observaciones")
			res.status(400).send({message:"query error",error:"No se encontraron observaciones"})
			return
		}
		console.log("Got observaciones: " + serie.observaciones.length + " records.")
		return printRast.print_rast_series(serie,options)
		var promises=[]
		for (var i = 0; i < serie.observaciones.length ; i++) {
			const obs = serie.observaciones[i]
			promises.push(print_rast(options,serie,obs))
		}
		return Promise.all(promises)
	})
	.then(result=>{
		console.log("Results: " + result.length)
		result = result.map(r=>{
			r.url = r.filename.replace(/^.*public/,req.protocol + "://" + req.get('host'))
			return r
		})
		options.format = "json"
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function rastExtract(req,res) {  // GENERA RASTER DE AGREGACIÓN TEMPORAL Y ENVIA JSON CON LISTADO DE URLS Y METADATOS //
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	options.location = default_rast_location
	if(!filter.series_id || !filter.timestart || !filter.timeend) {
		res.status(400).send({message:"query error",error:"Faltan parámetros: series_id, timestart, timeend"})
		return
	}
	crud.rastExtract(filter.series_id,filter.timestart,filter.timeend,options,filter.public)
	.then(serie=>{
		if(!serie) {
			console.error("No se encontró la serie")
			res.status(404).send({message:"not found",error:"No se encontró la serie"})
			return
		}
		if(!serie.observaciones) {
			console.error("No se encontraron observaciones")
			res.status(404).send({message:"not found",error:"No se encontraron observaciones"})
			return
		}
		console.log("Got observaciones: " + serie.observaciones.length + " records.")
		//~ console.log(serie.observaciones)
		var promises=[]
		options.prefix = (options.funcion) ? options.funcion : "sum"
		for (var i = 0; i < serie.observaciones.length ; i++) {
			const obs = serie.observaciones[i]
			promises.push(print_rast(options,serie,obs))
		}
		return Promise.all(promises)
		.then(result=>{
			if(!result) {
				console.log({message:"Nothing found"})
				res.status(404).send({message:"Nothing found"})
				return
			} 
			console.log("Results: " + result.length)
			if(options.get_raster) {
				if(result.length > 0) {
					var tarfile = result[0].filename + ".tgz"
					console.log("creando " + tarfile)
					return tar.c(
						{
							gzip: true,
							file: tarfile,
							cwd: "public/rast"
						},
						result.map(r=> r.filename.replace(/^.*\//,""))
					).then(_ => {
						console.log("tarball creado")
						console.log("sending file " + tarfile)
						res.setHeader('content-type','application/gzip')
						res.download(path.resolve(tarfile),tarfile.replace(/^.*\//,"")) //.replace(/^public\//,"")) // result[0].filename.replace(/^public/,req.protocol + "://" + req.get('host')))
						return
					})
				} else {
					res.status(400).send({message:"query error",error:"nothing found"})
				}
				return
			}
			result = result.map(r=>{
				r.url = r.filename.replace(/^public/,req.protocol + "://" + req.get('host'))
				//~ r.funcion = options.funcion
				return r
			})
			send_output(options,result,res)
			return
		})
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send({message:"Server error",error:e.toString()})
	})
}

function rastExtractByArea(req,res) {
	//~ (series_id,timestart,timeend,area_id|area_geom,options)
  //~ .description('Get serie temporal agregada espacialmente de Observaciones by series_id, timestart, timeend y area (id or box)')
	// options : agg_func no_insert format no_send_data
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var area = (filter.area_id) ? filter.area_id : (filter.area_geom) ? new CRUD.geometry("box",filter.area_geom) : undefined
	//~ if(!area) {
		//~ console.error("missing area_id=int or area_geom=st_geometryfromtext o ")
		//~ res.status(400).send("missing area_id=int or area_geom=st_geometryfromtext o area_id=all")
		//~ return
	//~ }
	if(area && area.type && area.type == "Point") {
		console.log("extract by point:" + area.toString())
		return crud.rastExtractByPoint(filter.series_id,filter.timestart,filter.timeend,area,options)
		.then(result=>{
			if(!result) {
				console.error("No se encontró la serie")
				res.status(404).send("No se encontró la serie")
				return
			}
			if(!result.observaciones) {
				console.error("No se encontraron observaciones")
				res.status(404).send("No se encontraron observaciones")
				return
			} 
			console.log("Got observaciones: " + result.observaciones.length + " records.")
			if(options.series_metadata) {
				res.send(result)
			} else {
				send_output(options,result.observaciones,res)
			}
		})
		.catch(e=>{
			console.error(e)
			res.status(400).send(e.toString())
		})
	}

	if(options.no_insert) {
		if(!area) {   // area="all"
			crud.rast2areal(filter.series_id,filter.timestart,filter.timeend,"all",options) 
			.then(observaciones=>{
				console.log("Got observaciones: " + observaciones.length + " records.")
				send_output(options,observaciones,res)
			})
			.catch(e=>{
				console.error(e)
				res.status(400).send(e.toString())
			})
			//~ console.error("Falta area_id o area_geom")
			//~ res.status(404).send("Falta area_id o area_geom")
		} else {
			crud.rastExtractByArea(filter.series_id,filter.timestart,filter.timeend,area,options) 
			.then(result=>{
				if(!result) {
					console.error("No se encontró la serie")
					res.status(404).send("No se encontró la serie")
					return
				}
				if(!result.observaciones) {
					console.error("No se encontraron observaciones")
					res.status(404).send("No se encontraron observaciones")
					return
				} 
				console.log("Got observaciones: " + result.observaciones.length + " records.")
				if(options.series_metadata) {
					res.send(result)
				} else {
					send_output(options,result.observaciones,res)
				}
			})
			.catch(e=>{
				console.error(e)
				res.status(400).send(e.toString())
			})
		}
	} else {
		// actualiza series_areales correspondientes
		if(!area) {
			area="all"
		}
		crud.rast2areal(filter.series_id,filter.timestart,filter.timeend,area,options) 
		.then(observaciones=>{
			if(observaciones) {
				console.log("Got observaciones: " + observaciones.length + " records.")
				send_output(options,observaciones,res)
			} else {
				res.status(400).send("No se encontraron observaciones")
			}
		})
		.catch(e=>{
			console.error(e)
			res.status(400).send(e.toString())
		})
	}
}

function getRegularSeries (req,res) {
	// <tipo> <series_id> <dt> <timestart> <timeend>')
  //~ .description('Get serie temporal regular de Observaciones by tipo, series_id, dt, timestart, timeend')
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	crud.getRegularSeries(filter.tipo,filter.series_id,options.dt,filter.timestart,filter.timeend,{t_offset:filter.t_offset, aggFunction:filter.agg_func,inst:filter.inst,timeSupport:filter.time_support,precision:filter.precision}) // options: t_offset,aggFunction,inst,timeSupport,precision
	.then(result=>{
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
}
  //~ });

function getMultipleRegularSeries (req,res) {
	// <tipo> <series_id> <dt> <timestart> <timeend>')
  //~ .description('Get 2d array de series temporales regulares de Observaciones, tipo, series_id (multiple), dt, timestart, timeend')
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	if(!filter.series_id) {
		res.status(400).send({message:"falta series_id"})
		return
	} 
	if(!Array.isArray(filter.series_id)) {
		filter.series_id = [filter.series_id]
	}
	var series = filter.series_id.map(s=>{
		return { tipo: filter.tipo, id: s}
	})
	crud.getMultipleRegularSeries(series,filter.dt,filter.timestart,filter.timeend,{t_offset:filter.t_offset, aggFunction:filter.agg_func,inst:filter.inst,timeSupport:filter.time_support,precision:filter.precision}) // options: t_offset,aggFunction,inst,timeSupport,precision
	.then(result=>{
		if(options.csv) {
			var csv = result.map(r=>{
				return r.join(",")
			}).join("\n")
			res.send(csv)
		} else {
			res.send(result)
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getCampo (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	if(!filter.var_id) {
		res.status(400).send({message:"falta var_id"})
		return
	} 
	if(!filter.timestart) {
		res.status(400).send({message:"falta timestart"})
		return
	} 
	if(!filter.timeend) {
		res.status(400).send({message:"falta timeend"})
		return
	} 
	console.log({filter:filter,options:options})
	crud.getCampo(filter.var_id,filter.timestart,filter.timeend,filter,options)
	.then(result=>{
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getCampoSerie (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	if(!filter.var_id) {
		res.status(400).send({message:"falta var_id"})
		return
	} 
	if(!filter.timestart) {
		res.status(400).send({message:"falta timestart"})
		return
	} 
	if(!filter.timeend) {
		res.status(400).send({message:"falta timeend"})
		return
	} 
	console.log({filter:filter,options:options})
	crud.getCampoSerie(filter.var_id,filter.timestart,filter.timeend,filter,options)
	.then(result=>{
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

// ASOCIACIONES

function getAsociaciones(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	crud.getAsociaciones(filter,options)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(404).send(e.toString())
	})
}



function upsertAsociaciones(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	if(!req.body) {
		res.status(400).send({message:"missing request body"})
		return
	}
	if(!req.body.asociaciones) {
		res.status(400).send({message:"missing object asociaciones in request body"})
		return
	}
	crud.upsertAsociaciones(req.body.asociaciones,options)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(404).send(e.toString())
	})
}

function runAsociaciones(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	//~ console.log({options:options})
	crud.runAsociaciones(filter,options)
	.then(result=>{
		send_output(options,result,res)
	})
	.catch(e=>{
		if(config.verbose) {
			console.error(e)
		} else {
			console.error(e.toString())
		}
		res.status(404).send(e.toString())
	})
}

function getAsociacion(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	if(!filter.id) {
		res.status(400).send({message:"missing id"})
		return
	}
	crud.getAsociacion(filter.id)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(404).send(e.toString())
	})
}

function upsertAsociacion(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	if(!req.body) {
		res.status(400).send({message:"missing request body"})
		return
	}
	if(!req.body.asociacion) {
		res.status(400).send({message:"missing property asociacion on request body"})
		return
	}
	crud.upsertAsociacion(req.body.asociacion)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(404).send(e.toString())
	})
}

function runAsociacion(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	if(!filter.id) {
		res.status(400).send({message:"missing id"})
		return
	}
	crud.runAsociacion(filter.id,filter,options)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
}

function deleteAsociacion(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	} 
	if(!filter.id) {
		res.status(400).send({message:"missing id"})
		return
	}
	crud.deleteAsociacion(filter.id)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(404).send(e.toString())
	})
}

// SECCIONES view backend

function getSeriesBySiteAndVar(req,res) {  //	estacion_id,var_id,timestart,timeend,includeProno=true)
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.estacion_id) {
		res.status(400).send({message:"estacion_id missing",error:"estacion_id missing"})
		return
	}
	if(!filter.var_id) {
		res.status(400).send({message:"var_id missing",error:"var_id missing"})
		return
	}
	var timestart
	var timeend
	if(!filter.timestart) {
		timestart = new Date()
		timestart.setDate(timestart.getDate() - 720)
	} else {
		timestart = new Date(filter.timestart)
	}
	if(!filter.timeend) {
		timeend = new Date()
		timeend.setDate(timeend.getDate() +14)
	} else {
		timeend = new Date(filter.timeend)
	}
	var includeProno = (typeof options.includeProno == "undefined") ? true : options.includeProno
	//~ console.log({estacion_id: filter.estacion_id, var_id: filter.var_id, timestart: timestart, timeend: timeend, includeProno: includeProno})
	crud.getSeriesBySiteAndVar(filter.estacion_id, filter.var_id, timestart, timeend, includeProno, undefined, undefined, filter.proc_id,filter.public,filter.forecast_date)
	.then(result=>{
		if(!result) {
			res.status(400).send({error:"serie no encontrada",message:"serie no encontrada"})
		} else {
			crud.getDailyDoyStats("puntual",result.id)
			.then(dailystatslist=>{
				// console.log("got dailyDoyStats at:" + Date())
				result.dailyDoyStats = dailystatslist.values
				res.send(result)
			})
			.catch(e=>{
				res.send(result)
			})
		}
	})
	.catch(e=>{
		res.status(400).send(e)
	})
}

function getMonitoredPoints (req,res) { // geojson=false
	var geojson = false
	if(req.body) {
		if(req.body.geojson) {
			geojson = true
		}
	}
	if(req.query) {
		if(req.query.geojson) {
			geojson = true
		}
	}
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		if(config.verbose) {
			console.error(e)
		} else {
			console.error(e.toString())
		}
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var promise
	if(geojson) {
		promise = crud.getMonitoredPoints("GeoJSON",filter)
	} else {
		promise = crud.getMonitoredPoints(null,filter)
	}
	promise.then(points=>{
		res.send(points)
	})
	.catch(e=>{
		if(config.verbose) {
			console.error(e)
		} else {
			console.error(e.toString())
		}
		res.status(400).send(e.toString())
	})
}

function getMonitoredAreas (req,res) { // geojson=false
	var geojson = false
	if(req.body) {
		if(req.body.geojson) {
			geojson = true
		}
	}
	if(req.query) {
		if(req.query.geojson) {
			geojson = true
		}
	}
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.var_id) {
		console.error("Missing var_id")
		res.status(400).send("Missing var_id")
		return
	}
	if(!filter.fuentes_id) {
		console.error("Missing fuentes_id")
		res.status(400).send("Missing fuentes_id")
		return
	}
	
	var format = (geojson) ? "geojson" : undefined
	crud.getMonitoredAreas(format,filter.var_id,filter.fuentes_id)
	.then(areas=>{
		res.send(areas)
	})
	.catch(e=>{
		res.status(400).send(e)
	})
}


function getMonitoredVars (req,res) { 
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.tipo) {
		filter.tipo = "puntual"
	}
	crud.getMonitoredVars(filter.tipo)
	.then(vars=>{
		res.send(vars)
	})
	.catch(e=>{
		res.status(400).send(e)
	})
}

function getMonitoredFuentes (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.tipo) {
		filter.tipo = "puntual"
	}
	if(!filter.var_id) {
		console.error("Missing var_id")
		res.status(400).send("missing var_id")
		return
	}
	crud.getMonitoredFuentes(filter.tipo,filter.var_id,filter.public)
	.then(fuentes=>{
		res.send(fuentes)
	})
	.catch(e=>{
		res.status(400).send(e)
	})
}

// VIEWS

function seccionesView(req,res) {
	if(!req.query.seriesId) {
		crud.getMonitoredPoints("GeoJSON")
		.then(points=>{
			//~ console.log(points)
			var options = points.features.map(p=>{
				return {series_id:p.properties.series_id, name: p.properties.estacion_id + ": " + ((p.properties.rio) ? p.properties.rio + "@" : "") + ((p.properties.nombre) ? p.properties.nombre.substring(0,30) : p.properties.estacion_id) + " (" + p.properties.var_name + ") [" + p.properties.series_id + "]",selected:false}				
			})
			//~ var options = points.map(p=>{
				//~ return {series_id:p.series_id, name: p.estacion_id + ": " + ((p.rio) ? p.rio + "@" : "") + ((p.nombre) ? p.nombre.substring(0,18) : p.estacion_id) + " (" + p.var_name + ") [" + p.series_id + "]",selected:false}
			//~ })
			res.render('secciones_bs',{secciones:options, points:JSON.stringify(points)})
		})
		.catch(e=>{
			console.error(e)
			res.status(500).send("server error")
		})
	} else {
		crud.getMonitoredPoints("GeoJSON")
		.then(points=>{
			//~ console.log(points)
			var flag=false
			var matched_point
			var options = points.features.map(p=>{
				var selected=false
				if(p.properties.series_id == req.query.seriesId) {
					console.log(p.properties)
					flag=true
					selected=true
					matched_point=p
				} 
				return {series_id:p.properties.series_id, name: p.properties.estacion_id + ": " + ((p.properties.rio) ? p.properties.rio + "@" : "") + ((p.properties.nombre) ? p.properties.nombre.substring(0,30) : p.properties.estacion_id) + " (" + p.properties.var_name + ") [" + p.properties.series_id + "]",selected:selected}				
			})
			if(!flag) {
				res.status(400).send("seriesId not found")
				return
			}
			var timestart, timeend
			if(!req.query.timestart) {
				timestart = new Date()
				timestart.setDate(timestart.getDate() - 90)
			} else {
				timestart = new Date(req.query.timestart)
				console.log("timestart from querystring")
			}
			if(!req.query.timeend) {
				timeend = new Date()
				timeend.setDate(timeend.getDate() +15)
			} else {
				timeend = new Date(req.query.timeend)
				console.log("timeend from querystring")
			}
			console.log({estacion_id:matched_point.properties.estacion_id, var_id: matched_point.properties.var_id, ts:timestart, ts:timeend})
			crud.getSeriesBySiteAndVar(matched_point.properties.estacion_id, matched_point.properties.var_id, timestart, timeend, true) // , true, "1 days")
			.then(series=>{
				var obs_stats
				if(series.observaciones.length > 0) {
					var o_timestart = series.observaciones[0][0]
					var o_timeend = series.observaciones[0][1]
					var minval = series.observaciones[0][2]
					var maxval = series.observaciones[0][2]
					var sum=0
					series.observaciones.map(o=> {
						o_timestart = (o[0] < o_timestart) ? o[0] : o_timestart
						o_timeend = (o[1] > o_timeend) ? o[1] : o_timeend
						minval = (o[2] < minval) ? o[2] : minval
						maxval = (o[2] > maxval) ? o[2] : maxval
						sum = sum + o[2]
					})
					obs_stats = {timestart: o_timestart, timeend: o_timeend, count: series.observaciones.length, min: minval, max: maxval, avg: sum/series.observaciones.length}
				}
				var prono_resumen = []
				var index = 0
				if(series.pronosticos) {
					for(var i=0;i<series.pronosticos.length;i++) {
						if(series.pronosticos[i].corrida) {
							prono_resumen[index] = {
								cal_id: series.pronosticos[i].id,
								nombre: series.pronosticos[i].nombre,
								modelo: series.pronosticos[i].modelo,
								activar: series.pronosticos[i].activar,
								selected: series.pronosticos[i].selected,
								cor_id: series.pronosticos[i].corrida.id,
								forecast_date: series.pronosticos[i].corrida.date,
								count: series.pronosticos[i].corrida.series.length,
								fecha_fin: series.pronosticos[i].corrida.series[series.pronosticos[i].corrida.series.length-1][0]
							}
							i++
						}
					}
				}
				var general = {id:series.id, tipo: series.tipo, estacion: series.estacion, variable: series["var"], procedimiento: series.procedimiento, unidades: series.unidades, obs_stats: obs_stats, prono_resumen: prono_resumen}
				// mapa
				var geom = {
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
				// render
				//~ console.log("rendering secciones at " + Date())
				res.render('secciones_bs',{points:JSON.stringify(points), secciones:options, dates:{timestart:timestart.toISOString(), timeend:timeend.toISOString()}, general: general, geom: JSON.stringify(geom), data: JSON.stringify(series)})
			})
			.catch(e=>{
				console.error(e)
				res.status(500).send("server error")
			})
		})
		.catch(e=>{
			console.error(e)
			res.status(500).send("server error")
		})
		
		
	}
}


// funciones estadisticas

function getObsDiarios(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	const required = ["timestart","timeend","series_id"]
	var checkreq = checkRequiredArgs(required,filter)
	if(!checkreq) {
		console.error("Missing arguments")
		res.status(400).send({message:"Missing arguments",required:required,provided:filter})
		return
	}
	crud.getObsDiarios(filter.series_id,filter.timestart,filter.timeend,filter.public)
	.then(obs=>{
		res.send(obs)
	})
	.catch(e=>{
		res.status(400).send("Query error")
	})
}

function updateObsDiarios(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.updateObsDiarios(filter.timestart,filter.timeend)
	.then(refresh=>{
		res.send(refresh)
	})
	.catch(e=>{
		res.status(400).send("Query error")
	})
}

function getCuantilesDiarios(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	const required = ["series_id"]
	var checkreq = checkRequiredArgs(required,filter)
	if(!checkreq) {
		console.error("Missing arguments")
		res.status(400).send({message:"Missing arguments",required:required,provided:filter})
		return
	}
	crud.getCuantilesDiarios(filter.series_id,filter.timestart,filter.timeend)
	.then(cuantiles=>{
		send_output(options,cuantiles,res)
	})
	.catch(e=>{
		res.status(400).send("Query error")
	})
}

function updateCuantilesDiarios(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.updateCuantilesDiarios(filter.timestart,filter.timeend)
	.then(count=>{
		res.send(count)
	})
	.catch(e=>{
		res.status(400).send("Query error")
	})
}

function getCuantilesDiariosSuavizados(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.getCuantilesDiariosSuavizados(filter.tipo,filter.series_id,filter.timestart,filter.timeend,filter.range,filter.t_offset,filter.precision)
	.then(result=>{
		if(filter.format == "csv") {
			res.setHeader('content-type','text/plain')
			res.send(result.toCSV())
		} else {
			res.send(result)
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getCuantilDiarioSuavizado(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.cuantil) {
		console.error("Missing cuantil (0-1 or 'all')")
		res.status(400).send({message:"Missing cuantil (0-1 or 'all')"})
		return
	}
	if(filter.cuantil.toLowerCase() == 'all') {
		crud.calcPercentilesDiarios(filter.tipo,filter.series_id,filter.timestart,filter.timeend,filter.range,filter.t_offset,filter.precision,filter.public)
		.then(result=>{
			if(filter.format == "csv") {
				res.setHeader('content-type','text/plain')
				res.send(result.map(r=>r.toCSV()).join("\n")) // "#doy,percentile,value\n"+result.map(i=>i.doy+","+i.percentil+","+i.valor).join("\n"))
				//~ res.send("#doy,quantile,value\n"+result.map(i=>i.doy+","+i.cuantil+","+i.valor).join("\n"))
			} else if (filter.format == "csvless") {
				res.setHeader('content-type','text/plain')
				res.send(result.map(r=>r.toCSVless()).join("\n")) 
			} else {
				res.send(result)
			}
		})
		.catch(e=>{
			console.error(e)
			res.status(400).send(e)
		})
	} else {
		crud.getCuantilDiarioSuavizado(filter.tipo,filter.series_id,filter.cuantil,filter.timestart,filter.timeend,filter.range,filter.t_offset,filter.precision,filter.public)
		.then(result=>{
			if(filter.format == "csv") {
				res.setHeader('content-type','text/plain')
				res.send(result.map(i=>i.doy+","+i.valor).join("\n"))
			} else {
				res.send(result)
			}
		})
		.catch(e=>{
			console.error(e)
			res.status(400).send(e)
		})
	}
}

function upsertPercentilesDiarios(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.series_id) {
		console.error("Missing series_id")
		res.status(400).send({message:"Missing series_id"})
		return
	}
	//~ console.log(filter)
	var promise
	if(options.no_update) {
		promise = crud.getPercentilesDiarios(filter.tipo,filter.series_id)
		.then(result=>{
			if(result.length==0) {
				console.log("No percentiles found, running calcPercentilesDiarios")
				return 	crud.calcPercentilesDiarios(filter.tipo,filter.series_id,filter.timestart,filter.timeend,filter.range,filter.t_offset,filter.precision)
				.then(result=>{
					return crud.upsertPercentilesDiarios(filter.tipo,filter.series_id,result)
				})
			} else {
				console.log("Found "+result.length+" percentiles")
				return result
			}
		})
	} else {
		promise = crud.calcPercentilesDiarios(filter.tipo,filter.series_id,filter.timestart,filter.timeend,filter.range,filter.t_offset,filter.precision)
		.then(result=>{
			return crud.upsertPercentilesDiarios(filter.tipo,filter.series_id,result)
		})
	}
	promise
	.then(result=>{
		if(filter.format == "csv") {
			res.setHeader('content-type','text/plain')
			res.send(result.map(r=>r.toCSV()).join("\n")) // "#doy,percentile,value\n"+result.map(i=>i.doy+","+i.percentil+","+i.valor).join("\n"))
			//~ res.send("#doy,quantile,value\n"+result.map(i=>i.doy+","+i.cuantil+","+i.valor).join("\n"))
		} else if (filter.format == "csvless") {
			res.setHeader('content-type','text/plain')
			res.send(result.map(r=>r.toCSVless()).join("\n")) 
		} else {
			res.send(result)
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getPercentilesDiarios(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.doy && filter.date) {
		var date = new Date(filter.date)
		filter.doy = Math.round((date - new Date(date.getFullYear(),0,1)) /24/3600/1000 + 0.5)
	} 
	crud.getPercentilesDiarios(filter.tipo,filter.series_id,filter.percentil,filter.doy,filter.public)
	.then(result=>{
		if(filter.format == "csv") {
			res.setHeader('content-type','text/plain')
			res.send("# tipo,series_id,doy,percentil,valor,count,timestart,timeend,window_size\n" + result.map(r=>r.toCSV()).join("\n"))
		} else if (filter.format == "csvless") {
			res.setHeader('content-type','text/plain')
			res.send(result.map(r=>r.toCSVless()).join("\n")) 
		} else {
			res.send(result)
		}
	}).catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getPercentilesDiariosBetweenDates(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.getPercentilesDiariosBetweenDates(filter.tipo,filter.series_id,filter.percentil,filter.timestart,filter.timeend,filter.public)
	.then(result=>{
		//~ if(filter.format == "csv") {
			//~ res.setHeader('content-type','text/plain')
			//~ res.send("# tipo,series_id,doy,percentil,valor,count,timestart,timeend,window_size\n" + result.map(r=>r.toCSV()).join("\n"))
		//~ } else if (filter.format == "csvless") {
			//~ res.setHeader('content-type','text/plain')
			//~ res.send(result.map(r=>r.toCSVless()).join("\n")) 
		//~ } else {
			res.send(result)
		//~ }
	}).catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})	
}

function upsertCuantilesDiariosSuavizados(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var promise
	if(options.no_update) {
		promise = crud.getDailyDoyStats(filter.tipo,filter.series_id,filter.public)
		.then(result=>{
			// console.log({valueslength:result.values.length})
			if(result.values.length==0) {
				return crud.getCuantilesDiariosSuavizados(filter.tipo,filter.series_id,filter.timestart,filter.timeend,filter.range,filter.t_offset,filter.precision,filter.public)
				.then(dailyStats=>{
					//~ console.log(dailyStats)
					return crud.upsertDailyDoyStats(dailyStats)
				})
			} else {
				return result
			}
		})
	} else {
		promise = crud.getCuantilesDiariosSuavizados(filter.tipo,filter.series_id,filter.timestart,filter.timeend,filter.range,filter.t_offset,filter.precision)
		.then(dailyStats=>{
			//~ console.log(dailyStats)
			return crud.upsertDailyDoyStats(dailyStats)
		})
	}
	promise
	.then(result=>{
		if(filter.format == "csv") {
			res.setHeader('content-type','text/plain')
			res.send(result.toCSV())
		} else {
			res.send(result.values)
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getDailyDoyStats(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.getDailyDoyStats(filter.tipo,filter.series_id,filter.public)
	.then(result=>{
		if(filter.format == "csv") {
			res.setHeader('content-type','text/plain')
			res.send(result.toCSV())
		} else {
			res.send(result)
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

//~ function updateCuantilesDiariosSuavizados(req,res) {
	//~ try {
		//~ var filter = getFilter(req)
		//~ var options = getOptions(req)
	//~ } catch (e) {
		//~ console.error(e)
		//~ res.status(400).send({message:"query error",error:e.toString()})
		//~ return
	//~ }
	//~ crud.updateCuantilesDiariosSuavizados(filter.timestart,filter.timeend,filter.range,filter.series_id)
	//~ .then(count=>{
		//~ res.send(count)
	//~ })
	//~ .catch(e=>{
		//~ res.status(400).send("Query error")
	//~ })
//~ }

// modelos

function getModelos (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(filter.id) {
		filter.model_id=filter.id
	}
	crud.getModelos(filter.model_id,filter.tipo,filter.name_contains)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}
function getModelo (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(filter.id) {
		filter.model_id=filter.id
	}
	if(!filter.model_id) {
		res.status(400).send({message:"missing id",error:"missing id"})
		return
	}	
	crud.getModelos(filter.model_id,filter.tipo,filter.name_contains)
	.then(result=>{
		if(result.length==0) {
			res.status(404).send({message:"modelo not found",error:"modelo not found"})
			return
		}		
		res.send(result[0])
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getCalibradosGrupos (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	var id = (filter.id) ? filter.id : (filter.cal_grupo_id) ? filter.cal_grupo_id : undefined
	crud.getCalibradosGrupos(id)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getCalibrados (req,res) {  // devuelve un array de objetos Calibrado
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(filter.id) {
		filter.cal_id=filter.id
	}
	crud.getCalibrados(filter.estacion_id,filter.var_id,options.includeCorr,filter.timestart,filter.timeend,filter.cal_id,filter.model_id,undefined,filter.public,filter.cal_grupo_id,filter.no_metadata,options.group_by_cal)
	.then(result=>{
		const calibrados = result.map(c=>new CRUD.calibrado(c))
		res.send(calibrados)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getCalibrado (req,res) {     // Requiere id, devuelve un objeto Calibrado
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.id) {
		res.status(400).send({message:"missing id",error:"missing id"})
		return
	}
	crud.getCalibrados(filter.estacion_id,filter.var_id,filter.includeCorr,filter.timestart,filter.timeend,filter.id,filter.model_id,undefined,filter.public)
	.then(result=>{
		if(!result) {
			res.status(404).send({message:"calibrado not found",error:"calibrado not found"})
			return
		}
		if(result.length==0) {
			res.status(404).send({message:"calibrado not found",error:"calibrado not found"})
			return
		}
		const calibrado = new CRUD.calibrado(result[0])
		res.send(calibrado)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function deleteCalibrado(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(filter.id) {
		filter.cal_id = filter.id
	}
	if(!filter.cal_id) {
		res.status(400).send("missing cal_id or id")
		return
	}
	crud.deleteCalibrado(filter.cal_id) 
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function upsertCalibrado(req,res) {
	var calibrado
	if(req.body.constructor === Object) {
		if(Object.keys(req.body).length === 0) {
			calibrado = req.query
		} else {
			calibrado = new CRUD.calibrado(req.body)
		} 
	} else {
		calibrado = new CRUD.calibrado(req.query)
	}
	if(req.params) {
		if(req.params.id) {
			calibrado.id = req.params.id
		}
	}
	//~ console.log({calibrado:calibrado})
	crud.upsertCalibrado(calibrado) //calibrado.id, calibrado.nombre, calibrado.modelo, calibrado.parametros, calibrado.estados_iniciales, calibrado.activar, calibrado.selected, calibrado.out_id, calibrado.area_id, calibrado.in_id, calibrado.model_id, calibrado.tramo_id, calibrado.dt, calibrado.t_offset)
	.then(result=>{
		res.status(201).send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
	
}

function getForzantes(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.cal_id) {
		res.status(400).send("getForzantes: missing cal_id")
		return
	}
	crud.getForzantes(filter.cal_id,filter)
	.then(data=>{
		//~ console.log(data)
		send_output(options,data,res)
	})
	.catch(e=>{
		res.status(400).send(e)
	})
}

function upsertForzantes(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.cal_id) {
		res.status(400).send("upsertForzantes: missing cal_id")
		return
	}
	var forzantes = req.body
	crud.upsertForzantes(filter.cal_id,forzantes)
	.then(data=>{
		send_result(options,data,res)
	})
	.catch(e=>{
		res.status(400).send(e)
	})
}

function deleteForzantes(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.cal_id) {
		res.status(400).send("deleteForzantes: missing cal_id")
		return
	}
	crud.deleteForzantes(filter.cal_id,filter)
	.then(data=>{
		send_output(options,data,res)
	})
	.catch(e=>{
		res.status(400).send(e)
	})
}

function getForzante(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.cal_id) {
		res.status(400).send("getForzante: missing cal_id")
		return
	}
	if(!filter.orden) {
		res.status(400).send("getForzante: missing orden")
		return
	}
	crud.getForzante(filter.cal_id,filter.orden)
	.then(data=>{
		send_output(options,data,res)
	})
	.catch(e=>{
		res.status(400).send(e)
	})
}

function upsertForzante(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.cal_id) {
		res.status(400).send("upsertForzante: missing cal_id")
		return
	}
	if(!filter.orden) {
		res.status(400).send("upsertForzante: missing orden")
		return
	}
	var forzante = req.body
	forzante.orden = filter.orden
	crud.upsertForzantes(filter.cal_id,[forzante])
	.then(data=>{
		console.log(data)
		send_output(options,data,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function deleteForzantes(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.cal_id) {
		res.status(400).send("deleteForzantes: missing cal_id")
		return
	}
	crud.deleteForzantes(filter.cal_id,filter)
	.then(data=>{
		send_output(options,data,res)
	})
	.catch(e=>{
		res.status(400).send(e)
	})	
}

function deleteForzante(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.cal_id) {
		res.status(400).send("deleteForzante: missing cal_id")
		return
	}
	if(!filter.orden) {
		res.status(400).send("deleteForzante: missing orden")
		return
	}
	crud.deleteForzante(filter.cal_id,filter.orden)
	.then(data=>{
		send_output(options,data,res)
	})
	.catch(e=>{
		res.status(400).send(e)
	})	
}


function getPronosticos(req,res) {
	//~ console.log({query:req.query,body:req.body})
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	//~ console.log(filter)
	if(!filter.cor_id && !filter.cal_id && !filter.cal_grupo_id) {
		res.status(400).send({message:"missing cor_id or cal_id or cal_grupo_id",error:"missing cor_id or cal_id or cal_grupo_id"})
		return
	}
	//~ console.log({filter:filter,options:options})
	crud.getPronosticos(filter.cor_id,filter.cal_id,filter.forecast_timestart,filter.forecast_timeend,filter.forecast_date,filter.timestart,filter.timeend,filter.qualifier,filter.estacion_id,filter.var_id,options.includeProno,filter.public,filter.series_id,options.series_metadata,filter.cal_grupo_id)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getPronostico(req,res) {   // requiere id de corrida, devuelve objeto Corrida
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(filter.id) {
		filter.cor_id = filter.id
	}
		
	//~ console.log(filter)
	if(!filter.cor_id) {
		res.status(400).send({message:"missing id or cor_id",error:"missing id or cor_id"})
		return
	}
	if(filter.cor_id.toString() == 'last') {
		console.log("GET LAST CORRIDA")
		if(!filter.cal_id) {
			res.status(400).send({message:"missing cal_id",error:"missing cal_id"})
			return
		}
   	        console.log("is public:" + filter.public)
		crud.getLastCorrida(filter.estacion_id,filter.var_id,filter.cal_id,filter.timestart,filter.timeend,filter.qualifier,options.includeProno,filter.public,filter.series_id,options.series_metadata)
		.then(result=>{
			if(result.length==0) {
				res.status(404).send({message:"Corrida not found",error:"Corrida not found"})
				return
			}		
			res.send(result)
		})
		.catch(e=>{
			console.error(e)
			res.status(400).send(e)
		})
	} else {
		crud.getPronosticos(filter.cor_id,filter.cal_id,undefined,undefined,undefined,filter.timestart,filter.timeend,filter.qualifier,filter.estacion_id,filter.var_id,options.includeProno,filter.public,filter.series_id,options.series_metadata)
		.then(result=>{
			if(result.length==0) {
				res.status(404).send({message:"Corrida not found",error:"Corrida not found"})
				return
			}		
			res.send(result[0])
		})
		.catch(e=>{
			console.error(e)
			res.status(400).send(e)
		})
	}
}

function deletePronostico(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(filter.id) {
		filter.cor_id = filter.id
	}
	//~ console.log(filter)
	crud.deleteCorrida(filter.cor_id,filter.cal_id,filter.forecast_date)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function upsertPronostico(req,res) {
	var pronostico
	if(req.body.constructor === Object) {
		if(Object.keys(req.body).length === 0) {
			pronostico = req.query
		} else {
			pronostico = req.body
		} 
	} else {
		pronostico = req.query
	}
	if(req.params) {
		if(req.params.cal_id) {
			pronostico.cal_id = req.params.cal_id
		}
		if(req.params.id) {
			pronostico.cor_id = req.params.id
		}
	}
	//~ console.log({body:req.body})
	if(!pronostico.forecast_date) {
		console.error("falta forecast_date")
		res.status(400).send("falta forecast_date")
		return
	}
	crud.upsertCorrida(pronostico)  // {cal_id:,forecast_date:,series:[]}
	.then(result=>{
		if(result.series) {
			// console.log("upserted " + result.series.reduce((a,s)=>a+s.pronosticos.length,0) + " pronosticos")
		} else {
			console.log("no se insertaron pronosticos")
		}
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}	

function getCorridasGuardadas(req,res) {
	console.log({query:req.query,body:req.body})
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	//~ console.log(filter)
	if(!filter.cor_id && !filter.cal_id && !filter.cal_grupo_id) {
		res.status(400).send({message:"missing cor_id or cal_id or cal_grupo_id",error:"missing cor_id or cal_id or cal_grupo_id"})
		return
	}
	//~ console.log({filter:filter,options:options})
	crud.getCorridasGuardadas(filter.cor_id,filter.cal_id,filter.forecast_timestart,filter.forecast_timeend,filter.forecast_date,filter.timestart,filter.timeend,filter.qualifier,filter.estacion_id,filter.var_id,options.includeProno,filter.public,filter.series_id,options.series_metadata,filter.cal_grupo_id,options.group_by_qualifier)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

	
// accessors

function renderAccessorUploadForm(req,res) {
	if(!req.query.class) {
		res.status(404).send("accessor class missing")
		return
	}
	accessors.new(req.query.class)
	.then(accessor=>{
		var upload_fields = (accessor.upload_fields) ? Object.keys(accessor.upload_fields).map(key=>{
			return {
				name: key,
				description: accessor.upload_fields[key].description,
				type: accessor.upload_fields[key].type,
				required: accessor.upload_fields[key].required
			}
		}) : undefined
		var params = {"class":accessor.clase, "title": accessor.title, "upload_fields": upload_fields}
		if(req.user) {
			if(req.user.username) {
				params.loggedAs = req.user.username
			}
		}
		console.log(params)
		res.render("accessorUploadForm",params)
	})
	.catch(e=>{
		console.error(e)
		res.status(404).send(e.toString())
	})	
}

function getAccessorsList(req,res) {
	if(req.params && req.params.name) {
		pool.query("SELECT * from accessors where name=$1",[req.params.name])
		.then(result=>{
			res.send(result.rows)
		})
		.catch(e=>{
			console.error(e.toString())
			res.status(400).send(e)
		})
	} else {
		pool.query("SELECT * from accessors order by name")
		.then(result=>{
			res.send(result.rows)
		})
		.catch(e=>{
			console.error(e.toString())
			res.status(400).send(e)
		})
	}
}

function testAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.new(req.params.name)
	//~ pool.query("SELECT * from accessors where class=$1",[req.params.name])
	//~ .then(result=>{
		//~ if(result.rows.length==0) {
			//~ console.error("accessor not found")
			//~ res.status(400).send({message:"accessor not found"})
			//~ return
		//~ }
		//~ const accessor = new accessors.Accessor({"class":result.rows[0].class, "url": result.rows[0].url, "series_tipo": result.rows[0].series_tipo, "series_source_id": result.rows[0].series_source_id, "config": result.rows[0].config, title: result.rows[0].title, upload_fields: result.rows[0].upload_fields, name: result.rows[0].name})
	.then(accessor=>{
		return accessor.engine.test(filter,options)
	})
	.then(result=>{
		if(result) {
			res.send({message:"accessor test ok"})
		} else {
			res.status(400).send({message:"accessor test failed"})
		}
	})
	.catch(e=>{
		console.error(e.toString())
		res.status(400).send({message:e.toString()})
	})
}

function getFromAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
    try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e.toString())
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.new(req.params.name)
	//~ pool.query("SELECT * from accessors where class=$1",[req.params.name])
	//~ .then(result=>{
		//~ if(result.rows.length==0) {
			//~ console.error("accessor not found")
			//~ res.status(400).send({message:"accessor not found"})
			//~ return
		//~ }
		//~ const accessor = new accessors.Accessor({"class":result.rows[0].class, "url": result.rows[0].url, "series_tipo": result.rows[0].series_tipo, "series_source_id": result.rows[0].series_source_id, "config": result.rows[0].config, title: result.rows[0].title, upload_fields: result.rows[0].upload_fields, name: result.rows[0].name})
	.then(accessor=>{
		return accessor.engine.get(filter,options)
	})
	.then(result=>{
		if(result) {
			send_output(options,result,res)
		} else {
			res.status(400).send({message:"accessor got nothing"})
		}
	})
	.catch(e=>{
		if(config.verbose) {
			console.error(e)
		} else {
			console.error(e.toString())
		}
		res.status(400).send({message:e.toString()})
	})
}

function getAllFromAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
    try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e.toString())
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.new(req.params.name)
	.then(accessor=>{
		return accessor.engine.getAll(filter,options)
	})
	.then(result=>{
		if(result) {
			send_output(options,result,res)
		} else {
			res.status(400).send({message:"accessor getAll failed"})
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({message:e.toString()})
	})
}



function updateFromAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
    try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		if(config.verbose) {
			console.error(e)
		} else {
			console.error(e.toString())
		}
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.new(req.params.name)
	//~ pool.query("SELECT * from accessors where class=$1",[req.params.name])
	//~ .then(result=>{
		//~ if(result.rows.length==0) {
			//~ console.error("accessor not found")
			//~ res.status(400).send({message:"accessor not found"})
			//~ return
		//~ }
		//~ const accessor = new accessors.Accessor(result.rows[0].class,result.rows[0].url,result.rows[0].series_tipo,result.rows[0].series_source_id,result.rows[0].config)
	.then(accessor=>{
		return accessor.engine.update(filter,options)
		.then(result=>{
			if(result) {
				send_output(options,result,res)
				pool.query("UPDATE accessors set time_update=$1 WHERE name=$2",[accessor.time_update,accessor.name])
			} else {
				res.status(400).send({message:"accessor get failed"})
			}
		})
	})
	.catch(e=>{
		if(config.verbose) {
			console.error(e)
		} else {
			console.error(e.toString())
		}
		res.status(400).send({message:e.toString()})
	})
}

function updateAllFromAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
    try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.new(req.params.name)
	.then(accessor=>{
		return accessor.engine.updateAll(filter,options)
		.then(result=>{
			if(result) {
				send_output(options,result,res)
				pool.query("UPDATE accessors set time_update=$1 WHERE name=$2",[accessor.time_update,accessor.name])
			} else {
				res.status(400).send({message:"accessor updateAll failed"})
			}
		})
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({message:e.toString()})
	})
}

function getSitesFromAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
    try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e.toString())
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.new(req.params.name)
	.then(accessor=>{
		if(typeof accessor.engine.getSites !== 'function') {
			throw("Este accessor no tiene definida la función getSites")
		} 
		return accessor.engine.getSites(filter,options)
		.then(result=>{
			if(result) {
				send_output(options,result,res)
				//~ pool.query("UPDATE accessors set time_update=$1 WHERE name=$2",[accessor.time_update,accessor.name])
			} else {
				res.status(400).send({message:"accessor getSites failed"})
			}
		})
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({message:e.toString()})
	})
}

function updateSitesFromAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
    try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.new(req.params.name)
	.then(accessor=>{
		if(!accessor.engine.updateSites) {
			res.status(400).send("updateSites not defined for accessor:"+req.params.name)
			return
		}
		return accessor.engine.updateSites(filter,options)
		.then(result=>{
			if(result) {
				send_output(options,result,res)
				// pool.query("UPDATE accessors set time_update=$1 WHERE name=$2",[accessor.time_update,accessor.name])
			} else {
				res.status(400).send({message:"accessor updateSites failed"})
			}
		})
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({message:e.toString()})
	})
}

function uploadToAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	//~ console.log({filter:filter})
	new formidable.IncomingForm().parse(req, (err, fields, files) => {
		//~ console.log({fields:fields,files:files})
		if (err) {
		  console.error('Error', err)
		  res.status(500).send({message:"parse error",error:err})
		  return
		} else {
			if(!files) {
				console.error("faltan los archivos")
				res.status(400).send("faltan los archivos")
				return
			}
			if(!files.file) {
				console.error("falta el archivo")
				res.status(400).send("falta el archivo")
				return
			}
			if(files.file.size <=0) {
				console.error("archivo vacío o faltante")
				res.status(400).send("archivo vacío o faltante")
				return
			}
			if(!fs.existsSync(files.file.path)) {
				console.error("File not found")
				res.status(400).send("File not found")
				return
			}
			if(fields) {
				Object.keys(fields).forEach(key=>{
					filter[key] = fields[key]
				})
			}
			console.log({filter:filter})
			accessors.new(req.params.name)
			.then(accessor=>{
			//~ pool.query("SELECT * from accessors where class=$1",[req.params.name])
			//~ .then(result=>{
				//~ if(result.rows.length==0) {
					//~ console.error("accessor not found")
					//~ res.status(400).send({message:"accessor not found"})
					//~ return
				//~ }
				//~ const accessor = new accessors.Accessor(result.rows[0].class,result.rows[0].url,result.rows[0].series_tipo,result.rows[0].series_source_id,result.rows[0].config)
				//~ console.log({config:accessor.engine.config})
				var local_file_path = __dirname + "/" + accessor.engine.config.file
				fs.copyFileSync(files.file.path,local_file_path)
				console.log("se copió el archivo " + local_file_path)
				filter.file = local_file_path
				if(options.no_update) {
					return accessor.engine.get(filter,options)
				} else {
					return accessor.engine.update(filter,options)
				}
			})
			.then(result=>{
				send_output(options,result,res)
			})
			.catch(e=>{
				console.error(e)
				res.status(400).send(e.toString())
			})
		}
	})
}

function getSeriesFromAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.new(req.params.name)
	.then(accessor=>{
		return accessor.engine.getSeries(filter,options)
	})
	.then(result=>{
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
}

function updateSeriesFromAccessor(req,res) {
	if(!req.params || !req.params.name) {
		console.error("falta name")
		res.status(400).send({message:"falta name"})
		return
	}
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.new(req.params.name)
	.then(accessor=>{
		return accessor.engine.upsertSeries(filter,options)
	})
	.then(result=>{
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
}


function getParaguay09 (req,res) {
  //~ .option('-s, --timstart <value>','start date (defaults to start of file)')
  //~ .option('-e, --timeend <value>','end date (defaults to current date)')
  //~ .option('-i, --insert','Upsert into db')
  //~ .option('-C, --csv', 'input/output as CSV')
  //~ .option('-S, --string', 'output as one-line strings')
  //~ .option('-o, --output <value>', 'output filename')
  //~ .option('-P, --pretty','pretty-print JSON')
  //~ .option('-q, --quiet', 'no imprime regisros en stdout')
  //~ .description("Scrap file Paraguay_09.xls")
  //~ .action(options=>{
    try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.getParaguay09(filter.timestart,filter.timeend)
	  .then(data=>{
		  var observaciones  = data.map(d=> {
			  var obs = new CRUD.observacion(d)
			  //~ console.log(obs.toString())
			  return obs
		  })
		  return crud.upsertObservaciones(observaciones)
		})
		.then(observaciones=>{
			console.log("upserted " + observaciones.length + " observaciones")
			send_output(options,observaciones,res)
		})
		.catch(e=>{
			  console.error(e)
			  res.status(500).send("Server error")
		})
}

function postParaguay09Form (req,res) {
	var params = (req.query) ? req.query : {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	console.log({params:params})
	res.render('paraguay09Form',params)
}

function postParaguay09 (req,res) {
	new formidable.IncomingForm().parse(req, (err, fields, files) => {
		//~ console.log({fields:fields,files:files})
		if (err) {
		  console.error('Error', err)
		  res.status(500).send({message:"parse error",error:err})
		  return
		} else {
			//~ authenticateUser(fields.username,fields.password)
			//~ .then(()=>{
				if(!files.file) {
					console.error("falta el archivo")
					res.status(400).send("falta el archivo")
					return
				}
				if(files.file.size <=0) {
					console.error("archivo vacío o faltante")
					res.status(400).send("archivo vacío o faltante")
					return
				}
				if(!fs.existsSync(files.file.path)) {
					console.error("File not found")
					res.status(400).send("File not found")
					return
				}
				fs.copyFileSync(files.file.path,__dirname + "/../public/planillas/Paraguay_09.xls")
				console.log("se copió el archivo " + __dirname + "/../public/planillas/Paraguay_09.xls")
				return accessors.getParaguay09(fields.timestart,fields.timeend,__dirname + "/../public/planillas/Paraguay_09.xls")
				.then(data=>{
				  var observaciones  = data.map(d=> {
					  var obs = new CRUD.observacion(d)
					  //~ console.log(obs.toString())
					  return obs
				  })
				  //~ return observaciones
				  return crud.upsertObservaciones(observaciones)
				})
				.then(observaciones=>{
					console.log("upserted " + observaciones.length + " observaciones")
					send_output({csvless:true},observaciones,res)
				})
				.catch(e=>{
					  console.error(e)
					  res.status(500).send("Server error")
				})
			//~ }).catch(e=>{
				//~ console.error({message:"authentication error",error:e})
				//~ res.status(401).send("authentication error")
				res.redirect("postParaguay09")
				//~ return
			//~ })
		}
	})
}

function getPrefe (req,res) {  // getPrefe?estacion_id=&timestart=&timeend=
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(filter.timestart) {
		filter.timestart = new Date(filter.timestart)
	}
	if(filter.timeend) {
		filter.timeend = new Date(filter.timeend)
	}
	if(!filter.estacion_id) {
		console.error("getPrefe: Missing estacion_id")
		res.status(400).send({error:"missing estacion_id"})
		return
	}
	accessors.getPrefe(pool,filter.estacion_id,filter.timestart,filter.timeend)
	.then(obs=>{
	  //~ console.log(res)
	  res.send(obs)
	  return
    })
    .catch(e=>{
	  console.error(e)
	  res.status(500).send({error:e})
    })
}

function getPrefeAndUpdate (req,res) {  // getPrefe?estacion_id=&timestart=&timeend=
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(filter.timestart) {
		filter.timestart = new Date(filter.timestart)
	}
	if(filter.timeend) {
		filter.timeend = new Date(filter.timeend)
	}
	if(!filter.estacion_id) {
		console.error("getPrefe: Missing estacion_id")
		res.status(400).send({error:"missing estacion_id"})
		return
	}
	accessors.getPrefe(pool,filter.estacion_id,filter.timestart,filter.timeend)
	.then(obs=>{
	  //~ console.log(res)
	  crud.upsertObservaciones(obs)
	  .then(inserted=>{
		  console.log("Se insertaron "+inserted.length+" observaciones de prefectura")
		  res.send({"rows_inserted":inserted.length})
		  return
	  })
	  .catch(e=>{
		  console.error(e)
		  res.status(500).send({error:e})
	  })
	  return
    })
    .catch(e=>{
	  console.error(e)
	  res.status(500).send({error:e})
    })
}

function getFromSource(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	//~ console.log(filter)
	accessors.getFromSource2(crud,filter.tipo,filter.series_id,filter.timestart,filter.timeend) // accessors.getFromSource(crud,filter.tipo,filter.series_id,filter.timestart,filter.timeend)
	.then(obs=>{
		res.send(obs)
		return
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
}

function getRedesAccessors(req,res) {
try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	console.log(filter)
	crud.getRedesAccessors(filter)
	.then(result=>{
		res.send(result)
		return
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
}
function getTelex(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.getTelex(filter.timestart,filter.estacion_id,__dirname + '/../public/planillas/Telex.xls')
	.then(observaciones=>{
		console.log("got " + observaciones.length + " observaciones")
		send_output(options,observaciones.map(o=>new CRUD.observacion(o)),res)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function postTelexForm (req,res) {
	var params = (req.query) ? req.query : {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	//~ console.log({params:params})
	res.render('telexForm',params)
}

function postTelex (req,res) {
	new formidable.IncomingForm().parse(req, (err, fields, files) => {
		//~ console.log({fields:fields,files:files})
		if (err) {
		  console.error('Error', err)
		  res.status(500).send({message:"parse error",error:err})
		  return
		} else {
			//~ authenticateUser(fields.username,fields.password)
			//~ .then(()=>{
				if(!files.file) {
					console.error("falta el archivo")
					res.status(400).send("falta el archivo")
					return
				}
				if(files.file.size <=0) {
					console.error("archivo vacío o faltante")
					res.status(400).send("archivo vacío o faltante")
					return
				}
				if(!fs.existsSync(files.file.path)) {
					console.error("File not found")
					res.status(400).send("File not found")
					return
				}
				fs.copyFileSync(files.file.path,__dirname + "/../public/planillas/Telex.xls")
				console.log("se copió el archivo " + __dirname + "/../public/planillas/Telex.xls")
				return accessors.getTelex(fields.timestart,fields.estacion_id,__dirname + "/../public/planillas/Telex.xls")
				.then(data=>{
				  var observaciones  = data.map(d=> {
					  var obs = new CRUD.observacion(d)
					  //~ console.log(obs.toString())
					  return obs
				  }) // .filter(o=> parseFloat(o.valor).toString()!=='NaN')
				  if(fields.test) {
					return observaciones
				  } else {
					return crud.upsertObservaciones(observaciones)
				  }
				})
				.then(observaciones=>{
					console.log("upserted " + observaciones.length + " observaciones")
					send_output({csvless:true},observaciones,res) // csvless:true
				})
				.catch(e=>{
					  console.error(e)
					  res.status(500).send("Server error")
				})
			//~ }).catch(e=>{
				//~ console.error({message:"authentication error",error:e})
				//~ res.status(401).send("authentication error")
				//res.redirect("postParaguay09")
				//~ return
			//~ })
		}
	})
}

function getTabprono(req,res) {
	// forecast_date,dow,file
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	console.log(filter)
	accessors.tabprono.getTabprono(filter.forecast_date,filter.dow,filter.file)
	.then(result=>{
		console.log(result)
		send_output({},result,res)
	}).catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function postTabpronoForm(req,res) {
	var params = (req.query) ? req.query : {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	//~ console.log({params:params})
	res.render('tabpronoForm',params)
}

function postTabprono(req,res) {
	new formidable.IncomingForm().parse(req, (err, fields, files) => {
		//~ console.log({fields:fields,files:files})
		if (err) {
		  console.error('Error', err)
		  res.status(500).send({message:"parse error",error:err})
		  return
		} else {
			//~ authenticateUser(fields.username,fields.password)
			//~ .then(()=>{
				if(!files.file) {
					console.error("falta el archivo")
					res.status(400).send("falta el archivo")
					return
				}
				if(files.file.size <=0) {
					console.error("archivo vacío o faltante")
					res.status(400).send("archivo vacío o faltante")
					return
				}
				if(!fs.existsSync(files.file.path)) {
					console.error("File not found")
					res.status(400).send("File not found")
					return
				}
				fs.copyFileSync(files.file.path,__dirname + "/../public/planillas/Tabprono.xls")
				console.log("se copió el archivo " + __dirname + "/../public/planillas/Tabprono.xls")
				return accessors.new('tabprono')
				.then(accessor=>{
					return accessor.engine.update({forecast_date:fields.forecast_date,file:__dirname + "/../public/planillas/Tabprono.xls",insert_obs:true})
				})
				//~ return accessors.tabprono.getTabprono(fields.forecast_date,fields.dow,__dirname + "/../public/planillas/Tabprono.xls")
				//~ .then(result=>{		
					//~ console.log(result)
					//~ if(fields.test) {
						//~ return result
					//~ } else if (fields.insert_obs) {
						//~ return Promise.all([crud.insertTabprono(result.tabprono_geojson,true),crud.upsertCorrida(result.pronosticos_central),crud.upsertCorrida(result.pronosticos_min),crud.upsertCorrida(result.pronosticos_max)])
					//~ } else {
						//~ return Promise.all([crud.insertTabprono(result.tabprono_geojson,false),crud.upsertCorrida(result.pronosticos_central),crud.upsertCorrida(result.pronosticos_min),crud.upsertCorrida(result.pronosticos_max)])
					//~ } 
				//~ })
				.then(result=>{
					send_output({},result,res)
				}).catch(e=>{
					console.error(e)
					res.status(500).send("Server error")
				})
			//~ }).catch(e=>{
				//~ console.error({message:"authentication error",error:e})
				//~ res.status(401).send("authentication error")
				//res.redirect("postParaguay09")
				//~ return
			//~ })
		}
	})
}
	
function getONS(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.getONS(pool,config.ons,filter.timestart,filter.timeend)
	.then(result=>{
		console.log("got " + result.length + " records")
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function postONS(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.getONS(pool,config.ons,filter.timestart,filter.timeend)
	.then(result=>{
		console.log("got " + result.length + " records")
		if(result.length==0) {
			res.status(400).send("No se encontraron registros")
			return
		}
		return crud.upsertObservacionesPuntual(result)
	})
	.then(result=>{
		console.log("upserted " + result.length + " records")
		if(result.length==0) {
			res.status(400).send("No se insertaron registros")
			return
		}
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function makeONSTables (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.timestart) {
		filter.timestart = new Date(new Date().getTime() - 365*24*3600*1000)
	}
	if(!filter.timeend) {
		filter.timeend = new Date()
	}
	var estacionesFilter = {tabla_id:"presas"}
	if(filter.estacion_id) {
		estacionesFilter.unid = filter.estacion_id
	} 
	crud.getEstaciones(estacionesFilter)
	.then(estaciones=>{
		console.log("got " +estaciones.length +" estaciones")
		//~ for(var i=0;i<estaciones.length;i++) {
		return Promise.all(estaciones.map(estacion=>{
			return crud.getSeries("puntual",{estacion_id:estacion.id})
			.then(series=>{
				console.log("got " +series.length +" series for estacion.id=" + estacion.id)

				series = series.map(s=>{
					return {tipo:s.tipo, id:s.id}
				})
				return crud.getMultipleRegularSeries(series,filter.dt,filter.timestart,filter.timeend,{t_offset:filter.t_offset, aggFunction:filter.agg_func,inst:filter.inst,timeSupport:filter.time_support,precision:filter.precision}) // options: t_offset,aggFunction,inst,timeSupport,precision
				.then(result=>{
					if(result.length==0) {
						return
					}
					var filename = sprintf("%s/%s/%s.csv", __dirname, config.ons.tables_dir, estacion.nombre.replace(/\s+/g,"_"))
					var csv = result.map(r=>r.join(",")).join("\n")
					return fs.writeFile(filename, csv)
					.then(()=>{
						console.log("Wrote file " + filename)
						return filename
					})
				})
			})
		}))
		.then(filenames=>{
			return filenames
		})
	})
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}
					
function getDadosANA(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.getDadosANABatch(crud,filter,options)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		console.error({error:e})
		res.status(400).send(e)
	})
}
	//~ var getestacionesfilter = {tabla:"red_ana_hidro"}
	//~ if(filter.estacion_id) {
		//~ getestacionesfilter.unid = filter.estacion_id
	//~ }
	//~ crud.getEstaciones(getestacionesfilter)
	//~ .then(estaciones=>{
		//~ console.log(estaciones)
		//~ if(estaciones.length==0) {
			//~ console.log("no estaciones found")
			//~ res.status(400).send("no estaciones found")
			//~ return
		//~ }
		//~ var observaciones = estaciones.map(e=>{
			//~ if(!e.id_externo) {
				//~ console.log("missing id_externo for estacion_id:"+e.unid)
				//~ return
			//~ }
			//~ console.log({id_externo:e.id_externo})
			//~ return crud.getSeries('puntual',{estacion_id:e.id,proc_id:1})
			//~ .then(series=>{
				//~ console.log({series:series})
				//~ var series_id = {}
				//~ series.forEach(s=>{
					//~ if(s.var.id==2) {
						//~ series_id.Nivel = s.id
					//~ }
					//~ if(s.var.id==4) {
						//~ series_id.Vazao = s.id
					//~ }
					//~ if(s.var.id==27) {
						//~ series_id.Chuva = s.id
					//~ }
				//~ })
				//~ return accessors.getDadosANA(e.id_externo,filter.timestart,filter.timeend,series_id)  // el ws ignora la hora
				//~ .then(obs=>{
					//~ console.log("got " + obs.length + " observaciones from station " + e.id)
					//~ if(options.update) {
						//~ return crud.upsertObservaciones(obs)
						//~ .then(upserted=>{
							//~ var length = upserted.length
							//~ console.log("upserted " + length + " registros for station " + e.id)
							//~ upserted=""
							//~ obs=""
							//~ if(options.run_asociaciones) {
								//~ return crud.runAsociaciones({estacion_id:e.id,source_var_id:27,source_proc_id:1,timestart:filter.timestart,timeend:filter.timeend},{inst:true,no_send_data:true})
								//~ .then(result=>{
									//~ if(!result) {
										//~ console.error("No records created from estacion_id="+e.id+" var_id=27 for asoc")
									//~ } else {																		//~ return [...upserted,...result]
										//~ length+=result.length
									//~ }
									//~ result=""
									//~ return crud.runAsociaciones({estacion_id:e.id,source_var_id:31,source_proc_id:1,timestart:filter.timestart,timeend:filter.timeend},{no_send_data:true})
									//~ .then(result=>{
										//~ if(!result) {
											//~ console.error("No records created from estacion_id="+e.id+" var_id=31 for asoc")
										//~ } else {
//									return [...upserted,...result]
											//~ length+=result.length
										//~ }
										//~ result=""
										//~ return crud.runAsociaciones({estacion_id:e.id,source_var_id:4,source_proc_id:1,timestart:filter.timestart,timeend:filter.timeend},{no_send_data:true})
										//~ .then(result=>{
											//~ if(!result) {
												//~ console.error("no records created from estacion_id="+e.id+" var_id=4 for asoc")
											//~ } else {
												//~ length+= result.length
											//~ }
											//~ result=""
											//~ return length
										//~ })
									//~ })
								//~ })
							//~ } else {
								//~ return length
							//~ }
						//~ })
					//~ } else {
						//~ return obs
					//~ }
				//~ })
				//~ .catch(e=>{
					//~ console.error({error:e})
					//~ return
				//~ })
			//~ })
		//~ })
		//~ return Promise.all(observaciones)
		//~ .then(obs=>{
			//~ if(options.update) {
				//~ console.log("upserted "+ obs + " registros")
				//~ res.send({registros_actualizados:obs})
				//~ return
			//~ } else if(obs.length==0) {
				//~ res.status(401).send("No data found")
				//~ return
			//~ }
			//~ var full_length = obs.map(o=> (o) ? o.length : 0).reduce((t,l)=>t+l)
			//~ console.log("got " + full_length + " observaciones from " + obs.length + " estaciones") 
			//~ var allobs = [].concat(...obs)
			//~ res.send(obs)
		//~ })
	//~ })
	//~ .catch(e=>{
		//~ console.error({error:e})
		//~ res.status(400).send(e)
	//~ })		
//~ }			
	
function getSitesANA(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.getSitesANA()
	.then(result=>{
		if(options.update) {
			console.log("updating sites")
			crud.upsertEstaciones(result.filter(e=>[6,7].includes(e.cuenca)),{no_update_id:true})   // upsert cuencas 6 y 7: uruguay y paraná
			.then(upserted=>{
			//~ insert into series (estacion_id,var_id,proc_id,unit_id) select unid,27,1,9 from estaciones where tabla='red_ana_hidro' on conflict (estacion_id,var_id,proc_id) do nothing;
			//~ insert into series (estacion_id,var_id,proc_id,unit_id) select unid,1,1,22 from estaciones where tabla='red_ana_hidro' on conflict (estacion_id,var_id,proc_id) do nothing;
			//~ insert into series (estacion_id,var_id,proc_id,unit_id) select unid,2,1,11 from estaciones where tabla='red_ana_hidro' on conflict (estacion_id,var_id,proc_id) do nothing;
			//~ insert into series (estacion_id,var_id,proc_id,unit_id) select unid,4,1,10 from estaciones where tabla='red_ana_hidro' on conflict (estacion_id,var_id,proc_id) do nothing;
			//~ "insert into asociaciones (source_tipo,source_series_id,dest_tipo,dest_series_id,agg_func,dt,t_offset) select 'puntual',s.id,'puntual',d.id,'sum','1 days','9 hours' from estaciones, series s, series d where estaciones.tabla='red_ana_hidro' and estaciones.unid=s.estacion_id and s.var_id=27 and s.proc_id=1 and d.var_id=1 and d.proc_id=1 and estaciones.unid=d.estacion_id on conflict (dest_tipo,dest_series_id) do nothing;"
				res.send(upserted)
			})
			.catch(e=>{
				console.error(e)
				res.status(400).send(e)
			})
		} else {
			res.send(result)
		}
	})
	.catch(e=>{
		console.error({error:e})
		res.status(404).send(e)
	})
}

function getSQPESMN(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	accessors.getSQPESMN(crud,config,filter.timestart,filter.timeend,5,options)
	.then(result=>{
		//~ if(options.no_insert) {
			//~ return(result)
			//~ return
		//~ } else {
			//~ return crud.upsertObservaciones(result)
			//~ .then(upserted=>{
				//~ console.log("upserted " + upserted.length + " observaciones")
				//~ return upserted
			//~ })
		//~ }
	//~ })
	//~ .then(result=>{
		send_output(options,result,res)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e.toString())
	})
}

// RALEO

function thinObs(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	// console.log({filter:filter,options:options})
	if(!filter.timestart || !filter.timeend || !options.interval) {
		res.status(400).send("Missing parameters: timestart, timeend, interval")
		return
	}
	crud.thinObs(filter.tipo,filter,options)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(400).send(e.toString())
	})
}


// 2mnemos

function getalturas2mnemos(req,res) {
	crud.getAlturas2Mnemos(req.query.estacion_id,req.query.startdate,req.query.enddate)
	.then(result=>{
		console.log("got alturas 2 mnemos")
		res.setHeader('content-type', 'text/plain')
		var csv = arr2csv(result.rows)
		res.send(csv)
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

// GEOSERVER

function geoserverCreateWorkspace(req,res) {
	if(!config.geoserver) {
		console.error("Missing geoserver configuration")
		res.status(400).send("Missing geoserver configuration")
		return
	}
	request.post("http://" + config.geoserver.user + ":" + config.geoserver.password + "@" + config.geoserver.url + "/rest/workspaces",
	  {
		headers: {"accept": "application/json",
			"content-type":"application/json"},
		json: {name: config.geoserver.workspace}
	  },(error,responseObject,responseBody)=>{
		  if(error) {
			  console.error(error)
			  res.status(400).send({"geoserver_error":error})
			  return
		  }
		  console.log(responseBody)	  
		  res.send({"geoserver_response":responseBody})
		  return
	  }
	)
}
function geoserverCreateDatastore(req,res) {
	if(!config.geoserver) {
		console.error("Missing geoserver configuration")
		res.status(400).send("Missing geoserver configuration")
		return
	}
	request.post("http://" + config.geoserver.user + ":" + config.geoserver.password + "@" + config.geoserver.url + "/rest/workspaces/" + config.geoserver.workspace + "/datastores",
	  {
		headers: {"accept": "application/json",
			"content-type":"application/json"},
		json: {dataStore: {
			name: config.geoserver.datastore,
			"connectionParameters": {
			  "entry": [
				{"@key":"host","$":config.database.host},
				{"@key":"port","$":config.database.port},
				{"@key":"database","$":config.database.database},
				{"@key":"user","$":config.database.user},
				{"@key":"passwd","$":config.database.password},
				{"@key":"dbtype","$":"postgis"}
			  ]
			}
		  }
		}
	  },(error,responseObject,responseBody)=>{
		  if(error) {
			  console.error(error)
			  res.status(400).send({"geoserver_error":error})
			  return
		  }
		  console.log(responseBody)	  
		  res.send({"geoserver_response":responseBody})
		  return
	  }
	)
}
function geoserverCreatePointsLayer(req,res) {
	if(!config.geoserver) {
		console.error("Missing geoserver configuration")
		res.status(400).send("Missing geoserver configuration")
		return
	}
	// create style
	var styleSLD = geoserverCreatePointsStyle()
	//~ console.log(styleSLD)
	request.post("http://" + config.geoserver.user + ":" + config.geoserver.password + "@" + config.geoserver.url + "/rest/workspaces/" + config.geoserver.workspace + "/styles",
	  {
		headers: {"accept": "application/json",
			"content-type":"application/vnd.ogc.sld+xml"},
		body: styleSLD,
		name: "points_data_availability"
	  },(error,responseObject,responseBody)=>{
		  if(error) {
			  console.error(error)
			  res.status(400).send({"geoserver_error":error})
			  return
		  }
		  console.log({"createStyleResponse":responseBody})	  
			request.post("http://" + config.geoserver.user + ":" + config.geoserver.password + "@" + config.geoserver.url + "/rest/workspaces/" + config.geoserver.workspace + "/datastores/" + config.geoserver.datastore + "/featuretypes",
			  {
				headers: {"accept": "application/json",
					"content-type":"application/json"},
				json: {featureType: {
					name: "MonitoredPointsByVarAndProc",
					nativeName: "estaciones",
					enabled:true,
					"metadata":{
						"entry":{
							"@key":"JDBC_VIRTUAL_TABLE",
							"virtualTable":{
								"name":"monitoredPoints",
								"sql":"with cor as (\r\n         select calibrados_out_full.out_id, max(date) date\r\n         from corridas, calibrados_out_full \r\n         where corridas.cal_id=calibrados_out_full.cal_id\r\n         group by calibrados_out_full.out_id\r\n      )\r\n      SELECT series.id series_id,\r\n          estaciones.nombre,\r\n          estacion_id,\r\n          estaciones.rio,\r\n          var_id,\r\n          proc_id,\r\n          unit_id,\r\n          var.nombre var_name,\r\n          series_date_range.timestart,\r\n        series_date_range.timeend,\r\n        COALESCE(series_date_range.count, 0),\r\n        cor.date forecast_date,\r\n        case when series_date_range.timeend is not null\r\n        then \r\n         case when now() - series_date_range.timeend < '1 days'::interval \r\n           then case when cor.date is not null \r\n             then 'RT+S'\r\n             else 'RT'\r\n             end\r\n           when now() - series_date_range.timeend < '3 days'::interval\r\n           then case when cor.date is not null \r\n             then 'NRT+S'\r\n             else 'NRT'\r\n             end\r\n           else case when cor.date is not null \r\n             then'H+S' \r\n             else 'H'\r\n             end\r\n         end\r\n        when cor.date is not null \r\n        then 'S'\r\n        else 'N'\r\n        end AS data_availability,\r\n          geom\r\n      FROM series\r\n      JOIN estaciones ON (series.estacion_id=estaciones.unid  AND var_id=%varId% AND proc_id<=%procId%)\r\n      join var ON  (var.id = series.var_id )\r\n      LEFT OUTER JOIN series_date_range on (series_date_range.series_id=series.id)\r\n      LEFT OUTER JOIN cor ON (cor.out_id=estaciones.unid)\r\n      ORDER BY estacion_id,var_id,proc_id\n",
								"escapeSql":false,
								"geometry":{
									"name":"geom",
									"type":"Point",
									"srid":4326
								},
								"parameter":[
									{   "name":"procId",
										"defaultValue":1,
										"regexpValidator":"^\\d+$"},
									{   "name":"varId",
										"defaultValue":2,
										"regexpValidator":"^\\d+$"}
								]
							}
						}
					}
				  }
				}
			  },(error,responseObject,responseBody)=>{
				  if(error) {
					  console.error(error)
					  res.status(400).send({"geoserver_error":error})
					  return
				  }
				  console.log(responseBody)	  
				  res.send({"geoserver_response":responseBody})
				  return
			  }
			)
	  }
	)
}

function geoserverCreateAreasLayer(req,res) {
	if(!config.geoserver) {
		console.error("Missing geoserver configuration")
		res.status(400).send("Missing geoserver configuration")
		return
	}
	request.post("http://" + config.geoserver.user + ":" + config.geoserver.password + "@" + config.geoserver.url + "/rest/workspaces/" + config.geoserver.workspace + "/datastores/" + config.geoserver.datastore + "/featuretypes",
	  {
		headers: {"accept": "application/json",
			"content-type":"application/json"},
		json: {featureType: {
			name: config.geoserver.areaslayer,
			cqlFilter: "activar=true AND mostrar=true"
		  }
		}
	  },(error,responseObject,responseBody)=>{
		  if(error) {
			  console.error(error)
			  res.status(400).send({"geoserver_error":error})
			  return
		  }
		  console.log(responseBody)	  
		  res.send({"geoserver_response":responseBody})
		  return
	  }
	)
}

function geoserverDeletePointsLayer(req,res) {
	if(!config.geoserver) {
		console.error("Missing geoserver configuration")
		res.status(400).send("Missing geoserver configuration")
		return
	}
	request.delete("http://" + config.geoserver.user + ":" + config.geoserver.password + "@" + config.geoserver.url + "/rest/layers/" + config.geoserver.workspace + ":" + "estaciones",
	  {
		headers: {"accept": "application/json"}
	  },
	  (error,responseObject,responseBody)=>{
		  if(error) {
			  console.error({geoserverError:error})
		  }
		  console.log(responseBody)	  
		  request.delete("http://" + config.geoserver.user + ":" + config.geoserver.password + "@" + config.geoserver.url + "/rest/workspaces/" + config.geoserver.workspace + "/datastores/" + config.geoserver.datastore + "/featuretypes/estaciones",
		  {
			headers: {"accept": "application/json"}
		  },
		  (error,responseObject,responseBody)=>{
			  if(error) {
				  console.error({geoserverError:error})
				  res.status(400).send({"geoserver_error":error})
				  return
			  }
			  console.log(responseBody)
			  res.send(responseBody)
		  })
	  }
	)
}	  

function geoserverDeleteAreasLayer(req,res) {
	if(!config.geoserver) {
		console.error("Missing geoserver configuration")
		res.status(400).send("Missing geoserver configuration")
		return
	}
	request.delete("http://" + config.geoserver.user + ":" + config.geoserver.password + "@" + config.geoserver.url + "/rest/layers/" + config.geoserver.workspace + ":" + "areas_pluvio",
	  {
		headers: {"accept": "application/json"}
	  },
	  (error,responseObject,responseBody)=>{
		  if(error) {
			  console.error({geoserverError:error})
		  }
		  console.log(responseBody)	  
		  request.delete("http://" + config.geoserver.user + ":" + config.geoserver.password + "@" + config.geoserver.url + "/rest/workspaces/" + config.geoserver.workspace + "/datastores/" + config.geoserver.datastore + "/featuretypes/areas_pluvio",
		  {
			headers: {"accept": "application/json"}
		  },
		  (error,responseObject,responseBody)=>{
			  if(error) {
				  console.error({geoserverError:error})
				  res.status(400).send({"geoserver_error":error})
				  return
			  }
			  console.log(responseBody)
			  res.send(responseBody)
		  })
	  }
	)
}	  

function geoserverCreatePointsStyle() {
	var styleParams = {
		'N': {fill:"#6e6e6e", radius: 8, stroke:"#dcdcdc", strokeOpacity: 0, fontColor: "white", zIndex: 1},
		'S': {fill: "#6e6e6e", radius: 7,stroke:"#00dcdc",strokeOpacity: 1, fontColor: "white", zIndex: 2},
		'H': {fill: "#0080ff", radius: 8, stroke: "#dcdcdc", strokeOpacity: 0, fontColor: "white", zIndex: 3},
		'H+S': {fill: "#0080ff", radius: 7, stroke:"#00dcdc",strokeOpacity: 1, fontColor: "white", zIndex: 4},
		'NRT': {fill: "#006600", radius: 8, stroke: "#dcdcdc",strokeOpacity: 0, fontColor: "white", zIndex: 5},
		'NRT+S': {fill: "#006600", radius: 7, stroke:"#00dcdc",strokeOpacity: 1, fontColor: "white", zIndex: 6},
		'RT': {fill: "#00ff00", radius: 8, stroke: "#dcdcdc",strokeOpacity: 0, fontColor: "black", zIndex: 7},
		'RT+S': {fill: "#00ff00", radius: 7, stroke:"#00dcdc",strokeOpacity: 1, fontColor: "black", zIndex: 8}
	}
	var sldStyle = Object.keys(styleParams).map(key=> {
		return '<Rule>\
	   <Name>' + key + '</Name>\
	   <ogc:Filter>\
		 <ogc:PropertyIsEqualTo>\
		   <ogc:PropertyName>data_availability</ogc:PropertyName>\
		   <ogc:Literal>' + key + '</ogc:Literal>\
		 </ogc:PropertyIsEqualTo>\
	   </ogc:Filter>\
	   <PointSymbolizer>\
	   <Graphic>\
		 <Mark>\
		   <WellKnownName>circle</WellKnownName>\
		   <Fill>\
			 <CssParameter name="fill">' + styleParams[key].fill + '</CssParameter>\
		   </Fill>\
		   <Stroke>\
			 <CssParameter name="stroke">' + styleParams[key].stroke + '</CssParameter>\
			 <CssParameter name="opacity">' + styleParams[key].strokeOpacity + '</CssParameter>\
		   </Stroke>\
		 </Mark>\
		 <Size>' + styleParams[key].radius + '</Size>\
	   </Graphic>\
	 </PointSymbolizer>\
	 </Rule>'
	 }).join()
	sldStyle = '<?xml version="1.0" encoding="UTF-8"?>\
<StyledLayerDescriptor version="1.0.0" \
 xsi:schemaLocation="http://www.opengis.net/sld StyledLayerDescriptor.xsd" \
 xmlns="http://www.opengis.net/sld" \
 xmlns:ogc="http://www.opengis.net/ogc" \
 xmlns:xlink="http://www.w3.org/1999/xlink" \
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\
   <NamedLayer>\
    <Name>points_data_availability</Name>\
    <UserStyle>\
      <Title>Data availability</Title>\
      <Abstract>Data availability</Abstract>\
      <FeatureTypeStyle>' + sldStyle + '</FeatureTypeStyle>\
    </UserStyle>\
   </NamedLayer>\
</StyledLayerDescriptor>'
	return sldStyle
}

// tools

function geojson2rast(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!req.body) {
		res.status(400).send("request body missing")
		return
	}
	if(!req.body.features) {
		res.status(400).send("features missing")
		return
	}
	if(req.body.features.length == 0) {
		res.status(400).send("features array is empty")
		return
	}
	var metadata = {
		timeupdate: (req.body.features[0].properties) ? new Date(req.body.features[0].properties.timeupdate) : undefined,
		timestart: (req.body.features[0].properties) ? new Date(req.body.features[0].properties.timestart) : undefined,
		timeend: (req.body.features[0].properties) ? new Date(req.body.features[0].properties.timeend) : undefined,
		series_id: filter.series_id
	}
	crud.points2rast(req.body,metadata,options)
	.then(obs=>{
		options.location = "public/rast"
		options.prefix = "geojson2rast"
		return print_rast(options,{},obs)
	})
	.then(result=>{
		res.setHeader('content-type','application/tif')
		res.download(path.resolve(result.filename))
		return
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({error:e.toString()})
	})
}

function read_pp_cdp(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	if(!filter.timestart) {
		res.status(400).send("falta timestart")
		return
	}
	var timestart = new Date(filter.timestart)
	if(timestart.toString() == "Invalid Date") {
		return Promise.reject("fecha: Invalid Date")
	}
	timestart = new Date(timestart.getUTCFullYear(),timestart.getUTCMonth(),timestart.getUTCDate(),9)
	var timeend = new Date(timestart.getTime() + 24*3600*1000)
	crud.getObservaciones("rast",{timestart:timestart,timeend:timeend,series_id:8})
	.then(obs=>{
		if(obs.length == 0) {
			return Promise.reject("not found")
		}
		options.location = "public/rast"
		options.prefix = "pp_cdp"
		return print_rast(options,{},obs[0])
	})
	.then(result=>{
		res.setHeader('content-type','application/tif')
		res.download(path.resolve(result.filename))
		return
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({error:e.toString()})
	})	
}
function get_pp_cdp(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}	
	crud.get_pp_cdp_diario(filter.timestart,filter,options)
	.then(obs=>{
		if(options.no_send_data) {
			res.send(obs)
			return
		} else {
			options.location = "public/rast"
			options.prefix = "pp_cdp"
			return print_rast(options,{},obs)
			.then(result=>{
				res.setHeader('content-type','application/tif')
				res.download(path.resolve(result.filename))
				return
			})
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({error:e.toString()})
	})	
}
function upsert_pp_cdp(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	crud.get_pp_cdp_diario(filter.timestart,filter,options,true)
	.then(obs=>{
		if(options.no_send_data) {
			res.send(obs)
			return 
		} else {
			options.location = "public/rast"
			options.prefix = "pp_cdp"
			return print_rast(options,{},obs)
			.then(result=>{
				res.setHeader('content-type','application/tif')
				res.download(path.resolve(result.filename))
				return
			})
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({error:e.toString()})
	})	
}
function get_pp_cdp_semanal(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}	
	crud.get_pp_cdp_semanal(filter.timestart,filter,options)
	.then(obs=>{
		if(options.no_send_data) {
			res.send(obs)
			return
		} else {
			options.location = "public/rast"
			options.prefix = "pp_cdp_semanal"
			return print_rast(options,{},obs)
			.then(result=>{
				res.setHeader('content-type','application/tif')
				res.download(path.resolve(result.filename))
				return
			})
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({error:e.toString()})
	})	
}
function get_pp_cdp_batch(req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}	
	crud.get_pp_cdp_batch(filter.timestart,filter.timeend,filter,options,true)
	.then(result=>{
		res.send(result)
		return
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send({error:e.toString()})
	})	
}

	// OBTIENE PRODUCTO DE PRECIPITACION CDP PREVIAMENTE GENERADO
function get_pp_cdp_product(req,res) {
	var tipo= (req.query) ? (req.query.tipo) ? req.query.tipo : "diario" : "diario"
	var fecha = (req.query) ? (req.query.fecha) ? req.query.fecha : undefined : undefined
	var producto = (req.query) ? (req.query.producto) ? req.query.producto : "surf_png" : "surf_png"
	const valid_products = {
		"surf_png": { suffix: "_surf.png", contentType: "image/png", extent: [-68.5,-39,-41.5,-12]},
		"surf_tif": { suffix: "_surf.tif", contentType: "image/tif", extent : [-70,-40,-40,-10]},
		"points_geojson": { suffix: ".json", contentType: "application/json", extent : [-70,-40,-40,-10]},
		"points_csv": { suffix: ".csv", contentType: "text/plain", extent : [-70,-40,-40,-10]},
		"nearest_png": { suffix: "_nearest.png", contentType: "image/png", extent : [-70,-40,-40,-10]},
		"nearest_tif": { suffix: "_nearest.tif", contentType: "image/tif", extent : [-70,-40,-40,-10]}
	}
	tipo = tipo.toLowerCase()
	if(!fecha) {
		if(tipo == "diario") {
			fecha = new Date(new Date().getTime() - 1000*3600*35)
		} else if (tipo == "semanal") {
			fecha = new Date(new Date().getTime() - 1000*3600*(35 + 7*24))
		} else {
			res.status(400).send("Invalid tipo [diario|semanal]")
			return
		}
	} else {
		fecha = new Date(fecha)
	}
	if(fecha.toString() == "Invalid Date") {
		res.status(400).send("Invalid fecha")
		return
	}
	producto = producto.toLowerCase()
	if(!valid_products[producto]) {
		res.status(400).send("Invalid producto [surf_png|surf_tif|points_geojson|points_csv|nearest_png|nearest_tif]")
		return
	}
	var tipodir = (tipo == "diario") ? "pp_cdp" : "pp_cdp_semanal"
	var basedir = sprintf("data/%s/%04d/%02d", tipodir, fecha.getUTCFullYear(), fecha.getUTCMonth()+1)
	if(!fs.existsSync(path.resolve(basedir))) {
		console.log("Producto no encontrado, directorio no existe")
		res.status(404).send("Producto no encontrado, directorio no existe")
		return
	}
	var prefix = (tipo == "diario") ? "pp_diaria_" : "pp_semanal_"
	var suffix = valid_products[producto].suffix
	var filename = sprintf("%s%04d%02d%02d%s", prefix, fecha.getUTCFullYear(), fecha.getUTCMonth()+1, fecha.getUTCDate(), suffix)
	var filepath = path.resolve(basedir + "/" + filename)
	console.log({filepath:filepath})
	if(!fs.existsSync(filepath)) {
		console.log("Producto no encontrado, archivo no existe")
		res.status(404).send("Producto no encontrado, archivo no existe")
		return
	}
	fs.readFile(filepath)
	.then(data=>{
		if((req.query && req.query.no_send_data) || (req.body && req.body.no_send_data)) {
			fs.writeFile(path.resolve("public/rast/" + filename),data)
			.then(()=>{
				res.setHeader("Content-type","application/json")
				res.send({filetype: valid_products[producto].contentType, location: "rast/" + filename, extent: valid_products[producto].extent})
				return
			})
			.catch(e=>{
				throw(e)
			})
		} else {
			res.setHeader("Content-type",valid_products[producto].contentType)
			res.send(data)
			return
		}
	})
	.catch(e=>{
		console.error(e)
		res.status(500).send(e.toString())
	})
}	
//~ function upsert_pp_cdp_semanal(req,res) {
	//~ try {
		//~ var filter = getFilter(req)
		//~ var options = getOptions(req)
	//~ } catch (e) {
		//~ console.error(e)
		//~ res.status(400).send({message:"query error",error:e.toString()})
		//~ return
	//~ }
	//~ crud.get_pp_cdp_semanal(filter.timestart,filter,options,true)
	//~ .then(obs=>{
		//~ options.location = "public/rast"
		//~ options.prefix = "pp_cdp"
		//~ return print_rast(options,{},obs)
	//~ })
	//~ .then(result=>{
		//~ res.setHeader('content-type','application/tif')
		//~ res.download(path.resolve(result.filename))
		//~ return
	//~ })
	//~ .catch(e=>{
		//~ console.error(e)
		//~ res.status(400).send({error:e.toString()})
	//~ })	
//~ }

// file_indexer

function getColeccionesRaster (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error("Bad filter or options")
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	indexer.getColeccionesRaster(filter.id)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(400).send(e.toString())
	})
}

function getGridded (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	indexer.getGridded(filter)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(400).send(e.toString())
	})
}

function runGridded (req,res) {
	try {
		var filter = getFilter(req)
		var options = getOptions(req)
	} catch (e) {
		console.error(e)
		res.status(400).send({message:"query error",error:e.toString()})
		return
	}
	indexer.runGridded(filter.col_id,options)
	.then(result=>{
		res.send(result)
	})
	.catch(e=>{
		res.status(400).send(e.toString())
	})
}

// aux functions

function arr2csv(arr) {
	if(! Array.isArray(arr)) {
		throw "arr2csv: Array incorrecto" 
	}
	var lines = arr.map(line=> {
		console.log(line)
		return [line.codigo_de_estacion, line.codigo_de_variable, line.dia, line.mes, line.anio, line.hora, line.minuto, line. valor].join(",")
	})
	return lines.join("\n")
}

function csv2obs(tipo,series_id,csv) {
	// CSV fields must be: timestart, timeend, valor
	return csv.split("\n").map(r=>{
		var row=r.split(",")
		return new CRUD.observacion({tipo:tipo, series_id:series_id, timestart: new Date(row[0]), timeend: new Date(row[1]), valor: row[2]})
	})
}

function send_output(options,data,res) {
	//~ console.log({options:options,data:data})
	var output=""
	var contentType = "text/plain"
	var tipo = guess_tipo(data)
	if(options.csvless || options.csv || options.string) {
		if(Array.isArray(data)) {
			if(options.no_send_data) {
				output = "records="+data.length
			} else {
				for(var i=0; i < data.length; i++) {
					if(options.csvless) {
						output += data[i].toCSVless() + "\n"
					} if(options.csv) {
						output += data[i].toCSV() + "\n"
					} else if (options.string) {
						output += data[i].toString() + "\n"
					}
				}
			}
		} else {
			if(options.no_send_data) {
				output = "records=1"
			} else {
				if(options.csv) {
					output += data.toCSV() + "\n"
				} else if (options.string) {
					output += data.toString() + "\n"
				}
			}
		}
	} else if (options.pretty) {
		if(options.no_send_data) {
			if(Array.isArray(data)) {
				output = JSON.stringify({records:data.length},null,2)
			} else {
				output = JSON.stringify({records:1},null,2)
			}
		} else {
			output = JSON.stringify(data,null,2)
		}
		contentType="application/json"
	} else if (options.format) {
		console.log("tipo:" + tipo)
		if(options.no_send_data) {
			if(Array.isArray(data)) {
				output = JSON.stringify({records:data.length})
			} else {
				output = JSON.stringify({records:1})
			}
		} else {
			if(options.format.toLowerCase() == 'geojson') {
				if(data.toGeoJSON) {
					output = JSON.stringify(data.toGeoJSON())
				} else if (Array.isArray(data)) {
					if(data[0] && data[0].toGeoJSON) {
						var features = []
						data.forEach(d=>{
							features.push(...d.toGeoJSON().features)
						})
						output = JSON.stringify({'type':'FeatureCollection','features':features})
					} else {
						output = JSON.stringify({'type':'FeatureCollection','features':data.map(d=>{
							if(d.geom) {
								var properties = d
								return {
									type: "Feature",
									geometry: d.geom,
									properties: Object.keys(properties).filter(key=>key!="geom").reduce((obj,key)=>{
										obj[key] = d[key]
										return obj
									},{})
								}
							} else {
								return d.valor
							}
						})})
					}
				} else {
					if(data.geom) {
						data.geometry = data.geom
						delete data.geom
						const properties = {}
						Object.keys(data).forEach(key=>{
							if(key == "geometry") {
								return
							} else {
								properties[key] = data[key]
								delete data[key]
							}
						})
						data.properties = properties
					} 
					output = JSON.stringify({'type':'FeatureCollection','features':[data]})
				}
				contentType="application/json"
			} else if (options.format.toLowerCase() == 'mnemos') {
				if(!data.toMnemos) {
					console.error("Formato Mnemos no disponible para este objeto")
					res.status(400).send("Formato Mnemos no disponible para este objeto")
					return
				}
				contentType = "text/csv"
				output = data.toMnemos()
			} else if (options.format.toLowerCase() == 'json') {
				output = JSON.stringify(data)
			} else if (["rast","raster"].indexOf(tipo) >=0 && ["png","gtiff","tif"].indexOf(options.format.toLowerCase()) >= 0) {
				var promises = []
				options.location = "public/rast"
				if(Array.isArray(data)) {
					data.forEach(item=>{
						promises.push(print_rast(options,{},item))
					})
				} else {
					promises.push(print_rast(options,{},data))
				}
				return Promise.all(promises)
				.then(result=>{
					if(!result) {
						console.log({message:"Nothing found"})
						res.status(404).send({message:"Nothing found"})
						return
					} 
					console.log("Results: " + result.length)
					// if(options.get_raster) {
						if(result.length > 1) {
							var tarfile = result[0].filename + ".tgz"
							console.log("creando " + tarfile)
							return tar.c(
								{
									gzip: true,
									file: tarfile,
									cwd: "public/rast"
								},
								result.map(r=> r.filename.replace(/^.*\//,""))
							).then(_ => {
								console.log("tarball creado")
								console.log("sending file " + tarfile)
								res.setHeader('content-type','application/gzip')
								res.download(path.resolve(tarfile),tarfile.replace(/^.*\//,"")) //.replace(/^public\//,"")) // result[0].filename.replace(/^public/,req.protocol + "://" + req.get('host')))
								return
							})
						} else if (result.length == 1) {
							console.log("sending file " + result[0].filename)
							res.setHeader('content-type','image/tiff')
							res.download(path.resolve(result[0].filename),result[0].filename.replace(/^.*\//,""))
							return
						} else {
							res.status(400).send({message:"query error",error:"nothing found"})
							return
						}
					// }
					// result = result.map(r=>{
					// 	r.url = r.filename.replace(/^public/,req.protocol + "://" + req.get('host'))
					// 	//~ r.funcion = options.funcion
					// 	return r
					// })
					// send_output(options,result,res) 
				})
				.catch(e=>{
					console.error(e)
					res.status(400).send({message:"query error",error:e.toString()})
				})
			} else {
				console.error("Formato solicitado inválido: opciones: json, geojson, mnemos, csv, string")
				res.status(400).send("Formato solicitado inválido: opciones: json, geojson, mnemos, csv, string")
				return
			}
		}
	} else {
		if(options.no_send_data) {
			if(Array.isArray(data)) {
				output = JSON.stringify({records:data.length})
			} else {
				output = JSON.stringify({records:1})
			}
		} else {
			output = JSON.stringify(data)
		}
		contentType="application/json"
	}
	if(options.zip) {
		contentType="zip"
		var zip = spawn('zip',['-rj', '-', '-'])
		zip.stdout.on('data',(data)=>{
			res.write(data)
		})
		zip.on('exit', (code)=>{
			if(code !== 0) {
				res.statusCode = 500;
				console.log('zip process exited with code ' + code);
				res.end();
			} else {
				res.end();
			}
		})
		zip.stdin.write(output + "\n")
		zip.stdin.end()
	} else {
		console.log("about to send " + output.length + " characters of data")
		res.setHeader('Content-Type', contentType);
		res.end(output);
	}
}
	
// function print_rast(options,serie,obs) {
// 	// console.log({obs:obs})
// 	options.format = (options.format) ? options.format : "GTIff"
// 	var prefix = (options.prefix) ? options.prefix : "rast"
// 	var location = (options.location) ? options.location : "public"
// 	const filename = sprintf("%s/%s_%05d_%s_%s\.%s", location, prefix, obs.series_id, obs.timestart.toISOString().substring(0,10), obs.timeend.toISOString().substring(0,10), options.format)
// 	//~ res.writeHead(200,
// 		//~ 'Content-type': 'image/tiff',
// 		//~ 'Content-length': obs.valor.length,
// 		//~ 'filename': filename
// 	//~ )
// 	//~ res.write(obs.valor)
// 	//~ res.end()
// 	console.log("rest.print_rast: filename: " +filename)
// 	return fs.writeFile(filename, obs.valor,{encoding:"utf8"})
// 	.then(()=>{
// 		var addMD = exec('gdal_edit.py -mo "series_id=' + obs.series_id + '" -mo "timestart=' + obs.timestart.toISOString() + '" -mo "timeend=' + obs.timeend.toISOString() + '" ' + filename)
// 		return promiseFromChildProcess(addMD,filename)
// 	})
// 	.then(filename=>{
// 		if(serie && options.series_metadata) {
// 			var addMD = exec('gdal_edit.py -mo "var_id=' + serie["var"].id + '" -mo "var_nombre=' + serie["var"].nombre + '" -mo "unit_id=' + serie.unidades.id + '" -mo "unit_nombre=' + serie.unidades.nombre + '" -mo "proc_id=' + serie.procedimiento.id + '" -mo "proc_nombre=' + serie.procedimiento.nombre + '" -mo "fuente_id=' + serie.fuente.id + '" -mo "fuente_nombre=' + serie.fuente.nombre + '" ' + filename)
// 			return promiseFromChildProcess(addMD,filename)
// 		} else {
// 			return filename
// 		}
// 	})
// 	.then(filename=>{
// 		if(options.funcion) {
// 			var addMD=exec('gdal_edit.py -mo "agg_func=' + options.funcion + '" -mo "count=' + obs.count + '" ' + filename)
// 			return promiseFromChildProcess(addMD,filename)
// 		} else {
// 			return filename
// 		}
// 	})
// 	.then(filename=>{
// 		console.log("Se creó el archivo " + filename)
// 		var result = obs
// 		delete result.valor
// 		result.funcion = options.funcion
// 		result.filename = filename
// 		if(serie && options.series_metadata) {
// 			result.serie = {"var":serie["var"], unidades: serie.unidades, procedimiento: serie.procedimiento, fuente: serie.fuente}
// 		}
// 		return result
// 	})
// }

function getFilter(req) {
	var filter = {}
	if(req.body) {
		if(req.body.nombre) {
			filter.nombre = req.body.nombre
		}
		if(req.body.tabla) {
			filter.tabla_id = req.body.tabla
		}
		if(req.body.tabla_id) {
			filter.tabla_id = req.body.tabla_id
		}
		if(req.body.public) {
			filter.public = req.body.public
		}
		if(req.body.hisplata) {
			filter.public_his_plata = req.body.hisplata
		}
		if(req.body.public_his_plata) {
			filter.public_his_plata = req.body.public_his_plata
		}
		if(req.body.geom) {
			try {
				filter.geom = new CRUD.geometry("box",req.body.geom)
			}
			catch(e) {
				throw e
			}
		}
		if(req.body.exutorio) {
			try {
				filter.exutorio = new CRUD.geometry("box",req.body.exutorio)
			}
			catch(e) {
				throw e
			}
		}
		if(req.body.unid) {
			filter.unid = req.body.unid
		}
		if(req.body.id_externo) {
			filter.id_externo = parseStringList(req.body.id_externo)
		}
		if(req.body.id) {
			filter.id = parseIntList(req.body.id)
		}
		if(req.body.tipo) {
			filter.tipo = req.body.tipo
		}
		if(req.body.estacion_id) {
			filter.estacion_id = parseIntList(req.body.estacion_id)
		}
		if(req.body.area_id) {
			filter.area_id = parseIntList(req.body.area_id)
		}
		if(req.body.area_geom) {
			filter.area_geom = req.body.area_geom
		}
		if(req.body.var_id) {
			filter.var_id = parseIntList(req.body.var_id)
		}
		if(req.body.proc_id) {
			filter.proc_id = parseIntList(req.body.proc_id)
		}
		if(req.body.unit_id) {
			filter.unit_id = parseIntList(req.body.unit_id)
		}
		if(req.body.fuentes_id) {
			filter.fuentes_id = req.body.fuentes_id
		}
		if(req.body.seriesId) {
			filter.series_id = parseIntList(req.body.seriesId)
		}
		if(req.body.series_id) {
			filter.series_id = parseIntList(req.body.series_id)
		}
		if(req.body.red_id) {
			filter.red_id = parseIntList(req.body.red_id)
		}
		if(req.body.timestart) {
			var t_test = new Date(req.body.timestart)
			if(t_test.toString() == "Invalid Date") {
				throw("timestart: Invalid Date")
			}
			filter.timestart = req.body.timestart
		}
		if(req.body.timeend) {
			var t_test = new Date(req.body.timeend)
			if(t_test.toString() == "Invalid Date") {
				throw("timeend: Invalid Date")
			}
			filter.timeend = req.body.timeend
		}
		if(req.body.date) {
			filter.date = req.body.date
		}
		if(req.body.agg_func) {
			filter.agg_func = req.body.agg_func
		}
		if(req.body.range) {
			filter.range = req.body.range
		}
		if(req.body.valor) {
			filter.valor = req.body.valor
		}
		if(req.body.solohidro) {
			filter.solohidro = req.body.solohidro
		}
		if(req.body.precision) {
			filter.precision = req.body.precision
		}
		if(req.body.t_offset) {
			filter.precision = req.body.t_offset
		}
		if(req.body.inst) {
			filter.inst = req.body.inst
		}
		if(req.body.time_support) {
			filter.time_support = req.body.time_support
		}
		if(req.body.format) {
			filter.format = req.body.format
		}
		if(req.body.cuantil) {
			filter.cuantil = req.body.cuantil
		}
		if(req.body.percentil) {
			filter.percentil = req.body.percentil
		}
		if(req.body.doy) {
			filter.doy = req.body.doy
		}
		if(req.body.cal_id) {
			filter.cal_id = req.body.cal_id
		}
		if(req.body.model_id) {
			filter.model_id = req.body.model_id
		}
		if(req.body.cor_id) {
			filter.cor_id = req.body.cor_id
		}
		if(req.body.forecast_timestart) {
			var t_test = new Date(req.body.forecast_timestart)
			if(t_test.toString() == "Invalid Date") {
				throw("forecast_timestart: Invalid Date")
			}
			filter.forecast_timestart = req.body.forecast_timestart
		}
		if(req.body.forecast_timeend) {
			var t_test = new Date(req.body.forecast_timeend)
			if(t_test.toString() == "Invalid Date") {
				throw("forecast_timeend: Invalid Date")
			}
			filter.forecast_timeend = req.body.forecast_timeend
		}
		if(req.body.forecast_date) {
			filter.forecast_date = req.body.forecast_date
		}
		if(req.body.includeCorr) {
			filter.includeCorr = req.body.includeCorr
		}
		if(req.body.qualifier) {
			filter.qualifier = req.body.qualifier
		}
		if(req.body.name_contains) {
			filter.name_contains = req.body.name_contains
		}
		if(req.body.orden) {
			filter.orden = req.body.orden
		}
		["source_tipo","source_series_id","dest_tipo","dest_series_id","source_var_id","dest_var_id","source_proc_id","dest_proc_id","provider_id","var","abrev","type", "datatype", "valuetype", "GeneralCategory", "VariableName", "SampleMedium","def_unit_id","timeSupport","no_metadata","habilitar","provincia","pais","rio","has_obs","automatica","propietario","abreviatura","url","localidad","real","nivel_alerta","nivel_evacuacion","nivel_aguas_bajas","altitud","distrito","escena_id","accessor","asociacion","exutorio_id","cal_grupo_id","has_prono","col_id"].forEach(k=>{
			if(req.body[k]) {
				filter[k] = req.body[k]
			}
		})
	}
	if(req.query) {
		if(req.query.nombre) {
			filter.nombre = req.query.nombre
		}
		if(req.query.tabla) {
			filter.tabla_id = req.query.tabla
		}
		if(req.query.tabla_id) {
			filter.tabla_id = req.query.tabla_id
		}
		if(req.query.public) {
			filter.public = req.query.public
		}
		if(req.query.hisplata) {
			filter.public_his_plata = req.query.hisplata
		}
		if(req.query.public_his_plata) {
			filter.public_his_plata = req.query.public_his_plata
		}
		if(req.query.geom) {
			try {
				filter.geom = new CRUD.geometry("box",req.query.geom)
			}
			catch (e) {
				throw e
			}
		}
		if(req.query.exutorio) {
			try {
				filter.exutorio = new CRUD.geometry("box",req.query.exutorio)
			}
			catch (e) {
				throw e
			}
		}
		if(req.query.unid) {
			filter.unid = req.query.unid
		}
		if(req.query.id_externo) {
			filter.id_externo = parseStringList(req.query.id_externo)
		}
		if(req.query.id) {
			filter.id = parseIntList(req.query.id)
		}
		if(req.query.tipo) {
			filter.tipo = req.query.tipo
		}
		if(req.query.estacion_id) {
			//~ console.log({estacion_id:req.query.estacion_id})
			filter.estacion_id = parseIntList(req.query.estacion_id)
		}
		if(req.query.area_id) {
			filter.area_id = parseIntList(req.query.area_id)
		}
		if(req.query.area_geom) {
			filter.area_geom = req.query.area_geom
		}
		if(req.query.var_id) {
			filter.var_id = parseIntList(req.query.var_id)
		}
		if(req.query.proc_id) {
			filter.proc_id = parseIntList(req.query.proc_id)
		}
		if(req.query.unit_id) {
			filter.unit_id = parseIntList(req.query.unit_id)
		}
		if(req.query.fuentes_id) {
			filter.fuentes_id = parseIntList(req.query.fuentes_id)
		}
		if(req.query.seriesId) {
			filter.series_id = parseIntList(req.query.seriesId)
		}
		if(req.query.series_id) {
			filter.series_id = parseIntList(req.query.series_id)
		}
		if(req.query.red_id) {
			filter.red_id = parseIntList(req.query.red_id)
		}
		if(req.query.timestart) {
			var t_test = new Date(req.query.timestart)
			if(t_test.toString() == "Invalid Date") {
				throw("timestart: Invalid Date")
			}
			filter.timestart = req.query.timestart
		}
		if(req.query.timeend) {
			var t_test = new Date(req.query.timeend)
			if(t_test.toString() == "Invalid Date") {
				throw("timeend: Invalid Date")
			}
			filter.timeend = req.query.timeend
		}
		if(req.query.date) {
			filter.date = req.query.date
		}
		if(req.query.agg_func) {
			filter.agg_func = req.query.agg_func
		}
		if(req.query.range) {
			filter.range = req.query.range
		}
		if(req.query.valor) {
			filter.valor = req.query.valor
		}
		if(req.query.solohidro) {
			filter.solohidro = req.query.solohidro
		}
		if(req.query.precision) {
			filter.precision = req.query.precision
		}
		if(req.query.t_offset) {
			filter.precision = req.query.t_offset
		}
		if(req.query.inst) {
			filter.inst = req.query.inst
		}
		if(req.query.time_support) {
			filter.time_support = req.query.time_support
		}
		if(req.query.format) {
			filter.format = req.query.format
		}
		if(req.query.cuantil) {
			filter.cuantil = req.query.cuantil
		}
		if(req.query.percentil) {
			filter.percentil = parseFloatList(req.query.percentil)
		}
		if(req.query.doy) {
			filter.doy = parseIntList(req.query.doy)
		}
		if(req.query.forecast_date) {
			filter.forecast_date = req.query.forecast_date
		} 
		if(req.query.dow) {
			filter.dow = req.query.dow
		} 
		if(req.query.file) {
			filter.file = req.query.file
		}
		if(req.query.cal_id) {
			filter.cal_id = req.query.cal_id
		}
		if(req.query.model_id) {
			filter.model_id = req.query.model_id
		} 
		if(req.query.cor_id) {
			filter.cor_id = req.query.cor_id
		}
		if(req.query.forecast_timestart) {
			var t_test = new Date(req.query.forecast_timestart)
			if(t_test.toString() == "Invalid Date") {
				throw("forecast_timestart: Invalid Date")
			}
			filter.forecast_timestart = req.query.forecast_timestart
		}
		if(req.query.forecast_timeend) {
			var t_test = new Date(req.query.forecast_timeend)
			if(t_test.toString() == "Invalid Date") {
				throw("forecast_timeend: Invalid Date")
			}
			filter.forecast_timeend = req.query.forecast_timeend
		}
		if(req.query.forecast_date) {
			filter.forecast_date = req.query.forecast_date
		}
		if(req.query.includeCorr) {
			filter.includeCorr = req.query.includeCorr
		}
		if(req.query.qualifier) {
			filter.qualifier = req.query.qualifier
		}
		if(req.query.name_contains) {
			filter.name_contains = req.query.name_contains
		}
		if(req.query.orden) {
			filter.orden = req.query.orden
		}
		["source_tipo","source_series_id","dest_tipo","dest_series_id","source_var_id","dest_var_id","source_proc_id","dest_proc_id","provider_id","var","abrev","type", "datatype", "valuetype", "GeneralCategory", "VariableName", "SampleMedium","def_unit_id","timeSupport","no_metadata","id_grupo","habilitar","provincia","pais","rio","has_obs","automatica","propietario","abreviatura","url","localidad","real","nivel_alerta","nivel_evacuacion","nivel_aguas_bajas","altitud","distrito","escena_id","accessor","asociacion","exutorio_id","cal_grupo_id","has_prono","data_availability","col_id"].forEach(k=>{
			if(req.query[k]) {
				filter[k] = req.query[k]
			}
		})
	}
	if(req.params) {
		if(req.params.id) {
			filter.id = req.params.id
		}
		if(req.params.cal_id) {
			filter.cal_id = req.params.cal_id
		}
		if(req.params.orden) {
			filter.orden = req.params.orden
		}
		if(req.params.series_id) {
			filter.series_id = parseIntList(req.params.series_id)
		}
		if(req.params.cuantil) {
			filter.cuantil = req.params.cuantil
		}
		if(req.params.tipo) {
			filter.tipo = req.params.tipo
		}
		if(req.params.fuentes_id) {
			filter.fuentes_id = req.params.fuentes_id
		}
		if(req.params.date) {
			filter.date = req.params.date
		}
		if(req.params.timestart) {
			var t_test = new Date(req.params.timestart)
			if(t_test.toString() == "Invalid Date") {
				throw("timestart: Invalid Date")
			}
			filter.timestart = req.params.timestart
		}
		if(req.params.timeend) {
			var t_test = new Date(req.params.timeend)
			if(t_test.toString() == "Invalid Date") {
				throw("timeend: Invalid Date")
			}
			filter.timeend = req.params.timeend
		}
		if(req.params.dt) {
			filter.dt = req.params.dt
		}
		if(req.params.var_id) {
			filter.var_id = req.params.var_id
		}
		if(req.params.cor_id) {
			filter.cor_id = req.params.cor_id
		}
		if(req.params.col_id) {
			filter.col_id = req.params.col_id
		}
	}
	//~ if(filter.geom) {
		//~ console.log(filter.geom.toString())
	//~ }
	return filter
}

function getOptions(req) {
	var options = {}
	if(req.body) {
		if(req.body.format) {
			switch(req.body.format.toLowerCase()) {
				case "csvless":
					options.csvless = true
					break;
				case "csv":
					options.csv = true
					break;
				case "txt":
					options.string = true
					break;
				case "string":
					options.string = true
					break;
				default:
					break;
			}
		}
		if(req.body.pretty) {
			options.pretty = true
		}
		if(req.body.getStats) {
			options.getStats = true
		}
		if(req.body.funcion) {
			options.funcion = req.body.funcion //~ .option('-f, --funcion <value>', 'funcion de agregacion temporal (defaults to SUM')
		}
		if(req.body.bbox) {
			try {
				options.bbox = new CRUD.geometry("box",req.body.bbox) //~ .option('-b, --bbox <value>', 'bounding box para subset')
			} catch (e) {
				throw e
			}
		}
		if(req.body.pixel_height) {
			options.pixel_height = req.body.pixel_height
		}
		if(req.body.pixel_width) {
			options.pixel_width = req.body.pixel_width
		}
		if(req.body.srid) {
			options.srid = req.body.srid
		}
		if(req.body.format) {
			options.format = req.body.format
		}
		if(req.body.series_metadata) {
			options.series_metadata = req.body.series_metadata
		}
		if(req.body.includeProno) {
			options.includeProno = (req.body.includeProno.toString().toLowerCase() == 'true')
		}
		if(req.body.includeCorr) {
			options.includeCorr = (req.body.includeCorr.toString().toLowerCase() == 'true')
		}
		if(req.body.no_update) {
			options.no_update = (req.body.no_update.toString().toLowerCase() == 'true')
		}
		if(req.body.no_insert) {
			options.no_insert = (req.body.no_insert.toString().toLowerCase() == 'true')
		}
		if(req.body.no_send_data) {
			options.no_send_data = (req.body.no_send_data.toString().toLowerCase() == 'true')
		}
		if(req.body.cume_dist) {
			options.cume_dist = (req.body.cume_dist.toString().toLowerCase() == 'true')
		}
		if(req.body.update) {
			options.update = (req.body.update.toString().toLowerCase() == 'true')
		}
		if(req.body.no_download) {
			options.no_download = (req.body.no_download.toString().toLowerCase() == 'true')
		} 
		if(req.body.run_asociaciones) {
			options.run_asociaciones = (req.body.run_asociaciones.toString().toLowerCase() == 'true')
		}
		if(req.body.no_geom) {
			options.no_geom = (req.body.no_geom.toString().toLowerCase() == 'true')
		}
		if(req.body.no_metadata) {
			options.no_metadata = (req.body.no_metadata.toString().toLowerCase() == 'true')
		}
		if(req.body.skip_nulls) {
			options.skip_nulls = (req.body.skip_nulls.toString().toLowerCase() == 'true')
		}
		if(req.body.no_update_areales) {
			options.no_update_areales = (req.body.no_update_areales.toString().toLowerCase() == 'true')
		}
		if(req.body.inst) {
			options.inst = (req.body.inst.toString().toLowerCase() == 'true')
		}
		if(req.body.deleteSkipped) {
			options.deleteSkipped = (req.body.deleteSkipped.toString().toLowerCase() == 'true')
		}
		if(req.body.returnSkipped) {
			options.returnSkipped = (req.body.returnSkipped.toString().toLowerCase() == 'true')
		}
		if(req.body.zip) {
			options.zip = (req.body.zip.toString().toLowerCase() == 'true')
		}
		["agg_func","dt","t_offset","id_grupo","get_raster","min_count","group_by_cal","interval"].forEach(k=>{
			if(req.body[k]) {
				options[k] = req.body[k]
			}
		})
	}
	if(req.query) {
		if(req.query.format) {
			switch(req.query.format.toLowerCase()) {
				case "csvless":
					options.csvless = true
					break;
				case "csv":
					options.csv = true
					break;
				case "txt":
					options.string = true
					break;
				case "string":
					options.string = true
					break;
				default:
					break;
			}
		}
		if(req.query.pretty) {
			options.pretty = true
		}
		if(req.query.getStats) {
			options.getStats = true
		}
		if(req.query.funcion) {
			options.funcion = req.query.funcion //~ .option('-f, --funcion <value>', 'funcion de agregacion temporal (defaults to SUM')
		}
		if(req.query.bbox) {
			try {
				options.bbox = new CRUD.geometry("box",req.query.bbox) //~ .option('-b, --bbox <value>', 'bounding box para subset')
			} catch (e) {
				throw e
			}
		}
		if(req.query.pixel_height) {
			options.pixel_height = req.query.pixel_height
		}
		if(req.query.pixel_width) {
			options.pixel_width = req.query.pixel_width
		}
		if(req.query.srid) {
			options.srid = req.query.srid
		}
		if(req.query.format) {
			options.format = req.query.format
		}
		if(req.query.series_metadata) {
			options.series_metadata = req.query.series_metadata
		}
		if(req.query.includeProno) {
			options.includeProno = (req.query.includeProno.toString().toLowerCase() == 'true')
		}
		if(req.query.includeCorr) {
			options.includeCorr = (req.query.includeCorr.toString().toLowerCase() == 'true')
		}
		if(req.query.no_update) {
			options.no_update = (req.query.no_update.toString().toLowerCase() == 'true')
		}
		if(req.query.no_insert) {
			options.no_insert = (req.query.no_insert.toString().toLowerCase() == 'true')
		}
		if(req.query.no_send_data) {
			options.no_send_data = (req.query.no_send_data.toString().toLowerCase() == 'true')
		}
		if(req.query.cume_dist) {
			options.cume_dist = (req.query.cume_dist.toString().toLowerCase() == 'true')
		}
		if(req.query.update) {
			options.update = (req.query.update.toString().toLowerCase() == 'true')
		} 
		if(req.query.no_download) {
			options.no_download = (req.query.no_download.toString().toLowerCase() == 'true')
		} 
		if(req.query.run_asociaciones) {
			options.run_asociaciones = (req.query.run_asociaciones.toString().toLowerCase() == 'true')
		} 
		if(req.query.no_geom) {
			options.no_geom = (req.query.no_geom.toString().toLowerCase() == 'true')
		}
		if(req.query.no_metadata) {
			options.no_metadata = (req.query.no_metadata.toString().toLowerCase() == 'true')
		}
		if(req.query.skip_nulls) {
			options.skip_nulls = (req.query.skip_nulls.toString().toLowerCase() == 'true')
		}
		if(req.query.no_update_areales) {
			options.no_update_areales = (req.query.no_update_areales.toString().toLowerCase() == 'true')
		}
		if(req.query.inst) {
			options.inst = (req.query.inst.toString().toLowerCase() == 'true')
		}
		if(req.query.deleteSkipped) {
			options.deleteSkipped = (req.query.deleteSkipped.toString().toLowerCase() == 'true')
		}
		if(req.query.returnSkipped) {
			options.returnSkipped = (req.query.returnSkipped.toString().toLowerCase() == 'true')
		}
		if(req.query.zip) {
			options.zip = (req.query.zip.toString().toLowerCase() == 'true')
		}
		["agg_func","dt","t_offset","get_raster","min_count","group_by_cal","interval"].forEach(k=>{
			if(req.query[k]) {
				options[k] = req.query[k]
			}
		})

	}
	if(req.params) {
		if(req.params.dt) {
			options.dt = req.params.dt
		}
	}
	if(req.headers) {
		if(req.header('Accept')) {
			switch(req.header('Accept').toLowerCase()) {
				case "text/csv":
					options.csv = true
					break;
				case "text/plain":
					options.string = true
					break;
				default:
					break;
			}
		}
	}
	return options
}

function parseIntList(param) {
	return (Array.isArray(param)) ? (param.length == 0) ? null : param.map(i=>parseInt(i)) : (/^\d+(\,\d+)+$/.test(param)) ? param.split(",").map(i=>parseInt(i)) : parseInt(param)
}
function parseFloatList(param) {
	return (Array.isArray(param)) ? (param.length == 0) ? null : param.map(i=>parseFloat(i)) : (/^\d+(\.\d+)?(\,\d+(\.\d+)?)+$/.test(param)) ? param.split(",").map(i=>parseFloat(i)) : parseFloat(param)
}
function parseStringList(param) {
	return (Array.isArray(param)) ? (param.length == 0) ? null : param.map(i=>i.toString()) : (/^.+(\,.+)+$/.test(param)) ? param.split(",").map(i=>i.toString()) : param.toString()
}

function checkRequiredArgs(required,filter) {
	var check=true
	for(var i=0;i<required.length;i++){
		var arg=required[i]
		//~ console.log({key:arg, value: filter[arg], type_of:typeof filter[arg]})
		if(typeof filter[arg] === 'undefined') {
			check=false
		}
	}
	return check
}

function promiseFromChildProcess(child,filename) {
	return new Promise(function (resolve, reject) {
		child.addListener("error", reject);
		child.addListener("exit", resolve(filename));
		child.stdout.on('data', function(data) {
			console.log('stdout: ' + data);
		});
		child.stderr.on('data', function(data) {
			console.log('stderr: ' + data);
		});
	});
}

function countValidFilters(valid_filters={},filter={}) {
	var count_filters = 0
	var valid_filter_keys = Object.keys(valid_filters)
	var filter_keys = Object.keys(filter)
	for(var i=0;i<filter_keys.length;i++) {
		if(valid_filter_keys.indexOf(filter_keys[i]) >= 0) {
			count_filters++
		}
	}
	return count_filters
}

function logMemUsage(logfile="logs/memUsage.log") {
	var mu = process.memoryUsage()
	var now = new Date()
	var line = [now.toISOString(),mu.rss,mu.heapTotal,mu.heapUsed,mu.external].join(",") + "\n"
	// console.log(line)
	fs.appendFileSync(logfile,line)
}

function guess_tipo (data) {
	if(!data) {
		return undefined
	}
	if(Array.isArray(data) && data.length) {
		var tipo_guess = data[0].tipo
		var count = 0
		for(var i in data) {
			if (data[i].tipo != tipo_guess) {
				break
			}
			count++
		}
		if(count == data.length) {
			return tipo_guess
		} else {
			return undefined // mixed tipos
		}
	} else {
		return data.tipo
	}
}

app.listen(port, (err) => {
	if (err) {
		return console.log('Err',err)
	}
	console.log(`server listening on port ${port}`)
})

