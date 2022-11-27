/**
 * SAA1099Tracker Player: Global helper classes definition.
 * Copyright (c) 2012-2022 Martin Borik <martin@borik.net>
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
export const MAX_PATTERN_LEN = 128;

/** Player playback mode */
export const PlayerMode = {
  PM_SONG: 1,
  PM_POSITION: 2,
  PM_SONG_OR_POS: 3,
  PM_SAMPLE: 4,
  PM_LINE: 8,
  PM_SAMP_OR_LINE: 12,
  PM_SIMULATION: 129
};

/** Tone parameters class */
export class Tone {
  cent: number = 0;
  oct: number = 0;
  txt: string = '---';

  constructor(word: number = 0) {
    this.word = word;
  }

  get word(): number {
    return ((this.cent & 0xff) | ((this.oct & 0x07) << 8));
  }
  set word(v: number) {
    this.cent = (v & 0xff);
    this.oct = (v & 0x700) >> 8;
  }
}

/** Volume/Attenuation value class (byte value splitted into left/right channel) */
export class Volume {
  private _l: number = 0;
  private _r: number = 0;

  get L(): number {
    return this._l;
  }
  set L(v: number) {
    this._l = Math.max(0, Math.min(15, v));
  }

  get R(): number {
    return this._r;
  }
  set R(v: number) {
    this._r = Math.max(0, Math.min(15, v));
  }

  get byte(): number {
    return ((this._l & 0x0f) | ((this._r & 0x0f) << 4));
  }
  set byte(v: number) {
    this._l = (v & 0x0f);
    this._r = (v >> 4) & 0x0f;
  }

  valueOf() {
    return ((this._r & 0x0f) | ((this._l & 0x0f) << 4));
  }
}

/** Channel mixer */
export class Mixer {
  index: number = 0;
  length: number = 0;
}
