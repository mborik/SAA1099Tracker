export const enum TrackerAction {
	Init = 'tracker/init',
	LoadDemosong = 'tracker/loadDemosong',
};

export interface TrackerReducerAction {
	type: TrackerAction;
	payload?: any;
}

//---------------------------------------------------------------------------------------

export const actionTrackerInit = (): TrackerReducerAction => ({
	type: TrackerAction.Init
});

export const actionTrackerLoadDemosong = (songName: string, url: string): TrackerReducerAction => ({
	type: TrackerAction.LoadDemosong,
	payload: { songName, url }
});
