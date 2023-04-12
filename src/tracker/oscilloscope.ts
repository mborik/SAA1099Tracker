/**
 * SAA1099Tracker: Oscilloscope processor.
 * Copyright (c) 2023 Martin Borik <martin@borik.net>
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

import AudioDriver from '../commons/audio';
import { SAASoundMonitorCallback } from '../saa/SAASound';
import Tracker, { TrackerCanvasPair } from '.';

export default class Oscilloscope {
  private _buffer: Float32Array[][];
  private _pos: number[];

  public canvas: TrackerCanvasPair[][] =
    [...Array(6)].map(() => ([
      { obj: null, ctx: null },
      { obj: null, ctx: null }
    ]));

  constructor(private _parent: Tracker) {}

  public init(): void {
    const size = AudioDriver.getAdjustedSamples(
      AudioDriver.sampleRate, 2, this._parent.settings.audioInterrupt
    );

    this._pos = Array(6).fill(0);
    this._buffer = [...Array(6)].map(() => ([
      new Float32Array(size),
      new Float32Array(size)
    ]));

    for (let chn = 0; chn < 6; chn++) {
      for (let lr = 0; lr < 2; lr++) {
        const { ctx } = this.canvas[chn][lr];
        ctx.font = 'monotype 8px';
        ctx.imageSmoothingEnabled = true;
      }
    }

    requestAnimationFrame(this._update.bind(this));
  }

  public consume: SAASoundMonitorCallback = (chn, left, right) => {
    const pos = this._pos[chn];
    const [bufferLeft, bufferRight] = this._buffer[chn];

    bufferLeft[pos] = left;
    bufferRight[pos] = right;

    this._pos[chn] = (pos + 1) % bufferLeft.length;
  };

  private _update(): void {
    requestAnimationFrame(this._update.bind(this));

    if (!this._buffer?.length) {
      return;
    }

    for (let chn = 0; chn < 6; chn++) {
      for (let lr = 0; lr < 2; lr++) {
        const { obj, ctx } = this.canvas[chn][lr];
        const buffer = this._buffer[chn][lr];

        if (!buffer) {
          continue;
        }

        const width = Math.floor(obj.width);
        const height = Math.floor(obj.height);

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#888';
        if (lr) {
          ctx.textAlign = 'left';
          ctx.fillText('R', 0, height);
        }
        else {
          ctx.textAlign = 'right';
          ctx.fillText('L', width, height);
        }
        const chnText = `CH${chn + 1}`;
        ctx.textBaseline = 'top';
        if (lr) {
          ctx.textAlign = 'right';
          ctx.fillText(chnText, width, 0);
        }
        else {
          ctx.textAlign = 'left';
          ctx.fillText(chnText, 0, 0);
        }
        ctx.restore();

        let mid = height >> 1;
        const multiplier = mid / (512 / 2880);
        const iterator = width / buffer.length;

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();

        mid >>= 1;
        if (this._parent.modePlay) {
          for (
            let i = 0, y = lr ? width - 1 : 0;
            lr ? (y >= 0) : (y < width);
            y += lr ? -iterator : iterator, i++
          ) {
            const value = mid + buffer[i] * multiplier;
            ctx[i ? 'lineTo' : 'moveTo'](y, value);
          }
        }
        else {
          ctx.moveTo(0, mid);
          ctx.lineTo(width, mid);
        }

        ctx.stroke();
      }
    }
  }
}
