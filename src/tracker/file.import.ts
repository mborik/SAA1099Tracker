/**
 * SAA1099Tracker: File base class with all imports of various file formats.
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

import { bytesToString } from '../commons/binary';
import { devLog } from '../commons/dev';
import { MAX_PATTERN_LEN } from '../player/globals';
import Pattern from '../player/Pattern';
import Position from '../player/Position';
import constants from './constants';
import { STMFile, STMFileFormat } from './file';
import { binarytype } from './file.system';


const calcSoundchipWaveform = (n: number) => {
  if (n > 0 && n <= 0xC) {
    let value = (n - 1) % 6;
    switch (value) {
      case 0: value = 0xA; break;
      case 1: value = 0xE; break;
      case 2: value = 0xC; break;
      case 3: value = 0x2; break;
      case 4: value = 0x6; break;
      case 5: value = 0x4; break;
    }
    if (n > 6) {
      value++;
    }
    n = value | 0x10;
  }
  else {
    n = 0xD0;
  }
  return n;
};

export class File extends STMFile {
  private _messageLogger: string = '';
  private _log(str: string, error: boolean = false) {
    this._messageLogger += `${error ? 'ERROR: ' : ''}${str}\n`;
    $('#documodal .modal-body > pre').text(`\n${this._messageLogger}`);
  }

  private _openOutputLog() {
    this._messageLogger = '';

    const keys = this._parent.globalKeyState;

    const dialog = $('#documodal');
    const button = $('<button/>').attr({
      'type': 'button',
      'class': 'close',
      'data-dismiss': 'modal'
    }).text('\xd7');

    dialog.on('shown.bs.modal', () => {
      keys.inDialog = true;
    }).on('hidden.bs.modal', () => {
      $(dialog).off().find('.modal-body').empty();
      keys.inDialog = false;
    });

    dialog.modal('show')
      .find('.modal-body')
      .html('<pre>\n</pre>')
      .scrollTop(0)
      .prepend(button);
  }

  private _resetAfterImport() {
    this.modified = true;
    this.yetSaved = false;
    this.fileName = '';
    this._parent.settings.lastLoadedFileNumber = undefined;
  }

  importDemosong(songName: string, url: string) {
    devLog('Tracker.file', 'Loading "%s" demosong...', songName);
    fetch(url)
      .then((response) => response.json())
      .then((data: STMFileFormat) => {
        if (!this.parseJSON(data)) {
          devLog('Tracker.file', 'JSON file parsing failed!');
          throw 'JSON parsing failed!';
        }
        this._resetAfterImport();
      })
      .catch((error: string) => {
        $('#dialog').confirm({
          title: 'File import error',
          text: error,
          buttons: 'ok',
          style: 'danger'
        });
      });
  }

  importFile() {
    this.system.load(false, `.STMF,${constants.MIMETYPE}`)
      .then((data: string) => {
        devLog('Tracker.file', 'File loaded, trying to parse...');
        if (!this.parseJSON(data)) {
          devLog('Tracker.file', 'JSON file parsing failed!');
          throw 'JSON parsing failed!';
        }
        this._resetAfterImport();
      })
      .catch((error: string) => {
        $('#dialog').confirm({
          title: 'File import error',
          text: error,
          buttons: 'ok',
          style: 'danger'
        });
      });
  }

  importETracker() {
    this.system.load(true, '.M,.cop,.etc,.sng,.bin')
      .then(({ data, fileName }: binarytype) => {
        devLog('Tracker.file', `File "${fileName}" loaded, length ${data.length}...`);
        const title = fileName.slice(0, fileName.lastIndexOf('.')).trim();
        if (data.length === 78626) {
          this._processETrkModule(data, title);
        }
        else if (data.length < 16384) {
          this._processETrkCompiled(data, title);
        }
        else {
          throw 'Unknown file format!';
        }

        const settings = this._parent.settings;
        if (settings.audioInterrupt !== 50) {
          settings.audioInterrupt = 50;
          settings.audioInit();
        }
      })
      .catch((error: string) => {
        $('#dialog').confirm({
          title: 'File import error',
          text: error,
          buttons: 'ok',
          style: 'danger'
        });
      });
  }

  private _processETrkModule(data: Uint8Array, title: string = '') {
    const tracker = this._parent;
    const player = tracker.player;

    const count = { smp: 0, orn: 0, pat: 0, pos: 0 };

    devLog('Tracker.file', 'Converting E-Tracker module...');
    this._openOutputLog();
    this._log(`E-Tracker module: ${title}`);

    this.new(false);

    // sample data pointer
    let ptr = 0xB322;
    for (let smp = 1, smpInfoPtr = 0; smp < 32; smp++, smpInfoPtr += 4) {
      const [ loopEnd, loopStart, fixedLen ] = data.slice(smpInfoPtr, smpInfoPtr + 3);
      if (fixedLen && fixedLen < loopEnd) {
        this._log(`Sample-${smp} length [${loopStart}<${loopEnd}<${fixedLen}] is invalid!`);
      }
      else if (loopEnd && loopStart > loopEnd) {
        this._log(`Loop region [${loopEnd},${loopStart}] of Sample-${smp} is invalid!`);
      }

      const sample = player.samples[smp];
      if (loopEnd < fixedLen) {
        if (loopStart) {
          sample.end = loopEnd + 1;
          sample.loop = loopStart;
          sample.releasable = true;
        }
        else {
          sample.end = sample.loop = fixedLen + 1;
        }
      }
      else if (!loopStart && !loopEnd) {
        sample.end = sample.loop = 0;
      }
      else {
        sample.end = loopEnd + 1;
        sample.loop = loopStart;
      }

      for (let x = 0; x < 256; x++, ptr += 4) {
        sample.data[x].volume.byte = data[ptr + 0];
        sample.data[x].noise_value = data[ptr + 1] & 3;
        sample.data[x].enable_freq = !!(data[ptr + 1] & 4);
        sample.data[x].enable_noise = !!(data[ptr + 1] & 8);

        sample.data[x].shift = (((data[ptr + 3] & 7) << 8) | data[ptr + 2]);
        sample.data[x].shift *= ((data[ptr + 3] & 0x80) ? -1 : 1);
      }

      if (sample.end > 0) {
        count.smp++;
      }
    }

    this._log(`Samples imported. Total in use: ${count.smp}`);

    // (re)numbering ornaments
    const ornNumbering = Array(32).fill(0);

    // ornaments data pointer
    ptr = 0x9322;
    for (let orn = 1, ornInfoPtr = (32 * 4); orn < 32; orn++, ornInfoPtr += 4, ptr += 256) {
      const ornamentData = data.slice(ptr, ptr + 256);
      if (!ornamentData.find(value => value > 0)) {
        ornNumbering[orn] = 0;
        continue;
      }

      ornNumbering[orn] = orn;

      let ornNum = orn;
      if (orn >= 16 && ornNumbering[orn]) {
        let findEmpty = 1;
        for (; findEmpty < 16; findEmpty++) {
          if (!ornNumbering[findEmpty]) {
            ornNumbering[orn] = ornNumbering[findEmpty] = ornNum = findEmpty;
            this._log(`Ornament-${orn} can't fit our format, renumbered to ${findEmpty}...`);
            break;
          }
        }
        if (findEmpty >= 16) {
          this._log(`Ornament-${orn} can't fit our format, out of space!`, true);
          ornNumbering[orn] = 0;
          continue;
        }
      }

      const [ loopEnd, loopStart, fixedLen ] = data.slice(ornInfoPtr, ornInfoPtr + 3);
      if (loopEnd && fixedLen) {
        this._log(`Ornament-${orn} length [${loopEnd} | ${fixedLen}] is invalid!`);
      }
      else if (loopEnd && loopStart > loopEnd) {
        this._log(`Loop region [${loopEnd},${loopStart}] of Ornament-${orn} is invalid!`);
      }

      const ornament = player.ornaments[ornNum];
      ornament.end = (loopEnd | fixedLen) + 1;
      ornament.loop = fixedLen ? (fixedLen + 1) : loopStart;
      ornament.data.set(ornamentData);

      count.orn++;
    }

    this._log(`Ornaments imported. Total in use: ${count.orn}`);

    // patterns data pointer
    ptr = 0x322;
    // patterns lengths pointer
    let lens = 0x300;

    const lastorn = Array(6);
    const lastvol = Array(6).fill(0);
    const ePatterns: Position[] = [];

    for (let pat = 0; pat < 32; pat++) {
      const patLen = data[lens++];
      let patSpeed = 6;

      const pt = [...Array(6)].map(() => new Pattern(64));
      lastorn.fill(-1);

      for (let line = 0; line < 64; line++) {
        for (let chn = 0; chn < 6; chn++, ptr += 3) {
          const tone = data[ptr] & 0xf;
          const octave = (data[ptr] & 0x70) >> 4;
          const sample = ((data[ptr + 1] & 0xf0) >> 4) | ((data[ptr] & 0x80) >> 3);
          const ornament = ((data[ptr + 2] & 0x80) >> 3) | (data[ptr + 1] & 0x0f);

          if (tone < 12) {
            pt[chn].data[line].tone = (octave * 12) + tone + 1;
          }
          else {
            pt[chn].data[line].tone = 0;
          }

          pt[chn].data[line].smp = (sample + 1) % 32;

          if (ornament === 31) {
            pt[chn].data[line].orn = 0;
          }
          else if (ornament >= 15 || !ornNumbering[ornament + 1]) {
            if (lastorn[chn]) {
              pt[chn].data[line].orn_release = true;
            }
            pt[chn].data[line].orn = lastorn[chn] = 0;
          }
          else {
            pt[chn].data[line].orn = lastorn[chn] = ornNumbering[ornament + 1];
          }

          let c = (data[ptr + 2] & 0x70) >> 4;
          let cd = data[ptr + 2] & 0x0f;

          if (lastvol[chn] < 0xff && pt[chn].data[line].tone) {
            pt[chn].data[line].volume.byte = lastvol[chn] = 0xff;
          }

          switch (c) {
            case 0x0:
              break;
            case 0x1: // soundchip waveform function
              c = 0x0E;
              cd = calcSoundchipWaveform(cd);
              break;

            case 0x2: // exchange stereo of sample
              c = 0x0C;
              cd |= 0xF0;
              break;

            case 0x3: // set speed
              if (line === 0) {
                patSpeed = cd;
                c = cd = 0;
              }
              else {
                c = 0x0f;
              }
              break;

            case 0x4: // set volume
              cd = (cd | (cd << 4)) ^ 0xff;
              pt[chn].data[line].volume.byte = lastvol[chn] = cd;
              c = cd = 0;
              break;

            case 0x5: // soundchip noise function
              c = 0x0E;
              cd = (cd & 1) ? 0x23 : 0x24;
              break;

            case 0x6: // release
              pt[chn].data[line].release = true;
              pt[chn].data[line].tone = 0;
              pt[chn].data[line].smp = 0;
              pt[chn].data[line].orn = 0;
              c = cd = 0;
              break;

            default:
              this._log(`Unexpected command ${
                ((c << 4) || cd).toString(16).toUpperCase()
              } on line ${line}, channel ${chn} of pattern ${pat}!`);
              break;
          }

          pt[chn].data[line].cmd = c;
          pt[chn].data[line].cmd_data = cd;
        }
      }

      const pa = new Position(patLen, patSpeed);
      for (let chn = 0; chn < 6; chn++) {
        const totalPatterns = player.patterns.length;
        let newPattern = 0;
        for (; newPattern < totalPatterns; newPattern++) {
          if (player.patterns[newPattern].data.every(
            (lineA, index) => {
              const lineB = pt[chn].data[index];
              return (
                lineA.tone === lineB.tone &&
                lineA.release === lineB.release &&
                lineA.smp === lineB.smp &&
                lineA.orn === lineB.orn &&
                lineA.orn_release === lineB.orn_release &&
                lineA.volume.byte === lineB.volume.byte &&
                lineA.cmd === lineB.cmd &&
                lineA.cmd_data === lineB.cmd_data
              );
            }
          )) {
            break;
          }
        }

        pt[chn].end = patLen;
        pa.ch[chn].pattern = newPattern;
        if (newPattern === totalPatterns) {
          pt[chn].updateTracklist();
          player.patterns.push(pt[chn]);
          count.pat++;
        }
      }

      ePatterns.push(pa);
    }

    this._log(`Patterns imported:
      - total E-Tracker ${ePatterns.length} patterns
      - parsed to ${count.pat} unique channel-patterns`);

    // positions data pointer
    ptr = 0x100;

    const totalPositions = data[lens++];
    for (let i = 0; i < totalPositions; i++, ptr += 2) {
      const source = ePatterns[data[ptr]];
      const dest = player.addNewPosition(source.length, source.speed);
      dest.ch.forEach((ch, index) => {
        ch.pattern = source.ch[index].pattern;
      });

      player.countPositionFrames(i);
      player.storePositionRuntime(i);
      count.pos++;
    }

    player.repeatPosition = data[lens];

    this._log(`Positions imported: Total ${totalPositions}, repeat ${player.repeatPosition}`);
    devLog('Tracker.file', 'E-Tracker module successfully loaded... %o', {
      title,
      samples: count.smp,
      ornaments: count.orn,
      patterns: count.pat,
      positions: count.pos,
    });

    tracker.songTitle = title;
    tracker.songAuthor = '[E-Tracker module import]';

    this.modified = true;
    this._updateAll();
  }

  private _processETrkCompiled(data: Uint8Array, title: string = '') {
    const tracker = this._parent;
    const player = tracker.player;

    let [songPtr, patPtr, smpPtr, ornPtr, infoPtr] = new Uint16Array(data.slice(0, 10).buffer);
    if (
      songPtr >= data.length ||
      patPtr >= data.length ||
      smpPtr >= data.length ||
      ornPtr >= data.length ||
      infoPtr >= data.length ||
      smpPtr >= ornPtr ||
      ornPtr >= infoPtr ||
      infoPtr >= songPtr ||
      songPtr >= patPtr
    ) {
      throw 'File is not a E-Tracker compilation format!';
    }

    const count = { smp: 0, orn: 0, pat: 0, pos: 0 };

    devLog('Tracker.file', 'Converting E-Tracker compilation...');
    this._openOutputLog();
    this._log(`E-Tracker compilation: ${title}`);

    this.new(false);

    if (bytesToString(data.slice(10, 30)) !== 'ETracker (C) BY ESI.') {
      this._log('Missing E-Tracker signature in file header!', true);
    }

    const volRepeatMapper = {};
    for (let v = infoPtr + 1; data[v]; v += 2) {
      if (data[v]) {
        volRepeatMapper[data[v]] = data[v + 1];
      }
    }

    for (let smp = 1; smpPtr < ornPtr; smp++, smpPtr += 2) {
      const sample = player.samples[smp];

      let i = 0;
      let loopPos = -1;
      let baseCounter = 1;
      let volRepeats = 1;
      let shift = 0;
      let lastvol = -1;
      let noise_value = 0;
      let enable_freq = false;
      let enable_noise = false;
      let ptr = data[smpPtr] + data[smpPtr + 1] * 256;

      const volCycle = () => {
        sample.data[i].enable_freq = enable_freq;
        sample.data[i].enable_noise = enable_noise;
        sample.data[i].noise_value = noise_value;
        sample.data[i].shift = shift;

        if (!(--volRepeats)) {
          const d = data[ptr++];
          if (d === data[infoPtr]) {
            volRepeats = data[ptr++];
            lastvol = data[ptr++];
          }
          else if (volRepeatMapper[d]) {
            volRepeats = volRepeatMapper[d];
            lastvol = data[ptr++];
          }
          else {
            volRepeats = 1;
            lastvol = d;
          }
        }
        sample.data[i++].volume.byte = lastvol;
      };

      const readParams = (): boolean => {
        let d = data[ptr++];
        const flag = !!(d & 1);
        d >>= 1;
        if (flag) {
          noise_value = d & 0x60;
          enable_freq = !!(d & 8);
          enable_noise = !!(d & 16);

          shift = (((d & 7) << 8) | data[ptr++]);
          if (shift >= 1024) {
            shift = shift - 2048;
          }
          volCycle();
          return true;
        }
        else {
          if (d === 0x7f) {
            loopPos = i;
            return true;
          }
          else if (d === 0x7e) {
            sample.loop = (loopPos < 0) ? i : loopPos;
            sample.end = i;
            return false;
          }
          baseCounter = d + 2;
          return readParams();
        }
      };

      do {
        if (--baseCounter) {
          volCycle();
        }
        else {
          baseCounter = 1;
          if (!readParams()) {
            break;
          }
        }
      } while (true);

      count.smp++;
    }

    this._log(`Samples imported. Total in use: ${count.smp}`);

    // (re)numbering ornaments
    const ornNumbering = Array(32).fill(0);
    for (let orn = 1; ornPtr < infoPtr; orn++, ornPtr += 2) {
      if (orn >= 16) {
        this._log(`Ornament-${orn} can't fit our format, out of space!`, true);
        ornNumbering[orn] = 0;
        continue;
      }

      ornNumbering[orn] = orn;
      const ornament = player.ornaments[orn];

      let i = 0;
      let loopPos = -1;
      let copyTicks = 1;
      let ptr = data[ornPtr] + data[ornPtr + 1] * 256;

      do {
        const d = data[ptr++];
        if (d === 0xFF) {
          if (i === 1 && loopPos < 0 && ornament.data[0] === 0) {
            ornNumbering[orn] = 0;
            break;
          }
          ornament.loop = (loopPos < 0) ? i : loopPos;
          ornament.end = i;
          break;
        }
        if (d === 0xFE) {
          loopPos = i;
          continue;
        }
        if (d >= 0x60) {
          copyTicks = d - (0x60 - 2);
          continue;
        }
        while (copyTicks--) {
          ornament.data[i++] = (d >= 24) ? (d - 48) : d;
        }
        copyTicks = 1;
      } while (true);

      count.orn++;
    }

    this._log(`Ornaments imported. Total in use: ${count.orn}`);

    const positions = [];

    let height = 0;
    do {
      const d = data[songPtr++];
      if (d === 0xFF) {
        break;
      }
      if (d === 0xFE) {
        player.repeatPosition = count.pos;
        continue;
      }
      if (d >= 0x60) {
        height = d - 0x61;
        continue;
      }
      positions.push({
        height,
        ePattern: Math.floor(d / 3)
      });
    } while (true);

    const patCount = positions.reduce((max, { ePattern }) => Math.max(max, ePattern), 0) + 1;
    this._log(`Found ${patCount} of E-Tracker patterns in ${positions.length} positions`);

    const lastorn = Array(6);
    const ePatterns = [...Array(patCount)].map(
      () => {
        let patSpeed = 6;
        let patLen = 0;

        const pa = new Position(patLen, patSpeed);
        const pt = [...Array(6)].map(() => new Pattern());
        lastorn.fill(-1);

        for (let chn = 0; chn < 6; chn++) {
          let ptr = data[patPtr] + data[patPtr + 1] * 256;
          patPtr += 2;

          for (let line = 0, ptLineDat = pt[chn].data[line]; line < MAX_PATTERN_LEN;) {
            let v = data[ptr++];

            if (v < 15) { // [#00-#0f] set speed
              v++;
              if (line === 0) {
                patSpeed = v;
              }
              else {
                ptLineDat.cmd = 0x0F;
                ptLineDat.cmd_data = v;
              }
              continue;
            }

            v -= 15;
            if (v < 2) { // [#0f-#10] soundchip noise function
              ptLineDat.cmd = 0xE;
              ptLineDat.cmd_data = v ? 0x23 : 0x24;
              continue;
            }

            v -= 2;
            if (v < 16) { // [#11-#20] set volume
              v = (v | (v << 4)) ^ 0xff;
              ptLineDat.volume.byte = v;
              continue;
            }

            v -= 16;
            if (v < 13) { // [#21-#2d] soundchip waveform function
              ptLineDat.cmd = 0xE;
              ptLineDat.cmd_data = calcSoundchipWaveform(v);
              continue;
            }

            v -= 13;
            if (v < 2) { // [#2e-#2f] exchange stereo of sample
              ptLineDat.cmd = 0xC;
              ptLineDat.cmd_data = v | 0xF0;
              continue;
            }

            v -= 2;
            if (v < 31) { // [#30-#4f] ornament
              if (v >= 15 || !ornNumbering[v + 1]) {
                if (lastorn[chn]) {
                  ptLineDat.orn_release = true;
                }
                ptLineDat.orn = lastorn[chn] = 0;
              }
              else {
                ptLineDat.orn = lastorn[chn] = ornNumbering[v + 1];
              }
              continue;
            }
            else if (v === 31) {
              ptLineDat.orn = 0;
              continue;
            }
            else if (v === 32) { // [#50] release
              ptLineDat.release = true;
              ptLineDat.tone = 0;
              ptLineDat.smp = 0;
              ptLineDat.orn = 0;
              continue;
            }

            v -= 34;
            if (v < 0) { // [#51] break channel
              pt[chn].end = line;
              patLen = Math.max(patLen, line);
              break;
            }
            else if (v < 31) { // [#52-#71] set sample
              ptLineDat.smp = v + 1;
              continue;
            }
            else if (v === 31) {
              ptLineDat.smp = 0;
              continue;
            }

            v -= 32;
            if (v < 96) { // [#72-#d2] set note
              ptLineDat.tone = v + 1;
              continue;
            }

            line += v - 95; // [#d2-#ff] skip lines
            ptLineDat = pt[chn].data[line];
          }

          const totalPatterns = player.patterns.length;
          let newPattern = 0;
          for (; newPattern < totalPatterns; newPattern++) {
            if (player.patterns[newPattern].data.every(
              (lineA, index) => {
                const lineB = pt[chn].data[index];
                return (
                  lineA.tone === lineB.tone &&
                  lineA.release === lineB.release &&
                  lineA.smp === lineB.smp &&
                  lineA.orn === lineB.orn &&
                  lineA.orn_release === lineB.orn_release &&
                  lineA.volume.byte === lineB.volume.byte &&
                  lineA.cmd === lineB.cmd &&
                  lineA.cmd_data === lineB.cmd_data
                );
              }
            )) {
              break;
            }
          }

          pa.ch[chn].pattern = newPattern;
          if (newPattern === totalPatterns) {
            pt[chn].updateTracklist();
            player.patterns.push(pt[chn]);
            count.pat++;
          }
        }

        pa.length = patLen;
        pa.speed = patSpeed;

        return pa;
      }
    );

    this._log(`Patterns imported to ${count.pat} unique channel-patterns`);

    for (let i = 0; i < positions.length; i++) {
      const source = ePatterns[positions[i].ePattern];
      const dest = player.addNewPosition(source.length, source.speed);
      const pitch = positions[i].height;
      dest.ch.forEach((ch, index) => {
        ch.pattern = source.ch[index].pattern;
        ch.pitch = pitch;
      });

      player.countPositionFrames(i);
      player.storePositionRuntime(i);
      count.pos++;
    }

    devLog('Tracker.file', 'E-Tracker compilation successfully loaded... %o', {
      title,
      samples: count.smp,
      ornaments: count.orn,
      patterns: count.pat,
      positions: count.pos,
    });

    tracker.songTitle = title;
    tracker.songAuthor = '[E-Tracker compilation import]';

    this.modified = true;
    this._updateAll();
  }
}
