/*!
 * SAASound is a Phillips SAA 1099 sound chip emulator
 * Copyright (c) 2015 Martin Borik <mborik@users.sourceforge.net>
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
class SAASound {
	public static sampleRate: number;

	private register: number = 0;
	private enabled: boolean = false;
	private ampMuted: boolean[] = [ false, false, false, false, false, false ];
	private sync: boolean;

	private env: SAAEnv[];
	private noise: SAANoise[];
	private freq: SAAFreq[];
	private amp: SAAAmp[];

	constructor(sampleRate: number) {
		console.log('SAASound', 'Initializing emulation based on samplerate %dHz...', sampleRate);
		SAASound.sampleRate = sampleRate;

		this.env = [ new SAAEnv, new SAAEnv ];

		this.noise = [
			new SAANoise(0x14af5209),
			new SAANoise(0x76a9b11e)
		];

		this.freq = [
			new SAAFreq(this.noise[0]),
			new SAAFreq(null, this.env[0]),
			new SAAFreq(),
			new SAAFreq(this.noise[1]),
			new SAAFreq(null, this.env[1]),
			new SAAFreq()
		];

		this.amp = [
			new SAAAmp(this.freq[0], this.noise[0]),
			new SAAAmp(this.freq[1], this.noise[0]),
			new SAAAmp(this.freq[2], this.noise[0], this.env[0]),
			new SAAAmp(this.freq[3], this.noise[1]),
			new SAAAmp(this.freq[4], this.noise[1]),
			new SAAAmp(this.freq[5], this.noise[1], this.env[1])
		];

		this.reset();
		console.log('SAASound', 'Chip emulation initialized...');
	}

	public reset() {
		// sets reg 28 to 0x02 - sync and disabled
		this.setRegData(28, 2);

		// sets regs 00-31 (except 28) to 0
		for (var i = 31; i >= 0; i--) {
			if (i != 28)
				this.setRegData(i, 0);
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

		var reg: number = this.register;
		switch(reg) {
		// Amplitude data (==> amp)
			case 0:
			case 1:
			case 2:
			case 3:
			case 4:
			case 5:
				this.amp[reg].setLevel(data);
				break;

		// Freq data (==> freq)
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
				this.freq[(reg & 0x07)].setOffset(data);
				break;

		// Freq octave data (==> freq) for channels 0,1
			case 16:
				this.freq[0].setOctave(data & 0x07);
				this.freq[1].setOctave((data >> 4) & 0x07);
				break;

		// Freq octave data (==> freq) for channels 2,3
			case 17:
				this.freq[2].setOctave(data & 0x07);
				this.freq[3].setOctave((data >> 4) & 0x07);
				break;

		// Freq octave data (==> freq) for channels 4,5
			case 18:
				this.freq[4].setOctave(data & 0x07);
				this.freq[5].setOctave((data >> 4) & 0x07);
				break;

		// Tone mixer control (==> amp)
			case 20:
				this.amp[0].setFreqMixer(data & 0x01);
				this.amp[1].setFreqMixer(data & 0x02);
				this.amp[2].setFreqMixer(data & 0x04);
				this.amp[3].setFreqMixer(data & 0x08);
				this.amp[4].setFreqMixer(data & 0x10);
				this.amp[5].setFreqMixer(data & 0x20);
				break;

		// noise mixer control (==> amp)
			case 21:
				this.amp[0].setNoiseMixer(data & 0x01);
				this.amp[1].setNoiseMixer(data & 0x02);
				this.amp[2].setNoiseMixer(data & 0x04);
				this.amp[3].setNoiseMixer(data & 0x08);
				this.amp[4].setNoiseMixer(data & 0x10);
				this.amp[5].setNoiseMixer(data & 0x20);
				break;

		// noise frequency/source control (==> noise)
			case 22:
				this.noise[0].set(data & 0x03);
				this.noise[1].set((data >> 4) & 0x03);
				break;

		// Envelope control data (==> env) for envelope controller #0
			case 24:
				this.env[0].set(data);
				break;

		// Envelope control data (==> env) for envelope controller #1
			case 25:
				this.env[1].set(data);
				break;

		// sync/unsync all devices and reset them all to a known state
			case 28:
				var i;
				var mute: boolean = !(data & 0x01);
				var sync: boolean = !!(data & 0x02);

				for (i = 0; i < 6; i++)
					this.freq[i].setSync(sync);
				this.noise[0].setSync(sync);
				this.noise[1].setSync(sync);
				this.sync = sync;

				// mute all amps
				if (mute) {
					for (i = 0; i < 6; i++)
						this.amp[i].mute = mute;
					this.enabled = false;
				}
				// unmute all amps - sound 'enabled'
				else {
					for (i = 0; i < 6; i++)
						this.amp[i].mute = this.ampMuted[i];
					this.enabled = true;
				}
				break;

			default:
				break;
		}
	}

	/**
	 * get current register
	 * @returns {number} BYTE in range 0-31
	 */
	public getReg(): number { return this.register; }

	/**
	 * set current register
	 * @param reg BYTE in range 0-31
	 */
	public setReg(reg: number) {
		this.register = (reg &= 0x1f);

		if (reg === 24)
			this.env[0].tickExt();
		else if (reg === 25)
			this.env[1].tickExt();
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
		if (chn < 0 || chn >= 6)
			return;
		this.amp[chn].mute = (this.ampMuted[chn] = mute);
	}

//---------------------------------------------------------------------------------------
	public output(leftBuf: Float32Array, rightBuf: Float32Array, length: number, offset?: number) {
		var i: number = 0,
			ptr: number = (offset || 0),
			len: number = length + ptr,
			val: Float32Array = new Float32Array([0, 0]);

		for (; ptr < len; ptr++) {
			this.noise[0].tick();
			this.noise[1].tick();

			val[0] = val[1] = 0;
			this.amp[0].output(val);
			this.amp[1].output(val);
			this.amp[2].output(val);
			this.amp[3].output(val);
			this.amp[4].output(val);
			this.amp[5].output(val);

			leftBuf[ptr]  = val[0];
			rightBuf[ptr] = val[1];
		}

		val = null;
	}
}
//---------------------------------------------------------------------------------------
