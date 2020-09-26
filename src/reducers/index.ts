import { Dispatch } from 'redux';
import { combineReducers } from 'redux';

import navbar, { NavbarReducerState } from './navbar';


export interface ReducerStoreState {
	navbar: NavbarReducerState;
}

export interface ReducerStoreProps {
	dispatch: Dispatch;
	getState: () => ReducerStoreState
}

export default combineReducers({
	navbar
});
