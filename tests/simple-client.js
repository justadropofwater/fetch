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
	var open = document.getElementById("open");
	
	//disconnect from server
	var close = document.getElementById("close");
	
	//send raw message
	var send = document.getElementById("send");
	
	//raw message text
	var text = document.getElementById("text");
	
	//server response
	var message = document.getElementById("message");
	
	//test object
	var test;
	
	status.textContent = "Not Connected";

	url.value = "ws://localhost:8080";
	
	close.disabled = true;
	send.disabled = true;

open.addEventListener("click", function(event) {
	open.disabled = true;
	console.log('We got as the url: ' + url.value);

	var ws = $.websocket(url.value, {
		open: function() {
		},
		close: function() {
		},
		events: {
		}
	});
	
});




