/*! SAAFreq: Frequency oscillator, 7-bit fractional accuracy */
//---------------------------------------------------------------------------------------
class SAAFreq {
	private nLevel: number;
	private nCounter: number = 0;
	private nAdd: number = 0;
	private nCurrentOffset: number = 0;
	private nCurrentOctave: number = 0;
	private nNextOffset: number = 0;
	private nNextOctave: number = 0;

	private bIgnoreOffsetData: boolean = false;
	private bNewData: boolean = false;
	private bSync: boolean = false;

	private nSmpRate: number;
	private nConnectedMode: number;

	private pcConnectedNoiseGenerator: SAANoise;
	private pcConnectedEnvGenerator: SAAEnv;

	constructor(pcNoise?: SAANoise, pcEnv?: SAAEnv) {
		this.nLevel = 2;
		this.nSmpRate = SAASound.nSampleRate * SAASound.nBufferSize;
		this.pcConnectedNoiseGenerator = pcNoise;
		this.pcConnectedEnvGenerator = pcEnv;
		this.nConnectedMode = (pcNoise ? (pcEnv ? 0 : 1) : 2);
		this.SetAdd();
	}

	public Level(): number { return this.nLevel; }

	/**
	 * @param nOffset between 0 and 255
	 */
	public SetFreqOffset(nOffset: number) {
		if (!this.bSync) {
			this.nNextOffset = nOffset;
			this.bNewData = true;

			/**
			 * According to Philips, if you send the SAA-1099
			 * new Octave data and then new Offset data in that
			 * order, on the next half-cycle of the current frequency
			 * generator, ONLY the octave data is acted upon.
			 * The offset data will be acted upon next time.
			 */
			if (this.nNextOctave == this.nCurrentOctave)
				this.bIgnoreOffsetData = true;
		}
		else {
			// updates straightaway if this.bSync
			this.bNewData = false;
			this.nCurrentOffset = nOffset;
			this.nCurrentOctave = this.nNextOctave;
			this.SetAdd();
		}
	}

	/**
	 * @param nOctave between 0 and 7
	 */
	public SetFreqOctave(nOctave: number) {
		if (!this.bSync) {
			this.nNextOctave = nOctave;
			this.bNewData = true;
			this.bIgnoreOffsetData = false;
		}
		else {
			// updates straightaway if this.bSync
			this.bNewData = false;
			this.nCurrentOctave = nOctave;
			this.nCurrentOffset = this.nNextOffset;
			this.SetAdd();
		}
	}

	/**
	 * Loads the buffered new octave and new offset data into the current registers
	 * and sets up the new frequency for this frequency generator (i.e. sets up this.nAdd)
	 * - called during Sync, and called when waveform half-cycle completes...
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
	public UpdateOctaveOffsetData()
	{
		if (!this.bNewData)
			return;

		this.nCurrentOctave = this.nNextOctave;
		if (!this.bIgnoreOffsetData) {
			this.nCurrentOffset = this.nNextOffset;
			this.bNewData = false;
		}

		this.bIgnoreOffsetData = false;
		this.SetAdd();
	}

	public Tick(): number {
		// set to the absolute level (0 or 2)
		if (!this.bSync) {
			this.nCounter += this.nAdd;

			if (this.nCounter >= this.nSmpRate) {
				// period elapsed for one half-cycle of current frequency
				// reset counter to zero (or thereabouts, taking into account
				// the fractional part in the lower 12 bits)

				while (this.nCounter >= this.nSmpRate) {
					this.nCounter -= this.nSmpRate;

					// flip state - from 0 to -2 or vice versa
					this.nLevel = 2 - this.nLevel;

					// trigger any connected devices
					if (this.nConnectedMode === 1)
						this.pcConnectedEnvGenerator.InternalClock();
					else if (this.nConnectedMode === 2)
						this.pcConnectedNoiseGenerator.Trigger();
				}

				// get new frequency (set period length this.nAdd) if new data is waiting:
				this.UpdateOctaveOffsetData();
			}
		}

		return this.nLevel;
	}

	public Sync(bSync: boolean) {
		this.bSync = bSync;
		if (bSync) {
			this.nCounter = 0;
			this.nLevel = 2;
			this.nCurrentOctave = this.nNextOctave;
			this.nCurrentOffset = this.nNextOffset;
			this.SetAdd();
		}
	}

	private SetAdd() { this.nAdd = ((15625 << this.nCurrentOctave) / (511 - this.nCurrentOffset)) >> 0; }
}
//---------------------------------------------------------------------------------------
