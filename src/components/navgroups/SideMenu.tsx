/*!
 * SAA1099Tracker - Navbar group - Theme switcher and about submenu
 * Copyright (c) 2020 Martin Borik <mborik@users.sourceforge.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 * OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
//---------------------------------------------------------------------------------------

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Menu, MenuDivider, MenuItem, Navbar, Popover } from '@blueprintjs/core';
import styled from 'styled-components';

import { actionToggleTheme } from '../../actions/general';
import { ReducerStoreState } from '../../reducers';

const NavbarGroupRight = styled(Navbar.Group)`
	flex: 1 0 auto !important;
	justify-content: flex-end;
`;

const SideMenu: React.FunctionComponent = () => {
  const dispatch = useDispatch();
  const darkTheme = useSelector<ReducerStoreState>(state => state.general.darkTheme) as boolean;

  const toggleTheme = useCallback(() =>
    dispatch(actionToggleTheme()),
  [ dispatch ]);

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
};

export default SideMenu;
