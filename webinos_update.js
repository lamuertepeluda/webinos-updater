var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var prompt = require("prompt");

var WEBINOS_DIR = 'WEBINOS';
var webinosMainDirectory = path.resolve(process.env.HOME, WEBINOS_DIR);


process.chdir(webinosMainDirectory);

function updateProject(projectDirectory, dirname, index) {
  var isWebinos = dirname.match(/webinos-/g) || dirname.match(/hub-/g);
  //console.log(index + ") Dir:", projectDirectory.bold.blue, isWebinos ? ("YES").bold.green : ("NO").bold.red);
  if (isWebinos) {
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
        if (childOutput.replace(/\r?\n|\r/g, '') === "Already up-to-date.")
          console.log(dirname.yellow + " status:", ("up to date").green);
      }
    });


//    updateProc.on('close', function() {
//      console.log("webinos project: " + dirname + (" exited correctly").bold.green + "\n");
//    });
  }
}

(function() {

  fs.readdir(webinosMainDirectory, function(err, files) {
    if (err) {
      console.error("Cannot read webinos main directory", err.red);
    }
    else {
      var k = 0;
      for (var i = 0; i < files.length; i++) {
        (function(i, file) {
          var filePath = path.resolve(file);
          fs.stat(filePath, function(err, stats) {
            if (!err && stats.isDirectory()) {
              updateProject(filePath, file, k++);
            }
          });
        })(i, files[i]);
      }
    }
  });
})();