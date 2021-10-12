'use strict'

const request = require('request')
const program = require('commander')
const inquirer = require('inquirer')
const fs = require('fs')
var sprintf = require('sprintf-js').sprintf, vsprintf = require('sprintf-js').vsprintf

const config = require('config');
let soap_client_options = { 'request' : request.defaults(config.request_defaults)}
const wmlclient = require('./wmlclient')
const wml = new wmlclient.client(config.wml_endpoint, soap_client_options)

program
  .version('0.0.1')
  .description('wmclient accessor');

program
  .command('getSites')
  .alias('s')
  .description('Get sites from CUAHSI-WML server')
  .option('-b, --bounds <value>', 'north,south,east,west')
  .option('-c, --csv', 'output as CSV')
  .option('-f, --file <value>', 'output to file')
  .option('-s, --includeSeries', 'includeSeries')
  .action(options => {
	if(!options.bounds) {
		console.log("Falta bounds")
		return
	}
	var b = options.bounds.toString().split(",")
	//~ var includeSeries = (options.includeSeries) ? true : false
	wml.getSites(b[0],b[1],b[2],b[3],options.includeSeries)
	.then(sites=> {
		var str=""
		sites.forEach(site=> {
			if(options.csv) {
					
				console.log(site.toCSV())
				str += site.toCSV()
			} else {
				console.log(site.toString())
				str += site.toString()
			}
			str += "\n"
		})
		if(options.file) {
			fs.writeFile(options.file,str, function(err) {
				if (err) throw err;
				console.log(options.file + ' Saved!');
			})
		}
		return
	})
	.catch(e=>{
		console.error(e)
	})
  });
  
program
  .command('getSiteInfo')
  .alias('i')
  .description('Get siteinfo from CUAHSI-WML server')
  .option('-s, --site <value>', 'SiteCode')
  .option('-c, --csv', 'output as CSV')
  .option('-f, --file <value>', 'output to file')
  .action(options => {
	wml.getSiteInfo(options.site)
	.then(series=> {
		var str=""
		series.forEach(serie=> {
			if(options.csv) {
					
				console.log(serie.toCSV())
				str += serie.toCSV()
			} else {
				console.log(serie.toString())
				str += serie.toString()
			}
			str += "\n"
		})
		if(options.file) {
			fs.writeFile(options.file,str, function(err) {
				if (err) throw err;
				console.log(options.file + ' Saved!');
			})
		}
		return
	})
	.catch(e=>{
		console.error(e)
	})
  });
	
program
  .command('getValues')
  .alias('v')
  .description('Get values from CUAHSI-WML server')
  .option('-s, --site <value>', 'SiteCode')
  .option('-v, --variable <value>', 'VariableCode')
  .option('-d, --startdate <value>', 'StartDate')
  .option('-e, --enddate <value>', 'EndDate')
  .option('-c, --csv', 'output as CSV')
  .option('-f, --file <value>', 'output to file')
  .action(options => {
	wml.getValues(options.site,options.variable,options.startdate,options.enddate)
	.then(getvaluesobject=> {
		var str=""
		console.log(getvaluesobject.seriesInfo.toString())
		getvaluesobject.values.forEach(value=> {
			if(options.csv) {
				console.log(value.toCSV())
				str += value.toCSV()
			} else {
				console.log(value.toString())
				str += value.toString()
			}
			str += "\n"
		})
		if(options.file) {
			fs.writeFile(options.file,str, function(err) {
				if (err) throw err;
				console.log(options.file + ' Saved!');
			})
		}
		return
	})
	.catch(e=>{
		console.error(e)
	})
  });
	

program.parse(process.argv);
