/*! SAAAmp: Tone/Noise mixing, Envelope application and amplification */
//---------------------------------------------------------------------------------------
class SAAAmp {
	public mute: boolean;

	private _lastlvl: number = 0;
	private _leftx16: number = 0;
	private _leftx32: number = 0;
	private _lefta0E: number = 0;
	private _lefta0Ex2: number = 0;
	private _rightx16: number = 0;
	private _rightx32: number = 0;
	private _righta0E: number = 0;
	private _righta0Ex2: number = 0;

	private _out: number = 0;
	private _mix: number = 0;
	private _env: boolean;

	private _toneGen: SAAFreq;
	private _noiseGen: SAANoise;
	private _envGen: SAAEnv;

	private static levels: Float32Array;

	constructor(ToneGenerator: SAAFreq, NoiseGenerator: SAANoise, EnvGenerator?: SAAEnv) {
		this._toneGen = ToneGenerator;
		this._noiseGen = NoiseGenerator;
		this._envGen = EnvGenerator;
		this._env = !!EnvGenerator;
		this.mute = true;

		// generate precalculated volume levels to Float32 for fast mix calculations...
		if (!SAAAmp.levels) {
			console.log('SAASound', 'Pregenerating lookup table with float 32bit volume levels...');

			let levels = new Float32Array(512);
			for (let i: number = 0; i < 512; i++) {
				levels[i] = i / 2880; // 15 max.volume * 32 multiplier * 6 channel
			}

			SAAAmp.levels = levels;
		}
	}

	/**
	 * Set amplitude, but if level unchanged since last call then do nothing.
	 * @param level BYTE
	 */
	public setLevel(level: number) {
		if ((level &= 0xff) !== this._lastlvl) {
			this._lastlvl = level;
			this._lefta0E = level & 0xe;
			this._lefta0Ex2 = this._lefta0E << 1;
			this._leftx16 = (level & 0xf) << 4;
			this._leftx32 = this._leftx16 << 1;

			this._righta0E = (level >> 4) & 0xe;
			this._righta0Ex2 = this._righta0E << 1;
			this._rightx16 = level & 0xf0;
			this._rightx32 = this._rightx16 << 1;
		}
	}

	public setFreqMixer (enable: number) { this._mix = enable ? (this._mix | 1) : (this._mix & 2) }
	public setNoiseMixer(enable: number) { this._mix = enable ? (this._mix | 2) : (this._mix & 1) }

	public tick() {
		switch (this._mix) {
			case 0:
				// no tones or noise for this channel
				this._toneGen.tick();
				this._out = 0;
				break;
			case 1:
				// tones only for this channel
				// NOTE: ConnectedToneGenerator returns either 0 or 2
				this._out = this._toneGen.tick();
				break;
			case 2:
				// noise only for this channel
				this._toneGen.tick();
				this._out = this._noiseGen.level;
				break;
			case 3:
				// tones+noise for this channel ... mixing algorithm:
				this._out = this._toneGen.tick();
				if (this._out === 2 && !!this._noiseGen.level) {
					this._out = 1;
				}
				break;
		}
	}

	public output(last: Float32Array) {
		this.tick();

		if (this.mute) {
			return;
		}

		// now calculate the returned amplitude for this sample:
		let e: boolean = (this._env && this._envGen.enabled);
		let levels: Float32Array = SAAAmp.levels;

		switch (this._out) {
			case 0:
				if (e) {
					last[0] += levels[this._envGen.left * this._lefta0Ex2];
					last[1] += levels[this._envGen.right * this._righta0Ex2];
				}
				break;
			case 1:
				last[0] += e ? levels[this._envGen.left * this._lefta0E] : levels[this._leftx16];
				last[1] += e ? levels[this._envGen.right * this._righta0E] : levels[this._rightx16];
				break;
			case 2:
				if (!e) {
					last[0] += levels[this._leftx32];
					last[1] += levels[this._rightx32];
				}
				break;
		}
	}
}
//---------------------------------------------------------------------------------------
