import React from 'react';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { NavButtonTooltiped } from '../partials/NavButtonTooltiped';

const Tools: React.FunctionComponent = () => (
	<Navbar.Group>
		<NavButtonTooltiped
			key="miManager"
			icon="comparison"
			disabled={true}
			tooltip={<>
				<label>Track manager</label>
				<KeyCombo combo="F9" />
			</>}
		/>
		<NavButtonTooltiped
			key="miPreferences"
			icon="cog"
			tooltip={<>
				<label>Preferences</label>
				<KeyCombo combo="F10" />
			</>}
		/>
	</Navbar.Group>
);

export default Tools;
