var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var DOMElement = require('famous/dom-renderables/DOMElement');
var FamousEngine = require('famous/core/FamousEngine');

server.listen(1620);

function ServerEngine(socket) {
    this._socket = socket;

    FamousEngine.constructor.call(this);

    var _this = this;

    this._socket.on('famous-message', function(message) {
        console.log(message)
        _this.handleMessage(message.data);
    });

    this._channel = {
        sendMessage: function(message) {
            _this._socket.emit('famous-message', { data: message });
        }
    };
}

ServerEngine.prototype = Object.create(FamousEngine);
ServerEngine.prototype.constructor = ServerEngine;

io.on('connection', function (socket) {


    var logo = (new ServerEngine(socket)).createScene().addChild();

    // Create an [image] DOM element providing the logo 'node' with the 'src' path
    new DOMElement(logo, { tagName: 'img' })
        .setAttribute('src', './images/famous_logo.png');

    // Chainable API
    logo
        .setSizeMode('absolute', 'absolute', 'absolute')
        .setAbsoluteSize(250, 250)
        .setAlign(0.5, 0.5)
        .setMountPoint(0.5, 0.5)
        .setOrigin(0.5, 0.5);

    var spinner = logo.addComponent({
        onUpdate: function(time) {
            logo.setRotation(0, time / 1000, 0);
            logo.requestUpdateOnNextTick(spinner);
        }
    });

    logo.requestUpdate(spinner);
});
