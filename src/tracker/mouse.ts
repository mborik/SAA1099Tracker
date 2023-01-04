/**
 * SAA1099Tracker: Mouse events handler prototype.
 * Copyright (c) 2012-2023 Martin Borik <martin@borik.net>
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

import { browser } from '../commons/browser';
import SmpOrnEditor from './smporn';
import Tracklist from './tracklist';
import Tracker from '.';


Tracker.prototype.handleMouseEvent = function(part: string, inputObj: any, e: JQueryEventObject) {
  let x = e.pageX || 0, y = e.pageY || 0;
  const leftButton = browser.isFirefox ?
    (!!(e.buttons & 1) || (e.type !== 'mousemove' && e.button === 0)) :
    (e.which === 1);

  if (part === 'tracklist') {
    const obj = <Tracklist> inputObj;
    let redraw = false;
    const p = this.player;
    const pp = p.positions[p.position];
    const sel = obj.selection;
    const offset = obj.canvasData.offset;
    const point = obj.pointToTracklist(x - offset.left, y - offset.top);
    const line = p.line;
    let len;

    if (this.modePlay || !pp) {
      return;
    }

    if (point) {
      point.line = Math.min(point.line, pp.length - 1);
      len = point.line - sel.start.line;
    }
    else if (e.type !== 'mousewheel') {
      return;
    }

    if (e.type === 'mousewheel') {
      if (document.activeElement !== e.target) {
        (<HTMLElement> document.activeElement).blur();
      }

      if (e.delta < 0) {
        obj.moveCurrentline(1);
      }
      else if (e.delta > 0) {
        obj.moveCurrentline(-1);
      }

      redraw = true;
    }
    else if (e.type === 'mousedown') {
      if (leftButton && point.line < pp.length) {
        sel.start.set(point);
      }
    }
    else if (e.type === 'mouseup' && leftButton) {
      if (sel.isDragging) {
        sel.len = len;
        sel.line = sel.start.line;
        sel.channel = sel.start.channel;
        sel.isDragging = false;
        redraw = true;
      }
      else {
        if (!this.modeEdit) {
          e.target.focus();
        }

        if (point.line === line) {
          this.modeEditChannel = sel.start.channel;
          this.modeEditColumn = sel.start.column;
          redraw = true;
        }
      }
    }
    else if (e.type === 'dblclick' && leftButton) {
      if (sel.len === 0 ||
        sel.channel !== point.channel ||
        (sel.line + sel.len) !== point.line) {

        sel.len = 0;
        sel.line = point.line;
        sel.channel = point.channel;
        sel.isDragging = false;
      }

      if (!this.modeEdit) {
        e.target.focus();
      }

      this.modeEditChannel = sel.start.channel;
      this.modeEditColumn = sel.start.column;
      p.line = point.line;
      redraw = true;
    }
    else if (e.type === 'mousemove' && leftButton && !point.compare(sel.start)) {
      if (len > 0) {
        sel.len = len;
        sel.line = sel.start.line;
        sel.channel = sel.start.channel;
        sel.isDragging = true;
      }

      if (point.y === (this.settings.tracklistLines - 1)) {
        obj.moveCurrentline(1, true);
      }

      redraw = true;
    }

    if (redraw) {
      if (!sel.isDragging && e.type !== 'mousewheel') {
        let cmd = 0;
        if (this.modeEditColumn >= 5) {
          const chn = this.modeEditChannel;
          const pt = pp.ch[chn].pattern;
          const patt = p.patterns[pt];
          cmd = patt.data[line].cmd;
        }

        this.doc.showTracklistStatus(this.modeEditColumn, cmd);
      }

      this.updateTracklist();
      this.updatePanelInfo();
    }
  }
  else {
    const obj = <SmpOrnEditor> inputObj;
    const sample = this.player.samples[this.workingSample];
    const dragging = /mouse(down|move)/.test(e.type);
    let update = false;
    let redrawAll = false;

    x -= (obj.smpeditOffset.left + obj.centering);
    if (x < 0) {
      return;
    }

    if (e.type === 'mousedown') {
      obj.historyEntry = {
        data: sample.simplify(),
        dataFrom: Infinity,
        dataTo: -Infinity,
        loop: sample.loop,
        end: sample.end
      };
    }

    x = Math.min(0 | (x / obj.columnWidth), 63) + obj.smpeditScroll;
    let limitFrom = x, limitTo = x;
    const data = sample.data[x];

    if (obj.historyEntry) {
      obj.historyEntry.dataFrom = Math.min(obj.historyEntry.dataFrom, x);
      obj.historyEntry.dataTo = Math.max(obj.historyEntry.dataTo, x);
    }

    if (part === 'amp') {
      y -= obj.smpeditOffset.top.amp;

      const ampHeight = obj.amp.obj.height - 24;
      const ampLeftChn = (y < obj.halfing);
      const freqEnableSection = (y > (ampHeight + 3)) || obj.drag.isDragging;

      if (freqEnableSection && leftButton) {
        let state: boolean;

        if (e.type === 'mousedown') {
          state = obj.drag.freqEnableState = !data.enable_freq;
          obj.drag.isDragging = true;
        }
        else if (e.type === 'mouseup') {
          state = obj.drag.freqEnableState;
          obj.drag.isDragging = false;
        }
        else if (obj.drag.isDragging && e.type === 'mousemove') {
          state = obj.drag.freqEnableState;
        }

        if (data.enable_freq !== state) {
          data.enable_freq = state;
          update = true;
        }
      }
      else if (e.type === 'mousewheel') {
        this.manager.historyPush({
          sample: {
            type: 'data',
            index: this.workingSample,
            data: [{
              ...data,
              volume: data.volume.byte
            }],
            from: x,
          }
        }, {
          dataType: 'sample',
          checkProps: { from: x, 'data.length': 1 },
          prop: 'data'
        });

        const delta = e.delta / Math.abs(e.delta);

        if (ampLeftChn) {
          data.volume.L = Math.max(Math.min(data.volume.L + delta, 15), 0);
        }
        else {
          data.volume.R = Math.max(Math.min(data.volume.R - delta, 15), 0);
        }

        update = true;
      }
      else if (dragging && leftButton) {
        if (ampLeftChn) {
          data.volume.L = Math.max(15 - (0 | (y / 9)), 0);
        }
        else {
          data.volume.R = Math.max(15 - (0 | ((ampHeight - y) / 9)), 0);
        }

        update = true;
      }
    }
    else if (part === 'noise') {
      let noise = (+data.enable_noise) * (data.noise_value + 1);
      y -= obj.smpeditOffset.top.noise;

      if (e.type === 'mousewheel') {
        this.manager.historyPush({
          sample: {
            type: 'data',
            index: this.workingSample,
            data: [{
              ...data,
              volume: data.volume.byte
            }],
            from: x,
          }
        }, {
          dataType: 'sample',
          checkProps: { from: x, 'data.length': 1 },
          prop: 'data'
        });

        noise += e.delta / Math.abs(e.delta);
        update = true;
      }
      else if (dragging && leftButton) {
        noise = 4 - (0 | (y / 9));
        update = true;
      }

      if (update) {
        noise = Math.min(Math.max(noise, 0), 4);

        data.enable_noise = !!noise;
        data.noise_value = Math.max(--noise, 0);
      }
    }
    else if (part === 'range' && leftButton) {
      if (e.type === 'mouseup') {
        obj.drag.isDragging = false;
        update = true;
      }
      else if (e.type === 'mousedown') {
        obj.drag.isDragging = 1;
        obj.drag.rangeStart = x;
        update = true;
      }
      else if (obj.drag.isDragging && e.type === 'mousemove') {
        obj.drag.isDragging = 2;
        update = true;
      }

      if (update) {
        if (x === obj.drag.rangeStart) {
          if (obj.drag.isDragging === 2) {
            sample.end = x + 1;
            sample.loop = x;
          }
          else if (obj.drag.isDragging === 1) {
            sample.end = ++x;
            sample.loop = x;
          }
        }
        else if (x > obj.drag.rangeStart) {
          sample.end = ++x;
          sample.loop = obj.drag.rangeStart;
        }
        else {
          sample.end = obj.drag.rangeStart + 1;
          sample.loop = x;
        }

        redrawAll = true;

        if (obj.drag.isDragging === 1) {
          limitFrom = limitTo = undefined;
        }
        else {
          limitFrom = sample.loop - 1;
          limitTo = sample.end;
        }
      }
    }

    if (e.type === 'mouseup' && leftButton) {
      this.manager.historyPush({
        sample: (part === 'range') ? {
          type: 'props',
          index: this.workingSample,
          loop: obj.historyEntry.loop,
          end: obj.historyEntry.end
        } : {
          type: 'data',
          index: this.workingSample,
          from: obj.historyEntry.dataFrom,
          data: obj.historyEntry.data.slice(obj.historyEntry.dataFrom, obj.historyEntry.dataTo + 1)
        }
      });
    }
    if (update) {
      this.updateSampleEditor(redrawAll, limitFrom, limitTo);
      this.file.modified = true;
    }
  }
};
//---------------------------------------------------------------------------------------
