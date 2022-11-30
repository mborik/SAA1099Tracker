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

import { devLog } from '../commons/dev';
import Pattern from '../player/Pattern';
import Position from '../player/Position';
import constants from './constants';
import { STMFile, STMFileFormat } from './file';
import { binarytype } from './file.system';


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
    this.system.load(true, '.M,.cop,.bin,application/octet-stream')
      .then(({ data, fileName }: binarytype) => {
        devLog('Tracker.file', `File "${fileName}" loaded, length ${data.length}...`);
        const title = fileName.slice(0, fileName.lastIndexOf('.')).trim();
        if (data.length === 78626) {
          this._processETrkModule(data, title);
        }
        else {
          throw 'File is not a E-Tracker module format!';
          // TODO Implement compiled E-Tracker format
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

      const pt: Pattern[] = [...Array(6)].map(() => new Pattern(64));
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
          else if (ornament >= 16 || !ornNumbering[ornament + 1]) {
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
              if (cd > 0 && cd <= 0xC) {
                let value = (cd - 1) % 6;
                switch (value) {
                  case 0: value = 0xA; break;
                  case 1: value = 0xE; break;
                  case 2: value = 0xC; break;
                  case 3: value = 0x2; break;
                  case 4: value = 0x6; break;
                  case 5: value = 0x4; break;
                }

                if (cd > 6) {
                  value++;
                }
                cd = value | 0x10;
              }
              else {
                cd = 0xD0;
              }
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
              cd = 0x20 | (cd & 1) | ((cd & 1) << 1);
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

      count.pos++;
    }

    player.repeatPosition = data[lens];
    player.countPositionFrames();

    this._log(`Positions imported: Total ${totalPositions}, repeat ${player.repeatPosition}`);
    devLog('Tracker.file', 'E-Tracker module successfully loaded... %o', {
      title,
      samples: count.smp,
      ornaments: count.orn,
      patterns: count.pat,
      positions: count.pos,
    });

    tracker.songTitle = title;
    tracker.songAuthor = 'E-Tracker module import';

    this.modified = true;
    this._updateAll();
  }
}
