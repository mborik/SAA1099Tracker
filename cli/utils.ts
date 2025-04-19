/**
 * SAA1099Tracker: CLI tool utilities.
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

import { devLog } from '../src/commons/dev';
import { validateAndClamp } from '../src/commons/number';
import Player from '../src/player/Player';
import constants from '../src/tracker/constants';

export interface STMFileFormat {
  title: string;
  author: string;

  samples: any[];
  ornaments: any[];
  patterns: any[];
  positions: any[];
  repeatPos: number;

  current: {
    sample: number;
    ornament: number;
    ornSample: number;
    smpornTone: number;
    position: number;
    pattern: number;
    line: number;
    channel: number;
    column: number;
  };
  ctrl: {
    octave: number;
    sample: number;
    ornament: number;
    rowStep: number;
  };
  config: {
    interrupt: number;
    activeTab: number;
    editMode: boolean;
    loopMode: boolean;
  };

  version: string;
}

/**
 * This method can parse input JSON with song data
 * in current SAA1099Tracker format specification.
 * @param input {STMFileFormat|string} Song data in JSON.
 * @param player {Player} Player instance.
 * @param tracker {any} Dummy tracker instance.
 */
export const parseJSON = (
  input: STMFileFormat | string,
  player: Player,
  tracker: any
): boolean => {

  let data: STMFileFormat;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);

      if (typeof data !== 'object') {
        return false;
      }
    }
    catch (e) {
      return false;
    }
  }
  else if (typeof input === 'object') {
    data = input;
  }
  else {
    return false;
  }

  // detection of old JSON format v1.1 from previous project MIF85Tracker...
  if (!data.version || (data.version && data.version !== constants.CURRENT_FILE_VERSION)) {
    return false;
  }

  tracker.songTitle = data.title || '';
  tracker.songAuthor = data.author || '';

  const count = { smp: 0, orn: 0, pat: 0, pos: 0 };

  //~~~ SAMPLES ~~~
  if (data.samples && data.samples.length) {
    for (let i: number = 1, obj: any; i < 32; i++) {
      if ((obj = data.samples[i - 1])) {
        const it = player.samples[i];

        if (obj.name) {
          it.name = obj.name;
        }

        it.loop = obj.loop || 0;
        it.end = obj.end || 0;
        it.releasable = !!obj.rel;

        if (obj.data != null) {
          it.parse(obj.data);
        }

        count.smp++;
      }
    }
  }

  //~~~ ORNAMENTS ~~~
  if (data.ornaments && data.ornaments.length) {
    for (let i: number = 1, obj: any; i < 16; i++) {
      if ((obj = data.ornaments[i - 1])) {
        const it = player.ornaments[i];

        if (obj.name) {
          it.name = obj.name;
        }

        it.loop = obj.loop || 0;
        it.end = obj.end || 0;

        if (obj.data != null) {
          it.parse(obj.data);
        }

        count.orn++;
      }
    }
  }

  //~~~ PATTERNS ~~~
  if (data.patterns) {
    data.patterns.forEach(obj => {
      const newIdx = player.addNewPattern();
      const it = player.patterns[newIdx];
      it.end = obj.end || 0;

      if (obj.data != null) {
        it.parse(obj.data);
      }

      count.pat++;
    });
  }

  //~~~ POSITIONS ~~~
  if (data.positions) {
    data.positions.forEach((obj, i) => {
      const it = player.addNewPosition(obj.length, obj.speed);

      for (let k: number = 0; k < 6; k++) {
        const s: string = obj.ch[k];
        it.ch[k].pattern = parseInt(s.slice(0, 3), 10) || 0;
        it.ch[k].pitch = parseInt(s.slice(3), 10) || 0;
      }

      player.countPositionFrames(i);
      player.storePositionRuntime(i);
      count.pos++;
    });
  }

  //~~~ CURRENT STATE ~~~
  player.repeatPosition = validateAndClamp({
    value: data.repeatPos as any,
    initval: 0,
    min: 0, max: data.positions.length - 1
  });

  tracker.settings.audioInterrupt = data.config.interrupt === 32 ? 32 : 50;

  devLog('CLI', 'JSON file successfully parsed and loaded...', JSON.stringify({
    title: data.title,
    author: data.author,
    samples: count.smp,
    ornaments: count.orn,
    patterns: count.pat,
    positions: count.pos,
    repeatPos: data.repeatPos,
    interrupt: data.config.interrupt,
    version: data.version
  }, null, 2));

  return true;
};

export const calculateDuration = (player: Player) => {
  if (!player.positions.length) {
    return 0;
  }

  let total = 0;
  player.positions.forEach((p) => {
    total += p.frames[p.length];
  });
  return total;
};
