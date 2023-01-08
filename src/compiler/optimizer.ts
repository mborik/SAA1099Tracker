/**
 * SAA1099Tracker: Compiler optimizer
 * Copyright (c) 2017-2019 Roman Borik <pmd85emu@gmail.com>
 * Copyright (c) 2022-2023 Martin Borik <martin@borik.net>
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

import { equalsByteArrays } from '../commons/binary';
import Ornament from '../player/Ornament';
import Pattern from '../player/Pattern';
import Sample from '../player/Sample';


const renumberSet = (set: Set<number>, index: number) =>
  new Set<number>(
    [...set].map(item => (item > index) ? item - 1 : item)
  );

export class CompilerOptimizer {
  // lists of byte arrays for compiled parts of the song
  smpList: Nullable<Array<Uint8Array>> = null;
  ornList: Nullable<Array<Uint8Array>> = null;
  patList: Nullable<Array<Uint8Array>> = null;
  posList: Nullable<Array<Uint8Array>> = null;

  /**
   * Prepare list of used sample or ornaments in patterns.
   */
  private getUsedInPatterns(ornaments = false) {
    return this.patList.reduce<Set<number>>(
      (set, patData) => {
        for (let i = 0; i < patData.length; i++) {
          const t = patData[i];
          if ((t & 0x80) > 0) {
            // omit empty lines
            continue;
          }
          let s = patData[++i];
          if ((s & 0x20) > 0) {
            // omit only tone changes
            continue;
          }
          let o = patData[++i];
          if ((s & 0x80) > 0) {
            i++;
          }
          if ((o & 0xF0) > 0) {
            i++;
            if ((o & 0xF0) === 0xB0) {
              i++;
            }
          }

          if (ornaments) {
            o = o & 0x0F;
            if (o > 0) {
              set.add(o);
            }
          }
          else {
            s = s & 0x1F;
            if (s > 0) {
              set.add(s);
            }
          }
        }
        return set;
      },
      new Set<number>()
    );
  }

  /**
   * Method finds a real end of the sample, ignoring "empty" ticks.
   */
  optimizeSingleSample(sample?: Sample): Nullable<{
    totalLength: number;
    sampleLength: number;
    sampleRepeat: number;
  }> {
    let sampleLength = sample?.end;
    let sampleRepeat = sample?.loop;
    if (
      sample === null ||
      sampleLength === 0 ||
      (sampleLength === 1 && !sampleRepeat &&
        !sample.data[0].volume.byte && !sample.data[0].shift && !sample.data[0].noise_value
      )
    ) {
      return null;
    }
    let totalLength = (sample.releasable) ? sample.data.length : sampleLength;
    let i = totalLength - 1;
    while (sample.releasable ? i > sample.end : (i >= 0 && i < sampleRepeat)) {
      if (sample.data[i].volume.byte || sample.data[i].shift || sample.data[i].noise_value) {
        break;
      }
      if (!sample.releasable) {
        sampleLength--;
        sampleRepeat--;
      }
      totalLength--;
      i--;
    }
    return {
      totalLength,
      sampleLength,
      sampleRepeat
    };
  }

  /**
   * Method removes duplicated, "empty" and unused samples.
   */
  optimizeSamples(log?: (msg: string) => void) {
    if (!(this.smpList?.length && this.patList?.length)) {
      return;
    }

    // remove "empty" samples
    let removedSamples = 0;
    let smpNum = 0;
    do {
      for (smpNum = this.smpList.length - 1; smpNum > 0; smpNum--) {
        if (this.smpList[smpNum] == null) {
          this.smpList.splice(smpNum, 1);
          this.replaceSampleInPatterns(smpNum, 0);
          this.renumberSamplesInPatterns(smpNum);
          removedSamples++;
          break;
        }
      }
    } while (smpNum > 0);

    // remove duplicated samples
    let wasReplaced = false;
    let duplicateSamples = 0;
    do {
      wasReplaced = false;
      for (let i = this.smpList.length - 1; i > 0; i--) {
        const b1 = this.smpList[i];
        for (let j = i - 1; j >= 0; j--) {
          const b2 = this.smpList[j];
          if (b1.length !== b2.length) {
            continue;
          }
          if (equalsByteArrays(b1, 0, b2, 0, b1.length)) {
            this.smpList.splice(i, 1);
            this.replaceSampleInPatterns(i, j);
            this.renumberSamplesInPatterns(i);
            wasReplaced = true;
            duplicateSamples++;
            break;
          }
        }
        if (wasReplaced) {
          break;
        }
      }
    } while (wasReplaced);

    // prepare list of used sample numbers
    let samples = this.getUsedInPatterns();

    // remove unused samples
    let unusedSamples = 0;
    if (samples.size < this.smpList.length - 1) {
      do {
        for (smpNum = this.smpList.length - 1; smpNum > 0; smpNum--) {
          if (samples.has(smpNum)) {
            continue;
          }
          unusedSamples++;
          this.smpList.splice(smpNum, 1);
          this.renumberSamplesInPatterns(smpNum);
          samples = renumberSet(samples, smpNum);
          break;
        }
      } while (smpNum > 0);
    }

    if (removedSamples > 0) {
      log?.(removedSamples + ' empty sample(s) was removed.');
    }
    if (duplicateSamples > 0) {
      log?.(duplicateSamples + ' duplicated sample(s) was removed.');
    }
    if (unusedSamples > 0) {
      log?.(unusedSamples + ' unused sample(s) was removed.');
    }
  }

  /**
   * Method replaces one sample by another.
   */
  private replaceSampleInPatterns(oldSmpNum: number, newSmpNum: number) {
    this.patList?.forEach(patData => {
      for (let i = 0; i < patData.length; i++) {
        const t = patData[i];
        if ((t & 0x80) > 0) {
          // omit empty lines
          continue;
        }
        const s = patData[++i];
        if ((s & 0x20) > 0) {
          // omit only tone changes
          continue;
        }
        const si = i;
        const o = patData[++i];
        if ((s & 0x80) > 0) {
          i++;
        }
        if ((o & 0xF0) > 0) {
          i++;
          if ((o & 0xF0) === 0xB0) {
            i++;
          }
        }

        if ((s & 0x1F) === oldSmpNum) {
          patData[si] = (s & 0xE0) | newSmpNum;
        }
      }
    });
  }

  /**
   * Method to renumber samples, which have number greater than `smpNum`.
   */
  private renumberSamplesInPatterns(smpNum: number): void {
    this.patList?.forEach(patData => {
      for (let i = 0; i < patData.length; i++) {
        const t = patData[i];
        if ((t & 0x80) > 0) {
          // omit empty lines
          continue;
        }
        const s = patData[++i];
        if ((s & 0x20) > 0) {
          // omit only tone changes
          continue;
        }
        const si = i;
        const o = patData[++i];
        if ((s & 0x80) > 0) {
          i++;
        }
        if ((o & 0xF0) > 0) {
          i++;
          if ((o & 0xF0) === 0xB0) {
            i++;
          }
        }

        if ((s & 0x1F) > smpNum) {
          patData[si] = (s & 0xE0) | ((s & 0x1F) - 1);
        }
      }
    });
  }

  /**
   * Method finds a real end of the ornament, ignoring "empty" ticks.
   */
  optimizeSingleOrnament(ornament?: Ornament): Nullable<{
    ornLength: number;
    ornRepeat: number;
  }> {
    let ornLength = ornament?.end;
    let ornRepeat = ornament?.loop;
    if (
      ornament === null ||
      ornLength === 0 ||
      (ornLength === 1 && !ornRepeat && !ornament.data[0])
    ) {
      return null;
    }
    let i = ornLength - 1;
    while (i >= 0 && i < ornRepeat) {
      if (ornament.data[i]) {
        break;
      }
      ornLength--;
      ornRepeat--;
      i--;
    }
    return { ornLength, ornRepeat };
  }

  /**
   * Method removes duplicated, "empty" and unused ornaments.
   */
  optimizeOrnaments(log?: (msg: string) => void) {
    if (!(this.ornList?.length && this.patList?.length)) {
      return;
    }

    // remove "empty" ornaments
    let removedOrnaments = 0;
    let ornNum = 0;
    do {
      for (ornNum = this.ornList.length - 1; ornNum > 0; ornNum--) {
        if (this.ornList[ornNum] == null) {
          this.ornList.splice(ornNum, 1);
          this.replaceOrnamentInPatterns(ornNum, 0);
          this.renumberOrnamentsInPatterns(ornNum);
          removedOrnaments++;
          break;
        }
      }
    } while (ornNum > 0);

    // remove duplicated ornaments
    let wasReplaced = false;
    let duplicateOrnaments = 0;
    do {
      wasReplaced = false;
      for (let i = this.ornList.length - 1; i > 0; i--) {
        const b1 = this.ornList[i];
        for (let j = i - 1; j >= 0; j--) {
          const b2 = this.ornList[j];
          if (b1.length !== b2.length) {
            continue;
          }
          if (equalsByteArrays(b1, 0, b2, 0, b1.length)) {
            this.ornList.splice(i, 1);
            this.replaceOrnamentInPatterns(i, j);
            this.renumberOrnamentsInPatterns(i);
            wasReplaced = true;
            duplicateOrnaments++;
            break;
          }
        }
        if (wasReplaced) {
          break;
        }
      }
    } while (wasReplaced);

    // prepare list of numbers of used ornaments
    let ornaments = this.getUsedInPatterns(true);

    // remove unused ornaments
    let unusedOrnaments = 0;
    if (ornaments.size < this.ornList.length - 1) {
      do {
        for (ornNum = this.ornList.length - 1; ornNum > 0; ornNum--) {
          if (ornaments.has(ornNum)) {
            continue;
          }
          unusedOrnaments++;
          this.ornList.splice(ornNum, 1);
          this.renumberOrnamentsInPatterns(ornNum);
          ornaments = renumberSet(ornaments, ornNum);
          break;
        }
      } while (ornNum > 0);
    }

    if (removedOrnaments > 0) {
      log?.(removedOrnaments + ' empty ornament(s) was removed.');
    }
    if (duplicateOrnaments > 0) {
      log?.(duplicateOrnaments + ' duplicated ornament(s) was removed.');
    }
    if (unusedOrnaments > 0) {
      log?.(unusedOrnaments + ' unused ornament(s) was removed.');
    }
  }

  /**
   * Method replaces one ornament by another.
   */
  private replaceOrnamentInPatterns(oldOrnNum: number, newOrnNum: number): void {
    this.patList?.forEach(patData => {
      for (let i = 0; i < patData.length; i++) {
        const t = patData[i];
        if ((t & 0x80) > 0) {
          // omit empty lines
          continue;
        }
        const s = patData[++i];
        if ((s & 0x20) > 0) {
          // omit only tone changes
          continue;
        }
        const o = patData[++i];
        const oi = i;
        if ((s & 0x80) > 0) {
          i++;
        }
        if ((o & 0xF0) > 0) {
          i++;
          if ((o & 0xF0) === 0xB0) {
            i++;
          }
        }

        if ((o & 0x0F) === oldOrnNum) {
          patData[oi] = (o & 0xF0) | newOrnNum;
        }
      }
    });
  }

  /**
   * Method to renumber ornaments, which have number greater than `ornNum`.
   */
  private renumberOrnamentsInPatterns(ornNum: number): void {
    this.patList?.forEach(patData => {
      for (let i = 0; i < patData.length; i++) {
        const t = patData[i];
        if ((t & 0x80) > 0) {
          // omit empty lines
          continue;
        }
        const s = patData[++i];
        if ((s & 0x20) > 0) {
          // omit only tone changes
          continue;
        }
        const o = patData[++i];
        const oi = i;
        if ((s & 0x80) > 0) {
          i++;
        }
        if ((o & 0xF0) > 0) {
          i++;
          if ((o & 0xF0) === 0xB0) {
            i++;
          }
        }

        if ((o & 0x0F) > ornNum) {
          patData[oi] = (o & 0xF0) | ((o & 0x0F) - 1);
        }
      }
    });
  }

  /**
   * Method removes duplicated, "empty" and unused patterns.
   */
  optimizePatterns(log?: (msg: string) => void) {
    if (!(this.patList?.length && this.posList?.length)) {
      return;
    }

    // remove "empty" patterns
    let removedPatterns = 0;
    let patNum = 0;
    do {
      for (patNum = this.patList.length - 1; patNum > 0; patNum--) {
        if (this.patList[patNum] == null) {
          this.patList.splice(patNum, 1);
          this.replacePatternInPositions(patNum, 0);
          this.renumberPatternsInPositions(patNum);
          removedPatterns++;
          break;
        }
      }
    } while (patNum > 0);

    // remove duplicated patterns
    let wasReplaced = false;
    let duplicatePatterns = 0;
    do {
      wasReplaced = false;
      for (let i = this.patList.length - 1; i > 0; i--) {
        const b1 = this.patList[i];
        for (let j = i - 1; j >= 0; j--) {
          const b2 = this.patList[j];
          if (b1.length !== b2.length) {
            continue;
          }
          if (equalsByteArrays(b1, 0, b2, 0, b1.length)) {
            this.patList.splice(i, 1);
            this.replacePatternInPositions(i, j);
            this.renumberPatternsInPositions(i);
            wasReplaced = true;
            duplicatePatterns++;
            break;
          }
        }
        if (wasReplaced) {
          break;
        }
      }
    } while (wasReplaced);

    // prepare list of numbers of used patterns
    let patterns = this.posList.reduce<Set<number>>(
      (set, posData) => {
        for (let i = 0; i < 6; i++) {
          const pn = posData[2 + i * 2];
          if (pn > 0) {
            set.add(pn);
          }
        }
        return set;
      }, new Set<number>());

    // remove unused patterns
    let unusedPatterns = 0;
    if (patterns.size < this.patList.length - 1) {
      do {
        for (patNum = this.patList.length - 1; patNum > 0; patNum--) {
          if (patterns.has(patNum)) {
            continue;
          }
          unusedPatterns++;
          this.patList.splice(patNum, 1);
          this.renumberPatternsInPositions(patNum);

          patterns = renumberSet(patterns, patNum);
          break;
        }
      } while (patNum > 0);
    }

    if (removedPatterns > 0) {
      log?.(removedPatterns + ' empty pattern(s) was removed.');
    }
    if (duplicatePatterns > 0) {
      log?.(duplicatePatterns + ' duplicated pattern(s) was removed.');
    }
    if (unusedPatterns > 0) {
      log?.(unusedPatterns + ' unused pattern(s) was removed.');
    }
  }

  /**
   * Method replaces one Pattern by another.
   */
  private replacePatternInPositions(oldPatNum: number, newPatNum: number): void {
    this.posList?.forEach(posData => {
      for (let i = 0; i < 6; i++) {
        const pn = 2 + i * 2;
        if (posData[pn] === oldPatNum) {
          posData[pn] = newPatNum;
        }
      }
    });
  }

  /**
   * Method to renumber Patterns, which have number greater than `patNum`.
   */
  private renumberPatternsInPositions(patNum: number): void {
    this.posList?.forEach(posData => {
      for (let i = 0; i < 6; i++) {
        const pn = 2 + i * 2;
        if (posData[pn] > patNum) {
          posData[pn] = posData[pn] - 1;
        }
      }
    });
  }

  /**
   * Method convert all Pattern data to plain objects of props and do pre-optimization,
   * so it removes repeating sample/ornament entries, volume or command changes.
   */
  preparePatternsAndPreoptimize(patterns: Pattern[]) {
    return patterns.map((pattern) => {
      if (!(pattern && pattern.end)) {
        return null;
      }
      let lastSmp = -1;
      let lastOrn = -1;
      let lastVol = -1;
      let lastCmd = -1;
      return {
        end: pattern.end,
        data: pattern.data.map((line) => {
          let {
            tone: ton, smp, orn,
            volume: { byte: vol },
            cmd, cmd_data: dat,
            release, orn_release
          } = line;
          if (release) {
            lastSmp = -1;
            lastOrn = -1;
            lastVol = -1;
            lastCmd = -1;
          }
          else {
            const o = orn_release ? -1 : orn;
            if (ton) {
              if (smp === lastSmp) {
                smp = 0;
              }
              else if (smp) {
                lastSmp = smp;
              }
              if (o === lastOrn) {
                orn = 0;
              }
              else if (orn || orn_release) {
                lastOrn = o;
              }
              lastCmd = -1;
            }
            else {
              if (smp) {
                lastSmp = smp;
                lastCmd = -1;
              }
              if (orn || orn_release) {
                lastOrn = o;
              }
            }
            if (vol === lastVol) {
              vol = 0;
            }
            else if (vol) {
              lastVol = vol;
            }
            const c = (cmd << 8) | dat;
            if (c === lastCmd) {
              cmd = 0;
              dat = 0;
            }
            else if (cmd) {
              lastCmd = c;
            }
          }
          return {
            ton, smp, orn,
            vol, cmd, dat,
            release, orn_release
          };
        })
      };
    });
  }
}
