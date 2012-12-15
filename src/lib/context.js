/*
 *  rule-editing context
 */

var assert = require('assert');

var _ = require('../../node_modules/underscore');


// manages context
module.exports = function () {
    var _empty = function () {    // for initial context
        var help = function () {};
        var commandSet = function () { return {}; }
        var affect = function (x) { return x; }
        var option = function () { return ''; }

        return {
            help:       help,
            commandSet: commandSet,
            affect:     affect,
            option:     option
        };
    };

    var emptyCtx = {
        name:     '',
        instance: _empty()
    };

    var cur = emptyCtx;

    // sets or unsets current context
    // ch = chain object
    // name = 'rule name'
    var set = function (ch, name) {
        if (!ch && !name) {    // unset
            if (cur === emptyCtx)
                return false;
            cur = emptyCtx;
            return true;
        } else {    // set
            assert(ch);
            assert(_.isString(name) && name);

            cur = {
                name:     name,
                instance: ch.rule(name)()
            };
            assert(cur.instance);
        }

        return this;
    };

    // checks if current context set
    var isSet = function () {
        return (cur !== emptyCtx);
    };

    // gets current context
    var current = function () {
        assert(cur);

        return cur;
    };

    // gets name of current context
    var name = function () {
        assert(_.isString(cur.name));

        return cur.name;
    };
    // prints help message of current context
    var help = function () {
        assert(_.isFunction(cur.instance.help));

        cur.instance.help();

        return this;
    };

    // gets command set of current context
    var commandSet = function () {
        assert(_.isFunction(cur.instance.commandSet));

        return cur.instance.commandSet();
    };

    return {
        set:        set,
        isSet:      isSet,
        current:    current,
        name:       name,
        help:       help,
        commandSet: commandSet
    };
};

// end of context.js
