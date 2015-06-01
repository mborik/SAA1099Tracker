/*!
 * SAASound is a portable Phillips SAA 1099 sound chip emulator
 * Copyright (c) 1998-2004 Dave Hooper <stripwax@users.sourceforge.net>
 *
 * JavaScript version:
 * Copyright (c) 2015 Martin Borik <mborik@users.sourceforge.net>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *
 * - Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * - Neither the name Dave Hooper nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
 * OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
 * OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var SAASound;
(function (SAASound) {
    SAASound.nSampleRate;
    SAASound.nBufferSize;
})(SAASound || (SAASound = {}));
/*! SAAEnv: Envelope generator */
/// <reference path="SAASound.ts" />
var SAASound;
(function (SAASound) {
    var SAAEnv = (function () {
        function SAAEnv() {
            this.cs_EnvData = [
                { nPhases: 1, bLooping: false, aLevels: [
                        [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                        [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] },
                { nPhases: 1, bLooping: true, aLevels: [
                        [[15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
                            [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15]],
                        [[14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
                            [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]]] },
                { nPhases: 1, bLooping: false, aLevels: [
                        [[15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                        [[14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] },
                { nPhases: 1, bLooping: true, aLevels: [
                        [[15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                        [[14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] },
                { nPhases: 2, bLooping: false, aLevels: [
                        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                            [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]],
                        [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                            [14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0]]] },
                { nPhases: 2, bLooping: true, aLevels: [
                        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                            [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]],
                        [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                            [14, 14, 12, 12, 10, 10, 8, 8, 6, 6, 4, 4, 2, 2, 0, 0]]] },
                { nPhases: 1, bLooping: false, aLevels: [
                        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                        [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] },
                { nPhases: 1, bLooping: true, aLevels: [
                        [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
                        [[0, 0, 2, 2, 4, 4, 6, 6, 8, 8, 10, 10, 12, 12, 14, 14],
                            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]]] }
            ];
            this.bEnabled = false;
            this.bNewData = false;
            this.nNextData = 0;
            this.bOkForNewData = false;
            this.SetNewEnvData();
        }
        SAAEnv.prototype.InternalClock = function () {
            if (this.bEnabled && !this.bClockExternally)
                this.Tick();
        };
        SAAEnv.prototype.ExternalClock = function () {
            if (this.bEnabled && this.bClockExternally)
                this.Tick();
        };
        SAAEnv.prototype.SetEnvControl = function (nData) {
            this.nResolution = !!(nData & 0x10);
            this.bEnabled = !!(nData & 0x80);
            if (!this.bEnabled) {
                this.nPhase = 0;
                this.nPhasePosition = 0;
                this.bEnded = true;
                this.bOkForNewData = true;
                this.bNewData = true;
                this.nNextData = nData;
                return this.SetLevels();
            }
            if (this.bOkForNewData) {
                this.SetNewEnvData(nData);
                this.bNewData = false;
                this.bOkForNewData = false;
            }
            else {
                this.SetLevels();
                this.bNewData = true;
                this.nNextData = nData;
            }
        };
        SAAEnv.prototype.Tick = function () {
            if (!this.bEnabled) {
                this.bEnded = true;
                this.nPhase = 0;
                this.nPhasePosition = 0;
                this.bOkForNewData = true;
                return;
            }
            else if (this.bEnded) {
                return;
            }
            this.nPhasePosition += this.nResolution ? 2 : 1;
            if (this.nPhasePosition >= 16) {
                this.nPhase++;
                this.nPhasePosition -= 16;
                if (this.nPhase === this.nPhases) {
                    this.bOkForNewData = true;
                    if (!this.bLooping) {
                        this.bEnded = true;
                        this.nPhase = this.nPhases - 1;
                        this.nPhasePosition = 15;
                        this.bOkForNewData = true;
                    }
                    else {
                        this.bEnded = false;
                        this.nPhase = 0;
                    }
                }
                else {
                    this.bOkForNewData = false;
                }
            }
            else {
                this.bOkForNewData = false;
            }
            if (this.bNewData && this.bOkForNewData) {
                this.bNewData = false;
                this.bOkForNewData = false;
                this.SetNewEnvData(this.nNextData);
            }
            else {
                this.SetLevels();
            }
        };
        SAAEnv.prototype.SetLevels = function () {
            var res = 0 + this.nResolution;
            this.nLeftLevel = this.pEnvData.aLevels[res][this.nPhase][this.nPhasePosition];
            if (this.bStereo)
                this.nRightLevel = (15 - res) - this.nLeftLevel;
            else
                this.nRightLevel = this.nLeftLevel;
        };
        SAAEnv.prototype.SetNewEnvData = function (nData) {
            if (nData === void 0) { nData = 0; }
            this.nPhase = 0;
            this.nPhasePosition = 0;
            this.pEnvData = this.cs_EnvData[(nData >> 1) & 0x07];
            this.bStereo = !!(nData & 0x01);
            this.bClockExternally = !!(nData & 0x20);
            this.nPhases = this.pEnvData.nPhases;
            this.bLooping = this.pEnvData.bLooping;
            this.nResolution = !!(nData & 0x10);
            this.bEnabled = !!(nData & 0x80);
            if (this.bEnabled)
                this.bEnded = false;
            else {
                this.bEnded = true;
                this.nPhase = 0;
                this.nPhasePosition = 0;
                this.bOkForNewData = true;
            }
            this.SetLevels();
        };
        SAAEnv.prototype.LeftLevel = function () { return this.nLeftLevel; };
        SAAEnv.prototype.RightLevel = function () { return this.nRightLevel; };
        SAAEnv.prototype.IsActive = function () { return this.bEnabled; };
        return SAAEnv;
    })();
    SAASound.SAAEnv = SAAEnv;
})(SAASound || (SAASound = {}));
/*! SAAFreq: Frequency oscillator, 7-bit fractional accuracy */
/// <reference path="SAASound.ts" />
var SAASound;
(function (SAASound) {
    var SAAFreq = (function () {
        function SAAFreq(pcNoise, pcEnv) {
            this.nLevel = 2;
            this.nCounter = this.nAdd = 0;
            this.nCurrentOffset = this.nCurrentOctave = 0;
            this.nNextOffset = this.nNextOctave = 0;
            this.bIgnoreOffsetData = this.bNewData = this.bSync = false;
            this.nSmpRate = SAASound.nSampleRate * SAASound.nBufferSize;
            this.pcConnectedNoiseGenerator = pcNoise;
            this.pcConnectedEnvGenerator = pcEnv;
            this.nConnectedMode = (pcNoise ? (pcEnv ? 0 : 1) : 2);
            this.SetAdd();
        }
        SAAFreq.prototype.Level = function () { return this.nLevel; };
        SAAFreq.prototype.SetFreqOffset = function (nOffset) {
            if (!this.bSync) {
                this.nNextOffset = nOffset;
                this.bNewData = true;
                if (this.nNextOctave == this.nCurrentOctave)
                    this.bIgnoreOffsetData = true;
            }
            else {
                this.bNewData = false;
                this.nCurrentOffset = nOffset;
                this.nCurrentOctave = this.nNextOctave;
                this.SetAdd();
            }
        };
        SAAFreq.prototype.SetFreqOctave = function (nOctave) {
            if (!this.bSync) {
                this.nNextOctave = nOctave;
                this.bNewData = true;
                this.bIgnoreOffsetData = false;
            }
            else {
                this.bNewData = false;
                this.nCurrentOctave = nOctave;
                this.nCurrentOffset = this.nNextOffset;
                this.SetAdd();
            }
        };
        SAAFreq.prototype.UpdateOctaveOffsetData = function () {
            if (!this.bNewData)
                return;
            this.nCurrentOctave = this.nNextOctave;
            if (!this.bIgnoreOffsetData) {
                this.nCurrentOffset = this.nNextOffset;
                this.bNewData = false;
            }
            this.bIgnoreOffsetData = false;
            this.SetAdd();
        };
        SAAFreq.prototype.Tick = function () {
            if (!this.bSync) {
                this.nCounter += this.nAdd;
                if (this.nCounter >= this.nSmpRate) {
                    while (this.nCounter >= this.nSmpRate) {
                        this.nCounter -= this.nSmpRate;
                        this.nLevel = 2 - this.nLevel;
                        if (this.nConnectedMode === 1)
                            this.pcConnectedEnvGenerator.InternalClock();
                        else if (this.nConnectedMode === 2)
                            this.pcConnectedNoiseGenerator.Trigger();
                    }
                    this.UpdateOctaveOffsetData();
                }
            }
            return this.nLevel;
        };
        SAAFreq.prototype.Sync = function (bSync) {
            this.bSync = bSync;
            if (bSync) {
                this.nCounter = 0;
                this.nLevel = 2;
                this.nCurrentOctave = this.nNextOctave;
                this.nCurrentOffset = this.nNextOffset;
                this.SetAdd();
            }
        };
        SAAFreq.prototype.SetAdd = function () { this.nAdd = ((15625 << this.nCurrentOctave) / (511 - this.nCurrentOffset)) >> 0; };
        return SAAFreq;
    })();
    SAASound.SAAFreq = SAAFreq;
})(SAASound || (SAASound = {}));
/*! SAANoise: Noise generator */
/// <reference path="SAASound.ts" />
var SAASound;
(function (SAASound) {
    var SAANoise = (function () {
        function SAANoise(seed) {
            if (seed === void 0) { seed = 0x11111111; }
            this.nCounter = 0;
            this.nAdd = 31250 * SAASound.nBufferSize;
            this.bSync = false;
            this.nSmpRate = SAASound.nSampleRate * SAASound.nBufferSize;
            this.nSource = 0;
            this.nRand = seed;
        }
        SAANoise.prototype.Level = function () { return (this.nRand & 1) << 1; };
        SAANoise.prototype.SetSource = function (nSource) {
            this.nSource = (nSource &= 3);
            this.nAdd = (31250 >> nSource) * SAASound.nBufferSize;
        };
        SAANoise.prototype.Trigger = function () {
            if (this.nSource === 3)
                this.ChangeLevel();
        };
        SAANoise.prototype.Tick = function () {
            if (!this.bSync && (this.nSource != 3)) {
                this.nCounter += this.nAdd;
                if (this.nCounter >= this.nSmpRate) {
                    while (this.nCounter >= this.nSmpRate) {
                        this.nCounter -= this.nSmpRate;
                        this.ChangeLevel();
                    }
                }
            }
            return (this.nRand & 1);
        };
        SAANoise.prototype.Sync = function (bSync) {
            if (bSync)
                this.nCounter = 0;
            this.bSync = bSync;
        };
        SAANoise.prototype.ChangeLevel = function () {
            if (!!(this.nRand & 0x40000004) && (this.nRand & 0x40000004) != 0x40000004)
                this.nRand = (this.nRand << 1) | 1;
            else
                this.nRand <<= 1;
        };
        return SAANoise;
    })();
    SAASound.SAANoise = SAANoise;
})(SAASound || (SAASound = {}));
//# sourceMappingURL=SAASound.js.map