/*
 *  extension rule
 */

var assert = require('assert');

var _ = require('./node_modules/underscore');

var global = require('./lib/global');

var parseQStr = global.parseQStr;


// rule for extension
module.exports = function () {
    var cmdset;
    var option = {
        limit: -1    // no limit
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#extension\' are:\n'.ok +
            '  change to <NEWEXT>     '.cmd + 'change extensions of files to <NEWEXT>\n' +
            '                         e.g., `change to "txt"\' changes extensions to `.txt\'\n' +
            '  limit <N>              '.cmd + 'not considered an extension if longer than <N>\n' +
            '                         e.g., `limit 3\' stops `.html\' from being recognized\n' +
            '                               as an extension\n' +
            '  limit off              '.cmd + '`limit\' will be no longer used\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _rule = function (name) {
        var e;

        assert(_.isString(name) && name);

        if (_.isUndefined(option.newext))
            return name;

        e = name.lastIndexOf('.');
        if (e <= 0 || (option.limit >= 0 && name.length-e-1 > option.limit))
            e = name.length;
        name = name.substring(0, e);
        if (option.newext)
            name += '.';
        name += option.newext;

        return name;
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

    // gets string to describe options
    var option = function () {
        var r = '';

        if (option.newext)
            r += 'change to `' + option.newext.val + '\'';
        r = ((r)? r+', ': '') + 'limit ' + ((option.limit < 0)? 'off'.val: (option.limit+'').val);

        return r;
    };

    cmdset = {
        'change to': function (input) {
            var r = parseQStr(input);
            OK('file extensions will change to `%v\'\n', r[0]);
            option.newext = r[0];

            return r[1];
        },
        'limit': function (input) {
            var r = parseQStr(input);
            if (r[0] === 'off') {
                OK('every extension will be affected\n');
                option.limit = -1
            } else {
                option.limit = r[0].toInt();
                if (!_.isFinite(option.limit) || option.limit < 0) {
                    ERR('invalid limit value\n');
                    option.limit = -1;
                } else
                    OK('extensions with more than %v chars will not be affected\n', option.limit+'');
            }

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

// end of extension.js
