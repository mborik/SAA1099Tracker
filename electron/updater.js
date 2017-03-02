const app = require('electron').app;
const digest = require('digest-stream');
const nfs = require('original-fs');
const path = require('path');
const request = require('request');
const semver = require('compare-version');
const zlib = require('zlib');

exports.AutoUpdater = (function() {
	const _verRegex = /^\d\.\d\.\d+$/;
	const _errors = [
		'Initialization error',
		'Cannot connect to API',
		'No update available',
		'Invalid API response',
		'Failed to download update package',
		'Invalid checksum of package',
		'Possible failure while applying of the update'
	];

	let _dev = false;
	let _setup = null;
	let _updateObj = null;
	let _userCallback = null;

	let _result = (error, msg) => {
		let e = error ? (_errors[error] || 'Unknown error') : false;
		if (e && _dev) {
			console.error(e, msg || '');
		}

		if (typeof _userCallback === 'function') {
			_userCallback.call(null, e, _updateObj);
		}

		_userCallback = null;
		return false;
	};

	class AutoUpdater {
		constructor(dev, pkg, appPath, updateUrl) {
			if (!updateUrl && pkg && pkg.config) {
				updateUrl = pkg.config.updateUrl;
			}
			if (!(typeof updateUrl === 'string' && updateUrl.indexOf('http') === 0)) {
				throw `${_errors[0]}: invalid updateUrl "${updateUrl}"`;
			}

			let basePath;
			if (typeof appPath === 'string' && appPath.match(/[\/\\]app\.asar$/)) {
				basePath = path.normalize(appPath.slice(0, appPath.indexOf('app.asar')));
			}
			else {
				throw `${_errors[0]}: invalid appPath "${appPath}"`;
			}

			_userCallback = null;
			_updateObj = null;
			_setup = {
				'appName': pkg.name,
				'version': pkg.version,
				'api': pkg.config.updateUrl,
				'appPath': appPath,
				'basePath': basePath
			};

			_dev = !!dev;
		}

		check(callback) {
			if (callback) {
				_userCallback = callback;
			}

			let dist = path.join(_setup.basePath, '/update.asar');
			if (nfs.existsSync(dist)) {
				nfs.unlink(dist);
				return _result(6);
			}

			request({
				url: _setup.api + '?version=' + _setup.version,
				method: 'get',
				json: true
			}, (error, response, body) => {
				if (error) {
					return _result(1, error);
				}

				if (response.statusCode === 200 && typeof body === 'object') {
					if (!(body.name === _setup.appName &&
						typeof body.version === 'string' && body.version.match(_verRegex) &&
						typeof body.link === 'string' && body.link.indexOf('http') === 0)) {

						return _result(3, body);
					}

					// update available
					if (semver(body.version, _setup.version) > 0) {
						if (_dev) {
							console.log(`Update available ${_setup.version} ==> ${body.version}...`);
						}

						_updateObj = body;
						_result();
					}
					else {
						_result(2, `${_setup.version} <= ${body.version}`);
					}
				}
				else {
					_result(1, response);
				}
			});
		}

		download(callback) {
			if (callback) {
				_userCallback = callback;
			}
			if (!(_updateObj && _updateObj.link && _updateObj.checksum)) {
				return _result(3);
			}

			let url = _updateObj.link;
			let dist = path.join(_setup.basePath, '/update.asar');

			if (_dev) {
				console.log(`Downloading: ${url}...`);
			}

			try {
				let checksum;

				request
					.get(url)
					.on('error', err => _result(4, err))
					.pipe(zlib.createGunzip())
					.pipe(digest('sha1', 'hex', hash => (checksum = hash)))
					.pipe(nfs.createWriteStream(dist))
					.on('finish', () => {
						if (_dev) {
							console.log(`Update downloaded: "${dist}" *${checksum}`);
						}

						if (checksum !== _updateObj.checksum) {
							nfs.unlink(dist);
							return _result(5);
						}

						let ext = (process.platform === 'win32' ? '.cmd' : '');
						let exePath = app.getPath('exe');
						let asarUpdateScript = path.join(path.dirname(exePath), 'asar_update' + ext);

						app.relaunch({
							execPath: asarUpdateScript,
							args: [ path.basename(exePath) ]
						});

						_result();
					});
			}
			catch (err) {
				_result(4, err);
			}
		}
	};

	return AutoUpdater;
})();
