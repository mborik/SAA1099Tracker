/*!
 * SAA1099Tracker v1.2.0
 * Copyright (c) 2012-2017 Martin Borik <mborik@users.sourceforge.net>
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
$(document).ready(function() { window.Tracker = new Tracker('1.2.0') });
//---------------------------------------------------------------------------------------
"use strict";
class STMFile {
    constructor($parent) {
        this.$parent = $parent;
        this.yetSaved = false;
        this.modified = false;
        this.fileName = '';
        this._storageMap = [];
        this._storageLastId = undefined;
        this._storageBytesUsed = 0;
        this._reloadStorage();
        let usageHandler = (() => {
            return {
                bytes: this._storageBytesUsed,
                percent: Math.ceil(100 / ((2 * 1024 * 1024) / this._storageBytesUsed))
            };
        });
        this.dialog = new FileDialog(this.$parent, this, {
            data: this._storageMap,
            get usage() { return usageHandler(); }
        });
    }
    _storageSortAndSum() {
        this._storageBytesUsed = 0;
        this._storageMap.sort((a, b) => (b.timeModified - a.timeModified));
        this._storageMap.forEach(obj => {
            this._storageBytesUsed += (obj.length + 40) * 2;
        }, this);
    }
    _updateAll() {
        const tracker = this.$parent;
        const player = tracker.player;
        let actualLine = player.currentLine;
        tracker.onCmdToggleEditMode(tracker.modeEdit);
        tracker.onCmdToggleLoop(player.loopMode);
        $('#scPattern').val(tracker.workingPattern.toString());
        $('#scPosRepeat').val((player.repeatPosition + 1).toString());
        $('#scPosCurrent').val(player.currentPosition.toString());
        tracker.updatePanels();
        player.currentLine = actualLine;
        tracker.updateTracklist();
        $('#scSampleNumber').val(tracker.workingSample.toString(32).toUpperCase());
        $('#scOrnNumber').val(tracker.workingOrnament.toString(16).toUpperCase());
        $('#scOrnTestSample').val(tracker.workingOrnTestSample.toString(32).toUpperCase());
        $('#scSampleTone,#scOrnTone').val(tracker.workingSampleTone.toString()).trigger('change');
        $('#sbSampleScroll').scrollLeft(0);
        tracker.updateSampleEditor(true);
        tracker.smpornedit.updateOrnamentEditor(true);
        $('#main-tabpanel a').eq(tracker.activeTab).tab('show');
    }
    _reloadStorage() {
        this._storageMap.splice(0);
        this._storageLastId = -1;
        let match;
        for (let i = 0, l = localStorage.length; i < l; i++) {
            if ((match = localStorage.key(i).match(/^(stmf([0-9a-f]{3}))\-nfo/))) {
                let id = parseInt(match[2], 16);
                let storageId = match[1];
                let s = localStorage.getItem(match[0]);
                let data = localStorage.getItem(storageId + '-dat');
                if (!data) {
                    console.log('Tracker.file', 'Unable to read data for file in localStorage\n\t%s:"%s"', match[2], s);
                    localStorage.removeItem(match[0]);
                    continue;
                }
                if (!(match = s.match(/^(.+)\|(\d+?)\|(\d+?)\|(\d\d:\d\d)$/)))
                    continue;
                this._storageLastId = Math.max(this._storageLastId, id);
                this._storageMap.push({
                    id: id,
                    storageId: storageId,
                    fileName: match[1],
                    timeCreated: parseInt(match[2], 10),
                    timeModified: parseInt(match[3], 10),
                    duration: match[4],
                    length: data.length
                });
            }
        }
        this._storageSortAndSum();
    }
    _parseJSON(input) {
        let data = undefined;
        if (typeof input === 'string') {
            try {
                data = JSON.parse(input);
                if (typeof data !== 'object') {
                    return false;
                }
            }
            catch (e) {
                return false;
            }
        }
        else if (typeof input === 'object') {
            data = input;
        }
        else {
            return false;
        }
        let tracker = this.$parent;
        let settings = tracker.settings;
        let player = tracker.player;
        let count = { smp: 0, orn: 0, pat: 0, pos: 0 };
        if (!data.version || (data.version && data.version != '1.2')) {
            return false;
        }
        player.clearSong();
        player.clearSamples();
        player.clearOrnaments();
        tracker.songTitle = data.title || '';
        tracker.songAuthor = data.author || '';
        if (data.samples && data.samples.length) {
            for (let i = 1, obj; i < 32; i++) {
                if (!!(obj = data.samples[i - 1])) {
                    let it = player.sample[i];
                    if (obj.name)
                        it.name = obj.name;
                    it.loop = obj.loop || 0;
                    it.end = obj.end || 0;
                    it.releasable = !!obj.rel;
                    it.parse(obj.data);
                    count.smp++;
                }
            }
        }
        if (data.ornaments && data.ornaments.length) {
            for (let i = 1, obj; i < 16; i++) {
                if (!!(obj = data.ornaments[i - 1])) {
                    let it = player.ornament[i];
                    if (obj.name)
                        it.name = obj.name;
                    it.loop = obj.loop || 0;
                    it.end = obj.end || 0;
                    it.parse(obj.data);
                    count.orn++;
                }
            }
        }
        if (data.patterns) {
            data.patterns.forEach(obj => {
                let newIdx = player.addNewPattern();
                let it = player.pattern[newIdx];
                it.end = obj.end || 0;
                it.parse(obj.data);
                count.pat++;
            });
        }
        if (data.positions) {
            data.positions.forEach((obj, i) => {
                let it = player.addNewPosition(obj.length, obj.speed);
                for (let k = 0; k < 6; k++) {
                    let s = obj.ch[k];
                    it.ch[k].pattern = parseInt(s.substr(0, 3), 10) || 0;
                    it.ch[k].pitch = parseInt(s.substr(3), 10) || 0;
                }
                player.countPositionFrames(i);
                player.storePositionRuntime(i);
                count.pos++;
            });
        }
        if (typeof data.current === 'object') {
            let o = data.current;
            player.repeatPosition = data.repeatPos || 0;
            player.currentPosition = o.position || 0;
            player.currentLine = o.line || 0;
            tracker.workingPattern = o.pattern || 0;
            tracker.workingSample = o.sample || 1;
            tracker.workingOrnament = o.ornament || 1;
            tracker.workingOrnTestSample = o.ornSample || 1;
            tracker.workingSampleTone = o.smpornTone || 37;
            tracker.modeEditChannel = o.channel || 0;
            tracker.modeEditColumn = o.column || 0;
            let c = Object.assign({}, data.ctrl, data.config);
            player.loopMode = c.loopMode || true;
            tracker.ctrlOctave = c.octave || 2;
            tracker.ctrlSample = c.sample || 0;
            tracker.ctrlOrnament = c.ornament || 0;
            tracker.ctrlRowStep = c.rowStep || 0;
            tracker.activeTab = c.activeTab || 0;
            tracker.modeEdit = c.editMode || false;
            settings.audioInterrupt = c.interrupt || 50;
        }
        console.log('Tracker.file', 'JSON file successfully parsed and loaded... %o', {
            title: data.title,
            author: data.author,
            samples: count.smp,
            ornaments: count.orn,
            patterns: count.pat,
            positions: count.pos,
            version: data.version
        });
        this._updateAll();
        return true;
    }
    _fixFileName(fileName) {
        return fileName.replace(/[\.\\\/\":*?%<>|\0-\37]+/g, '').trim();
    }
    createJSON(pretty) {
        let tracker = this.$parent;
        let settings = tracker.settings;
        let player = tracker.player;
        let output = {
            title: tracker.songTitle,
            author: tracker.songAuthor,
            samples: [],
            ornaments: [],
            patterns: [],
            positions: [],
            repeatPos: player.repeatPosition,
            current: {
                sample: tracker.workingSample,
                ornament: tracker.workingOrnament,
                ornSample: tracker.workingOrnTestSample,
                smpornTone: tracker.workingSampleTone,
                position: player.currentPosition,
                pattern: tracker.workingPattern,
                line: player.currentLine,
                channel: tracker.modeEditChannel,
                column: tracker.modeEditColumn
            },
            ctrl: {
                octave: tracker.ctrlOctave,
                sample: tracker.ctrlSample,
                ornament: tracker.ctrlOrnament,
                rowStep: tracker.ctrlRowStep
            },
            config: {
                interrupt: settings.audioInterrupt,
                activeTab: tracker.activeTab,
                editMode: tracker.modeEdit,
                loopMode: player.loopMode
            },
            version: '1.2'
        };
        for (let i = 31; i > 0; i--) {
            let it = player.sample[i];
            let obj = {
                loop: it.loop,
                end: it.end,
                data: it.export()
            };
            if (it.name) {
                obj.name = it.name;
            }
            if (it.releasable) {
                obj.rel = it.releasable;
            }
            if (!obj.data.length) {
                obj.data = null;
            }
            if (obj.data == null && !obj.loop && !obj.end && !obj.rel && !obj.name) {
                obj = null;
            }
            if (!output.samples.length && obj == null) {
                continue;
            }
            output.samples.unshift(obj);
        }
        for (let i = 15; i > 0; i--) {
            let it = player.ornament[i];
            let obj = {
                loop: it.loop,
                end: it.end,
                data: it.export()
            };
            if (it.name) {
                obj.name = it.name;
            }
            if (!obj.data.length) {
                obj.data = null;
            }
            if (obj.data == null && !obj.loop && !obj.end && !obj.name) {
                obj = null;
            }
            if (!output.ornaments.length && obj == null) {
                continue;
            }
            output.ornaments.unshift(obj);
        }
        for (let i = 1, l = player.pattern.length; i < l; i++) {
            let it = player.pattern[i];
            let obj = {
                end: it.end,
                data: it.export()
            };
            if (!obj.data.length) {
                obj.data = null;
            }
            if (obj.data == null && !obj.end) {
                obj = null;
            }
            if (!output.patterns.length && obj == null) {
                continue;
            }
            output.patterns.push(obj);
        }
        output.positions = player.position.map(it => ({
            length: it.length,
            speed: it.speed,
            ch: it.export()
        }));
        return pretty ?
            JSON.stringify(output, null, '\t').replace(/\},\n\t+?\{/g, '}, {') :
            JSON.stringify(output);
    }
    new() {
        let tracker = this.$parent;
        let player = tracker.player;
        player.clearSong();
        player.clearSamples();
        player.clearOrnaments();
        tracker.songTitle = '';
        tracker.songAuthor = '';
        player.currentPosition = 0;
        player.repeatPosition = 0;
        player.currentLine = 0;
        tracker.modeEdit = false;
        tracker.modeEditChannel = 0;
        tracker.modeEditColumn = 0;
        tracker.workingPattern = 0;
        this.modified = false;
        this.yetSaved = false;
        this.fileName = '';
        this._updateAll();
    }
    loadDemosong(fileName) {
        let file = this;
        console.log('Tracker.file', 'Loading "%s" demosong...', fileName);
        $.getJSON('demosongs/' + fileName + '.json', (data) => {
            file._parseJSON(data);
            file.modified = true;
            file.yetSaved = false;
            file.fileName = '';
        });
    }
    loadFile(fileNameOrId) {
        let name;
        if (typeof fileNameOrId === 'string') {
            name = this._fixFileName(fileNameOrId);
        }
        let found = this._storageMap.find(obj => ((name && obj.fileName === name) ||
            (!name && typeof fileNameOrId === 'number' && obj.id === fileNameOrId)));
        if (!found) {
            console.log('Tracker.file', 'File "' + fileNameOrId + '" not found!');
            return false;
        }
        else if (!name) {
            name = found.fileName;
        }
        console.log('Tracker.file', 'Loading "%s" from localStorage...', name);
        let data = localStorage.getItem(found.storageId + '-dat');
        console.log('Tracker.file', 'Compressed JSON file format loaded, size: ' + (data.length << 1));
        data = LZString.decompressFromUTF16(data);
        console.log('Tracker.file', 'After LZW decompression has %d bytes, parsing...', data.length);
        if (!this._parseJSON(data)) {
            console.log('Tracker.file', 'JSON file parsing failed!');
            return false;
        }
        data = null;
        this.modified = false;
        this.yetSaved = true;
        this.fileName = name;
        return true;
    }
    saveFile(fileName, duration, oldId) {
        fileName = this._fixFileName(fileName);
        console.log('Tracker.file', 'Storing "%s" to localStorage...', fileName);
        var modify = false;
        let found = this._storageMap.find(obj => {
            if (obj.id === oldId || obj.fileName === fileName) {
                console.log('Tracker.file', 'File ID:%s exists, will be overwritten...', obj.storageId);
                return (modify = true);
            }
            return false;
        });
        if (typeof oldId === 'number' && !modify) {
            console.log('Tracker.file', 'Cannot find given storageId: %d!', oldId);
            return false;
        }
        let data = this.createJSON();
        console.log('Tracker.file', 'JSON file format built, original size: ' + data.length);
        data = LZString.compressToUTF16(data);
        console.log('Tracker.file', 'Compressed with LZW to ' + (data.length << 1));
        let now = (Date.now() / 1000).abs();
        let storageItem;
        if (modify) {
            storageItem = found;
            storageItem.fileName = fileName;
            storageItem.timeModified = now;
            storageItem.duration = duration;
            storageItem.length = data.length;
        }
        else {
            storageItem = {
                id: ++this._storageLastId,
                storageId: 'stmf' + this._storageLastId.toHex(3),
                fileName: fileName,
                timeCreated: now,
                timeModified: now,
                duration: duration,
                length: data.length
            };
        }
        localStorage.setItem(storageItem.storageId + '-nfo', fileName.concat('|', storageItem.timeCreated.toString(), '|', storageItem.timeModified.toString(), '|', storageItem.duration));
        localStorage.setItem(storageItem.storageId + '-dat', data);
        if (!modify) {
            this._storageMap.push(storageItem);
        }
        this._storageSortAndSum();
        data = null;
        this.yetSaved = true;
        this.modified = false;
        this.fileName = storageItem.fileName;
        console.log('Tracker.file', 'Everything stored into localStorage...');
        return true;
    }
}
"use strict";
const mimeType = 'text/x-saa1099tracker';
class FileDialog {
    constructor($app, $parent, $storage) {
        this.$app = $app;
        this.$parent = $parent;
        this.$storage = $storage;
        this._obj = null;
        this._saveFlag = false;
        this._selectedItem = null;
    }
    load() { return this._openDialog('load'); }
    save() { return this._openDialog('save'); }
    _defaultHandler(e) {
        e.stopPropagation();
        let dlg = (e.data && e.data.$scope);
        let file = dlg.$parent;
        let globalKeyState = dlg.$app.globalKeyState;
        let selectedItem = dlg._selectedItem;
        if (dlg._saveFlag) {
            let fileName = dlg._obj.find('.file-name>input').val();
            let duration = $('#stInfoPanel u:eq(3)').text();
            file.saveFile(fileName, duration, (selectedItem && selectedItem.id) || undefined);
        }
        else {
            if (!selectedItem) {
                return false;
            }
            file.loadFile(selectedItem.id);
        }
        globalKeyState.inDialog = false;
        dlg._obj.modal('hide');
        return true;
    }
    _itemClickHandler(e) {
        e.stopPropagation();
        let dlg = (e.data && e.data.$scope);
        let file = dlg.$parent;
        let globalKeyState = dlg.$app.globalKeyState;
        let storageMap = dlg.$storage.data;
        let selectedItem = (dlg._selectedItem =
            (e.data && typeof e.data.id === 'number') ?
                storageMap[e.data.id] : null);
        if (e.pageX === 0 && e.pageY === 0) {
            return dlg._defaultHandler(e);
        }
        dlg._obj.find('.file-list>button').removeClass('selected');
        if (selectedItem) {
            $(this).addClass('selected');
        }
        if (dlg._saveFlag) {
            if (selectedItem) {
                dlg._obj.find('.file-name>input').val(selectedItem.fileName);
            }
            dlg._obj.find('.file-remove').prop('disabled', !selectedItem);
        }
        return true;
    }
    _removeHandler(e) {
        e.stopPropagation();
        let dlg = (e.data && e.data.$scope);
        let storageMap = dlg.$storage.data;
        let selectedItem = dlg._selectedItem;
        let mode = (dlg._saveFlag ? 'save' : 'load');
        if (!selectedItem) {
            return false;
        }
        $('#dialoque').confirm({
            title: i18n.dialog.file.remove.title,
            text: i18n.dialog.file.remove.msg,
            buttons: 'yesno',
            style: 'danger',
            callback: (btn) => {
                if (btn !== 'yes') {
                    return;
                }
                let index = storageMap.findIndex(obj => (obj.storageId === selectedItem.storageId));
                if (~index) {
                    storageMap.splice(index, 1);
                    localStorage.removeItem(selectedItem.storageId + '-nfo');
                    localStorage.removeItem(selectedItem.storageId + '-dat');
                    dlg._itemClickHandler(e);
                    dlg._obj.modal('hide');
                    dlg._openDialog(mode);
                }
            }
        });
        return true;
    }
    _downloadHandler(e) {
        e.stopPropagation();
        let dlg = (e.data && e.data.$scope);
        let file = dlg.$parent;
        let el = $(this);
        let data = file.createJSON(true);
        let fileName = dlg._obj.find('.file-name>input').val().trim() ||
            (e.data && e.data.fileName);
        console.log('Tracker.file', 'Preparing file output to Blob...');
        let blob, url;
        try {
            blob = new Blob([data], {
                type: mimeType,
                endings: 'native'
            });
        }
        catch (ex) {
            console.log('Tracker.file', 'Blob feature missing [%o], fallback to BlobBuilder...', ex);
            try {
                let bb = getCompatible(window, 'BlobBuilder', true);
                bb.append(data);
                blob = bb.getBlob(mimeType);
            }
            catch (ex2) {
                console.log('Tracker.file', 'BlobBuilder feature missing [%o], fallback to BASE64 output...', ex2);
                blob = undefined;
                url = 'data:' + mimeType + ';base64,' + btoa(data);
            }
        }
        if (blob) {
            try {
                url = getCompatible(window, 'URL').createObjectURL(blob) + '';
            }
            catch (ex) {
                console.log('Tracker.file', 'URL feature for Blob missing [%o], fallback to BASE64 output...', ex);
                url = 'data:' + mimeType + ';base64,' + btoa(data);
            }
        }
        el.attr({
            'href': url,
            'download': fileName + '.STMF'
        });
        data = null;
        url = null;
        dlg._obj.modal('hide');
        setTimeout(() => {
            el.attr({ href: '', download: '' });
        }, 50);
        return true;
    }
    _openDialog(mode) {
        let tracker = this.$app;
        let file = this.$parent;
        let storageMap = this.$storage.data;
        const fn = file.fileName || tracker.songTitle || i18n.app.filedialog.untitled;
        const titles = i18n.app.filedialog.title;
        const handleArgs = { $scope: this, fileName: fn };
        this._saveFlag = (mode === 'save');
        this._obj = $('#filedialog');
        if (!titles[mode] || (!this._saveFlag && !storageMap.length)) {
            return false;
        }
        tracker.globalKeyState.inDialog = true;
        this._obj.on('show.bs.modal', $.proxy(() => {
            let usage = this.$storage.usage;
            this._selectedItem = null;
            this._obj.addClass(mode)
                .before($('<div/>')
                .addClass('modal-backdrop in').css('z-index', '1030'));
            this._obj.find('.modal-title').text(titles[mode] + '\u2026');
            this._obj.find('.file-name>input').val(fn);
            this._obj.find('.storage-usage i').text(usage.bytes + ' bytes used');
            this._obj.find('.storage-usage .progress-bar').css('width', usage.percent + '%');
            this._obj.find('.btn-success').on('click', handleArgs, this._defaultHandler);
            let el = this._obj.find('.file-list').empty();
            let span = $('<span/>');
            let cell = $('<button class="cell"/>');
            storageMap.forEach((obj, i) => {
                let d = (new Date(obj.timeModified * 1000))
                    .toISOString().replace(/^([\d\-]+)T([\d:]+).+$/, '$1 $2');
                cell.clone()
                    .append(span.clone().addClass('filename').text(obj.fileName))
                    .append(span.clone().addClass('fileinfo').text(d + ' | duration: ' + obj.duration))
                    .prop('tabindex', 300)
                    .appendTo(el)
                    .on('click focus', Object.assign({ id: i }, handleArgs), this._itemClickHandler)
                    .on('dblclick', handleArgs, this._defaultHandler);
            }, this);
            this._obj.find('.file-open,.file-save').on('click', handleArgs, this._defaultHandler);
            if (this._saveFlag) {
                this._obj.find('.file-list').on('click', handleArgs, this._itemClickHandler);
                this._obj.find('.file-remove').on('click', handleArgs, this._removeHandler);
                this._obj.find('.file-download').on('click', handleArgs, this._downloadHandler);
            }
        }, this)).on('shown.bs.modal', $.proxy(() => {
            this._obj.find(this._saveFlag
                ? '.file-name>input'
                : '.file-list>button:first-child').focus();
        }, this)).on('hide.bs.modal', $.proxy(() => {
            this._obj.removeClass(mode).prev('.modal-backdrop').remove();
            this._obj.off().find('.file-list').off().empty();
            this._obj.find('.modal-footer>.btn').off();
            tracker.globalKeyState.inDialog = false;
        }, this)).modal({
            show: true,
            backdrop: false
        });
        return true;
    }
}
"use strict";
class TracklistPosition {
    constructor(y = 0, line = 0, channel = 0, column = 0, sx = 0, sy = 0) {
        this.y = y;
        this.line = line;
        this.channel = channel;
        this.column = column;
        this.start = { x: sx, y: sy };
    }
    set(p) {
        if (p instanceof TracklistPosition) {
            this.y = p.y;
            this.line = p.line;
            this.channel = p.channel;
            this.column = p.column;
            this.start.x = p.start.x;
            this.start.y = p.start.y;
        }
    }
    compare(p) {
        if (p instanceof TracklistPosition) {
            return (this.y === p.y &&
                this.line === p.line &&
                this.channel === p.channel &&
                this.column === p.column);
        }
        return false;
    }
}
const tracklistZoomFactor = 2;
const fontWidth = 6;
class Tracklist {
    constructor($parent) {
        this.$parent = $parent;
        this.initialized = false;
        this.obj = null;
        this.ctx = null;
        this.canvasData = {
            columns: [0, 4, 5, 6, 7, 9, 10, 11].map(c => c * fontWidth),
            selWidth: (12 + 1) * fontWidth,
            chnWidth: (12 + 2) * fontWidth,
            lineWidth: (((12 + 2) * 6) + 2) * fontWidth,
            vpad: 0,
            center: 0,
            get trkOffset() { return this.center + (4 * fontWidth); },
            offset: null
        };
        this.offsets = {
            x: [new Array(9), new Array(9), new Array(9), new Array(9), new Array(9), new Array(9)],
            y: []
        };
        this.selection = {
            isDragging: false,
            start: new TracklistPosition,
            len: 0,
            line: 0,
            channel: 0
        };
    }
    countTracklines() {
        let s = $('#statusbar').offset();
        let t = $('#tracklist').offset();
        let h = this.$parent.settings.tracklistLineHeight;
        return Math.max(((((s.top - t.top) / h / tracklistZoomFactor) | 1) - 2), 5);
    }
    setHeight(height) {
        const settings = this.$parent.settings;
        if (height == null) {
            height = settings.tracklistAutosize
                ? this.countTracklines()
                : settings.tracklistLines;
        }
        console.log('Tracker.tracklist', 'Computed %d tracklines...', height);
        settings.tracklistLines = height;
        height *= settings.tracklistLineHeight;
        $(this.obj).prop('height', height).css({ 'height': height * tracklistZoomFactor });
        this.canvasData.offset = $(this.obj).offset();
    }
    moveCurrentline(delta, noWrap = false) {
        const player = this.$parent.player;
        let line = player.currentLine + delta;
        let pos = player.currentPosition;
        let pp = player.position[pos];
        if (this.$parent.modePlay || pp == null) {
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
        player.currentLine = line;
    }
    pointToTracklist(x, y) {
        const lines = this.$parent.settings.tracklistLines;
        const tx = x / tracklistZoomFactor;
        const ty = y / tracklistZoomFactor;
        const half = lines >> 1;
        let i, j, chl;
        let ln = this.$parent.player.currentLine - half;
        for (i = 0; i < lines; i++, ln++) {
            if (ty >= this.offsets.y[i] && ty <= this.offsets.y[i + 1]) {
                for (chl = 0; chl < 6; chl++) {
                    if (tx >= this.offsets.x[chl][0] && tx <= this.offsets.x[chl][8]) {
                        for (j = 0; j < 8; j++) {
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
"use strict";
class SmpOrnEditor {
    constructor($parent) {
        this.$parent = $parent;
        this.initialized = false;
        this.img = null;
        this.amp = { obj: null, ctx: null };
        this.noise = { obj: null, ctx: null };
        this.range = { obj: null, ctx: null };
        this.smpeditOffset = null;
        this.smpeditScroll = 0;
        this.columnWidth = 0;
        this.halfing = 0;
        this.centering = 0;
        this.radix = 10;
        this.drag = {
            isDragging: false,
            freqEnableState: false,
            rangeStart: -1
        };
        this.chords = {
            'maj': { sequence: [0, 4, 7], name: 'major' },
            'min': { sequence: [0, 3, 7], name: 'minor' },
            'maj7': { sequence: [0, 4, 7, 11], name: 'major 7th' },
            'min7': { sequence: [0, 3, 7, 10], name: 'minor 7th' },
            'sus2': { sequence: [0, 2, 7], name: 'suspended 2nd' },
            'sus4': { sequence: [0, 5, 7], name: 'suspended 4th' },
            '6': { sequence: [0, 4, 7, 9], name: 'major 6th' },
            '7': { sequence: [0, 4, 7, 10], name: 'dominant 7th' },
            'add9': { sequence: [0, 2, 4, 7], name: 'added 9th' },
            'min7b5': { sequence: [0, 3, 6, 12], name: 'minor 7th with flatted 5th' },
            'aug': { sequence: [0, 4, 10], name: 'augmented' },
            'dim': { sequence: [0, 3, 6, 9], name: 'diminished' },
            '12th': { sequence: [12, 0], name: '12th' }
        };
    }
    init() {
        console.log('Tracker.smporn', 'Initial drawing of Sample editor canvases...');
        ['amp', 'noise', 'range'].forEach((part, i) => {
            let o = this[part];
            let ctx = o.ctx;
            let w = o.obj.width;
            let h = o.obj.height;
            let half = h >> 1;
            ctx.miterLimit = 0;
            ctx.fillStyle = '#fcfcfc';
            ctx.fillRect(0, 0, 22, h);
            ctx.fillStyle = '#ccc';
            ctx.fillRect(22, 0, 1, h);
            if (i === 0) {
                this.halfing = (half -= 12);
                this.columnWidth = ((w - 26) / 64) | 0;
                this.centering = 26 + (w - (this.columnWidth * 64)) >> 1;
                ctx.fillRect(22, half, w - 22, 1);
                ctx.fillRect(22, 286, w - 22, 1);
                ctx.save();
                ctx.font = $('label').first().css('font');
                ctx.translate(12, half);
                ctx.rotate(-Math.PI / 2);
                ctx.textBaseline = "middle";
                ctx.fillStyle = '#888';
                ctx.textAlign = "right";
                ctx.fillText(i18n.app.smpedit.right, -16, 0);
                ctx.textAlign = "left";
                ctx.fillText(i18n.app.smpedit.left, 16, 0);
                ctx.restore();
            }
            ctx.drawImage(this.img, i * 16, 0, 16, 16, 4, half - 8, 16, 16);
        }, this);
        this._updateOffsets();
        this._createPitchShiftTable();
        this._createOrnamentEditorTable();
        this.$parent.updateSampleEditor(true);
        this.initialized = true;
        console.log('Tracker.smporn', 'Sample/Ornament editors completely initialized...');
    }
    updateSamplePitchShift() {
        let working = this.$parent.workingSample;
        let sample = this.$parent.player.sample[working];
        let noloop = (sample.end === sample.loop);
        let radix = this.$parent.settings.hexSampleFreq ? 16 : 10;
        $('#fxSampleShift>.cell').each((i, el) => {
            let data = sample.data[i];
            if (i >= sample.end && !sample.releasable) {
                el.className = 'cell';
            }
            else if (!noloop && i >= sample.loop && i < sample.end) {
                el.className = 'cell loop';
            }
            else {
                el.className = 'cell on';
            }
            $(el).find('input').val(data.shift.toString(radix));
        });
        $('#fxSampleShift').parent().scrollLeft(0);
    }
    _updateOffsets() {
        let amp = $(this.amp.obj).offset();
        let noise = $(this.noise.obj).offset();
        this.smpeditOffset = {
            left: 0 | amp.left,
            top: {
                amp: 0 | amp.top,
                noise: 0 | noise.top
            }
        };
        console.log('Tracker.smporn', 'Sample editor canvas offsets observed...\n\t\t%c%s', 'color:gray', JSON.stringify(this.smpeditOffset, null, 1).replace(/\s+/g, ' '));
    }
    _createPitchShiftTable() {
        let settings = this.$parent.settings;
        let el = $('#fxSampleShift').empty();
        let cell = $('<div class="cell"/>');
        let spin = $('<input type="text" class="form-control">');
        console.log('Tracker.smporn', 'Creating elements into Pitch-shift tab...');
        for (let i = 0; i < 256; i++) {
            let cloned = spin.clone();
            cell.clone().append(cloned).appendTo(el);
            cloned.TouchSpin({
                prefix: i.toWidth(3),
                radix: (settings.hexSampleFreq ? 16 : 10),
                initval: 0,
                min: -1023,
                max: 1023
            })
                .change({ index: i }, e => {
                let working = this.$parent.workingSample;
                let sample = this.$parent.player.sample[working];
                let data = sample.data;
                let el = e.target;
                let radix = settings.hexSampleFreq ? 16 : 10;
                data[e.data.index].shift = parseInt(el.value, radix);
            })
                .prop('tabindex', 9);
        }
    }
    updateOrnamentEditor(update) {
        let working = this.$parent.workingOrnament;
        let orn = this.$parent.player.ornament[working];
        let noloop = (orn.end === orn.loop);
        $('#fxOrnEditor>.cell').each((i, el) => {
            if (i >= orn.end) {
                el.className = 'cell';
            }
            else if (!noloop && i >= orn.loop && i < orn.end) {
                el.className = 'cell loop';
            }
            else {
                el.className = 'cell on';
            }
            $(el).find('input').val(orn.data[i]);
        });
        if (update) {
            $('#txOrnName').val(orn.name);
            $('#fxOrnEditor').parent().scrollLeft(0);
            $('#scOrnLength').val('' + orn.end);
            $('#scOrnRepeat').val('' + (orn.end - orn.loop))
                .trigger('touchspin.updatesettings', { min: 0, max: orn.end });
        }
    }
    _createOrnamentEditorTable() {
        let el = $('#fxOrnEditor').empty();
        let cell = $('<div class="cell"/>');
        let spin = $('<input type="text" class="form-control">');
        console.log('Tracker.smporn', 'Creating elements into Ornament editor...');
        for (let i = 0; i < 256; i++) {
            let cloned = spin.clone();
            cell.clone().append(cloned).appendTo(el);
            cloned.TouchSpin({
                prefix: i.toWidth(3),
                initval: 0, min: -60, max: 60
            })
                .change({ index: i }, e => {
                let working = this.$parent.workingOrnament;
                let orn = this.$parent.player.ornament[working];
                let el = e.target;
                orn.data[e.data.index] = parseInt(el.value, 10);
            })
                .prop('tabindex', 31);
        }
    }
}
"use strict";
class Manager {
    constructor($parent) {
        this.$parent = $parent;
        this._clipboard = '';
        this.copySample = function () {
            let app = this.$parent;
            let smp = app.player.sample[app.workingSample];
            let obj = {
                name: smp.name,
                loop: smp.loop,
                end: smp.end,
                releasable: smp.releasable,
                data: smp.export(false)
            };
            this.clipboard = 'STMF.smp:' + JSON.stringify(obj, null, '\t');
        };
        this.pasteSample = function () {
            if (this.clipboard.indexOf('STMF.smp:{') !== 0) {
                return false;
            }
            let app = this.$parent;
            let smp = app.player.sample[app.workingSample];
            let obj;
            try {
                let json = this.clipboard.substr(9);
                obj = JSON.parse(json);
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
        };
        this.clearOrnament = function () {
            let app = this.$parent;
            let orn = app.player.ornament[app.workingOrnament];
            orn.name = '';
            orn.data.fill(0);
            orn.loop = orn.end = 0;
        };
        this.copyOrnament = function () {
            let app = this.$parent;
            let orn = app.player.ornament[app.workingOrnament];
            let obj = {
                name: orn.name,
                loop: orn.loop,
                end: orn.end,
                data: orn.export(false)
            };
            this.clipboard = 'STMF.orn:' + JSON.stringify(obj, null, '\t');
        };
        this.pasteOrnament = function () {
            if (this.clipboard.indexOf('STMF.orn:{') !== 0) {
                return false;
            }
            let app = this.$parent;
            let orn = app.player.ornament[app.workingOrnament];
            let obj;
            try {
                let json = this.clipboard.substr(9);
                obj = JSON.parse(json);
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
        };
    }
    _getBlock() {
        let p = this.$parent.player;
        let sel = this.$parent.tracklist.selection;
        let ch = sel.len ? sel.channel : this.$parent.modeEditChannel;
        let line = sel.len ? sel.line : p.currentLine;
        let length = sel.len ? (sel.len + 1) : undefined;
        let pos = p.position[p.currentPosition] || p.nullPosition;
        let chn = pos.ch[ch];
        let patt = chn.pattern;
        return {
            pp: p.pattern[patt],
            line: line,
            len: length
        };
    }
    clearFromTracklist() {
        let o = this._getBlock();
        o.pp.parse([], o.line, o.len || 1);
    }
    copyFromTracklist() {
        let o = this._getBlock();
        let data = o.pp.export(o.line, o.len || 1, false);
        this._clipboard = 'STMF.trk:' + JSON.stringify(data, null, '\t');
    }
    pasteToTracklist() {
        if (this._clipboard.indexOf('STMF.trk:[') !== 0) {
            return false;
        }
        let o = this._getBlock();
        let data;
        try {
            let json = this._clipboard.substr(9);
            data = JSON.parse(json);
            if (!(data instanceof Array && data.length > 0)) {
                return false;
            }
        }
        catch (e) {
            return false;
        }
        o.pp.parse(data, o.line, o.len || data.length);
        return true;
    }
    clearSample() {
        let app = this.$parent;
        let smp = app.player.sample[app.workingSample];
        smp.name = '';
        smp.loop = 0;
        smp.end = 0;
        smp.releasable = false;
        smp.parse([]);
    }
}
/** Tracker.core submodule */
/* global browser, STMFile, AudioDriver, SAASound, SyncTimer, Player, Tracklist, SmpOrnEditor, Manager */
//---------------------------------------------------------------------------------------
var Tracker = (function() {
	function Tracker(ver) {
		console.log('Tracker', 'Inizializing SAA1099Tracker v%s...', ver);

		this.version = ver;

		this.loaded = false;
		this.activeTab = null;

		this.modePlay = false;
		this.modeEdit = false;
		this.modeEditChannel = 0;
		this.modeEditColumn = 0;
		this.workingPattern = 0;
		this.workingSample = 1;
		this.workingSampleTone = 37;
		this.workingOrnament = 1;
		this.workingOrnTestSample = 1;

		this.ctrlOctave = 2;
		this.ctrlSample = 0;
		this.ctrlOrnament = 0;
		this.ctrlRowStep = 0;

		this.songTitle = '';
		this.songAuthor = '';

		this.globalKeyState = {
			inDialog: false,
			modsHandled: false,
			lastPlayMode: 0,
			length: 0
		};

		this.settings = {
			tracklistAutosize: true,
			tracklistLines: 17,
			tracklistLineHeight: 9,
			hexTracklines: true,
			hexSampleFreq: false,
			audioInterrupt: 50,
			audioBuffers: 0
		};

		this.pixelfont  = { obj: null, ctx: null };
		this.manager    = new Manager(this);
		this.tracklist  = new Tracklist(this);
		this.smpornedit = new SmpOrnEditor(this);


	// constructor {
		this.doc.i18nInit();

		if (AudioDriver) {
			this.player = new Player(new SAASound(AudioDriver.sampleRate));
			AudioDriver.init(this.player);
		}
		else
			$('#overlay>span').html(
				browser.isIE ?
					i18n.app.error.ie :
					i18n.app.error.webaudio
			);

		if (this.player) {
			this.file = new STMFile(this);

			this.populateGUI();
			this.initializeGUI();
		}
	// }
	}

	Tracker.prototype.baseTimer = function() {
		if (this.modePlay && this.player.changedLine) {
			if (this.player.changedPosition)
				this.updatePanelPosition();
			this.updatePanelInfo();
			this.updateTracklist();

			this.player.changedPosition = false;
			this.player.changedLine = false;
		}
	};

	return Tracker;
})();
//---------------------------------------------------------------------------------------
/** Tracker.controls submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanels = function () {
	$('#scOctave').val(this.ctrlOctave);
	$('#scAutoSmp').val(this.ctrlSample);
	$('#scAutoOrn').val(this.ctrlOrnament);
	$('#scRowStep').val(this.ctrlRowStep);

	$('#txHeaderTitle').val(this.songTitle);
	$('#txHeaderAuthor').val(this.songAuthor);

	this.updatePanelInfo();
	this.updatePanelPattern();
	this.updatePanelPosition();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateEditorCombo = function (step) {
	if (step === void 0) {
		this.player.playLine();
		step = this.ctrlRowStep;
	}

	this.tracklist.moveCurrentline(step);
	this.updateTracklist();
	this.updatePanelInfo();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelInfo = function () {
	var p = this.player,
		el = $('#stInfoPanel u'),
		int = this.settings.audioInterrupt,
		total = 0, current = 0,
		curpos = p.currentPosition,
		len = p.position.length,
		pos = p.position[curpos],
		posi = null,
		line = p.currentLine,
		even = line & -2,
		bpm, i = int * 60;

	if (len) {
		bpm = (i / (pos.frames[even + 2] - pos.frames[even])) >> 1;

		for (i = 0; i < len; i++) {
			posi = p.position[i];
			if (i === curpos)
				current = total;
			total += posi.frames[posi.length];
		}

		current += pos.frames[line];

		i = total.toString().length;
		el[4].textContent = current.toWidth(i);
		el[5].textContent = total.toWidth(i);

		el[2].textContent = (current / int).toTimeString();
		el[3].textContent = (total / int).toTimeString();
	}
	else {
		bpm = (i / this.player.currentSpeed) >> 2;

		el[2].textContent = el[3].textContent = (0).toTimeString();
		el[4].textContent = el[5].textContent = '0';
	}

	el[0].textContent = bpm;
	el[1].textContent = int;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPattern = function() {
	var a = [ '#scPattern', '#scPatternLen', '#btPatternDelete', '#btPatternClean', '#btPatternInfo'],
		lastState = $(a[0]).prop('disabled'),
		pat = this.workingPattern,
		len = this.player.pattern.length,
		min = 0, max = 0,
		d = true, i;

	len--;
	if (len) {
		min = 1;
		max = len;
		pat = Math.max(Math.min(pat, max), min);
	}
	else
		pat = 0;

	for (i = 1; i <= 6; i++)
		$('#scChnPattern' + i).trigger('touchspin.updatesettings', { min: 0, max: max });

	if (pat) {
		d = false;
		$(a[1]).val(this.player.pattern[pat].end);
	}
	else
		$(a[1]).val(64);

	this.workingPattern = pat;
	$(a[0]).trigger('touchspin.updatesettings', { min: min, max: max, initval: pat }).val(pat);

	$('#txPatternUsed').val(this.player.countPatternUsage(pat));
	$('#txPatternTotal').val(len);

	if (d !== lastState) {
		for (i = 0, len = a.length; i < len; i++)
			$(a[i] + ',' + a[i] + '~span>button').prop('disabled', d);
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPosition = function () {
	var a = [ '#scPosCurrent', '#scPosLength', '#scPosSpeed', '#txPosTotal', '#scPosRepeat' ],
		lastState = $(a[0]).prop('disabled'),
		pos = this.player.nullPosition, buf,
		len = this.player.position.length,
		p = this.player.currentPosition,
		d = true, i;

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
	}

	pos = null;
};
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tracker.prototype.onCmdFileNew = function () {
	var keys = this.globalKeyState,
		file = this.file;
	if (this.modePlay || !file.yetSaved && !file.modified && !file.fileName)
		return;

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.file.new.title,
		text: i18n.dialog.file.new.msg,
		buttons: 'yesno',
		style: 'danger',
		callback: function (btn) {
			keys.inDialog = false;
			if (btn !== 'yes')
				return;
			file.new();
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileOpen = function () {
	if (this.modePlay)
		return;

	var keys = this.globalKeyState,
		file = this.file;

	if (file.modified) {
		keys.inDialog = true;

		$('#dialoque').confirm({
			title: i18n.dialog.file.open.title,
			text: i18n.dialog.file.open.msg,
			buttons: 'yesno',
			style: 'warning',
			callback: function (btn) {
				keys.inDialog = false;
				if (btn !== 'yes')
					return;

				file.dialog.load();
			}
		});
	}
	else
		file.dialog.load();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileSave = function (as) {
	if (this.modePlay || !this.player.position.length)
		return;

	var file = this.file;
	if (as || !file.yetSaved || file.modified)
		file.dialog.save();
	else if (!as && file.yetSaved && file.fileName)
		file.saveFile(file.fileName, $('#stInfoPanel u:eq(3)').text());
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditCut = function () {
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
Tracker.prototype.onCmdEditCopy = function () {
	if (this.activeTab === 0 && this.modeEdit)
		this.manager.copyFromTracklist();
	else if (this.activeTab === 1)
		this.manager.copySample();
	else if (this.activeTab === 2)
		this.manager.copyOrnament();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditPaste = function () {
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
Tracker.prototype.onCmdEditClear = function () {
	if (this.activeTab === 0 && this.modeEdit) {
		this.manager.clearFromTracklist();
		this.player.countPositionFrames(this.player.currentPosition);
		this.updateEditorCombo(0);
	}
	else if (this.activeTab === 1)
		this.onCmdSmpClear();
	else if (this.activeTab === 2)
		this.onCmdOrnClear();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdStop = function () {
	SyncTimer.pause();

	this.player.stopChannel();
	this.modePlay = false;
	this.globalKeyState.lastPlayMode = 0;

	if (this.activeTab === 0)
		this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlay = function () {
	if (this.globalKeyState.lastPlayMode === 2)
		return;
	if (this.activeTab === 0)
		this.doc.setStatusText();
	if (this.modeEdit)
		this.player.storePositionRuntime(this.player.currentPosition);

	this.modePlay = this.player.playPosition(false, true, true);
	SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlayStart = function () {
	if (this.activeTab === 0)
		this.doc.setStatusText();
	if (this.modeEdit)
		this.player.storePositionRuntime(this.player.currentPosition);

	this.modePlay = this.player.playPosition(true, true, true);
	SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlay = function () {
	if (this.globalKeyState.lastPlayMode === 1)
		return;
	if (this.activeTab === 0)
		this.doc.setStatusText();
	if (this.modeEdit)
		this.player.storePositionRuntime(this.player.currentPosition);

	this.modePlay = this.player.playPosition(false, false, false);
	SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlayStart = function () {
	if (this.activeTab === 0)
		this.doc.setStatusText();
	if (this.modeEdit)
		this.player.storePositionRuntime(this.player.currentPosition);

	this.modePlay = this.player.playPosition(false, false, true);
	SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleLoop = function (newState) {
	var state = (typeof newState === 'boolean') ? newState : (this.player.loopMode = !this.player.loopMode),
		el = $('a#miToggleLoop>span'),
		icon1 = 'glyphicon-repeat', icon2 = 'glyphicon-remove-circle',
		glyph = state ? icon1 : icon2,
		color = state ? '#000' : '#ccc';

	el.removeClass(icon1 + ' ' + icon2);
	el.addClass(glyph).css({ 'color': color });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleEditMode = function (newState) {
	var state = (typeof newState === 'boolean') ? newState : (this.modeEdit = !this.modeEdit),
		el = $('.tracklist-panel');

	if (!state) {
		this.doc.setStatusText();
		this.player.storePositionRuntime(this.player.currentPosition);
	}

	el[state ? 'addClass' : 'removeClass']('edit');
	this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdShowDocumentation = function (name) {
	var filename = 'doc/' + name + '.txt',
		cache = this.doc.txtCache,
		keys = this.globalKeyState,
		data = cache[name],

		dialog = $('#documodal'),
		button = $('<button/>').attr({
			'type': 'button',
			'class': 'close',
			'data-dismiss': 'modal'
		}).text('\xd7');

	if (!!data) {
		keys.inDialog = true;
		dialog.modal('show')
			.find('.modal-body')
			.html(data)
			.prepend(button)
			.on('hidden.bs.modal', function () {
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
			success: function (data) {
				data = ('<pre>\n' + data + '</pre>')
					.replace(/\s*?^\=\=\s*([^\=]+?)\s*[\=\s]+$/gm, '</pre><h3>$1</h3><pre>')
					.replace(/<pre><\/pre>/g, '');

				cache[name] = data;
				dialog.modal('show')
					.find('.modal-body')
					.html(data)
					.prepend(button)
					.on('hidden.bs.modal', function () {
						keys.inDialog = false;
						$(this).find('.modal-body').empty();
					});
			}
		});
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdAbout = function () {
	var keys = this.globalKeyState,
		dialog = $('#about'),
		data = dialog.data();

	if (!data.hasOwnProperty('bs.modal')) {
		dialog
			.on('show.bs.modal', function () { keys.inDialog = true })
			.on('hidden.bs.modal', function () { keys.inDialog = false });
	}

	dialog.modal('toggle');
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatCreate = function () {
	if (this.modePlay)
		return;

	var id = this.player.addNewPattern(),
		pt = this.player.pattern[id],
		len = (this.workingPattern && this.player.pattern[this.workingPattern].end) || 64;

	pt.end = len;
	this.workingPattern = id;
	this.updatePanelPattern();
	this.file.modified = true;

	$('#scPatternLen').focus();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatDelete = function () {
	if (this.modePlay || !this.workingPattern)
		return;

	var app = this,
		p = this.player,
		pt = this.workingPattern,
		keys = this.globalKeyState,
		len = p.pattern.length - 1,
		msg = null;

	if (p.countPatternUsage(pt) > 0)
		msg = i18n.dialog.pattern.delete.msg.used;
	if (pt !== len)
		msg = i18n.dialog.pattern.delete.msg.notlast;
	if (!msg)
		msg = i18n.dialog.pattern.delete.msg.sure;

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.pattern.delete.title,
		text: msg,
		buttons: 'yesno',
		style: (pt !== len) ? 'warning' : 'info',
		callback: function (btn) {
			keys.inDialog = false;
			if (btn !== 'yes')
				return;

			for (var i = 0, l = p.position.length, pos, chn; i < l; i++) {
				for (pos = p.position[i], chn = 0; chn < 6; chn++) {
					if (pos.ch[chn].pattern === pt)
						pos.ch[chn].pattern = 0;
					else if (pos.ch[chn].pattern > pt)
						pos.ch[chn].pattern--;
				}
			}

			p.pattern.splice(pt, 1);
			if (pt === len)
				pt--;

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
Tracker.prototype.onCmdPatClean = function () {
	if (this.modePlay || !this.workingPattern)
		return;

	var app = this,
		keys = this.globalKeyState,
		pt = this.player.pattern[this.workingPattern].data;

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.pattern.clean.title,
		text: i18n.dialog.pattern.clean.msg,
		buttons: 'yesno',
		style: 'info',
		callback: function (btn) {
			keys.inDialog = false;
			if (btn !== 'yes')
				return;

			for (var i = 0, data = pt[i]; i < Player.maxPatternLen; i++, data = pt[i]) {
				data.tone = 0;
				data.release = false;
				data.smp = 0;
				data.orn = 0;
				data.orn_release = false;
				data.volume.byte = 0;
				data.cmd = 0;
				data.cmd_data = 0;
			}

			app.updatePanelInfo();
			app.updateTracklist();
			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatInfo = function () {
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosCreate = function () {
	if (this.modePlay)
		return;

	var p = this.player,
		total = p.position.length,
		current = p.position[p.currentPosition] || p.nullPosition;

	p.addNewPosition(current.length, current.speed);
	p.currentPosition = total;
	p.currentLine = 0;

	this.updatePanelInfo();
	this.updatePanelPosition();
	this.updateTracklist();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosInsert = function () {
	if (this.modePlay)
		return;
	if (!this.player.position.length)
		return this.onCmdPosCreate();

	var p = this.player, chn,
		i = p.currentPosition,
		current = p.position[i] || p.nullPosition,
		pt = p.addNewPosition(current.length, current.speed, false);

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
Tracker.prototype.onCmdPosDelete = function () {
	if (this.modePlay || !this.player.position.length)
		return;

	var keys = this.globalKeyState,
		pos = this.player.currentPosition,
		app = this;

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.position.delete.title,
		text: i18n.dialog.position.delete.msg,
		buttons: 'yesno',
		style: 'info',
		callback: function (btn) {
			keys.inDialog = false;
			if (btn !== 'yes')
				return;

			app.player.currentLine = 0;
			app.player.position.splice(pos, 1);
			if (pos >= app.player.position.length)
				app.player.currentPosition--;

			app.updatePanelInfo();
			app.updatePanelPattern();
			app.updatePanelPosition();
			app.updateTracklist();
			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosMoveUp = function () {
	var p = this.player,
		i = p.currentPosition,
		swap = p.position[i];

	if (this.modePlay || !p.position.length || !i)
		return;

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
Tracker.prototype.onCmdPosMoveDown = function () {
	var p = this.player,
		i = p.currentPosition,
		total = p.position.length,
		swap = p.position[i];

	if (this.modePlay || !total || i === (total - 1))
		return;

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
Tracker.prototype.onCmdSmpPlay = function () {
	this.player.playSample(this.workingSample, 0, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpClear = function () {
	var app = this,
		smp = this.player.sample[this.workingSample];

	this.globalKeyState.inDialog = true;

	$('#dialoque').confirm({
		title: i18n.dialog.sample.clear.title,
		text: i18n.dialog.sample.clear.msg,
		style: 'warning',
		buttons:  [
			{ caption: i18n.dialog.sample.clear.options[0], id: 7 },
			{ caption: i18n.dialog.sample.clear.options[1], id: 1 },
			{ caption: i18n.dialog.sample.clear.options[2], id: 2 },
			{ caption: i18n.dialog.sample.clear.options[3], id: 4 },
			{ caption: i18n.dialog.sample.clear.options[4], id: 'cancel' }
		],
		callback: function (mask) {
			app.globalKeyState.inDialog = false;
			if (mask === 'cancel')
				return;

			var data = smp.data, i,
				all = (mask === 7);

			for (i = 0; i < 256; i++) {
				if (mask & 1) {
					data[i].volume.byte = 0;
					data[i].enable_freq = false;
				}
				if (mask & 2) {
					data[i].enable_noise = false;
					data[i].noise_value = 0;
				}
				if (mask & 4)
					data[i].shift = 0;
			}

			if (all) {
				smp.name = '';
				smp.loop = 0;
				smp.end = 0;
				smp.releasable = false;
			}

			app.updateSampleEditor(all);
			if (mask & 4)
				app.smpornedit.updateSamplePitchShift();

			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpSwap = function () {
	for (var data = this.player.sample[this.workingSample].data, swap, i = 0; i < 256; i++) {
		swap = data[i].volume.L;
		data[i].volume.L = data[i].volume.R;
		data[i].volume.R = swap;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolUp = function () {
	for (var smp = this.player.sample[this.workingSample], data = smp.data, i = 0; i < 256; i++) {
		if ((i <  smp.end && data[i].volume.L < 15) ||
			(i >= smp.end && data[i].volume.L > 0 && data[i].volume.L < 15))
				data[i].volume.L++;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolDown = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		if (data[i].volume.L > 0)
			data[i].volume.L--;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolUp = function () {
	for (var smp = this.player.sample[this.workingSample], data = smp.data, i = 0; i < 256; i++) {
		if ((i <  smp.end && data[i].volume.R < 15) ||
			(i >= smp.end && data[i].volume.R > 0 && data[i].volume.R < 15))
				data[i].volume.R++;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolDown = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		if (data[i].volume.R > 0)
			data[i].volume.R--;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyLR = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		data[i].volume.R = data[i].volume.L;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyRL = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		data[i].volume.L = data[i].volume.R;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotL = function () {
	var i = 0, ref,
		data = this.player.sample[this.workingSample].data,
		backup = $.extend(true, {}, data[i]);

	for (; i < 256; i++) {
		ref = (i < 255) ? data[i + 1] : backup;

		data[i].volume.byte  = ref.volume.byte;
		data[i].enable_freq  = ref.enable_freq;
		data[i].enable_noise = ref.enable_noise;
		data[i].noise_value  = ref.noise_value;
		data[i].shift        = ref.shift;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotR = function () {
	var i = 255, ref,
		data = this.player.sample[this.workingSample].data,
		backup = $.extend(true, {}, data[i]);

	for (; i >= 0; i--) {
		ref = (i > 0) ? data[i - 1] : backup;

		data[i].volume.byte  = ref.volume.byte;
		data[i].enable_freq  = ref.enable_freq;
		data[i].enable_noise = ref.enable_noise;
		data[i].noise_value  = ref.noise_value;
		data[i].shift        = ref.shift;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpEnable = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		if (!!data[i].volume.byte)
			data[i].enable_freq = true;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpDisable = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		data[i].enable_freq = false;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnPlay = function () {
	this.player.playSample(this.workingOrnTestSample, this.workingOrnament, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnClear = function () {
	var keys = this.globalKeyState,
		orn = this.player.ornament[this.workingOrnament],
		app = this;

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.ornament.clear.title,
		text: i18n.dialog.ornament.clear.msg,
		style: 'warning',
		buttons: 'yesno',
		callback: function (btn) {
			keys.inDialog = false;
			if (btn !== 'yes')
				return;

			orn.name = '';
			orn.data.fill(0);
			orn.loop = orn.end = 0;

			app.smpornedit.updateOrnamentEditor(true);
			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnShiftLeft = function () {
	var i = 0,
		data = this.player.ornament[this.workingOrnament].data,
		ref = data[i];

	for (; i < 256; i++)
		data[i] = (i < 255) ? data[i + 1] : ref;

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnShiftRight = function () {
	var i = 255,
		data = this.player.ornament[this.workingOrnament].data,
		ref = data[i];

	for (; i >= 0; i--)
		data[i] = (i > 0) ? data[i - 1] : ref;

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransUp = function () {
	for (var orn = this.player.ornament[this.workingOrnament], l = orn.end, i = 0; i < l; i++)
		orn.data[i]++;

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransDown = function () {
	for (var orn = this.player.ornament[this.workingOrnament], l = orn.end, i = 0; i < l; i++)
		orn.data[i]--;

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnCompress = function () {
	var orn = this.player.ornament[this.workingOrnament],
		data = orn.data,
		i = 0, k = 0;

	for (; k < 256; i++, k += 2)
		data[i] = data[k];
	data.fill(0, i);

	orn.loop >>= 1;
	orn.end >>= 1;

	this.smpornedit.updateOrnamentEditor(true);
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnExpand = function () {
	var orn = this.player.ornament[this.workingOrnament],
		data = orn.data,
		i = 127, k = 256;

	for (; k > 0; i--) {
		data[--k] = data[i];
		data[--k] = data[i];
	}

	orn.loop <<= 1;
	orn.end <<= 1;

	this.smpornedit.updateOrnamentEditor(true);
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
/** Tracker.keyboard submodule */
/* global browser, Player */
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
Tracker.prototype.hotkeyMap = function (type, group, key) {
	var app = this,
		cursors = (key > 32 && key < 41),
		keyup = /keyup|test/.test(type),
		keydown = /keydown|test/.test(type);

	switch (group) {
		case 'globalCtrl':
			if (!keyup)
				return;

			return {
				67: function () {
					console.logHotkey('Ctrl+C - Copy');
					app.onCmdEditCopy();
				},
				68: function () {
					console.logHotkey('Ctrl+D - Clear/Delete');
					app.onCmdEditClear();
				},
				79: function () {
					console.logHotkey('Ctrl+O - Open');
					app.onCmdFileOpen();
				},
				80: function () {
					console.logHotkey('Ctrl+P - Preferences');
				},
				83: function () {
					console.logHotkey('Ctrl+S - Save');
					app.onCmdFileSave();
				},
				86: function () {
					console.logHotkey('Ctrl+V - Paste');
					app.onCmdEditPaste();
				},
				88: function () {
					console.logHotkey('Ctrl+X - Cut');
					app.onCmdEditCut();
				},
				89: function () {
					console.logHotkey('Ctrl+Y - Redo');
				},
				90: function () {
					console.logHotkey('Ctrl+Z - Undo');
				}
			}[key];

		case 'globalFs':
			if (!keydown)
				return;

			return {
				27: function () {
					console.logHotkey('Esc - Stop');
					if (app.modePlay || app.activeTab > 0)
						app.onCmdStop();
					else if (app.modeEdit)
						app.onCmdToggleEditMode();
				},
				112: function () {
					console.logHotkey('F1 - About');
					app.onCmdAbout();
				},
				113: function () {
					console.logHotkey('F2 - Tracklist Editor');
					$('#tab-tracker').tab('show');
				},
				114: function () {
					console.logHotkey('F3 - Sample Editor');
					$('#tab-smpedit').tab('show');
				},
				115: function () {
					console.logHotkey('F4 - Ornament Editor');
					$('#tab-ornedit').tab('show');
				},
				116: function () {
					console.logHotkey('F5 - Play song');
					app.onCmdSongPlay();
				},
				117: function () {
					console.logHotkey('F6 - Play song from start');
					app.onCmdSongPlayStart();
				},
				118: function () {
					console.logHotkey('F7 - Play position');
					app.onCmdPosPlay();
				},
				119: function () {
					console.logHotkey('F8 - Play position from start');
					app.onCmdPosPlayStart();
				},
				120: function () {
					console.logHotkey('F9 - Track manager');
				},
				121: function () {
					console.logHotkey('F10 - Preferences');
				},
				122: function () {
					console.logHotkey('F11 - Toggle loop');
					app.onCmdToggleLoop();
				},
				123: function () {
					console.logHotkey('F12 - Unimplemented');
				}
			}[key];

		case 'trackerCtrl':
			if (!((type === 'repeat' && ([38,40,48,57].indexOf(key) >= 0)) || keydown))
				return;

			// unite bunch of keys into one handler...
			if (key > 96 && key < 103)     // Numpad1-Numpad6 (toggle channels)
				key = 96;
			else if (key > 48 && key < 57) // numbers 1-8 (octave)
				key = 56;

			return {
				38: function () {
					console.logHotkey('Up - Cursor movement backward to every 16th line (signature)');

					var cl = app.player.currentLine;
					if (cl >= 16 && (cl & 0xf0) === cl)
						cl = 16;
					else
						cl = (cl & 0x0f);

					if (!cl)
						return false;

					app.updateEditorCombo(-cl);
				},
				40: function () {
					console.logHotkey('Down - Cursor movement forward to every 16th line (signature)');

					var pp = app.player.position[app.player.currentPosition] || app.player.nullPosition,
						cl = app.player.currentLine,
						pl = pp.length;

					if (cl < (pl - 16))
						cl = 16 - (cl & 0x0f);
					else
						cl = pl - cl - 1;

					app.updateEditorCombo(cl);
				},
				48: function () {
					console.logHotkey('Ctrl+0 - Increase rowstep');
					app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.uponce').val(), 10);
				},
				56: function (oct) {
					oct -= 48;
					console.logHotkey('Ctrl+' + oct + ' - Set octave');
					$('#scOctave').val(oct);
					app.ctrlOctave = oct;
				},
				57: function () {
					console.logHotkey('Ctrl+9 - Decrease rowstep');
					app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.downonce').val(), 10);
				},
				96: function (chn) {
					chn -= 96;
					console.logHotkey('Ctrl+Num' + chn + ' - Toggle channel');
					$('#scChnButton' + chn).bootstrapToggle('toggle');
				}
			}[key];

		case 'trackerCtrlShift':
			if (!keyup)
				return;

			// unite Numpad +/- into one handler (transposition)
			if (key === 109)
				key = 107;

			return {
				37: function () {
					console.logHotkey('Ctrl+Shift+Left - Previous position');
					$('#scPosCurrent').trigger('touchspin.downonce');
				},
				39: function () {
					console.logHotkey('Ctrl+Shift+Right - Next position');
					$('#scPosCurrent').trigger('touchspin.uponce');
				},
				107: function(plus) {
					if (!app.modeEdit)
						return;

					plus &= 2;
					console.logHotkey('Ctrl+Shift+Num' + (!!plus ? 'Plus' : 'Minus') + ' - Transpose octave');

					var p = app.player, t,
						sel = app.tracklist.selection,
						ch = sel.len ? sel.channel : app.modeEditChannel,
						line = sel.len ? sel.line : p.currentLine,
						end = line + sel.len,
						pos = p.position[p.currentPosition] || p.nullPosition,
						pp = p.pattern[pos.ch[ch].pattern];

					for (plus = (plus - 1) * 12; line <= end; line++) {
						if (line >= pp.end)
							break;

						if (!(t = pp.data[line].tone))
							continue;

						t += plus;
						if (t > 0 && t <= 96)
							pp.data[line].tone = t;
					}

					app.updateTracklist();
				}
			}[key];

		case 'editorShift':
			if (!keydown || !app.modeEdit || !app.player.position.length)
				return;

			return {
				9: function () {
					console.logHotkey('Shift+Tab - Previous channel');
					if (app.modeEditChannel > 0)
						app.modeEditChannel--;
					else
						app.modeEditChannel = 5;

					app.updateTracklist();
				}
			}[key];

		case 'editorKeys':
			if (!(keydown || (type === 'repeat' && cursors)))
				return;

			// unite Numpad +/- into one handler (transposition)
			if (key === 109)
				key = 107;

			if (cursors) {
				if (app.modePlay)
					app.onCmdStop();
				else if (!app.player.position.length || (!app.modeEdit && app.modePlay))
					return;
			}

			return {
				9: function () {
					if (!app.player.position.length || !app.modeEdit)
						return;

					console.logHotkey('Tab - Next channel');
					if (app.modeEditChannel < 5)
						app.modeEditChannel++;
					else
						app.modeEditChannel = 0;

					app.updateTracklist();
				},
				32: function () {
					console.logHotkey('Space - Edit mode');
					if (app.modePlay)
						app.onCmdStop();
					if (app.player.position.length)
						app.onCmdToggleEditMode();
				},
				33: function () {
					console.logHotkey('PageUp - Move cursor up by half of tracklines');

					var lines = app.settings.tracklistLines + 1;
					app.tracklist.moveCurrentline(-(lines >> 1), true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				34: function () {
					console.logHotkey('PageDown - Move cursor down by half of tracklines');

					var lines = app.settings.tracklistLines + 1;
					app.tracklist.moveCurrentline((lines >> 1), true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				35: function () {
					console.logHotkey('End - Move cursor to end of the position');
					app.tracklist.moveCurrentline(Player.maxPatternLen, true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				36: function () {
					console.logHotkey('Home - Move cursor to start of the position');
					app.tracklist.moveCurrentline(-Player.maxPatternLen, true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				37: function () {
					if (!app.modeEdit)
						return;

					console.logHotkey('Left - Cursor movement');
					if (app.modeEditColumn > 0)
						app.modeEditColumn--;
					else {
						app.modeEditColumn = 7;
						if (app.modeEditChannel > 0)
							app.modeEditChannel--;
						else
							app.modeEditChannel = 5;
					}

					app.updateTracklist();
				},
				38: function () {
					console.logHotkey('Up - Cursor movement');
					app.updateEditorCombo(-1);
				},
				39: function () {
					if (!app.modeEdit)
						return;

					console.logHotkey('Right - Cursor movement');
					if (app.modeEditColumn < 7)
						app.modeEditColumn++;
					else {
						app.modeEditColumn = 0;
						if (app.modeEditChannel < 5)
							app.modeEditChannel++;
						else
							app.modeEditChannel = 0;
					}

					app.updateTracklist();
				},
				40: function () {
					console.logHotkey('Down - Cursor movement');
					app.updateEditorCombo(1);
				},
				107: function(plus) {
					if (!app.modeEdit)
						return;

					plus &= 2;
					console.logHotkey('Num' + (!!plus ? 'Plus' : 'Minus') + ' - Transpose half-tone');

					var p = app.player,
						sel = app.tracklist.selection,
						ch = sel.len ? sel.channel : app.modeEditChannel,
						line = sel.len ? sel.line : p.currentLine,
						end = line + sel.len,
						pos = p.position[p.currentPosition] || p.nullPosition,
						pp = p.pattern[pos.ch[ch].pattern];

					for (--plus; line <= end; line++)
						if (line >= pp.end)
							break;
						else if (pp.data[line].tone)
							pp.data[line].tone = Math.min(Math.max(pp.data[line].tone + plus, 1), 96);

					app.updateTracklist();
				}
			}[key];

		case 'editorEdit':
			if (!keydown)
				return;

			var cl = app.player.currentLine,
				pp = app.player.position[app.player.currentPosition] || app.player.nullPosition,
				cp = pp.ch[app.modeEditChannel].pattern,
				pt = app.player.pattern[cp],
				pl = pt.data[cl];

			if (cl < pt.end) switch (key) {
				case 8:
					return function () {
						console.logHotkey('Backspace - Delete trackline from pattern');

						var A = cl + 1, B = cl, data = pt.data,
							max = Player.maxPatternLen - 1;

						for (; A < max; A++, B++) {
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

						app.updateTracklist();
					};

				case 45:
					return function () {
						console.logHotkey('Insert - New trackline into pattern');

						var max = Player.maxPatternLen,
							A = max - 2, B = max - 1, data = pt.data;

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

						app.updateTracklist();
					};

				case 46:
					return function () {
						console.logHotkey('Delete - Clear trackline data');

						switch (app.modeEditColumn) {
							default: case 0:		// NOTE column
								pl.tone = 0;
								pl.release = 0;
								break;
							case 1: 				// SAMPLE column
								pl.smp = 0;
								break;
							case 2: 				// ORNAMENT column
								pl.orn = 0;
								pl.orn_release = 0;
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

						app.updateEditorCombo();
					};

				default:
					var columnHandler = {
					// NOTE column
						0: function (key, test) {
							var tone = Math.min(app.getKeynote(key), 96);

							if (tone < 0)
								return false;
							else if (test)
								return true;
							else if (tone > 0) {
								pl.release = false;
								pl.tone = tone;
								if (app.ctrlSample && !pl.smp)
									pl.smp = app.ctrlSample;
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

							app.updateEditorCombo();
						},
					// SAMPLE column
						1: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.smp = (key - 48);
							}
							else if (key >= 65 && key <= 86) { // A - V
								if (test)
									return true;

								pl.smp = (key - 55);
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// ORNAMENT column
						2: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.orn_release = false;
								pl.orn = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.orn_release = false;
								pl.orn = (key - 55);
							}
							else if (key === 88 || key === 189) { // X | -
								if (test)
									return true;

								pl.orn_release = true;
								pl.orn = 0;
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// ATTENUATION 1 column
						3: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.volume.L = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.volume.L = (key - 55);
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// ATTENUATION 2 column
						4: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.volume.R = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.volume.R = (key - 55);
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// COMMAND column
						5: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.cmd = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.cmd = (key - 55);

								// recalculate position frames if we changing speed
								if (pl.cmd == 0xF && pl.cmd_data)
									app.player.countPositionFrames(app.player.currentPosition);
							}
							else return;

							app.updateEditorCombo();
						},
					// COMMAND DATA 1 column
						6: function (key, test) {
							if (key >= 48 && key <= 57) // 0 - 9
								key -= 48;
							else if (key >= 65 && key <= 70) // A - F
								key -= 55;
							else
								return false;

							if (test)
								return true;

							pl.cmd_data &= 0x0F;
							pl.cmd_data |= key << 4;

							// recalculate position frames if we changing speed
							if (pl.cmd == 0xF && pl.cmd_data)
								app.player.countPositionFrames(app.player.currentPosition);

							app.updateEditorCombo();
						},
					// COMMAND DATA 2 column
						7: function (key, test) {
							if (key >= 48 && key <= 57) // 0 - 9
								key -= 48;
							else if (key >= 65 && key <= 70) // A - F
								key -= 55;
							else
								return false;

							if (test)
								return true;

							pl.cmd_data &= 0xF0;
							pl.cmd_data |= key;

							// recalculate position frames if we changing speed
							if (pl.cmd == 0xF && pl.cmd_data)
								app.player.countPositionFrames(app.player.currentPosition);

							app.updateEditorCombo();
						}
					}[app.modeEditColumn];

					return (columnHandler(key, true)) ? columnHandler : undefined;
			}

		case 'smpornCtrl':
			if (!keydown)
				return;

			if (key > 48 && key < 57) { // numbers 1-8 (octave)
				return function (key) {
					var oct = (key - 49),
						base = app.workingSampleTone,
						tone = ((base - 1) % 12) + (oct * 12) + 1;

					if (base !== tone) {
						console.logHotkey('Ctrl+' + String.fromCharCode(key) + ' - Set octave for sample/ornament editor test tone');
						app.workingSampleTone = tone;

						$('#scSampleTone,#scOrnTone')
							.val(tone.toString())
							.prev().val(app.player.tones[tone].txt);
					}
				};
			}
			break;

		case 'smpornCtrlShift':
			if (!keydown)
				return;

			if ((key > 48 && key <= 57) || (key > 64 && key <= 90)) { // 1-9 | A-V
				return function (key) {
					var num = key - 48,
						orn = (app.activeTab === 2);

					if (num > 9)
						num -= 7;

					if (num >= (orn ? 16 : 32))
						return;

					console.logHotkey('Ctrl+Shift' + String.fromCharCode(key) +
						' - Set active ' + (orn ? 'ornament' : 'sample'));

					$(orn ? '#scOrnNumber' : '#scSampleNumber')
						.val(num.toString(32).toUpperCase())
						.trigger('change');
				};
			}
			break;

		case 'smpornKeys':
			if (!keydown)
				return;

			// 2.5 octave piano-roll on keyboard
			var oct  = app.player.tones[app.workingSampleTone].oct,
				tone = Math.min(app.getKeynote(key, oct), 96),
				sample = (app.activeTab === 1) ? app.workingSample : app.workingOrnTestSample,
				ornament = (app.activeTab === 2) ? app.workingOrnament : 0;

			if (tone > 0)
				return function () { app.player.playSample(sample, ornament, tone) };
			break;

		default:
			return;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleKeyEvent = function (e) {
	var o = this.globalKeyState,
		type = e.type,
		isInput = (e.target && (/^a|input|button$/i.test(e.target.tagName)) || e.target.id === 'documodal'),
		textInput = (isInput && e.target.id.indexOf('tx') === 0),
		key = e.which || e.charCode || e.keyCode,
		canPlay = !!this.player.position.length;

	// cross-platform fixes
	if (browser.isOpera && key === 219)
		key = 91;
	else if (browser.isFirefox) switch (key) {
 		case 59:
 			key = 186; break;
 		case 61:
 			key = 187; break;
 		case 173:
 			key = 189; break;
 	}

	if (type === 'keydown') {
		if (key >= 16 && key <= 18) {
			o.modsHandled = false;
			if (e.location === 2)
				key += 256;
		}

		if (e.repeat || (browser.isFirefox && o[key]))
			type = 'repeat';

		// add new key to the keymapper
		else if (!o[key]) {
			o[key] = true;
			o.length++;
		}

		if (isInput && !this.handleHotkeys('test', key, isInput, textInput))
			return true;

		if (!this.handleHotkeys(type, key, isInput, textInput)) {
			if (!o.inDialog && this.activeTab === 0) {
				// ENTER (hold to play position at current line)
				if (o[13] && o.length === 1 && canPlay && !this.modePlay && !o.lastPlayMode) {
					this.modePlay = this.player.playPosition(false, false, false);
					o.lastPlayMode = 3;
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
		if (o[key] && this.handleHotkeys(type, key, isInput, textInput))
			isInput = false;

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
			if (o.length)
				o.length--;
		}
		if (o[key + 256]) {
			delete o[key + 256];
			if (o.length)
				o.length--;
		}

		if (isInput)
			return true;
	}

	e.preventDefault();
	return false;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleHotkeys = function (type, key, isInput, textInput) {
	var o = this.globalKeyState,
		fn = false,
		restrict = o.inDialog || isInput;

	if (o[17] && key !== 17) { // handle Left Ctrl
		if (key === 90 && o[16]) { // convert Ctrl+Shift+Z to Ctrl+Y
			delete o[key];
			delete o[16];
			if (o.length)
				o.length--;
			o[--key] = true;
		}

		if (o.length === 2) {
			if (textInput && (key === 67 || key === 86))
				return false;
			else if (key === 82 || key === 116) {
				fn = true; // disable refresh browser hotkeys
				type = 'test';
			}
			else if (!o.inDialog && !(fn = this.hotkeyMap(type, 'globalCtrl', key)) && !isInput) {
				if (this.activeTab === 0)
					fn = this.hotkeyMap(type, 'trackerCtrl', key);
				else
					fn = this.hotkeyMap(type, 'smpornCtrl', key);
			}
		}
		else if (!o.inDialog && o.length === 3 && o[16]) {
			if (this.activeTab === 0)
				fn = this.hotkeyMap(type, 'trackerCtrlShift', key);
			else
				fn = this.hotkeyMap(type, 'smpornCtrlShift', key);
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
	else if (!restrict && o[16] && key !== 16 && o.length === 2 && this.activeTab === 0)
		fn = this.hotkeyMap(type, 'editorShift', key);
	else if (o.length === 1) {
		if (o.inDialog && (key >= 112 && key <= 123) || key === 272) {
			fn = true; // disable F1-F12 keys in dialogs
			type = 'test';
			o.modsHandled = true;
		}
		else if (!o.inDialog && !(fn = this.hotkeyMap(type, 'globalFs', key)) && !isInput) {
			if (this.activeTab === 0) {
				if (!(fn = this.hotkeyMap(type, 'editorKeys', key)) && this.player.position.length && this.modeEdit)
					fn = this.hotkeyMap(type, 'editorEdit', key);
			}
			else
				fn = this.hotkeyMap(type, 'smpornKeys', key);
		}
	}

	if (fn) {
		if (type !== 'test') {
			fn(key);
			o.modsHandled = true;
		}

		return true;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.getKeynote = function (key, octave) {
	var t = ((octave !== void 0) ? octave : (this.ctrlOctave - 1)) * 12,
		c = String.fromCharCode(key),
		i = ' ZSXDCVGBHNJMQ2W3ER5T6Y7UI9O0P'.indexOf(c);

	if (i > 0)
		return (t + i);
	else if ((i = {
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
	}[key]) >= 0)
		return i;

	return -1;
};
//---------------------------------------------------------------------------------------
/** Tracker.keyboard submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.handleMouseEvent = function (part, obj, e) {
	var x = e.pageX || 0, y = e.pageY || 0;
	var leftButton = browser.isFirefox
			? (!!(e.buttons & 1) || (e.type !== 'mousemove' && e.button === 0))
			: (e.which === 1);

	if (part === 'tracklist') {
		var redraw = false,
			p = this.player,
			pp = p.position[p.currentPosition],
			sel = obj.selection,
			offset = obj.canvasData.offset,
			point = obj.pointToTracklist(x - offset.left, y - offset.top),
			line = p.currentLine, i;

		if (this.modePlay || !pp)
			return;

		if (point) {
			point.line = Math.min(point.line, pp.length - 1);
			i = point.line - sel.start.line;
		}
		else if (e.type !== 'mousewheel')
			return;

		if (e.type === 'mousewheel') {
			if (document.activeElement !== e.target)
				document.activeElement.blur();

			if (e.delta < 0)
				obj.moveCurrentline(1);
			else if (e.delta > 0)
				obj.moveCurrentline(-1);
			redraw = true;
		}
		else if (e.type === 'mousedown') {
			if (leftButton && point.line < pp.length)
				sel.start.set(point);
		}
		else if (e.type === 'mouseup' && leftButton) {
			if (sel.isDragging) {
				sel.len = i;
				sel.line = sel.start.line;
				sel.channel = sel.start.channel;
				sel.isDragging = false;
				redraw = true;
			}
			else {
				if (!this.modeEdit)
					e.target.focus();

				if (point.line === line) {
					this.modeEditChannel = sel.start.channel;
					this.modeEditColumn = sel.start.column;
					redraw = true;
				}
			}
		}
		else if (e.type === 'dblclick' && leftButton) {
			sel.len = 0;
			sel.line = point.line;
			sel.channel = point.channel;
			sel.isDragging = false;

			if (!this.modeEdit)
				e.target.focus();

			this.modeEditChannel = sel.start.channel;
			this.modeEditColumn = sel.start.column;
			p.currentLine = point.line;
			redraw = true;
		}
		else if (e.type === 'mousemove' && leftButton && !point.compare(sel.start)) {
			if (i > 0) {
				sel.len = i;
				sel.line = sel.start.line;
				sel.channel = sel.start.channel;
				sel.isDragging = true;
			}

			if (point.y === (this.settings.tracklistLines - 1))
				obj.moveCurrentline(1, true);

			redraw = true;
		}

		if (redraw) {
			if (!sel.isDragging && e.type !== 'mousewheel') {
				i = 0;
				if (this.modeEditColumn >= 5)
					i = p.pattern[pp.ch[this.modeEditChannel].pattern].data[line].cmd;

				this.doc.showTracklistStatus(this.modeEditColumn, i);
			}

			this.updateTracklist();
			this.updatePanelInfo();
		}
	}
	else {
		var sample = this.player.sample[this.workingSample], data,
			dragging = /mouse(down|move)/.test(e.type),
			update = false,
			redrawAll = false, limitFrom, limitTo;

		x -= (obj.smpeditOffset.left + obj.centering);
		if (x < 0)
			return;

		x = Math.min(0 | (x / obj.columnWidth), 63) + obj.smpeditScroll;
		limitFrom = limitTo = x;
		data = sample.data[x];

		if (part === 'amp') {
			y -= obj.smpeditOffset.top.amp;

			var ampHeight = obj.amp.obj.height - 24,
				ampLeftChn = (y < obj.halfing),
				freqEnableSection = (y > (ampHeight + 3)) || obj.drag.isDragging;

			if (freqEnableSection && leftButton) {
				if (e.type === 'mousedown') {
					i = obj.drag.freqEnableState = !data.enable_freq;
					obj.drag.isDragging = true;
				}
				else if (e.type === 'mouseup') {
					i = obj.drag.freqEnableState;
					obj.drag.isDragging = false;
				}
				else if (obj.drag.isDragging && e.type === 'mousemove')
					i = obj.drag.freqEnableState;

				if (data.enable_freq !== i) {
					data.enable_freq = i;
					update = true;
				}
			}
			else if (e.type === 'mousewheel') {
				i = e.delta / Math.abs(e.delta);

				if (ampLeftChn)
					data.volume.L = Math.max(Math.min(data.volume.L + i, 15), 0);
				else
					data.volume.R = Math.max(Math.min(data.volume.R - i, 15), 0);

				update = true;
			}
			else if (dragging && leftButton) {
				if (ampLeftChn)
					data.volume.L = Math.max(15 - (0 | (y / 9)), 0);
				else
					data.volume.R = Math.max(15 - (0 | ((ampHeight - y) / 9)), 0);

				update = true;
			}
		}
		else if (part === 'noise') {
			y -= obj.smpeditOffset.top.noise;
			i = (0 | data.enable_noise) * (data.noise_value + 1);

			if (e.type === 'mousewheel') {
				i += e.delta / Math.abs(e.delta);
				update = true;
			}
			else if (dragging && leftButton) {
				i = 4 - (0 | (y / 9));
				update = true;
			}

			if (update) {
				i = Math.min(Math.max(i, 0), 4);

				data.enable_noise = !!i;
				data.noise_value = Math.max(--i, 0);
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

				if (obj.drag.isDragging === 1)
					limitFrom = limitTo = void 0;
				else {
					limitFrom = sample.loop - 1;
					limitTo = sample.end;
				}
			}
		}

		if (update)
			this.updateSampleEditor(redrawAll, limitFrom, limitTo);
	}
};
//---------------------------------------------------------------------------------------
/** Tracker.paint submodule */
//---------------------------------------------------------------------------------------
/*
 * This method initialize pixel font pre-colored template canvas. Color combinations:
 *   0 - [ fg: BLACK, bg: WHITE ]
 *   1 - [ fg:  GRAY, bg: WHITE ]
 *   2 - [ fg: WHITE, bg: RED ]
 *   3 - [ fg:  GRAY, bg: RED ]
 *   4 - [ fg: WHITE, bg: HILITE ]
 *   5 - [ fg:  GRAY, bg: HILITE ]
 *   6 - [ fg: WHITE, bg: BLACK ]
 *   7 - [ fg:  GRAY, bg: BLACK ]
 *   8 - [ fg: WHITE, bg: DARKRED ]
 *   9 - [ fg:  GRAY, bg: DARKRED ]
 */
Tracker.prototype.initPixelFont = function (font) {
	// backgrounds (white, red, hilite, block, darkred)
	var bg = [ '#fff', '#f00', '#38c', '#000', '#800' ],
		o = this.pixelfont, i, l = bg.length * 10,
		w = font.width, copy, copyctx;

	console.log('Tracker.paint', 'Initializing pixel-font...');

	o.obj = document.createElement('canvas');
	o.obj.width = w;
	o.obj.height = l;
	o.ctx = o.obj.getContext('2d');

	for (i = 0; i < l; i += 10) {
		o.ctx.fillStyle = bg[i / 10];
		o.ctx.fillRect(0, i, w, 10);
	}

	copy = document.createElement('canvas');
	copy.width = w;
	copy.height = 5;
	copyctx = copy.getContext('2d');

	copyctx.save();
	copyctx.clearRect(0, 0, w, 5);
	copyctx.drawImage(font, 0, 0);

	copyctx.fillStyle = '#fff';
	copyctx.globalCompositeOperation = "source-in";
	copyctx.fillRect(0, 0, w, 5);
	copyctx.restore();

	for (i = 0; i < l; i += 10)
		o.ctx.drawImage(copy, 0, i);

	copyctx.save();
	copyctx.clearRect(0, 0, w, 5);
	copyctx.drawImage(font, 0, 0);

	copyctx.fillStyle = '#aaa';
	copyctx.globalCompositeOperation = "source-in";
	copyctx.fillRect(0, 0, w, 5);
	copyctx.restore();

	for (i = 5; i < l; i += 10)
		o.ctx.drawImage(copy, 0, i);

	o.ctx.drawImage(font, 0, 0);

	// throw it to the garbage...
	copyctx = null;
	copy = null;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateTracklist = function (update) {
	var o = this.tracklist.canvasData,
		sel = this.tracklist.selection,
		offs = this.tracklist.offsets,
		player = this.player,
		hexdec = this.settings.hexTracklines,
		font = this.pixelfont.obj,
		ctx = this.tracklist.ctx,
		pos = player.currentPosition,
		pp = player.position[pos] || player.nullPosition,
		triDigitLine = (!hexdec && pp.length > 100),
		backup, pt, dat,
		w = this.tracklist.obj.width,
		h = this.settings.tracklistLineHeight,
		lines = this.settings.tracklistLines,
		half = lines >> 1,
		line = player.currentLine - half,
		buf, cc, ccb, chn, i, j, k, x, ypad, y, status,
		charFromBuf = function(i) { return (buf.charCodeAt(i || 0) - 32) * 6 };

	if (update) {
		o.center = ((w - o.lineWidth) >> 1);
		o.vpad = Math.round((h - 5) / 2);
		o.trkOffset = o.center + 24; // (2 trackline numbers + 2 padding) * fontWidth
		offs.y = [];
	}

	for (i = 0, y = 0, ypad = o.vpad; i < lines; i++, line++, ypad += h, y += h) {
		if (update)
			offs.y[i] = y;

		if (i !== half) {
			ccb = 0; // basic color combination
			ctx.clearRect(o.center - 6, y, o.lineWidth + 9, h);
		}
		else if (this.modeEdit) {
			ccb = 10; // col.combination: 2:WHITE|RED
			ctx.fillStyle = '#f00';
			ctx.fillRect(0, y, w, h);
		}
		else {
			ccb = 20; // col.combination: 4:WHITE|HILITE
			ctx.fillStyle = '#38c';
			ctx.fillRect(0, y, w, h);
		}

		if (line < 0) {
			if (!(pos && pp))
				continue;

			// prev position hints
			backup = { pp: pp, line: line };
			pp = player.position[pos - 1];
			line += pp.length;
		}
		else if (line >= pp.length) {
			if (!(pos < (player.position.length - 1) && pp))
				continue;

			// next position hints
			backup = { pp: pp, line: line };
			line -= pp.length;
			pp = player.position[pos + 1];
		}

		buf = ('00' + line.toString(hexdec ? 16 : 10)).substr(-3);

		if (triDigitLine || (!hexdec && line > 99))
			ctx.drawImage(font, charFromBuf(0), ccb, 5, 5, o.center - 6, ypad, 5, 5);

		ctx.drawImage(font, charFromBuf(1), ccb, 5, 5, o.center, ypad, 5, 5);
		ctx.drawImage(font, charFromBuf(2), ccb, 5, 5, o.center + 6, ypad, 5, 5);

		for (chn = 0; chn < 6; chn++) {
			pt = player.pattern[pp.ch[chn].pattern];
			dat = pt.data[line];

			for (j = 0; j < 8; j++) {
				x = o.trkOffset       // center + (4 * fontWidth)
				  + chn * o.chnWidth  // channel * ((12 columns + 2 padding) * fontWidth)
				  + o.columns[j];     // column offset premulitplied by fontWidth

				if (update) {
					offs.x[chn][j] = x;

					// overlapping area between channels
					if (!j && chn)
						offs.x[chn - 1][8] = x;
				}

				cc = ccb;
				if (!backup &&
					!(i === half && this.modeEdit) &&
					sel.len && sel.channel === chn &&
					line >= sel.line &&
					line <= (sel.line + sel.len)) {

					if (!j) {
						ctx.fillStyle = '#000';
						ctx.fillRect(x - 3, y, o.selWidth, h);
					}

					cc = 30; // col.combination: 6:WHITE|BLACK
				}
				else if (i === half && this.modeEdit &&
						this.modeEditChannel === chn &&
						this.modeEditColumn === j) {

					// value for statusbar
					status = (j >= 5) ? dat.cmd : 0;

					ctx.fillStyle = '#800';
					if (j)
						ctx.fillRect(x - 1, y,  7, h);
					else
						ctx.fillRect(x - 2, y, 22, h);

					cc = 40; // col.combination: 6:WHITE|DARKRED
				}

				if (line >= pt.end)
					cc += 5; // col.combination to GRAY foreground

				if (j) {
					k = -1;
					switch (j) {
						case 1:
							if (dat.smp)
								k = dat.smp;
							break;

						case 2:
							if (dat.orn_release)
								k = 33; // ('X' - 'A') + 10;
							else if (dat.orn)
								k = dat.orn;
							break;

						case 3:
							if (dat.volume.byte)
								k = dat.volume.L;
							break;

						case 4:
							if (dat.volume.byte)
								k = dat.volume.R;
							break;

						case 5:
							if (dat.cmd || dat.cmd_data)
								k = dat.cmd;
							break;

						case 6:
							if (dat.cmd || dat.cmd_data)
								k = ((dat.cmd_data & 0xf0) >> 4);
							break;

						case 7:
							if (dat.cmd || dat.cmd_data)
								k = (dat.cmd_data & 0x0f);
							break;
					}

					buf = (k < 0) ? '\x7f' : k.toString(36);
					ctx.drawImage(font, charFromBuf(), cc, 5, 5, x, ypad, 5, 5);
				}
				else {
					buf = '---';
					if (dat.release)
						buf = 'R--';
					else if (dat.tone)
						buf = player.tones[dat.tone].txt;

					ctx.drawImage(font, charFromBuf(0), cc, 5, 5, x, ypad, 5, 5);
					ctx.drawImage(font, charFromBuf(1), cc, 5, 5, x + 6, ypad, 5, 5);
					ctx.drawImage(font, charFromBuf(2), cc, 5, 5, x + 12, ypad, 5, 5);
				}
			}
		}

		if (backup) {
			pp = backup.pp;
			line = backup.line;
			backup = void 0;

			ctx.save();
			ctx.fillStyle = 'rgba(255,255,255,.75)';
			ctx.globalCompositeOperation = "xor";
			ctx.fillRect(o.center - 6, ypad, o.lineWidth + 6, 5);
			ctx.restore();
		}
	}

	if (!this.modePlay && this.modeEdit && status !== void 0)
		this.doc.showTracklistStatus(this.modeEditColumn, status);

	if (update) {
		// expand offsets to full canvas width and height
		offs.x[5][8] = w;
		offs.x[0][0] = 0;
		offs.y[i] = y;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateSampleEditor = function (update, limitFrom, limitTo) {
	var o = this.smpornedit,
		sample = this.player.sample[this.workingSample],
		amp = o.amp.ctx,
		noise = o.noise.ctx,
		range = o.range.ctx,
		pixel = amp.getImageData(22, 0, 1, 1),
		color, data,
		half = o.halfing,
		ptr = o.smpeditScroll,
		end = ptr + 64,
		add = o.columnWidth,
		x = o.centering, w = add - 1,
		i, yl, yr, l, r;

	if (limitFrom !== void 0) {
		i = Math.max(ptr, limitFrom);
		x += (i - ptr) * add;
		ptr = i;
	}
	if (limitTo !== void 0)
		end = Math.min(end, ++limitTo);

	for (; ptr < end; ptr++, x += add) {
		if (ptr >= sample.end && !sample.releasable)
			color = '#888';
		else if (sample.loop != sample.end && ptr >= sample.loop && ptr < sample.end)
			color = '#38c';
		else
			color = '#000';

		range.strokeStyle =
		  range.fillStyle =
		  noise.fillStyle =
		  amp.strokeStyle =
		    amp.fillStyle = color;

		data = sample.data[ptr];
		l = data.volume.L;
		r = data.volume.R;
		yl = half - 12;
		yr = half + 5;

		for (i = 0; i < 15; i++, yl -= 9, yr += 9) {
			amp.clearRect(x, yl, w, 8);
			amp.putImageData(pixel, x, yl + 7);

			if (i < l)
				amp.fillRect(x, yl, w, 8);

			amp.clearRect(x, yr, w, 8);
			amp.putImageData(pixel, x, yr);

			if (i < r)
				amp.fillRect(x, yr, w, 8);
		}

		amp.clearRect(x, 292, w, 12);
		amp.strokeRect(x - 0.5, 291.5, w - 1, 12);

		if (data.enable_freq)
			amp.fillRect(x + 1, 293, w - 4, 9);

		for (i = 0, yl = 34; i < 4; i++, yl -= 9) {
			noise.clearRect(x, yl, w, 8);
			noise.putImageData(pixel, x, yl + 7);

			if (data.enable_noise && i <= data.noise_value)
				noise.fillRect(x, yl, w, 8);
		}

		range.clearRect(x, 4, 12, 8);

		if (ptr >= sample.end)
			range.fillRect(x, 12, 12, 1);
		else {
			range.fillRect(x, 10, 12, 3);

			if (sample.loop <= sample.end && ptr === (sample.end - 1)) {
				range.beginPath();
				range.moveTo(x, 10);
				range.lineTo(x + 12, 10);
				range.lineTo(x + 12, 4);
				range.closePath();
				range.fill();
			}
			if (sample.loop < sample.end && ptr === sample.loop) {
				range.beginPath();
				range.moveTo(x, 10);
				range.lineTo(x + 12, 10);
				range.lineTo(x, 4);
				range.closePath();
				range.fill();
			}
		}
	}

	if (update) {
		i = (sample.end - sample.loop);

		$('#txSampleName').val(sample.name);
		$('#scSampleLength').val('' + sample.end);
		$('#scSampleRepeat').val('' + i)
			.trigger('touchspin.updatesettings', { min: 0, max: sample.end });

		if (!i && sample.releasable)
			sample.releasable = false;

		$('#chSampleRelease').prop('checked', sample.releasable);
		$('#chSampleRelease').prop('disabled', !i).parent()[i ? 'removeClass' : 'addClass']('disabled');
	}
};
//---------------------------------------------------------------------------------------
/** Tracker.doc submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.doc = {
	// ajax cache for text documentations:
	txtCache: {},

	i18n: {
		'app.msg.unsaved': 'All unsaved changes in SAA1099Tracker will be lost.',
		'app.smpedit.left': 'LEFT',
		'app.smpedit.right': 'RIGHT',
		'app.filedialog.untitled': 'Untitled',
		'app.filedialog.title.load': 'Open file from storage',
		'app.filedialog.title.save': 'Save file to storage',
		'dialog.file.new.title': 'Create new file...',
		'dialog.file.new.msg': 'Do you really want to clear all song data and lost all of your changes?',
		'dialog.file.open.title': 'Open file...',
		'dialog.file.open.msg': 'You could lost all of your changes! Do you really want to continue?',
		'dialog.file.remove.title': 'Remove file...',
		'dialog.file.remove.msg': 'Do you really want to remove this file from storage?',
		'dialog.pattern.delete.title': 'Delete pattern...',
		'dialog.pattern.delete.msg.used': 'This pattern is used in some positions!\nAre you sure you want to delete it?',
		'dialog.pattern.delete.msg.notlast': 'This is not the last pattern in a row and there is necessary to renumber all of the next patterns in the positions!\n\nPlease, take a note that all of your undo history will be lost because of pattern/position data inconsistency that occurs with this irreversible operation.\n\nDo you really want to continue?',
		'dialog.pattern.delete.msg.sure': 'Are you sure you want to delete this pattern?',
		'dialog.pattern.clean.title': 'Clean pattern...',
		'dialog.pattern.clean.msg': 'Are you sure you want to clean a content of this pattern?',
		'dialog.position.delete.title': 'Delete position...',
		'dialog.position.delete.msg': 'Are you sure you want to delete this position?',
		'dialog.sample.clear.title': 'Clear sample...',
		'dialog.sample.clear.msg': 'Which sample data do you want to clear?',
		'dialog.sample.clear.options': [ 'All', 'Amplitude', 'Noise', 'Pitch-shift', 'Cancel' ],
		'dialog.ornament.clear.title': 'Clear ornament...',
		'dialog.ornament.clear.msg': 'Are you sure you want to clear a content of this ornament?',
		'app.error.ie': 'don\'t be evil,\bstop using IE',
		'app.error.webaudio': 'WebAudio\bnot supported'
	},

	tooltip: {
		'miFileNew'       : 'New',
		'miFileOpen'      : 'Open [Ctrl+O]',
		'miFileSave'      : 'Save [Ctrl+S]',
		'miFileSaveAs'    : 'Save as...',
		'miEditCut'       : 'Cut [Ctrl+X]',
		'miEditCopy'      : 'Copy [Ctrl+C]',
		'miEditPaste'     : 'Paste [Ctrl+V]',
		'miEditClear'     : 'Clear [Ctrl+D]',
		'miEditUndo'      : 'Undo [Ctrl+Z]',
		'miEditRedo'      : 'Redo [Ctrl+Y | Ctrl+Shift+Z]',
		'miStop'          : 'Stop [Esc]',
		'miSongPlay'      : 'Play song [F5]',
		'miSongPlayStart' : 'Play song from start [F6]',
		'miPosPlay'       : 'Play position [F7]',
		'miPosPlayStart'  : 'Play position from start [F8]',
		'miToggleLoop'    : 'Toggle repeat [F11]',
		'miManager'       : 'Track manager [F9]',
		'miPreferences'   : 'Preferences [F10]',
		'miSpecialLogin'  : 'Login to SAA-1099\ncloud for musicians',
		'scOctave'        : 'Base octave [Ctrl+1...Ctrl+8]',
		'scAutoSmp'       : 'Auto-typed sample',
		'scAutoOrn'       : 'Auto-typed ornament',
		'scRowStep'       : 'Row-step in edit mode [- Ctrl+9 | Ctrl+0 +]',
		'btPatternCreate' : 'Create a new pattern\nin length of current',
		'btPatternDelete' : 'Delete the current pattern\n(and renumber others if it isn\'t last one)',
		'btPatternClean'  : 'Clear content of current pattern',
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
		'scPosCurrent'    : 'Actual position to play or edit [- Ctrl+Shift+Left|Right +]',
		'scPosLength'     : 'Current position length',
		'scPosSpeed'      : 'Initial speed of current position',
		'scPosRepeat'     : 'Position number to repeat from',
		'txPosTotal'      : 'Total number of positions',
		'scChnButton'     : 'Mute/Unmute channels [Ctrl+Num1...Ctrl+Num6]',
		'scChnPattern'    : 'Assigned pattern for specific\nchannel in current position',
		'scChnTrans'      : 'Transposition of notes\nin specific channel-pattern',
		'scSampleNumber'  : 'Current sample ID',
		'txSampleName'    : 'Current sample description',
		'scSampleTone'    : 'Base tone and octave\nto test this sample',
		'btSamplePlay'    : 'Play current sample',
		'btSampleStop'    : 'Stop playback [Esc]',
		'btSampleClear'   : 'Clear sample or\npart of sample data [Ctrl+D]',
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
		'btOrnClear'      : 'Clear ornament [Ctrl+D]',
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
		/*  0 */ "NOTE - use alphanumeric keys as two-octave piano, for RELEASE note use [A], [1] or [-] key",
		/*  1 */ "SAMPLE - [0] no change, [1 - V] to change current sample",
		/*  2 */ "ORNAMENT - [0] no change, [1 - F] for ornament, or [X] for release ornament",
		/*  3 */ "VOLUME CHANGE - [0] no change, [1 - F] for volume change in left channel",
		/*  4 */ "VOLUME CHANGE - [0] no change, [1 - F] for volume change in right channel",
		/*  5 */ "COMMAND - [0] no change, [1 - F] to use effect or command",
		/*  6 */ "COMMAND: 1XY - portamento up",
		/*  7 */ "COMMAND: 2XY - portamento down",
		/*  8 */ "COMMAND: 3XY - glissando to given note",
		/*  9 */ "COMMAND: 4XY - vibrato on current note",
		/* 10 */ "COMMAND: 5XY - tremolo on current note",
		/* 11 */ "COMMAND: 6XX - delay ornament",
		/* 12 */ "COMMAND: 7XX - ornament offset",
		/* 13 */ "COMMAND: 8XX - delay sample",
		/* 14 */ "COMMAND: 9XX - sample offset",
		/* 15 */ "COMMAND: AXY - volume slide",
		/* 16 */ "COMMAND: BXX - break current channel-pattern and loop from line",
		/* 17 */ "COMMAND: CXY - special command",
		/* 18 */ "COMMAND: DXX - delay listing on current line",
		/* 19 */ "COMMAND: EXY - soundchip envelope or noise channel control",
		/* 20 */ "COMMAND: FXX - change global speed",
		/* 21 */ "COMMAND 1st parameter: period of change (in ticks)",
		/* 22 */ "COMMAND 2nd parameter: pitch change in period (in cents)",
		/* 23 */ "COMMAND parameter: delay (in ticks)",
		/* 24 */ "COMMAND parameter: offset (in ticks)",
		/* 25 */ "COMMAND 2nd parameter: volume change in period [- 9-F | 1-7 +]",
		/* 26 */ "COMMAND parameter: trackline of current channel-pattern",
		/* 27 */ "COMMAND parameter: [00] disable last command, [XY] false-chord, [F1] swap stereo channels",
		/* 28 */ "COMMAND 1st parameter: [0, 1] enable envelope control, [D] disable, [2] enable noise control",
		/* 29 */ "COMMAND 2nd parameter: [0-F] for envelope shape, [0-4] for noise control",
		/* 30 */ "COMMAND parameter: speed of track listing (01-1F constant, otherwise XY for swing mode)",
		/* 31 */ "COMMAND parameter: none",
	],

	// helper functions for statusbar:
	lastStatus: void 0,
	setStatusText: function (i) {
		var text = this.statusbar[i];

		if (text && i === this.lastStatus)
			return;

		$('#statusbar>p').html(!text ? '' :
			(
				text.replace(/(\[.+?\])/g, '<strong>$1</strong>')
				    .replace(/^([\w ]+?)(\:| \-)/, '<kbd>$1</kbd>$2')
				    .replace(/(\(.+?\))$/, '<em>$1</em>')
			)
		);

		this.lastStatus = i;
	},

	showTracklistStatus: function (col, cmd) {
		var i = col;

		if (col === 5)
			i = cmd + 5;
		else if (col > 5) {
			switch (cmd) {
				case 0x1:
				case 0x2:
				case 0x3:
				case 0x4:
				case 0x5:
					i = (col + 15);
					break;
				case 0x6:
				case 0x8:
				case 0xD:
					i = 23;
					break;
				case 0x7:
				case 0x9:
					i = 24;
					break;
				case 0xA:
					i = (col == 6) ? 21 : 25;
					break;
				case 0xB:
					i = 26;
					break;
				case 0xC:
					i = 27;
					break;
				case 0xE:
					i = (col + 22);
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

	i18nInit: function () {
		Object.keys(this.i18n).forEach(function (idx) {
			var i, p, deepIn,
				value = this[idx],
				path = idx.split('.'),
				len = path.length;

			i = 0;
			deepIn = this;
			while (i < len) {
				p = path[i];
				deepIn[p] = deepIn[p] || {};

				if (++i === len)
					break;
				deepIn = deepIn[p];
			}

			if (typeof value === 'string')
				value = value.replace('...', '\u2026').replace('\b', '<br />');
			deepIn[p] = value;

			delete this[idx];
		}, window.i18n = this.i18n);
	}
};
//---------------------------------------------------------------------------------------
/** Tracker.gui submodule - template loader and element populator with jQuery */
/* global dev, getCompatible, AudioDriver, SyncTimer, Player */
//---------------------------------------------------------------------------------------
Tracker.prototype.populateGUI = function () {
	var app = this;

	var populatedElementsTable = [
		{
			global:   'document',
			method:   'bind',
			param:    'contextmenu',
			handler:  function(e) {
				e.preventDefault();
				return false;
			}
		}, {
			global:   'window',
			method:   'resize',
			handler:  function() {
				var c = 0;

				if (app.activeTab === 0) {
					c = app.tracklist.countTracklines();
					if (c !== app.settings.tracklistLines) {
						app.tracklist.setHeight(c);
						app.updateTracklist(true);
					}
				}
				else if (app.activeTab === 1 && app.smpornedit.initialized) {
					var o = app.smpornedit;

					c = $(o.amp.obj).offset().left;
					o.smpeditOffset.left = c;
				}

				if (!!(c = $('#statusbar').offset().top))
					$('#documodal .modal-body').css('height', (c * 0.9) | 0);
			}
		}, {
			global:   'window',
			method:   'bind',
			param:    'beforeunload',
			handler:  function() {
				if (!dev)
					return i18n.app.msg.unsaved;
			}
		}, {
			global:   'window',
			method:   'bind',
			param:    'keyup keydown',
			handler:  function(e) { return app.handleKeyEvent(e.originalEvent) }
		}, {
			global:   'window',
			method:   'bind',
			param:    'blur',
			handler:  function(e) {
				var i, o = app.globalKeyState;
				for (i in o) if ((i - 0)) {
					delete o[i];
					o.length--;
				}
			}
		}, {
			selector: '[data-tooltip]',
			method:   'each',
			handler:  function(i, el) {
				var data = (el.dataset || $(this).data()).tooltip || '',
					id = data.length ? data : el.id || el.htmlFor || el.name,
					delay = /^mi/.test(id) ? 500 : 2000,
					t = app.doc.tooltip[id];

				if (!t)
					return;

				$(this).tooltip({
					html: true,
					animation: false,
					delay: { "show": delay, "hide": 0 },
					placement: 'auto top',
					trigger: 'hover',
					title: t.replace(/\.{3}/g, '&hellip;')
					        .replace(/\n/g, '<br>')
					        .replace(/(\[.+?\])$/, '<kbd>$1</kbd>')
				});
			}
		}, {
			selector: 'canvas',
			method:   'each',
			handler:  function(i, el) {
				var name = el.className, o = app[name];

				if (name === 'tracklist') {
					o.obj = el;
					o.ctx = el.getContext('2d');
					getCompatible(o.ctx, 'imageSmoothingEnabled', true, false);

					$(this).bind('focus', function(e) {
						if (app.player.position.length && !app.modeEdit)
							app.onCmdToggleEditMode();
					});
				}
				else if (name === 'smpornedit') {
					name = el.id.replace('smpedit_', '');

					o[name].obj = el;
					o[name].ctx = el.getContext('2d');
					getCompatible(o[name].ctx, 'imageSmoothingEnabled', true, false);
				}

				$(this).bind('mousedown mouseup mousemove dblclick mousewheel DOMMouseScroll', function (e) {
					var delta = e.originalEvent.wheelDelta || -e.originalEvent.deltaY || (e.originalEvent.type === 'DOMMouseScroll' && -e.originalEvent.detail);
					if (delta) {
						e.stopPropagation();
						e.preventDefault();

						e.delta = delta;
						e.type = 'mousewheel';
					}

					app.handleMouseEvent(name, o, e);
				});
			}
		}, {
			selector: 'img.pixelfont',
			method:   'load',
			handler:  function(e) { app.initPixelFont(e.target) }
		}, {
			selector: 'img.smpedit',
			method:   'load',
			handler:  function(e) { app.smpornedit.img = e.target }
		}, {
			selector: '#main-tabpanel a[data-toggle="tab"]',
			method:   'on',
			param:    'shown.bs.tab',
			handler:  function(e) {
				app.activeTab = parseInt($(this).data().value, 10);
				$(window).trigger('resize');
			}
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
			handler:  function() { app.ctrlOctave = $(this).val() - 0 }
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
			handler:  function() { app.ctrlSample = parseInt($(this).val(), 32) }
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
			handler:  function() { app.ctrlOrnament = parseInt($(this).val(), 16) }
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
			handler:  function() { app.ctrlRowStep = $(this).val() - 0 }
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
				min: 1, max: Player.maxPatternLen
			}
		}, {
			selector: '#scPattern',
			method:   'change',
			handler:  function() {
				if (app.player.pattern.length <= 1)
					return false;

				app.workingPattern = $(this).val() - 0;
				app.updatePanelPattern();
			}
		}, {
			selector: '#scPatternLen',
			method:   'change',
			handler:  function() {
				var pp = app.player.pattern[app.workingPattern];
				if (app.player.pattern.length <= 1)
					return false;
				else if (app.modePlay) {
					$(this).val(pp.end);
					return false;
				}

				pp.end = $(this).val() - 0;
				app.player.countPositionFrames();
				app.updatePanelPattern();
				app.updateTracklist();
				app.updatePanelInfo();
				app.file.modified = true;
			}
		}, {
			selector: '#scPosCurrent',
			method:   'change',
			handler:  function() {
				if (!app.player.position.length)
					return false;
				else if (app.modePlay) {
					$(this).val(app.player.currentPosition + 1);
					return false;
				}

				var pos = $(this).val() - 1;

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
			handler:  function() {
				var pp = app.player.currentPosition,
					pos = app.player.position[pp];

				if (!app.player.position.length)
					return false;
				else if (app.modePlay) {
					$(this).val(pos.length);
					return false;
				}

				pos.length = $(this).val() - 0;

				if (app.player.currentLine >= pos.length)
					app.player.currentLine = pos.length - 1;

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
			handler:  function() {
				var pp = app.player.currentPosition,
					pos = app.player.position[pp];

				if (!app.player.position.length)
					return false;
				else if (app.modePlay) {
					$(this).val(pos.speed);
					return false;
				}

				pos.speed = $(this).val() - 0;

				app.player.countPositionFrames(pp);
				app.updateTracklist();
				app.updatePanelInfo();
				app.file.modified = true;
			}
		}, {
			selector: '#scPosRepeat',
			method:   'change',
			handler:  function() {
				if (!app.player.position.length)
					return false;
				else if (app.modePlay) {
					$(this).val(app.player.repeatPosition + 1);
					return false;
				}
				else
					app.player.repeatPosition = $(this).val() - 1;

				app.file.modified = true;
			}
		}, {
			selector: 'input[id^="scChnPattern"]',
			method:   'change',
			handler:  function(e) {
				var el = e.target,
					pp = app.player.currentPosition,
					chn = el.id.substr(-1) - 1,
					pos = app.player.position[pp] || app.player.nullPosition,
					val = el.value - 0,
					prev = pos.ch[chn].pattern;

				if (!app.player.position.length)
					return false;
				else if (app.modePlay) {
					el.value = prev;
					return false;
				}

				pos.ch[chn].pattern = val;

				if (app.workingPattern === val || app.workingPattern === prev)
					app.updatePanelPattern();

				app.player.countPositionFrames(pp);
				app.updateTracklist();
				app.updatePanelInfo();
				app.file.modified = true;
			}
		}, {
			selector: 'input[id^="scChnTrans"]',
			method:   'each',
			handler:  function(i, el) {
				$(this).TouchSpin({
					initval: '0',
					min: -24, max: 24
				}).change(function(e) {
					var el = e.target,
						chn = el.id.substr(-1) - 1,
						pos = app.player.position[app.player.currentPosition];

					if (!app.player.position.length)
						return false;
					else if (app.modePlay) {
						el.value = pos.ch[chn].pitch;
						return false;
					}
					else
						pos.ch[chn].pitch = el.value - 0;

					app.file.modified = true;
				});
			}
		}, {
			selector: 'input[id^="scChnButton"]',
			method:   'each',
			handler:  function(i, el) {
				var cc = el.id.substr(-1);
				$(this).bootstrapToggle({
					on: cc,
					off: cc,
					onstyle: 'default',
					offstyle: 'default',
					size: 'mini',
					width: 58
				}).change(function(e) {
					var el = e.target;
					app.player.rtSong.muted[el.value - 1] = !el.checked;
				});
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
			handler:  function() {
				app.workingSample = parseInt($(this).val(), 32);
				app.workingOrnTestSample = app.workingSample;
				app.updateSampleEditor(true);
				app.smpornedit.updateSamplePitchShift();
				$('#sbSampleScroll').scrollLeft(0);
				$('#scOrnTestSample').val(app.workingOrnTestSample.toString(32).toUpperCase());
			}
		}, {
			selector: '#scOrnTestSample',
			method:   'change',
			handler:  function() { app.workingOrnTestSample = parseInt($(this).val(), 32) }
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
			handler:  function() {
				app.workingOrnament = parseInt($(this).val(), 16);
				app.smpornedit.updateOrnamentEditor(true);
			}
		}, {
			selector: '#txSampleName',
			method:   'change',
			handler:  function(e) {
				app.player.sample[app.workingSample].name = e.target.value;
				app.file.modified = true;
			}
		}, {
			selector: '#txOrnName',
			method:   'change',
			handler:  function(e) {
				app.player.ornament[app.workingOrnament].name = e.target.value;
				app.file.modified = true;
			}
		}, {
			selector: '#scSampleTone,#scOrnTone',
			method:   'each',
			handler:  function(i, el) {
				var cc = 'tx' + el.id.substr(2);
				$(this).TouchSpin({
					initval: app.workingSampleTone,
					min: 1, max: 96
				}).change(function(e) {
					var el = e.target, val = el.value - 0;
					app.workingSampleTone = val;
					$('#scSampleTone,#scOrnTone')
						.val(val.toString())
						.prev().val(app.player.tones[val].txt);
				}).wrapAll('<div id="' + cc + '"/>')
				  .removeAttr('style')
				  .prop('readonly', true)
				  .clone(false)
				  .removeAttr('id')
				  .removeAttr('tabindex')
				  .insertBefore(this);

				$(this).trigger('change');
			}
		}, {
			selector: '#sbSampleScroll',
			method:   'scroll',
			handler:  function(e) {
				app.smpornedit.smpeditScroll = 0 | ((e.target.scrollLeft/ 1000) * 64);
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
			handler:  function(e) {
				var sample = app.player.sample[app.workingSample];
				if (sample.end !== sample.loop)
					sample.releasable = e.target.checked;
				app.updateSampleEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#scSampleLength',
			method:   'change',
			handler:  function(e) {
				var sample = app.player.sample[app.workingSample],
					offset = parseInt(e.target.value, 10) - sample.end,
					looper = (sample.loop += offset);

				sample.end += offset;
				sample.loop = ((sample.end - looper) < 0) ? 0 : looper;

				app.updateSampleEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#scSampleRepeat',
			method:   'change',
			handler:  function(e) {
				var sample = app.player.sample[app.workingSample],
					value = parseInt(e.target.value, 10);

				sample.loop = sample.end - value;
				app.updateSampleEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#fxOrnChords button',
			method:   'each',
			handler:  function() {
				var id = $(this).text(),
					chord = app.smpornedit.chords[id],
					seqtxt = JSON.stringify(chord.sequence, null, 1).replace(/^\[|\]$|\s+/g, '');

				$(this).tooltip({
					html: true,
					animation: false,
					trigger: 'hover',
					delay: { "show": 500, "hide": 0 },
					title: chord.name + '<kbd>{ ' + seqtxt + ' }</kbd>'
				}).click(function() {
					var orn = app.player.ornament[app.workingOrnament],
						i, l = chord.sequence.length;

					orn.data.fill(0);
					orn.name = chord.name;
					orn.loop = 0;
					orn.end  = l;

					for (i = 0; i < l; i++)
						orn.data[i] = chord.sequence[i];

					app.smpornedit.updateOrnamentEditor(true);
					app.file.modified = true;
				});
			}
		}, {
			selector: '#scOrnLength',
			method:   'change',
			handler:  function(e) {
				var orn = app.player.ornament[app.workingOrnament],
					offset = parseInt(e.target.value, 10) - orn.end,
					looper = (orn.loop += offset);

				orn.end += offset;
				orn.loop = ((orn.end - looper) < 0) ? 0 : looper;

				app.smpornedit.updateOrnamentEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#scOrnRepeat',
			method:   'change',
			handler:  function(e) {
				var orn = app.player.ornament[app.workingOrnament],
					value = parseInt(e.target.value, 10);

				orn.loop = orn.end - value;
				app.smpornedit.updateOrnamentEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#sample-tabpanel a[data-toggle="tab"]',
			method:   'on',
			param:    'show.bs.tab',
			handler:  function(e) {
				if (e.target.id === 'tab-pitchshift' && e.relatedTarget.id === 'tab-sampledata')
					app.smpornedit.updateSamplePitchShift();
			}
		}, {
			selector: 'a[id^="mi"]', // all menu items
			method:   'click',
			handler:  function() {
				var fn,
					name = this.id.replace(/^mi/, 'onCmd');

				if (app[name])
					app[name]();
				else if (name === 'onCmdFileSaveAs')
					app.onCmdFileSave(true);
				else if (this.id.match(/^miFileImportDemo/)) {
					fn = $(this).data().filename;
					if (!fn || app.modePlay || app.globalKeyState.lastPlayMode)
						return false;
					app.file.loadDemosong(fn);
				}
				else if (this.id.match(/^miHelp/)) {
					fn = $(this).data().filename;
					if (!fn)
						return false;
					app.onCmdShowDocumentation(fn);
				}
				else
					return false;
			}
		}, {
			selector: 'button[id^="btPattern"]',
			method:   'click',
			handler:  function() {
				var name = this.id.replace(/^btPattern/, 'onCmdPat');
				if (app[name])
					app[name]();
			}
		}, {
			selector: 'button[id^="btPos"]',
			method:   'click',
			handler:  function() {
				var name = this.id.replace(/^bt/, 'onCmd');
				if (app[name])
					app[name]();
			}
		}, {
			selector: 'button[id^="btSample"]',
			method:   'click',
			handler:  function() {
				var name = this.id.replace('btSample', 'onCmdSmp');
				if (name.match(/Stop$/))
					return app.onCmdStop();
				if (app[name])
					app[name]();
			}
		}, {
			selector: 'button[id^="btOrn"]',
			method:   'click',
			handler:  function() {
				var name = this.id.replace('btOrn', 'onCmdOrn');
				if (name.match(/Stop$/))
					return app.onCmdStop();
				if (app[name])
					app[name]();
			}
		}
	];

//---------------------------------------------------------------------------------------
	console.log('Tracker.gui', 'Populating elements...');

	populatedElementsTable.forEach(function (o) {
		var data = o.handler || o.data;
		var selector = o.selector || (o.global && window[o.global]);

		if (selector && o.method) {
			if (o.param)
				$(selector)[o.method](o.param, data);
			else
				$(selector)[o.method](data);
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.initializeGUI = function () {
	var app = this, i = 0;

	var initSteps = [
		function () {
			if (app.smpornedit.initialized || !app.smpornedit.img || app.activeTab === 1)
				return false;

			console.log('Tracker.gui', 'Force initialization of Sample/Ornament editors...');
			$('#tab-smpedit').tab('show');
			return true;
		},
		function () {
			if (app.smpornedit.initialized || !app.smpornedit.img || app.activeTab !== 1)
				return false;

			app.smpornedit.init();
			$('#tab-ornedit').tab('show');
			return true;
		},
		function () {
			if (app.tracklist.initialized || !app.pixelfont.ctx || app.activeTab === 0)
				return false;

			console.log('Tracker.gui', 'Force initialization of Tracklist editor by triggering of window resize event...');
			$('#tab-tracker').tab('show');
			$(window).trigger('resize');
			return true;
		},
		function () {
			if (app.tracklist.initialized || !app.pixelfont.ctx || app.activeTab)
				return false;

			console.log('Tracker.gui', 'Redrawing all tracklist elements and canvas...');
			app.updatePanels();
			app.updateTracklist(true);
			app.tracklist.initialized = true;
			return true;
		},
		function () {
			if (app.loaded)
				return false;

			console.log('Tracker.gui', 'Starting audio playback and initializing 50Hz refresh timer...');
			AudioDriver.play();
			SyncTimer.start(app.baseTimer.bind(app));
			return true;
		},
		function () {
			if (app.loaded)
				return false;

			console.log('Tracker.gui', 'Initialization done, everything is ready!');
			document.body.className = '';
			return (app.loaded = true);
		}
	];

	var initFn = function () {
		var fn = initSteps[i];
		if (!!fn) {
			if (fn())
				i++;
			setTimeout(initFn, 250);
		}
	};

	initFn();
};
//---------------------------------------------------------------------------------------
