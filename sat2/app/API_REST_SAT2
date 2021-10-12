const request = require('request')


const AutenticarUsuario = function (user,pass) {
	return new Promise( (resolve, reject) => {
		request.post('http://utr.gsm.ina.gob.ar:5667/SAT2Rest/api/', {
		  json: {
			nombreDeUsuario: user,
			clave: pass
		  }
		}, (error, res, body) => {
		  if (error) {
			console.error(error)
			reject(error)
			return
		  }
		  console.log(`statusCode: ${res.statusCode}`)
		  console.log(body)
		  resolve(body)
		})
	})
}

const RecuperarEquipos = function (idCliente) {
	return new Promise( (resolve, reject) => {
		request.post('http://utr.gsm.ina.gob.ar:5667/SAT2Rest/api/', {
		  json: {
			idCliente: idCliente
		  }
		}, (error, res, body) => {
		  if (error) {
			console.error(error)
			reject(error)
			return
		  }
		  console.log(`statusCode: ${res.statusCode}`)
		  console.log(body)
		  resolve(body)
		})
	})
}

module.exports = { AutenticarUsuario, RecuperarEquipos }
