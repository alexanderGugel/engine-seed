'use strict';

var Compositor = require('famous/renderers/Compositor');
var UIManager = require('famous/renderers/UIManager');
var SocketLoop = require('./SocketLoop');
var SocketChannel = require('./SocketChannel');

// Boilerplate
new UIManager(
    new SocketChannel('http://localhost:1620'),
    new Compositor(),
    new SocketLoop('http://localhost:1621')
);
