/*
 *  common utilities
 */


// add method to constructor
Function.prototype.method = function (name, func) {
    this.prototype[name] = func;
    return this;
};


// run closure for each property
Object.method('foreach', function (closure, init) {
    var i,
        memo = init,
        keys = Object.keys(this);

    for (i = 0; i < keys.length; i++)
        memo = closure.call(this, keys[i], memo);

    return memo;
});


// processes an array
Array.method('process', function (closure) {
    var i;

    for (i = 0; i < this.length; i++)
        this[i] = closure.call(this, this[i], i);

    return this;
});


// composes a new array by collecting elements
Array.method('collect', function (name) {
    var i, r = [];

    for (i = 0; i < this.length; i++)
        r.push(this[i][name]);

    return r;
});


// truncates to integer
Number.method('integer', function () {
    return Math[(this < 0)? 'ceil': 'floor'](this);
});

// end of global.js
