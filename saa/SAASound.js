/*! SAAAmp: Tone/Noise mixing, Envelope application and amplification */
var SAAAmp = (function () {
    function SAAAmp(ToneGenerator, NoiseGenerator, EnvGenerator) {
        this.last_level_byte = 0;
        this.leftleveltimes16 = 0;
        this.leftleveltimes32 = 0;
        this.leftlevela0x0e = 0;
        this.leftlevela0x0etimes2 = 0;
        this.rightleveltimes16 = 0;
        this.rightleveltimes32 = 0;
        this.rightlevela0x0e = 0;
        this.rightlevela0x0etimes2 = 0;
        this.monoleveltimes16 = 0;
        this.monoleveltimes32 = 0;
        this.nOutputIntermediate = 0;
        this.nMixMode = 0;
        this.pcConnectedToneGenerator = ToneGenerator;
        this.pcConnectedNoiseGenerator = NoiseGenerator;
        this.pcConnectedEnvGenerator = EnvGenerator;
        this.bUseEnvelope = !!EnvGenerator;
        this.bMute = true;
    }
    SAAAmp.prototype.SetAmpLevel = function (level_byte) {
        if ((level_byte &= 255) !== this.last_level_byte) {
            this.last_level_byte = level_byte;
            this.leftlevela0x0e = level_byte & 0x0e;
            this.leftlevela0x0etimes2 = this.leftlevela0x0e << 1;
            this.leftleveltimes16 = (level_byte & 0x0f) << 4;
            this.leftleveltimes32 = this.leftleveltimes16 << 1;
            this.rightlevela0x0e = (level_byte >> 4) & 0x0e;
            this.rightlevela0x0etimes2 = this.rightlevela0x0e << 1;
            this.rightleveltimes16 = level_byte & 0xf0;
            this.rightleveltimes32 = this.rightleveltimes16 << 1;
            this.monoleveltimes16 = this.leftleveltimes16 + this.rightleveltimes16;
            this.monoleveltimes32 = this.leftleveltimes32 + this.rightleveltimes32;
        }
    };
    SAAAmp.prototype.SetToneMixer = function (bEnabled) {
        if (!bEnabled)
            this.nMixMode &= ~(0x01);
        else
            this.nMixMode |= 0x01;
    };
    SAAAmp.prototype.SetNoiseMixer = function (bEnabled) {
        if (!bEnabled)
            this.nMixMode &= ~(0x02);
        else
            this.nMixMode |= 0x02;
    };
    SAAAmp.prototype.Tick = function () {
        switch (this.nMixMode) {
            case 0:
                this.pcConnectedToneGenerator.Tick();
                this.nOutputIntermediate = 0;
                break;
            case 1:
                this.nOutputIntermediate = this.pcConnectedToneGenerator.Tick();
                break;
            case 2:
                this.pcConnectedToneGenerator.Tick();
                this.nOutputIntermediate = this.pcConnectedNoiseGenerator.Level();
                break;
            case 3:
                this.nOutputIntermediate = this.pcConnectedToneGenerator.Tick();
                if (this.nOutputIntermediate === 2 && !!this.pcConnectedNoiseGenerator.Level())
                    this.nOutputIntermediate = 1;
                break;
        }
    };
    SAAAmp.prototype.TickAndOutputMono = function () {
        this.Tick();
        if (this.bMute)
            return 0;
        var retval = 0;
        var out = this.nOutputIntermediate;
        if (this.bUseEnvelope && this.pcConnectedEnvGenerator.IsActive()) {
            if (out === 0) {
                retval = (this.pcConnectedEnvGenerator.LeftLevel() * this.leftlevela0x0etimes2)
                    + (this.pcConnectedEnvGenerator.RightLevel() * this.rightlevela0x0etimes2);
            }
            else if (out === 1) {
                retval = (this.pcConnectedEnvGenerator.LeftLevel() * this.leftlevela0x0e)
                    + (this.pcConnectedEnvGenerator.RightLevel() * this.rightlevela0x0e);
            }
        }
        else {
            if (out === 1)
                retval = this.monoleveltimes16;
            else if (out === 2)
                retval = this.monoleveltimes32;
        }
        return retval;
    };
    SAAAmp.prototype.TickAndOutputStereo = function () {
        this.Tick();
        var retval = { Left: 0, Right: 0 };
        var out = this.nOutputIntermediate;
        if (this.bMute)
            return retval;
        if (this.bUseEnvelope && this.pcConnectedEnvGenerator.IsActive()) {
            if (out === 0) {
                retval.Left = this.pcConnectedEnvGenerator.LeftLevel() * this.leftlevela0x0etimes2;
                retval.Right = this.pcConnectedEnvGenerator.RightLevel() * this.rightlevela0x0etimes2;
            }
            else if (out === 1) {
                retval.Left = this.pcConnectedEnvGenerator.LeftLevel() * this.leftlevela0x0e;
                retval.Right = this.pcConnectedEnvGenerator.RightLevel() * this.rightlevela0x0e;
            }
        }
        else {
            if (out === 1) {
                retval.Left = this.leftleveltimes16;
                retval.Right = this.rightleveltimes16;
            }
            else if (out === 2) {
                retval.Left = this.leftleveltimes32;
                retval.Right = this.rightleveltimes32;
            }
        }
        return retval;
    };
    SAAAmp.prototype.Mute = function (bMute) { this.bMute = bMute; };
    return SAAAmp;
})();
/*! SAAEnv: Envelope generator */
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
/*! SAAFreq: Frequency oscillator, 7-bit fractional accuracy */
var SAAFreq = (function () {
    function SAAFreq(pcNoise, pcEnv) {
        this.nCounter = 0;
        this.nAdd = 0;
        this.nCurrentOffset = 0;
        this.nCurrentOctave = 0;
        this.nNextOffset = 0;
        this.nNextOctave = 0;
        this.bIgnoreOffsetData = false;
        this.bNewData = false;
        this.bSync = false;
        this.nLevel = 2;
        this.nSmpRate = SAASound.nSampleRate << 12;
        this.pcConnectedNoiseGenerator = pcNoise;
        this.pcConnectedEnvGenerator = pcEnv;
        this.nConnectedMode = (!pcNoise ? (!pcEnv ? 0 : 1) : 2);
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
    SAAFreq.prototype.SetAdd = function () {
        var oct = this.nCurrentOctave + 13, ton = this.nCurrentOffset ^ 511;
        this.nAdd = ((15625 << oct) / ton) >> 0;
    };
    return SAAFreq;
})();
/*! SAANoise: Noise generator */
var SAANoise = (function () {
    function SAANoise(seed) {
        if (seed === void 0) { seed = 0x11111111; }
        this.nCounter = 0;
        this.nAdd = 128e6;
        this.bSync = false;
        this.nSmpRate = SAASound.nSampleRate << 12;
        this.nSource = 0;
        this.nRand = seed;
    }
    SAANoise.prototype.Level = function () { return (this.nRand & 1) << 1; };
    SAANoise.prototype.SetSource = function (nSource) {
        this.nSource = (nSource &= 3);
        this.nAdd = 128e6 >> nSource;
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
/*!
 * SAASound is a portable Phillips SAA 1099 sound chip emulator
 * Copyright (c) 1998-2004 Dave Hooper <stripwax@users.sourceforge.net>
 *
 * JavaScript version:
 * Copyright (c) 2015 Martin Borik <mborik@users.sourceforge.net>
 */
var SAASound = (function () {
    function SAASound(nSampleRate) {
        this.nCurrentReg = 0;
        this.bOutputEnabled = false;
        this.bAmpMuted = [false, false, false, false, false, false];
        SAASound.nSampleRate = nSampleRate;
        this.Env = [new SAAEnv, new SAAEnv];
        this.Noise = [
            new SAANoise(0x14af5209),
            new SAANoise(0x76a9b11e)
        ];
        this.Osc = [
            new SAAFreq(this.Noise[0]),
            new SAAFreq(null, this.Env[0]),
            new SAAFreq(),
            new SAAFreq(this.Noise[1]),
            new SAAFreq(null, this.Env[1]),
            new SAAFreq()
        ];
        this.Amp = [
            new SAAAmp(this.Osc[0], this.Noise[0]),
            new SAAAmp(this.Osc[1], this.Noise[0]),
            new SAAAmp(this.Osc[2], this.Noise[0], this.Env[0]),
            new SAAAmp(this.Osc[3], this.Noise[1]),
            new SAAAmp(this.Osc[4], this.Noise[1]),
            new SAAAmp(this.Osc[5], this.Noise[1], this.Env[1])
        ];
        this.Clear();
    }
    SAASound.prototype.Clear = function () {
        this.WriteAddressData(28, 2);
        for (var i = 31; i >= 0; i--) {
            if (i != 28)
                this.WriteAddressData(i, 0);
        }
        this.WriteAddressData(28, 0);
        this.WriteAddress(0);
    };
    SAASound.prototype.WriteData = function (nData) {
        nData &= 0xff;
        var nReg = this.nCurrentReg;
        switch (nReg) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
                this.Amp[nReg].SetAmpLevel(nData);
                break;
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
                this.Osc[(nReg & 0x07)].SetFreqOffset(nData);
                break;
            case 16:
                this.Osc[0].SetFreqOctave(nData & 0x07);
                this.Osc[1].SetFreqOctave((nData >> 4) & 0x07);
                break;
            case 17:
                this.Osc[2].SetFreqOctave(nData & 0x07);
                this.Osc[3].SetFreqOctave((nData >> 4) & 0x07);
                break;
            case 18:
                this.Osc[4].SetFreqOctave(nData & 0x07);
                this.Osc[5].SetFreqOctave((nData >> 4) & 0x07);
                break;
            case 20:
                this.Amp[0].SetToneMixer(nData & 0x01);
                this.Amp[1].SetToneMixer(nData & 0x02);
                this.Amp[2].SetToneMixer(nData & 0x04);
                this.Amp[3].SetToneMixer(nData & 0x08);
                this.Amp[4].SetToneMixer(nData & 0x10);
                this.Amp[5].SetToneMixer(nData & 0x20);
                break;
            case 21:
                this.Amp[0].SetNoiseMixer(nData & 0x01);
                this.Amp[1].SetNoiseMixer(nData & 0x02);
                this.Amp[2].SetNoiseMixer(nData & 0x04);
                this.Amp[3].SetNoiseMixer(nData & 0x08);
                this.Amp[4].SetNoiseMixer(nData & 0x10);
                this.Amp[5].SetNoiseMixer(nData & 0x20);
                break;
            case 22:
                this.Noise[0].SetSource(nData & 0x03);
                this.Noise[1].SetSource((nData >> 4) & 0x03);
                break;
            case 24:
                this.Env[0].SetEnvControl(nData);
                break;
            case 25:
                this.Env[1].SetEnvControl(nData);
                break;
            case 28:
                var i;
                var mute = !(nData & 0x01);
                var sync = !!(nData & 0x02);
                for (i = 0; i < 6; i++)
                    this.Osc[i].Sync(sync);
                this.Noise[0].Sync(sync);
                this.Noise[1].Sync(sync);
                this.bSync = sync;
                if (mute) {
                    for (i = 0; i < 6; i++)
                        this.Amp[i].Mute(mute);
                    this.bOutputEnabled = false;
                }
                else {
                    for (i = 0; i < 6; i++)
                        this.Amp[i].Mute(this.bAmpMuted[i]);
                    this.bOutputEnabled = true;
                }
                break;
            default:
                break;
        }
    };
    SAASound.prototype.ReadAddress = function () { return this.nCurrentReg; };
    SAASound.prototype.WriteAddress = function (nReg) {
        this.nCurrentReg = (nReg &= 0x1f);
        if (nReg === 24)
            this.Env[0].ExternalClock();
        else if (nReg === 25)
            this.Env[1].ExternalClock();
    };
    SAASound.prototype.WriteAddressData = function (nReg, nData) {
        this.WriteAddress(nReg);
        this.WriteData(nData);
    };
    SAASound.prototype.MuteAmp = function (nChn, bMute) {
        if (nChn < 0 || nChn >= 6)
            return;
        this.Amp[nChn].Mute((this.bAmpMuted[nChn] = bMute));
    };
    SAASound.prototype.GenerateMono = function (pBuffer, nSamples) {
        var ptr = 0, val;
        while (ptr < nSamples) {
            this.Noise[0].Tick();
            this.Noise[1].Tick();
            val = this.Amp[0].TickAndOutputMono()
                + this.Amp[1].TickAndOutputMono()
                + this.Amp[2].TickAndOutputMono()
                + this.Amp[3].TickAndOutputMono()
                + this.Amp[4].TickAndOutputMono()
                + this.Amp[5].TickAndOutputMono();
            pBuffer[ptr++] = val / 12672;
        }
    };
    SAASound.prototype.GenerateStereo = function (pLeft, pRight, nSamples) {
        var ptr = 0, val, ampL, ampR;
        while (ptr < nSamples) {
            this.Noise[0].Tick();
            this.Noise[1].Tick();
            val = this.Amp[0].TickAndOutputStereo();
            ampL = val.Left;
            ampR = val.Right;
            val = this.Amp[1].TickAndOutputStereo();
            ampL += val.Left;
            ampR += val.Right;
            val = this.Amp[2].TickAndOutputStereo();
            ampL += val.Left;
            ampR += val.Right;
            val = this.Amp[3].TickAndOutputStereo();
            ampL += val.Left;
            ampR += val.Right;
            val = this.Amp[4].TickAndOutputStereo();
            ampL += val.Left;
            ampR += val.Right;
            val = this.Amp[5].TickAndOutputStereo();
            ampL += val.Left;
            ampR += val.Right;
            pRight[ptr] = ampR / 2880;
            pLeft[ptr++] = ampL / 2880;
        }
    };
    return SAASound;
})();
//# sourceMappingURL=SAASound.js.map