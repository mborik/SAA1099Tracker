/// <reference path="Commons.d.ts" />
/// <reference path="SAASound.d.ts" />
/*!
 * Player: Global classes a interface definition.
 * Copyright (c) 2012-2017 Martin Borik <mborik@users.sourceforge.net>
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
declare const MAX_PATTERN_LEN = 128;
declare const pMode: {
    PM_SONG: number;
    PM_POSITION: number;
    PM_SONG_OR_POS: number;
    PM_SAMPLE: number;
    PM_LINE: number;
    PM_SAMP_OR_LINE: number;
    PM_SIMULATION: number;
};
declare class pTone {
    cent: number;
    oct: number;
    txt: string;
    constructor(word?: number);
    word: number;
}
declare class pVolume {
    L: number;
    R: number;
    byte: number;
}
declare class pMixer {
    index: number;
    length: number;
}
interface pSampleData {
    volume: pVolume;
    enable_freq: boolean;
    enable_noise: boolean;
    noise_value: number;
    shift: number;
}
declare class pSample {
    name: string;
    data: pSampleData[];
    loop: number;
    end: number;
    releasable: boolean;
    constructor();
    /**
     * Export sample data to array of readable strings.
     * We going backward from the end of sample and unshifting array because of pack
     * reasons when "pack" param is true and then only meaningful data will be stored.
     */
    export(pack?: boolean): string[];
    /**
     * Parse sample data from array of buch of hex values stored in simple string.
     */
    parse(arr: string[]): void;
}
declare class pOrnament {
    name: string;
    data: Int8Array;
    loop: number;
    end: number;
    /**
     * Export ornament data to array of readable strings.
     * We going backward from the end of ornament and unshifting array because of pack
     * reasons when "pack" param is true and then only meaningful data will be stored.
     */
    export(pack?: boolean): string[];
    /**
     * Parse ornament data from array of signed values stored in simple string.
     */
    parse(arr: string[]): void;
}
interface pPatternLine {
    tone: number;
    release: boolean;
    smp: number;
    orn: number;
    orn_release: boolean;
    volume: pVolume;
    cmd: number;
    cmd_data: number;
}
declare class pPattern {
    data: pPatternLine[];
    end: number;
    constructor(end?: number);
    /**
     * Export pattern data to array of readable strings.
     * We going backward from the end of pattern and unshifting array because of pack
     * reasons when "pack" param is true and then only meaningful data will be stored.
     */
    export(start?: number, length?: number, pack?: boolean): string[];
    /**
     * Parse pattern data from array of strings with values like in tracklist.
     */
    parse(arr: string[], start?: number, length?: number): void;
    destroy(): void;
}
interface pParams {
    tone: number;
    playing: boolean;
    sample: pSample;
    ornament: pOrnament;
    sample_cursor: number;
    ornament_cursor: number;
    attenuation: pVolume;
    slideShift: number;
    globalPitch: number;
    released: boolean;
    command: number;
    commandParam: number;
    commandPhase: number;
    commandValue1: number;
    commandValue2: number;
    [key: string]: any;
}
declare class pRuntime extends SAASoundRegData {
    params: pParams[];
    clearPlayParams: (chn: number) => void;
    constructor(player: Player);
    setRegData(reg: number, data: number): void;
    replace(data: pRuntime): void;
    destroy(): void;
}
interface pChannel {
    pattern: number;
    pitch: number;
}
/**
 * Position class declaration with 6 channels definition, length and default speed.
 * @property frames Number of interupts which takes every line in tracklist;
 */
declare class pPosition {
    ch: pChannel[];
    speed: number;
    length: number;
    frames: number[];
    initParams: pRuntime;
    constructor(length: number, speed?: number);
    hasPattern(pattern: number): boolean;
    indexOf(pattern: number): number;
    export(): string[];
    destroy(): void;
}
declare class Player {
    static maxPatternLen: number;
    tones: pTone[];
    sample: pSample[];
    ornament: pOrnament[];
    pattern: pPattern[];
    position: pPosition[];
    nullPosition: pPosition;
    loopMode: boolean;
    changedLine: boolean;
    changedPosition: boolean;
    currentPosition: number;
    repeatPosition: number;
    currentSpeed: number;
    currentLine: number;
    currentTick: number;
    private mode;
    private mixer;
    private rtSong;
    private rtSample;
    SAA1099: SAASound;
    constructor(SAA1099: SAASound);
    /** Clear or initialize song (positions, patterns, pointers and playParams). */
    clearSong(reinit?: boolean): void;
    /** Clear all samples. */
    clearSamples(): void;
    /** Clear all ornaments. */
    clearOrnaments(): void;
    /**
     * Create bare pattern at the end of the array of patterns and return it's number.
     * @returns {number} new pattern number
     */
    addNewPattern(): number;
    /**
     * Create new position in given length and basic speed.
     * @param length Position length;
     * @param speed Basic position speed;
     * @param add Should be position added to stack?
     * @returns {pPosition} new position object;
     */
    addNewPosition(length: number, speed: number, add?: boolean): pPosition;
    /**
     * Set processor's interrupt of virtual pseudo-emulated 8bit computer to the mixer.
     * @param freq Interrupt frequency in Hz;
     */
    setInterrupt(freq: number): void;
    /**
     * Method which provides audio data of both channels separately for AudioDriver
     * and calling prepareFrame() every interrupt of 8bit processor.
     * @param leftBuf TypedArray of 32bit float type;
     * @param rightBuf TypedArray of 32bit float type;
     * @param length of buffer;
     */
    getAudio(leftBuf: Float32Array, rightBuf: Float32Array, length: number): void;
    /**
     * This method do a simulation of playback in position for given number of lines.
     * @param lines Number of lines to simulate;
     * @param pos Optional position number in which do a simulation;
     * @param rt Simulate over the custom runtime parameters;
     */
    private simulation(lines, pos?, rt?);
    /**
     * Most important part of Player: Method needs to be called every interrupt/frame.
     * It handles all the pointers and settings to output values on SAA1099 registers.
     */
    private prepareFrame(rt?);
    /**
     * Another very important part of Player, sibling to prepareFrame():
     * This method prepares parameters for next trackline in position...
     * @param next Move to the next trackline (default true);
     * @returns {boolean} success or failure
     */
    private prepareLine(next?, rt?);
    /**
     * Play only current row in current position.
     * @returns {boolean}
     */
    playLine(): boolean;
    /**
     * Start playback of position or pattern.
     * @param fromStart Start playing from first position;
     * @param follow Follow the song, change next position when position reach the end;
     * @param resetLine Start playing from first row of the position;
     * @returns {boolean} success or failure
     */
    playPosition(fromStart?: boolean, follow?: boolean, resetLine?: boolean): boolean;
    /**
     * Play custom tone with particular sample/ornament in particular channel.
     * @param s Sample;
     * @param o Ornament;
     * @param tone Tone number;
     * @param chn (optional) Channel number or autodetect first "free" channel;
     * @returns {number} channel (1-6) where the sample has been played or 0 if error
     */
    playSample(s: number, o: number, tone: number, chn?: number): number;
    /**
     * Stops a playback of particular channel (1 <= chn <= 6) or stop playback (chn = 0).
     * Method reset appropriate channel's playParams.
     * @param chn Zero or channel number (1-6);
     */
    stopChannel(chn?: number): void;
    readonly isPlaying: boolean;
    /**
     * Calculate pTone object with actual frequency from a lot of parameters of player.
     * It takes into account all nuances which can occur in tracklist...
     * @param toneValue Base tone on input;
     * @param globalShift Global pattern tone shift;
     * @param toneShift Ornament tone shift;
     * @param slideShift Fine tune frequency shift;
     * @returns {pTone} object
     */
    private calculateTone(toneValue, globalShift, toneShift, slideShift);
    /**
     * Count how many times was particular pattern used in all positions.
     * @param patt Pattern number;
     * @returns {number} count
     */
    countPatternUsage(patt: number): number;
    /**
     * Method that count "position frames" or number of interupts which takes every
     * line in tracklist. It's very important for time calculations!
     * @param pos If ommited, method calls itself recursively for all positions;
     */
    countPositionFrames(pos?: number): void;
    /**
     * Method calculates runtime parameters by simulation of playback from start
     * of the previous position to first line of the actual position.
     * @param pos Position number bigger than zero;
     */
    storePositionRuntime(pos: number): boolean;
    private static vibratable;
}
