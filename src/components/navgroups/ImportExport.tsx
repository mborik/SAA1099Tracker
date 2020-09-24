import React from 'react';
import { Button, Menu, MenuDivider, MenuItem, Navbar, Popover } from "@blueprintjs/core";
import demosongs from '../../params/demosongs';

const ImportExport: React.FunctionComponent = () => (
	<Navbar.Group>
		<Popover minimal={true} position="bottom-left">
			<Button minimal={true} icon="import" rightIcon="caret-down" text="Import" />
			<Menu>
				<MenuItem text={<>Import native song format <i>(STMF)</i>&hellip;</>}></MenuItem>
				<MenuDivider />
				<MenuItem text="ProTracker II module&hellip;" />
				<MenuItem text="E-Tracker module&hellip;" />
				<MenuDivider />
				<MenuItem text="Demosong">
					{demosongs.map(demosong => (
						<MenuItem text={<>{demosong.title} <i>({demosong.author})</i></>} />
					))}
				</MenuItem>
			</Menu>
		</Popover>

		<Popover minimal={true} position="bottom-left">
			<Button minimal={true} icon="export" rightIcon="caret-down" text="Export" />
			<Menu>
				<MenuItem text={<>Export to native song format <i>(STMF)</i>&hellip;</>}></MenuItem>
				<MenuDivider />
				<MenuItem text="Binary compilation&hellip;" />
			</Menu>
		</Popover>

		<Navbar.Divider />
	</Navbar.Group>
);

export default ImportExport;
