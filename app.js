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
	WebSocketServer = require('ws').Server,
	wss = new WebSocketServer(
		{
			port: 8080
		}
	);

var databaseUrl = "mongodb://localhost:27017/testdb"
, collections = ["testCollection1", "authRequests", "users","messages"]
, db = require("mongojs").connect(databaseUrl, collections)
, currentMoment = moment()
, global_counter
, all_active_connections;

global_counter = 0;
all_active_connections = {};

console.log('locked and loaded');


	// method invoked
	wss.on('connection', function(ws) {

		//declaring an iteration of global_counter as id
        var id = global_counter++;
		console.log('id: ' + id);
		
		//adding the new id 
        all_active_connections[id] = ws;  
        ws.id = id;
		console.log('ws.id: ' + id);
		console.log('new socket connection, id = ' + id);
		       
		ws.on('message', function(message) {
			
			console.log('received message: %s', message);

	        try {
	        	var jObj = JSON.parse(message);
	        	console.log(jObj);
 		       	console.log('switch'); 		   
 		       	switch (jObj.type) {    		
 		       	
					// newUser        	
	                case "newUser":
	                console.log('newUser request from: ' + jObj.userName);
					// generic store function                
	                db.users.save(
					// user array - this should be broken into schema and live in models.js
	                	{
	                		type : "newUser",
	                		userName : jObj.userName,
	                		password : jObj.password,
	                		deviceID : jObj.deviceID,
	                		authRequestDate : currentMoment
	                	}, function (err, saved){
	                		if ( err || !saved ){
	                			console.log("db error, message not saved"); 
	                			ws.send("db error, message not saved");
	                		} else  {
	                        	console.log('message saved to db');

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
	                        				ws.send('no user found!');
	                        			} else {
											// return the data store 
	                        				var userName = user[0].userName
											, uid = user[0]._id
											, message = 'Server says: Welcome!\r\nYour username is ' + userName + ' and your uid is ' + uid + '.'
											, response = {
												"type" : "userSaved",
												"message" : message,
												"uid" : uid
											};
	                        				console.log('Returned username: ' + userName); 
											console.log('Returned uid: ' + uid);
	                        				ws.send(JSON.stringify(response));
	                                	}
	                                }
								);
	                        }
	                	}
	                );
                	break;
                	
 					// authRequest
	                case "authRequest":
	                console.log('authRequest from: ' + jObj.userName);

					// save the auth request no matter what  
	                db.authRequests.save(  
						{
							type : "authRequest",
	                		userName : jObj.userName,
			                password : jObj.password,
			                deviceID : jObj.deviceID,
			                authRequestDate : currentMoment
						}, function (err, saved) {
	                		if ( err || !saved ){
	                			console.log("db error, message not saved");
								ws.send("db error, message not saved");
	                		} else  {
	                        	console.log("authRequest saved to db");

	                        	db.users.find(
	                        		{
	                        			userName:jObj.userName,
	                        			password:jObj.password,
	                        			deviceID:jObj.deviceID
	                        		}, function(err, authUser) {
	                        			if( err || !authUser) {
	                        				console.log('user not found');
	                        				ws.send("0");
	                        			} else {
		                        			console.log('received a payload...stand by...');
		                        			console.log(jObj.userName);
		                        			// if there isn't a matching UUID this shit breaksssss
	                        				var userName = jObj.userName
											, uid = authUser[0]._id
											, message = 'Server says: You have successfully authenticated ' + userName + ' with the uid of ' + uid + '.'
											, response = {
												"type" : "authRequest",
												"userName" : userName,
												"uid" : uid,
												"message" : message
												//session check here
											};

	                        				console.log(userName + ' authenticated! Found uid ' + uid);
	                        				ws.send(JSON.stringify(response));
	                                	}
	                                });
	 
	                        }
	                	}
	                );
	                break;
	                
					// getContacts
	                case "getContacts":
	                console.log('getContactsRequest from: ' + jObj.userName);

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
	                        	
								var message = JSON.stringify(contacts)
								, response = {
									"type" : "getContacts",
									"message" : message
									};
									
	                        	ws.send(JSON.stringify(response));
	                        	console.log(contacts.length);
	                        	
	                        	//ws.send("2"+JSON.stringify(contacts));
							}
		                }
					);
	                break;
	                
					// newMessage               
	                case "newMessage":
	                console.log('newMessage from :' + jObj.userName);
	                
					// save a message                
	                db.messages.save(
	                	{
	                		type : "newMessage",
	                		userName : jObj.userName,
	                		userID : jObj.userID,
			                message : jObj.message,
			                messageDate : currentMoment
						}, function (err, saved) {
	                		if ( err || !saved ) {
	                			console.log("db error, message not saved"); 
	                			ws.send("db error, message not saved");
	                		} else {                        
								// broadcast hack                        
								var sendFunction = function(conn, callback) {
									
	                            	//all_active_connections[conn].send("3"+JSON.stringify(jObj));
	                            	all_active_connections[conn].send(JSON.stringify(jObj));
	                                console.log("tryna send to " + conn);
	                                callback();
								};
								
	                      		async.forEach(Object.keys(all_active_connections),sendFunction,function(err) {
	                        		console.log("finished sending");
	                       		});
							}
						}
					);
					break;
	                
	                case "getMessages":

	                break;
	        	}      
	        }    
	        catch (err) {
	        	console.log('There has been an error parsing your JSON.');
	        	console.log(err);
	        }
        }
	).on('close', function() {
	// when the connection closes expunge it from the array
        delete all_active_connections[ws.id];
        console.log('Closed connection for ' + ws.id);
	});
});