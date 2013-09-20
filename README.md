webinos-updater
===============

A node.js tool to update all your webinos-* and hub-* repositories and their optional API dependencies with a single command.

This assumes that all your webinos-related cloned folders are placed under $HOME/WEBINOS/. 

To change the main directory, please modify line 7 of webinos_update.js

The script scans the main directory and tries a git pull on each webinos-* and hub-* folder and their node_modules subfolders, then prompts a short report.


**Usage:**
```shell
$node webinos_update
```

**Caution**

Not deeply tested yet: use at your own risk! Never tested on Windows.

**Disclaimer**

This tool is not part of the webinos project, but was created to help contributing developers like me to easily keep their platform and applications up-to-date.
