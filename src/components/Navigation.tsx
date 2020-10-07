import React from 'react';
import { NavbarExt } from './partials/NavbarExt';
import { NavbarSecondRow } from './partials/NavbarSecondRow';
import NavGroup from './navgroups';


const Navigation: React.FunctionComponent = () => (
	<NavbarExt>
		<NavGroup.FileOps />
		<NavGroup.ImportExport />
		<NavGroup.EditOps />

		<NavbarSecondRow>
			<NavGroup.Playback />
			<NavGroup.Tools />
			<NavGroup.SideMenu />
		</NavbarSecondRow>
	</NavbarExt>
);

export default Navigation;
