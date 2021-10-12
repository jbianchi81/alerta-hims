// print GRASS map

var internal = {}
var fs =require("promise-fs")
const { exec } = require('child_process')
var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf
var path = require('path');

internal.printGrassMap = function(input,output,parameters) {
	//~ console.log({forecast_date:parameters.forecast_date.toISOString()})
	if(!parameters) {
		//~ throw new Error("parameters missing")
		return Promise.reject("parameters missing")
		//~ return
	}
	if(!parameters.location) {
		//~ throw new Error("parameters.location missing")
		//~ return
		return Promise.reject("parameters.location missing")
	}
	if(!parameters.mapset) {
		return Promise.reject("paramters.mapset missing")
		//~ throw new Error("parameters.mapset missing")
		//~ return
	}
	var rnum = sprintf ( "%04d", Math.floor(Math.random() * 10000))  // Genera número aleatorio de 0 a 9999 para usar en nombre de mapset y archivos temporarios
	var location = parameters.location // "$HOME/GISDATABASE/ETA" 
	var mapset = rnum + parameters.mapset // "jobs"
	var grass_batch_job_file = (parameters.batch_job) ? parameters.batch_job : "/tmp/grass_batch_job.sh"
	grass_batch_job_file = grass_batch_job_file.substring(0,grass_batch_job_file.lastIndexOf("/")+1) + rnum + grass_batch_job_file.substring(grass_batch_job_file.lastIndexOf("/")+1)
	var wi = (parameters)? (parameters.width) ? parameters.width : 1024 : 1024
	var he = (parameters)? (parameters.height) ? parameters.height : 870 : 870
	//~ process.env.GRASS_RENDER_WIDTH=wi
	//~ process.env.GRASS_RENDER_HEIGHT=he
//#export GRASS_PSFILE=map.png
	process.env.GRASS_RENDER_TRUECOLOR='TRUE'
	var render_file = (parameters.render_file) ? parameters.render_file : '/tmp/map' + rnum + '.png'
	var bindexof = render_file.lastIndexOf("/")
	//~ process.env.GRASS_RENDER_FILE = render_file.substr(0,bindexof+1) + rnum + render_file.substr(bindexof+1)
	render_file = render_file.substr(0,bindexof+1) + rnum + render_file.substr(bindexof+1)
	var res = (parameters) ? (parameters.res) ? parameters.res : 0.25 : 0.25
	var n = (parameters) ? (parameters.extent) ? parameters.extent[0] : -10 : -10   // north
	var s = (parameters) ? (parameters.extent) ? parameters.extent[1] : -40 : -40   // south
	var w = (parameters) ? (parameters.extent) ? parameters.extent[2] : -70 : -70   // east
	var e = (parameters) ? (parameters.extent) ? parameters.extent[3] : -40 : -40   // west
	var timestart = (parameters) ? (parameters.timestart) ? parameters.timestart : new Date() : new Date()
	var timeend = (parameters) ? (parameters.timeend) ? parameters.timeend : new Date() : new Date()
	var is_prono = (parameters) ? (parameters.forecast_date) ? true : false : false
	var forecast_date
	if(is_prono) {
		forecast_date = parameters.forecast_date
	}
	//~ console.log({timestart:timestart,timeend:timeend,forecast_date:forecast_date,input:input})
	var logo_file = (parameters) ? (parameters.logo) ? path.resolve(parameters.logo) : path.resolve("public/img/logo_ina.png") : path.resolve("public/img/logo_ina.png")
	var color_rule = "0 255:255:255 \n\
20 70:200:98\n\
50 0:150:55\n\
70 0:131:80\n\
90 0:113:105\n\
100 0:94:130\n\
130 0:75:155\n\
150 0:57:180\n\
180 0:38:205\n\
200 0:19:230\n\
230 0:0:255\n\
280 127:0:255\n\
1000 255:0:255\n\
nv 255:255:255\n\
"
	if(parameters.color_rule) {
		try {
			color_rule = parameters.color_rule.map(l=> l[0] + " " + l[1] + "\n").join("")
		} catch (e) {
			console.error(e)
			return Promise.reject(e)
		}
    }
	var grid_size = (parameters) ? (parameters.grid_size) ? parameters.grid_size : 5 : 5
	var title = (parameters) ? (parameters.title) ? parameters.title : input.substring(0,16) : input.substring(0,16)
	return execShellCommand('gdalinfo -json ' + input)
	.then(result=>{
		if(!result) {
			throw new Error("invalid GDAL file")
			return
		}
		try {
			var gdalinfo = JSON.parse(result)
		} catch(e) {
			throw new Error("invalid gdalinfo file")
			return
		}
		//~ console.log(gdalinfo)
		if(!gdalinfo.bands){
			throw new Error("No bands found in GDAL file")
			return
		}
		var band = (parameters.band) ? parameters.band : 1
		var rescale_str = ""
		if(gdalinfo.bands[band-1].offset) {
			if(gdalinfo.bands[band-1].scale) {
				rescale_str = 'r.mapcalc expression="rescaledcolormap=newcolormap*'+gdalinfo.bands[band-1].offset+'+'+gdalinfo.bands[band-1].scale+'" --o\n'
				rescale_str += 'g.rename raster=rescaledcolormap,newcolormap --o\n'
			} else {
				rescale_str = 'r.mapcalc expression="rescaledcolormap=newcolormap+'+gdalinfo.bands[band-1].offset+'" --o\n'
				rescale_str += 'g.rename raster=rescaledcolormap,newcolormap --o\n'
			}
		} else if(gdalinfo.bands[band-1].scale) {
			rescale_str = 'r.mapcalc expression="rescaledcolormap=newcolormap*'+gdalinfo.bands[band-1].scale+'" --o\n'
			rescale_str += 'g.rename raster=rescaledcolormap,newcolormap --o\n'
		}
		var batch_job = "#!/bin/bash\n\
\n\
g.region res=" + res + " n=" + n + " s=" + s + " w=" + w + " e=" + e + "\n\
if ! r.in.gdal " + input + " out=newcolormap band=" + band + " -o --o --q; then echo \"Error al cargar " + input + ". Verifique archivo\";exit 1;fi\n\
"+rescale_str+"\
#rm \$GRASS_RENDER_FILE\n\
d.mon start=png --o width=" + wi + " height=" + he + " output=" + render_file + "\n\
echo \""+ color_rule + "\n\
\" | r.colors newcolormap rules=-\n\
d.rast newcolormap\n\
d.vect CDP@principal width=2\n\
d.vect limites_internacionales@principal\n\
d.vect hidro_cdp@principal color=blue\n\
d.grid size=" + grid_size + "\n\
d.legend newcolormap at=15,12,55,90 -f\n\
d.text \"" + title + "\" line=1 -b size=3 color=black\n\
d.text \"" + timestart.toISOString().substring(0,16) + " UTC a " + timeend.toISOString().substring(0,16) + " UTC\" line=2 -b size=3 color=black\n\
" + ((is_prono) ? "d.text \"Emision: " + forecast_date.toISOString().substring(0,16) + " UTC\" line=3 -b size=3 color=black" : "") + "\n\
if d.mon stop=png\n\
then\n\
  composite -gravity NorthEast " + logo_file + " " + render_file + " " + output + "\n\
fi"
		return fs.writeFile(grass_batch_job_file, batch_job)
		.then(()=>{
			fs.chmodSync(grass_batch_job_file, "755");
			//~ process.env.GRASS_BATCH_JOB = grass_batch_job_file
			return execShellCommand('grass -c ' + location + '/' + mapset + ' --exec ' + grass_batch_job_file)
			.then(stdout=>{
				console.log(stdout)
				delete process.env.GRASS_BATCH_JOB
				console.log("se escribió el archivo " + output)
				return output
			})
		})
		.catch(e=>{
			delete process.env.GRASS_BATCH_JOB
			console.error(e)
		})
	})
	.catch(e=>{
		console.error(e)
		return // Promise.reject(e)
	})
}

internal.printRastObsColorMap= function (input,output,observation,options={}) {
	options.timestart = (options.timestart) ? options.timestart : (observation.timestart) ? observation.timestart : undefined 
	options.timeend = (options.timeend) ? options.timeend : (observation.timeend) ? observation.timeend : undefined 
	options.forecast_date = (options.forecast_date) ? options.forecast_date : (observation.timeupdate) ? observation.timeupdate : undefined
	options.title = (options.title) ? options.title : (observation.nombre) ? observation.nombre : undefined
	return internal.printGrassMap(input,output,options)
}

internal.surf = function (input,output,parameters) {
	if(!parameters) {
		return Promise.reject("parameters missing")
	}
	if(!parameters.location) {
		return Promise.reject("parameters.location missing")
	}
	if(!parameters.mapset) {
		return Promise.reject("paramters.mapset missing")
	}
	var rnum = sprintf ( "%04d", Math.floor(Math.random() * 10000))  // Genera número aleatorio de 0 a 9999 para usar en nombre de mapset y archivos temporarios
	var location = parameters.location // "$HOME/GISDATABASE/ETA" 
	var mapset = rnum + parameters.mapset // "jobs"
	var grass_batch_job_file = (parameters.batch_job) ? parameters.batch_job : "/tmp/grass_batch_job_surf.sh"
	grass_batch_job_file = grass_batch_job_file.substring(0,grass_batch_job_file.lastIndexOf("/")+1) + rnum + grass_batch_job_file.substring(grass_batch_job_file.lastIndexOf("/")+1)
	var res = (parameters) ? (parameters.res) ? parameters.res : 0.1 : 0.1
	var n = (parameters) ? (parameters.extent) ? parseFloat(parameters.extent[0]) : -10 : -10   // north
	var s = (parameters) ? (parameters.extent) ? parseFloat(parameters.extent[1]) : -40 : -40   // south
	var w = (parameters) ? (parameters.extent) ? parseFloat(parameters.extent[2]) : -70 : -70   // east
	var e = (parameters) ? (parameters.extent) ? parseFloat(parameters.extent[3]) : -40 : -40   // west
	var segmax = (parameters) ? (parameters.segmax) ? parseInt(parameters.segmax) : 600 : 600 
	var tension = (parameters) ? (parameters.tension) ? parseInt(parameters.tension) : 150 : 150
	if(!input) {
		return Promise.reject("input faltante")
	}
	if(!fs.existsSync(path.resolve(input))) {
		return Promise.reject("No se encontró input para surf")
	}
	if(!output) {
		return Promise.reject("output faltante")
	}
	output = path.resolve(output)
	var mask_stmt = ""
	if(parameters.maskfile) {
		 mask_stmt = "if ! r.in.gdal " + parameters.maskfile + " out=mask --o; then echo \"archivo mascara no se pudo importar\"; exit 1;fi;\n\
		  r.mapcalc expression=\"pp_surf_mask=if(mask,pp_surf,null())\" --o;\n\
		  r.mapcalc expression=\"pp_surf=if(pp_surf_mask>0,pp_surf_mask,0)\" --o\n"
	}


	var batch_job = "#!/bin/bash\n\
	\n\
	g.region res=" + res + " n=" + n + " s=" + s + " w=" + w + " e=" + e + "\n\
	if ! v.in.ogr " + input + " output=pp_points --o; then exit 1;fi\n\
	if ! v.surf.rst pp_points elev=pp_surf --o zcolumn=valor segmax=" + segmax + " tension=" + tension + "; then exit 1;fi\n\
	" + mask_stmt + "\n\
	r.out.gdal pp_surf out=" + output + " --o" // metaopt=\"DESCRIPCION_DEL_PRODUCTO=\\\"Mapa de precipitacion interpolado a partir de datos de estaciones meteorologicas\\\",FECHA_INICIO="+ parameters.timestart.toISOString() + ",FECHA_FIN=" + parameters.timeend.toISOString() + ",METODO_DE_INTERPOLACION=splines,UNIDADES=milimetros,VARIABLE=precipitacion,FUENTES=\\\"Servicio Meteorologico Nacional, Direccion provincial de Hidraulica de Entre Rios, ACUMAR, ANA (Brasil), SNIH-SIyPH (Ministerio del Interior)\\\",PRODUCTO_ID=7,GENERADO_POR=\\\"Instituto Nacional del Agua. Direccion de Sistemas de Informacion y Alerta Hidrologico\\\",CONTACTO=\\\"Au. Ezeiza-Canuelas km 1,52, Ezeiza, Buenos Aires, Argentina. tel +54 011 44804500 ext. 2341/2415 - jbianchi@ina.gob.ar\\\"\""
	return fs.writeFile(grass_batch_job_file, batch_job)
	.then(()=>{
		fs.chmodSync(grass_batch_job_file, "755");
		//~ process.env.GRASS_BATCH_JOB = grass_batch_job_file
		return execShellCommand('grass -c ' + location + '/' + mapset + ' --exec ' + grass_batch_job_file)
		.then(stdout=>{
			console.log(stdout)
			//~ delete process.env.GRASS_BATCH_JOB
			console.log("se escribió el archivo " + output)
			return output
		})
	})
	//~ .catch(e=>{
		//~ delete process.env.GRASS_BATCH_JOB
		//~ console.error(e)
	//~ })
}

internal.print_pp_cdp_diario = function (input,output,parameters,vect_input) {
	if(!parameters) {
		return Promise.reject("parameters missing")
	}
	if(!parameters.location) {
		return Promise.reject("parameters.location missing")
	}
	if(!parameters.mapset) {
		return Promise.reject("paramters.mapset missing")
	}
	var rnum = sprintf ( "%04d", Math.floor(Math.random() * 10000))  // Genera número aleatorio de 0 a 9999 para usar en nombre de mapset y archivos temporarios
	var location = parameters.location // "$HOME/GISDATABASE/ETA" 
	var mapset = rnum + parameters.mapset // "jobs"
	var grass_batch_job_file = (parameters.batch_job) ? parameters.batch_job : "/tmp/grass_batch_job_surf.sh"
	grass_batch_job_file = grass_batch_job_file.substring(0,grass_batch_job_file.lastIndexOf("/")+1) + rnum + grass_batch_job_file.substring(grass_batch_job_file.lastIndexOf("/")+1)
	var render_file = (parameters.render_file) ? parameters.render_file : "/tmp/map" + rnum + ".png" 
	var timestart = new Date(parameters.timestart)
	var timeend = new Date(parameters.timeend)
	var vect_stmt = ""
	if(vect_input) {
		vect_stmt = "if ! v.in.ogr " + vect_input + " output=pp_points --o; then exit 1;fi\n\
		             d.vect pp_points;"
	}	
	var batch_job = "#!/bin/bash\n\
	\n\
g.region n=-12 s=-39 w=-68 e=-42 res=0.1\n\
width=1000\n\
height=1000\n\
export GRASS_RENDER_WIDTH=$width\n\
export GRASS_RENDER_HEIGHT=$height\n\
export GRASS_RENDER_TRUECOLOR=TRUE\n\
export GRASS_RENDER_FILE=tmp/map" + rnum + ".png\n\
if ! r.in.gdal " + input + " output=pp_surf --o; then echo \"archivo pp_surf no se pudo importar\"; exit 1;fi\n\
if d.mon start=png --o width=$width height=$height bgcolor=200:200:200 output=" + render_file + "\n\
 then \n\
  echo \"0	255:255:255\n\
1	150:245:140\n\
5	55:210:60\n\
10	15:160:15\n\
15	95:189:249\n\
20	40:149:209\n\
30	20:129:189\n\
40	127:112:234\n\
50	57:38:171\n\
60	40:0:159\n\
70	254:191:60\n\
80	255:96:0\n\
90		225:20:0\n\
100		165:0:0\n\
130     0:0:0 \n\
400 0:0:0\" | r.colors pp_surf rules=-\n\
echo  \"0 thru 0.999 = 0\n\
1 thru 4 = 1\n\
5 thru 9 = 5\n\
10 thru 14 = 10\n\
15 thru 19 = 15\n\
20 thru 29 = 20\n\
30 thru 39 = 30\n\
40 thru 49 = 40\n\
50 thru 59 = 59\n\
60 thru 69 = 60\n\
70 thru 79 = 70\n\
80 thru 89 = 80\n\
90 thru 99  = 90\n\
100 thru 129 = 100\n\
130 thru 400 = 130\" | r.reclass pp_surf output=recl rules=- --o\n\
 echo \"0	255:255:255\n\
1	150:245:140\n\
5	55:210:60\n\
10	15:160:15\n\
15	95:189:249\n\
20	40:149:209\n\
30	20:129:189\n\
40	127:112:234\n\
50	57:38:171\n\
60	40:0:159\n\
70	254:191:60\n\
80	255:96:0\n\
90		225:20:0\n\
100		165:0:0\n\
130     0:0:0 \n\
400 0:0:0\" | r.colors recl rules=-\n\
 d.rast recl\n\
 d.vect CDP@principal color=red width=2\n\
 d.vect limites_internacionales@principal width=2 color=black\n\
 d.vect hidro_cdp@principal color=blue\n\
 " + vect_stmt + "\n\
 d.grid size=5 textcolor=black fontsize=12\n\
 d.legend recl use=0,1,5,10,15,20,30,40,50,60,70,80,90,100,130 at=3,43,3,9 -f\n\
 d.text text=\"Precipitaciones diarias campo interpolado [mm]\" line=1 size=2.5 color=black -b\n\
 d.text text=\""+ timestart.toISOString().substring(0,16) + " UTC a " + timeend.toISOString().substring(0,16) + " UTC\" line=2 size=2.5 color=black -b \n\
 if  d.mon stop=png\n\
  then\n\
   composite -gravity NorthEast " + parameters.logo + " " + render_file + " " + output + "\n\
  else echo \"Error al intentar imprimir el mapa.\"; exit 1\n\
 fi\n\
else echo \"no se pudo abrir monitor png\"; exit 1\n\
fi"
    return fs.writeFile(grass_batch_job_file, batch_job)
	.then(()=>{
		fs.chmodSync(grass_batch_job_file, "755");
		//~ process.env.GRASS_BATCH_JOB = grass_batch_job_file
		return execShellCommand('grass -c ' + location + '/' + mapset + ' --exec ' + grass_batch_job_file)
		.then(stdout=>{
			console.log(stdout)
			//~ delete process.env.GRASS_BATCH_JOB
			console.log("se escribió el archivo " + output)
			return output
		})
	})
}

internal.print_pp_cdp_semanal = function (input,output,parameters,vect_input) {
	if(!parameters) {
		return Promise.reject("parameters missing")
	}
	if(!parameters.location) {
		return Promise.reject("parameters.location missing")
	}
	if(!parameters.mapset) {
		return Promise.reject("paramters.mapset missing")
	}
	var rnum = sprintf ( "%04d", Math.floor(Math.random() * 10000))  // Genera número aleatorio de 0 a 9999 para usar en nombre de mapset y archivos temporarios
	var location = parameters.location // "$HOME/GISDATABASE/ETA" 
	var mapset = rnum + parameters.mapset // "jobs"
	var grass_batch_job_file = (parameters.batch_job) ? parameters.batch_job : "/tmp/grass_batch_job_semanal.sh"
	grass_batch_job_file = grass_batch_job_file.substring(0,grass_batch_job_file.lastIndexOf("/")+1) + rnum + grass_batch_job_file.substring(grass_batch_job_file.lastIndexOf("/")+1)
	var render_file = (parameters.render_file) ? parameters.render_file : "/tmp/map" + rnum + ".png" 
	var timestart = new Date(parameters.timestart)
	var timeend = new Date(parameters.timeend)
	var vect_stmt = ""
	if(vect_input) {
		vect_stmt = "if ! v.in.ogr " + vect_input + " output=pp_points --o; then exit 1;fi\n\
		             d.vect pp_points;"
	}
	var batch_job = "#!/bin/bash\n\
	\n\
g.region n=-12 s=-39 w=-68 e=-42 res=0.1\n\
width=1000\n\
height=1000\n\
export GRASS_RENDER_WIDTH=$width\n\
export GRASS_RENDER_HEIGHT=$height\n\
export GRASS_RENDER_TRUECOLOR=TRUE\n\
export GRASS_RENDER_FILE=tmp/map" + rnum + ".png\n\
if ! r.in.gdal " + input + " output=pp_surf --o; then echo \"archivo pp_surf no se pudo importar\"; exit 1;fi\n\
if d.mon start=png --o width=$width height=$height bgcolor=200:200:200 output=" + render_file + "\n\
 then \n\
echo \"0	255:255:255\n\
1	150:245:140\n\
8	55:210:60\n\
15	15:160:15\n\
25	95:189:249\n\
40	40:149:209\n\
60	20:129:189\n\
80	127:112:234\n\
100	57:38:171\n\
120	40:0:159\n\
140	254:191:60\n\
160	255:96:0\n\
180		225:20:0\n\
200		165:0:0\n\
260     0:0:0 \n\
1000 0:0:0 \n\
nv 255:255:255\" | r.colors pp_surf rules=-\n\
 echo \"0 thru 0.999 = 0\n\
1 thru 7 = 1\n\
8 thru 14 = 8\n\
15 thru 24 = 15\n\
25 thru 39 = 25\n\
40 thru 59 = 40\n\
60 thru 79 = 60\n\
80 thru 99 = 80\n\
100 thru 119 = 100\n\
120 thru 139 = 120\n\
140 thru 159 = 140\n\
160 thru 179 = 160\n\
180 thru 199  = 180\n\
200 thru 259 = 200\n\
260 thru 1000 = 260\" | r.reclass pp_surf output=recl rules=- --o\n\
echo \"0	255:255:255\n\
1	150:245:140\n\
8	55:210:60\n\
15	15:160:15\n\
25	95:189:249\n\
40	40:149:209\n\
60	20:129:189\n\
80	127:112:234\n\
100	57:38:171\n\
120	40:0:159\n\
140	254:191:60\n\
160	255:96:0\n\
180		225:20:0\n\
200		165:0:0\n\
260     0:0:0 \n\
1000 0:0:0 \n\
nv 255:255:255\" | r.colors recl rules=-\n\
 d.rast recl\n\
 d.vect CDP@principal color=red width=2\n\
 d.vect limites_internacionales@principal width=2 color=black\n\
 d.vect hidro_cdp@principal color=blue\n\
 d.grid size=5 textcolor=black fontsize=12\n\
 " + vect_stmt + "\
 d.legend recl use=0,1,8,15,25,40,60,80,100,120,140,160,180,200,260 at=3,43,3,9 -f\n\
 d.text text=\"Precipitaciones semanales campo interpolado [mm]\" line=1 size=2.5 color=black -b\n\
 d.text text=\""+ timestart.toISOString().substring(0,16) + " UTC a " + timeend.toISOString().substring(0,16) + " UTC\" line=2 size=2.5 color=black -b \n\
 if  d.mon stop=png\n\
  then\n\
   composite -gravity NorthEast " + parameters.logo + " " + render_file + " " + output + "\n\
  else echo \"Error al intentar imprimir el mapa.\"; exit 1\n\
 fi\n\
else echo \"no se pudo abrir monitor png\"; exit 1\n\
fi"
    return fs.writeFile(grass_batch_job_file, batch_job)
	.then(()=>{
		fs.chmodSync(grass_batch_job_file, "755");
		//~ process.env.GRASS_BATCH_JOB = grass_batch_job_file
		return execShellCommand('grass -c ' + location + '/' + mapset + ' --exec ' + grass_batch_job_file)
		.then(stdout=>{
			console.log(stdout)
			//~ delete process.env.GRASS_BATCH_JOB
			console.log("se escribió el archivo " + output)
			return output
		})
	})
}


function execShellCommand(cmd) {
 const exec = require('child_process').exec;
 return new Promise((resolve, reject) => {
  exec(cmd, (error, stdout, stderr) => {
   if (error) {
    console.warn(error);
   }
   resolve(stdout? stdout : stderr);
  });
 });
}


module.exports = internal
