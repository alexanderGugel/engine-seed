(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Camera is a component that is responsible for sending information to the renderer about where
 * the camera is in the scene.  This allows the user to set the type of projection, the focal depth,
 * and other properties to adjust the way the scenes are rendered.
 *
 * @class Camera
 *
 * @param {Node} node to which the instance of Camera will be a component of
 */
function Camera(node) {
    this._node = node;
    this._projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
    this._focalDepth = 0;
    this._near = 0;
    this._far = 0;
    this._requestingUpdate = false;
    this._id = node.addComponent(this);
    this._viewTransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._viewDirty = false;
    this._perspectiveDirty = false;
    this.setFlat();
}

Camera.FRUSTUM_PROJECTION = 0;
Camera.PINHOLE_PROJECTION = 1;
Camera.ORTHOGRAPHIC_PROJECTION = 2;

/**
 * @method
 *
 * @return {String} Name of the component
 */
Camera.prototype.toString = function toString() {
    return 'Camera';
};

/**
 * Gets object containing serialized data for the component
 *
 * @method
 *
 * @return {Object} the state of the component
 */
Camera.prototype.getValue = function getValue() {
    return {
        component: this.toString(),
        projectionType: this._projectionType,
        focalDepth: this._focalDepth,
        near: this._near,
        far: this._far
    };
};

/**
 * Set the components state based on some serialized data
 *
 * @method
 *
 * @param {Object} state an object defining what the state of the component should be
 *
 * @return {Boolean} status of the set
 */
Camera.prototype.setValue = function setValue(state) {
    if (this.toString() === state.component) {
        this.set(state.projectionType, state.focalDepth, state.near, state.far);
        return true;
    }
    return false;
};

/**
 * Set the internals of the component
 *
 * @method
 *
 * @param {Number} type an id corresponding to the type of projection to use
 * @param {Number} depth the depth for the pinhole projection model
 * @param {Number} near the distance of the near clipping plane for a frustum projection
 * @param {Number} far the distance of the far clipping plane for a frustum projection
 *
 * @return {Boolean} status of the set
 */
Camera.prototype.set = function set(type, depth, near, far) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._projectionType = type;
    this._focalDepth = depth;
    this._near = near;
    this._far = far;
};

/**
 * Set the camera depth for a pinhole projection model
 *
 * @method
 *
 * @param {Number} depth the distance between the Camera and the origin
 *
 * @return {Camera} this
 */
Camera.prototype.setDepth = function setDepth(depth) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }
    this._perspectiveDirty = true;
    this._projectionType = Camera.PINHOLE_PROJECTION;
    this._focalDepth = depth;
    this._near = 0;
    this._far = 0;

    return this;
};

/**
 * Gets object containing serialized data for the component
 *
 * @method
 *
 * @param {Number} near distance from the near clipping plane to the camera
 * @param {Number} far distance from the far clipping plane to the camera
 *
 * @return {Camera} this
 */
Camera.prototype.setFrustum = function setFrustum(near, far) {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._perspectiveDirty = true;
    this._projectionType = Camera.FRUSTUM_PROJECTION;
    this._focalDepth = 0;
    this._near = near;
    this._far = far;

    return this;
};

/**
 * Set the Camera to have orthographic projection
 *
 * @method
 *
 * @return {Camera} this
 */
Camera.prototype.setFlat = function setFlat() {
    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    this._perspectiveDirty = true;
    this._projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
    this._focalDepth = 0;
    this._near = 0;
    this._far = 0;

    return this;
};

/**
 * When the node this component is attached to updates, the Camera will
 * send new camera information to the Compositor to update the rendering
 * of the scene.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Camera.prototype.onUpdate = function onUpdate() {
    this._requestingUpdate = false;

    var path = this._node.getLocation();

    this._node
        .sendDrawCommand('WITH')
        .sendDrawCommand(path);

    if (this._perspectiveDirty) {
        this._perspectiveDirty = false;

        switch (this._projectionType) {
            case Camera.FRUSTUM_PROJECTION:
                this._node.sendDrawCommand('FRUSTUM_PROJECTION');
                this._node.sendDrawCommand(this._near);
                this._node.sendDrawCommand(this._far);
                break;
            case Camera.PINHOLE_PROJECTION:
                this._node.sendDrawCommand('PINHOLE_PROJECTION');
                this._node.sendDrawCommand(this._focalDepth);
                break;
            case Camera.ORTHOGRAPHIC_PROJECTION:
                this._node.sendDrawCommand('ORTHOGRAPHIC_PROJECTION');
                break;
        }
    }

    if (this._viewDirty) {
        this._viewDirty = false;

        this._node.sendDrawCommand('CHANGE_VIEW_TRANSFORM');
        this._node.sendDrawCommand(this._viewTransform[0]);
        this._node.sendDrawCommand(this._viewTransform[1]);
        this._node.sendDrawCommand(this._viewTransform[2]);
        this._node.sendDrawCommand(this._viewTransform[3]);

        this._node.sendDrawCommand(this._viewTransform[4]);
        this._node.sendDrawCommand(this._viewTransform[5]);
        this._node.sendDrawCommand(this._viewTransform[6]);
        this._node.sendDrawCommand(this._viewTransform[7]);

        this._node.sendDrawCommand(this._viewTransform[8]);
        this._node.sendDrawCommand(this._viewTransform[9]);
        this._node.sendDrawCommand(this._viewTransform[10]);
        this._node.sendDrawCommand(this._viewTransform[11]);

        this._node.sendDrawCommand(this._viewTransform[12]);
        this._node.sendDrawCommand(this._viewTransform[13]);
        this._node.sendDrawCommand(this._viewTransform[14]);
        this._node.sendDrawCommand(this._viewTransform[15]);
    }
};

/**
 * When the transform of the node this component is attached to
 * changes, have the Camera update its projection matrix and
 * if needed, flag to node to update.
 *
 * @method
 *
 * @param {Array} transform an array denoting the transform matrix of the node
 *
 * @return {Camera} this
 */
Camera.prototype.onTransformChange = function onTransformChange(transform) {
    var a = transform;
    this._viewDirty = true;

    if (!this._requestingUpdate) {
        this._node.requestUpdate(this._id);
        this._requestingUpdate = true;
    }

    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
    a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
    a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
    a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

    b00 = a00 * a11 - a01 * a10,
    b01 = a00 * a12 - a02 * a10,
    b02 = a00 * a13 - a03 * a10,
    b03 = a01 * a12 - a02 * a11,
    b04 = a01 * a13 - a03 * a11,
    b05 = a02 * a13 - a03 * a12,
    b06 = a20 * a31 - a21 * a30,
    b07 = a20 * a32 - a22 * a30,
    b08 = a20 * a33 - a23 * a30,
    b09 = a21 * a32 - a22 * a31,
    b10 = a21 * a33 - a23 * a31,
    b11 = a22 * a33 - a23 * a32,

    det = 1/(b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);

    this._viewTransform[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    this._viewTransform[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    this._viewTransform[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    this._viewTransform[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    this._viewTransform[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    this._viewTransform[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    this._viewTransform[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    this._viewTransform[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    this._viewTransform[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    this._viewTransform[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    this._viewTransform[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    this._viewTransform[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    this._viewTransform[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    this._viewTransform[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    this._viewTransform[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    this._viewTransform[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
};

module.exports = Camera;

},{}],2:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var ElementCache = require('./ElementCache');
var math = require('./Math');
var vendorPrefix = require('../utilities/vendorPrefix');
var eventMap = require('./events/EventMap');

var TRANSFORM = null;

/**
 * DOMRenderer is a class responsible for adding elements
 * to the DOM and writing to those elements.
 * There is a DOMRenderer per context, represented as an
 * element and a selector. It is instantiated in the
 * context class.
 *
 * @class DOMRenderer
 *
 * @param {HTMLElement} element an element.
 * @param {String} selector the selector of the element.
 * @param {Compositor} compositor the compositor controlling the renderer
 */
function DOMRenderer (element, selector, compositor) {
    var _this = this;

    element.classList.add('famous-dom-renderer');

    TRANSFORM = TRANSFORM || vendorPrefix('transform');
    this._compositor = compositor; // a reference to the compositor

    this._target = null; // a register for holding the current
                         // element that the Renderer is operating
                         // upon

    this._parent = null; // a register for holding the parent
                         // of the target

    this._path = null; // a register for holding the path of the target
                       // this register must be set first, and then
                       // children, target, and parent are all looked
                       // up from that.

    this._children = []; // a register for holding the children of the
                         // current target.

    this._root = new ElementCache(element, selector); // the root
                                                      // of the dom tree that this
                                                      // renderer is responsible
                                                      // for

    this._boundTriggerEvent = function (ev) {
        return _this._triggerEvent(ev);
    };

    this._selector = selector;

    this._elements = {};

    this._elements[selector] = this._root;

    this.perspectiveTransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    this._VPtransform = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    this._size = [null, null];
}


/**
 * Attaches an EventListener to the element associated with the passed in path.
 * Prevents the default browser action on all subsequent events if
 * `preventDefault` is truthy.
 * All incoming events will be forwarded to the compositor by invoking the
 * `sendEvent` method.
 * Delegates events if possible by attaching the event listener to the context.
 *
 * @method
 *
 * @param {String} type DOM event type (e.g. click, mouseover).
 * @param {Boolean} preventDefault Whether or not the default browser action should be prevented.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.subscribe = function subscribe(type, preventDefault) {
    // TODO preventDefault should be a separate command
    this._assertTargetLoaded();

    this._target.preventDefault[type] = preventDefault;
    this._target.subscribe[type] = true;

    if (
        !this._target.listeners[type] && !this._root.listeners[type]
    ) {
        var target = eventMap[type][1] ? this._root : this._target;
        target.listeners[type] = this._boundTriggerEvent;
        target.element.addEventListener(type, this._boundTriggerEvent);
    }
};

/**
 * Function to be added using `addEventListener` to the corresponding
 * DOMElement.
 *
 * @method
 * @private
 *
 * @param {Event} ev DOM Event payload
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._triggerEvent = function _triggerEvent(ev) {
    // Use ev.path, which is an array of Elements (polyfilled if needed).
    var evPath = ev.path ? ev.path : _getPath(ev);
    // First element in the path is the element on which the event has actually
    // been emitted.
    for (var i = 0; i < evPath.length; i++) {
        // Skip nodes that don't have a dataset property or data-fa-path
        // attribute.
        if (!evPath[i].dataset) continue;
        var path = evPath[i].dataset.faPath;
        if (!path) continue;

        // Stop further event propogation and path traversal as soon as the
        // first ElementCache subscribing for the emitted event has been found.
        if (this._elements[path] && this._elements[path].subscribe[ev.type]) {
            ev.stopPropagation();

            // Optionally preventDefault. This needs forther consideration and
            // should be optional. Eventually this should be a separate command/
            // method.
            if (this._elements[path].preventDefault[ev.type]) {
                ev.preventDefault();
            }

            var NormalizedEventConstructor = eventMap[ev.type][0];

            // Finally send the event to the Worker Thread through the
            // compositor.
            this._compositor.sendEvent(path, ev.type, new NormalizedEventConstructor(ev));

            break;
        }
    }
};


/**
 * getSizeOf gets the dom size of a particular DOM element.  This is
 * needed for render sizing in the scene graph.
 *
 * @method
 *
 * @param {String} path path of the Node in the scene graph
 *
 * @return {Array} a vec3 of the offset size of the dom element
 */
DOMRenderer.prototype.getSizeOf = function getSizeOf(path) {
    var element = this._elements[path];
    if (!element) return null;

    var res = {val: element.size};
    this._compositor.sendEvent(path, 'resize', res);
    return res;
};

function _getPath(ev) {
    // TODO move into _triggerEvent, avoid object allocation
    var path = [];
    var node = ev.target;
    while (node !== document.body) {
        path.push(node);
        node = node.parentNode;
    }
    return path;
}


/**
 * Determines the size of the context by querying the DOM for `offsetWidth` and
 * `offsetHeight`.
 *
 * @method
 *
 * @return {Array} Offset size.
 */
DOMRenderer.prototype.getSize = function getSize() {
    this._size[0] = this._root.element.offsetWidth;
    this._size[1] = this._root.element.offsetHeight;
    return this._size;
};

DOMRenderer.prototype._getSize = DOMRenderer.prototype.getSize;


/**
 * Executes the retrieved draw commands. Draw commands only refer to the
 * cross-browser normalized `transform` property.
 *
 * @method
 *
 * @param {Object} renderState description
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.draw = function draw(renderState) {
    if (renderState.perspectiveDirty) {
        this.perspectiveDirty = true;

        this.perspectiveTransform[0] = renderState.perspectiveTransform[0];
        this.perspectiveTransform[1] = renderState.perspectiveTransform[1];
        this.perspectiveTransform[2] = renderState.perspectiveTransform[2];
        this.perspectiveTransform[3] = renderState.perspectiveTransform[3];

        this.perspectiveTransform[4] = renderState.perspectiveTransform[4];
        this.perspectiveTransform[5] = renderState.perspectiveTransform[5];
        this.perspectiveTransform[6] = renderState.perspectiveTransform[6];
        this.perspectiveTransform[7] = renderState.perspectiveTransform[7];

        this.perspectiveTransform[8] = renderState.perspectiveTransform[8];
        this.perspectiveTransform[9] = renderState.perspectiveTransform[9];
        this.perspectiveTransform[10] = renderState.perspectiveTransform[10];
        this.perspectiveTransform[11] = renderState.perspectiveTransform[11];

        this.perspectiveTransform[12] = renderState.perspectiveTransform[12];
        this.perspectiveTransform[13] = renderState.perspectiveTransform[13];
        this.perspectiveTransform[14] = renderState.perspectiveTransform[14];
        this.perspectiveTransform[15] = renderState.perspectiveTransform[15];
    }

    if (renderState.viewDirty || renderState.perspectiveDirty) {
        math.multiply(this._VPtransform, this.perspectiveTransform, renderState.viewTransform);
        this._root.element.style[TRANSFORM] = this._stringifyMatrix(this._VPtransform);
    }
};


/**
 * Internal helper function used for ensuring that a path is currently loaded.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertPathLoaded = function _asserPathLoaded() {
    if (!this._path) throw new Error('path not loaded');
};

/**
 * Internal helper function used for ensuring that a parent is currently loaded.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertParentLoaded = function _assertParentLoaded() {
    if (!this._parent) throw new Error('parent not loaded');
};

/**
 * Internal helper function used for ensuring that children are currently
 * loaded.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertChildrenLoaded = function _assertChildrenLoaded() {
    if (!this._children) throw new Error('children not loaded');
};

/**
 * Internal helper function used for ensuring that a target is currently loaded.
 *
 * @method  _assertTargetLoaded
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype._assertTargetLoaded = function _assertTargetLoaded() {
    if (!this._target) throw new Error('No target loaded');
};

/**
 * Finds and sets the parent of the currently loaded element (path).
 *
 * @method
 * @private
 *
 * @return {ElementCache} Parent element.
 */
DOMRenderer.prototype.findParent = function findParent () {
    this._assertPathLoaded();

    var path = this._path;
    var parent;

    while (!parent && path.length) {
        path = path.substring(0, path.lastIndexOf('/'));
        parent = this._elements[path];
    }
    this._parent = parent;
    return parent;
};


/**
 * Finds all children of the currently loaded element.
 *
 * @method
 * @private
 *
 * @param {Array} array Output-Array used for writing to (subsequently appending children)
 *
 * @return {Array} array of children elements
 */
DOMRenderer.prototype.findChildren = function findChildren(array) {
    // TODO: Optimize me.
    this._assertPathLoaded();

    var path = this._path + '/';
    var keys = Object.keys(this._elements);
    var i = 0;
    var len;
    array = array ? array : this._children;

    this._children.length = 0;

    while (i < keys.length) {
        if (keys[i].indexOf(path) === -1 || keys[i] === path) keys.splice(i, 1);
        else i++;
    }
    var currentPath;
    var j = 0;
    for (i = 0 ; i < keys.length ; i++) {
        currentPath = keys[i];
        for (j = 0 ; j < keys.length ; j++) {
            if (i !== j && keys[j].indexOf(currentPath) !== -1) {
                keys.splice(j, 1);
                i--;
            }
        }
    }
    for (i = 0, len = keys.length ; i < len ; i++)
        array[i] = this._elements[keys[i]];

    return array;
};


/**
 * Used for determining the target loaded under the current path.
 *
 * @method
 *
 * @return {ElementCache|undefined} Element loaded under defined path.
 */
DOMRenderer.prototype.findTarget = function findTarget() {
    this._target = this._elements[this._path];
    return this._target;
};


/**
 * Loads the passed in path.
 *
 * @method
 *
 * @param {String} path Path to be loaded
 *
 * @return {String} Loaded path
 */
DOMRenderer.prototype.loadPath = function loadPath (path) {
    this._path = path;
    return this._path;
};


/**
 * Inserts a DOMElement at the currently loaded path, assuming no target is
 * loaded. Only one DOMElement can be associated with each path.
 *
 * @method
 *
 * @param {String} tagName Tag name (capitalization will be normalized).
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.insertEl = function insertEl (tagName) {
    if (!this._target ||
        this._target.element.tagName.toLowerCase() !== tagName.toLowerCase()) {

        this.findParent();
        this.findChildren();

        this._assertParentLoaded();
        this._assertChildrenLoaded();

        if (this._target) this._parent.element.removeChild(this._target.element);

        this._target = new ElementCache(document.createElement(tagName), this._path);
        this._parent.element.appendChild(this._target.element);
        this._elements[this._path] = this._target;

        for (var i = 0, len = this._children.length ; i < len ; i++) {
            this._target.element.appendChild(this._children[i].element);
        }
    }
};


/**
 * Sets a property on the currently loaded target.
 *
 * @method
 *
 * @param {String} name Property name (e.g. background, color, font)
 * @param {String} value Proprty value (e.g. black, 20px)
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setProperty = function setProperty (name, value) {
    this._assertTargetLoaded();
    this._target.element.style[name] = value;
};


/**
 * Sets the size of the currently loaded target.
 * Removes any explicit sizing constraints when passed in `false`
 * ("true-sizing").
 *
 * @method
 *
 * @param {Number|false} width   Width to be set.
 * @param {Number|false} height  Height to be set.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setSize = function setSize (width, height) {
    this._assertTargetLoaded();

    this.setWidth(width);
    this.setHeight(height);
};

/**
 * Sets the width of the currently loaded target.
 * Removes any explicit sizing constraints when passed in `false`
 * ("true-sizing").
 *
 * @method
 *
 * @param {Number|false} width Width to be set.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setWidth = function setWidth(width) {
    this._assertTargetLoaded();

    var contentWrapper = this._target.content;

    if (width === false) {
        this._target.explicitWidth = true;
        if (contentWrapper) contentWrapper.style.width = '';
        width = contentWrapper ? contentWrapper.offsetWidth : 0;
        this._target.element.style.width = width + 'px';
    }
    else {
        this._target.explicitWidth = false;
        if (contentWrapper) contentWrapper.style.width = width + 'px';
        this._target.element.style.width = width + 'px';
    }

    this._target.size[0] = width;
};

/**
 * Sets the height of the currently loaded target.
 * Removes any explicit sizing constraints when passed in `false`
 * ("true-sizing").
 *
 * @method
 *
 * @param {Number|false} height Height to be set.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setHeight = function setHeight(height) {
    this._assertTargetLoaded();

    var contentWrapper = this._target.content;

    if (height === false) {
        this._target.explicitHeight = true;
        if (contentWrapper) contentWrapper.style.height = '';
        height = contentWrapper ? contentWrapper.offsetHeight : 0;
        this._target.element.style.height = height + 'px';
    }
    else {
        this._target.explicitHeight = false;
        if (contentWrapper) contentWrapper.style.height = height + 'px';
        this._target.element.style.height = height + 'px';
    }

    this._target.size[1] = height;
};

/**
 * Sets an attribute on the currently loaded target.
 *
 * @method
 *
 * @param {String} name Attribute name (e.g. href)
 * @param {String} value Attribute value (e.g. http://famous.org)
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setAttribute = function setAttribute(name, value) {
    this._assertTargetLoaded();
    this._target.element.setAttribute(name, value);
};

/**
 * Sets the `innerHTML` content of the currently loaded target.
 *
 * @method
 *
 * @param {String} content Content to be set as `innerHTML`
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setContent = function setContent(content) {
    this._assertTargetLoaded();
    this.findChildren();

    if (!this._target.content) {
        this._target.content = document.createElement('div');
        this._target.content.classList.add('famous-dom-element-content');
        this._target.element.insertBefore(
            this._target.content,
            this._target.element.firstChild
        );
    }
    this._target.content.innerHTML = content;

    this.setSize(
        this._target.explicitWidth ? false : this._target.size[0],
        this._target.explicitHeight ? false : this._target.size[1]
    );
};


/**
 * Sets the passed in transform matrix (world space). Inverts the parent's world
 * transform.
 *
 * @method
 *
 * @param {Float32Array} transform The transform for the loaded DOM Element in world space
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.setMatrix = function setMatrix(transform) {
    // TODO Don't multiply matrics in the first place.
    this._assertTargetLoaded();
    this.findParent();
    var worldTransform = this._target.worldTransform;
    var changed = false;

    var i;
    var len;

    if (transform)
        for (i = 0, len = 16 ; i < len ; i++) {
            changed = changed ? changed : worldTransform[i] === transform[i];
            worldTransform[i] = transform[i];
        }
    else changed = true;

    if (changed) {
        math.invert(this._target.invertedParent, this._parent.worldTransform);
        math.multiply(this._target.finalTransform, this._target.invertedParent, worldTransform);

        // TODO: this is a temporary fix for draw commands
        // coming in out of order
        var children = this.findChildren([]);
        var previousPath = this._path;
        var previousTarget = this._target;
        for (i = 0, len = children.length ; i < len ; i++) {
            this._target = children[i];
            this._path = this._target.path;
            this.setMatrix();
        }
        this._path = previousPath;
        this._target = previousTarget;
    }

    this._target.element.style[TRANSFORM] = this._stringifyMatrix(this._target.finalTransform);
};


/**
 * Adds a class to the classList associated with the currently loaded target.
 *
 * @method
 *
 * @param {String} domClass Class name to be added to the current target.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.addClass = function addClass(domClass) {
    this._assertTargetLoaded();
    this._target.element.classList.add(domClass);
};


/**
 * Removes a class from the classList associated with the currently loaded
 * target.
 *
 * @method
 *
 * @param {String} domClass Class name to be removed from currently loaded target.
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.removeClass = function removeClass(domClass) {
    this._assertTargetLoaded();
    this._target.element.classList.remove(domClass);
};


/**
 * Stringifies the passed in matrix for setting the `transform` property.
 *
 * @method  _stringifyMatrix
 * @private
 *
 * @param {Array} m    Matrix as an array or array-like object.
 * @return {String}     Stringified matrix as `matrix3d`-property.
 */
DOMRenderer.prototype._stringifyMatrix = function _stringifyMatrix(m) {
    var r = 'matrix3d(';

    r += (m[0] < 0.000001 && m[0] > -0.000001) ? '0,' : m[0] + ',';
    r += (m[1] < 0.000001 && m[1] > -0.000001) ? '0,' : m[1] + ',';
    r += (m[2] < 0.000001 && m[2] > -0.000001) ? '0,' : m[2] + ',';
    r += (m[3] < 0.000001 && m[3] > -0.000001) ? '0,' : m[3] + ',';
    r += (m[4] < 0.000001 && m[4] > -0.000001) ? '0,' : m[4] + ',';
    r += (m[5] < 0.000001 && m[5] > -0.000001) ? '0,' : m[5] + ',';
    r += (m[6] < 0.000001 && m[6] > -0.000001) ? '0,' : m[6] + ',';
    r += (m[7] < 0.000001 && m[7] > -0.000001) ? '0,' : m[7] + ',';
    r += (m[8] < 0.000001 && m[8] > -0.000001) ? '0,' : m[8] + ',';
    r += (m[9] < 0.000001 && m[9] > -0.000001) ? '0,' : m[9] + ',';
    r += (m[10] < 0.000001 && m[10] > -0.000001) ? '0,' : m[10] + ',';
    r += (m[11] < 0.000001 && m[11] > -0.000001) ? '0,' : m[11] + ',';
    r += (m[12] < 0.000001 && m[12] > -0.000001) ? '0,' : m[12] + ',';
    r += (m[13] < 0.000001 && m[13] > -0.000001) ? '0,' : m[13] + ',';
    r += (m[14] < 0.000001 && m[14] > -0.000001) ? '0,' : m[14] + ',';

    r += m[15] + ')';
    return r;
};

module.exports = DOMRenderer;

},{"../utilities/vendorPrefix":28,"./ElementCache":3,"./Math":4,"./events/EventMap":7}],3:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

// Transform identity matrix. 
var ident = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

/**
 * ElementCache is being used for keeping track of an element's DOM Element,
 * path, world transform, inverted parent, final transform (as being used for
 * setting the actual `transform`-property) and post render size (final size as
 * being rendered to the DOM).
 * 
 * @class ElementCache
 *  
 * @param {Element} element DOMElement
 * @param {String} path Path used for uniquely identifying the location in the scene graph.
 */ 
function ElementCache (element, path) {
    this.element = element;
    this.path = path;
    this.content = null;
    this.size = new Int16Array(3);
    this.explicitHeight = false;
    this.explicitWidth = false;
    this.worldTransform = new Float32Array(ident);
    this.invertedParent = new Float32Array(ident);
    this.finalTransform = new Float32Array(ident);
    this.postRenderSize = new Float32Array(2);
    this.listeners = {};
    this.preventDefault = {};
    this.subscribe = {};
}

module.exports = ElementCache;

},{}],4:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A method for inverting a transform matrix
 *
 * @method
 *
 * @param {Array} out array to store the return of the inversion
 * @param {Array} a transform matrix to inverse
 *
 * @return {Array} out
 *   output array that is storing the transform matrix
 */
function invert (out, a) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b00 = a00 * a11 - a01 * a10,
        b01 = a00 * a12 - a02 * a10,
        b02 = a00 * a13 - a03 * a10,
        b03 = a01 * a12 - a02 * a11,
        b04 = a01 * a13 - a03 * a11,
        b05 = a02 * a13 - a03 * a12,
        b06 = a20 * a31 - a21 * a30,
        b07 = a20 * a32 - a22 * a30,
        b08 = a20 * a33 - a23 * a30,
        b09 = a21 * a32 - a22 * a31,
        b10 = a21 * a33 - a23 * a31,
        b11 = a22 * a33 - a23 * a32,

        // Calculate the determinant
        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
        return null;
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
}

/**
 * A method for multiplying two matricies
 *
 * @method
 *
 * @param {Array} out array to store the return of the multiplication
 * @param {Array} a transform matrix to multiply
 * @param {Array} b transform matrix to multiply
 *
 * @return {Array} out
 *   output array that is storing the transform matrix
 */
function multiply (out, a, b) {
    var a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3],
        a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7],
        a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11],
        a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15],

        b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3],
        b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7],
        b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11],
        b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];

    var changed = false;
    var out0, out1, out2, out3;

    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[0] ||
                        out1 === out[1] ||
                        out2 === out[2] ||
                        out3 === out[3];

    out[0] = out0;
    out[1] = out1;
    out[2] = out2;
    out[3] = out3;

    b0 = b4; b1 = b5; b2 = b6; b3 = b7;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[4] ||
                        out1 === out[5] ||
                        out2 === out[6] ||
                        out3 === out[7];

    out[4] = out0;
    out[5] = out1;
    out[6] = out2;
    out[7] = out3;

    b0 = b8; b1 = b9; b2 = b10; b3 = b11;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[8] ||
                        out1 === out[9] ||
                        out2 === out[10] ||
                        out3 === out[11];

    out[8] = out0;
    out[9] = out1;
    out[10] = out2;
    out[11] = out3;

    b0 = b12; b1 = b13; b2 = b14; b3 = b15;
    out0 = b0*a00 + b1*a10 + b2*a20 + b3*a30;
    out1 = b0*a01 + b1*a11 + b2*a21 + b3*a31;
    out2 = b0*a02 + b1*a12 + b2*a22 + b3*a32;
    out3 = b0*a03 + b1*a13 + b2*a23 + b3*a33;

    changed = changed ?
              changed : out0 === out[12] ||
                        out1 === out[13] ||
                        out2 === out[14] ||
                        out3 === out[15];

    out[12] = out0;
    out[13] = out1;
    out[14] = out2;
    out[15] = out3;

    return out;
}

module.exports = {
    multiply: multiply,
    invert: invert
};

},{}],5:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-compositionevents).
 *
 * @class CompositionEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function CompositionEvent(ev) {
    // [Constructor(DOMString typeArg, optional CompositionEventInit compositionEventInitDict)]
    // interface CompositionEvent : UIEvent {
    //     readonly    attribute DOMString data;
    // };

    UIEvent.call(this, ev);

    /**
     * @name CompositionEvent#data
     * @type String
     */
    this.data = ev.data;
}

CompositionEvent.prototype = Object.create(UIEvent.prototype);
CompositionEvent.prototype.constructor = CompositionEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
CompositionEvent.prototype.toString = function toString () {
    return 'CompositionEvent';
};

module.exports = CompositionEvent;

},{"./UIEvent":13}],6:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The Event class is being used in order to normalize native DOM events.
 * Events need to be normalized in order to be serialized through the structured
 * cloning algorithm used by the `postMessage` method (Web Workers).
 *
 * Wrapping DOM events also has the advantage of providing a consistent
 * interface for interacting with DOM events across browsers by copying over a
 * subset of the exposed properties that is guaranteed to be consistent across
 * browsers.
 *
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#interface-Event).
 *
 * @class Event
 *
 * @param {Event} ev The native DOM event.
 */
function Event(ev) {
    // [Constructor(DOMString type, optional EventInit eventInitDict),
    //  Exposed=Window,Worker]
    // interface Event {
    //   readonly attribute DOMString type;
    //   readonly attribute EventTarget? target;
    //   readonly attribute EventTarget? currentTarget;

    //   const unsigned short NONE = 0;
    //   const unsigned short CAPTURING_PHASE = 1;
    //   const unsigned short AT_TARGET = 2;
    //   const unsigned short BUBBLING_PHASE = 3;
    //   readonly attribute unsigned short eventPhase;

    //   void stopPropagation();
    //   void stopImmediatePropagation();

    //   readonly attribute boolean bubbles;
    //   readonly attribute boolean cancelable;
    //   void preventDefault();
    //   readonly attribute boolean defaultPrevented;

    //   [Unforgeable] readonly attribute boolean isTrusted;
    //   readonly attribute DOMTimeStamp timeStamp;

    //   void initEvent(DOMString type, boolean bubbles, boolean cancelable);
    // };

    /**
     * @name Event#type
     * @type String
     */
    this.type = ev.type;

    /**
     * @name Event#defaultPrevented
     * @type Boolean
     */
    this.defaultPrevented = ev.defaultPrevented;

    /**
     * @name Event#timeStamp
     * @type Number
     */
    this.timeStamp = ev.timeStamp;


    /**
     * Used for exposing the current target's value.
     *
     * @name Event#value
     * @type String
     */
    var targetConstructor = ev.target.constructor;
    // TODO Support HTMLKeygenElement
    if (
        targetConstructor === HTMLInputElement ||
        targetConstructor === HTMLTextAreaElement ||
        targetConstructor === HTMLSelectElement
    ) {
        this.value = ev.target.value;
    }
}

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
Event.prototype.toString = function toString () {
    return 'Event';
};

module.exports = Event;

},{}],7:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var CompositionEvent = require('./CompositionEvent');
var Event = require('./Event');
var FocusEvent = require('./FocusEvent');
var InputEvent = require('./InputEvent');
var KeyboardEvent = require('./KeyboardEvent');
var MouseEvent = require('./MouseEvent');
var TouchEvent = require('./TouchEvent');
var UIEvent = require('./UIEvent');
var WheelEvent = require('./WheelEvent');

/**
 * A mapping of DOM events to the corresponding handlers
 *
 * @name EventMap
 * @type Object
 */
var EventMap = {
    change                         : [Event, true],
    submit                         : [Event, true],

    // UI Events (http://www.w3.org/TR/uievents/)
    abort                          : [Event, false],
    beforeinput                    : [InputEvent, true],
    blur                           : [FocusEvent, false],
    click                          : [MouseEvent, true],
    compositionend                 : [CompositionEvent, true],
    compositionstart               : [CompositionEvent, true],
    compositionupdate              : [CompositionEvent, true],
    dblclick                       : [MouseEvent, true],
    focus                          : [FocusEvent, false],
    focusin                        : [FocusEvent, true],
    focusout                       : [FocusEvent, true],
    input                          : [InputEvent, true],
    keydown                        : [KeyboardEvent, true],
    keyup                          : [KeyboardEvent, true],
    load                           : [Event, false],
    mousedown                      : [MouseEvent, true],
    mouseenter                     : [MouseEvent, false],
    mouseleave                     : [MouseEvent, false],

    // bubbles, but will be triggered very frequently
    mousemove                      : [MouseEvent, false],

    mouseout                       : [MouseEvent, true],
    mouseover                      : [MouseEvent, true],
    mouseup                        : [MouseEvent, true],
    resize                         : [UIEvent, false],

    // might bubble
    scroll                         : [UIEvent, false],

    select                         : [Event, true],
    unload                         : [Event, false],
    wheel                          : [WheelEvent, true],

    // Touch Events Extension (http://www.w3.org/TR/touch-events-extensions/)
    touchcancel                    : [TouchEvent, true],
    touchend                       : [TouchEvent, true],
    touchmove                      : [TouchEvent, true],
    touchstart                     : [TouchEvent, true]
};

module.exports = EventMap;

},{"./CompositionEvent":5,"./Event":6,"./FocusEvent":8,"./InputEvent":9,"./KeyboardEvent":10,"./MouseEvent":11,"./TouchEvent":12,"./UIEvent":13,"./WheelEvent":14}],8:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-focusevent).
 *
 * @class FocusEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function FocusEvent(ev) {
    // [Constructor(DOMString typeArg, optional FocusEventInit focusEventInitDict)]
    // interface FocusEvent : UIEvent {
    //     readonly    attribute EventTarget? relatedTarget;
    // };

    UIEvent.call(this, ev);
}

FocusEvent.prototype = Object.create(UIEvent.prototype);
FocusEvent.prototype.constructor = FocusEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
FocusEvent.prototype.toString = function toString () {
    return 'FocusEvent';
};

module.exports = FocusEvent;

},{"./UIEvent":13}],9:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [Input Events](http://w3c.github.io/editing-explainer/input-events.html#idl-def-InputEvent).
 *
 * @class InputEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function InputEvent(ev) {
    // [Constructor(DOMString typeArg, optional InputEventInit inputEventInitDict)]
    // interface InputEvent : UIEvent {
    //     readonly    attribute DOMString inputType;
    //     readonly    attribute DOMString data;
    //     readonly    attribute boolean   isComposing;
    //     readonly    attribute Range     targetRange;
    // };

    UIEvent.call(this, ev);

    /**
     * @name    InputEvent#inputType
     * @type    String
     */
    this.inputType = ev.inputType;

    /**
     * @name    InputEvent#data
     * @type    String
     */
    this.data = ev.data;

    /**
     * @name    InputEvent#isComposing
     * @type    Boolean
     */
    this.isComposing = ev.isComposing;

    /**
     * **Limited browser support**.
     *
     * @name    InputEvent#targetRange
     * @type    Boolean
     */
    this.targetRange = ev.targetRange;
}

InputEvent.prototype = Object.create(UIEvent.prototype);
InputEvent.prototype.constructor = InputEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
InputEvent.prototype.toString = function toString () {
    return 'InputEvent';
};

module.exports = InputEvent;

},{"./UIEvent":13}],10:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-keyboardevents).
 *
 * @class KeyboardEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function KeyboardEvent(ev) {
    // [Constructor(DOMString typeArg, optional KeyboardEventInit keyboardEventInitDict)]
    // interface KeyboardEvent : UIEvent {
    //     // KeyLocationCode
    //     const unsigned long DOM_KEY_LOCATION_STANDARD = 0x00;
    //     const unsigned long DOM_KEY_LOCATION_LEFT = 0x01;
    //     const unsigned long DOM_KEY_LOCATION_RIGHT = 0x02;
    //     const unsigned long DOM_KEY_LOCATION_NUMPAD = 0x03;
    //     readonly    attribute DOMString     key;
    //     readonly    attribute DOMString     code;
    //     readonly    attribute unsigned long location;
    //     readonly    attribute boolean       ctrlKey;
    //     readonly    attribute boolean       shiftKey;
    //     readonly    attribute boolean       altKey;
    //     readonly    attribute boolean       metaKey;
    //     readonly    attribute boolean       repeat;
    //     readonly    attribute boolean       isComposing;
    //     boolean getModifierState (DOMString keyArg);
    // };

    UIEvent.call(this, ev);

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_STANDARD
     * @type Number
     */
    this.DOM_KEY_LOCATION_STANDARD = 0x00;

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_LEFT
     * @type Number
     */
    this.DOM_KEY_LOCATION_LEFT = 0x01;

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_RIGHT
     * @type Number
     */
    this.DOM_KEY_LOCATION_RIGHT = 0x02;

    /**
     * @name KeyboardEvent#DOM_KEY_LOCATION_NUMPAD
     * @type Number
     */
    this.DOM_KEY_LOCATION_NUMPAD = 0x03;

    /**
     * @name KeyboardEvent#key
     * @type String
     */
    this.key = ev.key;

    /**
     * @name KeyboardEvent#code
     * @type String
     */
    this.code = ev.code;

    /**
     * @name KeyboardEvent#location
     * @type Number
     */
    this.location = ev.location;

    /**
     * @name KeyboardEvent#ctrlKey
     * @type Boolean
     */
    this.ctrlKey = ev.ctrlKey;

    /**
     * @name KeyboardEvent#shiftKey
     * @type Boolean
     */
    this.shiftKey = ev.shiftKey;

    /**
     * @name KeyboardEvent#altKey
     * @type Boolean
     */
    this.altKey = ev.altKey;

    /**
     * @name KeyboardEvent#metaKey
     * @type Boolean
     */
    this.metaKey = ev.metaKey;

    /**
     * @name KeyboardEvent#repeat
     * @type Boolean
     */
    this.repeat = ev.repeat;

    /**
     * @name KeyboardEvent#isComposing
     * @type Boolean
     */
    this.isComposing = ev.isComposing;

    /**
     * @name KeyboardEvent#keyCode
     * @type String
     * @deprecated
     */
    this.keyCode = ev.keyCode;
}

KeyboardEvent.prototype = Object.create(UIEvent.prototype);
KeyboardEvent.prototype.constructor = KeyboardEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
KeyboardEvent.prototype.toString = function toString () {
    return 'KeyboardEvent';
};

module.exports = KeyboardEvent;

},{"./UIEvent":13}],11:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-mouseevents).
 *
 * @class KeyboardEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function MouseEvent(ev) {
    // [Constructor(DOMString typeArg, optional MouseEventInit mouseEventInitDict)]
    // interface MouseEvent : UIEvent {
    //     readonly    attribute long           screenX;
    //     readonly    attribute long           screenY;
    //     readonly    attribute long           clientX;
    //     readonly    attribute long           clientY;
    //     readonly    attribute boolean        ctrlKey;
    //     readonly    attribute boolean        shiftKey;
    //     readonly    attribute boolean        altKey;
    //     readonly    attribute boolean        metaKey;
    //     readonly    attribute short          button;
    //     readonly    attribute EventTarget?   relatedTarget;
    //     // Introduced in this specification
    //     readonly    attribute unsigned short buttons;
    //     boolean getModifierState (DOMString keyArg);
    // };

    UIEvent.call(this, ev);

    /**
     * @name MouseEvent#screenX
     * @type Number
     */
    this.screenX = ev.screenX;

    /**
     * @name MouseEvent#screenY
     * @type Number
     */
    this.screenY = ev.screenY;

    /**
     * @name MouseEvent#clientX
     * @type Number
     */
    this.clientX = ev.clientX;

    /**
     * @name MouseEvent#clientY
     * @type Number
     */
    this.clientY = ev.clientY;

    /**
     * @name MouseEvent#ctrlKey
     * @type Boolean
     */
    this.ctrlKey = ev.ctrlKey;

    /**
     * @name MouseEvent#shiftKey
     * @type Boolean
     */
    this.shiftKey = ev.shiftKey;

    /**
     * @name MouseEvent#altKey
     * @type Boolean
     */
    this.altKey = ev.altKey;

    /**
     * @name MouseEvent#metaKey
     * @type Boolean
     */
    this.metaKey = ev.metaKey;

    /**
     * @type MouseEvent#button
     * @type Number
     */
    this.button = ev.button;

    /**
     * @type MouseEvent#buttons
     * @type Number
     */
    this.buttons = ev.buttons;

    /**
     * @type MouseEvent#pageX
     * @type Number
     */
    this.pageX = ev.pageX;

    /**
     * @type MouseEvent#pageY
     * @type Number
     */
    this.pageY = ev.pageY;

    /**
     * @type MouseEvent#x
     * @type Number
     */
    this.x = ev.x;

    /**
     * @type MouseEvent#y
     * @type Number
     */
    this.y = ev.y;

    /**
     * @type MouseEvent#offsetX
     * @type Number
     */
    this.offsetX = ev.offsetX;

    /**
     * @type MouseEvent#offsetY
     * @type Number
     */
    this.offsetY = ev.offsetY;
}

MouseEvent.prototype = Object.create(UIEvent.prototype);
MouseEvent.prototype.constructor = MouseEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
MouseEvent.prototype.toString = function toString () {
    return 'MouseEvent';
};

module.exports = MouseEvent;

},{"./UIEvent":13}],12:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var UIEvent = require('./UIEvent');

var EMPTY_ARRAY = [];

/**
 * See [Touch Interface](http://www.w3.org/TR/2013/REC-touch-events-20131010/#touch-interface).
 *
 * @class Touch
 * @private
 *
 * @param {Touch} touch The native Touch object.
 */
function Touch(touch) {
    // interface Touch {
    //     readonly    attribute long        identifier;
    //     readonly    attribute EventTarget target;
    //     readonly    attribute double      screenX;
    //     readonly    attribute double      screenY;
    //     readonly    attribute double      clientX;
    //     readonly    attribute double      clientY;
    //     readonly    attribute double      pageX;
    //     readonly    attribute double      pageY;
    // };

    /**
     * @name Touch#identifier
     * @type Number
     */
    this.identifier = touch.identifier;

    /**
     * @name Touch#screenX
     * @type Number
     */
    this.screenX = touch.screenX;

    /**
     * @name Touch#screenY
     * @type Number
     */
    this.screenY = touch.screenY;

    /**
     * @name Touch#clientX
     * @type Number
     */
    this.clientX = touch.clientX;

    /**
     * @name Touch#clientY
     * @type Number
     */
    this.clientY = touch.clientY;

    /**
     * @name Touch#pageX
     * @type Number
     */
    this.pageX = touch.pageX;

    /**
     * @name Touch#pageY
     * @type Number
     */
    this.pageY = touch.pageY;
}


/**
 * Normalizes the browser's native TouchList by converting it into an array of
 * normalized Touch objects.
 *
 * @method  cloneTouchList
 * @private
 *
 * @param  {TouchList} touchList    The native TouchList array.
 * @return {Array.<Touch>}          An array of normalized Touch objects.
 */
function cloneTouchList(touchList) {
    if (!touchList) return EMPTY_ARRAY;
    // interface TouchList {
    //     readonly    attribute unsigned long length;
    //     getter Touch? item (unsigned long index);
    // };

    var touchListArray = [];
    for (var i = 0; i < touchList.length; i++) {
        touchListArray[i] = new Touch(touchList[i]);
    }
    return touchListArray;
}

/**
 * See [Touch Event Interface](http://www.w3.org/TR/2013/REC-touch-events-20131010/#touchevent-interface).
 *
 * @class TouchEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function TouchEvent(ev) {
    // interface TouchEvent : UIEvent {
    //     readonly    attribute TouchList touches;
    //     readonly    attribute TouchList targetTouches;
    //     readonly    attribute TouchList changedTouches;
    //     readonly    attribute boolean   altKey;
    //     readonly    attribute boolean   metaKey;
    //     readonly    attribute boolean   ctrlKey;
    //     readonly    attribute boolean   shiftKey;
    // };
    UIEvent.call(this, ev);

    /**
     * @name TouchEvent#touches
     * @type Array.<Touch>
     */
    this.touches = cloneTouchList(ev.touches);

    /**
     * @name TouchEvent#targetTouches
     * @type Array.<Touch>
     */
    this.targetTouches = cloneTouchList(ev.targetTouches);

    /**
     * @name TouchEvent#changedTouches
     * @type TouchList
     */
    this.changedTouches = cloneTouchList(ev.changedTouches);

    /**
     * @name TouchEvent#altKey
     * @type Boolean
     */
    this.altKey = ev.altKey;

    /**
     * @name TouchEvent#metaKey
     * @type Boolean
     */
    this.metaKey = ev.metaKey;

    /**
     * @name TouchEvent#ctrlKey
     * @type Boolean
     */
    this.ctrlKey = ev.ctrlKey;

    /**
     * @name TouchEvent#shiftKey
     * @type Boolean
     */
    this.shiftKey = ev.shiftKey;
}

TouchEvent.prototype = Object.create(UIEvent.prototype);
TouchEvent.prototype.constructor = TouchEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
TouchEvent.prototype.toString = function toString () {
    return 'TouchEvent';
};

module.exports = TouchEvent;

},{"./UIEvent":13}],13:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Event = require('./Event');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428).
 *
 * @class UIEvent
 * @augments Event
 *
 * @param  {Event} ev   The native DOM event.
 */
function UIEvent(ev) {
    // [Constructor(DOMString type, optional UIEventInit eventInitDict)]
    // interface UIEvent : Event {
    //     readonly    attribute Window? view;
    //     readonly    attribute long    detail;
    // };
    Event.call(this, ev);

    /**
     * @name UIEvent#detail
     * @type Number
     */
    this.detail = ev.detail;
}

UIEvent.prototype = Object.create(Event.prototype);
UIEvent.prototype.constructor = UIEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
UIEvent.prototype.toString = function toString () {
    return 'UIEvent';
};

module.exports = UIEvent;

},{"./Event":6}],14:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var MouseEvent = require('./MouseEvent');

/**
 * See [UI Events (formerly DOM Level 3 Events)](http://www.w3.org/TR/2015/WD-uievents-20150428/#events-wheelevents).
 *
 * @class WheelEvent
 * @augments UIEvent
 *
 * @param {Event} ev The native DOM event.
 */
function WheelEvent(ev) {
    // [Constructor(DOMString typeArg, optional WheelEventInit wheelEventInitDict)]
    // interface WheelEvent : MouseEvent {
    //     // DeltaModeCode
    //     const unsigned long DOM_DELTA_PIXEL = 0x00;
    //     const unsigned long DOM_DELTA_LINE = 0x01;
    //     const unsigned long DOM_DELTA_PAGE = 0x02;
    //     readonly    attribute double        deltaX;
    //     readonly    attribute double        deltaY;
    //     readonly    attribute double        deltaZ;
    //     readonly    attribute unsigned long deltaMode;
    // };

    MouseEvent.call(this, ev);

    /**
     * @name WheelEvent#DOM_DELTA_PIXEL
     * @type Number
     */
    this.DOM_DELTA_PIXEL = 0x00;

    /**
     * @name WheelEvent#DOM_DELTA_LINE
     * @type Number
     */
    this.DOM_DELTA_LINE = 0x01;

    /**
     * @name WheelEvent#DOM_DELTA_PAGE
     * @type Number
     */
    this.DOM_DELTA_PAGE = 0x02;

    /**
     * @name WheelEvent#deltaX
     * @type Number
     */
    this.deltaX = ev.deltaX;

    /**
     * @name WheelEvent#deltaY
     * @type Number
     */
    this.deltaY = ev.deltaY;

    /**
     * @name WheelEvent#deltaZ
     * @type Number
     */
    this.deltaZ = ev.deltaZ;

    /**
     * @name WheelEvent#deltaMode
     * @type Number
     */
    this.deltaMode = ev.deltaMode;
}

WheelEvent.prototype = Object.create(MouseEvent.prototype);
WheelEvent.prototype.constructor = WheelEvent;

/**
 * Return the name of the event type
 *
 * @method
 *
 * @return {String} Name of the event type
 */
WheelEvent.prototype.toString = function toString () {
    return 'WheelEvent';
};

module.exports = WheelEvent;

},{"./MouseEvent":11}],15:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A two-dimensional vector.
 *
 * @class Vec2
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 */
var Vec2 = function(x, y) {
    if (x instanceof Array || x instanceof Float32Array) {
        this.x = x[0] || 0;
        this.y = x[1] || 0;
    }
    else {
        this.x = x || 0;
        this.y = y || 0;
    }
};

/**
 * Set the components of the current Vec2.
 *
 * @method
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 *
 * @return {Vec2} this
 */
Vec2.prototype.set = function set(x, y) {
    if (x != null) this.x = x;
    if (y != null) this.y = y;
    return this;
};

/**
 * Add the input v to the current Vec2.
 *
 * @method
 *
 * @param {Vec2} v The Vec2 to add.
 *
 * @return {Vec2} this
 */
Vec2.prototype.add = function add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

/**
 * Subtract the input v from the current Vec2.
 *
 * @method
 *
 * @param {Vec2} v The Vec2 to subtract.
 *
 * @return {Vec2} this
 */
Vec2.prototype.subtract = function subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};

/**
 * Scale the current Vec2 by a scalar or Vec2.
 *
 * @method
 *
 * @param {Number|Vec2} s The Number or vec2 by which to scale.
 *
 * @return {Vec2} this
 */
Vec2.prototype.scale = function scale(s) {
    if (s instanceof Vec2) {
        this.x *= s.x;
        this.y *= s.y;
    }
    else {
        this.x *= s;
        this.y *= s;
    }
    return this;
};

/**
 * Rotate the Vec2 counter-clockwise by theta about the z-axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec2} this
 */
Vec2.prototype.rotate = function(theta) {
    var x = this.x;
    var y = this.y;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = x * cosTheta - y * sinTheta;
    this.y = x * sinTheta + y * cosTheta;

    return this;
};

/**
 * The dot product of of the current Vec2 with the input Vec2.
 *
 * @method
 *
 * @param {Number} v The other Vec2.
 *
 * @return {Vec2} this
 */
Vec2.prototype.dot = function(v) {
    return this.x * v.x + this.y * v.y;
};

/**
 * The cross product of of the current Vec2 with the input Vec2.
 *
 * @method
 *
 * @param {Number} v The other Vec2.
 *
 * @return {Vec2} this
 */
Vec2.prototype.cross = function(v) {
    return this.x * v.y - this.y * v.x;
};

/**
 * Preserve the magnitude but invert the orientation of the current Vec2.
 *
 * @method
 *
 * @return {Vec2} this
 */
Vec2.prototype.invert = function invert() {
    this.x *= -1;
    this.y *= -1;
    return this;
};

/**
 * Apply a function component-wise to the current Vec2.
 *
 * @method
 *
 * @param {Function} fn Function to apply.
 *
 * @return {Vec2} this
 */
Vec2.prototype.map = function map(fn) {
    this.x = fn(this.x);
    this.y = fn(this.y);
    return this;
};

/**
 * Get the magnitude of the current Vec2.
 *
 * @method
 *
 * @return {Number} the length of the vector
 */
Vec2.prototype.length = function length() {
    var x = this.x;
    var y = this.y;

    return Math.sqrt(x * x + y * y);
};

/**
 * Copy the input onto the current Vec2.
 *
 * @method
 *
 * @param {Vec2} v Vec2 to copy
 *
 * @return {Vec2} this
 */
Vec2.prototype.copy = function copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
};

/**
 * Reset the current Vec2.
 *
 * @method
 *
 * @return {Vec2} this
 */
Vec2.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    return this;
};

/**
 * Check whether the magnitude of the current Vec2 is exactly 0.
 *
 * @method
 *
 * @return {Boolean} whether or not the length is 0
 */
Vec2.prototype.isZero = function isZero() {
    if (this.x !== 0 || this.y !== 0) return false;
    else return true;
};

/**
 * The array form of the current Vec2.
 *
 * @method
 *
 * @return {Array} the Vec to as an array
 */
Vec2.prototype.toArray = function toArray() {
    return [this.x, this.y];
};

/**
 * Normalize the input Vec2.
 *
 * @method
 *
 * @param {Vec2} v The reference Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The normalized Vec2.
 */
Vec2.normalize = function normalize(v, output) {
    var x = v.x;
    var y = v.y;

    var length = Math.sqrt(x * x + y * y) || 1;
    length = 1 / length;
    output.x = v.x * length;
    output.y = v.y * length;

    return output;
};

/**
 * Clone the input Vec2.
 *
 * @method
 *
 * @param {Vec2} v The Vec2 to clone.
 *
 * @return {Vec2} The cloned Vec2.
 */
Vec2.clone = function clone(v) {
    return new Vec2(v.x, v.y);
};

/**
 * Add the input Vec2's.
 *
 * @method
 *
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The result of the addition.
 */
Vec2.add = function add(v1, v2, output) {
    output.x = v1.x + v2.x;
    output.y = v1.y + v2.y;

    return output;
};

/**
 * Subtract the second Vec2 from the first.
 *
 * @method
 *
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The result of the subtraction.
 */
Vec2.subtract = function subtract(v1, v2, output) {
    output.x = v1.x - v2.x;
    output.y = v1.y - v2.y;
    return output;
};

/**
 * Scale the input Vec2.
 *
 * @method
 *
 * @param {Vec2} v The reference Vec2.
 * @param {Number} s Number to scale by.
 * @param {Vec2} output Vec2 in which to place the result.
 *
 * @return {Vec2} The result of the scaling.
 */
Vec2.scale = function scale(v, s, output) {
    output.x = v.x * s;
    output.y = v.y * s;
    return output;
};

/**
 * The dot product of the input Vec2's.
 *
 * @method
 *
 * @param {Vec2} v1 The left Vec2.
 * @param {Vec2} v2 The right Vec2.
 *
 * @return {Number} The dot product.
 */
Vec2.dot = function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
};

/**
 * The cross product of the input Vec2's.
 *
 * @method
 *
 * @param {Number} v1 The left Vec2.
 * @param {Number} v2 The right Vec2.
 *
 * @return {Number} The z-component of the cross product.
 */
Vec2.cross = function(v1,v2) {
    return v1.x * v2.y - v1.y * v2.x;
};

module.exports = Vec2;

},{}],16:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * A three-dimensional vector.
 *
 * @class Vec3
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 */
var Vec3 = function(x ,y, z){
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

/**
 * Set the components of the current Vec3.
 *
 * @method
 *
 * @param {Number} x The x component.
 * @param {Number} y The y component.
 * @param {Number} z The z component.
 *
 * @return {Vec3} this
 */
Vec3.prototype.set = function set(x, y, z) {
    if (x != null) this.x = x;
    if (y != null) this.y = y;
    if (z != null) this.z = z;

    return this;
};

/**
 * Add the input v to the current Vec3.
 *
 * @method
 *
 * @param {Vec3} v The Vec3 to add.
 *
 * @return {Vec3} this
 */
Vec3.prototype.add = function add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;

    return this;
};

/**
 * Subtract the input v from the current Vec3.
 *
 * @method
 *
 * @param {Vec3} v The Vec3 to subtract.
 *
 * @return {Vec3} this
 */
Vec3.prototype.subtract = function subtract(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the x axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec3} this
 */
Vec3.prototype.rotateX = function rotateX(theta) {
    var y = this.y;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.y = y * cosTheta - z * sinTheta;
    this.z = y * sinTheta + z * cosTheta;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the y axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec3} this
 */
Vec3.prototype.rotateY = function rotateY(theta) {
    var x = this.x;
    var z = this.z;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = z * sinTheta + x * cosTheta;
    this.z = z * cosTheta - x * sinTheta;

    return this;
};

/**
 * Rotate the current Vec3 by theta clockwise about the z axis.
 *
 * @method
 *
 * @param {Number} theta Angle by which to rotate.
 *
 * @return {Vec3} this
 */
Vec3.prototype.rotateZ = function rotateZ(theta) {
    var x = this.x;
    var y = this.y;

    var cosTheta = Math.cos(theta);
    var sinTheta = Math.sin(theta);

    this.x = x * cosTheta - y * sinTheta;
    this.y = x * sinTheta + y * cosTheta;

    return this;
};

/**
 * The dot product of the current Vec3 with input Vec3 v.
 *
 * @method
 *
 * @param {Vec3} v The other Vec3.
 *
 * @return {Vec3} this
 */
Vec3.prototype.dot = function dot(v) {
    return this.x*v.x + this.y*v.y + this.z*v.z;
};

/**
 * The dot product of the current Vec3 with input Vec3 v.
 * Stores the result in the current Vec3.
 *
 * @method cross
 *
 * @param {Vec3} v The other Vec3
 *
 * @return {Vec3} this
 */
Vec3.prototype.cross = function cross(v) {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    this.x = y * vz - z * vy;
    this.y = z * vx - x * vz;
    this.z = x * vy - y * vx;
    return this;
};

/**
 * Scale the current Vec3 by a scalar.
 *
 * @method
 *
 * @param {Number} s The Number by which to scale
 *
 * @return {Vec3} this
 */
Vec3.prototype.scale = function scale(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;

    return this;
};

/**
 * Preserve the magnitude but invert the orientation of the current Vec3.
 *
 * @method
 *
 * @return {Vec3} this
 */
Vec3.prototype.invert = function invert() {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;

    return this;
};

/**
 * Apply a function component-wise to the current Vec3.
 *
 * @method
 *
 * @param {Function} fn Function to apply.
 *
 * @return {Vec3} this
 */
Vec3.prototype.map = function map(fn) {
    this.x = fn(this.x);
    this.y = fn(this.y);
    this.z = fn(this.z);

    return this;
};

/**
 * The magnitude of the current Vec3.
 *
 * @method
 *
 * @return {Number} the magnitude of the Vec3
 */
Vec3.prototype.length = function length() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    return Math.sqrt(x * x + y * y + z * z);
};

/**
 * The magnitude squared of the current Vec3.
 *
 * @method
 *
 * @return {Number} magnitude of the Vec3 squared
 */
Vec3.prototype.lengthSq = function lengthSq() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    return x * x + y * y + z * z;
};

/**
 * Copy the input onto the current Vec3.
 *
 * @method
 *
 * @param {Vec3} v Vec3 to copy
 *
 * @return {Vec3} this
 */
Vec3.prototype.copy = function copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
};

/**
 * Reset the current Vec3.
 *
 * @method
 *
 * @return {Vec3} this
 */
Vec3.prototype.clear = function clear() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};

/**
 * Check whether the magnitude of the current Vec3 is exactly 0.
 *
 * @method
 *
 * @return {Boolean} whether or not the magnitude is zero
 */
Vec3.prototype.isZero = function isZero() {
    return this.x === 0 && this.y === 0 && this.z === 0;
};

/**
 * The array form of the current Vec3.
 *
 * @method
 *
 * @return {Array} a three element array representing the components of the Vec3
 */
Vec3.prototype.toArray = function toArray() {
    return [this.x, this.y, this.z];
};

/**
 * Preserve the orientation but change the length of the current Vec3 to 1.
 *
 * @method
 *
 * @return {Vec3} this
 */
Vec3.prototype.normalize = function normalize() {
    var x = this.x;
    var y = this.y;
    var z = this.z;

    var len = Math.sqrt(x * x + y * y + z * z) || 1;
    len = 1 / len;

    this.x *= len;
    this.y *= len;
    this.z *= len;
    return this;
};

/**
 * Apply the rotation corresponding to the input (unit) Quaternion
 * to the current Vec3.
 *
 * @method
 *
 * @param {Quaternion} q Unit Quaternion representing the rotation to apply
 *
 * @return {Vec3} this
 */
Vec3.prototype.applyRotation = function applyRotation(q) {
    var cw = q.w;
    var cx = -q.x;
    var cy = -q.y;
    var cz = -q.z;

    var vx = this.x;
    var vy = this.y;
    var vz = this.z;

    var tw = -cx * vx - cy * vy - cz * vz;
    var tx = vx * cw + vy * cz - cy * vz;
    var ty = vy * cw + cx * vz - vx * cz;
    var tz = vz * cw + vx * cy - cx * vy;

    var w = cw;
    var x = -cx;
    var y = -cy;
    var z = -cz;

    this.x = tx * w + x * tw + y * tz - ty * z;
    this.y = ty * w + y * tw + tx * z - x * tz;
    this.z = tz * w + z * tw + x * ty - tx * y;
    return this;
};

/**
 * Apply the input Mat33 the the current Vec3.
 *
 * @method
 *
 * @param {Mat33} matrix Mat33 to apply
 *
 * @return {Vec3} this
 */
Vec3.prototype.applyMatrix = function applyMatrix(matrix) {
    var M = matrix.get();

    var x = this.x;
    var y = this.y;
    var z = this.z;

    this.x = M[0]*x + M[1]*y + M[2]*z;
    this.y = M[3]*x + M[4]*y + M[5]*z;
    this.z = M[6]*x + M[7]*y + M[8]*z;
    return this;
};

/**
 * Normalize the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The reference Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The normalize Vec3.
 */
Vec3.normalize = function normalize(v, output) {
    var x = v.x;
    var y = v.y;
    var z = v.z;

    var length = Math.sqrt(x * x + y * y + z * z) || 1;
    length = 1 / length;

    output.x = x * length;
    output.y = y * length;
    output.z = z * length;
    return output;
};

/**
 * Apply a rotation to the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The reference Vec3.
 * @param {Quaternion} q Unit Quaternion representing the rotation to apply.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The rotated version of the input Vec3.
 */
Vec3.applyRotation = function applyRotation(v, q, output) {
    var cw = q.w;
    var cx = -q.x;
    var cy = -q.y;
    var cz = -q.z;

    var vx = v.x;
    var vy = v.y;
    var vz = v.z;

    var tw = -cx * vx - cy * vy - cz * vz;
    var tx = vx * cw + vy * cz - cy * vz;
    var ty = vy * cw + cx * vz - vx * cz;
    var tz = vz * cw + vx * cy - cx * vy;

    var w = cw;
    var x = -cx;
    var y = -cy;
    var z = -cz;

    output.x = tx * w + x * tw + y * tz - ty * z;
    output.y = ty * w + y * tw + tx * z - x * tz;
    output.z = tz * w + z * tw + x * ty - tx * y;
    return output;
};

/**
 * Clone the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The Vec3 to clone.
 *
 * @return {Vec3} The cloned Vec3.
 */
Vec3.clone = function clone(v) {
    return new Vec3(v.x, v.y, v.z);
};

/**
 * Add the input Vec3's.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The result of the addition.
 */
Vec3.add = function add(v1, v2, output) {
    output.x = v1.x + v2.x;
    output.y = v1.y + v2.y;
    output.z = v1.z + v2.z;
    return output;
};

/**
 * Subtract the second Vec3 from the first.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The result of the subtraction.
 */
Vec3.subtract = function subtract(v1, v2, output) {
    output.x = v1.x - v2.x;
    output.y = v1.y - v2.y;
    output.z = v1.z - v2.z;
    return output;
};

/**
 * Scale the input Vec3.
 *
 * @method
 *
 * @param {Vec3} v The reference Vec3.
 * @param {Number} s Number to scale by.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Vec3} The result of the scaling.
 */
Vec3.scale = function scale(v, s, output) {
    output.x = v.x * s;
    output.y = v.y * s;
    output.z = v.z * s;
    return output;
};

/**
 * The dot product of the input Vec3's.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 *
 * @return {Number} The dot product.
 */
Vec3.dot = function dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

/**
 * The (right-handed) cross product of the input Vec3's.
 * v1 x v2.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Object} the object the result of the cross product was placed into
 */
Vec3.cross = function cross(v1, v2, output) {
    var x1 = v1.x;
    var y1 = v1.y;
    var z1 = v1.z;
    var x2 = v2.x;
    var y2 = v2.y;
    var z2 = v2.z;

    output.x = y1 * z2 - z1 * y2;
    output.y = z1 * x2 - x1 * z2;
    output.z = x1 * y2 - y1 * x2;
    return output;
};

/**
 * The projection of v1 onto v2.
 *
 * @method
 *
 * @param {Vec3} v1 The left Vec3.
 * @param {Vec3} v2 The right Vec3.
 * @param {Vec3} output Vec3 in which to place the result.
 *
 * @return {Object} the object the result of the cross product was placed into 
 */
Vec3.project = function project(v1, v2, output) {
    var x1 = v1.x;
    var y1 = v1.y;
    var z1 = v1.z;
    var x2 = v2.x;
    var y2 = v2.y;
    var z2 = v2.z;

    var scale = x1 * x2 + y1 * y2 + z1 * z2;
    scale /= x2 * x2 + y2 * y2 + z2 * z2;

    output.x = x2 * scale;
    output.y = y2 * scale;
    output.z = z2 * scale;

    return output;
};

module.exports = Vec3;

},{}],17:[function(require,module,exports){
module.exports = noop

function noop() {
  throw new Error(
      'You should bundle your code ' +
      'using `glslify` as a transform.'
  )
}

},{}],18:[function(require,module,exports){
module.exports = programify

function programify(vertex, fragment, uniforms, attributes) {
  return {
    vertex: vertex, 
    fragment: fragment,
    uniforms: uniforms, 
    attributes: attributes
  };
}

},{}],19:[function(require,module,exports){
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license

'use strict';

var lastTime = 0;
var vendors = ['ms', 'moz', 'webkit', 'o'];

var rAF, cAF;

if (typeof window === 'object') {
    rAF = window.requestAnimationFrame;
    cAF = window.cancelAnimationFrame || window.cancelRequestAnimationFrame;
    for (var x = 0; x < vendors.length && !rAF; ++x) {
        rAF = window[vendors[x] + 'RequestAnimationFrame'];
        cAF = window[vendors[x] + 'CancelRequestAnimationFrame'] ||
              window[vendors[x] + 'CancelAnimationFrame'];
    }

    if (rAF && !cAF) {
        // cAF not supported.
        // Fall back to setInterval for now (very rare).
        rAF = null;
    }
}

if (!rAF) {
    var now = Date.now ? Date.now : function () {
        return new Date().getTime();
    };

    rAF = function(callback) {
        var currTime = now();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = setTimeout(function () {
            callback(currTime + timeToCall);
        }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };

    cAF = function (id) {
        clearTimeout(id);
    };
}

var animationFrame = {
    /**
     * Cross browser version of [requestAnimationFrame]{@link https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame}.
     *
     * Used by Engine in order to establish a render loop.
     *
     * If no (vendor prefixed version of) `requestAnimationFrame` is available,
     * `setTimeout` will be used in order to emulate a render loop running at
     * approximately 60 frames per second.
     *
     * @method  requestAnimationFrame
     *
     * @param   {Function}  callback function to be invoked on the next frame.
     * @return  {Number}    requestId to be used to cancel the request using
     *                      {@link cancelAnimationFrame}.
     */
    requestAnimationFrame: rAF,

    /**
     * Cross browser version of [cancelAnimationFrame]{@link https://developer.mozilla.org/en-US/docs/Web/API/window/cancelAnimationFrame}.
     *
     * Cancels a previously using [requestAnimationFrame]{@link animationFrame#requestAnimationFrame}
     * scheduled request.
     *
     * Used for immediately stopping the render loop within the Engine.
     *
     * @method  cancelAnimationFrame
     *
     * @param   {Number}    requestId of the scheduled callback function
     *                      returned by [requestAnimationFrame]{@link animationFrame#requestAnimationFrame}.
     */
    cancelAnimationFrame: cAF
};

module.exports = animationFrame;

},{}],20:[function(require,module,exports){
/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Famous Industries Inc.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

module.exports = {
    requestAnimationFrame: require('./animationFrame').requestAnimationFrame,
    cancelAnimationFrame: require('./animationFrame').cancelAnimationFrame
};

},{"./animationFrame":19}],21:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var polyfills = require('../polyfills');
var rAF = polyfills.requestAnimationFrame;
var cAF = polyfills.cancelAnimationFrame;

/**
 * Boolean constant indicating whether the RequestAnimationFrameLoop has access
 * to the document. The document is being used in order to subscribe for
 * visibilitychange events used for normalizing the RequestAnimationFrameLoop
 * time when e.g. when switching tabs.
 *
 * @constant
 * @type {Boolean}
 */
var DOCUMENT_ACCESS = typeof document !== 'undefined';

if (DOCUMENT_ACCESS) {
    var VENDOR_HIDDEN, VENDOR_VISIBILITY_CHANGE;

    // Opera 12.10 and Firefox 18 and later support
    if (typeof document.hidden !== 'undefined') {
        VENDOR_HIDDEN = 'hidden';
        VENDOR_VISIBILITY_CHANGE = 'visibilitychange';
    }
    else if (typeof document.mozHidden !== 'undefined') {
        VENDOR_HIDDEN = 'mozHidden';
        VENDOR_VISIBILITY_CHANGE = 'mozvisibilitychange';
    }
    else if (typeof document.msHidden !== 'undefined') {
        VENDOR_HIDDEN = 'msHidden';
        VENDOR_VISIBILITY_CHANGE = 'msvisibilitychange';
    }
    else if (typeof document.webkitHidden !== 'undefined') {
        VENDOR_HIDDEN = 'webkitHidden';
        VENDOR_VISIBILITY_CHANGE = 'webkitvisibilitychange';
    }
}

/**
 * RequestAnimationFrameLoop class used for updating objects on a frame-by-frame.
 * Synchronizes the `update` method invocations to the refresh rate of the
 * screen. Manages the `requestAnimationFrame`-loop by normalizing the passed in
 * timestamp when switching tabs.
 *
 * @class RequestAnimationFrameLoop
 */
function RequestAnimationFrameLoop() {
    var _this = this;

    // References to objects to be updated on next frame.
    this._updates = [];

    this._looper = function(time) {
        _this.loop(time);
    };
    this._time = 0;
    this._stoppedAt = 0;
    this._sleep = 0;

    // Indicates whether the engine should be restarted when the tab/ window is
    // being focused again (visibility change).
    this._startOnVisibilityChange = true;

    // requestId as returned by requestAnimationFrame function;
    this._rAF = null;

    this._sleepDiff = true;

    // The engine is being started on instantiation.
    // TODO(alexanderGugel)
    this.start();

    // The RequestAnimationFrameLoop supports running in a non-browser
    // environment (e.g. Worker).
    if (DOCUMENT_ACCESS) {
        document.addEventListener(VENDOR_VISIBILITY_CHANGE, function() {
            _this._onVisibilityChange();
        });
    }
}

/**
 * Handle the switching of tabs.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
RequestAnimationFrameLoop.prototype._onVisibilityChange = function _onVisibilityChange() {
    if (document[VENDOR_HIDDEN]) {
        this._onUnfocus();
    }
    else {
        this._onFocus();
    }
};

/**
 * Internal helper function to be invoked as soon as the window/ tab is being
 * focused after a visibiltiy change.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
RequestAnimationFrameLoop.prototype._onFocus = function _onFocus() {
    if (this._startOnVisibilityChange) {
        this._start();
    }
};

/**
 * Internal helper function to be invoked as soon as the window/ tab is being
 * unfocused (hidden) after a visibiltiy change.
 *
 * @method  _onFocus
 * @private
 *
 * @return {undefined} undefined
 */
RequestAnimationFrameLoop.prototype._onUnfocus = function _onUnfocus() {
    this._stop();
};

/**
 * Starts the RequestAnimationFrameLoop. When switching to a differnt tab/
 * window (changing the visibiltiy), the engine will be retarted when switching
 * back to a visible state.
 *
 * @method
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.start = function start() {
    if (!this._running) {
        this._startOnVisibilityChange = true;
        this._start();
    }
    return this;
};

/**
 * Internal version of RequestAnimationFrameLoop's start function, not affecting
 * behavior on visibilty change.
 *
 * @method
 * @private
*
 * @return {undefined} undefined
 */
RequestAnimationFrameLoop.prototype._start = function _start() {
    this._running = true;
    this._sleepDiff = true;
    this._rAF = rAF(this._looper);
};

/**
 * Stops the RequestAnimationFrameLoop.
 *
 * @method
 * @private
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.stop = function stop() {
    if (this._running) {
        this._startOnVisibilityChange = false;
        this._stop();
    }
    return this;
};

/**
 * Internal version of RequestAnimationFrameLoop's stop function, not affecting
 * behavior on visibilty change.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
RequestAnimationFrameLoop.prototype._stop = function _stop() {
    this._running = false;
    this._stoppedAt = this._time;

    // Bug in old versions of Fx. Explicitly cancel.
    cAF(this._rAF);
};

/**
 * Determines whether the RequestAnimationFrameLoop is currently running or not.
 *
 * @method
 *
 * @return {Boolean} boolean value indicating whether the
 * RequestAnimationFrameLoop is currently running or not
 */
RequestAnimationFrameLoop.prototype.isRunning = function isRunning() {
    return this._running;
};

/**
 * Updates all registered objects.
 *
 * @method
 *
 * @param {Number} time high resolution timstamp used for invoking the `update`
 * method on all registered objects
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.step = function step (time) {
    this._time = time;
    if (this._sleepDiff) {
        this._sleep += time - this._stoppedAt;
        this._sleepDiff = false;
    }

    // The same timetamp will be emitted immediately before and after visibility
    // change.
    var normalizedTime = time - this._sleep;
    for (var i = 0, len = this._updates.length ; i < len ; i++) {
        this._updates[i].update(normalizedTime);
    }
    return this;
};

/**
 * Method being called by `requestAnimationFrame` on every paint. Indirectly
 * recursive by scheduling a future invocation of itself on the next paint.
 *
 * @method
 *
 * @param {Number} time high resolution timstamp used for invoking the `update`
 * method on all registered objects
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.loop = function loop(time) {
    this.step(time);
    this._rAF = rAF(this._looper);
    return this;
};

/**
 * Registeres an updateable object which `update` method should be invoked on
 * every paint, starting on the next paint (assuming the
 * RequestAnimationFrameLoop is running).
 *
 * @method
 *
 * @param {Object} updateable object to be updated
 * @param {Function} updateable.update update function to be called on the
 * registered object
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.update = function update(updateable) {
    if (this._updates.indexOf(updateable) === -1) {
        this._updates.push(updateable);
    }
    return this;
};

/**
 * Deregisters an updateable object previously registered using `update` to be
 * no longer updated.
 *
 * @method
 *
 * @param {Object} updateable updateable object previously registered using
 * `update`
 *
 * @return {RequestAnimationFrameLoop} this
 */
RequestAnimationFrameLoop.prototype.noLongerUpdate = function noLongerUpdate(updateable) {
    var index = this._updates.indexOf(updateable);
    if (index > -1) {
        this._updates.splice(index, 1);
    }
    return this;
};

module.exports = RequestAnimationFrameLoop;

},{"../polyfills":20}],22:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Context = require('./Context');
var injectCSS = require('./inject-css');

/**
 * Instantiates a new Compositor.
 * The Compositor receives draw commands frm the UIManager and routes the to the
 * respective context objects.
 *
 * Upon creation, it injects a stylesheet used for styling the individual
 * renderers used in the context objects.
 *
 * @class Compositor
 * @constructor
 * @return {undefined} undefined
 */
function Compositor() {
    injectCSS();

    this._contexts = {};
    this._outCommands = [];
    this._inCommands = [];
    this._time = null;

    this._resized = false;

    var _this = this;
    window.addEventListener('resize', function() {
        _this._resized = true;
    });
}

/**
 * Retrieves the time being used by the internal clock managed by
 * `FamousEngine`.
 *
 * The time is being passed into core by the Engine through the UIManager.
 * Since core has the ability to scale the time, the time needs to be passed
 * back to the rendering system.
 *
 * @method
 *
 * @return {Number} time The clock time used in core.
 */
Compositor.prototype.getTime = function getTime() {
    return this._time;
};

/**
 * Schedules an event to be sent the next time the out command queue is being
 * flushed.
 *
 * @method
 * @private
 *
 * @param  {String} path Render path to the node the event should be triggered
 * on (*targeted event*)
 * @param  {String} ev Event type
 * @param  {Object} payload Event object (serializable using structured cloning
 * algorithm)
 *
 * @return {undefined} undefined
 */
Compositor.prototype.sendEvent = function sendEvent(path, ev, payload) {
    this._outCommands.push('WITH', path, 'TRIGGER', ev, payload);
};

/**
 * Internal helper method used for notifying externally
 * resized contexts (e.g. by resizing the browser window).
 *
 * @method
 * @private
 *
 * @param  {String} selector render path to the node (context) that should be
 * resized
 * @param  {Array} size new context size
 *
 * @return {undefined} undefined
 */
Compositor.prototype.sendResize = function sendResize (selector, size) {
    this.sendEvent(selector, 'CONTEXT_RESIZE', size);
};

/**
 * Internal helper method used by `drawCommands`.
 * Subsequent commands are being associated with the node defined the the path
 * following the `WITH` command.
 *
 * @method
 * @private
 *
 * @param  {Number} iterator position index within the commands queue
 * @param  {Array} commands remaining message queue received, used to
 * shift single messages from
 *
 * @return {undefined} undefined
 */
Compositor.prototype.handleWith = function handleWith (iterator, commands) {
    var path = commands[iterator];
    var pathArr = path.split('/');
    var context = this.getOrSetContext(pathArr.shift());
    return context.receive(path, commands, iterator);
};

/**
 * Retrieves the top-level Context associated with the passed in document
 * query selector. If no such Context exists, a new one will be instantiated.
 *
 * @method
 * @private
 *
 * @param  {String} selector document query selector used for retrieving the
 * DOM node the VirtualElement should be attached to
 *
 * @return {Context} context
 */
Compositor.prototype.getOrSetContext = function getOrSetContext(selector) {
    if (this._contexts[selector]) {
        return this._contexts[selector];
    }
    else {
        var context = new Context(selector, this);
        this._contexts[selector] = context;
        return context;
    }
};

/**
 * Internal helper method used by `drawCommands`.
 *
 * @method
 * @private
 *
 * @param  {Number} iterator position index within the command queue
 * @param  {Array} commands remaining message queue received, used to
 * shift single messages
 *
 * @return {undefined} undefined
 */
Compositor.prototype.giveSizeFor = function giveSizeFor(iterator, commands) {
    var selector = commands[iterator];
    var size = this.getOrSetContext(selector).getRootSize();
    this.sendResize(selector, size);
};

/**
 * Processes the previously via `receiveCommands` updated incoming "in"
 * command queue.
 * Called by UIManager on a frame by frame basis.
 *
 * @method
 *
 * @return {Array} outCommands set of commands to be sent back
 */
Compositor.prototype.drawCommands = function drawCommands() {
    var commands = this._inCommands;
    var localIterator = 0;
    var command = commands[localIterator];
    while (command) {
        switch (command) {
            case 'TIME':
                this._time = commands[++localIterator];
                break;
            case 'WITH':
                localIterator = this.handleWith(++localIterator, commands);
                break;
            case 'NEED_SIZE_FOR':
                this.giveSizeFor(++localIterator, commands);
                break;
        }
        command = commands[++localIterator];
    }

    // TODO: Switch to associative arrays here...

    for (var key in this._contexts) {
        this._contexts[key].draw();
    }

    if (this._resized) {
        this.updateSize();
    }

    return this._outCommands;
};


/**
 * Updates the size of all previously registered context objects.
 * This results into CONTEXT_RESIZE events being sent and the root elements
 * used by the individual renderers being resized to the the DOMRenderer's root
 * size.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Compositor.prototype.updateSize = function updateSize() {
    for (var selector in this._contexts) {
        this._contexts[selector].updateSize();
    }
};

/**
 * Used by ThreadManager to update the internal queue of incoming commands.
 * Receiving commands does not immediately start the rendering process.
 *
 * @method
 *
 * @param  {Array} commands command queue to be processed by the compositor's
 * `drawCommands` method
 *
 * @return {undefined} undefined
 */
Compositor.prototype.receiveCommands = function receiveCommands(commands) {
    var len = commands.length;
    for (var i = 0; i < len; i++) {
        this._inCommands.push(commands[i]);
    }
};

/**
 * Flushes the queue of outgoing "out" commands.
 * Called by ThreadManager.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Compositor.prototype.clearCommands = function clearCommands() {
    this._inCommands.length = 0;
    this._outCommands.length = 0;
    this._resized = false;
};

module.exports = Compositor;

},{"./Context":23,"./inject-css":25}],23:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var WebGLRenderer = require('../webgl-renderers/WebGLRenderer');
var Camera = require('../components/Camera');
var DOMRenderer = require('../dom-renderers/DOMRenderer');

/**
 * Context is a render layer with its own WebGLRenderer and DOMRenderer.
 * It is the interface between the Compositor which receives commands
 * and the renderers that interpret them. It also relays information to
 * the renderers about resizing.
 *
 * The DOMElement at the given query selector is used as the root. A
 * new DOMElement is appended to this root element, and used as the
 * parent element for all Famous DOM rendering at this context. A
 * canvas is added and used for all WebGL rendering at this context.
 *
 * @class Context
 * @constructor
 *
 * @param {String} selector Query selector used to locate root element of
 * context layer.
 * @param {Compositor} compositor Compositor reference to pass down to
 * WebGLRenderer.
 *
 * @return {undefined} undefined
 */
function Context(selector, compositor) {
    this._compositor = compositor;
    this._rootEl = document.querySelector(selector);

    this._selector = selector;

    // Create DOM element to be used as root for all famous DOM
    // rendering and append element to the root element.

    var DOMLayerEl = document.createElement('div');
    this._rootEl.appendChild(DOMLayerEl);

    // Instantiate renderers

    this.DOMRenderer = new DOMRenderer(DOMLayerEl, selector, compositor);
    this.WebGLRenderer = null;
    this.canvas = null;

    // State holders

    this._renderState = {
        projectionType: Camera.ORTHOGRAPHIC_PROJECTION,
        perspectiveTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewDirty: false,
        perspectiveDirty: false
    };

    this._size = [];
    this._children = {};
    this._elementHash = {};

    this._meshTransform = [];
    this._meshSize = [0, 0, 0];
}

/**
 * Queries DOMRenderer size and updates canvas size. Relays size information to
 * WebGLRenderer.
 *
 * @return {Context} this
 */
Context.prototype.updateSize = function () {
    var newSize = this.DOMRenderer.getSize();
    this._compositor.sendResize(this._selector, newSize);

    if (this.canvas && this.WebGLRenderer) {
        this.WebGLRenderer.updateSize(newSize);
    }

    return this;
};

/**
 * Draw function called after all commands have been handled for current frame.
 * Issues draw commands to all renderers with current renderState.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.draw = function draw() {
    this.DOMRenderer.draw(this._renderState);
    if (this.WebGLRenderer) this.WebGLRenderer.draw(this._renderState);

    if (this._renderState.perspectiveDirty) this._renderState.perspectiveDirty = false;
    if (this._renderState.viewDirty) this._renderState.viewDirty = false;
};

/**
 * Gets the size of the parent element of the DOMRenderer for this context.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.getRootSize = function getRootSize() {
    return this.DOMRenderer.getSize();
};

/**
 * Handles initialization of WebGLRenderer when necessary, including creation
 * of the canvas element and instantiation of the renderer. Also updates size
 * to pass size information to the renderer.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.initWebGL = function initWebGL() {
    this.canvas = document.createElement('canvas');
    this._rootEl.appendChild(this.canvas);
    this.WebGLRenderer = new WebGLRenderer(this.canvas, this._compositor);
    this.updateSize();
};

/**
 * Handles delegation of commands to renderers of this context.
 *
 * @method
 *
 * @param {String} path String used as identifier of a given node in the
 * scene graph.
 * @param {Array} commands List of all commands from this frame.
 * @param {Number} iterator Number indicating progress through the command
 * queue.
 *
 * @return {Number} iterator indicating progress through the command queue.
 */
Context.prototype.receive = function receive(path, commands, iterator) {
    var localIterator = iterator;

    var command = commands[++localIterator];
    this.DOMRenderer.loadPath(path);
    this.DOMRenderer.findTarget();
    while (command) {

        switch (command) {
            case 'INIT_DOM':
                this.DOMRenderer.insertEl(commands[++localIterator]);
                break;

            case 'DOM_RENDER_SIZE':
                this.DOMRenderer.getSizeOf(commands[++localIterator]);
                break;

            case 'CHANGE_TRANSFORM':
                for (var i = 0 ; i < 16 ; i++) this._meshTransform[i] = commands[++localIterator];

                this.DOMRenderer.setMatrix(this._meshTransform);

                if (this.WebGLRenderer)
                    this.WebGLRenderer.setCutoutUniform(path, 'u_transform', this._meshTransform);

                break;

            case 'CHANGE_SIZE':
                var width = commands[++localIterator];
                var height = commands[++localIterator];

                this.DOMRenderer.setSize(width, height);
                if (this.WebGLRenderer) {
                    this._meshSize[0] = width;
                    this._meshSize[1] = height;
                    this.WebGLRenderer.setCutoutUniform(path, 'u_size', this._meshSize);
                }
                break;

            case 'CHANGE_PROPERTY':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setProperty(commands[++localIterator], commands[++localIterator]);
                break;

            case 'CHANGE_CONTENT':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setContent(commands[++localIterator]);
                break;

            case 'CHANGE_ATTRIBUTE':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.setAttribute(commands[++localIterator], commands[++localIterator]);
                break;

            case 'ADD_CLASS':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.addClass(commands[++localIterator]);
                break;

            case 'REMOVE_CLASS':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.removeClass(commands[++localIterator]);
                break;

            case 'SUBSCRIBE':
                if (this.WebGLRenderer) this.WebGLRenderer.getOrSetCutout(path);
                this.DOMRenderer.subscribe(commands[++localIterator], commands[++localIterator]);
                break;

            case 'GL_SET_DRAW_OPTIONS':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshOptions(path, commands[++localIterator]);
                break;

            case 'GL_AMBIENT_LIGHT':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setAmbientLightColor(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_LIGHT_POSITION':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setLightPosition(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_LIGHT_COLOR':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setLightColor(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'MATERIAL_INPUT':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.handleMaterialInput(
                    path,
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_SET_GEOMETRY':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setGeometry(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_UNIFORMS':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshUniform(
                    path,
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_BUFFER_DATA':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.bufferData(
                    path,
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator],
                    commands[++localIterator]
                );
                break;

            case 'GL_CUTOUT_STATE':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setCutoutState(path, commands[++localIterator]);
                break;

            case 'GL_MESH_VISIBILITY':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.setMeshVisibility(path, commands[++localIterator]);
                break;

            case 'GL_REMOVE_MESH':
                if (!this.WebGLRenderer) this.initWebGL();
                this.WebGLRenderer.removeMesh(path);
                break;

            case 'PINHOLE_PROJECTION':
                this._renderState.projectionType = Camera.PINHOLE_PROJECTION;
                this._renderState.perspectiveTransform[11] = -1 / commands[++localIterator];

                this._renderState.perspectiveDirty = true;
                break;

            case 'ORTHOGRAPHIC_PROJECTION':
                this._renderState.projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
                this._renderState.perspectiveTransform[11] = 0;

                this._renderState.perspectiveDirty = true;
                break;

            case 'CHANGE_VIEW_TRANSFORM':
                this._renderState.viewTransform[0] = commands[++localIterator];
                this._renderState.viewTransform[1] = commands[++localIterator];
                this._renderState.viewTransform[2] = commands[++localIterator];
                this._renderState.viewTransform[3] = commands[++localIterator];

                this._renderState.viewTransform[4] = commands[++localIterator];
                this._renderState.viewTransform[5] = commands[++localIterator];
                this._renderState.viewTransform[6] = commands[++localIterator];
                this._renderState.viewTransform[7] = commands[++localIterator];

                this._renderState.viewTransform[8] = commands[++localIterator];
                this._renderState.viewTransform[9] = commands[++localIterator];
                this._renderState.viewTransform[10] = commands[++localIterator];
                this._renderState.viewTransform[11] = commands[++localIterator];

                this._renderState.viewTransform[12] = commands[++localIterator];
                this._renderState.viewTransform[13] = commands[++localIterator];
                this._renderState.viewTransform[14] = commands[++localIterator];
                this._renderState.viewTransform[15] = commands[++localIterator];

                this._renderState.viewDirty = true;
                break;

            case 'WITH': return localIterator - 1;
        }

        command = commands[++localIterator];
    }

    return localIterator;
};

module.exports = Context;

},{"../components/Camera":1,"../dom-renderers/DOMRenderer":2,"../webgl-renderers/WebGLRenderer":38}],24:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * The UIManager is being updated by an Engine by consecutively calling its
 * `update` method. It can either manage a real Web-Worker or the global
 * FamousEngine core singleton.
 *
 * @example
 * var compositor = new Compositor();
 * var engine = new Engine();
 *
 * // Using a Web Worker
 * var worker = new Worker('worker.bundle.js');
 * var threadmanger = new UIManager(worker, compositor, engine);
 *
 * // Without using a Web Worker
 * var threadmanger = new UIManager(Famous, compositor, engine);
 *
 * @class  UIManager
 * @constructor
 *
 * @param {Famous|Worker} thread The thread being used to receive messages
 * from and post messages to. Expected to expose a WebWorker-like API, which
 * means providing a way to listen for updates by setting its `onmessage`
 * property and sending updates using `postMessage`.
 * @param {Compositor} compositor an instance of Compositor used to extract
 * enqueued draw commands from to be sent to the thread.
 * @param {RenderLoop} renderLoop an instance of Engine used for executing
 * the `ENGINE` commands on.
 */
function UIManager (thread, compositor, renderLoop) {
    this._thread = thread;
    this._compositor = compositor;
    this._renderLoop = renderLoop;

    this._renderLoop.update(this);

    var _this = this;
    this._thread.onmessage = function (ev) {
        var message = ev.data ? ev.data : ev;
        if (message[0] === 'ENGINE') {
            switch (message[1]) {
                case 'START':
                    _this._renderLoop.start();
                    break;
                case 'STOP':
                    _this._renderLoop.stop();
                    break;
                default:
                    console.error(
                        'Unknown ENGINE command "' + message[1] + '"'
                    );
                    break;
            }
        }
        else {
            _this._compositor.receiveCommands(message);
        }
    };
    this._thread.onerror = function (error) {
        console.error(error);
    };
}

/**
 * Returns the thread being used by the UIManager.
 * This could either be an an actual web worker or a `FamousEngine` singleton.
 *
 * @method
 *
 * @return {Worker|FamousEngine} Either a web worker or a `FamousEngine` singleton.
 */
UIManager.prototype.getThread = function getThread() {
    return this._thread;
};

/**
 * Returns the compositor being used by this UIManager.
 *
 * @method
 *
 * @return {Compositor} The compositor used by the UIManager.
 */
UIManager.prototype.getCompositor = function getCompositor() {
    return this._compositor;
};

/**
 * Returns the engine being used by this UIManager.
 *
 * @method
 *
 * @return {Engine} The engine used by the UIManager.
 */
UIManager.prototype.getEngine = function getEngine() {
    return this._renderLoop;
};

/**
 * Update method being invoked by the Engine on every `requestAnimationFrame`.
 * Used for updating the notion of time within the managed thread by sending
 * a FRAME command and sending messages to
 *
 * @method
 *
 * @param  {Number} time unix timestamp to be passed down to the worker as a
 * FRAME command
 * @return {undefined} undefined
 */
UIManager.prototype.update = function update (time) {
    this._thread.postMessage(['FRAME', time]);
    var threadMessages = this._compositor.drawCommands();
    this._thread.postMessage(threadMessages);
    this._compositor.clearCommands();
};

module.exports = UIManager;

},{}],25:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var css = '.famous-dom-renderer {' +
    'width:100%;' +
    'height:100%;' +
    'transform-style:preserve-3d;' +
    '-webkit-transform-style:preserve-3d;' +
'}' +

'.famous-dom-element {' +
    '-webkit-transform-origin:0% 0%;' +
    'transform-origin:0% 0%;' +
    '-webkit-backface-visibility:visible;' +
    'backface-visibility:visible;' +
    '-webkit-transform-style:preserve-3d;' +
    'transform-style:preserve-3d;' +
    '-webkit-tap-highlight-color:transparent;' +
    'pointer-events:auto;' +
    'z-index:1;' +
'}' +

'.famous-dom-element-content,' +
'.famous-dom-element {' +
    'position:absolute;' +
    'box-sizing:border-box;' +
    '-moz-box-sizing:border-box;' +
    '-webkit-box-sizing:border-box;' +
'}' +

'.famous-webgl-renderer {' +
    '-webkit-transform:translateZ(1000000px);' +  /* TODO: Fix when Safari Fixes*/
    'transform:translateZ(1000000px);' +
    'pointer-events:none;' +
    'position:absolute;' +
    'z-index:1;' +
    'top:0;' +
    'width:100%;' +
    'height:100%;' +
'}';

var INJECTED = typeof document === 'undefined';

function injectCSS() {
    if (INJECTED) return;
    INJECTED = true;
    if (document.createStyleSheet) {
        var sheet = document.createStyleSheet();
        sheet.cssText = css;
    }
    else {
        var head = document.getElementsByTagName('head')[0];
        var style = document.createElement('style');

        if (style.styleSheet) {
            style.styleSheet.cssText = css;
        }
        else {
            style.appendChild(document.createTextNode(css));
        }

        (head ? head : document.documentElement).appendChild(style);
    }
}

module.exports = injectCSS;

},{}],26:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Deep clone an object.
 *
 * @method  clone
 *
 * @param {Object} b       Object to be cloned.
 * @return {Object} a      Cloned object (deep equality).
 */
var clone = function clone(b) {
    var a;
    if (typeof b === 'object') {
        a = (b instanceof Array) ? [] : {};
        for (var key in b) {
            if (typeof b[key] === 'object' && b[key] !== null) {
                if (b[key] instanceof Array) {
                    a[key] = new Array(b[key].length);
                    for (var i = 0; i < b[key].length; i++) {
                        a[key][i] = clone(b[key][i]);
                    }
                }
                else {
                  a[key] = clone(b[key]);
                }
            }
            else {
                a[key] = b[key];
            }
        }
    }
    else {
        a = b;
    }
    return a;
};

module.exports = clone;

},{}],27:[function(require,module,exports){
'use strict';

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Takes an object containing keys and values and returns an object
 * comprising two "associate" arrays, one with the keys and the other
 * with the values.
 *
 * @method keyValuesToArrays
 *
 * @param {Object} obj                      Objects where to extract keys and values
 *                                          from.
 * @return {Object}         result
 *         {Array.<String>} result.keys     Keys of `result`, as returned by
 *                                          `Object.keys()`
 *         {Array}          result.values   Values of passed in object.
 */
module.exports = function keyValuesToArrays(obj) {
    var keysArray = [], valuesArray = [];
    var i = 0;
    for(var key in obj) {
        if (obj.hasOwnProperty(key)) {
            keysArray[i] = key;
            valuesArray[i] = obj[key];
            i++;
        }
    }
    return {
        keys: keysArray,
        values: valuesArray
    };
};

},{}],28:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var PREFIXES = ['', '-ms-', '-webkit-', '-moz-', '-o-'];

/**
 * A helper function used for determining the vendor prefixed version of the
 * passed in CSS property.
 *
 * Vendor checks are being conducted in the following order:
 *
 * 1. (no prefix)
 * 2. `-mz-`
 * 3. `-webkit-`
 * 4. `-moz-`
 * 5. `-o-`
 *
 * @method vendorPrefix
 *
 * @param {String} property     CSS property (no camelCase), e.g.
 *                              `border-radius`.
 * @return {String} prefixed    Vendor prefixed version of passed in CSS
 *                              property (e.g. `-webkit-border-radius`).
 */
function vendorPrefix(property) {
    for (var i = 0; i < PREFIXES.length; i++) {
        var prefixed = PREFIXES[i] + property;
        if (document.documentElement.style[prefixed] === '') {
            return prefixed;
        }
    }
    return property;
}

module.exports = vendorPrefix;

},{}],29:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var GeometryIds = 0;

/**
 * Geometry is a component that defines and manages data
 * (vertex data and attributes) that is used to draw to WebGL.
 *
 * @class Geometry
 * @constructor
 *
 * @param {Object} options instantiation options
 * @return {undefined} undefined
 */
function Geometry(options) {
    this.options = options || {};
    this.DEFAULT_BUFFER_SIZE = 3;

    this.spec = {
        id: GeometryIds++,
        dynamic: false,
        type: this.options.type || 'TRIANGLES',
        bufferNames: [],
        bufferValues: [],
        bufferSpacings: [],
        invalidations: []
    };

    if (this.options.buffers) {
        var len = this.options.buffers.length;
        for (var i = 0; i < len;) {
            this.spec.bufferNames.push(this.options.buffers[i].name);
            this.spec.bufferValues.push(this.options.buffers[i].data);
            this.spec.bufferSpacings.push(this.options.buffers[i].size || this.DEFAULT_BUFFER_SIZE);
            this.spec.invalidations.push(i++);
        }
    }
}

module.exports = Geometry;

},{}],30:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Vec3 = require('../math/Vec3');
var Vec2 = require('../math/Vec2');

var outputs = [
    new Vec3(),
    new Vec3(),
    new Vec3(),
    new Vec2(),
    new Vec2()
];

/**
 * A helper object used to calculate buffers for complicated geometries.
 * Tailored for the WebGLRenderer, used by most primitives.
 *
 * @static
 * @class GeometryHelper
 * @return {undefined} undefined
 */
var GeometryHelper = {};

/**
 * A function that iterates through vertical and horizontal slices
 * based on input detail, and generates vertices and indices for each
 * subdivision.
 *
 * @static
 * @method
 *
 * @param  {Number} detailX Amount of slices to iterate through.
 * @param  {Number} detailY Amount of stacks to iterate through.
 * @param  {Function} func Function used to generate vertex positions at each point.
 * @param  {Boolean} wrap Optional parameter (default: Pi) for setting a custom wrap range
 *
 * @return {Object} Object containing generated vertices and indices.
 */
GeometryHelper.generateParametric = function generateParametric(detailX, detailY, func, wrap) {
    var vertices = [];
    var i;
    var theta;
    var phi;
    var j;

    // We can wrap around slightly more than once for uv coordinates to look correct.

    var Xrange = wrap ? Math.PI + (Math.PI / (detailX - 1)) : Math.PI;
    var out = [];

    for (i = 0; i < detailX + 1; i++) {
        theta = i * Xrange / detailX;
        for (j = 0; j < detailY; j++) {
            phi = j * 2.0 * Xrange / detailY;
            func(theta, phi, out);
            vertices.push(out[0], out[1], out[2]);
        }
    }

    var indices = [],
        v = 0,
        next;
    for (i = 0; i < detailX; i++) {
        for (j = 0; j < detailY; j++) {
            next = (j + 1) % detailY;
            indices.push(v + j, v + j + detailY, v + next);
            indices.push(v + next, v + j + detailY, v + next + detailY);
        }
        v += detailY;
    }

    return {
        vertices: vertices,
        indices: indices
    };
};

/**
 * Calculates normals belonging to each face of a geometry.
 * Assumes clockwise declaration of vertices.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry.
 * @param {Array} indices Indices declaring faces of geometry.
 * @param {Array} out Array to be filled and returned.
 *
 * @return {Array} Calculated face normals.
 */
GeometryHelper.computeNormals = function computeNormals(vertices, indices, out) {
    var normals = out || [];
    var indexOne;
    var indexTwo;
    var indexThree;
    var normal;
    var j;
    var len = indices.length / 3;
    var i;
    var x;
    var y;
    var z;
    var length;

    for (i = 0; i < len; i++) {
        indexTwo = indices[i*3 + 0] * 3;
        indexOne = indices[i*3 + 1] * 3;
        indexThree = indices[i*3 + 2] * 3;

        outputs[0].set(vertices[indexOne], vertices[indexOne + 1], vertices[indexOne + 2]);
        outputs[1].set(vertices[indexTwo], vertices[indexTwo + 1], vertices[indexTwo + 2]);
        outputs[2].set(vertices[indexThree], vertices[indexThree + 1], vertices[indexThree + 2]);

        normal = outputs[2].subtract(outputs[0]).cross(outputs[1].subtract(outputs[0])).normalize();

        normals[indexOne + 0] = (normals[indexOne + 0] || 0) + normal.x;
        normals[indexOne + 1] = (normals[indexOne + 1] || 0) + normal.y;
        normals[indexOne + 2] = (normals[indexOne + 2] || 0) + normal.z;

        normals[indexTwo + 0] = (normals[indexTwo + 0] || 0) + normal.x;
        normals[indexTwo + 1] = (normals[indexTwo + 1] || 0) + normal.y;
        normals[indexTwo + 2] = (normals[indexTwo + 2] || 0) + normal.z;

        normals[indexThree + 0] = (normals[indexThree + 0] || 0) + normal.x;
        normals[indexThree + 1] = (normals[indexThree + 1] || 0) + normal.y;
        normals[indexThree + 2] = (normals[indexThree + 2] || 0) + normal.z;
    }

    for (i = 0; i < normals.length; i += 3) {
        x = normals[i];
        y = normals[i+1];
        z = normals[i+2];
        length = Math.sqrt(x * x + y * y + z * z);
        for(j = 0; j< 3; j++) {
            normals[i+j] /= length;
        }
    }

    return normals;
};

/**
 * Divides all inserted triangles into four sub-triangles. Alters the
 * passed in arrays.
 *
 * @static
 * @method
 *
 * @param {Array} indices Indices declaring faces of geometry
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} textureCoords Texture coordinates of all points on the geometry
 * @return {undefined} undefined
 */
GeometryHelper.subdivide = function subdivide(indices, vertices, textureCoords) {
    var triangleIndex = indices.length / 3;
    var face;
    var i;
    var j;
    var k;
    var pos;
    var tex;

    while (triangleIndex--) {
        face = indices.slice(triangleIndex * 3, triangleIndex * 3 + 3);

        pos = face.map(function(vertIndex) {
            return new Vec3(vertices[vertIndex * 3], vertices[vertIndex * 3 + 1], vertices[vertIndex * 3 + 2]);
        });
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[0], pos[1], outputs[0]), 0.5, outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[1], pos[2], outputs[0]), 0.5, outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.scale(Vec3.add(pos[0], pos[2], outputs[0]), 0.5, outputs[1]).toArray());

        if (textureCoords) {
            tex = face.map(function(vertIndex) {
                return new Vec2(textureCoords[vertIndex * 2], textureCoords[vertIndex * 2 + 1]);
            });
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[0], tex[1], outputs[3]), 0.5, outputs[4]).toArray());
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[1], tex[2], outputs[3]), 0.5, outputs[4]).toArray());
            textureCoords.push.apply(textureCoords, Vec2.scale(Vec2.add(tex[0], tex[2], outputs[3]), 0.5, outputs[4]).toArray());
        }

        i = vertices.length - 3;
        j = i + 1;
        k = i + 2;

        indices.push(i, j, k);
        indices.push(face[0], i, k);
        indices.push(i, face[1], j);
        indices[triangleIndex] = k;
        indices[triangleIndex + 1] = j;
        indices[triangleIndex + 2] = face[2];
    }
};

/**
 * Creates duplicate of vertices that are shared between faces.
 * Alters the input vertex and index arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} indices Indices declaring faces of geometry
 * @return {undefined} undefined
 */
GeometryHelper.getUniqueFaces = function getUniqueFaces(vertices, indices) {
    var triangleIndex = indices.length / 3,
        registered = [],
        index;

    while (triangleIndex--) {
        for (var i = 0; i < 3; i++) {

            index = indices[triangleIndex * 3 + i];

            if (registered[index]) {
                vertices.push(vertices[index * 3], vertices[index * 3 + 1], vertices[index * 3 + 2]);
                indices[triangleIndex * 3 + i] = vertices.length / 3 - 1;
            }
            else {
                registered[index] = true;
            }
        }
    }
};

/**
 * Divides all inserted triangles into four sub-triangles while maintaining
 * a radius of one. Alters the passed in arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} indices Indices declaring faces of geometry
 * @return {undefined} undefined
 */
GeometryHelper.subdivideSpheroid = function subdivideSpheroid(vertices, indices) {
    var triangleIndex = indices.length / 3,
        abc,
        face,
        i, j, k;

    while (triangleIndex--) {
        face = indices.slice(triangleIndex * 3, triangleIndex * 3 + 3);
        abc = face.map(function(vertIndex) {
            return new Vec3(vertices[vertIndex * 3], vertices[vertIndex * 3 + 1], vertices[vertIndex * 3 + 2]);
        });

        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[0], abc[1], outputs[0]), outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[1], abc[2], outputs[0]), outputs[1]).toArray());
        vertices.push.apply(vertices, Vec3.normalize(Vec3.add(abc[0], abc[2], outputs[0]), outputs[1]).toArray());

        i = vertices.length / 3 - 3;
        j = i + 1;
        k = i + 2;

        indices.push(i, j, k);
        indices.push(face[0], i, k);
        indices.push(i, face[1], j);
        indices[triangleIndex * 3] = k;
        indices[triangleIndex * 3 + 1] = j;
        indices[triangleIndex * 3 + 2] = face[2];
    }
};

/**
 * Divides all inserted triangles into four sub-triangles while maintaining
 * a radius of one. Alters the passed in arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting normals.
 *
 * @return {Array} New list of calculated normals.
 */
GeometryHelper.getSpheroidNormals = function getSpheroidNormals(vertices, out) {
    out = out || [];
    var length = vertices.length / 3;
    var normalized;

    for (var i = 0; i < length; i++) {
        normalized = new Vec3(
            vertices[i * 3 + 0],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        ).normalize().toArray();

        out[i * 3 + 0] = normalized[0];
        out[i * 3 + 1] = normalized[1];
        out[i * 3 + 2] = normalized[2];
    }

    return out;
};

/**
 * Calculates texture coordinates for spheroid primitives based on
 * input vertices.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting texture coordinates.
 *
 * @return {Array} New list of calculated texture coordinates
 */
GeometryHelper.getSpheroidUV = function getSpheroidUV(vertices, out) {
    out = out || [];
    var length = vertices.length / 3;
    var vertex;

    var uv = [];

    for(var i = 0; i < length; i++) {
        vertex = outputs[0].set(
            vertices[i * 3],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        )
        .normalize()
        .toArray();

        uv[0] = this.getAzimuth(vertex) * 0.5 / Math.PI + 0.5;
        uv[1] = this.getAltitude(vertex) / Math.PI + 0.5;

        out.push.apply(out, uv);
    }

    return out;
};

/**
 * Iterates through and normalizes a list of vertices.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with resulting normalized vectors.
 *
 * @return {Array} New list of normalized vertices
 */
GeometryHelper.normalizeAll = function normalizeAll(vertices, out) {
    out = out || [];
    var len = vertices.length / 3;

    for (var i = 0; i < len; i++) {
        Array.prototype.push.apply(out, new Vec3(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]).normalize().toArray());
    }

    return out;
};

/**
 * Normalizes a set of vertices to model space.
 *
 * @static
 * @method
 *
 * @param {Array} vertices Vertices of all points on the geometry
 * @param {Array} out Optional array to be filled with model space position vectors.
 *
 * @return {Array} Output vertices.
 */
GeometryHelper.normalizeVertices = function normalizeVertices(vertices, out) {
    out = out || [];
    var len = vertices.length / 3;
    var vectors = [];
    var minX;
    var maxX;
    var minY;
    var maxY;
    var minZ;
    var maxZ;
    var v;
    var i;

    for (i = 0; i < len; i++) {
        v = vectors[i] = new Vec3(
            vertices[i * 3],
            vertices[i * 3 + 1],
            vertices[i * 3 + 2]
        );

        if (minX == null || v.x < minX) minX = v.x;
        if (maxX == null || v.x > maxX) maxX = v.x;

        if (minY == null || v.y < minY) minY = v.y;
        if (maxY == null || v.y > maxY) maxY = v.y;

        if (minZ == null || v.z < minZ) minZ = v.z;
        if (maxZ == null || v.z > maxZ) maxZ = v.z;
    }

    var translation = new Vec3(
        getTranslationFactor(maxX, minX),
        getTranslationFactor(maxY, minY),
        getTranslationFactor(maxZ, minZ)
    );

    var scale = Math.min(
        getScaleFactor(maxX + translation.x, minX + translation.x),
        getScaleFactor(maxY + translation.y, minY + translation.y),
        getScaleFactor(maxZ + translation.z, minZ + translation.z)
    );

    for (i = 0; i < vectors.length; i++) {
        out.push.apply(out, vectors[i].add(translation).scale(scale).toArray());
    }

    return out;
};

/**
 * Determines translation amount for a given axis to normalize model coordinates.
 *
 * @method
 * @private
 *
 * @param {Number} max Maximum position value of given axis on the model.
 * @param {Number} min Minimum position value of given axis on the model.
 *
 * @return {Number} Number by which the given axis should be translated for all vertices.
 */
function getTranslationFactor(max, min) {
    return -(min + (max - min) / 2);
}

/**
 * Determines scale amount for a given axis to normalize model coordinates.
 *
 * @method
 * @private
 *
 * @param {Number} max Maximum scale value of given axis on the model.
 * @param {Number} min Minimum scale value of given axis on the model.
 *
 * @return {Number} Number by which the given axis should be scaled for all vertices.
 */
function getScaleFactor(max, min) {
    return 1 / ((max - min) / 2);
}

/**
 * Finds the azimuth, or angle above the XY plane, of a given vector.
 *
 * @static
 * @method
 *
 * @param {Array} v Vertex to retreive azimuth from.
 *
 * @return {Number} Azimuth value in radians.
 */
GeometryHelper.getAzimuth = function azimuth(v) {
    return Math.atan2(v[2], -v[0]);
};

/**
 * Finds the altitude, or angle above the XZ plane, of a given vector.
 *
 * @static
 * @method
 *
 * @param {Array} v Vertex to retreive altitude from.
 *
 * @return {Number} Altitude value in radians.
 */
GeometryHelper.getAltitude = function altitude(v) {
    return Math.atan2(-v[1], Math.sqrt((v[0] * v[0]) + (v[2] * v[2])));
};

/**
 * Converts a list of indices from 'triangle' to 'line' format.
 *
 * @static
 * @method
 *
 * @param {Array} indices Indices of all faces on the geometry
 * @param {Array} out Indices of all faces on the geometry
 *
 * @return {Array} New list of line-formatted indices
 */
GeometryHelper.trianglesToLines = function triangleToLines(indices, out) {
    var numVectors = indices.length / 3;
    out = out || [];
    var i;

    for (i = 0; i < numVectors; i++) {
        out.push(indices[i * 3 + 0], indices[i * 3 + 1]);
        out.push(indices[i * 3 + 1], indices[i * 3 + 2]);
        out.push(indices[i * 3 + 2], indices[i * 3 + 0]);
    }

    return out;
};

/**
 * Adds a reverse order triangle for every triangle in the mesh. Adds extra vertices
 * and indices to input arrays.
 *
 * @static
 * @method
 *
 * @param {Array} vertices X, Y, Z positions of all vertices in the geometry
 * @param {Array} indices Indices of all faces on the geometry
 * @return {undefined} undefined
 */
GeometryHelper.addBackfaceTriangles = function addBackfaceTriangles(vertices, indices) {
    var nFaces = indices.length / 3;

    var maxIndex = 0;
    var i = indices.length;
    while (i--) if (indices[i] > maxIndex) maxIndex = indices[i];

    maxIndex++;

    for (i = 0; i < nFaces; i++) {
        var indexOne = indices[i * 3],
            indexTwo = indices[i * 3 + 1],
            indexThree = indices[i * 3 + 2];

        indices.push(indexOne + maxIndex, indexThree + maxIndex, indexTwo + maxIndex);
    }

    // Iterating instead of .slice() here to avoid max call stack issue.

    var nVerts = vertices.length;
    for (i = 0; i < nVerts; i++) {
        vertices.push(vertices[i]);
    }
};

module.exports = GeometryHelper;

},{"../math/Vec2":15,"../math/Vec3":16}],31:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Geometry = require('../Geometry');
var GeometryHelper = require('../GeometryHelper');

/**
 * This function returns a new static geometry, which is passed
 * custom buffer data.
 *
 * @class Plane
 * @constructor
 *
 * @param {Object} options Parameters that alter the
 * vertex buffers of the generated geometry.
 *
 * @return {Object} constructed geometry
 */
function Plane(options) {
    options = options || {};
    var detailX = options.detailX || options.detail || 1;
    var detailY = options.detailY || options.detail || 1;

    var vertices      = [];
    var textureCoords = [];
    var normals       = [];
    var indices       = [];

    var i;

    for (var y = 0; y <= detailY; y++) {
        var t = y / detailY;
        for (var x = 0; x <= detailX; x++) {
            var s = x / detailX;
            vertices.push(2. * (s - .5), 2 * (t - .5), 0);
            textureCoords.push(s, 1 - t);
            if (x < detailX && y < detailY) {
                i = x + y * (detailX + 1);
                indices.push(i, i + 1, i + detailX + 1);
                indices.push(i + detailX + 1, i + 1, i + detailX + 2);
            }
        }
    }

    if (options.backface !== false) {
        GeometryHelper.addBackfaceTriangles(vertices, indices);

        // duplicate texture coordinates as well

        var len = textureCoords.length;
        for (i = 0; i < len; i++) textureCoords.push(textureCoords[i]);
    }

    normals = GeometryHelper.computeNormals(vertices, indices);

    return new Geometry({
        buffers: [
            { name: 'a_pos', data: vertices },
            { name: 'a_texCoord', data: textureCoords, size: 2 },
            { name: 'a_normals', data: normals },
            { name: 'indices', data: indices, size: 1 }
        ]
    });
}

module.exports = Plane;

},{"../Geometry":29,"../GeometryHelper":30}],32:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Buffer is a private class that wraps the vertex data that defines
 * the the points of the triangles that webgl draws. Each buffer
 * maps to one attribute of a mesh.
 *
 * @class Buffer
 * @constructor
 *
 * @param {Number} target The bind target of the buffer to update: ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER
 * @param {Object} type Array type to be used in calls to gl.bufferData.
 * @param {WebGLContext} gl The WebGL context that the buffer is hosted by.
 *
 * @return {undefined} undefined
 */
function Buffer(target, type, gl) {
    this.buffer = null;
    this.target = target;
    this.type = type;
    this.data = [];
    this.gl = gl;
}

/**
 * Creates a WebGL buffer if one does not yet exist and binds the buffer to
 * to the context. Runs bufferData with appropriate data.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Buffer.prototype.subData = function subData() {
    var gl = this.gl;
    var data = [];

    // to prevent against maximum call-stack issue.
    for (var i = 0, chunk = 10000; i < this.data.length; i += chunk)
        data = Array.prototype.concat.apply(data, this.data.slice(i, i + chunk));

    this.buffer = this.buffer || gl.createBuffer();
    gl.bindBuffer(this.target, this.buffer);
    gl.bufferData(this.target, new this.type(data), gl.STATIC_DRAW);
};

module.exports = Buffer;

},{}],33:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var INDICES = 'indices';

var Buffer = require('./Buffer');

/**
 * BufferRegistry is a class that manages allocation of buffers to
 * input geometries.
 *
 * @class BufferRegistry
 * @constructor
 *
 * @param {WebGLContext} context WebGL drawing context to be passed to buffers.
 *
 * @return {undefined} undefined
 */
function BufferRegistry(context) {
    this.gl = context;

    this.registry = {};
    this._dynamicBuffers = [];
    this._staticBuffers = [];

    this._arrayBufferMax = 30000;
    this._elementBufferMax = 30000;
}

/**
 * Binds and fills all the vertex data into webgl buffers.  Will reuse buffers if
 * possible.  Populates registry with the name of the buffer, the WebGL buffer
 * object, spacing of the attribute, the attribute's offset within the buffer,
 * and finally the length of the buffer.  This information is later accessed by
 * the root to draw the buffers.
 *
 * @method
 *
 * @param {Number} geometryId Id of the geometry instance that holds the buffers.
 * @param {String} name Key of the input buffer in the geometry.
 * @param {Array} value Flat array containing input data for buffer.
 * @param {Number} spacing The spacing, or itemSize, of the input buffer.
 * @param {Boolean} dynamic Boolean denoting whether a geometry is dynamic or static.
 *
 * @return {undefined} undefined
 */
BufferRegistry.prototype.allocate = function allocate(geometryId, name, value, spacing, dynamic) {
    var vertexBuffers = this.registry[geometryId] || (this.registry[geometryId] = { keys: [], values: [], spacing: [], offset: [], length: [] });

    var j = vertexBuffers.keys.indexOf(name);
    var isIndex = name === INDICES;
    var bufferFound = false;
    var newOffset;
    var offset = 0;
    var length;
    var buffer;
    var k;

    if (j === -1) {
        j = vertexBuffers.keys.length;
        length = isIndex ? value.length : Math.floor(value.length / spacing);

        if (!dynamic) {

            // Use a previously created buffer if available.

            for (k = 0; k < this._staticBuffers.length; k++) {

                if (isIndex === this._staticBuffers[k].isIndex) {
                    newOffset = this._staticBuffers[k].offset + value.length;
                    if ((!isIndex && newOffset < this._arrayBufferMax) || (isIndex && newOffset < this._elementBufferMax)) {
                        buffer = this._staticBuffers[k].buffer;
                        offset = this._staticBuffers[k].offset;
                        this._staticBuffers[k].offset += value.length;
                        bufferFound = true;
                        break;
                    }
                }
            }

            // Create a new static buffer in none were found.

            if (!bufferFound) {
                buffer = new Buffer(
                    isIndex ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                    isIndex ? Uint16Array : Float32Array,
                    this.gl
                );

                this._staticBuffers.push({ buffer: buffer, offset: value.length, isIndex: isIndex });
            }
        }
        else {

            // For dynamic geometries, always create new buffer.

            buffer = new Buffer(
                isIndex ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER,
                isIndex ? Uint16Array : Float32Array,
                this.gl
            );

            this._dynamicBuffers.push({ buffer: buffer, offset: value.length, isIndex: isIndex });
        }

        // Update the registry for the spec with buffer information.

        vertexBuffers.keys.push(name);
        vertexBuffers.values.push(buffer);
        vertexBuffers.spacing.push(spacing);
        vertexBuffers.offset.push(offset);
        vertexBuffers.length.push(length);
    }

    var len = value.length;
    for (k = 0; k < len; k++) {
        vertexBuffers.values[j].data[offset + k] = value[k];
    }
    vertexBuffers.values[j].subData();
};

module.exports = BufferRegistry;

},{"./Buffer":32}],34:[function(require,module,exports){
'use strict';

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Takes the original rendering contexts' compiler function
 * and augments it with added functionality for parsing and
 * displaying errors.
 *
 * @method
 *
 * @returns {Function} Augmented function
 */
module.exports = function Debug() {
    return _augmentFunction(
        this.gl.compileShader,
        function(shader) {
            if (!this.getShaderParameter(shader, this.COMPILE_STATUS)) {
                var errors = this.getShaderInfoLog(shader);
                var source = this.getShaderSource(shader);
                _processErrors(errors, source);
            }
        }
    );
};

// Takes a function, keeps the reference and replaces it by a closure that
// executes the original function and the provided callback.
function _augmentFunction(func, callback) {
    return function() {
        var res = func.apply(this, arguments);
        callback.apply(this, arguments);
        return res;
    };
}

// Parses errors and failed source code from shaders in order
// to build displayable error blocks.
// Inspired by Jaume Sanchez Elias.
function _processErrors(errors, source) {

    var css = 'body,html{background:#e3e3e3;font-family:monaco,monospace;font-size:14px;line-height:1.7em}' +
              '#shaderReport{left:0;top:0;right:0;box-sizing:border-box;position:absolute;z-index:1000;color:' +
              '#222;padding:15px;white-space:normal;list-style-type:none;margin:50px auto;max-width:1200px}' +
              '#shaderReport li{background-color:#fff;margin:13px 0;box-shadow:0 1px 2px rgba(0,0,0,.15);' +
              'padding:20px 30px;border-radius:2px;border-left:20px solid #e01111}span{color:#e01111;' +
              'text-decoration:underline;font-weight:700}#shaderReport li p{padding:0;margin:0}' +
              '#shaderReport li:nth-child(even){background-color:#f4f4f4}' +
              '#shaderReport li p:first-child{margin-bottom:10px;color:#666}';

    var el = document.createElement('style');
    document.getElementsByTagName('head')[0].appendChild(el);
    el.textContent = css;

    var report = document.createElement('ul');
    report.setAttribute('id', 'shaderReport');
    document.body.appendChild(report);

    var re = /ERROR: [\d]+:([\d]+): (.+)/gmi;
    var lines = source.split('\n');

    var m;
    while ((m = re.exec(errors)) != null) {
        if (m.index === re.lastIndex) re.lastIndex++;
        var li = document.createElement('li');
        var code = '<p><span>ERROR</span> "' + m[2] + '" in line ' + m[1] + '</p>';
        code += '<p><b>' + lines[m[1] - 1].replace(/^[ \t]+/g, '') + '</b></p>';
        li.innerHTML = code;
        report.appendChild(li);
    }
}

},{}],35:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var clone = require('../utilities/clone');
var keyValueToArrays = require('../utilities/keyValueToArrays');

var vertexWrapper = require('../webgl-shaders').vertex;
var fragmentWrapper = require('../webgl-shaders').fragment;
var Debug = require('./Debug');

var VERTEX_SHADER = 35633;
var FRAGMENT_SHADER = 35632;
var identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

var header = 'precision mediump float;\n';

var TYPES = {
    undefined: 'float ',
    1: 'float ',
    2: 'vec2 ',
    3: 'vec3 ',
    4: 'vec4 ',
    16: 'mat4 '
};

var inputTypes = {
    u_baseColor: 'vec4',
    u_normals: 'vert',
    u_glossiness: 'vec4',
    u_positionOffset: 'vert'
};

var masks =  {
    vert: 1,
    vec3: 2,
    vec4: 4,
    float: 8
};

/**
 * Uniform keys and values
 */
var uniforms = keyValueToArrays({
    u_perspective: identityMatrix,
    u_view: identityMatrix,
    u_resolution: [0, 0, 0],
    u_transform: identityMatrix,
    u_size: [1, 1, 1],
    u_time: 0,
    u_opacity: 1,
    u_metalness: 0,
    u_glossiness: [0, 0, 0, 0],
    u_baseColor: [1, 1, 1, 1],
    u_normals: [1, 1, 1],
    u_positionOffset: [0, 0, 0],
    u_lightPosition: identityMatrix,
    u_lightColor: identityMatrix,
    u_ambientLight: [0, 0, 0],
    u_flatShading: 0,
    u_numLights: 0
});

/**
 * Attributes keys and values
 */
var attributes = keyValueToArrays({
    a_pos: [0, 0, 0],
    a_texCoord: [0, 0],
    a_normals: [0, 0, 0]
});

/**
 * Varyings keys and values
 */
var varyings = keyValueToArrays({
    v_textureCoordinate: [0, 0],
    v_normal: [0, 0, 0],
    v_position: [0, 0, 0],
    v_eyeVector: [0, 0, 0]
});

/**
 * A class that handles interactions with the WebGL shader program
 * used by a specific context.  It manages creation of the shader program
 * and the attached vertex and fragment shaders.  It is also in charge of
 * passing all uniforms to the WebGLContext.
 *
 * @class Program
 * @constructor
 *
 * @param {WebGL_Context} gl Context to be used to create the shader program
 * @param {Object} options Program options
 *
 * @return {undefined} undefined
 */
function Program(gl, options) {
    this.gl = gl;
    this.textureSlots = 1;
    this.options = options || {};

    this.registeredMaterials = {};
    this.flaggedUniforms = [];
    this.cachedUniforms  = {};
    this.uniformTypes = [];

    this.definitionVec4 = [];
    this.definitionVec3 = [];
    this.definitionFloat = [];
    this.applicationVec3 = [];
    this.applicationVec4 = [];
    this.applicationFloat = [];
    this.applicationVert = [];
    this.definitionVert = [];

    this.resetProgram();
}

/**
 * Determines whether a material has already been registered to
 * the shader program.
 *
 * @method
 *
 * @param {String} name Name of target input of material.
 * @param {Object} material Compiled material object being verified.
 *
 * @return {Program} this Current program.
 */
Program.prototype.registerMaterial = function registerMaterial(name, material) {
    var compiled = material;
    var type = inputTypes[name];
    var mask = masks[type];

    if ((this.registeredMaterials[material._id] & mask) === mask) return this;

    var k;

    for (k in compiled.uniforms) {
        if (uniforms.keys.indexOf(k) === -1) {
            uniforms.keys.push(k);
            uniforms.values.push(compiled.uniforms[k]);
        }
    }

    for (k in compiled.varyings) {
        if (varyings.keys.indexOf(k) === -1) {
            varyings.keys.push(k);
            varyings.values.push(compiled.varyings[k]);
        }
    }

    for (k in compiled.attributes) {
        if (attributes.keys.indexOf(k) === -1) {
            attributes.keys.push(k);
            attributes.values.push(compiled.attributes[k]);
        }
    }

    this.registeredMaterials[material._id] |= mask;

    if (type === 'float') {
        this.definitionFloat.push(material.defines);
        this.definitionFloat.push('float fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationFloat.push('if (int(abs(ID)) == ' + material._id + ') return fa_' + material._id  + '();');
    }

    if (type === 'vec3') {
        this.definitionVec3.push(material.defines);
        this.definitionVec3.push('vec3 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVec3.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    if (type === 'vec4') {
        this.definitionVec4.push(material.defines);
        this.definitionVec4.push('vec4 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVec4.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    if (type === 'vert') {
        this.definitionVert.push(material.defines);
        this.definitionVert.push('vec3 fa_' + material._id + '() {\n '  + compiled.glsl + ' \n}');
        this.applicationVert.push('if (int(abs(ID.x)) == ' + material._id + ') return fa_' + material._id + '();');
    }

    return this.resetProgram();
};

/**
 * Clears all cached uniforms and attribute locations.  Assembles
 * new fragment and vertex shaders and based on material from
 * currently registered materials.  Attaches said shaders to new
 * shader program and upon success links program to the WebGL
 * context.
 *
 * @method
 *
 * @return {Program} Current program.
 */
Program.prototype.resetProgram = function resetProgram() {
    var vertexHeader = [header];
    var fragmentHeader = [header];

    var fragmentSource;
    var vertexSource;
    var program;
    var name;
    var value;
    var i;

    this.uniformLocations   = [];
    this.attributeLocations = {};

    this.uniformTypes = {};

    this.attributeNames = clone(attributes.keys);
    this.attributeValues = clone(attributes.values);

    this.varyingNames = clone(varyings.keys);
    this.varyingValues = clone(varyings.values);

    this.uniformNames = clone(uniforms.keys);
    this.uniformValues = clone(uniforms.values);

    this.flaggedUniforms = [];
    this.cachedUniforms = {};

    fragmentHeader.push('uniform sampler2D u_textures[7];\n');

    if (this.applicationVert.length) {
        vertexHeader.push('uniform sampler2D u_textures[7];\n');
    }

    for(i = 0; i < this.uniformNames.length; i++) {
        name = this.uniformNames[i];
        value = this.uniformValues[i];
        vertexHeader.push('uniform ' + TYPES[value.length] + name + ';\n');
        fragmentHeader.push('uniform ' + TYPES[value.length] + name + ';\n');
    }

    for(i = 0; i < this.attributeNames.length; i++) {
        name = this.attributeNames[i];
        value = this.attributeValues[i];
        vertexHeader.push('attribute ' + TYPES[value.length] + name + ';\n');
    }

    for(i = 0; i < this.varyingNames.length; i++) {
        name = this.varyingNames[i];
        value = this.varyingValues[i];
        vertexHeader.push('varying ' + TYPES[value.length]  + name + ';\n');
        fragmentHeader.push('varying ' + TYPES[value.length] + name + ';\n');
    }

    vertexSource = vertexHeader.join('') + vertexWrapper
        .replace('#vert_definitions', this.definitionVert.join('\n'))
        .replace('#vert_applications', this.applicationVert.join('\n'));

    fragmentSource = fragmentHeader.join('') + fragmentWrapper
        .replace('#vec3_definitions', this.definitionVec3.join('\n'))
        .replace('#vec3_applications', this.applicationVec3.join('\n'))
        .replace('#vec4_definitions', this.definitionVec4.join('\n'))
        .replace('#vec4_applications', this.applicationVec4.join('\n'))
        .replace('#float_definitions', this.definitionFloat.join('\n'))
        .replace('#float_applications', this.applicationFloat.join('\n'));

    program = this.gl.createProgram();

    this.gl.attachShader(
        program,
        this.compileShader(this.gl.createShader(VERTEX_SHADER), vertexSource)
    );

    this.gl.attachShader(
        program,
        this.compileShader(this.gl.createShader(FRAGMENT_SHADER), fragmentSource)
    );

    this.gl.linkProgram(program);

    if (! this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        console.error('link error: ' + this.gl.getProgramInfoLog(program));
        this.program = null;
    }
    else {
        this.program = program;
        this.gl.useProgram(this.program);
    }

    this.setUniforms(this.uniformNames, this.uniformValues);

    var textureLocation = this.gl.getUniformLocation(this.program, 'u_textures[0]');
    this.gl.uniform1iv(textureLocation, [0, 1, 2, 3, 4, 5, 6]);

    return this;
};

/**
 * Compares the value of the input uniform value against
 * the cached value stored on the Program class.  Updates and
 * creates new entries in the cache when necessary.
 *
 * @method
 * @param {String} targetName Key of uniform spec being evaluated.
 * @param {Number|Array} value Value of uniform spec being evaluated.
 *
 * @return {Boolean} boolean Indicating whether the uniform being set is cached.
 */
Program.prototype.uniformIsCached = function(targetName, value) {
    if(this.cachedUniforms[targetName] == null) {
        if (value.length) {
            this.cachedUniforms[targetName] = new Float32Array(value);
        }
        else {
            this.cachedUniforms[targetName] = value;
        }
        return false;
    }
    else if (value.length) {
        var i = value.length;
        while (i--) {
            if(value[i] !== this.cachedUniforms[targetName][i]) {
                i = value.length;
                while(i--) this.cachedUniforms[targetName][i] = value[i];
                return false;
            }
        }
    }

    else if (this.cachedUniforms[targetName] !== value) {
        this.cachedUniforms[targetName] = value;
        return false;
    }

    return true;
};

/**
 * Handles all passing of uniforms to WebGL drawing context.  This
 * function will find the uniform location and then, based on
 * a type inferred from the javascript value of the uniform, it will call
 * the appropriate function to pass the uniform to WebGL.  Finally,
 * setUniforms will iterate through the passed in shaderChunks (if any)
 * and set the appropriate uniforms to specify which chunks to use.
 *
 * @method
 * @param {Array} uniformNames Array containing the keys of all uniforms to be set.
 * @param {Array} uniformValue Array containing the values of all uniforms to be set.
 *
 * @return {Program} Current program.
 */
Program.prototype.setUniforms = function (uniformNames, uniformValue) {
    var gl = this.gl;
    var location;
    var value;
    var name;
    var len;
    var i;

    if (!this.program) return this;

    len = uniformNames.length;
    for (i = 0; i < len; i++) {
        name = uniformNames[i];
        value = uniformValue[i];

        // Retreive the cached location of the uniform,
        // requesting a new location from the WebGL context
        // if it does not yet exist.

        location = this.uniformLocations[name];

        if (location === null) continue;
        if (location === undefined) {
            location = gl.getUniformLocation(this.program, name);
            this.uniformLocations[name] = location;
        }

        // Check if the value is already set for the
        // given uniform.

        if (this.uniformIsCached(name, value)) continue;

        // Determine the correct function and pass the uniform
        // value to WebGL.

        if (!this.uniformTypes[name]) {
            this.uniformTypes[name] = this.getUniformTypeFromValue(value);
        }

        // Call uniform setter function on WebGL context with correct value

        switch (this.uniformTypes[name]) {
            case 'uniform4fv':  gl.uniform4fv(location, value); break;
            case 'uniform3fv':  gl.uniform3fv(location, value); break;
            case 'uniform2fv':  gl.uniform2fv(location, value); break;
            case 'uniform1fv':  gl.uniform1fv(location, value); break;
            case 'uniform1f' :  gl.uniform1f(location, value); break;
            case 'uniformMatrix3fv': gl.uniformMatrix3fv(location, false, value); break;
            case 'uniformMatrix4fv': gl.uniformMatrix4fv(location, false, value); break;
        }
    }

    return this;
};

/**
 * Infers uniform setter function to be called on the WebGL context, based
 * on an input value.
 *
 * @method
 *
 * @param {Number|Array} value Value from which uniform type is inferred.
 *
 * @return {String} Name of uniform function for given value.
 */
Program.prototype.getUniformTypeFromValue = function getUniformTypeFromValue(value) {
    if (Array.isArray(value) || value instanceof Float32Array) {
        switch (value.length) {
            case 1:  return 'uniform1fv';
            case 2:  return 'uniform2fv';
            case 3:  return 'uniform3fv';
            case 4:  return 'uniform4fv';
            case 9:  return 'uniformMatrix3fv';
            case 16: return 'uniformMatrix4fv';
        }
    }
    else if (!isNaN(parseFloat(value)) && isFinite(value)) {
        return 'uniform1f';
    }

    throw 'cant load uniform "' + name + '" with value:' + JSON.stringify(value);
};

/**
 * Adds shader source to shader and compiles the input shader.  Checks
 * compile status and logs error if necessary.
 *
 * @method
 *
 * @param {Object} shader Program to be compiled.
 * @param {String} source Source to be used in the shader.
 *
 * @return {Object} Compiled shader.
 */
Program.prototype.compileShader = function compileShader(shader, source) {
    var i = 1;

    if (this.options.debug) {
        this.gl.compileShader = Debug.call(this);
    }

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error('compile error: ' + this.gl.getShaderInfoLog(shader));
        console.error('1: ' + source.replace(/\n/g, function () {
            return '\n' + (i+=1) + ': ';
        }));
    }

    return shader;
};

module.exports = Program;

},{"../utilities/clone":26,"../utilities/keyValueToArrays":27,"../webgl-shaders":42,"./Debug":34}],36:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

/**
 * Texture is a private class that stores image data
 * to be accessed from a shader or used as a render target.
 *
 * @class Texture
 * @constructor
 *
 * @param {GL} gl GL
 * @param {Object} options Options
 *
 * @return {undefined} undefined
 */
function Texture(gl, options) {
    options = options || {};
    this.id = gl.createTexture();
    this.width = options.width || 0;
    this.height = options.height || 0;
    this.mipmap = options.mipmap;
    this.format = options.format || 'RGBA';
    this.type = options.type || 'UNSIGNED_BYTE';
    this.gl = gl;

    this.bind();

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, options.flipYWebgl || false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, options.premultiplyAlphaWebgl || false);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[options.magFilter] || gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[options.minFilter] || gl.NEAREST);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[options.wrapS] || gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[options.wrapT] || gl.CLAMP_TO_EDGE);
}

/**
 * Binds this texture as the selected target.
 *
 * @method
 * @return {Object} Current texture instance.
 */
Texture.prototype.bind = function bind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.id);
    return this;
};

/**
 * Erases the texture data in the given texture slot.
 *
 * @method
 * @return {Object} Current texture instance.
 */
Texture.prototype.unbind = function unbind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    return this;
};

/**
 * Replaces the image data in the texture with the given image.
 *
 * @method
 *
 * @param {Image}   img     The image object to upload pixel data from.
 * @return {Object}         Current texture instance.
 */
Texture.prototype.setImage = function setImage(img) {
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl[this.format], this.gl[this.format], this.gl[this.type], img);
    if (this.mipmap) this.gl.generateMipmap(this.gl.TEXTURE_2D);
    return this;
};

/**
 * Replaces the image data in the texture with an array of arbitrary data.
 *
 * @method
 *
 * @param {Array}   input   Array to be set as data to texture.
 * @return {Object}         Current texture instance.
 */
Texture.prototype.setArray = function setArray(input) {
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl[this.format], this.width, this.height, 0, this.gl[this.format], this.gl[this.type], input);
    return this;
};

/**
 * Dumps the rgb-pixel contents of a texture into an array for debugging purposes
 *
 * @method
 *
 * @param {Number} x        x-offset between texture coordinates and snapshot
 * @param {Number} y        y-offset between texture coordinates and snapshot
 * @param {Number} width    x-depth of the snapshot
 * @param {Number} height   y-depth of the snapshot
 *
 * @return {Array}          An array of the pixels contained in the snapshot.
 */
Texture.prototype.readBack = function readBack(x, y, width, height) {
    var gl = this.gl;
    var pixels;
    x = x || 0;
    y = y || 0;
    width = width || this.width;
    height = height || this.height;
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        pixels = new Uint8Array(width * height * 4);
        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
    return pixels;
};

module.exports = Texture;

},{}],37:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

var Texture = require('./Texture');
var createCheckerboard = require('./createCheckerboard');

/**
 * Handles loading, binding, and resampling of textures for WebGLRenderer.
 *
 * @class TextureManager
 * @constructor
 *
 * @param {WebGL_Context} gl Context used to create and bind textures.
 *
 * @return {undefined} undefined
 */
function TextureManager(gl) {
    this.registry = [];
    this._needsResample = [];

    this._activeTexture = 0;
    this._boundTexture = null;

    this._checkerboard = createCheckerboard();

    this.gl = gl;
}

/**
 * Update function used by WebGLRenderer to queue resamples on
 * registered textures.
 *
 * @method
 *
 * @param {Number}      time    Time in milliseconds according to the compositor.
 * @return {undefined}          undefined
 */
TextureManager.prototype.update = function update(time) {
    var registryLength = this.registry.length;

    for (var i = 1; i < registryLength; i++) {
        var texture = this.registry[i];

        if (texture && texture.isLoaded && texture.resampleRate) {
            if (!texture.lastResample || time - texture.lastResample > texture.resampleRate) {
                if (!this._needsResample[texture.id]) {
                    this._needsResample[texture.id] = true;
                    texture.lastResample = time;
                }
            }
        }
    }
};

/**
 * Creates a spec and creates a texture based on given texture data.
 * Handles loading assets if necessary.
 *
 * @method
 *
 * @param {Object}  input   Object containing texture id, texture data
 *                          and options used to draw texture.
 * @param {Number}  slot    Texture slot to bind generated texture to.
 * @return {undefined}      undefined
 */
TextureManager.prototype.register = function register(input, slot) {
    var _this = this;

    var source = input.data;
    var textureId = input.id;
    var options = input.options || {};
    var texture = this.registry[textureId];
    var spec;

    if (!texture) {

        texture = new Texture(this.gl, options);
        texture.setImage(this._checkerboard);

        // Add texture to registry

        spec = this.registry[textureId] = {
            resampleRate: options.resampleRate || null,
            lastResample: null,
            isLoaded: false,
            texture: texture,
            source: source,
            id: textureId,
            slot: slot
        };

        // Handle array

        if (Array.isArray(source) || source instanceof Uint8Array || source instanceof Float32Array) {
            this.bindTexture(textureId);
            texture.setArray(source);
            spec.isLoaded = true;
        }

        // Handle video

        else if (window && source instanceof window.HTMLVideoElement) {
            source.addEventListener('loadeddata', function() {
                _this.bindTexture(textureId);
                texture.setImage(source);

                spec.isLoaded = true;
                spec.source = source;
            });
        }

        // Handle image url

        else if (typeof source === 'string') {
            loadImage(source, function (img) {
                _this.bindTexture(textureId);
                texture.setImage(img);

                spec.isLoaded = true;
                spec.source = img;
            });
        }
    }

    return textureId;
};

/**
 * Loads an image from a string or Image object and executes a callback function.
 *
 * @method
 * @private
 *
 * @param {Object|String} input The input image data to load as an asset.
 * @param {Function} callback The callback function to be fired when the image has finished loading.
 *
 * @return {Object} Image object being loaded.
 */
function loadImage (input, callback) {
    var image = (typeof input === 'string' ? new Image() : input) || {};
        image.crossOrigin = 'anonymous';

    if (!image.src) image.src = input;
    if (!image.complete) {
        image.onload = function () {
            callback(image);
        };
    }
    else {
        callback(image);
    }

    return image;
}

/**
 * Sets active texture slot and binds target texture.  Also handles
 * resampling when necessary.
 *
 * @method
 *
 * @param {Number} id Identifier used to retreive texture spec
 *
 * @return {undefined} undefined
 */
TextureManager.prototype.bindTexture = function bindTexture(id) {
    var spec = this.registry[id];

    if (this._activeTexture !== spec.slot) {
        this.gl.activeTexture(this.gl.TEXTURE0 + spec.slot);
        this._activeTexture = spec.slot;
    }

    if (this._boundTexture !== id) {
        this._boundTexture = id;
        spec.texture.bind();
    }

    if (this._needsResample[spec.id]) {

        // TODO: Account for resampling of arrays.

        spec.texture.setImage(spec.source);
        this._needsResample[spec.id] = false;
    }
};

module.exports = TextureManager;

},{"./Texture":36,"./createCheckerboard":40}],38:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

var Program = require('./Program');
var BufferRegistry = require('./BufferRegistry');
var Plane = require('../webgl-geometries/primitives/Plane');
var sorter = require('./radixSort');
var keyValueToArrays = require('../utilities/keyValueToArrays');
var TextureManager = require('./TextureManager');
var compileMaterial = require('./compileMaterial');

var identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

var globalUniforms = keyValueToArrays({
    'u_numLights': 0,
    'u_ambientLight': new Array(3),
    'u_lightPosition': new Array(3),
    'u_lightColor': new Array(3),
    'u_perspective': new Array(16),
    'u_time': 0,
    'u_view': new Array(16)
});

/**
 * WebGLRenderer is a private class that manages all interactions with the WebGL
 * API. Each frame it receives commands from the compositor and updates its
 * registries accordingly. Subsequently, the draw function is called and the
 * WebGLRenderer issues draw calls for all meshes in its registry.
 *
 * @class WebGLRenderer
 * @constructor
 *
 * @param {Element} canvas The DOM element that GL will paint itself onto.
 * @param {Compositor} compositor Compositor used for querying the time from.
 *
 * @return {undefined} undefined
 */
function WebGLRenderer(canvas, compositor) {
    canvas.classList.add('famous-webgl-renderer');

    this.canvas = canvas;
    this.compositor = compositor;

    var gl = this.gl = this.getWebGLContext(this.canvas);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.polygonOffset(0.1, 0.1);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.depthFunc(gl.LEQUAL);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    this.meshRegistry = {};
    this.meshRegistryKeys = [];

    this.cutoutRegistry = {};

    this.cutoutRegistryKeys = [];

    /**
     * Lights
     */
    this.numLights = 0;
    this.ambientLightColor = [0, 0, 0];
    this.lightRegistry = {};
    this.lightRegistryKeys = [];
    this.lightPositions = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.lightColors = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    this.textureManager = new TextureManager(gl);
    this.texCache = {};
    this.bufferRegistry = new BufferRegistry(gl);
    this.program = new Program(gl, { debug: true });

    this.state = {
        boundArrayBuffer: null,
        boundElementBuffer: null,
        lastDrawn: null,
        enabledAttributes: {},
        enabledAttributesKeys: []
    };

    this.resolutionName = ['u_resolution'];
    this.resolutionValues = [];

    this.cachedSize = [];

    /*
    The projectionTransform has some constant components, i.e. the z scale, and the x and y translation.

    The z scale keeps the final z position of any vertex within the clip's domain by scaling it by an
    arbitrarily small coefficient. This has the advantage of being a useful default in the event of the
    user forgoing a near and far plane, an alien convention in dom space as in DOM overlapping is
    conducted via painter's algorithm.

    The x and y translation transforms the world space origin to the top left corner of the screen.

    The final component (this.projectionTransform[15]) is initialized as 1 because certain projection models,
    e.g. the WC3 specified model, keep the XY plane as the projection hyperplane.
    */
    this.projectionTransform = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -0.000001, 0, -1, 1, 0, 1];

    // TODO: remove this hack

    var cutout = this.cutoutGeometry = new Plane();

    this.bufferRegistry.allocate(cutout.spec.id, 'a_pos', cutout.spec.bufferValues[0], 3);
    this.bufferRegistry.allocate(cutout.spec.id, 'a_texCoord', cutout.spec.bufferValues[1], 2);
    this.bufferRegistry.allocate(cutout.spec.id, 'a_normals', cutout.spec.bufferValues[2], 3);
    this.bufferRegistry.allocate(cutout.spec.id, 'indices', cutout.spec.bufferValues[3], 1);
}

/**
 * Attempts to retreive the WebGLRenderer context using several
 * accessors. For browser compatability. Throws on error.
 *
 * @method
 *
 * @param {Object} canvas Canvas element from which the context is retreived
 *
 * @return {Object} WebGLContext of canvas element
 */
WebGLRenderer.prototype.getWebGLContext = function getWebGLContext(canvas) {
    var names = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
    var context = null;
    for (var i = 0; i < names.length; i++) {
        try {
            context = canvas.getContext(names[i]);
        }
        catch (error) {
            var msg = 'Error creating WebGL context: ' + error.prototype.toString();
            console.error(msg);
        }
        if (context) {
            break;
        }
    }
    return context ? context : false;
};

/**
 * Adds a new base spec to the light registry at a given path.
 *
 * @method
 *
 * @param {String} path Path used as id of new light in lightRegistry
 *
 * @return {Object} Newly created light spec
 */
WebGLRenderer.prototype.createLight = function createLight(path) {
    this.numLights++;
    this.lightRegistryKeys.push(path);
    this.lightRegistry[path] = {
        color: [0, 0, 0],
        position: [0, 0, 0]
    };
    return this.lightRegistry[path];
};

/**
 * Adds a new base spec to the mesh registry at a given path.
 *
 * @method
 *
 * @param {String} path Path used as id of new mesh in meshRegistry.
 *
 * @return {Object} Newly created mesh spec.
 */
WebGLRenderer.prototype.createMesh = function createMesh(path) {
    this.meshRegistryKeys.push(path);

    var uniforms = keyValueToArrays({
        u_opacity: 1,
        u_transform: identity,
        u_size: [0, 0, 0],
        u_baseColor: [0.5, 0.5, 0.5, 1],
        u_positionOffset: [0, 0, 0],
        u_normals: [0, 0, 0],
        u_flatShading: 0,
        u_glossiness: [0, 0, 0, 0]
    });
    this.meshRegistry[path] = {
        depth: null,
        uniformKeys: uniforms.keys,
        uniformValues: uniforms.values,
        buffers: {},
        geometry: null,
        drawType: null,
        textures: [],
        visible: true
    };
    return this.meshRegistry[path];
};

/**
 * Sets flag on indicating whether to do skip draw phase for
 * cutout mesh at given path.
 *
 * @method
 *
 * @param {String} path Path used as id of target cutout mesh.
 * @param {Boolean} usesCutout Indicates the presence of a cutout mesh
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setCutoutState = function setCutoutState(path, usesCutout) {
    var cutout = this.getOrSetCutout(path);

    cutout.visible = usesCutout;
};

/**
 * Creates or retreives cutout
 *
 * @method
 *
 * @param {String} path Path used as id of target cutout mesh.
 *
 * @return {Object} Newly created cutout spec.
 */
WebGLRenderer.prototype.getOrSetCutout = function getOrSetCutout(path) {
    if (this.cutoutRegistry[path]) {
        return this.cutoutRegistry[path];
    }
    else {
        var uniforms = keyValueToArrays({
            u_opacity: 0,
            u_transform: identity.slice(),
            u_size: [0, 0, 0],
            u_origin: [0, 0, 0],
            u_baseColor: [0, 0, 0, 1]
        });

        this.cutoutRegistryKeys.push(path);

        this.cutoutRegistry[path] = {
            uniformKeys: uniforms.keys,
            uniformValues: uniforms.values,
            geometry: this.cutoutGeometry.spec.id,
            drawType: this.cutoutGeometry.spec.type,
            visible: true
        };

        return this.cutoutRegistry[path];
    }
};

/**
 * Sets flag on indicating whether to do skip draw phase for
 * mesh at given path.
 *
 * @method
 * @param {String} path Path used as id of target mesh.
 * @param {Boolean} visibility Indicates the visibility of target mesh.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setMeshVisibility = function setMeshVisibility(path, visibility) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.visible = visibility;
};

/**
 * Deletes a mesh from the meshRegistry.
 *
 * @method
 * @param {String} path Path used as id of target mesh.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.removeMesh = function removeMesh(path) {
    var keyLocation = this.meshRegistryKeys.indexOf(path);
    this.meshRegistryKeys.splice(keyLocation, 1);
    this.meshRegistry[path] = null;
};

/**
 * Creates or retreives cutout
 *
 * @method
 * @param {String} path Path used as id of cutout in cutout registry.
 * @param {String} uniformName Identifier used to upload value
 * @param {Array} uniformValue Value of uniform data
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setCutoutUniform = function setCutoutUniform(path, uniformName, uniformValue) {
    var cutout = this.getOrSetCutout(path);

    var index = cutout.uniformKeys.indexOf(uniformName);

    if (Array.isArray(uniformValue)) {
        for (var i = 0, len = uniformValue.length; i < len; i++) {
            cutout.uniformValues[index][i] = uniformValue[i];
        }
    }
    else {
        cutout.uniformValues[index] = uniformValue;
    }
};

/**
 * Edits the options field on a mesh
 *
 * @method
 * @param {String} path Path used as id of target mesh
 * @param {Object} options Map of draw options for mesh
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setMeshOptions = function(path, options) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.options = options;
    return this;
};

/**
 * Changes the color of the fixed intensity lighting in the scene
 *
 * @method
 *
 * @param {String} path Path used as id of light
 * @param {Number} r red channel
 * @param {Number} g green channel
 * @param {Number} b blue channel
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setAmbientLightColor = function setAmbientLightColor(path, r, g, b) {
    this.ambientLightColor[0] = r;
    this.ambientLightColor[1] = g;
    this.ambientLightColor[2] = b;
    return this;
};

/**
 * Changes the location of the light in the scene
 *
 * @method
 *
 * @param {String} path Path used as id of light
 * @param {Number} x x position
 * @param {Number} y y position
 * @param {Number} z z position
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setLightPosition = function setLightPosition(path, x, y, z) {
    var light = this.lightRegistry[path] || this.createLight(path);

    light.position[0] = x;
    light.position[1] = y;
    light.position[2] = z;
    return this;
};

/**
 * Changes the color of a dynamic intensity lighting in the scene
 *
 * @method
 *
 * @param {String} path Path used as id of light in light Registry.
 * @param {Number} r red channel
 * @param {Number} g green channel
 * @param {Number} b blue channel
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setLightColor = function setLightColor(path, r, g, b) {
    var light = this.lightRegistry[path] || this.createLight(path);

    light.color[0] = r;
    light.color[1] = g;
    light.color[2] = b;
    return this;
};

/**
 * Compiles material spec into program shader
 *
 * @method
 *
 * @param {String} path Path used as id of cutout in cutout registry.
 * @param {String} name Name that the rendering input the material is bound to
 * @param {Object} material Material spec
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.handleMaterialInput = function handleMaterialInput(path, name, material) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);
    material = compileMaterial(material, mesh.textures.length);

    // Set uniforms to enable texture!

    mesh.uniformValues[mesh.uniformKeys.indexOf(name)][0] = -material._id;

    // Register textures!

    var i = material.textures.length;
    while (i--) {
        mesh.textures.push(
            this.textureManager.register(material.textures[i], mesh.textures.length + i)
        );
    }

    // Register material!

    this.program.registerMaterial(name, material);

    return this.updateSize();
};

/**
 * Changes the geometry data of a mesh
 *
 * @method
 *
 * @param {String} path Path used as id of cutout in cutout registry.
 * @param {Object} geometry Geometry object containing vertex data to be drawn
 * @param {Number} drawType Primitive identifier
 * @param {Boolean} dynamic Whether geometry is dynamic
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setGeometry = function setGeometry(path, geometry, drawType, dynamic) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    mesh.geometry = geometry;
    mesh.drawType = drawType;
    mesh.dynamic = dynamic;

    return this;
};

/**
 * Uploads a new value for the uniform data when the mesh is being drawn
 *
 * @method
 *
 * @param {String} path Path used as id of mesh in mesh registry
 * @param {String} uniformName Identifier used to upload value
 * @param {Array} uniformValue Value of uniform data
 *
 * @return {undefined} undefined
**/
WebGLRenderer.prototype.setMeshUniform = function setMeshUniform(path, uniformName, uniformValue) {
    var mesh = this.meshRegistry[path] || this.createMesh(path);

    var index = mesh.uniformKeys.indexOf(uniformName);

    if (index === -1) {
        mesh.uniformKeys.push(uniformName);
        mesh.uniformValues.push(uniformValue);
    }
    else {
        mesh.uniformValues[index] = uniformValue;
    }
};

/**
 * Triggers the 'draw' phase of the WebGLRenderer. Iterates through registries
 * to set uniforms, set attributes and issue draw commands for renderables.
 *
 * @method
 *
 * @param {String} path Path used as id of mesh in mesh registry
 * @param {Number} geometryId Id of geometry in geometry registry
 * @param {String} bufferName Attribute location name
 * @param {Array} bufferValue Vertex data
 * @param {Number} bufferSpacing The dimensions of the vertex
 * @param {Boolean} isDynamic Whether geometry is dynamic
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.bufferData = function bufferData(path, geometryId, bufferName, bufferValue, bufferSpacing, isDynamic) {
    this.bufferRegistry.allocate(geometryId, bufferName, bufferValue, bufferSpacing, isDynamic);

    return this;
};

/**
 * Triggers the 'draw' phase of the WebGLRenderer. Iterates through registries
 * to set uniforms, set attributes and issue draw commands for renderables.
 *
 * @method
 *
 * @param {Object} renderState Parameters provided by the compositor, that affect the rendering of all renderables.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.draw = function draw(renderState) {
    var time = this.compositor.getTime();

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.textureManager.update(time);

    this.meshRegistryKeys = sorter(this.meshRegistryKeys, this.meshRegistry);

    this.setGlobalUniforms(renderState);
    this.drawCutouts();
    this.drawMeshes();
};

/**
 * Iterates through and draws all registered meshes. This includes
 * binding textures, handling draw options, setting mesh uniforms
 * and drawing mesh buffers.
 *
 * @method
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.drawMeshes = function drawMeshes() {
    var gl = this.gl;
    var buffers;
    var mesh;

    for(var i = 0; i < this.meshRegistryKeys.length; i++) {
        mesh = this.meshRegistry[this.meshRegistryKeys[i]];
        buffers = this.bufferRegistry.registry[mesh.geometry];

        if (!mesh.visible) continue;

        if (mesh.uniformValues[0] < 1) {
            gl.depthMask(false);
            gl.enable(gl.BLEND);
        }
        else {
            gl.depthMask(true);
            gl.disable(gl.BLEND);
        }

        if (!buffers) continue;

        var j = mesh.textures.length;
        while (j--) this.textureManager.bindTexture(mesh.textures[j]);

        if (mesh.options) this.handleOptions(mesh.options, mesh);

        this.program.setUniforms(mesh.uniformKeys, mesh.uniformValues);
        this.drawBuffers(buffers, mesh.drawType, mesh.geometry);

        if (mesh.options) this.resetOptions(mesh.options);
    }
};

/**
 * Iterates through and draws all registered cutout meshes. Blending
 * is disabled, cutout uniforms are set and finally buffers are drawn.
 *
 * @method
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.drawCutouts = function drawCutouts() {
    var cutout;
    var buffers;
    var len = this.cutoutRegistryKeys.length;

    if (len) {
        this.gl.enable(this.gl.BLEND);
        this.gl.depthMask(true);
    }

    for (var i = 0; i < len; i++) {
        cutout = this.cutoutRegistry[this.cutoutRegistryKeys[i]];
        buffers = this.bufferRegistry.registry[cutout.geometry];

        if (!cutout.visible) continue;

        this.program.setUniforms(cutout.uniformKeys, cutout.uniformValues);
        this.drawBuffers(buffers, cutout.drawType, cutout.geometry);
    }
};

/**
 * Sets uniforms to be shared by all meshes.
 *
 * @method
 *
 * @param {Object} renderState Draw state options passed down from compositor.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.setGlobalUniforms = function setGlobalUniforms(renderState) {
    var light;
    var stride;

    for (var i = 0, len = this.lightRegistryKeys.length; i < len; i++) {
        light = this.lightRegistry[this.lightRegistryKeys[i]];
        stride = i * 4;

        // Build the light positions' 4x4 matrix

        this.lightPositions[0 + stride] = light.position[0];
        this.lightPositions[1 + stride] = light.position[1];
        this.lightPositions[2 + stride] = light.position[2];

        // Build the light colors' 4x4 matrix

        this.lightColors[0 + stride] = light.color[0];
        this.lightColors[1 + stride] = light.color[1];
        this.lightColors[2 + stride] = light.color[2];
    }

    globalUniforms.values[0] = this.numLights;
    globalUniforms.values[1] = this.ambientLightColor;
    globalUniforms.values[2] = this.lightPositions;
    globalUniforms.values[3] = this.lightColors;

    /*
     * Set time and projection uniforms
     * projecting world space into a 2d plane representation of the canvas.
     * The x and y scale (this.projectionTransform[0] and this.projectionTransform[5] respectively)
     * convert the projected geometry back into clipspace.
     * The perpective divide (this.projectionTransform[11]), adds the z value of the point
     * multiplied by the perspective divide to the w value of the point. In the process
     * of converting from homogenous coordinates to NDC (normalized device coordinates)
     * the x and y values of the point are divided by w, which implements perspective.
     */
    this.projectionTransform[0] = 1 / (this.cachedSize[0] * 0.5);
    this.projectionTransform[5] = -1 / (this.cachedSize[1] * 0.5);
    this.projectionTransform[11] = renderState.perspectiveTransform[11];

    globalUniforms.values[4] = this.projectionTransform;
    globalUniforms.values[5] = this.compositor.getTime() * 0.001;
    globalUniforms.values[6] = renderState.viewTransform;

    this.program.setUniforms(globalUniforms.keys, globalUniforms.values);
};

/**
 * Loads the buffers and issues the draw command for a geometry.
 *
 * @method
 *
 * @param {Object} vertexBuffers All buffers used to draw the geometry.
 * @param {Number} mode Enumerator defining what primitive to draw
 * @param {Number} id ID of geometry being drawn.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.drawBuffers = function drawBuffers(vertexBuffers, mode, id) {
    var gl = this.gl;
    var length = 0;
    var attribute;
    var location;
    var spacing;
    var offset;
    var buffer;
    var iter;
    var j;
    var i;

    iter = vertexBuffers.keys.length;
    for (i = 0; i < iter; i++) {
        attribute = vertexBuffers.keys[i];

        // Do not set vertexAttribPointer if index buffer.

        if (attribute === 'indices') {
            j = i; continue;
        }

        // Retreive the attribute location and make sure it is enabled.

        location = this.program.attributeLocations[attribute];

        if (location === -1) continue;
        if (location === undefined) {
            location = gl.getAttribLocation(this.program.program, attribute);
            this.program.attributeLocations[attribute] = location;
            if (location === -1) continue;
        }

        if (!this.state.enabledAttributes[attribute]) {
            gl.enableVertexAttribArray(location);
            this.state.enabledAttributes[attribute] = true;
            this.state.enabledAttributesKeys.push(attribute);
        }

        // Retreive buffer information used to set attribute pointer.

        buffer = vertexBuffers.values[i];
        spacing = vertexBuffers.spacing[i];
        offset = vertexBuffers.offset[i];
        length = vertexBuffers.length[i];

        // Skip bindBuffer if buffer is currently bound.

        if (this.state.boundArrayBuffer !== buffer) {
            gl.bindBuffer(buffer.target, buffer.buffer);
            this.state.boundArrayBuffer = buffer;
        }

        if (this.state.lastDrawn !== id) {
            gl.vertexAttribPointer(location, spacing, gl.FLOAT, gl.FALSE, 0, 4 * offset);
        }
    }

    // Disable any attributes that not currently being used.

    var len = this.state.enabledAttributesKeys.length;
    for (i = 0; i < len; i++) {
        var key = this.state.enabledAttributesKeys[i];
        if (this.state.enabledAttributes[key] && vertexBuffers.keys.indexOf(key) === -1) {
            gl.disableVertexAttribArray(this.program.attributeLocations[key]);
            this.state.enabledAttributes[key] = false;
        }
    }

    if (length) {

        // If index buffer, use drawElements.

        if (j !== undefined) {
            buffer = vertexBuffers.values[j];
            offset = vertexBuffers.offset[j];
            spacing = vertexBuffers.spacing[j];
            length = vertexBuffers.length[j];

            // Skip bindBuffer if buffer is currently bound.

            if (this.state.boundElementBuffer !== buffer) {
                gl.bindBuffer(buffer.target, buffer.buffer);
                this.state.boundElementBuffer = buffer;
            }

            gl.drawElements(gl[mode], length, gl.UNSIGNED_SHORT, 2 * offset);
        }
        else {
            gl.drawArrays(gl[mode], 0, length);
        }
    }

    this.state.lastDrawn = id;
};

/**
 * Updates the width and height of parent canvas, sets the viewport size on
 * the WebGL context and updates the resolution uniform for the shader program.
 * Size is retreived from the container object of the renderer.
 *
 * @method
 *
 * @param {Array} size width, height and depth of canvas
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.updateSize = function updateSize(size) {
    if (size) {
        var pixelRatio = window.devicePixelRatio || 1;
        var displayWidth = ~~(size[0] * pixelRatio);
        var displayHeight = ~~(size[1] * pixelRatio);
        this.canvas.width = displayWidth;
        this.canvas.height = displayHeight;
        this.gl.viewport(0, 0, displayWidth, displayHeight);

        this.cachedSize[0] = size[0];
        this.cachedSize[1] = size[1];
        this.cachedSize[2] = (size[0] > size[1]) ? size[0] : size[1];
        this.resolutionValues[0] = this.cachedSize;
    }

    this.program.setUniforms(this.resolutionName, this.resolutionValues);

    return this;
};

/**
 * Updates the state of the WebGL drawing context based on custom parameters
 * defined on a mesh.
 *
 * @method
 *
 * @param {Object} options Draw state options to be set to the context.
 * @param {Mesh} mesh Associated Mesh
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.handleOptions = function handleOptions(options, mesh) {
    var gl = this.gl;
    if (!options) return;

    if (options.side === 'double') {
        this.gl.cullFace(this.gl.FRONT);
        this.drawBuffers(this.bufferRegistry.registry[mesh.geometry], mesh.drawType, mesh.geometry);
        this.gl.cullFace(this.gl.BACK);
    }

    if (options.blending) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    if (options.side === 'back') gl.cullFace(gl.FRONT);
};

/**
 * Resets the state of the WebGL drawing context to default values.
 *
 * @method
 *
 * @param {Object} options Draw state options to be set to the context.
 *
 * @return {undefined} undefined
 */
WebGLRenderer.prototype.resetOptions = function resetOptions(options) {
    var gl = this.gl;
    if (!options) return;
    if (options.blending) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    if (options.side === 'back') gl.cullFace(gl.BACK);
};

module.exports = WebGLRenderer;

},{"../utilities/keyValueToArrays":27,"../webgl-geometries/primitives/Plane":31,"./BufferRegistry":33,"./Program":35,"./TextureManager":37,"./compileMaterial":39,"./radixSort":41}],39:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

var types = {
    1: 'float ',
    2: 'vec2 ',
    3: 'vec3 ',
    4: 'vec4 '
};

/**
 * Traverses material to create a string of glsl code to be applied in
 * the vertex or fragment shader.
 *
 * @method
 * @protected
 *
 * @param {Object} material Material to be compiled.
 * @param {Number} textureSlot Next available texture slot for Mesh.
 *
 * @return {undefined} undefined
 */
function compileMaterial(material, textureSlot) {
    var glsl = '';
    var uniforms = {};
    var varyings = {};
    var attributes = {};
    var defines = [];
    var textures = [];

    _traverse(material, function (node, depth) {
        if (! node.chunk) return;

        var type = types[_getOutputLength(node)];
        var label = _makeLabel(node);
        var output = _processGLSL(node.chunk.glsl, node.inputs, textures.length + textureSlot);

        glsl += type + label + ' = ' + output + '\n ';

        if (node.uniforms) _extend(uniforms, node.uniforms);
        if (node.varyings) _extend(varyings, node.varyings);
        if (node.attributes) _extend(attributes, node.attributes);
        if (node.chunk.defines) defines.push(node.chunk.defines);
        if (node.texture) textures.push(node.texture);
    });

    return {
        _id: material._id,
        glsl: glsl + 'return ' + _makeLabel(material) + ';',
        defines: defines.join('\n'),
        uniforms: uniforms,
        varyings: varyings,
        attributes: attributes,
        textures: textures
    };
}

// Recursively iterates over a material's inputs, invoking a given callback
// with the current material
function _traverse(material, callback) {
	var inputs = material.inputs;
    var len = inputs && inputs.length;
    var idx = -1;

    while (++idx < len) _traverse(inputs[idx], callback);

    callback(material);

    return material;
}

// Helper function used to infer length of the output
// from a given material node.
function _getOutputLength(node) {

    // Handle constant values

    if (typeof node === 'number') return 1;
    if (Array.isArray(node)) return node.length;

    // Handle materials

    var output = node.chunk.output;
    if (typeof output === 'number') return output;

    // Handle polymorphic output

    var key = node.inputs.map(function recurse(node) {
        return _getOutputLength(node);
    }).join(',');

    return output[key];
}

// Helper function to run replace inputs and texture tags with
// correct glsl.
function _processGLSL(str, inputs, textureSlot) {
    return str
        .replace(/%\d/g, function (s) {
            return _makeLabel(inputs[s[1]-1]);
        })
        .replace(/\$TEXTURE/, 'u_textures[' + textureSlot + ']');
}

// Helper function used to create glsl definition of the
// input material node.
function _makeLabel (n) {
    if (Array.isArray(n)) return _arrayToVec(n);
    if (typeof n === 'object') return 'fa_' + (n._id);
    else return n.toFixed(6);
}

// Helper to copy the properties of an object onto another object.
function _extend (a, b) {
	for (var k in b) a[k] = b[k];
}

// Helper to create glsl vector representation of a javascript array.
function _arrayToVec(array) {
    var len = array.length;
    return 'vec' + len + '(' + array.join(',')  + ')';
}

module.exports = compileMaterial;

},{}],40:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

'use strict';

// Generates a checkerboard pattern to be used as a placeholder texture while an
// image loads over the network.
function createCheckerBoard() {
    var context = document.createElement('canvas').getContext('2d');
    context.canvas.width = context.canvas.height = 128;
    for (var y = 0; y < context.canvas.height; y += 16) {
        for (var x = 0; x < context.canvas.width; x += 16) {
            context.fillStyle = (x ^ y) & 16 ? '#FFF' : '#DDD';
            context.fillRect(x, y, 16, 16);
        }
    }

    return context.canvas;
}

module.exports = createCheckerBoard;

},{}],41:[function(require,module,exports){
/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 Famous Industries Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
'use strict';

var radixBits = 11,
    maxRadix = 1 << (radixBits),
    radixMask = maxRadix - 1,
    buckets = new Array(maxRadix * Math.ceil(64 / radixBits)),
    msbMask = 1 << ((32 - 1) % radixBits),
    lastMask = (msbMask << 1) - 1,
    passCount = ((32 / radixBits) + 0.999999999999999) | 0,
    maxOffset = maxRadix * (passCount - 1),
    normalizer = Math.pow(20, 6);

var buffer = new ArrayBuffer(4);
var floatView = new Float32Array(buffer, 0, 1);
var intView = new Int32Array(buffer, 0, 1);

// comparator pulls relevant sorting keys out of mesh
function comp(list, registry, i) {
    var key = list[i];
    var item = registry[key];
    return (item.depth ? item.depth : registry[key].uniformValues[1][14]) + normalizer;
}

//mutator function records mesh's place in previous pass
function mutator(list, registry, i, value) {
    var key = list[i];
    registry[key].depth = intToFloat(value) - normalizer;
    return key;
}

//clean function removes mutator function's record
function clean(list, registry, i) {
    registry[list[i]].depth = null;
}

//converts a javascript float to a 32bit integer using an array buffer
//of size one
function floatToInt(k) {
    floatView[0] = k;
    return intView[0];
}
//converts a 32 bit integer to a regular javascript float using an array buffer
//of size one
function intToFloat(k) {
    intView[0] = k;
    return floatView[0];
}

//sorts a list of mesh IDs according to their z-depth
function radixSort(list, registry) {
    var pass = 0;
    var out = [];

    var i, j, k, n, div, offset, swap, id, sum, tsum, size;

    passCount = ((32 / radixBits) + 0.999999999999999) | 0;

    for (i = 0, n = maxRadix * passCount; i < n; i++) buckets[i] = 0;

    for (i = 0, n = list.length; i < n; i++) {
        div = floatToInt(comp(list, registry, i));
        div ^= div >> 31 | 0x80000000;
        for (j = 0, k = 0; j < maxOffset; j += maxRadix, k += radixBits) {
            buckets[j + (div >>> k & radixMask)]++;
        }
        buckets[j + (div >>> k & lastMask)]++;
    }

    for (j = 0; j <= maxOffset; j += maxRadix) {
        for (id = j, sum = 0; id < j + maxRadix; id++) {
            tsum = buckets[id] + sum;
            buckets[id] = sum - 1;
            sum = tsum;
        }
    }
    if (--passCount) {
        for (i = 0, n = list.length; i < n; i++) {
            div = floatToInt(comp(list, registry, i));
            out[++buckets[div & radixMask]] = mutator(list, registry, i, div ^= div >> 31 | 0x80000000);
        }
        
        swap = out;
        out = list;
        list = swap;
        while (++pass < passCount) {
            for (i = 0, n = list.length, offset = pass * maxRadix, size = pass * radixBits; i < n; i++) {
                div = floatToInt(comp(list, registry, i));
                out[++buckets[offset + (div >>> size & radixMask)]] = list[i];
            }

            swap = out;
            out = list;
            list = swap;
        }
    }

    for (i = 0, n = list.length, offset = pass * maxRadix, size = pass * radixBits; i < n; i++) {
        div = floatToInt(comp(list, registry, i));
        out[++buckets[offset + (div >>> size & lastMask)]] = mutator(list, registry, i, div ^ (~div >> 31 | 0x80000000));
        clean(list, registry, i);
    }

    return out;
}

module.exports = radixSort;

},{}],42:[function(require,module,exports){
"use strict";
var glslify = require("glslify");
var shaders = require("glslify/simple-adapter.js")("\n#define GLSLIFY 1\n\nmat3 a_x_getNormalMatrix(in mat4 t) {\n  mat3 matNorm;\n  mat4 a = t;\n  float a00 = a[0][0], a01 = a[0][1], a02 = a[0][2], a03 = a[0][3], a10 = a[1][0], a11 = a[1][1], a12 = a[1][2], a13 = a[1][3], a20 = a[2][0], a21 = a[2][1], a22 = a[2][2], a23 = a[2][3], a30 = a[3][0], a31 = a[3][1], a32 = a[3][2], a33 = a[3][3], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n  det = 1.0 / det;\n  matNorm[0][0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;\n  matNorm[0][1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;\n  matNorm[0][2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;\n  matNorm[1][0] = (a02 * b10 - a01 * b11 - a03 * b09) * det;\n  matNorm[1][1] = (a00 * b11 - a02 * b08 + a03 * b07) * det;\n  matNorm[1][2] = (a01 * b08 - a00 * b10 - a03 * b06) * det;\n  matNorm[2][0] = (a31 * b05 - a32 * b04 + a33 * b03) * det;\n  matNorm[2][1] = (a32 * b02 - a30 * b05 - a33 * b01) * det;\n  matNorm[2][2] = (a30 * b04 - a31 * b02 + a33 * b00) * det;\n  return matNorm;\n}\nfloat b_x_inverse(float m) {\n  return 1.0 / m;\n}\nmat2 b_x_inverse(mat2 m) {\n  return mat2(m[1][1], -m[0][1], -m[1][0], m[0][0]) / (m[0][0] * m[1][1] - m[0][1] * m[1][0]);\n}\nmat3 b_x_inverse(mat3 m) {\n  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];\n  float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];\n  float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];\n  float b01 = a22 * a11 - a12 * a21;\n  float b11 = -a22 * a10 + a12 * a20;\n  float b21 = a21 * a10 - a11 * a20;\n  float det = a00 * b01 + a01 * b11 + a02 * b21;\n  return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11), b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10), b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;\n}\nmat4 b_x_inverse(mat4 m) {\n  float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3], a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3], a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3], a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3], b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32, det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n  return mat4(a11 * b11 - a12 * b10 + a13 * b09, a02 * b10 - a01 * b11 - a03 * b09, a31 * b05 - a32 * b04 + a33 * b03, a22 * b04 - a21 * b05 - a23 * b03, a12 * b08 - a10 * b11 - a13 * b07, a00 * b11 - a02 * b08 + a03 * b07, a32 * b02 - a30 * b05 - a33 * b01, a20 * b05 - a22 * b02 + a23 * b01, a10 * b10 - a11 * b08 + a13 * b06, a01 * b08 - a00 * b10 - a03 * b06, a30 * b04 - a31 * b02 + a33 * b00, a21 * b02 - a20 * b04 - a23 * b00, a11 * b07 - a10 * b09 - a12 * b06, a00 * b09 - a01 * b07 + a02 * b06, a31 * b01 - a30 * b03 - a32 * b00, a20 * b03 - a21 * b01 + a22 * b00) / det;\n}\nfloat c_x_transpose(float m) {\n  return m;\n}\nmat2 c_x_transpose(mat2 m) {\n  return mat2(m[0][0], m[1][0], m[0][1], m[1][1]);\n}\nmat3 c_x_transpose(mat3 m) {\n  return mat3(m[0][0], m[1][0], m[2][0], m[0][1], m[1][1], m[2][1], m[0][2], m[1][2], m[2][2]);\n}\nmat4 c_x_transpose(mat4 m) {\n  return mat4(m[0][0], m[1][0], m[2][0], m[3][0], m[0][1], m[1][1], m[2][1], m[3][1], m[0][2], m[1][2], m[2][2], m[3][2], m[0][3], m[1][3], m[2][3], m[3][3]);\n}\nvec4 applyTransform(vec4 pos) {\n  mat4 MVMatrix = u_view * u_transform;\n  pos.x += 1.0;\n  pos.y -= 1.0;\n  pos.xyz *= u_size * 0.5;\n  pos.y *= -1.0;\n  v_position = (MVMatrix * pos).xyz;\n  v_eyeVector = (u_resolution * 0.5) - v_position;\n  pos = u_perspective * MVMatrix * pos;\n  return pos;\n}\n#vert_definitions\n\nvec3 calculateOffset(vec3 ID) {\n  \n  #vert_applications\n  return vec3(0.0);\n}\nvoid main() {\n  v_textureCoordinate = a_texCoord;\n  vec3 invertedNormals = a_normals + (u_normals.x < 0.0 ? calculateOffset(u_normals) * 2.0 - 1.0 : vec3(0.0));\n  invertedNormals.y *= -1.0;\n  v_normal = c_x_transpose(mat3(b_x_inverse(u_transform))) * invertedNormals;\n  vec3 offsetPos = a_pos + calculateOffset(u_positionOffset);\n  gl_Position = applyTransform(vec4(offsetPos, 1.0));\n}", "\n#define GLSLIFY 1\n\n#float_definitions\n\nfloat a_x_applyMaterial(float ID) {\n  \n  #float_applications\n  return 1.;\n}\n#vec3_definitions\n\nvec3 a_x_applyMaterial(vec3 ID) {\n  \n  #vec3_applications\n  return vec3(0);\n}\n#vec4_definitions\n\nvec4 a_x_applyMaterial(vec4 ID) {\n  \n  #vec4_applications\n  return vec4(0);\n}\nvec4 b_x_applyLight(in vec4 baseColor, in vec3 normal, in vec4 glossiness) {\n  int numLights = int(u_numLights);\n  vec3 ambientColor = u_ambientLight * baseColor.rgb;\n  vec3 eyeVector = normalize(v_eyeVector);\n  vec3 diffuse = vec3(0.0);\n  bool hasGlossiness = glossiness.a > 0.0;\n  bool hasSpecularColor = length(glossiness.rgb) > 0.0;\n  for(int i = 0; i < 4; i++) {\n    if(i >= numLights)\n      break;\n    vec3 lightDirection = normalize(u_lightPosition[i].xyz - v_position);\n    float lambertian = max(dot(lightDirection, normal), 0.0);\n    if(lambertian > 0.0) {\n      diffuse += u_lightColor[i].rgb * baseColor.rgb * lambertian;\n      if(hasGlossiness) {\n        vec3 halfVector = normalize(lightDirection + eyeVector);\n        float specularWeight = pow(max(dot(halfVector, normal), 0.0), glossiness.a);\n        vec3 specularColor = hasSpecularColor ? glossiness.rgb : u_lightColor[i].rgb;\n        diffuse += specularColor * specularWeight * lambertian;\n      }\n    }\n  }\n  return vec4(ambientColor + diffuse, baseColor.a);\n}\nvoid main() {\n  vec4 material = u_baseColor.r >= 0.0 ? u_baseColor : a_x_applyMaterial(u_baseColor);\n  bool lightsEnabled = (u_flatShading == 0.0) && (u_numLights > 0.0 || length(u_ambientLight) > 0.0);\n  vec3 normal = normalize(v_normal);\n  vec4 glossiness = u_glossiness.x < 0.0 ? a_x_applyMaterial(u_glossiness) : u_glossiness;\n  vec4 color = lightsEnabled ? b_x_applyLight(material, normalize(v_normal), glossiness) : material;\n  gl_FragColor = color;\n  gl_FragColor.a *= u_opacity;\n}", [], []);
module.exports = shaders;
},{"glslify":17,"glslify/simple-adapter.js":18}],43:[function(require,module,exports){
'use strict';

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

module.exports = SocketChannel;

},{}],44:[function(require,module,exports){
'use strict';

var RequestAnimationFrameLoop = require('famous/render-loops/RequestAnimationFrameLoop');

function SocketLoop(host) {
    this._updateables = [];
    this._socket = io.connect(host);

    var _this = this;
    this._socket.on('frame', function (data) {
        for (var i = 0; i < _this._updateables.length; i++) _this._updateables[i].update(data.timestamp);
    });
}

SocketLoop.prototype.update = function (updateable) {
    this._updateables.push(updateable);
};

SocketLoop.prototype.noLongerUpdate = function (updateable) {
    var index = this._updateables.indexOf(updateable);
    if (index !== -1) this._updateables.splice(index, 1);
};

SocketLoop.prototype.start = function () {};
SocketLoop.prototype.stop = function () {};

module.exports = SocketLoop;

},{"famous/render-loops/RequestAnimationFrameLoop":21}],45:[function(require,module,exports){
'use strict';

var Compositor = require('famous/renderers/Compositor');
var UIManager = require('famous/renderers/UIManager');
var SocketLoop = require('./SocketLoop');
var SocketChannel = require('./SocketChannel');

// Boilerplate
new UIManager(new SocketChannel('http://localhost:1620'), new Compositor(), new SocketLoop('http://localhost:1621'));

},{"./SocketChannel":43,"./SocketLoop":44,"famous/renderers/Compositor":22,"famous/renderers/UIManager":24}]},{},[45])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvbXBvbmVudHMvQ2FtZXJhLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL0RPTVJlbmRlcmVyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL0VsZW1lbnRDYWNoZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9NYXRoLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL2V2ZW50cy9Db21wb3NpdGlvbkV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL2V2ZW50cy9FdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvRXZlbnRNYXAuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0ZvY3VzRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0lucHV0RXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0tleWJvYXJkRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL01vdXNlRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1RvdWNoRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1VJRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1doZWVsRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL21hdGgvVmVjMi5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvbWF0aC9WZWMzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9ub2RlX21vZHVsZXMvZ2xzbGlmeS9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9ub2RlX21vZHVsZXMvZ2xzbGlmeS9zaW1wbGUtYWRhcHRlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcG9seWZpbGxzL2FuaW1hdGlvbkZyYW1lLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9wb2x5ZmlsbHMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlci1sb29wcy9SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9yZW5kZXJlcnMvQ29tcG9zaXRvci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcmVuZGVyZXJzL0NvbnRleHQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlcmVycy9VSU1hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlcmVycy9pbmplY3QtY3NzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy91dGlsaXRpZXMvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3V0aWxpdGllcy9rZXlWYWx1ZVRvQXJyYXlzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy91dGlsaXRpZXMvdmVuZG9yUHJlZml4LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1nZW9tZXRyaWVzL0dlb21ldHJ5LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1nZW9tZXRyaWVzL0dlb21ldHJ5SGVscGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1nZW9tZXRyaWVzL3ByaW1pdGl2ZXMvUGxhbmUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9CdWZmZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9CdWZmZXJSZWdpc3RyeS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL0RlYnVnLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvUHJvZ3JhbS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL1RleHR1cmUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9UZXh0dXJlTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL1dlYkdMUmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9jb21waWxlTWF0ZXJpYWwuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9jcmVhdGVDaGVja2VyYm9hcmQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9yYWRpeFNvcnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXNoYWRlcnMvaW5kZXguanMiLCIvVXNlcnMvYWxleGFuZGVyZ3VnZWwvcGxhdGZvcm0vZW5naW5lLXNlZWQvc3JjL1NvY2tldENoYW5uZWwuanMiLCIvVXNlcnMvYWxleGFuZGVyZ3VnZWwvcGxhdGZvcm0vZW5naW5lLXNlZWQvc3JjL1NvY2tldExvb3AuanMiLCIvVXNlcnMvYWxleGFuZGVyZ3VnZWwvcGxhdGZvcm0vZW5naW5lLXNlZWQvc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3YwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBLFlBQVksQ0FBQzs7QUFFYixTQUFTLGFBQWEsQ0FBQyxJQUFJLEVBQUU7QUFDekIsUUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUVoQyxRQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDakIsUUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxPQUFPLEVBQUU7QUFDakQsYUFBSyxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztLQUMzQyxDQUFDLENBQUM7Q0FDTjs7QUFFRCxhQUFhLENBQUMsU0FBUyxDQUFDLFdBQVcsR0FBRyxVQUFVLE9BQU8sRUFBRTtBQUNyRCxRQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZELFdBQU8sSUFBSSxDQUFDO0NBQ2YsQ0FBQzs7QUFFRixNQUFNLENBQUMsT0FBTyxHQUFHLGFBQWEsQ0FBQzs7O0FDaEIvQixZQUFZLENBQUM7O0FBRWIsSUFBSSx5QkFBeUIsR0FBRyxPQUFPLENBQUMsK0NBQStDLENBQUMsQ0FBQzs7QUFFekYsU0FBUyxVQUFVLENBQUMsSUFBSSxFQUFFO0FBQ3RCLFFBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO0FBQ3ZCLFFBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQzs7QUFFaEMsUUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDO0FBQ2pCLFFBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxVQUFVLElBQUksRUFBRTtBQUNyQyxhQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQzlDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNwRCxDQUFDLENBQUM7Q0FDTjs7QUFFRCxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxVQUFTLFVBQVUsRUFBRTtBQUMvQyxRQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztDQUN0QyxDQUFDOztBQUVGLFVBQVUsQ0FBQyxTQUFTLENBQUMsY0FBYyxHQUFHLFVBQVMsVUFBVSxFQUFFO0FBQ3ZELFFBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2xELFFBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztDQUN4RCxDQUFDOztBQUVGLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxHQUFHLFlBQVcsRUFBRSxDQUFDO0FBQzNDLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLFlBQVcsRUFBRSxDQUFDOztBQUUxQyxNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQzs7O0FDM0I1QixZQUFZLENBQUM7O0FBRWIsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7QUFDeEQsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUM7QUFDdEQsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3pDLElBQUksYUFBYSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDOzs7QUFHL0MsSUFBSSxTQUFTLENBQ1QsSUFBSSxhQUFhLENBQUMsdUJBQXVCLENBQUMsRUFDMUMsSUFBSSxVQUFVLEVBQUUsRUFDaEIsSUFBSSxVQUFVLENBQUMsdUJBQXVCLENBQUMsQ0FDMUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQ2FtZXJhIGlzIGEgY29tcG9uZW50IHRoYXQgaXMgcmVzcG9uc2libGUgZm9yIHNlbmRpbmcgaW5mb3JtYXRpb24gdG8gdGhlIHJlbmRlcmVyIGFib3V0IHdoZXJlXG4gKiB0aGUgY2FtZXJhIGlzIGluIHRoZSBzY2VuZS4gIFRoaXMgYWxsb3dzIHRoZSB1c2VyIHRvIHNldCB0aGUgdHlwZSBvZiBwcm9qZWN0aW9uLCB0aGUgZm9jYWwgZGVwdGgsXG4gKiBhbmQgb3RoZXIgcHJvcGVydGllcyB0byBhZGp1c3QgdGhlIHdheSB0aGUgc2NlbmVzIGFyZSByZW5kZXJlZC5cbiAqXG4gKiBAY2xhc3MgQ2FtZXJhXG4gKlxuICogQHBhcmFtIHtOb2RlfSBub2RlIHRvIHdoaWNoIHRoZSBpbnN0YW5jZSBvZiBDYW1lcmEgd2lsbCBiZSBhIGNvbXBvbmVudCBvZlxuICovXG5mdW5jdGlvbiBDYW1lcmEobm9kZSkge1xuICAgIHRoaXMuX25vZGUgPSBub2RlO1xuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OO1xuICAgIHRoaXMuX2ZvY2FsRGVwdGggPSAwO1xuICAgIHRoaXMuX25lYXIgPSAwO1xuICAgIHRoaXMuX2ZhciA9IDA7XG4gICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IGZhbHNlO1xuICAgIHRoaXMuX2lkID0gbm9kZS5hZGRDb21wb25lbnQodGhpcyk7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybSA9IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKTtcbiAgICB0aGlzLl92aWV3RGlydHkgPSBmYWxzZTtcbiAgICB0aGlzLl9wZXJzcGVjdGl2ZURpcnR5ID0gZmFsc2U7XG4gICAgdGhpcy5zZXRGbGF0KCk7XG59XG5cbkNhbWVyYS5GUlVTVFVNX1BST0pFQ1RJT04gPSAwO1xuQ2FtZXJhLlBJTkhPTEVfUFJPSkVDVElPTiA9IDE7XG5DYW1lcmEuT1JUSE9HUkFQSElDX1BST0pFQ1RJT04gPSAyO1xuXG4vKipcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGNvbXBvbmVudFxuICovXG5DYW1lcmEucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuICdDYW1lcmEnO1xufTtcblxuLyoqXG4gKiBHZXRzIG9iamVjdCBjb250YWluaW5nIHNlcmlhbGl6ZWQgZGF0YSBmb3IgdGhlIGNvbXBvbmVudFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBzdGF0ZSBvZiB0aGUgY29tcG9uZW50XG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbiBnZXRWYWx1ZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBjb21wb25lbnQ6IHRoaXMudG9TdHJpbmcoKSxcbiAgICAgICAgcHJvamVjdGlvblR5cGU6IHRoaXMuX3Byb2plY3Rpb25UeXBlLFxuICAgICAgICBmb2NhbERlcHRoOiB0aGlzLl9mb2NhbERlcHRoLFxuICAgICAgICBuZWFyOiB0aGlzLl9uZWFyLFxuICAgICAgICBmYXI6IHRoaXMuX2ZhclxuICAgIH07XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY29tcG9uZW50cyBzdGF0ZSBiYXNlZCBvbiBzb21lIHNlcmlhbGl6ZWQgZGF0YVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc3RhdGUgYW4gb2JqZWN0IGRlZmluaW5nIHdoYXQgdGhlIHN0YXRlIG9mIHRoZSBjb21wb25lbnQgc2hvdWxkIGJlXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gc3RhdHVzIG9mIHRoZSBzZXRcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5zZXRWYWx1ZSA9IGZ1bmN0aW9uIHNldFZhbHVlKHN0YXRlKSB7XG4gICAgaWYgKHRoaXMudG9TdHJpbmcoKSA9PT0gc3RhdGUuY29tcG9uZW50KSB7XG4gICAgICAgIHRoaXMuc2V0KHN0YXRlLnByb2plY3Rpb25UeXBlLCBzdGF0ZS5mb2NhbERlcHRoLCBzdGF0ZS5uZWFyLCBzdGF0ZS5mYXIpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGludGVybmFscyBvZiB0aGUgY29tcG9uZW50XG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0eXBlIGFuIGlkIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHR5cGUgb2YgcHJvamVjdGlvbiB0byB1c2VcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aCB0aGUgZGVwdGggZm9yIHRoZSBwaW5ob2xlIHByb2plY3Rpb24gbW9kZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBuZWFyIHRoZSBkaXN0YW5jZSBvZiB0aGUgbmVhciBjbGlwcGluZyBwbGFuZSBmb3IgYSBmcnVzdHVtIHByb2plY3Rpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSBmYXIgdGhlIGRpc3RhbmNlIG9mIHRoZSBmYXIgY2xpcHBpbmcgcGxhbmUgZm9yIGEgZnJ1c3R1bSBwcm9qZWN0aW9uXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gc3RhdHVzIG9mIHRoZSBzZXRcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQodHlwZSwgZGVwdGgsIG5lYXIsIGZhcikge1xuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkge1xuICAgICAgICB0aGlzLl9ub2RlLnJlcXVlc3RVcGRhdGUodGhpcy5faWQpO1xuICAgICAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5fcHJvamVjdGlvblR5cGUgPSB0eXBlO1xuICAgIHRoaXMuX2ZvY2FsRGVwdGggPSBkZXB0aDtcbiAgICB0aGlzLl9uZWFyID0gbmVhcjtcbiAgICB0aGlzLl9mYXIgPSBmYXI7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY2FtZXJhIGRlcHRoIGZvciBhIHBpbmhvbGUgcHJvamVjdGlvbiBtb2RlbFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZGVwdGggdGhlIGRpc3RhbmNlIGJldHdlZW4gdGhlIENhbWVyYSBhbmQgdGhlIG9yaWdpblxuICpcbiAqIEByZXR1cm4ge0NhbWVyYX0gdGhpc1xuICovXG5DYW1lcmEucHJvdG90eXBlLnNldERlcHRoID0gZnVuY3Rpb24gc2V0RGVwdGgoZGVwdGgpIHtcbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5yZXF1ZXN0VXBkYXRlKHRoaXMuX2lkKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuX3BlcnNwZWN0aXZlRGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gQ2FtZXJhLlBJTkhPTEVfUFJPSkVDVElPTjtcbiAgICB0aGlzLl9mb2NhbERlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5fbmVhciA9IDA7XG4gICAgdGhpcy5fZmFyID0gMDtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXRzIG9iamVjdCBjb250YWluaW5nIHNlcmlhbGl6ZWQgZGF0YSBmb3IgdGhlIGNvbXBvbmVudFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbmVhciBkaXN0YW5jZSBmcm9tIHRoZSBuZWFyIGNsaXBwaW5nIHBsYW5lIHRvIHRoZSBjYW1lcmFcbiAqIEBwYXJhbSB7TnVtYmVyfSBmYXIgZGlzdGFuY2UgZnJvbSB0aGUgZmFyIGNsaXBwaW5nIHBsYW5lIHRvIHRoZSBjYW1lcmFcbiAqXG4gKiBAcmV0dXJuIHtDYW1lcmF9IHRoaXNcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5zZXRGcnVzdHVtID0gZnVuY3Rpb24gc2V0RnJ1c3R1bShuZWFyLCBmYXIpIHtcbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5yZXF1ZXN0VXBkYXRlKHRoaXMuX2lkKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5fcGVyc3BlY3RpdmVEaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fcHJvamVjdGlvblR5cGUgPSBDYW1lcmEuRlJVU1RVTV9QUk9KRUNUSU9OO1xuICAgIHRoaXMuX2ZvY2FsRGVwdGggPSAwO1xuICAgIHRoaXMuX25lYXIgPSBuZWFyO1xuICAgIHRoaXMuX2ZhciA9IGZhcjtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIENhbWVyYSB0byBoYXZlIG9ydGhvZ3JhcGhpYyBwcm9qZWN0aW9uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0NhbWVyYX0gdGhpc1xuICovXG5DYW1lcmEucHJvdG90eXBlLnNldEZsYXQgPSBmdW5jdGlvbiBzZXRGbGF0KCkge1xuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkge1xuICAgICAgICB0aGlzLl9ub2RlLnJlcXVlc3RVcGRhdGUodGhpcy5faWQpO1xuICAgICAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl9wcm9qZWN0aW9uVHlwZSA9IENhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTjtcbiAgICB0aGlzLl9mb2NhbERlcHRoID0gMDtcbiAgICB0aGlzLl9uZWFyID0gMDtcbiAgICB0aGlzLl9mYXIgPSAwO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFdoZW4gdGhlIG5vZGUgdGhpcyBjb21wb25lbnQgaXMgYXR0YWNoZWQgdG8gdXBkYXRlcywgdGhlIENhbWVyYSB3aWxsXG4gKiBzZW5kIG5ldyBjYW1lcmEgaW5mb3JtYXRpb24gdG8gdGhlIENvbXBvc2l0b3IgdG8gdXBkYXRlIHRoZSByZW5kZXJpbmdcbiAqIG9mIHRoZSBzY2VuZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5vblVwZGF0ZSA9IGZ1bmN0aW9uIG9uVXBkYXRlKCkge1xuICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSBmYWxzZTtcblxuICAgIHZhciBwYXRoID0gdGhpcy5fbm9kZS5nZXRMb2NhdGlvbigpO1xuXG4gICAgdGhpcy5fbm9kZVxuICAgICAgICAuc2VuZERyYXdDb21tYW5kKCdXSVRIJylcbiAgICAgICAgLnNlbmREcmF3Q29tbWFuZChwYXRoKTtcblxuICAgIGlmICh0aGlzLl9wZXJzcGVjdGl2ZURpcnR5KSB7XG4gICAgICAgIHRoaXMuX3BlcnNwZWN0aXZlRGlydHkgPSBmYWxzZTtcblxuICAgICAgICBzd2l0Y2ggKHRoaXMuX3Byb2plY3Rpb25UeXBlKSB7XG4gICAgICAgICAgICBjYXNlIENhbWVyYS5GUlVTVFVNX1BST0pFQ1RJT046XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQoJ0ZSVVNUVU1fUFJPSkVDVElPTicpO1xuICAgICAgICAgICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX25lYXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX2Zhcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIENhbWVyYS5QSU5IT0xFX1BST0pFQ1RJT046XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQoJ1BJTkhPTEVfUFJPSkVDVElPTicpO1xuICAgICAgICAgICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX2ZvY2FsRGVwdGgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBDYW1lcmEuT1JUSE9HUkFQSElDX1BST0pFQ1RJT046XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQoJ09SVEhPR1JBUEhJQ19QUk9KRUNUSU9OJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fdmlld0RpcnR5KSB7XG4gICAgICAgIHRoaXMuX3ZpZXdEaXJ0eSA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKCdDSEFOR0VfVklFV19UUkFOU0ZPUk0nKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVswXSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMV0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzJdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVszXSk7XG5cbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVs0XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNV0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzZdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVs3XSk7XG5cbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVs4XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bOV0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzEwXSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTFdKTtcblxuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzEyXSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTNdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxNF0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzE1XSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBXaGVuIHRoZSB0cmFuc2Zvcm0gb2YgdGhlIG5vZGUgdGhpcyBjb21wb25lbnQgaXMgYXR0YWNoZWQgdG9cbiAqIGNoYW5nZXMsIGhhdmUgdGhlIENhbWVyYSB1cGRhdGUgaXRzIHByb2plY3Rpb24gbWF0cml4IGFuZFxuICogaWYgbmVlZGVkLCBmbGFnIHRvIG5vZGUgdG8gdXBkYXRlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB0cmFuc2Zvcm0gYW4gYXJyYXkgZGVub3RpbmcgdGhlIHRyYW5zZm9ybSBtYXRyaXggb2YgdGhlIG5vZGVcbiAqXG4gKiBAcmV0dXJuIHtDYW1lcmF9IHRoaXNcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5vblRyYW5zZm9ybUNoYW5nZSA9IGZ1bmN0aW9uIG9uVHJhbnNmb3JtQ2hhbmdlKHRyYW5zZm9ybSkge1xuICAgIHZhciBhID0gdHJhbnNmb3JtO1xuICAgIHRoaXMuX3ZpZXdEaXJ0eSA9IHRydWU7XG5cbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5yZXF1ZXN0VXBkYXRlKHRoaXMuX2lkKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgdmFyIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgYTEwID0gYVs0XSwgYTExID0gYVs1XSwgYTEyID0gYVs2XSwgYTEzID0gYVs3XSxcbiAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV0sXG5cbiAgICBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTAsXG4gICAgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLFxuICAgIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCxcbiAgICBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTEsXG4gICAgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLFxuICAgIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMixcbiAgICBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzAsXG4gICAgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLFxuICAgIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCxcbiAgICBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzEsXG4gICAgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLFxuICAgIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMixcblxuICAgIGRldCA9IDEvKGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNik7XG5cbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzBdID0gKGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMl0gPSAoYTMxICogYjA1IC0gYTMyICogYjA0ICsgYTMzICogYjAzKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzNdID0gKGEyMiAqIGIwNCAtIGEyMSAqIGIwNSAtIGEyMyAqIGIwMykgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs0XSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNV0gPSAoYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzZdID0gKGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs3XSA9IChhMjAgKiBiMDUgLSBhMjIgKiBiMDIgKyBhMjMgKiBiMDEpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bOF0gPSAoYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzldID0gKGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNikgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxMF0gPSAoYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzExXSA9IChhMjEgKiBiMDIgLSBhMjAgKiBiMDQgLSBhMjMgKiBiMDApICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTJdID0gKGExMSAqIGIwNyAtIGExMCAqIGIwOSAtIGExMiAqIGIwNikgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxM10gPSAoYTAwICogYjA5IC0gYTAxICogYjA3ICsgYTAyICogYjA2KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzE0XSA9IChhMzEgKiBiMDEgLSBhMzAgKiBiMDMgLSBhMzIgKiBiMDApICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTVdID0gKGEyMCAqIGIwMyAtIGEyMSAqIGIwMSArIGEyMiAqIGIwMCkgKiBkZXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbWVyYTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEVsZW1lbnRDYWNoZSA9IHJlcXVpcmUoJy4vRWxlbWVudENhY2hlJyk7XG52YXIgbWF0aCA9IHJlcXVpcmUoJy4vTWF0aCcpO1xudmFyIHZlbmRvclByZWZpeCA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy92ZW5kb3JQcmVmaXgnKTtcbnZhciBldmVudE1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL0V2ZW50TWFwJyk7XG5cbnZhciBUUkFOU0ZPUk0gPSBudWxsO1xuXG4vKipcbiAqIERPTVJlbmRlcmVyIGlzIGEgY2xhc3MgcmVzcG9uc2libGUgZm9yIGFkZGluZyBlbGVtZW50c1xuICogdG8gdGhlIERPTSBhbmQgd3JpdGluZyB0byB0aG9zZSBlbGVtZW50cy5cbiAqIFRoZXJlIGlzIGEgRE9NUmVuZGVyZXIgcGVyIGNvbnRleHQsIHJlcHJlc2VudGVkIGFzIGFuXG4gKiBlbGVtZW50IGFuZCBhIHNlbGVjdG9yLiBJdCBpcyBpbnN0YW50aWF0ZWQgaW4gdGhlXG4gKiBjb250ZXh0IGNsYXNzLlxuICpcbiAqIEBjbGFzcyBET01SZW5kZXJlclxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgYW4gZWxlbWVudC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvciB0aGUgc2VsZWN0b3Igb2YgdGhlIGVsZW1lbnQuXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgdGhlIGNvbXBvc2l0b3IgY29udHJvbGxpbmcgdGhlIHJlbmRlcmVyXG4gKi9cbmZ1bmN0aW9uIERPTVJlbmRlcmVyIChlbGVtZW50LCBzZWxlY3RvciwgY29tcG9zaXRvcikge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2ZhbW91cy1kb20tcmVuZGVyZXInKTtcblxuICAgIFRSQU5TRk9STSA9IFRSQU5TRk9STSB8fCB2ZW5kb3JQcmVmaXgoJ3RyYW5zZm9ybScpO1xuICAgIHRoaXMuX2NvbXBvc2l0b3IgPSBjb21wb3NpdG9yOyAvLyBhIHJlZmVyZW5jZSB0byB0aGUgY29tcG9zaXRvclxuXG4gICAgdGhpcy5fdGFyZ2V0ID0gbnVsbDsgLy8gYSByZWdpc3RlciBmb3IgaG9sZGluZyB0aGUgY3VycmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgdGhhdCB0aGUgUmVuZGVyZXIgaXMgb3BlcmF0aW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBvblxuXG4gICAgdGhpcy5fcGFyZW50ID0gbnVsbDsgLy8gYSByZWdpc3RlciBmb3IgaG9sZGluZyB0aGUgcGFyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gb2YgdGhlIHRhcmdldFxuXG4gICAgdGhpcy5fcGF0aCA9IG51bGw7IC8vIGEgcmVnaXN0ZXIgZm9yIGhvbGRpbmcgdGhlIHBhdGggb2YgdGhlIHRhcmdldFxuICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIHJlZ2lzdGVyIG11c3QgYmUgc2V0IGZpcnN0LCBhbmQgdGhlblxuICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGlsZHJlbiwgdGFyZ2V0LCBhbmQgcGFyZW50IGFyZSBhbGwgbG9va2VkXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHVwIGZyb20gdGhhdC5cblxuICAgIHRoaXMuX2NoaWxkcmVuID0gW107IC8vIGEgcmVnaXN0ZXIgZm9yIGhvbGRpbmcgdGhlIGNoaWxkcmVuIG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGN1cnJlbnQgdGFyZ2V0LlxuXG4gICAgdGhpcy5fcm9vdCA9IG5ldyBFbGVtZW50Q2FjaGUoZWxlbWVudCwgc2VsZWN0b3IpOyAvLyB0aGUgcm9vdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb2YgdGhlIGRvbSB0cmVlIHRoYXQgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVuZGVyZXIgaXMgcmVzcG9uc2libGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvclxuXG4gICAgdGhpcy5fYm91bmRUcmlnZ2VyRXZlbnQgPSBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLl90cmlnZ2VyRXZlbnQoZXYpO1xuICAgIH07XG5cbiAgICB0aGlzLl9zZWxlY3RvciA9IHNlbGVjdG9yO1xuXG4gICAgdGhpcy5fZWxlbWVudHMgPSB7fTtcblxuICAgIHRoaXMuX2VsZW1lbnRzW3NlbGVjdG9yXSA9IHRoaXMuX3Jvb3Q7XG5cbiAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuICAgIHRoaXMuX1ZQdHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuXG4gICAgdGhpcy5fc2l6ZSA9IFtudWxsLCBudWxsXTtcbn1cblxuXG4vKipcbiAqIEF0dGFjaGVzIGFuIEV2ZW50TGlzdGVuZXIgdG8gdGhlIGVsZW1lbnQgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYXNzZWQgaW4gcGF0aC5cbiAqIFByZXZlbnRzIHRoZSBkZWZhdWx0IGJyb3dzZXIgYWN0aW9uIG9uIGFsbCBzdWJzZXF1ZW50IGV2ZW50cyBpZlxuICogYHByZXZlbnREZWZhdWx0YCBpcyB0cnV0aHkuXG4gKiBBbGwgaW5jb21pbmcgZXZlbnRzIHdpbGwgYmUgZm9yd2FyZGVkIHRvIHRoZSBjb21wb3NpdG9yIGJ5IGludm9raW5nIHRoZVxuICogYHNlbmRFdmVudGAgbWV0aG9kLlxuICogRGVsZWdhdGVzIGV2ZW50cyBpZiBwb3NzaWJsZSBieSBhdHRhY2hpbmcgdGhlIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBET00gZXZlbnQgdHlwZSAoZS5nLiBjbGljaywgbW91c2VvdmVyKS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJldmVudERlZmF1bHQgV2hldGhlciBvciBub3QgdGhlIGRlZmF1bHQgYnJvd3NlciBhY3Rpb24gc2hvdWxkIGJlIHByZXZlbnRlZC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24gc3Vic2NyaWJlKHR5cGUsIHByZXZlbnREZWZhdWx0KSB7XG4gICAgLy8gVE9ETyBwcmV2ZW50RGVmYXVsdCBzaG91bGQgYmUgYSBzZXBhcmF0ZSBjb21tYW5kXG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICB0aGlzLl90YXJnZXQucHJldmVudERlZmF1bHRbdHlwZV0gPSBwcmV2ZW50RGVmYXVsdDtcbiAgICB0aGlzLl90YXJnZXQuc3Vic2NyaWJlW3R5cGVdID0gdHJ1ZTtcblxuICAgIGlmIChcbiAgICAgICAgIXRoaXMuX3RhcmdldC5saXN0ZW5lcnNbdHlwZV0gJiYgIXRoaXMuX3Jvb3QubGlzdGVuZXJzW3R5cGVdXG4gICAgKSB7XG4gICAgICAgIHZhciB0YXJnZXQgPSBldmVudE1hcFt0eXBlXVsxXSA/IHRoaXMuX3Jvb3QgOiB0aGlzLl90YXJnZXQ7XG4gICAgICAgIHRhcmdldC5saXN0ZW5lcnNbdHlwZV0gPSB0aGlzLl9ib3VuZFRyaWdnZXJFdmVudDtcbiAgICAgICAgdGFyZ2V0LmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCB0aGlzLl9ib3VuZFRyaWdnZXJFdmVudCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBGdW5jdGlvbiB0byBiZSBhZGRlZCB1c2luZyBgYWRkRXZlbnRMaXN0ZW5lcmAgdG8gdGhlIGNvcnJlc3BvbmRpbmdcbiAqIERPTUVsZW1lbnQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBET00gRXZlbnQgcGF5bG9hZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fdHJpZ2dlckV2ZW50ID0gZnVuY3Rpb24gX3RyaWdnZXJFdmVudChldikge1xuICAgIC8vIFVzZSBldi5wYXRoLCB3aGljaCBpcyBhbiBhcnJheSBvZiBFbGVtZW50cyAocG9seWZpbGxlZCBpZiBuZWVkZWQpLlxuICAgIHZhciBldlBhdGggPSBldi5wYXRoID8gZXYucGF0aCA6IF9nZXRQYXRoKGV2KTtcbiAgICAvLyBGaXJzdCBlbGVtZW50IGluIHRoZSBwYXRoIGlzIHRoZSBlbGVtZW50IG9uIHdoaWNoIHRoZSBldmVudCBoYXMgYWN0dWFsbHlcbiAgICAvLyBiZWVuIGVtaXR0ZWQuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBldlBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgLy8gU2tpcCBub2RlcyB0aGF0IGRvbid0IGhhdmUgYSBkYXRhc2V0IHByb3BlcnR5IG9yIGRhdGEtZmEtcGF0aFxuICAgICAgICAvLyBhdHRyaWJ1dGUuXG4gICAgICAgIGlmICghZXZQYXRoW2ldLmRhdGFzZXQpIGNvbnRpbnVlO1xuICAgICAgICB2YXIgcGF0aCA9IGV2UGF0aFtpXS5kYXRhc2V0LmZhUGF0aDtcbiAgICAgICAgaWYgKCFwYXRoKSBjb250aW51ZTtcblxuICAgICAgICAvLyBTdG9wIGZ1cnRoZXIgZXZlbnQgcHJvcG9nYXRpb24gYW5kIHBhdGggdHJhdmVyc2FsIGFzIHNvb24gYXMgdGhlXG4gICAgICAgIC8vIGZpcnN0IEVsZW1lbnRDYWNoZSBzdWJzY3JpYmluZyBmb3IgdGhlIGVtaXR0ZWQgZXZlbnQgaGFzIGJlZW4gZm91bmQuXG4gICAgICAgIGlmICh0aGlzLl9lbGVtZW50c1twYXRoXSAmJiB0aGlzLl9lbGVtZW50c1twYXRoXS5zdWJzY3JpYmVbZXYudHlwZV0pIHtcbiAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5IHByZXZlbnREZWZhdWx0LiBUaGlzIG5lZWRzIGZvcnRoZXIgY29uc2lkZXJhdGlvbiBhbmRcbiAgICAgICAgICAgIC8vIHNob3VsZCBiZSBvcHRpb25hbC4gRXZlbnR1YWxseSB0aGlzIHNob3VsZCBiZSBhIHNlcGFyYXRlIGNvbW1hbmQvXG4gICAgICAgICAgICAvLyBtZXRob2QuXG4gICAgICAgICAgICBpZiAodGhpcy5fZWxlbWVudHNbcGF0aF0ucHJldmVudERlZmF1bHRbZXYudHlwZV0pIHtcbiAgICAgICAgICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB2YXIgTm9ybWFsaXplZEV2ZW50Q29uc3RydWN0b3IgPSBldmVudE1hcFtldi50eXBlXVswXTtcblxuICAgICAgICAgICAgLy8gRmluYWxseSBzZW5kIHRoZSBldmVudCB0byB0aGUgV29ya2VyIFRocmVhZCB0aHJvdWdoIHRoZVxuICAgICAgICAgICAgLy8gY29tcG9zaXRvci5cbiAgICAgICAgICAgIHRoaXMuX2NvbXBvc2l0b3Iuc2VuZEV2ZW50KHBhdGgsIGV2LnR5cGUsIG5ldyBOb3JtYWxpemVkRXZlbnRDb25zdHJ1Y3RvcihldikpO1xuXG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbn07XG5cblxuLyoqXG4gKiBnZXRTaXplT2YgZ2V0cyB0aGUgZG9tIHNpemUgb2YgYSBwYXJ0aWN1bGFyIERPTSBlbGVtZW50LiAgVGhpcyBpc1xuICogbmVlZGVkIGZvciByZW5kZXIgc2l6aW5nIGluIHRoZSBzY2VuZSBncmFwaC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggcGF0aCBvZiB0aGUgTm9kZSBpbiB0aGUgc2NlbmUgZ3JhcGhcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gYSB2ZWMzIG9mIHRoZSBvZmZzZXQgc2l6ZSBvZiB0aGUgZG9tIGVsZW1lbnRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLmdldFNpemVPZiA9IGZ1bmN0aW9uIGdldFNpemVPZihwYXRoKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB0aGlzLl9lbGVtZW50c1twYXRoXTtcbiAgICBpZiAoIWVsZW1lbnQpIHJldHVybiBudWxsO1xuXG4gICAgdmFyIHJlcyA9IHt2YWw6IGVsZW1lbnQuc2l6ZX07XG4gICAgdGhpcy5fY29tcG9zaXRvci5zZW5kRXZlbnQocGF0aCwgJ3Jlc2l6ZScsIHJlcyk7XG4gICAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIF9nZXRQYXRoKGV2KSB7XG4gICAgLy8gVE9ETyBtb3ZlIGludG8gX3RyaWdnZXJFdmVudCwgYXZvaWQgb2JqZWN0IGFsbG9jYXRpb25cbiAgICB2YXIgcGF0aCA9IFtdO1xuICAgIHZhciBub2RlID0gZXYudGFyZ2V0O1xuICAgIHdoaWxlIChub2RlICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgICAgIHBhdGgucHVzaChub2RlKTtcbiAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIHBhdGg7XG59XG5cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHRoZSBzaXplIG9mIHRoZSBjb250ZXh0IGJ5IHF1ZXJ5aW5nIHRoZSBET00gZm9yIGBvZmZzZXRXaWR0aGAgYW5kXG4gKiBgb2Zmc2V0SGVpZ2h0YC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7QXJyYXl9IE9mZnNldCBzaXplLlxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZ2V0U2l6ZSA9IGZ1bmN0aW9uIGdldFNpemUoKSB7XG4gICAgdGhpcy5fc2l6ZVswXSA9IHRoaXMuX3Jvb3QuZWxlbWVudC5vZmZzZXRXaWR0aDtcbiAgICB0aGlzLl9zaXplWzFdID0gdGhpcy5fcm9vdC5lbGVtZW50Lm9mZnNldEhlaWdodDtcbiAgICByZXR1cm4gdGhpcy5fc2l6ZTtcbn07XG5cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fZ2V0U2l6ZSA9IERPTVJlbmRlcmVyLnByb3RvdHlwZS5nZXRTaXplO1xuXG5cbi8qKlxuICogRXhlY3V0ZXMgdGhlIHJldHJpZXZlZCBkcmF3IGNvbW1hbmRzLiBEcmF3IGNvbW1hbmRzIG9ubHkgcmVmZXIgdG8gdGhlXG4gKiBjcm9zcy1icm93c2VyIG5vcm1hbGl6ZWQgYHRyYW5zZm9ybWAgcHJvcGVydHkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZW5kZXJTdGF0ZSBkZXNjcmlwdGlvblxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gZHJhdyhyZW5kZXJTdGF0ZSkge1xuICAgIGlmIChyZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5KSB7XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVEaXJ0eSA9IHRydWU7XG5cbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVswXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzBdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzFdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMV07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMl0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsyXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVszXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzNdO1xuXG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNF0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs0XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs1XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzVdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzZdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNl07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bN10gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs3XTtcblxuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzhdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bOF07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bOV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs5XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMF0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMF07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTFdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTFdO1xuXG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTJdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTJdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEzXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEzXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNF0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNF07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTVdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTVdO1xuICAgIH1cblxuICAgIGlmIChyZW5kZXJTdGF0ZS52aWV3RGlydHkgfHwgcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVEaXJ0eSkge1xuICAgICAgICBtYXRoLm11bHRpcGx5KHRoaXMuX1ZQdHJhbnNmb3JtLCB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtLCByZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtKTtcbiAgICAgICAgdGhpcy5fcm9vdC5lbGVtZW50LnN0eWxlW1RSQU5TRk9STV0gPSB0aGlzLl9zdHJpbmdpZnlNYXRyaXgodGhpcy5fVlB0cmFuc2Zvcm0pO1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgZnVuY3Rpb24gdXNlZCBmb3IgZW5zdXJpbmcgdGhhdCBhIHBhdGggaXMgY3VycmVudGx5IGxvYWRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fYXNzZXJ0UGF0aExvYWRlZCA9IGZ1bmN0aW9uIF9hc3NlclBhdGhMb2FkZWQoKSB7XG4gICAgaWYgKCF0aGlzLl9wYXRoKSB0aHJvdyBuZXcgRXJyb3IoJ3BhdGggbm90IGxvYWRlZCcpO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgZnVuY3Rpb24gdXNlZCBmb3IgZW5zdXJpbmcgdGhhdCBhIHBhcmVudCBpcyBjdXJyZW50bHkgbG9hZGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRQYXJlbnRMb2FkZWQgPSBmdW5jdGlvbiBfYXNzZXJ0UGFyZW50TG9hZGVkKCkge1xuICAgIGlmICghdGhpcy5fcGFyZW50KSB0aHJvdyBuZXcgRXJyb3IoJ3BhcmVudCBub3QgbG9hZGVkJyk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGNoaWxkcmVuIGFyZSBjdXJyZW50bHlcbiAqIGxvYWRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fYXNzZXJ0Q2hpbGRyZW5Mb2FkZWQgPSBmdW5jdGlvbiBfYXNzZXJ0Q2hpbGRyZW5Mb2FkZWQoKSB7XG4gICAgaWYgKCF0aGlzLl9jaGlsZHJlbikgdGhyb3cgbmV3IEVycm9yKCdjaGlsZHJlbiBub3QgbG9hZGVkJyk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGEgdGFyZ2V0IGlzIGN1cnJlbnRseSBsb2FkZWQuXG4gKlxuICogQG1ldGhvZCAgX2Fzc2VydFRhcmdldExvYWRlZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fYXNzZXJ0VGFyZ2V0TG9hZGVkID0gZnVuY3Rpb24gX2Fzc2VydFRhcmdldExvYWRlZCgpIHtcbiAgICBpZiAoIXRoaXMuX3RhcmdldCkgdGhyb3cgbmV3IEVycm9yKCdObyB0YXJnZXQgbG9hZGVkJyk7XG59O1xuXG4vKipcbiAqIEZpbmRzIGFuZCBzZXRzIHRoZSBwYXJlbnQgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgZWxlbWVudCAocGF0aCkuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHtFbGVtZW50Q2FjaGV9IFBhcmVudCBlbGVtZW50LlxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZmluZFBhcmVudCA9IGZ1bmN0aW9uIGZpbmRQYXJlbnQgKCkge1xuICAgIHRoaXMuX2Fzc2VydFBhdGhMb2FkZWQoKTtcblxuICAgIHZhciBwYXRoID0gdGhpcy5fcGF0aDtcbiAgICB2YXIgcGFyZW50O1xuXG4gICAgd2hpbGUgKCFwYXJlbnQgJiYgcGF0aC5sZW5ndGgpIHtcbiAgICAgICAgcGF0aCA9IHBhdGguc3Vic3RyaW5nKDAsIHBhdGgubGFzdEluZGV4T2YoJy8nKSk7XG4gICAgICAgIHBhcmVudCA9IHRoaXMuX2VsZW1lbnRzW3BhdGhdO1xuICAgIH1cbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gICAgcmV0dXJuIHBhcmVudDtcbn07XG5cblxuLyoqXG4gKiBGaW5kcyBhbGwgY2hpbGRyZW4gb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgZWxlbWVudC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IE91dHB1dC1BcnJheSB1c2VkIGZvciB3cml0aW5nIHRvIChzdWJzZXF1ZW50bHkgYXBwZW5kaW5nIGNoaWxkcmVuKVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBhcnJheSBvZiBjaGlsZHJlbiBlbGVtZW50c1xuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZmluZENoaWxkcmVuID0gZnVuY3Rpb24gZmluZENoaWxkcmVuKGFycmF5KSB7XG4gICAgLy8gVE9ETzogT3B0aW1pemUgbWUuXG4gICAgdGhpcy5fYXNzZXJ0UGF0aExvYWRlZCgpO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9wYXRoICsgJy8nO1xuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5fZWxlbWVudHMpO1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgbGVuO1xuICAgIGFycmF5ID0gYXJyYXkgPyBhcnJheSA6IHRoaXMuX2NoaWxkcmVuO1xuXG4gICAgdGhpcy5fY2hpbGRyZW4ubGVuZ3RoID0gMDtcblxuICAgIHdoaWxlIChpIDwga2V5cy5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGtleXNbaV0uaW5kZXhPZihwYXRoKSA9PT0gLTEgfHwga2V5c1tpXSA9PT0gcGF0aCkga2V5cy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGVsc2UgaSsrO1xuICAgIH1cbiAgICB2YXIgY3VycmVudFBhdGg7XG4gICAgdmFyIGogPSAwO1xuICAgIGZvciAoaSA9IDAgOyBpIDwga2V5cy5sZW5ndGggOyBpKyspIHtcbiAgICAgICAgY3VycmVudFBhdGggPSBrZXlzW2ldO1xuICAgICAgICBmb3IgKGogPSAwIDsgaiA8IGtleXMubGVuZ3RoIDsgaisrKSB7XG4gICAgICAgICAgICBpZiAoaSAhPT0gaiAmJiBrZXlzW2pdLmluZGV4T2YoY3VycmVudFBhdGgpICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIGtleXMuc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgIGktLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGkgPSAwLCBsZW4gPSBrZXlzLmxlbmd0aCA7IGkgPCBsZW4gOyBpKyspXG4gICAgICAgIGFycmF5W2ldID0gdGhpcy5fZWxlbWVudHNba2V5c1tpXV07XG5cbiAgICByZXR1cm4gYXJyYXk7XG59O1xuXG5cbi8qKlxuICogVXNlZCBmb3IgZGV0ZXJtaW5pbmcgdGhlIHRhcmdldCBsb2FkZWQgdW5kZXIgdGhlIGN1cnJlbnQgcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7RWxlbWVudENhY2hlfHVuZGVmaW5lZH0gRWxlbWVudCBsb2FkZWQgdW5kZXIgZGVmaW5lZCBwYXRoLlxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZmluZFRhcmdldCA9IGZ1bmN0aW9uIGZpbmRUYXJnZXQoKSB7XG4gICAgdGhpcy5fdGFyZ2V0ID0gdGhpcy5fZWxlbWVudHNbdGhpcy5fcGF0aF07XG4gICAgcmV0dXJuIHRoaXMuX3RhcmdldDtcbn07XG5cblxuLyoqXG4gKiBMb2FkcyB0aGUgcGFzc2VkIGluIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdG8gYmUgbG9hZGVkXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBMb2FkZWQgcGF0aFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUubG9hZFBhdGggPSBmdW5jdGlvbiBsb2FkUGF0aCAocGF0aCkge1xuICAgIHRoaXMuX3BhdGggPSBwYXRoO1xuICAgIHJldHVybiB0aGlzLl9wYXRoO1xufTtcblxuXG4vKipcbiAqIEluc2VydHMgYSBET01FbGVtZW50IGF0IHRoZSBjdXJyZW50bHkgbG9hZGVkIHBhdGgsIGFzc3VtaW5nIG5vIHRhcmdldCBpc1xuICogbG9hZGVkLiBPbmx5IG9uZSBET01FbGVtZW50IGNhbiBiZSBhc3NvY2lhdGVkIHdpdGggZWFjaCBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdGFnTmFtZSBUYWcgbmFtZSAoY2FwaXRhbGl6YXRpb24gd2lsbCBiZSBub3JtYWxpemVkKS5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuaW5zZXJ0RWwgPSBmdW5jdGlvbiBpbnNlcnRFbCAodGFnTmFtZSkge1xuICAgIGlmICghdGhpcy5fdGFyZ2V0IHx8XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSAhPT0gdGFnTmFtZS50b0xvd2VyQ2FzZSgpKSB7XG5cbiAgICAgICAgdGhpcy5maW5kUGFyZW50KCk7XG4gICAgICAgIHRoaXMuZmluZENoaWxkcmVuKCk7XG5cbiAgICAgICAgdGhpcy5fYXNzZXJ0UGFyZW50TG9hZGVkKCk7XG4gICAgICAgIHRoaXMuX2Fzc2VydENoaWxkcmVuTG9hZGVkKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3RhcmdldCkgdGhpcy5fcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5fdGFyZ2V0LmVsZW1lbnQpO1xuXG4gICAgICAgIHRoaXMuX3RhcmdldCA9IG5ldyBFbGVtZW50Q2FjaGUoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKSwgdGhpcy5fcGF0aCk7XG4gICAgICAgIHRoaXMuX3BhcmVudC5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuX3RhcmdldC5lbGVtZW50KTtcbiAgICAgICAgdGhpcy5fZWxlbWVudHNbdGhpcy5fcGF0aF0gPSB0aGlzLl90YXJnZXQ7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuX2NoaWxkcmVuLmxlbmd0aCA7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LmFwcGVuZENoaWxkKHRoaXMuX2NoaWxkcmVuW2ldLmVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG4vKipcbiAqIFNldHMgYSBwcm9wZXJ0eSBvbiB0aGUgY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIFByb3BlcnR5IG5hbWUgKGUuZy4gYmFja2dyb3VuZCwgY29sb3IsIGZvbnQpXG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsdWUgUHJvcHJ0eSB2YWx1ZSAoZS5nLiBibGFjaywgMjBweClcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc2V0UHJvcGVydHkgPSBmdW5jdGlvbiBzZXRQcm9wZXJ0eSAobmFtZSwgdmFsdWUpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcbiAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zdHlsZVtuYW1lXSA9IHZhbHVlO1xufTtcblxuXG4vKipcbiAqIFNldHMgdGhlIHNpemUgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICogUmVtb3ZlcyBhbnkgZXhwbGljaXQgc2l6aW5nIGNvbnN0cmFpbnRzIHdoZW4gcGFzc2VkIGluIGBmYWxzZWBcbiAqIChcInRydWUtc2l6aW5nXCIpLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcnxmYWxzZX0gd2lkdGggICBXaWR0aCB0byBiZSBzZXQuXG4gKiBAcGFyYW0ge051bWJlcnxmYWxzZX0gaGVpZ2h0ICBIZWlnaHQgdG8gYmUgc2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRTaXplID0gZnVuY3Rpb24gc2V0U2l6ZSAod2lkdGgsIGhlaWdodCkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuXG4gICAgdGhpcy5zZXRXaWR0aCh3aWR0aCk7XG4gICAgdGhpcy5zZXRIZWlnaHQoaGVpZ2h0KTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgd2lkdGggb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICogUmVtb3ZlcyBhbnkgZXhwbGljaXQgc2l6aW5nIGNvbnN0cmFpbnRzIHdoZW4gcGFzc2VkIGluIGBmYWxzZWBcbiAqIChcInRydWUtc2l6aW5nXCIpLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcnxmYWxzZX0gd2lkdGggV2lkdGggdG8gYmUgc2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRXaWR0aCA9IGZ1bmN0aW9uIHNldFdpZHRoKHdpZHRoKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICB2YXIgY29udGVudFdyYXBwZXIgPSB0aGlzLl90YXJnZXQuY29udGVudDtcblxuICAgIGlmICh3aWR0aCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0V2lkdGggPSB0cnVlO1xuICAgICAgICBpZiAoY29udGVudFdyYXBwZXIpIGNvbnRlbnRXcmFwcGVyLnN0eWxlLndpZHRoID0gJyc7XG4gICAgICAgIHdpZHRoID0gY29udGVudFdyYXBwZXIgPyBjb250ZW50V3JhcHBlci5vZmZzZXRXaWR0aCA6IDA7XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0V2lkdGggPSBmYWxzZTtcbiAgICAgICAgaWYgKGNvbnRlbnRXcmFwcGVyKSBjb250ZW50V3JhcHBlci5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgfVxuXG4gICAgdGhpcy5fdGFyZ2V0LnNpemVbMF0gPSB3aWR0aDtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgaGVpZ2h0IG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqIFJlbW92ZXMgYW55IGV4cGxpY2l0IHNpemluZyBjb25zdHJhaW50cyB3aGVuIHBhc3NlZCBpbiBgZmFsc2VgXG4gKiAoXCJ0cnVlLXNpemluZ1wiKS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8ZmFsc2V9IGhlaWdodCBIZWlnaHQgdG8gYmUgc2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbiBzZXRIZWlnaHQoaGVpZ2h0KSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICB2YXIgY29udGVudFdyYXBwZXIgPSB0aGlzLl90YXJnZXQuY29udGVudDtcblxuICAgIGlmIChoZWlnaHQgPT09IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdEhlaWdodCA9IHRydWU7XG4gICAgICAgIGlmIChjb250ZW50V3JhcHBlcikgY29udGVudFdyYXBwZXIuc3R5bGUuaGVpZ2h0ID0gJyc7XG4gICAgICAgIGhlaWdodCA9IGNvbnRlbnRXcmFwcGVyID8gY29udGVudFdyYXBwZXIub2Zmc2V0SGVpZ2h0IDogMDtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdEhlaWdodCA9IGZhbHNlO1xuICAgICAgICBpZiAoY29udGVudFdyYXBwZXIpIGNvbnRlbnRXcmFwcGVyLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgfVxuXG4gICAgdGhpcy5fdGFyZ2V0LnNpemVbMV0gPSBoZWlnaHQ7XG59O1xuXG4vKipcbiAqIFNldHMgYW4gYXR0cmlidXRlIG9uIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQXR0cmlidXRlIG5hbWUgKGUuZy4gaHJlZilcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSBBdHRyaWJ1dGUgdmFsdWUgKGUuZy4gaHR0cDovL2ZhbW91cy5vcmcpXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIHNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGBpbm5lckhUTUxgIGNvbnRlbnQgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29udGVudCBDb250ZW50IHRvIGJlIHNldCBhcyBgaW5uZXJIVE1MYFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gc2V0Q29udGVudChjb250ZW50KSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5maW5kQ2hpbGRyZW4oKTtcblxuICAgIGlmICghdGhpcy5fdGFyZ2V0LmNvbnRlbnQpIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmNvbnRlbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmNvbnRlbnQuY2xhc3NMaXN0LmFkZCgnZmFtb3VzLWRvbS1lbGVtZW50LWNvbnRlbnQnKTtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuaW5zZXJ0QmVmb3JlKFxuICAgICAgICAgICAgdGhpcy5fdGFyZ2V0LmNvbnRlbnQsXG4gICAgICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5maXJzdENoaWxkXG4gICAgICAgICk7XG4gICAgfVxuICAgIHRoaXMuX3RhcmdldC5jb250ZW50LmlubmVySFRNTCA9IGNvbnRlbnQ7XG5cbiAgICB0aGlzLnNldFNpemUoXG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdFdpZHRoID8gZmFsc2UgOiB0aGlzLl90YXJnZXQuc2l6ZVswXSxcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0SGVpZ2h0ID8gZmFsc2UgOiB0aGlzLl90YXJnZXQuc2l6ZVsxXVxuICAgICk7XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgcGFzc2VkIGluIHRyYW5zZm9ybSBtYXRyaXggKHdvcmxkIHNwYWNlKS4gSW52ZXJ0cyB0aGUgcGFyZW50J3Mgd29ybGRcbiAqIHRyYW5zZm9ybS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtGbG9hdDMyQXJyYXl9IHRyYW5zZm9ybSBUaGUgdHJhbnNmb3JtIGZvciB0aGUgbG9hZGVkIERPTSBFbGVtZW50IGluIHdvcmxkIHNwYWNlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldE1hdHJpeCA9IGZ1bmN0aW9uIHNldE1hdHJpeCh0cmFuc2Zvcm0pIHtcbiAgICAvLyBUT0RPIERvbid0IG11bHRpcGx5IG1hdHJpY3MgaW4gdGhlIGZpcnN0IHBsYWNlLlxuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuZmluZFBhcmVudCgpO1xuICAgIHZhciB3b3JsZFRyYW5zZm9ybSA9IHRoaXMuX3RhcmdldC53b3JsZFRyYW5zZm9ybTtcbiAgICB2YXIgY2hhbmdlZCA9IGZhbHNlO1xuXG4gICAgdmFyIGk7XG4gICAgdmFyIGxlbjtcblxuICAgIGlmICh0cmFuc2Zvcm0pXG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IDE2IDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgY2hhbmdlZCA9IGNoYW5nZWQgPyBjaGFuZ2VkIDogd29ybGRUcmFuc2Zvcm1baV0gPT09IHRyYW5zZm9ybVtpXTtcbiAgICAgICAgICAgIHdvcmxkVHJhbnNmb3JtW2ldID0gdHJhbnNmb3JtW2ldO1xuICAgICAgICB9XG4gICAgZWxzZSBjaGFuZ2VkID0gdHJ1ZTtcblxuICAgIGlmIChjaGFuZ2VkKSB7XG4gICAgICAgIG1hdGguaW52ZXJ0KHRoaXMuX3RhcmdldC5pbnZlcnRlZFBhcmVudCwgdGhpcy5fcGFyZW50LndvcmxkVHJhbnNmb3JtKTtcbiAgICAgICAgbWF0aC5tdWx0aXBseSh0aGlzLl90YXJnZXQuZmluYWxUcmFuc2Zvcm0sIHRoaXMuX3RhcmdldC5pbnZlcnRlZFBhcmVudCwgd29ybGRUcmFuc2Zvcm0pO1xuXG4gICAgICAgIC8vIFRPRE86IHRoaXMgaXMgYSB0ZW1wb3JhcnkgZml4IGZvciBkcmF3IGNvbW1hbmRzXG4gICAgICAgIC8vIGNvbWluZyBpbiBvdXQgb2Ygb3JkZXJcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gdGhpcy5maW5kQ2hpbGRyZW4oW10pO1xuICAgICAgICB2YXIgcHJldmlvdXNQYXRoID0gdGhpcy5fcGF0aDtcbiAgICAgICAgdmFyIHByZXZpb3VzVGFyZ2V0ID0gdGhpcy5fdGFyZ2V0O1xuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBjaGlsZHJlbi5sZW5ndGggOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLl90YXJnZXQgPSBjaGlsZHJlbltpXTtcbiAgICAgICAgICAgIHRoaXMuX3BhdGggPSB0aGlzLl90YXJnZXQucGF0aDtcbiAgICAgICAgICAgIHRoaXMuc2V0TWF0cml4KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fcGF0aCA9IHByZXZpb3VzUGF0aDtcbiAgICAgICAgdGhpcy5fdGFyZ2V0ID0gcHJldmlvdXNUYXJnZXQ7XG4gICAgfVxuXG4gICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGVbVFJBTlNGT1JNXSA9IHRoaXMuX3N0cmluZ2lmeU1hdHJpeCh0aGlzLl90YXJnZXQuZmluYWxUcmFuc2Zvcm0pO1xufTtcblxuXG4vKipcbiAqIEFkZHMgYSBjbGFzcyB0byB0aGUgY2xhc3NMaXN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBkb21DbGFzcyBDbGFzcyBuYW1lIHRvIGJlIGFkZGVkIHRvIHRoZSBjdXJyZW50IHRhcmdldC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuYWRkQ2xhc3MgPSBmdW5jdGlvbiBhZGRDbGFzcyhkb21DbGFzcykge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LmNsYXNzTGlzdC5hZGQoZG9tQ2xhc3MpO1xufTtcblxuXG4vKipcbiAqIFJlbW92ZXMgYSBjbGFzcyBmcm9tIHRoZSBjbGFzc0xpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBjdXJyZW50bHkgbG9hZGVkXG4gKiB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBkb21DbGFzcyBDbGFzcyBuYW1lIHRvIGJlIHJlbW92ZWQgZnJvbSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUucmVtb3ZlQ2xhc3MgPSBmdW5jdGlvbiByZW1vdmVDbGFzcyhkb21DbGFzcykge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoZG9tQ2xhc3MpO1xufTtcblxuXG4vKipcbiAqIFN0cmluZ2lmaWVzIHRoZSBwYXNzZWQgaW4gbWF0cml4IGZvciBzZXR0aW5nIHRoZSBgdHJhbnNmb3JtYCBwcm9wZXJ0eS5cbiAqXG4gKiBAbWV0aG9kICBfc3RyaW5naWZ5TWF0cml4XG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IG0gICAgTWF0cml4IGFzIGFuIGFycmF5IG9yIGFycmF5LWxpa2Ugb2JqZWN0LlxuICogQHJldHVybiB7U3RyaW5nfSAgICAgU3RyaW5naWZpZWQgbWF0cml4IGFzIGBtYXRyaXgzZGAtcHJvcGVydHkuXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fc3RyaW5naWZ5TWF0cml4ID0gZnVuY3Rpb24gX3N0cmluZ2lmeU1hdHJpeChtKSB7XG4gICAgdmFyIHIgPSAnbWF0cml4M2QoJztcblxuICAgIHIgKz0gKG1bMF0gPCAwLjAwMDAwMSAmJiBtWzBdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzBdICsgJywnO1xuICAgIHIgKz0gKG1bMV0gPCAwLjAwMDAwMSAmJiBtWzFdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzFdICsgJywnO1xuICAgIHIgKz0gKG1bMl0gPCAwLjAwMDAwMSAmJiBtWzJdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzJdICsgJywnO1xuICAgIHIgKz0gKG1bM10gPCAwLjAwMDAwMSAmJiBtWzNdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzNdICsgJywnO1xuICAgIHIgKz0gKG1bNF0gPCAwLjAwMDAwMSAmJiBtWzRdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzRdICsgJywnO1xuICAgIHIgKz0gKG1bNV0gPCAwLjAwMDAwMSAmJiBtWzVdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzVdICsgJywnO1xuICAgIHIgKz0gKG1bNl0gPCAwLjAwMDAwMSAmJiBtWzZdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzZdICsgJywnO1xuICAgIHIgKz0gKG1bN10gPCAwLjAwMDAwMSAmJiBtWzddID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzddICsgJywnO1xuICAgIHIgKz0gKG1bOF0gPCAwLjAwMDAwMSAmJiBtWzhdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzhdICsgJywnO1xuICAgIHIgKz0gKG1bOV0gPCAwLjAwMDAwMSAmJiBtWzldID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzldICsgJywnO1xuICAgIHIgKz0gKG1bMTBdIDwgMC4wMDAwMDEgJiYgbVsxMF0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTBdICsgJywnO1xuICAgIHIgKz0gKG1bMTFdIDwgMC4wMDAwMDEgJiYgbVsxMV0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTFdICsgJywnO1xuICAgIHIgKz0gKG1bMTJdIDwgMC4wMDAwMDEgJiYgbVsxMl0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTJdICsgJywnO1xuICAgIHIgKz0gKG1bMTNdIDwgMC4wMDAwMDEgJiYgbVsxM10gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTNdICsgJywnO1xuICAgIHIgKz0gKG1bMTRdIDwgMC4wMDAwMDEgJiYgbVsxNF0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTRdICsgJywnO1xuXG4gICAgciArPSBtWzE1XSArICcpJztcbiAgICByZXR1cm4gcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRE9NUmVuZGVyZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBUcmFuc2Zvcm0gaWRlbnRpdHkgbWF0cml4LiBcbnZhciBpZGVudCA9IFtcbiAgICAxLCAwLCAwLCAwLFxuICAgIDAsIDEsIDAsIDAsXG4gICAgMCwgMCwgMSwgMCxcbiAgICAwLCAwLCAwLCAxXG5dO1xuXG4vKipcbiAqIEVsZW1lbnRDYWNoZSBpcyBiZWluZyB1c2VkIGZvciBrZWVwaW5nIHRyYWNrIG9mIGFuIGVsZW1lbnQncyBET00gRWxlbWVudCxcbiAqIHBhdGgsIHdvcmxkIHRyYW5zZm9ybSwgaW52ZXJ0ZWQgcGFyZW50LCBmaW5hbCB0cmFuc2Zvcm0gKGFzIGJlaW5nIHVzZWQgZm9yXG4gKiBzZXR0aW5nIHRoZSBhY3R1YWwgYHRyYW5zZm9ybWAtcHJvcGVydHkpIGFuZCBwb3N0IHJlbmRlciBzaXplIChmaW5hbCBzaXplIGFzXG4gKiBiZWluZyByZW5kZXJlZCB0byB0aGUgRE9NKS5cbiAqIFxuICogQGNsYXNzIEVsZW1lbnRDYWNoZVxuICogIFxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IERPTUVsZW1lbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBmb3IgdW5pcXVlbHkgaWRlbnRpZnlpbmcgdGhlIGxvY2F0aW9uIGluIHRoZSBzY2VuZSBncmFwaC5cbiAqLyBcbmZ1bmN0aW9uIEVsZW1lbnRDYWNoZSAoZWxlbWVudCwgcGF0aCkge1xuICAgIHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICB0aGlzLmNvbnRlbnQgPSBudWxsO1xuICAgIHRoaXMuc2l6ZSA9IG5ldyBJbnQxNkFycmF5KDMpO1xuICAgIHRoaXMuZXhwbGljaXRIZWlnaHQgPSBmYWxzZTtcbiAgICB0aGlzLmV4cGxpY2l0V2lkdGggPSBmYWxzZTtcbiAgICB0aGlzLndvcmxkVHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShpZGVudCk7XG4gICAgdGhpcy5pbnZlcnRlZFBhcmVudCA9IG5ldyBGbG9hdDMyQXJyYXkoaWRlbnQpO1xuICAgIHRoaXMuZmluYWxUcmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KGlkZW50KTtcbiAgICB0aGlzLnBvc3RSZW5kZXJTaXplID0gbmV3IEZsb2F0MzJBcnJheSgyKTtcbiAgICB0aGlzLmxpc3RlbmVycyA9IHt9O1xuICAgIHRoaXMucHJldmVudERlZmF1bHQgPSB7fTtcbiAgICB0aGlzLnN1YnNjcmliZSA9IHt9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVsZW1lbnRDYWNoZTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBBIG1ldGhvZCBmb3IgaW52ZXJ0aW5nIGEgdHJhbnNmb3JtIG1hdHJpeFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgYXJyYXkgdG8gc3RvcmUgdGhlIHJldHVybiBvZiB0aGUgaW52ZXJzaW9uXG4gKiBAcGFyYW0ge0FycmF5fSBhIHRyYW5zZm9ybSBtYXRyaXggdG8gaW52ZXJzZVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBvdXRcbiAqICAgb3V0cHV0IGFycmF5IHRoYXQgaXMgc3RvcmluZyB0aGUgdHJhbnNmb3JtIG1hdHJpeFxuICovXG5mdW5jdGlvbiBpbnZlcnQgKG91dCwgYSkge1xuICAgIHZhciBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdLFxuXG4gICAgICAgIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCxcbiAgICAgICAgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLFxuICAgICAgICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXG4gICAgICAgIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSxcbiAgICAgICAgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLFxuICAgICAgICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXG4gICAgICAgIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCxcbiAgICAgICAgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLFxuICAgICAgICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXG4gICAgICAgIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSxcbiAgICAgICAgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLFxuICAgICAgICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsXG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIHRoZSBkZXRlcm1pbmFudFxuICAgICAgICBkZXQgPSBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7XG5cbiAgICBpZiAoIWRldCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgZGV0ID0gMS4wIC8gZGV0O1xuXG4gICAgb3V0WzBdID0gKGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSkgKiBkZXQ7XG4gICAgb3V0WzFdID0gKGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSkgKiBkZXQ7XG4gICAgb3V0WzJdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XG4gICAgb3V0WzNdID0gKGEyMiAqIGIwNCAtIGEyMSAqIGIwNSAtIGEyMyAqIGIwMykgKiBkZXQ7XG4gICAgb3V0WzRdID0gKGExMiAqIGIwOCAtIGExMCAqIGIxMSAtIGExMyAqIGIwNykgKiBkZXQ7XG4gICAgb3V0WzVdID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7XG4gICAgb3V0WzZdID0gKGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSkgKiBkZXQ7XG4gICAgb3V0WzddID0gKGEyMCAqIGIwNSAtIGEyMiAqIGIwMiArIGEyMyAqIGIwMSkgKiBkZXQ7XG4gICAgb3V0WzhdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XG4gICAgb3V0WzldID0gKGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNikgKiBkZXQ7XG4gICAgb3V0WzEwXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xuICAgIG91dFsxMV0gPSAoYTIxICogYjAyIC0gYTIwICogYjA0IC0gYTIzICogYjAwKSAqIGRldDtcbiAgICBvdXRbMTJdID0gKGExMSAqIGIwNyAtIGExMCAqIGIwOSAtIGExMiAqIGIwNikgKiBkZXQ7XG4gICAgb3V0WzEzXSA9IChhMDAgKiBiMDkgLSBhMDEgKiBiMDcgKyBhMDIgKiBiMDYpICogZGV0O1xuICAgIG91dFsxNF0gPSAoYTMxICogYjAxIC0gYTMwICogYjAzIC0gYTMyICogYjAwKSAqIGRldDtcbiAgICBvdXRbMTVdID0gKGEyMCAqIGIwMyAtIGEyMSAqIGIwMSArIGEyMiAqIGIwMCkgKiBkZXQ7XG5cbiAgICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIEEgbWV0aG9kIGZvciBtdWx0aXBseWluZyB0d28gbWF0cmljaWVzXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IG91dCBhcnJheSB0byBzdG9yZSB0aGUgcmV0dXJuIG9mIHRoZSBtdWx0aXBsaWNhdGlvblxuICogQHBhcmFtIHtBcnJheX0gYSB0cmFuc2Zvcm0gbWF0cml4IHRvIG11bHRpcGx5XG4gKiBAcGFyYW0ge0FycmF5fSBiIHRyYW5zZm9ybSBtYXRyaXggdG8gbXVsdGlwbHlcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gb3V0XG4gKiAgIG91dHB1dCBhcnJheSB0aGF0IGlzIHN0b3JpbmcgdGhlIHRyYW5zZm9ybSBtYXRyaXhcbiAqL1xuZnVuY3Rpb24gbXVsdGlwbHkgKG91dCwgYSwgYikge1xuICAgIHZhciBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgICAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgICAgICBhMjAgPSBhWzhdLCBhMjEgPSBhWzldLCBhMjIgPSBhWzEwXSwgYTIzID0gYVsxMV0sXG4gICAgICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdLFxuXG4gICAgICAgIGIwID0gYlswXSwgYjEgPSBiWzFdLCBiMiA9IGJbMl0sIGIzID0gYlszXSxcbiAgICAgICAgYjQgPSBiWzRdLCBiNSA9IGJbNV0sIGI2ID0gYls2XSwgYjcgPSBiWzddLFxuICAgICAgICBiOCA9IGJbOF0sIGI5ID0gYls5XSwgYjEwID0gYlsxMF0sIGIxMSA9IGJbMTFdLFxuICAgICAgICBiMTIgPSBiWzEyXSwgYjEzID0gYlsxM10sIGIxNCA9IGJbMTRdLCBiMTUgPSBiWzE1XTtcblxuICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG4gICAgdmFyIG91dDAsIG91dDEsIG91dDIsIG91dDM7XG5cbiAgICBvdXQwID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dDEgPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0MiA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXQzID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgY2hhbmdlZCA9IGNoYW5nZWQgP1xuICAgICAgICAgICAgICBjaGFuZ2VkIDogb3V0MCA9PT0gb3V0WzBdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQxID09PSBvdXRbMV0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDIgPT09IG91dFsyXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MyA9PT0gb3V0WzNdO1xuXG4gICAgb3V0WzBdID0gb3V0MDtcbiAgICBvdXRbMV0gPSBvdXQxO1xuICAgIG91dFsyXSA9IG91dDI7XG4gICAgb3V0WzNdID0gb3V0MztcblxuICAgIGIwID0gYjQ7IGIxID0gYjU7IGIyID0gYjY7IGIzID0gYjc7XG4gICAgb3V0MCA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXQxID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dDIgPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0MyA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGNoYW5nZWQgPSBjaGFuZ2VkID9cbiAgICAgICAgICAgICAgY2hhbmdlZCA6IG91dDAgPT09IG91dFs0XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MSA9PT0gb3V0WzVdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQyID09PSBvdXRbNl0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDMgPT09IG91dFs3XTtcblxuICAgIG91dFs0XSA9IG91dDA7XG4gICAgb3V0WzVdID0gb3V0MTtcbiAgICBvdXRbNl0gPSBvdXQyO1xuICAgIG91dFs3XSA9IG91dDM7XG5cbiAgICBiMCA9IGI4OyBiMSA9IGI5OyBiMiA9IGIxMDsgYjMgPSBiMTE7XG4gICAgb3V0MCA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXQxID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dDIgPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0MyA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGNoYW5nZWQgPSBjaGFuZ2VkID9cbiAgICAgICAgICAgICAgY2hhbmdlZCA6IG91dDAgPT09IG91dFs4XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MSA9PT0gb3V0WzldIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQyID09PSBvdXRbMTBdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQzID09PSBvdXRbMTFdO1xuXG4gICAgb3V0WzhdID0gb3V0MDtcbiAgICBvdXRbOV0gPSBvdXQxO1xuICAgIG91dFsxMF0gPSBvdXQyO1xuICAgIG91dFsxMV0gPSBvdXQzO1xuXG4gICAgYjAgPSBiMTI7IGIxID0gYjEzOyBiMiA9IGIxNDsgYjMgPSBiMTU7XG4gICAgb3V0MCA9IGIwKmEwMCArIGIxKmExMCArIGIyKmEyMCArIGIzKmEzMDtcbiAgICBvdXQxID0gYjAqYTAxICsgYjEqYTExICsgYjIqYTIxICsgYjMqYTMxO1xuICAgIG91dDIgPSBiMCphMDIgKyBiMSphMTIgKyBiMiphMjIgKyBiMyphMzI7XG4gICAgb3V0MyA9IGIwKmEwMyArIGIxKmExMyArIGIyKmEyMyArIGIzKmEzMztcblxuICAgIGNoYW5nZWQgPSBjaGFuZ2VkID9cbiAgICAgICAgICAgICAgY2hhbmdlZCA6IG91dDAgPT09IG91dFsxMl0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDEgPT09IG91dFsxM10gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDIgPT09IG91dFsxNF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDMgPT09IG91dFsxNV07XG5cbiAgICBvdXRbMTJdID0gb3V0MDtcbiAgICBvdXRbMTNdID0gb3V0MTtcbiAgICBvdXRbMTRdID0gb3V0MjtcbiAgICBvdXRbMTVdID0gb3V0MztcblxuICAgIHJldHVybiBvdXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIG11bHRpcGx5OiBtdWx0aXBseSxcbiAgICBpbnZlcnQ6IGludmVydFxufTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLWNvbXBvc2l0aW9uZXZlbnRzKS5cbiAqXG4gKiBAY2xhc3MgQ29tcG9zaXRpb25FdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gQ29tcG9zaXRpb25FdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgQ29tcG9zaXRpb25FdmVudEluaXQgY29tcG9zaXRpb25FdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgQ29tcG9zaXRpb25FdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRE9NU3RyaW5nIGRhdGE7XG4gICAgLy8gfTtcblxuICAgIFVJRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBDb21wb3NpdGlvbkV2ZW50I2RhdGFcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSBldi5kYXRhO1xufVxuXG5Db21wb3NpdGlvbkV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuQ29tcG9zaXRpb25FdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBDb21wb3NpdGlvbkV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuQ29tcG9zaXRpb25FdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdDb21wb3NpdGlvbkV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9zaXRpb25FdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUaGUgRXZlbnQgY2xhc3MgaXMgYmVpbmcgdXNlZCBpbiBvcmRlciB0byBub3JtYWxpemUgbmF0aXZlIERPTSBldmVudHMuXG4gKiBFdmVudHMgbmVlZCB0byBiZSBub3JtYWxpemVkIGluIG9yZGVyIHRvIGJlIHNlcmlhbGl6ZWQgdGhyb3VnaCB0aGUgc3RydWN0dXJlZFxuICogY2xvbmluZyBhbGdvcml0aG0gdXNlZCBieSB0aGUgYHBvc3RNZXNzYWdlYCBtZXRob2QgKFdlYiBXb3JrZXJzKS5cbiAqXG4gKiBXcmFwcGluZyBET00gZXZlbnRzIGFsc28gaGFzIHRoZSBhZHZhbnRhZ2Ugb2YgcHJvdmlkaW5nIGEgY29uc2lzdGVudFxuICogaW50ZXJmYWNlIGZvciBpbnRlcmFjdGluZyB3aXRoIERPTSBldmVudHMgYWNyb3NzIGJyb3dzZXJzIGJ5IGNvcHlpbmcgb3ZlciBhXG4gKiBzdWJzZXQgb2YgdGhlIGV4cG9zZWQgcHJvcGVydGllcyB0aGF0IGlzIGd1YXJhbnRlZWQgdG8gYmUgY29uc2lzdGVudCBhY3Jvc3NcbiAqIGJyb3dzZXJzLlxuICpcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNpbnRlcmZhY2UtRXZlbnQpLlxuICpcbiAqIEBjbGFzcyBFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZSwgb3B0aW9uYWwgRXZlbnRJbml0IGV2ZW50SW5pdERpY3QpLFxuICAgIC8vICBFeHBvc2VkPVdpbmRvdyxXb3JrZXJdXG4gICAgLy8gaW50ZXJmYWNlIEV2ZW50IHtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBET01TdHJpbmcgdHlwZTtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBFdmVudFRhcmdldD8gdGFyZ2V0O1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIEV2ZW50VGFyZ2V0PyBjdXJyZW50VGFyZ2V0O1xuXG4gICAgLy8gICBjb25zdCB1bnNpZ25lZCBzaG9ydCBOT05FID0gMDtcbiAgICAvLyAgIGNvbnN0IHVuc2lnbmVkIHNob3J0IENBUFRVUklOR19QSEFTRSA9IDE7XG4gICAgLy8gICBjb25zdCB1bnNpZ25lZCBzaG9ydCBBVF9UQVJHRVQgPSAyO1xuICAgIC8vICAgY29uc3QgdW5zaWduZWQgc2hvcnQgQlVCQkxJTkdfUEhBU0UgPSAzO1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIHVuc2lnbmVkIHNob3J0IGV2ZW50UGhhc2U7XG5cbiAgICAvLyAgIHZvaWQgc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgLy8gICB2b2lkIHN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuXG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgYm9vbGVhbiBidWJibGVzO1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIGJvb2xlYW4gY2FuY2VsYWJsZTtcbiAgICAvLyAgIHZvaWQgcHJldmVudERlZmF1bHQoKTtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBib29sZWFuIGRlZmF1bHRQcmV2ZW50ZWQ7XG5cbiAgICAvLyAgIFtVbmZvcmdlYWJsZV0gcmVhZG9ubHkgYXR0cmlidXRlIGJvb2xlYW4gaXNUcnVzdGVkO1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIERPTVRpbWVTdGFtcCB0aW1lU3RhbXA7XG5cbiAgICAvLyAgIHZvaWQgaW5pdEV2ZW50KERPTVN0cmluZyB0eXBlLCBib29sZWFuIGJ1YmJsZXMsIGJvb2xlYW4gY2FuY2VsYWJsZSk7XG4gICAgLy8gfTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEV2ZW50I3R5cGVcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLnR5cGUgPSBldi50eXBlO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgRXZlbnQjZGVmYXVsdFByZXZlbnRlZFxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmRlZmF1bHRQcmV2ZW50ZWQgPSBldi5kZWZhdWx0UHJldmVudGVkO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgRXZlbnQjdGltZVN0YW1wXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy50aW1lU3RhbXAgPSBldi50aW1lU3RhbXA7XG5cblxuICAgIC8qKlxuICAgICAqIFVzZWQgZm9yIGV4cG9zaW5nIHRoZSBjdXJyZW50IHRhcmdldCdzIHZhbHVlLlxuICAgICAqXG4gICAgICogQG5hbWUgRXZlbnQjdmFsdWVcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKi9cbiAgICB2YXIgdGFyZ2V0Q29uc3RydWN0b3IgPSBldi50YXJnZXQuY29uc3RydWN0b3I7XG4gICAgLy8gVE9ETyBTdXBwb3J0IEhUTUxLZXlnZW5FbGVtZW50XG4gICAgaWYgKFxuICAgICAgICB0YXJnZXRDb25zdHJ1Y3RvciA9PT0gSFRNTElucHV0RWxlbWVudCB8fFxuICAgICAgICB0YXJnZXRDb25zdHJ1Y3RvciA9PT0gSFRNTFRleHRBcmVhRWxlbWVudCB8fFxuICAgICAgICB0YXJnZXRDb25zdHJ1Y3RvciA9PT0gSFRNTFNlbGVjdEVsZW1lbnRcbiAgICApIHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IGV2LnRhcmdldC52YWx1ZTtcbiAgICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5FdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9zaXRpb25FdmVudCA9IHJlcXVpcmUoJy4vQ29tcG9zaXRpb25FdmVudCcpO1xudmFyIEV2ZW50ID0gcmVxdWlyZSgnLi9FdmVudCcpO1xudmFyIEZvY3VzRXZlbnQgPSByZXF1aXJlKCcuL0ZvY3VzRXZlbnQnKTtcbnZhciBJbnB1dEV2ZW50ID0gcmVxdWlyZSgnLi9JbnB1dEV2ZW50Jyk7XG52YXIgS2V5Ym9hcmRFdmVudCA9IHJlcXVpcmUoJy4vS2V5Ym9hcmRFdmVudCcpO1xudmFyIE1vdXNlRXZlbnQgPSByZXF1aXJlKCcuL01vdXNlRXZlbnQnKTtcbnZhciBUb3VjaEV2ZW50ID0gcmVxdWlyZSgnLi9Ub3VjaEV2ZW50Jyk7XG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xudmFyIFdoZWVsRXZlbnQgPSByZXF1aXJlKCcuL1doZWVsRXZlbnQnKTtcblxuLyoqXG4gKiBBIG1hcHBpbmcgb2YgRE9NIGV2ZW50cyB0byB0aGUgY29ycmVzcG9uZGluZyBoYW5kbGVyc1xuICpcbiAqIEBuYW1lIEV2ZW50TWFwXG4gKiBAdHlwZSBPYmplY3RcbiAqL1xudmFyIEV2ZW50TWFwID0ge1xuICAgIGNoYW5nZSAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgdHJ1ZV0sXG4gICAgc3VibWl0ICAgICAgICAgICAgICAgICAgICAgICAgIDogW0V2ZW50LCB0cnVlXSxcblxuICAgIC8vIFVJIEV2ZW50cyAoaHR0cDovL3d3dy53My5vcmcvVFIvdWlldmVudHMvKVxuICAgIGFib3J0ICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgZmFsc2VdLFxuICAgIGJlZm9yZWlucHV0ICAgICAgICAgICAgICAgICAgICA6IFtJbnB1dEV2ZW50LCB0cnVlXSxcbiAgICBibHVyICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRm9jdXNFdmVudCwgZmFsc2VdLFxuICAgIGNsaWNrICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICBjb21wb3NpdGlvbmVuZCAgICAgICAgICAgICAgICAgOiBbQ29tcG9zaXRpb25FdmVudCwgdHJ1ZV0sXG4gICAgY29tcG9zaXRpb25zdGFydCAgICAgICAgICAgICAgIDogW0NvbXBvc2l0aW9uRXZlbnQsIHRydWVdLFxuICAgIGNvbXBvc2l0aW9udXBkYXRlICAgICAgICAgICAgICA6IFtDb21wb3NpdGlvbkV2ZW50LCB0cnVlXSxcbiAgICBkYmxjbGljayAgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgZm9jdXMgICAgICAgICAgICAgICAgICAgICAgICAgIDogW0ZvY3VzRXZlbnQsIGZhbHNlXSxcbiAgICBmb2N1c2luICAgICAgICAgICAgICAgICAgICAgICAgOiBbRm9jdXNFdmVudCwgdHJ1ZV0sXG4gICAgZm9jdXNvdXQgICAgICAgICAgICAgICAgICAgICAgIDogW0ZvY3VzRXZlbnQsIHRydWVdLFxuICAgIGlucHV0ICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtJbnB1dEV2ZW50LCB0cnVlXSxcbiAgICBrZXlkb3duICAgICAgICAgICAgICAgICAgICAgICAgOiBbS2V5Ym9hcmRFdmVudCwgdHJ1ZV0sXG4gICAga2V5dXAgICAgICAgICAgICAgICAgICAgICAgICAgIDogW0tleWJvYXJkRXZlbnQsIHRydWVdLFxuICAgIGxvYWQgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgZmFsc2VdLFxuICAgIG1vdXNlZG93biAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICBtb3VzZWVudGVyICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgZmFsc2VdLFxuICAgIG1vdXNlbGVhdmUgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCBmYWxzZV0sXG5cbiAgICAvLyBidWJibGVzLCBidXQgd2lsbCBiZSB0cmlnZ2VyZWQgdmVyeSBmcmVxdWVudGx5XG4gICAgbW91c2Vtb3ZlICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIGZhbHNlXSxcblxuICAgIG1vdXNlb3V0ICAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICBtb3VzZW92ZXIgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgbW91c2V1cCAgICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIHRydWVdLFxuICAgIHJlc2l6ZSAgICAgICAgICAgICAgICAgICAgICAgICA6IFtVSUV2ZW50LCBmYWxzZV0sXG5cbiAgICAvLyBtaWdodCBidWJibGVcbiAgICBzY3JvbGwgICAgICAgICAgICAgICAgICAgICAgICAgOiBbVUlFdmVudCwgZmFsc2VdLFxuXG4gICAgc2VsZWN0ICAgICAgICAgICAgICAgICAgICAgICAgIDogW0V2ZW50LCB0cnVlXSxcbiAgICB1bmxvYWQgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIGZhbHNlXSxcbiAgICB3aGVlbCAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbV2hlZWxFdmVudCwgdHJ1ZV0sXG5cbiAgICAvLyBUb3VjaCBFdmVudHMgRXh0ZW5zaW9uIChodHRwOi8vd3d3LnczLm9yZy9UUi90b3VjaC1ldmVudHMtZXh0ZW5zaW9ucy8pXG4gICAgdG91Y2hjYW5jZWwgICAgICAgICAgICAgICAgICAgIDogW1RvdWNoRXZlbnQsIHRydWVdLFxuICAgIHRvdWNoZW5kICAgICAgICAgICAgICAgICAgICAgICA6IFtUb3VjaEV2ZW50LCB0cnVlXSxcbiAgICB0b3VjaG1vdmUgICAgICAgICAgICAgICAgICAgICAgOiBbVG91Y2hFdmVudCwgdHJ1ZV0sXG4gICAgdG91Y2hzdGFydCAgICAgICAgICAgICAgICAgICAgIDogW1RvdWNoRXZlbnQsIHRydWVdXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50TWFwO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNldmVudHMtZm9jdXNldmVudCkuXG4gKlxuICogQGNsYXNzIEZvY3VzRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIEZvY3VzRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIEZvY3VzRXZlbnRJbml0IGZvY3VzRXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIEZvY3VzRXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIEV2ZW50VGFyZ2V0PyByZWxhdGVkVGFyZ2V0O1xuICAgIC8vIH07XG5cbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xufVxuXG5Gb2N1c0V2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuRm9jdXNFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBGb2N1c0V2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuRm9jdXNFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdGb2N1c0V2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRm9jdXNFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW0lucHV0IEV2ZW50c10oaHR0cDovL3czYy5naXRodWIuaW8vZWRpdGluZy1leHBsYWluZXIvaW5wdXQtZXZlbnRzLmh0bWwjaWRsLWRlZi1JbnB1dEV2ZW50KS5cbiAqXG4gKiBAY2xhc3MgSW5wdXRFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gSW5wdXRFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgSW5wdXRFdmVudEluaXQgaW5wdXRFdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgSW5wdXRFdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRE9NU3RyaW5nIGlucHV0VHlwZTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyBkYXRhO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgIGlzQ29tcG9zaW5nO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgUmFuZ2UgICAgIHRhcmdldFJhbmdlO1xuICAgIC8vIH07XG5cbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgICAgSW5wdXRFdmVudCNpbnB1dFR5cGVcbiAgICAgKiBAdHlwZSAgICBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLmlucHV0VHlwZSA9IGV2LmlucHV0VHlwZTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lICAgIElucHV0RXZlbnQjZGF0YVxuICAgICAqIEB0eXBlICAgIFN0cmluZ1xuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IGV2LmRhdGE7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSAgICBJbnB1dEV2ZW50I2lzQ29tcG9zaW5nXG4gICAgICogQHR5cGUgICAgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuaXNDb21wb3NpbmcgPSBldi5pc0NvbXBvc2luZztcblxuICAgIC8qKlxuICAgICAqICoqTGltaXRlZCBicm93c2VyIHN1cHBvcnQqKi5cbiAgICAgKlxuICAgICAqIEBuYW1lICAgIElucHV0RXZlbnQjdGFyZ2V0UmFuZ2VcbiAgICAgKiBAdHlwZSAgICBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy50YXJnZXRSYW5nZSA9IGV2LnRhcmdldFJhbmdlO1xufVxuXG5JbnB1dEV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuSW5wdXRFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBJbnB1dEV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuSW5wdXRFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdJbnB1dEV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW5wdXRFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLWtleWJvYXJkZXZlbnRzKS5cbiAqXG4gKiBAY2xhc3MgS2V5Ym9hcmRFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gS2V5Ym9hcmRFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgS2V5Ym9hcmRFdmVudEluaXQga2V5Ym9hcmRFdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgS2V5Ym9hcmRFdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICAvLyBLZXlMb2NhdGlvbkNvZGVcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fS0VZX0xPQ0FUSU9OX1NUQU5EQVJEID0gMHgwMDtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fS0VZX0xPQ0FUSU9OX0xFRlQgPSAweDAxO1xuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9LRVlfTE9DQVRJT05fUklHSFQgPSAweDAyO1xuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9LRVlfTE9DQVRJT05fTlVNUEFEID0gMHgwMztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyAgICAga2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRE9NU3RyaW5nICAgICBjb2RlO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgdW5zaWduZWQgbG9uZyBsb2NhdGlvbjtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgY3RybEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgc2hpZnRLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIGFsdEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgbWV0YUtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgcmVwZWF0O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICBpc0NvbXBvc2luZztcbiAgICAvLyAgICAgYm9vbGVhbiBnZXRNb2RpZmllclN0YXRlIChET01TdHJpbmcga2V5QXJnKTtcbiAgICAvLyB9O1xuXG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjRE9NX0tFWV9MT0NBVElPTl9TVEFOREFSRFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0tFWV9MT0NBVElPTl9TVEFOREFSRCA9IDB4MDA7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I0RPTV9LRVlfTE9DQVRJT05fTEVGVFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0tFWV9MT0NBVElPTl9MRUZUID0gMHgwMTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjRE9NX0tFWV9MT0NBVElPTl9SSUdIVFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0tFWV9MT0NBVElPTl9SSUdIVCA9IDB4MDI7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I0RPTV9LRVlfTE9DQVRJT05fTlVNUEFEXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5ET01fS0VZX0xPQ0FUSU9OX05VTVBBRCA9IDB4MDM7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2tleVxuICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAqL1xuICAgIHRoaXMua2V5ID0gZXYua2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNjb2RlXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy5jb2RlID0gZXYuY29kZTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjbG9jYXRpb25cbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmxvY2F0aW9uID0gZXYubG9jYXRpb247XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2N0cmxLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5jdHJsS2V5ID0gZXYuY3RybEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjc2hpZnRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5zaGlmdEtleSA9IGV2LnNoaWZ0S2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNhbHRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5hbHRLZXkgPSBldi5hbHRLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I21ldGFLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5tZXRhS2V5ID0gZXYubWV0YUtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjcmVwZWF0XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMucmVwZWF0ID0gZXYucmVwZWF0O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNpc0NvbXBvc2luZ1xuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmlzQ29tcG9zaW5nID0gZXYuaXNDb21wb3Npbmc7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2tleUNvZGVcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKiBAZGVwcmVjYXRlZFxuICAgICAqL1xuICAgIHRoaXMua2V5Q29kZSA9IGV2LmtleUNvZGU7XG59XG5cbktleWJvYXJkRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShVSUV2ZW50LnByb3RvdHlwZSk7XG5LZXlib2FyZEV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEtleWJvYXJkRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5LZXlib2FyZEV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ0tleWJvYXJkRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBLZXlib2FyZEV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNldmVudHMtbW91c2VldmVudHMpLlxuICpcbiAqIEBjbGFzcyBLZXlib2FyZEV2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBNb3VzZUV2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlQXJnLCBvcHRpb25hbCBNb3VzZUV2ZW50SW5pdCBtb3VzZUV2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBNb3VzZUV2ZW50IDogVUlFdmVudCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgICAgICAgICBzY3JlZW5YO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICAgICAgICAgc2NyZWVuWTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGxvbmcgICAgICAgICAgIGNsaWVudFg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgICAgICAgICBjbGllbnRZO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICAgY3RybEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgIHNoaWZ0S2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICAgYWx0S2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICAgbWV0YUtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIHNob3J0ICAgICAgICAgIGJ1dHRvbjtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIEV2ZW50VGFyZ2V0PyAgIHJlbGF0ZWRUYXJnZXQ7XG4gICAgLy8gICAgIC8vIEludHJvZHVjZWQgaW4gdGhpcyBzcGVjaWZpY2F0aW9uXG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSB1bnNpZ25lZCBzaG9ydCBidXR0b25zO1xuICAgIC8vICAgICBib29sZWFuIGdldE1vZGlmaWVyU3RhdGUgKERPTVN0cmluZyBrZXlBcmcpO1xuICAgIC8vIH07XG5cbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNzY3JlZW5YXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5zY3JlZW5YID0gZXYuc2NyZWVuWDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjc2NyZWVuWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuc2NyZWVuWSA9IGV2LnNjcmVlblk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I2NsaWVudFhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmNsaWVudFggPSBldi5jbGllbnRYO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNjbGllbnRZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5jbGllbnRZID0gZXYuY2xpZW50WTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjY3RybEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmN0cmxLZXkgPSBldi5jdHJsS2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNzaGlmdEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLnNoaWZ0S2V5ID0gZXYuc2hpZnRLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I2FsdEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmFsdEtleSA9IGV2LmFsdEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjbWV0YUtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLm1ldGFLZXkgPSBldi5tZXRhS2V5O1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNidXR0b25cbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmJ1dHRvbiA9IGV2LmJ1dHRvbjtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjYnV0dG9uc1xuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuYnV0dG9ucyA9IGV2LmJ1dHRvbnM7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I3BhZ2VYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5wYWdlWCA9IGV2LnBhZ2VYO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNwYWdlWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMucGFnZVkgPSBldi5wYWdlWTtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjeFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMueCA9IGV2Lng7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I3lcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnkgPSBldi55O1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNvZmZzZXRYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5vZmZzZXRYID0gZXYub2Zmc2V0WDtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjb2Zmc2V0WVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMub2Zmc2V0WSA9IGV2Lm9mZnNldFk7XG59XG5cbk1vdXNlRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShVSUV2ZW50LnByb3RvdHlwZSk7XG5Nb3VzZUV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE1vdXNlRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5Nb3VzZUV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ01vdXNlRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBNb3VzZUV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xuXG52YXIgRU1QVFlfQVJSQVkgPSBbXTtcblxuLyoqXG4gKiBTZWUgW1RvdWNoIEludGVyZmFjZV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxMy9SRUMtdG91Y2gtZXZlbnRzLTIwMTMxMDEwLyN0b3VjaC1pbnRlcmZhY2UpLlxuICpcbiAqIEBjbGFzcyBUb3VjaFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0ge1RvdWNofSB0b3VjaCBUaGUgbmF0aXZlIFRvdWNoIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gVG91Y2godG91Y2gpIHtcbiAgICAvLyBpbnRlcmZhY2UgVG91Y2gge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICAgICAgaWRlbnRpZmllcjtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIEV2ZW50VGFyZ2V0IHRhcmdldDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIHNjcmVlblg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBzY3JlZW5ZO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgY2xpZW50WDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIGNsaWVudFk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBwYWdlWDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIHBhZ2VZO1xuICAgIC8vIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNpZGVudGlmaWVyXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5pZGVudGlmaWVyID0gdG91Y2guaWRlbnRpZmllcjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI3NjcmVlblhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnNjcmVlblggPSB0b3VjaC5zY3JlZW5YO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjc2NyZWVuWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuc2NyZWVuWSA9IHRvdWNoLnNjcmVlblk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNjbGllbnRYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5jbGllbnRYID0gdG91Y2guY2xpZW50WDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI2NsaWVudFlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmNsaWVudFkgPSB0b3VjaC5jbGllbnRZO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjcGFnZVhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnBhZ2VYID0gdG91Y2gucGFnZVg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNwYWdlWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMucGFnZVkgPSB0b3VjaC5wYWdlWTtcbn1cblxuXG4vKipcbiAqIE5vcm1hbGl6ZXMgdGhlIGJyb3dzZXIncyBuYXRpdmUgVG91Y2hMaXN0IGJ5IGNvbnZlcnRpbmcgaXQgaW50byBhbiBhcnJheSBvZlxuICogbm9ybWFsaXplZCBUb3VjaCBvYmplY3RzLlxuICpcbiAqIEBtZXRob2QgIGNsb25lVG91Y2hMaXN0XG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge1RvdWNoTGlzdH0gdG91Y2hMaXN0ICAgIFRoZSBuYXRpdmUgVG91Y2hMaXN0IGFycmF5LlxuICogQHJldHVybiB7QXJyYXkuPFRvdWNoPn0gICAgICAgICAgQW4gYXJyYXkgb2Ygbm9ybWFsaXplZCBUb3VjaCBvYmplY3RzLlxuICovXG5mdW5jdGlvbiBjbG9uZVRvdWNoTGlzdCh0b3VjaExpc3QpIHtcbiAgICBpZiAoIXRvdWNoTGlzdCkgcmV0dXJuIEVNUFRZX0FSUkFZO1xuICAgIC8vIGludGVyZmFjZSBUb3VjaExpc3Qge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgdW5zaWduZWQgbG9uZyBsZW5ndGg7XG4gICAgLy8gICAgIGdldHRlciBUb3VjaD8gaXRlbSAodW5zaWduZWQgbG9uZyBpbmRleCk7XG4gICAgLy8gfTtcblxuICAgIHZhciB0b3VjaExpc3RBcnJheSA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG91Y2hMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRvdWNoTGlzdEFycmF5W2ldID0gbmV3IFRvdWNoKHRvdWNoTGlzdFtpXSk7XG4gICAgfVxuICAgIHJldHVybiB0b3VjaExpc3RBcnJheTtcbn1cblxuLyoqXG4gKiBTZWUgW1RvdWNoIEV2ZW50IEludGVyZmFjZV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxMy9SRUMtdG91Y2gtZXZlbnRzLTIwMTMxMDEwLyN0b3VjaGV2ZW50LWludGVyZmFjZSkuXG4gKlxuICogQGNsYXNzIFRvdWNoRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIFRvdWNoRXZlbnQoZXYpIHtcbiAgICAvLyBpbnRlcmZhY2UgVG91Y2hFdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgVG91Y2hMaXN0IHRvdWNoZXM7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBUb3VjaExpc3QgdGFyZ2V0VG91Y2hlcztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIFRvdWNoTGlzdCBjaGFuZ2VkVG91Y2hlcztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICBhbHRLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgbWV0YUtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICBjdHJsS2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgIHNoaWZ0S2V5O1xuICAgIC8vIH07XG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjdG91Y2hlc1xuICAgICAqIEB0eXBlIEFycmF5LjxUb3VjaD5cbiAgICAgKi9cbiAgICB0aGlzLnRvdWNoZXMgPSBjbG9uZVRvdWNoTGlzdChldi50b3VjaGVzKTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjdGFyZ2V0VG91Y2hlc1xuICAgICAqIEB0eXBlIEFycmF5LjxUb3VjaD5cbiAgICAgKi9cbiAgICB0aGlzLnRhcmdldFRvdWNoZXMgPSBjbG9uZVRvdWNoTGlzdChldi50YXJnZXRUb3VjaGVzKTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjY2hhbmdlZFRvdWNoZXNcbiAgICAgKiBAdHlwZSBUb3VjaExpc3RcbiAgICAgKi9cbiAgICB0aGlzLmNoYW5nZWRUb3VjaGVzID0gY2xvbmVUb3VjaExpc3QoZXYuY2hhbmdlZFRvdWNoZXMpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCNhbHRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5hbHRLZXkgPSBldi5hbHRLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I21ldGFLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5tZXRhS2V5ID0gZXYubWV0YUtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjY3RybEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmN0cmxLZXkgPSBldi5jdHJsS2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCNzaGlmdEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLnNoaWZ0S2V5ID0gZXYuc2hpZnRLZXk7XG59XG5cblRvdWNoRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShVSUV2ZW50LnByb3RvdHlwZSk7XG5Ub3VjaEV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFRvdWNoRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5Ub3VjaEV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ1RvdWNoRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUb3VjaEV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnQgPSByZXF1aXJlKCcuL0V2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgpLlxuICpcbiAqIEBjbGFzcyBVSUV2ZW50XG4gKiBAYXVnbWVudHMgRXZlbnRcbiAqXG4gKiBAcGFyYW0gIHtFdmVudH0gZXYgICBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gVUlFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZSwgb3B0aW9uYWwgVUlFdmVudEluaXQgZXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIFVJRXZlbnQgOiBFdmVudCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBXaW5kb3c/IHZpZXc7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgIGRldGFpbDtcbiAgICAvLyB9O1xuICAgIEV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVUlFdmVudCNkZXRhaWxcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmRldGFpbCA9IGV2LmRldGFpbDtcbn1cblxuVUlFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50LnByb3RvdHlwZSk7XG5VSUV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFVJRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5VSUV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ1VJRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVSUV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgTW91c2VFdmVudCA9IHJlcXVpcmUoJy4vTW91c2VFdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNldmVudHMtd2hlZWxldmVudHMpLlxuICpcbiAqIEBjbGFzcyBXaGVlbEV2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBXaGVlbEV2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlQXJnLCBvcHRpb25hbCBXaGVlbEV2ZW50SW5pdCB3aGVlbEV2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBXaGVlbEV2ZW50IDogTW91c2VFdmVudCB7XG4gICAgLy8gICAgIC8vIERlbHRhTW9kZUNvZGVcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fREVMVEFfUElYRUwgPSAweDAwO1xuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9ERUxUQV9MSU5FID0gMHgwMTtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fREVMVEFfUEFHRSA9IDB4MDI7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICAgIGRlbHRhWDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgICAgZGVsdGFZO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgICBkZWx0YVo7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSB1bnNpZ25lZCBsb25nIGRlbHRhTW9kZTtcbiAgICAvLyB9O1xuXG4gICAgTW91c2VFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjRE9NX0RFTFRBX1BJWEVMXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5ET01fREVMVEFfUElYRUwgPSAweDAwO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNET01fREVMVEFfTElORVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0RFTFRBX0xJTkUgPSAweDAxO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNET01fREVMVEFfUEFHRVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0RFTFRBX1BBR0UgPSAweDAyO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNkZWx0YVhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmRlbHRhWCA9IGV2LmRlbHRhWDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjZGVsdGFZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5kZWx0YVkgPSBldi5kZWx0YVk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I2RlbHRhWlxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuZGVsdGFaID0gZXYuZGVsdGFaO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNkZWx0YU1vZGVcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmRlbHRhTW9kZSA9IGV2LmRlbHRhTW9kZTtcbn1cblxuV2hlZWxFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKE1vdXNlRXZlbnQucHJvdG90eXBlKTtcbldoZWVsRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gV2hlZWxFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbldoZWVsRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnV2hlZWxFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdoZWVsRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSB0d28tZGltZW5zaW9uYWwgdmVjdG9yLlxuICpcbiAqIEBjbGFzcyBWZWMyXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggVGhlIHggY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgVGhlIHkgY29tcG9uZW50LlxuICovXG52YXIgVmVjMiA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICBpZiAoeCBpbnN0YW5jZW9mIEFycmF5IHx8IHggaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcbiAgICAgICAgdGhpcy54ID0geFswXSB8fCAwO1xuICAgICAgICB0aGlzLnkgPSB4WzFdIHx8IDA7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnggPSB4IHx8IDA7XG4gICAgICAgIHRoaXMueSA9IHkgfHwgMDtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBUaGUgeCBjb21wb25lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0geSBUaGUgeSBjb21wb25lbnQuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQoeCwgeSkge1xuICAgIGlmICh4ICE9IG51bGwpIHRoaXMueCA9IHg7XG4gICAgaWYgKHkgIT0gbnVsbCkgdGhpcy55ID0geTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkIHRoZSBpbnB1dCB2IHRvIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdiBUaGUgVmVjMiB0byBhZGQuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiBhZGQodikge1xuICAgIHRoaXMueCArPSB2Lng7XG4gICAgdGhpcy55ICs9IHYueTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3VidHJhY3QgdGhlIGlucHV0IHYgZnJvbSB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYgVGhlIFZlYzIgdG8gc3VidHJhY3QuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYpIHtcbiAgICB0aGlzLnggLT0gdi54O1xuICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBjdXJyZW50IFZlYzIgYnkgYSBzY2FsYXIgb3IgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8VmVjMn0gcyBUaGUgTnVtYmVyIG9yIHZlYzIgYnkgd2hpY2ggdG8gc2NhbGUuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHMpIHtcbiAgICBpZiAocyBpbnN0YW5jZW9mIFZlYzIpIHtcbiAgICAgICAgdGhpcy54ICo9IHMueDtcbiAgICAgICAgdGhpcy55ICo9IHMueTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMueCAqPSBzO1xuICAgICAgICB0aGlzLnkgKj0gcztcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJvdGF0ZSB0aGUgVmVjMiBjb3VudGVyLWNsb2Nrd2lzZSBieSB0aGV0YSBhYm91dCB0aGUgei1heGlzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGhldGEgQW5nbGUgYnkgd2hpY2ggdG8gcm90YXRlLlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24odGhldGEpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcblxuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG5cbiAgICB0aGlzLnggPSB4ICogY29zVGhldGEgLSB5ICogc2luVGhldGE7XG4gICAgdGhpcy55ID0geCAqIHNpblRoZXRhICsgeSAqIGNvc1RoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFRoZSBkb3QgcHJvZHVjdCBvZiBvZiB0aGUgY3VycmVudCBWZWMyIHdpdGggdGhlIGlucHV0IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB2IFRoZSBvdGhlciBWZWMyLlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB0aGlzLnggKiB2LnggKyB0aGlzLnkgKiB2Lnk7XG59O1xuXG4vKipcbiAqIFRoZSBjcm9zcyBwcm9kdWN0IG9mIG9mIHRoZSBjdXJyZW50IFZlYzIgd2l0aCB0aGUgaW5wdXQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHYgVGhlIG90aGVyIFZlYzIuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5jcm9zcyA9IGZ1bmN0aW9uKHYpIHtcbiAgICByZXR1cm4gdGhpcy54ICogdi55IC0gdGhpcy55ICogdi54O1xufTtcblxuLyoqXG4gKiBQcmVzZXJ2ZSB0aGUgbWFnbml0dWRlIGJ1dCBpbnZlcnQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuaW52ZXJ0ID0gZnVuY3Rpb24gaW52ZXJ0KCkge1xuICAgIHRoaXMueCAqPSAtMTtcbiAgICB0aGlzLnkgKj0gLTE7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgZnVuY3Rpb24gY29tcG9uZW50LXdpc2UgdG8gdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gRnVuY3Rpb24gdG8gYXBwbHkuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAoZm4pIHtcbiAgICB0aGlzLnggPSBmbih0aGlzLngpO1xuICAgIHRoaXMueSA9IGZuKHRoaXMueSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgbWFnbml0dWRlIG9mIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIGxlbmd0aCBvZiB0aGUgdmVjdG9yXG4gKi9cblZlYzIucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uIGxlbmd0aCgpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcblxuICAgIHJldHVybiBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSk7XG59O1xuXG4vKipcbiAqIENvcHkgdGhlIGlucHV0IG9udG8gdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2IFZlYzIgdG8gY29weVxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkodikge1xuICAgIHRoaXMueCA9IHYueDtcbiAgICB0aGlzLnkgPSB2Lnk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlc2V0IHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IHRoaXNcbiAqL1xuVmVjMi5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiBjbGVhcigpIHtcbiAgICB0aGlzLnggPSAwO1xuICAgIHRoaXMueSA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIG1hZ25pdHVkZSBvZiB0aGUgY3VycmVudCBWZWMyIGlzIGV4YWN0bHkgMC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gd2hldGhlciBvciBub3QgdGhlIGxlbmd0aCBpcyAwXG4gKi9cblZlYzIucHJvdG90eXBlLmlzWmVybyA9IGZ1bmN0aW9uIGlzWmVybygpIHtcbiAgICBpZiAodGhpcy54ICE9PSAwIHx8IHRoaXMueSAhPT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgIGVsc2UgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFRoZSBhcnJheSBmb3JtIG9mIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSB0aGUgVmVjIHRvIGFzIGFuIGFycmF5XG4gKi9cblZlYzIucHJvdG90eXBlLnRvQXJyYXkgPSBmdW5jdGlvbiB0b0FycmF5KCkge1xuICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnldO1xufTtcblxuLyoqXG4gKiBOb3JtYWxpemUgdGhlIGlucHV0IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdiBUaGUgcmVmZXJlbmNlIFZlYzIuXG4gKiBAcGFyYW0ge1ZlYzJ9IG91dHB1dCBWZWMyIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjMn0gVGhlIG5vcm1hbGl6ZWQgVmVjMi5cbiAqL1xuVmVjMi5ub3JtYWxpemUgPSBmdW5jdGlvbiBub3JtYWxpemUodiwgb3V0cHV0KSB7XG4gICAgdmFyIHggPSB2Lng7XG4gICAgdmFyIHkgPSB2Lnk7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkpIHx8IDE7XG4gICAgbGVuZ3RoID0gMSAvIGxlbmd0aDtcbiAgICBvdXRwdXQueCA9IHYueCAqIGxlbmd0aDtcbiAgICBvdXRwdXQueSA9IHYueSAqIGxlbmd0aDtcblxuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIENsb25lIHRoZSBpbnB1dCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYgVGhlIFZlYzIgdG8gY2xvbmUuXG4gKlxuICogQHJldHVybiB7VmVjMn0gVGhlIGNsb25lZCBWZWMyLlxuICovXG5WZWMyLmNsb25lID0gZnVuY3Rpb24gY2xvbmUodikge1xuICAgIHJldHVybiBuZXcgVmVjMih2LngsIHYueSk7XG59O1xuXG4vKipcbiAqIEFkZCB0aGUgaW5wdXQgVmVjMidzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYxIFRoZSBsZWZ0IFZlYzIuXG4gKiBAcGFyYW0ge1ZlYzJ9IHYyIFRoZSByaWdodCBWZWMyLlxuICogQHBhcmFtIHtWZWMyfSBvdXRwdXQgVmVjMiBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IFRoZSByZXN1bHQgb2YgdGhlIGFkZGl0aW9uLlxuICovXG5WZWMyLmFkZCA9IGZ1bmN0aW9uIGFkZCh2MSwgdjIsIG91dHB1dCkge1xuICAgIG91dHB1dC54ID0gdjEueCArIHYyLng7XG4gICAgb3V0cHV0LnkgPSB2MS55ICsgdjIueTtcblxuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFN1YnRyYWN0IHRoZSBzZWNvbmQgVmVjMiBmcm9tIHRoZSBmaXJzdC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2MSBUaGUgbGVmdCBWZWMyLlxuICogQHBhcmFtIHtWZWMyfSB2MiBUaGUgcmlnaHQgVmVjMi5cbiAqIEBwYXJhbSB7VmVjMn0gb3V0cHV0IFZlYzIgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSBUaGUgcmVzdWx0IG9mIHRoZSBzdWJ0cmFjdGlvbi5cbiAqL1xuVmVjMi5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYxLCB2Miwgb3V0cHV0KSB7XG4gICAgb3V0cHV0LnggPSB2MS54IC0gdjIueDtcbiAgICBvdXRwdXQueSA9IHYxLnkgLSB2Mi55O1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBpbnB1dCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYgVGhlIHJlZmVyZW5jZSBWZWMyLlxuICogQHBhcmFtIHtOdW1iZXJ9IHMgTnVtYmVyIHRvIHNjYWxlIGJ5LlxuICogQHBhcmFtIHtWZWMyfSBvdXRwdXQgVmVjMiBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IFRoZSByZXN1bHQgb2YgdGhlIHNjYWxpbmcuXG4gKi9cblZlYzIuc2NhbGUgPSBmdW5jdGlvbiBzY2FsZSh2LCBzLCBvdXRwdXQpIHtcbiAgICBvdXRwdXQueCA9IHYueCAqIHM7XG4gICAgb3V0cHV0LnkgPSB2LnkgKiBzO1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFRoZSBkb3QgcHJvZHVjdCBvZiB0aGUgaW5wdXQgVmVjMidzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYxIFRoZSBsZWZ0IFZlYzIuXG4gKiBAcGFyYW0ge1ZlYzJ9IHYyIFRoZSByaWdodCBWZWMyLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gVGhlIGRvdCBwcm9kdWN0LlxuICovXG5WZWMyLmRvdCA9IGZ1bmN0aW9uIGRvdCh2MSwgdjIpIHtcbiAgICByZXR1cm4gdjEueCAqIHYyLnggKyB2MS55ICogdjIueTtcbn07XG5cbi8qKlxuICogVGhlIGNyb3NzIHByb2R1Y3Qgb2YgdGhlIGlucHV0IFZlYzIncy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHYxIFRoZSBsZWZ0IFZlYzIuXG4gKiBAcGFyYW0ge051bWJlcn0gdjIgVGhlIHJpZ2h0IFZlYzIuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBUaGUgei1jb21wb25lbnQgb2YgdGhlIGNyb3NzIHByb2R1Y3QuXG4gKi9cblZlYzIuY3Jvc3MgPSBmdW5jdGlvbih2MSx2Mikge1xuICAgIHJldHVybiB2MS54ICogdjIueSAtIHYxLnkgKiB2Mi54O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWZWMyO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgdGhyZWUtZGltZW5zaW9uYWwgdmVjdG9yLlxuICpcbiAqIEBjbGFzcyBWZWMzXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggVGhlIHggY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgVGhlIHkgY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHogVGhlIHogY29tcG9uZW50LlxuICovXG52YXIgVmVjMyA9IGZ1bmN0aW9uKHggLHksIHope1xuICAgIHRoaXMueCA9IHggfHwgMDtcbiAgICB0aGlzLnkgPSB5IHx8IDA7XG4gICAgdGhpcy56ID0geiB8fCAwO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGNvbXBvbmVudHMgb2YgdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggVGhlIHggY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHkgVGhlIHkgY29tcG9uZW50LlxuICogQHBhcmFtIHtOdW1iZXJ9IHogVGhlIHogY29tcG9uZW50LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KHgsIHksIHopIHtcbiAgICBpZiAoeCAhPSBudWxsKSB0aGlzLnggPSB4O1xuICAgIGlmICh5ICE9IG51bGwpIHRoaXMueSA9IHk7XG4gICAgaWYgKHogIT0gbnVsbCkgdGhpcy56ID0gejtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgdGhlIGlucHV0IHYgdG8gdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSBWZWMzIHRvIGFkZC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCh2KSB7XG4gICAgdGhpcy54ICs9IHYueDtcbiAgICB0aGlzLnkgKz0gdi55O1xuICAgIHRoaXMueiArPSB2Lno7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU3VidHJhY3QgdGhlIGlucHV0IHYgZnJvbSB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIFZlYzMgdG8gc3VidHJhY3QuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYpIHtcbiAgICB0aGlzLnggLT0gdi54O1xuICAgIHRoaXMueSAtPSB2Lnk7XG4gICAgdGhpcy56IC09IHYuejtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSb3RhdGUgdGhlIGN1cnJlbnQgVmVjMyBieSB0aGV0YSBjbG9ja3dpc2UgYWJvdXQgdGhlIHggYXhpcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZXRhIEFuZ2xlIGJ5IHdoaWNoIHRvIHJvdGF0ZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLnJvdGF0ZVggPSBmdW5jdGlvbiByb3RhdGVYKHRoZXRhKSB7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy55ID0geSAqIGNvc1RoZXRhIC0geiAqIHNpblRoZXRhO1xuICAgIHRoaXMueiA9IHkgKiBzaW5UaGV0YSArIHogKiBjb3NUaGV0YTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSb3RhdGUgdGhlIGN1cnJlbnQgVmVjMyBieSB0aGV0YSBjbG9ja3dpc2UgYWJvdXQgdGhlIHkgYXhpcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZXRhIEFuZ2xlIGJ5IHdoaWNoIHRvIHJvdGF0ZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLnJvdGF0ZVkgPSBmdW5jdGlvbiByb3RhdGVZKHRoZXRhKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy54ID0geiAqIHNpblRoZXRhICsgeCAqIGNvc1RoZXRhO1xuICAgIHRoaXMueiA9IHogKiBjb3NUaGV0YSAtIHggKiBzaW5UaGV0YTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSb3RhdGUgdGhlIGN1cnJlbnQgVmVjMyBieSB0aGV0YSBjbG9ja3dpc2UgYWJvdXQgdGhlIHogYXhpcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRoZXRhIEFuZ2xlIGJ5IHdoaWNoIHRvIHJvdGF0ZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLnJvdGF0ZVogPSBmdW5jdGlvbiByb3RhdGVaKHRoZXRhKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG5cbiAgICB2YXIgY29zVGhldGEgPSBNYXRoLmNvcyh0aGV0YSk7XG4gICAgdmFyIHNpblRoZXRhID0gTWF0aC5zaW4odGhldGEpO1xuXG4gICAgdGhpcy54ID0geCAqIGNvc1RoZXRhIC0geSAqIHNpblRoZXRhO1xuICAgIHRoaXMueSA9IHggKiBzaW5UaGV0YSArIHkgKiBjb3NUaGV0YTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBUaGUgZG90IHByb2R1Y3Qgb2YgdGhlIGN1cnJlbnQgVmVjMyB3aXRoIGlucHV0IFZlYzMgdi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSBvdGhlciBWZWMzLlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuZG90ID0gZnVuY3Rpb24gZG90KHYpIHtcbiAgICByZXR1cm4gdGhpcy54KnYueCArIHRoaXMueSp2LnkgKyB0aGlzLnoqdi56O1xufTtcblxuLyoqXG4gKiBUaGUgZG90IHByb2R1Y3Qgb2YgdGhlIGN1cnJlbnQgVmVjMyB3aXRoIGlucHV0IFZlYzMgdi5cbiAqIFN0b3JlcyB0aGUgcmVzdWx0IGluIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZCBjcm9zc1xuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgb3RoZXIgVmVjM1xuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuY3Jvc3MgPSBmdW5jdGlvbiBjcm9zcyh2KSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgdnggPSB2Lng7XG4gICAgdmFyIHZ5ID0gdi55O1xuICAgIHZhciB2eiA9IHYuejtcblxuICAgIHRoaXMueCA9IHkgKiB2eiAtIHogKiB2eTtcbiAgICB0aGlzLnkgPSB6ICogdnggLSB4ICogdno7XG4gICAgdGhpcy56ID0geCAqIHZ5IC0geSAqIHZ4O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTY2FsZSB0aGUgY3VycmVudCBWZWMzIGJ5IGEgc2NhbGFyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gcyBUaGUgTnVtYmVyIGJ5IHdoaWNoIHRvIHNjYWxlXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHMpIHtcbiAgICB0aGlzLnggKj0gcztcbiAgICB0aGlzLnkgKj0gcztcbiAgICB0aGlzLnogKj0gcztcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBQcmVzZXJ2ZSB0aGUgbWFnbml0dWRlIGJ1dCBpbnZlcnQgdGhlIG9yaWVudGF0aW9uIG9mIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuaW52ZXJ0ID0gZnVuY3Rpb24gaW52ZXJ0KCkge1xuICAgIHRoaXMueCA9IC10aGlzLng7XG4gICAgdGhpcy55ID0gLXRoaXMueTtcbiAgICB0aGlzLnogPSAtdGhpcy56O1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgZnVuY3Rpb24gY29tcG9uZW50LXdpc2UgdG8gdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gRnVuY3Rpb24gdG8gYXBwbHkuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5tYXAgPSBmdW5jdGlvbiBtYXAoZm4pIHtcbiAgICB0aGlzLnggPSBmbih0aGlzLngpO1xuICAgIHRoaXMueSA9IGZuKHRoaXMueSk7XG4gICAgdGhpcy56ID0gZm4odGhpcy56KTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBUaGUgbWFnbml0dWRlIG9mIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIG1hZ25pdHVkZSBvZiB0aGUgVmVjM1xuICovXG5WZWMzLnByb3RvdHlwZS5sZW5ndGggPSBmdW5jdGlvbiBsZW5ndGgoKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICByZXR1cm4gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeik7XG59O1xuXG4vKipcbiAqIFRoZSBtYWduaXR1ZGUgc3F1YXJlZCBvZiB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IG1hZ25pdHVkZSBvZiB0aGUgVmVjMyBzcXVhcmVkXG4gKi9cblZlYzMucHJvdG90eXBlLmxlbmd0aFNxID0gZnVuY3Rpb24gbGVuZ3RoU3EoKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICByZXR1cm4geCAqIHggKyB5ICogeSArIHogKiB6O1xufTtcblxuLyoqXG4gKiBDb3B5IHRoZSBpbnB1dCBvbnRvIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBWZWMzIHRvIGNvcHlcbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiBjb3B5KHYpIHtcbiAgICB0aGlzLnggPSB2Lng7XG4gICAgdGhpcy55ID0gdi55O1xuICAgIHRoaXMueiA9IHYuejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVzZXQgdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgICB0aGlzLnogPSAwO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBtYWduaXR1ZGUgb2YgdGhlIGN1cnJlbnQgVmVjMyBpcyBleGFjdGx5IDAuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHdoZXRoZXIgb3Igbm90IHRoZSBtYWduaXR1ZGUgaXMgemVyb1xuICovXG5WZWMzLnByb3RvdHlwZS5pc1plcm8gPSBmdW5jdGlvbiBpc1plcm8oKSB7XG4gICAgcmV0dXJuIHRoaXMueCA9PT0gMCAmJiB0aGlzLnkgPT09IDAgJiYgdGhpcy56ID09PSAwO1xufTtcblxuLyoqXG4gKiBUaGUgYXJyYXkgZm9ybSBvZiB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gYSB0aHJlZSBlbGVtZW50IGFycmF5IHJlcHJlc2VudGluZyB0aGUgY29tcG9uZW50cyBvZiB0aGUgVmVjM1xuICovXG5WZWMzLnByb3RvdHlwZS50b0FycmF5ID0gZnVuY3Rpb24gdG9BcnJheSgpIHtcbiAgICByZXR1cm4gW3RoaXMueCwgdGhpcy55LCB0aGlzLnpdO1xufTtcblxuLyoqXG4gKiBQcmVzZXJ2ZSB0aGUgb3JpZW50YXRpb24gYnV0IGNoYW5nZSB0aGUgbGVuZ3RoIG9mIHRoZSBjdXJyZW50IFZlYzMgdG8gMS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbiBub3JtYWxpemUoKSB7XG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB2YXIgbGVuID0gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeikgfHwgMTtcbiAgICBsZW4gPSAxIC8gbGVuO1xuXG4gICAgdGhpcy54ICo9IGxlbjtcbiAgICB0aGlzLnkgKj0gbGVuO1xuICAgIHRoaXMueiAqPSBsZW47XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGx5IHRoZSByb3RhdGlvbiBjb3JyZXNwb25kaW5nIHRvIHRoZSBpbnB1dCAodW5pdCkgUXVhdGVybmlvblxuICogdG8gdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtRdWF0ZXJuaW9ufSBxIFVuaXQgUXVhdGVybmlvbiByZXByZXNlbnRpbmcgdGhlIHJvdGF0aW9uIHRvIGFwcGx5XG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5hcHBseVJvdGF0aW9uID0gZnVuY3Rpb24gYXBwbHlSb3RhdGlvbihxKSB7XG4gICAgdmFyIGN3ID0gcS53O1xuICAgIHZhciBjeCA9IC1xLng7XG4gICAgdmFyIGN5ID0gLXEueTtcbiAgICB2YXIgY3ogPSAtcS56O1xuXG4gICAgdmFyIHZ4ID0gdGhpcy54O1xuICAgIHZhciB2eSA9IHRoaXMueTtcbiAgICB2YXIgdnogPSB0aGlzLno7XG5cbiAgICB2YXIgdHcgPSAtY3ggKiB2eCAtIGN5ICogdnkgLSBjeiAqIHZ6O1xuICAgIHZhciB0eCA9IHZ4ICogY3cgKyB2eSAqIGN6IC0gY3kgKiB2ejtcbiAgICB2YXIgdHkgPSB2eSAqIGN3ICsgY3ggKiB2eiAtIHZ4ICogY3o7XG4gICAgdmFyIHR6ID0gdnogKiBjdyArIHZ4ICogY3kgLSBjeCAqIHZ5O1xuXG4gICAgdmFyIHcgPSBjdztcbiAgICB2YXIgeCA9IC1jeDtcbiAgICB2YXIgeSA9IC1jeTtcbiAgICB2YXIgeiA9IC1jejtcblxuICAgIHRoaXMueCA9IHR4ICogdyArIHggKiB0dyArIHkgKiB0eiAtIHR5ICogejtcbiAgICB0aGlzLnkgPSB0eSAqIHcgKyB5ICogdHcgKyB0eCAqIHogLSB4ICogdHo7XG4gICAgdGhpcy56ID0gdHogKiB3ICsgeiAqIHR3ICsgeCAqIHR5IC0gdHggKiB5O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBcHBseSB0aGUgaW5wdXQgTWF0MzMgdGhlIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TWF0MzN9IG1hdHJpeCBNYXQzMyB0byBhcHBseVxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuYXBwbHlNYXRyaXggPSBmdW5jdGlvbiBhcHBseU1hdHJpeChtYXRyaXgpIHtcbiAgICB2YXIgTSA9IG1hdHJpeC5nZXQoKTtcblxuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuICAgIHZhciB6ID0gdGhpcy56O1xuXG4gICAgdGhpcy54ID0gTVswXSp4ICsgTVsxXSp5ICsgTVsyXSp6O1xuICAgIHRoaXMueSA9IE1bM10qeCArIE1bNF0qeSArIE1bNV0qejtcbiAgICB0aGlzLnogPSBNWzZdKnggKyBNWzddKnkgKyBNWzhdKno7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgaW5wdXQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSByZWZlcmVuY2UgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSBUaGUgbm9ybWFsaXplIFZlYzMuXG4gKi9cblZlYzMubm9ybWFsaXplID0gZnVuY3Rpb24gbm9ybWFsaXplKHYsIG91dHB1dCkge1xuICAgIHZhciB4ID0gdi54O1xuICAgIHZhciB5ID0gdi55O1xuICAgIHZhciB6ID0gdi56O1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopIHx8IDE7XG4gICAgbGVuZ3RoID0gMSAvIGxlbmd0aDtcblxuICAgIG91dHB1dC54ID0geCAqIGxlbmd0aDtcbiAgICBvdXRwdXQueSA9IHkgKiBsZW5ndGg7XG4gICAgb3V0cHV0LnogPSB6ICogbGVuZ3RoO1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIEFwcGx5IGEgcm90YXRpb24gdG8gdGhlIGlucHV0IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgcmVmZXJlbmNlIFZlYzMuXG4gKiBAcGFyYW0ge1F1YXRlcm5pb259IHEgVW5pdCBRdWF0ZXJuaW9uIHJlcHJlc2VudGluZyB0aGUgcm90YXRpb24gdG8gYXBwbHkuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjM30gVGhlIHJvdGF0ZWQgdmVyc2lvbiBvZiB0aGUgaW5wdXQgVmVjMy5cbiAqL1xuVmVjMy5hcHBseVJvdGF0aW9uID0gZnVuY3Rpb24gYXBwbHlSb3RhdGlvbih2LCBxLCBvdXRwdXQpIHtcbiAgICB2YXIgY3cgPSBxLnc7XG4gICAgdmFyIGN4ID0gLXEueDtcbiAgICB2YXIgY3kgPSAtcS55O1xuICAgIHZhciBjeiA9IC1xLno7XG5cbiAgICB2YXIgdnggPSB2Lng7XG4gICAgdmFyIHZ5ID0gdi55O1xuICAgIHZhciB2eiA9IHYuejtcblxuICAgIHZhciB0dyA9IC1jeCAqIHZ4IC0gY3kgKiB2eSAtIGN6ICogdno7XG4gICAgdmFyIHR4ID0gdnggKiBjdyArIHZ5ICogY3ogLSBjeSAqIHZ6O1xuICAgIHZhciB0eSA9IHZ5ICogY3cgKyBjeCAqIHZ6IC0gdnggKiBjejtcbiAgICB2YXIgdHogPSB2eiAqIGN3ICsgdnggKiBjeSAtIGN4ICogdnk7XG5cbiAgICB2YXIgdyA9IGN3O1xuICAgIHZhciB4ID0gLWN4O1xuICAgIHZhciB5ID0gLWN5O1xuICAgIHZhciB6ID0gLWN6O1xuXG4gICAgb3V0cHV0LnggPSB0eCAqIHcgKyB4ICogdHcgKyB5ICogdHogLSB0eSAqIHo7XG4gICAgb3V0cHV0LnkgPSB0eSAqIHcgKyB5ICogdHcgKyB0eCAqIHogLSB4ICogdHo7XG4gICAgb3V0cHV0LnogPSB0eiAqIHcgKyB6ICogdHcgKyB4ICogdHkgLSB0eCAqIHk7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogQ2xvbmUgdGhlIGlucHV0IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgVmVjMyB0byBjbG9uZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSBUaGUgY2xvbmVkIFZlYzMuXG4gKi9cblZlYzMuY2xvbmUgPSBmdW5jdGlvbiBjbG9uZSh2KSB7XG4gICAgcmV0dXJuIG5ldyBWZWMzKHYueCwgdi55LCB2LnopO1xufTtcblxuLyoqXG4gKiBBZGQgdGhlIGlucHV0IFZlYzMncy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2MSBUaGUgbGVmdCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSB2MiBUaGUgcmlnaHQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSBUaGUgcmVzdWx0IG9mIHRoZSBhZGRpdGlvbi5cbiAqL1xuVmVjMy5hZGQgPSBmdW5jdGlvbiBhZGQodjEsIHYyLCBvdXRwdXQpIHtcbiAgICBvdXRwdXQueCA9IHYxLnggKyB2Mi54O1xuICAgIG91dHB1dC55ID0gdjEueSArIHYyLnk7XG4gICAgb3V0cHV0LnogPSB2MS56ICsgdjIuejtcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBTdWJ0cmFjdCB0aGUgc2Vjb25kIFZlYzMgZnJvbSB0aGUgZmlyc3QuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdjEgVGhlIGxlZnQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gdjIgVGhlIHJpZ2h0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjM30gVGhlIHJlc3VsdCBvZiB0aGUgc3VidHJhY3Rpb24uXG4gKi9cblZlYzMuc3VidHJhY3QgPSBmdW5jdGlvbiBzdWJ0cmFjdCh2MSwgdjIsIG91dHB1dCkge1xuICAgIG91dHB1dC54ID0gdjEueCAtIHYyLng7XG4gICAgb3V0cHV0LnkgPSB2MS55IC0gdjIueTtcbiAgICBvdXRwdXQueiA9IHYxLnogLSB2Mi56O1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBpbnB1dCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIHJlZmVyZW5jZSBWZWMzLlxuICogQHBhcmFtIHtOdW1iZXJ9IHMgTnVtYmVyIHRvIHNjYWxlIGJ5LlxuICogQHBhcmFtIHtWZWMzfSBvdXRwdXQgVmVjMyBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IFRoZSByZXN1bHQgb2YgdGhlIHNjYWxpbmcuXG4gKi9cblZlYzMuc2NhbGUgPSBmdW5jdGlvbiBzY2FsZSh2LCBzLCBvdXRwdXQpIHtcbiAgICBvdXRwdXQueCA9IHYueCAqIHM7XG4gICAgb3V0cHV0LnkgPSB2LnkgKiBzO1xuICAgIG91dHB1dC56ID0gdi56ICogcztcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBUaGUgZG90IHByb2R1Y3Qgb2YgdGhlIGlucHV0IFZlYzMncy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2MSBUaGUgbGVmdCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSB2MiBUaGUgcmlnaHQgVmVjMy5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IFRoZSBkb3QgcHJvZHVjdC5cbiAqL1xuVmVjMy5kb3QgPSBmdW5jdGlvbiBkb3QodjEsIHYyKSB7XG4gICAgcmV0dXJuIHYxLnggKiB2Mi54ICsgdjEueSAqIHYyLnkgKyB2MS56ICogdjIuejtcbn07XG5cbi8qKlxuICogVGhlIChyaWdodC1oYW5kZWQpIGNyb3NzIHByb2R1Y3Qgb2YgdGhlIGlucHV0IFZlYzMncy5cbiAqIHYxIHggdjIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdjEgVGhlIGxlZnQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gdjIgVGhlIHJpZ2h0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgb2JqZWN0IHRoZSByZXN1bHQgb2YgdGhlIGNyb3NzIHByb2R1Y3Qgd2FzIHBsYWNlZCBpbnRvXG4gKi9cblZlYzMuY3Jvc3MgPSBmdW5jdGlvbiBjcm9zcyh2MSwgdjIsIG91dHB1dCkge1xuICAgIHZhciB4MSA9IHYxLng7XG4gICAgdmFyIHkxID0gdjEueTtcbiAgICB2YXIgejEgPSB2MS56O1xuICAgIHZhciB4MiA9IHYyLng7XG4gICAgdmFyIHkyID0gdjIueTtcbiAgICB2YXIgejIgPSB2Mi56O1xuXG4gICAgb3V0cHV0LnggPSB5MSAqIHoyIC0gejEgKiB5MjtcbiAgICBvdXRwdXQueSA9IHoxICogeDIgLSB4MSAqIHoyO1xuICAgIG91dHB1dC56ID0geDEgKiB5MiAtIHkxICogeDI7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogVGhlIHByb2plY3Rpb24gb2YgdjEgb250byB2Mi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2MSBUaGUgbGVmdCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSB2MiBUaGUgcmlnaHQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBvYmplY3QgdGhlIHJlc3VsdCBvZiB0aGUgY3Jvc3MgcHJvZHVjdCB3YXMgcGxhY2VkIGludG8gXG4gKi9cblZlYzMucHJvamVjdCA9IGZ1bmN0aW9uIHByb2plY3QodjEsIHYyLCBvdXRwdXQpIHtcbiAgICB2YXIgeDEgPSB2MS54O1xuICAgIHZhciB5MSA9IHYxLnk7XG4gICAgdmFyIHoxID0gdjEuejtcbiAgICB2YXIgeDIgPSB2Mi54O1xuICAgIHZhciB5MiA9IHYyLnk7XG4gICAgdmFyIHoyID0gdjIuejtcblxuICAgIHZhciBzY2FsZSA9IHgxICogeDIgKyB5MSAqIHkyICsgejEgKiB6MjtcbiAgICBzY2FsZSAvPSB4MiAqIHgyICsgeTIgKiB5MiArIHoyICogejI7XG5cbiAgICBvdXRwdXQueCA9IHgyICogc2NhbGU7XG4gICAgb3V0cHV0LnkgPSB5MiAqIHNjYWxlO1xuICAgIG91dHB1dC56ID0gejIgKiBzY2FsZTtcblxuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlYzM7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IG5vb3BcblxuZnVuY3Rpb24gbm9vcCgpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgJ1lvdSBzaG91bGQgYnVuZGxlIHlvdXIgY29kZSAnICtcbiAgICAgICd1c2luZyBgZ2xzbGlmeWAgYXMgYSB0cmFuc2Zvcm0uJ1xuICApXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHByb2dyYW1pZnlcblxuZnVuY3Rpb24gcHJvZ3JhbWlmeSh2ZXJ0ZXgsIGZyYWdtZW50LCB1bmlmb3JtcywgYXR0cmlidXRlcykge1xuICByZXR1cm4ge1xuICAgIHZlcnRleDogdmVydGV4LCBcbiAgICBmcmFnbWVudDogZnJhZ21lbnQsXG4gICAgdW5pZm9ybXM6IHVuaWZvcm1zLCBcbiAgICBhdHRyaWJ1dGVzOiBhdHRyaWJ1dGVzXG4gIH07XG59XG4iLCIvLyBodHRwOi8vcGF1bGlyaXNoLmNvbS8yMDExL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtYW5pbWF0aW5nL1xuLy8gaHR0cDovL215Lm9wZXJhLmNvbS9lbW9sbGVyL2Jsb2cvMjAxMS8xMi8yMC9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWVyLWFuaW1hdGluZ1xuLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHBvbHlmaWxsIGJ5IEVyaWsgTcO2bGxlci4gZml4ZXMgZnJvbSBQYXVsIElyaXNoIGFuZCBUaW5vIFppamRlbFxuLy8gTUlUIGxpY2Vuc2VcblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgbGFzdFRpbWUgPSAwO1xudmFyIHZlbmRvcnMgPSBbJ21zJywgJ21veicsICd3ZWJraXQnLCAnbyddO1xuXG52YXIgckFGLCBjQUY7XG5cbmlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0Jykge1xuICAgIHJBRiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG4gICAgY0FGID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lIHx8IHdpbmRvdy5jYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG4gICAgZm9yICh2YXIgeCA9IDA7IHggPCB2ZW5kb3JzLmxlbmd0aCAmJiAhckFGOyArK3gpIHtcbiAgICAgICAgckFGID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ107XG4gICAgICAgIGNBRiA9IHdpbmRvd1t2ZW5kb3JzW3hdICsgJ0NhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZSddIHx8XG4gICAgICAgICAgICAgIHdpbmRvd1t2ZW5kb3JzW3hdICsgJ0NhbmNlbEFuaW1hdGlvbkZyYW1lJ107XG4gICAgfVxuXG4gICAgaWYgKHJBRiAmJiAhY0FGKSB7XG4gICAgICAgIC8vIGNBRiBub3Qgc3VwcG9ydGVkLlxuICAgICAgICAvLyBGYWxsIGJhY2sgdG8gc2V0SW50ZXJ2YWwgZm9yIG5vdyAodmVyeSByYXJlKS5cbiAgICAgICAgckFGID0gbnVsbDtcbiAgICB9XG59XG5cbmlmICghckFGKSB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93ID8gRGF0ZS5ub3cgOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICB9O1xuXG4gICAgckFGID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGN1cnJUaW1lID0gbm93KCk7XG4gICAgICAgIHZhciB0aW1lVG9DYWxsID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyclRpbWUgLSBsYXN0VGltZSkpO1xuICAgICAgICB2YXIgaWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGN1cnJUaW1lICsgdGltZVRvQ2FsbCk7XG4gICAgICAgIH0sIHRpbWVUb0NhbGwpO1xuICAgICAgICBsYXN0VGltZSA9IGN1cnJUaW1lICsgdGltZVRvQ2FsbDtcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH07XG5cbiAgICBjQUYgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KGlkKTtcbiAgICB9O1xufVxuXG52YXIgYW5pbWF0aW9uRnJhbWUgPSB7XG4gICAgLyoqXG4gICAgICogQ3Jvc3MgYnJvd3NlciB2ZXJzaW9uIG9mIFtyZXF1ZXN0QW5pbWF0aW9uRnJhbWVde0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS93aW5kb3cvcmVxdWVzdEFuaW1hdGlvbkZyYW1lfS5cbiAgICAgKlxuICAgICAqIFVzZWQgYnkgRW5naW5lIGluIG9yZGVyIHRvIGVzdGFibGlzaCBhIHJlbmRlciBsb29wLlxuICAgICAqXG4gICAgICogSWYgbm8gKHZlbmRvciBwcmVmaXhlZCB2ZXJzaW9uIG9mKSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYCBpcyBhdmFpbGFibGUsXG4gICAgICogYHNldFRpbWVvdXRgIHdpbGwgYmUgdXNlZCBpbiBvcmRlciB0byBlbXVsYXRlIGEgcmVuZGVyIGxvb3AgcnVubmluZyBhdFxuICAgICAqIGFwcHJveGltYXRlbHkgNjAgZnJhbWVzIHBlciBzZWNvbmQuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kICByZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgICAgKlxuICAgICAqIEBwYXJhbSAgIHtGdW5jdGlvbn0gIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgb24gdGhlIG5leHQgZnJhbWUuXG4gICAgICogQHJldHVybiAge051bWJlcn0gICAgcmVxdWVzdElkIHRvIGJlIHVzZWQgdG8gY2FuY2VsIHRoZSByZXF1ZXN0IHVzaW5nXG4gICAgICogICAgICAgICAgICAgICAgICAgICAge0BsaW5rIGNhbmNlbEFuaW1hdGlvbkZyYW1lfS5cbiAgICAgKi9cbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6IHJBRixcblxuICAgIC8qKlxuICAgICAqIENyb3NzIGJyb3dzZXIgdmVyc2lvbiBvZiBbY2FuY2VsQW5pbWF0aW9uRnJhbWVde0BsaW5rIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS93aW5kb3cvY2FuY2VsQW5pbWF0aW9uRnJhbWV9LlxuICAgICAqXG4gICAgICogQ2FuY2VscyBhIHByZXZpb3VzbHkgdXNpbmcgW3JlcXVlc3RBbmltYXRpb25GcmFtZV17QGxpbmsgYW5pbWF0aW9uRnJhbWUjcmVxdWVzdEFuaW1hdGlvbkZyYW1lfVxuICAgICAqIHNjaGVkdWxlZCByZXF1ZXN0LlxuICAgICAqXG4gICAgICogVXNlZCBmb3IgaW1tZWRpYXRlbHkgc3RvcHBpbmcgdGhlIHJlbmRlciBsb29wIHdpdGhpbiB0aGUgRW5naW5lLlxuICAgICAqXG4gICAgICogQG1ldGhvZCAgY2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgICAgKlxuICAgICAqIEBwYXJhbSAgIHtOdW1iZXJ9ICAgIHJlcXVlc3RJZCBvZiB0aGUgc2NoZWR1bGVkIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgcmV0dXJuZWQgYnkgW3JlcXVlc3RBbmltYXRpb25GcmFtZV17QGxpbmsgYW5pbWF0aW9uRnJhbWUjcmVxdWVzdEFuaW1hdGlvbkZyYW1lfS5cbiAgICAgKi9cbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZTogY0FGXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGFuaW1hdGlvbkZyYW1lO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqIFxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqIFxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICogXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKiBcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lOiByZXF1aXJlKCcuL2FuaW1hdGlvbkZyYW1lJykucmVxdWVzdEFuaW1hdGlvbkZyYW1lLFxuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lOiByZXF1aXJlKCcuL2FuaW1hdGlvbkZyYW1lJykuY2FuY2VsQW5pbWF0aW9uRnJhbWVcbn07XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBwb2x5ZmlsbHMgPSByZXF1aXJlKCcuLi9wb2x5ZmlsbHMnKTtcbnZhciByQUYgPSBwb2x5ZmlsbHMucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xudmFyIGNBRiA9IHBvbHlmaWxscy5jYW5jZWxBbmltYXRpb25GcmFtZTtcblxuLyoqXG4gKiBCb29sZWFuIGNvbnN0YW50IGluZGljYXRpbmcgd2hldGhlciB0aGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBoYXMgYWNjZXNzXG4gKiB0byB0aGUgZG9jdW1lbnQuIFRoZSBkb2N1bWVudCBpcyBiZWluZyB1c2VkIGluIG9yZGVyIHRvIHN1YnNjcmliZSBmb3JcbiAqIHZpc2liaWxpdHljaGFuZ2UgZXZlbnRzIHVzZWQgZm9yIG5vcm1hbGl6aW5nIHRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wXG4gKiB0aW1lIHdoZW4gZS5nLiB3aGVuIHN3aXRjaGluZyB0YWJzLlxuICpcbiAqIEBjb25zdGFudFxuICogQHR5cGUge0Jvb2xlYW59XG4gKi9cbnZhciBET0NVTUVOVF9BQ0NFU1MgPSB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnO1xuXG5pZiAoRE9DVU1FTlRfQUNDRVNTKSB7XG4gICAgdmFyIFZFTkRPUl9ISURERU4sIFZFTkRPUl9WSVNJQklMSVRZX0NIQU5HRTtcblxuICAgIC8vIE9wZXJhIDEyLjEwIGFuZCBGaXJlZm94IDE4IGFuZCBsYXRlciBzdXBwb3J0XG4gICAgaWYgKHR5cGVvZiBkb2N1bWVudC5oaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIFZFTkRPUl9ISURERU4gPSAnaGlkZGVuJztcbiAgICAgICAgVkVORE9SX1ZJU0lCSUxJVFlfQ0hBTkdFID0gJ3Zpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubW96SGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBWRU5ET1JfSElEREVOID0gJ21vekhpZGRlbic7XG4gICAgICAgIFZFTkRPUl9WSVNJQklMSVRZX0NIQU5HRSA9ICdtb3p2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1zSGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBWRU5ET1JfSElEREVOID0gJ21zSGlkZGVuJztcbiAgICAgICAgVkVORE9SX1ZJU0lCSUxJVFlfQ0hBTkdFID0gJ21zdmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC53ZWJraXRIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIFZFTkRPUl9ISURERU4gPSAnd2Via2l0SGlkZGVuJztcbiAgICAgICAgVkVORE9SX1ZJU0lCSUxJVFlfQ0hBTkdFID0gJ3dlYmtpdHZpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbn1cblxuLyoqXG4gKiBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIGNsYXNzIHVzZWQgZm9yIHVwZGF0aW5nIG9iamVjdHMgb24gYSBmcmFtZS1ieS1mcmFtZS5cbiAqIFN5bmNocm9uaXplcyB0aGUgYHVwZGF0ZWAgbWV0aG9kIGludm9jYXRpb25zIHRvIHRoZSByZWZyZXNoIHJhdGUgb2YgdGhlXG4gKiBzY3JlZW4uIE1hbmFnZXMgdGhlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLWxvb3AgYnkgbm9ybWFsaXppbmcgdGhlIHBhc3NlZCBpblxuICogdGltZXN0YW1wIHdoZW4gc3dpdGNoaW5nIHRhYnMuXG4gKlxuICogQGNsYXNzIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3BcbiAqL1xuZnVuY3Rpb24gUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCgpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgLy8gUmVmZXJlbmNlcyB0byBvYmplY3RzIHRvIGJlIHVwZGF0ZWQgb24gbmV4dCBmcmFtZS5cbiAgICB0aGlzLl91cGRhdGVzID0gW107XG5cbiAgICB0aGlzLl9sb29wZXIgPSBmdW5jdGlvbih0aW1lKSB7XG4gICAgICAgIF90aGlzLmxvb3AodGltZSk7XG4gICAgfTtcbiAgICB0aGlzLl90aW1lID0gMDtcbiAgICB0aGlzLl9zdG9wcGVkQXQgPSAwO1xuICAgIHRoaXMuX3NsZWVwID0gMDtcblxuICAgIC8vIEluZGljYXRlcyB3aGV0aGVyIHRoZSBlbmdpbmUgc2hvdWxkIGJlIHJlc3RhcnRlZCB3aGVuIHRoZSB0YWIvIHdpbmRvdyBpc1xuICAgIC8vIGJlaW5nIGZvY3VzZWQgYWdhaW4gKHZpc2liaWxpdHkgY2hhbmdlKS5cbiAgICB0aGlzLl9zdGFydE9uVmlzaWJpbGl0eUNoYW5nZSA9IHRydWU7XG5cbiAgICAvLyByZXF1ZXN0SWQgYXMgcmV0dXJuZWQgYnkgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGZ1bmN0aW9uO1xuICAgIHRoaXMuX3JBRiA9IG51bGw7XG5cbiAgICB0aGlzLl9zbGVlcERpZmYgPSB0cnVlO1xuXG4gICAgLy8gVGhlIGVuZ2luZSBpcyBiZWluZyBzdGFydGVkIG9uIGluc3RhbnRpYXRpb24uXG4gICAgLy8gVE9ETyhhbGV4YW5kZXJHdWdlbClcbiAgICB0aGlzLnN0YXJ0KCk7XG5cbiAgICAvLyBUaGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBzdXBwb3J0cyBydW5uaW5nIGluIGEgbm9uLWJyb3dzZXJcbiAgICAvLyBlbnZpcm9ubWVudCAoZS5nLiBXb3JrZXIpLlxuICAgIGlmIChET0NVTUVOVF9BQ0NFU1MpIHtcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuX29uVmlzaWJpbGl0eUNoYW5nZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8qKlxuICogSGFuZGxlIHRoZSBzd2l0Y2hpbmcgb2YgdGFicy5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLl9vblZpc2liaWxpdHlDaGFuZ2UgPSBmdW5jdGlvbiBfb25WaXNpYmlsaXR5Q2hhbmdlKCkge1xuICAgIGlmIChkb2N1bWVudFtWRU5ET1JfSElEREVOXSkge1xuICAgICAgICB0aGlzLl9vblVuZm9jdXMoKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX29uRm9jdXMoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB0byBiZSBpbnZva2VkIGFzIHNvb24gYXMgdGhlIHdpbmRvdy8gdGFiIGlzIGJlaW5nXG4gKiBmb2N1c2VkIGFmdGVyIGEgdmlzaWJpbHRpeSBjaGFuZ2UuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5fb25Gb2N1cyA9IGZ1bmN0aW9uIF9vbkZvY3VzKCkge1xuICAgIGlmICh0aGlzLl9zdGFydE9uVmlzaWJpbGl0eUNoYW5nZSkge1xuICAgICAgICB0aGlzLl9zdGFydCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgYXMgc29vbiBhcyB0aGUgd2luZG93LyB0YWIgaXMgYmVpbmdcbiAqIHVuZm9jdXNlZCAoaGlkZGVuKSBhZnRlciBhIHZpc2liaWx0aXkgY2hhbmdlLlxuICpcbiAqIEBtZXRob2QgIF9vbkZvY3VzXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLl9vblVuZm9jdXMgPSBmdW5jdGlvbiBfb25VbmZvY3VzKCkge1xuICAgIHRoaXMuX3N0b3AoKTtcbn07XG5cbi8qKlxuICogU3RhcnRzIHRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLiBXaGVuIHN3aXRjaGluZyB0byBhIGRpZmZlcm50IHRhYi9cbiAqIHdpbmRvdyAoY2hhbmdpbmcgdGhlIHZpc2liaWx0aXkpLCB0aGUgZW5naW5lIHdpbGwgYmUgcmV0YXJ0ZWQgd2hlbiBzd2l0Y2hpbmdcbiAqIGJhY2sgdG8gYSB2aXNpYmxlIHN0YXRlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gc3RhcnQoKSB7XG4gICAgaWYgKCF0aGlzLl9ydW5uaW5nKSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0T25WaXNpYmlsaXR5Q2hhbmdlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fc3RhcnQoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEludGVybmFsIHZlcnNpb24gb2YgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCdzIHN0YXJ0IGZ1bmN0aW9uLCBub3QgYWZmZWN0aW5nXG4gKiBiZWhhdmlvciBvbiB2aXNpYmlsdHkgY2hhbmdlLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4qXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5fc3RhcnQgPSBmdW5jdGlvbiBfc3RhcnQoKSB7XG4gICAgdGhpcy5fcnVubmluZyA9IHRydWU7XG4gICAgdGhpcy5fc2xlZXBEaWZmID0gdHJ1ZTtcbiAgICB0aGlzLl9yQUYgPSByQUYodGhpcy5fbG9vcGVyKTtcbn07XG5cbi8qKlxuICogU3RvcHMgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiBzdG9wKCkge1xuICAgIGlmICh0aGlzLl9ydW5uaW5nKSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0T25WaXNpYmlsaXR5Q2hhbmdlID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX3N0b3AoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEludGVybmFsIHZlcnNpb24gb2YgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCdzIHN0b3AgZnVuY3Rpb24sIG5vdCBhZmZlY3RpbmdcbiAqIGJlaGF2aW9yIG9uIHZpc2liaWx0eSBjaGFuZ2UuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5fc3RvcCA9IGZ1bmN0aW9uIF9zdG9wKCkge1xuICAgIHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcbiAgICB0aGlzLl9zdG9wcGVkQXQgPSB0aGlzLl90aW1lO1xuXG4gICAgLy8gQnVnIGluIG9sZCB2ZXJzaW9ucyBvZiBGeC4gRXhwbGljaXRseSBjYW5jZWwuXG4gICAgY0FGKHRoaXMuX3JBRik7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBpcyBjdXJyZW50bHkgcnVubmluZyBvciBub3QuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IGJvb2xlYW4gdmFsdWUgaW5kaWNhdGluZyB3aGV0aGVyIHRoZVxuICogUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBpcyBjdXJyZW50bHkgcnVubmluZyBvciBub3RcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuaXNSdW5uaW5nID0gZnVuY3Rpb24gaXNSdW5uaW5nKCkge1xuICAgIHJldHVybiB0aGlzLl9ydW5uaW5nO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIGFsbCByZWdpc3RlcmVkIG9iamVjdHMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGhpZ2ggcmVzb2x1dGlvbiB0aW1zdGFtcCB1c2VkIGZvciBpbnZva2luZyB0aGUgYHVwZGF0ZWBcbiAqIG1ldGhvZCBvbiBhbGwgcmVnaXN0ZXJlZCBvYmplY3RzXG4gKlxuICogQHJldHVybiB7UmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcH0gdGhpc1xuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5zdGVwID0gZnVuY3Rpb24gc3RlcCAodGltZSkge1xuICAgIHRoaXMuX3RpbWUgPSB0aW1lO1xuICAgIGlmICh0aGlzLl9zbGVlcERpZmYpIHtcbiAgICAgICAgdGhpcy5fc2xlZXAgKz0gdGltZSAtIHRoaXMuX3N0b3BwZWRBdDtcbiAgICAgICAgdGhpcy5fc2xlZXBEaWZmID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gVGhlIHNhbWUgdGltZXRhbXAgd2lsbCBiZSBlbWl0dGVkIGltbWVkaWF0ZWx5IGJlZm9yZSBhbmQgYWZ0ZXIgdmlzaWJpbGl0eVxuICAgIC8vIGNoYW5nZS5cbiAgICB2YXIgbm9ybWFsaXplZFRpbWUgPSB0aW1lIC0gdGhpcy5fc2xlZXA7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMuX3VwZGF0ZXMubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICB0aGlzLl91cGRhdGVzW2ldLnVwZGF0ZShub3JtYWxpemVkVGltZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBNZXRob2QgYmVpbmcgY2FsbGVkIGJ5IGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIG9uIGV2ZXJ5IHBhaW50LiBJbmRpcmVjdGx5XG4gKiByZWN1cnNpdmUgYnkgc2NoZWR1bGluZyBhIGZ1dHVyZSBpbnZvY2F0aW9uIG9mIGl0c2VsZiBvbiB0aGUgbmV4dCBwYWludC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgaGlnaCByZXNvbHV0aW9uIHRpbXN0YW1wIHVzZWQgZm9yIGludm9raW5nIHRoZSBgdXBkYXRlYFxuICogbWV0aG9kIG9uIGFsbCByZWdpc3RlcmVkIG9iamVjdHNcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUubG9vcCA9IGZ1bmN0aW9uIGxvb3AodGltZSkge1xuICAgIHRoaXMuc3RlcCh0aW1lKTtcbiAgICB0aGlzLl9yQUYgPSByQUYodGhpcy5fbG9vcGVyKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVnaXN0ZXJlcyBhbiB1cGRhdGVhYmxlIG9iamVjdCB3aGljaCBgdXBkYXRlYCBtZXRob2Qgc2hvdWxkIGJlIGludm9rZWQgb25cbiAqIGV2ZXJ5IHBhaW50LCBzdGFydGluZyBvbiB0aGUgbmV4dCBwYWludCAoYXNzdW1pbmcgdGhlXG4gKiBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIGlzIHJ1bm5pbmcpLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdXBkYXRlYWJsZSBvYmplY3QgdG8gYmUgdXBkYXRlZFxuICogQHBhcmFtIHtGdW5jdGlvbn0gdXBkYXRlYWJsZS51cGRhdGUgdXBkYXRlIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiB0aGVcbiAqIHJlZ2lzdGVyZWQgb2JqZWN0XG4gKlxuICogQHJldHVybiB7UmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcH0gdGhpc1xuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUodXBkYXRlYWJsZSkge1xuICAgIGlmICh0aGlzLl91cGRhdGVzLmluZGV4T2YodXBkYXRlYWJsZSkgPT09IC0xKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZXMucHVzaCh1cGRhdGVhYmxlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERlcmVnaXN0ZXJzIGFuIHVwZGF0ZWFibGUgb2JqZWN0IHByZXZpb3VzbHkgcmVnaXN0ZXJlZCB1c2luZyBgdXBkYXRlYCB0byBiZVxuICogbm8gbG9uZ2VyIHVwZGF0ZWQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGVhYmxlIHVwZGF0ZWFibGUgb2JqZWN0IHByZXZpb3VzbHkgcmVnaXN0ZXJlZCB1c2luZ1xuICogYHVwZGF0ZWBcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLm5vTG9uZ2VyVXBkYXRlID0gZnVuY3Rpb24gbm9Mb25nZXJVcGRhdGUodXBkYXRlYWJsZSkge1xuICAgIHZhciBpbmRleCA9IHRoaXMuX3VwZGF0ZXMuaW5kZXhPZih1cGRhdGVhYmxlKTtcbiAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICB0aGlzLl91cGRhdGVzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29udGV4dCA9IHJlcXVpcmUoJy4vQ29udGV4dCcpO1xudmFyIGluamVjdENTUyA9IHJlcXVpcmUoJy4vaW5qZWN0LWNzcycpO1xuXG4vKipcbiAqIEluc3RhbnRpYXRlcyBhIG5ldyBDb21wb3NpdG9yLlxuICogVGhlIENvbXBvc2l0b3IgcmVjZWl2ZXMgZHJhdyBjb21tYW5kcyBmcm0gdGhlIFVJTWFuYWdlciBhbmQgcm91dGVzIHRoZSB0byB0aGVcbiAqIHJlc3BlY3RpdmUgY29udGV4dCBvYmplY3RzLlxuICpcbiAqIFVwb24gY3JlYXRpb24sIGl0IGluamVjdHMgYSBzdHlsZXNoZWV0IHVzZWQgZm9yIHN0eWxpbmcgdGhlIGluZGl2aWR1YWxcbiAqIHJlbmRlcmVycyB1c2VkIGluIHRoZSBjb250ZXh0IG9iamVjdHMuXG4gKlxuICogQGNsYXNzIENvbXBvc2l0b3JcbiAqIEBjb25zdHJ1Y3RvclxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gQ29tcG9zaXRvcigpIHtcbiAgICBpbmplY3RDU1MoKTtcblxuICAgIHRoaXMuX2NvbnRleHRzID0ge307XG4gICAgdGhpcy5fb3V0Q29tbWFuZHMgPSBbXTtcbiAgICB0aGlzLl9pbkNvbW1hbmRzID0gW107XG4gICAgdGhpcy5fdGltZSA9IG51bGw7XG5cbiAgICB0aGlzLl9yZXNpemVkID0gZmFsc2U7XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgX3RoaXMuX3Jlc2l6ZWQgPSB0cnVlO1xuICAgIH0pO1xufVxuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgdGltZSBiZWluZyB1c2VkIGJ5IHRoZSBpbnRlcm5hbCBjbG9jayBtYW5hZ2VkIGJ5XG4gKiBgRmFtb3VzRW5naW5lYC5cbiAqXG4gKiBUaGUgdGltZSBpcyBiZWluZyBwYXNzZWQgaW50byBjb3JlIGJ5IHRoZSBFbmdpbmUgdGhyb3VnaCB0aGUgVUlNYW5hZ2VyLlxuICogU2luY2UgY29yZSBoYXMgdGhlIGFiaWxpdHkgdG8gc2NhbGUgdGhlIHRpbWUsIHRoZSB0aW1lIG5lZWRzIHRvIGJlIHBhc3NlZFxuICogYmFjayB0byB0aGUgcmVuZGVyaW5nIHN5c3RlbS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aW1lIFRoZSBjbG9jayB0aW1lIHVzZWQgaW4gY29yZS5cbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuZ2V0VGltZSA9IGZ1bmN0aW9uIGdldFRpbWUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3RpbWU7XG59O1xuXG4vKipcbiAqIFNjaGVkdWxlcyBhbiBldmVudCB0byBiZSBzZW50IHRoZSBuZXh0IHRpbWUgdGhlIG91dCBjb21tYW5kIHF1ZXVlIGlzIGJlaW5nXG4gKiBmbHVzaGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBwYXRoIFJlbmRlciBwYXRoIHRvIHRoZSBub2RlIHRoZSBldmVudCBzaG91bGQgYmUgdHJpZ2dlcmVkXG4gKiBvbiAoKnRhcmdldGVkIGV2ZW50KilcbiAqIEBwYXJhbSAge1N0cmluZ30gZXYgRXZlbnQgdHlwZVxuICogQHBhcmFtICB7T2JqZWN0fSBwYXlsb2FkIEV2ZW50IG9iamVjdCAoc2VyaWFsaXphYmxlIHVzaW5nIHN0cnVjdHVyZWQgY2xvbmluZ1xuICogYWxnb3JpdGhtKVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLnNlbmRFdmVudCA9IGZ1bmN0aW9uIHNlbmRFdmVudChwYXRoLCBldiwgcGF5bG9hZCkge1xuICAgIHRoaXMuX291dENvbW1hbmRzLnB1c2goJ1dJVEgnLCBwYXRoLCAnVFJJR0dFUicsIGV2LCBwYXlsb2FkKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIG1ldGhvZCB1c2VkIGZvciBub3RpZnlpbmcgZXh0ZXJuYWxseVxuICogcmVzaXplZCBjb250ZXh0cyAoZS5nLiBieSByZXNpemluZyB0aGUgYnJvd3NlciB3aW5kb3cpLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzZWxlY3RvciByZW5kZXIgcGF0aCB0byB0aGUgbm9kZSAoY29udGV4dCkgdGhhdCBzaG91bGQgYmVcbiAqIHJlc2l6ZWRcbiAqIEBwYXJhbSAge0FycmF5fSBzaXplIG5ldyBjb250ZXh0IHNpemVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5zZW5kUmVzaXplID0gZnVuY3Rpb24gc2VuZFJlc2l6ZSAoc2VsZWN0b3IsIHNpemUpIHtcbiAgICB0aGlzLnNlbmRFdmVudChzZWxlY3RvciwgJ0NPTlRFWFRfUkVTSVpFJywgc2l6ZSk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBtZXRob2QgdXNlZCBieSBgZHJhd0NvbW1hbmRzYC5cbiAqIFN1YnNlcXVlbnQgY29tbWFuZHMgYXJlIGJlaW5nIGFzc29jaWF0ZWQgd2l0aCB0aGUgbm9kZSBkZWZpbmVkIHRoZSB0aGUgcGF0aFxuICogZm9sbG93aW5nIHRoZSBgV0lUSGAgY29tbWFuZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gaXRlcmF0b3IgcG9zaXRpb24gaW5kZXggd2l0aGluIHRoZSBjb21tYW5kcyBxdWV1ZVxuICogQHBhcmFtICB7QXJyYXl9IGNvbW1hbmRzIHJlbWFpbmluZyBtZXNzYWdlIHF1ZXVlIHJlY2VpdmVkLCB1c2VkIHRvXG4gKiBzaGlmdCBzaW5nbGUgbWVzc2FnZXMgZnJvbVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmhhbmRsZVdpdGggPSBmdW5jdGlvbiBoYW5kbGVXaXRoIChpdGVyYXRvciwgY29tbWFuZHMpIHtcbiAgICB2YXIgcGF0aCA9IGNvbW1hbmRzW2l0ZXJhdG9yXTtcbiAgICB2YXIgcGF0aEFyciA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICB2YXIgY29udGV4dCA9IHRoaXMuZ2V0T3JTZXRDb250ZXh0KHBhdGhBcnIuc2hpZnQoKSk7XG4gICAgcmV0dXJuIGNvbnRleHQucmVjZWl2ZShwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIHRvcC1sZXZlbCBDb250ZXh0IGFzc29jaWF0ZWQgd2l0aCB0aGUgcGFzc2VkIGluIGRvY3VtZW50XG4gKiBxdWVyeSBzZWxlY3Rvci4gSWYgbm8gc3VjaCBDb250ZXh0IGV4aXN0cywgYSBuZXcgb25lIHdpbGwgYmUgaW5zdGFudGlhdGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzZWxlY3RvciBkb2N1bWVudCBxdWVyeSBzZWxlY3RvciB1c2VkIGZvciByZXRyaWV2aW5nIHRoZVxuICogRE9NIG5vZGUgdGhlIFZpcnR1YWxFbGVtZW50IHNob3VsZCBiZSBhdHRhY2hlZCB0b1xuICpcbiAqIEByZXR1cm4ge0NvbnRleHR9IGNvbnRleHRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuZ2V0T3JTZXRDb250ZXh0ID0gZnVuY3Rpb24gZ2V0T3JTZXRDb250ZXh0KHNlbGVjdG9yKSB7XG4gICAgaWYgKHRoaXMuX2NvbnRleHRzW3NlbGVjdG9yXSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY29udGV4dHNbc2VsZWN0b3JdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIGNvbnRleHQgPSBuZXcgQ29udGV4dChzZWxlY3RvciwgdGhpcyk7XG4gICAgICAgIHRoaXMuX2NvbnRleHRzW3NlbGVjdG9yXSA9IGNvbnRleHQ7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIG1ldGhvZCB1c2VkIGJ5IGBkcmF3Q29tbWFuZHNgLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBpdGVyYXRvciBwb3NpdGlvbiBpbmRleCB3aXRoaW4gdGhlIGNvbW1hbmQgcXVldWVcbiAqIEBwYXJhbSAge0FycmF5fSBjb21tYW5kcyByZW1haW5pbmcgbWVzc2FnZSBxdWV1ZSByZWNlaXZlZCwgdXNlZCB0b1xuICogc2hpZnQgc2luZ2xlIG1lc3NhZ2VzXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuZ2l2ZVNpemVGb3IgPSBmdW5jdGlvbiBnaXZlU2l6ZUZvcihpdGVyYXRvciwgY29tbWFuZHMpIHtcbiAgICB2YXIgc2VsZWN0b3IgPSBjb21tYW5kc1tpdGVyYXRvcl07XG4gICAgdmFyIHNpemUgPSB0aGlzLmdldE9yU2V0Q29udGV4dChzZWxlY3RvcikuZ2V0Um9vdFNpemUoKTtcbiAgICB0aGlzLnNlbmRSZXNpemUoc2VsZWN0b3IsIHNpemUpO1xufTtcblxuLyoqXG4gKiBQcm9jZXNzZXMgdGhlIHByZXZpb3VzbHkgdmlhIGByZWNlaXZlQ29tbWFuZHNgIHVwZGF0ZWQgaW5jb21pbmcgXCJpblwiXG4gKiBjb21tYW5kIHF1ZXVlLlxuICogQ2FsbGVkIGJ5IFVJTWFuYWdlciBvbiBhIGZyYW1lIGJ5IGZyYW1lIGJhc2lzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gb3V0Q29tbWFuZHMgc2V0IG9mIGNvbW1hbmRzIHRvIGJlIHNlbnQgYmFja1xuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5kcmF3Q29tbWFuZHMgPSBmdW5jdGlvbiBkcmF3Q29tbWFuZHMoKSB7XG4gICAgdmFyIGNvbW1hbmRzID0gdGhpcy5faW5Db21tYW5kcztcbiAgICB2YXIgbG9jYWxJdGVyYXRvciA9IDA7XG4gICAgdmFyIGNvbW1hbmQgPSBjb21tYW5kc1tsb2NhbEl0ZXJhdG9yXTtcbiAgICB3aGlsZSAoY29tbWFuZCkge1xuICAgICAgICBzd2l0Y2ggKGNvbW1hbmQpIHtcbiAgICAgICAgICAgIGNhc2UgJ1RJTUUnOlxuICAgICAgICAgICAgICAgIHRoaXMuX3RpbWUgPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnV0lUSCc6XG4gICAgICAgICAgICAgICAgbG9jYWxJdGVyYXRvciA9IHRoaXMuaGFuZGxlV2l0aCgrK2xvY2FsSXRlcmF0b3IsIGNvbW1hbmRzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ05FRURfU0laRV9GT1InOlxuICAgICAgICAgICAgICAgIHRoaXMuZ2l2ZVNpemVGb3IoKytsb2NhbEl0ZXJhdG9yLCBjb21tYW5kcyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgY29tbWFuZCA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgfVxuXG4gICAgLy8gVE9ETzogU3dpdGNoIHRvIGFzc29jaWF0aXZlIGFycmF5cyBoZXJlLi4uXG5cbiAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5fY29udGV4dHMpIHtcbiAgICAgICAgdGhpcy5fY29udGV4dHNba2V5XS5kcmF3KCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX3Jlc2l6ZWQpIHtcbiAgICAgICAgdGhpcy51cGRhdGVTaXplKCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX291dENvbW1hbmRzO1xufTtcblxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHNpemUgb2YgYWxsIHByZXZpb3VzbHkgcmVnaXN0ZXJlZCBjb250ZXh0IG9iamVjdHMuXG4gKiBUaGlzIHJlc3VsdHMgaW50byBDT05URVhUX1JFU0laRSBldmVudHMgYmVpbmcgc2VudCBhbmQgdGhlIHJvb3QgZWxlbWVudHNcbiAqIHVzZWQgYnkgdGhlIGluZGl2aWR1YWwgcmVuZGVyZXJzIGJlaW5nIHJlc2l6ZWQgdG8gdGhlIHRoZSBET01SZW5kZXJlcidzIHJvb3RcbiAqIHNpemUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLnVwZGF0ZVNpemUgPSBmdW5jdGlvbiB1cGRhdGVTaXplKCkge1xuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIHRoaXMuX2NvbnRleHRzKSB7XG4gICAgICAgIHRoaXMuX2NvbnRleHRzW3NlbGVjdG9yXS51cGRhdGVTaXplKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBVc2VkIGJ5IFRocmVhZE1hbmFnZXIgdG8gdXBkYXRlIHRoZSBpbnRlcm5hbCBxdWV1ZSBvZiBpbmNvbWluZyBjb21tYW5kcy5cbiAqIFJlY2VpdmluZyBjb21tYW5kcyBkb2VzIG5vdCBpbW1lZGlhdGVseSBzdGFydCB0aGUgcmVuZGVyaW5nIHByb2Nlc3MuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSAge0FycmF5fSBjb21tYW5kcyBjb21tYW5kIHF1ZXVlIHRvIGJlIHByb2Nlc3NlZCBieSB0aGUgY29tcG9zaXRvcidzXG4gKiBgZHJhd0NvbW1hbmRzYCBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5yZWNlaXZlQ29tbWFuZHMgPSBmdW5jdGlvbiByZWNlaXZlQ29tbWFuZHMoY29tbWFuZHMpIHtcbiAgICB2YXIgbGVuID0gY29tbWFuZHMubGVuZ3RoO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdGhpcy5faW5Db21tYW5kcy5wdXNoKGNvbW1hbmRzW2ldKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZsdXNoZXMgdGhlIHF1ZXVlIG9mIG91dGdvaW5nIFwib3V0XCIgY29tbWFuZHMuXG4gKiBDYWxsZWQgYnkgVGhyZWFkTWFuYWdlci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuY2xlYXJDb21tYW5kcyA9IGZ1bmN0aW9uIGNsZWFyQ29tbWFuZHMoKSB7XG4gICAgdGhpcy5faW5Db21tYW5kcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX291dENvbW1hbmRzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5fcmVzaXplZCA9IGZhbHNlO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb3NpdG9yO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgV2ViR0xSZW5kZXJlciA9IHJlcXVpcmUoJy4uL3dlYmdsLXJlbmRlcmVycy9XZWJHTFJlbmRlcmVyJyk7XG52YXIgQ2FtZXJhID0gcmVxdWlyZSgnLi4vY29tcG9uZW50cy9DYW1lcmEnKTtcbnZhciBET01SZW5kZXJlciA9IHJlcXVpcmUoJy4uL2RvbS1yZW5kZXJlcnMvRE9NUmVuZGVyZXInKTtcblxuLyoqXG4gKiBDb250ZXh0IGlzIGEgcmVuZGVyIGxheWVyIHdpdGggaXRzIG93biBXZWJHTFJlbmRlcmVyIGFuZCBET01SZW5kZXJlci5cbiAqIEl0IGlzIHRoZSBpbnRlcmZhY2UgYmV0d2VlbiB0aGUgQ29tcG9zaXRvciB3aGljaCByZWNlaXZlcyBjb21tYW5kc1xuICogYW5kIHRoZSByZW5kZXJlcnMgdGhhdCBpbnRlcnByZXQgdGhlbS4gSXQgYWxzbyByZWxheXMgaW5mb3JtYXRpb24gdG9cbiAqIHRoZSByZW5kZXJlcnMgYWJvdXQgcmVzaXppbmcuXG4gKlxuICogVGhlIERPTUVsZW1lbnQgYXQgdGhlIGdpdmVuIHF1ZXJ5IHNlbGVjdG9yIGlzIHVzZWQgYXMgdGhlIHJvb3QuIEFcbiAqIG5ldyBET01FbGVtZW50IGlzIGFwcGVuZGVkIHRvIHRoaXMgcm9vdCBlbGVtZW50LCBhbmQgdXNlZCBhcyB0aGVcbiAqIHBhcmVudCBlbGVtZW50IGZvciBhbGwgRmFtb3VzIERPTSByZW5kZXJpbmcgYXQgdGhpcyBjb250ZXh0LiBBXG4gKiBjYW52YXMgaXMgYWRkZWQgYW5kIHVzZWQgZm9yIGFsbCBXZWJHTCByZW5kZXJpbmcgYXQgdGhpcyBjb250ZXh0LlxuICpcbiAqIEBjbGFzcyBDb250ZXh0XG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc2VsZWN0b3IgUXVlcnkgc2VsZWN0b3IgdXNlZCB0byBsb2NhdGUgcm9vdCBlbGVtZW50IG9mXG4gKiBjb250ZXh0IGxheWVyLlxuICogQHBhcmFtIHtDb21wb3NpdG9yfSBjb21wb3NpdG9yIENvbXBvc2l0b3IgcmVmZXJlbmNlIHRvIHBhc3MgZG93biB0b1xuICogV2ViR0xSZW5kZXJlci5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBDb250ZXh0KHNlbGVjdG9yLCBjb21wb3NpdG9yKSB7XG4gICAgdGhpcy5fY29tcG9zaXRvciA9IGNvbXBvc2l0b3I7XG4gICAgdGhpcy5fcm9vdEVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG5cbiAgICB0aGlzLl9zZWxlY3RvciA9IHNlbGVjdG9yO1xuXG4gICAgLy8gQ3JlYXRlIERPTSBlbGVtZW50IHRvIGJlIHVzZWQgYXMgcm9vdCBmb3IgYWxsIGZhbW91cyBET01cbiAgICAvLyByZW5kZXJpbmcgYW5kIGFwcGVuZCBlbGVtZW50IHRvIHRoZSByb290IGVsZW1lbnQuXG5cbiAgICB2YXIgRE9NTGF5ZXJFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuX3Jvb3RFbC5hcHBlbmRDaGlsZChET01MYXllckVsKTtcblxuICAgIC8vIEluc3RhbnRpYXRlIHJlbmRlcmVyc1xuXG4gICAgdGhpcy5ET01SZW5kZXJlciA9IG5ldyBET01SZW5kZXJlcihET01MYXllckVsLCBzZWxlY3RvciwgY29tcG9zaXRvcik7XG4gICAgdGhpcy5XZWJHTFJlbmRlcmVyID0gbnVsbDtcbiAgICB0aGlzLmNhbnZhcyA9IG51bGw7XG5cbiAgICAvLyBTdGF0ZSBob2xkZXJzXG5cbiAgICB0aGlzLl9yZW5kZXJTdGF0ZSA9IHtcbiAgICAgICAgcHJvamVjdGlvblR5cGU6IENhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTixcbiAgICAgICAgcGVyc3BlY3RpdmVUcmFuc2Zvcm06IG5ldyBGbG9hdDMyQXJyYXkoWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdKSxcbiAgICAgICAgdmlld1RyYW5zZm9ybTogbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pLFxuICAgICAgICB2aWV3RGlydHk6IGZhbHNlLFxuICAgICAgICBwZXJzcGVjdGl2ZURpcnR5OiBmYWxzZVxuICAgIH07XG5cbiAgICB0aGlzLl9zaXplID0gW107XG4gICAgdGhpcy5fY2hpbGRyZW4gPSB7fTtcbiAgICB0aGlzLl9lbGVtZW50SGFzaCA9IHt9O1xuXG4gICAgdGhpcy5fbWVzaFRyYW5zZm9ybSA9IFtdO1xuICAgIHRoaXMuX21lc2hTaXplID0gWzAsIDAsIDBdO1xufVxuXG4vKipcbiAqIFF1ZXJpZXMgRE9NUmVuZGVyZXIgc2l6ZSBhbmQgdXBkYXRlcyBjYW52YXMgc2l6ZS4gUmVsYXlzIHNpemUgaW5mb3JtYXRpb24gdG9cbiAqIFdlYkdMUmVuZGVyZXIuXG4gKlxuICogQHJldHVybiB7Q29udGV4dH0gdGhpc1xuICovXG5Db250ZXh0LnByb3RvdHlwZS51cGRhdGVTaXplID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBuZXdTaXplID0gdGhpcy5ET01SZW5kZXJlci5nZXRTaXplKCk7XG4gICAgdGhpcy5fY29tcG9zaXRvci5zZW5kUmVzaXplKHRoaXMuX3NlbGVjdG9yLCBuZXdTaXplKTtcblxuICAgIGlmICh0aGlzLmNhbnZhcyAmJiB0aGlzLldlYkdMUmVuZGVyZXIpIHtcbiAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnVwZGF0ZVNpemUobmV3U2l6ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIERyYXcgZnVuY3Rpb24gY2FsbGVkIGFmdGVyIGFsbCBjb21tYW5kcyBoYXZlIGJlZW4gaGFuZGxlZCBmb3IgY3VycmVudCBmcmFtZS5cbiAqIElzc3VlcyBkcmF3IGNvbW1hbmRzIHRvIGFsbCByZW5kZXJlcnMgd2l0aCBjdXJyZW50IHJlbmRlclN0YXRlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db250ZXh0LnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gZHJhdygpIHtcbiAgICB0aGlzLkRPTVJlbmRlcmVyLmRyYXcodGhpcy5fcmVuZGVyU3RhdGUpO1xuICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuV2ViR0xSZW5kZXJlci5kcmF3KHRoaXMuX3JlbmRlclN0YXRlKTtcblxuICAgIGlmICh0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5KSB0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5ID0gZmFsc2U7XG4gICAgaWYgKHRoaXMuX3JlbmRlclN0YXRlLnZpZXdEaXJ0eSkgdGhpcy5fcmVuZGVyU3RhdGUudmlld0RpcnR5ID0gZmFsc2U7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHNpemUgb2YgdGhlIHBhcmVudCBlbGVtZW50IG9mIHRoZSBET01SZW5kZXJlciBmb3IgdGhpcyBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db250ZXh0LnByb3RvdHlwZS5nZXRSb290U2l6ZSA9IGZ1bmN0aW9uIGdldFJvb3RTaXplKCkge1xuICAgIHJldHVybiB0aGlzLkRPTVJlbmRlcmVyLmdldFNpemUoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyBpbml0aWFsaXphdGlvbiBvZiBXZWJHTFJlbmRlcmVyIHdoZW4gbmVjZXNzYXJ5LCBpbmNsdWRpbmcgY3JlYXRpb25cbiAqIG9mIHRoZSBjYW52YXMgZWxlbWVudCBhbmQgaW5zdGFudGlhdGlvbiBvZiB0aGUgcmVuZGVyZXIuIEFsc28gdXBkYXRlcyBzaXplXG4gKiB0byBwYXNzIHNpemUgaW5mb3JtYXRpb24gdG8gdGhlIHJlbmRlcmVyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db250ZXh0LnByb3RvdHlwZS5pbml0V2ViR0wgPSBmdW5jdGlvbiBpbml0V2ViR0woKSB7XG4gICAgdGhpcy5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICB0aGlzLl9yb290RWwuYXBwZW5kQ2hpbGQodGhpcy5jYW52YXMpO1xuICAgIHRoaXMuV2ViR0xSZW5kZXJlciA9IG5ldyBXZWJHTFJlbmRlcmVyKHRoaXMuY2FudmFzLCB0aGlzLl9jb21wb3NpdG9yKTtcbiAgICB0aGlzLnVwZGF0ZVNpemUoKTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyBkZWxlZ2F0aW9uIG9mIGNvbW1hbmRzIHRvIHJlbmRlcmVycyBvZiB0aGlzIGNvbnRleHQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFN0cmluZyB1c2VkIGFzIGlkZW50aWZpZXIgb2YgYSBnaXZlbiBub2RlIGluIHRoZVxuICogc2NlbmUgZ3JhcGguXG4gKiBAcGFyYW0ge0FycmF5fSBjb21tYW5kcyBMaXN0IG9mIGFsbCBjb21tYW5kcyBmcm9tIHRoaXMgZnJhbWUuXG4gKiBAcGFyYW0ge051bWJlcn0gaXRlcmF0b3IgTnVtYmVyIGluZGljYXRpbmcgcHJvZ3Jlc3MgdGhyb3VnaCB0aGUgY29tbWFuZFxuICogcXVldWUuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBpdGVyYXRvciBpbmRpY2F0aW5nIHByb2dyZXNzIHRocm91Z2ggdGhlIGNvbW1hbmQgcXVldWUuXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnJlY2VpdmUgPSBmdW5jdGlvbiByZWNlaXZlKHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIHZhciBsb2NhbEl0ZXJhdG9yID0gaXRlcmF0b3I7XG5cbiAgICB2YXIgY29tbWFuZCA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgdGhpcy5ET01SZW5kZXJlci5sb2FkUGF0aChwYXRoKTtcbiAgICB0aGlzLkRPTVJlbmRlcmVyLmZpbmRUYXJnZXQoKTtcbiAgICB3aGlsZSAoY29tbWFuZCkge1xuXG4gICAgICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgICAgICAgY2FzZSAnSU5JVF9ET00nOlxuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuaW5zZXJ0RWwoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0RPTV9SRU5ERVJfU0laRSc6XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5nZXRTaXplT2YoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0NIQU5HRV9UUkFOU0ZPUk0nOlxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwIDsgaSA8IDE2IDsgaSsrKSB0aGlzLl9tZXNoVHJhbnNmb3JtW2ldID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuc2V0TWF0cml4KHRoaXMuX21lc2hUcmFuc2Zvcm0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcilcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldEN1dG91dFVuaWZvcm0ocGF0aCwgJ3VfdHJhbnNmb3JtJywgdGhpcy5fbWVzaFRyYW5zZm9ybSk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnQ0hBTkdFX1NJWkUnOlxuICAgICAgICAgICAgICAgIHZhciB3aWR0aCA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdmFyIGhlaWdodCA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG5cbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLnNldFNpemUod2lkdGgsIGhlaWdodCk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tZXNoU2l6ZVswXSA9IHdpZHRoO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9tZXNoU2l6ZVsxXSA9IGhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldEN1dG91dFVuaWZvcm0ocGF0aCwgJ3Vfc2l6ZScsIHRoaXMuX21lc2hTaXplKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0NIQU5HRV9QUk9QRVJUWSc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuc2V0UHJvcGVydHkoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSwgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0NIQU5HRV9DT05URU5UJzpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5zZXRDb250ZW50KGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdDSEFOR0VfQVRUUklCVVRFJzpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5zZXRBdHRyaWJ1dGUoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSwgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0FERF9DTEFTUyc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuYWRkQ2xhc3MoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ1JFTU9WRV9DTEFTUyc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIucmVtb3ZlQ2xhc3MoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ1NVQlNDUklCRSc6XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuc3Vic2NyaWJlKGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9TRVRfRFJBV19PUFRJT05TJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0TWVzaE9wdGlvbnMocGF0aCwgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0FNQklFTlRfTElHSFQnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRBbWJpZW50TGlnaHRDb2xvcihcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0xJR0hUX1BPU0lUSU9OJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0TGlnaHRQb3NpdGlvbihcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0xJR0hUX0NPTE9SJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0TGlnaHRDb2xvcihcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ01BVEVSSUFMX0lOUFVUJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuaGFuZGxlTWF0ZXJpYWxJbnB1dChcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX1NFVF9HRU9NRVRSWSc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldEdlb21ldHJ5KFxuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfVU5JRk9STVMnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRNZXNoVW5pZm9ybShcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0JVRkZFUl9EQVRBJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuYnVmZmVyRGF0YShcbiAgICAgICAgICAgICAgICAgICAgcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSxcbiAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX0NVVE9VVF9TVEFURSc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldEN1dG91dFN0YXRlKHBhdGgsIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9NRVNIX1ZJU0lCSUxJVFknOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRNZXNoVmlzaWJpbGl0eShwYXRoLCBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfUkVNT1ZFX01FU0gnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5yZW1vdmVNZXNoKHBhdGgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdQSU5IT0xFX1BST0pFQ1RJT04nOlxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnByb2plY3Rpb25UeXBlID0gQ2FtZXJhLlBJTkhPTEVfUFJPSkVDVElPTjtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV0gPSAtMSAvIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnT1JUSE9HUkFQSElDX1BST0pFQ1RJT04nOlxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnByb2plY3Rpb25UeXBlID0gQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzExXSA9IDA7XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnQ0hBTkdFX1ZJRVdfVFJBTlNGT1JNJzpcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzBdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzFdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzJdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzNdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bNF0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bNV0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bNl0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bN10gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs4XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs5XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxMF0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTFdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTJdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzEzXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxNF0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTVdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdEaXJ0eSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ1dJVEgnOiByZXR1cm4gbG9jYWxJdGVyYXRvciAtIDE7XG4gICAgICAgIH1cblxuICAgICAgICBjb21tYW5kID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICB9XG5cbiAgICByZXR1cm4gbG9jYWxJdGVyYXRvcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGV4dDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUaGUgVUlNYW5hZ2VyIGlzIGJlaW5nIHVwZGF0ZWQgYnkgYW4gRW5naW5lIGJ5IGNvbnNlY3V0aXZlbHkgY2FsbGluZyBpdHNcbiAqIGB1cGRhdGVgIG1ldGhvZC4gSXQgY2FuIGVpdGhlciBtYW5hZ2UgYSByZWFsIFdlYi1Xb3JrZXIgb3IgdGhlIGdsb2JhbFxuICogRmFtb3VzRW5naW5lIGNvcmUgc2luZ2xldG9uLlxuICpcbiAqIEBleGFtcGxlXG4gKiB2YXIgY29tcG9zaXRvciA9IG5ldyBDb21wb3NpdG9yKCk7XG4gKiB2YXIgZW5naW5lID0gbmV3IEVuZ2luZSgpO1xuICpcbiAqIC8vIFVzaW5nIGEgV2ViIFdvcmtlclxuICogdmFyIHdvcmtlciA9IG5ldyBXb3JrZXIoJ3dvcmtlci5idW5kbGUuanMnKTtcbiAqIHZhciB0aHJlYWRtYW5nZXIgPSBuZXcgVUlNYW5hZ2VyKHdvcmtlciwgY29tcG9zaXRvciwgZW5naW5lKTtcbiAqXG4gKiAvLyBXaXRob3V0IHVzaW5nIGEgV2ViIFdvcmtlclxuICogdmFyIHRocmVhZG1hbmdlciA9IG5ldyBVSU1hbmFnZXIoRmFtb3VzLCBjb21wb3NpdG9yLCBlbmdpbmUpO1xuICpcbiAqIEBjbGFzcyAgVUlNYW5hZ2VyXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge0ZhbW91c3xXb3JrZXJ9IHRocmVhZCBUaGUgdGhyZWFkIGJlaW5nIHVzZWQgdG8gcmVjZWl2ZSBtZXNzYWdlc1xuICogZnJvbSBhbmQgcG9zdCBtZXNzYWdlcyB0by4gRXhwZWN0ZWQgdG8gZXhwb3NlIGEgV2ViV29ya2VyLWxpa2UgQVBJLCB3aGljaFxuICogbWVhbnMgcHJvdmlkaW5nIGEgd2F5IHRvIGxpc3RlbiBmb3IgdXBkYXRlcyBieSBzZXR0aW5nIGl0cyBgb25tZXNzYWdlYFxuICogcHJvcGVydHkgYW5kIHNlbmRpbmcgdXBkYXRlcyB1c2luZyBgcG9zdE1lc3NhZ2VgLlxuICogQHBhcmFtIHtDb21wb3NpdG9yfSBjb21wb3NpdG9yIGFuIGluc3RhbmNlIG9mIENvbXBvc2l0b3IgdXNlZCB0byBleHRyYWN0XG4gKiBlbnF1ZXVlZCBkcmF3IGNvbW1hbmRzIGZyb20gdG8gYmUgc2VudCB0byB0aGUgdGhyZWFkLlxuICogQHBhcmFtIHtSZW5kZXJMb29wfSByZW5kZXJMb29wIGFuIGluc3RhbmNlIG9mIEVuZ2luZSB1c2VkIGZvciBleGVjdXRpbmdcbiAqIHRoZSBgRU5HSU5FYCBjb21tYW5kcyBvbi5cbiAqL1xuZnVuY3Rpb24gVUlNYW5hZ2VyICh0aHJlYWQsIGNvbXBvc2l0b3IsIHJlbmRlckxvb3ApIHtcbiAgICB0aGlzLl90aHJlYWQgPSB0aHJlYWQ7XG4gICAgdGhpcy5fY29tcG9zaXRvciA9IGNvbXBvc2l0b3I7XG4gICAgdGhpcy5fcmVuZGVyTG9vcCA9IHJlbmRlckxvb3A7XG5cbiAgICB0aGlzLl9yZW5kZXJMb29wLnVwZGF0ZSh0aGlzKTtcblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fdGhyZWFkLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldikge1xuICAgICAgICB2YXIgbWVzc2FnZSA9IGV2LmRhdGEgPyBldi5kYXRhIDogZXY7XG4gICAgICAgIGlmIChtZXNzYWdlWzBdID09PSAnRU5HSU5FJykge1xuICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlWzFdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnU1RBUlQnOlxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5fcmVuZGVyTG9vcC5zdGFydCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdTVE9QJzpcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3JlbmRlckxvb3Auc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1Vua25vd24gRU5HSU5FIGNvbW1hbmQgXCInICsgbWVzc2FnZVsxXSArICdcIidcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBfdGhpcy5fY29tcG9zaXRvci5yZWNlaXZlQ29tbWFuZHMobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuX3RocmVhZC5vbmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH07XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdGhyZWFkIGJlaW5nIHVzZWQgYnkgdGhlIFVJTWFuYWdlci5cbiAqIFRoaXMgY291bGQgZWl0aGVyIGJlIGFuIGFuIGFjdHVhbCB3ZWIgd29ya2VyIG9yIGEgYEZhbW91c0VuZ2luZWAgc2luZ2xldG9uLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtXb3JrZXJ8RmFtb3VzRW5naW5lfSBFaXRoZXIgYSB3ZWIgd29ya2VyIG9yIGEgYEZhbW91c0VuZ2luZWAgc2luZ2xldG9uLlxuICovXG5VSU1hbmFnZXIucHJvdG90eXBlLmdldFRocmVhZCA9IGZ1bmN0aW9uIGdldFRocmVhZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGhyZWFkO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjb21wb3NpdG9yIGJlaW5nIHVzZWQgYnkgdGhpcyBVSU1hbmFnZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0NvbXBvc2l0b3J9IFRoZSBjb21wb3NpdG9yIHVzZWQgYnkgdGhlIFVJTWFuYWdlci5cbiAqL1xuVUlNYW5hZ2VyLnByb3RvdHlwZS5nZXRDb21wb3NpdG9yID0gZnVuY3Rpb24gZ2V0Q29tcG9zaXRvcigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9zaXRvcjtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZW5naW5lIGJlaW5nIHVzZWQgYnkgdGhpcyBVSU1hbmFnZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0VuZ2luZX0gVGhlIGVuZ2luZSB1c2VkIGJ5IHRoZSBVSU1hbmFnZXIuXG4gKi9cblVJTWFuYWdlci5wcm90b3R5cGUuZ2V0RW5naW5lID0gZnVuY3Rpb24gZ2V0RW5naW5lKCkge1xuICAgIHJldHVybiB0aGlzLl9yZW5kZXJMb29wO1xufTtcblxuLyoqXG4gKiBVcGRhdGUgbWV0aG9kIGJlaW5nIGludm9rZWQgYnkgdGhlIEVuZ2luZSBvbiBldmVyeSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYC5cbiAqIFVzZWQgZm9yIHVwZGF0aW5nIHRoZSBub3Rpb24gb2YgdGltZSB3aXRoaW4gdGhlIG1hbmFnZWQgdGhyZWFkIGJ5IHNlbmRpbmdcbiAqIGEgRlJBTUUgY29tbWFuZCBhbmQgc2VuZGluZyBtZXNzYWdlcyB0b1xuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IHRpbWUgdW5peCB0aW1lc3RhbXAgdG8gYmUgcGFzc2VkIGRvd24gdG8gdGhlIHdvcmtlciBhcyBhXG4gKiBGUkFNRSBjb21tYW5kXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5VSU1hbmFnZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSAodGltZSkge1xuICAgIHRoaXMuX3RocmVhZC5wb3N0TWVzc2FnZShbJ0ZSQU1FJywgdGltZV0pO1xuICAgIHZhciB0aHJlYWRNZXNzYWdlcyA9IHRoaXMuX2NvbXBvc2l0b3IuZHJhd0NvbW1hbmRzKCk7XG4gICAgdGhpcy5fdGhyZWFkLnBvc3RNZXNzYWdlKHRocmVhZE1lc3NhZ2VzKTtcbiAgICB0aGlzLl9jb21wb3NpdG9yLmNsZWFyQ29tbWFuZHMoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVUlNYW5hZ2VyO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3NzID0gJy5mYW1vdXMtZG9tLXJlbmRlcmVyIHsnICtcbiAgICAnd2lkdGg6MTAwJTsnICtcbiAgICAnaGVpZ2h0OjEwMCU7JyArXG4gICAgJ3RyYW5zZm9ybS1zdHlsZTpwcmVzZXJ2ZS0zZDsnICtcbiAgICAnLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6cHJlc2VydmUtM2Q7JyArXG4nfScgK1xuXG4nLmZhbW91cy1kb20tZWxlbWVudCB7JyArXG4gICAgJy13ZWJraXQtdHJhbnNmb3JtLW9yaWdpbjowJSAwJTsnICtcbiAgICAndHJhbnNmb3JtLW9yaWdpbjowJSAwJTsnICtcbiAgICAnLXdlYmtpdC1iYWNrZmFjZS12aXNpYmlsaXR5OnZpc2libGU7JyArXG4gICAgJ2JhY2tmYWNlLXZpc2liaWxpdHk6dmlzaWJsZTsnICtcbiAgICAnLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6cHJlc2VydmUtM2Q7JyArXG4gICAgJ3RyYW5zZm9ybS1zdHlsZTpwcmVzZXJ2ZS0zZDsnICtcbiAgICAnLXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50OycgK1xuICAgICdwb2ludGVyLWV2ZW50czphdXRvOycgK1xuICAgICd6LWluZGV4OjE7JyArXG4nfScgK1xuXG4nLmZhbW91cy1kb20tZWxlbWVudC1jb250ZW50LCcgK1xuJy5mYW1vdXMtZG9tLWVsZW1lbnQgeycgK1xuICAgICdwb3NpdGlvbjphYnNvbHV0ZTsnICtcbiAgICAnYm94LXNpemluZzpib3JkZXItYm94OycgK1xuICAgICctbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDsnICtcbiAgICAnLXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7JyArXG4nfScgK1xuXG4nLmZhbW91cy13ZWJnbC1yZW5kZXJlciB7JyArXG4gICAgJy13ZWJraXQtdHJhbnNmb3JtOnRyYW5zbGF0ZVooMTAwMDAwMHB4KTsnICsgIC8qIFRPRE86IEZpeCB3aGVuIFNhZmFyaSBGaXhlcyovXG4gICAgJ3RyYW5zZm9ybTp0cmFuc2xhdGVaKDEwMDAwMDBweCk7JyArXG4gICAgJ3BvaW50ZXItZXZlbnRzOm5vbmU7JyArXG4gICAgJ3Bvc2l0aW9uOmFic29sdXRlOycgK1xuICAgICd6LWluZGV4OjE7JyArXG4gICAgJ3RvcDowOycgK1xuICAgICd3aWR0aDoxMDAlOycgK1xuICAgICdoZWlnaHQ6MTAwJTsnICtcbid9JztcblxudmFyIElOSkVDVEVEID0gdHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJztcblxuZnVuY3Rpb24gaW5qZWN0Q1NTKCkge1xuICAgIGlmIChJTkpFQ1RFRCkgcmV0dXJuO1xuICAgIElOSkVDVEVEID0gdHJ1ZTtcbiAgICBpZiAoZG9jdW1lbnQuY3JlYXRlU3R5bGVTaGVldCkge1xuICAgICAgICB2YXIgc2hlZXQgPSBkb2N1bWVudC5jcmVhdGVTdHlsZVNoZWV0KCk7XG4gICAgICAgIHNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG4gICAgICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5cbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgKGhlYWQgPyBoZWFkIDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluamVjdENTUztcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBEZWVwIGNsb25lIGFuIG9iamVjdC5cbiAqXG4gKiBAbWV0aG9kICBjbG9uZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBiICAgICAgIE9iamVjdCB0byBiZSBjbG9uZWQuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGEgICAgICBDbG9uZWQgb2JqZWN0IChkZWVwIGVxdWFsaXR5KS5cbiAqL1xudmFyIGNsb25lID0gZnVuY3Rpb24gY2xvbmUoYikge1xuICAgIHZhciBhO1xuICAgIGlmICh0eXBlb2YgYiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgYSA9IChiIGluc3RhbmNlb2YgQXJyYXkpID8gW10gOiB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYltrZXldID09PSAnb2JqZWN0JyAmJiBiW2tleV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoYltrZXldIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgYVtrZXldID0gbmV3IEFycmF5KGJba2V5XS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJba2V5XS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYVtrZXldW2ldID0gY2xvbmUoYltrZXldW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGFba2V5XSA9IGNsb25lKGJba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYVtrZXldID0gYltrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhID0gYjtcbiAgICB9XG4gICAgcmV0dXJuIGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKipcbiAqIFRha2VzIGFuIG9iamVjdCBjb250YWluaW5nIGtleXMgYW5kIHZhbHVlcyBhbmQgcmV0dXJucyBhbiBvYmplY3RcbiAqIGNvbXByaXNpbmcgdHdvIFwiYXNzb2NpYXRlXCIgYXJyYXlzLCBvbmUgd2l0aCB0aGUga2V5cyBhbmQgdGhlIG90aGVyXG4gKiB3aXRoIHRoZSB2YWx1ZXMuXG4gKlxuICogQG1ldGhvZCBrZXlWYWx1ZXNUb0FycmF5c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogICAgICAgICAgICAgICAgICAgICAgT2JqZWN0cyB3aGVyZSB0byBleHRyYWN0IGtleXMgYW5kIHZhbHVlc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tLlxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIHJlc3VsdFxuICogICAgICAgICB7QXJyYXkuPFN0cmluZz59IHJlc3VsdC5rZXlzICAgICBLZXlzIG9mIGByZXN1bHRgLCBhcyByZXR1cm5lZCBieVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgT2JqZWN0LmtleXMoKWBcbiAqICAgICAgICAge0FycmF5fSAgICAgICAgICByZXN1bHQudmFsdWVzICAgVmFsdWVzIG9mIHBhc3NlZCBpbiBvYmplY3QuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ga2V5VmFsdWVzVG9BcnJheXMob2JqKSB7XG4gICAgdmFyIGtleXNBcnJheSA9IFtdLCB2YWx1ZXNBcnJheSA9IFtdO1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBrZXlzQXJyYXlbaV0gPSBrZXk7XG4gICAgICAgICAgICB2YWx1ZXNBcnJheVtpXSA9IG9ialtrZXldO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGtleXM6IGtleXNBcnJheSxcbiAgICAgICAgdmFsdWVzOiB2YWx1ZXNBcnJheVxuICAgIH07XG59O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgUFJFRklYRVMgPSBbJycsICctbXMtJywgJy13ZWJraXQtJywgJy1tb3otJywgJy1vLSddO1xuXG4vKipcbiAqIEEgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGRldGVybWluaW5nIHRoZSB2ZW5kb3IgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcbiAqIHBhc3NlZCBpbiBDU1MgcHJvcGVydHkuXG4gKlxuICogVmVuZG9yIGNoZWNrcyBhcmUgYmVpbmcgY29uZHVjdGVkIGluIHRoZSBmb2xsb3dpbmcgb3JkZXI6XG4gKlxuICogMS4gKG5vIHByZWZpeClcbiAqIDIuIGAtbXotYFxuICogMy4gYC13ZWJraXQtYFxuICogNC4gYC1tb3otYFxuICogNS4gYC1vLWBcbiAqXG4gKiBAbWV0aG9kIHZlbmRvclByZWZpeFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eSAgICAgQ1NTIHByb3BlcnR5IChubyBjYW1lbENhc2UpLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBib3JkZXItcmFkaXVzYC5cbiAqIEByZXR1cm4ge1N0cmluZ30gcHJlZml4ZWQgICAgVmVuZG9yIHByZWZpeGVkIHZlcnNpb24gb2YgcGFzc2VkIGluIENTU1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSAoZS5nLiBgLXdlYmtpdC1ib3JkZXItcmFkaXVzYCkuXG4gKi9cbmZ1bmN0aW9uIHZlbmRvclByZWZpeChwcm9wZXJ0eSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgUFJFRklYRVMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByZWZpeGVkID0gUFJFRklYRVNbaV0gKyBwcm9wZXJ0eTtcbiAgICAgICAgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZVtwcmVmaXhlZF0gPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJlZml4ZWQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHByb3BlcnR5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHZlbmRvclByZWZpeDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEdlb21ldHJ5SWRzID0gMDtcblxuLyoqXG4gKiBHZW9tZXRyeSBpcyBhIGNvbXBvbmVudCB0aGF0IGRlZmluZXMgYW5kIG1hbmFnZXMgZGF0YVxuICogKHZlcnRleCBkYXRhIGFuZCBhdHRyaWJ1dGVzKSB0aGF0IGlzIHVzZWQgdG8gZHJhdyB0byBXZWJHTC5cbiAqXG4gKiBAY2xhc3MgR2VvbWV0cnlcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIGluc3RhbnRpYXRpb24gb3B0aW9uc1xuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gR2VvbWV0cnkob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5ERUZBVUxUX0JVRkZFUl9TSVpFID0gMztcblxuICAgIHRoaXMuc3BlYyA9IHtcbiAgICAgICAgaWQ6IEdlb21ldHJ5SWRzKyssXG4gICAgICAgIGR5bmFtaWM6IGZhbHNlLFxuICAgICAgICB0eXBlOiB0aGlzLm9wdGlvbnMudHlwZSB8fCAnVFJJQU5HTEVTJyxcbiAgICAgICAgYnVmZmVyTmFtZXM6IFtdLFxuICAgICAgICBidWZmZXJWYWx1ZXM6IFtdLFxuICAgICAgICBidWZmZXJTcGFjaW5nczogW10sXG4gICAgICAgIGludmFsaWRhdGlvbnM6IFtdXG4gICAgfTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuYnVmZmVycykge1xuICAgICAgICB2YXIgbGVuID0gdGhpcy5vcHRpb25zLmJ1ZmZlcnMubGVuZ3RoO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjspIHtcbiAgICAgICAgICAgIHRoaXMuc3BlYy5idWZmZXJOYW1lcy5wdXNoKHRoaXMub3B0aW9ucy5idWZmZXJzW2ldLm5hbWUpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmJ1ZmZlclZhbHVlcy5wdXNoKHRoaXMub3B0aW9ucy5idWZmZXJzW2ldLmRhdGEpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmJ1ZmZlclNwYWNpbmdzLnB1c2godGhpcy5vcHRpb25zLmJ1ZmZlcnNbaV0uc2l6ZSB8fCB0aGlzLkRFRkFVTFRfQlVGRkVSX1NJWkUpO1xuICAgICAgICAgICAgdGhpcy5zcGVjLmludmFsaWRhdGlvbnMucHVzaChpKyspO1xuICAgICAgICB9XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEdlb21ldHJ5O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmVjMyA9IHJlcXVpcmUoJy4uL21hdGgvVmVjMycpO1xudmFyIFZlYzIgPSByZXF1aXJlKCcuLi9tYXRoL1ZlYzInKTtcblxudmFyIG91dHB1dHMgPSBbXG4gICAgbmV3IFZlYzMoKSxcbiAgICBuZXcgVmVjMygpLFxuICAgIG5ldyBWZWMzKCksXG4gICAgbmV3IFZlYzIoKSxcbiAgICBuZXcgVmVjMigpXG5dO1xuXG4vKipcbiAqIEEgaGVscGVyIG9iamVjdCB1c2VkIHRvIGNhbGN1bGF0ZSBidWZmZXJzIGZvciBjb21wbGljYXRlZCBnZW9tZXRyaWVzLlxuICogVGFpbG9yZWQgZm9yIHRoZSBXZWJHTFJlbmRlcmVyLCB1c2VkIGJ5IG1vc3QgcHJpbWl0aXZlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAY2xhc3MgR2VvbWV0cnlIZWxwZXJcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbnZhciBHZW9tZXRyeUhlbHBlciA9IHt9O1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gdGhhdCBpdGVyYXRlcyB0aHJvdWdoIHZlcnRpY2FsIGFuZCBob3Jpem9udGFsIHNsaWNlc1xuICogYmFzZWQgb24gaW5wdXQgZGV0YWlsLCBhbmQgZ2VuZXJhdGVzIHZlcnRpY2VzIGFuZCBpbmRpY2VzIGZvciBlYWNoXG4gKiBzdWJkaXZpc2lvbi5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBkZXRhaWxYIEFtb3VudCBvZiBzbGljZXMgdG8gaXRlcmF0ZSB0aHJvdWdoLlxuICogQHBhcmFtICB7TnVtYmVyfSBkZXRhaWxZIEFtb3VudCBvZiBzdGFja3MgdG8gaXRlcmF0ZSB0aHJvdWdoLlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZ1bmMgRnVuY3Rpb24gdXNlZCB0byBnZW5lcmF0ZSB2ZXJ0ZXggcG9zaXRpb25zIGF0IGVhY2ggcG9pbnQuXG4gKiBAcGFyYW0gIHtCb29sZWFufSB3cmFwIE9wdGlvbmFsIHBhcmFtZXRlciAoZGVmYXVsdDogUGkpIGZvciBzZXR0aW5nIGEgY3VzdG9tIHdyYXAgcmFuZ2VcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IE9iamVjdCBjb250YWluaW5nIGdlbmVyYXRlZCB2ZXJ0aWNlcyBhbmQgaW5kaWNlcy5cbiAqL1xuR2VvbWV0cnlIZWxwZXIuZ2VuZXJhdGVQYXJhbWV0cmljID0gZnVuY3Rpb24gZ2VuZXJhdGVQYXJhbWV0cmljKGRldGFpbFgsIGRldGFpbFksIGZ1bmMsIHdyYXApIHtcbiAgICB2YXIgdmVydGljZXMgPSBbXTtcbiAgICB2YXIgaTtcbiAgICB2YXIgdGhldGE7XG4gICAgdmFyIHBoaTtcbiAgICB2YXIgajtcblxuICAgIC8vIFdlIGNhbiB3cmFwIGFyb3VuZCBzbGlnaHRseSBtb3JlIHRoYW4gb25jZSBmb3IgdXYgY29vcmRpbmF0ZXMgdG8gbG9vayBjb3JyZWN0LlxuXG4gICAgdmFyIFhyYW5nZSA9IHdyYXAgPyBNYXRoLlBJICsgKE1hdGguUEkgLyAoZGV0YWlsWCAtIDEpKSA6IE1hdGguUEk7XG4gICAgdmFyIG91dCA9IFtdO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGRldGFpbFggKyAxOyBpKyspIHtcbiAgICAgICAgdGhldGEgPSBpICogWHJhbmdlIC8gZGV0YWlsWDtcbiAgICAgICAgZm9yIChqID0gMDsgaiA8IGRldGFpbFk7IGorKykge1xuICAgICAgICAgICAgcGhpID0gaiAqIDIuMCAqIFhyYW5nZSAvIGRldGFpbFk7XG4gICAgICAgICAgICBmdW5jKHRoZXRhLCBwaGksIG91dCk7XG4gICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKG91dFswXSwgb3V0WzFdLCBvdXRbMl0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGluZGljZXMgPSBbXSxcbiAgICAgICAgdiA9IDAsXG4gICAgICAgIG5leHQ7XG4gICAgZm9yIChpID0gMDsgaSA8IGRldGFpbFg7IGkrKykge1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgZGV0YWlsWTsgaisrKSB7XG4gICAgICAgICAgICBuZXh0ID0gKGogKyAxKSAlIGRldGFpbFk7XG4gICAgICAgICAgICBpbmRpY2VzLnB1c2godiArIGosIHYgKyBqICsgZGV0YWlsWSwgdiArIG5leHQpO1xuICAgICAgICAgICAgaW5kaWNlcy5wdXNoKHYgKyBuZXh0LCB2ICsgaiArIGRldGFpbFksIHYgKyBuZXh0ICsgZGV0YWlsWSk7XG4gICAgICAgIH1cbiAgICAgICAgdiArPSBkZXRhaWxZO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHZlcnRpY2VzOiB2ZXJ0aWNlcyxcbiAgICAgICAgaW5kaWNlczogaW5kaWNlc1xuICAgIH07XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgbm9ybWFscyBiZWxvbmdpbmcgdG8gZWFjaCBmYWNlIG9mIGEgZ2VvbWV0cnkuXG4gKiBBc3N1bWVzIGNsb2Nrd2lzZSBkZWNsYXJhdGlvbiBvZiB2ZXJ0aWNlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgZGVjbGFyaW5nIGZhY2VzIG9mIGdlb21ldHJ5LlxuICogQHBhcmFtIHtBcnJheX0gb3V0IEFycmF5IHRvIGJlIGZpbGxlZCBhbmQgcmV0dXJuZWQuXG4gKlxuICogQHJldHVybiB7QXJyYXl9IENhbGN1bGF0ZWQgZmFjZSBub3JtYWxzLlxuICovXG5HZW9tZXRyeUhlbHBlci5jb21wdXRlTm9ybWFscyA9IGZ1bmN0aW9uIGNvbXB1dGVOb3JtYWxzKHZlcnRpY2VzLCBpbmRpY2VzLCBvdXQpIHtcbiAgICB2YXIgbm9ybWFscyA9IG91dCB8fCBbXTtcbiAgICB2YXIgaW5kZXhPbmU7XG4gICAgdmFyIGluZGV4VHdvO1xuICAgIHZhciBpbmRleFRocmVlO1xuICAgIHZhciBub3JtYWw7XG4gICAgdmFyIGo7XG4gICAgdmFyIGxlbiA9IGluZGljZXMubGVuZ3RoIC8gMztcbiAgICB2YXIgaTtcbiAgICB2YXIgeDtcbiAgICB2YXIgeTtcbiAgICB2YXIgejtcbiAgICB2YXIgbGVuZ3RoO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGluZGV4VHdvID0gaW5kaWNlc1tpKjMgKyAwXSAqIDM7XG4gICAgICAgIGluZGV4T25lID0gaW5kaWNlc1tpKjMgKyAxXSAqIDM7XG4gICAgICAgIGluZGV4VGhyZWUgPSBpbmRpY2VzW2kqMyArIDJdICogMztcblxuICAgICAgICBvdXRwdXRzWzBdLnNldCh2ZXJ0aWNlc1tpbmRleE9uZV0sIHZlcnRpY2VzW2luZGV4T25lICsgMV0sIHZlcnRpY2VzW2luZGV4T25lICsgMl0pO1xuICAgICAgICBvdXRwdXRzWzFdLnNldCh2ZXJ0aWNlc1tpbmRleFR3b10sIHZlcnRpY2VzW2luZGV4VHdvICsgMV0sIHZlcnRpY2VzW2luZGV4VHdvICsgMl0pO1xuICAgICAgICBvdXRwdXRzWzJdLnNldCh2ZXJ0aWNlc1tpbmRleFRocmVlXSwgdmVydGljZXNbaW5kZXhUaHJlZSArIDFdLCB2ZXJ0aWNlc1tpbmRleFRocmVlICsgMl0pO1xuXG4gICAgICAgIG5vcm1hbCA9IG91dHB1dHNbMl0uc3VidHJhY3Qob3V0cHV0c1swXSkuY3Jvc3Mob3V0cHV0c1sxXS5zdWJ0cmFjdChvdXRwdXRzWzBdKSkubm9ybWFsaXplKCk7XG5cbiAgICAgICAgbm9ybWFsc1tpbmRleE9uZSArIDBdID0gKG5vcm1hbHNbaW5kZXhPbmUgKyAwXSB8fCAwKSArIG5vcm1hbC54O1xuICAgICAgICBub3JtYWxzW2luZGV4T25lICsgMV0gPSAobm9ybWFsc1tpbmRleE9uZSArIDFdIHx8IDApICsgbm9ybWFsLnk7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhPbmUgKyAyXSA9IChub3JtYWxzW2luZGV4T25lICsgMl0gfHwgMCkgKyBub3JtYWwuejtcblxuICAgICAgICBub3JtYWxzW2luZGV4VHdvICsgMF0gPSAobm9ybWFsc1tpbmRleFR3byArIDBdIHx8IDApICsgbm9ybWFsLng7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhUd28gKyAxXSA9IChub3JtYWxzW2luZGV4VHdvICsgMV0gfHwgMCkgKyBub3JtYWwueTtcbiAgICAgICAgbm9ybWFsc1tpbmRleFR3byArIDJdID0gKG5vcm1hbHNbaW5kZXhUd28gKyAyXSB8fCAwKSArIG5vcm1hbC56O1xuXG4gICAgICAgIG5vcm1hbHNbaW5kZXhUaHJlZSArIDBdID0gKG5vcm1hbHNbaW5kZXhUaHJlZSArIDBdIHx8IDApICsgbm9ybWFsLng7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhUaHJlZSArIDFdID0gKG5vcm1hbHNbaW5kZXhUaHJlZSArIDFdIHx8IDApICsgbm9ybWFsLnk7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhUaHJlZSArIDJdID0gKG5vcm1hbHNbaW5kZXhUaHJlZSArIDJdIHx8IDApICsgbm9ybWFsLno7XG4gICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IG5vcm1hbHMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICAgICAgeCA9IG5vcm1hbHNbaV07XG4gICAgICAgIHkgPSBub3JtYWxzW2krMV07XG4gICAgICAgIHogPSBub3JtYWxzW2krMl07XG4gICAgICAgIGxlbmd0aCA9IE1hdGguc3FydCh4ICogeCArIHkgKiB5ICsgeiAqIHopO1xuICAgICAgICBmb3IoaiA9IDA7IGo8IDM7IGorKykge1xuICAgICAgICAgICAgbm9ybWFsc1tpK2pdIC89IGxlbmd0aDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub3JtYWxzO1xufTtcblxuLyoqXG4gKiBEaXZpZGVzIGFsbCBpbnNlcnRlZCB0cmlhbmdsZXMgaW50byBmb3VyIHN1Yi10cmlhbmdsZXMuIEFsdGVycyB0aGVcbiAqIHBhc3NlZCBpbiBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGluZGljZXMgSW5kaWNlcyBkZWNsYXJpbmcgZmFjZXMgb2YgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSB0ZXh0dXJlQ29vcmRzIFRleHR1cmUgY29vcmRpbmF0ZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkdlb21ldHJ5SGVscGVyLnN1YmRpdmlkZSA9IGZ1bmN0aW9uIHN1YmRpdmlkZShpbmRpY2VzLCB2ZXJ0aWNlcywgdGV4dHVyZUNvb3Jkcykge1xuICAgIHZhciB0cmlhbmdsZUluZGV4ID0gaW5kaWNlcy5sZW5ndGggLyAzO1xuICAgIHZhciBmYWNlO1xuICAgIHZhciBpO1xuICAgIHZhciBqO1xuICAgIHZhciBrO1xuICAgIHZhciBwb3M7XG4gICAgdmFyIHRleDtcblxuICAgIHdoaWxlICh0cmlhbmdsZUluZGV4LS0pIHtcbiAgICAgICAgZmFjZSA9IGluZGljZXMuc2xpY2UodHJpYW5nbGVJbmRleCAqIDMsIHRyaWFuZ2xlSW5kZXggKiAzICsgMyk7XG5cbiAgICAgICAgcG9zID0gZmFjZS5tYXAoZnVuY3Rpb24odmVydEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzModmVydGljZXNbdmVydEluZGV4ICogM10sIHZlcnRpY2VzW3ZlcnRJbmRleCAqIDMgKyAxXSwgdmVydGljZXNbdmVydEluZGV4ICogMyArIDJdKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMuc2NhbGUoVmVjMy5hZGQocG9zWzBdLCBwb3NbMV0sIG91dHB1dHNbMF0pLCAwLjUsIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMuc2NhbGUoVmVjMy5hZGQocG9zWzFdLCBwb3NbMl0sIG91dHB1dHNbMF0pLCAwLjUsIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMuc2NhbGUoVmVjMy5hZGQocG9zWzBdLCBwb3NbMl0sIG91dHB1dHNbMF0pLCAwLjUsIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG5cbiAgICAgICAgaWYgKHRleHR1cmVDb29yZHMpIHtcbiAgICAgICAgICAgIHRleCA9IGZhY2UubWFwKGZ1bmN0aW9uKHZlcnRJbmRleCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMih0ZXh0dXJlQ29vcmRzW3ZlcnRJbmRleCAqIDJdLCB0ZXh0dXJlQ29vcmRzW3ZlcnRJbmRleCAqIDIgKyAxXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRleHR1cmVDb29yZHMucHVzaC5hcHBseSh0ZXh0dXJlQ29vcmRzLCBWZWMyLnNjYWxlKFZlYzIuYWRkKHRleFswXSwgdGV4WzFdLCBvdXRwdXRzWzNdKSwgMC41LCBvdXRwdXRzWzRdKS50b0FycmF5KCkpO1xuICAgICAgICAgICAgdGV4dHVyZUNvb3Jkcy5wdXNoLmFwcGx5KHRleHR1cmVDb29yZHMsIFZlYzIuc2NhbGUoVmVjMi5hZGQodGV4WzFdLCB0ZXhbMl0sIG91dHB1dHNbM10pLCAwLjUsIG91dHB1dHNbNF0pLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICB0ZXh0dXJlQ29vcmRzLnB1c2guYXBwbHkodGV4dHVyZUNvb3JkcywgVmVjMi5zY2FsZShWZWMyLmFkZCh0ZXhbMF0sIHRleFsyXSwgb3V0cHV0c1szXSksIDAuNSwgb3V0cHV0c1s0XSkudG9BcnJheSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGkgPSB2ZXJ0aWNlcy5sZW5ndGggLSAzO1xuICAgICAgICBqID0gaSArIDE7XG4gICAgICAgIGsgPSBpICsgMjtcblxuICAgICAgICBpbmRpY2VzLnB1c2goaSwgaiwgayk7XG4gICAgICAgIGluZGljZXMucHVzaChmYWNlWzBdLCBpLCBrKTtcbiAgICAgICAgaW5kaWNlcy5wdXNoKGksIGZhY2VbMV0sIGopO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXhdID0gaztcbiAgICAgICAgaW5kaWNlc1t0cmlhbmdsZUluZGV4ICsgMV0gPSBqO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXggKyAyXSA9IGZhY2VbMl07XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGR1cGxpY2F0ZSBvZiB2ZXJ0aWNlcyB0aGF0IGFyZSBzaGFyZWQgYmV0d2VlbiBmYWNlcy5cbiAqIEFsdGVycyB0aGUgaW5wdXQgdmVydGV4IGFuZCBpbmRleCBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgZGVjbGFyaW5nIGZhY2VzIG9mIGdlb21ldHJ5XG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5HZW9tZXRyeUhlbHBlci5nZXRVbmlxdWVGYWNlcyA9IGZ1bmN0aW9uIGdldFVuaXF1ZUZhY2VzKHZlcnRpY2VzLCBpbmRpY2VzKSB7XG4gICAgdmFyIHRyaWFuZ2xlSW5kZXggPSBpbmRpY2VzLmxlbmd0aCAvIDMsXG4gICAgICAgIHJlZ2lzdGVyZWQgPSBbXSxcbiAgICAgICAgaW5kZXg7XG5cbiAgICB3aGlsZSAodHJpYW5nbGVJbmRleC0tKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMzsgaSsrKSB7XG5cbiAgICAgICAgICAgIGluZGV4ID0gaW5kaWNlc1t0cmlhbmdsZUluZGV4ICogMyArIGldO1xuXG4gICAgICAgICAgICBpZiAocmVnaXN0ZXJlZFtpbmRleF0pIHtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKHZlcnRpY2VzW2luZGV4ICogM10sIHZlcnRpY2VzW2luZGV4ICogMyArIDFdLCB2ZXJ0aWNlc1tpbmRleCAqIDMgKyAyXSk7XG4gICAgICAgICAgICAgICAgaW5kaWNlc1t0cmlhbmdsZUluZGV4ICogMyArIGldID0gdmVydGljZXMubGVuZ3RoIC8gMyAtIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWdpc3RlcmVkW2luZGV4XSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIERpdmlkZXMgYWxsIGluc2VydGVkIHRyaWFuZ2xlcyBpbnRvIGZvdXIgc3ViLXRyaWFuZ2xlcyB3aGlsZSBtYWludGFpbmluZ1xuICogYSByYWRpdXMgb2Ygb25lLiBBbHRlcnMgdGhlIHBhc3NlZCBpbiBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgZGVjbGFyaW5nIGZhY2VzIG9mIGdlb21ldHJ5XG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5HZW9tZXRyeUhlbHBlci5zdWJkaXZpZGVTcGhlcm9pZCA9IGZ1bmN0aW9uIHN1YmRpdmlkZVNwaGVyb2lkKHZlcnRpY2VzLCBpbmRpY2VzKSB7XG4gICAgdmFyIHRyaWFuZ2xlSW5kZXggPSBpbmRpY2VzLmxlbmd0aCAvIDMsXG4gICAgICAgIGFiYyxcbiAgICAgICAgZmFjZSxcbiAgICAgICAgaSwgaiwgaztcblxuICAgIHdoaWxlICh0cmlhbmdsZUluZGV4LS0pIHtcbiAgICAgICAgZmFjZSA9IGluZGljZXMuc2xpY2UodHJpYW5nbGVJbmRleCAqIDMsIHRyaWFuZ2xlSW5kZXggKiAzICsgMyk7XG4gICAgICAgIGFiYyA9IGZhY2UubWFwKGZ1bmN0aW9uKHZlcnRJbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMzKHZlcnRpY2VzW3ZlcnRJbmRleCAqIDNdLCB2ZXJ0aWNlc1t2ZXJ0SW5kZXggKiAzICsgMV0sIHZlcnRpY2VzW3ZlcnRJbmRleCAqIDMgKyAyXSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMubm9ybWFsaXplKFZlYzMuYWRkKGFiY1swXSwgYWJjWzFdLCBvdXRwdXRzWzBdKSwgb3V0cHV0c1sxXSkudG9BcnJheSgpKTtcbiAgICAgICAgdmVydGljZXMucHVzaC5hcHBseSh2ZXJ0aWNlcywgVmVjMy5ub3JtYWxpemUoVmVjMy5hZGQoYWJjWzFdLCBhYmNbMl0sIG91dHB1dHNbMF0pLCBvdXRwdXRzWzFdKS50b0FycmF5KCkpO1xuICAgICAgICB2ZXJ0aWNlcy5wdXNoLmFwcGx5KHZlcnRpY2VzLCBWZWMzLm5vcm1hbGl6ZShWZWMzLmFkZChhYmNbMF0sIGFiY1syXSwgb3V0cHV0c1swXSksIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG5cbiAgICAgICAgaSA9IHZlcnRpY2VzLmxlbmd0aCAvIDMgLSAzO1xuICAgICAgICBqID0gaSArIDE7XG4gICAgICAgIGsgPSBpICsgMjtcblxuICAgICAgICBpbmRpY2VzLnB1c2goaSwgaiwgayk7XG4gICAgICAgIGluZGljZXMucHVzaChmYWNlWzBdLCBpLCBrKTtcbiAgICAgICAgaW5kaWNlcy5wdXNoKGksIGZhY2VbMV0sIGopO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXggKiAzXSA9IGs7XG4gICAgICAgIGluZGljZXNbdHJpYW5nbGVJbmRleCAqIDMgKyAxXSA9IGo7XG4gICAgICAgIGluZGljZXNbdHJpYW5nbGVJbmRleCAqIDMgKyAyXSA9IGZhY2VbMl07XG4gICAgfVxufTtcblxuLyoqXG4gKiBEaXZpZGVzIGFsbCBpbnNlcnRlZCB0cmlhbmdsZXMgaW50byBmb3VyIHN1Yi10cmlhbmdsZXMgd2hpbGUgbWFpbnRhaW5pbmdcbiAqIGEgcmFkaXVzIG9mIG9uZS4gQWx0ZXJzIHRoZSBwYXNzZWQgaW4gYXJyYXlzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBWZXJ0aWNlcyBvZiBhbGwgcG9pbnRzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IE9wdGlvbmFsIGFycmF5IHRvIGJlIGZpbGxlZCB3aXRoIHJlc3VsdGluZyBub3JtYWxzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBjYWxjdWxhdGVkIG5vcm1hbHMuXG4gKi9cbkdlb21ldHJ5SGVscGVyLmdldFNwaGVyb2lkTm9ybWFscyA9IGZ1bmN0aW9uIGdldFNwaGVyb2lkTm9ybWFscyh2ZXJ0aWNlcywgb3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciBsZW5ndGggPSB2ZXJ0aWNlcy5sZW5ndGggLyAzO1xuICAgIHZhciBub3JtYWxpemVkO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBub3JtYWxpemVkID0gbmV3IFZlYzMoXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDBdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAxXSxcbiAgICAgICAgICAgIHZlcnRpY2VzW2kgKiAzICsgMl1cbiAgICAgICAgKS5ub3JtYWxpemUoKS50b0FycmF5KCk7XG5cbiAgICAgICAgb3V0W2kgKiAzICsgMF0gPSBub3JtYWxpemVkWzBdO1xuICAgICAgICBvdXRbaSAqIDMgKyAxXSA9IG5vcm1hbGl6ZWRbMV07XG4gICAgICAgIG91dFtpICogMyArIDJdID0gbm9ybWFsaXplZFsyXTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xufTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIHRleHR1cmUgY29vcmRpbmF0ZXMgZm9yIHNwaGVyb2lkIHByaW1pdGl2ZXMgYmFzZWQgb25cbiAqIGlucHV0IHZlcnRpY2VzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBWZXJ0aWNlcyBvZiBhbGwgcG9pbnRzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IE9wdGlvbmFsIGFycmF5IHRvIGJlIGZpbGxlZCB3aXRoIHJlc3VsdGluZyB0ZXh0dXJlIGNvb3JkaW5hdGVzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBjYWxjdWxhdGVkIHRleHR1cmUgY29vcmRpbmF0ZXNcbiAqL1xuR2VvbWV0cnlIZWxwZXIuZ2V0U3BoZXJvaWRVViA9IGZ1bmN0aW9uIGdldFNwaGVyb2lkVVYodmVydGljZXMsIG91dCkge1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgbGVuZ3RoID0gdmVydGljZXMubGVuZ3RoIC8gMztcbiAgICB2YXIgdmVydGV4O1xuXG4gICAgdmFyIHV2ID0gW107XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmVydGV4ID0gb3V0cHV0c1swXS5zZXQoXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogM10sXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAyXVxuICAgICAgICApXG4gICAgICAgIC5ub3JtYWxpemUoKVxuICAgICAgICAudG9BcnJheSgpO1xuXG4gICAgICAgIHV2WzBdID0gdGhpcy5nZXRBemltdXRoKHZlcnRleCkgKiAwLjUgLyBNYXRoLlBJICsgMC41O1xuICAgICAgICB1dlsxXSA9IHRoaXMuZ2V0QWx0aXR1ZGUodmVydGV4KSAvIE1hdGguUEkgKyAwLjU7XG5cbiAgICAgICAgb3V0LnB1c2guYXBwbHkob3V0LCB1dik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgdGhyb3VnaCBhbmQgbm9ybWFsaXplcyBhIGxpc3Qgb2YgdmVydGljZXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgT3B0aW9uYWwgYXJyYXkgdG8gYmUgZmlsbGVkIHdpdGggcmVzdWx0aW5nIG5vcm1hbGl6ZWQgdmVjdG9ycy5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gTmV3IGxpc3Qgb2Ygbm9ybWFsaXplZCB2ZXJ0aWNlc1xuICovXG5HZW9tZXRyeUhlbHBlci5ub3JtYWxpemVBbGwgPSBmdW5jdGlvbiBub3JtYWxpemVBbGwodmVydGljZXMsIG91dCkge1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgbGVuID0gdmVydGljZXMubGVuZ3RoIC8gMztcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3V0LCBuZXcgVmVjMyh2ZXJ0aWNlc1tpICogM10sIHZlcnRpY2VzW2kgKiAzICsgMV0sIHZlcnRpY2VzW2kgKiAzICsgMl0pLm5vcm1hbGl6ZSgpLnRvQXJyYXkoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogTm9ybWFsaXplcyBhIHNldCBvZiB2ZXJ0aWNlcyB0byBtb2RlbCBzcGFjZS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IG91dCBPcHRpb25hbCBhcnJheSB0byBiZSBmaWxsZWQgd2l0aCBtb2RlbCBzcGFjZSBwb3NpdGlvbiB2ZWN0b3JzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBPdXRwdXQgdmVydGljZXMuXG4gKi9cbkdlb21ldHJ5SGVscGVyLm5vcm1hbGl6ZVZlcnRpY2VzID0gZnVuY3Rpb24gbm9ybWFsaXplVmVydGljZXModmVydGljZXMsIG91dCkge1xuICAgIG91dCA9IG91dCB8fCBbXTtcbiAgICB2YXIgbGVuID0gdmVydGljZXMubGVuZ3RoIC8gMztcbiAgICB2YXIgdmVjdG9ycyA9IFtdO1xuICAgIHZhciBtaW5YO1xuICAgIHZhciBtYXhYO1xuICAgIHZhciBtaW5ZO1xuICAgIHZhciBtYXhZO1xuICAgIHZhciBtaW5aO1xuICAgIHZhciBtYXhaO1xuICAgIHZhciB2O1xuICAgIHZhciBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHYgPSB2ZWN0b3JzW2ldID0gbmV3IFZlYzMoXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogM10sXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAyXVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChtaW5YID09IG51bGwgfHwgdi54IDwgbWluWCkgbWluWCA9IHYueDtcbiAgICAgICAgaWYgKG1heFggPT0gbnVsbCB8fCB2LnggPiBtYXhYKSBtYXhYID0gdi54O1xuXG4gICAgICAgIGlmIChtaW5ZID09IG51bGwgfHwgdi55IDwgbWluWSkgbWluWSA9IHYueTtcbiAgICAgICAgaWYgKG1heFkgPT0gbnVsbCB8fCB2LnkgPiBtYXhZKSBtYXhZID0gdi55O1xuXG4gICAgICAgIGlmIChtaW5aID09IG51bGwgfHwgdi56IDwgbWluWikgbWluWiA9IHYuejtcbiAgICAgICAgaWYgKG1heFogPT0gbnVsbCB8fCB2LnogPiBtYXhaKSBtYXhaID0gdi56O1xuICAgIH1cblxuICAgIHZhciB0cmFuc2xhdGlvbiA9IG5ldyBWZWMzKFxuICAgICAgICBnZXRUcmFuc2xhdGlvbkZhY3RvcihtYXhYLCBtaW5YKSxcbiAgICAgICAgZ2V0VHJhbnNsYXRpb25GYWN0b3IobWF4WSwgbWluWSksXG4gICAgICAgIGdldFRyYW5zbGF0aW9uRmFjdG9yKG1heFosIG1pblopXG4gICAgKTtcblxuICAgIHZhciBzY2FsZSA9IE1hdGgubWluKFxuICAgICAgICBnZXRTY2FsZUZhY3RvcihtYXhYICsgdHJhbnNsYXRpb24ueCwgbWluWCArIHRyYW5zbGF0aW9uLngpLFxuICAgICAgICBnZXRTY2FsZUZhY3RvcihtYXhZICsgdHJhbnNsYXRpb24ueSwgbWluWSArIHRyYW5zbGF0aW9uLnkpLFxuICAgICAgICBnZXRTY2FsZUZhY3RvcihtYXhaICsgdHJhbnNsYXRpb24ueiwgbWluWiArIHRyYW5zbGF0aW9uLnopXG4gICAgKTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB2ZWN0b3JzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG91dC5wdXNoLmFwcGx5KG91dCwgdmVjdG9yc1tpXS5hZGQodHJhbnNsYXRpb24pLnNjYWxlKHNjYWxlKS50b0FycmF5KCkpO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIERldGVybWluZXMgdHJhbnNsYXRpb24gYW1vdW50IGZvciBhIGdpdmVuIGF4aXMgdG8gbm9ybWFsaXplIG1vZGVsIGNvb3JkaW5hdGVzLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1heCBNYXhpbXVtIHBvc2l0aW9uIHZhbHVlIG9mIGdpdmVuIGF4aXMgb24gdGhlIG1vZGVsLlxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbiBNaW5pbXVtIHBvc2l0aW9uIHZhbHVlIG9mIGdpdmVuIGF4aXMgb24gdGhlIG1vZGVsLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gTnVtYmVyIGJ5IHdoaWNoIHRoZSBnaXZlbiBheGlzIHNob3VsZCBiZSB0cmFuc2xhdGVkIGZvciBhbGwgdmVydGljZXMuXG4gKi9cbmZ1bmN0aW9uIGdldFRyYW5zbGF0aW9uRmFjdG9yKG1heCwgbWluKSB7XG4gICAgcmV0dXJuIC0obWluICsgKG1heCAtIG1pbikgLyAyKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHNjYWxlIGFtb3VudCBmb3IgYSBnaXZlbiBheGlzIHRvIG5vcm1hbGl6ZSBtb2RlbCBjb29yZGluYXRlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtYXggTWF4aW11bSBzY2FsZSB2YWx1ZSBvZiBnaXZlbiBheGlzIG9uIHRoZSBtb2RlbC5cbiAqIEBwYXJhbSB7TnVtYmVyfSBtaW4gTWluaW11bSBzY2FsZSB2YWx1ZSBvZiBnaXZlbiBheGlzIG9uIHRoZSBtb2RlbC5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IE51bWJlciBieSB3aGljaCB0aGUgZ2l2ZW4gYXhpcyBzaG91bGQgYmUgc2NhbGVkIGZvciBhbGwgdmVydGljZXMuXG4gKi9cbmZ1bmN0aW9uIGdldFNjYWxlRmFjdG9yKG1heCwgbWluKSB7XG4gICAgcmV0dXJuIDEgLyAoKG1heCAtIG1pbikgLyAyKTtcbn1cblxuLyoqXG4gKiBGaW5kcyB0aGUgYXppbXV0aCwgb3IgYW5nbGUgYWJvdmUgdGhlIFhZIHBsYW5lLCBvZiBhIGdpdmVuIHZlY3Rvci5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdiBWZXJ0ZXggdG8gcmV0cmVpdmUgYXppbXV0aCBmcm9tLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gQXppbXV0aCB2YWx1ZSBpbiByYWRpYW5zLlxuICovXG5HZW9tZXRyeUhlbHBlci5nZXRBemltdXRoID0gZnVuY3Rpb24gYXppbXV0aCh2KSB7XG4gICAgcmV0dXJuIE1hdGguYXRhbjIodlsyXSwgLXZbMF0pO1xufTtcblxuLyoqXG4gKiBGaW5kcyB0aGUgYWx0aXR1ZGUsIG9yIGFuZ2xlIGFib3ZlIHRoZSBYWiBwbGFuZSwgb2YgYSBnaXZlbiB2ZWN0b3IuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHYgVmVydGV4IHRvIHJldHJlaXZlIGFsdGl0dWRlIGZyb20uXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBBbHRpdHVkZSB2YWx1ZSBpbiByYWRpYW5zLlxuICovXG5HZW9tZXRyeUhlbHBlci5nZXRBbHRpdHVkZSA9IGZ1bmN0aW9uIGFsdGl0dWRlKHYpIHtcbiAgICByZXR1cm4gTWF0aC5hdGFuMigtdlsxXSwgTWF0aC5zcXJ0KCh2WzBdICogdlswXSkgKyAodlsyXSAqIHZbMl0pKSk7XG59O1xuXG4vKipcbiAqIENvbnZlcnRzIGEgbGlzdCBvZiBpbmRpY2VzIGZyb20gJ3RyaWFuZ2xlJyB0byAnbGluZScgZm9ybWF0LlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgb2YgYWxsIGZhY2VzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IEluZGljZXMgb2YgYWxsIGZhY2VzIG9uIHRoZSBnZW9tZXRyeVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBsaW5lLWZvcm1hdHRlZCBpbmRpY2VzXG4gKi9cbkdlb21ldHJ5SGVscGVyLnRyaWFuZ2xlc1RvTGluZXMgPSBmdW5jdGlvbiB0cmlhbmdsZVRvTGluZXMoaW5kaWNlcywgb3V0KSB7XG4gICAgdmFyIG51bVZlY3RvcnMgPSBpbmRpY2VzLmxlbmd0aCAvIDM7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IG51bVZlY3RvcnM7IGkrKykge1xuICAgICAgICBvdXQucHVzaChpbmRpY2VzW2kgKiAzICsgMF0sIGluZGljZXNbaSAqIDMgKyAxXSk7XG4gICAgICAgIG91dC5wdXNoKGluZGljZXNbaSAqIDMgKyAxXSwgaW5kaWNlc1tpICogMyArIDJdKTtcbiAgICAgICAgb3V0LnB1c2goaW5kaWNlc1tpICogMyArIDJdLCBpbmRpY2VzW2kgKiAzICsgMF0pO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIEFkZHMgYSByZXZlcnNlIG9yZGVyIHRyaWFuZ2xlIGZvciBldmVyeSB0cmlhbmdsZSBpbiB0aGUgbWVzaC4gQWRkcyBleHRyYSB2ZXJ0aWNlc1xuICogYW5kIGluZGljZXMgdG8gaW5wdXQgYXJyYXlzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBYLCBZLCBaIHBvc2l0aW9ucyBvZiBhbGwgdmVydGljZXMgaW4gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBpbmRpY2VzIEluZGljZXMgb2YgYWxsIGZhY2VzIG9uIHRoZSBnZW9tZXRyeVxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuR2VvbWV0cnlIZWxwZXIuYWRkQmFja2ZhY2VUcmlhbmdsZXMgPSBmdW5jdGlvbiBhZGRCYWNrZmFjZVRyaWFuZ2xlcyh2ZXJ0aWNlcywgaW5kaWNlcykge1xuICAgIHZhciBuRmFjZXMgPSBpbmRpY2VzLmxlbmd0aCAvIDM7XG5cbiAgICB2YXIgbWF4SW5kZXggPSAwO1xuICAgIHZhciBpID0gaW5kaWNlcy5sZW5ndGg7XG4gICAgd2hpbGUgKGktLSkgaWYgKGluZGljZXNbaV0gPiBtYXhJbmRleCkgbWF4SW5kZXggPSBpbmRpY2VzW2ldO1xuXG4gICAgbWF4SW5kZXgrKztcblxuICAgIGZvciAoaSA9IDA7IGkgPCBuRmFjZXM7IGkrKykge1xuICAgICAgICB2YXIgaW5kZXhPbmUgPSBpbmRpY2VzW2kgKiAzXSxcbiAgICAgICAgICAgIGluZGV4VHdvID0gaW5kaWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgaW5kZXhUaHJlZSA9IGluZGljZXNbaSAqIDMgKyAyXTtcblxuICAgICAgICBpbmRpY2VzLnB1c2goaW5kZXhPbmUgKyBtYXhJbmRleCwgaW5kZXhUaHJlZSArIG1heEluZGV4LCBpbmRleFR3byArIG1heEluZGV4KTtcbiAgICB9XG5cbiAgICAvLyBJdGVyYXRpbmcgaW5zdGVhZCBvZiAuc2xpY2UoKSBoZXJlIHRvIGF2b2lkIG1heCBjYWxsIHN0YWNrIGlzc3VlLlxuXG4gICAgdmFyIG5WZXJ0cyA9IHZlcnRpY2VzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgblZlcnRzOyBpKyspIHtcbiAgICAgICAgdmVydGljZXMucHVzaCh2ZXJ0aWNlc1tpXSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHZW9tZXRyeUhlbHBlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEdlb21ldHJ5ID0gcmVxdWlyZSgnLi4vR2VvbWV0cnknKTtcbnZhciBHZW9tZXRyeUhlbHBlciA9IHJlcXVpcmUoJy4uL0dlb21ldHJ5SGVscGVyJyk7XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiByZXR1cm5zIGEgbmV3IHN0YXRpYyBnZW9tZXRyeSwgd2hpY2ggaXMgcGFzc2VkXG4gKiBjdXN0b20gYnVmZmVyIGRhdGEuXG4gKlxuICogQGNsYXNzIFBsYW5lXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBQYXJhbWV0ZXJzIHRoYXQgYWx0ZXIgdGhlXG4gKiB2ZXJ0ZXggYnVmZmVycyBvZiB0aGUgZ2VuZXJhdGVkIGdlb21ldHJ5LlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gY29uc3RydWN0ZWQgZ2VvbWV0cnlcbiAqL1xuZnVuY3Rpb24gUGxhbmUob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHZhciBkZXRhaWxYID0gb3B0aW9ucy5kZXRhaWxYIHx8IG9wdGlvbnMuZGV0YWlsIHx8IDE7XG4gICAgdmFyIGRldGFpbFkgPSBvcHRpb25zLmRldGFpbFkgfHwgb3B0aW9ucy5kZXRhaWwgfHwgMTtcblxuICAgIHZhciB2ZXJ0aWNlcyAgICAgID0gW107XG4gICAgdmFyIHRleHR1cmVDb29yZHMgPSBbXTtcbiAgICB2YXIgbm9ybWFscyAgICAgICA9IFtdO1xuICAgIHZhciBpbmRpY2VzICAgICAgID0gW107XG5cbiAgICB2YXIgaTtcblxuICAgIGZvciAodmFyIHkgPSAwOyB5IDw9IGRldGFpbFk7IHkrKykge1xuICAgICAgICB2YXIgdCA9IHkgLyBkZXRhaWxZO1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8PSBkZXRhaWxYOyB4KyspIHtcbiAgICAgICAgICAgIHZhciBzID0geCAvIGRldGFpbFg7XG4gICAgICAgICAgICB2ZXJ0aWNlcy5wdXNoKDIuICogKHMgLSAuNSksIDIgKiAodCAtIC41KSwgMCk7XG4gICAgICAgICAgICB0ZXh0dXJlQ29vcmRzLnB1c2gocywgMSAtIHQpO1xuICAgICAgICAgICAgaWYgKHggPCBkZXRhaWxYICYmIHkgPCBkZXRhaWxZKSB7XG4gICAgICAgICAgICAgICAgaSA9IHggKyB5ICogKGRldGFpbFggKyAxKTtcbiAgICAgICAgICAgICAgICBpbmRpY2VzLnB1c2goaSwgaSArIDEsIGkgKyBkZXRhaWxYICsgMSk7XG4gICAgICAgICAgICAgICAgaW5kaWNlcy5wdXNoKGkgKyBkZXRhaWxYICsgMSwgaSArIDEsIGkgKyBkZXRhaWxYICsgMik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5iYWNrZmFjZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgR2VvbWV0cnlIZWxwZXIuYWRkQmFja2ZhY2VUcmlhbmdsZXModmVydGljZXMsIGluZGljZXMpO1xuXG4gICAgICAgIC8vIGR1cGxpY2F0ZSB0ZXh0dXJlIGNvb3JkaW5hdGVzIGFzIHdlbGxcblxuICAgICAgICB2YXIgbGVuID0gdGV4dHVyZUNvb3Jkcy5sZW5ndGg7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykgdGV4dHVyZUNvb3Jkcy5wdXNoKHRleHR1cmVDb29yZHNbaV0pO1xuICAgIH1cblxuICAgIG5vcm1hbHMgPSBHZW9tZXRyeUhlbHBlci5jb21wdXRlTm9ybWFscyh2ZXJ0aWNlcywgaW5kaWNlcyk7XG5cbiAgICByZXR1cm4gbmV3IEdlb21ldHJ5KHtcbiAgICAgICAgYnVmZmVyczogW1xuICAgICAgICAgICAgeyBuYW1lOiAnYV9wb3MnLCBkYXRhOiB2ZXJ0aWNlcyB9LFxuICAgICAgICAgICAgeyBuYW1lOiAnYV90ZXhDb29yZCcsIGRhdGE6IHRleHR1cmVDb29yZHMsIHNpemU6IDIgfSxcbiAgICAgICAgICAgIHsgbmFtZTogJ2Ffbm9ybWFscycsIGRhdGE6IG5vcm1hbHMgfSxcbiAgICAgICAgICAgIHsgbmFtZTogJ2luZGljZXMnLCBkYXRhOiBpbmRpY2VzLCBzaXplOiAxIH1cbiAgICAgICAgXVxuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBsYW5lO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEJ1ZmZlciBpcyBhIHByaXZhdGUgY2xhc3MgdGhhdCB3cmFwcyB0aGUgdmVydGV4IGRhdGEgdGhhdCBkZWZpbmVzXG4gKiB0aGUgdGhlIHBvaW50cyBvZiB0aGUgdHJpYW5nbGVzIHRoYXQgd2ViZ2wgZHJhd3MuIEVhY2ggYnVmZmVyXG4gKiBtYXBzIHRvIG9uZSBhdHRyaWJ1dGUgb2YgYSBtZXNoLlxuICpcbiAqIEBjbGFzcyBCdWZmZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0YXJnZXQgVGhlIGJpbmQgdGFyZ2V0IG9mIHRoZSBidWZmZXIgdG8gdXBkYXRlOiBBUlJBWV9CVUZGRVIgb3IgRUxFTUVOVF9BUlJBWV9CVUZGRVJcbiAqIEBwYXJhbSB7T2JqZWN0fSB0eXBlIEFycmF5IHR5cGUgdG8gYmUgdXNlZCBpbiBjYWxscyB0byBnbC5idWZmZXJEYXRhLlxuICogQHBhcmFtIHtXZWJHTENvbnRleHR9IGdsIFRoZSBXZWJHTCBjb250ZXh0IHRoYXQgdGhlIGJ1ZmZlciBpcyBob3N0ZWQgYnkuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gQnVmZmVyKHRhcmdldCwgdHlwZSwgZ2wpIHtcbiAgICB0aGlzLmJ1ZmZlciA9IG51bGw7XG4gICAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLmRhdGEgPSBbXTtcbiAgICB0aGlzLmdsID0gZ2w7XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIFdlYkdMIGJ1ZmZlciBpZiBvbmUgZG9lcyBub3QgeWV0IGV4aXN0IGFuZCBiaW5kcyB0aGUgYnVmZmVyIHRvXG4gKiB0byB0aGUgY29udGV4dC4gUnVucyBidWZmZXJEYXRhIHdpdGggYXBwcm9wcmlhdGUgZGF0YS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQnVmZmVyLnByb3RvdHlwZS5zdWJEYXRhID0gZnVuY3Rpb24gc3ViRGF0YSgpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBkYXRhID0gW107XG5cbiAgICAvLyB0byBwcmV2ZW50IGFnYWluc3QgbWF4aW11bSBjYWxsLXN0YWNrIGlzc3VlLlxuICAgIGZvciAodmFyIGkgPSAwLCBjaHVuayA9IDEwMDAwOyBpIDwgdGhpcy5kYXRhLmxlbmd0aDsgaSArPSBjaHVuaylcbiAgICAgICAgZGF0YSA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoZGF0YSwgdGhpcy5kYXRhLnNsaWNlKGksIGkgKyBjaHVuaykpO1xuXG4gICAgdGhpcy5idWZmZXIgPSB0aGlzLmJ1ZmZlciB8fCBnbC5jcmVhdGVCdWZmZXIoKTtcbiAgICBnbC5iaW5kQnVmZmVyKHRoaXMudGFyZ2V0LCB0aGlzLmJ1ZmZlcik7XG4gICAgZ2wuYnVmZmVyRGF0YSh0aGlzLnRhcmdldCwgbmV3IHRoaXMudHlwZShkYXRhKSwgZ2wuU1RBVElDX0RSQVcpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBJTkRJQ0VTID0gJ2luZGljZXMnO1xuXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnLi9CdWZmZXInKTtcblxuLyoqXG4gKiBCdWZmZXJSZWdpc3RyeSBpcyBhIGNsYXNzIHRoYXQgbWFuYWdlcyBhbGxvY2F0aW9uIG9mIGJ1ZmZlcnMgdG9cbiAqIGlucHV0IGdlb21ldHJpZXMuXG4gKlxuICogQGNsYXNzIEJ1ZmZlclJlZ2lzdHJ5XG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1dlYkdMQ29udGV4dH0gY29udGV4dCBXZWJHTCBkcmF3aW5nIGNvbnRleHQgdG8gYmUgcGFzc2VkIHRvIGJ1ZmZlcnMuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gQnVmZmVyUmVnaXN0cnkoY29udGV4dCkge1xuICAgIHRoaXMuZ2wgPSBjb250ZXh0O1xuXG4gICAgdGhpcy5yZWdpc3RyeSA9IHt9O1xuICAgIHRoaXMuX2R5bmFtaWNCdWZmZXJzID0gW107XG4gICAgdGhpcy5fc3RhdGljQnVmZmVycyA9IFtdO1xuXG4gICAgdGhpcy5fYXJyYXlCdWZmZXJNYXggPSAzMDAwMDtcbiAgICB0aGlzLl9lbGVtZW50QnVmZmVyTWF4ID0gMzAwMDA7XG59XG5cbi8qKlxuICogQmluZHMgYW5kIGZpbGxzIGFsbCB0aGUgdmVydGV4IGRhdGEgaW50byB3ZWJnbCBidWZmZXJzLiAgV2lsbCByZXVzZSBidWZmZXJzIGlmXG4gKiBwb3NzaWJsZS4gIFBvcHVsYXRlcyByZWdpc3RyeSB3aXRoIHRoZSBuYW1lIG9mIHRoZSBidWZmZXIsIHRoZSBXZWJHTCBidWZmZXJcbiAqIG9iamVjdCwgc3BhY2luZyBvZiB0aGUgYXR0cmlidXRlLCB0aGUgYXR0cmlidXRlJ3Mgb2Zmc2V0IHdpdGhpbiB0aGUgYnVmZmVyLFxuICogYW5kIGZpbmFsbHkgdGhlIGxlbmd0aCBvZiB0aGUgYnVmZmVyLiAgVGhpcyBpbmZvcm1hdGlvbiBpcyBsYXRlciBhY2Nlc3NlZCBieVxuICogdGhlIHJvb3QgdG8gZHJhdyB0aGUgYnVmZmVycy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGdlb21ldHJ5SWQgSWQgb2YgdGhlIGdlb21ldHJ5IGluc3RhbmNlIHRoYXQgaG9sZHMgdGhlIGJ1ZmZlcnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBLZXkgb2YgdGhlIGlucHV0IGJ1ZmZlciBpbiB0aGUgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge0FycmF5fSB2YWx1ZSBGbGF0IGFycmF5IGNvbnRhaW5pbmcgaW5wdXQgZGF0YSBmb3IgYnVmZmVyLlxuICogQHBhcmFtIHtOdW1iZXJ9IHNwYWNpbmcgVGhlIHNwYWNpbmcsIG9yIGl0ZW1TaXplLCBvZiB0aGUgaW5wdXQgYnVmZmVyLlxuICogQHBhcmFtIHtCb29sZWFufSBkeW5hbWljIEJvb2xlYW4gZGVub3Rpbmcgd2hldGhlciBhIGdlb21ldHJ5IGlzIGR5bmFtaWMgb3Igc3RhdGljLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkJ1ZmZlclJlZ2lzdHJ5LnByb3RvdHlwZS5hbGxvY2F0ZSA9IGZ1bmN0aW9uIGFsbG9jYXRlKGdlb21ldHJ5SWQsIG5hbWUsIHZhbHVlLCBzcGFjaW5nLCBkeW5hbWljKSB7XG4gICAgdmFyIHZlcnRleEJ1ZmZlcnMgPSB0aGlzLnJlZ2lzdHJ5W2dlb21ldHJ5SWRdIHx8ICh0aGlzLnJlZ2lzdHJ5W2dlb21ldHJ5SWRdID0geyBrZXlzOiBbXSwgdmFsdWVzOiBbXSwgc3BhY2luZzogW10sIG9mZnNldDogW10sIGxlbmd0aDogW10gfSk7XG5cbiAgICB2YXIgaiA9IHZlcnRleEJ1ZmZlcnMua2V5cy5pbmRleE9mKG5hbWUpO1xuICAgIHZhciBpc0luZGV4ID0gbmFtZSA9PT0gSU5ESUNFUztcbiAgICB2YXIgYnVmZmVyRm91bmQgPSBmYWxzZTtcbiAgICB2YXIgbmV3T2Zmc2V0O1xuICAgIHZhciBvZmZzZXQgPSAwO1xuICAgIHZhciBsZW5ndGg7XG4gICAgdmFyIGJ1ZmZlcjtcbiAgICB2YXIgaztcblxuICAgIGlmIChqID09PSAtMSkge1xuICAgICAgICBqID0gdmVydGV4QnVmZmVycy5rZXlzLmxlbmd0aDtcbiAgICAgICAgbGVuZ3RoID0gaXNJbmRleCA/IHZhbHVlLmxlbmd0aCA6IE1hdGguZmxvb3IodmFsdWUubGVuZ3RoIC8gc3BhY2luZyk7XG5cbiAgICAgICAgaWYgKCFkeW5hbWljKSB7XG5cbiAgICAgICAgICAgIC8vIFVzZSBhIHByZXZpb3VzbHkgY3JlYXRlZCBidWZmZXIgaWYgYXZhaWxhYmxlLlxuXG4gICAgICAgICAgICBmb3IgKGsgPSAwOyBrIDwgdGhpcy5fc3RhdGljQnVmZmVycy5sZW5ndGg7IGsrKykge1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzSW5kZXggPT09IHRoaXMuX3N0YXRpY0J1ZmZlcnNba10uaXNJbmRleCkge1xuICAgICAgICAgICAgICAgICAgICBuZXdPZmZzZXQgPSB0aGlzLl9zdGF0aWNCdWZmZXJzW2tdLm9mZnNldCArIHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCghaXNJbmRleCAmJiBuZXdPZmZzZXQgPCB0aGlzLl9hcnJheUJ1ZmZlck1heCkgfHwgKGlzSW5kZXggJiYgbmV3T2Zmc2V0IDwgdGhpcy5fZWxlbWVudEJ1ZmZlck1heCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlciA9IHRoaXMuX3N0YXRpY0J1ZmZlcnNba10uYnVmZmVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gdGhpcy5fc3RhdGljQnVmZmVyc1trXS5vZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9zdGF0aWNCdWZmZXJzW2tdLm9mZnNldCArPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXJGb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IHN0YXRpYyBidWZmZXIgaW4gbm9uZSB3ZXJlIGZvdW5kLlxuXG4gICAgICAgICAgICBpZiAoIWJ1ZmZlckZvdW5kKSB7XG4gICAgICAgICAgICAgICAgYnVmZmVyID0gbmV3IEJ1ZmZlcihcbiAgICAgICAgICAgICAgICAgICAgaXNJbmRleCA/IHRoaXMuZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIgOiB0aGlzLmdsLkFSUkFZX0JVRkZFUixcbiAgICAgICAgICAgICAgICAgICAgaXNJbmRleCA/IFVpbnQxNkFycmF5IDogRmxvYXQzMkFycmF5LFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmdsXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRpY0J1ZmZlcnMucHVzaCh7IGJ1ZmZlcjogYnVmZmVyLCBvZmZzZXQ6IHZhbHVlLmxlbmd0aCwgaXNJbmRleDogaXNJbmRleCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcblxuICAgICAgICAgICAgLy8gRm9yIGR5bmFtaWMgZ2VvbWV0cmllcywgYWx3YXlzIGNyZWF0ZSBuZXcgYnVmZmVyLlxuXG4gICAgICAgICAgICBidWZmZXIgPSBuZXcgQnVmZmVyKFxuICAgICAgICAgICAgICAgIGlzSW5kZXggPyB0aGlzLmdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSIDogdGhpcy5nbC5BUlJBWV9CVUZGRVIsXG4gICAgICAgICAgICAgICAgaXNJbmRleCA/IFVpbnQxNkFycmF5IDogRmxvYXQzMkFycmF5LFxuICAgICAgICAgICAgICAgIHRoaXMuZ2xcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHRoaXMuX2R5bmFtaWNCdWZmZXJzLnB1c2goeyBidWZmZXI6IGJ1ZmZlciwgb2Zmc2V0OiB2YWx1ZS5sZW5ndGgsIGlzSW5kZXg6IGlzSW5kZXggfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgdGhlIHJlZ2lzdHJ5IGZvciB0aGUgc3BlYyB3aXRoIGJ1ZmZlciBpbmZvcm1hdGlvbi5cblxuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLmtleXMucHVzaChuYW1lKTtcbiAgICAgICAgdmVydGV4QnVmZmVycy52YWx1ZXMucHVzaChidWZmZXIpO1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLnNwYWNpbmcucHVzaChzcGFjaW5nKTtcbiAgICAgICAgdmVydGV4QnVmZmVycy5vZmZzZXQucHVzaChvZmZzZXQpO1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLmxlbmd0aC5wdXNoKGxlbmd0aCk7XG4gICAgfVxuXG4gICAgdmFyIGxlbiA9IHZhbHVlLmxlbmd0aDtcbiAgICBmb3IgKGsgPSAwOyBrIDwgbGVuOyBrKyspIHtcbiAgICAgICAgdmVydGV4QnVmZmVycy52YWx1ZXNbal0uZGF0YVtvZmZzZXQgKyBrXSA9IHZhbHVlW2tdO1xuICAgIH1cbiAgICB2ZXJ0ZXhCdWZmZXJzLnZhbHVlc1tqXS5zdWJEYXRhKCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1ZmZlclJlZ2lzdHJ5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKipcbiAqIFRha2VzIHRoZSBvcmlnaW5hbCByZW5kZXJpbmcgY29udGV4dHMnIGNvbXBpbGVyIGZ1bmN0aW9uXG4gKiBhbmQgYXVnbWVudHMgaXQgd2l0aCBhZGRlZCBmdW5jdGlvbmFsaXR5IGZvciBwYXJzaW5nIGFuZFxuICogZGlzcGxheWluZyBlcnJvcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gQXVnbWVudGVkIGZ1bmN0aW9uXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gRGVidWcoKSB7XG4gICAgcmV0dXJuIF9hdWdtZW50RnVuY3Rpb24oXG4gICAgICAgIHRoaXMuZ2wuY29tcGlsZVNoYWRlcixcbiAgICAgICAgZnVuY3Rpb24oc2hhZGVyKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuZ2V0U2hhZGVyUGFyYW1ldGVyKHNoYWRlciwgdGhpcy5DT01QSUxFX1NUQVRVUykpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3JzID0gdGhpcy5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcik7XG4gICAgICAgICAgICAgICAgdmFyIHNvdXJjZSA9IHRoaXMuZ2V0U2hhZGVyU291cmNlKHNoYWRlcik7XG4gICAgICAgICAgICAgICAgX3Byb2Nlc3NFcnJvcnMoZXJyb3JzLCBzb3VyY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgKTtcbn07XG5cbi8vIFRha2VzIGEgZnVuY3Rpb24sIGtlZXBzIHRoZSByZWZlcmVuY2UgYW5kIHJlcGxhY2VzIGl0IGJ5IGEgY2xvc3VyZSB0aGF0XG4vLyBleGVjdXRlcyB0aGUgb3JpZ2luYWwgZnVuY3Rpb24gYW5kIHRoZSBwcm92aWRlZCBjYWxsYmFjay5cbmZ1bmN0aW9uIF9hdWdtZW50RnVuY3Rpb24oZnVuYywgY2FsbGJhY2spIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZXMgPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNhbGxiYWNrLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbn1cblxuLy8gUGFyc2VzIGVycm9ycyBhbmQgZmFpbGVkIHNvdXJjZSBjb2RlIGZyb20gc2hhZGVycyBpbiBvcmRlclxuLy8gdG8gYnVpbGQgZGlzcGxheWFibGUgZXJyb3IgYmxvY2tzLlxuLy8gSW5zcGlyZWQgYnkgSmF1bWUgU2FuY2hleiBFbGlhcy5cbmZ1bmN0aW9uIF9wcm9jZXNzRXJyb3JzKGVycm9ycywgc291cmNlKSB7XG5cbiAgICB2YXIgY3NzID0gJ2JvZHksaHRtbHtiYWNrZ3JvdW5kOiNlM2UzZTM7Zm9udC1mYW1pbHk6bW9uYWNvLG1vbm9zcGFjZTtmb250LXNpemU6MTRweDtsaW5lLWhlaWdodDoxLjdlbX0nICtcbiAgICAgICAgICAgICAgJyNzaGFkZXJSZXBvcnR7bGVmdDowO3RvcDowO3JpZ2h0OjA7Ym94LXNpemluZzpib3JkZXItYm94O3Bvc2l0aW9uOmFic29sdXRlO3otaW5kZXg6MTAwMDtjb2xvcjonICtcbiAgICAgICAgICAgICAgJyMyMjI7cGFkZGluZzoxNXB4O3doaXRlLXNwYWNlOm5vcm1hbDtsaXN0LXN0eWxlLXR5cGU6bm9uZTttYXJnaW46NTBweCBhdXRvO21heC13aWR0aDoxMjAwcHh9JyArXG4gICAgICAgICAgICAgICcjc2hhZGVyUmVwb3J0IGxpe2JhY2tncm91bmQtY29sb3I6I2ZmZjttYXJnaW46MTNweCAwO2JveC1zaGFkb3c6MCAxcHggMnB4IHJnYmEoMCwwLDAsLjE1KTsnICtcbiAgICAgICAgICAgICAgJ3BhZGRpbmc6MjBweCAzMHB4O2JvcmRlci1yYWRpdXM6MnB4O2JvcmRlci1sZWZ0OjIwcHggc29saWQgI2UwMTExMX1zcGFue2NvbG9yOiNlMDExMTE7JyArXG4gICAgICAgICAgICAgICd0ZXh0LWRlY29yYXRpb246dW5kZXJsaW5lO2ZvbnQtd2VpZ2h0OjcwMH0jc2hhZGVyUmVwb3J0IGxpIHB7cGFkZGluZzowO21hcmdpbjowfScgK1xuICAgICAgICAgICAgICAnI3NoYWRlclJlcG9ydCBsaTpudGgtY2hpbGQoZXZlbil7YmFja2dyb3VuZC1jb2xvcjojZjRmNGY0fScgK1xuICAgICAgICAgICAgICAnI3NoYWRlclJlcG9ydCBsaSBwOmZpcnN0LWNoaWxke21hcmdpbi1ib3R0b206MTBweDtjb2xvcjojNjY2fSc7XG5cbiAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF0uYXBwZW5kQ2hpbGQoZWwpO1xuICAgIGVsLnRleHRDb250ZW50ID0gY3NzO1xuXG4gICAgdmFyIHJlcG9ydCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3VsJyk7XG4gICAgcmVwb3J0LnNldEF0dHJpYnV0ZSgnaWQnLCAnc2hhZGVyUmVwb3J0Jyk7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChyZXBvcnQpO1xuXG4gICAgdmFyIHJlID0gL0VSUk9SOiBbXFxkXSs6KFtcXGRdKyk6ICguKykvZ21pO1xuICAgIHZhciBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJyk7XG5cbiAgICB2YXIgbTtcbiAgICB3aGlsZSAoKG0gPSByZS5leGVjKGVycm9ycykpICE9IG51bGwpIHtcbiAgICAgICAgaWYgKG0uaW5kZXggPT09IHJlLmxhc3RJbmRleCkgcmUubGFzdEluZGV4Kys7XG4gICAgICAgIHZhciBsaSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xpJyk7XG4gICAgICAgIHZhciBjb2RlID0gJzxwPjxzcGFuPkVSUk9SPC9zcGFuPiBcIicgKyBtWzJdICsgJ1wiIGluIGxpbmUgJyArIG1bMV0gKyAnPC9wPic7XG4gICAgICAgIGNvZGUgKz0gJzxwPjxiPicgKyBsaW5lc1ttWzFdIC0gMV0ucmVwbGFjZSgvXlsgXFx0XSsvZywgJycpICsgJzwvYj48L3A+JztcbiAgICAgICAgbGkuaW5uZXJIVE1MID0gY29kZTtcbiAgICAgICAgcmVwb3J0LmFwcGVuZENoaWxkKGxpKTtcbiAgICB9XG59XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjbG9uZSA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy9jbG9uZScpO1xudmFyIGtleVZhbHVlVG9BcnJheXMgPSByZXF1aXJlKCcuLi91dGlsaXRpZXMva2V5VmFsdWVUb0FycmF5cycpO1xuXG52YXIgdmVydGV4V3JhcHBlciA9IHJlcXVpcmUoJy4uL3dlYmdsLXNoYWRlcnMnKS52ZXJ0ZXg7XG52YXIgZnJhZ21lbnRXcmFwcGVyID0gcmVxdWlyZSgnLi4vd2ViZ2wtc2hhZGVycycpLmZyYWdtZW50O1xudmFyIERlYnVnID0gcmVxdWlyZSgnLi9EZWJ1ZycpO1xuXG52YXIgVkVSVEVYX1NIQURFUiA9IDM1NjMzO1xudmFyIEZSQUdNRU5UX1NIQURFUiA9IDM1NjMyO1xudmFyIGlkZW50aXR5TWF0cml4ID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xuXG52YXIgaGVhZGVyID0gJ3ByZWNpc2lvbiBtZWRpdW1wIGZsb2F0O1xcbic7XG5cbnZhciBUWVBFUyA9IHtcbiAgICB1bmRlZmluZWQ6ICdmbG9hdCAnLFxuICAgIDE6ICdmbG9hdCAnLFxuICAgIDI6ICd2ZWMyICcsXG4gICAgMzogJ3ZlYzMgJyxcbiAgICA0OiAndmVjNCAnLFxuICAgIDE2OiAnbWF0NCAnXG59O1xuXG52YXIgaW5wdXRUeXBlcyA9IHtcbiAgICB1X2Jhc2VDb2xvcjogJ3ZlYzQnLFxuICAgIHVfbm9ybWFsczogJ3ZlcnQnLFxuICAgIHVfZ2xvc3NpbmVzczogJ3ZlYzQnLFxuICAgIHVfcG9zaXRpb25PZmZzZXQ6ICd2ZXJ0J1xufTtcblxudmFyIG1hc2tzID0gIHtcbiAgICB2ZXJ0OiAxLFxuICAgIHZlYzM6IDIsXG4gICAgdmVjNDogNCxcbiAgICBmbG9hdDogOFxufTtcblxuLyoqXG4gKiBVbmlmb3JtIGtleXMgYW5kIHZhbHVlc1xuICovXG52YXIgdW5pZm9ybXMgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICB1X3BlcnNwZWN0aXZlOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X3ZpZXc6IGlkZW50aXR5TWF0cml4LFxuICAgIHVfcmVzb2x1dGlvbjogWzAsIDAsIDBdLFxuICAgIHVfdHJhbnNmb3JtOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X3NpemU6IFsxLCAxLCAxXSxcbiAgICB1X3RpbWU6IDAsXG4gICAgdV9vcGFjaXR5OiAxLFxuICAgIHVfbWV0YWxuZXNzOiAwLFxuICAgIHVfZ2xvc3NpbmVzczogWzAsIDAsIDAsIDBdLFxuICAgIHVfYmFzZUNvbG9yOiBbMSwgMSwgMSwgMV0sXG4gICAgdV9ub3JtYWxzOiBbMSwgMSwgMV0sXG4gICAgdV9wb3NpdGlvbk9mZnNldDogWzAsIDAsIDBdLFxuICAgIHVfbGlnaHRQb3NpdGlvbjogaWRlbnRpdHlNYXRyaXgsXG4gICAgdV9saWdodENvbG9yOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X2FtYmllbnRMaWdodDogWzAsIDAsIDBdLFxuICAgIHVfZmxhdFNoYWRpbmc6IDAsXG4gICAgdV9udW1MaWdodHM6IDBcbn0pO1xuXG4vKipcbiAqIEF0dHJpYnV0ZXMga2V5cyBhbmQgdmFsdWVzXG4gKi9cbnZhciBhdHRyaWJ1dGVzID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgYV9wb3M6IFswLCAwLCAwXSxcbiAgICBhX3RleENvb3JkOiBbMCwgMF0sXG4gICAgYV9ub3JtYWxzOiBbMCwgMCwgMF1cbn0pO1xuXG4vKipcbiAqIFZhcnlpbmdzIGtleXMgYW5kIHZhbHVlc1xuICovXG52YXIgdmFyeWluZ3MgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICB2X3RleHR1cmVDb29yZGluYXRlOiBbMCwgMF0sXG4gICAgdl9ub3JtYWw6IFswLCAwLCAwXSxcbiAgICB2X3Bvc2l0aW9uOiBbMCwgMCwgMF0sXG4gICAgdl9leWVWZWN0b3I6IFswLCAwLCAwXVxufSk7XG5cbi8qKlxuICogQSBjbGFzcyB0aGF0IGhhbmRsZXMgaW50ZXJhY3Rpb25zIHdpdGggdGhlIFdlYkdMIHNoYWRlciBwcm9ncmFtXG4gKiB1c2VkIGJ5IGEgc3BlY2lmaWMgY29udGV4dC4gIEl0IG1hbmFnZXMgY3JlYXRpb24gb2YgdGhlIHNoYWRlciBwcm9ncmFtXG4gKiBhbmQgdGhlIGF0dGFjaGVkIHZlcnRleCBhbmQgZnJhZ21lbnQgc2hhZGVycy4gIEl0IGlzIGFsc28gaW4gY2hhcmdlIG9mXG4gKiBwYXNzaW5nIGFsbCB1bmlmb3JtcyB0byB0aGUgV2ViR0xDb250ZXh0LlxuICpcbiAqIEBjbGFzcyBQcm9ncmFtXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1dlYkdMX0NvbnRleHR9IGdsIENvbnRleHQgdG8gYmUgdXNlZCB0byBjcmVhdGUgdGhlIHNoYWRlciBwcm9ncmFtXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBQcm9ncmFtIG9wdGlvbnNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBQcm9ncmFtKGdsLCBvcHRpb25zKSB7XG4gICAgdGhpcy5nbCA9IGdsO1xuICAgIHRoaXMudGV4dHVyZVNsb3RzID0gMTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgdGhpcy5yZWdpc3RlcmVkTWF0ZXJpYWxzID0ge307XG4gICAgdGhpcy5mbGFnZ2VkVW5pZm9ybXMgPSBbXTtcbiAgICB0aGlzLmNhY2hlZFVuaWZvcm1zICA9IHt9O1xuICAgIHRoaXMudW5pZm9ybVR5cGVzID0gW107XG5cbiAgICB0aGlzLmRlZmluaXRpb25WZWM0ID0gW107XG4gICAgdGhpcy5kZWZpbml0aW9uVmVjMyA9IFtdO1xuICAgIHRoaXMuZGVmaW5pdGlvbkZsb2F0ID0gW107XG4gICAgdGhpcy5hcHBsaWNhdGlvblZlYzMgPSBbXTtcbiAgICB0aGlzLmFwcGxpY2F0aW9uVmVjNCA9IFtdO1xuICAgIHRoaXMuYXBwbGljYXRpb25GbG9hdCA9IFtdO1xuICAgIHRoaXMuYXBwbGljYXRpb25WZXJ0ID0gW107XG4gICAgdGhpcy5kZWZpbml0aW9uVmVydCA9IFtdO1xuXG4gICAgdGhpcy5yZXNldFByb2dyYW0oKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgYSBtYXRlcmlhbCBoYXMgYWxyZWFkeSBiZWVuIHJlZ2lzdGVyZWQgdG9cbiAqIHRoZSBzaGFkZXIgcHJvZ3JhbS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgTmFtZSBvZiB0YXJnZXQgaW5wdXQgb2YgbWF0ZXJpYWwuXG4gKiBAcGFyYW0ge09iamVjdH0gbWF0ZXJpYWwgQ29tcGlsZWQgbWF0ZXJpYWwgb2JqZWN0IGJlaW5nIHZlcmlmaWVkLlxuICpcbiAqIEByZXR1cm4ge1Byb2dyYW19IHRoaXMgQ3VycmVudCBwcm9ncmFtLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS5yZWdpc3Rlck1hdGVyaWFsID0gZnVuY3Rpb24gcmVnaXN0ZXJNYXRlcmlhbChuYW1lLCBtYXRlcmlhbCkge1xuICAgIHZhciBjb21waWxlZCA9IG1hdGVyaWFsO1xuICAgIHZhciB0eXBlID0gaW5wdXRUeXBlc1tuYW1lXTtcbiAgICB2YXIgbWFzayA9IG1hc2tzW3R5cGVdO1xuXG4gICAgaWYgKCh0aGlzLnJlZ2lzdGVyZWRNYXRlcmlhbHNbbWF0ZXJpYWwuX2lkXSAmIG1hc2spID09PSBtYXNrKSByZXR1cm4gdGhpcztcblxuICAgIHZhciBrO1xuXG4gICAgZm9yIChrIGluIGNvbXBpbGVkLnVuaWZvcm1zKSB7XG4gICAgICAgIGlmICh1bmlmb3Jtcy5rZXlzLmluZGV4T2YoaykgPT09IC0xKSB7XG4gICAgICAgICAgICB1bmlmb3Jtcy5rZXlzLnB1c2goayk7XG4gICAgICAgICAgICB1bmlmb3Jtcy52YWx1ZXMucHVzaChjb21waWxlZC51bmlmb3Jtc1trXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGsgaW4gY29tcGlsZWQudmFyeWluZ3MpIHtcbiAgICAgICAgaWYgKHZhcnlpbmdzLmtleXMuaW5kZXhPZihrKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHZhcnlpbmdzLmtleXMucHVzaChrKTtcbiAgICAgICAgICAgIHZhcnlpbmdzLnZhbHVlcy5wdXNoKGNvbXBpbGVkLnZhcnlpbmdzW2tdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoayBpbiBjb21waWxlZC5hdHRyaWJ1dGVzKSB7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzLmtleXMuaW5kZXhPZihrKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMua2V5cy5wdXNoKGspO1xuICAgICAgICAgICAgYXR0cmlidXRlcy52YWx1ZXMucHVzaChjb21waWxlZC5hdHRyaWJ1dGVzW2tdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMucmVnaXN0ZXJlZE1hdGVyaWFsc1ttYXRlcmlhbC5faWRdIHw9IG1hc2s7XG5cbiAgICBpZiAodHlwZSA9PT0gJ2Zsb2F0Jykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25GbG9hdC5wdXNoKG1hdGVyaWFsLmRlZmluZXMpO1xuICAgICAgICB0aGlzLmRlZmluaXRpb25GbG9hdC5wdXNoKCdmbG9hdCBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25GbG9hdC5wdXNoKCdpZiAoaW50KGFicyhJRCkpID09ICcgKyBtYXRlcmlhbC5faWQgKyAnKSByZXR1cm4gZmFfJyArIG1hdGVyaWFsLl9pZCAgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICd2ZWMzJykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZWMzLnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlYzMucHVzaCgndmVjMyBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25WZWMzLnB1c2goJ2lmIChpbnQoYWJzKElELngpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICd2ZWM0Jykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZWM0LnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlYzQucHVzaCgndmVjNCBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25WZWM0LnB1c2goJ2lmIChpbnQoYWJzKElELngpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICd2ZXJ0Jykge1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZXJ0LnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlcnQucHVzaCgndmVjMyBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpIHtcXG4gJyAgKyBjb21waWxlZC5nbHNsICsgJyBcXG59Jyk7XG4gICAgICAgIHRoaXMuYXBwbGljYXRpb25WZXJ0LnB1c2goJ2lmIChpbnQoYWJzKElELngpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCk7Jyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMucmVzZXRQcm9ncmFtKCk7XG59O1xuXG4vKipcbiAqIENsZWFycyBhbGwgY2FjaGVkIHVuaWZvcm1zIGFuZCBhdHRyaWJ1dGUgbG9jYXRpb25zLiAgQXNzZW1ibGVzXG4gKiBuZXcgZnJhZ21lbnQgYW5kIHZlcnRleCBzaGFkZXJzIGFuZCBiYXNlZCBvbiBtYXRlcmlhbCBmcm9tXG4gKiBjdXJyZW50bHkgcmVnaXN0ZXJlZCBtYXRlcmlhbHMuICBBdHRhY2hlcyBzYWlkIHNoYWRlcnMgdG8gbmV3XG4gKiBzaGFkZXIgcHJvZ3JhbSBhbmQgdXBvbiBzdWNjZXNzIGxpbmtzIHByb2dyYW0gdG8gdGhlIFdlYkdMXG4gKiBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtQcm9ncmFtfSBDdXJyZW50IHByb2dyYW0uXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnJlc2V0UHJvZ3JhbSA9IGZ1bmN0aW9uIHJlc2V0UHJvZ3JhbSgpIHtcbiAgICB2YXIgdmVydGV4SGVhZGVyID0gW2hlYWRlcl07XG4gICAgdmFyIGZyYWdtZW50SGVhZGVyID0gW2hlYWRlcl07XG5cbiAgICB2YXIgZnJhZ21lbnRTb3VyY2U7XG4gICAgdmFyIHZlcnRleFNvdXJjZTtcbiAgICB2YXIgcHJvZ3JhbTtcbiAgICB2YXIgbmFtZTtcbiAgICB2YXIgdmFsdWU7XG4gICAgdmFyIGk7XG5cbiAgICB0aGlzLnVuaWZvcm1Mb2NhdGlvbnMgICA9IFtdO1xuICAgIHRoaXMuYXR0cmlidXRlTG9jYXRpb25zID0ge307XG5cbiAgICB0aGlzLnVuaWZvcm1UeXBlcyA9IHt9O1xuXG4gICAgdGhpcy5hdHRyaWJ1dGVOYW1lcyA9IGNsb25lKGF0dHJpYnV0ZXMua2V5cyk7XG4gICAgdGhpcy5hdHRyaWJ1dGVWYWx1ZXMgPSBjbG9uZShhdHRyaWJ1dGVzLnZhbHVlcyk7XG5cbiAgICB0aGlzLnZhcnlpbmdOYW1lcyA9IGNsb25lKHZhcnlpbmdzLmtleXMpO1xuICAgIHRoaXMudmFyeWluZ1ZhbHVlcyA9IGNsb25lKHZhcnlpbmdzLnZhbHVlcyk7XG5cbiAgICB0aGlzLnVuaWZvcm1OYW1lcyA9IGNsb25lKHVuaWZvcm1zLmtleXMpO1xuICAgIHRoaXMudW5pZm9ybVZhbHVlcyA9IGNsb25lKHVuaWZvcm1zLnZhbHVlcyk7XG5cbiAgICB0aGlzLmZsYWdnZWRVbmlmb3JtcyA9IFtdO1xuICAgIHRoaXMuY2FjaGVkVW5pZm9ybXMgPSB7fTtcblxuICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3VuaWZvcm0gc2FtcGxlcjJEIHVfdGV4dHVyZXNbN107XFxuJyk7XG5cbiAgICBpZiAodGhpcy5hcHBsaWNhdGlvblZlcnQubGVuZ3RoKSB7XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCd1bmlmb3JtIHNhbXBsZXIyRCB1X3RleHR1cmVzWzddO1xcbicpO1xuICAgIH1cblxuICAgIGZvcihpID0gMDsgaSA8IHRoaXMudW5pZm9ybU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSB0aGlzLnVuaWZvcm1OYW1lc1tpXTtcbiAgICAgICAgdmFsdWUgPSB0aGlzLnVuaWZvcm1WYWx1ZXNbaV07XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCd1bmlmb3JtICcgKyBUWVBFU1t2YWx1ZS5sZW5ndGhdICsgbmFtZSArICc7XFxuJyk7XG4gICAgICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3VuaWZvcm0gJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICBmb3IoaSA9IDA7IGkgPCB0aGlzLmF0dHJpYnV0ZU5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSB0aGlzLmF0dHJpYnV0ZU5hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHRoaXMuYXR0cmlidXRlVmFsdWVzW2ldO1xuICAgICAgICB2ZXJ0ZXhIZWFkZXIucHVzaCgnYXR0cmlidXRlICcgKyBUWVBFU1t2YWx1ZS5sZW5ndGhdICsgbmFtZSArICc7XFxuJyk7XG4gICAgfVxuXG4gICAgZm9yKGkgPSAwOyBpIDwgdGhpcy52YXJ5aW5nTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmFtZSA9IHRoaXMudmFyeWluZ05hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHRoaXMudmFyeWluZ1ZhbHVlc1tpXTtcbiAgICAgICAgdmVydGV4SGVhZGVyLnB1c2goJ3ZhcnlpbmcgJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gICsgbmFtZSArICc7XFxuJyk7XG4gICAgICAgIGZyYWdtZW50SGVhZGVyLnB1c2goJ3ZhcnlpbmcgJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICB2ZXJ0ZXhTb3VyY2UgPSB2ZXJ0ZXhIZWFkZXIuam9pbignJykgKyB2ZXJ0ZXhXcmFwcGVyXG4gICAgICAgIC5yZXBsYWNlKCcjdmVydF9kZWZpbml0aW9ucycsIHRoaXMuZGVmaW5pdGlvblZlcnQuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjdmVydF9hcHBsaWNhdGlvbnMnLCB0aGlzLmFwcGxpY2F0aW9uVmVydC5qb2luKCdcXG4nKSk7XG5cbiAgICBmcmFnbWVudFNvdXJjZSA9IGZyYWdtZW50SGVhZGVyLmpvaW4oJycpICsgZnJhZ21lbnRXcmFwcGVyXG4gICAgICAgIC5yZXBsYWNlKCcjdmVjM19kZWZpbml0aW9ucycsIHRoaXMuZGVmaW5pdGlvblZlYzMuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjdmVjM19hcHBsaWNhdGlvbnMnLCB0aGlzLmFwcGxpY2F0aW9uVmVjMy5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyN2ZWM0X2RlZmluaXRpb25zJywgdGhpcy5kZWZpbml0aW9uVmVjNC5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyN2ZWM0X2FwcGxpY2F0aW9ucycsIHRoaXMuYXBwbGljYXRpb25WZWM0LmpvaW4oJ1xcbicpKVxuICAgICAgICAucmVwbGFjZSgnI2Zsb2F0X2RlZmluaXRpb25zJywgdGhpcy5kZWZpbml0aW9uRmxvYXQuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjZmxvYXRfYXBwbGljYXRpb25zJywgdGhpcy5hcHBsaWNhdGlvbkZsb2F0LmpvaW4oJ1xcbicpKTtcblxuICAgIHByb2dyYW0gPSB0aGlzLmdsLmNyZWF0ZVByb2dyYW0oKTtcblxuICAgIHRoaXMuZ2wuYXR0YWNoU2hhZGVyKFxuICAgICAgICBwcm9ncmFtLFxuICAgICAgICB0aGlzLmNvbXBpbGVTaGFkZXIodGhpcy5nbC5jcmVhdGVTaGFkZXIoVkVSVEVYX1NIQURFUiksIHZlcnRleFNvdXJjZSlcbiAgICApO1xuXG4gICAgdGhpcy5nbC5hdHRhY2hTaGFkZXIoXG4gICAgICAgIHByb2dyYW0sXG4gICAgICAgIHRoaXMuY29tcGlsZVNoYWRlcih0aGlzLmdsLmNyZWF0ZVNoYWRlcihGUkFHTUVOVF9TSEFERVIpLCBmcmFnbWVudFNvdXJjZSlcbiAgICApO1xuXG4gICAgdGhpcy5nbC5saW5rUHJvZ3JhbShwcm9ncmFtKTtcblxuICAgIGlmICghIHRoaXMuZ2wuZ2V0UHJvZ3JhbVBhcmFtZXRlcihwcm9ncmFtLCB0aGlzLmdsLkxJTktfU1RBVFVTKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdsaW5rIGVycm9yOiAnICsgdGhpcy5nbC5nZXRQcm9ncmFtSW5mb0xvZyhwcm9ncmFtKSk7XG4gICAgICAgIHRoaXMucHJvZ3JhbSA9IG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnByb2dyYW0gPSBwcm9ncmFtO1xuICAgICAgICB0aGlzLmdsLnVzZVByb2dyYW0odGhpcy5wcm9ncmFtKTtcbiAgICB9XG5cbiAgICB0aGlzLnNldFVuaWZvcm1zKHRoaXMudW5pZm9ybU5hbWVzLCB0aGlzLnVuaWZvcm1WYWx1ZXMpO1xuXG4gICAgdmFyIHRleHR1cmVMb2NhdGlvbiA9IHRoaXMuZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgJ3VfdGV4dHVyZXNbMF0nKTtcbiAgICB0aGlzLmdsLnVuaWZvcm0xaXYodGV4dHVyZUxvY2F0aW9uLCBbMCwgMSwgMiwgMywgNCwgNSwgNl0pO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbXBhcmVzIHRoZSB2YWx1ZSBvZiB0aGUgaW5wdXQgdW5pZm9ybSB2YWx1ZSBhZ2FpbnN0XG4gKiB0aGUgY2FjaGVkIHZhbHVlIHN0b3JlZCBvbiB0aGUgUHJvZ3JhbSBjbGFzcy4gIFVwZGF0ZXMgYW5kXG4gKiBjcmVhdGVzIG5ldyBlbnRyaWVzIGluIHRoZSBjYWNoZSB3aGVuIG5lY2Vzc2FyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gdGFyZ2V0TmFtZSBLZXkgb2YgdW5pZm9ybSBzcGVjIGJlaW5nIGV2YWx1YXRlZC5cbiAqIEBwYXJhbSB7TnVtYmVyfEFycmF5fSB2YWx1ZSBWYWx1ZSBvZiB1bmlmb3JtIHNwZWMgYmVpbmcgZXZhbHVhdGVkLlxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IGJvb2xlYW4gSW5kaWNhdGluZyB3aGV0aGVyIHRoZSB1bmlmb3JtIGJlaW5nIHNldCBpcyBjYWNoZWQuXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnVuaWZvcm1Jc0NhY2hlZCA9IGZ1bmN0aW9uKHRhcmdldE5hbWUsIHZhbHVlKSB7XG4gICAgaWYodGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXSA9PSBudWxsKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPSBuZXcgRmxvYXQzMkFycmF5KHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGVsc2UgaWYgKHZhbHVlLmxlbmd0aCkge1xuICAgICAgICB2YXIgaSA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgaWYodmFsdWVbaV0gIT09IHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV1baV0pIHtcbiAgICAgICAgICAgICAgICBpID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHdoaWxlKGktLSkgdGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXVtpXSA9IHZhbHVlW2ldO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGVsc2UgaWYgKHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gIT09IHZhbHVlKSB7XG4gICAgICAgIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGFsbCBwYXNzaW5nIG9mIHVuaWZvcm1zIHRvIFdlYkdMIGRyYXdpbmcgY29udGV4dC4gIFRoaXNcbiAqIGZ1bmN0aW9uIHdpbGwgZmluZCB0aGUgdW5pZm9ybSBsb2NhdGlvbiBhbmQgdGhlbiwgYmFzZWQgb25cbiAqIGEgdHlwZSBpbmZlcnJlZCBmcm9tIHRoZSBqYXZhc2NyaXB0IHZhbHVlIG9mIHRoZSB1bmlmb3JtLCBpdCB3aWxsIGNhbGxcbiAqIHRoZSBhcHByb3ByaWF0ZSBmdW5jdGlvbiB0byBwYXNzIHRoZSB1bmlmb3JtIHRvIFdlYkdMLiAgRmluYWxseSxcbiAqIHNldFVuaWZvcm1zIHdpbGwgaXRlcmF0ZSB0aHJvdWdoIHRoZSBwYXNzZWQgaW4gc2hhZGVyQ2h1bmtzIChpZiBhbnkpXG4gKiBhbmQgc2V0IHRoZSBhcHByb3ByaWF0ZSB1bmlmb3JtcyB0byBzcGVjaWZ5IHdoaWNoIGNodW5rcyB0byB1c2UuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtBcnJheX0gdW5pZm9ybU5hbWVzIEFycmF5IGNvbnRhaW5pbmcgdGhlIGtleXMgb2YgYWxsIHVuaWZvcm1zIHRvIGJlIHNldC5cbiAqIEBwYXJhbSB7QXJyYXl9IHVuaWZvcm1WYWx1ZSBBcnJheSBjb250YWluaW5nIHRoZSB2YWx1ZXMgb2YgYWxsIHVuaWZvcm1zIHRvIGJlIHNldC5cbiAqXG4gKiBAcmV0dXJuIHtQcm9ncmFtfSBDdXJyZW50IHByb2dyYW0uXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnNldFVuaWZvcm1zID0gZnVuY3Rpb24gKHVuaWZvcm1OYW1lcywgdW5pZm9ybVZhbHVlKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgbG9jYXRpb247XG4gICAgdmFyIHZhbHVlO1xuICAgIHZhciBuYW1lO1xuICAgIHZhciBsZW47XG4gICAgdmFyIGk7XG5cbiAgICBpZiAoIXRoaXMucHJvZ3JhbSkgcmV0dXJuIHRoaXM7XG5cbiAgICBsZW4gPSB1bmlmb3JtTmFtZXMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBuYW1lID0gdW5pZm9ybU5hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHVuaWZvcm1WYWx1ZVtpXTtcblxuICAgICAgICAvLyBSZXRyZWl2ZSB0aGUgY2FjaGVkIGxvY2F0aW9uIG9mIHRoZSB1bmlmb3JtLFxuICAgICAgICAvLyByZXF1ZXN0aW5nIGEgbmV3IGxvY2F0aW9uIGZyb20gdGhlIFdlYkdMIGNvbnRleHRcbiAgICAgICAgLy8gaWYgaXQgZG9lcyBub3QgeWV0IGV4aXN0LlxuXG4gICAgICAgIGxvY2F0aW9uID0gdGhpcy51bmlmb3JtTG9jYXRpb25zW25hbWVdO1xuXG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsb2NhdGlvbiA9IGdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sIG5hbWUpO1xuICAgICAgICAgICAgdGhpcy51bmlmb3JtTG9jYXRpb25zW25hbWVdID0gbG9jYXRpb247XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgdmFsdWUgaXMgYWxyZWFkeSBzZXQgZm9yIHRoZVxuICAgICAgICAvLyBnaXZlbiB1bmlmb3JtLlxuXG4gICAgICAgIGlmICh0aGlzLnVuaWZvcm1Jc0NhY2hlZChuYW1lLCB2YWx1ZSkpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIERldGVybWluZSB0aGUgY29ycmVjdCBmdW5jdGlvbiBhbmQgcGFzcyB0aGUgdW5pZm9ybVxuICAgICAgICAvLyB2YWx1ZSB0byBXZWJHTC5cblxuICAgICAgICBpZiAoIXRoaXMudW5pZm9ybVR5cGVzW25hbWVdKSB7XG4gICAgICAgICAgICB0aGlzLnVuaWZvcm1UeXBlc1tuYW1lXSA9IHRoaXMuZ2V0VW5pZm9ybVR5cGVGcm9tVmFsdWUodmFsdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FsbCB1bmlmb3JtIHNldHRlciBmdW5jdGlvbiBvbiBXZWJHTCBjb250ZXh0IHdpdGggY29ycmVjdCB2YWx1ZVxuXG4gICAgICAgIHN3aXRjaCAodGhpcy51bmlmb3JtVHlwZXNbbmFtZV0pIHtcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm00ZnYnOiAgZ2wudW5pZm9ybTRmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0zZnYnOiAgZ2wudW5pZm9ybTNmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0yZnYnOiAgZ2wudW5pZm9ybTJmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0xZnYnOiAgZ2wudW5pZm9ybTFmdihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm0xZicgOiAgZ2wudW5pZm9ybTFmKGxvY2F0aW9uLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybU1hdHJpeDNmdic6IGdsLnVuaWZvcm1NYXRyaXgzZnYobG9jYXRpb24sIGZhbHNlLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybU1hdHJpeDRmdic6IGdsLnVuaWZvcm1NYXRyaXg0ZnYobG9jYXRpb24sIGZhbHNlLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEluZmVycyB1bmlmb3JtIHNldHRlciBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gdGhlIFdlYkdMIGNvbnRleHQsIGJhc2VkXG4gKiBvbiBhbiBpbnB1dCB2YWx1ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ8QXJyYXl9IHZhbHVlIFZhbHVlIGZyb20gd2hpY2ggdW5pZm9ybSB0eXBlIGlzIGluZmVycmVkLlxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB1bmlmb3JtIGZ1bmN0aW9uIGZvciBnaXZlbiB2YWx1ZS5cbiAqL1xuUHJvZ3JhbS5wcm90b3R5cGUuZ2V0VW5pZm9ybVR5cGVGcm9tVmFsdWUgPSBmdW5jdGlvbiBnZXRVbmlmb3JtVHlwZUZyb21WYWx1ZSh2YWx1ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSB8fCB2YWx1ZSBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xuICAgICAgICBzd2l0Y2ggKHZhbHVlLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FzZSAxOiAgcmV0dXJuICd1bmlmb3JtMWZ2JztcbiAgICAgICAgICAgIGNhc2UgMjogIHJldHVybiAndW5pZm9ybTJmdic7XG4gICAgICAgICAgICBjYXNlIDM6ICByZXR1cm4gJ3VuaWZvcm0zZnYnO1xuICAgICAgICAgICAgY2FzZSA0OiAgcmV0dXJuICd1bmlmb3JtNGZ2JztcbiAgICAgICAgICAgIGNhc2UgOTogIHJldHVybiAndW5pZm9ybU1hdHJpeDNmdic7XG4gICAgICAgICAgICBjYXNlIDE2OiByZXR1cm4gJ3VuaWZvcm1NYXRyaXg0ZnYnO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKCFpc05hTihwYXJzZUZsb2F0KHZhbHVlKSkgJiYgaXNGaW5pdGUodmFsdWUpKSB7XG4gICAgICAgIHJldHVybiAndW5pZm9ybTFmJztcbiAgICB9XG5cbiAgICB0aHJvdyAnY2FudCBsb2FkIHVuaWZvcm0gXCInICsgbmFtZSArICdcIiB3aXRoIHZhbHVlOicgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEFkZHMgc2hhZGVyIHNvdXJjZSB0byBzaGFkZXIgYW5kIGNvbXBpbGVzIHRoZSBpbnB1dCBzaGFkZXIuICBDaGVja3NcbiAqIGNvbXBpbGUgc3RhdHVzIGFuZCBsb2dzIGVycm9yIGlmIG5lY2Vzc2FyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHNoYWRlciBQcm9ncmFtIHRvIGJlIGNvbXBpbGVkLlxuICogQHBhcmFtIHtTdHJpbmd9IHNvdXJjZSBTb3VyY2UgdG8gYmUgdXNlZCBpbiB0aGUgc2hhZGVyLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gQ29tcGlsZWQgc2hhZGVyLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS5jb21waWxlU2hhZGVyID0gZnVuY3Rpb24gY29tcGlsZVNoYWRlcihzaGFkZXIsIHNvdXJjZSkge1xuICAgIHZhciBpID0gMTtcblxuICAgIGlmICh0aGlzLm9wdGlvbnMuZGVidWcpIHtcbiAgICAgICAgdGhpcy5nbC5jb21waWxlU2hhZGVyID0gRGVidWcuY2FsbCh0aGlzKTtcbiAgICB9XG5cbiAgICB0aGlzLmdsLnNoYWRlclNvdXJjZShzaGFkZXIsIHNvdXJjZSk7XG4gICAgdGhpcy5nbC5jb21waWxlU2hhZGVyKHNoYWRlcik7XG4gICAgaWYgKCF0aGlzLmdsLmdldFNoYWRlclBhcmFtZXRlcihzaGFkZXIsIHRoaXMuZ2wuQ09NUElMRV9TVEFUVVMpKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NvbXBpbGUgZXJyb3I6ICcgKyB0aGlzLmdsLmdldFNoYWRlckluZm9Mb2coc2hhZGVyKSk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJzE6ICcgKyBzb3VyY2UucmVwbGFjZSgvXFxuL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAnXFxuJyArIChpKz0xKSArICc6ICc7XG4gICAgICAgIH0pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2hhZGVyO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQcm9ncmFtO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRleHR1cmUgaXMgYSBwcml2YXRlIGNsYXNzIHRoYXQgc3RvcmVzIGltYWdlIGRhdGFcbiAqIHRvIGJlIGFjY2Vzc2VkIGZyb20gYSBzaGFkZXIgb3IgdXNlZCBhcyBhIHJlbmRlciB0YXJnZXQuXG4gKlxuICogQGNsYXNzIFRleHR1cmVcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7R0x9IGdsIEdMXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBPcHRpb25zXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gVGV4dHVyZShnbCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuaWQgPSBnbC5jcmVhdGVUZXh0dXJlKCk7XG4gICAgdGhpcy53aWR0aCA9IG9wdGlvbnMud2lkdGggfHwgMDtcbiAgICB0aGlzLmhlaWdodCA9IG9wdGlvbnMuaGVpZ2h0IHx8IDA7XG4gICAgdGhpcy5taXBtYXAgPSBvcHRpb25zLm1pcG1hcDtcbiAgICB0aGlzLmZvcm1hdCA9IG9wdGlvbnMuZm9ybWF0IHx8ICdSR0JBJztcbiAgICB0aGlzLnR5cGUgPSBvcHRpb25zLnR5cGUgfHwgJ1VOU0lHTkVEX0JZVEUnO1xuICAgIHRoaXMuZ2wgPSBnbDtcblxuICAgIHRoaXMuYmluZCgpO1xuXG4gICAgZ2wucGl4ZWxTdG9yZWkoZ2wuVU5QQUNLX0ZMSVBfWV9XRUJHTCwgb3B0aW9ucy5mbGlwWVdlYmdsIHx8IGZhbHNlKTtcbiAgICBnbC5waXhlbFN0b3JlaShnbC5VTlBBQ0tfUFJFTVVMVElQTFlfQUxQSEFfV0VCR0wsIG9wdGlvbnMucHJlbXVsdGlwbHlBbHBoYVdlYmdsIHx8IGZhbHNlKTtcblxuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NQUdfRklMVEVSLCBnbFtvcHRpb25zLm1hZ0ZpbHRlcl0gfHwgZ2wuTkVBUkVTVCk7XG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01JTl9GSUxURVIsIGdsW29wdGlvbnMubWluRmlsdGVyXSB8fCBnbC5ORUFSRVNUKTtcblxuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1MsIGdsW29wdGlvbnMud3JhcFNdIHx8IGdsLkNMQU1QX1RPX0VER0UpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9XUkFQX1QsIGdsW29wdGlvbnMud3JhcFRdIHx8IGdsLkNMQU1QX1RPX0VER0UpO1xufVxuXG4vKipcbiAqIEJpbmRzIHRoaXMgdGV4dHVyZSBhcyB0aGUgc2VsZWN0ZWQgdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge09iamVjdH0gQ3VycmVudCB0ZXh0dXJlIGluc3RhbmNlLlxuICovXG5UZXh0dXJlLnByb3RvdHlwZS5iaW5kID0gZnVuY3Rpb24gYmluZCgpIHtcbiAgICB0aGlzLmdsLmJpbmRUZXh0dXJlKHRoaXMuZ2wuVEVYVFVSRV8yRCwgdGhpcy5pZCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVyYXNlcyB0aGUgdGV4dHVyZSBkYXRhIGluIHRoZSBnaXZlbiB0ZXh0dXJlIHNsb3QuXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IHRleHR1cmUgaW5zdGFuY2UuXG4gKi9cblRleHR1cmUucHJvdG90eXBlLnVuYmluZCA9IGZ1bmN0aW9uIHVuYmluZCgpIHtcbiAgICB0aGlzLmdsLmJpbmRUZXh0dXJlKHRoaXMuZ2wuVEVYVFVSRV8yRCwgbnVsbCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlcGxhY2VzIHRoZSBpbWFnZSBkYXRhIGluIHRoZSB0ZXh0dXJlIHdpdGggdGhlIGdpdmVuIGltYWdlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0ltYWdlfSAgIGltZyAgICAgVGhlIGltYWdlIG9iamVjdCB0byB1cGxvYWQgcGl4ZWwgZGF0YSBmcm9tLlxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIEN1cnJlbnQgdGV4dHVyZSBpbnN0YW5jZS5cbiAqL1xuVGV4dHVyZS5wcm90b3R5cGUuc2V0SW1hZ2UgPSBmdW5jdGlvbiBzZXRJbWFnZShpbWcpIHtcbiAgICB0aGlzLmdsLnRleEltYWdlMkQodGhpcy5nbC5URVhUVVJFXzJELCAwLCB0aGlzLmdsW3RoaXMuZm9ybWF0XSwgdGhpcy5nbFt0aGlzLmZvcm1hdF0sIHRoaXMuZ2xbdGhpcy50eXBlXSwgaW1nKTtcbiAgICBpZiAodGhpcy5taXBtYXApIHRoaXMuZ2wuZ2VuZXJhdGVNaXBtYXAodGhpcy5nbC5URVhUVVJFXzJEKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVwbGFjZXMgdGhlIGltYWdlIGRhdGEgaW4gdGhlIHRleHR1cmUgd2l0aCBhbiBhcnJheSBvZiBhcmJpdHJhcnkgZGF0YS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gICBpbnB1dCAgIEFycmF5IHRvIGJlIHNldCBhcyBkYXRhIHRvIHRleHR1cmUuXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgQ3VycmVudCB0ZXh0dXJlIGluc3RhbmNlLlxuICovXG5UZXh0dXJlLnByb3RvdHlwZS5zZXRBcnJheSA9IGZ1bmN0aW9uIHNldEFycmF5KGlucHV0KSB7XG4gICAgdGhpcy5nbC50ZXhJbWFnZTJEKHRoaXMuZ2wuVEVYVFVSRV8yRCwgMCwgdGhpcy5nbFt0aGlzLmZvcm1hdF0sIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0LCAwLCB0aGlzLmdsW3RoaXMuZm9ybWF0XSwgdGhpcy5nbFt0aGlzLnR5cGVdLCBpbnB1dCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIER1bXBzIHRoZSByZ2ItcGl4ZWwgY29udGVudHMgb2YgYSB0ZXh0dXJlIGludG8gYW4gYXJyYXkgZm9yIGRlYnVnZ2luZyBwdXJwb3Nlc1xuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCAgICAgICAgeC1vZmZzZXQgYmV0d2VlbiB0ZXh0dXJlIGNvb3JkaW5hdGVzIGFuZCBzbmFwc2hvdFxuICogQHBhcmFtIHtOdW1iZXJ9IHkgICAgICAgIHktb2Zmc2V0IGJldHdlZW4gdGV4dHVyZSBjb29yZGluYXRlcyBhbmQgc25hcHNob3RcbiAqIEBwYXJhbSB7TnVtYmVyfSB3aWR0aCAgICB4LWRlcHRoIG9mIHRoZSBzbmFwc2hvdFxuICogQHBhcmFtIHtOdW1iZXJ9IGhlaWdodCAgIHktZGVwdGggb2YgdGhlIHNuYXBzaG90XG4gKlxuICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgIEFuIGFycmF5IG9mIHRoZSBwaXhlbHMgY29udGFpbmVkIGluIHRoZSBzbmFwc2hvdC5cbiAqL1xuVGV4dHVyZS5wcm90b3R5cGUucmVhZEJhY2sgPSBmdW5jdGlvbiByZWFkQmFjayh4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgcGl4ZWxzO1xuICAgIHggPSB4IHx8IDA7XG4gICAgeSA9IHkgfHwgMDtcbiAgICB3aWR0aCA9IHdpZHRoIHx8IHRoaXMud2lkdGg7XG4gICAgaGVpZ2h0ID0gaGVpZ2h0IHx8IHRoaXMuaGVpZ2h0O1xuICAgIHZhciBmYiA9IGdsLmNyZWF0ZUZyYW1lYnVmZmVyKCk7XG4gICAgZ2wuYmluZEZyYW1lYnVmZmVyKGdsLkZSQU1FQlVGRkVSLCBmYik7XG4gICAgZ2wuZnJhbWVidWZmZXJUZXh0dXJlMkQoZ2wuRlJBTUVCVUZGRVIsIGdsLkNPTE9SX0FUVEFDSE1FTlQwLCBnbC5URVhUVVJFXzJELCB0aGlzLmlkLCAwKTtcbiAgICBpZiAoZ2wuY2hlY2tGcmFtZWJ1ZmZlclN0YXR1cyhnbC5GUkFNRUJVRkZFUikgPT09IGdsLkZSQU1FQlVGRkVSX0NPTVBMRVRFKSB7XG4gICAgICAgIHBpeGVscyA9IG5ldyBVaW50OEFycmF5KHdpZHRoICogaGVpZ2h0ICogNCk7XG4gICAgICAgIGdsLnJlYWRQaXhlbHMoeCwgeSwgd2lkdGgsIGhlaWdodCwgZ2wuUkdCQSwgZ2wuVU5TSUdORURfQllURSwgcGl4ZWxzKTtcbiAgICB9XG4gICAgcmV0dXJuIHBpeGVscztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dHVyZTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBUZXh0dXJlID0gcmVxdWlyZSgnLi9UZXh0dXJlJyk7XG52YXIgY3JlYXRlQ2hlY2tlcmJvYXJkID0gcmVxdWlyZSgnLi9jcmVhdGVDaGVja2VyYm9hcmQnKTtcblxuLyoqXG4gKiBIYW5kbGVzIGxvYWRpbmcsIGJpbmRpbmcsIGFuZCByZXNhbXBsaW5nIG9mIHRleHR1cmVzIGZvciBXZWJHTFJlbmRlcmVyLlxuICpcbiAqIEBjbGFzcyBUZXh0dXJlTWFuYWdlclxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtXZWJHTF9Db250ZXh0fSBnbCBDb250ZXh0IHVzZWQgdG8gY3JlYXRlIGFuZCBiaW5kIHRleHR1cmVzLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIFRleHR1cmVNYW5hZ2VyKGdsKSB7XG4gICAgdGhpcy5yZWdpc3RyeSA9IFtdO1xuICAgIHRoaXMuX25lZWRzUmVzYW1wbGUgPSBbXTtcblxuICAgIHRoaXMuX2FjdGl2ZVRleHR1cmUgPSAwO1xuICAgIHRoaXMuX2JvdW5kVGV4dHVyZSA9IG51bGw7XG5cbiAgICB0aGlzLl9jaGVja2VyYm9hcmQgPSBjcmVhdGVDaGVja2VyYm9hcmQoKTtcblxuICAgIHRoaXMuZ2wgPSBnbDtcbn1cblxuLyoqXG4gKiBVcGRhdGUgZnVuY3Rpb24gdXNlZCBieSBXZWJHTFJlbmRlcmVyIHRvIHF1ZXVlIHJlc2FtcGxlcyBvblxuICogcmVnaXN0ZXJlZCB0ZXh0dXJlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9ICAgICAgdGltZSAgICBUaW1lIGluIG1pbGxpc2Vjb25kcyBhY2NvcmRpbmcgdG8gdGhlIGNvbXBvc2l0b3IuXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9ICAgICAgICAgIHVuZGVmaW5lZFxuICovXG5UZXh0dXJlTWFuYWdlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKHRpbWUpIHtcbiAgICB2YXIgcmVnaXN0cnlMZW5ndGggPSB0aGlzLnJlZ2lzdHJ5Lmxlbmd0aDtcblxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgcmVnaXN0cnlMZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgdGV4dHVyZSA9IHRoaXMucmVnaXN0cnlbaV07XG5cbiAgICAgICAgaWYgKHRleHR1cmUgJiYgdGV4dHVyZS5pc0xvYWRlZCAmJiB0ZXh0dXJlLnJlc2FtcGxlUmF0ZSkge1xuICAgICAgICAgICAgaWYgKCF0ZXh0dXJlLmxhc3RSZXNhbXBsZSB8fCB0aW1lIC0gdGV4dHVyZS5sYXN0UmVzYW1wbGUgPiB0ZXh0dXJlLnJlc2FtcGxlUmF0ZSkge1xuICAgICAgICAgICAgICAgIGlmICghdGhpcy5fbmVlZHNSZXNhbXBsZVt0ZXh0dXJlLmlkXSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9uZWVkc1Jlc2FtcGxlW3RleHR1cmUuaWRdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgdGV4dHVyZS5sYXN0UmVzYW1wbGUgPSB0aW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogQ3JlYXRlcyBhIHNwZWMgYW5kIGNyZWF0ZXMgYSB0ZXh0dXJlIGJhc2VkIG9uIGdpdmVuIHRleHR1cmUgZGF0YS5cbiAqIEhhbmRsZXMgbG9hZGluZyBhc3NldHMgaWYgbmVjZXNzYXJ5LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gIGlucHV0ICAgT2JqZWN0IGNvbnRhaW5pbmcgdGV4dHVyZSBpZCwgdGV4dHVyZSBkYXRhXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgYW5kIG9wdGlvbnMgdXNlZCB0byBkcmF3IHRleHR1cmUuXG4gKiBAcGFyYW0ge051bWJlcn0gIHNsb3QgICAgVGV4dHVyZSBzbG90IHRvIGJpbmQgZ2VuZXJhdGVkIHRleHR1cmUgdG8uXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9ICAgICAgdW5kZWZpbmVkXG4gKi9cblRleHR1cmVNYW5hZ2VyLnByb3RvdHlwZS5yZWdpc3RlciA9IGZ1bmN0aW9uIHJlZ2lzdGVyKGlucHV0LCBzbG90KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIHZhciBzb3VyY2UgPSBpbnB1dC5kYXRhO1xuICAgIHZhciB0ZXh0dXJlSWQgPSBpbnB1dC5pZDtcbiAgICB2YXIgb3B0aW9ucyA9IGlucHV0Lm9wdGlvbnMgfHwge307XG4gICAgdmFyIHRleHR1cmUgPSB0aGlzLnJlZ2lzdHJ5W3RleHR1cmVJZF07XG4gICAgdmFyIHNwZWM7XG5cbiAgICBpZiAoIXRleHR1cmUpIHtcblxuICAgICAgICB0ZXh0dXJlID0gbmV3IFRleHR1cmUodGhpcy5nbCwgb3B0aW9ucyk7XG4gICAgICAgIHRleHR1cmUuc2V0SW1hZ2UodGhpcy5fY2hlY2tlcmJvYXJkKTtcblxuICAgICAgICAvLyBBZGQgdGV4dHVyZSB0byByZWdpc3RyeVxuXG4gICAgICAgIHNwZWMgPSB0aGlzLnJlZ2lzdHJ5W3RleHR1cmVJZF0gPSB7XG4gICAgICAgICAgICByZXNhbXBsZVJhdGU6IG9wdGlvbnMucmVzYW1wbGVSYXRlIHx8IG51bGwsXG4gICAgICAgICAgICBsYXN0UmVzYW1wbGU6IG51bGwsXG4gICAgICAgICAgICBpc0xvYWRlZDogZmFsc2UsXG4gICAgICAgICAgICB0ZXh0dXJlOiB0ZXh0dXJlLFxuICAgICAgICAgICAgc291cmNlOiBzb3VyY2UsXG4gICAgICAgICAgICBpZDogdGV4dHVyZUlkLFxuICAgICAgICAgICAgc2xvdDogc2xvdFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEhhbmRsZSBhcnJheVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHNvdXJjZSkgfHwgc291cmNlIGluc3RhbmNlb2YgVWludDhBcnJheSB8fCBzb3VyY2UgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcbiAgICAgICAgICAgIHRoaXMuYmluZFRleHR1cmUodGV4dHVyZUlkKTtcbiAgICAgICAgICAgIHRleHR1cmUuc2V0QXJyYXkoc291cmNlKTtcbiAgICAgICAgICAgIHNwZWMuaXNMb2FkZWQgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIHZpZGVvXG5cbiAgICAgICAgZWxzZSBpZiAod2luZG93ICYmIHNvdXJjZSBpbnN0YW5jZW9mIHdpbmRvdy5IVE1MVmlkZW9FbGVtZW50KSB7XG4gICAgICAgICAgICBzb3VyY2UuYWRkRXZlbnRMaXN0ZW5lcignbG9hZGVkZGF0YScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIF90aGlzLmJpbmRUZXh0dXJlKHRleHR1cmVJZCk7XG4gICAgICAgICAgICAgICAgdGV4dHVyZS5zZXRJbWFnZShzb3VyY2UpO1xuXG4gICAgICAgICAgICAgICAgc3BlYy5pc0xvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc3BlYy5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSBpbWFnZSB1cmxcblxuICAgICAgICBlbHNlIGlmICh0eXBlb2Ygc291cmNlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgbG9hZEltYWdlKHNvdXJjZSwgZnVuY3Rpb24gKGltZykge1xuICAgICAgICAgICAgICAgIF90aGlzLmJpbmRUZXh0dXJlKHRleHR1cmVJZCk7XG4gICAgICAgICAgICAgICAgdGV4dHVyZS5zZXRJbWFnZShpbWcpO1xuXG4gICAgICAgICAgICAgICAgc3BlYy5pc0xvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgc3BlYy5zb3VyY2UgPSBpbWc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0ZXh0dXJlSWQ7XG59O1xuXG4vKipcbiAqIExvYWRzIGFuIGltYWdlIGZyb20gYSBzdHJpbmcgb3IgSW1hZ2Ugb2JqZWN0IGFuZCBleGVjdXRlcyBhIGNhbGxiYWNrIGZ1bmN0aW9uLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtPYmplY3R8U3RyaW5nfSBpbnB1dCBUaGUgaW5wdXQgaW1hZ2UgZGF0YSB0byBsb2FkIGFzIGFuIGFzc2V0LlxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGZpcmVkIHdoZW4gdGhlIGltYWdlIGhhcyBmaW5pc2hlZCBsb2FkaW5nLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gSW1hZ2Ugb2JqZWN0IGJlaW5nIGxvYWRlZC5cbiAqL1xuZnVuY3Rpb24gbG9hZEltYWdlIChpbnB1dCwgY2FsbGJhY2spIHtcbiAgICB2YXIgaW1hZ2UgPSAodHlwZW9mIGlucHV0ID09PSAnc3RyaW5nJyA/IG5ldyBJbWFnZSgpIDogaW5wdXQpIHx8IHt9O1xuICAgICAgICBpbWFnZS5jcm9zc09yaWdpbiA9ICdhbm9ueW1vdXMnO1xuXG4gICAgaWYgKCFpbWFnZS5zcmMpIGltYWdlLnNyYyA9IGlucHV0O1xuICAgIGlmICghaW1hZ2UuY29tcGxldGUpIHtcbiAgICAgICAgaW1hZ2Uub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soaW1hZ2UpO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2soaW1hZ2UpO1xuICAgIH1cblxuICAgIHJldHVybiBpbWFnZTtcbn1cblxuLyoqXG4gKiBTZXRzIGFjdGl2ZSB0ZXh0dXJlIHNsb3QgYW5kIGJpbmRzIHRhcmdldCB0ZXh0dXJlLiAgQWxzbyBoYW5kbGVzXG4gKiByZXNhbXBsaW5nIHdoZW4gbmVjZXNzYXJ5LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWQgSWRlbnRpZmllciB1c2VkIHRvIHJldHJlaXZlIHRleHR1cmUgc3BlY1xuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblRleHR1cmVNYW5hZ2VyLnByb3RvdHlwZS5iaW5kVGV4dHVyZSA9IGZ1bmN0aW9uIGJpbmRUZXh0dXJlKGlkKSB7XG4gICAgdmFyIHNwZWMgPSB0aGlzLnJlZ2lzdHJ5W2lkXTtcblxuICAgIGlmICh0aGlzLl9hY3RpdmVUZXh0dXJlICE9PSBzcGVjLnNsb3QpIHtcbiAgICAgICAgdGhpcy5nbC5hY3RpdmVUZXh0dXJlKHRoaXMuZ2wuVEVYVFVSRTAgKyBzcGVjLnNsb3QpO1xuICAgICAgICB0aGlzLl9hY3RpdmVUZXh0dXJlID0gc3BlYy5zbG90O1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ib3VuZFRleHR1cmUgIT09IGlkKSB7XG4gICAgICAgIHRoaXMuX2JvdW5kVGV4dHVyZSA9IGlkO1xuICAgICAgICBzcGVjLnRleHR1cmUuYmluZCgpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9uZWVkc1Jlc2FtcGxlW3NwZWMuaWRdKSB7XG5cbiAgICAgICAgLy8gVE9ETzogQWNjb3VudCBmb3IgcmVzYW1wbGluZyBvZiBhcnJheXMuXG5cbiAgICAgICAgc3BlYy50ZXh0dXJlLnNldEltYWdlKHNwZWMuc291cmNlKTtcbiAgICAgICAgdGhpcy5fbmVlZHNSZXNhbXBsZVtzcGVjLmlkXSA9IGZhbHNlO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVGV4dHVyZU1hbmFnZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBQcm9ncmFtID0gcmVxdWlyZSgnLi9Qcm9ncmFtJyk7XG52YXIgQnVmZmVyUmVnaXN0cnkgPSByZXF1aXJlKCcuL0J1ZmZlclJlZ2lzdHJ5Jyk7XG52YXIgUGxhbmUgPSByZXF1aXJlKCcuLi93ZWJnbC1nZW9tZXRyaWVzL3ByaW1pdGl2ZXMvUGxhbmUnKTtcbnZhciBzb3J0ZXIgPSByZXF1aXJlKCcuL3JhZGl4U29ydCcpO1xudmFyIGtleVZhbHVlVG9BcnJheXMgPSByZXF1aXJlKCcuLi91dGlsaXRpZXMva2V5VmFsdWVUb0FycmF5cycpO1xudmFyIFRleHR1cmVNYW5hZ2VyID0gcmVxdWlyZSgnLi9UZXh0dXJlTWFuYWdlcicpO1xudmFyIGNvbXBpbGVNYXRlcmlhbCA9IHJlcXVpcmUoJy4vY29tcGlsZU1hdGVyaWFsJyk7XG5cbnZhciBpZGVudGl0eSA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXTtcblxudmFyIGdsb2JhbFVuaWZvcm1zID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgJ3VfbnVtTGlnaHRzJzogMCxcbiAgICAndV9hbWJpZW50TGlnaHQnOiBuZXcgQXJyYXkoMyksXG4gICAgJ3VfbGlnaHRQb3NpdGlvbic6IG5ldyBBcnJheSgzKSxcbiAgICAndV9saWdodENvbG9yJzogbmV3IEFycmF5KDMpLFxuICAgICd1X3BlcnNwZWN0aXZlJzogbmV3IEFycmF5KDE2KSxcbiAgICAndV90aW1lJzogMCxcbiAgICAndV92aWV3JzogbmV3IEFycmF5KDE2KVxufSk7XG5cbi8qKlxuICogV2ViR0xSZW5kZXJlciBpcyBhIHByaXZhdGUgY2xhc3MgdGhhdCBtYW5hZ2VzIGFsbCBpbnRlcmFjdGlvbnMgd2l0aCB0aGUgV2ViR0xcbiAqIEFQSS4gRWFjaCBmcmFtZSBpdCByZWNlaXZlcyBjb21tYW5kcyBmcm9tIHRoZSBjb21wb3NpdG9yIGFuZCB1cGRhdGVzIGl0c1xuICogcmVnaXN0cmllcyBhY2NvcmRpbmdseS4gU3Vic2VxdWVudGx5LCB0aGUgZHJhdyBmdW5jdGlvbiBpcyBjYWxsZWQgYW5kIHRoZVxuICogV2ViR0xSZW5kZXJlciBpc3N1ZXMgZHJhdyBjYWxscyBmb3IgYWxsIG1lc2hlcyBpbiBpdHMgcmVnaXN0cnkuXG4gKlxuICogQGNsYXNzIFdlYkdMUmVuZGVyZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gY2FudmFzIFRoZSBET00gZWxlbWVudCB0aGF0IEdMIHdpbGwgcGFpbnQgaXRzZWxmIG9udG8uXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgQ29tcG9zaXRvciB1c2VkIGZvciBxdWVyeWluZyB0aGUgdGltZSBmcm9tLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIFdlYkdMUmVuZGVyZXIoY2FudmFzLCBjb21wb3NpdG9yKSB7XG4gICAgY2FudmFzLmNsYXNzTGlzdC5hZGQoJ2ZhbW91cy13ZWJnbC1yZW5kZXJlcicpO1xuXG4gICAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG4gICAgdGhpcy5jb21wb3NpdG9yID0gY29tcG9zaXRvcjtcblxuICAgIHZhciBnbCA9IHRoaXMuZ2wgPSB0aGlzLmdldFdlYkdMQ29udGV4dCh0aGlzLmNhbnZhcyk7XG5cbiAgICBnbC5jbGVhckNvbG9yKDAuMCwgMC4wLCAwLjAsIDAuMCk7XG4gICAgZ2wucG9seWdvbk9mZnNldCgwLjEsIDAuMSk7XG4gICAgZ2wuZW5hYmxlKGdsLlBPTFlHT05fT0ZGU0VUX0ZJTEwpO1xuICAgIGdsLmVuYWJsZShnbC5ERVBUSF9URVNUKTtcbiAgICBnbC5lbmFibGUoZ2wuQkxFTkQpO1xuICAgIGdsLmRlcHRoRnVuYyhnbC5MRVFVQUwpO1xuICAgIGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xuICAgIGdsLmVuYWJsZShnbC5DVUxMX0ZBQ0UpO1xuICAgIGdsLmN1bGxGYWNlKGdsLkJBQ0spO1xuXG4gICAgdGhpcy5tZXNoUmVnaXN0cnkgPSB7fTtcbiAgICB0aGlzLm1lc2hSZWdpc3RyeUtleXMgPSBbXTtcblxuICAgIHRoaXMuY3V0b3V0UmVnaXN0cnkgPSB7fTtcblxuICAgIHRoaXMuY3V0b3V0UmVnaXN0cnlLZXlzID0gW107XG5cbiAgICAvKipcbiAgICAgKiBMaWdodHNcbiAgICAgKi9cbiAgICB0aGlzLm51bUxpZ2h0cyA9IDA7XG4gICAgdGhpcy5hbWJpZW50TGlnaHRDb2xvciA9IFswLCAwLCAwXTtcbiAgICB0aGlzLmxpZ2h0UmVnaXN0cnkgPSB7fTtcbiAgICB0aGlzLmxpZ2h0UmVnaXN0cnlLZXlzID0gW107XG4gICAgdGhpcy5saWdodFBvc2l0aW9ucyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcbiAgICB0aGlzLmxpZ2h0Q29sb3JzID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xuXG4gICAgdGhpcy50ZXh0dXJlTWFuYWdlciA9IG5ldyBUZXh0dXJlTWFuYWdlcihnbCk7XG4gICAgdGhpcy50ZXhDYWNoZSA9IHt9O1xuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkgPSBuZXcgQnVmZmVyUmVnaXN0cnkoZ2wpO1xuICAgIHRoaXMucHJvZ3JhbSA9IG5ldyBQcm9ncmFtKGdsLCB7IGRlYnVnOiB0cnVlIH0pO1xuXG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgYm91bmRBcnJheUJ1ZmZlcjogbnVsbCxcbiAgICAgICAgYm91bmRFbGVtZW50QnVmZmVyOiBudWxsLFxuICAgICAgICBsYXN0RHJhd246IG51bGwsXG4gICAgICAgIGVuYWJsZWRBdHRyaWJ1dGVzOiB7fSxcbiAgICAgICAgZW5hYmxlZEF0dHJpYnV0ZXNLZXlzOiBbXVxuICAgIH07XG5cbiAgICB0aGlzLnJlc29sdXRpb25OYW1lID0gWyd1X3Jlc29sdXRpb24nXTtcbiAgICB0aGlzLnJlc29sdXRpb25WYWx1ZXMgPSBbXTtcblxuICAgIHRoaXMuY2FjaGVkU2l6ZSA9IFtdO1xuXG4gICAgLypcbiAgICBUaGUgcHJvamVjdGlvblRyYW5zZm9ybSBoYXMgc29tZSBjb25zdGFudCBjb21wb25lbnRzLCBpLmUuIHRoZSB6IHNjYWxlLCBhbmQgdGhlIHggYW5kIHkgdHJhbnNsYXRpb24uXG5cbiAgICBUaGUgeiBzY2FsZSBrZWVwcyB0aGUgZmluYWwgeiBwb3NpdGlvbiBvZiBhbnkgdmVydGV4IHdpdGhpbiB0aGUgY2xpcCdzIGRvbWFpbiBieSBzY2FsaW5nIGl0IGJ5IGFuXG4gICAgYXJiaXRyYXJpbHkgc21hbGwgY29lZmZpY2llbnQuIFRoaXMgaGFzIHRoZSBhZHZhbnRhZ2Ugb2YgYmVpbmcgYSB1c2VmdWwgZGVmYXVsdCBpbiB0aGUgZXZlbnQgb2YgdGhlXG4gICAgdXNlciBmb3Jnb2luZyBhIG5lYXIgYW5kIGZhciBwbGFuZSwgYW4gYWxpZW4gY29udmVudGlvbiBpbiBkb20gc3BhY2UgYXMgaW4gRE9NIG92ZXJsYXBwaW5nIGlzXG4gICAgY29uZHVjdGVkIHZpYSBwYWludGVyJ3MgYWxnb3JpdGhtLlxuXG4gICAgVGhlIHggYW5kIHkgdHJhbnNsYXRpb24gdHJhbnNmb3JtcyB0aGUgd29ybGQgc3BhY2Ugb3JpZ2luIHRvIHRoZSB0b3AgbGVmdCBjb3JuZXIgb2YgdGhlIHNjcmVlbi5cblxuICAgIFRoZSBmaW5hbCBjb21wb25lbnQgKHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVsxNV0pIGlzIGluaXRpYWxpemVkIGFzIDEgYmVjYXVzZSBjZXJ0YWluIHByb2plY3Rpb24gbW9kZWxzLFxuICAgIGUuZy4gdGhlIFdDMyBzcGVjaWZpZWQgbW9kZWwsIGtlZXAgdGhlIFhZIHBsYW5lIGFzIHRoZSBwcm9qZWN0aW9uIGh5cGVycGxhbmUuXG4gICAgKi9cbiAgICB0aGlzLnByb2plY3Rpb25UcmFuc2Zvcm0gPSBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgLTAuMDAwMDAxLCAwLCAtMSwgMSwgMCwgMV07XG5cbiAgICAvLyBUT0RPOiByZW1vdmUgdGhpcyBoYWNrXG5cbiAgICB2YXIgY3V0b3V0ID0gdGhpcy5jdXRvdXRHZW9tZXRyeSA9IG5ldyBQbGFuZSgpO1xuXG4gICAgdGhpcy5idWZmZXJSZWdpc3RyeS5hbGxvY2F0ZShjdXRvdXQuc3BlYy5pZCwgJ2FfcG9zJywgY3V0b3V0LnNwZWMuYnVmZmVyVmFsdWVzWzBdLCAzKTtcbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnYV90ZXhDb29yZCcsIGN1dG91dC5zcGVjLmJ1ZmZlclZhbHVlc1sxXSwgMik7XG4gICAgdGhpcy5idWZmZXJSZWdpc3RyeS5hbGxvY2F0ZShjdXRvdXQuc3BlYy5pZCwgJ2Ffbm9ybWFscycsIGN1dG91dC5zcGVjLmJ1ZmZlclZhbHVlc1syXSwgMyk7XG4gICAgdGhpcy5idWZmZXJSZWdpc3RyeS5hbGxvY2F0ZShjdXRvdXQuc3BlYy5pZCwgJ2luZGljZXMnLCBjdXRvdXQuc3BlYy5idWZmZXJWYWx1ZXNbM10sIDEpO1xufVxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIHJldHJlaXZlIHRoZSBXZWJHTFJlbmRlcmVyIGNvbnRleHQgdXNpbmcgc2V2ZXJhbFxuICogYWNjZXNzb3JzLiBGb3IgYnJvd3NlciBjb21wYXRhYmlsaXR5LiBUaHJvd3Mgb24gZXJyb3IuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjYW52YXMgQ2FudmFzIGVsZW1lbnQgZnJvbSB3aGljaCB0aGUgY29udGV4dCBpcyByZXRyZWl2ZWRcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IFdlYkdMQ29udGV4dCBvZiBjYW52YXMgZWxlbWVudFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5nZXRXZWJHTENvbnRleHQgPSBmdW5jdGlvbiBnZXRXZWJHTENvbnRleHQoY2FudmFzKSB7XG4gICAgdmFyIG5hbWVzID0gWyd3ZWJnbCcsICdleHBlcmltZW50YWwtd2ViZ2wnLCAnd2Via2l0LTNkJywgJ21vei13ZWJnbCddO1xuICAgIHZhciBjb250ZXh0ID0gbnVsbDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQobmFtZXNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgdmFyIG1zZyA9ICdFcnJvciBjcmVhdGluZyBXZWJHTCBjb250ZXh0OiAnICsgZXJyb3IucHJvdG90eXBlLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbnRleHQpIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZXh0ID8gY29udGV4dCA6IGZhbHNlO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IGJhc2Ugc3BlYyB0byB0aGUgbGlnaHQgcmVnaXN0cnkgYXQgYSBnaXZlbiBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbmV3IGxpZ2h0IGluIGxpZ2h0UmVnaXN0cnlcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IE5ld2x5IGNyZWF0ZWQgbGlnaHQgc3BlY1xuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVMaWdodCA9IGZ1bmN0aW9uIGNyZWF0ZUxpZ2h0KHBhdGgpIHtcbiAgICB0aGlzLm51bUxpZ2h0cysrO1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeUtleXMucHVzaChwYXRoKTtcbiAgICB0aGlzLmxpZ2h0UmVnaXN0cnlbcGF0aF0gPSB7XG4gICAgICAgIGNvbG9yOiBbMCwgMCwgMF0sXG4gICAgICAgIHBvc2l0aW9uOiBbMCwgMCwgMF1cbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmxpZ2h0UmVnaXN0cnlbcGF0aF07XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgYmFzZSBzcGVjIHRvIHRoZSBtZXNoIHJlZ2lzdHJ5IGF0IGEgZ2l2ZW4gcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG5ldyBtZXNoIGluIG1lc2hSZWdpc3RyeS5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IE5ld2x5IGNyZWF0ZWQgbWVzaCBzcGVjLlxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5jcmVhdGVNZXNoID0gZnVuY3Rpb24gY3JlYXRlTWVzaChwYXRoKSB7XG4gICAgdGhpcy5tZXNoUmVnaXN0cnlLZXlzLnB1c2gocGF0aCk7XG5cbiAgICB2YXIgdW5pZm9ybXMgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICAgICAgdV9vcGFjaXR5OiAxLFxuICAgICAgICB1X3RyYW5zZm9ybTogaWRlbnRpdHksXG4gICAgICAgIHVfc2l6ZTogWzAsIDAsIDBdLFxuICAgICAgICB1X2Jhc2VDb2xvcjogWzAuNSwgMC41LCAwLjUsIDFdLFxuICAgICAgICB1X3Bvc2l0aW9uT2Zmc2V0OiBbMCwgMCwgMF0sXG4gICAgICAgIHVfbm9ybWFsczogWzAsIDAsIDBdLFxuICAgICAgICB1X2ZsYXRTaGFkaW5nOiAwLFxuICAgICAgICB1X2dsb3NzaW5lc3M6IFswLCAwLCAwLCAwXVxuICAgIH0pO1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdID0ge1xuICAgICAgICBkZXB0aDogbnVsbCxcbiAgICAgICAgdW5pZm9ybUtleXM6IHVuaWZvcm1zLmtleXMsXG4gICAgICAgIHVuaWZvcm1WYWx1ZXM6IHVuaWZvcm1zLnZhbHVlcyxcbiAgICAgICAgYnVmZmVyczoge30sXG4gICAgICAgIGdlb21ldHJ5OiBudWxsLFxuICAgICAgICBkcmF3VHlwZTogbnVsbCxcbiAgICAgICAgdGV4dHVyZXM6IFtdLFxuICAgICAgICB2aXNpYmxlOiB0cnVlXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF07XG59O1xuXG4vKipcbiAqIFNldHMgZmxhZyBvbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gZG8gc2tpcCBkcmF3IHBoYXNlIGZvclxuICogY3V0b3V0IG1lc2ggYXQgZ2l2ZW4gcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIHRhcmdldCBjdXRvdXQgbWVzaC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdXNlc0N1dG91dCBJbmRpY2F0ZXMgdGhlIHByZXNlbmNlIG9mIGEgY3V0b3V0IG1lc2hcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRDdXRvdXRTdGF0ZSA9IGZ1bmN0aW9uIHNldEN1dG91dFN0YXRlKHBhdGgsIHVzZXNDdXRvdXQpIHtcbiAgICB2YXIgY3V0b3V0ID0gdGhpcy5nZXRPclNldEN1dG91dChwYXRoKTtcblxuICAgIGN1dG91dC52aXNpYmxlID0gdXNlc0N1dG91dDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBvciByZXRyZWl2ZXMgY3V0b3V0XG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiB0YXJnZXQgY3V0b3V0IG1lc2guXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBOZXdseSBjcmVhdGVkIGN1dG91dCBzcGVjLlxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5nZXRPclNldEN1dG91dCA9IGZ1bmN0aW9uIGdldE9yU2V0Q3V0b3V0KHBhdGgpIHtcbiAgICBpZiAodGhpcy5jdXRvdXRSZWdpc3RyeVtwYXRoXSkge1xuICAgICAgICByZXR1cm4gdGhpcy5jdXRvdXRSZWdpc3RyeVtwYXRoXTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciB1bmlmb3JtcyA9IGtleVZhbHVlVG9BcnJheXMoe1xuICAgICAgICAgICAgdV9vcGFjaXR5OiAwLFxuICAgICAgICAgICAgdV90cmFuc2Zvcm06IGlkZW50aXR5LnNsaWNlKCksXG4gICAgICAgICAgICB1X3NpemU6IFswLCAwLCAwXSxcbiAgICAgICAgICAgIHVfb3JpZ2luOiBbMCwgMCwgMF0sXG4gICAgICAgICAgICB1X2Jhc2VDb2xvcjogWzAsIDAsIDAsIDFdXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuY3V0b3V0UmVnaXN0cnlLZXlzLnB1c2gocGF0aCk7XG5cbiAgICAgICAgdGhpcy5jdXRvdXRSZWdpc3RyeVtwYXRoXSA9IHtcbiAgICAgICAgICAgIHVuaWZvcm1LZXlzOiB1bmlmb3Jtcy5rZXlzLFxuICAgICAgICAgICAgdW5pZm9ybVZhbHVlczogdW5pZm9ybXMudmFsdWVzLFxuICAgICAgICAgICAgZ2VvbWV0cnk6IHRoaXMuY3V0b3V0R2VvbWV0cnkuc3BlYy5pZCxcbiAgICAgICAgICAgIGRyYXdUeXBlOiB0aGlzLmN1dG91dEdlb21ldHJ5LnNwZWMudHlwZSxcbiAgICAgICAgICAgIHZpc2libGU6IHRydWVcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gdGhpcy5jdXRvdXRSZWdpc3RyeVtwYXRoXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldHMgZmxhZyBvbiBpbmRpY2F0aW5nIHdoZXRoZXIgdG8gZG8gc2tpcCBkcmF3IHBoYXNlIGZvclxuICogbWVzaCBhdCBnaXZlbiBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiB0YXJnZXQgbWVzaC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gdmlzaWJpbGl0eSBJbmRpY2F0ZXMgdGhlIHZpc2liaWxpdHkgb2YgdGFyZ2V0IG1lc2guXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0TWVzaFZpc2liaWxpdHkgPSBmdW5jdGlvbiBzZXRNZXNoVmlzaWJpbGl0eShwYXRoLCB2aXNpYmlsaXR5KSB7XG4gICAgdmFyIG1lc2ggPSB0aGlzLm1lc2hSZWdpc3RyeVtwYXRoXSB8fCB0aGlzLmNyZWF0ZU1lc2gocGF0aCk7XG5cbiAgICBtZXNoLnZpc2libGUgPSB2aXNpYmlsaXR5O1xufTtcblxuLyoqXG4gKiBEZWxldGVzIGEgbWVzaCBmcm9tIHRoZSBtZXNoUmVnaXN0cnkuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIHRhcmdldCBtZXNoLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnJlbW92ZU1lc2ggPSBmdW5jdGlvbiByZW1vdmVNZXNoKHBhdGgpIHtcbiAgICB2YXIga2V5TG9jYXRpb24gPSB0aGlzLm1lc2hSZWdpc3RyeUtleXMuaW5kZXhPZihwYXRoKTtcbiAgICB0aGlzLm1lc2hSZWdpc3RyeUtleXMuc3BsaWNlKGtleUxvY2F0aW9uLCAxKTtcbiAgICB0aGlzLm1lc2hSZWdpc3RyeVtwYXRoXSA9IG51bGw7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgb3IgcmV0cmVpdmVzIGN1dG91dFxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBjdXRvdXQgaW4gY3V0b3V0IHJlZ2lzdHJ5LlxuICogQHBhcmFtIHtTdHJpbmd9IHVuaWZvcm1OYW1lIElkZW50aWZpZXIgdXNlZCB0byB1cGxvYWQgdmFsdWVcbiAqIEBwYXJhbSB7QXJyYXl9IHVuaWZvcm1WYWx1ZSBWYWx1ZSBvZiB1bmlmb3JtIGRhdGFcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRDdXRvdXRVbmlmb3JtID0gZnVuY3Rpb24gc2V0Q3V0b3V0VW5pZm9ybShwYXRoLCB1bmlmb3JtTmFtZSwgdW5pZm9ybVZhbHVlKSB7XG4gICAgdmFyIGN1dG91dCA9IHRoaXMuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG5cbiAgICB2YXIgaW5kZXggPSBjdXRvdXQudW5pZm9ybUtleXMuaW5kZXhPZih1bmlmb3JtTmFtZSk7XG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh1bmlmb3JtVmFsdWUpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB1bmlmb3JtVmFsdWUubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGN1dG91dC51bmlmb3JtVmFsdWVzW2luZGV4XVtpXSA9IHVuaWZvcm1WYWx1ZVtpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY3V0b3V0LnVuaWZvcm1WYWx1ZXNbaW5kZXhdID0gdW5pZm9ybVZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogRWRpdHMgdGhlIG9wdGlvbnMgZmllbGQgb24gYSBtZXNoXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIHRhcmdldCBtZXNoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBNYXAgb2YgZHJhdyBvcHRpb25zIGZvciBtZXNoXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0TWVzaE9wdGlvbnMgPSBmdW5jdGlvbihwYXRoLCBvcHRpb25zKSB7XG4gICAgdmFyIG1lc2ggPSB0aGlzLm1lc2hSZWdpc3RyeVtwYXRoXSB8fCB0aGlzLmNyZWF0ZU1lc2gocGF0aCk7XG5cbiAgICBtZXNoLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBjb2xvciBvZiB0aGUgZml4ZWQgaW50ZW5zaXR5IGxpZ2h0aW5nIGluIHRoZSBzY2VuZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbGlnaHRcbiAqIEBwYXJhbSB7TnVtYmVyfSByIHJlZCBjaGFubmVsXG4gKiBAcGFyYW0ge051bWJlcn0gZyBncmVlbiBjaGFubmVsXG4gKiBAcGFyYW0ge051bWJlcn0gYiBibHVlIGNoYW5uZWxcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRBbWJpZW50TGlnaHRDb2xvciA9IGZ1bmN0aW9uIHNldEFtYmllbnRMaWdodENvbG9yKHBhdGgsIHIsIGcsIGIpIHtcbiAgICB0aGlzLmFtYmllbnRMaWdodENvbG9yWzBdID0gcjtcbiAgICB0aGlzLmFtYmllbnRMaWdodENvbG9yWzFdID0gZztcbiAgICB0aGlzLmFtYmllbnRMaWdodENvbG9yWzJdID0gYjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hhbmdlcyB0aGUgbG9jYXRpb24gb2YgdGhlIGxpZ2h0IGluIHRoZSBzY2VuZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbGlnaHRcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IHggcG9zaXRpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSB5IHkgcG9zaXRpb25cbiAqIEBwYXJhbSB7TnVtYmVyfSB6IHogcG9zaXRpb25cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRMaWdodFBvc2l0aW9uID0gZnVuY3Rpb24gc2V0TGlnaHRQb3NpdGlvbihwYXRoLCB4LCB5LCB6KSB7XG4gICAgdmFyIGxpZ2h0ID0gdGhpcy5saWdodFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTGlnaHQocGF0aCk7XG5cbiAgICBsaWdodC5wb3NpdGlvblswXSA9IHg7XG4gICAgbGlnaHQucG9zaXRpb25bMV0gPSB5O1xuICAgIGxpZ2h0LnBvc2l0aW9uWzJdID0gejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hhbmdlcyB0aGUgY29sb3Igb2YgYSBkeW5hbWljIGludGVuc2l0eSBsaWdodGluZyBpbiB0aGUgc2NlbmVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIGxpZ2h0IGluIGxpZ2h0IFJlZ2lzdHJ5LlxuICogQHBhcmFtIHtOdW1iZXJ9IHIgcmVkIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBnIGdyZWVuIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIGJsdWUgY2hhbm5lbFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldExpZ2h0Q29sb3IgPSBmdW5jdGlvbiBzZXRMaWdodENvbG9yKHBhdGgsIHIsIGcsIGIpIHtcbiAgICB2YXIgbGlnaHQgPSB0aGlzLmxpZ2h0UmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVMaWdodChwYXRoKTtcblxuICAgIGxpZ2h0LmNvbG9yWzBdID0gcjtcbiAgICBsaWdodC5jb2xvclsxXSA9IGc7XG4gICAgbGlnaHQuY29sb3JbMl0gPSBiO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb21waWxlcyBtYXRlcmlhbCBzcGVjIGludG8gcHJvZ3JhbSBzaGFkZXJcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIGN1dG91dCBpbiBjdXRvdXQgcmVnaXN0cnkuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIHRoYXQgdGhlIHJlbmRlcmluZyBpbnB1dCB0aGUgbWF0ZXJpYWwgaXMgYm91bmQgdG9cbiAqIEBwYXJhbSB7T2JqZWN0fSBtYXRlcmlhbCBNYXRlcmlhbCBzcGVjXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuaGFuZGxlTWF0ZXJpYWxJbnB1dCA9IGZ1bmN0aW9uIGhhbmRsZU1hdGVyaWFsSW5wdXQocGF0aCwgbmFtZSwgbWF0ZXJpYWwpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcbiAgICBtYXRlcmlhbCA9IGNvbXBpbGVNYXRlcmlhbChtYXRlcmlhbCwgbWVzaC50ZXh0dXJlcy5sZW5ndGgpO1xuXG4gICAgLy8gU2V0IHVuaWZvcm1zIHRvIGVuYWJsZSB0ZXh0dXJlIVxuXG4gICAgbWVzaC51bmlmb3JtVmFsdWVzW21lc2gudW5pZm9ybUtleXMuaW5kZXhPZihuYW1lKV1bMF0gPSAtbWF0ZXJpYWwuX2lkO1xuXG4gICAgLy8gUmVnaXN0ZXIgdGV4dHVyZXMhXG5cbiAgICB2YXIgaSA9IG1hdGVyaWFsLnRleHR1cmVzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgIG1lc2gudGV4dHVyZXMucHVzaChcbiAgICAgICAgICAgIHRoaXMudGV4dHVyZU1hbmFnZXIucmVnaXN0ZXIobWF0ZXJpYWwudGV4dHVyZXNbaV0sIG1lc2gudGV4dHVyZXMubGVuZ3RoICsgaSlcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICAvLyBSZWdpc3RlciBtYXRlcmlhbCFcblxuICAgIHRoaXMucHJvZ3JhbS5yZWdpc3Rlck1hdGVyaWFsKG5hbWUsIG1hdGVyaWFsKTtcblxuICAgIHJldHVybiB0aGlzLnVwZGF0ZVNpemUoKTtcbn07XG5cbi8qKlxuICogQ2hhbmdlcyB0aGUgZ2VvbWV0cnkgZGF0YSBvZiBhIG1lc2hcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIGN1dG91dCBpbiBjdXRvdXQgcmVnaXN0cnkuXG4gKiBAcGFyYW0ge09iamVjdH0gZ2VvbWV0cnkgR2VvbWV0cnkgb2JqZWN0IGNvbnRhaW5pbmcgdmVydGV4IGRhdGEgdG8gYmUgZHJhd25cbiAqIEBwYXJhbSB7TnVtYmVyfSBkcmF3VHlwZSBQcmltaXRpdmUgaWRlbnRpZmllclxuICogQHBhcmFtIHtCb29sZWFufSBkeW5hbWljIFdoZXRoZXIgZ2VvbWV0cnkgaXMgZHluYW1pY1xuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEdlb21ldHJ5ID0gZnVuY3Rpb24gc2V0R2VvbWV0cnkocGF0aCwgZ2VvbWV0cnksIGRyYXdUeXBlLCBkeW5hbWljKSB7XG4gICAgdmFyIG1lc2ggPSB0aGlzLm1lc2hSZWdpc3RyeVtwYXRoXSB8fCB0aGlzLmNyZWF0ZU1lc2gocGF0aCk7XG5cbiAgICBtZXNoLmdlb21ldHJ5ID0gZ2VvbWV0cnk7XG4gICAgbWVzaC5kcmF3VHlwZSA9IGRyYXdUeXBlO1xuICAgIG1lc2guZHluYW1pYyA9IGR5bmFtaWM7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVXBsb2FkcyBhIG5ldyB2YWx1ZSBmb3IgdGhlIHVuaWZvcm0gZGF0YSB3aGVuIHRoZSBtZXNoIGlzIGJlaW5nIGRyYXduXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBtZXNoIGluIG1lc2ggcmVnaXN0cnlcbiAqIEBwYXJhbSB7U3RyaW5nfSB1bmlmb3JtTmFtZSBJZGVudGlmaWVyIHVzZWQgdG8gdXBsb2FkIHZhbHVlXG4gKiBAcGFyYW0ge0FycmF5fSB1bmlmb3JtVmFsdWUgVmFsdWUgb2YgdW5pZm9ybSBkYXRhXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0TWVzaFVuaWZvcm0gPSBmdW5jdGlvbiBzZXRNZXNoVW5pZm9ybShwYXRoLCB1bmlmb3JtTmFtZSwgdW5pZm9ybVZhbHVlKSB7XG4gICAgdmFyIG1lc2ggPSB0aGlzLm1lc2hSZWdpc3RyeVtwYXRoXSB8fCB0aGlzLmNyZWF0ZU1lc2gocGF0aCk7XG5cbiAgICB2YXIgaW5kZXggPSBtZXNoLnVuaWZvcm1LZXlzLmluZGV4T2YodW5pZm9ybU5hbWUpO1xuXG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xuICAgICAgICBtZXNoLnVuaWZvcm1LZXlzLnB1c2godW5pZm9ybU5hbWUpO1xuICAgICAgICBtZXNoLnVuaWZvcm1WYWx1ZXMucHVzaCh1bmlmb3JtVmFsdWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgbWVzaC51bmlmb3JtVmFsdWVzW2luZGV4XSA9IHVuaWZvcm1WYWx1ZTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFRyaWdnZXJzIHRoZSAnZHJhdycgcGhhc2Ugb2YgdGhlIFdlYkdMUmVuZGVyZXIuIEl0ZXJhdGVzIHRocm91Z2ggcmVnaXN0cmllc1xuICogdG8gc2V0IHVuaWZvcm1zLCBzZXQgYXR0cmlidXRlcyBhbmQgaXNzdWUgZHJhdyBjb21tYW5kcyBmb3IgcmVuZGVyYWJsZXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBtZXNoIGluIG1lc2ggcmVnaXN0cnlcbiAqIEBwYXJhbSB7TnVtYmVyfSBnZW9tZXRyeUlkIElkIG9mIGdlb21ldHJ5IGluIGdlb21ldHJ5IHJlZ2lzdHJ5XG4gKiBAcGFyYW0ge1N0cmluZ30gYnVmZmVyTmFtZSBBdHRyaWJ1dGUgbG9jYXRpb24gbmFtZVxuICogQHBhcmFtIHtBcnJheX0gYnVmZmVyVmFsdWUgVmVydGV4IGRhdGFcbiAqIEBwYXJhbSB7TnVtYmVyfSBidWZmZXJTcGFjaW5nIFRoZSBkaW1lbnNpb25zIG9mIHRoZSB2ZXJ0ZXhcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gaXNEeW5hbWljIFdoZXRoZXIgZ2VvbWV0cnkgaXMgZHluYW1pY1xuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmJ1ZmZlckRhdGEgPSBmdW5jdGlvbiBidWZmZXJEYXRhKHBhdGgsIGdlb21ldHJ5SWQsIGJ1ZmZlck5hbWUsIGJ1ZmZlclZhbHVlLCBidWZmZXJTcGFjaW5nLCBpc0R5bmFtaWMpIHtcbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGdlb21ldHJ5SWQsIGJ1ZmZlck5hbWUsIGJ1ZmZlclZhbHVlLCBidWZmZXJTcGFjaW5nLCBpc0R5bmFtaWMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFRyaWdnZXJzIHRoZSAnZHJhdycgcGhhc2Ugb2YgdGhlIFdlYkdMUmVuZGVyZXIuIEl0ZXJhdGVzIHRocm91Z2ggcmVnaXN0cmllc1xuICogdG8gc2V0IHVuaWZvcm1zLCBzZXQgYXR0cmlidXRlcyBhbmQgaXNzdWUgZHJhdyBjb21tYW5kcyBmb3IgcmVuZGVyYWJsZXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZW5kZXJTdGF0ZSBQYXJhbWV0ZXJzIHByb3ZpZGVkIGJ5IHRoZSBjb21wb3NpdG9yLCB0aGF0IGFmZmVjdCB0aGUgcmVuZGVyaW5nIG9mIGFsbCByZW5kZXJhYmxlcy5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24gZHJhdyhyZW5kZXJTdGF0ZSkge1xuICAgIHZhciB0aW1lID0gdGhpcy5jb21wb3NpdG9yLmdldFRpbWUoKTtcblxuICAgIHRoaXMuZ2wuY2xlYXIodGhpcy5nbC5DT0xPUl9CVUZGRVJfQklUIHwgdGhpcy5nbC5ERVBUSF9CVUZGRVJfQklUKTtcbiAgICB0aGlzLnRleHR1cmVNYW5hZ2VyLnVwZGF0ZSh0aW1lKTtcblxuICAgIHRoaXMubWVzaFJlZ2lzdHJ5S2V5cyA9IHNvcnRlcih0aGlzLm1lc2hSZWdpc3RyeUtleXMsIHRoaXMubWVzaFJlZ2lzdHJ5KTtcblxuICAgIHRoaXMuc2V0R2xvYmFsVW5pZm9ybXMocmVuZGVyU3RhdGUpO1xuICAgIHRoaXMuZHJhd0N1dG91dHMoKTtcbiAgICB0aGlzLmRyYXdNZXNoZXMoKTtcbn07XG5cbi8qKlxuICogSXRlcmF0ZXMgdGhyb3VnaCBhbmQgZHJhd3MgYWxsIHJlZ2lzdGVyZWQgbWVzaGVzLiBUaGlzIGluY2x1ZGVzXG4gKiBiaW5kaW5nIHRleHR1cmVzLCBoYW5kbGluZyBkcmF3IG9wdGlvbnMsIHNldHRpbmcgbWVzaCB1bmlmb3Jtc1xuICogYW5kIGRyYXdpbmcgbWVzaCBidWZmZXJzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5kcmF3TWVzaGVzID0gZnVuY3Rpb24gZHJhd01lc2hlcygpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBidWZmZXJzO1xuICAgIHZhciBtZXNoO1xuXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IHRoaXMubWVzaFJlZ2lzdHJ5S2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBtZXNoID0gdGhpcy5tZXNoUmVnaXN0cnlbdGhpcy5tZXNoUmVnaXN0cnlLZXlzW2ldXTtcbiAgICAgICAgYnVmZmVycyA9IHRoaXMuYnVmZmVyUmVnaXN0cnkucmVnaXN0cnlbbWVzaC5nZW9tZXRyeV07XG5cbiAgICAgICAgaWYgKCFtZXNoLnZpc2libGUpIGNvbnRpbnVlO1xuXG4gICAgICAgIGlmIChtZXNoLnVuaWZvcm1WYWx1ZXNbMF0gPCAxKSB7XG4gICAgICAgICAgICBnbC5kZXB0aE1hc2soZmFsc2UpO1xuICAgICAgICAgICAgZ2wuZW5hYmxlKGdsLkJMRU5EKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGdsLmRlcHRoTWFzayh0cnVlKTtcbiAgICAgICAgICAgIGdsLmRpc2FibGUoZ2wuQkxFTkQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFidWZmZXJzKSBjb250aW51ZTtcblxuICAgICAgICB2YXIgaiA9IG1lc2gudGV4dHVyZXMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoai0tKSB0aGlzLnRleHR1cmVNYW5hZ2VyLmJpbmRUZXh0dXJlKG1lc2gudGV4dHVyZXNbal0pO1xuXG4gICAgICAgIGlmIChtZXNoLm9wdGlvbnMpIHRoaXMuaGFuZGxlT3B0aW9ucyhtZXNoLm9wdGlvbnMsIG1lc2gpO1xuXG4gICAgICAgIHRoaXMucHJvZ3JhbS5zZXRVbmlmb3JtcyhtZXNoLnVuaWZvcm1LZXlzLCBtZXNoLnVuaWZvcm1WYWx1ZXMpO1xuICAgICAgICB0aGlzLmRyYXdCdWZmZXJzKGJ1ZmZlcnMsIG1lc2guZHJhd1R5cGUsIG1lc2guZ2VvbWV0cnkpO1xuXG4gICAgICAgIGlmIChtZXNoLm9wdGlvbnMpIHRoaXMucmVzZXRPcHRpb25zKG1lc2gub3B0aW9ucyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aHJvdWdoIGFuZCBkcmF3cyBhbGwgcmVnaXN0ZXJlZCBjdXRvdXQgbWVzaGVzLiBCbGVuZGluZ1xuICogaXMgZGlzYWJsZWQsIGN1dG91dCB1bmlmb3JtcyBhcmUgc2V0IGFuZCBmaW5hbGx5IGJ1ZmZlcnMgYXJlIGRyYXduLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5kcmF3Q3V0b3V0cyA9IGZ1bmN0aW9uIGRyYXdDdXRvdXRzKCkge1xuICAgIHZhciBjdXRvdXQ7XG4gICAgdmFyIGJ1ZmZlcnM7XG4gICAgdmFyIGxlbiA9IHRoaXMuY3V0b3V0UmVnaXN0cnlLZXlzLmxlbmd0aDtcblxuICAgIGlmIChsZW4pIHtcbiAgICAgICAgdGhpcy5nbC5lbmFibGUodGhpcy5nbC5CTEVORCk7XG4gICAgICAgIHRoaXMuZ2wuZGVwdGhNYXNrKHRydWUpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgY3V0b3V0ID0gdGhpcy5jdXRvdXRSZWdpc3RyeVt0aGlzLmN1dG91dFJlZ2lzdHJ5S2V5c1tpXV07XG4gICAgICAgIGJ1ZmZlcnMgPSB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LnJlZ2lzdHJ5W2N1dG91dC5nZW9tZXRyeV07XG5cbiAgICAgICAgaWYgKCFjdXRvdXQudmlzaWJsZSkgY29udGludWU7XG5cbiAgICAgICAgdGhpcy5wcm9ncmFtLnNldFVuaWZvcm1zKGN1dG91dC51bmlmb3JtS2V5cywgY3V0b3V0LnVuaWZvcm1WYWx1ZXMpO1xuICAgICAgICB0aGlzLmRyYXdCdWZmZXJzKGJ1ZmZlcnMsIGN1dG91dC5kcmF3VHlwZSwgY3V0b3V0Lmdlb21ldHJ5KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFNldHMgdW5pZm9ybXMgdG8gYmUgc2hhcmVkIGJ5IGFsbCBtZXNoZXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSByZW5kZXJTdGF0ZSBEcmF3IHN0YXRlIG9wdGlvbnMgcGFzc2VkIGRvd24gZnJvbSBjb21wb3NpdG9yLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEdsb2JhbFVuaWZvcm1zID0gZnVuY3Rpb24gc2V0R2xvYmFsVW5pZm9ybXMocmVuZGVyU3RhdGUpIHtcbiAgICB2YXIgbGlnaHQ7XG4gICAgdmFyIHN0cmlkZTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLmxpZ2h0UmVnaXN0cnlLZXlzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGxpZ2h0ID0gdGhpcy5saWdodFJlZ2lzdHJ5W3RoaXMubGlnaHRSZWdpc3RyeUtleXNbaV1dO1xuICAgICAgICBzdHJpZGUgPSBpICogNDtcblxuICAgICAgICAvLyBCdWlsZCB0aGUgbGlnaHQgcG9zaXRpb25zJyA0eDQgbWF0cml4XG5cbiAgICAgICAgdGhpcy5saWdodFBvc2l0aW9uc1swICsgc3RyaWRlXSA9IGxpZ2h0LnBvc2l0aW9uWzBdO1xuICAgICAgICB0aGlzLmxpZ2h0UG9zaXRpb25zWzEgKyBzdHJpZGVdID0gbGlnaHQucG9zaXRpb25bMV07XG4gICAgICAgIHRoaXMubGlnaHRQb3NpdGlvbnNbMiArIHN0cmlkZV0gPSBsaWdodC5wb3NpdGlvblsyXTtcblxuICAgICAgICAvLyBCdWlsZCB0aGUgbGlnaHQgY29sb3JzJyA0eDQgbWF0cml4XG5cbiAgICAgICAgdGhpcy5saWdodENvbG9yc1swICsgc3RyaWRlXSA9IGxpZ2h0LmNvbG9yWzBdO1xuICAgICAgICB0aGlzLmxpZ2h0Q29sb3JzWzEgKyBzdHJpZGVdID0gbGlnaHQuY29sb3JbMV07XG4gICAgICAgIHRoaXMubGlnaHRDb2xvcnNbMiArIHN0cmlkZV0gPSBsaWdodC5jb2xvclsyXTtcbiAgICB9XG5cbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbMF0gPSB0aGlzLm51bUxpZ2h0cztcbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbMV0gPSB0aGlzLmFtYmllbnRMaWdodENvbG9yO1xuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1syXSA9IHRoaXMubGlnaHRQb3NpdGlvbnM7XG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzNdID0gdGhpcy5saWdodENvbG9ycztcblxuICAgIC8qXG4gICAgICogU2V0IHRpbWUgYW5kIHByb2plY3Rpb24gdW5pZm9ybXNcbiAgICAgKiBwcm9qZWN0aW5nIHdvcmxkIHNwYWNlIGludG8gYSAyZCBwbGFuZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgY2FudmFzLlxuICAgICAqIFRoZSB4IGFuZCB5IHNjYWxlICh0aGlzLnByb2plY3Rpb25UcmFuc2Zvcm1bMF0gYW5kIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVs1XSByZXNwZWN0aXZlbHkpXG4gICAgICogY29udmVydCB0aGUgcHJvamVjdGVkIGdlb21ldHJ5IGJhY2sgaW50byBjbGlwc3BhY2UuXG4gICAgICogVGhlIHBlcnBlY3RpdmUgZGl2aWRlICh0aGlzLnByb2plY3Rpb25UcmFuc2Zvcm1bMTFdKSwgYWRkcyB0aGUgeiB2YWx1ZSBvZiB0aGUgcG9pbnRcbiAgICAgKiBtdWx0aXBsaWVkIGJ5IHRoZSBwZXJzcGVjdGl2ZSBkaXZpZGUgdG8gdGhlIHcgdmFsdWUgb2YgdGhlIHBvaW50LiBJbiB0aGUgcHJvY2Vzc1xuICAgICAqIG9mIGNvbnZlcnRpbmcgZnJvbSBob21vZ2Vub3VzIGNvb3JkaW5hdGVzIHRvIE5EQyAobm9ybWFsaXplZCBkZXZpY2UgY29vcmRpbmF0ZXMpXG4gICAgICogdGhlIHggYW5kIHkgdmFsdWVzIG9mIHRoZSBwb2ludCBhcmUgZGl2aWRlZCBieSB3LCB3aGljaCBpbXBsZW1lbnRzIHBlcnNwZWN0aXZlLlxuICAgICAqL1xuICAgIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVswXSA9IDEgLyAodGhpcy5jYWNoZWRTaXplWzBdICogMC41KTtcbiAgICB0aGlzLnByb2plY3Rpb25UcmFuc2Zvcm1bNV0gPSAtMSAvICh0aGlzLmNhY2hlZFNpemVbMV0gKiAwLjUpO1xuICAgIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVsxMV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV07XG5cbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbNF0gPSB0aGlzLnByb2plY3Rpb25UcmFuc2Zvcm07XG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzVdID0gdGhpcy5jb21wb3NpdG9yLmdldFRpbWUoKSAqIDAuMDAxO1xuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1s2XSA9IHJlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm07XG5cbiAgICB0aGlzLnByb2dyYW0uc2V0VW5pZm9ybXMoZ2xvYmFsVW5pZm9ybXMua2V5cywgZ2xvYmFsVW5pZm9ybXMudmFsdWVzKTtcbn07XG5cbi8qKlxuICogTG9hZHMgdGhlIGJ1ZmZlcnMgYW5kIGlzc3VlcyB0aGUgZHJhdyBjb21tYW5kIGZvciBhIGdlb21ldHJ5LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmVydGV4QnVmZmVycyBBbGwgYnVmZmVycyB1c2VkIHRvIGRyYXcgdGhlIGdlb21ldHJ5LlxuICogQHBhcmFtIHtOdW1iZXJ9IG1vZGUgRW51bWVyYXRvciBkZWZpbmluZyB3aGF0IHByaW1pdGl2ZSB0byBkcmF3XG4gKiBAcGFyYW0ge051bWJlcn0gaWQgSUQgb2YgZ2VvbWV0cnkgYmVpbmcgZHJhd24uXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuZHJhd0J1ZmZlcnMgPSBmdW5jdGlvbiBkcmF3QnVmZmVycyh2ZXJ0ZXhCdWZmZXJzLCBtb2RlLCBpZCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIGxlbmd0aCA9IDA7XG4gICAgdmFyIGF0dHJpYnV0ZTtcbiAgICB2YXIgbG9jYXRpb247XG4gICAgdmFyIHNwYWNpbmc7XG4gICAgdmFyIG9mZnNldDtcbiAgICB2YXIgYnVmZmVyO1xuICAgIHZhciBpdGVyO1xuICAgIHZhciBqO1xuICAgIHZhciBpO1xuXG4gICAgaXRlciA9IHZlcnRleEJ1ZmZlcnMua2V5cy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGl0ZXI7IGkrKykge1xuICAgICAgICBhdHRyaWJ1dGUgPSB2ZXJ0ZXhCdWZmZXJzLmtleXNbaV07XG5cbiAgICAgICAgLy8gRG8gbm90IHNldCB2ZXJ0ZXhBdHRyaWJQb2ludGVyIGlmIGluZGV4IGJ1ZmZlci5cblxuICAgICAgICBpZiAoYXR0cmlidXRlID09PSAnaW5kaWNlcycpIHtcbiAgICAgICAgICAgIGogPSBpOyBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJldHJlaXZlIHRoZSBhdHRyaWJ1dGUgbG9jYXRpb24gYW5kIG1ha2Ugc3VyZSBpdCBpcyBlbmFibGVkLlxuXG4gICAgICAgIGxvY2F0aW9uID0gdGhpcy5wcm9ncmFtLmF0dHJpYnV0ZUxvY2F0aW9uc1thdHRyaWJ1dGVdO1xuXG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gLTEpIGNvbnRpbnVlO1xuICAgICAgICBpZiAobG9jYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbG9jYXRpb24gPSBnbC5nZXRBdHRyaWJMb2NhdGlvbih0aGlzLnByb2dyYW0ucHJvZ3JhbSwgYXR0cmlidXRlKTtcbiAgICAgICAgICAgIHRoaXMucHJvZ3JhbS5hdHRyaWJ1dGVMb2NhdGlvbnNbYXR0cmlidXRlXSA9IGxvY2F0aW9uO1xuICAgICAgICAgICAgaWYgKGxvY2F0aW9uID09PSAtMSkgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXRoaXMuc3RhdGUuZW5hYmxlZEF0dHJpYnV0ZXNbYXR0cmlidXRlXSkge1xuICAgICAgICAgICAgZ2wuZW5hYmxlVmVydGV4QXR0cmliQXJyYXkobG9jYXRpb24pO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc1thdHRyaWJ1dGVdID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUuZW5hYmxlZEF0dHJpYnV0ZXNLZXlzLnB1c2goYXR0cmlidXRlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJldHJlaXZlIGJ1ZmZlciBpbmZvcm1hdGlvbiB1c2VkIHRvIHNldCBhdHRyaWJ1dGUgcG9pbnRlci5cblxuICAgICAgICBidWZmZXIgPSB2ZXJ0ZXhCdWZmZXJzLnZhbHVlc1tpXTtcbiAgICAgICAgc3BhY2luZyA9IHZlcnRleEJ1ZmZlcnMuc3BhY2luZ1tpXTtcbiAgICAgICAgb2Zmc2V0ID0gdmVydGV4QnVmZmVycy5vZmZzZXRbaV07XG4gICAgICAgIGxlbmd0aCA9IHZlcnRleEJ1ZmZlcnMubGVuZ3RoW2ldO1xuXG4gICAgICAgIC8vIFNraXAgYmluZEJ1ZmZlciBpZiBidWZmZXIgaXMgY3VycmVudGx5IGJvdW5kLlxuXG4gICAgICAgIGlmICh0aGlzLnN0YXRlLmJvdW5kQXJyYXlCdWZmZXIgIT09IGJ1ZmZlcikge1xuICAgICAgICAgICAgZ2wuYmluZEJ1ZmZlcihidWZmZXIudGFyZ2V0LCBidWZmZXIuYnVmZmVyKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUuYm91bmRBcnJheUJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnN0YXRlLmxhc3REcmF3biAhPT0gaWQpIHtcbiAgICAgICAgICAgIGdsLnZlcnRleEF0dHJpYlBvaW50ZXIobG9jYXRpb24sIHNwYWNpbmcsIGdsLkZMT0FULCBnbC5GQUxTRSwgMCwgNCAqIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBEaXNhYmxlIGFueSBhdHRyaWJ1dGVzIHRoYXQgbm90IGN1cnJlbnRseSBiZWluZyB1c2VkLlxuXG4gICAgdmFyIGxlbiA9IHRoaXMuc3RhdGUuZW5hYmxlZEF0dHJpYnV0ZXNLZXlzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGtleSA9IHRoaXMuc3RhdGUuZW5hYmxlZEF0dHJpYnV0ZXNLZXlzW2ldO1xuICAgICAgICBpZiAodGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc1trZXldICYmIHZlcnRleEJ1ZmZlcnMua2V5cy5pbmRleE9mKGtleSkgPT09IC0xKSB7XG4gICAgICAgICAgICBnbC5kaXNhYmxlVmVydGV4QXR0cmliQXJyYXkodGhpcy5wcm9ncmFtLmF0dHJpYnV0ZUxvY2F0aW9uc1trZXldKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUuZW5hYmxlZEF0dHJpYnV0ZXNba2V5XSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGxlbmd0aCkge1xuXG4gICAgICAgIC8vIElmIGluZGV4IGJ1ZmZlciwgdXNlIGRyYXdFbGVtZW50cy5cblxuICAgICAgICBpZiAoaiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBidWZmZXIgPSB2ZXJ0ZXhCdWZmZXJzLnZhbHVlc1tqXTtcbiAgICAgICAgICAgIG9mZnNldCA9IHZlcnRleEJ1ZmZlcnMub2Zmc2V0W2pdO1xuICAgICAgICAgICAgc3BhY2luZyA9IHZlcnRleEJ1ZmZlcnMuc3BhY2luZ1tqXTtcbiAgICAgICAgICAgIGxlbmd0aCA9IHZlcnRleEJ1ZmZlcnMubGVuZ3RoW2pdO1xuXG4gICAgICAgICAgICAvLyBTa2lwIGJpbmRCdWZmZXIgaWYgYnVmZmVyIGlzIGN1cnJlbnRseSBib3VuZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGUuYm91bmRFbGVtZW50QnVmZmVyICE9PSBidWZmZXIpIHtcbiAgICAgICAgICAgICAgICBnbC5iaW5kQnVmZmVyKGJ1ZmZlci50YXJnZXQsIGJ1ZmZlci5idWZmZXIpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGUuYm91bmRFbGVtZW50QnVmZmVyID0gYnVmZmVyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBnbC5kcmF3RWxlbWVudHMoZ2xbbW9kZV0sIGxlbmd0aCwgZ2wuVU5TSUdORURfU0hPUlQsIDIgKiBvZmZzZXQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZ2wuZHJhd0FycmF5cyhnbFttb2RlXSwgMCwgbGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuc3RhdGUubGFzdERyYXduID0gaWQ7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgcGFyZW50IGNhbnZhcywgc2V0cyB0aGUgdmlld3BvcnQgc2l6ZSBvblxuICogdGhlIFdlYkdMIGNvbnRleHQgYW5kIHVwZGF0ZXMgdGhlIHJlc29sdXRpb24gdW5pZm9ybSBmb3IgdGhlIHNoYWRlciBwcm9ncmFtLlxuICogU2l6ZSBpcyByZXRyZWl2ZWQgZnJvbSB0aGUgY29udGFpbmVyIG9iamVjdCBvZiB0aGUgcmVuZGVyZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHNpemUgd2lkdGgsIGhlaWdodCBhbmQgZGVwdGggb2YgY2FudmFzXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUudXBkYXRlU2l6ZSA9IGZ1bmN0aW9uIHVwZGF0ZVNpemUoc2l6ZSkge1xuICAgIGlmIChzaXplKSB7XG4gICAgICAgIHZhciBwaXhlbFJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMTtcbiAgICAgICAgdmFyIGRpc3BsYXlXaWR0aCA9IH5+KHNpemVbMF0gKiBwaXhlbFJhdGlvKTtcbiAgICAgICAgdmFyIGRpc3BsYXlIZWlnaHQgPSB+fihzaXplWzFdICogcGl4ZWxSYXRpbyk7XG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gZGlzcGxheVdpZHRoO1xuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSBkaXNwbGF5SGVpZ2h0O1xuICAgICAgICB0aGlzLmdsLnZpZXdwb3J0KDAsIDAsIGRpc3BsYXlXaWR0aCwgZGlzcGxheUhlaWdodCk7XG5cbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzBdID0gc2l6ZVswXTtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzFdID0gc2l6ZVsxXTtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzJdID0gKHNpemVbMF0gPiBzaXplWzFdKSA/IHNpemVbMF0gOiBzaXplWzFdO1xuICAgICAgICB0aGlzLnJlc29sdXRpb25WYWx1ZXNbMF0gPSB0aGlzLmNhY2hlZFNpemU7XG4gICAgfVxuXG4gICAgdGhpcy5wcm9ncmFtLnNldFVuaWZvcm1zKHRoaXMucmVzb2x1dGlvbk5hbWUsIHRoaXMucmVzb2x1dGlvblZhbHVlcyk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgc3RhdGUgb2YgdGhlIFdlYkdMIGRyYXdpbmcgY29udGV4dCBiYXNlZCBvbiBjdXN0b20gcGFyYW1ldGVyc1xuICogZGVmaW5lZCBvbiBhIG1lc2guXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIERyYXcgc3RhdGUgb3B0aW9ucyB0byBiZSBzZXQgdG8gdGhlIGNvbnRleHQuXG4gKiBAcGFyYW0ge01lc2h9IG1lc2ggQXNzb2NpYXRlZCBNZXNoXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuaGFuZGxlT3B0aW9ucyA9IGZ1bmN0aW9uIGhhbmRsZU9wdGlvbnMob3B0aW9ucywgbWVzaCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgaWYgKCFvcHRpb25zKSByZXR1cm47XG5cbiAgICBpZiAob3B0aW9ucy5zaWRlID09PSAnZG91YmxlJykge1xuICAgICAgICB0aGlzLmdsLmN1bGxGYWNlKHRoaXMuZ2wuRlJPTlQpO1xuICAgICAgICB0aGlzLmRyYXdCdWZmZXJzKHRoaXMuYnVmZmVyUmVnaXN0cnkucmVnaXN0cnlbbWVzaC5nZW9tZXRyeV0sIG1lc2guZHJhd1R5cGUsIG1lc2guZ2VvbWV0cnkpO1xuICAgICAgICB0aGlzLmdsLmN1bGxGYWNlKHRoaXMuZ2wuQkFDSyk7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuYmxlbmRpbmcpIGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORSk7XG4gICAgaWYgKG9wdGlvbnMuc2lkZSA9PT0gJ2JhY2snKSBnbC5jdWxsRmFjZShnbC5GUk9OVCk7XG59O1xuXG4vKipcbiAqIFJlc2V0cyB0aGUgc3RhdGUgb2YgdGhlIFdlYkdMIGRyYXdpbmcgY29udGV4dCB0byBkZWZhdWx0IHZhbHVlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgRHJhdyBzdGF0ZSBvcHRpb25zIHRvIGJlIHNldCB0byB0aGUgY29udGV4dC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5yZXNldE9wdGlvbnMgPSBmdW5jdGlvbiByZXNldE9wdGlvbnMob3B0aW9ucykge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgaWYgKCFvcHRpb25zKSByZXR1cm47XG4gICAgaWYgKG9wdGlvbnMuYmxlbmRpbmcpIGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xuICAgIGlmIChvcHRpb25zLnNpZGUgPT09ICdiYWNrJykgZ2wuY3VsbEZhY2UoZ2wuQkFDSyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYkdMUmVuZGVyZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdHlwZXMgPSB7XG4gICAgMTogJ2Zsb2F0ICcsXG4gICAgMjogJ3ZlYzIgJyxcbiAgICAzOiAndmVjMyAnLFxuICAgIDQ6ICd2ZWM0ICdcbn07XG5cbi8qKlxuICogVHJhdmVyc2VzIG1hdGVyaWFsIHRvIGNyZWF0ZSBhIHN0cmluZyBvZiBnbHNsIGNvZGUgdG8gYmUgYXBwbGllZCBpblxuICogdGhlIHZlcnRleCBvciBmcmFnbWVudCBzaGFkZXIuXG4gKlxuICogQG1ldGhvZFxuICogQHByb3RlY3RlZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBtYXRlcmlhbCBNYXRlcmlhbCB0byBiZSBjb21waWxlZC5cbiAqIEBwYXJhbSB7TnVtYmVyfSB0ZXh0dXJlU2xvdCBOZXh0IGF2YWlsYWJsZSB0ZXh0dXJlIHNsb3QgZm9yIE1lc2guXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gY29tcGlsZU1hdGVyaWFsKG1hdGVyaWFsLCB0ZXh0dXJlU2xvdCkge1xuICAgIHZhciBnbHNsID0gJyc7XG4gICAgdmFyIHVuaWZvcm1zID0ge307XG4gICAgdmFyIHZhcnlpbmdzID0ge307XG4gICAgdmFyIGF0dHJpYnV0ZXMgPSB7fTtcbiAgICB2YXIgZGVmaW5lcyA9IFtdO1xuICAgIHZhciB0ZXh0dXJlcyA9IFtdO1xuXG4gICAgX3RyYXZlcnNlKG1hdGVyaWFsLCBmdW5jdGlvbiAobm9kZSwgZGVwdGgpIHtcbiAgICAgICAgaWYgKCEgbm9kZS5jaHVuaykgcmV0dXJuO1xuXG4gICAgICAgIHZhciB0eXBlID0gdHlwZXNbX2dldE91dHB1dExlbmd0aChub2RlKV07XG4gICAgICAgIHZhciBsYWJlbCA9IF9tYWtlTGFiZWwobm9kZSk7XG4gICAgICAgIHZhciBvdXRwdXQgPSBfcHJvY2Vzc0dMU0wobm9kZS5jaHVuay5nbHNsLCBub2RlLmlucHV0cywgdGV4dHVyZXMubGVuZ3RoICsgdGV4dHVyZVNsb3QpO1xuXG4gICAgICAgIGdsc2wgKz0gdHlwZSArIGxhYmVsICsgJyA9ICcgKyBvdXRwdXQgKyAnXFxuICc7XG5cbiAgICAgICAgaWYgKG5vZGUudW5pZm9ybXMpIF9leHRlbmQodW5pZm9ybXMsIG5vZGUudW5pZm9ybXMpO1xuICAgICAgICBpZiAobm9kZS52YXJ5aW5ncykgX2V4dGVuZCh2YXJ5aW5ncywgbm9kZS52YXJ5aW5ncyk7XG4gICAgICAgIGlmIChub2RlLmF0dHJpYnV0ZXMpIF9leHRlbmQoYXR0cmlidXRlcywgbm9kZS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgaWYgKG5vZGUuY2h1bmsuZGVmaW5lcykgZGVmaW5lcy5wdXNoKG5vZGUuY2h1bmsuZGVmaW5lcyk7XG4gICAgICAgIGlmIChub2RlLnRleHR1cmUpIHRleHR1cmVzLnB1c2gobm9kZS50ZXh0dXJlKTtcbiAgICB9KTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIF9pZDogbWF0ZXJpYWwuX2lkLFxuICAgICAgICBnbHNsOiBnbHNsICsgJ3JldHVybiAnICsgX21ha2VMYWJlbChtYXRlcmlhbCkgKyAnOycsXG4gICAgICAgIGRlZmluZXM6IGRlZmluZXMuam9pbignXFxuJyksXG4gICAgICAgIHVuaWZvcm1zOiB1bmlmb3JtcyxcbiAgICAgICAgdmFyeWluZ3M6IHZhcnlpbmdzLFxuICAgICAgICBhdHRyaWJ1dGVzOiBhdHRyaWJ1dGVzLFxuICAgICAgICB0ZXh0dXJlczogdGV4dHVyZXNcbiAgICB9O1xufVxuXG4vLyBSZWN1cnNpdmVseSBpdGVyYXRlcyBvdmVyIGEgbWF0ZXJpYWwncyBpbnB1dHMsIGludm9raW5nIGEgZ2l2ZW4gY2FsbGJhY2tcbi8vIHdpdGggdGhlIGN1cnJlbnQgbWF0ZXJpYWxcbmZ1bmN0aW9uIF90cmF2ZXJzZShtYXRlcmlhbCwgY2FsbGJhY2spIHtcblx0dmFyIGlucHV0cyA9IG1hdGVyaWFsLmlucHV0cztcbiAgICB2YXIgbGVuID0gaW5wdXRzICYmIGlucHV0cy5sZW5ndGg7XG4gICAgdmFyIGlkeCA9IC0xO1xuXG4gICAgd2hpbGUgKCsraWR4IDwgbGVuKSBfdHJhdmVyc2UoaW5wdXRzW2lkeF0sIGNhbGxiYWNrKTtcblxuICAgIGNhbGxiYWNrKG1hdGVyaWFsKTtcblxuICAgIHJldHVybiBtYXRlcmlhbDtcbn1cblxuLy8gSGVscGVyIGZ1bmN0aW9uIHVzZWQgdG8gaW5mZXIgbGVuZ3RoIG9mIHRoZSBvdXRwdXRcbi8vIGZyb20gYSBnaXZlbiBtYXRlcmlhbCBub2RlLlxuZnVuY3Rpb24gX2dldE91dHB1dExlbmd0aChub2RlKSB7XG5cbiAgICAvLyBIYW5kbGUgY29uc3RhbnQgdmFsdWVzXG5cbiAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdudW1iZXInKSByZXR1cm4gMTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkgcmV0dXJuIG5vZGUubGVuZ3RoO1xuXG4gICAgLy8gSGFuZGxlIG1hdGVyaWFsc1xuXG4gICAgdmFyIG91dHB1dCA9IG5vZGUuY2h1bmsub3V0cHV0O1xuICAgIGlmICh0eXBlb2Ygb3V0cHV0ID09PSAnbnVtYmVyJykgcmV0dXJuIG91dHB1dDtcblxuICAgIC8vIEhhbmRsZSBwb2x5bW9ycGhpYyBvdXRwdXRcblxuICAgIHZhciBrZXkgPSBub2RlLmlucHV0cy5tYXAoZnVuY3Rpb24gcmVjdXJzZShub2RlKSB7XG4gICAgICAgIHJldHVybiBfZ2V0T3V0cHV0TGVuZ3RoKG5vZGUpO1xuICAgIH0pLmpvaW4oJywnKTtcblxuICAgIHJldHVybiBvdXRwdXRba2V5XTtcbn1cblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIHJ1biByZXBsYWNlIGlucHV0cyBhbmQgdGV4dHVyZSB0YWdzIHdpdGhcbi8vIGNvcnJlY3QgZ2xzbC5cbmZ1bmN0aW9uIF9wcm9jZXNzR0xTTChzdHIsIGlucHV0cywgdGV4dHVyZVNsb3QpIHtcbiAgICByZXR1cm4gc3RyXG4gICAgICAgIC5yZXBsYWNlKC8lXFxkL2csIGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gX21ha2VMYWJlbChpbnB1dHNbc1sxXS0xXSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5yZXBsYWNlKC9cXCRURVhUVVJFLywgJ3VfdGV4dHVyZXNbJyArIHRleHR1cmVTbG90ICsgJ10nKTtcbn1cblxuLy8gSGVscGVyIGZ1bmN0aW9uIHVzZWQgdG8gY3JlYXRlIGdsc2wgZGVmaW5pdGlvbiBvZiB0aGVcbi8vIGlucHV0IG1hdGVyaWFsIG5vZGUuXG5mdW5jdGlvbiBfbWFrZUxhYmVsIChuKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkobikpIHJldHVybiBfYXJyYXlUb1ZlYyhuKTtcbiAgICBpZiAodHlwZW9mIG4gPT09ICdvYmplY3QnKSByZXR1cm4gJ2ZhXycgKyAobi5faWQpO1xuICAgIGVsc2UgcmV0dXJuIG4udG9GaXhlZCg2KTtcbn1cblxuLy8gSGVscGVyIHRvIGNvcHkgdGhlIHByb3BlcnRpZXMgb2YgYW4gb2JqZWN0IG9udG8gYW5vdGhlciBvYmplY3QuXG5mdW5jdGlvbiBfZXh0ZW5kIChhLCBiKSB7XG5cdGZvciAodmFyIGsgaW4gYikgYVtrXSA9IGJba107XG59XG5cbi8vIEhlbHBlciB0byBjcmVhdGUgZ2xzbCB2ZWN0b3IgcmVwcmVzZW50YXRpb24gb2YgYSBqYXZhc2NyaXB0IGFycmF5LlxuZnVuY3Rpb24gX2FycmF5VG9WZWMoYXJyYXkpIHtcbiAgICB2YXIgbGVuID0gYXJyYXkubGVuZ3RoO1xuICAgIHJldHVybiAndmVjJyArIGxlbiArICcoJyArIGFycmF5LmpvaW4oJywnKSAgKyAnKSc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29tcGlsZU1hdGVyaWFsO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vLyBHZW5lcmF0ZXMgYSBjaGVja2VyYm9hcmQgcGF0dGVybiB0byBiZSB1c2VkIGFzIGEgcGxhY2Vob2xkZXIgdGV4dHVyZSB3aGlsZSBhblxuLy8gaW1hZ2UgbG9hZHMgb3ZlciB0aGUgbmV0d29yay5cbmZ1bmN0aW9uIGNyZWF0ZUNoZWNrZXJCb2FyZCgpIHtcbiAgICB2YXIgY29udGV4dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpLmdldENvbnRleHQoJzJkJyk7XG4gICAgY29udGV4dC5jYW52YXMud2lkdGggPSBjb250ZXh0LmNhbnZhcy5oZWlnaHQgPSAxMjg7XG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPCBjb250ZXh0LmNhbnZhcy5oZWlnaHQ7IHkgKz0gMTYpIHtcbiAgICAgICAgZm9yICh2YXIgeCA9IDA7IHggPCBjb250ZXh0LmNhbnZhcy53aWR0aDsgeCArPSAxNikge1xuICAgICAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSAoeCBeIHkpICYgMTYgPyAnI0ZGRicgOiAnI0RERCc7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxSZWN0KHgsIHksIDE2LCAxNik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gY29udGV4dC5jYW52YXM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlQ2hlY2tlckJvYXJkO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIHJhZGl4Qml0cyA9IDExLFxuICAgIG1heFJhZGl4ID0gMSA8PCAocmFkaXhCaXRzKSxcbiAgICByYWRpeE1hc2sgPSBtYXhSYWRpeCAtIDEsXG4gICAgYnVja2V0cyA9IG5ldyBBcnJheShtYXhSYWRpeCAqIE1hdGguY2VpbCg2NCAvIHJhZGl4Qml0cykpLFxuICAgIG1zYk1hc2sgPSAxIDw8ICgoMzIgLSAxKSAlIHJhZGl4Qml0cyksXG4gICAgbGFzdE1hc2sgPSAobXNiTWFzayA8PCAxKSAtIDEsXG4gICAgcGFzc0NvdW50ID0gKCgzMiAvIHJhZGl4Qml0cykgKyAwLjk5OTk5OTk5OTk5OTk5OSkgfCAwLFxuICAgIG1heE9mZnNldCA9IG1heFJhZGl4ICogKHBhc3NDb3VudCAtIDEpLFxuICAgIG5vcm1hbGl6ZXIgPSBNYXRoLnBvdygyMCwgNik7XG5cbnZhciBidWZmZXIgPSBuZXcgQXJyYXlCdWZmZXIoNCk7XG52YXIgZmxvYXRWaWV3ID0gbmV3IEZsb2F0MzJBcnJheShidWZmZXIsIDAsIDEpO1xudmFyIGludFZpZXcgPSBuZXcgSW50MzJBcnJheShidWZmZXIsIDAsIDEpO1xuXG4vLyBjb21wYXJhdG9yIHB1bGxzIHJlbGV2YW50IHNvcnRpbmcga2V5cyBvdXQgb2YgbWVzaFxuZnVuY3Rpb24gY29tcChsaXN0LCByZWdpc3RyeSwgaSkge1xuICAgIHZhciBrZXkgPSBsaXN0W2ldO1xuICAgIHZhciBpdGVtID0gcmVnaXN0cnlba2V5XTtcbiAgICByZXR1cm4gKGl0ZW0uZGVwdGggPyBpdGVtLmRlcHRoIDogcmVnaXN0cnlba2V5XS51bmlmb3JtVmFsdWVzWzFdWzE0XSkgKyBub3JtYWxpemVyO1xufVxuXG4vL211dGF0b3IgZnVuY3Rpb24gcmVjb3JkcyBtZXNoJ3MgcGxhY2UgaW4gcHJldmlvdXMgcGFzc1xuZnVuY3Rpb24gbXV0YXRvcihsaXN0LCByZWdpc3RyeSwgaSwgdmFsdWUpIHtcbiAgICB2YXIga2V5ID0gbGlzdFtpXTtcbiAgICByZWdpc3RyeVtrZXldLmRlcHRoID0gaW50VG9GbG9hdCh2YWx1ZSkgLSBub3JtYWxpemVyO1xuICAgIHJldHVybiBrZXk7XG59XG5cbi8vY2xlYW4gZnVuY3Rpb24gcmVtb3ZlcyBtdXRhdG9yIGZ1bmN0aW9uJ3MgcmVjb3JkXG5mdW5jdGlvbiBjbGVhbihsaXN0LCByZWdpc3RyeSwgaSkge1xuICAgIHJlZ2lzdHJ5W2xpc3RbaV1dLmRlcHRoID0gbnVsbDtcbn1cblxuLy9jb252ZXJ0cyBhIGphdmFzY3JpcHQgZmxvYXQgdG8gYSAzMmJpdCBpbnRlZ2VyIHVzaW5nIGFuIGFycmF5IGJ1ZmZlclxuLy9vZiBzaXplIG9uZVxuZnVuY3Rpb24gZmxvYXRUb0ludChrKSB7XG4gICAgZmxvYXRWaWV3WzBdID0gaztcbiAgICByZXR1cm4gaW50Vmlld1swXTtcbn1cbi8vY29udmVydHMgYSAzMiBiaXQgaW50ZWdlciB0byBhIHJlZ3VsYXIgamF2YXNjcmlwdCBmbG9hdCB1c2luZyBhbiBhcnJheSBidWZmZXJcbi8vb2Ygc2l6ZSBvbmVcbmZ1bmN0aW9uIGludFRvRmxvYXQoaykge1xuICAgIGludFZpZXdbMF0gPSBrO1xuICAgIHJldHVybiBmbG9hdFZpZXdbMF07XG59XG5cbi8vc29ydHMgYSBsaXN0IG9mIG1lc2ggSURzIGFjY29yZGluZyB0byB0aGVpciB6LWRlcHRoXG5mdW5jdGlvbiByYWRpeFNvcnQobGlzdCwgcmVnaXN0cnkpIHtcbiAgICB2YXIgcGFzcyA9IDA7XG4gICAgdmFyIG91dCA9IFtdO1xuXG4gICAgdmFyIGksIGosIGssIG4sIGRpdiwgb2Zmc2V0LCBzd2FwLCBpZCwgc3VtLCB0c3VtLCBzaXplO1xuXG4gICAgcGFzc0NvdW50ID0gKCgzMiAvIHJhZGl4Qml0cykgKyAwLjk5OTk5OTk5OTk5OTk5OSkgfCAwO1xuXG4gICAgZm9yIChpID0gMCwgbiA9IG1heFJhZGl4ICogcGFzc0NvdW50OyBpIDwgbjsgaSsrKSBidWNrZXRzW2ldID0gMDtcblxuICAgIGZvciAoaSA9IDAsIG4gPSBsaXN0Lmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgZGl2IF49IGRpdiA+PiAzMSB8IDB4ODAwMDAwMDA7XG4gICAgICAgIGZvciAoaiA9IDAsIGsgPSAwOyBqIDwgbWF4T2Zmc2V0OyBqICs9IG1heFJhZGl4LCBrICs9IHJhZGl4Qml0cykge1xuICAgICAgICAgICAgYnVja2V0c1tqICsgKGRpdiA+Pj4gayAmIHJhZGl4TWFzayldKys7XG4gICAgICAgIH1cbiAgICAgICAgYnVja2V0c1tqICsgKGRpdiA+Pj4gayAmIGxhc3RNYXNrKV0rKztcbiAgICB9XG5cbiAgICBmb3IgKGogPSAwOyBqIDw9IG1heE9mZnNldDsgaiArPSBtYXhSYWRpeCkge1xuICAgICAgICBmb3IgKGlkID0gaiwgc3VtID0gMDsgaWQgPCBqICsgbWF4UmFkaXg7IGlkKyspIHtcbiAgICAgICAgICAgIHRzdW0gPSBidWNrZXRzW2lkXSArIHN1bTtcbiAgICAgICAgICAgIGJ1Y2tldHNbaWRdID0gc3VtIC0gMTtcbiAgICAgICAgICAgIHN1bSA9IHRzdW07XG4gICAgICAgIH1cbiAgICB9XG4gICAgaWYgKC0tcGFzc0NvdW50KSB7XG4gICAgICAgIGZvciAoaSA9IDAsIG4gPSBsaXN0Lmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgZGl2ID0gZmxvYXRUb0ludChjb21wKGxpc3QsIHJlZ2lzdHJ5LCBpKSk7XG4gICAgICAgICAgICBvdXRbKytidWNrZXRzW2RpdiAmIHJhZGl4TWFza11dID0gbXV0YXRvcihsaXN0LCByZWdpc3RyeSwgaSwgZGl2IF49IGRpdiA+PiAzMSB8IDB4ODAwMDAwMDApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBzd2FwID0gb3V0O1xuICAgICAgICBvdXQgPSBsaXN0O1xuICAgICAgICBsaXN0ID0gc3dhcDtcbiAgICAgICAgd2hpbGUgKCsrcGFzcyA8IHBhc3NDb3VudCkge1xuICAgICAgICAgICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoLCBvZmZzZXQgPSBwYXNzICogbWF4UmFkaXgsIHNpemUgPSBwYXNzICogcmFkaXhCaXRzOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZGl2ID0gZmxvYXRUb0ludChjb21wKGxpc3QsIHJlZ2lzdHJ5LCBpKSk7XG4gICAgICAgICAgICAgICAgb3V0WysrYnVja2V0c1tvZmZzZXQgKyAoZGl2ID4+PiBzaXplICYgcmFkaXhNYXNrKV1dID0gbGlzdFtpXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3dhcCA9IG91dDtcbiAgICAgICAgICAgIG91dCA9IGxpc3Q7XG4gICAgICAgICAgICBsaXN0ID0gc3dhcDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoaSA9IDAsIG4gPSBsaXN0Lmxlbmd0aCwgb2Zmc2V0ID0gcGFzcyAqIG1heFJhZGl4LCBzaXplID0gcGFzcyAqIHJhZGl4Qml0czsgaSA8IG47IGkrKykge1xuICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgb3V0WysrYnVja2V0c1tvZmZzZXQgKyAoZGl2ID4+PiBzaXplICYgbGFzdE1hc2spXV0gPSBtdXRhdG9yKGxpc3QsIHJlZ2lzdHJ5LCBpLCBkaXYgXiAofmRpdiA+PiAzMSB8IDB4ODAwMDAwMDApKTtcbiAgICAgICAgY2xlYW4obGlzdCwgcmVnaXN0cnksIGkpO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmFkaXhTb3J0O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgZ2xzbGlmeSA9IHJlcXVpcmUoXCJnbHNsaWZ5XCIpO1xudmFyIHNoYWRlcnMgPSByZXF1aXJlKFwiZ2xzbGlmeS9zaW1wbGUtYWRhcHRlci5qc1wiKShcIlxcbiNkZWZpbmUgR0xTTElGWSAxXFxuXFxubWF0MyBhX3hfZ2V0Tm9ybWFsTWF0cml4KGluIG1hdDQgdCkge1xcbiAgbWF0MyBtYXROb3JtO1xcbiAgbWF0NCBhID0gdDtcXG4gIGZsb2F0IGEwMCA9IGFbMF1bMF0sIGEwMSA9IGFbMF1bMV0sIGEwMiA9IGFbMF1bMl0sIGEwMyA9IGFbMF1bM10sIGExMCA9IGFbMV1bMF0sIGExMSA9IGFbMV1bMV0sIGExMiA9IGFbMV1bMl0sIGExMyA9IGFbMV1bM10sIGEyMCA9IGFbMl1bMF0sIGEyMSA9IGFbMl1bMV0sIGEyMiA9IGFbMl1bMl0sIGEyMyA9IGFbMl1bM10sIGEzMCA9IGFbM11bMF0sIGEzMSA9IGFbM11bMV0sIGEzMiA9IGFbM11bMl0sIGEzMyA9IGFbM11bM10sIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCwgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLCBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSwgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLCBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCwgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLCBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSwgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLCBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsIGRldCA9IGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcXG4gIGRldCA9IDEuMCAvIGRldDtcXG4gIG1hdE5vcm1bMF1bMF0gPSAoYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5KSAqIGRldDtcXG4gIG1hdE5vcm1bMF1bMV0gPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcXG4gIG1hdE5vcm1bMF1bMl0gPSAoYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2KSAqIGRldDtcXG4gIG1hdE5vcm1bMV1bMF0gPSAoYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5KSAqIGRldDtcXG4gIG1hdE5vcm1bMV1bMV0gPSAoYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3KSAqIGRldDtcXG4gIG1hdE5vcm1bMV1bMl0gPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDtcXG4gIG1hdE5vcm1bMl1bMF0gPSAoYTMxICogYjA1IC0gYTMyICogYjA0ICsgYTMzICogYjAzKSAqIGRldDtcXG4gIG1hdE5vcm1bMl1bMV0gPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDtcXG4gIG1hdE5vcm1bMl1bMl0gPSAoYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwKSAqIGRldDtcXG4gIHJldHVybiBtYXROb3JtO1xcbn1cXG5mbG9hdCBiX3hfaW52ZXJzZShmbG9hdCBtKSB7XFxuICByZXR1cm4gMS4wIC8gbTtcXG59XFxubWF0MiBiX3hfaW52ZXJzZShtYXQyIG0pIHtcXG4gIHJldHVybiBtYXQyKG1bMV1bMV0sIC1tWzBdWzFdLCAtbVsxXVswXSwgbVswXVswXSkgLyAobVswXVswXSAqIG1bMV1bMV0gLSBtWzBdWzFdICogbVsxXVswXSk7XFxufVxcbm1hdDMgYl94X2ludmVyc2UobWF0MyBtKSB7XFxuICBmbG9hdCBhMDAgPSBtWzBdWzBdLCBhMDEgPSBtWzBdWzFdLCBhMDIgPSBtWzBdWzJdO1xcbiAgZmxvYXQgYTEwID0gbVsxXVswXSwgYTExID0gbVsxXVsxXSwgYTEyID0gbVsxXVsyXTtcXG4gIGZsb2F0IGEyMCA9IG1bMl1bMF0sIGEyMSA9IG1bMl1bMV0sIGEyMiA9IG1bMl1bMl07XFxuICBmbG9hdCBiMDEgPSBhMjIgKiBhMTEgLSBhMTIgKiBhMjE7XFxuICBmbG9hdCBiMTEgPSAtYTIyICogYTEwICsgYTEyICogYTIwO1xcbiAgZmxvYXQgYjIxID0gYTIxICogYTEwIC0gYTExICogYTIwO1xcbiAgZmxvYXQgZGV0ID0gYTAwICogYjAxICsgYTAxICogYjExICsgYTAyICogYjIxO1xcbiAgcmV0dXJuIG1hdDMoYjAxLCAoLWEyMiAqIGEwMSArIGEwMiAqIGEyMSksIChhMTIgKiBhMDEgLSBhMDIgKiBhMTEpLCBiMTEsIChhMjIgKiBhMDAgLSBhMDIgKiBhMjApLCAoLWExMiAqIGEwMCArIGEwMiAqIGExMCksIGIyMSwgKC1hMjEgKiBhMDAgKyBhMDEgKiBhMjApLCAoYTExICogYTAwIC0gYTAxICogYTEwKSkgLyBkZXQ7XFxufVxcbm1hdDQgYl94X2ludmVyc2UobWF0NCBtKSB7XFxuICBmbG9hdCBhMDAgPSBtWzBdWzBdLCBhMDEgPSBtWzBdWzFdLCBhMDIgPSBtWzBdWzJdLCBhMDMgPSBtWzBdWzNdLCBhMTAgPSBtWzFdWzBdLCBhMTEgPSBtWzFdWzFdLCBhMTIgPSBtWzFdWzJdLCBhMTMgPSBtWzFdWzNdLCBhMjAgPSBtWzJdWzBdLCBhMjEgPSBtWzJdWzFdLCBhMjIgPSBtWzJdWzJdLCBhMjMgPSBtWzJdWzNdLCBhMzAgPSBtWzNdWzBdLCBhMzEgPSBtWzNdWzFdLCBhMzIgPSBtWzNdWzJdLCBhMzMgPSBtWzNdWzNdLCBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTAsIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCwgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwLCBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTEsIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSwgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyLCBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzAsIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCwgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwLCBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzEsIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSwgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyLCBkZXQgPSBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7XFxuICByZXR1cm4gbWF0NChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDksIGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSwgYTMxICogYjA1IC0gYTMyICogYjA0ICsgYTMzICogYjAzLCBhMjIgKiBiMDQgLSBhMjEgKiBiMDUgLSBhMjMgKiBiMDMsIGExMiAqIGIwOCAtIGExMCAqIGIxMSAtIGExMyAqIGIwNywgYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3LCBhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEsIGEyMCAqIGIwNSAtIGEyMiAqIGIwMiArIGEyMyAqIGIwMSwgYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2LCBhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYsIGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCwgYTIxICogYjAyIC0gYTIwICogYjA0IC0gYTIzICogYjAwLCBhMTEgKiBiMDcgLSBhMTAgKiBiMDkgLSBhMTIgKiBiMDYsIGEwMCAqIGIwOSAtIGEwMSAqIGIwNyArIGEwMiAqIGIwNiwgYTMxICogYjAxIC0gYTMwICogYjAzIC0gYTMyICogYjAwLCBhMjAgKiBiMDMgLSBhMjEgKiBiMDEgKyBhMjIgKiBiMDApIC8gZGV0O1xcbn1cXG5mbG9hdCBjX3hfdHJhbnNwb3NlKGZsb2F0IG0pIHtcXG4gIHJldHVybiBtO1xcbn1cXG5tYXQyIGNfeF90cmFuc3Bvc2UobWF0MiBtKSB7XFxuICByZXR1cm4gbWF0MihtWzBdWzBdLCBtWzFdWzBdLCBtWzBdWzFdLCBtWzFdWzFdKTtcXG59XFxubWF0MyBjX3hfdHJhbnNwb3NlKG1hdDMgbSkge1xcbiAgcmV0dXJuIG1hdDMobVswXVswXSwgbVsxXVswXSwgbVsyXVswXSwgbVswXVsxXSwgbVsxXVsxXSwgbVsyXVsxXSwgbVswXVsyXSwgbVsxXVsyXSwgbVsyXVsyXSk7XFxufVxcbm1hdDQgY194X3RyYW5zcG9zZShtYXQ0IG0pIHtcXG4gIHJldHVybiBtYXQ0KG1bMF1bMF0sIG1bMV1bMF0sIG1bMl1bMF0sIG1bM11bMF0sIG1bMF1bMV0sIG1bMV1bMV0sIG1bMl1bMV0sIG1bM11bMV0sIG1bMF1bMl0sIG1bMV1bMl0sIG1bMl1bMl0sIG1bM11bMl0sIG1bMF1bM10sIG1bMV1bM10sIG1bMl1bM10sIG1bM11bM10pO1xcbn1cXG52ZWM0IGFwcGx5VHJhbnNmb3JtKHZlYzQgcG9zKSB7XFxuICBtYXQ0IE1WTWF0cml4ID0gdV92aWV3ICogdV90cmFuc2Zvcm07XFxuICBwb3MueCArPSAxLjA7XFxuICBwb3MueSAtPSAxLjA7XFxuICBwb3MueHl6ICo9IHVfc2l6ZSAqIDAuNTtcXG4gIHBvcy55ICo9IC0xLjA7XFxuICB2X3Bvc2l0aW9uID0gKE1WTWF0cml4ICogcG9zKS54eXo7XFxuICB2X2V5ZVZlY3RvciA9ICh1X3Jlc29sdXRpb24gKiAwLjUpIC0gdl9wb3NpdGlvbjtcXG4gIHBvcyA9IHVfcGVyc3BlY3RpdmUgKiBNVk1hdHJpeCAqIHBvcztcXG4gIHJldHVybiBwb3M7XFxufVxcbiN2ZXJ0X2RlZmluaXRpb25zXFxuXFxudmVjMyBjYWxjdWxhdGVPZmZzZXQodmVjMyBJRCkge1xcbiAgXFxuICAjdmVydF9hcHBsaWNhdGlvbnNcXG4gIHJldHVybiB2ZWMzKDAuMCk7XFxufVxcbnZvaWQgbWFpbigpIHtcXG4gIHZfdGV4dHVyZUNvb3JkaW5hdGUgPSBhX3RleENvb3JkO1xcbiAgdmVjMyBpbnZlcnRlZE5vcm1hbHMgPSBhX25vcm1hbHMgKyAodV9ub3JtYWxzLnggPCAwLjAgPyBjYWxjdWxhdGVPZmZzZXQodV9ub3JtYWxzKSAqIDIuMCAtIDEuMCA6IHZlYzMoMC4wKSk7XFxuICBpbnZlcnRlZE5vcm1hbHMueSAqPSAtMS4wO1xcbiAgdl9ub3JtYWwgPSBjX3hfdHJhbnNwb3NlKG1hdDMoYl94X2ludmVyc2UodV90cmFuc2Zvcm0pKSkgKiBpbnZlcnRlZE5vcm1hbHM7XFxuICB2ZWMzIG9mZnNldFBvcyA9IGFfcG9zICsgY2FsY3VsYXRlT2Zmc2V0KHVfcG9zaXRpb25PZmZzZXQpO1xcbiAgZ2xfUG9zaXRpb24gPSBhcHBseVRyYW5zZm9ybSh2ZWM0KG9mZnNldFBvcywgMS4wKSk7XFxufVwiLCBcIlxcbiNkZWZpbmUgR0xTTElGWSAxXFxuXFxuI2Zsb2F0X2RlZmluaXRpb25zXFxuXFxuZmxvYXQgYV94X2FwcGx5TWF0ZXJpYWwoZmxvYXQgSUQpIHtcXG4gIFxcbiAgI2Zsb2F0X2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIDEuO1xcbn1cXG4jdmVjM19kZWZpbml0aW9uc1xcblxcbnZlYzMgYV94X2FwcGx5TWF0ZXJpYWwodmVjMyBJRCkge1xcbiAgXFxuICAjdmVjM19hcHBsaWNhdGlvbnNcXG4gIHJldHVybiB2ZWMzKDApO1xcbn1cXG4jdmVjNF9kZWZpbml0aW9uc1xcblxcbnZlYzQgYV94X2FwcGx5TWF0ZXJpYWwodmVjNCBJRCkge1xcbiAgXFxuICAjdmVjNF9hcHBsaWNhdGlvbnNcXG4gIHJldHVybiB2ZWM0KDApO1xcbn1cXG52ZWM0IGJfeF9hcHBseUxpZ2h0KGluIHZlYzQgYmFzZUNvbG9yLCBpbiB2ZWMzIG5vcm1hbCwgaW4gdmVjNCBnbG9zc2luZXNzKSB7XFxuICBpbnQgbnVtTGlnaHRzID0gaW50KHVfbnVtTGlnaHRzKTtcXG4gIHZlYzMgYW1iaWVudENvbG9yID0gdV9hbWJpZW50TGlnaHQgKiBiYXNlQ29sb3IucmdiO1xcbiAgdmVjMyBleWVWZWN0b3IgPSBub3JtYWxpemUodl9leWVWZWN0b3IpO1xcbiAgdmVjMyBkaWZmdXNlID0gdmVjMygwLjApO1xcbiAgYm9vbCBoYXNHbG9zc2luZXNzID0gZ2xvc3NpbmVzcy5hID4gMC4wO1xcbiAgYm9vbCBoYXNTcGVjdWxhckNvbG9yID0gbGVuZ3RoKGdsb3NzaW5lc3MucmdiKSA+IDAuMDtcXG4gIGZvcihpbnQgaSA9IDA7IGkgPCA0OyBpKyspIHtcXG4gICAgaWYoaSA+PSBudW1MaWdodHMpXFxuICAgICAgYnJlYWs7XFxuICAgIHZlYzMgbGlnaHREaXJlY3Rpb24gPSBub3JtYWxpemUodV9saWdodFBvc2l0aW9uW2ldLnh5eiAtIHZfcG9zaXRpb24pO1xcbiAgICBmbG9hdCBsYW1iZXJ0aWFuID0gbWF4KGRvdChsaWdodERpcmVjdGlvbiwgbm9ybWFsKSwgMC4wKTtcXG4gICAgaWYobGFtYmVydGlhbiA+IDAuMCkge1xcbiAgICAgIGRpZmZ1c2UgKz0gdV9saWdodENvbG9yW2ldLnJnYiAqIGJhc2VDb2xvci5yZ2IgKiBsYW1iZXJ0aWFuO1xcbiAgICAgIGlmKGhhc0dsb3NzaW5lc3MpIHtcXG4gICAgICAgIHZlYzMgaGFsZlZlY3RvciA9IG5vcm1hbGl6ZShsaWdodERpcmVjdGlvbiArIGV5ZVZlY3Rvcik7XFxuICAgICAgICBmbG9hdCBzcGVjdWxhcldlaWdodCA9IHBvdyhtYXgoZG90KGhhbGZWZWN0b3IsIG5vcm1hbCksIDAuMCksIGdsb3NzaW5lc3MuYSk7XFxuICAgICAgICB2ZWMzIHNwZWN1bGFyQ29sb3IgPSBoYXNTcGVjdWxhckNvbG9yID8gZ2xvc3NpbmVzcy5yZ2IgOiB1X2xpZ2h0Q29sb3JbaV0ucmdiO1xcbiAgICAgICAgZGlmZnVzZSArPSBzcGVjdWxhckNvbG9yICogc3BlY3VsYXJXZWlnaHQgKiBsYW1iZXJ0aWFuO1xcbiAgICAgIH1cXG4gICAgfVxcbiAgfVxcbiAgcmV0dXJuIHZlYzQoYW1iaWVudENvbG9yICsgZGlmZnVzZSwgYmFzZUNvbG9yLmEpO1xcbn1cXG52b2lkIG1haW4oKSB7XFxuICB2ZWM0IG1hdGVyaWFsID0gdV9iYXNlQ29sb3IuciA+PSAwLjAgPyB1X2Jhc2VDb2xvciA6IGFfeF9hcHBseU1hdGVyaWFsKHVfYmFzZUNvbG9yKTtcXG4gIGJvb2wgbGlnaHRzRW5hYmxlZCA9ICh1X2ZsYXRTaGFkaW5nID09IDAuMCkgJiYgKHVfbnVtTGlnaHRzID4gMC4wIHx8IGxlbmd0aCh1X2FtYmllbnRMaWdodCkgPiAwLjApO1xcbiAgdmVjMyBub3JtYWwgPSBub3JtYWxpemUodl9ub3JtYWwpO1xcbiAgdmVjNCBnbG9zc2luZXNzID0gdV9nbG9zc2luZXNzLnggPCAwLjAgPyBhX3hfYXBwbHlNYXRlcmlhbCh1X2dsb3NzaW5lc3MpIDogdV9nbG9zc2luZXNzO1xcbiAgdmVjNCBjb2xvciA9IGxpZ2h0c0VuYWJsZWQgPyBiX3hfYXBwbHlMaWdodChtYXRlcmlhbCwgbm9ybWFsaXplKHZfbm9ybWFsKSwgZ2xvc3NpbmVzcykgOiBtYXRlcmlhbDtcXG4gIGdsX0ZyYWdDb2xvciA9IGNvbG9yO1xcbiAgZ2xfRnJhZ0NvbG9yLmEgKj0gdV9vcGFjaXR5O1xcbn1cIiwgW10sIFtdKTtcbm1vZHVsZS5leHBvcnRzID0gc2hhZGVyczsiLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFNvY2tldENoYW5uZWwoaG9zdCkge1xuICAgIHRoaXMuX3NvY2tldCA9IGlvLmNvbm5lY3QoaG9zdCk7XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3NvY2tldC5vbignZmFtb3VzLW1lc3NhZ2UnLCBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICBfdGhpcy5vbm1lc3NhZ2UoeyBkYXRhOiBtZXNzYWdlLmRhdGEgfSk7XG4gICAgfSk7XG59XG5cblNvY2tldENoYW5uZWwucHJvdG90eXBlLnBvc3RNZXNzYWdlID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICB0aGlzLl9zb2NrZXQuZW1pdCgnZmFtb3VzLW1lc3NhZ2UnLCB7IGRhdGE6IG1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNvY2tldENoYW5uZWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wID0gcmVxdWlyZSgnZmFtb3VzL3JlbmRlci1sb29wcy9SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wJyk7XG5cbmZ1bmN0aW9uIFNvY2tldExvb3AoaG9zdCkge1xuICAgIHRoaXMuX3VwZGF0ZWFibGVzID0gW107XG4gICAgdGhpcy5fc29ja2V0ID0gaW8uY29ubmVjdChob3N0KTtcblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgdGhpcy5fc29ja2V0Lm9uKCdmcmFtZScsIGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgX3RoaXMuX3VwZGF0ZWFibGVzLmxlbmd0aDsgaSsrKVxuICAgICAgICAgICAgX3RoaXMuX3VwZGF0ZWFibGVzW2ldLnVwZGF0ZShkYXRhLnRpbWVzdGFtcCk7XG4gICAgfSk7XG59XG5cblNvY2tldExvb3AucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKHVwZGF0ZWFibGUpIHtcbiAgICB0aGlzLl91cGRhdGVhYmxlcy5wdXNoKHVwZGF0ZWFibGUpO1xufTtcblxuU29ja2V0TG9vcC5wcm90b3R5cGUubm9Mb25nZXJVcGRhdGUgPSBmdW5jdGlvbih1cGRhdGVhYmxlKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fdXBkYXRlYWJsZXMuaW5kZXhPZih1cGRhdGVhYmxlKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB0aGlzLl91cGRhdGVhYmxlcy5zcGxpY2UoaW5kZXgsIDEpO1xufTtcblxuU29ja2V0TG9vcC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbigpIHt9O1xuU29ja2V0TG9vcC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uKCkge307XG5cbm1vZHVsZS5leHBvcnRzID0gU29ja2V0TG9vcDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvc2l0b3IgPSByZXF1aXJlKCdmYW1vdXMvcmVuZGVyZXJzL0NvbXBvc2l0b3InKTtcbnZhciBVSU1hbmFnZXIgPSByZXF1aXJlKCdmYW1vdXMvcmVuZGVyZXJzL1VJTWFuYWdlcicpO1xudmFyIFNvY2tldExvb3AgPSByZXF1aXJlKCcuL1NvY2tldExvb3AnKTtcbnZhciBTb2NrZXRDaGFubmVsID0gcmVxdWlyZSgnLi9Tb2NrZXRDaGFubmVsJyk7XG5cbi8vIEJvaWxlcnBsYXRlXG5uZXcgVUlNYW5hZ2VyKFxuICAgIG5ldyBTb2NrZXRDaGFubmVsKCdodHRwOi8vbG9jYWxob3N0OjE2MjAnKSxcbiAgICBuZXcgQ29tcG9zaXRvcigpLFxuICAgIG5ldyBTb2NrZXRMb29wKCdodHRwOi8vbG9jYWxob3N0OjE2MjEnKVxuKTtcbiJdfQ==
