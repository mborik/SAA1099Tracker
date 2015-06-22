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
		pp = ((player.position.length) ? player.position[pos] : player.nullPosition),
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
			ctx.drawImage(font, charFromBuf(0), ccb, 5, 5, center, y, 5, 5);
			ctx.drawImage(font, charFromBuf(1), ccb, 5, 5, center + 6, y, 5, 5);
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
						ctx.fillRect(x - 1, y - vpad, 7, lineHeight);
					else
						ctx.fillRect(x - 2, y - vpad, 22, lineHeight);

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
					ctx.drawImage(font, charFromBuf(), cc, 5, 5, x, y, 5, 5);
				}
				else {
					buf = '---';
					k = pt.data[line];
					if (k.release)
						buf = 'R--';
					else if (k.tone)
						buf = player.tones[k.tone].txt;

					ctx.drawImage(font, charFromBuf(0), cc, 5, 5, x, y, 5, 5);
					ctx.drawImage(font, charFromBuf(1), cc, 5, 5, x + 6, y, 5, 5);
					ctx.drawImage(font, charFromBuf(2), cc, 5, 5, x + 12, y, 5, 5);
				}
			}
		}
	}
};
//---------------------------------------------------------------------------------------
