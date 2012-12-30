/*
 *  command parser
 */

var assert = require('assert');

var _ = require('../../node_modules/underscore');

var global = require('./global');


// parses an input line
// cset = { 'command': { spec: [ ... ], func: function (param) {} }, ... }
// l = 'input line'
module.exports = function (cset, l) {
    var line = '', rule = {};

    var _endWithSpace = function (s) {
        var esc = false;

        for (var i = 0; i < s.length; i++)
            if (esc)
                esc = false;
            else if (s[i] === '\\')
                esc = true;
            else if (s[i] === ' ' && i === s.length-1)
                return true;
        return false;
    };

    var _parse = function (x) {
        var ns = /[\S]+[\s]*/g;
        var s, m;

        assert(_.isString(x));

        x = x.trimLeft();

        s = '';
        do {
            m = ns.exec(x);
            if (m === null)
                return [ (s)? s: null, '' ];
            s += m[0];
        } while (!_endWithSpace(m[0]));

        return [ s, x.substring(ns.lastIndex) ];
    };

    var _unesc = function (s) {
        var esc;

        for (var i = 0; i < s.length; i++)
            if (esc)
                esc = false;
            else if (s[i] === '\\')
                esc = true;
            else if (s[i] === ' ')
                break;
        s = s.substring(0, i);

        return s.replace(/(\\ )/g, ' ').replace(/\\\\/g, '\\');
    };

    // sets command set used for parsing
    // cset = command set
    var cmdset = function (cset) {
        var r, c;

        assert(_.isObject(cset));

        rule = {};
        cset.foreach(function (name) {
            r = rule;
            c = this[name].spec;
            for (var j = 0; j < c.length; j++) {
                if (!r[c[j]])
                    r[c[j]] = {};
                if (j < c.length - 1)
                    r = r[c[j]];
            }
            r[c[j-1]] = name;
        });

        return this;
    };

    // starts parsing with a new line
    // l = 'input line'
    var start = function (l) {
        assert(_.isString(l));
        line = l;

        return this;
    };

    // gets the next token
    var token = function () {
        var r = rule;
        var param = [];
        var w, ret, tw;

        w = _parse(line);
        ret = {
            last:   w[0],
            expect: 'cmd'
        };
        if (w[0])
            tw = w[0].trim();
        line = w[1];
        while (w[0] !== null && (r[tw] || r['$'] || r['#'] || r['*'])) {
            if (r[tw])
                r = r[tw];
            else {
                r = r['$'] || r['#'] || r['*'];
                param.push(_unesc(w[0]));
            }
            if (_endWithSpace(ret.last) || w[1]) {
                ret.expect = (r['$'])? 'param':
                             (r['#'])? 'number':
                             (r['*'])? 'file': 'cmd';
                if (ret.expect !== 'cmd' || _.isString(r))
                    ret.last = '';
            }
            if (_.isString(r)) {
                return ret.merge({
                    cmd:   r,
                    param: param
                });
            }
            w = _parse(line);
            if (w[0]) {
                ret.last += w[0];
                tw = w[0].trim();
            }
            line = w[1];
        }

        return ret;
    };

    line = l || '';
    if (cset)
        cmdset(cset);

    return {
        cmdset: cmdset,
        start:  start,
        token:  token
    };
};

// end of parser.js
