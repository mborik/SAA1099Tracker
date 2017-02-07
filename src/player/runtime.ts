/*
 * Player: Runtime playback parameters class a interface definition.
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
//---------------------------------------------------------------------------------------
/// <reference path='../SAASound.d.ts' />
/// <reference path='globals.ts' />
/// <reference path='sample.ts' />
/// <reference path='ornament.ts' />
//---------------------------------------------------------------------------------------
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
//---------------------------------------------------------------------------------------
class pRuntime extends SAASoundRegData {
	params: pParams[];
	clearPlayParams: (chn: number) => void;

	constructor(player: Player) {
		super();

		this.params = [];
		this.clearPlayParams = (chn: number) => {
			if (chn < 0 || chn >= 6) {
				return;
			}

			if (this.params[chn]) {
				delete this.params[chn].attenuation;
				this.params[chn].sample = null;
				this.params[chn].ornament = null;
				this.params[chn] = null;
			}

			this.params[chn] = {
				tone: 0,
				playing: false,
				sample: player.sample[0],
				ornament: player.ornament[0],
				sample_cursor: 0,
				ornament_cursor: 0,
				attenuation: new pVolume,
				slideShift: 0,
				globalPitch: 0,
				released: false,
				command: 0,
				commandParam: 0,
				commandPhase: 0,
				commandValue1: 0,
				commandValue2: 0
			};
		};

		for (let chn: number = 0; chn < 6; chn++) {
			this.clearPlayParams(chn);
		}
	}

	public setRegData(reg: number, data: number) {
		let index = 'R' + (<any> reg).toHex(2).toUpperCase();
		this.regs[index] = data;
	}

	public replace(data: pRuntime) {
		Object.keys(data.regs).forEach(idx => this.regs[idx] = data.regs[idx]);

		for (let i = 0; i < 6; i++) {
			let dst: pParams = this.params[i];
			let src: pParams = data.params[i];

			Object.keys(src).forEach(idx => {
				if (dst[idx] instanceof pVolume) {
					dst[idx].L = src[idx].L;
					dst[idx].R = src[idx].R;
				}
				else {
					dst[idx] = src[idx];
				}
			});
		}
	}

	public destroy() {
		delete this.regs;
		for (let i = 0; i < 6; i++) {
			delete this.params[i].attenuation;
			this.params[i].sample = null;
			this.params[i].ornament = null;
			this.params[i] = null;
		}
		delete this.params;
		delete this.muted;
	}
}
//---------------------------------------------------------------------------------------
