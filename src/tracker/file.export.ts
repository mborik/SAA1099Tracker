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
import { devLog } from '../commons/dev';
import { toWidth } from '../commons/number';
import { pick } from '../commons/pick';
import { SAASound } from '../saa/SAASound';
import constants from './constants';
import { STMFile } from './file';
import Tracker from '.';


interface ExportOptions {
  frequency: number;
  bitDepth: number;
  channels: number;
  repeatCount: number;
}

const getConfigProps = (obj: any) => pick(obj, [
  'frequency',
  'bitDepth',
  'channels',
  'repeatCount',
]);

export class FileExport implements ExportOptions {
  private exportDialog: JQuery = null;

  public frequency: number = 44100;
  public bitDepth: number = 16;
  public channels: number = 2;
  public repeatCount: number = 0;

  constructor(
    private _app: Tracker,
    private _parent: STMFile) {}


  private _initExportDialog() {
    this.exportDialog = $('#export');

    try {
      const input = localStorage.getItem(constants.EXPORT_SETTINGS_KEY) || '{}';
      const userOptions = JSON.parse(input);
      Object.assign(this, userOptions);
    }
    catch (e) {}

    devLog('Tracker.file', 'Export settings fetched from localStorage %o...', getConfigProps(this));

    $(`#rdWaveFrequency${this.frequency}`).prop('checked', true);
    $(`#rdWaveBitDepth${this.bitDepth}`).prop('checked', true);
    $(`#rdWaveRepeat${this.repeatCount}`).prop('checked', true);
    $(`#rdWaveChannels${this.channels}`).prop('checked', true);

    $('input[name=rdWaveFrequency]').change((e: JQueryInputEventTarget) => {
      this.frequency = +e.currentTarget.value;
    });
    $('input[name=rdWaveBitDepth]').change((e: JQueryInputEventTarget) => {
      this.bitDepth = +e.currentTarget.value;
    });
    $('input[name=rdWaveRepeat]').change((e: JQueryInputEventTarget) => {
      this.repeatCount = +e.currentTarget.value;
    });
    $('input[name=rdWaveChannels]').change((e: JQueryInputEventTarget) => {
      this.channels = +e.currentTarget.value;
    });
  }

  public waveDialog() {
    if (!this.exportDialog) {
      this._initExportDialog();
    }

    const tracker = this._app;
    tracker.globalKeyState.inDialog = true;

    this.exportDialog.on('show.bs.modal', () => {
      this.exportDialog
        .before($('<div/>')
          .addClass('modal-backdrop in').css('z-index', '1030'));

      this.exportDialog.find('.apply').click(() => {
        this.exportDialog.modal('hide');
        $('#overlay .loader').html('rendering');
        document.body.className = 'loading';

        setTimeout(() => {
          this.wave();
          document.body.className = '';
        }, 50);
        return true;
      });

    }).on('hide.bs.modal', () => {
      this.exportDialog.prev('.modal-backdrop').remove();
      this.exportDialog.find('.modal-footer>.btn').off();
      this.exportDialog.off();

      localStorage.setItem(
        constants.EXPORT_SETTINGS_KEY,
        JSON.stringify(getConfigProps(this))
      );

      tracker.globalKeyState.inDialog = false;

    }).modal({
      show: true,
      backdrop: false
    });
  }

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
  public vgm(): void {
    const app = this._app;
    const player = this._app.player;

    if (app.modePlay || app.globalKeyState.lastPlayMode) {
      app.onCmdStop();
    }
    if (!player.positions.length) {
      return;
    }

    devLog('Tracker.file', 'Exporting to VGM format v1.71...');

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

    devLog('Tracker.file', 'Starting playback simulation...');

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

    devLog('Tracker.file', 'Gzipping, VGM total length: %d bytes...', ptr);

    const packed = pako.gzip(buffer.slice(0, ptr));
    file.system.save(packed, `${fileName}.vgz`, constants.MIMETYPE_VGM);
  }

  /**
   * Render SAA1099 soundchip data and export to WAVE format.
   * @see http://soundfile.sapp.org/doc/WaveFormat/
   */
  public wave(): void {
    const app = this._app;
    const player = this._app.player;

    if (app.modePlay || app.globalKeyState.lastPlayMode) {
      app.onCmdStop();
    }
    if (!player.positions.length) {
      return;
    }

    devLog('Tracker.file', 'Exporting to WAVE format, %d channels, %d Hz, %d bit...',
      this.channels, this.frequency, this.bitDepth);

    const file = this._parent;
    const fileName = file.getFixedFileName();

    const sampleRate = this.frequency / 50;
    const blockAlign = this.channels * (this.bitDepth / 8);
    const byteRate = sampleRate * blockAlign;
    const byteRateSec = this.frequency * blockAlign;
    const dataSize = file.durationInFrames * byteRate * (this.repeatCount + 1);

    const buffer = new ArrayBuffer(64 + dataSize);
    const data = new DataView(buffer);

    data.setUint32(0 , 0x52494646, false);    // "RIFF"
    data.setUint32(8 , 0x57415645, false);    // "WAVE"
    data.setUint32(12, 0x666d7420, false);    // "fmt "
    data.setUint32(16, 16, true);             // Size of fmt chunk
    data.setUint16(20, this.bitDepth === 32 ? 3 : 1, true); // PCM or IEEE float
    data.setUint16(22, this.channels, true);  // Number of channels
    data.setUint32(24, this.frequency, true); // Sample rate
    data.setUint32(28, byteRateSec, true);    // Byte rate
    data.setUint16(32, blockAlign, true);     // Block align
    data.setUint16(34, this.bitDepth, true);  // Bits per sample
    data.setUint32(36, 0x64617461, false);    // "data"

    let ptr = 44;
    let loopSampleOffset = 0;
    const leftBuf = new Float32Array(sampleRate);
    const rightBuf = new Float32Array(sampleRate);
    const SAA1099 = new SAASound(this.frequency);

    devLog('Tracker.file', 'Starting playback simulation...', this.frequency);

    player.simulatePlayback(
      (rt) => {
        SAA1099.setAllRegs(rt);
        SAA1099.output(leftBuf, rightBuf, sampleRate);

        for (let i = 0; i < sampleRate; i++) {
          if (this.channels === 1) {
            const mono = (leftBuf[i] + rightBuf[i]) / 2;
            switch (this.bitDepth) {
              case 8:
                data.setInt8(ptr, mono * 127);
                ptr += 1;
                break;
              case 16:
                data.setInt16(ptr, mono * 32767, true);
                ptr += 2;
                break;
              case 24:
                data.setInt32(ptr, mono * 8388607, true);
                ptr += 3;
                break;
              case 32:
                data.setFloat32(ptr, mono, true);
                ptr += 4;
                break;
            }
          }
          else {
            switch (this.bitDepth) {
              case 8:
                data.setInt8(ptr, leftBuf[i] * 127);
                ptr += 1;
                data.setInt8(ptr, rightBuf[i] * 127);
                ptr += 1;
                break;
              case 16:
                data.setInt16(ptr, leftBuf[i] * 32767, true);
                ptr += 2;
                data.setInt16(ptr, rightBuf[i] * 32767, true);
                ptr += 2;
                break;
              case 24:
                data.setInt32(ptr, leftBuf[i] * 8388607, true);
                ptr += 3;
                data.setInt32(ptr, rightBuf[i] * 8388607, true);
                ptr += 3;
                break;
              case 32:
                data.setFloat32(ptr, leftBuf[i], true);
                ptr += 4;
                data.setFloat32(ptr, rightBuf[i], true);
                ptr += 4;
            }
          }
        }
      },
      () => {
        if (this.repeatCount) {
          loopSampleOffset = ptr;
        }
      });

    if (this.repeatCount) {
      const loopLength = ptr - loopSampleOffset;
      devLog('Tracker.file', 'Appending repeat sequence [offset %d, length %d]...',
        ptr - 44, loopLength);

      for (let i = loopSampleOffset; i < loopSampleOffset + loopLength; i++, ptr++) {
        data.setUint8(ptr, data.getUint8(i));
      }
    }

    data.setUint32(4, ptr - 8, true); // Size of RIFF chunk
    data.setUint32(40, ptr - 44, true); // Size of data chunk

    const output = new Uint8Array(buffer.slice(0, ptr));
    file.system.save(output, `${fileName}.wav`, constants.MIMETYPE_WAV);
  }
}
