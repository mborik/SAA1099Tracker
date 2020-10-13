/*!
 * SAA1099Tracker - Navbar group - File operations
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

import React from 'react';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { NavButtonTooltiped } from '../partials/NavButtonTooltiped';

const FileOps: React.FunctionComponent = () => (
	<Navbar.Group>
		<NavButtonTooltiped
			key="miFileNew"
			icon="folder-new"
			tooltip="New"
		/>
		<NavButtonTooltiped
			key="miFileOpen"
			icon="folder-open"
			tooltip={<>
				<label>Open</label>
				<KeyCombo combo="mod+O" />
			</>}
		/>
		<NavButtonTooltiped
			key="miFileSave"
			icon="folder-shared-open"
			tooltip={<>
				<label>Save</label>
				<KeyCombo combo="mod+S" />
			</>}
		/>
		<NavButtonTooltiped
			key="miFileSaveAs"
			icon="cloud-upload"
			tooltip="Save as&hellip;"
		/>

		<Navbar.Divider />
	</Navbar.Group>
);

export default FileOps;
