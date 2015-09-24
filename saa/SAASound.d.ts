declare class SAASound {
    static sampleRate: number;
    private register;
    private enabled;
    private ampMuted;
    private sync;
    private env;
    private noise;
    private freq;
    private amp;
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
    output(leftBuf: Float32Array, rightBuf: Float32Array, length: number, offset?: number): void;
}
declare class SAANoise {
    level: number;
    private counter;
    private add;
    private sync;
    private rand;
    private smpRate;
    private src;
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
    private rnd();
}
interface ENVDATA {
    plen: number;
    loop: boolean;
    data: number[][][];
}
declare class SAAEnv {
    left: number;
    right: number;
    enabled: boolean;
    private envdata;
    private stereo;
    private phase;
    private position;
    private ended;
    private loop;
    private phaseLen;
    private res;
    private newData;
    private nextData;
    private processData;
    private extclock;
    private envtable;
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
    private tick();
    /**
     * set envgenerator's levels according to the res:
     * Resolution of envelope waveform.
     *     true : 3-bit resolution;
     *     false: 4-bit resolution;
     */
    private setLevels();
    /**
     * loads envgenerator's registers according to the bits set in 'data'
     * @param data BYTE
     */
    private loadData(data?);
}
declare class SAAFreq {
    level: number;
    private counter;
    private add;
    private curOffset;
    private curOctave;
    private nextOffset;
    private nextOctave;
    private ignoreOffset;
    private newdata;
    private sync;
    private smpRate;
    private mode;
    private noiseGen;
    private envGen;
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
declare class SAAAmp {
    mute: boolean;
    private lastlvl;
    private leftx16;
    private leftx32;
    private lefta0E;
    private lefta0Ex2;
    private rightx16;
    private rightx32;
    private righta0E;
    private righta0Ex2;
    private out;
    private mix;
    private env;
    private toneGen;
    private noiseGen;
    private envGen;
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
