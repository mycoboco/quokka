/*
 *  quokka: an interactive file renamer
 */

var assert = require('assert');
var readline = require('readline');
var util = require('util');
var path = require('path');
var fs = require('fs');

var _ = require('./node_modules/underscore');
var argv = require('./node_modules/optimist')
               .boolean('v')
               .boolean('n')
               .argv;
var string = require('./node_modules/string');
var alphanum = require('./node_modules/alphanum/alphanum.js');

var global = require('./lib/global');
var mycolors = require('./lib/mycolors');
var validator = require('./lib/validator')();
var wcwidth = require('./lib/wcwidth');

var comp;                  // completer
var out, ok, err, warn;    // for mycolors().{out,ok,err,warn}


// parses a quoted string
// x = 'string to parse'
var parseQStr = function (x) {
    var ns = /[\S]+/g,
        esc = /\\(['|"|\\])/g;
    var q, s, e;

    assert(_.isString(x));

    x = x.trim();

    if (!x)
        return [ '', '' ];
    else if (x.indexOf('\'') >= 0)
        q = '\'';
    else if (x.indexOf('"') >= 0)
        q = '"';
    if (!q)
        return [ ns.exec(x)[0], x.substring(ns.lastIndex) ];

    x = x.substring(1);    // skips quote
    s = 0;
    do {
        e = x.indexOf(q, s);
        if (e < 0) {
            err('closing %s is missing\n', q);
            return [ x, '' ];
        }
        s = e + 1;
    } while(x.charAt(e-1) === '\\');

    return [ x.substring(0, e).replace(esc, '$1'), x.substring(e+1) ];
};


// fills a path object
// p = { dir: 'dir name', file: 'base name' }, ... ]
var fillPath = function (p) {
    var dir, file;

    assert(p);
    assert(_.isString(p.dir));
    assert(_.isString(p.file));

    var _esc = function (s) {
        var i, w,
            n = 0, t = '';

        assert(_.isString(s));

        for (i = 0; i < s.length; i++) {
            w = wcwidth(s.charAt(i));
            t += ((w <= 0)? (w = 1, '?'): s.charAt(i));
            n += w;
        }

        return {
            str:   t,
            width: n
        };
    };

    p.full = p.dir + path.sep + p.file;
    dir = _esc(p.dir);
    file = _esc(p.file);
    p.print = new String(dir.str + path.sep + file.str.file);
    p.print.width = dir.width + 1 + file.width;

    return p;
}


// manages rule chain
// init = [ { dir: 'dir name', file: 'base name' }, ... ]
var chain = function (init) {
    var ch,
        rule = {}, cache;

    // registers or finds a rule
    // entry = [ { name: 'rule name', constructor: function () {} }, ... ] or 'rule name to find'
    var rule = function (entry) {
        var i;

        assert(entry);

        if (_.isString(entry)) {    // finds a rule by name
            assert(_.isFunction(rule[entry]));
            return rule[entry];
        }

        // registers a rule
        if (!_.isArray(entry))
            entry = [ entry ];

        for (i = 0; i < entry.length; i++) {
            if (rule[entry[i].name])    // already registered
                break;
            rule[entry[i].name] = entry[i].constructor;
            cache = null;    // invalidates cache for names
        }

        return this;
    };

    // gets names of registered rules
    var ruleNames = function () {
        if (cache)
            return cache;

        cache = _.keys(rule);

        return cache;
    };

    // gets the final result of applied rules
    var final = function () {
        assert(ch.length >= 1);

        return ch[ch.length-1].result;
    };

    var _rerun = function (idx) {
        var i;

        assert(_.isFinite(+idx));
        assert(0 < +idx && +idx < ch.length);

        for (i = +idx; i < ch.length; i++)
            ch[i].result = ch[i].rule.instance.affect(ch[i-1].result)
                               .process(function (e) {
                                   return fillPath(e);
                               });

        return this;
    };

    // applies a rule by adding to rule chain
    // rule = { name: 'rule name', instance: rule object }
    var append = function (rule) {
        assert(rule);
        assert(rule.instance);
        assert(_.isFunction(rule.instance.affect));

        var prev = final();

        ch.push({
            rule: rule,
        });
        _rerun(ch.length-1);

        return this;
    };

    // moves a rule
    var move = function (from, to) {
        var move;

        assert(_.isFinite(+from));
        assert(_.isFinite(+to));
        assert(0 < +from && +from < ch.length);
        assert(0 < +to && +to < ch.length);

        move = ch[+from];
        ch.splice(+from, 1);
        ch.splice(+to, 0, move);

        return this;
    };

    // removes a rule from rule chain
    var remove = function (idx) {
        assert(_.isFinite(+idx));
        assert(+idx < ch.length);

        ch.splice(+idx, 1);
        if (+idx >= ch.length)
            idx = ch.length-1;
        if (+idx > 0)
            _rerun(idx);

        return this;
    };

    // applies a rule without adding to rule chain
    // rule = { instance: rule object }
    var peek = function (rule) {
        assert(rule);
        assert(rule.instance);
        assert(_.isFunction(rule.instance.affect));

        assert(ch.length > 0);

        return rule.instance.affect(final()).process(function (e) {
            return fillPath(e);
        });
    };

    // gets or sets the initial data
    var initial = function (data) {
        if (data) {    // sets
            init = data;
            init.process(function (e) {
                return fillPath(e);
            });

            ch = [];
            ch[0] = {
                rule:   {
                    name:     '',
                    instance: null
                },
                result: init
            };
            return this;
        } else {    // gets
            assert(_.isArray(init));
            return init;
        }
    };

    // gets the rule list
    var ruleList = function () {
        var i, r = [];

        assert(ch.length > 0);
        for (i = 1; i < ch.length; i++)
            r.push({
                name:   ch[i].rule.name,
                option: ch[i].rule.instance.option()
            });

        return r;
    };

    // gets the length of rule chain
    var ruleLength = function () {
        assert(ch.length > 0);
        return ch.length;
    };

    initial(init);

    return {
        rule:       rule,
        ruleNames:  ruleNames,
        initial:    initial,
        final:      final,
        append:     append,
        remove:     remove,
        nove:       move,
        peek:       peek,
        ruleList:   ruleList,
        ruleLength: ruleLength,
    };
};


// manages context
var context = function () {
    var _empty = function () {    // for initial context
        var help = function () {};
        var commandSet = function () { return {}; }
        var affect = function (x) { return x; }
        var option = function () { return ''; }

        return {
            help:       help,
            commandSet: commandSet,
            affect:     affect,
            option:     option
        };
    };

    var emptyCtx = {
        name:     '',
        instance: _empty()
    };

    var cur = emptyCtx;

    // sets or unsets current context
    // ch = chain object
    // name = 'rule name'
    var set = function (ch, name) {
        if (!ch && !name) {    // unsets
            if (cur === emptyCtx)
                return false;
            cur = emptyCtx;
            return true;
        } else {    // sets
            assert(ch);
            assert(_.isString(name) && name);

            cur = {
                name:     name,
                instance: ch.rule(name)()
            };
            assert(cur.instance);
        }

        return this;
    };

    // checks if current context set
    var isSet = function () {
        return (cur !== emptyCtx);
    };

    // gets current context
    var current = function () {
        assert(cur);

        return cur;
    };

    // gets name of current context
    var name = function () {
        assert(_.isString(cur.name));

        return cur.name;
    };

    // prints help message of current context
    var help = function () {
        assert(_.isFunction(cur.instance.help));

        cur.instance.help();

        return this;
    };

    // gets command set of current context
    var commandSet = function () {
        assert(_.isFunction(cur.instance.commandSet));

        return cur.instance.commandSet();
    };

    return {
        set:        set,
        isSet:      isSet,
        current:    current,
        name:       name,
        help:       help,
        commandSet: commandSet
    };
};


// run commands
var runCommand = function (cmdset, input) {
    var cmds = _.keys(cmdset);

    assert(_.isString(input));
    assert(input === input.trim());

    for (i = 0; i < cmds.length; i++) {
        regex = new RegExp('^' + cmds[i]+'\\b');
        if (regex.test(input)) {
            input = cmdset[cmds[i]](input.substring(cmds[i].length)).trim();
            break;
        }
    }

    return (i === cmds.length)? null: input;
};


// rule for extension
var extension = function () {
    var cmdset;
    var option = {
        limit: -1    // no limit
    };

    // prints help message
    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        console.log(
            'Commands for `extension\' are:\n'.ok +
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
            ok('file extensions will change to `%v\'\n', r[0]);
            option.newext = r[0];

            return r[1];
        },
        'limit': function (input) {
            var r = parseQStr(input);
            if (r[0] === 'off') {
                ok('every extension will be affected\n');
                option.limit = -1
            } else {
                option.limit = r[0].toInt();
                if (!_.isFinite(option.limit) || option.limit < 0) {
                    err('invalid limit value\n');
                    option.limit = -1;
                } else
                    ok('extensions with more than %v chars will not be affected\n', option.limit+'');
            }

            return r[1];
        }
    };

    comp.add(_.keys(cmdset).alphanumSort());

    return {
        help:       help,
        commandSet: commandSet,
        affect:     affect,
        option:     option
    };
};


// terminates program
var exit = function () {
    string.restorePrototype();
    process.exit();
};


// splits a string into lines
var split = function (s, allowEmpty) {
    assert(_.isString(s));

    s = s.split('\n');
    if (!allowEmpty)
        s = s.filter(function (e) {
            return e;
        });

    return s;
};


// constructs filename list to rename
// list = 'file name' or [ 'file name', ... ]
var nameList = function (list) {
    var dir, file, dup = {}, ret = [];

    assert(list);
    if (!_.isArray(list))
        list = [ list ];

    assert(_.isArray(list));

    for (var i = 0; i < list.length; i++) {
        list[i] = path.normalize(list[i]);
        if (list[i].charAt(list[i].length-1) === '/')
            list[i] = list[i].substring(0, list[i].length-1);
        dir = path.dirname(list[i]);
        file = path.basename(list[i]);
        if (file === '.' || file === '..')
            continue;
        if (!fs.existsSync(dir + path.sep + file)) {
            err('file `%f\' does not exist', dir+path.sep+file);
            continue;
        }
        if (dup[dir + path.sep + file])
            continue;
        dup[dir + path.sep + file] = true;
        ret.push({
            dir:  dir,
            file: file
        });
    }

    return ret;
};


// handles program arguments
var handleArgv = function () {
    var buf;

    assert(argv);

    var _usage = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        out(
            '\n' +
            'Usage: ' + 'quokka'.prog + ' [OPTION...] [FILE]...\n' +
            'Rename FILEs in an interactive manner.\n\n' +
            'Mandatory arguments to long options are mandatory for short options too.\n' +
            '  %c, %c=TEXT      names given in TEXT file used instead of FILE\n' +
            '  %c                   sort numbers naturally (alphabetical sort by default)\n' +
            '  %c                   do not sort FILEs at all\n',
            '-f', '--file',
            '-v',
            '-n');
        out('For bug reporting instructions, please see:\n'.etc +
            '<http://code.woong.org/quokka>.\n'.etc);
        exit();
    };

    if (argv.f || argv.file) {
        if (argv.f && argv.file) {
            err('only one of `%c\' or `%c\' must be given', '-f', '--file');
            _usage();
        } else {
            argv.f = argv.f || argv.file;
            if (!_.isString(argv.f) || !argv.f) {
                err('file name must be given to `%c\' or `%c\'', '-f', '--file');
                _usage();
            }
            try {
                buf = fs.readFileSync(argv.f);
            } catch(e) {
                err('%s', e.message);
                _usage();
            };
            argv._ = split(buf.toString());
        }
    }
    if (argv._) {
        if (argv.v)
            argv._.alphanumSort();
        else if (!argv.n)
            argv._.sort();
        argv._ = nameList(argv._);
    }

    if (argv._.length === 0)
        _usage();

    return argv._;
};


// mamages completer
var completer = function (init) {
    var completion = [];

    assert(!init || _.isArray(init));

    // adds entry to completion list
    // entry = [ 'entry', ... ] or 'entry'
    var add = function (entry) {
        if (_.isArray(entry))
            completion = completion.concat(
                entry.slice().process(function (e) {
                    return e + ' ';
                }));
        else {
            assert(_.isString(entry) && entry);
            completion.push(entry + ' ');
        }

        return this;
    };

    // resets completion list to initial
    var reset = function () {
        completion = init;

        return this;
    };

    // completer function for readline
    // line = 'user input'
    var completer = function (line) {
        var hit = completion.filter(function (c) {
            return c.indexOf(line) === 0
        });
        return [(hit.length > 0)? hit: completion, line];
    };

    init = init.slice().process(function (e) {
        return e + ' ';
    });
    reset();

    return {
        add:       add,
        reset:     reset,
        completer: completer
    };
};


// quokka starts from here
(function () {
    var mc;
    var ch;
    var ctx = context();
    var defPrompt = '> ',
        prompt = defPrompt;
    var files, input, rules, names;
    var newset = [];

    string.clobberPrototype();

    mc = mycolors({
        'err':  { abbr: 'e', color: 'red' },
        'warn': { abbr: 'w', color: 'yellow' },
        'ok':   { abbr: 'o', color: 'green' },
        'rule': { abbr: 'r', color: 'blue' },
        'num':  { abbr: 'n', color: 'yellow' },
        'file': { abbr: 'f', color: 'magenta' },
        'cmd':  { abbr: 'c', color: 'yellow' },
        'val':  { abbr: 'v', color: 'magenta' },
        'prog': { abbr: 'p', color: 'rainbow' },
        'etc':  { abbr: 'x', color: 'grey' }
    });

    out = mc.out;
    ok = mc.ok;
    err = mc.err;
    warn = mc.warn;

    files = handleArgv();
    assert(_.isArray(files));

    ch = chain(files);
    ch.rule([
        {
            name:        'extension',
            constructor: extension
        }
    ]);
    names = ch.ruleNames();

    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        out('Global commands are:\n'.ok +
            '  cancel       '.cmd + 'discard the rule in editing\n' +
            '  remove <N>   '.cmd + 'remove rule #<N> from rule chain\n' +
            '  done         '.cmd + 'apend the rule in editing to rule chain\n' +
            '  exit         '.cmd + 'terminates quokka\n' +
            '  help         '.cmd + 'show this message\n' +
            '  move <N> <M> '.cmd + 'move rule #<N> to #<M>\n' +
            '  preview      '.cmd + 'dry-run renaming files\n' +
            '  quit         '.cmd + 'terminates quokka\n' +
            '  rename       '.cmd + 'rename files\n' +
            '  rules        '.cmd + 'show rule chain\n' +
            '  version      '.cmd + 'show version information\n');
    };

    var version = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        out('quokka'.prog + ': an interactive file renamer 0.0.1\n%x',
            'This is free software; see the LICENSE file for more information. There is NO\n' +
            'warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.\n\n' +
            'Written by Jun Woong\n');
    };

    var pad = function (s, n) {
        var w, l = false;

        if (_.isString(n) && _.isFinite(+s))
            l = n, n = +s, s = l+'', l = true;

        assert(_.isString(s));
        assert(_.isFinite(+n));

        w = (s.width)? s.width: s.length;
        if (w >= +n)
            return s + '';

        return (l)? ' '.repeat(+n - w) + s:
                    s + ' '.repeat(+n - w);
    };

    var strArray = function (list, cb) {
        var i, r = [];

        assert(_.isFunction(cb) || (_.isString(cb) && cb));

        for (var i = 0; i < list.length; i++) {
            if (_.isFunction(cb))
                r.push(cb(list[i]));
            else
                r.push(cb(list[i][cb]));
        }

        return r;
    };

    var max = function (list) {
        var i, n, max = 0;

        assert(_.isArray(list));

        for (i = 0; i < list.length; i++) {
            n = (list[i].width)? list[i].width: list[i].length;
            if (max < n)
                max = n;
        }

        return max;
    };

    var fromTo = function (prev, next, cb) {
        var i, plenmax, nlenmax;

        assert(_.isArray(prev));
        assert(_.isArray(next));
        assert(prev.length === next.length);

        compose = function (idx) {
            var i, r = [];

            assert(_.isFinite(+idx));
            assert(idx < next.length);

            for (var i = 0; i < +idx; i++)
                r.push(next[i].full);
            for (var i = idx+1; i < prev.length; i++)
                r.push(prev[i].full);

            return r;
        }

        if (!cb)
            cb = function (p, pmax, n, nmax, invalid, conflict) {
                var level = (invalid && invalid.name === 'refrained')?
                            { out: warn, color: 'warn' }:
                            { out: err,  color: 'err'  };
                out('%s | %s%s%s', pad(p.print, pmax), pad(n.print, nmax),
                    (invalid)? ' [' + '!!!'[level.color] + ']': '',
                    (conflict)? ' [' + '!!!'.err + ']': '');
                if (invalid)
                    level.out(invalid.msg, invalid.what);
                if (conflict)
                    err(conflict.msg, conflict.what);
            };
        assert(_.isFunction(cb));

        plenmax = max(prev.collect('print'));
        nlenmax = max(next.collect('print'));
        for (i = 0; i < prev.length; i++) {
            var invalid = validator.isInvalid(next[i].file);
            var conflict = validator.conflict(compose(i), next[i].full);
            cb(prev[i], plenmax, next[i], nlenmax, invalid, conflict);
        }
        out('');
    };

    var ruleList = function (list) {
        var i, namemax = 0;

        // gets number of digits
        var _digitpad = function (n) {
            assert(_.isFinite(+n));
            assert(+n >= 0);

            if (+n < 10)
                return 1;
            if (+n < 100)
                return 2;
            if (+n < 1000)
                return 3;
            return 4;
        }

        assert(_.isArray(list));

        namemax = max(strArray(list, function (entry) { return entry.name; }));
        for (i = 0; i < list.length; i++)
            out('%n: %r ( %s )', pad(_digitpad(list.length), i+1+''), pad(list[i].name, namemax),
                                list[i].option);
        out('');
    };

    var cmdset = {
        'help': function (input) {
            help();
            if (ctx.isSet())
                ctx.help();
            return input;
        },
        'quit': function (input) {
            rl.close();
            return input;
        },
        'exit': function (input) {
            return cmdset['quit'](input);
        },
        'version': function (input) {
            version();
            return input;
        },
        'cancel': function (input) {
            var name = ctx.name();
            if (!ctx.set() && !_.isUndefined(input))
                warn('no rule in editing\n');
            else if (!_.isUndefined(input))
                ok('exiting from `%r\'\n', name);
            prompt = defPrompt;
            comp.reset();
            return input;
        },
        'done': function (input) {
            if (!_.isUndefined(input) && ctx.isSet())
                ch.append(ctx.current());
            ok('files will be renamed as follows when you type `%c\'', 'rename');
            out('-------------------------------------------------------');
            fromTo(ch.initial(), ch.final());
            cmdset['cancel']();
            return input;
        },
        'preview': function (input) {
            if (ctx.isSet()) {
                ok('files will be renamed as follows when you type `%c\' and `%c\'',
                   'done', 'rename');
                out('------------------------------------------------------------------');
                fromTo(ch.initial(), ch.peek(ctx.current()));
            } else
                cmdset['done']();
            return input;
        },
        'rules': function (input) {
            rules = ch.ruleList();
            out('rules are applied as follows\n'.ok +
                '----------------------------');
            if (rules.length === 0)
                warn('no rule in rule chain\n');
            else
                ruleList(rules);
            return input;
        },
        'move': function (input) {
            var f = parseQStr(input), t = parseQStr(f[1]), fidx, tidx;
            fidx = f[0].toInt();
            tidx = t[0].toInt();
            if (!_.isFinite(fidx) || !_.isFinite(tidx) || fidx < 1 || fidx >= ch.ruleLength() ||
                tidx < 1 || tidx >= ch.ruleLength()) {
                err('invalid rule index\n');
            } else {
                ch.move(fidx, tidx);
                cmdset['rules']();
            }
            return t[1];
        },
        'remove': function (input) {
            var r = parseQStr(input), idx;
            idx = r[0].toInt();
            if (!_.isFinite(idx) || idx < 1 || idx >= ch.ruleLength()) {
                err('invalid rule index\n');
            } else {
                ch.remove(idx);
                cmdset['rules']();
            }
            return r[1];
        },
        'rename': function (input) {
            var num = 0;

            if (newset.length > 0)
                return input;
            if (ctx.isSet())
                warn('you need to `%c\' or `%c\' the rule in editing\n', 'done', 'cancel');
            else {
                ok('files are being renamed');
                out('----------------------');
                fromTo(ch.initial(), ch.final(),
                    function (p, pmax, n, nmax, inv, cflt) {
                        var fail;

                        if (inv && inv.name === 'refrained')
                            inv = null;
                        if (!inv && !cflt && p.full !== n.full) {
                            try {
                                fs.renameSync(p.full, n.full);
                            } catch(e) {
                                fail = e.message;
                                newset.push(p.full);
                            }
                        } else
                            newset.push(p.full);
                        out('%s | %s%s', pad(p.print, pmax), pad(n.print, nmax),
                            (inv || cflt)? ' [' + 'skipped'.warn + ']':
                            (!fail)? ' [' + 'ok'.ok + ']': '');

                        if (fail)
                            err('%s', fail);
                        else if (!inv && !cflt) {
                            num++;
                            newset.push(n.full);
                        }
                    });
                if (num > 0)
                    ok('%s files successfully renamed', num+'');
                newset = nameList(newset);
            }
            return input;
        },
        'reset': function (input) {
            if (newset.length > 0) {
                ch.initial(newset);
                ok('file list and rules have been reset\n');
                newset = [];
            } else
                err('nothing to reset; `rename\' first\n');
            return input;
        }
    };

    comp = completer(_.keys(cmdset).concat(names).alphanumSort());

    rl = readline.createInterface(process.stdin, process.stdout, comp.completer);
    rl.setPrompt(prompt);
    rl.prompt();

    rl.on('line', function(line) {
        var i, ret;

        input = line.trim();
        while (input) {
            assert(_.isString(input));
            assert(input === input.trim());

            // commands
            do {
                ret = runCommand(_.extend({}, cmdset, ctx.commandSet()), input);
                if (ret !== null)
                    input = ret;
            } while(ret && input);

            // rule names
            for (i = 0; i < names.length; i++) {
                regex = new RegExp('^' + names[i] + '\\b');
                if (regex.test(input)) {
                    if (names[i] === ctx.name())
                        err('you are already in `%r\'\n', names[i].rule);
                    else if (ctx.isSet())
                        err('you need to cancel the rule in editing first\n');
                    else {
                        ok('entering `%r\'\n', names[i]);
                        prompt = names[i] + '> ';
                        ctx.set(ch, names[i]);
                    }
                    input = input.substring(names[i].length).trim();
                    break;
                }
            }

            if (ret === null && i === names.length) {
                err('invalid command `%c\'\n', input);
                break;
            }
            if (newset.length > 0)
                warn('you need to `reset\' file list and rules after `rename\'\n');
        }
        rl.setPrompt(prompt);
        rl.prompt();
    }).on('close', function () {
        out('');
        exit();
    });
})();

// end of quokka.js
