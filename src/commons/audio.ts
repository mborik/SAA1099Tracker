/**
 * SAA1099Tracker: Audio driver and sound output.
 * Copyright (c) 2015-2022 Martin Borik <martin@borik.net>
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

import { devLog } from './dev';


interface AudioDriverSource {
	getAudio: (leftBuf: Float32Array, rightBuf: Float32Array, length: number) => void;
}

interface AudioDriverConfig {
	audioSource: AudioDriverSource;
	buffers?: number;
	interrupt?: number;
}

/**
 * Audio driver and sound output.
 */
class AudioDriver {
  private _bufferCount: number = 4;
  private _bufferSize: number = 4096;
  private _interruptFrequency: number = 50;
  private _gainValue: number = 1.0;
  private _sampleRate: number;

  private _audioSource: AudioDriverSource | null = null;
  private _audioContext: AudioContext;
  private _gainNode: GainNode;
  private _scriptProcessor: ScriptProcessorNode | null = null;


  get sampleRate(): number {
    return this._sampleRate;
  }
  set volume(vol: number) {
    this._gainValue = Math.min(Math.max(0, vol), 10);

    if (this._gainNode?.gain) {
      this._gainNode.gain.value = this._gainValue;
    }
  }

  constructor() {
    devLog('Audio', 'Creating new AudioDriver...');
    this._sampleRate = (new AudioContext).sampleRate; // this will outputs a browser security warning but we don't care!
    devLog('Audio', `Hardware default samplerate is ${this._sampleRate}Hz...`);
  }

  getAdjustedSamples(samplerate: number, buffers: number, interrupt: number) {
    const intms = 1000 / interrupt;
    const streammsec = intms * buffers;
    const samples = streammsec / 1000 * samplerate;
    const bits = Math.ceil(Math.log(samples) * Math.LOG2E);

    return 1 << Math.min(Math.max(bits, 8), 14);
  }

  init(config: AudioDriverConfig) {
    if (this._scriptProcessor) {
      devLog('Audio', 'Freeing script processor...');
      this.stop();
    }

    if (config.audioSource && config.audioSource !== this._audioSource) {
      devLog('Audio', 'New audio generator source is %o...', config.audioSource);
      this._audioSource = config.audioSource;
    }

    if (config.buffers) {
      this._bufferCount = config.buffers;
    }
    if (config.interrupt) {
      this._interruptFrequency = config.interrupt;
    }

    this._bufferSize = this.getAdjustedSamples(
      this._sampleRate,
      this._bufferCount,
      this._interruptFrequency
    );

    devLog('Audio', 'Initializing new script processor with examined buffer size: %d...\n\t\t%c[ samplerate: %dHz, buffers: %d, interrupt frequency: %dHz ]',
      this._bufferSize, 'color:gray', this._sampleRate, this._bufferCount, this._interruptFrequency);
  }

  play() {
    if (!(this._audioContext && this._scriptProcessor)) {
      this._audioContext = new AudioContext({ latencyHint: 'interactive' });
      this._scriptProcessor = this._audioContext.createScriptProcessor(this._bufferSize, 0, 2);

      devLog('Audio', `Successfully initialized with driver's hardware buffer size ${this._scriptProcessor.bufferSize || '???'}...`);

      this._scriptProcessor.onaudioprocess = this._audioEventHandler.bind(this);
      this._gainNode = this._audioContext.createGain();

      this._scriptProcessor.connect(this._gainNode);
      this._gainNode.connect(this._audioContext.destination);

      this._gainNode.gain.value = this._gainValue;
    }

    this._audioContext.resume();
  }

  stop() {
    if (!this._audioContext) {
      return;
    }

    this._audioContext.suspend();

    if (this._scriptProcessor?.onaudioprocess) {
      this._gainNode.disconnect(this._audioContext.destination);
      this._scriptProcessor.disconnect(this._gainNode);
      this._scriptProcessor.onaudioprocess = null;
    }

    this._audioContext.close();

    this._gainNode = null;
    this._scriptProcessor = null;
    this._audioContext = null;
  }


  private _audioEventHandler(event: AudioProcessingEvent) {
    const buf = event.outputBuffer;

    this._audioSource?.getAudio(
      buf.getChannelData(0),
      buf.getChannelData(1),
      buf.length
    );
  }
}
//---------------------------------------------------------------------------------------
export default ((window as any).AudioDriver = new AudioDriver);
