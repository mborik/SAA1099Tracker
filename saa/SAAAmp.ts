/*! SAAAmp: Tone/Noise mixing, Envelope application and amplification */
//---------------------------------------------------------------------------------------
class SAAAmp {
	public  mute: boolean;

	private lastlvl: number = 0;
	private leftx16: number = 0;
	private leftx32: number = 0;
	private lefta0E: number = 0;
	private lefta0Ex2: number = 0;
	private rightx16: number = 0;
	private rightx32: number = 0;
	private righta0E: number = 0;
	private righta0Ex2: number = 0;

	private out: number = 0;
	private mix: number = 0;
	private env: boolean;

	private toneGen: SAAFreq;
	private noiseGen: SAANoise;
	private envGen: SAAEnv;

	private levels: Float32Array;

	constructor(ToneGenerator: SAAFreq, NoiseGenerator: SAANoise, EnvGenerator?: SAAEnv) {
		this.toneGen = ToneGenerator;
		this.noiseGen = NoiseGenerator;
		this.envGen = EnvGenerator;
		this.env = !!EnvGenerator;
		this.mute = true;

		// generate precalculated volume levels to Float32 for fast mix calculations...
		this.levels = new Float32Array(512);
		for (var i: number = 0; i < 512; i++)
			this.levels[i] = i / 2880; // 15 max.volume * 32 multiplier * 6 channel
	}

	/**
	 * Set amplitude, but if level unchanged since last call then do nothing.
	 * @param level BYTE
	 */
	public setLevel(level: number) {
		if ((level &= 255) !== this.lastlvl) {
			this.lastlvl = level;
			this.lefta0E = level & 0xe;
			this.lefta0Ex2 = this.lefta0E << 1;
			this.leftx16 = (level & 0xf) << 4;
			this.leftx32 = this.leftx16 << 1;

			this.righta0E = (level >> 4) & 0xe;
			this.righta0Ex2 = this.righta0E << 1;
			this.rightx16 = level & 0xf0;
			this.rightx32 = this.rightx16 << 1;
		}
	}

	public setFreqMixer (enable: number) { this.mix = enable ? (this.mix | 1) : (this.mix & 2) }
	public setNoiseMixer(enable: number) { this.mix = enable ? (this.mix | 2) : (this.mix & 1) }

	public tick() {
		switch (this.mix) {
			case 0:
				// no tones or noise for this channel
				this.toneGen.tick();
				this.out = 0;
				break;
			case 1:
				// tones only for this channel
				// NOTE: ConnectedToneGenerator returns either 0 or 2
				this.out = this.toneGen.tick();
				break;
			case 2:
				// noise only for this channel
				this.toneGen.tick();
				this.out = this.noiseGen.level;
				break;
			case 3:
				// tones+noise for this channel ... mixing algorithm:
				this.out = this.toneGen.tick();
				if (this.out === 2 && !!this.noiseGen.level)
					this.out = 1;
				break;
		}
	}

	public output(last: Float32Array) {
		this.tick();

		if (this.mute)
			return;

		// now calculate the returned amplitude for this sample:
		var e: boolean = (this.env && this.envGen.enabled);
		if (this.out === 0) {
			if (e) {
				last[0] += this.levels[this.envGen.left * this.lefta0Ex2];
				last[1] += this.levels[this.envGen.right * this.righta0Ex2];
			}
		}
		else if (this.out === 1) {
			if (e) {
				last[0] += this.levels[this.envGen.left * this.lefta0E];
				last[1] += this.levels[this.envGen.right * this.righta0E];
			}
			else {
				last[0] += this.levels[this.leftx16];
				last[1] += this.levels[this.rightx16];
			}
		}
		else if (this.out === 2) {
			if (!e) {
				last[0] += this.levels[this.leftx32];
				last[1] += this.levels[this.rightx32];
			}
		}
	}
}
//---------------------------------------------------------------------------------------
