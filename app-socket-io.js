/*global require*/
/*global console*/

var	express = require('express'),
	async = require('async'),
//	starStopDaemon = require('start-stop-daemon'),	
//	argv = require('optimist'),
//	mongoose = require('mongoose'),
//	mongooseStore = require('express-mongodb'),
	moment = require('moment'),
// node_cryptojs = require('node-cryptojs-aes'),
// node-cryptojs-aes main object;
// CryptoJS = node_cryptojs.CryptoJS,
// custom json serialization format
// JsonFormatter = node_cryptojs.JsonFormatter,
	io = require('socket.io').listen(80);

var databaseUrl = "mongodb://localhost:27017/testdb"
, collections = ["testCollection1", "authRequests", "users","messages"]
, db = require("mongojs").connect(databaseUrl, collections)
, currentMoment = moment()
, global_counter
, all_active_connections;

global_counter = 0;
all_active_connections = {};

console.log('locked and loaded');

io.sockets.on('connection', function (socket) {

socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });
});