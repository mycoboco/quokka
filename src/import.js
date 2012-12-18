/*
 *  import rule
 */

var assert = require('assert');
var fs = require('fs');

var _ = require('../node_modules/underscore');

var global = require('./lib/global');


// rule for import
module.exports = function () {
    var cmdset;
    var opt = {    // default: import
        file:    '(no file)',
        func:    'suffix',
        text:    [],
        skipext: true,
        keephid: true,
        repeat:  1,
        empty:   true
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#import\' are:\n'.ok +
            '  import <FILE>            '.cmd + 'import <FILE> for text insertion\n' +
            '    skip empty             '.cmd + 'ignore if lines are empty\n' +
            '    include empty          '.cmd + 'insert even if lines are empty (default)\n' +
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
            '    right to left          '.cmd + 'count from right to left\n' +
            '  repeat <N>               '.cmd + 'repeat insertion of each line <N> times\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _rule = function (name, i) {
        var text = opt.text[(i/opt.repeat).integer()] || '';

        return global.insert(name, text, opt);
    };

    var _readFile = function (file) {
        var line;

        try {
            line  = fs.readFileSync(file, 'utf-8');
        } catch(e) {
            ERR('%s\n', e.message);
            return null;
        }

        return line.split('\n');
    };

    // applies the rule to file names
    // src = [ { dir: 'dir name', file: 'file name' }, ... ]
    var affect = function (src) {
        var dst = [];

        assert(_.isArray(src));

        if (!opt.empty)
            for (var i = 0; i < opt.text.length; i++)
                if (!opt.text[i])
                    opt.text.splice(i, 1);

        for (var i = 0; i < src.length; i++)
            dst.push({
                dir:  src[i].dir,
                file: _rule(src[i].file, i)
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
                           ((opt.keephid)? ' keeping'.val + ' hidden files'.val: '');
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

        var empty = function () {
            return ((opt.empty)? 'with'.val: 'without'.val) + ' empty lines ';
        };

        return 'lines of `' + opt.file.val + '\' will be inserted ' + empty() + where();
    };

    cmdset = {
        'import': {
            spec: [ 'import', '*' ],
            func: function (param) {
                OUT('loading `%v\'...', param[0]);
                if ((opt.text = _readFile(param[0])) !== null) {
                    opt.file = param[0];
                    OUT('done\n');
                    OK('`%v\' will be imported:', param[0]);
                    OK('--------------------' + '-'.repeat(param[0].length));
                    for (var i = 0; i < opt.text.length; i++)
                        OUT(opt.text[i].val);
                }
            }
        },
        'skip empty': {
            spec: [ 'skip', 'empty' ],
            func: function () {
                opt.empty = false;
                OK('empty lines will be %v while insertion\n', 'ignored');
            }
        },
        'include empty': {
            spec: [ 'include', 'empty' ],
            func: function () {
                opt.empty = true;
                OK('empty lines will be %v while insertion\n', 'preserved');
            }
        },
        'repeat': {
            spec: [ 'repeat', '#' ],
            func: function (param) {
                if (!_.isFinite(+param[0]) || +param[0] < 0) {
                    ERR('invalid repeat number `%v\'\n', param[0]);
                    param[0] = 1;
                }
                opt.repeat = +param[0];
                OK('each line will be repeated %v time%s\n', +param[0], (param[0] > 1)? 's': '');
            }
        },
        'as prefix': {
            spec: [ 'as', 'prefix' ],
            func: function () {
                opt.func = 'prefix';
                OK('text will be ' + 'prepended\n'.val);
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
module.exports.id = 'import';
module.exports.desc = 'import lines of text file for insertion';

// end of insert.js
