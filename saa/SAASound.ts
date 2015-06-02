/*!
 * SAASound is a portable Phillips SAA 1099 sound chip emulator
 * Copyright (c) 1998-2004 Dave Hooper <stripwax@users.sourceforge.net>
 *
 * JavaScript version:
 * Copyright (c) 2015 Martin Borik <mborik@users.sourceforge.net>
 */
/*
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * - Neither the name Dave Hooper nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
//---------------------------------------------------------------------------------------
class SAASound {
//---------------------------------------------------------------------------------------
	public static nSampleRate: number;
	public static nBufferSize: number;
//---------------------------------------------------------------------------------------
	private nCurrentReg: number = 0;
	private bOutputEnabled: boolean = false;
	private bAmpMuted: boolean[] = [ false, false, false, false, false, false ];
	private bSync: boolean;

	private Env: SAAEnv[] = [ new SAAEnv, new SAAEnv ];

	private Noise: SAANoise[] = [
		new SAANoise(0x14af5209),
		new SAANoise(0x76a9b11e)
	];

	private Osc: SAAFreq[] = [
		new SAAFreq(this.Noise[0]),
		new SAAFreq(null, this.Env[0]),
		new SAAFreq(),
		new SAAFreq(this.Noise[1]),
		new SAAFreq(null, this.Env[1]),
		new SAAFreq()
	];

	private Amp: SAAAmp[] = [
		new SAAAmp(this.Osc[0], this.Noise[0]),
		new SAAAmp(this.Osc[1], this.Noise[0]),
		new SAAAmp(this.Osc[2], this.Noise[0], this.Env[0]),
		new SAAAmp(this.Osc[3], this.Noise[1]),
		new SAAAmp(this.Osc[4], this.Noise[1]),
		new SAAAmp(this.Osc[5], this.Noise[1], this.Env[1])
	];

	constructor(nSampleRate: number, nBufferSize: number) {
		SAASound.nSampleRate = nSampleRate;
		SAASound.nBufferSize = nBufferSize;
	}

	public Clear() {
		// sets reg 28 to 0x02 - sync and disabled
		this.WriteAddressData(28, 2);

		// sets regs 00-31 (except 28) to 0
		for (var i = 31; i >= 0; i--) {
			if (i != 28)
				this.WriteAddressData(i, 0);
		}

		// sets reg 28 to 0
		this.WriteAddressData(28, 0);

		// sets current reg to 0
		this.WriteAddress(0);
	}

	/**
	 * route nData to the appropriate place by current register
	 * @param nData BYTE
	 */
	public WriteData(nData: number) {
		nData &= 0xff;

		var nReg: number = this.nCurrentReg;
		switch(nReg) {
		// Amplitude data (==> Amp)
			case 0:
			case 1:
			case 2:
			case 3:
			case 4:
			case 5:
				this.Amp[nReg].SetAmpLevel(nData);
				break;

		// Freq data (==> Osc)
			case 8:
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
				this.Amp[(nReg & 0x07)].SetAmpLevel(nData);
				break;

		// Freq octave data (==> Osc) for channels 0,1
			case 16:
				this.Osc[0].SetFreqOctave(nData & 0x07);
				this.Osc[1].SetFreqOctave((nData >> 4) & 0x07);
				break;

		// Freq octave data (==> Osc) for channels 2,3
			case 17:
				this.Osc[2].SetFreqOctave(nData & 0x07);
				this.Osc[3].SetFreqOctave((nData >> 4) & 0x07);
				break;

		// Freq octave data (==> Osc) for channels 4,5
			case 18:
				this.Osc[4].SetFreqOctave(nData & 0x07);
				this.Osc[5].SetFreqOctave((nData >> 4) & 0x07);
				break;

		// Tone mixer control (==> Amp)
			case 20:
				this.Amp[0].SetToneMixer(nData & 0x01);
				this.Amp[1].SetToneMixer(nData & 0x02);
				this.Amp[2].SetToneMixer(nData & 0x04);
				this.Amp[3].SetToneMixer(nData & 0x08);
				this.Amp[4].SetToneMixer(nData & 0x10);
				this.Amp[5].SetToneMixer(nData & 0x20);
				break;

		// Noise mixer control (==> Amp)
			case 21:
				this.Amp[0].SetNoiseMixer(nData & 0x01);
				this.Amp[1].SetNoiseMixer(nData & 0x02);
				this.Amp[2].SetNoiseMixer(nData & 0x04);
				this.Amp[3].SetNoiseMixer(nData & 0x08);
				this.Amp[4].SetNoiseMixer(nData & 0x10);
				this.Amp[5].SetNoiseMixer(nData & 0x20);
				break;

		// Noise frequency/source control (==> Noise)
			case 22:
				this.Noise[0].SetSource(nData & 0x03);
				this.Noise[1].SetSource((nData >> 4) & 0x03);
				break;

		// Envelope control data (==> Env) for envelope controller #0
			case 24:
				this.Env[0].SetEnvControl(nData);
				break;

		// Envelope control data (==> Env) for envelope controller #1
			case 25:
				this.Env[1].SetEnvControl(nData);
				break;

		// Sync/unsync all devices and reset them all to a known state
			case 28:
				var i;
				var mute: boolean = !(nData & 0x01);
				var sync: boolean = !!(nData & 0x02);

				for (i = 0; i < 6; i++)
					this.Osc[i].Sync(sync);
				this.Noise[0].Sync(sync);
				this.Noise[1].Sync(sync);
				this.bSync = sync;

				// mute all amps
				if (mute) {
					for (i = 0; i < 6; i++)
						this.Amp[i].Mute(mute);
					this.bOutputEnabled = false;
				}
				// unmute all amps - sound 'enabled'
				else {
					for (i = 0; i < 6; i++)
						this.Amp[i].Mute(this.bAmpMuted[i]);
					this.bOutputEnabled = true;
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
	public ReadAddress(): number { return this.nCurrentReg; }

	/**
	 * set current register
	 * @param nReg BYTE in range 0-31
	 */
	public WriteAddress(nReg: number) {
		this.nCurrentReg = (nReg &= 0x1f);

		if (nReg === 24)
			this.Env[0].ExternalClock();
		else if (nReg === 25)
			this.Env[1].ExternalClock();
	}

	/**
	 * combo!
	 * @param nReg
	 * @param nData
	 */
	public WriteAddressData(nReg: number, nData: number) {
		this.WriteAddress(nReg);
		this.WriteData(nData);
	}

	/**
	 * channel mutation
	 * @param nChn channel number 0-5
	 * @param bMute boolean
	 */
	public MuteAmp(nChn: number, bMute: boolean) {
		if (nChn < 0 || nChn >= 6)
			return;
		this.Amp[nChn].Mute((this.bAmpMuted[nChn] = bMute));
	}
//---------------------------------------------------------------------------------------
	public GenerateMono(pBuffer: Float32Array, nSamples: number) {
		var ptr: number = 0, val: number;

		while (ptr < nSamples) {
			this.Noise[0].Tick();
			this.Noise[1].Tick();

			val = this.Amp[0].TickAndOutputMono()
				+ this.Amp[1].TickAndOutputMono()
				+ this.Amp[2].TickAndOutputMono()
				+ this.Amp[3].TickAndOutputMono()
				+ this.Amp[4].TickAndOutputMono()
				+ this.Amp[5].TickAndOutputMono();

			// force output into range 0 <= x < 1;
			pBuffer[ptr++] = val / 12672;
		}
	}

	public GenerateStereo(pLeft: Float32Array, pRight: Float32Array, nSamples: number) {
		var ptr: number = 0,
			val: stereolevel,
			ampL: number, ampR: number;

		while (ptr < nSamples) {
			this.Noise[0].Tick();
			this.Noise[1].Tick();

			val = this.Amp[0].TickAndOutputStereo();
			ampL = val.Left; ampR = val.Right;
			val = this.Amp[1].TickAndOutputStereo();
			ampL += val.Left; ampR += val.Right;
			val = this.Amp[2].TickAndOutputStereo();
			ampL += val.Left; ampR += val.Right;
			val = this.Amp[3].TickAndOutputStereo();
			ampL += val.Left; ampR += val.Right;
			val = this.Amp[4].TickAndOutputStereo();
			ampL += val.Left; ampR += val.Right;
			val = this.Amp[5].TickAndOutputStereo();
			ampL += val.Left; ampR += val.Right;

			// force output into range 0 <= x < 1;
			pRight[ptr]  = ampR / 12672;
			pLeft[ptr++] = ampL / 12672;
		}
	}
//---------------------------------------------------------------------------------------
}
//---------------------------------------------------------------------------------------
