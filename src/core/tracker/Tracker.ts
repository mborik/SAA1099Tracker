/*!
 * SAA1099Tracker
 * Copyright (c) 2012-2020 Martin Borik <mborik@users.sourceforge.net>
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

import { devLog } from "../../utils/dev";
import Player from "../player/Player";
import Manager from "./Manager";
import Settings from "./Settings";
import SmpOrnEditor from "./SmpOrnEditor";
import Tracklist from "./Tracklist";
import { STMFile } from "./File";
import { SAASound } from "../saa/SAASound";


export interface TrackerCanvasPair {
	obj: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
}

export interface TrackerImpl {
	version: string;
	loaded: boolean;
	activeTab: number;
	modePlay: boolean;
	modeEdit: boolean;
	modeEditChannel: number;
	modeEditColumn: number;
	workingPattern: number;
	workingSample: number;
	workingSampleTone: number;
	workingOrnament: number;
	workingOrnTestSample: number;
	ctrlOctave: number;
	ctrlSample: number;
	ctrlOrnament: number;
	ctrlRowStep: number;
	songTitle: string;
	songAuthor: string;

	pixelfont: TrackerCanvasPair;
	settings: Settings;
	manager: Manager;
	tracklist: Tracklist;
	smpornedit: SmpOrnEditor;

	player: Player;
	file: STMFile;
}

export default class Tracker implements TrackerImpl {
	loaded: boolean = false;
	activeTab: number = 0;
	modePlay: boolean = false;
	modeEdit: boolean = false;
	modeEditChannel: number = 0;
	modeEditColumn: number = 0;
	workingPattern: number = 0;
	workingSample: number = 1;
	workingSampleTone: number = 37;
	workingOrnament: number = 1;
	workingOrnTestSample: number = 1;
	ctrlOctave: number = 2;
	ctrlSample: number = 0;
	ctrlOrnament: number = 0;
	ctrlRowStep: number = 0;
	songTitle: string = '';
	songAuthor: string = '';

	pixelfont: TrackerCanvasPair;
	settings: Settings;
	manager: Manager;
	tracklist: Tracklist;
	smpornedit: SmpOrnEditor;

	player: Player;
	file: STMFile;

	constructor(public version: string) {
		devLog('Tracker', 'Inizializing SAA1099Tracker v%s...', version);

		this.pixelfont  = { obj: null, ctx: null } as any;
		this.settings   = new Settings(this);
		this.manager    = new Manager(this);
		this.tracklist  = new Tracklist(this);
		this.smpornedit = new SmpOrnEditor(this);

		this.player = new Player(new SAASound(48000));
		this.file = new STMFile(this);
	}
}
