var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(1619);

app.use(express.static('public'));

io.on('connection', function (socket) {
    setInterval(function() {
        socket.emit('frame', { timestamp: Date.now() });
    }, 16);
});
