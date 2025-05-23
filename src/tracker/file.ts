/**
 * SAA1099Tracker: Native file format handler class and dependent interfaces.
 * Copyright (c) 2015-2025 Martin Borik <martin@borik.net>
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

import pako from 'pako';
import { bytesToString } from '../commons/binary';
import { devLog } from '../commons/dev';
import { abs, toHex, validateAndClamp } from '../commons/number';
import Player from '../player/Player';
import constants from './constants';
import { i18n } from './doc';
import { FileDialog } from './file.dialog';
import { FileExport } from './file.export';
import { FileSystem } from './file.system';
import Tracker from '.';


export interface StorageItem {
  id: number;
  storageId: string;
  fileName: string;
  timeCreated: number;
  timeModified: number;
  duration: string;
  length: number;
}

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

export class STMFile {
  yetSaved: boolean = false;
  modified: boolean = false;
  fileName: string = '';

  duration: string = '';
  durationInFrames: number = 0;

  dialog: FileDialog;
  export: FileExport;
  system: FileSystem;
  storageMap: Map<number, StorageItem> = new Map();

  private _storageLastId: number = undefined;
  private _storageBytesUsed: number = 0;

  constructor(protected _parent: Tracker) {
    this._reloadStorage();

    this.dialog = new FileDialog(_parent, this);
    this.export = new FileExport(_parent, this);
    this.system = new FileSystem;
  }

  protected _updateAll() {
    const tracker: Tracker = this._parent;
    const player: Player = tracker.player;

    const actualLine = player.line;

    tracker.onCmdToggleEditMode(tracker.modeEdit);
    tracker.onCmdToggleLoop(player.loopMode);

    $('#scPatCurrent').val(tracker.workingPattern.toString());
    $('#scPatTarget').val(tracker.workingPatternTarget.toString());
    $('#scPatPanelSwitch').bootstrapToggle('on');
    $('#scPosRepeat').val((player.repeatPosition + 1).toString());
    $('#scPosCurrent').val((player.position + 1).toString());

    tracker.updatePanels();
    player.line = actualLine;
    tracker.updateTracklist();

    $('#scSampleNumber').val(tracker.workingSample.toString(32).toUpperCase());
    $('#scOrnNumber').val(tracker.workingOrnament.toString(16).toUpperCase());
    $('#scOrnTestSample').val(tracker.workingOrnTestSample.toString(32).toUpperCase());
    $('#scSampleTone,#scOrnTone').val(tracker.workingSampleTone.toString()).trigger('change');
    $('#sbSampleScroll').scrollLeft(0);

    tracker.updateSampleEditor(true);
    tracker.smpornedit.updateOrnamentEditor(true);

    $('#main-tabpanel a').eq(tracker.activeTab).tab('show');
  }


  private _storageSum(): void {
    this._storageBytesUsed = 0;
    this.storageMap.forEach(obj => {
      this._storageBytesUsed += (obj.length + 40) * 2;
    }, this);
  }

  private _storageFind(fn: (obj: StorageItem) => boolean): StorageItem {
    for (const [, value] of this.storageMap) {
      if (fn(value)) {
        return value;
      }
    }
  }

  /**
   * This method builds an internal database of stored songs in localStorage.
   */
  private _reloadStorage(): void {
    this.storageMap.clear();
    this._storageLastId = -1;

    let match: string[];
    for (let i: number = 0, l = localStorage.length; i < l; i++) {
      if ((match = localStorage.key(i).match(/^(stmf([0-9a-f]{3}))\-nfo/))) {
        const id = parseInt(match[2], 16);
        const storageId: string = match[1];

        const s: string = localStorage.getItem(match[0]);
        const data: string = localStorage.getItem(storageId + '-dat');

        if (!data) {
          devLog('Tracker.file', 'Unable to read data for file in localStorage\n\t%s:"%s"', match[2], s);
          localStorage.removeItem(match[0]);
          continue;
        }

        if (!(match = s.match(/^(.+)\|(\d+?)\|(\d+?)\|(\d\d:\d\d)$/))) {
          continue;
        }

        this._storageLastId = Math.max(this._storageLastId, id);
        this.storageMap.set(id, {
          id,
          storageId: storageId,
          fileName: match[1],
          timeCreated: parseInt(match[2], 10),
          timeModified: parseInt(match[3], 10),
          duration: match[4],
          length: data.length
        } as StorageItem);
      }
    }

    devLog('Tracker.file', 'Storage reloaded: %d files available', this.storageMap.size);
    this._storageSum();
  }

  storagetUsageSummary = () => ({
    bytes: this._storageBytesUsed,
    percent: Math.min(100, Math.ceil(
      100 / (constants.LOCALSTORAGE_ASSUMED_SIZE / this._storageBytesUsed)
    ))
  });

  /**
   * This method can parse input JSON with song data
   * in current SAA1099Tracker format specification.
   * @param input {STMFileFormat|string} song data in JSON.
   */
  parseJSON(input: STMFileFormat | string): boolean {
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

    const tracker = this._parent;
    const settings = tracker.settings;
    const player = tracker.player;

    const count = { smp: 0, orn: 0, pat: 0, pos: 0 };

    // detection of old JSON format v1.1 from previous project MIF85Tracker...
    if (!data.version || (data.version && data.version !== constants.CURRENT_FILE_VERSION)) {
      return false;
    }

    player.clearSong(true);

    //~~~ CREDITS ~~~
    tracker.songTitle = data.title || '';
    tracker.songAuthor = data.author || '';

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
          it.ch[k].pattern = parseInt(s.substr(0, 3), 10) || 0;
          it.ch[k].pitch = parseInt(s.substr(3), 10) || 0;
        }

        player.countPositionFrames(i);
        player.storePositionRuntime(i);
        count.pos++;
      });
    }

    //~~~ CURRENT STATE ~~~
    if (typeof data.current === 'object') {
      const o: any = data.current;

      player.repeatPosition = validateAndClamp({
        value: data.repeatPos as any,
        initval: 0,
        min: 0, max: data.positions.length - 1
      });
      player.position = validateAndClamp({
        value: o.position,
        initval: 0,
        min: 0, max: data.positions.length - 1
      });

      tracker.workingPattern = validateAndClamp({
        value: o.pattern,
        initval: 0,
        min: 0, max: 255
      });
      tracker.workingPatternTarget = tracker.workingPattern ? 1 : 0;
      tracker.workingSample = validateAndClamp({
        value: o.sample,
        initval: 1,
        min: 1, max: 31
      });
      tracker.workingOrnament = validateAndClamp({
        value: o.ornament,
        initval: 1,
        min: 1, max: 15
      });
      tracker.workingOrnTestSample = validateAndClamp({
        value: o.ornSample,
        initval: 1,
        min: 1, max: 31
      });
      tracker.workingSampleTone = validateAndClamp({
        value: o.sampleTone,
        initval: 37,
        min: 1, max: 96
      });

      player.line = o.line || 0;
      tracker.modeEditChannel = o.channel || 0;
      tracker.modeEditColumn = o.column || 0;

      const c: any = {
        ...data.ctrl,
        ...data.config
      };

      tracker.ctrlOctave = validateAndClamp({
        value: c.octave,
        initval: 2,
        min: 1, max: 8
      });
      tracker.ctrlSample = validateAndClamp({
        value: c.sample,
        initval: 0,
        min: 0, max: 31
      });
      tracker.ctrlOrnament = validateAndClamp({
        value: c.ornament,
        initval: 0,
        min: 0, max: 15
      });
      tracker.ctrlRowStep = validateAndClamp({
        value: c.rowStep,
        initval: 0,
        min: 0, max: 8
      });
      tracker.activeTab = validateAndClamp({
        value: c.activeTab === 9 ? 0 : c.activeTab,
        initval: 0,
        min: 0, max: 2
      });

      player.loopMode = c.loopMode ?? true;
      tracker.modeEdit = c.editMode ?? false;

      const int = c.interrupt === 32 ? 32 : 50;
      if (settings.audioInterrupt !== int) {
        settings.audioInterrupt = int;
        settings.audioInit();
      }
    }

    devLog('Tracker.file', 'JSON file successfully parsed and loaded... %o', {
      title: data.title,
      author: data.author,
      samples: count.smp,
      ornaments: count.orn,
      patterns: count.pat,
      positions: count.pos,
      version: data.version
    });

    this._updateAll();
    return true;
  }

  private _fixFileName(fileName: string): string {
    return fileName.replace(/[\.\\\/\":*?%<>|\x00-\x1f]+/g, '').trim();
  }

  //---------------------------------------------------------------------------------------
  public getFixedFileName(): string {
    return this._fixFileName(
      (this.fileName !== constants.AUTOSAVE_FILENAME && this.fileName) ||
        this._parent.songTitle || i18n.app.filedialog.untitled
    );
  }

  /**
   * This method creates JSON format (version 1.2) of song data from tracker,
   * more specifically full snapshot of tracker state.
   * @param pretty {boolean} set if you want pretty-formatted JSON output.
   */
  createJSON(pretty?: boolean): string {
    const tracker = this._parent;
    const settings = tracker.settings;
    const player = tracker.player;

    const output: STMFileFormat = {
      title: tracker.songTitle,
      author: tracker.songAuthor,
      samples: [],
      ornaments: [],
      patterns: [],
      positions: [],
      repeatPos: player.repeatPosition,

      current: {
        sample: tracker.workingSample,
        ornament: tracker.workingOrnament,
        ornSample: tracker.workingOrnTestSample,
        smpornTone: tracker.workingSampleTone,

        position: player.position,
        pattern: tracker.workingPattern,

        line: player.line,
        channel: tracker.modeEditChannel,
        column: tracker.modeEditColumn
      },
      ctrl: {
        octave: tracker.ctrlOctave,
        sample: tracker.ctrlSample,
        ornament: tracker.ctrlOrnament,
        rowStep: tracker.ctrlRowStep
      },
      config: {
        interrupt: settings.audioInterrupt,
        activeTab: tracker.activeTab,
        editMode: tracker.modeEdit,
        loopMode: player.loopMode
      },

      version: constants.CURRENT_FILE_VERSION
    };

    // storing samples going backward and unshifting array...
    for (let i: number = 31; i > 0; i--) {
      const it = player.samples[i];
      let obj: any = {
        loop: it.loop,
        end: it.end,
        data: it.export()
      };

      if (it.name) {
        obj.name = it.name;
      }
      if (it.releasable) {
        obj.rel = it.releasable;
      }

      // for optimize reasons, we are detecting empty items in arrays...
      if (!obj.data.length && !obj.loop && !obj.end && !obj.rel && !obj.name) {
        obj = null;
      }
      if (!output.samples.length && obj == null) {
        continue;
      }

      output.samples.unshift(obj);
    }

    // storing ornaments going backward and unshifting array...
    for (let i: number = 15; i > 0; i--) {
      const it = player.ornaments[i];
      let obj: any = {
        loop: it.loop,
        end: it.end,
        data: it.export()
      };

      if (it.name) {
        obj.name = it.name;
      }

      // for optimize reasons, we are detecting empty items in arrays...
      if (!obj.data.length && !obj.loop && !obj.end && !obj.name) {
        obj = null;
      }
      if (!output.ornaments.length && obj == null) {
        continue;
      }

      output.ornaments.unshift(obj);
    }

    // storing patterns...
    for (let i: number = 1, l = player.patterns.length; i < l; i++) {
      const it = player.patterns[i];
      let obj: any = {
        end: it.end,
        data: it.export()
      };

      // for optimize reasons, we are detecting empty items in arrays...
      if (!obj.data.length && !obj.end) {
        obj = null;
      }
      if (!output.patterns.length && obj == null) {
        continue;
      }

      output.patterns.push(obj);
    }

    // storing positions, no optimizations needed...
    output.positions = player.positions.map(it => ({
      length: it.length,
      speed: it.speed,
      ch: it.export()
    }));

    return pretty ?
      JSON.stringify(output, null, '\t').replace(/\},\n\t+?\{/g, '}, {') :
      JSON.stringify(output);
  }

  new(update = true): void {
    const tracker = this._parent;
    const player = tracker.player;

    player.clearSong(true);

    tracker.settings.lastLoadedFileNumber = undefined;
    tracker.songTitle = '';
    tracker.songAuthor = '';

    player.position = 0;
    player.repeatPosition = 0;
    player.line = 0;

    tracker.modeEdit = false;
    tracker.modeEditChannel = 0;
    tracker.modeEditColumn = 0;
    tracker.workingPattern = 0;
    tracker.workingPatternTarget = 0;
    tracker.workingSample = 1;
    tracker.workingOrnament = 1;
    tracker.workingOrnTestSample = 1;

    this.modified = false;
    this.yetSaved = false;
    this.fileName = '';

    if (update) {
      this._updateAll();
    }
  }

  loadFile(fileNameOrId: string|number): boolean {
    let name: string;
    if (typeof fileNameOrId === 'string') {
      name = this._fixFileName(fileNameOrId);
    }

    const found = this._storageFind(obj => (
      (name && obj.fileName === name) ||
      (!name && typeof fileNameOrId === 'number' && obj.id === fileNameOrId)
    ));

    if (!found) {
      devLog('Tracker.file', 'File "' + fileNameOrId + '" not found!');
      return false;
    }
    else if (!name) {
      name = found.fileName;
    }

    devLog('Tracker.file', 'Loading "%s" from localStorage...', name);
    const packed = localStorage.getItem(found.storageId + '-dat');
    devLog('Tracker.file', 'Compressed JSON file format loaded, size: ' + packed.length);
    const data = pako.inflate(
      Uint8Array.from(
        atob(packed)
          .split('')
          .map(c => c.charCodeAt(0))
      ),
      { to: 'string' }
    );

    devLog('Tracker.file', 'After depack has %d bytes, parsing...', data.length);
    if (!this.parseJSON(data.toString())) {
      devLog('Tracker.file', 'JSON file parsing failed!');
      return false;
    }

    this.modified = false;
    this.yetSaved = true;
    this.fileName = name;

    this._parent.settings.lastLoadedFileNumber = found.id;
    return true;
  }

  saveFile(fileName: string, duration: string, oldId?: number) {
    fileName = this._fixFileName(fileName);
    devLog('Tracker.file', 'Storing "%s" to localStorage...', fileName);

    let modify = false;
    const found = this._storageFind(obj => {
      if (obj.id === oldId || obj.fileName === fileName) {
        devLog('Tracker.file', 'File ID:%s exists, will be overwritten...', obj.storageId);
        return (modify = true);
      }
      return false;
    });

    if (typeof oldId === 'number') {
      if (oldId > 0 && !modify) {
        devLog('Tracker.file', 'Cannot find given storageId: %d!', oldId);
        return false;
      }
      else if (!found) {
        devLog('Tracker.file', 'File ID:%d %s will be overwritten...!', oldId, fileName);
      }
    }

    const data = this.createJSON();
    devLog('Tracker.file', 'JSON file format built, original size: ' + data.length);
    const packed = btoa(bytesToString(pako.deflate(data)));
    devLog('Tracker.file', 'Packed and stored in BASE64, length ' + packed.length);

    const now: number = abs(Date.now() / 1000);
    let storageItem: StorageItem;

    if (modify) {
      storageItem = found;
      storageItem.fileName = fileName;
      storageItem.timeModified = now;
      storageItem.duration = duration;
      storageItem.length = packed.length;
    }
    else {
      let id = 0;
      if (!(typeof oldId === 'number' && oldId === 0)) {
        id = this._storageLastId = Math.max(1, this._storageLastId + 1);
      }
      storageItem = {
        id,
        storageId: 'stmf' + toHex(id, 3),
        fileName: fileName,
        timeCreated: now,
        timeModified: now,
        duration: duration,
        length: packed.length
      };

      this.storageMap.set(id, storageItem);
    }

    this._storageSum();

    localStorage.setItem(
      `${storageItem.storageId}-nfo`,
      `${fileName}|${storageItem.timeCreated}|${storageItem.timeModified}|${storageItem.duration}`
    );

    localStorage.setItem(`${storageItem.storageId}-dat`, packed);
    devLog('Tracker.file', 'Everything stored into localStorage...');

    this.yetSaved = true;
    this.modified = false;
    this.fileName = storageItem.fileName;

    this._parent.settings.lastLoadedFileNumber = storageItem.id;
    this._reloadStorage();
    return true;
  }
}
