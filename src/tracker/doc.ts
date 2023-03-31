/**
 * SAA1099Tracker: Text resources & i18n.
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

import Tracker from '.';

export interface TrackerDoc {
  i18n: any;
  statusbar: string[];
  tooltip: { [key: string]: string };
  txtCache: { [key: string]: string };
  setStatusText: (status?: number) => void;
  showTracklistStatus: (column: number, command: number) => void;
  i18nInit: () => void;
}

//---------------------------------------------------------------------------------------
Tracker.prototype.doc = {
  // ajax cache for text documentations:
  txtCache: {},

  i18n: {
    'app.smpedit.left': 'LEFT',
    'app.smpedit.right': 'RIGHT',
    'app.filedialog.untitled': 'Untitled',
    'app.filedialog.title.load': 'Open file from storage',
    'app.filedialog.title.save': 'Save file to storage',
    'dialog.file.new.title': 'Create new file...',
    'dialog.file.new.msg': 'Do you really want to clear all song data and lost all of your changes?',
    'dialog.file.open.title': 'Open file...',
    'dialog.file.open.msg': 'You could lose all your changes! Do you really want to continue?',
    'dialog.file.import.title': 'Import file...',
    'dialog.file.remove.title': 'Remove file...',
    'dialog.file.remove.msg': 'Do you really want to remove this file from storage?',
    'dialog.paste.title': 'Paste special...',
    'dialog.paste.btn': 'Paste',
    'dialog.pattern.delete.title': 'Delete pattern...',
    'dialog.pattern.delete.msg.used': 'This pattern is used in some positions! It would be replaced by zero patterns.\b\bPlease note that undo history will contains all needed position changes.\b\bAre you sure you want to delete the pattern?',
    'dialog.pattern.delete.msg.notlast': 'This is not the last pattern in a row and there is necessary to renumber all of the further patterns accross all positions!\b\b⚠️ Please note that all of your undo history will be lost after this irreversible operation.\b\bDo you really want to continue?',
    'dialog.pattern.delete.msg.sure': 'Are you sure you want to delete this pattern?',
    'dialog.pattern.clean.title': 'Clean pattern...',
    'dialog.pattern.clean.msg': 'Are you sure you want to clean a content of this pattern?',
    'dialog.pattern.compress.title': 'Compress pattern...',
    'dialog.pattern.compress.msg': 'Pattern will be narrowed by discarding every even trackline and length of pattern will halven.\b\bDo you really want to continue?',
    'dialog.pattern.expand.title': 'Expand pattern...',
    'dialog.pattern.expand.msg': 'Pattern will be doubled by inserting one empty line after every trackline of current pattern.\bPlease note that if current pattern is too long, it may be truncated.\b\bDo you really want to continue?',
    'dialog.pattern.swap.title': 'Swap source pattern with target...',
    'dialog.pattern.swap.msg': 'This is inverse operation. Undo snapshot will not be generated.\b\bDo you really want to continue?',
    'dialog.pattern.process.title': 'Process pattern data to target...',
    'dialog.pattern.process.btn': 'Process',
    'dialog.position.delete.title': 'Delete position...',
    'dialog.position.delete.msg': 'Are you sure you want to delete this position?',
    'dialog.sample.options': [ 'All', 'Amplitude', 'Noise', 'Pitch-shift', 'Cancel' ],
    'dialog.sample.clear.title': 'Clear sample...',
    'dialog.sample.clear.msg': 'Which sample data do you want to clear?',
    'dialog.sample.paste.title': 'Paste sample...',
    'dialog.sample.paste.msg': 'Which sample data do you want to overwrite from the clipboard?',
    'dialog.ornament.clear.title': 'Clear ornament...',
    'dialog.ornament.clear.msg': 'Are you sure you want to clear a content of this ornament?',
    'dialog.app.update.title': 'Application update available...',
    'dialog.app.update.msg': 'Updated version of SAA1099Tracker was found on server.\bRestart of application is required to install the update.',
    'dialog.app.update.options': [ 'Restart',  'Cancel' ],
    'dialog.app.update.download': 'restarting',
  },

  tooltip: {
    /* eslint-disable key-spacing */
    'miFileNew'       : 'New',
    'miFileOpen'      : 'Open [Mod+O]',
    'miFileSave'      : 'Save [Mod+S]',
    'miFileSaveAs'    : 'Save as...',
    'miEditCut'       : 'Cut [Mod+X]',
    'miEditCopy'      : 'Copy [Mod+C]',
    'miEditPaste'     : 'Paste [Mod+V]',
    'miEditClear'     : 'Clear [Mod+D]',
    'miEditUndo'      : 'Undo [Mod+Z]',
    'miEditRedo'      : 'Redo [Mod+Y | Mod+Shift+Z]',
    'miStop'          : 'Stop [Esc]',
    'miSongPlay'      : 'Play song [F5]',
    'miSongPlayStart' : 'Play song from start [F6]',
    'miPosPlay'       : 'Play position [F7]',
    'miPosPlayStart'  : 'Play position from start [F8]',
    'miToggleLoop'    : 'Toggle repeat [F9]',
    'miPreferences'   : 'Preferences [F10]',
    'scOctave'        : 'Base octave [Mod+1...Mod+8]',
    'scAutoSmp'       : 'Auto-typed sample',
    'scAutoOrn'       : 'Auto-typed ornament',
    'scRowStep'       : 'Row-step in edit mode [- Mod+9 | Mod+0 +]',
    'btPatternCreate' : 'Create a new pattern\nin length of current',
    'btPatternDup'    : 'Create a new pattern\nas a copy of current',
    'btPatternDelete' : 'Delete the current pattern\n(and renumber others if it isn\'t last one)',
    'btPatternInfo'   : 'View summary dialog of patterns',
    'scPattern'       : 'Current pattern number',
    'scPatternLen'    : 'Current pattern length',
    'txPatternUsed'   : 'How many times is the pattern used',
    'txPatternTotal'  : 'Total number of patterns',
    'btPosCreate'     : 'Create an empty position\nat the end of song',
    'btPosInsert'     : 'Create a copy of current position\nand insert before it',
    'btPosDelete'     : 'Delete the current position',
    'btPosMoveUp'     : 'Move the current position\nbefore the previous',
    'btPosMoveDown'   : 'Move the current position\nafter the next one',
    'scPosCurrent'    : 'Actual position to play or edit [- Mod+Shift+Left|Right +]',
    'scPosLength'     : 'Current position length',
    'scPosSpeed'      : 'Initial speed of current position',
    'scPosRepeat'     : 'Position number to repeat from',
    'txPosTotal'      : 'Total number of positions',
    'scChnButton'     : 'Mute/Unmute channels [Mod+Shift+1...6]',
    'scChnPattern'    : 'Assigned pattern for specific\nchannel in current position',
    'scChnTrans'      : 'Transposition of notes\nin specific channel-pattern',
    'scSampleNumber'  : 'Current sample ID',
    'txSampleName'    : 'Current sample description',
    'scSampleTone'    : 'Base tone and octave\nto test this sample',
    'btSamplePlay'    : 'Play current sample',
    'btSampleStop'    : 'Stop playback [Esc]',
    'btSampleSwap'    : 'Swap volume data between channels',
    'btSampleLVolUp'  : 'Volume up left channel',
    'btSampleLVolDown': 'Volume down left channel',
    'btSampleCopyLR'  : 'Copy volume data from left to right channel',
    'btSampleCopyRL'  : 'Copy volume data from right to left channel',
    'btSampleRVolUp'  : 'Volume up right channel',
    'btSampleRVolDown': 'Volume down right channel',
    'btSampleRotL'    : 'Shift whole sample data\nto the left side',
    'btSampleRotR'    : 'Shift whole sample data\nto the right side',
    'btSampleEnable'  : 'Enable frequency generator\nin full active sample length',
    'btSampleDisable' : 'Disable frequency generator\nin full sample length',
    'chSampleRelease' : 'Sample can continue in playing\nafter the loop section when\nthe note was released in tracklist',
    'scSampleLength'  : 'Length of current sample',
    'scSampleRepeat'  : 'Number of ticks at the end\nof sample which will be repeated',
    'scOrnNumber'     : 'Current ornament ID',
    'txOrnName'       : 'Current ornament description',
    'scOrnTestSample' : 'Sample ID to test ornament with',
    'scOrnTone'       : 'Base tone and octave\nto test this ornament',
    'btOrnPlay'       : 'Play current ornament\nwith test sample',
    'btOrnStop'       : 'Stop playback [Esc]',
    'btOrnShiftLeft'  : 'Shift whole ornament data\nto the left side',
    'btOrnShiftRight' : 'Shift whole ornament data\nto the right side',
    'btOrnTransUp'    : 'Transpose ornament data\nup a halftone',
    'btOrnTransDown'  : 'Transpose ornament data\ndown a halftone',
    'btOrnCompress'   : 'Compress ornament data\n(keep only every even line)',
    'btOrnExpand'     : 'Expand ornament data\n(duplicate each line)',
    'fxOrnChords'     : 'Replace current ornament with\npregenerated chord decomposition',
    'scOrnLength'     : 'Length of current ornament',
    'scOrnRepeat'     : 'Number of ticks at the end\nof ornament which will be repeated'
  },

  statusbar: [
    /*  0 */ 'NOTE - use alphanumeric keys as two-octave piano, for RELEASE note use [A], [1] or [-] key',
    /*  1 */ 'SAMPLE - [0] no change, [1 - V] to change current sample',
    /*  2 */ 'ORNAMENT - [0] no change, [1 - F] for ornament, or [X] for release ornament',
    /*  3 */ 'VOLUME CHANGE - [0] no change, [1 - F] for volume change in left channel',
    /*  4 */ 'VOLUME CHANGE - [0] no change, [1 - F] for volume change in right channel',
    /*  5 */ 'COMMAND - [0] no change, [1 - F] to use effect or command',
    /*  6 */ 'COMMAND: 1XY - portamento up',
    /*  7 */ 'COMMAND: 2XY - portamento down',
    /*  8 */ 'COMMAND: 3XY - glissando to given note',
    /*  9 */ 'COMMAND: 4XY - vibrato on current note',
    /* 10 */ 'COMMAND: 5XY - tremolo on current note',
    /* 11 */ 'COMMAND: 6XX - delay ornament',
    /* 12 */ 'COMMAND: 7XX - ornament offset',
    /* 13 */ 'COMMAND: 8XX - delay sample',
    /* 14 */ 'COMMAND: 9XX - sample offset',
    /* 15 */ 'COMMAND: AXY - volume slide',
    /* 16 */ 'COMMAND: BXX - break current channel-pattern and loop from line',
    /* 17 */ 'COMMAND: CXY - special command',
    /* 18 */ 'COMMAND: DXX - not implemented',
    /* 19 */ 'COMMAND: EXY - soundchip envelope or noise channel control',
    /* 20 */ 'COMMAND: FXX - change global speed',
    /* 21 */ 'COMMAND 1st parameter: period of change (in ticks)',
    /* 22 */ 'COMMAND 2nd parameter: pitch change in period (in cents)',
    /* 23 */ 'COMMAND parameter: delay (in ticks)',
    /* 24 */ 'COMMAND parameter: offset (in ticks)',
    /* 25 */ 'COMMAND 2nd parameter: volume change in period [- 9-F | 1-7 +]',
    /* 26 */ 'COMMAND parameter: trackline of current channel-pattern',
    /* 27 */ 'COMMAND parameter: [00] disable last command, [XY] false-chord, [F1] swap stereo channels',
    /* 28 */ 'COMMAND 1st parameter: [0, 1] enable envelope control, [D] disable, [2] enable noise control',
    /* 29 */ 'COMMAND 2nd parameter: [0-F] for envelope shape, [0-4] for noise control',
    /* 30 */ 'COMMAND parameter: speed of track listing (01-1F constant, otherwise XY for swing mode)',
    /* 31 */ 'COMMAND parameter: none',
  ],

  // helper functions for statusbar:
  lastStatus: undefined,
  setStatusText: function(status?: number) {
    const text = this.statusbar[status];

    if (text && status === this.lastStatus) {
      return;
    }

    $('#statusbar>p').html(!text ? '&nbsp;' : (
      text.replace(/(\[.+?\])/g, '<strong>$1</strong>')
        .replace(/^([\w ]+?)(\:| \-)/, '<kbd>$1</kbd>$2')
        .replace(/(\(.+?\))$/, '<em>$1</em>')
    ));

    this.lastStatus = status;
  },

  showTracklistStatus: function(column: number, command: number) {
    let i = column;

    if (column === 5) {
      i = command + 5;
    }
    else if (column > 5) {
      switch (command) {
        case 0x1:
        case 0x2:
        case 0x3:
        case 0x4:
        case 0x5:
          i = (column + 15);
          break;
        case 0x6:
        case 0x8:
          i = 23;
          break;
        case 0x7:
        case 0x9:
          i = 24;
          break;
        case 0xA:
          i = (column === 6) ? 21 : 25;
          break;
        case 0xB:
          i = 26;
          break;
        case 0xC:
          i = 27;
          break;
        case 0xE:
          i = (column + 22);
          break;
        case 0xF:
          i = 30;
          break;
        default:
          i = 31;
          break;
      }
    }

    this.setStatusText(i);
  },

  i18nInit: function() {
    Object.keys(this.i18n).forEach(idx => {
      let value = this.i18n[idx];
      const path = idx.split('.');
      const len = path.length;

      let p, i = 0;
      let deepIn = this.i18n;
      while (i < len) {
        p = path[i];
        deepIn[p] = deepIn[p] || {};

        if (++i === len) {
          break;
        }
        deepIn = deepIn[p];
      }

      if (typeof value === 'string') {
        value = value.replace('...', '\u2026').replaceAll('\b', '<br>');
      }

      deepIn[p] = value;
      delete this.i18n[idx];
    }, this);
  }
} as TrackerDoc & { lastStatus: number };
//---------------------------------------------------------------------------------------
export const i18n = Tracker.prototype.doc.i18n;
