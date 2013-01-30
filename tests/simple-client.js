/**
 * simple client
 */

// throw more exceptions and check coding conventions 
// blooper patrol
"use strict";

// Initialize everything when the window finishes loading
window.addEventListener("load", function(event) {
	//server status
	var status = document.getElementById("status");
	//server ws url
	var url = document.getElementById("url");
	//connect to server
	var connect = document.getElementById('connect');
	//disconnect from server
	var disconnect = document.getElementById('disconnect');
	//send raw message
	var send = document.getElementById("send");
	//raw message text
	var text = document.getElementById("text");
	//server response
	var message = document.getElementById("message");
	//test object
	var test;

// intial state	
	status.textContent = "Not Connected";
	url.value = "ws://localhost:8080";
	disconnect.disabled = true;
	send.disabled = true;

// start ye engines
	$('#connect').click(function() {
		var ws = $.websocket(url.value, {
		    open: function() {
		    	connect.disabled = true;
				disconnect.disabled = false;
		        send.disabled = false;
		        console.log();
		        status.textContent = 'Connected to ' + url.value;
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
			}
		});

	
		$('#disconnect').click(function() {
			console.log('Attempting to disconnect from ' + url.value);
			ws.close;
		});
		$('#newUser').click(function() {
			console.log('newUser button hit');
        	$('#log').append('<li>Attempting to create a dummy user</li>');
        	var payload = {
				type : "newUser",
				userName : "dummy",
				password : "notarealpassword",
				deviceID : "0000000000000000",
				authRequestDate :"0980983298309802"
			};
        	ws.send('newUser', payload);
		});

	});

});