declare class WebAudioAPIDriver {
	interruptFrequency: number;
	bufferCount: number;
	bufferSize: number;
	sampleRate: number;

	init(audioSrc: any, buffers?: number, int?: number): void;
	play(): void;
	stop(): void;
}
declare var AudioDriver: WebAudioAPIDriver;
