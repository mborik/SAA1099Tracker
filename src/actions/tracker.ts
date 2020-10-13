/*!
 * SAA1099Tracker - Tracker reducer actions
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

import { Dispatch } from 'redux';
import { actionToast } from './toast';
import { ReducerStoreState } from '../reducers/index';
import { devLog } from '../utils/dev';

import { TrackerControlState } from '../core/tracker/Tracker';


export const enum TrackerAction {
	Init = 'tracker/init',
	ActiveTabChanged = 'tracker/activeTabChanged',
	EditorControlChanged = 'tracker/editorControlChanged',
	IoDemosongLoaded = 'tracker/io/demosongLoaded',
}

export interface TrackerReducerAction {
	type: TrackerAction;
	payload?: any;
}

//---------------------------------------------------------------------------------------

export const actionTrackerInit = (): TrackerReducerAction => ({
	type: TrackerAction.Init
});

export const actionChangeActiveTab = (activeTab: number): TrackerReducerAction => ({
	type: TrackerAction.ActiveTabChanged,
	payload: { activeTab }
});

export const actionChangeEditorControl = (data: { key: keyof TrackerControlState, value: number }): TrackerReducerAction => ({
	type: TrackerAction.EditorControlChanged,
	payload: data
});

export const actionTrackerLoadDemosong = (songName: string, url: string) =>
	(dispatch: Dispatch, getState: () => ReducerStoreState) => {
		const { tracker } = getState();

		devLog(`Loading demosong: "${songName}"...`);

		return fetch(url)
			.then(response => response.json())
			.then(data => {
				if (!tracker.file.parseJSON(data)) {
					throw new Error('Demosong parse error or invalid data format!');
				}

				dispatch({ type: TrackerAction.IoDemosongLoaded });
				dispatch(actionToast({
					icon: 'endorsed',
					intent: 'success',
					message: `Demosong "${songName}" successfully loaded!`
				}));
			})
			.catch(({ message }) => {
				dispatch(actionToast({
					intent: 'danger',
					message
				}));
			});
	};

