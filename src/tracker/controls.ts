/**
 * SAA1099Tracker: All handlers and control function prototypes.
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

import AudioDriver from '../commons/audio';
import { toTimeString, toWidth } from '../commons/number';
import SyncTimer from '../commons/timer';
import { optimizePatternProcessor } from '../compiler/optimizer';
import { MAX_PATTERN_LEN } from '../player/globals';
import constants from './constants';
import { i18n } from './doc';
import Tracker from '.';

//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanels = function() {
  $('#scOctave').val(this.ctrlOctave);
  $('#scAutoSmp').val(this.ctrlSample);
  $('#scAutoOrn').val(this.ctrlOrnament);
  $('#scRowStep').val(this.ctrlRowStep);

  $('#txHeaderTitle').val(this.songTitle);
  $('#txHeaderAuthor').val(this.songAuthor);

  this.updatePanelInfo();
  this.updatePanelPosition();
  this.updatePanelPattern();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateAfterActionButton = function() {
  this.updatePanelInfo();
  this.updatePanelPosition();
  this.updatePanelPattern();
  this.updateTracklist();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateEditorCombo = function(step) {
  if (step === undefined) {
    this.player.playLine();
    AudioDriver.play();
    SyncTimer.resume();

    step = this.ctrlRowStep;
  }

  this.tracklist.moveCurrentline(step);
  this.updateTracklist();
  this.updatePanelInfo();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelInfo = function() {
  const [
    elBPM, elFreq,
    elTimeCurrent, elTimeTotal,
    elTicksCurrent, elTicksTotal
  ] = $('#stInfoPanel u').toArray();

  const int = this.settings.audioInterrupt;
  const curpos = this.player.position;
  const len = this.player.positions.length;
  const pos = this.player.positions[curpos] ?? this.player.nullPosition;
  const line = this.player.line;
  const even = line & -2;
  let total = 0;
  let current = 0;
  let i = int * 60;
  let bpm;

  if (len) {
    bpm = (i / (pos.frames[even + 2] - pos.frames[even])) >> 1;

    this.player.positions.forEach((posi, i) => {
      if (i === curpos) {
        current = total;
      }
      total += posi.frames[posi.length];
    });

    current += pos.frames[line];

    i = total.toString().length;
    elTicksCurrent.textContent = toWidth(current, i);
    elTicksTotal.textContent = toWidth(total, i);

    elTimeCurrent.textContent = toTimeString(current / int);
    elTimeTotal.textContent = toTimeString(total / int);
  }
  else {
    bpm = (i / this.player.speed) >> 2;

    elTimeCurrent.textContent = elTimeTotal.textContent = toTimeString(0);
    elTicksCurrent.textContent = elTicksTotal.textContent = '0';
  }

  elBPM.textContent = bpm.toString();
  elFreq.textContent = int.toString();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPattern = function() {
  const a = [
    '#scPattern',
    '#scPatternLen',
    '#scPatternTarget',
    '#btPatternDup',
    '#btPatternDelete',
    '#btPatternSwap',
    '#btPatternProcess',
    '#btPatternClean',
    '#btPatternCompress',
    '#btPatternExpand',
    '#btPatternOptimize'
  ];
  const lastState = $(a[0]).prop('disabled');
  let pat = this.workingPattern;
  let len = this.player.patterns.length;
  let min = 0, max = 0;
  let d = true;

  len--;
  if (len) {
    min = 1;
    max = len;
    pat = Math.max(Math.min(pat, max), min);
  }
  else {
    pat = 0;
  }

  for (let i = 1; i <= 6; i++) {
    $('#scChnPattern' + i).trigger('touchspin.updatesettings', { min: 0, max: max });
  }

  if (pat) {
    d = false;
    $(a[1]).val(this.player.patterns[pat].end);
  }
  else {
    $(a[1]).val(64);
  }

  this.workingPattern = pat;
  $(a[0]).trigger('touchspin.updatesettings', { min: min, max: max, initval: pat }).val(pat);
  const target = len ? Math.max(Math.min(this.workingPatternTarget, max), min) : 0;
  $(a[2]).trigger('touchspin.updatesettings', { min: min, max: max, initval: target }).val(target);

  $('#txPatternUsed').val(this.player.countPatternUsage(pat));
  $('#txPatternTotal').val(len);

  if (d !== lastState) {
    a.forEach(selector => {
      $(selector + ',' + selector + '~span>button').prop('disabled', d);
    });
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPosition = function() {
  const a = [ '#scPosCurrent', '#scPosLength', '#scPosSpeed', '#txPosTotal', '#scPosRepeat' ];
  const lastState = $(a[0]).prop('disabled');
  let pos = this.player.nullPosition, buf;
  const len = this.player.positions.length;
  const p = this.player.position;
  let d = true;

  if (len) {
    d = false;
    $(a[0] + ',' + a[4]).trigger('touchspin.updatesettings', { min: 1, max: len });
    $(a[0]).val(p + 1);
    $(a[3]).val(len);
    $(a[4]).val(this.player.repeatPosition + 1);

    pos = this.player.positions[p];
  }
  else {
    $(a[0] + ',' + a[4]).val(0).trigger('touchspin.updatesettings', { min: 0, max: 0 });
    $(a[3]).val(0);
  }

  $(a[1]).val(pos.length);
  $(a[2]).val(pos.speed);

  for (let i = 0; i < 6; i++) {
    a.push((buf = '#scChnPattern' + (i + 1)));
    $(buf).val(pos.ch[i].pattern);

    a.push((buf = '#scChnTrans' + (i + 1)));
    $(buf).val(pos.ch[i].pitch);
  }

  if (d !== lastState) {
    a.splice(3, 1);
    a.forEach(selector => {
      $(selector + ',' + selector + '~span>button').prop('disabled', d);
    });
  }

  pos = null;
};
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tracker.prototype.onCmdAppUpdate = function() {
  const remote = window.electron?.version;
  const keys = this.globalKeyState;

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.app.update.title,
    html: `<p>${i18n.dialog.app.update.msg}</p>`,
    buttons: remote ?
      [
        { caption: i18n.dialog.app.update.options[0], id: 'apply', style: 'btn-warning' },
        { caption: i18n.dialog.app.update.options[1] }
      ]
      : 'ok',
    style: 'warning',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn === 'apply') {
        $('#overlay .loader').html(i18n.dialog.app.update.download);
        document.body.className = 'loading';
        this.destroying = true;

        window.electron?.clearCache();
        setTimeout(() => {
          window.electron?.relaunch();
        }, 1024);
      }
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdAppExit = function() {
  const file = this.file;

  if (this.destroying) {
    return;
  }
  if (file.modified) {
    const duration = $('#stInfoPanel u:eq(3)').text();
    if (this.settings.lastLoadedFileNumber !== undefined && file.fileName) {
      file.saveFile(file.fileName, duration, this.settings.lastLoadedFileNumber);
    }
    else {
      file.saveFile(constants.AUTOSAVE_FILENAME, duration, 0);
      this.settings.lastLoadedFileNumber = 0;
    }
  }

  this.settings.save();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileNew = function() {
  const keys = this.globalKeyState;
  const file = this.file;
  if (this.modePlay || !file.yetSaved && !file.modified && !file.fileName) {
    return;
  }

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.file.new.title,
    text: i18n.dialog.file.new.msg,
    buttons: 'yesno',
    style: 'danger',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      file.new();
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileOpen = function() {
  if (this.modePlay) {
    return;
  }

  const keys = this.globalKeyState;
  const file = this.file;

  if (file.modified) {
    keys.inDialog = true;

    $('#dialog').confirm({
      title: i18n.dialog.file.open.title,
      text: i18n.dialog.file.open.msg,
      buttons: 'yesno',
      style: 'warning',
      callback: (btn) => {
        keys.inDialog = false;
        if (btn !== 'yes') {
          return;
        }

        file.dialog.load();
      }
    });
  }
  else {
    file.dialog.load();
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileSave = function(as) {
  if (!this.player.positions.length) {
    return;
  }

  const file = this.file;
  if ((as || !file.yetSaved) && !this.modePlay) {
    file.dialog.save();
  }
  else if (!as && (file.yetSaved || file.modified) && file.fileName) {
    file.saveFile(file.fileName, $('#stInfoPanel u:eq(3)').text());
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileImport = function(type) {
  const keys = this.globalKeyState;
  if (this.modePlay || keys.lastPlayMode) {
    return;
  }

  let fnToCall: () => void;
  if (type === 'ETrk') {
    fnToCall = () => {
      this.file.importETracker();
    };
  }
  else if (type) {
    fnToCall = () => {
      this.file.importDemosong(type, `demosongs/${type}.json`);
    };
  }
  else {
    fnToCall = () => {
      this.file.importFile();
    };
  }

  if (this.file.modified) {
    keys.inDialog = true;

    $('#dialog').confirm({
      title: i18n.dialog.file.import.title,
      text: i18n.dialog.file.open.msg,
      buttons: 'yesno',
      style: 'warning',
      callback: (btn) => {
        keys.inDialog = false;
        if (btn !== 'yes') {
          return;
        }

        fnToCall?.();
      }
    });
  }
  else {
    fnToCall();
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileExport = function() {
  this.file.exportFile();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileExportText = function() {
  this.file.exportTextDump();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileCompile = function() {
  this.compiler.show();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditClear = function() {
  if (this.activeTab === 0 && this.modeEdit) {
    this.manager.clearFromTracklist();
    this.player.countPositionFrames(this.player.position);
    this.updateEditorCombo(0);
  }
  else if (this.activeTab === 1) {
    this.onCmdSmpClear();
  }
  else if (this.activeTab === 2) {
    this.onCmdOrnClear();
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditCut = function() {
  if (this.activeTab === 0 && this.modeEdit) {
    this.manager.copyFromTracklist().then(() => {
      this.manager.clearFromTracklist();

      this.player.countPositionFrames(this.player.position);
      this.updateEditorCombo(0);
    });
  }
  else if (this.activeTab === 1) {
    this.manager.copySample().then(() => {
      this.manager.clearSample();

      this.updateSampleEditor(true);
      this.smpornedit.updateSamplePitchShift();
    });
  }
  else if (this.activeTab === 2) {
    this.manager.copyOrnament().then(() => {
      this.manager.clearOrnament();
      this.smpornedit.updateOrnamentEditor(true);
    });
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditCopy = async function() {
  if (this.activeTab === 0 && this.modeEdit) {
    await this.manager.copyFromTracklist();
  }
  else if (this.activeTab === 1) {
    await this.manager.copySample();
  }
  else if (this.activeTab === 2) {
    await this.manager.copyOrnament();
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditCopyAsTracklist = async function() {
  if (this.activeTab === 0 && this.modeEdit) {
    await this.manager.copyAsPlainTracklist();
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditPaste = function() {
  if (this.activeTab === 0 && this.modeEdit) {
    this.manager.pasteToTracklist().then((done) => {
      if (done) {
        this.player.countPositionFrames(this.player.position);
        this.updateEditorCombo(this.ctrlRowStep);
        this.file.modified = true;
      }
    });
  }
  else if (this.activeTab === 1) {
    this.manager.pasteSampleCheckContent().then((smp) => {
      if (!smp) {
        return;
      }
      const keys = this.globalKeyState;
      keys.inDialog = true;
      $('#dialog').confirm({
        title: i18n.dialog.sample.paste.title,
        text: i18n.dialog.sample.paste.msg,
        style: 'warning',
        buttons: [
          { caption: i18n.dialog.sample.options[0], id: 7 },
          { caption: i18n.dialog.sample.options[1], id: 1 },
          { caption: i18n.dialog.sample.options[2], id: 2 },
          { caption: i18n.dialog.sample.options[3], id: 4 },
          { caption: i18n.dialog.sample.options[4], id: 'cancel' }
        ],
        callback: (mask) => {
          keys.inDialog = false;
          if (mask === 'cancel' || typeof mask === 'string') {
            return;
          }
          this.manager.pasteSample(smp, mask).then((done) => {
            if (!done) {
              return;
            }
            this.updateSampleEditor(mask === 7);
            if (mask & 4) {
              this.smpornedit.updateSamplePitchShift();
            }
            this.file.modified = true;
          });
        }
      });
    });
  }
  else if (this.activeTab === 2) {
    this.manager.pasteOrnament().then((done) => {
      if (done) {
        this.smpornedit.updateOrnamentEditor(true);
        this.file.modified = true;
      }
    });
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditPasteSpecial = function() {
  if (this.activeTab === 0 && this.modeEdit) {
    this.manager.pasteSpecialCheckContent().then((pasteAsPatt) => {
      if (!pasteAsPatt) {
        return;
      }

      this.manager.pasteSpecialDialog(
        pasteAsPatt,
        this.manager.pasteSpecialToTracklist.bind(this.manager),
        (done) => {
          if (done) {
            this.player.countPositionFrames(this.player.position);
            this.updateEditorCombo(0);
          }
        });
    });
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditUndo = function() {
  this.manager.undo();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditRedo = function() {
  this.manager.redo();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdStop = function() {
  SyncTimer.pause();

  this.player.stopChannel();
  this.modePlay = false;
  this.globalKeyState.lastPlayMode = 0;

  if (this.activeTab === 0) {
    this.updateTracklist(true);
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlay = function() {
  if (this.globalKeyState.lastPlayMode === 2) {
    return;
  }
  if (this.activeTab === 0) {
    this.doc.setStatusText();
  }
  if (this.modeEdit) {
    this.player.storePositionRuntime();
  }

  this.modePlay = this.player.playPosition(false, true, true);

  AudioDriver.play();
  SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlayStart = function() {
  if (this.activeTab === 0) {
    this.doc.setStatusText();
  }
  if (this.modeEdit) {
    this.player.storePositionRuntime();
  }

  this.modePlay = this.player.playPosition(true, true, true);

  AudioDriver.play();
  SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlay = function() {
  if (this.globalKeyState.lastPlayMode === 1) {
    return;
  }
  if (this.activeTab === 0) {
    this.doc.setStatusText();
  }
  if (this.modeEdit) {
    this.player.storePositionRuntime();
  }

  this.modePlay = this.player.playPosition(false, false, false);

  AudioDriver.play();
  SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlayStart = function() {
  if (this.activeTab === 0) {
    this.doc.setStatusText();
  }
  if (this.modeEdit) {
    this.player.storePositionRuntime();
  }

  this.modePlay = this.player.playPosition(false, false, true);

  AudioDriver.play();
  SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleLoop = function(newState) {
  const state = (typeof newState === 'boolean') ? newState : (this.player.loopMode = !this.player.loopMode);
  const el = $('a#miToggleLoop>span');
  const icon1 = 'glyphicon-repeat', icon2 = 'glyphicon-remove-circle';
  const glyph = state ? icon1 : icon2;
  const color = state ? '#000' : '#ccc';

  el.removeClass(icon1 + ' ' + icon2);
  el.addClass(glyph).css({ 'color': color });

  $('#chPlayerRepeat').prop('checked', (this.compiler.playerRepeat = state));
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleEditMode = function(newState) {
  const state = (typeof newState === 'boolean') ? newState : (this.modeEdit = !this.modeEdit);
  const el = $('.tracklist-panel');

  if (!state) {
    this.doc.setStatusText();
    this.player.storePositionRuntime();
  }

  el[state ? 'addClass' : 'removeClass']('edit');
  this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdShowDocumentation = function(name) {
  const filename = `doc/${name}.txt`;
  const cache = this.doc.txtCache;
  const keys = this.globalKeyState;
  const cached = cache[name];

  const dialog = $('#documodal');
  const button = $('<button/>').attr({
    'type': 'button',
    'class': 'close',
    'data-dismiss': 'modal'
  }).text('\xd7');

  dialog.on('shown.bs.modal', () => {
    keys.inDialog = true;
  }).on('hidden.bs.modal', () => {
    $(dialog).off().find('.modal-body').empty();
    keys.inDialog = false;
  });

  if (cached) {
    dialog.modal('show')
      .find('.modal-body')
      .html(cached)
      .scrollTop(0)
      .prepend(button);
  }
  else {
    fetch(filename)
      .then((response) => response.text())
      .then((data) => {
        data = (`<pre>\n${data}</pre>`)
          .replace(/\s*?^\=\=\s*([^\=]+?)\s*[\=\s]+$/gm, '</pre><h3>$1</h3><pre>')
          .replace(/<pre><\/pre>/g, '');

        keys.inDialog = true;
        cache[name] = data;
        dialog.modal('show')
          .find('.modal-body')
          .html(data)
          .scrollTop(0)
          .prepend(button);
      });
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdAbout = function() {
  const keys = this.globalKeyState;
  const dialog = $('#about');
  const data = dialog.data();

  if (!data.hasOwnProperty('bs.modal')) {
    dialog
      .on('show.bs.modal', () => {
        keys.inDialog = true;
      })
      .on('hidden.bs.modal', () => {
        $(dialog).off();
        keys.inDialog = false;
      });
  }

  dialog.modal('toggle');
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPreferences = function() {
  this.settings.show();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatCreate = function() {
  if (this.modePlay) {
    return;
  }

  const id = this.player.addNewPattern();
  const pt = this.player.patterns[id];
  const end = (this.workingPattern && this.player.patterns[this.workingPattern].end) || 64;

  this.manager.historyPush({
    pattern: {
      type: 'create',
      index: id
    }
  });

  pt.end = end;
  pt.updateTracklist();

  this.workingPattern = id;
  this.updatePanelPattern();
  this.file.modified = true;

  $('#scPatternLen').focus();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatDup = function() {
  if (this.modePlay) {
    return;
  }

  const id = this.player.addNewPattern();
  const dest = this.player.patterns[id];
  const src = (this.workingPattern && this.player.patterns[this.workingPattern]);

  this.manager.historyPush({
    pattern: {
      type: 'create',
      index: id
    }
  });

  dest.end = src.end;
  dest.data.forEach((line, i) => {
    const srcData = src.data[i];
    line.tone = srcData.tone;
    line.release = srcData.release;
    line.smp = srcData.smp;
    line.orn = srcData.orn;
    line.orn_release = srcData.orn_release;
    line.volume.byte = srcData.volume.byte;
    line.cmd = srcData.cmd;
    line.cmd_data = srcData.cmd_data;
  });

  dest.updateTracklist();

  this.workingPattern = id;
  this.updatePanelPattern();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatDelete = function() {
  if (this.modePlay || !this.workingPattern) {
    return;
  }

  const app = this;
  const p = this.player;
  let pt = this.workingPattern;
  const keys = this.globalKeyState;
  const len = p.patterns.length - 1;
  let msg = null;
  let undoableOperation = true;

  if (p.countPatternUsage(pt) > 0) {
    msg = i18n.dialog.pattern.delete.msg.used;
  }
  if (pt !== len) {
    msg = i18n.dialog.pattern.delete.msg.notlast;
    undoableOperation = false;
  }
  if (!msg) {
    msg = i18n.dialog.pattern.delete.msg.sure;
  }

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.pattern.delete.title,
    html: msg,
    buttons: 'yesno',
    style: undoableOperation ? 'info' : 'warning',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      if (!undoableOperation) {
        this.manager.historyClear();
      }

      for (let i = 0, l = p.positions.length, pos, chn; i < l; i++) {
        for (pos = p.positions[i], chn = 0; chn < 6; chn++) {
          if (pos.ch[chn].pattern === pt) {
            if (undoableOperation) {
              this.manager.historyPush({
                position: {
                  type: 'data',
                  index: i,
                  channel: chn,
                  pattern: pt
                }
              });
            }

            pos.ch[chn].pattern = 0;
          }
          else if (pos.ch[chn].pattern > pt) {
            pos.ch[chn].pattern--;
          }
        }
      }

      const pattern = p.patterns[pt];
      this.manager.historyPush({
        pattern: {
          type: 'remove',
          index: pt,
          data: pattern.simplify(),
          end: pattern.end
        }
      });

      p.patterns.splice(pt, 1);
      if (pt === len) {
        pt--;
      }

      app.workingPattern = pt;
      app.updateAfterActionButton();
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatSwap = function() {
  if (
    this.modePlay ||
    !this.workingPattern || !this.workingPatternTarget ||
    this.workingPattern === this.workingPatternTarget
  ) {
    return;
  }

  const app = this;
  const keys = this.globalKeyState;

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.pattern.swap.title,
    html: i18n.dialog.pattern.swap.msg,
    buttons: 'yesno',
    style: 'info',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      const src = this.player.patterns[this.workingPattern];
      const dst = this.player.patterns[this.workingPatternTarget];
      this.player.patterns[this.workingPattern] = dst;
      this.player.patterns[this.workingPatternTarget] = src;

      src.updateTracklist();
      dst.updateTracklist();
      app.updateAfterActionButton();
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatProcess = function() {
  if (
    this.modePlay ||
    !this.workingPattern || !this.workingPatternTarget ||
    this.workingPattern === this.workingPatternTarget
  ) {
    return;
  }

  this.manager.pasteSpecialDialog(
    this.player.patterns[this.workingPattern],
    async (pattern, parts) => {
      if (!pattern?.end) {
        return false;
      }

      const dst = this.player.patterns[this.workingPatternTarget];
      this.manager.historyPush({
        pattern: {
          type: 'data',
          index: this.workingPatternTarget,
          data: dst.simplify(),
        }
      });

      for (let i = 0; i < Math.min(pattern.end, dst.end); i++) {
        const srcData = pattern.data[i];
        const destData = dst.data[i];
        if (parts.tone) {
          destData.tone = srcData.tone;
          destData.release = srcData.release;
        }
        if (parts.smp) {
          destData.smp = srcData.smp;
        }
        if (parts.orn) {
          destData.orn = srcData.orn;
          destData.orn_release = srcData.orn_release;
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

      dst.updateTracklist();
      return true;
    },
    (done) => done && this.updateAfterActionButton(),
    i18n.dialog.pattern.process.title,
    i18n.dialog.pattern.process.btn
  );
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatClean = function() {
  if (this.modePlay || !this.workingPattern) {
    return;
  }

  const app = this;
  const keys = this.globalKeyState;
  const pt = this.player.patterns[this.workingPattern];

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.pattern.clean.title,
    text: i18n.dialog.pattern.clean.msg,
    buttons: 'yesno',
    style: 'info',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      this.manager.historyPush({
        pattern: {
          type: 'data',
          index: this.workingPattern,
          data: pt.simplify(),
        }
      });

      pt.data.forEach(line => {
        line.tone = 0;
        line.release = false;
        line.smp = 0;
        line.orn = 0;
        line.orn_release = false;
        line.volume.byte = 0;
        line.cmd = 0;
        line.cmd_data = 0;
      });

      pt.updateTracklist();
      app.updateAfterActionButton();
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatCompress = function() {
  if (this.modePlay || !this.workingPattern) {
    return;
  }

  const app = this;
  const keys = this.globalKeyState;
  const pt = this.player.patterns[this.workingPattern];

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.pattern.compress.title,
    html: i18n.dialog.pattern.compress.msg,
    buttons: 'yesno',
    style: 'info',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      this.manager.historyPush({
        pattern: {
          type: 'data',
          index: this.workingPattern,
          data: pt.simplify(),
        }
      });

      for (let src = 2, dst = 1; src < pt.data.length; src += 2, dst++) {
        const dstData = pt.data[dst];
        const srcData = pt.data[src];

        dstData.tone = srcData.tone;
        dstData.release = srcData.release;
        dstData.smp = srcData.smp;
        dstData.orn = srcData.orn;
        dstData.orn_release = srcData.orn_release;
        dstData.volume.byte = srcData.volume.byte;
        dstData.cmd = srcData.cmd;
        dstData.cmd_data = srcData.cmd_data;
      }

      pt.end = Math.ceil(pt.end / 2);
      pt.updateTracklist();
      app.updateAfterActionButton();
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatExpand = function() {
  if (this.modePlay || !this.workingPattern) {
    return;
  }

  const app = this;
  const keys = this.globalKeyState;
  const pt = this.player.patterns[this.workingPattern];

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.pattern.expand.title,
    html: i18n.dialog.pattern.expand.msg,
    buttons: 'yesno',
    style: 'info',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      this.manager.historyPush({
        pattern: {
          type: 'data',
          index: this.workingPattern,
          data: pt.simplify(),
        }
      });

      for (let dst = MAX_PATTERN_LEN - 1, src = dst >> 1; src >= 0; src--, dst--) {
        let line = pt.data[dst--];
        line.tone = 0;
        line.release = false;
        line.smp = 0;
        line.orn = 0;
        line.orn_release = false;
        line.volume.byte = 0;
        line.cmd = 0;
        line.cmd_data = 0;

        const srcData = pt.data[src];
        line = pt.data[dst];
        line.tone = srcData.tone;
        line.release = srcData.release;
        line.smp = srcData.smp;
        line.orn = srcData.orn;
        line.orn_release = srcData.orn_release;
        line.volume.byte = srcData.volume.byte;
        line.cmd = srcData.cmd;
        line.cmd_data = srcData.cmd_data;
      }

      pt.end = pt.end * 2;
      pt.updateTracklist();
      app.updateAfterActionButton();
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatOptimize = function() {
  if (this.modePlay || !this.workingPattern) {
    return;
  }

  const app = this;
  const keys = this.globalKeyState;
  const pt = this.player.patterns[this.workingPattern];

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.pattern.optimize.title,
    html: i18n.dialog.pattern.optimize.msg,
    buttons: 'yesno',
    style: 'info',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      this.manager.historyPush({
        pattern: {
          type: 'data',
          index: this.workingPattern,
          data: pt.simplify(),
        }
      });

      const optimizeLine = optimizePatternProcessor(true);
      pt.data.forEach((line, idx) => {
        const { ton, release, smp, orn, orn_release, vol, cmd, dat } = optimizeLine(line, idx);

        line.tone = ton;
        line.release = release;
        line.smp = smp;
        line.orn = orn;
        line.orn_release = orn_release;
        line.volume.byte = vol;
        line.cmd = cmd;
        line.cmd_data = dat;
      });

      for (let i = MAX_PATTERN_LEN - 1; i >= 0; i--) {
        const {
          tone: ton, smp, orn,
          volume: { byte: vol },
          cmd, release, orn_release
        } = pt.data[i];
        if (ton || release || smp || orn || orn_release || vol || cmd) {
          pt.end = i + 1;
          break;
        }
      }

      pt.updateTracklist();
      app.updateAfterActionButton();
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosCreate = function() {
  if (this.modePlay) {
    return;
  }

  const p = this.player;
  const total = p.positions.length;
  const current = p.positions[p.position] ?? p.nullPosition;

  this.manager.historyPush({
    position: {
      type: 'create',
      index: total
    }
  });

  p.addNewPosition(current.length, current.speed);
  p.position = total;
  p.line = 0;

  this.updateAfterActionButton();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosInsert = function() {
  if (this.modePlay) {
    return;
  }
  if (!this.player.positions.length) {
    return this.onCmdPosCreate();
  }

  const p = this.player;
  const i = p.position;
  const current = p.positions[i] ?? p.nullPosition;
  const pt = p.addNewPosition(current.length, current.speed, false);

  for (let chn = 0; chn < 6; chn++) {
    pt.ch[chn].pattern = current.ch[chn].pattern;
    pt.ch[chn].pitch = current.ch[chn].pitch;
  }

  this.manager.historyPush({
    position: {
      type: 'create',
      index: i
    }
  });

  p.positions.splice(i, 0, pt);
  p.countPositionFrames(i);
  p.storePositionRuntime(i);
  p.line = 0;

  this.updateAfterActionButton();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosDelete = function() {
  if (this.modePlay || !this.player.positions.length) {
    return;
  }

  const keys = this.globalKeyState;
  const pos = this.player.position;
  const app = this;

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.position.delete.title,
    text: i18n.dialog.position.delete.msg,
    buttons: 'yesno',
    style: 'info',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      const { ch, length, speed } = app.player.positions[pos];
      app.manager.historyPush({
        position: {
          type: 'remove',
          index: pos,
          data: ch,
          length,
          speed,
        }
      });

      app.player.line = 0;
      app.player.positions.splice(pos, 1);
      if (pos >= app.player.positions.length) {
        app.player.position--;
      }

      app.updateAfterActionButton();
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosMoveUp = function() {
  const p = this.player;
  let i = p.position;
  const swap = p.positions[i];

  if (this.modePlay || !p.positions.length || !i) {
    return;
  }

  this.manager.historyPush({
    position: {
      type: 'move',
      index: i,
      to: i - 1,
    }
  });

  p.positions[i] = p.positions[--i];
  p.positions[i] = swap;

  p.position = i;
  p.line = 0;

  this.updateAfterActionButton();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosMoveDown = function() {
  const p = this.player;
  let i = p.position;
  const total = p.positions.length;
  const swap = p.positions[i];

  if (this.modePlay || !total || i === (total - 1)) {
    return;
  }

  this.manager.historyPush({
    position: {
      type: 'move',
      index: i,
      to: i + 1,
    }
  });

  p.positions[i] = p.positions[++i];
  p.positions[i] = swap;

  p.position = i;
  p.line = 0;

  this.updateAfterActionButton();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpPlay = function() {
  AudioDriver.play();
  this.player.playSample(this.workingSample, 0, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpClear = function() {
  const app = this;
  const smp = this.player.samples[this.workingSample];
  const keys = this.globalKeyState;

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.sample.clear.title,
    text: i18n.dialog.sample.clear.msg,
    style: 'warning',
    buttons: [
      { caption: i18n.dialog.sample.options[0], id: 7 },
      { caption: i18n.dialog.sample.options[1], id: 1 },
      { caption: i18n.dialog.sample.options[2], id: 2 },
      { caption: i18n.dialog.sample.options[3], id: 4 },
      { caption: i18n.dialog.sample.options[4], id: 'cancel' }
    ],
    callback: (mask) => {
      keys.inDialog = false;
      if (mask === 'cancel' || typeof mask === 'string') {
        return;
      }

      app.manager.historyPushSampleDebounced();
      smp.data.forEach(tick => {
        if (mask & 1) {
          tick.volume.byte = 0;
          tick.enable_freq = false;
        }
        if (mask & 2) {
          tick.enable_noise = false;
          tick.noise_value = 0;
        }
        if (mask & 4) {
          tick.shift = 0;
        }
      });

      const all = (mask === 7);
      if (all) {
        smp.name = '';
        smp.loop = 0;
        smp.end = 0;
        smp.releasable = false;
      }

      app.updateSampleEditor(all);
      if (mask & 4) {
        app.smpornedit.updateSamplePitchShift();
      }

      app.file.modified = true;
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpSwap = function() {
  const smp = this.player.samples[this.workingSample];

  this.manager.historyPushSampleDebounced();
  smp.data.forEach(tick => {
    const swap = tick.volume.L;
    tick.volume.L = tick.volume.R;
    tick.volume.R = swap;
  });

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolUp = function() {
  const smp = this.player.samples[this.workingSample];

  this.manager.historyPushSampleDebounced();
  smp.data.forEach((tick, i) => {
    if ((i < smp.end && tick.volume.L < 15) ||
			(i >= smp.end && tick.volume.L > 0 && tick.volume.L < 15)) {

      tick.volume.L++;
    }
  });

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolDown = function() {
  const smp = this.player.samples[this.workingSample];

  this.manager.historyPushSampleDebounced();
  smp.data.forEach(tick => {
    if (tick.volume.L > 0) {
      tick.volume.L--;
    }
  });

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolUp = function() {
  const smp = this.player.samples[this.workingSample];

  this.manager.historyPushSampleDebounced();
  smp.data.forEach((tick, i) => {
    if ((i < smp.end && tick.volume.R < 15) ||
			(i >= smp.end && tick.volume.R > 0 && tick.volume.R < 15)) {

      tick.volume.R++;
    }
  });

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolDown = function() {
  const smp = this.player.samples[this.workingSample];

  this.manager.historyPushSampleDebounced();
  smp.data.forEach(tick => {
    if (tick.volume.R > 0) {
      tick.volume.R--;
    }
  });

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyLR = function() {
  const smp = this.player.samples[this.workingSample];

  this.manager.historyPushSampleDebounced();
  smp.data.forEach(tick => (tick.volume.R = tick.volume.L));

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyRL = function() {
  const smp = this.player.samples[this.workingSample];

  this.manager.historyPushSampleDebounced();
  smp.data.forEach(tick => (tick.volume.L = tick.volume.R));

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotL = function() {
  const smp = this.player.samples[this.workingSample];
  const data = smp.data;

  this.manager.historyPushSampleDebounced();

  let i = 0;
  const backup = $.extend(true, {}, data[i]);

  for (; i < 256; i++) {
    const ref = (i < 255) ? data[i + 1] : backup;

    data[i].volume.byte = ref.volume.byte;
    data[i].enable_freq = ref.enable_freq;
    data[i].enable_noise = ref.enable_noise;
    data[i].noise_value = ref.noise_value;
    data[i].shift = ref.shift;
  }

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotR = function() {
  const smp = this.player.samples[this.workingSample];
  const data = smp.data;

  this.manager.historyPushSampleDebounced();

  let i = 255;
  const backup = $.extend(true, {}, data[i]);

  for (; i >= 0; i--) {
    const ref = (i > 0) ? data[i - 1] : backup;

    data[i].volume.byte = ref.volume.byte;
    data[i].enable_freq = ref.enable_freq;
    data[i].enable_noise = ref.enable_noise;
    data[i].noise_value = ref.noise_value;
    data[i].shift = ref.shift;
  }

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpEnable = function() {
  const smp = this.player.samples[this.workingSample];

  this.manager.historyPushSampleDebounced();
  smp.data.forEach(tick => {
    if (tick.volume.byte) {
      tick.enable_freq = true;
    }
  });

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpDisable = function() {
  const smp = this.player.samples[this.workingSample];

  this.manager.historyPushSampleDebounced();
  smp.data.forEach(tick => {
    tick.enable_freq = false;
  });

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnPlay = function() {
  AudioDriver.play();
  this.player.playSample(this.workingOrnTestSample, this.workingOrnament, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnClear = function() {
  const keys = this.globalKeyState;
  const orn = this.player.ornaments[this.workingOrnament];
  const app = this;

  keys.inDialog = true;
  $('#dialog').confirm({
    title: i18n.dialog.ornament.clear.title,
    text: i18n.dialog.ornament.clear.msg,
    style: 'warning',
    buttons: 'yesno',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      app.manager.historyPushOrnamentDebounced();

      orn.name = '';
      orn.data.fill(0);
      orn.loop = orn.end = 0;

      app.smpornedit.updateOrnamentEditor(true);
      app.file.modified = true;
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnShiftLeft = function() {
  const orn = this.player.ornaments[this.workingOrnament];
  const data = orn.data;

  this.manager.historyPushOrnamentDebounced();
  for (let i = 0, ref = data[i]; i < 256; i++) {
    data[i] = (i < 255) ? data[i + 1] : ref;
  }

  this.smpornedit.updateOrnamentEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnShiftRight = function() {
  const orn = this.player.ornaments[this.workingOrnament];
  const data = orn.data;

  this.manager.historyPushOrnamentDebounced();
  for (let i = 255, ref = data[i]; i >= 0; i--) {
    data[i] = (i > 0) ? data[i - 1] : ref;
  }

  this.smpornedit.updateOrnamentEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransUp = function() {
  const orn = this.player.ornaments[this.workingOrnament];

  this.manager.historyPushOrnamentDebounced();
  for (let i = 0, l = orn.end; i < l; i++) {
    orn.data[i]++;
  }

  this.smpornedit.updateOrnamentEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransDown = function() {
  const orn = this.player.ornaments[this.workingOrnament];

  this.manager.historyPushOrnamentDebounced();
  for (let i = 0, l = orn.end; i < l; i++) {
    orn.data[i]--;
  }

  this.smpornedit.updateOrnamentEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnCompress = function() {
  const orn = this.player.ornaments[this.workingOrnament];
  const data = orn.data;
  let i = 0;

  this.manager.historyPushOrnamentDebounced();
  for (let k = 0; k < 256; i++, k += 2) {
    data[i] = data[k];
  }
  data.fill(0, i);

  orn.loop >>= 1;
  orn.end >>= 1;

  this.smpornedit.updateOrnamentEditor(true);
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnExpand = function() {
  const orn = this.player.ornaments[this.workingOrnament];
  const data = orn.data;

  this.manager.historyPushOrnamentDebounced();
  for (let i = 127, k = 256; k > 0; i--) {
    data[--k] = data[i];
    data[--k] = data[i];
  }

  orn.loop <<= 1;
  orn.end <<= 1;

  this.smpornedit.updateOrnamentEditor(true);
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
