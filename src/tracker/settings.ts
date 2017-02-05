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

	set tracklistAutosize(state) { this._options.tracklistAutosize = state; }
	set tracklistLines(lines) { this._options.tracklistLines = lines; }
	set tracklistLineHeight(h) { this._options.tracklistLineHeight = h; }
	set hexTracklines(state) { this._options.hexTracklines = state; }
	set hexSampleFreq(state) { this._options.hexSampleFreq = state; }
	set audioInterrupt(int) { this._options.audioInterrupt = int; }
	set audioBuffers(count) { this._options.audioBuffers = count; }
	set audioGain(value) {
		let volume = Math.min(Math.max(0, value / 100), 2);
		this._options.audioGain = volume;
		AudioDriver.volume = volume;
	}

	private _populateElements() {
		$('#chSetTrkAutosize').prop('checked', this._options.tracklistAutosize);
		$('#scSetTrkLines').val(this._options.tracklistLines);
		$('#scSetTrkLineHeight').val(this._options.tracklistLineHeight);
		$('#chSetHexTracklist').prop('checked', this._options.hexTracklines);
		$('#chSetHexFreqShifts').prop('checked', this._options.hexSampleFreq);
		$('#rgSetAudioVolume').val(this._options.audioGain * 100);
		$('#rgSetAudioBuffers').val(this._options.audioBuffers);
		$('#rdSetAudioInt' + this._options.audioInterrupt).prop('checked', true);

		this.updateLatencyInfo();
	}

	private _applyChanges(backup: SettingsOptions) {
		localStorage.setItem('settings', JSON.stringify(this._options));

		if (backup.audioBuffers !== this._options.audioBuffers ||
			backup.audioInterrupt !== this._options.audioInterrupt) {

			this.audioInit();
		}
		if (backup.tracklistAutosize !== this._options.tracklistAutosize ||
			backup.tracklistLineHeight !== this._options.tracklistLineHeight ||
			backup.tracklistLines !== this._options.tracklistLines ||
			backup.hexTracklines !== this._options.hexTracklines) {

			$(window).trigger('resize', [ true ]);
		}
		if (backup.hexSampleFreq !== this._options.hexSampleFreq ||
			this.$app.activeTab === 1) {

			this.$app.smpornedit.updateSamplePitchShift();
		}
	}

	public audioInit() {
		let tracker = this.$app;
		if (tracker.modePlay) {
			tracker.onCmdStop();
		}

		let int = this._options.audioInterrupt;
		tracker.player.setInterrupt(int);
		$('#rdSetAudioInt' + int).prop('checked', true);

		AudioDriver.init(tracker.player, this._options.audioBuffers, int);
		AudioDriver.play();
	}

	public updateLatencyInfo() {
		let smpRate = AudioDriver.sampleRate;
		let samples = AudioDriver.getAdjustedSamples(smpRate,
			this._options.audioBuffers,
			this._options.audioInterrupt
		);

		let milisec = ((samples / smpRate) * 1000).abs();
		$('#rgSetAudioBuffers').next().html(`<b>Latency:</b> ${samples} samples <i>(${milisec} ms)</i>`);
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
		this.audioInit();
	}

	public show() {
		let currentOptionsBackup: SettingsOptions = Object.assign({}, this._options);

		let wasApplied = false;
		let fnApply = this._applyChanges.bind(this);

		let tracker = this.$app;
		tracker.globalKeyState.inDialog = true;
		this._obj.on('show.bs.modal', $.proxy(() => {
			this._obj
				.before($('<div/>')
				.addClass('modal-backdrop in').css('z-index', '1030'));

			$('#chSetTrkAutosize').trigger('change');
			this._obj.find('.apply').click((() => {
				wasApplied = true;
				setTimeout(fnApply, 0, currentOptionsBackup);

				this._obj.modal('hide');
				return true;
			}).bind(this));

		}, this)).on('hide.bs.modal', $.proxy(() => {
			this._obj.prev('.modal-backdrop').remove();
			this._obj.find('.modal-footer>.btn').off();
			this._obj.off();

			if (!wasApplied) {
				// restore previous options
				Object.assign(this._options, currentOptionsBackup);
				this._populateElements();
			}

			AudioDriver.volume = this._options.audioGain;
			tracker.globalKeyState.inDialog = false;

		}, this)).modal({
			show: true,
			backdrop: false
		});
	}
}
