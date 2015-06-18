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

var Commands = require('../core/Commands');

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
        .sendDrawCommand(Commands.WITH)
        .sendDrawCommand(path);

    if (this._perspectiveDirty) {
        this._perspectiveDirty = false;

        switch (this._projectionType) {
            case Camera.FRUSTUM_PROJECTION:
                this._node.sendDrawCommand(Commands.FRUSTRUM_PROJECTION);
                this._node.sendDrawCommand(this._near);
                this._node.sendDrawCommand(this._far);
                break;
            case Camera.PINHOLE_PROJECTION:
                this._node.sendDrawCommand(Commands.PINHOLE_PROJECTION);
                this._node.sendDrawCommand(this._focalDepth);
                break;
            case Camera.ORTHOGRAPHIC_PROJECTION:
                this._node.sendDrawCommand(Commands.ORTHOGRAPHIC_PROJECTION);
                break;
        }
    }

    if (this._viewDirty) {
        this._viewDirty = false;

        this._node.sendDrawCommand(Commands.CHANGE_VIEW_TRANSFORM);
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

},{"../core/Commands":2}],2:[function(require,module,exports){
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
 * An enumeration of the commands in our command queue.
 */
var Commands = {
    INIT_DOM: 0,
    DOM_RENDER_SIZE: 1,
    CHANGE_TRANSFORM: 2,
    CHANGE_SIZE: 3,
    CHANGE_PROPERTY: 4,
    CHANGE_CONTENT: 5,
    CHANGE_ATTRIBUTE: 6,
    ADD_CLASS: 7,
    REMOVE_CLASS: 8,
    SUBSCRIBE: 9,
    GL_SET_DRAW_OPTIONS: 10,
    GL_AMBIENT_LIGHT: 11,
    GL_LIGHT_POSITION: 12,
    GL_LIGHT_COLOR: 13,
    MATERIAL_INPUT: 14,
    GL_SET_GEOMETRY: 15,
    GL_UNIFORMS: 16,
    GL_BUFFER_DATA: 17,
    GL_CUTOUT_STATE: 18,
    GL_MESH_VISIBILITY: 19,
    GL_REMOVE_MESH: 20,
    PINHOLE_PROJECTION: 21,
    ORTHOGRAPHIC_PROJECTION: 22,
    CHANGE_VIEW_TRANSFORM: 23,
    WITH: 24,
    FRAME: 25,
    ENGINE: 26,
    START: 27,
    STOP: 28,
    TIME: 29,
    TRIGGER: 30,
    NEED_SIZE_FOR: 31,
    DOM: 32,
    READY: 33,
    ALLOW_DEFAULT: 34,
    PREVENT_DEFAULT: 35
};

module.exports = Commands;

},{}],3:[function(require,module,exports){
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
 * A collection of utilities for handling paths.
 *
 * @class
 */
function PathUtils () {
}

/**
 * determines if the passed in path has a trailing slash. Paths of the form
 * 'body/0/1/' return true, while paths of the form 'body/0/1' return false.
 *
 * @method
 *
 * @param {String} path the path
 *
 * @return {Boolean} whether or not the path has a trailing slash
 */
PathUtils.prototype.hasTrailingSlash = function hasTrailingSlash (path) {
    return path[path.length - 1] === '/';
};

/**
 * Returns the depth in the tree this path represents. Essentially counts
 * the slashes ignoring a trailing slash.
 *
 * @method
 *
 * @param {String} path the path
 *
 * @return {Number} the depth in the tree that this path represents
 */
PathUtils.prototype.depth = function depth (path) {
    var count = 0;
    var length = path.length;
    var len = this.hasTrailingSlash(path) ? length - 1 : length;
    var i = 0;
    for (; i < len ; i++) count += path[i] === '/' ? 1 : 0;
    return count;
};

/**
 * Gets the position of this path in relation to its siblings.
 *
 * @method
 *
 * @param {String} path the path
 *
 * @return {Number} the index of this path in relation to its siblings.
 */
PathUtils.prototype.index = function index (path) {
    var length = path.length;
    var len = this.hasTrailingSlash(path) ? length - 1 : length;
    while (len--) if (path[len] === '/') break;
    var result = parseInt(path.substring(len + 1));
    return isNaN(result) ? 0 : result;
};

/**
 * Gets the position of the path at a particular breadth in relationship
 * to its siblings
 *
 * @method
 *
 * @param {String} path the path
 * @param {Number} depth the breadth at which to find the index
 *
 * @return {Number} index at the particular depth
 */
PathUtils.prototype.indexAtDepth = function indexAtDepth (path, depth) {
    var i = 0;
    var len = path.length;
    var index = 0;
    for (; i < len ; i++) {
        if (path[i] === '/') index++;
        if (index === depth) {
            path = path.substring(i ? i + 1 : i);
            index = path.indexOf('/');
            path = index === -1 ? path : path.substring(0, index);
            index = parseInt(path);
            return isNaN(index) ? path : index;
        }
    }
};

/**
 * returns the path of the passed in path's parent.
 *
 * @method
 *
 * @param {String} path the path
 *
 * @return {String} the path of the passed in path's parent
 */
PathUtils.prototype.parent = function parent (path) {
    return path.substring(0, path.lastIndexOf('/', path.length - 2));
};

/**
 * Determines whether or not the first argument path is the direct child
 * of the second argument path.
 *
 * @method
 *
 * @param {String} child the path that may be a child
 * @param {String} parent the path that may be a parent
 *
 * @return {Boolean} whether or not the first argument path is a child of the second argument path
 */
PathUtils.prototype.isChildOf = function isChildOf (child, parent) {
    return this.isDescendentOf(child, parent) && this.depth(child) === this.depth(parent) + 1;
};

/**
 * Returns true if the first argument path is a descendent of the second argument path.
 *
 * @method
 *
 * @param {String} child potential descendent path
 * @param {String} parent potential ancestor path
 *
 * @return {Boolean} whether or not the path is a descendent
 */
PathUtils.prototype.isDescendentOf = function isDescendentOf(child, parent) {
    if (child === parent) return false;
    child = this.hasTrailingSlash(child) ? child : child + '/';
    parent = this.hasTrailingSlash(parent) ? parent : parent + '/';
    return this.depth(parent) < this.depth(child) && child.indexOf(parent) === 0;
};

/**
 * returns the selector portion of the path.
 *
 * @method
 *
 * @param {String} path the path
 *
 * @return {String} the selector portion of the path.
 */
PathUtils.prototype.getSelector = function getSelector(path) {
    var index = path.indexOf('/');
    return index === -1 ? path : path.substring(0, index);
};

module.exports = new PathUtils();


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

var ElementCache = require('./ElementCache');
var math = require('./Math');
var PathUtils = require('../core/Path');
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

    this._lastEv = null;
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
DOMRenderer.prototype.subscribe = function subscribe(type) {
    this._assertTargetLoaded();
    this._listen(type);
    this._target.subscribe[type] = true;
};

/**
 * Unsubscribes from all events that are of the specified type.
 *
 * @method
 *
 * @param  {String} type    Event type to unsubscribe from.
 * @return {undefined}      undefined
 */
DOMRenderer.prototype.unsubscribe = function unsubscribe(type) {
    this._assertTargetLoaded();
    this._listen(type);
    this._target.subscribe[type] = false;
};

/**
 * Used to preventDefault if an event of the specified type is being emitted on
 * the currently loaded target.
 *
 * @method
 *
 * @param  {String} type    The type of events that should be prevented.
 * @return {undefined}      undefined
 */
DOMRenderer.prototype.preventDefault = function preventDefault(type) {
    this._assertTargetLoaded();
    this._listen(type);
    this._target.preventDefault[type] = true;
};

/**
 * Used to undo a previous call to preventDefault. No longer `preventDefault`
 * for this event on the loaded target.
 *
 * @method
 * @private
 *
 * @param  {String} type    The event type that should no longer be affected by
 *                          `preventDefault`.
 * @return {undefined}      undefined
 */
DOMRenderer.prototype.allowDefault = function allowDefault(type) {
    this._assertTargetLoaded();
    this._listen(type);
    this._target.preventDefault[type] = false;
};

/**
 * Internal helper function used for adding an event listener for the the
 * currently loaded ElementCache.
 *
 * If the event can be delegated as specified in the {@link EventMap}, the
 * bound {@link _triggerEvent} function will be added as a listener on the
 * root element. Otherwise, the listener will be added directly to the target
 * element.
 *
 * @private
 * @method
 *
 * @param  {String} type    The event type to listen to (e.g. click).
 * @return {undefined}      undefined
 */
DOMRenderer.prototype._listen = function _listen(type) {
    this._assertTargetLoaded();

    if (
        !this._target.listeners[type] && !this._root.listeners[type]
    ) {
        // FIXME Add to content DIV if available
        var target = eventMap[type][1] ? this._root : this._target;
        target.listeners[type] = this._boundTriggerEvent;
        target.element.addEventListener(type, this._boundTriggerEvent);
    }
};

/**
 * Removes an EventListener of given type from the element on which it was
 * registered.
 *
 * @method
 *
 * @param {String} type DOM event type (e.g. click, mouseover).
 *
 * @return {undefined} undefined
 */
DOMRenderer.prototype.unsubscribe = function unsubscribe(type) {
    this._assertTargetLoaded();
    this._target.subscribe[type] = false;
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
    if (this._lastEv === ev) return;

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

        // Optionally preventDefault. This needs forther consideration and
        // should be optional. Eventually this should be a separate command/
        // method.
        if (this._elements[path].preventDefault[ev.type]) {
            ev.preventDefault();
        }

        // Stop further event propogation and path traversal as soon as the
        // first ElementCache subscribing for the emitted event has been found.
        if (this._elements[path] && this._elements[path].subscribe[ev.type]) {
            this._lastEv = ev;

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
 * Finds children of a parent element that are descendents of a inserted element in the scene
 * graph. Appends those children to the inserted element.
 *
 * @method resolveChildren
 * @return {void}
 *
 * @param {HTMLElement} element the inserted element
 * @param {HTMLElement} parent the parent of the inserted element
 */
DOMRenderer.prototype.resolveChildren = function resolveChildren (element, parent) {
    var i = 0;
    var childNode;
    var path = this._path;
    var childPath;

    while ((childNode = parent.childNodes[i])) {
        if (!childNode.dataset) {
            i++;
            continue;
        }
        childPath = childNode.dataset.faPath;
        if (!childPath) {
            i++;
            continue;
        }
        if (PathUtils.isDescendentOf(childPath, path)) element.appendChild(childNode);
        else i++;
    }
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

        this._assertParentLoaded();

        if (this._parent.void)
            throw new Error(
                this._parent.path + ' is a void element. ' +
                'Void elements are not allowed to have children.'
            );

        if (this._target) this._parent.element.removeChild(this._target.element);

        this._target = new ElementCache(document.createElement(tagName), this._path);

        var el = this._target.element;
        var parent = this._parent.element;

        this.resolveChildren(el, parent);

        this._parent.element.appendChild(this._target.element);
        this._elements[this._path] = this._target;
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
 * Invoking setSize is equivalent to a manual invocation of `setWidth` followed
 * by `setHeight`.
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
 * Sets the width of the currently loaded ElementCache.
 * 
 * @method
 *  
 * @param  {Number|false} width     The explicit width to be set on the
 *                                  ElementCache's target (and content) element.
 *                                  `false` removes any explicit sizing
 *                                  constraints from the underlying DOM
 *                                  Elements.
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
 * Sets the height of the currently loaded ElementCache.
 * 
 * @method  setHeight
 *  
 * @param  {Number|false} height    The explicit height to be set on the
 *                                  ElementCache's target (and content) element.
 *                                  `false` removes any explicit sizing
 *                                  constraints from the underlying DOM
 *                                  Elements.
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

    if (this._target.formElement) {
        this._target.element.value = content;
    }
    else {
        if (!this._target.content) {
            this._target.content = document.createElement('div');
            this._target.content.classList.add('famous-dom-element-content');
            this._target.element.insertBefore(
                this._target.content,
                this._target.element.firstChild
            );
        }
        this._target.content.innerHTML = content;
    }


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
DOMRenderer.prototype.setMatrix = function setMatrix (transform) {
    this._assertTargetLoaded();
    this._target.element.style[TRANSFORM] = this._stringifyMatrix(transform);
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

},{"../core/Path":3,"../utilities/vendorPrefix":27,"./ElementCache":5,"./Math":6,"./events/EventMap":10}],5:[function(require,module,exports){
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

var VoidElements = require('./VoidElements');

/**
 * ElementCache is being used for keeping track of an element's DOM Element,
 * path, world transform, inverted parent, final transform (as being used for
 * setting the actual `transform`-property) and post render size (final size as
 * being rendered to the DOM).
 *
 * @class ElementCache
 *
 * @param {Element} element DOMElement
 * @param {String} path Path used for uniquely identifying the location in the
 *                      scene graph.
 */
function ElementCache (element, path) {
    this.tagName = element.tagName.toLowerCase();
    this.void = VoidElements[this.tagName];

    var constructor = element.constructor;

    this.formElement = constructor === HTMLInputElement ||
        constructor === HTMLTextAreaElement ||
        constructor === HTMLSelectElement;

    this.element = element;
    this.path = path;
    this.content = null;
    this.size = new Int16Array(3);
    this.explicitHeight = false;
    this.explicitWidth = false;
    this.postRenderSize = new Float32Array(2);
    this.listeners = {};
    this.preventDefault = {};
    this.subscribe = {};
}

module.exports = ElementCache;

},{"./VoidElements":7}],6:[function(require,module,exports){
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

/**
 * Map of void elements as defined by the
 * [HTML5 spec](http://www.w3.org/TR/html5/syntax.html#elements-0).
 *
 * @type {Object}
 */
var VoidElements = {
    area  : true,
    base  : true,
    br    : true,
    col   : true,
    embed : true,
    hr    : true,
    img   : true,
    input : true,
    keygen: true,
    link  : true,
    meta  : true,
    param : true,
    source: true,
    track : true,
    wbr   : true
};

module.exports = VoidElements;

},{}],8:[function(require,module,exports){
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

},{"./UIEvent":16}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"./CompositionEvent":8,"./Event":9,"./FocusEvent":11,"./InputEvent":12,"./KeyboardEvent":13,"./MouseEvent":14,"./TouchEvent":15,"./UIEvent":16,"./WheelEvent":17}],11:[function(require,module,exports){
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

},{"./UIEvent":16}],12:[function(require,module,exports){
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

},{"./UIEvent":16}],13:[function(require,module,exports){
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

},{"./UIEvent":16}],14:[function(require,module,exports){
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

},{"./UIEvent":16}],15:[function(require,module,exports){
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

},{"./UIEvent":16}],16:[function(require,module,exports){
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

},{"./Event":9}],17:[function(require,module,exports){
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

},{"./MouseEvent":14}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{"./animationFrame":18}],20:[function(require,module,exports){
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

},{"../polyfills":19}],21:[function(require,module,exports){
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
var Commands = require('../core/Commands');

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
        _this.onResize();
    });
}

Compositor.prototype.onResize = function onResize () {
    this._resized = true;
    for (var selector in this._contexts) {
        this._contexts[selector].updateSize();
    }
};

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
    this._outCommands.push(Commands.WITH, path, Commands.TRIGGER, ev, payload);
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
 *
 * @param  {String} selector document query selector used for retrieving the
 * DOM node that should be used as a root element by the Context
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
 * Retrieves a context object registered under the passed in selector.
 *
 * @method
 *
 * @param  {String} selector    Query selector that has previously been used to
 *                              register the context.
 * @return {Context}            The repsective context.
 */
Compositor.prototype.getContext = function getContext(selector) {
    if (this._contexts[selector])
        return this._contexts[selector];
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
            case Commands.TIME:
                this._time = commands[++localIterator];
                break;
            case Commands.WITH:
                localIterator = this.handleWith(++localIterator, commands);
                break;
            case Commands.NEED_SIZE_FOR:
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

    for (var selector in this._contexts) {
        this._contexts[selector].checkInit();
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

},{"../core/Commands":2,"./Context":22,"./inject-css":24}],22:[function(require,module,exports){
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
var Commands = require('../core/Commands');

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
 */
function Context(selector, compositor) {
    this._compositor = compositor;
    this._rootEl = document.querySelector(selector);
    this._selector = selector;

    if (this._rootEl === null) {
        throw new Error(
            'Failed to create Context: ' +
            'No matches for "' + selector + '" found.'
        );
    }

    this._selector = selector;

    // Initializes the DOMRenderer.
    // Every Context has at least a DOMRenderer for now.
    this._initDOMRenderer();

    // WebGLRenderer will be instantiated when needed.
    this._webGLRenderer = null;
    this._domRenderer = new DOMRenderer(this._domRendererRootEl, selector, compositor);
    this._canvasEl = null;
    
    // State holders

    this._renderState = {
        projectionType: Camera.ORTHOGRAPHIC_PROJECTION,
        perspectiveTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewTransform: new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
        viewDirty: false,
        perspectiveDirty: false
    };

    this._size = [];

    this._meshTransform = new Float32Array(16);
    this._meshSize = [0, 0, 0];

    this._initDOM = false;

    this._commandCallbacks = [];
    this.initCommandCallbacks();

    this.updateSize();
}

/**
 * Queries DOMRenderer size and updates canvas size. Relays size information to
 * WebGLRenderer.
 *
 * @method
 *
 * @return {Context} this
 */
Context.prototype.updateSize = function () {
    var width = this._rootEl.offsetWidth;
    var height = this._rootEl.offsetHeight;

    this._size[0] = width;
    this._size[1] = height;
    this._size[2] = (width > height) ? width : height;

    this._compositor.sendResize(this._selector, this._size);
    if (this._webGLRenderer) this._webGLRenderer.updateSize(this._size);

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
    this._domRenderer.draw(this._renderState);
    if (this._webGLRenderer) this._webGLRenderer.draw(this._renderState);

    if (this._renderState.perspectiveDirty) this._renderState.perspectiveDirty = false;
    if (this._renderState.viewDirty) this._renderState.viewDirty = false;
};

/**
 * Initializes the DOMRenderer by creating a root DIV element and appending it
 * to the context.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
Context.prototype._initDOMRenderer = function _initDOMRenderer() {
    this._domRendererRootEl = document.createElement('div');
    this._rootEl.appendChild(this._domRendererRootEl);
    this._domRendererRootEl.style.display = 'none';

    this._domRenderer = new DOMRenderer(
        this._domRendererRootEl,
        this._selector,
        this._compositor
    );
};

Context.prototype.getRootSize = function getRootSize() {
    return [
        this._rootEl.offsetWidth,
        this._rootEl.offsetHeight
    ];
};

Context.prototype.initCommandCallbacks = function initCommandCallbacks () {
    this._commandCallbacks[Commands.INIT_DOM] = initDOM;
    this._commandCallbacks[Commands.DOM_RENDER_SIZE] = domRenderSize;
    this._commandCallbacks[Commands.CHANGE_TRANSFORM] = changeTransform;
    this._commandCallbacks[Commands.CHANGE_SIZE] = changeSize;
    this._commandCallbacks[Commands.CHANGE_PROPERTY] = changeProperty;
    this._commandCallbacks[Commands.CHANGE_CONTENT] = changeContent;
    this._commandCallbacks[Commands.CHANGE_ATTRIBUTE] = changeAttribute;
    this._commandCallbacks[Commands.ADD_CLASS] = addClass;
    this._commandCallbacks[Commands.REMOVE_CLASS] = removeClass;
    this._commandCallbacks[Commands.SUBSCRIBE] = subscribe;
    this._commandCallbacks[Commands.GL_SET_DRAW_OPTIONS] = glSetDrawOptions;
    this._commandCallbacks[Commands.GL_AMBIENT_LIGHT] = glAmbientLight;
    this._commandCallbacks[Commands.GL_LIGHT_POSITION] = glLightPosition;
    this._commandCallbacks[Commands.GL_LIGHT_COLOR] = glLightColor;
    this._commandCallbacks[Commands.MATERIAL_INPUT] = materialInput;
    this._commandCallbacks[Commands.GL_SET_GEOMETRY] = glSetGeometry;
    this._commandCallbacks[Commands.GL_UNIFORMS] = glUniforms;
    this._commandCallbacks[Commands.GL_BUFFER_DATA] = glBufferData;
    this._commandCallbacks[Commands.GL_CUTOUT_STATE] = glCutoutState;
    this._commandCallbacks[Commands.GL_MESH_VISIBILITY] = glMeshVisibility;
    this._commandCallbacks[Commands.GL_REMOVE_MESH] = glRemoveMesh;
    this._commandCallbacks[Commands.PINHOLE_PROJECTION] = pinholeProjection;
    this._commandCallbacks[Commands.ORTHOGRAPHIC_PROJECTION] = orthographicProjection;
    this._commandCallbacks[Commands.CHANGE_VIEW_TRANSFORM] = changeViewTransform;
    this._commandCallbacks[Commands.PREVENT_DEFAULT] = preventDefault;
    this._commandCallbacks[Commands.ALLOW_DEFAULT] = allowDefault;
    this._commandCallbacks[Commands.READY] = ready;
};

/**
 * Initializes the WebGLRenderer and updates it initial size.
 *
 * The Initialization process consists of the following steps:
 *
 * 1. A new `<canvas>` element is being created and appended to the root element.
 * 2. The WebGLRenderer is being instantiated.
 * 3. The size of the WebGLRenderer is being updated.
 *
 * @method
 * @private
 *
 * @return {undefined} undefined
 */
Context.prototype._initWebGLRenderer = function _initWebGLRenderer() {
    this._webGLRendererRootEl = document.createElement('canvas');
    this._rootEl.appendChild(this._webGLRendererRootEl);

    this._webGLRenderer = new WebGLRenderer(
        this._webGLRendererRootEl,
        this._compositor
    );

    // Don't read offset width and height.
    this._webGLRenderer.updateSize(this._size);
};

/**
 * Gets the size of the parent element of the DOMRenderer for this context.
 *
 * @method
 *
 * @return {undefined} undefined
 */
Context.prototype.getRootSize = function getRootSize() {
    return [
        this._rootEl.offsetWidth,
        this._rootEl.offsetHeight
    ];
};


/**
 * Initializes the context if the `READY` command has been received earlier.
 *
 * @return {undefined} undefined
 */
Context.prototype.checkInit = function checkInit () {
    if (this._initDOM) {
        this._domRendererRootEl.style.display = 'block';
        this._initDOM = false;
    }
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

    this._domRenderer.loadPath(path);
    this._domRenderer.findTarget();

    while (command != null) {
        if (command === Commands.WITH || command === Commands.TIME) return localIterator - 1;
        else localIterator = this._commandCallbacks[command](this, path, commands, localIterator) + 1; 
        command = commands[localIterator];
    }

    return localIterator;
};

/**
 * Getter method used for retrieving the used DOMRenderer.
 *
 * @method
 *
 * @return {DOMRenderer}    The DOMRenderer being used by the Context.
 */
Context.prototype.getDOMRenderer = function getDOMRenderer() {
    return this._domRenderer;
};

/**
 * Getter method used for retrieving the used WebGLRenderer (if any).
 *
 * @method
 *
 * @return {WebGLRenderer|null}    The WebGLRenderer being used by the Context.
 */
Context.prototype.getWebGLRenderer = function getWebGLRenderer() {
    return this._webGLRenderer;
};

// Command Callbacks
function preventDefault (context, path, commands, iterator) {
    if (context._webGLRenderer) context._webGLRenderer.getOrSetCutout(path);
    context._domRenderer.preventDefault(commands[++iterator]);
    return iterator;
}

function allowDefault (context, path, commands, iterator) {
    if (context._webGLRenderer) context._webGLRenderer.getOrSetCutout(path);
    context._domRenderer.allowDefault(commands[++iterator]);
    return iterator;
}

function ready (context, path, commands, iterator) {
    context._initDOM = true;
    return iterator;
}

function initDOM (context, path, commands, iterator) {
    context._domRenderer.insertEl(commands[++iterator]);
    return iterator;
}

function domRenderSize (context, path, commands, iterator) {
    context._domRenderer.getSizeOf(commands[++iterator]);
    return iterator;
}

function changeTransform (context, path, commands, iterator) {
    var temp = context._meshTransform;

    temp[0] = commands[++iterator];
    temp[1] = commands[++iterator];
    temp[2] = commands[++iterator];
    temp[3] = commands[++iterator];
    temp[4] = commands[++iterator];
    temp[5] = commands[++iterator];
    temp[6] = commands[++iterator];
    temp[7] = commands[++iterator];
    temp[8] = commands[++iterator];
    temp[9] = commands[++iterator];
    temp[10] = commands[++iterator];
    temp[11] = commands[++iterator];
    temp[12] = commands[++iterator];
    temp[13] = commands[++iterator];
    temp[14] = commands[++iterator];
    temp[15] = commands[++iterator];

    context._domRenderer.setMatrix(temp);
    
    if (context._webGLRenderer)
        context._webGLRenderer.setCutoutUniform(path, 'u_transform', temp);

    return iterator;
}

function changeSize (context, path, commands, iterator) {
    var width = commands[++iterator];
    var height = commands[++iterator];

    context._domRenderer.setSize(width, height);
    if (context._webGLRenderer) {
        context._meshSize[0] = width;
        context._meshSize[1] = height;
        context._webGLRenderer.setCutoutUniform(path, 'u_size', context._meshSize);
    }
    
    return iterator;
}

function changeProperty (context, path, commands, iterator) {
    if (context._webGLRenderer) context._webGLRenderer.getOrSetCutout(path);
    context._domRenderer.setProperty(commands[++iterator], commands[++iterator]);
    return iterator;
}

function changeContent (context, path, commands, iterator) {
    if (context._webGLRenderer) context._webGLRenderer.getOrSetCutout(path);
    context._domRenderer.setContent(commands[++iterator]);
    return iterator;
}
  
function changeAttribute (context, path, commands, iterator) {
    if (context._webGLRenderer) context._webGLRenderer.getOrSetCutout(path);
    context._domRenderer.setAttribute(commands[++iterator], commands[++iterator]);
    return iterator;
}

function addClass (context, path, commands, iterator) {
    if (context._webGLRenderer) context._webGLRenderer.getOrSetCutout(path);
    context._domRenderer.addClass(commands[++iterator]);
    return iterator;
}

function removeClass (context, path, commands, iterator) {
    if (context._webGLRenderer) context._webGLRenderer.getOrSetCutout(path);
    context._domRenderer.removeClass(commands[++iterator]);
    return iterator;
}

function subscribe (context, path, commands, iterator) {
    if (context._webGLRenderer) context._webGLRenderer.getOrSetCutout(path);
    context._domRenderer.subscribe(commands[++iterator]);
    return iterator;
}

function glSetDrawOptions (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.setMeshOptions(path, commands[++iterator]);
    return iterator;
}

function glAmbientLight (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.setAmbientLightColor(
        path,
        commands[++iterator],
        commands[++iterator],
        commands[++iterator]
    );
    return iterator;
}

function glLightPosition (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.setLightPosition(
        path,
        commands[++iterator],
        commands[++iterator],
        commands[++iterator]
    );
    return iterator;
}

function glLightColor (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.setLightColor(
        path,
        commands[++iterator],
        commands[++iterator],
        commands[++iterator]
    );
    return iterator;
}

function materialInput (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.handleMaterialInput(
        path,
        commands[++iterator],
        commands[++iterator]
    );
    return iterator;
}

function glSetGeometry (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.setGeometry(
        path,
        commands[++iterator],
        commands[++iterator],
        commands[++iterator]
    );
    return iterator;
}

function glUniforms (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.setMeshUniform(
        path,
        commands[++iterator],
        commands[++iterator]
    );
    return iterator;
}

function glBufferData (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.bufferData(
        path,
        commands[++iterator],
        commands[++iterator],
        commands[++iterator],
        commands[++iterator],
        commands[++iterator]
    );
    return iterator;
}

function glCutoutState (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.setCutoutState(path, commands[++iterator]);
    return iterator;
}

function glMeshVisibility (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.setMeshVisibility(path, commands[++iterator]);
    return iterator;
}

function glRemoveMesh (context, path, commands, iterator) {
    if (!context._webGLRenderer) context._initWebGLRenderer();
    context._webGLRenderer.removeMesh(path);
    return iterator;
}

function pinholeProjection (context, path, commands, iterator) {
    context._renderState.projectionType = Camera.PINHOLE_PROJECTION;
    context._renderState.perspectiveTransform[11] = -1 / commands[++iterator];
    context._renderState.perspectiveDirty = true;
    return iterator;
}

function orthographicProjection (context, path, commands, iterator) {
    context._renderState.projectionType = Camera.ORTHOGRAPHIC_PROJECTION;
    context._renderState.perspectiveTransform[11] = 0;
    context._renderState.perspectiveDirty = true;
    return iterator;
}

function changeViewTransform (context, path, commands, iterator) {
    context._renderState.viewTransform[0] = commands[++iterator];
    context._renderState.viewTransform[1] = commands[++iterator];
    context._renderState.viewTransform[2] = commands[++iterator];
    context._renderState.viewTransform[3] = commands[++iterator];

    context._renderState.viewTransform[4] = commands[++iterator];
    context._renderState.viewTransform[5] = commands[++iterator];
    context._renderState.viewTransform[6] = commands[++iterator];
    context._renderState.viewTransform[7] = commands[++iterator];

    context._renderState.viewTransform[8] = commands[++iterator];
    context._renderState.viewTransform[9] = commands[++iterator];
    context._renderState.viewTransform[10] = commands[++iterator];
    context._renderState.viewTransform[11] = commands[++iterator];

    context._renderState.viewTransform[12] = commands[++iterator];
    context._renderState.viewTransform[13] = commands[++iterator];
    context._renderState.viewTransform[14] = commands[++iterator];
    context._renderState.viewTransform[15] = commands[++iterator];

    context._renderState.viewDirty = true;
    return iterator;
}

module.exports = Context;

},{"../components/Camera":1,"../core/Commands":2,"../dom-renderers/DOMRenderer":4,"../webgl-renderers/WebGLRenderer":34}],23:[function(require,module,exports){
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

var Commands = require('../core/Commands');

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
        if (message[0] === Commands.ENGINE) {
            switch (message[1]) {
                case Commands.START:
                    _this._engine.start();
                    break;
                case Commands.STOP:
                    _this._engine.stop();
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
 * @deprecated Use {@link UIManager#getRenderLoop instead!}
 *
 * @return {Engine} The engine used by the UIManager.
 */
UIManager.prototype.getEngine = function getEngine() {
    return this._renderLoop;
};


/**
 * Returns the render loop currently being used by the UIManager.
 *
 * @method
 *
 * @return {RenderLoop}  The registered render loop used for updating the
 * UIManager.
 */
UIManager.prototype.getRenderLoop = function getRenderLoop() {
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
    this._thread.postMessage([Commands.FRAME, time]);
    var threadMessages = this._compositor.drawCommands();
    this._thread.postMessage(threadMessages);
    this._compositor.clearCommands();
};

module.exports = UIManager;

},{"../core/Commands":2}],24:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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

},{}],27:[function(require,module,exports){
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

},{"./Buffer":28}],30:[function(require,module,exports){
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

},{}],31:[function(require,module,exports){
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

},{"../utilities/clone":25,"../utilities/keyValueToArrays":26,"../webgl-shaders":38,"./Debug":30}],32:[function(require,module,exports){
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

        else if (source instanceof HTMLVideoElement) {
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

},{"./Texture":32,"./createCheckerboard":36}],34:[function(require,module,exports){
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
    this.resolutionValues = [[0, 0, 0]];

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

    var cutout = this.cutoutGeometry = {
        spec: {
            id: -1,
            bufferValues: [[-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]],
            bufferNames: ['a_pos'],
            type: 'TRIANGLE_STRIP'
        }
    };

    this.bufferRegistry.allocate(
        this.cutoutGeometry.spec.id,
        cutout.spec.bufferNames[0],
        cutout.spec.bufferValues[0],
        3
    );
}

/**
 * Attempts to retreive the WebGLRenderer context using several
 * accessors. For browser compatability. Throws on error.
 *
 * @method
 *
 * @param {Object} canvas Canvas element from which the context is retreived
 *
 * @return {Object} WebGLContext WebGL context
 */
WebGLRenderer.prototype.getWebGLContext = function getWebGLContext(canvas) {
    var names = ['webgl', 'experimental-webgl', 'webkit-3d', 'moz-webgl'];
    var context;

    for (var i = 0, len = names.length; i < len; i++) {
        try {
            context = canvas.getContext(names[i]);
        }
        catch (error) {
            console.error('Error creating WebGL context: ' + error.toString());
        }
        if (context) return context;
    }

    if (!context) {
        console.error('Could not retrieve WebGL context. Please refer to https://www.khronos.org/webgl/ for requirements');
        return false;
    }
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

    if (uniformValue.length) {
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

    if (!len) return;

    this.gl.disable(this.gl.CULL_FACE);
    this.gl.enable(this.gl.BLEND);
    this.gl.depthMask(true);

    for (var i = 0; i < len; i++) {
        cutout = this.cutoutRegistry[this.cutoutRegistryKeys[i]];
        buffers = this.bufferRegistry.registry[cutout.geometry];

        if (!cutout.visible) continue;

        this.program.setUniforms(cutout.uniformKeys, cutout.uniformValues);
        this.drawBuffers(buffers, cutout.drawType, cutout.geometry);
    }

    this.gl.enable(this.gl.CULL_FACE);
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

    if (options.blending) gl.enable(gl.BLEND);

    if (options.side === 'double') {
        this.gl.cullFace(this.gl.FRONT);
        this.drawBuffers(this.bufferRegistry.registry[mesh.geometry], mesh.drawType, mesh.geometry);
        this.gl.cullFace(this.gl.BACK);
    }

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
    if (options.blending) gl.disable(gl.BLEND);
    if (options.side === 'back') gl.cullFace(gl.BACK);
};

module.exports = WebGLRenderer;

},{"../utilities/keyValueToArrays":26,"./BufferRegistry":29,"./Program":31,"./TextureManager":33,"./compileMaterial":35,"./radixSort":37}],35:[function(require,module,exports){
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

},{}],36:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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



var shaders = {
    vertex: "#define GLSLIFY 1\n\n/**\n * The MIT License (MIT)\n * \n * Copyright (c) 2015 Famous Industries Inc.\n * \n * Permission is hereby granted, free of charge, to any person obtaining a copy\n * of this software and associated documentation files (the \"Software\"), to deal\n * in the Software without restriction, including without limitation the rights\n * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n * copies of the Software, and to permit persons to whom the Software is\n * furnished to do so, subject to the following conditions:\n * \n * The above copyright notice and this permission notice shall be included in\n * all copies or substantial portions of the Software.\n * \n * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\n * THE SOFTWARE.\n */\n\n/**\n * The MIT License (MIT)\n * \n * Copyright (c) 2015 Famous Industries Inc.\n * \n * Permission is hereby granted, free of charge, to any person obtaining a copy\n * of this software and associated documentation files (the \"Software\"), to deal\n * in the Software without restriction, including without limitation the rights\n * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n * copies of the Software, and to permit persons to whom the Software is\n * furnished to do so, subject to the following conditions:\n * \n * The above copyright notice and this permission notice shall be included in\n * all copies or substantial portions of the Software.\n * \n * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\n * THE SOFTWARE.\n */\n\n/**\n * Calculates transpose inverse matrix from transform\n * \n * @method random\n * @private\n *\n *\n */\n\n\nmat3 getNormalMatrix_1_0(in mat4 t) {\n   mat3 matNorm;\n   mat4 a = t;\n\n   float a00 = a[0][0], a01 = a[0][1], a02 = a[0][2], a03 = a[0][3],\n   a10 = a[1][0], a11 = a[1][1], a12 = a[1][2], a13 = a[1][3],\n   a20 = a[2][0], a21 = a[2][1], a22 = a[2][2], a23 = a[2][3],\n   a30 = a[3][0], a31 = a[3][1], a32 = a[3][2], a33 = a[3][3],\n   b00 = a00 * a11 - a01 * a10,\n   b01 = a00 * a12 - a02 * a10,\n   b02 = a00 * a13 - a03 * a10,\n   b03 = a01 * a12 - a02 * a11,\n   b04 = a01 * a13 - a03 * a11,\n   b05 = a02 * a13 - a03 * a12,\n   b06 = a20 * a31 - a21 * a30,\n   b07 = a20 * a32 - a22 * a30,\n   b08 = a20 * a33 - a23 * a30,\n   b09 = a21 * a32 - a22 * a31,\n   b10 = a21 * a33 - a23 * a31,\n   b11 = a22 * a33 - a23 * a32,\n\n   det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n   det = 1.0 / det;\n\n   matNorm[0][0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;\n   matNorm[0][1] = (a12 * b08 - a10 * b11 - a13 * b07) * det;\n   matNorm[0][2] = (a10 * b10 - a11 * b08 + a13 * b06) * det;\n\n   matNorm[1][0] = (a02 * b10 - a01 * b11 - a03 * b09) * det;\n   matNorm[1][1] = (a00 * b11 - a02 * b08 + a03 * b07) * det;\n   matNorm[1][2] = (a01 * b08 - a00 * b10 - a03 * b06) * det;\n\n   matNorm[2][0] = (a31 * b05 - a32 * b04 + a33 * b03) * det;\n   matNorm[2][1] = (a32 * b02 - a30 * b05 - a33 * b01) * det;\n   matNorm[2][2] = (a30 * b04 - a31 * b02 + a33 * b00) * det;\n\n   return matNorm;\n}\n\n\n\n/**\n * The MIT License (MIT)\n * \n * Copyright (c) 2015 Famous Industries Inc.\n * \n * Permission is hereby granted, free of charge, to any person obtaining a copy\n * of this software and associated documentation files (the \"Software\"), to deal\n * in the Software without restriction, including without limitation the rights\n * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n * copies of the Software, and to permit persons to whom the Software is\n * furnished to do so, subject to the following conditions:\n * \n * The above copyright notice and this permission notice shall be included in\n * all copies or substantial portions of the Software.\n * \n * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\n * THE SOFTWARE.\n */\n\n/**\n * Calculates a matrix that creates the identity when multiplied by m\n * \n * @method inverse\n * @private\n *\n *\n */\n\n\nfloat inverse_2_1(float m) {\n    return 1.0 / m;\n}\n\nmat2 inverse_2_1(mat2 m) {\n    return mat2(m[1][1],-m[0][1],\n               -m[1][0], m[0][0]) / (m[0][0]*m[1][1] - m[0][1]*m[1][0]);\n}\n\nmat3 inverse_2_1(mat3 m) {\n    float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];\n    float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];\n    float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];\n\n    float b01 =  a22 * a11 - a12 * a21;\n    float b11 = -a22 * a10 + a12 * a20;\n    float b21 =  a21 * a10 - a11 * a20;\n\n    float det = a00 * b01 + a01 * b11 + a02 * b21;\n\n    return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),\n                b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),\n                b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;\n}\n\nmat4 inverse_2_1(mat4 m) {\n    float\n        a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3],\n        a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3],\n        a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3],\n        a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3],\n\n        b00 = a00 * a11 - a01 * a10,\n        b01 = a00 * a12 - a02 * a10,\n        b02 = a00 * a13 - a03 * a10,\n        b03 = a01 * a12 - a02 * a11,\n        b04 = a01 * a13 - a03 * a11,\n        b05 = a02 * a13 - a03 * a12,\n        b06 = a20 * a31 - a21 * a30,\n        b07 = a20 * a32 - a22 * a30,\n        b08 = a20 * a33 - a23 * a30,\n        b09 = a21 * a32 - a22 * a31,\n        b10 = a21 * a33 - a23 * a31,\n        b11 = a22 * a33 - a23 * a32,\n\n        det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;\n\n    return mat4(\n        a11 * b11 - a12 * b10 + a13 * b09,\n        a02 * b10 - a01 * b11 - a03 * b09,\n        a31 * b05 - a32 * b04 + a33 * b03,\n        a22 * b04 - a21 * b05 - a23 * b03,\n        a12 * b08 - a10 * b11 - a13 * b07,\n        a00 * b11 - a02 * b08 + a03 * b07,\n        a32 * b02 - a30 * b05 - a33 * b01,\n        a20 * b05 - a22 * b02 + a23 * b01,\n        a10 * b10 - a11 * b08 + a13 * b06,\n        a01 * b08 - a00 * b10 - a03 * b06,\n        a30 * b04 - a31 * b02 + a33 * b00,\n        a21 * b02 - a20 * b04 - a23 * b00,\n        a11 * b07 - a10 * b09 - a12 * b06,\n        a00 * b09 - a01 * b07 + a02 * b06,\n        a31 * b01 - a30 * b03 - a32 * b00,\n        a20 * b03 - a21 * b01 + a22 * b00) / det;\n}\n\n\n\n/**\n * The MIT License (MIT)\n * \n * Copyright (c) 2015 Famous Industries Inc.\n * \n * Permission is hereby granted, free of charge, to any person obtaining a copy\n * of this software and associated documentation files (the \"Software\"), to deal\n * in the Software without restriction, including without limitation the rights\n * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n * copies of the Software, and to permit persons to whom the Software is\n * furnished to do so, subject to the following conditions:\n * \n * The above copyright notice and this permission notice shall be included in\n * all copies or substantial portions of the Software.\n * \n * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\n * THE SOFTWARE.\n */\n\n/**\n * Reflects a matrix over its main diagonal.\n * \n * @method transpose\n * @private\n *\n *\n */\n\n\nfloat transpose_3_2(float m) {\n    return m;\n}\n\nmat2 transpose_3_2(mat2 m) {\n    return mat2(m[0][0], m[1][0],\n                m[0][1], m[1][1]);\n}\n\nmat3 transpose_3_2(mat3 m) {\n    return mat3(m[0][0], m[1][0], m[2][0],\n                m[0][1], m[1][1], m[2][1],\n                m[0][2], m[1][2], m[2][2]);\n}\n\nmat4 transpose_3_2(mat4 m) {\n    return mat4(m[0][0], m[1][0], m[2][0], m[3][0],\n                m[0][1], m[1][1], m[2][1], m[3][1],\n                m[0][2], m[1][2], m[2][2], m[3][2],\n                m[0][3], m[1][3], m[2][3], m[3][3]);\n}\n\n\n\n\n/**\n * Converts vertex from modelspace to screenspace using transform\n * information from context.\n *\n * @method applyTransform\n * @private\n *\n *\n */\n\nvec4 applyTransform(vec4 pos) {\n    //TODO: move this multiplication to application code. \n\n    /**\n     * Currently multiplied in the vertex shader to avoid consuming the complexity of holding an additional\n     * transform as state on the mesh object in WebGLRenderer. Multiplies the object's transformation from object space\n     * to world space with its transformation from world space to eye space.\n     */\n    mat4 MVMatrix = u_view * u_transform;\n\n    //TODO: move the origin, sizeScale and y axis inversion to application code in order to amortize redundant per-vertex calculations.\n\n    /**\n     * The transform uniform should be changed to the result of the transformation chain:\n     *\n     * view * modelTransform * invertYAxis * sizeScale * origin\n     *\n     * which could be simplified to:\n     *\n     * view * modelTransform * convertToDOMSpace\n     *\n     * where convertToDOMSpace represents the transform matrix:\n     *\n     *                           size.x 0       0       size.x \n     *                           0      -size.y 0       size.y\n     *                           0      0       1       0\n     *                           0      0       0       1\n     *\n     */\n\n    /**\n     * Assuming a unit volume, moves the object space origin [0, 0, 0] to the \"top left\" [1, -1, 0], the DOM space origin.\n     * Later in the transformation chain, the projection transform negates the rigidbody translation.\n     * Equivalent to (but much faster than) multiplying a translation matrix \"origin\"\n     *\n     *                           1 0 0 1 \n     *                           0 1 0 -1\n     *                           0 0 1 0\n     *                           0 0 0 1\n     *\n     * in the transform chain: projection * view * modelTransform * invertYAxis * sizeScale * origin * positionVector.\n     */\n    pos.x += 1.0;\n    pos.y -= 1.0;\n\n    /**\n     * Assuming a unit volume, scales an object to the amount of pixels in the size uniform vector's specified dimensions.\n     * Later in the transformation chain, the projection transform transforms the point into clip space by scaling\n     * by the inverse of the canvas' resolution.\n     * Equivalent to (but much faster than) multiplying a scale matrix \"sizeScale\"\n     *\n     *                           size.x 0      0      0 \n     *                           0      size.y 0      0\n     *                           0      0      size.z 0\n     *                           0      0      0      1\n     *\n     * in the transform chain: projection * view * modelTransform * invertYAxis * sizeScale * origin * positionVector.\n     */\n    pos.xyz *= u_size * 0.5;\n\n    /**\n     * Inverts the object space's y axis in order to match DOM space conventions. \n     * Later in the transformation chain, the projection transform reinverts the y axis to convert to clip space.\n     * Equivalent to (but much faster than) multiplying a scale matrix \"invertYAxis\"\n     *\n     *                           1 0 0 0 \n     *                           0 -1 0 0\n     *                           0 0 1 0\n     *                           0 0 0 1\n     *\n     * in the transform chain: projection * view * modelTransform * invertYAxis * sizeScale * origin * positionVector.\n     */\n    pos.y *= -1.0;\n\n    /**\n     * Exporting the vertex's position as a varying, in DOM space, to be used for lighting calculations. This has to be in DOM space\n     * since light position and direction is derived from the scene graph, calculated in DOM space.\n     */\n\n    v_position = (MVMatrix * pos).xyz;\n\n    /**\n    * Exporting the eye vector (a vector from the center of the screen) as a varying, to be used for lighting calculations.\n    * In clip space deriving the eye vector is a matter of simply taking the inverse of the position, as the position is a vector\n    * from the center of the screen. However, since our points are represented in DOM space,\n    * the position is a vector from the top left corner of the screen, so some additional math is needed (specifically, subtracting\n    * the position from the center of the screen, i.e. half the resolution of the canvas).\n    */\n\n    v_eyeVector = (u_resolution * 0.5) - v_position;\n\n    /**\n     * Transforming the position (currently represented in dom space) into view space (with our dom space view transform)\n     * and then projecting the point into raster both by applying a perspective transformation and converting to clip space\n     * (the perspective matrix is a combination of both transformations, therefore it's probably more apt to refer to it as a\n     * projection transform).\n     */\n\n    pos = u_perspective * MVMatrix * pos;\n\n    return pos;\n}\n\n/**\n * Placeholder for positionOffset chunks to be templated in.\n * Used for mesh deformation.\n *\n * @method calculateOffset\n * @private\n *\n *\n */\n#vert_definitions\nvec3 calculateOffset(vec3 ID) {\n    #vert_applications\n    return vec3(0.0);\n}\n\n/**\n * Writes the position of the vertex onto the screen.\n * Passes texture coordinate and normal attributes as varyings\n * and passes the position attribute through position pipeline.\n *\n * @method main\n * @private\n *\n *\n */\nvoid main() {\n    v_textureCoordinate = a_texCoord;\n    vec3 invertedNormals = a_normals + (u_normals.x < 0.0 ? calculateOffset(u_normals) * 2.0 - 1.0 : vec3(0.0));\n    invertedNormals.y *= -1.0;\n    v_normal = transpose_3_2(mat3(inverse_2_1(u_transform))) * invertedNormals;\n    vec3 offsetPos = a_pos + calculateOffset(u_positionOffset);\n    gl_Position = applyTransform(vec4(offsetPos, 1.0));\n}\n",
    fragment: "#define GLSLIFY 1\n\n/**\n * The MIT License (MIT)\n * \n * Copyright (c) 2015 Famous Industries Inc.\n * \n * Permission is hereby granted, free of charge, to any person obtaining a copy\n * of this software and associated documentation files (the \"Software\"), to deal\n * in the Software without restriction, including without limitation the rights\n * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n * copies of the Software, and to permit persons to whom the Software is\n * furnished to do so, subject to the following conditions:\n * \n * The above copyright notice and this permission notice shall be included in\n * all copies or substantial portions of the Software.\n * \n * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\n * THE SOFTWARE.\n */\n\n/**\n * The MIT License (MIT)\n * \n * Copyright (c) 2015 Famous Industries Inc.\n * \n * Permission is hereby granted, free of charge, to any person obtaining a copy\n * of this software and associated documentation files (the \"Software\"), to deal\n * in the Software without restriction, including without limitation the rights\n * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n * copies of the Software, and to permit persons to whom the Software is\n * furnished to do so, subject to the following conditions:\n * \n * The above copyright notice and this permission notice shall be included in\n * all copies or substantial portions of the Software.\n * \n * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\n * THE SOFTWARE.\n */\n\n/**\n * Placeholder for fragmentShader  chunks to be templated in.\n * Used for normal mapping, gloss mapping and colors.\n * \n * @method applyMaterial\n * @private\n *\n *\n */\n\n#float_definitions\nfloat applyMaterial_1_0(float ID) {\n    #float_applications\n    return 1.;\n}\n\n#vec3_definitions\nvec3 applyMaterial_1_0(vec3 ID) {\n    #vec3_applications\n    return vec3(0);\n}\n\n#vec4_definitions\nvec4 applyMaterial_1_0(vec4 ID) {\n    #vec4_applications\n\n    return vec4(0);\n}\n\n\n\n/**\n * The MIT License (MIT)\n * \n * Copyright (c) 2015 Famous Industries Inc.\n * \n * Permission is hereby granted, free of charge, to any person obtaining a copy\n * of this software and associated documentation files (the \"Software\"), to deal\n * in the Software without restriction, including without limitation the rights\n * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell\n * copies of the Software, and to permit persons to whom the Software is\n * furnished to do so, subject to the following conditions:\n * \n * The above copyright notice and this permission notice shall be included in\n * all copies or substantial portions of the Software.\n * \n * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\n * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\n * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\n * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\n * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\n * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\n * THE SOFTWARE.\n */\n\n/**\n * Calculates the intensity of light on a surface.\n *\n * @method applyLight\n * @private\n *\n */\nvec4 applyLight_2_1(in vec4 baseColor, in vec3 normal, in vec4 glossiness, int numLights, vec3 ambientColor, vec3 eyeVector, mat4 lightPosition, mat4 lightColor, vec3 v_position) {\n    vec3 diffuse = vec3(0.0);\n    bool hasGlossiness = glossiness.a > 0.0;\n    bool hasSpecularColor = length(glossiness.rgb) > 0.0;\n\n    for(int i = 0; i < 4; i++) {\n        if (i >= numLights) break;\n        vec3 lightDirection = normalize(lightPosition[i].xyz - v_position);\n        float lambertian = max(dot(lightDirection, normal), 0.0);\n\n        if (lambertian > 0.0) {\n            diffuse += lightColor[i].rgb * baseColor.rgb * lambertian;\n            if (hasGlossiness) {\n                vec3 halfVector = normalize(lightDirection + eyeVector);\n                float specularWeight = pow(max(dot(halfVector, normal), 0.0), glossiness.a);\n                vec3 specularColor = hasSpecularColor ? glossiness.rgb : lightColor[i].rgb;\n                diffuse += specularColor * specularWeight * lambertian;\n            }\n        }\n\n    }\n\n    return vec4(ambientColor + diffuse, baseColor.a);\n}\n\n\n\n\n\n/**\n * Writes the color of the pixel onto the screen\n *\n * @method main\n * @private\n *\n *\n */\nvoid main() {\n    vec4 material = u_baseColor.r >= 0.0 ? u_baseColor : applyMaterial_1_0(u_baseColor);\n\n    /**\n     * Apply lights only if flat shading is false\n     * and at least one light is added to the scene\n     */\n    bool lightsEnabled = (u_flatShading == 0.0) && (u_numLights > 0.0 || length(u_ambientLight) > 0.0);\n\n    vec3 normal = normalize(v_normal);\n    vec4 glossiness = u_glossiness.x < 0.0 ? applyMaterial_1_0(u_glossiness) : u_glossiness;\n\n    vec4 color = lightsEnabled ?\n    applyLight_2_1(material, normalize(v_normal), glossiness,\n               int(u_numLights),\n               u_ambientLight * u_baseColor.rgb,\n               normalize(v_eyeVector),\n               u_lightPosition,\n               u_lightColor,   \n               v_position)\n    : material;\n\n    gl_FragColor = color;\n    gl_FragColor.a *= u_opacity;   \n}\n"
};

module.exports = shaders;

},{}],39:[function(require,module,exports){
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

},{"famous/render-loops/RequestAnimationFrameLoop":20}],40:[function(require,module,exports){
'use strict';

var Compositor = require('famous/renderers/Compositor');
var UIManager = require('famous/renderers/UIManager');
var SocketLoop = require('./SocketLoop');

// Boilerplate
new UIManager(new Worker('worker.bundle.js'), new Compositor(), new SocketLoop('http://localhost:1619'));

},{"./SocketLoop":39,"famous/renderers/Compositor":21,"famous/renderers/UIManager":23}]},{},[40])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2NvbXBvbmVudHMvQ2FtZXJhLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL0NvbW1hbmRzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9jb3JlL1BhdGguanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvRE9NUmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvRWxlbWVudENhY2hlLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL01hdGguanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvVm9pZEVsZW1lbnRzLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL2V2ZW50cy9Db21wb3NpdGlvbkV2ZW50LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9kb20tcmVuZGVyZXJzL2V2ZW50cy9FdmVudC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvZG9tLXJlbmRlcmVycy9ldmVudHMvRXZlbnRNYXAuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0ZvY3VzRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0lucHV0RXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL0tleWJvYXJkRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL01vdXNlRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1RvdWNoRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1VJRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL2RvbS1yZW5kZXJlcnMvZXZlbnRzL1doZWVsRXZlbnQuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3BvbHlmaWxscy9hbmltYXRpb25GcmFtZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcG9seWZpbGxzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9yZW5kZXItbG9vcHMvUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvcmVuZGVyZXJzL0NvbXBvc2l0b3IuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3JlbmRlcmVycy9Db250ZXh0LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9yZW5kZXJlcnMvVUlNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy9yZW5kZXJlcnMvaW5qZWN0LWNzcy5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvdXRpbGl0aWVzL2Nsb25lLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy91dGlsaXRpZXMva2V5VmFsdWVUb0FycmF5cy5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvdXRpbGl0aWVzL3ZlbmRvclByZWZpeC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL0J1ZmZlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL0J1ZmZlclJlZ2lzdHJ5LmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvRGVidWcuanMiLCJub2RlX21vZHVsZXMvZmFtb3VzL3dlYmdsLXJlbmRlcmVycy9Qcm9ncmFtLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvVGV4dHVyZS5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL1RleHR1cmVNYW5hZ2VyLmpzIiwibm9kZV9tb2R1bGVzL2ZhbW91cy93ZWJnbC1yZW5kZXJlcnMvV2ViR0xSZW5kZXJlci5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL2NvbXBpbGVNYXRlcmlhbC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL2NyZWF0ZUNoZWNrZXJib2FyZC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtcmVuZGVyZXJzL3JhZGl4U29ydC5qcyIsIm5vZGVfbW9kdWxlcy9mYW1vdXMvd2ViZ2wtc2hhZGVycy9pbmRleC5qcyIsIi9Vc2Vycy9hbGV4YW5kZXJndWdlbC9wbGF0Zm9ybS9lbmdpbmUtc2VlZC9zcmMvU29ja2V0TG9vcC5qcyIsIi9Vc2Vycy9hbGV4YW5kZXJndWdlbC9wbGF0Zm9ybS9lbmdpbmUtc2VlZC9zcmMvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0VEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDamlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3QxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBLFlBQVksQ0FBQzs7QUFFYixJQUFJLHlCQUF5QixHQUFHLE9BQU8sQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDOztBQUV6RixTQUFTLFVBQVUsQ0FBQyxJQUFJLEVBQUU7QUFDdEIsUUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7QUFDdkIsUUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUVoQyxRQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDakIsUUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLFVBQVUsSUFBSSxFQUFFO0FBQ3JDLGFBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFDOUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ3BELENBQUMsQ0FBQztDQUNOOztBQUVELFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFVBQVMsVUFBVSxFQUFFO0FBQy9DLFFBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0NBQ3RDLENBQUM7O0FBRUYsVUFBVSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsVUFBUyxVQUFVLEVBQUU7QUFDdkQsUUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbEQsUUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQ3hELENBQUM7O0FBRUYsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsWUFBVyxFQUFFLENBQUM7QUFDM0MsVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsWUFBVyxFQUFFLENBQUM7O0FBRTFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDOzs7QUMzQjVCLFlBQVksQ0FBQzs7QUFFYixJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztBQUN4RCxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUN0RCxJQUFJLFVBQVUsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7OztBQU96QyxJQUFJLFNBQVMsQ0FDVCxJQUFJLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxFQUM5QixJQUFJLFVBQVUsRUFBRSxFQUNoQixJQUFJLFVBQVUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUMxQyxDQUFDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIENvbW1hbmRzID0gcmVxdWlyZSgnLi4vY29yZS9Db21tYW5kcycpO1xuXG4vKipcbiAqIENhbWVyYSBpcyBhIGNvbXBvbmVudCB0aGF0IGlzIHJlc3BvbnNpYmxlIGZvciBzZW5kaW5nIGluZm9ybWF0aW9uIHRvIHRoZSByZW5kZXJlciBhYm91dCB3aGVyZVxuICogdGhlIGNhbWVyYSBpcyBpbiB0aGUgc2NlbmUuICBUaGlzIGFsbG93cyB0aGUgdXNlciB0byBzZXQgdGhlIHR5cGUgb2YgcHJvamVjdGlvbiwgdGhlIGZvY2FsIGRlcHRoLFxuICogYW5kIG90aGVyIHByb3BlcnRpZXMgdG8gYWRqdXN0IHRoZSB3YXkgdGhlIHNjZW5lcyBhcmUgcmVuZGVyZWQuXG4gKlxuICogQGNsYXNzIENhbWVyYVxuICpcbiAqIEBwYXJhbSB7Tm9kZX0gbm9kZSB0byB3aGljaCB0aGUgaW5zdGFuY2Ugb2YgQ2FtZXJhIHdpbGwgYmUgYSBjb21wb25lbnQgb2ZcbiAqL1xuZnVuY3Rpb24gQ2FtZXJhKG5vZGUpIHtcbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICB0aGlzLl9wcm9qZWN0aW9uVHlwZSA9IENhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTjtcbiAgICB0aGlzLl9mb2NhbERlcHRoID0gMDtcbiAgICB0aGlzLl9uZWFyID0gMDtcbiAgICB0aGlzLl9mYXIgPSAwO1xuICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSBmYWxzZTtcbiAgICB0aGlzLl9pZCA9IG5vZGUuYWRkQ29tcG9uZW50KHRoaXMpO1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSk7XG4gICAgdGhpcy5fdmlld0RpcnR5ID0gZmFsc2U7XG4gICAgdGhpcy5fcGVyc3BlY3RpdmVEaXJ0eSA9IGZhbHNlO1xuICAgIHRoaXMuc2V0RmxhdCgpO1xufVxuXG5DYW1lcmEuRlJVU1RVTV9QUk9KRUNUSU9OID0gMDtcbkNhbWVyYS5QSU5IT0xFX1BST0pFQ1RJT04gPSAxO1xuQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OID0gMjtcblxuLyoqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBjb21wb25lbnRcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiAnQ2FtZXJhJztcbn07XG5cbi8qKlxuICogR2V0cyBvYmplY3QgY29udGFpbmluZyBzZXJpYWxpemVkIGRhdGEgZm9yIHRoZSBjb21wb25lbnRcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSB0aGUgc3RhdGUgb2YgdGhlIGNvbXBvbmVudFxuICovXG5DYW1lcmEucHJvdG90eXBlLmdldFZhbHVlID0gZnVuY3Rpb24gZ2V0VmFsdWUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY29tcG9uZW50OiB0aGlzLnRvU3RyaW5nKCksXG4gICAgICAgIHByb2plY3Rpb25UeXBlOiB0aGlzLl9wcm9qZWN0aW9uVHlwZSxcbiAgICAgICAgZm9jYWxEZXB0aDogdGhpcy5fZm9jYWxEZXB0aCxcbiAgICAgICAgbmVhcjogdGhpcy5fbmVhcixcbiAgICAgICAgZmFyOiB0aGlzLl9mYXJcbiAgICB9O1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGNvbXBvbmVudHMgc3RhdGUgYmFzZWQgb24gc29tZSBzZXJpYWxpemVkIGRhdGFcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHN0YXRlIGFuIG9iamVjdCBkZWZpbmluZyB3aGF0IHRoZSBzdGF0ZSBvZiB0aGUgY29tcG9uZW50IHNob3VsZCBiZVxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHN0YXR1cyBvZiB0aGUgc2V0XG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbiBzZXRWYWx1ZShzdGF0ZSkge1xuICAgIGlmICh0aGlzLnRvU3RyaW5nKCkgPT09IHN0YXRlLmNvbXBvbmVudCkge1xuICAgICAgICB0aGlzLnNldChzdGF0ZS5wcm9qZWN0aW9uVHlwZSwgc3RhdGUuZm9jYWxEZXB0aCwgc3RhdGUubmVhciwgc3RhdGUuZmFyKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBpbnRlcm5hbHMgb2YgdGhlIGNvbXBvbmVudFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdHlwZSBhbiBpZCBjb3JyZXNwb25kaW5nIHRvIHRoZSB0eXBlIG9mIHByb2plY3Rpb24gdG8gdXNlXG4gKiBAcGFyYW0ge051bWJlcn0gZGVwdGggdGhlIGRlcHRoIGZvciB0aGUgcGluaG9sZSBwcm9qZWN0aW9uIG1vZGVsXG4gKiBAcGFyYW0ge051bWJlcn0gbmVhciB0aGUgZGlzdGFuY2Ugb2YgdGhlIG5lYXIgY2xpcHBpbmcgcGxhbmUgZm9yIGEgZnJ1c3R1bSBwcm9qZWN0aW9uXG4gKiBAcGFyYW0ge051bWJlcn0gZmFyIHRoZSBkaXN0YW5jZSBvZiB0aGUgZmFyIGNsaXBwaW5nIHBsYW5lIGZvciBhIGZydXN0dW0gcHJvamVjdGlvblxuICpcbiAqIEByZXR1cm4ge0Jvb2xlYW59IHN0YXR1cyBvZiB0aGUgc2V0XG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gc2V0KHR5cGUsIGRlcHRoLCBuZWFyLCBmYXIpIHtcbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5yZXF1ZXN0VXBkYXRlKHRoaXMuX2lkKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gdHlwZTtcbiAgICB0aGlzLl9mb2NhbERlcHRoID0gZGVwdGg7XG4gICAgdGhpcy5fbmVhciA9IG5lYXI7XG4gICAgdGhpcy5fZmFyID0gZmFyO1xufTtcblxuLyoqXG4gKiBTZXQgdGhlIGNhbWVyYSBkZXB0aCBmb3IgYSBwaW5ob2xlIHByb2plY3Rpb24gbW9kZWxcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IGRlcHRoIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIHRoZSBDYW1lcmEgYW5kIHRoZSBvcmlnaW5cbiAqXG4gKiBAcmV0dXJuIHtDYW1lcmF9IHRoaXNcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5zZXREZXB0aCA9IGZ1bmN0aW9uIHNldERlcHRoKGRlcHRoKSB7XG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB7XG4gICAgICAgIHRoaXMuX25vZGUucmVxdWVzdFVwZGF0ZSh0aGlzLl9pZCk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLl9wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLl9wcm9qZWN0aW9uVHlwZSA9IENhbWVyYS5QSU5IT0xFX1BST0pFQ1RJT047XG4gICAgdGhpcy5fZm9jYWxEZXB0aCA9IGRlcHRoO1xuICAgIHRoaXMuX25lYXIgPSAwO1xuICAgIHRoaXMuX2ZhciA9IDA7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogR2V0cyBvYmplY3QgY29udGFpbmluZyBzZXJpYWxpemVkIGRhdGEgZm9yIHRoZSBjb21wb25lbnRcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG5lYXIgZGlzdGFuY2UgZnJvbSB0aGUgbmVhciBjbGlwcGluZyBwbGFuZSB0byB0aGUgY2FtZXJhXG4gKiBAcGFyYW0ge051bWJlcn0gZmFyIGRpc3RhbmNlIGZyb20gdGhlIGZhciBjbGlwcGluZyBwbGFuZSB0byB0aGUgY2FtZXJhXG4gKlxuICogQHJldHVybiB7Q2FtZXJhfSB0aGlzXG4gKi9cbkNhbWVyYS5wcm90b3R5cGUuc2V0RnJ1c3R1bSA9IGZ1bmN0aW9uIHNldEZydXN0dW0obmVhciwgZmFyKSB7XG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB7XG4gICAgICAgIHRoaXMuX25vZGUucmVxdWVzdFVwZGF0ZSh0aGlzLl9pZCk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIHRoaXMuX3BlcnNwZWN0aXZlRGlydHkgPSB0cnVlO1xuICAgIHRoaXMuX3Byb2plY3Rpb25UeXBlID0gQ2FtZXJhLkZSVVNUVU1fUFJPSkVDVElPTjtcbiAgICB0aGlzLl9mb2NhbERlcHRoID0gMDtcbiAgICB0aGlzLl9uZWFyID0gbmVhcjtcbiAgICB0aGlzLl9mYXIgPSBmYXI7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogU2V0IHRoZSBDYW1lcmEgdG8gaGF2ZSBvcnRob2dyYXBoaWMgcHJvamVjdGlvblxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtDYW1lcmF9IHRoaXNcbiAqL1xuQ2FtZXJhLnByb3RvdHlwZS5zZXRGbGF0ID0gZnVuY3Rpb24gc2V0RmxhdCgpIHtcbiAgICBpZiAoIXRoaXMuX3JlcXVlc3RpbmdVcGRhdGUpIHtcbiAgICAgICAgdGhpcy5fbm9kZS5yZXF1ZXN0VXBkYXRlKHRoaXMuX2lkKTtcbiAgICAgICAgdGhpcy5fcmVxdWVzdGluZ1VwZGF0ZSA9IHRydWU7XG4gICAgfVxuXG4gICAgdGhpcy5fcGVyc3BlY3RpdmVEaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5fcHJvamVjdGlvblR5cGUgPSBDYW1lcmEuT1JUSE9HUkFQSElDX1BST0pFQ1RJT047XG4gICAgdGhpcy5fZm9jYWxEZXB0aCA9IDA7XG4gICAgdGhpcy5fbmVhciA9IDA7XG4gICAgdGhpcy5fZmFyID0gMDtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBXaGVuIHRoZSBub2RlIHRoaXMgY29tcG9uZW50IGlzIGF0dGFjaGVkIHRvIHVwZGF0ZXMsIHRoZSBDYW1lcmEgd2lsbFxuICogc2VuZCBuZXcgY2FtZXJhIGluZm9ybWF0aW9uIHRvIHRoZSBDb21wb3NpdG9yIHRvIHVwZGF0ZSB0aGUgcmVuZGVyaW5nXG4gKiBvZiB0aGUgc2NlbmUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNhbWVyYS5wcm90b3R5cGUub25VcGRhdGUgPSBmdW5jdGlvbiBvblVwZGF0ZSgpIHtcbiAgICB0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlID0gZmFsc2U7XG5cbiAgICB2YXIgcGF0aCA9IHRoaXMuX25vZGUuZ2V0TG9jYXRpb24oKTtcblxuICAgIHRoaXMuX25vZGVcbiAgICAgICAgLnNlbmREcmF3Q29tbWFuZChDb21tYW5kcy5XSVRIKVxuICAgICAgICAuc2VuZERyYXdDb21tYW5kKHBhdGgpO1xuXG4gICAgaWYgKHRoaXMuX3BlcnNwZWN0aXZlRGlydHkpIHtcbiAgICAgICAgdGhpcy5fcGVyc3BlY3RpdmVEaXJ0eSA9IGZhbHNlO1xuXG4gICAgICAgIHN3aXRjaCAodGhpcy5fcHJvamVjdGlvblR5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgQ2FtZXJhLkZSVVNUVU1fUFJPSkVDVElPTjpcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZChDb21tYW5kcy5GUlVTVFJVTV9QUk9KRUNUSU9OKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl9uZWFyKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl9mYXIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSBDYW1lcmEuUElOSE9MRV9QUk9KRUNUSU9OOlxuICAgICAgICAgICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKENvbW1hbmRzLlBJTkhPTEVfUFJPSkVDVElPTik7XG4gICAgICAgICAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fZm9jYWxEZXB0aCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIENhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTjpcbiAgICAgICAgICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZChDb21tYW5kcy5PUlRIT0dSQVBISUNfUFJPSkVDVElPTik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5fdmlld0RpcnR5KSB7XG4gICAgICAgIHRoaXMuX3ZpZXdEaXJ0eSA9IGZhbHNlO1xuXG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKENvbW1hbmRzLkNIQU5HRV9WSUVXX1RSQU5TRk9STSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMF0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzFdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsyXSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bM10pO1xuXG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNF0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzVdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVs2XSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bN10pO1xuXG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bOF0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzldKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxMF0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzExXSk7XG5cbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxMl0pO1xuICAgICAgICB0aGlzLl9ub2RlLnNlbmREcmF3Q29tbWFuZCh0aGlzLl92aWV3VHJhbnNmb3JtWzEzXSk7XG4gICAgICAgIHRoaXMuX25vZGUuc2VuZERyYXdDb21tYW5kKHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTRdKTtcbiAgICAgICAgdGhpcy5fbm9kZS5zZW5kRHJhd0NvbW1hbmQodGhpcy5fdmlld1RyYW5zZm9ybVsxNV0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogV2hlbiB0aGUgdHJhbnNmb3JtIG9mIHRoZSBub2RlIHRoaXMgY29tcG9uZW50IGlzIGF0dGFjaGVkIHRvXG4gKiBjaGFuZ2VzLCBoYXZlIHRoZSBDYW1lcmEgdXBkYXRlIGl0cyBwcm9qZWN0aW9uIG1hdHJpeCBhbmRcbiAqIGlmIG5lZWRlZCwgZmxhZyB0byBub2RlIHRvIHVwZGF0ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gdHJhbnNmb3JtIGFuIGFycmF5IGRlbm90aW5nIHRoZSB0cmFuc2Zvcm0gbWF0cml4IG9mIHRoZSBub2RlXG4gKlxuICogQHJldHVybiB7Q2FtZXJhfSB0aGlzXG4gKi9cbkNhbWVyYS5wcm90b3R5cGUub25UcmFuc2Zvcm1DaGFuZ2UgPSBmdW5jdGlvbiBvblRyYW5zZm9ybUNoYW5nZSh0cmFuc2Zvcm0pIHtcbiAgICB2YXIgYSA9IHRyYW5zZm9ybTtcbiAgICB0aGlzLl92aWV3RGlydHkgPSB0cnVlO1xuXG4gICAgaWYgKCF0aGlzLl9yZXF1ZXN0aW5nVXBkYXRlKSB7XG4gICAgICAgIHRoaXMuX25vZGUucmVxdWVzdFVwZGF0ZSh0aGlzLl9pZCk7XG4gICAgICAgIHRoaXMuX3JlcXVlc3RpbmdVcGRhdGUgPSB0cnVlO1xuICAgIH1cblxuICAgIHZhciBhMDAgPSBhWzBdLCBhMDEgPSBhWzFdLCBhMDIgPSBhWzJdLCBhMDMgPSBhWzNdLFxuICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgYTIwID0gYVs4XSwgYTIxID0gYVs5XSwgYTIyID0gYVsxMF0sIGEyMyA9IGFbMTFdLFxuICAgIGEzMCA9IGFbMTJdLCBhMzEgPSBhWzEzXSwgYTMyID0gYVsxNF0sIGEzMyA9IGFbMTVdLFxuXG4gICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxuICAgIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCxcbiAgICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXG4gICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxuICAgIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSxcbiAgICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXG4gICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxuICAgIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCxcbiAgICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXG4gICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxuICAgIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSxcbiAgICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsXG5cbiAgICBkZXQgPSAxLyhiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDYpO1xuXG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVswXSA9IChhMTEgKiBiMTEgLSBhMTIgKiBiMTAgKyBhMTMgKiBiMDkpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMV0gPSAoYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzJdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVszXSA9IChhMjIgKiBiMDQgLSBhMjEgKiBiMDUgLSBhMjMgKiBiMDMpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bNF0gPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzVdID0gKGEwMCAqIGIxMSAtIGEwMiAqIGIwOCArIGEwMyAqIGIwNykgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs2XSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bN10gPSAoYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzhdID0gKGExMCAqIGIxMCAtIGExMSAqIGIwOCArIGExMyAqIGIwNikgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVs5XSA9IChhMDEgKiBiMDggLSBhMDAgKiBiMTAgLSBhMDMgKiBiMDYpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTBdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxMV0gPSAoYTIxICogYjAyIC0gYTIwICogYjA0IC0gYTIzICogYjAwKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzEyXSA9IChhMTEgKiBiMDcgLSBhMTAgKiBiMDkgLSBhMTIgKiBiMDYpICogZGV0O1xuICAgIHRoaXMuX3ZpZXdUcmFuc2Zvcm1bMTNdID0gKGEwMCAqIGIwOSAtIGEwMSAqIGIwNyArIGEwMiAqIGIwNikgKiBkZXQ7XG4gICAgdGhpcy5fdmlld1RyYW5zZm9ybVsxNF0gPSAoYTMxICogYjAxIC0gYTMwICogYjAzIC0gYTMyICogYjAwKSAqIGRldDtcbiAgICB0aGlzLl92aWV3VHJhbnNmb3JtWzE1XSA9IChhMjAgKiBiMDMgLSBhMjEgKiBiMDEgKyBhMjIgKiBiMDApICogZGV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW1lcmE7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQW4gZW51bWVyYXRpb24gb2YgdGhlIGNvbW1hbmRzIGluIG91ciBjb21tYW5kIHF1ZXVlLlxuICovXG52YXIgQ29tbWFuZHMgPSB7XG4gICAgSU5JVF9ET006IDAsXG4gICAgRE9NX1JFTkRFUl9TSVpFOiAxLFxuICAgIENIQU5HRV9UUkFOU0ZPUk06IDIsXG4gICAgQ0hBTkdFX1NJWkU6IDMsXG4gICAgQ0hBTkdFX1BST1BFUlRZOiA0LFxuICAgIENIQU5HRV9DT05URU5UOiA1LFxuICAgIENIQU5HRV9BVFRSSUJVVEU6IDYsXG4gICAgQUREX0NMQVNTOiA3LFxuICAgIFJFTU9WRV9DTEFTUzogOCxcbiAgICBTVUJTQ1JJQkU6IDksXG4gICAgR0xfU0VUX0RSQVdfT1BUSU9OUzogMTAsXG4gICAgR0xfQU1CSUVOVF9MSUdIVDogMTEsXG4gICAgR0xfTElHSFRfUE9TSVRJT046IDEyLFxuICAgIEdMX0xJR0hUX0NPTE9SOiAxMyxcbiAgICBNQVRFUklBTF9JTlBVVDogMTQsXG4gICAgR0xfU0VUX0dFT01FVFJZOiAxNSxcbiAgICBHTF9VTklGT1JNUzogMTYsXG4gICAgR0xfQlVGRkVSX0RBVEE6IDE3LFxuICAgIEdMX0NVVE9VVF9TVEFURTogMTgsXG4gICAgR0xfTUVTSF9WSVNJQklMSVRZOiAxOSxcbiAgICBHTF9SRU1PVkVfTUVTSDogMjAsXG4gICAgUElOSE9MRV9QUk9KRUNUSU9OOiAyMSxcbiAgICBPUlRIT0dSQVBISUNfUFJPSkVDVElPTjogMjIsXG4gICAgQ0hBTkdFX1ZJRVdfVFJBTlNGT1JNOiAyMyxcbiAgICBXSVRIOiAyNCxcbiAgICBGUkFNRTogMjUsXG4gICAgRU5HSU5FOiAyNixcbiAgICBTVEFSVDogMjcsXG4gICAgU1RPUDogMjgsXG4gICAgVElNRTogMjksXG4gICAgVFJJR0dFUjogMzAsXG4gICAgTkVFRF9TSVpFX0ZPUjogMzEsXG4gICAgRE9NOiAzMixcbiAgICBSRUFEWTogMzMsXG4gICAgQUxMT1dfREVGQVVMVDogMzQsXG4gICAgUFJFVkVOVF9ERUZBVUxUOiAzNVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb21tYW5kcztcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSBjb2xsZWN0aW9uIG9mIHV0aWxpdGllcyBmb3IgaGFuZGxpbmcgcGF0aHMuXG4gKlxuICogQGNsYXNzXG4gKi9cbmZ1bmN0aW9uIFBhdGhVdGlscyAoKSB7XG59XG5cbi8qKlxuICogZGV0ZXJtaW5lcyBpZiB0aGUgcGFzc2VkIGluIHBhdGggaGFzIGEgdHJhaWxpbmcgc2xhc2guIFBhdGhzIG9mIHRoZSBmb3JtXG4gKiAnYm9keS8wLzEvJyByZXR1cm4gdHJ1ZSwgd2hpbGUgcGF0aHMgb2YgdGhlIGZvcm0gJ2JvZHkvMC8xJyByZXR1cm4gZmFsc2UuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoXG4gKlxuICogQHJldHVybiB7Qm9vbGVhbn0gd2hldGhlciBvciBub3QgdGhlIHBhdGggaGFzIGEgdHJhaWxpbmcgc2xhc2hcbiAqL1xuUGF0aFV0aWxzLnByb3RvdHlwZS5oYXNUcmFpbGluZ1NsYXNoID0gZnVuY3Rpb24gaGFzVHJhaWxpbmdTbGFzaCAocGF0aCkge1xuICAgIHJldHVybiBwYXRoW3BhdGgubGVuZ3RoIC0gMV0gPT09ICcvJztcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZGVwdGggaW4gdGhlIHRyZWUgdGhpcyBwYXRoIHJlcHJlc2VudHMuIEVzc2VudGlhbGx5IGNvdW50c1xuICogdGhlIHNsYXNoZXMgaWdub3JpbmcgYSB0cmFpbGluZyBzbGFzaC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGhcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IHRoZSBkZXB0aCBpbiB0aGUgdHJlZSB0aGF0IHRoaXMgcGF0aCByZXByZXNlbnRzXG4gKi9cblBhdGhVdGlscy5wcm90b3R5cGUuZGVwdGggPSBmdW5jdGlvbiBkZXB0aCAocGF0aCkge1xuICAgIHZhciBjb3VudCA9IDA7XG4gICAgdmFyIGxlbmd0aCA9IHBhdGgubGVuZ3RoO1xuICAgIHZhciBsZW4gPSB0aGlzLmhhc1RyYWlsaW5nU2xhc2gocGF0aCkgPyBsZW5ndGggLSAxIDogbGVuZ3RoO1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykgY291bnQgKz0gcGF0aFtpXSA9PT0gJy8nID8gMSA6IDA7XG4gICAgcmV0dXJuIGNvdW50O1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBwb3NpdGlvbiBvZiB0aGlzIHBhdGggaW4gcmVsYXRpb24gdG8gaXRzIHNpYmxpbmdzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCB0aGUgcGF0aFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGhlIGluZGV4IG9mIHRoaXMgcGF0aCBpbiByZWxhdGlvbiB0byBpdHMgc2libGluZ3MuXG4gKi9cblBhdGhVdGlscy5wcm90b3R5cGUuaW5kZXggPSBmdW5jdGlvbiBpbmRleCAocGF0aCkge1xuICAgIHZhciBsZW5ndGggPSBwYXRoLmxlbmd0aDtcbiAgICB2YXIgbGVuID0gdGhpcy5oYXNUcmFpbGluZ1NsYXNoKHBhdGgpID8gbGVuZ3RoIC0gMSA6IGxlbmd0aDtcbiAgICB3aGlsZSAobGVuLS0pIGlmIChwYXRoW2xlbl0gPT09ICcvJykgYnJlYWs7XG4gICAgdmFyIHJlc3VsdCA9IHBhcnNlSW50KHBhdGguc3Vic3RyaW5nKGxlbiArIDEpKTtcbiAgICByZXR1cm4gaXNOYU4ocmVzdWx0KSA/IDAgOiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEdldHMgdGhlIHBvc2l0aW9uIG9mIHRoZSBwYXRoIGF0IGEgcGFydGljdWxhciBicmVhZHRoIGluIHJlbGF0aW9uc2hpcFxuICogdG8gaXRzIHNpYmxpbmdzXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoXG4gKiBAcGFyYW0ge051bWJlcn0gZGVwdGggdGhlIGJyZWFkdGggYXQgd2hpY2ggdG8gZmluZCB0aGUgaW5kZXhcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGluZGV4IGF0IHRoZSBwYXJ0aWN1bGFyIGRlcHRoXG4gKi9cblBhdGhVdGlscy5wcm90b3R5cGUuaW5kZXhBdERlcHRoID0gZnVuY3Rpb24gaW5kZXhBdERlcHRoIChwYXRoLCBkZXB0aCkge1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgbGVuID0gcGF0aC5sZW5ndGg7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICBmb3IgKDsgaSA8IGxlbiA7IGkrKykge1xuICAgICAgICBpZiAocGF0aFtpXSA9PT0gJy8nKSBpbmRleCsrO1xuICAgICAgICBpZiAoaW5kZXggPT09IGRlcHRoKSB7XG4gICAgICAgICAgICBwYXRoID0gcGF0aC5zdWJzdHJpbmcoaSA/IGkgKyAxIDogaSk7XG4gICAgICAgICAgICBpbmRleCA9IHBhdGguaW5kZXhPZignLycpO1xuICAgICAgICAgICAgcGF0aCA9IGluZGV4ID09PSAtMSA/IHBhdGggOiBwYXRoLnN1YnN0cmluZygwLCBpbmRleCk7XG4gICAgICAgICAgICBpbmRleCA9IHBhcnNlSW50KHBhdGgpO1xuICAgICAgICAgICAgcmV0dXJuIGlzTmFOKGluZGV4KSA/IHBhdGggOiBpbmRleDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbi8qKlxuICogcmV0dXJucyB0aGUgcGF0aCBvZiB0aGUgcGFzc2VkIGluIHBhdGgncyBwYXJlbnQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIHRoZSBwYXRoXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSB0aGUgcGF0aCBvZiB0aGUgcGFzc2VkIGluIHBhdGgncyBwYXJlbnRcbiAqL1xuUGF0aFV0aWxzLnByb3RvdHlwZS5wYXJlbnQgPSBmdW5jdGlvbiBwYXJlbnQgKHBhdGgpIHtcbiAgICByZXR1cm4gcGF0aC5zdWJzdHJpbmcoMCwgcGF0aC5sYXN0SW5kZXhPZignLycsIHBhdGgubGVuZ3RoIC0gMikpO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgb3Igbm90IHRoZSBmaXJzdCBhcmd1bWVudCBwYXRoIGlzIHRoZSBkaXJlY3QgY2hpbGRcbiAqIG9mIHRoZSBzZWNvbmQgYXJndW1lbnQgcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNoaWxkIHRoZSBwYXRoIHRoYXQgbWF5IGJlIGEgY2hpbGRcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJlbnQgdGhlIHBhdGggdGhhdCBtYXkgYmUgYSBwYXJlbnRcbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSB3aGV0aGVyIG9yIG5vdCB0aGUgZmlyc3QgYXJndW1lbnQgcGF0aCBpcyBhIGNoaWxkIG9mIHRoZSBzZWNvbmQgYXJndW1lbnQgcGF0aFxuICovXG5QYXRoVXRpbHMucHJvdG90eXBlLmlzQ2hpbGRPZiA9IGZ1bmN0aW9uIGlzQ2hpbGRPZiAoY2hpbGQsIHBhcmVudCkge1xuICAgIHJldHVybiB0aGlzLmlzRGVzY2VuZGVudE9mKGNoaWxkLCBwYXJlbnQpICYmIHRoaXMuZGVwdGgoY2hpbGQpID09PSB0aGlzLmRlcHRoKHBhcmVudCkgKyAxO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGZpcnN0IGFyZ3VtZW50IHBhdGggaXMgYSBkZXNjZW5kZW50IG9mIHRoZSBzZWNvbmQgYXJndW1lbnQgcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGNoaWxkIHBvdGVudGlhbCBkZXNjZW5kZW50IHBhdGhcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXJlbnQgcG90ZW50aWFsIGFuY2VzdG9yIHBhdGhcbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSB3aGV0aGVyIG9yIG5vdCB0aGUgcGF0aCBpcyBhIGRlc2NlbmRlbnRcbiAqL1xuUGF0aFV0aWxzLnByb3RvdHlwZS5pc0Rlc2NlbmRlbnRPZiA9IGZ1bmN0aW9uIGlzRGVzY2VuZGVudE9mKGNoaWxkLCBwYXJlbnQpIHtcbiAgICBpZiAoY2hpbGQgPT09IHBhcmVudCkgcmV0dXJuIGZhbHNlO1xuICAgIGNoaWxkID0gdGhpcy5oYXNUcmFpbGluZ1NsYXNoKGNoaWxkKSA/IGNoaWxkIDogY2hpbGQgKyAnLyc7XG4gICAgcGFyZW50ID0gdGhpcy5oYXNUcmFpbGluZ1NsYXNoKHBhcmVudCkgPyBwYXJlbnQgOiBwYXJlbnQgKyAnLyc7XG4gICAgcmV0dXJuIHRoaXMuZGVwdGgocGFyZW50KSA8IHRoaXMuZGVwdGgoY2hpbGQpICYmIGNoaWxkLmluZGV4T2YocGFyZW50KSA9PT0gMDtcbn07XG5cbi8qKlxuICogcmV0dXJucyB0aGUgc2VsZWN0b3IgcG9ydGlvbiBvZiB0aGUgcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggdGhlIHBhdGhcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHRoZSBzZWxlY3RvciBwb3J0aW9uIG9mIHRoZSBwYXRoLlxuICovXG5QYXRoVXRpbHMucHJvdG90eXBlLmdldFNlbGVjdG9yID0gZnVuY3Rpb24gZ2V0U2VsZWN0b3IocGF0aCkge1xuICAgIHZhciBpbmRleCA9IHBhdGguaW5kZXhPZignLycpO1xuICAgIHJldHVybiBpbmRleCA9PT0gLTEgPyBwYXRoIDogcGF0aC5zdWJzdHJpbmcoMCwgaW5kZXgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBuZXcgUGF0aFV0aWxzKCk7XG5cbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEVsZW1lbnRDYWNoZSA9IHJlcXVpcmUoJy4vRWxlbWVudENhY2hlJyk7XG52YXIgbWF0aCA9IHJlcXVpcmUoJy4vTWF0aCcpO1xudmFyIFBhdGhVdGlscyA9IHJlcXVpcmUoJy4uL2NvcmUvUGF0aCcpO1xudmFyIHZlbmRvclByZWZpeCA9IHJlcXVpcmUoJy4uL3V0aWxpdGllcy92ZW5kb3JQcmVmaXgnKTtcbnZhciBldmVudE1hcCA9IHJlcXVpcmUoJy4vZXZlbnRzL0V2ZW50TWFwJyk7XG5cbnZhciBUUkFOU0ZPUk0gPSBudWxsO1xuXG4vKipcbiAqIERPTVJlbmRlcmVyIGlzIGEgY2xhc3MgcmVzcG9uc2libGUgZm9yIGFkZGluZyBlbGVtZW50c1xuICogdG8gdGhlIERPTSBhbmQgd3JpdGluZyB0byB0aG9zZSBlbGVtZW50cy5cbiAqIFRoZXJlIGlzIGEgRE9NUmVuZGVyZXIgcGVyIGNvbnRleHQsIHJlcHJlc2VudGVkIGFzIGFuXG4gKiBlbGVtZW50IGFuZCBhIHNlbGVjdG9yLiBJdCBpcyBpbnN0YW50aWF0ZWQgaW4gdGhlXG4gKiBjb250ZXh0IGNsYXNzLlxuICpcbiAqIEBjbGFzcyBET01SZW5kZXJlclxuICpcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsZW1lbnQgYW4gZWxlbWVudC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzZWxlY3RvciB0aGUgc2VsZWN0b3Igb2YgdGhlIGVsZW1lbnQuXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgdGhlIGNvbXBvc2l0b3IgY29udHJvbGxpbmcgdGhlIHJlbmRlcmVyXG4gKi9cbmZ1bmN0aW9uIERPTVJlbmRlcmVyIChlbGVtZW50LCBzZWxlY3RvciwgY29tcG9zaXRvcikge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICBlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2ZhbW91cy1kb20tcmVuZGVyZXInKTtcblxuICAgIFRSQU5TRk9STSA9IFRSQU5TRk9STSB8fCB2ZW5kb3JQcmVmaXgoJ3RyYW5zZm9ybScpO1xuICAgIHRoaXMuX2NvbXBvc2l0b3IgPSBjb21wb3NpdG9yOyAvLyBhIHJlZmVyZW5jZSB0byB0aGUgY29tcG9zaXRvclxuXG4gICAgdGhpcy5fdGFyZ2V0ID0gbnVsbDsgLy8gYSByZWdpc3RlciBmb3IgaG9sZGluZyB0aGUgY3VycmVudFxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGVsZW1lbnQgdGhhdCB0aGUgUmVuZGVyZXIgaXMgb3BlcmF0aW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBvblxuXG4gICAgdGhpcy5fcGFyZW50ID0gbnVsbDsgLy8gYSByZWdpc3RlciBmb3IgaG9sZGluZyB0aGUgcGFyZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgLy8gb2YgdGhlIHRhcmdldFxuXG4gICAgdGhpcy5fcGF0aCA9IG51bGw7IC8vIGEgcmVnaXN0ZXIgZm9yIGhvbGRpbmcgdGhlIHBhdGggb2YgdGhlIHRhcmdldFxuICAgICAgICAgICAgICAgICAgICAgICAvLyB0aGlzIHJlZ2lzdGVyIG11c3QgYmUgc2V0IGZpcnN0LCBhbmQgdGhlblxuICAgICAgICAgICAgICAgICAgICAgICAvLyBjaGlsZHJlbiwgdGFyZ2V0LCBhbmQgcGFyZW50IGFyZSBhbGwgbG9va2VkXG4gICAgICAgICAgICAgICAgICAgICAgIC8vIHVwIGZyb20gdGhhdC5cblxuICAgIHRoaXMuX2NoaWxkcmVuID0gW107IC8vIGEgcmVnaXN0ZXIgZm9yIGhvbGRpbmcgdGhlIGNoaWxkcmVuIG9mIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGN1cnJlbnQgdGFyZ2V0LlxuXG4gICAgdGhpcy5fcm9vdCA9IG5ldyBFbGVtZW50Q2FjaGUoZWxlbWVudCwgc2VsZWN0b3IpOyAvLyB0aGUgcm9vdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gb2YgdGhlIGRvbSB0cmVlIHRoYXQgdGhpc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVuZGVyZXIgaXMgcmVzcG9uc2libGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZvclxuXG4gICAgdGhpcy5fYm91bmRUcmlnZ2VyRXZlbnQgPSBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgcmV0dXJuIF90aGlzLl90cmlnZ2VyRXZlbnQoZXYpO1xuICAgIH07XG5cbiAgICB0aGlzLl9zZWxlY3RvciA9IHNlbGVjdG9yO1xuXG4gICAgdGhpcy5fZWxlbWVudHMgPSB7fTtcblxuICAgIHRoaXMuX2VsZW1lbnRzW3NlbGVjdG9yXSA9IHRoaXMuX3Jvb3Q7XG5cbiAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuICAgIHRoaXMuX1ZQdHJhbnNmb3JtID0gbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pO1xuXG4gICAgdGhpcy5fbGFzdEV2ID0gbnVsbDtcbn1cblxuXG4vKipcbiAqIEF0dGFjaGVzIGFuIEV2ZW50TGlzdGVuZXIgdG8gdGhlIGVsZW1lbnQgYXNzb2NpYXRlZCB3aXRoIHRoZSBwYXNzZWQgaW4gcGF0aC5cbiAqIFByZXZlbnRzIHRoZSBkZWZhdWx0IGJyb3dzZXIgYWN0aW9uIG9uIGFsbCBzdWJzZXF1ZW50IGV2ZW50cyBpZlxuICogYHByZXZlbnREZWZhdWx0YCBpcyB0cnV0aHkuXG4gKiBBbGwgaW5jb21pbmcgZXZlbnRzIHdpbGwgYmUgZm9yd2FyZGVkIHRvIHRoZSBjb21wb3NpdG9yIGJ5IGludm9raW5nIHRoZVxuICogYHNlbmRFdmVudGAgbWV0aG9kLlxuICogRGVsZWdhdGVzIGV2ZW50cyBpZiBwb3NzaWJsZSBieSBhdHRhY2hpbmcgdGhlIGV2ZW50IGxpc3RlbmVyIHRvIHRoZSBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBET00gZXZlbnQgdHlwZSAoZS5nLiBjbGljaywgbW91c2VvdmVyKS5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gcHJldmVudERlZmF1bHQgV2hldGhlciBvciBub3QgdGhlIGRlZmF1bHQgYnJvd3NlciBhY3Rpb24gc2hvdWxkIGJlIHByZXZlbnRlZC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc3Vic2NyaWJlID0gZnVuY3Rpb24gc3Vic2NyaWJlKHR5cGUpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcbiAgICB0aGlzLl9saXN0ZW4odHlwZSk7XG4gICAgdGhpcy5fdGFyZ2V0LnN1YnNjcmliZVt0eXBlXSA9IHRydWU7XG59O1xuXG4vKipcbiAqIFVuc3Vic2NyaWJlcyBmcm9tIGFsbCBldmVudHMgdGhhdCBhcmUgb2YgdGhlIHNwZWNpZmllZCB0eXBlLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHR5cGUgICAgRXZlbnQgdHlwZSB0byB1bnN1YnNjcmliZSBmcm9tLlxuICogQHJldHVybiB7dW5kZWZpbmVkfSAgICAgIHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiB1bnN1YnNjcmliZSh0eXBlKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5fbGlzdGVuKHR5cGUpO1xuICAgIHRoaXMuX3RhcmdldC5zdWJzY3JpYmVbdHlwZV0gPSBmYWxzZTtcbn07XG5cbi8qKlxuICogVXNlZCB0byBwcmV2ZW50RGVmYXVsdCBpZiBhbiBldmVudCBvZiB0aGUgc3BlY2lmaWVkIHR5cGUgaXMgYmVpbmcgZW1pdHRlZCBvblxuICogdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHR5cGUgICAgVGhlIHR5cGUgb2YgZXZlbnRzIHRoYXQgc2hvdWxkIGJlIHByZXZlbnRlZC5cbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gICAgICB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gcHJldmVudERlZmF1bHQodHlwZSkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX2xpc3Rlbih0eXBlKTtcbiAgICB0aGlzLl90YXJnZXQucHJldmVudERlZmF1bHRbdHlwZV0gPSB0cnVlO1xufTtcblxuLyoqXG4gKiBVc2VkIHRvIHVuZG8gYSBwcmV2aW91cyBjYWxsIHRvIHByZXZlbnREZWZhdWx0LiBObyBsb25nZXIgYHByZXZlbnREZWZhdWx0YFxuICogZm9yIHRoaXMgZXZlbnQgb24gdGhlIGxvYWRlZCB0YXJnZXQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHR5cGUgICAgVGhlIGV2ZW50IHR5cGUgdGhhdCBzaG91bGQgbm8gbG9uZ2VyIGJlIGFmZmVjdGVkIGJ5XG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgYHByZXZlbnREZWZhdWx0YC5cbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gICAgICB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLmFsbG93RGVmYXVsdCA9IGZ1bmN0aW9uIGFsbG93RGVmYXVsdCh0eXBlKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5fbGlzdGVuKHR5cGUpO1xuICAgIHRoaXMuX3RhcmdldC5wcmV2ZW50RGVmYXVsdFt0eXBlXSA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgZnVuY3Rpb24gdXNlZCBmb3IgYWRkaW5nIGFuIGV2ZW50IGxpc3RlbmVyIGZvciB0aGUgdGhlXG4gKiBjdXJyZW50bHkgbG9hZGVkIEVsZW1lbnRDYWNoZS5cbiAqXG4gKiBJZiB0aGUgZXZlbnQgY2FuIGJlIGRlbGVnYXRlZCBhcyBzcGVjaWZpZWQgaW4gdGhlIHtAbGluayBFdmVudE1hcH0sIHRoZVxuICogYm91bmQge0BsaW5rIF90cmlnZ2VyRXZlbnR9IGZ1bmN0aW9uIHdpbGwgYmUgYWRkZWQgYXMgYSBsaXN0ZW5lciBvbiB0aGVcbiAqIHJvb3QgZWxlbWVudC4gT3RoZXJ3aXNlLCB0aGUgbGlzdGVuZXIgd2lsbCBiZSBhZGRlZCBkaXJlY3RseSB0byB0aGUgdGFyZ2V0XG4gKiBlbGVtZW50LlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSB0eXBlICAgIFRoZSBldmVudCB0eXBlIHRvIGxpc3RlbiB0byAoZS5nLiBjbGljaykuXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9ICAgICAgdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5fbGlzdGVuID0gZnVuY3Rpb24gX2xpc3Rlbih0eXBlKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICBpZiAoXG4gICAgICAgICF0aGlzLl90YXJnZXQubGlzdGVuZXJzW3R5cGVdICYmICF0aGlzLl9yb290Lmxpc3RlbmVyc1t0eXBlXVxuICAgICkge1xuICAgICAgICAvLyBGSVhNRSBBZGQgdG8gY29udGVudCBESVYgaWYgYXZhaWxhYmxlXG4gICAgICAgIHZhciB0YXJnZXQgPSBldmVudE1hcFt0eXBlXVsxXSA/IHRoaXMuX3Jvb3QgOiB0aGlzLl90YXJnZXQ7XG4gICAgICAgIHRhcmdldC5saXN0ZW5lcnNbdHlwZV0gPSB0aGlzLl9ib3VuZFRyaWdnZXJFdmVudDtcbiAgICAgICAgdGFyZ2V0LmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCB0aGlzLl9ib3VuZFRyaWdnZXJFdmVudCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZW1vdmVzIGFuIEV2ZW50TGlzdGVuZXIgb2YgZ2l2ZW4gdHlwZSBmcm9tIHRoZSBlbGVtZW50IG9uIHdoaWNoIGl0IHdhc1xuICogcmVnaXN0ZXJlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHR5cGUgRE9NIGV2ZW50IHR5cGUgKGUuZy4gY2xpY2ssIG1vdXNlb3ZlcikuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnVuc3Vic2NyaWJlID0gZnVuY3Rpb24gdW5zdWJzY3JpYmUodHlwZSkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX3RhcmdldC5zdWJzY3JpYmVbdHlwZV0gPSBmYWxzZTtcbn07XG5cbi8qKlxuICogRnVuY3Rpb24gdG8gYmUgYWRkZWQgdXNpbmcgYGFkZEV2ZW50TGlzdGVuZXJgIHRvIHRoZSBjb3JyZXNwb25kaW5nXG4gKiBET01FbGVtZW50LlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgRE9NIEV2ZW50IHBheWxvYWRcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuX3RyaWdnZXJFdmVudCA9IGZ1bmN0aW9uIF90cmlnZ2VyRXZlbnQoZXYpIHtcbiAgICBpZiAodGhpcy5fbGFzdEV2ID09PSBldikgcmV0dXJuO1xuXG4gICAgLy8gVXNlIGV2LnBhdGgsIHdoaWNoIGlzIGFuIGFycmF5IG9mIEVsZW1lbnRzIChwb2x5ZmlsbGVkIGlmIG5lZWRlZCkuXG4gICAgdmFyIGV2UGF0aCA9IGV2LnBhdGggPyBldi5wYXRoIDogX2dldFBhdGgoZXYpO1xuICAgIC8vIEZpcnN0IGVsZW1lbnQgaW4gdGhlIHBhdGggaXMgdGhlIGVsZW1lbnQgb24gd2hpY2ggdGhlIGV2ZW50IGhhcyBhY3R1YWxseVxuICAgIC8vIGJlZW4gZW1pdHRlZC5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV2UGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgICAvLyBTa2lwIG5vZGVzIHRoYXQgZG9uJ3QgaGF2ZSBhIGRhdGFzZXQgcHJvcGVydHkgb3IgZGF0YS1mYS1wYXRoXG4gICAgICAgIC8vIGF0dHJpYnV0ZS5cbiAgICAgICAgaWYgKCFldlBhdGhbaV0uZGF0YXNldCkgY29udGludWU7XG4gICAgICAgIHZhciBwYXRoID0gZXZQYXRoW2ldLmRhdGFzZXQuZmFQYXRoO1xuICAgICAgICBpZiAoIXBhdGgpIGNvbnRpbnVlO1xuXG4gICAgICAgIC8vIE9wdGlvbmFsbHkgcHJldmVudERlZmF1bHQuIFRoaXMgbmVlZHMgZm9ydGhlciBjb25zaWRlcmF0aW9uIGFuZFxuICAgICAgICAvLyBzaG91bGQgYmUgb3B0aW9uYWwuIEV2ZW50dWFsbHkgdGhpcyBzaG91bGQgYmUgYSBzZXBhcmF0ZSBjb21tYW5kL1xuICAgICAgICAvLyBtZXRob2QuXG4gICAgICAgIGlmICh0aGlzLl9lbGVtZW50c1twYXRoXS5wcmV2ZW50RGVmYXVsdFtldi50eXBlXSkge1xuICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0b3AgZnVydGhlciBldmVudCBwcm9wb2dhdGlvbiBhbmQgcGF0aCB0cmF2ZXJzYWwgYXMgc29vbiBhcyB0aGVcbiAgICAgICAgLy8gZmlyc3QgRWxlbWVudENhY2hlIHN1YnNjcmliaW5nIGZvciB0aGUgZW1pdHRlZCBldmVudCBoYXMgYmVlbiBmb3VuZC5cbiAgICAgICAgaWYgKHRoaXMuX2VsZW1lbnRzW3BhdGhdICYmIHRoaXMuX2VsZW1lbnRzW3BhdGhdLnN1YnNjcmliZVtldi50eXBlXSkge1xuICAgICAgICAgICAgdGhpcy5fbGFzdEV2ID0gZXY7XG5cbiAgICAgICAgICAgIHZhciBOb3JtYWxpemVkRXZlbnRDb25zdHJ1Y3RvciA9IGV2ZW50TWFwW2V2LnR5cGVdWzBdO1xuXG4gICAgICAgICAgICAvLyBGaW5hbGx5IHNlbmQgdGhlIGV2ZW50IHRvIHRoZSBXb3JrZXIgVGhyZWFkIHRocm91Z2ggdGhlXG4gICAgICAgICAgICAvLyBjb21wb3NpdG9yLlxuICAgICAgICAgICAgdGhpcy5fY29tcG9zaXRvci5zZW5kRXZlbnQocGF0aCwgZXYudHlwZSwgbmV3IE5vcm1hbGl6ZWRFdmVudENvbnN0cnVjdG9yKGV2KSk7XG5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuXG4vKipcbiAqIGdldFNpemVPZiBnZXRzIHRoZSBkb20gc2l6ZSBvZiBhIHBhcnRpY3VsYXIgRE9NIGVsZW1lbnQuICBUaGlzIGlzXG4gKiBuZWVkZWQgZm9yIHJlbmRlciBzaXppbmcgaW4gdGhlIHNjZW5lIGdyYXBoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBwYXRoIG9mIHRoZSBOb2RlIGluIHRoZSBzY2VuZSBncmFwaFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBhIHZlYzMgb2YgdGhlIG9mZnNldCBzaXplIG9mIHRoZSBkb20gZWxlbWVudFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuZ2V0U2l6ZU9mID0gZnVuY3Rpb24gZ2V0U2l6ZU9mKHBhdGgpIHtcbiAgICB2YXIgZWxlbWVudCA9IHRoaXMuX2VsZW1lbnRzW3BhdGhdO1xuICAgIGlmICghZWxlbWVudCkgcmV0dXJuIG51bGw7XG5cbiAgICB2YXIgcmVzID0ge3ZhbDogZWxlbWVudC5zaXplfTtcbiAgICB0aGlzLl9jb21wb3NpdG9yLnNlbmRFdmVudChwYXRoLCAncmVzaXplJywgcmVzKTtcbiAgICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gX2dldFBhdGgoZXYpIHtcbiAgICAvLyBUT0RPIG1vdmUgaW50byBfdHJpZ2dlckV2ZW50LCBhdm9pZCBvYmplY3QgYWxsb2NhdGlvblxuICAgIHZhciBwYXRoID0gW107XG4gICAgdmFyIG5vZGUgPSBldi50YXJnZXQ7XG4gICAgd2hpbGUgKG5vZGUgIT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgcGF0aC5wdXNoKG5vZGUpO1xuICAgICAgICBub2RlID0gbm9kZS5wYXJlbnROb2RlO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbn1cblxuLyoqXG4gKiBFeGVjdXRlcyB0aGUgcmV0cmlldmVkIGRyYXcgY29tbWFuZHMuIERyYXcgY29tbWFuZHMgb25seSByZWZlciB0byB0aGVcbiAqIGNyb3NzLWJyb3dzZXIgbm9ybWFsaXplZCBgdHJhbnNmb3JtYCBwcm9wZXJ0eS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIGRlc2NyaXB0aW9uXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiBkcmF3KHJlbmRlclN0YXRlKSB7XG4gICAgaWYgKHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlRGlydHkpIHtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZURpcnR5ID0gdHJ1ZTtcblxuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzBdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMF07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsyXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzJdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzNdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bM107XG5cbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs0XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzRdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzVdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNV07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bNl0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs2XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs3XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzddO1xuXG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bOF0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs4XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVs5XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzldO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEwXSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzEwXTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV07XG5cbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMl0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMl07XG4gICAgICAgIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTNdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTNdO1xuICAgICAgICB0aGlzLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzE0XSA9IHJlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzE0XTtcbiAgICAgICAgdGhpcy5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNV0gPSByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxNV07XG4gICAgfVxuXG4gICAgaWYgKHJlbmRlclN0YXRlLnZpZXdEaXJ0eSB8fCByZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZURpcnR5KSB7XG4gICAgICAgIG1hdGgubXVsdGlwbHkodGhpcy5fVlB0cmFuc2Zvcm0sIHRoaXMucGVyc3BlY3RpdmVUcmFuc2Zvcm0sIHJlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm0pO1xuICAgICAgICB0aGlzLl9yb290LmVsZW1lbnQuc3R5bGVbVFJBTlNGT1JNXSA9IHRoaXMuX3N0cmluZ2lmeU1hdHJpeCh0aGlzLl9WUHRyYW5zZm9ybSk7XG4gICAgfVxufTtcblxuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGEgcGF0aCBpcyBjdXJyZW50bHkgbG9hZGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRQYXRoTG9hZGVkID0gZnVuY3Rpb24gX2Fzc2VyUGF0aExvYWRlZCgpIHtcbiAgICBpZiAoIXRoaXMuX3BhdGgpIHRocm93IG5ldyBFcnJvcigncGF0aCBub3QgbG9hZGVkJyk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB1c2VkIGZvciBlbnN1cmluZyB0aGF0IGEgcGFyZW50IGlzIGN1cnJlbnRseSBsb2FkZWQuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuX2Fzc2VydFBhcmVudExvYWRlZCA9IGZ1bmN0aW9uIF9hc3NlcnRQYXJlbnRMb2FkZWQoKSB7XG4gICAgaWYgKCF0aGlzLl9wYXJlbnQpIHRocm93IG5ldyBFcnJvcigncGFyZW50IG5vdCBsb2FkZWQnKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGVuc3VyaW5nIHRoYXQgY2hpbGRyZW4gYXJlIGN1cnJlbnRseVxuICogbG9hZGVkLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRDaGlsZHJlbkxvYWRlZCA9IGZ1bmN0aW9uIF9hc3NlcnRDaGlsZHJlbkxvYWRlZCgpIHtcbiAgICBpZiAoIXRoaXMuX2NoaWxkcmVuKSB0aHJvdyBuZXcgRXJyb3IoJ2NoaWxkcmVuIG5vdCBsb2FkZWQnKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGVuc3VyaW5nIHRoYXQgYSB0YXJnZXQgaXMgY3VycmVudGx5IGxvYWRlZC5cbiAqXG4gKiBAbWV0aG9kICBfYXNzZXJ0VGFyZ2V0TG9hZGVkXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9hc3NlcnRUYXJnZXRMb2FkZWQgPSBmdW5jdGlvbiBfYXNzZXJ0VGFyZ2V0TG9hZGVkKCkge1xuICAgIGlmICghdGhpcy5fdGFyZ2V0KSB0aHJvdyBuZXcgRXJyb3IoJ05vIHRhcmdldCBsb2FkZWQnKTtcbn07XG5cbi8qKlxuICogRmluZHMgYW5kIHNldHMgdGhlIHBhcmVudCBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCBlbGVtZW50IChwYXRoKS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge0VsZW1lbnRDYWNoZX0gUGFyZW50IGVsZW1lbnQuXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5maW5kUGFyZW50ID0gZnVuY3Rpb24gZmluZFBhcmVudCAoKSB7XG4gICAgdGhpcy5fYXNzZXJ0UGF0aExvYWRlZCgpO1xuXG4gICAgdmFyIHBhdGggPSB0aGlzLl9wYXRoO1xuICAgIHZhciBwYXJlbnQ7XG5cbiAgICB3aGlsZSAoIXBhcmVudCAmJiBwYXRoLmxlbmd0aCkge1xuICAgICAgICBwYXRoID0gcGF0aC5zdWJzdHJpbmcoMCwgcGF0aC5sYXN0SW5kZXhPZignLycpKTtcbiAgICAgICAgcGFyZW50ID0gdGhpcy5fZWxlbWVudHNbcGF0aF07XG4gICAgfVxuICAgIHRoaXMuX3BhcmVudCA9IHBhcmVudDtcbiAgICByZXR1cm4gcGFyZW50O1xufTtcblxuLyoqXG4gKiBVc2VkIGZvciBkZXRlcm1pbmluZyB0aGUgdGFyZ2V0IGxvYWRlZCB1bmRlciB0aGUgY3VycmVudCBwYXRoLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtFbGVtZW50Q2FjaGV8dW5kZWZpbmVkfSBFbGVtZW50IGxvYWRlZCB1bmRlciBkZWZpbmVkIHBhdGguXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5maW5kVGFyZ2V0ID0gZnVuY3Rpb24gZmluZFRhcmdldCgpIHtcbiAgICB0aGlzLl90YXJnZXQgPSB0aGlzLl9lbGVtZW50c1t0aGlzLl9wYXRoXTtcbiAgICByZXR1cm4gdGhpcy5fdGFyZ2V0O1xufTtcblxuXG4vKipcbiAqIExvYWRzIHRoZSBwYXNzZWQgaW4gcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB0byBiZSBsb2FkZWRcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IExvYWRlZCBwYXRoXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5sb2FkUGF0aCA9IGZ1bmN0aW9uIGxvYWRQYXRoIChwYXRoKSB7XG4gICAgdGhpcy5fcGF0aCA9IHBhdGg7XG4gICAgcmV0dXJuIHRoaXMuX3BhdGg7XG59O1xuXG4vKipcbiAqIEZpbmRzIGNoaWxkcmVuIG9mIGEgcGFyZW50IGVsZW1lbnQgdGhhdCBhcmUgZGVzY2VuZGVudHMgb2YgYSBpbnNlcnRlZCBlbGVtZW50IGluIHRoZSBzY2VuZVxuICogZ3JhcGguIEFwcGVuZHMgdGhvc2UgY2hpbGRyZW4gdG8gdGhlIGluc2VydGVkIGVsZW1lbnQuXG4gKlxuICogQG1ldGhvZCByZXNvbHZlQ2hpbGRyZW5cbiAqIEByZXR1cm4ge3ZvaWR9XG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxlbWVudCB0aGUgaW5zZXJ0ZWQgZWxlbWVudFxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gcGFyZW50IHRoZSBwYXJlbnQgb2YgdGhlIGluc2VydGVkIGVsZW1lbnRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnJlc29sdmVDaGlsZHJlbiA9IGZ1bmN0aW9uIHJlc29sdmVDaGlsZHJlbiAoZWxlbWVudCwgcGFyZW50KSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBjaGlsZE5vZGU7XG4gICAgdmFyIHBhdGggPSB0aGlzLl9wYXRoO1xuICAgIHZhciBjaGlsZFBhdGg7XG5cbiAgICB3aGlsZSAoKGNoaWxkTm9kZSA9IHBhcmVudC5jaGlsZE5vZGVzW2ldKSkge1xuICAgICAgICBpZiAoIWNoaWxkTm9kZS5kYXRhc2V0KSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBjaGlsZFBhdGggPSBjaGlsZE5vZGUuZGF0YXNldC5mYVBhdGg7XG4gICAgICAgIGlmICghY2hpbGRQYXRoKSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoUGF0aFV0aWxzLmlzRGVzY2VuZGVudE9mKGNoaWxkUGF0aCwgcGF0aCkpIGVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGROb2RlKTtcbiAgICAgICAgZWxzZSBpKys7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbnNlcnRzIGEgRE9NRWxlbWVudCBhdCB0aGUgY3VycmVudGx5IGxvYWRlZCBwYXRoLCBhc3N1bWluZyBubyB0YXJnZXQgaXNcbiAqIGxvYWRlZC4gT25seSBvbmUgRE9NRWxlbWVudCBjYW4gYmUgYXNzb2NpYXRlZCB3aXRoIGVhY2ggcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHRhZ05hbWUgVGFnIG5hbWUgKGNhcGl0YWxpemF0aW9uIHdpbGwgYmUgbm9ybWFsaXplZCkuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLmluc2VydEVsID0gZnVuY3Rpb24gaW5zZXJ0RWwgKHRhZ05hbWUpIHtcbiAgICBpZiAoIXRoaXMuX3RhcmdldCB8fFxuICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgIT09IHRhZ05hbWUudG9Mb3dlckNhc2UoKSkge1xuXG4gICAgICAgIHRoaXMuZmluZFBhcmVudCgpO1xuXG4gICAgICAgIHRoaXMuX2Fzc2VydFBhcmVudExvYWRlZCgpO1xuXG4gICAgICAgIGlmICh0aGlzLl9wYXJlbnQudm9pZClcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICAgICB0aGlzLl9wYXJlbnQucGF0aCArICcgaXMgYSB2b2lkIGVsZW1lbnQuICcgK1xuICAgICAgICAgICAgICAgICdWb2lkIGVsZW1lbnRzIGFyZSBub3QgYWxsb3dlZCB0byBoYXZlIGNoaWxkcmVuLidcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgaWYgKHRoaXMuX3RhcmdldCkgdGhpcy5fcGFyZW50LmVsZW1lbnQucmVtb3ZlQ2hpbGQodGhpcy5fdGFyZ2V0LmVsZW1lbnQpO1xuXG4gICAgICAgIHRoaXMuX3RhcmdldCA9IG5ldyBFbGVtZW50Q2FjaGUoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKSwgdGhpcy5fcGF0aCk7XG5cbiAgICAgICAgdmFyIGVsID0gdGhpcy5fdGFyZ2V0LmVsZW1lbnQ7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLl9wYXJlbnQuZWxlbWVudDtcblxuICAgICAgICB0aGlzLnJlc29sdmVDaGlsZHJlbihlbCwgcGFyZW50KTtcblxuICAgICAgICB0aGlzLl9wYXJlbnQuZWxlbWVudC5hcHBlbmRDaGlsZCh0aGlzLl90YXJnZXQuZWxlbWVudCk7XG4gICAgICAgIHRoaXMuX2VsZW1lbnRzW3RoaXMuX3BhdGhdID0gdGhpcy5fdGFyZ2V0O1xuICAgIH1cbn07XG5cblxuLyoqXG4gKiBTZXRzIGEgcHJvcGVydHkgb24gdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSBQcm9wZXJ0eSBuYW1lIChlLmcuIGJhY2tncm91bmQsIGNvbG9yLCBmb250KVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlIFByb3BydHkgdmFsdWUgKGUuZy4gYmxhY2ssIDIwcHgpXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldFByb3BlcnR5ID0gZnVuY3Rpb24gc2V0UHJvcGVydHkgKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGVbbmFtZV0gPSB2YWx1ZTtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBzaXplIG9mIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqIFJlbW92ZXMgYW55IGV4cGxpY2l0IHNpemluZyBjb25zdHJhaW50cyB3aGVuIHBhc3NlZCBpbiBgZmFsc2VgXG4gKiAoXCJ0cnVlLXNpemluZ1wiKS5cbiAqIFxuICogSW52b2tpbmcgc2V0U2l6ZSBpcyBlcXVpdmFsZW50IHRvIGEgbWFudWFsIGludm9jYXRpb24gb2YgYHNldFdpZHRoYCBmb2xsb3dlZFxuICogYnkgYHNldEhlaWdodGAuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfGZhbHNlfSB3aWR0aCAgIFdpZHRoIHRvIGJlIHNldC5cbiAqIEBwYXJhbSB7TnVtYmVyfGZhbHNlfSBoZWlnaHQgIEhlaWdodCB0byBiZSBzZXQuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldFNpemUgPSBmdW5jdGlvbiBzZXRTaXplICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICB0aGlzLnNldFdpZHRoKHdpZHRoKTtcbiAgICB0aGlzLnNldEhlaWdodChoZWlnaHQpO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSB3aWR0aCBvZiB0aGUgY3VycmVudGx5IGxvYWRlZCBFbGVtZW50Q2FjaGUuXG4gKiBcbiAqIEBtZXRob2RcbiAqICBcbiAqIEBwYXJhbSAge051bWJlcnxmYWxzZX0gd2lkdGggICAgIFRoZSBleHBsaWNpdCB3aWR0aCB0byBiZSBzZXQgb24gdGhlXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFbGVtZW50Q2FjaGUncyB0YXJnZXQgKGFuZCBjb250ZW50KSBlbGVtZW50LlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYGZhbHNlYCByZW1vdmVzIGFueSBleHBsaWNpdCBzaXppbmdcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0cmFpbnRzIGZyb20gdGhlIHVuZGVybHlpbmcgRE9NXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFbGVtZW50cy5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovIFxuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldFdpZHRoID0gZnVuY3Rpb24gc2V0V2lkdGgod2lkdGgpIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcblxuICAgIHZhciBjb250ZW50V3JhcHBlciA9IHRoaXMuX3RhcmdldC5jb250ZW50O1xuXG4gICAgaWYgKHdpZHRoID09PSBmYWxzZSkge1xuICAgICAgICB0aGlzLl90YXJnZXQuZXhwbGljaXRXaWR0aCA9IHRydWU7XG4gICAgICAgIGlmIChjb250ZW50V3JhcHBlcikgY29udGVudFdyYXBwZXIuc3R5bGUud2lkdGggPSAnJztcbiAgICAgICAgd2lkdGggPSBjb250ZW50V3JhcHBlciA/IGNvbnRlbnRXcmFwcGVyLm9mZnNldFdpZHRoIDogMDtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGUud2lkdGggPSB3aWR0aCArICdweCc7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl90YXJnZXQuZXhwbGljaXRXaWR0aCA9IGZhbHNlO1xuICAgICAgICBpZiAoY29udGVudFdyYXBwZXIpIGNvbnRlbnRXcmFwcGVyLnN0eWxlLndpZHRoID0gd2lkdGggKyAncHgnO1xuICAgICAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zdHlsZS53aWR0aCA9IHdpZHRoICsgJ3B4JztcbiAgICB9XG5cbiAgICB0aGlzLl90YXJnZXQuc2l6ZVswXSA9IHdpZHRoO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBoZWlnaHQgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgRWxlbWVudENhY2hlLlxuICogXG4gKiBAbWV0aG9kICBzZXRIZWlnaHRcbiAqICBcbiAqIEBwYXJhbSAge051bWJlcnxmYWxzZX0gaGVpZ2h0ICAgIFRoZSBleHBsaWNpdCBoZWlnaHQgdG8gYmUgc2V0IG9uIHRoZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWxlbWVudENhY2hlJ3MgdGFyZ2V0IChhbmQgY29udGVudCkgZWxlbWVudC5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBmYWxzZWAgcmVtb3ZlcyBhbnkgZXhwbGljaXQgc2l6aW5nXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdHJhaW50cyBmcm9tIHRoZSB1bmRlcmx5aW5nIERPTVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWxlbWVudHMuXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqLyBcbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbiBzZXRIZWlnaHQoaGVpZ2h0KSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICB2YXIgY29udGVudFdyYXBwZXIgPSB0aGlzLl90YXJnZXQuY29udGVudDtcblxuICAgIGlmIChoZWlnaHQgPT09IGZhbHNlKSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdEhlaWdodCA9IHRydWU7XG4gICAgICAgIGlmIChjb250ZW50V3JhcHBlcikgY29udGVudFdyYXBwZXIuc3R5bGUuaGVpZ2h0ID0gJyc7XG4gICAgICAgIGhlaWdodCA9IGNvbnRlbnRXcmFwcGVyID8gY29udGVudFdyYXBwZXIub2Zmc2V0SGVpZ2h0IDogMDtcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gaGVpZ2h0ICsgJ3B4JztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5leHBsaWNpdEhlaWdodCA9IGZhbHNlO1xuICAgICAgICBpZiAoY29udGVudFdyYXBwZXIpIGNvbnRlbnRXcmFwcGVyLnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnN0eWxlLmhlaWdodCA9IGhlaWdodCArICdweCc7XG4gICAgfVxuXG4gICAgdGhpcy5fdGFyZ2V0LnNpemVbMV0gPSBoZWlnaHQ7XG59O1xuXG4vKipcbiAqIFNldHMgYW4gYXR0cmlidXRlIG9uIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgQXR0cmlidXRlIG5hbWUgKGUuZy4gaHJlZilcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSBBdHRyaWJ1dGUgdmFsdWUgKGUuZy4gaHR0cDovL2ZhbW91cy5vcmcpXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLnNldEF0dHJpYnV0ZSA9IGZ1bmN0aW9uIHNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSkge1xuICAgIHRoaXMuX2Fzc2VydFRhcmdldExvYWRlZCgpO1xuICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG59O1xuXG4vKipcbiAqIFNldHMgdGhlIGBpbm5lckhUTUxgIGNvbnRlbnQgb2YgdGhlIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gY29udGVudCBDb250ZW50IHRvIGJlIHNldCBhcyBgaW5uZXJIVE1MYFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5zZXRDb250ZW50ID0gZnVuY3Rpb24gc2V0Q29udGVudChjb250ZW50KSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG5cbiAgICBpZiAodGhpcy5fdGFyZ2V0LmZvcm1FbGVtZW50KSB7XG4gICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LnZhbHVlID0gY29udGVudDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICghdGhpcy5fdGFyZ2V0LmNvbnRlbnQpIHtcbiAgICAgICAgICAgIHRoaXMuX3RhcmdldC5jb250ZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICB0aGlzLl90YXJnZXQuY29udGVudC5jbGFzc0xpc3QuYWRkKCdmYW1vdXMtZG9tLWVsZW1lbnQtY29udGVudCcpO1xuICAgICAgICAgICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuaW5zZXJ0QmVmb3JlKFxuICAgICAgICAgICAgICAgIHRoaXMuX3RhcmdldC5jb250ZW50LFxuICAgICAgICAgICAgICAgIHRoaXMuX3RhcmdldC5lbGVtZW50LmZpcnN0Q2hpbGRcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fdGFyZ2V0LmNvbnRlbnQuaW5uZXJIVE1MID0gY29udGVudDtcbiAgICB9XG5cblxuICAgIHRoaXMuc2V0U2l6ZShcbiAgICAgICAgdGhpcy5fdGFyZ2V0LmV4cGxpY2l0V2lkdGggPyBmYWxzZSA6IHRoaXMuX3RhcmdldC5zaXplWzBdLFxuICAgICAgICB0aGlzLl90YXJnZXQuZXhwbGljaXRIZWlnaHQgPyBmYWxzZSA6IHRoaXMuX3RhcmdldC5zaXplWzFdXG4gICAgKTtcbn07XG5cblxuLyoqXG4gKiBTZXRzIHRoZSBwYXNzZWQgaW4gdHJhbnNmb3JtIG1hdHJpeCAod29ybGQgc3BhY2UpLiBJbnZlcnRzIHRoZSBwYXJlbnQncyB3b3JsZFxuICogdHJhbnNmb3JtLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge0Zsb2F0MzJBcnJheX0gdHJhbnNmb3JtIFRoZSB0cmFuc2Zvcm0gZm9yIHRoZSBsb2FkZWQgRE9NIEVsZW1lbnQgaW4gd29ybGQgc3BhY2VcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5ET01SZW5kZXJlci5wcm90b3R5cGUuc2V0TWF0cml4ID0gZnVuY3Rpb24gc2V0TWF0cml4ICh0cmFuc2Zvcm0pIHtcbiAgICB0aGlzLl9hc3NlcnRUYXJnZXRMb2FkZWQoKTtcbiAgICB0aGlzLl90YXJnZXQuZWxlbWVudC5zdHlsZVtUUkFOU0ZPUk1dID0gdGhpcy5fc3RyaW5naWZ5TWF0cml4KHRyYW5zZm9ybSk7XG59O1xuXG5cbi8qKlxuICogQWRkcyBhIGNsYXNzIHRvIHRoZSBjbGFzc0xpc3QgYXNzb2NpYXRlZCB3aXRoIHRoZSBjdXJyZW50bHkgbG9hZGVkIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGRvbUNsYXNzIENsYXNzIG5hbWUgdG8gYmUgYWRkZWQgdG8gdGhlIGN1cnJlbnQgdGFyZ2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5hZGRDbGFzcyA9IGZ1bmN0aW9uIGFkZENsYXNzKGRvbUNsYXNzKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuY2xhc3NMaXN0LmFkZChkb21DbGFzcyk7XG59O1xuXG5cbi8qKlxuICogUmVtb3ZlcyBhIGNsYXNzIGZyb20gdGhlIGNsYXNzTGlzdCBhc3NvY2lhdGVkIHdpdGggdGhlIGN1cnJlbnRseSBsb2FkZWRcbiAqIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGRvbUNsYXNzIENsYXNzIG5hbWUgdG8gYmUgcmVtb3ZlZCBmcm9tIGN1cnJlbnRseSBsb2FkZWQgdGFyZ2V0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkRPTVJlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmVDbGFzcyA9IGZ1bmN0aW9uIHJlbW92ZUNsYXNzKGRvbUNsYXNzKSB7XG4gICAgdGhpcy5fYXNzZXJ0VGFyZ2V0TG9hZGVkKCk7XG4gICAgdGhpcy5fdGFyZ2V0LmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShkb21DbGFzcyk7XG59O1xuXG5cbi8qKlxuICogU3RyaW5naWZpZXMgdGhlIHBhc3NlZCBpbiBtYXRyaXggZm9yIHNldHRpbmcgdGhlIGB0cmFuc2Zvcm1gIHByb3BlcnR5LlxuICpcbiAqIEBtZXRob2QgIF9zdHJpbmdpZnlNYXRyaXhcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtBcnJheX0gbSAgICBNYXRyaXggYXMgYW4gYXJyYXkgb3IgYXJyYXktbGlrZSBvYmplY3QuXG4gKiBAcmV0dXJuIHtTdHJpbmd9ICAgICBTdHJpbmdpZmllZCBtYXRyaXggYXMgYG1hdHJpeDNkYC1wcm9wZXJ0eS5cbiAqL1xuRE9NUmVuZGVyZXIucHJvdG90eXBlLl9zdHJpbmdpZnlNYXRyaXggPSBmdW5jdGlvbiBfc3RyaW5naWZ5TWF0cml4KG0pIHtcbiAgICB2YXIgciA9ICdtYXRyaXgzZCgnO1xuICAgIFxuICAgIHIgKz0gKG1bMF0gPCAwLjAwMDAwMSAmJiBtWzBdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzBdICsgJywnO1xuICAgIHIgKz0gKG1bMV0gPCAwLjAwMDAwMSAmJiBtWzFdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzFdICsgJywnO1xuICAgIHIgKz0gKG1bMl0gPCAwLjAwMDAwMSAmJiBtWzJdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzJdICsgJywnO1xuICAgIHIgKz0gKG1bM10gPCAwLjAwMDAwMSAmJiBtWzNdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzNdICsgJywnO1xuICAgIHIgKz0gKG1bNF0gPCAwLjAwMDAwMSAmJiBtWzRdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzRdICsgJywnO1xuICAgIHIgKz0gKG1bNV0gPCAwLjAwMDAwMSAmJiBtWzVdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzVdICsgJywnO1xuICAgIHIgKz0gKG1bNl0gPCAwLjAwMDAwMSAmJiBtWzZdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzZdICsgJywnO1xuICAgIHIgKz0gKG1bN10gPCAwLjAwMDAwMSAmJiBtWzddID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzddICsgJywnO1xuICAgIHIgKz0gKG1bOF0gPCAwLjAwMDAwMSAmJiBtWzhdID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzhdICsgJywnO1xuICAgIHIgKz0gKG1bOV0gPCAwLjAwMDAwMSAmJiBtWzldID4gLTAuMDAwMDAxKSA/ICcwLCcgOiBtWzldICsgJywnO1xuICAgIHIgKz0gKG1bMTBdIDwgMC4wMDAwMDEgJiYgbVsxMF0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTBdICsgJywnO1xuICAgIHIgKz0gKG1bMTFdIDwgMC4wMDAwMDEgJiYgbVsxMV0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTFdICsgJywnO1xuICAgIHIgKz0gKG1bMTJdIDwgMC4wMDAwMDEgJiYgbVsxMl0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTJdICsgJywnO1xuICAgIHIgKz0gKG1bMTNdIDwgMC4wMDAwMDEgJiYgbVsxM10gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTNdICsgJywnO1xuICAgIHIgKz0gKG1bMTRdIDwgMC4wMDAwMDEgJiYgbVsxNF0gPiAtMC4wMDAwMDEpID8gJzAsJyA6IG1bMTRdICsgJywnO1xuICAgIFxuICAgIHIgKz0gbVsxNV0gKyAnKSc7XG4gICAgcmV0dXJuIHI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IERPTVJlbmRlcmVyO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVm9pZEVsZW1lbnRzID0gcmVxdWlyZSgnLi9Wb2lkRWxlbWVudHMnKTtcblxuLyoqXG4gKiBFbGVtZW50Q2FjaGUgaXMgYmVpbmcgdXNlZCBmb3Iga2VlcGluZyB0cmFjayBvZiBhbiBlbGVtZW50J3MgRE9NIEVsZW1lbnQsXG4gKiBwYXRoLCB3b3JsZCB0cmFuc2Zvcm0sIGludmVydGVkIHBhcmVudCwgZmluYWwgdHJhbnNmb3JtIChhcyBiZWluZyB1c2VkIGZvclxuICogc2V0dGluZyB0aGUgYWN0dWFsIGB0cmFuc2Zvcm1gLXByb3BlcnR5KSBhbmQgcG9zdCByZW5kZXIgc2l6ZSAoZmluYWwgc2l6ZSBhc1xuICogYmVpbmcgcmVuZGVyZWQgdG8gdGhlIERPTSkuXG4gKlxuICogQGNsYXNzIEVsZW1lbnRDYWNoZVxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBET01FbGVtZW50XG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgZm9yIHVuaXF1ZWx5IGlkZW50aWZ5aW5nIHRoZSBsb2NhdGlvbiBpbiB0aGVcbiAqICAgICAgICAgICAgICAgICAgICAgIHNjZW5lIGdyYXBoLlxuICovXG5mdW5jdGlvbiBFbGVtZW50Q2FjaGUgKGVsZW1lbnQsIHBhdGgpIHtcbiAgICB0aGlzLnRhZ05hbWUgPSBlbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICB0aGlzLnZvaWQgPSBWb2lkRWxlbWVudHNbdGhpcy50YWdOYW1lXTtcblxuICAgIHZhciBjb25zdHJ1Y3RvciA9IGVsZW1lbnQuY29uc3RydWN0b3I7XG5cbiAgICB0aGlzLmZvcm1FbGVtZW50ID0gY29uc3RydWN0b3IgPT09IEhUTUxJbnB1dEVsZW1lbnQgfHxcbiAgICAgICAgY29uc3RydWN0b3IgPT09IEhUTUxUZXh0QXJlYUVsZW1lbnQgfHxcbiAgICAgICAgY29uc3RydWN0b3IgPT09IEhUTUxTZWxlY3RFbGVtZW50O1xuXG4gICAgdGhpcy5lbGVtZW50ID0gZWxlbWVudDtcbiAgICB0aGlzLnBhdGggPSBwYXRoO1xuICAgIHRoaXMuY29udGVudCA9IG51bGw7XG4gICAgdGhpcy5zaXplID0gbmV3IEludDE2QXJyYXkoMyk7XG4gICAgdGhpcy5leHBsaWNpdEhlaWdodCA9IGZhbHNlO1xuICAgIHRoaXMuZXhwbGljaXRXaWR0aCA9IGZhbHNlO1xuICAgIHRoaXMucG9zdFJlbmRlclNpemUgPSBuZXcgRmxvYXQzMkFycmF5KDIpO1xuICAgIHRoaXMubGlzdGVuZXJzID0ge307XG4gICAgdGhpcy5wcmV2ZW50RGVmYXVsdCA9IHt9O1xuICAgIHRoaXMuc3Vic2NyaWJlID0ge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudENhY2hlO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgbWV0aG9kIGZvciBpbnZlcnRpbmcgYSB0cmFuc2Zvcm0gbWF0cml4XG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IG91dCBhcnJheSB0byBzdG9yZSB0aGUgcmV0dXJuIG9mIHRoZSBpbnZlcnNpb25cbiAqIEBwYXJhbSB7QXJyYXl9IGEgdHJhbnNmb3JtIG1hdHJpeCB0byBpbnZlcnNlXG4gKlxuICogQHJldHVybiB7QXJyYXl9IG91dFxuICogICBvdXRwdXQgYXJyYXkgdGhhdCBpcyBzdG9yaW5nIHRoZSB0cmFuc2Zvcm0gbWF0cml4XG4gKi9cbmZ1bmN0aW9uIGludmVydCAob3V0LCBhKSB7XG4gICAgdmFyIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICAgICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV0sXG5cbiAgICAgICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxuICAgICAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXG4gICAgICAgIGIwMiA9IGEwMCAqIGExMyAtIGEwMyAqIGExMCxcbiAgICAgICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxuICAgICAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXG4gICAgICAgIGIwNSA9IGEwMiAqIGExMyAtIGEwMyAqIGExMixcbiAgICAgICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxuICAgICAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXG4gICAgICAgIGIwOCA9IGEyMCAqIGEzMyAtIGEyMyAqIGEzMCxcbiAgICAgICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxuICAgICAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXG4gICAgICAgIGIxMSA9IGEyMiAqIGEzMyAtIGEyMyAqIGEzMixcblxuICAgICAgICAvLyBDYWxjdWxhdGUgdGhlIGRldGVybWluYW50XG4gICAgICAgIGRldCA9IGIwMCAqIGIxMSAtIGIwMSAqIGIxMCArIGIwMiAqIGIwOSArIGIwMyAqIGIwOCAtIGIwNCAqIGIwNyArIGIwNSAqIGIwNjtcblxuICAgIGlmICghZGV0KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBkZXQgPSAxLjAgLyBkZXQ7XG5cbiAgICBvdXRbMF0gPSAoYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5KSAqIGRldDtcbiAgICBvdXRbMV0gPSAoYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5KSAqIGRldDtcbiAgICBvdXRbMl0gPSAoYTMxICogYjA1IC0gYTMyICogYjA0ICsgYTMzICogYjAzKSAqIGRldDtcbiAgICBvdXRbM10gPSAoYTIyICogYjA0IC0gYTIxICogYjA1IC0gYTIzICogYjAzKSAqIGRldDtcbiAgICBvdXRbNF0gPSAoYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3KSAqIGRldDtcbiAgICBvdXRbNV0gPSAoYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3KSAqIGRldDtcbiAgICBvdXRbNl0gPSAoYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxKSAqIGRldDtcbiAgICBvdXRbN10gPSAoYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxKSAqIGRldDtcbiAgICBvdXRbOF0gPSAoYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2KSAqIGRldDtcbiAgICBvdXRbOV0gPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDtcbiAgICBvdXRbMTBdID0gKGEzMCAqIGIwNCAtIGEzMSAqIGIwMiArIGEzMyAqIGIwMCkgKiBkZXQ7XG4gICAgb3V0WzExXSA9IChhMjEgKiBiMDIgLSBhMjAgKiBiMDQgLSBhMjMgKiBiMDApICogZGV0O1xuICAgIG91dFsxMl0gPSAoYTExICogYjA3IC0gYTEwICogYjA5IC0gYTEyICogYjA2KSAqIGRldDtcbiAgICBvdXRbMTNdID0gKGEwMCAqIGIwOSAtIGEwMSAqIGIwNyArIGEwMiAqIGIwNikgKiBkZXQ7XG4gICAgb3V0WzE0XSA9IChhMzEgKiBiMDEgLSBhMzAgKiBiMDMgLSBhMzIgKiBiMDApICogZGV0O1xuICAgIG91dFsxNV0gPSAoYTIwICogYjAzIC0gYTIxICogYjAxICsgYTIyICogYjAwKSAqIGRldDtcblxuICAgIHJldHVybiBvdXQ7XG59XG5cbi8qKlxuICogQSBtZXRob2QgZm9yIG11bHRpcGx5aW5nIHR3byBtYXRyaWNpZXNcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtBcnJheX0gb3V0IGFycmF5IHRvIHN0b3JlIHRoZSByZXR1cm4gb2YgdGhlIG11bHRpcGxpY2F0aW9uXG4gKiBAcGFyYW0ge0FycmF5fSBhIHRyYW5zZm9ybSBtYXRyaXggdG8gbXVsdGlwbHlcbiAqIEBwYXJhbSB7QXJyYXl9IGIgdHJhbnNmb3JtIG1hdHJpeCB0byBtdWx0aXBseVxuICpcbiAqIEByZXR1cm4ge0FycmF5fSBvdXRcbiAqICAgb3V0cHV0IGFycmF5IHRoYXQgaXMgc3RvcmluZyB0aGUgdHJhbnNmb3JtIG1hdHJpeFxuICovXG5mdW5jdGlvbiBtdWx0aXBseSAob3V0LCBhLCBiKSB7XG4gICAgdmFyIGEwMCA9IGFbMF0sIGEwMSA9IGFbMV0sIGEwMiA9IGFbMl0sIGEwMyA9IGFbM10sXG4gICAgICAgIGExMCA9IGFbNF0sIGExMSA9IGFbNV0sIGExMiA9IGFbNl0sIGExMyA9IGFbN10sXG4gICAgICAgIGEyMCA9IGFbOF0sIGEyMSA9IGFbOV0sIGEyMiA9IGFbMTBdLCBhMjMgPSBhWzExXSxcbiAgICAgICAgYTMwID0gYVsxMl0sIGEzMSA9IGFbMTNdLCBhMzIgPSBhWzE0XSwgYTMzID0gYVsxNV0sXG5cbiAgICAgICAgYjAgPSBiWzBdLCBiMSA9IGJbMV0sIGIyID0gYlsyXSwgYjMgPSBiWzNdLFxuICAgICAgICBiNCA9IGJbNF0sIGI1ID0gYls1XSwgYjYgPSBiWzZdLCBiNyA9IGJbN10sXG4gICAgICAgIGI4ID0gYls4XSwgYjkgPSBiWzldLCBiMTAgPSBiWzEwXSwgYjExID0gYlsxMV0sXG4gICAgICAgIGIxMiA9IGJbMTJdLCBiMTMgPSBiWzEzXSwgYjE0ID0gYlsxNF0sIGIxNSA9IGJbMTVdO1xuXG4gICAgdmFyIGNoYW5nZWQgPSBmYWxzZTtcbiAgICB2YXIgb3V0MCwgb3V0MSwgb3V0Miwgb3V0MztcblxuICAgIG91dDAgPSBiMCphMDAgKyBiMSphMTAgKyBiMiphMjAgKyBiMyphMzA7XG4gICAgb3V0MSA9IGIwKmEwMSArIGIxKmExMSArIGIyKmEyMSArIGIzKmEzMTtcbiAgICBvdXQyID0gYjAqYTAyICsgYjEqYTEyICsgYjIqYTIyICsgYjMqYTMyO1xuICAgIG91dDMgPSBiMCphMDMgKyBiMSphMTMgKyBiMiphMjMgKyBiMyphMzM7XG5cbiAgICBjaGFuZ2VkID0gY2hhbmdlZCA/XG4gICAgICAgICAgICAgIGNoYW5nZWQgOiBvdXQwID09PSBvdXRbMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDEgPT09IG91dFsxXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MiA9PT0gb3V0WzJdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQzID09PSBvdXRbM107XG5cbiAgICBvdXRbMF0gPSBvdXQwO1xuICAgIG91dFsxXSA9IG91dDE7XG4gICAgb3V0WzJdID0gb3V0MjtcbiAgICBvdXRbM10gPSBvdXQzO1xuXG4gICAgYjAgPSBiNDsgYjEgPSBiNTsgYjIgPSBiNjsgYjMgPSBiNztcbiAgICBvdXQwID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dDEgPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0MiA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXQzID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgY2hhbmdlZCA9IGNoYW5nZWQgP1xuICAgICAgICAgICAgICBjaGFuZ2VkIDogb3V0MCA9PT0gb3V0WzRdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQxID09PSBvdXRbNV0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDIgPT09IG91dFs2XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MyA9PT0gb3V0WzddO1xuXG4gICAgb3V0WzRdID0gb3V0MDtcbiAgICBvdXRbNV0gPSBvdXQxO1xuICAgIG91dFs2XSA9IG91dDI7XG4gICAgb3V0WzddID0gb3V0MztcblxuICAgIGIwID0gYjg7IGIxID0gYjk7IGIyID0gYjEwOyBiMyA9IGIxMTtcbiAgICBvdXQwID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dDEgPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0MiA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXQzID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgY2hhbmdlZCA9IGNoYW5nZWQgP1xuICAgICAgICAgICAgICBjaGFuZ2VkIDogb3V0MCA9PT0gb3V0WzhdIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQxID09PSBvdXRbOV0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDIgPT09IG91dFsxMF0gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dDMgPT09IG91dFsxMV07XG5cbiAgICBvdXRbOF0gPSBvdXQwO1xuICAgIG91dFs5XSA9IG91dDE7XG4gICAgb3V0WzEwXSA9IG91dDI7XG4gICAgb3V0WzExXSA9IG91dDM7XG5cbiAgICBiMCA9IGIxMjsgYjEgPSBiMTM7IGIyID0gYjE0OyBiMyA9IGIxNTtcbiAgICBvdXQwID0gYjAqYTAwICsgYjEqYTEwICsgYjIqYTIwICsgYjMqYTMwO1xuICAgIG91dDEgPSBiMCphMDEgKyBiMSphMTEgKyBiMiphMjEgKyBiMyphMzE7XG4gICAgb3V0MiA9IGIwKmEwMiArIGIxKmExMiArIGIyKmEyMiArIGIzKmEzMjtcbiAgICBvdXQzID0gYjAqYTAzICsgYjEqYTEzICsgYjIqYTIzICsgYjMqYTMzO1xuXG4gICAgY2hhbmdlZCA9IGNoYW5nZWQgP1xuICAgICAgICAgICAgICBjaGFuZ2VkIDogb3V0MCA9PT0gb3V0WzEyXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MSA9PT0gb3V0WzEzXSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MiA9PT0gb3V0WzE0XSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgb3V0MyA9PT0gb3V0WzE1XTtcblxuICAgIG91dFsxMl0gPSBvdXQwO1xuICAgIG91dFsxM10gPSBvdXQxO1xuICAgIG91dFsxNF0gPSBvdXQyO1xuICAgIG91dFsxNV0gPSBvdXQzO1xuXG4gICAgcmV0dXJuIG91dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgbXVsdGlwbHk6IG11bHRpcGx5LFxuICAgIGludmVydDogaW52ZXJ0XG59O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIE1hcCBvZiB2b2lkIGVsZW1lbnRzIGFzIGRlZmluZWQgYnkgdGhlXG4gKiBbSFRNTDUgc3BlY10oaHR0cDovL3d3dy53My5vcmcvVFIvaHRtbDUvc3ludGF4Lmh0bWwjZWxlbWVudHMtMCkuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIFZvaWRFbGVtZW50cyA9IHtcbiAgICBhcmVhICA6IHRydWUsXG4gICAgYmFzZSAgOiB0cnVlLFxuICAgIGJyICAgIDogdHJ1ZSxcbiAgICBjb2wgICA6IHRydWUsXG4gICAgZW1iZWQgOiB0cnVlLFxuICAgIGhyICAgIDogdHJ1ZSxcbiAgICBpbWcgICA6IHRydWUsXG4gICAgaW5wdXQgOiB0cnVlLFxuICAgIGtleWdlbjogdHJ1ZSxcbiAgICBsaW5rICA6IHRydWUsXG4gICAgbWV0YSAgOiB0cnVlLFxuICAgIHBhcmFtIDogdHJ1ZSxcbiAgICBzb3VyY2U6IHRydWUsXG4gICAgdHJhY2sgOiB0cnVlLFxuICAgIHdiciAgIDogdHJ1ZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWb2lkRWxlbWVudHM7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgvI2V2ZW50cy1jb21wb3NpdGlvbmV2ZW50cykuXG4gKlxuICogQGNsYXNzIENvbXBvc2l0aW9uRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIENvbXBvc2l0aW9uRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIENvbXBvc2l0aW9uRXZlbnRJbml0IGNvbXBvc2l0aW9uRXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIENvbXBvc2l0aW9uRXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyBkYXRhO1xuICAgIC8vIH07XG5cbiAgICBVSUV2ZW50LmNhbGwodGhpcywgZXYpO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgQ29tcG9zaXRpb25FdmVudCNkYXRhXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy5kYXRhID0gZXYuZGF0YTtcbn1cblxuQ29tcG9zaXRpb25FdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVJRXZlbnQucHJvdG90eXBlKTtcbkNvbXBvc2l0aW9uRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gQ29tcG9zaXRpb25FdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbkNvbXBvc2l0aW9uRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnQ29tcG9zaXRpb25FdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbXBvc2l0aW9uRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVGhlIEV2ZW50IGNsYXNzIGlzIGJlaW5nIHVzZWQgaW4gb3JkZXIgdG8gbm9ybWFsaXplIG5hdGl2ZSBET00gZXZlbnRzLlxuICogRXZlbnRzIG5lZWQgdG8gYmUgbm9ybWFsaXplZCBpbiBvcmRlciB0byBiZSBzZXJpYWxpemVkIHRocm91Z2ggdGhlIHN0cnVjdHVyZWRcbiAqIGNsb25pbmcgYWxnb3JpdGhtIHVzZWQgYnkgdGhlIGBwb3N0TWVzc2FnZWAgbWV0aG9kIChXZWIgV29ya2VycykuXG4gKlxuICogV3JhcHBpbmcgRE9NIGV2ZW50cyBhbHNvIGhhcyB0aGUgYWR2YW50YWdlIG9mIHByb3ZpZGluZyBhIGNvbnNpc3RlbnRcbiAqIGludGVyZmFjZSBmb3IgaW50ZXJhY3Rpbmcgd2l0aCBET00gZXZlbnRzIGFjcm9zcyBicm93c2VycyBieSBjb3B5aW5nIG92ZXIgYVxuICogc3Vic2V0IG9mIHRoZSBleHBvc2VkIHByb3BlcnRpZXMgdGhhdCBpcyBndWFyYW50ZWVkIHRvIGJlIGNvbnNpc3RlbnQgYWNyb3NzXG4gKiBicm93c2Vycy5cbiAqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jaW50ZXJmYWNlLUV2ZW50KS5cbiAqXG4gKiBAY2xhc3MgRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGUsIG9wdGlvbmFsIEV2ZW50SW5pdCBldmVudEluaXREaWN0KSxcbiAgICAvLyAgRXhwb3NlZD1XaW5kb3csV29ya2VyXVxuICAgIC8vIGludGVyZmFjZSBFdmVudCB7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgRE9NU3RyaW5nIHR5cGU7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgRXZlbnRUYXJnZXQ/IHRhcmdldDtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBFdmVudFRhcmdldD8gY3VycmVudFRhcmdldDtcblxuICAgIC8vICAgY29uc3QgdW5zaWduZWQgc2hvcnQgTk9ORSA9IDA7XG4gICAgLy8gICBjb25zdCB1bnNpZ25lZCBzaG9ydCBDQVBUVVJJTkdfUEhBU0UgPSAxO1xuICAgIC8vICAgY29uc3QgdW5zaWduZWQgc2hvcnQgQVRfVEFSR0VUID0gMjtcbiAgICAvLyAgIGNvbnN0IHVuc2lnbmVkIHNob3J0IEJVQkJMSU5HX1BIQVNFID0gMztcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSB1bnNpZ25lZCBzaG9ydCBldmVudFBoYXNlO1xuXG4gICAgLy8gICB2b2lkIHN0b3BQcm9wYWdhdGlvbigpO1xuICAgIC8vICAgdm9pZCBzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcblxuICAgIC8vICAgcmVhZG9ubHkgYXR0cmlidXRlIGJvb2xlYW4gYnViYmxlcztcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBib29sZWFuIGNhbmNlbGFibGU7XG4gICAgLy8gICB2b2lkIHByZXZlbnREZWZhdWx0KCk7XG4gICAgLy8gICByZWFkb25seSBhdHRyaWJ1dGUgYm9vbGVhbiBkZWZhdWx0UHJldmVudGVkO1xuXG4gICAgLy8gICBbVW5mb3JnZWFibGVdIHJlYWRvbmx5IGF0dHJpYnV0ZSBib29sZWFuIGlzVHJ1c3RlZDtcbiAgICAvLyAgIHJlYWRvbmx5IGF0dHJpYnV0ZSBET01UaW1lU3RhbXAgdGltZVN0YW1wO1xuXG4gICAgLy8gICB2b2lkIGluaXRFdmVudChET01TdHJpbmcgdHlwZSwgYm9vbGVhbiBidWJibGVzLCBib29sZWFuIGNhbmNlbGFibGUpO1xuICAgIC8vIH07XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBFdmVudCN0eXBlXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy50eXBlID0gZXYudHlwZTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEV2ZW50I2RlZmF1bHRQcmV2ZW50ZWRcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5kZWZhdWx0UHJldmVudGVkID0gZXYuZGVmYXVsdFByZXZlbnRlZDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEV2ZW50I3RpbWVTdGFtcFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMudGltZVN0YW1wID0gZXYudGltZVN0YW1wO1xuXG5cbiAgICAvKipcbiAgICAgKiBVc2VkIGZvciBleHBvc2luZyB0aGUgY3VycmVudCB0YXJnZXQncyB2YWx1ZS5cbiAgICAgKlxuICAgICAqIEBuYW1lIEV2ZW50I3ZhbHVlXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICovXG4gICAgdmFyIHRhcmdldENvbnN0cnVjdG9yID0gZXYudGFyZ2V0LmNvbnN0cnVjdG9yO1xuICAgIC8vIFRPRE8gU3VwcG9ydCBIVE1MS2V5Z2VuRWxlbWVudFxuICAgIGlmIChcbiAgICAgICAgdGFyZ2V0Q29uc3RydWN0b3IgPT09IEhUTUxJbnB1dEVsZW1lbnQgfHxcbiAgICAgICAgdGFyZ2V0Q29uc3RydWN0b3IgPT09IEhUTUxUZXh0QXJlYUVsZW1lbnQgfHxcbiAgICAgICAgdGFyZ2V0Q29uc3RydWN0b3IgPT09IEhUTUxTZWxlY3RFbGVtZW50XG4gICAgKSB7XG4gICAgICAgIHRoaXMudmFsdWUgPSBldi50YXJnZXQudmFsdWU7XG4gICAgfVxufVxuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIENvbXBvc2l0aW9uRXZlbnQgPSByZXF1aXJlKCcuL0NvbXBvc2l0aW9uRXZlbnQnKTtcbnZhciBFdmVudCA9IHJlcXVpcmUoJy4vRXZlbnQnKTtcbnZhciBGb2N1c0V2ZW50ID0gcmVxdWlyZSgnLi9Gb2N1c0V2ZW50Jyk7XG52YXIgSW5wdXRFdmVudCA9IHJlcXVpcmUoJy4vSW5wdXRFdmVudCcpO1xudmFyIEtleWJvYXJkRXZlbnQgPSByZXF1aXJlKCcuL0tleWJvYXJkRXZlbnQnKTtcbnZhciBNb3VzZUV2ZW50ID0gcmVxdWlyZSgnLi9Nb3VzZUV2ZW50Jyk7XG52YXIgVG91Y2hFdmVudCA9IHJlcXVpcmUoJy4vVG91Y2hFdmVudCcpO1xudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcbnZhciBXaGVlbEV2ZW50ID0gcmVxdWlyZSgnLi9XaGVlbEV2ZW50Jyk7XG5cbi8qKlxuICogQSBtYXBwaW5nIG9mIERPTSBldmVudHMgdG8gdGhlIGNvcnJlc3BvbmRpbmcgaGFuZGxlcnNcbiAqXG4gKiBAbmFtZSBFdmVudE1hcFxuICogQHR5cGUgT2JqZWN0XG4gKi9cbnZhciBFdmVudE1hcCA9IHtcbiAgICBjaGFuZ2UgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIHRydWVdLFxuICAgIHN1Ym1pdCAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgdHJ1ZV0sXG5cbiAgICAvLyBVSSBFdmVudHMgKGh0dHA6Ly93d3cudzMub3JnL1RSL3VpZXZlbnRzLylcbiAgICBhYm9ydCAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIGZhbHNlXSxcbiAgICBiZWZvcmVpbnB1dCAgICAgICAgICAgICAgICAgICAgOiBbSW5wdXRFdmVudCwgdHJ1ZV0sXG4gICAgYmx1ciAgICAgICAgICAgICAgICAgICAgICAgICAgIDogW0ZvY3VzRXZlbnQsIGZhbHNlXSxcbiAgICBjbGljayAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgY29tcG9zaXRpb25lbmQgICAgICAgICAgICAgICAgIDogW0NvbXBvc2l0aW9uRXZlbnQsIHRydWVdLFxuICAgIGNvbXBvc2l0aW9uc3RhcnQgICAgICAgICAgICAgICA6IFtDb21wb3NpdGlvbkV2ZW50LCB0cnVlXSxcbiAgICBjb21wb3NpdGlvbnVwZGF0ZSAgICAgICAgICAgICAgOiBbQ29tcG9zaXRpb25FdmVudCwgdHJ1ZV0sXG4gICAgZGJsY2xpY2sgICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIHRydWVdLFxuICAgIGZvY3VzICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtGb2N1c0V2ZW50LCBmYWxzZV0sXG4gICAgZm9jdXNpbiAgICAgICAgICAgICAgICAgICAgICAgIDogW0ZvY3VzRXZlbnQsIHRydWVdLFxuICAgIGZvY3Vzb3V0ICAgICAgICAgICAgICAgICAgICAgICA6IFtGb2N1c0V2ZW50LCB0cnVlXSxcbiAgICBpbnB1dCAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbSW5wdXRFdmVudCwgdHJ1ZV0sXG4gICAga2V5ZG93biAgICAgICAgICAgICAgICAgICAgICAgIDogW0tleWJvYXJkRXZlbnQsIHRydWVdLFxuICAgIGtleXVwICAgICAgICAgICAgICAgICAgICAgICAgICA6IFtLZXlib2FyZEV2ZW50LCB0cnVlXSxcbiAgICBsb2FkICAgICAgICAgICAgICAgICAgICAgICAgICAgOiBbRXZlbnQsIGZhbHNlXSxcbiAgICBtb3VzZWRvd24gICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgbW91c2VlbnRlciAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIGZhbHNlXSxcbiAgICBtb3VzZWxlYXZlICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgZmFsc2VdLFxuXG4gICAgLy8gYnViYmxlcywgYnV0IHdpbGwgYmUgdHJpZ2dlcmVkIHZlcnkgZnJlcXVlbnRseVxuICAgIG1vdXNlbW92ZSAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCBmYWxzZV0sXG5cbiAgICBtb3VzZW91dCAgICAgICAgICAgICAgICAgICAgICAgOiBbTW91c2VFdmVudCwgdHJ1ZV0sXG4gICAgbW91c2VvdmVyICAgICAgICAgICAgICAgICAgICAgIDogW01vdXNlRXZlbnQsIHRydWVdLFxuICAgIG1vdXNldXAgICAgICAgICAgICAgICAgICAgICAgICA6IFtNb3VzZUV2ZW50LCB0cnVlXSxcbiAgICByZXNpemUgICAgICAgICAgICAgICAgICAgICAgICAgOiBbVUlFdmVudCwgZmFsc2VdLFxuXG4gICAgLy8gbWlnaHQgYnViYmxlXG4gICAgc2Nyb2xsICAgICAgICAgICAgICAgICAgICAgICAgIDogW1VJRXZlbnQsIGZhbHNlXSxcblxuICAgIHNlbGVjdCAgICAgICAgICAgICAgICAgICAgICAgICA6IFtFdmVudCwgdHJ1ZV0sXG4gICAgdW5sb2FkICAgICAgICAgICAgICAgICAgICAgICAgIDogW0V2ZW50LCBmYWxzZV0sXG4gICAgd2hlZWwgICAgICAgICAgICAgICAgICAgICAgICAgIDogW1doZWVsRXZlbnQsIHRydWVdLFxuXG4gICAgLy8gVG91Y2ggRXZlbnRzIEV4dGVuc2lvbiAoaHR0cDovL3d3dy53My5vcmcvVFIvdG91Y2gtZXZlbnRzLWV4dGVuc2lvbnMvKVxuICAgIHRvdWNoY2FuY2VsICAgICAgICAgICAgICAgICAgICA6IFtUb3VjaEV2ZW50LCB0cnVlXSxcbiAgICB0b3VjaGVuZCAgICAgICAgICAgICAgICAgICAgICAgOiBbVG91Y2hFdmVudCwgdHJ1ZV0sXG4gICAgdG91Y2htb3ZlICAgICAgICAgICAgICAgICAgICAgIDogW1RvdWNoRXZlbnQsIHRydWVdLFxuICAgIHRvdWNoc3RhcnQgICAgICAgICAgICAgICAgICAgICA6IFtUb3VjaEV2ZW50LCB0cnVlXVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudE1hcDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLWZvY3VzZXZlbnQpLlxuICpcbiAqIEBjbGFzcyBGb2N1c0V2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBGb2N1c0V2ZW50KGV2KSB7XG4gICAgLy8gW0NvbnN0cnVjdG9yKERPTVN0cmluZyB0eXBlQXJnLCBvcHRpb25hbCBGb2N1c0V2ZW50SW5pdCBmb2N1c0V2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBGb2N1c0V2ZW50IDogVUlFdmVudCB7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBFdmVudFRhcmdldD8gcmVsYXRlZFRhcmdldDtcbiAgICAvLyB9O1xuXG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcbn1cblxuRm9jdXNFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVJRXZlbnQucHJvdG90eXBlKTtcbkZvY3VzRXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gRm9jdXNFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbkZvY3VzRXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnRm9jdXNFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZvY3VzRXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtJbnB1dCBFdmVudHNdKGh0dHA6Ly93M2MuZ2l0aHViLmlvL2VkaXRpbmctZXhwbGFpbmVyL2lucHV0LWV2ZW50cy5odG1sI2lkbC1kZWYtSW5wdXRFdmVudCkuXG4gKlxuICogQGNsYXNzIElucHV0RXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIElucHV0RXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIElucHV0RXZlbnRJbml0IGlucHV0RXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIElucHV0RXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyBpbnB1dFR5cGU7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBET01TdHJpbmcgZGF0YTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICBpc0NvbXBvc2luZztcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIFJhbmdlICAgICB0YXJnZXRSYW5nZTtcbiAgICAvLyB9O1xuXG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lICAgIElucHV0RXZlbnQjaW5wdXRUeXBlXG4gICAgICogQHR5cGUgICAgU3RyaW5nXG4gICAgICovXG4gICAgdGhpcy5pbnB1dFR5cGUgPSBldi5pbnB1dFR5cGU7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSAgICBJbnB1dEV2ZW50I2RhdGFcbiAgICAgKiBAdHlwZSAgICBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLmRhdGEgPSBldi5kYXRhO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgICAgSW5wdXRFdmVudCNpc0NvbXBvc2luZ1xuICAgICAqIEB0eXBlICAgIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLmlzQ29tcG9zaW5nID0gZXYuaXNDb21wb3Npbmc7XG5cbiAgICAvKipcbiAgICAgKiAqKkxpbWl0ZWQgYnJvd3NlciBzdXBwb3J0KiouXG4gICAgICpcbiAgICAgKiBAbmFtZSAgICBJbnB1dEV2ZW50I3RhcmdldFJhbmdlXG4gICAgICogQHR5cGUgICAgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMudGFyZ2V0UmFuZ2UgPSBldi50YXJnZXRSYW5nZTtcbn1cblxuSW5wdXRFdmVudC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFVJRXZlbnQucHJvdG90eXBlKTtcbklucHV0RXZlbnQucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gSW5wdXRFdmVudDtcblxuLyoqXG4gKiBSZXR1cm4gdGhlIG5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7U3RyaW5nfSBOYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKi9cbklucHV0RXZlbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnSW5wdXRFdmVudCc7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0RXZlbnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBVSUV2ZW50ID0gcmVxdWlyZSgnLi9VSUV2ZW50Jyk7XG5cbi8qKlxuICogU2VlIFtVSSBFdmVudHMgKGZvcm1lcmx5IERPTSBMZXZlbCAzIEV2ZW50cyldKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTUvV0QtdWlldmVudHMtMjAxNTA0MjgvI2V2ZW50cy1rZXlib2FyZGV2ZW50cykuXG4gKlxuICogQGNsYXNzIEtleWJvYXJkRXZlbnRcbiAqIEBhdWdtZW50cyBVSUV2ZW50XG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXYgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIEtleWJvYXJkRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGVBcmcsIG9wdGlvbmFsIEtleWJvYXJkRXZlbnRJbml0IGtleWJvYXJkRXZlbnRJbml0RGljdCldXG4gICAgLy8gaW50ZXJmYWNlIEtleWJvYXJkRXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgLy8gS2V5TG9jYXRpb25Db2RlXG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0tFWV9MT0NBVElPTl9TVEFOREFSRCA9IDB4MDA7XG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0tFWV9MT0NBVElPTl9MRUZUID0gMHgwMTtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fS0VZX0xPQ0FUSU9OX1JJR0hUID0gMHgwMjtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fS0VZX0xPQ0FUSU9OX05VTVBBRCA9IDB4MDM7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBET01TdHJpbmcgICAgIGtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIERPTVN0cmluZyAgICAgY29kZTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIHVuc2lnbmVkIGxvbmcgbG9jYXRpb247XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIGN0cmxLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIHNoaWZ0S2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgICAgICBhbHRLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIG1ldGFLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgIHJlcGVhdDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgaXNDb21wb3Npbmc7XG4gICAgLy8gICAgIGJvb2xlYW4gZ2V0TW9kaWZpZXJTdGF0ZSAoRE9NU3RyaW5nIGtleUFyZyk7XG4gICAgLy8gfTtcblxuICAgIFVJRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I0RPTV9LRVlfTE9DQVRJT05fU1RBTkRBUkRcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9LRVlfTE9DQVRJT05fU1RBTkRBUkQgPSAweDAwO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNET01fS0VZX0xPQ0FUSU9OX0xFRlRcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9LRVlfTE9DQVRJT05fTEVGVCA9IDB4MDE7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I0RPTV9LRVlfTE9DQVRJT05fUklHSFRcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9LRVlfTE9DQVRJT05fUklHSFQgPSAweDAyO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNET01fS0VZX0xPQ0FUSU9OX05VTVBBRFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0tFWV9MT0NBVElPTl9OVU1QQUQgPSAweDAzO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNrZXlcbiAgICAgKiBAdHlwZSBTdHJpbmdcbiAgICAgKi9cbiAgICB0aGlzLmtleSA9IGV2LmtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjY29kZVxuICAgICAqIEB0eXBlIFN0cmluZ1xuICAgICAqL1xuICAgIHRoaXMuY29kZSA9IGV2LmNvZGU7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I2xvY2F0aW9uXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5sb2NhdGlvbiA9IGV2LmxvY2F0aW9uO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNjdHJsS2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuY3RybEtleSA9IGV2LmN0cmxLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I3NoaWZ0S2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuc2hpZnRLZXkgPSBldi5zaGlmdEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjYWx0S2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuYWx0S2V5ID0gZXYuYWx0S2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNtZXRhS2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMubWV0YUtleSA9IGV2Lm1ldGFLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBLZXlib2FyZEV2ZW50I3JlcGVhdFxuICAgICAqIEB0eXBlIEJvb2xlYW5cbiAgICAgKi9cbiAgICB0aGlzLnJlcGVhdCA9IGV2LnJlcGVhdDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIEtleWJvYXJkRXZlbnQjaXNDb21wb3NpbmdcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5pc0NvbXBvc2luZyA9IGV2LmlzQ29tcG9zaW5nO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgS2V5Ym9hcmRFdmVudCNrZXlDb2RlXG4gICAgICogQHR5cGUgU3RyaW5nXG4gICAgICogQGRlcHJlY2F0ZWRcbiAgICAgKi9cbiAgICB0aGlzLmtleUNvZGUgPSBldi5rZXlDb2RlO1xufVxuXG5LZXlib2FyZEV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuS2V5Ym9hcmRFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBLZXlib2FyZEV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuS2V5Ym9hcmRFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdLZXlib2FyZEV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gS2V5Ym9hcmRFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLW1vdXNlZXZlbnRzKS5cbiAqXG4gKiBAY2xhc3MgS2V5Ym9hcmRFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gTW91c2VFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgTW91c2VFdmVudEluaXQgbW91c2VFdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgTW91c2VFdmVudCA6IFVJRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICAgICAgICAgc2NyZWVuWDtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGxvbmcgICAgICAgICAgIHNjcmVlblk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBsb25nICAgICAgICAgICBjbGllbnRYO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICAgICAgICAgY2xpZW50WTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgIGN0cmxLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgICAgICBzaGlmdEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgIGFsdEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICAgICAgIG1ldGFLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBzaG9ydCAgICAgICAgICBidXR0b247XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBFdmVudFRhcmdldD8gICByZWxhdGVkVGFyZ2V0O1xuICAgIC8vICAgICAvLyBJbnRyb2R1Y2VkIGluIHRoaXMgc3BlY2lmaWNhdGlvblxuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgdW5zaWduZWQgc2hvcnQgYnV0dG9ucztcbiAgICAvLyAgICAgYm9vbGVhbiBnZXRNb2RpZmllclN0YXRlIChET01TdHJpbmcga2V5QXJnKTtcbiAgICAvLyB9O1xuXG4gICAgVUlFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjc2NyZWVuWFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuc2NyZWVuWCA9IGV2LnNjcmVlblg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I3NjcmVlbllcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnNjcmVlblkgPSBldi5zY3JlZW5ZO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNjbGllbnRYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5jbGllbnRYID0gZXYuY2xpZW50WDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjY2xpZW50WVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuY2xpZW50WSA9IGV2LmNsaWVudFk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I2N0cmxLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5jdHJsS2V5ID0gZXYuY3RybEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIE1vdXNlRXZlbnQjc2hpZnRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5zaGlmdEtleSA9IGV2LnNoaWZ0S2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgTW91c2VFdmVudCNhbHRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5hbHRLZXkgPSBldi5hbHRLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBNb3VzZUV2ZW50I21ldGFLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5tZXRhS2V5ID0gZXYubWV0YUtleTtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjYnV0dG9uXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5idXR0b24gPSBldi5idXR0b247XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I2J1dHRvbnNcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmJ1dHRvbnMgPSBldi5idXR0b25zO1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCNwYWdlWFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMucGFnZVggPSBldi5wYWdlWDtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjcGFnZVlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnBhZ2VZID0gZXYucGFnZVk7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I3hcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnggPSBldi54O1xuXG4gICAgLyoqXG4gICAgICogQHR5cGUgTW91c2VFdmVudCN5XG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy55ID0gZXYueTtcblxuICAgIC8qKlxuICAgICAqIEB0eXBlIE1vdXNlRXZlbnQjb2Zmc2V0WFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMub2Zmc2V0WCA9IGV2Lm9mZnNldFg7XG5cbiAgICAvKipcbiAgICAgKiBAdHlwZSBNb3VzZUV2ZW50I29mZnNldFlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLm9mZnNldFkgPSBldi5vZmZzZXRZO1xufVxuXG5Nb3VzZUV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuTW91c2VFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBNb3VzZUV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuTW91c2VFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdNb3VzZUV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTW91c2VFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFVJRXZlbnQgPSByZXF1aXJlKCcuL1VJRXZlbnQnKTtcblxudmFyIEVNUFRZX0FSUkFZID0gW107XG5cbi8qKlxuICogU2VlIFtUb3VjaCBJbnRlcmZhY2VdKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTMvUkVDLXRvdWNoLWV2ZW50cy0yMDEzMTAxMC8jdG91Y2gtaW50ZXJmYWNlKS5cbiAqXG4gKiBAY2xhc3MgVG91Y2hcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtIHtUb3VjaH0gdG91Y2ggVGhlIG5hdGl2ZSBUb3VjaCBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIFRvdWNoKHRvdWNoKSB7XG4gICAgLy8gaW50ZXJmYWNlIFRvdWNoIHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGxvbmcgICAgICAgIGlkZW50aWZpZXI7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBFdmVudFRhcmdldCB0YXJnZXQ7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBzY3JlZW5YO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgc2NyZWVuWTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgIGNsaWVudFg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBjbGllbnRZO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgcGFnZVg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICBwYWdlWTtcbiAgICAvLyB9O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjaWRlbnRpZmllclxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuaWRlbnRpZmllciA9IHRvdWNoLmlkZW50aWZpZXI7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNzY3JlZW5YXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5zY3JlZW5YID0gdG91Y2guc2NyZWVuWDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI3NjcmVlbllcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnNjcmVlblkgPSB0b3VjaC5zY3JlZW5ZO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjY2xpZW50WFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuY2xpZW50WCA9IHRvdWNoLmNsaWVudFg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaCNjbGllbnRZXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5jbGllbnRZID0gdG91Y2guY2xpZW50WTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoI3BhZ2VYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5wYWdlWCA9IHRvdWNoLnBhZ2VYO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2gjcGFnZVlcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLnBhZ2VZID0gdG91Y2gucGFnZVk7XG59XG5cblxuLyoqXG4gKiBOb3JtYWxpemVzIHRoZSBicm93c2VyJ3MgbmF0aXZlIFRvdWNoTGlzdCBieSBjb252ZXJ0aW5nIGl0IGludG8gYW4gYXJyYXkgb2ZcbiAqIG5vcm1hbGl6ZWQgVG91Y2ggb2JqZWN0cy5cbiAqXG4gKiBAbWV0aG9kICBjbG9uZVRvdWNoTGlzdFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0gIHtUb3VjaExpc3R9IHRvdWNoTGlzdCAgICBUaGUgbmF0aXZlIFRvdWNoTGlzdCBhcnJheS5cbiAqIEByZXR1cm4ge0FycmF5LjxUb3VjaD59ICAgICAgICAgIEFuIGFycmF5IG9mIG5vcm1hbGl6ZWQgVG91Y2ggb2JqZWN0cy5cbiAqL1xuZnVuY3Rpb24gY2xvbmVUb3VjaExpc3QodG91Y2hMaXN0KSB7XG4gICAgaWYgKCF0b3VjaExpc3QpIHJldHVybiBFTVBUWV9BUlJBWTtcbiAgICAvLyBpbnRlcmZhY2UgVG91Y2hMaXN0IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIHVuc2lnbmVkIGxvbmcgbGVuZ3RoO1xuICAgIC8vICAgICBnZXR0ZXIgVG91Y2g/IGl0ZW0gKHVuc2lnbmVkIGxvbmcgaW5kZXgpO1xuICAgIC8vIH07XG5cbiAgICB2YXIgdG91Y2hMaXN0QXJyYXkgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRvdWNoTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICB0b3VjaExpc3RBcnJheVtpXSA9IG5ldyBUb3VjaCh0b3VjaExpc3RbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gdG91Y2hMaXN0QXJyYXk7XG59XG5cbi8qKlxuICogU2VlIFtUb3VjaCBFdmVudCBJbnRlcmZhY2VdKGh0dHA6Ly93d3cudzMub3JnL1RSLzIwMTMvUkVDLXRvdWNoLWV2ZW50cy0yMDEzMTAxMC8jdG91Y2hldmVudC1pbnRlcmZhY2UpLlxuICpcbiAqIEBjbGFzcyBUb3VjaEV2ZW50XG4gKiBAYXVnbWVudHMgVUlFdmVudFxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2IFRoZSBuYXRpdmUgRE9NIGV2ZW50LlxuICovXG5mdW5jdGlvbiBUb3VjaEV2ZW50KGV2KSB7XG4gICAgLy8gaW50ZXJmYWNlIFRvdWNoRXZlbnQgOiBVSUV2ZW50IHtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIFRvdWNoTGlzdCB0b3VjaGVzO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgVG91Y2hMaXN0IHRhcmdldFRvdWNoZXM7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBUb3VjaExpc3QgY2hhbmdlZFRvdWNoZXM7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgYWx0S2V5O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgYm9vbGVhbiAgIG1ldGFLZXk7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBib29sZWFuICAgY3RybEtleTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGJvb2xlYW4gICBzaGlmdEtleTtcbiAgICAvLyB9O1xuICAgIFVJRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I3RvdWNoZXNcbiAgICAgKiBAdHlwZSBBcnJheS48VG91Y2g+XG4gICAgICovXG4gICAgdGhpcy50b3VjaGVzID0gY2xvbmVUb3VjaExpc3QoZXYudG91Y2hlcyk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I3RhcmdldFRvdWNoZXNcbiAgICAgKiBAdHlwZSBBcnJheS48VG91Y2g+XG4gICAgICovXG4gICAgdGhpcy50YXJnZXRUb3VjaGVzID0gY2xvbmVUb3VjaExpc3QoZXYudGFyZ2V0VG91Y2hlcyk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I2NoYW5nZWRUb3VjaGVzXG4gICAgICogQHR5cGUgVG91Y2hMaXN0XG4gICAgICovXG4gICAgdGhpcy5jaGFuZ2VkVG91Y2hlcyA9IGNsb25lVG91Y2hMaXN0KGV2LmNoYW5nZWRUb3VjaGVzKTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjYWx0S2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMuYWx0S2V5ID0gZXYuYWx0S2V5O1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgVG91Y2hFdmVudCNtZXRhS2V5XG4gICAgICogQHR5cGUgQm9vbGVhblxuICAgICAqL1xuICAgIHRoaXMubWV0YUtleSA9IGV2Lm1ldGFLZXk7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBUb3VjaEV2ZW50I2N0cmxLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5jdHJsS2V5ID0gZXYuY3RybEtleTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFRvdWNoRXZlbnQjc2hpZnRLZXlcbiAgICAgKiBAdHlwZSBCb29sZWFuXG4gICAgICovXG4gICAgdGhpcy5zaGlmdEtleSA9IGV2LnNoaWZ0S2V5O1xufVxuXG5Ub3VjaEV2ZW50LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoVUlFdmVudC5wcm90b3R5cGUpO1xuVG91Y2hFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBUb3VjaEV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuVG91Y2hFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdUb3VjaEV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVG91Y2hFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50ID0gcmVxdWlyZSgnLi9FdmVudCcpO1xuXG4vKipcbiAqIFNlZSBbVUkgRXZlbnRzIChmb3JtZXJseSBET00gTGV2ZWwgMyBFdmVudHMpXShodHRwOi8vd3d3LnczLm9yZy9UUi8yMDE1L1dELXVpZXZlbnRzLTIwMTUwNDI4KS5cbiAqXG4gKiBAY2xhc3MgVUlFdmVudFxuICogQGF1Z21lbnRzIEV2ZW50XG4gKlxuICogQHBhcmFtICB7RXZlbnR9IGV2ICAgVGhlIG5hdGl2ZSBET00gZXZlbnQuXG4gKi9cbmZ1bmN0aW9uIFVJRXZlbnQoZXYpIHtcbiAgICAvLyBbQ29uc3RydWN0b3IoRE9NU3RyaW5nIHR5cGUsIG9wdGlvbmFsIFVJRXZlbnRJbml0IGV2ZW50SW5pdERpY3QpXVxuICAgIC8vIGludGVyZmFjZSBVSUV2ZW50IDogRXZlbnQge1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgV2luZG93PyB2aWV3O1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgbG9uZyAgICBkZXRhaWw7XG4gICAgLy8gfTtcbiAgICBFdmVudC5jYWxsKHRoaXMsIGV2KTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFVJRXZlbnQjZGV0YWlsXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5kZXRhaWwgPSBldi5kZXRhaWw7XG59XG5cblVJRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudC5wcm90b3R5cGUpO1xuVUlFdmVudC5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBVSUV2ZW50O1xuXG4vKipcbiAqIFJldHVybiB0aGUgbmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdGhlIGV2ZW50IHR5cGVcbiAqL1xuVUlFdmVudC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdVSUV2ZW50Jztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVUlFdmVudDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIE1vdXNlRXZlbnQgPSByZXF1aXJlKCcuL01vdXNlRXZlbnQnKTtcblxuLyoqXG4gKiBTZWUgW1VJIEV2ZW50cyAoZm9ybWVybHkgRE9NIExldmVsIDMgRXZlbnRzKV0oaHR0cDovL3d3dy53My5vcmcvVFIvMjAxNS9XRC11aWV2ZW50cy0yMDE1MDQyOC8jZXZlbnRzLXdoZWVsZXZlbnRzKS5cbiAqXG4gKiBAY2xhc3MgV2hlZWxFdmVudFxuICogQGF1Z21lbnRzIFVJRXZlbnRcbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldiBUaGUgbmF0aXZlIERPTSBldmVudC5cbiAqL1xuZnVuY3Rpb24gV2hlZWxFdmVudChldikge1xuICAgIC8vIFtDb25zdHJ1Y3RvcihET01TdHJpbmcgdHlwZUFyZywgb3B0aW9uYWwgV2hlZWxFdmVudEluaXQgd2hlZWxFdmVudEluaXREaWN0KV1cbiAgICAvLyBpbnRlcmZhY2UgV2hlZWxFdmVudCA6IE1vdXNlRXZlbnQge1xuICAgIC8vICAgICAvLyBEZWx0YU1vZGVDb2RlXG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0RFTFRBX1BJWEVMID0gMHgwMDtcbiAgICAvLyAgICAgY29uc3QgdW5zaWduZWQgbG9uZyBET01fREVMVEFfTElORSA9IDB4MDE7XG4gICAgLy8gICAgIGNvbnN0IHVuc2lnbmVkIGxvbmcgRE9NX0RFTFRBX1BBR0UgPSAweDAyO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgZG91YmxlICAgICAgICBkZWx0YVg7XG4gICAgLy8gICAgIHJlYWRvbmx5ICAgIGF0dHJpYnV0ZSBkb3VibGUgICAgICAgIGRlbHRhWTtcbiAgICAvLyAgICAgcmVhZG9ubHkgICAgYXR0cmlidXRlIGRvdWJsZSAgICAgICAgZGVsdGFaO1xuICAgIC8vICAgICByZWFkb25seSAgICBhdHRyaWJ1dGUgdW5zaWduZWQgbG9uZyBkZWx0YU1vZGU7XG4gICAgLy8gfTtcblxuICAgIE1vdXNlRXZlbnQuY2FsbCh0aGlzLCBldik7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I0RPTV9ERUxUQV9QSVhFTFxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuRE9NX0RFTFRBX1BJWEVMID0gMHgwMDtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjRE9NX0RFTFRBX0xJTkVcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9ERUxUQV9MSU5FID0gMHgwMTtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjRE9NX0RFTFRBX1BBR0VcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLkRPTV9ERUxUQV9QQUdFID0gMHgwMjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjZGVsdGFYXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5kZWx0YVggPSBldi5kZWx0YVg7XG5cbiAgICAvKipcbiAgICAgKiBAbmFtZSBXaGVlbEV2ZW50I2RlbHRhWVxuICAgICAqIEB0eXBlIE51bWJlclxuICAgICAqL1xuICAgIHRoaXMuZGVsdGFZID0gZXYuZGVsdGFZO1xuXG4gICAgLyoqXG4gICAgICogQG5hbWUgV2hlZWxFdmVudCNkZWx0YVpcbiAgICAgKiBAdHlwZSBOdW1iZXJcbiAgICAgKi9cbiAgICB0aGlzLmRlbHRhWiA9IGV2LmRlbHRhWjtcblxuICAgIC8qKlxuICAgICAqIEBuYW1lIFdoZWVsRXZlbnQjZGVsdGFNb2RlXG4gICAgICogQHR5cGUgTnVtYmVyXG4gICAgICovXG4gICAgdGhpcy5kZWx0YU1vZGUgPSBldi5kZWx0YU1vZGU7XG59XG5cbldoZWVsRXZlbnQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShNb3VzZUV2ZW50LnByb3RvdHlwZSk7XG5XaGVlbEV2ZW50LnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFdoZWVsRXZlbnQ7XG5cbi8qKlxuICogUmV0dXJuIHRoZSBuYW1lIG9mIHRoZSBldmVudCB0eXBlXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1N0cmluZ30gTmFtZSBvZiB0aGUgZXZlbnQgdHlwZVxuICovXG5XaGVlbEV2ZW50LnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ1doZWVsRXZlbnQnO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBXaGVlbEV2ZW50O1xuIiwiLy8gaHR0cDovL3BhdWxpcmlzaC5jb20vMjAxMS9yZXF1ZXN0YW5pbWF0aW9uZnJhbWUtZm9yLXNtYXJ0LWFuaW1hdGluZy9cbi8vIGh0dHA6Ly9teS5vcGVyYS5jb20vZW1vbGxlci9ibG9nLzIwMTEvMTIvMjAvcmVxdWVzdGFuaW1hdGlvbmZyYW1lLWZvci1zbWFydC1lci1hbmltYXRpbmdcbi8vIHJlcXVlc3RBbmltYXRpb25GcmFtZSBwb2x5ZmlsbCBieSBFcmlrIE3DtmxsZXIuIGZpeGVzIGZyb20gUGF1bCBJcmlzaCBhbmQgVGlubyBaaWpkZWxcbi8vIE1JVCBsaWNlbnNlXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIGxhc3RUaW1lID0gMDtcbnZhciB2ZW5kb3JzID0gWydtcycsICdtb3onLCAnd2Via2l0JywgJ28nXTtcblxudmFyIHJBRiwgY0FGO1xuXG5pZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcpIHtcbiAgICByQUYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuICAgIGNBRiA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fCB3aW5kb3cuY2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuICAgIGZvciAodmFyIHggPSAwOyB4IDwgdmVuZG9ycy5sZW5ndGggJiYgIXJBRjsgKyt4KSB7XG4gICAgICAgIHJBRiA9IHdpbmRvd1t2ZW5kb3JzW3hdICsgJ1JlcXVlc3RBbmltYXRpb25GcmFtZSddO1xuICAgICAgICBjQUYgPSB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUnXSB8fFxuICAgICAgICAgICAgICB3aW5kb3dbdmVuZG9yc1t4XSArICdDYW5jZWxBbmltYXRpb25GcmFtZSddO1xuICAgIH1cblxuICAgIGlmIChyQUYgJiYgIWNBRikge1xuICAgICAgICAvLyBjQUYgbm90IHN1cHBvcnRlZC5cbiAgICAgICAgLy8gRmFsbCBiYWNrIHRvIHNldEludGVydmFsIGZvciBub3cgKHZlcnkgcmFyZSkuXG4gICAgICAgIHJBRiA9IG51bGw7XG4gICAgfVxufVxuXG5pZiAoIXJBRikge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdyA/IERhdGUubm93IDogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgfTtcblxuICAgIHJBRiA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBjdXJyVGltZSA9IG5vdygpO1xuICAgICAgICB2YXIgdGltZVRvQ2FsbCA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnJUaW1lIC0gbGFzdFRpbWUpKTtcbiAgICAgICAgdmFyIGlkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhjdXJyVGltZSArIHRpbWVUb0NhbGwpO1xuICAgICAgICB9LCB0aW1lVG9DYWxsKTtcbiAgICAgICAgbGFzdFRpbWUgPSBjdXJyVGltZSArIHRpbWVUb0NhbGw7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9O1xuXG4gICAgY0FGID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIGNsZWFyVGltZW91dChpZCk7XG4gICAgfTtcbn1cblxudmFyIGFuaW1hdGlvbkZyYW1lID0ge1xuICAgIC8qKlxuICAgICAqIENyb3NzIGJyb3dzZXIgdmVyc2lvbiBvZiBbcmVxdWVzdEFuaW1hdGlvbkZyYW1lXXtAbGluayBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvd2luZG93L3JlcXVlc3RBbmltYXRpb25GcmFtZX0uXG4gICAgICpcbiAgICAgKiBVc2VkIGJ5IEVuZ2luZSBpbiBvcmRlciB0byBlc3RhYmxpc2ggYSByZW5kZXIgbG9vcC5cbiAgICAgKlxuICAgICAqIElmIG5vICh2ZW5kb3IgcHJlZml4ZWQgdmVyc2lvbiBvZikgYHJlcXVlc3RBbmltYXRpb25GcmFtZWAgaXMgYXZhaWxhYmxlLFxuICAgICAqIGBzZXRUaW1lb3V0YCB3aWxsIGJlIHVzZWQgaW4gb3JkZXIgdG8gZW11bGF0ZSBhIHJlbmRlciBsb29wIHJ1bm5pbmcgYXRcbiAgICAgKiBhcHByb3hpbWF0ZWx5IDYwIGZyYW1lcyBwZXIgc2Vjb25kLlxuICAgICAqXG4gICAgICogQG1ldGhvZCAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gICAgICpcbiAgICAgKiBAcGFyYW0gICB7RnVuY3Rpb259ICBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBpbnZva2VkIG9uIHRoZSBuZXh0IGZyYW1lLlxuICAgICAqIEByZXR1cm4gIHtOdW1iZXJ9ICAgIHJlcXVlc3RJZCB0byBiZSB1c2VkIHRvIGNhbmNlbCB0aGUgcmVxdWVzdCB1c2luZ1xuICAgICAqICAgICAgICAgICAgICAgICAgICAgIHtAbGluayBjYW5jZWxBbmltYXRpb25GcmFtZX0uXG4gICAgICovXG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lOiByQUYsXG5cbiAgICAvKipcbiAgICAgKiBDcm9zcyBicm93c2VyIHZlcnNpb24gb2YgW2NhbmNlbEFuaW1hdGlvbkZyYW1lXXtAbGluayBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvd2luZG93L2NhbmNlbEFuaW1hdGlvbkZyYW1lfS5cbiAgICAgKlxuICAgICAqIENhbmNlbHMgYSBwcmV2aW91c2x5IHVzaW5nIFtyZXF1ZXN0QW5pbWF0aW9uRnJhbWVde0BsaW5rIGFuaW1hdGlvbkZyYW1lI3JlcXVlc3RBbmltYXRpb25GcmFtZX1cbiAgICAgKiBzY2hlZHVsZWQgcmVxdWVzdC5cbiAgICAgKlxuICAgICAqIFVzZWQgZm9yIGltbWVkaWF0ZWx5IHN0b3BwaW5nIHRoZSByZW5kZXIgbG9vcCB3aXRoaW4gdGhlIEVuZ2luZS5cbiAgICAgKlxuICAgICAqIEBtZXRob2QgIGNhbmNlbEFuaW1hdGlvbkZyYW1lXG4gICAgICpcbiAgICAgKiBAcGFyYW0gICB7TnVtYmVyfSAgICByZXF1ZXN0SWQgb2YgdGhlIHNjaGVkdWxlZCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqICAgICAgICAgICAgICAgICAgICAgIHJldHVybmVkIGJ5IFtyZXF1ZXN0QW5pbWF0aW9uRnJhbWVde0BsaW5rIGFuaW1hdGlvbkZyYW1lI3JlcXVlc3RBbmltYXRpb25GcmFtZX0uXG4gICAgICovXG4gICAgY2FuY2VsQW5pbWF0aW9uRnJhbWU6IGNBRlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBhbmltYXRpb25GcmFtZTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKiBcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKiBcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqIFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICogXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZTogcmVxdWlyZSgnLi9hbmltYXRpb25GcmFtZScpLnJlcXVlc3RBbmltYXRpb25GcmFtZSxcbiAgICBjYW5jZWxBbmltYXRpb25GcmFtZTogcmVxdWlyZSgnLi9hbmltYXRpb25GcmFtZScpLmNhbmNlbEFuaW1hdGlvbkZyYW1lXG59O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcG9seWZpbGxzID0gcmVxdWlyZSgnLi4vcG9seWZpbGxzJyk7XG52YXIgckFGID0gcG9seWZpbGxzLnJlcXVlc3RBbmltYXRpb25GcmFtZTtcbnZhciBjQUYgPSBwb2x5ZmlsbHMuY2FuY2VsQW5pbWF0aW9uRnJhbWU7XG5cbi8qKlxuICogQm9vbGVhbiBjb25zdGFudCBpbmRpY2F0aW5nIHdoZXRoZXIgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgaGFzIGFjY2Vzc1xuICogdG8gdGhlIGRvY3VtZW50LiBUaGUgZG9jdW1lbnQgaXMgYmVpbmcgdXNlZCBpbiBvcmRlciB0byBzdWJzY3JpYmUgZm9yXG4gKiB2aXNpYmlsaXR5Y2hhbmdlIGV2ZW50cyB1c2VkIGZvciBub3JtYWxpemluZyB0aGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcFxuICogdGltZSB3aGVuIGUuZy4gd2hlbiBzd2l0Y2hpbmcgdGFicy5cbiAqXG4gKiBAY29uc3RhbnRcbiAqIEB0eXBlIHtCb29sZWFufVxuICovXG52YXIgRE9DVU1FTlRfQUNDRVNTID0gdHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJztcblxuaWYgKERPQ1VNRU5UX0FDQ0VTUykge1xuICAgIHZhciBWRU5ET1JfSElEREVOLCBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0U7XG5cbiAgICAvLyBPcGVyYSAxMi4xMCBhbmQgRmlyZWZveCAxOCBhbmQgbGF0ZXIgc3VwcG9ydFxuICAgIGlmICh0eXBlb2YgZG9jdW1lbnQuaGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBWRU5ET1JfSElEREVOID0gJ2hpZGRlbic7XG4gICAgICAgIFZFTkRPUl9WSVNJQklMSVRZX0NIQU5HRSA9ICd2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG4gICAgZWxzZSBpZiAodHlwZW9mIGRvY3VtZW50Lm1vekhpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgVkVORE9SX0hJRERFTiA9ICdtb3pIaWRkZW4nO1xuICAgICAgICBWRU5ET1JfVklTSUJJTElUWV9DSEFOR0UgPSAnbW96dmlzaWJpbGl0eWNoYW5nZSc7XG4gICAgfVxuICAgIGVsc2UgaWYgKHR5cGVvZiBkb2N1bWVudC5tc0hpZGRlbiAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgVkVORE9SX0hJRERFTiA9ICdtc0hpZGRlbic7XG4gICAgICAgIFZFTkRPUl9WSVNJQklMSVRZX0NIQU5HRSA9ICdtc3Zpc2liaWxpdHljaGFuZ2UnO1xuICAgIH1cbiAgICBlbHNlIGlmICh0eXBlb2YgZG9jdW1lbnQud2Via2l0SGlkZGVuICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICBWRU5ET1JfSElEREVOID0gJ3dlYmtpdEhpZGRlbic7XG4gICAgICAgIFZFTkRPUl9WSVNJQklMSVRZX0NIQU5HRSA9ICd3ZWJraXR2aXNpYmlsaXR5Y2hhbmdlJztcbiAgICB9XG59XG5cbi8qKlxuICogUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBjbGFzcyB1c2VkIGZvciB1cGRhdGluZyBvYmplY3RzIG9uIGEgZnJhbWUtYnktZnJhbWUuXG4gKiBTeW5jaHJvbml6ZXMgdGhlIGB1cGRhdGVgIG1ldGhvZCBpbnZvY2F0aW9ucyB0byB0aGUgcmVmcmVzaCByYXRlIG9mIHRoZVxuICogc2NyZWVuLiBNYW5hZ2VzIHRoZSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYC1sb29wIGJ5IG5vcm1hbGl6aW5nIHRoZSBwYXNzZWQgaW5cbiAqIHRpbWVzdGFtcCB3aGVuIHN3aXRjaGluZyB0YWJzLlxuICpcbiAqIEBjbGFzcyBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wXG4gKi9cbmZ1bmN0aW9uIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AoKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgIC8vIFJlZmVyZW5jZXMgdG8gb2JqZWN0cyB0byBiZSB1cGRhdGVkIG9uIG5leHQgZnJhbWUuXG4gICAgdGhpcy5fdXBkYXRlcyA9IFtdO1xuXG4gICAgdGhpcy5fbG9vcGVyID0gZnVuY3Rpb24odGltZSkge1xuICAgICAgICBfdGhpcy5sb29wKHRpbWUpO1xuICAgIH07XG4gICAgdGhpcy5fdGltZSA9IDA7XG4gICAgdGhpcy5fc3RvcHBlZEF0ID0gMDtcbiAgICB0aGlzLl9zbGVlcCA9IDA7XG5cbiAgICAvLyBJbmRpY2F0ZXMgd2hldGhlciB0aGUgZW5naW5lIHNob3VsZCBiZSByZXN0YXJ0ZWQgd2hlbiB0aGUgdGFiLyB3aW5kb3cgaXNcbiAgICAvLyBiZWluZyBmb2N1c2VkIGFnYWluICh2aXNpYmlsaXR5IGNoYW5nZSkuXG4gICAgdGhpcy5fc3RhcnRPblZpc2liaWxpdHlDaGFuZ2UgPSB0cnVlO1xuXG4gICAgLy8gcmVxdWVzdElkIGFzIHJldHVybmVkIGJ5IHJlcXVlc3RBbmltYXRpb25GcmFtZSBmdW5jdGlvbjtcbiAgICB0aGlzLl9yQUYgPSBudWxsO1xuXG4gICAgdGhpcy5fc2xlZXBEaWZmID0gdHJ1ZTtcblxuICAgIC8vIFRoZSBlbmdpbmUgaXMgYmVpbmcgc3RhcnRlZCBvbiBpbnN0YW50aWF0aW9uLlxuICAgIC8vIFRPRE8oYWxleGFuZGVyR3VnZWwpXG4gICAgdGhpcy5zdGFydCgpO1xuXG4gICAgLy8gVGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3Agc3VwcG9ydHMgcnVubmluZyBpbiBhIG5vbi1icm93c2VyXG4gICAgLy8gZW52aXJvbm1lbnQgKGUuZy4gV29ya2VyKS5cbiAgICBpZiAoRE9DVU1FTlRfQUNDRVNTKSB7XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoVkVORE9SX1ZJU0lCSUxJVFlfQ0hBTkdFLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIF90aGlzLl9vblZpc2liaWxpdHlDaGFuZ2UoKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEhhbmRsZSB0aGUgc3dpdGNoaW5nIG9mIHRhYnMuXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5fb25WaXNpYmlsaXR5Q2hhbmdlID0gZnVuY3Rpb24gX29uVmlzaWJpbGl0eUNoYW5nZSgpIHtcbiAgICBpZiAoZG9jdW1lbnRbVkVORE9SX0hJRERFTl0pIHtcbiAgICAgICAgdGhpcy5fb25VbmZvY3VzKCk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB0aGlzLl9vbkZvY3VzKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCBhcyBzb29uIGFzIHRoZSB3aW5kb3cvIHRhYiBpcyBiZWluZ1xuICogZm9jdXNlZCBhZnRlciBhIHZpc2liaWx0aXkgY2hhbmdlLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuX29uRm9jdXMgPSBmdW5jdGlvbiBfb25Gb2N1cygpIHtcbiAgICBpZiAodGhpcy5fc3RhcnRPblZpc2liaWxpdHlDaGFuZ2UpIHtcbiAgICAgICAgdGhpcy5fc3RhcnQoKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBmdW5jdGlvbiB0byBiZSBpbnZva2VkIGFzIHNvb24gYXMgdGhlIHdpbmRvdy8gdGFiIGlzIGJlaW5nXG4gKiB1bmZvY3VzZWQgKGhpZGRlbikgYWZ0ZXIgYSB2aXNpYmlsdGl5IGNoYW5nZS5cbiAqXG4gKiBAbWV0aG9kICBfb25Gb2N1c1xuICogQHByaXZhdGVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5fb25VbmZvY3VzID0gZnVuY3Rpb24gX29uVW5mb2N1cygpIHtcbiAgICB0aGlzLl9zdG9wKCk7XG59O1xuXG4vKipcbiAqIFN0YXJ0cyB0aGUgUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC4gV2hlbiBzd2l0Y2hpbmcgdG8gYSBkaWZmZXJudCB0YWIvXG4gKiB3aW5kb3cgKGNoYW5naW5nIHRoZSB2aXNpYmlsdGl5KSwgdGhlIGVuZ2luZSB3aWxsIGJlIHJldGFydGVkIHdoZW4gc3dpdGNoaW5nXG4gKiBiYWNrIHRvIGEgdmlzaWJsZSBzdGF0ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7UmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcH0gdGhpc1xuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uIHN0YXJ0KCkge1xuICAgIGlmICghdGhpcy5fcnVubmluZykge1xuICAgICAgICB0aGlzLl9zdGFydE9uVmlzaWJpbGl0eUNoYW5nZSA9IHRydWU7XG4gICAgICAgIHRoaXMuX3N0YXJ0KCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCB2ZXJzaW9uIG9mIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AncyBzdGFydCBmdW5jdGlvbiwgbm90IGFmZmVjdGluZ1xuICogYmVoYXZpb3Igb24gdmlzaWJpbHR5IGNoYW5nZS5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuX3N0YXJ0ID0gZnVuY3Rpb24gX3N0YXJ0KCkge1xuICAgIHRoaXMuX3J1bm5pbmcgPSB0cnVlO1xuICAgIHRoaXMuX3NsZWVwRGlmZiA9IHRydWU7XG4gICAgdGhpcy5fckFGID0gckFGKHRoaXMuX2xvb3Blcik7XG59O1xuXG4vKipcbiAqIFN0b3BzIHRoZSBSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7UmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcH0gdGhpc1xuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gc3RvcCgpIHtcbiAgICBpZiAodGhpcy5fcnVubmluZykge1xuICAgICAgICB0aGlzLl9zdGFydE9uVmlzaWJpbGl0eUNoYW5nZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLl9zdG9wKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbnRlcm5hbCB2ZXJzaW9uIG9mIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AncyBzdG9wIGZ1bmN0aW9uLCBub3QgYWZmZWN0aW5nXG4gKiBiZWhhdmlvciBvbiB2aXNpYmlsdHkgY2hhbmdlLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuX3N0b3AgPSBmdW5jdGlvbiBfc3RvcCgpIHtcbiAgICB0aGlzLl9ydW5uaW5nID0gZmFsc2U7XG4gICAgdGhpcy5fc3RvcHBlZEF0ID0gdGhpcy5fdGltZTtcblxuICAgIC8vIEJ1ZyBpbiBvbGQgdmVyc2lvbnMgb2YgRnguIEV4cGxpY2l0bHkgY2FuY2VsLlxuICAgIGNBRih0aGlzLl9yQUYpO1xufTtcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgaXMgY3VycmVudGx5IHJ1bm5pbmcgb3Igbm90LlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSBib29sZWFuIHZhbHVlIGluZGljYXRpbmcgd2hldGhlciB0aGVcbiAqIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgaXMgY3VycmVudGx5IHJ1bm5pbmcgb3Igbm90XG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLmlzUnVubmluZyA9IGZ1bmN0aW9uIGlzUnVubmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5fcnVubmluZztcbn07XG5cbi8qKlxuICogVXBkYXRlcyBhbGwgcmVnaXN0ZXJlZCBvYmplY3RzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGltZSBoaWdoIHJlc29sdXRpb24gdGltc3RhbXAgdXNlZCBmb3IgaW52b2tpbmcgdGhlIGB1cGRhdGVgXG4gKiBtZXRob2Qgb24gYWxsIHJlZ2lzdGVyZWQgb2JqZWN0c1xuICpcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUuc3RlcCA9IGZ1bmN0aW9uIHN0ZXAgKHRpbWUpIHtcbiAgICB0aGlzLl90aW1lID0gdGltZTtcbiAgICBpZiAodGhpcy5fc2xlZXBEaWZmKSB7XG4gICAgICAgIHRoaXMuX3NsZWVwICs9IHRpbWUgLSB0aGlzLl9zdG9wcGVkQXQ7XG4gICAgICAgIHRoaXMuX3NsZWVwRGlmZiA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIFRoZSBzYW1lIHRpbWV0YW1wIHdpbGwgYmUgZW1pdHRlZCBpbW1lZGlhdGVseSBiZWZvcmUgYW5kIGFmdGVyIHZpc2liaWxpdHlcbiAgICAvLyBjaGFuZ2UuXG4gICAgdmFyIG5vcm1hbGl6ZWRUaW1lID0gdGltZSAtIHRoaXMuX3NsZWVwO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLl91cGRhdGVzLmxlbmd0aCA7IGkgPCBsZW4gOyBpKyspIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlc1tpXS51cGRhdGUobm9ybWFsaXplZFRpbWUpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogTWV0aG9kIGJlaW5nIGNhbGxlZCBieSBgcmVxdWVzdEFuaW1hdGlvbkZyYW1lYCBvbiBldmVyeSBwYWludC4gSW5kaXJlY3RseVxuICogcmVjdXJzaXZlIGJ5IHNjaGVkdWxpbmcgYSBmdXR1cmUgaW52b2NhdGlvbiBvZiBpdHNlbGYgb24gdGhlIG5leHQgcGFpbnQuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSB0aW1lIGhpZ2ggcmVzb2x1dGlvbiB0aW1zdGFtcCB1c2VkIGZvciBpbnZva2luZyB0aGUgYHVwZGF0ZWBcbiAqIG1ldGhvZCBvbiBhbGwgcmVnaXN0ZXJlZCBvYmplY3RzXG4gKiBAcmV0dXJuIHtSZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wfSB0aGlzXG4gKi9cblJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AucHJvdG90eXBlLmxvb3AgPSBmdW5jdGlvbiBsb29wKHRpbWUpIHtcbiAgICB0aGlzLnN0ZXAodGltZSk7XG4gICAgdGhpcy5fckFGID0gckFGKHRoaXMuX2xvb3Blcik7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyZXMgYW4gdXBkYXRlYWJsZSBvYmplY3Qgd2hpY2ggYHVwZGF0ZWAgbWV0aG9kIHNob3VsZCBiZSBpbnZva2VkIG9uXG4gKiBldmVyeSBwYWludCwgc3RhcnRpbmcgb24gdGhlIG5leHQgcGFpbnQgKGFzc3VtaW5nIHRoZVxuICogUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcCBpcyBydW5uaW5nKS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHVwZGF0ZWFibGUgb2JqZWN0IHRvIGJlIHVwZGF0ZWRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHVwZGF0ZWFibGUudXBkYXRlIHVwZGF0ZSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgb24gdGhlXG4gKiByZWdpc3RlcmVkIG9iamVjdFxuICpcbiAqIEByZXR1cm4ge1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3B9IHRoaXNcbiAqL1xuUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlKHVwZGF0ZWFibGUpIHtcbiAgICBpZiAodGhpcy5fdXBkYXRlcy5pbmRleE9mKHVwZGF0ZWFibGUpID09PSAtMSkge1xuICAgICAgICB0aGlzLl91cGRhdGVzLnB1c2godXBkYXRlYWJsZSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEZXJlZ2lzdGVycyBhbiB1cGRhdGVhYmxlIG9iamVjdCBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgdXNpbmcgYHVwZGF0ZWAgdG8gYmVcbiAqIG5vIGxvbmdlciB1cGRhdGVkLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdXBkYXRlYWJsZSB1cGRhdGVhYmxlIG9iamVjdCBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgdXNpbmdcbiAqIGB1cGRhdGVgXG4gKlxuICogQHJldHVybiB7UmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcH0gdGhpc1xuICovXG5SZXF1ZXN0QW5pbWF0aW9uRnJhbWVMb29wLnByb3RvdHlwZS5ub0xvbmdlclVwZGF0ZSA9IGZ1bmN0aW9uIG5vTG9uZ2VyVXBkYXRlKHVwZGF0ZWFibGUpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl91cGRhdGVzLmluZGV4T2YodXBkYXRlYWJsZSk7XG4gICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUmVxdWVzdEFuaW1hdGlvbkZyYW1lTG9vcDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIENvbnRleHQgPSByZXF1aXJlKCcuL0NvbnRleHQnKTtcbnZhciBpbmplY3RDU1MgPSByZXF1aXJlKCcuL2luamVjdC1jc3MnKTtcbnZhciBDb21tYW5kcyA9IHJlcXVpcmUoJy4uL2NvcmUvQ29tbWFuZHMnKTtcblxuLyoqXG4gKiBJbnN0YW50aWF0ZXMgYSBuZXcgQ29tcG9zaXRvci5cbiAqIFRoZSBDb21wb3NpdG9yIHJlY2VpdmVzIGRyYXcgY29tbWFuZHMgZnJtIHRoZSBVSU1hbmFnZXIgYW5kIHJvdXRlcyB0aGUgdG8gdGhlXG4gKiByZXNwZWN0aXZlIGNvbnRleHQgb2JqZWN0cy5cbiAqXG4gKiBVcG9uIGNyZWF0aW9uLCBpdCBpbmplY3RzIGEgc3R5bGVzaGVldCB1c2VkIGZvciBzdHlsaW5nIHRoZSBpbmRpdmlkdWFsXG4gKiByZW5kZXJlcnMgdXNlZCBpbiB0aGUgY29udGV4dCBvYmplY3RzLlxuICpcbiAqIEBjbGFzcyBDb21wb3NpdG9yXG4gKiBAY29uc3RydWN0b3JcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIENvbXBvc2l0b3IoKSB7XG4gICAgaW5qZWN0Q1NTKCk7XG5cbiAgICB0aGlzLl9jb250ZXh0cyA9IHt9O1xuICAgIHRoaXMuX291dENvbW1hbmRzID0gW107XG4gICAgdGhpcy5faW5Db21tYW5kcyA9IFtdO1xuICAgIHRoaXMuX3RpbWUgPSBudWxsO1xuXG4gICAgdGhpcy5fcmVzaXplZCA9IGZhbHNlO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIF90aGlzLm9uUmVzaXplKCk7XG4gICAgfSk7XG59XG5cbkNvbXBvc2l0b3IucHJvdG90eXBlLm9uUmVzaXplID0gZnVuY3Rpb24gb25SZXNpemUgKCkge1xuICAgIHRoaXMuX3Jlc2l6ZWQgPSB0cnVlO1xuICAgIGZvciAodmFyIHNlbGVjdG9yIGluIHRoaXMuX2NvbnRleHRzKSB7XG4gICAgICAgIHRoaXMuX2NvbnRleHRzW3NlbGVjdG9yXS51cGRhdGVTaXplKCk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIHRpbWUgYmVpbmcgdXNlZCBieSB0aGUgaW50ZXJuYWwgY2xvY2sgbWFuYWdlZCBieVxuICogYEZhbW91c0VuZ2luZWAuXG4gKlxuICogVGhlIHRpbWUgaXMgYmVpbmcgcGFzc2VkIGludG8gY29yZSBieSB0aGUgRW5naW5lIHRocm91Z2ggdGhlIFVJTWFuYWdlci5cbiAqIFNpbmNlIGNvcmUgaGFzIHRoZSBhYmlsaXR5IHRvIHNjYWxlIHRoZSB0aW1lLCB0aGUgdGltZSBuZWVkcyB0byBiZSBwYXNzZWRcbiAqIGJhY2sgdG8gdGhlIHJlbmRlcmluZyBzeXN0ZW0uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge051bWJlcn0gdGltZSBUaGUgY2xvY2sgdGltZSB1c2VkIGluIGNvcmUuXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmdldFRpbWUgPSBmdW5jdGlvbiBnZXRUaW1lKCkge1xuICAgIHJldHVybiB0aGlzLl90aW1lO1xufTtcblxuLyoqXG4gKiBTY2hlZHVsZXMgYW4gZXZlbnQgdG8gYmUgc2VudCB0aGUgbmV4dCB0aW1lIHRoZSBvdXQgY29tbWFuZCBxdWV1ZSBpcyBiZWluZ1xuICogZmx1c2hlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gcGF0aCBSZW5kZXIgcGF0aCB0byB0aGUgbm9kZSB0aGUgZXZlbnQgc2hvdWxkIGJlIHRyaWdnZXJlZFxuICogb24gKCp0YXJnZXRlZCBldmVudCopXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGV2IEV2ZW50IHR5cGVcbiAqIEBwYXJhbSAge09iamVjdH0gcGF5bG9hZCBFdmVudCBvYmplY3QgKHNlcmlhbGl6YWJsZSB1c2luZyBzdHJ1Y3R1cmVkIGNsb25pbmdcbiAqIGFsZ29yaXRobSlcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5zZW5kRXZlbnQgPSBmdW5jdGlvbiBzZW5kRXZlbnQocGF0aCwgZXYsIHBheWxvYWQpIHtcbiAgICB0aGlzLl9vdXRDb21tYW5kcy5wdXNoKENvbW1hbmRzLldJVEgsIHBhdGgsIENvbW1hbmRzLlRSSUdHRVIsIGV2LCBwYXlsb2FkKTtcbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIG1ldGhvZCB1c2VkIGZvciBub3RpZnlpbmcgZXh0ZXJuYWxseVxuICogcmVzaXplZCBjb250ZXh0cyAoZS5nLiBieSByZXNpemluZyB0aGUgYnJvd3NlciB3aW5kb3cpLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBzZWxlY3RvciByZW5kZXIgcGF0aCB0byB0aGUgbm9kZSAoY29udGV4dCkgdGhhdCBzaG91bGQgYmVcbiAqIHJlc2l6ZWRcbiAqIEBwYXJhbSAge0FycmF5fSBzaXplIG5ldyBjb250ZXh0IHNpemVcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5zZW5kUmVzaXplID0gZnVuY3Rpb24gc2VuZFJlc2l6ZSAoc2VsZWN0b3IsIHNpemUpIHtcbiAgICB0aGlzLnNlbmRFdmVudChzZWxlY3RvciwgJ0NPTlRFWFRfUkVTSVpFJywgc2l6ZSk7XG59O1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciBtZXRob2QgdXNlZCBieSBgZHJhd0NvbW1hbmRzYC5cbiAqIFN1YnNlcXVlbnQgY29tbWFuZHMgYXJlIGJlaW5nIGFzc29jaWF0ZWQgd2l0aCB0aGUgbm9kZSBkZWZpbmVkIHRoZSB0aGUgcGF0aFxuICogZm9sbG93aW5nIHRoZSBgV0lUSGAgY29tbWFuZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gaXRlcmF0b3IgcG9zaXRpb24gaW5kZXggd2l0aGluIHRoZSBjb21tYW5kcyBxdWV1ZVxuICogQHBhcmFtICB7QXJyYXl9IGNvbW1hbmRzIHJlbWFpbmluZyBtZXNzYWdlIHF1ZXVlIHJlY2VpdmVkLCB1c2VkIHRvXG4gKiBzaGlmdCBzaW5nbGUgbWVzc2FnZXMgZnJvbVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmhhbmRsZVdpdGggPSBmdW5jdGlvbiBoYW5kbGVXaXRoIChpdGVyYXRvciwgY29tbWFuZHMpIHtcbiAgICB2YXIgcGF0aCA9IGNvbW1hbmRzW2l0ZXJhdG9yXTtcbiAgICB2YXIgcGF0aEFyciA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICB2YXIgY29udGV4dCA9IHRoaXMuZ2V0T3JTZXRDb250ZXh0KHBhdGhBcnIuc2hpZnQoKSk7XG4gICAgcmV0dXJuIGNvbnRleHQucmVjZWl2ZShwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpO1xufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgdGhlIHRvcC1sZXZlbCBDb250ZXh0IGFzc29jaWF0ZWQgd2l0aCB0aGUgcGFzc2VkIGluIGRvY3VtZW50XG4gKiBxdWVyeSBzZWxlY3Rvci4gSWYgbm8gc3VjaCBDb250ZXh0IGV4aXN0cywgYSBuZXcgb25lIHdpbGwgYmUgaW5zdGFudGlhdGVkLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IHNlbGVjdG9yIGRvY3VtZW50IHF1ZXJ5IHNlbGVjdG9yIHVzZWQgZm9yIHJldHJpZXZpbmcgdGhlXG4gKiBET00gbm9kZSB0aGF0IHNob3VsZCBiZSB1c2VkIGFzIGEgcm9vdCBlbGVtZW50IGJ5IHRoZSBDb250ZXh0XG4gKlxuICogQHJldHVybiB7Q29udGV4dH0gY29udGV4dFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS5nZXRPclNldENvbnRleHQgPSBmdW5jdGlvbiBnZXRPclNldENvbnRleHQoc2VsZWN0b3IpIHtcbiAgICBpZiAodGhpcy5fY29udGV4dHNbc2VsZWN0b3JdKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jb250ZXh0c1tzZWxlY3Rvcl07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgY29udGV4dCA9IG5ldyBDb250ZXh0KHNlbGVjdG9yLCB0aGlzKTtcbiAgICAgICAgdGhpcy5fY29udGV4dHNbc2VsZWN0b3JdID0gY29udGV4dDtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxufTtcblxuLyoqXG4gKiBSZXRyaWV2ZXMgYSBjb250ZXh0IG9iamVjdCByZWdpc3RlcmVkIHVuZGVyIHRoZSBwYXNzZWQgaW4gc2VsZWN0b3IuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gc2VsZWN0b3IgICAgUXVlcnkgc2VsZWN0b3IgdGhhdCBoYXMgcHJldmlvdXNseSBiZWVuIHVzZWQgdG9cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVnaXN0ZXIgdGhlIGNvbnRleHQuXG4gKiBAcmV0dXJuIHtDb250ZXh0fSAgICAgICAgICAgIFRoZSByZXBzZWN0aXZlIGNvbnRleHQuXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmdldENvbnRleHQgPSBmdW5jdGlvbiBnZXRDb250ZXh0KHNlbGVjdG9yKSB7XG4gICAgaWYgKHRoaXMuX2NvbnRleHRzW3NlbGVjdG9yXSlcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbnRleHRzW3NlbGVjdG9yXTtcbn07XG5cbi8qKlxuICogUHJvY2Vzc2VzIHRoZSBwcmV2aW91c2x5IHZpYSBgcmVjZWl2ZUNvbW1hbmRzYCB1cGRhdGVkIGluY29taW5nIFwiaW5cIlxuICogY29tbWFuZCBxdWV1ZS5cbiAqIENhbGxlZCBieSBVSU1hbmFnZXIgb24gYSBmcmFtZSBieSBmcmFtZSBiYXNpcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7QXJyYXl9IG91dENvbW1hbmRzIHNldCBvZiBjb21tYW5kcyB0byBiZSBzZW50IGJhY2tcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuZHJhd0NvbW1hbmRzID0gZnVuY3Rpb24gZHJhd0NvbW1hbmRzKCkge1xuICAgIHZhciBjb21tYW5kcyA9IHRoaXMuX2luQ29tbWFuZHM7XG4gICAgdmFyIGxvY2FsSXRlcmF0b3IgPSAwO1xuICAgIHZhciBjb21tYW5kID0gY29tbWFuZHNbbG9jYWxJdGVyYXRvcl07XG4gICAgd2hpbGUgKGNvbW1hbmQpIHtcbiAgICAgICAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgICAgICAgICBjYXNlIENvbW1hbmRzLlRJTUU6XG4gICAgICAgICAgICAgICAgdGhpcy5fdGltZSA9IGNvbW1hbmRzWysrbG9jYWxJdGVyYXRvcl07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIENvbW1hbmRzLldJVEg6XG4gICAgICAgICAgICAgICAgbG9jYWxJdGVyYXRvciA9IHRoaXMuaGFuZGxlV2l0aCgrK2xvY2FsSXRlcmF0b3IsIGNvbW1hbmRzKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgQ29tbWFuZHMuTkVFRF9TSVpFX0ZPUjpcbiAgICAgICAgICAgICAgICB0aGlzLmdpdmVTaXplRm9yKCsrbG9jYWxJdGVyYXRvciwgY29tbWFuZHMpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNvbW1hbmQgPSBjb21tYW5kc1srK2xvY2FsSXRlcmF0b3JdO1xuICAgIH1cblxuICAgIC8vIFRPRE86IFN3aXRjaCB0byBhc3NvY2lhdGl2ZSBhcnJheXMgaGVyZS4uLlxuXG4gICAgZm9yICh2YXIga2V5IGluIHRoaXMuX2NvbnRleHRzKSB7XG4gICAgICAgIHRoaXMuX2NvbnRleHRzW2tleV0uZHJhdygpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9yZXNpemVkKSB7XG4gICAgICAgIHRoaXMudXBkYXRlU2l6ZSgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLl9vdXRDb21tYW5kcztcbn07XG5cblxuLyoqXG4gKiBVcGRhdGVzIHRoZSBzaXplIG9mIGFsbCBwcmV2aW91c2x5IHJlZ2lzdGVyZWQgY29udGV4dCBvYmplY3RzLlxuICogVGhpcyByZXN1bHRzIGludG8gQ09OVEVYVF9SRVNJWkUgZXZlbnRzIGJlaW5nIHNlbnQgYW5kIHRoZSByb290IGVsZW1lbnRzXG4gKiB1c2VkIGJ5IHRoZSBpbmRpdmlkdWFsIHJlbmRlcmVycyBiZWluZyByZXNpemVkIHRvIHRoZSB0aGUgRE9NUmVuZGVyZXIncyByb290XG4gKiBzaXplLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db21wb3NpdG9yLnByb3RvdHlwZS51cGRhdGVTaXplID0gZnVuY3Rpb24gdXBkYXRlU2l6ZSgpIHtcbiAgICBmb3IgKHZhciBzZWxlY3RvciBpbiB0aGlzLl9jb250ZXh0cykge1xuICAgICAgICB0aGlzLl9jb250ZXh0c1tzZWxlY3Rvcl0udXBkYXRlU2l6ZSgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogVXNlZCBieSBUaHJlYWRNYW5hZ2VyIHRvIHVwZGF0ZSB0aGUgaW50ZXJuYWwgcXVldWUgb2YgaW5jb21pbmcgY29tbWFuZHMuXG4gKiBSZWNlaXZpbmcgY29tbWFuZHMgZG9lcyBub3QgaW1tZWRpYXRlbHkgc3RhcnQgdGhlIHJlbmRlcmluZyBwcm9jZXNzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gY29tbWFuZHMgY29tbWFuZCBxdWV1ZSB0byBiZSBwcm9jZXNzZWQgYnkgdGhlIGNvbXBvc2l0b3Inc1xuICogYGRyYXdDb21tYW5kc2AgbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUucmVjZWl2ZUNvbW1hbmRzID0gZnVuY3Rpb24gcmVjZWl2ZUNvbW1hbmRzKGNvbW1hbmRzKSB7XG4gICAgdmFyIGxlbiA9IGNvbW1hbmRzLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHRoaXMuX2luQ29tbWFuZHMucHVzaChjb21tYW5kc1tpXSk7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgc2VsZWN0b3IgaW4gdGhpcy5fY29udGV4dHMpIHtcbiAgICAgICAgdGhpcy5fY29udGV4dHNbc2VsZWN0b3JdLmNoZWNrSW5pdCgpO1xuICAgIH1cbn07XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIG1ldGhvZCB1c2VkIGJ5IGBkcmF3Q29tbWFuZHNgLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHBhcmFtICB7TnVtYmVyfSBpdGVyYXRvciBwb3NpdGlvbiBpbmRleCB3aXRoaW4gdGhlIGNvbW1hbmQgcXVldWVcbiAqIEBwYXJhbSAge0FycmF5fSBjb21tYW5kcyByZW1haW5pbmcgbWVzc2FnZSBxdWV1ZSByZWNlaXZlZCwgdXNlZCB0b1xuICogc2hpZnQgc2luZ2xlIG1lc3NhZ2VzXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29tcG9zaXRvci5wcm90b3R5cGUuZ2l2ZVNpemVGb3IgPSBmdW5jdGlvbiBnaXZlU2l6ZUZvcihpdGVyYXRvciwgY29tbWFuZHMpIHtcbiAgICB2YXIgc2VsZWN0b3IgPSBjb21tYW5kc1tpdGVyYXRvcl07XG4gICAgdmFyIHNpemUgPSB0aGlzLmdldE9yU2V0Q29udGV4dChzZWxlY3RvcikuZ2V0Um9vdFNpemUoKTtcbiAgICB0aGlzLnNlbmRSZXNpemUoc2VsZWN0b3IsIHNpemUpO1xufTtcblxuLyoqXG4gKiBGbHVzaGVzIHRoZSBxdWV1ZSBvZiBvdXRnb2luZyBcIm91dFwiIGNvbW1hbmRzLlxuICogQ2FsbGVkIGJ5IFRocmVhZE1hbmFnZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbXBvc2l0b3IucHJvdG90eXBlLmNsZWFyQ29tbWFuZHMgPSBmdW5jdGlvbiBjbGVhckNvbW1hbmRzKCkge1xuICAgIHRoaXMuX2luQ29tbWFuZHMubGVuZ3RoID0gMDtcbiAgICB0aGlzLl9vdXRDb21tYW5kcy5sZW5ndGggPSAwO1xuICAgIHRoaXMuX3Jlc2l6ZWQgPSBmYWxzZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29tcG9zaXRvcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFdlYkdMUmVuZGVyZXIgPSByZXF1aXJlKCcuLi93ZWJnbC1yZW5kZXJlcnMvV2ViR0xSZW5kZXJlcicpO1xudmFyIENhbWVyYSA9IHJlcXVpcmUoJy4uL2NvbXBvbmVudHMvQ2FtZXJhJyk7XG52YXIgRE9NUmVuZGVyZXIgPSByZXF1aXJlKCcuLi9kb20tcmVuZGVyZXJzL0RPTVJlbmRlcmVyJyk7XG52YXIgQ29tbWFuZHMgPSByZXF1aXJlKCcuLi9jb3JlL0NvbW1hbmRzJyk7XG5cbi8qKlxuICogQ29udGV4dCBpcyBhIHJlbmRlciBsYXllciB3aXRoIGl0cyBvd24gV2ViR0xSZW5kZXJlciBhbmQgRE9NUmVuZGVyZXIuXG4gKiBJdCBpcyB0aGUgaW50ZXJmYWNlIGJldHdlZW4gdGhlIENvbXBvc2l0b3Igd2hpY2ggcmVjZWl2ZXMgY29tbWFuZHNcbiAqIGFuZCB0aGUgcmVuZGVyZXJzIHRoYXQgaW50ZXJwcmV0IHRoZW0uIEl0IGFsc28gcmVsYXlzIGluZm9ybWF0aW9uIHRvXG4gKiB0aGUgcmVuZGVyZXJzIGFib3V0IHJlc2l6aW5nLlxuICpcbiAqIFRoZSBET01FbGVtZW50IGF0IHRoZSBnaXZlbiBxdWVyeSBzZWxlY3RvciBpcyB1c2VkIGFzIHRoZSByb290LiBBXG4gKiBuZXcgRE9NRWxlbWVudCBpcyBhcHBlbmRlZCB0byB0aGlzIHJvb3QgZWxlbWVudCwgYW5kIHVzZWQgYXMgdGhlXG4gKiBwYXJlbnQgZWxlbWVudCBmb3IgYWxsIEZhbW91cyBET00gcmVuZGVyaW5nIGF0IHRoaXMgY29udGV4dC4gQVxuICogY2FudmFzIGlzIGFkZGVkIGFuZCB1c2VkIGZvciBhbGwgV2ViR0wgcmVuZGVyaW5nIGF0IHRoaXMgY29udGV4dC5cbiAqXG4gKiBAY2xhc3MgQ29udGV4dFxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHNlbGVjdG9yIFF1ZXJ5IHNlbGVjdG9yIHVzZWQgdG8gbG9jYXRlIHJvb3QgZWxlbWVudCBvZlxuICogY29udGV4dCBsYXllci5cbiAqIEBwYXJhbSB7Q29tcG9zaXRvcn0gY29tcG9zaXRvciBDb21wb3NpdG9yIHJlZmVyZW5jZSB0byBwYXNzIGRvd24gdG9cbiAqIFdlYkdMUmVuZGVyZXIuXG4gKi9cbmZ1bmN0aW9uIENvbnRleHQoc2VsZWN0b3IsIGNvbXBvc2l0b3IpIHtcbiAgICB0aGlzLl9jb21wb3NpdG9yID0gY29tcG9zaXRvcjtcbiAgICB0aGlzLl9yb290RWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICB0aGlzLl9zZWxlY3RvciA9IHNlbGVjdG9yO1xuXG4gICAgaWYgKHRoaXMuX3Jvb3RFbCA9PT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAnRmFpbGVkIHRvIGNyZWF0ZSBDb250ZXh0OiAnICtcbiAgICAgICAgICAgICdObyBtYXRjaGVzIGZvciBcIicgKyBzZWxlY3RvciArICdcIiBmb3VuZC4nXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgdGhpcy5fc2VsZWN0b3IgPSBzZWxlY3RvcjtcblxuICAgIC8vIEluaXRpYWxpemVzIHRoZSBET01SZW5kZXJlci5cbiAgICAvLyBFdmVyeSBDb250ZXh0IGhhcyBhdCBsZWFzdCBhIERPTVJlbmRlcmVyIGZvciBub3cuXG4gICAgdGhpcy5faW5pdERPTVJlbmRlcmVyKCk7XG5cbiAgICAvLyBXZWJHTFJlbmRlcmVyIHdpbGwgYmUgaW5zdGFudGlhdGVkIHdoZW4gbmVlZGVkLlxuICAgIHRoaXMuX3dlYkdMUmVuZGVyZXIgPSBudWxsO1xuICAgIHRoaXMuX2RvbVJlbmRlcmVyID0gbmV3IERPTVJlbmRlcmVyKHRoaXMuX2RvbVJlbmRlcmVyUm9vdEVsLCBzZWxlY3RvciwgY29tcG9zaXRvcik7XG4gICAgdGhpcy5fY2FudmFzRWwgPSBudWxsO1xuICAgIFxuICAgIC8vIFN0YXRlIGhvbGRlcnNcblxuICAgIHRoaXMuX3JlbmRlclN0YXRlID0ge1xuICAgICAgICBwcm9qZWN0aW9uVHlwZTogQ2FtZXJhLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OLFxuICAgICAgICBwZXJzcGVjdGl2ZVRyYW5zZm9ybTogbmV3IEZsb2F0MzJBcnJheShbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgMV0pLFxuICAgICAgICB2aWV3VHJhbnNmb3JtOiBuZXcgRmxvYXQzMkFycmF5KFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXSksXG4gICAgICAgIHZpZXdEaXJ0eTogZmFsc2UsXG4gICAgICAgIHBlcnNwZWN0aXZlRGlydHk6IGZhbHNlXG4gICAgfTtcblxuICAgIHRoaXMuX3NpemUgPSBbXTtcblxuICAgIHRoaXMuX21lc2hUcmFuc2Zvcm0gPSBuZXcgRmxvYXQzMkFycmF5KDE2KTtcbiAgICB0aGlzLl9tZXNoU2l6ZSA9IFswLCAwLCAwXTtcblxuICAgIHRoaXMuX2luaXRET00gPSBmYWxzZTtcblxuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3MgPSBbXTtcbiAgICB0aGlzLmluaXRDb21tYW5kQ2FsbGJhY2tzKCk7XG5cbiAgICB0aGlzLnVwZGF0ZVNpemUoKTtcbn1cblxuLyoqXG4gKiBRdWVyaWVzIERPTVJlbmRlcmVyIHNpemUgYW5kIHVwZGF0ZXMgY2FudmFzIHNpemUuIFJlbGF5cyBzaXplIGluZm9ybWF0aW9uIHRvXG4gKiBXZWJHTFJlbmRlcmVyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtDb250ZXh0fSB0aGlzXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLnVwZGF0ZVNpemUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHdpZHRoID0gdGhpcy5fcm9vdEVsLm9mZnNldFdpZHRoO1xuICAgIHZhciBoZWlnaHQgPSB0aGlzLl9yb290RWwub2Zmc2V0SGVpZ2h0O1xuXG4gICAgdGhpcy5fc2l6ZVswXSA9IHdpZHRoO1xuICAgIHRoaXMuX3NpemVbMV0gPSBoZWlnaHQ7XG4gICAgdGhpcy5fc2l6ZVsyXSA9ICh3aWR0aCA+IGhlaWdodCkgPyB3aWR0aCA6IGhlaWdodDtcblxuICAgIHRoaXMuX2NvbXBvc2l0b3Iuc2VuZFJlc2l6ZSh0aGlzLl9zZWxlY3RvciwgdGhpcy5fc2l6ZSk7XG4gICAgaWYgKHRoaXMuX3dlYkdMUmVuZGVyZXIpIHRoaXMuX3dlYkdMUmVuZGVyZXIudXBkYXRlU2l6ZSh0aGlzLl9zaXplKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEcmF3IGZ1bmN0aW9uIGNhbGxlZCBhZnRlciBhbGwgY29tbWFuZHMgaGF2ZSBiZWVuIGhhbmRsZWQgZm9yIGN1cnJlbnQgZnJhbWUuXG4gKiBJc3N1ZXMgZHJhdyBjb21tYW5kcyB0byBhbGwgcmVuZGVyZXJzIHdpdGggY3VycmVudCByZW5kZXJTdGF0ZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uIGRyYXcoKSB7XG4gICAgdGhpcy5fZG9tUmVuZGVyZXIuZHJhdyh0aGlzLl9yZW5kZXJTdGF0ZSk7XG4gICAgaWYgKHRoaXMuX3dlYkdMUmVuZGVyZXIpIHRoaXMuX3dlYkdMUmVuZGVyZXIuZHJhdyh0aGlzLl9yZW5kZXJTdGF0ZSk7XG5cbiAgICBpZiAodGhpcy5fcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVEaXJ0eSkgdGhpcy5fcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVEaXJ0eSA9IGZhbHNlO1xuICAgIGlmICh0aGlzLl9yZW5kZXJTdGF0ZS52aWV3RGlydHkpIHRoaXMuX3JlbmRlclN0YXRlLnZpZXdEaXJ0eSA9IGZhbHNlO1xufTtcblxuLyoqXG4gKiBJbml0aWFsaXplcyB0aGUgRE9NUmVuZGVyZXIgYnkgY3JlYXRpbmcgYSByb290IERJViBlbGVtZW50IGFuZCBhcHBlbmRpbmcgaXRcbiAqIHRvIHRoZSBjb250ZXh0LlxuICpcbiAqIEBtZXRob2RcbiAqIEBwcml2YXRlXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuX2luaXRET01SZW5kZXJlciA9IGZ1bmN0aW9uIF9pbml0RE9NUmVuZGVyZXIoKSB7XG4gICAgdGhpcy5fZG9tUmVuZGVyZXJSb290RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLl9yb290RWwuYXBwZW5kQ2hpbGQodGhpcy5fZG9tUmVuZGVyZXJSb290RWwpO1xuICAgIHRoaXMuX2RvbVJlbmRlcmVyUm9vdEVsLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG5cbiAgICB0aGlzLl9kb21SZW5kZXJlciA9IG5ldyBET01SZW5kZXJlcihcbiAgICAgICAgdGhpcy5fZG9tUmVuZGVyZXJSb290RWwsXG4gICAgICAgIHRoaXMuX3NlbGVjdG9yLFxuICAgICAgICB0aGlzLl9jb21wb3NpdG9yXG4gICAgKTtcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmdldFJvb3RTaXplID0gZnVuY3Rpb24gZ2V0Um9vdFNpemUoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgdGhpcy5fcm9vdEVsLm9mZnNldFdpZHRoLFxuICAgICAgICB0aGlzLl9yb290RWwub2Zmc2V0SGVpZ2h0XG4gICAgXTtcbn07XG5cbkNvbnRleHQucHJvdG90eXBlLmluaXRDb21tYW5kQ2FsbGJhY2tzID0gZnVuY3Rpb24gaW5pdENvbW1hbmRDYWxsYmFja3MgKCkge1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuSU5JVF9ET01dID0gaW5pdERPTTtcbiAgICB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW0NvbW1hbmRzLkRPTV9SRU5ERVJfU0laRV0gPSBkb21SZW5kZXJTaXplO1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuQ0hBTkdFX1RSQU5TRk9STV0gPSBjaGFuZ2VUcmFuc2Zvcm07XG4gICAgdGhpcy5fY29tbWFuZENhbGxiYWNrc1tDb21tYW5kcy5DSEFOR0VfU0laRV0gPSBjaGFuZ2VTaXplO1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuQ0hBTkdFX1BST1BFUlRZXSA9IGNoYW5nZVByb3BlcnR5O1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuQ0hBTkdFX0NPTlRFTlRdID0gY2hhbmdlQ29udGVudDtcbiAgICB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW0NvbW1hbmRzLkNIQU5HRV9BVFRSSUJVVEVdID0gY2hhbmdlQXR0cmlidXRlO1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuQUREX0NMQVNTXSA9IGFkZENsYXNzO1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuUkVNT1ZFX0NMQVNTXSA9IHJlbW92ZUNsYXNzO1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuU1VCU0NSSUJFXSA9IHN1YnNjcmliZTtcbiAgICB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW0NvbW1hbmRzLkdMX1NFVF9EUkFXX09QVElPTlNdID0gZ2xTZXREcmF3T3B0aW9ucztcbiAgICB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW0NvbW1hbmRzLkdMX0FNQklFTlRfTElHSFRdID0gZ2xBbWJpZW50TGlnaHQ7XG4gICAgdGhpcy5fY29tbWFuZENhbGxiYWNrc1tDb21tYW5kcy5HTF9MSUdIVF9QT1NJVElPTl0gPSBnbExpZ2h0UG9zaXRpb247XG4gICAgdGhpcy5fY29tbWFuZENhbGxiYWNrc1tDb21tYW5kcy5HTF9MSUdIVF9DT0xPUl0gPSBnbExpZ2h0Q29sb3I7XG4gICAgdGhpcy5fY29tbWFuZENhbGxiYWNrc1tDb21tYW5kcy5NQVRFUklBTF9JTlBVVF0gPSBtYXRlcmlhbElucHV0O1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuR0xfU0VUX0dFT01FVFJZXSA9IGdsU2V0R2VvbWV0cnk7XG4gICAgdGhpcy5fY29tbWFuZENhbGxiYWNrc1tDb21tYW5kcy5HTF9VTklGT1JNU10gPSBnbFVuaWZvcm1zO1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuR0xfQlVGRkVSX0RBVEFdID0gZ2xCdWZmZXJEYXRhO1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuR0xfQ1VUT1VUX1NUQVRFXSA9IGdsQ3V0b3V0U3RhdGU7XG4gICAgdGhpcy5fY29tbWFuZENhbGxiYWNrc1tDb21tYW5kcy5HTF9NRVNIX1ZJU0lCSUxJVFldID0gZ2xNZXNoVmlzaWJpbGl0eTtcbiAgICB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW0NvbW1hbmRzLkdMX1JFTU9WRV9NRVNIXSA9IGdsUmVtb3ZlTWVzaDtcbiAgICB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW0NvbW1hbmRzLlBJTkhPTEVfUFJPSkVDVElPTl0gPSBwaW5ob2xlUHJvamVjdGlvbjtcbiAgICB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW0NvbW1hbmRzLk9SVEhPR1JBUEhJQ19QUk9KRUNUSU9OXSA9IG9ydGhvZ3JhcGhpY1Byb2plY3Rpb247XG4gICAgdGhpcy5fY29tbWFuZENhbGxiYWNrc1tDb21tYW5kcy5DSEFOR0VfVklFV19UUkFOU0ZPUk1dID0gY2hhbmdlVmlld1RyYW5zZm9ybTtcbiAgICB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW0NvbW1hbmRzLlBSRVZFTlRfREVGQVVMVF0gPSBwcmV2ZW50RGVmYXVsdDtcbiAgICB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW0NvbW1hbmRzLkFMTE9XX0RFRkFVTFRdID0gYWxsb3dEZWZhdWx0O1xuICAgIHRoaXMuX2NvbW1hbmRDYWxsYmFja3NbQ29tbWFuZHMuUkVBRFldID0gcmVhZHk7XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBXZWJHTFJlbmRlcmVyIGFuZCB1cGRhdGVzIGl0IGluaXRpYWwgc2l6ZS5cbiAqXG4gKiBUaGUgSW5pdGlhbGl6YXRpb24gcHJvY2VzcyBjb25zaXN0cyBvZiB0aGUgZm9sbG93aW5nIHN0ZXBzOlxuICpcbiAqIDEuIEEgbmV3IGA8Y2FudmFzPmAgZWxlbWVudCBpcyBiZWluZyBjcmVhdGVkIGFuZCBhcHBlbmRlZCB0byB0aGUgcm9vdCBlbGVtZW50LlxuICogMi4gVGhlIFdlYkdMUmVuZGVyZXIgaXMgYmVpbmcgaW5zdGFudGlhdGVkLlxuICogMy4gVGhlIHNpemUgb2YgdGhlIFdlYkdMUmVuZGVyZXIgaXMgYmVpbmcgdXBkYXRlZC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJpdmF0ZVxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkNvbnRleHQucHJvdG90eXBlLl9pbml0V2ViR0xSZW5kZXJlciA9IGZ1bmN0aW9uIF9pbml0V2ViR0xSZW5kZXJlcigpIHtcbiAgICB0aGlzLl93ZWJHTFJlbmRlcmVyUm9vdEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgdGhpcy5fcm9vdEVsLmFwcGVuZENoaWxkKHRoaXMuX3dlYkdMUmVuZGVyZXJSb290RWwpO1xuXG4gICAgdGhpcy5fd2ViR0xSZW5kZXJlciA9IG5ldyBXZWJHTFJlbmRlcmVyKFxuICAgICAgICB0aGlzLl93ZWJHTFJlbmRlcmVyUm9vdEVsLFxuICAgICAgICB0aGlzLl9jb21wb3NpdG9yXG4gICAgKTtcblxuICAgIC8vIERvbid0IHJlYWQgb2Zmc2V0IHdpZHRoIGFuZCBoZWlnaHQuXG4gICAgdGhpcy5fd2ViR0xSZW5kZXJlci51cGRhdGVTaXplKHRoaXMuX3NpemUpO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBzaXplIG9mIHRoZSBwYXJlbnQgZWxlbWVudCBvZiB0aGUgRE9NUmVuZGVyZXIgZm9yIHRoaXMgY29udGV4dC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuZ2V0Um9vdFNpemUgPSBmdW5jdGlvbiBnZXRSb290U2l6ZSgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICB0aGlzLl9yb290RWwub2Zmc2V0V2lkdGgsXG4gICAgICAgIHRoaXMuX3Jvb3RFbC5vZmZzZXRIZWlnaHRcbiAgICBdO1xufTtcblxuXG4vKipcbiAqIEluaXRpYWxpemVzIHRoZSBjb250ZXh0IGlmIHRoZSBgUkVBRFlgIGNvbW1hbmQgaGFzIGJlZW4gcmVjZWl2ZWQgZWFybGllci5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5Db250ZXh0LnByb3RvdHlwZS5jaGVja0luaXQgPSBmdW5jdGlvbiBjaGVja0luaXQgKCkge1xuICAgIGlmICh0aGlzLl9pbml0RE9NKSB7XG4gICAgICAgIHRoaXMuX2RvbVJlbmRlcmVyUm9vdEVsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgICAgICB0aGlzLl9pbml0RE9NID0gZmFsc2U7XG4gICAgfVxufTtcblxuLyoqXG4gKiBIYW5kbGVzIGRlbGVnYXRpb24gb2YgY29tbWFuZHMgdG8gcmVuZGVyZXJzIG9mIHRoaXMgY29udGV4dC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggU3RyaW5nIHVzZWQgYXMgaWRlbnRpZmllciBvZiBhIGdpdmVuIG5vZGUgaW4gdGhlXG4gKiBzY2VuZSBncmFwaC5cbiAqIEBwYXJhbSB7QXJyYXl9IGNvbW1hbmRzIExpc3Qgb2YgYWxsIGNvbW1hbmRzIGZyb20gdGhpcyBmcmFtZS5cbiAqIEBwYXJhbSB7TnVtYmVyfSBpdGVyYXRvciBOdW1iZXIgaW5kaWNhdGluZyBwcm9ncmVzcyB0aHJvdWdoIHRoZSBjb21tYW5kXG4gKiBxdWV1ZS5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IGl0ZXJhdG9yIGluZGljYXRpbmcgcHJvZ3Jlc3MgdGhyb3VnaCB0aGUgY29tbWFuZCBxdWV1ZS5cbiAqL1xuQ29udGV4dC5wcm90b3R5cGUucmVjZWl2ZSA9IGZ1bmN0aW9uIHJlY2VpdmUocGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgdmFyIGxvY2FsSXRlcmF0b3IgPSBpdGVyYXRvcjtcblxuICAgIHZhciBjb21tYW5kID0gY29tbWFuZHNbKytsb2NhbEl0ZXJhdG9yXTtcblxuICAgIHRoaXMuX2RvbVJlbmRlcmVyLmxvYWRQYXRoKHBhdGgpO1xuICAgIHRoaXMuX2RvbVJlbmRlcmVyLmZpbmRUYXJnZXQoKTtcblxuICAgIHdoaWxlIChjb21tYW5kICE9IG51bGwpIHtcbiAgICAgICAgaWYgKGNvbW1hbmQgPT09IENvbW1hbmRzLldJVEggfHwgY29tbWFuZCA9PT0gQ29tbWFuZHMuVElNRSkgcmV0dXJuIGxvY2FsSXRlcmF0b3IgLSAxO1xuICAgICAgICBlbHNlIGxvY2FsSXRlcmF0b3IgPSB0aGlzLl9jb21tYW5kQ2FsbGJhY2tzW2NvbW1hbmRdKHRoaXMsIHBhdGgsIGNvbW1hbmRzLCBsb2NhbEl0ZXJhdG9yKSArIDE7IFxuICAgICAgICBjb21tYW5kID0gY29tbWFuZHNbbG9jYWxJdGVyYXRvcl07XG4gICAgfVxuXG4gICAgcmV0dXJuIGxvY2FsSXRlcmF0b3I7XG59O1xuXG4vKipcbiAqIEdldHRlciBtZXRob2QgdXNlZCBmb3IgcmV0cmlldmluZyB0aGUgdXNlZCBET01SZW5kZXJlci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7RE9NUmVuZGVyZXJ9ICAgIFRoZSBET01SZW5kZXJlciBiZWluZyB1c2VkIGJ5IHRoZSBDb250ZXh0LlxuICovXG5Db250ZXh0LnByb3RvdHlwZS5nZXRET01SZW5kZXJlciA9IGZ1bmN0aW9uIGdldERPTVJlbmRlcmVyKCkge1xuICAgIHJldHVybiB0aGlzLl9kb21SZW5kZXJlcjtcbn07XG5cbi8qKlxuICogR2V0dGVyIG1ldGhvZCB1c2VkIGZvciByZXRyaWV2aW5nIHRoZSB1c2VkIFdlYkdMUmVuZGVyZXIgKGlmIGFueSkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge1dlYkdMUmVuZGVyZXJ8bnVsbH0gICAgVGhlIFdlYkdMUmVuZGVyZXIgYmVpbmcgdXNlZCBieSB0aGUgQ29udGV4dC5cbiAqL1xuQ29udGV4dC5wcm90b3R5cGUuZ2V0V2ViR0xSZW5kZXJlciA9IGZ1bmN0aW9uIGdldFdlYkdMUmVuZGVyZXIoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dlYkdMUmVuZGVyZXI7XG59O1xuXG4vLyBDb21tYW5kIENhbGxiYWNrc1xuZnVuY3Rpb24gcHJldmVudERlZmF1bHQgKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIGlmIChjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSBjb250ZXh0Ll93ZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgIGNvbnRleHQuX2RvbVJlbmRlcmVyLnByZXZlbnREZWZhdWx0KGNvbW1hbmRzWysraXRlcmF0b3JdKTtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbmZ1bmN0aW9uIGFsbG93RGVmYXVsdCAoY29udGV4dCwgcGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgaWYgKGNvbnRleHQuX3dlYkdMUmVuZGVyZXIpIGNvbnRleHQuX3dlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgY29udGV4dC5fZG9tUmVuZGVyZXIuYWxsb3dEZWZhdWx0KGNvbW1hbmRzWysraXRlcmF0b3JdKTtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbmZ1bmN0aW9uIHJlYWR5IChjb250ZXh0LCBwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICBjb250ZXh0Ll9pbml0RE9NID0gdHJ1ZTtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbmZ1bmN0aW9uIGluaXRET00gKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIGNvbnRleHQuX2RvbVJlbmRlcmVyLmluc2VydEVsKGNvbW1hbmRzWysraXRlcmF0b3JdKTtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbmZ1bmN0aW9uIGRvbVJlbmRlclNpemUgKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIGNvbnRleHQuX2RvbVJlbmRlcmVyLmdldFNpemVPZihjb21tYW5kc1srK2l0ZXJhdG9yXSk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VUcmFuc2Zvcm0gKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIHZhciB0ZW1wID0gY29udGV4dC5fbWVzaFRyYW5zZm9ybTtcblxuICAgIHRlbXBbMF0gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICB0ZW1wWzFdID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG4gICAgdGVtcFsyXSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIHRlbXBbM10gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICB0ZW1wWzRdID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG4gICAgdGVtcFs1XSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIHRlbXBbNl0gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICB0ZW1wWzddID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG4gICAgdGVtcFs4XSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIHRlbXBbOV0gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICB0ZW1wWzEwXSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIHRlbXBbMTFdID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG4gICAgdGVtcFsxMl0gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICB0ZW1wWzEzXSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIHRlbXBbMTRdID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG4gICAgdGVtcFsxNV0gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcblxuICAgIGNvbnRleHQuX2RvbVJlbmRlcmVyLnNldE1hdHJpeCh0ZW1wKTtcbiAgICBcbiAgICBpZiAoY29udGV4dC5fd2ViR0xSZW5kZXJlcilcbiAgICAgICAgY29udGV4dC5fd2ViR0xSZW5kZXJlci5zZXRDdXRvdXRVbmlmb3JtKHBhdGgsICd1X3RyYW5zZm9ybScsIHRlbXApO1xuXG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VTaXplIChjb250ZXh0LCBwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICB2YXIgd2lkdGggPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICB2YXIgaGVpZ2h0ID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG5cbiAgICBjb250ZXh0Ll9kb21SZW5kZXJlci5zZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgIGlmIChjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSB7XG4gICAgICAgIGNvbnRleHQuX21lc2hTaXplWzBdID0gd2lkdGg7XG4gICAgICAgIGNvbnRleHQuX21lc2hTaXplWzFdID0gaGVpZ2h0O1xuICAgICAgICBjb250ZXh0Ll93ZWJHTFJlbmRlcmVyLnNldEN1dG91dFVuaWZvcm0ocGF0aCwgJ3Vfc2l6ZScsIGNvbnRleHQuX21lc2hTaXplKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VQcm9wZXJ0eSAoY29udGV4dCwgcGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgaWYgKGNvbnRleHQuX3dlYkdMUmVuZGVyZXIpIGNvbnRleHQuX3dlYkdMUmVuZGVyZXIuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG4gICAgY29udGV4dC5fZG9tUmVuZGVyZXIuc2V0UHJvcGVydHkoY29tbWFuZHNbKytpdGVyYXRvcl0sIGNvbW1hbmRzWysraXRlcmF0b3JdKTtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZUNvbnRlbnQgKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIGlmIChjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSBjb250ZXh0Ll93ZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgIGNvbnRleHQuX2RvbVJlbmRlcmVyLnNldENvbnRlbnQoY29tbWFuZHNbKytpdGVyYXRvcl0pO1xuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cbiAgXG5mdW5jdGlvbiBjaGFuZ2VBdHRyaWJ1dGUgKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIGlmIChjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSBjb250ZXh0Ll93ZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgIGNvbnRleHQuX2RvbVJlbmRlcmVyLnNldEF0dHJpYnV0ZShjb21tYW5kc1srK2l0ZXJhdG9yXSwgY29tbWFuZHNbKytpdGVyYXRvcl0pO1xuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cblxuZnVuY3Rpb24gYWRkQ2xhc3MgKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIGlmIChjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSBjb250ZXh0Ll93ZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgIGNvbnRleHQuX2RvbVJlbmRlcmVyLmFkZENsYXNzKGNvbW1hbmRzWysraXRlcmF0b3JdKTtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUNsYXNzIChjb250ZXh0LCBwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICBpZiAoY29udGV4dC5fd2ViR0xSZW5kZXJlcikgY29udGV4dC5fd2ViR0xSZW5kZXJlci5nZXRPclNldEN1dG91dChwYXRoKTtcbiAgICBjb250ZXh0Ll9kb21SZW5kZXJlci5yZW1vdmVDbGFzcyhjb21tYW5kc1srK2l0ZXJhdG9yXSk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBzdWJzY3JpYmUgKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIGlmIChjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSBjb250ZXh0Ll93ZWJHTFJlbmRlcmVyLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuICAgIGNvbnRleHQuX2RvbVJlbmRlcmVyLnN1YnNjcmliZShjb21tYW5kc1srK2l0ZXJhdG9yXSk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBnbFNldERyYXdPcHRpb25zIChjb250ZXh0LCBwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICBpZiAoIWNvbnRleHQuX3dlYkdMUmVuZGVyZXIpIGNvbnRleHQuX2luaXRXZWJHTFJlbmRlcmVyKCk7XG4gICAgY29udGV4dC5fd2ViR0xSZW5kZXJlci5zZXRNZXNoT3B0aW9ucyhwYXRoLCBjb21tYW5kc1srK2l0ZXJhdG9yXSk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBnbEFtYmllbnRMaWdodCAoY29udGV4dCwgcGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgaWYgKCFjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSBjb250ZXh0Ll9pbml0V2ViR0xSZW5kZXJlcigpO1xuICAgIGNvbnRleHQuX3dlYkdMUmVuZGVyZXIuc2V0QW1iaWVudExpZ2h0Q29sb3IoXG4gICAgICAgIHBhdGgsXG4gICAgICAgIGNvbW1hbmRzWysraXRlcmF0b3JdLFxuICAgICAgICBjb21tYW5kc1srK2l0ZXJhdG9yXSxcbiAgICAgICAgY29tbWFuZHNbKytpdGVyYXRvcl1cbiAgICApO1xuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cblxuZnVuY3Rpb24gZ2xMaWdodFBvc2l0aW9uIChjb250ZXh0LCBwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICBpZiAoIWNvbnRleHQuX3dlYkdMUmVuZGVyZXIpIGNvbnRleHQuX2luaXRXZWJHTFJlbmRlcmVyKCk7XG4gICAgY29udGV4dC5fd2ViR0xSZW5kZXJlci5zZXRMaWdodFBvc2l0aW9uKFxuICAgICAgICBwYXRoLFxuICAgICAgICBjb21tYW5kc1srK2l0ZXJhdG9yXSxcbiAgICAgICAgY29tbWFuZHNbKytpdGVyYXRvcl0sXG4gICAgICAgIGNvbW1hbmRzWysraXRlcmF0b3JdXG4gICAgKTtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbmZ1bmN0aW9uIGdsTGlnaHRDb2xvciAoY29udGV4dCwgcGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgaWYgKCFjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSBjb250ZXh0Ll9pbml0V2ViR0xSZW5kZXJlcigpO1xuICAgIGNvbnRleHQuX3dlYkdMUmVuZGVyZXIuc2V0TGlnaHRDb2xvcihcbiAgICAgICAgcGF0aCxcbiAgICAgICAgY29tbWFuZHNbKytpdGVyYXRvcl0sXG4gICAgICAgIGNvbW1hbmRzWysraXRlcmF0b3JdLFxuICAgICAgICBjb21tYW5kc1srK2l0ZXJhdG9yXVxuICAgICk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBtYXRlcmlhbElucHV0IChjb250ZXh0LCBwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICBpZiAoIWNvbnRleHQuX3dlYkdMUmVuZGVyZXIpIGNvbnRleHQuX2luaXRXZWJHTFJlbmRlcmVyKCk7XG4gICAgY29udGV4dC5fd2ViR0xSZW5kZXJlci5oYW5kbGVNYXRlcmlhbElucHV0KFxuICAgICAgICBwYXRoLFxuICAgICAgICBjb21tYW5kc1srK2l0ZXJhdG9yXSxcbiAgICAgICAgY29tbWFuZHNbKytpdGVyYXRvcl1cbiAgICApO1xuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cblxuZnVuY3Rpb24gZ2xTZXRHZW9tZXRyeSAoY29udGV4dCwgcGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgaWYgKCFjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSBjb250ZXh0Ll9pbml0V2ViR0xSZW5kZXJlcigpO1xuICAgIGNvbnRleHQuX3dlYkdMUmVuZGVyZXIuc2V0R2VvbWV0cnkoXG4gICAgICAgIHBhdGgsXG4gICAgICAgIGNvbW1hbmRzWysraXRlcmF0b3JdLFxuICAgICAgICBjb21tYW5kc1srK2l0ZXJhdG9yXSxcbiAgICAgICAgY29tbWFuZHNbKytpdGVyYXRvcl1cbiAgICApO1xuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cblxuZnVuY3Rpb24gZ2xVbmlmb3JtcyAoY29udGV4dCwgcGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgaWYgKCFjb250ZXh0Ll93ZWJHTFJlbmRlcmVyKSBjb250ZXh0Ll9pbml0V2ViR0xSZW5kZXJlcigpO1xuICAgIGNvbnRleHQuX3dlYkdMUmVuZGVyZXIuc2V0TWVzaFVuaWZvcm0oXG4gICAgICAgIHBhdGgsXG4gICAgICAgIGNvbW1hbmRzWysraXRlcmF0b3JdLFxuICAgICAgICBjb21tYW5kc1srK2l0ZXJhdG9yXVxuICAgICk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBnbEJ1ZmZlckRhdGEgKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIGlmICghY29udGV4dC5fd2ViR0xSZW5kZXJlcikgY29udGV4dC5faW5pdFdlYkdMUmVuZGVyZXIoKTtcbiAgICBjb250ZXh0Ll93ZWJHTFJlbmRlcmVyLmJ1ZmZlckRhdGEoXG4gICAgICAgIHBhdGgsXG4gICAgICAgIGNvbW1hbmRzWysraXRlcmF0b3JdLFxuICAgICAgICBjb21tYW5kc1srK2l0ZXJhdG9yXSxcbiAgICAgICAgY29tbWFuZHNbKytpdGVyYXRvcl0sXG4gICAgICAgIGNvbW1hbmRzWysraXRlcmF0b3JdLFxuICAgICAgICBjb21tYW5kc1srK2l0ZXJhdG9yXVxuICAgICk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBnbEN1dG91dFN0YXRlIChjb250ZXh0LCBwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICBpZiAoIWNvbnRleHQuX3dlYkdMUmVuZGVyZXIpIGNvbnRleHQuX2luaXRXZWJHTFJlbmRlcmVyKCk7XG4gICAgY29udGV4dC5fd2ViR0xSZW5kZXJlci5zZXRDdXRvdXRTdGF0ZShwYXRoLCBjb21tYW5kc1srK2l0ZXJhdG9yXSk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBnbE1lc2hWaXNpYmlsaXR5IChjb250ZXh0LCBwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICBpZiAoIWNvbnRleHQuX3dlYkdMUmVuZGVyZXIpIGNvbnRleHQuX2luaXRXZWJHTFJlbmRlcmVyKCk7XG4gICAgY29udGV4dC5fd2ViR0xSZW5kZXJlci5zZXRNZXNoVmlzaWJpbGl0eShwYXRoLCBjb21tYW5kc1srK2l0ZXJhdG9yXSk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBnbFJlbW92ZU1lc2ggKGNvbnRleHQsIHBhdGgsIGNvbW1hbmRzLCBpdGVyYXRvcikge1xuICAgIGlmICghY29udGV4dC5fd2ViR0xSZW5kZXJlcikgY29udGV4dC5faW5pdFdlYkdMUmVuZGVyZXIoKTtcbiAgICBjb250ZXh0Ll93ZWJHTFJlbmRlcmVyLnJlbW92ZU1lc2gocGF0aCk7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBwaW5ob2xlUHJvamVjdGlvbiAoY29udGV4dCwgcGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgY29udGV4dC5fcmVuZGVyU3RhdGUucHJvamVjdGlvblR5cGUgPSBDYW1lcmEuUElOSE9MRV9QUk9KRUNUSU9OO1xuICAgIGNvbnRleHQuX3JlbmRlclN0YXRlLnBlcnNwZWN0aXZlVHJhbnNmb3JtWzExXSA9IC0xIC8gY29tbWFuZHNbKytpdGVyYXRvcl07XG4gICAgY29udGV4dC5fcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVEaXJ0eSA9IHRydWU7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xufVxuXG5mdW5jdGlvbiBvcnRob2dyYXBoaWNQcm9qZWN0aW9uIChjb250ZXh0LCBwYXRoLCBjb21tYW5kcywgaXRlcmF0b3IpIHtcbiAgICBjb250ZXh0Ll9yZW5kZXJTdGF0ZS5wcm9qZWN0aW9uVHlwZSA9IENhbWVyYS5PUlRIT0dSQVBISUNfUFJPSkVDVElPTjtcbiAgICBjb250ZXh0Ll9yZW5kZXJTdGF0ZS5wZXJzcGVjdGl2ZVRyYW5zZm9ybVsxMV0gPSAwO1xuICAgIGNvbnRleHQuX3JlbmRlclN0YXRlLnBlcnNwZWN0aXZlRGlydHkgPSB0cnVlO1xuICAgIHJldHVybiBpdGVyYXRvcjtcbn1cblxuZnVuY3Rpb24gY2hhbmdlVmlld1RyYW5zZm9ybSAoY29udGV4dCwgcGF0aCwgY29tbWFuZHMsIGl0ZXJhdG9yKSB7XG4gICAgY29udGV4dC5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVswXSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIGNvbnRleHQuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMV0gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICBjb250ZXh0Ll9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzJdID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG4gICAgY29udGV4dC5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVszXSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuXG4gICAgY29udGV4dC5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs0XSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIGNvbnRleHQuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bNV0gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICBjb250ZXh0Ll9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzZdID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG4gICAgY29udGV4dC5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs3XSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuXG4gICAgY29udGV4dC5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVs4XSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIGNvbnRleHQuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bOV0gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICBjb250ZXh0Ll9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzEwXSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIGNvbnRleHQuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTFdID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG5cbiAgICBjb250ZXh0Ll9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzEyXSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuICAgIGNvbnRleHQuX3JlbmRlclN0YXRlLnZpZXdUcmFuc2Zvcm1bMTNdID0gY29tbWFuZHNbKytpdGVyYXRvcl07XG4gICAgY29udGV4dC5fcmVuZGVyU3RhdGUudmlld1RyYW5zZm9ybVsxNF0gPSBjb21tYW5kc1srK2l0ZXJhdG9yXTtcbiAgICBjb250ZXh0Ll9yZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtWzE1XSA9IGNvbW1hbmRzWysraXRlcmF0b3JdO1xuXG4gICAgY29udGV4dC5fcmVuZGVyU3RhdGUudmlld0RpcnR5ID0gdHJ1ZTtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udGV4dDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIENvbW1hbmRzID0gcmVxdWlyZSgnLi4vY29yZS9Db21tYW5kcycpO1xuXG4vKipcbiAqIFRoZSBVSU1hbmFnZXIgaXMgYmVpbmcgdXBkYXRlZCBieSBhbiBFbmdpbmUgYnkgY29uc2VjdXRpdmVseSBjYWxsaW5nIGl0c1xuICogYHVwZGF0ZWAgbWV0aG9kLiBJdCBjYW4gZWl0aGVyIG1hbmFnZSBhIHJlYWwgV2ViLVdvcmtlciBvciB0aGUgZ2xvYmFsXG4gKiBGYW1vdXNFbmdpbmUgY29yZSBzaW5nbGV0b24uXG4gKlxuICogQGV4YW1wbGVcbiAqIHZhciBjb21wb3NpdG9yID0gbmV3IENvbXBvc2l0b3IoKTtcbiAqIHZhciBlbmdpbmUgPSBuZXcgRW5naW5lKCk7XG4gKlxuICogLy8gVXNpbmcgYSBXZWIgV29ya2VyXG4gKiB2YXIgd29ya2VyID0gbmV3IFdvcmtlcignd29ya2VyLmJ1bmRsZS5qcycpO1xuICogdmFyIHRocmVhZG1hbmdlciA9IG5ldyBVSU1hbmFnZXIod29ya2VyLCBjb21wb3NpdG9yLCBlbmdpbmUpO1xuICpcbiAqIC8vIFdpdGhvdXQgdXNpbmcgYSBXZWIgV29ya2VyXG4gKiB2YXIgdGhyZWFkbWFuZ2VyID0gbmV3IFVJTWFuYWdlcihGYW1vdXMsIGNvbXBvc2l0b3IsIGVuZ2luZSk7XG4gKlxuICogQGNsYXNzICBVSU1hbmFnZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7RmFtb3VzfFdvcmtlcn0gdGhyZWFkIFRoZSB0aHJlYWQgYmVpbmcgdXNlZCB0byByZWNlaXZlIG1lc3NhZ2VzXG4gKiBmcm9tIGFuZCBwb3N0IG1lc3NhZ2VzIHRvLiBFeHBlY3RlZCB0byBleHBvc2UgYSBXZWJXb3JrZXItbGlrZSBBUEksIHdoaWNoXG4gKiBtZWFucyBwcm92aWRpbmcgYSB3YXkgdG8gbGlzdGVuIGZvciB1cGRhdGVzIGJ5IHNldHRpbmcgaXRzIGBvbm1lc3NhZ2VgXG4gKiBwcm9wZXJ0eSBhbmQgc2VuZGluZyB1cGRhdGVzIHVzaW5nIGBwb3N0TWVzc2FnZWAuXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgYW4gaW5zdGFuY2Ugb2YgQ29tcG9zaXRvciB1c2VkIHRvIGV4dHJhY3RcbiAqIGVucXVldWVkIGRyYXcgY29tbWFuZHMgZnJvbSB0byBiZSBzZW50IHRvIHRoZSB0aHJlYWQuXG4gKiBAcGFyYW0ge1JlbmRlckxvb3B9IHJlbmRlckxvb3AgYW4gaW5zdGFuY2Ugb2YgRW5naW5lIHVzZWQgZm9yIGV4ZWN1dGluZ1xuICogdGhlIGBFTkdJTkVgIGNvbW1hbmRzIG9uLlxuICovXG5mdW5jdGlvbiBVSU1hbmFnZXIgKHRocmVhZCwgY29tcG9zaXRvciwgcmVuZGVyTG9vcCkge1xuICAgIHRoaXMuX3RocmVhZCA9IHRocmVhZDtcbiAgICB0aGlzLl9jb21wb3NpdG9yID0gY29tcG9zaXRvcjtcbiAgICB0aGlzLl9yZW5kZXJMb29wID0gcmVuZGVyTG9vcDtcblxuICAgIHRoaXMuX3JlbmRlckxvb3AudXBkYXRlKHRoaXMpO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLl90aHJlYWQub25tZXNzYWdlID0gZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgIHZhciBtZXNzYWdlID0gZXYuZGF0YSA/IGV2LmRhdGEgOiBldjtcbiAgICAgICAgaWYgKG1lc3NhZ2VbMF0gPT09IENvbW1hbmRzLkVOR0lORSkge1xuICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlWzFdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBDb21tYW5kcy5TVEFSVDpcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2VuZ2luZS5zdGFydCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIENvbW1hbmRzLlNUT1A6XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLl9lbmdpbmUuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ1Vua25vd24gRU5HSU5FIGNvbW1hbmQgXCInICsgbWVzc2FnZVsxXSArICdcIidcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBfdGhpcy5fY29tcG9zaXRvci5yZWNlaXZlQ29tbWFuZHMobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHRoaXMuX3RocmVhZC5vbmVycm9yID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyb3IpO1xuICAgIH07XG59XG5cbi8qKlxuICogUmV0dXJucyB0aGUgdGhyZWFkIGJlaW5nIHVzZWQgYnkgdGhlIFVJTWFuYWdlci5cbiAqIFRoaXMgY291bGQgZWl0aGVyIGJlIGFuIGFuIGFjdHVhbCB3ZWIgd29ya2VyIG9yIGEgYEZhbW91c0VuZ2luZWAgc2luZ2xldG9uLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtXb3JrZXJ8RmFtb3VzRW5naW5lfSBFaXRoZXIgYSB3ZWIgd29ya2VyIG9yIGEgYEZhbW91c0VuZ2luZWAgc2luZ2xldG9uLlxuICovXG5VSU1hbmFnZXIucHJvdG90eXBlLmdldFRocmVhZCA9IGZ1bmN0aW9uIGdldFRocmVhZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fdGhyZWFkO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIHRoZSBjb21wb3NpdG9yIGJlaW5nIHVzZWQgYnkgdGhpcyBVSU1hbmFnZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge0NvbXBvc2l0b3J9IFRoZSBjb21wb3NpdG9yIHVzZWQgYnkgdGhlIFVJTWFuYWdlci5cbiAqL1xuVUlNYW5hZ2VyLnByb3RvdHlwZS5nZXRDb21wb3NpdG9yID0gZnVuY3Rpb24gZ2V0Q29tcG9zaXRvcigpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tcG9zaXRvcjtcbn07XG5cbi8qKlxuICogUmV0dXJucyB0aGUgZW5naW5lIGJlaW5nIHVzZWQgYnkgdGhpcyBVSU1hbmFnZXIuXG4gKlxuICogQG1ldGhvZFxuICogQGRlcHJlY2F0ZWQgVXNlIHtAbGluayBVSU1hbmFnZXIjZ2V0UmVuZGVyTG9vcCBpbnN0ZWFkIX1cbiAqXG4gKiBAcmV0dXJuIHtFbmdpbmV9IFRoZSBlbmdpbmUgdXNlZCBieSB0aGUgVUlNYW5hZ2VyLlxuICovXG5VSU1hbmFnZXIucHJvdG90eXBlLmdldEVuZ2luZSA9IGZ1bmN0aW9uIGdldEVuZ2luZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVuZGVyTG9vcDtcbn07XG5cblxuLyoqXG4gKiBSZXR1cm5zIHRoZSByZW5kZXIgbG9vcCBjdXJyZW50bHkgYmVpbmcgdXNlZCBieSB0aGUgVUlNYW5hZ2VyLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJuIHtSZW5kZXJMb29wfSAgVGhlIHJlZ2lzdGVyZWQgcmVuZGVyIGxvb3AgdXNlZCBmb3IgdXBkYXRpbmcgdGhlXG4gKiBVSU1hbmFnZXIuXG4gKi9cblVJTWFuYWdlci5wcm90b3R5cGUuZ2V0UmVuZGVyTG9vcCA9IGZ1bmN0aW9uIGdldFJlbmRlckxvb3AoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlbmRlckxvb3A7XG59O1xuXG4vKipcbiAqIFVwZGF0ZSBtZXRob2QgYmVpbmcgaW52b2tlZCBieSB0aGUgRW5naW5lIG9uIGV2ZXJ5IGByZXF1ZXN0QW5pbWF0aW9uRnJhbWVgLlxuICogVXNlZCBmb3IgdXBkYXRpbmcgdGhlIG5vdGlvbiBvZiB0aW1lIHdpdGhpbiB0aGUgbWFuYWdlZCB0aHJlYWQgYnkgc2VuZGluZ1xuICogYSBGUkFNRSBjb21tYW5kIGFuZCBzZW5kaW5nIG1lc3NhZ2VzIHRvXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSAge051bWJlcn0gdGltZSB1bml4IHRpbWVzdGFtcCB0byBiZSBwYXNzZWQgZG93biB0byB0aGUgd29ya2VyIGFzIGFcbiAqIEZSQU1FIGNvbW1hbmRcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cblVJTWFuYWdlci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gdXBkYXRlICh0aW1lKSB7XG4gICAgdGhpcy5fdGhyZWFkLnBvc3RNZXNzYWdlKFtDb21tYW5kcy5GUkFNRSwgdGltZV0pO1xuICAgIHZhciB0aHJlYWRNZXNzYWdlcyA9IHRoaXMuX2NvbXBvc2l0b3IuZHJhd0NvbW1hbmRzKCk7XG4gICAgdGhpcy5fdGhyZWFkLnBvc3RNZXNzYWdlKHRocmVhZE1lc3NhZ2VzKTtcbiAgICB0aGlzLl9jb21wb3NpdG9yLmNsZWFyQ29tbWFuZHMoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVUlNYW5hZ2VyO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3NzID0gJy5mYW1vdXMtZG9tLXJlbmRlcmVyIHsnICtcbiAgICAnd2lkdGg6MTAwJTsnICtcbiAgICAnaGVpZ2h0OjEwMCU7JyArXG4gICAgJ3RyYW5zZm9ybS1zdHlsZTpwcmVzZXJ2ZS0zZDsnICtcbiAgICAnLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6cHJlc2VydmUtM2Q7JyArXG4nfScgK1xuXG4nLmZhbW91cy1kb20tZWxlbWVudCB7JyArXG4gICAgJy13ZWJraXQtdHJhbnNmb3JtLW9yaWdpbjowJSAwJTsnICtcbiAgICAndHJhbnNmb3JtLW9yaWdpbjowJSAwJTsnICtcbiAgICAnLXdlYmtpdC1iYWNrZmFjZS12aXNpYmlsaXR5OnZpc2libGU7JyArXG4gICAgJ2JhY2tmYWNlLXZpc2liaWxpdHk6dmlzaWJsZTsnICtcbiAgICAnLXdlYmtpdC10cmFuc2Zvcm0tc3R5bGU6cHJlc2VydmUtM2Q7JyArXG4gICAgJ3RyYW5zZm9ybS1zdHlsZTpwcmVzZXJ2ZS0zZDsnICtcbiAgICAnLXdlYmtpdC10YXAtaGlnaGxpZ2h0LWNvbG9yOnRyYW5zcGFyZW50OycgK1xuICAgICdwb2ludGVyLWV2ZW50czphdXRvOycgK1xuICAgICd6LWluZGV4OjE7JyArXG4nfScgK1xuXG4nLmZhbW91cy1kb20tZWxlbWVudC1jb250ZW50LCcgK1xuJy5mYW1vdXMtZG9tLWVsZW1lbnQgeycgK1xuICAgICdwb3NpdGlvbjphYnNvbHV0ZTsnICtcbiAgICAnYm94LXNpemluZzpib3JkZXItYm94OycgK1xuICAgICctbW96LWJveC1zaXppbmc6Ym9yZGVyLWJveDsnICtcbiAgICAnLXdlYmtpdC1ib3gtc2l6aW5nOmJvcmRlci1ib3g7JyArXG4nfScgK1xuXG4nLmZhbW91cy13ZWJnbC1yZW5kZXJlciB7JyArXG4gICAgJy13ZWJraXQtdHJhbnNmb3JtOnRyYW5zbGF0ZVooMTAwMDAwMHB4KTsnICsgIC8qIFRPRE86IEZpeCB3aGVuIFNhZmFyaSBGaXhlcyovXG4gICAgJ3RyYW5zZm9ybTp0cmFuc2xhdGVaKDEwMDAwMDBweCk7JyArXG4gICAgJ3BvaW50ZXItZXZlbnRzOm5vbmU7JyArXG4gICAgJ3Bvc2l0aW9uOmFic29sdXRlOycgK1xuICAgICd6LWluZGV4OjE7JyArXG4gICAgJ3RvcDowOycgK1xuICAgICd3aWR0aDoxMDAlOycgK1xuICAgICdoZWlnaHQ6MTAwJTsnICtcbid9JztcblxudmFyIElOSkVDVEVEID0gdHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJztcblxuZnVuY3Rpb24gaW5qZWN0Q1NTKCkge1xuICAgIGlmIChJTkpFQ1RFRCkgcmV0dXJuO1xuICAgIElOSkVDVEVEID0gdHJ1ZTtcbiAgICBpZiAoZG9jdW1lbnQuY3JlYXRlU3R5bGVTaGVldCkge1xuICAgICAgICB2YXIgc2hlZXQgPSBkb2N1bWVudC5jcmVhdGVTdHlsZVNoZWV0KCk7XG4gICAgICAgIHNoZWV0LmNzc1RleHQgPSBjc3M7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgaGVhZCA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdoZWFkJylbMF07XG4gICAgICAgIHZhciBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XG5cbiAgICAgICAgaWYgKHN0eWxlLnN0eWxlU2hlZXQpIHtcbiAgICAgICAgICAgIHN0eWxlLnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHN0eWxlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgKGhlYWQgPyBoZWFkIDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50KS5hcHBlbmRDaGlsZChzdHlsZSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluamVjdENTUztcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBEZWVwIGNsb25lIGFuIG9iamVjdC5cbiAqXG4gKiBAbWV0aG9kICBjbG9uZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBiICAgICAgIE9iamVjdCB0byBiZSBjbG9uZWQuXG4gKiBAcmV0dXJuIHtPYmplY3R9IGEgICAgICBDbG9uZWQgb2JqZWN0IChkZWVwIGVxdWFsaXR5KS5cbiAqL1xudmFyIGNsb25lID0gZnVuY3Rpb24gY2xvbmUoYikge1xuICAgIHZhciBhO1xuICAgIGlmICh0eXBlb2YgYiA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgYSA9IChiIGluc3RhbmNlb2YgQXJyYXkpID8gW10gOiB7fTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIGIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgYltrZXldID09PSAnb2JqZWN0JyAmJiBiW2tleV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoYltrZXldIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgICAgICAgICAgICAgYVtrZXldID0gbmV3IEFycmF5KGJba2V5XS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJba2V5XS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgYVtrZXldW2ldID0gY2xvbmUoYltrZXldW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGFba2V5XSA9IGNsb25lKGJba2V5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgYVtrZXldID0gYltrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBhID0gYjtcbiAgICB9XG4gICAgcmV0dXJuIGE7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsb25lO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4vKipcbiAqIFRha2VzIGFuIG9iamVjdCBjb250YWluaW5nIGtleXMgYW5kIHZhbHVlcyBhbmQgcmV0dXJucyBhbiBvYmplY3RcbiAqIGNvbXByaXNpbmcgdHdvIFwiYXNzb2NpYXRlXCIgYXJyYXlzLCBvbmUgd2l0aCB0aGUga2V5cyBhbmQgdGhlIG90aGVyXG4gKiB3aXRoIHRoZSB2YWx1ZXMuXG4gKlxuICogQG1ldGhvZCBrZXlWYWx1ZXNUb0FycmF5c1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogICAgICAgICAgICAgICAgICAgICAgT2JqZWN0cyB3aGVyZSB0byBleHRyYWN0IGtleXMgYW5kIHZhbHVlc1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tLlxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIHJlc3VsdFxuICogICAgICAgICB7QXJyYXkuPFN0cmluZz59IHJlc3VsdC5rZXlzICAgICBLZXlzIG9mIGByZXN1bHRgLCBhcyByZXR1cm5lZCBieVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgT2JqZWN0LmtleXMoKWBcbiAqICAgICAgICAge0FycmF5fSAgICAgICAgICByZXN1bHQudmFsdWVzICAgVmFsdWVzIG9mIHBhc3NlZCBpbiBvYmplY3QuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ga2V5VmFsdWVzVG9BcnJheXMob2JqKSB7XG4gICAgdmFyIGtleXNBcnJheSA9IFtdLCB2YWx1ZXNBcnJheSA9IFtdO1xuICAgIHZhciBpID0gMDtcbiAgICBmb3IodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICBrZXlzQXJyYXlbaV0gPSBrZXk7XG4gICAgICAgICAgICB2YWx1ZXNBcnJheVtpXSA9IG9ialtrZXldO1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIGtleXM6IGtleXNBcnJheSxcbiAgICAgICAgdmFsdWVzOiB2YWx1ZXNBcnJheVxuICAgIH07XG59O1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgUFJFRklYRVMgPSBbJycsICctbXMtJywgJy13ZWJraXQtJywgJy1tb3otJywgJy1vLSddO1xuXG4vKipcbiAqIEEgaGVscGVyIGZ1bmN0aW9uIHVzZWQgZm9yIGRldGVybWluaW5nIHRoZSB2ZW5kb3IgcHJlZml4ZWQgdmVyc2lvbiBvZiB0aGVcbiAqIHBhc3NlZCBpbiBDU1MgcHJvcGVydHkuXG4gKlxuICogVmVuZG9yIGNoZWNrcyBhcmUgYmVpbmcgY29uZHVjdGVkIGluIHRoZSBmb2xsb3dpbmcgb3JkZXI6XG4gKlxuICogMS4gKG5vIHByZWZpeClcbiAqIDIuIGAtbXotYFxuICogMy4gYC13ZWJraXQtYFxuICogNC4gYC1tb3otYFxuICogNS4gYC1vLWBcbiAqXG4gKiBAbWV0aG9kIHZlbmRvclByZWZpeFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwcm9wZXJ0eSAgICAgQ1NTIHByb3BlcnR5IChubyBjYW1lbENhc2UpLCBlLmcuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBib3JkZXItcmFkaXVzYC5cbiAqIEByZXR1cm4ge1N0cmluZ30gcHJlZml4ZWQgICAgVmVuZG9yIHByZWZpeGVkIHZlcnNpb24gb2YgcGFzc2VkIGluIENTU1xuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eSAoZS5nLiBgLXdlYmtpdC1ib3JkZXItcmFkaXVzYCkuXG4gKi9cbmZ1bmN0aW9uIHZlbmRvclByZWZpeChwcm9wZXJ0eSkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgUFJFRklYRVMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByZWZpeGVkID0gUFJFRklYRVNbaV0gKyBwcm9wZXJ0eTtcbiAgICAgICAgaWYgKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZVtwcmVmaXhlZF0gPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gcHJlZml4ZWQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHByb3BlcnR5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHZlbmRvclByZWZpeDtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBCdWZmZXIgaXMgYSBwcml2YXRlIGNsYXNzIHRoYXQgd3JhcHMgdGhlIHZlcnRleCBkYXRhIHRoYXQgZGVmaW5lc1xuICogdGhlIHRoZSBwb2ludHMgb2YgdGhlIHRyaWFuZ2xlcyB0aGF0IHdlYmdsIGRyYXdzLiBFYWNoIGJ1ZmZlclxuICogbWFwcyB0byBvbmUgYXR0cmlidXRlIG9mIGEgbWVzaC5cbiAqXG4gKiBAY2xhc3MgQnVmZmVyXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gdGFyZ2V0IFRoZSBiaW5kIHRhcmdldCBvZiB0aGUgYnVmZmVyIHRvIHVwZGF0ZTogQVJSQVlfQlVGRkVSIG9yIEVMRU1FTlRfQVJSQVlfQlVGRkVSXG4gKiBAcGFyYW0ge09iamVjdH0gdHlwZSBBcnJheSB0eXBlIHRvIGJlIHVzZWQgaW4gY2FsbHMgdG8gZ2wuYnVmZmVyRGF0YS5cbiAqIEBwYXJhbSB7V2ViR0xDb250ZXh0fSBnbCBUaGUgV2ViR0wgY29udGV4dCB0aGF0IHRoZSBidWZmZXIgaXMgaG9zdGVkIGJ5LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlcih0YXJnZXQsIHR5cGUsIGdsKSB7XG4gICAgdGhpcy5idWZmZXIgPSBudWxsO1xuICAgIHRoaXMudGFyZ2V0ID0gdGFyZ2V0O1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5kYXRhID0gW107XG4gICAgdGhpcy5nbCA9IGdsO1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBXZWJHTCBidWZmZXIgaWYgb25lIGRvZXMgbm90IHlldCBleGlzdCBhbmQgYmluZHMgdGhlIGJ1ZmZlciB0b1xuICogdG8gdGhlIGNvbnRleHQuIFJ1bnMgYnVmZmVyRGF0YSB3aXRoIGFwcHJvcHJpYXRlIGRhdGEuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUuc3ViRGF0YSA9IGZ1bmN0aW9uIHN1YkRhdGEoKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICB2YXIgZGF0YSA9IFtdO1xuXG4gICAgLy8gdG8gcHJldmVudCBhZ2FpbnN0IG1heGltdW0gY2FsbC1zdGFjayBpc3N1ZS5cbiAgICBmb3IgKHZhciBpID0gMCwgY2h1bmsgPSAxMDAwMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkgKz0gY2h1bmspXG4gICAgICAgIGRhdGEgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KGRhdGEsIHRoaXMuZGF0YS5zbGljZShpLCBpICsgY2h1bmspKTtcblxuICAgIHRoaXMuYnVmZmVyID0gdGhpcy5idWZmZXIgfHwgZ2wuY3JlYXRlQnVmZmVyKCk7XG4gICAgZ2wuYmluZEJ1ZmZlcih0aGlzLnRhcmdldCwgdGhpcy5idWZmZXIpO1xuICAgIGdsLmJ1ZmZlckRhdGEodGhpcy50YXJnZXQsIG5ldyB0aGlzLnR5cGUoZGF0YSksIGdsLlNUQVRJQ19EUkFXKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyO1xuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgSU5ESUNFUyA9ICdpbmRpY2VzJztcblxudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJy4vQnVmZmVyJyk7XG5cbi8qKlxuICogQnVmZmVyUmVnaXN0cnkgaXMgYSBjbGFzcyB0aGF0IG1hbmFnZXMgYWxsb2NhdGlvbiBvZiBidWZmZXJzIHRvXG4gKiBpbnB1dCBnZW9tZXRyaWVzLlxuICpcbiAqIEBjbGFzcyBCdWZmZXJSZWdpc3RyeVxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtXZWJHTENvbnRleHR9IGNvbnRleHQgV2ViR0wgZHJhd2luZyBjb250ZXh0IHRvIGJlIHBhc3NlZCB0byBidWZmZXJzLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlclJlZ2lzdHJ5KGNvbnRleHQpIHtcbiAgICB0aGlzLmdsID0gY29udGV4dDtcblxuICAgIHRoaXMucmVnaXN0cnkgPSB7fTtcbiAgICB0aGlzLl9keW5hbWljQnVmZmVycyA9IFtdO1xuICAgIHRoaXMuX3N0YXRpY0J1ZmZlcnMgPSBbXTtcblxuICAgIHRoaXMuX2FycmF5QnVmZmVyTWF4ID0gMzAwMDA7XG4gICAgdGhpcy5fZWxlbWVudEJ1ZmZlck1heCA9IDMwMDAwO1xufVxuXG4vKipcbiAqIEJpbmRzIGFuZCBmaWxscyBhbGwgdGhlIHZlcnRleCBkYXRhIGludG8gd2ViZ2wgYnVmZmVycy4gIFdpbGwgcmV1c2UgYnVmZmVycyBpZlxuICogcG9zc2libGUuICBQb3B1bGF0ZXMgcmVnaXN0cnkgd2l0aCB0aGUgbmFtZSBvZiB0aGUgYnVmZmVyLCB0aGUgV2ViR0wgYnVmZmVyXG4gKiBvYmplY3QsIHNwYWNpbmcgb2YgdGhlIGF0dHJpYnV0ZSwgdGhlIGF0dHJpYnV0ZSdzIG9mZnNldCB3aXRoaW4gdGhlIGJ1ZmZlcixcbiAqIGFuZCBmaW5hbGx5IHRoZSBsZW5ndGggb2YgdGhlIGJ1ZmZlci4gIFRoaXMgaW5mb3JtYXRpb24gaXMgbGF0ZXIgYWNjZXNzZWQgYnlcbiAqIHRoZSByb290IHRvIGRyYXcgdGhlIGJ1ZmZlcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBnZW9tZXRyeUlkIElkIG9mIHRoZSBnZW9tZXRyeSBpbnN0YW5jZSB0aGF0IGhvbGRzIHRoZSBidWZmZXJzLlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgS2V5IG9mIHRoZSBpbnB1dCBidWZmZXIgaW4gdGhlIGdlb21ldHJ5LlxuICogQHBhcmFtIHtBcnJheX0gdmFsdWUgRmxhdCBhcnJheSBjb250YWluaW5nIGlucHV0IGRhdGEgZm9yIGJ1ZmZlci5cbiAqIEBwYXJhbSB7TnVtYmVyfSBzcGFjaW5nIFRoZSBzcGFjaW5nLCBvciBpdGVtU2l6ZSwgb2YgdGhlIGlucHV0IGJ1ZmZlci5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZHluYW1pYyBCb29sZWFuIGRlbm90aW5nIHdoZXRoZXIgYSBnZW9tZXRyeSBpcyBkeW5hbWljIG9yIHN0YXRpYy5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5CdWZmZXJSZWdpc3RyeS5wcm90b3R5cGUuYWxsb2NhdGUgPSBmdW5jdGlvbiBhbGxvY2F0ZShnZW9tZXRyeUlkLCBuYW1lLCB2YWx1ZSwgc3BhY2luZywgZHluYW1pYykge1xuICAgIHZhciB2ZXJ0ZXhCdWZmZXJzID0gdGhpcy5yZWdpc3RyeVtnZW9tZXRyeUlkXSB8fCAodGhpcy5yZWdpc3RyeVtnZW9tZXRyeUlkXSA9IHsga2V5czogW10sIHZhbHVlczogW10sIHNwYWNpbmc6IFtdLCBvZmZzZXQ6IFtdLCBsZW5ndGg6IFtdIH0pO1xuXG4gICAgdmFyIGogPSB2ZXJ0ZXhCdWZmZXJzLmtleXMuaW5kZXhPZihuYW1lKTtcbiAgICB2YXIgaXNJbmRleCA9IG5hbWUgPT09IElORElDRVM7XG4gICAgdmFyIGJ1ZmZlckZvdW5kID0gZmFsc2U7XG4gICAgdmFyIG5ld09mZnNldDtcbiAgICB2YXIgb2Zmc2V0ID0gMDtcbiAgICB2YXIgbGVuZ3RoO1xuICAgIHZhciBidWZmZXI7XG4gICAgdmFyIGs7XG5cbiAgICBpZiAoaiA9PT0gLTEpIHtcbiAgICAgICAgaiA9IHZlcnRleEJ1ZmZlcnMua2V5cy5sZW5ndGg7XG4gICAgICAgIGxlbmd0aCA9IGlzSW5kZXggPyB2YWx1ZS5sZW5ndGggOiBNYXRoLmZsb29yKHZhbHVlLmxlbmd0aCAvIHNwYWNpbmcpO1xuXG4gICAgICAgIGlmICghZHluYW1pYykge1xuXG4gICAgICAgICAgICAvLyBVc2UgYSBwcmV2aW91c2x5IGNyZWF0ZWQgYnVmZmVyIGlmIGF2YWlsYWJsZS5cblxuICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IHRoaXMuX3N0YXRpY0J1ZmZlcnMubGVuZ3RoOyBrKyspIHtcblxuICAgICAgICAgICAgICAgIGlmIChpc0luZGV4ID09PSB0aGlzLl9zdGF0aWNCdWZmZXJzW2tdLmlzSW5kZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3T2Zmc2V0ID0gdGhpcy5fc3RhdGljQnVmZmVyc1trXS5vZmZzZXQgKyB2YWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIGlmICgoIWlzSW5kZXggJiYgbmV3T2Zmc2V0IDwgdGhpcy5fYXJyYXlCdWZmZXJNYXgpIHx8IChpc0luZGV4ICYmIG5ld09mZnNldCA8IHRoaXMuX2VsZW1lbnRCdWZmZXJNYXgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWZmZXIgPSB0aGlzLl9zdGF0aWNCdWZmZXJzW2tdLmJ1ZmZlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldCA9IHRoaXMuX3N0YXRpY0J1ZmZlcnNba10ub2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5fc3RhdGljQnVmZmVyc1trXS5vZmZzZXQgKz0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZmVyRm91bmQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIG5ldyBzdGF0aWMgYnVmZmVyIGluIG5vbmUgd2VyZSBmb3VuZC5cblxuICAgICAgICAgICAgaWYgKCFidWZmZXJGb3VuZCkge1xuICAgICAgICAgICAgICAgIGJ1ZmZlciA9IG5ldyBCdWZmZXIoXG4gICAgICAgICAgICAgICAgICAgIGlzSW5kZXggPyB0aGlzLmdsLkVMRU1FTlRfQVJSQVlfQlVGRkVSIDogdGhpcy5nbC5BUlJBWV9CVUZGRVIsXG4gICAgICAgICAgICAgICAgICAgIGlzSW5kZXggPyBVaW50MTZBcnJheSA6IEZsb2F0MzJBcnJheSxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nbFxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB0aGlzLl9zdGF0aWNCdWZmZXJzLnB1c2goeyBidWZmZXI6IGJ1ZmZlciwgb2Zmc2V0OiB2YWx1ZS5sZW5ndGgsIGlzSW5kZXg6IGlzSW5kZXggfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG5cbiAgICAgICAgICAgIC8vIEZvciBkeW5hbWljIGdlb21ldHJpZXMsIGFsd2F5cyBjcmVhdGUgbmV3IGJ1ZmZlci5cblxuICAgICAgICAgICAgYnVmZmVyID0gbmV3IEJ1ZmZlcihcbiAgICAgICAgICAgICAgICBpc0luZGV4ID8gdGhpcy5nbC5FTEVNRU5UX0FSUkFZX0JVRkZFUiA6IHRoaXMuZ2wuQVJSQVlfQlVGRkVSLFxuICAgICAgICAgICAgICAgIGlzSW5kZXggPyBVaW50MTZBcnJheSA6IEZsb2F0MzJBcnJheSxcbiAgICAgICAgICAgICAgICB0aGlzLmdsXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICB0aGlzLl9keW5hbWljQnVmZmVycy5wdXNoKHsgYnVmZmVyOiBidWZmZXIsIG9mZnNldDogdmFsdWUubGVuZ3RoLCBpc0luZGV4OiBpc0luZGV4IH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSByZWdpc3RyeSBmb3IgdGhlIHNwZWMgd2l0aCBidWZmZXIgaW5mb3JtYXRpb24uXG5cbiAgICAgICAgdmVydGV4QnVmZmVycy5rZXlzLnB1c2gobmFtZSk7XG4gICAgICAgIHZlcnRleEJ1ZmZlcnMudmFsdWVzLnB1c2goYnVmZmVyKTtcbiAgICAgICAgdmVydGV4QnVmZmVycy5zcGFjaW5nLnB1c2goc3BhY2luZyk7XG4gICAgICAgIHZlcnRleEJ1ZmZlcnMub2Zmc2V0LnB1c2gob2Zmc2V0KTtcbiAgICAgICAgdmVydGV4QnVmZmVycy5sZW5ndGgucHVzaChsZW5ndGgpO1xuICAgIH1cblxuICAgIHZhciBsZW4gPSB2YWx1ZS5sZW5ndGg7XG4gICAgZm9yIChrID0gMDsgayA8IGxlbjsgaysrKSB7XG4gICAgICAgIHZlcnRleEJ1ZmZlcnMudmFsdWVzW2pdLmRhdGFbb2Zmc2V0ICsga10gPSB2YWx1ZVtrXTtcbiAgICB9XG4gICAgdmVydGV4QnVmZmVycy52YWx1ZXNbal0uc3ViRGF0YSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXJSZWdpc3RyeTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuLyoqXG4gKiBUYWtlcyB0aGUgb3JpZ2luYWwgcmVuZGVyaW5nIGNvbnRleHRzJyBjb21waWxlciBmdW5jdGlvblxuICogYW5kIGF1Z21lbnRzIGl0IHdpdGggYWRkZWQgZnVuY3Rpb25hbGl0eSBmb3IgcGFyc2luZyBhbmRcbiAqIGRpc3BsYXlpbmcgZXJyb3JzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IEF1Z21lbnRlZCBmdW5jdGlvblxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIERlYnVnKCkge1xuICAgIHJldHVybiBfYXVnbWVudEZ1bmN0aW9uKFxuICAgICAgICB0aGlzLmdsLmNvbXBpbGVTaGFkZXIsXG4gICAgICAgIGZ1bmN0aW9uKHNoYWRlcikge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmdldFNoYWRlclBhcmFtZXRlcihzaGFkZXIsIHRoaXMuQ09NUElMRV9TVEFUVVMpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9ycyA9IHRoaXMuZ2V0U2hhZGVySW5mb0xvZyhzaGFkZXIpO1xuICAgICAgICAgICAgICAgIHZhciBzb3VyY2UgPSB0aGlzLmdldFNoYWRlclNvdXJjZShzaGFkZXIpO1xuICAgICAgICAgICAgICAgIF9wcm9jZXNzRXJyb3JzKGVycm9ycywgc291cmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vLyBUYWtlcyBhIGZ1bmN0aW9uLCBrZWVwcyB0aGUgcmVmZXJlbmNlIGFuZCByZXBsYWNlcyBpdCBieSBhIGNsb3N1cmUgdGhhdFxuLy8gZXhlY3V0ZXMgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uIGFuZCB0aGUgcHJvdmlkZWQgY2FsbGJhY2suXG5mdW5jdGlvbiBfYXVnbWVudEZ1bmN0aW9uKGZ1bmMsIGNhbGxiYWNrKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVzID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBjYWxsYmFjay5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG59XG5cbi8vIFBhcnNlcyBlcnJvcnMgYW5kIGZhaWxlZCBzb3VyY2UgY29kZSBmcm9tIHNoYWRlcnMgaW4gb3JkZXJcbi8vIHRvIGJ1aWxkIGRpc3BsYXlhYmxlIGVycm9yIGJsb2Nrcy5cbi8vIEluc3BpcmVkIGJ5IEphdW1lIFNhbmNoZXogRWxpYXMuXG5mdW5jdGlvbiBfcHJvY2Vzc0Vycm9ycyhlcnJvcnMsIHNvdXJjZSkge1xuXG4gICAgdmFyIGNzcyA9ICdib2R5LGh0bWx7YmFja2dyb3VuZDojZTNlM2UzO2ZvbnQtZmFtaWx5Om1vbmFjbyxtb25vc3BhY2U7Zm9udC1zaXplOjE0cHg7bGluZS1oZWlnaHQ6MS43ZW19JyArXG4gICAgICAgICAgICAgICcjc2hhZGVyUmVwb3J0e2xlZnQ6MDt0b3A6MDtyaWdodDowO2JveC1zaXppbmc6Ym9yZGVyLWJveDtwb3NpdGlvbjphYnNvbHV0ZTt6LWluZGV4OjEwMDA7Y29sb3I6JyArXG4gICAgICAgICAgICAgICcjMjIyO3BhZGRpbmc6MTVweDt3aGl0ZS1zcGFjZTpub3JtYWw7bGlzdC1zdHlsZS10eXBlOm5vbmU7bWFyZ2luOjUwcHggYXV0bzttYXgtd2lkdGg6MTIwMHB4fScgK1xuICAgICAgICAgICAgICAnI3NoYWRlclJlcG9ydCBsaXtiYWNrZ3JvdW5kLWNvbG9yOiNmZmY7bWFyZ2luOjEzcHggMDtib3gtc2hhZG93OjAgMXB4IDJweCByZ2JhKDAsMCwwLC4xNSk7JyArXG4gICAgICAgICAgICAgICdwYWRkaW5nOjIwcHggMzBweDtib3JkZXItcmFkaXVzOjJweDtib3JkZXItbGVmdDoyMHB4IHNvbGlkICNlMDExMTF9c3Bhbntjb2xvcjojZTAxMTExOycgK1xuICAgICAgICAgICAgICAndGV4dC1kZWNvcmF0aW9uOnVuZGVybGluZTtmb250LXdlaWdodDo3MDB9I3NoYWRlclJlcG9ydCBsaSBwe3BhZGRpbmc6MDttYXJnaW46MH0nICtcbiAgICAgICAgICAgICAgJyNzaGFkZXJSZXBvcnQgbGk6bnRoLWNoaWxkKGV2ZW4pe2JhY2tncm91bmQtY29sb3I6I2Y0ZjRmNH0nICtcbiAgICAgICAgICAgICAgJyNzaGFkZXJSZXBvcnQgbGkgcDpmaXJzdC1jaGlsZHttYXJnaW4tYm90dG9tOjEwcHg7Y29sb3I6IzY2Nn0nO1xuXG4gICAgdmFyIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaGVhZCcpWzBdLmFwcGVuZENoaWxkKGVsKTtcbiAgICBlbC50ZXh0Q29udGVudCA9IGNzcztcblxuICAgIHZhciByZXBvcnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1bCcpO1xuICAgIHJlcG9ydC5zZXRBdHRyaWJ1dGUoJ2lkJywgJ3NoYWRlclJlcG9ydCcpO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocmVwb3J0KTtcblxuICAgIHZhciByZSA9IC9FUlJPUjogW1xcZF0rOihbXFxkXSspOiAoLispL2dtaTtcbiAgICB2YXIgbGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpO1xuXG4gICAgdmFyIG07XG4gICAgd2hpbGUgKChtID0gcmUuZXhlYyhlcnJvcnMpKSAhPSBudWxsKSB7XG4gICAgICAgIGlmIChtLmluZGV4ID09PSByZS5sYXN0SW5kZXgpIHJlLmxhc3RJbmRleCsrO1xuICAgICAgICB2YXIgbGkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaScpO1xuICAgICAgICB2YXIgY29kZSA9ICc8cD48c3Bhbj5FUlJPUjwvc3Bhbj4gXCInICsgbVsyXSArICdcIiBpbiBsaW5lICcgKyBtWzFdICsgJzwvcD4nO1xuICAgICAgICBjb2RlICs9ICc8cD48Yj4nICsgbGluZXNbbVsxXSAtIDFdLnJlcGxhY2UoL15bIFxcdF0rL2csICcnKSArICc8L2I+PC9wPic7XG4gICAgICAgIGxpLmlubmVySFRNTCA9IGNvZGU7XG4gICAgICAgIHJlcG9ydC5hcHBlbmRDaGlsZChsaSk7XG4gICAgfVxufVxuIiwiLyoqXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXG4gKiBUSEUgU09GVFdBUkUuXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY2xvbmUgPSByZXF1aXJlKCcuLi91dGlsaXRpZXMvY2xvbmUnKTtcbnZhciBrZXlWYWx1ZVRvQXJyYXlzID0gcmVxdWlyZSgnLi4vdXRpbGl0aWVzL2tleVZhbHVlVG9BcnJheXMnKTtcblxudmFyIHZlcnRleFdyYXBwZXIgPSByZXF1aXJlKCcuLi93ZWJnbC1zaGFkZXJzJykudmVydGV4O1xudmFyIGZyYWdtZW50V3JhcHBlciA9IHJlcXVpcmUoJy4uL3dlYmdsLXNoYWRlcnMnKS5mcmFnbWVudDtcbnZhciBEZWJ1ZyA9IHJlcXVpcmUoJy4vRGVidWcnKTtcblxudmFyIFZFUlRFWF9TSEFERVIgPSAzNTYzMztcbnZhciBGUkFHTUVOVF9TSEFERVIgPSAzNTYzMjtcbnZhciBpZGVudGl0eU1hdHJpeCA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXTtcblxudmFyIGhlYWRlciA9ICdwcmVjaXNpb24gbWVkaXVtcCBmbG9hdDtcXG4nO1xuXG52YXIgVFlQRVMgPSB7XG4gICAgdW5kZWZpbmVkOiAnZmxvYXQgJyxcbiAgICAxOiAnZmxvYXQgJyxcbiAgICAyOiAndmVjMiAnLFxuICAgIDM6ICd2ZWMzICcsXG4gICAgNDogJ3ZlYzQgJyxcbiAgICAxNjogJ21hdDQgJ1xufTtcblxudmFyIGlucHV0VHlwZXMgPSB7XG4gICAgdV9iYXNlQ29sb3I6ICd2ZWM0JyxcbiAgICB1X25vcm1hbHM6ICd2ZXJ0JyxcbiAgICB1X2dsb3NzaW5lc3M6ICd2ZWM0JyxcbiAgICB1X3Bvc2l0aW9uT2Zmc2V0OiAndmVydCdcbn07XG5cbnZhciBtYXNrcyA9ICB7XG4gICAgdmVydDogMSxcbiAgICB2ZWMzOiAyLFxuICAgIHZlYzQ6IDQsXG4gICAgZmxvYXQ6IDhcbn07XG5cbi8qKlxuICogVW5pZm9ybSBrZXlzIGFuZCB2YWx1ZXNcbiAqL1xudmFyIHVuaWZvcm1zID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgdV9wZXJzcGVjdGl2ZTogaWRlbnRpdHlNYXRyaXgsXG4gICAgdV92aWV3OiBpZGVudGl0eU1hdHJpeCxcbiAgICB1X3Jlc29sdXRpb246IFswLCAwLCAwXSxcbiAgICB1X3RyYW5zZm9ybTogaWRlbnRpdHlNYXRyaXgsXG4gICAgdV9zaXplOiBbMSwgMSwgMV0sXG4gICAgdV90aW1lOiAwLFxuICAgIHVfb3BhY2l0eTogMSxcbiAgICB1X21ldGFsbmVzczogMCxcbiAgICB1X2dsb3NzaW5lc3M6IFswLCAwLCAwLCAwXSxcbiAgICB1X2Jhc2VDb2xvcjogWzEsIDEsIDEsIDFdLFxuICAgIHVfbm9ybWFsczogWzEsIDEsIDFdLFxuICAgIHVfcG9zaXRpb25PZmZzZXQ6IFswLCAwLCAwXSxcbiAgICB1X2xpZ2h0UG9zaXRpb246IGlkZW50aXR5TWF0cml4LFxuICAgIHVfbGlnaHRDb2xvcjogaWRlbnRpdHlNYXRyaXgsXG4gICAgdV9hbWJpZW50TGlnaHQ6IFswLCAwLCAwXSxcbiAgICB1X2ZsYXRTaGFkaW5nOiAwLFxuICAgIHVfbnVtTGlnaHRzOiAwXG59KTtcblxuLyoqXG4gKiBBdHRyaWJ1dGVzIGtleXMgYW5kIHZhbHVlc1xuICovXG52YXIgYXR0cmlidXRlcyA9IGtleVZhbHVlVG9BcnJheXMoe1xuICAgIGFfcG9zOiBbMCwgMCwgMF0sXG4gICAgYV90ZXhDb29yZDogWzAsIDBdLFxuICAgIGFfbm9ybWFsczogWzAsIDAsIDBdXG59KTtcblxuLyoqXG4gKiBWYXJ5aW5ncyBrZXlzIGFuZCB2YWx1ZXNcbiAqL1xudmFyIHZhcnlpbmdzID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgdl90ZXh0dXJlQ29vcmRpbmF0ZTogWzAsIDBdLFxuICAgIHZfbm9ybWFsOiBbMCwgMCwgMF0sXG4gICAgdl9wb3NpdGlvbjogWzAsIDAsIDBdLFxuICAgIHZfZXllVmVjdG9yOiBbMCwgMCwgMF1cbn0pO1xuXG4vKipcbiAqIEEgY2xhc3MgdGhhdCBoYW5kbGVzIGludGVyYWN0aW9ucyB3aXRoIHRoZSBXZWJHTCBzaGFkZXIgcHJvZ3JhbVxuICogdXNlZCBieSBhIHNwZWNpZmljIGNvbnRleHQuICBJdCBtYW5hZ2VzIGNyZWF0aW9uIG9mIHRoZSBzaGFkZXIgcHJvZ3JhbVxuICogYW5kIHRoZSBhdHRhY2hlZCB2ZXJ0ZXggYW5kIGZyYWdtZW50IHNoYWRlcnMuICBJdCBpcyBhbHNvIGluIGNoYXJnZSBvZlxuICogcGFzc2luZyBhbGwgdW5pZm9ybXMgdG8gdGhlIFdlYkdMQ29udGV4dC5cbiAqXG4gKiBAY2xhc3MgUHJvZ3JhbVxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtXZWJHTF9Db250ZXh0fSBnbCBDb250ZXh0IHRvIGJlIHVzZWQgdG8gY3JlYXRlIHRoZSBzaGFkZXIgcHJvZ3JhbVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgUHJvZ3JhbSBvcHRpb25zXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuZnVuY3Rpb24gUHJvZ3JhbShnbCwgb3B0aW9ucykge1xuICAgIHRoaXMuZ2wgPSBnbDtcbiAgICB0aGlzLnRleHR1cmVTbG90cyA9IDE7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHRoaXMucmVnaXN0ZXJlZE1hdGVyaWFscyA9IHt9O1xuICAgIHRoaXMuZmxhZ2dlZFVuaWZvcm1zID0gW107XG4gICAgdGhpcy5jYWNoZWRVbmlmb3JtcyAgPSB7fTtcbiAgICB0aGlzLnVuaWZvcm1UeXBlcyA9IFtdO1xuXG4gICAgdGhpcy5kZWZpbml0aW9uVmVjNCA9IFtdO1xuICAgIHRoaXMuZGVmaW5pdGlvblZlYzMgPSBbXTtcbiAgICB0aGlzLmRlZmluaXRpb25GbG9hdCA9IFtdO1xuICAgIHRoaXMuYXBwbGljYXRpb25WZWMzID0gW107XG4gICAgdGhpcy5hcHBsaWNhdGlvblZlYzQgPSBbXTtcbiAgICB0aGlzLmFwcGxpY2F0aW9uRmxvYXQgPSBbXTtcbiAgICB0aGlzLmFwcGxpY2F0aW9uVmVydCA9IFtdO1xuICAgIHRoaXMuZGVmaW5pdGlvblZlcnQgPSBbXTtcblxuICAgIHRoaXMucmVzZXRQcm9ncmFtKCk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lcyB3aGV0aGVyIGEgbWF0ZXJpYWwgaGFzIGFscmVhZHkgYmVlbiByZWdpc3RlcmVkIHRvXG4gKiB0aGUgc2hhZGVyIHByb2dyYW0uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE5hbWUgb2YgdGFyZ2V0IGlucHV0IG9mIG1hdGVyaWFsLlxuICogQHBhcmFtIHtPYmplY3R9IG1hdGVyaWFsIENvbXBpbGVkIG1hdGVyaWFsIG9iamVjdCBiZWluZyB2ZXJpZmllZC5cbiAqXG4gKiBAcmV0dXJuIHtQcm9ncmFtfSB0aGlzIEN1cnJlbnQgcHJvZ3JhbS5cbiAqL1xuUHJvZ3JhbS5wcm90b3R5cGUucmVnaXN0ZXJNYXRlcmlhbCA9IGZ1bmN0aW9uIHJlZ2lzdGVyTWF0ZXJpYWwobmFtZSwgbWF0ZXJpYWwpIHtcbiAgICB2YXIgY29tcGlsZWQgPSBtYXRlcmlhbDtcbiAgICB2YXIgdHlwZSA9IGlucHV0VHlwZXNbbmFtZV07XG4gICAgdmFyIG1hc2sgPSBtYXNrc1t0eXBlXTtcblxuICAgIGlmICgodGhpcy5yZWdpc3RlcmVkTWF0ZXJpYWxzW21hdGVyaWFsLl9pZF0gJiBtYXNrKSA9PT0gbWFzaykgcmV0dXJuIHRoaXM7XG5cbiAgICB2YXIgaztcblxuICAgIGZvciAoayBpbiBjb21waWxlZC51bmlmb3Jtcykge1xuICAgICAgICBpZiAodW5pZm9ybXMua2V5cy5pbmRleE9mKGspID09PSAtMSkge1xuICAgICAgICAgICAgdW5pZm9ybXMua2V5cy5wdXNoKGspO1xuICAgICAgICAgICAgdW5pZm9ybXMudmFsdWVzLnB1c2goY29tcGlsZWQudW5pZm9ybXNba10pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChrIGluIGNvbXBpbGVkLnZhcnlpbmdzKSB7XG4gICAgICAgIGlmICh2YXJ5aW5ncy5rZXlzLmluZGV4T2YoaykgPT09IC0xKSB7XG4gICAgICAgICAgICB2YXJ5aW5ncy5rZXlzLnB1c2goayk7XG4gICAgICAgICAgICB2YXJ5aW5ncy52YWx1ZXMucHVzaChjb21waWxlZC52YXJ5aW5nc1trXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGsgaW4gY29tcGlsZWQuYXR0cmlidXRlcykge1xuICAgICAgICBpZiAoYXR0cmlidXRlcy5rZXlzLmluZGV4T2YoaykgPT09IC0xKSB7XG4gICAgICAgICAgICBhdHRyaWJ1dGVzLmtleXMucHVzaChrKTtcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMudmFsdWVzLnB1c2goY29tcGlsZWQuYXR0cmlidXRlc1trXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJlZ2lzdGVyZWRNYXRlcmlhbHNbbWF0ZXJpYWwuX2lkXSB8PSBtYXNrO1xuXG4gICAgaWYgKHR5cGUgPT09ICdmbG9hdCcpIHtcbiAgICAgICAgdGhpcy5kZWZpbml0aW9uRmxvYXQucHVzaChtYXRlcmlhbC5kZWZpbmVzKTtcbiAgICAgICAgdGhpcy5kZWZpbml0aW9uRmxvYXQucHVzaCgnZmxvYXQgZmFfJyArIG1hdGVyaWFsLl9pZCArICcoKSB7XFxuICcgICsgY29tcGlsZWQuZ2xzbCArICcgXFxufScpO1xuICAgICAgICB0aGlzLmFwcGxpY2F0aW9uRmxvYXQucHVzaCgnaWYgKGludChhYnMoSUQpKSA9PSAnICsgbWF0ZXJpYWwuX2lkICsgJykgcmV0dXJuIGZhXycgKyBtYXRlcmlhbC5faWQgICsgJygpOycpO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSAndmVjMycpIHtcbiAgICAgICAgdGhpcy5kZWZpbml0aW9uVmVjMy5wdXNoKG1hdGVyaWFsLmRlZmluZXMpO1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZWMzLnB1c2goJ3ZlYzMgZmFfJyArIG1hdGVyaWFsLl9pZCArICcoKSB7XFxuICcgICsgY29tcGlsZWQuZ2xzbCArICcgXFxufScpO1xuICAgICAgICB0aGlzLmFwcGxpY2F0aW9uVmVjMy5wdXNoKCdpZiAoaW50KGFicyhJRC54KSkgPT0gJyArIG1hdGVyaWFsLl9pZCArICcpIHJldHVybiBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpOycpO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSAndmVjNCcpIHtcbiAgICAgICAgdGhpcy5kZWZpbml0aW9uVmVjNC5wdXNoKG1hdGVyaWFsLmRlZmluZXMpO1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZWM0LnB1c2goJ3ZlYzQgZmFfJyArIG1hdGVyaWFsLl9pZCArICcoKSB7XFxuICcgICsgY29tcGlsZWQuZ2xzbCArICcgXFxufScpO1xuICAgICAgICB0aGlzLmFwcGxpY2F0aW9uVmVjNC5wdXNoKCdpZiAoaW50KGFicyhJRC54KSkgPT0gJyArIG1hdGVyaWFsLl9pZCArICcpIHJldHVybiBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpOycpO1xuICAgIH1cblxuICAgIGlmICh0eXBlID09PSAndmVydCcpIHtcbiAgICAgICAgdGhpcy5kZWZpbml0aW9uVmVydC5wdXNoKG1hdGVyaWFsLmRlZmluZXMpO1xuICAgICAgICB0aGlzLmRlZmluaXRpb25WZXJ0LnB1c2goJ3ZlYzMgZmFfJyArIG1hdGVyaWFsLl9pZCArICcoKSB7XFxuICcgICsgY29tcGlsZWQuZ2xzbCArICcgXFxufScpO1xuICAgICAgICB0aGlzLmFwcGxpY2F0aW9uVmVydC5wdXNoKCdpZiAoaW50KGFicyhJRC54KSkgPT0gJyArIG1hdGVyaWFsLl9pZCArICcpIHJldHVybiBmYV8nICsgbWF0ZXJpYWwuX2lkICsgJygpOycpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnJlc2V0UHJvZ3JhbSgpO1xufTtcblxuLyoqXG4gKiBDbGVhcnMgYWxsIGNhY2hlZCB1bmlmb3JtcyBhbmQgYXR0cmlidXRlIGxvY2F0aW9ucy4gIEFzc2VtYmxlc1xuICogbmV3IGZyYWdtZW50IGFuZCB2ZXJ0ZXggc2hhZGVycyBhbmQgYmFzZWQgb24gbWF0ZXJpYWwgZnJvbVxuICogY3VycmVudGx5IHJlZ2lzdGVyZWQgbWF0ZXJpYWxzLiAgQXR0YWNoZXMgc2FpZCBzaGFkZXJzIHRvIG5ld1xuICogc2hhZGVyIHByb2dyYW0gYW5kIHVwb24gc3VjY2VzcyBsaW5rcyBwcm9ncmFtIHRvIHRoZSBXZWJHTFxuICogY29udGV4dC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHJldHVybiB7UHJvZ3JhbX0gQ3VycmVudCBwcm9ncmFtLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS5yZXNldFByb2dyYW0gPSBmdW5jdGlvbiByZXNldFByb2dyYW0oKSB7XG4gICAgdmFyIHZlcnRleEhlYWRlciA9IFtoZWFkZXJdO1xuICAgIHZhciBmcmFnbWVudEhlYWRlciA9IFtoZWFkZXJdO1xuXG4gICAgdmFyIGZyYWdtZW50U291cmNlO1xuICAgIHZhciB2ZXJ0ZXhTb3VyY2U7XG4gICAgdmFyIHByb2dyYW07XG4gICAgdmFyIG5hbWU7XG4gICAgdmFyIHZhbHVlO1xuICAgIHZhciBpO1xuXG4gICAgdGhpcy51bmlmb3JtTG9jYXRpb25zICAgPSBbXTtcbiAgICB0aGlzLmF0dHJpYnV0ZUxvY2F0aW9ucyA9IHt9O1xuXG4gICAgdGhpcy51bmlmb3JtVHlwZXMgPSB7fTtcblxuICAgIHRoaXMuYXR0cmlidXRlTmFtZXMgPSBjbG9uZShhdHRyaWJ1dGVzLmtleXMpO1xuICAgIHRoaXMuYXR0cmlidXRlVmFsdWVzID0gY2xvbmUoYXR0cmlidXRlcy52YWx1ZXMpO1xuXG4gICAgdGhpcy52YXJ5aW5nTmFtZXMgPSBjbG9uZSh2YXJ5aW5ncy5rZXlzKTtcbiAgICB0aGlzLnZhcnlpbmdWYWx1ZXMgPSBjbG9uZSh2YXJ5aW5ncy52YWx1ZXMpO1xuXG4gICAgdGhpcy51bmlmb3JtTmFtZXMgPSBjbG9uZSh1bmlmb3Jtcy5rZXlzKTtcbiAgICB0aGlzLnVuaWZvcm1WYWx1ZXMgPSBjbG9uZSh1bmlmb3Jtcy52YWx1ZXMpO1xuXG4gICAgdGhpcy5mbGFnZ2VkVW5pZm9ybXMgPSBbXTtcbiAgICB0aGlzLmNhY2hlZFVuaWZvcm1zID0ge307XG5cbiAgICBmcmFnbWVudEhlYWRlci5wdXNoKCd1bmlmb3JtIHNhbXBsZXIyRCB1X3RleHR1cmVzWzddO1xcbicpO1xuXG4gICAgaWYgKHRoaXMuYXBwbGljYXRpb25WZXJ0Lmxlbmd0aCkge1xuICAgICAgICB2ZXJ0ZXhIZWFkZXIucHVzaCgndW5pZm9ybSBzYW1wbGVyMkQgdV90ZXh0dXJlc1s3XTtcXG4nKTtcbiAgICB9XG5cbiAgICBmb3IoaSA9IDA7IGkgPCB0aGlzLnVuaWZvcm1OYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBuYW1lID0gdGhpcy51bmlmb3JtTmFtZXNbaV07XG4gICAgICAgIHZhbHVlID0gdGhpcy51bmlmb3JtVmFsdWVzW2ldO1xuICAgICAgICB2ZXJ0ZXhIZWFkZXIucHVzaCgndW5pZm9ybSAnICsgVFlQRVNbdmFsdWUubGVuZ3RoXSArIG5hbWUgKyAnO1xcbicpO1xuICAgICAgICBmcmFnbWVudEhlYWRlci5wdXNoKCd1bmlmb3JtICcgKyBUWVBFU1t2YWx1ZS5sZW5ndGhdICsgbmFtZSArICc7XFxuJyk7XG4gICAgfVxuXG4gICAgZm9yKGkgPSAwOyBpIDwgdGhpcy5hdHRyaWJ1dGVOYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBuYW1lID0gdGhpcy5hdHRyaWJ1dGVOYW1lc1tpXTtcbiAgICAgICAgdmFsdWUgPSB0aGlzLmF0dHJpYnV0ZVZhbHVlc1tpXTtcbiAgICAgICAgdmVydGV4SGVhZGVyLnB1c2goJ2F0dHJpYnV0ZSAnICsgVFlQRVNbdmFsdWUubGVuZ3RoXSArIG5hbWUgKyAnO1xcbicpO1xuICAgIH1cblxuICAgIGZvcihpID0gMDsgaSA8IHRoaXMudmFyeWluZ05hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG5hbWUgPSB0aGlzLnZhcnlpbmdOYW1lc1tpXTtcbiAgICAgICAgdmFsdWUgPSB0aGlzLnZhcnlpbmdWYWx1ZXNbaV07XG4gICAgICAgIHZlcnRleEhlYWRlci5wdXNoKCd2YXJ5aW5nICcgKyBUWVBFU1t2YWx1ZS5sZW5ndGhdICArIG5hbWUgKyAnO1xcbicpO1xuICAgICAgICBmcmFnbWVudEhlYWRlci5wdXNoKCd2YXJ5aW5nICcgKyBUWVBFU1t2YWx1ZS5sZW5ndGhdICsgbmFtZSArICc7XFxuJyk7XG4gICAgfVxuXG4gICAgdmVydGV4U291cmNlID0gdmVydGV4SGVhZGVyLmpvaW4oJycpICsgdmVydGV4V3JhcHBlclxuICAgICAgICAucmVwbGFjZSgnI3ZlcnRfZGVmaW5pdGlvbnMnLCB0aGlzLmRlZmluaXRpb25WZXJ0LmpvaW4oJ1xcbicpKVxuICAgICAgICAucmVwbGFjZSgnI3ZlcnRfYXBwbGljYXRpb25zJywgdGhpcy5hcHBsaWNhdGlvblZlcnQuam9pbignXFxuJykpO1xuXG4gICAgZnJhZ21lbnRTb3VyY2UgPSBmcmFnbWVudEhlYWRlci5qb2luKCcnKSArIGZyYWdtZW50V3JhcHBlclxuICAgICAgICAucmVwbGFjZSgnI3ZlYzNfZGVmaW5pdGlvbnMnLCB0aGlzLmRlZmluaXRpb25WZWMzLmpvaW4oJ1xcbicpKVxuICAgICAgICAucmVwbGFjZSgnI3ZlYzNfYXBwbGljYXRpb25zJywgdGhpcy5hcHBsaWNhdGlvblZlYzMuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjdmVjNF9kZWZpbml0aW9ucycsIHRoaXMuZGVmaW5pdGlvblZlYzQuam9pbignXFxuJykpXG4gICAgICAgIC5yZXBsYWNlKCcjdmVjNF9hcHBsaWNhdGlvbnMnLCB0aGlzLmFwcGxpY2F0aW9uVmVjNC5qb2luKCdcXG4nKSlcbiAgICAgICAgLnJlcGxhY2UoJyNmbG9hdF9kZWZpbml0aW9ucycsIHRoaXMuZGVmaW5pdGlvbkZsb2F0LmpvaW4oJ1xcbicpKVxuICAgICAgICAucmVwbGFjZSgnI2Zsb2F0X2FwcGxpY2F0aW9ucycsIHRoaXMuYXBwbGljYXRpb25GbG9hdC5qb2luKCdcXG4nKSk7XG5cbiAgICBwcm9ncmFtID0gdGhpcy5nbC5jcmVhdGVQcm9ncmFtKCk7XG5cbiAgICB0aGlzLmdsLmF0dGFjaFNoYWRlcihcbiAgICAgICAgcHJvZ3JhbSxcbiAgICAgICAgdGhpcy5jb21waWxlU2hhZGVyKHRoaXMuZ2wuY3JlYXRlU2hhZGVyKFZFUlRFWF9TSEFERVIpLCB2ZXJ0ZXhTb3VyY2UpXG4gICAgKTtcblxuICAgIHRoaXMuZ2wuYXR0YWNoU2hhZGVyKFxuICAgICAgICBwcm9ncmFtLFxuICAgICAgICB0aGlzLmNvbXBpbGVTaGFkZXIodGhpcy5nbC5jcmVhdGVTaGFkZXIoRlJBR01FTlRfU0hBREVSKSwgZnJhZ21lbnRTb3VyY2UpXG4gICAgKTtcblxuICAgIHRoaXMuZ2wubGlua1Byb2dyYW0ocHJvZ3JhbSk7XG5cbiAgICBpZiAoISB0aGlzLmdsLmdldFByb2dyYW1QYXJhbWV0ZXIocHJvZ3JhbSwgdGhpcy5nbC5MSU5LX1NUQVRVUykpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignbGluayBlcnJvcjogJyArIHRoaXMuZ2wuZ2V0UHJvZ3JhbUluZm9Mb2cocHJvZ3JhbSkpO1xuICAgICAgICB0aGlzLnByb2dyYW0gPSBudWxsO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5wcm9ncmFtID0gcHJvZ3JhbTtcbiAgICAgICAgdGhpcy5nbC51c2VQcm9ncmFtKHRoaXMucHJvZ3JhbSk7XG4gICAgfVxuXG4gICAgdGhpcy5zZXRVbmlmb3Jtcyh0aGlzLnVuaWZvcm1OYW1lcywgdGhpcy51bmlmb3JtVmFsdWVzKTtcblxuICAgIHZhciB0ZXh0dXJlTG9jYXRpb24gPSB0aGlzLmdsLmdldFVuaWZvcm1Mb2NhdGlvbih0aGlzLnByb2dyYW0sICd1X3RleHR1cmVzWzBdJyk7XG4gICAgdGhpcy5nbC51bmlmb3JtMWl2KHRleHR1cmVMb2NhdGlvbiwgWzAsIDEsIDIsIDMsIDQsIDUsIDZdKTtcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDb21wYXJlcyB0aGUgdmFsdWUgb2YgdGhlIGlucHV0IHVuaWZvcm0gdmFsdWUgYWdhaW5zdFxuICogdGhlIGNhY2hlZCB2YWx1ZSBzdG9yZWQgb24gdGhlIFByb2dyYW0gY2xhc3MuICBVcGRhdGVzIGFuZFxuICogY3JlYXRlcyBuZXcgZW50cmllcyBpbiB0aGUgY2FjaGUgd2hlbiBuZWNlc3NhcnkuXG4gKlxuICogQG1ldGhvZFxuICogQHBhcmFtIHtTdHJpbmd9IHRhcmdldE5hbWUgS2V5IG9mIHVuaWZvcm0gc3BlYyBiZWluZyBldmFsdWF0ZWQuXG4gKiBAcGFyYW0ge051bWJlcnxBcnJheX0gdmFsdWUgVmFsdWUgb2YgdW5pZm9ybSBzcGVjIGJlaW5nIGV2YWx1YXRlZC5cbiAqXG4gKiBAcmV0dXJuIHtCb29sZWFufSBib29sZWFuIEluZGljYXRpbmcgd2hldGhlciB0aGUgdW5pZm9ybSBiZWluZyBzZXQgaXMgY2FjaGVkLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS51bmlmb3JtSXNDYWNoZWQgPSBmdW5jdGlvbih0YXJnZXROYW1lLCB2YWx1ZSkge1xuICAgIGlmKHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV0gPT0gbnVsbCkge1xuICAgICAgICBpZiAodmFsdWUubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLmNhY2hlZFVuaWZvcm1zW3RhcmdldE5hbWVdID0gbmV3IEZsb2F0MzJBcnJheSh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmNhY2hlZFVuaWZvcm1zW3RhcmdldE5hbWVdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBlbHNlIGlmICh2YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGkgPSB2YWx1ZS5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIGlmKHZhbHVlW2ldICE9PSB0aGlzLmNhY2hlZFVuaWZvcm1zW3RhcmdldE5hbWVdW2ldKSB7XG4gICAgICAgICAgICAgICAgaSA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB3aGlsZShpLS0pIHRoaXMuY2FjaGVkVW5pZm9ybXNbdGFyZ2V0TmFtZV1baV0gPSB2YWx1ZVtpXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBlbHNlIGlmICh0aGlzLmNhY2hlZFVuaWZvcm1zW3RhcmdldE5hbWVdICE9PSB2YWx1ZSkge1xuICAgICAgICB0aGlzLmNhY2hlZFVuaWZvcm1zW3RhcmdldE5hbWVdID0gdmFsdWU7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogSGFuZGxlcyBhbGwgcGFzc2luZyBvZiB1bmlmb3JtcyB0byBXZWJHTCBkcmF3aW5nIGNvbnRleHQuICBUaGlzXG4gKiBmdW5jdGlvbiB3aWxsIGZpbmQgdGhlIHVuaWZvcm0gbG9jYXRpb24gYW5kIHRoZW4sIGJhc2VkIG9uXG4gKiBhIHR5cGUgaW5mZXJyZWQgZnJvbSB0aGUgamF2YXNjcmlwdCB2YWx1ZSBvZiB0aGUgdW5pZm9ybSwgaXQgd2lsbCBjYWxsXG4gKiB0aGUgYXBwcm9wcmlhdGUgZnVuY3Rpb24gdG8gcGFzcyB0aGUgdW5pZm9ybSB0byBXZWJHTC4gIEZpbmFsbHksXG4gKiBzZXRVbmlmb3JtcyB3aWxsIGl0ZXJhdGUgdGhyb3VnaCB0aGUgcGFzc2VkIGluIHNoYWRlckNodW5rcyAoaWYgYW55KVxuICogYW5kIHNldCB0aGUgYXBwcm9wcmlhdGUgdW5pZm9ybXMgdG8gc3BlY2lmeSB3aGljaCBjaHVua3MgdG8gdXNlLlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7QXJyYXl9IHVuaWZvcm1OYW1lcyBBcnJheSBjb250YWluaW5nIHRoZSBrZXlzIG9mIGFsbCB1bmlmb3JtcyB0byBiZSBzZXQuXG4gKiBAcGFyYW0ge0FycmF5fSB1bmlmb3JtVmFsdWUgQXJyYXkgY29udGFpbmluZyB0aGUgdmFsdWVzIG9mIGFsbCB1bmlmb3JtcyB0byBiZSBzZXQuXG4gKlxuICogQHJldHVybiB7UHJvZ3JhbX0gQ3VycmVudCBwcm9ncmFtLlxuICovXG5Qcm9ncmFtLnByb3RvdHlwZS5zZXRVbmlmb3JtcyA9IGZ1bmN0aW9uICh1bmlmb3JtTmFtZXMsIHVuaWZvcm1WYWx1ZSkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIGxvY2F0aW9uO1xuICAgIHZhciB2YWx1ZTtcbiAgICB2YXIgbmFtZTtcbiAgICB2YXIgbGVuO1xuICAgIHZhciBpO1xuXG4gICAgaWYgKCF0aGlzLnByb2dyYW0pIHJldHVybiB0aGlzO1xuXG4gICAgbGVuID0gdW5pZm9ybU5hbWVzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgbmFtZSA9IHVuaWZvcm1OYW1lc1tpXTtcbiAgICAgICAgdmFsdWUgPSB1bmlmb3JtVmFsdWVbaV07XG5cbiAgICAgICAgLy8gUmV0cmVpdmUgdGhlIGNhY2hlZCBsb2NhdGlvbiBvZiB0aGUgdW5pZm9ybSxcbiAgICAgICAgLy8gcmVxdWVzdGluZyBhIG5ldyBsb2NhdGlvbiBmcm9tIHRoZSBXZWJHTCBjb250ZXh0XG4gICAgICAgIC8vIGlmIGl0IGRvZXMgbm90IHlldCBleGlzdC5cblxuICAgICAgICBsb2NhdGlvbiA9IHRoaXMudW5pZm9ybUxvY2F0aW9uc1tuYW1lXTtcblxuICAgICAgICBpZiAobG9jYXRpb24gPT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICBpZiAobG9jYXRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgbG9jYXRpb24gPSBnbC5nZXRVbmlmb3JtTG9jYXRpb24odGhpcy5wcm9ncmFtLCBuYW1lKTtcbiAgICAgICAgICAgIHRoaXMudW5pZm9ybUxvY2F0aW9uc1tuYW1lXSA9IGxvY2F0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIHZhbHVlIGlzIGFscmVhZHkgc2V0IGZvciB0aGVcbiAgICAgICAgLy8gZ2l2ZW4gdW5pZm9ybS5cblxuICAgICAgICBpZiAodGhpcy51bmlmb3JtSXNDYWNoZWQobmFtZSwgdmFsdWUpKSBjb250aW51ZTtcblxuICAgICAgICAvLyBEZXRlcm1pbmUgdGhlIGNvcnJlY3QgZnVuY3Rpb24gYW5kIHBhc3MgdGhlIHVuaWZvcm1cbiAgICAgICAgLy8gdmFsdWUgdG8gV2ViR0wuXG5cbiAgICAgICAgaWYgKCF0aGlzLnVuaWZvcm1UeXBlc1tuYW1lXSkge1xuICAgICAgICAgICAgdGhpcy51bmlmb3JtVHlwZXNbbmFtZV0gPSB0aGlzLmdldFVuaWZvcm1UeXBlRnJvbVZhbHVlKHZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbGwgdW5pZm9ybSBzZXR0ZXIgZnVuY3Rpb24gb24gV2ViR0wgY29udGV4dCB3aXRoIGNvcnJlY3QgdmFsdWVcblxuICAgICAgICBzd2l0Y2ggKHRoaXMudW5pZm9ybVR5cGVzW25hbWVdKSB7XG4gICAgICAgICAgICBjYXNlICd1bmlmb3JtNGZ2JzogIGdsLnVuaWZvcm00ZnYobG9jYXRpb24sIHZhbHVlKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1bmlmb3JtM2Z2JzogIGdsLnVuaWZvcm0zZnYobG9jYXRpb24sIHZhbHVlKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1bmlmb3JtMmZ2JzogIGdsLnVuaWZvcm0yZnYobG9jYXRpb24sIHZhbHVlKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1bmlmb3JtMWZ2JzogIGdsLnVuaWZvcm0xZnYobG9jYXRpb24sIHZhbHVlKTsgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1bmlmb3JtMWYnIDogIGdsLnVuaWZvcm0xZihsb2NhdGlvbiwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm1NYXRyaXgzZnYnOiBnbC51bmlmb3JtTWF0cml4M2Z2KGxvY2F0aW9uLCBmYWxzZSwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VuaWZvcm1NYXRyaXg0ZnYnOiBnbC51bmlmb3JtTWF0cml4NGZ2KGxvY2F0aW9uLCBmYWxzZSwgdmFsdWUpOyBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBJbmZlcnMgdW5pZm9ybSBzZXR0ZXIgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIHRoZSBXZWJHTCBjb250ZXh0LCBiYXNlZFxuICogb24gYW4gaW5wdXQgdmFsdWUuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfEFycmF5fSB2YWx1ZSBWYWx1ZSBmcm9tIHdoaWNoIHVuaWZvcm0gdHlwZSBpcyBpbmZlcnJlZC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IE5hbWUgb2YgdW5pZm9ybSBmdW5jdGlvbiBmb3IgZ2l2ZW4gdmFsdWUuXG4gKi9cblByb2dyYW0ucHJvdG90eXBlLmdldFVuaWZvcm1UeXBlRnJvbVZhbHVlID0gZnVuY3Rpb24gZ2V0VW5pZm9ybVR5cGVGcm9tVmFsdWUodmFsdWUpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkgfHwgdmFsdWUgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkpIHtcbiAgICAgICAgc3dpdGNoICh2YWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhc2UgMTogIHJldHVybiAndW5pZm9ybTFmdic7XG4gICAgICAgICAgICBjYXNlIDI6ICByZXR1cm4gJ3VuaWZvcm0yZnYnO1xuICAgICAgICAgICAgY2FzZSAzOiAgcmV0dXJuICd1bmlmb3JtM2Z2JztcbiAgICAgICAgICAgIGNhc2UgNDogIHJldHVybiAndW5pZm9ybTRmdic7XG4gICAgICAgICAgICBjYXNlIDk6ICByZXR1cm4gJ3VuaWZvcm1NYXRyaXgzZnYnO1xuICAgICAgICAgICAgY2FzZSAxNjogcmV0dXJuICd1bmlmb3JtTWF0cml4NGZ2JztcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICghaXNOYU4ocGFyc2VGbG9hdCh2YWx1ZSkpICYmIGlzRmluaXRlKHZhbHVlKSkge1xuICAgICAgICByZXR1cm4gJ3VuaWZvcm0xZic7XG4gICAgfVxuXG4gICAgdGhyb3cgJ2NhbnQgbG9hZCB1bmlmb3JtIFwiJyArIG5hbWUgKyAnXCIgd2l0aCB2YWx1ZTonICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xufTtcblxuLyoqXG4gKiBBZGRzIHNoYWRlciBzb3VyY2UgdG8gc2hhZGVyIGFuZCBjb21waWxlcyB0aGUgaW5wdXQgc2hhZGVyLiAgQ2hlY2tzXG4gKiBjb21waWxlIHN0YXR1cyBhbmQgbG9ncyBlcnJvciBpZiBuZWNlc3NhcnkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzaGFkZXIgUHJvZ3JhbSB0byBiZSBjb21waWxlZC5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzb3VyY2UgU291cmNlIHRvIGJlIHVzZWQgaW4gdGhlIHNoYWRlci5cbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9IENvbXBpbGVkIHNoYWRlci5cbiAqL1xuUHJvZ3JhbS5wcm90b3R5cGUuY29tcGlsZVNoYWRlciA9IGZ1bmN0aW9uIGNvbXBpbGVTaGFkZXIoc2hhZGVyLCBzb3VyY2UpIHtcbiAgICB2YXIgaSA9IDE7XG5cbiAgICBpZiAodGhpcy5vcHRpb25zLmRlYnVnKSB7XG4gICAgICAgIHRoaXMuZ2wuY29tcGlsZVNoYWRlciA9IERlYnVnLmNhbGwodGhpcyk7XG4gICAgfVxuXG4gICAgdGhpcy5nbC5zaGFkZXJTb3VyY2Uoc2hhZGVyLCBzb3VyY2UpO1xuICAgIHRoaXMuZ2wuY29tcGlsZVNoYWRlcihzaGFkZXIpO1xuICAgIGlmICghdGhpcy5nbC5nZXRTaGFkZXJQYXJhbWV0ZXIoc2hhZGVyLCB0aGlzLmdsLkNPTVBJTEVfU1RBVFVTKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdjb21waWxlIGVycm9yOiAnICsgdGhpcy5nbC5nZXRTaGFkZXJJbmZvTG9nKHNoYWRlcikpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCcxOiAnICsgc291cmNlLnJlcGxhY2UoL1xcbi9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ1xcbicgKyAoaSs9MSkgKyAnOiAnO1xuICAgICAgICB9KSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHNoYWRlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJvZ3JhbTtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBUZXh0dXJlIGlzIGEgcHJpdmF0ZSBjbGFzcyB0aGF0IHN0b3JlcyBpbWFnZSBkYXRhXG4gKiB0byBiZSBhY2Nlc3NlZCBmcm9tIGEgc2hhZGVyIG9yIHVzZWQgYXMgYSByZW5kZXIgdGFyZ2V0LlxuICpcbiAqIEBjbGFzcyBUZXh0dXJlXG4gKiBAY29uc3RydWN0b3JcbiAqXG4gKiBAcGFyYW0ge0dMfSBnbCBHTFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgT3B0aW9uc1xuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIFRleHR1cmUoZ2wsIG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB0aGlzLmlkID0gZ2wuY3JlYXRlVGV4dHVyZSgpO1xuICAgIHRoaXMud2lkdGggPSBvcHRpb25zLndpZHRoIHx8IDA7XG4gICAgdGhpcy5oZWlnaHQgPSBvcHRpb25zLmhlaWdodCB8fCAwO1xuICAgIHRoaXMubWlwbWFwID0gb3B0aW9ucy5taXBtYXA7XG4gICAgdGhpcy5mb3JtYXQgPSBvcHRpb25zLmZvcm1hdCB8fCAnUkdCQSc7XG4gICAgdGhpcy50eXBlID0gb3B0aW9ucy50eXBlIHx8ICdVTlNJR05FRF9CWVRFJztcbiAgICB0aGlzLmdsID0gZ2w7XG5cbiAgICB0aGlzLmJpbmQoKTtcblxuICAgIGdsLnBpeGVsU3RvcmVpKGdsLlVOUEFDS19GTElQX1lfV0VCR0wsIG9wdGlvbnMuZmxpcFlXZWJnbCB8fCBmYWxzZSk7XG4gICAgZ2wucGl4ZWxTdG9yZWkoZ2wuVU5QQUNLX1BSRU1VTFRJUExZX0FMUEhBX1dFQkdMLCBvcHRpb25zLnByZW11bHRpcGx5QWxwaGFXZWJnbCB8fCBmYWxzZSk7XG5cbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfTUFHX0ZJTFRFUiwgZ2xbb3B0aW9ucy5tYWdGaWx0ZXJdIHx8IGdsLk5FQVJFU1QpO1xuICAgIGdsLnRleFBhcmFtZXRlcmkoZ2wuVEVYVFVSRV8yRCwgZ2wuVEVYVFVSRV9NSU5fRklMVEVSLCBnbFtvcHRpb25zLm1pbkZpbHRlcl0gfHwgZ2wuTkVBUkVTVCk7XG5cbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9TLCBnbFtvcHRpb25zLndyYXBTXSB8fCBnbC5DTEFNUF9UT19FREdFKTtcbiAgICBnbC50ZXhQYXJhbWV0ZXJpKGdsLlRFWFRVUkVfMkQsIGdsLlRFWFRVUkVfV1JBUF9ULCBnbFtvcHRpb25zLndyYXBUXSB8fCBnbC5DTEFNUF9UT19FREdFKTtcbn1cblxuLyoqXG4gKiBCaW5kcyB0aGlzIHRleHR1cmUgYXMgdGhlIHNlbGVjdGVkIHRhcmdldC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcmV0dXJuIHtPYmplY3R9IEN1cnJlbnQgdGV4dHVyZSBpbnN0YW5jZS5cbiAqL1xuVGV4dHVyZS5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uIGJpbmQoKSB7XG4gICAgdGhpcy5nbC5iaW5kVGV4dHVyZSh0aGlzLmdsLlRFWFRVUkVfMkQsIHRoaXMuaWQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFcmFzZXMgdGhlIHRleHR1cmUgZGF0YSBpbiB0aGUgZ2l2ZW4gdGV4dHVyZSBzbG90LlxuICpcbiAqIEBtZXRob2RcbiAqIEByZXR1cm4ge09iamVjdH0gQ3VycmVudCB0ZXh0dXJlIGluc3RhbmNlLlxuICovXG5UZXh0dXJlLnByb3RvdHlwZS51bmJpbmQgPSBmdW5jdGlvbiB1bmJpbmQoKSB7XG4gICAgdGhpcy5nbC5iaW5kVGV4dHVyZSh0aGlzLmdsLlRFWFRVUkVfMkQsIG51bGwpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlcyB0aGUgaW1hZ2UgZGF0YSBpbiB0aGUgdGV4dHVyZSB3aXRoIHRoZSBnaXZlbiBpbWFnZS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtJbWFnZX0gICBpbWcgICAgIFRoZSBpbWFnZSBvYmplY3QgdG8gdXBsb2FkIHBpeGVsIGRhdGEgZnJvbS5cbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICBDdXJyZW50IHRleHR1cmUgaW5zdGFuY2UuXG4gKi9cblRleHR1cmUucHJvdG90eXBlLnNldEltYWdlID0gZnVuY3Rpb24gc2V0SW1hZ2UoaW1nKSB7XG4gICAgdGhpcy5nbC50ZXhJbWFnZTJEKHRoaXMuZ2wuVEVYVFVSRV8yRCwgMCwgdGhpcy5nbFt0aGlzLmZvcm1hdF0sIHRoaXMuZ2xbdGhpcy5mb3JtYXRdLCB0aGlzLmdsW3RoaXMudHlwZV0sIGltZyk7XG4gICAgaWYgKHRoaXMubWlwbWFwKSB0aGlzLmdsLmdlbmVyYXRlTWlwbWFwKHRoaXMuZ2wuVEVYVFVSRV8yRCk7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlcGxhY2VzIHRoZSBpbWFnZSBkYXRhIGluIHRoZSB0ZXh0dXJlIHdpdGggYW4gYXJyYXkgb2YgYXJiaXRyYXJ5IGRhdGEuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9ICAgaW5wdXQgICBBcnJheSB0byBiZSBzZXQgYXMgZGF0YSB0byB0ZXh0dXJlLlxuICogQHJldHVybiB7T2JqZWN0fSAgICAgICAgIEN1cnJlbnQgdGV4dHVyZSBpbnN0YW5jZS5cbiAqL1xuVGV4dHVyZS5wcm90b3R5cGUuc2V0QXJyYXkgPSBmdW5jdGlvbiBzZXRBcnJheShpbnB1dCkge1xuICAgIHRoaXMuZ2wudGV4SW1hZ2UyRCh0aGlzLmdsLlRFWFRVUkVfMkQsIDAsIHRoaXMuZ2xbdGhpcy5mb3JtYXRdLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCwgMCwgdGhpcy5nbFt0aGlzLmZvcm1hdF0sIHRoaXMuZ2xbdGhpcy50eXBlXSwgaW5wdXQpO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBEdW1wcyB0aGUgcmdiLXBpeGVsIGNvbnRlbnRzIG9mIGEgdGV4dHVyZSBpbnRvIGFuIGFycmF5IGZvciBkZWJ1Z2dpbmcgcHVycG9zZXNcbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IHggICAgICAgIHgtb2Zmc2V0IGJldHdlZW4gdGV4dHVyZSBjb29yZGluYXRlcyBhbmQgc25hcHNob3RcbiAqIEBwYXJhbSB7TnVtYmVyfSB5ICAgICAgICB5LW9mZnNldCBiZXR3ZWVuIHRleHR1cmUgY29vcmRpbmF0ZXMgYW5kIHNuYXBzaG90XG4gKiBAcGFyYW0ge051bWJlcn0gd2lkdGggICAgeC1kZXB0aCBvZiB0aGUgc25hcHNob3RcbiAqIEBwYXJhbSB7TnVtYmVyfSBoZWlnaHQgICB5LWRlcHRoIG9mIHRoZSBzbmFwc2hvdFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSAgICAgICAgICBBbiBhcnJheSBvZiB0aGUgcGl4ZWxzIGNvbnRhaW5lZCBpbiB0aGUgc25hcHNob3QuXG4gKi9cblRleHR1cmUucHJvdG90eXBlLnJlYWRCYWNrID0gZnVuY3Rpb24gcmVhZEJhY2soeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIHBpeGVscztcbiAgICB4ID0geCB8fCAwO1xuICAgIHkgPSB5IHx8IDA7XG4gICAgd2lkdGggPSB3aWR0aCB8fCB0aGlzLndpZHRoO1xuICAgIGhlaWdodCA9IGhlaWdodCB8fCB0aGlzLmhlaWdodDtcbiAgICB2YXIgZmIgPSBnbC5jcmVhdGVGcmFtZWJ1ZmZlcigpO1xuICAgIGdsLmJpbmRGcmFtZWJ1ZmZlcihnbC5GUkFNRUJVRkZFUiwgZmIpO1xuICAgIGdsLmZyYW1lYnVmZmVyVGV4dHVyZTJEKGdsLkZSQU1FQlVGRkVSLCBnbC5DT0xPUl9BVFRBQ0hNRU5UMCwgZ2wuVEVYVFVSRV8yRCwgdGhpcy5pZCwgMCk7XG4gICAgaWYgKGdsLmNoZWNrRnJhbWVidWZmZXJTdGF0dXMoZ2wuRlJBTUVCVUZGRVIpID09PSBnbC5GUkFNRUJVRkZFUl9DT01QTEVURSkge1xuICAgICAgICBwaXhlbHMgPSBuZXcgVWludDhBcnJheSh3aWR0aCAqIGhlaWdodCAqIDQpO1xuICAgICAgICBnbC5yZWFkUGl4ZWxzKHgsIHksIHdpZHRoLCBoZWlnaHQsIGdsLlJHQkEsIGdsLlVOU0lHTkVEX0JZVEUsIHBpeGVscyk7XG4gICAgfVxuICAgIHJldHVybiBwaXhlbHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRleHR1cmU7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgVGV4dHVyZSA9IHJlcXVpcmUoJy4vVGV4dHVyZScpO1xudmFyIGNyZWF0ZUNoZWNrZXJib2FyZCA9IHJlcXVpcmUoJy4vY3JlYXRlQ2hlY2tlcmJvYXJkJyk7XG5cbi8qKlxuICogSGFuZGxlcyBsb2FkaW5nLCBiaW5kaW5nLCBhbmQgcmVzYW1wbGluZyBvZiB0ZXh0dXJlcyBmb3IgV2ViR0xSZW5kZXJlci5cbiAqXG4gKiBAY2xhc3MgVGV4dHVyZU1hbmFnZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7V2ViR0xfQ29udGV4dH0gZ2wgQ29udGV4dCB1c2VkIHRvIGNyZWF0ZSBhbmQgYmluZCB0ZXh0dXJlcy5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBUZXh0dXJlTWFuYWdlcihnbCkge1xuICAgIHRoaXMucmVnaXN0cnkgPSBbXTtcbiAgICB0aGlzLl9uZWVkc1Jlc2FtcGxlID0gW107XG5cbiAgICB0aGlzLl9hY3RpdmVUZXh0dXJlID0gMDtcbiAgICB0aGlzLl9ib3VuZFRleHR1cmUgPSBudWxsO1xuXG4gICAgdGhpcy5fY2hlY2tlcmJvYXJkID0gY3JlYXRlQ2hlY2tlcmJvYXJkKCk7XG5cbiAgICB0aGlzLmdsID0gZ2w7XG59XG5cbi8qKlxuICogVXBkYXRlIGZ1bmN0aW9uIHVzZWQgYnkgV2ViR0xSZW5kZXJlciB0byBxdWV1ZSByZXNhbXBsZXMgb25cbiAqIHJlZ2lzdGVyZWQgdGV4dHVyZXMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSAgICAgIHRpbWUgICAgVGltZSBpbiBtaWxsaXNlY29uZHMgYWNjb3JkaW5nIHRvIHRoZSBjb21wb3NpdG9yLlxuICogQHJldHVybiB7dW5kZWZpbmVkfSAgICAgICAgICB1bmRlZmluZWRcbiAqL1xuVGV4dHVyZU1hbmFnZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uIHVwZGF0ZSh0aW1lKSB7XG4gICAgdmFyIHJlZ2lzdHJ5TGVuZ3RoID0gdGhpcy5yZWdpc3RyeS5sZW5ndGg7XG5cbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IHJlZ2lzdHJ5TGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHRleHR1cmUgPSB0aGlzLnJlZ2lzdHJ5W2ldO1xuXG4gICAgICAgIGlmICh0ZXh0dXJlICYmIHRleHR1cmUuaXNMb2FkZWQgJiYgdGV4dHVyZS5yZXNhbXBsZVJhdGUpIHtcbiAgICAgICAgICAgIGlmICghdGV4dHVyZS5sYXN0UmVzYW1wbGUgfHwgdGltZSAtIHRleHR1cmUubGFzdFJlc2FtcGxlID4gdGV4dHVyZS5yZXNhbXBsZVJhdGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuX25lZWRzUmVzYW1wbGVbdGV4dHVyZS5pZF0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fbmVlZHNSZXNhbXBsZVt0ZXh0dXJlLmlkXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHRleHR1cmUubGFzdFJlc2FtcGxlID0gdGltZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYSBzcGVjIGFuZCBjcmVhdGVzIGEgdGV4dHVyZSBiYXNlZCBvbiBnaXZlbiB0ZXh0dXJlIGRhdGEuXG4gKiBIYW5kbGVzIGxvYWRpbmcgYXNzZXRzIGlmIG5lY2Vzc2FyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9ICBpbnB1dCAgIE9iamVjdCBjb250YWluaW5nIHRleHR1cmUgaWQsIHRleHR1cmUgZGF0YVxuICogICAgICAgICAgICAgICAgICAgICAgICAgIGFuZCBvcHRpb25zIHVzZWQgdG8gZHJhdyB0ZXh0dXJlLlxuICogQHBhcmFtIHtOdW1iZXJ9ICBzbG90ICAgIFRleHR1cmUgc2xvdCB0byBiaW5kIGdlbmVyYXRlZCB0ZXh0dXJlIHRvLlxuICogQHJldHVybiB7dW5kZWZpbmVkfSAgICAgIHVuZGVmaW5lZFxuICovXG5UZXh0dXJlTWFuYWdlci5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbiByZWdpc3RlcihpbnB1dCwgc2xvdCkge1xuICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICB2YXIgc291cmNlID0gaW5wdXQuZGF0YTtcbiAgICB2YXIgdGV4dHVyZUlkID0gaW5wdXQuaWQ7XG4gICAgdmFyIG9wdGlvbnMgPSBpbnB1dC5vcHRpb25zIHx8IHt9O1xuICAgIHZhciB0ZXh0dXJlID0gdGhpcy5yZWdpc3RyeVt0ZXh0dXJlSWRdO1xuICAgIHZhciBzcGVjO1xuXG4gICAgaWYgKCF0ZXh0dXJlKSB7XG5cbiAgICAgICAgdGV4dHVyZSA9IG5ldyBUZXh0dXJlKHRoaXMuZ2wsIG9wdGlvbnMpO1xuICAgICAgICB0ZXh0dXJlLnNldEltYWdlKHRoaXMuX2NoZWNrZXJib2FyZCk7XG5cbiAgICAgICAgLy8gQWRkIHRleHR1cmUgdG8gcmVnaXN0cnlcblxuICAgICAgICBzcGVjID0gdGhpcy5yZWdpc3RyeVt0ZXh0dXJlSWRdID0ge1xuICAgICAgICAgICAgcmVzYW1wbGVSYXRlOiBvcHRpb25zLnJlc2FtcGxlUmF0ZSB8fCBudWxsLFxuICAgICAgICAgICAgbGFzdFJlc2FtcGxlOiBudWxsLFxuICAgICAgICAgICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgICAgICAgICAgdGV4dHVyZTogdGV4dHVyZSxcbiAgICAgICAgICAgIHNvdXJjZTogc291cmNlLFxuICAgICAgICAgICAgaWQ6IHRleHR1cmVJZCxcbiAgICAgICAgICAgIHNsb3Q6IHNsb3RcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBIYW5kbGUgYXJyYXlcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpIHx8IHNvdXJjZSBpbnN0YW5jZW9mIFVpbnQ4QXJyYXkgfHwgc291cmNlIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5KSB7XG4gICAgICAgICAgICB0aGlzLmJpbmRUZXh0dXJlKHRleHR1cmVJZCk7XG4gICAgICAgICAgICB0ZXh0dXJlLnNldEFycmF5KHNvdXJjZSk7XG4gICAgICAgICAgICBzcGVjLmlzTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSB2aWRlb1xuXG4gICAgICAgIGVsc2UgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIEhUTUxWaWRlb0VsZW1lbnQpIHtcbiAgICAgICAgICAgIHNvdXJjZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkZWRkYXRhJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuYmluZFRleHR1cmUodGV4dHVyZUlkKTtcbiAgICAgICAgICAgICAgICB0ZXh0dXJlLnNldEltYWdlKHNvdXJjZSk7XG5cbiAgICAgICAgICAgICAgICBzcGVjLmlzTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzcGVjLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIGltYWdlIHVybFxuXG4gICAgICAgIGVsc2UgaWYgKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBsb2FkSW1hZ2Uoc291cmNlLCBmdW5jdGlvbiAoaW1nKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMuYmluZFRleHR1cmUodGV4dHVyZUlkKTtcbiAgICAgICAgICAgICAgICB0ZXh0dXJlLnNldEltYWdlKGltZyk7XG5cbiAgICAgICAgICAgICAgICBzcGVjLmlzTG9hZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBzcGVjLnNvdXJjZSA9IGltZztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRleHR1cmVJZDtcbn07XG5cbi8qKlxuICogTG9hZHMgYW4gaW1hZ2UgZnJvbSBhIHN0cmluZyBvciBJbWFnZSBvYmplY3QgYW5kIGV4ZWN1dGVzIGEgY2FsbGJhY2sgZnVuY3Rpb24uXG4gKlxuICogQG1ldGhvZFxuICogQHByaXZhdGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IGlucHV0IFRoZSBpbnB1dCBpbWFnZSBkYXRhIHRvIGxvYWQgYXMgYW4gYXNzZXQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgZmlyZWQgd2hlbiB0aGUgaW1hZ2UgaGFzIGZpbmlzaGVkIGxvYWRpbmcuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBJbWFnZSBvYmplY3QgYmVpbmcgbG9hZGVkLlxuICovXG5mdW5jdGlvbiBsb2FkSW1hZ2UgKGlucHV0LCBjYWxsYmFjaykge1xuICAgIHZhciBpbWFnZSA9ICh0eXBlb2YgaW5wdXQgPT09ICdzdHJpbmcnID8gbmV3IEltYWdlKCkgOiBpbnB1dCkgfHwge307XG4gICAgICAgIGltYWdlLmNyb3NzT3JpZ2luID0gJ2Fub255bW91cyc7XG5cbiAgICBpZiAoIWltYWdlLnNyYykgaW1hZ2Uuc3JjID0gaW5wdXQ7XG4gICAgaWYgKCFpbWFnZS5jb21wbGV0ZSkge1xuICAgICAgICBpbWFnZS5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhpbWFnZSk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhpbWFnZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGltYWdlO1xufVxuXG4vKipcbiAqIFNldHMgYWN0aXZlIHRleHR1cmUgc2xvdCBhbmQgYmluZHMgdGFyZ2V0IHRleHR1cmUuICBBbHNvIGhhbmRsZXNcbiAqIHJlc2FtcGxpbmcgd2hlbiBuZWNlc3NhcnkuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCBJZGVudGlmaWVyIHVzZWQgdG8gcmV0cmVpdmUgdGV4dHVyZSBzcGVjXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuVGV4dHVyZU1hbmFnZXIucHJvdG90eXBlLmJpbmRUZXh0dXJlID0gZnVuY3Rpb24gYmluZFRleHR1cmUoaWQpIHtcbiAgICB2YXIgc3BlYyA9IHRoaXMucmVnaXN0cnlbaWRdO1xuXG4gICAgaWYgKHRoaXMuX2FjdGl2ZVRleHR1cmUgIT09IHNwZWMuc2xvdCkge1xuICAgICAgICB0aGlzLmdsLmFjdGl2ZVRleHR1cmUodGhpcy5nbC5URVhUVVJFMCArIHNwZWMuc2xvdCk7XG4gICAgICAgIHRoaXMuX2FjdGl2ZVRleHR1cmUgPSBzcGVjLnNsb3Q7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2JvdW5kVGV4dHVyZSAhPT0gaWQpIHtcbiAgICAgICAgdGhpcy5fYm91bmRUZXh0dXJlID0gaWQ7XG4gICAgICAgIHNwZWMudGV4dHVyZS5iaW5kKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX25lZWRzUmVzYW1wbGVbc3BlYy5pZF0pIHtcblxuICAgICAgICAvLyBUT0RPOiBBY2NvdW50IGZvciByZXNhbXBsaW5nIG9mIGFycmF5cy5cblxuICAgICAgICBzcGVjLnRleHR1cmUuc2V0SW1hZ2Uoc3BlYy5zb3VyY2UpO1xuICAgICAgICB0aGlzLl9uZWVkc1Jlc2FtcGxlW3NwZWMuaWRdID0gZmFsc2U7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0dXJlTWFuYWdlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIFByb2dyYW0gPSByZXF1aXJlKCcuL1Byb2dyYW0nKTtcbnZhciBCdWZmZXJSZWdpc3RyeSA9IHJlcXVpcmUoJy4vQnVmZmVyUmVnaXN0cnknKTtcbnZhciBzb3J0ZXIgPSByZXF1aXJlKCcuL3JhZGl4U29ydCcpO1xudmFyIGtleVZhbHVlVG9BcnJheXMgPSByZXF1aXJlKCcuLi91dGlsaXRpZXMva2V5VmFsdWVUb0FycmF5cycpO1xudmFyIFRleHR1cmVNYW5hZ2VyID0gcmVxdWlyZSgnLi9UZXh0dXJlTWFuYWdlcicpO1xudmFyIGNvbXBpbGVNYXRlcmlhbCA9IHJlcXVpcmUoJy4vY29tcGlsZU1hdGVyaWFsJyk7XG5cbnZhciBpZGVudGl0eSA9IFsxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxLCAwLCAwLCAwLCAwLCAxXTtcblxudmFyIGdsb2JhbFVuaWZvcm1zID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgJ3VfbnVtTGlnaHRzJzogMCxcbiAgICAndV9hbWJpZW50TGlnaHQnOiBuZXcgQXJyYXkoMyksXG4gICAgJ3VfbGlnaHRQb3NpdGlvbic6IG5ldyBBcnJheSgzKSxcbiAgICAndV9saWdodENvbG9yJzogbmV3IEFycmF5KDMpLFxuICAgICd1X3BlcnNwZWN0aXZlJzogbmV3IEFycmF5KDE2KSxcbiAgICAndV90aW1lJzogMCxcbiAgICAndV92aWV3JzogbmV3IEFycmF5KDE2KVxufSk7XG5cbi8qKlxuICogV2ViR0xSZW5kZXJlciBpcyBhIHByaXZhdGUgY2xhc3MgdGhhdCBtYW5hZ2VzIGFsbCBpbnRlcmFjdGlvbnMgd2l0aCB0aGUgV2ViR0xcbiAqIEFQSS4gRWFjaCBmcmFtZSBpdCByZWNlaXZlcyBjb21tYW5kcyBmcm9tIHRoZSBjb21wb3NpdG9yIGFuZCB1cGRhdGVzIGl0c1xuICogcmVnaXN0cmllcyBhY2NvcmRpbmdseS4gU3Vic2VxdWVudGx5LCB0aGUgZHJhdyBmdW5jdGlvbiBpcyBjYWxsZWQgYW5kIHRoZVxuICogV2ViR0xSZW5kZXJlciBpc3N1ZXMgZHJhdyBjYWxscyBmb3IgYWxsIG1lc2hlcyBpbiBpdHMgcmVnaXN0cnkuXG4gKlxuICogQGNsYXNzIFdlYkdMUmVuZGVyZXJcbiAqIEBjb25zdHJ1Y3RvclxuICpcbiAqIEBwYXJhbSB7RWxlbWVudH0gY2FudmFzIFRoZSBET00gZWxlbWVudCB0aGF0IEdMIHdpbGwgcGFpbnQgaXRzZWxmIG9udG8uXG4gKiBAcGFyYW0ge0NvbXBvc2l0b3J9IGNvbXBvc2l0b3IgQ29tcG9zaXRvciB1c2VkIGZvciBxdWVyeWluZyB0aGUgdGltZSBmcm9tLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbmZ1bmN0aW9uIFdlYkdMUmVuZGVyZXIoY2FudmFzLCBjb21wb3NpdG9yKSB7XG4gICAgY2FudmFzLmNsYXNzTGlzdC5hZGQoJ2ZhbW91cy13ZWJnbC1yZW5kZXJlcicpO1xuXG4gICAgdGhpcy5jYW52YXMgPSBjYW52YXM7XG4gICAgdGhpcy5jb21wb3NpdG9yID0gY29tcG9zaXRvcjtcblxuICAgIHZhciBnbCA9IHRoaXMuZ2wgPSB0aGlzLmdldFdlYkdMQ29udGV4dCh0aGlzLmNhbnZhcyk7XG5cbiAgICBnbC5jbGVhckNvbG9yKDAuMCwgMC4wLCAwLjAsIDAuMCk7XG4gICAgZ2wucG9seWdvbk9mZnNldCgwLjEsIDAuMSk7XG4gICAgZ2wuZW5hYmxlKGdsLlBPTFlHT05fT0ZGU0VUX0ZJTEwpO1xuICAgIGdsLmVuYWJsZShnbC5ERVBUSF9URVNUKTtcbiAgICBnbC5lbmFibGUoZ2wuQkxFTkQpO1xuICAgIGdsLmRlcHRoRnVuYyhnbC5MRVFVQUwpO1xuICAgIGdsLmJsZW5kRnVuYyhnbC5TUkNfQUxQSEEsIGdsLk9ORV9NSU5VU19TUkNfQUxQSEEpO1xuICAgIGdsLmVuYWJsZShnbC5DVUxMX0ZBQ0UpO1xuICAgIGdsLmN1bGxGYWNlKGdsLkJBQ0spO1xuXG4gICAgdGhpcy5tZXNoUmVnaXN0cnkgPSB7fTtcbiAgICB0aGlzLm1lc2hSZWdpc3RyeUtleXMgPSBbXTtcblxuICAgIHRoaXMuY3V0b3V0UmVnaXN0cnkgPSB7fTtcblxuICAgIHRoaXMuY3V0b3V0UmVnaXN0cnlLZXlzID0gW107XG5cbiAgICAvKipcbiAgICAgKiBMaWdodHNcbiAgICAgKi9cbiAgICB0aGlzLm51bUxpZ2h0cyA9IDA7XG4gICAgdGhpcy5hbWJpZW50TGlnaHRDb2xvciA9IFswLCAwLCAwXTtcbiAgICB0aGlzLmxpZ2h0UmVnaXN0cnkgPSB7fTtcbiAgICB0aGlzLmxpZ2h0UmVnaXN0cnlLZXlzID0gW107XG4gICAgdGhpcy5saWdodFBvc2l0aW9ucyA9IFswLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwLCAwXTtcbiAgICB0aGlzLmxpZ2h0Q29sb3JzID0gWzAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDAsIDBdO1xuXG4gICAgdGhpcy50ZXh0dXJlTWFuYWdlciA9IG5ldyBUZXh0dXJlTWFuYWdlcihnbCk7XG4gICAgdGhpcy50ZXhDYWNoZSA9IHt9O1xuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkgPSBuZXcgQnVmZmVyUmVnaXN0cnkoZ2wpO1xuICAgIHRoaXMucHJvZ3JhbSA9IG5ldyBQcm9ncmFtKGdsLCB7IGRlYnVnOiB0cnVlIH0pO1xuXG4gICAgdGhpcy5zdGF0ZSA9IHtcbiAgICAgICAgYm91bmRBcnJheUJ1ZmZlcjogbnVsbCxcbiAgICAgICAgYm91bmRFbGVtZW50QnVmZmVyOiBudWxsLFxuICAgICAgICBsYXN0RHJhd246IG51bGwsXG4gICAgICAgIGVuYWJsZWRBdHRyaWJ1dGVzOiB7fSxcbiAgICAgICAgZW5hYmxlZEF0dHJpYnV0ZXNLZXlzOiBbXVxuICAgIH07XG5cbiAgICB0aGlzLnJlc29sdXRpb25OYW1lID0gWyd1X3Jlc29sdXRpb24nXTtcbiAgICB0aGlzLnJlc29sdXRpb25WYWx1ZXMgPSBbWzAsIDAsIDBdXTtcblxuICAgIHRoaXMuY2FjaGVkU2l6ZSA9IFtdO1xuXG4gICAgLypcbiAgICBUaGUgcHJvamVjdGlvblRyYW5zZm9ybSBoYXMgc29tZSBjb25zdGFudCBjb21wb25lbnRzLCBpLmUuIHRoZSB6IHNjYWxlLCBhbmQgdGhlIHggYW5kIHkgdHJhbnNsYXRpb24uXG5cbiAgICBUaGUgeiBzY2FsZSBrZWVwcyB0aGUgZmluYWwgeiBwb3NpdGlvbiBvZiBhbnkgdmVydGV4IHdpdGhpbiB0aGUgY2xpcCdzIGRvbWFpbiBieSBzY2FsaW5nIGl0IGJ5IGFuXG4gICAgYXJiaXRyYXJpbHkgc21hbGwgY29lZmZpY2llbnQuIFRoaXMgaGFzIHRoZSBhZHZhbnRhZ2Ugb2YgYmVpbmcgYSB1c2VmdWwgZGVmYXVsdCBpbiB0aGUgZXZlbnQgb2YgdGhlXG4gICAgdXNlciBmb3Jnb2luZyBhIG5lYXIgYW5kIGZhciBwbGFuZSwgYW4gYWxpZW4gY29udmVudGlvbiBpbiBkb20gc3BhY2UgYXMgaW4gRE9NIG92ZXJsYXBwaW5nIGlzXG4gICAgY29uZHVjdGVkIHZpYSBwYWludGVyJ3MgYWxnb3JpdGhtLlxuXG4gICAgVGhlIHggYW5kIHkgdHJhbnNsYXRpb24gdHJhbnNmb3JtcyB0aGUgd29ybGQgc3BhY2Ugb3JpZ2luIHRvIHRoZSB0b3AgbGVmdCBjb3JuZXIgb2YgdGhlIHNjcmVlbi5cblxuICAgIFRoZSBmaW5hbCBjb21wb25lbnQgKHRoaXMucHJvamVjdGlvblRyYW5zZm9ybVsxNV0pIGlzIGluaXRpYWxpemVkIGFzIDEgYmVjYXVzZSBjZXJ0YWluIHByb2plY3Rpb24gbW9kZWxzLFxuICAgIGUuZy4gdGhlIFdDMyBzcGVjaWZpZWQgbW9kZWwsIGtlZXAgdGhlIFhZIHBsYW5lIGFzIHRoZSBwcm9qZWN0aW9uIGh5cGVycGxhbmUuXG4gICAgKi9cbiAgICB0aGlzLnByb2plY3Rpb25UcmFuc2Zvcm0gPSBbMSwgMCwgMCwgMCwgMCwgMSwgMCwgMCwgMCwgMCwgLTAuMDAwMDAxLCAwLCAtMSwgMSwgMCwgMV07XG5cbiAgICAvLyBUT0RPOiByZW1vdmUgdGhpcyBoYWNrXG5cbiAgICB2YXIgY3V0b3V0ID0gdGhpcy5jdXRvdXRHZW9tZXRyeSA9IHtcbiAgICAgICAgc3BlYzoge1xuICAgICAgICAgICAgaWQ6IC0xLFxuICAgICAgICAgICAgYnVmZmVyVmFsdWVzOiBbWy0xLCAtMSwgMCwgMSwgLTEsIDAsIC0xLCAxLCAwLCAxLCAxLCAwXV0sXG4gICAgICAgICAgICBidWZmZXJOYW1lczogWydhX3BvcyddLFxuICAgICAgICAgICAgdHlwZTogJ1RSSUFOR0xFX1NUUklQJ1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkuYWxsb2NhdGUoXG4gICAgICAgIHRoaXMuY3V0b3V0R2VvbWV0cnkuc3BlYy5pZCxcbiAgICAgICAgY3V0b3V0LnNwZWMuYnVmZmVyTmFtZXNbMF0sXG4gICAgICAgIGN1dG91dC5zcGVjLmJ1ZmZlclZhbHVlc1swXSxcbiAgICAgICAgM1xuICAgICk7XG59XG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gcmV0cmVpdmUgdGhlIFdlYkdMUmVuZGVyZXIgY29udGV4dCB1c2luZyBzZXZlcmFsXG4gKiBhY2Nlc3NvcnMuIEZvciBicm93c2VyIGNvbXBhdGFiaWxpdHkuIFRocm93cyBvbiBlcnJvci5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGNhbnZhcyBDYW52YXMgZWxlbWVudCBmcm9tIHdoaWNoIHRoZSBjb250ZXh0IGlzIHJldHJlaXZlZFxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gV2ViR0xDb250ZXh0IFdlYkdMIGNvbnRleHRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuZ2V0V2ViR0xDb250ZXh0ID0gZnVuY3Rpb24gZ2V0V2ViR0xDb250ZXh0KGNhbnZhcykge1xuICAgIHZhciBuYW1lcyA9IFsnd2ViZ2wnLCAnZXhwZXJpbWVudGFsLXdlYmdsJywgJ3dlYmtpdC0zZCcsICdtb3otd2ViZ2wnXTtcbiAgICB2YXIgY29udGV4dDtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBuYW1lcy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KG5hbWVzW2ldKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNyZWF0aW5nIFdlYkdMIGNvbnRleHQ6ICcgKyBlcnJvci50b1N0cmluZygpKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGV4dCkgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgaWYgKCFjb250ZXh0KSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0NvdWxkIG5vdCByZXRyaWV2ZSBXZWJHTCBjb250ZXh0LiBQbGVhc2UgcmVmZXIgdG8gaHR0cHM6Ly93d3cua2hyb25vcy5vcmcvd2ViZ2wvIGZvciByZXF1aXJlbWVudHMnKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8qKlxuICogQWRkcyBhIG5ldyBiYXNlIHNwZWMgdG8gdGhlIGxpZ2h0IHJlZ2lzdHJ5IGF0IGEgZ2l2ZW4gcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG5ldyBsaWdodCBpbiBsaWdodFJlZ2lzdHJ5XG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBOZXdseSBjcmVhdGVkIGxpZ2h0IHNwZWNcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlTGlnaHQgPSBmdW5jdGlvbiBjcmVhdGVMaWdodChwYXRoKSB7XG4gICAgdGhpcy5udW1MaWdodHMrKztcbiAgICB0aGlzLmxpZ2h0UmVnaXN0cnlLZXlzLnB1c2gocGF0aCk7XG4gICAgdGhpcy5saWdodFJlZ2lzdHJ5W3BhdGhdID0ge1xuICAgICAgICBjb2xvcjogWzAsIDAsIDBdLFxuICAgICAgICBwb3NpdGlvbjogWzAsIDAsIDBdXG4gICAgfTtcbiAgICByZXR1cm4gdGhpcy5saWdodFJlZ2lzdHJ5W3BhdGhdO1xufTtcblxuLyoqXG4gKiBBZGRzIGEgbmV3IGJhc2Ugc3BlYyB0byB0aGUgbWVzaCByZWdpc3RyeSBhdCBhIGdpdmVuIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBuZXcgbWVzaCBpbiBtZXNoUmVnaXN0cnkuXG4gKlxuICogQHJldHVybiB7T2JqZWN0fSBOZXdseSBjcmVhdGVkIG1lc2ggc3BlYy5cbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuY3JlYXRlTWVzaCA9IGZ1bmN0aW9uIGNyZWF0ZU1lc2gocGF0aCkge1xuICAgIHRoaXMubWVzaFJlZ2lzdHJ5S2V5cy5wdXNoKHBhdGgpO1xuXG4gICAgdmFyIHVuaWZvcm1zID0ga2V5VmFsdWVUb0FycmF5cyh7XG4gICAgICAgIHVfb3BhY2l0eTogMSxcbiAgICAgICAgdV90cmFuc2Zvcm06IGlkZW50aXR5LFxuICAgICAgICB1X3NpemU6IFswLCAwLCAwXSxcbiAgICAgICAgdV9iYXNlQ29sb3I6IFswLjUsIDAuNSwgMC41LCAxXSxcbiAgICAgICAgdV9wb3NpdGlvbk9mZnNldDogWzAsIDAsIDBdLFxuICAgICAgICB1X25vcm1hbHM6IFswLCAwLCAwXSxcbiAgICAgICAgdV9mbGF0U2hhZGluZzogMCxcbiAgICAgICAgdV9nbG9zc2luZXNzOiBbMCwgMCwgMCwgMF1cbiAgICB9KTtcbiAgICB0aGlzLm1lc2hSZWdpc3RyeVtwYXRoXSA9IHtcbiAgICAgICAgZGVwdGg6IG51bGwsXG4gICAgICAgIHVuaWZvcm1LZXlzOiB1bmlmb3Jtcy5rZXlzLFxuICAgICAgICB1bmlmb3JtVmFsdWVzOiB1bmlmb3Jtcy52YWx1ZXMsXG4gICAgICAgIGJ1ZmZlcnM6IHt9LFxuICAgICAgICBnZW9tZXRyeTogbnVsbCxcbiAgICAgICAgZHJhd1R5cGU6IG51bGwsXG4gICAgICAgIHRleHR1cmVzOiBbXSxcbiAgICAgICAgdmlzaWJsZTogdHJ1ZVxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdO1xufTtcblxuLyoqXG4gKiBTZXRzIGZsYWcgb24gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGRvIHNraXAgZHJhdyBwaGFzZSBmb3JcbiAqIGN1dG91dCBtZXNoIGF0IGdpdmVuIHBhdGguXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiB0YXJnZXQgY3V0b3V0IG1lc2guXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHVzZXNDdXRvdXQgSW5kaWNhdGVzIHRoZSBwcmVzZW5jZSBvZiBhIGN1dG91dCBtZXNoXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0Q3V0b3V0U3RhdGUgPSBmdW5jdGlvbiBzZXRDdXRvdXRTdGF0ZShwYXRoLCB1c2VzQ3V0b3V0KSB7XG4gICAgdmFyIGN1dG91dCA9IHRoaXMuZ2V0T3JTZXRDdXRvdXQocGF0aCk7XG5cbiAgICBjdXRvdXQudmlzaWJsZSA9IHVzZXNDdXRvdXQ7XG59O1xuXG4vKipcbiAqIENyZWF0ZXMgb3IgcmV0cmVpdmVzIGN1dG91dFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IGN1dG91dCBtZXNoLlxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gTmV3bHkgY3JlYXRlZCBjdXRvdXQgc3BlYy5cbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuZ2V0T3JTZXRDdXRvdXQgPSBmdW5jdGlvbiBnZXRPclNldEN1dG91dChwYXRoKSB7XG4gICAgaWYgKHRoaXMuY3V0b3V0UmVnaXN0cnlbcGF0aF0pIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY3V0b3V0UmVnaXN0cnlbcGF0aF07XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICB2YXIgdW5pZm9ybXMgPSBrZXlWYWx1ZVRvQXJyYXlzKHtcbiAgICAgICAgICAgIHVfb3BhY2l0eTogMCxcbiAgICAgICAgICAgIHVfdHJhbnNmb3JtOiBpZGVudGl0eS5zbGljZSgpLFxuICAgICAgICAgICAgdV9zaXplOiBbMCwgMCwgMF0sXG4gICAgICAgICAgICB1X29yaWdpbjogWzAsIDAsIDBdLFxuICAgICAgICAgICAgdV9iYXNlQ29sb3I6IFswLCAwLCAwLCAxXVxuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmN1dG91dFJlZ2lzdHJ5S2V5cy5wdXNoKHBhdGgpO1xuXG4gICAgICAgIHRoaXMuY3V0b3V0UmVnaXN0cnlbcGF0aF0gPSB7XG4gICAgICAgICAgICB1bmlmb3JtS2V5czogdW5pZm9ybXMua2V5cyxcbiAgICAgICAgICAgIHVuaWZvcm1WYWx1ZXM6IHVuaWZvcm1zLnZhbHVlcyxcbiAgICAgICAgICAgIGdlb21ldHJ5OiB0aGlzLmN1dG91dEdlb21ldHJ5LnNwZWMuaWQsXG4gICAgICAgICAgICBkcmF3VHlwZTogdGhpcy5jdXRvdXRHZW9tZXRyeS5zcGVjLnR5cGUsXG4gICAgICAgICAgICB2aXNpYmxlOiB0cnVlXG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuY3V0b3V0UmVnaXN0cnlbcGF0aF07XG4gICAgfVxufTtcblxuLyoqXG4gKiBTZXRzIGZsYWcgb24gaW5kaWNhdGluZyB3aGV0aGVyIHRvIGRvIHNraXAgZHJhdyBwaGFzZSBmb3JcbiAqIG1lc2ggYXQgZ2l2ZW4gcGF0aC5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IG1lc2guXG4gKiBAcGFyYW0ge0Jvb2xlYW59IHZpc2liaWxpdHkgSW5kaWNhdGVzIHRoZSB2aXNpYmlsaXR5IG9mIHRhcmdldCBtZXNoLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldE1lc2hWaXNpYmlsaXR5ID0gZnVuY3Rpb24gc2V0TWVzaFZpc2liaWxpdHkocGF0aCwgdmlzaWJpbGl0eSkge1xuICAgIHZhciBtZXNoID0gdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVNZXNoKHBhdGgpO1xuXG4gICAgbWVzaC52aXNpYmxlID0gdmlzaWJpbGl0eTtcbn07XG5cbi8qKlxuICogRGVsZXRlcyBhIG1lc2ggZnJvbSB0aGUgbWVzaFJlZ2lzdHJ5LlxuICpcbiAqIEBtZXRob2RcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiB0YXJnZXQgbWVzaC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5yZW1vdmVNZXNoID0gZnVuY3Rpb24gcmVtb3ZlTWVzaChwYXRoKSB7XG4gICAgdmFyIGtleUxvY2F0aW9uID0gdGhpcy5tZXNoUmVnaXN0cnlLZXlzLmluZGV4T2YocGF0aCk7XG4gICAgdGhpcy5tZXNoUmVnaXN0cnlLZXlzLnNwbGljZShrZXlMb2NhdGlvbiwgMSk7XG4gICAgdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF0gPSBudWxsO1xufTtcblxuLyoqXG4gKiBDcmVhdGVzIG9yIHJldHJlaXZlcyBjdXRvdXRcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgY3V0b3V0IGluIGN1dG91dCByZWdpc3RyeS5cbiAqIEBwYXJhbSB7U3RyaW5nfSB1bmlmb3JtTmFtZSBJZGVudGlmaWVyIHVzZWQgdG8gdXBsb2FkIHZhbHVlXG4gKiBAcGFyYW0ge0FycmF5fSB1bmlmb3JtVmFsdWUgVmFsdWUgb2YgdW5pZm9ybSBkYXRhXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0Q3V0b3V0VW5pZm9ybSA9IGZ1bmN0aW9uIHNldEN1dG91dFVuaWZvcm0ocGF0aCwgdW5pZm9ybU5hbWUsIHVuaWZvcm1WYWx1ZSkge1xuICAgIHZhciBjdXRvdXQgPSB0aGlzLmdldE9yU2V0Q3V0b3V0KHBhdGgpO1xuXG4gICAgdmFyIGluZGV4ID0gY3V0b3V0LnVuaWZvcm1LZXlzLmluZGV4T2YodW5pZm9ybU5hbWUpO1xuXG4gICAgaWYgKHVuaWZvcm1WYWx1ZS5sZW5ndGgpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHVuaWZvcm1WYWx1ZS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgY3V0b3V0LnVuaWZvcm1WYWx1ZXNbaW5kZXhdW2ldID0gdW5pZm9ybVZhbHVlW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjdXRvdXQudW5pZm9ybVZhbHVlc1tpbmRleF0gPSB1bmlmb3JtVmFsdWU7XG4gICAgfVxufTtcblxuLyoqXG4gKiBFZGl0cyB0aGUgb3B0aW9ucyBmaWVsZCBvbiBhIG1lc2hcbiAqXG4gKiBAbWV0aG9kXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgdGFyZ2V0IG1lc2hcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIE1hcCBvZiBkcmF3IG9wdGlvbnMgZm9yIG1lc2hcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoT3B0aW9ucyA9IGZ1bmN0aW9uKHBhdGgsIG9wdGlvbnMpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2gub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENoYW5nZXMgdGhlIGNvbG9yIG9mIHRoZSBmaXhlZCBpbnRlbnNpdHkgbGlnaHRpbmcgaW4gdGhlIHNjZW5lXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBsaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IHIgcmVkIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBnIGdyZWVuIGNoYW5uZWxcbiAqIEBwYXJhbSB7TnVtYmVyfSBiIGJsdWUgY2hhbm5lbFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldEFtYmllbnRMaWdodENvbG9yID0gZnVuY3Rpb24gc2V0QW1iaWVudExpZ2h0Q29sb3IocGF0aCwgciwgZywgYikge1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMF0gPSByO1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMV0gPSBnO1xuICAgIHRoaXMuYW1iaWVudExpZ2h0Q29sb3JbMl0gPSBiO1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBsb2NhdGlvbiBvZiB0aGUgbGlnaHQgaW4gdGhlIHNjZW5lXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoIFBhdGggdXNlZCBhcyBpZCBvZiBsaWdodFxuICogQHBhcmFtIHtOdW1iZXJ9IHggeCBwb3NpdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IHkgeSBwb3NpdGlvblxuICogQHBhcmFtIHtOdW1iZXJ9IHogeiBwb3NpdGlvblxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4qKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnNldExpZ2h0UG9zaXRpb24gPSBmdW5jdGlvbiBzZXRMaWdodFBvc2l0aW9uKHBhdGgsIHgsIHksIHopIHtcbiAgICB2YXIgbGlnaHQgPSB0aGlzLmxpZ2h0UmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVMaWdodChwYXRoKTtcblxuICAgIGxpZ2h0LnBvc2l0aW9uWzBdID0geDtcbiAgICBsaWdodC5wb3NpdGlvblsxXSA9IHk7XG4gICAgbGlnaHQucG9zaXRpb25bMl0gPSB6O1xuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBjb2xvciBvZiBhIGR5bmFtaWMgaW50ZW5zaXR5IGxpZ2h0aW5nIGluIHRoZSBzY2VuZVxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgbGlnaHQgaW4gbGlnaHQgUmVnaXN0cnkuXG4gKiBAcGFyYW0ge051bWJlcn0gciByZWQgY2hhbm5lbFxuICogQHBhcmFtIHtOdW1iZXJ9IGcgZ3JlZW4gY2hhbm5lbFxuICogQHBhcmFtIHtOdW1iZXJ9IGIgYmx1ZSBjaGFubmVsXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0TGlnaHRDb2xvciA9IGZ1bmN0aW9uIHNldExpZ2h0Q29sb3IocGF0aCwgciwgZywgYikge1xuICAgIHZhciBsaWdodCA9IHRoaXMubGlnaHRSZWdpc3RyeVtwYXRoXSB8fCB0aGlzLmNyZWF0ZUxpZ2h0KHBhdGgpO1xuXG4gICAgbGlnaHQuY29sb3JbMF0gPSByO1xuICAgIGxpZ2h0LmNvbG9yWzFdID0gZztcbiAgICBsaWdodC5jb2xvclsyXSA9IGI7XG4gICAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIENvbXBpbGVzIG1hdGVyaWFsIHNwZWMgaW50byBwcm9ncmFtIHNoYWRlclxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgY3V0b3V0IGluIGN1dG91dCByZWdpc3RyeS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE5hbWUgdGhhdCB0aGUgcmVuZGVyaW5nIGlucHV0IHRoZSBtYXRlcmlhbCBpcyBib3VuZCB0b1xuICogQHBhcmFtIHtPYmplY3R9IG1hdGVyaWFsIE1hdGVyaWFsIHNwZWNcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5oYW5kbGVNYXRlcmlhbElucHV0ID0gZnVuY3Rpb24gaGFuZGxlTWF0ZXJpYWxJbnB1dChwYXRoLCBuYW1lLCBtYXRlcmlhbCkge1xuICAgIHZhciBtZXNoID0gdGhpcy5tZXNoUmVnaXN0cnlbcGF0aF0gfHwgdGhpcy5jcmVhdGVNZXNoKHBhdGgpO1xuICAgIG1hdGVyaWFsID0gY29tcGlsZU1hdGVyaWFsKG1hdGVyaWFsLCBtZXNoLnRleHR1cmVzLmxlbmd0aCk7XG5cbiAgICAvLyBTZXQgdW5pZm9ybXMgdG8gZW5hYmxlIHRleHR1cmUhXG5cbiAgICBtZXNoLnVuaWZvcm1WYWx1ZXNbbWVzaC51bmlmb3JtS2V5cy5pbmRleE9mKG5hbWUpXVswXSA9IC1tYXRlcmlhbC5faWQ7XG5cbiAgICAvLyBSZWdpc3RlciB0ZXh0dXJlcyFcblxuICAgIHZhciBpID0gbWF0ZXJpYWwudGV4dHVyZXMubGVuZ3RoO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgbWVzaC50ZXh0dXJlcy5wdXNoKFxuICAgICAgICAgICAgdGhpcy50ZXh0dXJlTWFuYWdlci5yZWdpc3RlcihtYXRlcmlhbC50ZXh0dXJlc1tpXSwgbWVzaC50ZXh0dXJlcy5sZW5ndGggKyBpKVxuICAgICAgICApO1xuICAgIH1cblxuICAgIC8vIFJlZ2lzdGVyIG1hdGVyaWFsIVxuXG4gICAgdGhpcy5wcm9ncmFtLnJlZ2lzdGVyTWF0ZXJpYWwobmFtZSwgbWF0ZXJpYWwpO1xuXG4gICAgcmV0dXJuIHRoaXMudXBkYXRlU2l6ZSgpO1xufTtcblxuLyoqXG4gKiBDaGFuZ2VzIHRoZSBnZW9tZXRyeSBkYXRhIG9mIGEgbWVzaFxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBQYXRoIHVzZWQgYXMgaWQgb2YgY3V0b3V0IGluIGN1dG91dCByZWdpc3RyeS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBnZW9tZXRyeSBHZW9tZXRyeSBvYmplY3QgY29udGFpbmluZyB2ZXJ0ZXggZGF0YSB0byBiZSBkcmF3blxuICogQHBhcmFtIHtOdW1iZXJ9IGRyYXdUeXBlIFByaW1pdGl2ZSBpZGVudGlmaWVyXG4gKiBAcGFyYW0ge0Jvb2xlYW59IGR5bmFtaWMgV2hldGhlciBnZW9tZXRyeSBpcyBkeW5hbWljXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbioqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuc2V0R2VvbWV0cnkgPSBmdW5jdGlvbiBzZXRHZW9tZXRyeShwYXRoLCBnZW9tZXRyeSwgZHJhd1R5cGUsIGR5bmFtaWMpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIG1lc2guZ2VvbWV0cnkgPSBnZW9tZXRyeTtcbiAgICBtZXNoLmRyYXdUeXBlID0gZHJhd1R5cGU7XG4gICAgbWVzaC5keW5hbWljID0gZHluYW1pYztcblxuICAgIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBVcGxvYWRzIGEgbmV3IHZhbHVlIGZvciB0aGUgdW5pZm9ybSBkYXRhIHdoZW4gdGhlIG1lc2ggaXMgYmVpbmcgZHJhd25cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG1lc2ggaW4gbWVzaCByZWdpc3RyeVxuICogQHBhcmFtIHtTdHJpbmd9IHVuaWZvcm1OYW1lIElkZW50aWZpZXIgdXNlZCB0byB1cGxvYWQgdmFsdWVcbiAqIEBwYXJhbSB7QXJyYXl9IHVuaWZvcm1WYWx1ZSBWYWx1ZSBvZiB1bmlmb3JtIGRhdGFcbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuKiovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRNZXNoVW5pZm9ybSA9IGZ1bmN0aW9uIHNldE1lc2hVbmlmb3JtKHBhdGgsIHVuaWZvcm1OYW1lLCB1bmlmb3JtVmFsdWUpIHtcbiAgICB2YXIgbWVzaCA9IHRoaXMubWVzaFJlZ2lzdHJ5W3BhdGhdIHx8IHRoaXMuY3JlYXRlTWVzaChwYXRoKTtcblxuICAgIHZhciBpbmRleCA9IG1lc2gudW5pZm9ybUtleXMuaW5kZXhPZih1bmlmb3JtTmFtZSk7XG5cbiAgICBpZiAoaW5kZXggPT09IC0xKSB7XG4gICAgICAgIG1lc2gudW5pZm9ybUtleXMucHVzaCh1bmlmb3JtTmFtZSk7XG4gICAgICAgIG1lc2gudW5pZm9ybVZhbHVlcy5wdXNoKHVuaWZvcm1WYWx1ZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBtZXNoLnVuaWZvcm1WYWx1ZXNbaW5kZXhdID0gdW5pZm9ybVZhbHVlO1xuICAgIH1cbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlICdkcmF3JyBwaGFzZSBvZiB0aGUgV2ViR0xSZW5kZXJlci4gSXRlcmF0ZXMgdGhyb3VnaCByZWdpc3RyaWVzXG4gKiB0byBzZXQgdW5pZm9ybXMsIHNldCBhdHRyaWJ1dGVzIGFuZCBpc3N1ZSBkcmF3IGNvbW1hbmRzIGZvciByZW5kZXJhYmxlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggUGF0aCB1c2VkIGFzIGlkIG9mIG1lc2ggaW4gbWVzaCByZWdpc3RyeVxuICogQHBhcmFtIHtOdW1iZXJ9IGdlb21ldHJ5SWQgSWQgb2YgZ2VvbWV0cnkgaW4gZ2VvbWV0cnkgcmVnaXN0cnlcbiAqIEBwYXJhbSB7U3RyaW5nfSBidWZmZXJOYW1lIEF0dHJpYnV0ZSBsb2NhdGlvbiBuYW1lXG4gKiBAcGFyYW0ge0FycmF5fSBidWZmZXJWYWx1ZSBWZXJ0ZXggZGF0YVxuICogQHBhcmFtIHtOdW1iZXJ9IGJ1ZmZlclNwYWNpbmcgVGhlIGRpbWVuc2lvbnMgb2YgdGhlIHZlcnRleFxuICogQHBhcmFtIHtCb29sZWFufSBpc0R5bmFtaWMgV2hldGhlciBnZW9tZXRyeSBpcyBkeW5hbWljXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuYnVmZmVyRGF0YSA9IGZ1bmN0aW9uIGJ1ZmZlckRhdGEocGF0aCwgZ2VvbWV0cnlJZCwgYnVmZmVyTmFtZSwgYnVmZmVyVmFsdWUsIGJ1ZmZlclNwYWNpbmcsIGlzRHluYW1pYykge1xuICAgIHRoaXMuYnVmZmVyUmVnaXN0cnkuYWxsb2NhdGUoZ2VvbWV0cnlJZCwgYnVmZmVyTmFtZSwgYnVmZmVyVmFsdWUsIGJ1ZmZlclNwYWNpbmcsIGlzRHluYW1pYyk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVHJpZ2dlcnMgdGhlICdkcmF3JyBwaGFzZSBvZiB0aGUgV2ViR0xSZW5kZXJlci4gSXRlcmF0ZXMgdGhyb3VnaCByZWdpc3RyaWVzXG4gKiB0byBzZXQgdW5pZm9ybXMsIHNldCBhdHRyaWJ1dGVzIGFuZCBpc3N1ZSBkcmF3IGNvbW1hbmRzIGZvciByZW5kZXJhYmxlcy5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHJlbmRlclN0YXRlIFBhcmFtZXRlcnMgcHJvdmlkZWQgYnkgdGhlIGNvbXBvc2l0b3IsIHRoYXQgYWZmZWN0IHRoZSByZW5kZXJpbmcgb2YgYWxsIHJlbmRlcmFibGVzLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXcgPSBmdW5jdGlvbiBkcmF3KHJlbmRlclN0YXRlKSB7XG4gICAgdmFyIHRpbWUgPSB0aGlzLmNvbXBvc2l0b3IuZ2V0VGltZSgpO1xuXG4gICAgdGhpcy5nbC5jbGVhcih0aGlzLmdsLkNPTE9SX0JVRkZFUl9CSVQgfCB0aGlzLmdsLkRFUFRIX0JVRkZFUl9CSVQpO1xuICAgIHRoaXMudGV4dHVyZU1hbmFnZXIudXBkYXRlKHRpbWUpO1xuXG4gICAgdGhpcy5tZXNoUmVnaXN0cnlLZXlzID0gc29ydGVyKHRoaXMubWVzaFJlZ2lzdHJ5S2V5cywgdGhpcy5tZXNoUmVnaXN0cnkpO1xuXG4gICAgdGhpcy5zZXRHbG9iYWxVbmlmb3JtcyhyZW5kZXJTdGF0ZSk7XG4gICAgdGhpcy5kcmF3Q3V0b3V0cygpO1xuICAgIHRoaXMuZHJhd01lc2hlcygpO1xufTtcblxuLyoqXG4gKiBJdGVyYXRlcyB0aHJvdWdoIGFuZCBkcmF3cyBhbGwgcmVnaXN0ZXJlZCBtZXNoZXMuIFRoaXMgaW5jbHVkZXNcbiAqIGJpbmRpbmcgdGV4dHVyZXMsIGhhbmRsaW5nIGRyYXcgb3B0aW9ucywgc2V0dGluZyBtZXNoIHVuaWZvcm1zXG4gKiBhbmQgZHJhd2luZyBtZXNoIGJ1ZmZlcnMuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXdNZXNoZXMgPSBmdW5jdGlvbiBkcmF3TWVzaGVzKCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgdmFyIGJ1ZmZlcnM7XG4gICAgdmFyIG1lc2g7XG5cbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgdGhpcy5tZXNoUmVnaXN0cnlLZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIG1lc2ggPSB0aGlzLm1lc2hSZWdpc3RyeVt0aGlzLm1lc2hSZWdpc3RyeUtleXNbaV1dO1xuICAgICAgICBidWZmZXJzID0gdGhpcy5idWZmZXJSZWdpc3RyeS5yZWdpc3RyeVttZXNoLmdlb21ldHJ5XTtcblxuICAgICAgICBpZiAoIW1lc2gudmlzaWJsZSkgY29udGludWU7XG5cbiAgICAgICAgaWYgKG1lc2gudW5pZm9ybVZhbHVlc1swXSA8IDEpIHtcbiAgICAgICAgICAgIGdsLmRlcHRoTWFzayhmYWxzZSk7XG4gICAgICAgICAgICBnbC5lbmFibGUoZ2wuQkxFTkQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZ2wuZGVwdGhNYXNrKHRydWUpO1xuICAgICAgICAgICAgZ2wuZGlzYWJsZShnbC5CTEVORCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWJ1ZmZlcnMpIGNvbnRpbnVlO1xuXG4gICAgICAgIHZhciBqID0gbWVzaC50ZXh0dXJlcy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChqLS0pIHRoaXMudGV4dHVyZU1hbmFnZXIuYmluZFRleHR1cmUobWVzaC50ZXh0dXJlc1tqXSk7XG5cbiAgICAgICAgaWYgKG1lc2gub3B0aW9ucykgdGhpcy5oYW5kbGVPcHRpb25zKG1lc2gub3B0aW9ucywgbWVzaCk7XG5cbiAgICAgICAgdGhpcy5wcm9ncmFtLnNldFVuaWZvcm1zKG1lc2gudW5pZm9ybUtleXMsIG1lc2gudW5pZm9ybVZhbHVlcyk7XG4gICAgICAgIHRoaXMuZHJhd0J1ZmZlcnMoYnVmZmVycywgbWVzaC5kcmF3VHlwZSwgbWVzaC5nZW9tZXRyeSk7XG5cbiAgICAgICAgaWYgKG1lc2gub3B0aW9ucykgdGhpcy5yZXNldE9wdGlvbnMobWVzaC5vcHRpb25zKTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEl0ZXJhdGVzIHRocm91Z2ggYW5kIGRyYXdzIGFsbCByZWdpc3RlcmVkIGN1dG91dCBtZXNoZXMuIEJsZW5kaW5nXG4gKiBpcyBkaXNhYmxlZCwgY3V0b3V0IHVuaWZvcm1zIGFyZSBzZXQgYW5kIGZpbmFsbHkgYnVmZmVycyBhcmUgZHJhd24uXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXdDdXRvdXRzID0gZnVuY3Rpb24gZHJhd0N1dG91dHMoKSB7XG4gICAgdmFyIGN1dG91dDtcbiAgICB2YXIgYnVmZmVycztcbiAgICB2YXIgbGVuID0gdGhpcy5jdXRvdXRSZWdpc3RyeUtleXMubGVuZ3RoO1xuXG4gICAgaWYgKCFsZW4pIHJldHVybjtcblxuICAgIHRoaXMuZ2wuZGlzYWJsZSh0aGlzLmdsLkNVTExfRkFDRSk7XG4gICAgdGhpcy5nbC5lbmFibGUodGhpcy5nbC5CTEVORCk7XG4gICAgdGhpcy5nbC5kZXB0aE1hc2sodHJ1ZSk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIGN1dG91dCA9IHRoaXMuY3V0b3V0UmVnaXN0cnlbdGhpcy5jdXRvdXRSZWdpc3RyeUtleXNbaV1dO1xuICAgICAgICBidWZmZXJzID0gdGhpcy5idWZmZXJSZWdpc3RyeS5yZWdpc3RyeVtjdXRvdXQuZ2VvbWV0cnldO1xuXG4gICAgICAgIGlmICghY3V0b3V0LnZpc2libGUpIGNvbnRpbnVlO1xuXG4gICAgICAgIHRoaXMucHJvZ3JhbS5zZXRVbmlmb3JtcyhjdXRvdXQudW5pZm9ybUtleXMsIGN1dG91dC51bmlmb3JtVmFsdWVzKTtcbiAgICAgICAgdGhpcy5kcmF3QnVmZmVycyhidWZmZXJzLCBjdXRvdXQuZHJhd1R5cGUsIGN1dG91dC5nZW9tZXRyeSk7XG4gICAgfVxuXG4gICAgdGhpcy5nbC5lbmFibGUodGhpcy5nbC5DVUxMX0ZBQ0UpO1xufTtcblxuLyoqXG4gKiBTZXRzIHVuaWZvcm1zIHRvIGJlIHNoYXJlZCBieSBhbGwgbWVzaGVzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gcmVuZGVyU3RhdGUgRHJhdyBzdGF0ZSBvcHRpb25zIHBhc3NlZCBkb3duIGZyb20gY29tcG9zaXRvci5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5XZWJHTFJlbmRlcmVyLnByb3RvdHlwZS5zZXRHbG9iYWxVbmlmb3JtcyA9IGZ1bmN0aW9uIHNldEdsb2JhbFVuaWZvcm1zKHJlbmRlclN0YXRlKSB7XG4gICAgdmFyIGxpZ2h0O1xuICAgIHZhciBzdHJpZGU7XG5cbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5saWdodFJlZ2lzdHJ5S2V5cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICBsaWdodCA9IHRoaXMubGlnaHRSZWdpc3RyeVt0aGlzLmxpZ2h0UmVnaXN0cnlLZXlzW2ldXTtcbiAgICAgICAgc3RyaWRlID0gaSAqIDQ7XG5cbiAgICAgICAgLy8gQnVpbGQgdGhlIGxpZ2h0IHBvc2l0aW9ucycgNHg0IG1hdHJpeFxuXG4gICAgICAgIHRoaXMubGlnaHRQb3NpdGlvbnNbMCArIHN0cmlkZV0gPSBsaWdodC5wb3NpdGlvblswXTtcbiAgICAgICAgdGhpcy5saWdodFBvc2l0aW9uc1sxICsgc3RyaWRlXSA9IGxpZ2h0LnBvc2l0aW9uWzFdO1xuICAgICAgICB0aGlzLmxpZ2h0UG9zaXRpb25zWzIgKyBzdHJpZGVdID0gbGlnaHQucG9zaXRpb25bMl07XG5cbiAgICAgICAgLy8gQnVpbGQgdGhlIGxpZ2h0IGNvbG9ycycgNHg0IG1hdHJpeFxuXG4gICAgICAgIHRoaXMubGlnaHRDb2xvcnNbMCArIHN0cmlkZV0gPSBsaWdodC5jb2xvclswXTtcbiAgICAgICAgdGhpcy5saWdodENvbG9yc1sxICsgc3RyaWRlXSA9IGxpZ2h0LmNvbG9yWzFdO1xuICAgICAgICB0aGlzLmxpZ2h0Q29sb3JzWzIgKyBzdHJpZGVdID0gbGlnaHQuY29sb3JbMl07XG4gICAgfVxuXG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzBdID0gdGhpcy5udW1MaWdodHM7XG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzFdID0gdGhpcy5hbWJpZW50TGlnaHRDb2xvcjtcbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbMl0gPSB0aGlzLmxpZ2h0UG9zaXRpb25zO1xuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1szXSA9IHRoaXMubGlnaHRDb2xvcnM7XG5cbiAgICAvKlxuICAgICAqIFNldCB0aW1lIGFuZCBwcm9qZWN0aW9uIHVuaWZvcm1zXG4gICAgICogcHJvamVjdGluZyB3b3JsZCBzcGFjZSBpbnRvIGEgMmQgcGxhbmUgcmVwcmVzZW50YXRpb24gb2YgdGhlIGNhbnZhcy5cbiAgICAgKiBUaGUgeCBhbmQgeSBzY2FsZSAodGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzBdIGFuZCB0aGlzLnByb2plY3Rpb25UcmFuc2Zvcm1bNV0gcmVzcGVjdGl2ZWx5KVxuICAgICAqIGNvbnZlcnQgdGhlIHByb2plY3RlZCBnZW9tZXRyeSBiYWNrIGludG8gY2xpcHNwYWNlLlxuICAgICAqIFRoZSBwZXJwZWN0aXZlIGRpdmlkZSAodGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzExXSksIGFkZHMgdGhlIHogdmFsdWUgb2YgdGhlIHBvaW50XG4gICAgICogbXVsdGlwbGllZCBieSB0aGUgcGVyc3BlY3RpdmUgZGl2aWRlIHRvIHRoZSB3IHZhbHVlIG9mIHRoZSBwb2ludC4gSW4gdGhlIHByb2Nlc3NcbiAgICAgKiBvZiBjb252ZXJ0aW5nIGZyb20gaG9tb2dlbm91cyBjb29yZGluYXRlcyB0byBOREMgKG5vcm1hbGl6ZWQgZGV2aWNlIGNvb3JkaW5hdGVzKVxuICAgICAqIHRoZSB4IGFuZCB5IHZhbHVlcyBvZiB0aGUgcG9pbnQgYXJlIGRpdmlkZWQgYnkgdywgd2hpY2ggaW1wbGVtZW50cyBwZXJzcGVjdGl2ZS5cbiAgICAgKi9cbiAgICB0aGlzLnByb2plY3Rpb25UcmFuc2Zvcm1bMF0gPSAxIC8gKHRoaXMuY2FjaGVkU2l6ZVswXSAqIDAuNSk7XG4gICAgdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtWzVdID0gLTEgLyAodGhpcy5jYWNoZWRTaXplWzFdICogMC41KTtcbiAgICB0aGlzLnByb2plY3Rpb25UcmFuc2Zvcm1bMTFdID0gcmVuZGVyU3RhdGUucGVyc3BlY3RpdmVUcmFuc2Zvcm1bMTFdO1xuXG4gICAgZ2xvYmFsVW5pZm9ybXMudmFsdWVzWzRdID0gdGhpcy5wcm9qZWN0aW9uVHJhbnNmb3JtO1xuICAgIGdsb2JhbFVuaWZvcm1zLnZhbHVlc1s1XSA9IHRoaXMuY29tcG9zaXRvci5nZXRUaW1lKCkgKiAwLjAwMTtcbiAgICBnbG9iYWxVbmlmb3Jtcy52YWx1ZXNbNl0gPSByZW5kZXJTdGF0ZS52aWV3VHJhbnNmb3JtO1xuXG4gICAgdGhpcy5wcm9ncmFtLnNldFVuaWZvcm1zKGdsb2JhbFVuaWZvcm1zLmtleXMsIGdsb2JhbFVuaWZvcm1zLnZhbHVlcyk7XG59O1xuXG4vKipcbiAqIExvYWRzIHRoZSBidWZmZXJzIGFuZCBpc3N1ZXMgdGhlIGRyYXcgY29tbWFuZCBmb3IgYSBnZW9tZXRyeS5cbiAqXG4gKiBAbWV0aG9kXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZlcnRleEJ1ZmZlcnMgQWxsIGJ1ZmZlcnMgdXNlZCB0byBkcmF3IHRoZSBnZW9tZXRyeS5cbiAqIEBwYXJhbSB7TnVtYmVyfSBtb2RlIEVudW1lcmF0b3IgZGVmaW5pbmcgd2hhdCBwcmltaXRpdmUgdG8gZHJhd1xuICogQHBhcmFtIHtOdW1iZXJ9IGlkIElEIG9mIGdlb21ldHJ5IGJlaW5nIGRyYXduLlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLmRyYXdCdWZmZXJzID0gZnVuY3Rpb24gZHJhd0J1ZmZlcnModmVydGV4QnVmZmVycywgbW9kZSwgaWQpIHtcbiAgICB2YXIgZ2wgPSB0aGlzLmdsO1xuICAgIHZhciBsZW5ndGggPSAwO1xuICAgIHZhciBhdHRyaWJ1dGU7XG4gICAgdmFyIGxvY2F0aW9uO1xuICAgIHZhciBzcGFjaW5nO1xuICAgIHZhciBvZmZzZXQ7XG4gICAgdmFyIGJ1ZmZlcjtcbiAgICB2YXIgaXRlcjtcbiAgICB2YXIgajtcbiAgICB2YXIgaTtcblxuICAgIGl0ZXIgPSB2ZXJ0ZXhCdWZmZXJzLmtleXMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBpdGVyOyBpKyspIHtcbiAgICAgICAgYXR0cmlidXRlID0gdmVydGV4QnVmZmVycy5rZXlzW2ldO1xuXG4gICAgICAgIC8vIERvIG5vdCBzZXQgdmVydGV4QXR0cmliUG9pbnRlciBpZiBpbmRleCBidWZmZXIuXG5cbiAgICAgICAgaWYgKGF0dHJpYnV0ZSA9PT0gJ2luZGljZXMnKSB7XG4gICAgICAgICAgICBqID0gaTsgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXRyZWl2ZSB0aGUgYXR0cmlidXRlIGxvY2F0aW9uIGFuZCBtYWtlIHN1cmUgaXQgaXMgZW5hYmxlZC5cblxuICAgICAgICBsb2NhdGlvbiA9IHRoaXMucHJvZ3JhbS5hdHRyaWJ1dGVMb2NhdGlvbnNbYXR0cmlidXRlXTtcblxuICAgICAgICBpZiAobG9jYXRpb24gPT09IC0xKSBjb250aW51ZTtcbiAgICAgICAgaWYgKGxvY2F0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGxvY2F0aW9uID0gZ2wuZ2V0QXR0cmliTG9jYXRpb24odGhpcy5wcm9ncmFtLnByb2dyYW0sIGF0dHJpYnV0ZSk7XG4gICAgICAgICAgICB0aGlzLnByb2dyYW0uYXR0cmlidXRlTG9jYXRpb25zW2F0dHJpYnV0ZV0gPSBsb2NhdGlvbjtcbiAgICAgICAgICAgIGlmIChsb2NhdGlvbiA9PT0gLTEpIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzW2F0dHJpYnV0ZV0pIHtcbiAgICAgICAgICAgIGdsLmVuYWJsZVZlcnRleEF0dHJpYkFycmF5KGxvY2F0aW9uKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGUuZW5hYmxlZEF0dHJpYnV0ZXNbYXR0cmlidXRlXSA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzS2V5cy5wdXNoKGF0dHJpYnV0ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXRyZWl2ZSBidWZmZXIgaW5mb3JtYXRpb24gdXNlZCB0byBzZXQgYXR0cmlidXRlIHBvaW50ZXIuXG5cbiAgICAgICAgYnVmZmVyID0gdmVydGV4QnVmZmVycy52YWx1ZXNbaV07XG4gICAgICAgIHNwYWNpbmcgPSB2ZXJ0ZXhCdWZmZXJzLnNwYWNpbmdbaV07XG4gICAgICAgIG9mZnNldCA9IHZlcnRleEJ1ZmZlcnMub2Zmc2V0W2ldO1xuICAgICAgICBsZW5ndGggPSB2ZXJ0ZXhCdWZmZXJzLmxlbmd0aFtpXTtcblxuICAgICAgICAvLyBTa2lwIGJpbmRCdWZmZXIgaWYgYnVmZmVyIGlzIGN1cnJlbnRseSBib3VuZC5cblxuICAgICAgICBpZiAodGhpcy5zdGF0ZS5ib3VuZEFycmF5QnVmZmVyICE9PSBidWZmZXIpIHtcbiAgICAgICAgICAgIGdsLmJpbmRCdWZmZXIoYnVmZmVyLnRhcmdldCwgYnVmZmVyLmJ1ZmZlcik7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLmJvdW5kQXJyYXlCdWZmZXIgPSBidWZmZXI7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5zdGF0ZS5sYXN0RHJhd24gIT09IGlkKSB7XG4gICAgICAgICAgICBnbC52ZXJ0ZXhBdHRyaWJQb2ludGVyKGxvY2F0aW9uLCBzcGFjaW5nLCBnbC5GTE9BVCwgZ2wuRkFMU0UsIDAsIDQgKiBvZmZzZXQpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gRGlzYWJsZSBhbnkgYXR0cmlidXRlcyB0aGF0IG5vdCBjdXJyZW50bHkgYmVpbmcgdXNlZC5cblxuICAgIHZhciBsZW4gPSB0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzS2V5cy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHZhciBrZXkgPSB0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzS2V5c1tpXTtcbiAgICAgICAgaWYgKHRoaXMuc3RhdGUuZW5hYmxlZEF0dHJpYnV0ZXNba2V5XSAmJiB2ZXJ0ZXhCdWZmZXJzLmtleXMuaW5kZXhPZihrZXkpID09PSAtMSkge1xuICAgICAgICAgICAgZ2wuZGlzYWJsZVZlcnRleEF0dHJpYkFycmF5KHRoaXMucHJvZ3JhbS5hdHRyaWJ1dGVMb2NhdGlvbnNba2V5XSk7XG4gICAgICAgICAgICB0aGlzLnN0YXRlLmVuYWJsZWRBdHRyaWJ1dGVzW2tleV0gPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChsZW5ndGgpIHtcblxuICAgICAgICAvLyBJZiBpbmRleCBidWZmZXIsIHVzZSBkcmF3RWxlbWVudHMuXG5cbiAgICAgICAgaWYgKGogIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgYnVmZmVyID0gdmVydGV4QnVmZmVycy52YWx1ZXNbal07XG4gICAgICAgICAgICBvZmZzZXQgPSB2ZXJ0ZXhCdWZmZXJzLm9mZnNldFtqXTtcbiAgICAgICAgICAgIHNwYWNpbmcgPSB2ZXJ0ZXhCdWZmZXJzLnNwYWNpbmdbal07XG4gICAgICAgICAgICBsZW5ndGggPSB2ZXJ0ZXhCdWZmZXJzLmxlbmd0aFtqXTtcblxuICAgICAgICAgICAgLy8gU2tpcCBiaW5kQnVmZmVyIGlmIGJ1ZmZlciBpcyBjdXJyZW50bHkgYm91bmQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLnN0YXRlLmJvdW5kRWxlbWVudEJ1ZmZlciAhPT0gYnVmZmVyKSB7XG4gICAgICAgICAgICAgICAgZ2wuYmluZEJ1ZmZlcihidWZmZXIudGFyZ2V0LCBidWZmZXIuYnVmZmVyKTtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlLmJvdW5kRWxlbWVudEJ1ZmZlciA9IGJ1ZmZlcjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZ2wuZHJhd0VsZW1lbnRzKGdsW21vZGVdLCBsZW5ndGgsIGdsLlVOU0lHTkVEX1NIT1JULCAyICogb2Zmc2V0KTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGdsLmRyYXdBcnJheXMoZ2xbbW9kZV0sIDAsIGxlbmd0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnN0YXRlLmxhc3REcmF3biA9IGlkO1xufTtcblxuXG4vKipcbiAqIFVwZGF0ZXMgdGhlIHdpZHRoIGFuZCBoZWlnaHQgb2YgcGFyZW50IGNhbnZhcywgc2V0cyB0aGUgdmlld3BvcnQgc2l6ZSBvblxuICogdGhlIFdlYkdMIGNvbnRleHQgYW5kIHVwZGF0ZXMgdGhlIHJlc29sdXRpb24gdW5pZm9ybSBmb3IgdGhlIHNoYWRlciBwcm9ncmFtLlxuICogU2l6ZSBpcyByZXRyZWl2ZWQgZnJvbSB0aGUgY29udGFpbmVyIG9iamVjdCBvZiB0aGUgcmVuZGVyZXIuXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7QXJyYXl9IHNpemUgd2lkdGgsIGhlaWdodCBhbmQgZGVwdGggb2YgY2FudmFzXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUudXBkYXRlU2l6ZSA9IGZ1bmN0aW9uIHVwZGF0ZVNpemUoc2l6ZSkge1xuICAgIGlmIChzaXplKSB7XG4gICAgICAgIHZhciBwaXhlbFJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMTtcbiAgICAgICAgdmFyIGRpc3BsYXlXaWR0aCA9IH5+KHNpemVbMF0gKiBwaXhlbFJhdGlvKTtcbiAgICAgICAgdmFyIGRpc3BsYXlIZWlnaHQgPSB+fihzaXplWzFdICogcGl4ZWxSYXRpbyk7XG4gICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gZGlzcGxheVdpZHRoO1xuICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSBkaXNwbGF5SGVpZ2h0O1xuICAgICAgICB0aGlzLmdsLnZpZXdwb3J0KDAsIDAsIGRpc3BsYXlXaWR0aCwgZGlzcGxheUhlaWdodCk7XG5cbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzBdID0gc2l6ZVswXTtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzFdID0gc2l6ZVsxXTtcbiAgICAgICAgdGhpcy5jYWNoZWRTaXplWzJdID0gKHNpemVbMF0gPiBzaXplWzFdKSA/IHNpemVbMF0gOiBzaXplWzFdO1xuICAgICAgICB0aGlzLnJlc29sdXRpb25WYWx1ZXNbMF0gPSB0aGlzLmNhY2hlZFNpemU7XG4gICAgfVxuXG4gICAgdGhpcy5wcm9ncmFtLnNldFVuaWZvcm1zKHRoaXMucmVzb2x1dGlvbk5hbWUsIHRoaXMucmVzb2x1dGlvblZhbHVlcyk7XG5cbiAgICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogVXBkYXRlcyB0aGUgc3RhdGUgb2YgdGhlIFdlYkdMIGRyYXdpbmcgY29udGV4dCBiYXNlZCBvbiBjdXN0b20gcGFyYW1ldGVyc1xuICogZGVmaW5lZCBvbiBhIG1lc2guXG4gKlxuICogQG1ldGhvZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIERyYXcgc3RhdGUgb3B0aW9ucyB0byBiZSBzZXQgdG8gdGhlIGNvbnRleHQuXG4gKiBAcGFyYW0ge01lc2h9IG1lc2ggQXNzb2NpYXRlZCBNZXNoXG4gKlxuICogQHJldHVybiB7dW5kZWZpbmVkfSB1bmRlZmluZWRcbiAqL1xuV2ViR0xSZW5kZXJlci5wcm90b3R5cGUuaGFuZGxlT3B0aW9ucyA9IGZ1bmN0aW9uIGhhbmRsZU9wdGlvbnMob3B0aW9ucywgbWVzaCkge1xuICAgIHZhciBnbCA9IHRoaXMuZ2w7XG4gICAgaWYgKCFvcHRpb25zKSByZXR1cm47XG5cbiAgICBpZiAob3B0aW9ucy5ibGVuZGluZykgZ2wuZW5hYmxlKGdsLkJMRU5EKTtcblxuICAgIGlmIChvcHRpb25zLnNpZGUgPT09ICdkb3VibGUnKSB7XG4gICAgICAgIHRoaXMuZ2wuY3VsbEZhY2UodGhpcy5nbC5GUk9OVCk7XG4gICAgICAgIHRoaXMuZHJhd0J1ZmZlcnModGhpcy5idWZmZXJSZWdpc3RyeS5yZWdpc3RyeVttZXNoLmdlb21ldHJ5XSwgbWVzaC5kcmF3VHlwZSwgbWVzaC5nZW9tZXRyeSk7XG4gICAgICAgIHRoaXMuZ2wuY3VsbEZhY2UodGhpcy5nbC5CQUNLKTtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5zaWRlID09PSAnYmFjaycpIGdsLmN1bGxGYWNlKGdsLkZST05UKTtcbn07XG5cbi8qKlxuICogUmVzZXRzIHRoZSBzdGF0ZSBvZiB0aGUgV2ViR0wgZHJhd2luZyBjb250ZXh0IHRvIGRlZmF1bHQgdmFsdWVzLlxuICpcbiAqIEBtZXRob2RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBEcmF3IHN0YXRlIG9wdGlvbnMgdG8gYmUgc2V0IHRvIHRoZSBjb250ZXh0LlxuICpcbiAqIEByZXR1cm4ge3VuZGVmaW5lZH0gdW5kZWZpbmVkXG4gKi9cbldlYkdMUmVuZGVyZXIucHJvdG90eXBlLnJlc2V0T3B0aW9ucyA9IGZ1bmN0aW9uIHJlc2V0T3B0aW9ucyhvcHRpb25zKSB7XG4gICAgdmFyIGdsID0gdGhpcy5nbDtcbiAgICBpZiAoIW9wdGlvbnMpIHJldHVybjtcbiAgICBpZiAob3B0aW9ucy5ibGVuZGluZykgZ2wuZGlzYWJsZShnbC5CTEVORCk7XG4gICAgaWYgKG9wdGlvbnMuc2lkZSA9PT0gJ2JhY2snKSBnbC5jdWxsRmFjZShnbC5CQUNLKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gV2ViR0xSZW5kZXJlcjtcbiIsIi8qKlxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxuICogVEhFIFNPRlRXQVJFLlxuICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciB0eXBlcyA9IHtcbiAgICAxOiAnZmxvYXQgJyxcbiAgICAyOiAndmVjMiAnLFxuICAgIDM6ICd2ZWMzICcsXG4gICAgNDogJ3ZlYzQgJ1xufTtcblxuLyoqXG4gKiBUcmF2ZXJzZXMgbWF0ZXJpYWwgdG8gY3JlYXRlIGEgc3RyaW5nIG9mIGdsc2wgY29kZSB0byBiZSBhcHBsaWVkIGluXG4gKiB0aGUgdmVydGV4IG9yIGZyYWdtZW50IHNoYWRlci5cbiAqXG4gKiBAbWV0aG9kXG4gKiBAcHJvdGVjdGVkXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG1hdGVyaWFsIE1hdGVyaWFsIHRvIGJlIGNvbXBpbGVkLlxuICogQHBhcmFtIHtOdW1iZXJ9IHRleHR1cmVTbG90IE5leHQgYXZhaWxhYmxlIHRleHR1cmUgc2xvdCBmb3IgTWVzaC5cbiAqXG4gKiBAcmV0dXJuIHt1bmRlZmluZWR9IHVuZGVmaW5lZFxuICovXG5mdW5jdGlvbiBjb21waWxlTWF0ZXJpYWwobWF0ZXJpYWwsIHRleHR1cmVTbG90KSB7XG4gICAgdmFyIGdsc2wgPSAnJztcbiAgICB2YXIgdW5pZm9ybXMgPSB7fTtcbiAgICB2YXIgdmFyeWluZ3MgPSB7fTtcbiAgICB2YXIgYXR0cmlidXRlcyA9IHt9O1xuICAgIHZhciBkZWZpbmVzID0gW107XG4gICAgdmFyIHRleHR1cmVzID0gW107XG5cbiAgICBfdHJhdmVyc2UobWF0ZXJpYWwsIGZ1bmN0aW9uIChub2RlLCBkZXB0aCkge1xuICAgICAgICBpZiAoISBub2RlLmNodW5rKSByZXR1cm47XG5cbiAgICAgICAgdmFyIHR5cGUgPSB0eXBlc1tfZ2V0T3V0cHV0TGVuZ3RoKG5vZGUpXTtcbiAgICAgICAgdmFyIGxhYmVsID0gX21ha2VMYWJlbChub2RlKTtcbiAgICAgICAgdmFyIG91dHB1dCA9IF9wcm9jZXNzR0xTTChub2RlLmNodW5rLmdsc2wsIG5vZGUuaW5wdXRzLCB0ZXh0dXJlcy5sZW5ndGggKyB0ZXh0dXJlU2xvdCk7XG5cbiAgICAgICAgZ2xzbCArPSB0eXBlICsgbGFiZWwgKyAnID0gJyArIG91dHB1dCArICdcXG4gJztcblxuICAgICAgICBpZiAobm9kZS51bmlmb3JtcykgX2V4dGVuZCh1bmlmb3Jtcywgbm9kZS51bmlmb3Jtcyk7XG4gICAgICAgIGlmIChub2RlLnZhcnlpbmdzKSBfZXh0ZW5kKHZhcnlpbmdzLCBub2RlLnZhcnlpbmdzKTtcbiAgICAgICAgaWYgKG5vZGUuYXR0cmlidXRlcykgX2V4dGVuZChhdHRyaWJ1dGVzLCBub2RlLmF0dHJpYnV0ZXMpO1xuICAgICAgICBpZiAobm9kZS5jaHVuay5kZWZpbmVzKSBkZWZpbmVzLnB1c2gobm9kZS5jaHVuay5kZWZpbmVzKTtcbiAgICAgICAgaWYgKG5vZGUudGV4dHVyZSkgdGV4dHVyZXMucHVzaChub2RlLnRleHR1cmUpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgX2lkOiBtYXRlcmlhbC5faWQsXG4gICAgICAgIGdsc2w6IGdsc2wgKyAncmV0dXJuICcgKyBfbWFrZUxhYmVsKG1hdGVyaWFsKSArICc7JyxcbiAgICAgICAgZGVmaW5lczogZGVmaW5lcy5qb2luKCdcXG4nKSxcbiAgICAgICAgdW5pZm9ybXM6IHVuaWZvcm1zLFxuICAgICAgICB2YXJ5aW5nczogdmFyeWluZ3MsXG4gICAgICAgIGF0dHJpYnV0ZXM6IGF0dHJpYnV0ZXMsXG4gICAgICAgIHRleHR1cmVzOiB0ZXh0dXJlc1xuICAgIH07XG59XG5cbi8vIFJlY3Vyc2l2ZWx5IGl0ZXJhdGVzIG92ZXIgYSBtYXRlcmlhbCdzIGlucHV0cywgaW52b2tpbmcgYSBnaXZlbiBjYWxsYmFja1xuLy8gd2l0aCB0aGUgY3VycmVudCBtYXRlcmlhbFxuZnVuY3Rpb24gX3RyYXZlcnNlKG1hdGVyaWFsLCBjYWxsYmFjaykge1xuXHR2YXIgaW5wdXRzID0gbWF0ZXJpYWwuaW5wdXRzO1xuICAgIHZhciBsZW4gPSBpbnB1dHMgJiYgaW5wdXRzLmxlbmd0aDtcbiAgICB2YXIgaWR4ID0gLTE7XG5cbiAgICB3aGlsZSAoKytpZHggPCBsZW4pIF90cmF2ZXJzZShpbnB1dHNbaWR4XSwgY2FsbGJhY2spO1xuXG4gICAgY2FsbGJhY2sobWF0ZXJpYWwpO1xuXG4gICAgcmV0dXJuIG1hdGVyaWFsO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBpbmZlciBsZW5ndGggb2YgdGhlIG91dHB1dFxuLy8gZnJvbSBhIGdpdmVuIG1hdGVyaWFsIG5vZGUuXG5mdW5jdGlvbiBfZ2V0T3V0cHV0TGVuZ3RoKG5vZGUpIHtcblxuICAgIC8vIEhhbmRsZSBjb25zdGFudCB2YWx1ZXNcblxuICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicpIHJldHVybiAxO1xuICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSByZXR1cm4gbm9kZS5sZW5ndGg7XG5cbiAgICAvLyBIYW5kbGUgbWF0ZXJpYWxzXG5cbiAgICB2YXIgb3V0cHV0ID0gbm9kZS5jaHVuay5vdXRwdXQ7XG4gICAgaWYgKHR5cGVvZiBvdXRwdXQgPT09ICdudW1iZXInKSByZXR1cm4gb3V0cHV0O1xuXG4gICAgLy8gSGFuZGxlIHBvbHltb3JwaGljIG91dHB1dFxuXG4gICAgdmFyIGtleSA9IG5vZGUuaW5wdXRzLm1hcChmdW5jdGlvbiByZWN1cnNlKG5vZGUpIHtcbiAgICAgICAgcmV0dXJuIF9nZXRPdXRwdXRMZW5ndGgobm9kZSk7XG4gICAgfSkuam9pbignLCcpO1xuXG4gICAgcmV0dXJuIG91dHB1dFtrZXldO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gcnVuIHJlcGxhY2UgaW5wdXRzIGFuZCB0ZXh0dXJlIHRhZ3Mgd2l0aFxuLy8gY29ycmVjdCBnbHNsLlxuZnVuY3Rpb24gX3Byb2Nlc3NHTFNMKHN0ciwgaW5wdXRzLCB0ZXh0dXJlU2xvdCkge1xuICAgIHJldHVybiBzdHJcbiAgICAgICAgLnJlcGxhY2UoLyVcXGQvZywgZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgIHJldHVybiBfbWFrZUxhYmVsKGlucHV0c1tzWzFdLTFdKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnJlcGxhY2UoL1xcJFRFWFRVUkUvLCAndV90ZXh0dXJlc1snICsgdGV4dHVyZVNsb3QgKyAnXScpO1xufVxuXG4vLyBIZWxwZXIgZnVuY3Rpb24gdXNlZCB0byBjcmVhdGUgZ2xzbCBkZWZpbml0aW9uIG9mIHRoZVxuLy8gaW5wdXQgbWF0ZXJpYWwgbm9kZS5cbmZ1bmN0aW9uIF9tYWtlTGFiZWwgKG4pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShuKSkgcmV0dXJuIF9hcnJheVRvVmVjKG4pO1xuICAgIGlmICh0eXBlb2YgbiA9PT0gJ29iamVjdCcpIHJldHVybiAnZmFfJyArIChuLl9pZCk7XG4gICAgZWxzZSByZXR1cm4gbi50b0ZpeGVkKDYpO1xufVxuXG4vLyBIZWxwZXIgdG8gY29weSB0aGUgcHJvcGVydGllcyBvZiBhbiBvYmplY3Qgb250byBhbm90aGVyIG9iamVjdC5cbmZ1bmN0aW9uIF9leHRlbmQgKGEsIGIpIHtcblx0Zm9yICh2YXIgayBpbiBiKSBhW2tdID0gYltrXTtcbn1cblxuLy8gSGVscGVyIHRvIGNyZWF0ZSBnbHNsIHZlY3RvciByZXByZXNlbnRhdGlvbiBvZiBhIGphdmFzY3JpcHQgYXJyYXkuXG5mdW5jdGlvbiBfYXJyYXlUb1ZlYyhhcnJheSkge1xuICAgIHZhciBsZW4gPSBhcnJheS5sZW5ndGg7XG4gICAgcmV0dXJuICd2ZWMnICsgbGVuICsgJygnICsgYXJyYXkuam9pbignLCcpICArICcpJztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjb21waWxlTWF0ZXJpYWw7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cbi8vIEdlbmVyYXRlcyBhIGNoZWNrZXJib2FyZCBwYXR0ZXJuIHRvIGJlIHVzZWQgYXMgYSBwbGFjZWhvbGRlciB0ZXh0dXJlIHdoaWxlIGFuXG4vLyBpbWFnZSBsb2FkcyBvdmVyIHRoZSBuZXR3b3JrLlxuZnVuY3Rpb24gY3JlYXRlQ2hlY2tlckJvYXJkKCkge1xuICAgIHZhciBjb250ZXh0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjb250ZXh0LmNhbnZhcy53aWR0aCA9IGNvbnRleHQuY2FudmFzLmhlaWdodCA9IDEyODtcbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IGNvbnRleHQuY2FudmFzLmhlaWdodDsgeSArPSAxNikge1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGNvbnRleHQuY2FudmFzLndpZHRoOyB4ICs9IDE2KSB7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxTdHlsZSA9ICh4IF4geSkgJiAxNiA/ICcjRkZGJyA6ICcjREREJztcbiAgICAgICAgICAgIGNvbnRleHQuZmlsbFJlY3QoeCwgeSwgMTYsIDE2KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjb250ZXh0LmNhbnZhcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVDaGVja2VyQm9hcmQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmFkaXhCaXRzID0gMTEsXG4gICAgbWF4UmFkaXggPSAxIDw8IChyYWRpeEJpdHMpLFxuICAgIHJhZGl4TWFzayA9IG1heFJhZGl4IC0gMSxcbiAgICBidWNrZXRzID0gbmV3IEFycmF5KG1heFJhZGl4ICogTWF0aC5jZWlsKDY0IC8gcmFkaXhCaXRzKSksXG4gICAgbXNiTWFzayA9IDEgPDwgKCgzMiAtIDEpICUgcmFkaXhCaXRzKSxcbiAgICBsYXN0TWFzayA9IChtc2JNYXNrIDw8IDEpIC0gMSxcbiAgICBwYXNzQ291bnQgPSAoKDMyIC8gcmFkaXhCaXRzKSArIDAuOTk5OTk5OTk5OTk5OTk5KSB8IDAsXG4gICAgbWF4T2Zmc2V0ID0gbWF4UmFkaXggKiAocGFzc0NvdW50IC0gMSksXG4gICAgbm9ybWFsaXplciA9IE1hdGgucG93KDIwLCA2KTtcblxudmFyIGJ1ZmZlciA9IG5ldyBBcnJheUJ1ZmZlcig0KTtcbnZhciBmbG9hdFZpZXcgPSBuZXcgRmxvYXQzMkFycmF5KGJ1ZmZlciwgMCwgMSk7XG52YXIgaW50VmlldyA9IG5ldyBJbnQzMkFycmF5KGJ1ZmZlciwgMCwgMSk7XG5cbi8vIGNvbXBhcmF0b3IgcHVsbHMgcmVsZXZhbnQgc29ydGluZyBrZXlzIG91dCBvZiBtZXNoXG5mdW5jdGlvbiBjb21wKGxpc3QsIHJlZ2lzdHJ5LCBpKSB7XG4gICAgdmFyIGtleSA9IGxpc3RbaV07XG4gICAgdmFyIGl0ZW0gPSByZWdpc3RyeVtrZXldO1xuICAgIHJldHVybiAoaXRlbS5kZXB0aCA/IGl0ZW0uZGVwdGggOiByZWdpc3RyeVtrZXldLnVuaWZvcm1WYWx1ZXNbMV1bMTRdKSArIG5vcm1hbGl6ZXI7XG59XG5cbi8vbXV0YXRvciBmdW5jdGlvbiByZWNvcmRzIG1lc2gncyBwbGFjZSBpbiBwcmV2aW91cyBwYXNzXG5mdW5jdGlvbiBtdXRhdG9yKGxpc3QsIHJlZ2lzdHJ5LCBpLCB2YWx1ZSkge1xuICAgIHZhciBrZXkgPSBsaXN0W2ldO1xuICAgIHJlZ2lzdHJ5W2tleV0uZGVwdGggPSBpbnRUb0Zsb2F0KHZhbHVlKSAtIG5vcm1hbGl6ZXI7XG4gICAgcmV0dXJuIGtleTtcbn1cblxuLy9jbGVhbiBmdW5jdGlvbiByZW1vdmVzIG11dGF0b3IgZnVuY3Rpb24ncyByZWNvcmRcbmZ1bmN0aW9uIGNsZWFuKGxpc3QsIHJlZ2lzdHJ5LCBpKSB7XG4gICAgcmVnaXN0cnlbbGlzdFtpXV0uZGVwdGggPSBudWxsO1xufVxuXG4vL2NvbnZlcnRzIGEgamF2YXNjcmlwdCBmbG9hdCB0byBhIDMyYml0IGludGVnZXIgdXNpbmcgYW4gYXJyYXkgYnVmZmVyXG4vL29mIHNpemUgb25lXG5mdW5jdGlvbiBmbG9hdFRvSW50KGspIHtcbiAgICBmbG9hdFZpZXdbMF0gPSBrO1xuICAgIHJldHVybiBpbnRWaWV3WzBdO1xufVxuLy9jb252ZXJ0cyBhIDMyIGJpdCBpbnRlZ2VyIHRvIGEgcmVndWxhciBqYXZhc2NyaXB0IGZsb2F0IHVzaW5nIGFuIGFycmF5IGJ1ZmZlclxuLy9vZiBzaXplIG9uZVxuZnVuY3Rpb24gaW50VG9GbG9hdChrKSB7XG4gICAgaW50Vmlld1swXSA9IGs7XG4gICAgcmV0dXJuIGZsb2F0Vmlld1swXTtcbn1cblxuLy9zb3J0cyBhIGxpc3Qgb2YgbWVzaCBJRHMgYWNjb3JkaW5nIHRvIHRoZWlyIHotZGVwdGhcbmZ1bmN0aW9uIHJhZGl4U29ydChsaXN0LCByZWdpc3RyeSkge1xuICAgIHZhciBwYXNzID0gMDtcbiAgICB2YXIgb3V0ID0gW107XG5cbiAgICB2YXIgaSwgaiwgaywgbiwgZGl2LCBvZmZzZXQsIHN3YXAsIGlkLCBzdW0sIHRzdW0sIHNpemU7XG5cbiAgICBwYXNzQ291bnQgPSAoKDMyIC8gcmFkaXhCaXRzKSArIDAuOTk5OTk5OTk5OTk5OTk5KSB8IDA7XG5cbiAgICBmb3IgKGkgPSAwLCBuID0gbWF4UmFkaXggKiBwYXNzQ291bnQ7IGkgPCBuOyBpKyspIGJ1Y2tldHNbaV0gPSAwO1xuXG4gICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGRpdiA9IGZsb2F0VG9JbnQoY29tcChsaXN0LCByZWdpc3RyeSwgaSkpO1xuICAgICAgICBkaXYgXj0gZGl2ID4+IDMxIHwgMHg4MDAwMDAwMDtcbiAgICAgICAgZm9yIChqID0gMCwgayA9IDA7IGogPCBtYXhPZmZzZXQ7IGogKz0gbWF4UmFkaXgsIGsgKz0gcmFkaXhCaXRzKSB7XG4gICAgICAgICAgICBidWNrZXRzW2ogKyAoZGl2ID4+PiBrICYgcmFkaXhNYXNrKV0rKztcbiAgICAgICAgfVxuICAgICAgICBidWNrZXRzW2ogKyAoZGl2ID4+PiBrICYgbGFzdE1hc2spXSsrO1xuICAgIH1cblxuICAgIGZvciAoaiA9IDA7IGogPD0gbWF4T2Zmc2V0OyBqICs9IG1heFJhZGl4KSB7XG4gICAgICAgIGZvciAoaWQgPSBqLCBzdW0gPSAwOyBpZCA8IGogKyBtYXhSYWRpeDsgaWQrKykge1xuICAgICAgICAgICAgdHN1bSA9IGJ1Y2tldHNbaWRdICsgc3VtO1xuICAgICAgICAgICAgYnVja2V0c1tpZF0gPSBzdW0gLSAxO1xuICAgICAgICAgICAgc3VtID0gdHN1bTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoLS1wYXNzQ291bnQpIHtcbiAgICAgICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgICAgIG91dFsrK2J1Y2tldHNbZGl2ICYgcmFkaXhNYXNrXV0gPSBtdXRhdG9yKGxpc3QsIHJlZ2lzdHJ5LCBpLCBkaXYgXj0gZGl2ID4+IDMxIHwgMHg4MDAwMDAwMCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHN3YXAgPSBvdXQ7XG4gICAgICAgIG91dCA9IGxpc3Q7XG4gICAgICAgIGxpc3QgPSBzd2FwO1xuICAgICAgICB3aGlsZSAoKytwYXNzIDwgcGFzc0NvdW50KSB7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBuID0gbGlzdC5sZW5ndGgsIG9mZnNldCA9IHBhc3MgKiBtYXhSYWRpeCwgc2l6ZSA9IHBhc3MgKiByYWRpeEJpdHM7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBkaXYgPSBmbG9hdFRvSW50KGNvbXAobGlzdCwgcmVnaXN0cnksIGkpKTtcbiAgICAgICAgICAgICAgICBvdXRbKytidWNrZXRzW29mZnNldCArIChkaXYgPj4+IHNpemUgJiByYWRpeE1hc2spXV0gPSBsaXN0W2ldO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzd2FwID0gb3V0O1xuICAgICAgICAgICAgb3V0ID0gbGlzdDtcbiAgICAgICAgICAgIGxpc3QgPSBzd2FwO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChpID0gMCwgbiA9IGxpc3QubGVuZ3RoLCBvZmZzZXQgPSBwYXNzICogbWF4UmFkaXgsIHNpemUgPSBwYXNzICogcmFkaXhCaXRzOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIGRpdiA9IGZsb2F0VG9JbnQoY29tcChsaXN0LCByZWdpc3RyeSwgaSkpO1xuICAgICAgICBvdXRbKytidWNrZXRzW29mZnNldCArIChkaXYgPj4+IHNpemUgJiBsYXN0TWFzayldXSA9IG11dGF0b3IobGlzdCwgcmVnaXN0cnksIGksIGRpdiBeICh+ZGl2ID4+IDMxIHwgMHg4MDAwMDAwMCkpO1xuICAgICAgICBjbGVhbihsaXN0LCByZWdpc3RyeSwgaSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG91dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSByYWRpeFNvcnQ7XG4iLCIvKipcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuICpcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbiAqXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cbiAqIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4ndXNlIHN0cmljdCc7XG5cblxuXG52YXIgc2hhZGVycyA9IHtcbiAgICB2ZXJ0ZXg6IFwiI2RlZmluZSBHTFNMSUZZIDFcXG5cXG4vKipcXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcXG4gKiBcXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxcbiAqIFxcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcXG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcXFwiU29mdHdhcmVcXFwiKSwgdG8gZGVhbFxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXFxuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcXG4gKiBcXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxcbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxcbiAqIFxcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcXFwiQVMgSVNcXFwiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXFxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXFxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxcbiAqIFRIRSBTT0ZUV0FSRS5cXG4gKi9cXG5cXG4vKipcXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcXG4gKiBcXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxcbiAqIFxcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcXG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcXFwiU29mdHdhcmVcXFwiKSwgdG8gZGVhbFxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXFxuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcXG4gKiBcXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxcbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxcbiAqIFxcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcXFwiQVMgSVNcXFwiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXFxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXFxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxcbiAqIFRIRSBTT0ZUV0FSRS5cXG4gKi9cXG5cXG4vKipcXG4gKiBDYWxjdWxhdGVzIHRyYW5zcG9zZSBpbnZlcnNlIG1hdHJpeCBmcm9tIHRyYW5zZm9ybVxcbiAqIFxcbiAqIEBtZXRob2QgcmFuZG9tXFxuICogQHByaXZhdGVcXG4gKlxcbiAqXFxuICovXFxuXFxuXFxubWF0MyBnZXROb3JtYWxNYXRyaXhfMV8wKGluIG1hdDQgdCkge1xcbiAgIG1hdDMgbWF0Tm9ybTtcXG4gICBtYXQ0IGEgPSB0O1xcblxcbiAgIGZsb2F0IGEwMCA9IGFbMF1bMF0sIGEwMSA9IGFbMF1bMV0sIGEwMiA9IGFbMF1bMl0sIGEwMyA9IGFbMF1bM10sXFxuICAgYTEwID0gYVsxXVswXSwgYTExID0gYVsxXVsxXSwgYTEyID0gYVsxXVsyXSwgYTEzID0gYVsxXVszXSxcXG4gICBhMjAgPSBhWzJdWzBdLCBhMjEgPSBhWzJdWzFdLCBhMjIgPSBhWzJdWzJdLCBhMjMgPSBhWzJdWzNdLFxcbiAgIGEzMCA9IGFbM11bMF0sIGEzMSA9IGFbM11bMV0sIGEzMiA9IGFbM11bMl0sIGEzMyA9IGFbM11bM10sXFxuICAgYjAwID0gYTAwICogYTExIC0gYTAxICogYTEwLFxcbiAgIGIwMSA9IGEwMCAqIGExMiAtIGEwMiAqIGExMCxcXG4gICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXFxuICAgYjAzID0gYTAxICogYTEyIC0gYTAyICogYTExLFxcbiAgIGIwNCA9IGEwMSAqIGExMyAtIGEwMyAqIGExMSxcXG4gICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXFxuICAgYjA2ID0gYTIwICogYTMxIC0gYTIxICogYTMwLFxcbiAgIGIwNyA9IGEyMCAqIGEzMiAtIGEyMiAqIGEzMCxcXG4gICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXFxuICAgYjA5ID0gYTIxICogYTMyIC0gYTIyICogYTMxLFxcbiAgIGIxMCA9IGEyMSAqIGEzMyAtIGEyMyAqIGEzMSxcXG4gICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsXFxuXFxuICAgZGV0ID0gYjAwICogYjExIC0gYjAxICogYjEwICsgYjAyICogYjA5ICsgYjAzICogYjA4IC0gYjA0ICogYjA3ICsgYjA1ICogYjA2O1xcbiAgIGRldCA9IDEuMCAvIGRldDtcXG5cXG4gICBtYXROb3JtWzBdWzBdID0gKGExMSAqIGIxMSAtIGExMiAqIGIxMCArIGExMyAqIGIwOSkgKiBkZXQ7XFxuICAgbWF0Tm9ybVswXVsxXSA9IChhMTIgKiBiMDggLSBhMTAgKiBiMTEgLSBhMTMgKiBiMDcpICogZGV0O1xcbiAgIG1hdE5vcm1bMF1bMl0gPSAoYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2KSAqIGRldDtcXG5cXG4gICBtYXROb3JtWzFdWzBdID0gKGEwMiAqIGIxMCAtIGEwMSAqIGIxMSAtIGEwMyAqIGIwOSkgKiBkZXQ7XFxuICAgbWF0Tm9ybVsxXVsxXSA9IChhMDAgKiBiMTEgLSBhMDIgKiBiMDggKyBhMDMgKiBiMDcpICogZGV0O1xcbiAgIG1hdE5vcm1bMV1bMl0gPSAoYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2KSAqIGRldDtcXG5cXG4gICBtYXROb3JtWzJdWzBdID0gKGEzMSAqIGIwNSAtIGEzMiAqIGIwNCArIGEzMyAqIGIwMykgKiBkZXQ7XFxuICAgbWF0Tm9ybVsyXVsxXSA9IChhMzIgKiBiMDIgLSBhMzAgKiBiMDUgLSBhMzMgKiBiMDEpICogZGV0O1xcbiAgIG1hdE5vcm1bMl1bMl0gPSAoYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwKSAqIGRldDtcXG5cXG4gICByZXR1cm4gbWF0Tm9ybTtcXG59XFxuXFxuXFxuXFxuLyoqXFxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXFxuICogXFxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cXG4gKiBcXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XFxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXFxcIlNvZnR3YXJlXFxcIiksIHRvIGRlYWxcXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXFxuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XFxuICogXFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cXG4gKiBcXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXFxcIkFTIElTXFxcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cXG4gKiBUSEUgU09GVFdBUkUuXFxuICovXFxuXFxuLyoqXFxuICogQ2FsY3VsYXRlcyBhIG1hdHJpeCB0aGF0IGNyZWF0ZXMgdGhlIGlkZW50aXR5IHdoZW4gbXVsdGlwbGllZCBieSBtXFxuICogXFxuICogQG1ldGhvZCBpbnZlcnNlXFxuICogQHByaXZhdGVcXG4gKlxcbiAqXFxuICovXFxuXFxuXFxuZmxvYXQgaW52ZXJzZV8yXzEoZmxvYXQgbSkge1xcbiAgICByZXR1cm4gMS4wIC8gbTtcXG59XFxuXFxubWF0MiBpbnZlcnNlXzJfMShtYXQyIG0pIHtcXG4gICAgcmV0dXJuIG1hdDIobVsxXVsxXSwtbVswXVsxXSxcXG4gICAgICAgICAgICAgICAtbVsxXVswXSwgbVswXVswXSkgLyAobVswXVswXSptWzFdWzFdIC0gbVswXVsxXSptWzFdWzBdKTtcXG59XFxuXFxubWF0MyBpbnZlcnNlXzJfMShtYXQzIG0pIHtcXG4gICAgZmxvYXQgYTAwID0gbVswXVswXSwgYTAxID0gbVswXVsxXSwgYTAyID0gbVswXVsyXTtcXG4gICAgZmxvYXQgYTEwID0gbVsxXVswXSwgYTExID0gbVsxXVsxXSwgYTEyID0gbVsxXVsyXTtcXG4gICAgZmxvYXQgYTIwID0gbVsyXVswXSwgYTIxID0gbVsyXVsxXSwgYTIyID0gbVsyXVsyXTtcXG5cXG4gICAgZmxvYXQgYjAxID0gIGEyMiAqIGExMSAtIGExMiAqIGEyMTtcXG4gICAgZmxvYXQgYjExID0gLWEyMiAqIGExMCArIGExMiAqIGEyMDtcXG4gICAgZmxvYXQgYjIxID0gIGEyMSAqIGExMCAtIGExMSAqIGEyMDtcXG5cXG4gICAgZmxvYXQgZGV0ID0gYTAwICogYjAxICsgYTAxICogYjExICsgYTAyICogYjIxO1xcblxcbiAgICByZXR1cm4gbWF0MyhiMDEsICgtYTIyICogYTAxICsgYTAyICogYTIxKSwgKGExMiAqIGEwMSAtIGEwMiAqIGExMSksXFxuICAgICAgICAgICAgICAgIGIxMSwgKGEyMiAqIGEwMCAtIGEwMiAqIGEyMCksICgtYTEyICogYTAwICsgYTAyICogYTEwKSxcXG4gICAgICAgICAgICAgICAgYjIxLCAoLWEyMSAqIGEwMCArIGEwMSAqIGEyMCksIChhMTEgKiBhMDAgLSBhMDEgKiBhMTApKSAvIGRldDtcXG59XFxuXFxubWF0NCBpbnZlcnNlXzJfMShtYXQ0IG0pIHtcXG4gICAgZmxvYXRcXG4gICAgICAgIGEwMCA9IG1bMF1bMF0sIGEwMSA9IG1bMF1bMV0sIGEwMiA9IG1bMF1bMl0sIGEwMyA9IG1bMF1bM10sXFxuICAgICAgICBhMTAgPSBtWzFdWzBdLCBhMTEgPSBtWzFdWzFdLCBhMTIgPSBtWzFdWzJdLCBhMTMgPSBtWzFdWzNdLFxcbiAgICAgICAgYTIwID0gbVsyXVswXSwgYTIxID0gbVsyXVsxXSwgYTIyID0gbVsyXVsyXSwgYTIzID0gbVsyXVszXSxcXG4gICAgICAgIGEzMCA9IG1bM11bMF0sIGEzMSA9IG1bM11bMV0sIGEzMiA9IG1bM11bMl0sIGEzMyA9IG1bM11bM10sXFxuXFxuICAgICAgICBiMDAgPSBhMDAgKiBhMTEgLSBhMDEgKiBhMTAsXFxuICAgICAgICBiMDEgPSBhMDAgKiBhMTIgLSBhMDIgKiBhMTAsXFxuICAgICAgICBiMDIgPSBhMDAgKiBhMTMgLSBhMDMgKiBhMTAsXFxuICAgICAgICBiMDMgPSBhMDEgKiBhMTIgLSBhMDIgKiBhMTEsXFxuICAgICAgICBiMDQgPSBhMDEgKiBhMTMgLSBhMDMgKiBhMTEsXFxuICAgICAgICBiMDUgPSBhMDIgKiBhMTMgLSBhMDMgKiBhMTIsXFxuICAgICAgICBiMDYgPSBhMjAgKiBhMzEgLSBhMjEgKiBhMzAsXFxuICAgICAgICBiMDcgPSBhMjAgKiBhMzIgLSBhMjIgKiBhMzAsXFxuICAgICAgICBiMDggPSBhMjAgKiBhMzMgLSBhMjMgKiBhMzAsXFxuICAgICAgICBiMDkgPSBhMjEgKiBhMzIgLSBhMjIgKiBhMzEsXFxuICAgICAgICBiMTAgPSBhMjEgKiBhMzMgLSBhMjMgKiBhMzEsXFxuICAgICAgICBiMTEgPSBhMjIgKiBhMzMgLSBhMjMgKiBhMzIsXFxuXFxuICAgICAgICBkZXQgPSBiMDAgKiBiMTEgLSBiMDEgKiBiMTAgKyBiMDIgKiBiMDkgKyBiMDMgKiBiMDggLSBiMDQgKiBiMDcgKyBiMDUgKiBiMDY7XFxuXFxuICAgIHJldHVybiBtYXQ0KFxcbiAgICAgICAgYTExICogYjExIC0gYTEyICogYjEwICsgYTEzICogYjA5LFxcbiAgICAgICAgYTAyICogYjEwIC0gYTAxICogYjExIC0gYTAzICogYjA5LFxcbiAgICAgICAgYTMxICogYjA1IC0gYTMyICogYjA0ICsgYTMzICogYjAzLFxcbiAgICAgICAgYTIyICogYjA0IC0gYTIxICogYjA1IC0gYTIzICogYjAzLFxcbiAgICAgICAgYTEyICogYjA4IC0gYTEwICogYjExIC0gYTEzICogYjA3LFxcbiAgICAgICAgYTAwICogYjExIC0gYTAyICogYjA4ICsgYTAzICogYjA3LFxcbiAgICAgICAgYTMyICogYjAyIC0gYTMwICogYjA1IC0gYTMzICogYjAxLFxcbiAgICAgICAgYTIwICogYjA1IC0gYTIyICogYjAyICsgYTIzICogYjAxLFxcbiAgICAgICAgYTEwICogYjEwIC0gYTExICogYjA4ICsgYTEzICogYjA2LFxcbiAgICAgICAgYTAxICogYjA4IC0gYTAwICogYjEwIC0gYTAzICogYjA2LFxcbiAgICAgICAgYTMwICogYjA0IC0gYTMxICogYjAyICsgYTMzICogYjAwLFxcbiAgICAgICAgYTIxICogYjAyIC0gYTIwICogYjA0IC0gYTIzICogYjAwLFxcbiAgICAgICAgYTExICogYjA3IC0gYTEwICogYjA5IC0gYTEyICogYjA2LFxcbiAgICAgICAgYTAwICogYjA5IC0gYTAxICogYjA3ICsgYTAyICogYjA2LFxcbiAgICAgICAgYTMxICogYjAxIC0gYTMwICogYjAzIC0gYTMyICogYjAwLFxcbiAgICAgICAgYTIwICogYjAzIC0gYTIxICogYjAxICsgYTIyICogYjAwKSAvIGRldDtcXG59XFxuXFxuXFxuXFxuLyoqXFxuICogVGhlIE1JVCBMaWNlbnNlIChNSVQpXFxuICogXFxuICogQ29weXJpZ2h0IChjKSAyMDE1IEZhbW91cyBJbmR1c3RyaWVzIEluYy5cXG4gKiBcXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XFxuICogb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXFxcIlNvZnR3YXJlXFxcIiksIHRvIGRlYWxcXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXFxuICogdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbFxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XFxuICogXFxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cXG4gKiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cXG4gKiBcXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXFxcIkFTIElTXFxcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxcbiAqIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxcbiAqIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU5cXG4gKiBUSEUgU09GVFdBUkUuXFxuICovXFxuXFxuLyoqXFxuICogUmVmbGVjdHMgYSBtYXRyaXggb3ZlciBpdHMgbWFpbiBkaWFnb25hbC5cXG4gKiBcXG4gKiBAbWV0aG9kIHRyYW5zcG9zZVxcbiAqIEBwcml2YXRlXFxuICpcXG4gKlxcbiAqL1xcblxcblxcbmZsb2F0IHRyYW5zcG9zZV8zXzIoZmxvYXQgbSkge1xcbiAgICByZXR1cm4gbTtcXG59XFxuXFxubWF0MiB0cmFuc3Bvc2VfM18yKG1hdDIgbSkge1xcbiAgICByZXR1cm4gbWF0MihtWzBdWzBdLCBtWzFdWzBdLFxcbiAgICAgICAgICAgICAgICBtWzBdWzFdLCBtWzFdWzFdKTtcXG59XFxuXFxubWF0MyB0cmFuc3Bvc2VfM18yKG1hdDMgbSkge1xcbiAgICByZXR1cm4gbWF0MyhtWzBdWzBdLCBtWzFdWzBdLCBtWzJdWzBdLFxcbiAgICAgICAgICAgICAgICBtWzBdWzFdLCBtWzFdWzFdLCBtWzJdWzFdLFxcbiAgICAgICAgICAgICAgICBtWzBdWzJdLCBtWzFdWzJdLCBtWzJdWzJdKTtcXG59XFxuXFxubWF0NCB0cmFuc3Bvc2VfM18yKG1hdDQgbSkge1xcbiAgICByZXR1cm4gbWF0NChtWzBdWzBdLCBtWzFdWzBdLCBtWzJdWzBdLCBtWzNdWzBdLFxcbiAgICAgICAgICAgICAgICBtWzBdWzFdLCBtWzFdWzFdLCBtWzJdWzFdLCBtWzNdWzFdLFxcbiAgICAgICAgICAgICAgICBtWzBdWzJdLCBtWzFdWzJdLCBtWzJdWzJdLCBtWzNdWzJdLFxcbiAgICAgICAgICAgICAgICBtWzBdWzNdLCBtWzFdWzNdLCBtWzJdWzNdLCBtWzNdWzNdKTtcXG59XFxuXFxuXFxuXFxuXFxuLyoqXFxuICogQ29udmVydHMgdmVydGV4IGZyb20gbW9kZWxzcGFjZSB0byBzY3JlZW5zcGFjZSB1c2luZyB0cmFuc2Zvcm1cXG4gKiBpbmZvcm1hdGlvbiBmcm9tIGNvbnRleHQuXFxuICpcXG4gKiBAbWV0aG9kIGFwcGx5VHJhbnNmb3JtXFxuICogQHByaXZhdGVcXG4gKlxcbiAqXFxuICovXFxuXFxudmVjNCBhcHBseVRyYW5zZm9ybSh2ZWM0IHBvcykge1xcbiAgICAvL1RPRE86IG1vdmUgdGhpcyBtdWx0aXBsaWNhdGlvbiB0byBhcHBsaWNhdGlvbiBjb2RlLiBcXG5cXG4gICAgLyoqXFxuICAgICAqIEN1cnJlbnRseSBtdWx0aXBsaWVkIGluIHRoZSB2ZXJ0ZXggc2hhZGVyIHRvIGF2b2lkIGNvbnN1bWluZyB0aGUgY29tcGxleGl0eSBvZiBob2xkaW5nIGFuIGFkZGl0aW9uYWxcXG4gICAgICogdHJhbnNmb3JtIGFzIHN0YXRlIG9uIHRoZSBtZXNoIG9iamVjdCBpbiBXZWJHTFJlbmRlcmVyLiBNdWx0aXBsaWVzIHRoZSBvYmplY3QncyB0cmFuc2Zvcm1hdGlvbiBmcm9tIG9iamVjdCBzcGFjZVxcbiAgICAgKiB0byB3b3JsZCBzcGFjZSB3aXRoIGl0cyB0cmFuc2Zvcm1hdGlvbiBmcm9tIHdvcmxkIHNwYWNlIHRvIGV5ZSBzcGFjZS5cXG4gICAgICovXFxuICAgIG1hdDQgTVZNYXRyaXggPSB1X3ZpZXcgKiB1X3RyYW5zZm9ybTtcXG5cXG4gICAgLy9UT0RPOiBtb3ZlIHRoZSBvcmlnaW4sIHNpemVTY2FsZSBhbmQgeSBheGlzIGludmVyc2lvbiB0byBhcHBsaWNhdGlvbiBjb2RlIGluIG9yZGVyIHRvIGFtb3J0aXplIHJlZHVuZGFudCBwZXItdmVydGV4IGNhbGN1bGF0aW9ucy5cXG5cXG4gICAgLyoqXFxuICAgICAqIFRoZSB0cmFuc2Zvcm0gdW5pZm9ybSBzaG91bGQgYmUgY2hhbmdlZCB0byB0aGUgcmVzdWx0IG9mIHRoZSB0cmFuc2Zvcm1hdGlvbiBjaGFpbjpcXG4gICAgICpcXG4gICAgICogdmlldyAqIG1vZGVsVHJhbnNmb3JtICogaW52ZXJ0WUF4aXMgKiBzaXplU2NhbGUgKiBvcmlnaW5cXG4gICAgICpcXG4gICAgICogd2hpY2ggY291bGQgYmUgc2ltcGxpZmllZCB0bzpcXG4gICAgICpcXG4gICAgICogdmlldyAqIG1vZGVsVHJhbnNmb3JtICogY29udmVydFRvRE9NU3BhY2VcXG4gICAgICpcXG4gICAgICogd2hlcmUgY29udmVydFRvRE9NU3BhY2UgcmVwcmVzZW50cyB0aGUgdHJhbnNmb3JtIG1hdHJpeDpcXG4gICAgICpcXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICBzaXplLnggMCAgICAgICAwICAgICAgIHNpemUueCBcXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAwICAgICAgLXNpemUueSAwICAgICAgIHNpemUueVxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIDAgICAgICAwICAgICAgIDEgICAgICAgMFxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIDAgICAgICAwICAgICAgIDAgICAgICAgMVxcbiAgICAgKlxcbiAgICAgKi9cXG5cXG4gICAgLyoqXFxuICAgICAqIEFzc3VtaW5nIGEgdW5pdCB2b2x1bWUsIG1vdmVzIHRoZSBvYmplY3Qgc3BhY2Ugb3JpZ2luIFswLCAwLCAwXSB0byB0aGUgXFxcInRvcCBsZWZ0XFxcIiBbMSwgLTEsIDBdLCB0aGUgRE9NIHNwYWNlIG9yaWdpbi5cXG4gICAgICogTGF0ZXIgaW4gdGhlIHRyYW5zZm9ybWF0aW9uIGNoYWluLCB0aGUgcHJvamVjdGlvbiB0cmFuc2Zvcm0gbmVnYXRlcyB0aGUgcmlnaWRib2R5IHRyYW5zbGF0aW9uLlxcbiAgICAgKiBFcXVpdmFsZW50IHRvIChidXQgbXVjaCBmYXN0ZXIgdGhhbikgbXVsdGlwbHlpbmcgYSB0cmFuc2xhdGlvbiBtYXRyaXggXFxcIm9yaWdpblxcXCJcXG4gICAgICpcXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAxIDAgMCAxIFxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIDAgMSAwIC0xXFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgMCAwIDEgMFxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIDAgMCAwIDFcXG4gICAgICpcXG4gICAgICogaW4gdGhlIHRyYW5zZm9ybSBjaGFpbjogcHJvamVjdGlvbiAqIHZpZXcgKiBtb2RlbFRyYW5zZm9ybSAqIGludmVydFlBeGlzICogc2l6ZVNjYWxlICogb3JpZ2luICogcG9zaXRpb25WZWN0b3IuXFxuICAgICAqL1xcbiAgICBwb3MueCArPSAxLjA7XFxuICAgIHBvcy55IC09IDEuMDtcXG5cXG4gICAgLyoqXFxuICAgICAqIEFzc3VtaW5nIGEgdW5pdCB2b2x1bWUsIHNjYWxlcyBhbiBvYmplY3QgdG8gdGhlIGFtb3VudCBvZiBwaXhlbHMgaW4gdGhlIHNpemUgdW5pZm9ybSB2ZWN0b3IncyBzcGVjaWZpZWQgZGltZW5zaW9ucy5cXG4gICAgICogTGF0ZXIgaW4gdGhlIHRyYW5zZm9ybWF0aW9uIGNoYWluLCB0aGUgcHJvamVjdGlvbiB0cmFuc2Zvcm0gdHJhbnNmb3JtcyB0aGUgcG9pbnQgaW50byBjbGlwIHNwYWNlIGJ5IHNjYWxpbmdcXG4gICAgICogYnkgdGhlIGludmVyc2Ugb2YgdGhlIGNhbnZhcycgcmVzb2x1dGlvbi5cXG4gICAgICogRXF1aXZhbGVudCB0byAoYnV0IG11Y2ggZmFzdGVyIHRoYW4pIG11bHRpcGx5aW5nIGEgc2NhbGUgbWF0cml4IFxcXCJzaXplU2NhbGVcXFwiXFxuICAgICAqXFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZS54IDAgICAgICAwICAgICAgMCBcXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAwICAgICAgc2l6ZS55IDAgICAgICAwXFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgMCAgICAgIDAgICAgICBzaXplLnogMFxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIDAgICAgICAwICAgICAgMCAgICAgIDFcXG4gICAgICpcXG4gICAgICogaW4gdGhlIHRyYW5zZm9ybSBjaGFpbjogcHJvamVjdGlvbiAqIHZpZXcgKiBtb2RlbFRyYW5zZm9ybSAqIGludmVydFlBeGlzICogc2l6ZVNjYWxlICogb3JpZ2luICogcG9zaXRpb25WZWN0b3IuXFxuICAgICAqL1xcbiAgICBwb3MueHl6ICo9IHVfc2l6ZSAqIDAuNTtcXG5cXG4gICAgLyoqXFxuICAgICAqIEludmVydHMgdGhlIG9iamVjdCBzcGFjZSdzIHkgYXhpcyBpbiBvcmRlciB0byBtYXRjaCBET00gc3BhY2UgY29udmVudGlvbnMuIFxcbiAgICAgKiBMYXRlciBpbiB0aGUgdHJhbnNmb3JtYXRpb24gY2hhaW4sIHRoZSBwcm9qZWN0aW9uIHRyYW5zZm9ybSByZWludmVydHMgdGhlIHkgYXhpcyB0byBjb252ZXJ0IHRvIGNsaXAgc3BhY2UuXFxuICAgICAqIEVxdWl2YWxlbnQgdG8gKGJ1dCBtdWNoIGZhc3RlciB0aGFuKSBtdWx0aXBseWluZyBhIHNjYWxlIG1hdHJpeCBcXFwiaW52ZXJ0WUF4aXNcXFwiXFxuICAgICAqXFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgMSAwIDAgMCBcXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAwIC0xIDAgMFxcbiAgICAgKiAgICAgICAgICAgICAgICAgICAgICAgICAgIDAgMCAxIDBcXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAwIDAgMCAxXFxuICAgICAqXFxuICAgICAqIGluIHRoZSB0cmFuc2Zvcm0gY2hhaW46IHByb2plY3Rpb24gKiB2aWV3ICogbW9kZWxUcmFuc2Zvcm0gKiBpbnZlcnRZQXhpcyAqIHNpemVTY2FsZSAqIG9yaWdpbiAqIHBvc2l0aW9uVmVjdG9yLlxcbiAgICAgKi9cXG4gICAgcG9zLnkgKj0gLTEuMDtcXG5cXG4gICAgLyoqXFxuICAgICAqIEV4cG9ydGluZyB0aGUgdmVydGV4J3MgcG9zaXRpb24gYXMgYSB2YXJ5aW5nLCBpbiBET00gc3BhY2UsIHRvIGJlIHVzZWQgZm9yIGxpZ2h0aW5nIGNhbGN1bGF0aW9ucy4gVGhpcyBoYXMgdG8gYmUgaW4gRE9NIHNwYWNlXFxuICAgICAqIHNpbmNlIGxpZ2h0IHBvc2l0aW9uIGFuZCBkaXJlY3Rpb24gaXMgZGVyaXZlZCBmcm9tIHRoZSBzY2VuZSBncmFwaCwgY2FsY3VsYXRlZCBpbiBET00gc3BhY2UuXFxuICAgICAqL1xcblxcbiAgICB2X3Bvc2l0aW9uID0gKE1WTWF0cml4ICogcG9zKS54eXo7XFxuXFxuICAgIC8qKlxcbiAgICAqIEV4cG9ydGluZyB0aGUgZXllIHZlY3RvciAoYSB2ZWN0b3IgZnJvbSB0aGUgY2VudGVyIG9mIHRoZSBzY3JlZW4pIGFzIGEgdmFyeWluZywgdG8gYmUgdXNlZCBmb3IgbGlnaHRpbmcgY2FsY3VsYXRpb25zLlxcbiAgICAqIEluIGNsaXAgc3BhY2UgZGVyaXZpbmcgdGhlIGV5ZSB2ZWN0b3IgaXMgYSBtYXR0ZXIgb2Ygc2ltcGx5IHRha2luZyB0aGUgaW52ZXJzZSBvZiB0aGUgcG9zaXRpb24sIGFzIHRoZSBwb3NpdGlvbiBpcyBhIHZlY3RvclxcbiAgICAqIGZyb20gdGhlIGNlbnRlciBvZiB0aGUgc2NyZWVuLiBIb3dldmVyLCBzaW5jZSBvdXIgcG9pbnRzIGFyZSByZXByZXNlbnRlZCBpbiBET00gc3BhY2UsXFxuICAgICogdGhlIHBvc2l0aW9uIGlzIGEgdmVjdG9yIGZyb20gdGhlIHRvcCBsZWZ0IGNvcm5lciBvZiB0aGUgc2NyZWVuLCBzbyBzb21lIGFkZGl0aW9uYWwgbWF0aCBpcyBuZWVkZWQgKHNwZWNpZmljYWxseSwgc3VidHJhY3RpbmdcXG4gICAgKiB0aGUgcG9zaXRpb24gZnJvbSB0aGUgY2VudGVyIG9mIHRoZSBzY3JlZW4sIGkuZS4gaGFsZiB0aGUgcmVzb2x1dGlvbiBvZiB0aGUgY2FudmFzKS5cXG4gICAgKi9cXG5cXG4gICAgdl9leWVWZWN0b3IgPSAodV9yZXNvbHV0aW9uICogMC41KSAtIHZfcG9zaXRpb247XFxuXFxuICAgIC8qKlxcbiAgICAgKiBUcmFuc2Zvcm1pbmcgdGhlIHBvc2l0aW9uIChjdXJyZW50bHkgcmVwcmVzZW50ZWQgaW4gZG9tIHNwYWNlKSBpbnRvIHZpZXcgc3BhY2UgKHdpdGggb3VyIGRvbSBzcGFjZSB2aWV3IHRyYW5zZm9ybSlcXG4gICAgICogYW5kIHRoZW4gcHJvamVjdGluZyB0aGUgcG9pbnQgaW50byByYXN0ZXIgYm90aCBieSBhcHBseWluZyBhIHBlcnNwZWN0aXZlIHRyYW5zZm9ybWF0aW9uIGFuZCBjb252ZXJ0aW5nIHRvIGNsaXAgc3BhY2VcXG4gICAgICogKHRoZSBwZXJzcGVjdGl2ZSBtYXRyaXggaXMgYSBjb21iaW5hdGlvbiBvZiBib3RoIHRyYW5zZm9ybWF0aW9ucywgdGhlcmVmb3JlIGl0J3MgcHJvYmFibHkgbW9yZSBhcHQgdG8gcmVmZXIgdG8gaXQgYXMgYVxcbiAgICAgKiBwcm9qZWN0aW9uIHRyYW5zZm9ybSkuXFxuICAgICAqL1xcblxcbiAgICBwb3MgPSB1X3BlcnNwZWN0aXZlICogTVZNYXRyaXggKiBwb3M7XFxuXFxuICAgIHJldHVybiBwb3M7XFxufVxcblxcbi8qKlxcbiAqIFBsYWNlaG9sZGVyIGZvciBwb3NpdGlvbk9mZnNldCBjaHVua3MgdG8gYmUgdGVtcGxhdGVkIGluLlxcbiAqIFVzZWQgZm9yIG1lc2ggZGVmb3JtYXRpb24uXFxuICpcXG4gKiBAbWV0aG9kIGNhbGN1bGF0ZU9mZnNldFxcbiAqIEBwcml2YXRlXFxuICpcXG4gKlxcbiAqL1xcbiN2ZXJ0X2RlZmluaXRpb25zXFxudmVjMyBjYWxjdWxhdGVPZmZzZXQodmVjMyBJRCkge1xcbiAgICAjdmVydF9hcHBsaWNhdGlvbnNcXG4gICAgcmV0dXJuIHZlYzMoMC4wKTtcXG59XFxuXFxuLyoqXFxuICogV3JpdGVzIHRoZSBwb3NpdGlvbiBvZiB0aGUgdmVydGV4IG9udG8gdGhlIHNjcmVlbi5cXG4gKiBQYXNzZXMgdGV4dHVyZSBjb29yZGluYXRlIGFuZCBub3JtYWwgYXR0cmlidXRlcyBhcyB2YXJ5aW5nc1xcbiAqIGFuZCBwYXNzZXMgdGhlIHBvc2l0aW9uIGF0dHJpYnV0ZSB0aHJvdWdoIHBvc2l0aW9uIHBpcGVsaW5lLlxcbiAqXFxuICogQG1ldGhvZCBtYWluXFxuICogQHByaXZhdGVcXG4gKlxcbiAqXFxuICovXFxudm9pZCBtYWluKCkge1xcbiAgICB2X3RleHR1cmVDb29yZGluYXRlID0gYV90ZXhDb29yZDtcXG4gICAgdmVjMyBpbnZlcnRlZE5vcm1hbHMgPSBhX25vcm1hbHMgKyAodV9ub3JtYWxzLnggPCAwLjAgPyBjYWxjdWxhdGVPZmZzZXQodV9ub3JtYWxzKSAqIDIuMCAtIDEuMCA6IHZlYzMoMC4wKSk7XFxuICAgIGludmVydGVkTm9ybWFscy55ICo9IC0xLjA7XFxuICAgIHZfbm9ybWFsID0gdHJhbnNwb3NlXzNfMihtYXQzKGludmVyc2VfMl8xKHVfdHJhbnNmb3JtKSkpICogaW52ZXJ0ZWROb3JtYWxzO1xcbiAgICB2ZWMzIG9mZnNldFBvcyA9IGFfcG9zICsgY2FsY3VsYXRlT2Zmc2V0KHVfcG9zaXRpb25PZmZzZXQpO1xcbiAgICBnbF9Qb3NpdGlvbiA9IGFwcGx5VHJhbnNmb3JtKHZlYzQob2Zmc2V0UG9zLCAxLjApKTtcXG59XFxuXCIsXG4gICAgZnJhZ21lbnQ6IFwiI2RlZmluZSBHTFNMSUZZIDFcXG5cXG4vKipcXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcXG4gKiBcXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxcbiAqIFxcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcXG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcXFwiU29mdHdhcmVcXFwiKSwgdG8gZGVhbFxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXFxuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcXG4gKiBcXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxcbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxcbiAqIFxcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcXFwiQVMgSVNcXFwiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXFxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXFxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxcbiAqIFRIRSBTT0ZUV0FSRS5cXG4gKi9cXG5cXG4vKipcXG4gKiBUaGUgTUlUIExpY2Vuc2UgKE1JVClcXG4gKiBcXG4gKiBDb3B5cmlnaHQgKGMpIDIwMTUgRmFtb3VzIEluZHVzdHJpZXMgSW5jLlxcbiAqIFxcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcXG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcXFwiU29mdHdhcmVcXFwiKSwgdG8gZGVhbFxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXFxuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcXG4gKiBcXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxcbiAqIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxcbiAqIFxcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcXFwiQVMgSVNcXFwiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXFxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXFxuICogQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTlxcbiAqIFRIRSBTT0ZUV0FSRS5cXG4gKi9cXG5cXG4vKipcXG4gKiBQbGFjZWhvbGRlciBmb3IgZnJhZ21lbnRTaGFkZXIgIGNodW5rcyB0byBiZSB0ZW1wbGF0ZWQgaW4uXFxuICogVXNlZCBmb3Igbm9ybWFsIG1hcHBpbmcsIGdsb3NzIG1hcHBpbmcgYW5kIGNvbG9ycy5cXG4gKiBcXG4gKiBAbWV0aG9kIGFwcGx5TWF0ZXJpYWxcXG4gKiBAcHJpdmF0ZVxcbiAqXFxuICpcXG4gKi9cXG5cXG4jZmxvYXRfZGVmaW5pdGlvbnNcXG5mbG9hdCBhcHBseU1hdGVyaWFsXzFfMChmbG9hdCBJRCkge1xcbiAgICAjZmxvYXRfYXBwbGljYXRpb25zXFxuICAgIHJldHVybiAxLjtcXG59XFxuXFxuI3ZlYzNfZGVmaW5pdGlvbnNcXG52ZWMzIGFwcGx5TWF0ZXJpYWxfMV8wKHZlYzMgSUQpIHtcXG4gICAgI3ZlYzNfYXBwbGljYXRpb25zXFxuICAgIHJldHVybiB2ZWMzKDApO1xcbn1cXG5cXG4jdmVjNF9kZWZpbml0aW9uc1xcbnZlYzQgYXBwbHlNYXRlcmlhbF8xXzAodmVjNCBJRCkge1xcbiAgICAjdmVjNF9hcHBsaWNhdGlvbnNcXG5cXG4gICAgcmV0dXJuIHZlYzQoMCk7XFxufVxcblxcblxcblxcbi8qKlxcbiAqIFRoZSBNSVQgTGljZW5zZSAoTUlUKVxcbiAqIFxcbiAqIENvcHlyaWdodCAoYykgMjAxNSBGYW1vdXMgSW5kdXN0cmllcyBJbmMuXFxuICogXFxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFxcXCJTb2Z0d2FyZVxcXCIpLCB0byBkZWFsXFxuICogaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0c1xcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcXG4gKiBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxcbiAqIFxcbiAqIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXFxuICogYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXFxuICogXFxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFxcXCJBUyBJU1xcXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcXG4gKiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXFxuICogTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSxcXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOXFxuICogVEhFIFNPRlRXQVJFLlxcbiAqL1xcblxcbi8qKlxcbiAqIENhbGN1bGF0ZXMgdGhlIGludGVuc2l0eSBvZiBsaWdodCBvbiBhIHN1cmZhY2UuXFxuICpcXG4gKiBAbWV0aG9kIGFwcGx5TGlnaHRcXG4gKiBAcHJpdmF0ZVxcbiAqXFxuICovXFxudmVjNCBhcHBseUxpZ2h0XzJfMShpbiB2ZWM0IGJhc2VDb2xvciwgaW4gdmVjMyBub3JtYWwsIGluIHZlYzQgZ2xvc3NpbmVzcywgaW50IG51bUxpZ2h0cywgdmVjMyBhbWJpZW50Q29sb3IsIHZlYzMgZXllVmVjdG9yLCBtYXQ0IGxpZ2h0UG9zaXRpb24sIG1hdDQgbGlnaHRDb2xvciwgdmVjMyB2X3Bvc2l0aW9uKSB7XFxuICAgIHZlYzMgZGlmZnVzZSA9IHZlYzMoMC4wKTtcXG4gICAgYm9vbCBoYXNHbG9zc2luZXNzID0gZ2xvc3NpbmVzcy5hID4gMC4wO1xcbiAgICBib29sIGhhc1NwZWN1bGFyQ29sb3IgPSBsZW5ndGgoZ2xvc3NpbmVzcy5yZ2IpID4gMC4wO1xcblxcbiAgICBmb3IoaW50IGkgPSAwOyBpIDwgNDsgaSsrKSB7XFxuICAgICAgICBpZiAoaSA+PSBudW1MaWdodHMpIGJyZWFrO1xcbiAgICAgICAgdmVjMyBsaWdodERpcmVjdGlvbiA9IG5vcm1hbGl6ZShsaWdodFBvc2l0aW9uW2ldLnh5eiAtIHZfcG9zaXRpb24pO1xcbiAgICAgICAgZmxvYXQgbGFtYmVydGlhbiA9IG1heChkb3QobGlnaHREaXJlY3Rpb24sIG5vcm1hbCksIDAuMCk7XFxuXFxuICAgICAgICBpZiAobGFtYmVydGlhbiA+IDAuMCkge1xcbiAgICAgICAgICAgIGRpZmZ1c2UgKz0gbGlnaHRDb2xvcltpXS5yZ2IgKiBiYXNlQ29sb3IucmdiICogbGFtYmVydGlhbjtcXG4gICAgICAgICAgICBpZiAoaGFzR2xvc3NpbmVzcykge1xcbiAgICAgICAgICAgICAgICB2ZWMzIGhhbGZWZWN0b3IgPSBub3JtYWxpemUobGlnaHREaXJlY3Rpb24gKyBleWVWZWN0b3IpO1xcbiAgICAgICAgICAgICAgICBmbG9hdCBzcGVjdWxhcldlaWdodCA9IHBvdyhtYXgoZG90KGhhbGZWZWN0b3IsIG5vcm1hbCksIDAuMCksIGdsb3NzaW5lc3MuYSk7XFxuICAgICAgICAgICAgICAgIHZlYzMgc3BlY3VsYXJDb2xvciA9IGhhc1NwZWN1bGFyQ29sb3IgPyBnbG9zc2luZXNzLnJnYiA6IGxpZ2h0Q29sb3JbaV0ucmdiO1xcbiAgICAgICAgICAgICAgICBkaWZmdXNlICs9IHNwZWN1bGFyQ29sb3IgKiBzcGVjdWxhcldlaWdodCAqIGxhbWJlcnRpYW47XFxuICAgICAgICAgICAgfVxcbiAgICAgICAgfVxcblxcbiAgICB9XFxuXFxuICAgIHJldHVybiB2ZWM0KGFtYmllbnRDb2xvciArIGRpZmZ1c2UsIGJhc2VDb2xvci5hKTtcXG59XFxuXFxuXFxuXFxuXFxuXFxuLyoqXFxuICogV3JpdGVzIHRoZSBjb2xvciBvZiB0aGUgcGl4ZWwgb250byB0aGUgc2NyZWVuXFxuICpcXG4gKiBAbWV0aG9kIG1haW5cXG4gKiBAcHJpdmF0ZVxcbiAqXFxuICpcXG4gKi9cXG52b2lkIG1haW4oKSB7XFxuICAgIHZlYzQgbWF0ZXJpYWwgPSB1X2Jhc2VDb2xvci5yID49IDAuMCA/IHVfYmFzZUNvbG9yIDogYXBwbHlNYXRlcmlhbF8xXzAodV9iYXNlQ29sb3IpO1xcblxcbiAgICAvKipcXG4gICAgICogQXBwbHkgbGlnaHRzIG9ubHkgaWYgZmxhdCBzaGFkaW5nIGlzIGZhbHNlXFxuICAgICAqIGFuZCBhdCBsZWFzdCBvbmUgbGlnaHQgaXMgYWRkZWQgdG8gdGhlIHNjZW5lXFxuICAgICAqL1xcbiAgICBib29sIGxpZ2h0c0VuYWJsZWQgPSAodV9mbGF0U2hhZGluZyA9PSAwLjApICYmICh1X251bUxpZ2h0cyA+IDAuMCB8fCBsZW5ndGgodV9hbWJpZW50TGlnaHQpID4gMC4wKTtcXG5cXG4gICAgdmVjMyBub3JtYWwgPSBub3JtYWxpemUodl9ub3JtYWwpO1xcbiAgICB2ZWM0IGdsb3NzaW5lc3MgPSB1X2dsb3NzaW5lc3MueCA8IDAuMCA/IGFwcGx5TWF0ZXJpYWxfMV8wKHVfZ2xvc3NpbmVzcykgOiB1X2dsb3NzaW5lc3M7XFxuXFxuICAgIHZlYzQgY29sb3IgPSBsaWdodHNFbmFibGVkID9cXG4gICAgYXBwbHlMaWdodF8yXzEobWF0ZXJpYWwsIG5vcm1hbGl6ZSh2X25vcm1hbCksIGdsb3NzaW5lc3MsXFxuICAgICAgICAgICAgICAgaW50KHVfbnVtTGlnaHRzKSxcXG4gICAgICAgICAgICAgICB1X2FtYmllbnRMaWdodCAqIHVfYmFzZUNvbG9yLnJnYixcXG4gICAgICAgICAgICAgICBub3JtYWxpemUodl9leWVWZWN0b3IpLFxcbiAgICAgICAgICAgICAgIHVfbGlnaHRQb3NpdGlvbixcXG4gICAgICAgICAgICAgICB1X2xpZ2h0Q29sb3IsICAgXFxuICAgICAgICAgICAgICAgdl9wb3NpdGlvbilcXG4gICAgOiBtYXRlcmlhbDtcXG5cXG4gICAgZ2xfRnJhZ0NvbG9yID0gY29sb3I7XFxuICAgIGdsX0ZyYWdDb2xvci5hICo9IHVfb3BhY2l0eTsgICBcXG59XFxuXCJcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc2hhZGVycztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIFJlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AgPSByZXF1aXJlKCdmYW1vdXMvcmVuZGVyLWxvb3BzL1JlcXVlc3RBbmltYXRpb25GcmFtZUxvb3AnKTtcblxuZnVuY3Rpb24gU29ja2V0TG9vcChob3N0KSB7XG4gICAgdGhpcy5fdXBkYXRlYWJsZXMgPSBbXTtcbiAgICB0aGlzLl9zb2NrZXQgPSBpby5jb25uZWN0KGhvc3QpO1xuXG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB0aGlzLl9zb2NrZXQub24oJ2ZyYW1lJywgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBfdGhpcy5fdXBkYXRlYWJsZXMubGVuZ3RoOyBpKyspXG4gICAgICAgICAgICBfdGhpcy5fdXBkYXRlYWJsZXNbaV0udXBkYXRlKGRhdGEudGltZXN0YW1wKTtcbiAgICB9KTtcbn1cblxuU29ja2V0TG9vcC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24odXBkYXRlYWJsZSkge1xuICAgIHRoaXMuX3VwZGF0ZWFibGVzLnB1c2godXBkYXRlYWJsZSk7XG59O1xuXG5Tb2NrZXRMb29wLnByb3RvdHlwZS5ub0xvbmdlclVwZGF0ZSA9IGZ1bmN0aW9uKHVwZGF0ZWFibGUpIHtcbiAgICB2YXIgaW5kZXggPSB0aGlzLl91cGRhdGVhYmxlcy5pbmRleE9mKHVwZGF0ZWFibGUpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHRoaXMuX3VwZGF0ZWFibGVzLnNwbGljZShpbmRleCwgMSk7XG59O1xuXG5Tb2NrZXRMb29wLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge307XG5Tb2NrZXRMb29wLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBTb2NrZXRMb29wO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgQ29tcG9zaXRvciA9IHJlcXVpcmUoJ2ZhbW91cy9yZW5kZXJlcnMvQ29tcG9zaXRvcicpO1xudmFyIFVJTWFuYWdlciA9IHJlcXVpcmUoJ2ZhbW91cy9yZW5kZXJlcnMvVUlNYW5hZ2VyJyk7XG52YXIgU29ja2V0TG9vcCA9IHJlcXVpcmUoJy4vU29ja2V0TG9vcCcpO1xuXG5cblxuXG5cbi8vIEJvaWxlcnBsYXRlXG5uZXcgVUlNYW5hZ2VyKFxuICAgIG5ldyBXb3JrZXIoJ3dvcmtlci5idW5kbGUuanMnKSxcbiAgICBuZXcgQ29tcG9zaXRvcigpLFxuICAgIG5ldyBTb2NrZXRMb29wKCdodHRwOi8vbG9jYWxob3N0OjE2MTknKVxuKTtcbiJdfQ==
