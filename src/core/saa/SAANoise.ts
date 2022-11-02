/*!
 * SAASound - Phillips SAA 1099 sound chip emulator
 * Copyright (c) 2015-2020 Martin Borik <mborik@users.sourceforge.net>
 * Based on SAASound - portable C/C++ library
 * Copyright (c) 1998-2004 Dave Hooper <stripwax@users.sourceforge.net>
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

import { SAASound } from './SAASound';

/**
 * SAANoise: Noise generator
 */
export class SAANoise {
  public level: number = 0;

  private _counter: number;
  private _add: number;            // add for 31.25|15.63|7.8 kHz noise at samplerate
  private _sync: boolean;          // see description of "SYNC" bit of register 28
  private _rand: number;           // pseudo-random number generator
  private _smpRate: number;
  private _src: number;

  constructor(seed: number = 0x11111111) {
    this._counter = 0;
    this._add = 128e6; // 31250 << 12
    this._sync = false;
    this._smpRate = SAASound.sampleRate << 12;
    this._src = 0;
    this._rand = seed;
  }

  /**
	 * send command to noise generator
	 * @param src values 0 to 3
	 */
  public set(src: number) {
    this._src = (src &= 3);
    this._add = 128e6 >> src;
  }

  /**
	 * trigger() only does anything useful when we're
	 * clocking from the frequency generator (i.e. SourceMode = 3).
	 * So if we're clocking from the noise generator clock
	 * (ie, SourceMode = 0, 1 or 2) then do nothing...
	 */
  public trigger() {
    if (this._src === 3) {
      this._rnd();
    }
  }

  /*
	 * tick only does anything useful when we're
	 * clocking from the noise generator clock (ie, SourceMode = 0, 1 or 2)
	 * So, if SourceMode = 3 (ie, we're clocking from a frequency generator)
	 * then do nothing...
	 */
  public tick(): number {
    if (!this._sync && (this._src !== 3)) {
      this._counter += this._add;
      if (this._counter >= this._smpRate) {
        while (this._counter >= this._smpRate) {
          this._counter -= this._smpRate;
          this._rnd();
        }
      }
    }

    return (this._rand & 1);
  }

  public setSync(sync: boolean) {
    if (sync) {
      this._counter = 0;
    }

    this._sync = sync;
  }

  private _rnd() {
    if (!!(this._rand & 0x40000004) && (this._rand & 0x40000004) !== 0x40000004) {
      this._rand = (this._rand << 1) | 1;
    }
    else {
      this._rand <<= 1;
    }

    this.level = (this._rand & 1) << 1;
  }
}
