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
declare class SAASoundRegisters {
    R00: number;
    R01: number;
    R02: number;
    R03: number;
    R04: number;
    R05: number;
    R08: number;
    R09: number;
    R0A: number;
    R0B: number;
    R0C: number;
    R0D: number;
    R10: number;
    R11: number;
    R12: number;
    R14: number;
    R15: number;
    R16: number;
    R18: number;
    R19: number;
    R1C: number;
    [key: string]: number;
}
declare class SAASoundRegData {
    regs: SAASoundRegisters;
    muted: boolean[];
}
declare class SAASound {
    static sampleRate: number;
    private _register;
    private _enabled;
    private _ampMuted;
    private _sync;
    private _env;
    private _noise;
    private _freq;
    private _amp;
    constructor(sampleRate: number);
    reset(): void;
    /**
     * route data to the appropriate place by current register
     * @param data BYTE
     */
    setData(data: number): void;
    /**
     * get current register
     * @returns {number} BYTE in range 0-31
     */
    getReg(): number;
    /**
     * set current register
     * @param reg BYTE in range 0-31
     */
    setReg(reg: number): void;
    /**
     * combo!
     * @param reg
     * @param data
     */
    setRegData(reg: number, data: number): void;
    /**
     * channel mutation
     * @param chn channel number 0-5
     * @param mute boolean
     */
    mute(chn: number, mute: boolean): void;
    /**
     * TODO: get state of all registers and (un)muted channels
     * @returns {SAASoundRegData}
     */
    getAllRegs(): SAASoundRegData;
    /**
     * fill all registers and (un)mute all channels
     * @param data SAASoundRegData
     */
    setAllRegs(data: SAASoundRegData): void;
    output(leftBuf: Float32Array, rightBuf: Float32Array, length: number, offset?: number): void;
}
/*! SAANoise: Noise generator */
declare class SAANoise {
    level: number;
    private _counter;
    private _add;
    private _sync;
    private _rand;
    private _smpRate;
    private _src;
    constructor(seed?: number);
    /**
     * send command to noise generator
     * @param src values 0 to 3
     */
    set(src: number): void;
    /**
     * trigger() only does anything useful when we're
     * clocking from the frequency generator (i.e. SourceMode = 3).
     * So if we're clocking from the noise generator clock
     * (ie, SourceMode = 0, 1 or 2) then do nothing...
     */
    trigger(): void;
    tick(): number;
    setSync(sync: boolean): void;
    private _rnd();
}
/*! SAAEnv: Envelope generator */
interface ENVDATA {
    plen: number;
    loop: boolean;
    data: number[][][];
}
declare class SAAEnv {
    left: number;
    right: number;
    enabled: boolean;
    private _envdata;
    private _stereo;
    private _phase;
    private _position;
    private _ended;
    private _loop;
    private _phaseLen;
    private _res;
    private _newData;
    private _nextData;
    private _processData;
    private _extclock;
    private _envtable;
    constructor();
    /** Do the tick if envelope control is enabled and clock mode set to internal */
    tickInt(): void;
    /** Do the tick if envelope control is enabled and clock mode set to external */
    tickExt(): void;
    /**
     * send command to envgenerator
     * @param data BYTE
     */
    set(data: number): void;
    private _tick();
    /**
     * set envgenerator's levels according to the res:
     * Resolution of envelope waveform.
     *     true : 3-bit resolution;
     *     false: 4-bit resolution;
     */
    private _setLevels();
    /**
     * loads envgenerator's registers according to the bits set in 'data'
     * @param data BYTE
     */
    private _loadData(data?);
}
/*! SAAFreq: Frequency oscillator, 7-bit fractional accuracy */
declare class SAAFreq {
    level: number;
    private _counter;
    private _add;
    private _curOffset;
    private _curOctave;
    private _nextOffset;
    private _nextOctave;
    private _ignoreOffset;
    private _newdata;
    private _sync;
    private _smpRate;
    private _mode;
    private _noiseGen;
    private _envGen;
    private static freqs;
    constructor(pcNoise?: SAANoise, pcEnv?: SAAEnv);
    /**
     * @param offset between 0 and 255
     */
    setOffset(offset: number): void;
    /**
     * @param octave between 0 and 7
     */
    setOctave(octave: number): void;
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
    update(): void;
    tick(): number;
    setSync(sync: boolean): void;
}
/*! SAAAmp: Tone/Noise mixing, Envelope application and amplification */
declare class SAAAmp {
    mute: boolean;
    private _lastlvl;
    private _leftx16;
    private _leftx32;
    private _lefta0E;
    private _lefta0Ex2;
    private _rightx16;
    private _rightx32;
    private _righta0E;
    private _righta0Ex2;
    private _out;
    private _mix;
    private _env;
    private _toneGen;
    private _noiseGen;
    private _envGen;
    private static levels;
    constructor(ToneGenerator: SAAFreq, NoiseGenerator: SAANoise, EnvGenerator?: SAAEnv);
    /**
     * Set amplitude, but if level unchanged since last call then do nothing.
     * @param level BYTE
     */
    setLevel(level: number): void;
    setFreqMixer(enable: number): void;
    setNoiseMixer(enable: number): void;
    tick(): void;
    output(last: Float32Array): void;
}
