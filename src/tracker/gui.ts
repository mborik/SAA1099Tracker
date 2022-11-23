/**
 * SAA1099Tracker: Template loader and element populator with jQuery
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
import { abs } from '../commons/number';
import SyncTimer from '../commons/timer';
import { MAX_PATTERN_LEN } from '../player/globals';
import Tracker from '.';

type JQueryInputEventObject = JQueryEventObject & { currentTarget: HTMLInputElement };

/* eslint-disable key-spacing */
//---------------------------------------------------------------------------------------
Tracker.prototype.populateGUI = function(app: Tracker) {
  const populatedElementsTable = [
    {
      global:   'document',
      method:   'contextmenu',
      handler:  (e: MouseEvent) => {
        e.preventDefault();
        return false;
      }
    }, {
      global:   'window',
      method:   'resize',
      handler:  (_: unknown, force: true) => {
        const smpedit = app.smpornedit;

        if (app.activeTab === 0) {
          const trackLines = app.tracklist.countTracklines();
          if (trackLines !== app.settings.tracklistLines || force) {
            app.tracklist.setHeight(trackLines);
            app.updateTracklist(true);
          }
        }
        else if (
          app.activeTab === 1 &&
          smpedit.initialized &&
          !smpedit.smpeditShiftShown
        ) {
          const left = $(smpedit.amp.obj).offset().left;
          if (left) {
            smpedit.smpeditOffset.left = left | 0;
          }
        }

        const height = $(document).height();
        if (height) {
          $('#documodal .modal-body').css('height', (height * 0.9) | 0);
        }
      }
    }, {
      global:   'window',
      method:   'on',
      param:    'beforeunload',
      handler:  (e: BeforeUnloadEvent): any => {
        e.preventDefault();
        app.onCmdStop();
        app.onCmdAppExit();
      }
    }, {
      global:   'window',
      method:   'on',
      param:    'keyup keydown',
      handler:  (e: JQueryKeyEventObject) => {
        return app.handleKeyEvent(e.originalEvent as any);
      }
    }, {
      global:   'window',
      method:   'on',
      param:    'blur',
      handler:  () => {
        const o = app.globalKeyState;
        for (const key in o) {
          if (+key) {
            delete o[key];
            o.length--;
          }
        }
      }
    }, {
      selector: '[data-tooltip]',
      method:   'each',
      handler:  (_: number, el: HTMLLabelElement & HTMLAnchorElement) => {
        const data = (el.dataset || $(el).data()).tooltip || '';
        const id = data.length ? data : el.id || el.htmlFor || el.name;
        const delay = /^mi/.test(id) ? 500 : 2000;
        let ttTitle = app.doc.tooltip[id];

        if (!ttTitle) {
          return;
        }

        ttTitle = ttTitle
          .replace(/\.{3}/g, '&hellip;')
          .replace(/\n/g, '<br>')
          .replace(/(\[.+?\])$/, '<kbd>$1</kbd>');

        $(el).tooltip({
          html: true,
          sanitize: false,
          animation: false,
          delay: { 'show': delay, 'hide': 0 },
          placement: 'auto top' as any,
          trigger: 'hover',
          title: ttTitle
        });
      }
    }, {
      selector: 'canvas',
      method:   'each',
      handler:  (_: number, el: HTMLCanvasElement) => {
        let name = el.className;
        const o = app[name];

        if (name === 'tracklist') {
          o.obj = el;
          o.ctx = el.getContext('2d');
          o.ctx.imageSmoothingEnabled = false;
        }
        else if (name === 'smpornedit') {
          name = el.id.replace('smpedit_', '');

          o[name].obj = el;
          o[name].ctx = el.getContext('2d', { willReadFrequently: true });
          o[name].ctx.imageSmoothingEnabled = false;
        }

        $(el).on('mousedown mouseup mousemove dblclick mousewheel DOMMouseScroll',
          (e: JQueryEventObject) => {
            const originalEvent = e.originalEvent as WheelEvent & { wheelDelta: number };
            const delta =
              -originalEvent.deltaY || originalEvent.wheelDelta ||
                (originalEvent.type === 'DOMMouseScroll' && -originalEvent.detail);

            if (e.type === 'mousedown' && !app.modeEdit && app.player.position.length) {
              app.onCmdToggleEditMode();

              e.stopPropagation();
              e.preventDefault();
              return;
            }

            if (delta) {
              e.stopPropagation();
              e.preventDefault();

              (<any> e).delta = delta;
              (<any> e).type = 'mousewheel';
            }

            app.handleMouseEvent(name, o, e);
          });
      }
    }, {
      selector: '#main-tabpanel a[data-toggle="tab"]',
      method:   'on',
      param:    'shown.bs.tab',
      handler:  (e: JQueryEventObject) => {
        const data = $(e.currentTarget).data();
        app.activeTab = +data.value || 0;
        if (app.activeTab) {
          $('#statusbar').hide();
        }
        else {
          $('#statusbar').show();
          $('#tracklist').focus();
        }

        $(window).trigger('resize');
      }
    }, {
      selector: '#txHeaderTitle',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.songTitle = e.currentTarget.value.trim())
    }, {
      selector: '#txHeaderAuthor',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.songAuthor = e.currentTarget.value.trim())
    }, {
      selector: '#scOctave',
      method:   'TouchSpin',
      data: {
        initval: '2',
        min: 1, max: 8
      }
    }, {
      selector: '#scOctave',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.ctrlOctave = +e.currentTarget.value)
    }, {
      selector: '#scAutoSmp',
      method:   'TouchSpin',
      data: {
        initval: '0',
        radix: 32,
        min: 0, max: 31
      }
    }, {
      selector: '#scAutoSmp',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.ctrlSample = parseInt(e.currentTarget.value, 32))
    }, {
      selector: '#scAutoOrn',
      method:   'TouchSpin',
      data: {
        initval: '0',
        radix: 16,
        min: 0, max: 15
      }
    }, {
      selector: '#scAutoOrn',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.ctrlOrnament = parseInt(e.currentTarget.value, 16))
    }, {
      selector: '#scRowStep',
      method:   'TouchSpin',
      data: {
        initval: '0',
        min: 0, max: 8
      }
    }, {
      selector: '#scRowStep',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.ctrlRowStep = +e.currentTarget.value)
    }, {
      selector: '#scPattern,#scPosCurrent,#scPosRepeat,input[id^="scChnPattern"]',
      method:   'TouchSpin',
      data: {
        initval: '0',
        min: 0, max: 0
      }
    }, {
      selector: '#scPatternLen,#scPosLength',
      method:   'TouchSpin',
      data: {
        initval: '64',
        min: 1, max: MAX_PATTERN_LEN
      }
    }, {
      selector: '#scPattern',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        if (app.player.pattern.length <= 1) {
          return false;
        }

        app.workingPattern = +e.currentTarget.value;
        app.updatePanelPattern();
      }
    }, {
      selector: '#scPatternLen',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const el = $(e.currentTarget);
        const pp = app.player.pattern[app.workingPattern];

        if (app.player.pattern.length <= 1) {
          return false;
        }
        else if (app.modePlay) {
          el.val(pp.end);
          return false;
        }

        pp.end = +(el.val());
        pp.updateTracklist();
        app.player.countPositionFrames();
        app.updatePanelPattern();
        app.updateTracklist();
        app.updatePanelInfo();
        app.file.modified = true;
      }
    }, {
      selector: '#scPosCurrent',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const el = $(e.currentTarget);

        if (!app.player.position.length) {
          return false;
        }
        else if (app.modePlay) {
          el.val(app.player.currentPosition + 1);
          return false;
        }

        const pos = el.val() - 1;

        app.player.currentPosition = pos;
        app.player.currentLine = 0;

        app.player.storePositionRuntime(pos);

        app.updatePanelInfo();
        app.updatePanelPosition();
        app.updateTracklist();
      }
    }, {
      selector: '#scPosLength',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const el = e.currentTarget;
        const pp = app.player.currentPosition;
        const pos = app.player.position[pp];

        if (!app.player.position.length) {
          return false;
        }
        else if (app.modePlay) {
          el.value = pos.length.toString();
          return false;
        }

        pos.length = +el.value;

        if (app.player.currentLine >= pos.length) {
          app.player.currentLine = pos.length - 1;
        }

        app.player.countPositionFrames(pp);
        app.updateTracklist();
        app.updatePanelInfo();
        app.file.modified = true;
      }
    }, {
      selector: '#scPosSpeed',
      method:   'TouchSpin',
      data: {
        initval: '6',
        min: 1, max: 31
      }
    }, {
      selector: '#scPosSpeed',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const el = e.currentTarget;
        const pp = app.player.currentPosition;
        const pos = app.player.position[pp];

        if (!app.player.position.length) {
          return false;
        }
        else if (app.modePlay) {
          el.value = pos.speed.toString();
          return false;
        }

        pos.speed = +el.value;

        app.player.countPositionFrames(pp);
        app.updateTracklist();
        app.updatePanelInfo();
        app.file.modified = true;
      }
    }, {
      selector: '#scPosRepeat',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const el = e.currentTarget;

        if (!app.player.position.length) {
          return false;
        }
        else if (app.modePlay) {
          el.value = (app.player.repeatPosition + 1).toString();
          return false;
        }
        else {
          app.player.repeatPosition = +el.value - 1;
        }

        app.file.modified = true;
      }
    }, {
      selector: 'input[id^="scChnPattern"]',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const el = e.currentTarget;
        const pp = app.player.currentPosition;
        const chn = parseInt(el.id.substr(-1)) - 1;
        const pos = app.player.position[pp] || app.player.nullPosition;
        const val = +el.value;
        const prev = pos.ch[chn].pattern;

        if (!app.player.position.length) {
          return false;
        }
        else if (app.modePlay) {
          el.value = prev.toString();
          return false;
        }

        pos.ch[chn].pattern = val;

        if (app.workingPattern === val || app.workingPattern === prev) {
          app.updatePanelPattern();
        }

        app.player.countPositionFrames(pp);
        app.updateTracklist();
        app.updatePanelInfo();
        app.file.modified = true;
      }
    }, {
      selector: 'input[id^="scChnTrans"]',
      method:   'each',
      handler:  (_: number, el: HTMLInputElement) => {
        $(el).TouchSpin({
          initval: '0',
          min: -24, max: 24
        }).change((e: JQueryInputEventObject) => {
          const el = e.currentTarget;
          const chn = parseInt(el.id.substr(-1)) - 1;
          const pos = app.player.position[app.player.currentPosition];

          if (!app.player.position.length) {
            return false;
          }
          else if (app.modePlay) {
            el.value = pos.ch[chn].pitch.toString();
            return false;
          }
          else {
            pos.ch[chn].pitch = +el.value;
          }

          app.file.modified = true;
        });
      }
    }, {
      selector: 'input[id^="scChnButton"]',
      method:   'each',
      handler:  (_: number, el: HTMLInputElement) => {
        const cc = el.id.substr(-1);
        $(el).bootstrapToggle({
          on: cc,
          off: cc,
          onstyle: 'default',
          offstyle: 'default',
          size: 'mini',
          width: 58
        }).change((e: JQueryInputEventObject) => {
          const el = e.currentTarget;
          app.player.rtSong.muted[(+el.value - 1)] = !el.checked;
        });
      }
    }, {
      selector: '#sample-tabpanel a[data-toggle="tab"]',
      method:   'on',
      param:    'shown.bs.tab',
      handler:  (e: JQueryInputEventObject) => {
        const smpedit = app.smpornedit;
        const shiftShown = (e.currentTarget.id === 'tab-pitchshift');

        smpedit.smpeditShiftShown = shiftShown;
        if (shiftShown && e.relatedTarget.id === 'tab-sampledata') {
          smpedit.updateSamplePitchShift();
          return;
        }
        const left = $(smpedit.amp.obj).offset().left;
        if (left) {
          smpedit.smpeditOffset.left = left | 0;
        }
      }
    }, {
      selector: '#scSampleNumber,#scOrnTestSample',
      method:   'TouchSpin',
      data: {
        initval: '1',
        radix: 32,
        min: 1, max: 31
      }
    }, {
      selector: '#scSampleNumber',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        app.workingSample = parseInt(e.currentTarget.value, 32);
        app.workingOrnTestSample = app.workingSample;
        app.updateSampleEditor(true);
        app.smpornedit.updateSamplePitchShift();

        $('#sbSampleScroll').scrollLeft(0);
        $('#scOrnTestSample').val(app.workingOrnTestSample.toString(32).toUpperCase());
      }
    }, {
      selector: '#scOrnTestSample',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.workingOrnTestSample = parseInt(e.currentTarget.value, 32))
    }, {
      selector: '#scOrnNumber',
      method:   'TouchSpin',
      data: {
        initval: '1',
        radix: 16,
        min: 1, max: 15
      }
    }, {
      selector: '#scOrnNumber',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        app.workingOrnament = parseInt(e.currentTarget.value, 16);
        app.smpornedit.updateOrnamentEditor(true);
      }
    }, {
      selector: '#txSampleName',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        app.player.sample[app.workingSample].name = e.currentTarget.value;
        app.file.modified = true;
      }
    }, {
      selector: '#txOrnName',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        app.player.ornament[app.workingOrnament].name = e.currentTarget.value;
        app.file.modified = true;
      }
    }, {
      selector: '#scSampleTone,#scOrnTone',
      method:   'each',
      handler:  (_: number, el: HTMLInputElement) => {
        const cc = 'tx' + el.id.substr(2);
        $(el).TouchSpin({
          initval: app.workingSampleTone,
          min: 1, max: 96
        }).change((e: JQueryInputEventObject) => {
          const el = e.currentTarget;
          const val = parseInt(el.value);
          app.workingSampleTone = val;

          $('#scSampleTone,#scOrnTone')
            .val(val.toString())
            .prev().val(app.player.tones[val].txt);

        }).wrapAll(`<div id="${cc}"/>`)
          .removeAttr('style')
          .prop('readonly', true)
          .clone(false)
          .removeAttr('id')
          .removeAttr('tabindex')
          .insertBefore(el);

        $(el).trigger('change');
      }
    }, {
      selector: '#sbSampleScroll',
      method:   'scroll',
      handler:  (e: JQueryMouseEventObject) => {
        app.smpornedit.smpeditScroll = abs((e.target.scrollLeft / 1000) * 64);
        app.updateSampleEditor();
      }
    }, {
      selector: '#scSampleLength,#scSampleRepeat,#scOrnLength,#scOrnRepeat',
      method:   'TouchSpin',
      data: {
        initval: '0',
        min: 0, max: 255
      }
    }, {
      selector: '#chSampleRelease',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const sample = app.player.sample[app.workingSample];
        if (sample.end !== sample.loop) {
          sample.releasable = e.currentTarget.checked;
        }
        app.updateSampleEditor(true);
        app.file.modified = true;
      }
    }, {
      selector: '#scSampleLength',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const sample = app.player.sample[app.workingSample];
        const offset = +e.currentTarget.value - sample.end;
        const looper = (sample.loop += offset);

        sample.end += offset;
        sample.loop = ((sample.end - looper) < 0) ? 0 : looper;

        app.updateSampleEditor(true);
        app.file.modified = true;
      }
    }, {
      selector: '#scSampleRepeat',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const sample = app.player.sample[app.workingSample];
        const value = +e.currentTarget.value;

        sample.loop = sample.end - value;
        app.updateSampleEditor(true);
        app.file.modified = true;
      }
    }, {
      selector: '#fxOrnChords button',
      method:   'each',
      handler:  (_: number, el: HTMLButtonElement) => {
        const id = $(el).text();
        const chord = app.smpornedit.chords[id];
        const seqtxt = JSON.stringify(chord.sequence, null, 1).replace(/^\[|\]$|\s+/g, '');

        $(el).tooltip({
          html: true,
          sanitize: false,
          animation: false,
          trigger: 'hover',
          delay: { 'show': 500, 'hide': 0 },
          title: chord.name + `<kbd>{ ${seqtxt} }</kbd>`
        }).click(() => {
          const orn = app.player.ornament[app.workingOrnament];
          const l = chord.sequence.length;

          orn.data.fill(0);
          orn.name = chord.name;
          orn.loop = 0;
          orn.end = l;

          for (let i = 0; i < l; i++) {
            orn.data[i] = chord.sequence[i];
          }

          app.smpornedit.updateOrnamentEditor(true);
          app.file.modified = true;
        });
      }
    }, {
      selector: '#scOrnLength',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const orn = app.player.ornament[app.workingOrnament];
        const offset = +e.currentTarget.value - orn.end;
        const looper = (orn.loop += offset);

        orn.end += offset;
        orn.loop = ((orn.end - looper) < 0) ? 0 : looper;

        app.smpornedit.updateOrnamentEditor(true);
        app.file.modified = true;
      }
    }, {
      selector: '#scOrnRepeat',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const orn = app.player.ornament[app.workingOrnament];
        const value = +e.currentTarget.value;

        orn.loop = orn.end - value;
        app.smpornedit.updateOrnamentEditor(true);
        app.file.modified = true;
      }
    }, {
      selector: '#scSetTrkLines',
      method:   'TouchSpin',
      data: {
        initval: '17',
        min: 5, max: 127, step: 2
      }
    }, {
      selector: '#scSetTrkLines',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.settings.tracklistLines = +e.currentTarget.value)
    }, {
      selector: '#scSetTrkLineHeight',
      method:   'TouchSpin',
      data: {
        initval: '9',
        min: 7, max: 15, step: 2
      }
    }, {
      selector: '#scSetTrkLineHeight',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.settings.tracklistLineHeight = +e.currentTarget.value)
    }, {
      selector: '#chSetTrkAutosize',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => {
        const state = !!e.currentTarget.checked;
        app.settings.tracklistAutosize = state;

        $('label[for=scSetTrkLines]').toggleClass('disabled', state);
        $('#scSetTrkLines').toggleClass('disabled', state).prop('disabled', state);
      }
    }, {
      selector: '#chSetHexTracklist',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.settings.hexTracklines = !!e.currentTarget.checked)
    }, {
      selector: '#chSetHexFreqShifts',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.settings.hexSampleFreq = !!e.currentTarget.checked)
    }, {
      selector: '#chShowAutosaveFile',
      method:   'change',
      handler:  (e: JQueryInputEventObject) => (app.settings.showAutosaveInFileDialog = !!e.currentTarget.checked)
    }, {
      selector: '#rgSetAudioVolume',
      method:   'on',
      param:    'input change',
      handler:  (e: JQueryInputEventObject) => {
        const el = e.currentTarget;
        app.settings.setAudioGain(+el.value);
        $(el).tooltip('show');
      }
    }, {
      selector: '#rgSetAudioVolume',
      method:   'tooltip',
      data: {
        animation: false,
        trigger: 'hover',
        placement: 'right',
        delay: { 'show': 0, 'hide': 500 },
        title: function() {
          return `${this.value}%`;
        }
      }
    }, {
      selector: '#rgSetAudioBuffers',
      method:   'on',
      param:    'input change',
      handler:  (e: JQueryInputEventObject) => {
        const el = e.currentTarget;
        app.settings.audioBuffers = +el.value;
        app.settings.updateLatencyInfo();
      }
    }, {
      selector: 'input[name=rdSetAudioInt]',
      method:   'on',
      param:    'input change',
      handler:  (e: JQueryInputEventObject) => {
        const el = e.currentTarget;
        app.settings.audioInterrupt = +el.value;
        app.settings.updateLatencyInfo();
      }
    }, {
      selector: 'a[id^="mi"]', // all menu items
      method:   'click',
      handler:  (e: JQueryInputEventObject) => {
        const el = e.currentTarget;
        const name = el.id.replace(/^mi/, 'onCmd');

        if (app[name]) {
          app[name]();
        }
        else if (name === 'onCmdFileSaveAs') {
          app.onCmdFileSave(true);
        }
        else if (el.id.match(/^miHelp/)) {
          const fn = $(el).data().filename;
          if (!fn) {
            return false;
          }
          app.onCmdShowDocumentation(fn);
        }
        else {
          const m = el.id.match(/^miFileImport(\w+)$/);
          if (m && m[1]) {
            const mode = m[1].substr(0, 4);

            switch (mode) {
              case 'Demo':
                const fn = $(el).data().filename;
                if (!fn) {
                  return false;
                }
                app.onCmdFileImport(fn);
                break;

              case 'STMF':
                app.onCmdFileImport();
                break;

              case 'PT2':
              case 'ETrk':
              default:
                return;
            }
          }
          else {
            return false;
          }
        }
      }
    }, {
      selector: 'button[id^="btPattern"]',
      method:   'click',
      handler:  (e: JQueryMouseEventObject) => {
        const id = e.currentTarget.id;
        const name = id.replace(/^btPattern/, 'onCmdPat');
        if (app[name]) {
          app[name]();
        }
      }
    }, {
      selector: 'button[id^="btPos"]',
      method:   'click',
      handler:  (e: JQueryMouseEventObject) => {
        const id = e.currentTarget.id;
        const name = id.replace(/^bt/, 'onCmd');
        if (app[name]) {
          app[name]();
        }
      }
    }, {
      selector: 'button[id^="btSample"]',
      method:   'click',
      handler:  (e: JQueryMouseEventObject) => {
        const id = e.currentTarget.id;
        const name = id.replace('btSample', 'onCmdSmp');
        if (name.match(/Stop$/)) {
          return app.onCmdStop();
        }
        if (app[name]) {
          app[name]();
        }
      }
    }, {
      selector: 'button[id^="btOrn"]',
      method:   'click',
      handler:  (e: JQueryMouseEventObject) => {
        const id = e.currentTarget.id;
        const name = id.replace('btOrn', 'onCmdOrn');
        if (name.match(/Stop$/)) {
          return app.onCmdStop();
        }
        if (app[name]) {
          app[name]();
        }
      }
    }
  ];

  //-------------------------------------------------------------------------------------
  devLog('Tracker.gui', 'Populating elements...');

  populatedElementsTable.forEach(o => {
    const data = o.handler || o.data;
    const selector = o.selector || (o.global && window[o.global]);

    if (selector && o.method) {
      if (o.param) {
        $(selector)[o.method](o.param, data);
      }
      else {
        $(selector)[o.method](data);
      }
    }
  });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.initializeGUI = function(app: Tracker) {
  const initSteps = [
    function() {
      const pixelfont = $('img.pixelfont')[0];
      this.initPixelFont(pixelfont);
      return true;
    },
    function() {
      if (this.smpornedit.initialized || this.activeTab === 1) {
        return false;
      }

      devLog('Tracker.gui', 'Force initialization of Sample/Ornament editors...');
      this.smpornedit.img = $('img.smpedit')[0];
      $('#tab-smpedit').tab('show');
      return true;
    },
    function() {
      if (this.smpornedit.initialized || !this.smpornedit.img || this.activeTab !== 1) {
        return false;
      }

      this.smpornedit.init(this);
      $('#tab-ornedit').tab('show');
      return true;
    },
    function() {
      if (this.tracklist.initialized || !this.pixelfont.ctx || this.activeTab === 0) {
        return false;
      }

      devLog('Tracker.gui', 'Force initialization of Tracklist editor by triggering of window resize event...');
      $('#tab-tracker').tab('show');
      $(window).trigger('resize', [ true ]);
      return true;
    },
    function() {
      if (this.tracklist.initialized || !this.pixelfont.ctx || this.activeTab) {
        return false;
      }

      devLog('Tracker.gui', 'Redrawing all tracklist elements and canvas...');
      this.updatePanels();
      this.updateTracklist(true);
      this.tracklist.initialized = true;
      return true;
    },
    function() {
      devLog('Tracker.gui', 'Starting audio playback and initializing screen refresh timer...');
      SyncTimer.start(this.baseTimer.bind(this));
      return true;
    },
    function() {
      devLog('Tracker.gui', 'Initialization done, everything is ready!');
      if (this.settings.lastLoadedFileNumber !== undefined) {
        this.file.loadFile(this.settings.lastLoadedFileNumber);
      }

      document.body.className = '';
      return (this.loaded = true);
    }
  ];

  const initFn = ((i: number) => {
    const fn = initSteps[i];
    if (fn) {
      if (fn.call(app, i)) {
        i++;
      }

      setTimeout(initFn, 50, i);
    }
  }).bind(app);

  initFn(0);
};
//---------------------------------------------------------------------------------------
