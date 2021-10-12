'use strict'

const request = require('request')
var fs =require("fs")
// var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf
const express = require('express')
const app = express()
const exphbs = require('express-handlebars')
const  hbs = exphbs.create({
	defaultLayout: 'main'
	// helpers: {
	// 	'ifEquals': (v1,v2,options)=> {
	// 		return (v1 == v2) ? options.fn(this) : options.inverse(this) 
	// 	}
	// }
})
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.use(express.static('public', {
	setHeaders: function (res, path, stat) {
		res.set('x-timestamp', Date.now())
		//~ console.log({path:path})
		var contenttype = (/\/js\//.test(path)) ? "text/javascript" : (/\/css\//.test(path)) ? "text/css" : (/\/html\//.test(path)) ? "text/html" : (/\/img\//.test(path)) ? (/\.gif$/.test(path)) ? "image/gif" : "image/png" : (/\/planillas\//.test(path)) ?  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"  : (/\/json\//.test(path)) ? "application/json" : "text/html"
		//~ console.log({contenttype:contenttype})
		res.set('Content-Type', contenttype)
	}
}));

// var bodyParser = require('body-parser')
// const { body } = require('express-validator');
// const querystring = require('querystring');

// const readline = require("readline");
// const { exec } = require('child_process');

// const crypto = require('crypto')

const config = require('config');
const { Pool, Client } = require('pg')
const pool = new Pool(config.database)

const app_list = config.app_list
const Controller = require('./controllerPromise.js')
const controller = new Controller.controller(app_list,config)

const auth = require('./authentication.js')(app,config,pool)
const passport = auth.passport
app.use(express.urlencoded())
// const LocalStrategy = require('passport-local').Strategy;
const port = config.rest.port

const userAdmin = require('./userAdmin.js')(app,config,pool)

const waitToRedirectTime = 500

app.get('/start/:appname',auth.isAdmin,(req,res)=>{
    controller.startAppSt(req.params.appname)
	.then(result=>{
		if(req.query.redirect) {
			return waitAndRedirect(req.query.redirect,res)
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})


app.get('/start',auth.isAdmin,(req,res)=>{
	console.log("appController start @ " + new Date().toISOString())
	controller.startAppStAll()
	.then(result=>{
		if(req.query.redirect) {
			return waitAndRedirect(req.query.redirect,res)
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get('/check/:appname',auth.isAdmin,(req,res)=>{
	console.log("appController check @ " + new Date().toISOString())
    controller.checkApp(req.params.appname)
	.then(result=>{
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})
	
app.get('/check',auth.isAdmin,(req,res)=>{
	console.log("appController check @ " + new Date().toISOString())
    controller.checkAppAll()
	.then(result=>{
		var apps = result.map(app=>{
			app.webdir = app_list[app.app_name].webdir
			app.port = app_list[app.app_name].port
			app.testpath = app_list[app.app_name].testpath
			app.initpath = app_list[app.app_name].initpath
			return app
		})
        res.send(apps)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get('/checkStatus/:appname',auth.isAdmin,(req,res)=>{
	console.log("appController checkStatus @ " + new Date().toISOString())
    controller.checkAppStatus(req.params.appname)
	.then(result=>{
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get('/checkStatus',auth.isAdmin,(req,res)=>{
	console.log("appController checkStatus @ " + new Date().toISOString())
    controller.checkAppStatusAll()
	.then(result=>{
		var apps = result.map(app=>{
			app.webdir = app_list[app.app_name].webdir
			app.port = app_list[app.app_name].port
			app.testpath = app_list[app.app_name].testpath
			app.initpath = app_list[app.app_name].initpath
			return app
		})
        res.send(apps)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get('/hard_stop/:appname',auth.isAdmin,(req,res)=>{
	console.log("appController hard_stop @ " + new Date().toISOString())
    controller.stopApp(req.params.appname)
	.then(result=>{
		if(req.query.redirect) {
			return waitAndRedirect(req.query.redirect,res)
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})
	
app.get('/hard_stop',auth.isAdmin,(req,res)=>{
	console.log("appController hard_stop @ " + new Date().toISOString())
    controller.stopAppAll()
	.then(result=>{
		if(req.query.redirect) {
			return waitAndRedirect(req.query.redirect,res)
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get('/stop/:appname',auth.isAdmin,(req,res)=>{
	console.log("appController stop @ " + new Date().toISOString())
    controller.stopApp2(req.params.appname)
	.then(result=>{
		if(req.query.redirect) {
			return waitAndRedirect(req.query.redirect,res)
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})
	
app.get('/stop',auth.isAdmin,(req,res)=>{
	console.log("appController stop @ " + new Date().toISOString())
    controller.stopApp2All()
	.then(result=>{
		if(req.query.redirect) {
			return waitAndRedirect(req.query.redirect,res)
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get('/restart/:appname',auth.isAdmin,(req,res)=>{
	console.log("appController restart @ " + new Date().toISOString())
    controller.restartApp(req.params.appname)
	.then(result=>{
		if(req.query.redirect) {
			return waitAndRedirect(req.query.redirect,res)
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get('/restart',auth.isAdmin,(req,res)=>{
	console.log("appController restart @ " + new Date().toISOString())
	controller.restartAppAll()
	.then(result=>{
		if(req.query.redirect) {
			return waitAndRedirect(req.query.redirect,res)
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get('/hard_restart/:appname',auth.isAdmin,(req,res)=>{
	console.log("appController hard_restart @ " + new Date().toISOString())
    controller.hardRestartApp(req.params.appname)
	.then(result=>{
		if(req.query.redirect) {
			res.redirect(req.query.redirect)
			return
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get('/hard_restart',auth.isAdmin,(req,res)=>{
	console.log("appController hard_restart @ " + new Date().toISOString())
	controller.hardRestartAppAll()
	.then(result=>{
		if(req.query.redirect) {
			res.redirect(req.query.redirect)
			return
		}
        res.send(result)
    })
	.catch(err=>{
		res.status(400).send({status:"failure",message:err.toString()})
	})
})

app.get("/exit",auth.isAdmin,(req,res)=>{
	console.log("appController exit @ " + new Date().toISOString())
	res.status(200).send("Terminating Nodejs process")
	// console.log("Exit order recieved from client")
	setTimeout(()=>{
		process.exit()
	},500)
})

// GUI	

app.get('/',(req,res)=>{
	// res.send("controller running")
	if(req.user && req.user.username) {
		res.redirect('apps')
	} else {
		res.redirect('login')
	}
})

app.get('/login',(req,res)=>{
	var params = (req.query) ? req.query : {}
	if(req.user) {
		if(req.user.username) {
			params.loggedAs = req.user.username
		}
	}
	params.base_url = config.rest.base_url
	console.log({params:params})
	res.render("login",params)
})

app.post('/login',passport.authenticate('local'),(req,res)=>{
	console.log("inside login post")
	console.log({user:req.user})
	if(req.headers['content-type'] == "application/x-www-form-urlencoded" || req.headers['content-type'] == "multipart/form-data") {
		var path = (req.user.role == "admin") ? "apps" : "usuarios/" + req.user.username// (req.query) ? (req.query.path) ? req.query.path : "apps"  : "apps"
		console.log("redirecting to " + path)
		// var query = {}
		// Object.keys(req.query).forEach(key=> {
		// 	if(key != "path" && key != "redirected" && key != "unauthorized" && key != "loggedout") {
		// 		query[key] = req.query[key]
		// 	}
		// })
		// var query_string = querystring.stringify(query) // (req.body.class) ? "?class="+req.body.class : ""
		// var redirect_url = path
		// redirect_url += (query_string != "") ? ("?" + query_string) : ""
		// res.redirect(path) // redirect_url)
		res.render('login_ok',{redirect_url:path}) //,{loggedAs:req.user.username, message:"Successful login"})
		// res.send("login correct")
	} else {
		res.send({message:"Auth success"})
	}
})

app.get('/logout', function(req, res){
	// req.logout();
	// delete req.session
	req.session.destroy((err)=>{
		if (err) {
			console.error(err)
			res.status(400).send(err.toString())
			return
		}
		req.logout()
		console.log({message:"logged out"});
		res.redirect('login')
		// res.send("logged out")
	})
});

app.get('/apps',auth.isAdminView,(req,res)=>{
	controller.checkAppAll()
	.then(result=>{
		var app_status = result.map(app=>{
			app.status = (app.status == "success") ? true : false
			return app
		})
		// console.log({app_list: app_list, app_status: app_status})
		console.log({"user":req.user})
		var data = (req.user && req.user.username) ? {loggedAs: req.user.username} : {}
		data.base_url = config.rest.base_url
		res.render('apps',data) // {app_list: app_list, app_status: app_status})
	})
	.catch(err=>{
		res.status(400).send(err)
	})

})

// USERS API

app.get('/users',auth.isWriter,(req,res)=>{
	userAdmin.getUsers(req,res)
}) 
app.put('/users/:username',auth.isAdmin,(req,res)=>{
	userAdmin.createUser(req,res)
})
app.post('/users/:username',auth.isAdmin,(req,res)=>{
	userAdmin.createUser(req,res)
})

app.get('/users/:username',auth.isAuthenticated, (req,res)=>{  // passport.authenticate('local'),
	userAdmin.getUser(req,res)
})

app.post('/userChangePassword',auth.isAuthenticated, (req,res)=>{ 
	userAdmin.userChangePassword(req,res)
})

app.delete('/users/:username',auth.isAdmin,(req,res)=>{
	userAdmin.deleteUser(req,res)
})

// USERS GUI

app.get('/usuarios/:username',auth.isAuthenticatedView, (req,res)=>{ 
	userAdmin.viewUser(req,res)
})

app.get('/usuarios',auth.isAdminView, (req,res)=>{ 
	userAdmin.viewUsers(req,res)
})

app.get('/usuarionuevo',auth.isAdminView,(req,res)=>{
	userAdmin.newUserForm(req,res)
})

/////////////////////////////////////////////////////////////////

app.listen(port, (err) => {
	if (err) {
		return console.log('Err',err)
	}
	console.log(`server listening on port ${port}`)
})

function waitAndRedirect(url,res) {
	return setTimeout(()=>{
		res.redirect(url)
	},waitToRedirectTime)
}