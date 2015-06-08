var AudioDriver = (function () {
	function WebAPIAudioDriver() {
		var audioSource = null;
		var scriptProcessor = null;
		var audioContext = new (AudioContext || webkitAudioContext);
		var audioEventHandler = function(event) {
			var buf = event.outputBuffer;
			audioSource.getAudio(buf.getChannelData(0), buf.getChannelData(1), buf.length);
		}

		if (audioContext.createScriptProcessor != null)
			scriptProcessor = audioContext.createScriptProcessor(0, 0, 2);
		else if (audioContext.createJavaScriptNode != null)
			scriptProcessor = audioContext.createJavaScriptNode(0, 0, 2);

		this.sampleRate = audioContext.sampleRate;
		this.bufferSize = scriptProcessor.bufferSize;

		this.setAudioSource = function(audioSrc) { audioSource = audioSrc; }

		this.play = function() {
			if (!(audioSource && audioSource.getAudio))
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

	function FFAudioDriver() {
		this.sampleRate = 44100; // seems to sound best in Firefox
		this.bufferSize = 4096;

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

	if (AudioContext || webkitAudioContext)
		return new WebAPIAudioDriver();
	else if (typeof(Audio) !== 'undefined')
		return new FFAudioDriver();
	else
		throw 'Error: No audio driver found (incompatible or obsolete browser)';
})();
