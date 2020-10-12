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

	const editorCtrlState = useSelector<ReducerStoreState, EditorCtrlState>(state => {
		const tracker = state.tracker;

		if (tracker == null) {
			return {} as any;
		} else {
			return {
				ctrlOctave: tracker.ctrlOctave,
				ctrlSample: tracker.ctrlSample,
				ctrlOrnament: tracker.ctrlOrnament,
				ctrlRowStep: tracker.ctrlRowStep
			}
		}
	});

	const handleValueChange = useCallback((key: keyof EditorCtrlState, value: number) =>
		dispatch(actionChangeEditorControl({ key, value })),
	[ dispatch ]);

	return (
		<PanelBase title="Editor:">
			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlOctave">Octave:</label>
				</Col>
				<Col xs={8}>
					<RadixIntegerInput
						fill={true}
						id="ctrlOctave"
						value={editorCtrlState.ctrlOctave}
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
						value={editorCtrlState.ctrlSample}
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
						value={editorCtrlState.ctrlOrnament}
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
						value={editorCtrlState.ctrlRowStep}
						onValueChange={value => handleValueChange('ctrlRowStep', value)}
						min={0} max={8}
					/>
				</Col>
			</PanelCtrlRow>
		</PanelBase>
	);
};

export default PanelEditor;
