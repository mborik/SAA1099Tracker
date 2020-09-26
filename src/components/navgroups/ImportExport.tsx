import React from 'react';
import { Button, Menu, MenuDivider, MenuItem, Navbar, Popover } from "@blueprintjs/core";
import demosongs from '../../params/demosongs';

const ImportExport: React.FunctionComponent = () => (
	<Navbar.Group>
		<Popover key="miFileImport" minimal={true} position="bottom-left">
			<Button minimal={true} icon="import" rightIcon="caret-down" text="Import" />
			<Menu>
				<MenuItem
					key="miFileImportSTMF"
					text={<>Import native song format <i>(STMF)</i>&hellip;</>}
				/>
				<MenuDivider />
				<MenuItem key="miFileImportPT2" text="ProTracker II module&hellip;" />
				<MenuItem key="miFileImportETrk" text="E-Tracker module&hellip;" />
				<MenuDivider />
				<MenuItem key="miFileImportDemosong" text="Demosong">
					{demosongs.map((demosong, index) => (
						<MenuItem
							key={`miFileImportDemo${index + 1}`}
							text={<>{demosong.title} <i>({demosong.author})</i></>}
						/>
					))}
				</MenuItem>
			</Menu>
		</Popover>

		<Popover key="miFileExport" minimal={true} position="bottom-left">
			<Button minimal={true} icon="export" rightIcon="caret-down" text="Export" />
			<Menu>
				<MenuItem
					key="miFileExportSTMF"
					text={<>Export to native song format <i>(STMF)</i>&hellip;</>}
				/>
				<MenuDivider />
				<MenuItem key="miFileCompile" text="Binary compilation&hellip;" />
			</Menu>
		</Popover>

		<Navbar.Divider />
	</Navbar.Group>
);

export default ImportExport;
