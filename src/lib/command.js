/*
 *  command set (for interaction with readline completer)
 */

var assert = require('assert');

var _ = require('../../node_modules/underscore');

var global = require('./global');


// manages command sets interacting with completer
// init = [ { name: 'name',
//            set: { 'command': { spec: [ 'token', ... ], func: function (param) {} },
//                   ... } }, ... ]
module.exports = function (init) {
    var stack = [], idx = 0;
    var flatten;

    // adds rules to the current top of stack
    // arr = [ { rule entry }, ... ]
    var add = function (arr) {
        if (_.isObject(arr))
            arr = [ arr ];
        assert(_.isArray(arr));

        flatten = null;
        if (!stack[idx])
            stack[idx] = {};
        for (var i = 0; i < arr.length; i++) {
            if (!stack[idx][arr[i].name])
                stack[idx][arr[i].name] = arr[i].set;
        }

        return this;
    };

    // removes named rules from the current top of stack
    // name = [ 'name', ... ]
    var remove = function (name) {
        if (_.isString(name))
            name = [ name ];
        assert(_.isArray(name));

        flatten = null;
        if (stack[idx])
            for (var i = 0; i < name.length; i++)
                delete stack[idx][name[i]];

        return this;
    };

    // gets an flattened array of commands
    var get = function () {
        if (flatten)
            return flatten;

        if (stack[idx])
            flatten = stack[idx].foreach(function (name, memo) {
                return memo.merge(this[name]);
            }, {});

        return flatten;
    };

    // finds a rule by command
    // c = 'command'
    var cmd = function (c) {
         assert(_.isString(c));
         return get()[c];
    };

    // pushes a new top with cloned command sets
    // init = [ { rule entry }, ... ]
    var push = function (init) {
        if (stack[idx]) {
            stack[idx+1] = stack[idx].clone();
            idx++;
            flatten = null;
        }
        if (init)
            add(init);

        return this;
    };

    // pops the current top
    var pop = function () {
        if (idx > 0) {
            stack.pop();
            idx--;
            flatten = null;
        }

        return this;
    };

    add(init);

    return {
        add:    add,
        remove: remove,
        get:    get,
        cmd:    cmd,
        push:   push,
        pop:    pop
    };
};

// end of command.js
