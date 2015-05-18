/*************************************
//
// global-socket app
//
**************************************/
'use strict';

// express magic
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var device  = require('express-device');
var ps = require('powersocket');

var runningPortNumber = process.env.PORT;


app.configure(function () {
	// I need to access everything in '/public' directly
	app.use(express.static(__dirname + '/public'));

	//set the view engine
	app.set('view engine', 'ejs');
	app.set('views', __dirname + '/views');

	app.use(device.capture());
});


// logs every request
app.use(function(req, res, next){
	// output every request in the array
	console.log({method:req.method, url: req.url, device: req.device});

	// goes onto the next function in line
	next();
});

app.get("/", function(req, res){
	res.render('index', {});
});

ps.configuration({
  username: process.env.POWERSOCKET_USER,
  password: process.env.POWERSOCKET_PASS,
  path:     process.env.POWERSOCKET_PATH
});

ps.callback(function(d) { 
  console.log(d);
  io.sockets.emit('tweet', d)
});

server.listen(runningPortNumber);

