/**
 * Watching files and do restart
 */

"use strict";

var fs = require("fs");

exports.add = function (files, callback) {
    if (typeof files == "string") {
        files = [files];
    }

    for (var i = 0; i < files.length; i++) {
        (function (filename) {
            fs.watchFile(filename, function (curr, prev) {
                if (curr.mtime != prev.mtime) {
                    callback(filename);
                }
            });
        }(files[i]));
    }
};

exports.remove = function (filename, callback) {
    fs.unWatchFile(filename, callback);
};
