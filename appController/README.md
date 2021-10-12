# appController

### Nodejs web application that can be used to control a suite of nodejs web applications

It includes an apps admin page and a users admin page.

The apps admin page enables the system administator to start, stop or restart the apps installed in the suite.

The users admin page is used to create, edit and delete users.

The authentication component (PSQL-based) is shared between the Controller and all the other apps.

The http traffic is handled by express
## Requirements

- node>=10.16.0
- postgresql>=12.7


## Installation
- Run sql/users.sql to create users table in your PostgreSQL database
- Create at least one user with admin role
- Edit config/default.json to provide the database connection parameters, the admin user credentials and the app list:
```
{
	"database":{	// database connection parameters
	  "user": "...",
	  "host": "...",
	  "database": "...",
	  "password": "...",
	  "port": ...
	},
	"user": {
	  "username": "...",
	  "password": "...",
	  "token": "..."
	},
	"app_list":{	// applications list
		"app_name": {	// application name
			"dir": "...",		// the relative path of the app
			"script": "...",	// the filename of the app executable 
			"testpath": "...",	// the url path to test if the app is running 
			"logfile": "...", 	// the app log file location 
			"port": "..."		// the port where the app runs
		},
		...
	}
}
```
## Requirements for the controlled apps
- The controlled apps must be placed in the same base directory of the controller app.
- They must expose a /exit GET endpoint which terminates the app (given the right credentials)
- To deal with authentication, each app must contain the following: 
```
const express = require('express')
const app = express()
const { Pool } = require('pg')
const config = require('config');
const pool = new Pool(config.database)
const auth = require('../../appController/app/authentication.js')(app,config,pool)
const passport = auth.passport
```
Then auth can be used as middleware in app calls:
```
app.get('/endpoint',auth.isAdmin,(req,res)=>{
	...
})
```

