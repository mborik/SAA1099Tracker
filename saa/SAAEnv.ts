/*! SAAEnv: Envelope generator */
//---------------------------------------------------------------------------------------
/// <reference path="SAASound.ts" />
module SAASound {
//---------------------------------------------------------------------------------------
interface ENVDATA {
	nPhases: number;
	bLooping: boolean;
	aLevels: number[][][];
}
//---------------------------------------------------------------------------------------
export class SAAEnv {
	private nLeftLevel: number;
	private nRightLevel: number;
	private pEnvData: ENVDATA;
	private bEnabled: boolean;
	private bStereo: boolean;
	private nPhase: number;
	private nPhasePosition: number;
	private bEnded: boolean;
	private bLooping: boolean;
	private nPhases: number;
	private nResolution: boolean;
	private bNewData: boolean;
	private nNextData: number;
	private bOkForNewData: boolean;
	private bClockExternally: boolean;

	private cs_EnvData: ENVDATA[] = [
		{ nPhases: 1, bLooping: false, aLevels: [
			[[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]},
		{ nPhases: 1, bLooping: true, aLevels: [
			[[15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15],
			 [15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15]],
			[[14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14],
			 [14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14]]]},
		{ nPhases: 1, bLooping: false, aLevels: [
			[[15,14,13,12,11,10,9, 8, 7, 6, 5, 4, 3, 2, 1, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[14,14,12,12,10,10,8, 8, 6, 6, 4, 4, 2, 2, 0, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]},
		{ nPhases: 1, bLooping: true, aLevels: [
			[[15,14,13,12,11,10,9, 8, 7, 6, 5, 4, 3, 2, 1, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[14,14,12,12,10,10,8, 8, 6, 6, 4, 4, 2, 2, 0, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]},
		{ nPhases: 2, bLooping: false, aLevels: [
			[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11,12,13,14,15],
			 [15,14,13,12,11,10,9, 8, 7, 6, 5, 4, 3, 2, 1, 0 ]],
			[[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10,10,12,12,14,14],
			 [14,14,12,12,10,10,8, 8, 6, 6, 4, 4, 2, 2, 0, 0 ]]]},
		{ nPhases: 2, bLooping: true, aLevels: [
			[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11,12,13,14,15],
			 [15,14,13,12,11,10,9, 8, 7, 6, 5, 4, 3, 2, 1, 0 ]],
			[[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10,10,12,12,14,14],
			 [14,14,12,12,10,10,8, 8, 6, 6, 4, 4, 2, 2, 0, 0 ]]]},
		{ nPhases: 1, bLooping: false, aLevels: [
			[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11,12,13,14,15],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10,10,12,12,14,14],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]},
		{ nPhases: 1, bLooping: true, aLevels: [
			[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11,12,13,14,15],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10,10,12,12,14,14],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]}
	];

	constructor() {
		this.bEnabled = false;
		this.bNewData = false;
		this.nNextData = 0;
		this.bOkForNewData = false;

		this.SetNewEnvData();
	}

	/** Do the Tick if envelope control is enabled and clock mode set to internal */
	public InternalClock() {
		if (this.bEnabled && !this.bClockExternally)
			this.Tick();
	}

	/** Do the Tick if envelope control is enabled and clock mode set to external */
	public ExternalClock() {
		if (this.bEnabled && this.bClockExternally)
			this.Tick();
	}

	/**
	 * send command to envgenerator
	 * @param nData BYTE
	 */
	public SetEnvControl(nData: number) {
		// process immediate stuff first:
		this.nResolution = !!(nData & 0x10);
		this.bEnabled = !!(nData & 0x80);

		if (!this.bEnabled) {
			// env control was enabled, and now disabled, so reset
			// pointers to start of envelope waveform
			this.nPhase = 0;
			this.nPhasePosition = 0;
			this.bEnded = true;
			this.bOkForNewData = true;
			// store current new data, and set the newdata flag:
			this.bNewData = true;
			this.nNextData = nData;

			return this.SetLevels();
		}

		// now buffered stuff: but only if it's ok to, and only if the
		// envgenerator is not disabled. otherwise it just stays buffered until
		// the Tick() function sets okfornewdata to true and realises there is
		// already some new data waiting
		if (this.bOkForNewData) {
			// also does the SetLevels() call for us.
			this.SetNewEnvData(nData);
			this.bNewData = false;
			this.bOkForNewData = false;
		}
		else {
			// since the 'next resolution' changes arrive unbuffered, we
			// may need to change the current level because of this:
			this.SetLevels();

			// store current new data, and set the newdata flag:
			this.bNewData = true;
			this.nNextData = nData;
		}
	}

	private Tick() {
		// if disabled, do nothing and for sanity, reset stuff...
		if (!this.bEnabled) {
			this.bEnded = true;
			this.nPhase = 0;
			this.nPhasePosition = 0;
			this.bOkForNewData = true;
			return;
		}
		else if (this.bEnded) {
			// do nothing
			// (specifically, don't change the values of bEnded,
			//  nPhase and nPhasePosition, as these will still be needed
			//  by SetLevels() should it be called again)
			return;
		}

		// Continue playing the same envelope ...
		// increments the phaseposition within an envelope.
		// also handles looping and resolution appropriately.
		// Changes the level of the envelope accordingly
		// through calling SetLevels() . This must be called after making
		// any changes that will affect the output levels of the env controller!!
		// SetLevels also handles left-right channel inverting

		// increment phase position
		this.nPhasePosition += this.nResolution ? 2: 1;

		// if this means we've gone past 16 (the end of a phase)
		// then change phase, and if necessary, loop
		if (this.nPhasePosition >= 16) {
			this.nPhase++;
			this.nPhasePosition -= 16;

			// if we should loop, then do so - and we've reached position (4)
			// otherwise, if we shouldn't loop, then we've reached position (3)
			// and so we say that we're ok for new data.
			if (this.nPhase === this.nPhases) {
				// at position (3) or (4)
				this.bOkForNewData = true;

				if (!this.bLooping) {
					// position (3) only
					this.bEnded = true;
					// keep pointer at end of envelope for sustain
					this.nPhase = this.nPhases - 1;
					this.nPhasePosition = 15;
					this.bOkForNewData = true;
				}
				else {
					// position (4) only
					this.bEnded = false;
					// set phase pointer to start of envelope for loop
					this.nPhase = 0;
				}
			}
			else {
				// not at position (3) or (4) ...
				// (i.e., we're in the middle of an envelope with
				//  more than one phase. Specifically, we're in
				//  the middle of envelope 4 or 5 - the
				//  triangle envelopes - but that's not important)

				// any commands sent to this envelope controller
				// will be buffered. Set the flag to indicate this.
				this.bOkForNewData = false;
			}
		}
		else {
			// still within the same phase;
			// but, importantly, we are no longer at the start of the phase ...
			// so new data cannot be acted on immediately, and must
			// be buffered
			this.bOkForNewData = false;
			// Phase and PhasePosition have already been updated.
			// SetLevels() will need to be called to actually calculate
			// the output 'level' of this envelope controller
		}

		// if we have new (buffered) data, now is the time to act on it
		if (this.bNewData && this.bOkForNewData) {
			this.bNewData = false;
			this.bOkForNewData = false;
			// do we need to reset OkForNewData?
			// if we do, then we can't overwrite env data just prior to
			// a new envelope starting - but what's correct? Who knows?
			this.SetNewEnvData(this.nNextData);
		}
		else {
			// ok, we didn't have any new buffered date to act on,
			// so we just call SetLevels() to calculate the output level
			// for whatever the current envelope is
			this.SetLevels();
		}

	}

	/**
	 * set envgenerator's levels according to the nResolution:
	 * Resolution of envelope waveform.
	 *     true : 3-bit resolution;
	 *     false: 4-bit resolution;
	 */
	private SetLevels() {
		var res: number = 0 + (<any>this.nResolution);
		this.nLeftLevel = this.pEnvData.aLevels[res][this.nPhase][this.nPhasePosition];
		if (this.bStereo)
			this.nRightLevel = (15 - res) - this.nLeftLevel;
		else
			this.nRightLevel = this.nLeftLevel;
	}

	/**
	 * loads envgenerator's registers according to the bits set in nData
	 * @param nData BYTE
	 */
	private SetNewEnvData(nData: number = 0) {
		this.nPhase = 0;
		this.nPhasePosition = 0;
		this.pEnvData = this.cs_EnvData[(nData >> 1) & 0x07];
		this.bStereo = !!(nData & 0x01);
		this.bClockExternally = !!(nData & 0x20);
		this.nPhases = this.pEnvData.nPhases;
		this.bLooping = this.pEnvData.bLooping;
		this.nResolution = !!(nData & 0x10);
		this.bEnabled = !!(nData & 0x80);

		if (this.bEnabled)
			this.bEnded = false;
		else {
		// DISABLED - so set stuff accordingly
			this.bEnded = true;
			this.nPhase = 0;
			this.nPhasePosition = 0;
			this.bOkForNewData = true;
		}

		this.SetLevels();
	}

	public LeftLevel() : number  { return this.nLeftLevel; }
	public RightLevel(): number  { return this.nRightLevel; }
	public IsActive()  : boolean { return this.bEnabled; }
}
//---------------------------------------------------------------------------------------
}
