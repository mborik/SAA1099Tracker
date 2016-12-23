/// <reference path="SAASound.d.ts" />
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
    export(pack?: boolean): string[];
    parse(arr: string[]): void;
}
declare class pOrnament {
    name: string;
    data: Int8Array;
    loop: number;
    end: number;
    export(pack?: boolean): string[];
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
    export(start?: number, length?: number, pack?: boolean): string[];
    parse(arr: string[], start?: number, length?: number): void;
}
interface pChannel {
    pattern: number;
    pitch: number;
}
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
}
declare class pRuntime extends SAASoundRegData {
    params: pParams[];
    clearPlayParams: (chn: number) => void;
    constructor(player: Player);
    setRegData(reg: number, data: number): void;
    replace(data: pRuntime): void;
}
/*!
 * Player: Core of player routine.
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
    clearSong(init?: boolean): void;
    clearSamples(): void;
    clearOrnaments(): void;
    addNewPattern(): number;
    addNewPosition(length: number, speed: number, add?: boolean): pPosition;
    setInterrupt(freq: number): void;
    getAudio(leftBuf: Float32Array, rightBuf: Float32Array, length: number): void;
    private simulation(lines, pos?, rt?);
    private prepareFrame(rt?);
    private prepareLine(next?, rt?);
    playLine(): boolean;
    playPosition(fromStart?: boolean, follow?: boolean, resetLine?: boolean): boolean;
    playSample(s: number, o: number, tone: number, chn?: number): number;
    stopChannel(chn?: number): void;
    private calculateTone(toneValue, globalShift, toneShift, slideShift);
    countPatternUsage(patt: number): number;
    countPositionFrames(pos?: number): void;
    storePositionRuntime(pos: number): boolean;
    private static vibratable;
}
