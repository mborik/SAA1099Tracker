import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Grid, Col, Row } from 'react-styled-flexboxgrid';
import { InputGroup } from '@blueprintjs/core';

import { actionTrackerInit } from '../actions/tracker';
import { ReducerStoreState } from '../reducers';


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

	const { songTitle, songAuthor } = useSelector<ReducerStoreState, { [key: string]: string }>(state => {
		const tracker = state.tracker;

		if (tracker == null) {
			return {
				songTitle: '',
				songAuthor: ''
			};
		} else {
			return {
				songTitle: tracker.songTitle,
				songAuthor: tracker.songAuthor
			};
		}
	});

	useEffect(() => {
		dispatch(actionTrackerInit());
	}, [ dispatch ]);


	return (
		<MainWrapper>
			<Grid>
				<Row>
					<Col xs={16} sm={8}>
						<InputGroup
							fill={true}
							leftIcon="tag"
							placeholder="Song title"
							value={songTitle}
						/>
					</Col>
					<Col xs={16} sm={8}>
						<InputGroup
							fill={true}
							leftIcon="user"
							placeholder="Author"
							value={songAuthor}
						/>
					</Col>
				</Row>
			</Grid>
		</MainWrapper>
	);
}

export default Main;
