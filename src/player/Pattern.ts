/**
 * SAA1099Tracker Player: Patterns class a interface definition.
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

import { toHex, toWidth } from '../commons/number';
import { MAX_PATTERN_LEN, Volume } from './globals';

/** Trackline data interface */
interface TracklineData {
  active: boolean;
  tone: string;
  column: string;
}

/** Channel-pattern line interface */
interface PatternLine {
  tone: number;
  release: boolean;
  smp: number;
  orn: number;
  orn_release: boolean;
  volume: Volume;
  cmd: number;
  cmd_data: number;

  get tracklist(): TracklineData;
}

/** Definition of channel-pattern containing its pattern-lines */
export default class Pattern {
  data: PatternLine[];
  tracklist: TracklineData[];

  constructor(public end: number = 0) {
    const currentPattern = this;
    this.data = [...Array(MAX_PATTERN_LEN)].map((_, index) => ({
      tone: 0,
      release: false,
      smp: 0,
      orn: 0,
      orn_release: false,
      volume: new Volume(),
      cmd: 0,
      cmd_data: 0,

      get tracklist() {
        return currentPattern.tracklist[index];
      }
    }) as PatternLine);

    this.tracklist = [...Array(MAX_PATTERN_LEN)].map(() => ({
      active: false,
      tone: '---',
      column: Array(7).fill('\x7f').join('')
    }));
  }

  /**
   * Go over pattern and generate textual representation of pattern data for render.
   */
  updateTracklist(start: number = 0, length: number = MAX_PATTERN_LEN) {
    const player = (window as any).Tracker.player;
    const l = Math.min(MAX_PATTERN_LEN, start + length);
    let active = true;

    for (let i = start, line = i, j = 0; i < l; i++, j++, line++) {
      const dat = this.data[line];
      const trk = this.tracklist[i];

      trk.active = active;

      if (line >= this.end) {
        trk.tone = '---';
        trk.column = Array(7).fill('\x7f').join('');
        continue;
      }

      trk.tone = dat.release ? 'R--' : dat.tone ? player.tones[dat.tone].txt : '---';
      trk.column = `${
        dat.smp ? dat.smp.toString(36) : '\x7f'
      }${
        dat.orn_release ? 'X' : dat.orn ? dat.orn.toString(16) : '\x7f'
      }${
        dat.volume.byte ? toHex(dat.volume.valueOf(), 2) : '\x7f\x7f'
      }${
        (dat.cmd || dat.cmd_data) ? dat.cmd.toString(16) : '\x7f'
      }${
        (dat.cmd || dat.cmd_data) ? toHex(dat.cmd_data, 2) : '\x7f\x7f'
      }`;

      if (dat.cmd === 0xB && dat.cmd_data <= line) {
        line = dat.cmd_data - 1;
        active = false;
      }
    }
  }

  /**
   * Export pattern data to array of readable strings.
   * We going backward from the end of pattern and unshifting array because of pack
   * reasons when "pack" param is true and then only meaningful data will be stored.
   */
  export(start: number = 0, length: number = MAX_PATTERN_LEN, pack: boolean = true): string[] {
    const arr: string[] = [];

    for (let i = Math.min(MAX_PATTERN_LEN, start + length); i > start; ) {
      const o = this.data[--i];
      const k = o.orn_release ? 33 : o.orn; // 33 = X
      const s = o.release ? '--' : toWidth(o.tone, 2);

      if (pack && !arr.length && s === '00' && !o.smp && !k && !o.volume.byte && !o.cmd && !o.cmd_data) {
        continue;
      }

      arr.unshift(`${s}${
        o.smp.toString(32)
      }${
        k.toString(36)
      }${
        toHex(o.volume.byte, 2)
      }${
        toHex(o.cmd, 1)
      }${
        toHex(o.cmd_data, 2)
      }`.toUpperCase());
    }

    return arr;
  }

  /**
   * Parse pattern data from array of strings with values like in tracklist.
   */
  parse(arr: string[], start: number = 0, length: number = MAX_PATTERN_LEN) {
    const l = Math.min(MAX_PATTERN_LEN, start + length);

    for (let i = start, j = 0; i < l; i++, j++) {
      const s = arr[j] || '000000000';
      const o = this.data[i];

      let k = parseInt(s.substr(0, 2), 10);
      o.tone = isNaN(k) ? ((o.release = true) && 0) : k;

      k = parseInt(s[3], 16);
      o.orn = isNaN(k) ? ((o.orn_release = true) && 0) : k;

      o.smp = parseInt(s[2], 32) || 0;
      o.volume.byte = parseInt(s.substr(4, 2), 16) || 0;
      o.cmd = parseInt(s[6], 16) || 0;
      o.cmd_data = parseInt(s.substr(7), 16) || 0;
    }

    this.updateTracklist(start, length);
  }
}
