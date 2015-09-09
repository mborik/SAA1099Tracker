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
	// backgrounds (white, red, hilite, block, darkred)
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
		sel = this.tracklist.selection,
		offs = this.tracklist.offsets,
		player = this.player,
		hexdec = this.settings.hexTracklines ? 16 : 10,
		font = this.pixelfont.obj,
		ctx = this.tracklist.ctx,
		pos = player.currentPosition,
		pp = player.position[pos] || player.nullPosition,
		backup, pt, dat,
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

		if (i !== half) {
			ccb = 0; // basic color combination
			ctx.clearRect(o.center, y, o.lineWidth, h);
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
			if (!(pos && pp))
				continue;

			// prev position hints
			backup = { pp: pp, line: line };
			pp = player.position[pos - 1];
			line += pp.length;
		}
		else if (line >= pp.length) {
			if (!(pos < (player.position.length - 1) && pp))
				continue;

			// next position hints
			backup = { pp: pp, line: line };
			line -= pp.length;
			pp = player.position[pos + 1];
		}

		buf = ('0' + line.toString(hexdec)).substr(-2);
		ctx.drawImage(font, charFromBuf(0), ccb, 5, 5, o.center, ypad, 5, 5);
		ctx.drawImage(font, charFromBuf(1), ccb, 5, 5, o.center + 6, ypad, 5, 5);

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
				if (!(i === half && this.modeEdit) &&
					sel.len && sel.channel === chn &&
					line >= sel.line &&
					line <= (sel.line + sel.len)) {

					if (!j) {
						ctx.fillStyle = '#000';
						ctx.fillRect(x - 3, y, o.selWidth, h);
					}

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

		if (backup) {
			pp = backup.pp;
			line = backup.line;
			backup = void 0;

			ctx.save();
			ctx.fillStyle = 'rgba(255,255,255,.75)';
			ctx.globalCompositeOperation = "lighter";
			ctx.fillRect(o.center, ypad, o.lineWidth, 5);
			ctx.restore();
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
Tracker.prototype.updateSampleEditor = function (update) {
	var o = this.smpornedit,
		sample = this.player.sample[this.workingSample],
		amp = o.amp.ctx,
		noise = o.noise.ctx,
		range = o.range.ctx,
		pixel = amp.getImageData(22, 0, 1, 1),
		color, data,
		half = o.halfing,
		ptr = o.smpeditOffset,
		end = ptr + 64,
		add = o.columnWidth,
		x = o.centering, w = add - 1,
		i, yl, yr, l, r;

	for (; ptr < end; ptr++, x += add) {
		if (ptr >= sample.end && !sample.releasable)
			color = '#888';
		else if (sample.loop != sample.end && ptr >= sample.loop && ptr < sample.end)
			color = '#38c';
		else
			color = '#000';

		range.strokeStyle =
		  range.fillStyle =
		  noise.fillStyle =
		  amp.strokeStyle =
		    amp.fillStyle = color;

		data = sample.data[ptr];
		l = data.volume.L;
		r = data.volume.R;
		yl = half - 12;
		yr = half + 5;

		for (i = 0; i < 15; i++, yl -= 9, yr += 9) {
			amp.clearRect(x, yl, w, 8);
			amp.putImageData(pixel, x, yl + 7);

			if (i < l)
				amp.fillRect(x, yl, w, 8);

			amp.clearRect(x, yr, w, 8);
			amp.putImageData(pixel, x, yr);

			if (i < r)
				amp.fillRect(x, yr, w, 8);
		}

		amp.clearRect(x, 292, w, 12);
		amp.strokeRect(x - 0.5, 291.5, w - 1, 12);

		if (data.enable_freq)
			amp.fillRect(x + 1, 293, w - 4, 9);

		for (i = 0, yl = 34; i < 4; i++, yl -= 9) {
			noise.clearRect(x, yl, w, 8);
			noise.putImageData(pixel, x, yl + 7);

			if (data.enable_noise && i <= data.noise_value)
				noise.fillRect(x, yl, w, 8);
		}

		range.clearRect(x, 4, 12, 8);

		if (ptr >= sample.end)
			range.fillRect(x, 12, 12, 1);
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
		l = (sample.end === sample.loop);

		$('#txSampleName').val(sample.name);
		$('#scSampleLength').val('' + sample.end);
		$('#scSampleRepeat')
			.trigger('touchspin.updatesettings', { min: 0, max: sample.end })
			.val(sample.end - sample.loop);

		if (l && sample.releasable)
			sample.releasable = false;

		$('#chSampleRelease').prop('checked', sample.releasable);
		$('#chSampleRelease').prop('disabled', l).parent()[l ? 'addClass' : 'removeClass']('disabled');

		$('#sbSampleScroll').scrollLeft(0);
	}
};
//---------------------------------------------------------------------------------------
