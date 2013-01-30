/**
 * server simple-client.html
 * via node static
 */
 
var http = require('http'),
	util = require('util'),
	connect = require('connect'),
	port = 8081;
	
// start an http server	
connect.createServer(connect.static(__dirname)).listen(port);

// console output
util.puts('Listening on ' + port + '...');
util.puts('Press Ctrl + C to stop.');