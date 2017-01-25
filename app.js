const fs = require('fs');
const extend = require('util')._extend;
const httpServer = require('http-server');
const portfinder = require('portfinder');
const { app, BrowserWindow } = require('electron');

const BASE_PORT = 8729;
const ELECTRON_OPTIONS = {
	show: false,
	width: 1280,
	height: 720,
	center: true,
	minWidth: 1152,
	minHeight: 576,
	autoHideMenuBar: true,
	acceptFirstMouse: true,
	icon: __dirname + '/build/img/logo.png',
	title: 'SAA1099Tracker',
	webPreferences: {
		nodeIntegration: false,
		textAreasAreResizable: false,
		webgl: false,
		defaultEncoding: 'UTF-8'
	}
};

const SERVER_OPTIONS = {
	root: __dirname + '/build',
	ext: 'html',
	showDir: false,
	autoIndex: false,
	gzip: false,
};

portfinder.basePort = BASE_PORT;
portfinder.getPort((err, port) => {
	if (err) {
		throw err;
	}
	else {
		let server = httpServer.createServer(extend({
			before: [
				(req, res) => {
					console.log('handling url "%s"...', req.url);

					if (/^\/?doc\/\w+.txt$/.test(req.url)) {
						res.setHeader('Content-Type', 'text/plain');
						return fs.createReadStream('./' + req.url).pipe(res);
					}

					res.emit('next');
				}
			]
		}, SERVER_OPTIONS));

		app.on('window-all-closed', () => {
			console.log('server shutdown...');
			server.close();

			app.quit();
		});

		server.listen(port, '0.0.0.0', () => {
			console.log('server running on port ' + port);

			app.on('ready', () => {
				let window = new BrowserWindow(ELECTRON_OPTIONS);
				window.on('closed', () => {
					window = null;
				});
				window.once('ready-to-show', () => {
					window.show();
				});

				window.loadURL('http://localhost:' + port);
			});
		});
	}
});
