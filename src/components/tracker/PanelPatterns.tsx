/*!
 * SAA1099Tracker - Patterns panel on Tracker tab
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
import { Button } from '@blueprintjs/core';

import { actionChangeEditorControl } from '../../actions/tracker';
import { ReducerStoreState } from '../../reducers';

import PanelBase from '../partials/PanelBase';
import PanelCtrlRow from '../partials/PanelCtrlRow';
import RadixIntegerInput from '../partials/RadixIntegerInput';
import { MAX_PATTERN_LEN } from '../../core/player/globals';


interface PatternsState {
	noPatterns: boolean;
	workingPattern: number;
	workingPatternLen: number;
	workingPatternUsage: number;
	totalPatterns: number;
	minPatternValue: number;
	minPatternLength: number;
}

const PanelPatterns: React.FunctionComponent = () => {
	const dispatch = useDispatch();

	const state = useSelector<ReducerStoreState, PatternsState | undefined>(({ tracker }) => {
		if (tracker?.player?.pattern) {
			const totalPatterns = tracker.player.pattern.length || 0;
			const hasPatterns = (totalPatterns > 1);
			const workingPattern = hasPatterns ? (tracker.workingPattern || 1) : 0;
			const workingPatternLen = tracker.player.pattern[workingPattern]?.end || 0;
			const workingPatternUsage = workingPattern && tracker.player.countPatternUsage(workingPattern);

			return {
				noPatterns: !hasPatterns,
				workingPattern,
				workingPatternLen,
				workingPatternUsage,
				totalPatterns: hasPatterns ? (totalPatterns - 1) : 0,
				minPatternValue: hasPatterns ? 1 : 0,
				minPatternLength: workingPattern ? 1 : 0,
			};
		}
	});

	const handleWorkingPatternChange = useCallback((value: number) =>
		dispatch(actionChangeEditorControl({ key: 'workingPattern', value })),
	[ dispatch ]);

	return state ? (
		<PanelBase title="Patterns:">
			<PanelCtrlRow>
				<Col xs={6} className="split">
					<Button text="Create" fill={true} />
				</Col>
				<Col xs={4}>
					<label htmlFor="workingPattern">Pattern:</label>
				</Col>
				<Col xs={6}>
					<RadixIntegerInput
						fill={true}
						id="workingPattern"
						disabled={state.noPatterns}
						min={state.minPatternValue}
						max={state.totalPatterns}
						value={state.workingPattern}
						onValueChange={value => handleWorkingPatternChange(value)}
					/>
				</Col>
			</PanelCtrlRow>

			<PanelCtrlRow>
				<Col xs={6} className="split">
					<Button
						text="Delete"
						fill={true}
						disabled={state.noPatterns}
					/>
				</Col>
				<Col xs={4}>
					<label htmlFor="workingPatternLen">Length:</label>
				</Col>
				<Col xs={6}>
					<RadixIntegerInput
						fill={true}
						id="workingPatternLen"
						disabled={state.noPatterns}
						min={state.minPatternLength}
						max={MAX_PATTERN_LEN}
						value={state.workingPatternLen}
						onValueChange={() => null}
					/>
				</Col>
			</PanelCtrlRow>

			<PanelCtrlRow>
				<Col xs={6} className="split">
					<Button
						text="Clean"
						fill={true}
						disabled={state.noPatterns}
					/>
				</Col>
				<Col xs={4}>
					<label htmlFor="workingPatternUsage">Used:</label>
				</Col>
				<Col xs={6}>
					<input
						className="bp3-input bp3-fill"
						type="text"
						readOnly={true}
						disabled={state.noPatterns}
						value={state.workingPatternUsage}
					/>
				</Col>
			</PanelCtrlRow>

			<PanelCtrlRow splitAbove={true}>
				<Col xs={6} className="split">
					<Button
						icon="function"
						rightIcon="caret-down"
						fill={true}
						disabled={state.noPatterns}
					/>
				</Col>
				<Col xs={4}>
					<label htmlFor="workingPatternUsage">Total:</label>
				</Col>
				<Col xs={6}>
					<input
						className="bp3-input bp3-fill"
						type="text"
						readOnly={true}
						disabled={state.noPatterns}
						value={state.totalPatterns}
					/>
				</Col>
			</PanelCtrlRow>
		</PanelBase>
	) : null;
};

export default PanelPatterns;
