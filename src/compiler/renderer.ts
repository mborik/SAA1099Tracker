/**
 * SAA1099Tracker: Compiler - data render
 * Copyright (c) 2017-2019 Roman Borik <pmd85emu@gmail.com>
 * Copyright (c) 2022 Martin Borik <martin@borik.net>
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

import { writeWordLE } from '../commons/binary';
import { toHex } from '../commons/number';
import Tracker from '../tracker';
import constants from '../tracker/constants';
import { CompilerOptimizer } from './optimizer';


export default class CompilerRender extends CompilerOptimizer {
  constructor(public _parent: Tracker) {
    super();
  }

  /** compiled Song */
  songData: Uint8Array;
  /** generated Player */
  playerData: Uint8Array;
  /**
   * Player type according to Song data.
   * Types (or versions) of the player differs by supported Commands.
   * - vX.0 - BCDEF
   * - vX.1 - 123A+BCDEF
   * - vX.2 - 123+6789+ABCDEF
   * - vX.3 - 123+45+6789ABCDEF
   */
  playerTypeByData: number;
  /** Song data version - will be set according to Player */
  version: number;

  prepareSamples(): void {
    this.smpList = this._parent.player.samples.map((sample, sampleNumber) => {
      const { totalLength, sampleLength, sampleRepeat } = this.optimizeSingleSample(sample) ?? {};
      if (!totalLength) {
        if (sampleNumber === 0) {
          // sample 0 will be empty
          const data = new Uint8Array(1);
          data[0] = 0x80;
          return data;
        }
        return null;
      }
      else {
        const data = new Uint8Array(
          (3 * sampleLength + 1) +
          ((sample.releasable) ? 1 + ((totalLength - sampleLength) * 3) + 1 : 0)
        );

        let offset = 0;
        if (sample.releasable) {
          data[offset++] = 0xFF;
        }

        for (let i = 0; i < totalLength; i++) {
          const volume = sample.data[i].volume.byte;
          const noise = sample.data[i].noise_value;
          const shift = sample.data[i].shift;
          const enable_freq = (sample.data[i].enable_freq) ? 0x80 : 0;
          const enable_noise = (sample.data[i].enable_noise) ? 0x40 : 0;

          data[offset++] = enable_noise | (noise << 4) | (volume & 0x0F);
          data[offset++] = enable_freq | ((shift & 0x0700) >>> 4) | ((volume & 0xF0) >>> 4);
          data[offset++] = shift & 0xFF;

          if (i === sampleLength - 1) {
            data[offset++] = (sampleRepeat === sampleLength) ? 0x80 : sampleRepeat - sampleLength;
          }
        }
        if (sample.releasable) {
          data[offset++] = 0x80;
        }

        return data;
      }
    });
  }

  prepareOrnaments() {
    this.ornList = this._parent.player.ornaments.map((ornament, ornNumber) => {
      const { ornLength, ornRepeat } = this.optimizeSingleOrnament(ornament) ?? {};
      if (!ornLength) {
        if (ornNumber === 0) {
          const data = new Uint8Array(1);
          data[0] = 0x80;
          return data;
        }
      }
      else {
        const data = new Uint8Array(ornLength + 1);
        for (let i = 0; i < ornLength; i++) {
          data[i] = ornament.data[i] & 0x7F;
        }
        data[ornLength] = (ornRepeat === ornLength) ? 0x80 : ornRepeat - ornLength;
        return data;
      }
    });
  }

  preparePatterns(log?: (msg: string) => void) {
    const usedCmdId = new Set<number>();
    const usedCmd = new Set<string>();
    const removedCmd = new Set<string>();

    this.patList = this.preparePatternsAndPreoptimize(
      this._parent.player.patterns
    ).map((pattern, patNumber) => {
      if (pattern === null) {
        if (patNumber === 0) {
          // pattern 0 is always empty
          const emptyPattern = new Uint8Array(1);
          emptyPattern[0] = 0xFF;
          return emptyPattern;
        }
        return null;
      }
      else {
        const data = new Uint8Array(5 * pattern.end + 1);

        // searching for possible Cmd-B
        let breakToLine = -1;
        let breakToLineOffset = -1;
        for (let i = 0; i < pattern.end; i++) {
          const patLine = pattern.data[i];
          if (patLine.cmd === 0x0B) {
            // BREAK CURRENT CHANNEL-PATTERN AND LOOP FROM LINE
            const line = patLine.dat;
            if (line >= 0 && line < i) {
              breakToLine = line;
              break;
            }
          }
        }

        let offY = 0;
        let lastEmptyLines = 0;
        let lastCmd = 0;
        let lastDat = -1;
        for (let i = 0; i < pattern.end; i++) {
          let { ton, smp, orn, vol, cmd, dat, release, orn_release } = pattern.data[i];
          let cmdStr = `${toHex(cmd, 1)}${toHex(dat, 2)}`.toUpperCase();

          // filter invalid commands
          if (cmd > 0) {
            switch (cmd) {
              case 0x1 : // PORTAMENTO UP
              case 0x2 : // PORTAMENTO DOWN
              case 0x3 : // GLISSANDO TO GIVEN NOTE
                if (
                  (dat & 0x0F) === 0 || (dat & 0xF0) === 0 || // `period` nor `pitch` cannot be 0
                  (cmd === 0x3 && ton === 0)                  // missing tone for GLISSANDO
                ) {
                  removedCmd.add(cmdStr);
                  cmd = 0;
                }
                break;

              case 0x4 : // VIBRATO ON CURRENT NOTE
              case 0x5 : // TREMOLO ON CURRENT NOTE
                if ((dat & 0x0F) === 0 || (dat & 0xF0) === 0) { // `period` or `pitch` cannot be 0
                  removedCmd.add(cmdStr);
                  cmd = 0;
                }
                break;

              case 0x6 : // DELAY ORNAMENT
              case 0x7 : // ORNAMENT OFFSET
              case 0x8 : // DELAY SAMPLE
              case 0x9 : // SAMPLE OFFSET
              case 0xD : // NOT IMPLEMENTED
                if (dat === 0 || cmd === 0xD) { // dat cannot be 0
                  removedCmd.add(cmdStr);
                  cmd = 0;
                }
                break;

              case 0xA : // VOLUME SLIDE
                break;

              case 0xB : // BREAK CURRENT CHANNEL-PATTERN AND LOOP FROM LINE
                if (dat < 0 || dat >= i) { // line number cannot be >= actual line number
                  removedCmd.add(cmdStr);
                  cmd = 0;
                }
                break;

              case 0xC : // SPECIAL COMMAND
                if (dat > 0) {
                  if (dat >= 0xF0) {
                    dat &= 0xF1; // currently all Fx values behaves as STEREO-SWAP - 0. bit
                  }
                  cmdStr = `${toHex(cmd, 1)}${toHex(dat, 2)}`.toUpperCase();
                  if (dat >= 0xF2) {
                    removedCmd.add(cmdStr);
                    cmd = 0;
                  }
                }
                break;

              case 0xE : // SOUNDCHIP ENVELOPE OR NOISE CHANNEL CONTROL
                const d = dat & 0xF0;
                if (
                  (d > 0x20 && d !== 0xD0) || // invalid values for ENVELOPE-CONTROL
                  (d === 0x20 && dat > 0x24)  // invalid values for NOISE-CONTROL
                ) {
                  removedCmd.add(cmdStr);
                  cmd = 0;
                }
                break;

              case 0xF : // CHANGE GLOBAL SPEED
                // 0 value is not allowed
                if (dat === 0) {
                  removedCmd.add(cmdStr);
                  cmd = 0;
                }
                else if (dat > 0x1F) {
                  // invalid value for SWING MODE
                  if ((dat & 0x0F) < 2) {
                    removedCmd.add(cmdStr);
                    cmd = 0;
                  }
                  // equal SWING values will be changed to normal speed
                  else if ((dat & 0x0F) === ((dat & 0xF0) >> 4)) {
                    dat &= 0x0F;
                    cmdStr = `${toHex(cmd, 1)}${toHex(dat, 2)}`.toUpperCase();
                  }
                }
                break;
            }
          }

          // release is meaningful only for CMD A to F
          if (release && cmd > 0 && cmd < 0xA) {
            removedCmd.add(cmdStr);
            cmd = 0;
          }

          if (cmd > 0) {
            // remove repeated Cmd-4xy a Cmd-5xy
            if ((cmd === 0x4 || cmd === 0x5) && (lastCmd === cmd && lastDat === dat)) {
              removedCmd.add(cmdStr);
              cmd = 0;
              dat = -1;
            }
            else {
              lastCmd = cmd;
              lastDat = dat;
            }
          }

          if (cmd > 0) {
            usedCmd.add(cmdStr);
            usedCmdId.add(cmd);
          }

          // release of using empty sample
          const b1 = (release || smp > 0 && this.smpList[smp] === null) ? 0x7f : ton;
          let b2 = ((vol > 0) ? 0x80 : 0) | (orn_release ? 0x40 : 0) | smp;
          let b3 = (cmd << 4) | orn;
          if (b1 === 0x7f) {
            b2 = 0;
            b3 &= 0xF0;
          }
          if (b1 === 0 && b2 === 0 && b3 === 0 && breakToLine !== i) {
            // empty line, which is not target for Cmd-B
            data[offY++] = 0x80;
            lastEmptyLines++;
          }
          else {
            if (lastEmptyLines > 1) {
              offY -= lastEmptyLines;
              while (lastEmptyLines > 0) {
                const lel = (lastEmptyLines > 127) ? 127 : lastEmptyLines;
                data[offY++] = (lel - 1) | 0x80;
                lastEmptyLines -= lel;
              }
            }

            if (breakToLine === i) {
              // offset of pattern line, where should be jump after Cmd-B
              breakToLineOffset = offY;
            }

            if (b1 === 0 && b2 === 0 && b3 === 0) {
              // empty line
              data[offY++] = 0x80;
              lastEmptyLines++;
            }
            else {
              lastEmptyLines = 0;
              data[offY++] = b1;

              if (b2 > 0 || b3 > 0) {
                data[offY++] = b2;
                data[offY++] = b3;
                if (vol > 0) {
                  data[offY++] = vol;
                }
                if (cmd > 0) {
                  if (cmd === 0xB) { // Cmd-B
                    const backOffset = offY - breakToLineOffset + 2;
                    writeWordLE(data, offY, -backOffset);
                    offY += 2;
                    break;
                  }

                  data[offY++] = dat;
                }
              }
              else {
                // optimization for only note changed
                data[offY++] = 0x20;
              }
            }
          }
        }

        if (breakToLineOffset < 0) { // end mark, only when Cmd-B was not occurs
          offY -= lastEmptyLines; // empty lines at the end will be elliminated
          data[offY++] = 0xFF;  // end mark
        }

        return data.slice(0, offY);
      }
    });

    if (usedCmdId.has(4) || usedCmdId.has(5)) {
      // vX.3 - 123+45+6789ABCDEF
      this.playerTypeByData = 3;
    }
    else if (usedCmdId.has(3) || usedCmdId.has(6) || usedCmdId.has(7) || usedCmdId.has(8) || usedCmdId.has(9)) {
      // vX.2 - 12+36789+ABCDEF
      this.playerTypeByData = 2;
    }
    else if (usedCmdId.has(1) || usedCmdId.has(2) || usedCmdId.has(10)) {
      // vX.1 - 12A+BCDEF
      this.playerTypeByData = 1;
    }
    else {
      // vX.0 - BCDEF
      this.playerTypeByData = 0;
    }

    this.version = constants.CURRENT_PLAYER_MAJOR_VERSION * 16 + this.playerTypeByData;

    let cmdArray = [...usedCmd].sort();
    cmdArray.length && log?.(`Used commands: [ ${cmdArray.join(', ')} ]`);
    cmdArray = [...removedCmd].sort();
    cmdArray.length && log?.(`Removed commands: [ ${cmdArray.join(', ')} ]`);
  }

  preparePositions() {
    this.posList = this._parent.player.positions.map((position) => {
      const data = new Uint8Array(14);
      let offset = 0;
      data[offset++] = position.length;
      data[offset++] = position.speed;
      for (let i = 0; i < 6; i++) {
        data[offset++] = position.ch[i].pattern;
        data[offset++] = position.ch[i].pitch;
      }
      return data;
    });
  }
}
