/*
 * Audio driver and sound output.
 */
declare interface AudioContext {
	resume: () => void;
	suspend: () => void;
	createJavaScriptNode: (bufferSize?: number, numberOfInputChannels?: number, numberOfOutputChannels?: number) => ScriptProcessorNode;
};
interface Window { AudioDriver: any; }
window.AudioDriver = (() => {
	function getAdjustSamples(samplerate: number, buffers: number, interrupt: number) {
		var intms = 1000 / interrupt,
			streammsec = intms * buffers,
			samples = streammsec / 1000 * samplerate,
			bits = Math.ceil(Math.log(samples) * Math.LOG2E);
		return 1 << Math.min(Math.max(bits, 8), 14);
	}

	class WebAudioAPIDriver {
		private audioSource: any = null;
		setAudioSource(audioSrc: any) { this.audioSource = audioSrc };

		audioEventHandler(event: AudioProcessingEvent) {
			let buf = event.outputBuffer;
			this.audioSource.getAudio(
				buf.getChannelData(0),
				buf.getChannelData(1),
				buf.length
			);
		}

		interruptFrequency: number = 50;
		bufferCount: number = 4;
		bufferSize: number = 4096;
		sampleRate: number;
		newAPICaps: boolean;

		audioContext: AudioContext;
		scriptProcessor: ScriptProcessorNode = null;

		constructor() {
			console.log('Audio', 'Creating new WebAudioAPIDriver...');

			this.audioContext = <AudioContext> getCompatible(window, 'AudioContext', true);
			this.newAPICaps = !!(this.audioContext.resume && this.audioContext.suspend);

			this.sampleRate = this.audioContext.sampleRate;
			console.log('Audio', 'Hardware default samplerate is %dHz...', this.sampleRate);
		}

		play() {
			if (!(this.audioSource && this.audioSource.getAudio) || this.scriptProcessor.onaudioprocess) {
				return;
			}

			this.scriptProcessor.onaudioprocess = this.audioEventHandler.bind(this);
			this.scriptProcessor.connect(this.audioContext.destination);

			if (this.newAPICaps) {
				this.audioContext.resume();
			}
		}

		stop() {
			if (this.newAPICaps) {
				this.audioContext.suspend();
			}

			if (this.scriptProcessor.onaudioprocess) {
				this.scriptProcessor.disconnect(this.audioContext.destination);
			}

			this.scriptProcessor.onaudioprocess = null;
		}

		init(audioSrc: any, buffers: number, int: number) {
			if (this.scriptProcessor) {
				console.log('Audio', 'Freeing script processor...');

				this.stop();
				this.scriptProcessor = null;
			}

			if (audioSrc) {
				console.log('Audio', 'New audio generator source is %o...', audioSrc);
				this.setAudioSource(audioSrc);
			}

			if (buffers) {
				this.bufferCount = buffers;
			}
			if (int) {
				this.interruptFrequency = int;
			}

			this.bufferSize = getAdjustSamples(
				this.sampleRate,
				this.bufferCount,
				this.interruptFrequency
			);

			console.log('Audio', 'Initializing new script processor with examined buffer size: %d...\n\t\t%c[ samplerate: %dHz, buffers: %d, interrupt frequency: %dHz ]',
				this.bufferSize, 'color:gray', this.sampleRate, this.bufferCount, this.interruptFrequency);

			if (this.audioContext.createScriptProcessor !== null) {
				this.scriptProcessor = this.audioContext.createScriptProcessor(this.bufferSize, 0, 2);
			}
			else if (this.audioContext.createJavaScriptNode !== null) {
				this.scriptProcessor = this.audioContext.createJavaScriptNode(this.bufferSize, 0, 2);
			}
			this.scriptProcessor.onaudioprocess = null;

			this.bufferSize = this.scriptProcessor.bufferSize;
			console.log('Audio', 'Successfully initialized with proper buffer size %d...', this.bufferSize);
		}
	}

	try {
		return new WebAudioAPIDriver;
	}
	catch(e) {
		throw 'Error: WebAudioAPI not found (incompatible or obsolete browser)';
	}
})();
//---------------------------------------------------------------------------------------
