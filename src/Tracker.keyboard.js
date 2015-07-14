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
	}
	else if (e.type === 'keyup') {
		if (this.handleTrackerHotkeys(key))
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

		// ENTER (hold to play position at current line)
		if (o[13] && this.modePlay && o.lastPlayMode === 3) {
			this.modePlay = false;
			this.player.stopChannel();
			this.updateTracklist();
			o.lastPlayMode = 0;
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
	var o = this.globalKeyState, app = this,
		fn = false;

	if (o[17]) switch (key) {
		case 79: // O
			fn = function() {
				console.log('TrackerHotkey: Ctrl+O - Open');
			};
			break;

		case 83: // S
			fn = function() {
				console.log('TrackerHotkey: Ctrl+S - Save');
			};
			break;

		case 90: // Z
			if (!o[16]) {
				fn = function() {
					console.log('TrackerHotkey: Ctrl+Z - Undo');
				};
				break;
			}
		case 89: // Y
			fn = function() {
				console.log('TrackerHotkey: Ctrl+Y / Ctrl+Shift+Z - Redo');
			};
			break;

		case 97: case 98: case 99:
		case 100: case 101: case 102: // Num1..Num6
			fn = function() {
				var chn = key - 96;
				console.log('TrackerHotkey: Ctrl+Num' + chn + ' - Toggle channel');
				$('#scChnButton' + chn).bootstrapToggle('toggle');
			};
			break;

		case 82:  // R
		case 116: // F5
			fn = testOnly = true; // disable refresh browser hotkeys
			break;

		default:
			break;
	}
	else if (o.length === 1) switch (key) {
		case 27:
			fn = function() {
				console.log('TrackerHotkey: Esc - Stop');
				app.onCmdStop();
			};
			break;

		case 112:
			fn = function() {
				console.log('TrackerHotkey: F1 - About');
			};
			break;

		case 113:
			fn = function() {
				console.log('TrackerHotkey: F2 - Tracklist Editor');
				$('#tab-tracker-editor').click();
			};
			break;

		case 114:
			fn = function() {
				console.log('TrackerHotkey: F3 - Sample Editor');
				$('#tab-sample-editor').click();
			};
			break;

		case 115:
			fn = function() {
				console.log('TrackerHotkey: F4 - Ornament Editor');
				$('#tab-ornament-editor').click();
			};
			break;

		case 116:
			fn = function() {
				console.log('TrackerHotkey: F5 - Play song');
				app.onCmdSongPlay();
			};
			break;

		case 117:
			fn = function() {
				console.log('TrackerHotkey: F6 - Play song from start');
				app.onCmdSongPlayStart();
			};
			break;

		case 118:
			fn = function() {
				console.log('TrackerHotkey: F7 - Play position');
				app.onCmdPosPlay();
			};
			break;

		case 119:
			fn = function() {
				console.log('TrackerHotkey: F8 - Play position from start');
				app.onCmdPosPlayStart();
			};
			break;
	
		case 120:
			fn = function() {
				console.log('TrackerHotkey: F9 - Track manager');
			};
			break;

		case 121:
			fn = function() {
				console.log('TrackerHotkey: F10 - Preferences');
			};
			break;

		case 122:
			fn = function() {
				console.log('TrackerHotkey: F11 - Toggle loop');
				app.onCmdToggleLoop();
			};
			break;

		case 123:
			fn = function() {
				console.log('TrackerHotkey: F12 - Unimplemented');
			};
			break;

		default:
			break;
	}

	if (fn) {
		if (!testOnly) {
			fn();
			o.modsHandled = true;
		}

		return true;
	}
};
//---------------------------------------------------------------------------------------
