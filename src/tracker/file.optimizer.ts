/**
 * SAA1099Tracker: Compiler optimizer
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

import { equalsByteArrays } from '../commons/binary';


const renumberSet = (set: Set<number>, index: number) =>
  new Set<number>(
    [...set].map(item => (item > index) ? item - 1 : item)
  );

export class FileOptimizer {
  // lists of byte arrays for compiled parts of the song
  smpList: Nullable<Array<Uint8Array>> = null;
  ornList: Nullable<Array<Uint8Array>> = null;
  patList: Nullable<Array<Uint8Array>> = null;
  posList: Nullable<Array<Uint8Array>> = null;

  /**
   * Prepare list of used Sample or Ornaments in patterns.
   */
  private getUsedInPatterns(ornaments: boolean = false) {
    return this.patList.reduce<Set<number>>(
      (set, patData) => {
        for (let i: number = 0; i < patData.length; i++) {
          const v = patData[i];
          if ((v & 0x80) > 0) {
            continue;
          }
          let s = patData[++i];
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
   * Method removes duplicated, "empty" and unused Samples.
   */
  optimizeSamples(log?: (msg: string) => void) {
    if (!(this.smpList?.length && this.patList?.length)) {
      return;
    }

    // remove "empty" Samples
    let removedSamples: number = 0;
    let smpNum: number = 0;
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

    // remove duplicated Samples
    let wasReplaced: boolean = false;
    let duplicateSamples: number = 0;
    do {
      wasReplaced = false;
      for (let i: number = this.smpList.length - 1; i > 0; i--) {
        const b1: Uint8Array = this.smpList[i];
        for (let j: number = i - 1; j >= 0; j--) {
          const b2: Uint8Array = this.smpList[j];
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

    // prepare list of used Sample numbers
    let samples = this.getUsedInPatterns();

    // remove unused Samples
    let unusedSamples: number = 0;
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
      log?.(removedSamples + ' empty Sample(s) was removed.');
    }
    if (duplicateSamples > 0) {
      log?.(duplicateSamples + ' duplicated Sample(s) was removed.');
    }
    if (unusedSamples > 0) {
      log?.(unusedSamples + ' unused Sample(s) was removed.');
    }
  }

  /**
   * Method replaces one Sample by another.
   */
  private replaceSampleInPatterns(oldSmpNum: number, newSmpNum: number) {
    this.patList?.forEach(patData => {
      for (let i: number = 0; i < patData.length; i++) {
        const v = patData[i];
        if ((v & 0x80) > 0) {
          continue;
        }
        const s = patData[++i];
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
   * Method to renumber Samples, which have number greater than `smpNum`.
   */
  private renumberSamplesInPatterns(smpNum: number): void {
    this.patList?.forEach(patData => {
      for (let i: number = 0; i < patData.length; i++) {
        const v = patData[i];
        if ((v & 0x80) > 0) {
          continue;
        }
        const s = patData[++i];
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
   * Method removes duplicated, "empty" and unused Ornaments.
   */
  optimizeOrnaments(log?: (msg: string) => void) {
    if (!(this.ornList?.length && this.patList?.length)) {
      return;
    }

    // remove "empty" Ornaments
    let removedOrnaments: number = 0;
    let ornNum: number = 0;
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

    // remove duplicated Ornaments
    let wasReplaced: boolean = false;
    let duplicateOrnaments: number = 0;
    do {
      wasReplaced = false;
      for (let i: number = this.ornList.length - 1; i > 0; i--) {
        const b1: Uint8Array = this.ornList[i];
        for (let j: number = i - 1; j >= 0; j--) {
          const b2: Uint8Array = this.ornList[j];
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

    // prepare list of numbers of used Ornaments
    let ornaments = this.getUsedInPatterns(true);

    // remove unused Ornaments
    let unusedOrnaments: number = 0;
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
      log?.(removedOrnaments + ' empty Ornament(s) was removed.');
    }
    if (duplicateOrnaments > 0) {
      log?.(duplicateOrnaments + ' duplicated Ornament(s) was removed.');
    }
    if (unusedOrnaments > 0) {
      log?.(unusedOrnaments + ' unused Ornament(s) was removed.');
    }
  }

  /**
   * Method replaces one Ornament by another.
   */
  private replaceOrnamentInPatterns(oldOrnNum: number, newOrnNum: number): void {
    this.patList?.forEach(patData => {
      for (let i: number = 0; i < patData.length; i++) {
        const v = patData[i];
        if ((v & 0x80) > 0) {
          continue;
        }
        const s = patData[++i];
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
   * Method to renumber Ornaments, which have number greater than `ornNum`.
   */
  private renumberOrnamentsInPatterns(ornNum: number): void {
    this.patList?.forEach(patData => {
      for (let i: number = 0; i < patData.length; i++) {
        const v: number = patData[i];
        if ((v & 0x80) > 0) {
          continue;
        }
        const s: number = patData[++i];
        const o: number = patData[++i];
        const oi: number = i;
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
   * Method removes duplicated, "empty" and unused Patterns.
   */
  optimizePatterns(log?: (msg: string) => void) {
    if (!(this.patList?.length && this.posList?.length)) {
      return;
    }

    // remove "empty" Patterns
    let removedPatterns: number = 0;
    let patNum: number = 0;
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

    // remove duplicated Patterns
    let wasReplaced: boolean = false;
    let duplicatePatterns: number = 0;
    do {
      wasReplaced = false;
      for (let i: number = this.patList.length - 1; i > 0; i--) {
        const b1: Uint8Array = this.patList[i];
        for (let j: number = i - 1; j >= 0; j--) {
          const b2: Uint8Array = this.patList[j];
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

    // prepare list of numbers of used Patterns
    let patterns = this.posList.reduce<Set<number>>(
      (set, posData) => {
        for (let i: number = 0; i < 6; i++) {
          const pn: number = posData[2 + i * 2];
          if (pn > 0) {
            set.add(pn);
          }
        }
        return set;
      }, new Set<number>());

    // remove unused Patterns
    let unusedPatterns: number = 0;
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
      log?.(removedPatterns + ' empty Pattern(s) was removed.');
    }
    if (duplicatePatterns > 0) {
      log?.(duplicatePatterns + ' duplicated Pattern(s) was removed.');
    }
    if (unusedPatterns > 0) {
      log?.(unusedPatterns + ' unused Pattern(s) was removed.');
    }
  }

  /**
   * Method replaces one Pattern by another.
   */
  private replacePatternInPositions(oldPatNum: number, newPatNum: number): void {
    this.posList?.forEach(posData => {
      for (let i: number = 0; i < 6; i++) {
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
      for (let i: number = 0; i < 6; i++) {
        const pn = 2 + i * 2;
        if (posData[pn] > patNum) {
          posData[pn] = posData[pn] - 1;
        }
      }
    });
  }
}
