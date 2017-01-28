/*
 * Developer's extensions of native console logger.
 */
if (window.dev) {
	console.info((function() {
		window.dev = {
			logAll: true,
			logHotkeys: false
		};

		const originalLogger = console.log;
		console.log = function() {
			if (window.dev.logAll && arguments.length) {
				let a = [].slice.call(arguments);
				if (a.length > 1 && (typeof a[0] === 'string' && typeof a[1] === 'string'))
					a.splice(0, 2, ('%c[' + a[0] + ']%c ' + a[1]), 'color:steelblue', 'color:inherit');

				this.apply(console, a);
			}
		}.bind(originalLogger);

		console.logHotkey = function() {
			if (window.dev.logHotkeys && arguments.length)
				originalLogger.apply(console, [ '%cTrackerHotkey: ' + arguments[0], 'color:tan' ].concat([].slice.call(arguments, 1)));
		};

		return '### DEVELOPER MODE ACTIVE ###';
	})());
}
//---------------------------------------------------------------------------------------
