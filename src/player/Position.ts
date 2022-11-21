/**
 * SAA1099Tracker Player: Positions class a interface definition.
 * Copyright (c) 2012-2020 Martin Borik <martin@borik.net>
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

import { toHex, toWidth } from '../commons/number';
import { MAX_PATTERN_LEN } from './globals';
import PlayerRuntime from './PlayerRuntime';

/** Position channel definition interface */
interface Channel {
  pattern: number;
  pitch: number;
}

/**
 * Position class declaration with 6 channels definition, length and default speed.
 */
export default class Position {
  /** Describers for every channel [0..5] */
  ch: Channel[];
  /** Number of interupts which takes every line in tracklist */
  frames: number[] = [];
  /** Initial runtime parameters when player entering into this position */
  initParams: Maybe<PlayerRuntime> = null;

  constructor(public length: number, public speed: number = 6) {
    this.ch = [...Array(6)].map(() => ({
      pattern: 0,
      pitch: 0
    } as Channel));

    for (let i: number = 0, line: number = 0; line <= MAX_PATTERN_LEN; line++, i += speed) {
      this.frames[line] = i;
    }
  }

  hasPattern = (pattern: number): boolean => this.indexOf(pattern) >= 0;
  indexOf(pattern: number): number {
    for (let i: number = 0; i < 6; i++) {
      if (this.ch[i].pattern === pattern) {
        return i;
      }
    }
    return -1;
  }

  export(): string[] {
    const arr: string[] = [];

    this.ch.forEach(chn => {
      const k = chn.pitch;
      let s = toWidth(chn.pattern, 3);

      if (k) {
        s += ((k < 0) ? '-' : '+') + toHex(k, 2);
      }

      arr.push(s);
    });

    return arr;
  }
}
