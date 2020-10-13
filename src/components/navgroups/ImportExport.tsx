/*!
 * SAA1099Tracker - Navbar group - Import/Export
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
import { useDispatch } from 'react-redux';
import { Button, Menu, MenuDivider, MenuItem, Navbar, Popover } from '@blueprintjs/core';
import { actionTrackerLoadDemosong } from '../../actions/tracker';

import demosongs from '../../params/demosongs';

const ImportExport: React.FunctionComponent = () => {
	const dispatch = useDispatch();

	const handleClickLoadDemosong = useCallback(demosong =>
		dispatch(actionTrackerLoadDemosong(demosong.title, demosong.url)),
	[ dispatch ]);


	return (
		<Navbar.Group>
			<Popover key="miFileImport" minimal={true} position="bottom-left">
				<Button minimal={true} icon="import" rightIcon="caret-down" text="Import" />
				<Menu>
					<MenuItem
						key="miFileImportSTMF"
						text={<>Import native song format <i>(STMF)</i>&hellip;</>}
					/>
					<MenuDivider />
					<MenuItem key="miFileImportPT2" text="ProTracker II module&hellip;" />
					<MenuItem key="miFileImportETrk" text="E-Tracker module&hellip;" />
					<MenuDivider />
					<MenuItem key="miFileImportDemosong" text="Demosong">
						{demosongs.map((demosong, index) => (
							<MenuItem
								key={`miFileImportDemo${index + 1}`}
								text={<>{demosong.title} <i>({demosong.author})</i></>}
								onClick={() => handleClickLoadDemosong(demosong)}
							/>
						))}
					</MenuItem>
				</Menu>
			</Popover>

			<Popover key="miFileExport" minimal={true} position="bottom-left">
				<Button minimal={true} icon="export" rightIcon="caret-down" text="Export" />
				<Menu>
					<MenuItem
						key="miFileExportSTMF"
						text={<>Export to native song format <i>(STMF)</i>&hellip;</>}
					/>
					<MenuDivider />
					<MenuItem key="miFileCompile" text="Binary compilation&hellip;" />
				</Menu>
			</Popover>

			<Navbar.Divider />
		</Navbar.Group>
	);
};

export default ImportExport;
