/** Tracker.keyboard submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.handleKeyEvent = function (e) {
	if (e.target && (e.target.type === 'text' || /input|textarea|select/i.test(e.target.nodeName || e.target.tagName)))
		return true;

	var o = this.globalKeyState,
		key = e.which || e.charCode || e.keyCode,
		loc = e.location || 0,
		rot = loc === 2 ? 4 : 0;

	if (e.type === 'keydown') {
		if (!o.map[key]) {
			o.map[key] = true;
			o.map.length++;
		}

		if (key === 18)
			o.mods |= loc ? (0x1 << rot) : 0x11; // ALT
		else if (key === 17)
			o.mods |= loc ? (0x2 << rot) : 0x22; // CTRL
		else if (key === 16)
			o.mods |= loc ? (0x4 << rot) : 0x44; // SHIFT
		else if (key === 91 || key === 92)
			o.mods |= loc ? (0x8 << rot) : 0x88; // WIN
		else if (key === 93)
			o.mods |= 0x80;                      // MENU

		if (o.mods)
			o.modsHandled = false;
		// ENTER (hold to play position at current line)
		else if (key === 13 && o.map.length === 1 && !this.modePlay && !o.lastPlayMode) {
			this.modePlay = this.player.playPosition(false, false, false);
			o.lastPlayMode = 3;
		}
	}
	else if (e.type === 'keyup') {
		if (o.map[key]) {
			delete o.map[key];
			o.map.length--;
		}

		if (!o.modsHandled) {
			// RIGHT SHIFT (play position)
			if (key === 16 && o.mods & 0x40) {
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
			else if (key === 17 && o.mods & 0x20) {
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
		if (key === 13 && o.lastPlayMode === 3) {
			this.modePlay = false;
			this.player.stopChannel();
			this.updateTracklist();
			o.lastPlayMode = 0;
		}

		if (key === 18)
			o.mods &= 0xff ^ (loc ? (0x1 << rot) : 0x11); // ALT
		else if (key === 17)
			o.mods &= 0xff ^ (loc ? (0x2 << rot) : 0x22); // CTRL
		else if (key === 16)
			o.mods &= 0xff ^ (loc ? (0x4 << rot) : 0x44); // SHIFT
		else if (key === 91 || key === 92)
			o.mods &= 0xff ^ (loc ? (0x8 << rot) : 0x88); // WIN
		else if (key === 93)
			o.mods &= 0x7f;                               // MENU
	}

	return false;
};
//---------------------------------------------------------------------------------------
