import * as React from 'react';
import { Col } from 'react-styled-flexboxgrid';

import PanelBase from '../partials/PanelBase';
import PanelCtrlRow from '../partials/PanelCtrlRow';
import RadixIntegerInput from '../partials/RadixIntegerInput';


const PanelEditor: React.FunctionComponent = () => {
	return (
		<PanelBase title="Editor:">
			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlOctave">Octave:</label>
				</Col>
				<Col xs={8}>
					<RadixIntegerInput fill={true} id="ctrlOctave" min={1} max={8}></RadixIntegerInput>
				</Col>
			</PanelCtrlRow>
			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlSample">AutoSmp:</label>
				</Col>
				<Col xs={8}>
					<RadixIntegerInput fill={true} id="ctrlSample" radix={32} min={0} max={31}></RadixIntegerInput>
				</Col>
			</PanelCtrlRow>
			<PanelCtrlRow>
				<Col xs={8}>
					<label htmlFor="ctrlOrnament">AutoOrn:</label>
				</Col>
				<Col xs={8}>
					<RadixIntegerInput fill={true} id="ctrlOrnament" radix={16} min={0} max={15}></RadixIntegerInput>
				</Col>
			</PanelCtrlRow>
			<PanelCtrlRow splitAbove={true}>
				<Col xs={8}>
					<label htmlFor="ctrlRowStep">RowStep:</label>
				</Col>
				<Col xs={8}>
					<RadixIntegerInput fill={true} id="ctrlRowStep" min={0} max={8}></RadixIntegerInput>
				</Col>
			</PanelCtrlRow>
		</PanelBase>
	);
};

export default PanelEditor;
