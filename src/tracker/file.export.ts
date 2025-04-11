/**
 * SAA1099Tracker: Tracker file export sub-class.
 * Copyright (c) 2025 Martin Borik <martin@borik.net>
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

import pako from 'pako';
import { toWidth } from '../commons/number';
import { STMFile } from './file';
import Tracker from '.';


export class FileExport {
  constructor(
    private _app: Tracker,
    private _parent: STMFile) {}

  public vgm(): boolean {
    const intRate = this._app.settings.audioInterrupt;
    const player = this._app.player;
    if (!player.positions.length) {
      return false;
    }

    const file = this._parent;
    const fileName = file.getFixedFileName();

    const date = new Date();
    const gd3tag = `${
      this._app.songTitle
    }\0\0\0\0\0\0${
      this._app.songAuthor
    }\0\0${
      date.getUTCFullYear()
    }/${
      toWidth(date.getUTCMonth() + 1, 2)
    }/${
      toWidth(date.getUTCDate(), 2)
    }\0SAA1099Tracker\0\0`;

    // 256 bytes of header + 3 x 20 reg/data pairs per frame
    const buffer = new Uint8Array(256 + (file.durationInFrames * 3 * 20) + ((gd3tag.length + 6) * 2));
    buffer.fill(0);

    const data = new DataView(buffer.buffer);

    let ptr = 0x100;
    let sampleCounter = 0;
    let loopSampleOffset = 0;

    data.setUint32(0x00, 0x56676D20, false);  // "Vgm " signature
    data.setUint32(0x08, 0x00000171, true);   // Version number
    data.setUint32(0x24, intRate, true);      // Rate
    data.setUint32(0x34, ptr - 0x34, true);   // VGM data offset
    data.setUint32(0xC8, 8000000, true);      // SAA1099 clock

    const sampleRate = 44100 / 50;
    const lastRegDatState = new Map<number, number>();
    const storeReg = (reg: number, value: number): void => {
      data.setUint8(ptr, 0xBD);
      data.setUint8(ptr + 1, reg);
      data.setUint8(ptr + 2, value);
      lastRegDatState.set(reg, value);
      ptr += 3;
    };
    const storeWait = (): void => {
      data.setUint8(ptr, 0x61); // Wait
      data.setUint16(ptr + 1, sampleRate, true);
      ptr += 3;
    };

    player.simulatePlayback(
      (rt) => {
        Object.keys(rt.regs).forEach(key => {
          const reg: number = parseInt(key.slice(1), 16);
          const dat: number = rt.regs[key];
          const lastDat = lastRegDatState.get(reg);

          if (lastDat !== dat) {
            storeReg(reg, dat);
          }
        }, this);

        storeWait();
        sampleCounter += sampleRate;
      },
      () => {
        if (player.loopMode) {
          data.setUint32(0x1C, ptr - 0x1C, true); // Loop offset
          loopSampleOffset = sampleCounter;
        }
      });

    data.setUint8(ptr, 0x66); // End of stream
    ptr += 1;

    data.setUint32(0x14, ptr - 0x14, true); // Gd3 offset
    data.setUint32(ptr, 0x47643320, false); // "Gd3 " signature
    data.setUint32(ptr + 4, 0x100, true);   // Gd3 version
    data.setUint32(ptr + 8, gd3tag.length * 2, true); // Gd3 size
    ptr += 12;

    gd3tag.split('').forEach((char) => {
      data.setUint16(ptr, char.charCodeAt(0), true);
      ptr += 2;
    });

    data.setUint32(0x04, ptr - 0x04, true); // Eof offset
    data.setUint32(0x18, sampleCounter, true); // Total # samples

    if (player.loopMode) {
      data.setUint32(0x20, sampleCounter - loopSampleOffset, true); // Loop # samples
    }

    const packed = pako.gzip(buffer.slice(0, ptr));
    file.system.save(packed, `${fileName}.vgz`, 'application/octet-stream');
    return true;
  }
}
