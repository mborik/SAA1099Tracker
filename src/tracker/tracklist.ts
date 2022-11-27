/**
 * SAA1099Tracker: Tracklist class and dependent interfaces.
 * Copyright (c) 2012-2022 Martin Borik <martin@borik.net>
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

import { devLog } from '../commons/dev';
import Tracker from '.';

export interface TracklistStartPoint {
  x: number;
  y: number;
}

export class TracklistPosition {
  start: TracklistStartPoint;

  constructor(
    public y: number = 0,
    public line: number = 0,
    public channel: number = 0,
    public column: number = 0,
    sx: number = 0,
    sy: number = 0) {

    this.start = { x: sx, y: sy };
  }

  set<P = TracklistPosition>(p: P): void {
    if (p instanceof TracklistPosition) {
      this.y = p.y;
      this.line = p.line;
      this.channel = p.channel;
      this.column = p.column;
      this.start.x = p.start.x;
      this.start.y = p.start.y;
    }
  }
  compare<P = TracklistPosition>(p: P): boolean {
    if (p instanceof TracklistPosition) {
      return (this.y === p.y &&
          this.line === p.line &&
          this.channel === p.channel &&
          this.column === p.column);
    }

    return false;
  }
}

export interface TracklistSelection {
  isDragging: boolean;
  start: TracklistPosition;

  len: number;
  line: number;
  channel: number;
}

export interface TracklistCanvasData {
  columns: number[];

  selWidth: number;
  chnWidth: number;
  lineWidth: number;
  vpad: number;
  center: number;
  trkOffset: number;

  offset: JQueryCoordinates;
}

export interface TracklistOffsets {
  x: number[][];
  y: number[];
}

//---------------------------------------------------------------------------------------
export const tracklistZoomFactor: number = 2;
export const fontWidth: number = 6;

export default class Tracklist {
  constructor(private _parent: Tracker) {}

  initialized: boolean = false;

  obj: Nullable<HTMLCanvasElement> = null;
  ctx: Nullable<CanvasRenderingContext2D> = null;

  canvasData: TracklistCanvasData = {
    // offsets to column positions in channel data premultiplied by fontWidth:
    //         0   4567 9AB
    //        "A-4 ABFF C01"
    columns: [ 0, 4, 5, 6, 7, 9, 10, 11 ].map(c => c * fontWidth),

    // selection width: (12 columns + 1 padding) * fontWidth
    selWidth: (12 + 1) * fontWidth,

    // channel width: (12 columns + 2 padding) * fontWidth
    chnWidth: (12 + 2) * fontWidth,

    // trackline width:
    // (((12 columns + 2 padding) * 6 channels) + 2 tracknum.columns) * fontWidth
    lineWidth: (((12 + 2) * 6) + 2) * fontWidth,

    // vertical padding of pixelfont in trackline height
    vpad: 0,

    // horizontal centering of trackline to canvas width
    center: 0,

    // trackline data offset: center + (2 tracknums + 2 padding) * fontWidth
    get trkOffset(): number {
      return this.center + (4 * fontWidth);
    },

    // jQuery offset object
    offset: null
  };

  offsets: TracklistOffsets = {
    // 6 channels of 8 column (+1 padding) positions
    x: [ new Array(9), new Array(9), new Array(9), new Array(9), new Array(9), new Array(9) ],
    y: []
  };

  selection: TracklistSelection = {
    isDragging: false,
    start: new TracklistPosition(),
    len: 0,
    line: 0,
    channel: 0
  };

  countTracklines(): number {
    const s = $('#statusbar').offset();
    const t = $('#tracklist').offset();
    const h = this._parent.settings.tracklistLineHeight;

    return Math.max(((((s.top - t.top) / h / tracklistZoomFactor) | 1) - 2), 5);
  }

  setHeight(height: number) {
    const settings = this._parent.settings;

    let newHeight = settings.tracklistAutosize ? height : Math.min(settings.tracklistLines, height);

    if (settings.tracklistLines === newHeight) {
      devLog('Tracker.tracklist', 'Computed %d tracklines...', newHeight);
    }

    settings.tracklistLines = newHeight;
    newHeight *= settings.tracklistLineHeight;

    $(this.obj).prop('height', newHeight).css({
      height: (newHeight * tracklistZoomFactor)
    });

    this.canvasData.offset = $(this.obj).offset();
  }

  moveCurrentline(delta: number, noWrap: boolean = false) {
    const player = this._parent.player;
    let line = player.line + delta;
    const pos = player.position;
    const pp = player.positions[pos];

    if (this._parent.modePlay || pp == null) {
      return;
    }

    if (noWrap) {
      line = Math.min(Math.max(line, 0), pp.length - 1);
    }
    else if (line < 0) {
      line += pp.length;
    }
    else if (line >= pp.length) {
      line -= pp.length;
    }

    player.line = line;
  }

  pointToTracklist(x: number, y: number): Nullable<TracklistPosition> {
    const lines: number = this._parent.settings.tracklistLines;
    const tx: number = x / tracklistZoomFactor;
    const ty: number = y / tracklistZoomFactor;
    let ln: number = this._parent.player.line - (lines >> 1);

    for (let i = 0; i < lines; i++, ln++) {
      if (ty >= this.offsets.y[i] && ty <= this.offsets.y[i + 1]) {
        for (let chl = 0; chl < 6; chl++) {
          if (tx >= this.offsets.x[chl][0] && tx <= this.offsets.x[chl][8]) {
            for (let j = 0; j < 8; j++) {
              if (tx >= this.offsets.x[chl][j] && tx <= this.offsets.x[chl][j + 1]) {
                return new TracklistPosition(i, Math.max(ln, 0), chl, j, x, y);
              }
            }
          }
        }
      }
    }

    return null;
  }
}
//---------------------------------------------------------------------------------------
