import React from 'react';
import { Navbar, KeyCombo } from '@blueprintjs/core';

import { NavButtonTooltiped } from '../partials/NavButtonTooltiped';

const FileOps: React.FunctionComponent = () => (
	<Navbar.Group>
		<NavButtonTooltiped
			key="miFileNew"
			icon="folder-new"
			tooltip="New"
		/>
		<NavButtonTooltiped
			key="miFileOpen"
			icon="folder-open"
			tooltip={<>
				<label>Open</label>
				<KeyCombo combo="mod+O" />
			</>}
		/>
		<NavButtonTooltiped
			key="miFileSave"
			icon="folder-shared-open"
			tooltip={<>
				<label>Save</label>
				<KeyCombo combo="mod+S" />
			</>}
		/>
		<NavButtonTooltiped
			key="miFileSaveAs"
			icon="cloud-upload"
			tooltip="Save as&hellip;"
		/>

		<Navbar.Divider />
	</Navbar.Group>
);

export default FileOps;
