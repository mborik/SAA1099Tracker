/**
 * This global method is trying to find cross-browser compatible property of testing
 * or experimental features of the modern browsers.
 * @param base {any} Parent object or container which should had that property;
 * @param prop {string} Property name to find (future/final name from specification);
 * @param ret {boolean} If property is constructor and we want a new object of this
 *               type or if we want to set value of this property, set this to true;
 * @param value {any} Value which we want to set, or fallback function - polyfill;
 */
(<any>window).getCompatible = (base: any, prop: string, ret?: boolean, value?: any) => {
	const alts = [ 'moz', 'webkit', 'o', 'Moz', 'WebKit', 'O' ];
	let obj = base[prop];

	if (!obj) {
		let c = prop[0];
		if (c >= 'a' && c <= 'z') {
			prop = c.toUpperCase() + prop.substr(1);
		}

		for (let i = 0, l = alts.length; i < l; i++) {
			let name = alts[i] + prop;
			if (!!(obj = base[name])) {
				prop = name;
				break;
			}
		}
	}

	if (obj && ret) {
		return (value === undefined) ? (new base[prop]) : (base[prop] = value);
	}
	else if (obj) {
		return obj;
	}
	else if (typeof value === 'function') {
		return value;
	}
};
//---------------------------------------------------------------------------------------
