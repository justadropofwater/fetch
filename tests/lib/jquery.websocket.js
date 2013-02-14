/*
 * jQuery Web Sockets Plugin v0.0.3
 * https://github.com/dchelimsky/jquery-websocket
 * http://code.google.com/p/jquery-websocket/
 *
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright (c) 2010 by shootaroo (Shotaro Tsubouchi).
 */
(function($){
    $.extend({
        websocket: function(url, s, protocols) {
            var ws = window['MozWebSocket'] ? new MozWebSocket(url, protocols || []) : window['WebSocket'] ? new WebSocket(url, protocols || []) : {
                send: function(m){ return false; },
                close: function(){}
            };
            var settings = {
                open: function(){},
                close: function(){},
                message: function(){},
                options: {},
                events: {}
            };
            $.extend(settings, $.websocketSettings, s);
			$(ws)
                .bind('open', settings.open)
                .bind('close', settings.close)
                .bind('message', settings.message)
                .bind('message', function(e) {
                	var eString = e.originalEvent;
                	console.log(eString);
                   	var m = eString.data;
                    console.log(m);
                    //console.log('from bind: ' + eString);
                    var h = settings.events[e.originalEvent.type];
                    if (h) h.call(this, m);
                });
            ws._send = ws.send;
            
            ws.send = function(type, data) {
            	console.log(data.type);
                var sent = data.type;
                data = JSON.stringify(data);
                console.log('Sending server: ' + data);

               	try { 
					this._send(data);
					console.log('Data sent!');
				} 
				catch(ex)
				{ 
					console.log('Send failed! Error: ' + ex);
					return false;	
				}
			return true;
                
            };
            $(window).unload(function(){ ws.close(); ws = null; });
            return ws;
        }
    });
})(jQuery);
