/*!
 * SAA1099Tracker - Number utilitie
 * Copyright (c) 2020 Martin Borik <mborik@users.sourceforge.net>
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

// fastest absolute integer value helper
export function abs(input: number): number {
  const s = input >> 31;
  return (input ^ s) - s;
}

// align absolute decimal integer value to exact character width with zeroes from left
export function toWidth(input: number, width?: number): string {
  const a = '' + abs(input);
  return ('0000000000' + a).substr(-Math.max(width || 0, a.length));
}

// align absolute integer value to hexadecimal string with exact character width
export function toHex(input: number, width?: number): string {
  const a = abs(input).toString(16);
  return ('00000000' + a).substr(-Math.max(width || 0, a.length));
}

export function toTimeString(a: number): string {
  const m = abs(a / 60), s = abs(a % 60);
  return ('0' + m).substr(-2) + ':' + ('0' + s).substr(-2);
}
