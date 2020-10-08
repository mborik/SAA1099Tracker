import * as React from 'react';
import { Col } from 'react-styled-flexboxgrid';
import { NumericInput } from '@blueprintjs/core';

import PanelBase from '../partials/PanelBase';
import PanelCtrlRow from '../partials/PanelCtrlRow';


const PanelEditor: React.FunctionComponent = () => {
	return (
		<PanelBase title="Editor:">
			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlOctave">Octave:</label>
				</Col>
				<Col xs={8}>
					<NumericInput fill={true} id="ctrlOctave" min={1} max={8}></NumericInput>
				</Col>
			</PanelCtrlRow>
			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlSample">AutoSmp:</label>
				</Col>
				<Col xs={8}>
					<NumericInput fill={true} id="ctrlSample" min={0} max={31}></NumericInput>
				</Col>
			</PanelCtrlRow>
			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlOrnament">AutoOrn:</label>
				</Col>
				<Col xs={8}>
					<NumericInput fill={true} id="ctrlOrnament" min={0} max={15}></NumericInput>
				</Col>
			</PanelCtrlRow>
			<PanelCtrlRow splitAbove={true}>
				<Col xs={8}>
					<label htmlFor="ctrlRowStep">RowStep:</label>
				</Col>
				<Col xs={8}>
					<NumericInput fill={true} id="ctrlRowStep" min={0} max={8}></NumericInput>
				</Col>
			</PanelCtrlRow>
		</PanelBase>
	);
};

export default PanelEditor;
