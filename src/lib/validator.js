/*
 *  file name validator
 */

var assert = require('assert');
var path = require('path');

var _ = require('../../node_modules/underscore');

// validates file names
// kind = 'system name'
module.exports = function (kind) {
    var sel,
        checkset = {
        'unix-like': {
            invalid:   [ path.sep, '\0' ],
            reserved:  [ ],
            special:   [ '.', '..' ],
            length:    255,
            refrained: [ '\\', '?', '%', '*', ':', '|', '"', '<', '>' ]
        },
        'windows-ntfs': {
            invalid:   [ path.sep, '/', '\0', '\x01', '\x02', '\x03', '\x04', '\x05', '\x06',
                         '\x07', '\x08', '\x09', '\x0A', '\x0B', '\x0C', '\x0D', '\x0E', '\x0F',
                         '\x10', '\x11', '\x12', '\x13', '\x14', '\x15', '\x16', '\x17', '\x18',
                         '\x19', '\x1A', '\x1B', '\x1C', '\x1D', '\x1E', '\x1F', '"', ':', '<',
                         '>', '?', '|' ],
            reserved:  [ '$AttrDef', '$BadClus', '$Bitmap', '$Boot', '$LogFile', '$MFT', '$MFTMirr',
                         'pagefile.sys', '$Secure', '$UpCase', '$Volume', '$Extend', '$Extend',
                         '$ObjId', '$Quota', '$Reparse', 'AUX', 'CLOCK$', 'COM1', 'COM2', 'COM3',
                         'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'CON', 'LPT1', 'LPT2',
                         'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9', 'NUL', 'PRN' ],
            special:   [ '.', '..' ],
            length:    255,
            refrained: [ '%', '*' ]
        }
    };

    kind = kind || 'unix-like';
    sel = checkset[kind];

    // checks if base name is valid
    // name = 'base name'
    var isInvalid = function (name) {
        assert(_.isString(name));

        name = name.trim();

        if (!name)
            return {
                name: 'invalid',
                msg:  'empty file name not allowed',
                what: ''
            };
        for (var i = 0; i < sel.invalid.length; i++)
            if (name.contains(sel.invalid[i]))
                return {
                    name: 'invalid',
                    msg:  'invalid character `%v\' encountered in file name',
                    what: sel.invalid[i]
                };
        for (var i = 0; i < sel.special.length; i++)
            if (name === sel.special[i])
                return {
                    name: 'invalid',
                    msg:  '`%v\' cannot be used for file name',
                    what: sel.special[i]
                };
        if (name.length > sel.length)
            return {
                name: 'invalid',
                msg:  'file name is too long',
                what: ''
            };
        for (var i = 0; i < sel.reserved.length; i++)
            if (name.startsWith(sel.reserved[i]))
                return {
                    name: 'reserved',
                    msg:  '`%v\' is a reserved word',
                    what: sel.reserved[i]
                };
        for (var i = 0; i < sel.refrained.length; i++)
            if (name.contains(sel.refrained[i]))
                return {
                    name: 'refrained',
                    msg:  'using `%v\' is discouraged',
                    what: sel.refrained[i]
                };

        return null;
    };

    // checks if names conflict
    // set = [ 'file name', ... ]
    // name = 'file name'
    var conflict = function (set, name) {
        var i;

        assert(_.isArray(set));

        for (i = 0; i < set.length; i++) {
            assert(_.isString(set[i]));
            if (set[i] === name)
                return {
                    name: 'conflict',
                    msg:  'file names conflict after rename',
                    what: ''
                };
        }

        return null;
    };

    return {
        isInvalid: isInvalid,
        conflict:  conflict
    };
};

// end of validator.js
