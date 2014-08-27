"use strict";

var fs = require("fs");
var cp = require("child_process");
var depends = require("./lib/depends");

var appdir = process.env["HOME"] + "/app";
var logdir = process.env["HOME"] + "/log";
var validAppName = /^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$/i;


var Site = function _Site(app){
    var site = this;

    if (!(site instanceof _Site)) {
        site = Object.create(_Site.prototype);
        _Site.apply(site, arguments);
        return site;
    }

    site.app = app;
};

Site.prototype.toString = function() {
    return this.app;
};
Site.prototype.restart = function(cmd){
    cmd = cmd || [];
    var env = {
        "HOME": process.env.HOME,
        "USER": process.env.USER,
        "PATH": process.env.PATH,
        "PWD": [appdir, this.app].join("/")
    };
    if (cmd[0] == "@") {
        env["APP_MANAGER_PASSWORD"] = process.env["APP_MANAGER_PASSWORD"];
    };
    cmd[0] = (cmd[0] || "restart").replace(/\//g, ".");

    var exe = [appdir, this.app, cmd[0]].join("/");
    var args = cmd.slice(1);

    try{ fs.mkdirSync([logdir].join("/")); } catch(ex) {};
    try{ fs.mkdirSync([logdir, this.app].join("/")); } catch(ex) {};
    var out = fs.openSync([logdir, this.app, "out.log"].join("/"), "a");
    var err = fs.openSync([logdir, this.app, "err.log"].join("/"), "a");

    return cp.spawn(
        exe,
        args,
        {
            cwd:env.PWD,
            stdio:[process.stdin, out, err],
            env:env
        }
    );
    fs.close(err);
    fs.close(out);
};
Site.prototype.log = function(type, cmd){
    if (arguments.length == 1) {
        cmd = type;
        type = "log";
    }else{
        type = type || log;
    }
    var env = {
        "HOME": process.env.HOME,
        "USER": process.env.USER,
        "PATH": process.env.PATH,
        "PWD": [logdir, this.app].join("/")
    };
    var namemap = {
        "log":"out.log",
        "error":"err.log"
    };
    return cp.spawn(
        "/usr/bin/env",
        ["tail", "-f", namemap[type]],
        {
            cwd:env.PWD,
            stdio:['pipe','pipe','pipe'],
            env:env
        }
    );
};

/**
 * @callback keep null to run sync
 */
Site.search = function(callback) {
    if (callback) {
        fs.readdir(appdir, function(err, files){
            if (err) {
                callback(null);
            } else {
                var sites = filterAppName(files);
                callback(sites);
            }
        });
    } else {
        var files = fs.readdirSync(appdir);
        var sites = filterAppName(files);
        return sites;
    }
};

exports.refreshList = function (callback) {
    Site.search(function(list){
        exports.list = list;
        callback(list);
    });
};

exports.list = Site.search();

function filterAppName(files){
    var sites = [];
    for (var i = 0; i < files.length; i++) {
        if (files[i].match(validAppName)) {
            var file = files[i];
            sites.push(file);
        }
    }
    return sites;
};

exports.get = function(app){
    return new Site(app);
};

