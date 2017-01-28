const url = require('url');
const path = require('path');
const { BrowserWindow, protocol } = require('electron');
const WindowState = require('electron-window-state');
const minBounds = { w: 1152, h: 790 };

exports.registerDocProtocol = () => {
	const docuPath = path.resolve(path.join(__dirname, '../doc/'));
	protocol.registerFileProtocol(
		'doc',
		(req, callback) => {
			var name = url.parse(req.url).hostname;
			callback({ path: path.join(docuPath, name + '.txt') });
		},
		(err) => {
			if (err) throw err;
		}
	);
};

exports.createWindow = (title, devTools) => {
	let windowState = WindowState({
		file: 'WindowState',
		defaultWidth: minBounds.w,
		defaultHeight: minBounds.h
	});

	let window = new BrowserWindow({
		title: title,
		show: false,
		minWidth: minBounds.w,
		minHeight: minBounds.h,
		width: windowState.width,
		height: windowState.height,
		x: windowState.x,
		y: windowState.y,
		center: true,
		autoHideMenuBar: true,
		acceptFirstMouse: true,
		icon: path.join(__dirname, '/../build/img/logo.png'),
		webPreferences: {
			devTools: devTools,
			defaultEncoding: 'UTF-8',
			textAreasAreResizable: false,
			webgl: false
		}
	});

	windowState.manage(window);

	window.once('ready-to-show', () => {
		window.setMenu(null);
		window.show();

		if (windowState.isMaximized) {
			window.maximize();
		}
	});

	return window;
};
