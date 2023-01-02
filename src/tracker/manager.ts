/**
 * SAA1099Tracker: Clipboard and tracklist manager class and dependent interfaces.
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

import getProp from 'lodash.get';
import { MAX_PATTERN_LEN } from '../player/globals';
import Ornament from '../player/Ornament';
import Pattern from '../player/Pattern';
import Position from '../player/Position';
import Sample from '../player/Sample';
import { TracklistSelection } from './tracklist';
import Tracker from '.';


type SampleSimplified = Omit<Sample['data'][number], 'volume'> & { volume: number };
type PatternSimplified = Omit<Pattern['data'][number], 'tracklist' | 'volume'> & { volume: number };

interface UndoSampleData {
  type: 'data';
  data: SampleSimplified[];
  from?: number;
}
interface UndoSampleProps {
  type: 'props';
  name?: string;
  loop?: number;
  end?: number;
  releasable?: boolean;
}

interface UndoOrnamentData {
  type: 'data';
  data: Ornament['data'];
  from?: number;
}
interface UndoOrnamentProps {
  type: 'props';
  name?: string;
  loop?: number;
  end?: number;
}

interface UndoPatternData {
  type: 'data';
  data: PatternSimplified[];
  from?: number;
}
interface UndoPatternLength {
  type: 'length';
  end: number;
}
interface UndoPatternCreate {
  type: 'create';
  end: number;
}
interface UndoPatternRemove {
  type: 'remove';
  data: UndoPatternData['data'];
  end: number;
}

interface UndoPositionData {
  type: 'data';
  channel: number;
  pattern?: number;
  pitch?: number;
}
interface UndoPositionProps {
  type: 'props';
  length?: number;
  speed?: number;
}
interface UndoPositionMove {
  type: 'move';
  to: number;
}
interface UndoPositionCreate {
  type: 'create';
  to: number;
}
interface UndoPositionRemove {
  type: 'remove';
  data: Position['ch'];
  length: number;
  speed: number;
}

type UndoIndex = { index: number };
export interface UndoState {
  sample?: (UndoSampleData | UndoSampleProps) & UndoIndex;
  ornament?: (UndoOrnamentData | UndoOrnamentProps) & UndoIndex;
  pattern?: (UndoPatternData | UndoPatternLength | UndoPatternCreate | UndoPatternRemove) & UndoIndex;
  position?: (UndoPositionData | UndoPositionProps | UndoPositionRemove | UndoPositionMove | UndoPositionCreate) & UndoIndex;
}

interface UndoStateWithContext extends UndoState {
  timestamp: number;
  context: {
    activeTab: number;
    smpeditShiftShown: boolean;
    modeEdit: boolean;
    modeEditChannel: number;
    modeEditColumn: number;
    currentPosition: number;
    currentLine: number;
    workingPattern: number;
    workingSample: number;
    workingOrnament: number;
  };
}

interface SelectedBlock {
  pt: number;
  pp: Pattern;
  line: number;
  len: number;
}

export default class Manager {
  private _clipboard: Clipboard;

  private _history: UndoStateWithContext[] = [null];
  private _historyIndex = 0;

  constructor(private _parent: Tracker) {
    this._clipboard = window?.navigator?.clipboard;
    if (!this._clipboard) {
      console.error('Error: Clipboard API is not supported!');

      // polyfill
      this._clipboard = (() => {
        let content = '';
        return {
          readText: () => Promise.resolve(content),
          writeText: (text: string) => new Promise<void>((resolve) => {
            content = text;
            resolve();
          })
        };
      })() as Clipboard;
    }
  }

  private _getBlock(lengthFallback?: number): SelectedBlock {
    const p = this._parent.player;
    const sel: TracklistSelection = this._parent.tracklist.selection;
    const ch = sel.len ? sel.channel : this._parent.modeEditChannel;
    const line = sel.len ? sel.line : p.line;
    const length = sel.len ? (sel.len + 1) : undefined;
    const pos = p.positions[p.position] ?? p.nullPosition;
    const chn = pos.ch[ch];
    const pt = chn.pattern;

    return {
      pt,
      pp: p.patterns[pt],
      line: line,
      len: length || lengthFallback
    };
  }

  //-------------------------------------------------------------------------------------
  public clearFromTracklist() {
    const block = this._getBlock(1);
    this.historyPush({
      pattern: {
        type: 'data',
        index: block.pt,
        data: block.pp.data.slice(block.line, block.line + block.len).map((row) => ({
          ...row,
          volume: row.volume.byte
        })),
        from: block.line
      }
    });

    block.pp.parse([], block.line, block.len);
  }

  public copyAsPlainTracklist(): Promise<void> {
    const block = this._getBlock(1);
    const data = block.pp.tracklist.slice(block.line, block.line + block.len).map((row) => {
      const col = row.column.replace(/\x7f/g, '.').toUpperCase();
      return `${row.tone} ${col.slice(0, 4)} ${col.slice(4)}`;
    });

    return this._clipboard.writeText(data.join('\n'));
  }

  public copyFromTracklist(): Promise<void> {
    const block = this._getBlock(1);
    const data = block.pp.export(block.line, block.len, false);

    return this._clipboard.writeText('STMF.trk:' + JSON.stringify(data, null, '\t'));
  }

  public async pasteToTracklist(): Promise<boolean> {
    const content = await this._clipboard.readText();
    if (!content.startsWith('STMF.trk:[')) {
      return false;
    }

    let data: string[];
    try {
      data = JSON.parse(content.slice(9));
      if (!(data instanceof Array && data.length > 0)) {
        return false;
      }
    }
    catch (e) {
      return false;
    }

    const block = this._getBlock(data.length);
    block.pp.parse(data, block.line, block.len);
    return true;
  }

  public async pasteSpecialCheckContent(): Promise<Pattern> {
    const content = await this._clipboard.readText();
    if (!content.startsWith('STMF.trk:[')) {
      return null;
    }

    let data: string[];
    try {
      data = JSON.parse(content.slice(9));
      if (!(data instanceof Array && data.length > 0)) {
        return null;
      }
    }
    catch (e) {
      return null;
    }

    const mockPattern = new Pattern(data.length);
    mockPattern.parse(data, 0, data.length);
    mockPattern.updateTracklist();

    return mockPattern;
  }

  public async pasteSpecialToTracklist(
    pattern: Pattern,
    parts: { [key: string]: boolean }
  ): Promise<boolean> {
    if (!pattern?.end) {
      return false;
    }
    const block = this._getBlock(pattern.end);
    for (let src = 0, dest = block.line; src < block.len; src++, dest++) {
      const srcData = pattern.data[src];
      const destData = block.pp.data[dest];
      if (parts.tone) {
        destData.tone = srcData.tone;
      }
      if (parts.smp) {
        destData.smp = srcData.smp;
      }
      if (parts.orn) {
        destData.orn = srcData.orn;
      }
      if (parts.vol) {
        destData.volume.byte = srcData.volume.byte;
      }
      if (parts.cmd) {
        destData.cmd = srcData.cmd;
      }
      if (parts.data) {
        destData.cmd_data = srcData.cmd_data;
      }
    }

    block.pp.updateTracklist(block.line, block.len);
    return true;
  }

  //-------------------------------------------------------------------------------------
  public clearSample() {
    const app = this._parent;
    const smp = app.player.samples[app.workingSample];

    smp.name = '';
    smp.loop = 0;
    smp.end = 0;
    smp.releasable = false;
    smp.parse([]);
  }

  public copySample(): Promise<void> {
    const app = this._parent;
    const smp = app.player.samples[app.workingSample];
    const obj = {
      name: smp.name,
      loop: smp.loop,
      end: smp.end,
      releasable: smp.releasable,
      data: smp.export(false)
    };

    return this._clipboard.writeText('STMF.smp:' + JSON.stringify(obj, null, '\t'));
  }

  public async pasteSample(): Promise<boolean> {
    const content = await this._clipboard.readText();
    if (!content.startsWith('STMF.smp:{')) {
      return false;
    }

    const app = this._parent;
    const smp = app.player.samples[app.workingSample];
    let obj: any;

    try {
      obj = JSON.parse(content.slice(9));
      if (!(typeof obj === 'object' && obj.data instanceof Array && obj.data.length > 0)) {
        return false;
      }
    }
    catch (e) {
      return false;
    }

    smp.parse(obj.data);
    smp.name = obj.name;
    smp.loop = obj.loop;
    smp.end = obj.end;
    smp.releasable = obj.releasable;
    return true;
  }

  //-------------------------------------------------------------------------------------
  public clearOrnament() {
    const app = this._parent;
    const orn = app.player.ornaments[app.workingOrnament];

    orn.name = '';
    orn.data.fill(0);
    orn.loop = orn.end = 0;
  }

  public copyOrnament(): Promise<void> {
    const app = this._parent;
    const orn = app.player.ornaments[app.workingOrnament];
    const obj = {
      name: orn.name,
      loop: orn.loop,
      end: orn.end,
      data: orn.export(false)
    };

    return this._clipboard.writeText('STMF.orn:' + JSON.stringify(obj, null, '\t'));
  }

  public async pasteOrnament(): Promise<boolean> {
    const content = await this._clipboard.readText();
    if (!content.startsWith('STMF.orn:{')) {
      return false;
    }

    const app = this._parent;
    const orn = app.player.ornaments[app.workingOrnament];
    let obj: any;

    try {
      obj = JSON.parse(content.slice(9));
      if (!(typeof obj === 'object' && obj.data instanceof Array && obj.data.length > 0)) {
        return false;
      }
    }
    catch (e) {
      return false;
    }

    orn.parse(obj.data);
    orn.name = obj.name;
    orn.loop = obj.loop;
    orn.end = obj.end;
    return true;
  }

  //-------------------------------------------------------------------------------------
  public historyPush(
    state: UndoState = {},
    debounceOn?: {
      dataType: 'sample' | 'ornament' | 'pattern' | 'position';
      prop: string | (string | number)[];
      checkProps?: { [key: string]: any };
    }
  ) {
    if (this._historyIndex < this._history.length - 1) {
      this._history.splice(this._historyIndex + 1);
    }
    if (this._historyIndex > 0 && debounceOn) {
      const lastEntry = this._history[this._historyIndex];
      const { dataType, prop, checkProps } = debounceOn;
      const last = lastEntry[dataType];
      if (
        lastEntry.timestamp + 1000 > Date.now() &&
        last && last.type === state[dataType]?.type &&
        getProp(last, prop) && (
          !checkProps ||
          Object.entries(checkProps).every(
            ([key, value]) => getProp(last, key) === value
          )
        )
      ) {
        return;
      }
    }

    this._history.push({
      ...state,
      timestamp: Date.now(),
      context: {
        activeTab: this._parent.activeTab,
        smpeditShiftShown: this._parent.smpornedit.smpeditShiftShown,
        modeEdit: this._parent.modeEdit,
        modeEditChannel: this._parent.modeEditChannel,
        modeEditColumn: this._parent.modeEditColumn,
        currentPosition: this._parent.player.position,
        currentLine: this._parent.player.line,
        workingPattern: this._parent.workingPattern,
        workingSample: this._parent.workingSample,
        workingOrnament: this._parent.workingOrnament,
      }
    });

    this._historyIndex++;
  }

  public historyClear() {
    this._history.splice(1);
    this._historyIndex = 0;
  }

  public isUndoAvailable(): boolean {
    return this._historyIndex > 0;
  }

  public isRedoAvailable(): boolean {
    return this._historyIndex < this._history.length - 1;
  }

  public undo() {
    if (this._historyIndex > 0) {
      const state = this._history[this._historyIndex];
      this._historyIndex--;

      if (!state) {
        return false;
      }

      const app = this._parent;
      const player = app.player;
      let shouldUpdatePanels;

      if (state.pattern) {
        const p = player.patterns[state.pattern.index];
        if (state.pattern.type === 'data') {
          const d = state.pattern.data;
          for (let src = 0, dst = state.pattern.from || 0; src < d.length; src++, dst++) {
            p.data[dst].tone = d[src].tone;
            p.data[dst].smp = d[src].smp;
            p.data[dst].orn = d[src].orn;
            p.data[dst].volume.byte = d[src].volume;
            p.data[dst].cmd = d[src].cmd;
            p.data[dst].cmd_data = d[src].cmd_data;
          }
          p.updateTracklist();
        }
        else if (state.pattern.type === 'length') {
          p.end = state.pattern.end;
          p.updateTracklist();
          shouldUpdatePanels = true;
        }
        else if (state.pattern.type === 'create') {
          player.patterns.splice(state.pattern.index, 1);
        }
        else if (state.pattern.type === 'remove') {
          if (state.pattern.index !== player.patterns.length) {
            console.error('Manager: Undo of removing pattern - index is invalid (not last)!');
          }
          const d = state.pattern.data;
          const p = new Pattern(state.pattern.end);
          for (let i = 0; i < MAX_PATTERN_LEN; i++) {
            p.data[i].tone = d[i].tone;
            p.data[i].smp = d[i].smp;
            p.data[i].orn = d[i].orn;
            p.data[i].volume.byte = d[i].volume;
            p.data[i].cmd = d[i].cmd;
            p.data[i].cmd_data = d[i].cmd_data;
          }
          p.updateTracklist();
        }
      }
      else if (state.sample) {
        const s = player.samples[state.sample.index];
        if (state.sample.type === 'data') {
          const d = state.sample.data;
          for (let src = 0, dst = state.sample.from || 0; src < d.length; src++, dst++) {
            s.data[dst].volume.byte = d[src].volume;
            s.data[dst].enable_freq = d[src].enable_freq;
            s.data[dst].enable_noise = d[src].enable_noise;
            s.data[dst].noise_value = d[src].noise_value;
            s.data[dst].shift = d[src].shift;
          }
        }
        else if (state.sample.type === 'props') {
          if (state.sample.name !== undefined) {
            s.name = state.sample.name;
          }
          if (state.sample.loop !== undefined) {
            s.loop = state.sample.loop;
          }
          if (state.sample.end !== undefined) {
            s.end = state.sample.end;
          }
          if (state.sample.releasable !== undefined) {
            s.releasable = state.sample.releasable;
          }
        }
      }
      else if (state.ornament) {
        const o = player.ornaments[state.ornament.index];
        if (state.ornament.type === 'data') {
          const d = state.ornament.data;
          for (let src = 0, dst = state.ornament.from || 0; src < d.length; src++, dst++) {
            o.data[dst] = d[src];
          }
        }
        else if (state.ornament.type === 'props') {
          if (state.ornament.name !== undefined) {
            o.name = state.ornament.name;
          }
          if (state.ornament.loop !== undefined) {
            o.loop = state.ornament.loop;
          }
          if (state.ornament.end !== undefined) {
            o.end = state.ornament.end;
          }
        }
      }

      this._applyHistoryStateContext(state, shouldUpdatePanels);
      return true;
    }

    return false;
  }

  public redo() {
  }

  private _applyHistoryStateContext(
    { context, pattern, sample, ornament }: UndoStateWithContext,
    shouldUpdatePanels: boolean = false
  ) {
    const app = this._parent;
    if (context.activeTab !== app.activeTab) {
      app.activeTab = context.activeTab || 0;
      $('#main-tabpanel a').eq(app.activeTab).tab('show');
    }

    if (app.activeTab === 1) {
      if (context.smpeditShiftShown !== app.smpornedit.smpeditShiftShown) {
        app.smpornedit.smpeditShiftShown = context.smpeditShiftShown || false;
        $(`#tab-${
          app.smpornedit.smpeditShiftShown ? 'sampledata' : 'pitchshift'
        }`).tab('show');
      }
      if (context.workingSample !== app.workingSample) {
        app.workingSample = context.workingSample ?? 1;
        $('#scSampleNumber').val(app.workingSample.toString(32).toUpperCase());
      }

      app.updateSampleEditor(true);
    }
    else if (app.activeTab === 2) {
      if (context.workingOrnament !== app.workingOrnament) {
        app.workingOrnament = context.workingOrnament ?? 1;
        $('#scOrnNumber').val(app.workingOrnament.toString(16).toUpperCase());
      }
      app.smpornedit.updateOrnamentEditor(true);
    }

    if (context.workingPattern !== app.workingPattern) {
      app.workingPattern = context.workingPattern || 0;
      $('#scPattern').val(app.workingPattern.toString());
      shouldUpdatePanels = true;
    }
    if (context.currentPosition !== app.player.position) {
      app.player.position = context.currentPosition || 0;
      $('#scPosCurrent').val((app.player.position + 1).toString());
      shouldUpdatePanels = true;
    }

    if (shouldUpdatePanels) {
      app.updatePanels();
    }

    if (context.currentLine !== app.player.line) {
      app.player.line = context.currentLine || 0;
    }
    if (pattern) {
      app.updateEditorCombo(0);
    }
    if (sample) {
      app.smpornedit.updateSamplePitchShift();
    }
    if (ornament) {
      app.smpornedit.updateOrnamentEditor();
    }

    app.modeEditChannel = context.modeEditChannel;
    app.modeEditColumn = context.modeEditColumn;
    app.onCmdToggleEditMode(context.modeEdit);
  }
}
