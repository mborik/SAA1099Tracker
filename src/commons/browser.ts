/**
 * SAA1099Tracker: Browser compatibility tests.
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
//---------------------------------------------------------------------------------------
interface Browser {
  isOpera: boolean;
  isFirefox: boolean;
  isIE: boolean;
}
//---------------------------------------------------------------------------------------
export const browser = (window => <Browser>{
  // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
  isOpera: (!!(window as any).opera || navigator.userAgent.indexOf(' OPR/') >= 0),
  // Firefox 1.0+
  isFirefox: (typeof (window as any).InstallTrigger !== 'undefined'),
  // At least IE6
  isIE: (/*@cc_on!@*/false || !!(window.document as any).documentMode)
})(window);
