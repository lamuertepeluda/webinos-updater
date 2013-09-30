#!/usr/bin/env node
/**
 * Usage: node make_apks
 * Create an APK per targetDevice embedding each appName in its PZP
 * Then copy it to the web folder
 */



/**
 * Auxiliary function for doSequentially
 * @param {Array} callbacks array of functions
 * @param {Array} array array of arguments
 * @param {Number} i current iteration
 * @param {Number} maxIterations limit of iterations
 */
function _doSequentially(callbacks, array, i, maxIterations)
{
  var nextI = i + 1;
  if (nextI <= maxIterations)
  {
    callbacks[i](array[i], function() {
      _doSequentially(callbacks, array, nextI, maxIterations);
    }, i);
  }
  else {
    if (callbacks[nextI])
      callbacks[nextI]();
  }
}

/**
 * Sequentially execute callbacks on an array of arguments
 * when including a final callback
 * callbacks have this proto: f(elem,nextCallBack,iterationIndex)
 *
 * @param {Array} callbacks array of functions
 * @param {Array} arrayOfArguments array of arguments
 */
function doSequentially(callbacks, arrayOfArguments) {
  var iStart = 0;
  var maxIters = callbacks.length;
  _doSequentially(callbacks, arrayOfArguments, iStart, maxIters);
}

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var inspect = require('util').inspect;

var prompt = require('prompt');
var ncp = require('ncp').ncp;
var remove = require('remove');

var WEBINOS_PROJ_DIR = 'WEBINOS'; //all webinos-* and hub-* projects must be under this directory
var webinosMainDirectory = path.resolve(process.env.HOME, WEBINOS_PROJ_DIR);
process.chdir(webinosMainDirectory);

var WEBINOS_ANDROID_DIR = "webinos-android";
var WEBINOS_ANDROID_DEVSTATUS_CFG_FILE = "node_modules/webinos-api-deviceStatus/config.json";
var WEBINOS_ANDROID_WEB_ROOT_DIR = "node_modules/webinos-pzp/web_root";
var WEBINOS_ANDROID_APK = "bin/webinos-android-debug.apk";
var DEPLOY_DIR = "/home/vito/Pubblici/webinos";

var devStatusCfgFilePath = path.join(WEBINOS_ANDROID_DIR, WEBINOS_ANDROID_DEVSTATUS_CFG_FILE);
var webRootPath = path.join(WEBINOS_ANDROID_DIR, WEBINOS_ANDROID_WEB_ROOT_DIR);
var apkPath = path.join(WEBINOS_ANDROID_DIR, WEBINOS_ANDROID_APK);
//target device types
var targetDeviceTypes = [
  'tablet',
  'phone'
];

//webinos apps to be included
var webinosApps = [{
    name: "webinosTV", //output name
    path: "hub-webinosMediaCenter/webinosTV", //path
    resources: [//stuff to be copied in
      'index.html',
      'dist',
      'css',
      'fonts',
      'movies'
    ]
  }];


//Copy stuff into android pzp web_root
function updateWebApp(webAppCfg, next/*, iter*/) {
  var webAppDestPath = path.join(webRootPath, webAppCfg.name);
  var webAppSrcPath = path.join(webinosMainDirectory, webAppCfg.path);
  remove(webAppDestPath, function(err) {
    if (err)
      throw err;
    fs.mkdir(webAppDestPath, function(err) {
      if (err)
        throw err;
      for (var i = 0; i < webAppCfg.resources.length; i++) {
        var src = path.join(webAppSrcPath, webAppCfg.resources[i]);
        ncp(src, path.join(webAppDestPath, webAppCfg.resources[i]), function(err) {
          if (err)
            throw err;
        });
      }
      console.log((webAppCfg.name + " updated...").cyan);
      if (next) {
        next();
      }
    });
  });
}


/*
 *
 cd $webinosAndroidFolder
 ant anode clean debug
 */
function buildApk(target, onEnd) {
  console.log(("Starting build for " + target).yellow);
  var buildProcess = childProcess.spawn('ant', ['anode', 'clean', 'debug'], {
    cwd: WEBINOS_ANDROID_DIR
  });
  buildProcess.stdout.setEncoding('utf8');
  buildProcess.on('error', function(err) {
    console.log(("Anode Build Error").red, err);
  });

//  var childOutput = '';
  buildProcess.stdout.on('data', function(chunk) {
    console.log(chunk);
//    if (chunk) {
//      childOutput += chunk;
//    }
  });
  buildProcess.stdout.on('end', function() {
    console.log('***********************************************'.rainbow.bold);
//    if (childOutput.length > 0)
//    {
//      console.log(("Anode Build Completed").green, childOutput);
//    }
  });

  buildProcess.on('close', function() {
    console.log(("Build for " + target + " completed").green.bold);
    if (onEnd) {
      onEnd();
    }
  });

}



function buildApplicationForTarget(targetDeviceType, onEnd) {
  //change config file
  var androidConfig = JSON.parse(fs.readFileSync(devStatusCfgFilePath));
  androidConfig.params.devicetype = targetDeviceType;
  fs.writeFile(devStatusCfgFilePath, JSON.stringify(androidConfig), function() {
    //build anode
    buildApk(targetDeviceType, function() {
      var deployPath = path.join(DEPLOY_DIR, 'webinos-' + targetDeviceType + '.apk');
      //move product to deploy dir
      fs.rename(apkPath, deployPath, function() {
        if (onEnd)
        {
          onEnd();
        }
      });
    });
  });
}

function buildApplications() {
  var targetActions = [];
  targetDeviceTypes.forEach(function(target) {
    targetActions.push(function(elem, next) {
      console.log(("gonna build application for " + target).magenta.bold);
      buildApplicationForTarget(target, next);
    });
  });
  targetActions.push(function() { //finally
    console.log(("All .apk files built ...").yellow.bold);
  });
  doSequentially(targetActions, targetDeviceTypes);
}


//main
function main() {
  //1 - prepare web content
  var actions = [];
  webinosApps.forEach(function() {
    actions.push(updateWebApp);
  });
  actions.push(
    function() { //finally
      console.log(("All web apps updated...").cyan.bold);
      buildApplications();
    });
  doSequentially(actions, webinosApps);
}

main();