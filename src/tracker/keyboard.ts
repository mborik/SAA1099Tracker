/**
 * SAA1099Tracker: Mouse events handler prototype.
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

import AudioDriver from '../commons/audio';
import { browser } from '../commons/browser';
import { logHotkey } from '../commons/dev';
import SyncTimer from '../commons/timer';
import { MAX_PATTERN_LEN } from '../player/globals';
import Tracker from '.';

export type HotkeyMapType = 'repeat' | 'keyup' | 'keydown' | 'test';
type HotkeyMapColumnHandler = { [key: number]: (k: number, test: boolean) => boolean };
//---------------------------------------------------------------------------------------
/*
  JavaScript KeyboardEvent keymap:
      8      Backspace
      9      Tab
     13      Enter
     16      Shift
     17      Ctrl
     18      Alt
     19      Pause
     20      CapsLock
     27      Esc
     32      Space
     33      PageUp
     34      PageDown
     35      End
     36      Home
     37      Left
     38      Up
     39      Right
     40      Down
     44      PrtScr
     45      Insert
     46      Delete
     48-57   0 to 9
     65-90   A to Z
     91      Win (left)
     92      Win (right)
     93      Menu
     96-105  Num0 to Num9
    106      Numpad *
    107      Numpad +
    109      Numpad -
    110      Numpad .
    111      Numpad /
    112-123  F1 to F12
    144      NumLock
    145      ScrLock
    173      Mute    (Firefox: 181)
    174      VolDown (Firefox: 182)
    175      VolUp   (Firefox: 183)
    186      ; :     (Firefox:  59)
    187      = +     (Firefox:  61)
    189      - _     (Firefox: 173)
    188      , <
    190      . >
    191      / ?
    192      ` ~
    219      [ {     (Opera: Win)
    220      \ |
    221      ] }
    222      ' "
*/
//---------------------------------------------------------------------------------------
Tracker.prototype.hotkeyMap = function(type: HotkeyMapType, group: string, key: number): (key: number) => void {
  const app = this;
  const cursors = (key > 32 && key < 41);
  const keyup = /keyup|test/.test(type);
  const keydown = /keydown|test/.test(type);

  switch (group) {
    case 'globalCtrl':
      if (!keyup) {
        return;
      }

      return {
        67: function() {
          logHotkey('Ctrl+C - Copy');
          app.onCmdEditCopy();
        },
        68: function() {
          logHotkey('Ctrl+D - Clear/Delete');
          app.onCmdEditClear();
        },
        79: function() {
          logHotkey('Ctrl+O - Open');
          app.onCmdFileOpen();
        },
        80: function() {
          logHotkey('Ctrl+P - Preferences');
        },
        83: function() {
          logHotkey('Ctrl+S - Save');
          app.onCmdFileSave();
        },
        86: function() {
          logHotkey('Ctrl+V - Paste');
          app.onCmdEditPaste();
        },
        88: function() {
          logHotkey('Ctrl+X - Cut');
          app.onCmdEditCut();
        },
        89: function() {
          logHotkey('Ctrl+Y - Redo');
        },
        90: function() {
          logHotkey('Ctrl+Z - Undo');
        }
      }[key];

    case 'globalFs':
      if (!keydown) {
        return;
      }

      return {
        27: function() {
          logHotkey('Esc - Stop');
          if (app.modePlay || app.activeTab > 0) {
            app.onCmdStop();
          }
          else if (app.modeEdit) {
            app.onCmdToggleEditMode();
          }
        },
        112: function() {
          logHotkey('F1 - About');
          app.onCmdAbout();
        },
        113: function() {
          logHotkey('F2 - Tracklist Editor');
          $('#tab-tracker').tab('show');
        },
        114: function() {
          logHotkey('F3 - Sample Editor');
          $('#tab-smpedit').tab('show');
        },
        115: function() {
          logHotkey('F4 - Ornament Editor');
          $('#tab-ornedit').tab('show');
        },
        116: function() {
          logHotkey('F5 - Play song');
          app.onCmdSongPlay();
        },
        117: function() {
          logHotkey('F6 - Play song from start');
          app.onCmdSongPlayStart();
        },
        118: function() {
          logHotkey('F7 - Play position');
          app.onCmdPosPlay();
        },
        119: function() {
          logHotkey('F8 - Play position from start');
          app.onCmdPosPlayStart();
        },
        120: function() {
          logHotkey('F9 - Toggle loop');
          app.onCmdToggleLoop();
        },
        121: function() {
          logHotkey('F10 - Preferences');
          app.onCmdPreferences();
        },
        122: function() {
          logHotkey('F11 - Show commands documentation');
          app.onCmdShowDocumentation('commands');
        },
        123: function() {
          logHotkey('F12 - Show keyboard documentation');
          app.onCmdShowDocumentation('keyboard');
        }
      }[key];

    case 'trackerCtrl':
      if (!((type === 'repeat' && ([38,40,48,57].indexOf(key) >= 0)) || keydown)) {
        return;
      }

      // unite bunch of keys into one handler...
      if (key > 96 && key < 103) {     // Numpad1-Numpad6 (toggle channels)
        key = 96;
      }
      else if (key > 48 && key < 57) { // numbers 1-8 (octave)
        key = 56;
      }

      return {
        38: function() {
          logHotkey('Up - Cursor movement backward to every 16th line (signature)');

          let cl = app.player.line;
          if (cl >= 16 && (cl & 0xf0) === cl) {
            cl = 16;
          }
          else {
            cl = (cl & 0x0f);
          }

          if (!cl) {
            return false;
          }

          app.updateEditorCombo(-cl);
        },
        40: function() {
          logHotkey('Down - Cursor movement forward to every 16th line (signature)');

          const pp = app.player.positions[app.player.position] ?? app.player.nullPosition;
          const pl = pp.length;

          let cl = app.player.line;
          if (cl < (pl - 16)) {
            cl = 16 - (cl & 0x0f);
          }
          else {
            cl = pl - cl - 1;
          }

          app.updateEditorCombo(cl);
        },
        48: function() {
          logHotkey('Ctrl+0 - Increase rowstep');
          app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.uponce').val(), 10);
        },
        56: function(oct: number) {
          oct -= 48;
          logHotkey(`Ctrl+${oct} - Set octave`);
          $('#scOctave').val(oct);
          app.ctrlOctave = oct;
        },
        57: function() {
          logHotkey('Ctrl+9 - Decrease rowstep');
          app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.downonce').val(), 10);
        },
        96: function(chn: number) {
          chn -= 96;
          logHotkey(`Ctrl+Num${chn} - Toggle channel`);
          $('#scChnButton' + chn).bootstrapToggle('toggle');
        }
      }[key];

    case 'trackerCtrlShift':
      if (!keyup) {
        return;
      }

      // unite Numpad +/- into one handler (transposition)
      if (key === 109) {
        key = 107;
      }

      return {
        37: function() {
          logHotkey('Ctrl+Shift+Left - Previous position');
          $('#scPosCurrent').trigger('touchspin.downonce');
        },
        39: function() {
          logHotkey('Ctrl+Shift+Right - Next position');
          $('#scPosCurrent').trigger('touchspin.uponce');
        },
        107: function(plus: number) {
          if (!app.modeEdit) {
            return;
          }

          plus &= 2;
          logHotkey(`Ctrl+Shift+Num${plus ? 'Plus' : 'Minus'} - Transpose octave`);

          const p = app.player;
          const sel = app.tracklist.selection;
          const ch = sel.len ? sel.channel : app.modeEditChannel;
          let line = sel.len ? sel.line : p.line;

          const end = line + sel.len;
          const pos = p.positions[p.position] ?? p.nullPosition;
          const pp = p.patterns[pos.ch[ch].pattern];

          let t;
          for (plus = (plus - 1) * 12; line <= end; line++) {
            if (line >= pp.end) {
              break;
            }

            if (!(t = pp.data[line].tone)) {
              continue;
            }

            t += plus;
            if (t > 0 && t <= 96) {
              pp.data[line].tone = t;
            }
          }

          pp.updateTracklist();
          app.updateTracklist();
          app.file.modified = true;
        }
      }[key];

    case 'editorShift':
      if (!keydown || !app.modeEdit || !app.player.positions.length) {
        return;
      }

      return {
        9: function() {
          logHotkey('Shift+Tab - Previous channel');
          if (app.modeEditChannel > 0) {
            app.modeEditChannel--;
          }
          else {
            app.modeEditChannel = 5;
          }

          app.updateTracklist();
        }
      }[key];

    case 'editorKeys':
      if (!(keydown || (type === 'repeat' && cursors))) {
        return;
      }

      // unite Numpad +/- into one handler (transposition)
      if (key === 109) {
        key = 107;
      }

      if (cursors) {
        if (app.modePlay) {
          app.onCmdStop();
        }
        else if (!app.player.positions.length || (!app.modeEdit && app.modePlay)) {
          return;
        }
      }

      return {
        9: function() {
          if (!app.player.positions.length || !app.modeEdit) {
            return;
          }

          logHotkey('Tab - Next channel');
          if (app.modeEditChannel < 5) {
            app.modeEditChannel++;
          }
          else {
            app.modeEditChannel = 0;
          }

          app.updateTracklist();
        },
        32: function() {
          logHotkey('Space - Edit mode');
          if (app.modePlay) {
            app.onCmdStop();
          }
          if (app.player.positions.length) {
            app.onCmdToggleEditMode();
          }
        },
        33: function() {
          logHotkey('PageUp - Move cursor up by half of tracklines');

          const lines = app.settings.tracklistLines + 1;
          app.tracklist.moveCurrentline(-(lines >> 1), true);
          app.updateTracklist();
          app.updatePanelInfo();
        },
        34: function() {
          logHotkey('PageDown - Move cursor down by half of tracklines');

          const lines = app.settings.tracklistLines + 1;
          app.tracklist.moveCurrentline((lines >> 1), true);
          app.updateTracklist();
          app.updatePanelInfo();
        },
        35: function() {
          logHotkey('End - Move cursor to end of the position');
          app.tracklist.moveCurrentline(MAX_PATTERN_LEN, true);
          app.updateTracklist();
          app.updatePanelInfo();
        },
        36: function() {
          logHotkey('Home - Move cursor to start of the position');
          app.tracklist.moveCurrentline(-MAX_PATTERN_LEN, true);
          app.updateTracklist();
          app.updatePanelInfo();
        },
        37: function() {
          if (!app.modeEdit) {
            return;
          }

          logHotkey('Left - Cursor movement');
          if (app.modeEditColumn > 0) {
            app.modeEditColumn--;
          }
          else {
            app.modeEditColumn = 7;
            if (app.modeEditChannel > 0) {
              app.modeEditChannel--;
            }
            else {
              app.modeEditChannel = 5;
            }
          }

          app.updateTracklist();
        },
        38: function() {
          logHotkey('Up - Cursor movement');
          app.updateEditorCombo(-1);
        },
        39: function() {
          if (!app.modeEdit) {
            return;
          }

          logHotkey('Right - Cursor movement');
          if (app.modeEditColumn < 7) {
            app.modeEditColumn++;
          }
          else {
            app.modeEditColumn = 0;
            if (app.modeEditChannel < 5) {
              app.modeEditChannel++;
            }
            else {
              app.modeEditChannel = 0;
            }
          }

          app.updateTracklist();
        },
        40: function() {
          logHotkey('Down - Cursor movement');
          app.updateEditorCombo(1);
        },
        107: function(plus: number) {
          if (!app.modeEdit) {
            return;
          }

          plus &= 2;
          logHotkey(`Num${plus ? 'Plus' : 'Minus'} - Transpose half-tone`);

          const p = app.player;
          const sel = app.tracklist.selection;
          const ch = sel.len ? sel.channel : app.modeEditChannel;
          let line = sel.len ? sel.line : p.line;

          const end = line + sel.len;
          const pp = p.positions[p.position] ?? p.nullPosition;
          const pt = p.patterns[pp.ch[ch].pattern];

          for (--plus; line <= end; line++) {
            if (line >= pt.end) {
              break;
            }
            else if (pt.data[line].tone) {
              pt.data[line].tone = Math.min(Math.max(pt.data[line].tone + plus, 1), 96);
            }
          }

          pt.updateTracklist();
          app.updateTracklist();
          app.file.modified = true;
        }
      }[key];

      //@ts-ignore no-break falltrough
    case 'editorEdit':
      if (!keydown) {
        return;
      }

      const cl = app.player.line;
      const pp = app.player.positions[app.player.position] ?? app.player.nullPosition;
      const cp = pp.ch[app.modeEditChannel].pattern;
      const pt = app.player.patterns[cp];
      const pl = pt.data[cl];

      if (cl < pt.end && pl.tracklist.active) {
        switch (key) {
          case 8:
            return function() {
              logHotkey('Backspace - Delete trackline from pattern');

              let A = cl + 1;
              let B = cl;
              const data = pt.data;

              for (; A < MAX_PATTERN_LEN - 1; A++, B++) {
                data[B].tone = data[A].tone;
                data[B].release = data[A].release;
                data[B].smp = data[A].smp;
                data[B].orn = data[A].orn;
                data[B].orn_release = data[A].orn_release;
                data[B].volume.byte = data[A].volume.byte;
                data[B].cmd = data[A].cmd;
                data[B].cmd_data = data[A].cmd_data;
              }

              data[A].tone = data[A].smp = data[A].orn = 0;
              data[A].release = data[A].orn_release = false;
              data[A].cmd = data[A].cmd_data = data[A].volume.byte = 0;

              pt.updateTracklist();
              app.updateTracklist();
              app.file.modified = true;
            };

          case 45:
            return function() {
              logHotkey('Insert - New trackline into pattern');

              let A = MAX_PATTERN_LEN - 2;
              let B = MAX_PATTERN_LEN - 1;

              const data = pt.data;
              for (; A >= cl; A--, B--) {
                data[B].tone = data[A].tone;
                data[B].release = data[A].release;
                data[B].smp = data[A].smp;
                data[B].orn = data[A].orn;
                data[B].orn_release = data[A].orn_release;
                data[B].volume.byte = data[A].volume.byte;
                data[B].cmd = data[A].cmd;
                data[B].cmd_data = data[A].cmd_data;
              }

              data[B].tone = data[B].smp = data[B].orn = 0;
              data[B].release = data[B].orn_release = false;
              data[B].cmd = data[B].cmd_data = data[B].volume.byte = 0;

              pt.updateTracklist();
              app.updateTracklist();
              app.file.modified = true;
            };

          case 46:
            return function() {
              logHotkey('Delete - Clear trackline data');

              switch (app.modeEditColumn) {
                default: case 0:		// NOTE column
                  pl.tone = 0;
                  pl.release = false;
                  break;
                case 1: 				// SAMPLE column
                  pl.smp = 0;
                  break;
                case 2: 				// ORNAMENT column
                  pl.orn = 0;
                  pl.orn_release = false;
                  break;
                case 3: case 4:			// ATTENUATION columns
                  pl.volume.byte = 0;
                  break;
                case 5: 				// COMMAND column
                  pl.cmd = 0;
                  pl.cmd_data = 0;
                  break;
                case 6: 				// COMMAND DATA 1 column
                  pl.cmd_data &= 0x0F;
                  break;
                case 7: 				// COMMAND DATA 2 column
                  pl.cmd_data &= 0xF0;
                  break;
              }

              pt.updateTracklist();
              app.updateEditorCombo();
              app.file.modified = true;
            };

          default:
            const columnHandler = {
              // NOTE column
              0: function(key, test) {
                const tone = Math.min(app.getKeynote(key), 96);

                if (tone < 0) {
                  return false;
                }
                else if (test) {
                  return true;
                }
                else if (tone > 0) {
                  pl.release = false;
                  pl.tone = tone;
                  if (app.ctrlSample && !pl.smp) {
                    pl.smp = app.ctrlSample;
                  }
                  if (app.ctrlOrnament && !pl.orn) {
                    pl.orn = app.ctrlOrnament;
                    pl.orn_release = false;
                  }
                }
                else {
                  pl.release = true;
                  pl.tone = 0;
                  pl.smp = 0;
                  pl.orn = 0;
                  pl.orn_release = false;
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // SAMPLE column
              1: function(key, test) {
                if (key >= 48 && key <= 57) { // 0 - 9
                  if (test) {
                    return true;
                  }

                  pl.smp = (key - 48);
                }
                else if (key >= 65 && key <= 86) { // A - V
                  if (test) {
                    return true;
                  }

                  pl.smp = (key - 55);
                }
                else {
                  return false;
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // ORNAMENT column
              2: function(key, test) {
                if (key >= 48 && key <= 57) { // 0 - 9
                  if (test) {
                    return true;
                  }

                  pl.orn_release = false;
                  pl.orn = (key - 48);
                }
                else if (key >= 65 && key <= 70) { // A - F
                  if (test) {
                    return true;
                  }

                  pl.orn_release = false;
                  pl.orn = (key - 55);
                }
                else if (key === 88 || key === 189) { // X | -
                  if (test) {
                    return true;
                  }

                  pl.orn_release = true;
                  pl.orn = 0;
                }
                else {
                  return false;
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // ATTENUATION 1 column
              3: function(key, test) {
                if (key >= 48 && key <= 57) { // 0 - 9
                  if (test) {
                    return true;
                  }

                  pl.volume.L = (key - 48);
                }
                else if (key >= 65 && key <= 70) { // A - F
                  if (test) {
                    return true;
                  }

                  pl.volume.L = (key - 55);
                }
                else {
                  return false;
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // ATTENUATION 2 column
              4: function(key, test) {
                if (key >= 48 && key <= 57) { // 0 - 9
                  if (test) {
                    return true;
                  }

                  pl.volume.R = (key - 48);
                }
                else if (key >= 65 && key <= 70) { // A - F
                  if (test) {
                    return true;
                  }

                  pl.volume.R = (key - 55);
                }
                else {
                  return false;
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // COMMAND column
              5: function(key, test) {
                if (key >= 48 && key <= 57) { // 0 - 9
                  if (test) {
                    return true;
                  }

                  pl.cmd = (key - 48);
                }
                else if (key >= 65 && key <= 70) { // A - F
                  if (test) {
                    return true;
                  }

                  pl.cmd = (key - 55);

                  // recalculate position frames if we changing speed
                  if (pl.cmd === 0xF && pl.cmd_data) {
                    app.player.countPositionFrames(app.player.position);
                  }
                }
                else {
                  return;
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // COMMAND DATA 1 column
              6: function(key, test) {
                if (key >= 48 && key <= 57) { // 0 - 9
                  key -= 48;
                }
                else if (key >= 65 && key <= 70) { // A - F
                  key -= 55;
                }
                else {
                  return false;
                }

                if (test) {
                  return true;
                }

                pl.cmd_data &= 0x0F;
                pl.cmd_data |= key << 4;

                // recalculate position frames if we changing speed
                if (pl.cmd === 0xF && pl.cmd_data) {
                  app.player.countPositionFrames(app.player.position);
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // COMMAND DATA 2 column
              7: function(key, test) {
                if (key >= 48 && key <= 57) { // 0 - 9
                  key -= 48;
                }
                else if (key >= 65 && key <= 70) { // A - F
                  key -= 55;
                }
                else {
                  return false;
                }

                if (test) {
                  return true;
                }

                pl.cmd_data &= 0xF0;
                pl.cmd_data |= key;

                // recalculate position frames if we changing speed
                if (pl.cmd === 0xF && pl.cmd_data) {
                  app.player.countPositionFrames(app.player.position);
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              }
            } as HotkeyMapColumnHandler;

            const columnHandlerFn = columnHandler[app.modeEditColumn];
            if (columnHandlerFn(key, true)) {
              app.file.modified = true;
              return (key) => columnHandlerFn(key, false);
            }
        }
      }

    case 'smpornCtrl':
      if (!keydown) {
        return;
      }

      if (key > 48 && key < 57) { // numbers 1-8 (octave)
        return function(key: number) {
          const oct = (key - 49);
          const base = app.workingSampleTone;
          const tone = ((base - 1) % 12) + (oct * 12) + 1;

          if (base !== tone) {
            logHotkey(`Ctrl+${String.fromCharCode(key)} - Set octave for sample/ornament editor test tone`);
            app.workingSampleTone = tone;

            $('#scSampleTone,#scOrnTone')
              .val(tone.toString())
              .prev().val(app.player.tones[tone].txt);
          }
        };
      }
      break;

    case 'smpornCtrlShift':
      if (!keydown) {
        return;
      }

      if ((key > 48 && key <= 57) || (key > 64 && key <= 90)) { // 1-9 | A-V
        return function(key: number) {
          const orn = (app.activeTab === 2);

          let num = key - 48;
          if (num > 9) {
            num -= 7;
          }

          if (num >= (orn ? 16 : 32)) {
            return;
          }

          logHotkey(`Ctrl+Shift${String.fromCharCode(key)} - Set active ${orn ? 'ornament' : 'sample'}`);

          $(orn ? '#scOrnNumber' : '#scSampleNumber')
            .val(num.toString(32).toUpperCase())
            .trigger('change');
        };
      }
      break;

    case 'smpornKeys':
      if (!keydown) {
        return;
      }

      // 2.5 octave piano-roll on keyboard
      const oct = app.player.tones[app.workingSampleTone].oct;
      const tone = Math.min(app.getKeynote(key, oct), 96);
      const sample = (app.activeTab === 1) ? app.workingSample : app.workingOrnTestSample;
      const ornament = (app.activeTab === 2) ? app.workingOrnament : 0;

      if (tone > 0) {
        return function() {
          AudioDriver.play();
          app.player.playSample(sample, ornament, tone);
        };
      }
      break;

    default:
      return;
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleKeyEvent = function(e) {
  const o = this.globalKeyState;
  let type = e.type as HotkeyMapType;
  let isInput = (e.target && (/^a|input|button$/i.test(e.target.tagName)) || e.target.id === 'documodal');
  let key = e.which || e.charCode || e.keyCode;

  const textInput = (isInput && e.target.id.indexOf('tx') === 0);
  const canPlay = !!this.player.positions.length;

  // cross-platform fixes
  if (browser.isOpera && key === 219) {
    key = 91;
  }
  else if (browser.isFirefox) {
    switch (key) {
      case 59:
        key = 186; break;
      case 61:
        key = 187; break;
      case 173:
        key = 189; break;
    }
  }

  if (type === 'keydown') {
    if (key >= 16 && key <= 18) {
      o.modsHandled = false;
      if (e.location === 2) {
        key += 256;
      }
    }

    if (e.repeat || (browser.isFirefox && o[key])) {
      type = 'repeat';
    }

    // add new key to the keymapper
    else if (!o[key]) {
      o[key] = true;
      o.length++;
    }

    if (isInput && !this.handleHotkeys('test', key, isInput, textInput)) {
      return true;
    }

    if (!this.handleHotkeys(type, key, isInput, textInput)) {
      if (!o.inDialog && this.activeTab === 0) {
        // ENTER (hold to play position at current line)
        if (o[13] && o.length === 1 && canPlay && !this.modePlay && !o.lastPlayMode) {
          this.modePlay = this.player.playPosition(false, false, false);
          o.lastPlayMode = 3;

          AudioDriver.play();
          SyncTimer.resume();
        }
        else if (o[13] && o.length > 1 && this.modePlay && o.lastPlayMode === 3) {
          SyncTimer.pause();
          this.modePlay = false;
          this.player.stopChannel();
          this.updateTracklist();
          o.lastPlayMode = 0;
        }
      }
    }
  }
  else if (type === 'keyup') {
    if (o[key] && this.handleHotkeys(type, key, isInput, textInput)) {
      isInput = false;
    }

    if (!o.modsHandled && !o.inDialog && canPlay) {
      // RIGHT SHIFT (play position)
      if (o.length === 1 && o[272]) {
        if (this.modePlay && o.lastPlayMode === 1) {
          SyncTimer.pause();
          this.modePlay = false;
          this.player.stopChannel();
          this.updateTracklist();
          o.lastPlayMode = 0;
        }
        else {
          this.modePlay = this.player.playPosition(false, false, true);
          o.lastPlayMode = 1;

          AudioDriver.play();
          SyncTimer.resume();
        }

        o.modsHandled = true;
      }
      // RIGHT CTRL (play song)
      else if (o.length === 1 && o[273]) {
        if (this.modePlay && o.lastPlayMode === 2) {
          SyncTimer.pause();
          this.modePlay = false;
          this.player.stopChannel();
          this.updateTracklist();
          o.lastPlayMode = 0;
        }
        else {
          this.modePlay = this.player.playPosition(false, true, true);
          o.lastPlayMode = 2;

          AudioDriver.play();
          SyncTimer.resume();
        }

        o.modsHandled = true;
      }
    }

    if (!o.inDialog && this.activeTab === 0) {
      // ENTER (hold to play position at current line)
      if (o[13] && this.modePlay && o.lastPlayMode === 3) {
        SyncTimer.pause();
        this.modePlay = false;
        this.player.stopChannel();
        this.updateTracklist();
        o.lastPlayMode = 0;
      }
    }

    // remove entry from the keymapper
    if (o[key]) {
      delete o[key];
      if (o.length) {
        o.length--;
      }
    }
    if (o[key + 256]) {
      delete o[key + 256];
      if (o.length) {
        o.length--;
      }
    }

    if (isInput) {
      return true;
    }
  }

  e.preventDefault();
  return false;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleHotkeys = function(type, key, isInput, textInput) {
  const o = this.globalKeyState;
  const restrict = o.inDialog || isInput;

  let fn: boolean | ((key: number) => void) = false;
  if (o[17] && key !== 17) { // handle Left Ctrl
    if (key === 90 && o[16]) { // convert Ctrl+Shift+Z to Ctrl+Y
      delete o[key];
      delete o[16];
      if (o.length) {
        o.length--;
      }
      o[--key] = true;
    }

    if (o.length === 2) {
      if (textInput && (key === 67 || key === 86)) {
        return false;
      }
      else if (key === 82 || key === 116) {
        fn = true; // disable refresh browser hotkeys
        type = 'test';
      }
      else if (!o.inDialog && !(fn = this.hotkeyMap(type, 'globalCtrl', key)) && !isInput) {
        if (this.activeTab === 0) {
          fn = this.hotkeyMap(type, 'trackerCtrl', key);
        }
        else {
          fn = this.hotkeyMap(type, 'smpornCtrl', key);
        }
      }
    }
    else if (!o.inDialog && o.length === 3 && o[16]) {
      if (this.activeTab === 0) {
        fn = this.hotkeyMap(type, 'trackerCtrlShift', key);
      }
      else {
        fn = this.hotkeyMap(type, 'smpornCtrlShift', key);
      }
    }

    if (o.inDialog && !fn) {
      fn = true; // restrict all ctrl hotkeys in dialogs
      type = 'test';
      o.modsHandled = true;
    }
  }
  else if (o[273] && key !== 273) { // handle Right Ctrl
    fn = true; // restrict all right ctrl hotkeys
    type = 'test';
    o.modsHandled = true;
  }
  else if (!restrict && o[16] && key !== 16 && o.length === 2 && this.activeTab === 0) {
    fn = this.hotkeyMap(type, 'editorShift', key);
  }
  else if (o.length === 1) {
    if (o.inDialog && (key >= 112 && key <= 123) || key === 272) {
      fn = true; // disable F1-F12 keys in dialogs
      type = 'test';
      o.modsHandled = true;
    }
    else if (!o.inDialog && !(fn = this.hotkeyMap(type, 'globalFs', key)) && !isInput) {
      if (this.activeTab === 0) {
        if (!(fn = this.hotkeyMap(type, 'editorKeys', key)) && this.player.positions.length && this.modeEdit) {
          fn = this.hotkeyMap(type, 'editorEdit', key);
        }
      }
      else {
        fn = this.hotkeyMap(type, 'smpornKeys', key);
      }
    }
  }

  if (fn) {
    if (type !== 'test' && typeof fn === 'function') {
      fn(key);
      o.modsHandled = true;
    }

    return true;
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.getKeynote = function(key: number, octave?: number) {
  const t = (octave ?? this.ctrlOctave - 1) * 12;
  const i = ' ZSXDCVGBHNJMQ2W3ER5T6Y7UI9O0P'.indexOf(String.fromCharCode(key));

  if (i > 0) {
    return (t + i);
  }
  else {
    /* eslint-disable key-spacing */
    const notLetter = {
      49 : 0,      // 1
      65 : 0,      // A
      192: 0,      // `
      189: 0,      // -
      222: 0,      // '
      188: t + 13, // ,
      76 : t + 14, // L
      190: t + 15, // .
      186: t + 16, // ;
      191: t + 17, // /
      219: t + 30, // [
      187: t + 31, // =
      221: t + 32  // ]
    }[key];
    if (notLetter >= 0) {
      return notLetter;
    }
  }

  return -1;
};
//---------------------------------------------------------------------------------------
