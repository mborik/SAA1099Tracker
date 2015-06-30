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
	var defaultSamplerate = 44100;
	var streammsec = 20 * 4; // 50Hz * 4 buffers

	function getAdjustSamples(samplerate) {
		var samples, bits;
		samplerate = samplerate || defaultSamplerate;
		samples = streammsec / 1000 * samplerate;
		bits = Math.ceil(Math.log(samples) * Math.LOG2E);
		bits = (bits < 8) ? 8 : (bits > 14) ? 14 : bits;
		return 1 << bits;
	}

	function WebAPIAudioDriver() {
		var audioSource = null;
		var scriptProcessor = null;
		var audioContext = getCompatible(window, 'AudioContext', true);
		var audioEventHandler = function(event) {
			var buf = event.outputBuffer;
			audioSource.getAudio(buf.getChannelData(0), buf.getChannelData(1), buf.length);
		}

		this.sampleRate = audioContext.sampleRate;
		this.bufferSize = getAdjustSamples(audioContext.sampleRate);

		if (audioContext.createScriptProcessor !== null)
			scriptProcessor = audioContext.createScriptProcessor(this.bufferSize, 0, 2);
		else if (audioContext.createJavaScriptNode !== null)
			scriptProcessor = audioContext.createJavaScriptNode(this.bufferSize, 0, 2);
		scriptProcessor.onaudioprocess = null;

		this.bufferSize = scriptProcessor.bufferSize;
		this.setAudioSource = function(audioSrc) { audioSource = audioSrc; }

		this.play = function() {
			if (!(audioSource && audioSource.getAudio) || scriptProcessor.onaudioprocess)
				return;
			scriptProcessor.onaudioprocess = audioEventHandler;
			scriptProcessor.connect(audioContext.destination);
		}
		this.stop = function() {
			if (scriptProcessor.onaudioprocess)
				scriptProcessor.disconnect(audioContext.destination);
			scriptProcessor.onaudioprocess = null;
		}
	}

	function FallbackAudioDriver() {
		this.sampleRate = defaultSamplerate;
		this.bufferSize = getAdjustSamples(audioContext.sampleRate);

		var audioContext = new Audio();
		var buffer = new Float32Array(this.sampleRate >> 1); // 250ms
		var bufferIndex = buffer.length;
		var intervalId = null;
		var audioSource = null;

		audioContext.mozSetup(2, this.sampleRate);

		this.setAudioSource = function(audioSrc) { audioSource = audioSrc; }

		this.play = function() {
			if (intervalId == null) {
				var oldTime = new Date().getTime();
				intervalId = setInterval(function() {
					var newTime = new Date().getTime();
					if (newTime - oldTime < 250) {
						// Only write audio if the event came in roughly on time.
						// Prevents stuttering when the script is running in the background.
						if (bufferIndex < buffer.length) {
							// Finish writing current buffer.
							bufferIndex += audioContext.mozWriteAudio(buffer.subarray(bufferIndex));
						}
						while (bufferIndex >= buffer.length) {
							// Write as many full buffers as possible.
							var len = buffer.length >> 1;
							var lOut = buffer.subarray(0, len);
							var rOut = buffer.subarray(0, len);
							audioSource.getAudio(lOut, rOut, len);

							for (var bufIdx = 0, outIdx = 0; bufIdx < len; outIdx++) {
								buffer[bufIdx++] = lOut[outIdx];
								buffer[bufIdx++] = rOut[outIdx];
							}
							bufferIndex = audioContext.mozWriteAudio(buffer);
						}
					}
					oldTime = newTime;
				}, 125);
			}
		}

		this.stop = function() {
			if (intervalId != null) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}
	}

	if (getCompatible(window, 'AudioContext', false, false))
		return new WebAPIAudioDriver();
	else if (typeof(Audio) !== 'undefined')
		return new FallbackAudioDriver();
	else
		throw 'Error: No audio driver found (incompatible or obsolete browser)';
})();
