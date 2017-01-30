/*
 * Player: Core of player routine.
 * Copyright (c) 2012-2017 Martin Borik <mborik@users.sourceforge.net>
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
/// <reference path='../SAASound.d.ts' />
/// <reference path='globals.ts' />
/// <reference path='sample.ts' />
/// <reference path='ornament.ts' />
/// <reference path='pattern.ts' />
/// <reference path='position.ts' />
//---------------------------------------------------------------------------------------
class Player {
	public static maxPatternLen: number = 128;

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
	private mixer: pMixer;

	private rtSong: pRuntime;
	private rtSample: pRuntime;

	public SAA1099: SAASound;

	constructor(SAA1099: SAASound) {
		this.SAA1099 = SAA1099;
		console.log('Player', 'Initializing module player connected to %o...', this.SAA1099);

		this.sample = [];
		this.ornament = [];

		const tab_tones: any[] = [
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
		for (let i: number = 1, o: number = 0, p: number = 1; i <= 96; i++, p++) {
			let t = new pTone;
			t.txt = tab_tones[p].prefix + (o + 1);

			let c = tab_tones[p].freq;
			if (c === 0xff && o < 7) {
				o++;
				p = 0;
				c = tab_tones[p].freq;
			}

			t.oct = o;
			t.cent = c;
			this.tones[i] = t;
		}

		this.mixer = new pMixer;
		this.setInterrupt(50);

		this.loopMode = true;
		this.clearSong(true);

		this.stopChannel();
		this.mode = 0;

		console.log('Player', 'Initialization done...');
	}

	/** Clear or initialize song (positions, patterns, pointers and playParams). */
	public clearSong(init?: boolean) {
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

		if (init) {
			this.clearSamples();
			this.clearOrnaments();

			this.rtSong = new pRuntime(this);
			this.rtSample = new pRuntime(this);
			this.nullPosition = this.addNewPosition(64, 6, false);

			console.log('Player', 'Song objects and parameters initialized...');
		}
		else {
			for (let chn: number = 0; chn < 6; chn++) {
				this.rtSong.clearPlayParams(chn);
			}

			console.log('Player', 'Song cleared...');
		}
	}

	/** Clear all samples. */
	public clearSamples() {
		for (let i: number = 0; i < 32; i++) {
			if (this.sample[i]) {
				for (let c: number = 0; c < 256; c++) {
					delete this.sample[i].data[c].volume;
				}
				this.sample[i].data = null;
				this.sample[i] = null;
			}

			this.sample[i] = new pSample;
		}

		console.log('Player', 'Samples cleared...');
	}

	/** Clear all ornaments. */
	public clearOrnaments() {
		for (let i: number = 0; i < 16; i++) {
			if (this.ornament[i]) {
				delete this.ornament[i].data;
				this.ornament[i] = null;
			}

			this.ornament[i] = new pOrnament;
		}

		console.log('Player', 'Ornaments cleared...');
	}

	/**
	 * Create bare pattern at the end of the array of patterns and return it's number.
	 * @returns {number} new pattern number
	 */
	public addNewPattern(): number {
		let index: number = this.pattern.length;
		this.pattern.push(new pPattern);
		return index;
	}

	/**
	 * Create new position in given length and basic speed.
	 * @param length Position length;
	 * @param speed Basic position speed;
	 * @param add Should be position added to stack?
	 * @returns {pPosition} new position object;
	 */
	public addNewPosition(length: number, speed: number, add: boolean = true): pPosition {
		let pos = new pPosition(length, speed);
		pos.initParams = new pRuntime(this);

		if (add) {
			this.position.push(pos);
		}

		return pos;
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
		if (!this.mode) {
			return this.SAA1099.output(leftBuf, rightBuf, length);
		}

		let outi = 0, remain;
		while (outi < length) {
			if (this.mixer.index >= this.mixer.length) {
				this.mixer.index = 0;

				if (this.mode !== pMode.PM_SIMULATION) {
					let rt = this.prepareFrame();
					this.SAA1099.setAllRegs(rt);
				}
			}

			remain = this.mixer.length - this.mixer.index;
			if ((outi + remain) > length) {
				remain = length - outi;
			}

			this.SAA1099.output(leftBuf, rightBuf, remain, outi);
			this.mixer.index += remain;
			outi += remain;
		}
	}

	/**
	 * This method do a simulation of playback in position for given number of lines.
	 * @param lines Number of lines to simulate;
	 * @param pos Optional position number in which do a simulation;
	 * @param rt Simulate over the custom runtime parameters;
	 */
	private simulation(lines: number, pos?: number, rt?: pRuntime): boolean {
		if (lines <= 0) {
			return false;
		}

		if (pos === undefined) {
			pos = this.currentPosition;
		}
		if (rt === undefined) {
			rt = this.rtSong;
		}

		let backup, lastMode;
		let ps = this.position[pos];

		if (!ps) {
			return false;
		}

		lastMode = this.mode;
		if (this.currentPosition !== pos) {
			backup = {
				pos:   this.currentPosition,
				line:  this.currentLine,
				tick:  this.currentTick,
				speed: this.currentSpeed
			};

			this.currentPosition = pos;
		}

		this.currentLine = 0;
		this.currentTick = 0;
		this.currentSpeed = ps.speed;

		rt.replace(ps.initParams);

		this.mode = pMode.PM_SIMULATION;
		this.prepareLine(false, rt);
		this.changedLine = false;
		this.changedPosition = false;

		while (lines > 0) {
			this.prepareFrame(rt);

			if (this.changedLine) {
				this.changedLine = false;
				lines--;
			}
			if (this.changedPosition) {
				this.changedPosition = false;
				break;
			}
		}

		if (backup) {
			this.currentLine = backup.line;
			this.currentTick = backup.tick;
			this.currentSpeed = backup.speed;
			this.currentPosition = backup.pos;
		}
		else {
			this.currentTick++;
		}

		this.mode = lastMode;
		return true;
	}

	/**
	 * Most important part of Player: Method needs to be called every interrupt/frame.
	 * It handles all the pointers and settings to output values on SAA1099 registers.
	 */
	private prepareFrame(rt?: pRuntime): pRuntime {
		if (rt === undefined) {
			rt = (this.mode === pMode.PM_SAMPLE) ? this.rtSample : this.rtSong;
		}
		if (!this.mode) {
			return rt;
		}

		let vol: pVolume = new pVolume;
		let height: number, val: number = 0;
		let oct: number = 0, noise: number, cmd: number, paramH: number, paramL: number;
		let tone: pTone, c: number;
		let eFreq: number = 0, eNoiz: number = 0, eChar: number = 0, ePlay: number = 0;

		// We processing channels backward! It's because of SAA1099 register architecture
		// which expect settings for pairs or triplets of adjacent channels. We need
		// to know e.g. tone octave of every pair of channel and store to one register.
		// A similar case are settings for noise registers for every triplet of channels
		// and we want to have noise/envelope settings priority from left to right.
		// Therefore, it is better to go from 6th channel to 1st and group it's values...
		for (let chn = 5; chn >= 0; chn--) {
			// pick playParams for channel...
			let pp = rt.params[chn];

			let eMask  = (1 << chn);      // bit mask of channel
			let chn2nd = (chn >> 1);      // calculate pair of channels
			let chn3rd = +(chn >= 3);     // calculate triple of channels

			if (pp.playing) {
				// if playback in channel is enabled, fetch all smp/orn values...
				let samp = pp.sample.data[pp.sample_cursor];

				// set channel bit if it's enabled or sample is still playing...
				if (!pp.sample.releasable && pp.sample_cursor >= pp.sample.end) {
					samp = this.sample[0].data[0];
				}
				else {
					ePlay |= eMask;
				}

				vol.byte = samp.volume.byte;
				let height = pp.ornament.data[pp.ornament_cursor];
				let noise = samp.noise_value | (+samp.enable_noise << 2);

				// get command on trackline and calculate nibbles of command parameter...
				let cmd = pp.command;
				let paramH = (pp.commandParam & 0xf0) >> 4;
				let paramL = (pp.commandParam & 0x0f);

				switch (cmd) {
				// portamento up/down
					case 0x1:
					case 0x2:
						if (!pp.commandPhase && pp.commandParam) {
							pp.commandPhase = paramH;
						}
						if (pp.commandPhase && !(--pp.commandPhase)) {
							pp.slideShift += paramL * ((cmd & 1) ? 1 : -1);
						}
						break;

				// glissando to given note
					case 0x3:
						if (!pp.commandPhase && pp.commandParam) {
							pp.commandPhase = paramH;
						}
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
							if (paramH) {
								pp.commandPhase = (pp.commandPhase + paramH) & 0x3F;
							}
							else {
								pp.commandPhase = 0;
							}
							pp.slideShift = Player.vibratable[(paramL << 6) + pp.commandPhase];
						}
						else {
							pp.slideShift = 0;
						}

						break;

				// tremolo
					case 0x5:
						if (pp.commandParam) {
							if (paramH) {
								pp.commandPhase = (pp.commandPhase + paramH) & 0x3F;
							}
							else {
								pp.commandPhase = 0;
							}

							val = pp.commandValue2;
							pp.commandValue2 = Player.vibratable[(paramL << 6) + pp.commandPhase];
							val = -(pp.commandValue2 - val);

							if (val === 0) {
								break;
							}

							if ((pp.attenuation.L + val) < 0) {
								pp.attenuation.L = 0;
							}
							else if ((pp.attenuation.L + val) > 15) {
								pp.attenuation.L = 15;
							}
							else {
								pp.attenuation.L += val;
							}
							if ((pp.attenuation.R + val) < 0) {
								pp.attenuation.R = 0;
							}
							else if ((pp.attenuation.R + val) > 15) {
								pp.attenuation.R = 15;
							}
							else {
								pp.attenuation.R += val;
							}
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
						if (!pp.commandPhase && pp.commandParam) {
							pp.commandPhase = paramH;
						}
						if (pp.commandPhase && !(--pp.commandPhase)) {
							val = (pp.commandParam & 7)
								* ((pp.commandParam & 8) ? -1 : 1);

							if ((pp.attenuation.L + val) < 0) {
								pp.attenuation.L = 0;
							}
							else if ((pp.attenuation.L + val) > 15) {
								pp.attenuation.L = 15;
							}
							else {
								pp.attenuation.L += val;
							}
							if ((pp.attenuation.R + val) < 0) {
								pp.attenuation.R = 0;
							}
							else if ((pp.attenuation.R + val) > 15) {
								pp.attenuation.R = 15;
							}
							else {
								pp.attenuation.R += val;
							}
						}
						break;

				// break current pattern and loop from line
					case 0xB:
						// TODO!
						break;

				// special command
					case 0xC:
						if (!pp.commandParam) {
							pp.commandPhase = 0;
						}
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
						else if (!!(paramL & 1)) {
							pp.commandPhase = vol.R;
							vol.R = vol.L;
							vol.L = pp.commandPhase;
							pp.commandPhase = 0;
						}
						break;

					// soundchip control
					case 0xE:
						if (paramH === 0x2) {
							pp.commandParam &= 7;
							noise = pp.commandParam ^ 4;
						}
						else {
							// mute base tone volume if bit3=0
							if (!(pp.commandParam & 0x10)) {
								pp.attenuation.byte = 0xFF;
							}

							pp.commandParam = ((pp.commandParam & 0x0E) << 1) |  (pp.commandParam & 0x81);
							pp.commandParam ^= 0x82;

							///~ SAA1099 DATA 18/19: Envelope generator 0/1
							rt.setRegData(24 + chn3rd, pp.commandParam);
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
				rt.setRegData(chn, vol.byte);

				// get tone from tracklist, calculate proper frequency to register...
				if (pp.tone) {
					tone = this.calculateTone(pp.tone, pp.globalPitch, height, samp.shift + pp.slideShift);

					///~ SAA1099 DATA 08-0D: Tone generator 0-5
					rt.setRegData(8 + chn, tone.cent);

					oct = (chn & 1) ? (tone.oct << 4) : (oct | tone.oct);
					tone = null;
				}
				else if (!!(chn & 1)) {
					oct = 0;
				}

				///~ SAA1099 DATA 10-12: Octave for generators 0-5
				rt.setRegData(16 + chn2nd, oct);

				// set frequency enable bit...
				if (samp.enable_freq) {
					eFreq |= eMask;
				}
				// set proper noise enable bit and value...
				if (!!(noise & 4)) {
					eNoiz |= eMask;
					c = (chn3rd << 2);
					eChar = (eChar & (0xf0 >> c)) | ((noise & 3) << c);
				}

				// current sample cursor position handler...
				if (pp.sample_cursor + 1 >= pp.sample.end) {
					// it had to be released?
					if (pp.sample.releasable && pp.released) {
						if (pp.sample_cursor < 255) {
							pp.sample_cursor++;
						}
						else {
							pp.playing = false;
							ePlay &= ~eMask;
							eFreq &= ~eMask;
						}
					}
					// it had to be stopped at the end?
					else if (pp.sample.loop === pp.sample.end) {
						if (!(this.mode & pMode.PM_SAMP_OR_LINE)) {
							pp.sample_cursor = pp.sample.end;
						}
						pp.playing = false;
						ePlay &= ~eMask;
						eFreq &= ~eMask;
					}
					else if (this.mode === pMode.PM_LINE) {
						pp.playing = false;
						ePlay &= ~eMask;
						eFreq &= ~eMask;
					}
					// it had to be repeated?
					else {
						pp.sample_cursor = pp.sample.loop;
					}
				}
				else {
					pp.sample_cursor++;
				}

				// current ornament cursor position handler...
				if (pp.ornament_cursor + 1 >= pp.ornament.end) {
					pp.ornament_cursor = pp.ornament.loop;
				}
				else {
					pp.ornament_cursor++;
				}
			}
			else {
				// playback in channel was disabled, reset proper params and registers...
				if (!!(chn & 1)) {
					oct = 0;
				}

				///~ SAA1099 DATA 00-05: Amplitude controller 0-5
				rt.setRegData(chn, 0);
				///~ SAA1099 DATA 08-0D: Tone generator 0-5
				rt.setRegData(0x08 + chn, 0);
				///~ SAA1099 DATA 10-12: Octave for generators 0-5
				rt.setRegData(0x10 + chn2nd, oct);

				eFreq &= ~eMask;
				eNoiz &= ~eMask;
			}
		}

		///~ SAA1099 DATA 14: Frequency enable bits
		rt.setRegData(0x14, eFreq);
		///~ SAA1099 DATA 15: Noise enable bits
		rt.setRegData(0x15, eNoiz);
		///~ SAA1099 DATA 16: Noise generator clock frequency select
		rt.setRegData(0x16, eChar);

		if (!!(this.mode & pMode.PM_SAMP_OR_LINE) && !ePlay) {
			///~ SAA1099 DATA 18: Envelope generator 0
			rt.setRegData(0x18, 0);
			///~ SAA1099 DATA 19: Envelope generator 1
			rt.setRegData(0x19, 0);
			///~ SAA1099 DATA 1C: Master reset and sync
			rt.setRegData(0x1C, 2);
			this.mode = 0;
		}
		else {
			///~ SAA1099 DATA 1C: Enable output
			rt.setRegData(0x1C, 1);

			// is there time to next trackline?
			if (!!(this.mode & pMode.PM_LINE) && this.currentTick > 0) {
				this.currentTick--;
			}
			else if (!!(this.mode & pMode.PM_SONG_OR_POS)) {
				this.prepareLine(true, rt);
			}
		}

		vol = null;
		return rt;
	}

	/**
	 * Another very important part of Player, sibling to prepareFrame():
	 * This method prepares parameters for next trackline in position...
	 * @param next Move to the next trackline (default true);
	 * @returns {boolean} success or failure
	 */
	private prepareLine(next?: boolean, rt?: pRuntime): boolean {
		if (this.currentTick) {
			this.currentTick--;
			return true;
		}

		if (this.currentPosition >= this.position.length) {
			return false;
		}

		if (next === undefined || next === true) {
			this.currentLine++;
			this.changedLine = true;
		}

		if (rt === undefined) {
			rt = (this.mode === pMode.PM_SAMPLE) ? this.rtSample : this.rtSong;
		}

		let p: pPosition = this.position[this.currentPosition];

		if (this.currentLine >= p.length) {
			if (!!(this.mode & pMode.PM_SONG)) {
				this.currentPosition++;
				if (this.currentPosition >= this.position.length) {
					if (this.loopMode) {
						this.currentPosition = this.repeatPosition;
					}
					else {
						this.currentLine--;
						this.stopChannel();
						return false;
					}
				}

				this.currentLine = 0;
				this.changedPosition = true;
				p = this.position[this.currentPosition];
			}
			else if (this.loopMode) {
				this.currentLine = 0;
			}
			else {
				this.currentLine--;
				this.stopChannel();
				return false;
			}

			rt.replace(p.initParams);
			this.currentSpeed = p.speed;
		}

		for (let chn: number = 0; chn < 6; chn++) {
			let pc = p.ch[chn];
			let pt_number = (pc.pattern < this.pattern.length) ? pc.pattern : 0;
			let pt = this.pattern[pt_number];

			if (this.currentLine >= pt.end) {
				continue;
			}

			let pp = rt.params[chn];
			pp.globalPitch = p.ch[chn].pitch;
			pp.playing = true;

			let pl = pt.data[this.currentLine];
			if (pl.cmd) {
				if (pl.cmd === 0xF && pl.cmd_data > 0) {
					this.currentSpeed = pl.cmd_data;
					if (this.currentSpeed >= 0x20) {
						let sH: number = (this.currentSpeed & 0xF0) >> 4;
						let sL: number =  this.currentSpeed & 0x0F;

						if (sL < 2 || sH === sL) {
							// invalid swing speed
							this.currentSpeed = sH;
						}
						else if (!!(this.currentLine & 1)) {
							// odd line swaps swing values
							this.currentSpeed = sH | (sL << 4);
						}
					}

					pp.command = pp.commandParam = pp.commandPhase = 0;
				}
				else {
					pp.command = pl.cmd;
					pp.commandParam = pl.cmd_data;
					if (pl.cmd !== pp.command) {
						pp.commandPhase = 0;
					}
				}
			}
			else if (pl.tone || pl.smp) {
				pp.command = pp.commandParam = pp.commandPhase = 0;
			}

			if (pl.volume.byte && pp.command !== 0x5 && pp.command !== 0xA) {
				pp.attenuation.byte = ~pl.volume.byte;
			}

			if (pl.release) {
				if (pp.sample.releasable && !pp.released) {
					pp.released = true;
				}
				else {
					rt.clearPlayParams(chn);
				}
				continue;
			}
			else if (pl.tone && pl.cmd === 0x3 && pl.cmd_data) {
				if (pp.commandValue1) {
					pp.tone = pp.commandValue1;
					pp.slideShift -= pp.commandValue2;
				}

				let base: pTone   = this.calculateTone(pp.tone, 0, 0, pp.slideShift);
				let target: pTone = this.calculateTone(pl.tone, 0, 0, 0);
				let delta: number = target.word - base.word;

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
				pp.released = false;
			}

			if (pl.smp) {
				pp.sample = this.sample[pl.smp];
				pp.sample_cursor = 0;
				pp.released = false;
			}
			if (pl.orn) {
				pp.ornament = this.ornament[pl.orn];
				pp.ornament_cursor = 0;
			}
			else if (pl.orn_release) {
				pp.ornament = this.ornament[0];
				pp.ornament_cursor = 0;
				if (pp.command === 0x6 || pp.command === 0x7) {
					pp.command = pp.commandParam = pp.commandPhase = 0;
				}
			}
		}

		if (this.currentSpeed > 0x20) {
			this.currentTick = (this.currentLine & 1) ? (this.currentSpeed & 0x0F) : ((this.currentSpeed & 0xF0) >> 4);
		}
		else {
			this.currentTick = this.currentSpeed;
		}

		this.currentTick--;
		return true;
	}
//---------------------------------------------------------------------------------------
	/**
	 * Play only current row in current position.
	 * @returns {boolean}
	 */
	public playLine(): boolean {
		if (this.mode === pMode.PM_LINE && this.currentTick > 0) {
			return false;
		}

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
	public playPosition(fromStart: boolean = true, follow: boolean = true, resetLine: boolean = true): boolean {
		if (fromStart) {
			this.currentPosition = 0;
		}
		if (resetLine) {
			this.currentLine = 0;
		}

		if (this.currentPosition >= this.position.length) {
			return false;
		}

		this.stopChannel();
		this.mixer.index = 0;

		let pos = this.position[this.currentPosition];
		if (this.currentLine > 0) {
			this.simulation(this.currentLine);
		}
		else {
			this.rtSong.replace(pos.initParams);
			this.currentTick = 0;
		}

		this.changedLine = true;
		this.changedPosition = true;

		this.mode = follow ? pMode.PM_SONG : pMode.PM_POSITION;
		this.currentSpeed = pos.speed;

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
		if (this.mode & (pMode.PM_SONG_OR_POS | pMode.PM_LINE)) {
			return 0;
		}

		let rt: pRuntime = this.rtSample;
		if (!chn) {
			// first free channel detection
			for (chn = 0; chn < 6; chn++) {
				if (!rt.params[chn].playing) {
					break;
				}
			}

			// there is no free channel for playing, so
			// we can try find channel, that playing same sample
			// but on farther sample pointer...
			if (chn === 6) {
				let farther = -1;
				let chnToStop = -1;

				for (chn = 0; chn < 6; chn++) {
					if (rt.params[chn].sample === this.sample[s]) {
						if (rt.params[chn].sample_cursor > farther) {
							farther = rt.params[chn].sample_cursor;
							chnToStop = chn;
						}
					}
				}

				// definetely, no free channel left...
				if (chnToStop < 0) {
					return 0;
				}

				chn = chnToStop;
			}
		}
		else if (--chn > 5) {
			return 0;
		}
		else if (rt.params[chn].playing) {
			return 0;
		}

		rt.clearPlayParams(chn);
		rt.params[chn].playing = true;
		rt.params[chn].tone = tone;
		rt.params[chn].sample = this.sample[s];
		rt.params[chn].ornament = this.ornament[o];

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
		let rt = (this.mode === pMode.PM_SAMPLE) ? this.rtSample : this.rtSong;

		if (chn < 0 || chn > 6) {
			return;
		}
		else if (chn === 0) {
			for (; chn < 6; chn++) {
				rt.clearPlayParams(chn);
			}

			this.mode = pMode.PM_LINE;
			this.prepareFrame(rt);
			this.currentTick = 0;
			this.changedLine = true;

			this.SAA1099.setAllRegs(rt);
			return;
		}

		rt.clearPlayParams(--chn);
	}

	get isPlaying(): boolean {
		return !this.mode;
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
		let pitch: number = toneValue + globalShift + toneShift;

		// base tone overflowing in tones range
		while (pitch < 0) {
			pitch += 96;
		}
		while (pitch > 96) {
			pitch -= 96;
		}

		// pick tone descriptor for base tone
		// and fix pitch of tone with fine tune frequency shift
		pitch = this.tones[pitch].word + slideShift;

		// freqency range overflowing in range
		while (pitch < 0) {
			pitch += 2048;
		}
		while (pitch >= 2048) {
			pitch -= 2048;
		}

		return new pTone(pitch);
	}

	/**
	 * Count how many times was particular pattern used in all positions.
	 * @param patt Pattern number;
	 * @returns {number} count
	 */
	public countPatternUsage(patt: number): number {
		// is pattern number in range?
		if (patt >= this.pattern.length) {
			return 0;
		}

		// proceed all positions/channels and count matches to 'c'
		let c: number = 0;
		for (let i: number = 0, l: number = this.position.length; i < l; i++) {
			for (let j: number = 0; j < 6; j++) {
				if (this.position[i].ch[j].pattern === patt) {
					c++;
				}
			}
		}

		return c;
	}

	/**
	 * Method that count "position frames" or number of interupts which takes every
	 * line in tracklist. It's very important for time calculations!
	 * @param pos If ommited, method calls itself recursively for all positions;
	 */
	public countPositionFrames(pos?: number) {
		let l: number = this.position.length;

		// if 'pos' wasn't specified, recursively calling itself for all positions
		if (pos === undefined || pos < 0) {
			for (let i = 0; i < l; i++) {
				this.countPositionFrames(i);
			}
		}

		// is position number in range?
		else if (pos < l) {
			let speed = this.position[pos].speed;
			let i = 0, line = 0;

			// proceed through all tracklines and all channel-patterns
			for (; line < MAX_PATTERN_LEN; line++) {
				for (let chn = 0; chn < 6; chn++) {
					let ptr = this.pattern[this.position[pos].ch[chn].pattern].data[line];

					// in every channel-pattern we are looking for speed changes
					if (ptr.cmd === 0xF && ptr.cmd_data > 0) {
						speed = ptr.cmd_data;

						// is it swing tempo change? we need to check validity...
						if (speed >= 0x20) {
							let sH: number = (speed & 0xf0) >> 4,
								sL: number = (speed & 0x0f);

							if (sL < 2 || sH === sL) {
								// invalid swing speed!
								speed = sH;
							}
							else if (!!(line & 1)) {
								// odd line swaps swing values
								speed = sH | (sL << 4);
							}
						}
					}
				}

				// store count of interupts from start of position for every line
				this.position[pos].frames[line] = i;

				// increment number of interupts by speed value;
				// swing speed handled with nibble value of speed for even/odd trackline
				if (speed > 0x20) {
					i += (line & 1) ? (speed & 0x0f) : ((speed & 0xf0) >> 4);
				}
				else {
					i += speed;
				}
			}

			// and at last: total number of interupts for all tracklines of pattern...
			this.position[pos].frames[line] = i;
		}
	}

	/**
	 * Method calculates runtime parameters by simulation of playback from start
	 * of the previous position to first line of the actual position.
	 * @param pos Position number bigger than zero;
	 */
	public storePositionRuntime(pos: number): boolean {
		if (pos === undefined || pos <= 0) {
			return false;
		}

		let prev = this.position[pos - 1] || this.nullPosition;
		let current = this.position[pos];

		if (!(current && current.initParams)) {
			return false;
		}
		current.initParams.replace(prev.initParams);

		return this.simulation(prev.length, pos - 1, current.initParams);
	}

//---------------------------------------------------------------------------------------
/* tslint:disable:indent */
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
