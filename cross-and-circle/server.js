
var http = require('http');
var fs   = require('fs');

var i = 0;
var host = '127.0.0.1';
var port = 9000;

var viewers = 0;
var listeners = [];
var server = http.createServer(function(req,res){

              console.log(i++,req.method,req.url);

              switch (req.url) {

                case '/':
                  res.writeHead(200,{'Content-Type':'text/html'
                                    ,'Cache-Control':'no-cache'
                                    ,'Set-Cookie':['relayserver=true']
                                    });
                  fs.createReadStream('index.html').pipe(res);
                  break;

                case '/move':
                  (function(){
                    var sender = +req.headers.gameviewer;
                    var reqData = "";
                    req.on('data',function(data){

                      reqData += data.toString()

                    });

                    req.on('end',function(){

                      process.stdout.write(reqData+'\n');

                      listeners.forEach(function(res,viewer){

                        if (viewer===sender) return; // don't replay to mover

                        res.writeHead(200,{'Content-Type':'application/json'
                                          ,'Cache-Control':'no-cache'
                                          ,'gameviewer':viewer
                                          });
                        res.write(reqData);
                        res.end();

                        delete listeners.viewer;

                      });

                      res.writeHead(200,{'Content-Type':'text/plain'
                                        ,'Cache-Control':'no-cache'});
                      res.write('done');
                      res.end();

                    });
                  }());
                  break;

                case '/listen':
                  (function(){

                    var viewer = +req.headers.gameviewer || ++viewers;
                    console.log('new listener: '+viewer);
                    listeners[viewer] = res;

                  }());
                  break;

                default:
                  console.log('unknown request');
                  res.writeHead(404,'unknown request');
                  res.end();
                  break;

              }
             }).listen(port,host);

console.log('server at: '+host+':'+port);
