/*!
 * SAA1099Tracker - Main components wrapper
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

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Grid } from 'react-styled-flexboxgrid';

import SongHeader from './tracker/SongHeader';
import TabPanel from './partials/TabPanel';

import { actionTrackerInit } from '../actions/tracker';


const MainWrapper = styled(Grid).attrs(() => ({
	tagName: 'main',
	role: 'main',
	className: 'bp3-fill'
}))`
	display: flex;
	flex-flow: column nowrap;
	flex: 1 0 auto;
	margin: 1rem auto;
`;

const Main: React.FunctionComponent = () => {
	const dispatch = useDispatch();

	useEffect(() =>
		dispatch(actionTrackerInit()) as any,
	[ dispatch ]);


	return (
		<MainWrapper>
			<SongHeader />
			<TabPanel />
		</MainWrapper>
	);
};

export default Main;
