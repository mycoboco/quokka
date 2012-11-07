/*
 *  delete rule
 */

var assert = require('assert');

var _ = require('./node_modules/underscore');
var string = require('./node_modules/string');

var global = require('./lib/global');

var parseQStr = global.parseQStr;


// rule for delete
module.exports = function () {
    var cmdset;
    var opt = {    // default: delete nothing
        from:      0,
        until:     0,
        skipext:   true,
        reverse:   false,
        delimiter: false
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `#delete\' are:\n'.ok +
            '  from position <N>           '.cmd + 'delete from the <N+1>-th character inclusive\n' +
            '  from delimiter <WORD>       '.cmd + 'delete from the first occurrence of <WORD>\n' +
            '    skip delimiter            '.cmd + 'ignore the delimiter while deleting\n' +
            '    include delimiter         '.cmd + 'include the delimiter while deleting\n' +
            '  until count <N>             '.cmd + 'delete <N> characters\n' +
            '  until delimiter <WORD>      '.cmd + 'delete until <WORD> encountered\n' +
            '                                (also affected by ' + 'skip'.cmd + '/' + 'include delimiter'.cmd + ')\n' +
            '  until end                   '.cmd + 'delete until the end\n' +
            '  skip extension              '.cmd + 'ignore extensions while deleting (default)\n' +
            '  include extension           '.cmd + 'delete extensions if should\n' +
            '  left to right               '.cmd + 'count from left to right (default)\n' +
            '  right to left               '.cmd + 'count from right to left\n');
    };

    // gets command set
    var commandSet = function () {
        assert(cmdset);
        return cmdset;
    };

    var _rule = function (name) {
        var r;
        var s, sn = 0, e, en, t;

        if (opt.skipext) {
            r = global.extension(name);
            name = r[0];
            r = r[1];
        }

        if (_.isFinite(opt.from)) {    // location
            if (opt.from >= name.length)
               s = (opt.reverse)? 0: name.length;
            else
               s = (opt.reverse)? name.length-opt.from: opt.from;
        } else {    // delimiter
            assert(_.isString(opt.from));
            s = name[(opt.reverse)? "lastIndexOf": "indexOf"](opt.from);
            if (s < 0)
                s = (opt.reverse)? 0: name.length;
            else if (opt.reverse === opt.delimiter)
                sn = opt.from.length;
        }

        if (_.isFinite(opt.until)) {    // count
            e = s + sn + ((opt.reverse)? -opt.until: opt.until);
            e = Math.max(Math.min(e, name.length), 0);
        } else if (_.isNumber(opt.until))    // until end
            e = (opt.reverse)? 0: name.length;
        else {    // until delimiter
            assert(_.isString(opt.until));
            en = (_.isString(opt.from))? opt.from.length: 1;
            e = (opt.reverse)?
                    name.substring(0, s).lastIndexOf(opt.until):
                    name.substring(s + en).indexOf(opt.until);
            if (e < 0)
                e = s + sn;
            else {
                if (!opt.reverse)
                    e += s + en;
                if (opt.reverse !== opt.delimiter)
                    e += opt.until.length;
            }
        }

        s += sn;
        if (s > e)
            t = s, s = e, e = t;

        return name.substring(0, s) + name.substring(e) + r;
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
        var del = 'delete',
            from = '', until = '';

        if (_.isFinite(opt.from))
            from = ' from the ' + global.ordinal(opt.from+1).val + ' character';
        else {
            assert(_.isString(opt.from));
            from = ' from the ' +
                   ((opt.reverse)? 'last': 'first').val +
                   ' `' + opt.from.val + '\' ' +
                   ((opt.delimiter)? 'inclusive': 'exclusive').val;
        }
        if (_.isFinite(opt.until))
            del += ' ' + (''+opt.until).val + ' character' + ((opt.until > 1)? 's ': '');
        else if (_.isNumber(opt.until))
            until = ' until the end';
        else
            until = ' until `' + opt.until + '\' encountered';
        if (opt.reverse)
            until += ' counting ' + 'from right to left'.val;

        return del + from + until;
    };

    cmdset = {
        'from position': function (input) {
            var r = parseQStr(input);
            if (!_.isFinite(+r[0]) || +r[0] < 0) {
                ERR('invalid location `%v\'\n', r[0]);
                r[0] = 0;
            }
            opt.from = +r[0];
            OK('text will be deleted from the %v character\n', global.ordinal(opt.from+1));

            return r[1];
        },
        'from delimiter': function (input) {
            var r = parseQStr(input);
            opt.from = r[0];
            OK('text will be deleted from `%v\'\n', r[0]);

            return r[1];
        },
        'until count': function (input) {
            var r = parseQStr(input);
            if (!_.isFinite(+r[0]) || +r[0] < 0) {
                ERR('invalid count `%v\'\n', r[0]);
                r[0] = 0;
            }
            opt.until = +r[0];
            OK('%v character%s will be deleted\n', opt.until, (opt.until > 1)? 's': '');

            return r[1];
        },
        'until delimiter': function (input) {
            var r = parseQStr(input);
            opt.until = r[0];
            OK('text will be deleted until `%v\' encountered\n', r[0]);

            return r[1];
        },
        'until end': function (input) {
            opt.until = NaN;
            OK('text will be deleted until ' + 'the end\n'.val);

            return input;
        },
        'skip extension': function (input) {
            opt.skipext = true;
            OK('extensions will be %v while deleting\n', 'ignored');

            return input;
        },
        'include extension': function (input) {
            opt.skipext = false;
            OK('extensions will be %v while deleting\n', 'included');

            return input;
        },
        'right to left': function (input) {
            opt.reverse = true;
            OK('characters will be counted ' + 'from right to left\n'.val);

            return input;
        },
        'left to right': function (input) {
            opt.reverse = false;
            OK('characters will be counted ' + 'from left to right\n'.val);

            return input;
        },
        'skip delimiter': function (input) {
            opt.delimiter = false;
            OK('delimiter will %v be deleted\n', 'not');

            return input;
        },
        'include delimiter': function (input) {
            opt.delimiter = true;
            OK('delimiter will %v deleted\n', 'be');

            return input;
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

// end of delete.js
