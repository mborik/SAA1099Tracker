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
import { MAX_PATTERN_LEN } from '../../core/player/globals';
import { ReducerStoreState } from '../../reducers';

import PanelBase from '../partials/PanelBase';
import PanelCtrlRow from '../partials/PanelCtrlRow';
import RadixIntegerInput from '../partials/RadixIntegerInput';


interface PatternsState {
	noPatterns: boolean;
	pattern: number;
	patternLength: number;
	patternUsage: number;
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
			const pattern = hasPatterns ? (tracker.workingPattern || 1) : 0;
			const patternLength = tracker.player.pattern[pattern]?.end || 0;
			const patternUsage = pattern && tracker.player.countPatternUsage(pattern);

			return {
				noPatterns: !hasPatterns,
				pattern,
				patternLength,
				patternUsage,
				totalPatterns: hasPatterns ? (totalPatterns - 1) : 0,
				minPatternValue: hasPatterns ? 1 : 0,
				minPatternLength: pattern ? 1 : 0,
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
					<label htmlFor="pattern">Pattern:</label>
				</Col>
				<Col xs={6}>
					<RadixIntegerInput
						fill={true}
						id="pattern"
						disabled={state.noPatterns}
						min={state.minPatternValue}
						max={state.totalPatterns}
						value={state.pattern}
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
					<label htmlFor="patternLength">Length:</label>
				</Col>
				<Col xs={6}>
					<RadixIntegerInput
						fill={true}
						id="patternLength"
						disabled={state.noPatterns}
						min={state.minPatternLength}
						max={MAX_PATTERN_LEN}
						value={state.patternLength}
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
					<label>Used:</label>
				</Col>
				<Col xs={6}>
					<input
						className="bp3-input bp3-fill"
						type="text"
						readOnly={true}
						disabled={state.noPatterns}
						value={state.patternUsage}
					/>
				</Col>
			</PanelCtrlRow>

			<PanelCtrlRow splitAbove={true}>
				<Col xs={6} className="split">
					<Button
						icon="function"
						rightIcon="caret-down"
						fill={true}
						disabled={true}
					/>
				</Col>
				<Col xs={4}>
					<label>Total:</label>
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
