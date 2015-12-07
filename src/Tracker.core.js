/** Tracker.core submodule */
/* global browser, STMFile, AudioDriver, SAASound, SyncTimer, Player, Tracklist, SmpOrnEditor */
//---------------------------------------------------------------------------------------
var Tracker = (function() {
	function Tracker(ver) {
		console.log('Tracker', 'Inizializing SAA1099Tracker v%s...', ver);

		this.version = ver;

		this.loaded = false;
		this.activeTab = null;

		this.modePlay = false;
		this.modeEdit = false;
		this.modeEditChannel = 0;
		this.modeEditColumn = 0;
		this.workingPattern = 0;
		this.workingSample = 1;
		this.workingSampleTone = 37;
		this.workingOrnament = 1;
		this.workingOrnTestSample = 1;

		this.ctrlOctave = 2;
		this.ctrlSample = 0;
		this.ctrlOrnament = 0;
		this.ctrlRowStep = 0;

		this.songTitle = '';
		this.songAuthor = '';

		this.globalKeyState = {
			inDialog: false,
			modsHandled: false,
			lastPlayMode: 0,
			length: 0
		};

		this.settings = {
			tracklistAutosize: true,
			tracklistLines: 17,
			tracklistLineHeight: 9,
			hexTracklines: true,
			hexSampleFreq: false,
			audioInterrupt: 50,
			audioBuffers: 0
		};

		this.pixelfont  = { obj: null, ctx: null };
		this.tracklist  = new Tracklist(this);
		this.smpornedit = new SmpOrnEditor(this);


	// constructor {
		if (AudioDriver) {
			this.player = new Player(new SAASound(AudioDriver.sampleRate));
			AudioDriver.init(this.player);
		}
		else
			$('#overlay>span').html(
				browser.isIE ?
					"don't be evil,<br>stop using IE" :
					"WebAudio<br>not supported"
			);

		if (this.player) {
			this.file = new STMFile(this);

			this.populateGUI();
			this.initializeGUI();
		}
	// }
	}

	Tracker.prototype.baseTimer = function() {
		if (this.modePlay && this.player.changedLine) {
			if (this.player.changedPosition)
				this.updatePanelPosition();
			this.updatePanelInfo();
			this.updateTracklist();

			this.player.changedPosition = false;
			this.player.changedLine = false;
		}
	};

	return Tracker;
})();
//---------------------------------------------------------------------------------------
