/**
	module listener
	use for lib, no single running
**/

var fs = require("fs");
var path = require("path");
var http = require("http");

var rundir = process.env["HOME"] + "/run";

exports = module.exports = function(appName, mainProcess){

	var server = http.createServer(mainProcess);
	var sockfile = path.normalize(rundir + "/" + appName + ".sock");

	if (path.relative(rundir, sockfile).indexOf("/") > -1) {
		throw new Error("Invalid appName [" + appName + "]");
	}

	try {
		fs.unlinkSync(sockfile);
	} catch (ex) { };

	server.listen(sockfile, function(){
		fs.chmod(sockfile, parseInt("0777", 8));
	});

	return server;

};
