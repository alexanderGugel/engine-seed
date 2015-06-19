var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(1621);

io.on('connection', function (socket) {
    setInterval(function() {
        socket.emit('frame', { timestamp: Date.now() });
    }, 16);
});
