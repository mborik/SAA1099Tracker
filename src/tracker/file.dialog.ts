/**
 * SAA1099Tracker: Tracker file dialog sub-class.
 * Copyright (c) 2015-2022 Martin Borik <martin@borik.net>
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

import { debounce } from 'typescript-debounce-decorator';
import { i18n } from './doc';
import { STMFile, StorageDialogExchange, StorageItem } from './file';
import Tracker from '.';


export class FileDialog {
  constructor(
    private $app: Tracker,
    private $parent: STMFile,
    private $storage: StorageDialogExchange) {}

  public load(): boolean {
    return this._openDialog('load');
  }
  public save(): boolean {
    return this._openDialog('save');
  }

  private _obj: JQuery = null;
  private _saveFlag: boolean = false;
  private _selectedItem: StorageItem = null;

  @debounce(250)
  private _defaultHandler(e: JQueryEventObject): boolean {
    e.stopPropagation();

    const dlg: this = (e.data && e.data.$scope);
    const file = dlg.$parent;
    const globalKeyState = dlg.$app.globalKeyState;
    const selectedItem = dlg._selectedItem;

    if (dlg._saveFlag) {
      const fileName = dlg._obj.find('.file-name>input').val();
      const duration = $('#stInfoPanel u:eq(3)').text();

      file.saveFile(fileName, duration,
        (selectedItem && selectedItem.id) || undefined);
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

  private _itemClickHandler(e: JQueryEventObject): boolean {
    e.stopPropagation();

    const dlg: this = (e.data && e.data.$scope);
    const storageMap = dlg.$storage.data;
    const selectedItem = (dlg._selectedItem =
      (e.data && typeof e.data.id === 'number' && e.data.id > 0) ?
        storageMap[e.data.id] : null);

    if (e.pageX === 0 && e.pageY === 0) { // on enter keypress
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

  private _removeHandler(e: JQueryEventObject): boolean {
    e.stopPropagation();

    const dlg: this = (e.data && e.data.$scope);
    const storageMap = dlg.$storage.data;
    const selectedItem = dlg._selectedItem;
    const mode = (dlg._saveFlag ? 'save' : 'load');

    if (!selectedItem) {
      return false;
    }

    $('#dialog').confirm({
      title: i18n.dialog.file.remove.title,
      text: i18n.dialog.file.remove.msg,
      buttons: 'yesno',
      style: 'danger',
      callback: (btn) => {
        if (btn !== 'yes') {
          return;
        }

        const index = storageMap.findIndex(obj =>
          (obj.storageId === selectedItem.storageId));

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
  //---------------------------------------------------------------------------------------
  private _openDialog(mode: string): boolean {
    const tracker = this.$app;
    const file = this.$parent;
    const storageMap = this.$storage.data;

    const titles = i18n.app.filedialog.title;
    const handleArgs = { $scope: this };

    this._saveFlag = (mode === 'save');
    this._obj = $('#filedialog');

    if (!titles[mode] || (!this._saveFlag && !storageMap.length)) {
      return false;
    }

    tracker.globalKeyState.inDialog = true;
    this._obj.on('show.bs.modal', $.proxy(() => {
      const usage = this.$storage.usage;

      this._selectedItem = null;

      this._obj.addClass(mode)
        .before($('<div/>')
          .addClass('modal-backdrop in').css('z-index', '1030'));

      this._obj.find('.modal-title').text(titles[mode] + '\u2026');
      this._obj.find('.file-name>input').val(file.getFixedFileName());
      this._obj.find('.storage-usage i').text(usage.bytes + ' bytes used');
      this._obj.find('.storage-usage .progress-bar').css('width', usage.percent + '%');
      this._obj.find('.btn-success').on('click', handleArgs, this._defaultHandler);

      const el = this._obj.find('.file-list').empty();
      const span = $('<span/>');
      const cell = $('<button class="cell"/>');

      storageMap.forEach((obj, i) => {
        const d: string = (new Date(obj.timeModified * 1000))
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
