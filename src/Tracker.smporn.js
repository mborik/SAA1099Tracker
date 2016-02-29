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
		this.init = function() {
			var parts = [ 'amp', 'noise', 'range' ],
				i, l, o, ctx, w, h, half;

			console.log('Tracker.smporn', 'Initial drawing of Sample editor canvases...');
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
			this.createOrnamentEditorTable();

			app.updateSampleEditor(true);
			this.initialized = true;

			console.log('Tracker.smporn', 'Sample/Ornament editors completely initialized...');
		};

		this.updateOffsets = function () {
			var amp = $(this.amp.obj).offset(),
				noise = $(this.noise.obj).offset();

			this.smpeditOffset = {
				left: 0 | amp.left,
				top: {
					amp: 0 | amp.top,
					noise: 0| noise.top
				}
			};

			console.log('Tracker.smporn', 'Sample editor canvas offsets observed...\n\t\t%c%s',
				'color:gray', JSON.stringify(this.smpeditOffset, null, 1).replace(/\s+/g, ' '));
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

			console.log('Tracker.smporn', 'Creating elements into Pitch-shift tab...');
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
				})
				.prop('tabindex', 9);
			}
		};
//---------------------------------------------------------------------------------------
		this.chords = {
			'maj':    { sequence: [ 0, 4, 7 ],     name: 'major' },
			'min':    { sequence: [ 0, 3, 7 ],     name: 'minor' },
			'maj7':   { sequence: [ 0, 4, 7, 11 ], name: 'major 7th' },
			'min7':   { sequence: [ 0, 3, 7, 10 ], name: 'minor 7th' },
			'sus2':   { sequence: [ 0, 2, 7 ],     name: 'suspended 2nd' },
			'sus4':   { sequence: [ 0, 5, 7 ],     name: 'suspended 4th' },
			'6':      { sequence: [ 0, 4, 7, 9 ],  name: 'major 6th' },
			'7':      { sequence: [ 0, 4, 7, 10 ], name: 'dominant 7th' },
			'add9':   { sequence: [ 0, 2, 4, 7 ],  name: 'added 9th' },
			'min7b5': { sequence: [ 0, 3, 6, 12 ], name: 'minor 7th with flatted 5th' },
			'aug':    { sequence: [ 0, 4, 10 ],    name: 'augmented' },
			'dim':    { sequence: [ 0, 3, 6, 9 ],  name: 'diminished' },
			'12th':   { sequence: [ 12, 0 ],       name: '12th' }
		};

		this.updateOrnamentEditor = function (update) {
			var orn = app.player.ornament[app.workingOrnament],
				noloop = (orn.end === orn.loop);

			$('#fxOrnEditor>.cell').each(function (i, el) {
				if (i >= orn.end)
					el.className = 'cell';
				else if (!noloop && i >= orn.loop && i < orn.end)
					el.className = 'cell loop';
				else
					el.className = 'cell on';

				$(el).find('input').val(orn.data[i]);
			});

			if (update) {
				$('#txOrnName').val(orn.name);
				$('#fxOrnEditor').parent().scrollLeft(0);

				$('#scOrnLength').val('' + orn.end);
				$('#scOrnRepeat').val('' + (orn.end - orn.loop))
					.trigger('touchspin.updatesettings', { min: 0, max: orn.end });
			}
		};

		this.createOrnamentEditorTable = function () {
			var i, s,
				el = $('#fxOrnEditor').empty(),
				cell = $('<div class="cell"/>'),
				spin = $('<input type="text" class="form-control">');

			console.log('Tracker.smporn', 'Creating elements into Ornament editor...');
			for (i = 0; i < 256; i++) {
				s = spin.clone();
				cell.clone().append(s).appendTo(el);

				s.TouchSpin({
					prefix:  i.toWidth(3),
					initval: 0, min: -60, max: 60
				})
				.change({ index: i }, function(e) {
					var orn = app.player.ornament[app.workingOrnament],
						el = e.target;

					orn.data[e.data.index] = parseInt(el.value, 10);
				})
				.prop('tabindex', 31);
			}
		};
	}

	return SmpOrnEditor;
})();
//---------------------------------------------------------------------------------------
