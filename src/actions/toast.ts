/*!
 * SAA1099Tracker - Toast message box renderer and reducer action
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

import { IToastProps, Position, Toaster } from '@blueprintjs/core';
import { NavbarAction, NavbarReducerAction } from './navbar';


const toast = Toaster.create({
	canEscapeKeyClear: false,
	position: Position.BOTTOM,
});

export const showToast = (opt: IToastProps) => {
	toast.clear();
	toast.show(opt);
};

export const actionToast = (toastParams: IToastProps): NavbarReducerAction => ({
	type: NavbarAction.Toast,
	payload: {
		intent: 'warning',
		icon: 'warning-sign',
		message: 'something happen!?',
		...toastParams
	}
});
