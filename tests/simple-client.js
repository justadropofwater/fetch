/**
 * simple client
 */

// throw more exceptions and check coding conventions 
// blooper patrol
"use strict";

// string generators
function generateUserName()
	{
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for( var i=0; i < 16; i++ )
    		text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
};

function generateDeviceID()
	{
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for( var i=0; i < 16; i++ )
    		text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
};

function generatePassword()
	{
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for( var i=0; i < 8; i++ )
    		text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
};

function generateMessage()
	{
		var text = "";
		var possible = "!@#$%^&*(){}-+=\/[]<>/.,'\";:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for( var i=0; i < 64; i++ )
    		text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
};

// Initialize everything when the window finishes loading
window.addEventListener("load", function(event) {
	var status = document.getElementById("status");
	var url = document.getElementById("url");
	var connect = document.getElementById('connect');
	var disconnect = document.getElementById('disconnect');
	var send = document.getElementById("send");
	var text = document.getElementById("text");
	var message = document.getElementById("message");
	var test;
	var userName;
	var userNameActive = document.getElementById("username");
	var uid;
	var uidActive = document.getElementById('uid');
	var passWord;
	var passWordActive = document.getElementById("password");
	var deviceID;
	var deviceIDActive = document.getElementById("deviceID");
	
// intial state	
	status.textContent = "Not Connected";
	url.value = "ws://localhost:8080";
	disconnect.disabled = true;
	send.disabled = true;
	userNameActive.textContent = 'Not logged in';
	passWordActive.textContent = '********';
	deviceIDActive.textContent = '0000000000000000';
	
// start ye engines
	$('#connect').click(function() {
		var ws = $.websocket(url.value, {
		    open: function() {
		    	connect.disabled = true;
				disconnect.disabled = false;
		        send.disabled = false;
		        console.log();
		        status.textContent = 'Connected';
		        $('#log').append('<li>Connected to ' + url.value + '</li>');
			},
		    close: function() {
					disconnect.disabled = true;
					connect.disabled = false;
	        		send.disabled = true;
	        		status.textContent = 'Disconnected from ' + url.value;
	        	$('#log').append('<li>Disconnected from ' + url.value + '</li>');
	        },
		    events: {
				message: function(e, err) {
				    try {
			        	var data = JSON.parse(e);
	        			console.log(data);
	        			console.log(data.type);
 		       			console.log('switch');
 		       			switch (data.type) {    		
							// newUser        	
	                		case "userSaved":
								uid = data.uid;
								console.log(uid);
								$('#log').append('<li>Response: ' + data.message + '</li>');
							break;
						}
					}
					catch (err) {
	        			console.log('There has been an error parsing your JSON.');
	        			console.log(err);
	        		}	
				}
			}
		});

	
		$('#disconnect').click(function() {
			console.log('Attempting to disconnect from ' + url.value);
			ws.close;
		});
		
		$('#newUser').click(function() {
        	$('#log').append('<li>Attempting to create a dummy user!</li>');
			
			userName = generateUserName();
			passWord = generatePassword();
			deviceID = generateDeviceID();
			var authRequestDate = new Date();
			var	authRequestEpoch = authRequestDate.getTime();
			//this is lame
			authRequestEpoch = "" + authRequestEpoch + "";
			 						
        	var payload = {
        		"type" : "newUser",
				"userName" : userName,
				"password" : passWord,
				"deviceID" : deviceID,
				"authRequestDate" : authRequestEpoch 
			};
			
        	ws.send('newUser', payload);
        	payload = JSON.stringify(payload);
			$('#log').append('<li>Sent newUser payload: ' + payload + '</li>');
			userNameActive.textContent = userName;
			passWordActive.textContent = passWord;
			deviceIDActive.textContent = deviceID;
			$('#log').append('<li>Your username is now ' + userName + ', your password is ' + passWord + ' and your deviceID is ' + deviceID + '</li>');
		});
		
		$('#authRequest').click(function() {
        	$('#log').append('<li>Attempting to request authentication!</li>');

			var authRequestDate = new Date();
			var	authRequestEpoch = authRequestDate.getTime();
			//still lame
			authRequestEpoch = "" + authRequestEpoch + "";  						
        	var payload = {
				type : "authRequest",
				userName : userName,
				password : passWord,
				deviceID : deviceID,
				authRequestDate : authRequestEpoch
			};
			
			try { 
				console.log(payload);
    			ws.send('authRequest', payload);
				status.textContent = 'Authenticated!';
    			payload = JSON.stringify(payload);
				$('#log').append('<li>Sent authRequest payload: ' + payload + '</li>');					
			} 
			catch (ex)
			{
				status.textContent = 'Authentication failed!';
				$('#log').append('authRequest failed! Error: ' + ex);
				return false;	
			}
			return true;				
		});
		
		$('#newMessage').click(function() {
        	$('#log').append('<li>Attempting to send a message!</li>');

			message = generateMessage();
			var messageDate = new Date();
			var	messageEpoch = messageDate.getTime();
			//yup, lame
			messageEpoch = "" + messageEpoch + "";  						
        	var payload = {
				type : "newMessage",
				userName : userName,
				userID : uid,
				message : message,
				messageDate : messageEpoch
			};
			console.log(payload);
        	ws.send('newMessage', payload);
        	payload = JSON.stringify(payload);
			$('#log').append('<li>Sent message payload: ' + payload + '</li>');
						
		});		

	});

});