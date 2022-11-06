/**
 * SAA1099Tracker: Precise multimedia timer.
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

/**
 * Precise multimedia timer based on requestAnimationFrame.
 */
class SyncTimer {
  #lastT = 0;
  #enabled = false;

  callback: () => void = () => {};
  interval: number = 20; // 50Hz

  start(callback?: (() => void), interval?: number, startImmediately?: boolean): boolean {
    if (this.#enabled) {
      return false;
    }

    if (typeof callback === 'function') {
      this.callback = callback;
    }
    if (typeof interval === 'number') {
      this.interval = interval;
    }

    this.#enabled = !!startImmediately;
    if (this.#enabled) {
      requestAnimationFrame(this.loop.bind(this));
    }

    return true;
  }

  pause() {
    this.#enabled = false;
  }
  resume() {
    this.#enabled = true;
    requestAnimationFrame(this.loop.bind(this));
  }

  loop(t: number) {
    if (this.#enabled) {
      requestAnimationFrame(this.loop.bind(this));
    }
    if ((t - this.#lastT) < this.interval) {
      return false;
    }

    this.callback();
    this.#lastT = t;
    return true;
  }
}
//---------------------------------------------------------------------------------------
export default ((window as any).SyncTimer = new SyncTimer);
