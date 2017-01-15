/**
 * This global method is trying to find cross-browser compatible property of testing
 * or experimental features of the modern browsers.
 * @param base {any} Parent object or container which should had that property;
 * @param prop {string} Property name to find (future/final name from specification);
 * @param ret {boolean} If property is constructor and we want a new object of this
 *               type or if we want to set value of this property, set this to true;
 * @param value {any} Value which we want to set, or fallback function - polyfill;
 */
declare function getCompatible(base: any, prop: string, ret?: boolean, value?: any): any;
//---------------------------------------------------------------------------------------
declare interface browser {
	isOpera: boolean;
	isFirefox: boolean;
	isSafari: boolean;
	isChrome: boolean;
	isIE: boolean;
}
declare interface Number {
	abs(): number;
	toWidth(width?: number): string;
	toHex(width?: number): string;
	toTimeString(): string;
}
