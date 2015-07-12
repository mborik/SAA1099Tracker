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
		isInput = (e.target && (e.target.type === 'text')),
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

		if (isInput)
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
		if (isInput)
			o.modsHandled = true;

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
