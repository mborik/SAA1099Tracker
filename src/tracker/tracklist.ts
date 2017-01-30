/*
 * Tracklist class and dependent interfaces.
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
//---------------------------------------------------------------------------------------
interface TracklistStartPoint {
	x: number;
	y: number;
}
class TracklistPosition {
	public y: number;
	public line: number;
	public channel: number;
	public column: number;
	public start: TracklistStartPoint;

	constructor(y: number = 0, line: number = 0,
				channel: number = 0, column: number = 0,
				sx: number = 0, sy: number = 0) {

		this.y = y;
		this.line = line;
		this.channel = channel;
		this.column = column;
		this.start = { x: sx, y: sy };
	}

	set<TracklistPosition>(p: TracklistPosition): void {
		if (p instanceof TracklistPosition) {
			this.y = p.y;
			this.line = p.line;
			this.channel = p.channel;
			this.column = p.column;
			this.start.x = p.start.x;
			this.start.y = p.start.y;
		}
	}
	compare<TracklistPosition>(p: TracklistPosition): boolean {
		if (p instanceof TracklistPosition) {
			return (this.y === p.y &&
					this.line === p.line &&
					this.channel === p.channel &&
					this.column === p.column);
		}

		return false;
	}
}
//---------------------------------------------------------------------------------------
interface TracklistSelection {
	isDragging: boolean;
	start:      TracklistPosition;

	len:        number;
	line:       number;
	channel:    number;
}
interface TracklistCanvasData {
	columns:   number[];

	selWidth:  number;
	chnWidth:  number;
	lineWidth: number;
	vpad:      number;
	center:    number;
	trkOffset: number;

	offset:    JQueryCoordinates;
}
interface TracklistOffsets {
	x: number[][];
	y: number[];
}
//---------------------------------------------------------------------------------------
const tracklistZoomFactor: number = 2;
const fontWidth: number = 6;
//---------------------------------------------------------------------------------------
class Tracklist {
	constructor(private $parent: Tracker) {}

	public initialized: boolean = false;

	public obj: HTMLCanvasElement = null;
	public ctx: CanvasRenderingContext2D = null;

	public canvasData: TracklistCanvasData = {
		// offsets to column positions in channel data premultiplied by fontWidth:
		//         0   4567 9AB
		//        "A-4 ABFF C01"
		columns: [ 0, 4, 5, 6, 7, 9, 10, 11 ].map(c => c * fontWidth),

		// selection width: (12 columns + 1 padding) * fontWidth
		selWidth : (12 + 1) * fontWidth,

		// channel width: (12 columns + 2 padding) * fontWidth
		chnWidth : (12 + 2) * fontWidth,

		// trackline width:
		// (((12 columns + 2 padding) * 6 channels) + 2 tracknum.columns) * fontWidth
		lineWidth: (((12 + 2) * 6) + 2) * fontWidth,

		// vertical padding of pixelfont in trackline height
		vpad     : 0,

		// horizontal centering of trackline to canvas width
		center   : 0,

		// trackline data offset: center + (2 tracknums + 2 padding) * fontWidth
		get trkOffset(): number { return this.center + (4 * fontWidth) },

		// jQuery offset object
		offset   : null
	};

	public offsets: TracklistOffsets = {
		// 6 channels of 8 column (+1 padding) positions
		x: [ new Array(9), new Array(9), new Array(9), new Array(9), new Array(9), new Array(9) ],
		y: []
	}

	public selection: TracklistSelection = {
		isDragging: false,
		start: new TracklistPosition,
		len: 0,
		line: 0,
		channel: 0
	};

	public countTracklines(): number {
		let s = $('#statusbar').offset();
		let t = $('#tracklist').offset();
		let h = this.$parent.settings.tracklistLineHeight;

		return Math.max(((((s.top - t.top) / h / tracklistZoomFactor) | 1) - 2), 5);
	}

	public setHeight(height?: number) {
		let settings = this.$parent.settings;

		if (height == null) {
			height = settings.tracklistAutosize
				? this.countTracklines()
				: settings.tracklistLines;
		}

		console.log('Tracker.tracklist', 'Computed %d tracklines...', height);

		settings.tracklistLines = height;
		height *= settings.tracklistLineHeight;

		$(this.obj).prop('height', height).css({ height: (height * tracklistZoomFactor) });
		this.canvasData.offset = $(this.obj).offset();
	}

	public moveCurrentline(delta: number, noWrap: boolean = false) {
		let player = this.$parent.player;
		let line = player.currentLine + delta;
		let pos = player.currentPosition;
		let pp = player.position[pos];

		if (this.$parent.modePlay || pp == null) {
			return;
		}

		if (noWrap) {
			line = Math.min(Math.max(line, 0), pp.length - 1);
		}
		else if (line < 0) {
			line += pp.length;
		}
		else if (line >= pp.length) {
			line -= pp.length;
		}

		player.currentLine = line;
	}

	public pointToTracklist(x: number, y: number): TracklistPosition {
		let lines: number = this.$parent.settings.tracklistLines;
		let tx: number = x / tracklistZoomFactor;
		let ty: number = y / tracklistZoomFactor;
		let ln: number = this.$parent.player.currentLine - (lines >> 1);

		for (let i = 0; i < lines; i++, ln++) {
			if (ty >= this.offsets.y[i] && ty <= this.offsets.y[i + 1]) {
				for (let chl = 0; chl < 6; chl++) {
					if (tx >= this.offsets.x[chl][0] && tx <= this.offsets.x[chl][8]) {
						for (let j = 0; j < 8; j++) {
							if (tx >= this.offsets.x[chl][j] && tx <= this.offsets.x[chl][j + 1]) {
								return new TracklistPosition(i, Math.max(ln, 0), chl, j, x, y);
							}
						}
					}
				}
			}
		}

		return null;
	}
}
//---------------------------------------------------------------------------------------
