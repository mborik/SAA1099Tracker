/*!
 * Audio: Audio driver and sound output.
 * Copyright (c) 2015 Martin Borik <mborik@users.sourceforge.net>
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
var AudioDriver = (function () {
	function getAdjustSamples(samplerate, buffers, interrupt) {
		var intms = 1000 / interrupt,
			streammsec = intms * buffers,
			samples = streammsec / 1000 * samplerate,
			bits = Math.ceil(Math.log(samples) * Math.LOG2E);
		return 1 << Math.min(Math.max(bits, 8), 14);
	}

	function WebAudioAPIDriver() {
		console.log('Creating new WebAudioAPIDriver...');

		var audioDriver = this,
			audioSource = null,
			scriptProcessor = null,
			audioContext = getCompatible(window, 'AudioContext', true);
		var audioEventHandler = function (event) {
			var buf = event.outputBuffer;
			audioSource.getAudio(buf.getChannelData(0), buf.getChannelData(1), buf.length);
		};

		this.interruptFrequency = 50;
		this.bufferCount = 4;
		this.bufferSize = 4096;
		this.sampleRate = audioContext.sampleRate;

		this.setAudioSource = function (audioSrc) { audioSource = audioSrc };

		this.play = function() {
			if (!(audioSource && audioSource.getAudio) || scriptProcessor.onaudioprocess)
				return;
			scriptProcessor.onaudioprocess = audioEventHandler;
			scriptProcessor.connect(audioContext.destination);
			audioContext.resume();
		};

		this.stop = function() {
			audioContext.suspend();
			if (scriptProcessor.onaudioprocess)
				scriptProcessor.disconnect(audioContext.destination);
			scriptProcessor.onaudioprocess = null;
		};

		this.init = function (audioSrc, buffers, int) {
			if (scriptProcessor) {
				console.log('Freeing script processor...');

				audioDriver.stop();
				scriptProcessor = null;
			}

			if (audioSrc) {
				console.log('New audio generator source is "%s"...', audioSrc.constructor.name);
				audioDriver.setAudioSource(audioSrc);
			}

			if (buffers)
				audioDriver.bufferCount = buffers;
			if (int)
				audioDriver.interruptFrequency = int;

			audioDriver.bufferSize = getAdjustSamples(
				audioDriver.sampleRate,
				audioDriver.bufferCount,
				audioDriver.interruptFrequency
			);

			console.log('Initializing new script processor with examined buffer size: %d...\n\t[ samplerate: %d, buffers: %d, interrupt frequency: %d ]',
				audioDriver.bufferSize, audioDriver.sampleRate, audioDriver.bufferCount, audioDriver.interruptFrequency);

			if (audioContext.createScriptProcessor !== null)
				scriptProcessor = audioContext.createScriptProcessor(audioDriver.bufferSize, 0, 2);
			else if (audioContext.createJavaScriptNode !== null)
				scriptProcessor = audioContext.createJavaScriptNode(audioDriver.bufferSize, 0, 2);
			scriptProcessor.onaudioprocess = null;

			audioDriver.bufferSize = scriptProcessor.bufferSize;
			console.log('Successfully initialized with proper buffer size %d...', audioDriver.bufferSize);
		};

		console.log('Hardware default samplerate is %d...', audioContext.sampleRate);
		return this;
	}

	try {
		return new WebAudioAPIDriver();
	} catch(e) {
		throw 'Error: WebAudioAPI not found (incompatible or obsolete browser)';
	}
})();
