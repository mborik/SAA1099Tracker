/**
 * SAA1099Tracker: CLI tool command line arguments.
 * Copyright (c) 2025 Martin Borik <martin@borik.net>
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

export const cliCmdLineArgs = [{
  name: 'help',
  alias: 'h',
  type: Boolean,
  group: 'general',
  defaultValue: false,
}, {
  name: 'version',
  alias: 'v',
  type: Boolean,
  group: 'general',
  defaultValue: false,
}, {
  name: 'input',
  alias: 'i',
  type: String,
  group: 'file',
}, {
  name: 'output',
  alias: 'o',
  type: String,
  group: 'file',
}, {
  name: 'force',
  alias: 'f',
  type: Boolean,
  group: 'file',
  defaultValue: false,
}, {
  name: 'format',
  alias: 't',
  type: String,
  group: 'general',
  defaultValue: 'mp3',
}, {
  name: 'sample-rate',
  alias: 's',
  type: Number,
  group: 'audio',
  defaultValue: 44100,
}, {
  name: 'bit-depth',
  alias: 'b',
  type: Number,
  group: 'audio',
  defaultValue: 16,
}, {
  name: 'quality',
  alias: 'q',
  type: Number,
  group: 'audio',
  defaultValue: 256,
}, {
  name: 'mono',
  alias: 'm',
  type: Boolean,
  group: 'audio',
  defaultValue: false,
}];
