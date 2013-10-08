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

//Load settings from config file
var settings = JSON.parse(fs.readFileSync('apk_config.json'));

//all webinos-* and hub-* projects must be under this directory
var WEBINOS_PROJ_DIR = settings.globals.webinosProjectDirectory;

var webinosMainDirectory = path.resolve(process.env.HOME, WEBINOS_PROJ_DIR);
process.chdir(webinosMainDirectory);

var WEBINOS_ANDROID_DIR = settings.globals.webinosAndroidDirectory;
var WEBINOS_ANDROID_BUILD_CFG_FILE = "config_profiles.json";
var WEBINOS_ANDROID_NODE_MODULES = "node_modules";
var WEBINOS_ANDROID_WEB_ROOT_DIR = "node_modules/webinos-pzp/web_root";
var WEBINOS_ANDROID_APK = "bin/webinos-android-debug.apk";
var DEPLOY_DIR = settings.globals.deployDirectory;

var buildCfgFilePath = path.join(WEBINOS_ANDROID_DIR, WEBINOS_ANDROID_BUILD_CFG_FILE);
var androidNodeModulesPath = path.join(WEBINOS_ANDROID_DIR, WEBINOS_ANDROID_NODE_MODULES);
var webRootPath = path.join(WEBINOS_ANDROID_DIR, WEBINOS_ANDROID_WEB_ROOT_DIR);
var apkPath = path.join(WEBINOS_ANDROID_DIR, WEBINOS_ANDROID_APK);

//Build profiles to be used
var buildProfiles = settings.buildProfiles;
//webinos-android config file
var androidConfig = JSON.parse(fs.readFileSync(buildCfgFilePath));

//webinos apps to be included
var webinosApps = settings.webinosApps;

/**
 * Callback that creates webapp destination directory
 * under webinos-android pzp web_root
 * @param {type} webAppDestPath
 * @param {type} webAppCfg
 * @param {type} next
 * @returns {undefined}
 */
function createWebAppDirectory(webAppDestPath, webAppCfg, next) {
  var webAppSrcPath = path.join(webinosMainDirectory, webAppCfg.path);
  fs.mkdir(webAppDestPath, function(err) {
    if (err)
      throw err;
    var resourcesLength = webAppCfg.resources.length;
    if (resourcesLength === 1 && webAppCfg.resources[0] === '*') {
      ncp(webAppSrcPath, webAppDestPath, function(err) {
        if (err)
          throw err;
      });
    } else {
      for (var i = 0; i < resourcesLength; i++) {
        var src = path.join(webAppSrcPath, webAppCfg.resources[i]);
        ncp(src, path.join(webAppDestPath, webAppCfg.resources[i]), function(err) {
          if (err)
            throw err;
        });
      }
    }
    console.log((webAppCfg.name + " updated...").cyan);
    if (next) {
      next();
    }
  });
}


//Copy stuff into android pzp web_root
function updateWebApp(webAppCfg, next/*, iter*/) {
  var webAppDestPath = path.join(webRootPath, webAppCfg.name);
  fs.exists(webAppDestPath, function(exists) {
    if (exists) {
      remove(webAppDestPath, function(err) {
        if (err)
          throw err;
        createWebAppDirectory(webAppDestPath, webAppCfg, next);
      });
    }
    else {
      createWebAppDirectory(webAppDestPath, webAppCfg, next);
    }
  });
}

/**
 * Run NPM Install into webinos-android
 * @param {type} config - empty obj
 * @param {type} next
 * @returns {undefined}
 */
function updateNPM(config, next) {
  var npmProcess = childProcess.spawn('npm', ['install'], {
    cwd: WEBINOS_ANDROID_DIR
  });
  npmProcess.stdout.setEncoding('utf8');
  npmProcess.on('error', function(err) {
    console.log(("npm install error:").red, err);
  });

  npmProcess.on('close', function() {
    console.log(("npm install completed").blue.bold);
    if (next) {
      next();
    }
  });
}

/**
 *  cd $webinosAndroidFolder
 *  ant anode webinos-deps -Ddevice=profileName clean debug
 * @param {type} profileName
 * @param {type} onEnd
 * @returns {undefined}
 */
function _buildApk(profileName, onEnd) {
  console.log(("webinos-android clean!").yellow);
  //Copy web applications into web_root folder
  var actions = [];
  actions.push(updateNPM);
  webinosApps.forEach(function() {
    actions.push(updateWebApp);
  });
  actions.push(
    function() { //finally
      console.log(("All web apps copied into web_root and up-to-date...").cyan.bold);
      console.log(("Starting build for profile:" + profileName).yellow);
      var buildProcess = childProcess.spawn('ant', ['anode', 'webinos-deps', '-Ddevice=' + profileName, 'clean', 'debug'], {
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
      });

      buildProcess.on('close', function() {
        console.log(("Build for profile:" + profileName + " completed").green.bold);
        if (onEnd) {
          onEnd();
        }
      });
    });
  //first action doesn't require a config object
  doSequentially(actions, [{}].concat(webinosApps));
}


/*
 *
 * clean and build apk
 */
function buildApk(profileName, onEnd) {
  fs.exists(androidNodeModulesPath, function(exists) {
    if (exists) {
      //Remove node_modules (safest way to clean anode)
      remove(androidNodeModulesPath, function(err) {
        if (err)
          throw err;
        _buildApk(profileName, onEnd);
      });
    }
    else {
      _buildApk(profileName, onEnd);
    }
  });
}


function buildApplications() {
  var profileActions = [];
  buildProfiles.forEach(function(profile) {
    profileActions.push(function(elem, next) {
      console.log(("gonna build application for " + profile).magenta.bold);
      buildApk(profile, function() {
        var deployPath = path.join(DEPLOY_DIR, 'webinos-' + profile + '.apk');
        //move product to deploy dir
        fs.rename(apkPath, deployPath, function() {
          if (next)
          {
            next();
          }
        });
      });
    });
  });
  profileActions.push(function() { //finally
    console.log(("All .apk files built ...").yellow.bold);
  });
  doSequentially(profileActions, buildProfiles);
}


//main
function main() {
  buildApplications();
//  //1 - prepare web content
//  var actions = [];
//  webinosApps.forEach(function() {
//    actions.push(updateWebApp);
//  });
//  actions.push(
//    function() { //finally
//      console.log(("All web apps updated...").cyan.bold);
//      buildApplications();
//    });
//  doSequentially(actions, webinosApps);
}

main();