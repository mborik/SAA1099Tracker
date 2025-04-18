/**
 * SAA1099Tracker: History manager class and dependent interfaces.
 * Copyright (c) 2022-2025 Martin Borik <martin@borik.net>
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

import dashGet from 'dash-get';
import { MAX_PATTERN_LEN } from '../player/globals';
import Ornament from '../player/Ornament';
import Pattern, { PatternSimplified } from '../player/Pattern';
import Position from '../player/Position';
import { SampleSimplified } from '../player/Sample';
import Tracker from '.';


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
    modeEdit: boolean;
    modeEditChannel: number;
    modeEditColumn: number;
    currentPosition: number;
    currentLine: number;
    workingPattern: number;
    workingPatternTarget: number;
    workingSample: number;
    workingOrnament: number;
    smpeditShiftShown: boolean;
  };

  doRedo?: () => void;
}

export default class ManagerHistory {
  protected _history: UndoStateWithContext[] = [null];
  protected _historyIndex = 0;

  constructor(public _parent: Tracker) {}

  public historyClear() {
    this._history.splice(1);
    this._historyIndex = 0;

    this._updateHistoryGUI();
  }

  public historyPush(
    state: UndoState = {},
    debounceOn?: {
      dataType: 'sample' | 'ornament' | 'pattern' | 'position';
      prop: string | (string | number)[];
      checkProps?: { [key: string]: any };
    }
  ) {
    if (this.isRedoAvailable()) {
      this._history.splice(this._historyIndex + 1);
    }
    if (this._historyIndex > 0 && debounceOn) {
      const lastEntry = this._history[this._historyIndex];
      const { dataType, prop, checkProps } = debounceOn;
      const last = lastEntry[dataType];
      if (
        lastEntry.timestamp + 1000 > Date.now() &&
        last && last.type === state[dataType]?.type &&
        dashGet(last, prop as string) && (
          !checkProps ||
          Object.entries(checkProps).every(
            ([key, value]) => dashGet(last, key) === value
          )
        )
      ) {
        return;
      }
    }

    const context = {
      activeTab: this._parent.activeTab,
      smpeditShiftShown: this._parent.smpornedit.smpeditShiftShown,
      modeEdit: this._parent.modeEdit,
      modeEditChannel: this._parent.modeEditChannel,
      modeEditColumn: this._parent.modeEditColumn,
      currentPosition: this._parent.player.position,
      currentLine: this._parent.player.line,
      workingPattern: this._parent.workingPattern,
      workingPatternTarget: this._parent.workingPatternTarget,
      workingSample: this._parent.workingSample,
      workingOrnament: this._parent.workingOrnament,
    };

    if (process.env.NODE_ENV === 'development') {
      const [dataType] = Object.keys(state);
      // eslint-disable-next-line
      console.info.apply(console, [
        `%c[History]%c ${debounceOn ? 'Debounced' : 'New'} ${dataType} entry:`, 'color:rosybrown', 'color:inherit',
        { ...state[dataType as keyof UndoState], context }
      ]);
    }

    this._history.push({
      ...state,
      timestamp: Date.now(),
      context
    });

    this._historyIndex++;
    this._updateHistoryGUI();
  }

  public historyPushSampleDebounced(index: number = this._parent.workingSample) {
    const data = this._parent.player.samples[index]?.simplify() ?? [];
    const from = 0;

    this.historyPush({
      sample: {
        type: 'data',
        index,
        from,
        data
      }
    }, {
      dataType: 'sample',
      checkProps: { index, from, 'data.length': data.length },
      prop: 'data'
    });
  }

  public historyPushOrnamentDebounced(index: number = this._parent.workingOrnament) {
    const data = this._parent.player.ornaments[index]?.data;
    if (!data) {
      return;
    }
    this.historyPush({
      ornament: {
        type: 'data',
        index,
        from: 0,
        data
      }
    }, {
      dataType: 'ornament',
      checkProps: { index, from: 0, 'data.length': data.length },
      prop: 'data'
    });
  }

  public isUndoAvailable(): boolean {
    return this._historyIndex > 0;
  }

  public isRedoAvailable(): boolean {
    return this._historyIndex < (this._history.length - 1);
  }

  public undo() {
    if (this.isUndoAvailable()) {
      const state = this._history[this._historyIndex];
      this._historyIndex--;

      if (!state) {
        return false;
      }
      if (process.env.NODE_ENV === 'development') {
        const [dataType] = Object.keys(state);
        // eslint-disable-next-line
        console.info.apply(console, [
          `%c[History]%c Undoing ${dataType} entry:`, 'color:rosybrown', 'color:inherit',
          { ...state[dataType as keyof UndoState], context: state.context }
        ]);
      }

      this._createRedoStateFunction(state);

      const app = this._parent;
      const player = app.player;

      if (state.pattern) {
        const p = player.patterns[state.pattern.index];
        if (state.pattern.type === 'data') {
          const d = state.pattern.data;
          for (let src = 0, dst = state.pattern.from ?? 0; src < d.length; src++, dst++) {
            p.data[dst].tone = d[src].tone;
            p.data[dst].release = d[src].release;
            p.data[dst].smp = d[src].smp;
            p.data[dst].orn = d[src].orn;
            p.data[dst].orn_release = d[src].orn_release;
            p.data[dst].volume.byte = d[src].volume;
            p.data[dst].cmd = d[src].cmd;
            p.data[dst].cmd_data = d[src].cmd_data;
          }
          p.updateTracklist();
        }
        else if (state.pattern.type === 'length') {
          p.end = state.pattern.end;
          p.updateTracklist();
        }
        else if (state.pattern.type === 'create') {
          player.patterns.splice(state.pattern.index, 1);
        }
        else if (state.pattern.type === 'remove') {
          if (state.pattern.index !== player.patterns.length) {
            console.error('Manager: Undo of removing pattern - invalid index (not last)!');
          }
          const d = state.pattern.data;
          const p = new Pattern(state.pattern.end);
          for (let i = 0; i < MAX_PATTERN_LEN; i++) {
            p.data[i].tone = d[i].tone;
            p.data[i].release = d[i].release;
            p.data[i].smp = d[i].smp;
            p.data[i].orn = d[i].orn;
            p.data[i].orn_release = d[i].orn_release;
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
          for (let src = 0, dst = state.sample.from ?? 0; src < d.length; src++, dst++) {
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
          for (let src = 0, dst = state.ornament.from ?? 0; src < d.length; src++, dst++) {
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
      else if (state.position) {
        const p = player.positions[state.position.index];
        const d = state.position;
        if (d.type === 'data') {
          const ch = p.ch[d.channel];
          if (d.pattern !== undefined) {
            ch.pattern = d.pattern;
          }
          if (d.pitch !== undefined) {
            ch.pitch = d.pitch;
          }
        }
        else if (d.type === 'props') {
          if (d.length !== undefined) {
            p.length = d.length;
          }
          if (d.speed !== undefined) {
            p.speed = d.speed;
          }
        }
        else if (d.type === 'create') {
          player.positions.splice(state.position.index, 1);
        }
        else if (d.type === 'remove') {
          const p = this._parent.player;
          const pos = p.addNewPosition(d.length, d.speed, false);

          for (let chn = 0; chn < 6; chn++) {
            pos.ch[chn].pattern = d.data[chn].pattern;
            pos.ch[chn].pitch = d.data[chn].pitch;
          }

          p.positions.splice(d.index, 0, pos);
          p.countPositionFrames(d.index);
          p.storePositionRuntime(d.index);
        }
        else if (d.type === 'move') {
          const p = this._parent.player;
          const swap = p.positions[d.to];
          p.positions[d.to] = p.positions[d.index];
          p.positions[d.index] = swap;
        }
      }

      this._applyHistoryStateContext(state);
      this._updateHistoryGUI();
      return true;
    }

    return false;
  }

  public redo() {
    if (this.isRedoAvailable()) {
      this._historyIndex++;
      const state = this._history[this._historyIndex];
      if (!state?.doRedo) {
        return false;
      }

      state.doRedo();
      this._applyHistoryStateContext(state);
      this._updateHistoryGUI();
      return true;
    }

    return false;
  }

  //-------------------------------------------------------------------------------------
  private _createRedoStateFunction(state: UndoStateWithContext) {
    const player = this._parent.player;

    if (state.pattern) {
      const p = player.patterns[state.pattern.index];
      if (state.pattern.type === 'data') {
        const from = state.pattern.from ?? 0;
        const backup = p.simplify(from, from + state.pattern.data.length);
        state.doRedo = () => {
          for (let src = 0, dst = from; src < backup.length; src++, dst++) {
            p.data[dst].tone = backup[src].tone;
            p.data[dst].release = backup[src].release;
            p.data[dst].smp = backup[src].smp;
            p.data[dst].orn = backup[src].orn;
            p.data[dst].orn_release = backup[src].orn_release;
            p.data[dst].volume.byte = backup[src].volume;
            p.data[dst].cmd = backup[src].cmd;
            p.data[dst].cmd_data = backup[src].cmd_data;
          }
          p.updateTracklist();
        };
      }
      else if (state.pattern.type === 'length') {
        const backupEnd = p.end;
        state.doRedo = () => {
          p.end = backupEnd;
          p.updateTracklist();
        };
      }
      else if (state.pattern.type === 'create') {
        const backup = p.simplify();
        const backupEnd = p.end;
        state.doRedo = () => {
          const p = new Pattern(backupEnd);
          for (let i = 0; i < MAX_PATTERN_LEN; i++) {
            p.data[i].tone = backup[i].tone;
            p.data[i].release = backup[i].release;
            p.data[i].smp = backup[i].smp;
            p.data[i].orn = backup[i].orn;
            p.data[i].orn_release = backup[i].orn_release;
            p.data[i].volume.byte = backup[i].volume;
            p.data[i].cmd = backup[i].cmd;
            p.data[i].cmd_data = backup[i].cmd_data;
          }
          p.updateTracklist();
        };
      }
      else if (state.pattern.type === 'remove') {
        if (state.pattern.index !== player.patterns.length) {
          console.error('Manager: Undo of removing pattern - invalid index (not last)!');
        }
        const backupIndex = state.pattern.index;
        state.doRedo = () => {
          player.patterns.splice(backupIndex, 1);
        };
      }
    }
    else if (state.sample) {
      const s = player.samples[state.sample.index];
      if (state.sample.type === 'data') {
        const from = state.sample.from ?? 0;
        const backup = s.simplify(from, from + state.sample.data.length);
        state.doRedo = () => {
          for (let src = 0, dst = from; src < backup.length; src++, dst++) {
            s.data[dst].volume.byte = backup[src].volume;
            s.data[dst].enable_freq = backup[src].enable_freq;
            s.data[dst].enable_noise = backup[src].enable_noise;
            s.data[dst].noise_value = backup[src].noise_value;
            s.data[dst].shift = backup[src].shift;
          }
        };
      }
      else if (state.sample.type === 'props') {
        const backup = {
          name: (state.sample.name !== undefined ? s.name : undefined),
          loop: (state.sample.loop !== undefined ? s.loop : undefined),
          end: (state.sample.end !== undefined ? s.end : undefined),
          releasable: (state.sample.name !== undefined ? s.releasable : undefined),
        };
        state.doRedo = () => {
          if (backup.name !== undefined) {
            s.name = backup.name;
          }
          if (backup.loop !== undefined) {
            s.loop = backup.loop;
          }
          if (backup.end !== undefined) {
            s.end = backup.end;
          }
          if (backup.releasable !== undefined) {
            s.releasable = backup.releasable;
          }
        };
      }
    }
    else if (state.ornament) {
      const o = player.ornaments[state.ornament.index];
      if (state.ornament.type === 'data') {
        const from = state.ornament.from ?? 0;
        const backup = o.data.slice(from, from + state.ornament.data.length);
        state.doRedo = () => {
          for (let src = 0, dst = from; src < backup.length; src++, dst++) {
            o.data[dst] = backup[src];
          }
        };
      }
      else if (state.ornament.type === 'props') {
        const backup = {
          name: (state.ornament.name !== undefined ? o.name : undefined),
          loop: (state.ornament.loop !== undefined ? o.loop : undefined),
          end: (state.ornament.end !== undefined ? o.end : undefined),
        };
        state.doRedo = () => {
          if (backup.name !== undefined) {
            o.name = backup.name;
          }
          if (backup.loop !== undefined) {
            o.loop = backup.loop;
          }
          if (backup.end !== undefined) {
            o.end = backup.end;
          }
        };
      }
    }
    else if (state.position) {
      const p = player.positions[state.position.index];
      if (state.position.type === 'data') {
        const ch = p.ch[state.position.channel];
        const backup = {
          pattern: (state.position.pattern !== undefined ? ch.pattern : undefined),
          pitch: (state.position.pitch !== undefined ? ch.pitch : undefined),
        };
        state.doRedo = () => {
          if (backup.pattern !== undefined) {
            ch.pattern = backup.pattern;
          }
          if (backup.pitch !== undefined) {
            ch.pitch = backup.pitch;
          }
        };
      }
      else if (state.position.type === 'props') {
        const backup = {
          length: (state.position.length !== undefined ? p.length : undefined),
          speed: (state.position.speed !== undefined ? p.speed : undefined),
        };
        state.doRedo = () => {
          if (backup.length !== undefined) {
            p.length = backup.length;
          }
          if (backup.speed !== undefined) {
            p.speed = backup.speed;
          }
        };
      }
      else if (state.position.type === 'create') {
        const backup = {
          ch: p.ch.map(ch => ({ pattern: ch.pattern, pitch: ch.pitch })),
          length: p.length,
          speed: p.speed
        };
        state.doRedo = () => {
          const pos = player.addNewPosition(backup.length, backup.speed, false);

          for (let chn = 0; chn < 6; chn++) {
            pos.ch[chn].pattern = backup.ch[chn].pattern;
            pos.ch[chn].pitch = backup.ch[chn].pitch;
          }

          player.positions.splice(state.position.index, 0, pos);
          player.countPositionFrames(state.position.index);
          player.storePositionRuntime(state.position.index);
        };
      }
      else if (state.position.type === 'remove') {
        const backupIndex = state.position.index;
        state.doRedo = () => {
          player.positions.splice(backupIndex, 1);
        };
      }
      else if (state.position.type === 'move') {
        const backupFrom = state.position.index;
        const backupTo = state.position.to;
        state.doRedo = () => {
          const swap = player.positions[backupFrom];
          player.positions[backupFrom] = player.positions[backupTo];
          player.positions[backupTo] = swap;
        };
      }
    }
  }

  private _applyHistoryStateContext(
    { context, pattern, position, sample, ornament }: UndoStateWithContext,
  ) {
    let shouldUpdateTracker = !!pattern || !!position;
    let shouldUpdateSmpEdit = !!sample;
    let shouldUpdateOrnEdit = !!ornament;

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
      shouldUpdateSmpEdit = false;
    }
    else if (app.activeTab === 2) {
      if (context.workingOrnament !== app.workingOrnament) {
        app.workingOrnament = context.workingOrnament ?? 1;
        $('#scOrnNumber').val(app.workingOrnament.toString(16).toUpperCase());
      }
      app.smpornedit.updateOrnamentEditor(true);
      shouldUpdateOrnEdit = false;
    }

    if (context.workingPattern !== app.workingPattern) {
      app.workingPattern = context.workingPattern || 0;
      $('#scPatCurrent').val(app.workingPattern.toString());
      shouldUpdateTracker = true;
    }
    if (context.workingPatternTarget !== app.workingPatternTarget) {
      app.workingPatternTarget = context.workingPatternTarget || 0;
      $('#scPatCurrent').val(app.workingPatternTarget.toString());
      shouldUpdateTracker = true;
    }
    if (context.currentPosition !== app.player.position) {
      app.player.position = context.currentPosition || 0;
      $('#scPosCurrent').val((app.player.position + 1).toString());
      shouldUpdateTracker = true;
    }

    if (shouldUpdateTracker) {
      app.updatePanels();
    }
    if (context.currentLine !== app.player.line) {
      app.player.line = context.currentLine || 0;
    }
    if (shouldUpdateTracker) {
      app.updateEditorCombo(0);
    }
    if (shouldUpdateSmpEdit) {
      app.smpornedit.updateSamplePitchShift();
    }
    if (shouldUpdateOrnEdit) {
      app.smpornedit.updateOrnamentEditor();
    }

    app.modeEditChannel = context.modeEditChannel;
    app.modeEditColumn = context.modeEditColumn;
    app.onCmdToggleEditMode(context.modeEdit);
  }

  private _updateHistoryGUI() {
    $('#miEditUndo').parent().toggleClass('disabled', !this.isUndoAvailable());
    $('#miEditRedo').parent().toggleClass('disabled', !this.isRedoAvailable());
  }
}
