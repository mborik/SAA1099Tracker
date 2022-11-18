/**
 * SAA1099Tracker: Compiler
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

import pick from 'lodash.pick';
import { bytesToString, stringToBytes, writeWordLE } from '../commons/binary';
import { devLog } from '../commons/dev';
import { toHex } from '../commons/number';
import constants from './constants';
import { FileOptimizer } from './file.optimizer';
import Tracker from '.';


declare interface JQueryInputEvent {
  currentTarget: HTMLInputElement;
}

const enum PlayerPlatform { Z80 = 0, I8080 = 1, I8080PP = 2 }
const enum PlayerType { AUTODETECT = -1, V0 = 0, V1 = 1, V2 = 2, V3 = 3 }

interface CompilerOptions {
  includePlayer: boolean;
  playerPlatform: PlayerPlatform;
  playerAddressByPlatform: number[];
  playerType: PlayerType;
  playerRepeat: boolean;
  songHeader: boolean;
  hexPlayerAddress: boolean;
  verbose: boolean;
}

const getConfigProps = (obj: any) => pick(obj, [
  'includePlayer',
  'playerPlatform',
  'playerAddressByPlatform',
  'playerType',
  'playerRepeat',
  'songHeader',
  'hexPlayerAddress',
  'verbose'
]);

export default class FileCompiler extends FileOptimizer implements CompilerOptions {
  private dialog: JQuery = null;
  private messageLogger: string = '';

  includePlayer: boolean = true;
  playerPlatform: PlayerPlatform = PlayerPlatform.Z80;
  playerAddressByPlatform: number[] = [ 49152, 4096, 16384 ];
  playerType: PlayerType = PlayerType.AUTODETECT;
  playerRepeat: boolean = true;
  songHeader: boolean = true;
  hexPlayerAddress: boolean = false;
  verbose: boolean = true;

  constructor(private _parent: Tracker) {
    super();
  }

  get playerAddress() {
    return this.playerAddressByPlatform[this.playerPlatform as number];
  }
  set playerAddress(address: number) {
    this.playerAddressByPlatform[this.playerPlatform as number] = address;
  }

  private init() {
    this.dialog = $('#compiler');

    try {
      const input = localStorage.getItem(constants.COMPILER_SETTINGS_KEY) || '{}';
      const userOptions = JSON.parse(input);
      Object.assign(this, userOptions);
    }
    catch (e) {}

    devLog('Tracker.compiler', 'Settings fetched from localStorage %o...', getConfigProps(this));

    this.populateElements();
  }

  private populateElements() {
    $('#chIncludePlayer')
      .prop('checked', this.includePlayer)
      .change((e: JQueryInputEvent) => {
        this.includePlayer = !!e.currentTarget.checked;
        this.onIncludePlayerChanged();
        return true;
      });

    $(`#rdPlayerPlatform${this.playerPlatform}`).prop('checked', true);
    $(`#rdPlayerType${this.playerType < 0 ? 'Auto' : `V${this.playerType}`}`).prop('checked', true);

    $('input[name=rdPlayerPlatform]').change((e: JQueryInputEvent) => {
      this.onPlayerAddressChanging();
      this.playerPlatform = +e.currentTarget.value;
      this.onPlayerAddressChanged();
    });
    $('input[name=rdPlayerType]').change( (e: JQueryInputEvent) => {
      this.playerType = +e.currentTarget.value;
    });

    $('#chPlayerRepeat')
      .prop('checked', this.playerRepeat)
      .change((e: JQueryInputEvent) => {
        this.playerRepeat = !!e.currentTarget.checked;
      });

    $('#chSongHeader')
      .prop('checked', this.songHeader)
      .change((e: JQueryInputEvent) => {
        this.songHeader = !!e.currentTarget.checked;
      });

    $('#chVerbose')
      .prop('checked', this.verbose)
      .change((e: JQueryInputEvent) => {
        this.verbose = !!e.currentTarget.checked;
      });

    $('#chPlayerAddressHex')
      .bootstrapToggle({
        on: 'HEX',
        off: 'DEC',
        onstyle: 'default',
        offstyle: 'default',
        size: 'mini',
        width: 50,
      })
      .change((e: JQueryInputEvent) => {
        this.onPlayerAddressChanging();
        this.hexPlayerAddress = !!e.currentTarget.checked;
        this.onPlayerAddressChanged();
      })
      .bootstrapToggle(this.hexPlayerAddress ? 'on' : 'off');

    $('#txPlayerAddress').change((e: JQueryInputEvent) => {
      this.onPlayerAddressChanging(e.currentTarget.value);
      this.onPlayerAddressChanged();
    });

    this.dialog.find('.apply').click(async () => {
      await this.compile();
      return true;
    });

    this.onIncludePlayerChanged();
    this.onPlayerAddressChanged();
  }

  private onIncludePlayerChanged() {
    const state = !this.includePlayer;

    $('label[for=rdPlayerPlatform]').toggleClass('disabled', state);
    $('input[name=rdPlayerPlatform]')
      .toggleClass('disabled', state)
      .prop('disabled', state);

    $('label[for=rdPlayerType]').toggleClass('disabled', state);
    $('label[class="control-label"] > input[name=rdPlayerType]')
      .toggleClass('disabled', state)
      .prop('disabled', state);

    $('label[for=txPlayerAddress]').toggleClass('disabled', state);
    $('#txPlayerAddress,#chPlayerAddressHex').prop('disabled', state);
    $('#chPlayerAddressHex').bootstrapToggle(state ? 'disable' : 'enable');

    $('#chPlayerRepeat').prop('disabled', state);
  }

  private onPlayerAddressChanging(value: string = $('#txPlayerAddress').val()) {
    const radix = this.hexPlayerAddress ? 16 : 10;
    const currentValue = Math.max(0, Math.min(65535, parseInt(value, radix) || 0));
    this.playerAddress = currentValue;
  }
  private onPlayerAddressChanged() {
    const playerAddress = this.playerAddress;
    $('#txPlayerAddress').val(
      this.hexPlayerAddress ?
        toHex(playerAddress).toUpperCase() :
        playerAddress
    );
  }

  private save() {
    localStorage.setItem(
      constants.COMPILER_SETTINGS_KEY,
      JSON.stringify(getConfigProps(this))
    );
  }

  show() {
    if (!this.dialog) {
      this.init();
    }

    const tracker = this._parent;
    tracker.globalKeyState.inDialog = true;

    this.dialog.on('show.bs.modal', $.proxy(() => {
      this.dialog
        .before($('<div/>')
          .addClass('modal-backdrop in').css('z-index', '1030'));

    }, this)).on('hide.bs.modal', () => {
      this.dialog.prev('.modal-backdrop').remove();
      this.dialog.find('.modal-footer>.btn').off();
      this.dialog.off();

      this.save();
      tracker.globalKeyState.inDialog = false;

    }).modal({
      show: true,
      backdrop: false
    });
  }

  async compile() {
    this.messageLogger = '';
    const optiLogger = this.verbose ? (msg: string) => {
      this.log(msg);
    } : undefined;

    this.prepareSamples();
    this.prepareOrnaments();
    this.preparePatterns();
    this.preparePositions();

    this.optimizePatterns(optiLogger);
    this.optimizeOrnaments(optiLogger);
    this.optimizeSamples(optiLogger);

    this.songData = null;
    this.playerData = null;

    this.composeSongData();

    if (this.includePlayer) {
      try {
        await this.preparePlayer();
      }
      catch (error) {
        this.log(error, true);
      }
    }

    this.finalizeOutputBinary();

    this.dialog.modal('hide');
    this.showOutputLog();
  }

  //-------------------------------------------------------------------------------------
  /** compiled Song */
  private songData: Uint8Array;
  /** generated Player */
  private playerData: Uint8Array;
  /**
   * Player type according to Song data.
   * Types (or versions) of the player differs by supported Commands.
   * - vX.0 - BCDEF
   * - vX.1 - 123A+BCDEF
   * - vX.2 - 123+6789+ABCDEF
   * - vX.3 - 123+45+6789ABCDEF
   */
  private playerTypeByData: number;
  /** Song data version - will be set according to Player */
  private version: number;

  private log(str: string, error: boolean = false) {
    this.messageLogger += `${error ? 'ERROR: ' : ''}${str}\n`;
  }

  private showOutputLog() {
    const keys = this._parent.globalKeyState;

    const dialog = $('#documodal');
    const button = $('<button/>').attr({
      'type': 'button',
      'class': 'close',
      'data-dismiss': 'modal'
    }).text('\xd7');

    keys.inDialog = true;
    dialog.modal('show')
      .find('.modal-body')
      .html(`<pre>\n${this.messageLogger}</pre>`)
      .prepend(button)
      .on('hidden.bs.modal', () => {
        keys.inDialog = false;
        $(this).find('.modal-body').empty();
      });
  }

  private prepareSamples(): void {
    this.smpList = this._parent.player.sample.map((sample, sampleNumber) => {
      let sampleLength: number = 0;
      if (sample != null) {
        sampleLength = sample.end;
      }
      if (sample === null || sampleLength === 0) {
        if (sampleNumber === 0) {
          // sample 0 will be empty
          const data = new Uint8Array(1);
          data[0] = 0x80;
          return data;
        }
        return null;
      }
      else {
        const totalLength = (sample.releasable) ? sample.data.length : sampleLength;
        const totalDataLength = (3 * sampleLength + 1) + ((sample.releasable) ? 1 + ((totalLength - sampleLength) * 3) + 1 : 0);
        const data = new Uint8Array(totalDataLength);

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
            const sampleRepeat = sample.loop;
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

  private prepareOrnaments() {
    this.ornList = this._parent.player.ornament.map((ornament, ornNumber) => {
      let ornLength: number = 0;
      if (ornament != null) {
        ornLength = ornament.end;
      }
      if (ornament === null || ornLength === 0) {
        if (ornNumber === 0) {
          const data = new Uint8Array(1);
          data[0] = 0x80;
          return data;
        }
      }
      else {
        const data: Uint8Array = new Uint8Array(ornLength + 1);
        for (let i: number = 0; i < ornLength; i++) {
          data[i] = ornament.data[i] & 0x7F;
        }
        const ornRepeat: number = ornament.loop;
        data[ornLength] = (ornRepeat === ornLength) ? 0x80 : ornRepeat - ornLength;
        return data;
      }
    });
  }

  private preparePatterns() {
    const usedCmdId: Set<number> = new Set<number>();
    const usedCmd: Set<string> = new Set<string>();
    const removedCmd: Set<string> = new Set<string>();

    // pattern 0 is always empty
    const emptyPattern = new Uint8Array(1);
    emptyPattern[0] = 0xFF;

    this.smpList = [
      emptyPattern,
      ...(this._parent.player.pattern.map((pattern) => {
        let patLen: number = 0;
        if (pattern != null) {
          patLen = pattern.end;
        }
        if (pattern === null || patLen === 0) {
          return null;
        }
        else {
          let data = new Uint8Array(5 * patLen + 1);

          // searching for possible Cmd-B
          let breakToLine: number = -1;
          let breakToLineOffset: number = -1;
          for (let i = 0; i < patLen; i++) {
            const patLine = pattern.data[i];
            if (patLine.cmd === 0x0B) {
              // BREAK CURRENT CHANNEL-PATTERN AND LOOP FROM LINE
              const line = patLine.cmd_data;
              if (line >= 0 && line < i) {
                breakToLine = line;
                break;
              }
            }
          }

          let offY: number = 0;
          let lastEmptyLines: number = 0;
          let lastCmd: number = 0;
          let lastDat: number = -1;
          for (let i: number = 0; i < patLen; i++) {
            let {
              tone: ton, smp, orn,
              volume: { byte: vol },
              cmd, cmd_data: dat,
              release, orn_release
            } = pattern.data[i];

            let cmdStr = `${toHex(cmd, 2)}/${toHex(dat, 2)}`.toUpperCase();

            // filter invalid commands
            if (cmd > 0) {
              switch (cmd) {
                case 0x1 : // PORTAMENTO UP
                case 0x2 : // PORTAMENTO DOWN
                case 0x3 : // GLISSANDO TO GIVEN NOTE
                case 0xA : // VOLUME SLIDE
                  if (
                    (dat & 0x0F) === 0 || (dat & 0xF0) === 0 || // `period` nor `pitch` cannot be 0
                    (cmd === 0xA && (dat & 0x0F) === 0x08) ||   // value change for VOLUME SLIDE cannot be 8
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
                case 0xD : // DELAY LISTING ON CURRENT LINE
                  if (dat === 0) { // dat cannot be 0
                    removedCmd.add(cmdStr);
                    cmd = 0;
                  }
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
                    cmdStr = `${toHex(cmd, 2)}/${toHex(dat, 2)}`.toUpperCase();
                    if (dat >= 0xF2) {
                      removedCmd.add(cmdStr);
                      cmd = 0;
                    }
                  }
                  break;

                case 0xE : // SOUNDCHIP ENVELOPE OR NOISE CHANNEL CONTROL
                  const d = dat & 0xF0;
                  if ((d > 0x20 && d !== 0xD0) // invalid values for ENVELOPE-CONTROL
                    || (d === 0x20 && dat > 0x24)) { // invalid values for NOISE-CONTROL
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
                      cmdStr = `${toHex(cmd, 2)}/${toHex(dat, 2)}`.toUpperCase();
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
            let b2: number = ((vol > 0) ? 0x80 : 0) | (orn_release ? 0x40 : 0) | smp;
            let b3: number = (cmd << 4) | orn;
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
                  const lel: number = (lastEmptyLines > 127) ? 127 : lastEmptyLines;
                  data[offY++] = (lel - 1) | 0x80;
                  lastEmptyLines -= lel;
                }
              }

              if (breakToLine === i) {
                breakToLineOffset = offY;
              } // offset of pattern line, where should be jump after Cmd-B

              if (b1 === 0 && b2 === 0 && b3 === 0) {
              // empty line
                data[offY++] = 0x80;
                lastEmptyLines++;
              }
              else {
                lastEmptyLines = 0;
                data[offY++] = b1;
                data[offY++] = b2;
                data[offY++] = b3;
                if (vol > 0) {
                  data[offY++] = vol;
                }
                if (cmd > 0) {
                  if (cmd === 0xB) { // Cmd-B
                    const backOffset: number = offY - breakToLineOffset + 2;
                    writeWordLE(data, offY, -backOffset);
                    offY += 2;
                    break;
                  }

                  data[offY++] = dat;
                }
              }
            }
          }

          if (breakToLineOffset < 0) { // end mark, only when Cmd-B was not occurs
            offY -= lastEmptyLines; // empty lines at the end will be elliminated
            data[offY++] = 0xFF;  // end mark
          }

          if (offY < data.length) {
            data = data.slice(0, offY);
          }

          return data;
        }
      }))
    ];

    if (usedCmdId.has(4) || usedCmdId.has(5)) {
      // vX.3 - 123+45+6789ABCDEF
      this.playerTypeByData = 3;
    }
    else if (usedCmdId.has(6) || usedCmdId.has(7) || usedCmdId.has(8) || usedCmdId.has(9)) {
      // vX.2 - 123+6789+ABCDEF
      this.playerTypeByData = 2;
    }
    else if (usedCmdId.has(1) || usedCmdId.has(2) || usedCmdId.has(3) || usedCmdId.has(10)) {
      // vX.1 - 123A+BCDEF
      this.playerTypeByData = 1;
    }
    else {
      // vX.0 - BCDEF
      this.playerTypeByData = 0;
    }

    this.version = constants.CURRENT_PLAYER_MAJOR_VERSION * 16 + this.playerTypeByData;

    if (this.verbose) {
      this.log(`Used Cmd: [ ${[...usedCmd].join(', ')} ]`);
      this.log(`Removed Cmd: [ ${[...removedCmd].join(', ')} ]`);
    }
  }

  private preparePositions() {
    this.posList = this._parent.player.position.map((position) => {
      const data = new Uint8Array(14);
      let offset: number = 0;
      data[offset++] = position.length;
      data[offset++] = position.speed;
      for (let i: number = 0; i < 6; i++) {
        data[offset++] = position.ch[i].pattern;
        data[offset++] = position.ch[i].pitch;
      }
      return data;
    });
  }

  private composeSongData(): void {
    let titAutLen: number = 0;
    let titleAuthor: Uint8Array = null;

    // prepare Song title and author
    if (this.songHeader) {
      const title = this._parent.songTitle ? stringToBytes(this._parent.songTitle, true) : null;
      const tl = title?.length ?? 0;

      const author = this._parent.songAuthor ? stringToBytes(this._parent.songAuthor, true) : null;
      const al = author?.length ?? 0;

      if (tl > 0 || al > 0) {
        const by: Uint8Array = stringToBytes(' by ');
        const bl: number = by.length;

        titAutLen = 1 + tl + ((tl > 0 && al > 0) ? bl : 0) + al + 1;
        titleAuthor = new Uint8Array(titAutLen);
        titleAuthor[0] = 0x0D;
        if (tl > 0) {
          titleAuthor.set(title, 1);
        }
        if (tl > 0 && al > 0) {
          titleAuthor.set(by, 1 + tl);
        }
        if (al > 0) {
          titleAuthor.set(author, 1 + tl + ((tl > 0 && al > 0) ? bl : 0));
        }
        titleAuthor[titAutLen - 1] = 0x0D;
      }
      if (titAutLen > 0) {
        this.log('Title: ' + bytesToString(titleAuthor));
      }
    }

    // prepare number and data length for Samples
    const smpCnt: number = this.smpList.length;
    const smpLen = this.smpList.reduce(
      (counter, sample) => counter + (sample?.length ?? 0), 0);

    this.verbose && this.log('SMP: ' + smpCnt + '/' + smpLen);

    // prepare number and data length for Ornaments
    const ornCnt: number = this.ornList.length;
    const ornLen = this.ornList.reduce(
      (counter, orn) => counter + (orn?.length ?? 0), 0);

    this.verbose && this.log('ORN: ' + ornCnt + '/' + ornLen);

    // prepare number and data length for Patterns
    const patCnt = this.patList.length;
    const patLen = this.patList.reduce(
      (counter, pattern) => counter + (pattern?.length ?? 0), 0);

    this.verbose && this.log('PAT: ' + patCnt + '/' + patLen);

    // prepare number and data length for Positions
    const posCnt: number = this.posList.length;
    const posLen = this.posList.reduce(
      (counter, position) => counter + (position?.length ?? 0), 0);

    this.verbose && this.log('POS: ' + posCnt + '/' + posLen);

    // calculate total length of data
    const totalLen =
      4 + 1 + 8 +             // signature, version, offsets to lists
      titAutLen +             // title and author
      (smpCnt * 2 + smpLen) + // samples
      (ornCnt * 2 + ornLen) + // ornaments
      (patCnt * 2 + patLen) + // patterns
      (posLen + 1 + 2);       // positions

    // byte array for Song data
    this.songData = new Uint8Array(totalLen);

    // prepare ofssets to particular data parts
    const smpListOff: number = 4 + 1 + 8 + titAutLen;
    const ornListOff: number = smpListOff + smpCnt * 2;
    const patListOff: number = ornListOff + ornCnt * 2;
    const posDataOff: number = patListOff + patCnt * 2;

    const smpDataOff: number = posDataOff + posLen + 1 + 2;
    const ornDataOff: number = smpDataOff + smpLen;
    const patDataOff: number = ornDataOff + ornLen;

    let off: number = 0;

    // store signature and version
    this.songData.set(stringToBytes('STMF'), off);
    off += 4;
    this.songData[off] = this.version;
    off += 1;

    // store addresses (offsets) of lists pointers to data of Samples, Ornaments, Patterns a Positions
    writeWordLE(this.songData, off, smpListOff);
    off += 2;
    writeWordLE(this.songData, off, ornListOff);
    off += 2;
    writeWordLE(this.songData, off, patListOff);
    off += 2;
    writeWordLE(this.songData, off, posDataOff);
    off += 2;

    // store title and author
    if (titAutLen > 0) {
      this.songData.set(titleAuthor, off);
      off += titAutLen;
    }

    // store list of pointers to Sample data
    let offX: number = 0;
    for (let i: number = 0; i < smpCnt; i++) {
      writeWordLE(this.songData, off, smpDataOff + offX);
      offX += this.smpList[i].length;
      off += 2;
    }

    // store list of pointers to Ornament data
    offX = 0;
    for (let i: number = 0; i < ornCnt; i++) {
      writeWordLE(this.songData, off, ornDataOff + offX);
      offX += this.ornList[i].length;
      off += 2;
    }

    // store list of pointers to Pattern data
    offX = 0;
    for (let i: number = 0; i < patCnt; i++) {
      writeWordLE(this.songData, off, patDataOff + offX);
      offX += this.patList[i].length;
      off += 2;
    }

    // store Positions data
    for (let i: number = 0; i < posCnt; i++) {
      this.songData.set(this.posList[i], off);
      off += this.posList[i].length;
    }
    // end mark of positions
    this.songData[off++] = 0;
    // pointer for Song repetition
    writeWordLE(this.songData, off,
      (this._parent.player.repeatPosition < 0 ||
        this._parent.player.repeatPosition >= this.posList.length
      ) ? 0 : (posDataOff + this._parent.player.repeatPosition * 14));
    off += 2;

    // store data of Samples
    for (let i: number = 0; i < smpCnt; i++) {
      this.songData.set(this.smpList[i], off);
      off += this.smpList[i].length;
    }

    // store data of Ornaments
    for (let i: number = 0; i < ornCnt; i++) {
      this.songData.set(this.ornList[i], off);
      off += this.ornList[i].length;
    }

    // store data of Patterns
    for (let i: number = 0; i < patCnt; i++) {
      this.songData.set(this.patList[i], off);
      off += this.patList[i].length;
    }

    // check if final offset correspond to expected data length
    if (off !== this.songData.length) {
      this.log(`Fatal error on composing song data! Expected data length (${this.songData.length}) is not equal to the result data (${off})!`, true);
    }
  }

  private async preparePlayer() {
    const playerTypeResult =
      (this.playerType < 0) ?
        this.playerTypeByData :
        Math.max(this.playerType, this.playerTypeByData);

    if (this.playerType >= 0 && playerTypeResult !== this.playerType) {
      this.log(`Requested routine type (${this.playerType}) is ${
        (this.playerType > playerTypeResult) ? 'higher' : 'lower'
      } than is needed for song data (${playerTypeResult})`, true);
    }

    const resourceFileName = `compiler/saa-player-${
      this.playerPlatform === PlayerPlatform.Z80 ? 'z' : 'i'
    }${playerTypeResult}${
      this.playerPlatform === PlayerPlatform.I8080PP ? '-pp' : ''
    }`;

    this.verbose && this.log('Loading Player binary...');

    this.playerData = await fetch(resourceFileName + '.bin')
      .then(response => response.arrayBuffer())
      .then(buffer => new Uint8Array(buffer))
      .catch((error: string) => {
        throw `Failed to fetch Player binary! [${error}]`;
      });

    this.verbose && this.log('Loading relocation table ...');

    const relocTable = await fetch(resourceFileName + '.rtb')
      .then(response => response.arrayBuffer())
      .then(buffer => new Uint16Array(buffer))
      .catch((error: string) => {
        throw `Failed to fetch relocation table! [${error}]`;
      });


    this.verbose && this.log(`Relocating of the Player to ${this.playerAddress}...`);
    for (let i: number = 0; i < relocTable.length; i++) {
      const off: number = relocTable[i];
      if (off === 0) {
        break;
      }
      writeWordLE(this.playerData, off,
        (this.playerData[off] + 256 * this.playerData[off + 1]) + this.playerAddress
      );
    }
  }

  private finalizeOutputBinary() {
    let totalLen: number = 0;

    if (this.songData != null) {
      totalLen += this.songData.length;

      this.log(`Song data length: ${this.songData.length} bytes`);
      this.log(`Minimal routine type by song data: ${this.playerTypeByData}`);
    }

    if (this.playerData != null) {
      totalLen += this.playerData.length;

      const ver: number = this.playerData[6];

      this.log(`Routine version: ${ver >> 4}.${ver & 15} ${this.playerPlatform}`);
      this.log(`Routine address: ${toHex(this.playerAddress, 4)}`);
      this.log(`Routine length: ${this.playerData.length} bytes`);
      this.log(`Total length: ${totalLen} bytes`);

      if (this.songData == null) {
        this.log(`Init song address (song data immediately after routine): ${toHex(this.playerAddress, 4)}`);
        this.log(`Init song address (song data address in register HL): ${toHex(this.playerAddress + 3, 4)}`);
      }
      else {
        this.log(`Init song address: ${toHex(this.playerAddress, 4)}`);
      }
      this.log(`Play address: ${toHex(this.playerAddress + 7, 4)}`);
      if (this.songData != null && this._parent.player.repeatPosition < 0) {
        this.log(`Finish flag address: ${toHex(this.playerAddress + 8, 4)}`);
      }
      this.log(`Routine version address: ${toHex(this.playerAddress + 6, 4)}`);
    }

    let off: number = 0;
    const resultBin: Uint8Array = new Uint8Array(totalLen);
    if (this.playerData != null) {
      resultBin.set(this.playerData, off);
      off = this.playerData.length;
    }
    if (this.songData != null) {
      resultBin.set(this.songData, off);
    }

    this._parent.file.system.save(resultBin, 'STMF-Compilation.bin'); // TODO
  }
}
