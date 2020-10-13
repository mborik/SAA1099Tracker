/*!
 * SAA1099Tracker - General reducer
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

import { NavbarAction, NavbarReducerAction } from '../actions/navbar';
import { showToast } from '../actions/toast';

export interface NavbarReducerState {
	darkTheme: boolean;
	repeatMode: boolean;
}

const defaultState: NavbarReducerState = {
	darkTheme: false,
	repeatMode: true
};

export default (state = defaultState, action: NavbarReducerAction): NavbarReducerState => {
	switch (action.type) {
		case NavbarAction.ToggleTheme: {
			state.darkTheme = !state.darkTheme;
			document.body.className = state.darkTheme ? 'bp3-dark' : '';
			break;
		}

		case NavbarAction.ToggleRepeat: {
			state.repeatMode = !state.repeatMode;
			break;
		}

		case NavbarAction.Toast: {
			showToast(action.payload);
		}
	}

	return state;
};
