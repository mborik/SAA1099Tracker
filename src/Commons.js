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
	 * @param base {string} Parent object or container which should had that property;
	 * @param prop {string} Property name to find (future/final name from specification);
	 * @param ret {bool} If property is constructor and we want a new object of this type
	 *                   or if we want to set value of this property, set this to true;
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
	}).call(function SyncTimer(){});

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

		var originalLogger = console.log;
		console.log = function() {
			if (window.dev.logAll && arguments.length) {
				var a = Array.prototype.slice.call(arguments, 0);
				if (a.length > 1 && (typeof a[0] === 'string' && typeof a[1] === 'string'))
					a.splice(0, 2, ('%c[' + a[0] + ']%c ' + a[1]), 'color:blue', 'color:initial');

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
 * jQuery plugin: Confirm dialog based on Bootstrap modal dialog
 * - some predefined confirm button groups: "okcancel", "yesno"
 * - customizable buttons to own group with names, styles and callbacks for each
 * - global callback which returns button ID or its number in sequence
 */
(function($) {
	$.fn.confirm = function(options) {
		var modal = this,
			opts = $.extend({}, $.fn.confirm.defaults, options),
			predefs = $.fn.confirm.predefinedButtonGroups,
			buttons = opts.buttons,
			modalStyle = opts.style || opts.class,
			modalContent = this.find('.modal-content'),
			modalTitle = modalContent.find('.modal-title'),
			modalBody = modalContent.find('.modal-body'),
			modalFooter = modalContent.find('.modal-footer').empty(),
			btnDefault = -1, btnCancel = -1;

		modal.on('show.bs.modal', function(e) {
			if (typeof modalStyle === 'string')
				modalContent.addClass(modalStyle);

			modalTitle.text(opts.title);
			modalBody.text(opts.text);

			// convert buttons group identifier to predefined button group array...
			if (typeof buttons === 'string')
				buttons = (predefs[buttons] || predefs['okcancel']);

			$.each(buttons, function(i) {
				if (this.default)
					btnDefault = i;
				if (this.cancel)
					btnCancel = i;
			});

			if (btnDefault < 0)
				btnDefault = 0;
			if (btnCancel < 0)
				btnCancel = buttons.length - 1;

			if (modalFooter.length) {
				$.each(buttons, function (i, btn) {
					var el = $('<button type="button"/>'),
						btnStyle = btn.style || btn.class || 'btn-default',
						caption = btn.caption || btn.text,
						btnText = (caption || (btn.id && $.camelCase('-' + btn.id)) || 'Button'),
						data = {
							order: i,
							id: (btn.id || (caption && caption.toLowerCase()) || ('btn' + i))
						};

					if (typeof btn.callback === 'function')
						data.cb = btn.callback;

					// apply button bootstrap style and fill in text content...
					if (!btnStyle.startsWith('btn-'))
						btnStyle = 'btn-' + btnStyle;
					el.addClass('btn ' + btnStyle)
						.text(btnText)
						.attr('tabindex', i + 1001);

					el.appendTo(modalFooter).click(function(e) {
						modal.result = data;
						modal.modal('hide', e);
					});

					if (btnCancel === i)
						modal.result = data;
				});
			}
		}).on('shown.bs.modal', function() {
			$(this)
				.find('.modal-footer')
				.contents()
				.eq(btnDefault)
				.focus();

		}).on('hide.bs.modal', function() {
			var o = modal.result || { id: 'none' };
			delete modal.result;

			if (o.cb)
				o.cb(o.id, o.order, o);
			opts.callback(o.id, o.order, o);

			modal.off('show.bs.modal shown.bs.modal hide.bs.modal');
			modalTitle.empty();
			modalBody.empty();
			modalFooter.empty();
		}).modal({
			show: true,
			backdrop: 'static'
		});

		return this;
	};

	$.fn.confirm.defaults = {
		title: 'Question...',
		text: 'Are you sure?',
		buttons: 'yesno',
		callback: function(){}
	};

	$.fn.confirm.predefinedButtonGroups = {
		'yesno': [
			{ id: 'yes', caption: 'Yes' },
			{ id: 'no', caption: 'No' }
		],
		'okcancel': [
			{ id: 'ok', caption: 'OK', style: 'btn-primary' },
			{ id: 'cancel', caption: 'Cancel' }
		]
	};
}(jQuery));
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
//---------------------------------------------------------------------------------------
