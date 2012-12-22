quokka: An Interactive File Renamer
===================================

`quokka` is an interactive file renamer, which helps to rename multiple files
in a systematic manner.

  <div class="center">
    <a href="http://code.woong.org/img/quokka-sc.png">
      <img src="http://code.woong.org/img/quokka-sc.png"
        alt="quokka's screenshot"
        style="display:block; margin-left:auto; margin-right:auto" />
    </a>
  </div>

It provides a set of rules:

- to change letter case (`#case`)
- to delete characters at a specified position (`#delete`)
- to change file extensions (`#extension`)
- to insert a text into a specified position (`#insert`)
- to remove a text (`#remove`)
- to replace a text (`#replace`)
- to serialize file names (`#serialize`)
- to strip a set of characters off (`#strip`) and
- to import lines of a file for insertion (`#import`)

with options for fine control. You can combine these rules as you want by
adding them into the rule chain. Editing each rule and the rule chain is
performed interactively as you do in a shell prompt. The following, for
example, shows how to rename files' extensions to `.node` using `quokka`:

    > #extension
    entering '#extension'

    #extension> change to node
    file extensions will change to 'node'

    #extension> preview
    current rule being edited
    -------------------------
    change extensions to 'node' not using limit

    files will be renamed as follows when you type 'done' and 'rename'
    ------------------------------------------------------------------
    ./alphanum.js  | ./alphanum.node
    ./global.js    | ./global.node
    ./mycolors.js  | ./mycolors.node
    ./validator.js | ./validator.node

    #extension> done
    files will be renamed as follows when you type 'rename'
    -------------------------------------------------------
    ./alphanum.js  | ./alphanum.node
    ./global.js    | ./global.node
    ./mycolors.js  | ./mycolors.node
    ./validator.js | ./validator.node

    > rename
    files are being renamed
    -----------------------
    ./alphanum.js  | ./alphanum.node  [ok]
    ./global.js    | ./global.node    [ok]
    ./mycolors.js  | ./mycolors.node  [ok]
    ./validator.js | ./validator.node [ok]

    4 files successfully renamed
    you need to 'reset' file list and rules after 'rename'

    > exit

where `>` indicates a `quokka`'s prompt and `#extension` before it shows the
user is editing the `#extension` rule. Typing `help` lists what commands
`quokka` accepts in general and in a specific rule mode. (In fact, `quokka`
displays characters in color for readability; see the screenshot above.)

Even if its source code contains some stuff related to MS Windows, it currently
supports and is tested only for UNIX-like environments. For now, nothing is
guaranteed for MS Windows.

`INSTALL.md` explains how to build and install the program. For the copyright
issues, see the accompanying `LICENSE.md` file.

Among libraries used, `alphanum.js` has been modified to meet `quokka`'s needs;
it has been modified to behave in a more similar way to `ls -v` and to return
the sorted array instead of nothing. If you need to replace that module with,
say, a updated one, it is necessary to apply these changes properly.

###Usage Tips

A few useful tips follow below.

1. Sort files in a natural order

  The `-v` option makes `quokka` behave in the same way as `ls -v` when
  sorting file names; it affects how numbers in file names are handled. Without
  the option, `quokka` performs lexicographic comparison which puts, say,
  `img10` before `img2` because `1` has a smaller code than `2` has. This looks
  natural to most (if not all) programmers, but ordinary users would like to
  place `10` after `2`, which the `-v` option does.

2. Control the sorting order

  `quokka` can accept file names to rename from an external file given through
  the `-f` option. For example, you can edit the file obtained from redirection
  of `ls -t -1` (where `-t` for sorting by modification time and `-1` for
  displaying only file names) and give it to `quokka` with the `-f` option.

3. One-line multiple-command

  `quokka` is designed to accept multiple commands in a line. For example, you
  can change files' extensions to `docx` by this one-line input:

        > #extension change to docx done rename

  instead of these multiple lines:

        > #extension
        #extension> change to docx
        #extension> done
        > rename

  The thing is that the newline character does not differ from other
  white-spaces in separating commands.

4. Names with embedded spaces

  The earlier versions of `quokka` used quotation for spaces embedded in file
  names. This approach made troubles with `readline`'s auto-completion
  supported by `node.js`, and had me choose to escape spaces with a leading
  backslash. Since the backslash character is now used for escaping spaces, it
  is necessary to escape backslashes themselves. For example,

        #replace> replace \  .

  makes `quokka` replace a space with a period (_note_ the space after `\`),
  and

        #strip> strip \\

  does `quokka` strip off all instances of `\`. In most cases, the smart
  auto-completion explained below helps you not to forget escaping spaces.

5. Smart auto-completion

  The recent versions of `quokka` support the smart auto-completion that is
  _smart_ in the sense that it is aware of the input context and suggests
  appropriate words. For example, pressing a `tab` key after `HDTV` when
  `quokka` expects arguments for the `replace` command shows every partial
  string starting with `HDTV` in file names to rename. This helps you to
  avoid annoying use of your mouse to copy characters from your terminal
  screen.

If you have a question or suggestion, do not hesitate to contact me via email
(woong.jun at gmail.com) or web (http://code.woong.org/).
