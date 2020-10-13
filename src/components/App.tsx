/*!
 * SAA1099Tracker - Application entry point
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

import * as React from 'react';
import { Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';

import { ReducerStoreProps } from '../reducers';
import DynamicThemeProvider from './partials/DynamicThemeProvider';
import Navigation from './Navigation';
import Main from './Main';
import Footer from './Footer';


@HotkeysTarget
class App extends React.Component<ReducerStoreProps> {
	render() {
		return <DynamicThemeProvider>
			<Navigation />
			<Main />
			<Footer />
		</DynamicThemeProvider>;
	}

	renderHotkeys() {
		return (
			<Hotkeys>
				<Hotkey
					global={true}
					combo="esc"
					label="Stop"
					onKeyDown={() => {}}
				/>
			</Hotkeys>
		);
	}
}

/*
 * This is workaround to strange issue with HotkeysTarget decorator from
 * https://github.com/palantir/blueprint/issues/2972#issuecomment-441978641
 */
function AppWrapper() {} // tslint:disable-line no-empty
AppWrapper.prototype = Object.create(App.prototype);
const AppContainer = HotkeysTarget(AppWrapper as any);
export default AppContainer;
