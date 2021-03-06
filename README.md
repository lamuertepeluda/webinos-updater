webinos-updater
===============

A couple of node.js tool scripts to keep all your webinos-* and hub-* repositories and their optional API dependencies up-to-date with a single command, and to facilitate building test apks.

**Setup**

These scripts assume that all your webinos-related cloned folders are placed under $HOME/WEBINOS/.

#webinos-update

To change the main directory, just modify update_config.json properly.

The script scans the main directory and tries a git pull on each webinos-* and hub-* folder and their node_modules subfolders, then prompts a short report.


**Usage:**
```shell
$node webinos_update
```

#make_apks

This script embeds a webinos app in the webinos apk, so that it will be accessible from your device by opening:

localhost:8080/``<name>`` in Chrome from Android

**Usage:**
```shell
$node make_apks
```

This script will build one apk per given webinos-android profile name (see [here](https://github.com/webinos/webinos-android#build-webinos-android-with-ant)).
Latest PZP should ask for device type and name when enrolling a new device. 

The generated apks will be copied in a deploy directory, e.g. a webserver directory.


All the configurations are in apk_config.json. Change it accordingly with your setup.

Most important keys are:

* deployDirectory: is the destination directory where the generated apk will be copied, with name webinos-``<profileName>``.apk
* webinosApps: is an array of webinos applications you wish to embed. For each app configuration, "name" is the destination folder name into android pzp web_root, "path" is the source folder for the app code, and "resources" are files and folder that are to be copied.


**Caution**

This software is not deeply tested yet/under development: use at your own risk! **Never tested on Windows**.

**Disclaimer**

These tools are not part of the webinos project, but were created to help contributing developers like me to easily keep their platform and applications up-to-date.

