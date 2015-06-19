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
$(document).ready(function () { window.Tracker = new Tracker });
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
var Tracker = (function() {
	function Tracker() {
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

		this.selectionPoint = new TracklistPosition;
		this.selectionStarted = false;
		this.selectionChannel = 0;
		this.selectionLine = 0;
		this.selectionLen = 0;

		this.settings = {
			tracklistLines: 17,
			tracklistLineHeight: 9,
			hexTracklines: true,
			hexSampleFreq: false,
			audioInterrupt: 50,
			audioBuffers: 0
		};

		this.pixelfont = { obj: null, ctx: null };
		this.tracklist = { obj: null, ctx: null };
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
		d = true, i;

	if (len) {
		len--;
		$(a[0]).trigger('touchspin.updatesettings', { min: 1, max: len });
		if (pat > len)
			pat = len;
	}
	else {
		$(a[0]).trigger('touchspin.updatesettings', { min: 0, max: 0 });
		pat = 0;
	}

	for (i = 1; i <= 6; i++)
		$('#scChnPattern' + i).trigger('touchspin.updatesettings', { min: 0, max: len });

	if (pat) {
		d = false;
		$(a[1]).val(this.player.pattern[pat].end);
	}
	else
		$(a[1]).val(64);

	$(a[0]).val(pat);
	$('#txPatternUsed').val(this.player.countPatternUsage(pat));
	$('#txPatternTotal').val(len);

	this.workingPattern = pat;

	if (d !== lastState) {
		for (i = 0, len = a.length; i < len; i++)
			$(a[i] + ',' + a[i] + '~span>button').prop('disabled', d);
	}
}
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPosition = function () {
	var a = [ '#scPosCurrent', '#scPosLength', '#scPosSpeed', '#txPosTotal', '#scPosRepeat' ],
		lastState = $(a[0]).prop('disabled'),
		pos = null, buf,
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

		pos = new pPosition(64, 6);
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
Tracker.prototype.initPixelFont = function (callback) {
	// backgrounds (white, red, hilite, block)
	var bg = [ '#fff', '#f00', '#38c', '#000', '#800' ],
		o = this.pixelfont, i, l = bg.length * 10, w, copy, copyctx,
		font = $('.pixelfont')[0];

	font.onload = function() {
		w = font.width;

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

		// fire callback if needed
		if (callback !== void 0)
			callback();

		// throw it to the garbage...
		copyctx = null;
		copy = null;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateTracklist = function () {
	var columns = [ 0, 4, 5, 6, 7, 9, 10, 11 ],
		selWidth = 78, // (12 columns + 1 padding) * fontWidth
		lineWidth = 516, // (((12 columns + 2 padding) * 6 channels) + 2 tracknumber) * fontWidth
		lineHeight = this.settings.tracklistLineHeight,
		lines = this.settings.tracklistLines,
		hexdec = this.settings.hexTracklines ? 16 : 10,
		player = this.player,
		w = this.tracklist.obj.width,
		buf, cc, ccb, chn, i, j, k, x, y,
		font = this.pixelfont.obj,
		ctx = this.tracklist.ctx,
		pos = player.currentPosition, pt,
		pp = ((player.position.length) ? player.position[pos] : new pPosition(64)),
		half = lines >> 1,
		line = player.currentLine - half,
		center = ((w - lineWidth) >> 1),
		vpad = Math.round((lineHeight - 6) / 2),
		charFromBuf = function(i) { return (buf.charCodeAt(i || 0) - 32) * 6 };

	for (i = 0, y = vpad; i < lines; i++, line++, y += lineHeight) {
		if (i === half) {
			ctx.fillStyle = this.modeEdit ? '#f00' : '#38c';
			ctx.fillRect(0, y - vpad, w, lineHeight);
			ccb = this.modeEdit ? 10 : 20; // col.combination: 2:WHITE|RED, or 4:WHITE|HILITE
		}
		else ccb = 0; // basic color combination

		if (line >= 0 && line < pp.length) {
			buf = ('0' + line.toString(hexdec)).substr(-2);
			ctx.drawImage(font, charFromBuf(0), ccb, 6, 5, center, y, 6, 5);
			ctx.drawImage(font, charFromBuf(1), ccb, 6, 5, center + 6, y, 6, 5);
		}
		else {
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, y - vpad, w, lineHeight);
			continue; // TODO prev/next position hints
		}

		for (chn = 0; chn < 6; chn++) {
			pt = player.pattern[pp.ch[chn].pattern];

			for (j = 0; j < 8; j++) {
				x = center + 24      // (4 * fontWidth)
				  + (chn * 84)       // channel * ((12 columns + 2 padding) * fontWidth)
				  + (columns[j] * 6);

				cc = ccb;
				if (!j && !(i === half && this.modeEdit) &&
					this.selectionLen && this.selectionChannel === chn &&
					line >= this.selectionLine &&
					line <= (this.selectionLine + this.selectionLen)) {

					ctx.fillStyle = '#000';
					ctx.fillRect(x - 3, y - vpad, selWidth, lineHeight);
					cc = 30; // col.combination: 6:WHITE|BLACK
				}
				else if (i === half && this.modeEdit &&
					this.modeEditChannel === chn &&
					this.modeEditColumn === j) {

					ctx.fillStyle = '#800';
					if (j)
						ctx.fillRect(x, y - vpad, 7, lineHeight);
					else
						ctx.fillRect(x - 2, y - vpad, 23, lineHeight);

					cc = 40; // col.combination: 6:WHITE|DARKRED
				}

				if (line >= pt.end)
					cc += 5; // col.combination to GRAY foreground

				if (j) {
					k = -1;
					switch (j) {
						case 1:
							if (pt.data[line].smp)
								k = pt.data[line].smp;
							break;

						case 2:
							if (pt.data[line].orn_release)
								k = 33; // ('X' - 'A') + 10;
							else if (pt.data[line].orn)
								k = pt.data[line].orn;
							break;

						case 3:
							if (pt.data[line].volume.byte)
								k = pt.data[line].volume.L;
							break;

						case 4:
							if (pt.data[line].volume.byte)
								k = pt.data[line].volume.R;
							break;

						case 5:
							if (pt.data[line].cmd || pt.data[line].cmd_data)
								k = pt.data[line].cmd;
							break;

						case 6:
							if (pt.data[line].cmd || pt.data[line].cmd_data)
								k = ((pt.data[line].cmd_data & 0xf0) >> 4);
							break;

						case 7:
							if (pt.data[line].cmd || pt.data[line].cmd_data)
								k = (pt.data[line].cmd_data & 0x0f);
							break;
					}

					buf = (k < 0) ? '\x7f' : k.toString(36);
					ctx.drawImage(font, charFromBuf(), cc, 6, 5, x, y, 6, 5);
				}
				else {
					buf = '---';
					k = pt.data[line];
					if (k.release)
						buf = 'R--';
					else if (k.tone)
						buf = player.tones[k.tone].txt;

					ctx.drawImage(font, charFromBuf(0), cc, 6, 5, x, y, 6, 5);
					ctx.drawImage(font, charFromBuf(1), cc, 6, 5, x + 6, y, 6, 5);
					ctx.drawImage(font, charFromBuf(2), cc, 6, 5, x + 12, y, 6, 5);
				}
			}
		}
	}

	if (!player.position.length)
		pp = null;
};
//---------------------------------------------------------------------------------------

/** Tracker.gui submodule - element populator with jQuery */
//---------------------------------------------------------------------------------------
Tracker.prototype.populateGUI = function () {
	var i, app = this, populatedElementsTable = [
		{
			selector: 'canvas',
			method:   'each',
			handler:  function(i, el) {
				var name = el.id, o = app[name];
				if (o !== undefined) {
					o.obj = el;
					o.ctx = el.getContext('2d');

					// first height initialization
					if (name === 'tracklist') {
						o.setHeight = function(height) {
							if (height === void 0)
								height = app.settings.tracklistLines;
							height *= app.settings.tracklistLineHeight;
							$(this.obj).prop('height', height).css({ 'height': height * 2 });
						}

						o.setHeight();
						app.initPixelFont(function() { app.updateTracklist() });
					}
				}
			}
		}, {
			selector: '[data-toggle="tooltip"]',
			method:   'tooltip',
			data:     {
				animation: false,
				container: '.tooltip-target',
				viewport: { selector: '.tooltip-target', padding: 0 },
				template: '<div class="tooltip tooltip-custom" role="tooltip"><div class="tooltip-inner"></div></div>'
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
			handler:  function() {
				if (!app.player.position.length)
					return;
				app.player.currentPosition = $(this).val() - 1;
				app.updatePanelInfo();
				app.updatePanelPosition();
			}
		}, {
			selector: '#scPattern',
			method:   'change',
			handler:  function() {
				if (app.player.pattern.length <= 1)
					return;
				app.workingPattern = $(this).val();
				app.updatePanelPattern();
			}
		}, {
			selector: 'a[id^="miFileImportDemo"]',
			method:   'click',
			handler:  function() { app.loadDemosong($(this).data().filename) }
		}, {
			selector: '#miStop',
			method:   'click',
			handler:  function() {
				app.player.stopChannel();
				app.modePlay = false;
			}
		}, {
			selector: '#miSongPlay',
			method:   'click',
			handler:  function() {
				app.modePlay = app.player.playPosition(false, true, true);
			}
		}, {
			selector: '#miSongPlayStart',
			method:   'click',
			handler:  function() {
				app.modePlay = app.player.playPosition(true, true, true);
			}
		}, {
			selector: '#miPosPlay',
			method:   'click',
			handler:  function() {
				app.modePlay = app.player.playPosition(false, false, false);
			}
		}, {
			selector: '#miPosPlayStart',
			method:   'click',
			handler:  function() {
				app.modePlay = app.player.playPosition(false, false, true);
			}
		}, {
			selector: '#miToggleLoop',
			method:   'click',
			handler:  function() {
				var state = app.player.loopMode = !app.player.loopMode,
					el = $(this).find('span'),
					icon1 = 'glyphicon-repeat', icon2 = 'glyphicon-remove-circle',
					glyph = state ? icon1 : icon2,
					color = state ? '#000' : '#ccc';

				el.removeClass(icon1 + ' ' + icon2);
				el.addClass(glyph).css({ 'color': color });
			}
		}
	];

//---------------------------------------------------------------------------------------
	for (i in populatedElementsTable) {
		if (!populatedElementsTable.hasOwnProperty(i))
			continue;

		var obj = populatedElementsTable[i],
			param = obj.handler || obj.data;
		eval("$('" + obj.selector + "')." + (obj.param
			? (obj.method + "('" + obj.param + "', param)")
			: (obj.method + "(param)")));
	}
};
//---------------------------------------------------------------------------------------
