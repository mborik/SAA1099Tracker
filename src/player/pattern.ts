/*
 * Player: Patterns class a interface definition.
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
/// <reference path='../Commons.d.ts' />
/// <reference path='globals.ts' />
//---------------------------------------------------------------------------------------
// Channel-pattern line interface
interface pPatternLine {
	tone: number;
	release: boolean;
	smp: number;
	orn: number;
	orn_release: boolean;
	volume: pVolume;
	cmd: number;
	cmd_data: number;
}
//---------------------------------------------------------------------------------------
class pPattern {
	data: pPatternLine[] = [];
	end: number;

	constructor(end: number = 0) {
		this.end = end;

		for (let i: number = 0; i < MAX_PATTERN_LEN; i++) {
			this.data[i] = { // pPatternLine
				tone: 0, release: false,
				smp: 0, orn: 0, orn_release: false,
				volume: new pVolume,
				cmd: 0, cmd_data: 0
			};
		}
	}

	/**
	 * Export pattern data to array of readable strings.
	 * We going backward from the end of pattern and unshifting array because of pack
	 * reasons when "pack" param is true and then only meaningful data will be stored.
	 */
	export(start: number = 0, length: number = MAX_PATTERN_LEN, pack: boolean = true): string[] {
		let arr: string[] = [];

		for (let i = Math.min(MAX_PATTERN_LEN, start + length); i > start; ) {
			let o = this.data[--i];
			let k = o.orn_release ? 33 : o.orn; // 33 = X
			let s = o.release ? '--' : o.tone.toWidth(2);

			if (pack && !arr.length && s === '00' && !o.smp && !k && !o.volume.byte && !o.cmd && !o.cmd_data) {
				continue;
			}

			arr.unshift(s.concat(
				o.smp.toString(32),
				k.toString(36),
				(<any> o.volume.byte).toHex(2),
				(<any> o.cmd).toHex(1),
				(<any> o.cmd_data).toHex(2)
			).toUpperCase());
		}

		return arr;
	}

	/**
	 * Parse pattern data from array of strings with values like in tracklist.
	 */
	parse(arr: string[], start: number = 0, length: number = MAX_PATTERN_LEN) {
		let i: number = start;
		let l = Math.min(MAX_PATTERN_LEN, start + length);

		for (let j = 0; i < l; i++, j++) {
			let s = arr[j] || '000000000';
			let o = this.data[i];

			let k = parseInt(s.substr(0, 2), 10);
			o.tone = isNaN(k) ? ((o.release = true) && 0) : k;

			k = parseInt(s[3], 16);
			o.orn = isNaN(k) ? ((o.orn_release = true) && 0) : k;

			o.smp = parseInt(s[2], 32) || 0;
			o.volume.byte = parseInt(s.substr(4, 2), 16) || 0;
			o.cmd = parseInt(s[6], 16) || 0;
			o.cmd_data = parseInt(s.substr(7), 16) || 0;
		}
	}

	destroy() {
		for (let i = 0; i < MAX_PATTERN_LEN; i++) {
			delete this.data[i].volume;
			this.data[i] = null;
		}
		delete this.data;
	}
}
//---------------------------------------------------------------------------------------
