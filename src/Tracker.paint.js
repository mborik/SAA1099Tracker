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
Tracker.prototype.initPixelFont = function () {
	// backgrounds (white, red, hilite, block)
	var bg = [ '#fff', '#f00', '#38c', '#000', '#800' ],
		o = this.pixelfont, i, l = bg.length * 10, w, copy, copyctx,
		font = new Image();

	font.onload = function() {
		w = font.width;

		o.obj = document.createElement('canvas');
		o.obj.width = w;
		o.obj.height = l;
		o.ctx = o.obj.getContext('2d');

		for (i = 0; i < l; i += 10) {
			o.ctx.fillStyle = bg[i];
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
		font = null;
	}

	font.src = 'fonts/tracklist.png';
};
//---------------------------------------------------------------------------------------
