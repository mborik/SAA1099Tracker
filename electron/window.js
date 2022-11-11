/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const { BrowserWindow } = require('electron');
const WindowState = require('electron-window-state');

const minBounds = { w: 1152, h: 790 };

const createWindow = (title, devTools) => {
  const windowState = WindowState({
    file: 'WindowState',
    defaultWidth: minBounds.w,
    defaultHeight: minBounds.h
  });

  const window = new BrowserWindow({
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
    icon: path.join(__dirname, `../assets/resources/icon.${(process.platform === 'win32') ? 'ico' : 'png'}`),
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

module.exports = { createWindow };
