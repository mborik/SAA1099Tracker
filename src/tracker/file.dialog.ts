/**
 * SAA1099Tracker: Tracker file dialog sub-class.
 * Copyright (c) 2015-2025 Martin Borik <martin@borik.net>
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
import { STMFile, StorageItem } from './file';
import Tracker from '.';


export class FileDialog {
  constructor(
    private _app: Tracker,
    private _parent: STMFile) {}

  public load(): boolean {
    return this._openDialog('load');
  }
  public save(): boolean {
    return this._openDialog('save');
  }

  private _obj: JQuery = null;
  private _saveFlag: boolean = false;
  private _storageMap: StorageItem[] = [];
  private _selectedItem: StorageItem = null;

  @debounce(250)
  private _defaultHandler(e: JQueryEventObject): boolean {
    e.stopPropagation();

    const dlg: this = (e.data && e.data.$scope);
    const file = dlg._parent;
    const keys = dlg._app.globalKeyState;
    const selectedItem = dlg._selectedItem;

    if (dlg._saveFlag) {
      const fileName = dlg._obj.find('#txFileName').val();

      file.saveFile(
        fileName,
        file.duration,
        (selectedItem && selectedItem.id) || undefined
      );
    }
    else {
      if (!selectedItem) {
        return false;
      }

      file.loadFile(selectedItem.id);
    }

    keys.inDialog = false;
    dlg._obj.modal('hide');
    return true;
  }

  private _itemClickHandler(e: JQueryEventObject): boolean {
    e.stopPropagation();

    const dlg: this = (e.data && e.data.$scope);
    const selectedItem = (dlg._selectedItem =
      (e.data && typeof e.data.id === 'number') ?
        dlg._storageMap[e.data.id] : null);

    if (e.pageX === 0 && e.pageY === 0) { // on enter keypress
      return dlg._defaultHandler(e);
    }

    dlg._obj.find('.file-list>button').removeClass('selected');

    if (selectedItem) {
      $(this).addClass('selected');
    }
    if (dlg._saveFlag) {
      if (selectedItem) {
        dlg._obj.find('#txFileName').val(selectedItem.fileName);
      }

      dlg._obj.find('.file-remove').prop('disabled', !(selectedItem?.id > 0));
    }

    return true;
  }

  private _removeHandler(e: JQueryEventObject): boolean {
    e.stopPropagation();

    const dlg: this = (e.data && e.data.$scope);
    const file = dlg._parent;
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

        if (selectedItem.id > 0) {
          file.storageMap.delete(selectedItem.id);
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
    const tracker = this._app;
    const file = this._parent;
    const keys = tracker.globalKeyState;

    const titles = i18n.app.filedialog.title;
    const handleArgs = { $scope: this };

    this._saveFlag = (mode === 'save');
    this._obj = $('#filedialog');

    this._storageMap = Array
      .from(this._parent.storageMap.values())
      .filter(({ id }) => tracker.settings.showAutosaveInFileDialog ? true : id > 0)
      .sort((a, b) => (b.timeModified - a.timeModified));

    if (!titles[mode] || (!this._saveFlag && !this._storageMap.length)) {
      return false;
    }

    const dialog = this._obj;
    dialog.on('show.bs.modal', () => {
      const { bytes, percent } = this._parent.storagetUsageSummary();

      dialog.addClass(mode)
        .before($('<div/>')
          .addClass('modal-backdrop in').css('z-index', '1030'));

      dialog.find('.modal-title').text(titles[mode] + '\u2026');
      dialog.find('#txFileName').val(file.getFixedFileName());
      dialog.find('.storage-usage i').text(bytes + ' bytes used');
      dialog.find('.storage-usage .progress-bar').css('width', percent + '%');
      dialog.find('.btn-success').on('click', handleArgs, this._defaultHandler);

      const el = dialog.find('.file-list').empty();
      const span = $('<span/>');
      const cell = $('<button class="cell"/>');

      this._selectedItem = null;
      this._storageMap.forEach((obj, i) => {
        const d: string = (new Date(obj.timeModified * 1000))
          .toISOString().replace(/^([\d\-]+)T([\d:]+).+$/, '$1 $2');

        cell.clone()
          .append(span.clone().addClass('filename').text(obj.fileName))
          .append(span.clone().addClass('fileinfo').text(d + ' | duration: ' + obj.duration))
          .prop('tabindex', 300)
          .appendTo(el)
          .on('click focus', Object.assign({ id: i }, handleArgs), this._itemClickHandler)
          .on('dblclick', handleArgs, this._defaultHandler);
      });

      dialog.find('.file-open,.file-save').on('click', handleArgs, this._defaultHandler);

      if (this._saveFlag) {
        dialog.find('.file-list').on('click', handleArgs, this._itemClickHandler);
        dialog.find('.file-remove').on('click', handleArgs, this._removeHandler);
      }
    }).on('shown.bs.modal', () => {
      keys.inDialog = true;
      dialog.find(this._saveFlag
        ? '#txFileName'
        : '.file-list>button:first-child').focus();

    }).on('hide.bs.modal', () => {
      dialog.removeClass(mode).prev('.modal-backdrop').remove();
      dialog.off().find('.file-list').off().empty();
      dialog.find('.modal-footer>.btn').off();
      keys.inDialog = false;

    }).modal({
      show: true,
      backdrop: false
    });

    return true;
  }
}
