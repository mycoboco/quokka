/*
 *  serialize rule
 */

var assert = require('assert');

var _ = require('./node_modules/underscore');
var string = require('./node_modules/string');

var global = require('./lib/global');

var parseQStr = global.parseQStr;


// rule for serialize
module.exports = function () {
    var cmdset;
    var opt = {    // default: start 1, step 1, as suffix
        start:   1,
        step:    1,
        func:    'suffix',
        skipext: true,
        pad:     1
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#serialize\' are:\n'.ok +
            '  start <N>                '.cmd + 'numbers will start with <N>\n' +
            '  step <M>                 '.cmd + 'numbers will go with a step of <M>\n' +
            '  after <WORD>             '.cmd + 'insert after every occurrence of <WORD>\n' +
            '  as prefix                '.cmd + 'prepend (default)\n' +
            '  as suffix                '.cmd + 'append\n' +
            '    skip extension         '.cmd + 'append before extensions (default)\n' +
            '    include extension      '.cmd + 'append after extensions\n' +
            '  at <N>                   '.cmd + 'insert after <N> characters\n' +
            '    left to right          '.cmd + 'count from left to right (default)\n' +
            '    right to left          '.cmd + 'count from right to left\n' +
            '  before <WORD>            '.cmd + 'insert before every occurrence of <WORD>\n' +
            '  pad <L>                  '.cmd + 'pad numbers to be <L>-digit\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _rule = function (name, n) {
        var m;

        m = (n < 0)? '-' + (Math.abs(n)+'').padLeft(opt.pad-1, '0').s:
                     (n+'').padLeft(opt.pad, '0').s;
        return global.insert(name, m, opt);
    };

    // applies the rule to file names
    // src = [ { dir: 'dir name', file: 'file name' }, ... ]
    var affect = function (src) {
        var n;
        var dst = [];

        assert(_.isArray(src));

        n = opt.start;
        for (var i = 0; i < src.length; i++, n += opt.step)
            dst.push({
                dir:  src[i].dir,
                file: _rule(src[i].file, n)
            });

        return dst;
    };

    // gets string to describe opts
    var option = function () {
        var where = function () {
            switch(opt.func) {
                case 'prefix':
                    return 'as ' + 'prefix'.val +
                           ((opt.keephid)? ' keeping'.val + ' hidden files'.val: '');
                case 'suffix':
                    return 'as ' + 'suffix'.val +
                           ((opt.skipext)? ' skipping'.val: ' including'.val) + ' extensions';
                case 'at':
                    return 'at ' + (''+opt.at).val +
                           ((opt.reverse)? ' counting ' + 'from right to left'.val: '');
                case 'after':
                    return 'after `' + opt.after.val + '\'';
                case 'before':
                    return 'before `' + opt.before.val + '\'';
                default:
                    assert(false);
                    break;
            }
        };

        return 'numbers (start ' + (opt.start+'').val +
               ', step ' + (opt.step+'').val +
               ', padding ' + (opt.pad+'').val +
               ') will be inserted ' + where();
    };

    cmdset = {
        'start': function (input) {
            var r = parseQStr(input);
            if (!_.isFinite(+r[0])) {
                ERR('invalid starting number `%v\'\n', r[0]);
                r[0] = 1;
            }
            opt.start = +r[0];
            OK('numbers will start with %v\n', opt.start);

            return r[1];
        },
        'step': function (input) {
            var r = parseQStr(input);
            if (!_.isFinite(+r[0])) {
                ERR('invalid step number `%v\'\n', r[0]);
                r[0] = 1;
            }
            opt.step = +r[0];
            OK('numbers will go with a step of %v\n', opt.step);

            return r[1];
        },
        'as prefix': function (input) {
            opt.func = 'prefix';
            OK('numbers will be ' + 'prepended\n'.val);

            return input;
        },
        'as suffix': function (input) {
            opt.func = 'suffix';
            OK('numbers will be ' + 'appended\n'.val);

            return input;
        },
        'skip extension': function (input) {
            opt.skipext = true;
            if (opt.func !== 'suffix')
                WARN('`%c\' is meaningful only with `%c\'', 'skip extension', 'as suffix');
            OK('numbers will be appended ' + 'before extensions\n'.val);

            return input;
        },
        'include extension': function (input) {
            opt.skipext = false;
            if (opt.func !== 'suffix')
                WARN('`%c\' is meaningful only with `%c\'', 'including extension', 'as suffix');
            OK('numbers will be appended ' + 'to extensions\n'.val);

            return input;
        }, 'at': function (input) {
            var r = parseQStr(input);
            if (!_.isFinite(+r[0]) || +r[0] < 0) {
                ERR('invalid location `%v\'\n', r[0]);
                r[0] = 0;
            } else
                opt.func = 'at';
            opt.at = +r[0];
            OK('numbers will be appended after %v characters\n', +r[0]);

            return r[1];
        },
        'right to left': function (input) {
            if (opt.func !== 'at')
                WARN('`%c\' is meaningful only with `%c\'', 'right to left', 'at');
            opt.reverse = true;
            OK('characters will be counted ' + 'from right to left\n'.val);

            return input;
        },
        'left to right': function (input) {
            if (opt.func !== 'at')
                WARN('`%c\' is meaningful only with `%c\'', 'left to right', 'at');
            opt.reverse = false;
            OK('characters will be counted ' + 'from left to right\n'.val);

            return input;
        },
        'after': function (input) {
            var r = parseQStr(input);
            opt.func = 'after';
            opt.after = r[0];
            OK('numbers will be inserted after every `%v\'\n', opt.after);

            return r[1];
        },
        'before': function (input) {
            var r = parseQStr(input);
            opt.func = 'before';
            opt.before = r[0];
            OK('numbers will be inserted before every `%v\'\n', opt.before);

            return r[1];
        },
        'pad': function (input) {
            var r = parseQStr(input);
            if (!_.isFinite(+r[0]) || +r[0] < 0) {
                ERR('invalid padding length `%v\'\n', r[0]);
                r[0] = 1;
            }
            opt.pad = +r[0];
            OK('numbers will be padded to be %v-digit\n', +r[0]);

            return r[1];
        }
    };

    COMPLETER.add(_.keys(cmdset).alphanumSort());

    return {
        help:       help,
        commandSet: commandSet,
        affect:     affect,
        option:     option
    };
};

// end of serialize.js
