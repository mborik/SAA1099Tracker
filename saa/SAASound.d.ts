declare class SAASound {
    static nSampleRate: number;
    private nCurrentReg;
    private bOutputEnabled;
    private bAmpMuted;
    private bSync;
    private Env;
    private Noise;
    private Osc;
    private Amp;
    constructor(nSampleRate: number);
    Clear(): void;
    /**
     * route nData to the appropriate place by current register
     * @param nData BYTE
     */
    WriteData(nData: number): void;
    /**
     * get current register
     * @returns {number} BYTE in range 0-31
     */
    ReadAddress(): number;
    /**
     * set current register
     * @param nReg BYTE in range 0-31
     */
    WriteAddress(nReg: number): void;
    /**
     * combo!
     * @param nReg
     * @param nData
     */
    WriteAddressData(nReg: number, nData: number): void;
    /**
     * channel mutation
     * @param nChn channel number 0-5
     * @param bMute boolean
     */
    MuteAmp(nChn: number, bMute: boolean): void;
    GenerateMono(pBuffer: Float32Array, nSamples: number): void;
    GenerateStereo(pLeft: Float32Array, pRight: Float32Array, nSamples: number): void;
}
declare class SAANoise {
    private nCounter;
    private nAdd;
    private bSync;
    private nRand;
    private nSmpRate;
    private nSource;
    constructor(seed?: number);
    Level(): number;
    /**
     * send command to noise generator
     * @param nSource values 0 to 3
     */
    SetSource(nSource: number): void;
    /**
     * Trigger only does anything useful when we're
     * clocking from the frequency generator (i.e. SourceMode = 3).
     * So if we're clocking from the noise generator clock
     * (ie, SourceMode = 0, 1 or 2) then do nothing...
     */
    Trigger(): void;
    Tick(): number;
    Sync(bSync: boolean): void;
    private ChangeLevel();
}
interface ENVDATA {
    nPhases: number;
    bLooping: boolean;
    aLevels: number[][][];
}
declare class SAAEnv {
    private nLeftLevel;
    private nRightLevel;
    private pEnvData;
    private bEnabled;
    private bStereo;
    private nPhase;
    private nPhasePosition;
    private bEnded;
    private bLooping;
    private nPhases;
    private nResolution;
    private bNewData;
    private nNextData;
    private bOkForNewData;
    private bClockExternally;
    private cs_EnvData;
    constructor();
    /** Do the Tick if envelope control is enabled and clock mode set to internal */
    InternalClock(): void;
    /** Do the Tick if envelope control is enabled and clock mode set to external */
    ExternalClock(): void;
    /**
     * send command to envgenerator
     * @param nData BYTE
     */
    SetEnvControl(nData: number): void;
    private Tick();
    /**
     * set envgenerator's levels according to the nResolution:
     * Resolution of envelope waveform.
     *     true : 3-bit resolution;
     *     false: 4-bit resolution;
     */
    private SetLevels();
    /**
     * loads envgenerator's registers according to the bits set in nData
     * @param nData BYTE
     */
    private SetNewEnvData(nData?);
    LeftLevel(): number;
    RightLevel(): number;
    IsActive(): boolean;
}
declare class SAAFreq {
    private nLevel;
    private nCounter;
    private nAdd;
    private nCurrentOffset;
    private nCurrentOctave;
    private nNextOffset;
    private nNextOctave;
    private bIgnoreOffsetData;
    private bNewData;
    private bSync;
    private nSmpRate;
    private nConnectedMode;
    private pcConnectedNoiseGenerator;
    private pcConnectedEnvGenerator;
    constructor(pcNoise?: SAANoise, pcEnv?: SAAEnv);
    Level(): number;
    /**
     * @param nOffset between 0 and 255
     */
    SetFreqOffset(nOffset: number): void;
    /**
     * @param nOctave between 0 and 7
     */
    SetFreqOctave(nOctave: number): void;
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
    UpdateOctaveOffsetData(): void;
    Tick(): number;
    Sync(bSync: boolean): void;
    private SetAdd();
}
interface stereolevel {
    Left: number;
    Right: number;
}
declare class SAAAmp {
    private last_level_byte;
    private leftleveltimes16;
    private leftleveltimes32;
    private leftlevela0x0e;
    private leftlevela0x0etimes2;
    private rightleveltimes16;
    private rightleveltimes32;
    private rightlevela0x0e;
    private rightlevela0x0etimes2;
    private monoleveltimes16;
    private monoleveltimes32;
    private nOutputIntermediate;
    private nMixMode;
    private pcConnectedToneGenerator;
    private pcConnectedNoiseGenerator;
    private pcConnectedEnvGenerator;
    private bUseEnvelope;
    private bMute;
    constructor(ToneGenerator: SAAFreq, NoiseGenerator: SAANoise, EnvGenerator?: SAAEnv);
    /**
     * Set amplitude, but if level unchanged since last call then do nothing.
     * @param level_byte BYTE
     */
    SetAmpLevel(level_byte: number): void;
    SetToneMixer(bEnabled: number): void;
    SetNoiseMixer(bEnabled: number): void;
    Tick(): void;
    TickAndOutputMono(): number;
    TickAndOutputStereo(): stereolevel;
    Mute(bMute: boolean): void;
}
