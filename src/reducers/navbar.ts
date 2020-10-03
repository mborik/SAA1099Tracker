import { NavbarAction, NavbarReducerAction } from "../actions/navbar";
import { showToast } from "../actions/toast";

export interface NavbarReducerState {
	darkTheme: boolean;
	repeatMode: boolean;
}

const defaultState: NavbarReducerState = {
	darkTheme: false,
	repeatMode: true
};

export default (state = defaultState, action: NavbarReducerAction): NavbarReducerState => {
	switch (action.type) {
		case NavbarAction.ToggleTheme: {
			state.darkTheme = !state.darkTheme;
			document.body.className = state.darkTheme ? 'bp3-dark' : '';
			break;
		}

		case NavbarAction.ToggleRepeat: {
			state.repeatMode = !state.repeatMode;
			break;
		}

		case NavbarAction.Toast: {
			showToast(action.payload);
		}
	}

	return state;
};