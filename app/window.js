const url = require('url');
const path = require('path');
const { BrowserWindow, protocol } = require('electron');
const WindowState = require('electron-window-state');
const minBounds = { w: 1152, h: 790 };

exports.registerResourceProtocol = () => {
	const docuPath = path.resolve(path.join(__dirname, '../doc/'));
	const assetsPath = path.resolve(path.join(__dirname, '../assets/'));

	protocol.registerFileProtocol(
		'res',
		(req, callback) => {
			var target;
			var parsed = url.parse(req.url);

			if (parsed.hostname === 'doc') {
				target = path.join(docuPath, parsed.pathname + '.txt');
			}
			else if (parsed.hostname === 'demo') {
				target = path.join(assetsPath, 'demosongs', parsed.pathname + '.json');
			}

			callback({ path: target });
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
