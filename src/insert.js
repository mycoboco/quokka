/*
 *  insert rule
 */

var assert = require('assert');

var _ = require('./node_modules/underscore');
var string = require('./node_modules/string');

var global = require('./lib/global');

var parseQStr = global.parseQStr;


// rule for insert
module.exports = function () {
    var cmdset;
    var opt = {    // default: insert nothing as prefix
        text:    '',
        skipext: true
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#insert\' are:\n'.ok +
            '  insert <TEXT>            '.cmd + 'insert <TEXT> into designated position\n' +
            '  after <WORD>             '.cmd + 'insert after every occurrence of <WORD>\n' +
            '  as prefix                '.cmd + 'prepend (default)\n' +
            '  as suffix                '.cmd + 'append\n' +
            '    skip extension         '.cmd + 'append before extensions (default)\n' +
            '    include extension      '.cmd + 'append after extensions\n' +
            '  at <N>                   '.cmd + 'insert after <N> characters\n' +
            '    left to right          '.cmd + 'count from left to right (default)\n' +
            '    right to left          '.cmd + 'count from right to left\n' +
            '  before <WORD>            '.cmd + 'insert before every occurrence of <WORD>\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _prefix = opt.func = function (name) {
        assert(_.isString(name));

        if (opt.keephid && name.charAt(0) === '.')
            return '.' + opt.text + name.substring(1);
        else
            return opt.text + name;
    };

    var _suffix = function (name) {
        assert(_.isString(name));

        if (opt.skipext) {
            var r = global.extension(name);
            return r[0] + opt.text + r[1];
        } else
            return name + opt.text;
    };

    var _at = function (name) {
        var r, at;

        assert(_.isString(name));
        assert(_.isFinite(opt.at));

        r = global.extension(name);
        at = (opt.reverse)? r[0].length - opt.at: opt.at;
        return r[0].substring(0, at) + opt.text + r[0].substring(at) + r[1];
    };

    var _after = function (name) {
        assert(_.isString(name));
        assert(_.isString(opt.after));

        r = global.extension(name);
        return r[0].replaceNew(opt.after, opt.after+opt.text, { all: true }) + r[1];
    };

    var _before = function (name) {
        assert(_.isString(name));
        assert(_.isString(opt.before));

        r = global.extension(name);
        return r[0].replaceNew(opt.before, opt.text+opt.before, { all: true }) + r[1];
    };

    var _rule = function (name) {
        var e;

        assert(_.isString(opt.text));

        return opt.func(name);
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
        var where = function () {
            switch(opt.func) {
                case _prefix:
                    return 'as ' + 'prefix'.val +
                           ((opt.keephid)? ' keeping'.val + ' hidden files'.val: '');
                case _suffix:
                    return 'as ' + 'suffix'.val +
                           ((opt.skipext)? ' skipping'.val: ' including'.val) + ' extensions';
                case _at:
                    return 'at ' + (''+opt.at).val +
                           ((opt.reverse)? ' counting ' + 'from right to left'.val: '');
                case _after:
                    return 'after `' + opt.after.val + '\'';
                case _before:
                    return 'before `' + opt.before.val + '\'';
                default:
                    assert(false);
                    break;
            }
        };

        return '`' + opt.text.val + '\' will be inserted ' + where();
    };

    cmdset = {
        'insert': function (input) {
            var r = parseQStr(input);
            opt.text = r[0];
            OK('`%v\' will be inserted\n', opt.text);

            return r[1];
        },
        'as prefix': function (input) {
            opt.func = _prefix;
            OK('text will be ' + 'prepended\n'.val);

            return input;
        },
        'as suffix': function (input) {
            opt.func = _suffix;
            OK('text will be ' + 'appended\n'.val);

            return input;
        },
        'skip extension': function (input) {
            opt.skipext = true;
            if (opt.func !== _suffix)
                WARN('`%c\' is meaningful only with `%c\'', 'skip extension', 'as suffix');
            OK('text will be appended ' + 'before extensions\n'.val);

            return input;
        },
        'include extension': function (input) {
            opt.skipext = false;
            if (opt.func !== _suffix)
                WARN('`%c\' is meaningful only with `%c\'', 'including extension', 'as suffix');
            OK('text will be appended ' + 'to extensions\n'.val);

            return input;
        }, 'at': function (input) {
            var r = parseQStr(input);
            if (!_.isFinite(+r[0]) || +r[0] < 0) {
                ERR('invalid location `%v\'\n', r[0]);
                r[0] = 0;
            } else
                opt.func = _at;
            opt.at = +r[0];
            OK('text will be appended after %v characters\n', +r[0]);

            return r[1];
        },
        'right to left': function (input) {
            if (opt.func !== _at)
                WARN('`%c\' is meaningful only with `%c\'', 'right to left', 'at');
            opt.reverse = true;
            OK('characters will be counted ' + 'from right to left\n'.val);

            return input;
        },
        'left to right': function (input) {
            if (opt.func !== _at)
                WARN('`%c\' is meaningful only with `%c\'', 'left to right', 'at');
            opt.reverse = false;
            OK('characters will be counted ' + 'from left to right\n'.val);

            return input;
        },
        'after': function (input) {
            var r = parseQStr(input);
            opt.func = _after;
            opt.after = r[0];
            OK('text will be inserted after every `%v\'\n', opt.after);

            return r[1];
        },
        'before': function (input) {
            var r = parseQStr(input);
            opt.func = _before;
            opt.before = r[0];
            OK('text will be inserted before every `%v\'\n', opt.before);

            return r[1];
        },
    };

    COMPLETER.add(_.keys(cmdset).alphanumSort());

    return {
        help:       help,
        commandSet: commandSet,
        affect:     affect,
        option:     option
    };
};

// end of insert.js
