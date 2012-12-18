/*
 *  case rule
 */

var assert = require('assert');

var _ = require('../node_modules/underscore');

var global = require('./lib/global');


// rule for case
module.exports = function () {
    var cmdset;
    var opt = {    // default: change nothing
        func:    'original',
        skipext: true
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#case\' are:\n'.ok +
            '  keep original          '.cmd + 'keep the original letter case\n' +
            '  titlecase              '.cmd + 'make file names be title case\n' +
            '  lowercase              '.cmd + 'make file names be lower case\n' +
            '  uppercase              '.cmd + 'make file names be upper case\n' +
            '  invert                 '.cmd + 'invert letter case in file names\n' +
            '  capitalize             '.cmd + 'make only the first character be upper case\n' +
            '  skip extension         '.cmd + 'ignore extensions while changing letter case (default)\n' +
            '  include extension      '.cmd + 'include extensions while changing letter case\n' +
            '  lower extension        '.cmd + 'extensions will always be lower case\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _rule = function (name) {
        var r = '', s = '';

        if (opt.skipext !== false) {
            r = global.extension(name);
            name = r[0];
            r = r[1];
        }

        switch (opt.func) {
            case 'original':
                break;
            case 'title':
                name = name.toTitleCase();
                break;
            case 'lower':
                name = name.toLowerCase();
                break;
            case 'upper':
                name = name.toUpperCase();
                break;
            case 'invert':
                for (var i = 0; i < name.length; i++)
                    s += (name[i].isUpper())? name[i].toLowerCase(): name[i].toUpperCase();
                name = s;
                break;
            case 'capitalize':
                name = name.capitalize();
                break;
            default:
                assert(false);
                break;
        }

        if (opt.skipext === 'lower')
            r = r.toLowerCase();

        return name + r;
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
        var s;

        switch(opt.func) {
            case 'original':
                s = 'keep the ' + 'original'.val + ' letter case';
                break;
            case 'title':
                s = 'make file names be ' + 'title'.val + ' case';
                break;
            case 'lower':
                s = 'make file names be ' + 'lower'.val + ' case';
                break;
            case 'upper':
                s = 'make file names be ' + 'upper'.val + ' case';
                break;
            case 'invert':
                s = 'invert'.val + ' letter case';
                break;
            case 'capitalize':
                s = 'make only the ' + 'first'.val + ' character be ' + 'upper'.val + ' case';
                break;
            default:
                assert(false);
                break;
        }

        switch(opt.skipext) {
            case 'lower':
                s += ' with ' + 'lower'.val + ' case';
                break;
            case true:
                s += ' skipping'.val;
                break;
            case false:
                s += ' including'.val;
                break;
            default:
                assert(false);
                break;
        }

        return s + ' extensions';
    };

    cmdset = {
        'keep original': {
            spec: [ 'keep', 'original' ],
            func: function () {
                opt.func = 'original';
                OK('letter case will %v change\n', 'not');
            }
        },
        'titlecase': {
            spec: [ 'titlecase' ],
            func: function () {
                opt.func = 'title';
                OK('file names will be %v case\n', 'title');
            }
        },
        'lowercase': {
            spec: [ 'lowercase' ],
            func: function () {
                opt.func = 'lower';
                OK('file names will be %v case\n', 'lower');
            }
        },
        'uppercase': {
            spec: [ 'uppercase' ],
            func: function () {
                opt.func = 'upper';
                OK('file names will be %v case\n', 'upper');
            }
        },
        'invert': {
            spec: [ 'invert' ],
            func: function () {
                opt.func = 'invert';
                OK('file names will have %v case\n', 'inverted');
            }
        },
        'capitalize': {
            spec: [ 'capitalize' ],
            func: function () {
                opt.func = 'capitalize';
                OK('only %v character will be %v case\n', 'first', 'upper');
            }
        },
        'lower extension': {
            spec: [ 'lower', 'extension' ],
            func: function () {
                opt.skipext = 'lower';
                OK('extensions will always be %v case\n', 'lower');
            }
        },
        'skip extension': {
            spec: [ 'skip', 'extension' ],
            func: function () {
                opt.skipext = true;
                OK('extensions will be %v while changing case\n', 'ignored');
            },
            chext: function () {
                COMPLETER.ext(false);
            }
        },
        'include extension': {
            spec: [ 'include', 'extension' ],
            func: function () {
                opt.skipext = false;
                OK('extensions will be %v while changing case\n', 'included');
            },
            chext: function () {
                COMPLETER.ext(true);
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
module.exports.id = 'case';
module.exports.desc = 'change letter case';

// end of case.js
