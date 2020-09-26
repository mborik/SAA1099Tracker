import React, { useState } from 'react';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { NavButtonTooltiped } from '../partials/NavButtonTooltiped';


const Playback: React.FunctionComponent = () => {
	const [ loop, setLoop ] = useState(true);

	return (
		<Navbar.Group>
			<NavButtonTooltiped
				key="miStop"
				icon="stop"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Stop</label>
					<KeyCombo combo="esc" />
				</>}
			/>
			<NavButtonTooltiped
				key="miSongPlay"
				icon="play"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Play song</label>
					<KeyCombo combo="F5" />
				</>}
			/>
			<NavButtonTooltiped
				key="miSongPlayStart"
				icon="fast-forward"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Play song from start</label>
					<KeyCombo combo="F6" />
				</>}
			/>
			<NavButtonTooltiped
				key="miPosPlay"
				icon="step-forward"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Play position</label>
					<KeyCombo combo="F7" />
				</>}
			/>
			<NavButtonTooltiped
				key="miPosPlayStart"
				icon="play"
				intent="primary"
				minimal={true}
				tooltip={<>
					<label>Play position from start</label>
					<KeyCombo combo="F8" />
				</>}
			/>
			<NavButtonTooltiped
				key="miToggleLoop"
				style={loop ? {} : { transform: 'scale(-1, 1)' }}
				icon={loop ? 'refresh' : 'outdated'}
				intent={loop ? 'success' : 'none'}
				minimal={true}
				tooltip={<>
					<label>Toggle repeat</label>
					<KeyCombo combo="F11" />
				</>}

				onClick={() => setLoop(!loop)}
			/>

			<Navbar.Divider />
		</Navbar.Group>
	);
}

export default Playback;
