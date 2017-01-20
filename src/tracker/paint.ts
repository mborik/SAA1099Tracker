/*
 * Canvas Initializing and drawing function prototypes.
 * Copyright (c) 2012-2017 Martin Borik <mborik@users.sourceforge.net>
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
/// <reference path="../index.d.ts" />
/// <reference path="tracklist.ts" />
/// <reference path="smporn.ts" />
//---------------------------------------------------------------------------------------
/**
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
 * @param {HTMLImageElement} font
 */
Tracker.prototype.initPixelFont = function(font: HTMLImageElement): void {
	// backgrounds (white, red, hilite, block, darkred)
	const BG = [ '#fff', '#f00', '#38c', '#000', '#800' ];

	let o = this.pixelfont;
	let l = BG.length * 10;
	let w = font.width;

	console.log('Tracker.paint', 'Initializing pixel-font...');

	o.obj = document.createElement('canvas');
	o.obj.width = w;
	o.obj.height = l;
	o.ctx = o.obj.getContext('2d');

	for (let i = 0; i < l; i += 10) {
		o.ctx.fillStyle = BG[i / 10];
		o.ctx.fillRect(0, i, w, 10);
	}

	let copy = document.createElement('canvas');
	copy.width = w;
	copy.height = 5;

	let copyctx = copy.getContext('2d');
	copyctx.save();
	copyctx.clearRect(0, 0, w, 5);
	copyctx.drawImage(font, 0, 0);

	copyctx.fillStyle = '#fff';
	copyctx.globalCompositeOperation = "source-in";
	copyctx.fillRect(0, 0, w, 5);
	copyctx.restore();

	for (let i = 0; i < l; i += 10) {
		o.ctx.drawImage(copy, 0, i);
	}

	copyctx.save();
	copyctx.clearRect(0, 0, w, 5);
	copyctx.drawImage(font, 0, 0);

	copyctx.fillStyle = '#aaa';
	copyctx.globalCompositeOperation = "source-in";
	copyctx.fillRect(0, 0, w, 5);
	copyctx.restore();

	for (let i = 5; i < l; i += 10) {
		o.ctx.drawImage(copy, 0, i);
	}

	o.ctx.drawImage(font, 0, 0);

	// throw it to the garbage...
	copyctx = null;
	copy = null;
};
//---------------------------------------------------------------------------------------
interface TracklistBackupPosLine {
	pp: pPosition;
	line: number
}
//---------------------------------------------------------------------------------------
Tracker.prototype.updateTracklist = function(update?: boolean): void {
	let o: TracklistCanvasData = this.tracklist.canvasData;
	let sel: TracklistSelection = this.tracklist.selection;
	let offs: TracklistOffsets = this.tracklist.offsets;
	let ctx: CanvasRenderingContext2D = this.tracklist.ctx;
	let font: HTMLCanvasElement = this.pixelfont.obj;

	let player: Player = this.player;
	let pos = player.currentPosition;
	let pp = player.position[pos] || player.nullPosition;

	let hexa: boolean = this.settings.hexTracklines;
	let triDigitLine = (!hexa && pp.length > 100);

	let w: number = this.tracklist.obj.width;
	let h: number = this.settings.tracklistLineHeight;
	let lines: number = this.settings.tracklistLines;
	let half = lines >> 1;

	let buf: string;
	let charFromBuf = ((i: number = 0) => (buf.charCodeAt(i) - 32) * fontWidth);

	if (update) {
		o.center = ((w - o.lineWidth) >> 1);
		o.vpad = Math.round((h - 5) / 2);

		// (2 trackline numbers + 2 padding) * fontWidth
		o.trkOffset = o.center + ((2 + 2) * fontWidth);
		offs.y = [];
	}

	let line = player.currentLine - half;
	let backup: TracklistBackupPosLine = null;
	let status: number;

	let i = 0, y = 0, ypad = o.vpad;
	for (; i < lines; i++, line++, ypad += h, y += h) {
		if (update) {
			offs.y[i] = y;
		}

		let ccb: number;
		if (i !== half) {
			ccb = 0; // basic color combination
			ctx.clearRect(o.center - 6, y, o.lineWidth + 9, h);
		}
		else if (this.modeEdit) {
			ccb = 10; // col.combination: 2:WHITE|RED
			ctx.fillStyle = '#f00';
			ctx.fillRect(0, y, w, h);
		}
		else {
			ccb = 20; // col.combination: 4:WHITE|HILITE
			ctx.fillStyle = '#38c';
			ctx.fillRect(0, y, w, h);
		}

		if (line < 0) {
			if (!(pos && pp)) {
				continue;
			}

			// prev position hints
			backup = { pp: pp, line: line };
			pp = player.position[pos - 1];
			line += pp.length;
		}
		else if (line >= pp.length) {
			if (!(pos < (player.position.length - 1) && pp)) {
				continue;
			}

			// next position hints
			backup = { pp: pp, line: line };
			line -= pp.length;
			pp = player.position[pos + 1];
		}

		buf = ('00' + line.toString(hexa ? 16 : 10)).substr(-3);

		if (triDigitLine || (!hexa && line > 99)) {
			ctx.drawImage(font, charFromBuf(0), ccb, 5, 5, o.center - fontWidth, ypad, 5, 5);
		}

		ctx.drawImage(font, charFromBuf(1), ccb, 5, 5, o.center, ypad, 5, 5);
		ctx.drawImage(font, charFromBuf(2), ccb, 5, 5, o.center + fontWidth, ypad, 5, 5);

		for (let chn = 0; chn < 6; chn++) {
			let pt = player.pattern[pp.ch[chn].pattern];
			let dat = pt.data[line];

			for (let col = 0; col < 8; col++) {
				let x = o.trkOffset       // center + (4 * fontWidth)
				      + chn * o.chnWidth  // channel * ((12 columns + 2 padding) * fontWidth)
				      + o.columns[col];   // column offset premulitplied by fontWidth

				if (update) {
					offs.x[chn][col] = x;

					// overlapping area between channels
					if (!col && chn) {
						offs.x[chn - 1][8] = x;
					}
				}

				let cc = ccb; // per column adjusted color combination
				if (!backup &&
					!(i === half && this.modeEdit) &&
					sel.len && sel.channel === chn &&
					line >= sel.line &&
					line <= (sel.line + sel.len)) {

					if (!col) {
						ctx.fillStyle = '#000';
						ctx.fillRect(x - 3, y, o.selWidth, h);
					}

					cc = 30; // col.combination: 6:WHITE|BLACK
				}
				else if (i === half && this.modeEdit &&
						this.modeEditChannel === chn &&
						this.modeEditColumn === col) {

					// value for statusbar
					status = (col >= 5) ? dat.cmd : 0;

					ctx.fillStyle = '#800';
					if (col) {
						ctx.fillRect(x - 1, y,  7, h);
					}
					else {
						ctx.fillRect(x - 2, y, 22, h);
					}

					cc = 40; // col.combination: 6:WHITE|DARKRED
				}

				if (line >= pt.end) {
					cc += 5; // col.combination to GRAY foreground
				}

				if (col) {
					let value: number = -1;
					switch (col) {
						case 1:
							if (dat.smp) {
								value = dat.smp;
							}
							break;

						case 2:
							if (dat.orn_release) {
								value = 33; // ('X' - 'A') + 10;
							}
							else if (dat.orn) {
								value = dat.orn;
							}
							break;

						case 3:
							if (dat.volume.byte) {
								value = dat.volume.L;
							}
							break;

						case 4:
							if (dat.volume.byte) {
								value = dat.volume.R;
							}
							break;

						case 5:
							if (dat.cmd || dat.cmd_data) {
								value = dat.cmd;
							}
							break;

						case 6:
							if (dat.cmd || dat.cmd_data) {
								value = ((dat.cmd_data & 0xf0) >> 4);
							}
							break;

						case 7:
							if (dat.cmd || dat.cmd_data) {
								value = (dat.cmd_data & 0x0f);
							}
							break;
					}

					buf = (value < 0) ? '\x7f' : value.toString(36);
					ctx.drawImage(font, charFromBuf(), cc, 5, 5, x, ypad, 5, 5);
				}
				else {
					buf = '---';
					if (dat.release) {
						buf = 'R--';
					}
					else if (dat.tone) {
						buf = player.tones[dat.tone].txt;
					}

					for (let k = 0; k < 3; k++) {
						ctx.drawImage(font, charFromBuf(k), cc, 5, 5, x, ypad, 5, 5);
						x += fontWidth;
					}
				}
			}
		}

		if (backup) {
			pp = backup.pp;
			line = backup.line;
			backup = undefined;

			ctx.save();
			ctx.fillStyle = 'rgba(255,255,255,.75)';
			ctx.globalCompositeOperation = "xor";
			ctx.fillRect(o.center - 6, ypad, o.lineWidth + 6, 5);
			ctx.restore();
		}
	}

	if (!this.modePlay && this.modeEdit && typeof status !== 'undefined')
		this.doc.showTracklistStatus(this.modeEditColumn, status);

	if (update) {
		// expand offsets to full canvas width and height
		offs.x[5][8] = w;
		offs.x[0][0] = 0;
		offs.y[i] = y;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateSampleEditor = function(update?: boolean,
		limitFrom?: number, limitTo?: number): void {

	let o: SmpOrnEditor = this.smpornedit,
		sample: pSample = this.player.sample[this.workingSample],
		amp = o.amp.ctx,
		noise = o.noise.ctx,
		range = o.range.ctx,
		pixel = amp.getImageData(22, 0, 1, 1),
		half = o.halfing,
		ptr = o.smpeditScroll,
		end = ptr + 64,
		add = o.columnWidth,
		x = o.centering,
		w = add - 1;

	if (typeof limitFrom !== 'undefined') {
		let i = Math.max(ptr, limitFrom);
		x += (i - ptr) * add;
		ptr = i;
	}
	if (typeof limitTo !== 'undefined') {
		end = Math.min(end, ++limitTo);
	}

	for (; ptr < end; ptr++, x += add) {
		let color: string = '#000';
		if (ptr >= sample.end && !sample.releasable) {
			color = '#888';
		}
		else if (sample.loop != sample.end && ptr >= sample.loop && ptr < sample.end) {
			color = '#38c';
		}
		range.strokeStyle = range.fillStyle = noise.fillStyle =
		amp.strokeStyle = amp.fillStyle = color;

		let data = sample.data[ptr];

		for (let i = 0, yl = half - 12, yr = half + 5; i < 15; i++, yl -= 9, yr += 9) {
			amp.clearRect(x, yl, w, 8);
			amp.putImageData(pixel, x, yl + 7);

			if (i < data.volume.L) {
				amp.fillRect(x, yl, w, 8);
			}

			amp.clearRect(x, yr, w, 8);
			amp.putImageData(pixel, x, yr);

			if (i < data.volume.R) {
				amp.fillRect(x, yr, w, 8);
			}
		}

		amp.clearRect(x, 292, w, 12);
		amp.strokeRect(x - 0.5, 291.5, w - 1, 12);

		if (data.enable_freq) {
			amp.fillRect(x + 1, 293, w - 4, 9);
		}

		for (let i = 0, yn = 34; i < 4; i++, yn -= 9) {
			noise.clearRect(x, yn, w, 8);
			noise.putImageData(pixel, x, yn + 7);

			if (data.enable_noise && i <= data.noise_value) {
				noise.fillRect(x, yn, w, 8);
			}
		}

		range.clearRect(x, 4, 12, 8);

		if (ptr >= sample.end) {
			range.fillRect(x, 12, 12, 1);
		}
		else {
			range.fillRect(x, 10, 12, 3);

			if (sample.loop <= sample.end && ptr === (sample.end - 1)) {
				range.beginPath();
				range.moveTo(x, 10);
				range.lineTo(x + 12, 10);
				range.lineTo(x + 12, 4);
				range.closePath();
				range.fill();
			}
			if (sample.loop < sample.end && ptr === sample.loop) {
				range.beginPath();
				range.moveTo(x, 10);
				range.lineTo(x + 12, 10);
				range.lineTo(x, 4);
				range.closePath();
				range.fill();
			}
		}
	}

	if (update) {
		let diff = (sample.end - sample.loop);

		$('#txSampleName').val(sample.name);
		$('#scSampleLength').val('' + sample.end);
		$('#scSampleRepeat').val('' + diff)
			.trigger('touchspin.updatesettings', { min: 0, max: sample.end });

		if (!diff && sample.releasable) {
			sample.releasable = false;
		}

		$('#chSampleRelease').prop('checked', sample.releasable);
		$('#chSampleRelease').prop('disabled', !diff).parent()
			[diff ? 'removeClass' : 'addClass']('disabled');
	}
};
//---------------------------------------------------------------------------------------
