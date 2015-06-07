/*! SAANoise: Noise generator */
//---------------------------------------------------------------------------------------
class SAANoise {
	public  level: number;

	private counter: number;
	private add: number;            // add for 31.25|15.63|7.8 kHz noise at samplerate
	private sync: boolean;          // see description of "SYNC" bit of register 28
	private rand: number;           // pseudo-random number generator
	private smpRate: number;
	private src: number;

	constructor(seed: number = 0x11111111) {
		this.counter = 0;
		this.add = 128e6; // 31250 << 12
		this.sync = false;
		this.smpRate = SAASound.sampleRate << 12;
		this.src = 0;
		this.rand = seed;
	}

	/**
	 * send command to noise generator
	 * @param src values 0 to 3
	 */
	public set(src: number) {
		this.src = (src &= 3);
		this.add = 128e6 >> src;
	}

	/**
	 * trigger() only does anything useful when we're
	 * clocking from the frequency generator (i.e. SourceMode = 3).
	 * So if we're clocking from the noise generator clock
	 * (ie, SourceMode = 0, 1 or 2) then do nothing...
	 */
	public trigger() {
		if (this.src === 3)
			this.rnd();
	}

	/*
	 * tick only does anything useful when we're
	 * clocking from the noise generator clock (ie, SourceMode = 0, 1 or 2)
	 * So, if SourceMode = 3 (ie, we're clocking from a frequency generator)
	 * then do nothing...
	 */
	public tick(): number {
		if (!this.sync && (this.src != 3)) {
			this.counter += this.add;
			if (this.counter >= this.smpRate) {
				while (this.counter >= this.smpRate) {
					this.counter -= this.smpRate;
					this.rnd();
				}
			}
		}

		return (this.rand & 1);
	}

	public setSync(sync: boolean) {
		if (sync)
			this.counter = 0;
		this.sync = sync;
	}

	private rnd() {
		if (!!(this.rand & 0x40000004) && (this.rand & 0x40000004) != 0x40000004)
			this.rand = (this.rand << 1) | 1;
		else
			this.rand <<= 1;
		this.level = (this.rand & 1) << 1;
	}
}
//---------------------------------------------------------------------------------------
