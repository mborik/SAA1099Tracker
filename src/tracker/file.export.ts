/**
 * SAA1099Tracker: Tracker file export sub-class.
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

import { devLog } from '../commons/dev';
import { vgm, wave } from '../commons/export';
import { pick } from '../commons/pick';
import { SAASound } from '../saa/SAASound';
import constants from './constants';
import { STMFile } from './file';
import Tracker from '.';


interface ExportOptions {
  frequency: number;
  bitDepth: number;
  channels: number;
  repeatCount: number;
}

const getConfigProps = (obj: any) => pick(obj, [
  'frequency',
  'bitDepth',
  'channels',
  'repeatCount',
]);

export class FileExport implements ExportOptions {
  private exportDialog: JQuery = null;

  public frequency: number = 44100;
  public bitDepth: number = 16;
  public channels: number = 2;
  public repeatCount: number = 0;
  public compressVGM: boolean = true;

  constructor(
    private _app: Tracker,
    private _parent: STMFile) {}


  private _initExportDialog() {
    this.exportDialog = $('#export');

    try {
      const input = localStorage.getItem(constants.EXPORT_SETTINGS_KEY) || '{}';
      const userOptions = JSON.parse(input);
      Object.assign(this, userOptions);
    }
    catch (e) {}

    devLog('Tracker.file', 'Export settings fetched from localStorage %o...', getConfigProps(this));

    $(`#rdWaveFrequency${this.frequency}`).prop('checked', true);
    $(`#rdWaveBitDepth${this.bitDepth}`).prop('checked', true);
    $(`#rdWaveRepeat${this.repeatCount}`).prop('checked', true);
    $(`#rdWaveChannels${this.channels}`).prop('checked', true);

    $('input[name=rdWaveFrequency]').change((e: JQueryInputEventTarget) => {
      this.frequency = +e.currentTarget.value;
    });
    $('input[name=rdWaveBitDepth]').change((e: JQueryInputEventTarget) => {
      this.bitDepth = +e.currentTarget.value;
    });
    $('input[name=rdWaveRepeat]').change((e: JQueryInputEventTarget) => {
      this.repeatCount = +e.currentTarget.value;
    });
    $('input[name=rdWaveChannels]').change((e: JQueryInputEventTarget) => {
      this.channels = +e.currentTarget.value;
    });
  }

  public waveDialog() {
    if (!this.exportDialog) {
      this._initExportDialog();
    }

    const tracker = this._app;
    tracker.globalKeyState.inDialog = true;

    this.exportDialog.on('show.bs.modal', () => {
      this.exportDialog
        .before($('<div/>')
          .addClass('modal-backdrop in').css('z-index', '1030'));

      this.exportDialog.find('.apply').click(() => {
        this.exportDialog.modal('hide');
        $('#overlay .loader').html('rendering');
        document.body.className = 'loading';

        setTimeout(() => {
          this.wave();
          document.body.className = '';
        }, 50);
        return true;
      });

    }).on('hide.bs.modal', () => {
      this.exportDialog.prev('.modal-backdrop').remove();
      this.exportDialog.find('.modal-footer>.btn').off();
      this.exportDialog.off();

      localStorage.setItem(
        constants.EXPORT_SETTINGS_KEY,
        JSON.stringify(getConfigProps(this))
      );

      tracker.globalKeyState.inDialog = false;

    }).modal({
      show: true,
      backdrop: false
    });
  }

  /**
   * Export song to STMF format (SAA1099Tracker Module File).
   * Which is a JSON format, tracker's native format for saving and loading the song.
   */
  public stmf(): void {
    const file = this._parent;
    const data = file.createJSON(true);
    const fileName = file.getFixedFileName();

    file.system.save(data, `${fileName}.STMF`, constants.MIMETYPE_STMF);
  }

  /**
   * Export song to plain-text format in a human-readable format.
   */
  public textDump(): void {
    const file = this._parent;
    const fileName = file.getFixedFileName();

    const player = this._app.player;
    const hexa = this._app.settings.hexTracklines;
    const empty = ' '.repeat(14);

    const output = `SAA1099Tracker export of song "${
      this._app.songTitle
    }" by "${
      this._app.songAuthor
    }":\n\n${
      player.positions.flatMap((pp, index) => {
        const triDigitLine = (!hexa && pp.length > 100);

        const lines = [
          `Position ${index + 1}, speed: ${pp.speed}`,
          `    ${
            pp.ch.map(
              ({ pitch }) => pitch ?
                `${`           [ ${pitch}`.substr(-12)} ]` :
                empty
            ).join('')}`
        ];
        for (let buf = '', line = 0; line < pp.length; line++) {
          buf = (`00${line.toString(hexa ? 16 : 10)}`).substr(-3);
          buf = ` ${(triDigitLine || (!hexa && line > 99)) ? buf[0] : ' '}${buf.slice(1)}`;

          for (let channel = 0; channel < 6; channel++) {
            const pt = player.patterns[pp.ch[channel].pattern];
            const dat = pt.data[line].tracklist;

            if (line >= pt.end) {
              buf += empty;
            }
            else {
              buf += `  ${dat.tone} ${dat.column.substr(0, 4)} ${dat.column.substr(4)}`;
            }
          }

          lines.push(buf.replace(/\x7f/g, '.').toUpperCase());
        }

        lines.push('');
        return lines;
      }).join('\n')}`;

    file.system.save(output, `${fileName}.txt`, constants.MIMETYPE_TEXT);
  }

  /**
   * Render SAA1099 soundchip data, export to Video Game Music (VGM) format v1.71
   * and compress with gzip (.vgz).
   */
  public vgm(): void {
    const app = this._app;
    const player = this._app.player;

    if (app.modePlay || app.globalKeyState.lastPlayMode) {
      app.onCmdStop();
    }
    if (!player.positions.length) {
      return;
    }

    const file = this._parent;
    const fileName = file.getFixedFileName();

    const result = vgm({
      player,
      audioInterrupt: app.settings.audioInterrupt,
      durationInFrames: file.durationInFrames,
      songTitle: app.songTitle,
      songAuthor: app.songAuthor,
      uncompressed: !this.compressVGM,
    });

    file.system.save(result, `${fileName}.vgz`, constants.MIMETYPE_VGM);
  }

  /**
   * Render SAA1099 soundchip data and export to WAVE format.
   */
  public wave(): void {
    const app = this._app;
    const player = this._app.player;

    if (app.modePlay || app.globalKeyState.lastPlayMode) {
      app.onCmdStop();
    }
    if (!player.positions.length) {
      return;
    }

    const file = this._parent;
    const fileName = file.getFixedFileName();

    const output = wave({
      player,
      SAA1099: new SAASound(this.frequency),
      frequency: this.frequency,
      bitDepth: this.bitDepth,
      channels: this.channels,
      repeatCount: this.repeatCount,
      audioInterrupt: app.settings.audioInterrupt,
      durationInFrames: file.durationInFrames
    });

    file.system.save(output, `${fileName}.wav`, constants.MIMETYPE_WAV);
  }
}
