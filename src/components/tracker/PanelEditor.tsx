/*!
 * SAA1099Tracker - Editor panel on Tracker tab
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
import { Col } from 'react-styled-flexboxgrid';

import { actionChangeEditorControl } from '../../actions/tracker';
import { ReducerStoreState } from '../../reducers';

import PanelBase from '../partials/PanelBase';
import PanelCtrlRow from '../partials/PanelCtrlRow';
import RadixIntegerInput from '../partials/RadixIntegerInput';


interface EditorCtrlState {
	ctrlOctave: number;
	ctrlSample: number;
	ctrlOrnament: number;
	ctrlRowStep: number;
}

const PanelEditor: React.FunctionComponent = () => {
	const dispatch = useDispatch();

	const state = useSelector<ReducerStoreState, EditorCtrlState | undefined>(({ tracker }) => {
		if (tracker != null) {
			return {
				ctrlOctave: tracker.ctrlOctave,
				ctrlSample: tracker.ctrlSample,
				ctrlOrnament: tracker.ctrlOrnament,
				ctrlRowStep: tracker.ctrlRowStep
			};
		}
	});

	const handleValueChange = useCallback((key: keyof EditorCtrlState, value: number) =>
		dispatch(actionChangeEditorControl({ key, value })),
	[ dispatch ]);

	return state ? (
		<PanelBase title="Editor:">
			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlOctave">Octave:</label>
				</Col>
				<Col xs={8}>
					<RadixIntegerInput
						fill={true}
						id="ctrlOctave"
						value={state.ctrlOctave}
						onValueChange={value => handleValueChange('ctrlOctave', value)}
						min={1} max={8}
					/>
				</Col>
			</PanelCtrlRow>

			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlSample">AutoSmp:</label>
				</Col>
				<Col xs={8}>
					<RadixIntegerInput
						fill={true}
						id="ctrlSample"
						value={state.ctrlSample}
						onValueChange={value => handleValueChange('ctrlSample', value)}
						radix={32}
						min={0} max={31}
					/>
				</Col>
			</PanelCtrlRow>

			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlOrnament">AutoOrn:</label>
				</Col>
				<Col xs={8}>
					<RadixIntegerInput
						fill={true}
						id="ctrlOrnament"
						value={state.ctrlOrnament}
						onValueChange={value => handleValueChange('ctrlOrnament', value)}
						radix={16}
						min={0} max={15}
					/>
				</Col>
			</PanelCtrlRow>

			<PanelCtrlRow splitAbove={true}>
				<Col xs={8}>
					<label htmlFor="ctrlRowStep">RowStep:</label>
				</Col>
				<Col xs={8}>
					<RadixIntegerInput
						fill={true}
						id="ctrlRowStep"
						value={state.ctrlRowStep}
						onValueChange={value => handleValueChange('ctrlRowStep', value)}
						min={0} max={8}
					/>
				</Col>
			</PanelCtrlRow>
		</PanelBase>
	) : null;
};

export default PanelEditor;
