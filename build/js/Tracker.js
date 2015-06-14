/*!
 * Tracker: Core of SAA1099Tracker.
 * Copyright (c) 2013-2015 Martin Borik <mborik@users.sourceforge.net>
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
var Settings = (function () {
    function Settings() {
        this.tracklistLines = 15;
        this.tracklistZoom = 2;
        this.hexTracklines = true;
        this.hexSampleFreq = false;
        this.audioInterrupt = 50;
        this.audioBuffers = 0;
    }
    return Settings;
})();
//---------------------------------------------------------------------------------------
var TracklistPosition = (function () {
    function TracklistPosition() {
        this.y = 0;
        this.line = 0;
        this.channel = 0;
        this.column = 0;
        this.start = { x: 0, y: 0 };
    }
    TracklistPosition.prototype.compare = function (p) {
        return (this.y === p.y &&
            this.line === p.line &&
            this.channel === p.channel &&
            this.column === p.column);
    };
    return TracklistPosition;
})();
var Tracker = (function () {
    function Tracker() {
        this.isActive = false;
        this.isInitialized = false;
        this.modePlay = false;
        this.modeEdit = false;
        this.modeEditChannel = 0;
        this.modeEditColumn = 0;
        this.workingPattern = 0;
        this.workingSample = 1;
        this.workingSampleTone = 36;
        this.workingOrnament = 1;
        this.ctrlOctave = 2;
        this.ctrlSample = 0;
        this.ctrlOrnament = 0;
        this.ctrlRowStep = 0;
        this.songTitle = '';
        this.songAuthor = '';
        this.selectionPoint = new TracklistPosition;
        this.selectionStarted = false;
        this.selectionChannel = 0;
        this.selectionLine = 0;
        this.selectionLen = 0;
        this.settings = new Settings;
        this.player = new Player(new SAASound(AudioDriver.sampleRate));
        AudioDriver.setAudioSource(this.player);
        AudioDriver.play();
        this.populateGUI();
        this.updatePanels();
        var app = this;
        SyncTimer.start(function () {
            if (app.modePlay && app.player.changedLine) {
                if (app.player.changedPosition)
                    app.updatePanelPosition();
                app.updatePanelInfo();
            }
        }, 40);
    }
    Tracker.prototype.populateGUI = function () {
        var i, app = this, populatedElementsTable = [
            {
                selector: '[data-toggle="tooltip"]',
                method: 'tooltip'
            }, {
                selector: '#scOctave',
                method: 'TouchSpin',
                data: {
                    initval: '2',
                    min: 1, max: 8
                }
            }, {
                selector: '#scAutoSmp',
                method: 'TouchSpin',
                data: {
                    initval: '-',
                    min: 0, max: 31
                }
            }, {
                selector: '#scAutoOrn',
                method: 'TouchSpin',
                data: {
                    initval: '-',
                    min: 0, max: 15
                }
            }, {
                selector: '#scRowStep',
                method: 'TouchSpin',
                data: {
                    initval: '0',
                    min: 0, max: 8
                }
            }, {
                selector: '#scPattern,#scPosCurrent,#scPosRepeat,input[id^="scChnPattern"]',
                method: 'TouchSpin',
                data: {
                    initval: '0',
                    min: 0, max: 0
                }
            }, {
                selector: '#scPatternLen,#scPosLength',
                method: 'TouchSpin',
                data: {
                    initval: '64',
                    min: 1, max: 96
                }
            }, {
                selector: '#scPosSpeed',
                method: 'TouchSpin',
                data: {
                    initval: '6',
                    min: 1, max: 31
                }
            }, {
                selector: 'input[id^="scChnTrans"]',
                method: 'TouchSpin',
                data: {
                    initval: '0',
                    min: -24, max: 24
                }
            }, {
                selector: 'input[id^="scChnButton"]',
                method: 'each',
                handler: function (i, el) {
                    var cc = el.id.substr(-1);
                    $(this).bootstrapToggle({
                        on: cc,
                        off: cc,
                        onstyle: 'default',
                        offstyle: 'default',
                        size: 'mini',
                        width: 58
                    }).change(function (e) {
                        var el = e.target;
                        app.player.SAA1099.mute((el.value - 1), !el.checked);
                    });
                }
            }, {
                selector: '#scPosCurrent',
                method: 'change',
                handler: function () {
                    if (!app.player.position.length)
                        return;
                    app.player.currentPosition = $(this).val() - 1;
                    app.updatePanelInfo();
                    app.updatePanelPosition();
                }
            }, {
                selector: 'a[id^="miFileImportDemo"]',
                method: 'click',
                handler: function () { app.loadDemosong($(this).data().filename); }
            }, {
                selector: '#miStop',
                method: 'click',
                handler: function () {
                    app.player.stopChannel();
                    app.modePlay = false;
                }
            }, {
                selector: '#miSongPlay',
                method: 'click',
                handler: function () {
                    app.modePlay = app.player.playPosition(false, true, true);
                }
            }, {
                selector: '#miSongPlayStart',
                method: 'click',
                handler: function () {
                    app.modePlay = app.player.playPosition(true, true, true);
                }
            }, {
                selector: '#miPosPlay',
                method: 'click',
                handler: function () {
                    app.modePlay = app.player.playPosition(false, false, false);
                }
            }, {
                selector: '#miPosPlayStart',
                method: 'click',
                handler: function () {
                    app.modePlay = app.player.playPosition(false, false, true);
                }
            }, {
                selector: '#miToggleLoop',
                method: 'click',
                handler: function () {
                    var state = app.player.loopMode = !app.player.loopMode, el = $(this).find('span'), icon1 = 'glyphicon-repeat', icon2 = 'glyphicon-remove-circle', glyph = state ? icon1 : icon2, color = state ? '#000' : '#ccc';
                    el.removeClass(icon1 + ' ' + icon2);
                    el.addClass(glyph).css({ 'color': color });
                }
            }
        ];
        for (i in populatedElementsTable) {
            if (!populatedElementsTable.hasOwnProperty(i))
                continue;
            var obj = populatedElementsTable[i], param = obj.handler || obj.data;
            eval("$('" + obj.selector + "')." + (obj.param
                ? (obj.method + "('" + obj.param + "', param)")
                : (obj.method + "(param)")));
        }
    };
    Tracker.prototype.loadDemosong = function (name) {
        var tracker = this;
        var player = this.player;
        var settings = this.settings;
        $.getJSON('demosongs/' + name + '.json', function (data) {
            player.clearOrnaments();
            player.clearSamples();
            player.clearSong();
            tracker.songTitle = data.title;
            tracker.songAuthor = data.author;
            var a, c, d, i, j, k, o, p, q, s;
            for (i = 0; i < 32; i++) {
                if (a = data.samples[i]) {
                    s = player.sample[i];
                    s.name = a.name;
                    s.loop = a.loop;
                    s.end = a.end;
                    s.releasable = !!a.rel;
                    for (j = 0, k = 0, d = atob(a.data); j < d.length; j += 3, k++) {
                        c = (d.charCodeAt(j + 1) & 0xff);
                        s.data[k].volume.byte = (d.charCodeAt(j) & 0xff);
                        s.data[k].enable_freq = !!(c & 0x80);
                        s.data[k].enable_noise = !!(c & 0x40);
                        s.data[k].noise_value = (c & 0x30) >> 4;
                        s.data[k].shift = (c & 7) | (d.charCodeAt(j + 2) & 0xff);
                        if (!!(c & 8))
                            s.data[k].shift *= -1;
                    }
                }
            }
            for (i = 0; i < 16; i++) {
                if (a = data.ornaments[i]) {
                    o = player.ornament[i];
                    o.name = a.name;
                    o.loop = a.loop;
                    o.end = a.end;
                    for (j = 0, d = atob(a.data); j < d.length; j++)
                        o.data[j] = d.charCodeAt(j);
                }
            }
            for (i = 0; i < data.patterns.length; i++) {
                if (!!(d = data.patterns[i])) {
                    d = atob(d);
                    p = player.pattern[player.addNewPattern()];
                    p.end = (d.charCodeAt(0) & 0xff);
                    for (j = 1, k = 0; j < d.length; j += 5, k++) {
                        p.data[k].tone = (d.charCodeAt(j) & 0x7f);
                        p.data[k].release = !!(d.charCodeAt(j) & 0x80);
                        p.data[k].smp = (d.charCodeAt(j + 1) & 0x1f);
                        p.data[k].orn_release = !!(d.charCodeAt(j + 1) & 0x80);
                        p.data[k].volume.byte = (d.charCodeAt(j + 2) & 0xff);
                        p.data[k].orn = (d.charCodeAt(j + 3) & 0x0f);
                        p.data[k].cmd = (d.charCodeAt(j + 3) & 0xf0) >> 4;
                        p.data[k].cmd_data = (d.charCodeAt(j + 4) & 0xff);
                    }
                }
            }
            for (i = 0; i < data.positions.length; i++) {
                a = data.positions[i];
                d = atob(a.ch);
                q = player.position[i] = new pPosition(a.length, a.speed);
                for (j = 0, k = 0; j < 6; j++) {
                    q.ch[j].pattern = (d.charCodeAt(k++) & 0xff);
                    q.ch[j].pitch = d.charCodeAt(k++);
                }
            }
            player.setInterrupt((settings.audioInterrupt = data.config.audioInterrupt));
            player.currentPosition = data.config.currentPosition;
            player.repeatPosition = data.config.repeatPosition;
            player.currentLine = data.config.currentLine;
            tracker.modeEditChannel = data.config.editChannel;
            tracker.ctrlOctave = data.config.ctrlOctave;
            tracker.ctrlSample = data.config.ctrlSample;
            tracker.ctrlOrnament = data.config.ctrlOrnament;
            tracker.ctrlRowStep = data.config.ctrlRowStep;
            tracker.updatePanels();
        });
    };
    Tracker.prototype.updatePanels = function () {
        $('#scOctave').val(this.ctrlOctave);
        $('#scAutoSmp').val(this.ctrlSample);
        $('#scAutoOrn').val(this.ctrlOrnament);
        $('#scRowStep').val(this.ctrlRowStep);
        $('#txHeaderTitle').val(this.songTitle);
        $('#txHeaderAuthor').val(this.songAuthor);
        this.updatePanelInfo();
        this.updatePanelPosition();
    };
    Tracker.prototype.updatePanelInfo = function () {
        var int = this.settings.audioInterrupt, buf, pos = null, posi = null, total = 0, current = 0, p = this.player.currentPosition, len = this.player.position.length, line = this.player.currentLine, even = line & -2, bpm, i = int * 60;
        if (len) {
            pos = this.player.position[p];
            bpm = (i / (pos.frames[even + 2] - pos.frames[even])) >> 1;
            for (i = 0; i < len; i++) {
                posi = this.player.position[i];
                if (i === p)
                    current = total;
                total += posi.frames[posi.length];
            }
            current += pos.frames[line];
            i = total.toString().length;
            buf = '(' + current.toWidth(i) + '/' + total.toWidth(i) + ')';
            $('#stInfoPanelFrames').text(buf);
            current /= int;
            total /= int;
            buf = (current / 60).toWidth(2) + ':' +
                (current % 60).toWidth(2) + ' / ' +
                (total / 60).toWidth(2) + ':' +
                (total % 60).toWidth(2);
            $('#stInfoPanelTime').text(buf);
        }
        else {
            $('#stInfoPanelTime').text('00:00 / 00:00');
            $('#stInfoPanelFrames').text('(0/0)');
            bpm = (i / this.player.currentSpeed) >> 2;
        }
        $('#stInfoPanelBPM').text('BPM: ' + bpm + ' (' + int + ' Hz)');
    };
    Tracker.prototype.updatePanelPosition = function () {
        var a = ['#scPosCurrent', '#scPosLength', '#scPosSpeed', '#txPosTotal', '#scPosRepeat'], lastState = $(a[0]).prop('disabled'), pos = null, buf, len = this.player.position.length, p = this.player.currentPosition, d = true, i;
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
            pos = new pPosition(64, 6);
        }
        $(a[1]).val(pos.length);
        $(a[2]).val(pos.speed);
        for (i = 0; i < 6; i++) {
            a.push((buf = '#scChnPattern' + (i + 1)));
            $(buf).val(pos.ch[i].pattern);
            a.push((buf = '#scChnTrans' + (i + 1)));
            $(buf).val(pos.ch[i].pitch);
        }
        if (d !== lastState) {
            a.splice(3, 1);
            for (i = 0, len = a.length; i < len; i++)
                $(a[i] + ',' + a[i] + '~span>button').prop('disabled', d);
            lastState = d;
        }
        pos = null;
    };
    return Tracker;
})();
//---------------------------------------------------------------------------------------
$(document).ready(function () { window.Tracker = new Tracker; });
//# sourceMappingURL=Tracker.js.map