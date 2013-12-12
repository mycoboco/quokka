/*
 *  quokka: an interactive file renamer
 */

var assert = require('assert');
var readline = require('readline');
var path = require('path');
var fs = require('fs');

var _ = require('../node_modules/underscore');
var argv = require('../node_modules/optimist')
               .boolean('v')
               .boolean('n')
               .argv;
var string = require('../node_modules/string');

var alphanum = require('./lib/alphanum.js');
var global = require('./lib/global');
var mycolors = require('./lib/mycolors');
var validator = require('./lib/validator')();
var chain = require('./lib/chain');
var context = require('./lib/context');
var parser = require('./lib/parser');
var command = require('./lib/command');

// rules
var extension = require('./extension');
var insert = require('./insert');
var del = require('./delete');
var remove = require('./remove');
var replace = require('./replace');
var serialize = require('./serialize');
var strip = require('./strip');
var letterCase = require('./case');
var im = require('./import');

var VERSION = '0.0.7';


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
        if (list[i].charAt(list[i].length-1) === path.sep)
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

    var _usage = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        OUT('Usage: ' + 'quokka'.prog + ' [OPTION...] [FILE]...\n' +
            'Rename FILEs in an interactive manner.\n\n' +
            'Mandatory arguments to long options are mandatory for short options too.\n' +
            '  %c, %c=TEXT      names given in TEXT file used instead of FILE\n' +
            '  %c                   sort numbers naturally (alphabetical sort by default)\n' +
            '  %c                   do not sort FILEs at all\n',
            '-f', '--file',
            '-v',
            '-n');
        OUT('For bug reporting instructions, please see:\n'.etc +
            '<http://code.woong.org/quokka>.'.etc);
        exit();
    };

    assert(argv);

    if (argv.f || argv.file) {
        if (argv.f && argv.file) {
            ERR('only one of `%c\' or `%c\' must be given\n', '-f', '--file');
            _usage();
        } else {
            argv.f = argv.f || argv.file;
            if (!_.isString(argv.f) || !argv.f) {
                ERR('file name must be given to `%c\' or `%c\'\n', '-f', '--file');
                _usage();
            }
            try {
                buf = fs.readFileSync(argv.f);
            } catch(e) {
                ERR('%s\n', e.message);
                _usage();
            }
            argv._ = split(buf.toString());
        }
    }
    if (argv._.length > 0) {
        if (!argv.n) {    // -n overrides -v
            if (argv.v)
                argv._.alphanumSort();
            else
                argv._.sort();
        }
        argv._ = nameList(argv._);
        if (argv._.length === 0)
            OUT('');
    }

    if (argv._.length === 0)
        _usage();

    return argv._;
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
    var mc, ch, cset, p;
    var ctx = context();
    var defPrompt = '> ',
        prompt = defPrompt;
    var files, rules, info, names;
    var newset = [];

    var prepRuleForChain = function (r) {
        assert(_.isArray(r));

        return r.foreach(function (idx, memo) {
            memo.push({
                name:        '#' + r[idx].id,
                desc:        r[idx].desc,
                constructor: r[idx],
                init:        r[idx].init
            });
            return memo;
        }, []);
    };

    var prepRuleForCset = function (r) {
        var e = {};

        assert(_.isArray(r));

        return r.foreach(function (idx) {
            var name = '#' + r[idx].id;
            e[name] = {
                spec: [ name ],
                func: function () {
                    var init;

                    assert(!ctx.isSet());

                    OK('entering `%r\'\n', name);
                    prompt = name + '> ';
                    ctx.set(ch, name);
                    cset.add({
                        name: name,
                        set:  ctx.commandSet()
                    }).remove('rules');
                    init = ch.rule(name).init;
                    if (_.isFunction(init))
                        init();
                },
                chcset: function (info) {    // for dry run
                    var r;

                    if (!info.lastr) {
                        r = ch.rule(name);
                        cset.add({
                            name: name,
                            set:  r().commandSet()
                        }).remove('rules');
                        if (_.isFunction(r.init))
                            r.init();
                        info.lastr = name;
                    }
                }
            };

            return e;
        });
    };

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
    ch.rule(prepRuleForChain(rules = [
        extension,
        insert,
        del,
        remove,
        replace,
        serialize,
        strip,
        letterCase,
        im
    ]));
    info = ch.ruleInfo().sort(function (a, b) {
        return a.name > b.name;
    });

    var help = function () {
        var n;

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

        if (!ctx.isSet()) {    // describes rules
            n = max(info.collect('name')) + 6;
            OK('Supported rules are:'.ok);
            for (var i = 0; i < info.length; i++)
                OUT('  ' + pad(info[i].name, n).cmd + info[i].desc);
            OUT('');
        }
    };

    var version = function () {
        //   12345678911234567892123456789312345678941234567895123456789612345678971234567898
        OUT('quokka'.prog + ': an interactive file renamer ' + VERSION + '\n%x',
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

    cset = command({
        name: 'global',
        set: {
            'help': {
                spec: [ 'help' ],
                func: function () {
                    help();
                    if (ctx.isSet())
                        ctx.help();
                }
            },
            'quit': {
                spec: [ 'quit' ],
                func: function () {
                    rl.close();
                }
            },
            'exit': {
                spec: [ 'exit' ],
                func: function () {
                    rl.close();
                }
            },
            'version': {
                spec: [ 'version' ],
                func: function () {
                    version();
                }
            },
            'cancel': {
                spec: [ 'cancel' ],
                func: function () {
                    var name;
                    if (!ctx.isSet())
                        WARN('no rule being edited\n');
                    else {
                        name = ctx.name();
                        cset.remove(name).add(rules);
                        ctx.set();
                        OK('exiting from `%r\'\n', name);
                    }
                    prompt = defPrompt;
                },
                chcset: function (info) {    // for dry run
                    if (info.lastr) {
                        cset.remove(info.lastr).add(rules);
                        info.lastr= null;
                    }
                },
                chext: function () {
                    COMPLETER.ext(false);
                },
            },
            'done': {
                spec: [ 'done' ],
                func: function (param) {
                    if (!param || param.length === 0) {
                        if (!ctx.isSet())
                            WARN('no rule being edited\n');
                        else {
                            ch.append(ctx.current());
                            cset.remove(ctx.name()).add(rules);
                            ctx.set();
                        }
                    }
                    OK('files will be renamed as follows when you type `%c\'', 'rename');
                    OUT('-------------------------------------------------------');
                    fromTo(ch.initial(), ch.final());
                    prompt = defPrompt;
                },
                chcset: function (info) {    // for dry run
                    if (info.lastr) {
                        cset.remove(info.lastr).add(rules);
                        info.lastr = null;
                    }
                },
                chext: function () {
                    COMPLETER.ext(false);
                }
            },
            'describe': {
                spec: [ 'describe' ],
                func: function () {
                    if (!ctx.isSet())
                        WARN('no rule being edited; use `%c\' to see the rule chain\n', 'rules');
                    else {
                        OK('current rule being edited');
                        OUT('-------------------------');
                        OUT(ctx.current().instance.option() + '\n');
                    }
                 }
             },
            'preview': {
                spec: [ 'preview' ],
                func: function () {
                    if (ctx.isSet()) {
                        cset.cmd('describe').func();
                        OK('files will be renamed as follows when you type `%c\' and `%c\'',
                           'done', 'rename');
                        OUT('------------------------------------------------------------------');
                        fromTo(ch.initial(), ch.peek(ctx.current()));
                    } else
                        cset.cmd('done').func();
                }
            },
            'rules': {
                spec: [ 'rules' ],
                func: function () {
                    var r = ch.ruleList();
                    OUT('rules are applied as follows\n'.ok +
                        '----------------------------');
                    if (r.length === 0)
                        WARN('no rule in rule chain\n');
                    else
                        ruleList(r);
                }
            },
            'move': {
                spec: [ 'move', '#', '#' ],
                func: function (param) {
                    var fidx, tidx;
                    fidx = +param[0];
                    tidx = +param[1];
                    if (!_.isFinite(fidx) || !_.isFinite(tidx) || fidx < 1 || fidx >= ch.ruleLength() ||
                        tidx < 1 || tidx >= ch.ruleLength()) {
                        ERR('invalid rule index\n');
                    } else {
                        ch.move(fidx, tidx);
                        cset.cmd('rules').func();
                    }
                }
            },
            'drop': {
                spec: [ 'drop', '#' ],
                func: function (param) {
                    var idx = +param[0];
                    if (!_.isFinite(idx) || idx < 1 || idx >= ch.ruleLength()) {
                        ERR('invalid rule index\n');
                    } else {
                        ch.drop(idx);
                        cset.cmd('rules').func();
                    }
                }
            },
            'rename': {
                spec: [ 'rename' ],
                func: function () {
                    var num = 0;

                    if (newset.length > 0)
                        return;
                    if (ctx.isSet())
                        WARN('you need to `%c\' or `%c\' the rule being edited\n',
                             'done', 'cancel');
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
                }
            },
            'reset': {
                spec: [ 'reset' ],
                func: function () {
                    if (newset.length > 0) {
                        ch.initial(newset);
                        OK('file list and rules have been reset\n');
                        newset = [];
                    } else
                        ERR('nothing to reset; `rename\' first\n');
                }
            }
        }
    }).add(rules = {
        name: 'rules',
        set:  prepRuleForCset(rules)
    });

    // mamages readline completer
    var completer = function () {
        var drinfo = {};

        // completer function for readline
        // line = 'user input'
        var run = function (line) {
            var hit = [], comp;
            var p = parser(cset.get(), line);
            var t, last = {
                last: '',
                expect: 'cmd'
            };
            var incext;

            var esc = function (s) {
                assert(_.isString(s));
                if (/[\s\\]/.test(s))
                    s = s.replace(/([\s\\])/g, '\\$1');
                return s;
            };

            drinfo.lastr = (ctx.isSet())? ctx.name(): null;

            cset.push();
            incext = drinfo.incext;
            while ((t = p.token(true)).last !== null) {
                last = t;
                if (t.cmd) {
                    t = cset.cmd(t.cmd);
                    if (t) {
                        if (_.isFunction(t.chcset)) {
                            t.chcset(drinfo);
                            p.cmdset(cset.get());
                        }
                        if (_.isFunction(t.chext))
                            t.chext();
                    }
                }
            }
            if (last)
                switch (last.expect) {
                    case 'param':
                        comp = ch.peek(ctx.current()).collect('file').process(function (f) {
                            return esc((drinfo.incext)? f: global.extension(f)[0]);
                        });
                        (function () {
                            var n, s, h = {};
                            if (!last.last)
                                return;
                            for (var i = 0; i < comp.length; i++) {
                                n = comp[i].indexOf(last.last);
                                if (n >= 0 && !h[s=comp[i].substring(n)]) {
                                    hit.push(s);
                                    h[s] = true;
                                }
                            }
                        })();
                        break;
                    case 'file':
                        (function () {
                            var d, f, stat;

                            d = (last.last && path.dirname(last.last)) || '.'+path.sep;
                            f = (last.last && path.basename(last.last)) || '';
                            if (f[f.length-1] === path.sep) {
                                d += path.sep + f;
                                f = '';
                            }
                            try {
                                comp = fs.readdirSync(d).alphanumSort();
                                comp.process(function (file) {
                                    try {
                                        stat = fs.statSync(d+path.sep+file);
                                        if (stat.isDirectory())
                                            file += path.sep;
                                    } catch(e) {
                                    }
                                    return esc(file);
                                });
                                if (f) {
                                    hit = comp.filter(function (c) {
                                        return (c.indexOf(f) === 0);
                                    });
                                    last.last = f;
                                }
                            } catch(e) {
                                comp = [];
                            }
                        })();
                        break;
                    default:
                        comp = _.keys(cset.get()).process(function (cmd) {
                            return cmd + ' ';
                        }).sort();
                        if (last.last)
                            hit = comp.filter(function (c) {
                                return (c.indexOf(last.last) === 0);
                            });
                        else
                            last.last = '';
                        break;
                }
            drinfo.incext = incext;
            cset.pop();

            return [((hit.length > 0)? hit: comp), last.last];
        };

        // gets or sets extension-inclusion flag for auto-completion
        // optional incext = true/false
        var ext = function (incext) {
            if (_.isUndefined(incext))
                return !!drinfo.incext;
            else
                drinfo.incext = !!incext;

            return this;
        };

        return {
            run: run,
            ext: ext
        };
    };

    setGlobal({
        COMPLETER: completer(),
    });

    rl = readline.createInterface(process.stdin, process.stdout, COMPLETER.run);
    rl.setPrompt(prompt);
    rl.prompt();

    p = parser(cset.get());

    rl.on('line', function(line) {
        var cmd, t;

        p.start(line);
        while ((t = p.token()).cmd) {
            cmd = cset.cmd(t.cmd);
            cmd.func(t.param);
            if (_.isFunction(cmd.chcset))
                p.cmdset(cset.get());
            if (_.isFunction(cmd.chext))
                cmd.chext();
            if (newset.length > 0)
                WARN('you need to `%c\' file list and rules after `%c\'\n', 'reset', 'rename');
        }
        if (t.last && t.expect === 'cmd' && !cset.cmd(t.last))
            ERR('invalid command `%c\'\n', t.last.trim());
        else if (t.last !== null)
            ERR('missing arguments\n');
        rl.setPrompt(prompt);
        rl.prompt();
    }).on('close', function () {
        exit();
    });
})();

// end of quokka.js
