/*!
 * Tracker: Core of SAA1099Tracker.
 * Copyright (c) 2013-2015 Martin Borik <mborik@users.sourceforge.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 * OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
//---------------------------------------------------------------------------------------
$(document).ready(function() { window.Tracker = new Tracker });
//---------------------------------------------------------------------------------------

/** Tracker.tracklist submodule */
//---------------------------------------------------------------------------------------
var TracklistPosition = (function () {
	function TracklistPosition() {
		this.y = 0;
		this.line = 0;
		this.channel = 0;
		this.column = 0;
		this.start = { x: 0, y: 0 };
		this.compare = function (p) {
			return (this.y === p.y &&
			this.line === p.line &&
			this.channel === p.channel &&
			this.column === p.column);
		}
	}

	return TracklistPosition;
})();
//---------------------------------------------------------------------------------------
var Tracklist = (function () {
	function Tracklist(app) {
		this.obj = null;
		this.ctx = null;
		this.zoom = 2;

		// fontWidth = 6 : default width of pixelfont
		this.canvasData = {
			// offsets to column positions in channel data premultiplied by fontWidth:
			//         0   4567 9AB
			//        "A-4 ABFF C01"
			columns: [ 0, 24, 30, 36, 42, 54, 60, 66 ],

			// selection width: (12 columns + 1 padding) * fontWidth
			selWidth : (12 + 1) * 6,

			// channel width: (12 columns + 2 padding) * fontWidth
			chnWidth : (12 + 2) * 6,

			// trackline width:
			// (((12 columns + 2 padding) * 6 channels) + 2 tracknum.columns) * fontWidth
			lineWidth: (((12 + 2) * 6) + 2) * 6,

			// horizontal centering of trackline to canvas width
			center   : 0,

			// trackline data offset: center + (2 tracknums + 2 padding) * fontWidth
			trkOffset: 0,

			// vertical padding of pixelfont in trackline height
			vpad     : 0
		};

		// calculated absolute positions of X:channels/columns and Y:tracklines in canvas
		this.offsets = {
			// 6 channels of 8 column (+1 padding) positions
			x: [ new Array(9), new Array(9), new Array(9), new Array(9), new Array(9), new Array(9) ],
			y: []
		}

//---------------------------------------------------------------------------------------
		this.countTracklines = function() {
			var s = $('#statusbar').offset(),
				t = $('#tracklist').offset(),
				h = app.settings.tracklistLineHeight;
			return Math.max(((((s.top - t.top) / h / this.zoom) | 1) - 2), 5);
		};

		this.setHeight = function(height) {
			if (height === void 0) {
				height = app.settings.tracklistAutosize
					? this.countTracklines()
					: app.settings.tracklistLines;
			}

			app.settings.tracklistLines = height;
			height *= app.settings.tracklistLineHeight;

			$(this.obj).prop('height', height).css({ 'height': height * this.zoom });
		};

		this.moveCurrentline = function(delta, noWrap) {
			if (!app.player.position.length || app.modePlay)
				return;

			var line = app.player.currentLine + delta,
				pos = app.player.currentPosition,
				pp = app.player.position[pos];

			if (noWrap)
				line = Math.min(Math.max(line, 0), pp.length - 1);
			else if (line < 0)
				line += pp.length;
			else if (line >= pp.length)
				line -= pp.length;

			app.player.currentLine = line;
		}
	}

	return Tracklist;
})();
//---------------------------------------------------------------------------------------

/** Tracker.core submodule */
//---------------------------------------------------------------------------------------
var Tracker = (function() {
	function Tracker() {
		this.activeTab = 0;

		this.modePlay = false;
		this.modeEdit = false;
		this.modeEditChannel = 0;
		this.modeEditColumn = 0;
		this.workingPattern = 0;
		this.workingSample = 1;
		this.workingSampleTone = 36;
		this.workingOrnament = 1;

		this.ctrlOctave = 2;
		this.ctrlSample = 0;
		this.ctrlOrnament = 0;
		this.ctrlRowStep = 0;

		this.songTitle = '';
		this.songAuthor = '';

		this.globalKeyState = {
			modsHandled: false,
			lastPlayMode: 0,
			length: 0
		};

		this.selectionPoint = new TracklistPosition;
		this.selectionStarted = false;
		this.selectionChannel = 0;
		this.selectionLine = 0;
		this.selectionLen = 0;

		this.settings = {
			tracklistAutosize: true,
			tracklistLines: 17,
			tracklistLineHeight: 9,
			hexTracklines: true,
			hexSampleFreq: false,
			audioInterrupt: 50,
			audioBuffers: 0
		};

		this.tracklist = new Tracklist(this);
		this.pixelfont = { obj: null, ctx: null };
		this.smpedit   = { obj: null, ctx: null };
		this.ornedit   = { obj: null, ctx: null };


	// constructor {
		this.player = new Player(new SAASound(AudioDriver.sampleRate));

		AudioDriver.setAudioSource(this.player);
		AudioDriver.play();

		this.populateGUI();
		this.updatePanels();

		var app = this;
		SyncTimer.start(function() {
			if (app.modePlay && app.player.changedLine) {
				if (app.player.changedPosition)
					app.updatePanelPosition();
				app.updatePanelInfo();
				app.updateTracklist();

				app.player.changedPosition = false;
				app.player.changedLine = false;
			}
		}, 20);
	// }
	}

	Tracker.prototype.loadDemosong = function (name) {
		var tracker = this;
		var player = this.player;
		var settings = this.settings;

		$.getJSON('demosongs/' + name + '.json', function(data) {
			player.clearOrnaments();
			player.clearSamples();
			player.clearSong();

			tracker.songTitle = data.title;
			tracker.songAuthor = data.author;

			var a, c, d, i, j, k, o, p, q, s;
			for (i = 0; i < 32; i++) {
				if (a = data.samples[i]) {
					s = player.sample[i];
					s.name = a.name;
					s.loop = a.loop;
					s.end = a.end;
					s.releasable = !!a.rel;
					for (j = 0, k = 0, d = atob(a.data); j < d.length; j += 3, k++) {
						c = (d.charCodeAt(j + 1) & 0xff);
						s.data[k].volume.byte = (d.charCodeAt(j) & 0xff);
						s.data[k].enable_freq = !!(c & 0x80);
						s.data[k].enable_noise = !!(c & 0x40);
						s.data[k].noise_value = (c & 0x30) >> 4;
						s.data[k].shift = (c & 7) | (d.charCodeAt(j + 2) & 0xff);
						if (!!(c & 8))
							s.data[k].shift *= -1;
					}
				}
			}

			for (i = 0; i < 16; i++) {
				if (a = data.ornaments[i]) {
					o = player.ornament[i];
					o.name = a.name;
					o.loop = a.loop;
					o.end = a.end;
					for (j = 0, d = atob(a.data); j < d.length; j++)
						o.data[j] = d.charCodeAt(j);
				}
			}

			for (i = 0; i < data.patterns.length; i++) {
				if (!!(d = data.patterns[i])) {
					d = atob(d);
					p = player.pattern[player.addNewPattern()];
					p.end = (d.charCodeAt(0) & 0xff);
					for (j = 1, k = 0; j < d.length; j += 5, k++) {
						p.data[k].tone = (d.charCodeAt(j) & 0x7f);
						p.data[k].release = !!(d.charCodeAt(j) & 0x80);
						p.data[k].smp = (d.charCodeAt(j + 1) & 0x1f);
						p.data[k].orn_release = !!(d.charCodeAt(j + 1) & 0x80);
						p.data[k].volume.byte = (d.charCodeAt(j + 2) & 0xff);
						p.data[k].orn = (d.charCodeAt(j + 3) & 0x0f);
						p.data[k].cmd = (d.charCodeAt(j + 3) & 0xf0) >> 4;
						p.data[k].cmd_data = (d.charCodeAt(j + 4) & 0xff);
					}
				}
			}

			for (i = 0; i < data.positions.length; i++) {
				a = data.positions[i];
				d = atob(a.ch);
				q = player.position[i] = new pPosition(a.length, a.speed);
				for (j = 0, k = 0; j < 6; j++) {
					q.ch[j].pattern = (d.charCodeAt(k++) & 0xff);
					q.ch[j].pitch = d.charCodeAt(k++);
				}
			}

			player.setInterrupt((settings.audioInterrupt = data.config.audioInterrupt));
			player.currentPosition = data.config.currentPosition;
			player.repeatPosition = data.config.repeatPosition;
			player.currentLine = data.config.currentLine;
			tracker.modeEditChannel = data.config.editChannel;
			tracker.ctrlOctave = data.config.ctrlOctave;
			tracker.ctrlSample = data.config.ctrlSample;
			tracker.ctrlOrnament = data.config.ctrlOrnament;
			tracker.ctrlRowStep = data.config.ctrlRowStep;

			tracker.updatePanels();
			tracker.updateTracklist();
		});
	};

	return Tracker;
})();
//---------------------------------------------------------------------------------------

/** Tracker.controls submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanels = function () {
	$('#scOctave').val(this.ctrlOctave);
	$('#scAutoSmp').val(this.ctrlSample);
	$('#scAutoOrn').val(this.ctrlOrnament);
	$('#scRowStep').val(this.ctrlRowStep);

	$('#txHeaderTitle').val(this.songTitle);
	$('#txHeaderAuthor').val(this.songAuthor);

	this.updatePanelInfo();
	this.updatePanelPattern();
	this.updatePanelPosition();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateEditorCombo = function (step) {
	this.tracklist.moveCurrentline(step || this.ctrlRowStep);
	this.updateTracklist();
	this.updatePanelInfo();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelInfo = function () {
	var int = this.settings.audioInterrupt,
		buf, pos = null, posi = null,
		total = 0, current = 0,
		p = this.player.currentPosition,
		len = this.player.position.length,
		line = this.player.currentLine,
		even = line & -2,
		bpm, i = int * 60;

	if (len) {
		pos = this.player.position[p];
		bpm = (i / (pos.frames[even + 2] - pos.frames[even])) >> 1;

		for (i = 0; i < len; i++) {
			posi = this.player.position[i];
			if (i === p)
				current = total;
			total += posi.frames[posi.length];
		}

		current += pos.frames[line];

		i = total.toString().length;
		buf = '(' + current.toWidth(i) + '/' + total.toWidth(i) + ')';
		$('#stInfoPanelFrames').text(buf);

		current /= int;
		total /= int;
		buf = (current / 60).toWidth(2) + ':' +
		      (current % 60).toWidth(2) + ' / ' +
		        (total / 60).toWidth(2) + ':' +
		        (total % 60).toWidth(2);

		$('#stInfoPanelTime').text(buf);
	}
	else {
		$('#stInfoPanelTime').text('00:00 / 00:00');
		$('#stInfoPanelFrames').text('(0/0)');

		bpm = (i / this.player.currentSpeed) >> 2;
	}
	$('#stInfoPanelBPM').text('BPM: ' + bpm + ' (' + int + ' Hz)');
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPattern = function() {
	var a = [ '#scPattern', '#scPatternLen', '#btPatternDelete', '#btPatternClean', '#btPatternInfo'],
		lastState = $(a[0]).prop('disabled'),
		pat = this.workingPattern,
		len = this.player.pattern.length,
		min = 0, max = 0,
		d = true, i;

	len--;
	if (len) {
		min = 1;
		max = len;
		pat = Math.max(Math.min(pat, max), min);
	}
	else
		pat = 0;

	for (i = 1; i <= 6; i++)
		$('#scChnPattern' + i).trigger('touchspin.updatesettings', { min: 0, max: max });

	if (pat) {
		d = false;
		$(a[1]).val(this.player.pattern[pat].end);
	}
	else
		$(a[1]).val(64);

	this.workingPattern = pat;
	$(a[0]).trigger('touchspin.updatesettings', { min: min, max: max, initval: pat }).val(pat);

	$('#txPatternUsed').val(this.player.countPatternUsage(pat));
	$('#txPatternTotal').val(len);

	if (d !== lastState) {
		for (i = 0, len = a.length; i < len; i++)
			$(a[i] + ',' + a[i] + '~span>button').prop('disabled', d);
	}
}
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPosition = function () {
	var a = [ '#scPosCurrent', '#scPosLength', '#scPosSpeed', '#txPosTotal', '#scPosRepeat' ],
		lastState = $(a[0]).prop('disabled'),
		pos = this.player.nullPosition, buf,
		len = this.player.position.length,
		p = this.player.currentPosition,
		d = true, i;

	if (len) {
		d = false;
		$(a[0] + ',' + a[4]).trigger('touchspin.updatesettings', { min: 1, max: len });
		$(a[0]).val(p + 1);
		$(a[3]).val(len);
		$(a[4]).val(this.player.repeatPosition + 1);

		pos = this.player.position[p];
	}
	else {
		$(a[0] + ',' + a[4]).val(0).trigger('touchspin.updatesettings', { min: 0, max: 0 });
		$(a[3]).val(0);
	}

	$(a[1]).val(pos.length);
	$(a[2]).val(pos.speed);

	for (i = 0; i < 6; i++) {
		a.push((buf = '#scChnPattern' + (i + 1)));
		$(buf).val(pos.ch[i].pattern);

		a.push((buf = '#scChnTrans' + (i + 1)));
		$(buf).val(pos.ch[i].pitch);
	}

	if (d !== lastState) {
		a.splice(3, 1);
		for (i = 0, len = a.length; i < len; i++)
			$(a[i] + ',' + a[i] + '~span>button').prop('disabled', d);
	}

	pos = null;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdStop = function () {
	this.player.stopChannel();
	this.modePlay = false;
	this.globalKeyState.lastPlayMode = 0;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlay = function () {
	if (this.globalKeyState.lastPlayMode === 2)
		return;
	this.modePlay = this.player.playPosition(false, true, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlayStart = function () {
	this.modePlay = this.player.playPosition(true, true, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlay = function () {
	if (this.globalKeyState.lastPlayMode === 1)
		return;
	this.modePlay = this.player.playPosition(false, false, false);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlayStart = function () {
	this.modePlay = this.player.playPosition(false, false, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleLoop = function () {
	var state = (this.player.loopMode = !this.player.loopMode),
		el = $('a#miToggleLoop>span'),
		icon1 = 'glyphicon-repeat', icon2 = 'glyphicon-remove-circle',
		glyph = state ? icon1 : icon2,
		color = state ? '#000' : '#ccc';

	el.removeClass(icon1 + ' ' + icon2);
	el.addClass(glyph).css({ 'color': color });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleEditMode = function () {
	var state = (this.modeEdit = !this.modeEdit),
		el = $('.tracklist-panel');

	if (state)
		el.addClass('edit');
	else
		el.removeClass('edit');

	this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------

/** Tracker.keyboard submodule */
//---------------------------------------------------------------------------------------
/*
	JavaScript KeyboardEvent keymap:
		  8      Backspace
		  9      Tab
		 13      Enter
		 16      Shift
		 17      Ctrl
		 18      Alt
		 19      Pause
		 20      CapsLock
		 27      Esc
		 32      Space
		 33      PageUp
		 34      PageDown
		 35      End
		 36      Home
		 37      Left
		 38      Up
		 39      Right
		 40      Down
		 44      PrtScr
		 45      Insert
		 46      Delete
		 48-57   0 to 9
		 65-90   A to Z
		 91      Win (left)
		 92      Win (right)
		 93      Menu
		 96-105  Num0 to Num9
		106      Numpad *
		107      Numpad +
		109      Numpad -
		110      Numpad .
		111      Numpad /
		112-123  F1 to F12
		144      NumLock
		145      ScrLock
		173      Mute    (Firefox: 181)
		174      VolDown (Firefox: 182)
		175      VolUp   (Firefox: 183)
		186      ; :     (Firefox:  59)
		187      = +     (Firefox:  61)
		189      - _     (Firefox: 173)
		188      , <
		190      . >
		191      / ?
		192      ` ~
		219      [ {     (Opera: Win)
		220      \ |
		221      ] }
		222      ' "
*/
//---------------------------------------------------------------------------------------
Tracker.prototype.hotkeyMap = function (type, group, key) {
	var app = this,
		cursors = (key > 32 && key < 41),
		keyup = /keyup|test/.test(type),
		keydown = /keydown|test/.test(type);

	switch (group) {
		case 'globalCtrl':
			if (!keyup)
				return;

			return {
				79: function () {
					console.logHotkey('Ctrl+O - Open');
				},
				83: function () {
					console.logHotkey('Ctrl+S - Save');
				},
				89: function () {
					console.logHotkey('Ctrl+Y - Redo');
				},
				90: function () {
					console.logHotkey('Ctrl+Z - Undo');
				}
			}[key];

		case 'globalFs':
			if (!keydown)
				return;

			return {
				27: function () {
					console.logHotkey('Esc - Stop');
					if (app.modePlay)
						app.onCmdStop();
					else if (app.modeEdit)
						app.onCmdToggleEditMode();
				},
				112: function () {
					console.logHotkey('F1 - About');
				},
				113: function () {
					console.logHotkey('F2 - Tracklist Editor');
					$('#tab-tracker').trigger('click');
				},
				114: function () {
					console.logHotkey('F3 - Sample Editor');
					$('#tab-smpedit').trigger('click');
				},
				115: function () {
					console.logHotkey('F4 - Ornament Editor');
					$('#tab-ornedit').trigger('click');
				},
				116: function () {
					console.logHotkey('F5 - Play song');
					app.onCmdSongPlay();
				},
				117: function () {
					console.logHotkey('F6 - Play song from start');
					app.onCmdSongPlayStart();
				},
				118: function () {
					console.logHotkey('F7 - Play position');
					app.onCmdPosPlay();
				},
				119: function () {
					console.logHotkey('F8 - Play position from start');
					app.onCmdPosPlayStart();
				},
				120: function () {
					console.logHotkey('F9 - Track manager');
				},
				121: function () {
					console.logHotkey('F10 - Preferences');
				},
				122: function () {
					console.logHotkey('F11 - Toggle loop');
					app.onCmdToggleLoop();
				},
				123: function () {
					console.logHotkey('F12 - Unimplemented');
				}
			}[key];

		case 'trackerCtrl':
			if (!((type === 'repeat' && (key === 48 || key === 57) || type === 'keydown' || type === 'test')))
				return;

			if (key > 96 && key < 103)
				key = 96;
			else if (key > 48 && key < 57)
				key = 56;

			return {
				48: function () {
					console.logHotkey('Ctrl+0 - Increase rowstep');
					app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.uponce').val(), 10);
				},
				56: function (oct) {
					oct -= 48;
					console.logHotkey('Ctrl+' + oct + ' - Set octave');
					$('#scOctave').val(oct);
					app.ctrlOctave = oct;
				},
				57: function () {
					console.logHotkey('Ctrl+9 - Decrease rowstep');
					app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.downonce').val(), 10);
				},
				96: function (chn) {
					chn -= 96;
					console.logHotkey('Ctrl+Num' + chn + ' - Toggle channel');
					$('#scChnButton' + chn).bootstrapToggle('toggle');
				}
			}[key];

		case 'trackerCtrlShift':
			if (!keyup)
				return;

			return {
				37: function () {
					console.logHotkey('Ctrl+Shift+Left - Previous position');
					$('#scPosCurrent').trigger('touchspin.downonce');
				},
				39: function () {
					console.logHotkey('Ctrl+Shift+Right - Next position');
					$('#scPosCurrent').trigger('touchspin.uponce');
				}
			}[key];

		case 'editorShift':
			if (!keydown || !app.modeEdit || !app.player.position.length)
				return;

			return {
				9: function () {
					console.logHotkey('Shift+Tab - Previous channel');
					if (app.modeEditChannel > 0)
						app.modeEditChannel--;
					else
						app.modeEditChannel = 5;

					app.updateTracklist();
				}
			}[key];

		case 'editorKeys':
			if (!(keydown || (type === 'repeat' && cursors)))
				return;

			if (cursors) {
				if (app.modePlay)
					app.onCmdStop();
				else if (!app.player.position.length || (!app.modeEdit && app.modePlay))
					return;
			}

			return {
				9: function () {
					if (!app.player.position.length || !app.modeEdit)
						return;

					console.logHotkey('Tab - Next channel');
					if (app.modeEditChannel < 5)
						app.modeEditChannel++;
					else
						app.modeEditChannel = 0;

					app.updateTracklist();
				},
				32: function () {
					console.logHotkey('Space - Edit mode');
					if (app.modePlay)
						app.onCmdStop();
					if (app.player.position.length)
						app.onCmdToggleEditMode();
				},
				33: function () {
					console.logHotkey('PageUp - Move cursor up by half of tracklines');
					app.tracklist.moveCurrentline(-(app.settings.tracklistLines >> 1), true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				34: function () {
					console.logHotkey('PageDown - Move cursor down by half of tracklines');
					app.tracklist.moveCurrentline((app.settings.tracklistLines >> 1), true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				35: function () {
					console.logHotkey('End - Move cursor to end of the position');
					app.tracklist.moveCurrentline(96, true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				36: function () {
					console.logHotkey('Home - Move cursor to start of the position');
					app.tracklist.moveCurrentline(-96, true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				37: function () {
					if (!app.modeEdit)
						return;

					console.logHotkey('Left - Cursor movement');
					if (app.modeEditColumn > 0)
						app.modeEditColumn--;
					else {
						app.modeEditColumn = 7;
						if (app.modeEditChannel > 0)
							app.modeEditChannel--;
						else
							app.modeEditChannel = 5;
					}

					app.updateTracklist();
				},
				38: function () {
					console.logHotkey('Up - Cursor movement');
					app.tracklist.moveCurrentline(-1);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				39: function () {
					if (!app.modeEdit)
						return;

					console.logHotkey('Right - Cursor movement');
					if (app.modeEditColumn < 7)
						app.modeEditColumn++;
					else {
						app.modeEditColumn = 0;
						if (app.modeEditChannel < 5)
							app.modeEditChannel++;
						else
							app.modeEditChannel = 0;
					}

					app.updateTracklist();
				},
				40: function () {
					console.logHotkey('Down - Cursor movement');
					app.tracklist.moveCurrentline(1);
					app.updateTracklist();
					app.updatePanelInfo();
				}
			}[key];

		case 'editorEdit':
			if (!keydown)
				return;

			var cl = app.player.currentLine,
				hl = (app.settings.tracklistLines >> 1) + 1,
				pp = app.player.position[app.player.currentPosition] || app.player.nullPosition,
				cp = pp.ch[app.modeEditChannel].pattern,
				pt = app.player.pattern[cp],
				pl = pt.data[cl];

			if (cl < pt.end) switch (key) {
				case 8:
					return function () { // TODO FIXME
						console.logHotkey('Backspace - Delete trackline from pattern');

						var i = cl, line = cl + 1;
						for (; line < 96; i++, line++)
							pt.data[i] = pt.data[line];
						pt.data[i].tone = pt.data[i].smp = pt.data[i].orn = 0;
						pt.data[i].release = pt.data[i].orn_release = false;
						pt.data[i].cmd = pt.data[i].cmd_data = pt.data[i].volume.byte = 0;

						app.updateTracklist();
					};

				case 45:
					return function () { // TODO FIXME
						console.logHotkey('Insert - New trackline into pattern');

						var len = 96 - cl, i = len - 1, line = 94;
						for (; line >= cl; i--, line--)
							pt.data[i] = pt.data[line];
						pt.data[i].tone = pt.data[i].smp = pt.data[i].orn = 0;
						pt.data[i].release = pt.data[i].orn_release = false;
						pt.data[i].cmd = pt.data[i].cmd_data = pt.data[i].volume.byte = 0;

						app.updateTracklist();
					};

				case 46:
					return function () {
						console.logHotkey('Delete - Clear trackline data');

						switch (app.modeEditColumn) {
							default: case 0:		// NOTE column
								pl.tone = 0;
								pl.release = 0;
								break;
							case 1: 				// SAMPLE column
								pl.smp = 0;
								break;
							case 2: 				// ORNAMENT column
								pl.orn = 0;
								pl.orn_release = 0;
								break;
							case 3: case 4:			// ATTENUATION columns
								pl.volume.byte = 0;
								break;
							case 5: 				// COMMAND column
								pl.cmd = 0;
								pl.cmd_data = 0;
								break;
							case 6: 				// COMMAND DATA 1 column
								pl.cmd_data &= 0x0F;
								break;
							case 7: 				// COMMAND DATA 2 column
								pl.cmd_data &= 0xF0;
								break;
						}

						app.updateEditorCombo();
					};

				default:
					var columnHandler = {
					// NOTE column
						0: function (key, test) {
							var tone = app.getKeynote(key);

							if (tone < 0)
								return false;
							else if (test)
								return true;
							else if (tone > 0) {
								pl.release = false;
								pl.tone = tone;
								if (app.ctrlSample && !pl.smp)
									pl.smp = app.ctrlSample;
								if (app.ctrlOrnament && !pl.orn) {
									pl.orn = app.ctrlOrnament;
									pl.orn_release = false;
								}

								app.tracklist.moveCurrentline(app.ctrlRowStep);
								app.updatePanelInfo();
							}
							else {
								pl.release = true;
								pl.tone = 0;
								pl.smp = 0;
								pl.orn = 0;
								pl.orn_release = false;
							}

							app.updateTracklist();
						},
					// SAMPLE column
						1: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.smp = (key - 48);
							}
							else if (key >= 65 && key <= 86) { // A - V
								if (test)
									return true;

								pl.smp = (key - 55);
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// ORNAMENT column
						2: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.orn_release = false;
								pl.orn = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.orn_release = false;
								pl.orn = (key - 55);
							}
							else if (key === 88 || key === 189) { // X | -
								if (test)
									return true;

								pl.orn_release = true;
								pl.orn = 0;
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// ATTENUATION 1 column
						3: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.volume.L = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.volume.L = (key - 55);
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// ATTENUATION 2 column
						4: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.volume.R = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.volume.R = (key - 55);
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// COMMAND column
						5: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.cmd = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.cmd = (key - 55);

								// recalculate position frames if we changing speed
								if (pl.cmd == 0xF && pl.cmd_data)
									app.player.countPositionFrames(app.player.currentPosition);
							}
							else return;

							app.updateEditorCombo();
						},
					// COMMAND DATA 1 column
						6: function (key, test) {
							if (key >= 48 && key <= 57) // 0 - 9
								key -= 48;
							else if (key >= 65 && key <= 70) // A - F
								key -= 55;
							else
								return false;

							if (test)
								return true;

							pl.cmd_data &= 0x0F;
							pl.cmd_data |= key << 4;

							// recalculate position frames if we changing speed
							if (pl.cmd == 0xF && pl.cmd_data)
								app.player.countPositionFrames(app.player.currentPosition);

							app.updateEditorCombo();
						},
					// COMMAND DATA 2 column
						7: function (key, test) {
							if (key >= 48 && key <= 57) // 0 - 9
								key -= 48;
							else if (key >= 65 && key <= 70) // A - F
								key -= 55;
							else
								return false;

							if (test)
								return true;

							pl.cmd_data &= 0xF0;
							pl.cmd_data |= key;

							// recalculate position frames if we changing speed
							if (pl.cmd == 0xF && pl.cmd_data)
								app.player.countPositionFrames(app.player.currentPosition);

							app.updateEditorCombo();
						}
					}[app.modeEditColumn];

					return (columnHandler(key, true)) ? columnHandler : undefined;
			}

		default:
			return;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleKeyEvent = function (e) {
	var o = this.globalKeyState,
		type = e.type,
		isInput = (e.target && e.target.type === 'text' && e.target.tabIndex > 0),
		key = e.which || e.charCode || e.keyCode,
		canPlay = !!this.player.position.length;

	// cross-platform fixes
	if (browser.isOpera && key === 219)
		key = 91;
	else if (browser.isFirefox) switch (key) {
 		case 59:
 			key = 186; break;
 		case 61:
 			key = 187; break;
 		case 173:
 			key = 189; break;
 	}

	if (type === 'keydown') {
		if (key >= 16 && key <= 18) {
			o.modsHandled = false;
			if (e.location === 2)
				key += 256;
		}

		if (e.repeat)
			type = 'repeat';

		// add new key to the keymapper
		else if (!o[key]) {
			o[key] = true;
			o.length++;
		}

		if (isInput && !this.handleHotkeys('test', key))
			return true;

		if (!this.handleHotkeys(type, key)) {
			if (this.activeTab === 0) {
				// ENTER (hold to play position at current line)
				if (o[13] && o.length === 1 && canPlay && !this.modePlay && !o.lastPlayMode) {
					this.modePlay = this.player.playPosition(false, false, false);
					o.lastPlayMode = 3;
				}
				else if (o[13] && o.length > 1 && this.modePlay && o.lastPlayMode === 3) {
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					o.lastPlayMode = 0;
				}
			}

			if (isInput && o[9]) {
				delete o[9];
				o.length--;
				e.target.blur();
			}
		}
	}
	else if (type === 'keyup') {
		if (o[key] && this.handleHotkeys(type, key))
			isInput = false;

		if (!o.modsHandled && canPlay) {
			// RIGHT SHIFT (play position)
			if (o.length === 1 && o[272]) {
				if (this.modePlay && o.lastPlayMode === 1) {
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					o.lastPlayMode = 0;
				}
				else {
					this.modePlay = this.player.playPosition(false, false, true);
					o.lastPlayMode = 1;
				}

				o.modsHandled = true;
			}
			// RIGHT CTRL (play song)
			else if (o.length === 1 && o[273]) {
				if (this.modePlay && o.lastPlayMode === 2) {
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					o.lastPlayMode = 0;
				}
				else {
					this.modePlay = this.player.playPosition(false, true, true);
					o.lastPlayMode = 2;
				}

				o.modsHandled = true;
			}
		}

		if (this.activeTab === 0) {
			// ENTER (hold to play position at current line)
			if (o[13] && this.modePlay && o.lastPlayMode === 3) {
				this.modePlay = false;
				this.player.stopChannel();
				this.updateTracklist();
				o.lastPlayMode = 0;
			}
		}

		// remove entry from the keymapper
		if (o[key]) {
			delete o[key];
			if (o.length)
				o.length--;
		}
		if (o[key + 256]) {
			delete o[key + 256];
			if (o.length)
				o.length--;
		}

		if (isInput)
			return true;
	}

	e.preventDefault();
	return false;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleHotkeys = function (type, key) {
	var o = this.globalKeyState,
		fn = false;

	if (o[17] && key !== 17) { // handle Ctrl+
		if (key === 90 && o[16]) { // convert Ctrl+Shift+Z to Ctrl+Y
			delete o[key];
			delete o[16];
			if (o.length)
				o.length--;
			o[--key] = true;
		}

		if (o.length === 2) {
			if (key === 82 || key === 116) {
				fn = true; // disable refresh browser hotkeys
				type = 'test';
			}
			else if (!(fn = this.hotkeyMap(type, 'globalCtrl', key))) {
				if (this.activeTab === 0 && !(fn = this.hotkeyMap(type, 'trackerCtrl', key)))
					fn = this.hotkeyMap(type, 'editorCtrl', key);
				else if (this.activeTab === 1)
					fn = this.hotkeyMap(type, 'smpeditCtrl', key);
				else if (this.activeTab === 2)
					fn = this.hotkeyMap(type, 'orneditCtrl', key);
			}
		}
		else if (o.length === 3 && o[16] && this.activeTab === 0)
			fn = this.hotkeyMap(type, 'trackerCtrlShift', key);
	}
	else if (o[16] && key !== 16 && o.length === 2 && this.activeTab === 0)
		fn = this.hotkeyMap(type, 'editorShift', key);
	else if (o.length === 1) {
		if (!(fn = this.hotkeyMap(type, 'globalFs', key))) {
			if (this.activeTab === 0) {
				if (!(fn = this.hotkeyMap(type, 'editorKeys', key)) && this.player.position.length && this.modeEdit)
					fn = this.hotkeyMap(type, 'editorEdit', key);
			}
			else
				fn = this.hotkeyMap(type, 'smpornKeys', key);
		}
	}

	if (fn) {
		if (type !== 'test') {
			fn(key);
			o.modsHandled = true;
		}

		return true;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.getKeynote = function (key) {
	var t = ((this.ctrlOctave - 1) * 12),
		c = String.fromCharCode(key),
		i = ' ZSXDCVGBHNJMQ2W3ER5T6Y7UI9O0P'.indexOf(c);

	return (i > 0) ? (t + i) : {
		49 : 0,      // 1
		65 : 0,      // A
		192: 0,      // `
		189: 0,      // -
		222: 0,      // '
		188: t + 13, // ,
		76 : t + 14, // L
		190: t + 15, // .
		186: t + 16, // ;
		191: t + 17, // /
		219: t + 30, // [
		187: t + 31, // =
		221: t + 32  // ]
	}[key] || -1;
};
//---------------------------------------------------------------------------------------

/** Tracker.paint submodule */
//---------------------------------------------------------------------------------------
/*
 * This method initialize pixel font pre-colored template canvas. Color combinations:
 *   0 - [ fg: BLACK, bg: WHITE ]
 *   1 - [ fg:  GRAY, bg: WHITE ]
 *   2 - [ fg: WHITE, bg: RED ]
 *   3 - [ fg:  GRAY, bg: RED ]
 *   4 - [ fg: WHITE, bg: HILITE ]
 *   5 - [ fg:  GRAY, bg: HILITE ]
 *   6 - [ fg: WHITE, bg: BLACK ]
 *   7 - [ fg:  GRAY, bg: BLACK ]
 *   8 - [ fg: WHITE, bg: DARKRED ]
 *   9 - [ fg:  GRAY, bg: DARKRED ]
 */
Tracker.prototype.initPixelFont = function (font) {
	// backgrounds (white, red, hilite, block)
	var bg = [ '#fff', '#f00', '#38c', '#000', '#800' ],
		o = this.pixelfont, i, l = bg.length * 10,
		w = font.width, copy, copyctx;

	o.obj = document.createElement('canvas');
	o.obj.width = w;
	o.obj.height = l;
	o.ctx = o.obj.getContext('2d');

	for (i = 0; i < l; i += 10) {
		o.ctx.fillStyle = bg[i / 10];
		o.ctx.fillRect(0, i, w, 10);
	}

	copy = document.createElement('canvas');
	copy.width = w;
	copy.height = 5;
	copyctx = copy.getContext('2d');

	copyctx.save();
	copyctx.clearRect(0, 0, w, 5);
	copyctx.drawImage(font, 0, 0);

	copyctx.fillStyle = '#fff';
	copyctx.globalCompositeOperation = "source-in";
	copyctx.fillRect(0, 0, w, 5);
	copyctx.restore();

	for (i = 0; i < l; i += 10)
		o.ctx.drawImage(copy, 0, i);

	copyctx.save();
	copyctx.clearRect(0, 0, w, 5);
	copyctx.drawImage(font, 0, 0);

	copyctx.fillStyle = '#aaa';
	copyctx.globalCompositeOperation = "source-in";
	copyctx.fillRect(0, 0, w, 5);
	copyctx.restore();

	for (i = 5; i < l; i += 10)
		o.ctx.drawImage(copy, 0, i);

	o.ctx.drawImage(font, 0, 0);

	// throw it to the garbage...
	copyctx = null;
	copy = null;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateTracklist = function (update) {
	var o = this.tracklist.canvasData,
		offs = this.tracklist.offsets,
		player = this.player,
		hexdec = this.settings.hexTracklines ? 16 : 10,
		font = this.pixelfont.obj,
		ctx = this.tracklist.ctx,
		pos = player.currentPosition,
		pp = player.position[pos] || player.nullPosition,
		pt, dat,
		w = this.tracklist.obj.width,
		h = this.settings.tracklistLineHeight,
		lines = this.settings.tracklistLines,
		half = lines >> 1,
		line = player.currentLine - half,
		buf, cc, ccb, chn, i, j, k, x, ypad, y,
		charFromBuf = function(i) { return (buf.charCodeAt(i || 0) - 32) * 6 };

	if (update) {
		o.center = ((w - o.lineWidth) >> 1);
		o.vpad = Math.round((h - 5) / 2);
		o.trkOffset = o.center + 24; // (2 trackline numbers + 2 padding) * fontWidth
		offs.y = [];
	}

	for (i = 0, y = 0, ypad = o.vpad; i < lines; i++, line++, ypad += h, y += h) {
		if (update)
			offs.y[i] = y;

		if (i !== half)
			ccb = 0; // basic color combination
		else if (this.modeEdit) {
			ccb = 10; // col.combination: 2:WHITE|RED
			ctx.fillStyle = '#f00';
			ctx.fillRect(0, y, w, h);
		}
		else {
			ccb = 20; // col.combination: 4:WHITE|HILITE
			if (update) {
				ctx.fillStyle = '#38c';
				ctx.fillRect(0, y, w, h);
			}
		}

		if (line >= 0 && line < pp.length) {
			buf = ('0' + line.toString(hexdec)).substr(-2);
			ctx.drawImage(font, charFromBuf(0), ccb, 5, 5, o.center, ypad, 5, 5);
			ctx.drawImage(font, charFromBuf(1), ccb, 5, 5, o.center + 6, ypad, 5, 5);
		}
		else {
			ctx.fillStyle = '#fff';
			ctx.fillRect(o.center, ypad, o.lineWidth, 5);
			continue; // TODO prev/next position hints
		}

		for (chn = 0; chn < 6; chn++) {
			pt = player.pattern[pp.ch[chn].pattern];
			dat = pt.data[line];

			for (j = 0; j < 8; j++) {
				x = o.trkOffset       // center + (4 * fontWidth)
				  + chn * o.chnWidth  // channel * ((12 columns + 2 padding) * fontWidth)
				  + o.columns[j];     // column offset premulitplied by fontWidth

				if (update) {
					offs.x[chn][j] = x;

					// overlapping area between channels
					if (!j && chn)
						offs.x[chn - 1][8] = x;
				}

				cc = ccb;
				if (!j && !(i === half && this.modeEdit) &&
					this.selectionLen && this.selectionChannel === chn &&
					line >= this.selectionLine &&
					line <= (this.selectionLine + this.selectionLen)) {

					ctx.fillStyle = '#000';
					ctx.fillRect(x - 3, y, o.selWidth, h);
					cc = 30; // col.combination: 6:WHITE|BLACK
				}
				else if (i === half && this.modeEdit &&
						this.modeEditChannel === chn &&
						this.modeEditColumn === j) {

					ctx.fillStyle = '#800';
					if (j)
						ctx.fillRect(x - 1, y,  7, h);
					else
						ctx.fillRect(x - 2, y, 22, h);

					cc = 40; // col.combination: 6:WHITE|DARKRED
				}

				if (line >= pt.end)
					cc += 5; // col.combination to GRAY foreground

				if (j) {
					k = -1;
					switch (j) {
						case 1:
							if (dat.smp)
								k = dat.smp;
							break;

						case 2:
							if (dat.orn_release)
								k = 33; // ('X' - 'A') + 10;
							else if (dat.orn)
								k = dat.orn;
							break;

						case 3:
							if (dat.volume.byte)
								k = dat.volume.L;
							break;

						case 4:
							if (dat.volume.byte)
								k = dat.volume.R;
							break;

						case 5:
							if (dat.cmd || dat.cmd_data)
								k = dat.cmd;
							break;

						case 6:
							if (dat.cmd || dat.cmd_data)
								k = ((dat.cmd_data & 0xf0) >> 4);
							break;

						case 7:
							if (dat.cmd || dat.cmd_data)
								k = (dat.cmd_data & 0x0f);
							break;
					}

					buf = (k < 0) ? '\x7f' : k.toString(36);
					ctx.drawImage(font, charFromBuf(), cc, 5, 5, x, ypad, 5, 5);
				}
				else {
					buf = '---';
					if (dat.release)
						buf = 'R--';
					else if (dat.tone)
						buf = player.tones[dat.tone].txt;

					ctx.drawImage(font, charFromBuf(0), cc, 5, 5, x, ypad, 5, 5);
					ctx.drawImage(font, charFromBuf(1), cc, 5, 5, x + 6, ypad, 5, 5);
					ctx.drawImage(font, charFromBuf(2), cc, 5, 5, x + 12, ypad, 5, 5);
				}
			}
		}
	}

	if (update) {
		// expand offsets to full canvas width and height
		offs.x[5][8] = w;
		offs.x[0][0] = 0;
		offs.y[i] = y;
	}
};
//---------------------------------------------------------------------------------------

/** Tracker.gui submodule - element populator with jQuery */
//---------------------------------------------------------------------------------------
Tracker.prototype.populateGUI = function () {
	var app = this, populatedElementsTable = [
		{
			global:   'document',
			method:   'bind',
			param:    'contextmenu',
			handler:  function(e) {
				e.preventDefault();
				return false;
			}
		}, {
			global:   'window',
			method:   'resize',
			handler:  function() {
				var c = app.tracklist.countTracklines();
				if (c !== app.settings.tracklistLineHeight) {
					app.tracklist.setHeight(c);
					app.updateTracklist(true);
				}
			}
		}, {
			global:   'window',
			method:   'bind',
			param:    'keyup keydown',
			handler:  function(e) { return app.handleKeyEvent(e.originalEvent) }
		}, {
			global:   'window',
			method:   'bind',
			param:    'blur',
			handler:  function(e) {
				var i, o = app.globalKeyState;
				for (i in o) if ((i - 0)) {
					delete o[i];
					o.length--;
				}
			}
		}, {
			selector: '[data-toggle="tooltip"]',
			method:   'tooltip',
			data:     {
				animation: false,
				container: '.tooltip-target',
				viewport:  { selector: '.tooltip-target', padding: 0 },
				template:  '<div class="tooltip tooltip-custom" role="tooltip"><div class="tooltip-inner"></div></div>'
			}
		}, {
			selector: 'img.pixelfont',
			method:   'load',
			handler:  function(e) {
				app.initPixelFont(e.target);
				app.updateTracklist(true);
			}
		}, {
			selector: 'canvas',
			method:   'each',
			handler:  function(i, el) {
				var name = el.id, o = app[name];
				if (o !== undefined) {
					o.obj = el;
					o.ctx = el.getContext('2d');

					// first height initialization
					if (name === 'tracklist')
						o.setHeight();
				}
			}
		}, {
			selector: '#main-tabpanel a',
			method:   'bind',
			param:    'click',
			handler:  function(e) {
				app.activeTab = parseInt($(this).data().value);
			}
		}, {
			selector: '#tracklist',
			method:   'on',
			param:    'mousewheel DOMMouseScroll',
			handler:  function(e) {
				if (!app.player.position.length || app.modePlay)
					return;

				var delta = e.originalEvent.wheelDelta || -e.originalEvent.deltaY || -e.originalEvent.detail;

				e.stopPropagation();
				e.preventDefault();
				e.target.focus();

				if (delta < 0)
					app.tracklist.moveCurrentline(1);
				else if (delta > 0)
					app.tracklist.moveCurrentline(-1);

				app.updateTracklist();
				app.updatePanelInfo();
			}
		}, {
			selector: '#scOctave',
			method:   'TouchSpin',
			data: {
				initval: '2',
				min: 1, max: 8
			}
		}, {
			selector: '#scAutoSmp',
			method:   'TouchSpin',
			data: {
				initval: '0',
				radix: 32,
				min: 0, max: 31
			}
		}, {
			selector: '#scAutoOrn',
			method:   'TouchSpin',
			data: {
				initval: '0',
				radix: 16,
				min: 0, max: 15
			}
		}, {
			selector: '#scRowStep',
			method:   'TouchSpin',
			data: {
				initval: '0',
				min: 0, max: 8
			}
		}, {
			selector: '#scPattern,#scPosCurrent,#scPosRepeat,input[id^="scChnPattern"]',
			method:   'TouchSpin',
			data: {
				initval: '0',
				min: 0, max: 0
			}
		}, {
			selector: '#scPatternLen,#scPosLength',
			method:   'TouchSpin',
			data: {
				initval: '64',
				min: 1, max: 96
			}
		}, {
			selector: '#scPosSpeed',
			method:   'TouchSpin',
			data: {
				initval: '6',
				min: 1, max: 31
			}
		}, {
			selector: 'input[id^="scChnTrans"]',
			method:   'TouchSpin',
			data: {
				initval: '0',
				min: -24, max: 24
			}
		}, {
			selector: 'input[id^="scChnButton"]',
			method:   'each',
			handler:  function(i, el) {
				var cc = el.id.substr(-1);
				$(this).bootstrapToggle({
					on: cc,
					off: cc,
					onstyle: 'default',
					offstyle: 'default',
					size: 'mini',
					width: 58
				}).change(function(e) {
					var el = e.target;
					app.player.SAA1099.mute((el.value - 1), !el.checked);
				});
			}
		}, {
			selector: '#scPosCurrent',
			method:   'change',
			handler:  function(e) {
				if (!app.player.position.length || app.modePlay) {
					e.preventDefault();
					return;
				}

				app.player.currentPosition = $(this).val() - 1;
				app.player.currentLine = 0;

				app.updatePanelInfo();
				app.updatePanelPosition();
				app.updateTracklist();
			}
		}, {
			selector: '#scPattern',
			method:   'change',
			handler:  function() {
				if (app.player.pattern.length <= 1)
					return;
				app.workingPattern = $(this).val() - 0;
				app.updatePanelPattern();
			}
		}, {
			selector: 'a[id^="miFileImportDemo"]',
			method:   'click',
			handler:  function() {
				var data = $(this).data(), fn = data.filename;
				if (!fn)
					return false;
				app.loadDemosong(fn);
			}
		}, {
			selector: '#miStop',
			method:   'click',
			handler:  function() { app.onCmdStop() }
		}, {
			selector: '#miSongPlay',
			method:   'click',
			handler:  function() { app.onCmdSongPlay() }
		}, {
			selector: '#miSongPlayStart',
			method:   'click',
			handler:  function() { app.onCmdSongPlayStart() }
		}, {
			selector: '#miPosPlay',
			method:   'click',
			handler:  function() { app.onCmdPosPlay() }
		}, {
			selector: '#miPosPlayStart',
			method:   'click',
			handler:  function() { app.onCmdPosPlayStart() }
		}, {
			selector: '#miToggleLoop',
			method:   'click',
			handler:  function() { app.onCmdToggleLoop() }
		}
	];

//---------------------------------------------------------------------------------------
	for (var i = 0, l = populatedElementsTable.length; i < l; i++) {
		var obj = populatedElementsTable[i],
			param = obj.handler || obj.data,
			selector = (obj.selector) ? "'" + obj.selector + "'" : obj.global;
		eval("$(" + selector + ")." + (obj.param
			? (obj.method + "('" + obj.param + "', param)")
			: (obj.method + "(param)")));
	}
};
//---------------------------------------------------------------------------------------
