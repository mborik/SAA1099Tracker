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
import constants from './constants';
import { STMFile } from './file';
import Tracker from '.';


export class FileExport {
  constructor(
    private _app: Tracker,
    private _parent: STMFile) {}

  /**
   * Export song to STMF format (SAA1099Tracker Module File).
   * Which is a JSON format, tracker's native format for saving and loading the song.
   */
  public stmf(): void {
    const file = this._parent;
    const data = file.createJSON(true);
    const fileName = file.getFixedFileName();

    file.system.save(data, `${fileName}.STMF`, constants.MIMETYPE_STMF);
  }

  /**
   * Export song to plain-text format in a human-readable format.
   */
  public textDump(): void {
    const file = this._parent;
    const fileName = file.getFixedFileName();

    const player = this._app.player;
    const hexa = this._app.settings.hexTracklines;
    const empty = ' '.repeat(14);

    const output = `SAA1099Tracker export of song "${
      this._app.songTitle
    }" by "${
      this._app.songAuthor
    }":\n\n${
      player.positions.flatMap((pp, index) => {
        const triDigitLine = (!hexa && pp.length > 100);

        const lines = [
          `Position ${index + 1}, speed: ${pp.speed}`,
          `    ${
            pp.ch.map(
              ({ pitch }) => pitch ?
                `${`           [ ${pitch}`.substr(-12)} ]` :
                empty
            ).join('')}`
        ];
        for (let buf = '', line = 0; line < pp.length; line++) {
          buf = (`00${line.toString(hexa ? 16 : 10)}`).substr(-3);
          buf = ` ${(triDigitLine || (!hexa && line > 99)) ? buf[0] : ' '}${buf.slice(1)}`;

          for (let channel = 0; channel < 6; channel++) {
            const pt = player.patterns[pp.ch[channel].pattern];
            const dat = pt.data[line].tracklist;

            if (line >= pt.end) {
              buf += empty;
            }
            else {
              buf += `  ${dat.tone} ${dat.column.substr(0, 4)} ${dat.column.substr(4)}`;
            }
          }

          lines.push(buf.replace(/\x7f/g, '.').toUpperCase());
        }

        lines.push('');
        return lines;
      }).join('\n')}`;

    file.system.save(output, `${fileName}.txt`, constants.MIMETYPE_TEXT);
  }

  /**
   * Render SAA1099 soundchip data, export to Video Game Music (VGM) format v1.71
   * and compress with gzip (.vgz).
   */
  public vgm(): boolean {
    const app = this._app;
    const player = this._app.player;

    if (
      app.modePlay ||
      player.positions.length === 0 ||
      app.globalKeyState.lastPlayMode !== 0
    ) {
      return false;
    }

    const file = this._parent;
    const fileName = file.getFixedFileName();

    const date = new Date();
    const gd3tag = `${
      app.songTitle
    }\0\0\0\0\0\0${
      app.songAuthor
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
    data.setUint32(0x24, app.settings.audioInterrupt, true); // Rate
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
    file.system.save(packed, `${fileName}.vgz`, constants.MIMETYPE_VGM);
    return true;
  }
}
