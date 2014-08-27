var jade = require("jade");
var http = require("http");
var path = require("path");
var fs = require("fs");

const JADE_PATH = __dirname + "/tpl";
const DEFAULT = "";
const DEFAULT_JADE_NAME = "default";
const UNDEFINED_JADE_NAME = "undefined";

const MIME = {
    ".less" : "text/css",
    ".css" : "text/css",
    ".js"  : "application/x-javascript"
};

var tplConf = {
    pretty : true,
    //debug : true,
    compileDebug : true
};

var getTpl = function tpl(name) {
    tpl.map = tpl.map || {};
    if (!tpl.map.hasOwnProperty(name)) {
        var path = JADE_PATH + "/" + name + ".jade";
        var tplFn = jade.compileFile(path, tplConf);
        tpl.map[name] = {
            name : name,
            path : path,
            tpl : tplFn
        };
    }
    return tpl.map[name].tpl;
};

var defaultAction = exports = module.exports = function(code, req, res){
    res.writeHeader(code);
    var tpl = getTpl(UNDEFINED_JADE_NAME);
    res.end(tpl({
        code : code,
        status : http.STATUS_CODES[code] || http.STATUS_CODES[500]
    }));
};

var gets = exports["get"] = {};
gets[DEFAULT] = function(req, res){
    var tpl = getTpl(DEFAULT_JADE_NAME);
    res.end(tpl({
        app : {
            runtime : {
                actions : this.actions
            }
        }
    }));
};

gets["res"] = function(req, res){
    var file = path.resolve(__dirname + "/" + this.pathname);
    fs.readFile(file, function (err, buff) {
        if (err) {
            defaultAction(404, req, res);
        } else {
            var mime = MIME[path.extname(file)];
            if (mime) {
                res.setHeader("Content-Type", mime);
            }
            res.write(buff);
            res.end();
        }
    });
};

