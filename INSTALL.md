How To Build and Install quokka
===============================

This package does not provide an automated way to build or install the program
except using [`npm`](http://npmjs.org/package/quokka) because `quokka` runs on
top of [`node.js`](http://nodejs.org) that is a javascript interpreter. If you
have `node.js` on your system,

    npm install quokka

brings and installs `quokka` with its all depending packages.

The simplest way to use `quokka` is just to run it using `node.js` as follows:

    $ node quokka.js <files-to-rename>

where the `$` indicates a user prompt.

In a Unix-like environment, it would be more convenient to put into a
directory like `/usr/bin` or `/usr/local/bin` a shell script that runs
`quokka`:

    #!/bin/sh

    node /path/to/quokka/quokka.js -v "$@"

or to set an alias for `node.js` running `quokka`:

    alias quokka='node /path/to/quokka/quokka.js -v'

where the `-v` option tells `quokka` to sort numbers in file names naturally.
