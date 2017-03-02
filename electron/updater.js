const app = require('electron').app;
const nfs = require('original-fs');
const zlib = require('zlib');
const path = require('path');
const semver = require('compare-version');
const request = require('request');

exports.AutoUpdater = (function() {
	const _verRegex = /^\d\.\d\.\d+$/;
	const _errors = [
		'initialization_error',
		'cannot_connect_to_api',
		'no_update_available',
		'api_response_not_valid',
		'update_file_not_found',
		'failed_to_download_update',
		'failed_to_apply_update'
	];

	let _setup = null;
	let _updateObj = null;
	let _userCallback = null;

	let _result = (error, msg) => {
		let e = error ? (_errors[error] || 'unknown_error') : false;
		if (e) {
			console.error(e, msg || '');
		}

		if (typeof _userCallback === 'function') {
			_userCallback.call(null, e, _updateObj);
		}

		_userCallback = null;
		return false;
	};

	class AutoUpdater {
		constructor(pkg, appPath, updateUrl) {
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
		}

		check(callback) {
			if (callback) {
				_userCallback = callback;
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
						console.log(`Update available ${_setup.version} ==> ${body.version}...`);

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
			if (!(_updateObj && _updateObj.link)) {
				return _result(3);
			}

			let url = _updateObj.link;
			let dist = path.join(_setup.basePath, '/update.asar');

			console.log(`Downloading: ${url}...`);

			try {
				request
					.get(url)
					.pipe(zlib.createGunzip())
					.pipe(nfs.createWriteStream(dist))
					.on('error', err => _result(5, err))
					.on('finish', () => {
						console.log(`Update downloaded: "${dist}"...`);

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
				_result(5, err);
			}
		}
	};

	return AutoUpdater;
})();
