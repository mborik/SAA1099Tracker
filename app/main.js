const fs = require('fs');
const path = require('path');
const url = require('url');
const assign = require('object-assign');
const meow = require('meow');

const cli = meow(`
	Options:
		-d, --dev        Developer's mode
		-h, --help       Show help
		-v, --version    Version number
`, {
	boolean: [ 'dev' ],
	alias: {
		d: 'dev',
		h: 'help',
		v: 'version'
	}
});

const { app, dialog, BrowserWindow } = require('electron');
const WindowState = require('electron-window-state');

app.on('window-all-closed', () => app.quit());
app.once('ready', () => {
	const minBounds = { w: 1152, h: 790 };

	let windowState = WindowState({
		file: 'WindowState',
		defaultWidth: minBounds.w,
		defaultHeight: minBounds.h
	});

	let window = new BrowserWindow({
		title: cli.pkg.name,
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
			defaultEncoding: 'UTF-8',
			textAreasAreResizable: false,
			webgl: false
		}
	});

	windowState.manage(window);

	window.on('closed', () => (window = null));
	window.once('ready-to-show', () => {
		window.show();
		window.setMenu(null);

		if (windowState.isMaximized) {
			window.maximize();
		}
		if (cli.flags.dev) {
			window.openDevTools();
		}
	});

	window.loadURL('file://' + path.join(__dirname, '/../build/index.html') +
		(cli.flags.dev ? '?dev' : ''));
});