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
//---------------------------------------------------------------------------------------
module SAASound {
//---------------------------------------------------------------------------------------
export var nSampleRate: number;
export var nBufferSize: number;
//---------------------------------------------------------------------------------------
	var nCurrentReg: number = 0;
	var uParam: number = 0;
	var uParamRate: number = 0;

	var bOutputEnabled: boolean = false;
	var bAmpMuted: boolean[] = [ false, false, false, false, false, false ];

	var Env: SAAEnv[] = [ new SAAEnv, new SAAEnv ];

	var Noise: SAANoise[] = [
		new SAANoise(0x14af5209),
		new SAANoise(0x76a9b11e)
	];

	var Osc: SAAFreq[] = [
		new SAAFreq(Noise[0], undefined),
		new SAAFreq(undefined, Env[0]),
		new SAAFreq(undefined, undefined),
		new SAAFreq(Noise[1], undefined),
		new SAAFreq(undefined, Env[0]),
		new SAAFreq(undefined, undefined)
	];

	var Amp: SAAAmp[] = [
		new SAAAmp(Osc[0], Noise[0], undefined),
		new SAAAmp(Osc[1], Noise[0], undefined),
		new SAAAmp(Osc[2], Noise[0], Env[0]),
		new SAAAmp(Osc[3], Noise[1], undefined),
		new SAAAmp(Osc[4], Noise[1], undefined),
		new SAAAmp(Osc[5], Noise[1], Env[1])
	];

	export function Clear() {
		// TODO
	}

//---------------------------------------------------------------------------------------
}
//---------------------------------------------------------------------------------------
