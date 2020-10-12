import { TrackerAction, TrackerReducerAction } from "../actions/tracker";
import Tracker, { TrackerImpl } from "../core/tracker/Tracker";

import { TrackerControlState } from "../core/tracker/Tracker";


export interface TrackerReducerState extends TrackerImpl {
	statusText: string;
}

export default (tracker: TrackerReducerState | null = null, action: TrackerReducerAction): TrackerReducerState | null => {
	if (!tracker && action.type === TrackerAction.Init) {
		const appVersion = process.env['REACT_APP_VERSION'] as string;
		return new Tracker(appVersion) as TrackerReducerState;
	}

	if (tracker) {
		switch (action.type) {
			case TrackerAction.ActiveTabChanged:
				tracker.activeTab = action?.payload?.activeTab || 0;
				break;

			case TrackerAction.EditorControlChanged: {
				if (action.payload) {
					const { key, value } = action.payload as { key: keyof TrackerControlState, value: number };
					tracker[key] = value;
				}
				break;
			}

			case TrackerAction.IoDemosongLoaded: {
				const file = tracker.file;

				file.modified = true;
				file.yetSaved = false;
				file.fileName = '';

				break;
			}
		}
	}

	return tracker;
};
