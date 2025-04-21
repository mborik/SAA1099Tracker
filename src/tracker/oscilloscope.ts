/**
 * SAA1099Tracker: Oscilloscope processor.
 * Copyright (c) 2023-2025 Martin Borik <martin@borik.net>
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
import { SAASoundMonitorCallback } from '../libs/SAASound';
import Tracker, { TrackerCanvasPair } from '.';

export default class Oscilloscope {
  private _buffer: Float32Array[][];
  private _pos: number[];

  public canvas: TrackerCanvasPair[][] =
    [...Array(6)].map(() => ([
      //@ts-ignore
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
        ctx.imageSmoothingEnabled = false;
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
    if (this._buffer?.length && this._parent?.activeTab === 9) {
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
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#888';
          if (lr) {
            ctx.textAlign = 'left';
            ctx.fillText('R', 0, 0);
          }
          else {
            ctx.textAlign = 'right';
            ctx.fillText('L', width, 0);
          }
          ctx.fillStyle = '#38c';
          const chnText = `CH${chn + 1}`;
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
          const multiplier = -(mid * 9);
          const iterator = (width / buffer.length) * 2;

          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1.5;
          ctx.lineCap = 'square';
          ctx.beginPath();

          mid = Math.floor(mid * 1.9);
          if (this._parent.modePlay) {
            let y = mid + buffer[0] * multiplier;
            ctx.moveTo(0, y);
            for (let i = 2, x = iterator; x < width; x += iterator, i += 2) {
              y = mid + buffer[i] * multiplier;
              ctx.lineTo(x, y);
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

    requestAnimationFrame(this._update.bind(this));
  }
}
