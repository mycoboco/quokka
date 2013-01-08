/*
 *  common utilities
 */

var assert = require('assert');

var _ = require('../../node_modules/underscore');

var global = exports;


// adds method to constructor
Function.prototype.method = function (name, func) {
    this.prototype[name] = func;
    Object.defineProperty(this.prototype, name, { enumerable: false });
    return this;
};


// makes the method property unenumerable
Object.defineProperty(Function.prototype, 'method', { enumerable: false });


// runs closure for each property
Object.method('foreach', function (closure, memo) {
    var i,
        keys = Object.keys(this);

    for (i = 0; i < keys.length; i++)
        memo = closure.call(this, keys[i], memo);

    return memo;
});


// clone from underscore.js copies properties from prototype link
Object.method('clone', function () {
    return this.foreach(function (key, memo) {
        memo[key] = this[key];
        return memo;
    }, {});
});


// extend from underscore.js merges properties from prototype link
Object.method('merge', function (obj) {
    var that = this;

    obj.foreach(function (key) {
        that[key] = this[key];
    });

    return that;
});


// processes an array
Array.method('process', function (closure) {
    for (var i = 0; i < this.length; i++)
        this[i] = closure.call(this, this[i], i);

    return this;
});


// composes a new array by collecting elements
Array.method('collect', function (name) {
    var i, r = [];

    for (i = 0; i < this.length; i++)
        r.push(this[i][name]);

    return r;
});


// truncates to integer
Number.method('integer', function () {
    return Math[(this < 0)? 'ceil': 'floor'](this);
});


// replaceAll from string.js does not work for regex-like strings
String.method('replaceNew', function (str1, str2, opt) {
    return this.replace(new RegExp(
                            str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),
                            ((opt && opt.all)? 'g': '') + ((opt && opt.ignore)? 'i': '')),
                        (typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
});


// makes a string have title case
String.method('toTitleCase', function () {
    return this.replace(/\w[^_\s\.\-]*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
});


// gets extension of file name
// name = 'base name'
// n = max length of extension
global.extension = function (name, n) {
    var i;

    assert(_.isString(name));
    assert(_.isUndefined(n) || _.isFinite(n));

    i = name.lastIndexOf('.');
    if (i < 0 || i === 0 || (n > -1 && name.length-i-1 > n))
        i = name.length;

    return [ name.substring(0, i), name.substring(i) ];
};


// inserts text into name according to opt
// name = 'base name'
// text = 'text to insert'
// opt = { func: 'function name', keephid: boolean, skipext: boolean, at: position number,
//         reverse: boolean, after: 'text', before: 'text' }
global.insert = function (name, text, opt) {
    var fset = {
        prefix: function () {
            assert(_.isString(name));

            if (opt.keephid && name.charAt(0) === '.')
                return '.' + text + name.substring(1);
            else
                return text + name;
        },
        suffix: function () {
            assert(_.isString(name));

            if (opt.skipext) {
                var r = global.extension(name);
                return r[0] + text + r[1];
            } else
               return name + text;
        },
        at: function () {
            var r, at;

            assert(_.isString(name));
            assert(_.isFinite(opt.at));

            r = (opt.skipext)? global.extension(name): [ name, '' ];
            at = (opt.reverse)? r[0].length - opt.at: opt.at;
            return r[0].substring(0, at) + text + r[0].substring(at) + r[1];
        },
        after: function () {
            assert(_.isString(name));
            assert(_.isString(opt.after));

            r = (opt.skipext)? global.extension(name): [ name, '' ];
            return r[0].replaceNew(opt.after, opt.after+text, { all: true }) + r[1];
        },
        before: function () {
            assert(_.isString(name));
            assert(_.isString(opt.before));

            r = (opt.skipext)? global.extension(name): [ name, '' ];
            return r[0].replaceNew(opt.before, text+opt.before, { all: true }) + r[1];
        }
    };

    assert(_.isString(name));
    assert(_.isString(text));
    assert(_.isObject(opt));
    assert(_.isFunction(fset[opt.func]));

    return fset[opt.func]();
};


// returns string for ordinal number
global.ordinal = function (n) {
    var m;

    assert(_.isFinite(n) && n > 0);
    m = (n > 20)? n % 10: n;

    return (m == 1)? n + 'st':
           (m == 2)? n + 'nd':
           (m == 3)? n + 'rd': n + 'th';
}

// end of global.js
