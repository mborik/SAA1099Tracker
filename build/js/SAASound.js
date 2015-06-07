/*!
 * SAASound is a Phillips SAA 1099 sound chip emulator
 * Copyright (c) 2015 Martin Borik <mborik@users.sourceforge.net>
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
var SAASound = (function () {
    function SAASound(sampleRate) {
        this.register = 0;
        this.enabled = false;
        this.ampMuted = [false, false, false, false, false, false];
        SAASound.sampleRate = sampleRate;
        this.env = [new SAAEnv, new SAAEnv];
        this.noise = [
            new SAANoise(0x14af5209),
            new SAANoise(0x76a9b11e)
        ];
        this.freq = [
            new SAAFreq(this.noise[0]),
            new SAAFreq(null, this.env[0]),
            new SAAFreq(),
            new SAAFreq(this.noise[1]),
            new SAAFreq(null, this.env[1]),
            new SAAFreq()
        ];
        this.amp = [
            new SAAAmp(this.freq[0], this.noise[0]),
            new SAAAmp(this.freq[1], this.noise[0]),
            new SAAAmp(this.freq[2], this.noise[0], this.env[0]),
            new SAAAmp(this.freq[3], this.noise[1]),
            new SAAAmp(this.freq[4], this.noise[1]),
            new SAAAmp(this.freq[5], this.noise[1], this.env[1])
        ];
        this.clear();
    }
    SAASound.prototype.clear = function () {
        // sets reg 28 to 0x02 - sync and disabled
        this.setRegData(28, 2);
        // sets regs 00-31 (except 28) to 0
        for (var i = 31; i >= 0; i--) {
            if (i != 28)
                this.setRegData(i, 0);
        }
        // sets reg 28 to 0
        this.setRegData(28, 0);
        // sets current reg to 0
        this.setReg(0);
    };
    /**
     * route data to the appropriate place by current register
     * @param data BYTE
     */
    SAASound.prototype.setData = function (data) {
        data &= 0xff;
        var reg = this.register;
        switch (reg) {
            // Amplitude data (==> amp)
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                this.amp[reg].setLevel(data);
                break;
            // Freq data (==> freq)
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
                this.freq[(reg & 0x07)].setOffset(data);
                break;
            // Freq octave data (==> freq) for channels 0,1
            case 16:
                this.freq[0].setOctave(data & 0x07);
                this.freq[1].setOctave((data >> 4) & 0x07);
                break;
            // Freq octave data (==> freq) for channels 2,3
            case 17:
                this.freq[2].setOctave(data & 0x07);
                this.freq[3].setOctave((data >> 4) & 0x07);
                break;
            // Freq octave data (==> freq) for channels 4,5
            case 18:
                this.freq[4].setOctave(data & 0x07);
                this.freq[5].setOctave((data >> 4) & 0x07);
                break;
            // Tone mixer control (==> amp)
            case 20:
                this.amp[0].setFreqMixer(data & 0x01);
                this.amp[1].setFreqMixer(data & 0x02);
                this.amp[2].setFreqMixer(data & 0x04);
                this.amp[3].setFreqMixer(data & 0x08);
                this.amp[4].setFreqMixer(data & 0x10);
                this.amp[5].setFreqMixer(data & 0x20);
                break;
            // noise mixer control (==> amp)
            case 21:
                this.amp[0].setNoiseMixer(data & 0x01);
                this.amp[1].setNoiseMixer(data & 0x02);
                this.amp[2].setNoiseMixer(data & 0x04);
                this.amp[3].setNoiseMixer(data & 0x08);
                this.amp[4].setNoiseMixer(data & 0x10);
                this.amp[5].setNoiseMixer(data & 0x20);
                break;
            // noise frequency/source control (==> noise)
            case 22:
                this.noise[0].set(data & 0x03);
                this.noise[1].set((data >> 4) & 0x03);
                break;
            // Envelope control data (==> env) for envelope controller #0
            case 24:
                this.env[0].set(data);
                break;
            // Envelope control data (==> env) for envelope controller #1
            case 25:
                this.env[1].set(data);
                break;
            // sync/unsync all devices and reset them all to a known state
            case 28:
                var i;
                var mute = !(data & 0x01);
                var sync = !!(data & 0x02);
                for (i = 0; i < 6; i++)
                    this.freq[i].setSync(sync);
                this.noise[0].setSync(sync);
                this.noise[1].setSync(sync);
                this.sync = sync;
                // mute all amps
                if (mute) {
                    for (i = 0; i < 6; i++)
                        this.amp[i].mute = mute;
                    this.enabled = false;
                }
                else {
                    for (i = 0; i < 6; i++)
                        this.amp[i].mute = this.ampMuted[i];
                    this.enabled = true;
                }
                break;
            default:
                break;
        }
    };
    /**
     * get current register
     * @returns {number} BYTE in range 0-31
     */
    SAASound.prototype.getReg = function () { return this.register; };
    /**
     * set current register
     * @param reg BYTE in range 0-31
     */
    SAASound.prototype.setReg = function (reg) {
        this.register = (reg &= 0x1f);
        if (reg === 24)
            this.env[0].tickExt();
        else if (reg === 25)
            this.env[1].tickExt();
    };
    /**
     * combo!
     * @param reg
     * @param data
     */
    SAASound.prototype.setRegData = function (reg, data) {
        this.setReg(reg);
        this.setData(data);
    };
    /**
     * channel mutation
     * @param chn channel number 0-5
     * @param mute boolean
     */
    SAASound.prototype.mute = function (chn, mute) {
        if (chn < 0 || chn >= 6)
            return;
        this.amp[chn].mute = (this.ampMuted[chn] = mute);
    };
    //---------------------------------------------------------------------------------------
    SAASound.prototype.output = function (leftBuf, rightBuf, length) {
        for (var ptr = 0, val; ptr < length; ptr++) {
            this.noise[0].tick();
            this.noise[1].tick();
            val = new Float32Array([0, 0]);
            this.amp[0].output(val);
            this.amp[1].output(val);
            this.amp[2].output(val);
            this.amp[3].output(val);
            this.amp[4].output(val);
            this.amp[5].output(val);
            leftBuf[ptr] = val[0];
            rightBuf[ptr] = val[1];
        }
    };
    return SAASound;
})();
//---------------------------------------------------------------------------------------
/*! SAANoise: Noise generator */
//---------------------------------------------------------------------------------------
var SAANoise = (function () {
    function SAANoise(seed) {
        if (seed === void 0) { seed = 0x11111111; }
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
    SAANoise.prototype.set = function (src) {
        this.src = (src &= 3);
        this.add = 128e6 >> src;
    };
    /**
     * trigger() only does anything useful when we're
     * clocking from the frequency generator (i.e. SourceMode = 3).
     * So if we're clocking from the noise generator clock
     * (ie, SourceMode = 0, 1 or 2) then do nothing...
     */
    SAANoise.prototype.trigger = function () {
        if (this.src === 3)
            this.rnd();
    };
    /*
     * tick only does anything useful when we're
     * clocking from the noise generator clock (ie, SourceMode = 0, 1 or 2)
     * So, if SourceMode = 3 (ie, we're clocking from a frequency generator)
     * then do nothing...
     */
    SAANoise.prototype.tick = function () {
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
    };
    SAANoise.prototype.setSync = function (sync) {
        if (sync)
            this.counter = 0;
        this.sync = sync;
    };
    SAANoise.prototype.rnd = function () {
        if (!!(this.rand & 0x40000004) && (this.rand & 0x40000004) != 0x40000004)
            this.rand = (this.rand << 1) | 1;
        else
            this.rand <<= 1;
        this.level = (this.rand & 1) << 1;
    };
    return SAANoise;
})();
//---------------------------------------------------------------------------------------
/*! SAAEnv: Envelope generator */
//---------------------------------------------------------------------------------------
var SAAEnv = (function () {
    function SAAEnv() {
        this.envtable = [
            { plen: 1, loop: false, data: [
                    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] },
            { plen: 1, loop: true, data: [
                    [[15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
                        [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]],
                    [[14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
                        [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]]] },
            { plen: 1, loop: false, data: [
                    [[15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] },
            { plen: 1, loop: true, data: [
                    [[15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] },
            { plen: 2, loop: false, data: [
                    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                        [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]],
                    [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                        [14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0]]] },
            { plen: 2, loop: true, data: [
                    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                        [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]],
                    [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                        [14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0]]] },
            { plen: 1, loop: false, data: [
                    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] },
            { plen: 1, loop: true, data: [
                    [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                    [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] }
        ];
        this.enabled = false;
        this.newData = false;
        this.nextData = 0;
        this.processData = false;
        this.loadData();
    }
    /** Do the tick if envelope control is enabled and clock mode set to internal */
    SAAEnv.prototype.tickInt = function () {
        if (this.enabled && !this.extclock)
            this.tick();
    };
    /** Do the tick if envelope control is enabled and clock mode set to external */
    SAAEnv.prototype.tickExt = function () {
        if (this.enabled && this.extclock)
            this.tick();
    };
    /**
     * send command to envgenerator
     * @param data BYTE
     */
    SAAEnv.prototype.set = function (data) {
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
    };
    SAAEnv.prototype.tick = function () {
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
        this.position += this.res ? 2 : 1;
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
    };
    /**
     * set envgenerator's levels according to the res:
     * Resolution of envelope waveform.
     *     true : 3-bit resolution;
     *     false: 4-bit resolution;
     */
    SAAEnv.prototype.setLevels = function () {
        var res = 0 + this.res;
        this.left = this.envdata.data[res][this.phase][this.position];
        if (this.stereo)
            this.right = (15 - res) - this.left;
        else
            this.right = this.left;
    };
    /**
     * loads envgenerator's registers according to the bits set in 'data'
     * @param data BYTE
     */
    SAAEnv.prototype.loadData = function (data) {
        if (data === void 0) { data = 0; }
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
    };
    return SAAEnv;
})();
//---------------------------------------------------------------------------------------
/*! SAAFreq: Frequency oscillator, 7-bit fractional accuracy */
//---------------------------------------------------------------------------------------
var SAAFreq = (function () {
    function SAAFreq(pcNoise, pcEnv) {
        this.counter = 0;
        this.add = 0;
        this.curOffset = 0;
        this.curOctave = 0;
        this.nextOffset = 0;
        this.nextOctave = 0;
        this.ignoreOffset = false;
        this.newdata = false;
        this.sync = false;
        this.level = 2;
        this.smpRate = SAASound.sampleRate << 12;
        this.noiseGen = pcNoise;
        this.envGen = pcEnv;
        this.mode = (!pcNoise ? (!pcEnv ? 0 : 1) : 2);
        // pregenerate frequency lookup table...
        this.freqs = [];
        for (var o = 0, i; o < 8; o++) {
            this.freqs[o] = [];
            for (i = 0; i < 256; i++)
                this.freqs[o][i] = Math.round(((128e6 << o) >>> 0) / (511 - i));
        }
        this.add = this.freqs[this.curOctave][this.curOffset];
    }
    /**
     * @param offset between 0 and 255
     */
    SAAFreq.prototype.setOffset = function (offset) {
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
            this.add = this.freqs[this.curOctave][this.curOffset];
        }
    };
    /**
     * @param octave between 0 and 7
     */
    SAAFreq.prototype.setOctave = function (octave) {
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
            this.add = this.freqs[this.curOctave][this.curOffset];
        }
    };
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
    SAAFreq.prototype.update = function () {
        if (!this.newdata)
            return;
        this.curOctave = this.nextOctave;
        if (!this.ignoreOffset) {
            this.curOffset = this.nextOffset;
            this.newdata = false;
        }
        this.ignoreOffset = false;
        this.add = this.freqs[this.curOctave][this.curOffset];
    };
    SAAFreq.prototype.tick = function () {
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
    };
    SAAFreq.prototype.setSync = function (sync) {
        this.sync = sync;
        if (sync) {
            this.counter = 0;
            this.level = 2;
            this.curOctave = this.nextOctave;
            this.curOffset = this.nextOffset;
            this.add = this.freqs[this.curOctave][this.curOffset];
        }
    };
    return SAAFreq;
})();
//---------------------------------------------------------------------------------------
/*! SAAAmp: Tone/Noise mixing, Envelope application and amplification */
//---------------------------------------------------------------------------------------
var SAAAmp = (function () {
    function SAAAmp(ToneGenerator, NoiseGenerator, EnvGenerator) {
        this.lastlvl = 0;
        this.leftx16 = 0;
        this.leftx32 = 0;
        this.lefta0E = 0;
        this.lefta0Ex2 = 0;
        this.rightx16 = 0;
        this.rightx32 = 0;
        this.righta0E = 0;
        this.righta0Ex2 = 0;
        this.out = 0;
        this.mix = 0;
        this.toneGen = ToneGenerator;
        this.noiseGen = NoiseGenerator;
        this.envGen = EnvGenerator;
        this.env = !!EnvGenerator;
        this.mute = true;
        // generate precalculated volume levels to Float32 for fast mix calculations...
        this.levels = new Float32Array(512);
        for (var i = 0; i < 512; i++)
            this.levels[i] = i / 2880; // 15 max.volume * 32 multiplier * 6 channel
    }
    /**
     * Set amplitude, but if level unchanged since last call then do nothing.
     * @param level BYTE
     */
    SAAAmp.prototype.setLevel = function (level) {
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
    };
    SAAAmp.prototype.setFreqMixer = function (enable) { this.mix = enable ? (this.mix | 1) : (this.mix & 2); };
    SAAAmp.prototype.setNoiseMixer = function (enable) { this.mix = enable ? (this.mix | 2) : (this.mix & 1); };
    SAAAmp.prototype.tick = function () {
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
    };
    SAAAmp.prototype.output = function (last) {
        this.tick();
        if (this.mute)
            return;
        // now calculate the returned amplitude for this sample:
        var e = (this.env && this.envGen.enabled);
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
    };
    return SAAAmp;
})();
//---------------------------------------------------------------------------------------
//# sourceMappingURL=SAASound.js.map