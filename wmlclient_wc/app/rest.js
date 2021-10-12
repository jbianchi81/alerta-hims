'use strict'

const request = require('request')
const express = require('express')
const app = express()
const fs = require('fs').promises
// const request = require('request-promise')
const exphbs = require('express-handlebars')
// var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
const config = require('config')
app.use(express.static('public'));
var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 
const port = config.port

let soap_client_options = { 'request' : request.defaults(config.request_defaults), wsdl_headers: config.wsdl_headers}
const wmlclient = require('./wmlclient')
const wml = new wmlclient.client(config.wml_endpoint, soap_client_options)

const { Pool, Client } = require('pg')
const pool = new Pool(config.database)

const auth = require('./authentication.js')(app,config,pool)
const passport = auth.passport

app.get('/exit',auth.isAdmin,(req,res)=>{  // terminate Nodejs process
	res.status(200).send("Terminating Nodejs process")
	console.log("Exit order recieved from client")
	setTimeout(()=>{
		process.exit()
	},500)
})
app.get('/', (req,res)=> {
	res.send("wmlclient running")
})
app.post('/wml/getSites',getSites)
app.post('/wml/getSiteInfo',getSiteInfo)
app.post('/wml/getValues',getValues)
app.get('/wml',(req, res) => {
	if (!req.url.endsWith('/')) {
      res.redirect(301, req.url + '/')
    } else {
		renderPage(req,res)
	}
})


function getSites(req,res) {
	console.log(req.body)
	if(!req.body.bounds) {
		res.status(400).send("Falta bounds=north,south,east,west")
		return
	}
	var b = req.body.bounds.toString().split(",")
	if(b.length<4) {
		res.status(400).send("bounds incorrecto")
		return
	}
	wml.getSites(b[0],b[1],b[2],b[3],req.body.includeSeries)
	.then(sites=> {
		
		// yes includeSeries 
		if(req.body.includeSeries) {
			var series = []
			sites.forEach( site => {
				site.series.forEach(it=>{
					series.push(it)
				})
			})
			sendresult(res,series,req.body.format)
				
			// comentado: loop de llamada a getsiteinfo para cuando está implementada la opción includeSeries en el servidor
			//~ var promises = []
			//~ sites.forEach( site => {
				//~ promises.push(wml.getSiteInfo(site.siteCode))
			//~ })
			//~ Promise.all(promises)
			//~ .then(list=> {
				//~ var siteinfo = []
				//~ list.forEach(serieslist=> {
					//~ for(var i=0;i<serieslist.length;i++) {
						//~ siteinfo.push(serieslist[i])
					//~ }
				//~ })
				//~ sendresult(res,siteinfo,req.body.format)
				//~ return
			//~ })
			//~ .catch(e => {
				//~ res.status(400).send(e)
				//~ console.error(e)
			//~ })
		} else { // no IncludeSeries
			sendresult(res,sites,req.body.format)
			return
		}

		//~ return
	})
	.catch(e=>{
		console.error(e)
	})
}

function sendresult(res,result,format) {
	if(format) {
		if(format == 'geojson') {
			var collection = { 
				type: "FeatureCollection",
				features: []
			}
			result.forEach( it => {
				collection.features.push(it.toGeoJSON())
			})
			res.send(collection)
		} else if(format == 'csv') {
			var csv = ""
			result.forEach( it => {
				csv += it.toCSV() + "\n" 
			})
			res.send(csv)
		} else if(format == 'txt') {
			var txt = ""
			result.forEach( it => {
				txt += it.toString() + "\n" 
			})
			res.send(txt)
		} else if (format == 'geojson_pretty') {
			var collection = { 
				type: "FeatureCollection",
				features: []
			}
			result.forEach( it => {
				collection.features.push(it.toGeoJSON())
			})
			res.send(JSON.stringify(collection,null,4))
		} else if (format=="pretty") {
			res.send(JSON.stringify(result,null,4))
		} else {
			res.send(result)
		}
	} else {
		res.send(result)
	}
}

function getSiteInfo(req,res) {
	console.log(req.body)
	if(!req.body.site) {
		res.status(400).send("Falta site=SiteCode")
		return
	}
	wml.getSiteInfo(req.body.site)
	.then(siteinfo=> {
		sendresult(res,siteinfo,req.body.format)
		return
		//~ if(req.body.format) {
			//~ if(req.body.format == 'geojson') {
				//~ var collection = { 
					//~ type: "FeatureCollection",
					//~ features: []
				//~ }
				//~ siteinfo.forEach( series => {
					//~ collection.features.push(series.toGeoJSON())
				//~ })
				//~ res.send(collection)
			//~ } else if(req.body.format == 'csv') {
				//~ var csv = ""
				//~ siteinfo.forEach( series => {
					//~ csv += series.toCSV() + "\n" 
				//~ })
				//~ res.send(csv)
			//~ } else if(req.body.format == 'txt') {
				//~ var txt = ""
				//~ siteinfo.forEach( series => {
					//~ txt += series.toString() + "\n" 
				//~ })
				//~ res.send(txt)
			//~ } else {
				//~ res.send(siteinfo)
			//~ }
		//~ } else {
			//~ res.send(siteinfo)
		//~ }
		//~ return
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function getValues(req,res) {
	console.log(req.body)
	if(!req.body.site || ! req.body.variable || !req.body.startdate || !req.body.enddate) {
		res.status(400).send({message:"Falta site o variable o startdate o enddate",error:"Falta site o variable o startdate o enddate"})
		return
	}
	wml.getValues(req.body.site,req.body.variable,req.body.startdate,req.body.enddate)
	.then(values=> {
		res.send(values)
		return
	})
	.catch(e=>{
		console.error(e)
		res.status(400).send(e)
	})
}

function renderPage(req,res) {
	res.render('gui',{cuahsiendpoint:config.wml_endpoint})
}

app.listen(port, (err) => {
	if (err) {
		return console.log('Err',err)
	}
	console.log(`server listening on port ${port}`)
})

