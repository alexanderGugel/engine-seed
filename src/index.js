'use strict';

var Compositor = require('famous/renderers/Compositor');
var UIManager = require('famous/renderers/UIManager');
// var SocketLoop = require('./SocketLoop');
// var SocketChannel = require('./SocketChannel');
var RequestAnimationFrameLoop = require('famous/render-loops/RequestAnimationFrameLoop');


function SocketChannel(host) {
    this._socket = io.connect(host);

    var _this = this;
    this._socket.on('famous-message', function (message) {
        _this.onmessage({ data: message.data });
    });
}

SocketChannel.prototype.postMessage = function (message) {
    this._socket.emit('famous-message', { data: message });
    return this;
};


// Boilerplate
new UIManager(
    new SocketChannel('http://localhost:1620'),
    new Compositor(),
    new RequestAnimationFrameLoop()
    // new SocketLoop('http://localhost:1619')
);
