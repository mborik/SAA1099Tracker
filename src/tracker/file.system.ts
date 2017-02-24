/*
 * File API helper functions for manupulation with native files form user's disk.
 * Copyright (c) 2015-2017 Martin Borik <mborik@users.sourceforge.net>
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
/// <reference path="../index.d.ts" />
//---------------------------------------------------------------------------------------
declare type multitype = string | Uint8Array | Uint8ClampedArray | ArrayBuffer;
//---------------------------------------------------------------------------------------
class FileSystem {
	private _input: JQuery;
	private _link: JQuery;

	constructor() {
		this._input = $('#fsFileLoad');
		this._link = $('#fsFileSave');
	}

	public load(binary: boolean, fileExt: string): JQueryDeferred<multitype> {
		let dfd = $.Deferred<multitype>();

		console.log('FileSystem', 'Querying user to select %s file of type "%s"...',
			(binary ? 'binary' : 'text'), fileExt);

		let obj = this._input;
		obj.attr({ accept: fileExt }).on('change', (e: JQueryInputEventObject) => {
			e.stopPropagation();
			obj.off();

			let input = <HTMLInputElement> e.target;
			let reader = getCompatible(window, 'FileReader', true);
			let file = input.files[0];

			if (file && reader) {
				try {
					console.log('FileSystem', 'FileReader loading %o...', file);

					reader.onload = (evt: any) => {
						let res = evt.target.result;
						dfd.resolve(binary ? (new Uint8Array(res)) : res);
					};

					if (binary) {
						reader.readAsArrayBuffer(file);
					}
					else {
						reader.readAsText(file);
					}
				}
				catch (ex) {
					console.log('FileSystem', 'FileReader load error: %o', ex);
				}
				finally {
					input.value = '';
				}
			}
		});

		obj[0].click();

		return dfd;
	}

	public save(data: multitype, fileName: string, mimeType?: string) {
		let blob: Blob;
		let url: string;

		try {
			console.log('FileSystem', 'Preparing file output to Blob...');

			if (typeof data === 'string') {
				blob = new Blob([ data ], {
					type: mimeType || 'text/plain',
					endings: 'native'
				});
			}
			else {
				blob = new Blob(<any> data, {
					type: mimeType || 'application/octet-stream'
				});
			}
		}
		catch (ex) {
			console.log('FileSystem', 'Blob feature missing [%o], fallback to BlobBuilder...', ex);

			try {
				let bb: MSBlobBuilder = getCompatible(window, 'BlobBuilder', true);
				bb.append(data);
				blob = bb.getBlob(mimeType);
			}
			catch (ex2) {
				console.log('FileSystem', 'BlobBuilder feature missing [%o]', ex2);
				blob = undefined;
			}
		}

		if (blob) {
			try {
				console.log('FileSystem', 'Conversion of Blob to URL Object...');
				url = getCompatible(window, 'URL').createObjectURL(blob) + '';
			}
			catch (ex) {
				console.log('FileSystem', 'URL feature for Blob missing [%o]', ex);
				url = undefined;
			}
		}

		if (!url) {
			if (typeof data === 'string') {
				console.log('FileSystem', 'Invalid URL, fallback to BASE64 output...');
				url = 'data:' + mimeType + ';base64,' + btoa(data);
			}
			else {
				console.log('FileSystem', 'Invalid URL, no fallback available...');
				return;
			}
		}

		let obj = this._link;
		obj.attr({
			href: url,
			target: '_blank',
			download: fileName
		});

		console.log('FileSystem', 'Querying user to download file "%s" from url %o...',
			fileName, url);

		obj[0].click();

		setTimeout(() => {
			obj.attr({ href: null, target: null, download: null });
		}, 128);
	}
}
//---------------------------------------------------------------------------------------
