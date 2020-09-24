import React from 'react';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { TooltipedNavButton } from '../partials/TooltipedNavButton';

const FileOps: React.FunctionComponent = () => (
	<Navbar.Group>
		<TooltipedNavButton icon="folder-new" tooltip="New" />
		<TooltipedNavButton icon="folder-open"
			tooltip={<>
				<label>Open</label>
				<KeyCombo combo="mod+O" />
			</>}
		/>
		<TooltipedNavButton icon="folder-shared-open"
			tooltip={<>
				<label>Save</label>
				<KeyCombo combo="mod+S" />
			</>}
		/>
		<TooltipedNavButton icon="cloud-upload" tooltip="Save as&hellip;" />
		<Navbar.Divider />
	</Navbar.Group>
);

export default FileOps;
