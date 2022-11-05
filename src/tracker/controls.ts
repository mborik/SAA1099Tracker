/**
 * SAA1099Tracker: Entry point
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
import { toTimeString, toWidth } from '../commons/number';
import SyncTimer from '../commons/timer';
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
Tracker.prototype.updateEditorCombo = function(step) {
  if (step === undefined) {
    this.player.playLine();
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
  const curpos = this.player.currentPosition;
  const len = this.player.position.length;
  const pos = this.player.position[curpos];
  const line = this.player.currentLine;
  const even = line & -2;
  let total = 0;
  let current = 0;
  let i = int * 60;
  let bpm;

  if (len) {
    bpm = (i / (pos.frames[even + 2] - pos.frames[even])) >> 1;

    this.player.position.forEach((posi, i) => {
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
    bpm = (i / this.player.currentSpeed) >> 2;

    elTimeCurrent.textContent = elTimeTotal.textContent = toTimeString(0);
    elTicksCurrent.textContent = elTicksTotal.textContent = '0';
  }

  elBPM.textContent = bpm.toString();
  elFreq.textContent = int.toString();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPattern = function() {
  const a = [ '#scPattern', '#scPatternLen', '#btPatternDelete', '#btPatternClean', '#btPatternInfo'];
  const lastState = $(a[0]).prop('disabled');
  let pat = this.workingPattern;
  let len = this.player.pattern.length;
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
    $(a[1]).val(this.player.pattern[pat].end);
  }
  else {
    $(a[1]).val(64);
  }

  this.workingPattern = pat;
  $(a[0]).trigger('touchspin.updatesettings', { min: min, max: max, initval: pat }).val(pat);

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
  const len = this.player.position.length;
  const p = this.player.currentPosition;
  let d = true;

  if (len) {
    d = false;
    $(a[0] + ',' + a[4]).trigger('touchspin.updatesettings', { min: 1, max: len });
    $(a[0]).val(p + 1);
    $(a[3]).val(len);
    $(a[4]).val(this.player.repeatPosition + 1);

    pos = this.player.position[p];
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
Tracker.prototype.onCmdAppUpdate = function(status, data) {
  const remote = window.electron?.remote;
  const updater = remote?.getCurrentWindow()?.updater;

  if (!(remote && updater)) {
    return;
  }
  else if (status) {
    devLog('Tracker.updater', 'Check update status: "%s"', status);
    return;
  }

  const keys = this.globalKeyState;
  let description = '';

  if (data.changelog instanceof Array && data.changelog.length) {
    description = data.changelog.join('</li><li>');
  }
  if (data.important) {
    description = `<b>${i18n.dialog.app.update.important}</b>` +
			(description ? `</li><li>${description}` : '');
  }
  if (description) {
    description = `<p>${i18n.dialog.app.update.changelog}</p><ul><li>${description}</li></ul>`;
  }

  keys.inDialog = true;
  $('#dialoque').confirm({
    title: i18n.dialog.app.update.title,
    buttons: [
      { caption: i18n.dialog.app.update.options[0], id: 'apply', style: 'btn-warning' },
      { caption: i18n.dialog.app.update.options[1] }
    ],
    html: `<p><b>${data.name} v${data.version}</b> ` + i18n.dialog.app.update.msg + description,
    style: 'warning',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn === 'apply') {
        const loader = $('#overlay .loader');
        const loaderContent = loader.html();

        loader.html(i18n.dialog.app.update.download);
        document.body.className = 'loading';

        updater.download(((error?: Error) => {
          if (error) {
            devLog('Tracker.updater', 'Failed: "%s"', error);

            loader.html(i18n.app.error.failed);
            setTimeout(() => {
              document.body.className = '';
              loader.html(loaderContent);
            }, 5e3);
          }
          else {
            this.destroying = true;
            remote.app.quit();
          }
        }).bind(this));
      }
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdAppExit = function() {
  const keys = this.globalKeyState;
  const file = this.file;

  if (this.destroying || window.electron) {
    return;
  }
  else if (!keys.inDialog) {
    if (!file.modified) {
      return;
    }

    keys.inDialog = true;
    $('#dialoque').confirm({
      title: i18n.dialog.app.exit.title,
      buttons: [
        { caption: i18n.dialog.app.exit.options[0], id: 'save' },
        { caption: i18n.dialog.app.exit.options[1], id: 'exit' },
        { caption: i18n.dialog.app.exit.options[2], id: 'cancel' }
      ],
      text: i18n.dialog.app.exit.msg,
      style: 'danger',
      callback: (btn) => {
        const app = window.electron?.remote.app;

        keys.inDialog = false;
        if (btn === 'exit') {
          this.destroying = true;
          app.quit();
        }
        else if (btn === 'save') {
          if (!file.yetSaved) {
            return file.dialog.save();
          }
          else if (file.fileName) {
            file.saveFile(file.fileName, $('#stInfoPanel u:eq(3)').text());
            this.destroying = true;
            app.quit();
          }
        }
      }
    });
  }

  return true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileNew = function() {
  const keys = this.globalKeyState;
  const file = this.file;
  if (this.modePlay || !file.yetSaved && !file.modified && !file.fileName) {
    return;
  }

  keys.inDialog = true;
  $('#dialoque').confirm({
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

    $('#dialoque').confirm({
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
  if (!this.player.position.length) {
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
Tracker.prototype.onCmdFileImport = function(demosong) {
  const keys = this.globalKeyState;
  if (this.modePlay || keys.lastPlayMode) {
    return;
  }

  let fnToCall: () => void;
  if (demosong) {
    const url = (window.electron ?
      ('res://demo/' + demosong) : ('demosongs/' + demosong + '.json'));
    fnToCall = this.file.importDemosong.bind(this.file, demosong, url);
  }
  else {
    fnToCall = this.file.importFile.bind(this.file);
  }

  if (this.file.modified) {
    keys.inDialog = true;

    $('#dialoque').confirm({
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
Tracker.prototype.onCmdEditCut = function() {
  if (this.activeTab === 0 && this.modeEdit) {
    this.manager.copyFromTracklist();
    this.manager.clearFromTracklist();

    this.player.countPositionFrames(this.player.currentPosition);
    this.updateEditorCombo(0);
  }
  else if (this.activeTab === 1) {
    this.manager.copySample();
    this.manager.clearSample();
    this.updateSampleEditor(true);
    this.smpornedit.updateSamplePitchShift();
  }
  else if (this.activeTab === 2) {
    this.manager.copyOrnament();
    this.manager.clearOrnament();
    this.smpornedit.updateOrnamentEditor(true);
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditCopy = function() {
  if (this.activeTab === 0 && this.modeEdit) {
    this.manager.copyFromTracklist();
  }
  else if (this.activeTab === 1) {
    this.manager.copySample();
  }
  else if (this.activeTab === 2) {
    this.manager.copyOrnament();
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditPaste = function() {
  if (this.activeTab === 0 && this.modeEdit) {
    if (this.manager.pasteToTracklist()) {
      this.player.countPositionFrames(this.player.currentPosition);
      this.updateEditorCombo(this.ctrlRowStep);
    }
  }
  else if (this.activeTab === 1) {
    this.manager.pasteSample();
    this.updateSampleEditor(true);
    this.smpornedit.updateSamplePitchShift();
  }
  else if (this.activeTab === 2) {
    this.manager.pasteOrnament();
    this.smpornedit.updateOrnamentEditor(true);
  }
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditClear = function() {
  if (this.activeTab === 0 && this.modeEdit) {
    this.manager.clearFromTracklist();
    this.player.countPositionFrames(this.player.currentPosition);
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
    this.player.storePositionRuntime(this.player.currentPosition);
  }

  this.modePlay = this.player.playPosition(false, true, true);
  SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlayStart = function() {
  if (this.activeTab === 0) {
    this.doc.setStatusText();
  }
  if (this.modeEdit) {
    this.player.storePositionRuntime(this.player.currentPosition);
  }

  this.modePlay = this.player.playPosition(true, true, true);
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
    this.player.storePositionRuntime(this.player.currentPosition);
  }

  this.modePlay = this.player.playPosition(false, false, false);
  SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlayStart = function() {
  if (this.activeTab === 0) {
    this.doc.setStatusText();
  }
  if (this.modeEdit) {
    this.player.storePositionRuntime(this.player.currentPosition);
  }

  this.modePlay = this.player.playPosition(false, false, true);
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
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleEditMode = function(newState) {
  const state = (typeof newState === 'boolean') ? newState : (this.modeEdit = !this.modeEdit);
  const el = $('.tracklist-panel');

  if (!state) {
    this.doc.setStatusText();
    this.player.storePositionRuntime(this.player.currentPosition);
  }

  el[state ? 'addClass' : 'removeClass']('edit');
  this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdShowDocumentation = function(name) {
  const filename = (window.electron ? ('res://doc/' + name) : ('doc/' + name + '.txt'));
  const cache = this.doc.txtCache;
  const keys = this.globalKeyState;
  const data = cache[name];

  const dialog = $('#documodal');
  const button = $('<button/>').attr({
    'type': 'button',
    'class': 'close',
    'data-dismiss': 'modal'
  }).text('\xd7');

  if (data) {
    keys.inDialog = true;
    dialog.modal('show')
      .find('.modal-body')
      .html(data)
      .prepend(button)
      .on('hidden.bs.modal', () => {
        keys.inDialog = false;
        $(this).find('.modal-body').empty();
      });
  }
  else {
    $.ajax(filename, {
      cache: true,
      contentType: 'text/plain',
      dataType: 'text',
      isLocal: true,
      success: (data) => {
        data = ('<pre>\n' + data + '</pre>')
          .replace(/\s*?^\=\=\s*([^\=]+?)\s*[\=\s]+$/gm, '</pre><h3>$1</h3><pre>')
          .replace(/<pre><\/pre>/g, '');

        cache[name] = data;
        dialog.modal('show')
          .find('.modal-body')
          .html(data)
          .prepend(button)
          .on('hidden.bs.modal', () => {
            keys.inDialog = false;
            $(this).find('.modal-body').empty();
          });
      }
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
  const pt = this.player.pattern[id];
  const len = (this.workingPattern && this.player.pattern[this.workingPattern].end) || 64;

  pt.end = len;
  this.workingPattern = id;
  this.updatePanelPattern();
  this.file.modified = true;

  $('#scPatternLen').focus();
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
  const len = p.pattern.length - 1;
  let msg = null;

  if (p.countPatternUsage(pt) > 0) {
    msg = i18n.dialog.pattern.delete.msg.used;
  }
  if (pt !== len) {
    msg = i18n.dialog.pattern.delete.msg.notlast;
  }
  if (!msg) {
    msg = i18n.dialog.pattern.delete.msg.sure;
  }

  keys.inDialog = true;
  $('#dialoque').confirm({
    title: i18n.dialog.pattern.delete.title,
    text: msg,
    buttons: 'yesno',
    style: (pt !== len) ? 'warning' : 'info',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      for (let i = 0, l = p.position.length, pos, chn; i < l; i++) {
        for (pos = p.position[i], chn = 0; chn < 6; chn++) {
          if (pos.ch[chn].pattern === pt) {
            pos.ch[chn].pattern = 0;
          }
          else if (pos.ch[chn].pattern > pt) {
            pos.ch[chn].pattern--;
          }
        }
      }

      p.pattern.splice(pt, 1);
      if (pt === len) {
        pt--;
      }

      app.workingPattern = pt;
      app.updatePanelInfo();
      app.updatePanelPattern();
      app.updatePanelPosition();
      app.updateTracklist();
      app.file.modified = true;
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatClean = function() {
  if (this.modePlay || !this.workingPattern) {
    return;
  }

  const app = this;
  const keys = this.globalKeyState;
  const pt = this.player.pattern[this.workingPattern].data;

  keys.inDialog = true;
  $('#dialoque').confirm({
    title: i18n.dialog.pattern.clean.title,
    text: i18n.dialog.pattern.clean.msg,
    buttons: 'yesno',
    style: 'info',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      pt.forEach(line => {
        line.tone = 0;
        line.release = false;
        line.smp = 0;
        line.orn = 0;
        line.orn_release = false;
        line.volume.byte = 0;
        line.cmd = 0;
        line.cmd_data = 0;
      });

      app.updatePanelInfo();
      app.updateTracklist();
      app.file.modified = true;
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatInfo = function() {
  // TODO
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosCreate = function() {
  if (this.modePlay) {
    return;
  }

  const p = this.player;
  const total = p.position.length;
  const current = p.position[p.currentPosition] || p.nullPosition;

  p.addNewPosition(current.length, current.speed);
  p.currentPosition = total;
  p.currentLine = 0;

  this.updatePanelInfo();
  this.updatePanelPosition();
  this.updateTracklist();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosInsert = function() {
  if (this.modePlay) {
    return;
  }
  if (!this.player.position.length) {
    return this.onCmdPosCreate();
  }

  let p = this.player, chn;
  const i = p.currentPosition;
  const current = p.position[i] || p.nullPosition;
  const pt = p.addNewPosition(current.length, current.speed, false);

  for (chn = 0; chn < 6; chn++) {
    pt.ch[chn].pattern = current.ch[chn].pattern;
    pt.ch[chn].pitch = current.ch[chn].pitch;
  }

  p.position.splice(i, 0, pt);
  p.countPositionFrames(i);
  p.storePositionRuntime(i);
  p.currentLine = 0;

  this.updatePanelInfo();
  this.updatePanelPattern();
  this.updatePanelPosition();
  this.updateTracklist();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosDelete = function() {
  if (this.modePlay || !this.player.position.length) {
    return;
  }

  const keys = this.globalKeyState;
  const pos = this.player.currentPosition;
  const app = this;

  keys.inDialog = true;
  $('#dialoque').confirm({
    title: i18n.dialog.position.delete.title,
    text: i18n.dialog.position.delete.msg,
    buttons: 'yesno',
    style: 'info',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

      app.player.currentLine = 0;
      app.player.position.splice(pos, 1);
      if (pos >= app.player.position.length) {
        app.player.currentPosition--;
      }

      app.updatePanelInfo();
      app.updatePanelPattern();
      app.updatePanelPosition();
      app.updateTracklist();
      app.file.modified = true;
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosMoveUp = function() {
  const p = this.player;
  let i = p.currentPosition;
  const swap = p.position[i];

  if (this.modePlay || !p.position.length || !i) {
    return;
  }

  p.position[i] = p.position[--i];
  p.position[i] = swap;

  p.currentPosition = i;
  p.currentLine = 0;

  this.updatePanelInfo();
  this.updatePanelPosition();
  this.updateTracklist();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosMoveDown = function() {
  const p = this.player;
  let i = p.currentPosition;
  const total = p.position.length;
  const swap = p.position[i];

  if (this.modePlay || !total || i === (total - 1)) {
    return;
  }

  p.position[i] = p.position[++i];
  p.position[i] = swap;

  p.currentPosition = i;
  p.currentLine = 0;

  this.updatePanelInfo();
  this.updatePanelPosition();
  this.updateTracklist();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpPlay = function() {
  this.player.playSample(this.workingSample, 0, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpClear = function() {
  const app = this;
  const smp = this.player.sample[this.workingSample];

  this.globalKeyState.inDialog = true;

  $('#dialoque').confirm({
    title: i18n.dialog.sample.clear.title,
    text: i18n.dialog.sample.clear.msg,
    style: 'warning',
    buttons: [
      { caption: i18n.dialog.sample.clear.options[0], id: 7 },
      { caption: i18n.dialog.sample.clear.options[1], id: 1 },
      { caption: i18n.dialog.sample.clear.options[2], id: 2 },
      { caption: i18n.dialog.sample.clear.options[3], id: 4 },
      { caption: i18n.dialog.sample.clear.options[4], id: 'cancel' }
    ],
    callback: (mask) => {
      app.globalKeyState.inDialog = false;
      if (mask === 'cancel' || typeof mask === 'string') {
        return;
      }

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
  const smp = this.player.sample[this.workingSample];

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
  const smp = this.player.sample[this.workingSample];

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
  const smp = this.player.sample[this.workingSample];

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
  const smp = this.player.sample[this.workingSample];

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
  const smp = this.player.sample[this.workingSample];

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
  const smp = this.player.sample[this.workingSample];

  smp.data.forEach(tick => (tick.volume.R = tick.volume.L));

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyRL = function() {
  const smp = this.player.sample[this.workingSample];

  smp.data.forEach(tick => (tick.volume.L = tick.volume.R));

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotL = function() {
  const smp = this.player.sample[this.workingSample];
  const data = smp.data;

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
  const smp = this.player.sample[this.workingSample];
  const data = smp.data;

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
  const smp = this.player.sample[this.workingSample];

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
  const smp = this.player.sample[this.workingSample];

  smp.data.forEach(tick => {
    tick.enable_freq = false;
  });

  this.updateSampleEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnPlay = function() {
  this.player.playSample(this.workingOrnTestSample, this.workingOrnament, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnClear = function() {
  const keys = this.globalKeyState;
  const orn = this.player.ornament[this.workingOrnament];
  const app = this;

  keys.inDialog = true;
  $('#dialoque').confirm({
    title: i18n.dialog.ornament.clear.title,
    text: i18n.dialog.ornament.clear.msg,
    style: 'warning',
    buttons: 'yesno',
    callback: (btn) => {
      keys.inDialog = false;
      if (btn !== 'yes') {
        return;
      }

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
  const orn = this.player.ornament[this.workingOrnament];
  const data = orn.data;

  for (let i = 0, ref = data[i]; i < 256; i++) {
    data[i] = (i < 255) ? data[i + 1] : ref;
  }

  this.smpornedit.updateOrnamentEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnShiftRight = function() {
  const orn = this.player.ornament[this.workingOrnament];
  const data = orn.data;

  for (let i = 255, ref = data[i]; i >= 0; i--) {
    data[i] = (i > 0) ? data[i - 1] : ref;
  }

  this.smpornedit.updateOrnamentEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransUp = function() {
  const orn = this.player.ornament[this.workingOrnament];

  for (let i = 0, l = orn.end; i < l; i++) {
    orn.data[i]++;
  }

  this.smpornedit.updateOrnamentEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransDown = function() {
  const orn = this.player.ornament[this.workingOrnament];

  for (let i = 0, l = orn.end; i < l; i++) {
    orn.data[i]--;
  }

  this.smpornedit.updateOrnamentEditor();
  this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnCompress = function() {
  const orn = this.player.ornament[this.workingOrnament];
  const data = orn.data;
  let i = 0;

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
  const orn = this.player.ornament[this.workingOrnament];
  const data = orn.data;

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
