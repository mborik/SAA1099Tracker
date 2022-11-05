/**
 * SAA1099Tracker Player: Runtime playback parameters class a interface definition.
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
import { SAASoundRegData } from '../saa/SAASound';
import { Volume } from './globals';
import Ornament from './Ornament';
import Player from './Player';
import Sample from './Sample';

/** Player runtime parameters interface */
interface PlayerParams {
	tone: number;
	playing: boolean;
	sample: Sample;
	ornament: Ornament;
	sample_cursor: number;
	ornament_cursor: number;
	attenuation: Volume;
	slideShift: number;
	globalPitch: number;
	released: boolean;
	command: number;
	commandParam: number;
	commandPhase: number;
	commandValue1: number;
	commandValue2: number;

	[key: string]: any;
}

/** Player runtime parameters processor */
export default class PlayerRuntime extends SAASoundRegData {
  params: PlayerParams[] = [];

  constructor(private player: Player) {
    super();

    for (let chn: number = 0; chn < 6; chn++) {
      this.clearPlayParams(chn);
    }
  }

  clearPlayParams(chn: number) {
    if (chn < 0 || chn >= 6) {
      return;
    }

    this.params[chn] = {
      tone: 0,
      playing: false,
      sample: this.player.sample[0],
      ornament: this.player.ornament[0],
      sample_cursor: 0,
      ornament_cursor: 0,
      attenuation: new Volume(),
      slideShift: 0,
      globalPitch: 0,
      released: false,
      command: 0,
      commandParam: 0,
      commandPhase: 0,
      commandValue1: 0,
      commandValue2: 0
    };
  }

  public setRegData(reg: number, data: number) {
    const index = 'R' + toHex(reg, 2).toUpperCase();
    this.regs[index] = data;
  }

  public replace(data: PlayerRuntime) {
    Object.keys(data.regs).forEach(idx => {
      this.regs[idx] = data.regs[idx];
    });

    for (let i = 0; i < 6; i++) {
      const dst: PlayerParams = this.params[i];
      const src: PlayerParams = data.params[i];

      Object.keys(src).forEach(idx => {
        if (dst[idx] instanceof Volume) {
          dst[idx].L = src[idx].L;
          dst[idx].R = src[idx].R;
        }
        else {
          dst[idx] = src[idx];
        }
      });
    }
  }
}
