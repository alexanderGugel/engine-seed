'use strict';

function SocketChannel(host) {
    this._socket = io.connect(host);

    var _this = this;
    this._socket.on('famous-message', function (message) {
        console.log(message)
        _this.onmessage({ data: message.data });
    });
}

SocketChannel.prototype.postMessage = function (message) {
    this._socket.emit('famous-message', { data: message });
    return this;
};

module.exports = SocketChannel;
