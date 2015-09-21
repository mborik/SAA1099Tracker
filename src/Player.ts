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
/// <reference path='../saa/SAASound.d.ts' />
//---------------------------------------------------------------------------------------
var pMode = {
	PM_SONG: 1,
	PM_POSITION: 2,
	PM_SONG_OR_POS: 3,
	PM_SAMPLE: 4,
	PM_LINE: 8,
	PM_SAMP_OR_LINE: 12
};

// Tone parameters interface
class pTone {
	public cent: number = 0;
	public oct: number = 0;
	public txt: string = '---';

	constructor (word: number = 0) { this.word = word }

	get word(): number { return ((this.cent & 0xff) | ((this.oct & 0x07) << 8)); }
	set word(v: number) {
		this.cent = (v & 0xff);
		this.oct = (v & 0x700) >> 8;
	}
}

// Volume/Attenuation value interface (byte value splitted into left/right channel)
class pVolume {
	public L: number = 0;
	public R: number = 0;

	get byte(): number { return ((this.L & 0x0f) | ((this.R & 0x0f) << 4)); }
	set byte(v: number) {
		this.L = (v & 0x0f);
		this.R = (v >> 4) & 0x0f;
	}
}

// Ornament interface (data length = 256)
interface pOrnament {
	name: string;
	data: Int8Array;
	loop: number;
	end: number;
}

// Sample data interface
interface pSampleData {
	volume: pVolume;
	enable_freq: boolean;
	enable_noise: boolean;
	noise_value: number;
	shift: number;
}

// Sample interface (data length = 256)
interface pSample {
	name: string;
	data: pSampleData[];
	loop: number;
	end: number;
	releasable: boolean;
}

// Channel-pattern line interface
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

// Pattern interface (data length = 96)
interface pPattern {
	data: pPatternLine[];
	end: number;
}

// Position channel definition interface
interface pChannel {
	pattern: number;
	pitch: number
}

/**
 * Position class declaration with 6 channels definition, length and default speed.
 * @property frames Number of interupts which takes every line in tracklist;
 */
class pPosition {
	public ch: pChannel[];
	public speed: number;
	public length: number;
	public frames: number[];

	constructor(length: number, speed: number = 6) {
		this.ch = [];
		this.speed = speed;
		this.length = length;
		this.frames = [];

		for (var i: number = 0; i < 6; i++)
			this.ch[i] = { pattern: 0, pitch: 0 };
		for (var i: number = 0, line: number = 0; line <= 96; line++, i+= speed)
			this.frames[line] = i;
	}

	public hasPattern(pattern: number): boolean { return this.indexOf(pattern) >= 0; }
	public indexOf(pattern: number): number {
		for (var i: number = 0, r: number = -1; r < 0 && i < 6; i++)
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

class pMixer {
	index: number = 0;
	length: number = 0;
}
//---------------------------------------------------------------------------------------
class Player {
	public SAA1099: SAASound;

	public tones: pTone[];
	public sample: pSample[];
	public ornament: pOrnament[];
	public pattern: pPattern[];
	public position: pPosition[];
	public nullPosition: pPosition;

	public loopMode: boolean;
	public changedLine: boolean;
	public changedPosition: boolean;
	public currentPosition: number;
	public repeatPosition: number;
	public currentSpeed: number;
	public currentLine: number;
	public currentTick: number;

	private mode: number;
	private playParams: pParams[];

	private mixer: pMixer = new pMixer;

	constructor(SAA1099: SAASound) {
		this.SAA1099 = SAA1099;

		this.sample = [];
		this.ornament = [];
		this.playParams = [];
		this.nullPosition = new pPosition(64, 6);

		var tab_tones: any[] = [
			{ freq: 0x05, prefix: 'B-' },
			{ freq: 0x21, prefix: 'C-' },
			{ freq: 0x3C, prefix: 'C#' },
			{ freq: 0x55, prefix: 'D-' },
			{ freq: 0x6D, prefix: 'D#' },
			{ freq: 0x84, prefix: 'E-' },
			{ freq: 0x99, prefix: 'F-' },
			{ freq: 0xAD, prefix: 'F#' },
			{ freq: 0xC0, prefix: 'G-' },
			{ freq: 0xD2, prefix: 'G#' },
			{ freq: 0xE3, prefix: 'A-' },
			{ freq: 0xF3, prefix: 'A#' },
			{ freq: 0xFF, prefix: 'B-' }
		];

		this.tones = [ new pTone ];
		for (var i: number = 1, o: number = 0, p: number = 1, c: number, t: pTone; i <= 96; i++, p++) {
			t = new pTone;
			t.txt = tab_tones[p].prefix + (o + 1);

			c = tab_tones[p].freq;
			if (c === 0xff && o < 7) {
				o++;
				p = 0;
				c = tab_tones[p].freq;
			}

			t.oct = o;
			t.cent = c;
			this.tones[i] = t;
		}

		this.clearSong();
		this.clearSamples();
		this.clearOrnaments();

		this.loopMode = true;
		this.setInterrupt(50);

		this.stopChannel(0);
		this.mode = 0;
	}

	/** Clear song (positions, patterns, pointers and playParams). */
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

		for (var chn: number = 0; chn < 6; chn++)
			this.clearPlayParams(chn);
	}

	/** Clear all samples. */
	public clearSamples() {
		for (var i: number = 0; i < 32; i++) {
			this.sample[i] = { name: '', data: [], loop: 0, end: 0, releasable: false };
			for (var c: number = 0; c < 256; c++)
				this.sample[i].data[c] = { volume: new pVolume, enable_freq: false, enable_noise: false, noise_value: 0, shift: 0 }
		}
	}

	/** Clear all ornaments. */
	public clearOrnaments() {
		for (var i: number = 0; i < 16; i++)
			this.ornament[i] = { name: '', data: new Int8Array(256), loop: 0, end: 0 };
	}

	/**
	 * Reset playParams for particular channel to default values.
	 * @param chn Channel number;
	 */
	private clearPlayParams(chn: number) {
		if (this.playParams[chn]) {
			delete this.playParams[chn].attenuation;
			this.playParams[chn] = null;
		}
		this.playParams[chn] = { tone: 0, playing: false, sample: this.sample[0], ornament: this.ornament[0], sample_cursor: 0, ornament_cursor: 0, attenuation: new pVolume, slideShift: 0, globalPitch: 0, released: false, command: 0, commandParam: 0, commandPhase: 0, commandValue1: 0, commandValue2: 0 };
	}

	/**
	 * Create bare pattern at the end of the array of patterns and return it's number.
	 * @returns {number} new pattern number
	 */
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
	/**
	 * Set processor's interrupt of virtual pseudo-emulated 8bit computer to the mixer.
	 * @param freq Interrupt frequency in Hz;
	 */
	public setInterrupt(freq: number) {
		this.mixer.length = SAASound.sampleRate / freq;
	}

	/**
	 * Method which provides audio data of both channels separately for AudioDriver
	 * and calling prepareFrame() every interrupt of 8bit processor.
	 * @param leftBuf TypedArray of 32bit float type;
	 * @param rightBuf TypedArray of 32bit float type;
	 * @param length of buffer;
	 */
	public getAudio(leftBuf: Float32Array, rightBuf: Float32Array, length: number) {
		if (!this.mode)
			return this.SAA1099.output(leftBuf, rightBuf, length);

		var outi = 0, remain;
		while (outi < length) {
			if (this.mixer.index >= this.mixer.length) {
				this.mixer.index = 0;
				this.prepareFrame();
			}

			remain = this.mixer.length - this.mixer.index;
			if ((outi + remain) > length)
				remain = length - outi;

			this.SAA1099.output(leftBuf, rightBuf, remain, outi);
			this.mixer.index += remain;
			outi += remain;
		}
	}

	/**
	 * Most important part of Player: Method needs to be called every interrupt/frame.
	 * It handles all the pointers and settings to output values on SAA1099 registers.
	 */
	private prepareFrame(): void {
		if (!this.mode)
			return;

		var pp: pParams,
			vol: pVolume = new pVolume,
			height: number, val: number = 0,
			chn: number, chn2nd: number, chn3rd: number,
			oct: number = 0, noise: number, cmd: number, paramH: number, paramL: number,
			samp: pSampleData, tone: pTone, c: number,
			eMask: number, eFreq: number = 0, eNoiz: number = 0, eChar: number = 0;

		// We processing channels backward! It's because of SAA1099 register architecture
		// which expect settings for pairs or triplets of adjacent channels. We need
		// to know e.g. tone octave of every pair of channel and store to one register.
		// A similar case are settings for noise registers for every triplet of channels
		// and we want to have noise/envelope settings priority from left to right.
		// Therefore, it is better to go from 6th channel to 1st and group it's values...
		for (chn = 5; chn >= 0; chn--) {
			// pick playParams for channel...
			pp = this.playParams[chn];

			eMask  = (1 << chn);      // bit mask of channel
			chn2nd = (chn >> 1);      // calculate pair of channels
			chn3rd = ((chn / 3) & 1); // calculate triple of channels

			if (pp.playing) {
				// if playback in channel is enabled, fetch all smp/orn values...
				samp = pp.sample.data[pp.sample_cursor];
				vol.byte = samp.volume.byte;
				height = pp.ornament.data[pp.ornament_cursor];
				noise = samp.noise_value | (<any>samp.enable_noise << 2);

				// get command on trackline and calculate nibbles of command parameter...
				cmd = pp.command;
				paramH = (pp.commandParam & 0xf0) >> 4;
				paramL = (pp.commandParam & 0x0f);

				switch (cmd) {
				// portamento up/down
					case 0x1:
					case 0x2:
						if (!pp.commandPhase && pp.commandParam)
							pp.commandPhase = paramH;
						if (pp.commandPhase && !(--pp.commandPhase))
							pp.slideShift += paramL * ((cmd & 1) ? 1 : -1);
						break;

				// glissando to given note
					case 0x3:
						if (!pp.commandPhase && pp.commandParam)
							pp.commandPhase = paramH;
						if (pp.commandValue1 && pp.commandPhase && !(--pp.commandPhase)) {
							if (pp.commandValue2 > 0) {
								pp.slideShift += paramL;
								if (pp.slideShift >= pp.commandValue2) {
									pp.tone = pp.commandValue1;
									pp.slideShift = pp.commandValue1 = pp.commandValue2 = 0;
									cmd = -1;
								}
							}
							else {
								pp.slideShift -= paramL;
								if (pp.slideShift <= pp.commandValue2) {
									pp.tone = pp.commandValue1;
									pp.slideShift = pp.commandValue1 = pp.commandValue2 = 0;
									cmd = -1;
								}
							}
						}
						break;

				// vibrato
					case 0x4:
						if (pp.commandParam) {
							if (paramH)
								pp.commandPhase = (pp.commandPhase + paramH) & 0x3F;
							else
								pp.commandPhase = 0;
							pp.slideShift = Player.vibratable[(paramL << 6) + pp.commandPhase];
						}
						else
							pp.slideShift = 0;

						break;

				// tremolo
					case 0x5:
						if (pp.commandParam) {
							if (paramH)
								pp.commandPhase = (pp.commandPhase + paramH) & 0x3F;
							else
								pp.commandPhase = 0;

							val = pp.commandValue2;
							pp.commandValue2 = Player.vibratable[(paramL << 6) + pp.commandPhase];
							val = -(pp.commandValue2 - val);

							if (val == 0)
								break;

							if ((pp.attenuation.L + val) < 0)
								pp.attenuation.L = 0;
							else if ((pp.attenuation.L + val) > 15)
								pp.attenuation.L = 15;
							else
								pp.attenuation.L += val;
							if ((pp.attenuation.R + val) < 0)
								pp.attenuation.R = 0;
							else if ((pp.attenuation.R + val) > 15)
								pp.attenuation.R = 15;
							else
								pp.attenuation.R += val;
						}
						break;

				// delay ornament by ticks
					case 0x6:
						if (pp.commandParam) {
							pp.commandPhase = pp.commandParam;
							pp.commandParam = 0;
						}
						if (pp.commandPhase) {
							height = 0;
							pp.commandPhase--;
						}
						else {
							pp.ornament_cursor = 0;
							height = pp.ornament.data[pp.ornament_cursor];
							cmd = -1;
						}
						break;

				// ornament offset
					case 0x7:
						if (pp.commandParam > 0 && pp.commandParam < pp.ornament.end) {
							height = 0;
							pp.ornament_cursor = pp.commandParam;
						}
						cmd = -1;
						break;

				// sample offset
					case 0x9:
						if (pp.commandParam > 0 &&
							(pp.sample.releasable || pp.commandParam < pp.sample.end)) {

							pp.sample_cursor = pp.commandParam;
							samp = pp.sample.data[pp.sample_cursor];
							vol.byte = samp.volume.byte;
						}
						cmd = -1;
						break;

				// volume slide
					case 0xA:
						if (!pp.commandPhase && pp.commandParam)
							pp.commandPhase = paramH;
						if (pp.commandPhase && !(--pp.commandPhase)) {
							val = (pp.commandParam & 7)
								* ((pp.commandParam & 8) ? -1 : 1);

							if ((pp.attenuation.L + val) < 0)
								pp.attenuation.L = 0;
							else if ((pp.attenuation.L + val) > 15)
								pp.attenuation.L = 15;
							else
								pp.attenuation.L += val;
							if ((pp.attenuation.R + val) < 0)
								pp.attenuation.R = 0;
							else if ((pp.attenuation.R + val) > 15)
								pp.attenuation.R = 15;
							else
								pp.attenuation.R += val;
						}
						break;

				// break current pattern and loop from line
					case 0xB:
						// TODO!
						break;

				// special command
					case 0xC:
						if (!pp.commandParam)
							pp.commandPhase = 0;
						else if (paramH < 0xF) {
							switch (pp.commandPhase) {
								default:
									pp.commandPhase = 2;
									break;
								case 2:
									height += paramH;
									pp.commandPhase--;
									break;
								case 1:
									height += paramL;
									pp.commandPhase--;
									break;
							}
						}
						else if ((paramL & 1)) {
							pp.commandPhase = vol.R;
							vol.R = vol.L;
							vol.L = pp.commandPhase;
							pp.commandPhase = 0;
						}
						break;

					// soundchip control
					case 0xE:
						if (paramH == 0x2) {
							pp.commandParam &= 7;
							noise = pp.commandParam ^ 4;
						}
						else {
							// mute base tone volume if bit3=0
							if (!(pp.commandParam & 0x10))
								pp.attenuation.byte = 0xFF;

							pp.commandParam = ((pp.commandParam & 0x0E) << 1) |  (pp.commandParam & 0x81);
							pp.commandParam ^= 0x82;

							///~ SAA1099 DATA 18/19: Envelope generator 0/1
							this.SAA1099.setRegData(24 + chn3rd, pp.commandParam);
							cmd = -1;
						}
						break;

					default:
						cmd = -1;
						break;
				}

				// reset command if not needed anymore...
				if (cmd < 0) {
					pp.command = 0;
					pp.commandParam = 0;
					pp.commandPhase = 0;
				}

				// apply attenuation...
				vol.L = Math.max(0, (vol.L - pp.attenuation.L));
				vol.R = Math.max(0, (vol.R - pp.attenuation.R));

				///~ SAA1099 DATA 00-05: Amplitude controller 0-5
				this.SAA1099.setRegData(chn, vol.byte);

				// get tone from tracklist, calculate proper frequency to register...
				if (pp.tone) {
					tone = this.calculateTone(pp.tone, pp.globalPitch, height, samp.shift + pp.slideShift);

					///~ SAA1099 DATA 08-0D: Tone generator 0-5
					this.SAA1099.setRegData(8 + chn, tone.cent);

					oct = (chn & 1) ? (tone.oct << 4) : (oct | tone.oct);
					tone = null;
				}
				else if ((chn & 1))
					oct = 0;

				///~ SAA1099 DATA 10-12: Octave for generators 0-5
				this.SAA1099.setRegData(16 + chn2nd, oct);

				// set frequency enable bit...
				if (samp.enable_freq)
					eFreq |= eMask;
				// set proper noise enable bit and value...
				if ((noise & 4)) {
					eNoiz |= eMask;
					c = (chn3rd << 2);
					eChar = (eChar & (0xf0 >> c)) | ((noise & 3) << c);
				}

				// current sample cursor position handler...
				if (pp.sample_cursor + 1 >= pp.sample.end) {
					// it had to be released?
					if (pp.sample.releasable && pp.released) {
						if (++pp.sample_cursor === 256)
							this.clearPlayParams(chn);
					}
					// it had to be repeated at the end?
					else if (pp.sample.loop === pp.sample.end) {
						if ((this.mode & pMode.PM_SAMP_OR_LINE))
							this.clearPlayParams(chn);
						else
							pp.sample_cursor = pp.sample.end;
					}
					// it had to be stopped?
					else if (this.mode === pMode.PM_LINE)
						this.clearPlayParams(chn);
					// it had to be in the loop?
					else
						pp.sample_cursor = pp.sample.loop;
				}
				else
					pp.sample_cursor++;

				// current ornament cursor position handler...
				if (pp.ornament_cursor + 1 >= pp.ornament.end)
					pp.ornament_cursor = pp.ornament.loop;
				else
					pp.ornament_cursor++;
			}
			else {
				// playback in channel was disabled, reset proper params and registers...
				if ((chn & 1))
					oct = 0;

				///~ SAA1099 DATA 00-05: Amplitude controller 0-5
				this.SAA1099.setRegData(chn, 0);
				///~ SAA1099 DATA 08-0D: Tone generator 0-5
				this.SAA1099.setRegData(8 + chn, 0);
				///~ SAA1099 DATA 10-12: Octave for generators 0-5
				this.SAA1099.setRegData(16 + chn2nd, oct);
				///~ SAA1099 DATA 18/19: Envelope generator 0/1
				this.SAA1099.setRegData(24 + chn3rd, 0);

				eFreq &= (0xff ^ eMask);
				eNoiz &= (0xff ^ eMask);
			}
		}

		///~ SAA1099 DATA 14: Frequency enable bits
		this.SAA1099.setRegData(20, eFreq);
		///~ SAA1099 DATA 15: Noise enable bits
		this.SAA1099.setRegData(21, eNoiz);
		///~ SAA1099 DATA 16: Noise generator clock frequency select
		this.SAA1099.setRegData(22, eChar);

		if ((this.mode & pMode.PM_SAMP_OR_LINE) && (eFreq | eNoiz) === 0) {
			///~ SAA1099 DATA 1C: Master reset
			this.SAA1099.setRegData(28, 0);
			this.mode = 0;
		}
		else {
			///~ SAA1099 DATA 1C: Enable output
			this.SAA1099.setRegData(28, 1);

			// is there time to next trackline?
			if ((this.mode & pMode.PM_LINE) && this.currentTick > 0)
				this.currentTick--;
			else if ((this.mode & pMode.PM_SONG_OR_POS))
				this.prepareLine();
		}

		vol = null;
	}

	/**
	 * Another very important part of Player, sibling to prepareFrame():
	 * This method prepares parameters for next trackline in position...
	 * @param next Move to the next trackline (default true);
	 * @returns {boolean} success or failure
	 */
	private prepareLine(next?: boolean): boolean {
		if (this.currentTick) {
			this.currentTick--;
			return true;
		}

		if (this.currentPosition >= this.position.length)
			return false;

		if (next === void 0 || next) {
			this.currentLine++;
			this.changedLine = true;
		}

		var p: pPosition = this.position[this.currentPosition],
			pc: pChannel,
			pp: pParams,
			pt: pPattern,
			pl: pPatternLine;

		if (this.currentLine >= p.length) {
			if (this.mode === pMode.PM_SONG) {
				this.currentPosition++;
				if (this.currentPosition >= this.position.length) {
					if (this.loopMode)
						this.currentPosition = this.repeatPosition;
					else {
						this.currentLine--;
						this.stopChannel(0);
						return false;
					}
				}

				this.currentLine = 0;
				this.changedPosition = true;
				p = this.position[this.currentPosition];
			}
			else if (this.loopMode)
				this.currentLine = 0;
			else {
				this.currentLine--;
				this.stopChannel(0);
				return false;
			}

			this.currentSpeed = p.speed;
		}

		for (var chn: number = 0; chn < 6; chn++) {
			pc = p.ch[chn];
			pt = this.pattern[((pc.pattern < this.pattern.length) ? pc.pattern : 0)];
			if (this.currentLine >= pt.end)
				continue;

			pp = this.playParams[chn];
			pp.globalPitch = p.ch[chn].pitch;
			pp.playing = true;

			pl = pt.data[this.currentLine];
			if (pl.cmd) {
				if (pl.cmd == 0xF &&
					pl.cmd_data > 0) {

					this.currentSpeed = pl.cmd_data;
					if (this.currentSpeed >= 0x20) {
						var sH: number = (this.currentSpeed & 0xF0) >> 4,
							sL: number =  this.currentSpeed & 0x0F;

						if (sL < 2 || sH == sL) // invalid swing speed
							this.currentSpeed = sH;
						else if ((this.currentLine & 1)) // odd line swaps swing values
							this.currentSpeed = sH | (sL << 4);
					}

					pp.command = pp.commandParam = pp.commandPhase = 0;
				}
				else {
					pp.command = pl.cmd;
					pp.commandParam = pl.cmd_data;
					if (pl.cmd != pp.command)
						pp.commandPhase = 0;
				}
			}
			else if (pl.tone || pl.smp)
				pp.command = pp.commandParam = pp.commandPhase = 0;

			if (pl.volume.byte && pp.command != 0x5 && pp.command != 0xA)
				pp.attenuation.byte = ~pl.volume.byte;

			if (pl.release) {
				if (pp.sample.releasable)
					pp.released = true;
				else
					this.clearPlayParams(chn);
				continue;
			}
			else if (pl.tone && pl.cmd == 0x3 && pl.cmd_data) {
				if (pp.commandValue1) {
					pp.tone = pp.commandValue1;
					pp.slideShift -= pp.commandValue2;
				}

				var base: pTone   = this.calculateTone(pp.tone, 0, 0, pp.slideShift),
					target: pTone = this.calculateTone(pl.tone, 0, 0, 0),
					delta: number = target.word - base.word;

				if (delta === 0) {
					pp.tone = pl.tone;
					pp.commandValue1 = pp.commandValue2 = 0;
					pp.command = pp.commandParam = pp.commandPhase = 0;
				}
				else {
					pp.commandValue1 = pl.tone;
					pp.commandValue2 = delta + pp.slideShift;
					pp.commandPhase = (pp.commandParam & 0xF0) >> 4;
				}
			}
			else if (pl.tone) {
				pp.tone = pl.tone;
				pp.sample_cursor = 0;
				pp.ornament_cursor = 0;
				pp.slideShift = pp.commandValue1 = pp.commandValue2 = 0;
			}

			if (pl.smp) {
				pp.sample = this.sample[pl.smp];
				pp.sample_cursor = 0;
			}
			if (pl.orn) {
				pp.ornament = this.ornament[pl.orn];
				pp.ornament_cursor = 0;
			}
			else if (pl.orn_release) {
				pp.ornament = this.ornament[0];
				pp.ornament_cursor = 0;
				if (pp.command == 0x6 || pp.command == 0x7)
					pp.command = pp.commandParam = pp.commandPhase = 0;
			}
		}

		if (this.currentSpeed > 0x20)
			this.currentTick = (this.currentLine & 1) ? (this.currentSpeed & 0x0F) : ((this.currentSpeed & 0xF0) >> 4);
		else
			this.currentTick = this.currentSpeed;

		this.currentTick--;
		return true;
	}
//---------------------------------------------------------------------------------------
	/**
	 * Play only current row in current position.
	 * @returns {boolean}
	 */
	public playLine(): boolean {
		if (this.mode === pMode.PM_LINE && this.currentTick > 0)
			return false;

		this.mixer.index = 0;
		this.mode = pMode.PM_LINE;
		this.currentTick = 0;
		return this.prepareLine(false);
	}

	/**
	 * Start playback of position or pattern.
	 * @param fromStart Start playing from first position;
	 * @param follow Follow the song, change next position when position reach the end;
	 * @param resetLine Start playing from first row of the position;
	 * @returns {boolean} success or failure
	 */
	public playPosition(fromStart?: boolean, follow?: boolean, resetLine?: boolean): boolean {
		if (fromStart === void 0 || fromStart)
			this.currentPosition = 0;
		if (resetLine === void 0 || resetLine)
			this.currentLine = 0;
		if (follow === void 0)
			follow = true;

		this.changedLine = true;
		this.changedPosition = true;
		if (this.currentPosition >= this.position.length)
			return false;

		this.stopChannel(0);
		this.mixer.index = 0;
		this.mode = follow ? pMode.PM_SONG : pMode.PM_POSITION;
		this.currentSpeed = this.position[this.currentPosition].speed;

		return this.prepareLine(false);
	}

	/**
	 * Play custom tone with particular sample/ornament in particular channel.
	 * @param s Sample;
	 * @param o Ornament;
	 * @param tone Tone number;
	 * @param chn (optional) Channel number or autodetect first "free" channel;
	 * @returns {number} channel (1-6) where the sample has been played or 0 if error
	 */
	public playSample(s: number, o: number, tone: number, chn?: number): number {
		if (!chn) {
			// first free channel detection
			for (chn = 0; chn < 6; chn++)
				if (!this.playParams[chn].playing)
					break;
			if (chn === 6)
				return 0;
		}
		else if (--chn > 5)
			return 0;
		else if (this.playParams[chn].playing)
			return 0;

		this.clearPlayParams(chn);
		this.playParams[chn].playing = true;
		this.playParams[chn].tone = tone;
		this.playParams[chn].sample = this.sample[s];
		this.playParams[chn].ornament = this.ornament[o];

		this.mixer.index = 0;
		this.mode = pMode.PM_SAMPLE;
		return ++chn;
	}

	/**
	 * Stops a playback of particular channel (1 <= chn <= 6) or stop playback (chn = 0).
	 * Method reset appropriate channel's playParams.
	 * @param chn Zero or channel number (1-6);
	 */
	public stopChannel(chn: number = 0) {
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

		this.clearPlayParams(--chn);
	}
//---------------------------------------------------------------------------------------
	/**
	 * Calculate pTone object with actual frequency from a lot of parameters of player.
	 * It takes into account all nuances which can occur in tracklist...
	 * @param toneValue Base tone on input;
	 * @param globalShift Global pattern tone shift;
	 * @param toneShift Ornament tone shift;
	 * @param slideShift Fine tune frequency shift;
	 * @returns {pTone} object
	 */
	private calculateTone(toneValue: number, globalShift: number, toneShift: number, slideShift: number): pTone {
		var pitch: number = toneValue + globalShift + toneShift;

		// base tone overflowing in tones range
		while (pitch < 0)
			pitch += 96;
		while (pitch >= 96)
			pitch -= 96;

		// pick tone descriptor for base tone
		// and fix pitch of tone with fine tune frequency shift
		pitch = this.tones[pitch].word + slideShift;

		// freqency range overflowing in range
		while (pitch < 0)
			pitch += 2048;
		while (pitch >= 2048)
			pitch -= 2048;

		return new pTone(pitch);
	}

	/**
	 * Count how many times was particular pattern used in all positions.
	 * @param patt Pattern number;
	 * @returns {number} count
	 */
	public countPatternUsage(patt: number): number {
		// is pattern number in range?
		if (patt >= this.pattern.length)
			return 0;

		// proceed all positions/channels and count matches to 'c'
		var c: number = 0;
		for (var i: number = 0, l: number = this.position.length; i < l; i++)
			for (var j: number = 0; j < 6; j++)
				if (this.position[i].ch[j].pattern === patt)
					c++;

		return c;
	}

	/**
	 * Method that count "position frames" or number of interupts which takes every
	 * line in tracklist. It's very important for time calculations!
	 * @param pos If ommited, method calls itself recursively for all positions;
	 */
	public countPositionFrames(pos?: number) {
		var i: number, chn: number, line: number, speed: number, ptr: pPatternLine,
			l: number = this.position.length;

		// if 'pos' wasn't specified, recursively calling itself for all positions
		if (pos === void 0 || pos < 0)
			for (i = 0; i < l; i++)
				this.countPositionFrames(i);

		// is position number in range?
		else if (pos < l) {
			speed = this.position[pos].speed;

			// proceed through all tracklines and all channel-patterns
			for (i = 0, line = 0; line < 96; line++) {
				for (chn = 0; chn < 6; chn++) {
					ptr = this.pattern[this.position[pos].ch[chn].pattern].data[line];

					// in every channel-pattern we are looking for speed changes
					if (ptr.cmd === 0xF && ptr.cmd_data > 0) {
						speed = ptr.cmd_data;

						// is it swing tempo change? we need to check validity...
						if (speed >= 0x20) {
							var sH: number = (speed & 0xf0) >> 4,
								sL: number = (speed & 0x0f);

							if (sL < 2 || sH === sL) // invalid swing speed!
								speed = sH;
							else if ((line & 1)) // odd line swaps swing values
								speed = sH | (sL << 4);
						}
					}
				}

				// store count of interupts from start of position for every line
				this.position[pos].frames[line] = i;

				// increment number of interupts by speed value;
				// swing speed handled with nibble value of speed for even/odd trackline
				if (speed > 0x20)
					i += (line & 1) ? (speed & 0x0f) : ((speed & 0xf0) >> 4);
				else
					i += speed;
			}

			// and at last: total number of interupts for all 96 lines...
			this.position[pos].frames[line] = i;
		}
	}
//---------------------------------------------------------------------------------------
	private static vibratable: number[] = [
		  0,   0,   0,   0,   0,   0,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,
		 -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,   0,   0,   0,   0,   0,
		  0,   0,   0,   0,   0,   0,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,
		  1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   0,   0,   0,   0,   0,
		  0,   0,   0,   0,   0,   0,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,
		  1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   0,   0,   0,   0,   0,
		  0,   0,   0,   0,   0,   0,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,
		 -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,  -1,   0,   0,   0,   0,   0,
		  0,   0,   1,   1,   1,   1,   2,   2,   2,   2,   2,   3,   3,   3,   3,   3,
		  3,   3,   3,   3,   3,   3,   2,   2,   2,   2,   2,   1,   1,   1,   1,   0,
		  0,   0,  -1,  -1,  -1,  -1,  -2,  -2,  -2,  -2,  -2,  -3,  -3,  -3,  -3,  -3,
		 -3,  -3,  -3,  -3,  -3,  -3,  -2,  -2,  -2,  -2,  -2,  -1,  -1,  -1,  -1,   0,
		  0,   0,   1,   1,   2,   2,   3,   3,   4,   4,   4,   4,   5,   5,   5,   5,
		  5,   5,   5,   5,   5,   4,   4,   4,   4,   3,   3,   2,   2,   1,   1,   0,
		  0,   0,  -1,  -1,  -2,  -2,  -3,  -3,  -4,  -4,  -4,  -4,  -5,  -5,  -5,  -5,
		 -5,  -5,  -5,  -5,  -5,  -4,  -4,  -4,  -4,  -3,  -3,  -2,  -2,  -1,  -1,   0,
		  0,   1,   1,   2,   3,   3,   4,   4,   5,   5,   6,   6,   6,   7,   7,   7,
		  7,   7,   7,   7,   6,   6,   6,   5,   5,   4,   4,   3,   3,   2,   1,   1,
		  0,  -1,  -1,  -2,  -3,  -3,  -4,  -4,  -5,  -5,  -6,  -6,  -6,  -7,  -7,  -7,
		 -7,  -7,  -7,  -7,  -6,  -6,  -6,  -5,  -5,  -4,  -4,  -3,  -3,  -2,  -1,  -1,
		  0,   1,   2,   3,   3,   4,   5,   6,   6,   7,   7,   8,   8,   9,   9,   9,
		  9,   9,   9,   9,   8,   8,   7,   7,   6,   6,   5,   4,   3,   3,   2,   1,
		  0,  -1,  -2,  -3,  -3,  -4,  -5,  -6,  -6,  -7,  -7,  -8,  -8,  -9,  -9,  -9,
		 -9,  -9,  -9,  -9,  -8,  -8,  -7,  -7,  -6,  -6,  -5,  -4,  -3,  -3,  -2,  -1,
		  0,   1,   2,   3,   4,   5,   6,   7,   8,   9,   9,  10,  10,  11,  11,  11,
		 11,  11,  11,  11,  10,  10,   9,   9,   8,   7,   6,   5,   4,   3,   2,   1,
		  0,  -1,  -2,  -3,  -4,  -5,  -6,  -7,  -8,  -9,  -9, -10, -10, -11, -11, -11,
		-11, -11, -11, -11, -10, -10,  -9,  -9,  -8,  -7,  -6,  -5,  -4,  -3,  -2,  -1,
		  0,   1,   3,   4,   5,   6,   7,   8,   9,  10,  11,  11,  12,  12,  13,  13,
		 13,  13,  13,  12,  12,  11,  11,  10,   9,   8,   7,   6,   5,   4,   3,   1,
		  0,  -1,  -3,  -4,  -5,  -6,  -7,  -8,  -9, -10, -11, -11, -12, -12, -13, -13,
		-13, -13, -13, -12, -12, -11, -11, -10,  -9,  -8,  -7,  -6,  -5,  -4,  -3,  -1,
		  0,   1,   3,   4,   6,   7,   8,  10,  11,  12,  12,  13,  14,  14,  15,  15,
		 15,  15,  15,  14,  14,  13,  12,  12,  11,  10,   8,   7,   6,   4,   3,   1,
		  0,  -1,  -3,  -4,  -6,  -7,  -8, -10, -11, -12, -12, -13, -14, -14, -15, -15,
		-15, -15, -15, -14, -14, -13, -12, -12, -11, -10,  -8,  -7,  -6,  -4,  -3,  -1,
		  0,   2,   3,   5,   7,   8,   9,  11,  12,  13,  14,  15,  16,  16,  17,  17,
		 17,  17,  17,  16,  16,  15,  14,  13,  12,  11,   9,   8,   7,   5,   3,   2,
		  0,  -2,  -3,  -5,  -7,  -8,  -9, -11, -12, -13, -14, -15, -16, -16, -17, -17,
		-17, -17, -17, -16, -16, -15, -14, -13, -12, -11,  -9,  -8,  -7,  -5,  -3,  -2,
		  0,   2,   4,   6,   7,   9,  11,  12,  13,  15,  16,  17,  18,  18,  19,  19,
		 19,  19,  19,  18,  18,  17,  16,  15,  13,  12,  11,   9,   7,   6,   4,   2,
		  0,  -2,  -4,  -6,  -7,  -9, -11, -12, -13, -15, -16, -17, -18, -18, -19, -19,
		-19, -19, -19, -18, -18, -17, -16, -15, -13, -12, -11,  -9,  -7,  -6,  -4,  -2,
		  0,   2,   4,   6,   8,  10,  12,  13,  15,  16,  17,  19,  19,  20,  21,  21,
		 21,  21,  21,  20,  19,  19,  17,  16,  15,  13,  12,  10,   8,   6,   4,   2,
		  0,  -2,  -4,  -6,  -8, -10, -12, -13, -15, -16, -17, -19, -19, -20, -21, -21,
		-21, -21, -21, -20, -19, -19, -17, -16, -15, -13, -12, -10,  -8,  -6,  -4,  -2,
		  0,   2,   4,   7,   9,  11,  13,  15,  16,  18,  19,  20,  21,  22,  23,  23,
		 23,  23,  23,  22,  21,  20,  19,  18,  16,  15,  13,  11,   9,   7,   4,   2,
		  0,  -2,  -4,  -7,  -9, -11, -13, -15, -16, -18, -19, -20, -21, -22, -23, -23,
		-23, -23, -23, -22, -21, -20, -19, -18, -16, -15, -13, -11,  -9,  -7,  -4,  -2,
		  0,   2,   5,   7,  10,  12,  14,  16,  18,  19,  21,  22,  23,  24,  25,  25,
		 25,  25,  25,  24,  23,  22,  21,  19,  18,  16,  14,  12,  10,   7,   5,   2,
		  0,  -2,  -5,  -7, -10, -12, -14, -16, -18, -19, -21, -22, -23, -24, -25, -25,
		-25, -25, -25, -24, -23, -22, -21, -19, -18, -16, -14, -12, -10,  -7,  -5,  -2,
		  0,   3,   5,   8,  10,  13,  15,  17,  19,  21,  22,  24,  25,  26,  26,  27,
		 27,  27,  26,  26,  25,  24,  22,  21,  19,  17,  15,  13,  10,   8,   5,   3,
		  0,  -3,  -5,  -8, -10, -13, -15, -17, -19, -21, -22, -24, -25, -26, -26, -27,
		-27, -27, -26, -26, -25, -24, -22, -21, -19, -17, -15, -13, -10,  -8,  -5,  -3,
		  0,   3,   6,   8,  11,  14,  16,  18,  21,  22,  24,  26,  27,  28,  28,  29,
		 29,  29,  28,  28,  27,  26,  24,  22,  21,  18,  16,  14,  11,   8,   6,   3,
		  0,  -3,  -6,  -8, -11, -14, -16, -18, -21, -22, -24, -26, -27, -28, -28, -29,
		-29, -29, -28, -28, -27, -26, -24, -22, -21, -18, -16, -14, -11,  -8,  -6,  -3
	];
}
