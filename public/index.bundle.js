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
new UIManager(new SocketChannel('http://localhost:1620'), new Compositor(), new RequestAnimationFrameLoop()
// new SocketLoop('http://localhost:1619')
);

},{"famous/render-loops/RequestAnimationFrameLoop":21,"famous/renderers/Compositor":22,"famous/renderers/UIManager":24}]},{},[43])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvbXBvbmVudHMvQ2FtZXJhLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL0RPTVJlbmRlcmVyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL0VsZW1lbnRDYWNoZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9NYXRoLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL2V2ZW50cy9Db21wb3NpdGlvbkV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL2V2ZW50cy9FdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvRXZlbnRNYXAuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0ZvY3VzRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0lucHV0RXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0tleWJvYXJkRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL01vdXNlRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1RvdWNoRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1VJRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1doZWVsRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL21hdGgvVmVjMi5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvbWF0aC9WZWMzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9ub2RlX21vZHVsZXMvZ2xzbGlmeS9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9ub2RlX21vZHVsZXMvZ2xzbGlmeS9zaW1wbGUtYWRhcHRlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcG9seWZpbGxzL2FuaW1hdGlvbkZyYW1lLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9wb2x5ZmlsbHMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlci1sb29wcy9SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9yZW5kZXJlcnMvQ29tcG9zaXRvci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcmVuZGVyZXJzL0NvbnRleHQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlcmVycy9VSU1hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlcmVycy9pbmplY3QtY3NzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy91dGlsaXRpZXMvY2xvbmUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3V0aWxpdGllcy9rZXlWYWx1ZVRvQXJyYXlzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy91dGlsaXRpZXMvdmVuZG9yUHJlZml4LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1nZW9tZXRyaWVzL0dlb21ldHJ5LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1nZW9tZXRyaWVzL0dlb21ldHJ5SGVscGVyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1nZW9tZXRyaWVzL3ByaW1pdGl2ZXMvUGxhbmUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9CdWZmZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9CdWZmZXJSZWdpc3RyeS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL0RlYnVnLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvUHJvZ3JhbS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL1RleHR1cmUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9UZXh0dXJlTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL1dlYkdMUmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9jb21waWxlTWF0ZXJpYWwuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9jcmVhdGVDaGVja2VyYm9hcmQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9yYWRpeFNvcnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXNoYWRlcnMvaW5kZXguanMiLCIvVXNlcnMvYWxleGFuZGVyZ3VnZWwvcGxhdGZvcm0vZW5naW5lLXNlZWQvc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3YwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBLFlBQVksQ0FBQzs7QUFFYixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUN4RCxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQzs7O0FBR3RELElBQUkseUJBQXlCLEdBQUcsT0FBTyxDQUFDLCtDQUErQyxDQUFDLENBQUM7O0FBR3pGLFNBQVMsYUFBYSxDQUFDLElBQUksRUFBRTtBQUN6QixRQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7O0FBRWhDLFFBQUksS0FBSyxHQUFHLElBQUksQ0FBQztBQUNqQixRQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLE9BQU8sRUFBRTtBQUNqRCxhQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0tBQzNDLENBQUMsQ0FBQztDQUNOOztBQUVELGFBQWEsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFVBQVUsT0FBTyxFQUFFO0FBQ3JELFFBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDdkQsV0FBTyxJQUFJLENBQUM7Q0FDZixDQUFDOzs7QUFJRixJQUFJLFNBQVMsQ0FDVCxJQUFJLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxFQUMxQyxJQUFJLFVBQVUsRUFBRSxFQUNoQixJQUFJLHlCQUF5QixFQUFFOztDQUVsQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBDYW1lcmEgaXMgYSBjb21wb25lbnQgdGhhdCBpcyByZXNwb25zaWJsZSBmb3Igc2VuZGluZyBpbmZvcm1hdGlvbiB0byB0aGUgcmVuZGVyZXIgYWJvdXQgd2hlcmVcbiAqIHRoZSBjYW1lcmEgaXMgaW4gdGhlIHNjZW5lLiAgVGhpcyBhbGxvd3MgdGhlIHVzZXIgdG8gc2V0IHRoZSB0eXBlIG9mIHByb2plY3Rpb24sIHRoZSBmb2NhbCBkZXB0aCxcbiAqIGFuZCBvdGhlciBwcm9wZXJ0aWVzIHRvIGFkanVzdCB0aGUgd2F5IHRoZSBzY2VuZXMgYXJlIHJlbmRlcmVkLlxuICpcbiAqIEBjbGFzcyBDYW1lcmFcbiAqXG4gKiBAcGFyYW0ge05vZGV9IG5vZGUgdG8gd2hpY2ggdGhlIGluc3RhbmNlIG9mIENhbWVyYSB3aWxsIGJlIGEgY29tcG9uZW50IG9mXG4gKi9cbmZ1bmN0aW9uIENhbWVyYShub2RlKSB7XG4gICAgdGhpcy5fbm9kZSA9IG5vZGU7XG4gICAgdGhpcy5fcHJvamVjdGlvblR5cGUgPSBDYW1lcmEuT1JUSE9HUkFQSElDX1BST0pFQ1RJT047XG4gICAgdGhpcy5fZm9jYWxEZXB0aCA9IDA7XG4gICAgdGhpcy5fbmVhciA9IDA7XG4gICAgdGhpcy5fZmFyID0gMDtcbiAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gZmFsc2U7XG4gICAgdGhpcy5faWQgPSBub2RlLmFkZENvbXBvbmVudCh0aGlzKTtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuICAgIHRoaXMuX3ZpZXdEaXJ0eSA9IGZhbHNlO1xuICAgIHRoaXMuX3BlcnNwZWN0aXZlRGlydHkgPSBmYWxzZTtcbiAgICB0aGlzLnNldEZsYXQoKTtcbn1cblxuQ2FtZXJhLkZSVVNUVU1fUFJPSkVDVElPTiA9IDA7XG5DYW1lcmEuUElOSE9MRV9QUk9KRUNUSU9OID0gMTtcbkNhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTiA9IDI7XG5cbi8qKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgY29tcG9uZW50XG4gKi9cbkNhbWVyYS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gJ0NhbWVyYSc7XG59O1xuXG4vKipcbiAqIEdldHMgb2JqZWN0IGNvbnRhaW5pbmcgc2VyaWFsaXplZCBkYXRhIGZvciB0aGUgY29tcG9uZW50XG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIHN0YXRlIG9mIHRoZSBjb21wb25lbnRcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5nZXRWYWx1ZSA9IGZ1bmN0aW9uIGdldFZhbHVlKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGNvbXBvbmVudDogdGhpcy50b1N0cmluZygpLFxuICAgICAgICBwcm9qZWN0aW9uVHlwZTogdGhpcy5fcHJvamVjdGlvblR5cGUsXG4gICAgICAgIGZvY2FsRGVwdGg6IHRoaXMuX2ZvY2FsRGVwdGgsXG4gICAgICAgIG5lYXI6IHRoaXMuX25lYXIsXG4gICAgICAgIGZhcjogdGhpcy5fZmFyXG4gICAgfTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBjb21wb25lbnRzIHN0YXRlIGJhc2VkIG9uIHNvbWUgc2VyaWFsaXplZCBkYXRhXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZSBhbiBvYmplY3QgZGVmaW5pbmcgd2hhdCB0aGUgc3RhdGUgb2YgdGhlIGNvbXBvbmVudCBzaG91bGQgYmVcbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSBzdGF0dXMgb2YgdGhlIHNldFxuICovXG5DYW1lcmEucHJvdG90eXBlLnNldFZhbHVlID0gZnVuY3Rpb24gc2V0VmFsdWUoc3RhdGUpIHtcbiAgICBpZiAodGhpcy50b1N0cmluZygpID09PSBzdGF0ZS5jb21wb25lbnQpIHtcbiAgICAgICAgdGhpcy5zZXQoc3RhdGUucHJvamVjdGlvblR5cGUsIHN0YXRlLmZvY2FsRGVwdGgsIHN0YXRlLm5lYXIsIHN0YXRlLmZhcik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgaW50ZXJuYWxzIG9mIHRoZSBjb21wb25lbnRcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHR5cGUgYW4gaWQgY29ycmVzcG9uZGluZyB0byB0aGUgdHlwZSBvZiBwcm9qZWN0aW9uIHRvIHVzZVxuICogQHBhcmFtIHtOdW1iZXJ9IGRlcHRoIHRoZSBkZXB0aCBmb3IgdGhlIHBpbmhvbGUgcHJvamVjdGlvbiBtb2RlbFxuICogQHBhcmFtIHtOdW1iZXJ9IG5lYXIgdGhlIGRpc3RhbmNlIG9mIHRoZSBuZWFyIGNsaXBwaW5nIHBsYW5lIGZvciBhIGZydXN0dW0gcHJvamVjdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IGZhciB0aGUgZGlzdGFuY2Ugb2YgdGhlIGZhciBjbGlwcGluZyBwbGFuZSBmb3IgYSBmcnVzdHVtIHByb2plY3Rpb25cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSBzdGF0dXMgb2YgdGhlIHNldFxuICovXG5DYW1lcmEucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCh0eXBlLCBkZXB0aCwgbmVhciwgZmFyKSB7XG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB7XG4gICAgICAgIHRoaXMuX25vZGUucmVxdWVzdFVwZGF0ZSh0aGlzLl9pZCk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLl9wcm9qZWN0aW9uVHlwZSA9IHR5cGU7XG4gICAgdGhpcy5fZm9jYWxEZXB0aCA9IGRlcHRoO1xuICAgIHRoaXMuX25lYXIgPSBuZWFyO1xuICAgIHRoaXMuX2ZhciA9IGZhcjtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBjYW1lcmEgZGVwdGggZm9yIGEgcGluaG9sZSBwcm9qZWN0aW9uIG1vZGVsXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBkZXB0aCB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0aGUgQ2FtZXJhIGFuZCB0aGUgb3JpZ2luXG4gKlxuICogQHJldHVybiB7Q2FtZXJhfSB0aGlzXG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuc2V0RGVwdGggPSBmdW5jdGlvbiBzZXREZXB0aChkZXB0aCkge1xuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkge1xuICAgICAgICB0aGlzLl9ub2RlLnJlcXVlc3RVcGRhdGUodGhpcy5faWQpO1xuICAgICAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5fcGVyc3BlY3RpdmVEaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fcHJvamVjdGlvblR5cGUgPSBDYW1lcmEuUElOSE9MRV9QUk9KRUNUSU9OO1xuICAgIHRoaXMuX2ZvY2FsRGVwdGggPSBkZXB0aDtcbiAgICB0aGlzLl9uZWFyID0gMDtcbiAgICB0aGlzLl9mYXIgPSAwO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEdldHMgb2JqZWN0IGNvbnRhaW5pbmcgc2VyaWFsaXplZCBkYXRhIGZvciB0aGUgY29tcG9uZW50XG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBuZWFyIGRpc3RhbmNlIGZyb20gdGhlIG5lYXIgY2xpcHBpbmcgcGxhbmUgdG8gdGhlIGNhbWVyYVxuICogQHBhcmFtIHtOdW1iZXJ9IGZhciBkaXN0YW5jZSBmcm9tIHRoZSBmYXIgY2xpcHBpbmcgcGxhbmUgdG8gdGhlIGNhbWVyYVxuICpcbiAqIEByZXR1cm4ge0NhbWVyYX0gdGhpc1xuICovXG5DYW1lcmEucHJvdG90eXBlLnNldEZydXN0dW0gPSBmdW5jdGlvbiBzZXRGcnVzdHVtKG5lYXIsIGZhcikge1xuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkge1xuICAgICAgICB0aGlzLl9ub2RlLnJlcXVlc3RVcGRhdGUodGhpcy5faWQpO1xuICAgICAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl9wcm9qZWN0aW9uVHlwZSA9IENhbWVyYS5GUlVTVFVNX1BST0pFQ1RJT047XG4gICAgdGhpcy5fZm9jYWxEZXB0aCA9IDA7XG4gICAgdGhpcy5fbmVhciA9IG5lYXI7XG4gICAgdGhpcy5fZmFyID0gZmFyO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgQ2FtZXJhIHRvIGhhdmUgb3J0aG9ncmFwaGljIHByb2plY3Rpb25cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Q2FtZXJhfSB0aGlzXG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuc2V0RmxhdCA9IGZ1bmN0aW9uIHNldEZsYXQoKSB7XG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB7XG4gICAgICAgIHRoaXMuX25vZGUucmVxdWVzdFVwZGF0ZSh0aGlzLl9pZCk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3BlcnNwZWN0aXZlRGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OO1xuICAgIHRoaXMuX2ZvY2FsRGVwdGggPSAwO1xuICAgIHRoaXMuX25lYXIgPSAwO1xuICAgIHRoaXMuX2ZhciA9IDA7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogV2hlbiB0aGUgbm9kZSB0aGlzIGNvbXBvbmVudCBpcyBhdHRhY2hlZCB0byB1cGRhdGVzLCB0aGUgQ2FtZXJhIHdpbGxcbiAqIHNlbmQgbmV3IGNhbWVyYSBpbmZvcm1hdGlvbiB0byB0aGUgQ29tcG9zaXRvciB0byB1cGRhdGUgdGhlIHJlbmRlcmluZ1xuICogb2YgdGhlIHNjZW5lLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5DYW1lcmEucHJvdG90eXBlLm9uVXBkYXRlID0gZnVuY3Rpb24gb25VcGRhdGUoKSB7XG4gICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IGZhbHNlO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9ub2RlLmdldExvY2F0aW9uKCk7XG5cbiAgICB0aGlzLl9ub2RlXG4gICAgICAgIC5zZW5kRHJhd0NvbW1hbmQoJ1dJVEgnKVxuICAgICAgICAuc2VuZERyYXdDb21tYW5kKHBhdGgpO1xuXG4gICAgaWYgKHRoaXMuX3BlcnNwZWN0aXZlRGlydHkpIHtcbiAgICAgICAgdGhpcy5fcGVyc3BlY3RpdmVEaXJ0eSA9IGZhbHNlO1xuXG4gICAgICAgIHN3aXRjaCAodGhpcy5fcHJvamVjdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQ2FtZXJhLkZSVVNUVU1fUFJPSkVDVElPTjpcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCgnRlJVU1RVTV9QUk9KRUNUSU9OJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fbmVhcik7XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fZmFyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgQ2FtZXJhLlBJTkhPTEVfUFJPSkVDVElPTjpcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCgnUElOSE9MRV9QUk9KRUNUSU9OJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fZm9jYWxEZXB0aCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIENhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTjpcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCgnT1JUSE9HUkFQSElDX1BST0pFQ1RJT04nKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLl92aWV3RGlydHkpIHtcbiAgICAgICAgdGhpcy5fdmlld0RpcnR5ID0gZmFsc2U7XG5cbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQoJ0NIQU5HRV9WSUVXX1RSQU5TRk9STScpO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzBdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxXSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMl0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzNdKTtcblxuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzRdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVs1XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNl0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzddKTtcblxuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzhdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVs5XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTBdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxMV0pO1xuXG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTJdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxM10pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzE0XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTVdKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFdoZW4gdGhlIHRyYW5zZm9ybSBvZiB0aGUgbm9kZSB0aGlzIGNvbXBvbmVudCBpcyBhdHRhY2hlZCB0b1xuICogY2hhbmdlcywgaGF2ZSB0aGUgQ2FtZXJhIHVwZGF0ZSBpdHMgcHJvamVjdGlvbiBtYXRyaXggYW5kXG4gKiBpZiBuZWVkZWQsIGZsYWcgdG8gbm9kZSB0byB1cGRhdGUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHRyYW5zZm9ybSBhbiBhcnJheSBkZW5vdGluZyB0aGUgdHJhbnNmb3JtIG1hdHJpeCBvZiB0aGUgbm9kZVxuICpcbiAqIEByZXR1cm4ge0NhbWVyYX0gdGhpc1xuICovXG5DYW1lcmEucHJvdG90eXBlLm9uVHJhbnNmb3JtQ2hhbmdlID0gZnVuY3Rpb24gb25UcmFuc2Zvcm1DaGFuZ2UodHJhbnNmb3JtKSB7XG4gICAgdmFyIGEgPSB0cmFuc2Zvcm07XG4gICAgdGhpcy5fdmlld0RpcnR5ID0gdHJ1ZTtcblxuICAgIGlmICghdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSkge1xuICAgICAgICB0aGlzLl9ub2RlLnJlcXVlc3RVcGRhdGUodGhpcy5faWQpO1xuICAgICAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gdHJ1ZTtcbiAgICB9XG5cbiAgICB2YXIgYTAwID0gYVswXSwgYTAxID0gYVsxXSwgYTAyID0gYVsyXSwgYTAzID0gYVszXSxcbiAgICBhMTAgPSBhWzRdLCBhMTEgPSBhWzVdLCBhMTIgPSBhWzZdLCBhMTMgPSBhWzddLFxuICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICBhMzAgPSBhWzEyXSwgYTMxID0gYVsxM10sIGEzMiA9IGFbMTRdLCBhMzMgPSBhWzE1XSxcblxuICAgIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCxcbiAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXG4gICAgYjAyID0gYTAwICogYTEzIC0gYTAzICogYTEwLFxuICAgIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSxcbiAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXG4gICAgYjA1ID0gYTAyICogYTEzIC0gYTAzICogYTEyLFxuICAgIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCxcbiAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXG4gICAgYjA4ID0gYTIwICogYTMzIC0gYTIzICogYTMwLFxuICAgIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSxcbiAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXG4gICAgYjExID0gYTIyICogYTMzIC0gYTIzICogYTMyLFxuXG4gICAgZGV0ID0gMS8oYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2KTtcblxuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMF0gPSAoYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzFdID0gKGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsyXSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bM10gPSAoYTIyICogYjA0IC0gYTIxICogYjA1IC0gYTIzICogYjAzKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzRdID0gKGExMiAqIGIwOCAtIGExMCAqIGIxMSAtIGExMyAqIGIwNykgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs1XSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNl0gPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzddID0gKGEyMCAqIGIwNSAtIGEyMiAqIGIwMiArIGEyMyAqIGIwMSkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs4XSA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bOV0gPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzEwXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTFdID0gKGEyMSAqIGIwMiAtIGEyMCAqIGIwNCAtIGEyMyAqIGIwMCkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxMl0gPSAoYTExICogYjA3IC0gYTEwICogYjA5IC0gYTEyICogYjA2KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzEzXSA9IChhMDAgKiBiMDkgLSBhMDEgKiBiMDcgKyBhMDIgKiBiMDYpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTRdID0gKGEzMSAqIGIwMSAtIGEzMCAqIGIwMyAtIGEzMiAqIGIwMCkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxNV0gPSAoYTIwICogYjAzIC0gYTIxICogYjAxICsgYTIyICogYjAwKSAqIGRldDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FtZXJhO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgRWxlbWVudENhY2hlID0gcmVxdWlyZSgnLi9FbGVtZW50Q2FjaGUnKTtcbnZhciBtYXRoID0gcmVxdWlyZSgnLi9NYXRoJyk7XG52YXIgdmVuZG9yUHJlZml4ID0gcmVxdWlyZSgnLi4vdXRpbGl0aWVzL3ZlbmRvclByZWZpeCcpO1xudmFyIGV2ZW50TWFwID0gcmVxdWlyZSgnLi9ldmVudHMvRXZlbnRNYXAnKTtcblxudmFyIFRSQU5TRk9STSA9IG51bGw7XG5cbi8qKlxuICogRE9NUmVuZGVyZXIgaXMgYSBjbGFzcyByZXNwb25zaWJsZSBmb3IgYWRkaW5nIGVsZW1lbnRzXG4gKiB0byB0aGUgRE9NIGFuZCB3cml0aW5nIHRvIHRob3NlIGVsZW1lbnRzLlxuICogVGhlcmUgaXMgYSBET01SZW5kZXJlciBwZXIgY29udGV4dCwgcmVwcmVzZW50ZWQgYXMgYW5cbiAqIGVsZW1lbnQgYW5kIGEgc2VsZWN0b3IuIEl0IGlzIGluc3RhbnRpYXRlZCBpbiB0aGVcbiAqIGNvbnRleHQgY2xhc3MuXG4gKlxuICogQGNsYXNzIERPTVJlbmRlcmVyXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCBhbiBlbGVtZW50LlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIHRoZSBzZWxlY3RvciBvZiB0aGUgZWxlbWVudC5cbiAqIEBwYXJhbSB7Q29tcG9zaXRvcn0gY29tcG9zaXRvciB0aGUgY29tcG9zaXRvciBjb250cm9sbGluZyB0aGUgcmVuZGVyZXJcbiAqL1xuZnVuY3Rpb24gRE9NUmVuZGVyZXIgKGVsZW1lbnQsIHNlbGVjdG9yLCBjb21wb3NpdG9yKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnZmFtb3VzLWRvbS1yZW5kZXJlcicpO1xuXG4gICAgVFJBTlNGT1JNID0gVFJBTlNGT1JNIHx8IHZlbmRvclByZWZpeCgndHJhbnNmb3JtJyk7XG4gICAgdGhpcy5fY29tcG9zaXRvciA9IGNvbXBvc2l0b3I7IC8vIGEgcmVmZXJlbmNlIHRvIHRoZSBjb21wb3NpdG9yXG5cbiAgICB0aGlzLl90YXJnZXQgPSBudWxsOyAvLyBhIHJlZ2lzdGVyIGZvciBob2xkaW5nIHRoZSBjdXJyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxlbWVudCB0aGF0IHRoZSBSZW5kZXJlciBpcyBvcGVyYXRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyB1cG9uXG5cbiAgICB0aGlzLl9wYXJlbnQgPSBudWxsOyAvLyBhIHJlZ2lzdGVyIGZvciBob2xkaW5nIHRoZSBwYXJlbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvZiB0aGUgdGFyZ2V0XG5cbiAgICB0aGlzLl9wYXRoID0gbnVsbDsgLy8gYSByZWdpc3RlciBmb3IgaG9sZGluZyB0aGUgcGF0aCBvZiB0aGUgdGFyZ2V0XG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgcmVnaXN0ZXIgbXVzdCBiZSBzZXQgZmlyc3QsIGFuZCB0aGVuXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIGNoaWxkcmVuLCB0YXJnZXQsIGFuZCBwYXJlbnQgYXJlIGFsbCBsb29rZWRcbiAgICAgICAgICAgICAgICAgICAgICAgLy8gdXAgZnJvbSB0aGF0LlxuXG4gICAgdGhpcy5fY2hpbGRyZW4gPSBbXTsgLy8gYSByZWdpc3RlciBmb3IgaG9sZGluZyB0aGUgY2hpbGRyZW4gb2YgdGhlXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3VycmVudCB0YXJnZXQuXG5cbiAgICB0aGlzLl9yb290ID0gbmV3IEVsZW1lbnRDYWNoZShlbGVtZW50LCBzZWxlY3Rvcik7IC8vIHRoZSByb290XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBvZiB0aGUgZG9tIHRyZWUgdGhhdCB0aGlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyByZW5kZXJlciBpcyByZXNwb25zaWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZm9yXG5cbiAgICB0aGlzLl9ib3VuZFRyaWdnZXJFdmVudCA9IGZ1bmN0aW9uIChldikge1xuICAgICAgICByZXR1cm4gX3RoaXMuX3RyaWdnZXJFdmVudChldik7XG4gICAgfTtcblxuICAgIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG5cbiAgICB0aGlzLl9lbGVtZW50cyA9IHt9O1xuXG4gICAgdGhpcy5fZWxlbWVudHNbc2VsZWN0b3JdID0gdGhpcy5fcm9vdDtcblxuICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG4gICAgdGhpcy5fVlB0cmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG5cbiAgICB0aGlzLl9zaXplID0gW251bGwsIG51bGxdO1xufVxuXG5cbi8qKlxuICogQXR0YWNoZXMgYW4gRXZlbnRMaXN0ZW5lciB0byB0aGUgZWxlbWVudCBhc3NvY2lhdGVkIHdpdGggdGhlIHBhc3NlZCBpbiBwYXRoLlxuICogUHJldmVudHMgdGhlIGRlZmF1bHQgYnJvd3NlciBhY3Rpb24gb24gYWxsIHN1YnNlcXVlbnQgZXZlbnRzIGlmXG4gKiBgcHJldmVudERlZmF1bHRgIGlzIHRydXRoeS5cbiAqIEFsbCBpbmNvbWluZyBldmVudHMgd2lsbCBiZSBmb3J3YXJkZWQgdG8gdGhlIGNvbXBvc2l0b3IgYnkgaW52b2tpbmcgdGhlXG4gKiBgc2VuZEV2ZW50YCBtZXRob2QuXG4gKiBEZWxlZ2F0ZXMgZXZlbnRzIGlmIHBvc3NpYmxlIGJ5IGF0dGFjaGluZyB0aGUgZXZlbnQgbGlzdGVuZXIgdG8gdGhlIGNvbnRleHQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIERPTSBldmVudCB0eXBlIChlLmcuIGNsaWNrLCBtb3VzZW92ZXIpLlxuICogQHBhcmFtIHtCb29sZWFufSBwcmV2ZW50RGVmYXVsdCBXaGV0aGVyIG9yIG5vdCB0aGUgZGVmYXVsdCBicm93c2VyIGFjdGlvbiBzaG91bGQgYmUgcHJldmVudGVkLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiBzdWJzY3JpYmUodHlwZSwgcHJldmVudERlZmF1bHQpIHtcbiAgICAvLyBUT0RPIHByZXZlbnREZWZhdWx0IHNob3VsZCBiZSBhIHNlcGFyYXRlIGNvbW1hbmRcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcblxuICAgIHRoaXMuX3RhcmdldC5wcmV2ZW50RGVmYXVsdFt0eXBlXSA9IHByZXZlbnREZWZhdWx0O1xuICAgIHRoaXMuX3RhcmdldC5zdWJzY3JpYmVbdHlwZV0gPSB0cnVlO1xuXG4gICAgaWYgKFxuICAgICAgICAhdGhpcy5fdGFyZ2V0Lmxpc3RlbmVyc1t0eXBlXSAmJiAhdGhpcy5fcm9vdC5saXN0ZW5lcnNbdHlwZV1cbiAgICApIHtcbiAgICAgICAgdmFyIHRhcmdldCA9IGV2ZW50TWFwW3R5cGVdWzFdID8gdGhpcy5fcm9vdCA6IHRoaXMuX3RhcmdldDtcbiAgICAgICAgdGFyZ2V0Lmxpc3RlbmVyc1t0eXBlXSA9IHRoaXMuX2JvdW5kVHJpZ2dlckV2ZW50O1xuICAgICAgICB0YXJnZXQuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIHRoaXMuX2JvdW5kVHJpZ2dlckV2ZW50KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEZ1bmN0aW9uIHRvIGJlIGFkZGVkIHVzaW5nIGBhZGRFdmVudExpc3RlbmVyYCB0byB0aGUgY29ycmVzcG9uZGluZ1xuICogRE9NRWxlbWVudC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IERPTSBFdmVudCBwYXlsb2FkXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl90cmlnZ2VyRXZlbnQgPSBmdW5jdGlvbiBfdHJpZ2dlckV2ZW50KGV2KSB7XG4gICAgLy8gVXNlIGV2LnBhdGgsIHdoaWNoIGlzIGFuIGFycmF5IG9mIEVsZW1lbnRzIChwb2x5ZmlsbGVkIGlmIG5lZWRlZCkuXG4gICAgdmFyIGV2UGF0aCA9IGV2LnBhdGggPyBldi5wYXRoIDogX2dldFBhdGgoZXYpO1xuICAgIC8vIEZpcnN0IGVsZW1lbnQgaW4gdGhlIHBhdGggaXMgdGhlIGVsZW1lbnQgb24gd2hpY2ggdGhlIGV2ZW50IGhhcyBhY3R1YWxseVxuICAgIC8vIGJlZW4gZW1pdHRlZC5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2UGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBTa2lwIG5vZGVzIHRoYXQgZG9uJ3QgaGF2ZSBhIGRhdGFzZXQgcHJvcGVydHkgb3IgZGF0YS1mYS1wYXRoXG4gICAgICAgIC8vIGF0dHJpYnV0ZS5cbiAgICAgICAgaWYgKCFldlBhdGhbaV0uZGF0YXNldCkgY29udGludWU7XG4gICAgICAgIHZhciBwYXRoID0gZXZQYXRoW2ldLmRhdGFzZXQuZmFQYXRoO1xuICAgICAgICBpZiAoIXBhdGgpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIFN0b3AgZnVydGhlciBldmVudCBwcm9wb2dhdGlvbiBhbmQgcGF0aCB0cmF2ZXJzYWwgYXMgc29vbiBhcyB0aGVcbiAgICAgICAgLy8gZmlyc3QgRWxlbWVudENhY2hlIHN1YnNjcmliaW5nIGZvciB0aGUgZW1pdHRlZCBldmVudCBoYXMgYmVlbiBmb3VuZC5cbiAgICAgICAgaWYgKHRoaXMuX2VsZW1lbnRzW3BhdGhdICYmIHRoaXMuX2VsZW1lbnRzW3BhdGhdLnN1YnNjcmliZVtldi50eXBlXSkge1xuICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHkgcHJldmVudERlZmF1bHQuIFRoaXMgbmVlZHMgZm9ydGhlciBjb25zaWRlcmF0aW9uIGFuZFxuICAgICAgICAgICAgLy8gc2hvdWxkIGJlIG9wdGlvbmFsLiBFdmVudHVhbGx5IHRoaXMgc2hvdWxkIGJlIGEgc2VwYXJhdGUgY29tbWFuZC9cbiAgICAgICAgICAgIC8vIG1ldGhvZC5cbiAgICAgICAgICAgIGlmICh0aGlzLl9lbGVtZW50c1twYXRoXS5wcmV2ZW50RGVmYXVsdFtldi50eXBlXSkge1xuICAgICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciBOb3JtYWxpemVkRXZlbnRDb25zdHJ1Y3RvciA9IGV2ZW50TWFwW2V2LnR5cGVdWzBdO1xuXG4gICAgICAgICAgICAvLyBGaW5hbGx5IHNlbmQgdGhlIGV2ZW50IHRvIHRoZSBXb3JrZXIgVGhyZWFkIHRocm91Z2ggdGhlXG4gICAgICAgICAgICAvLyBjb21wb3NpdG9yLlxuICAgICAgICAgICAgdGhpcy5fY29tcG9zaXRvci5zZW5kRXZlbnQocGF0aCwgZXYudHlwZSwgbmV3IE5vcm1hbGl6ZWRFdmVudENvbnN0cnVjdG9yKGV2KSk7XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG4vKipcbiAqIGdldFNpemVPZiBnZXRzIHRoZSBkb20gc2l6ZSBvZiBhIHBhcnRpY3VsYXIgRE9NIGVsZW1lbnQuICBUaGlzIGlzXG4gKiBuZWVkZWQgZm9yIHJlbmRlciBzaXppbmcgaW4gdGhlIHNjZW5lIGdyYXBoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBwYXRoIG9mIHRoZSBOb2RlIGluIHRoZSBzY2VuZSBncmFwaFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBhIHZlYzMgb2YgdGhlIG9mZnNldCBzaXplIG9mIHRoZSBkb20gZWxlbWVudFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZ2V0U2l6ZU9mID0gZnVuY3Rpb24gZ2V0U2l6ZU9mKHBhdGgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3BhdGhdO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuIG51bGw7XG5cbiAgICB2YXIgcmVzID0ge3ZhbDogZWxlbWVudC5zaXplfTtcbiAgICB0aGlzLl9jb21wb3NpdG9yLnNlbmRFdmVudChwYXRoLCAncmVzaXplJywgcmVzKTtcbiAgICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gX2dldFBhdGgoZXYpIHtcbiAgICAvLyBUT0RPIG1vdmUgaW50byBfdHJpZ2dlckV2ZW50LCBhdm9pZCBvYmplY3QgYWxsb2NhdGlvblxuICAgIHZhciBwYXRoID0gW107XG4gICAgdmFyIG5vZGUgPSBldi50YXJnZXQ7XG4gICAgd2hpbGUgKG5vZGUgIT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgcGF0aC5wdXNoKG5vZGUpO1xuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbn1cblxuXG4vKipcbiAqIERldGVybWluZXMgdGhlIHNpemUgb2YgdGhlIGNvbnRleHQgYnkgcXVlcnlpbmcgdGhlIERPTSBmb3IgYG9mZnNldFdpZHRoYCBhbmRcbiAqIGBvZmZzZXRIZWlnaHRgLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gT2Zmc2V0IHNpemUuXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5nZXRTaXplID0gZnVuY3Rpb24gZ2V0U2l6ZSgpIHtcbiAgICB0aGlzLl9zaXplWzBdID0gdGhpcy5fcm9vdC5lbGVtZW50Lm9mZnNldFdpZHRoO1xuICAgIHRoaXMuX3NpemVbMV0gPSB0aGlzLl9yb290LmVsZW1lbnQub2Zmc2V0SGVpZ2h0O1xuICAgIHJldHVybiB0aGlzLl9zaXplO1xufTtcblxuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9nZXRTaXplID0gRE9NUmVuZGVyZXIucHJvdG90eXBlLmdldFNpemU7XG5cblxuLyoqXG4gKiBFeGVjdXRlcyB0aGUgcmV0cmlldmVkIGRyYXcgY29tbWFuZHMuIERyYXcgY29tbWFuZHMgb25seSByZWZlciB0byB0aGVcbiAqIGNyb3NzLWJyb3dzZXIgbm9ybWFsaXplZCBgdHJhbnNmb3JtYCBwcm9wZXJ0eS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIGRlc2NyaXB0aW9uXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiBkcmF3KHJlbmRlclN0YXRlKSB7XG4gICAgaWYgKHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlRGlydHkpIHtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcblxuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzBdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMF07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsyXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzJdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzNdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bM107XG5cbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs0XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzRdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzVdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNV07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNl0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs2XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs3XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzddO1xuXG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bOF0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs4XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs5XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzldO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEwXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEwXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV07XG5cbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMl0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMl07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTNdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTNdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzE0XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzE0XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNV07XG4gICAgfVxuXG4gICAgaWYgKHJlbmRlclN0YXRlLnZpZXdEaXJ0eSB8fCByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5KSB7XG4gICAgICAgIG1hdGgubXVsdGlwbHkodGhpcy5fVlB0cmFuc2Zvcm0sIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm0sIHJlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm0pO1xuICAgICAgICB0aGlzLl9yb290LmVsZW1lbnQuc3R5bGVbVFJBTlNGT1JNXSA9IHRoaXMuX3N0cmluZ2lmeU1hdHJpeCh0aGlzLl9WUHRyYW5zZm9ybSk7XG4gICAgfVxufTtcblxuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGEgcGF0aCBpcyBjdXJyZW50bHkgbG9hZGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRQYXRoTG9hZGVkID0gZnVuY3Rpb24gX2Fzc2VyUGF0aExvYWRlZCgpIHtcbiAgICBpZiAoIXRoaXMuX3BhdGgpIHRocm93IG5ldyBFcnJvcigncGF0aCBub3QgbG9hZGVkJyk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGEgcGFyZW50IGlzIGN1cnJlbnRseSBsb2FkZWQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuX2Fzc2VydFBhcmVudExvYWRlZCA9IGZ1bmN0aW9uIF9hc3NlcnRQYXJlbnRMb2FkZWQoKSB7XG4gICAgaWYgKCF0aGlzLl9wYXJlbnQpIHRocm93IG5ldyBFcnJvcigncGFyZW50IG5vdCBsb2FkZWQnKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGVuc3VyaW5nIHRoYXQgY2hpbGRyZW4gYXJlIGN1cnJlbnRseVxuICogbG9hZGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRDaGlsZHJlbkxvYWRlZCA9IGZ1bmN0aW9uIF9hc3NlcnRDaGlsZHJlbkxvYWRlZCgpIHtcbiAgICBpZiAoIXRoaXMuX2NoaWxkcmVuKSB0aHJvdyBuZXcgRXJyb3IoJ2NoaWxkcmVuIG5vdCBsb2FkZWQnKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGVuc3VyaW5nIHRoYXQgYSB0YXJnZXQgaXMgY3VycmVudGx5IGxvYWRlZC5cbiAqXG4gKiBAbWV0aG9kICBfYXNzZXJ0VGFyZ2V0TG9hZGVkXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRUYXJnZXRMb2FkZWQgPSBmdW5jdGlvbiBfYXNzZXJ0VGFyZ2V0TG9hZGVkKCkge1xuICAgIGlmICghdGhpcy5fdGFyZ2V0KSB0aHJvdyBuZXcgRXJyb3IoJ05vIHRhcmdldCBsb2FkZWQnKTtcbn07XG5cbi8qKlxuICogRmluZHMgYW5kIHNldHMgdGhlIHBhcmVudCBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCBlbGVtZW50IChwYXRoKS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge0VsZW1lbnRDYWNoZX0gUGFyZW50IGVsZW1lbnQuXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5maW5kUGFyZW50ID0gZnVuY3Rpb24gZmluZFBhcmVudCAoKSB7XG4gICAgdGhpcy5fYXNzZXJ0UGF0aExvYWRlZCgpO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9wYXRoO1xuICAgIHZhciBwYXJlbnQ7XG5cbiAgICB3aGlsZSAoIXBhcmVudCAmJiBwYXRoLmxlbmd0aCkge1xuICAgICAgICBwYXRoID0gcGF0aC5zdWJzdHJpbmcoMCwgcGF0aC5sYXN0SW5kZXhPZignLycpKTtcbiAgICAgICAgcGFyZW50ID0gdGhpcy5fZWxlbWVudHNbcGF0aF07XG4gICAgfVxuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICByZXR1cm4gcGFyZW50O1xufTtcblxuXG4vKipcbiAqIEZpbmRzIGFsbCBjaGlsZHJlbiBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCBlbGVtZW50LlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtBcnJheX0gYXJyYXkgT3V0cHV0LUFycmF5IHVzZWQgZm9yIHdyaXRpbmcgdG8gKHN1YnNlcXVlbnRseSBhcHBlbmRpbmcgY2hpbGRyZW4pXG4gKlxuICogQHJldHVybiB7QXJyYXl9IGFycmF5IG9mIGNoaWxkcmVuIGVsZW1lbnRzXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5maW5kQ2hpbGRyZW4gPSBmdW5jdGlvbiBmaW5kQ2hpbGRyZW4oYXJyYXkpIHtcbiAgICAvLyBUT0RPOiBPcHRpbWl6ZSBtZS5cbiAgICB0aGlzLl9hc3NlcnRQYXRoTG9hZGVkKCk7XG5cbiAgICB2YXIgcGF0aCA9IHRoaXMuX3BhdGggKyAnLyc7XG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLl9lbGVtZW50cyk7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBsZW47XG4gICAgYXJyYXkgPSBhcnJheSA/IGFycmF5IDogdGhpcy5fY2hpbGRyZW47XG5cbiAgICB0aGlzLl9jaGlsZHJlbi5sZW5ndGggPSAwO1xuXG4gICAgd2hpbGUgKGkgPCBrZXlzLmxlbmd0aCkge1xuICAgICAgICBpZiAoa2V5c1tpXS5pbmRleE9mKHBhdGgpID09PSAtMSB8fCBrZXlzW2ldID09PSBwYXRoKSBrZXlzLnNwbGljZShpLCAxKTtcbiAgICAgICAgZWxzZSBpKys7XG4gICAgfVxuICAgIHZhciBjdXJyZW50UGF0aDtcbiAgICB2YXIgaiA9IDA7XG4gICAgZm9yIChpID0gMCA7IGkgPCBrZXlzLmxlbmd0aCA7IGkrKykge1xuICAgICAgICBjdXJyZW50UGF0aCA9IGtleXNbaV07XG4gICAgICAgIGZvciAoaiA9IDAgOyBqIDwga2V5cy5sZW5ndGggOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChpICE9PSBqICYmIGtleXNbal0uaW5kZXhPZihjdXJyZW50UGF0aCkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAga2V5cy5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoaSA9IDAsIGxlbiA9IGtleXMubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKylcbiAgICAgICAgYXJyYXlbaV0gPSB0aGlzLl9lbGVtZW50c1trZXlzW2ldXTtcblxuICAgIHJldHVybiBhcnJheTtcbn07XG5cblxuLyoqXG4gKiBVc2VkIGZvciBkZXRlcm1pbmluZyB0aGUgdGFyZ2V0IGxvYWRlZCB1bmRlciB0aGUgY3VycmVudCBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtFbGVtZW50Q2FjaGV8dW5kZWZpbmVkfSBFbGVtZW50IGxvYWRlZCB1bmRlciBkZWZpbmVkIHBhdGguXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5maW5kVGFyZ2V0ID0gZnVuY3Rpb24gZmluZFRhcmdldCgpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9wYXRoXTtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0O1xufTtcblxuXG4vKipcbiAqIExvYWRzIHRoZSBwYXNzZWQgaW4gcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB0byBiZSBsb2FkZWRcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IExvYWRlZCBwYXRoXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5sb2FkUGF0aCA9IGZ1bmN0aW9uIGxvYWRQYXRoIChwYXRoKSB7XG4gICAgdGhpcy5fcGF0aCA9IHBhdGg7XG4gICAgcmV0dXJuIHRoaXMuX3BhdGg7XG59O1xuXG5cbi8qKlxuICogSW5zZXJ0cyBhIERPTUVsZW1lbnQgYXQgdGhlIGN1cnJlbnRseSBsb2FkZWQgcGF0aCwgYXNzdW1pbmcgbm8gdGFyZ2V0IGlzXG4gKiBsb2FkZWQuIE9ubHkgb25lIERPTUVsZW1lbnQgY2FuIGJlIGFzc29jaWF0ZWQgd2l0aCBlYWNoIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0YWdOYW1lIFRhZyBuYW1lIChjYXBpdGFsaXphdGlvbiB3aWxsIGJlIG5vcm1hbGl6ZWQpLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5pbnNlcnRFbCA9IGZ1bmN0aW9uIGluc2VydEVsICh0YWdOYW1lKSB7XG4gICAgaWYgKCF0aGlzLl90YXJnZXQgfHxcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpICE9PSB0YWdOYW1lLnRvTG93ZXJDYXNlKCkpIHtcblxuICAgICAgICB0aGlzLmZpbmRQYXJlbnQoKTtcbiAgICAgICAgdGhpcy5maW5kQ2hpbGRyZW4oKTtcblxuICAgICAgICB0aGlzLl9hc3NlcnRQYXJlbnRMb2FkZWQoKTtcbiAgICAgICAgdGhpcy5fYXNzZXJ0Q2hpbGRyZW5Mb2FkZWQoKTtcblxuICAgICAgICBpZiAodGhpcy5fdGFyZ2V0KSB0aGlzLl9wYXJlbnQuZWxlbWVudC5yZW1vdmVDaGlsZCh0aGlzLl90YXJnZXQuZWxlbWVudCk7XG5cbiAgICAgICAgdGhpcy5fdGFyZ2V0ID0gbmV3IEVsZW1lbnRDYWNoZShkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpLCB0aGlzLl9wYXRoKTtcbiAgICAgICAgdGhpcy5fcGFyZW50LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5fdGFyZ2V0LmVsZW1lbnQpO1xuICAgICAgICB0aGlzLl9lbGVtZW50c1t0aGlzLl9wYXRoXSA9IHRoaXMuX3RhcmdldDtcblxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fY2hpbGRyZW4ubGVuZ3RoIDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuYXBwZW5kQ2hpbGQodGhpcy5fY2hpbGRyZW5baV0uZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG5cbi8qKlxuICogU2V0cyBhIHByb3BlcnR5IG9uIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgUHJvcGVydHkgbmFtZSAoZS5nLiBiYWNrZ3JvdW5kLCBjb2xvciwgZm9udClcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSBQcm9wcnR5IHZhbHVlIChlLmcuIGJsYWNrLCAyMHB4KVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRQcm9wZXJ0eSA9IGZ1bmN0aW9uIHNldFByb3BlcnR5IChuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnN0eWxlW25hbWVdID0gdmFsdWU7XG59O1xuXG5cbi8qKlxuICogU2V0cyB0aGUgc2l6ZSBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKiBSZW1vdmVzIGFueSBleHBsaWNpdCBzaXppbmcgY29uc3RyYWludHMgd2hlbiBwYXNzZWQgaW4gYGZhbHNlYFxuICogKFwidHJ1ZS1zaXppbmdcIikuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfGZhbHNlfSB3aWR0aCAgIFdpZHRoIHRvIGJlIHNldC5cbiAqIEBwYXJhbSB7TnVtYmVyfGZhbHNlfSBoZWlnaHQgIEhlaWdodCB0byBiZSBzZXQuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldFNpemUgPSBmdW5jdGlvbiBzZXRTaXplICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICB0aGlzLnNldFdpZHRoKHdpZHRoKTtcbiAgICB0aGlzLnNldEhlaWdodChoZWlnaHQpO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB3aWR0aCBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKiBSZW1vdmVzIGFueSBleHBsaWNpdCBzaXppbmcgY29uc3RyYWludHMgd2hlbiBwYXNzZWQgaW4gYGZhbHNlYFxuICogKFwidHJ1ZS1zaXppbmdcIikuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfGZhbHNlfSB3aWR0aCBXaWR0aCB0byBiZSBzZXQuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldFdpZHRoID0gZnVuY3Rpb24gc2V0V2lkdGgod2lkdGgpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcblxuICAgIHZhciBjb250ZW50V3JhcHBlciA9IHRoaXMuX3RhcmdldC5jb250ZW50O1xuXG4gICAgaWYgKHdpZHRoID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLl90YXJnZXQuZXhwbGljaXRXaWR0aCA9IHRydWU7XG4gICAgICAgIGlmIChjb250ZW50V3JhcHBlcikgY29udGVudFdyYXBwZXIuc3R5bGUud2lkdGggPSAnJztcbiAgICAgICAgd2lkdGggPSBjb250ZW50V3JhcHBlciA/IGNvbnRlbnRXcmFwcGVyLm9mZnNldFdpZHRoIDogMDtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl90YXJnZXQuZXhwbGljaXRXaWR0aCA9IGZhbHNlO1xuICAgICAgICBpZiAoY29udGVudFdyYXBwZXIpIGNvbnRlbnRXcmFwcGVyLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICB9XG5cbiAgICB0aGlzLl90YXJnZXQuc2l6ZVswXSA9IHdpZHRoO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBoZWlnaHQgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICogUmVtb3ZlcyBhbnkgZXhwbGljaXQgc2l6aW5nIGNvbnN0cmFpbnRzIHdoZW4gcGFzc2VkIGluIGBmYWxzZWBcbiAqIChcInRydWUtc2l6aW5nXCIpLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcnxmYWxzZX0gaGVpZ2h0IEhlaWdodCB0byBiZSBzZXQuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uIHNldEhlaWdodChoZWlnaHQpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcblxuICAgIHZhciBjb250ZW50V3JhcHBlciA9IHRoaXMuX3RhcmdldC5jb250ZW50O1xuXG4gICAgaWYgKGhlaWdodCA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0SGVpZ2h0ID0gdHJ1ZTtcbiAgICAgICAgaWYgKGNvbnRlbnRXcmFwcGVyKSBjb250ZW50V3JhcHBlci5zdHlsZS5oZWlnaHQgPSAnJztcbiAgICAgICAgaGVpZ2h0ID0gY29udGVudFdyYXBwZXIgPyBjb250ZW50V3JhcHBlci5vZmZzZXRIZWlnaHQgOiAwO1xuICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zdHlsZS5oZWlnaHQgPSBoZWlnaHQgKyAncHgnO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0SGVpZ2h0ID0gZmFsc2U7XG4gICAgICAgIGlmIChjb250ZW50V3JhcHBlcikgY29udGVudFdyYXBwZXIuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICB9XG5cbiAgICB0aGlzLl90YXJnZXQuc2l6ZVsxXSA9IGhlaWdodDtcbn07XG5cbi8qKlxuICogU2V0cyBhbiBhdHRyaWJ1dGUgb24gdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBBdHRyaWJ1dGUgbmFtZSAoZS5nLiBocmVmKVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIEF0dHJpYnV0ZSB2YWx1ZSAoZS5nLiBodHRwOi8vZmFtb3VzLm9yZylcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc2V0QXR0cmlidXRlID0gZnVuY3Rpb24gc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgYGlubmVySFRNTGAgY29udGVudCBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBjb250ZW50IENvbnRlbnQgdG8gYmUgc2V0IGFzIGBpbm5lckhUTUxgXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldENvbnRlbnQgPSBmdW5jdGlvbiBzZXRDb250ZW50KGNvbnRlbnQpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcbiAgICB0aGlzLmZpbmRDaGlsZHJlbigpO1xuXG4gICAgaWYgKCF0aGlzLl90YXJnZXQuY29udGVudCkge1xuICAgICAgICB0aGlzLl90YXJnZXQuY29udGVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICB0aGlzLl90YXJnZXQuY29udGVudC5jbGFzc0xpc3QuYWRkKCdmYW1vdXMtZG9tLWVsZW1lbnQtY29udGVudCcpO1xuICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5pbnNlcnRCZWZvcmUoXG4gICAgICAgICAgICB0aGlzLl90YXJnZXQuY29udGVudCxcbiAgICAgICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LmZpcnN0Q2hpbGRcbiAgICAgICAgKTtcbiAgICB9XG4gICAgdGhpcy5fdGFyZ2V0LmNvbnRlbnQuaW5uZXJIVE1MID0gY29udGVudDtcblxuICAgIHRoaXMuc2V0U2l6ZShcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0V2lkdGggPyBmYWxzZSA6IHRoaXMuX3RhcmdldC5zaXplWzBdLFxuICAgICAgICB0aGlzLl90YXJnZXQuZXhwbGljaXRIZWlnaHQgPyBmYWxzZSA6IHRoaXMuX3RhcmdldC5zaXplWzFdXG4gICAgKTtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBwYXNzZWQgaW4gdHJhbnNmb3JtIG1hdHJpeCAod29ybGQgc3BhY2UpLiBJbnZlcnRzIHRoZSBwYXJlbnQncyB3b3JsZFxuICogdHJhbnNmb3JtLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0Zsb2F0MzJBcnJheX0gdHJhbnNmb3JtIFRoZSB0cmFuc2Zvcm0gZm9yIHRoZSBsb2FkZWQgRE9NIEVsZW1lbnQgaW4gd29ybGQgc3BhY2VcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc2V0TWF0cml4ID0gZnVuY3Rpb24gc2V0TWF0cml4KHRyYW5zZm9ybSkge1xuICAgIC8vIFRPRE8gRG9uJ3QgbXVsdGlwbHkgbWF0cmljcyBpbiB0aGUgZmlyc3QgcGxhY2UuXG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5maW5kUGFyZW50KCk7XG4gICAgdmFyIHdvcmxkVHJhbnNmb3JtID0gdGhpcy5fdGFyZ2V0LndvcmxkVHJhbnNmb3JtO1xuICAgIHZhciBjaGFuZ2VkID0gZmFsc2U7XG5cbiAgICB2YXIgaTtcbiAgICB2YXIgbGVuO1xuXG4gICAgaWYgKHRyYW5zZm9ybSlcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gMTYgOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgICAgICBjaGFuZ2VkID0gY2hhbmdlZCA/IGNoYW5nZWQgOiB3b3JsZFRyYW5zZm9ybVtpXSA9PT0gdHJhbnNmb3JtW2ldO1xuICAgICAgICAgICAgd29ybGRUcmFuc2Zvcm1baV0gPSB0cmFuc2Zvcm1baV07XG4gICAgICAgIH1cbiAgICBlbHNlIGNoYW5nZWQgPSB0cnVlO1xuXG4gICAgaWYgKGNoYW5nZWQpIHtcbiAgICAgICAgbWF0aC5pbnZlcnQodGhpcy5fdGFyZ2V0LmludmVydGVkUGFyZW50LCB0aGlzLl9wYXJlbnQud29ybGRUcmFuc2Zvcm0pO1xuICAgICAgICBtYXRoLm11bHRpcGx5KHRoaXMuX3RhcmdldC5maW5hbFRyYW5zZm9ybSwgdGhpcy5fdGFyZ2V0LmludmVydGVkUGFyZW50LCB3b3JsZFRyYW5zZm9ybSk7XG5cbiAgICAgICAgLy8gVE9ETzogdGhpcyBpcyBhIHRlbXBvcmFyeSBmaXggZm9yIGRyYXcgY29tbWFuZHNcbiAgICAgICAgLy8gY29taW5nIGluIG91dCBvZiBvcmRlclxuICAgICAgICB2YXIgY2hpbGRyZW4gPSB0aGlzLmZpbmRDaGlsZHJlbihbXSk7XG4gICAgICAgIHZhciBwcmV2aW91c1BhdGggPSB0aGlzLl9wYXRoO1xuICAgICAgICB2YXIgcHJldmlvdXNUYXJnZXQgPSB0aGlzLl90YXJnZXQ7XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IGNoaWxkcmVuLmxlbmd0aCA7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuX3RhcmdldCA9IGNoaWxkcmVuW2ldO1xuICAgICAgICAgICAgdGhpcy5fcGF0aCA9IHRoaXMuX3RhcmdldC5wYXRoO1xuICAgICAgICAgICAgdGhpcy5zZXRNYXRyaXgoKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9wYXRoID0gcHJldmlvdXNQYXRoO1xuICAgICAgICB0aGlzLl90YXJnZXQgPSBwcmV2aW91c1RhcmdldDtcbiAgICB9XG5cbiAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zdHlsZVtUUkFOU0ZPUk1dID0gdGhpcy5fc3RyaW5naWZ5TWF0cml4KHRoaXMuX3RhcmdldC5maW5hbFRyYW5zZm9ybSk7XG59O1xuXG5cbi8qKlxuICogQWRkcyBhIGNsYXNzIHRvIHRoZSBjbGFzc0xpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGRvbUNsYXNzIENsYXNzIG5hbWUgdG8gYmUgYWRkZWQgdG8gdGhlIGN1cnJlbnQgdGFyZ2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5hZGRDbGFzcyA9IGZ1bmN0aW9uIGFkZENsYXNzKGRvbUNsYXNzKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuY2xhc3NMaXN0LmFkZChkb21DbGFzcyk7XG59O1xuXG5cbi8qKlxuICogUmVtb3ZlcyBhIGNsYXNzIGZyb20gdGhlIGNsYXNzTGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIGN1cnJlbnRseSBsb2FkZWRcbiAqIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGRvbUNsYXNzIENsYXNzIG5hbWUgdG8gYmUgcmVtb3ZlZCBmcm9tIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmVDbGFzcyA9IGZ1bmN0aW9uIHJlbW92ZUNsYXNzKGRvbUNsYXNzKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShkb21DbGFzcyk7XG59O1xuXG5cbi8qKlxuICogU3RyaW5naWZpZXMgdGhlIHBhc3NlZCBpbiBtYXRyaXggZm9yIHNldHRpbmcgdGhlIGB0cmFuc2Zvcm1gIHByb3BlcnR5LlxuICpcbiAqIEBtZXRob2QgIF9zdHJpbmdpZnlNYXRyaXhcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtBcnJheX0gbSAgICBNYXRyaXggYXMgYW4gYXJyYXkgb3IgYXJyYXktbGlrZSBvYmplY3QuXG4gKiBAcmV0dXJuIHtTdHJpbmd9ICAgICBTdHJpbmdpZmllZCBtYXRyaXggYXMgYG1hdHJpeDNkYC1wcm9wZXJ0eS5cbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9zdHJpbmdpZnlNYXRyaXggPSBmdW5jdGlvbiBfc3RyaW5naWZ5TWF0cml4KG0pIHtcbiAgICB2YXIgciA9ICdtYXRyaXgzZCgnO1xuXG4gICAgciArPSAobVswXSA8IDAuMDAwMDAxICYmIG1bMF0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMF0gKyAnLCc7XG4gICAgciArPSAobVsxXSA8IDAuMDAwMDAxICYmIG1bMV0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMV0gKyAnLCc7XG4gICAgciArPSAobVsyXSA8IDAuMDAwMDAxICYmIG1bMl0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMl0gKyAnLCc7XG4gICAgciArPSAobVszXSA8IDAuMDAwMDAxICYmIG1bM10gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bM10gKyAnLCc7XG4gICAgciArPSAobVs0XSA8IDAuMDAwMDAxICYmIG1bNF0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bNF0gKyAnLCc7XG4gICAgciArPSAobVs1XSA8IDAuMDAwMDAxICYmIG1bNV0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bNV0gKyAnLCc7XG4gICAgciArPSAobVs2XSA8IDAuMDAwMDAxICYmIG1bNl0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bNl0gKyAnLCc7XG4gICAgciArPSAobVs3XSA8IDAuMDAwMDAxICYmIG1bN10gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bN10gKyAnLCc7XG4gICAgciArPSAobVs4XSA8IDAuMDAwMDAxICYmIG1bOF0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bOF0gKyAnLCc7XG4gICAgciArPSAobVs5XSA8IDAuMDAwMDAxICYmIG1bOV0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bOV0gKyAnLCc7XG4gICAgciArPSAobVsxMF0gPCAwLjAwMDAwMSAmJiBtWzEwXSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVsxMF0gKyAnLCc7XG4gICAgciArPSAobVsxMV0gPCAwLjAwMDAwMSAmJiBtWzExXSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVsxMV0gKyAnLCc7XG4gICAgciArPSAobVsxMl0gPCAwLjAwMDAwMSAmJiBtWzEyXSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVsxMl0gKyAnLCc7XG4gICAgciArPSAobVsxM10gPCAwLjAwMDAwMSAmJiBtWzEzXSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVsxM10gKyAnLCc7XG4gICAgciArPSAobVsxNF0gPCAwLjAwMDAwMSAmJiBtWzE0XSA+IC0wLjAwMDAwMSkgPyAnMCwnIDogbVsxNF0gKyAnLCc7XG5cbiAgICByICs9IG1bMTVdICsgJyknO1xuICAgIHJldHVybiByO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBET01SZW5kZXJlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIFRyYW5zZm9ybSBpZGVudGl0eSBtYXRyaXguIFxudmFyIGlkZW50ID0gW1xuICAgIDEsIDAsIDAsIDAsXG4gICAgMCwgMSwgMCwgMCxcbiAgICAwLCAwLCAxLCAwLFxuICAgIDAsIDAsIDAsIDFcbl07XG5cbi8qKlxuICogRWxlbWVudENhY2hlIGlzIGJlaW5nIHVzZWQgZm9yIGtlZXBpbmcgdHJhY2sgb2YgYW4gZWxlbWVudCdzIERPTSBFbGVtZW50LFxuICogcGF0aCwgd29ybGQgdHJhbnNmb3JtLCBpbnZlcnRlZCBwYXJlbnQsIGZpbmFsIHRyYW5zZm9ybSAoYXMgYmVpbmcgdXNlZCBmb3JcbiAqIHNldHRpbmcgdGhlIGFjdHVhbCBgdHJhbnNmb3JtYC1wcm9wZXJ0eSkgYW5kIHBvc3QgcmVuZGVyIHNpemUgKGZpbmFsIHNpemUgYXNcbiAqIGJlaW5nIHJlbmRlcmVkIHRvIHRoZSBET00pLlxuICogXG4gKiBAY2xhc3MgRWxlbWVudENhY2hlXG4gKiAgXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgRE9NRWxlbWVudFxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGZvciB1bmlxdWVseSBpZGVudGlmeWluZyB0aGUgbG9jYXRpb24gaW4gdGhlIHNjZW5lIGdyYXBoLlxuICovIFxuZnVuY3Rpb24gRWxlbWVudENhY2hlIChlbGVtZW50LCBwYXRoKSB7XG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgIHRoaXMuY29udGVudCA9IG51bGw7XG4gICAgdGhpcy5zaXplID0gbmV3IEludDE2QXJyYXkoMyk7XG4gICAgdGhpcy5leHBsaWNpdEhlaWdodCA9IGZhbHNlO1xuICAgIHRoaXMuZXhwbGljaXRXaWR0aCA9IGZhbHNlO1xuICAgIHRoaXMud29ybGRUcmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KGlkZW50KTtcbiAgICB0aGlzLmludmVydGVkUGFyZW50ID0gbmV3IEZsb2F0MzJBcnJheShpZGVudCk7XG4gICAgdGhpcy5maW5hbFRyYW5zZm9ybSA9IG5ldyBGbG9hdDMyQXJyYXkoaWRlbnQpO1xuICAgIHRoaXMucG9zdFJlbmRlclNpemUgPSBuZXcgRmxvYXQzMkFycmF5KDIpO1xuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgdGhpcy5wcmV2ZW50RGVmYXVsdCA9IHt9O1xuICAgIHRoaXMuc3Vic2NyaWJlID0ge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudENhY2hlO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgbWV0aG9kIGZvciBpbnZlcnRpbmcgYSB0cmFuc2Zvcm0gbWF0cml4XG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IG91dCBhcnJheSB0byBzdG9yZSB0aGUgcmV0dXJuIG9mIHRoZSBpbnZlcnNpb25cbiAqIEBwYXJhbSB7QXJyYXl9IGEgdHJhbnNmb3JtIG1hdHJpeCB0byBpbnZlcnNlXG4gKlxuICogQHJldHVybiB7QXJyYXl9IG91dFxuICogICBvdXRwdXQgYXJyYXkgdGhhdCBpcyBzdG9yaW5nIHRoZSB0cmFuc2Zvcm0gbWF0cml4XG4gKi9cbmZ1bmN0aW9uIGludmVydCAob3V0LCBhKSB7XG4gICAgdmFyIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICAgICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV0sXG5cbiAgICAgICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxuICAgICAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXG4gICAgICAgIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCxcbiAgICAgICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxuICAgICAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXG4gICAgICAgIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMixcbiAgICAgICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxuICAgICAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXG4gICAgICAgIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCxcbiAgICAgICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxuICAgICAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXG4gICAgICAgIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMixcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG4gICAgICAgIGRldCA9IGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcblxuICAgIGlmICghZGV0KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBkZXQgPSAxLjAgLyBkZXQ7XG5cbiAgICBvdXRbMF0gPSAoYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5KSAqIGRldDtcbiAgICBvdXRbMV0gPSAoYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5KSAqIGRldDtcbiAgICBvdXRbMl0gPSAoYTMxICogYjA1IC0gYTMyICogYjA0ICsgYTMzICogYjAzKSAqIGRldDtcbiAgICBvdXRbM10gPSAoYTIyICogYjA0IC0gYTIxICogYjA1IC0gYTIzICogYjAzKSAqIGRldDtcbiAgICBvdXRbNF0gPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcbiAgICBvdXRbNV0gPSAoYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3KSAqIGRldDtcbiAgICBvdXRbNl0gPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDtcbiAgICBvdXRbN10gPSAoYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxKSAqIGRldDtcbiAgICBvdXRbOF0gPSAoYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2KSAqIGRldDtcbiAgICBvdXRbOV0gPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDtcbiAgICBvdXRbMTBdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XG4gICAgb3V0WzExXSA9IChhMjEgKiBiMDIgLSBhMjAgKiBiMDQgLSBhMjMgKiBiMDApICogZGV0O1xuICAgIG91dFsxMl0gPSAoYTExICogYjA3IC0gYTEwICogYjA5IC0gYTEyICogYjA2KSAqIGRldDtcbiAgICBvdXRbMTNdID0gKGEwMCAqIGIwOSAtIGEwMSAqIGIwNyArIGEwMiAqIGIwNikgKiBkZXQ7XG4gICAgb3V0WzE0XSA9IChhMzEgKiBiMDEgLSBhMzAgKiBiMDMgLSBhMzIgKiBiMDApICogZGV0O1xuICAgIG91dFsxNV0gPSAoYTIwICogYjAzIC0gYTIxICogYjAxICsgYTIyICogYjAwKSAqIGRldDtcblxuICAgIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuICogQSBtZXRob2QgZm9yIG11bHRpcGx5aW5nIHR3byBtYXRyaWNpZXNcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gb3V0IGFycmF5IHRvIHN0b3JlIHRoZSByZXR1cm4gb2YgdGhlIG11bHRpcGxpY2F0aW9uXG4gKiBAcGFyYW0ge0FycmF5fSBhIHRyYW5zZm9ybSBtYXRyaXggdG8gbXVsdGlwbHlcbiAqIEBwYXJhbSB7QXJyYXl9IGIgdHJhbnNmb3JtIG1hdHJpeCB0byBtdWx0aXBseVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBvdXRcbiAqICAgb3V0cHV0IGFycmF5IHRoYXQgaXMgc3RvcmluZyB0aGUgdHJhbnNmb3JtIG1hdHJpeFxuICovXG5mdW5jdGlvbiBtdWx0aXBseSAob3V0LCBhLCBiKSB7XG4gICAgdmFyIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICAgICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV0sXG5cbiAgICAgICAgYjAgPSBiWzBdLCBiMSA9IGJbMV0sIGIyID0gYlsyXSwgYjMgPSBiWzNdLFxuICAgICAgICBiNCA9IGJbNF0sIGI1ID0gYls1XSwgYjYgPSBiWzZdLCBiNyA9IGJbN10sXG4gICAgICAgIGI4ID0gYls4XSwgYjkgPSBiWzldLCBiMTAgPSBiWzEwXSwgYjExID0gYlsxMV0sXG4gICAgICAgIGIxMiA9IGJbMTJdLCBiMTMgPSBiWzEzXSwgYjE0ID0gYlsxNF0sIGIxNSA9IGJbMTVdO1xuXG4gICAgdmFyIGNoYW5nZWQgPSBmYWxzZTtcbiAgICB2YXIgb3V0MCwgb3V0MSwgb3V0Miwgb3V0MztcblxuICAgIG91dDAgPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0MSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBvdXQyID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIG91dDMgPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG5cbiAgICBjaGFuZ2VkID0gY2hhbmdlZCA/XG4gICAgICAgICAgICAgIGNoYW5nZWQgOiBvdXQwID09PSBvdXRbMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDEgPT09IG91dFsxXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MiA9PT0gb3V0WzJdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQzID09PSBvdXRbM107XG5cbiAgICBvdXRbMF0gPSBvdXQwO1xuICAgIG91dFsxXSA9IG91dDE7XG4gICAgb3V0WzJdID0gb3V0MjtcbiAgICBvdXRbM10gPSBvdXQzO1xuXG4gICAgYjAgPSBiNDsgYjEgPSBiNTsgYjIgPSBiNjsgYjMgPSBiNztcbiAgICBvdXQwID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dDEgPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0MiA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXQzID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgY2hhbmdlZCA9IGNoYW5nZWQgP1xuICAgICAgICAgICAgICBjaGFuZ2VkIDogb3V0MCA9PT0gb3V0WzRdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQxID09PSBvdXRbNV0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDIgPT09IG91dFs2XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MyA9PT0gb3V0WzddO1xuXG4gICAgb3V0WzRdID0gb3V0MDtcbiAgICBvdXRbNV0gPSBvdXQxO1xuICAgIG91dFs2XSA9IG91dDI7XG4gICAgb3V0WzddID0gb3V0MztcblxuICAgIGIwID0gYjg7IGIxID0gYjk7IGIyID0gYjEwOyBiMyA9IGIxMTtcbiAgICBvdXQwID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dDEgPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0MiA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXQzID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgY2hhbmdlZCA9IGNoYW5nZWQgP1xuICAgICAgICAgICAgICBjaGFuZ2VkIDogb3V0MCA9PT0gb3V0WzhdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQxID09PSBvdXRbOV0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDIgPT09IG91dFsxMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDMgPT09IG91dFsxMV07XG5cbiAgICBvdXRbOF0gPSBvdXQwO1xuICAgIG91dFs5XSA9IG91dDE7XG4gICAgb3V0WzEwXSA9IG91dDI7XG4gICAgb3V0WzExXSA9IG91dDM7XG5cbiAgICBiMCA9IGIxMjsgYjEgPSBiMTM7IGIyID0gYjE0OyBiMyA9IGIxNTtcbiAgICBvdXQwID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dDEgPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0MiA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXQzID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgY2hhbmdlZCA9IGNoYW5nZWQgP1xuICAgICAgICAgICAgICBjaGFuZ2VkIDogb3V0MCA9PT0gb3V0WzEyXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MSA9PT0gb3V0WzEzXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MiA9PT0gb3V0WzE0XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MyA9PT0gb3V0WzE1XTtcblxuICAgIG91dFsxMl0gPSBvdXQwO1xuICAgIG91dFsxM10gPSBvdXQxO1xuICAgIG91dFsxNF0gPSBvdXQyO1xuICAgIG91dFsxNV0gPSBvdXQzO1xuXG4gICAgcmV0dXJuIG91dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbXVsdGlwbHk6IG11bHRpcGx5LFxuICAgIGludmVydDogaW52ZXJ0XG59O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNldmVudHMtY29tcG9zaXRpb25ldmVudHMpLlxuICpcbiAqIEBjbGFzcyBDb21wb3NpdGlvbkV2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBDb21wb3NpdGlvbkV2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlQXJnLCBvcHRpb25hbCBDb21wb3NpdGlvbkV2ZW50SW5pdCBjb21wb3NpdGlvbkV2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBDb21wb3NpdGlvbkV2ZW50IDogVUlFdmVudCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBET01TdHJpbmcgZGF0YTtcbiAgICAvLyB9O1xuXG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIENvbXBvc2l0aW9uRXZlbnQjZGF0YVxuICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAqL1xuICAgIHRoaXMuZGF0YSA9IGV2LmRhdGE7XG59XG5cbkNvbXBvc2l0aW9uRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShVSUV2ZW50LnByb3RvdHlwZSk7XG5Db21wb3NpdGlvbkV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IENvbXBvc2l0aW9uRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5Db21wb3NpdGlvbkV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ0NvbXBvc2l0aW9uRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21wb3NpdGlvbkV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBFdmVudCBjbGFzcyBpcyBiZWluZyB1c2VkIGluIG9yZGVyIHRvIG5vcm1hbGl6ZSBuYXRpdmUgRE9NIGV2ZW50cy5cbiAqIEV2ZW50cyBuZWVkIHRvIGJlIG5vcm1hbGl6ZWQgaW4gb3JkZXIgdG8gYmUgc2VyaWFsaXplZCB0aHJvdWdoIHRoZSBzdHJ1Y3R1cmVkXG4gKiBjbG9uaW5nIGFsZ29yaXRobSB1c2VkIGJ5IHRoZSBgcG9zdE1lc3NhZ2VgIG1ldGhvZCAoV2ViIFdvcmtlcnMpLlxuICpcbiAqIFdyYXBwaW5nIERPTSBldmVudHMgYWxzbyBoYXMgdGhlIGFkdmFudGFnZSBvZiBwcm92aWRpbmcgYSBjb25zaXN0ZW50XG4gKiBpbnRlcmZhY2UgZm9yIGludGVyYWN0aW5nIHdpdGggRE9NIGV2ZW50cyBhY3Jvc3MgYnJvd3NlcnMgYnkgY29weWluZyBvdmVyIGFcbiAqIHN1YnNldCBvZiB0aGUgZXhwb3NlZCBwcm9wZXJ0aWVzIHRoYXQgaXMgZ3VhcmFudGVlZCB0byBiZSBjb25zaXN0ZW50IGFjcm9zc1xuICogYnJvd3NlcnMuXG4gKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgvI2ludGVyZmFjZS1FdmVudCkuXG4gKlxuICogQGNsYXNzIEV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIEV2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlLCBvcHRpb25hbCBFdmVudEluaXQgZXZlbnRJbml0RGljdCksXG4gICAgLy8gIEV4cG9zZWQ9V2luZG93LFdvcmtlcl1cbiAgICAvLyBpbnRlcmZhY2UgRXZlbnQge1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIERPTVN0cmluZyB0eXBlO1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIEV2ZW50VGFyZ2V0PyB0YXJnZXQ7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgRXZlbnRUYXJnZXQ/IGN1cnJlbnRUYXJnZXQ7XG5cbiAgICAvLyAgIGNvbnN0IHVuc2lnbmVkIHNob3J0IE5PTkUgPSAwO1xuICAgIC8vICAgY29uc3QgdW5zaWduZWQgc2hvcnQgQ0FQVFVSSU5HX1BIQVNFID0gMTtcbiAgICAvLyAgIGNvbnN0IHVuc2lnbmVkIHNob3J0IEFUX1RBUkdFVCA9IDI7XG4gICAgLy8gICBjb25zdCB1bnNpZ25lZCBzaG9ydCBCVUJCTElOR19QSEFTRSA9IDM7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgdW5zaWduZWQgc2hvcnQgZXZlbnRQaGFzZTtcblxuICAgIC8vICAgdm9pZCBzdG9wUHJvcGFnYXRpb24oKTtcbiAgICAvLyAgIHZvaWQgc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG5cbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBib29sZWFuIGJ1YmJsZXM7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgYm9vbGVhbiBjYW5jZWxhYmxlO1xuICAgIC8vICAgdm9pZCBwcmV2ZW50RGVmYXVsdCgpO1xuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIGJvb2xlYW4gZGVmYXVsdFByZXZlbnRlZDtcblxuICAgIC8vICAgW1VuZm9yZ2VhYmxlXSByZWFkb25seSBhdHRyaWJ1dGUgYm9vbGVhbiBpc1RydXN0ZWQ7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgRE9NVGltZVN0YW1wIHRpbWVTdGFtcDtcblxuICAgIC8vICAgdm9pZCBpbml0RXZlbnQoRE9NU3RyaW5nIHR5cGUsIGJvb2xlYW4gYnViYmxlcywgYm9vbGVhbiBjYW5jZWxhYmxlKTtcbiAgICAvLyB9O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgRXZlbnQjdHlwZVxuICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAqL1xuICAgIHRoaXMudHlwZSA9IGV2LnR5cGU7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBFdmVudCNkZWZhdWx0UHJldmVudGVkXG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuZGVmYXVsdFByZXZlbnRlZCA9IGV2LmRlZmF1bHRQcmV2ZW50ZWQ7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBFdmVudCN0aW1lU3RhbXBcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnRpbWVTdGFtcCA9IGV2LnRpbWVTdGFtcDtcblxuXG4gICAgLyoqXG4gICAgICogVXNlZCBmb3IgZXhwb3NpbmcgdGhlIGN1cnJlbnQgdGFyZ2V0J3MgdmFsdWUuXG4gICAgICpcbiAgICAgKiBAbmFtZSBFdmVudCN2YWx1ZVxuICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAqL1xuICAgIHZhciB0YXJnZXRDb25zdHJ1Y3RvciA9IGV2LnRhcmdldC5jb25zdHJ1Y3RvcjtcbiAgICAvLyBUT0RPIFN1cHBvcnQgSFRNTEtleWdlbkVsZW1lbnRcbiAgICBpZiAoXG4gICAgICAgIHRhcmdldENvbnN0cnVjdG9yID09PSBIVE1MSW5wdXRFbGVtZW50IHx8XG4gICAgICAgIHRhcmdldENvbnN0cnVjdG9yID09PSBIVE1MVGV4dEFyZWFFbGVtZW50IHx8XG4gICAgICAgIHRhcmdldENvbnN0cnVjdG9yID09PSBIVE1MU2VsZWN0RWxlbWVudFxuICAgICkge1xuICAgICAgICB0aGlzLnZhbHVlID0gZXYudGFyZ2V0LnZhbHVlO1xuICAgIH1cbn1cblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbkV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ0V2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBDb21wb3NpdGlvbkV2ZW50ID0gcmVxdWlyZSgnLi9Db21wb3NpdGlvbkV2ZW50Jyk7XG52YXIgRXZlbnQgPSByZXF1aXJlKCcuL0V2ZW50Jyk7XG52YXIgRm9jdXNFdmVudCA9IHJlcXVpcmUoJy4vRm9jdXNFdmVudCcpO1xudmFyIElucHV0RXZlbnQgPSByZXF1aXJlKCcuL0lucHV0RXZlbnQnKTtcbnZhciBLZXlib2FyZEV2ZW50ID0gcmVxdWlyZSgnLi9LZXlib2FyZEV2ZW50Jyk7XG52YXIgTW91c2VFdmVudCA9IHJlcXVpcmUoJy4vTW91c2VFdmVudCcpO1xudmFyIFRvdWNoRXZlbnQgPSByZXF1aXJlKCcuL1RvdWNoRXZlbnQnKTtcbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG52YXIgV2hlZWxFdmVudCA9IHJlcXVpcmUoJy4vV2hlZWxFdmVudCcpO1xuXG4vKipcbiAqIEEgbWFwcGluZyBvZiBET00gZXZlbnRzIHRvIHRoZSBjb3JyZXNwb25kaW5nIGhhbmRsZXJzXG4gKlxuICogQG5hbWUgRXZlbnRNYXBcbiAqIEB0eXBlIE9iamVjdFxuICovXG52YXIgRXZlbnRNYXAgPSB7XG4gICAgY2hhbmdlICAgICAgICAgICAgICAgICAgICAgICAgIDogW0V2ZW50LCB0cnVlXSxcbiAgICBzdWJtaXQgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIHRydWVdLFxuXG4gICAgLy8gVUkgRXZlbnRzIChodHRwOi8vd3d3LnczLm9yZy9UUi91aWV2ZW50cy8pXG4gICAgYWJvcnQgICAgICAgICAgICAgICAgICAgICAgICAgIDogW0V2ZW50LCBmYWxzZV0sXG4gICAgYmVmb3JlaW5wdXQgICAgICAgICAgICAgICAgICAgIDogW0lucHV0RXZlbnQsIHRydWVdLFxuICAgIGJsdXIgICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtGb2N1c0V2ZW50LCBmYWxzZV0sXG4gICAgY2xpY2sgICAgICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIHRydWVdLFxuICAgIGNvbXBvc2l0aW9uZW5kICAgICAgICAgICAgICAgICA6IFtDb21wb3NpdGlvbkV2ZW50LCB0cnVlXSxcbiAgICBjb21wb3NpdGlvbnN0YXJ0ICAgICAgICAgICAgICAgOiBbQ29tcG9zaXRpb25FdmVudCwgdHJ1ZV0sXG4gICAgY29tcG9zaXRpb251cGRhdGUgICAgICAgICAgICAgIDogW0NvbXBvc2l0aW9uRXZlbnQsIHRydWVdLFxuICAgIGRibGNsaWNrICAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICBmb2N1cyAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRm9jdXNFdmVudCwgZmFsc2VdLFxuICAgIGZvY3VzaW4gICAgICAgICAgICAgICAgICAgICAgICA6IFtGb2N1c0V2ZW50LCB0cnVlXSxcbiAgICBmb2N1c291dCAgICAgICAgICAgICAgICAgICAgICAgOiBbRm9jdXNFdmVudCwgdHJ1ZV0sXG4gICAgaW5wdXQgICAgICAgICAgICAgICAgICAgICAgICAgIDogW0lucHV0RXZlbnQsIHRydWVdLFxuICAgIGtleWRvd24gICAgICAgICAgICAgICAgICAgICAgICA6IFtLZXlib2FyZEV2ZW50LCB0cnVlXSxcbiAgICBrZXl1cCAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbS2V5Ym9hcmRFdmVudCwgdHJ1ZV0sXG4gICAgbG9hZCAgICAgICAgICAgICAgICAgICAgICAgICAgIDogW0V2ZW50LCBmYWxzZV0sXG4gICAgbW91c2Vkb3duICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIHRydWVdLFxuICAgIG1vdXNlZW50ZXIgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCBmYWxzZV0sXG4gICAgbW91c2VsZWF2ZSAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIGZhbHNlXSxcblxuICAgIC8vIGJ1YmJsZXMsIGJ1dCB3aWxsIGJlIHRyaWdnZXJlZCB2ZXJ5IGZyZXF1ZW50bHlcbiAgICBtb3VzZW1vdmUgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgZmFsc2VdLFxuXG4gICAgbW91c2VvdXQgICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIHRydWVdLFxuICAgIG1vdXNlb3ZlciAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICBtb3VzZXVwICAgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgcmVzaXplICAgICAgICAgICAgICAgICAgICAgICAgIDogW1VJRXZlbnQsIGZhbHNlXSxcblxuICAgIC8vIG1pZ2h0IGJ1YmJsZVxuICAgIHNjcm9sbCAgICAgICAgICAgICAgICAgICAgICAgICA6IFtVSUV2ZW50LCBmYWxzZV0sXG5cbiAgICBzZWxlY3QgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIHRydWVdLFxuICAgIHVubG9hZCAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgZmFsc2VdLFxuICAgIHdoZWVsICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtXaGVlbEV2ZW50LCB0cnVlXSxcblxuICAgIC8vIFRvdWNoIEV2ZW50cyBFeHRlbnNpb24gKGh0dHA6Ly93d3cudzMub3JnL1RSL3RvdWNoLWV2ZW50cy1leHRlbnNpb25zLylcbiAgICB0b3VjaGNhbmNlbCAgICAgICAgICAgICAgICAgICAgOiBbVG91Y2hFdmVudCwgdHJ1ZV0sXG4gICAgdG91Y2hlbmQgICAgICAgICAgICAgICAgICAgICAgIDogW1RvdWNoRXZlbnQsIHRydWVdLFxuICAgIHRvdWNobW92ZSAgICAgICAgICAgICAgICAgICAgICA6IFtUb3VjaEV2ZW50LCB0cnVlXSxcbiAgICB0b3VjaHN0YXJ0ICAgICAgICAgICAgICAgICAgICAgOiBbVG91Y2hFdmVudCwgdHJ1ZV1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRNYXA7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgvI2V2ZW50cy1mb2N1c2V2ZW50KS5cbiAqXG4gKiBAY2xhc3MgRm9jdXNFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gRm9jdXNFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgRm9jdXNFdmVudEluaXQgZm9jdXNFdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgRm9jdXNFdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRXZlbnRUYXJnZXQ/IHJlbGF0ZWRUYXJnZXQ7XG4gICAgLy8gfTtcblxuICAgIFVJRXZlbnQuY2FsbCh0aGlzLCBldik7XG59XG5cbkZvY3VzRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShVSUV2ZW50LnByb3RvdHlwZSk7XG5Gb2N1c0V2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZvY3VzRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5Gb2N1c0V2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ0ZvY3VzRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGb2N1c0V2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbSW5wdXQgRXZlbnRzXShodHRwOi8vdzNjLmdpdGh1Yi5pby9lZGl0aW5nLWV4cGxhaW5lci9pbnB1dC1ldmVudHMuaHRtbCNpZGwtZGVmLUlucHV0RXZlbnQpLlxuICpcbiAqIEBjbGFzcyBJbnB1dEV2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBJbnB1dEV2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlQXJnLCBvcHRpb25hbCBJbnB1dEV2ZW50SW5pdCBpbnB1dEV2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBJbnB1dEV2ZW50IDogVUlFdmVudCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBET01TdHJpbmcgaW5wdXRUeXBlO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRE9NU3RyaW5nIGRhdGE7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgaXNDb21wb3Npbmc7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBSYW5nZSAgICAgdGFyZ2V0UmFuZ2U7XG4gICAgLy8gfTtcblxuICAgIFVJRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSAgICBJbnB1dEV2ZW50I2lucHV0VHlwZVxuICAgICAqIEB0eXBlICAgIFN0cmluZ1xuICAgICAqL1xuICAgIHRoaXMuaW5wdXRUeXBlID0gZXYuaW5wdXRUeXBlO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgICAgSW5wdXRFdmVudCNkYXRhXG4gICAgICogQHR5cGUgICAgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy5kYXRhID0gZXYuZGF0YTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lICAgIElucHV0RXZlbnQjaXNDb21wb3NpbmdcbiAgICAgKiBAdHlwZSAgICBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5pc0NvbXBvc2luZyA9IGV2LmlzQ29tcG9zaW5nO1xuXG4gICAgLyoqXG4gICAgICogKipMaW1pdGVkIGJyb3dzZXIgc3VwcG9ydCoqLlxuICAgICAqXG4gICAgICogQG5hbWUgICAgSW5wdXRFdmVudCN0YXJnZXRSYW5nZVxuICAgICAqIEB0eXBlICAgIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLnRhcmdldFJhbmdlID0gZXYudGFyZ2V0UmFuZ2U7XG59XG5cbklucHV0RXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShVSUV2ZW50LnByb3RvdHlwZSk7XG5JbnB1dEV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IElucHV0RXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5JbnB1dEV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ0lucHV0RXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnB1dEV2ZW50O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVUlFdmVudCA9IHJlcXVpcmUoJy4vVUlFdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4LyNldmVudHMta2V5Ym9hcmRldmVudHMpLlxuICpcbiAqIEBjbGFzcyBLZXlib2FyZEV2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBLZXlib2FyZEV2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlQXJnLCBvcHRpb25hbCBLZXlib2FyZEV2ZW50SW5pdCBrZXlib2FyZEV2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBLZXlib2FyZEV2ZW50IDogVUlFdmVudCB7XG4gICAgLy8gICAgIC8vIEtleUxvY2F0aW9uQ29kZVxuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9LRVlfTE9DQVRJT05fU1RBTkRBUkQgPSAweDAwO1xuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9LRVlfTE9DQVRJT05fTEVGVCA9IDB4MDE7XG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0tFWV9MT0NBVElPTl9SSUdIVCA9IDB4MDI7XG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0tFWV9MT0NBVElPTl9OVU1QQUQgPSAweDAzO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRE9NU3RyaW5nICAgICBrZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBET01TdHJpbmcgICAgIGNvZGU7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSB1bnNpZ25lZCBsb25nIGxvY2F0aW9uO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICBjdHJsS2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICBzaGlmdEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgYWx0S2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICBtZXRhS2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICByZXBlYXQ7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIGlzQ29tcG9zaW5nO1xuICAgIC8vICAgICBib29sZWFuIGdldE1vZGlmaWVyU3RhdGUgKERPTVN0cmluZyBrZXlBcmcpO1xuICAgIC8vIH07XG5cbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNET01fS0VZX0xPQ0FUSU9OX1NUQU5EQVJEXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5ET01fS0VZX0xPQ0FUSU9OX1NUQU5EQVJEID0gMHgwMDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjRE9NX0tFWV9MT0NBVElPTl9MRUZUXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5ET01fS0VZX0xPQ0FUSU9OX0xFRlQgPSAweDAxO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNET01fS0VZX0xPQ0FUSU9OX1JJR0hUXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5ET01fS0VZX0xPQ0FUSU9OX1JJR0hUID0gMHgwMjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjRE9NX0tFWV9MT0NBVElPTl9OVU1QQURcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9LRVlfTE9DQVRJT05fTlVNUEFEID0gMHgwMztcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQja2V5XG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy5rZXkgPSBldi5rZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2NvZGVcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLmNvZGUgPSBldi5jb2RlO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNsb2NhdGlvblxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMubG9jYXRpb24gPSBldi5sb2NhdGlvbjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjY3RybEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmN0cmxLZXkgPSBldi5jdHJsS2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNzaGlmdEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLnNoaWZ0S2V5ID0gZXYuc2hpZnRLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2FsdEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmFsdEtleSA9IGV2LmFsdEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjbWV0YUtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLm1ldGFLZXkgPSBldi5tZXRhS2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNyZXBlYXRcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5yZXBlYXQgPSBldi5yZXBlYXQ7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2lzQ29tcG9zaW5nXG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuaXNDb21wb3NpbmcgPSBldi5pc0NvbXBvc2luZztcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQja2V5Q29kZVxuICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAqIEBkZXByZWNhdGVkXG4gICAgICovXG4gICAgdGhpcy5rZXlDb2RlID0gZXYua2V5Q29kZTtcbn1cblxuS2V5Ym9hcmRFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVJRXZlbnQucHJvdG90eXBlKTtcbktleWJvYXJkRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gS2V5Ym9hcmRFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbktleWJvYXJkRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnS2V5Ym9hcmRFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEtleWJvYXJkRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgvI2V2ZW50cy1tb3VzZWV2ZW50cykuXG4gKlxuICogQGNsYXNzIEtleWJvYXJkRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIE1vdXNlRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIE1vdXNlRXZlbnRJbml0IG1vdXNlRXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIE1vdXNlRXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGxvbmcgICAgICAgICAgIHNjcmVlblg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgICAgICAgICBzY3JlZW5ZO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICAgICAgICAgY2xpZW50WDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGxvbmcgICAgICAgICAgIGNsaWVudFk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgICBjdHJsS2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICAgc2hpZnRLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgICBhbHRLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgICBtZXRhS2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgc2hvcnQgICAgICAgICAgYnV0dG9uO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRXZlbnRUYXJnZXQ/ICAgcmVsYXRlZFRhcmdldDtcbiAgICAvLyAgICAgLy8gSW50cm9kdWNlZCBpbiB0aGlzIHNwZWNpZmljYXRpb25cbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIHVuc2lnbmVkIHNob3J0IGJ1dHRvbnM7XG4gICAgLy8gICAgIGJvb2xlYW4gZ2V0TW9kaWZpZXJTdGF0ZSAoRE9NU3RyaW5nIGtleUFyZyk7XG4gICAgLy8gfTtcblxuICAgIFVJRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I3NjcmVlblhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnNjcmVlblggPSBldi5zY3JlZW5YO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNzY3JlZW5ZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5zY3JlZW5ZID0gZXYuc2NyZWVuWTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjY2xpZW50WFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuY2xpZW50WCA9IGV2LmNsaWVudFg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I2NsaWVudFlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmNsaWVudFkgPSBldi5jbGllbnRZO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNjdHJsS2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuY3RybEtleSA9IGV2LmN0cmxLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I3NoaWZ0S2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuc2hpZnRLZXkgPSBldi5zaGlmdEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjYWx0S2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuYWx0S2V5ID0gZXYuYWx0S2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNtZXRhS2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMubWV0YUtleSA9IGV2Lm1ldGFLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I2J1dHRvblxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuYnV0dG9uID0gZXYuYnV0dG9uO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNidXR0b25zXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5idXR0b25zID0gZXYuYnV0dG9ucztcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjcGFnZVhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnBhZ2VYID0gZXYucGFnZVg7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I3BhZ2VZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5wYWdlWSA9IGV2LnBhZ2VZO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCN4XG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy54ID0gZXYueDtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjeVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMueSA9IGV2Lnk7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I29mZnNldFhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLm9mZnNldFggPSBldi5vZmZzZXRYO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNvZmZzZXRZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5vZmZzZXRZID0gZXYub2Zmc2V0WTtcbn1cblxuTW91c2VFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVJRXZlbnQucHJvdG90eXBlKTtcbk1vdXNlRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gTW91c2VFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbk1vdXNlRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnTW91c2VFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG5cbnZhciBFTVBUWV9BUlJBWSA9IFtdO1xuXG4vKipcbiAqIFNlZSBbVG91Y2ggSW50ZXJmYWNlXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDEzL1JFQy10b3VjaC1ldmVudHMtMjAxMzEwMTAvI3RvdWNoLWludGVyZmFjZSkuXG4gKlxuICogQGNsYXNzIFRvdWNoXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSB7VG91Y2h9IHRvdWNoIFRoZSBuYXRpdmUgVG91Y2ggb2JqZWN0LlxuICovXG5mdW5jdGlvbiBUb3VjaCh0b3VjaCkge1xuICAgIC8vIGludGVyZmFjZSBUb3VjaCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgICAgICBpZGVudGlmaWVyO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgRXZlbnRUYXJnZXQgdGFyZ2V0O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgc2NyZWVuWDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIHNjcmVlblk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBjbGllbnRYO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgY2xpZW50WTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIHBhZ2VYO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgcGFnZVk7XG4gICAgLy8gfTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI2lkZW50aWZpZXJcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmlkZW50aWZpZXIgPSB0b3VjaC5pZGVudGlmaWVyO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjc2NyZWVuWFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuc2NyZWVuWCA9IHRvdWNoLnNjcmVlblg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNzY3JlZW5ZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5zY3JlZW5ZID0gdG91Y2guc2NyZWVuWTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI2NsaWVudFhcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmNsaWVudFggPSB0b3VjaC5jbGllbnRYO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjY2xpZW50WVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuY2xpZW50WSA9IHRvdWNoLmNsaWVudFk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNwYWdlWFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMucGFnZVggPSB0b3VjaC5wYWdlWDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI3BhZ2VZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5wYWdlWSA9IHRvdWNoLnBhZ2VZO1xufVxuXG5cbi8qKlxuICogTm9ybWFsaXplcyB0aGUgYnJvd3NlcidzIG5hdGl2ZSBUb3VjaExpc3QgYnkgY29udmVydGluZyBpdCBpbnRvIGFuIGFycmF5IG9mXG4gKiBub3JtYWxpemVkIFRvdWNoIG9iamVjdHMuXG4gKlxuICogQG1ldGhvZCAgY2xvbmVUb3VjaExpc3RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7VG91Y2hMaXN0fSB0b3VjaExpc3QgICAgVGhlIG5hdGl2ZSBUb3VjaExpc3QgYXJyYXkuXG4gKiBAcmV0dXJuIHtBcnJheS48VG91Y2g+fSAgICAgICAgICBBbiBhcnJheSBvZiBub3JtYWxpemVkIFRvdWNoIG9iamVjdHMuXG4gKi9cbmZ1bmN0aW9uIGNsb25lVG91Y2hMaXN0KHRvdWNoTGlzdCkge1xuICAgIGlmICghdG91Y2hMaXN0KSByZXR1cm4gRU1QVFlfQVJSQVk7XG4gICAgLy8gaW50ZXJmYWNlIFRvdWNoTGlzdCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSB1bnNpZ25lZCBsb25nIGxlbmd0aDtcbiAgICAvLyAgICAgZ2V0dGVyIFRvdWNoPyBpdGVtICh1bnNpZ25lZCBsb25nIGluZGV4KTtcbiAgICAvLyB9O1xuXG4gICAgdmFyIHRvdWNoTGlzdEFycmF5ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0b3VjaExpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdG91Y2hMaXN0QXJyYXlbaV0gPSBuZXcgVG91Y2godG91Y2hMaXN0W2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHRvdWNoTGlzdEFycmF5O1xufVxuXG4vKipcbiAqIFNlZSBbVG91Y2ggRXZlbnQgSW50ZXJmYWNlXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDEzL1JFQy10b3VjaC1ldmVudHMtMjAxMzEwMTAvI3RvdWNoZXZlbnQtaW50ZXJmYWNlKS5cbiAqXG4gKiBAY2xhc3MgVG91Y2hFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gVG91Y2hFdmVudChldikge1xuICAgIC8vIGludGVyZmFjZSBUb3VjaEV2ZW50IDogVUlFdmVudCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBUb3VjaExpc3QgdG91Y2hlcztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIFRvdWNoTGlzdCB0YXJnZXRUb3VjaGVzO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgVG91Y2hMaXN0IGNoYW5nZWRUb3VjaGVzO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgIGFsdEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICBtZXRhS2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgIGN0cmxLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgc2hpZnRLZXk7XG4gICAgLy8gfTtcbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCN0b3VjaGVzXG4gICAgICogQHR5cGUgQXJyYXkuPFRvdWNoPlxuICAgICAqL1xuICAgIHRoaXMudG91Y2hlcyA9IGNsb25lVG91Y2hMaXN0KGV2LnRvdWNoZXMpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCN0YXJnZXRUb3VjaGVzXG4gICAgICogQHR5cGUgQXJyYXkuPFRvdWNoPlxuICAgICAqL1xuICAgIHRoaXMudGFyZ2V0VG91Y2hlcyA9IGNsb25lVG91Y2hMaXN0KGV2LnRhcmdldFRvdWNoZXMpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCNjaGFuZ2VkVG91Y2hlc1xuICAgICAqIEB0eXBlIFRvdWNoTGlzdFxuICAgICAqL1xuICAgIHRoaXMuY2hhbmdlZFRvdWNoZXMgPSBjbG9uZVRvdWNoTGlzdChldi5jaGFuZ2VkVG91Y2hlcyk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I2FsdEtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmFsdEtleSA9IGV2LmFsdEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjbWV0YUtleVxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLm1ldGFLZXkgPSBldi5tZXRhS2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCNjdHJsS2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuY3RybEtleSA9IGV2LmN0cmxLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I3NoaWZ0S2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuc2hpZnRLZXkgPSBldi5zaGlmdEtleTtcbn1cblxuVG91Y2hFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVJRXZlbnQucHJvdG90eXBlKTtcblRvdWNoRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVG91Y2hFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cblRvdWNoRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnVG91Y2hFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRvdWNoRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudCA9IHJlcXVpcmUoJy4vRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOCkuXG4gKlxuICogQGNsYXNzIFVJRXZlbnRcbiAqIEBhdWdtZW50cyBFdmVudFxuICpcbiAqIEBwYXJhbSAge0V2ZW50fSBldiAgIFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBVSUV2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlLCBvcHRpb25hbCBVSUV2ZW50SW5pdCBldmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgVUlFdmVudCA6IEV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIFdpbmRvdz8gdmlldztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGxvbmcgICAgZGV0YWlsO1xuICAgIC8vIH07XG4gICAgRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBVSUV2ZW50I2RldGFpbFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuZGV0YWlsID0gZXYuZGV0YWlsO1xufVxuXG5VSUV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnQucHJvdG90eXBlKTtcblVJRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gVUlFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cblVJRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnVUlFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFVJRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBNb3VzZUV2ZW50ID0gcmVxdWlyZSgnLi9Nb3VzZUV2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgvI2V2ZW50cy13aGVlbGV2ZW50cykuXG4gKlxuICogQGNsYXNzIFdoZWVsRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIFdoZWVsRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIFdoZWVsRXZlbnRJbml0IHdoZWVsRXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIFdoZWVsRXZlbnQgOiBNb3VzZUV2ZW50IHtcbiAgICAvLyAgICAgLy8gRGVsdGFNb2RlQ29kZVxuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9ERUxUQV9QSVhFTCA9IDB4MDA7XG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0RFTFRBX0xJTkUgPSAweDAxO1xuICAgIC8vICAgICBjb25zdCB1bnNpZ25lZCBsb25nIERPTV9ERUxUQV9QQUdFID0gMHgwMjtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgICAgZGVsdGFYO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgICBkZWx0YVk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICAgIGRlbHRhWjtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIHVuc2lnbmVkIGxvbmcgZGVsdGFNb2RlO1xuICAgIC8vIH07XG5cbiAgICBNb3VzZUV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNET01fREVMVEFfUElYRUxcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9ERUxUQV9QSVhFTCA9IDB4MDA7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I0RPTV9ERUxUQV9MSU5FXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5ET01fREVMVEFfTElORSA9IDB4MDE7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I0RPTV9ERUxUQV9QQUdFXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5ET01fREVMVEFfUEFHRSA9IDB4MDI7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I2RlbHRhWFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuZGVsdGFYID0gZXYuZGVsdGFYO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNkZWx0YVlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmRlbHRhWSA9IGV2LmRlbHRhWTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjZGVsdGFaXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5kZWx0YVogPSBldi5kZWx0YVo7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I2RlbHRhTW9kZVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuZGVsdGFNb2RlID0gZXYuZGVsdGFNb2RlO1xufVxuXG5XaGVlbEV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTW91c2VFdmVudC5wcm90b3R5cGUpO1xuV2hlZWxFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBXaGVlbEV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuV2hlZWxFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdXaGVlbEV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gV2hlZWxFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBBIHR3by1kaW1lbnNpb25hbCB2ZWN0b3IuXG4gKlxuICogQGNsYXNzIFZlYzJcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBUaGUgeCBjb21wb25lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0geSBUaGUgeSBjb21wb25lbnQuXG4gKi9cbnZhciBWZWMyID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIGlmICh4IGluc3RhbmNlb2YgQXJyYXkgfHwgeCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xuICAgICAgICB0aGlzLnggPSB4WzBdIHx8IDA7XG4gICAgICAgIHRoaXMueSA9IHhbMV0gfHwgMDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMueCA9IHggfHwgMDtcbiAgICAgICAgdGhpcy55ID0geSB8fCAwO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0IHRoZSBjb21wb25lbnRzIG9mIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4IFRoZSB4IGNvbXBvbmVudC5cbiAqIEBwYXJhbSB7TnVtYmVyfSB5IFRoZSB5IGNvbXBvbmVudC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uIHNldCh4LCB5KSB7XG4gICAgaWYgKHggIT0gbnVsbCkgdGhpcy54ID0geDtcbiAgICBpZiAoeSAhPSBudWxsKSB0aGlzLnkgPSB5O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGQgdGhlIGlucHV0IHYgdG8gdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2IFRoZSBWZWMyIHRvIGFkZC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIGFkZCh2KSB7XG4gICAgdGhpcy54ICs9IHYueDtcbiAgICB0aGlzLnkgKz0gdi55O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTdWJ0cmFjdCB0aGUgaW5wdXQgdiBmcm9tIHRoZSBjdXJyZW50IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdiBUaGUgVmVjMiB0byBzdWJ0cmFjdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLnN1YnRyYWN0ID0gZnVuY3Rpb24gc3VidHJhY3Qodikge1xuICAgIHRoaXMueCAtPSB2Lng7XG4gICAgdGhpcy55IC09IHYueTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2NhbGUgdGhlIGN1cnJlbnQgVmVjMiBieSBhIHNjYWxhciBvciBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcnxWZWMyfSBzIFRoZSBOdW1iZXIgb3IgdmVjMiBieSB3aGljaCB0byBzY2FsZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gc2NhbGUocykge1xuICAgIGlmIChzIGluc3RhbmNlb2YgVmVjMikge1xuICAgICAgICB0aGlzLnggKj0gcy54O1xuICAgICAgICB0aGlzLnkgKj0gcy55O1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy54ICo9IHM7XG4gICAgICAgIHRoaXMueSAqPSBzO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUm90YXRlIHRoZSBWZWMyIGNvdW50ZXItY2xvY2t3aXNlIGJ5IHRoZXRhIGFib3V0IHRoZSB6LWF4aXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aGV0YSBBbmdsZSBieSB3aGljaCB0byByb3RhdGUuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5yb3RhdGUgPSBmdW5jdGlvbih0aGV0YSkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuXG4gICAgdmFyIGNvc1RoZXRhID0gTWF0aC5jb3ModGhldGEpO1xuICAgIHZhciBzaW5UaGV0YSA9IE1hdGguc2luKHRoZXRhKTtcblxuICAgIHRoaXMueCA9IHggKiBjb3NUaGV0YSAtIHkgKiBzaW5UaGV0YTtcbiAgICB0aGlzLnkgPSB4ICogc2luVGhldGEgKyB5ICogY29zVGhldGE7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVGhlIGRvdCBwcm9kdWN0IG9mIG9mIHRoZSBjdXJyZW50IFZlYzIgd2l0aCB0aGUgaW5wdXQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHYgVGhlIG90aGVyIFZlYzIuXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5kb3QgPSBmdW5jdGlvbih2KSB7XG4gICAgcmV0dXJuIHRoaXMueCAqIHYueCArIHRoaXMueSAqIHYueTtcbn07XG5cbi8qKlxuICogVGhlIGNyb3NzIHByb2R1Y3Qgb2Ygb2YgdGhlIGN1cnJlbnQgVmVjMiB3aXRoIHRoZSBpbnB1dCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdiBUaGUgb3RoZXIgVmVjMi5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLmNyb3NzID0gZnVuY3Rpb24odikge1xuICAgIHJldHVybiB0aGlzLnggKiB2LnkgLSB0aGlzLnkgKiB2Lng7XG59O1xuXG4vKipcbiAqIFByZXNlcnZlIHRoZSBtYWduaXR1ZGUgYnV0IGludmVydCB0aGUgb3JpZW50YXRpb24gb2YgdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5pbnZlcnQgPSBmdW5jdGlvbiBpbnZlcnQoKSB7XG4gICAgdGhpcy54ICo9IC0xO1xuICAgIHRoaXMueSAqPSAtMTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQXBwbHkgYSBmdW5jdGlvbiBjb21wb25lbnQtd2lzZSB0byB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBGdW5jdGlvbiB0byBhcHBseS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSB0aGlzXG4gKi9cblZlYzIucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIG1hcChmbikge1xuICAgIHRoaXMueCA9IGZuKHRoaXMueCk7XG4gICAgdGhpcy55ID0gZm4odGhpcy55KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0IHRoZSBtYWduaXR1ZGUgb2YgdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgbGVuZ3RoIG9mIHRoZSB2ZWN0b3JcbiAqL1xuVmVjMi5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gbGVuZ3RoKCkge1xuICAgIHZhciB4ID0gdGhpcy54O1xuICAgIHZhciB5ID0gdGhpcy55O1xuXG4gICAgcmV0dXJuIE1hdGguc3FydCh4ICogeCArIHkgKiB5KTtcbn07XG5cbi8qKlxuICogQ29weSB0aGUgaW5wdXQgb250byB0aGUgY3VycmVudCBWZWMyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYgVmVjMiB0byBjb3B5XG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gY29weSh2KSB7XG4gICAgdGhpcy54ID0gdi54O1xuICAgIHRoaXMueSA9IHYueTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVzZXQgdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7VmVjMn0gdGhpc1xuICovXG5WZWMyLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgIHRoaXMueCA9IDA7XG4gICAgdGhpcy55ID0gMDtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciB0aGUgbWFnbml0dWRlIG9mIHRoZSBjdXJyZW50IFZlYzIgaXMgZXhhY3RseSAwLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSB3aGV0aGVyIG9yIG5vdCB0aGUgbGVuZ3RoIGlzIDBcbiAqL1xuVmVjMi5wcm90b3R5cGUuaXNaZXJvID0gZnVuY3Rpb24gaXNaZXJvKCkge1xuICAgIGlmICh0aGlzLnggIT09IDAgfHwgdGhpcy55ICE9PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgZWxzZSByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogVGhlIGFycmF5IGZvcm0gb2YgdGhlIGN1cnJlbnQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7QXJyYXl9IHRoZSBWZWMgdG8gYXMgYW4gYXJyYXlcbiAqL1xuVmVjMi5wcm90b3R5cGUudG9BcnJheSA9IGZ1bmN0aW9uIHRvQXJyYXkoKSB7XG4gICAgcmV0dXJuIFt0aGlzLngsIHRoaXMueV07XG59O1xuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgaW5wdXQgVmVjMi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMyfSB2IFRoZSByZWZlcmVuY2UgVmVjMi5cbiAqIEBwYXJhbSB7VmVjMn0gb3V0cHV0IFZlYzIgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSBUaGUgbm9ybWFsaXplZCBWZWMyLlxuICovXG5WZWMyLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uIG5vcm1hbGl6ZSh2LCBvdXRwdXQpIHtcbiAgICB2YXIgeCA9IHYueDtcbiAgICB2YXIgeSA9IHYueTtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSkgfHwgMTtcbiAgICBsZW5ndGggPSAxIC8gbGVuZ3RoO1xuICAgIG91dHB1dC54ID0gdi54ICogbGVuZ3RoO1xuICAgIG91dHB1dC55ID0gdi55ICogbGVuZ3RoO1xuXG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogQ2xvbmUgdGhlIGlucHV0IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdiBUaGUgVmVjMiB0byBjbG9uZS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMyfSBUaGUgY2xvbmVkIFZlYzIuXG4gKi9cblZlYzIuY2xvbmUgPSBmdW5jdGlvbiBjbG9uZSh2KSB7XG4gICAgcmV0dXJuIG5ldyBWZWMyKHYueCwgdi55KTtcbn07XG5cbi8qKlxuICogQWRkIHRoZSBpbnB1dCBWZWMyJ3MuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdjEgVGhlIGxlZnQgVmVjMi5cbiAqIEBwYXJhbSB7VmVjMn0gdjIgVGhlIHJpZ2h0IFZlYzIuXG4gKiBAcGFyYW0ge1ZlYzJ9IG91dHB1dCBWZWMyIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjMn0gVGhlIHJlc3VsdCBvZiB0aGUgYWRkaXRpb24uXG4gKi9cblZlYzIuYWRkID0gZnVuY3Rpb24gYWRkKHYxLCB2Miwgb3V0cHV0KSB7XG4gICAgb3V0cHV0LnggPSB2MS54ICsgdjIueDtcbiAgICBvdXRwdXQueSA9IHYxLnkgKyB2Mi55O1xuXG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogU3VidHJhY3QgdGhlIHNlY29uZCBWZWMyIGZyb20gdGhlIGZpcnN0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzJ9IHYxIFRoZSBsZWZ0IFZlYzIuXG4gKiBAcGFyYW0ge1ZlYzJ9IHYyIFRoZSByaWdodCBWZWMyLlxuICogQHBhcmFtIHtWZWMyfSBvdXRwdXQgVmVjMiBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzJ9IFRoZSByZXN1bHQgb2YgdGhlIHN1YnRyYWN0aW9uLlxuICovXG5WZWMyLnN1YnRyYWN0ID0gZnVuY3Rpb24gc3VidHJhY3QodjEsIHYyLCBvdXRwdXQpIHtcbiAgICBvdXRwdXQueCA9IHYxLnggLSB2Mi54O1xuICAgIG91dHB1dC55ID0gdjEueSAtIHYyLnk7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogU2NhbGUgdGhlIGlucHV0IFZlYzIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdiBUaGUgcmVmZXJlbmNlIFZlYzIuXG4gKiBAcGFyYW0ge051bWJlcn0gcyBOdW1iZXIgdG8gc2NhbGUgYnkuXG4gKiBAcGFyYW0ge1ZlYzJ9IG91dHB1dCBWZWMyIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjMn0gVGhlIHJlc3VsdCBvZiB0aGUgc2NhbGluZy5cbiAqL1xuVmVjMi5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHYsIHMsIG91dHB1dCkge1xuICAgIG91dHB1dC54ID0gdi54ICogcztcbiAgICBvdXRwdXQueSA9IHYueSAqIHM7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogVGhlIGRvdCBwcm9kdWN0IG9mIHRoZSBpbnB1dCBWZWMyJ3MuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjMn0gdjEgVGhlIGxlZnQgVmVjMi5cbiAqIEBwYXJhbSB7VmVjMn0gdjIgVGhlIHJpZ2h0IFZlYzIuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBUaGUgZG90IHByb2R1Y3QuXG4gKi9cblZlYzIuZG90ID0gZnVuY3Rpb24gZG90KHYxLCB2Mikge1xuICAgIHJldHVybiB2MS54ICogdjIueCArIHYxLnkgKiB2Mi55O1xufTtcblxuLyoqXG4gKiBUaGUgY3Jvc3MgcHJvZHVjdCBvZiB0aGUgaW5wdXQgVmVjMidzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdjEgVGhlIGxlZnQgVmVjMi5cbiAqIEBwYXJhbSB7TnVtYmVyfSB2MiBUaGUgcmlnaHQgVmVjMi5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IFRoZSB6LWNvbXBvbmVudCBvZiB0aGUgY3Jvc3MgcHJvZHVjdC5cbiAqL1xuVmVjMi5jcm9zcyA9IGZ1bmN0aW9uKHYxLHYyKSB7XG4gICAgcmV0dXJuIHYxLnggKiB2Mi55IC0gdjEueSAqIHYyLng7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlYzI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSB0aHJlZS1kaW1lbnNpb25hbCB2ZWN0b3IuXG4gKlxuICogQGNsYXNzIFZlYzNcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBUaGUgeCBjb21wb25lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0geSBUaGUgeSBjb21wb25lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0geiBUaGUgeiBjb21wb25lbnQuXG4gKi9cbnZhciBWZWMzID0gZnVuY3Rpb24oeCAseSwgeil7XG4gICAgdGhpcy54ID0geCB8fCAwO1xuICAgIHRoaXMueSA9IHkgfHwgMDtcbiAgICB0aGlzLnogPSB6IHx8IDA7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgY29tcG9uZW50cyBvZiB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0geCBUaGUgeCBjb21wb25lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0geSBUaGUgeSBjb21wb25lbnQuXG4gKiBAcGFyYW0ge051bWJlcn0geiBUaGUgeiBjb21wb25lbnQuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiBzZXQoeCwgeSwgeikge1xuICAgIGlmICh4ICE9IG51bGwpIHRoaXMueCA9IHg7XG4gICAgaWYgKHkgIT0gbnVsbCkgdGhpcy55ID0geTtcbiAgICBpZiAoeiAhPSBudWxsKSB0aGlzLnogPSB6O1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCB0aGUgaW5wdXQgdiB0byB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIFZlYzMgdG8gYWRkLlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gYWRkKHYpIHtcbiAgICB0aGlzLnggKz0gdi54O1xuICAgIHRoaXMueSArPSB2Lnk7XG4gICAgdGhpcy56ICs9IHYuejtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTdWJ0cmFjdCB0aGUgaW5wdXQgdiBmcm9tIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgVmVjMyB0byBzdWJ0cmFjdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLnN1YnRyYWN0ID0gZnVuY3Rpb24gc3VidHJhY3Qodikge1xuICAgIHRoaXMueCAtPSB2Lng7XG4gICAgdGhpcy55IC09IHYueTtcbiAgICB0aGlzLnogLT0gdi56O1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJvdGF0ZSB0aGUgY3VycmVudCBWZWMzIGJ5IHRoZXRhIGNsb2Nrd2lzZSBhYm91dCB0aGUgeCBheGlzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGhldGEgQW5nbGUgYnkgd2hpY2ggdG8gcm90YXRlLlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUucm90YXRlWCA9IGZ1bmN0aW9uIHJvdGF0ZVgodGhldGEpIHtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG5cbiAgICB0aGlzLnkgPSB5ICogY29zVGhldGEgLSB6ICogc2luVGhldGE7XG4gICAgdGhpcy56ID0geSAqIHNpblRoZXRhICsgeiAqIGNvc1RoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJvdGF0ZSB0aGUgY3VycmVudCBWZWMzIGJ5IHRoZXRhIGNsb2Nrd2lzZSBhYm91dCB0aGUgeSBheGlzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGhldGEgQW5nbGUgYnkgd2hpY2ggdG8gcm90YXRlLlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUucm90YXRlWSA9IGZ1bmN0aW9uIHJvdGF0ZVkodGhldGEpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG5cbiAgICB0aGlzLnggPSB6ICogc2luVGhldGEgKyB4ICogY29zVGhldGE7XG4gICAgdGhpcy56ID0geiAqIGNvc1RoZXRhIC0geCAqIHNpblRoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJvdGF0ZSB0aGUgY3VycmVudCBWZWMzIGJ5IHRoZXRhIGNsb2Nrd2lzZSBhYm91dCB0aGUgeiBheGlzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGhldGEgQW5nbGUgYnkgd2hpY2ggdG8gcm90YXRlLlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUucm90YXRlWiA9IGZ1bmN0aW9uIHJvdGF0ZVoodGhldGEpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcblxuICAgIHZhciBjb3NUaGV0YSA9IE1hdGguY29zKHRoZXRhKTtcbiAgICB2YXIgc2luVGhldGEgPSBNYXRoLnNpbih0aGV0YSk7XG5cbiAgICB0aGlzLnggPSB4ICogY29zVGhldGEgLSB5ICogc2luVGhldGE7XG4gICAgdGhpcy55ID0geCAqIHNpblRoZXRhICsgeSAqIGNvc1RoZXRhO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFRoZSBkb3QgcHJvZHVjdCBvZiB0aGUgY3VycmVudCBWZWMzIHdpdGggaW5wdXQgVmVjMyB2LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIG90aGVyIFZlYzMuXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5kb3QgPSBmdW5jdGlvbiBkb3Qodikge1xuICAgIHJldHVybiB0aGlzLngqdi54ICsgdGhpcy55KnYueSArIHRoaXMueip2Lno7XG59O1xuXG4vKipcbiAqIFRoZSBkb3QgcHJvZHVjdCBvZiB0aGUgY3VycmVudCBWZWMzIHdpdGggaW5wdXQgVmVjMyB2LlxuICogU3RvcmVzIHRoZSByZXN1bHQgaW4gdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kIGNyb3NzXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSBvdGhlciBWZWMzXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5jcm9zcyA9IGZ1bmN0aW9uIGNyb3NzKHYpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHZhciB2eCA9IHYueDtcbiAgICB2YXIgdnkgPSB2Lnk7XG4gICAgdmFyIHZ6ID0gdi56O1xuXG4gICAgdGhpcy54ID0geSAqIHZ6IC0geiAqIHZ5O1xuICAgIHRoaXMueSA9IHogKiB2eCAtIHggKiB2ejtcbiAgICB0aGlzLnogPSB4ICogdnkgLSB5ICogdng7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFNjYWxlIHRoZSBjdXJyZW50IFZlYzMgYnkgYSBzY2FsYXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBzIFRoZSBOdW1iZXIgYnkgd2hpY2ggdG8gc2NhbGVcbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLnNjYWxlID0gZnVuY3Rpb24gc2NhbGUocykge1xuICAgIHRoaXMueCAqPSBzO1xuICAgIHRoaXMueSAqPSBzO1xuICAgIHRoaXMueiAqPSBzO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFByZXNlcnZlIHRoZSBtYWduaXR1ZGUgYnV0IGludmVydCB0aGUgb3JpZW50YXRpb24gb2YgdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5pbnZlcnQgPSBmdW5jdGlvbiBpbnZlcnQoKSB7XG4gICAgdGhpcy54ID0gLXRoaXMueDtcbiAgICB0aGlzLnkgPSAtdGhpcy55O1xuICAgIHRoaXMueiA9IC10aGlzLno7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQXBwbHkgYSBmdW5jdGlvbiBjb21wb25lbnQtd2lzZSB0byB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBGdW5jdGlvbiB0byBhcHBseS5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLm1hcCA9IGZ1bmN0aW9uIG1hcChmbikge1xuICAgIHRoaXMueCA9IGZuKHRoaXMueCk7XG4gICAgdGhpcy55ID0gZm4odGhpcy55KTtcbiAgICB0aGlzLnogPSBmbih0aGlzLnopO1xuXG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFRoZSBtYWduaXR1ZGUgb2YgdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSB0aGUgbWFnbml0dWRlIG9mIHRoZSBWZWMzXG4gKi9cblZlYzMucHJvdG90eXBlLmxlbmd0aCA9IGZ1bmN0aW9uIGxlbmd0aCgpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHJldHVybiBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSArIHogKiB6KTtcbn07XG5cbi8qKlxuICogVGhlIG1hZ25pdHVkZSBzcXVhcmVkIG9mIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gbWFnbml0dWRlIG9mIHRoZSBWZWMzIHNxdWFyZWRcbiAqL1xuVmVjMy5wcm90b3R5cGUubGVuZ3RoU3EgPSBmdW5jdGlvbiBsZW5ndGhTcSgpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHJldHVybiB4ICogeCArIHkgKiB5ICsgeiAqIHo7XG59O1xuXG4vKipcbiAqIENvcHkgdGhlIGlucHV0IG9udG8gdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFZlYzMgdG8gY29weVxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IHRoaXNcbiAqL1xuVmVjMy5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIGNvcHkodikge1xuICAgIHRoaXMueCA9IHYueDtcbiAgICB0aGlzLnkgPSB2Lnk7XG4gICAgdGhpcy56ID0gdi56O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXNldCB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgdGhpcy54ID0gMDtcbiAgICB0aGlzLnkgPSAwO1xuICAgIHRoaXMueiA9IDA7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIG1hZ25pdHVkZSBvZiB0aGUgY3VycmVudCBWZWMzIGlzIGV4YWN0bHkgMC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gd2hldGhlciBvciBub3QgdGhlIG1hZ25pdHVkZSBpcyB6ZXJvXG4gKi9cblZlYzMucHJvdG90eXBlLmlzWmVybyA9IGZ1bmN0aW9uIGlzWmVybygpIHtcbiAgICByZXR1cm4gdGhpcy54ID09PSAwICYmIHRoaXMueSA9PT0gMCAmJiB0aGlzLnogPT09IDA7XG59O1xuXG4vKipcbiAqIFRoZSBhcnJheSBmb3JtIG9mIHRoZSBjdXJyZW50IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBhIHRocmVlIGVsZW1lbnQgYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBjb21wb25lbnRzIG9mIHRoZSBWZWMzXG4gKi9cblZlYzMucHJvdG90eXBlLnRvQXJyYXkgPSBmdW5jdGlvbiB0b0FycmF5KCkge1xuICAgIHJldHVybiBbdGhpcy54LCB0aGlzLnksIHRoaXMuel07XG59O1xuXG4vKipcbiAqIFByZXNlcnZlIHRoZSBvcmllbnRhdGlvbiBidXQgY2hhbmdlIHRoZSBsZW5ndGggb2YgdGhlIGN1cnJlbnQgVmVjMyB0byAxLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uIG5vcm1hbGl6ZSgpIHtcbiAgICB2YXIgeCA9IHRoaXMueDtcbiAgICB2YXIgeSA9IHRoaXMueTtcbiAgICB2YXIgeiA9IHRoaXMuejtcblxuICAgIHZhciBsZW4gPSBNYXRoLnNxcnQoeCAqIHggKyB5ICogeSArIHogKiB6KSB8fCAxO1xuICAgIGxlbiA9IDEgLyBsZW47XG5cbiAgICB0aGlzLnggKj0gbGVuO1xuICAgIHRoaXMueSAqPSBsZW47XG4gICAgdGhpcy56ICo9IGxlbjtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQXBwbHkgdGhlIHJvdGF0aW9uIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGlucHV0ICh1bml0KSBRdWF0ZXJuaW9uXG4gKiB0byB0aGUgY3VycmVudCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1F1YXRlcm5pb259IHEgVW5pdCBRdWF0ZXJuaW9uIHJlcHJlc2VudGluZyB0aGUgcm90YXRpb24gdG8gYXBwbHlcbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSB0aGlzXG4gKi9cblZlYzMucHJvdG90eXBlLmFwcGx5Um90YXRpb24gPSBmdW5jdGlvbiBhcHBseVJvdGF0aW9uKHEpIHtcbiAgICB2YXIgY3cgPSBxLnc7XG4gICAgdmFyIGN4ID0gLXEueDtcbiAgICB2YXIgY3kgPSAtcS55O1xuICAgIHZhciBjeiA9IC1xLno7XG5cbiAgICB2YXIgdnggPSB0aGlzLng7XG4gICAgdmFyIHZ5ID0gdGhpcy55O1xuICAgIHZhciB2eiA9IHRoaXMuejtcblxuICAgIHZhciB0dyA9IC1jeCAqIHZ4IC0gY3kgKiB2eSAtIGN6ICogdno7XG4gICAgdmFyIHR4ID0gdnggKiBjdyArIHZ5ICogY3ogLSBjeSAqIHZ6O1xuICAgIHZhciB0eSA9IHZ5ICogY3cgKyBjeCAqIHZ6IC0gdnggKiBjejtcbiAgICB2YXIgdHogPSB2eiAqIGN3ICsgdnggKiBjeSAtIGN4ICogdnk7XG5cbiAgICB2YXIgdyA9IGN3O1xuICAgIHZhciB4ID0gLWN4O1xuICAgIHZhciB5ID0gLWN5O1xuICAgIHZhciB6ID0gLWN6O1xuXG4gICAgdGhpcy54ID0gdHggKiB3ICsgeCAqIHR3ICsgeSAqIHR6IC0gdHkgKiB6O1xuICAgIHRoaXMueSA9IHR5ICogdyArIHkgKiB0dyArIHR4ICogeiAtIHggKiB0ejtcbiAgICB0aGlzLnogPSB0eiAqIHcgKyB6ICogdHcgKyB4ICogdHkgLSB0eCAqIHk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFwcGx5IHRoZSBpbnB1dCBNYXQzMyB0aGUgdGhlIGN1cnJlbnQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtNYXQzM30gbWF0cml4IE1hdDMzIHRvIGFwcGx5XG4gKlxuICogQHJldHVybiB7VmVjM30gdGhpc1xuICovXG5WZWMzLnByb3RvdHlwZS5hcHBseU1hdHJpeCA9IGZ1bmN0aW9uIGFwcGx5TWF0cml4KG1hdHJpeCkge1xuICAgIHZhciBNID0gbWF0cml4LmdldCgpO1xuXG4gICAgdmFyIHggPSB0aGlzLng7XG4gICAgdmFyIHkgPSB0aGlzLnk7XG4gICAgdmFyIHogPSB0aGlzLno7XG5cbiAgICB0aGlzLnggPSBNWzBdKnggKyBNWzFdKnkgKyBNWzJdKno7XG4gICAgdGhpcy55ID0gTVszXSp4ICsgTVs0XSp5ICsgTVs1XSp6O1xuICAgIHRoaXMueiA9IE1bNl0qeCArIE1bN10qeSArIE1bOF0qejtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogTm9ybWFsaXplIHRoZSBpbnB1dCBWZWMzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYgVGhlIHJlZmVyZW5jZSBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSBvdXRwdXQgVmVjMyBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IFRoZSBub3JtYWxpemUgVmVjMy5cbiAqL1xuVmVjMy5ub3JtYWxpemUgPSBmdW5jdGlvbiBub3JtYWxpemUodiwgb3V0cHV0KSB7XG4gICAgdmFyIHggPSB2Lng7XG4gICAgdmFyIHkgPSB2Lnk7XG4gICAgdmFyIHogPSB2Lno7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeikgfHwgMTtcbiAgICBsZW5ndGggPSAxIC8gbGVuZ3RoO1xuXG4gICAgb3V0cHV0LnggPSB4ICogbGVuZ3RoO1xuICAgIG91dHB1dC55ID0geSAqIGxlbmd0aDtcbiAgICBvdXRwdXQueiA9IHogKiBsZW5ndGg7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogQXBwbHkgYSByb3RhdGlvbiB0byB0aGUgaW5wdXQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSByZWZlcmVuY2UgVmVjMy5cbiAqIEBwYXJhbSB7UXVhdGVybmlvbn0gcSBVbml0IFF1YXRlcm5pb24gcmVwcmVzZW50aW5nIHRoZSByb3RhdGlvbiB0byBhcHBseS5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSBUaGUgcm90YXRlZCB2ZXJzaW9uIG9mIHRoZSBpbnB1dCBWZWMzLlxuICovXG5WZWMzLmFwcGx5Um90YXRpb24gPSBmdW5jdGlvbiBhcHBseVJvdGF0aW9uKHYsIHEsIG91dHB1dCkge1xuICAgIHZhciBjdyA9IHEudztcbiAgICB2YXIgY3ggPSAtcS54O1xuICAgIHZhciBjeSA9IC1xLnk7XG4gICAgdmFyIGN6ID0gLXEuejtcblxuICAgIHZhciB2eCA9IHYueDtcbiAgICB2YXIgdnkgPSB2Lnk7XG4gICAgdmFyIHZ6ID0gdi56O1xuXG4gICAgdmFyIHR3ID0gLWN4ICogdnggLSBjeSAqIHZ5IC0gY3ogKiB2ejtcbiAgICB2YXIgdHggPSB2eCAqIGN3ICsgdnkgKiBjeiAtIGN5ICogdno7XG4gICAgdmFyIHR5ID0gdnkgKiBjdyArIGN4ICogdnogLSB2eCAqIGN6O1xuICAgIHZhciB0eiA9IHZ6ICogY3cgKyB2eCAqIGN5IC0gY3ggKiB2eTtcblxuICAgIHZhciB3ID0gY3c7XG4gICAgdmFyIHggPSAtY3g7XG4gICAgdmFyIHkgPSAtY3k7XG4gICAgdmFyIHogPSAtY3o7XG5cbiAgICBvdXRwdXQueCA9IHR4ICogdyArIHggKiB0dyArIHkgKiB0eiAtIHR5ICogejtcbiAgICBvdXRwdXQueSA9IHR5ICogdyArIHkgKiB0dyArIHR4ICogeiAtIHggKiB0ejtcbiAgICBvdXRwdXQueiA9IHR6ICogdyArIHogKiB0dyArIHggKiB0eSAtIHR4ICogeTtcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBDbG9uZSB0aGUgaW5wdXQgVmVjMy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2IFRoZSBWZWMzIHRvIGNsb25lLlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IFRoZSBjbG9uZWQgVmVjMy5cbiAqL1xuVmVjMy5jbG9uZSA9IGZ1bmN0aW9uIGNsb25lKHYpIHtcbiAgICByZXR1cm4gbmV3IFZlYzModi54LCB2LnksIHYueik7XG59O1xuXG4vKipcbiAqIEFkZCB0aGUgaW5wdXQgVmVjMydzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYxIFRoZSBsZWZ0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IHYyIFRoZSByaWdodCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSBvdXRwdXQgVmVjMyBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge1ZlYzN9IFRoZSByZXN1bHQgb2YgdGhlIGFkZGl0aW9uLlxuICovXG5WZWMzLmFkZCA9IGZ1bmN0aW9uIGFkZCh2MSwgdjIsIG91dHB1dCkge1xuICAgIG91dHB1dC54ID0gdjEueCArIHYyLng7XG4gICAgb3V0cHV0LnkgPSB2MS55ICsgdjIueTtcbiAgICBvdXRwdXQueiA9IHYxLnogKyB2Mi56O1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFN1YnRyYWN0IHRoZSBzZWNvbmQgVmVjMyBmcm9tIHRoZSBmaXJzdC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2MSBUaGUgbGVmdCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSB2MiBUaGUgcmlnaHQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtWZWMzfSBUaGUgcmVzdWx0IG9mIHRoZSBzdWJ0cmFjdGlvbi5cbiAqL1xuVmVjMy5zdWJ0cmFjdCA9IGZ1bmN0aW9uIHN1YnRyYWN0KHYxLCB2Miwgb3V0cHV0KSB7XG4gICAgb3V0cHV0LnggPSB2MS54IC0gdjIueDtcbiAgICBvdXRwdXQueSA9IHYxLnkgLSB2Mi55O1xuICAgIG91dHB1dC56ID0gdjEueiAtIHYyLno7XG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbi8qKlxuICogU2NhbGUgdGhlIGlucHV0IFZlYzMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7VmVjM30gdiBUaGUgcmVmZXJlbmNlIFZlYzMuXG4gKiBAcGFyYW0ge051bWJlcn0gcyBOdW1iZXIgdG8gc2NhbGUgYnkuXG4gKiBAcGFyYW0ge1ZlYzN9IG91dHB1dCBWZWMzIGluIHdoaWNoIHRvIHBsYWNlIHRoZSByZXN1bHQuXG4gKlxuICogQHJldHVybiB7VmVjM30gVGhlIHJlc3VsdCBvZiB0aGUgc2NhbGluZy5cbiAqL1xuVmVjMy5zY2FsZSA9IGZ1bmN0aW9uIHNjYWxlKHYsIHMsIG91dHB1dCkge1xuICAgIG91dHB1dC54ID0gdi54ICogcztcbiAgICBvdXRwdXQueSA9IHYueSAqIHM7XG4gICAgb3V0cHV0LnogPSB2LnogKiBzO1xuICAgIHJldHVybiBvdXRwdXQ7XG59O1xuXG4vKipcbiAqIFRoZSBkb3QgcHJvZHVjdCBvZiB0aGUgaW5wdXQgVmVjMydzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYxIFRoZSBsZWZ0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IHYyIFRoZSByaWdodCBWZWMzLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gVGhlIGRvdCBwcm9kdWN0LlxuICovXG5WZWMzLmRvdCA9IGZ1bmN0aW9uIGRvdCh2MSwgdjIpIHtcbiAgICByZXR1cm4gdjEueCAqIHYyLnggKyB2MS55ICogdjIueSArIHYxLnogKiB2Mi56O1xufTtcblxuLyoqXG4gKiBUaGUgKHJpZ2h0LWhhbmRlZCkgY3Jvc3MgcHJvZHVjdCBvZiB0aGUgaW5wdXQgVmVjMydzLlxuICogdjEgeCB2Mi5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtWZWMzfSB2MSBUaGUgbGVmdCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSB2MiBUaGUgcmlnaHQgVmVjMy5cbiAqIEBwYXJhbSB7VmVjM30gb3V0cHV0IFZlYzMgaW4gd2hpY2ggdG8gcGxhY2UgdGhlIHJlc3VsdC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IHRoZSBvYmplY3QgdGhlIHJlc3VsdCBvZiB0aGUgY3Jvc3MgcHJvZHVjdCB3YXMgcGxhY2VkIGludG9cbiAqL1xuVmVjMy5jcm9zcyA9IGZ1bmN0aW9uIGNyb3NzKHYxLCB2Miwgb3V0cHV0KSB7XG4gICAgdmFyIHgxID0gdjEueDtcbiAgICB2YXIgeTEgPSB2MS55O1xuICAgIHZhciB6MSA9IHYxLno7XG4gICAgdmFyIHgyID0gdjIueDtcbiAgICB2YXIgeTIgPSB2Mi55O1xuICAgIHZhciB6MiA9IHYyLno7XG5cbiAgICBvdXRwdXQueCA9IHkxICogejIgLSB6MSAqIHkyO1xuICAgIG91dHB1dC55ID0gejEgKiB4MiAtIHgxICogejI7XG4gICAgb3V0cHV0LnogPSB4MSAqIHkyIC0geTEgKiB4MjtcbiAgICByZXR1cm4gb3V0cHV0O1xufTtcblxuLyoqXG4gKiBUaGUgcHJvamVjdGlvbiBvZiB2MSBvbnRvIHYyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1ZlYzN9IHYxIFRoZSBsZWZ0IFZlYzMuXG4gKiBAcGFyYW0ge1ZlYzN9IHYyIFRoZSByaWdodCBWZWMzLlxuICogQHBhcmFtIHtWZWMzfSBvdXRwdXQgVmVjMyBpbiB3aGljaCB0byBwbGFjZSB0aGUgcmVzdWx0LlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gdGhlIG9iamVjdCB0aGUgcmVzdWx0IG9mIHRoZSBjcm9zcyBwcm9kdWN0IHdhcyBwbGFjZWQgaW50byBcbiAqL1xuVmVjMy5wcm9qZWN0ID0gZnVuY3Rpb24gcHJvamVjdCh2MSwgdjIsIG91dHB1dCkge1xuICAgIHZhciB4MSA9IHYxLng7XG4gICAgdmFyIHkxID0gdjEueTtcbiAgICB2YXIgejEgPSB2MS56O1xuICAgIHZhciB4MiA9IHYyLng7XG4gICAgdmFyIHkyID0gdjIueTtcbiAgICB2YXIgejIgPSB2Mi56O1xuXG4gICAgdmFyIHNjYWxlID0geDEgKiB4MiArIHkxICogeTIgKyB6MSAqIHoyO1xuICAgIHNjYWxlIC89IHgyICogeDIgKyB5MiAqIHkyICsgejIgKiB6MjtcblxuICAgIG91dHB1dC54ID0geDIgKiBzY2FsZTtcbiAgICBvdXRwdXQueSA9IHkyICogc2NhbGU7XG4gICAgb3V0cHV0LnogPSB6MiAqIHNjYWxlO1xuXG4gICAgcmV0dXJuIG91dHB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVmVjMztcbiIsIm1vZHVsZS5leHBvcnRzID0gbm9vcFxuXG5mdW5jdGlvbiBub29wKCkge1xuICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAnWW91IHNob3VsZCBidW5kbGUgeW91ciBjb2RlICcgK1xuICAgICAgJ3VzaW5nIGBnbHNsaWZ5YCBhcyBhIHRyYW5zZm9ybS4nXG4gIClcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gcHJvZ3JhbWlmeVxuXG5mdW5jdGlvbiBwcm9ncmFtaWZ5KHZlcnRleCwgZnJhZ21lbnQsIHVuaWZvcm1zLCBhdHRyaWJ1dGVzKSB7XG4gIHJldHVybiB7XG4gICAgdmVydGV4OiB2ZXJ0ZXgsIFxuICAgIGZyYWdtZW50OiBmcmFnbWVudCxcbiAgICB1bmlmb3JtczogdW5pZm9ybXMsIFxuICAgIGF0dHJpYnV0ZXM6IGF0dHJpYnV0ZXNcbiAgfTtcbn1cbiIsIi8vIGh0dHA6Ly9wYXVsaXJpc2guY29tLzIwMTEvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1hbmltYXRpbmcvXG4vLyBodHRwOi8vbXkub3BlcmEuY29tL2Vtb2xsZXIvYmxvZy8yMDExLzEyLzIwL3JlcXVlc3RhbmltYXRpb25mcmFtZS1mb3Itc21hcnQtZXItYW5pbWF0aW5nXG4vLyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgcG9seWZpbGwgYnkgRXJpayBNw7ZsbGVyLiBmaXhlcyBmcm9tIFBhdWwgSXJpc2ggYW5kIFRpbm8gWmlqZGVsXG4vLyBNSVQgbGljZW5zZVxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBsYXN0VGltZSA9IDA7XG52YXIgdmVuZG9ycyA9IFsnbXMnLCAnbW96JywgJ3dlYmtpdCcsICdvJ107XG5cbnZhciByQUYsIGNBRjtcblxuaWYgKHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnKSB7XG4gICAgckFGID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcbiAgICBjQUYgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUgfHwgd2luZG93LmNhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZTtcbiAgICBmb3IgKHZhciB4ID0gMDsgeCA8IHZlbmRvcnMubGVuZ3RoICYmICFyQUY7ICsreCkge1xuICAgICAgICByQUYgPSB3aW5kb3dbdmVuZG9yc1t4XSArICdSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXTtcbiAgICAgICAgY0FGID0gd2luZG93W3ZlbmRvcnNbeF0gKyAnQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lJ10gfHxcbiAgICAgICAgICAgICAgd2luZG93W3ZlbmRvcnNbeF0gKyAnQ2FuY2VsQW5pbWF0aW9uRnJhbWUnXTtcbiAgICB9XG5cbiAgICBpZiAockFGICYmICFjQUYpIHtcbiAgICAgICAgLy8gY0FGIG5vdCBzdXBwb3J0ZWQuXG4gICAgICAgIC8vIEZhbGwgYmFjayB0byBzZXRJbnRlcnZhbCBmb3Igbm93ICh2ZXJ5IHJhcmUpLlxuICAgICAgICByQUYgPSBudWxsO1xuICAgIH1cbn1cblxuaWYgKCFyQUYpIHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3cgPyBEYXRlLm5vdyA6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIH07XG5cbiAgICByQUYgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICB2YXIgY3VyclRpbWUgPSBub3coKTtcbiAgICAgICAgdmFyIHRpbWVUb0NhbGwgPSBNYXRoLm1heCgwLCAxNiAtIChjdXJyVGltZSAtIGxhc3RUaW1lKSk7XG4gICAgICAgIHZhciBpZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2FsbGJhY2soY3VyclRpbWUgKyB0aW1lVG9DYWxsKTtcbiAgICAgICAgfSwgdGltZVRvQ2FsbCk7XG4gICAgICAgIGxhc3RUaW1lID0gY3VyclRpbWUgKyB0aW1lVG9DYWxsO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfTtcblxuICAgIGNBRiA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoaWQpO1xuICAgIH07XG59XG5cbnZhciBhbmltYXRpb25GcmFtZSA9IHtcbiAgICAvKipcbiAgICAgKiBDcm9zcyBicm93c2VyIHZlcnNpb24gb2YgW3JlcXVlc3RBbmltYXRpb25GcmFtZV17QGxpbmsgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL3dpbmRvdy9yZXF1ZXN0QW5pbWF0aW9uRnJhbWV9LlxuICAgICAqXG4gICAgICogVXNlZCBieSBFbmdpbmUgaW4gb3JkZXIgdG8gZXN0YWJsaXNoIGEgcmVuZGVyIGxvb3AuXG4gICAgICpcbiAgICAgKiBJZiBubyAodmVuZG9yIHByZWZpeGVkIHZlcnNpb24gb2YpIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgIGlzIGF2YWlsYWJsZSxcbiAgICAgKiBgc2V0VGltZW91dGAgd2lsbCBiZSB1c2VkIGluIG9yZGVyIHRvIGVtdWxhdGUgYSByZW5kZXIgbG9vcCBydW5uaW5nIGF0XG4gICAgICogYXBwcm94aW1hdGVseSA2MCBmcmFtZXMgcGVyIHNlY29uZC5cbiAgICAgKlxuICAgICAqIEBtZXRob2QgIHJlcXVlc3RBbmltYXRpb25GcmFtZVxuICAgICAqXG4gICAgICogQHBhcmFtICAge0Z1bmN0aW9ufSAgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCBvbiB0aGUgbmV4dCBmcmFtZS5cbiAgICAgKiBAcmV0dXJuICB7TnVtYmVyfSAgICByZXF1ZXN0SWQgdG8gYmUgdXNlZCB0byBjYW5jZWwgdGhlIHJlcXVlc3QgdXNpbmdcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICB7QGxpbmsgY2FuY2VsQW5pbWF0aW9uRnJhbWV9LlxuICAgICAqL1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZTogckFGLFxuXG4gICAgLyoqXG4gICAgICogQ3Jvc3MgYnJvd3NlciB2ZXJzaW9uIG9mIFtjYW5jZWxBbmltYXRpb25GcmFtZV17QGxpbmsgaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL3dpbmRvdy9jYW5jZWxBbmltYXRpb25GcmFtZX0uXG4gICAgICpcbiAgICAgKiBDYW5jZWxzIGEgcHJldmlvdXNseSB1c2luZyBbcmVxdWVzdEFuaW1hdGlvbkZyYW1lXXtAbGluayBhbmltYXRpb25GcmFtZSNyZXF1ZXN0QW5pbWF0aW9uRnJhbWV9XG4gICAgICogc2NoZWR1bGVkIHJlcXVlc3QuXG4gICAgICpcbiAgICAgKiBVc2VkIGZvciBpbW1lZGlhdGVseSBzdG9wcGluZyB0aGUgcmVuZGVyIGxvb3Agd2l0aGluIHRoZSBFbmdpbmUuXG4gICAgICpcbiAgICAgKiBAbWV0aG9kICBjYW5jZWxBbmltYXRpb25GcmFtZVxuICAgICAqXG4gICAgICogQHBhcmFtICAge051bWJlcn0gICAgcmVxdWVzdElkIG9mIHRoZSBzY2hlZHVsZWQgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICByZXR1cm5lZCBieSBbcmVxdWVzdEFuaW1hdGlvbkZyYW1lXXtAbGluayBhbmltYXRpb25GcmFtZSNyZXF1ZXN0QW5pbWF0aW9uRnJhbWV9LlxuICAgICAqL1xuICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lOiBjQUZcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYW5pbWF0aW9uRnJhbWU7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICogXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICogXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKiBcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqIFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWU6IHJlcXVpcmUoJy4vYW5pbWF0aW9uRnJhbWUnKS5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUsXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWU6IHJlcXVpcmUoJy4vYW5pbWF0aW9uRnJhbWUnKS5jYW5jZWxBbmltYXRpb25GcmFtZVxufTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHBvbHlmaWxscyA9IHJlcXVpcmUoJy4uL3BvbHlmaWxscycpO1xudmFyIHJBRiA9IHBvbHlmaWxscy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG52YXIgY0FGID0gcG9seWZpbGxzLmNhbmNlbEFuaW1hdGlvbkZyYW1lO1xuXG4vKipcbiAqIEJvb2xlYW4gY29uc3RhbnQgaW5kaWNhdGluZyB3aGV0aGVyIHRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIGhhcyBhY2Nlc3NcbiAqIHRvIHRoZSBkb2N1bWVudC4gVGhlIGRvY3VtZW50IGlzIGJlaW5nIHVzZWQgaW4gb3JkZXIgdG8gc3Vic2NyaWJlIGZvclxuICogdmlzaWJpbGl0eWNoYW5nZSBldmVudHMgdXNlZCBmb3Igbm9ybWFsaXppbmcgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3BcbiAqIHRpbWUgd2hlbiBlLmcuIHdoZW4gc3dpdGNoaW5nIHRhYnMuXG4gKlxuICogQGNvbnN0YW50XG4gKiBAdHlwZSB7Qm9vbGVhbn1cbiAqL1xudmFyIERPQ1VNRU5UX0FDQ0VTUyA9IHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCc7XG5cbmlmIChET0NVTUVOVF9BQ0NFU1MpIHtcbiAgICB2YXIgVkVORE9SX0hJRERFTiwgVkVORE9SX1ZJU0lCSUxJVFlfQ0hBTkdFO1xuXG4gICAgLy8gT3BlcmEgMTIuMTAgYW5kIEZpcmVmb3ggMTggYW5kIGxhdGVyIHN1cHBvcnRcbiAgICBpZiAodHlwZW9mIGRvY3VtZW50LmhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgVkVORE9SX0hJRERFTiA9ICdoaWRkZW4nO1xuICAgICAgICBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UgPSAndmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tb3pIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIFZFTkRPUl9ISURERU4gPSAnbW96SGlkZGVuJztcbiAgICAgICAgVkVORE9SX1ZJU0lCSUxJVFlfQ0hBTkdFID0gJ21venZpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQubXNIaWRkZW4gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIFZFTkRPUl9ISURERU4gPSAnbXNIaWRkZW4nO1xuICAgICAgICBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UgPSAnbXN2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50LndlYmtpdEhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgVkVORE9SX0hJRERFTiA9ICd3ZWJraXRIaWRkZW4nO1xuICAgICAgICBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UgPSAnd2Via2l0dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxufVxuXG4vKipcbiAqIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgY2xhc3MgdXNlZCBmb3IgdXBkYXRpbmcgb2JqZWN0cyBvbiBhIGZyYW1lLWJ5LWZyYW1lLlxuICogU3luY2hyb25pemVzIHRoZSBgdXBkYXRlYCBtZXRob2QgaW52b2NhdGlvbnMgdG8gdGhlIHJlZnJlc2ggcmF0ZSBvZiB0aGVcbiAqIHNjcmVlbi4gTWFuYWdlcyB0aGUgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAtbG9vcCBieSBub3JtYWxpemluZyB0aGUgcGFzc2VkIGluXG4gKiB0aW1lc3RhbXAgd2hlbiBzd2l0Y2hpbmcgdGFicy5cbiAqXG4gKiBAY2xhc3MgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcFxuICovXG5mdW5jdGlvbiBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wKCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAvLyBSZWZlcmVuY2VzIHRvIG9iamVjdHMgdG8gYmUgdXBkYXRlZCBvbiBuZXh0IGZyYW1lLlxuICAgIHRoaXMuX3VwZGF0ZXMgPSBbXTtcblxuICAgIHRoaXMuX2xvb3BlciA9IGZ1bmN0aW9uKHRpbWUpIHtcbiAgICAgICAgX3RoaXMubG9vcCh0aW1lKTtcbiAgICB9O1xuICAgIHRoaXMuX3RpbWUgPSAwO1xuICAgIHRoaXMuX3N0b3BwZWRBdCA9IDA7XG4gICAgdGhpcy5fc2xlZXAgPSAwO1xuXG4gICAgLy8gSW5kaWNhdGVzIHdoZXRoZXIgdGhlIGVuZ2luZSBzaG91bGQgYmUgcmVzdGFydGVkIHdoZW4gdGhlIHRhYi8gd2luZG93IGlzXG4gICAgLy8gYmVpbmcgZm9jdXNlZCBhZ2FpbiAodmlzaWJpbGl0eSBjaGFuZ2UpLlxuICAgIHRoaXMuX3N0YXJ0T25WaXNpYmlsaXR5Q2hhbmdlID0gdHJ1ZTtcblxuICAgIC8vIHJlcXVlc3RJZCBhcyByZXR1cm5lZCBieSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgZnVuY3Rpb247XG4gICAgdGhpcy5fckFGID0gbnVsbDtcblxuICAgIHRoaXMuX3NsZWVwRGlmZiA9IHRydWU7XG5cbiAgICAvLyBUaGUgZW5naW5lIGlzIGJlaW5nIHN0YXJ0ZWQgb24gaW5zdGFudGlhdGlvbi5cbiAgICAvLyBUT0RPKGFsZXhhbmRlckd1Z2VsKVxuICAgIHRoaXMuc3RhcnQoKTtcblxuICAgIC8vIFRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIHN1cHBvcnRzIHJ1bm5pbmcgaW4gYSBub24tYnJvd3NlclxuICAgIC8vIGVudmlyb25tZW50IChlLmcuIFdvcmtlcikuXG4gICAgaWYgKERPQ1VNRU5UX0FDQ0VTUykge1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFZFTkRPUl9WSVNJQklMSVRZX0NIQU5HRSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBfdGhpcy5fb25WaXNpYmlsaXR5Q2hhbmdlKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLyoqXG4gKiBIYW5kbGUgdGhlIHN3aXRjaGluZyBvZiB0YWJzLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuX29uVmlzaWJpbGl0eUNoYW5nZSA9IGZ1bmN0aW9uIF9vblZpc2liaWxpdHlDaGFuZ2UoKSB7XG4gICAgaWYgKGRvY3VtZW50W1ZFTkRPUl9ISURERU5dKSB7XG4gICAgICAgIHRoaXMuX29uVW5mb2N1cygpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fb25Gb2N1cygpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHRvIGJlIGludm9rZWQgYXMgc29vbiBhcyB0aGUgd2luZG93LyB0YWIgaXMgYmVpbmdcbiAqIGZvY3VzZWQgYWZ0ZXIgYSB2aXNpYmlsdGl5IGNoYW5nZS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLl9vbkZvY3VzID0gZnVuY3Rpb24gX29uRm9jdXMoKSB7XG4gICAgaWYgKHRoaXMuX3N0YXJ0T25WaXNpYmlsaXR5Q2hhbmdlKSB7XG4gICAgICAgIHRoaXMuX3N0YXJ0KCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCBhcyBzb29uIGFzIHRoZSB3aW5kb3cvIHRhYiBpcyBiZWluZ1xuICogdW5mb2N1c2VkIChoaWRkZW4pIGFmdGVyIGEgdmlzaWJpbHRpeSBjaGFuZ2UuXG4gKlxuICogQG1ldGhvZCAgX29uRm9jdXNcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuX29uVW5mb2N1cyA9IGZ1bmN0aW9uIF9vblVuZm9jdXMoKSB7XG4gICAgdGhpcy5fc3RvcCgpO1xufTtcblxuLyoqXG4gKiBTdGFydHMgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AuIFdoZW4gc3dpdGNoaW5nIHRvIGEgZGlmZmVybnQgdGFiL1xuICogd2luZG93IChjaGFuZ2luZyB0aGUgdmlzaWJpbHRpeSksIHRoZSBlbmdpbmUgd2lsbCBiZSByZXRhcnRlZCB3aGVuIHN3aXRjaGluZ1xuICogYmFjayB0byBhIHZpc2libGUgc3RhdGUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiBzdGFydCgpIHtcbiAgICBpZiAoIXRoaXMuX3J1bm5pbmcpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRPblZpc2liaWxpdHlDaGFuZ2UgPSB0cnVlO1xuICAgICAgICB0aGlzLl9zdGFydCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgdmVyc2lvbiBvZiBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wJ3Mgc3RhcnQgZnVuY3Rpb24sIG5vdCBhZmZlY3RpbmdcbiAqIGJlaGF2aW9yIG9uIHZpc2liaWx0eSBjaGFuZ2UuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbipcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLl9zdGFydCA9IGZ1bmN0aW9uIF9zdGFydCgpIHtcbiAgICB0aGlzLl9ydW5uaW5nID0gdHJ1ZTtcbiAgICB0aGlzLl9zbGVlcERpZmYgPSB0cnVlO1xuICAgIHRoaXMuX3JBRiA9IHJBRih0aGlzLl9sb29wZXIpO1xufTtcblxuLyoqXG4gKiBTdG9wcyB0aGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIHN0b3AoKSB7XG4gICAgaWYgKHRoaXMuX3J1bm5pbmcpIHtcbiAgICAgICAgdGhpcy5fc3RhcnRPblZpc2liaWxpdHlDaGFuZ2UgPSBmYWxzZTtcbiAgICAgICAgdGhpcy5fc3RvcCgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgdmVyc2lvbiBvZiBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wJ3Mgc3RvcCBmdW5jdGlvbiwgbm90IGFmZmVjdGluZ1xuICogYmVoYXZpb3Igb24gdmlzaWJpbHR5IGNoYW5nZS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLl9zdG9wID0gZnVuY3Rpb24gX3N0b3AoKSB7XG4gICAgdGhpcy5fcnVubmluZyA9IGZhbHNlO1xuICAgIHRoaXMuX3N0b3BwZWRBdCA9IHRoaXMuX3RpbWU7XG5cbiAgICAvLyBCdWcgaW4gb2xkIHZlcnNpb25zIG9mIEZ4LiBFeHBsaWNpdGx5IGNhbmNlbC5cbiAgICBjQUYodGhpcy5fckFGKTtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIHRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIGlzIGN1cnJlbnRseSBydW5uaW5nIG9yIG5vdC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gYm9vbGVhbiB2YWx1ZSBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlXG4gKiBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wIGlzIGN1cnJlbnRseSBydW5uaW5nIG9yIG5vdFxuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5pc1J1bm5pbmcgPSBmdW5jdGlvbiBpc1J1bm5pbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3J1bm5pbmc7XG59O1xuXG4vKipcbiAqIFVwZGF0ZXMgYWxsIHJlZ2lzdGVyZWQgb2JqZWN0cy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRpbWUgaGlnaCByZXNvbHV0aW9uIHRpbXN0YW1wIHVzZWQgZm9yIGludm9raW5nIHRoZSBgdXBkYXRlYFxuICogbWV0aG9kIG9uIGFsbCByZWdpc3RlcmVkIG9iamVjdHNcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLnN0ZXAgPSBmdW5jdGlvbiBzdGVwICh0aW1lKSB7XG4gICAgdGhpcy5fdGltZSA9IHRpbWU7XG4gICAgaWYgKHRoaXMuX3NsZWVwRGlmZikge1xuICAgICAgICB0aGlzLl9zbGVlcCArPSB0aW1lIC0gdGhpcy5fc3RvcHBlZEF0O1xuICAgICAgICB0aGlzLl9zbGVlcERpZmYgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBUaGUgc2FtZSB0aW1ldGFtcCB3aWxsIGJlIGVtaXR0ZWQgaW1tZWRpYXRlbHkgYmVmb3JlIGFuZCBhZnRlciB2aXNpYmlsaXR5XG4gICAgLy8gY2hhbmdlLlxuICAgIHZhciBub3JtYWxpemVkVGltZSA9IHRpbWUgLSB0aGlzLl9zbGVlcDtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fdXBkYXRlcy5sZW5ndGggOyBpIDwgbGVuIDsgaSsrKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZXNbaV0udXBkYXRlKG5vcm1hbGl6ZWRUaW1lKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIE1ldGhvZCBiZWluZyBjYWxsZWQgYnkgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgb24gZXZlcnkgcGFpbnQuIEluZGlyZWN0bHlcbiAqIHJlY3Vyc2l2ZSBieSBzY2hlZHVsaW5nIGEgZnV0dXJlIGludm9jYXRpb24gb2YgaXRzZWxmIG9uIHRoZSBuZXh0IHBhaW50LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGltZSBoaWdoIHJlc29sdXRpb24gdGltc3RhbXAgdXNlZCBmb3IgaW52b2tpbmcgdGhlIGB1cGRhdGVgXG4gKiBtZXRob2Qgb24gYWxsIHJlZ2lzdGVyZWQgb2JqZWN0c1xuICogQHJldHVybiB7UmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcH0gdGhpc1xuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5sb29wID0gZnVuY3Rpb24gbG9vcCh0aW1lKSB7XG4gICAgdGhpcy5zdGVwKHRpbWUpO1xuICAgIHRoaXMuX3JBRiA9IHJBRih0aGlzLl9sb29wZXIpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZWdpc3RlcmVzIGFuIHVwZGF0ZWFibGUgb2JqZWN0IHdoaWNoIGB1cGRhdGVgIG1ldGhvZCBzaG91bGQgYmUgaW52b2tlZCBvblxuICogZXZlcnkgcGFpbnQsIHN0YXJ0aW5nIG9uIHRoZSBuZXh0IHBhaW50IChhc3N1bWluZyB0aGVcbiAqIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgaXMgcnVubmluZykuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB1cGRhdGVhYmxlIG9iamVjdCB0byBiZSB1cGRhdGVkXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSB1cGRhdGVhYmxlLnVwZGF0ZSB1cGRhdGUgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIHRoZVxuICogcmVnaXN0ZXJlZCBvYmplY3RcbiAqXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSh1cGRhdGVhYmxlKSB7XG4gICAgaWYgKHRoaXMuX3VwZGF0ZXMuaW5kZXhPZih1cGRhdGVhYmxlKSA9PT0gLTEpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlcy5wdXNoKHVwZGF0ZWFibGUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRGVyZWdpc3RlcnMgYW4gdXBkYXRlYWJsZSBvYmplY3QgcHJldmlvdXNseSByZWdpc3RlcmVkIHVzaW5nIGB1cGRhdGVgIHRvIGJlXG4gKiBubyBsb25nZXIgdXBkYXRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHVwZGF0ZWFibGUgdXBkYXRlYWJsZSBvYmplY3QgcHJldmlvdXNseSByZWdpc3RlcmVkIHVzaW5nXG4gKiBgdXBkYXRlYFxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUubm9Mb25nZXJVcGRhdGUgPSBmdW5jdGlvbiBub0xvbmdlclVwZGF0ZSh1cGRhdGVhYmxlKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fdXBkYXRlcy5pbmRleE9mKHVwZGF0ZWFibGUpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIHRoaXMuX3VwZGF0ZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3A7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBDb250ZXh0ID0gcmVxdWlyZSgnLi9Db250ZXh0Jyk7XG52YXIgaW5qZWN0Q1NTID0gcmVxdWlyZSgnLi9pbmplY3QtY3NzJyk7XG5cbi8qKlxuICogSW5zdGFudGlhdGVzIGEgbmV3IENvbXBvc2l0b3IuXG4gKiBUaGUgQ29tcG9zaXRvciByZWNlaXZlcyBkcmF3IGNvbW1hbmRzIGZybSB0aGUgVUlNYW5hZ2VyIGFuZCByb3V0ZXMgdGhlIHRvIHRoZVxuICogcmVzcGVjdGl2ZSBjb250ZXh0IG9iamVjdHMuXG4gKlxuICogVXBvbiBjcmVhdGlvbiwgaXQgaW5qZWN0cyBhIHN0eWxlc2hlZXQgdXNlZCBmb3Igc3R5bGluZyB0aGUgaW5kaXZpZHVhbFxuICogcmVuZGVyZXJzIHVzZWQgaW4gdGhlIGNvbnRleHQgb2JqZWN0cy5cbiAqXG4gKiBAY2xhc3MgQ29tcG9zaXRvclxuICogQGNvbnN0cnVjdG9yXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBDb21wb3NpdG9yKCkge1xuICAgIGluamVjdENTUygpO1xuXG4gICAgdGhpcy5fY29udGV4dHMgPSB7fTtcbiAgICB0aGlzLl9vdXRDb21tYW5kcyA9IFtdO1xuICAgIHRoaXMuX2luQ29tbWFuZHMgPSBbXTtcbiAgICB0aGlzLl90aW1lID0gbnVsbDtcblxuICAgIHRoaXMuX3Jlc2l6ZWQgPSBmYWxzZTtcblxuICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdGhpcy5fcmVzaXplZCA9IHRydWU7XG4gICAgfSk7XG59XG5cbi8qKlxuICogUmV0cmlldmVzIHRoZSB0aW1lIGJlaW5nIHVzZWQgYnkgdGhlIGludGVybmFsIGNsb2NrIG1hbmFnZWQgYnlcbiAqIGBGYW1vdXNFbmdpbmVgLlxuICpcbiAqIFRoZSB0aW1lIGlzIGJlaW5nIHBhc3NlZCBpbnRvIGNvcmUgYnkgdGhlIEVuZ2luZSB0aHJvdWdoIHRoZSBVSU1hbmFnZXIuXG4gKiBTaW5jZSBjb3JlIGhhcyB0aGUgYWJpbGl0eSB0byBzY2FsZSB0aGUgdGltZSwgdGhlIHRpbWUgbmVlZHMgdG8gYmUgcGFzc2VkXG4gKiBiYWNrIHRvIHRoZSByZW5kZXJpbmcgc3lzdGVtLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRpbWUgVGhlIGNsb2NrIHRpbWUgdXNlZCBpbiBjb3JlLlxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5nZXRUaW1lID0gZnVuY3Rpb24gZ2V0VGltZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGltZTtcbn07XG5cbi8qKlxuICogU2NoZWR1bGVzIGFuIGV2ZW50IHRvIGJlIHNlbnQgdGhlIG5leHQgdGltZSB0aGUgb3V0IGNvbW1hbmQgcXVldWUgaXMgYmVpbmdcbiAqIGZsdXNoZWQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHBhdGggUmVuZGVyIHBhdGggdG8gdGhlIG5vZGUgdGhlIGV2ZW50IHNob3VsZCBiZSB0cmlnZ2VyZWRcbiAqIG9uICgqdGFyZ2V0ZWQgZXZlbnQqKVxuICogQHBhcmFtICB7U3RyaW5nfSBldiBFdmVudCB0eXBlXG4gKiBAcGFyYW0gIHtPYmplY3R9IHBheWxvYWQgRXZlbnQgb2JqZWN0IChzZXJpYWxpemFibGUgdXNpbmcgc3RydWN0dXJlZCBjbG9uaW5nXG4gKiBhbGdvcml0aG0pXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuc2VuZEV2ZW50ID0gZnVuY3Rpb24gc2VuZEV2ZW50KHBhdGgsIGV2LCBwYXlsb2FkKSB7XG4gICAgdGhpcy5fb3V0Q29tbWFuZHMucHVzaCgnV0lUSCcsIHBhdGgsICdUUklHR0VSJywgZXYsIHBheWxvYWQpO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgbWV0aG9kIHVzZWQgZm9yIG5vdGlmeWluZyBleHRlcm5hbGx5XG4gKiByZXNpemVkIGNvbnRleHRzIChlLmcuIGJ5IHJlc2l6aW5nIHRoZSBicm93c2VyIHdpbmRvdykuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHNlbGVjdG9yIHJlbmRlciBwYXRoIHRvIHRoZSBub2RlIChjb250ZXh0KSB0aGF0IHNob3VsZCBiZVxuICogcmVzaXplZFxuICogQHBhcmFtICB7QXJyYXl9IHNpemUgbmV3IGNvbnRleHQgc2l6ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLnNlbmRSZXNpemUgPSBmdW5jdGlvbiBzZW5kUmVzaXplIChzZWxlY3Rvciwgc2l6ZSkge1xuICAgIHRoaXMuc2VuZEV2ZW50KHNlbGVjdG9yLCAnQ09OVEVYVF9SRVNJWkUnLCBzaXplKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIG1ldGhvZCB1c2VkIGJ5IGBkcmF3Q29tbWFuZHNgLlxuICogU3Vic2VxdWVudCBjb21tYW5kcyBhcmUgYmVpbmcgYXNzb2NpYXRlZCB3aXRoIHRoZSBub2RlIGRlZmluZWQgdGhlIHRoZSBwYXRoXG4gKiBmb2xsb3dpbmcgdGhlIGBXSVRIYCBjb21tYW5kLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBpdGVyYXRvciBwb3NpdGlvbiBpbmRleCB3aXRoaW4gdGhlIGNvbW1hbmRzIHF1ZXVlXG4gKiBAcGFyYW0gIHtBcnJheX0gY29tbWFuZHMgcmVtYWluaW5nIG1lc3NhZ2UgcXVldWUgcmVjZWl2ZWQsIHVzZWQgdG9cbiAqIHNoaWZ0IHNpbmdsZSBtZXNzYWdlcyBmcm9tXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuaGFuZGxlV2l0aCA9IGZ1bmN0aW9uIGhhbmRsZVdpdGggKGl0ZXJhdG9yLCBjb21tYW5kcykge1xuICAgIHZhciBwYXRoID0gY29tbWFuZHNbaXRlcmF0b3JdO1xuICAgIHZhciBwYXRoQXJyID0gcGF0aC5zcGxpdCgnLycpO1xuICAgIHZhciBjb250ZXh0ID0gdGhpcy5nZXRPclNldENvbnRleHQocGF0aEFyci5zaGlmdCgpKTtcbiAgICByZXR1cm4gY29udGV4dC5yZWNlaXZlKHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcik7XG59O1xuXG4vKipcbiAqIFJldHJpZXZlcyB0aGUgdG9wLWxldmVsIENvbnRleHQgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYXNzZWQgaW4gZG9jdW1lbnRcbiAqIHF1ZXJ5IHNlbGVjdG9yLiBJZiBubyBzdWNoIENvbnRleHQgZXhpc3RzLCBhIG5ldyBvbmUgd2lsbCBiZSBpbnN0YW50aWF0ZWQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHNlbGVjdG9yIGRvY3VtZW50IHF1ZXJ5IHNlbGVjdG9yIHVzZWQgZm9yIHJldHJpZXZpbmcgdGhlXG4gKiBET00gbm9kZSB0aGUgVmlydHVhbEVsZW1lbnQgc2hvdWxkIGJlIGF0dGFjaGVkIHRvXG4gKlxuICogQHJldHVybiB7Q29udGV4dH0gY29udGV4dFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5nZXRPclNldENvbnRleHQgPSBmdW5jdGlvbiBnZXRPclNldENvbnRleHQoc2VsZWN0b3IpIHtcbiAgICBpZiAodGhpcy5fY29udGV4dHNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0c1tzZWxlY3Rvcl07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgY29udGV4dCA9IG5ldyBDb250ZXh0KHNlbGVjdG9yLCB0aGlzKTtcbiAgICAgICAgdGhpcy5fY29udGV4dHNbc2VsZWN0b3JdID0gY29udGV4dDtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgbWV0aG9kIHVzZWQgYnkgYGRyYXdDb21tYW5kc2AuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGl0ZXJhdG9yIHBvc2l0aW9uIGluZGV4IHdpdGhpbiB0aGUgY29tbWFuZCBxdWV1ZVxuICogQHBhcmFtICB7QXJyYXl9IGNvbW1hbmRzIHJlbWFpbmluZyBtZXNzYWdlIHF1ZXVlIHJlY2VpdmVkLCB1c2VkIHRvXG4gKiBzaGlmdCBzaW5nbGUgbWVzc2FnZXNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5naXZlU2l6ZUZvciA9IGZ1bmN0aW9uIGdpdmVTaXplRm9yKGl0ZXJhdG9yLCBjb21tYW5kcykge1xuICAgIHZhciBzZWxlY3RvciA9IGNvbW1hbmRzW2l0ZXJhdG9yXTtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuZ2V0T3JTZXRDb250ZXh0KHNlbGVjdG9yKS5nZXRSb290U2l6ZSgpO1xuICAgIHRoaXMuc2VuZFJlc2l6ZShzZWxlY3Rvciwgc2l6ZSk7XG59O1xuXG4vKipcbiAqIFByb2Nlc3NlcyB0aGUgcHJldmlvdXNseSB2aWEgYHJlY2VpdmVDb21tYW5kc2AgdXBkYXRlZCBpbmNvbWluZyBcImluXCJcbiAqIGNvbW1hbmQgcXVldWUuXG4gKiBDYWxsZWQgYnkgVUlNYW5hZ2VyIG9uIGEgZnJhbWUgYnkgZnJhbWUgYmFzaXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBvdXRDb21tYW5kcyBzZXQgb2YgY29tbWFuZHMgdG8gYmUgc2VudCBiYWNrXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmRyYXdDb21tYW5kcyA9IGZ1bmN0aW9uIGRyYXdDb21tYW5kcygpIHtcbiAgICB2YXIgY29tbWFuZHMgPSB0aGlzLl9pbkNvbW1hbmRzO1xuICAgIHZhciBsb2NhbEl0ZXJhdG9yID0gMDtcbiAgICB2YXIgY29tbWFuZCA9IGNvbW1hbmRzW2xvY2FsSXRlcmF0b3JdO1xuICAgIHdoaWxlIChjb21tYW5kKSB7XG4gICAgICAgIHN3aXRjaCAoY29tbWFuZCkge1xuICAgICAgICAgICAgY2FzZSAnVElNRSc6XG4gICAgICAgICAgICAgICAgdGhpcy5fdGltZSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdXSVRIJzpcbiAgICAgICAgICAgICAgICBsb2NhbEl0ZXJhdG9yID0gdGhpcy5oYW5kbGVXaXRoKCsrbG9jYWxJdGVyYXRvciwgY29tbWFuZHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnTkVFRF9TSVpFX0ZPUic6XG4gICAgICAgICAgICAgICAgdGhpcy5naXZlU2l6ZUZvcigrK2xvY2FsSXRlcmF0b3IsIGNvbW1hbmRzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjb21tYW5kID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICB9XG5cbiAgICAvLyBUT0RPOiBTd2l0Y2ggdG8gYXNzb2NpYXRpdmUgYXJyYXlzIGhlcmUuLi5cblxuICAgIGZvciAodmFyIGtleSBpbiB0aGlzLl9jb250ZXh0cykge1xuICAgICAgICB0aGlzLl9jb250ZXh0c1trZXldLmRyYXcoKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fcmVzaXplZCkge1xuICAgICAgICB0aGlzLnVwZGF0ZVNpemUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5fb3V0Q29tbWFuZHM7XG59O1xuXG5cbi8qKlxuICogVXBkYXRlcyB0aGUgc2l6ZSBvZiBhbGwgcHJldmlvdXNseSByZWdpc3RlcmVkIGNvbnRleHQgb2JqZWN0cy5cbiAqIFRoaXMgcmVzdWx0cyBpbnRvIENPTlRFWFRfUkVTSVpFIGV2ZW50cyBiZWluZyBzZW50IGFuZCB0aGUgcm9vdCBlbGVtZW50c1xuICogdXNlZCBieSB0aGUgaW5kaXZpZHVhbCByZW5kZXJlcnMgYmVpbmcgcmVzaXplZCB0byB0aGUgdGhlIERPTVJlbmRlcmVyJ3Mgcm9vdFxuICogc2l6ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUudXBkYXRlU2l6ZSA9IGZ1bmN0aW9uIHVwZGF0ZVNpemUoKSB7XG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gdGhpcy5fY29udGV4dHMpIHtcbiAgICAgICAgdGhpcy5fY29udGV4dHNbc2VsZWN0b3JdLnVwZGF0ZVNpemUoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIFVzZWQgYnkgVGhyZWFkTWFuYWdlciB0byB1cGRhdGUgdGhlIGludGVybmFsIHF1ZXVlIG9mIGluY29taW5nIGNvbW1hbmRzLlxuICogUmVjZWl2aW5nIGNvbW1hbmRzIGRvZXMgbm90IGltbWVkaWF0ZWx5IHN0YXJ0IHRoZSByZW5kZXJpbmcgcHJvY2Vzcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtICB7QXJyYXl9IGNvbW1hbmRzIGNvbW1hbmQgcXVldWUgdG8gYmUgcHJvY2Vzc2VkIGJ5IHRoZSBjb21wb3NpdG9yJ3NcbiAqIGBkcmF3Q29tbWFuZHNgIG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLnJlY2VpdmVDb21tYW5kcyA9IGZ1bmN0aW9uIHJlY2VpdmVDb21tYW5kcyhjb21tYW5kcykge1xuICAgIHZhciBsZW4gPSBjb21tYW5kcy5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB0aGlzLl9pbkNvbW1hbmRzLnB1c2goY29tbWFuZHNbaV0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogRmx1c2hlcyB0aGUgcXVldWUgb2Ygb3V0Z29pbmcgXCJvdXRcIiBjb21tYW5kcy5cbiAqIENhbGxlZCBieSBUaHJlYWRNYW5hZ2VyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5jbGVhckNvbW1hbmRzID0gZnVuY3Rpb24gY2xlYXJDb21tYW5kcygpIHtcbiAgICB0aGlzLl9pbkNvbW1hbmRzLmxlbmd0aCA9IDA7XG4gICAgdGhpcy5fb3V0Q29tbWFuZHMubGVuZ3RoID0gMDtcbiAgICB0aGlzLl9yZXNpemVkID0gZmFsc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvc2l0b3I7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBXZWJHTFJlbmRlcmVyID0gcmVxdWlyZSgnLi4vd2ViZ2wtcmVuZGVyZXJzL1dlYkdMUmVuZGVyZXInKTtcbnZhciBDYW1lcmEgPSByZXF1aXJlKCcuLi9jb21wb25lbnRzL0NhbWVyYScpO1xudmFyIERPTVJlbmRlcmVyID0gcmVxdWlyZSgnLi4vZG9tLXJlbmRlcmVycy9ET01SZW5kZXJlcicpO1xuXG4vKipcbiAqIENvbnRleHQgaXMgYSByZW5kZXIgbGF5ZXIgd2l0aCBpdHMgb3duIFdlYkdMUmVuZGVyZXIgYW5kIERPTVJlbmRlcmVyLlxuICogSXQgaXMgdGhlIGludGVyZmFjZSBiZXR3ZWVuIHRoZSBDb21wb3NpdG9yIHdoaWNoIHJlY2VpdmVzIGNvbW1hbmRzXG4gKiBhbmQgdGhlIHJlbmRlcmVycyB0aGF0IGludGVycHJldCB0aGVtLiBJdCBhbHNvIHJlbGF5cyBpbmZvcm1hdGlvbiB0b1xuICogdGhlIHJlbmRlcmVycyBhYm91dCByZXNpemluZy5cbiAqXG4gKiBUaGUgRE9NRWxlbWVudCBhdCB0aGUgZ2l2ZW4gcXVlcnkgc2VsZWN0b3IgaXMgdXNlZCBhcyB0aGUgcm9vdC4gQVxuICogbmV3IERPTUVsZW1lbnQgaXMgYXBwZW5kZWQgdG8gdGhpcyByb290IGVsZW1lbnQsIGFuZCB1c2VkIGFzIHRoZVxuICogcGFyZW50IGVsZW1lbnQgZm9yIGFsbCBGYW1vdXMgRE9NIHJlbmRlcmluZyBhdCB0aGlzIGNvbnRleHQuIEFcbiAqIGNhbnZhcyBpcyBhZGRlZCBhbmQgdXNlZCBmb3IgYWxsIFdlYkdMIHJlbmRlcmluZyBhdCB0aGlzIGNvbnRleHQuXG4gKlxuICogQGNsYXNzIENvbnRleHRcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvciBRdWVyeSBzZWxlY3RvciB1c2VkIHRvIGxvY2F0ZSByb290IGVsZW1lbnQgb2ZcbiAqIGNvbnRleHQgbGF5ZXIuXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgQ29tcG9zaXRvciByZWZlcmVuY2UgdG8gcGFzcyBkb3duIHRvXG4gKiBXZWJHTFJlbmRlcmVyLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIENvbnRleHQoc2VsZWN0b3IsIGNvbXBvc2l0b3IpIHtcbiAgICB0aGlzLl9jb21wb3NpdG9yID0gY29tcG9zaXRvcjtcbiAgICB0aGlzLl9yb290RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIHRoaXMuX3NlbGVjdG9yID0gc2VsZWN0b3I7XG5cbiAgICAvLyBDcmVhdGUgRE9NIGVsZW1lbnQgdG8gYmUgdXNlZCBhcyByb290IGZvciBhbGwgZmFtb3VzIERPTVxuICAgIC8vIHJlbmRlcmluZyBhbmQgYXBwZW5kIGVsZW1lbnQgdG8gdGhlIHJvb3QgZWxlbWVudC5cblxuICAgIHZhciBET01MYXllckVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5fcm9vdEVsLmFwcGVuZENoaWxkKERPTUxheWVyRWwpO1xuXG4gICAgLy8gSW5zdGFudGlhdGUgcmVuZGVyZXJzXG5cbiAgICB0aGlzLkRPTVJlbmRlcmVyID0gbmV3IERPTVJlbmRlcmVyKERPTUxheWVyRWwsIHNlbGVjdG9yLCBjb21wb3NpdG9yKTtcbiAgICB0aGlzLldlYkdMUmVuZGVyZXIgPSBudWxsO1xuICAgIHRoaXMuY2FudmFzID0gbnVsbDtcblxuICAgIC8vIFN0YXRlIGhvbGRlcnNcblxuICAgIHRoaXMuX3JlbmRlclN0YXRlID0ge1xuICAgICAgICBwcm9qZWN0aW9uVHlwZTogQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OLFxuICAgICAgICBwZXJzcGVjdGl2ZVRyYW5zZm9ybTogbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pLFxuICAgICAgICB2aWV3VHJhbnNmb3JtOiBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSksXG4gICAgICAgIHZpZXdEaXJ0eTogZmFsc2UsXG4gICAgICAgIHBlcnNwZWN0aXZlRGlydHk6IGZhbHNlXG4gICAgfTtcblxuICAgIHRoaXMuX3NpemUgPSBbXTtcbiAgICB0aGlzLl9jaGlsZHJlbiA9IHt9O1xuICAgIHRoaXMuX2VsZW1lbnRIYXNoID0ge307XG5cbiAgICB0aGlzLl9tZXNoVHJhbnNmb3JtID0gW107XG4gICAgdGhpcy5fbWVzaFNpemUgPSBbMCwgMCwgMF07XG59XG5cbi8qKlxuICogUXVlcmllcyBET01SZW5kZXJlciBzaXplIGFuZCB1cGRhdGVzIGNhbnZhcyBzaXplLiBSZWxheXMgc2l6ZSBpbmZvcm1hdGlvbiB0b1xuICogV2ViR0xSZW5kZXJlci5cbiAqXG4gKiBAcmV0dXJuIHtDb250ZXh0fSB0aGlzXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnVwZGF0ZVNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5ld1NpemUgPSB0aGlzLkRPTVJlbmRlcmVyLmdldFNpemUoKTtcbiAgICB0aGlzLl9jb21wb3NpdG9yLnNlbmRSZXNpemUodGhpcy5fc2VsZWN0b3IsIG5ld1NpemUpO1xuXG4gICAgaWYgKHRoaXMuY2FudmFzICYmIHRoaXMuV2ViR0xSZW5kZXJlcikge1xuICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIudXBkYXRlU2l6ZShuZXdTaXplKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRHJhdyBmdW5jdGlvbiBjYWxsZWQgYWZ0ZXIgYWxsIGNvbW1hbmRzIGhhdmUgYmVlbiBoYW5kbGVkIGZvciBjdXJyZW50IGZyYW1lLlxuICogSXNzdWVzIGRyYXcgY29tbWFuZHMgdG8gYWxsIHJlbmRlcmVycyB3aXRoIGN1cnJlbnQgcmVuZGVyU3RhdGUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiBkcmF3KCkge1xuICAgIHRoaXMuRE9NUmVuZGVyZXIuZHJhdyh0aGlzLl9yZW5kZXJTdGF0ZSk7XG4gICAgaWYgKHRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5XZWJHTFJlbmRlcmVyLmRyYXcodGhpcy5fcmVuZGVyU3RhdGUpO1xuXG4gICAgaWYgKHRoaXMuX3JlbmRlclN0YXRlLnBlcnNwZWN0aXZlRGlydHkpIHRoaXMuX3JlbmRlclN0YXRlLnBlcnNwZWN0aXZlRGlydHkgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5fcmVuZGVyU3RhdGUudmlld0RpcnR5KSB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3RGlydHkgPSBmYWxzZTtcbn07XG5cbi8qKlxuICogR2V0cyB0aGUgc2l6ZSBvZiB0aGUgcGFyZW50IGVsZW1lbnQgb2YgdGhlIERPTVJlbmRlcmVyIGZvciB0aGlzIGNvbnRleHQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLmdldFJvb3RTaXplID0gZnVuY3Rpb24gZ2V0Um9vdFNpemUoKSB7XG4gICAgcmV0dXJuIHRoaXMuRE9NUmVuZGVyZXIuZ2V0U2l6ZSgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGluaXRpYWxpemF0aW9uIG9mIFdlYkdMUmVuZGVyZXIgd2hlbiBuZWNlc3NhcnksIGluY2x1ZGluZyBjcmVhdGlvblxuICogb2YgdGhlIGNhbnZhcyBlbGVtZW50IGFuZCBpbnN0YW50aWF0aW9uIG9mIHRoZSByZW5kZXJlci4gQWxzbyB1cGRhdGVzIHNpemVcbiAqIHRvIHBhc3Mgc2l6ZSBpbmZvcm1hdGlvbiB0byB0aGUgcmVuZGVyZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLmluaXRXZWJHTCA9IGZ1bmN0aW9uIGluaXRXZWJHTCgpIHtcbiAgICB0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgIHRoaXMuX3Jvb3RFbC5hcHBlbmRDaGlsZCh0aGlzLmNhbnZhcyk7XG4gICAgdGhpcy5XZWJHTFJlbmRlcmVyID0gbmV3IFdlYkdMUmVuZGVyZXIodGhpcy5jYW52YXMsIHRoaXMuX2NvbXBvc2l0b3IpO1xuICAgIHRoaXMudXBkYXRlU2l6ZSgpO1xufTtcblxuLyoqXG4gKiBIYW5kbGVzIGRlbGVnYXRpb24gb2YgY29tbWFuZHMgdG8gcmVuZGVyZXJzIG9mIHRoaXMgY29udGV4dC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggU3RyaW5nIHVzZWQgYXMgaWRlbnRpZmllciBvZiBhIGdpdmVuIG5vZGUgaW4gdGhlXG4gKiBzY2VuZSBncmFwaC5cbiAqIEBwYXJhbSB7QXJyYXl9IGNvbW1hbmRzIExpc3Qgb2YgYWxsIGNvbW1hbmRzIGZyb20gdGhpcyBmcmFtZS5cbiAqIEBwYXJhbSB7TnVtYmVyfSBpdGVyYXRvciBOdW1iZXIgaW5kaWNhdGluZyBwcm9ncmVzcyB0aHJvdWdoIHRoZSBjb21tYW5kXG4gKiBxdWV1ZS5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGl0ZXJhdG9yIGluZGljYXRpbmcgcHJvZ3Jlc3MgdGhyb3VnaCB0aGUgY29tbWFuZCBxdWV1ZS5cbiAqL1xuQ29udGV4dC5wcm90b3R5cGUucmVjZWl2ZSA9IGZ1bmN0aW9uIHJlY2VpdmUocGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgdmFyIGxvY2FsSXRlcmF0b3IgPSBpdGVyYXRvcjtcblxuICAgIHZhciBjb21tYW5kID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICB0aGlzLkRPTVJlbmRlcmVyLmxvYWRQYXRoKHBhdGgpO1xuICAgIHRoaXMuRE9NUmVuZGVyZXIuZmluZFRhcmdldCgpO1xuICAgIHdoaWxlIChjb21tYW5kKSB7XG5cbiAgICAgICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAgICAgICBjYXNlICdJTklUX0RPTSc6XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5pbnNlcnRFbChjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnRE9NX1JFTkRFUl9TSVpFJzpcbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLmdldFNpemVPZihjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnQ0hBTkdFX1RSQU5TRk9STSc6XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAgOyBpIDwgMTYgOyBpKyspIHRoaXMuX21lc2hUcmFuc2Zvcm1baV0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5zZXRNYXRyaXgodGhpcy5fbWVzaFRyYW5zZm9ybSk7XG5cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKVxuICAgICAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0Q3V0b3V0VW5pZm9ybShwYXRoLCAndV90cmFuc2Zvcm0nLCB0aGlzLl9tZXNoVHJhbnNmb3JtKTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdDSEFOR0VfU0laRSc6XG4gICAgICAgICAgICAgICAgdmFyIHdpZHRoID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB2YXIgaGVpZ2h0ID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuRE9NUmVuZGVyZXIuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21lc2hTaXplWzBdID0gd2lkdGg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX21lc2hTaXplWzFdID0gaGVpZ2h0O1xuICAgICAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0Q3V0b3V0VW5pZm9ybShwYXRoLCAndV9zaXplJywgdGhpcy5fbWVzaFNpemUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnQ0hBTkdFX1BST1BFUlRZJzpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5zZXRQcm9wZXJ0eShjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLCBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnQ0hBTkdFX0NPTlRFTlQnOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuV2ViR0xSZW5kZXJlci5nZXRPclNldEN1dG91dChwYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLnNldENvbnRlbnQoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0NIQU5HRV9BVFRSSUJVVEUnOlxuICAgICAgICAgICAgICAgIGlmICh0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuV2ViR0xSZW5kZXJlci5nZXRPclNldEN1dG91dChwYXRoKTtcbiAgICAgICAgICAgICAgICB0aGlzLkRPTVJlbmRlcmVyLnNldEF0dHJpYnV0ZShjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLCBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnQUREX0NMQVNTJzpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5hZGRDbGFzcyhjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnUkVNT1ZFX0NMQVNTJzpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5yZW1vdmVDbGFzcyhjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnU1VCU0NSSUJFJzpcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLldlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgICAgICAgICAgICAgdGhpcy5ET01SZW5kZXJlci5zdWJzY3JpYmUoY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSwgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX1NFVF9EUkFXX09QVElPTlMnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRNZXNoT3B0aW9ucyhwYXRoLCBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfQU1CSUVOVF9MSUdIVCc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldEFtYmllbnRMaWdodENvbG9yKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfTElHSFRfUE9TSVRJT04nOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRMaWdodFBvc2l0aW9uKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfTElHSFRfQ09MT1InOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5zZXRMaWdodENvbG9yKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnTUFURVJJQUxfSU5QVVQnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5oYW5kbGVNYXRlcmlhbElucHV0KFxuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfU0VUX0dFT01FVFJZJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0R2VvbWV0cnkoXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0sXG4gICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9VTklGT1JNUyc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldE1lc2hVbmlmb3JtKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfQlVGRkVSX0RBVEEnOlxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5XZWJHTFJlbmRlcmVyKSB0aGlzLmluaXRXZWJHTCgpO1xuICAgICAgICAgICAgICAgIHRoaXMuV2ViR0xSZW5kZXJlci5idWZmZXJEYXRhKFxuICAgICAgICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdLFxuICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnR0xfQ1VUT1VUX1NUQVRFJzpcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuV2ViR0xSZW5kZXJlcikgdGhpcy5pbml0V2ViR0woKTtcbiAgICAgICAgICAgICAgICB0aGlzLldlYkdMUmVuZGVyZXIuc2V0Q3V0b3V0U3RhdGUocGF0aCwgY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ0dMX01FU0hfVklTSUJJTElUWSc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnNldE1lc2hWaXNpYmlsaXR5KHBhdGgsIGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl0pO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdHTF9SRU1PVkVfTUVTSCc6XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLldlYkdMUmVuZGVyZXIpIHRoaXMuaW5pdFdlYkdMKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5XZWJHTFJlbmRlcmVyLnJlbW92ZU1lc2gocGF0aCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIGNhc2UgJ1BJTkhPTEVfUFJPSkVDVElPTic6XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUucHJvamVjdGlvblR5cGUgPSBDYW1lcmEuUElOSE9MRV9QUk9KRUNUSU9OO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzExXSA9IC0xIC8gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnBlcnNwZWN0aXZlRGlydHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdPUlRIT0dSQVBISUNfUFJPSkVDVElPTic6XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUucHJvamVjdGlvblR5cGUgPSBDYW1lcmEuT1JUSE9HUkFQSElDX1BST0pFQ1RJT047XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTFdID0gMDtcblxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnBlcnNwZWN0aXZlRGlydHkgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICBjYXNlICdDSEFOR0VfVklFV19UUkFOU0ZPUk0nOlxuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMF0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMV0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMl0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bM10gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs0XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs1XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs2XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs3XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzhdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzldID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzEwXSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxMV0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxMl0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgICAgICAgICAgICAgIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTNdID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcbiAgICAgICAgICAgICAgICB0aGlzLl9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzE0XSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxNV0gPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fcmVuZGVyU3RhdGUudmlld0RpcnR5ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgY2FzZSAnV0lUSCc6IHJldHVybiBsb2NhbEl0ZXJhdG9yIC0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbW1hbmQgPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgIH1cblxuICAgIHJldHVybiBsb2NhbEl0ZXJhdG9yO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250ZXh0O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBVSU1hbmFnZXIgaXMgYmVpbmcgdXBkYXRlZCBieSBhbiBFbmdpbmUgYnkgY29uc2VjdXRpdmVseSBjYWxsaW5nIGl0c1xuICogYHVwZGF0ZWAgbWV0aG9kLiBJdCBjYW4gZWl0aGVyIG1hbmFnZSBhIHJlYWwgV2ViLVdvcmtlciBvciB0aGUgZ2xvYmFsXG4gKiBGYW1vdXNFbmdpbmUgY29yZSBzaW5nbGV0b24uXG4gKlxuICogQGV4YW1wbGVcbiAqIHZhciBjb21wb3NpdG9yID0gbmV3IENvbXBvc2l0b3IoKTtcbiAqIHZhciBlbmdpbmUgPSBuZXcgRW5naW5lKCk7XG4gKlxuICogLy8gVXNpbmcgYSBXZWIgV29ya2VyXG4gKiB2YXIgd29ya2VyID0gbmV3IFdvcmtlcignd29ya2VyLmJ1bmRsZS5qcycpO1xuICogdmFyIHRocmVhZG1hbmdlciA9IG5ldyBVSU1hbmFnZXIod29ya2VyLCBjb21wb3NpdG9yLCBlbmdpbmUpO1xuICpcbiAqIC8vIFdpdGhvdXQgdXNpbmcgYSBXZWIgV29ya2VyXG4gKiB2YXIgdGhyZWFkbWFuZ2VyID0gbmV3IFVJTWFuYWdlcihGYW1vdXMsIGNvbXBvc2l0b3IsIGVuZ2luZSk7XG4gKlxuICogQGNsYXNzICBVSU1hbmFnZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7RmFtb3VzfFdvcmtlcn0gdGhyZWFkIFRoZSB0aHJlYWQgYmVpbmcgdXNlZCB0byByZWNlaXZlIG1lc3NhZ2VzXG4gKiBmcm9tIGFuZCBwb3N0IG1lc3NhZ2VzIHRvLiBFeHBlY3RlZCB0byBleHBvc2UgYSBXZWJXb3JrZXItbGlrZSBBUEksIHdoaWNoXG4gKiBtZWFucyBwcm92aWRpbmcgYSB3YXkgdG8gbGlzdGVuIGZvciB1cGRhdGVzIGJ5IHNldHRpbmcgaXRzIGBvbm1lc3NhZ2VgXG4gKiBwcm9wZXJ0eSBhbmQgc2VuZGluZyB1cGRhdGVzIHVzaW5nIGBwb3N0TWVzc2FnZWAuXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgYW4gaW5zdGFuY2Ugb2YgQ29tcG9zaXRvciB1c2VkIHRvIGV4dHJhY3RcbiAqIGVucXVldWVkIGRyYXcgY29tbWFuZHMgZnJvbSB0byBiZSBzZW50IHRvIHRoZSB0aHJlYWQuXG4gKiBAcGFyYW0ge1JlbmRlckxvb3B9IHJlbmRlckxvb3AgYW4gaW5zdGFuY2Ugb2YgRW5naW5lIHVzZWQgZm9yIGV4ZWN1dGluZ1xuICogdGhlIGBFTkdJTkVgIGNvbW1hbmRzIG9uLlxuICovXG5mdW5jdGlvbiBVSU1hbmFnZXIgKHRocmVhZCwgY29tcG9zaXRvciwgcmVuZGVyTG9vcCkge1xuICAgIHRoaXMuX3RocmVhZCA9IHRocmVhZDtcbiAgICB0aGlzLl9jb21wb3NpdG9yID0gY29tcG9zaXRvcjtcbiAgICB0aGlzLl9yZW5kZXJMb29wID0gcmVuZGVyTG9vcDtcblxuICAgIHRoaXMuX3JlbmRlckxvb3AudXBkYXRlKHRoaXMpO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLl90aHJlYWQub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgIHZhciBtZXNzYWdlID0gZXYuZGF0YSA/IGV2LmRhdGEgOiBldjtcbiAgICAgICAgaWYgKG1lc3NhZ2VbMF0gPT09ICdFTkdJTkUnKSB7XG4gICAgICAgICAgICBzd2l0Y2ggKG1lc3NhZ2VbMV0pIHtcbiAgICAgICAgICAgICAgICBjYXNlICdTVEFSVCc6XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9yZW5kZXJMb29wLnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ1NUT1AnOlxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5fcmVuZGVyTG9vcC5zdG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAnVW5rbm93biBFTkdJTkUgY29tbWFuZCBcIicgKyBtZXNzYWdlWzFdICsgJ1wiJ1xuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIF90aGlzLl9jb21wb3NpdG9yLnJlY2VpdmVDb21tYW5kcyhtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdGhpcy5fdGhyZWFkLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnJvcik7XG4gICAgfTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSB0aHJlYWQgYmVpbmcgdXNlZCBieSB0aGUgVUlNYW5hZ2VyLlxuICogVGhpcyBjb3VsZCBlaXRoZXIgYmUgYW4gYW4gYWN0dWFsIHdlYiB3b3JrZXIgb3IgYSBgRmFtb3VzRW5naW5lYCBzaW5nbGV0b24uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1dvcmtlcnxGYW1vdXNFbmdpbmV9IEVpdGhlciBhIHdlYiB3b3JrZXIgb3IgYSBgRmFtb3VzRW5naW5lYCBzaW5nbGV0b24uXG4gKi9cblVJTWFuYWdlci5wcm90b3R5cGUuZ2V0VGhyZWFkID0gZnVuY3Rpb24gZ2V0VGhyZWFkKCkge1xuICAgIHJldHVybiB0aGlzLl90aHJlYWQ7XG59O1xuXG4vKipcbiAqIFJldHVybnMgdGhlIGNvbXBvc2l0b3IgYmVpbmcgdXNlZCBieSB0aGlzIFVJTWFuYWdlci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7Q29tcG9zaXRvcn0gVGhlIGNvbXBvc2l0b3IgdXNlZCBieSB0aGUgVUlNYW5hZ2VyLlxuICovXG5VSU1hbmFnZXIucHJvdG90eXBlLmdldENvbXBvc2l0b3IgPSBmdW5jdGlvbiBnZXRDb21wb3NpdG9yKCkge1xuICAgIHJldHVybiB0aGlzLl9jb21wb3NpdG9yO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBlbmdpbmUgYmVpbmcgdXNlZCBieSB0aGlzIFVJTWFuYWdlci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7RW5naW5lfSBUaGUgZW5naW5lIHVzZWQgYnkgdGhlIFVJTWFuYWdlci5cbiAqL1xuVUlNYW5hZ2VyLnByb3RvdHlwZS5nZXRFbmdpbmUgPSBmdW5jdGlvbiBnZXRFbmdpbmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlbmRlckxvb3A7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSBtZXRob2QgYmVpbmcgaW52b2tlZCBieSB0aGUgRW5naW5lIG9uIGV2ZXJ5IGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLlxuICogVXNlZCBmb3IgdXBkYXRpbmcgdGhlIG5vdGlvbiBvZiB0aW1lIHdpdGhpbiB0aGUgbWFuYWdlZCB0aHJlYWQgYnkgc2VuZGluZ1xuICogYSBGUkFNRSBjb21tYW5kIGFuZCBzZW5kaW5nIG1lc3NhZ2VzIHRvXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gdGltZSB1bml4IHRpbWVzdGFtcCB0byBiZSBwYXNzZWQgZG93biB0byB0aGUgd29ya2VyIGFzIGFcbiAqIEZSQU1FIGNvbW1hbmRcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblVJTWFuYWdlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlICh0aW1lKSB7XG4gICAgdGhpcy5fdGhyZWFkLnBvc3RNZXNzYWdlKFsnRlJBTUUnLCB0aW1lXSk7XG4gICAgdmFyIHRocmVhZE1lc3NhZ2VzID0gdGhpcy5fY29tcG9zaXRvci5kcmF3Q29tbWFuZHMoKTtcbiAgICB0aGlzLl90aHJlYWQucG9zdE1lc3NhZ2UodGhyZWFkTWVzc2FnZXMpO1xuICAgIHRoaXMuX2NvbXBvc2l0b3IuY2xlYXJDb21tYW5kcygpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBVSU1hbmFnZXI7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBjc3MgPSAnLmZhbW91cy1kb20tcmVuZGVyZXIgeycgK1xuICAgICd3aWR0aDoxMDAlOycgK1xuICAgICdoZWlnaHQ6MTAwJTsnICtcbiAgICAndHJhbnNmb3JtLXN0eWxlOnByZXNlcnZlLTNkOycgK1xuICAgICctd2Via2l0LXRyYW5zZm9ybS1zdHlsZTpwcmVzZXJ2ZS0zZDsnICtcbid9JyArXG5cbicuZmFtb3VzLWRvbS1lbGVtZW50IHsnICtcbiAgICAnLXdlYmtpdC10cmFuc2Zvcm0tb3JpZ2luOjAlIDAlOycgK1xuICAgICd0cmFuc2Zvcm0tb3JpZ2luOjAlIDAlOycgK1xuICAgICctd2Via2l0LWJhY2tmYWNlLXZpc2liaWxpdHk6dmlzaWJsZTsnICtcbiAgICAnYmFja2ZhY2UtdmlzaWJpbGl0eTp2aXNpYmxlOycgK1xuICAgICctd2Via2l0LXRyYW5zZm9ybS1zdHlsZTpwcmVzZXJ2ZS0zZDsnICtcbiAgICAndHJhbnNmb3JtLXN0eWxlOnByZXNlcnZlLTNkOycgK1xuICAgICctd2Via2l0LXRhcC1oaWdobGlnaHQtY29sb3I6dHJhbnNwYXJlbnQ7JyArXG4gICAgJ3BvaW50ZXItZXZlbnRzOmF1dG87JyArXG4gICAgJ3otaW5kZXg6MTsnICtcbid9JyArXG5cbicuZmFtb3VzLWRvbS1lbGVtZW50LWNvbnRlbnQsJyArXG4nLmZhbW91cy1kb20tZWxlbWVudCB7JyArXG4gICAgJ3Bvc2l0aW9uOmFic29sdXRlOycgK1xuICAgICdib3gtc2l6aW5nOmJvcmRlci1ib3g7JyArXG4gICAgJy1tb3otYm94LXNpemluZzpib3JkZXItYm94OycgK1xuICAgICctd2Via2l0LWJveC1zaXppbmc6Ym9yZGVyLWJveDsnICtcbid9JyArXG5cbicuZmFtb3VzLXdlYmdsLXJlbmRlcmVyIHsnICtcbiAgICAnLXdlYmtpdC10cmFuc2Zvcm06dHJhbnNsYXRlWigxMDAwMDAwcHgpOycgKyAgLyogVE9ETzogRml4IHdoZW4gU2FmYXJpIEZpeGVzKi9cbiAgICAndHJhbnNmb3JtOnRyYW5zbGF0ZVooMTAwMDAwMHB4KTsnICtcbiAgICAncG9pbnRlci1ldmVudHM6bm9uZTsnICtcbiAgICAncG9zaXRpb246YWJzb2x1dGU7JyArXG4gICAgJ3otaW5kZXg6MTsnICtcbiAgICAndG9wOjA7JyArXG4gICAgJ3dpZHRoOjEwMCU7JyArXG4gICAgJ2hlaWdodDoxMDAlOycgK1xuJ30nO1xuXG52YXIgSU5KRUNURUQgPSB0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnO1xuXG5mdW5jdGlvbiBpbmplY3RDU1MoKSB7XG4gICAgaWYgKElOSkVDVEVEKSByZXR1cm47XG4gICAgSU5KRUNURUQgPSB0cnVlO1xuICAgIGlmIChkb2N1bWVudC5jcmVhdGVTdHlsZVNoZWV0KSB7XG4gICAgICAgIHZhciBzaGVldCA9IGRvY3VtZW50LmNyZWF0ZVN0eWxlU2hlZXQoKTtcbiAgICAgICAgc2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBoZWFkID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXTtcbiAgICAgICAgdmFyIHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcblxuICAgICAgICBpZiAoc3R5bGUuc3R5bGVTaGVldCkge1xuICAgICAgICAgICAgc3R5bGUuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc3R5bGUuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gICAgICAgIH1cblxuICAgICAgICAoaGVhZCA/IGhlYWQgOiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpLmFwcGVuZENoaWxkKHN0eWxlKTtcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5qZWN0Q1NTO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERlZXAgY2xvbmUgYW4gb2JqZWN0LlxuICpcbiAqIEBtZXRob2QgIGNsb25lXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGIgICAgICAgT2JqZWN0IHRvIGJlIGNsb25lZC5cbiAqIEByZXR1cm4ge09iamVjdH0gYSAgICAgIENsb25lZCBvYmplY3QgKGRlZXAgZXF1YWxpdHkpLlxuICovXG52YXIgY2xvbmUgPSBmdW5jdGlvbiBjbG9uZShiKSB7XG4gICAgdmFyIGE7XG4gICAgaWYgKHR5cGVvZiBiID09PSAnb2JqZWN0Jykge1xuICAgICAgICBhID0gKGIgaW5zdGFuY2VvZiBBcnJheSkgPyBbXSA6IHt9O1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBiW2tleV0gPT09ICdvYmplY3QnICYmIGJba2V5XSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmIChiW2tleV0gaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICAgICAgICAgICAgICBhW2tleV0gPSBuZXcgQXJyYXkoYltrZXldLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYltrZXldLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhW2tleV1baV0gPSBjbG9uZShiW2tleV1baV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgYVtrZXldID0gY2xvbmUoYltrZXldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhW2tleV0gPSBiW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGEgPSBiO1xuICAgIH1cbiAgICByZXR1cm4gYTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2xvbmU7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbi8qKlxuICogVGFrZXMgYW4gb2JqZWN0IGNvbnRhaW5pbmcga2V5cyBhbmQgdmFsdWVzIGFuZCByZXR1cm5zIGFuIG9iamVjdFxuICogY29tcHJpc2luZyB0d28gXCJhc3NvY2lhdGVcIiBhcnJheXMsIG9uZSB3aXRoIHRoZSBrZXlzIGFuZCB0aGUgb3RoZXJcbiAqIHdpdGggdGhlIHZhbHVlcy5cbiAqXG4gKiBAbWV0aG9kIGtleVZhbHVlc1RvQXJyYXlzXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiAgICAgICAgICAgICAgICAgICAgICBPYmplY3RzIHdoZXJlIHRvIGV4dHJhY3Qga2V5cyBhbmQgdmFsdWVzXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb20uXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgcmVzdWx0XG4gKiAgICAgICAgIHtBcnJheS48U3RyaW5nPn0gcmVzdWx0LmtleXMgICAgIEtleXMgb2YgYHJlc3VsdGAsIGFzIHJldHVybmVkIGJ5XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBPYmplY3Qua2V5cygpYFxuICogICAgICAgICB7QXJyYXl9ICAgICAgICAgIHJlc3VsdC52YWx1ZXMgICBWYWx1ZXMgb2YgcGFzc2VkIGluIG9iamVjdC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBrZXlWYWx1ZXNUb0FycmF5cyhvYmopIHtcbiAgICB2YXIga2V5c0FycmF5ID0gW10sIHZhbHVlc0FycmF5ID0gW107XG4gICAgdmFyIGkgPSAwO1xuICAgIGZvcih2YXIga2V5IGluIG9iaikge1xuICAgICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgIGtleXNBcnJheVtpXSA9IGtleTtcbiAgICAgICAgICAgIHZhbHVlc0FycmF5W2ldID0gb2JqW2tleV07XG4gICAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAga2V5czoga2V5c0FycmF5LFxuICAgICAgICB2YWx1ZXM6IHZhbHVlc0FycmF5XG4gICAgfTtcbn07XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBQUkVGSVhFUyA9IFsnJywgJy1tcy0nLCAnLXdlYmtpdC0nLCAnLW1vei0nLCAnLW8tJ107XG5cbi8qKlxuICogQSBoZWxwZXIgZnVuY3Rpb24gdXNlZCBmb3IgZGV0ZXJtaW5pbmcgdGhlIHZlbmRvciBwcmVmaXhlZCB2ZXJzaW9uIG9mIHRoZVxuICogcGFzc2VkIGluIENTUyBwcm9wZXJ0eS5cbiAqXG4gKiBWZW5kb3IgY2hlY2tzIGFyZSBiZWluZyBjb25kdWN0ZWQgaW4gdGhlIGZvbGxvd2luZyBvcmRlcjpcbiAqXG4gKiAxLiAobm8gcHJlZml4KVxuICogMi4gYC1tei1gXG4gKiAzLiBgLXdlYmtpdC1gXG4gKiA0LiBgLW1vei1gXG4gKiA1LiBgLW8tYFxuICpcbiAqIEBtZXRob2QgdmVuZG9yUHJlZml4XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHByb3BlcnR5ICAgICBDU1MgcHJvcGVydHkgKG5vIGNhbWVsQ2FzZSksIGUuZy5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYGJvcmRlci1yYWRpdXNgLlxuICogQHJldHVybiB7U3RyaW5nfSBwcmVmaXhlZCAgICBWZW5kb3IgcHJlZml4ZWQgdmVyc2lvbiBvZiBwYXNzZWQgaW4gQ1NTXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5IChlLmcuIGAtd2Via2l0LWJvcmRlci1yYWRpdXNgKS5cbiAqL1xuZnVuY3Rpb24gdmVuZG9yUHJlZml4KHByb3BlcnR5KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBQUkVGSVhFUy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJlZml4ZWQgPSBQUkVGSVhFU1tpXSArIHByb3BlcnR5O1xuICAgICAgICBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlW3ByZWZpeGVkXSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBwcmVmaXhlZDtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcHJvcGVydHk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdmVuZG9yUHJlZml4O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgR2VvbWV0cnlJZHMgPSAwO1xuXG4vKipcbiAqIEdlb21ldHJ5IGlzIGEgY29tcG9uZW50IHRoYXQgZGVmaW5lcyBhbmQgbWFuYWdlcyBkYXRhXG4gKiAodmVydGV4IGRhdGEgYW5kIGF0dHJpYnV0ZXMpIHRoYXQgaXMgdXNlZCB0byBkcmF3IHRvIFdlYkdMLlxuICpcbiAqIEBjbGFzcyBHZW9tZXRyeVxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgaW5zdGFudGlhdGlvbiBvcHRpb25zXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBHZW9tZXRyeShvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLkRFRkFVTFRfQlVGRkVSX1NJWkUgPSAzO1xuXG4gICAgdGhpcy5zcGVjID0ge1xuICAgICAgICBpZDogR2VvbWV0cnlJZHMrKyxcbiAgICAgICAgZHluYW1pYzogZmFsc2UsXG4gICAgICAgIHR5cGU6IHRoaXMub3B0aW9ucy50eXBlIHx8ICdUUklBTkdMRVMnLFxuICAgICAgICBidWZmZXJOYW1lczogW10sXG4gICAgICAgIGJ1ZmZlclZhbHVlczogW10sXG4gICAgICAgIGJ1ZmZlclNwYWNpbmdzOiBbXSxcbiAgICAgICAgaW52YWxpZGF0aW9uczogW11cbiAgICB9O1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5idWZmZXJzKSB7XG4gICAgICAgIHZhciBsZW4gPSB0aGlzLm9wdGlvbnMuYnVmZmVycy5sZW5ndGg7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOykge1xuICAgICAgICAgICAgdGhpcy5zcGVjLmJ1ZmZlck5hbWVzLnB1c2godGhpcy5vcHRpb25zLmJ1ZmZlcnNbaV0ubmFtZSk7XG4gICAgICAgICAgICB0aGlzLnNwZWMuYnVmZmVyVmFsdWVzLnB1c2godGhpcy5vcHRpb25zLmJ1ZmZlcnNbaV0uZGF0YSk7XG4gICAgICAgICAgICB0aGlzLnNwZWMuYnVmZmVyU3BhY2luZ3MucHVzaCh0aGlzLm9wdGlvbnMuYnVmZmVyc1tpXS5zaXplIHx8IHRoaXMuREVGQVVMVF9CVUZGRVJfU0laRSk7XG4gICAgICAgICAgICB0aGlzLnNwZWMuaW52YWxpZGF0aW9ucy5wdXNoKGkrKyk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gR2VvbWV0cnk7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBWZWMzID0gcmVxdWlyZSgnLi4vbWF0aC9WZWMzJyk7XG52YXIgVmVjMiA9IHJlcXVpcmUoJy4uL21hdGgvVmVjMicpO1xuXG52YXIgb3V0cHV0cyA9IFtcbiAgICBuZXcgVmVjMygpLFxuICAgIG5ldyBWZWMzKCksXG4gICAgbmV3IFZlYzMoKSxcbiAgICBuZXcgVmVjMigpLFxuICAgIG5ldyBWZWMyKClcbl07XG5cbi8qKlxuICogQSBoZWxwZXIgb2JqZWN0IHVzZWQgdG8gY2FsY3VsYXRlIGJ1ZmZlcnMgZm9yIGNvbXBsaWNhdGVkIGdlb21ldHJpZXMuXG4gKiBUYWlsb3JlZCBmb3IgdGhlIFdlYkdMUmVuZGVyZXIsIHVzZWQgYnkgbW9zdCBwcmltaXRpdmVzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBjbGFzcyBHZW9tZXRyeUhlbHBlclxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xudmFyIEdlb21ldHJ5SGVscGVyID0ge307XG5cbi8qKlxuICogQSBmdW5jdGlvbiB0aGF0IGl0ZXJhdGVzIHRocm91Z2ggdmVydGljYWwgYW5kIGhvcml6b250YWwgc2xpY2VzXG4gKiBiYXNlZCBvbiBpbnB1dCBkZXRhaWwsIGFuZCBnZW5lcmF0ZXMgdmVydGljZXMgYW5kIGluZGljZXMgZm9yIGVhY2hcbiAqIHN1YmRpdmlzaW9uLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGRldGFpbFggQW1vdW50IG9mIHNsaWNlcyB0byBpdGVyYXRlIHRocm91Z2guXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGRldGFpbFkgQW1vdW50IG9mIHN0YWNrcyB0byBpdGVyYXRlIHRocm91Z2guXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZnVuYyBGdW5jdGlvbiB1c2VkIHRvIGdlbmVyYXRlIHZlcnRleCBwb3NpdGlvbnMgYXQgZWFjaCBwb2ludC5cbiAqIEBwYXJhbSAge0Jvb2xlYW59IHdyYXAgT3B0aW9uYWwgcGFyYW1ldGVyIChkZWZhdWx0OiBQaSkgZm9yIHNldHRpbmcgYSBjdXN0b20gd3JhcCByYW5nZVxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gT2JqZWN0IGNvbnRhaW5pbmcgZ2VuZXJhdGVkIHZlcnRpY2VzIGFuZCBpbmRpY2VzLlxuICovXG5HZW9tZXRyeUhlbHBlci5nZW5lcmF0ZVBhcmFtZXRyaWMgPSBmdW5jdGlvbiBnZW5lcmF0ZVBhcmFtZXRyaWMoZGV0YWlsWCwgZGV0YWlsWSwgZnVuYywgd3JhcCkge1xuICAgIHZhciB2ZXJ0aWNlcyA9IFtdO1xuICAgIHZhciBpO1xuICAgIHZhciB0aGV0YTtcbiAgICB2YXIgcGhpO1xuICAgIHZhciBqO1xuXG4gICAgLy8gV2UgY2FuIHdyYXAgYXJvdW5kIHNsaWdodGx5IG1vcmUgdGhhbiBvbmNlIGZvciB1diBjb29yZGluYXRlcyB0byBsb29rIGNvcnJlY3QuXG5cbiAgICB2YXIgWHJhbmdlID0gd3JhcCA/IE1hdGguUEkgKyAoTWF0aC5QSSAvIChkZXRhaWxYIC0gMSkpIDogTWF0aC5QSTtcbiAgICB2YXIgb3V0ID0gW107XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgZGV0YWlsWCArIDE7IGkrKykge1xuICAgICAgICB0aGV0YSA9IGkgKiBYcmFuZ2UgLyBkZXRhaWxYO1xuICAgICAgICBmb3IgKGogPSAwOyBqIDwgZGV0YWlsWTsgaisrKSB7XG4gICAgICAgICAgICBwaGkgPSBqICogMi4wICogWHJhbmdlIC8gZGV0YWlsWTtcbiAgICAgICAgICAgIGZ1bmModGhldGEsIHBoaSwgb3V0KTtcbiAgICAgICAgICAgIHZlcnRpY2VzLnB1c2gob3V0WzBdLCBvdXRbMV0sIG91dFsyXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW5kaWNlcyA9IFtdLFxuICAgICAgICB2ID0gMCxcbiAgICAgICAgbmV4dDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGV0YWlsWDsgaSsrKSB7XG4gICAgICAgIGZvciAoaiA9IDA7IGogPCBkZXRhaWxZOyBqKyspIHtcbiAgICAgICAgICAgIG5leHQgPSAoaiArIDEpICUgZGV0YWlsWTtcbiAgICAgICAgICAgIGluZGljZXMucHVzaCh2ICsgaiwgdiArIGogKyBkZXRhaWxZLCB2ICsgbmV4dCk7XG4gICAgICAgICAgICBpbmRpY2VzLnB1c2godiArIG5leHQsIHYgKyBqICsgZGV0YWlsWSwgdiArIG5leHQgKyBkZXRhaWxZKTtcbiAgICAgICAgfVxuICAgICAgICB2ICs9IGRldGFpbFk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgdmVydGljZXM6IHZlcnRpY2VzLFxuICAgICAgICBpbmRpY2VzOiBpbmRpY2VzXG4gICAgfTtcbn07XG5cbi8qKlxuICogQ2FsY3VsYXRlcyBub3JtYWxzIGJlbG9uZ2luZyB0byBlYWNoIGZhY2Ugb2YgYSBnZW9tZXRyeS5cbiAqIEFzc3VtZXMgY2xvY2t3aXNlIGRlY2xhcmF0aW9uIG9mIHZlcnRpY2VzLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBWZXJ0aWNlcyBvZiBhbGwgcG9pbnRzIG9uIHRoZSBnZW9tZXRyeS5cbiAqIEBwYXJhbSB7QXJyYXl9IGluZGljZXMgSW5kaWNlcyBkZWNsYXJpbmcgZmFjZXMgb2YgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgQXJyYXkgdG8gYmUgZmlsbGVkIGFuZCByZXR1cm5lZC5cbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gQ2FsY3VsYXRlZCBmYWNlIG5vcm1hbHMuXG4gKi9cbkdlb21ldHJ5SGVscGVyLmNvbXB1dGVOb3JtYWxzID0gZnVuY3Rpb24gY29tcHV0ZU5vcm1hbHModmVydGljZXMsIGluZGljZXMsIG91dCkge1xuICAgIHZhciBub3JtYWxzID0gb3V0IHx8IFtdO1xuICAgIHZhciBpbmRleE9uZTtcbiAgICB2YXIgaW5kZXhUd287XG4gICAgdmFyIGluZGV4VGhyZWU7XG4gICAgdmFyIG5vcm1hbDtcbiAgICB2YXIgajtcbiAgICB2YXIgbGVuID0gaW5kaWNlcy5sZW5ndGggLyAzO1xuICAgIHZhciBpO1xuICAgIHZhciB4O1xuICAgIHZhciB5O1xuICAgIHZhciB6O1xuICAgIHZhciBsZW5ndGg7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaW5kZXhUd28gPSBpbmRpY2VzW2kqMyArIDBdICogMztcbiAgICAgICAgaW5kZXhPbmUgPSBpbmRpY2VzW2kqMyArIDFdICogMztcbiAgICAgICAgaW5kZXhUaHJlZSA9IGluZGljZXNbaSozICsgMl0gKiAzO1xuXG4gICAgICAgIG91dHB1dHNbMF0uc2V0KHZlcnRpY2VzW2luZGV4T25lXSwgdmVydGljZXNbaW5kZXhPbmUgKyAxXSwgdmVydGljZXNbaW5kZXhPbmUgKyAyXSk7XG4gICAgICAgIG91dHB1dHNbMV0uc2V0KHZlcnRpY2VzW2luZGV4VHdvXSwgdmVydGljZXNbaW5kZXhUd28gKyAxXSwgdmVydGljZXNbaW5kZXhUd28gKyAyXSk7XG4gICAgICAgIG91dHB1dHNbMl0uc2V0KHZlcnRpY2VzW2luZGV4VGhyZWVdLCB2ZXJ0aWNlc1tpbmRleFRocmVlICsgMV0sIHZlcnRpY2VzW2luZGV4VGhyZWUgKyAyXSk7XG5cbiAgICAgICAgbm9ybWFsID0gb3V0cHV0c1syXS5zdWJ0cmFjdChvdXRwdXRzWzBdKS5jcm9zcyhvdXRwdXRzWzFdLnN1YnRyYWN0KG91dHB1dHNbMF0pKS5ub3JtYWxpemUoKTtcblxuICAgICAgICBub3JtYWxzW2luZGV4T25lICsgMF0gPSAobm9ybWFsc1tpbmRleE9uZSArIDBdIHx8IDApICsgbm9ybWFsLng7XG4gICAgICAgIG5vcm1hbHNbaW5kZXhPbmUgKyAxXSA9IChub3JtYWxzW2luZGV4T25lICsgMV0gfHwgMCkgKyBub3JtYWwueTtcbiAgICAgICAgbm9ybWFsc1tpbmRleE9uZSArIDJdID0gKG5vcm1hbHNbaW5kZXhPbmUgKyAyXSB8fCAwKSArIG5vcm1hbC56O1xuXG4gICAgICAgIG5vcm1hbHNbaW5kZXhUd28gKyAwXSA9IChub3JtYWxzW2luZGV4VHdvICsgMF0gfHwgMCkgKyBub3JtYWwueDtcbiAgICAgICAgbm9ybWFsc1tpbmRleFR3byArIDFdID0gKG5vcm1hbHNbaW5kZXhUd28gKyAxXSB8fCAwKSArIG5vcm1hbC55O1xuICAgICAgICBub3JtYWxzW2luZGV4VHdvICsgMl0gPSAobm9ybWFsc1tpbmRleFR3byArIDJdIHx8IDApICsgbm9ybWFsLno7XG5cbiAgICAgICAgbm9ybWFsc1tpbmRleFRocmVlICsgMF0gPSAobm9ybWFsc1tpbmRleFRocmVlICsgMF0gfHwgMCkgKyBub3JtYWwueDtcbiAgICAgICAgbm9ybWFsc1tpbmRleFRocmVlICsgMV0gPSAobm9ybWFsc1tpbmRleFRocmVlICsgMV0gfHwgMCkgKyBub3JtYWwueTtcbiAgICAgICAgbm9ybWFsc1tpbmRleFRocmVlICsgMl0gPSAobm9ybWFsc1tpbmRleFRocmVlICsgMl0gfHwgMCkgKyBub3JtYWwuejtcbiAgICB9XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbm9ybWFscy5sZW5ndGg7IGkgKz0gMykge1xuICAgICAgICB4ID0gbm9ybWFsc1tpXTtcbiAgICAgICAgeSA9IG5vcm1hbHNbaSsxXTtcbiAgICAgICAgeiA9IG5vcm1hbHNbaSsyXTtcbiAgICAgICAgbGVuZ3RoID0gTWF0aC5zcXJ0KHggKiB4ICsgeSAqIHkgKyB6ICogeik7XG4gICAgICAgIGZvcihqID0gMDsgajwgMzsgaisrKSB7XG4gICAgICAgICAgICBub3JtYWxzW2kral0gLz0gbGVuZ3RoO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vcm1hbHM7XG59O1xuXG4vKipcbiAqIERpdmlkZXMgYWxsIGluc2VydGVkIHRyaWFuZ2xlcyBpbnRvIGZvdXIgc3ViLXRyaWFuZ2xlcy4gQWx0ZXJzIHRoZVxuICogcGFzc2VkIGluIGFycmF5cy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gaW5kaWNlcyBJbmRpY2VzIGRlY2xhcmluZyBmYWNlcyBvZiBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IHRleHR1cmVDb29yZHMgVGV4dHVyZSBjb29yZGluYXRlcyBvZiBhbGwgcG9pbnRzIG9uIHRoZSBnZW9tZXRyeVxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuR2VvbWV0cnlIZWxwZXIuc3ViZGl2aWRlID0gZnVuY3Rpb24gc3ViZGl2aWRlKGluZGljZXMsIHZlcnRpY2VzLCB0ZXh0dXJlQ29vcmRzKSB7XG4gICAgdmFyIHRyaWFuZ2xlSW5kZXggPSBpbmRpY2VzLmxlbmd0aCAvIDM7XG4gICAgdmFyIGZhY2U7XG4gICAgdmFyIGk7XG4gICAgdmFyIGo7XG4gICAgdmFyIGs7XG4gICAgdmFyIHBvcztcbiAgICB2YXIgdGV4O1xuXG4gICAgd2hpbGUgKHRyaWFuZ2xlSW5kZXgtLSkge1xuICAgICAgICBmYWNlID0gaW5kaWNlcy5zbGljZSh0cmlhbmdsZUluZGV4ICogMywgdHJpYW5nbGVJbmRleCAqIDMgKyAzKTtcblxuICAgICAgICBwb3MgPSBmYWNlLm1hcChmdW5jdGlvbih2ZXJ0SW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgVmVjMyh2ZXJ0aWNlc1t2ZXJ0SW5kZXggKiAzXSwgdmVydGljZXNbdmVydEluZGV4ICogMyArIDFdLCB2ZXJ0aWNlc1t2ZXJ0SW5kZXggKiAzICsgMl0pO1xuICAgICAgICB9KTtcbiAgICAgICAgdmVydGljZXMucHVzaC5hcHBseSh2ZXJ0aWNlcywgVmVjMy5zY2FsZShWZWMzLmFkZChwb3NbMF0sIHBvc1sxXSwgb3V0cHV0c1swXSksIDAuNSwgb3V0cHV0c1sxXSkudG9BcnJheSgpKTtcbiAgICAgICAgdmVydGljZXMucHVzaC5hcHBseSh2ZXJ0aWNlcywgVmVjMy5zY2FsZShWZWMzLmFkZChwb3NbMV0sIHBvc1syXSwgb3V0cHV0c1swXSksIDAuNSwgb3V0cHV0c1sxXSkudG9BcnJheSgpKTtcbiAgICAgICAgdmVydGljZXMucHVzaC5hcHBseSh2ZXJ0aWNlcywgVmVjMy5zY2FsZShWZWMzLmFkZChwb3NbMF0sIHBvc1syXSwgb3V0cHV0c1swXSksIDAuNSwgb3V0cHV0c1sxXSkudG9BcnJheSgpKTtcblxuICAgICAgICBpZiAodGV4dHVyZUNvb3Jkcykge1xuICAgICAgICAgICAgdGV4ID0gZmFjZS5tYXAoZnVuY3Rpb24odmVydEluZGV4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBWZWMyKHRleHR1cmVDb29yZHNbdmVydEluZGV4ICogMl0sIHRleHR1cmVDb29yZHNbdmVydEluZGV4ICogMiArIDFdKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGV4dHVyZUNvb3Jkcy5wdXNoLmFwcGx5KHRleHR1cmVDb29yZHMsIFZlYzIuc2NhbGUoVmVjMi5hZGQodGV4WzBdLCB0ZXhbMV0sIG91dHB1dHNbM10pLCAwLjUsIG91dHB1dHNbNF0pLnRvQXJyYXkoKSk7XG4gICAgICAgICAgICB0ZXh0dXJlQ29vcmRzLnB1c2guYXBwbHkodGV4dHVyZUNvb3JkcywgVmVjMi5zY2FsZShWZWMyLmFkZCh0ZXhbMV0sIHRleFsyXSwgb3V0cHV0c1szXSksIDAuNSwgb3V0cHV0c1s0XSkudG9BcnJheSgpKTtcbiAgICAgICAgICAgIHRleHR1cmVDb29yZHMucHVzaC5hcHBseSh0ZXh0dXJlQ29vcmRzLCBWZWMyLnNjYWxlKFZlYzIuYWRkKHRleFswXSwgdGV4WzJdLCBvdXRwdXRzWzNdKSwgMC41LCBvdXRwdXRzWzRdKS50b0FycmF5KCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgaSA9IHZlcnRpY2VzLmxlbmd0aCAtIDM7XG4gICAgICAgIGogPSBpICsgMTtcbiAgICAgICAgayA9IGkgKyAyO1xuXG4gICAgICAgIGluZGljZXMucHVzaChpLCBqLCBrKTtcbiAgICAgICAgaW5kaWNlcy5wdXNoKGZhY2VbMF0sIGksIGspO1xuICAgICAgICBpbmRpY2VzLnB1c2goaSwgZmFjZVsxXSwgaik7XG4gICAgICAgIGluZGljZXNbdHJpYW5nbGVJbmRleF0gPSBrO1xuICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXggKyAxXSA9IGo7XG4gICAgICAgIGluZGljZXNbdHJpYW5nbGVJbmRleCArIDJdID0gZmFjZVsyXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgZHVwbGljYXRlIG9mIHZlcnRpY2VzIHRoYXQgYXJlIHNoYXJlZCBiZXR3ZWVuIGZhY2VzLlxuICogQWx0ZXJzIHRoZSBpbnB1dCB2ZXJ0ZXggYW5kIGluZGV4IGFycmF5cy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IGluZGljZXMgSW5kaWNlcyBkZWNsYXJpbmcgZmFjZXMgb2YgZ2VvbWV0cnlcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkdlb21ldHJ5SGVscGVyLmdldFVuaXF1ZUZhY2VzID0gZnVuY3Rpb24gZ2V0VW5pcXVlRmFjZXModmVydGljZXMsIGluZGljZXMpIHtcbiAgICB2YXIgdHJpYW5nbGVJbmRleCA9IGluZGljZXMubGVuZ3RoIC8gMyxcbiAgICAgICAgcmVnaXN0ZXJlZCA9IFtdLFxuICAgICAgICBpbmRleDtcblxuICAgIHdoaWxlICh0cmlhbmdsZUluZGV4LS0pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAzOyBpKyspIHtcblxuICAgICAgICAgICAgaW5kZXggPSBpbmRpY2VzW3RyaWFuZ2xlSW5kZXggKiAzICsgaV07XG5cbiAgICAgICAgICAgIGlmIChyZWdpc3RlcmVkW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIHZlcnRpY2VzLnB1c2godmVydGljZXNbaW5kZXggKiAzXSwgdmVydGljZXNbaW5kZXggKiAzICsgMV0sIHZlcnRpY2VzW2luZGV4ICogMyArIDJdKTtcbiAgICAgICAgICAgICAgICBpbmRpY2VzW3RyaWFuZ2xlSW5kZXggKiAzICsgaV0gPSB2ZXJ0aWNlcy5sZW5ndGggLyAzIC0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWRbaW5kZXhdID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogRGl2aWRlcyBhbGwgaW5zZXJ0ZWQgdHJpYW5nbGVzIGludG8gZm91ciBzdWItdHJpYW5nbGVzIHdoaWxlIG1haW50YWluaW5nXG4gKiBhIHJhZGl1cyBvZiBvbmUuIEFsdGVycyB0aGUgcGFzc2VkIGluIGFycmF5cy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IGluZGljZXMgSW5kaWNlcyBkZWNsYXJpbmcgZmFjZXMgb2YgZ2VvbWV0cnlcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkdlb21ldHJ5SGVscGVyLnN1YmRpdmlkZVNwaGVyb2lkID0gZnVuY3Rpb24gc3ViZGl2aWRlU3BoZXJvaWQodmVydGljZXMsIGluZGljZXMpIHtcbiAgICB2YXIgdHJpYW5nbGVJbmRleCA9IGluZGljZXMubGVuZ3RoIC8gMyxcbiAgICAgICAgYWJjLFxuICAgICAgICBmYWNlLFxuICAgICAgICBpLCBqLCBrO1xuXG4gICAgd2hpbGUgKHRyaWFuZ2xlSW5kZXgtLSkge1xuICAgICAgICBmYWNlID0gaW5kaWNlcy5zbGljZSh0cmlhbmdsZUluZGV4ICogMywgdHJpYW5nbGVJbmRleCAqIDMgKyAzKTtcbiAgICAgICAgYWJjID0gZmFjZS5tYXAoZnVuY3Rpb24odmVydEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFZlYzModmVydGljZXNbdmVydEluZGV4ICogM10sIHZlcnRpY2VzW3ZlcnRJbmRleCAqIDMgKyAxXSwgdmVydGljZXNbdmVydEluZGV4ICogMyArIDJdKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdmVydGljZXMucHVzaC5hcHBseSh2ZXJ0aWNlcywgVmVjMy5ub3JtYWxpemUoVmVjMy5hZGQoYWJjWzBdLCBhYmNbMV0sIG91dHB1dHNbMF0pLCBvdXRwdXRzWzFdKS50b0FycmF5KCkpO1xuICAgICAgICB2ZXJ0aWNlcy5wdXNoLmFwcGx5KHZlcnRpY2VzLCBWZWMzLm5vcm1hbGl6ZShWZWMzLmFkZChhYmNbMV0sIGFiY1syXSwgb3V0cHV0c1swXSksIG91dHB1dHNbMV0pLnRvQXJyYXkoKSk7XG4gICAgICAgIHZlcnRpY2VzLnB1c2guYXBwbHkodmVydGljZXMsIFZlYzMubm9ybWFsaXplKFZlYzMuYWRkKGFiY1swXSwgYWJjWzJdLCBvdXRwdXRzWzBdKSwgb3V0cHV0c1sxXSkudG9BcnJheSgpKTtcblxuICAgICAgICBpID0gdmVydGljZXMubGVuZ3RoIC8gMyAtIDM7XG4gICAgICAgIGogPSBpICsgMTtcbiAgICAgICAgayA9IGkgKyAyO1xuXG4gICAgICAgIGluZGljZXMucHVzaChpLCBqLCBrKTtcbiAgICAgICAgaW5kaWNlcy5wdXNoKGZhY2VbMF0sIGksIGspO1xuICAgICAgICBpbmRpY2VzLnB1c2goaSwgZmFjZVsxXSwgaik7XG4gICAgICAgIGluZGljZXNbdHJpYW5nbGVJbmRleCAqIDNdID0gaztcbiAgICAgICAgaW5kaWNlc1t0cmlhbmdsZUluZGV4ICogMyArIDFdID0gajtcbiAgICAgICAgaW5kaWNlc1t0cmlhbmdsZUluZGV4ICogMyArIDJdID0gZmFjZVsyXTtcbiAgICB9XG59O1xuXG4vKipcbiAqIERpdmlkZXMgYWxsIGluc2VydGVkIHRyaWFuZ2xlcyBpbnRvIGZvdXIgc3ViLXRyaWFuZ2xlcyB3aGlsZSBtYWludGFpbmluZ1xuICogYSByYWRpdXMgb2Ygb25lLiBBbHRlcnMgdGhlIHBhc3NlZCBpbiBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgT3B0aW9uYWwgYXJyYXkgdG8gYmUgZmlsbGVkIHdpdGggcmVzdWx0aW5nIG5vcm1hbHMuXG4gKlxuICogQHJldHVybiB7QXJyYXl9IE5ldyBsaXN0IG9mIGNhbGN1bGF0ZWQgbm9ybWFscy5cbiAqL1xuR2VvbWV0cnlIZWxwZXIuZ2V0U3BoZXJvaWROb3JtYWxzID0gZnVuY3Rpb24gZ2V0U3BoZXJvaWROb3JtYWxzKHZlcnRpY2VzLCBvdXQpIHtcbiAgICBvdXQgPSBvdXQgfHwgW107XG4gICAgdmFyIGxlbmd0aCA9IHZlcnRpY2VzLmxlbmd0aCAvIDM7XG4gICAgdmFyIG5vcm1hbGl6ZWQ7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5vcm1hbGl6ZWQgPSBuZXcgVmVjMyhcbiAgICAgICAgICAgIHZlcnRpY2VzW2kgKiAzICsgMF0sXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDFdLFxuICAgICAgICAgICAgdmVydGljZXNbaSAqIDMgKyAyXVxuICAgICAgICApLm5vcm1hbGl6ZSgpLnRvQXJyYXkoKTtcblxuICAgICAgICBvdXRbaSAqIDMgKyAwXSA9IG5vcm1hbGl6ZWRbMF07XG4gICAgICAgIG91dFtpICogMyArIDFdID0gbm9ybWFsaXplZFsxXTtcbiAgICAgICAgb3V0W2kgKiAzICsgMl0gPSBub3JtYWxpemVkWzJdO1xuICAgIH1cblxuICAgIHJldHVybiBvdXQ7XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgdGV4dHVyZSBjb29yZGluYXRlcyBmb3Igc3BoZXJvaWQgcHJpbWl0aXZlcyBiYXNlZCBvblxuICogaW5wdXQgdmVydGljZXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFZlcnRpY2VzIG9mIGFsbCBwb2ludHMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgT3B0aW9uYWwgYXJyYXkgdG8gYmUgZmlsbGVkIHdpdGggcmVzdWx0aW5nIHRleHR1cmUgY29vcmRpbmF0ZXMuXG4gKlxuICogQHJldHVybiB7QXJyYXl9IE5ldyBsaXN0IG9mIGNhbGN1bGF0ZWQgdGV4dHVyZSBjb29yZGluYXRlc1xuICovXG5HZW9tZXRyeUhlbHBlci5nZXRTcGhlcm9pZFVWID0gZnVuY3Rpb24gZ2V0U3BoZXJvaWRVVih2ZXJ0aWNlcywgb3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciBsZW5ndGggPSB2ZXJ0aWNlcy5sZW5ndGggLyAzO1xuICAgIHZhciB2ZXJ0ZXg7XG5cbiAgICB2YXIgdXYgPSBbXTtcblxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2ZXJ0ZXggPSBvdXRwdXRzWzBdLnNldChcbiAgICAgICAgICAgIHZlcnRpY2VzW2kgKiAzXSxcbiAgICAgICAgICAgIHZlcnRpY2VzW2kgKiAzICsgMV0sXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDJdXG4gICAgICAgIClcbiAgICAgICAgLm5vcm1hbGl6ZSgpXG4gICAgICAgIC50b0FycmF5KCk7XG5cbiAgICAgICAgdXZbMF0gPSB0aGlzLmdldEF6aW11dGgodmVydGV4KSAqIDAuNSAvIE1hdGguUEkgKyAwLjU7XG4gICAgICAgIHV2WzFdID0gdGhpcy5nZXRBbHRpdHVkZSh2ZXJ0ZXgpIC8gTWF0aC5QSSArIDAuNTtcblxuICAgICAgICBvdXQucHVzaC5hcHBseShvdXQsIHV2KTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aHJvdWdoIGFuZCBub3JtYWxpemVzIGEgbGlzdCBvZiB2ZXJ0aWNlcy5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdmVydGljZXMgVmVydGljZXMgb2YgYWxsIHBvaW50cyBvbiB0aGUgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IG91dCBPcHRpb25hbCBhcnJheSB0byBiZSBmaWxsZWQgd2l0aCByZXN1bHRpbmcgbm9ybWFsaXplZCB2ZWN0b3JzLlxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBOZXcgbGlzdCBvZiBub3JtYWxpemVkIHZlcnRpY2VzXG4gKi9cbkdlb21ldHJ5SGVscGVyLm5vcm1hbGl6ZUFsbCA9IGZ1bmN0aW9uIG5vcm1hbGl6ZUFsbCh2ZXJ0aWNlcywgb3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciBsZW4gPSB2ZXJ0aWNlcy5sZW5ndGggLyAzO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShvdXQsIG5ldyBWZWMzKHZlcnRpY2VzW2kgKiAzXSwgdmVydGljZXNbaSAqIDMgKyAxXSwgdmVydGljZXNbaSAqIDMgKyAyXSkubm9ybWFsaXplKCkudG9BcnJheSgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb3V0O1xufTtcblxuLyoqXG4gKiBOb3JtYWxpemVzIGEgc2V0IG9mIHZlcnRpY2VzIHRvIG1vZGVsIHNwYWNlLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2ZXJ0aWNlcyBWZXJ0aWNlcyBvZiBhbGwgcG9pbnRzIG9uIHRoZSBnZW9tZXRyeVxuICogQHBhcmFtIHtBcnJheX0gb3V0IE9wdGlvbmFsIGFycmF5IHRvIGJlIGZpbGxlZCB3aXRoIG1vZGVsIHNwYWNlIHBvc2l0aW9uIHZlY3RvcnMuXG4gKlxuICogQHJldHVybiB7QXJyYXl9IE91dHB1dCB2ZXJ0aWNlcy5cbiAqL1xuR2VvbWV0cnlIZWxwZXIubm9ybWFsaXplVmVydGljZXMgPSBmdW5jdGlvbiBub3JtYWxpemVWZXJ0aWNlcyh2ZXJ0aWNlcywgb3V0KSB7XG4gICAgb3V0ID0gb3V0IHx8IFtdO1xuICAgIHZhciBsZW4gPSB2ZXJ0aWNlcy5sZW5ndGggLyAzO1xuICAgIHZhciB2ZWN0b3JzID0gW107XG4gICAgdmFyIG1pblg7XG4gICAgdmFyIG1heFg7XG4gICAgdmFyIG1pblk7XG4gICAgdmFyIG1heFk7XG4gICAgdmFyIG1pblo7XG4gICAgdmFyIG1heFo7XG4gICAgdmFyIHY7XG4gICAgdmFyIGk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdiA9IHZlY3RvcnNbaV0gPSBuZXcgVmVjMyhcbiAgICAgICAgICAgIHZlcnRpY2VzW2kgKiAzXSxcbiAgICAgICAgICAgIHZlcnRpY2VzW2kgKiAzICsgMV0sXG4gICAgICAgICAgICB2ZXJ0aWNlc1tpICogMyArIDJdXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKG1pblggPT0gbnVsbCB8fCB2LnggPCBtaW5YKSBtaW5YID0gdi54O1xuICAgICAgICBpZiAobWF4WCA9PSBudWxsIHx8IHYueCA+IG1heFgpIG1heFggPSB2Lng7XG5cbiAgICAgICAgaWYgKG1pblkgPT0gbnVsbCB8fCB2LnkgPCBtaW5ZKSBtaW5ZID0gdi55O1xuICAgICAgICBpZiAobWF4WSA9PSBudWxsIHx8IHYueSA+IG1heFkpIG1heFkgPSB2Lnk7XG5cbiAgICAgICAgaWYgKG1pblogPT0gbnVsbCB8fCB2LnogPCBtaW5aKSBtaW5aID0gdi56O1xuICAgICAgICBpZiAobWF4WiA9PSBudWxsIHx8IHYueiA+IG1heFopIG1heFogPSB2Lno7XG4gICAgfVxuXG4gICAgdmFyIHRyYW5zbGF0aW9uID0gbmV3IFZlYzMoXG4gICAgICAgIGdldFRyYW5zbGF0aW9uRmFjdG9yKG1heFgsIG1pblgpLFxuICAgICAgICBnZXRUcmFuc2xhdGlvbkZhY3RvcihtYXhZLCBtaW5ZKSxcbiAgICAgICAgZ2V0VHJhbnNsYXRpb25GYWN0b3IobWF4WiwgbWluWilcbiAgICApO1xuXG4gICAgdmFyIHNjYWxlID0gTWF0aC5taW4oXG4gICAgICAgIGdldFNjYWxlRmFjdG9yKG1heFggKyB0cmFuc2xhdGlvbi54LCBtaW5YICsgdHJhbnNsYXRpb24ueCksXG4gICAgICAgIGdldFNjYWxlRmFjdG9yKG1heFkgKyB0cmFuc2xhdGlvbi55LCBtaW5ZICsgdHJhbnNsYXRpb24ueSksXG4gICAgICAgIGdldFNjYWxlRmFjdG9yKG1heFogKyB0cmFuc2xhdGlvbi56LCBtaW5aICsgdHJhbnNsYXRpb24ueilcbiAgICApO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHZlY3RvcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgb3V0LnB1c2guYXBwbHkob3V0LCB2ZWN0b3JzW2ldLmFkZCh0cmFuc2xhdGlvbikuc2NhbGUoc2NhbGUpLnRvQXJyYXkoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB0cmFuc2xhdGlvbiBhbW91bnQgZm9yIGEgZ2l2ZW4gYXhpcyB0byBub3JtYWxpemUgbW9kZWwgY29vcmRpbmF0ZXMuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gbWF4IE1heGltdW0gcG9zaXRpb24gdmFsdWUgb2YgZ2l2ZW4gYXhpcyBvbiB0aGUgbW9kZWwuXG4gKiBAcGFyYW0ge051bWJlcn0gbWluIE1pbmltdW0gcG9zaXRpb24gdmFsdWUgb2YgZ2l2ZW4gYXhpcyBvbiB0aGUgbW9kZWwuXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBOdW1iZXIgYnkgd2hpY2ggdGhlIGdpdmVuIGF4aXMgc2hvdWxkIGJlIHRyYW5zbGF0ZWQgZm9yIGFsbCB2ZXJ0aWNlcy5cbiAqL1xuZnVuY3Rpb24gZ2V0VHJhbnNsYXRpb25GYWN0b3IobWF4LCBtaW4pIHtcbiAgICByZXR1cm4gLShtaW4gKyAobWF4IC0gbWluKSAvIDIpO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgc2NhbGUgYW1vdW50IGZvciBhIGdpdmVuIGF4aXMgdG8gbm9ybWFsaXplIG1vZGVsIGNvb3JkaW5hdGVzLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1heCBNYXhpbXVtIHNjYWxlIHZhbHVlIG9mIGdpdmVuIGF4aXMgb24gdGhlIG1vZGVsLlxuICogQHBhcmFtIHtOdW1iZXJ9IG1pbiBNaW5pbXVtIHNjYWxlIHZhbHVlIG9mIGdpdmVuIGF4aXMgb24gdGhlIG1vZGVsLlxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gTnVtYmVyIGJ5IHdoaWNoIHRoZSBnaXZlbiBheGlzIHNob3VsZCBiZSBzY2FsZWQgZm9yIGFsbCB2ZXJ0aWNlcy5cbiAqL1xuZnVuY3Rpb24gZ2V0U2NhbGVGYWN0b3IobWF4LCBtaW4pIHtcbiAgICByZXR1cm4gMSAvICgobWF4IC0gbWluKSAvIDIpO1xufVxuXG4vKipcbiAqIEZpbmRzIHRoZSBhemltdXRoLCBvciBhbmdsZSBhYm92ZSB0aGUgWFkgcGxhbmUsIG9mIGEgZ2l2ZW4gdmVjdG9yLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSB2IFZlcnRleCB0byByZXRyZWl2ZSBhemltdXRoIGZyb20uXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBBemltdXRoIHZhbHVlIGluIHJhZGlhbnMuXG4gKi9cbkdlb21ldHJ5SGVscGVyLmdldEF6aW11dGggPSBmdW5jdGlvbiBhemltdXRoKHYpIHtcbiAgICByZXR1cm4gTWF0aC5hdGFuMih2WzJdLCAtdlswXSk7XG59O1xuXG4vKipcbiAqIEZpbmRzIHRoZSBhbHRpdHVkZSwgb3IgYW5nbGUgYWJvdmUgdGhlIFhaIHBsYW5lLCBvZiBhIGdpdmVuIHZlY3Rvci5cbiAqXG4gKiBAc3RhdGljXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdiBWZXJ0ZXggdG8gcmV0cmVpdmUgYWx0aXR1ZGUgZnJvbS5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IEFsdGl0dWRlIHZhbHVlIGluIHJhZGlhbnMuXG4gKi9cbkdlb21ldHJ5SGVscGVyLmdldEFsdGl0dWRlID0gZnVuY3Rpb24gYWx0aXR1ZGUodikge1xuICAgIHJldHVybiBNYXRoLmF0YW4yKC12WzFdLCBNYXRoLnNxcnQoKHZbMF0gKiB2WzBdKSArICh2WzJdICogdlsyXSkpKTtcbn07XG5cbi8qKlxuICogQ29udmVydHMgYSBsaXN0IG9mIGluZGljZXMgZnJvbSAndHJpYW5nbGUnIHRvICdsaW5lJyBmb3JtYXQuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IGluZGljZXMgSW5kaWNlcyBvZiBhbGwgZmFjZXMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcGFyYW0ge0FycmF5fSBvdXQgSW5kaWNlcyBvZiBhbGwgZmFjZXMgb24gdGhlIGdlb21ldHJ5XG4gKlxuICogQHJldHVybiB7QXJyYXl9IE5ldyBsaXN0IG9mIGxpbmUtZm9ybWF0dGVkIGluZGljZXNcbiAqL1xuR2VvbWV0cnlIZWxwZXIudHJpYW5nbGVzVG9MaW5lcyA9IGZ1bmN0aW9uIHRyaWFuZ2xlVG9MaW5lcyhpbmRpY2VzLCBvdXQpIHtcbiAgICB2YXIgbnVtVmVjdG9ycyA9IGluZGljZXMubGVuZ3RoIC8gMztcbiAgICBvdXQgPSBvdXQgfHwgW107XG4gICAgdmFyIGk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbnVtVmVjdG9yczsgaSsrKSB7XG4gICAgICAgIG91dC5wdXNoKGluZGljZXNbaSAqIDMgKyAwXSwgaW5kaWNlc1tpICogMyArIDFdKTtcbiAgICAgICAgb3V0LnB1c2goaW5kaWNlc1tpICogMyArIDFdLCBpbmRpY2VzW2kgKiAzICsgMl0pO1xuICAgICAgICBvdXQucHVzaChpbmRpY2VzW2kgKiAzICsgMl0sIGluZGljZXNbaSAqIDMgKyAwXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn07XG5cbi8qKlxuICogQWRkcyBhIHJldmVyc2Ugb3JkZXIgdHJpYW5nbGUgZm9yIGV2ZXJ5IHRyaWFuZ2xlIGluIHRoZSBtZXNoLiBBZGRzIGV4dHJhIHZlcnRpY2VzXG4gKiBhbmQgaW5kaWNlcyB0byBpbnB1dCBhcnJheXMuXG4gKlxuICogQHN0YXRpY1xuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHZlcnRpY2VzIFgsIFksIFogcG9zaXRpb25zIG9mIGFsbCB2ZXJ0aWNlcyBpbiB0aGUgZ2VvbWV0cnlcbiAqIEBwYXJhbSB7QXJyYXl9IGluZGljZXMgSW5kaWNlcyBvZiBhbGwgZmFjZXMgb24gdGhlIGdlb21ldHJ5XG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5HZW9tZXRyeUhlbHBlci5hZGRCYWNrZmFjZVRyaWFuZ2xlcyA9IGZ1bmN0aW9uIGFkZEJhY2tmYWNlVHJpYW5nbGVzKHZlcnRpY2VzLCBpbmRpY2VzKSB7XG4gICAgdmFyIG5GYWNlcyA9IGluZGljZXMubGVuZ3RoIC8gMztcblxuICAgIHZhciBtYXhJbmRleCA9IDA7XG4gICAgdmFyIGkgPSBpbmRpY2VzLmxlbmd0aDtcbiAgICB3aGlsZSAoaS0tKSBpZiAoaW5kaWNlc1tpXSA+IG1heEluZGV4KSBtYXhJbmRleCA9IGluZGljZXNbaV07XG5cbiAgICBtYXhJbmRleCsrO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IG5GYWNlczsgaSsrKSB7XG4gICAgICAgIHZhciBpbmRleE9uZSA9IGluZGljZXNbaSAqIDNdLFxuICAgICAgICAgICAgaW5kZXhUd28gPSBpbmRpY2VzW2kgKiAzICsgMV0sXG4gICAgICAgICAgICBpbmRleFRocmVlID0gaW5kaWNlc1tpICogMyArIDJdO1xuXG4gICAgICAgIGluZGljZXMucHVzaChpbmRleE9uZSArIG1heEluZGV4LCBpbmRleFRocmVlICsgbWF4SW5kZXgsIGluZGV4VHdvICsgbWF4SW5kZXgpO1xuICAgIH1cblxuICAgIC8vIEl0ZXJhdGluZyBpbnN0ZWFkIG9mIC5zbGljZSgpIGhlcmUgdG8gYXZvaWQgbWF4IGNhbGwgc3RhY2sgaXNzdWUuXG5cbiAgICB2YXIgblZlcnRzID0gdmVydGljZXMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBuVmVydHM7IGkrKykge1xuICAgICAgICB2ZXJ0aWNlcy5wdXNoKHZlcnRpY2VzW2ldKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdlb21ldHJ5SGVscGVyO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgR2VvbWV0cnkgPSByZXF1aXJlKCcuLi9HZW9tZXRyeScpO1xudmFyIEdlb21ldHJ5SGVscGVyID0gcmVxdWlyZSgnLi4vR2VvbWV0cnlIZWxwZXInKTtcblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHJldHVybnMgYSBuZXcgc3RhdGljIGdlb21ldHJ5LCB3aGljaCBpcyBwYXNzZWRcbiAqIGN1c3RvbSBidWZmZXIgZGF0YS5cbiAqXG4gKiBAY2xhc3MgUGxhbmVcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFBhcmFtZXRlcnMgdGhhdCBhbHRlciB0aGVcbiAqIHZlcnRleCBidWZmZXJzIG9mIHRoZSBnZW5lcmF0ZWQgZ2VvbWV0cnkuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBjb25zdHJ1Y3RlZCBnZW9tZXRyeVxuICovXG5mdW5jdGlvbiBQbGFuZShvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdmFyIGRldGFpbFggPSBvcHRpb25zLmRldGFpbFggfHwgb3B0aW9ucy5kZXRhaWwgfHwgMTtcbiAgICB2YXIgZGV0YWlsWSA9IG9wdGlvbnMuZGV0YWlsWSB8fCBvcHRpb25zLmRldGFpbCB8fCAxO1xuXG4gICAgdmFyIHZlcnRpY2VzICAgICAgPSBbXTtcbiAgICB2YXIgdGV4dHVyZUNvb3JkcyA9IFtdO1xuICAgIHZhciBub3JtYWxzICAgICAgID0gW107XG4gICAgdmFyIGluZGljZXMgICAgICAgPSBbXTtcblxuICAgIHZhciBpO1xuXG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPD0gZGV0YWlsWTsgeSsrKSB7XG4gICAgICAgIHZhciB0ID0geSAvIGRldGFpbFk7XG4gICAgICAgIGZvciAodmFyIHggPSAwOyB4IDw9IGRldGFpbFg7IHgrKykge1xuICAgICAgICAgICAgdmFyIHMgPSB4IC8gZGV0YWlsWDtcbiAgICAgICAgICAgIHZlcnRpY2VzLnB1c2goMi4gKiAocyAtIC41KSwgMiAqICh0IC0gLjUpLCAwKTtcbiAgICAgICAgICAgIHRleHR1cmVDb29yZHMucHVzaChzLCAxIC0gdCk7XG4gICAgICAgICAgICBpZiAoeCA8IGRldGFpbFggJiYgeSA8IGRldGFpbFkpIHtcbiAgICAgICAgICAgICAgICBpID0geCArIHkgKiAoZGV0YWlsWCArIDEpO1xuICAgICAgICAgICAgICAgIGluZGljZXMucHVzaChpLCBpICsgMSwgaSArIGRldGFpbFggKyAxKTtcbiAgICAgICAgICAgICAgICBpbmRpY2VzLnB1c2goaSArIGRldGFpbFggKyAxLCBpICsgMSwgaSArIGRldGFpbFggKyAyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmJhY2tmYWNlICE9PSBmYWxzZSkge1xuICAgICAgICBHZW9tZXRyeUhlbHBlci5hZGRCYWNrZmFjZVRyaWFuZ2xlcyh2ZXJ0aWNlcywgaW5kaWNlcyk7XG5cbiAgICAgICAgLy8gZHVwbGljYXRlIHRleHR1cmUgY29vcmRpbmF0ZXMgYXMgd2VsbFxuXG4gICAgICAgIHZhciBsZW4gPSB0ZXh0dXJlQ29vcmRzLmxlbmd0aDtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB0ZXh0dXJlQ29vcmRzLnB1c2godGV4dHVyZUNvb3Jkc1tpXSk7XG4gICAgfVxuXG4gICAgbm9ybWFscyA9IEdlb21ldHJ5SGVscGVyLmNvbXB1dGVOb3JtYWxzKHZlcnRpY2VzLCBpbmRpY2VzKTtcblxuICAgIHJldHVybiBuZXcgR2VvbWV0cnkoe1xuICAgICAgICBidWZmZXJzOiBbXG4gICAgICAgICAgICB7IG5hbWU6ICdhX3BvcycsIGRhdGE6IHZlcnRpY2VzIH0sXG4gICAgICAgICAgICB7IG5hbWU6ICdhX3RleENvb3JkJywgZGF0YTogdGV4dHVyZUNvb3Jkcywgc2l6ZTogMiB9LFxuICAgICAgICAgICAgeyBuYW1lOiAnYV9ub3JtYWxzJywgZGF0YTogbm9ybWFscyB9LFxuICAgICAgICAgICAgeyBuYW1lOiAnaW5kaWNlcycsIGRhdGE6IGluZGljZXMsIHNpemU6IDEgfVxuICAgICAgICBdXG4gICAgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGxhbmU7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQnVmZmVyIGlzIGEgcHJpdmF0ZSBjbGFzcyB0aGF0IHdyYXBzIHRoZSB2ZXJ0ZXggZGF0YSB0aGF0IGRlZmluZXNcbiAqIHRoZSB0aGUgcG9pbnRzIG9mIHRoZSB0cmlhbmdsZXMgdGhhdCB3ZWJnbCBkcmF3cy4gRWFjaCBidWZmZXJcbiAqIG1hcHMgdG8gb25lIGF0dHJpYnV0ZSBvZiBhIG1lc2guXG4gKlxuICogQGNsYXNzIEJ1ZmZlclxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHRhcmdldCBUaGUgYmluZCB0YXJnZXQgb2YgdGhlIGJ1ZmZlciB0byB1cGRhdGU6IEFSUkFZX0JVRkZFUiBvciBFTEVNRU5UX0FSUkFZX0JVRkZFUlxuICogQHBhcmFtIHtPYmplY3R9IHR5cGUgQXJyYXkgdHlwZSB0byBiZSB1c2VkIGluIGNhbGxzIHRvIGdsLmJ1ZmZlckRhdGEuXG4gKiBAcGFyYW0ge1dlYkdMQ29udGV4dH0gZ2wgVGhlIFdlYkdMIGNvbnRleHQgdGhhdCB0aGUgYnVmZmVyIGlzIGhvc3RlZCBieS5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBCdWZmZXIodGFyZ2V0LCB0eXBlLCBnbCkge1xuICAgIHRoaXMuYnVmZmVyID0gbnVsbDtcbiAgICB0aGlzLnRhcmdldCA9IHRhcmdldDtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMuZGF0YSA9IFtdO1xuICAgIHRoaXMuZ2wgPSBnbDtcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgV2ViR0wgYnVmZmVyIGlmIG9uZSBkb2VzIG5vdCB5ZXQgZXhpc3QgYW5kIGJpbmRzIHRoZSBidWZmZXIgdG9cbiAqIHRvIHRoZSBjb250ZXh0LiBSdW5zIGJ1ZmZlckRhdGEgd2l0aCBhcHByb3ByaWF0ZSBkYXRhLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5CdWZmZXIucHJvdG90eXBlLnN1YkRhdGEgPSBmdW5jdGlvbiBzdWJEYXRhKCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIGRhdGEgPSBbXTtcblxuICAgIC8vIHRvIHByZXZlbnQgYWdhaW5zdCBtYXhpbXVtIGNhbGwtc3RhY2sgaXNzdWUuXG4gICAgZm9yICh2YXIgaSA9IDAsIGNodW5rID0gMTAwMDA7IGkgPCB0aGlzLmRhdGEubGVuZ3RoOyBpICs9IGNodW5rKVxuICAgICAgICBkYXRhID0gQXJyYXkucHJvdG90eXBlLmNvbmNhdC5hcHBseShkYXRhLCB0aGlzLmRhdGEuc2xpY2UoaSwgaSArIGNodW5rKSk7XG5cbiAgICB0aGlzLmJ1ZmZlciA9IHRoaXMuYnVmZmVyIHx8IGdsLmNyZWF0ZUJ1ZmZlcigpO1xuICAgIGdsLmJpbmRCdWZmZXIodGhpcy50YXJnZXQsIHRoaXMuYnVmZmVyKTtcbiAgICBnbC5idWZmZXJEYXRhKHRoaXMudGFyZ2V0LCBuZXcgdGhpcy50eXBlKGRhdGEpLCBnbC5TVEFUSUNfRFJBVyk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJ1ZmZlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIElORElDRVMgPSAnaW5kaWNlcyc7XG5cbnZhciBCdWZmZXIgPSByZXF1aXJlKCcuL0J1ZmZlcicpO1xuXG4vKipcbiAqIEJ1ZmZlclJlZ2lzdHJ5IGlzIGEgY2xhc3MgdGhhdCBtYW5hZ2VzIGFsbG9jYXRpb24gb2YgYnVmZmVycyB0b1xuICogaW5wdXQgZ2VvbWV0cmllcy5cbiAqXG4gKiBAY2xhc3MgQnVmZmVyUmVnaXN0cnlcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7V2ViR0xDb250ZXh0fSBjb250ZXh0IFdlYkdMIGRyYXdpbmcgY29udGV4dCB0byBiZSBwYXNzZWQgdG8gYnVmZmVycy5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBCdWZmZXJSZWdpc3RyeShjb250ZXh0KSB7XG4gICAgdGhpcy5nbCA9IGNvbnRleHQ7XG5cbiAgICB0aGlzLnJlZ2lzdHJ5ID0ge307XG4gICAgdGhpcy5fZHluYW1pY0J1ZmZlcnMgPSBbXTtcbiAgICB0aGlzLl9zdGF0aWNCdWZmZXJzID0gW107XG5cbiAgICB0aGlzLl9hcnJheUJ1ZmZlck1heCA9IDMwMDAwO1xuICAgIHRoaXMuX2VsZW1lbnRCdWZmZXJNYXggPSAzMDAwMDtcbn1cblxuLyoqXG4gKiBCaW5kcyBhbmQgZmlsbHMgYWxsIHRoZSB2ZXJ0ZXggZGF0YSBpbnRvIHdlYmdsIGJ1ZmZlcnMuICBXaWxsIHJldXNlIGJ1ZmZlcnMgaWZcbiAqIHBvc3NpYmxlLiAgUG9wdWxhdGVzIHJlZ2lzdHJ5IHdpdGggdGhlIG5hbWUgb2YgdGhlIGJ1ZmZlciwgdGhlIFdlYkdMIGJ1ZmZlclxuICogb2JqZWN0LCBzcGFjaW5nIG9mIHRoZSBhdHRyaWJ1dGUsIHRoZSBhdHRyaWJ1dGUncyBvZmZzZXQgd2l0aGluIHRoZSBidWZmZXIsXG4gKiBhbmQgZmluYWxseSB0aGUgbGVuZ3RoIG9mIHRoZSBidWZmZXIuICBUaGlzIGluZm9ybWF0aW9uIGlzIGxhdGVyIGFjY2Vzc2VkIGJ5XG4gKiB0aGUgcm9vdCB0byBkcmF3IHRoZSBidWZmZXJzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gZ2VvbWV0cnlJZCBJZCBvZiB0aGUgZ2VvbWV0cnkgaW5zdGFuY2UgdGhhdCBob2xkcyB0aGUgYnVmZmVycy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIEtleSBvZiB0aGUgaW5wdXQgYnVmZmVyIGluIHRoZSBnZW9tZXRyeS5cbiAqIEBwYXJhbSB7QXJyYXl9IHZhbHVlIEZsYXQgYXJyYXkgY29udGFpbmluZyBpbnB1dCBkYXRhIGZvciBidWZmZXIuXG4gKiBAcGFyYW0ge051bWJlcn0gc3BhY2luZyBUaGUgc3BhY2luZywgb3IgaXRlbVNpemUsIG9mIHRoZSBpbnB1dCBidWZmZXIuXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGR5bmFtaWMgQm9vbGVhbiBkZW5vdGluZyB3aGV0aGVyIGEgZ2VvbWV0cnkgaXMgZHluYW1pYyBvciBzdGF0aWMuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQnVmZmVyUmVnaXN0cnkucHJvdG90eXBlLmFsbG9jYXRlID0gZnVuY3Rpb24gYWxsb2NhdGUoZ2VvbWV0cnlJZCwgbmFtZSwgdmFsdWUsIHNwYWNpbmcsIGR5bmFtaWMpIHtcbiAgICB2YXIgdmVydGV4QnVmZmVycyA9IHRoaXMucmVnaXN0cnlbZ2VvbWV0cnlJZF0gfHwgKHRoaXMucmVnaXN0cnlbZ2VvbWV0cnlJZF0gPSB7IGtleXM6IFtdLCB2YWx1ZXM6IFtdLCBzcGFjaW5nOiBbXSwgb2Zmc2V0OiBbXSwgbGVuZ3RoOiBbXSB9KTtcblxuICAgIHZhciBqID0gdmVydGV4QnVmZmVycy5rZXlzLmluZGV4T2YobmFtZSk7XG4gICAgdmFyIGlzSW5kZXggPSBuYW1lID09PSBJTkRJQ0VTO1xuICAgIHZhciBidWZmZXJGb3VuZCA9IGZhbHNlO1xuICAgIHZhciBuZXdPZmZzZXQ7XG4gICAgdmFyIG9mZnNldCA9IDA7XG4gICAgdmFyIGxlbmd0aDtcbiAgICB2YXIgYnVmZmVyO1xuICAgIHZhciBrO1xuXG4gICAgaWYgKGogPT09IC0xKSB7XG4gICAgICAgIGogPSB2ZXJ0ZXhCdWZmZXJzLmtleXMubGVuZ3RoO1xuICAgICAgICBsZW5ndGggPSBpc0luZGV4ID8gdmFsdWUubGVuZ3RoIDogTWF0aC5mbG9vcih2YWx1ZS5sZW5ndGggLyBzcGFjaW5nKTtcblxuICAgICAgICBpZiAoIWR5bmFtaWMpIHtcblxuICAgICAgICAgICAgLy8gVXNlIGEgcHJldmlvdXNseSBjcmVhdGVkIGJ1ZmZlciBpZiBhdmFpbGFibGUuXG5cbiAgICAgICAgICAgIGZvciAoayA9IDA7IGsgPCB0aGlzLl9zdGF0aWNCdWZmZXJzLmxlbmd0aDsgaysrKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNJbmRleCA9PT0gdGhpcy5fc3RhdGljQnVmZmVyc1trXS5pc0luZGV4KSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld09mZnNldCA9IHRoaXMuX3N0YXRpY0J1ZmZlcnNba10ub2Zmc2V0ICsgdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKCFpc0luZGV4ICYmIG5ld09mZnNldCA8IHRoaXMuX2FycmF5QnVmZmVyTWF4KSB8fCAoaXNJbmRleCAmJiBuZXdPZmZzZXQgPCB0aGlzLl9lbGVtZW50QnVmZmVyTWF4KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyID0gdGhpcy5fc3RhdGljQnVmZmVyc1trXS5idWZmZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXQgPSB0aGlzLl9zdGF0aWNCdWZmZXJzW2tdLm9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuX3N0YXRpY0J1ZmZlcnNba10ub2Zmc2V0ICs9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZlckZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBuZXcgc3RhdGljIGJ1ZmZlciBpbiBub25lIHdlcmUgZm91bmQuXG5cbiAgICAgICAgICAgIGlmICghYnVmZmVyRm91bmQpIHtcbiAgICAgICAgICAgICAgICBidWZmZXIgPSBuZXcgQnVmZmVyKFxuICAgICAgICAgICAgICAgICAgICBpc0luZGV4ID8gdGhpcy5nbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiA6IHRoaXMuZ2wuQVJSQVlfQlVGRkVSLFxuICAgICAgICAgICAgICAgICAgICBpc0luZGV4ID8gVWludDE2QXJyYXkgOiBGbG9hdDMyQXJyYXksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2xcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5fc3RhdGljQnVmZmVycy5wdXNoKHsgYnVmZmVyOiBidWZmZXIsIG9mZnNldDogdmFsdWUubGVuZ3RoLCBpc0luZGV4OiBpc0luZGV4IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuXG4gICAgICAgICAgICAvLyBGb3IgZHluYW1pYyBnZW9tZXRyaWVzLCBhbHdheXMgY3JlYXRlIG5ldyBidWZmZXIuXG5cbiAgICAgICAgICAgIGJ1ZmZlciA9IG5ldyBCdWZmZXIoXG4gICAgICAgICAgICAgICAgaXNJbmRleCA/IHRoaXMuZ2wuRUxFTUVOVF9BUlJBWV9CVUZGRVIgOiB0aGlzLmdsLkFSUkFZX0JVRkZFUixcbiAgICAgICAgICAgICAgICBpc0luZGV4ID8gVWludDE2QXJyYXkgOiBGbG9hdDMyQXJyYXksXG4gICAgICAgICAgICAgICAgdGhpcy5nbFxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgdGhpcy5fZHluYW1pY0J1ZmZlcnMucHVzaCh7IGJ1ZmZlcjogYnVmZmVyLCBvZmZzZXQ6IHZhbHVlLmxlbmd0aCwgaXNJbmRleDogaXNJbmRleCB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgcmVnaXN0cnkgZm9yIHRoZSBzcGVjIHdpdGggYnVmZmVyIGluZm9ybWF0aW9uLlxuXG4gICAgICAgIHZlcnRleEJ1ZmZlcnMua2V5cy5wdXNoKG5hbWUpO1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLnZhbHVlcy5wdXNoKGJ1ZmZlcik7XG4gICAgICAgIHZlcnRleEJ1ZmZlcnMuc3BhY2luZy5wdXNoKHNwYWNpbmcpO1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLm9mZnNldC5wdXNoKG9mZnNldCk7XG4gICAgICAgIHZlcnRleEJ1ZmZlcnMubGVuZ3RoLnB1c2gobGVuZ3RoKTtcbiAgICB9XG5cbiAgICB2YXIgbGVuID0gdmFsdWUubGVuZ3RoO1xuICAgIGZvciAoayA9IDA7IGsgPCBsZW47IGsrKykge1xuICAgICAgICB2ZXJ0ZXhCdWZmZXJzLnZhbHVlc1tqXS5kYXRhW29mZnNldCArIGtdID0gdmFsdWVba107XG4gICAgfVxuICAgIHZlcnRleEJ1ZmZlcnMudmFsdWVzW2pdLnN1YkRhdGEoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyUmVnaXN0cnk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbi8qKlxuICogVGFrZXMgdGhlIG9yaWdpbmFsIHJlbmRlcmluZyBjb250ZXh0cycgY29tcGlsZXIgZnVuY3Rpb25cbiAqIGFuZCBhdWdtZW50cyBpdCB3aXRoIGFkZGVkIGZ1bmN0aW9uYWxpdHkgZm9yIHBhcnNpbmcgYW5kXG4gKiBkaXNwbGF5aW5nIGVycm9ycy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBBdWdtZW50ZWQgZnVuY3Rpb25cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBEZWJ1ZygpIHtcbiAgICByZXR1cm4gX2F1Z21lbnRGdW5jdGlvbihcbiAgICAgICAgdGhpcy5nbC5jb21waWxlU2hhZGVyLFxuICAgICAgICBmdW5jdGlvbihzaGFkZXIpIHtcbiAgICAgICAgICAgIGlmICghdGhpcy5nZXRTaGFkZXJQYXJhbWV0ZXIoc2hhZGVyLCB0aGlzLkNPTVBJTEVfU1RBVFVTKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvcnMgPSB0aGlzLmdldFNoYWRlckluZm9Mb2coc2hhZGVyKTtcbiAgICAgICAgICAgICAgICB2YXIgc291cmNlID0gdGhpcy5nZXRTaGFkZXJTb3VyY2Uoc2hhZGVyKTtcbiAgICAgICAgICAgICAgICBfcHJvY2Vzc0Vycm9ycyhlcnJvcnMsIHNvdXJjZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICApO1xufTtcblxuLy8gVGFrZXMgYSBmdW5jdGlvbiwga2VlcHMgdGhlIHJlZmVyZW5jZSBhbmQgcmVwbGFjZXMgaXQgYnkgYSBjbG9zdXJlIHRoYXRcbi8vIGV4ZWN1dGVzIHRoZSBvcmlnaW5hbCBmdW5jdGlvbiBhbmQgdGhlIHByb3ZpZGVkIGNhbGxiYWNrLlxuZnVuY3Rpb24gX2F1Z21lbnRGdW5jdGlvbihmdW5jLCBjYWxsYmFjaykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlcyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgY2FsbGJhY2suYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xufVxuXG4vLyBQYXJzZXMgZXJyb3JzIGFuZCBmYWlsZWQgc291cmNlIGNvZGUgZnJvbSBzaGFkZXJzIGluIG9yZGVyXG4vLyB0byBidWlsZCBkaXNwbGF5YWJsZSBlcnJvciBibG9ja3MuXG4vLyBJbnNwaXJlZCBieSBKYXVtZSBTYW5jaGV6IEVsaWFzLlxuZnVuY3Rpb24gX3Byb2Nlc3NFcnJvcnMoZXJyb3JzLCBzb3VyY2UpIHtcblxuICAgIHZhciBjc3MgPSAnYm9keSxodG1se2JhY2tncm91bmQ6I2UzZTNlMztmb250LWZhbWlseTptb25hY28sbW9ub3NwYWNlO2ZvbnQtc2l6ZToxNHB4O2xpbmUtaGVpZ2h0OjEuN2VtfScgK1xuICAgICAgICAgICAgICAnI3NoYWRlclJlcG9ydHtsZWZ0OjA7dG9wOjA7cmlnaHQ6MDtib3gtc2l6aW5nOmJvcmRlci1ib3g7cG9zaXRpb246YWJzb2x1dGU7ei1pbmRleDoxMDAwO2NvbG9yOicgK1xuICAgICAgICAgICAgICAnIzIyMjtwYWRkaW5nOjE1cHg7d2hpdGUtc3BhY2U6bm9ybWFsO2xpc3Qtc3R5bGUtdHlwZTpub25lO21hcmdpbjo1MHB4IGF1dG87bWF4LXdpZHRoOjEyMDBweH0nICtcbiAgICAgICAgICAgICAgJyNzaGFkZXJSZXBvcnQgbGl7YmFja2dyb3VuZC1jb2xvcjojZmZmO21hcmdpbjoxM3B4IDA7Ym94LXNoYWRvdzowIDFweCAycHggcmdiYSgwLDAsMCwuMTUpOycgK1xuICAgICAgICAgICAgICAncGFkZGluZzoyMHB4IDMwcHg7Ym9yZGVyLXJhZGl1czoycHg7Ym9yZGVyLWxlZnQ6MjBweCBzb2xpZCAjZTAxMTExfXNwYW57Y29sb3I6I2UwMTExMTsnICtcbiAgICAgICAgICAgICAgJ3RleHQtZGVjb3JhdGlvbjp1bmRlcmxpbmU7Zm9udC13ZWlnaHQ6NzAwfSNzaGFkZXJSZXBvcnQgbGkgcHtwYWRkaW5nOjA7bWFyZ2luOjB9JyArXG4gICAgICAgICAgICAgICcjc2hhZGVyUmVwb3J0IGxpOm50aC1jaGlsZChldmVuKXtiYWNrZ3JvdW5kLWNvbG9yOiNmNGY0ZjR9JyArXG4gICAgICAgICAgICAgICcjc2hhZGVyUmVwb3J0IGxpIHA6Zmlyc3QtY2hpbGR7bWFyZ2luLWJvdHRvbToxMHB4O2NvbG9yOiM2NjZ9JztcblxuICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChlbCk7XG4gICAgZWwudGV4dENvbnRlbnQgPSBjc3M7XG5cbiAgICB2YXIgcmVwb3J0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWwnKTtcbiAgICByZXBvcnQuc2V0QXR0cmlidXRlKCdpZCcsICdzaGFkZXJSZXBvcnQnKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHJlcG9ydCk7XG5cbiAgICB2YXIgcmUgPSAvRVJST1I6IFtcXGRdKzooW1xcZF0rKTogKC4rKS9nbWk7XG4gICAgdmFyIGxpbmVzID0gc291cmNlLnNwbGl0KCdcXG4nKTtcblxuICAgIHZhciBtO1xuICAgIHdoaWxlICgobSA9IHJlLmV4ZWMoZXJyb3JzKSkgIT0gbnVsbCkge1xuICAgICAgICBpZiAobS5pbmRleCA9PT0gcmUubGFzdEluZGV4KSByZS5sYXN0SW5kZXgrKztcbiAgICAgICAgdmFyIGxpID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbGknKTtcbiAgICAgICAgdmFyIGNvZGUgPSAnPHA+PHNwYW4+RVJST1I8L3NwYW4+IFwiJyArIG1bMl0gKyAnXCIgaW4gbGluZSAnICsgbVsxXSArICc8L3A+JztcbiAgICAgICAgY29kZSArPSAnPHA+PGI+JyArIGxpbmVzW21bMV0gLSAxXS5yZXBsYWNlKC9eWyBcXHRdKy9nLCAnJykgKyAnPC9iPjwvcD4nO1xuICAgICAgICBsaS5pbm5lckhUTUwgPSBjb2RlO1xuICAgICAgICByZXBvcnQuYXBwZW5kQ2hpbGQobGkpO1xuICAgIH1cbn1cbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGNsb25lID0gcmVxdWlyZSgnLi4vdXRpbGl0aWVzL2Nsb25lJyk7XG52YXIga2V5VmFsdWVUb0FycmF5cyA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy9rZXlWYWx1ZVRvQXJyYXlzJyk7XG5cbnZhciB2ZXJ0ZXhXcmFwcGVyID0gcmVxdWlyZSgnLi4vd2ViZ2wtc2hhZGVycycpLnZlcnRleDtcbnZhciBmcmFnbWVudFdyYXBwZXIgPSByZXF1aXJlKCcuLi93ZWJnbC1zaGFkZXJzJykuZnJhZ21lbnQ7XG52YXIgRGVidWcgPSByZXF1aXJlKCcuL0RlYnVnJyk7XG5cbnZhciBWRVJURVhfU0hBREVSID0gMzU2MzM7XG52YXIgRlJBR01FTlRfU0hBREVSID0gMzU2MzI7XG52YXIgaWRlbnRpdHlNYXRyaXggPSBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV07XG5cbnZhciBoZWFkZXIgPSAncHJlY2lzaW9uIG1lZGl1bXAgZmxvYXQ7XFxuJztcblxudmFyIFRZUEVTID0ge1xuICAgIHVuZGVmaW5lZDogJ2Zsb2F0ICcsXG4gICAgMTogJ2Zsb2F0ICcsXG4gICAgMjogJ3ZlYzIgJyxcbiAgICAzOiAndmVjMyAnLFxuICAgIDQ6ICd2ZWM0ICcsXG4gICAgMTY6ICdtYXQ0ICdcbn07XG5cbnZhciBpbnB1dFR5cGVzID0ge1xuICAgIHVfYmFzZUNvbG9yOiAndmVjNCcsXG4gICAgdV9ub3JtYWxzOiAndmVydCcsXG4gICAgdV9nbG9zc2luZXNzOiAndmVjNCcsXG4gICAgdV9wb3NpdGlvbk9mZnNldDogJ3ZlcnQnXG59O1xuXG52YXIgbWFza3MgPSAge1xuICAgIHZlcnQ6IDEsXG4gICAgdmVjMzogMixcbiAgICB2ZWM0OiA0LFxuICAgIGZsb2F0OiA4XG59O1xuXG4vKipcbiAqIFVuaWZvcm0ga2V5cyBhbmQgdmFsdWVzXG4gKi9cbnZhciB1bmlmb3JtcyA9IGtleVZhbHVlVG9BcnJheXMoe1xuICAgIHVfcGVyc3BlY3RpdmU6IGlkZW50aXR5TWF0cml4LFxuICAgIHVfdmlldzogaWRlbnRpdHlNYXRyaXgsXG4gICAgdV9yZXNvbHV0aW9uOiBbMCwgMCwgMF0sXG4gICAgdV90cmFuc2Zvcm06IGlkZW50aXR5TWF0cml4LFxuICAgIHVfc2l6ZTogWzEsIDEsIDFdLFxuICAgIHVfdGltZTogMCxcbiAgICB1X29wYWNpdHk6IDEsXG4gICAgdV9tZXRhbG5lc3M6IDAsXG4gICAgdV9nbG9zc2luZXNzOiBbMCwgMCwgMCwgMF0sXG4gICAgdV9iYXNlQ29sb3I6IFsxLCAxLCAxLCAxXSxcbiAgICB1X25vcm1hbHM6IFsxLCAxLCAxXSxcbiAgICB1X3Bvc2l0aW9uT2Zmc2V0OiBbMCwgMCwgMF0sXG4gICAgdV9saWdodFBvc2l0aW9uOiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X2xpZ2h0Q29sb3I6IGlkZW50aXR5TWF0cml4LFxuICAgIHVfYW1iaWVudExpZ2h0OiBbMCwgMCwgMF0sXG4gICAgdV9mbGF0U2hhZGluZzogMCxcbiAgICB1X251bUxpZ2h0czogMFxufSk7XG5cbi8qKlxuICogQXR0cmlidXRlcyBrZXlzIGFuZCB2YWx1ZXNcbiAqL1xudmFyIGF0dHJpYnV0ZXMgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICBhX3BvczogWzAsIDAsIDBdLFxuICAgIGFfdGV4Q29vcmQ6IFswLCAwXSxcbiAgICBhX25vcm1hbHM6IFswLCAwLCAwXVxufSk7XG5cbi8qKlxuICogVmFyeWluZ3Mga2V5cyBhbmQgdmFsdWVzXG4gKi9cbnZhciB2YXJ5aW5ncyA9IGtleVZhbHVlVG9BcnJheXMoe1xuICAgIHZfdGV4dHVyZUNvb3JkaW5hdGU6IFswLCAwXSxcbiAgICB2X25vcm1hbDogWzAsIDAsIDBdLFxuICAgIHZfcG9zaXRpb246IFswLCAwLCAwXSxcbiAgICB2X2V5ZVZlY3RvcjogWzAsIDAsIDBdXG59KTtcblxuLyoqXG4gKiBBIGNsYXNzIHRoYXQgaGFuZGxlcyBpbnRlcmFjdGlvbnMgd2l0aCB0aGUgV2ViR0wgc2hhZGVyIHByb2dyYW1cbiAqIHVzZWQgYnkgYSBzcGVjaWZpYyBjb250ZXh0LiAgSXQgbWFuYWdlcyBjcmVhdGlvbiBvZiB0aGUgc2hhZGVyIHByb2dyYW1cbiAqIGFuZCB0aGUgYXR0YWNoZWQgdmVydGV4IGFuZCBmcmFnbWVudCBzaGFkZXJzLiAgSXQgaXMgYWxzbyBpbiBjaGFyZ2Ugb2ZcbiAqIHBhc3NpbmcgYWxsIHVuaWZvcm1zIHRvIHRoZSBXZWJHTENvbnRleHQuXG4gKlxuICogQGNsYXNzIFByb2dyYW1cbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7V2ViR0xfQ29udGV4dH0gZ2wgQ29udGV4dCB0byBiZSB1c2VkIHRvIGNyZWF0ZSB0aGUgc2hhZGVyIHByb2dyYW1cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIFByb2dyYW0gb3B0aW9uc1xuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIFByb2dyYW0oZ2wsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmdsID0gZ2w7XG4gICAgdGhpcy50ZXh0dXJlU2xvdHMgPSAxO1xuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICB0aGlzLnJlZ2lzdGVyZWRNYXRlcmlhbHMgPSB7fTtcbiAgICB0aGlzLmZsYWdnZWRVbmlmb3JtcyA9IFtdO1xuICAgIHRoaXMuY2FjaGVkVW5pZm9ybXMgID0ge307XG4gICAgdGhpcy51bmlmb3JtVHlwZXMgPSBbXTtcblxuICAgIHRoaXMuZGVmaW5pdGlvblZlYzQgPSBbXTtcbiAgICB0aGlzLmRlZmluaXRpb25WZWMzID0gW107XG4gICAgdGhpcy5kZWZpbml0aW9uRmxvYXQgPSBbXTtcbiAgICB0aGlzLmFwcGxpY2F0aW9uVmVjMyA9IFtdO1xuICAgIHRoaXMuYXBwbGljYXRpb25WZWM0ID0gW107XG4gICAgdGhpcy5hcHBsaWNhdGlvbkZsb2F0ID0gW107XG4gICAgdGhpcy5hcHBsaWNhdGlvblZlcnQgPSBbXTtcbiAgICB0aGlzLmRlZmluaXRpb25WZXJ0ID0gW107XG5cbiAgICB0aGlzLnJlc2V0UHJvZ3JhbSgpO1xufVxuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciBhIG1hdGVyaWFsIGhhcyBhbHJlYWR5IGJlZW4gcmVnaXN0ZXJlZCB0b1xuICogdGhlIHNoYWRlciBwcm9ncmFtLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBOYW1lIG9mIHRhcmdldCBpbnB1dCBvZiBtYXRlcmlhbC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBtYXRlcmlhbCBDb21waWxlZCBtYXRlcmlhbCBvYmplY3QgYmVpbmcgdmVyaWZpZWQuXG4gKlxuICogQHJldHVybiB7UHJvZ3JhbX0gdGhpcyBDdXJyZW50IHByb2dyYW0uXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLnJlZ2lzdGVyTWF0ZXJpYWwgPSBmdW5jdGlvbiByZWdpc3Rlck1hdGVyaWFsKG5hbWUsIG1hdGVyaWFsKSB7XG4gICAgdmFyIGNvbXBpbGVkID0gbWF0ZXJpYWw7XG4gICAgdmFyIHR5cGUgPSBpbnB1dFR5cGVzW25hbWVdO1xuICAgIHZhciBtYXNrID0gbWFza3NbdHlwZV07XG5cbiAgICBpZiAoKHRoaXMucmVnaXN0ZXJlZE1hdGVyaWFsc1ttYXRlcmlhbC5faWRdICYgbWFzaykgPT09IG1hc2spIHJldHVybiB0aGlzO1xuXG4gICAgdmFyIGs7XG5cbiAgICBmb3IgKGsgaW4gY29tcGlsZWQudW5pZm9ybXMpIHtcbiAgICAgICAgaWYgKHVuaWZvcm1zLmtleXMuaW5kZXhPZihrKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIHVuaWZvcm1zLmtleXMucHVzaChrKTtcbiAgICAgICAgICAgIHVuaWZvcm1zLnZhbHVlcy5wdXNoKGNvbXBpbGVkLnVuaWZvcm1zW2tdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAoayBpbiBjb21waWxlZC52YXJ5aW5ncykge1xuICAgICAgICBpZiAodmFyeWluZ3Mua2V5cy5pbmRleE9mKGspID09PSAtMSkge1xuICAgICAgICAgICAgdmFyeWluZ3Mua2V5cy5wdXNoKGspO1xuICAgICAgICAgICAgdmFyeWluZ3MudmFsdWVzLnB1c2goY29tcGlsZWQudmFyeWluZ3Nba10pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChrIGluIGNvbXBpbGVkLmF0dHJpYnV0ZXMpIHtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMua2V5cy5pbmRleE9mKGspID09PSAtMSkge1xuICAgICAgICAgICAgYXR0cmlidXRlcy5rZXlzLnB1c2goayk7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzLnZhbHVlcy5wdXNoKGNvbXBpbGVkLmF0dHJpYnV0ZXNba10pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5yZWdpc3RlcmVkTWF0ZXJpYWxzW21hdGVyaWFsLl9pZF0gfD0gbWFzaztcblxuICAgIGlmICh0eXBlID09PSAnZmxvYXQnKSB7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvbkZsb2F0LnB1c2gobWF0ZXJpYWwuZGVmaW5lcyk7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvbkZsb2F0LnB1c2goJ2Zsb2F0IGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCkge1xcbiAnICArIGNvbXBpbGVkLmdsc2wgKyAnIFxcbn0nKTtcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvbkZsb2F0LnB1c2goJ2lmIChpbnQoYWJzKElEKSkgPT0gJyArIG1hdGVyaWFsLl9pZCArICcpIHJldHVybiBmYV8nICsgbWF0ZXJpYWwuX2lkICArICcoKTsnKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gJ3ZlYzMnKSB7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlYzMucHVzaChtYXRlcmlhbC5kZWZpbmVzKTtcbiAgICAgICAgdGhpcy5kZWZpbml0aW9uVmVjMy5wdXNoKCd2ZWMzIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCkge1xcbiAnICArIGNvbXBpbGVkLmdsc2wgKyAnIFxcbn0nKTtcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvblZlYzMucHVzaCgnaWYgKGludChhYnMoSUQueCkpID09ICcgKyBtYXRlcmlhbC5faWQgKyAnKSByZXR1cm4gZmFfJyArIG1hdGVyaWFsLl9pZCArICcoKTsnKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gJ3ZlYzQnKSB7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlYzQucHVzaChtYXRlcmlhbC5kZWZpbmVzKTtcbiAgICAgICAgdGhpcy5kZWZpbml0aW9uVmVjNC5wdXNoKCd2ZWM0IGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCkge1xcbiAnICArIGNvbXBpbGVkLmdsc2wgKyAnIFxcbn0nKTtcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvblZlYzQucHVzaCgnaWYgKGludChhYnMoSUQueCkpID09ICcgKyBtYXRlcmlhbC5faWQgKyAnKSByZXR1cm4gZmFfJyArIG1hdGVyaWFsLl9pZCArICcoKTsnKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gJ3ZlcnQnKSB7XG4gICAgICAgIHRoaXMuZGVmaW5pdGlvblZlcnQucHVzaChtYXRlcmlhbC5kZWZpbmVzKTtcbiAgICAgICAgdGhpcy5kZWZpbml0aW9uVmVydC5wdXNoKCd2ZWMzIGZhXycgKyBtYXRlcmlhbC5faWQgKyAnKCkge1xcbiAnICArIGNvbXBpbGVkLmdsc2wgKyAnIFxcbn0nKTtcbiAgICAgICAgdGhpcy5hcHBsaWNhdGlvblZlcnQucHVzaCgnaWYgKGludChhYnMoSUQueCkpID09ICcgKyBtYXRlcmlhbC5faWQgKyAnKSByZXR1cm4gZmFfJyArIG1hdGVyaWFsLl9pZCArICcoKTsnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5yZXNldFByb2dyYW0oKTtcbn07XG5cbi8qKlxuICogQ2xlYXJzIGFsbCBjYWNoZWQgdW5pZm9ybXMgYW5kIGF0dHJpYnV0ZSBsb2NhdGlvbnMuICBBc3NlbWJsZXNcbiAqIG5ldyBmcmFnbWVudCBhbmQgdmVydGV4IHNoYWRlcnMgYW5kIGJhc2VkIG9uIG1hdGVyaWFsIGZyb21cbiAqIGN1cnJlbnRseSByZWdpc3RlcmVkIG1hdGVyaWFscy4gIEF0dGFjaGVzIHNhaWQgc2hhZGVycyB0byBuZXdcbiAqIHNoYWRlciBwcm9ncmFtIGFuZCB1cG9uIHN1Y2Nlc3MgbGlua3MgcHJvZ3JhbSB0byB0aGUgV2ViR0xcbiAqIGNvbnRleHQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1Byb2dyYW19IEN1cnJlbnQgcHJvZ3JhbS5cbiAqL1xuUHJvZ3JhbS5wcm90b3R5cGUucmVzZXRQcm9ncmFtID0gZnVuY3Rpb24gcmVzZXRQcm9ncmFtKCkge1xuICAgIHZhciB2ZXJ0ZXhIZWFkZXIgPSBbaGVhZGVyXTtcbiAgICB2YXIgZnJhZ21lbnRIZWFkZXIgPSBbaGVhZGVyXTtcblxuICAgIHZhciBmcmFnbWVudFNvdXJjZTtcbiAgICB2YXIgdmVydGV4U291cmNlO1xuICAgIHZhciBwcm9ncmFtO1xuICAgIHZhciBuYW1lO1xuICAgIHZhciB2YWx1ZTtcbiAgICB2YXIgaTtcblxuICAgIHRoaXMudW5pZm9ybUxvY2F0aW9ucyAgID0gW107XG4gICAgdGhpcy5hdHRyaWJ1dGVMb2NhdGlvbnMgPSB7fTtcblxuICAgIHRoaXMudW5pZm9ybVR5cGVzID0ge307XG5cbiAgICB0aGlzLmF0dHJpYnV0ZU5hbWVzID0gY2xvbmUoYXR0cmlidXRlcy5rZXlzKTtcbiAgICB0aGlzLmF0dHJpYnV0ZVZhbHVlcyA9IGNsb25lKGF0dHJpYnV0ZXMudmFsdWVzKTtcblxuICAgIHRoaXMudmFyeWluZ05hbWVzID0gY2xvbmUodmFyeWluZ3Mua2V5cyk7XG4gICAgdGhpcy52YXJ5aW5nVmFsdWVzID0gY2xvbmUodmFyeWluZ3MudmFsdWVzKTtcblxuICAgIHRoaXMudW5pZm9ybU5hbWVzID0gY2xvbmUodW5pZm9ybXMua2V5cyk7XG4gICAgdGhpcy51bmlmb3JtVmFsdWVzID0gY2xvbmUodW5pZm9ybXMudmFsdWVzKTtcblxuICAgIHRoaXMuZmxhZ2dlZFVuaWZvcm1zID0gW107XG4gICAgdGhpcy5jYWNoZWRVbmlmb3JtcyA9IHt9O1xuXG4gICAgZnJhZ21lbnRIZWFkZXIucHVzaCgndW5pZm9ybSBzYW1wbGVyMkQgdV90ZXh0dXJlc1s3XTtcXG4nKTtcblxuICAgIGlmICh0aGlzLmFwcGxpY2F0aW9uVmVydC5sZW5ndGgpIHtcbiAgICAgICAgdmVydGV4SGVhZGVyLnB1c2goJ3VuaWZvcm0gc2FtcGxlcjJEIHVfdGV4dHVyZXNbN107XFxuJyk7XG4gICAgfVxuXG4gICAgZm9yKGkgPSAwOyBpIDwgdGhpcy51bmlmb3JtTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmFtZSA9IHRoaXMudW5pZm9ybU5hbWVzW2ldO1xuICAgICAgICB2YWx1ZSA9IHRoaXMudW5pZm9ybVZhbHVlc1tpXTtcbiAgICAgICAgdmVydGV4SGVhZGVyLnB1c2goJ3VuaWZvcm0gJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gKyBuYW1lICsgJztcXG4nKTtcbiAgICAgICAgZnJhZ21lbnRIZWFkZXIucHVzaCgndW5pZm9ybSAnICsgVFlQRVNbdmFsdWUubGVuZ3RoXSArIG5hbWUgKyAnO1xcbicpO1xuICAgIH1cblxuICAgIGZvcihpID0gMDsgaSA8IHRoaXMuYXR0cmlidXRlTmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbmFtZSA9IHRoaXMuYXR0cmlidXRlTmFtZXNbaV07XG4gICAgICAgIHZhbHVlID0gdGhpcy5hdHRyaWJ1dGVWYWx1ZXNbaV07XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCdhdHRyaWJ1dGUgJyArIFRZUEVTW3ZhbHVlLmxlbmd0aF0gKyBuYW1lICsgJztcXG4nKTtcbiAgICB9XG5cbiAgICBmb3IoaSA9IDA7IGkgPCB0aGlzLnZhcnlpbmdOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBuYW1lID0gdGhpcy52YXJ5aW5nTmFtZXNbaV07XG4gICAgICAgIHZhbHVlID0gdGhpcy52YXJ5aW5nVmFsdWVzW2ldO1xuICAgICAgICB2ZXJ0ZXhIZWFkZXIucHVzaCgndmFyeWluZyAnICsgVFlQRVNbdmFsdWUubGVuZ3RoXSAgKyBuYW1lICsgJztcXG4nKTtcbiAgICAgICAgZnJhZ21lbnRIZWFkZXIucHVzaCgndmFyeWluZyAnICsgVFlQRVNbdmFsdWUubGVuZ3RoXSArIG5hbWUgKyAnO1xcbicpO1xuICAgIH1cblxuICAgIHZlcnRleFNvdXJjZSA9IHZlcnRleEhlYWRlci5qb2luKCcnKSArIHZlcnRleFdyYXBwZXJcbiAgICAgICAgLnJlcGxhY2UoJyN2ZXJ0X2RlZmluaXRpb25zJywgdGhpcy5kZWZpbml0aW9uVmVydC5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyN2ZXJ0X2FwcGxpY2F0aW9ucycsIHRoaXMuYXBwbGljYXRpb25WZXJ0LmpvaW4oJ1xcbicpKTtcblxuICAgIGZyYWdtZW50U291cmNlID0gZnJhZ21lbnRIZWFkZXIuam9pbignJykgKyBmcmFnbWVudFdyYXBwZXJcbiAgICAgICAgLnJlcGxhY2UoJyN2ZWMzX2RlZmluaXRpb25zJywgdGhpcy5kZWZpbml0aW9uVmVjMy5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyN2ZWMzX2FwcGxpY2F0aW9ucycsIHRoaXMuYXBwbGljYXRpb25WZWMzLmpvaW4oJ1xcbicpKVxuICAgICAgICAucmVwbGFjZSgnI3ZlYzRfZGVmaW5pdGlvbnMnLCB0aGlzLmRlZmluaXRpb25WZWM0LmpvaW4oJ1xcbicpKVxuICAgICAgICAucmVwbGFjZSgnI3ZlYzRfYXBwbGljYXRpb25zJywgdGhpcy5hcHBsaWNhdGlvblZlYzQuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjZmxvYXRfZGVmaW5pdGlvbnMnLCB0aGlzLmRlZmluaXRpb25GbG9hdC5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyNmbG9hdF9hcHBsaWNhdGlvbnMnLCB0aGlzLmFwcGxpY2F0aW9uRmxvYXQuam9pbignXFxuJykpO1xuXG4gICAgcHJvZ3JhbSA9IHRoaXMuZ2wuY3JlYXRlUHJvZ3JhbSgpO1xuXG4gICAgdGhpcy5nbC5hdHRhY2hTaGFkZXIoXG4gICAgICAgIHByb2dyYW0sXG4gICAgICAgIHRoaXMuY29tcGlsZVNoYWRlcih0aGlzLmdsLmNyZWF0ZVNoYWRlcihWRVJURVhfU0hBREVSKSwgdmVydGV4U291cmNlKVxuICAgICk7XG5cbiAgICB0aGlzLmdsLmF0dGFjaFNoYWRlcihcbiAgICAgICAgcHJvZ3JhbSxcbiAgICAgICAgdGhpcy5jb21waWxlU2hhZGVyKHRoaXMuZ2wuY3JlYXRlU2hhZGVyKEZSQUdNRU5UX1NIQURFUiksIGZyYWdtZW50U291cmNlKVxuICAgICk7XG5cbiAgICB0aGlzLmdsLmxpbmtQcm9ncmFtKHByb2dyYW0pO1xuXG4gICAgaWYgKCEgdGhpcy5nbC5nZXRQcm9ncmFtUGFyYW1ldGVyKHByb2dyYW0sIHRoaXMuZ2wuTElOS19TVEFUVVMpKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ2xpbmsgZXJyb3I6ICcgKyB0aGlzLmdsLmdldFByb2dyYW1JbmZvTG9nKHByb2dyYW0pKTtcbiAgICAgICAgdGhpcy5wcm9ncmFtID0gbnVsbDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMucHJvZ3JhbSA9IHByb2dyYW07XG4gICAgICAgIHRoaXMuZ2wudXNlUHJvZ3JhbSh0aGlzLnByb2dyYW0pO1xuICAgIH1cblxuICAgIHRoaXMuc2V0VW5pZm9ybXModGhpcy51bmlmb3JtTmFtZXMsIHRoaXMudW5pZm9ybVZhbHVlcyk7XG5cbiAgICB2YXIgdGV4dHVyZUxvY2F0aW9uID0gdGhpcy5nbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCAndV90ZXh0dXJlc1swXScpO1xuICAgIHRoaXMuZ2wudW5pZm9ybTFpdih0ZXh0dXJlTG9jYXRpb24sIFswLCAxLCAyLCAzLCA0LCA1LCA2XSk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQ29tcGFyZXMgdGhlIHZhbHVlIG9mIHRoZSBpbnB1dCB1bmlmb3JtIHZhbHVlIGFnYWluc3RcbiAqIHRoZSBjYWNoZWQgdmFsdWUgc3RvcmVkIG9uIHRoZSBQcm9ncmFtIGNsYXNzLiAgVXBkYXRlcyBhbmRcbiAqIGNyZWF0ZXMgbmV3IGVudHJpZXMgaW4gdGhlIGNhY2hlIHdoZW4gbmVjZXNzYXJ5LlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSB0YXJnZXROYW1lIEtleSBvZiB1bmlmb3JtIHNwZWMgYmVpbmcgZXZhbHVhdGVkLlxuICogQHBhcmFtIHtOdW1iZXJ8QXJyYXl9IHZhbHVlIFZhbHVlIG9mIHVuaWZvcm0gc3BlYyBiZWluZyBldmFsdWF0ZWQuXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gYm9vbGVhbiBJbmRpY2F0aW5nIHdoZXRoZXIgdGhlIHVuaWZvcm0gYmVpbmcgc2V0IGlzIGNhY2hlZC5cbiAqL1xuUHJvZ3JhbS5wcm90b3R5cGUudW5pZm9ybUlzQ2FjaGVkID0gZnVuY3Rpb24odGFyZ2V0TmFtZSwgdmFsdWUpIHtcbiAgICBpZih0aGlzLmNhY2hlZFVuaWZvcm1zW3RhcmdldE5hbWVdID09IG51bGwpIHtcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXSA9IG5ldyBGbG9hdDMyQXJyYXkodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgZWxzZSBpZiAodmFsdWUubGVuZ3RoKSB7XG4gICAgICAgIHZhciBpID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICBpZih2YWx1ZVtpXSAhPT0gdGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXVtpXSkge1xuICAgICAgICAgICAgICAgIGkgPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgd2hpbGUoaS0tKSB0aGlzLmNhY2hlZFVuaWZvcm1zW3RhcmdldE5hbWVdW2ldID0gdmFsdWVbaV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZWxzZSBpZiAodGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXSAhPT0gdmFsdWUpIHtcbiAgICAgICAgdGhpcy5jYWNoZWRVbmlmb3Jtc1t0YXJnZXROYW1lXSA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEhhbmRsZXMgYWxsIHBhc3Npbmcgb2YgdW5pZm9ybXMgdG8gV2ViR0wgZHJhd2luZyBjb250ZXh0LiAgVGhpc1xuICogZnVuY3Rpb24gd2lsbCBmaW5kIHRoZSB1bmlmb3JtIGxvY2F0aW9uIGFuZCB0aGVuLCBiYXNlZCBvblxuICogYSB0eXBlIGluZmVycmVkIGZyb20gdGhlIGphdmFzY3JpcHQgdmFsdWUgb2YgdGhlIHVuaWZvcm0sIGl0IHdpbGwgY2FsbFxuICogdGhlIGFwcHJvcHJpYXRlIGZ1bmN0aW9uIHRvIHBhc3MgdGhlIHVuaWZvcm0gdG8gV2ViR0wuICBGaW5hbGx5LFxuICogc2V0VW5pZm9ybXMgd2lsbCBpdGVyYXRlIHRocm91Z2ggdGhlIHBhc3NlZCBpbiBzaGFkZXJDaHVua3MgKGlmIGFueSlcbiAqIGFuZCBzZXQgdGhlIGFwcHJvcHJpYXRlIHVuaWZvcm1zIHRvIHNwZWNpZnkgd2hpY2ggY2h1bmtzIHRvIHVzZS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge0FycmF5fSB1bmlmb3JtTmFtZXMgQXJyYXkgY29udGFpbmluZyB0aGUga2V5cyBvZiBhbGwgdW5pZm9ybXMgdG8gYmUgc2V0LlxuICogQHBhcmFtIHtBcnJheX0gdW5pZm9ybVZhbHVlIEFycmF5IGNvbnRhaW5pbmcgdGhlIHZhbHVlcyBvZiBhbGwgdW5pZm9ybXMgdG8gYmUgc2V0LlxuICpcbiAqIEByZXR1cm4ge1Byb2dyYW19IEN1cnJlbnQgcHJvZ3JhbS5cbiAqL1xuUHJvZ3JhbS5wcm90b3R5cGUuc2V0VW5pZm9ybXMgPSBmdW5jdGlvbiAodW5pZm9ybU5hbWVzLCB1bmlmb3JtVmFsdWUpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBsb2NhdGlvbjtcbiAgICB2YXIgdmFsdWU7XG4gICAgdmFyIG5hbWU7XG4gICAgdmFyIGxlbjtcbiAgICB2YXIgaTtcblxuICAgIGlmICghdGhpcy5wcm9ncmFtKSByZXR1cm4gdGhpcztcblxuICAgIGxlbiA9IHVuaWZvcm1OYW1lcy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSB1bmlmb3JtTmFtZXNbaV07XG4gICAgICAgIHZhbHVlID0gdW5pZm9ybVZhbHVlW2ldO1xuXG4gICAgICAgIC8vIFJldHJlaXZlIHRoZSBjYWNoZWQgbG9jYXRpb24gb2YgdGhlIHVuaWZvcm0sXG4gICAgICAgIC8vIHJlcXVlc3RpbmcgYSBuZXcgbG9jYXRpb24gZnJvbSB0aGUgV2ViR0wgY29udGV4dFxuICAgICAgICAvLyBpZiBpdCBkb2VzIG5vdCB5ZXQgZXhpc3QuXG5cbiAgICAgICAgbG9jYXRpb24gPSB0aGlzLnVuaWZvcm1Mb2NhdGlvbnNbbmFtZV07XG5cbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxvY2F0aW9uID0gZ2wuZ2V0VW5pZm9ybUxvY2F0aW9uKHRoaXMucHJvZ3JhbSwgbmFtZSk7XG4gICAgICAgICAgICB0aGlzLnVuaWZvcm1Mb2NhdGlvbnNbbmFtZV0gPSBsb2NhdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSB2YWx1ZSBpcyBhbHJlYWR5IHNldCBmb3IgdGhlXG4gICAgICAgIC8vIGdpdmVuIHVuaWZvcm0uXG5cbiAgICAgICAgaWYgKHRoaXMudW5pZm9ybUlzQ2FjaGVkKG5hbWUsIHZhbHVlKSkgY29udGludWU7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBjb3JyZWN0IGZ1bmN0aW9uIGFuZCBwYXNzIHRoZSB1bmlmb3JtXG4gICAgICAgIC8vIHZhbHVlIHRvIFdlYkdMLlxuXG4gICAgICAgIGlmICghdGhpcy51bmlmb3JtVHlwZXNbbmFtZV0pIHtcbiAgICAgICAgICAgIHRoaXMudW5pZm9ybVR5cGVzW25hbWVdID0gdGhpcy5nZXRVbmlmb3JtVHlwZUZyb21WYWx1ZSh2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYWxsIHVuaWZvcm0gc2V0dGVyIGZ1bmN0aW9uIG9uIFdlYkdMIGNvbnRleHQgd2l0aCBjb3JyZWN0IHZhbHVlXG5cbiAgICAgICAgc3dpdGNoICh0aGlzLnVuaWZvcm1UeXBlc1tuYW1lXSkge1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybTRmdic6ICBnbC51bmlmb3JtNGZ2KGxvY2F0aW9uLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybTNmdic6ICBnbC51bmlmb3JtM2Z2KGxvY2F0aW9uLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybTJmdic6ICBnbC51bmlmb3JtMmZ2KGxvY2F0aW9uLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybTFmdic6ICBnbC51bmlmb3JtMWZ2KGxvY2F0aW9uLCB2YWx1ZSk7IGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndW5pZm9ybTFmJyA6ICBnbC51bmlmb3JtMWYobG9jYXRpb24sIHZhbHVlKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1bmlmb3JtTWF0cml4M2Z2JzogZ2wudW5pZm9ybU1hdHJpeDNmdihsb2NhdGlvbiwgZmFsc2UsIHZhbHVlKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1bmlmb3JtTWF0cml4NGZ2JzogZ2wudW5pZm9ybU1hdHJpeDRmdihsb2NhdGlvbiwgZmFsc2UsIHZhbHVlKTsgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogSW5mZXJzIHVuaWZvcm0gc2V0dGVyIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiB0aGUgV2ViR0wgY29udGV4dCwgYmFzZWRcbiAqIG9uIGFuIGlucHV0IHZhbHVlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcnxBcnJheX0gdmFsdWUgVmFsdWUgZnJvbSB3aGljaCB1bmlmb3JtIHR5cGUgaXMgaW5mZXJyZWQuXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHVuaWZvcm0gZnVuY3Rpb24gZm9yIGdpdmVuIHZhbHVlLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS5nZXRVbmlmb3JtVHlwZUZyb21WYWx1ZSA9IGZ1bmN0aW9uIGdldFVuaWZvcm1UeXBlRnJvbVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpIHx8IHZhbHVlIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgIHN3aXRjaCAodmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgICBjYXNlIDE6ICByZXR1cm4gJ3VuaWZvcm0xZnYnO1xuICAgICAgICAgICAgY2FzZSAyOiAgcmV0dXJuICd1bmlmb3JtMmZ2JztcbiAgICAgICAgICAgIGNhc2UgMzogIHJldHVybiAndW5pZm9ybTNmdic7XG4gICAgICAgICAgICBjYXNlIDQ6ICByZXR1cm4gJ3VuaWZvcm00ZnYnO1xuICAgICAgICAgICAgY2FzZSA5OiAgcmV0dXJuICd1bmlmb3JtTWF0cml4M2Z2JztcbiAgICAgICAgICAgIGNhc2UgMTY6IHJldHVybiAndW5pZm9ybU1hdHJpeDRmdic7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoIWlzTmFOKHBhcnNlRmxvYXQodmFsdWUpKSAmJiBpc0Zpbml0ZSh2YWx1ZSkpIHtcbiAgICAgICAgcmV0dXJuICd1bmlmb3JtMWYnO1xuICAgIH1cblxuICAgIHRocm93ICdjYW50IGxvYWQgdW5pZm9ybSBcIicgKyBuYW1lICsgJ1wiIHdpdGggdmFsdWU6JyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcbn07XG5cbi8qKlxuICogQWRkcyBzaGFkZXIgc291cmNlIHRvIHNoYWRlciBhbmQgY29tcGlsZXMgdGhlIGlucHV0IHNoYWRlci4gIENoZWNrc1xuICogY29tcGlsZSBzdGF0dXMgYW5kIGxvZ3MgZXJyb3IgaWYgbmVjZXNzYXJ5LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gc2hhZGVyIFByb2dyYW0gdG8gYmUgY29tcGlsZWQuXG4gKiBAcGFyYW0ge1N0cmluZ30gc291cmNlIFNvdXJjZSB0byBiZSB1c2VkIGluIHRoZSBzaGFkZXIuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBDb21waWxlZCBzaGFkZXIuXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLmNvbXBpbGVTaGFkZXIgPSBmdW5jdGlvbiBjb21waWxlU2hhZGVyKHNoYWRlciwgc291cmNlKSB7XG4gICAgdmFyIGkgPSAxO1xuXG4gICAgaWYgKHRoaXMub3B0aW9ucy5kZWJ1Zykge1xuICAgICAgICB0aGlzLmdsLmNvbXBpbGVTaGFkZXIgPSBEZWJ1Zy5jYWxsKHRoaXMpO1xuICAgIH1cblxuICAgIHRoaXMuZ2wuc2hhZGVyU291cmNlKHNoYWRlciwgc291cmNlKTtcbiAgICB0aGlzLmdsLmNvbXBpbGVTaGFkZXIoc2hhZGVyKTtcbiAgICBpZiAoIXRoaXMuZ2wuZ2V0U2hhZGVyUGFyYW1ldGVyKHNoYWRlciwgdGhpcy5nbC5DT01QSUxFX1NUQVRVUykpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignY29tcGlsZSBlcnJvcjogJyArIHRoaXMuZ2wuZ2V0U2hhZGVySW5mb0xvZyhzaGFkZXIpKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignMTogJyArIHNvdXJjZS5yZXBsYWNlKC9cXG4vZywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICdcXG4nICsgKGkrPTEpICsgJzogJztcbiAgICAgICAgfSkpO1xuICAgIH1cblxuICAgIHJldHVybiBzaGFkZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByb2dyYW07XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGV4dHVyZSBpcyBhIHByaXZhdGUgY2xhc3MgdGhhdCBzdG9yZXMgaW1hZ2UgZGF0YVxuICogdG8gYmUgYWNjZXNzZWQgZnJvbSBhIHNoYWRlciBvciB1c2VkIGFzIGEgcmVuZGVyIHRhcmdldC5cbiAqXG4gKiBAY2xhc3MgVGV4dHVyZVxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtHTH0gZ2wgR0xcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE9wdGlvbnNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBUZXh0dXJlKGdsLCBvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgdGhpcy5pZCA9IGdsLmNyZWF0ZVRleHR1cmUoKTtcbiAgICB0aGlzLndpZHRoID0gb3B0aW9ucy53aWR0aCB8fCAwO1xuICAgIHRoaXMuaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgMDtcbiAgICB0aGlzLm1pcG1hcCA9IG9wdGlvbnMubWlwbWFwO1xuICAgIHRoaXMuZm9ybWF0ID0gb3B0aW9ucy5mb3JtYXQgfHwgJ1JHQkEnO1xuICAgIHRoaXMudHlwZSA9IG9wdGlvbnMudHlwZSB8fCAnVU5TSUdORURfQllURSc7XG4gICAgdGhpcy5nbCA9IGdsO1xuXG4gICAgdGhpcy5iaW5kKCk7XG5cbiAgICBnbC5waXhlbFN0b3JlaShnbC5VTlBBQ0tfRkxJUF9ZX1dFQkdMLCBvcHRpb25zLmZsaXBZV2ViZ2wgfHwgZmFsc2UpO1xuICAgIGdsLnBpeGVsU3RvcmVpKGdsLlVOUEFDS19QUkVNVUxUSVBMWV9BTFBIQV9XRUJHTCwgb3B0aW9ucy5wcmVtdWx0aXBseUFscGhhV2ViZ2wgfHwgZmFsc2UpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX01BR19GSUxURVIsIGdsW29wdGlvbnMubWFnRmlsdGVyXSB8fCBnbC5ORUFSRVNUKTtcbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUlOX0ZJTFRFUiwgZ2xbb3B0aW9ucy5taW5GaWx0ZXJdIHx8IGdsLk5FQVJFU1QpO1xuXG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfUywgZ2xbb3B0aW9ucy53cmFwU10gfHwgZ2wuQ0xBTVBfVE9fRURHRSk7XG4gICAgZ2wudGV4UGFyYW1ldGVyaShnbC5URVhUVVJFXzJELCBnbC5URVhUVVJFX1dSQVBfVCwgZ2xbb3B0aW9ucy53cmFwVF0gfHwgZ2wuQ0xBTVBfVE9fRURHRSk7XG59XG5cbi8qKlxuICogQmluZHMgdGhpcyB0ZXh0dXJlIGFzIHRoZSBzZWxlY3RlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICogQHJldHVybiB7T2JqZWN0fSBDdXJyZW50IHRleHR1cmUgaW5zdGFuY2UuXG4gKi9cblRleHR1cmUucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiBiaW5kKCkge1xuICAgIHRoaXMuZ2wuYmluZFRleHR1cmUodGhpcy5nbC5URVhUVVJFXzJELCB0aGlzLmlkKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRXJhc2VzIHRoZSB0ZXh0dXJlIGRhdGEgaW4gdGhlIGdpdmVuIHRleHR1cmUgc2xvdC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgdGV4dHVyZSBpbnN0YW5jZS5cbiAqL1xuVGV4dHVyZS5wcm90b3R5cGUudW5iaW5kID0gZnVuY3Rpb24gdW5iaW5kKCkge1xuICAgIHRoaXMuZ2wuYmluZFRleHR1cmUodGhpcy5nbC5URVhUVVJFXzJELCBudWxsKTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVwbGFjZXMgdGhlIGltYWdlIGRhdGEgaW4gdGhlIHRleHR1cmUgd2l0aCB0aGUgZ2l2ZW4gaW1hZ2UuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7SW1hZ2V9ICAgaW1nICAgICBUaGUgaW1hZ2Ugb2JqZWN0IHRvIHVwbG9hZCBwaXhlbCBkYXRhIGZyb20uXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgQ3VycmVudCB0ZXh0dXJlIGluc3RhbmNlLlxuICovXG5UZXh0dXJlLnByb3RvdHlwZS5zZXRJbWFnZSA9IGZ1bmN0aW9uIHNldEltYWdlKGltZykge1xuICAgIHRoaXMuZ2wudGV4SW1hZ2UyRCh0aGlzLmdsLlRFWFRVUkVfMkQsIDAsIHRoaXMuZ2xbdGhpcy5mb3JtYXRdLCB0aGlzLmdsW3RoaXMuZm9ybWF0XSwgdGhpcy5nbFt0aGlzLnR5cGVdLCBpbWcpO1xuICAgIGlmICh0aGlzLm1pcG1hcCkgdGhpcy5nbC5nZW5lcmF0ZU1pcG1hcCh0aGlzLmdsLlRFWFRVUkVfMkQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlcyB0aGUgaW1hZ2UgZGF0YSBpbiB0aGUgdGV4dHVyZSB3aXRoIGFuIGFycmF5IG9mIGFyYml0cmFyeSBkYXRhLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0FycmF5fSAgIGlucHV0ICAgQXJyYXkgdG8gYmUgc2V0IGFzIGRhdGEgdG8gdGV4dHVyZS5cbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICBDdXJyZW50IHRleHR1cmUgaW5zdGFuY2UuXG4gKi9cblRleHR1cmUucHJvdG90eXBlLnNldEFycmF5ID0gZnVuY3Rpb24gc2V0QXJyYXkoaW5wdXQpIHtcbiAgICB0aGlzLmdsLnRleEltYWdlMkQodGhpcy5nbC5URVhUVVJFXzJELCAwLCB0aGlzLmdsW3RoaXMuZm9ybWF0XSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQsIDAsIHRoaXMuZ2xbdGhpcy5mb3JtYXRdLCB0aGlzLmdsW3RoaXMudHlwZV0sIGlucHV0KTtcbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRHVtcHMgdGhlIHJnYi1waXhlbCBjb250ZW50cyBvZiBhIHRleHR1cmUgaW50byBhbiBhcnJheSBmb3IgZGVidWdnaW5nIHB1cnBvc2VzXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB4ICAgICAgICB4LW9mZnNldCBiZXR3ZWVuIHRleHR1cmUgY29vcmRpbmF0ZXMgYW5kIHNuYXBzaG90XG4gKiBAcGFyYW0ge051bWJlcn0geSAgICAgICAgeS1vZmZzZXQgYmV0d2VlbiB0ZXh0dXJlIGNvb3JkaW5hdGVzIGFuZCBzbmFwc2hvdFxuICogQHBhcmFtIHtOdW1iZXJ9IHdpZHRoICAgIHgtZGVwdGggb2YgdGhlIHNuYXBzaG90XG4gKiBAcGFyYW0ge051bWJlcn0gaGVpZ2h0ICAgeS1kZXB0aCBvZiB0aGUgc25hcHNob3RcbiAqXG4gKiBAcmV0dXJuIHtBcnJheX0gICAgICAgICAgQW4gYXJyYXkgb2YgdGhlIHBpeGVscyBjb250YWluZWQgaW4gdGhlIHNuYXBzaG90LlxuICovXG5UZXh0dXJlLnByb3RvdHlwZS5yZWFkQmFjayA9IGZ1bmN0aW9uIHJlYWRCYWNrKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBwaXhlbHM7XG4gICAgeCA9IHggfHwgMDtcbiAgICB5ID0geSB8fCAwO1xuICAgIHdpZHRoID0gd2lkdGggfHwgdGhpcy53aWR0aDtcbiAgICBoZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5oZWlnaHQ7XG4gICAgdmFyIGZiID0gZ2wuY3JlYXRlRnJhbWVidWZmZXIoKTtcbiAgICBnbC5iaW5kRnJhbWVidWZmZXIoZ2wuRlJBTUVCVUZGRVIsIGZiKTtcbiAgICBnbC5mcmFtZWJ1ZmZlclRleHR1cmUyRChnbC5GUkFNRUJVRkZFUiwgZ2wuQ09MT1JfQVRUQUNITUVOVDAsIGdsLlRFWFRVUkVfMkQsIHRoaXMuaWQsIDApO1xuICAgIGlmIChnbC5jaGVja0ZyYW1lYnVmZmVyU3RhdHVzKGdsLkZSQU1FQlVGRkVSKSA9PT0gZ2wuRlJBTUVCVUZGRVJfQ09NUExFVEUpIHtcbiAgICAgICAgcGl4ZWxzID0gbmV3IFVpbnQ4QXJyYXkod2lkdGggKiBoZWlnaHQgKiA0KTtcbiAgICAgICAgZ2wucmVhZFBpeGVscyh4LCB5LCB3aWR0aCwgaGVpZ2h0LCBnbC5SR0JBLCBnbC5VTlNJR05FRF9CWVRFLCBwaXhlbHMpO1xuICAgIH1cbiAgICByZXR1cm4gcGl4ZWxzO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0dXJlO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIFRleHR1cmUgPSByZXF1aXJlKCcuL1RleHR1cmUnKTtcbnZhciBjcmVhdGVDaGVja2VyYm9hcmQgPSByZXF1aXJlKCcuL2NyZWF0ZUNoZWNrZXJib2FyZCcpO1xuXG4vKipcbiAqIEhhbmRsZXMgbG9hZGluZywgYmluZGluZywgYW5kIHJlc2FtcGxpbmcgb2YgdGV4dHVyZXMgZm9yIFdlYkdMUmVuZGVyZXIuXG4gKlxuICogQGNsYXNzIFRleHR1cmVNYW5hZ2VyXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge1dlYkdMX0NvbnRleHR9IGdsIENvbnRleHQgdXNlZCB0byBjcmVhdGUgYW5kIGJpbmQgdGV4dHVyZXMuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gVGV4dHVyZU1hbmFnZXIoZ2wpIHtcbiAgICB0aGlzLnJlZ2lzdHJ5ID0gW107XG4gICAgdGhpcy5fbmVlZHNSZXNhbXBsZSA9IFtdO1xuXG4gICAgdGhpcy5fYWN0aXZlVGV4dHVyZSA9IDA7XG4gICAgdGhpcy5fYm91bmRUZXh0dXJlID0gbnVsbDtcblxuICAgIHRoaXMuX2NoZWNrZXJib2FyZCA9IGNyZWF0ZUNoZWNrZXJib2FyZCgpO1xuXG4gICAgdGhpcy5nbCA9IGdsO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBmdW5jdGlvbiB1c2VkIGJ5IFdlYkdMUmVuZGVyZXIgdG8gcXVldWUgcmVzYW1wbGVzIG9uXG4gKiByZWdpc3RlcmVkIHRleHR1cmVzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gICAgICB0aW1lICAgIFRpbWUgaW4gbWlsbGlzZWNvbmRzIGFjY29yZGluZyB0byB0aGUgY29tcG9zaXRvci5cbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gICAgICAgICAgdW5kZWZpbmVkXG4gKi9cblRleHR1cmVNYW5hZ2VyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiB1cGRhdGUodGltZSkge1xuICAgIHZhciByZWdpc3RyeUxlbmd0aCA9IHRoaXMucmVnaXN0cnkubGVuZ3RoO1xuXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCByZWdpc3RyeUxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciB0ZXh0dXJlID0gdGhpcy5yZWdpc3RyeVtpXTtcblxuICAgICAgICBpZiAodGV4dHVyZSAmJiB0ZXh0dXJlLmlzTG9hZGVkICYmIHRleHR1cmUucmVzYW1wbGVSYXRlKSB7XG4gICAgICAgICAgICBpZiAoIXRleHR1cmUubGFzdFJlc2FtcGxlIHx8IHRpbWUgLSB0ZXh0dXJlLmxhc3RSZXNhbXBsZSA+IHRleHR1cmUucmVzYW1wbGVSYXRlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLl9uZWVkc1Jlc2FtcGxlW3RleHR1cmUuaWRdKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX25lZWRzUmVzYW1wbGVbdGV4dHVyZS5pZF0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB0ZXh0dXJlLmxhc3RSZXNhbXBsZSA9IHRpbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgc3BlYyBhbmQgY3JlYXRlcyBhIHRleHR1cmUgYmFzZWQgb24gZ2l2ZW4gdGV4dHVyZSBkYXRhLlxuICogSGFuZGxlcyBsb2FkaW5nIGFzc2V0cyBpZiBuZWNlc3NhcnkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSAgaW5wdXQgICBPYmplY3QgY29udGFpbmluZyB0ZXh0dXJlIGlkLCB0ZXh0dXJlIGRhdGFcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICBhbmQgb3B0aW9ucyB1c2VkIHRvIGRyYXcgdGV4dHVyZS5cbiAqIEBwYXJhbSB7TnVtYmVyfSAgc2xvdCAgICBUZXh0dXJlIHNsb3QgdG8gYmluZCBnZW5lcmF0ZWQgdGV4dHVyZSB0by5cbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gICAgICB1bmRlZmluZWRcbiAqL1xuVGV4dHVyZU1hbmFnZXIucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gcmVnaXN0ZXIoaW5wdXQsIHNsb3QpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIHNvdXJjZSA9IGlucHV0LmRhdGE7XG4gICAgdmFyIHRleHR1cmVJZCA9IGlucHV0LmlkO1xuICAgIHZhciBvcHRpb25zID0gaW5wdXQub3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgdGV4dHVyZSA9IHRoaXMucmVnaXN0cnlbdGV4dHVyZUlkXTtcbiAgICB2YXIgc3BlYztcblxuICAgIGlmICghdGV4dHVyZSkge1xuXG4gICAgICAgIHRleHR1cmUgPSBuZXcgVGV4dHVyZSh0aGlzLmdsLCBvcHRpb25zKTtcbiAgICAgICAgdGV4dHVyZS5zZXRJbWFnZSh0aGlzLl9jaGVja2VyYm9hcmQpO1xuXG4gICAgICAgIC8vIEFkZCB0ZXh0dXJlIHRvIHJlZ2lzdHJ5XG5cbiAgICAgICAgc3BlYyA9IHRoaXMucmVnaXN0cnlbdGV4dHVyZUlkXSA9IHtcbiAgICAgICAgICAgIHJlc2FtcGxlUmF0ZTogb3B0aW9ucy5yZXNhbXBsZVJhdGUgfHwgbnVsbCxcbiAgICAgICAgICAgIGxhc3RSZXNhbXBsZTogbnVsbCxcbiAgICAgICAgICAgIGlzTG9hZGVkOiBmYWxzZSxcbiAgICAgICAgICAgIHRleHR1cmU6IHRleHR1cmUsXG4gICAgICAgICAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICAgICAgICAgIGlkOiB0ZXh0dXJlSWQsXG4gICAgICAgICAgICBzbG90OiBzbG90XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSGFuZGxlIGFycmF5XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoc291cmNlKSB8fCBzb3VyY2UgaW5zdGFuY2VvZiBVaW50OEFycmF5IHx8IHNvdXJjZSBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSkge1xuICAgICAgICAgICAgdGhpcy5iaW5kVGV4dHVyZSh0ZXh0dXJlSWQpO1xuICAgICAgICAgICAgdGV4dHVyZS5zZXRBcnJheShzb3VyY2UpO1xuICAgICAgICAgICAgc3BlYy5pc0xvYWRlZCA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgdmlkZW9cblxuICAgICAgICBlbHNlIGlmICh3aW5kb3cgJiYgc291cmNlIGluc3RhbmNlb2Ygd2luZG93LkhUTUxWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHNvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRkYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuYmluZFRleHR1cmUodGV4dHVyZUlkKTtcbiAgICAgICAgICAgICAgICB0ZXh0dXJlLnNldEltYWdlKHNvdXJjZSk7XG5cbiAgICAgICAgICAgICAgICBzcGVjLmlzTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzcGVjLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGltYWdlIHVybFxuXG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBsb2FkSW1hZ2Uoc291cmNlLCBmdW5jdGlvbiAoaW1nKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuYmluZFRleHR1cmUodGV4dHVyZUlkKTtcbiAgICAgICAgICAgICAgICB0ZXh0dXJlLnNldEltYWdlKGltZyk7XG5cbiAgICAgICAgICAgICAgICBzcGVjLmlzTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzcGVjLnNvdXJjZSA9IGltZztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRleHR1cmVJZDtcbn07XG5cbi8qKlxuICogTG9hZHMgYW4gaW1hZ2UgZnJvbSBhIHN0cmluZyBvciBJbWFnZSBvYmplY3QgYW5kIGV4ZWN1dGVzIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IGlucHV0IFRoZSBpbnB1dCBpbWFnZSBkYXRhIHRvIGxvYWQgYXMgYW4gYXNzZXQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgZmlyZWQgd2hlbiB0aGUgaW1hZ2UgaGFzIGZpbmlzaGVkIGxvYWRpbmcuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBJbWFnZSBvYmplY3QgYmVpbmcgbG9hZGVkLlxuICovXG5mdW5jdGlvbiBsb2FkSW1hZ2UgKGlucHV0LCBjYWxsYmFjaykge1xuICAgIHZhciBpbWFnZSA9ICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnID8gbmV3IEltYWdlKCkgOiBpbnB1dCkgfHwge307XG4gICAgICAgIGltYWdlLmNyb3NzT3JpZ2luID0gJ2Fub255bW91cyc7XG5cbiAgICBpZiAoIWltYWdlLnNyYykgaW1hZ2Uuc3JjID0gaW5wdXQ7XG4gICAgaWYgKCFpbWFnZS5jb21wbGV0ZSkge1xuICAgICAgICBpbWFnZS5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhpbWFnZSk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhpbWFnZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGltYWdlO1xufVxuXG4vKipcbiAqIFNldHMgYWN0aXZlIHRleHR1cmUgc2xvdCBhbmQgYmluZHMgdGFyZ2V0IHRleHR1cmUuICBBbHNvIGhhbmRsZXNcbiAqIHJlc2FtcGxpbmcgd2hlbiBuZWNlc3NhcnkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCBJZGVudGlmaWVyIHVzZWQgdG8gcmV0cmVpdmUgdGV4dHVyZSBzcGVjXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuVGV4dHVyZU1hbmFnZXIucHJvdG90eXBlLmJpbmRUZXh0dXJlID0gZnVuY3Rpb24gYmluZFRleHR1cmUoaWQpIHtcbiAgICB2YXIgc3BlYyA9IHRoaXMucmVnaXN0cnlbaWRdO1xuXG4gICAgaWYgKHRoaXMuX2FjdGl2ZVRleHR1cmUgIT09IHNwZWMuc2xvdCkge1xuICAgICAgICB0aGlzLmdsLmFjdGl2ZVRleHR1cmUodGhpcy5nbC5URVhUVVJFMCArIHNwZWMuc2xvdCk7XG4gICAgICAgIHRoaXMuX2FjdGl2ZVRleHR1cmUgPSBzcGVjLnNsb3Q7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2JvdW5kVGV4dHVyZSAhPT0gaWQpIHtcbiAgICAgICAgdGhpcy5fYm91bmRUZXh0dXJlID0gaWQ7XG4gICAgICAgIHNwZWMudGV4dHVyZS5iaW5kKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX25lZWRzUmVzYW1wbGVbc3BlYy5pZF0pIHtcblxuICAgICAgICAvLyBUT0RPOiBBY2NvdW50IGZvciByZXNhbXBsaW5nIG9mIGFycmF5cy5cblxuICAgICAgICBzcGVjLnRleHR1cmUuc2V0SW1hZ2Uoc3BlYy5zb3VyY2UpO1xuICAgICAgICB0aGlzLl9uZWVkc1Jlc2FtcGxlW3NwZWMuaWRdID0gZmFsc2U7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0dXJlTWFuYWdlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFByb2dyYW0gPSByZXF1aXJlKCcuL1Byb2dyYW0nKTtcbnZhciBCdWZmZXJSZWdpc3RyeSA9IHJlcXVpcmUoJy4vQnVmZmVyUmVnaXN0cnknKTtcbnZhciBQbGFuZSA9IHJlcXVpcmUoJy4uL3dlYmdsLWdlb21ldHJpZXMvcHJpbWl0aXZlcy9QbGFuZScpO1xudmFyIHNvcnRlciA9IHJlcXVpcmUoJy4vcmFkaXhTb3J0Jyk7XG52YXIga2V5VmFsdWVUb0FycmF5cyA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy9rZXlWYWx1ZVRvQXJyYXlzJyk7XG52YXIgVGV4dHVyZU1hbmFnZXIgPSByZXF1aXJlKCcuL1RleHR1cmVNYW5hZ2VyJyk7XG52YXIgY29tcGlsZU1hdGVyaWFsID0gcmVxdWlyZSgnLi9jb21waWxlTWF0ZXJpYWwnKTtcblxudmFyIGlkZW50aXR5ID0gWzEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDEsIDAsIDAsIDAsIDAsIDFdO1xuXG52YXIgZ2xvYmFsVW5pZm9ybXMgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICAndV9udW1MaWdodHMnOiAwLFxuICAgICd1X2FtYmllbnRMaWdodCc6IG5ldyBBcnJheSgzKSxcbiAgICAndV9saWdodFBvc2l0aW9uJzogbmV3IEFycmF5KDMpLFxuICAgICd1X2xpZ2h0Q29sb3InOiBuZXcgQXJyYXkoMyksXG4gICAgJ3VfcGVyc3BlY3RpdmUnOiBuZXcgQXJyYXkoMTYpLFxuICAgICd1X3RpbWUnOiAwLFxuICAgICd1X3ZpZXcnOiBuZXcgQXJyYXkoMTYpXG59KTtcblxuLyoqXG4gKiBXZWJHTFJlbmRlcmVyIGlzIGEgcHJpdmF0ZSBjbGFzcyB0aGF0IG1hbmFnZXMgYWxsIGludGVyYWN0aW9ucyB3aXRoIHRoZSBXZWJHTFxuICogQVBJLiBFYWNoIGZyYW1lIGl0IHJlY2VpdmVzIGNvbW1hbmRzIGZyb20gdGhlIGNvbXBvc2l0b3IgYW5kIHVwZGF0ZXMgaXRzXG4gKiByZWdpc3RyaWVzIGFjY29yZGluZ2x5LiBTdWJzZXF1ZW50bHksIHRoZSBkcmF3IGZ1bmN0aW9uIGlzIGNhbGxlZCBhbmQgdGhlXG4gKiBXZWJHTFJlbmRlcmVyIGlzc3VlcyBkcmF3IGNhbGxzIGZvciBhbGwgbWVzaGVzIGluIGl0cyByZWdpc3RyeS5cbiAqXG4gKiBAY2xhc3MgV2ViR0xSZW5kZXJlclxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtFbGVtZW50fSBjYW52YXMgVGhlIERPTSBlbGVtZW50IHRoYXQgR0wgd2lsbCBwYWludCBpdHNlbGYgb250by5cbiAqIEBwYXJhbSB7Q29tcG9zaXRvcn0gY29tcG9zaXRvciBDb21wb3NpdG9yIHVzZWQgZm9yIHF1ZXJ5aW5nIHRoZSB0aW1lIGZyb20uXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gV2ViR0xSZW5kZXJlcihjYW52YXMsIGNvbXBvc2l0b3IpIHtcbiAgICBjYW52YXMuY2xhc3NMaXN0LmFkZCgnZmFtb3VzLXdlYmdsLXJlbmRlcmVyJyk7XG5cbiAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICB0aGlzLmNvbXBvc2l0b3IgPSBjb21wb3NpdG9yO1xuXG4gICAgdmFyIGdsID0gdGhpcy5nbCA9IHRoaXMuZ2V0V2ViR0xDb250ZXh0KHRoaXMuY2FudmFzKTtcblxuICAgIGdsLmNsZWFyQ29sb3IoMC4wLCAwLjAsIDAuMCwgMC4wKTtcbiAgICBnbC5wb2x5Z29uT2Zmc2V0KDAuMSwgMC4xKTtcbiAgICBnbC5lbmFibGUoZ2wuUE9MWUdPTl9PRkZTRVRfRklMTCk7XG4gICAgZ2wuZW5hYmxlKGdsLkRFUFRIX1RFU1QpO1xuICAgIGdsLmVuYWJsZShnbC5CTEVORCk7XG4gICAgZ2wuZGVwdGhGdW5jKGdsLkxFUVVBTCk7XG4gICAgZ2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG4gICAgZ2wuZW5hYmxlKGdsLkNVTExfRkFDRSk7XG4gICAgZ2wuY3VsbEZhY2UoZ2wuQkFDSyk7XG5cbiAgICB0aGlzLm1lc2hSZWdpc3RyeSA9IHt9O1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5S2V5cyA9IFtdO1xuXG4gICAgdGhpcy5jdXRvdXRSZWdpc3RyeSA9IHt9O1xuXG4gICAgdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMgPSBbXTtcblxuICAgIC8qKlxuICAgICAqIExpZ2h0c1xuICAgICAqL1xuICAgIHRoaXMubnVtTGlnaHRzID0gMDtcbiAgICB0aGlzLmFtYmllbnRMaWdodENvbG9yID0gWzAsIDAsIDBdO1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeSA9IHt9O1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeUtleXMgPSBbXTtcbiAgICB0aGlzLmxpZ2h0UG9zaXRpb25zID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xuICAgIHRoaXMubGlnaHRDb2xvcnMgPSBbMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMCwgMF07XG5cbiAgICB0aGlzLnRleHR1cmVNYW5hZ2VyID0gbmV3IFRleHR1cmVNYW5hZ2VyKGdsKTtcbiAgICB0aGlzLnRleENhY2hlID0ge307XG4gICAgdGhpcy5idWZmZXJSZWdpc3RyeSA9IG5ldyBCdWZmZXJSZWdpc3RyeShnbCk7XG4gICAgdGhpcy5wcm9ncmFtID0gbmV3IFByb2dyYW0oZ2wsIHsgZGVidWc6IHRydWUgfSk7XG5cbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgICBib3VuZEFycmF5QnVmZmVyOiBudWxsLFxuICAgICAgICBib3VuZEVsZW1lbnRCdWZmZXI6IG51bGwsXG4gICAgICAgIGxhc3REcmF3bjogbnVsbCxcbiAgICAgICAgZW5hYmxlZEF0dHJpYnV0ZXM6IHt9LFxuICAgICAgICBlbmFibGVkQXR0cmlidXRlc0tleXM6IFtdXG4gICAgfTtcblxuICAgIHRoaXMucmVzb2x1dGlvbk5hbWUgPSBbJ3VfcmVzb2x1dGlvbiddO1xuICAgIHRoaXMucmVzb2x1dGlvblZhbHVlcyA9IFtdO1xuXG4gICAgdGhpcy5jYWNoZWRTaXplID0gW107XG5cbiAgICAvKlxuICAgIFRoZSBwcm9qZWN0aW9uVHJhbnNmb3JtIGhhcyBzb21lIGNvbnN0YW50IGNvbXBvbmVudHMsIGkuZS4gdGhlIHogc2NhbGUsIGFuZCB0aGUgeCBhbmQgeSB0cmFuc2xhdGlvbi5cblxuICAgIFRoZSB6IHNjYWxlIGtlZXBzIHRoZSBmaW5hbCB6IHBvc2l0aW9uIG9mIGFueSB2ZXJ0ZXggd2l0aGluIHRoZSBjbGlwJ3MgZG9tYWluIGJ5IHNjYWxpbmcgaXQgYnkgYW5cbiAgICBhcmJpdHJhcmlseSBzbWFsbCBjb2VmZmljaWVudC4gVGhpcyBoYXMgdGhlIGFkdmFudGFnZSBvZiBiZWluZyBhIHVzZWZ1bCBkZWZhdWx0IGluIHRoZSBldmVudCBvZiB0aGVcbiAgICB1c2VyIGZvcmdvaW5nIGEgbmVhciBhbmQgZmFyIHBsYW5lLCBhbiBhbGllbiBjb252ZW50aW9uIGluIGRvbSBzcGFjZSBhcyBpbiBET00gb3ZlcmxhcHBpbmcgaXNcbiAgICBjb25kdWN0ZWQgdmlhIHBhaW50ZXIncyBhbGdvcml0aG0uXG5cbiAgICBUaGUgeCBhbmQgeSB0cmFuc2xhdGlvbiB0cmFuc2Zvcm1zIHRoZSB3b3JsZCBzcGFjZSBvcmlnaW4gdG8gdGhlIHRvcCBsZWZ0IGNvcm5lciBvZiB0aGUgc2NyZWVuLlxuXG4gICAgVGhlIGZpbmFsIGNvbXBvbmVudCAodGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzE1XSkgaXMgaW5pdGlhbGl6ZWQgYXMgMSBiZWNhdXNlIGNlcnRhaW4gcHJvamVjdGlvbiBtb2RlbHMsXG4gICAgZS5nLiB0aGUgV0MzIHNwZWNpZmllZCBtb2RlbCwga2VlcCB0aGUgWFkgcGxhbmUgYXMgdGhlIHByb2plY3Rpb24gaHlwZXJwbGFuZS5cbiAgICAqL1xuICAgIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybSA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAtMC4wMDAwMDEsIDAsIC0xLCAxLCAwLCAxXTtcblxuICAgIC8vIFRPRE86IHJlbW92ZSB0aGlzIGhhY2tcblxuICAgIHZhciBjdXRvdXQgPSB0aGlzLmN1dG91dEdlb21ldHJ5ID0gbmV3IFBsYW5lKCk7XG5cbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnYV9wb3MnLCBjdXRvdXQuc3BlYy5idWZmZXJWYWx1ZXNbMF0sIDMpO1xuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkuYWxsb2NhdGUoY3V0b3V0LnNwZWMuaWQsICdhX3RleENvb3JkJywgY3V0b3V0LnNwZWMuYnVmZmVyVmFsdWVzWzFdLCAyKTtcbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnYV9ub3JtYWxzJywgY3V0b3V0LnNwZWMuYnVmZmVyVmFsdWVzWzJdLCAzKTtcbiAgICB0aGlzLmJ1ZmZlclJlZ2lzdHJ5LmFsbG9jYXRlKGN1dG91dC5zcGVjLmlkLCAnaW5kaWNlcycsIGN1dG91dC5zcGVjLmJ1ZmZlclZhbHVlc1szXSwgMSk7XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gcmV0cmVpdmUgdGhlIFdlYkdMUmVuZGVyZXIgY29udGV4dCB1c2luZyBzZXZlcmFsXG4gKiBhY2Nlc3NvcnMuIEZvciBicm93c2VyIGNvbXBhdGFiaWxpdHkuIFRocm93cyBvbiBlcnJvci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNhbnZhcyBDYW52YXMgZWxlbWVudCBmcm9tIHdoaWNoIHRoZSBjb250ZXh0IGlzIHJldHJlaXZlZFxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gV2ViR0xDb250ZXh0IG9mIGNhbnZhcyBlbGVtZW50XG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmdldFdlYkdMQ29udGV4dCA9IGZ1bmN0aW9uIGdldFdlYkdMQ29udGV4dChjYW52YXMpIHtcbiAgICB2YXIgbmFtZXMgPSBbJ3dlYmdsJywgJ2V4cGVyaW1lbnRhbC13ZWJnbCcsICd3ZWJraXQtM2QnLCAnbW96LXdlYmdsJ107XG4gICAgdmFyIGNvbnRleHQgPSBudWxsO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChuYW1lc1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICB2YXIgbXNnID0gJ0Vycm9yIGNyZWF0aW5nIFdlYkdMIGNvbnRleHQ6ICcgKyBlcnJvci5wcm90b3R5cGUudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRleHQgPyBjb250ZXh0IDogZmFsc2U7XG59O1xuXG4vKipcbiAqIEFkZHMgYSBuZXcgYmFzZSBzcGVjIHRvIHRoZSBsaWdodCByZWdpc3RyeSBhdCBhIGdpdmVuIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBuZXcgbGlnaHQgaW4gbGlnaHRSZWdpc3RyeVxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gTmV3bHkgY3JlYXRlZCBsaWdodCBzcGVjXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZUxpZ2h0ID0gZnVuY3Rpb24gY3JlYXRlTGlnaHQocGF0aCkge1xuICAgIHRoaXMubnVtTGlnaHRzKys7XG4gICAgdGhpcy5saWdodFJlZ2lzdHJ5S2V5cy5wdXNoKHBhdGgpO1xuICAgIHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXSA9IHtcbiAgICAgICAgY29sb3I6IFswLCAwLCAwXSxcbiAgICAgICAgcG9zaXRpb246IFswLCAwLCAwXVxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXTtcbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBiYXNlIHNwZWMgdG8gdGhlIG1lc2ggcmVnaXN0cnkgYXQgYSBnaXZlbiBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbmV3IG1lc2ggaW4gbWVzaFJlZ2lzdHJ5LlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gTmV3bHkgY3JlYXRlZCBtZXNoIHNwZWMuXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmNyZWF0ZU1lc2ggPSBmdW5jdGlvbiBjcmVhdGVNZXNoKHBhdGgpIHtcbiAgICB0aGlzLm1lc2hSZWdpc3RyeUtleXMucHVzaChwYXRoKTtcblxuICAgIHZhciB1bmlmb3JtcyA9IGtleVZhbHVlVG9BcnJheXMoe1xuICAgICAgICB1X29wYWNpdHk6IDEsXG4gICAgICAgIHVfdHJhbnNmb3JtOiBpZGVudGl0eSxcbiAgICAgICAgdV9zaXplOiBbMCwgMCwgMF0sXG4gICAgICAgIHVfYmFzZUNvbG9yOiBbMC41LCAwLjUsIDAuNSwgMV0sXG4gICAgICAgIHVfcG9zaXRpb25PZmZzZXQ6IFswLCAwLCAwXSxcbiAgICAgICAgdV9ub3JtYWxzOiBbMCwgMCwgMF0sXG4gICAgICAgIHVfZmxhdFNoYWRpbmc6IDAsXG4gICAgICAgIHVfZ2xvc3NpbmVzczogWzAsIDAsIDAsIDBdXG4gICAgfSk7XG4gICAgdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF0gPSB7XG4gICAgICAgIGRlcHRoOiBudWxsLFxuICAgICAgICB1bmlmb3JtS2V5czogdW5pZm9ybXMua2V5cyxcbiAgICAgICAgdW5pZm9ybVZhbHVlczogdW5pZm9ybXMudmFsdWVzLFxuICAgICAgICBidWZmZXJzOiB7fSxcbiAgICAgICAgZ2VvbWV0cnk6IG51bGwsXG4gICAgICAgIGRyYXdUeXBlOiBudWxsLFxuICAgICAgICB0ZXh0dXJlczogW10sXG4gICAgICAgIHZpc2libGU6IHRydWVcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLm1lc2hSZWdpc3RyeVtwYXRoXTtcbn07XG5cbi8qKlxuICogU2V0cyBmbGFnIG9uIGluZGljYXRpbmcgd2hldGhlciB0byBkbyBza2lwIGRyYXcgcGhhc2UgZm9yXG4gKiBjdXRvdXQgbWVzaCBhdCBnaXZlbiBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IGN1dG91dCBtZXNoLlxuICogQHBhcmFtIHtCb29sZWFufSB1c2VzQ3V0b3V0IEluZGljYXRlcyB0aGUgcHJlc2VuY2Ugb2YgYSBjdXRvdXQgbWVzaFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEN1dG91dFN0YXRlID0gZnVuY3Rpb24gc2V0Q3V0b3V0U3RhdGUocGF0aCwgdXNlc0N1dG91dCkge1xuICAgIHZhciBjdXRvdXQgPSB0aGlzLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuXG4gICAgY3V0b3V0LnZpc2libGUgPSB1c2VzQ3V0b3V0O1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIG9yIHJldHJlaXZlcyBjdXRvdXRcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIHRhcmdldCBjdXRvdXQgbWVzaC5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IE5ld2x5IGNyZWF0ZWQgY3V0b3V0IHNwZWMuXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmdldE9yU2V0Q3V0b3V0ID0gZnVuY3Rpb24gZ2V0T3JTZXRDdXRvdXQocGF0aCkge1xuICAgIGlmICh0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHVuaWZvcm1zID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgICAgICAgICB1X29wYWNpdHk6IDAsXG4gICAgICAgICAgICB1X3RyYW5zZm9ybTogaWRlbnRpdHkuc2xpY2UoKSxcbiAgICAgICAgICAgIHVfc2l6ZTogWzAsIDAsIDBdLFxuICAgICAgICAgICAgdV9vcmlnaW46IFswLCAwLCAwXSxcbiAgICAgICAgICAgIHVfYmFzZUNvbG9yOiBbMCwgMCwgMCwgMV1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMucHVzaChwYXRoKTtcblxuICAgICAgICB0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdID0ge1xuICAgICAgICAgICAgdW5pZm9ybUtleXM6IHVuaWZvcm1zLmtleXMsXG4gICAgICAgICAgICB1bmlmb3JtVmFsdWVzOiB1bmlmb3Jtcy52YWx1ZXMsXG4gICAgICAgICAgICBnZW9tZXRyeTogdGhpcy5jdXRvdXRHZW9tZXRyeS5zcGVjLmlkLFxuICAgICAgICAgICAgZHJhd1R5cGU6IHRoaXMuY3V0b3V0R2VvbWV0cnkuc3BlYy50eXBlLFxuICAgICAgICAgICAgdmlzaWJsZTogdHJ1ZVxuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiB0aGlzLmN1dG91dFJlZ2lzdHJ5W3BhdGhdO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyBmbGFnIG9uIGluZGljYXRpbmcgd2hldGhlciB0byBkbyBza2lwIGRyYXcgcGhhc2UgZm9yXG4gKiBtZXNoIGF0IGdpdmVuIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIHRhcmdldCBtZXNoLlxuICogQHBhcmFtIHtCb29sZWFufSB2aXNpYmlsaXR5IEluZGljYXRlcyB0aGUgdmlzaWJpbGl0eSBvZiB0YXJnZXQgbWVzaC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoVmlzaWJpbGl0eSA9IGZ1bmN0aW9uIHNldE1lc2hWaXNpYmlsaXR5KHBhdGgsIHZpc2liaWxpdHkpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2gudmlzaWJsZSA9IHZpc2liaWxpdHk7XG59O1xuXG4vKipcbiAqIERlbGV0ZXMgYSBtZXNoIGZyb20gdGhlIG1lc2hSZWdpc3RyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IG1lc2guXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUucmVtb3ZlTWVzaCA9IGZ1bmN0aW9uIHJlbW92ZU1lc2gocGF0aCkge1xuICAgIHZhciBrZXlMb2NhdGlvbiA9IHRoaXMubWVzaFJlZ2lzdHJ5S2V5cy5pbmRleE9mKHBhdGgpO1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5S2V5cy5zcGxpY2Uoa2V5TG9jYXRpb24sIDEpO1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdID0gbnVsbDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBvciByZXRyZWl2ZXMgY3V0b3V0XG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIGN1dG91dCBpbiBjdXRvdXQgcmVnaXN0cnkuXG4gKiBAcGFyYW0ge1N0cmluZ30gdW5pZm9ybU5hbWUgSWRlbnRpZmllciB1c2VkIHRvIHVwbG9hZCB2YWx1ZVxuICogQHBhcmFtIHtBcnJheX0gdW5pZm9ybVZhbHVlIFZhbHVlIG9mIHVuaWZvcm0gZGF0YVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEN1dG91dFVuaWZvcm0gPSBmdW5jdGlvbiBzZXRDdXRvdXRVbmlmb3JtKHBhdGgsIHVuaWZvcm1OYW1lLCB1bmlmb3JtVmFsdWUpIHtcbiAgICB2YXIgY3V0b3V0ID0gdGhpcy5nZXRPclNldEN1dG91dChwYXRoKTtcblxuICAgIHZhciBpbmRleCA9IGN1dG91dC51bmlmb3JtS2V5cy5pbmRleE9mKHVuaWZvcm1OYW1lKTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHVuaWZvcm1WYWx1ZSkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHVuaWZvcm1WYWx1ZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgY3V0b3V0LnVuaWZvcm1WYWx1ZXNbaW5kZXhdW2ldID0gdW5pZm9ybVZhbHVlW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdXRvdXQudW5pZm9ybVZhbHVlc1tpbmRleF0gPSB1bmlmb3JtVmFsdWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBFZGl0cyB0aGUgb3B0aW9ucyBmaWVsZCBvbiBhIG1lc2hcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IG1lc2hcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE1hcCBvZiBkcmF3IG9wdGlvbnMgZm9yIG1lc2hcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoT3B0aW9ucyA9IGZ1bmN0aW9uKHBhdGgsIG9wdGlvbnMpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2gub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoYW5nZXMgdGhlIGNvbG9yIG9mIHRoZSBmaXhlZCBpbnRlbnNpdHkgbGlnaHRpbmcgaW4gdGhlIHNjZW5lXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBsaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IHIgcmVkIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBnIGdyZWVuIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIGJsdWUgY2hhbm5lbFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEFtYmllbnRMaWdodENvbG9yID0gZnVuY3Rpb24gc2V0QW1iaWVudExpZ2h0Q29sb3IocGF0aCwgciwgZywgYikge1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMF0gPSByO1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMV0gPSBnO1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMl0gPSBiO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBsb2NhdGlvbiBvZiB0aGUgbGlnaHQgaW4gdGhlIHNjZW5lXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBsaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IHggeCBwb3NpdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IHkgeSBwb3NpdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IHogeiBwb3NpdGlvblxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldExpZ2h0UG9zaXRpb24gPSBmdW5jdGlvbiBzZXRMaWdodFBvc2l0aW9uKHBhdGgsIHgsIHksIHopIHtcbiAgICB2YXIgbGlnaHQgPSB0aGlzLmxpZ2h0UmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVMaWdodChwYXRoKTtcblxuICAgIGxpZ2h0LnBvc2l0aW9uWzBdID0geDtcbiAgICBsaWdodC5wb3NpdGlvblsxXSA9IHk7XG4gICAgbGlnaHQucG9zaXRpb25bMl0gPSB6O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBjb2xvciBvZiBhIGR5bmFtaWMgaW50ZW5zaXR5IGxpZ2h0aW5nIGluIHRoZSBzY2VuZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbGlnaHQgaW4gbGlnaHQgUmVnaXN0cnkuXG4gKiBAcGFyYW0ge051bWJlcn0gciByZWQgY2hhbm5lbFxuICogQHBhcmFtIHtOdW1iZXJ9IGcgZ3JlZW4gY2hhbm5lbFxuICogQHBhcmFtIHtOdW1iZXJ9IGIgYmx1ZSBjaGFubmVsXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0TGlnaHRDb2xvciA9IGZ1bmN0aW9uIHNldExpZ2h0Q29sb3IocGF0aCwgciwgZywgYikge1xuICAgIHZhciBsaWdodCA9IHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXSB8fCB0aGlzLmNyZWF0ZUxpZ2h0KHBhdGgpO1xuXG4gICAgbGlnaHQuY29sb3JbMF0gPSByO1xuICAgIGxpZ2h0LmNvbG9yWzFdID0gZztcbiAgICBsaWdodC5jb2xvclsyXSA9IGI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbXBpbGVzIG1hdGVyaWFsIHNwZWMgaW50byBwcm9ncmFtIHNoYWRlclxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgY3V0b3V0IGluIGN1dG91dCByZWdpc3RyeS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE5hbWUgdGhhdCB0aGUgcmVuZGVyaW5nIGlucHV0IHRoZSBtYXRlcmlhbCBpcyBib3VuZCB0b1xuICogQHBhcmFtIHtPYmplY3R9IG1hdGVyaWFsIE1hdGVyaWFsIHNwZWNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVNYXRlcmlhbElucHV0ID0gZnVuY3Rpb24gaGFuZGxlTWF0ZXJpYWxJbnB1dChwYXRoLCBuYW1lLCBtYXRlcmlhbCkge1xuICAgIHZhciBtZXNoID0gdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVNZXNoKHBhdGgpO1xuICAgIG1hdGVyaWFsID0gY29tcGlsZU1hdGVyaWFsKG1hdGVyaWFsLCBtZXNoLnRleHR1cmVzLmxlbmd0aCk7XG5cbiAgICAvLyBTZXQgdW5pZm9ybXMgdG8gZW5hYmxlIHRleHR1cmUhXG5cbiAgICBtZXNoLnVuaWZvcm1WYWx1ZXNbbWVzaC51bmlmb3JtS2V5cy5pbmRleE9mKG5hbWUpXVswXSA9IC1tYXRlcmlhbC5faWQ7XG5cbiAgICAvLyBSZWdpc3RlciB0ZXh0dXJlcyFcblxuICAgIHZhciBpID0gbWF0ZXJpYWwudGV4dHVyZXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgbWVzaC50ZXh0dXJlcy5wdXNoKFxuICAgICAgICAgICAgdGhpcy50ZXh0dXJlTWFuYWdlci5yZWdpc3RlcihtYXRlcmlhbC50ZXh0dXJlc1tpXSwgbWVzaC50ZXh0dXJlcy5sZW5ndGggKyBpKVxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIG1hdGVyaWFsIVxuXG4gICAgdGhpcy5wcm9ncmFtLnJlZ2lzdGVyTWF0ZXJpYWwobmFtZSwgbWF0ZXJpYWwpO1xuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlU2l6ZSgpO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBnZW9tZXRyeSBkYXRhIG9mIGEgbWVzaFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgY3V0b3V0IGluIGN1dG91dCByZWdpc3RyeS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBnZW9tZXRyeSBHZW9tZXRyeSBvYmplY3QgY29udGFpbmluZyB2ZXJ0ZXggZGF0YSB0byBiZSBkcmF3blxuICogQHBhcmFtIHtOdW1iZXJ9IGRyYXdUeXBlIFByaW1pdGl2ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGR5bmFtaWMgV2hldGhlciBnZW9tZXRyeSBpcyBkeW5hbWljXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0R2VvbWV0cnkgPSBmdW5jdGlvbiBzZXRHZW9tZXRyeShwYXRoLCBnZW9tZXRyeSwgZHJhd1R5cGUsIGR5bmFtaWMpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2guZ2VvbWV0cnkgPSBnZW9tZXRyeTtcbiAgICBtZXNoLmRyYXdUeXBlID0gZHJhd1R5cGU7XG4gICAgbWVzaC5keW5hbWljID0gZHluYW1pYztcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBVcGxvYWRzIGEgbmV3IHZhbHVlIGZvciB0aGUgdW5pZm9ybSBkYXRhIHdoZW4gdGhlIG1lc2ggaXMgYmVpbmcgZHJhd25cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG1lc2ggaW4gbWVzaCByZWdpc3RyeVxuICogQHBhcmFtIHtTdHJpbmd9IHVuaWZvcm1OYW1lIElkZW50aWZpZXIgdXNlZCB0byB1cGxvYWQgdmFsdWVcbiAqIEBwYXJhbSB7QXJyYXl9IHVuaWZvcm1WYWx1ZSBWYWx1ZSBvZiB1bmlmb3JtIGRhdGFcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoVW5pZm9ybSA9IGZ1bmN0aW9uIHNldE1lc2hVbmlmb3JtKHBhdGgsIHVuaWZvcm1OYW1lLCB1bmlmb3JtVmFsdWUpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIHZhciBpbmRleCA9IG1lc2gudW5pZm9ybUtleXMuaW5kZXhPZih1bmlmb3JtTmFtZSk7XG5cbiAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIG1lc2gudW5pZm9ybUtleXMucHVzaCh1bmlmb3JtTmFtZSk7XG4gICAgICAgIG1lc2gudW5pZm9ybVZhbHVlcy5wdXNoKHVuaWZvcm1WYWx1ZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBtZXNoLnVuaWZvcm1WYWx1ZXNbaW5kZXhdID0gdW5pZm9ybVZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlICdkcmF3JyBwaGFzZSBvZiB0aGUgV2ViR0xSZW5kZXJlci4gSXRlcmF0ZXMgdGhyb3VnaCByZWdpc3RyaWVzXG4gKiB0byBzZXQgdW5pZm9ybXMsIHNldCBhdHRyaWJ1dGVzIGFuZCBpc3N1ZSBkcmF3IGNvbW1hbmRzIGZvciByZW5kZXJhYmxlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG1lc2ggaW4gbWVzaCByZWdpc3RyeVxuICogQHBhcmFtIHtOdW1iZXJ9IGdlb21ldHJ5SWQgSWQgb2YgZ2VvbWV0cnkgaW4gZ2VvbWV0cnkgcmVnaXN0cnlcbiAqIEBwYXJhbSB7U3RyaW5nfSBidWZmZXJOYW1lIEF0dHJpYnV0ZSBsb2NhdGlvbiBuYW1lXG4gKiBAcGFyYW0ge0FycmF5fSBidWZmZXJWYWx1ZSBWZXJ0ZXggZGF0YVxuICogQHBhcmFtIHtOdW1iZXJ9IGJ1ZmZlclNwYWNpbmcgVGhlIGRpbWVuc2lvbnMgb2YgdGhlIHZlcnRleFxuICogQHBhcmFtIHtCb29sZWFufSBpc0R5bmFtaWMgV2hldGhlciBnZW9tZXRyeSBpcyBkeW5hbWljXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuYnVmZmVyRGF0YSA9IGZ1bmN0aW9uIGJ1ZmZlckRhdGEocGF0aCwgZ2VvbWV0cnlJZCwgYnVmZmVyTmFtZSwgYnVmZmVyVmFsdWUsIGJ1ZmZlclNwYWNpbmcsIGlzRHluYW1pYykge1xuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkuYWxsb2NhdGUoZ2VvbWV0cnlJZCwgYnVmZmVyTmFtZSwgYnVmZmVyVmFsdWUsIGJ1ZmZlclNwYWNpbmcsIGlzRHluYW1pYyk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlICdkcmF3JyBwaGFzZSBvZiB0aGUgV2ViR0xSZW5kZXJlci4gSXRlcmF0ZXMgdGhyb3VnaCByZWdpc3RyaWVzXG4gKiB0byBzZXQgdW5pZm9ybXMsIHNldCBhdHRyaWJ1dGVzIGFuZCBpc3N1ZSBkcmF3IGNvbW1hbmRzIGZvciByZW5kZXJhYmxlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIFBhcmFtZXRlcnMgcHJvdmlkZWQgYnkgdGhlIGNvbXBvc2l0b3IsIHRoYXQgYWZmZWN0IHRoZSByZW5kZXJpbmcgb2YgYWxsIHJlbmRlcmFibGVzLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiBkcmF3KHJlbmRlclN0YXRlKSB7XG4gICAgdmFyIHRpbWUgPSB0aGlzLmNvbXBvc2l0b3IuZ2V0VGltZSgpO1xuXG4gICAgdGhpcy5nbC5jbGVhcih0aGlzLmdsLkNPTE9SX0JVRkZFUl9CSVQgfCB0aGlzLmdsLkRFUFRIX0JVRkZFUl9CSVQpO1xuICAgIHRoaXMudGV4dHVyZU1hbmFnZXIudXBkYXRlKHRpbWUpO1xuXG4gICAgdGhpcy5tZXNoUmVnaXN0cnlLZXlzID0gc29ydGVyKHRoaXMubWVzaFJlZ2lzdHJ5S2V5cywgdGhpcy5tZXNoUmVnaXN0cnkpO1xuXG4gICAgdGhpcy5zZXRHbG9iYWxVbmlmb3JtcyhyZW5kZXJTdGF0ZSk7XG4gICAgdGhpcy5kcmF3Q3V0b3V0cygpO1xuICAgIHRoaXMuZHJhd01lc2hlcygpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aHJvdWdoIGFuZCBkcmF3cyBhbGwgcmVnaXN0ZXJlZCBtZXNoZXMuIFRoaXMgaW5jbHVkZXNcbiAqIGJpbmRpbmcgdGV4dHVyZXMsIGhhbmRsaW5nIGRyYXcgb3B0aW9ucywgc2V0dGluZyBtZXNoIHVuaWZvcm1zXG4gKiBhbmQgZHJhd2luZyBtZXNoIGJ1ZmZlcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXdNZXNoZXMgPSBmdW5jdGlvbiBkcmF3TWVzaGVzKCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIGJ1ZmZlcnM7XG4gICAgdmFyIG1lc2g7XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5tZXNoUmVnaXN0cnlLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1lc2ggPSB0aGlzLm1lc2hSZWdpc3RyeVt0aGlzLm1lc2hSZWdpc3RyeUtleXNbaV1dO1xuICAgICAgICBidWZmZXJzID0gdGhpcy5idWZmZXJSZWdpc3RyeS5yZWdpc3RyeVttZXNoLmdlb21ldHJ5XTtcblxuICAgICAgICBpZiAoIW1lc2gudmlzaWJsZSkgY29udGludWU7XG5cbiAgICAgICAgaWYgKG1lc2gudW5pZm9ybVZhbHVlc1swXSA8IDEpIHtcbiAgICAgICAgICAgIGdsLmRlcHRoTWFzayhmYWxzZSk7XG4gICAgICAgICAgICBnbC5lbmFibGUoZ2wuQkxFTkQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZ2wuZGVwdGhNYXNrKHRydWUpO1xuICAgICAgICAgICAgZ2wuZGlzYWJsZShnbC5CTEVORCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWJ1ZmZlcnMpIGNvbnRpbnVlO1xuXG4gICAgICAgIHZhciBqID0gbWVzaC50ZXh0dXJlcy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChqLS0pIHRoaXMudGV4dHVyZU1hbmFnZXIuYmluZFRleHR1cmUobWVzaC50ZXh0dXJlc1tqXSk7XG5cbiAgICAgICAgaWYgKG1lc2gub3B0aW9ucykgdGhpcy5oYW5kbGVPcHRpb25zKG1lc2gub3B0aW9ucywgbWVzaCk7XG5cbiAgICAgICAgdGhpcy5wcm9ncmFtLnNldFVuaWZvcm1zKG1lc2gudW5pZm9ybUtleXMsIG1lc2gudW5pZm9ybVZhbHVlcyk7XG4gICAgICAgIHRoaXMuZHJhd0J1ZmZlcnMoYnVmZmVycywgbWVzaC5kcmF3VHlwZSwgbWVzaC5nZW9tZXRyeSk7XG5cbiAgICAgICAgaWYgKG1lc2gub3B0aW9ucykgdGhpcy5yZXNldE9wdGlvbnMobWVzaC5vcHRpb25zKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIHRocm91Z2ggYW5kIGRyYXdzIGFsbCByZWdpc3RlcmVkIGN1dG91dCBtZXNoZXMuIEJsZW5kaW5nXG4gKiBpcyBkaXNhYmxlZCwgY3V0b3V0IHVuaWZvcm1zIGFyZSBzZXQgYW5kIGZpbmFsbHkgYnVmZmVycyBhcmUgZHJhd24uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXdDdXRvdXRzID0gZnVuY3Rpb24gZHJhd0N1dG91dHMoKSB7XG4gICAgdmFyIGN1dG91dDtcbiAgICB2YXIgYnVmZmVycztcbiAgICB2YXIgbGVuID0gdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMubGVuZ3RoO1xuXG4gICAgaWYgKGxlbikge1xuICAgICAgICB0aGlzLmdsLmVuYWJsZSh0aGlzLmdsLkJMRU5EKTtcbiAgICAgICAgdGhpcy5nbC5kZXB0aE1hc2sodHJ1ZSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBjdXRvdXQgPSB0aGlzLmN1dG91dFJlZ2lzdHJ5W3RoaXMuY3V0b3V0UmVnaXN0cnlLZXlzW2ldXTtcbiAgICAgICAgYnVmZmVycyA9IHRoaXMuYnVmZmVyUmVnaXN0cnkucmVnaXN0cnlbY3V0b3V0Lmdlb21ldHJ5XTtcblxuICAgICAgICBpZiAoIWN1dG91dC52aXNpYmxlKSBjb250aW51ZTtcblxuICAgICAgICB0aGlzLnByb2dyYW0uc2V0VW5pZm9ybXMoY3V0b3V0LnVuaWZvcm1LZXlzLCBjdXRvdXQudW5pZm9ybVZhbHVlcyk7XG4gICAgICAgIHRoaXMuZHJhd0J1ZmZlcnMoYnVmZmVycywgY3V0b3V0LmRyYXdUeXBlLCBjdXRvdXQuZ2VvbWV0cnkpO1xuICAgIH1cbn07XG5cbi8qKlxuICogU2V0cyB1bmlmb3JtcyB0byBiZSBzaGFyZWQgYnkgYWxsIG1lc2hlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIERyYXcgc3RhdGUgb3B0aW9ucyBwYXNzZWQgZG93biBmcm9tIGNvbXBvc2l0b3IuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0R2xvYmFsVW5pZm9ybXMgPSBmdW5jdGlvbiBzZXRHbG9iYWxVbmlmb3JtcyhyZW5kZXJTdGF0ZSkge1xuICAgIHZhciBsaWdodDtcbiAgICB2YXIgc3RyaWRlO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHRoaXMubGlnaHRSZWdpc3RyeUtleXMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgbGlnaHQgPSB0aGlzLmxpZ2h0UmVnaXN0cnlbdGhpcy5saWdodFJlZ2lzdHJ5S2V5c1tpXV07XG4gICAgICAgIHN0cmlkZSA9IGkgKiA0O1xuXG4gICAgICAgIC8vIEJ1aWxkIHRoZSBsaWdodCBwb3NpdGlvbnMnIDR4NCBtYXRyaXhcblxuICAgICAgICB0aGlzLmxpZ2h0UG9zaXRpb25zWzAgKyBzdHJpZGVdID0gbGlnaHQucG9zaXRpb25bMF07XG4gICAgICAgIHRoaXMubGlnaHRQb3NpdGlvbnNbMSArIHN0cmlkZV0gPSBsaWdodC5wb3NpdGlvblsxXTtcbiAgICAgICAgdGhpcy5saWdodFBvc2l0aW9uc1syICsgc3RyaWRlXSA9IGxpZ2h0LnBvc2l0aW9uWzJdO1xuXG4gICAgICAgIC8vIEJ1aWxkIHRoZSBsaWdodCBjb2xvcnMnIDR4NCBtYXRyaXhcblxuICAgICAgICB0aGlzLmxpZ2h0Q29sb3JzWzAgKyBzdHJpZGVdID0gbGlnaHQuY29sb3JbMF07XG4gICAgICAgIHRoaXMubGlnaHRDb2xvcnNbMSArIHN0cmlkZV0gPSBsaWdodC5jb2xvclsxXTtcbiAgICAgICAgdGhpcy5saWdodENvbG9yc1syICsgc3RyaWRlXSA9IGxpZ2h0LmNvbG9yWzJdO1xuICAgIH1cblxuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1swXSA9IHRoaXMubnVtTGlnaHRzO1xuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1sxXSA9IHRoaXMuYW1iaWVudExpZ2h0Q29sb3I7XG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzJdID0gdGhpcy5saWdodFBvc2l0aW9ucztcbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbM10gPSB0aGlzLmxpZ2h0Q29sb3JzO1xuXG4gICAgLypcbiAgICAgKiBTZXQgdGltZSBhbmQgcHJvamVjdGlvbiB1bmlmb3Jtc1xuICAgICAqIHByb2plY3Rpbmcgd29ybGQgc3BhY2UgaW50byBhIDJkIHBsYW5lIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjYW52YXMuXG4gICAgICogVGhlIHggYW5kIHkgc2NhbGUgKHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVswXSBhbmQgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzVdIHJlc3BlY3RpdmVseSlcbiAgICAgKiBjb252ZXJ0IHRoZSBwcm9qZWN0ZWQgZ2VvbWV0cnkgYmFjayBpbnRvIGNsaXBzcGFjZS5cbiAgICAgKiBUaGUgcGVycGVjdGl2ZSBkaXZpZGUgKHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVsxMV0pLCBhZGRzIHRoZSB6IHZhbHVlIG9mIHRoZSBwb2ludFxuICAgICAqIG11bHRpcGxpZWQgYnkgdGhlIHBlcnNwZWN0aXZlIGRpdmlkZSB0byB0aGUgdyB2YWx1ZSBvZiB0aGUgcG9pbnQuIEluIHRoZSBwcm9jZXNzXG4gICAgICogb2YgY29udmVydGluZyBmcm9tIGhvbW9nZW5vdXMgY29vcmRpbmF0ZXMgdG8gTkRDIChub3JtYWxpemVkIGRldmljZSBjb29yZGluYXRlcylcbiAgICAgKiB0aGUgeCBhbmQgeSB2YWx1ZXMgb2YgdGhlIHBvaW50IGFyZSBkaXZpZGVkIGJ5IHcsIHdoaWNoIGltcGxlbWVudHMgcGVyc3BlY3RpdmUuXG4gICAgICovXG4gICAgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzBdID0gMSAvICh0aGlzLmNhY2hlZFNpemVbMF0gKiAwLjUpO1xuICAgIHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVs1XSA9IC0xIC8gKHRoaXMuY2FjaGVkU2l6ZVsxXSAqIDAuNSk7XG4gICAgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzExXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzExXTtcblxuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1s0XSA9IHRoaXMucHJvamVjdGlvblRyYW5zZm9ybTtcbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbNV0gPSB0aGlzLmNvbXBvc2l0b3IuZ2V0VGltZSgpICogMC4wMDE7XG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzZdID0gcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybTtcblxuICAgIHRoaXMucHJvZ3JhbS5zZXRVbmlmb3JtcyhnbG9iYWxVbmlmb3Jtcy5rZXlzLCBnbG9iYWxVbmlmb3Jtcy52YWx1ZXMpO1xufTtcblxuLyoqXG4gKiBMb2FkcyB0aGUgYnVmZmVycyBhbmQgaXNzdWVzIHRoZSBkcmF3IGNvbW1hbmQgZm9yIGEgZ2VvbWV0cnkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2ZXJ0ZXhCdWZmZXJzIEFsbCBidWZmZXJzIHVzZWQgdG8gZHJhdyB0aGUgZ2VvbWV0cnkuXG4gKiBAcGFyYW0ge051bWJlcn0gbW9kZSBFbnVtZXJhdG9yIGRlZmluaW5nIHdoYXQgcHJpbWl0aXZlIHRvIGRyYXdcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCBJRCBvZiBnZW9tZXRyeSBiZWluZyBkcmF3bi5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5kcmF3QnVmZmVycyA9IGZ1bmN0aW9uIGRyYXdCdWZmZXJzKHZlcnRleEJ1ZmZlcnMsIG1vZGUsIGlkKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgbGVuZ3RoID0gMDtcbiAgICB2YXIgYXR0cmlidXRlO1xuICAgIHZhciBsb2NhdGlvbjtcbiAgICB2YXIgc3BhY2luZztcbiAgICB2YXIgb2Zmc2V0O1xuICAgIHZhciBidWZmZXI7XG4gICAgdmFyIGl0ZXI7XG4gICAgdmFyIGo7XG4gICAgdmFyIGk7XG5cbiAgICBpdGVyID0gdmVydGV4QnVmZmVycy5rZXlzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgaXRlcjsgaSsrKSB7XG4gICAgICAgIGF0dHJpYnV0ZSA9IHZlcnRleEJ1ZmZlcnMua2V5c1tpXTtcblxuICAgICAgICAvLyBEbyBub3Qgc2V0IHZlcnRleEF0dHJpYlBvaW50ZXIgaWYgaW5kZXggYnVmZmVyLlxuXG4gICAgICAgIGlmIChhdHRyaWJ1dGUgPT09ICdpbmRpY2VzJykge1xuICAgICAgICAgICAgaiA9IGk7IGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0cmVpdmUgdGhlIGF0dHJpYnV0ZSBsb2NhdGlvbiBhbmQgbWFrZSBzdXJlIGl0IGlzIGVuYWJsZWQuXG5cbiAgICAgICAgbG9jYXRpb24gPSB0aGlzLnByb2dyYW0uYXR0cmlidXRlTG9jYXRpb25zW2F0dHJpYnV0ZV07XG5cbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSAtMSkgY29udGludWU7XG4gICAgICAgIGlmIChsb2NhdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBsb2NhdGlvbiA9IGdsLmdldEF0dHJpYkxvY2F0aW9uKHRoaXMucHJvZ3JhbS5wcm9ncmFtLCBhdHRyaWJ1dGUpO1xuICAgICAgICAgICAgdGhpcy5wcm9ncmFtLmF0dHJpYnV0ZUxvY2F0aW9uc1thdHRyaWJ1dGVdID0gbG9jYXRpb247XG4gICAgICAgICAgICBpZiAobG9jYXRpb24gPT09IC0xKSBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc1thdHRyaWJ1dGVdKSB7XG4gICAgICAgICAgICBnbC5lbmFibGVWZXJ0ZXhBdHRyaWJBcnJheShsb2NhdGlvbik7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzW2F0dHJpYnV0ZV0gPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc0tleXMucHVzaChhdHRyaWJ1dGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0cmVpdmUgYnVmZmVyIGluZm9ybWF0aW9uIHVzZWQgdG8gc2V0IGF0dHJpYnV0ZSBwb2ludGVyLlxuXG4gICAgICAgIGJ1ZmZlciA9IHZlcnRleEJ1ZmZlcnMudmFsdWVzW2ldO1xuICAgICAgICBzcGFjaW5nID0gdmVydGV4QnVmZmVycy5zcGFjaW5nW2ldO1xuICAgICAgICBvZmZzZXQgPSB2ZXJ0ZXhCdWZmZXJzLm9mZnNldFtpXTtcbiAgICAgICAgbGVuZ3RoID0gdmVydGV4QnVmZmVycy5sZW5ndGhbaV07XG5cbiAgICAgICAgLy8gU2tpcCBiaW5kQnVmZmVyIGlmIGJ1ZmZlciBpcyBjdXJyZW50bHkgYm91bmQuXG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUuYm91bmRBcnJheUJ1ZmZlciAhPT0gYnVmZmVyKSB7XG4gICAgICAgICAgICBnbC5iaW5kQnVmZmVyKGJ1ZmZlci50YXJnZXQsIGJ1ZmZlci5idWZmZXIpO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5ib3VuZEFycmF5QnVmZmVyID0gYnVmZmVyO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuc3RhdGUubGFzdERyYXduICE9PSBpZCkge1xuICAgICAgICAgICAgZ2wudmVydGV4QXR0cmliUG9pbnRlcihsb2NhdGlvbiwgc3BhY2luZywgZ2wuRkxPQVQsIGdsLkZBTFNFLCAwLCA0ICogb2Zmc2V0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIERpc2FibGUgYW55IGF0dHJpYnV0ZXMgdGhhdCBub3QgY3VycmVudGx5IGJlaW5nIHVzZWQuXG5cbiAgICB2YXIgbGVuID0gdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc0tleXMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIga2V5ID0gdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc0tleXNbaV07XG4gICAgICAgIGlmICh0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzW2tleV0gJiYgdmVydGV4QnVmZmVycy5rZXlzLmluZGV4T2Yoa2V5KSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGdsLmRpc2FibGVWZXJ0ZXhBdHRyaWJBcnJheSh0aGlzLnByb2dyYW0uYXR0cmlidXRlTG9jYXRpb25zW2tleV0pO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZS5lbmFibGVkQXR0cmlidXRlc1trZXldID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobGVuZ3RoKSB7XG5cbiAgICAgICAgLy8gSWYgaW5kZXggYnVmZmVyLCB1c2UgZHJhd0VsZW1lbnRzLlxuXG4gICAgICAgIGlmIChqICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGJ1ZmZlciA9IHZlcnRleEJ1ZmZlcnMudmFsdWVzW2pdO1xuICAgICAgICAgICAgb2Zmc2V0ID0gdmVydGV4QnVmZmVycy5vZmZzZXRbal07XG4gICAgICAgICAgICBzcGFjaW5nID0gdmVydGV4QnVmZmVycy5zcGFjaW5nW2pdO1xuICAgICAgICAgICAgbGVuZ3RoID0gdmVydGV4QnVmZmVycy5sZW5ndGhbal07XG5cbiAgICAgICAgICAgIC8vIFNraXAgYmluZEJ1ZmZlciBpZiBidWZmZXIgaXMgY3VycmVudGx5IGJvdW5kLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZS5ib3VuZEVsZW1lbnRCdWZmZXIgIT09IGJ1ZmZlcikge1xuICAgICAgICAgICAgICAgIGdsLmJpbmRCdWZmZXIoYnVmZmVyLnRhcmdldCwgYnVmZmVyLmJ1ZmZlcik7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZS5ib3VuZEVsZW1lbnRCdWZmZXIgPSBidWZmZXI7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGdsLmRyYXdFbGVtZW50cyhnbFttb2RlXSwgbGVuZ3RoLCBnbC5VTlNJR05FRF9TSE9SVCwgMiAqIG9mZnNldCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBnbC5kcmF3QXJyYXlzKGdsW21vZGVdLCAwLCBsZW5ndGgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5zdGF0ZS5sYXN0RHJhd24gPSBpZDtcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgd2lkdGggYW5kIGhlaWdodCBvZiBwYXJlbnQgY2FudmFzLCBzZXRzIHRoZSB2aWV3cG9ydCBzaXplIG9uXG4gKiB0aGUgV2ViR0wgY29udGV4dCBhbmQgdXBkYXRlcyB0aGUgcmVzb2x1dGlvbiB1bmlmb3JtIGZvciB0aGUgc2hhZGVyIHByb2dyYW0uXG4gKiBTaXplIGlzIHJldHJlaXZlZCBmcm9tIHRoZSBjb250YWluZXIgb2JqZWN0IG9mIHRoZSByZW5kZXJlci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gc2l6ZSB3aWR0aCwgaGVpZ2h0IGFuZCBkZXB0aCBvZiBjYW52YXNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS51cGRhdGVTaXplID0gZnVuY3Rpb24gdXBkYXRlU2l6ZShzaXplKSB7XG4gICAgaWYgKHNpemUpIHtcbiAgICAgICAgdmFyIHBpeGVsUmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxO1xuICAgICAgICB2YXIgZGlzcGxheVdpZHRoID0gfn4oc2l6ZVswXSAqIHBpeGVsUmF0aW8pO1xuICAgICAgICB2YXIgZGlzcGxheUhlaWdodCA9IH5+KHNpemVbMV0gKiBwaXhlbFJhdGlvKTtcbiAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSBkaXNwbGF5V2lkdGg7XG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCA9IGRpc3BsYXlIZWlnaHQ7XG4gICAgICAgIHRoaXMuZ2wudmlld3BvcnQoMCwgMCwgZGlzcGxheVdpZHRoLCBkaXNwbGF5SGVpZ2h0KTtcblxuICAgICAgICB0aGlzLmNhY2hlZFNpemVbMF0gPSBzaXplWzBdO1xuICAgICAgICB0aGlzLmNhY2hlZFNpemVbMV0gPSBzaXplWzFdO1xuICAgICAgICB0aGlzLmNhY2hlZFNpemVbMl0gPSAoc2l6ZVswXSA+IHNpemVbMV0pID8gc2l6ZVswXSA6IHNpemVbMV07XG4gICAgICAgIHRoaXMucmVzb2x1dGlvblZhbHVlc1swXSA9IHRoaXMuY2FjaGVkU2l6ZTtcbiAgICB9XG5cbiAgICB0aGlzLnByb2dyYW0uc2V0VW5pZm9ybXModGhpcy5yZXNvbHV0aW9uTmFtZSwgdGhpcy5yZXNvbHV0aW9uVmFsdWVzKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBzdGF0ZSBvZiB0aGUgV2ViR0wgZHJhd2luZyBjb250ZXh0IGJhc2VkIG9uIGN1c3RvbSBwYXJhbWV0ZXJzXG4gKiBkZWZpbmVkIG9uIGEgbWVzaC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgRHJhdyBzdGF0ZSBvcHRpb25zIHRvIGJlIHNldCB0byB0aGUgY29udGV4dC5cbiAqIEBwYXJhbSB7TWVzaH0gbWVzaCBBc3NvY2lhdGVkIE1lc2hcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVPcHRpb25zID0gZnVuY3Rpb24gaGFuZGxlT3B0aW9ucyhvcHRpb25zLCBtZXNoKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICBpZiAoIW9wdGlvbnMpIHJldHVybjtcblxuICAgIGlmIChvcHRpb25zLnNpZGUgPT09ICdkb3VibGUnKSB7XG4gICAgICAgIHRoaXMuZ2wuY3VsbEZhY2UodGhpcy5nbC5GUk9OVCk7XG4gICAgICAgIHRoaXMuZHJhd0J1ZmZlcnModGhpcy5idWZmZXJSZWdpc3RyeS5yZWdpc3RyeVttZXNoLmdlb21ldHJ5XSwgbWVzaC5kcmF3VHlwZSwgbWVzaC5nZW9tZXRyeSk7XG4gICAgICAgIHRoaXMuZ2wuY3VsbEZhY2UodGhpcy5nbC5CQUNLKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5ibGVuZGluZykgZ2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FKTtcbiAgICBpZiAob3B0aW9ucy5zaWRlID09PSAnYmFjaycpIGdsLmN1bGxGYWNlKGdsLkZST05UKTtcbn07XG5cbi8qKlxuICogUmVzZXRzIHRoZSBzdGF0ZSBvZiB0aGUgV2ViR0wgZHJhd2luZyBjb250ZXh0IHRvIGRlZmF1bHQgdmFsdWVzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBEcmF3IHN0YXRlIG9wdGlvbnMgdG8gYmUgc2V0IHRvIHRoZSBjb250ZXh0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnJlc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHJlc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICBpZiAoIW9wdGlvbnMpIHJldHVybjtcbiAgICBpZiAob3B0aW9ucy5ibGVuZGluZykgZ2wuYmxlbmRGdW5jKGdsLlNSQ19BTFBIQSwgZ2wuT05FX01JTlVTX1NSQ19BTFBIQSk7XG4gICAgaWYgKG9wdGlvbnMuc2lkZSA9PT0gJ2JhY2snKSBnbC5jdWxsRmFjZShnbC5CQUNLKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gV2ViR0xSZW5kZXJlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB0eXBlcyA9IHtcbiAgICAxOiAnZmxvYXQgJyxcbiAgICAyOiAndmVjMiAnLFxuICAgIDM6ICd2ZWMzICcsXG4gICAgNDogJ3ZlYzQgJ1xufTtcblxuLyoqXG4gKiBUcmF2ZXJzZXMgbWF0ZXJpYWwgdG8gY3JlYXRlIGEgc3RyaW5nIG9mIGdsc2wgY29kZSB0byBiZSBhcHBsaWVkIGluXG4gKiB0aGUgdmVydGV4IG9yIGZyYWdtZW50IHNoYWRlci5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJvdGVjdGVkXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG1hdGVyaWFsIE1hdGVyaWFsIHRvIGJlIGNvbXBpbGVkLlxuICogQHBhcmFtIHtOdW1iZXJ9IHRleHR1cmVTbG90IE5leHQgYXZhaWxhYmxlIHRleHR1cmUgc2xvdCBmb3IgTWVzaC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBjb21waWxlTWF0ZXJpYWwobWF0ZXJpYWwsIHRleHR1cmVTbG90KSB7XG4gICAgdmFyIGdsc2wgPSAnJztcbiAgICB2YXIgdW5pZm9ybXMgPSB7fTtcbiAgICB2YXIgdmFyeWluZ3MgPSB7fTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuICAgIHZhciBkZWZpbmVzID0gW107XG4gICAgdmFyIHRleHR1cmVzID0gW107XG5cbiAgICBfdHJhdmVyc2UobWF0ZXJpYWwsIGZ1bmN0aW9uIChub2RlLCBkZXB0aCkge1xuICAgICAgICBpZiAoISBub2RlLmNodW5rKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHR5cGUgPSB0eXBlc1tfZ2V0T3V0cHV0TGVuZ3RoKG5vZGUpXTtcbiAgICAgICAgdmFyIGxhYmVsID0gX21ha2VMYWJlbChub2RlKTtcbiAgICAgICAgdmFyIG91dHB1dCA9IF9wcm9jZXNzR0xTTChub2RlLmNodW5rLmdsc2wsIG5vZGUuaW5wdXRzLCB0ZXh0dXJlcy5sZW5ndGggKyB0ZXh0dXJlU2xvdCk7XG5cbiAgICAgICAgZ2xzbCArPSB0eXBlICsgbGFiZWwgKyAnID0gJyArIG91dHB1dCArICdcXG4gJztcblxuICAgICAgICBpZiAobm9kZS51bmlmb3JtcykgX2V4dGVuZCh1bmlmb3Jtcywgbm9kZS51bmlmb3Jtcyk7XG4gICAgICAgIGlmIChub2RlLnZhcnlpbmdzKSBfZXh0ZW5kKHZhcnlpbmdzLCBub2RlLnZhcnlpbmdzKTtcbiAgICAgICAgaWYgKG5vZGUuYXR0cmlidXRlcykgX2V4dGVuZChhdHRyaWJ1dGVzLCBub2RlLmF0dHJpYnV0ZXMpO1xuICAgICAgICBpZiAobm9kZS5jaHVuay5kZWZpbmVzKSBkZWZpbmVzLnB1c2gobm9kZS5jaHVuay5kZWZpbmVzKTtcbiAgICAgICAgaWYgKG5vZGUudGV4dHVyZSkgdGV4dHVyZXMucHVzaChub2RlLnRleHR1cmUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgX2lkOiBtYXRlcmlhbC5faWQsXG4gICAgICAgIGdsc2w6IGdsc2wgKyAncmV0dXJuICcgKyBfbWFrZUxhYmVsKG1hdGVyaWFsKSArICc7JyxcbiAgICAgICAgZGVmaW5lczogZGVmaW5lcy5qb2luKCdcXG4nKSxcbiAgICAgICAgdW5pZm9ybXM6IHVuaWZvcm1zLFxuICAgICAgICB2YXJ5aW5nczogdmFyeWluZ3MsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJpYnV0ZXMsXG4gICAgICAgIHRleHR1cmVzOiB0ZXh0dXJlc1xuICAgIH07XG59XG5cbi8vIFJlY3Vyc2l2ZWx5IGl0ZXJhdGVzIG92ZXIgYSBtYXRlcmlhbCdzIGlucHV0cywgaW52b2tpbmcgYSBnaXZlbiBjYWxsYmFja1xuLy8gd2l0aCB0aGUgY3VycmVudCBtYXRlcmlhbFxuZnVuY3Rpb24gX3RyYXZlcnNlKG1hdGVyaWFsLCBjYWxsYmFjaykge1xuXHR2YXIgaW5wdXRzID0gbWF0ZXJpYWwuaW5wdXRzO1xuICAgIHZhciBsZW4gPSBpbnB1dHMgJiYgaW5wdXRzLmxlbmd0aDtcbiAgICB2YXIgaWR4ID0gLTE7XG5cbiAgICB3aGlsZSAoKytpZHggPCBsZW4pIF90cmF2ZXJzZShpbnB1dHNbaWR4XSwgY2FsbGJhY2spO1xuXG4gICAgY2FsbGJhY2sobWF0ZXJpYWwpO1xuXG4gICAgcmV0dXJuIG1hdGVyaWFsO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBpbmZlciBsZW5ndGggb2YgdGhlIG91dHB1dFxuLy8gZnJvbSBhIGdpdmVuIG1hdGVyaWFsIG5vZGUuXG5mdW5jdGlvbiBfZ2V0T3V0cHV0TGVuZ3RoKG5vZGUpIHtcblxuICAgIC8vIEhhbmRsZSBjb25zdGFudCB2YWx1ZXNcblxuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicpIHJldHVybiAxO1xuICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSByZXR1cm4gbm9kZS5sZW5ndGg7XG5cbiAgICAvLyBIYW5kbGUgbWF0ZXJpYWxzXG5cbiAgICB2YXIgb3V0cHV0ID0gbm9kZS5jaHVuay5vdXRwdXQ7XG4gICAgaWYgKHR5cGVvZiBvdXRwdXQgPT09ICdudW1iZXInKSByZXR1cm4gb3V0cHV0O1xuXG4gICAgLy8gSGFuZGxlIHBvbHltb3JwaGljIG91dHB1dFxuXG4gICAgdmFyIGtleSA9IG5vZGUuaW5wdXRzLm1hcChmdW5jdGlvbiByZWN1cnNlKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRPdXRwdXRMZW5ndGgobm9kZSk7XG4gICAgfSkuam9pbignLCcpO1xuXG4gICAgcmV0dXJuIG91dHB1dFtrZXldO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gcnVuIHJlcGxhY2UgaW5wdXRzIGFuZCB0ZXh0dXJlIHRhZ3Mgd2l0aFxuLy8gY29ycmVjdCBnbHNsLlxuZnVuY3Rpb24gX3Byb2Nlc3NHTFNMKHN0ciwgaW5wdXRzLCB0ZXh0dXJlU2xvdCkge1xuICAgIHJldHVybiBzdHJcbiAgICAgICAgLnJlcGxhY2UoLyVcXGQvZywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIHJldHVybiBfbWFrZUxhYmVsKGlucHV0c1tzWzFdLTFdKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnJlcGxhY2UoL1xcJFRFWFRVUkUvLCAndV90ZXh0dXJlc1snICsgdGV4dHVyZVNsb3QgKyAnXScpO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgZ2xzbCBkZWZpbml0aW9uIG9mIHRoZVxuLy8gaW5wdXQgbWF0ZXJpYWwgbm9kZS5cbmZ1bmN0aW9uIF9tYWtlTGFiZWwgKG4pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShuKSkgcmV0dXJuIF9hcnJheVRvVmVjKG4pO1xuICAgIGlmICh0eXBlb2YgbiA9PT0gJ29iamVjdCcpIHJldHVybiAnZmFfJyArIChuLl9pZCk7XG4gICAgZWxzZSByZXR1cm4gbi50b0ZpeGVkKDYpO1xufVxuXG4vLyBIZWxwZXIgdG8gY29weSB0aGUgcHJvcGVydGllcyBvZiBhbiBvYmplY3Qgb250byBhbm90aGVyIG9iamVjdC5cbmZ1bmN0aW9uIF9leHRlbmQgKGEsIGIpIHtcblx0Zm9yICh2YXIgayBpbiBiKSBhW2tdID0gYltrXTtcbn1cblxuLy8gSGVscGVyIHRvIGNyZWF0ZSBnbHNsIHZlY3RvciByZXByZXNlbnRhdGlvbiBvZiBhIGphdmFzY3JpcHQgYXJyYXkuXG5mdW5jdGlvbiBfYXJyYXlUb1ZlYyhhcnJheSkge1xuICAgIHZhciBsZW4gPSBhcnJheS5sZW5ndGg7XG4gICAgcmV0dXJuICd2ZWMnICsgbGVuICsgJygnICsgYXJyYXkuam9pbignLCcpICArICcpJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb21waWxlTWF0ZXJpYWw7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIEdlbmVyYXRlcyBhIGNoZWNrZXJib2FyZCBwYXR0ZXJuIHRvIGJlIHVzZWQgYXMgYSBwbGFjZWhvbGRlciB0ZXh0dXJlIHdoaWxlIGFuXG4vLyBpbWFnZSBsb2FkcyBvdmVyIHRoZSBuZXR3b3JrLlxuZnVuY3Rpb24gY3JlYXRlQ2hlY2tlckJvYXJkKCkge1xuICAgIHZhciBjb250ZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjb250ZXh0LmNhbnZhcy53aWR0aCA9IGNvbnRleHQuY2FudmFzLmhlaWdodCA9IDEyODtcbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IGNvbnRleHQuY2FudmFzLmhlaWdodDsgeSArPSAxNikge1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGNvbnRleHQuY2FudmFzLndpZHRoOyB4ICs9IDE2KSB7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICh4IF4geSkgJiAxNiA/ICcjRkZGJyA6ICcjREREJztcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFJlY3QoeCwgeSwgMTYsIDE2KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb250ZXh0LmNhbnZhcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVDaGVja2VyQm9hcmQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmFkaXhCaXRzID0gMTEsXG4gICAgbWF4UmFkaXggPSAxIDw8IChyYWRpeEJpdHMpLFxuICAgIHJhZGl4TWFzayA9IG1heFJhZGl4IC0gMSxcbiAgICBidWNrZXRzID0gbmV3IEFycmF5KG1heFJhZGl4ICogTWF0aC5jZWlsKDY0IC8gcmFkaXhCaXRzKSksXG4gICAgbXNiTWFzayA9IDEgPDwgKCgzMiAtIDEpICUgcmFkaXhCaXRzKSxcbiAgICBsYXN0TWFzayA9IChtc2JNYXNrIDw8IDEpIC0gMSxcbiAgICBwYXNzQ291bnQgPSAoKDMyIC8gcmFkaXhCaXRzKSArIDAuOTk5OTk5OTk5OTk5OTk5KSB8IDAsXG4gICAgbWF4T2Zmc2V0ID0gbWF4UmFkaXggKiAocGFzc0NvdW50IC0gMSksXG4gICAgbm9ybWFsaXplciA9IE1hdGgucG93KDIwLCA2KTtcblxudmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KTtcbnZhciBmbG9hdFZpZXcgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgMCwgMSk7XG52YXIgaW50VmlldyA9IG5ldyBJbnQzMkFycmF5KGJ1ZmZlciwgMCwgMSk7XG5cbi8vIGNvbXBhcmF0b3IgcHVsbHMgcmVsZXZhbnQgc29ydGluZyBrZXlzIG91dCBvZiBtZXNoXG5mdW5jdGlvbiBjb21wKGxpc3QsIHJlZ2lzdHJ5LCBpKSB7XG4gICAgdmFyIGtleSA9IGxpc3RbaV07XG4gICAgdmFyIGl0ZW0gPSByZWdpc3RyeVtrZXldO1xuICAgIHJldHVybiAoaXRlbS5kZXB0aCA/IGl0ZW0uZGVwdGggOiByZWdpc3RyeVtrZXldLnVuaWZvcm1WYWx1ZXNbMV1bMTRdKSArIG5vcm1hbGl6ZXI7XG59XG5cbi8vbXV0YXRvciBmdW5jdGlvbiByZWNvcmRzIG1lc2gncyBwbGFjZSBpbiBwcmV2aW91cyBwYXNzXG5mdW5jdGlvbiBtdXRhdG9yKGxpc3QsIHJlZ2lzdHJ5LCBpLCB2YWx1ZSkge1xuICAgIHZhciBrZXkgPSBsaXN0W2ldO1xuICAgIHJlZ2lzdHJ5W2tleV0uZGVwdGggPSBpbnRUb0Zsb2F0KHZhbHVlKSAtIG5vcm1hbGl6ZXI7XG4gICAgcmV0dXJuIGtleTtcbn1cblxuLy9jbGVhbiBmdW5jdGlvbiByZW1vdmVzIG11dGF0b3IgZnVuY3Rpb24ncyByZWNvcmRcbmZ1bmN0aW9uIGNsZWFuKGxpc3QsIHJlZ2lzdHJ5LCBpKSB7XG4gICAgcmVnaXN0cnlbbGlzdFtpXV0uZGVwdGggPSBudWxsO1xufVxuXG4vL2NvbnZlcnRzIGEgamF2YXNjcmlwdCBmbG9hdCB0byBhIDMyYml0IGludGVnZXIgdXNpbmcgYW4gYXJyYXkgYnVmZmVyXG4vL29mIHNpemUgb25lXG5mdW5jdGlvbiBmbG9hdFRvSW50KGspIHtcbiAgICBmbG9hdFZpZXdbMF0gPSBrO1xuICAgIHJldHVybiBpbnRWaWV3WzBdO1xufVxuLy9jb252ZXJ0cyBhIDMyIGJpdCBpbnRlZ2VyIHRvIGEgcmVndWxhciBqYXZhc2NyaXB0IGZsb2F0IHVzaW5nIGFuIGFycmF5IGJ1ZmZlclxuLy9vZiBzaXplIG9uZVxuZnVuY3Rpb24gaW50VG9GbG9hdChrKSB7XG4gICAgaW50Vmlld1swXSA9IGs7XG4gICAgcmV0dXJuIGZsb2F0Vmlld1swXTtcbn1cblxuLy9zb3J0cyBhIGxpc3Qgb2YgbWVzaCBJRHMgYWNjb3JkaW5nIHRvIHRoZWlyIHotZGVwdGhcbmZ1bmN0aW9uIHJhZGl4U29ydChsaXN0LCByZWdpc3RyeSkge1xuICAgIHZhciBwYXNzID0gMDtcbiAgICB2YXIgb3V0ID0gW107XG5cbiAgICB2YXIgaSwgaiwgaywgbiwgZGl2LCBvZmZzZXQsIHN3YXAsIGlkLCBzdW0sIHRzdW0sIHNpemU7XG5cbiAgICBwYXNzQ291bnQgPSAoKDMyIC8gcmFkaXhCaXRzKSArIDAuOTk5OTk5OTk5OTk5OTk5KSB8IDA7XG5cbiAgICBmb3IgKGkgPSAwLCBuID0gbWF4UmFkaXggKiBwYXNzQ291bnQ7IGkgPCBuOyBpKyspIGJ1Y2tldHNbaV0gPSAwO1xuXG4gICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGRpdiA9IGZsb2F0VG9JbnQoY29tcChsaXN0LCByZWdpc3RyeSwgaSkpO1xuICAgICAgICBkaXYgXj0gZGl2ID4+IDMxIHwgMHg4MDAwMDAwMDtcbiAgICAgICAgZm9yIChqID0gMCwgayA9IDA7IGogPCBtYXhPZmZzZXQ7IGogKz0gbWF4UmFkaXgsIGsgKz0gcmFkaXhCaXRzKSB7XG4gICAgICAgICAgICBidWNrZXRzW2ogKyAoZGl2ID4+PiBrICYgcmFkaXhNYXNrKV0rKztcbiAgICAgICAgfVxuICAgICAgICBidWNrZXRzW2ogKyAoZGl2ID4+PiBrICYgbGFzdE1hc2spXSsrO1xuICAgIH1cblxuICAgIGZvciAoaiA9IDA7IGogPD0gbWF4T2Zmc2V0OyBqICs9IG1heFJhZGl4KSB7XG4gICAgICAgIGZvciAoaWQgPSBqLCBzdW0gPSAwOyBpZCA8IGogKyBtYXhSYWRpeDsgaWQrKykge1xuICAgICAgICAgICAgdHN1bSA9IGJ1Y2tldHNbaWRdICsgc3VtO1xuICAgICAgICAgICAgYnVja2V0c1tpZF0gPSBzdW0gLSAxO1xuICAgICAgICAgICAgc3VtID0gdHN1bTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoLS1wYXNzQ291bnQpIHtcbiAgICAgICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgICAgIG91dFsrK2J1Y2tldHNbZGl2ICYgcmFkaXhNYXNrXV0gPSBtdXRhdG9yKGxpc3QsIHJlZ2lzdHJ5LCBpLCBkaXYgXj0gZGl2ID4+IDMxIHwgMHg4MDAwMDAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3YXAgPSBvdXQ7XG4gICAgICAgIG91dCA9IGxpc3Q7XG4gICAgICAgIGxpc3QgPSBzd2FwO1xuICAgICAgICB3aGlsZSAoKytwYXNzIDwgcGFzc0NvdW50KSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBuID0gbGlzdC5sZW5ndGgsIG9mZnNldCA9IHBhc3MgKiBtYXhSYWRpeCwgc2l6ZSA9IHBhc3MgKiByYWRpeEJpdHM7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgICAgICAgICBvdXRbKytidWNrZXRzW29mZnNldCArIChkaXYgPj4+IHNpemUgJiByYWRpeE1hc2spXV0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2FwID0gb3V0O1xuICAgICAgICAgICAgb3V0ID0gbGlzdDtcbiAgICAgICAgICAgIGxpc3QgPSBzd2FwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoLCBvZmZzZXQgPSBwYXNzICogbWF4UmFkaXgsIHNpemUgPSBwYXNzICogcmFkaXhCaXRzOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGRpdiA9IGZsb2F0VG9JbnQoY29tcChsaXN0LCByZWdpc3RyeSwgaSkpO1xuICAgICAgICBvdXRbKytidWNrZXRzW29mZnNldCArIChkaXYgPj4+IHNpemUgJiBsYXN0TWFzayldXSA9IG11dGF0b3IobGlzdCwgcmVnaXN0cnksIGksIGRpdiBeICh+ZGl2ID4+IDMxIHwgMHg4MDAwMDAwMCkpO1xuICAgICAgICBjbGVhbihsaXN0LCByZWdpc3RyeSwgaSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByYWRpeFNvcnQ7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBnbHNsaWZ5ID0gcmVxdWlyZShcImdsc2xpZnlcIik7XG52YXIgc2hhZGVycyA9IHJlcXVpcmUoXCJnbHNsaWZ5L3NpbXBsZS1hZGFwdGVyLmpzXCIpKFwiXFxuI2RlZmluZSBHTFNMSUZZIDFcXG5cXG5tYXQzIGFfeF9nZXROb3JtYWxNYXRyaXgoaW4gbWF0NCB0KSB7XFxuICBtYXQzIG1hdE5vcm07XFxuICBtYXQ0IGEgPSB0O1xcbiAgZmxvYXQgYTAwID0gYVswXVswXSwgYTAxID0gYVswXVsxXSwgYTAyID0gYVswXVsyXSwgYTAzID0gYVswXVszXSwgYTEwID0gYVsxXVswXSwgYTExID0gYVsxXVsxXSwgYTEyID0gYVsxXVsyXSwgYTEzID0gYVsxXVszXSwgYTIwID0gYVsyXVswXSwgYTIxID0gYVsyXVsxXSwgYTIyID0gYVsyXVsyXSwgYTIzID0gYVsyXVszXSwgYTMwID0gYVszXVswXSwgYTMxID0gYVszXVsxXSwgYTMyID0gYVszXVsyXSwgYTMzID0gYVszXVszXSwgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLCBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCwgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLCBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMiwgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLCBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCwgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLCBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMiwgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xcbiAgZGV0ID0gMS4wIC8gZGV0O1xcbiAgbWF0Tm9ybVswXVswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xcbiAgbWF0Tm9ybVswXVsxXSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xcbiAgbWF0Tm9ybVswXVsyXSA9IChhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVswXSA9IChhMDIgKiBiMTAgLSBhMDEgKiBiMTEgLSBhMDMgKiBiMDkpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVsxXSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xcbiAgbWF0Tm9ybVsxXVsyXSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVswXSA9IChhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVsxXSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xcbiAgbWF0Tm9ybVsyXVsyXSA9IChhMzAgKiBiMDQgLSBhMzEgKiBiMDIgKyBhMzMgKiBiMDApICogZGV0O1xcbiAgcmV0dXJuIG1hdE5vcm07XFxufVxcbmZsb2F0IGJfeF9pbnZlcnNlKGZsb2F0IG0pIHtcXG4gIHJldHVybiAxLjAgLyBtO1xcbn1cXG5tYXQyIGJfeF9pbnZlcnNlKG1hdDIgbSkge1xcbiAgcmV0dXJuIG1hdDIobVsxXVsxXSwgLW1bMF1bMV0sIC1tWzFdWzBdLCBtWzBdWzBdKSAvIChtWzBdWzBdICogbVsxXVsxXSAtIG1bMF1bMV0gKiBtWzFdWzBdKTtcXG59XFxubWF0MyBiX3hfaW52ZXJzZShtYXQzIG0pIHtcXG4gIGZsb2F0IGEwMCA9IG1bMF1bMF0sIGEwMSA9IG1bMF1bMV0sIGEwMiA9IG1bMF1bMl07XFxuICBmbG9hdCBhMTAgPSBtWzFdWzBdLCBhMTEgPSBtWzFdWzFdLCBhMTIgPSBtWzFdWzJdO1xcbiAgZmxvYXQgYTIwID0gbVsyXVswXSwgYTIxID0gbVsyXVsxXSwgYTIyID0gbVsyXVsyXTtcXG4gIGZsb2F0IGIwMSA9IGEyMiAqIGExMSAtIGExMiAqIGEyMTtcXG4gIGZsb2F0IGIxMSA9IC1hMjIgKiBhMTAgKyBhMTIgKiBhMjA7XFxuICBmbG9hdCBiMjEgPSBhMjEgKiBhMTAgLSBhMTEgKiBhMjA7XFxuICBmbG9hdCBkZXQgPSBhMDAgKiBiMDEgKyBhMDEgKiBiMTEgKyBhMDIgKiBiMjE7XFxuICByZXR1cm4gbWF0MyhiMDEsICgtYTIyICogYTAxICsgYTAyICogYTIxKSwgKGExMiAqIGEwMSAtIGEwMiAqIGExMSksIGIxMSwgKGEyMiAqIGEwMCAtIGEwMiAqIGEyMCksICgtYTEyICogYTAwICsgYTAyICogYTEwKSwgYjIxLCAoLWEyMSAqIGEwMCArIGEwMSAqIGEyMCksIChhMTEgKiBhMDAgLSBhMDEgKiBhMTApKSAvIGRldDtcXG59XFxubWF0NCBiX3hfaW52ZXJzZShtYXQ0IG0pIHtcXG4gIGZsb2F0IGEwMCA9IG1bMF1bMF0sIGEwMSA9IG1bMF1bMV0sIGEwMiA9IG1bMF1bMl0sIGEwMyA9IG1bMF1bM10sIGExMCA9IG1bMV1bMF0sIGExMSA9IG1bMV1bMV0sIGExMiA9IG1bMV1bMl0sIGExMyA9IG1bMV1bM10sIGEyMCA9IG1bMl1bMF0sIGEyMSA9IG1bMl1bMV0sIGEyMiA9IG1bMl1bMl0sIGEyMyA9IG1bMl1bM10sIGEzMCA9IG1bM11bMF0sIGEzMSA9IG1bM11bMV0sIGEzMiA9IG1bM11bMl0sIGEzMyA9IG1bM11bM10sIGIwMCA9IGEwMCAqIGExMSAtIGEwMSAqIGExMCwgYjAxID0gYTAwICogYTEyIC0gYTAyICogYTEwLCBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsIGIwMyA9IGEwMSAqIGExMiAtIGEwMiAqIGExMSwgYjA0ID0gYTAxICogYTEzIC0gYTAzICogYTExLCBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsIGIwNiA9IGEyMCAqIGEzMSAtIGEyMSAqIGEzMCwgYjA3ID0gYTIwICogYTMyIC0gYTIyICogYTMwLCBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsIGIwOSA9IGEyMSAqIGEzMiAtIGEyMiAqIGEzMSwgYjEwID0gYTIxICogYTMzIC0gYTIzICogYTMxLCBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsIGRldCA9IGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcXG4gIHJldHVybiBtYXQ0KGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSwgYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5LCBhMzEgKiBiMDUgLSBhMzIgKiBiMDQgKyBhMzMgKiBiMDMsIGEyMiAqIGIwNCAtIGEyMSAqIGIwNSAtIGEyMyAqIGIwMywgYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3LCBhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcsIGEzMiAqIGIwMiAtIGEzMCAqIGIwNSAtIGEzMyAqIGIwMSwgYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxLCBhMTAgKiBiMTAgLSBhMTEgKiBiMDggKyBhMTMgKiBiMDYsIGEwMSAqIGIwOCAtIGEwMCAqIGIxMCAtIGEwMyAqIGIwNiwgYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwLCBhMjEgKiBiMDIgLSBhMjAgKiBiMDQgLSBhMjMgKiBiMDAsIGExMSAqIGIwNyAtIGExMCAqIGIwOSAtIGExMiAqIGIwNiwgYTAwICogYjA5IC0gYTAxICogYjA3ICsgYTAyICogYjA2LCBhMzEgKiBiMDEgLSBhMzAgKiBiMDMgLSBhMzIgKiBiMDAsIGEyMCAqIGIwMyAtIGEyMSAqIGIwMSArIGEyMiAqIGIwMCkgLyBkZXQ7XFxufVxcbmZsb2F0IGNfeF90cmFuc3Bvc2UoZmxvYXQgbSkge1xcbiAgcmV0dXJuIG07XFxufVxcbm1hdDIgY194X3RyYW5zcG9zZShtYXQyIG0pIHtcXG4gIHJldHVybiBtYXQyKG1bMF1bMF0sIG1bMV1bMF0sIG1bMF1bMV0sIG1bMV1bMV0pO1xcbn1cXG5tYXQzIGNfeF90cmFuc3Bvc2UobWF0MyBtKSB7XFxuICByZXR1cm4gbWF0MyhtWzBdWzBdLCBtWzFdWzBdLCBtWzJdWzBdLCBtWzBdWzFdLCBtWzFdWzFdLCBtWzJdWzFdLCBtWzBdWzJdLCBtWzFdWzJdLCBtWzJdWzJdKTtcXG59XFxubWF0NCBjX3hfdHJhbnNwb3NlKG1hdDQgbSkge1xcbiAgcmV0dXJuIG1hdDQobVswXVswXSwgbVsxXVswXSwgbVsyXVswXSwgbVszXVswXSwgbVswXVsxXSwgbVsxXVsxXSwgbVsyXVsxXSwgbVszXVsxXSwgbVswXVsyXSwgbVsxXVsyXSwgbVsyXVsyXSwgbVszXVsyXSwgbVswXVszXSwgbVsxXVszXSwgbVsyXVszXSwgbVszXVszXSk7XFxufVxcbnZlYzQgYXBwbHlUcmFuc2Zvcm0odmVjNCBwb3MpIHtcXG4gIG1hdDQgTVZNYXRyaXggPSB1X3ZpZXcgKiB1X3RyYW5zZm9ybTtcXG4gIHBvcy54ICs9IDEuMDtcXG4gIHBvcy55IC09IDEuMDtcXG4gIHBvcy54eXogKj0gdV9zaXplICogMC41O1xcbiAgcG9zLnkgKj0gLTEuMDtcXG4gIHZfcG9zaXRpb24gPSAoTVZNYXRyaXggKiBwb3MpLnh5ejtcXG4gIHZfZXllVmVjdG9yID0gKHVfcmVzb2x1dGlvbiAqIDAuNSkgLSB2X3Bvc2l0aW9uO1xcbiAgcG9zID0gdV9wZXJzcGVjdGl2ZSAqIE1WTWF0cml4ICogcG9zO1xcbiAgcmV0dXJuIHBvcztcXG59XFxuI3ZlcnRfZGVmaW5pdGlvbnNcXG5cXG52ZWMzIGNhbGN1bGF0ZU9mZnNldCh2ZWMzIElEKSB7XFxuICBcXG4gICN2ZXJ0X2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIHZlYzMoMC4wKTtcXG59XFxudm9pZCBtYWluKCkge1xcbiAgdl90ZXh0dXJlQ29vcmRpbmF0ZSA9IGFfdGV4Q29vcmQ7XFxuICB2ZWMzIGludmVydGVkTm9ybWFscyA9IGFfbm9ybWFscyArICh1X25vcm1hbHMueCA8IDAuMCA/IGNhbGN1bGF0ZU9mZnNldCh1X25vcm1hbHMpICogMi4wIC0gMS4wIDogdmVjMygwLjApKTtcXG4gIGludmVydGVkTm9ybWFscy55ICo9IC0xLjA7XFxuICB2X25vcm1hbCA9IGNfeF90cmFuc3Bvc2UobWF0MyhiX3hfaW52ZXJzZSh1X3RyYW5zZm9ybSkpKSAqIGludmVydGVkTm9ybWFscztcXG4gIHZlYzMgb2Zmc2V0UG9zID0gYV9wb3MgKyBjYWxjdWxhdGVPZmZzZXQodV9wb3NpdGlvbk9mZnNldCk7XFxuICBnbF9Qb3NpdGlvbiA9IGFwcGx5VHJhbnNmb3JtKHZlYzQob2Zmc2V0UG9zLCAxLjApKTtcXG59XCIsIFwiXFxuI2RlZmluZSBHTFNMSUZZIDFcXG5cXG4jZmxvYXRfZGVmaW5pdGlvbnNcXG5cXG5mbG9hdCBhX3hfYXBwbHlNYXRlcmlhbChmbG9hdCBJRCkge1xcbiAgXFxuICAjZmxvYXRfYXBwbGljYXRpb25zXFxuICByZXR1cm4gMS47XFxufVxcbiN2ZWMzX2RlZmluaXRpb25zXFxuXFxudmVjMyBhX3hfYXBwbHlNYXRlcmlhbCh2ZWMzIElEKSB7XFxuICBcXG4gICN2ZWMzX2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIHZlYzMoMCk7XFxufVxcbiN2ZWM0X2RlZmluaXRpb25zXFxuXFxudmVjNCBhX3hfYXBwbHlNYXRlcmlhbCh2ZWM0IElEKSB7XFxuICBcXG4gICN2ZWM0X2FwcGxpY2F0aW9uc1xcbiAgcmV0dXJuIHZlYzQoMCk7XFxufVxcbnZlYzQgYl94X2FwcGx5TGlnaHQoaW4gdmVjNCBiYXNlQ29sb3IsIGluIHZlYzMgbm9ybWFsLCBpbiB2ZWM0IGdsb3NzaW5lc3MpIHtcXG4gIGludCBudW1MaWdodHMgPSBpbnQodV9udW1MaWdodHMpO1xcbiAgdmVjMyBhbWJpZW50Q29sb3IgPSB1X2FtYmllbnRMaWdodCAqIGJhc2VDb2xvci5yZ2I7XFxuICB2ZWMzIGV5ZVZlY3RvciA9IG5vcm1hbGl6ZSh2X2V5ZVZlY3Rvcik7XFxuICB2ZWMzIGRpZmZ1c2UgPSB2ZWMzKDAuMCk7XFxuICBib29sIGhhc0dsb3NzaW5lc3MgPSBnbG9zc2luZXNzLmEgPiAwLjA7XFxuICBib29sIGhhc1NwZWN1bGFyQ29sb3IgPSBsZW5ndGgoZ2xvc3NpbmVzcy5yZ2IpID4gMC4wO1xcbiAgZm9yKGludCBpID0gMDsgaSA8IDQ7IGkrKykge1xcbiAgICBpZihpID49IG51bUxpZ2h0cylcXG4gICAgICBicmVhaztcXG4gICAgdmVjMyBsaWdodERpcmVjdGlvbiA9IG5vcm1hbGl6ZSh1X2xpZ2h0UG9zaXRpb25baV0ueHl6IC0gdl9wb3NpdGlvbik7XFxuICAgIGZsb2F0IGxhbWJlcnRpYW4gPSBtYXgoZG90KGxpZ2h0RGlyZWN0aW9uLCBub3JtYWwpLCAwLjApO1xcbiAgICBpZihsYW1iZXJ0aWFuID4gMC4wKSB7XFxuICAgICAgZGlmZnVzZSArPSB1X2xpZ2h0Q29sb3JbaV0ucmdiICogYmFzZUNvbG9yLnJnYiAqIGxhbWJlcnRpYW47XFxuICAgICAgaWYoaGFzR2xvc3NpbmVzcykge1xcbiAgICAgICAgdmVjMyBoYWxmVmVjdG9yID0gbm9ybWFsaXplKGxpZ2h0RGlyZWN0aW9uICsgZXllVmVjdG9yKTtcXG4gICAgICAgIGZsb2F0IHNwZWN1bGFyV2VpZ2h0ID0gcG93KG1heChkb3QoaGFsZlZlY3Rvciwgbm9ybWFsKSwgMC4wKSwgZ2xvc3NpbmVzcy5hKTtcXG4gICAgICAgIHZlYzMgc3BlY3VsYXJDb2xvciA9IGhhc1NwZWN1bGFyQ29sb3IgPyBnbG9zc2luZXNzLnJnYiA6IHVfbGlnaHRDb2xvcltpXS5yZ2I7XFxuICAgICAgICBkaWZmdXNlICs9IHNwZWN1bGFyQ29sb3IgKiBzcGVjdWxhcldlaWdodCAqIGxhbWJlcnRpYW47XFxuICAgICAgfVxcbiAgICB9XFxuICB9XFxuICByZXR1cm4gdmVjNChhbWJpZW50Q29sb3IgKyBkaWZmdXNlLCBiYXNlQ29sb3IuYSk7XFxufVxcbnZvaWQgbWFpbigpIHtcXG4gIHZlYzQgbWF0ZXJpYWwgPSB1X2Jhc2VDb2xvci5yID49IDAuMCA/IHVfYmFzZUNvbG9yIDogYV94X2FwcGx5TWF0ZXJpYWwodV9iYXNlQ29sb3IpO1xcbiAgYm9vbCBsaWdodHNFbmFibGVkID0gKHVfZmxhdFNoYWRpbmcgPT0gMC4wKSAmJiAodV9udW1MaWdodHMgPiAwLjAgfHwgbGVuZ3RoKHVfYW1iaWVudExpZ2h0KSA+IDAuMCk7XFxuICB2ZWMzIG5vcm1hbCA9IG5vcm1hbGl6ZSh2X25vcm1hbCk7XFxuICB2ZWM0IGdsb3NzaW5lc3MgPSB1X2dsb3NzaW5lc3MueCA8IDAuMCA/IGFfeF9hcHBseU1hdGVyaWFsKHVfZ2xvc3NpbmVzcykgOiB1X2dsb3NzaW5lc3M7XFxuICB2ZWM0IGNvbG9yID0gbGlnaHRzRW5hYmxlZCA/IGJfeF9hcHBseUxpZ2h0KG1hdGVyaWFsLCBub3JtYWxpemUodl9ub3JtYWwpLCBnbG9zc2luZXNzKSA6IG1hdGVyaWFsO1xcbiAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7XFxuICBnbF9GcmFnQ29sb3IuYSAqPSB1X29wYWNpdHk7XFxufVwiLCBbXSwgW10pO1xubW9kdWxlLmV4cG9ydHMgPSBzaGFkZXJzOyIsIid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvc2l0b3IgPSByZXF1aXJlKCdmYW1vdXMvcmVuZGVyZXJzL0NvbXBvc2l0b3InKTtcbnZhciBVSU1hbmFnZXIgPSByZXF1aXJlKCdmYW1vdXMvcmVuZGVyZXJzL1VJTWFuYWdlcicpO1xuLy8gdmFyIFNvY2tldExvb3AgPSByZXF1aXJlKCcuL1NvY2tldExvb3AnKTtcbi8vIHZhciBTb2NrZXRDaGFubmVsID0gcmVxdWlyZSgnLi9Tb2NrZXRDaGFubmVsJyk7XG52YXIgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCA9IHJlcXVpcmUoJ2ZhbW91cy9yZW5kZXItbG9vcHMvUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCcpO1xuXG5cbmZ1bmN0aW9uIFNvY2tldENoYW5uZWwoaG9zdCkge1xuICAgIHRoaXMuX3NvY2tldCA9IGlvLmNvbm5lY3QoaG9zdCk7XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHRoaXMuX3NvY2tldC5vbignZmFtb3VzLW1lc3NhZ2UnLCBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgICAgICBfdGhpcy5vbm1lc3NhZ2UoeyBkYXRhOiBtZXNzYWdlLmRhdGEgfSk7XG4gICAgfSk7XG59XG5cblNvY2tldENoYW5uZWwucHJvdG90eXBlLnBvc3RNZXNzYWdlID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICB0aGlzLl9zb2NrZXQuZW1pdCgnZmFtb3VzLW1lc3NhZ2UnLCB7IGRhdGE6IG1lc3NhZ2UgfSk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8vIEJvaWxlcnBsYXRlXG5uZXcgVUlNYW5hZ2VyKFxuICAgIG5ldyBTb2NrZXRDaGFubmVsKCdodHRwOi8vbG9jYWxob3N0OjE2MjAnKSxcbiAgICBuZXcgQ29tcG9zaXRvcigpLFxuICAgIG5ldyBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wKClcbiAgICAvLyBuZXcgU29ja2V0TG9vcCgnaHR0cDovL2xvY2FsaG9zdDoxNjE5Jylcbik7XG4iXX0=
