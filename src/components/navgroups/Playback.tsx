/*!
 * SAA1099Tracker - Navbar group - Playback operations
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

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { actionToggleRepeat } from '../../actions/tracker';
import { ReducerStoreState } from '../../reducers';
import { NavButtonTooltiped } from '../partials/NavButtonTooltiped';


const Playback: React.FunctionComponent = () => {
	const dispatch = useDispatch();
	const repeat = useSelector<ReducerStoreState>(state => state?.tracker?.player.loopMode) as boolean;

	const toggleRepeat = useCallback(() =>
		dispatch(actionToggleRepeat()),
	[ dispatch ]);

	return (
		<Navbar.Group>
			<NavButtonTooltiped
				key="miStop"
				icon="stop"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Stop</label>
					<KeyCombo combo="esc" />
				</>}
			/>
			<NavButtonTooltiped
				key="miSongPlay"
				icon="play"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Play song</label>
					<KeyCombo combo="F5" />
				</>}
			/>
			<NavButtonTooltiped
				key="miSongPlayStart"
				icon="fast-forward"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Play song from start</label>
					<KeyCombo combo="F6" />
				</>}
			/>
			<NavButtonTooltiped
				key="miPosPlay"
				icon="step-forward"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Play position</label>
					<KeyCombo combo="F7" />
				</>}
			/>
			<NavButtonTooltiped
				key="miPosPlayStart"
				icon="play"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Play position from start</label>
					<KeyCombo combo="F8" />
				</>}
			/>
			<NavButtonTooltiped
				key="miToggleLoop"
				style={repeat ? {} : { transform: 'scale(-1, 1)' }}
				icon={repeat ? 'refresh' : 'outdated'}
				intent={repeat ? 'success' : 'none'}
				minimal={true}
				tooltip={<>
					<label>Toggle repeat</label>
					<KeyCombo combo="F11" />
				</>}

				onClick={toggleRepeat}
			/>

			<Navbar.Divider />
		</Navbar.Group>
	);
};

export default Playback;
