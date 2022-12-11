/**
 * SAA1099Tracker: Keyboard events handler prototype.
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
import SyncTimer from '../commons/timer';
import { MAX_PATTERN_LEN } from '../player/globals';
import Pattern from '../player/Pattern';
import Tracker from '.';

export type HotkeyMapType = 'repeat' | 'keyup' | 'keydown' | 'test';

type HotkeyMapColumnHandler = {
  [key: number]: (hex: number, code: string, test: boolean) => boolean;
};

const META_SHIFT_REGEX = /^(Meta|Control|Alt|Shift)(Left|Right)$/;

const logHotkey = (description: string, ...args: any[]) => {
  // eslint-disable-next-line
  console.log.apply(console, [
    '%cHotkey: ' + description, 'color:tan',
    ...args
  ]);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.hotkeyMap = function(type: HotkeyMapType, group: string, code: string): (code: string) => void {
  const app = this;
  const cursors = /^Arrow/.test(code);
  const keydown = type === 'keydown' || type === 'test';
  const [, letter] = /^(?:Digit|Key)([0-9A-Z])/.exec(code) ?? [];
  const hex = parseInt(letter ?? (-1 as any), 36);

  // Insert trackline into pattern
  const doInsert = (cl: number, pt: Pattern) => {
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

  // Transposition +/-
  const doTranspose = (plus: number) => {
    if (!app.modeEdit) {
      return;
    }

    const p = app.player;
    const sel = app.tracklist.selection;
    const ch = sel.len ? sel.channel : app.modeEditChannel;
    let line = sel.len ? sel.line : p.line;

    const end = line + sel.len;
    const pos = p.positions[p.position] ?? p.nullPosition;
    const pp = p.patterns[pos.ch[ch].pattern];

    for (let t; line <= end; line++) {
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
  };

  switch (group) {
    case 'globalCtrl':
      if (!keydown) {
        return;
      }

      return {
        'KeyC': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+C - Copy');
          }
          app.onCmdEditCopy();
        },
        'KeyD': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+D - Clear/Delete');
          }
          app.onCmdEditClear();
        },
        'KeyO': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+O - Open');
          }
          app.onCmdFileOpen();
        },
        'KeyP': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+P - Preferences');
          }
        },
        'KeyS': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+S - Save');
          }
          app.onCmdFileSave();
        },
        'KeyV': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+V - Paste');
          }
          app.onCmdEditPaste();
        },
        'KeyX': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+X - Cut');
          }
          app.onCmdEditCut();
        },
        'KeyY': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Y - Redo');
          }
        },
        'KeyZ': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Z - Undo');
          }
        }
      }[code];

    case 'globalFs':
      if (!keydown) {
        return;
      }

      return {
        'Escape': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Esc - Stop');
          }
          if (app.modePlay || app.activeTab > 0) {
            app.onCmdStop();
          }
          else if (app.modeEdit) {
            app.onCmdToggleEditMode();
          }
        },
        'F1': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F1 - About');
          }
          app.onCmdAbout();
        },
        'F2': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F2 - Tracklist Editor');
          }
          $('#tab-tracker').tab('show');
        },
        'F3': () => {
          if (app.activeTab === 1) {
            if (process.env.NODE_ENV === 'development') {
              logHotkey('F3 - Switching Sample Editor tabs');
            }
            $(`#tab-${
              app.smpornedit.smpeditShiftShown ? 'sampledata' : 'pitchshift'
            }`).tab('show');
          }
          else {
            if (process.env.NODE_ENV === 'development') {
              logHotkey('F3 - Sample Editor');
            }
            $('#tab-smpedit').tab('show');
          }
        },
        'F4': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F4 - Ornament Editor');
          }
          $('#tab-ornedit').tab('show');
        },
        'F5': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F5 - Play song');
          }
          app.onCmdSongPlay();
        },
        'F6': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F6 - Play song from start');
          }
          app.onCmdSongPlayStart();
        },
        'F7': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F7 - Play position');
          }
          app.onCmdPosPlay();
        },
        'F8': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F8 - Play position from start');
          }
          app.onCmdPosPlayStart();
        },
        'F9': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F9 - Toggle loop');
          }
          app.onCmdToggleLoop();
        },
        'F10': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F10 - Preferences');
          }
          app.onCmdPreferences();
        },
        'F11': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F11 - Show commands documentation');
          }
          app.onCmdShowDocumentation('commands');
        },
        'F12': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('F12 - Show keyboard documentation');
          }
          app.onCmdShowDocumentation('keyboard');
        }
      }[code];

    case 'trackerCtrl': {
      if (!((type === 'repeat' && /(Arrow(Up|Down))|Digit[09]/.test(code)) || keydown)) {
        return;
      }

      // Numpad1-Numpad6 (toggle channels)
      const [, chn] = /^Numpad([1-6])$/.exec(code) ?? [];
      if (chn) {
        return () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey(`Ctrl+Num${chn} - Toggle channel`);
          }
          $(`#scChnButton${chn}`).bootstrapToggle('toggle');
        };
      }
      // numbers 1-8 (octave)
      if (hex >= 1 && hex <= 8) {
        return () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey(`Ctrl+${hex} - Set octave`);
          }
          $('#scOctave').val(hex);
          app.ctrlOctave = hex;
        };
      }

      return {
        'KeyI': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+I - New trackline into pattern');
          }
          const cl = app.player.line;
          const pp = app.player.positions[app.player.position] ?? app.player.nullPosition;
          const cp = pp.ch[app.modeEditChannel].pattern;
          const pt = app.player.patterns[cp];
          doInsert(cl, pt);
        },
        'ArrowUp': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Up - Cursor movement backward to every 16th line (signature)');
          }

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
        'ArrowDown': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Down - Cursor movement forward to every 16th line (signature)');
          }

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
        'Minus': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Minus - Transpose half-tone down');
          }
          doTranspose(-1);
        },
        'Equal': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Equal - Transpose half-tone up');
          }
          doTranspose(+1);
        },
        'Digit0': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+0 - Increase rowstep');
          }
          app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.uponce').val(), 10);
        },
        'Digit9': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+9 - Decrease rowstep');
          }
          app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.downonce').val(), 10);
        },
      }[code];
    }

    case 'trackerCtrlShift': {
      if (!keydown) {
        return;
      }

      // Ctrl+Shift+1-Ctrl+Shift+6 (toggle channels)
      if (hex >= 1 && hex <= 6) {
        return () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey(`Ctrl+Shift+${hex} - Toggle channel`);
          }
          $(`#scChnButton${hex}`).bootstrapToggle('toggle');
        };
      }

      return {
        'ArrowLeft': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Shift+Left - Previous position');
          }
          $('#scPosCurrent').trigger('touchspin.downonce');
        },
        'ArrowRight': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Shift+Right - Next position');
          }
          $('#scPosCurrent').trigger('touchspin.uponce');
        },
        'Minus': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Shift+Minus - Transpose half-tone down');
          }
          doTranspose(-12);
        },
        'Equal': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Shift+Equal - Transpose half-tone up');
          }
          doTranspose(+12);
        },
        'NumpadSubtract': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Shift+NumMinus - Transpose octave down');
          }
          doTranspose(-12);
        },
        'NumpadAdd': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Ctrl+Shift+NumPlus - Transpose octave up');
          }
          doTranspose(+12);
        },
      }[code];
    }

    case 'editorShift':
      if (!keydown || !app.modeEdit || !app.player.positions.length) {
        return;
      }

      if (code === 'Tab') {
        return () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Shift+Tab - Previous channel');
          }
          if (app.modeEditChannel > 0) {
            app.modeEditChannel--;
          }
          else {
            app.modeEditChannel = 5;
          }

          app.updateTracklist();
        };
      }
      return;

    case 'editorKeys': {
      if (!(keydown || (type === 'repeat' && cursors))) {
        return;
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
        'Tab': () => {
          if (!app.player.positions.length || !app.modeEdit) {
            return;
          }

          if (process.env.NODE_ENV === 'development') {
            logHotkey('Tab - Next channel');
          }
          if (app.modeEditChannel < 5) {
            app.modeEditChannel++;
          }
          else {
            app.modeEditChannel = 0;
          }

          app.updateTracklist();
        },
        'Space': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Space - Edit mode');
          }
          if (app.modePlay) {
            app.onCmdStop();
          }
          if (app.player.positions.length) {
            app.onCmdToggleEditMode();
          }
        },
        'PageUp': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('PageUp - Move cursor up by half of tracklines');
          }

          const lines = app.settings.tracklistLines + 1;
          app.tracklist.moveCurrentline(-(lines >> 1), true);
          app.updateTracklist();
          app.updatePanelInfo();
        },
        'PageDown': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('PageDown - Move cursor down by half of tracklines');
          }

          const lines = app.settings.tracklistLines + 1;
          app.tracklist.moveCurrentline((lines >> 1), true);
          app.updateTracklist();
          app.updatePanelInfo();
        },
        'End': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('End - Move cursor to end of the position');
          }
          app.tracklist.moveCurrentline(MAX_PATTERN_LEN, true);
          app.updateTracklist();
          app.updatePanelInfo();
        },
        'Home': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Home - Move cursor to start of the position');
          }
          app.tracklist.moveCurrentline(-MAX_PATTERN_LEN, true);
          app.updateTracklist();
          app.updatePanelInfo();
        },
        'ArrowLeft': () => {
          if (!app.modeEdit) {
            return;
          }

          if (process.env.NODE_ENV === 'development') {
            logHotkey('Left - Cursor movement');
          }
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
        'ArrowUp': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Up - Cursor movement');
          }
          app.updateEditorCombo(-1);
        },
        'ArrowRight': () => {
          if (!app.modeEdit) {
            return;
          }

          if (process.env.NODE_ENV === 'development') {
            logHotkey('Right - Cursor movement');
          }
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
        'ArrowDown': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('Down - Cursor movement');
          }
          app.updateEditorCombo(1);
        },
        'NumpadAdd': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('NumMinus - Transpose half-tone down');
          }
          doTranspose(-1);
        },
        'NumpadSubtract': () => {
          if (process.env.NODE_ENV === 'development') {
            logHotkey('NumPlus - Transpose half-tone down');
          }
          doTranspose(+1);
        }
      }[code];
    }

    //@ts-ignore no-break
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
        switch (code) {
          case 'Backspace':
            return () => {
              if (process.env.NODE_ENV === 'development') {
                logHotkey('Backspace - Delete trackline from pattern');
              }

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

          case 'Insert':
            return () => {
              if (process.env.NODE_ENV === 'development') {
                logHotkey('Insert - New trackline into pattern');
              }
              doInsert(cl, pt);
            };

          case 'Delete':
            return () => {
              if (process.env.NODE_ENV === 'development') {
                logHotkey('Delete - Clear trackline data');
              }

              switch (app.modeEditColumn) {
                default: case 0: // NOTE column
                  pl.tone = 0;
                  pl.release = false;
                  break;
                case 1:          // SAMPLE column
                  pl.smp = 0;
                  break;
                case 2:          // ORNAMENT column
                  pl.orn = 0;
                  pl.orn_release = false;
                  break;
                case 3: case 4:  // ATTENUATION columns
                  pl.volume.byte = 0;
                  break;
                case 5:          // COMMAND column
                  pl.cmd = 0;
                  pl.cmd_data = 0;
                  break;
                case 6:          // COMMAND DATA 1 column
                  pl.cmd_data &= 0x0F;
                  break;
                case 7:          // COMMAND DATA 2 column
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
              0: function(_, code, test) {
                const tone = Math.min(app.getKeynote(code), 96);

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
              1: function(hex, _, test) {
                if (hex >= 0 && hex < 32) { // 0 - V
                  if (test) {
                    return true;
                  }

                  pl.smp = hex;
                }
                else {
                  return false;
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // ORNAMENT column
              2: function(hex, code, test) {
                if (hex >= 0 && hex < 16) { // 0 - F
                  if (test) {
                    return true;
                  }

                  pl.orn_release = false;
                  pl.orn = hex;
                }
                else if (code === 'KeyX' || code === 'Minus') { // X | -
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
              3: function(hex, _, test) {
                if (hex >= 0 && hex < 16) { // 0 - F
                  if (test) {
                    return true;
                  }

                  pl.volume.L = hex;
                }
                else {
                  return false;
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // ATTENUATION 2 column
              4: function(hex, _, test) {
                if (hex >= 0 && hex < 16) { // 0 - F
                  if (test) {
                    return true;
                  }

                  pl.volume.R = hex;
                }
                else {
                  return false;
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // COMMAND column
              5: function(hex, _, test) {
                if (hex >= 0 && hex < 16) { // 0 - F
                  if (test) {
                    return true;
                  }

                  pl.cmd = hex;

                  // recalculate position frames if we changing speed
                  if (hex === 0xF && pl.cmd_data) {
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
              6: function(hex, _, test) {
                if (hex > 0 && hex >= 16) { // 0 - F
                  return false;
                }

                if (test) {
                  return true;
                }

                pl.cmd_data &= 0x0F;
                pl.cmd_data |= hex << 4;

                // recalculate position frames if we changing speed
                if (pl.cmd === 0xF && pl.cmd_data) {
                  app.player.countPositionFrames(app.player.position);
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              },
              // COMMAND DATA 2 column
              7: function(hex, _, test) {
                if (hex < 0 && hex >= 16) { // 0 - F
                  return false;
                }

                if (test) {
                  return true;
                }

                pl.cmd_data &= 0xF0;
                pl.cmd_data |= hex;

                // recalculate position frames if we changing speed
                if (pl.cmd === 0xF && pl.cmd_data) {
                  app.player.countPositionFrames(app.player.position);
                }

                pt.updateTracklist();
                app.updateEditorCombo();
              }
            } as HotkeyMapColumnHandler;

            const columnHandlerFn = columnHandler[app.modeEditColumn];
            if (columnHandlerFn(hex, code, true)) {
              app.file.modified = true;
              return (key) => columnHandlerFn(hex, key, false);
            }
        }
      }

    case 'smpornCtrl':
      if (!keydown) {
        return;
      }

      // numbers 1-8 (octave)
      if (hex >= 1 && hex <= 8) {
        return () => {
          const oct = (hex - 1);
          const base = app.workingSampleTone;
          const tone = ((base - 1) % 12) + (oct * 12) + 1;

          if (base !== tone) {
            if (process.env.NODE_ENV === 'development') {
              logHotkey(`Ctrl+${letter} - Set octave for sample/ornament editor test tone`);
            }
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

      if (hex > 0 && hex <= 32) { // 1-9 | A-V
        return () => {
          const orn = (app.activeTab === 2);
          if (hex >= (orn ? 16 : 32)) {
            return;
          }

          if (process.env.NODE_ENV === 'development') {
            logHotkey(`Ctrl+Shift+${letter} - Set active ${orn ? 'ornament' : 'sample'}`);
          }

          $(orn ? '#scOrnNumber' : '#scSampleNumber')
            .val(hex.toString(32).toUpperCase())
            .trigger('change');
        };
      }

      const plus = (code === 'Minus') ? -1 : (code === 'Equal') ? 1 : 0;
      if (plus) {
        return () => {
          const orn = (app.activeTab === 2);
          const ornEl = $(orn ? '#scOrnNumber' : '#scSampleNumber');
          const newValue = parseInt(ornEl.val(), 32) + plus;
          if (newValue < 1 || newValue >= (orn ? 16 : 32)) {
            return;
          }

          if (process.env.NODE_ENV === 'development') {
            logHotkey(`Ctrl+Shift+${code} - Set active ${orn ? 'ornament' : 'sample'}`);
          }

          $(ornEl)
            .val(newValue.toString(32).toUpperCase())
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
      const tone = Math.min(app.getKeynote(code, oct), 96);
      const sample = (app.activeTab === 1) ? app.workingSample : app.workingOrnTestSample;
      const ornament = (app.activeTab === 2) ? app.workingOrnament : 0;

      if (tone > 0) {
        return () => {
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
  let isInput = (e.target && (
    /^a|input|button$/i.test(e.target.tagName) ||
    e.target.id === 'documodal'
  ));

  const textInput = (isInput && e.target.id.indexOf('tx') === 0);
  const canPlay = !!this.player.positions.length;

  const code = e.code;
  if (type === 'keydown') {
    o.isMetaKey = (e.metaKey || e.ctrlKey || e.altKey);
    o.isShifted = e.shiftKey;

    if (o.isMetaKey && code === 'ControlRight') {
      o.isMetaKey = false;
    }
    if (o.isShifted && code === 'ShiftRight') {
      o.isShifted = false;
    }
    if (e.repeat) {
      type = 'repeat';
    }
    if (!META_SHIFT_REGEX.test(code)) {
      if (isInput && !this.handleHotkeys('test', code, isInput, textInput)) {
        return true;
      }

      if (!this.handleHotkeys(type, code, isInput, textInput)) {
        if (
          !e.repeat && code === 'Enter' &&
          !o.inDialog && this.activeTab === 0
        ) {
          // ENTER (hold to play position at current line)
          if (canPlay && !this.modePlay && !o.lastPlayMode) {
            this.modePlay = this.player.playPosition(false, false, false);
            o.lastPlayMode = 3;

            AudioDriver.play();
            SyncTimer.resume();
          }
          else if (this.modePlay && o.lastPlayMode === 3) {
            SyncTimer.pause();
            this.modePlay = false;
            this.player.stopChannel();
            this.updateTracklist();
            o.lastPlayMode = 0;
          }
        }
      }
    }
  }
  else if (type === 'keyup') {
    if (!META_SHIFT_REGEX.test(code) && this.handleHotkeys(type, code, isInput, textInput)) {
      isInput = false;
    }

    if (!o.inDialog) {
      if (canPlay) {
        // RIGHT SHIFT (play position)
        if (code === 'ShiftRight') {
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
        }
        // RIGHT CTRL (play song)
        else if (code === 'ControlRight') {
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
        }
      }

      if (
        code === 'Enter' && o.lastPlayMode === 3 &&
        this.modePlay && this.activeTab === 0
      ) {
        SyncTimer.pause();
        this.modePlay = false;
        this.player.stopChannel();
        this.updateTracklist();
        o.lastPlayMode = 0;
      }
    }

    if (o.isMetaKey) {
      o.isMetaKey = (e.metaKey || e.ctrlKey || e.altKey);
    }
    if (o.isShifted) {
      o.isShifted = e.shiftKey;
    }

    if (isInput) {
      return true;
    }
  }

  e.preventDefault();
  return false;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleHotkeys = function(type, code, isInput, textInput) {
  const o = this.globalKeyState;
  const restrict = o.inDialog || isInput;

  let fn: boolean | ((code: string) => void) = false;
  if (o.isMetaKey) { // handle Left Ctrl
    if (textInput) {
      return false;
    }
    else if (code === 'KeyR' || code === 'F5') {
      fn = true; // disable refresh browser hotkeys
      type = 'test';
    }
    else if (!o.inDialog) {
      if (!o.isShifted) {
        fn = this.hotkeyMap(type, 'globalCtrl', code);
      }
      if (!fn && !isInput) {
        if (this.activeTab === 0) {
          fn = this.hotkeyMap(type, `trackerCtrl${o.isShifted ? 'Shift' : ''}`, code);
        }
        else {
          fn = this.hotkeyMap(type, `smpornCtrl${o.isShifted ? 'Shift' : ''}`, code);
        }
      }
    }
    else if (!fn) {
      fn = true; // restrict all ctrl hotkeys in dialogs
      type = 'test';
    }
  }
  else if (code === 'ControlRight') { // handle Right Ctrl
    fn = true; // restrict all right ctrl hotkeys
    type = 'test';
  }
  else if (!restrict && o.isShifted && this.activeTab === 0) {
    fn = this.hotkeyMap(type, 'editorShift', code);
  }
  else {
    if (o.inDialog && /^F([1-9]|1[0-2])$/.test(code)) {
      fn = true; // disable F1-F12 keys in dialogs
      type = 'test';
    }
    else {
      fn = this.hotkeyMap(type, 'globalFs', code);
      if (!fn && !isInput) {
        if (this.activeTab === 0) {
          fn = this.hotkeyMap(type, 'editorKeys', code);
          if (!fn && this.player.positions.length && this.modeEdit) {
            fn = this.hotkeyMap(type, 'editorEdit', code);
          }
        }
        else {
          fn = this.hotkeyMap(type, 'smpornKeys', code);
        }
      }
    }
  }

  if (fn) {
    if (type !== 'test' && typeof fn === 'function') {
      fn(code);
    }

    return true;
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.getKeynote = function(code: string, octave?: number) {
  const [, letter] = /^(?:Digit|Key)([0-9A-Z])/.exec(code) ?? [];
  const base = (octave ?? this.ctrlOctave - 1) * 12;
  const tone = ' ZSXDCVGBHNJMQ2W3ER5T6Y7UI9O0P'.indexOf(letter);

  if (tone > 0) {
    return (base + tone);
  }
  else {
    const notLetter = {
      'Digit1': 0,
      'KeyA': 0,
      'Backquote': 0,
      'Minus': 0,
      'Quote': 0,
      'Comma': base + 13,
      'KeyL': base + 14,
      'Period': base + 15,
      'Semicolon': base + 16,
      'Slash': base + 17,
      'BracketLeft': base + 30,
      'Equal': base + 31,
      'BracketRight': base + 32
    }[code];
    if (notLetter >= 0) {
      return notLetter;
    }
  }

  return -1;
};
//---------------------------------------------------------------------------------------
