/*!
 * Sample and Ornament editor class and dependent interfaces.
 * Copyright (c) 2012-2020 Martin Borik <mborik@users.sourceforge.net>
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

import { devLog } from "../../utils/dev";
import Tracker, { TrackerCanvasPair } from "./Tracker";


interface SmpOrnEditorDragStatus {
	isDragging: boolean | number;

	freqEnableState: boolean;
	rangeStart: number;
}

interface SampleEditorOffsets {
	left: number;
	top: {
		amp: number;
		noise: number;
	};
}

interface OrnamentEditorChords {
	[propName: string]: {
		sequence: number[];
		name: string;
	};
}

export default class SmpOrnEditor {
	constructor(private _parent: Tracker) {}

	initialized: boolean = false;

	img: HTMLImageElement | null = null;
	amp: TrackerCanvasPair = { obj: null, ctx: null } as any;
	noise: TrackerCanvasPair = { obj: null, ctx: null } as any;
	range: TrackerCanvasPair = { obj: null, ctx: null } as any;

	smpeditShiftShown: boolean = false;
	smpeditOffset: SampleEditorOffsets | null = null;
	smpeditScroll: number = 0;
	columnWidth: number = 0;
	halfing: number = 0;
	centering: number = 0;
	radix: number = 10;

	drag: SmpOrnEditorDragStatus = {
		isDragging: false,
		freqEnableState: false,
		rangeStart: -1
	};

	init(): void {
		devLog('Tracker.smporn', 'Initial drawing of Sample editor canvases...');
/*
		[ 'amp', 'noise', 'range' ].forEach((part: string, i: number) => {
			let o: TrackerCanvasPair = this[part];

			let ctx = o.ctx;
			let w = o.obj.width;
			let h = o.obj.height;
			let half = h >> 1;

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
				ctx.textBaseline = 'middle';
				ctx.fillStyle = '#888';
				ctx.textAlign = 'right';
				ctx.fillText(i18n.app.smpedit.right, -16, 0);
				ctx.textAlign = 'left';
				ctx.fillText(i18n.app.smpedit.left, 16, 0);
				ctx.restore();
			}

			ctx.drawImage(this.img, i * 16, 0, 16, 16, 4, half - 8, 16, 16);
		}, this);

		this._updateOffsets();
		this._createPitchShiftTable();
		this._createOrnamentEditorTable();

		this._parent.updateSampleEditor(true);
		this.initialized = true;

		devLog('Tracker.smporn', 'Sample/Ornament editors completely initialized...');
*/
	}

	public updateSamplePitchShift(): void {
/*
		let working = this._parent.workingSample;
		let sample = this._parent.player.sample[working];
		let noloop = (sample.end === sample.loop);
		let radix = this._parent.settings.hexSampleFreq ? 16 : 10;

		$('#fxSampleShift>.cell').each((i: number, el: Element) => {
			let data = sample.data[i];

			if (i >= sample.end && !sample.releasable) {
				el.className = 'cell';
			}
			else if (!noloop && i >= sample.loop && i < sample.end) {
				el.className = 'cell loop';
			}
			else {
				el.className = 'cell on';
			}

			$(el).find('input').val(data.shift.toString(radix));
		});

		$('#fxSampleShift').parent().scrollLeft(0);
*/
	}

	private _updateOffsets(): void {
/*
		let amp = $(this.amp.obj).offset();
		let noise = $(this.noise.obj).offset();

		this.smpeditOffset = {
			left: 0 | amp.left,
			top: {
				amp: 0 | amp.top,
				noise: 0 | noise.top
			}
		};

		devLog('Tracker.smporn', 'Sample editor canvas offsets observed...\n\t\t%c%s',
			'color:gray', JSON.stringify(this.smpeditOffset, null, 1).replace(/\s+/g, ' '));
*/
	}

	private _createPitchShiftTable(): void {
/*
		let settings = this._parent.settings;
		let el: JQuery = $('#fxSampleShift').empty();
		let cell: JQuery = $('<div class="cell"/>');
		let spin: JQuery = $('<input type="text" class="form-control">');

		devLog('Tracker.smporn', 'Creating elements into Pitch-shift tab...');
		for (let i = 0; i < 256; i++) {
			let cloned = spin.clone();
			cell.clone().append(cloned).appendTo(el);

			cloned.TouchSpin({
				prefix: i.toWidth(3),
				radix: (settings.hexSampleFreq ? 16 : 10),
				initval: 0,
				min: -1023,
				max: 1023
			})
			.change({ index: i }, e => {
				let working = this._parent.workingSample;
				let sample = this._parent.player.sample[working];
				let data = sample.data;
				let el = <HTMLInputElement> e.target;
				let radix = settings.hexSampleFreq ? 16 : 10;

				data[e.data.index].shift = parseInt(el.value, radix);
			})
			.prop('tabindex', 9);
		}
*/
	}

//---------------------------------------------------------------------------------------
	public chords: OrnamentEditorChords = {
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

	public updateOrnamentEditor(update?: boolean): void {
/*
		let working = this._parent.workingOrnament;
		let orn = this._parent.player.ornament[working];
		let noloop = (orn.end === orn.loop);

		$('#fxOrnEditor>.cell').each((i: number, el: HTMLElement) => {
			if (i >= orn.end) {
				el.className = 'cell';
			}
			else if (!noloop && i >= orn.loop && i < orn.end) {
				el.className = 'cell loop';
			}
			else {
				el.className = 'cell on';
			}

			$(el).find('input').val(orn.data[i]);
		});

		if (update) {
			$('#txOrnName').val(orn.name);
			$('#fxOrnEditor').parent().scrollLeft(0);

			$('#scOrnLength').val('' + orn.end);
			$('#scOrnRepeat').val('' + (orn.end - orn.loop))
				.trigger('touchspin.updatesettings', { min: 0, max: orn.end });
		}
*/
	}

	private _createOrnamentEditorTable(): void {
/*
		let el: JQuery = $('#fxOrnEditor').empty();
		let cell: JQuery = $('<div class="cell"/>');
		let spin: JQuery = $('<input type="text" class="form-control">');

		devLog('Tracker.smporn', 'Creating elements into Ornament editor...');
		for (let i = 0; i < 256; i++) {
			let cloned = spin.clone();
			cell.clone().append(cloned).appendTo(el);

			cloned.TouchSpin({
				prefix:  i.toWidth(3),
				initval: 0, min: -60, max: 60
			})
			.change({ index: i }, e => {
				let working = this._parent.workingOrnament;
				let orn = this._parent.player.ornament[working];
				let el = <HTMLInputElement> e.target;

				orn.data[e.data.index] = parseInt(el.value, 10);
			})
			.prop('tabindex', 31);
		}
*/
	}
}
//---------------------------------------------------------------------------------------
