import { Navbar } from '@blueprintjs/core';
import styled from 'styled-components';

export const NavbarExt = styled(Navbar)`
	flex: 0 0 auto;
	display: flex;
	flex-flow: row wrap;
	padding-left: 8rem;
	min-height: 38px;
	height: auto;

	&::before {
		content: 'SAA1099Tracker';
		position: absolute;
		left: 12px;
		top: 8px;
	}

	.bp3-navbar-group {
		flex: 0 0 auto;
		height: 35px;
	}
`;
