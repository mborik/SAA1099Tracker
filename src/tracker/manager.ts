/*
 * Clipboard and tracklist manager class and dependent interfaces.
 * Copyright (c) 2015-2017 Martin Borik <mborik@users.sourceforge.net>
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
class Manager {
	constructor(private $parent: Tracker) {}

	private _clipboard: string = '';

	private _getBlock () {
		let p = this.$parent.player;
		let sel: TracklistSelection = this.$parent.tracklist.selection;
		let ch = sel.len ? sel.channel : this.$parent.modeEditChannel;
		let line = sel.len ? sel.line : p.currentLine;
		let length = sel.len ? (sel.len + 1) : undefined;
		let pos = p.position[p.currentPosition] || p.nullPosition;
		let chn = pos.ch[ch];
		let patt = chn.pattern;

		return {
			pp: p.pattern[patt],
			line: line,
			len: length
		};
	}

//---------------------------------------------------------------------------------------
	public clearFromTracklist() {
		let o = this._getBlock();
		o.pp.parse([], o.line, o.len || 1);
	}

	public copyFromTracklist() {
		let o = this._getBlock();
		let data = o.pp.export(o.line, o.len || 1, false);

		this._clipboard = 'STMF.trk:' + JSON.stringify(data, null, '\t');
	}

	public pasteToTracklist(): boolean {
		if (this._clipboard.indexOf('STMF.trk:[') !== 0) {
			return false;
		}

		let o = this._getBlock();
		let data: string[];

		try {
			let json = this._clipboard.substr(9);
			data = JSON.parse(json);

			if (!(data instanceof Array && data.length > 0)) {
				return false;
			}
		}
		catch (e) {
			return false;
		}

		o.pp.parse(data, o.line, o.len || data.length);
		return true;
	}

//---------------------------------------------------------------------------------------
	public clearSample() {
		let app = this.$parent;
		let smp = app.player.sample[app.workingSample];

		smp.name = '';
		smp.loop = 0;
		smp.end = 0;
		smp.releasable = false;
		smp.parse([]);
	}

	public copySample = function () {
		let app = this.$parent;
		let smp = app.player.sample[app.workingSample];
		let obj = {
			name: smp.name,
			loop: smp.loop,
			end: smp.end,
			releasable: smp.releasable,
			data: smp.export(false)
		};

		this.clipboard = 'STMF.smp:' + JSON.stringify(obj, null, '\t');
	}

	public pasteSample = function () {
		if (this.clipboard.indexOf('STMF.smp:{') !== 0) {
			return false;
		}

		let app = this.$parent;
		let smp = app.player.sample[app.workingSample];
		let obj: any;

		try {
			let json = this.clipboard.substr(9);
			obj = JSON.parse(json);

			if (!(typeof obj === 'object' && obj.data instanceof Array && obj.data.length > 0)) {
				return false;
			}
		}
		catch (e) {
			return false;
		}

		smp.parse(obj.data);
		smp.name = obj.name;
		smp.loop = obj.loop;
		smp.end = obj.end;
		smp.releasable = obj.releasable;
		return true;
	}

//---------------------------------------------------------------------------------------
	public clearOrnament = function () {
		let app = this.$parent;
		let orn = app.player.ornament[app.workingOrnament];

		orn.name = '';
		orn.data.fill(0);
		orn.loop = orn.end = 0;
	}

	public copyOrnament = function () {
		let app = this.$parent;
		let orn = app.player.ornament[app.workingOrnament];
		let obj = {
			name: orn.name,
			loop: orn.loop,
			end:  orn.end,
			data: orn.export(false)
		};

		this.clipboard = 'STMF.orn:' + JSON.stringify(obj, null, '\t');
	}

	public pasteOrnament = function () {
		if (this.clipboard.indexOf('STMF.orn:{') !== 0) {
			return false;
		}

		let app = this.$parent;
		let orn = app.player.ornament[app.workingOrnament];
		let obj: any;

		try {
			let json = this.clipboard.substr(9);
			obj = JSON.parse(json);

			if (!(typeof obj === 'object' && obj.data instanceof Array && obj.data.length > 0)) {
				return false;
			}
		}
		catch (e) {
			return false;
		}

		orn.parse(obj.data);
		orn.name = obj.name;
		orn.loop = obj.loop;
		orn.end = obj.end;
		return true;
	}
}
