/*!
 * Player: Global classes a interface definition.
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
const MAX_PATTERN_LEN = 128;
const pMode = {
	PM_SONG: 1,
	PM_POSITION: 2,
	PM_SONG_OR_POS: 3,
	PM_SAMPLE: 4,
	PM_LINE: 8,
	PM_SAMP_OR_LINE: 12,
	PM_SIMULATION: 129
};
//---------------------------------------------------------------------------------------
// Tone parameters class
class pTone {
	public cent: number = 0;
	public oct: number = 0;
	public txt: string = '---';

	constructor(word: number = 0) { this.word = word; }

	get word(): number { return ((this.cent & 0xff) | ((this.oct & 0x07) << 8)); }
	set word(v: number) {
		this.cent = (v & 0xff);
		this.oct = (v & 0x700) >> 8;
	}
}
//---------------------------------------------------------------------------------------
// Volume/Attenuation value class (byte value splitted into left/right channel)
class pVolume {
	public L: number = 0;
	public R: number = 0;

	get byte(): number { return ((this.L & 0x0f) | ((this.R & 0x0f) << 4)); }
	set byte(v: number) {
		this.L = (v & 0x0f);
		this.R = (v >> 4) & 0x0f;
	}
}
//---------------------------------------------------------------------------------------
class pMixer {
	index: number = 0;
	length: number = 0;
}
//---------------------------------------------------------------------------------------
