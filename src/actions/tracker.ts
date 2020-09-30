export const enum TrackerAction {
	Init = 'tracker/init',
};

export interface TrackerReducerAction {
	type: TrackerAction;
	payload?: any;
}

//---------------------------------------------------------------------------------------

export const actionTrackerInit = (): TrackerReducerAction => ({
	type: TrackerAction.Init
});
