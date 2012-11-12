/*
 *  quokka: an interactive file renamer
 */

var assert = require('assert');
var readline = require('readline');
var util = require('util');
var path = require('path');
var fs = require('fs');

var _ = require('../node_modules/underscore');
var argv = require('../node_modules/optimist')
               .boolean('v')
               .boolean('n')
               .argv;
var string = require('../node_modules/string');
var wcwidth = require('../node_modules/wcwidth.js')();

var alphanum = require('./lib/alphanum.js');
var global = require('./lib/global');
var mycolors = require('./lib/mycolors');
var validator = require('./lib/validator')();

// rules
var extension = require('./extension');
var insert = require('./insert');
var del = require('./delete');
var remove = require('./remove');
var replace = require('./replace');
var serialize = require('./serialize');

var parseQStr = global.parseQStr;


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

    // drops a rule from rule chain
    var drop = function (idx) {
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
        drop:       drop,
        move:       move,
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
            ERR('file `%f\' does not exist', dir+path.sep+file);
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
        OUT(
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
        OUT('For bug reporting instructions, please see:\n'.etc +
            '<http://code.woong.org/quokka>.\n'.etc);
        exit();
    };

    if (argv.f || argv.file) {
        if (argv.f && argv.file) {
            ERR('only one of `%c\' or `%c\' must be given', '-f', '--file');
            _usage();
        } else {
            argv.f = argv.f || argv.file;
            if (!_.isString(argv.f) || !argv.f) {
                ERR('file name must be given to `%c\' or `%c\'', '-f', '--file');
                _usage();
            }
            try {
                buf = fs.readFileSync(argv.f);
            } catch(e) {
                ERR('%s', e.message);
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


// exposes variables as global to share with rules
// those variables will be written in UPPERCASE
var setGlobal = function (vars) {
    assert(_.isObject(vars));

    vars.foreach(function (v) {
        GLOBAL[v] = this[v];
    });
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

    string.extendPrototype();

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

    setGlobal({
        OUT:  mc.out,
        OK:   mc.ok,
        ERR:  mc.err,
        WARN: mc.warn
    });

    files = handleArgv();
    assert(_.isArray(files));

    ch = chain(files);
    ch.rule([
        {
            name:        '#extension',
            constructor: extension
        },
        {
            name:        '#insert',
            constructor: insert
        },
        {
            name:        '#delete',
            constructor: del
        },
        {
            name:        '#remove',
            constructor: remove
        },
        {
            name:        '#replace',
            constructor: replace
        },
        {
            name:        '#serialize',
            constructor: serialize
        }
    ]);
    names = ch.ruleNames();

    var help = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        OUT('Global commands are:\n'.ok +
            '  cancel            '.cmd + 'discard the rule being edited\n' +
            '  describe          '.cmd + 'describe the rule being edited\n' +
            '  done              '.cmd + 'append the rule being edited to rule chain\n' +
            '  exit              '.cmd + 'terminates quokka\n' +
            '  help              '.cmd + 'show this message\n' +
            '  move <N> <M>      '.cmd + 'move rule #<N> to #<M>\n' +
            '  preview           '.cmd + 'dry-run renaming files\n' +
            '  quit              '.cmd + 'terminates quokka\n' +
            '  drop <N>          '.cmd + 'drop rule #<N> from rule chain\n' +
            '  rename            '.cmd + 'rename files\n' +
            '  rules             '.cmd + 'show rule chain\n' +
            '  version           '.cmd + 'show version information\n');
    };

    var version = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        OUT('quokka'.prog + ': an interactive file renamer 0.0.1\n%x',
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
                            { out: WARN, color: 'warn' }:
                            { out: ERR,  color: 'err'  };
                OUT('%s | %s%s%s', pad(p.print, pmax), pad(n.print, nmax),
                    (invalid)? ' [' + '!!!'[level.color] + ']': '',
                    (conflict)? ' [' + '!!!'.err + ']': '');
                if (invalid)
                    OUT(invalid.msg, invalid.what);
                if (conflict)
                    ERR(conflict.msg, conflict.what);
            };
        assert(_.isFunction(cb));

        plenmax = max(prev.collect('print'));
        nlenmax = max(next.collect('print'));
        for (i = 0; i < prev.length; i++) {
            var invalid = validator.isInvalid(next[i].file);
            var conflict = validator.conflict(compose(i), next[i].full);
            cb(prev[i], plenmax, next[i], nlenmax, invalid, conflict);
        }
        OUT('');
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
            OUT('%n: %r ( %s )', pad(_digitpad(list.length), i+1+''), pad(list[i].name, namemax),
                                list[i].option);
        OUT('');
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
            var name;
            if (!_.isUndefined(input)) {
                if (!ctx.isSet())
                    WARN('no rule being edited\n');
                else {
                    name = ctx.name();
                    ctx.set();
                    OK('exiting from `%r\'\n', name);
                }
            }
            prompt = defPrompt;
            COMPLETER.reset();
            return input;
        },
        'done': function (input) {
            if (!_.isUndefined(input)) {
                if (!ctx.isSet())
                    WARN('no rule being edited\n');
                else {
                    ch.append(ctx.current());
                    ctx.set();
                }
            }
            OK('files will be renamed as follows when you type `%c\'', 'rename');
            OUT('-------------------------------------------------------');
            fromTo(ch.initial(), ch.final());
            cmdset['cancel']();
            return input;
        },
        'describe': function (input) {
            if (!ctx.isSet())
                WARN('no rule being edited; use `%c\' to see the rule chain\n', 'rules');
            else {
                OK('current rule being edited');
                OUT('-------------------------');
                OUT(ctx.current().instance.option() + '\n');
            }
            return input;
        },
        'preview': function (input) {
            if (ctx.isSet()) {
                cmdset['describe']();
                OK('files will be renamed as follows when you type `%c\' and `%c\'',
                   'done', 'rename');
                OUT('------------------------------------------------------------------');
                fromTo(ch.initial(), ch.peek(ctx.current()));
            } else
                cmdset['done']();
            return input;
        },
        'rules': function (input) {
            rules = ch.ruleList();
            OUT('rules are applied as follows\n'.ok +
                '----------------------------');
            if (rules.length === 0)
                WARN('no rule in rule chain\n');
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
                ERR('invalid rule index\n');
            } else {
                ch.move(fidx, tidx);
                cmdset['rules']();
            }
            return t[1];
        },
        'drop': function (input) {
            var r = parseQStr(input), idx;
            idx = r[0].toInt();
            if (!_.isFinite(idx) || idx < 1 || idx >= ch.ruleLength()) {
                ERR('invalid rule index\n');
            } else {
                ch.drop(idx);
                cmdset['rules']();
            }
            return r[1];
        },
        'rename': function (input) {
            var num = 0;

            if (newset.length > 0)
                return input;
            if (ctx.isSet())
                WARN('you need to `%c\' or `%c\' the rule being edited\n', 'done', 'cancel');
            else {
                OK('files are being renamed');
                OUT('----------------------');
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
                        OUT('%s | %s%s', pad(p.print, pmax), pad(n.print, nmax),
                            (inv || cflt)? ' [' + 'skipped'.warn + ']':
                            (!fail)? ' [' + 'ok'.ok + ']': '');

                        if (fail)
                            ERR('%s', fail);
                        else if (!inv && !cflt) {
                            num++;
                            newset.push(n.full);
                        }
                    });
                if (num > 0)
                    OK('%s files successfully renamed', num+'');
                newset = nameList(newset);
            }
            return input;
        },
        'reset': function (input) {
            if (newset.length > 0) {
                ch.initial(newset);
                OK('file list and rules have been reset\n');
                newset = [];
            } else
                ERR('nothing to reset; `rename\' first\n');
            return input;
        }
    };

    setGlobal({
        COMPLETER: completer(_.keys(cmdset).concat(names).alphanumSort())
    });

    rl = readline.createInterface(process.stdin, process.stdout, COMPLETER.completer);
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
                        ERR('you are already in `%r\'\n', names[i].rule);
                    else if (ctx.isSet())
                        ERR('you need to cancel the rule being edited first\n');
                    else {
                        OK('entering `%r\'\n', names[i]);
                        prompt = names[i] + '> ';
                        ctx.set(ch, names[i]);
                    }
                    input = input.substring(names[i].length).trim();
                    break;
                }
            }

            if (ret === null && i === names.length) {
                ERR('invalid command `%c\'\n', input);
                break;
            }
            if (newset.length > 0)
                WARN('you need to `reset\' file list and rules after `rename\'\n');
        }
        rl.setPrompt(prompt);
        rl.prompt();
    }).on('close', function () {
        OUT('');
        exit();
    });
})();

// end of quokka.js
