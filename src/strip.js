/*
 *  strip rule
 */

var assert = require('assert');

var _ = require('../node_modules/underscore');

var global = require('./lib/global');


// rule for strip
module.exports = function () {
    var cmdset;
    var opt = {    // default: strip off nothing
        set:     '',
        skipext: true
    };
    var preset = {
        digit:   '0123456789',
        punc:    '!?@#$%^&~`_+-=.,',
        bracket: '(){}[]'
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#strip\' are:\n'.ok +
            '  strip <SET>            '.cmd + 'strip off characters in <SET>\n' +
            '  digit                  '.cmd + 'strip off digits(' + preset.digit.val + ')\n' +
            '  punctuator             '.cmd + 'strip off punctuators(' + preset.punc.val + ')\n' +
            '  bracket                '.cmd + 'strip off brackets(' + preset.bracket.val + ')\n' +
            '  skip extension         '.cmd + 'ignore extensions while stripping off (default)\n' +
            '  include extension      '.cmd + 'strip off extensions if should\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _rule = function (name, n) {
        var r;
        var regex = new RegExp('[' +
                        opt.set.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&") +
                        ']', 'g');

        r = global.extension(name);
        name = r[0];
        r = r[1].substring(1);

        name = name.replace(regex, '');
        if (!opt.skipext)
            r = r.replace(regex, '');
        if (r)
            r = '.' + r;

        return name + r;
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
        switch(opt.set) {
            case preset.digit:
                set = 'digits(' + preset.digit.val + ')';
                break;
            case preset.punc:
                set = 'punctuators(' + preset.punc.val + ')';
                break;
            case preset.bracket:
                set = 'brackets(' + preset.bracket.val + ')';
                break;
            default:
                set = 'user-defined chars(' + opt.set.val + ')';
                break;
        }
        return set + ' will be stripped off' +
               ((opt.skipext)? ' skipping'.val: ' including'.val) + ' extensions';
    };

    cmdset = {
        'digit': {
            spec: [ 'digit' ],
            func: function () {
                opt.set = preset.digit;
                OK('digits(%v) will be stripped off\n', opt.set);
            }
        },
        'punctuator': {
            spec: [ 'punctuator' ],
            func: function () {
                opt.set = preset.punc;
                OK('punctuators(%v) will be stripped off\n', opt.set);
            }
        },
        'bracket': {
            spec: [ 'bracket' ],
            func: function () {
                opt.set = preset.bracket;
                OK('brackets(%v) will be stripped off\n', opt.set);
            }
        },
        'skip extension': {
            spec: [ 'skip', 'extension' ],
            func: function () {
                opt.skipext = true;
                OK('extensions will be %v while stripping off\n', 'ignores');
            },
            chext: function () {
                COMPLETER.ext(false);
            }
        },
        'include extension': {
            spec: [ 'include', 'extension' ],
            func: function () {
                opt.skipext = false;
                OK('extensions will be %v while stripping off\n', 'included');
            },
            chext: function () {
                COMPLETER.ext(true);
            }
        },
        'strip': {
            spec: [ 'strip', '#' ],
            func: function (param) {
                opt.set = param[0];
                OK('user-defined chars(%v) will be stripped off\n', opt.set);
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
module.exports.id = 'strip';
module.exports.desc = 'strip a set of characters off';

// end of strip.js
