/**
 * SAA1099Tracker: Audio format export methods.
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
//---------------------------------------------------------------------------------------

import pako from 'pako';
import { devLog } from '../commons/dev';
import { toWidth } from '../commons/number';
import Player from '../player/Player';
import { SAASound } from '../saa/SAASound';

interface VgmExportOptions {
  player: Player;
  audioInterrupt: number;
  durationInFrames: number;
  songTitle: string;
  songAuthor: string;
  uncompressed?: boolean;
  appName?: string;
  date?: Date;
}

/**
 * Render SAA1099 soundchip data, export to Video Game Music (VGM) format v1.71
 * and (optionally) compress with gzip (.vgz).
 */
export const vgm = ({
  player,
  audioInterrupt,
  durationInFrames,
  songTitle,
  songAuthor,
  uncompressed = false,
  appName = 'SAA1099Tracker',
  date = new Date(),
}: VgmExportOptions) => {

  devLog('Export', 'Exporting to VGM format v1.71...');

  const gd3tag = `${
    songTitle
  }\0\0\0\0\0\0${
    songAuthor
  }\0\0${
    date.getUTCFullYear()
  }/${
    toWidth(date.getUTCMonth() + 1, 2)
  }/${
    toWidth(date.getUTCDate(), 2)
  }\0${
    appName
  }\0\0`;

  // 256 bytes of header + 3 x 20 reg/data pairs per frame
  const buffer = new Uint8Array(256 + (durationInFrames * 3 * 20) + ((gd3tag.length + 6) * 2));
  buffer.fill(0);

  const data = new DataView(buffer.buffer);

  let ptr = 0x100;
  let sampleCounter = 0;
  let loopSampleOffset = 0;

  data.setUint32(0x00, 0x56676D20, false);    // "Vgm " signature
  data.setUint32(0x08, 0x00000171, true);     // Version number
  data.setUint32(0x24, audioInterrupt, true); // Rate
  data.setUint32(0x34, ptr - 0x34, true);     // VGM data offset
  data.setUint32(0xC8, 8000000, true);        // SAA1099 clock

  const sampleRate = Math.floor(44100 / audioInterrupt);
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

  devLog('Export', 'Starting playback simulation...');

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

  devLog('Export', 'Uncompressed VGM total length: %d bytes...', ptr);

  const result = buffer.slice(0, ptr);
  if (uncompressed) {
    return result;
  }

  devLog('Export', 'Gzipping to VGZ...');
  return pako.gzip(result);
};

//---------------------------------------------------------------------------------------
interface WaveExportOptions {
  player: Player;
  SAA1099: SAASound;
  frequency: number;
  bitDepth: number;
  channels: number;
  repeatCount: number;
  audioInterrupt: number;
  durationInFrames: number;
}

/**
 * Render SAA1099 soundchip data and export to WAVE format.
 * @see http://soundfile.sapp.org/doc/WaveFormat/
 */
export const wave = ({
  player,
  SAA1099,
  frequency,
  bitDepth,
  channels,
  repeatCount,
  audioInterrupt,
  durationInFrames,
}: WaveExportOptions) => {

  devLog('Export', 'Exporting to WAVE format, %d channels, %d Hz, %d bit...',
    channels, frequency, bitDepth);

  const sampleRate = Math.floor(frequency / audioInterrupt);
  const blockAlign = channels * (bitDepth / 8);
  const byteRate = sampleRate * blockAlign;
  const byteRateSec = frequency * blockAlign;
  const dataSize = durationInFrames * byteRate * (repeatCount + 1);

  const buffer = new ArrayBuffer(48 + dataSize);
  const data = new DataView(buffer);

  data.setUint32(0 , 0x52494646, false);    // "RIFF"
  data.setUint32(8 , 0x57415645, false);    // "WAVE"
  data.setUint32(12, 0x666d7420, false);    // "fmt "
  data.setUint32(16, 16, true);             // Size of fmt chunk
  data.setUint16(20, bitDepth === 32 ? 3 : 1, true); // PCM or IEEE float
  data.setUint16(22, channels, true);  // Number of channels
  data.setUint32(24, frequency, true); // Sample rate
  data.setUint32(28, byteRateSec, true);    // Byte rate
  data.setUint16(32, blockAlign, true);     // Block align
  data.setUint16(34, bitDepth, true);  // Bits per sample
  data.setUint32(36, 0x64617461, false);    // "data"

  let ptr = 44;
  let loopSampleOffset = 0;
  const leftBuf = new Float32Array(sampleRate);
  const rightBuf = new Float32Array(sampleRate);

  devLog('Export', 'Starting playback simulation on %d Hz...', frequency);

  player.simulatePlayback(
    (rt) => {
      SAA1099.setAllRegs(rt);
      SAA1099.output(leftBuf, rightBuf, sampleRate);

      for (let i = 0; i < sampleRate; i++) {
        if (channels === 1) {
          const mono = (leftBuf[i] + rightBuf[i]) / 2;
          switch (bitDepth) {
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
          switch (bitDepth) {
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
      if (repeatCount) {
        loopSampleOffset = ptr;
      }
    });

  if (repeatCount) {
    const loopLength = ptr - loopSampleOffset;
    devLog('Export', 'Appending repeat sequence [offset %d, length %d]...',
      ptr - 44, loopLength);

    for (let i = loopSampleOffset; i < loopSampleOffset + loopLength; i++, ptr++) {
      data.setUint8(ptr, data.getUint8(i));
    }
  }

  data.setUint32(4, ptr - 8, true); // Size of RIFF chunk
  data.setUint32(40, ptr - 44, true); // Size of data chunk

  devLog('Export', 'Total WAVE file length: %d bytes...', ptr);

  return new Uint8Array(buffer.slice(0, ptr));
};
