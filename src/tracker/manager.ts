/**
 * SAA1099Tracker: Clipboard and tracklist manager class and dependent interfaces.
 * Copyright (c) 2015-2023 Martin Borik <martin@borik.net>
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

import Pattern from '../player/Pattern';
import ManagerHistory from './manager.history';
import { TracklistSelection } from './tracklist';
import Tracker from '.';


interface SelectedBlock {
  pt: number;
  pp: Pattern;
  line: number;
  len: number;
}

export default class Manager extends ManagerHistory {
  private _clipboard: Clipboard;

  constructor(_parent: Tracker) {
    super(_parent);

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
        data: block.pp.simplify(block.line, block.line + block.len),
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
}
