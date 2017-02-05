/*
 * Audio driver and sound output.
 */
//---------------------------------------------------------------------------------------
/// <reference path="../Commons.d.ts" />
//---------------------------------------------------------------------------------------
declare interface AudioContext {
	resume: () => void;
	suspend: () => void;
	createJavaScriptNode: (bufferSize?: number, numberOfInputChannels?: number, numberOfOutputChannels?: number) => ScriptProcessorNode;
};
interface Window { AudioDriver: any; }
//---------------------------------------------------------------------------------------
window.AudioDriver = (() => {
	class WebAudioAPIDriver {
		public getAdjustedSamples(samplerate: number, buffers: number, interrupt: number) {
			let intms = 1000 / interrupt;
			let streammsec = intms * buffers;
			let samples = streammsec / 1000 * samplerate;
			let bits = Math.ceil(Math.log(samples) * Math.LOG2E);

			return 1 << Math.min(Math.max(bits, 8), 14);
		}

		private _audioEventHandler(event: AudioProcessingEvent) {
			let buf = event.outputBuffer;
			this._audioSource.getAudio(
				buf.getChannelData(0),
				buf.getChannelData(1),
				buf.length
			);
		}

		private _interruptFrequency: number = 50;
		private _bufferCount: number = 4;
		private _bufferSize: number = 4096;
		private _sampleRate: number;

		private _newAPICaps: boolean;
		private _audioSource: any = null;
		private _audioContext: AudioContext;
		private _gainNode: GainNode;
		private _scriptProcessor: ScriptProcessorNode = null;

		public setAudioSource(audioSrc: any) { this._audioSource = audioSrc; };
		get sampleRate(): number { return this._sampleRate; }
		set volume(vol: number) {
			vol = Math.min(Math.max(0, vol), 10);
			this._gainNode.gain.value = vol;
		}

		constructor() {
			console.log('Audio', 'Creating new WebAudioAPIDriver...');

			this._audioContext = <AudioContext> getCompatible(window, 'AudioContext', true);
			this._newAPICaps = !!(this._audioContext.resume && this._audioContext.suspend);

			this._sampleRate = this._audioContext.sampleRate;
			console.log('Audio', 'Hardware default samplerate is %dHz...', this._sampleRate);

			this._gainNode = this._audioContext.createGain();
		}

		play() {
			if (!(this._audioSource && this._audioSource.getAudio) || this._scriptProcessor.onaudioprocess) {
				return;
			}

			this._scriptProcessor.onaudioprocess = this._audioEventHandler.bind(this);
			this._scriptProcessor.connect(this._gainNode);
			this._gainNode.connect(this._audioContext.destination);

			if (this._newAPICaps) {
				this._audioContext.resume();
			}
		}

		stop() {
			if (this._newAPICaps) {
				this._audioContext.suspend();
			}

			if (this._scriptProcessor.onaudioprocess) {
				this._gainNode.disconnect(this._audioContext.destination);
				this._scriptProcessor.disconnect(this._gainNode);
			}

			this._scriptProcessor.onaudioprocess = null;
		}

		init(audioSrc: any, buffers: number, int: number) {
			if (this._scriptProcessor) {
				console.log('Audio', 'Freeing script processor...');

				this.stop();
				this._scriptProcessor = null;
			}

			if (audioSrc && audioSrc !== this._audioSource) {
				console.log('Audio', 'New audio generator source is %o...', audioSrc);
				this.setAudioSource(audioSrc);
			}

			if (buffers) {
				this._bufferCount = buffers;
			}
			if (int) {
				this._interruptFrequency = int;
			}

			this._bufferSize = this.getAdjustedSamples(
				this._sampleRate,
				this._bufferCount,
				this._interruptFrequency
			);

			console.log('Audio', 'Initializing new script processor with examined buffer size: %d...\n\t\t%c[ samplerate: %dHz, buffers: %d, interrupt frequency: %dHz ]',
				this._bufferSize, 'color:gray', this._sampleRate, this._bufferCount, this._interruptFrequency);

			if (this._audioContext.createScriptProcessor !== null) {
				this._scriptProcessor = this._audioContext.createScriptProcessor(this._bufferSize, 0, 2);
			}
			else if (this._audioContext.createJavaScriptNode !== null) {
				this._scriptProcessor = this._audioContext.createJavaScriptNode(this._bufferSize, 0, 2);
			}
			this._scriptProcessor.onaudioprocess = null;

			this._bufferSize = this._scriptProcessor.bufferSize;
			console.log('Audio', 'Successfully initialized with proper buffer size %d...', this._bufferSize);
		}
	}

	try {
		return new WebAudioAPIDriver;
	}
	catch (e) {
		throw 'Error: WebAudioAPI not found (incompatible or obsolete browser)';
	}
})();
//---------------------------------------------------------------------------------------
