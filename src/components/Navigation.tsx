import React from 'react';
import { NavbarExt } from './partials/NavbarExt';
import { NavbarSecondRow } from './partials/NavbarSecondRow';
import NavGroup from './navgroups';


const Navigation: React.FunctionComponent = () => (
	<NavbarExt>
		<NavGroup.FileOps />
		<NavGroup.ImportExport />
		<NavGroup.EditOps />

		<NavGroup.SideMenu />

		<NavbarSecondRow>
			<NavGroup.Playback />
			<NavGroup.Tools />
		</NavbarSecondRow>
	</NavbarExt>
);

export default Navigation;
