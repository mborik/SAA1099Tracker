"use strict";
/*!
 * SAASound is a Phillips SAA 1099 sound chip emulator
 * Copyright (c) 2015-2017 Martin Borik <mborik@users.sourceforge.net>
 * Based on SAASound - portable C/C++ library
 * Copyright (c) 1998-2004 Dave Hooper <stripwax@users.sourceforge.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 * OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
//---------------------------------------------------------------------------------------
class SAASoundRegisters {
    constructor() {
        this.R00 = 0;
        this.R01 = 0;
        this.R02 = 0;
        this.R03 = 0;
        this.R04 = 0;
        this.R05 = 0;
        this.R08 = 0;
        this.R09 = 0;
        this.R0A = 0;
        this.R0B = 0;
        this.R0C = 0;
        this.R0D = 0;
        this.R10 = 0;
        this.R11 = 0;
        this.R12 = 0;
        this.R14 = 0;
        this.R15 = 0;
        this.R16 = 0;
        this.R18 = 0;
        this.R19 = 0;
        this.R1C = 0;
    }
}
;
class SAASoundRegData {
    constructor() {
        this.regs = new SAASoundRegisters;
        this.muted = [false, false, false, false, false, false];
    }
}
;
//---------------------------------------------------------------------------------------
class SAASound {
    constructor(sampleRate) {
        this._register = 0;
        this._enabled = false;
        this._ampMuted = [false, false, false, false, false, false];
        console.log('SAASound', 'Initializing emulation based on samplerate %dHz...', sampleRate);
        SAASound.sampleRate = sampleRate;
        this._env = [new SAAEnv, new SAAEnv];
        this._noise = [
            new SAANoise(0x14af5209),
            new SAANoise(0x76a9b11e)
        ];
        this._freq = [
            new SAAFreq(this._noise[0]),
            new SAAFreq(null, this._env[0]),
            new SAAFreq(),
            new SAAFreq(this._noise[1]),
            new SAAFreq(null, this._env[1]),
            new SAAFreq()
        ];
        this._amp = [
            new SAAAmp(this._freq[0], this._noise[0]),
            new SAAAmp(this._freq[1], this._noise[0]),
            new SAAAmp(this._freq[2], this._noise[0], this._env[0]),
            new SAAAmp(this._freq[3], this._noise[1]),
            new SAAAmp(this._freq[4], this._noise[1]),
            new SAAAmp(this._freq[5], this._noise[1], this._env[1])
        ];
        this.reset();
        console.log('SAASound', 'Chip emulation initialized...');
    }
    reset() {
        // sets reg 28 to 0x02 - sync and disabled
        this.setRegData(28, 2);
        // sets regs 00-31 (except 28) to 0
        for (let i = 31; i >= 0; i--) {
            if (i != 28) {
                this.setRegData(i, 0);
            }
        }
        // sets reg 28 to 0
        this.setRegData(28, 0);
        // sets current reg to 0
        this.setReg(0);
    }
    /**
     * route data to the appropriate place by current register
     * @param data BYTE
     */
    setData(data) {
        data &= 0xff;
        let reg = this._register;
        switch (reg) {
            // Amplitude data (==> amp)
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                this._amp[reg].setLevel(data);
                break;
            // Freq data (==> freq)
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
                this._freq[(reg & 0x07)].setOffset(data);
                break;
            // Freq octave data (==> freq) for channels 0,1
            case 16:
                this._freq[0].setOctave(data & 0x07);
                this._freq[1].setOctave((data >> 4) & 0x07);
                break;
            // Freq octave data (==> freq) for channels 2,3
            case 17:
                this._freq[2].setOctave(data & 0x07);
                this._freq[3].setOctave((data >> 4) & 0x07);
                break;
            // Freq octave data (==> freq) for channels 4,5
            case 18:
                this._freq[4].setOctave(data & 0x07);
                this._freq[5].setOctave((data >> 4) & 0x07);
                break;
            // Tone mixer control (==> amp)
            case 20:
                this._amp.forEach((a, i) => {
                    a.setFreqMixer(data & (0x01 << i));
                });
                break;
            // noise mixer control (==> amp)
            case 21:
                this._amp.forEach((a, i) => {
                    a.setNoiseMixer(data & (0x01 << i));
                });
                break;
            // noise frequency/source control (==> noise)
            case 22:
                this._noise[0].set(data & 0x03);
                this._noise[1].set((data >> 4) & 0x03);
                break;
            // Envelope control data (==> env) for envelope controller #0
            case 24:
                this._env[0].set(data);
                break;
            // Envelope control data (==> env) for envelope controller #1
            case 25:
                this._env[1].set(data);
                break;
            // sync/unsync all devices and reset them all to a known state
            case 28: {
                let mute = !(data & 0x01);
                let sync = !!(data & 0x02);
                this._freq.forEach(f => f.setSync(sync));
                this._noise.forEach(n => n.setSync(sync));
                this._amp.forEach((amp, i) => {
                    amp.mute = (mute || this._ampMuted[i]);
                }, this);
                this._enabled = !mute;
                this._sync = sync;
                break;
            }
            default:
                break;
        }
    }
    /**
     * get current register
     * @returns {number} BYTE in range 0-31
     */
    getReg() { return this._register; }
    /**
     * set current register
     * @param reg BYTE in range 0-31
     */
    setReg(reg) {
        this._register = (reg &= 0x1f);
        if (reg === 24) {
            this._env[0].tickExt();
        }
        else if (reg === 25) {
            this._env[1].tickExt();
        }
    }
    /**
     * combo!
     * @param reg
     * @param data
     */
    setRegData(reg, data) {
        this.setReg(reg);
        this.setData(data);
    }
    /**
     * channel mutation
     * @param chn channel number 0-5
     * @param mute boolean
     */
    mute(chn, mute) {
        if (chn < 0 || chn >= 6) {
            return;
        }
        this._amp[chn].mute = (this._ampMuted[chn] = mute);
    }
    /**
     * fill all registers and (un)mute all channels
     * @param data SAASoundRegData
     */
    setAllRegs(data) {
        if (data.regs) {
            Object.keys(data.regs).forEach(key => {
                let reg = parseInt(key.substr(1), 16);
                let dat = data.regs[key];
                this.setRegData(reg, dat);
            }, this);
        }
        if (data.muted) {
            data.muted.forEach((m, i) => this.mute(i, m), this);
        }
    }
    //---------------------------------------------------------------------------------------
    output(leftBuf, rightBuf, length, offset = 0) {
        let ptr = offset;
        let len = length + ptr;
        let val = new Float32Array([0, 0]);
        for (; ptr < len; ptr++) {
            this._noise[0].tick();
            this._noise[1].tick();
            val[0] = val[1] = 0;
            this._amp.forEach(a => a.output(val));
            leftBuf[ptr] = val[0];
            rightBuf[ptr] = val[1];
        }
        val = null;
    }
}
//---------------------------------------------------------------------------------------
"use strict";
/*! SAANoise: Noise generator */
//---------------------------------------------------------------------------------------
class SAANoise {
    constructor(seed = 0x11111111) {
        this._counter = 0;
        this._add = 128e6; // 31250 << 12
        this._sync = false;
        this._smpRate = SAASound.sampleRate << 12;
        this._src = 0;
        this._rand = seed;
    }
    /**
     * send command to noise generator
     * @param src values 0 to 3
     */
    set(src) {
        this._src = (src &= 3);
        this._add = 128e6 >> src;
    }
    /**
     * trigger() only does anything useful when we're
     * clocking from the frequency generator (i.e. SourceMode = 3).
     * So if we're clocking from the noise generator clock
     * (ie, SourceMode = 0, 1 or 2) then do nothing...
     */
    trigger() {
        if (this._src === 3) {
            this._rnd();
        }
    }
    /*
     * tick only does anything useful when we're
     * clocking from the noise generator clock (ie, SourceMode = 0, 1 or 2)
     * So, if SourceMode = 3 (ie, we're clocking from a frequency generator)
     * then do nothing...
     */
    tick() {
        if (!this._sync && (this._src != 3)) {
            this._counter += this._add;
            if (this._counter >= this._smpRate) {
                while (this._counter >= this._smpRate) {
                    this._counter -= this._smpRate;
                    this._rnd();
                }
            }
        }
        return (this._rand & 1);
    }
    setSync(sync) {
        if (sync) {
            this._counter = 0;
        }
        this._sync = sync;
    }
    _rnd() {
        if (!!(this._rand & 0x40000004) && (this._rand & 0x40000004) != 0x40000004) {
            this._rand = (this._rand << 1) | 1;
        }
        else {
            this._rand <<= 1;
        }
        this.level = (this._rand & 1) << 1;
    }
}
//---------------------------------------------------------------------------------------
"use strict";
//---------------------------------------------------------------------------------------
class SAAEnv {
    constructor() {
        this._envtable = [
            { plen: 1, loop: false, data: [
                    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]
                ] },
            { plen: 1, loop: true, data: [
                    [[15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
                        [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]],
                    [[14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
                        [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]]
                ] },
            { plen: 1, loop: false, data: [
                    [[15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]
                ] },
            { plen: 1, loop: true, data: [
                    [[15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]
                ] },
            { plen: 2, loop: false, data: [
                    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                        [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]],
                    [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                        [14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0]]
                ] },
            { plen: 2, loop: true, data: [
                    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                        [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]],
                    [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                        [14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0]]
                ] },
            { plen: 1, loop: false, data: [
                    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]
                ] },
            { plen: 1, loop: true, data: [
                    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]
                ] }
        ];
        this.enabled = false;
        this._newData = false;
        this._nextData = 0;
        this._processData = false;
        this._loadData();
    }
    /** Do the tick if envelope control is enabled and clock mode set to internal */
    tickInt() {
        if (this.enabled && !this._extclock) {
            this._tick();
        }
    }
    /** Do the tick if envelope control is enabled and clock mode set to external */
    tickExt() {
        if (this.enabled && this._extclock) {
            this._tick();
        }
    }
    /**
     * send command to envgenerator
     * @param data BYTE
     */
    set(data) {
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
    _tick() {
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
    _setLevels() {
        var res = 0 + this._res;
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
    _loadData(data = 0) {
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
"use strict";
/*! SAAFreq: Frequency oscillator, 7-bit fractional accuracy */
//---------------------------------------------------------------------------------------
class SAAFreq {
    constructor(pcNoise, pcEnv) {
        this._counter = 0;
        this._add = 0;
        this._curOffset = 0;
        this._curOctave = 0;
        this._nextOffset = 0;
        this._nextOctave = 0;
        this._ignoreOffset = false;
        this._newdata = false;
        this._sync = false;
        this.level = 2;
        this._smpRate = SAASound.sampleRate << 12;
        this._noiseGen = pcNoise;
        this._envGen = pcEnv;
        this._mode = (!pcNoise ? (!pcEnv ? 0 : 1) : 2);
        // pregenerate frequency lookup table...
        if (!SAAFreq.freqs) {
            console.log('SAASound', 'Pregenerating lookup table with all frequencies...');
            let freqs = [];
            for (let o = 0, i; o < 8; o++) {
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
    setOffset(offset) {
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
            if (this._nextOctave == this._curOctave) {
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
    setOctave(octave) {
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
    update() {
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
    tick() {
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
    setSync(sync) {
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
"use strict";
/*! SAAAmp: Tone/Noise mixing, Envelope application and amplification */
//---------------------------------------------------------------------------------------
class SAAAmp {
    constructor(ToneGenerator, NoiseGenerator, EnvGenerator) {
        this._lastlvl = 0;
        this._leftx16 = 0;
        this._leftx32 = 0;
        this._lefta0E = 0;
        this._lefta0Ex2 = 0;
        this._rightx16 = 0;
        this._rightx32 = 0;
        this._righta0E = 0;
        this._righta0Ex2 = 0;
        this._out = 0;
        this._mix = 0;
        this._toneGen = ToneGenerator;
        this._noiseGen = NoiseGenerator;
        this._envGen = EnvGenerator;
        this._env = !!EnvGenerator;
        this.mute = true;
        // generate precalculated volume levels to Float32 for fast mix calculations...
        if (!SAAAmp.levels) {
            console.log('SAASound', 'Pregenerating lookup table with float 32bit volume levels...');
            let levels = new Float32Array(512);
            for (let i = 0; i < 512; i++) {
                levels[i] = i / 2880; // 15 max.volume * 32 multiplier * 6 channel
            }
            SAAAmp.levels = levels;
        }
    }
    /**
     * Set amplitude, but if level unchanged since last call then do nothing.
     * @param level BYTE
     */
    setLevel(level) {
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
    setFreqMixer(enable) { this._mix = enable ? (this._mix | 1) : (this._mix & 2); }
    setNoiseMixer(enable) { this._mix = enable ? (this._mix | 2) : (this._mix & 1); }
    tick() {
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
    output(last) {
        this.tick();
        if (this.mute) {
            return;
        }
        // now calculate the returned amplitude for this sample:
        let e = (this._env && this._envGen.enabled);
        let levels = SAAAmp.levels;
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
//# sourceMappingURL=SAASound.js.map