/*
 *  wrapper for colors.js
 */

var assert = require('assert');

var _ = require('../../node_modules/underscore');
var colors = require('../../node_modules/colors');

var global = require('./global');


// wrapper for colored messages
// theme = { 'nickname': { abbr: 'abbr char', color: 'color' } }
var mycolors = module.exports = function (theme) {
    var abbr = {},     // abbr to nickname
        color = {};    // nickname to color
    var regex = /%([a-z%])/g;

    // parses format string
    // c = 'nickname' or 'color'
    // m = 'format string'
    var _parse = function (c, m) {
        var r = '',
            s = 0,
            arg = 2;

        assert(_.isString(m));
        assert(!_.isUndefined(m[c]));

        while ((match = regex.exec(m)) !== null) {
            assert(regex.lastIndex >= 2);
            r += m.substring(s, regex.lastIndex-2)[c];
            switch(match[1]) {
                case '%':
                    r += '%'[c];
                    break;
                case 's':    // cannot be override
                    r += (arguments[arg++]+'')[c];
                    break;
                default:
                    if (abbr[match[1]] && !_.isUndefined(arguments[arg]))
                        r += (arguments[arg++]+'')[abbr[match[1]]];
                    else
                        r += match[0][c];
            }
            s = regex.lastIndex;
        }
        r += m.substring(s, m.length)[c];

        return r;
    }

    // prints ordinary messages
    var out = function (m) {
        arguments = Array.prototype.slice.call(arguments);
        arguments.unshift('none');
        console.log(_parse.apply(null, arguments));
    };

    // prints ok messages
    var ok = function (m) {
        arguments = Array.prototype.slice.call(arguments);
        arguments.unshift('ok');
        console.log(_parse.apply(null, arguments));
    };

    // prints error message
    var err = function (m) {
        arguments = Array.prototype.slice.call(arguments);
        arguments.unshift('err');
        console.log(_parse.apply(null, arguments));
    };

    // prints warning message
    var warn = function (m) {
        arguments = Array.prototype.slice.call(arguments);
        arguments.unshift('warn');
        console.log(_parse.apply(null, arguments));
    };

    (function () {
        assert(theme);

        String.prototype.__defineGetter__('none', function () {
            return this;
        });

        theme.foreach(function (i) {
            assert(theme[i].color);
            assert(theme[i].abbr);
            assert(theme[i].abbr !== 's');
            assert(_.isUndefined(abbr[theme[i].abbr]));

            if (theme[i].color !== 'none')    // `none' handled here
                color[i] = theme[i].color;
            abbr[theme[i].abbr] = i;
        });

        colors.setTheme(color);
    })();

    return {
        out:  out,
        ok:   ok,
        err:  err,
        warn: warn
    };
};


/*
(function () {
    var mc = mycolors({
        'out':  { abbr: 'u', color: 'none' },
        'err':  { abbr: 'e', color: 'red' },
        'warn': { abbr: 'w', color: 'yellow' },
        'ok':   { abbr: 'o', color: 'green' },
        'rule': { abbr: 'r', color: 'blue' },
        'num':  { abbr: 'n', color: 'yellow' },
        'file': { abbr: 'f', color: 'magenta' },
        'prog': { abbr: 'p', color: 'rainbow' },
        'etc':  { abbr: 'x', color: 'grey' },
    });

    mc.out('out shows %r %n ...', 'rule', 42);
    mc.err('err shows %f %p !', 'file', 'program');
    mc.warn('warn shows %e %o ?', 'etc', 'ok');
    mc.ok('ok shows %w %u %%', 'warn', 'out');
    mc.out('not-assigned chars %q %z %', 'not printed');
    mc.err('%%s test: %s...', 'error message');
})();
*/

// end of mycolors.js
