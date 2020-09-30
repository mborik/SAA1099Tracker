import { TrackerAction, TrackerReducerAction } from "../actions/tracker";
import Tracker, { TrackerImpl } from "../core/tracker/Tracker";

export interface TrackerReducerState extends TrackerImpl {}


export default (tracker: TrackerReducerState | null = null, action: TrackerReducerAction): TrackerReducerState | null => {
	switch (action.type) {
		case TrackerAction.Init: {
			const appVersion = process.env['REACT_APP_VERSION'] as string;
			return new Tracker(appVersion);
		}

		default:
			return tracker;
	}
};
