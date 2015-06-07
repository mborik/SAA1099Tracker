/*! SAAEnv: Envelope generator */
//---------------------------------------------------------------------------------------
interface ENVDATA {
	plen: number;
	loop: boolean;
	data: number[][][];
}
//---------------------------------------------------------------------------------------
class SAAEnv {
	public  left: number;
	public  right: number;
	public  enabled: boolean;

	private envdata: ENVDATA;
	private stereo: boolean;
	private phase: number;
	private position: number;
	private ended: boolean;
	private loop: boolean;
	private phaseLen: number;
	private res: boolean;
	private newData: boolean;
	private nextData: number;
	private processData: boolean;
	private extclock: boolean;

	private envtable: ENVDATA[] = [
		{ plen: 1, loop: false, data: [
			[[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]},
		{ plen: 1, loop: true, data: [
			[[15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15],
			 [15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15]],
			[[14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14],
			 [14,14,14,14,14,14,14,14,14,14,14,14,14,14,14,14]]]},
		{ plen: 1, loop: false, data: [
			[[15,14,13,12,11,10,9, 8, 7, 6, 5, 4, 3, 2, 1, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[14,14,12,12,10,10,8, 8, 6, 6, 4, 4, 2, 2, 0, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]},
		{ plen: 1, loop: true, data: [
			[[15,14,13,12,11,10,9, 8, 7, 6, 5, 4, 3, 2, 1, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[14,14,12,12,10,10,8, 8, 6, 6, 4, 4, 2, 2, 0, 0 ],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]},
		{ plen: 2, loop: false, data: [
			[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11,12,13,14,15],
			 [15,14,13,12,11,10,9, 8, 7, 6, 5, 4, 3, 2, 1, 0 ]],
			[[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10,10,12,12,14,14],
			 [14,14,12,12,10,10,8, 8, 6, 6, 4, 4, 2, 2, 0, 0 ]]]},
		{ plen: 2, loop: true, data: [
			[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11,12,13,14,15],
			 [15,14,13,12,11,10,9, 8, 7, 6, 5, 4, 3, 2, 1, 0 ]],
			[[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10,10,12,12,14,14],
			 [14,14,12,12,10,10,8, 8, 6, 6, 4, 4, 2, 2, 0, 0 ]]]},
		{ plen: 1, loop: false, data: [
			[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11,12,13,14,15],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10,10,12,12,14,14],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]},
		{ plen: 1, loop: true, data: [
			[[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,11,12,13,14,15],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]],
			[[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10,10,12,12,14,14],
			 [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]]]}
	];

	constructor() {
		this.enabled = false;
		this.newData = false;
		this.nextData = 0;
		this.processData = false;

		this.loadData();
	}

	/** Do the tick if envelope control is enabled and clock mode set to internal */
	public tickInt() {
		if (this.enabled && !this.extclock)
			this.tick();
	}

	/** Do the tick if envelope control is enabled and clock mode set to external */
	public tickExt() {
		if (this.enabled && this.extclock)
			this.tick();
	}

	/**
	 * send command to envgenerator
	 * @param data BYTE
	 */
	public set(data: number) {
		// process immediate stuff first:
		this.res = !!(data & 0x10);
		this.enabled = !!(data & 0x80);

		if (!this.enabled) {
			// env control was enabled, and now disabled, so reset
			// pointers to start of envelope waveform
			this.phase = 0;
			this.position = 0;
			this.ended = true;
			this.processData = true;
			// store current new data, and set the newdata flag:
			this.newData = true;
			this.nextData = data;

			return this.setLevels();
		}

		// now buffered stuff: but only if it's ok to, and only if the
		// envgenerator is not disabled. otherwise it just stays buffered until
		// the tick() function sets okfornewdata to true and realises there is
		// already some new data waiting
		if (this.processData) {
			// also does the SetLevels() call for us.
			this.loadData(data);
			this.newData = false;
			this.processData = false;
		}
		else {
			// since the 'next resolution' changes arrive unbuffered, we
			// may need to change the current level because of this:
			this.setLevels();

			// store current new data, and set the newdata flag:
			this.newData = true;
			this.nextData = data;
		}
	}

	private tick() {
		// if disabled, do nothing and for sanity, reset stuff...
		if (!this.enabled) {
			this.ended = true;
			this.phase = 0;
			this.position = 0;
			this.processData = true;
			return;
		}
		else if (this.ended) {
			// do nothing
			// (specifically, don't change the values of ended,
			//  phase and position, as these will still be needed
			//  by SetLevels() should it be called again)
			return;
		}

		// Continue playing the same envelope ...
		// increments the phaseposition within an envelope.
		// also handles loop and resolution appropriately.
		// Changes the level of the envelope accordingly
		// through calling SetLevels() . This must be called after making
		// any changes that will affect the output levels of the env controller!!
		// SetLevels also handles left-right channel inverting

		// increment phase position
		this.position += this.res ? 2: 1;

		// if this means we've gone past 16 (the end of a phase)
		// then change phase, and if necessary, loop
		if (this.position >= 16) {
			this.phase++;
			this.position -= 16;

			// if we should loop, then do so - and we've reached position (4)
			// otherwise, if we shouldn't loop, then we've reached position (3)
			// and so we say that we're ok for new data.
			if (this.phase === this.phaseLen) {
				// at position (3) or (4)
				this.processData = true;

				if (!this.loop) {
					// position (3) only
					this.ended = true;
					// keep pointer at end of envelope for sustain
					this.phase = this.phaseLen - 1;
					this.position = 15;
					this.processData = true;
				}
				else {
					// position (4) only
					this.ended = false;
					// set phase pointer to start of envelope for loop
					this.phase = 0;
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
				this.processData = false;
			}
		}
		else {
			// still within the same phase;
			// but, importantly, we are no longer at the start of the phase ...
			// so new data cannot be acted on immediately, and must
			// be buffered
			this.processData = false;
			// 'phase' and 'position' have already been updated.
			// SetLevels() will need to be called to actually calculate
			// the output 'level' of this envelope controller
		}

		// if we have new (buffered) data, now is the time to act on it
		if (this.newData && this.processData) {
			this.newData = false;
			this.processData = false;
			// do we need to reset 'processData'?
			// if we do, then we can't overwrite env data just prior to
			// a new envelope starting - but what's correct? Who knows?
			this.loadData(this.nextData);
		}
		else {
			// ok, we didn't have any new buffered date to act on,
			// so we just call SetLevels() to calculate the output level
			// for whatever the current envelope is
			this.setLevels();
		}

	}

	/**
	 * set envgenerator's levels according to the res:
	 * Resolution of envelope waveform.
	 *     true : 3-bit resolution;
	 *     false: 4-bit resolution;
	 */
	private setLevels() {
		var res: number = 0 + (<any>this.res);
		this.left = this.envdata.data[res][this.phase][this.position];
		if (this.stereo)
			this.right = (15 - res) - this.left;
		else
			this.right = this.left;
	}

	/**
	 * loads envgenerator's registers according to the bits set in 'data'
	 * @param data BYTE
	 */
	private loadData(data: number = 0) {
		this.phase = 0;
		this.position = 0;
		this.envdata = this.envtable[(data >> 1) & 0x07];
		this.stereo = !!(data & 0x01);
		this.extclock = !!(data & 0x20);
		this.phaseLen = this.envdata.plen;
		this.loop = this.envdata.loop;
		this.res = !!(data & 0x10);
		this.enabled = !!(data & 0x80);

		if (this.enabled)
			this.ended = false;
		else {
		// DISABLED - so set stuff accordingly
			this.ended = true;
			this.phase = 0;
			this.position = 0;
			this.processData = true;
		}

		this.setLevels();
	}
}
//---------------------------------------------------------------------------------------
