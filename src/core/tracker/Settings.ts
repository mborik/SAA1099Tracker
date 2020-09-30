/*
 * Tracker file dialog sub-class.
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

import Tracker from "./Tracker";

interface SettingsOptions {
	tracklistAutosize: boolean;
	tracklistLines: number;
	tracklistLineHeight: number;
	hexTracklines: boolean;
	hexSampleFreq: boolean;
	audioInterrupt: number;
	audioBuffers: number;
	audioGain: number;
}

export default class Settings implements SettingsOptions {
	private _audioGain: number = 1.0;

	tracklistAutosize: boolean = true;
	tracklistLines: number = 17;
	tracklistLineHeight: number = 9;
	hexTracklines: boolean = true;
	hexSampleFreq: boolean = false;
	audioInterrupt: number = 50;
	audioBuffers: number = 4;


	constructor(private _app: Tracker) {}

	get audioGain(): number { return this._audioGain; }
	set audioGain(value) {
		let volume = Math.min(Math.max(0, value / 100), 2);
		this._audioGain = volume;
	}

}
