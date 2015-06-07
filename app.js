var express = require('express'),
	http = require('http'),
	path = require('path'),
	app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.set("view options", {layout: false});
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.static(__dirname + '/build'));

// development only
if (app.get('env') === 'development')
	app.use(express.errorHandler());

app.use('/saa', express.static(__dirname + '/saa'));
app.use('/src', express.static(__dirname + '/src'));
app.get('/', function(req, res) {
	res.render('index.html');
});

http.createServer(app).listen(app.get('port'), function() {
	console.log('listening on port ' + app.get('port'));
});
