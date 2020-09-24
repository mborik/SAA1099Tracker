import React, { useState } from 'react';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { TooltipedNavButton } from '../partials/TooltipedNavButton';


const Playback: React.FunctionComponent = () => {
	const [ loop, setLoop ] = useState(true);

	return (
		<Navbar.Group>
			<TooltipedNavButton minimal={true} icon="stop" intent="primary"
				tooltip={<>
					<label>Stop</label>
					<KeyCombo combo="esc" />
				</>}
			/>
			<TooltipedNavButton minimal={true} icon="play" intent="primary"
				tooltip={<>
					<label>Play song</label>
					<KeyCombo combo="F5" />
				</>}
			/>
			<TooltipedNavButton minimal={true} icon="fast-forward" intent="primary"
				tooltip={<>
					<label>Play song from start</label>
					<KeyCombo combo="F6" />
				</>}
			/>
			<TooltipedNavButton minimal={true} icon="step-forward" intent="primary"
				tooltip={<>
					<label>Play position</label>
					<KeyCombo combo="F7" />
				</>}
			/>
			<TooltipedNavButton minimal={true} icon="play" intent="primary"
				tooltip={<>
					<label>Play position from start</label>
					<KeyCombo combo="F8" />
				</>}
			/>
			<TooltipedNavButton minimal={true} onClick={() => setLoop(!loop)}
				style={loop ? {} : { transform: 'scale(-1, 1)' }}
				icon={loop ? 'refresh' : 'outdated'}
				intent={loop ? 'success' : 'none'}
				tooltip={<>
					<label>Toggle repeat</label>
					<KeyCombo combo="F11" />
				</>}
			/>
			<Navbar.Divider />
		</Navbar.Group>
	);
}

export default Playback;
