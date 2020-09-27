// fastest absolute integer value helper
export function abs(input: number): number {
	let s = input >> 31;
	return (input ^ s) - s;
};

// align absolute decimal integer value to exact character width with zeroes from left
export function toWidth(input: number, width?: number): string {
	let a = '' + abs(input);
	return ('0000000000' + a).substr(-Math.max(width || 0, a.length));
};

// align absolute integer value to hexadecimal string with exact character width
export function toHex(input: number, width?: number): string {
	let a = abs(input).toString(16);
	return ('00000000' + a).substr(-Math.max(width || 0, a.length));
};

export function toTimeString(a: number): string {
	let m = abs(a / 60), s = abs(a % 60);
	return ('0' + m).substr(-2) + ':' + ('0' + s).substr(-2);
};
