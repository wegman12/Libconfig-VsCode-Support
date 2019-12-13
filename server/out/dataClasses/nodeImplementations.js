'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class BaseLibConfigNodeImpl {
    constructor(offset, length, callbacks) {
        this.length = 0;
        this.offset = offset;
        this.length = length;
        if (callbacks)
            callbacks.map((value) => { BaseLibConfigNodeImpl.addErrorCallback; });
    }
    /**
     * Add a callback function which is called whenever an error occurs
     * @param func The callback function being added
     */
    static addErrorCallback(func) {
        this.errorCallbacks.push(func);
    }
    /**
     * Calls all callback functions with the necessary error information
     * @param errorInfo The error information for the call
     */
    static Error(errorInfo, start, length) {
        BaseLibConfigNodeImpl.errorCallbacks.map((value) => {
            value(errorInfo, start, length);
        });
    }
    toString() {
        return 'type: ' + this.type + ' (' + this.offset + '/' + this.length + ')' + (this.parent ? ' parent: {' + this.parent.toString() + '}' : '');
    }
}
/**
 * Error callback functions which are called whenever an error occurs
 */
BaseLibConfigNodeImpl.errorCallbacks = [];
exports.BaseLibConfigNodeImpl = BaseLibConfigNodeImpl;
class LibConfigPropertyNodeImpl extends BaseLibConfigNodeImpl {
    constructor(parent, offset, length, name, value) {
        super(offset, length);
        this.type = 'property';
        this.parent = parent;
        this.name = name;
        this.value = value;
    }
    /**
     * Implementation of function, logs a console error
     */
    addChild(child) {
        console.error('Trying to add child to property value');
    }
}
exports.LibConfigPropertyNodeImpl = LibConfigPropertyNodeImpl;
class ObjectLibConfigNodeImpl extends BaseLibConfigNodeImpl {
    constructor(parent, offset, length, properties, callbacks) {
        super(offset, length, callbacks);
        this.type = 'object';
        this._properties = [];
        this.parent = parent;
        this.addChildren(properties);
    }
    /**
     * Convenience function to add children to the property map
     *
     * @param children The children to be added
     */
    addChildren(children) {
        children.map((value) => {
            this.addChild(value);
        });
    }
    /**
     * Tries to add child to @_properties array
     *
     * @Error callbacks are executed if @child does not pass @validate
     *
     * @param child Child to add to the @_properties array
     */
    addChild(child) {
        if (!this.validate(child))
            return;
        this._properties.push(child);
    }
    /**
     * Verifies that the child can be added to @_properties
     *
     * @param child The child to validate
     */
    validate(child) {
        let invalid = false;
        this._properties.map((value, index, array) => {
            if (value.name === child.name) {
                let offset = child.offset;
                let length = child.length;
                BaseLibConfigNodeImpl.Error(`Duplicate properties with name '${value.name}' found!`, offset, length);
                invalid = true;
            }
        });
        return !invalid;
    }
    /**
     * Public getter to obtain properties from @_properties
     */
    get children() {
        return this._properties;
    }
}
exports.ObjectLibConfigNodeImpl = ObjectLibConfigNodeImpl;
class ListLibConfigNodeImpl extends BaseLibConfigNodeImpl {
    constructor(parent, offset, length, children, callbacks) {
        super(offset, length, callbacks);
        this.type = 'list';
        this._children = [];
        this.parent = parent;
        this.addChildren(children);
    }
    /**
     * Convenience function to add children to the property map
     *
     * @param children The children to be added
     */
    addChildren(children) {
        children.map((value) => {
            this.addChild(value);
        });
    }
    /**
     * Tries to add child to @_children array
     *
     * @Error callbacks are executed if @child does not pass @validate
     *
     * @param child Child to add to the @_children array
     */
    addChild(child) {
        if (!this.validate(child))
            return;
        this._children.push(child);
    }
    /**
     * Verifies that the child can be added to @_children
     *
     * @param child The child to validate
     */
    validate(child) {
        let invalid = false;
        return !invalid;
    }
    /**
     * Public getter to obtain properties from @_children
     */
    get children() {
        return this._children;
    }
}
exports.ListLibConfigNodeImpl = ListLibConfigNodeImpl;
class ArrayLibConfigNodeImpl extends BaseLibConfigNodeImpl {
    constructor(parent, offset, length, children, callbacks) {
        super(offset, length, callbacks);
        this.type = 'array';
        this._children = [];
        this.parent = parent;
        this.addChildren(children);
    }
    /**
     * Convenience function to add children to the property map
     *
     * @param children The children to be added
     */
    addChildren(children) {
        children.map((value) => {
            this.addChild(value);
        });
    }
    /**
     * Tries to add child to @_children array
     *
     * @Error callbacks are executed if @child does not pass @validate
     *
     * @param child Child to add to the @_children array
     */
    addChild(child) {
        if (!this.validate(child)) {
            BaseLibConfigNodeImpl.Error('Error adding child to list', child.offset, child.length);
            return;
        }
        this._children.push(child);
    }
    /**
     * Verifies that the child can be added to @_children
     *
     * @param child The child to validate
     */
    validate(child) {
        let invalid = false;
        let type = this._children.length > 0 ? this._children[0].type : child.type;
        if (type !== child.type) {
            BaseLibConfigNodeImpl.Error(`Array must have consistent type: first element type is '${type}'`, child.offset, child.length);
            invalid = true;
        }
        return !invalid;
    }
    /**
     * Public getter to obtain properties from @_children
     */
    get children() {
        return this._children;
    }
}
exports.ArrayLibConfigNodeImpl = ArrayLibConfigNodeImpl;
class ScalarLibConfigNodeImpl extends BaseLibConfigNodeImpl {
    constructor(parent, offset, length, callbacks) {
        super(offset, length, callbacks);
        this.parent = parent;
    }
    /**
     * Implementation of function, logs a console error
     */
    addChild(child) {
        console.error('Trying to add child to scalar value');
    }
    /**
     * Public getter to obtain properties from @_children
     */
    get children() {
        console.error('Trying to get children from scalar value');
        return [];
    }
}
exports.ScalarLibConfigNodeImpl = ScalarLibConfigNodeImpl;
class StringLibConfigNodeImpl extends ScalarLibConfigNodeImpl {
    constructor(parent, offset, length, value, callbacks) {
        super(parent, offset, length, callbacks);
        this.type = 'string';
        this.value = value;
        this.validate(value);
    }
    /**
     * Verifies that the child can be added to @_children
     *
     * @param child The child to validate
     */
    validate(value) {
        let invalid = false;
        return !invalid;
    }
}
exports.StringLibConfigNodeImpl = StringLibConfigNodeImpl;
class NumberLibConfigNodeImpl extends ScalarLibConfigNodeImpl {
    constructor(parent, offset, length, value, callbacks) {
        super(parent, offset, length, callbacks);
        this.type = 'number';
        this.value = value;
        this.validate(value);
    }
    get isInteger() {
        return this.value.toFixed(0) === this.value.toString();
    }
    /**
     * Verifies that the child can be added to @_children
     *
     * @param child The child to validate
     */
    validate(value) {
        let invalid = false;
        return !invalid;
    }
}
exports.NumberLibConfigNodeImpl = NumberLibConfigNodeImpl;
class BooelanLibConfigNodeImpl extends ScalarLibConfigNodeImpl {
    constructor(parent, offset, length, value, callbacks) {
        super(parent, offset, length, callbacks);
        this.type = 'boolean';
        this.value = value;
        this.validate(value);
    }
    /**
     * Verifies that the child can be added to @_children
     *
     * @param child The child to validate
     */
    validate(value) {
        let invalid = false;
        return !invalid;
    }
}
exports.BooelanLibConfigNodeImpl = BooelanLibConfigNodeImpl;
//# sourceMappingURL=nodeImplementations.js.map