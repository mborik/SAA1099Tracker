/**
 * SAA1099Tracker: Tracker file dialog sub-class.
 * Copyright (c) 2015-2022 Martin Borik <martin@borik.net>
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

import { pick } from 'lodash';
import AudioDriver from '../commons/audio';
import { devLog } from '../commons/dev';
import { abs } from '../commons/number';
import constants from './constants';
import Tracker from '.';

interface SettingsOptions {
  showAutosaveInFileDialog: boolean;
  lastLoadedFileNumber: number;
  tracklistAutosize: boolean;
  tracklistLines: number;
  tracklistLineHeight: number;
  hexTracklines: boolean;
  hexSampleFreq: boolean;
  audioInterrupt: number;
  audioBuffers: number;
  audioGain: number;
}


const getConfigProps = (obj: any) => pick(obj, [
  'showAutosaveInFileDialog',
  'lastLoadedFileNumber',
  'tracklistAutosize',
  'tracklistLines',
  'tracklistLineHeight',
  'hexTracklines',
  'hexSampleFreq',
  'audioInterrupt',
  'audioBuffers',
  'audioGain',
]);

export default class Settings implements SettingsOptions {
  private _obj: JQuery = null;

  showAutosaveInFileDialog: boolean = false;
  lastLoadedFileNumber: number = undefined;
  tracklistAutosize: boolean = true;
  tracklistLines: number = 17;
  tracklistLineHeight: number = 9;
  hexTracklines: boolean = true;
  hexSampleFreq: boolean = false;
  audioInterrupt: number = 50;
  audioBuffers: number = 4;
  audioGain: number = 1.0;

  constructor(private _parent: Tracker) {}

  setAudioGain(value: number) {
    const volume = Math.min(Math.max(0, value / 100), 2);
    AudioDriver.volume = this.audioGain = volume;
  }

  private _populateElements() {
    $('#chSetTrkAutosize').prop('checked', this.tracklistAutosize);
    $('#scSetTrkLines').val(this.tracklistLines);
    $('#scSetTrkLineHeight').val(this.tracklistLineHeight);
    $('#chSetHexTracklist').prop('checked', this.hexTracklines);
    $('#chSetHexFreqShifts').prop('checked', this.hexSampleFreq);
    $('#chShowAutosaveFile').prop('checked', this.showAutosaveInFileDialog);
    $('#rgSetAudioVolume').val(this.audioGain * 100);
    $('#rgSetAudioBuffers').val(this.audioBuffers);
    $('#rdSetAudioInt' + this.audioInterrupt).prop('checked', true);

    this.updateLatencyInfo();
  }

  private _applyChanges(backup: SettingsOptions) {
    this.save();

    if (
      backup.audioBuffers !== this.audioBuffers ||
      backup.audioInterrupt !== this.audioInterrupt
    ) {
      this.audioInit();
    }
    if (
      backup.tracklistAutosize !== this.tracklistAutosize ||
      backup.tracklistLineHeight !== this.tracklistLineHeight ||
      backup.tracklistLines !== this.tracklistLines ||
      backup.hexTracklines !== this.hexTracklines
    ) {
      $(window).trigger('resize', [true]);
    }
    if (
      backup.hexSampleFreq !== this.hexSampleFreq ||
      this._parent.activeTab === 1
    ) {
      this._parent.smpornedit.updateSamplePitchShift();
    }
  }

  save() {
    localStorage.setItem(
      constants.TRACKER_SETTINGS_KEY,
      JSON.stringify(getConfigProps(this))
    );
  }

  audioInit() {
    const tracker = this._parent;
    if (tracker.modePlay) {
      tracker.onCmdStop();
    }

    const int = this.audioInterrupt;
    tracker.player.setInterrupt(int);
    $('#rdSetAudioInt' + int).prop('checked', true);

    AudioDriver.init({
      audioSource: tracker.player,
      buffers: this.audioBuffers,
      interrupt: int
    });
  }

  updateLatencyInfo() {
    const smpRate = AudioDriver.sampleRate;
    const samples = AudioDriver.getAdjustedSamples(smpRate,
      this.audioBuffers,
      this.audioInterrupt
    );

    const milisec = abs((samples / smpRate) * 1000);
    $('#rgSetAudioBuffers').next().html(`<b>Latency:</b> ${samples} samples <i>(${milisec} ms)</i>`);
  }

  init() {
    this._obj = $('#settings');

    try {
      const input = localStorage.getItem(constants.TRACKER_SETTINGS_KEY) || '{}';
      const userOptions = JSON.parse(input);
      Object.assign(this, userOptions);
    }
    catch (e) {}

    devLog('Settings', 'User options fetched from localStorage %o...', this);

    this._populateElements();
    this.audioInit();
  }

  show() {
    const currentOptionsBackup: SettingsOptions = getConfigProps(this);

    let wasApplied = false;
    const fnApply = this._applyChanges.bind(this);

    const tracker = this._parent;
    tracker.globalKeyState.inDialog = true;
    this._obj.on('show.bs.modal', $.proxy(() => {
      this._obj
        .before($('<div/>')
          .addClass('modal-backdrop in').css('z-index', '1030'));

      $('#chSetTrkAutosize').trigger('change');
      this._obj.find('.apply').click((() => {
        wasApplied = true;
        setTimeout(fnApply, 0, currentOptionsBackup);

        this._obj.modal('hide');
        return true;
      }).bind(this));

    }, this)).on('hide.bs.modal', $.proxy(() => {
      this._obj.prev('.modal-backdrop').remove();
      this._obj.find('.modal-footer>.btn').off();
      this._obj.off();

      if (!wasApplied) {
        // restore previous options
        Object.assign(this, currentOptionsBackup);
        this._populateElements();
      }

      AudioDriver.volume = this.audioGain;
      tracker.globalKeyState.inDialog = false;

    }, this)).modal({
      show: true,
      backdrop: false
    });
  }
}
