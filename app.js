#!/usr/bin/env node

process.title = "nodeapp_node_manager";

var listen = require("./lib/listen");
var url = require("url");
var sio = require("socket.io");
var fs = require("fs");

var io = sio(listen("default", function(req, res){
    var act = require("./actions");
    var method = req.method.toLowerCase();
    if (!act.hasOwnProperty(method)) {
        act(405, req, res);
    } else {
        var met = act[method];
        var location = url.parse(req.url, true);
        var acts = location.pathname
            .replace(/^\/+|\/+$/g,"")
            .split(/\/+/g);
        req.location = location;
        location.actions = acts;
        if (met.hasOwnProperty(acts[0]) && typeof met[acts[0]] == "function") {
            met[acts[0]].call(location, req, res);
        } else {
            act(404, req, res);
        }
    }
}));


io.sockets.on("connection", function (socket) {
    var login = false;
    var shellMode = false;
    var password = process.env["APP_MANAGER_PASSWORD"] || "password";

    var child = null;
    var tailing = null;

    var proc = {
        list: function(id, args){
            if (args[0] == "refresh") {
                require("./sites").refreshList(function(data){
                    socket.emit("answer", {
                        id: id,
                        data: data.join("\t")
                    });
                });
            } else {
                var data = require("./sites").list;
                socket.emit("answer", {
                    id: id,
                    data: data.join("\t")
                });
            }
        },
        help: function(id){
            socket.emit("answer", {
                id: id,
                data: Object.keys(proc).join("\t")
            });
        },
        login: function(id){
            socket.emit("answer", {
                id: id,
                data: "ok"
            });
            socket.emit("password");
        },
        "break": function(id){
            if(tailing){
                tailing.kill();
                tailing = null;
                socket.emit("answer", {
                    id: id,
                    data: "结束监听"
                });
            }
        },
        taillog: function(id, args){
            if(args[0]){
                if(tailing){
                    socket.emit("answer", {
                        id : id,
                        data: "你正在做其他的tailing什么的，请先运行“break”"
                    });
                }else{
                    try{
                        tailing = require("./sites").get(args[0]).log("log", args.slice(1));
                        tailing.on("error", function(error){
                            console.error("error while tailerror", error, args);
                            socket.emit("answer", {
                                id: id,
                                data: "[error]查看文件失败"
                            });
                        });
                        tailing.stdout.setEncoding("utf8");
                        tailing.stdout.on("data", function(data){
                            socket.emit("answer", {
                                id: id,
                                keepAlive: true,
                                data: data
                            });
                        });
                    }catch(ex){
                        socket.emit("answer", {
                            id: id,
                            data: "[error]查看文件失败"
                        });
                        tailing = null;
                    }
                }
            }else{
                socket.emit("answer", {
                    id : id,
                    data: "参数不正确"
                });
            }
        },
        tailerror: function(id, args){
            if(args[0]){
                if(tailing){
                    socket.emit("answer", {
                        id : id,
                        data: "你正在做其他的tailing什么的，请先运行“break”"
                    });
                }else{
                    try{
                        tailing = require("./sites").get(args[0]).log("error", args.slice(1));
                        tailing.on("error", function(error){
                            console.error("error while tailerror", error, args);
                            socket.emit("answer", {
                                id: id,
                                data: "[error]查看文件失败"
                            });
                        });
                        tailing.stdout.setEncoding("utf8");
                        tailing.stdout.on("data", function(data){
                            socket.emit("answer", {
                                id: id,
                                keepAlive: true,
                                data: data
                            });
                        });
                    }catch(ex){
                        socket.emit("answer", {
                            id: id,
                            data: "[error]查看文件失败"
                        });
                        tailing = null;
                    }
                }
            }else{
                socket.emit("answer", {
                    id : id,
                    data: "参数不正确"
                });
            }
        },
        restart: function(id, args){
            if(login){
                if(args[0]){
                    try{
                        var child = require("./sites").get(args[0]).restart(args.slice(1));
                        child.on("error", function(error){
                            console.error("error while restart", args, error);
                            socket.emit("answer", {
                                id: id,
                                data: "[error]启动失败"
                            });
                        });
                        socket.emit("answer", {
                            id: id,
                            keepAlive: true,
                            data: "ok"
                        });
                        child.on("exit", function(){
                            socket.emit("answer", {
                                id: id,
                                data: "[message]您刚才运行的 [ restart " + args + " ] 进程挂掉了"
                            });
                        });
                    }catch(ex){
                        child.on("exit", function(){
                            socket.emit("answer", {
                                id: id,
                                data: "[error]启动失败"
                            });
                        });
                    }
                }else{
                    socket.emit("answer", {
                        id: id,
                        data: "参数不正确"
                    });
                }
            }else{
                socket.emit("answer", {
                    id: id,
                    data: "您没登录"
                });
            }
        }
    };
    if(false){
        proc.shell= function(id){
            if(login){
                shellMode = true;
                child = require("child_process").spawn("bash",[],{
                    stdio:["pipe","pipe","pipe"]
                });
                child.stdout.setEncoding("utf-8");
                child.stdout.on("data", function(data){
                    socket.emit("shell", data);
                });
                child.stderr.setEncoding("utf-8");
                child.stderr.on("data", function(data){
                    socket.emit("shell", data);
                });
                child.stdin.setEncoding("utf-8");
                socket.on("shell", function(data){
                    child.stdin.write(data);
                    child.stdin.write("\n");
                });
                socket.emit("answer", {
                    shellMode:true
                });
            }else{
                socket.emit("answer", {
                    id: id,
                    data: "您没登录"
                });
            }
        };
    }
    socket.emit("ready");
    socket.on("key", function (code) {
        fs.write(1, String.fromCharCode(code));
    }).on("request", function (req) {
        var cmd = req.cmd;
        var args = cmd.split(/\s+/g);
        for(var i = args.length; i--; ){
            if(!args[i]) args.splice(i,1);
        }
        if(proc.hasOwnProperty(args[0])){
            proc[args[0]](req.id, args.slice(1));
        }else{
            socket.emit("answer",{
                id:req.id,
                data:"no such command"
            });
        }
    }).on("password", function(pass){
        if(pass == password){
            login = true;
            socket.emit("ok");
        }
    }).on("disconnect", function(){
        if(child){
            child.kill();
            shellMode = false;
        }
        if(tailing){
            tailing.kill();
            tailing = null;
        }
    });

});
