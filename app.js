/*global require*/
/*global console*/

var express = require('express')
	, async = require('async')
	, moment = require('moment')
	, WebSocketServer = require('ws').Server
	, wss = new WebSocketServer(
		{
			port: 8080
		}
	)
	, databaseUrl = 'mongodb://localhost:27017/testdb'
	, collections = ["authRequests", "users", "getMessages", "messages"]
	, db = require('mongojs').connect(databaseUrl, collections)
	, currentMoment = moment()
	, global_counter = 0
	, all_active_connections = {};

console.log('locked and loaded');

/* private encryption & validation methods */
var generateSalt = function(){
	var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	var salt = '';
	for (var i = 0; i < 10; i++) {
		var p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
}

var md5 = function(str){
	return crypto.createHash('md5').update(str).digest('hex');
};

var saltAndHash = function(pass, callback){
	var salt = generateSalt();
	callback(salt + md5(pass + salt));
};

var validatePassword = function(plainPass, hashedPass, callback){
	var salt = hashedPass.substr(0, 10);
	var validHash = salt + md5(plainPass + salt);
	callback(null, hashedPass === validHash);
};

/* auxiliary methods */

var getObjectId = function(id){
	return accounts.db.bson_serializer.ObjectID.createFromHexString(id)
};

var findById = function(id, callback){
	accounts.findOne({_id: getObjectId(id)},
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
};


var findByMultipleFields = function(a, callback)
{
// this takes an array of name/val pairs to search against {fieldName : 'value'} //
	accounts.find( { $or : a } ).toArray(
		function(e, results) {
		if (e) callback(e)
		else callback(null, results)
	});
}

// socket invoked
wss.on('connection', function(ws) {
	"use strict";
	var id
	, welcomeResponse
	, welcomeResponsePayload;

	id = global_counter++;
	//adding the new id 
	all_active_connections[id] = ws;
	ws.id = id;
	welcomeResponse = {
		"type" : "welcome",
		"message" : "welcome"
		};
	welcomeResponsePayload = (JSON.stringify(welcomeResponse));
	console.log('ws.id: ' + id + ' - new socket connection!');
	console.log('welcome payload :' + welcomeResponsePayload);
	console.log('sending welcome payload to ' + id + '.');
	ws.send(welcomeResponsePayload);

	ws.on('message', function(message) {
		console.log(message);
		console.log('received message: %s', message);

		try {
			var jObj = JSON.parse(message);
			console.log(jObj);
			console.log('switch to ' + jObj.type);
			switch (jObj.type) {

				// newUser
			case 'newUser':
				console.log('newUser request from: ' + jObj.userName);
				// user store function
				db.users.save(
				// @TODO user array - this should be broken into schema and live in models.js
					{
						type : "newUser",
						userName : jObj.userName,
						password : jObj.password,
						deviceID : jObj.deviceID,
						authRequestDate : currentMoment
						}, function (err, saved){
							if ( err || !saved ){
							console.log('db error, message not saved');
							// ws.send("0");
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
											console.log('user not found');
											//ws.send("0");
										} else {
										// return the user data store 
										var userName = user[0].userName
										, uid = user[0]._id
										, message = 'Server says: Welcome!\r\nYour username is ' + userName + ' and your uid is ' + uid + '.'
										, response = {
											"type" : "userSaved",
											"message" : message,
											"uid" : uid
										};
										console.log('Returned username: ' + userName + ', returned uid: ' + uid + '. Sending payload.');
										ws.send(JSON.stringify(response));
									}
								}
							);
						}
					}
				);
				break;

				// authRequest
				case 'authRequest':
				console.log('authRequest from: ' + jObj.userName);
				console.log(jObj);
				console.log(JSON.stringify(jObj));
				// save the auth request no matter what
				db.authRequests.save(
					{
						type : "authRequest",
						userName : jObj.userName,
						password : jObj.password,
						deviceID : jObj.deviceID,
						authRequestClientDate : jObj.authRequestClientDate,
						authRequestServerDate : currentMoment
					}, function (err, check, userName, password){
						if (err){
							console.log('authRequest not saved');
						} else  {
							console.log('authRequest saved to db');
							console.log('Looking for: ' + jObj.userName);
							db.users.findOne(
								{
									userName:jObj.userName,
								}, function(err, check){
									if(check == null){
										console.log('no user found');
										var message = 'No user was found matching that input. <br /> Verify that is correct and try again.'
										, response = {
											"type" : "authRequestNull",
											"message" : message
											//session check here
										};
										console.log('sending payload' + response);
										ws.send(JSON.stringify(response));
									} else {
										console.log('Yes it does!');
										console.log('processing authentication payload...stand by...');
										var validatePassword = function(err, password){
											var passwordSent = jObj.password;
											console.log('checking password ' + passwordSent + ' against ' + check.password);
											if (passwordSent == check.password){
												var message = 'Successfully authenticated ' + check.userName + ' with the uid of ' + check.deviceID
												, response = {
													"type" : "authRequestSucess",
													"userName" : check.userName,
													"uid" : check.deviceID,
													"message" : message
													//session check here
												};
												console.log(check.userName + ' authenticated! Found uid ' + check.deviceID);
												ws.send(JSON.stringify(response));
											} else {
												console.log('password doesn\'t match up. Sending password failure payload...');
												var message = 'The password you entered could not be verified. <br /> Tap to clear and try again.'
												, response = {
													"type" : "authRequestFailure",
													"message" : message
												};
												console.log('Sending payload: ' + JSON.stringify(response));
												ws.send(JSON.stringify(response));
											}
										};
										validatePassword();	
									}
								}
							);
						}
					}
				);
				break;

					// getContacts
					case 'getContacts':
					console.log('getContactsRequest from: ' + jObj.userName);
					db.users.find(
						{}
						, {
							type:0, 
							authRequestDate:0, 
							deviceID:0,  
							password:0
						}, function(err, contacts) {
							if( err || !contacts) {
							console.log('can\'t get contacts');
							} else {
								console.log(contacts.length + ' contacts found');
								var message = JSON.stringify(contacts)
								, response = {
									"type" : "getContacts",
									"message" : message
									};
								console.log(response);
								console.log(JSON.stringify(response));
								ws.send(JSON.stringify(response));
								//ws.send("2"+JSON.stringify(contacts));
							}
						}
					);
					break;

					// newMessage
					case 'newBroadcastMessage':
					console.log('newBroadcastMessage from :' + jObj.userName);
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
								console.log('db error, message not saved'); 
								//ws.send("db error, message not saved");
							} else {
								// broadcast hack
								var sendFunction = function(conn, callback) {
									//all_active_connections[conn].send("3"+JSON.stringify(jObj));
									all_active_connections[conn].send(JSON.stringify(jObj));
									console.log('tryna send to ' + conn);
									callback();
								};

								async.forEach(Object.keys(all_active_connections),sendFunction,function(err) {
								console.log('finished sending');
								});

							}
						}
					);
					break;

					//getMessages
					case 'getMessages':
					console.log('getMessages from: ' + jObj.sender);
					console.log(jObj);
					console.log(JSON.stringify(jObj));
					// save the getMessages request no matter what
					db.getMessages.save(
						{
							type : "getMessagesAttempt",
							sender : jObj.sender,
							recipientUserName : jObj.recpientUserName,
							recipientID : jObj.recpientID,
							deviceID : jObj.deviceID,
							requestDateClient : jObj.requestDateClient,
							requestDateServer : currentMoment
							}, function (err, check){
								if (err){
								console.log('getMessages not saved');
								} else {
									console.log('getMessageAttempt saved to db');
									console.log('Looking for messages sent by ' + jObj.sender + ' to ' + jObj.recipientUserName);
									db.messages.find(
										{
											sender: jObj.sender,
											recipientUserName : jObj.recpientUserName,
											recipientID: jObj.recipientID,
											deviceID: jObj.deviceID
										}, function(err, check){
											var checkNull =  JSON.stringify(check);
											if(checkNull === '[]'){
												console.log('messages not found');
												// return the getMessages store 
												var messagesList = 'No messages found!' 
												, response = {
													"type" : "getMessagesResponseNull",
													"message" : messagesList,
												};
												console.log('sending payload' + response);
												ws.send(JSON.stringify(response));
											} else {

												console.log('found some messages, processing request...');
												// return the messages store 
												var recipient = check.recipient
												, messagesList = check.message
												, response = {
													"type" : "getMessagesResponseSucess",
													"message" : messagesList,
													"recipient" : recipient,
													"sender" : userName
											};
											console.log('Returned recipient: ' + recipient);
											console.log('Returned messages: ' + messagesList + '. Sending payload.');
											ws.send(JSON.stringify(response));
										}
									}
								);
							}
						}
					);
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