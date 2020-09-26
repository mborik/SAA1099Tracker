export const enum NavbarAction {
	ToggleTheme = 'navbar/toggleTheme',
	ToggleRepeat = 'navbar/toggleRepeat'
};

export interface NavbarReducerAction {
	type: NavbarAction;
	payload?: any;
}

//---------------------------------------------------------------------------------------

export const actionToggleTheme = (): NavbarReducerAction => ({
	type: NavbarAction.ToggleTheme
});

export const actionToggleRepeat = (): NavbarReducerAction => ({
	type: NavbarAction.ToggleRepeat
});
