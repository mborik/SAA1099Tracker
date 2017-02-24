/**
 * Precise multimedia timer based on requestAnimationFrame.
 */
(<any>window).SyncTimer = (function() {
	const that = this;

	let lastT = 0;
	let enabled = false;
	let timer = getCompatible(window, 'requestAnimationFrame', false,
		// polyfill
		((callback: FrameRequestCallback) => {
			setTimeout(() => callback(performance.now()), that.interval );
		})
	);

	this.callback = function(){};
	this.interval = 20; // 50Hz

	this.start = function(callback?: (() => void), interval?: number, startImmediately?: boolean): boolean {
		if (enabled) {
			return false;
		}

		if (typeof callback === 'function') {
			that.callback = callback;
		}
		if (Number.isFinite(interval)) {
			that.interval = interval;
		}
		enabled = !!startImmediately;

		if (enabled) {
			timer(that.loop);
		}

		return true;
	};

	this.pause = function() {
		enabled = false;
	};
	this.resume = function() {
		enabled = true;
		timer(that.loop);
	};

	this.loop = function(t: number) {
		if (enabled) {
			timer(that.loop);
		}
		if ((t - lastT) < that.interval) {
			return false;
		}

		that.callback();
		lastT = t;
		return true;
	};

	return this;
}).call(function SyncTimer(){});
//---------------------------------------------------------------------------------------
