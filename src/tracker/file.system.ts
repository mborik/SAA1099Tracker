/**
 * SAA1099Tracker: File API helper functions for manupulation with uploads & downloads.
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
//---------------------------------------------------------------------------------------

import { devLog } from '../commons/dev';


export type multitype = string | Uint8Array;
export type binarytype = { data: Uint8Array; fileName: string };

export class FileSystem {
  private _input: JQuery<HTMLInputElement>;
  private _link: JQuery;

  constructor() {
    this._input = $('#fsFileLoad');
    this._link = $('#fsFileSave');
  }

  public load(binary: boolean, fileExt: string): Promise<multitype | binarytype> {
    return new Promise((resolve, reject) => {
      devLog('Tracker.file',
        `Querying user to select ${binary ? 'binary' : 'text'} file of type "${fileExt}"...`);

      const obj = this._input;
      obj.attr({ accept: fileExt }).on('change', (e: JQueryInputEventObject) => {
        e.stopPropagation();
        obj.off();

        const input = <HTMLInputElement> e.target;
        const reader = new FileReader;
        const [file] = input.files;

        if (!(file && reader)) {
          return reject('File not found!');
        }

        try {
          devLog('Tracker.file', 'FileReader loading %o...', file);

          reader.onload = () => {
            resolve(
              binary ? {
                data: (new Uint8Array(reader.result as ArrayBuffer)),
                fileName: file.name
              } : (reader.result as string)
            );
          };

          if (binary) {
            reader.readAsArrayBuffer(file);
          }
          else {
            reader.readAsText(file);
          }
        }
        catch (ex) {
          devLog('Tracker.file', 'FileReader load error: %o', ex);
          reject("Can't read a file!");
        }
        finally {
          input.value = '';
        }
      });

      (obj[0] as HTMLInputElement).click();
    });
  }

  public save(data: multitype, fileName: string, mimeType?: string) {
    let blob: Blob;
    let url: string;

    try {
      devLog('Tracker.file', 'Preparing file output to Blob...');

      if (typeof data === 'string') {
        blob = new Blob([ data ], {
          type: mimeType || 'text/plain',
          endings: 'native'
        });
      }
      else {
        blob = new Blob([ data ], {
          type: mimeType || 'application/octet-stream'
        });
      }
    }
    catch (ex) {
      devLog('Tracker.file', 'Blob feature missing [%o]...', ex);
    }

    if (blob) {
      try {
        devLog('Tracker.file', 'Conversion of Blob to URL Object...');
        url = URL.createObjectURL(blob);
      }
      catch (ex) {
        devLog('Tracker.file', 'URL feature for Blob missing [%o]', ex);
        return;
      }
    }

    const obj = this._link;
    obj.attr({
      href: url,
      target: '_blank',
      download: fileName
    });

    devLog('Tracker.file', 'Querying user to download file "%s" from url %o...',
      fileName, url);

    (obj[0] as HTMLAnchorElement).click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      obj.attr({ href: null, target: null, download: null });
    }, 1024);
  }
}
//---------------------------------------------------------------------------------------
