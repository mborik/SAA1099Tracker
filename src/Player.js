/*!
 * Player: Core of player routine.
 * Copyright (c) 2012-2016 Martin Borik <mborik@users.sourceforge.net>
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
/// <reference path='../saa/SAASound.d.ts' />
//---------------------------------------------------------------------------------------
var pMode = {
    PM_NOT: 0,
    PM_SONG: 1,
    PM_POSITION: 2,
    PM_SONG_OR_POS: 3,
    PM_SAMPLE: 4,
    PM_LINE: 8,
    PM_SAMP_OR_LINE: 12
};
// Tone parameters interface
var pTone = (function () {
    function pTone() {
        this.cent = 0;
        this.oct = 0;
        this.txt = '---';
    }
    Object.defineProperty(pTone.prototype, "word", {
        get: function () { return ((this.cent & 0xff) | ((this.oct & 0x07) << 8)); },
        set: function (v) {
            this.cent = (v & 0xff);
            this.oct = (v >> 8) & 0x07;
        },
        enumerable: true,
        configurable: true
    });
    return pTone;
})();
// Volume/Attenuation value interface (byte value splitted into left/right channel)
var pVolume = (function () {
    function pVolume() {
        this.L = 0;
        this.R = 0;
    }
    Object.defineProperty(pVolume.prototype, "byte", {
        get: function () { return ((this.L & 0x0f) | ((this.R & 0x0f) << 4)); },
        set: function (v) {
            this.L = (v & 0x0f);
            this.R = (v >> 4) & 0x0f;
        },
        enumerable: true,
        configurable: true
    });
    return pVolume;
})();
/**
 * Position class declaration with 6 channels definition, length and default speed.
 * @property frames Number of interupts which takes every line in tracklist;
 */
var pPosition = (function () {
    function pPosition(length, speed) {
        if (speed === void 0) { speed = 6; }
        for (var i = 0; i < 6; i++)
            this.ch[i] = { pattern: 0, pitch: 0 };
        for (var i = 0, line = 0; line <= 96; line++, i += speed)
            this.frames[line] = i;
        this.length = length;
        this.speed = speed;
    }
    pPosition.prototype.hasPattern = function (pattern) { return this.indexOf(pattern) >= 0; };
    pPosition.prototype.indexOf = function (pattern) {
        for (var i = 0, r = -1; r < 0 && i < 6; i++)
            if (this.ch[i].pattern === pattern)
                r = i;
        return r;
    };
    return pPosition;
})();
//---------------------------------------------------------------------------------------
var Player = (function () {
    function Player(SAA1099) {
        this.SAA1099 = SAA1099;
        this.sample = [];
        this.ornament = [];
        this.playParams = [];
        var tab_tones = [
            "\x05B-",
            "\x21C-",
            "\x3CC#",
            "\x55D-",
            "\x6DD#",
            "\x84E-",
            "\x99F-",
            "\xADF#",
            "\xC0G-",
            "\xD2G#",
            "\xE3A-",
            "\xF3A#",
            "\xFFB-"
        ];
        this.tones = [new pTone];
        var i, o, p, c;
        for (i = 1, o = 0, p = 1; i <= 96; i++, p++) {
            this.tones[i] = new pTone;
            this.tones[i].txt = tab_tones[p].substr(1) + (o + 1);
            c = tab_tones[p].charCodeAt(0);
            if (c === 0xff && o !== 7) {
                o++;
                p = 0;
            }
            this.tones[i].oct = o;
            this.tones[i].cent = c;
        }
        this.clearSong();
        this.clearSamples();
        this.clearOrnaments();
        this.loopMode = true;
        this.lastEnabledFreq = this.lastEnabledNoise = this.lastNoiseCharacter = 0;
        this.stopChannel(0);
        this.mode = pMode.PM_NOT;
    }
    /** Clear song (positions, patterns, pointers and playParams). */
    Player.prototype.clearSong = function () {
        this.position = [];
        this.pattern = [];
        this.addNewPattern();
        this.changedLine = true;
        this.changedPosition = true;
        this.currentPosition = 0;
        this.repeatPosition = 0;
        this.currentSpeed = 6;
        this.currentLine = 0;
        this.currentTick = 0;
        for (var chn = 0; chn < 6; chn++)
            this.clearPlayParams(chn);
    };
    /** Clear all samples. */
    Player.prototype.clearSamples = function () {
        for (var i = 0; i < 32; i++) {
            this.sample[i] = { name: '', data: [], loop: 0, end: 0, releasable: false };
            for (var c = 0; c < 256; c++)
                this.sample[i].data[c] = { volume: new pVolume, enable_freq: false, enable_noise: false, noise_value: 0, shift: 0 };
        }
    };
    /** Clear all ornaments. */
    Player.prototype.clearOrnaments = function () {
        for (var i = 0; i < 16; i++)
            this.ornament[i] = { name: '', data: new Uint8Array(256), loop: 0, end: 0 };
    };
    /**
     * Reset playParams for particular channel to default values.
     * @param chn Channel number;
     */
    Player.prototype.clearPlayParams = function (chn) {
        this.playParams[chn] = { tone: 0, playing: false, sample: this.sample[0], ornament: this.ornament[0], sample_cursor: 0, ornament_cursor: 0, attenuation: new pVolume, slideShift: 0, globalPitch: 0, released: false, command: 0, commandParam: 0, commandPhase: 0, commandValue1: 0, commandValue2: 0 };
    };
    /**
     * Create bare pattern at the end of the array of patterns and return it's number.
     * @returns {number} new pattern number
     */
    Player.prototype.addNewPattern = function () {
        var i, index = this.pattern.length, pt = { data: [], end: 0 };
        for (i = 0; i < 96; i++)
            pt.data[i] = { tone: 0, release: false, smp: 0, orn: 0, orn_release: false, volume: new pVolume, cmd: 0, cmd_data: 0 };
        this.pattern.push(pt);
        return index;
    };
    //---------------------------------------------------------------------------------------
    /**
     * Most important part of Player: Method needs to be called every interrupt/frame.
     * It handles all the pointers and settings to output values on SAA1099 registers.
     */
    Player.prototype.prepareFrame = function () {
        if (this.mode === pMode.PM_NOT)
            return;
        var pp, wVol = new pVolume, height, val = 0, chn, chn2nd, chn3rd, oct = 0, noise, cmd, paramH, paramL, eMask, eFreq = this.lastEnabledFreq, eNoiz = this.lastEnabledNoise, eChar = this.lastNoiseCharacter;
        // helper methods to selected sample/ornament data-on-cursor direct access:
        var smpdat_at_cursor = function () { return pp.sample.data[pp.sample_cursor]; }, orndat_at_cursor = function () { return pp.ornament.data[pp.ornament_cursor]; };
        // We processing channels backward! It's because of SAA1099 register architecture
        // which expect settings for pairs or triplets of adjacent channels. We need
        // to know e.g. tone octave of every pair of channel and store to one register.
        // A similar case are settings for noise registers for every triplet of channels
        // and we want to have noise/envelope settings priority from left to right.
        // Therefore, it is better to go from 6th channel to 1st and group it's values...
        for (chn = 5; chn >= 0; chn--) {
            // pick playParams for channel...
            pp = this.playParams[chn];
            eMask = (1 << chn); // bit mask of channel
            chn2nd = (chn >> 1); // calculate pair of channels
            chn3rd = (chn / 3); // calculate triple of channels
            if (pp.playing) {
                // if playback in channel is enabled, fetch all smp/orn values...
                wVol.byte = smpdat_at_cursor().volume.byte;
                height = orndat_at_cursor();
                noise = smpdat_at_cursor().noise_value | (smpdat_at_cursor().noise_value << 2);
                // get command on trackline and calculate nibbles of command parameter...
                cmd = pp.command;
                paramH = (pp.commandParam & 0xf0) >> 4;
                paramL = (pp.commandParam & 0x0f);
                switch (cmd) {
                    // portamento up/down
                    case 0x1:
                    case 0x2:
                        if (!pp.commandPhase && pp.commandParam)
                            pp.commandPhase = paramH;
                        if (pp.commandPhase && !(--pp.commandPhase))
                            pp.slideShift += paramL * ((cmd & 1) ? 1 : -1);
                        break;
                    // glissando to given note
                    case 0x3:
                        if (!pp.commandPhase && pp.commandParam)
                            pp.commandPhase = paramH;
                        if (pp.commandValue1 && pp.commandPhase && !(--pp.commandPhase)) {
                            if (pp.commandValue2 > 0) {
                                pp.slideShift += paramL;
                                if (pp.slideShift >= pp.commandValue2) {
                                    pp.tone = pp.commandValue1;
                                    pp.slideShift = pp.commandValue1 = pp.commandValue2 = 0;
                                    cmd = -1;
                                }
                            }
                            else {
                                pp.slideShift -= paramL;
                                if (pp.slideShift <= pp.commandValue2) {
                                    pp.tone = pp.commandValue1;
                                    pp.slideShift = pp.commandValue1 = pp.commandValue2 = 0;
                                    cmd = -1;
                                }
                            }
                        }
                        break;
                    // vibrato
                    case 0x4:
                        if (pp.commandParam) {
                            if (paramH)
                                pp.commandPhase = (pp.commandPhase + paramH) & 0x3F;
                            else
                                pp.commandPhase = 0;
                            pp.slideShift = Player.vibratable[(paramL << 6) + pp.commandPhase];
                        }
                        else
                            pp.slideShift = 0;
                        break;
                    // tremolo
                    case 0x5:
                        if (pp.commandParam) {
                            if (paramH)
                                pp.commandPhase = (pp.commandPhase + paramH) & 0x3F;
                            else
                                pp.commandPhase = 0;
                            val = pp.commandValue2;
                            pp.commandValue2 = Player.vibratable[(paramL << 6) + pp.commandPhase];
                            val = -(pp.commandValue2 - val);
                            if (val == 0)
                                break;
                            if ((pp.attenuation.L + val) < 0)
                                pp.attenuation.L = 0;
                            else if ((pp.attenuation.L + val) > 15)
                                pp.attenuation.L = 15;
                            else
                                pp.attenuation.L += val;
                            if ((pp.attenuation.R + val) < 0)
                                pp.attenuation.R = 0;
                            else if ((pp.attenuation.R + val) > 15)
                                pp.attenuation.R = 15;
                            else
                                pp.attenuation.R += val;
                        }
                        break;
                    // delay ornament by ticks
                    case 0x6:
                        if (pp.commandParam) {
                            pp.commandPhase = pp.commandParam;
                            pp.commandParam = 0;
                        }
                        if (pp.commandPhase) {
                            height = 0;
                            pp.commandPhase--;
                        }
                        else {
                            pp.ornament_cursor = 0;
                            height = orndat_at_cursor();
                            cmd = -1;
                        }
                        break;
                    // ornament offset
                    case 0x7:
                        if (pp.commandParam > 0 && pp.commandParam < pp.ornament.end) {
                            height = 0;
                            pp.ornament_cursor = pp.commandParam;
                        }
                        cmd = -1;
                        break;
                    // sample offset
                    case 0x9:
                        if (pp.commandParam > 0 &&
                            (pp.sample.releasable || pp.commandParam < pp.sample.end)) {
                            pp.sample_cursor = pp.commandParam;
                            wVol = smpdat_at_cursor().volume;
                        }
                        cmd = -1;
                        break;
                    // volume slide
                    case 0xA:
                        if (!pp.commandPhase && pp.commandParam)
                            pp.commandPhase = paramH;
                        if (pp.commandPhase && !(--pp.commandPhase)) {
                            val = (pp.commandParam & 7)
                                * ((pp.commandParam & 8) ? -1 : 1);
                            if ((pp.attenuation.L + val) < 0)
                                pp.attenuation.L = 0;
                            else if ((pp.attenuation.L + val) > 15)
                                pp.attenuation.L = 15;
                            else
                                pp.attenuation.L += val;
                            if ((pp.attenuation.R + val) < 0)
                                pp.attenuation.R = 0;
                            else if ((pp.attenuation.R + val) > 15)
                                pp.attenuation.R = 15;
                            else
                                pp.attenuation.R += val;
                        }
                        break;
                    // break current pattern and loop from line
                    case 0xB:
                        // TODO!
                        break;
                    // special command
                    case 0xC:
                        if (!pp.commandParam)
                            pp.commandPhase = 0;
                        else if (paramH < 0xF) {
                            switch (pp.commandPhase) {
                                default:
                                    pp.commandPhase = 2;
                                    break;
                                case 2:
                                    height += paramH;
                                    pp.commandPhase--;
                                    break;
                                case 1:
                                    height += paramL;
                                    pp.commandPhase--;
                                    break;
                            }
                        }
                        else if ((paramL & 1)) {
                            pp.commandPhase = wVol.R;
                            wVol.R = wVol.L;
                            wVol.L = pp.commandPhase;
                            pp.commandPhase = 0;
                        }
                        break;
                    // soundchip control
                    case 0xE:
                        if (paramH == 0x2) {
                            pp.commandParam &= 7;
                            noise = pp.commandParam ^ 4;
                        }
                        else {
                            // mute base tone volume if bit3=0
                            if (!(pp.commandParam & 0x10))
                                pp.attenuation.byte = 0xFF;
                            pp.commandParam = ((pp.commandParam & 0x0E) << 1) | (pp.commandParam & 0x81);
                            pp.commandParam ^= 0x82;
                            ///~ SAA1099 DATA 18/19: Envelope generator 0/1
                            this.SAA1099.WriteAddressData(24 + chn3rd, pp.commandParam);
                            cmd = -1;
                        }
                        break;
                    default:
                        cmd = -1;
                        break;
                }
                // reset command if not needed anymore...
                if (cmd < 0) {
                    pp.command = 0;
                    pp.commandParam = 0;
                    pp.commandPhase = 0;
                }
                // apply attenuation...
                wVol.L = Math.max(0, (wVol.L - pp.attenuation.L));
                wVol.R = Math.max(0, (wVol.R - pp.attenuation.L));
                ///~ SAA1099 DATA 00-05: Amplitude controller 0-5
                this.SAA1099.WriteAddressData(chn, wVol.byte);
                // get tone from tracklist, calculate proper frequency to register...
                if (pp.tone) {
                    var tone = this.calculateTone(chn, pp.tone, height, (smpdat_at_cursor().shift + pp.slideShift));
                    ///~ SAA1099 DATA 08-0D: Tone generator 0-5
                    this.SAA1099.WriteAddressData(8 + chn, tone.cent);
                    oct = (chn & 1) ? (tone.oct << 4) : (oct | tone.oct);
                }
                else if ((chn & 1))
                    oct = 0;
                ///~ SAA1099 DATA 10-12: Octave for generators 0-5
                this.SAA1099.WriteAddressData(16 + chn2nd, oct);
                // set frequency enable bit...
                if (smpdat_at_cursor().enable_freq)
                    eFreq |= eMask;
                // set proper noise enable bit and value...
                if ((noise & 4)) {
                    eNoiz |= eMask;
                    eMask = (chn3rd << 2);
                    eChar = (eChar & (0xf0 >> eMask)) | ((noise & 3) << eMask);
                }
                // current sample cursor position handler...
                if (pp.sample_cursor + 1 >= pp.sample.end) {
                    var c = chn + 1;
                    // it had to be released?
                    if (pp.sample.releasable && pp.released) {
                        if (++pp.sample_cursor === 0)
                            this.stopChannel(c);
                    }
                    else if (pp.sample.loop === pp.sample.end) {
                        if ((this.mode & pMode.PM_SAMP_OR_LINE))
                            this.stopChannel(c);
                        else
                            pp.sample_cursor = pp.sample.end;
                    }
                    else if (this.mode === pMode.PM_LINE)
                        this.stopChannel(c);
                    else
                        pp.sample_cursor = pp.sample.loop;
                }
                else
                    pp.sample_cursor++;
                // current ornament cursor position handler...
                if (pp.ornament_cursor + 1 >= pp.ornament.end)
                    pp.ornament_cursor = pp.ornament.loop;
                else
                    pp.ornament_cursor++;
            }
            else {
                // playback in channel was disabled, reset proper params and registers...
                if ((chn & 1))
                    oct = 0;
                ///~ SAA1099 DATA 00-05: Amplitude controller 0-5
                this.SAA1099.WriteAddressData(chn, 0);
                ///~ SAA1099 DATA 08-0D: Tone generator 0-5
                this.SAA1099.WriteAddressData(8 + chn, 0);
                ///~ SAA1099 DATA 10-12: Octave for generators 0-5
                this.SAA1099.WriteAddressData(16 + chn2nd, oct);
                eFreq &= (0xff ^ eMask);
                eNoiz &= (0xff ^ eMask);
            }
        }
        ///~ SAA1099 DATA 14: Frequency enable bits
        this.SAA1099.WriteAddressData(20, eFreq);
        ///~ SAA1099 DATA 15: Noise enable bits
        this.SAA1099.WriteAddressData(21, eNoiz);
        ///~ SAA1099 DATA 16: Noise generator clock frequency select
        this.SAA1099.WriteAddressData(21, eChar);
        if ((this.mode & pMode.PM_SAMP_OR_LINE) && (eFreq | eNoiz) === 0) {
            ///~ SAA1099 DATA 1C: Master reset
            this.SAA1099.WriteAddressData(28, 0);
            this.mode = pMode.PM_NOT;
        }
        else {
            ///~ SAA1099 DATA 1C: Enable output
            this.SAA1099.WriteAddressData(28, 1);
            // is there time to next trackline?
            if ((this.mode & pMode.PM_LINE) && this.currentTick > 0)
                this.currentTick--;
            else if ((this.mode & pMode.PM_SONG_OR_POS))
                this.prepareLine();
        }
    };
    /**
     * Another very important part of Player, sibling to prepareFrame():
     * This method prepares parameters for next trackline in position...
     * @param next Move to the next trackline (default true);
     * @returns {boolean} success or failure
     */
    Player.prototype.prepareLine = function (next) {
        if (this.currentTick) {
            this.currentTick--;
            return true;
        }
        if (this.currentPosition >= this.position.length)
            return false;
        if (typeof next === 'undefined' || next) {
            this.currentLine++;
            this.changedLine = true;
        }
        var p = this.position[this.currentPosition], pc, pp, pt, pl;
        if (this.currentLine >= p.length) {
            if (this.mode === pMode.PM_SONG) {
                this.currentPosition++;
                if (this.currentPosition >= this.position.length) {
                    if (this.loopMode)
                        this.currentPosition = this.repeatPosition;
                    else {
                        this.currentLine--;
                        this.stopChannel(0);
                        return false;
                    }
                }
                this.currentLine = 0;
                this.changedPosition = true;
                p = this.position[this.currentPosition];
            }
            else if (this.loopMode)
                this.currentLine = 0;
            else {
                this.currentLine--;
                this.stopChannel(0);
                return false;
            }
            this.currentSpeed = p.speed;
        }
        for (var chn = 0; chn < 6; chn++) {
            pc = p.ch[chn];
            pt = this.pattern[((pc.pattern < this.pattern.length) ? pc.pattern : 0)];
            if (this.currentLine >= pt.end)
                continue;
            pp = this.playParams[chn];
            pp.globalPitch = p.ch[chn].pitch;
            pp.playing = true;
            pl = pt.data[this.currentLine];
            if (pl.cmd) {
                if (pl.cmd == 0xF &&
                    pl.cmd_data > 0) {
                    this.currentSpeed = pl.cmd_data;
                    if (this.currentSpeed >= 0x20) {
                        var sH = (this.currentSpeed & 0xF0) >> 4, sL = this.currentSpeed & 0x0F;
                        if (sL < 2 || sH == sL)
                            this.currentSpeed = sH;
                        else if ((this.currentLine & 1))
                            this.currentSpeed = sH | (sL << 4);
                    }
                    pp.command = pp.commandParam = pp.commandPhase = 0;
                }
                else {
                    pp.command = pl.cmd;
                    pp.commandParam = pl.cmd_data;
                    if (pl.cmd != pp.command)
                        pp.commandPhase = 0;
                }
            }
            else if (pl.tone || pl.smp)
                pp.command = pp.commandParam = pp.commandPhase = 0;
            if (pl.volume.byte && pp.command != 0x5 && pp.command != 0xA)
                pp.attenuation.byte = ~pl.volume.byte;
            if (pl.release) {
                if (pp.sample.releasable)
                    pp.released = true;
                else
                    this.clearPlayParams(chn);
                continue;
            }
            else if (pl.tone && pl.cmd == 0x3 && pl.cmd_data) {
                if (pp.commandValue1) {
                    pp.tone = pp.commandValue1;
                    pp.slideShift -= pp.commandValue2;
                }
                var base = this.calculateTone(chn, pp.tone, 0, pp.slideShift), target = this.calculateTone(chn, pl.tone, 0, 0), delta = target.word - base.word;
                if (delta === 0) {
                    pp.tone = pl.tone;
                    pp.commandValue1 = pp.commandValue2 = 0;
                    pp.command = pp.commandParam = pp.commandPhase = 0;
                }
                else {
                    pp.commandValue1 = pl.tone;
                    pp.commandValue2 = delta + pp.slideShift;
                    pp.commandPhase = (pp.commandParam & 0xF0) >> 4;
                }
            }
            else if (pl.tone) {
                pp.tone = pl.tone;
                pp.sample_cursor = 0;
                pp.ornament_cursor = 0;
                pp.slideShift = pp.commandValue1 = pp.commandValue2 = 0;
            }
            if (pl.smp) {
                pp.sample = this.sample[pl.smp];
                pp.sample_cursor = 0;
            }
            if (pl.orn) {
                pp.ornament = this.ornament[pl.orn];
                pp.ornament_cursor = 0;
            }
            else if (pl.orn_release) {
                pp.ornament = this.ornament[0];
                pp.ornament_cursor = 0;
                if (pp.command == 0x6 || pp.command == 0x7)
                    pp.command = pp.commandParam = pp.commandPhase = 0;
            }
        }
        if (this.currentSpeed > 0x20)
            this.currentTick = (this.currentLine & 1) ? (this.currentSpeed & 0x0F) : ((this.currentSpeed & 0xF0) >> 4);
        else
            this.currentTick = this.currentSpeed;
        this.currentTick--;
        return true;
    };
    //---------------------------------------------------------------------------------------
    /**
     * Play only current row in current position.
     * @returns {boolean}
     */
    Player.prototype.playLine = function () {
        if (this.mode === pMode.PM_LINE && this.currentTick > 0)
            return false;
        this.mode = pMode.PM_LINE;
        this.currentTick = 0;
        return this.prepareLine(false);
    };
    /**
     * Start playback of position or pattern.
     * @param fromStart Start playing from first position;
     * @param follow Follow the song, change next position when position reach the end;
     * @param resetLine Start playing from first row of the position;
     * @returns {boolean} success or failure
     */
    Player.prototype.playPosition = function (fromStart, follow, resetLine) {
        if (typeof fromStart === 'undefined' || fromStart)
            this.currentPosition = 0;
        if (typeof resetLine === 'undefined' || resetLine)
            this.currentLine = 0;
        if (typeof follow === 'undefined')
            follow = true;
        this.changedLine = true;
        this.changedPosition = true;
        if (this.currentPosition >= this.position.length)
            return false;
        this.stopChannel(0);
        this.mode = follow ? pMode.PM_SONG : pMode.PM_POSITION;
        this.currentSpeed = this.position[this.currentPosition].speed;
        return this.prepareLine(false);
    };
    /**
     * Play custom tone with particular sample/ornament in particular channel.
     * @param s Sample;
     * @param o Ornament;
     * @param tone Tone number;
     * @param chn (optional) Channel number or autodetect first "free" channel;
     * @returns {number} channel (1-6) where the sample has been played or 0 if error
     */
    Player.prototype.playSample = function (s, o, tone, chn) {
        var pp;
        if (!chn) {
            // first free channel detection
            for (chn = 0; chn < 6; chn++)
                if (!this.playParams[chn].playing)
                    break;
            if (chn === 6)
                return 0;
        }
        else if (--chn > 5)
            return 0;
        else if ((pp = this.playParams[chn]).playing)
            return 0;
        this.clearPlayParams(chn);
        pp.playing = true;
        pp.tone = ++tone;
        pp.sample = this.sample[s];
        pp.ornament = this.ornament[o];
        this.mode = pMode.PM_SAMPLE;
        return ++chn;
    };
    /**
     * Stops a playback of particular channel (1 <= chn <= 6) or stop playback (chn = 0).
     * Method reset appropriate channel's playParams.
     * @param chn Zero or channel number (1-6);
     */
    Player.prototype.stopChannel = function (chn) {
        if (chn < 0 || chn > 6)
            return;
        else if (chn === 0) {
            for (; chn < 6; chn++)
                this.clearPlayParams(chn);
            this.mode = pMode.PM_LINE;
            this.prepareFrame();
            this.currentTick = 0;
            this.changedLine = true;
            return;
        }
        this.clearPlayParams(--chn);
    };
    //---------------------------------------------------------------------------------------
    /**
     * Calculate pTone object with actual frequency from a lot of parameters of player.
     * It takes into account all nuances which can occur in tracklist...
     * @param chn Channel for global pattern tone shift;
     * @param toneValue Base tone on input;
     * @param toneShift Ornament tone shift;
     * @param slideShift Fine tune frequency shift;
     * @returns {pTone} object
     */
    Player.prototype.calculateTone = function (chn, toneValue, toneShift, slideShift) {
        var pitch = toneValue + this.playParams[chn].globalPitch + toneShift;
        // base tone overflowing in tones range
        while (pitch < 0)
            pitch += 96;
        while (pitch >= 96)
            pitch -= 96;
        // pick tone descriptor for base tone
        var tone = this.tones[pitch];
        // fix pitch of tone with fine tune frequency shift
        pitch = tone.word + slideShift;
        // freqency range overflowing in range
        while (pitch < 0)
            pitch += 2048;
        while (pitch >= 2048)
            pitch -= 2048;
        tone.word = pitch;
        return tone;
    };
    /**
     * Count how many times was particular pattern used in all positions.
     * @param patt Pattern number;
     * @returns {number} count
     */
    Player.prototype.countPatternUsage = function (patt) {
        // is pattern number in range?
        if (patt >= this.pattern.length)
            return 0;
        // proceed all positions/channels and count matches to 'c'
        var c = 0;
        for (var i = 0, l = this.position.length; i < l; i++)
            for (var j = 0; j < 6; j++)
                if (this.position[i].ch[j].pattern === patt)
                    c++;
        return c;
    };
    /**
     * Method that count "position frames" or number of interupts which takes every
     * line in tracklist. It's very important for time calculations!
     * @param pos If ommited, method calls itself recursively for all positions;
     */
    Player.prototype.countPositionFrames = function (pos) {
        var i, chn, line, speed, ptr, l = this.position.length;
        // if 'pos' wasn't specified, recursively calling itself for all positions
        if (typeof pos === 'undefined' || pos < 0)
            for (i = 0; i < l; i++)
                this.countPositionFrames(i);
        else if (pos < l) {
            speed = this.position[pos].speed;
            // proceed through all tracklines and all channel-patterns
            for (i = 0, line = 0; line < 96; line++) {
                for (chn = 0; chn < 6; chn++) {
                    ptr = this.pattern[this.position[pos].ch[chn].pattern].data[line];
                    // in every channel-pattern we are looking for speed changes
                    if (ptr.cmd === 0xF && ptr.cmd_data > 0) {
                        speed = ptr.cmd_data;
                        // is it swing tempo change? we need to check validity...
                        if (speed >= 0x20) {
                            var sH = (speed & 0xf0) >> 4, sL = (speed & 0x0f);
                            if (sL < 2 || sH === sL)
                                speed = sH;
                            else if ((line & 1))
                                speed = sH | (sL << 4);
                        }
                    }
                }
                // store count of interupts from start of position for every line
                this.position[pos].frames[line] = i;
                // increment number of interupts by speed value;
                // swing speed handled with nibble value of speed for even/odd trackline
                if (speed > 0x20)
                    i += (line & 1) ? (speed & 0x0f) : ((speed & 0xf0) >> 4);
                else
                    i += speed;
            }
            // and at last: total number of interupts for all 96 lines...
            this.position[pos].frames[line] = i;
        }
    };
    //---------------------------------------------------------------------------------------
    Player.vibratable = [
        0, 0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0,
        0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3,
        3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 0,
        0, 0, -1, -1, -1, -1, -2, -2, -2, -2, -2, -3, -3, -3, -3, -3,
        -3, -3, -3, -3, -3, -3, -2, -2, -2, -2, -2, -1, -1, -1, -1, 0,
        0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5,
        5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 2, 2, 1, 1, 0,
        0, 0, -1, -1, -2, -2, -3, -3, -4, -4, -4, -4, -5, -5, -5, -5,
        -5, -5, -5, -5, -5, -4, -4, -4, -4, -3, -3, -2, -2, -1, -1, 0,
        0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 7, 7, 7,
        7, 7, 7, 7, 6, 6, 6, 5, 5, 4, 4, 3, 3, 2, 1, 1,
        0, -1, -1, -2, -3, -3, -4, -4, -5, -5, -6, -6, -6, -7, -7, -7,
        -7, -7, -7, -7, -6, -6, -6, -5, -5, -4, -4, -3, -3, -2, -1, -1,
        0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 7, 8, 8, 9, 9, 9,
        9, 9, 9, 9, 8, 8, 7, 7, 6, 6, 5, 4, 3, 3, 2, 1,
        0, -1, -2, -3, -3, -4, -5, -6, -6, -7, -7, -8, -8, -9, -9, -9,
        -9, -9, -9, -9, -8, -8, -7, -7, -6, -6, -5, -4, -3, -3, -2, -1,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 10, 10, 11, 11, 11,
        11, 11, 11, 11, 10, 10, 9, 9, 8, 7, 6, 5, 4, 3, 2, 1,
        0, -1, -2, -3, -4, -5, -6, -7, -8, -9, -9, -10, -10, -11, -11, -11,
        -11, -11, -11, -11, -10, -10, -9, -9, -8, -7, -6, -5, -4, -3, -2, -1,
        0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 12, 12, 13, 13,
        13, 13, 13, 12, 12, 11, 11, 10, 9, 8, 7, 6, 5, 4, 3, 1,
        0, -1, -3, -4, -5, -6, -7, -8, -9, -10, -11, -11, -12, -12, -13, -13,
        -13, -13, -13, -12, -12, -11, -11, -10, -9, -8, -7, -6, -5, -4, -3, -1,
        0, 1, 3, 4, 6, 7, 8, 10, 11, 12, 12, 13, 14, 14, 15, 15,
        15, 15, 15, 14, 14, 13, 12, 12, 11, 10, 8, 7, 6, 4, 3, 1,
        0, -1, -3, -4, -6, -7, -8, -10, -11, -12, -12, -13, -14, -14, -15, -15,
        -15, -15, -15, -14, -14, -13, -12, -12, -11, -10, -8, -7, -6, -4, -3, -1,
        0, 2, 3, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 16, 17, 17,
        17, 17, 17, 16, 16, 15, 14, 13, 12, 11, 9, 8, 7, 5, 3, 2,
        0, -2, -3, -5, -7, -8, -9, -11, -12, -13, -14, -15, -16, -16, -17, -17,
        -17, -17, -17, -16, -16, -15, -14, -13, -12, -11, -9, -8, -7, -5, -3, -2,
        0, 2, 4, 6, 7, 9, 11, 12, 13, 15, 16, 17, 18, 18, 19, 19,
        19, 19, 19, 18, 18, 17, 16, 15, 13, 12, 11, 9, 7, 6, 4, 2,
        0, -2, -4, -6, -7, -9, -11, -12, -13, -15, -16, -17, -18, -18, -19, -19,
        -19, -19, -19, -18, -18, -17, -16, -15, -13, -12, -11, -9, -7, -6, -4, -2,
        0, 2, 4, 6, 8, 10, 12, 13, 15, 16, 17, 19, 19, 20, 21, 21,
        21, 21, 21, 20, 19, 19, 17, 16, 15, 13, 12, 10, 8, 6, 4, 2,
        0, -2, -4, -6, -8, -10, -12, -13, -15, -16, -17, -19, -19, -20, -21, -21,
        -21, -21, -21, -20, -19, -19, -17, -16, -15, -13, -12, -10, -8, -6, -4, -2,
        0, 2, 4, 7, 9, 11, 13, 15, 16, 18, 19, 20, 21, 22, 23, 23,
        23, 23, 23, 22, 21, 20, 19, 18, 16, 15, 13, 11, 9, 7, 4, 2,
        0, -2, -4, -7, -9, -11, -13, -15, -16, -18, -19, -20, -21, -22, -23, -23,
        -23, -23, -23, -22, -21, -20, -19, -18, -16, -15, -13, -11, -9, -7, -4, -2,
        0, 2, 5, 7, 10, 12, 14, 16, 18, 19, 21, 22, 23, 24, 25, 25,
        25, 25, 25, 24, 23, 22, 21, 19, 18, 16, 14, 12, 10, 7, 5, 2,
        0, -2, -5, -7, -10, -12, -14, -16, -18, -19, -21, -22, -23, -24, -25, -25,
        -25, -25, -25, -24, -23, -22, -21, -19, -18, -16, -14, -12, -10, -7, -5, -2,
        0, 3, 5, 8, 10, 13, 15, 17, 19, 21, 22, 24, 25, 26, 26, 27,
        27, 27, 26, 26, 25, 24, 22, 21, 19, 17, 15, 13, 10, 8, 5, 3,
        0, -3, -5, -8, -10, -13, -15, -17, -19, -21, -22, -24, -25, -26, -26, -27,
        -27, -27, -26, -26, -25, -24, -22, -21, -19, -17, -15, -13, -10, -8, -5, -3,
        0, 3, 6, 8, 11, 14, 16, 18, 21, 22, 24, 26, 27, 28, 28, 29,
        29, 29, 28, 28, 27, 26, 24, 22, 21, 18, 16, 14, 11, 8, 6, 3,
        0, -3, -6, -8, -11, -14, -16, -18, -21, -22, -24, -26, -27, -28, -28, -29,
        -29, -29, -28, -28, -27, -26, -24, -22, -21, -18, -16, -14, -11, -8, -6, -3
    ];
    return Player;
})();
//# sourceMappingURL=Player.js.map