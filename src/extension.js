/*
 *  extension rule
 */

var assert = require('assert');

var _ = require('../node_modules/underscore');

var global = require('./lib/global');


// rule for extension
module.exports = function () {
    var cmdset;
    var opt = {
        limit: -1    // no limit
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#extension\' are:\n'.ok +
            '  change to <NEWEXT>      '.cmd + 'change extensions of files to <NEWEXT>\n' +
            '                            e.g., `change to "txt"\' changes extensions to `.txt\'\n' +
            '  limit <N>               '.cmd + 'not considered an extension if longer than <N>\n' +
            '                            e.g., `limit 3\' stops `.html\' from being recognized\n' +
            '                                  as an extension\n' +
            '  limit off               '.cmd + '`limit\' will be no longer used\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _rule = function (name) {
        var r;

        if (_.isUndefined(opt.newext))
            return name;

        r = global.extension(name, opt.limit);
        return r[0] + ((opt.newext)? '.': '') + opt.newext;
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

    // gets string to describe options
    var option = function () {
        var r;

        r = (opt.newext)? 'change extensions to `' + opt.newext.val + '\' ':
                          'keep'.val + ' the original ';
        r += (opt.limit < 0)? 'not'.val + ' using limit':
                              'limiting to ' + (opt.limit+'').val + ' character' +
                                  ((opt.limit > 1)? 's': '');

        return r;
    };

    cmdset = {
        'change to': {
            spec: [ 'change', 'to', '$' ],
            func: function (param) {
                var r = param[0];
                OK('file extensions will change to `%v\'\n', r);
                opt.newext = r;
            }
        },
        'limit': {
            spec: [ 'limit', '#' ],
            func: function (param) {
                var r = param[0];
                if (r === 'off') {
                    OK('every extension will be affected\n');
                    opt.limit = -1
                } else {
                    opt.limit = +r;
                    if (!_.isFinite(opt.limit) || opt.limit < 0) {
                        ERR('invalid limit value\n');
                        opt.limit = -1;
                    } else
                        OK('extensions with more than %v character%s will not be affected\n',
                           opt.limit+'', (opt.limit > 1)? 's': '');
                }
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
module.exports.id = 'extension';
module.exports.desc = 'change file extensions';
module.exports.init = function () {
    COMPLETER.ext(true);    // default: including extensions
};

// end of extension.js
