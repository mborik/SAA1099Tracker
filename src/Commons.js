/*!
 * Commons: Common functions and helpers.
 * Copyright (c) 2016 Martin Borik <mborik@users.sourceforge.net>
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
(function(window) {
	window.getCompatible = function(base, prop, retnew, fallback) {
		var obj = base[prop], c, n,
			alts = ['moz', 'webkit', 'o', 'ms', 'Moz', 'WebKit', 'O', 'MS'];
		if (!obj) {
			c = prop[0];
			if (c >= 'a' && c <= 'z')
				prop = c.toUpperCase() + prop.substr(1);

			for (c = 0; c < alts.length; c++)
				if (obj = base[alts[c] + prop])
					break;
		}

		if (obj && retnew) {
			if (!(n = obj.name || obj.constructor.name)) {
				c = obj.toString();
				if ((n = c.match(/^function (\w+)\(/)) || (n = c.match(/^\[object (\w+)]$/)))
					n = n[1];
			}

			return new base[n];
		}
		else if (obj)
			return obj;
		else if (fallback)
			return fallback;
	};

	// compatibility fallback hooks
	if (!('now' in window.Date))
		Date.now = function() { return new Date().getTime() };

	if (!('performance' in window))
		window.performance = {};
	if (!('now' in window.performance)) {
		var d = Date.now();
		if (window.performance.timing && window.performance.timing.navigationStart)
			d = window.performance.timing.navigationStart;

		window.performance.now = function now() { return Date.now() - d }
	}
}(window));

var SyncTimer = (function() {
	this.callback = function(){};
	this.interval = 10; // 100Hz

	var that = this,
		dummy = function(callback) { setTimeout(function() { callback(performance.now()) }, that.interval )},
		timer = getCompatible(window, 'requestAnimationFrame', false, dummy),
		lastT = 0, enabled = false;

	this.start = function(callback, interval) {
		if (enabled)
			return false;

		if (callback !== void 0)
			this.callback = callback;
		if (interval !== void 0)
			this.interval = interval;

		enabled = true;
		timer(function(t) {
			timer(that.loop);
			lastT = t;
		});

		return true;
	}

	this.end = function() { enabled = false }

	this.loop = function(t) {
		if (enabled)
			timer(this.loop);
		if ((t - lastT) < this.interval)
			return false;
		this.callback();
		lastT = t;
	}

	return this;
})();
