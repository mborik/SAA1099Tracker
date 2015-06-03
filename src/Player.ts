/*!
 * Player: Core of player routine.
 * Copyright (c) 2012-2016 Martin Borik <mborik@users.sourceforge.net>
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
var pMode = {
	PM_NOT: 0,
	PM_SONG: 1,
	PM_POSITION: 2,
	PM_SAMPLE: 4,
	PM_LINE: 8
};

class pTone {
	public cent: number = 0;
	public oct: number = 0;
	public txt: string = '---';

	get word(): number { return ((this.cent & 0xff) | ((this.oct & 0x07) << 8)); }
	set word(v: number) {
		this.cent = (v & 0xff);
		this.oct = (v >> 8) & 0x07;
	}
}

class pVolume {
	public L: number = 0;
	public R: number = 0;

	get byte(): number { return ((this.L & 0x0f) | ((this.R & 0x0f) << 4)); }
	set byte(v: number) {
		this.L = (v & 0x0f);
		this.R = (v >> 4) & 0x0f;
	}
}

interface pOrnament {
	name: string;
	data: Uint8Array;
	loop: number;
	end: number;
}

interface pSampleData {
	volume: pVolume;
	enable_freq: boolean;
	enable_noise: boolean;
	noise_value: number;
	shift: number;
}

interface pSample {
	name: string;
	data: pSampleData[];
	loop: number;
	end: number;
	releasable: boolean;
}

interface pPatternLine {
	tone: number;
	release: boolean;
	smp: number;
	orn: number;
	orn_release: boolean;
	volume: pVolume;
	cmd: number;
	cmd_data: number;
}

interface pPattern {
	data: pPatternLine[];
	end: number;
}

interface pChannel {
	pattern: number;
	pitch: number
}

class pPosition {
	public ch: pChannel[];
	public length: number;
	public speed: number;
	public frames: number[];

	constructor(length: number, speed: number = 6) {
		for (var i: number = 0; i < 6; i++)
			this.ch[i] = { pattern: 0, pitch: 0 };
		for (var i: number = 0, line: number = 0; line <= 96; line++, i+= speed)
			this.frames[line] = i;

		this.length = length;
		this.speed = speed;
	}

	public hasPattern(pattern: number): boolean { return this.indexOf(pattern) >= 0; }
	public indexOf(pattern: number): number {
		for (var i: number, r: number = -1; r < 0 && i < 6; i++)
			if (this.ch[i].pattern === pattern)
				r = i;
		return r;
	}
}

interface pParams {
	tone: number;
	playing: boolean;
	sample: pSample;
	ornament: pOrnament;
	sample_cursor: number;
	ornament_cursor: number;
	attenuation: pVolume;
	slideShift: number;
	globalPitch: number;
	released: boolean;
	command: number;
	commandParam: number;
	commandPhase: number;
	commandValue1: number;
	commandValue2: number;
}
//---------------------------------------------------------------------------------------
class Player {
	private SAA1099: any;

	public tones: pTone[];
	public sample: pSample[];
	public ornament: pOrnament[];
	public pattern: pPattern[];
	public position: pPosition[];

	public changedLine: boolean;
	public changedPosition: boolean;
	public currentPosition: number;
	public repeatPosition: number;
	public currentSpeed: number;
	public currentLine: number;
	public currentTick: number;

	private mode: number;
	private playParams: pParams[];
	private lastEnabledFreq: number;
	private lastEnabledNoise: number;
	private lastNoiseCharacter: number;

	constructor(saa: any) {
		this.SAA1099 = saa;

		this.sample = [];
		this.ornament = [];
		this.playParams = [];

		var tab_tones: string[] = [
			"\x05B-",
			"\x21C-",
			"\x3CC#",
			"\x55D-",
			"\x6DD#",
			"\x84E-",
			"\x99F-",
			"\xADF#",
			"\xC0G-",
			"\xD2G#",
			"\xE3A-",
			"\xF3A#",
			"\xFFB-"
		];

		this.tones[0] = new pTone;
		var i: number, o: number, p: number, c: number;
		for (i = 1, o = 0, p = 1; i <= 96; i++, p++) {
			this.tones[i].txt = tab_tones[p].substr(1) + (o + 1);

			c = tab_tones[p].charCodeAt(0);
			if (c === 255 && o !== 7) {
				o++;
				p = 0;
			}

			this.tones[i].oct = o;
			this.tones[i].cent = c;
		}

		this.clearSong();
		this.clearSamples();
		this.clearOrnaments();

		for (c = 0; c < 6; c++)
			this.clearPlayParams(c);

		this.lastEnabledFreq = this.lastEnabledNoise = this.lastNoiseCharacter = 0;

		this.stopChannel(0);
		this.mode = pMode.PM_NOT;
	}

	public clearSong() {
		this.position = [];
		this.pattern = [];
		this.addNewPattern();

		this.changedLine = true;
		this.changedPosition = true;
		this.currentPosition = 0;
		this.repeatPosition = 0;
		this.currentSpeed = 6;
		this.currentLine = 0;
		this.currentTick = 0;
	}

	public clearSamples() {
		for (var i: number = 0; i < 32; i++) {
			this.sample[i] = { name: '', data: [], loop: 0, end: 0, releasable: false };
			for (var c: number = 0; c < 256; c++)
				this.sample[i].data[c] = { volume: new pVolume, enable_freq: false, enable_noise: false, noise_value: 0, shift: 0 }
		}
	}

	public clearOrnaments() {
		for (var i: number = 0; i < 16; i++)
			this.ornament[i] = { name: '', data: new Uint8Array(256), loop: 0, end: 0 };
	}

	private clearPlayParams(chn: number) {
		this.playParams[chn] = { tone: 0, playing: false, sample: this.sample[0], ornament: this.ornament[0], sample_cursor: 0, ornament_cursor: 0, attenuation: new pVolume, slideShift: 0, globalPitch: 0, released: false, command: 0, commandParam: 0, commandPhase: 0, commandValue1: 0, commandValue2: 0 };
	}

	public addNewPattern(): number {
		var i: number,
			index: number = this.pattern.length,
			pt: pPattern = { data: [], end: 0 };

		for (i = 0; i < 96; i++)
			pt.data[i] = { tone: 0, release: false, smp: 0, orn: 0, orn_release: false, volume: new pVolume, cmd: 0, cmd_data: 0 };

		this.pattern.push(pt);
		return index;
	}
//---------------------------------------------------------------------------------------
	private prepareFrame(): void {
		if (this.mode === pMode.PM_NOT)
			return;

		var pp: pParams,
			wVol: pVolume,
			height: number, val: number = 0,
			chn: number, chn2nd: number, chn3rd: number,
			oct: number, noise: number, cmd: number, paramH: number, paramL: number,
			eMask: number,
			eFreq: number = this.lastEnabledFreq,
			eNoiz: number = this.lastEnabledNoise,
			eChar: number = this.lastNoiseCharacter;

		var smpdat_at_cursor = function () { return pp.sample.data[pp.sample_cursor] },
			orndat_at_cursor = function () { return pp.ornament.data[pp.ornament_cursor] };

		for (chn = 5; chn >= 0; chn--) {
			pp = this.playParams[chn];

			eMask = (1 << chn);
			chn2nd = (chn >> 1);
			chn3rd = (chn / 3);

			if (pp.playing) {
				wVol.byte = smpdat_at_cursor().volume.byte;
				height = orndat_at_cursor();
				noise = smpdat_at_cursor().noise_value | (smpdat_at_cursor().noise_value << 2);

				cmd = pp.command;
				paramH = (pp.commandParam & 0xf0) >> 4;
				paramL = (pp.commandParam & 0x0f);

//				switch (cmd)

				// reset command if not needed anymore...
				if (cmd < 0) {
					pp.command = 0;
					pp.commandParam = 0;
					pp.commandPhase = 0;
				}

				// apply attenuation
				wVol.L = Math.max(0, (wVol.L - pp.attenuation.L));
				wVol.R = Math.max(0, (wVol.R - pp.attenuation.L));

			//~ SAA1099 DATA 00-05: Amplitude controller 0-5
				this.SAA1099.WriteAddressData(chn, wVol.byte);
			}
		}
	}

	private prepareLine() {
	}

	public stopChannel(chn: number) {
		if (chn < 0 || chn > 6)
			return;
		else if (chn === 0) {
			for (; chn < 6; chn++)
				this.clearPlayParams(chn);

			this.mode = pMode.PM_LINE;
			this.prepareFrame();
			this.currentTick = 0;
			this.changedLine = true;
			return;
		}

		chn--;
		this.clearPlayParams(chn);
	}
}
