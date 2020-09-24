import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Button, Menu, MenuDivider, MenuItem, Navbar, Popover } from "@blueprintjs/core";

const NavbarGroupRight = styled(Navbar.Group)`
	flex: 1 0 auto !important;
	justify-content: flex-end;
`;

const SideMenu: React.FunctionComponent = () => {
	const [ darkMode, setDarkMode ] = useState(false);

	const toggleTheme = useCallback(() => {
		document.body.className = darkMode ? '' : 'bp3-dark';
		setDarkMode(!darkMode);
	},
	[ darkMode, setDarkMode ]);

	return (
		<NavbarGroupRight>
			<Button minimal={true} onClick={() => toggleTheme()} icon={darkMode ? 'lightbulb' : 'moon'} />
			<Navbar.Divider />
			<Popover minimal={true} position="bottom-left">
				<Button minimal={true} rightIcon="caret-down" text="Help" />
				<Menu>
					<MenuItem text="Basic info for musicians&hellip;" />
					<MenuItem text="Keyboard controls and hotkeys&hellip;" />
					<MenuItem text="Effect commands&hellip;" />
					<MenuItem text="Export data format&hellip;" />
					<MenuItem text="Detailed info about SAA 1099&hellip;" />
					<MenuDivider />
					<MenuItem text="About&hellip;" />
				</Menu>
			</Popover>
		</NavbarGroupRight>
	);
}

export default SideMenu;
