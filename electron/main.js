const fs = require('fs');
const path = require('path');
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

const { app, dialog } = require('electron');
const { registerResourceProtocol, createWindow } = require('./window');
const { AutoUpdater } = require('./updater');

app.on('window-all-closed', () => app.quit());
app.on('ready', () => {
	registerResourceProtocol();

	window = createWindow(cli.pkg.name, cli.flags.dev);
	window.loadURL('file://' + path.join(__dirname, '../build/index.html') +
		(cli.flags.dev ? '?dev' : ''));

	try {
		window.updater = new AutoUpdater(cli.pkg, app.getAppPath());
	}
	catch (e) {
		console.warn(`AutoUpdater disabled because of ${e}`);
	}

	window.on('closed', () => (window = null));
	window.webContents.once('did-finish-load', () => {
		if (cli.flags.dev) {
			window.webContents.openDevTools();
		}
	});
});