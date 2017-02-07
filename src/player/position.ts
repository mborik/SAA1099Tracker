/*
 * Player: Positions class a interface definition.
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
/// <reference path='runtime.ts' />
//---------------------------------------------------------------------------------------
// Position channel definition interface
interface pChannel {
	pattern: number;
	pitch: number;
}
//---------------------------------------------------------------------------------------
/**
 * Position class declaration with 6 channels definition, length and default speed.
 * @property frames Number of interupts which takes every line in tracklist;
 */
class pPosition {
	ch: pChannel[];
	speed: number;
	length: number;
	frames: number[];
	initParams: pRuntime;

	constructor(length: number, speed: number = 6) {
		this.ch = [];
		this.speed = speed;
		this.length = length;
		this.frames = [];
		this.initParams = undefined;

		for (let i: number = 0; i < 6; i++) {
			this.ch[i] = { pattern: 0, pitch: 0 };
		}
		for (let i: number = 0, line: number = 0; line <= MAX_PATTERN_LEN; line++, i += speed) {
			this.frames[line] = i;
		}
	}

	hasPattern(pattern: number): boolean { return this.indexOf(pattern) >= 0; }
	indexOf(pattern: number): number {
		for (let i: number = 0; i < 6; i++) {
			if (this.ch[i].pattern === pattern) {
				return i;
			}
		}
		return -1;
	}

	export(): string[] {
		let arr: string[] = [];

		this.ch.forEach(chn => {
			let k = chn.pitch;
			let s = chn.pattern.toWidth(3);

			if (k) {
				s += ((k < 0) ? '-' : '+') + k.toHex(2);
			}

			arr.push(s);
		});

		return arr;
	}

	destroy() {
		this.initParams.destroy();
		delete this.initParams;
		for (let i = 0; i < 6; i++) {
			delete this.ch[i];
		}
		delete this.ch;
		delete this.frames;
	}
}
//---------------------------------------------------------------------------------------
