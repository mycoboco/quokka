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
- to serialize file names (`#serialize`) and
- to strip a set of characters off (`#strip`)
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

where the `>` indicates a `quokka`'s prompt and `#extension` before it does the
user is editing the `#extension` rule. Typing `help` shows what commands
`quokka` accepts in general and in a specific rule mode. (In fact, `quokka`
displays characters in color for readability; see the screenshot linked above.)

Even if its source code contains some stuff realted to MS Windows, it currently
supports and is tested only for UNIX-like environments. For now, nothing is
guranteed for MS Windows.

`INSTALL.md` explains how to build and install the program. For the copyright
issues, see the accompanying `LICENSE.md` file.

Among libraries used, `alphanum.js` has been modified to meet `quokka`'s needs;
it has been modified to behave in a more similar way to `ls -v` and to return
the sorted array instead of nothing. If you need to replace that module with,
say, a updated one, it is necessary to apply these changes properly.

If you have a question or suggestion, do not hesitate to contact me via email
(woong.jun at gmail.com) or web (http://code.woong.org/).
