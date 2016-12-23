/*
 * Player: Ornaments class definition.
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
class pOrnament {
	name: string = '';
	data: Int8Array = new Int8Array(256);
	loop: number = 0;
	end: number = 0;

	/**
	 * Export ornament data to array of readable strings.
	 * We going backward from the end of ornament and unshifting array because of pack
	 * reasons when "pack" param is true and then only meaningful data will be stored.
	 */
	export(pack: boolean = true): string[] {
		let arr: string[] = [],
			i: number,
			k: any;

		for (i = 255; i >= 0; i--) {
			k = (0 | this.data[i]);

			if (pack && !arr.length && !k)
				continue;

			arr.unshift(((k < 0) ? '-' : '+') + k.toWidth(2));
		}

		return arr;
	}

	/**
	 * Parse ornament data from array of signed values stored in simple string.
	 */
	parse(arr: string[]) {
		for (let i = 0; i < 256; i++)
			this.data[i] = parseInt(arr[i], 10) || 0;
	}
}
//---------------------------------------------------------------------------------------
