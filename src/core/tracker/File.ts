/*!
 * Tracker native JSON file format handler class and dependent interfaces.
 * Copyright (c) 2015-2020 Martin Borik <mborik@users.sourceforge.net>
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
import Tracker from "./Tracker";


interface StorageItem {
	id: number;
	storageId: string;
	fileName: string;
	timeCreated: number;
	timeModified: number;
	duration: string;
	length: number;
}

interface STMFileFormat {
	title:     string;
	author:    string;

	samples:   any[];
	ornaments: any[];
	patterns:  any[];
	positions: any[];
	repeatPos: number;

	current: {
		sample:     number;
		ornament:   number;
		ornSample:  number;
		smpornTone: number;
		position:   number;
		pattern:    number;
		line:       number;
		channel:    number;
		column:     number;
	};
	ctrl: {
		octave:   number;
		sample:   number;
		ornament: number;
		rowStep:  number;
	};
	config: {
		interrupt: number;
		activeTab: number;
		editMode:  boolean;
		loopMode:  boolean;
	};

	version: string;
}

interface StorageDialogExchange {
	data: StorageItem[];

	readonly usage: {
		bytes: number;
		percent: number;
	};
}

//---------------------------------------------------------------------------------------
export class STMFile {
	constructor(private _parent: Tracker) {
	}

	yetSaved: boolean = false;
	modified: boolean = false;
	fileName: string = '';

	private _updateAll(): void {
/*
		let tracker: Tracker = this._parent;
		let player: Player = tracker.player;

		let actualLine = player.currentLine;

		tracker.onCmdToggleEditMode(tracker.modeEdit);
		tracker.onCmdToggleLoop(player.loopMode);

		$('#scPattern').val(tracker.workingPattern.toString());
		$('#scPosRepeat').val((player.repeatPosition + 1).toString());
		$('#scPosCurrent').val((player.currentPosition + 1).toString());

		tracker.updatePanels();
		player.currentLine = actualLine;
		tracker.updateTracklist();

		$('#scSampleNumber').val(tracker.workingSample.toString(32).toUpperCase());
		$('#scOrnNumber').val(tracker.workingOrnament.toString(16).toUpperCase());
		$('#scOrnTestSample').val(tracker.workingOrnTestSample.toString(32).toUpperCase());
		$('#scSampleTone,#scOrnTone').val(tracker.workingSampleTone.toString()).trigger('change');
		$('#sbSampleScroll').scrollLeft(0);

		tracker.updateSampleEditor(true);
		tracker.smpornedit.updateOrnamentEditor(true);

		$('#main-tabpanel a').eq(tracker.activeTab).tab('show');
*/
	}

	/**
	 * This method can parse input JSON with song data
	 * in current SAA1099Tracker format specification.
	 * @param input {STMFileFormat|string} song data in JSON.
	 */
	parseJSON(input: STMFileFormat | string): boolean {
		let data: STMFileFormat;
		if (typeof input === 'string') {
			try {
				data = JSON.parse(input);

				if (typeof data !== 'object') {
					return false;
				}
			}
			catch (e) {
				return false;
			}
		}
		else if (typeof input === 'object') {
			data = input;
		}
		else {
			return false;
		}

		let tracker = this._parent;
		let settings = tracker.settings;
		let player = tracker.player;

		let count = { smp: 0, orn: 0, pat: 0, pos: 0 };

		// detection of old JSON format v1.1 from previous project MIF85Tracker...
		if (!data.version || (data.version && data.version !== '1.2')) {
			return false;
		}

		player.clearSong(true);

		//~~~ CREDITS ~~~
		tracker.songTitle = data.title || '';
		tracker.songAuthor = data.author || '';

		//~~~ SAMPLES ~~~
		if (data.samples && data.samples.length) {
			for (let i: number = 1, obj: any; i < 32; i++) {
				if (!!(obj = data.samples[i - 1])) {
					let it = player.sample[i];

					if (obj.name) {
						it.name = obj.name;
					}

					it.loop = obj.loop || 0;
					it.end = obj.end || 0;
					it.releasable = !!obj.rel;

					if (obj.data != null) {
						it.parse(obj.data);
					}

					count.smp++;
				}
			}
		}

		//~~~ ORNAMENTS ~~~
		if (data.ornaments && data.ornaments.length) {
			for (let i: number = 1, obj: any; i < 16; i++) {
				if (!!(obj = data.ornaments[i - 1])) {
					let it = player.ornament[i];

					if (obj.name) {
						it.name = obj.name;
					}

					it.loop = obj.loop || 0;
					it.end = obj.end || 0;

					if (obj.data != null) {
						it.parse(obj.data);
					}

					count.orn++;
				}
			}
		}

		//~~~ PATTERNS ~~~
		if (data.patterns) {
			data.patterns.forEach(obj => {
				let newIdx = player.addNewPattern();
				let it = player.pattern[newIdx];
				it.end = obj.end || 0;

				if (obj.data != null) {
					it.parse(obj.data);
				}

				count.pat++;
			});
		}

		//~~~ POSITIONS ~~~
		if (data.positions) {
			data.positions.forEach((obj, i) => {
				let it = player.addNewPosition(obj.length, obj.speed);

				for (let k: number = 0; k < 6; k++) {
					let s: string = obj.ch[k];
					it.ch[k].pattern = parseInt(s.substr(0, 3), 10) || 0;
					it.ch[k].pitch = parseInt(s.substr(3), 10) || 0;
				}

				player.countPositionFrames(i);
				player.storePositionRuntime(i);
				count.pos++;
			});
		}

		//~~~ CURRENT STATE ~~~
		if (typeof data.current === 'object') {
			let o: any = data.current;

			player.repeatPosition        = data.repeatPos || 0;
			player.currentPosition       = o.position || 0;
			player.currentLine           = o.line || 0;

			tracker.workingPattern       = o.pattern || 0;
			tracker.workingSample        = o.sample || 1;
			tracker.workingOrnament      = o.ornament || 1;
			tracker.workingOrnTestSample = o.ornSample || 1;
			tracker.workingSampleTone    = o.smpornTone || 37;
			tracker.modeEditChannel      = o.channel || 0;
			tracker.modeEditColumn       = o.column || 0;

			let c: any = Object.assign({}, data.ctrl, data.config);

			player.loopMode              = c.loopMode || true;

			tracker.ctrlOctave           = c.octave || 2;
			tracker.ctrlSample           = c.sample || 0;
			tracker.ctrlOrnament         = c.ornament || 0;
			tracker.ctrlRowStep          = c.rowStep || 0;
			tracker.activeTab            = c.activeTab || 0;
			tracker.modeEdit             = c.editMode || false;

			let int = c.interrupt || 50;
			if (settings.audioInterrupt !== int) {
				settings.audioInterrupt = int;
				// settings.audioInit();
			}
		}

		devLog('Tracker.file', 'JSON file successfully parsed and loaded... %o', {
			title: data.title,
			author: data.author,
			samples: count.smp,
			ornaments: count.orn,
			patterns: count.pat,
			positions: count.pos,
			version: data.version
		});

		this._updateAll();
		return true;
	}

//---------------------------------------------------------------------------------------

	/**
	 * This method creates JSON format (version 1.2) of song data from tracker,
	 * more specifically full snapshot of tracker state.
	 * @param pretty {boolean} set if you want pretty-formatted JSON output.
	 */
	createJSON(pretty?: boolean): string {
		let tracker = this._parent;
		let settings = tracker.settings;
		let player = tracker.player;

		let output: STMFileFormat = {
			title:     tracker.songTitle,
			author:    tracker.songAuthor,
			samples:   [],
			ornaments: [],
			patterns:  [],
			positions: [],
			repeatPos: player.repeatPosition,

			current: {
				sample:     tracker.workingSample,
				ornament:   tracker.workingOrnament,
				ornSample:  tracker.workingOrnTestSample,
				smpornTone: tracker.workingSampleTone,

				position:   player.currentPosition,
				pattern:    tracker.workingPattern,

				line:       player.currentLine,
				channel:    tracker.modeEditChannel,
				column:     tracker.modeEditColumn
			},
			ctrl: {
				octave:   tracker.ctrlOctave,
				sample:   tracker.ctrlSample,
				ornament: tracker.ctrlOrnament,
				rowStep:  tracker.ctrlRowStep
			},
			config: {
				interrupt: settings.audioInterrupt,
				activeTab: tracker.activeTab,
				editMode:  tracker.modeEdit,
				loopMode:  player.loopMode
			},

			version: '1.2'
		};

		// storing samples going backward and unshifting array...
		for (let i: number = 31; i > 0; i--) {
			let it = player.sample[i];
			let obj: any = {
				loop: it.loop,
				end:  it.end,
				data: it.export()
			};

			if (it.name) {
				obj.name = it.name;
			}
			if (it.releasable) {
				obj.rel = it.releasable;
			}

			// for optimize reasons, we are detecting empty items in arrays...
			if (!obj.data.length && !obj.loop && !obj.end && !obj.rel && !obj.name) {
				obj = null;
			}
			if (!output.samples.length && obj == null) {
				continue;
			}

			output.samples.unshift(obj);
		}

		// storing ornaments going backward and unshifting array...
		for (let i: number = 15; i > 0; i--) {
			let it = player.ornament[i];
			let obj: any = {
				loop: it.loop,
				end:  it.end,
				data: it.export()
			};

			if (it.name) {
				obj.name = it.name;
			}

			// for optimize reasons, we are detecting empty items in arrays...
			if (!obj.data.length && !obj.loop && !obj.end && !obj.name) {
				obj = null;
			}
			if (!output.ornaments.length && obj == null) {
				continue;
			}

			output.ornaments.unshift(obj);
		}

		// storing patterns...
		for (let i: number = 1, l = player.pattern.length; i < l; i++) {
			let it = player.pattern[i];
			let obj: any = {
				end:  it.end,
				data: it.export()
			};

			// for optimize reasons, we are detecting empty items in arrays...
			if (!obj.data.length && !obj.end) {
				obj = null;
			}
			if (!output.patterns.length && obj == null) {
				continue;
			}

			output.patterns.push(obj);
		}

		// storing positions, no optimizations needed...
		output.positions = player.position.map(it => ({
			length: it.length,
			speed:  it.speed,
			ch:     it.export()
		}));

		return pretty ?
			JSON.stringify(output, null, '\t').replace(/\},\n\t+?\{/g, '}, {') :
			JSON.stringify(output);
	}

	new(): void {
		let tracker = this._parent;
		let player = tracker.player;

		player.clearSong(true);

		tracker.songTitle = '';
		tracker.songAuthor = '';

		player.currentPosition = 0;
		player.repeatPosition = 0;
		player.currentLine = 0;

		tracker.modeEdit = false;
		tracker.modeEditChannel = 0;
		tracker.modeEditColumn = 0;
		tracker.workingPattern = 0;

		this.modified = false;
		this.yetSaved = false;
		this.fileName = '';

		this._updateAll();
	}

	loadFile(fileNameOrId: string|number): boolean {
/*
		let name: string;
		if (typeof fileNameOrId === 'string') {
			name = this._fixFileName(fileNameOrId);
		}

		let found = this._storageMap.find(obj => (
			(name && obj.fileName === name) ||
			(!name && typeof fileNameOrId === 'number' && obj.id === fileNameOrId)
		));

		if (!found) {
			devLog('Tracker.file', 'File "' + fileNameOrId + '" not found!');
			return false;
		}
		else if (!name) {
			name = found.fileName;
		}

		devLog('Tracker.file', 'Loading "%s" from localStorage...', name);
		let data = localStorage.getItem(found.storageId + '-dat');
		devLog('Tracker.file', 'Compressed JSON file format loaded, size: ' + (data.length << 1));
		data = LZString.decompressFromUTF16(data);
		devLog('Tracker.file', 'After LZW decompression has %d bytes, parsing...', data.length);

		if (!this._parseJSON(data)) {
			devLog('Tracker.file', 'JSON file parsing failed!');
			return false;
		}

		data = null; // force gc
		this.modified = false;
		this.yetSaved = true;
		this.fileName = name;
*/
		return true;
	}

	saveFile(fileName: string, duration: string, oldId?: number) {
/*
		fileName = this._fixFileName(fileName);
		devLog('Tracker.file', 'Storing "%s" to localStorage...', fileName);

		let modify = false;
		let found = this._storageMap.find(obj => {
			if (obj.id === oldId || obj.fileName === fileName) {
				devLog('Tracker.file', 'File ID:%s exists, will be overwritten...', obj.storageId);
				return (modify = true);
			}
			return false;
		});

		if (typeof oldId === 'number' && !modify) {
			devLog('Tracker.file', 'Cannot find given storageId: %d!', oldId);
			return false;
		}

		let data = this.createJSON();
		devLog('Tracker.file', 'JSON file format built, original size: ' + data.length);
		data = LZString.compressToUTF16(data);
		devLog('Tracker.file', 'Compressed with LZW to ' + (data.length << 1));

		let now: number = (Date.now() / 1000).abs();
		let storageItem: StorageItem;

		if (modify) {
			storageItem = found;
			storageItem.fileName = fileName;
			storageItem.timeModified = now;
			storageItem.duration = duration;
			storageItem.length = data.length;
		}
		else {
			storageItem = {
				id: ++this._storageLastId,
				storageId: 'stmf' + this._storageLastId.toHex(3),
				fileName: fileName,
				timeCreated: now,
				timeModified: now,
				duration: duration,
				length: data.length
			};
		}

		localStorage.setItem(storageItem.storageId + '-nfo', fileName.concat(
			'|', storageItem.timeCreated.toString(),
			'|', storageItem.timeModified.toString(),
			'|', storageItem.duration
		));

		localStorage.setItem(storageItem.storageId + '-dat', data);

		if (!modify) {
			this._storageMap.push(storageItem);
		}
		this._storageSortAndSum();

		data = null; // force gc
		this.yetSaved = true;
		this.modified = false;
		this.fileName = storageItem.fileName;

		devLog('Tracker.file', 'Everything stored into localStorage...');
*/
		return true;
	}

	importFile() {
/*
		let file = this;

		this.system.load(false, '.STMF,' + mimeType).then(data => {
			devLog('Tracker.file', 'File loaded, trying to parse...');
			if (!file._parseJSON(<string> data)) {
				devLog('Tracker.file', 'JSON file parsing failed!');
			}

			file.modified = true;
			file.yetSaved = false;
			file.fileName = '';
		});
*/
	}

	exportFile() {
/*
		let data = this.createJSON(true);
		let fileName = this.getFixedFileName();

		this.system.save(data, fileName + '.STMF', mimeType);
*/
	}
}
