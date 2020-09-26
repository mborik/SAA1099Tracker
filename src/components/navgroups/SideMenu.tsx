import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Button, Menu, MenuDivider, MenuItem, Navbar, Popover } from "@blueprintjs/core";

import { actionToggleTheme } from '../../actions/navbar';
import { ReducerStoreState } from '../../reducers';

const NavbarGroupRight = styled(Navbar.Group)`
	flex: 1 0 auto !important;
	justify-content: flex-end;
`;

const SideMenu: React.FunctionComponent = () => {
	const dispatch = useDispatch();
	const darkTheme = useSelector<ReducerStoreState>(state => state.navbar.darkTheme) as boolean;

	const toggleTheme = useCallback(
		() => dispatch(actionToggleTheme()),
		[ dispatch ]
	);

	return (
		<NavbarGroupRight>
			<Button minimal={true} onClick={toggleTheme} icon={darkTheme ? 'lightbulb' : 'moon'} />
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
