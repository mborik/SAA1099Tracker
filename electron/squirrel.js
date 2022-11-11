/* eslint-disable @typescript-eslint/no-var-requires */
const childProcess = require('child_process');
const path = require('path');

const spawn = (command, args, done) => {
  let spawnedProcess;
  try {
    spawnedProcess = childProcess
      .spawn(command, args, { detached: true })
      .on('close', done);
  }
  catch (e) {}

  return spawnedProcess;
};

const squirrel = (argv, done) => {
  if (process.platform !== 'win32') {
    return true;
  }

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  if (argv.squirrelInstall) {
    // install desktop and start menu shortcuts
    spawn(updateDotExe, ['--createShortcut', exeName], done);
  }
  else if (argv.squirrelUninstall) {
    // remove desktop and start menu shortcuts
    spawn(updateDotExe, ['--removeShortcut', exeName], done);
  }
  else if (argv.squirrelUpdated || argv.squirrelObsolete) {
    done();
  }
  else {
    // no squirrel, we should continue to app start...
    return true;
  }
};

module.exports = { squirrel };
