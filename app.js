/*global require*/
/*global console*/

var moment = require('moment')
//, session = require('session')
, async = require('async')
, colors = require('colors')
, WebSocketServer = require('ws').Server
, wss = new WebSocketServer({port: 8080})
, databaseUrl = 'mongodb://localhost:27017/testdb'
, collections = ["authRequests", "users", "getMessages", "messages"]
, db = require('mongojs').connect(databaseUrl, collections)
, currentMoment = moment()
, global_counter = 0
, all_active_connections = {};

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

var sessions = [];

var session = {
	indexOf: function(sessionId){
		for(var i in sessions){
			if(sessions[i].sessionId == sessionId)
			return i;
		}
		return null;
	},
	indexOfUser: function(userId){
		console.log(userId);
		for(var i in sessions){
			if(sessions[i].userId == userId)
			return i;
		}
		return null;
	},
	add: function(sessionData){
		sessions.push(sessionData);
		console.log('added session'.input);
	},
	remove: function(sessionId){
		var index = this.indexOf(sessionId);
		if(index != null){
			sessions.splice(index, 1);
			console.log('removed session'.input);
		} else {
			return null;
		}
	},
	removeByUserId: function(userId){
		var index = this.indexOf(userId);
		if(index != null){
			sessions.splice(index, 1);
		} else {
			return null;
		}
	},
	getSessionById: function(userId){
		console.log(userId);
		console.log('searching for session by ws.id'.debug);
		var index = this.indexOfUser(userId);
		if(index != null){
			return sessions[index];
		} else {
			return null;
		}
	},
	getSessionByUserId: function(sessionId){
		console.log(sessionId);
		console.log('searching for session by uid'.debug);
		try
			{
				var index = this.indexOfUser(sessionId);
				if(index != null){
					return sessions[index];
				} else {
					return null;
				}
			}
		catch (err)
			{
			console.log('life sucks ' + err);
			} 
	}
};

var setReadyState = function (){
		console.log('ws.readyState: ' + ws.readyState);
};

console.log('locked and loaded'.silly);
// socket invoked
wss.on('connection', function(ws) {
//	"use strict";

	var id
	, welcomeResponsePayload
	, welcomeResponse = {
		"type" : "welcome",
		"message" : "welcome"
	};
	id = global_counter++;
	//adding the new id 
	all_active_connections[id] = ws;
	ws.id = id;
	welcomeResponsePayload = (JSON.stringify(welcomeResponse));
	ws.send(welcomeResponsePayload);
	console.log('ws.id: ' + ws.id + ' - new socket connection!'.info);

	ws.on('message', function(message){
		console.log('incoming message'.info);
		console.log('received message: %s', message.data);

		try {
			var jObj = JSON.parse(message);
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
										console.log('no user found, sending error to client'.error);
										var message = 'No user was found matching that input. <br /> Verify that is correct and try again.'
										, response = {
											"type" : "authRequestNull",
											"message" : message
											//session check here
										};
										console.log('sending authRequestNull payload' + response.data);
										ws.send(JSON.stringify(response));
									} else {
										console.log('Found a user that matches input!'.silly);
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
												console.log(check.userName + ' authenticated! Found uid: ' + check.uid.silly);
												ws.send(JSON.stringify(response));
												// add session
												var sess = new Object();
												sess.sessionId = ws.id;
												sess.userId = check.uid;
												sess.username = check.userName;
												session.add(sess);
												console.dir(sess);
											} else {
												console.log('Password doesn\'t match up. Sending password failure payload...'.error);
												var message = 'The password you entered could not be verified. <br /> Tap to clear and try again.'
												, response = {
													"type" : "authRequestFailure",
													"message" : message
												};
												console.log('Sending authRequestFailure payload: ' + JSON.stringify(response).data);
												ws.send(JSON.stringify(response));
											}
										};
										// check password in an anon function
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
				console.log('getContactsRequest request from: ' + jObj.userName.data);
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
							var contactsList = new Array
							, contactUserName
							, contactUID;
							contacts.forEach(function(contact){
								contactUserName = contact.userName;
								contactUID = contact.uid;
								var contactResult = {
									"userName": contactUserName,
									"uid": contactUID
								};
								contactsList.push(contactResult);
//								console.log('added a contact to the array');
							});
							var message = contactsList
							, response = {
								"type" : "getContactsResponse",
								"message" : message
								};
							console.log('Sending getContacts payload to client'.info);
							ws.send(JSON.stringify(response));
						}
					}
				)[50];
				break;

				// newMessage
				case 'newMessage':
				console.log('newMessage request from :' + jObj.sender);
				// save the message to the db for failsafe
					db.messages.save(
					{
						type : "message",
						sender : jObj.sender,
						senderUID: jObj.senderUID,
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
							console.log(JSON.stringify(saved).debug);
							var messageResponse = {
								"messageText" : saved.messageText,
								"recipientUID" : saved.recipientUID,
								"senderUID" : saved.senderUID
							};
							var response = {
								"type" : "getMessagesResponseSuccess",
								"message": messageResponse
								};
								
							console.log('sender: ' + saved.senderUID + ' and recipient: ' + saved.recipientUID);
							var recipientActive = session.getSessionByUserId(saved.recipientUID)
							, senderActive = session.getSessionByUserId(saved.senderUID);
							console.log('sender: ' + senderActive.userId + ' and recipient ' + recipientActive.userId);

								if(recipientActive != null) {
									connection = [];
									connection.push(senderActive.sessionId, recipientActive.sessionId);
									console.log(connection);
									
									var sendFunction = function(conn, callback) {
										all_active_connections[conn].send(JSON.stringify(response));
										console.log('tryna send to ' + conn);
										callback();
									};

									async.forEach(Object.keys(connection),sendFunction,function(err) {
										console.log(err);
									});
									
								} else {
									// message failure
									console.log('message was not sent');
								}
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
				// save the getMessages request no matter what
				db.getMessages.save(
					{
						type : "getMessagesAttempt",
						sender : jObj.sender,
						senderUID : jObj.senderUID,
						recipientUserName : jObj.recpientUserName,
						recipientID : jObj.recpienUID,
						deviceID : jObj.deviceID,
						requestDateClient : jObj.requestDateClient,
						requestDateServer : currentMoment
						}, function (err, check){
							if (err){
							console.log('getMessages not saved'.error);
							} else {
								console.log('getMessageAttempt saved to db'.input);
								console.log('Looking for messages between ' + jObj.sender + ' and ' + jObj.recipientUserName.info);
								db.messages.find(
									{
										sender: { $in: [jObj.sender, jObj.recipientUserName ]},
										recipientUserName: { $in: [jObj.sender, jObj.recipientUserName ]}
										
									},
									{
										messageText:1,
										senderUID: 1,
										recipientUID:1,
									}, function(err, check){
										console.log('looking');
										console.log(check);
										console.log(JSON.stringify(check));
										if(JSON.stringify(check) === '[]'){
											console.log('messages not found'.error);
											// return the getMessages store 
											var messagesList = 'No messages found!' 
											, response = {
												"type" : "getMessagesResponseNull",
												"message" : messagesList,
											};
											console.log('sending getMessagesResponseNull payload...'.info);
											ws.send(JSON.stringify(response));
										} else {
											console.log('found some messages, processing request...'.info);
											// return the messages store 
											var messagesList = []
											, messageText
											, recipientUID;
											check.forEach(function(message){
												var messagesResponse = {
													"messageText" : message.messageText,
													"recipientUID" : message.recipientUID,
													"senderUID": message.senderUID 
												}
												messagesList.push(messagesResponse);
												console.log('added a message to the array');
											});
											var responsePayload = messagesList;
											var response = {
												"type" : "getMessagesResponseSuccess",
												"message" : responsePayload
											};
											console.log('sending getMessages payload.'.info);
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
	});

	ws.on('close', function() {
		// when the connection closes expunge it from the array
		session.remove(ws.id);
		console.log('Closed connection for ' + ws.id);
	});

});