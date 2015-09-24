/*! SAAFreq: Frequency oscillator, 7-bit fractional accuracy */
//---------------------------------------------------------------------------------------
class SAAFreq {
	public  level: number;

	private counter: number = 0;
	private add: number = 0;
	private curOffset: number = 0;
	private curOctave: number = 0;
	private nextOffset: number = 0;
	private nextOctave: number = 0;

	private ignoreOffset: boolean = false;
	private newdata: boolean = false;
	private sync: boolean = false;

	private smpRate: number;
	private mode: number;

	private noiseGen: SAANoise;
	private envGen: SAAEnv;

	private static freqs: number[][];

	constructor(pcNoise?: SAANoise, pcEnv?: SAAEnv) {
		this.level = 2;
		this.smpRate = SAASound.sampleRate << 12;
		this.noiseGen = pcNoise;
		this.envGen = pcEnv;
		this.mode = (!pcNoise ? (!pcEnv ? 0 : 1) : 2);

		// pregenerate frequency lookup table...
		if (!SAAFreq.freqs) {
			console.log('SAASound', 'Pregenerating lookup table with all frequencies...');

			var freqs = [];
			for (var o: number = 0, i: number; o < 8; o++) {
				freqs[o] = [];
				for (i = 0; i < 256; i++)
					freqs[o][i] = Math.round(((32e6 << o) >>> 0) / (511 - i)) << 2;
			}

			SAAFreq.freqs = freqs;
		}

		this.add = SAAFreq.freqs[this.curOctave][this.curOffset];
	}

	/**
	 * @param offset between 0 and 255
	 */
	public setOffset(offset: number) {
		if (!this.sync) {
			this.nextOffset = offset;
			this.newdata = true;

			/**
			 * According to Philips, if you send the SAA-1099
			 * new Octave data and then new Offset data in that
			 * order, on the next half-cycle of the current frequency
			 * generator, ONLY the octave data is acted upon.
			 * The offset data will be acted upon next time.
			 */
			if (this.nextOctave == this.curOctave)
				this.ignoreOffset = true;
		}
		else {
			// updates straightaway if this.sync
			this.newdata = false;
			this.curOffset = offset;
			this.curOctave = this.nextOctave;
			this.add = SAAFreq.freqs[this.curOctave][this.curOffset];
		}
	}

	/**
	 * @param octave between 0 and 7
	 */
	public setOctave(octave: number) {
		if (!this.sync) {
			this.nextOctave = octave;
			this.newdata = true;
			this.ignoreOffset = false;
		}
		else {
			// updates straightaway if this.sync
			this.newdata = false;
			this.curOctave = octave;
			this.curOffset = this.nextOffset;
			this.add = SAAFreq.freqs[this.curOctave][this.curOffset];
		}
	}

	/**
	 * Loads the buffered new octave and new offset data into the current registers
	 * and sets up the new frequency for this frequency generator (i.e. sets up this.add)
	 * - called during sync, and called when waveform half-cycle completes...
	 *
	 * How the SAA-1099 really treats new data:
	 * if only new octave data is present,
	 * then set new period based on just the octave data.
	 * Otherwise, if only new offset data is present,
	 * then set new period based on just the offset data.
	 * Otherwise, if new octave data is present, and new offset data is present,
	 * and the offset data was set BEFORE the octave data,
	 * then set new period based on both the octave and offset data.
	 * Else, if the offset data came AFTER the new octave data
	 * then set new period based on JUST THE OCTAVE DATA, and continue
	 * signalling the offset data as 'new', so it will be acted upon next half-cycle.
	 * Weird, I know. But that's how it works. Philips even documented as much...
	 */
	public update()
	{
		if (!this.newdata)
			return;

		this.curOctave = this.nextOctave;
		if (!this.ignoreOffset) {
			this.curOffset = this.nextOffset;
			this.newdata = false;
		}

		this.ignoreOffset = false;
		this.add = SAAFreq.freqs[this.curOctave][this.curOffset];
	}

	public tick(): number {
		// set to the absolute level (0 or 2)
		if (!this.sync) {
			this.counter += this.add;

			if (this.counter >= this.smpRate) {
				// period elapsed for one half-cycle of current frequency
				// reset counter to zero (or thereabouts, taking into account
				// the fractional part in the lower 12 bits)

				while (this.counter >= this.smpRate) {
					this.counter -= this.smpRate;

					// flip state - from 0 to -2 or vice versa
					this.level = 2 - this.level;

					// trigger any connected devices
					if (this.mode === 1)
						this.envGen.tickInt();
					else if (this.mode === 2)
						this.noiseGen.trigger();
				}

				// get new frequency (set period length this.add) if new data is waiting:
				this.update();
			}
		}

		return this.level;
	}

	public setSync(sync: boolean) {
		this.sync = sync;
		if (sync) {
			this.counter = 0;
			this.level = 2;
			this.curOctave = this.nextOctave;
			this.curOffset = this.nextOffset;
			this.add = SAAFreq.freqs[this.curOctave][this.curOffset];
		}
	}
}
//---------------------------------------------------------------------------------------
