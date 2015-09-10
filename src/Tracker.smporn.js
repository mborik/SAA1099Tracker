/** Tracker.smporn submodule */
//---------------------------------------------------------------------------------------
var SmpOrnEditor = (function () {
	function SmpOrnEditor(app) {
		this.initialized = false;

		this.img = null;
		this.amp = { obj: null, ctx: null };
		this.noise = { obj: null, ctx: null };
		this.range = { obj: null, ctx: null };

		this.smpeditOffset = null;
		this.smpeditScroll = 0;
		this.columnWidth = 0;
		this.halfing = 0;
		this.centering = 0;
		this.radix = 10;

		this.drag = {
			isDragging: false,
			freqEnableState: false,
			rangeStart: -1
		};
//---------------------------------------------------------------------------------------
		this.drawHeaders = function() {
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
					ctx.font = $('label').first().css('font');
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

				ctx.drawImage(this.img, i * 16, 0, 16, 16, 4, half - 8, 16, 16);
			}

			this.updateOffsets();
			this.createPitchShiftTable();
			this.initialized = true;

			app.updateSampleEditor(true);
		};

		this.updateOffsets = function () {
			var amp = $(this.amp.obj).offset(),
				noise = $(this.noise.obj).offset();

			this.smpeditOffset = {
				left: amp.left,
				top: {
					amp: amp.top,
					noise: noise.top
				}
			};
		};

		this.updateSamplePitchShift = function () {
			var sample = app.player.sample[app.workingSample],
				noloop = (sample.end === sample.loop),
				data;

			$('#fxSampleShift>.cell').each(function (i, el) {
				data = sample.data[i];

				if (i >= sample.end && !sample.releasable)
					el.className = 'cell';
				else if (!noloop && i >= sample.loop && i < sample.end)
					el.className = 'cell loop';
				else
					el.className = 'cell on';

				$(el).find('input').val(parseInt(data.shift, this.radix));
			});

			$('#fxSampleShift').parent().scrollLeft(0);
		};

		this.createPitchShiftTable = function () {
			var i, s,
				el = $('#fxSampleShift').empty(),
				cell = $('<div class="cell"/>'),
				spin = $('<input type="text" class="form-control">');

			for (i = 0; i < 256; i++) {
				s = spin.clone();
				cell.clone().append(s).appendTo(el);

				s.TouchSpin({
					prefix:  i.toWidth(3),
					radix: (this.radix = app.settings.hexSampleFreq ? 16 : 10),
					initval: 0, min: -1023, max: 1023
				})
				.change({ index: i }, function(e) {
					var radix = app.settings.hexSampleFreq ? 16 : 10,
						sample = app.player.sample[app.workingSample],
						data = sample.data,
						el = e.target;

					data[e.data.index].shift = parseInt(el.value, radix);
				});
			}
		};
	}

	return SmpOrnEditor;
})();
//---------------------------------------------------------------------------------------
