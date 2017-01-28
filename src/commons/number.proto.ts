/**
 * Number, the global object prototype will be extended
 * (okay okay, monkey-patched) with some handy functions...
 */
Object.defineProperties(Number.prototype, {
// fastest absolute integer value helper...
	'abs': {
		enumerable: true,
		value: function() {
			let a = this.valueOf(), s = a >> 31;
			return (a ^ s) - s;
		}
	},
// align absolute decimal integer value to exact character width with zeroes from left...
	'toWidth': {
		enumerable: true,
		value: function(width?: number) {
			var a = '' + this.abs();
			return ('0000000000' + a).substr(-Math.max(width || 0, a.length));
		}
	},
// align absolute integer value to hexadecimal string with exact character width...
	'toHex': {
		enumerable: true,
		value: function(width?: number) {
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
