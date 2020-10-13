/*!
 * SAA1099Tracker - Development mode test and custom logger
 * Copyright (c) 2020 Martin Borik <mborik@users.sourceforge.net>
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

export const isDev = (
	/[?&#]dev/.test(window.location.search || window.location.hash) ||
	!process.env.NODE_ENV ||
	process.env.NODE_ENV === 'development'
);

/**
 * Log message onto console when development mode is active.
 * First param
 * @param {string} section
 * @param {...any[]} args
 */
export function devLog(section: string, ...args: any[]): void {
	if (!isDev) {
		return;
	}

	if (section && args.length > 0 && typeof args[0] === 'string') {
		args.splice(0, 1, `%c[${section}]%c ${args[0]}`, 'color:steelblue', 'color:inherit');
	} else {
		args.unshift(section);
	}

	// eslint-disable-next-line
	console.log.apply(console, args);
}
