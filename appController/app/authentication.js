module.exports = function (app,config,pool) {   // needs: app.use(express.urlencoded())
	const passport = require('passport');
	const LocalStrategy = require('passport-local').Strategy;
	const uuid = require('uuid/v4')
	const session = require('express-session')
	const FileStore = require('session-file-store')(session);
	var flash = require('express-flash')
	const crypto = require('crypto')
	const querystring = require('querystring');

	var module = {}
	app.use(session({
		 cookie: { expires: 10800000 }, 
		 secret: 'un chapati', 
		 key: "id",
		genid: (req) => {
			console.log('Inside session middleware genid function')
			console.log(`Request object sessionID from client: ${req.sessionID}`)
			//~ console.log({body:req.body})
			if(req.sessionID) {
				return req.sessionID
			} else {
				return uuid() // use UUIDs for session IDs
			}
		},
		store: new FileStore({logFn: function(){},path:"../appController/sessions"}),
		resave: true,
		saveUninitialized: false,
		rolling: true
	}));
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(flash());
	module.User = {
		user: class {
			constructor (user) {
				this.username = user.name
				this.password = user.password
				this.role = user.role
				this.id = user.id
				this.token = user.token
			}
			authenticate(password) {
				var digest = crypto.createHash('sha256').update(password.toString()).digest('hex')
				if(!this.password) {
					console.log("no password")
					return true
				} else if( digest == this.password.toString()) {
					console.log("password ok")
					return true
				} else {
					console.log("password incorrect")
					return false
				}
			}
		},

		authenticate: function(user,password) {
			var digest = crypto.createHash('sha256').update(password.toString()).digest('hex')
			if( digest == user.password.toString()) {
				console.log("password ok")
				return true
			} else {
				console.log("password incorrect")
				return false
			}
		},
		loadOne: function(username) {
			return pool.query("SELECT id,name, role, encode(pass_enc,'escape') AS password, encode(token,'escape') AS token FROM users WHERE name=$1", [username])
			.then(result=>{
				if(!result) {
					return
				}
				if(result.rows.length==0) {
					return
				} else {
					return new module.User.user(result.rows[0])
				}
			})
			.catch(e=>{
				console.error(e)
				return
			})
		},
		findById: function(id) {
			return pool.query("SELECT id, name, role, encode(pass_enc,'escape') AS password, encode(token,'escape') AS token FROM users WHERE id=$1", [id])
			.then(result=>{
				if(!result) {
					return
				}
				if(result.rows.length==0) {
					return
				} else {
					return new module.User.user(result.rows[0])
				}
			})
			.catch(e=>{
				console.error(e)
				return
			})	
			
		},
		findByJWT: function(token) {
			var digest = crypto.createHash('sha256').update(token.toString()).digest('hex')
			return pool.query("SELECT id,name, role, user username, role, encode(pass_enc,'escape') AS password, encode(token,'escape') AS token from users where encode(token,'escape')=$1",[digest])
			.then(result=>{
				if(!result) {
					return
				}
				if(result.rows.length==0) {
					return
				} else {
					return new module.User.user(result.rows[0])
				}
			})
			.catch(e=>{
				console.error(e)
				return
			})	
		}
	}
	// configure passport.js to use the local strategy
	passport.use(new LocalStrategy( { passReqToCallback: true, usernameField: 'username', passwordField: 'password' }, (req, username, password, done) => {      //{usernameField: 'username', passwordField: 'password'},
		if(config.verbose) {
			console.log("login attempt at " + 
			new Date().toISOString())
		}
		module.User.loadOne(username)
		.then(user=>{
			if(!user) { // User.authenticate(user,password)) {
				req.flash('error', 'Usuario no encontrado')
				if(config.verbose) {
					console.log("LocalStrategy: usuario no encontrado")
				}
				return module.loginReject(req,'Usuario no encontrado',done)
			}
			else {
				if(config.verbose) {
					console.log("LocalStrategy: got user: " + user.username + " at " + new Date().toISOString())
				}
				if (!user.authenticate(password)) { // User
					if(config.verbose) {
						console.log("LocalStrategy: Password incorrecto")
					}
					return module.loginReject(req,'Password incorrecto',done)
				}
			}
			if(config.verbose) {
				console.log("LocalStrategy: Correct login")
			}
			done(null,user)
		})
	}))

	module.loginReject = function (req,mensaje,done) { 
		console.log("rejecting login")
		if(req.headers['content-type'] == "application/x-www-form-urlencoded" || req.headers['content-type'] == "multipart/form-data") {
			var path = (req.body.path) ? req.body.path : ""
			//~ console.log("redirecting to " + path)
			req.res.redirect("login?unauthorized=true&message="+mensaje+"&path="+path)
		} else {
			req.res.status(401).send({message:mensaje})
		}
		return done(null,false, {message: "Incorrect login"})
	}
	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});
	passport.deserializeUser(function(id, done) {
		//~ console.log({id:id})
		module.User.findById(id)
		.then(user=>{
			//~ console.log({user:user})
			if(user) {
				user.authenticated = true
				done(null, user);
			} else {
				done(new Error("user not found"),null)
			}
		})
	}); 

	// my custom middleware

	module.isAuthenticated = async function (req,res,next) {
		if(config.rest.skip_authentication) {
			return next()
		}
		var user = await module.extractAndValidateToken(req) // try authentication by token (overrides session)
		if(user) {
			req.user = user
			if(config.verbose) {
				console.log("isAuthenticated:" + JSON.stringify(req.user))
			}
		}
		if(!req.user) {
			res.status(401).send("Unauthorized")
			return
		}
		if(!req.user.authenticated) {
			res.status(401).send("Unauthorized")
			return
		}
		return next()
	}

	module.isPublic = async function (req,res,next) {
		if(config.rest.skip_authentication) {
			return next()
		}
		if(config.verbose) {
			console.log("isPublic: req.user (before check):" + JSON.stringify(req.user))
		}
		var user
		if(!req.user) {
			user = await module.extractAndValidateToken(req) // try authentication by token (overrides session)
		}
		if(user) {
			req.user = user
			if(config.verbose) {
				console.log("isPublic:" + JSON.stringify(req.user))
			}
		}
		if(!req.user) {
			if(req.query) {
				req.query.public = true
			} else {
				req.query = {public:true}
			}
		} else if (!req.user.authenticated) {
			if(req.query) {
				req.query.public = true
			} else {
				req.query = {public:true}
			}
		} 
		//~ else {
			//~ if(req.query) {
				//~ req.query.public = false
			//~ } else {
				//~ req.query = {public: false}
			//~ }
		//~ }
		if(config.verbose) {
			console.log("isPublic:" + JSON.stringify(req.query))
		}
		return next()
	}


	module.isAuthenticatedView = async function (req,res,next) {
		if(config.verbose) {
			console.log("isAuthenticatedView")
		}
		if(config.rest.skip_authentication) {
			console.log("Skip authentication")
			return next()
		}
		//~ console.log(req)
		var path = (req.route) ? (req.route.path) ? req.route.path.replace(/^\//,"") : config.rest.index : config.rest.index ;
		//~ var path = (req.originalUrl) ? req.originalUrl.replace(/^\//,"") : "secciones";
		if(req.query) {
			//~ console.log("adding query string")
			path += "&" + querystring.stringify(req.query)
		} else {
			//~ console.log("no query string")
		}
		var user = await module.extractAndValidateToken(req) // try authentication by token (overrides session)
		if(user) {
			req.user = user
			if(config.verbose) {
				console.log("isAuthenticatedView:" + JSON.stringify(user))
			}	
		}
		if(!req.user) {
			res.redirect('login?redirected=true&path=' + path)
			return
		}
		if(!req.user.authenticated) {
			res.redirect('login?redirected=true&path=' + path)
			return
		}
		return next()
	}

	module.isPublicView = async function (req,res,next) {
		if(config.rest.skip_authentication) {
			req.query.writer=true
			return next()
		}
		if(!req.query) {
			req.query = {}
		}
		var user = await module.extractAndValidateToken(req) // try authentication by token (overrides session)
		if(user) {
			req.user = user
			if(config.verbose) {
				console.log("isPublicView:" + JSON.stringify(user))
			}
		}
		if(!req.user) {
			req.query.public = true
			req.query.writer = false
			req.query.authenticated = false
		} else if (!req.user.authenticated) {
			req.query.public = true
			req.query.writer = false
			req.query.authenticated = false
		} else if(req.user.role!="writer" && req.user.role!="admin") {
			req.query.writer = false
			req.query.authenticated = true
		} else {
			req.query.writer = true
			req.query.authenticated = true
		}
		return next()
	}

	module.isWriter = async function (req,res,next) {
		if(config.rest.skip_authentication) {
			return next()
		}
		var user = await module.extractAndValidateToken(req) // try authentication by token (overrides session)
		if(user) {
			req.user = user
			if(config.verbose) {
				console.log("isWriter:" + JSON.stringify(user))
			}
		}
		if(!req.user) {
			console.log("user not logged in")
			res.status(401).send("Unauthorized")
			return
		}
		if(!req.user.authenticated) {
			console.log("user not authenticated")
			res.status(401).send("Unauthorized")
			return
		}
		if(req.user.role!="writer" && req.user.role!="admin") {
			console.log("unauthorized role")
			res.status(401).send("Unauthorized")
			return
		}
		return next()
	}
		
	module.isWriterView = async function (req,res,next) {
		var path = (req.route) ? (req.route.path) ? req.route.path.replace(/^\//,"") : "secciones" : "secciones" ;
		var query_string = ""
		//~ if(req.query && req.query.class) {
			//~ querystring += "&class=" + req.query.class
		//~ }
		if(req.query) {
			console.log("adding query string")
			query_string += "&" + querystring.stringify(req.query)
		} else {
			console.log("no query string")
		}
		if(config.rest.skip_authentication) {
			return next()
		}
		var user = await module.extractAndValidateToken(req) // try authentication by token (overrides session)
		if(user) {
			req.user = user
			if(config.verbose) {
				console.log("isWriterView:" + JSON.stringify(user))
			}
		}
		if(!req.user) {
			res.redirect('login?redirected=true&path=' + path + query_string)
			return
		}
		if(!req.user.authenticated) {
			res.redirect('login?redirected=true&path=' + path  + query_string)
			return
		}
		if(req.user.role!="writer" && req.user.role!="admin") {
			console.log("unathorized role")
			res.redirect('login?redirected=true&path=' + path + "&unauthorized=true"  + query_string)
			return
		}
		return next()
	}

	module.isAdmin = async function (req,res,next) {
		if(config.rest.skip_authentication) {
			return next()
		}
		console.log({user:req.user})
		var user = await module.extractAndValidateToken(req) // try authentication by token (overrides session)
		if(user) {
			req.user = user
			if(config.verbose) {
				console.log("isAdmin:" + JSON.stringify(user))
			}
		}
		if(!req.user) {
			console.log("user not logged in")
			res.status(401).send("Unauthorized")
			return
		}
		if(!req.user.authenticated) {
			console.log("user not authenticated")
			res.status(401).send("Unauthorized")
			return
		}
		if(req.user.role!="admin") {
			console.log("unathorized role")
			res.status(401).send("Unauthorized")
			return
		}
		return next()
	}
	module.isAdminView = async function (req,res,next) {
		var path = (req.route) ? (req.route.path) ? req.route.path.replace(/^\//,"") : "" : "" ;
		var query_string = ""
		if(req.query) {
			console.log("adding query string")
			query_string += "&" + querystring.stringify(req.query)
		} else {
			console.log("no query string")
		}
		if(config.rest.skip_authentication) {
			return next()
		}
		var user = await module.extractAndValidateToken(req) // try authentication by token (overrides session)
		if(user) {
			req.user = user
			if(config.verbose) {
				console.log("isAdminView:" + JSON.stringify(user))
			}
		}
		if(!req.user) {
			res.redirect('login?redirected=true&path=' + path + query_string)
			return
		}
		if(!req.user.authenticated) {
			res.redirect('login?redirected=true&path=' + path  + query_string)
			return
		}
		if(req.user.role!="admin") {
			console.log("unathorized role")
			res.redirect('login?redirected=true&path=' + path + "&unauthorized=true"  + query_string)
			return
		}
		return next()
	}
	
	module.tokenExtractor = function(req) {
		var token = null;
		if (req && req.headers && req.headers.authorization)
		{
			token = req.headers.authorization.replace(/^Bearer\s/,"");
		}
		//~ console.log({headers:req.headers,cookies:req.cookies,token:token})
		return token;
	}
	module.validateToken = function(token) {
		return module.User.findByJWT(token)
		.then(user=>{
			if(!user) {
				console.error("User not found by token")
				return
			} else {
				console.log("Found username:" + user.username)
				user.authenticated = true
				return user
			}
		})
		.catch (e=> {
			console.error(e.toString())
			return
		})
	}
	module.extractAndValidateToken = function(req) {
		var token = module.tokenExtractor(req)
		if(config.verbose) {
			console.log("extractAndValidateToken: token:" + token)
		}
		if(!token) {
			return
		}
		return module.validateToken(token)
		.then(user=>{
			return user
		})
	}
	module.passport = passport
	// module.logout = function() {
	// 	return function (req, res, next) {
	// 		req.logout();
	// 		delete req.session;
	// 		next();
	// 	};
	// };
	return module
}
