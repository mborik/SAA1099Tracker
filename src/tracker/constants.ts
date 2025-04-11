/**
 * SAA1099Tracker: Tracker constants.
 * Copyright (c) 2022-2025 Martin Borik <martin@borik.net>
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

export default {
  TRACKER_SETTINGS_KEY: 'saa1099-tracker-settings',
  COMPILER_SETTINGS_KEY: 'saa1099-compiler-settings',

  MIMETYPE_STMF: 'text/x-saa1099tracker',
  MIMETYPE_VGM: 'audio/x-vgz',
  MIMETYPE_TEXT: 'text/plain',

  AUTOSAVE_FILENAME: 'AUTOSAVE',
  LOCALSTORAGE_ASSUMED_SIZE: 2 ** 21,

  CURRENT_FILE_VERSION: '1.2',
  CURRENT_PLAYER_MAJOR_VERSION: 1
};
