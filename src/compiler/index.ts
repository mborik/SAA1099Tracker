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
import { abs, toHex } from '../commons/number';
import constants from '../tracker/constants';
import CompilerRender from './renderer';


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

export default class Compiler extends CompilerRender implements CompilerOptions {
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
    this.onPlayerAddressChanged();

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
      this.dialog.modal('hide');
      await this.compile();
      return true;
    });

    this.onIncludePlayerChanged();
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
    this.openOutputLog();

    const optiLogger = this.verbose ? (msg: string) => {
      this.log(msg);
    } : undefined;

    this.prepareSamples();
    this.prepareOrnaments();
    this.preparePatterns(optiLogger);
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
  }

  private log(str: string, error: boolean = false) {
    this.messageLogger += `${error ? 'ERROR: ' : ''}${str}\n`;
    $('#documodal .modal-body > pre').text(`\n${this.messageLogger}`).scrollTop(1e5);
  }

  private openOutputLog() {
    this.messageLogger = '';

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
      .html('<pre>\n</pre>')
      .prepend(button)
      .on('hidden.bs.modal', () => {
        keys.inDialog = false;
        $(this).find('.modal-body').empty();
      });
  }

  private composeSongData(): void {
    let titAutLen = 0;
    let titleAuthor: Uint8Array = null;

    // prepare Song title and author
    if (this.songHeader) {
      const title = this._parent.songTitle ? stringToBytes(this._parent.songTitle, true) : null;
      const tl = title?.length ?? 0;

      const author = this._parent.songAuthor ? stringToBytes(this._parent.songAuthor, true) : null;
      const al = author?.length ?? 0;

      if (tl > 0 || al > 0) {
        const by: Uint8Array = stringToBytes(' by ');
        const bl = by.length;

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
        this.log('Title: ' + bytesToString(titleAuthor).trim());
      }
    }

    // prepare number and data length for Samples
    const smpCnt = this.smpList.length;
    const smpLen = this.smpList.reduce(
      (counter, sample) => counter + (sample?.length ?? 0), 0);

    this.verbose && this.log('SMP: ' + smpCnt + '/' + smpLen);

    // prepare number and data length for Ornaments
    const ornCnt = this.ornList.length;
    const ornLen = this.ornList.reduce(
      (counter, orn) => counter + (orn?.length ?? 0), 0);

    this.verbose && this.log('ORN: ' + ornCnt + '/' + ornLen);

    // prepare number and data length for Patterns
    const patCnt = this.patList.length;
    const patLen = this.patList.reduce(
      (counter, pattern) => counter + (pattern?.length ?? 0), 0);

    this.verbose && this.log('PAT: ' + patCnt + '/' + patLen);

    // prepare number and data length for Positions
    const posCnt = this.posList.length;
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
    const smpListOff = 4 + 1 + 8 + titAutLen;
    const ornListOff = smpListOff + smpCnt * 2;
    const patListOff = ornListOff + ornCnt * 2;
    const posDataOff = patListOff + patCnt * 2;

    const smpDataOff = posDataOff + posLen + 1 + 2;
    const ornDataOff = smpDataOff + smpLen;
    const patDataOff = ornDataOff + ornLen;

    let off = 0;

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
    let offX = 0;
    for (let i = 0; i < smpCnt; i++) {
      writeWordLE(this.songData, off, smpDataOff + offX);
      offX += this.smpList[i].length;
      off += 2;
    }

    // store list of pointers to Ornament data
    offX = 0;
    for (let i = 0; i < ornCnt; i++) {
      writeWordLE(this.songData, off, ornDataOff + offX);
      offX += this.ornList[i].length;
      off += 2;
    }

    // store list of pointers to Pattern data
    offX = 0;
    for (let i = 0; i < patCnt; i++) {
      writeWordLE(this.songData, off, patDataOff + offX);
      offX += this.patList[i].length;
      off += 2;
    }

    // store Positions data
    for (let i = 0; i < posCnt; i++) {
      this.songData.set(this.posList[i], off);
      off += this.posList[i].length;
    }
    // end mark of positions
    this.songData[off++] = 0;
    // pointer for Song repetition
    writeWordLE(this.songData, off,
      (!this.playerRepeat || this._parent.player.repeatPosition >= this.posList.length
      ) ? 0 : (posDataOff + this._parent.player.repeatPosition * 14));
    off += 2;

    // store data of Samples
    for (let i = 0; i < smpCnt; i++) {
      this.songData.set(this.smpList[i], off);
      off += this.smpList[i].length;
    }

    // store data of Ornaments
    for (let i = 0; i < ornCnt; i++) {
      this.songData.set(this.ornList[i], off);
      off += this.ornList[i].length;
    }

    // store data of Patterns
    for (let i = 0; i < patCnt; i++) {
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
      this.log(`Requested player type (${this.playerType}) is ${
        (this.playerType > playerTypeResult) ? 'higher' : 'lower'
      } than is needed for song data (${playerTypeResult})`, true);
    }

    const resourceFileName = `assets/data/saa-player-${
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
    relocTable.forEach((offset) => {
      if (offset > 0) {
        writeWordLE(this.playerData, offset,
          (this.playerData[offset] + 256 * this.playerData[offset + 1]) + this.playerAddress
        );
      }
    });
  }

  private finalizeOutputBinary() {
    let totalLen = 0;

    if (this.songData != null) {
      totalLen += this.songData.length;

      this.log(`Song data length: ${this.songData.length} bytes`);
      this.log(`Minimal player type by song data: ${constants.CURRENT_PLAYER_MAJOR_VERSION}.${this.playerTypeByData}`);
    }

    if (this.playerData != null) {
      totalLen += this.playerData.length;

      const ver = this.playerData[6];
      this.log(`Player version: ${ver >> 4}.${ver & 15} for ${
        this.playerPlatform === PlayerPlatform.Z80 ? 'Z80' : 'i8080'
      }`);

      this.log(`Player address: ${this.playerAddress}`);
      this.log(`Player length: ${this.playerData.length} bytes`);
      this.log(`Total length: ${totalLen} bytes`);

      const formatAddress = (addr: number) => `${abs(addr)} [${toHex(addr, 4).toUpperCase()}]`;

      if (this.songData == null) {
        this.log(`Init song address (song data immediately after player): ${formatAddress(this.playerAddress)}`);
        this.log(`Init song address (song data address in register HL): ${formatAddress(this.playerAddress + 3)}`);
      }
      else {
        this.log(`Init song address: ${formatAddress(this.playerAddress)}`);
      }
      this.log(`Play address: ${formatAddress(this.playerAddress + 7)}`);
      if (this.songData && !this.playerRepeat) {
        this.log(`Finish flag address: ${formatAddress(this.playerAddress + 8)}`);
      }
      this.log(`Player version address: ${formatAddress(this.playerAddress + 6)}`);
    }

    let offset = 0;
    const resultBin: Uint8Array = new Uint8Array(totalLen);
    if (this.playerData != null) {
      resultBin.set(this.playerData, offset);
      offset = this.playerData.length;
    }
    if (this.songData != null) {
      resultBin.set(this.songData, offset);
    }

    this._parent.file.system.save(resultBin, this._parent.file.getFixedFileName() + '.bin');
  }
}