/*! SAANoise: Noise generator */
//---------------------------------------------------------------------------------------
class SAANoise {
	private nCounter: number;
	private nAdd: number;           // nAdd for 31.25 kHz noise at samplerate
	private bSync: boolean;         // see description of "SYNC" bit of register 28
	private nRand: number;          // pseudo-random number generator
	private nSmpRate: number;
	private nSource: number;

	constructor(seed: number = 0x11111111) {
		this.nCounter = 0;
		this.nAdd = 128e6; // 31250 << 12
		this.bSync = false;
		this.nSmpRate = SAASound.nSampleRate << 12;
		this.nSource = 0;
		this.nRand = seed;
	}

	public Level(): number { return (this.nRand & 1) << 1; }

	/**
	 * send command to noise generator
	 * @param nSource values 0 to 3
	 */
	public SetSource(nSource: number) {
		this.nSource = (nSource &= 3);
		this.nAdd = 128e6 >> nSource;
	}

	/**
	 * Trigger only does anything useful when we're
	 * clocking from the frequency generator (i.e. SourceMode = 3).
	 * So if we're clocking from the noise generator clock
	 * (ie, SourceMode = 0, 1 or 2) then do nothing...
	 */
	public Trigger() {
		if (this.nSource === 3)
			this.ChangeLevel();
	}

	/*
	 * Tick only does anything useful when we're
	 * clocking from the noise generator clock (ie, SourceMode = 0, 1 or 2)
	 * So, if SourceMode = 3 (ie, we're clocking from a frequency generator)
	 * then do nothing...
	 */
	public Tick(): number {
		if (!this.bSync && (this.nSource != 3)) {
			this.nCounter += this.nAdd;
			if (this.nCounter >= this.nSmpRate) {
				while (this.nCounter >= this.nSmpRate) {
					this.nCounter -= this.nSmpRate;
					this.ChangeLevel();
				}
			}
		}

		return (this.nRand & 1);
	}

	public Sync(bSync: boolean) {
		if (bSync)
			this.nCounter = 0;
		this.bSync = bSync;
	}

	private ChangeLevel() {
		if (!!(this.nRand & 0x40000004) && (this.nRand & 0x40000004) != 0x40000004)
			this.nRand = (this.nRand << 1) | 1;
		else
			this.nRand <<= 1;
	}
}
//---------------------------------------------------------------------------------------
