/*!
 * Commons: Common functions and helpers.
 * Copyright (c) 2015 Martin Borik <mborik@users.sourceforge.net>
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

			for (c = 0; c < alts.length; c++) {
				n = alts[c] + prop;
				if (!!(obj = base[n])) {
					prop = n;
					break;
				}
			}
		}

		if (obj && retnew)
			return new base[prop];
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

		window.performance.now = function now() { return Date.now() - d };
	}

	// browser detection:
	window.browser = (function(window) {
		var opera = (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0),
			browser = {
				// Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
				isOpera: opera,
				// Firefox 1.0+
				isFirefox: (typeof InstallTrigger !== 'undefined'),
				// At least Safari 3+
				isSafari: (Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0),
				// Chrome 1+
				isChrome: (!!window.chrome && !opera),
				// At least IE6
				isIE: (/*@cc_on!@*/false || !!document.documentMode)
			};

		return browser;
	})(window);

	// developer's extensions
	if (window.dev) console.info((function() {
		window.dev = {
			logAll: true,
			logHotkeys: false
		};

		console.log = function() {
			if (window.dev.logAll && arguments.length) {
				var a = Array.prototype.slice.call(arguments, 0);
				if (a.length > 1 && (typeof a[0] === 'string' && typeof a[1] === 'string'))
					a.splice(0, 2, ('%c[' + a[0] + ']%c ' + a[1]), 'color:blue', 'color:initial');

				this.apply(console, a);
			}
		}.bind(console.log);

		console.logHotkey = function() {
			if (window.dev.logHotkeys && arguments.length)
				console.log.apply(console, ['%cTrackerHotkey: ' + arguments[0], 'color:tan' ].concat(Array.prototype.slice.call(arguments, 1)));
		};

		return '### DEVELOPER MODE ACTIVE ###';
	})());
}(window));

var SyncTimer = (function() {
	this.callback = function(){};
	this.interval = 10; // 100Hz

	var that = this,
		timer = getCompatible(window, 'requestAnimationFrame', false, function(callback) { setTimeout(function() { callback(performance.now()) }, that.interval )}),
		lastT = 0, enabled = false;

	this.start = function(callback, interval) {
		if (enabled)
			return false;

		if (callback !== void 0)
			that.callback = callback;
		if (interval !== void 0)
			that.interval = interval;

		enabled = true;
		timer(that.loop);

		return true;
	};

	this.pause = function() { enabled = false };
	this.resume = function() { enabled = true };

	this.loop = function(t) {
		if (enabled)
			timer(that.loop);
		if ((t - lastT) < that.interval)
			return false;
		that.callback();
		lastT = t;
	};

	return this;
})();

Object.defineProperties(Number.prototype, {
// fastest absolute integer value helper...
	'abs': {
		enumerable: true,
		value: function() {
			var a = this.valueOf(), s = a >> 31;
			return (a ^ s) - s;
		}
	},
// align value to exact character width with zeroes from left...
	'toWidth': {
		enumerable: true,
		value: function(width) {
			var a = '' + this.abs();
			return ('0000000000' + a).substr(-Math.max(width || 0, a.length));
		}
	},
// format number of seconds to time string MM:SS...
	'toTimeString': {
		enumerable: true,
		value: function() {
			var a = this.valueOf(), m = (a / 60).abs(), s = (a % 60).abs();
			return ('0' + m).substr(-2) + ':' + ('0' + s).substr(-2);
		}
	}
});
