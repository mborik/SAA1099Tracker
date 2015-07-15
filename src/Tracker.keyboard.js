/** Tracker.keyboard submodule */
//---------------------------------------------------------------------------------------
/*
	JavaScript KeyboardEvent keymap:
		  8      Backspace
		  9      Tab
		 13      Enter
		 16      Shift
		 17      Ctrl
		 18      Alt
		 19      Pause
		 20      CapsLock
		 27      Esc
		 32      Space
		 33      PageUp
		 34      PageDown
		 35      End
		 36      Home
		 37      Left
		 38      Up
		 39      Right
		 40      Down
		 44      PrtScr
		 45      Insert
		 46      Delete
		 48-57   0 to 9
		 65-90   A to Z
		 91      Win (left)
		 92      Win (right)
		 93      Menu
		 96-105  Num0 to Num9
		106      Numpad *
		107      Numpad +
		109      Numpad -
		110      Numpad .
		111      Numpad /
		112-123  F1 to F12
		144      NumLock
		145      ScrLock
		173      Mute    (Firefox: 181)
		174      VolDown (Firefox: 182)
		175      VolUp   (Firefox: 183)
		186      ; :     (Firefox:  59)
		187      = +     (Firefox:  61)
		189      - _     (Firefox: 173)
		188      , <
		190      . >
		191      / ?
		192      ` ~
		219      [ {     (Opera: Win)
		220      \ |
		221      ] }
		222      ' "
*/
//---------------------------------------------------------------------------------------
Tracker.prototype.hotkeyMap = function (group, key) {
	var app = this;

	switch (group) {
		case 'globalCtrl':
			return {
				79: function() {
					console.log('TrackerHotkey: Ctrl+O - Open');
				},
				83: function() {
					console.log('TrackerHotkey: Ctrl+S - Save');
				},
				89: function() {
					console.log('TrackerHotkey: Ctrl+Y - Redo');
				},
				90: function() {
					console.log('TrackerHotkey: Ctrl+Z - Undo');
				}
			}[key];

		case 'globalFs':
			return {
				27: function() {
					console.log('TrackerHotkey: Esc - Stop');
					if (app.modePlay)
						app.onCmdStop();
					else if (app.modeEdit)
						app.onCmdToggleEditMode();
				},
				112: function() {
					console.log('TrackerHotkey: F1 - About');
				},
				113: function() {
					console.log('TrackerHotkey: F2 - Tracklist Editor');
					$('#tab-tracker').trigger('click');
				},
				114: function() {
					console.log('TrackerHotkey: F3 - Sample Editor');
					$('#tab-smpedit').trigger('click');
				},
				115: function() {
					console.log('TrackerHotkey: F4 - Ornament Editor');
					$('#tab-ornedit').trigger('click');
				},
				116: function() {
					console.log('TrackerHotkey: F5 - Play song');
					app.onCmdSongPlay();
				},
				117: function() {
					console.log('TrackerHotkey: F6 - Play song from start');
					app.onCmdSongPlayStart();
				},
				118: function() {
					console.log('TrackerHotkey: F7 - Play position');
					app.onCmdPosPlay();
				},
				119: function() {
					console.log('TrackerHotkey: F8 - Play position from start');
					app.onCmdPosPlayStart();
				},
				120: function() {
					console.log('TrackerHotkey: F9 - Track manager');
				},
				121: function() {
					console.log('TrackerHotkey: F10 - Preferences');
				},
				122: function() {
					console.log('TrackerHotkey: F11 - Toggle loop');
					app.onCmdToggleLoop();
				},
				123: function() {
					console.log('TrackerHotkey: F12 - Unimplemented');
				}
			}[key];

		case 'trackerCtrl':
			if (key > 96 && key < 103)
				key = 96;
			else if (key > 48 && key < 57)
				key = 56;

			return {
				48: function () {
					console.log('TrackerHotkey: Ctrl+0 - Increase rowstep');
					app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.uponce').val(), 10);
				},
				56: function (oct) {
					oct -= 48;
					console.log('TrackerHotkey: Ctrl+' + oct + ' - Set octave');
					$('#scOctave').val(oct);
					app.ctrlOctave = oct;
				},
				57: function () {
					console.log('TrackerHotkey: Ctrl+9 - Decrease rowstep');
					app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.downonce').val(), 10);
				},
				96: function (chn) {
					chn -= 96;
					console.log('TrackerHotkey: Ctrl+Num' + chn + ' - Toggle channel');
					$('#scChnButton' + chn).bootstrapToggle('toggle');
				}
			}[key];

		case 'trackerCtrlShift':
			return {
				37: function () {
					console.log('TrackerHotkey: Ctrl+Shift+Left - Previous position');
					$('#scPosCurrent').trigger('touchspin.downonce');
				},
				39: function () {
					console.log('TrackerHotkey: Ctrl+Shift+Right - Next position');
					$('#scPosCurrent').trigger('touchspin.uponce');
				}
			}[key];

		case 'editorShift':
			return {
				9: function () {
					console.log('TrackerHotkey: Shift+Tab - Previous channel');

					if (!app.modeEdit)
						return;
					if (app.modeEditChannel > 0)
						app.modeEditChannel--;
					else
						app.modeEditChannel = 5;

					app.updateTracklist();
				}
			}[key];

		case 'editorKeys':
			return {
				9: function () {
					console.log('TrackerHotkey: Tab - Next channel');

					if (!app.modeEdit)
						return;
					if (app.modeEditChannel < 5)
						app.modeEditChannel++;
					else
						app.modeEditChannel = 0;

					app.updateTracklist();
				},
				32: function() {
					console.log('TrackerHotkey: Space - Edit mode');
					if (app.modePlay)
						app.onCmdStop();
					if (app.player.position.length)
						app.onCmdToggleEditMode();
				}
			}[key];

		default:
			return undefined;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleKeyEvent = function (e) {
	var o = this.globalKeyState,
		isInput = (e.target && e.target.type === 'text'),
		key = e.which || e.charCode || e.keyCode,
		canPlay = !!this.player.position.length;

	// cross-platform fixes
	if (browser.isOpera && key === 219)
		key = 91;
	else if (browser.isFirefox) switch (key) {
 		case 59:
 			key = 186; break;
 		case 61:
 			key = 187; break;
 		case 173:
 			key = 189; break;
 	}

	if (e.type === 'keydown') {
		if (key >= 16 && key <= 18) {
			o.modsHandled = false;
			if (e.location === 2)
				key += 256;
		}

		// add new key to the keymapper
		if (!o[key]) {
			o[key] = true;
			o.length++;
		}

		if (isInput && !this.handleTrackerHotkeys(key, true))
			return true;

		if (this.activeTab === 0) {
			// ENTER (hold to play position at current line)
			if (o[13] && o.length === 1 && canPlay && !this.modePlay && !o.lastPlayMode) {
				this.modePlay = this.player.playPosition(false, false, false);
				o.lastPlayMode = 3;
			}
			else if (o[13] && o.length > 1 && this.modePlay && o.lastPlayMode === 3) {
				this.modePlay = false;
				this.player.stopChannel();
				this.updateTracklist();
				o.lastPlayMode = 0;
			}

			if (isInput && o[9]) {
				delete o[9];
				o.length--;
				e.target.blur();
			}
		}
	}
	else if (e.type === 'keyup') {
		if (o[key] && this.handleTrackerHotkeys(key))
			isInput = false;

		if (!o.modsHandled && canPlay) {
			// RIGHT SHIFT (play position)
			if (o.length === 1 && o[272]) {
				if (this.modePlay && o.lastPlayMode === 1) {
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					o.lastPlayMode = 0;
				}
				else {
					this.modePlay = this.player.playPosition(false, false, true);
					o.lastPlayMode = 1;
				}

				o.modsHandled = true;
			}
			// RIGHT CTRL (play song)
			else if (o.length === 1 && o[273]) {
				if (this.modePlay && o.lastPlayMode === 2) {
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					o.lastPlayMode = 0;
				}
				else {
					this.modePlay = this.player.playPosition(false, true, true);
					o.lastPlayMode = 2;
				}

				o.modsHandled = true;
			}
		}

		if (this.activeTab === 0) {
			// ENTER (hold to play position at current line)
			if (o[13] && this.modePlay && o.lastPlayMode === 3) {
				this.modePlay = false;
				this.player.stopChannel();
				this.updateTracklist();
				o.lastPlayMode = 0;
			}
		}

		// remove entry from the keymapper
		if (o[key]) {
			delete o[key];
			if (o.length)
				o.length--;
		}
		if (o[key + 256]) {
			delete o[key + 256];
			if (o.length)
				o.length--;
		}

		if (isInput)
			return true;
	}

	e.preventDefault();
	return false;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleTrackerHotkeys = function (key, testOnly) {
	var o = this.globalKeyState,
		fn = false;

	if (o[17] && key !== 17) { // handle Ctrl+
		if (key === 90 && o[16]) { // convert Ctrl+Shift+Z to Ctrl+Y
			key = 89;
			delete o[key];
			delete o[16];
			if (o.length)
				o.length--;
		}

		if (o.length === 2) {
			if (key === 82 || key === 116)
				fn = testOnly = true; // disable refresh browser hotkeys
			else if (!(fn = this.hotkeyMap('globalCtrl', key))) {
				if (this.activeTab === 0 && !(fn = this.hotkeyMap('trackerCtrl', key)))
					fn = this.hotkeyMap('editorCtrl', key);
				else if (this.activeTab === 1)
					fn = this.hotkeyMap('smpeditCtrl', key);
				else if (this.activeTab === 2)
					fn = this.hotkeyMap('orneditCtrl', key);
			}
		}
		else if (o.length === 3 && o[16] && this.activeTab === 0)
			fn = this.hotkeyMap('trackerCtrlShift', key);
	}
	else if (o[16] && key !== 16 && o.length === 2 && this.activeTab === 0)
		fn = this.hotkeyMap('editorShift', key);
	else if (o.length === 1) {
		if (!(fn = this.hotkeyMap('globalFs', key))) {
			if (this.activeTab === 0)
				fn = this.hotkeyMap('editorKeys', key);
			else
				fn = this.hotkeyMap('smpornKeys', key);
		}
	}

	if (fn) {
		if (!testOnly) {
			fn(key);
			o.modsHandled = true;
		}

		return true;
	}
};
//---------------------------------------------------------------------------------------
