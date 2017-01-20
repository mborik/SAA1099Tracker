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
(function (window) {
	/**
	 * This global method is trying to find cross-browser compatible property of testing
	 * or experimental features of the modern browsers.
	 * @param base {any} Parent object or container which should had that property;
	 * @param prop {string} Property name to find (future/final name from specification);
	 * @param ret {boolean} If property is constructor and we want a new object of this
	 *               type or if we want to set value of this property, set this to true;
	 * @param value {any} Value which we want to set, or fallback function - polyfill;
	 */
	window.getCompatible = function(base, prop, ret, value) {
		var obj = base[prop], c, n,
			alts = [ 'moz', 'webkit', 'o', 'Moz', 'WebKit', 'O' ];
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

		if (obj && ret)
			return (value === void 0) ? (new base[prop]) : (base[prop] = value);
		else if (obj)
			return obj;
		else if (typeof value === 'function')
			return value;
	};

	/**
	 * Precise multimedia timer based on requestAnimationFrame,
	 * feature of modern browsers.
	 */
	window.SyncTimer = (function() {
		var that = this,
			lastT = 0, enabled = false,
			timer = getCompatible(window, 'requestAnimationFrame', false,
						function(callback) { setTimeout(function() { callback(performance.now()) }, that.interval )});

		this.callback = function(){};
		this.interval = 20; // 50Hz

		this.start = function(callback, interval, startImmediately) {
			if (enabled)
				return false;

			if (callback !== void 0 && typeof callback === 'function')
				that.callback = callback;
			if (Number.isFinite(interval))
				that.interval = interval;
			enabled = !!startImmediately;

			if (enabled)
				timer(that.loop);
			return true;
		};

		this.pause = function() { enabled = false };
		this.resume = function() {
			enabled = true;
			timer(that.loop);
		};

		this.loop = function(t) {
			if (enabled)
				timer(that.loop);
			if ((t - lastT) < that.interval)
				return false;
			that.callback();
			lastT = t;
		};

		return this;
	}).call(function SyncTimer(){});

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

		var originalLogger = console.log;
		console.log = function() {
			if (window.dev.logAll && arguments.length) {
				var a = Array.prototype.slice.call(arguments, 0);
				if (a.length > 1 && (typeof a[0] === 'string' && typeof a[1] === 'string'))
					a.splice(0, 2, ('%c[' + a[0] + ']%c ' + a[1]), 'color:steelblue', 'color:inherit');

				this.apply(console, a);
			}
		}.bind(originalLogger);

		console.logHotkey = function() {
			if (window.dev.logHotkeys && arguments.length)
				originalLogger.apply(console, ['%cTrackerHotkey: ' + arguments[0], 'color:tan' ].concat(Array.prototype.slice.call(arguments, 1)));
		};

		return '### DEVELOPER MODE ACTIVE ###';
	})());
}(window));
//---------------------------------------------------------------------------------------
/**
 * Number, the global object prototype will be extended with some handy functions...
 */
Object.defineProperties(Number.prototype, {
// fastest absolute integer value helper...
	'abs': {
		enumerable: true,
		value: function() {
			var a = this.valueOf(), s = a >> 31;
			return (a ^ s) - s;
		}
	},
// align absolute decimal integer value to exact character width with zeroes from left...
	'toWidth': {
		enumerable: true,
		value: function(width) {
			var a = '' + this.abs();
			return ('0000000000' + a).substr(-Math.max(width || 0, a.length));
		}
	},
// align absolute integer value to hexadecimal string with exact character width...
	'toHex': {
		enumerable: true,
		value: function(width) {
			var a = this.abs().toString(16);
			return ('00000000' + a).substr(-Math.max(width || 0, a.length));
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
//---------------------------------------------------------------------------------------
