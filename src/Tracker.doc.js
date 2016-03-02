/** Tracker.doc submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.doc = {
	// ajax cache for text documentations:
	txtCache: {},

	i18n: {
		'app.msg.unsaved': 'All unsaved changes in SAA1099Tracker will be lost.',
		'dialog.file.new.title': 'Create new file...',
		'dialog.file.new.msg': 'Do you really want to clear all song data and lost all of your changes?',
		'dialog.file.open.title': 'Open file...',
		'dialog.file.open.msg': 'You could lost all of your changes! Do you really want to continue?',
		'dialog.file.remove.title': 'Remove file...',
		'dialog.file.remove.msg': 'Do you really want to remove this file from storage?',
		'dialog.pattern.delete.title': 'Delete pattern...',
		'dialog.pattern.delete.msg.used': 'This pattern is used in some positions!\nAre you sure you want to delete it?',
		'dialog.pattern.delete.msg.notlast': 'This is not the last pattern in a row and there is necessary to renumber all of the next patterns in the positions!\n\nPlease, take a note that all of your undo history will be lost because of pattern/position data inconsistency that occurs with this irreversible operation.\n\nDo you really want to continue?',
		'dialog.pattern.delete.msg.sure': 'Are you sure you want to delete this pattern?',
		'dialog.pattern.clean.title': 'Clean pattern...',
		'dialog.pattern.clean.msg': 'Are you sure you want to clean a content of this pattern?',
		'dialog.position.delete.title': 'Delete position...',
		'dialog.position.delete.msg': 'Are you sure you want to delete this position?',
		'dialog.sample.clear.title': 'Clear sample...',
		'dialog.sample.clear.msg': 'Which sample data do you want to clear?',
		'dialog.sample.clear.options': [ 'All', 'Amplitude', 'Noise', 'Pitch-shift', 'Cancel' ],
		'dialog.ornament.clear.title': 'Clear ornament...',
		'dialog.ornament.clear.msg': 'Are you sure you want to clear a content of this ornament?',
		'app.error.ie': 'don\'t be evil,\bstop using IE',
		'app.error.webaudio': 'WebAudio\bnot supported'
	},

	tooltip: {
		'miFileNew'       : 'New',
		'miFileOpen'      : 'Open [Ctrl+O]',
		'miFileSave'      : 'Save [Ctrl+S]',
		'miFileSaveAs'    : 'Save as...',
		'miEditCut'       : 'Cut [Ctrl+X]',
		'miEditCopy'      : 'Copy [Ctrl+C]',
		'miEditPaste'     : 'Paste [Ctrl+V]',
		'miEditClear'     : 'Clear [Ctrl+D]',
		'miEditUndo'      : 'Undo [Ctrl+Z]',
		'miEditRedo'      : 'Redo [Ctrl+Y | Ctrl+Shift+Z]',
		'miStop'          : 'Stop [Esc]',
		'miSongPlay'      : 'Play song [F5]',
		'miSongPlayStart' : 'Play song from start [F6]',
		'miPosPlay'       : 'Play position [F7]',
		'miPosPlayStart'  : 'Play position from start [F8]',
		'miToggleLoop'    : 'Toggle repeat [F11]',
		'miManager'       : 'Track manager [F9]',
		'miPreferences'   : 'Preferences [F10]',
		'miSpecialLogin'  : 'Login to SAA-1099\ncloud for musicians',
		'scOctave'        : 'Base octave [Ctrl+1...Ctrl+8]',
		'scAutoSmp'       : 'Auto-typed sample',
		'scAutoOrn'       : 'Auto-typed ornament',
		'scRowStep'       : 'Row-step in edit mode [- Ctrl+9 | Ctrl+0 +]',
		'btPatternCreate' : 'Create a new pattern\nin length of current',
		'btPatternDelete' : 'Delete the current pattern\n(and renumber others if it isn\'t last one)',
		'btPatternClean'  : 'Clear content of current pattern',
		'btPatternInfo'   : 'View summary dialog of patterns',
		'scPattern'       : 'Current pattern number',
		'scPatternLen'    : 'Current pattern length',
		'txPatternUsed'   : 'How many times is the pattern used',
		'txPatternTotal'  : 'Total number of patterns',
		'btPosCreate'     : 'Create an empty position\nat the end of song',
		'btPosInsert'     : 'Create a copy of current position\nand insert before it',
		'btPosDelete'     : 'Delete the current position',
		'btPosMoveUp'     : 'Move the current position\nbefore the previous',
		'btPosMoveDown'   : 'Move the current position\nafter the next one',
		'scPosCurrent'    : 'Actual position to play or edit [- Ctrl+Shift+Left|Right +]',
		'scPosLength'     : 'Current position length',
		'scPosSpeed'      : 'Initial speed of current position',
		'scPosRepeat'     : 'Position number to repeat from',
		'txPosTotal'      : 'Total number of positions',
		'scChnButton'     : 'Mute/Unmute channels [Ctrl+Num1...Ctrl+Num6]',
		'scChnPattern'    : 'Assigned pattern for specific\nchannel in current position',
		'scChnTrans'      : 'Transposition of notes\nin specific channel-pattern',
		'scSampleNumber'  : 'Current sample ID',
		'txSampleName'    : 'Current sample description',
		'scSampleTone'    : 'Base tone and octave\nto test this sample',
		'btSamplePlay'    : 'Play current sample',
		'btSampleStop'    : 'Stop playback [Esc]',
		'btSampleClear'   : 'Clear sample or\npart of sample data [Ctrl+D]',
		'btSampleSwap'    : 'Swap volume data between channels',
		'btSampleLVolUp'  : 'Volume up left channel',
		'btSampleLVolDown': 'Volume down left channel',
		'btSampleCopyLR'  : 'Copy volume data from left to right channel',
		'btSampleCopyRL'  : 'Copy volume data from right to left channel',
		'btSampleRVolUp'  : 'Volume up right channel',
		'btSampleRVolDown': 'Volume down right channel',
		'btSampleRotL'    : 'Shift whole sample data\nto the left side',
		'btSampleRotR'    : 'Shift whole sample data\nto the right side',
		'btSampleEnable'  : 'Enable frequency generator\nin full active sample length',
		'btSampleDisable' : 'Disable frequency generator\nin full sample length',
		'chSampleRelease' : 'Sample can continue in playing\nafter the loop section when\nthe note was released in tracklist',
		'scSampleLength'  : 'Length of current sample',
		'scSampleRepeat'  : 'Number of ticks at the end\nof sample which will be repeated',
		'scOrnNumber'     : 'Current ornament ID',
		'txOrnName'       : 'Current ornament description',
		'scOrnTestSample' : 'Sample ID to test ornament with',
		'scOrnTone'       : 'Base tone and octave\nto test this ornament',
		'btOrnPlay'       : 'Play current ornament\nwith test sample',
		'btOrnStop'       : 'Stop playback [Esc]',
		'btOrnClear'      : 'Clear ornament [Ctrl+D]',
		'btOrnShiftLeft'  : 'Shift whole ornament data\nto the left side',
		'btOrnShiftRight' : 'Shift whole ornament data\nto the right side',
		'btOrnTransUp'    : 'Transpose ornament data\nup a halftone',
		'btOrnTransDown'  : 'Transpose ornament data\ndown a halftone',
		'btOrnCompress'   : 'Compress ornament data\n(keep only every even line)',
		'btOrnExpand'     : 'Expand ornament data\n(duplicate each line)',
		'fxOrnChords'     : 'Replace current ornament with\npregenerated chord decomposition',
		'scOrnLength'     : 'Length of current ornament',
		'scOrnRepeat'     : 'Number of ticks at the end\nof ornament which will be repeated'
	},

	statusbar: [
		/*  0 */ "NOTE - use alphanumeric keys as two-octave piano, for RELEASE note use [A], [1] or [-] key",
		/*  1 */ "SAMPLE - [0] no change, [1 - V] to change current sample",
		/*  2 */ "ORNAMENT - [0] no change, [1 - F] for ornament, or [X] for release ornament",
		/*  3 */ "VOLUME CHANGE - [0] no change, [1 - F] for volume change in left channel",
		/*  4 */ "VOLUME CHANGE - [0] no change, [1 - F] for volume change in right channel",
		/*  5 */ "COMMAND - [0] no change, [1 - F] to use effect or command",
		/*  6 */ "COMMAND: 1XY - portamento up",
		/*  7 */ "COMMAND: 2XY - portamento down",
		/*  8 */ "COMMAND: 3XY - glissando to given note",
		/*  9 */ "COMMAND: 4XY - vibrato on current note",
		/* 10 */ "COMMAND: 5XY - tremolo on current note",
		/* 11 */ "COMMAND: 6XX - delay ornament",
		/* 12 */ "COMMAND: 7XX - ornament offset",
		/* 13 */ "COMMAND: 8XX - delay sample",
		/* 14 */ "COMMAND: 9XX - sample offset",
		/* 15 */ "COMMAND: AXY - volume slide",
		/* 16 */ "COMMAND: BXX - break current channel-pattern and loop from line",
		/* 17 */ "COMMAND: CXY - special command",
		/* 18 */ "COMMAND: DXX - delay listing on current line",
		/* 19 */ "COMMAND: EXY - soundchip envelope or noise channel control",
		/* 20 */ "COMMAND: FXX - change global speed",
		/* 21 */ "COMMAND 1st parameter: period of change (in ticks)",
		/* 22 */ "COMMAND 2nd parameter: pitch change in period (in cents)",
		/* 23 */ "COMMAND parameter: delay (in ticks)",
		/* 24 */ "COMMAND parameter: offset (in ticks)",
		/* 25 */ "COMMAND 2nd parameter: volume change in period [- 9-F | 1-7 +]",
		/* 26 */ "COMMAND parameter: trackline of current channel-pattern",
		/* 27 */ "COMMAND parameter: [00] disable last command, [XY] false-chord, [F1] swap stereo channels",
		/* 28 */ "COMMAND 1st parameter: [0, 1] enable envelope control, [D] disable, [2] enable noise control",
		/* 29 */ "COMMAND 2nd parameter: [0-F] for envelope shape, [0-4] for noise control",
		/* 30 */ "COMMAND parameter: speed of track listing (01-1F constant, otherwise XY for swing mode)",
		/* 31 */ "COMMAND parameter: none",
	],

	// helper functions for statusbar:
	lastStatus: void 0,
	setStatusText: function (i) {
		var text = this.statusbar[i];

		if (text && i === this.lastStatus)
			return;

		$('#statusbar>p').html(!text ? '' :
			(
				text.replace(/(\[.+?\])/g, '<strong>$1</strong>')
				    .replace(/^([\w ]+?)(\:| \-)/, '<kbd>$1</kbd>$2')
				    .replace(/(\(.+?\))$/, '<em>$1</em>')
			)
		);

		this.lastStatus = i;
	},

	showTracklistStatus: function (col, cmd) {
		var i = col;

		if (col === 5)
			i = cmd + 5;
		else if (col > 5) {
			switch (cmd) {
				case 0x1:
				case 0x2:
				case 0x3:
				case 0x4:
				case 0x5:
					i = (col + 15);
					break;
				case 0x6:
				case 0x8:
				case 0xD:
					i = 23;
					break;
				case 0x7:
				case 0x9:
					i = 24;
					break;
				case 0xA:
					i = (col == 6) ? 21 : 25;
					break;
				case 0xB:
					i = 26;
					break;
				case 0xC:
					i = 27;
					break;
				case 0xE:
					i = (col + 22);
					break;
				case 0xF:
					i = 30;
					break;
				default:
					i = 31;
					break;
			}
		}

		this.setStatusText(i);
	},

	i18nInit: function () {
		Object.keys(this.i18n).forEach(function (idx) {
			var i, p, deepIn,
				value = this[idx],
				path = idx.split('.'),
				len = path.length;

			i = 0;
			deepIn = this;
			while (i < len) {
				p = path[i];
				deepIn[p] = deepIn[p] || {};

				if (++i === len)
					break;
				deepIn = deepIn[p];
			}

			if (typeof value === 'string')
				value = value.replace('...', '\u2026').replace('\b', '<br />');
			deepIn[p] = value;

			delete this[idx];
		}, window.i18n = this.i18n);
	}
};
//---------------------------------------------------------------------------------------
