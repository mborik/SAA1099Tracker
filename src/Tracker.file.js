/** Tracker.file submodule */
/* global atob, LZString, Player, pPosition */
//---------------------------------------------------------------------------------------
var STMFile = (function () {
	function STMFile (tracker) {
		var player = tracker.player,
			settings = tracker.settings,
			storageMap = [], storageLastId, storageBytesUsed = 0;

		this.yetSaved = false;
		this.modified = false;
		this.fileName = '';

//---------------------------------------------------------------------------------------
		function storageSortAndSum () {
			storageBytesUsed = 0;
			storageMap.sort(function (a, b) { b.timeModified - a.timeModified });
			storageMap.forEach(function (obj) { storageBytesUsed += (obj.length + 40) * 2 });
		}

		/**
		 * This method builds internal database of stored songs in localStorage...
		 */
		this.reloadStorage = function () {
			storageMap.splice(0);
			storageLastId = -1;

			var i, m, id, n, s, dat,
				l = localStorage.length;

			for (i = 0; i < l; i++) {
				if ((m = localStorage.key(i).match(/^(stmf([0-9a-f]{3}))\-nfo/))) {
					n = parseInt(m[2], 16);
					id = m[1];

					s = localStorage.getItem(m[0]);
					dat = localStorage.getItem(id + '-dat');

					if (!dat) {
						console.log('Tracker.file', 'Unable to read data for file in localStorage\n\t%s:"%s"', m[2], s);
						localStorage.removeItem(m[0]);
						continue;
					}

					if (!(m = s.match(/^(.+)\|(\d+?)\|(\d+?)\|(\d\d:\d\d)$/)))
						continue;

					storageLastId = Math.max(storageLastId, n);
					storageMap.push({
						"id": n,
						"storageId": id,
						"fileName": m[1],
						"timeCreated": parseInt(m[2], 10),
						"timeModified": parseInt(m[3], 10),
						"duration": m[4],
						"length": dat.length
					});
				}
			}

			storageSortAndSum();
		};

//---------------------------------------------------------------------------------------
		/**
		 * This method creates JSON format of song data from tracker,
		 * more specifically full snapshot of tracker state.
		 * @param pretty {bool} set if you want pretty-formatted JSON output.
		 */
		this.createJSON = function (pretty) {
			var i, j, k, l, o, s, it, obj, dat;
			var output = {
					'title':     tracker.songTitle,
					'author':    tracker.songAuthor,
					'samples':   [],
					'ornaments': [],
					'patterns':  [],
					'positions': [],
					'repeatPos': player.repeatPosition,

					'current': {
						'sample':     tracker.workingSample,
						'ornament':   tracker.workingOrnament,
						'ornSample':  tracker.workingOrnTestSample,
						'smpornTone': tracker.workingSampleTone,

						'position':   player.currentPosition,
						'pattern':    tracker.workingPattern,

						'line':       player.currentLine,
						'channel':    tracker.modeEditChannel,
						'column':     tracker.modeEditColumn
					},
					'ctrl': {
						'octave':   tracker.ctrlOctave,
						'sample':   tracker.ctrlSample,
						'ornament': tracker.ctrlOrnament,
						'rowStep':  tracker.ctrlRowStep
					},
					'config': {
						'interrupt': settings.audioInterrupt,
						'activeTab': tracker.activeTab,
						'editMode':  tracker.modeEdit,
						'loopMode':  player.loopMode
					},

					'version': '1.2'
				};

			// storing samples going backward and unshifting array...
			for (i = 31; i > 0; i--) {
				it = player.sample[i], dat = it.data;
				obj = {};

				if (it.name)
					obj.name = it.name;

				obj.loop = it.loop;
				obj.end = it.end;

				if (it.releasable)
					obj.rel = it.releasable;

				// only meaningful data will be stored and therefore
				// we going backward from end of sample and unshifting array...
				obj.data = [];
				for (j = 255; j >= 0; j--) {
					o = dat[j];
					k = 0 | o.enable_freq | (o.enable_noise << 1) | (o.noise_value << 2);

					if (!obj.data.length && !k && !o.volume.byte && !o.shift)
						continue;

					s = k.toString(16) + ('0' + o.volume.byte.toString(16)).substr(-2);
					if (o.shift)
						s = s.concat(
							((o.shift < 0) ? '-' : '+'),
							('00' + o.shift.abs().toString(16)).substr(-3)
						);

					obj.data.unshift(s.toUpperCase());
				}

				// for optimize reasons, we are detecting empty items in arrays...
				if (!obj.data.length)
					obj.data = null;
				if (obj.data === null && !obj.loop && !obj.end && !obj.rel && !obj.name)
					obj = null;
				if (!output.samples.length && obj === null)
					continue;

				output.samples.unshift(obj);
			}

			// storing ornaments going backward and unshifting array...
			for (i = 15; i > 0; i--) {
				it = player.ornament[i];
				obj = {};

				if (it.name)
					obj.name = it.name;

				obj.loop = it.loop;
				obj.end = it.end;

				// only meaningful data will be stored and therefore
				// we going backward from end of sample and unshifting array...
				obj.data = [];
				for (j = 255; j >= 0; j--) {
					k = it.data[j];

					if (!obj.data.length && !k)
						continue;

					obj.data.unshift(''.concat(
						((k < 0) ? '-' : '+'),
						('0' + k.abs().toString(10)).substr(-2)
					).toUpperCase());
				}

				// for optimize reasons, we are detecting empty items in arrays...
				if (!obj.data.length)
					obj.data = null;
				if (obj.data === null && !obj.loop && !obj.end && !obj.name)
					obj = null;
				if (!output.ornaments.length && obj === null)
					continue;

				output.ornaments.unshift(obj);
			}

			// storing patterns...
			for (i = 1, l = player.pattern.length; i < l; i++) {
				it = player.pattern[i], dat = it.data;
				obj = { end: it.end };

				// only meaningful data will be stored and therefore
				// we going backward from end of sample and unshifting array...
				obj.data = [];
				for (j = Player.maxPatternLen; j > 0;) {
					o = dat[--j];
					k = o.orn_release ? 33 : o.orn;
					s = o.release ? '--' : ('0' + o.tone.toString(10)).substr(-2);

					if (!obj.data.length && s === '00' && !o.smp && !k && !o.volume.byte && !o.cmd && !o.cmd_data)
						continue;

					obj.data.unshift(s.concat(
						o.smp.toString(32),
						k.toString(36),
						('0' + o.volume.byte.toString(16)).substr(-2),
						o.cmd.toString(16),
						('0' + o.cmd_data.toString(16)).substr(-2)
					).toUpperCase());
				}

				// for optimize reasons, we are detecting empty items in arrays...
				if (!obj.data.length)
					obj.data = null;
				if (obj.data === null && !obj.end)
					obj = null;
				if (!output.patterns.length && obj === null)
					continue;

				output.patterns.push(obj);
			}

			// storing positions, no optimalizations needed...
			for (i = 0, l = player.position.length; i < l; i++) {
				it = player.position[i], dat = it.ch;
				obj = {
					length: it.length,
					speed:  it.speed,
					ch: []
				};

				for (j = 0; j < 6; j++) {
					k = dat[j].pitch;
					s = ('00' + dat[j].pattern.toString(10)).substr(-3);

					if (k)
						s = s.concat(
							((k < 0) ? '-' : '+'),
							('0' + k.abs().toString(10)).substr(-2)
						);

					obj.ch.push(s);
				}

				output.positions.push(obj);
			}

			return pretty ?
				JSON.stringify(output, null, '\t').replace(/\},\n\t+?\{/g, '}, {') :
				JSON.stringify(output);
		};
//---------------------------------------------------------------------------------------
		/**
		 * This method can parse input JSON with song data in both supported formats:
		 * - v1.1 import from previous MIF85Tracker project
		 * - v1.2 current SAA1099Tracker format specification
		 *
		 * @param data {string|object} song data in JSON
		 */
		this.parseJSON = function (data) {
			if (typeof data === 'string') {
				try {
					var json = data;
					data = JSON.parse(json);
				}
				catch (e) { return false }
			}
			if (typeof data !== 'object')
				return false;

			var i, j, k, l, o, s, it, obj, dat,
				oldVer = false;

			// detection of old JSON format v1.1 from previous project MIF85Tracker...
			if (data.version && data.version == '1.1')
				oldVer = true;
			else if (!data.version || (data.version && data.version != '1.2'))
				return false;

			player.clearSong();
			player.clearSamples();
			player.clearOrnaments();

			//~~~ CREDITS ~~~
			tracker.songTitle = data.title || '';
			tracker.songAuthor = data.author || '';

			//~~~ SAMPLES ~~~
			if (data.samples && data.samples.length) {
				if (oldVer) // ignore empty zero sample
					data.samples.shift();

				for (i = 1; i < 32; i++) {
					if (!!(obj = data.samples[i - 1])) {
						it = player.sample[i];
						dat = it.data;

						if (obj.name)
							it.name = obj.name;
						it.loop = obj.loop || 0;
						it.end = obj.end || 0;
						it.releasable = !!obj.rel;

						if (oldVer) {
							// v1.1
							// - whole sample data stored binary in one BASE64 string,
							//   every tick in 3 bytes...

							o = atob(obj.data);
							for (j = 0, k = 0, l = o.length; j < l && k < 32; j += 3, k++) {
								s = (o.charCodeAt(j + 1) & 0xff);

								dat = it.data[k];
								dat.volume.byte  = (o.charCodeAt(j) & 0xff);
								dat.enable_freq  = !!(s & 0x80);
								dat.enable_noise = !!(s & 0x40);
								dat.noise_value  = (s & 0x30) >> 4;

								dat.shift = ((s & 7) << 8) | (o.charCodeAt(j + 2) & 0xff);
								if (!!(s & 8))
									dat.shift *= -1;
							}
						}
						else {
							// v1.2
							// - every tick stored as simple string with hex values...

							for (j = 0, l = Math.min(256, obj.data.length); j < l; j++) {
								dat = it.data[j];

								s = obj.data[j];
								k = parseInt(s[0], 16) || 0;

								dat.enable_freq  = !!(k & 1);
								dat.enable_noise = !!(k & 2);
								dat.noise_value  =  (k >> 2);
								dat.volume.byte  = parseInt(s.substr(1, 2), 16) || 0;

								dat.shift = parseInt(s.substr(3), 16) || 0;
							}
						}
					}
				}
			}

			//~~~ ORNAMENTS ~~~
			if (data.ornaments && data.ornaments.length) {
				if (oldVer) // ignore empty zero ornament
					data.ornaments.shift();

				for (i = 1; i < 16; i++) {
					if (!!(obj = data.ornaments[i - 1])) {
						it = player.ornament[i];
						dat = it.data;

						if (obj.name)
							it.name = obj.name;
						it.loop = obj.loop || 0;
						it.end = obj.end || 0;

						if (oldVer) {
							// v1.1
							// - whole ornament data stored binary in one BASE64 string

							o = atob(obj.data);
							for (j = 0, l = Math.min(256, o.length); j < l; j++)
								dat[j] = o.charCodeAt(j);
						}
						else {
							// v1.2
							// - every tick stored as simple string with signed hex value

							o = obj.data;
							for (j = 0, l = Math.min(256, o.length); j < l; j++)
								dat[j] = parseInt(o[j], 16) || 0;
						}
					}
				}
			}

			//~~~ PATTERNS ~~~
			if (data.patterns && data.patterns.length) {
				if (oldVer) // ignore empty zero pattern
					data.patterns.shift();

				for (i = 0; i < data.patterns.length; i++) {
					if (!!(obj = data.patterns[i])) {
						it = player.pattern[player.addNewPattern()];

						if (oldVer) {
							// v1.1
							// - whole pattern data stored binary in one BASE64 string,
							//   starts with pattern length, next every line in 5 bytes

							o = atob(obj);
							it.end = (o.charCodeAt(0) & 0xff);

							for (j = 1, k = 0, l = o.length; j < l && k < Player.maxPatternLen; j += 5, k++) {
								dat = it.data[k];

								dat.tone = (o.charCodeAt(j) & 0x7f);
								dat.release = !!(o.charCodeAt(j) & 0x80);
								dat.smp = (o.charCodeAt(j + 1) & 0x1f);
								dat.orn_release = !!(o.charCodeAt(j + 1) & 0x80);
								dat.volume.byte = (o.charCodeAt(j + 2) & 0xff);
								dat.orn = (o.charCodeAt(j + 3) & 0x0f);
								dat.cmd = (o.charCodeAt(j + 3) & 0xf0) >> 4;
								dat.cmd_data = (o.charCodeAt(j + 4) & 0xff);
							}
						}
						else {
							// v1.2
							// - lines encoded into string with values like in tracklist

							it.end = obj.end || 0;

							for (j = 0, l = Math.min(Player.maxPatternLen, obj.data.length); j < l; j++) {
								s = obj.data[j] || '';
								dat = it.data[j];

								k = parseInt(s.substr(0, 2), 10);
								dat.tone = isNaN(k) ? ((dat.release = true) && 0) : k;

								k = parseInt(s[3], 16);
								dat.orn = isNaN(k) ? ((dat.orn_release = true) && 0) : k;

								dat.sample = parseInt(s[2], 32) || 0;
								dat.volume.byte = parseInt(s.substr(4, 2), 16) || 0;
								dat.cmd = parseInt(s[6], 16) || 0;
								dat.cmd_data = parseInt(s.substr(7), 16) || 0;
							}
						}
					}
				}
			}

			//~~~ POSITIONS ~~~
			if (data.positions && data.positions.length) {
				for (i = 0; i < data.positions.length; i++) {
					if (!!(obj = data.positions[i])) {
						it = new pPosition(obj.length, obj.speed);

						if (oldVer)
							o = atob(obj.ch);

						for (j = 0, k = 0; j < 6; j++) {
							if (oldVer) {
								it.ch[j].pattern = (o.charCodeAt(k++) & 0xff);
								it.ch[j].pitch = o.charCodeAt(k++);
							}
							else {
								s = obj.ch[j];
								it.ch[j].pattern = parseInt(s.substr(0, 3), 10) || 0;
								it.ch[j].pitch = parseInt(s.substr(3), 10) || 0;
							}
						}

						player.position.push(it);
					}
				}
			}

			//~~~ CURRENT STATE ~~~
			if (oldVer && typeof data.config === 'object') {
				o = data.config;

				player.repeatPosition        = o.repeatPosition || 0;
				player.currentPosition       = o.currentPosition || 0;
				player.currentLine           = o.currentLine || 0;

				tracker.modeEditChannel      = o.editChannel || 0;
				tracker.ctrlOctave           = o.ctrlOctave || 2;
				tracker.ctrlSample           = o.ctrlSample || 0;
				tracker.ctrlOrnament         = o.ctrlOrnament || 0;
				tracker.ctrlRowStep          = o.ctrlRowStep || 0;

				settings.audioInterrupt      = o.audioInterrupt || 50;
			}
			else if (typeof data.current === 'object') {
				o = data.current;

				player.repeatPosition        = data.repeatPos || 0;
				player.currentPosition       = o.position || 0;
				player.currentLine           = o.line || 0;

				tracker.workingPattern       = o.pattern || 0;
				tracker.workingSample        = o.sample || 1;
				tracker.workingOrnament      = o.ornament || 1;
				tracker.workingOrnTestSample = o.ornSample || 1;
				tracker.workingSampleTone    = o.smpornTone || 37;
				tracker.modeEditChannel      = o.channel || 0;
				tracker.modeEditColumn       = o.column || 0;

				o = $.extend({}, data.ctrl, data.config);

				player.loopMode              = o.loopMode || true;

				tracker.ctrlOctave           = o.octave || 2;
				tracker.ctrlSample           = o.sample || 0;
				tracker.ctrlOrnament         = o.ornament || 0;
				tracker.ctrlRowStep          = o.rowStep || 0;
				tracker.activeTab            = o.activeTab || 0;
				tracker.modeEdit             = o.editMode || false;

				settings.audioInterrupt      = o.interrupt || 50;
			}

			tracker.updatePanels();
			tracker.updateTracklist();
			tracker.updateSampleEditor(true);
			tracker.smpornedit.updateOrnamentEditor(true);

			console.log('Tracker.file', 'Module "%s" (v%s) successfully loaded...',
					data.title, data.version);
			return true;
		};
//---------------------------------------------------------------------------------------
		this.new = function () {
			player.clearSong();
			player.clearSamples();
			player.clearOrnaments();

			tracker.songTitle = '';
			tracker.songAuthor = '';

			player.currentPosition = 0;
			player.repeatPosition = 0;
			player.currentLine = 0;

			tracker.modeEdit = false;
			tracker.modeEditChannel = 0;
			tracker.modeEditColumn = 0;
			tracker.workingPattern = 0;

			tracker.updatePanels();
			tracker.updateTracklist();
			tracker.updateSampleEditor(true);
			tracker.smpornedit.updateOrnamentEditor(true);

			this.modified = false;
			this.yetSaved = false;
			this.fileName = '';
		};
//---------------------------------------------------------------------------------------
		this.loadDemosong = function (fileName) {
			var file = this;

			console.log('Tracker.file', 'Loading "%s" demosong...', fileName);
			$.getJSON('demosongs/' + fileName + '.json', function (data) {
				file.parseJSON(data);
				file.modified = false;
				file.yetSaved = false;
				file.fileName = '';
			});
		};
//---------------------------------------------------------------------------------------
		this.loadFile = function (fileNameOrId) {
			var i, l = storageMap.length, name, obj, data;

			if (typeof fileNameOrId === 'string')
				name = fileNameOrId.replace(/[\.\\\/\":*?%<>|\0-\37]+/g, '').trim();

			for (i = 0; i < l; i++) {
				obj = storageMap[i];

				if (name && obj.fileName === name)
					break;
				else if (!name && typeof fileNameOrId === 'number' && obj.id === fileNameOrId) {
					name = obj.fileName;
					break;
				}
			}

			if (i === l) {
				console.log('Tracker.file', 'File "' + fileNameOrId + '" not found!');
				return false;
			}

			console.log('Tracker.file', 'Loading "%s" from localStorage...', name);
			data = localStorage.getItem(obj.storageId + '-dat');
			console.log('Tracker.file', 'Compressed JSON file format loaded, size: ' + data.length * 2);
			data = LZString.decompressFromUTF16(data);
			console.log('Tracker.file', '%d bytes after LZString decompression, parsing...', data.length);

			if (!this.parseJSON(data)) {
				console.log('Tracker.file', 'Cannot parse file!');
				return false;
			}

			this.modified = false;
			this.yetSaved = true;
			this.fileName = name;
			return true;
		};
//---------------------------------------------------------------------------------------
		this.saveFile = function (fileName, duration, oldId) {
			var i, l = storageMap.length,
				now = ~~(Date.now() / 1000),
				mod = false, obj, data;

			fileName = fileName.replace(/[\.\\\/\":*?%<>|\0-\37]+/g, '');
			console.log('Tracker.file', 'Storing "%s" to localStorage...', fileName);

			for (i = 0; i < l; i++) {
				obj = storageMap[i];
				if (obj.id === oldId || obj.fileName === fileName) {
					console.log('Tracker.file', 'File ID:%s exists, will be overwritten...', obj.storageId);
					mod = true;
					break;
				}
			}

			if (oldId !== void 0 && !mod) {
				console.log('Tracker.file', 'Cannot find given storageId: %d!', oldId);
				return false;
			}

			data = this.createJSON();
			console.log('Tracker.file', 'JSON file format built, original size: ' + data.length);
			data = LZString.compressToUTF16(data);
			console.log('Tracker.file', 'Compressed with LZString to size: ' + data.length * 2);

			if (mod) {
				obj = storageMap[i];

				obj.fileName = fileName;
				obj.timeModified = now;
				obj.duration = duration;
				obj.length = data.length;
			}
			else obj = {
				"id": ++storageLastId,
				"storageId": 'stmf' + ('00' + storageLastId.toString(16)).substr(-3),
				"fileName": fileName,
				"timeCreated": now,
				"timeModified": now,
				"duration": duration,
				"length": data.length
			};

			localStorage.setItem(obj.storageId + '-nfo', fileName.concat(
				'|', obj.timeCreated.toString(),
				'|', obj.timeModified.toString(),
				'|', obj.duration
			));

			localStorage.setItem(obj.storageId + '-dat', data);

			if (!mod)
				storageMap.push(obj);
			storageSortAndSum();

			this.yetSaved = true;
			this.modified = false;
			this.fileName = obj.fileName;

			console.log('Tracker.file', 'Everything stored into localStorage...');
			return true;
		};

//---------------------------------------------------------------------------------------
//-- GUI METHODS ------------------------------------------------------------------------
//---------------------------------------------------------------------------------------
		this.dialog = function (mode) {
			var dlg = $('#filedialog'),
				fn = this.fileName || tracker.songTitle || 'Untitled',
				titles = {
					load: 'Open file from storage',
					save: 'Save file to storage'
				};

			if (!titles[mode] || (mode === 'load' && !storageMap.length))
				return false;

			dlg.on('show.bs.modal', function () {
				var percent = Math.ceil(100 / ((2 * 1024 * 1024) / storageBytesUsed));

				dlg.addClass(mode).find('.modal-title').text(titles[mode] + '\u2026');
				dlg.find('.file-name input').val(fn);
				dlg.find('.storage-usage i').text(storageBytesUsed + ' bytes used');
				dlg.find('.storage-usage .progress-bar').css('width', percent + '%');

				var i, l = storageMap.length, obj, d,
					el = dlg.find('.file-list').empty(),
					span = $('<span/>'),
					cell = $('<button class="cell"/>');

				for (i = 0; i < l; i++) {
					obj = storageMap[i];
					d = (new Date(obj.timeModified * 1000))
							.toISOString().replace(/^([\d\-]+)T([\d:]+).+$/, '$1 $2');

					cell.clone()
						.append(span.clone().addClass('filename').text(obj.fileName))
						.append(span.clone().addClass('fileinfo').text(d + ' | duration: ' + obj.duration))
						.appendTo(el);
				}

			}).on('shown.bs.modal', function() {
				var el = $(this),
					saveFlag = el.hasClass('save');

				el.find(saveFlag
					? '.file-name input'
					: '.file-list button:first-child').focus();

			}).on('hide.bs.modal', function() {
				dlg.removeClass(mode)
					.off('show.bs.modal shown.bs.modal hide.bs.modal')
					.find('.file-list')
					.empty();

			}).modal('show');
		};

		this.reloadStorage();
	}

	return STMFile;
})();
//---------------------------------------------------------------------------------------
