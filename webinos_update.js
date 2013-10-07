#!/usr/bin/env node
/**
 * Update all webinos repositories
 */

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var prompt = require("prompt");

var settings = JSON.parse(fs.readFileSync('update_config.json'));

//all webinos-* and hub-* projects must be under this directory
var WEBINOS_PROJ_DIR = settings.globals.webinosProjectDirectory;

var webinosMainDirectory = path.resolve(process.env.HOME, WEBINOS_PROJ_DIR);
process.chdir(webinosMainDirectory);

var MAX_DEPTH = 5; //max depth of webinos dependency
var counter = 0;
var updated = [];

//call git pull for each project directory
function updateWebinosProject(projectDirectory, dirname, level) {
  console.log("Checking", projectDirectory, "for updates...");
  var updateProc = childProcess.spawn('git', ['pull'], {
    cwd: projectDirectory
  });
  updateProc.on('error', function(err) {
    console.log(("Error updating webinos project: " + dirname).red, err);
  });
  var childOutput = '';
  updateProc.stdout.on('data', function(chunk) {
    if (chunk) {
      childOutput += chunk;
    }
  });
  updateProc.stdout.on('end', function() {
    if (childOutput.length > 0)
    {
//      if (childOutput.replace(/\r?\n|\r/g, '') === "Already up-to-date.") {
      if (childOutput.search("Already up-to-date.") === 0) {
        console.log(dirname.yellow + " status:", ("up to date").green);
      }
      else {
        console.log("Updating ---->", dirname.yellow.bold);
        console.log(childOutput);
        updated.push(projectDirectory);
//        var match = childOutput.match(/remote: Counting objects: (\d)+, done./);
//        if (match && match.index === 0) {
//          updated.push(projectDirectory);
//        }
      }
    }
  });
//    updateProc.on('close', function() {
//      console.log("update process on: " + dirname + (" exited correctly").bold.green + "\n");
//    });

  //update API and other stuff in subfolders
  var node_modules = path.join(projectDirectory, 'node_modules');
  fs.exists(node_modules, function(exists) {
    if (exists) {
      console.log(" Entering level", level, ":", node_modules.magenta);
      process.chdir(node_modules);
      scanDirectory(node_modules, level + 1);
    }
  });
}

//select webinos-* and hub-* directories, then update them
function searchForWebinosDirectories(file, level) {
  var filePath = path.resolve(file);
  fs.stat(filePath, function(err, stats) {
    if (!err && stats.isDirectory()) {

      var isWebinos = file.match(/webinos-/g) || file.match(/hub-/g);
      //    console.log(filePath.bold.blue, "is a webinos project?", isWebinos ? ("YES").bold.green : ("NO").bold.red);
      if (isWebinos) {
        counter++;
        updateWebinosProject(filePath, file, level);
      }
    }
  });
}

//scan directory dirname
//starting at level level
function scanDirectory(dirname, level) {
  if (level <= MAX_DEPTH) {
    fs.readdir(dirname, function(err, files) {
      if (err) {
        console.error("Cannot read " + dirname + ":", err.red);
      }
      else {
        for (var i = 0; i < files.length; i++) {
          searchForWebinosDirectories(files[i], level + 1);
        }
      }
    });
  }
}

//Go!
scanDirectory(webinosMainDirectory, 0);


process.on('exit', function() {
  console.log(("\n******************************************************".rainbow.bold));
  console.log("Exiting. Found", counter, "webinos folders, ", updated.length, " updated.");
  updated.forEach(function(folderName) {
    console.log(folderName.yellow.bold, "was updated.", ("Please run any required action in its folder (grunt, gyp-build, npm-install, whatever...)").underline);
  });
});