/*!
 * SAA1099Tracker - Dynamically generated theme props
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

import { Colors } from '@blueprintjs/core';

const defaultTheme = (darkTheme?: boolean) => ({
	color: {
		blue: darkTheme ? Colors.BLUE1 : Colors.BLUE5,
		green: darkTheme ? Colors.GREEN1 : Colors.GREEN5,
		border: darkTheme ? Colors.DARK_GRAY2 : Colors.LIGHT_GRAY3,
		grayPanel: darkTheme ? Colors.DARK_GRAY3 : Colors.LIGHT_GRAY5,
		gray: Colors.GRAY3
	},
	tracker: {
		maxWidth: '70rem'
	},
	flexboxgrid: {
		gridSize: 16,
		gutterWidth: .4,
		outerMargin: 0,
		mediaQuery: 'only screen',
		container: {
			sm: 42, // rem
			md: 56, // rem
			lg: 70 // rem
		},
		breakpoints: {
			xs: 0, // em
			sm: 48, // em
			md: 64, // em
			lg: 80 // em
		}
	}
});

export default defaultTheme;
