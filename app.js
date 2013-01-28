/* Main application entry file sometimes refered to as app.js 
  Please note, the order of loading is important.
 * Configuration loading and booting of controllers and custom error handlers */

// for now let's list what each module does for us
// and comment out mods not being used until so
// core modules get always take priority, might
// as well list them first and do single comment lines
// so they can be removed at leisure

// core modules
// to make testing and output readability lets
// add default http server
//var	http = require('http'),
// adding a secure html server - this is assuming we are
// already set with a cert and ca 
//	https = require('https'),
// add 'path' module so we can have some routing
//	path = require('path'),
// and to further enhance our testing abilities in a browser
// let's add the url module
//	url = require('url'),
// adding file system so we can read our ssl certs
//	fs = require('fs');
	
// non-core modules

// express is our 'app' framework and gives us some
// additional methods not found in core, plus makes
// fancy folders for routes, views, and public files
var	express = require('express'),

// looks like were using async gives a nice parellel
// iterator tho AFIAK this is required because of ws
// not being to itterate on connection objects?
	async = require('async'),

// start-stop-daemon module...seems legit
//	starStopDaemon = require('start-stop-daemon'),	

// optimist is a option parser, chunking, aliasing 
// GG and friend, declared as argv
//	argv = require('optimist'),

// mongoose is the ORM and mongo db connection manager
// feature-based collections and documents should go here
// i.e. NOT session data
//	mongoose = require('mongoose'),

// the native mongo wrapper blows and requires a static
// connection 'configuration', express-mongodb doesn't and
// we can simply pass the connection object
// also keeping var camelCase convention from parent dependency
//	mongooseStore = require('express-mongodb'),

// let's use a wrapper for date/time/etc so we can have cleaner methods
// and jarble namespace everytime, seems moment.js is the best-of
//	moment = require('moment'),

// after some research I think the best crypto wrapper is the
// node-cryptojs-aes module, it removes the openssl dependecy
// and even tho doesn't support ECC (only symmetric) seems to
// gracefully degrade to the 'crypto' module - import 
// node-cryptojs-aes modules to encrypt or decrypt data
// node_cryptojs = require('node-cryptojs-aes'),
// node-cryptojs-aes main object;
// CryptoJS = node_cryptojs.CryptoJS,
// custom json serialization format
// JsonFormatter = node_cryptojs.JsonFormatter,

// still think we might need to change to websocket-node 
	webSocketServer = require('ws').Server,
	wss = new webSocketServer(
		{
			port: 8080
		}
	);
	
// this should all go in something like db.js and models.js	
var databaseUrl = "mongodb://localhost:27017/testdb"; // "username:password@example.com/mydb"
var collections = ["testCollection1", "authRequests", "users","messages"]
var db = require("mongojs").connect(databaseUrl, collections);

// ultimately these need to be passed around via a router
// or a store or both but essentially every global var is a var
// an external process can use whenever they are in memory
global_counter = 0;
all_active_connections = {};
// i'm getting console.log heavy for now until we have some logging happening 
console.log('global_counter: ' + global_counter + ' all_active_connections: ' + all_active_connections);

//now let's have the default on method invoked
	wss.on('connection', function(ws) {
	       
//declaring an iteration of global_counter as id
        var id = global_counter++;
		console.log('id: ' + id);
		
//adding the new id 
        all_active_connections[id] = ws;  
        ws.id = id;
		
		console.log('ws.id: ' + id);
		console.log('new socket connection, id = ' + id);

// im missing something, why is this inside the scope of connection?       
		ws.on('message', function(message) {
			console.log('received message: %s', message);

	        try {
	        	var jObj = JSON.parse(message);
	        	console.log('var jObj = JSON.parse(message): %s', jObj);

// this switch/case is fucking beautiful! but this really should be handled by mongoose	
 		       	switch (jObj.type) {
 		       	
// newUser        	
	                case "newUser":
	                console.log('newUser request from: ' + jObj.userName);
                	// ws.send("authorized");
// what are your thoughts of using something like moment.js or node-date-utils.js to generate date?
// core Date is good but this isn't very robust and its going to be a pain to do Math every
// time we need a Date object                
                	var currentDate = Math.floor(new Date().getTime()/1000);
// generic store function                
	                db.users.save(
// user array - this should be broken into schema and live in models.js
	                	{
	                		type : "newUser",
	                		userName : jObj.userName,
	                		password : jObj.password,
	                		deviceID : jObj.deviceID,
	                		authRequestDate : currentDate
	                	}, function (err, saved){
	                		if ( err || !saved ){
	                			console.log("db error, message not saved"); 
	                			ws.send("db error, message not saved");
	                		} else  {
	                        	console.log("message saved to db");
// is this an integrity check? 
	                        	db.users.find(
	                        		{
	                        			userName:jObj.userName,
	                        			password:jObj.password,
	                        			deviceID:jObj.deviceID
	                        		},{
	                        			type:0, 
	                        			authRequestDate:0, 
	                        			deviceID:0,  
	                        			password:0
	                        		}, function(err, user) {
	                        			if( err || !user) {
	                        				console.log("user not found");
	                        				ws.send("0");
	                        			} else {
	                        				console.log(JSON.stringify(user));
	                        				ws.send("1"+JSON.stringify(user));
	                                	}
	                                }
								);
	                        }
	                	}
	                );
                
                	break;
 // auuthRequest
	                case "authRequest":
	                console.log('authRequest from: ' + jObj.userName);	                
	                // ws.send("authorized");

// see
	                var currentDate = Math.floor(new Date().getTime()/1000);

// save the auth request no matter what                
	                db.authRequests.save(  
						{
							type : "authRequest",
	                		userName : jObj.userName,
			                password : jObj.password,
			                deviceID : jObj.deviceID,
			                authRequestDate : currentDate
						}, function (err, saved) {
	                		if ( err || !saved ){
	                			console.log("db error, message not saved");
								ws.send("db error, message not saved");
	                		} else  {
	                        	console.log("authRequest saved to db");
// integrity check? maybe an md5 sum is in order?                        	
	                        	db.users.find(
	                        		{
	                        			userName:jObj.userName,
	                        			password:jObj.password,
	                        			deviceID:jObj.deviceID
	                        		},{
	                        			type:0, 
	                        			authRequestDate:0, 
	                        			deviceID:0,  
	                        			password:0
	                        		}, function(err, authUser) {
	                        			if( err || !authUser) {
	                        				console.log("user not found");
	                        				ws.send("0");
	                        			} else {
	                        				console.log(JSON.stringify(authUser));
	                        				ws.send("1"+JSON.stringify(authUser));
	                                }
	                                });
	 
	                        }
	                	}
	                );
	                break;
// getContacts
	                case "getContacts":
	                console.log('getContactsRequest from: ' + jObj._id);
	               
	                // ws.send("authorized");
	               
	                db.users.find(
	                	{},
	                	{
	                		type:0, 
	                		authRequestDate:0, 
	                		deviceID:0,  
	                		password:0
	                	}, function(err, contacts) {
							if( err || !contacts) {
	                        	console.log("can't get contacts");
	                        } else {
	                        	console.log(JSON.stringify(contacts));
	                        	ws.send("2"+JSON.stringify(contacts));
							}
		                }
					);
	                break;
	                
// newMessage               
	                case "newMessage":
	                console.log('newMessage from :' + jObj.userName);
// and again

	                var currentDate = Math.floor(new Date().getTime()/1000);

// save a message                
	                db.messages.save(
	                	{
	                		type : "newMessage",
	                		userName : jObj.userName,
	                		userID : jObj.userID,
			                message : jObj.message,
			                messageDate : currentDate
						}, function (err, saved) {
	                		if ( err || !saved ) {
	                			console.log("db error, message not saved"); ws.send("db error, message not saved");
	                		} else {                        
// broadcast                        
								var sendFunction = function(conn, callback) {
	                            	all_active_connections[conn].send("3"+JSON.stringify(jObj));
	                                console.log("tryna send to " + conn);
	                                callback();
								}
	                            async.forEach(Object.keys(all_active_connections),sendFunction,function(err) {
	                            		console.log("finished sending");
	                            	}
	                            );
							}              
						}
					);
					break;
	                
	                case "getMessages":
	 
	                break;
	        	}      
	        }
	        
// invalid json	        
	        catch (err) {
	        	console.log('There has been an error parsing your JSON.')
	        	console.log(err);
	        }
        }
	).on('close', function() {
// when the connection closes expunge it from the array
        delete all_active_connections[ws.id];
		}
	);
});