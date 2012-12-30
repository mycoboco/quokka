/*
 *  rule chain
 */

var assert = require('assert');
var path = require('path');

var _ = require('../../node_modules/underscore');

var global = require('./global');
var wcwidth = require('../../node_modules/wcwidth.js')();


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
module.exports = function (init) {
    var ch,
        rules = {}, cache;

    // registers or finds a rule
    // entry = [ { name: 'rule name', desc: 'description', constructor: function () {} }, ... ] or
    //         'rule name to find'
    var rule = function (entry) {
        var i;

        assert(entry);

        if (_.isString(entry)) {    // finds a rule by name
            assert(_.isFunction(rules[entry]));
            return rules[entry];
        }

        // registers a rule
        if (!_.isArray(entry))
            entry = [ entry ];

        for (i = 0; i < entry.length; i++) {
            if (rules[entry[i].name])    // already registered
                break;
            rules[entry[i].name] = entry[i].constructor;
            cache = null;    // invalidates cache for names
        }

        return this;
    };

    // gets names/descriptions of registered rules
    var ruleInfo = function () {
        if (cache)
            return cache;

        cache = rules.foreach(function (name, memo) {
            memo.push({
                name: name,
                desc: rules[name].desc
            });
            return memo;
        }, []);

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
    // r = { name: 'rule name', instance: rule object }
    var append = function (r) {
        assert(r);
        assert(r.instance);
        assert(_.isFunction(r.instance.affect));

        var prev = final();

        ch.push({
            rule: r,
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
        _rerun(Math.min(+from, +to));

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
    // r = { instance: rule object }
    var peek = function (r) {
        assert(r);
        assert(r.instance);
        assert(_.isFunction(r.instance.affect));

        assert(ch.length > 0);

        return r.instance.affect(final()).process(function (e) {
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
        ruleInfo:   ruleInfo,
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

// end of chain.js
