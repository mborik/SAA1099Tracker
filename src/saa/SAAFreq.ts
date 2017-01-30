/*! SAAFreq: Frequency oscillator, 7-bit fractional accuracy */
//---------------------------------------------------------------------------------------
class SAAFreq {
	public level: number;

	private _counter: number = 0;
	private _add: number = 0;
	private _curOffset: number = 0;
	private _curOctave: number = 0;
	private _nextOffset: number = 0;
	private _nextOctave: number = 0;

	private _ignoreOffset: boolean = false;
	private _newdata: boolean = false;
	private _sync: boolean = false;

	private _smpRate: number;
	private _mode: number;

	private _noiseGen: SAANoise;
	private _envGen: SAAEnv;

	private static freqs: number[][];

	constructor(pcNoise?: SAANoise, pcEnv?: SAAEnv) {
		this.level = 2;
		this._smpRate = SAASound.sampleRate << 12;
		this._noiseGen = pcNoise;
		this._envGen = pcEnv;
		this._mode = (!pcNoise ? (!pcEnv ? 0 : 1) : 2);

		// pregenerate frequency lookup table...
		if (!SAAFreq.freqs) {
			console.log('SAASound', 'Pregenerating lookup table with all frequencies...');

			let freqs: number[][] = [];
			for (let o: number = 0, i: number; o < 8; o++) {
				freqs[o] = [];
				for (i = 0; i < 256; i++) {
					freqs[o][i] = Math.round(((32e6 << o) >>> 0) / (511 - i)) << 2;
				}
			}

			SAAFreq.freqs = freqs;
		}

		this._add = SAAFreq.freqs[this._curOctave][this._curOffset];
	}

	/**
	 * @param offset between 0 and 255
	 */
	public setOffset(offset: number) {
		if (!this._sync) {
			this._nextOffset = offset;
			this._newdata = true;

			/**
			 * According to Philips, if you send the SAA-1099
			 * new Octave data and then new Offset data in that
			 * order, on the next half-cycle of the current frequency
			 * generator, ONLY the octave data is acted upon.
			 * The offset data will be acted upon next time.
			 */
			if (this._nextOctave === this._curOctave) {
				this._ignoreOffset = true;
			}
		}
		else {
			// updates straightaway if this.sync
			this._newdata = false;
			this._curOffset = offset;
			this._curOctave = this._nextOctave;
			this._add = SAAFreq.freqs[this._curOctave][this._curOffset];
		}
	}

	/**
	 * @param octave between 0 and 7
	 */
	public setOctave(octave: number) {
		if (!this._sync) {
			this._nextOctave = octave;
			this._newdata = true;
			this._ignoreOffset = false;
		}
		else {
			// updates straightaway if this.sync
			this._newdata = false;
			this._curOctave = octave;
			this._curOffset = this._nextOffset;
			this._add = SAAFreq.freqs[this._curOctave][this._curOffset];
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
	public update() {
		if (!this._newdata) {
			return;
		}

		this._curOctave = this._nextOctave;
		if (!this._ignoreOffset) {
			this._curOffset = this._nextOffset;
			this._newdata = false;
		}

		this._ignoreOffset = false;
		this._add = SAAFreq.freqs[this._curOctave][this._curOffset];
	}

	public tick(): number {
		// set to the absolute level (0 or 2)
		if (!this._sync) {
			this._counter += this._add;

			if (this._counter >= this._smpRate) {
				// period elapsed for one half-cycle of current frequency
				// reset counter to zero (or thereabouts, taking into account
				// the fractional part in the lower 12 bits)

				while (this._counter >= this._smpRate) {
					this._counter -= this._smpRate;

					// flip state - from 0 to -2 or vice versa
					this.level = 2 - this.level;

					// trigger any connected devices
					if (this._mode === 1) {
						this._envGen.tickInt();
					}
					else if (this._mode === 2) {
						this._noiseGen.trigger();
					}
				}

				// get new frequency (set period length this.add) if new data is waiting:
				this.update();
			}
		}

		return this.level;
	}

	public setSync(sync: boolean) {
		this._sync = sync;
		if (sync) {
			this._counter = 0;
			this.level = 2;
			this._curOctave = this._nextOctave;
			this._curOffset = this._nextOffset;
			this._add = SAAFreq.freqs[this._curOctave][this._curOffset];
		}
	}
}
//---------------------------------------------------------------------------------------
