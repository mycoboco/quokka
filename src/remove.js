/*
 *  remove rule
 */

var assert = require('assert');

var _ = require('../node_modules/underscore');

var global = require('./lib/global');


// rule for remove
module.exports = function () {
    var cmdset;
    var opt = {    // default: remove nothing
        text:      '',
        skipext:   true,
        occur:     'all',
        casesense: true
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#remove\' are:\n'.ok +
            '  remove <TEXT>          '.cmd + 'remove <TEXT>\n' +
            '  all                    '.cmd + 'apply to all occurrences (default)\n' +
            '  first                  '.cmd + 'apply only to the first occurrence\n' +
            '  last                   '.cmd + 'apply only to the last occurrence\n' +
            '  skip extension         '.cmd + 'ignore extensions while removing (default)\n' +
            '  include extension      '.cmd + 'remove extensions if should\n' +
            '  case sensitive         '.cmd + 'case matters when finding <TEXT> (default)\n' +
            '  case insensitive       '.cmd + 'case does not matter when finding <TEXT>\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _rule = function (name) {
        var r = '';

        if (opt.skipext) {
            r = global.extension(name);
            name = r[0];
            r = r[1];
        }

        switch (opt.occur) {
            case 'all':
            case 'first':
                o = {
                    all:    (opt.occur === 'all'),
                    ignore: !opt.casesense
                };
                name = name.replaceNew(opt.text, '', o);
                break;
            case 'last':
                if (opt.casesense) {
                    namel = name;
                    textl = opt.text;
                } else {
                    namel = name.toLowerCase();
                    textl = name.toLowerCase();
                }
                n = namel.lastIndexOf(textl);
                if (n > -1)
                    name = name.substring(0, n) +
                           name.substring(n).replaceNew(opt.text, '', { ignore: !opt.casesense });
                break;
            default:
                assert(false);
                break;
        }

        return name + r;
    };

    // applies the rule to file names
    // src = [ { dir: 'dir name', file: 'file name' }, ... ]
    var affect = function (src) {
        assert(_.isArray(src));

        var dst = [];

        for (var i = 0; i < src.length; i++)
            dst.push({
                dir:  src[i].dir,
                file: _rule(src[i].file)
            });

        return dst;
    };

    // gets string to describe opts
    var option = function () {
        var r = 'remove ';

        switch (opt.occur) {
            case 'all':
                r += 'all'.val + ' instances of `' + opt.text.val + '\'';
                break;
            case 'first':
                r += 'the ' + 'first'.val + ' instance of `' + opt.text.val + '\'';
                break;
            case 'last':
                r += 'the ' + 'last'.val + ' instance of `' + opt.text.val + '\'';
                break;
            default:
                assert(false);
                break;
        }

        r += ' (case ' + ((opt.casesense)? 'sensitive'.val: 'insensitive'.val) + ')';
        r += ((opt.skipext)? ' skipping'.val: ' including'.val) + ' extensions'

        return r;
    };

    cmdset = {
        'remove': {
            spec: [ 'remove', '$' ],
            func: function (param) {
                opt.text = param[0];
                OK('`%v\' will be removed\n', opt.text);
            }
        },
        'all': {
            spec: [ 'all' ],
            func: function () {
                opt.occur = 'all';
                OK('%v occurrences will be removed\n', 'all');
            }
        },
        'first': {
            spec: [ 'first' ],
            func: function () {
                opt.occur = 'first';
                OK('only the %v occurrence will be removed\n', 'first');
            }
        },
        'last': {
            spec: [ 'last' ],
            func: function () {
                opt.occur = 'last';
                OK('only the %v occurrence will be removed\n', 'last');
            }
        },
        'skip extension': {
            spec: [ 'skip', 'extension' ],
            func: function () {
                opt.skipext = true;
                OK('extensions will be %v while removing\n', 'ignored');
            },
            chext: function () {
                COMPLETER.ext(false);
            }
        },
        'include extension': {
            spec: [ 'include', 'extension' ],
            func: function () {
                opt.skipext = false;
                OK('extensions will be %v while removing\n', 'included');
            },
            chext: function () {
                COMPLETER.ext(true);
            }
        },
        'case sensitive': {
            spec: [ 'case', 'sensitive' ],
            func: function () {
                opt.casesense = true;
                OK('case %v\n', 'sensitive');
            }
        },
        'case insensitive': {
            spec: [ 'case', 'insensitive' ],
            func: function () {
                opt.casesense = false;
                OK('case %v\n', 'insensitive');
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
module.exports.id = 'remove';
module.exports.desc = 'remove a text';

// end of remove.js
