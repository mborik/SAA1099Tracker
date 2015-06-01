/*! SAAAmp: Tone/Noise mixing, Envelope application and amplification */
//---------------------------------------------------------------------------------------
/// <reference path="SAASound.ts" />
module SAASound {
//---------------------------------------------------------------------------------------
interface stereolevel {
	Left: number;
	Right: number;
	DWORD: number;
}
//---------------------------------------------------------------------------------------
export class SAAAmp {
	private leftleveltimes16: number;
	private leftleveltimes32: number;
	private leftlevela0x0e: number;
	private leftlevela0x0etimes2: number;
	private rightleveltimes16: number;
	private rightleveltimes32: number;
	private rightlevela0x0e: number;
	private rightlevela0x0etimes2: number;
	private monoleveltimes16: number;
	private monoleveltimes32: number;

	private nOutputIntermediate: number;
	private nMixMode: number;

	private pcConnectedToneGenerator: SAAFreq;
	private pcConnectedNoiseGenerator: SAANoise;
	private pcConnectedEnvGenerator: SAAEnv;

	private bUseEnvelope: boolean;
	private bMute: boolean;

	private last_level_byte: number;
	private level_unchanged: boolean;
	private last_leftlevel: number;
	private leftlevel_unchanged: boolean;
	private last_rightlevel: number;
	private rightlevel_unchanged: boolean;
	private cached_last_leftoutput: number;
	private cached_last_rightoutput: number;

	constructor(ToneGenerator: SAAFreq, NoiseGenerator: SAANoise, EnvGenerator: SAAEnv) {
		this.pcConnectedToneGenerator = ToneGenerator;
		this.pcConnectedNoiseGenerator = NoiseGenerator;
		this.pcConnectedEnvGenerator = EnvGenerator;
		this.bUseEnvelope = !!EnvGenerator;

		this.leftleveltimes32 = this.leftleveltimes16 = this.leftlevela0x0e = this.leftlevela0x0etimes2 = 0;
		this.rightleveltimes32 = this.rightleveltimes16 = this.rightlevela0x0e = this.rightlevela0x0etimes2 = 0;
		this.monoleveltimes32 = this.monoleveltimes16 = 0;

		this.bMute = true;
		this.nMixMode = 0;
		this.nOutputIntermediate = 0;

		this.last_level_byte = 0;
		this.level_unchanged = false;
		this.last_leftlevel = this.last_rightlevel = 0;
		this.leftlevel_unchanged = this.rightlevel_unchanged = false;
		this.cached_last_leftoutput = this.cached_last_rightoutput = 0;
	}

	/**
	 * Set amplitude, but if level unchanged since last call then do nothing.
	 * @param level_byte BYTE
	 */
	public SetAmpLevel(level_byte: number) {
		if ((level_byte &= 255) != this.last_level_byte) {
			this.last_level_byte = level_byte;
			this.leftlevela0x0e = level_byte & 0x0e;
			this.leftlevela0x0etimes2 = this.leftlevela0x0e << 1;
			this.leftleveltimes16 = (level_byte & 0x0f) << 4;
			this.leftleveltimes32 = this.leftleveltimes16 << 1;

			this.rightlevela0x0e = (level_byte >> 4) & 0x0e;
			this.rightlevela0x0etimes2 = this.rightlevela0x0e << 1;
			this.rightleveltimes16 = level_byte & 0xf0;
			this.rightleveltimes32 = this.rightleveltimes16 << 1;

			this.monoleveltimes16 = this.leftleveltimes16 + this.rightleveltimes16;
			this.monoleveltimes32 = this.leftleveltimes32 + this.rightleveltimes32;
		}
	}

	public SetToneMixer(bEnabled: number) {
		if (!bEnabled)
			this.nMixMode &= ~(0x01);
		else
			this.nMixMode |= 0x01;
	}

	public SetNoiseMixer(bEnabled: number) {
		if (!bEnabled)
			this.nMixMode &= ~(0x02);
		else
			this.nMixMode |= 0x02;
	}

	public Tick() {
		switch (this.nMixMode) {
			case 0:
				// no tones or noise for this channel
				this.pcConnectedToneGenerator.Tick();
				this.nOutputIntermediate = 0;
				break;
			case 1:
				// tones only for this channel
				// NOTE: ConnectedToneGenerator returns either 0 or 2
				this.nOutputIntermediate = this.pcConnectedToneGenerator.Tick();
				break;
			case 2:
				// noise only for this channel
				// NOTE: ConnectedNoiseFunction returns either 0 or 1 using .Level()
				// and either 0 or 2 when using .LevelTimesTwo();
				this.pcConnectedToneGenerator.Tick();
				this.nOutputIntermediate = this.pcConnectedNoiseGenerator.Level();
				break;
			case 3:
				// tones+noise for this channel ... mixing algorithm:
				this.nOutputIntermediate = this.pcConnectedToneGenerator.Tick();
				if (this.nOutputIntermediate === 2 && !!this.pcConnectedNoiseGenerator.Level())
					this.nOutputIntermediate = 1;
				break;
		}
	}

	public TickAndOutputStereo(): stereolevel {
		this.Tick();

		var retval: stereolevel = { Left: 0, Right: 0, DWORD: 0 };
		var out: number = this.nOutputIntermediate;

		if (this.bMute)
			return retval;

		// now calculate the returned amplitude for this sample:
		if (this.bUseEnvelope && this.pcConnectedEnvGenerator.IsActive()) {
			if (out === 0) {
				retval.Left = this.pcConnectedEnvGenerator.LeftLevel() * this.leftlevela0x0etimes2;
				retval.Right = this.pcConnectedEnvGenerator.RightLevel() * this.rightlevela0x0etimes2;
			}
			else if (out === 1) {
				retval.Left = this.pcConnectedEnvGenerator.LeftLevel() * this.leftlevela0x0e;
				retval.Right = this.pcConnectedEnvGenerator.RightLevel() * this.rightlevela0x0e;
			}
		}
		else {
			if (out === 1) {
				retval.Left = this.leftleveltimes16;
				retval.Right = this.rightleveltimes16;
			}
			else if (out === 2) {
				retval.Left = this.leftleveltimes32;
				retval.Right = this.rightleveltimes32;
			}
		}

		retval.DWORD = (retval.Right << 16) | retval.Left;
		return retval;
	}
}
//---------------------------------------------------------------------------------------
}
//---------------------------------------------------------------------------------------
