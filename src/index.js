'use strict';

var Compositor = require('famous/renderers/Compositor');
var UIManager = require('famous/renderers/UIManager');
var SocketLoop = require('./SocketLoop');





// Boilerplate
new UIManager(
    new Worker('worker.bundle.js'),
    new Compositor(),
    new SocketLoop('http://localhost:1619')
);
