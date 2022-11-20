/**
 * SAA1099Tracker: Binary utilities.
 * Copyright (c) 2017-2019 Roman Borik <pmd85emu@gmail.com>
 * Copyright (c) 2022 Martin Borik <martin@borik.net>
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

export const equalsByteArrays = (
  b1: Uint8Array, off1: number,
  b2: Uint8Array, off2: number,
  len: number
): boolean => {
  if (len <= 0 || off1 < 0 || off1 >= b1.length || off2 < 0 || off2 >= b2.length) {
    throw 'Argument(s) len, off1 or off2 is out of array ranges.';
  }
  if (off1 + len > b1.length || off2 + len > b2.length) {
    return false;
  }
  for (let i: number = 0; i < len; i++) {
    if (b1[off1 + i] !== b2[off2 + i]) {
      return false;
    }
  }
  return true;
};

export const stringToBytes = (str: string, asciiOnly?: boolean): Uint8Array =>
  Uint8Array.from(
    str.split('')
      .map(c => c.charCodeAt(0))
      .filter(c => asciiOnly ? (c >= 32 && c <= 126) : true)
  );

export const bytesToString = (bytes: Uint8Array): string =>
  String.fromCharCode.apply(null, bytes);

export const writeWordLE = (bytes: Uint8Array, offset: number, word: number) => {
  bytes[offset] = (word & 0xFF);
  bytes[offset + 1] = ((word >>> 8) & 0xFF);
};
