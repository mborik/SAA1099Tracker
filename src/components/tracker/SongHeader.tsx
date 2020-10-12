import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { InputGroup } from '@blueprintjs/core';

import { ReducerStoreState } from '../../reducers';


const SongHeaderRow = styled(Row)`
	padding-bottom: 1rem;
`;

const SongHeader: React.FunctionComponent = () => {
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

	return (
		<SongHeaderRow>
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
		</SongHeaderRow>
	);
}

export default SongHeader;
