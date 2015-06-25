/** Tracker.keyboard submodule */
//---------------------------------------------------------------------------------------
/*	enum GlobalKeyModifier
	KEYMOD_LEFT_ALT      = 0x0001,
	KEYMOD_LEFT_CONTROL  = 0x0002,
	KEYMOD_LEFT_SHIFT    = 0x0004,
	KEYMOD_LEFT_META     = 0x0008,
	KEYMOD_RIGHT_ALT     = 0x0010,
	KEYMOD_RIGHT_CONTROL = 0x0020,
	KEYMOD_RIGHT_SHIFT   = 0x0040,
	KEYMOD_RIGHT_META    = 0x0080,
	KEYMOD_BOTH_ALT      = 0x0011,
	KEYMOD_BOTH_CONTROL  = 0x0022,
	KEYMOD_BOTH_SHIFT    = 0x0044,
	KEYMOD_BOTH_META     = 0x0088,
	KEYMOD_MASK          = 0x00FF,
	KEYMOD_NUMPAD        = 0x0100
*/
//---------------------------------------------------------------------------------------
Tracker.prototype.handleKeyEvent = function (e) {
	if (e.target && (e.target.type === 'text' || /input|textarea|select/i.test(e.target.nodeName || e.target.tagName)))
		return true;

	var key = e.which || e.charCode || e.keyCode,
		loc = e.location || 0,
		rot = loc === 2 ? 4 : 0;

	console.log(e.type + ': ' + key);

	if (e.type === 'keydown') {
		if (key === 18) // ALT
			this.globalKeyModifiers |= loc ? (0x1 << rot) : 0x11;
		else if (key === 17) // CTRL
			this.globalKeyModifiers |= loc ? (0x2 << rot) : 0x22;
		else if (key === 16) // SHIFT
			this.globalKeyModifiers |= loc ? (0x4 << rot) : 0x44;
		else if (key === 91 || key === 92) // WIN
			this.globalKeyModifiers |= loc ? (0x8 << rot) : 0x88;
		else if (key === 93) // MENU
			this.globalKeyModifiers |= 0x80;

		if (this.globalKeyModifiers)
			this.globalKeyModHandled = false;
	}
	else if (e.type === 'keypress') {
		this.globalKeyModHandled = true;
		return false;
	}
	else if (e.type === 'keyup') {
		if (!this.globalKeyModHandled) {
			if (key === 16 && this.globalKeyModifiers & 0x40) {
				if (this.modePlay && this.globalKeyPlayMode === 1) {
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					this.globalKeyPlayMode = 0;
				}
				else {
					this.modePlay = this.player.playPosition(false, false, true);
					this.globalKeyPlayMode = 1;
				}

				this.globalKeyModHandled = true;
			}
			else if (key === 17 && this.globalKeyModifiers & 0x20) {
				if (this.modePlay && this.globalKeyPlayMode === 2) {
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					this.globalKeyPlayMode = 0;
				}
				else {
					this.modePlay = this.player.playPosition(false, true, true);
					this.globalKeyPlayMode = 2;
				}

				this.globalKeyModHandled = true;
			}
		}

		if (key === 18) // ALT
			this.globalKeyModifiers &= 0xff ^ (loc ? (0x1 << rot) : 0x11);
		else if (key === 17) // CTRL
			this.globalKeyModifiers &= 0xff ^ (loc ? (0x2 << rot) : 0x22);
		else if (key === 16) // SHIFT
			this.globalKeyModifiers &= 0xff ^ (loc ? (0x4 << rot) : 0x44);
		else if (key === 91 || key === 92) // WIN
			this.globalKeyModifiers &= 0xff ^ (loc ? (0x8 << rot) : 0x88);
		else if (key === 93) // MENU
			this.globalKeyModifiers &= 0x7f;

		return false;
	}

	return true;
};
//---------------------------------------------------------------------------------------
