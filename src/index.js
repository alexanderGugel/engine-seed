'use strict';

var DOMElement = require('famous/dom-renderables/DOMElement');
var FamousEngine = require('famous/core/FamousEngine');
var Node = require('famous/core/Node');
var range = require('lodash.range');
var Scroller = require('scroller');

FamousEngine.init();

var root = FamousEngine.createScene();

class DOMNode extends Node {
    constructor(options) {
        super();
        this.el = new DOMElement(this, options);
    }
}

class ScrollerComponent {
    constructor(options) {
        this.scroller = new Scroller((left, top, zoom) => {
            var position = this._node.getPosition();
            this._node.setPosition(position[0] - left, position[1] - top);
        }, options);
        this.mousedown = false;
    }
    onMount(node) {
        this._node = node;
    }
}

class ScrollItemComponent {
    constructor(scrollerComponent) {
        this._scrollerComponent = scrollerComponent;
    }
    onMount(node) {
        this._node = node;
        this._node.addUIEvent('mousemove');
        this._node.addUIEvent('mousedown');
        this._node.addUIEvent('mouseup');
    }
    onReceive(type, ev) {
        switch (type) {
            case 'mousemove':
                if (!this._scrollerComponent.mousedown) return;
                this._scrollerComponent.scroller.doTouchMove([{
                    pageX: ev.pageX,
                    pageY: ev.pageY
                }], ev.timeStamp);
                break;
            case 'mousedown':
                this._scrollerComponent.mousedown = true;
                this._scrollerComponent.scroller.doTouchStart([{
                    pageX: ev.pageX,
                    pageY: ev.pageY
                }], ev.timeStamp);
                break;
            case 'mouseup':
                if (!this._scrollerComponent.mousedown) return;
                this._scrollerComponent.mousedown = false;
                this._scrollerComponent.scroller.doTouchEnd(ev.timeStamp);
                break;
        }
    }
}


var scrollerComponent = new ScrollerComponent({ scrollingX: false });
root.addComponent(scrollerComponent);

range(0, 100).map(i => root.addChild(
    new DOMNode({ content: i, properties: { background: i % 2 ? 'red' : 'blue' } })
        .setPosition(null, i*500).setSizeMode(null, 'absolute').setAbsoluteSize(null, 500)
)).map(node => node.addComponent(new ScrollItemComponent(scrollerComponent)));
