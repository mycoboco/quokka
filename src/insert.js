/*
 *  insert rule
 */

var assert = require('assert');

var _ = require('../node_modules/underscore');

var global = require('./lib/global');


// rule for insert
module.exports = function () {
    var cmdset;
    var opt = {    // default: insert nothing as prefix keeping hidden files
        func:    'prefix',
        text:    '',
        skipext: true,
        keephid: true
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#insert\' are:\n'.ok +
            '  insert <TEXT>            '.cmd + 'insert <TEXT> into designated position\n' +
            '  after <WORD>             '.cmd + 'insert after every occurrence of <WORD>\n' +
            '    skip extension         '.cmd + 'append before extensions (default)\n' +
            '    include extension      '.cmd + 'append after extensions\n' +
            '  before <WORD>            '.cmd + 'insert before every occurrence of <WORD>\n' +
            '                             (also affected by ' + 'skip'.cmd + '/' +
                                          'include extension'.cmd + ')\n' +
            '  as prefix                '.cmd + 'prepend (default)\n' +
            '    keep hidden            '.cmd + 'preserve hidden property (default)\n' +
            '    ignore hidden          '.cmd + 'ignore hidden property\n' +
            '  as suffix                '.cmd + 'append\n' +
            '                             (also affected by ' + 'skip'.cmd + '/' +
                                          'include extension'.cmd + ')\n' +
            '  at <N>                   '.cmd + 'insert after <N> characters\n' +
            '                             (also affected by ' + 'skip'.cmd + '/' +
                                          'include extension'.cmd + ')\n' +
            '    left to right          '.cmd + 'count from left to right (default)\n' +
            '    right to left          '.cmd + 'count from right to left\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _rule = function (name) {
        return global.insert(name, opt.text, opt);
    };

    // applies the rule to file names
    // src = [ { dir: 'dir name', file: 'file name' }, ... ]
    var affect = function (src) {
        var dst = [];

        assert(_.isArray(src));

        for (var i = 0; i < src.length; i++)
            dst.push({
                dir:  src[i].dir,
                file: _rule(src[i].file)
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

        return '`' + opt.text.val + '\' will be inserted ' + where();
    };

    cmdset = {
        'insert': {
            spec: [ 'insert', '$' ],
            func: function (param) {
                opt.text = param[0];
                OK('`%v\' will be inserted\n', opt.text);
            }
        },
        'as prefix': {
            spec: [ 'as', 'prefix' ],
            func: function () {
                opt.func = 'prefix';
                OK('text will be ' + 'prepended\n'.val);
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
                OK('text will be ' + 'appended\n'.val);
            }
        },
        'skip extension': {
            spec: [ 'skip', 'extension' ],
            func: function () {
                opt.skipext = true;
                if (opt.func === 'prefix')
                    WARN('`%c\' is not meaningful with `%c\'', 'skip extension', 'as prefix');
                OK('text will be appended ' + 'before extensions\n'.val);
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
                    WARN('`%c\' is not meaningful with `%c\'', 'including extension',
                         'as prefix');
                OK('text will be appended ' + 'to extensions\n'.val);
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
                OK('text will be appended after %v character%s\n', +param[0],
                   (param[0] > 1)? 's': '');
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
            spec: [ 'left', 'to', 'left' ],
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
                OK('text will be inserted after every `%v\'\n', opt.after);
            }
        },
        'before': {
            spec: [ 'before', '$' ],
            func: function (param) {
                opt.func = 'before';
                opt.before = param[0];
                OK('text will be inserted before every `%v\'\n', opt.before);
            }
        },
    };

    return {
        help:       help,
        commandSet: commandSet,
        affect:     affect,
        option:     option
    };
};


// name and description for rule
module.exports.id = 'insert';
module.exports.desc = 'insert a text into a specified position';

// end of insert.js
