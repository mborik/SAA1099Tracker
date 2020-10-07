import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Grid } from 'react-styled-flexboxgrid';

import SongHeader from './partials/SongHeader';
import TabPanel from './partials/TabPanel';

import { actionTrackerInit } from '../actions/tracker';


const MainWrapper = styled.main.attrs(() => ({
	role: 'main',
	className: 'bp3-fill'
}))`
	flex: 1 0 auto;
	padding: 1rem;
	width: 100%;
`;

const Main: React.FunctionComponent = () => {
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(actionTrackerInit());
	}, [ dispatch ]);


	return (
		<MainWrapper>
			<Grid>
				<SongHeader />
				<TabPanel />
			</Grid>
		</MainWrapper>
	);
}

export default Main;
