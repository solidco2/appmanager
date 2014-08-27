(function(){
    var q = 0;
    var reqlist = {};

    window.less = { env : "development" };
    requirejs(["/res/less.js"]);

    function socketReady(socket){
    };

    define(["/socket.io/socket.io.js"], function(io){
        var socket = io(location.origin);
        var shellMode = false;
        socket.on("ready", function(){
            document.body.className = "connect";
            socketReady(socket);
        });
        socket.on("reconnecting", function(e){
            document.body.className = "disconnect";
            shellMode = false;
        });
        socket.on("shell", function(obj){
            console.log(obj);
            ul.innerHTML += obj.replace(/\n/g, "<br />");
            inp.scrollIntoView();
        });
        socket.on("answer", function(obj){
            if(reqlist[obj.id]){
                var callback = reqlist[obj.id];
                if(!obj.keepAlive){
                    delete reqlist[obj.id];
                }
                return callback(obj.data);
            }else{
                if(obj.shellMode){
                    shellMode = true;
                }
            }
        });
        socket.on("password", function(){
            var div = document.createElement("div");
            div.className = "login";
            div.addEventListener("keypress", function(e){
                if(e.target.nodeName.toLowerCase() == "input" && e.keyCode == 13){
                    var val = e.target.value;
                    socket.emit("password", val);
                }
            });
            div.innerHTML = [
                "<h2>请输入密码，J.</h2>",
                "<input type=password>"
            ].join("");
            document.body.appendChild(div);
            div.getElementsByTagName("input")[0].focus();
        }).on("ok", function(){
            document.body.removeChild(document.body.getElementsByClassName("login")[0]);
            inp.focus();
        });
        function request(cmd, callback){
            var id = ++q;
            reqlist[id] = callback;
            socket.emit("request", {
                id : id,
                cmd : cmd
            });
        };
        var ul = document.createElement("ul");
        document.body.appendChild(ul);
        var inp = document.createElement("input");
        document.body.appendChild(inp);
        inp.addEventListener("keydown", function(e){
            if(e.keyCode == 13){
                var v = inp.value;
                if(v){
                    inp.value = "";
                    var li = document.createElement("li");
                    li.innerHTML = v;
                    li.style.color = "#77FFAA";
                    ul.appendChild(li);
                    if(shellMode){
                        socket.emit("shell",v);
                    }else{
                        request(v, function(data){
                            var li = document.createElement("li");
                            li.innerHTML = data.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br />");
                            ul.appendChild(li);
                            inp.scrollIntoView();
                        });
                    }
                }
            }
        });
        document.addEventListener("click", function(e){
            if(e.target == document.documentElement){
                inp.focus();
            }
        });
    });
})();
