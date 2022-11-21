/**
 * SAA1099Tracker Player: Samples class a interface definition.
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

import { toHex } from '../commons/number';
import { Volume } from './globals';

/** Sample data interface */
interface SampleData {
  volume: Volume;
  enable_freq: boolean;
  enable_noise: boolean;
  noise_value: number;
  shift: number;
}

/** Single sample definition */
export default class Sample {
  name: string = '';
  data: SampleData[];
  loop: number = 0;
  end: number = 0;
  releasable: boolean = false;

  constructor() {
    this.data = [...Array(256)].map(() => ({
      volume: new Volume(),
      enable_freq: false,
      enable_noise: false,
      noise_value: 0,
      shift: 0
    } as SampleData));
  }

  /**
   * Export sample data to array of readable strings.
   * We going backward from the end of sample and unshifting array because of pack
   * reasons when "pack" param is true and then only meaningful data will be stored.
   */
  export(pack: boolean = true): string[] {
    const arr: string[] = [];

    for (let i = 255; i >= 0; i--) {
      const o = this.data[i];
      const k = +o.enable_freq | (+o.enable_noise << 1) | (o.noise_value << 2);

      if (pack && !arr.length && !k && !o.volume.byte && !o.shift) {
        continue;
      }

      let s = toHex(k, 1) + toHex(o.volume.byte, 2);
      if (o.shift) {
        s += ((o.shift < 0) ? '-' : '+') + toHex(o.shift, 3);
      }

      arr.unshift(s.toUpperCase());
    }

    return arr;
  }

  /**
   * Parse sample data from array of buch of hex values stored in simple string.
   */
  parse(arr: string[]) {
    this.data.forEach((o, i) => {
      const s = arr[i] || '';
      const k = parseInt(s[0], 16) || 0;

      o.enable_freq = !!(k & 1);
      o.enable_noise = !!(k & 2);
      o.noise_value = (k >> 2);
      o.volume.byte = parseInt(s.substr(1, 2), 16) || 0;

      o.shift = parseInt(s.substr(3), 16) || 0;
    });
  }
}
