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
  private _obj: JQuery = null;

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

  private _init() {
    this._obj = $('#compiler');

    try {
      const input = localStorage.getItem(constants.COMPILER_SETTINGS_KEY) || '{}';
      const userOptions = JSON.parse(input);
      Object.assign(this, userOptions);
    }
    catch (e) {}

    devLog('Tracker.compiler', 'Settings fetched from localStorage %o...', getConfigProps(this));

    this._populateElements();
  }

  private _populateElements() {
    $('#chIncludePlayer')
      .prop('checked', this.includePlayer)
      .change((e: JQueryInputEvent) => {
        this.includePlayer = !!e.currentTarget.checked;
        this._onIncludePlayerChanged();
        return true;
      });

    $(`#rdPlayerPlatform${this.playerPlatform}`).prop('checked', true);
    $(`#rdPlayerType${this.playerType < 0 ? 'Auto' : `V${this.playerType}`}`).prop('checked', true);

    $('input[name=rdPlayerPlatform]').change((e: JQueryInputEvent) => {
      this._onPlayerAddressChanging();
      this.playerPlatform = +e.currentTarget.value;
      this._onPlayerAddressChanged();
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
        this._onPlayerAddressChanging();
        this.hexPlayerAddress = !!e.currentTarget.checked;
        this._onPlayerAddressChanged();
      })
      .bootstrapToggle(this.hexPlayerAddress ? 'on' : 'off');

    this._obj.find('.apply').click(() => {
      this._obj.modal('hide');
      return true;
    });

    $('#txPlayerAddress').change((e: JQueryInputEvent) => {
      this._onPlayerAddressChanging(e.currentTarget.value);
      this._onPlayerAddressChanged();
    });

    this._onIncludePlayerChanged();
    this._onPlayerAddressChanged();
  }

  private _onIncludePlayerChanged() {
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

  private _onPlayerAddressChanging(value: string = $('#txPlayerAddress').val()) {
    const radix = this.hexPlayerAddress ? 16 : 10;
    const currentValue = Math.max(0, Math.min(65535, parseInt(value, radix) || 0));
    this.playerAddressByPlatform[this.playerPlatform] = currentValue;
  }
  private _onPlayerAddressChanged() {
    const playerAddress = this.playerAddressByPlatform[this.playerPlatform];
    $('#txPlayerAddress').val(
      this.hexPlayerAddress ?
        toHex(playerAddress).toUpperCase() :
        playerAddress
    );
  }

  private _save() {
    localStorage.setItem(
      constants.COMPILER_SETTINGS_KEY,
      JSON.stringify(getConfigProps(this))
    );
  }

  show() {
    if (!this._obj) {
      this._init();
    }

    const tracker = this._parent;
    tracker.globalKeyState.inDialog = true;

    this._obj.on('show.bs.modal', $.proxy(() => {
      this._obj
        .before($('<div/>')
          .addClass('modal-backdrop in').css('z-index', '1030'));

    }, this)).on('hide.bs.modal', () => {
      this._obj.prev('.modal-backdrop').remove();
      this._obj.find('.modal-footer>.btn').off();
      this._obj.off();

      this._save();
      tracker.globalKeyState.inDialog = false;

    }).modal({
      show: true,
      backdrop: false
    });
  }
}
