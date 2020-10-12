import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { Grid } from 'react-styled-flexboxgrid';

import SongHeader from './tracker/SongHeader';
import TabPanel from './partials/TabPanel';

import { actionTrackerInit } from '../actions/tracker';


const MainWrapper = styled(Grid).attrs(() => ({
	tagName: 'main',
	role: 'main',
	className: 'bp3-fill'
}))`
	display: flex;
	flex-flow: column nowrap;
	flex: 1 0 auto;
	margin: 1rem auto;
`;

const Main: React.FunctionComponent = () => {
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(actionTrackerInit());
	}, [ dispatch ]);


	return (
		<MainWrapper>
			<SongHeader />
			<TabPanel />
		</MainWrapper>
	);
}

export default Main;
