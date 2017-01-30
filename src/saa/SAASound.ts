/*!
 * SAASound is a Phillips SAA 1099 sound chip emulator
 * Copyright (c) 2015-2017 Martin Borik <mborik@users.sourceforge.net>
 * Based on SAASound - portable C/C++ library
 * Copyright (c) 1998-2004 Dave Hooper <stripwax@users.sourceforge.net>
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
class SAASoundRegisters {
	R00 = 0; R01 = 0; R02 = 0; R03 = 0; R04 = 0; R05 = 0;
	R08 = 0; R09 = 0; R0A = 0; R0B = 0; R0C = 0; R0D = 0;
	R10 = 0; R11 = 0; R12 = 0;
	R14 = 0; R15 = 0; R16 = 0;
	R18 = 0; R19 = 0;
	R1C = 0;

	[key: string]: number;
};
class SAASoundRegData {
	public regs: SAASoundRegisters = new SAASoundRegisters;
	public muted: boolean[] = [ false, false, false, false, false, false ];
};
//---------------------------------------------------------------------------------------
class SAASound {
	public static sampleRate: number;

	private _register: number = 0;
	private _enabled: boolean = false;
	private _ampMuted: boolean[] = [ false, false, false, false, false, false ];
	private _sync: boolean;

	private _env: SAAEnv[];
	private _noise: SAANoise[];
	private _freq: SAAFreq[];
	private _amp: SAAAmp[];

	constructor(sampleRate: number) {
		console.log('SAASound', 'Initializing emulation based on samplerate %dHz...', sampleRate);
		SAASound.sampleRate = sampleRate;

		this._env = [ new SAAEnv, new SAAEnv ];

		this._noise = [
			new SAANoise(0x14af5209),
			new SAANoise(0x76a9b11e)
		];

		this._freq = [
			new SAAFreq(this._noise[0]),
			new SAAFreq(null, this._env[0]),
			new SAAFreq(),
			new SAAFreq(this._noise[1]),
			new SAAFreq(null, this._env[1]),
			new SAAFreq()
		];

		this._amp = [
			new SAAAmp(this._freq[0], this._noise[0]),
			new SAAAmp(this._freq[1], this._noise[0]),
			new SAAAmp(this._freq[2], this._noise[0], this._env[0]),
			new SAAAmp(this._freq[3], this._noise[1]),
			new SAAAmp(this._freq[4], this._noise[1]),
			new SAAAmp(this._freq[5], this._noise[1], this._env[1])
		];

		this.reset();
		console.log('SAASound', 'Chip emulation initialized...');
	}

	public reset() {
		// sets reg 28 to 0x02 - sync and disabled
		this.setRegData(28, 2);

		// sets regs 00-31 (except 28) to 0
		for (let i: number = 31; i >= 0; i--) {
			if (i !== 28) {
				this.setRegData(i, 0);
			}
		}

		// sets reg 28 to 0
		this.setRegData(28, 0);

		// sets current reg to 0
		this.setReg(0);
	}

	/**
	 * route data to the appropriate place by current register
	 * @param data BYTE
	 */
	public setData(data: number) {
		data &= 0xff;

		let reg: number = this._register;
		switch (reg) {
		// Amplitude data (==> amp)
			case 0:
			case 1:
			case 2:
			case 3:
			case 4:
			case 5:
				this._amp[reg].setLevel(data);
				break;

		// Freq data (==> freq)
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
				this._freq[(reg & 0x07)].setOffset(data);
				break;

		// Freq octave data (==> freq) for channels 0,1
			case 16:
				this._freq[0].setOctave(data & 0x07);
				this._freq[1].setOctave((data >> 4) & 0x07);
				break;

		// Freq octave data (==> freq) for channels 2,3
			case 17:
				this._freq[2].setOctave(data & 0x07);
				this._freq[3].setOctave((data >> 4) & 0x07);
				break;

		// Freq octave data (==> freq) for channels 4,5
			case 18:
				this._freq[4].setOctave(data & 0x07);
				this._freq[5].setOctave((data >> 4) & 0x07);
				break;

		// Tone mixer control (==> amp)
			case 20:
				this._amp.forEach((a: SAAAmp, i: number) => {
					a.setFreqMixer(data & (0x01 << i));
				});
				break;

		// noise mixer control (==> amp)
			case 21:
				this._amp.forEach((a: SAAAmp, i: number) => {
					a.setNoiseMixer(data & (0x01 << i));
				});
				break;

		// noise frequency/source control (==> noise)
			case 22:
				this._noise[0].set(data & 0x03);
				this._noise[1].set((data >> 4) & 0x03);
				break;

		// Envelope control data (==> env) for envelope controller #0
			case 24:
				this._env[0].set(data);
				break;

		// Envelope control data (==> env) for envelope controller #1
			case 25:
				this._env[1].set(data);
				break;

		// sync/unsync all devices and reset them all to a known state
			case 28: {
				let mute: boolean = !(data & 0x01);
				let sync: boolean = !!(data & 0x02);

				this._freq.forEach(f => f.setSync(sync));
				this._noise.forEach(n => n.setSync(sync));
				this._amp.forEach((amp: SAAAmp, i: number) => {
					amp.mute = (mute || this._ampMuted[i]);
				}, this);

				this._enabled = !mute;
				this._sync = sync;
				break;
			}

			default:
				break;
		}
	}

	/**
	 * get current register
	 * @returns {number} BYTE in range 0-31
	 */
	public getReg(): number { return this._register; }

	/**
	 * set current register
	 * @param reg BYTE in range 0-31
	 */
	public setReg(reg: number) {
		this._register = (reg &= 0x1f);

		if (reg === 24) {
			this._env[0].tickExt();
		}
		else if (reg === 25) {
			this._env[1].tickExt();
		}
	}

	/**
	 * combo!
	 * @param reg
	 * @param data
	 */
	public setRegData(reg: number, data: number) {
		this.setReg(reg);
		this.setData(data);
	}

	/**
	 * channel mutation
	 * @param chn channel number 0-5
	 * @param mute boolean
	 */
	public mute(chn: number, mute: boolean) {
		if (chn < 0 || chn >= 6) {
			return;
		}
		this._amp[chn].mute = (this._ampMuted[chn] = mute);
	}

	/**
	 * TODO: get state of all registers and (un)muted channels
	 * @returns {SAASoundRegData}
	 */
	public getAllRegs() {
		let result = new SAASoundRegData;

		this._amp.forEach((amp, i: number) => result.muted[i] = amp.mute);

		return result;
	}

	/**
	 * fill all registers and (un)mute all channels
	 * @param data SAASoundRegData
	 */
	public setAllRegs(data: SAASoundRegData) {
		if (data.regs) {
			Object.keys(data.regs).forEach(key => {
				let reg: number = parseInt(key.substr(1), 16);
				let dat: number = data.regs[key];

				this.setRegData(reg, dat);
			}, this);
		}

		if (data.muted) {
			data.muted.forEach((m: boolean, i: number) => this.mute(i, m), this);
		}
	}

//---------------------------------------------------------------------------------------
	public output(leftBuf: Float32Array, rightBuf: Float32Array, length: number, offset: number = 0) {
		let ptr: number = offset;
		let len: number = length + ptr;
		let val: Float32Array = new Float32Array([0, 0]);

		for (; ptr < len; ptr++) {
			this._noise[0].tick();
			this._noise[1].tick();

			val[0] = val[1] = 0;
			this._amp.forEach(a => a.output(val));

			leftBuf[ptr]  = val[0];
			rightBuf[ptr] = val[1];
		}

		val = null;
	}
}
//---------------------------------------------------------------------------------------
