import React from 'react';
import { Col, Row } from 'react-styled-flexboxgrid';

import PanelEditor from './PanelEditor';
import PanelPatterns from './PanelPatterns';
import PanelPositions from './PanelPositions';


const TrackerContainer: React.FunctionComponent = () => {
	return (
		<Row>
			<Col xs={6} sm={6} md={2}>
				<PanelEditor />
			</Col>
			<Col xs={10} sm={10} md={4}>
				<PanelPatterns />
			</Col>
			<Col xs={16} sm={16} md={10}>
				<PanelPositions />
			</Col>
		</Row>
	);
};

export default TrackerContainer;
