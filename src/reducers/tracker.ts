import { TrackerAction, TrackerReducerAction } from "../actions/tracker";
import Tracker, { TrackerImpl } from "../core/tracker/Tracker";

export interface TrackerReducerState extends TrackerImpl {}

export default (tracker: TrackerReducerState | null = null, action: TrackerReducerAction): TrackerReducerState | null => {
	if (!tracker && action.type === TrackerAction.Init) {
		const appVersion = process.env['REACT_APP_VERSION'] as string;
		return new Tracker(appVersion);
	}

	if (tracker) {
		switch (action.type) {
			case TrackerAction.LoadDemosong: {
				const { songName, url } = action.payload;
				tracker.file.importDemosong(songName, url);
				break;
			}
		}
	}

	return tracker;
};
