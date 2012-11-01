/*
 *  common utilities
 */

var assert = require('assert');
var _ = require('../node_modules/underscore');


// add method to constructor
Function.prototype.method = function (name, func) {
    this.prototype[name] = func;
    return this;
};


// run closure for each property
Object.method('foreach', function (closure, init) {
    var i,
        memo = init,
        keys = Object.keys(this);

    for (i = 0; i < keys.length; i++)
        memo = closure.call(this, keys[i], memo);

    return memo;
});


// processes an array
Array.method('process', function (closure) {
    var i;

    for (i = 0; i < this.length; i++)
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
String.method('replaceAllNew', function(str1, str2, ignore)
{
    return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),
                                                (ignore?"gi":"g")),
                        (typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
});


// parses a quoted string
// x = 'string to parse'
exports.parseQStr = function (x) {
    var ns = /[\S]+/g,
        esc = /\\(['|"|\\])/g;
    var q, s, e;

    assert(_.isString(x));

    x = x.trim();

    if (!x)
        return [ '', '' ];
    else if (x.indexOf('\'') >= 0)
        q = '\'';
    else if (x.indexOf('"') >= 0)
        q = '"';
    if (!q)
        return [ ns.exec(x)[0], x.substring(ns.lastIndex) ];

    x = x.substring(1);    // skips quote
    s = 0;
    do {
        e = x.indexOf(q, s);
        if (e < 0) {
            err('closing %s is missing\n', q);
            return [ x, '' ];
        }
        s = e + 1;
    } while(x.charAt(e-1) === '\\');

    return [ x.substring(0, e).replace(esc, '$1'), x.substring(e+1) ];
};


// gets extension of file name
// name = 'base name'
// n = max length of extension
exports.extension = function (name, n) {
    var i;

    assert(_.isString(name));
    assert(_.isUndefined(n) || _.isFinite(n));

    i = name.lastIndexOf('.');
    if (i < 0 || i === 0 || (n > -1 && name.length-i-1 > n))
        i = name.length;

    return [ name.substring(0, i), name.substring(i) ];
};

// end of global.js
