import React from 'react';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { NavButtonTooltiped } from '../partials/NavButtonTooltiped';

const EditOps: React.FunctionComponent = () => (
	<Navbar.Group>
		<NavButtonTooltiped
			key="miEditCut"
			icon="remove-column"
			minimal={true}
			tooltip={<>
				<label>Cut</label>
				<KeyCombo combo="mod+X" />
			</>}
		/>
		<NavButtonTooltiped
			key="miEditCopy"
			icon="menu-open"
			minimal={true}
			tooltip={<>
				<label>Copy</label>
				<KeyCombo combo="mod+C" />
			</>}
		/>
		<NavButtonTooltiped
			key="miEditPaste"
			icon="th-derived"
			minimal={true}
			tooltip={<>
				<label>Paste</label>
				<KeyCombo combo="mod+V" />
			</>}
		/>
		<NavButtonTooltiped
			key="miEditDelete"
			icon="trash"
			minimal={true}
			tooltip={<>
				<label>Delete</label>
				<KeyCombo combo="mod+D" />
			</>}
		/>

		<Navbar.Divider />

		<NavButtonTooltiped
			key="miEditUndo"
			icon="undo"
			minimal={true}
			tooltip={<>
				<label>Undo</label>
				<KeyCombo combo="mod+Z" />
			</>}
		/>
		<NavButtonTooltiped
			key="miEditRedo"
			icon="redo"
			minimal={true}
			tooltip={<>
				<label>Redo</label>
				<KeyCombo combo="mod+Y" />
				<KeyCombo combo="mod+shift+Z" />
			</>}
		/>
	</Navbar.Group>
);

export default EditOps;
