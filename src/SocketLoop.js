'use strict';

var RequestAnimationFrameLoop = require('famous/render-loops/RequestAnimationFrameLoop');

function SocketLoop(host) {
    this._updateables = [];
    this._socket = io.connect(host);

    var _this = this;
    this._socket.on('frame', function (data) {
        for (var i = 0; i < _this._updateables.length; i++)
            _this._updateables[i].update(data.timestamp);
    });
}

SocketLoop.prototype.update = function(updateable) {
    this._updateables.push(updateable);
};

SocketLoop.prototype.noLongerUpdate = function(updateable) {
    var index = this._updateables.indexOf(updateable);
    if (index !== -1) this._updateables.splice(index, 1);
};

SocketLoop.prototype.start = function() {};
SocketLoop.prototype.stop = function() {};

module.exports = SocketLoop;
