/*
 *  serialize rule
 */

var assert = require('assert');

var _ = require('../node_modules/underscore');

var global = require('./lib/global');


// rule for serialize
module.exports = function () {
    var cmdset;
    var opt = {    // default: start 1, step 1, as suffix
        start:   1,
        step:    1,
        func:    'suffix',
        skipext: true,
        keephid: true,
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
            '    skip extension         '.cmd + 'append before extensions (default)\n' +
            '    include extension      '.cmd + 'append after extensions\n' +
            '  before <WORD>            '.cmd + 'insert before every occurrence of <WORD>\n' +
            '                             (also affected by ' + 'skip'.cmd + '/' +
                                          'include extension'.cmd + ')\n' +
            '  as prefix                '.cmd + 'prepend\n' +
            '    keep hidden            '.cmd + 'preserve hidden property (default)\n' +
            '    ignore hidden          '.cmd + 'ignore hidden property\n' +
            '  as suffix                '.cmd + 'append (default)\n' +
            '                             (also affected by ' + 'skip'.cmd + '/' +
                                          'include extension'.cmd + ')\n' +
            '  at <N>                   '.cmd + 'insert after <N> characters\n' +
            '                             (also affected by ' + 'skip'.cmd + '/' +
                                          'include extension'.cmd + ')\n' +
            '    left to right          '.cmd + 'count from left to right (default)\n' +
            '    right to left          '.cmd + 'count from right to left\n' +
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
            var extension = function () {
                return ((opt.skipext)? ' skipping'.val: ' including'.val) + ' extensions';
            };

            switch(opt.func) {
                case 'prefix':
                    return 'as ' + 'prefix'.val +
                           ((opt.keephid)? ' preserving'.val: ' ignoring'.val) +
                           ' hidden property';
                case 'suffix':
                    return 'as ' + 'suffix'.val + extension();
                case 'at':
                    return 'at ' + (''+opt.at).val +
                           ((opt.reverse)? ' counting ' + 'from right to left'.val: '') +
                           extension();
                case 'after':
                    return 'after `' + opt.after.val + '\'' + extension();
                case 'before':
                    return 'before `' + opt.before.val + '\'' + extension();
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
        'start': {
            spec: [ 'start', '#' ],
            func: function (param) {
                if (!_.isFinite(+param[0])) {
                    ERR('invalid starting number `%v\'\n', param[0]);
                    param[0] = 1;
                }
                opt.start = +param[0];
                OK('numbers will start with %v\n', opt.start);
            }
        },
        'step': {
            spec: [ 'step', '#' ],
            func: function (param) {
                if (!_.isFinite(+param[0])) {
                    ERR('invalid step number `%v\'\n', param[0]);
                    param[0] = 1;
                }
                opt.step = +param[0];
                OK('numbers will go with a step of %v\n', opt.step);
            }
        },
        'as prefix': {
            spec: [ 'as', 'prefix' ],
            func: function () {
                opt.func = 'prefix';
                OK('numbers will be ' + 'prepended\n'.val);
            }
        },
        'keep hidden': {
            spec: [ 'keep', 'hidden' ],
            func: function () {
                opt.keephid = true;
                OK('hidden property will be ' + 'preserved\n'.val);
            }
        },
        'ignore hidden': {
            spec: [ 'ignore', 'hidden' ],
            func: function () {
                opt.keephid = false;
                OK('hidden property will %v be preserved\n', 'not');
            }
        },
        'as suffix': {
            spec: [ 'as', 'suffix' ],
            func: function () {
                opt.func = 'suffix';
                OK('numbers will be ' + 'appended\n'.val);
            }
        },
        'skip extension': {
            spec: [ 'skip', 'extension' ],
            func: function () {
                opt.skipext = true;
                if (opt.func === 'prefix')
                    WARN('`%c\' is not meaningful with `%c\'', 'skip extension', 'as prefix');
                OK('numbers will be appended ' + 'before extensions\n'.val);
            },
            chext: function () {
                COMPLETER.ext(false);
            }
        },
        'include extension': {
            spec: [ 'include', 'extension' ],
            func: function () {
                opt.skipext = false;
                if (opt.func === 'prefix')
                    WARN('`%c\' is not meaningful with `%c\'',
                         'including extension', 'as prefix');
                OK('numbers will be appended ' + 'to extensions\n'.val);
            },
            chext: function () {
                COMPLETER.ext(true);
            }
        },
        'at': {
            spec: [ 'at', '#' ],
            func: function (param) {
                if (!_.isFinite(+param[0]) || +param[0] < 0) {
                    ERR('invalid location `%v\'\n', param[0]);
                    param[0] = 0;
                } else
                    opt.func = 'at';
                opt.at = +param[0];
                OK('numbers will be appended after %v characters\n', +param[0]);
            }
        },
        'right to left': {
            spec: [ 'right', 'to', 'left' ],
            func: function () {
                if (opt.func !== 'at')
                    WARN('`%c\' is meaningful only with `%c\'', 'right to left', 'at');
                opt.reverse = true;
                OK('characters will be counted ' + 'from right to left\n'.val);
            }
        },
        'left to right': {
            spec: [ 'left', 'to', 'right' ],
            func: function () {
                if (opt.func !== 'at')
                    WARN('`%c\' is meaningful only with `%c\'', 'left to right', 'at');
                opt.reverse = false;
                OK('characters will be counted ' + 'from left to right\n'.val);
            }
        },
        'after': {
            spec: [ 'after', '$' ],
            func: function (param) {
                opt.func = 'after';
                opt.after = param[0];
                OK('numbers will be inserted after every `%v\'\n', opt.after);
            }
        },
        'before': {
            spec: [ 'before', '$' ],
            func: function (param) {
                opt.func = 'before';
                opt.before = param[0];
                OK('numbers will be inserted before every `%v\'\n', opt.before);
            }
        },
        'pad': {
            spec: [ 'pad', '#' ],
            func: function (param) {
                if (!_.isFinite(+param[0]) || +param[0] < 0) {
                    ERR('invalid padding length `%v\'\n', param[0]);
                    param[0] = 1;
                }
                opt.pad = +param[0];
                OK('numbers will be padded to be %v-digit\n', +param[0]);
            }
        }
    };

    return {
        help:       help,
        commandSet: commandSet,
        affect:     affect,
        option:     option
    };
};


// name and description for rule
module.exports.id = 'serialize';
module.exports.desc = 'serialize file names';

// end of serialize.js
