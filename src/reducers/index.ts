import { Dispatch } from 'redux';
import { combineReducers } from 'redux';

import navbar, { NavbarReducerState } from './navbar';
import tracker, { TrackerReducerState } from './tracker';


export interface ReducerStoreState {
	navbar: NavbarReducerState;
	tracker: TrackerReducerState;
}

export interface ReducerStoreProps {
	dispatch: Dispatch;
	getState: () => ReducerStoreState
}

export default combineReducers({
	navbar,
	tracker
});
