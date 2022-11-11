/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { app, BrowserWindow, nativeImage } = require('electron');
const meow = require('meow');
const { squirrel } = require('./squirrel');
const { createWindow } = require('./window');

const cli = meow({
  help: `
  Options:
    -d, --dev        Developer's mode
    -l, --localhost  Serve from localhost
    -p, --port       Optional port
    -h, --help       Show help
    -v, --version    Version number
`,
  argv: process.argv.slice(1)
}, {
  boolean: ['dev', 'localhost'],
  port: { type: 'number' },
  alias: {
    d: 'dev',
    l: 'localhost',
    p: 'port',
    h: 'help',
    v: 'version'
  }
});

if (squirrel(cli.flags, app.quit)) {
  const title = cli.pkg.displayName;
  const icon = nativeImage.createFromPath(path.join(__dirname, '../assets/resources/icon.png'));

  const createMainWindow = () => {
    const mainWindow = createWindow(title, cli.flags.dev);
    mainWindow.loadURL(`${
      cli.flags.localhost ?
        `http://localhost:${cli.flags.port || process.env.PORT || 3000}` :
        cli.pkg.homepage
    }${cli.flags.dev ? '?dev' : ''}`);
    return mainWindow;
  };

  app.setName(title);
  app.setAboutPanelOptions({
    applicationName: title,
    applicationVersion: cli.pkg.version,
    website: cli.pkg.homepage,
    copyright: 'Copyright (c) 2012-2022 Martin Bórik',
    iconPath: icon
  });

  if (process.platform === 'darwin') {
    app.dock.setIcon(icon);
  }

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('ready', () => {
    let mainWindow = createMainWindow();

    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (!BrowserWindow.getAllWindows().length) {
        mainWindow = createMainWindow();
      }
    });

    mainWindow.on('closed', () => (mainWindow = null));
    mainWindow.webContents.once('did-finish-load', () => {
      if (cli.flags.dev) {
        mainWindow.webContents.openDevTools();
      }
    });

    mainWindow.firstRun = !!cli.flags.squirrelFirstrun;
  });
}
