/*!
 * SAA1099Tracker - Tracker reducer
 * Copyright (c) 2020 Martin Borik <mborik@users.sourceforge.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 * OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
//---------------------------------------------------------------------------------------

import { TrackerAction, TrackerReducerAction } from '../actions/tracker';
import Tracker, { TrackerImpl } from '../core/tracker/Tracker';

import { TrackerControlState } from '../core/tracker/Tracker';


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
