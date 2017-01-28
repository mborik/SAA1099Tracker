window.browser = (window => {
	let opera = (!!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0);
	return {
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
})(window);
//---------------------------------------------------------------------------------------
