import React from 'react';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { TooltipedNavButton } from '../partials/TooltipedNavButton';

const Tools: React.FunctionComponent = () => (
	<Navbar.Group>
		<TooltipedNavButton icon="comparison" disabled={true}
			tooltip={<>
				<label>Track manager</label>
				<KeyCombo combo="F9" />
			</>}
		/>
		<TooltipedNavButton icon="cog"
			tooltip={<>
				<label>Preferences</label>
				<KeyCombo combo="F10" />
			</>}
		/>
	</Navbar.Group>
);

export default Tools;
