/*global require*/
/*global console*/

var express = require('express')
	, async = require('async')
	, moment = require('moment')
	, colors = require('colors')
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
	, all_active_connections = {}
	, participantUIDS = {};

colors.setTheme({
	silly: 'rainbow',
	input: 'blue',
	verbose: 'cyan',
	prompt: 'grey',
	info: 'green',
	data: 'grey',
	help: 'cyan',
	warn: 'yellow',
	debug: 'blue',
	error: 'red'
});

console.log('locked and loaded'.silly);

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

var s4 = function(){
	return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
};

var generateUID = function(){
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

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
	console.log('ws.id: ' + id + ' - new socket connection!'.info);
	console.log('welcome payload :' + welcomeResponsePayload.data);
	console.log('sending welcome payload to ' + id + '.'.silly);
	ws.send(welcomeResponsePayload);

	ws.on('message', function(message) {
		console.log('received message: %s', message.data);

		try {
			var jObj = JSON.parse(message);
			console.log(jObj + ''.info);
			console.log('switch to ' + jObj.type + '.'.debug);
			switch (jObj.type) {

				// newUser
			case 'newUser':
				console.log('newUser request from: ' + jObj.userName.input);
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
							if (err){
							console.log('db error, message not saved'.error);
							} else {
								console.log('newUser saved to db'.input);
								db.users.find(
									{
										userName:jObj.userName,
										deviceID:jObj.deviceID
									},{
										userName:0,
										deviceID:0
									}, function(err, check) {
										if (check == null) {
											console.log('user not found'.error);
										} else {
											console.log(check);
											// return the user data store 
											var userName = check.userName
											, uid = generateUID();
											console.log('Generated a new UID: ' + uid.input);
											var message = 'Welcome!\r\nYour username is ' + userName + ' and your uid is ' + uid + '.'
											, response = {
												"type" : "userSaved",
												"message" : message,
												"uid" : uid
											};
											console.log('Returned username: ' + userName + ', returned uid: ' + uid + '. Sending payload.'.data);
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
				console.log('authRequest from: ' + jObj.userName.silly);
				console.log(JSON.stringify(jObj).data);
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
							console.log('authRequest not saved'.error);
						} else  {
							console.log('authRequest saved to db'.input);
							console.log('Looking for: ' + jObj.userName.data);
							db.users.findOne(
								{
									userName:jObj.userName,
								}, function(err, check){
									if(check == null){
										console.log('no user found'.error);
										var message = 'No user was found matching that input. <br /> Verify that is correct and try again.'
										, response = {
											"type" : "authRequestNull",
											"message" : message
											//session check here
										};
										console.log('sending payload' + response.data);
										ws.send(JSON.stringify(response));
									} else {
										console.log('Yes it does!'.silly);
										console.log('processing authentication payload...stand by...'.input);
										var validatePassword = function(err, password){
											var passwordSent = jObj.password;
											console.log('checking password ' + passwordSent + ' against ' + check.password.input);
											if (passwordSent == check.password){
												var message = 'Successfully authenticated ' + check.userName + ' with the uid of ' + check.uid
												, response = {
													"type" : "authRequestSuccess",
													"userName" : check.userName,
													"uid" : check.uid,
													"message" : message
												};
												console.log(check.userName + ' authenticated! Found uid ' + check.deviceID.silly);
												ws.send(JSON.stringify(response));
												// lame for now, demo purposes only
												id = check.uid;
												console.log(id);
												
											} else {
												console.log('password doesn\'t match up. Sending password failure payload...'.error);
												var message = 'The password you entered could not be verified. <br /> Tap to clear and try again.'
												, response = {
													"type" : "authRequestFailure",
													"message" : message
												};
												console.log('Sending payload: ' + JSON.stringify(response).data);
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
					console.log('getContactsRequest from: ' + jObj.userName.data);
					db.users.find(
						{}
						, {
							userName:1,
							uid:1
						}, function(err, contacts){
							if (contacts === '[]'){
								console.log('No contacts found'.error);
							
							} else {
								console.log(contacts.length + ' contacts found'.data);
								console.log(JSON.stringify(contacts));
								var contactsList = new Array
								, contactUserName
								, contactUID;
								
								contacts.forEach(function(contact){
									contactUserName = contact.userName;
									contactUID = contact.uid;
									var contactResult = {
										"userName": contactUserName,
										"uid": contactUID
									}
									contactsList.push(contactResult);
									console.log('added a contact to the array');
								});
								
								var message = contactsList
								, response = {
									"type" : "getContacts",
									"message" : message
									};
								console.log(response);
								console.log(JSON.stringify(response));
								ws.send(JSON.stringify(response));
							}
						}
					)[50];
					break;

					// newMessage
					case 'newMessage':
					console.log('newMessage from :' + jObj.sender);
					// save a message
						db.messages.save(
						{
							type : "message",
							sender : jObj.sender,
							senderUID: id,
							recipientUserName : jObj.recipientUserName,
							recipientUID : jObj.recipientUID,
							deviceID : jObj.deviceID,
							requestClientDate: jObj.requestClientDate,
							messageText : jObj.messageText,
							requestServerDate : currentMoment
						}, function (err, saved){
							if (err){
								console.log('message not saved'.error); 
								//add message not sent payload
							} else {
								console.log('message saved'.silly);
								console.log(saved);
								var messageResponse = [{
									"messageText" : saved.messageText,
									"recipientUID" : saved.recipientUID,
									"senderUID" : saved.senderUID
								}];
								var response = {
									"type" : "getMessagesResponseSuccess",
									"message": messageResponse
									};
								console.log(JSON.stringify(response));
								
								participantUIDS[saved.recipientUID, saved.senderUID];
								
								console.log('Participants: ' + participantUIDS + ' Active: ' + all_active_connections);
								async.forEach(
									Object.keys(participantUIDS), function(item, callback) {
										all_active_connections[conn].send(JSON.stringify(response));
										console.log('tryna send to ' + conn);
										callback();										
									}, function (err) {
										console.log('hhmmm');
									}
								);
							}
						});
					
					break;

					// newBroadcastMessage
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
					console.log('getMessages from: ' + jObj.sender.input);
					console.log(JSON.stringify(jObj).data);
					// save the getMessages request no matter what
					db.getMessages.save(
						{
							type : "getMessagesAttempt",
							sender : jObj.sender,
							senderUID : id,
							recipientUserName : jObj.recpientUserName,
							recipientID : jObj.recpientID,
							deviceID : jObj.deviceID,
							requestDateClient : jObj.requestDateClient,
							requestDateServer : currentMoment
							}, function (err, check){
								if (err){
								console.log('getMessages not saved'.error);
								} else {
									console.log('getMessageAttempt saved to db'.input);
									console.log('Looking for messages sent by ' + jObj.sender + ' to ' + jObj.recipientUserName.info);
									db.messages.find(
										{
											sender: { $in:[jObj.sender,jObj.recipientUserName]},
											recipientUserName: { $in:[jObj.sender,jObj.recipientUserName]}
										},
										{
											messageText:1,
											recipientUID:1,
										}, function(err, check){
											console.log('looking');
											console.log(JSON.stringify(check));
											if(JSON.stringify(check) === '[]'){
												console.log('messages not found'.error);
												// return the getMessages store 
												var messagesList = 'No messages found!' 
												, response = {
													"type" : "getMessagesResponseNull",
													"message" : messagesList,
												};
												console.log('sending getMessagesResponseNull payload' + response +'.'.data);
												ws.send(JSON.stringify(response));
											} else {
												console.log('found some messages, processing request...'.info);
												console.log(check);
												// return the messages store 
												var messagesList = []
												, messageText
												, recipientUID;
												console.log(id);
												check.forEach(function(message){
													var messagesResponse = {
														"messageText" : message.messageText,
														"recipientUID" : message.recipientUID,
														"senderUID": id
													}
													messagesList.push(messagesResponse);
													console.log('added a message to the array');
												});
												var responsePayload = JSON.stringify(messagesList);
												var response = {
													"type" : "getMessagesResponseSuccess",
													"message" : responsePayload
												};
												console.log('Returned messages: ' + messagesList + '. Sending payload.'.silly);
												ws.send(JSON.stringify(response));
											}
										}
								)[50];
							}
						}
					);
					break;

				}
			}
			catch (err) {
				console.log('There has been an error parsing your JSON.'.error);
				console.log(err);
			}
		}
	).on('close', function() {
		// when the connection closes expunge it from the array
		delete all_active_connections[ws.id];
		console.log('Closed connection for ' + ws.id.silly);
	});
});