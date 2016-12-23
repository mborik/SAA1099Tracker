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
    setData(data: number): void;
    getReg(): number;
    setReg(reg: number): void;
    setRegData(reg: number, data: number): void;
    mute(chn: number, mute: boolean): void;
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
    set(src: number): void;
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
    tickInt(): void;
    tickExt(): void;
    set(data: number): void;
    private _tick();
    private _setLevels();
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
    setOffset(offset: number): void;
    setOctave(octave: number): void;
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
    setLevel(level: number): void;
    setFreqMixer(enable: number): void;
    setNoiseMixer(enable: number): void;
    tick(): void;
    output(last: Float32Array): void;
}
