/*! SAAEnv: Envelope generator */
//---------------------------------------------------------------------------------------
interface ENVDATA {
	plen: number;
	loop: boolean;
	data: number[][][];
}
//---------------------------------------------------------------------------------------
class SAAEnv {
	public left: number;
	public right: number;
	public enabled: boolean;

	private _envdata: ENVDATA;
	private _stereo: boolean;
	private _phase: number;
	private _position: number;
	private _ended: boolean;
	private _loop: boolean;
	private _phaseLen: number;
	private _res: boolean;
	private _newData: boolean;
	private _nextData: number;
	private _processData: boolean;
	private _extclock: boolean;

	private _envtable: ENVDATA[] = [
		{ plen: 1, loop: false, data: [
			[[ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0 ]],
			[[ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0 ]]]},
		{ plen: 1, loop: true, data: [
			[[ 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15  ],
			[  15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15 ]],
			[[ 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14  ],
			[  14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14 ]]]},
		{ plen: 1, loop: false, data: [
			[[ 15, 14, 13, 12, 11, 10, 9,  8,  7,  6,  5,  4,  3,  2,  1,  0   ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ]],
			[[ 14, 14, 12, 12, 10, 10, 8,  8,  6,  6,  4,  4,  2,  2,  0,  0   ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ]]]},
		{ plen: 1, loop: true, data: [
			[[ 15, 14, 13, 12, 11, 10, 9,  8,  7,  6,  5,  4,  3,  2,  1,  0   ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ]],
			[[ 14, 14, 12, 12, 10, 10, 8,  8,  6,  6,  4,  4,  2,  2,  0,  0   ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ]]]},
		{ plen: 2, loop: false, data: [
			[[ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9,  10, 11, 12, 13, 14, 15  ],
			[  15, 14, 13, 12, 11, 10, 9,  8,  7,  6,  5,  4,  3,  2,  1,  0  ]],
			[[ 0,  0,  2,  2,  4,  4,  6,  6,  8,  8,  10, 10, 12, 12, 14, 14  ],
			[  14, 14, 12, 12, 10, 10, 8,  8,  6,  6,  4,  4,  2,  2,  0,  0  ]]]},
		{ plen: 2, loop: true, data: [
			[[ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9,  10, 11, 12, 13, 14, 15  ],
			[  15, 14, 13, 12, 11, 10, 9,  8,  7,  6,  5,  4,  3,  2,  1,  0  ]],
			[[ 0,  0,  2,  2,  4,  4,  6,  6,  8,  8,  10, 10, 12, 12, 14, 14  ],
			[  14, 14, 12, 12, 10, 10, 8,  8,  6,  6,  4,  4,  2,  2,  0,  0  ]]]},
		{ plen: 1, loop: false, data: [
			[[ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9,  10, 11, 12, 13, 14, 15  ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ]],
			[[ 0,  0,  2,  2,  4,  4,  6,  6,  8,  8,  10, 10, 12, 12, 14, 14  ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ]]]},
		{ plen: 1, loop: true, data: [
			[[ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9,  10, 11, 12, 13, 14, 15  ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ]],
			[[ 0,  0,  2,  2,  4,  4,  6,  6,  8,  8,  10, 10, 12, 12, 14, 14  ],
			[  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0  ]]]}
	];

	constructor() {
		this.enabled = false;
		this._newData = false;
		this._nextData = 0;
		this._processData = false;

		this._loadData();
	}

	/** Do the tick if envelope control is enabled and clock mode set to internal */
	public tickInt() {
		if (this.enabled && !this._extclock) {
			this._tick();
		}
	}

	/** Do the tick if envelope control is enabled and clock mode set to external */
	public tickExt() {
		if (this.enabled && this._extclock) {
			this._tick();
		}
	}

	/**
	 * send command to envgenerator
	 * @param data BYTE
	 */
	public set(data: number) {
		// process immediate stuff first:
		this._res = !!(data & 0x10);
		this.enabled = !!(data & 0x80);

		if (!this.enabled) {
			// env control was enabled, and now disabled, so reset
			// pointers to start of envelope waveform
			this._phase = 0;
			this._position = 0;
			this._ended = true;
			this._processData = true;
			// store current new data, and set the newdata flag:
			this._newData = true;
			this._nextData = data;

			return this._setLevels();
		}

		// now buffered stuff: but only if it's ok to, and only if the
		// envgenerator is not disabled. otherwise it just stays buffered until
		// the tick() function sets okfornewdata to true and realises there is
		// already some new data waiting
		if (this._processData) {
			// also does the SetLevels() call for us.
			this._loadData(data);
			this._newData = false;
			this._processData = false;
		}
		else {
			// since the 'next resolution' changes arrive unbuffered, we
			// may need to change the current level because of this:
			this._setLevels();

			// store current new data, and set the newdata flag:
			this._newData = true;
			this._nextData = data;
		}
	}

	private _tick() {
		// if disabled, do nothing and for sanity, reset stuff...
		if (!this.enabled) {
			this._ended = true;
			this._phase = 0;
			this._position = 0;
			this._processData = true;
			return;
		}
		else if (this._ended) {
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
		this._position += this._res ? 2 : 1;

		// if this means we've gone past 16 (the end of a phase)
		// then change phase, and if necessary, loop
		if (this._position >= 16) {
			this._phase++;
			this._position -= 16;

			// if we should loop, then do so - and we've reached position (4)
			// otherwise, if we shouldn't loop, then we've reached position (3)
			// and so we say that we're ok for new data.
			if (this._phase === this._phaseLen) {
				// at position (3) or (4)
				this._processData = true;

				if (!this._loop) {
					// position (3) only
					this._ended = true;
					// keep pointer at end of envelope for sustain
					this._phase = this._phaseLen - 1;
					this._position = 15;
					this._processData = true;
				}
				else {
					// position (4) only
					this._ended = false;
					// set phase pointer to start of envelope for loop
					this._phase = 0;
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
				this._processData = false;
			}
		}
		else {
			// still within the same phase;
			// but, importantly, we are no longer at the start of the phase ...
			// so new data cannot be acted on immediately, and must
			// be buffered
			this._processData = false;
			// 'phase' and 'position' have already been updated.
			// SetLevels() will need to be called to actually calculate
			// the output 'level' of this envelope controller
		}

		// if we have new (buffered) data, now is the time to act on it
		if (this._newData && this._processData) {
			this._newData = false;
			this._processData = false;
			// do we need to reset 'processData'?
			// if we do, then we can't overwrite env data just prior to
			// a new envelope starting - but what's correct? Who knows?
			this._loadData(this._nextData);
		}
		else {
			// ok, we didn't have any new buffered date to act on,
			// so we just call SetLevels() to calculate the output level
			// for whatever the current envelope is
			this._setLevels();
		}

	}

	/**
	 * set envgenerator's levels according to the res:
	 * Resolution of envelope waveform.
	 *     true : 3-bit resolution;
	 *     false: 4-bit resolution;
	 */
	private _setLevels() {
		let res: number = +this._res;
		this.left = this._envdata.data[res][this._phase][this._position];
		if (this._stereo) {
			this.right = (15 - res) - this.left;
		}
		else {
			this.right = this.left;
		}
	}

	/**
	 * loads envgenerator's registers according to the bits set in 'data'
	 * @param data BYTE
	 */
	private _loadData(data: number = 0) {
		this._phase = 0;
		this._position = 0;
		this._envdata = this._envtable[(data >> 1) & 0x07];
		this._stereo = !!(data & 0x01);
		this._extclock = !!(data & 0x20);
		this._phaseLen = this._envdata.plen;
		this._loop = this._envdata.loop;
		this._res = !!(data & 0x10);
		this.enabled = !!(data & 0x80);

		if (this.enabled) {
			this._ended = false;
		}
		else {
		// DISABLED - so set stuff accordingly
			this._ended = true;
			this._phase = 0;
			this._position = 0;
			this._processData = true;
		}

		this._setLevels();
	}
}
//---------------------------------------------------------------------------------------
