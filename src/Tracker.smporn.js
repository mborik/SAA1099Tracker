/** Tracker.smporn submodule */
//---------------------------------------------------------------------------------------
var SmpOrnEditor = (function () {
	function SmpOrnEditor(app) {
		this.amp = { obj: null, ctx: null };
		this.noise = { obj: null, ctx: null };
		this.range = { obj: null, ctx: null };

		this.smpeditOffset = 0;
		this.columnWidth = 0;
		this.halfing = 0;
		this.centering = 0;

//---------------------------------------------------------------------------------------
		this.drawHeaders = function(img) {
			var parts = [ 'amp', 'noise', 'range' ],
				i, l, o, ctx, w, h, half;

			for (i = 0, l = parts.length; i < l; i++) {
				o = this[parts[i]];

				ctx = o.ctx;
				w = o.obj.width;
				h = o.obj.height;
				half = h >> 1;

				ctx.miterLimit = 0;
				ctx.fillStyle = '#fcfcfc';
				ctx.fillRect(0, 0, 22, h);
				ctx.fillStyle = '#ccc';
				ctx.fillRect(22, 0, 1, h);

				if (i === 0) {
					this.halfing = (half -= 12);
					this.columnWidth = ((w - 26) / 64) | 0;
					this.centering = 26 + (w - (this.columnWidth * 64)) >> 1;

					ctx.fillRect(22, half, w - 22, 1);
					ctx.fillRect(22, 286, w - 22, 1);

					ctx.save();
					ctx.font = $('label').css('font');
					ctx.translate(12, half);
					ctx.rotate(-Math.PI / 2);
					ctx.textBaseline = "middle";
					ctx.fillStyle = '#888';
					ctx.textAlign = "right";
					ctx.fillText("RIGHT", -16, 0);
					ctx.textAlign = "left";
					ctx.fillText("LEFT", 16, 0);
					ctx.restore();
				}

				ctx.drawImage(img, i * 16, 0, 16, 16, 4, half - 8, 16, 16);
			}

			app.updateSampleEditor(true);
		};
	}

	return SmpOrnEditor;
})();
//---------------------------------------------------------------------------------------
