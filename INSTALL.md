How to build and install quokka
===============================

This package does not provide an automated way to build or install the program
except using [`npm`](https://npmjs.org/package/quokka) because `quokka` runs on
top of [`node.js`](https://nodejs.org). If you have `node.js` on your system,

    npm install --legacy-bundling quokka

brings and installs `quokka` with its all depending packages.

_The `--legacy-bundling` option is necessary when using `npm3` because, without
it, dependent modules will be installed at the same nesting level as `quokka`
into `node_modules`._

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
