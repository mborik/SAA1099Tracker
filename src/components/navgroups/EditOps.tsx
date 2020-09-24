import React from 'react';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { TooltipedNavButton } from '../partials/TooltipedNavButton';

const EditOps: React.FunctionComponent = () => (
	<Navbar.Group>
		<TooltipedNavButton minimal={true} icon="remove-column"
			tooltip={<>
				<label>Cut</label>
				<KeyCombo combo="mod+X" />
			</>}
		/>
		<TooltipedNavButton minimal={true} icon="menu-open"
			tooltip={<>
				<label>Copy</label>
				<KeyCombo combo="mod+C" />
			</>}
		/>
		<TooltipedNavButton minimal={true} icon="th-derived"
			tooltip={<>
				<label>Paste</label>
				<KeyCombo combo="mod+V" />
			</>}
		/>
		<TooltipedNavButton minimal={true} icon="trash"
			tooltip={<>
				<label>Delete</label>
				<KeyCombo combo="mod+D" />
			</>}
		/>
		<Navbar.Divider />
		<TooltipedNavButton minimal={true} icon="undo"
			tooltip={<>
				<label>Undo</label>
				<KeyCombo combo="mod+Z" />
			</>}
		/>
		<TooltipedNavButton minimal={true} icon="redo"
			tooltip={<>
				<label>Redo</label>
				<KeyCombo combo="mod+Y" />
				<KeyCombo combo="mod+shift+Z" />
			</>}
		/>
	</Navbar.Group>
);

export default EditOps;
