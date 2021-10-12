'use strict'
const { exec } = require('child_process')
const fs = require('promise-fs')
const http = require('http')
//~ var HttpsProxyAgent = require('https-proxy-agent');
const {spawn} = require('child_process')
var ps = require('node-ps-promise');
const axios = require('axios')

if (!Promise.allSettled) {
    Promise.allSettled = promises =>
      Promise.all(
        promises.map((promise, i) =>
          promise
            .then(value => ({
              status: "fulfilled",
              value,
            }))
            .catch(reason => ({
              status: "rejected",
              reason,
            }))
        )
      );
}
  
const internal = {}
internal.controller = class {
	constructor(app_list,config) {
		this.app_list = (app_list) ? app_list : {}
		this.config = (config) ? config : {}
	}
    // INICIA APLICACIÓN. SI YA ESTÁ CORRIENDO NO HACE NADA- DEVUELVE OBJETO {status:success,message:..STR..} O TIRA ERROR
	startApp(app) {
		if(!app) {
			console.error("Error: falta nombre de app")
			return Promise.reject("falta nombre de app") 
		}
		if(!this.app_list[app]) {
			console.error("Error: no existe la app indicada")
			return Promise.reject("no existe la app indicada")
		}
		return this.checkApp(app)
		.then(running=>{
			if(running) {
				console.log("La aplicación " + app + " ya está funcionando")
				return {status:"success",message:"La aplicación " + app + " ya está funcionando"}
			} else {
				//~ var script = this.app_list[app].dir + "/" + this.app_list[app].script
				if(fs.existsSync(this.app_list[app].logfile)) {
					// var old_log = fs.readFileSync(this.app_list[app].logfile,'utf8')
					// if(old_log) {
					// 	fs.appendFileSync(this.app_list[app].logfile + "." + new Date().toISOString().substring(0,10), old_log)
					// }
                    fs.renameSync(this.app_list[app].logfile,this.app_list[app].logfile + "." + new Date().toISOString().substring(0,19))
				}
				var out = fs.openSync(this.app_list[app].logfile, 'w') // a')
				var err = fs.openSync(this.app_list[app].logfile, 'a')
				const ff = spawn('nodejs', [this.app_list[app].script], {
					cwd: this.config.app_base_dir + this.app_list[app].dir,
					stdio: [ 'ignore', out, err ],
					detached: true
				})
				ff.unref();
				var pidFile = this.config.app_base_dir + this.app_list[app].dir + "/logs/PID"
				fs.writeFileSync(pidFile, ff.pid+'\n', 'utf8')
				console.log("Se inició la app " + app + " con el PID " + ff.pid)
                return {status:"success",message:"Se inició la app " + app + " con el PID " + ff.pid}

			}
		})
	}

    startAppAll() {
        return Promise.allSettled(Object.keys(this.app_list).filter(key=>!this.app_list[key].controller).map(key=>{
			return this.startApp(key)
        }))
		.then(result=>{
            return result.map(item=>{
                if(item.status == "fulfilled") {
                    return item.value
                } else {
                    return {status: "failure", message: item.reason}
                }
            })
        })
    }

    startAppSt(app,timeout) {
		if(!app) {
			console.error("Error: falta nombre de app")
			return Promise.reject("falta nombre de app") 
		}
		if(!this.app_list[app]) {
			console.error("Error: no existe la app indicada")
			return Promise.reject("no existe la app indicada")
		}
		return this.checkAppStatus(app,timeout)
		.then(status=>{
            console.log("app:" + app + ", statusCode:" + status.statusCode)
			if(status.statusCode == "200") {
				// console.log("La aplicación " + app + " ya está funcionando")
				return {status:"success",message:"La aplicación " + app + " ya está funcionando"}
            } else {
                var promise
                if (status.statusCode == "504") {
                    console.log(new Date().toISOString() + ". La aplicación " + app + " no responde. Reiniciando.")
                    promise = this.stopApp(app)
                } else {  //  (status.statusCode == "ECONNREFUSED")
                    promise = Promise.resolve({status: "success", message:'La aplicación ' + app + ' está inactiva'})
                }
                return promise
                .then(status=>{
                    //~ var script = this.app_list[app].dir + "/" + this.app_list[app].script
                    if(fs.existsSync(this.app_list[app].logfile)) {
                        // var old_log = fs.readFileSync(this.app_list[app].logfile,'utf8')
                        // if(old_log) {
                        // 	fs.appendFileSync(this.app_list[app].logfile + "." + new Date().toISOString().substring(0,10), old_log)
                        // }
                        fs.renameSync(this.app_list[app].logfile,this.app_list[app].logfile + "." + new Date().toISOString().substring(0,19))
                    }
                    var out = fs.openSync(this.app_list[app].logfile, 'w') // a')
                    var err = fs.openSync(this.app_list[app].logfile, 'a')
                    const ff = spawn('nodejs', [this.app_list[app].script], {
                        cwd: this.config.app_base_dir + this.app_list[app].dir,
                        stdio: [ 'ignore', out, err ],
                        detached: true
                    })
                    ff.unref();
                    var pidFile = this.config.app_base_dir + this.app_list[app].dir + "/logs/PID"
                    fs.writeFileSync(pidFile, ff.pid+'\n', 'utf8')
                    console.log("Se inició la app " + app + " con el PID " + ff.pid)
                    return {status:"success",message:"Se inició la app " + app + " con el PID " + ff.pid}
                })
                .catch(e=>{
                    throw e
                })
			}
		})
	}

    startAppStAll() {
        return Promise.allSettled(Object.keys(this.app_list).filter(key=>!this.app_list[key].controller).map(key=>{
			return this.startAppSt(key)
        }))
		.then(result=>{
            return result.map(item=>{
                if(item.status == "fulfilled") {
                    return item.value
                } else {
                    return {status: "failure", message: item.reason}
                }
            })
        })
    }
// 	}
//   })
    // CHEQUEA SI LA APLICACIÓN ESTÁ CORRIENDO. DEVUELVE BOOLEAN
	checkApp(app) {
		// var test_url = server_url  + this.app_list[app].webdir
		return new Promise ( (resolve, reject) => {
			// console.log("Realizando solicitud de prueba a localhost:" + this.app_list[app].port + this.app_list[app].testpath)
			const req = http.get({
				 hostname: 'localhost',
				 port: this.app_list[app].port,
				 path: this.app_list[app].testpath,
				 method: 'GET',
				 agent: false,
                 timeout: 20000,
                 headers: {Authorization: "Bearer " + this.config.user.token}
			}, res=> {
				//~ console.log(`statusCode: ${res.statusCode}`)
				if(res.statusCode == 200) {
					//~ console.error("La aplicación " + app + " ya está funcionando")
					resolve(true)
				} else {
					resolve(false)
				}
			})
			req.on('error', error => {
			  //~ console.error(error)
			  resolve(false)
			})
			req.end()
		})
	}
	
    checkAppAll() {
        var app_names = []
        return Promise.allSettled(Object.keys(this.app_list).map( key=>{
            app_names.push(key)
			return this.checkApp(key)
        }))
		.then(result=>{
            return result.map((item,index)=>{
                if(item.status == "fulfilled") {
                    return {app_name:app_names[index], status:"success", message: item.value}
                } else {
                    return {app_name:app_names[index], status: "failure", message: item.reason}
                }
            })
        })
    }
    
    checkAppStatus(app,timeout=3000) {
		// var test_url = server_url  + this.app_list[app].webdir
		return new Promise ( (resolve, reject) => {
			// console.log("Realizando solicitud de prueba a localhost:" + this.app_list[app].port + this.app_list[app].testpath)
			const req = http.get({
				 hostname: 'localhost',
				 port: this.app_list[app].port,
				 path: this.app_list[app].testpath,
				 method: 'GET',
				 agent: false,
                 timeout: timeout,
                 headers: {Authorization: "Bearer " + this.config.user.token}
			}, res=> {
                resolve({statusText:res.statusText, statusCode: res.statusCode})
			})
			req.on('error', error => {
			  //~ console.error(error)
              if(error) {
    			  resolve({statusText:error.message, statusCode: error.code})
              } else {
                  resolve({statusText:"unknown error", statusCode: "unknown code"})
              }
			})
            req.on('timeout', ()=>{
                req.destroy({message:"request timeout",code:504})
            })
			req.end()
		})
	}

    checkAppStatusAll() {
        var app_names = []
        return Promise.allSettled(Object.keys(this.app_list).map( key=>{
            app_names.push(key)
			return this.checkAppStatus(key)
        }))
		.then(result=>{
            return result.map((item,index)=>{
                if(item.status == "fulfilled") {
                    return {app_name:app_names[index], status:"success", message: item.value}
                } else {
                    return {app_name:app_names[index], status: "failure", message: item.reason}
                }
            })
        })
    }
    // DETIENE APLICACIÓN USANDO KILL (HARD STOP). DEVUELVE OBJETO {status:success,message: ..str..} O TIRA ERROR
	stopApp(app) {  // usando PID
		if(!app) {
			console.error("Error: falta nombre de app")
			return Promise.reject("falta nombre de app")
		}
		if(!this.app_list[app]) {
			console.error("Error: no existe la app indicada")
			return Promise.reject("no existe la app indicada")
		}
		return fs.readFile(this.config.app_base_dir + this.app_list[app].dir + "/logs/PID",'utf8')
        .then(pid => {
            if(!pid) {
                // console.error("PID no encontrado")
                throw "PID no encontrado"
            }
            pid = pid.trim()
            console.log("found PID:"+pid)
            if(pid == "") {
                // console.error("PID vacío")
                throw "PID vacío"
            }
            return ps.lookup({pid:parseInt(pid).toString(),command:"node",psargs: 'ux'})
            .then(resultList=>{
                var process = resultList[0]
                if(process) {
                    console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments)
                    return ps.kill(pid)
                } else {
                    console.error('PID: %s not found', pid)
                    throw "El proceso no se encontró"
                }
            })
            .then(()=> {
                console.log( 'Process %s has been killed!', pid );
                return {status: "success", message:'Process ' + pid + ' has been killed!'}
            })
		})
        .catch(err=>{
            console.error(err)
            throw "PID file not found"
        })
	}

    stopAppAll() {
        var app_names = []
        return Promise.allSettled(Object.keys(this.app_list).filter(key=>!this.app_list[key].controller).map(key=>{
            app_names.push(key)
			return this.stopApp(key)
        }))
		.then(result=>{
            return result.map((item,index)=>{
                if(item.status == "fulfilled") {
                    return {app_name:app_names[index], status:item.value.status, message:item.value.message}
                } else {
                    return {app_name:app_names[index], status: "failure", message: item.reason}
                }
            })
        })
    }

    // DETIENE PROCESO USANDO EL ENDPOINT /exit. 
	stopApp2(app) {
		if(!app) {
			console.error("Error: falta nombre de app")
			throw "Error: falta nombre de app"
		}
		if(!this.app_list[app]) {
			console.error("Error: no existe la app indicada")
			throw "Error: no existe la app indicada"
		}
		return axios.get("http://localhost:" + this.app_list[app].port + "/exit",{headers: {"Authorization": "Bearer " + this.config.user.token}})
		.then(response=>{
			//~ console.log(`statusCode: ${res.statusCode}`)
			if(!response) {
				throw "exit request failed"
			}
			if(response.status == 200) {
                console.log("La aplicación " + app + " se detuvo exitosamente")
				return {status:"success",message: "La aplicación " + app + " se detuvo exitosamente"}
			} else {
				console.error("La aplicación " + app + " no se detuvo")
                throw "La aplicación " + app + " no se detuvo"
			}
		})
        .catch(err=>{
            console.error(err.toString())
            throw(err.message)
        })
	}
    
    stopApp2All() {
        var app_names = []
        return Promise.allSettled(Object.keys(this.app_list).filter(key=>!this.app_list[key].controller).map(key=>{
            app_names.push(key)
			return this.stopApp2(key)
        }))
		.then(result=>{
            return result.map((item,index)=>{
                if(item.status == "fulfilled") {
                    return {app_name:app_names[index], status:item.value.status, message:item.value.message}
                } else {
                    return {app_name:app_names[index], status: "failure", message: item.reason}
                }
            })
        })
    }

    restartApp(app) {
 		if(!this.app_list[app]) {
			console.error("Error: no existe la app indicada")
			return Promise.reject("Error: no existe la app indicada")
		}
		return this.stopApp2(app)
		.then(response=>{
            console.log(response.message)
            return new Promise((resolve,reject)=>{
                setTimeout(()=>{
				    resolve(this.startApp(app))
    			},1000)
            })
		})
    }

    restartAppAll() {
		var app_names = []
        return Promise.allSettled(Object.keys(this.app_list).filter(key=>!this.app_list[key].controller).map(key=>{
            app_names.push(key)
			return this.stopApp2(key)
            .then(response=>{
                console.log(response.message)
                return new Promise((resolve,reject)=>{
                    setTimeout(()=>{
                        resolve(this.startApp(key))
                    },1000)
                })
            })
        }))
		.then(result=>{
            return result.map((item,index)=>{
                if(item.status == "fulfilled") {
                    return item.value
                } else {
                    return {status: "failure", message: item.reason}
                }
            })
        })
    }

    hardRestartApp(app) {
        if(!this.app_list[app]) {
			console.error("Error: no existe la app indicada")
			return
		}
		return this.stopApp(app)
		.then(response=>{
            console.log(response.message)
            return new Promise((resolve,reject)=>{
                setTimeout(()=>{
                    resolve(this.startApp(app))
                },1000)
            })
        })
    }

    hardRestartAppAll() {
        var app_names = []
        return Promise.allSettled(Object.keys(this.app_list).filter(key=>!this.app_list[key].controller).map(key=>{
            app_names.push(key)
			return this.stopApp(key)
            .then(response=>{
                console.log(response.message)
                return new Promise((resolve,reject)=>{
                    setTimeout(()=>{
                        resolve(this.startApp(key))
                    },1000)
                })
            })
        }))
		.then(result=>{
            return result.map((item,index)=>{
                if(item.status == "fulfilled") {
                    return item.value
                } else {
                    return {status: "failure", message: item.reason}
                }
            })
        })
    }
}

module.exports = internal
