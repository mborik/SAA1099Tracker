/*
 * Tracker file dialog sub-class.
 * Copyright (c) 2015-2017 Martin Borik <mborik@users.sourceforge.net>
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
/// <reference path="../index.d.ts" />
//---------------------------------------------------------------------------------------
interface SettingsOptions {
	tracklistAutosize: boolean;
	tracklistLines: number;
	tracklistLineHeight: number;
	hexTracklines: boolean;
	hexSampleFreq: boolean;
	audioInterrupt: number;
	audioBuffers: number;
	audioGain: number;
}
//---------------------------------------------------------------------------------------
class Settings {
	constructor(private $app: Tracker) {}

	private _obj: JQuery = null;
	private _options: SettingsOptions = {
		tracklistAutosize: true,
		tracklistLines: 17,
		tracklistLineHeight: 9,
		hexTracklines: true,
		hexSampleFreq: false,
		audioInterrupt: 50,
		audioBuffers: 4,
		audioGain: 1.0
	};

	get tracklistAutosize(): boolean { return this._options.tracklistAutosize; }
	get tracklistLines(): number { return this._options.tracklistLines; }
	get tracklistLineHeight(): number { return this._options.tracklistLineHeight; }
	get hexTracklines(): boolean { return this._options.hexTracklines; }
	get hexSampleFreq(): boolean { return this._options.hexSampleFreq; }
	get audioInterrupt(): number { return this._options.audioInterrupt; }
	get audioBuffers(): number { return this._options.audioBuffers; }
	get audioGain(): number { return this._options.audioGain; }

	set tracklistLines(lines) { this._options.tracklistLines = lines; }
	set audioInterrupt(int) {
		if (int !== this._options.audioInterrupt && (int === 50 || int === 32)) {
			this._options.audioInterrupt = int;
			this._audioInit();
		}
	}

	private _populateElements() {
	}

	public _audioInit() {
		let tracker = this.$app;
		if (tracker.modePlay) {
			tracker.onCmdStop();
		}

		AudioDriver.init(
			tracker.player,
			this._options.audioBuffers,
			this._options.audioInterrupt
		);

		AudioDriver.play();
	}

	public init() {
		this._obj = $('#settings');

		try {
			let input = localStorage.getItem('settings') || '{}';
			let userOptions = JSON.parse(input);
			Object.assign(this._options, userOptions);
		}
		catch (e) {}

		console.log('Settings', 'User options fetched from localStorage %o...', this._options);

		this._populateElements();
		this._audioInit();
	}

	public show() {
		let tracker = this.$app;

		tracker.globalKeyState.inDialog = true;
		this._obj.on('show.bs.modal', $.proxy(() => {
			this._obj
				.before($('<div/>')
				.addClass('modal-backdrop in').css('z-index', '1030'));

		}, this)).on('shown.bs.modal', $.proxy(() => {
			// TODO

		}, this)).on('hide.bs.modal', $.proxy(() => {
			this._obj.prev('.modal-backdrop').remove();
			this._obj.off();
			this._obj.find('.modal-footer>.btn').off();
			tracker.globalKeyState.inDialog = false;

		}, this)).modal({
			show: true,
			backdrop: false
		});
	}
}
