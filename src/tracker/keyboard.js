/** Tracker.keyboard submodule */
/* global browser, Player */
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
Tracker.prototype.hotkeyMap = function (type, group, key) {
	var app = this,
		cursors = (key > 32 && key < 41),
		keyup = /keyup|test/.test(type),
		keydown = /keydown|test/.test(type);

	switch (group) {
		case 'globalCtrl':
			if (!keyup)
				return;

			return {
				67: function () {
					console.logHotkey('Ctrl+C - Copy');
					app.onCmdEditCopy();
				},
				68: function () {
					console.logHotkey('Ctrl+D - Clear/Delete');
					app.onCmdEditClear();
				},
				79: function () {
					console.logHotkey('Ctrl+O - Open');
					app.onCmdFileOpen();
				},
				80: function () {
					console.logHotkey('Ctrl+P - Preferences');
				},
				83: function () {
					console.logHotkey('Ctrl+S - Save');
					app.onCmdFileSave();
				},
				86: function () {
					console.logHotkey('Ctrl+V - Paste');
					app.onCmdEditPaste();
				},
				88: function () {
					console.logHotkey('Ctrl+X - Cut');
					app.onCmdEditCut();
				},
				89: function () {
					console.logHotkey('Ctrl+Y - Redo');
				},
				90: function () {
					console.logHotkey('Ctrl+Z - Undo');
				}
			}[key];

		case 'globalFs':
			if (!keydown)
				return;

			return {
				27: function () {
					console.logHotkey('Esc - Stop');
					if (app.modePlay || app.activeTab > 0)
						app.onCmdStop();
					else if (app.modeEdit)
						app.onCmdToggleEditMode();
				},
				112: function () {
					console.logHotkey('F1 - About');
					app.onCmdAbout();
				},
				113: function () {
					console.logHotkey('F2 - Tracklist Editor');
					$('#tab-tracker').tab('show');
				},
				114: function () {
					console.logHotkey('F3 - Sample Editor');
					$('#tab-smpedit').tab('show');
				},
				115: function () {
					console.logHotkey('F4 - Ornament Editor');
					$('#tab-ornedit').tab('show');
				},
				116: function () {
					console.logHotkey('F5 - Play song');
					app.onCmdSongPlay();
				},
				117: function () {
					console.logHotkey('F6 - Play song from start');
					app.onCmdSongPlayStart();
				},
				118: function () {
					console.logHotkey('F7 - Play position');
					app.onCmdPosPlay();
				},
				119: function () {
					console.logHotkey('F8 - Play position from start');
					app.onCmdPosPlayStart();
				},
				120: function () {
					console.logHotkey('F9 - Track manager');
				},
				121: function () {
					console.logHotkey('F10 - Preferences');
				},
				122: function () {
					console.logHotkey('F11 - Toggle loop');
					app.onCmdToggleLoop();
				},
				123: function () {
					console.logHotkey('F12 - Unimplemented');
				}
			}[key];

		case 'trackerCtrl':
			if (!((type === 'repeat' && ([38,40,48,57].indexOf(key) >= 0)) || keydown))
				return;

			// unite bunch of keys into one handler...
			if (key > 96 && key < 103)     // Numpad1-Numpad6 (toggle channels)
				key = 96;
			else if (key > 48 && key < 57) // numbers 1-8 (octave)
				key = 56;

			return {
				38: function () {
					console.logHotkey('Up - Cursor movement backward to every 16th line (signature)');

					var cl = app.player.currentLine;
					if (cl >= 16 && (cl & 0xf0) === cl)
						cl = 16;
					else
						cl = (cl & 0x0f);

					if (!cl)
						return false;

					app.updateEditorCombo(-cl);
				},
				40: function () {
					console.logHotkey('Down - Cursor movement forward to every 16th line (signature)');

					var pp = app.player.position[app.player.currentPosition] || app.player.nullPosition,
						cl = app.player.currentLine,
						pl = pp.length;

					if (cl < (pl - 16))
						cl = 16 - (cl & 0x0f);
					else
						cl = pl - cl - 1;

					app.updateEditorCombo(cl);
				},
				48: function () {
					console.logHotkey('Ctrl+0 - Increase rowstep');
					app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.uponce').val(), 10);
				},
				56: function (oct) {
					oct -= 48;
					console.logHotkey('Ctrl+' + oct + ' - Set octave');
					$('#scOctave').val(oct);
					app.ctrlOctave = oct;
				},
				57: function () {
					console.logHotkey('Ctrl+9 - Decrease rowstep');
					app.ctrlRowStep = parseInt($('#scRowStep').trigger('touchspin.downonce').val(), 10);
				},
				96: function (chn) {
					chn -= 96;
					console.logHotkey('Ctrl+Num' + chn + ' - Toggle channel');
					$('#scChnButton' + chn).bootstrapToggle('toggle');
				}
			}[key];

		case 'trackerCtrlShift':
			if (!keyup)
				return;

			// unite Numpad +/- into one handler (transposition)
			if (key === 109)
				key = 107;

			return {
				37: function () {
					console.logHotkey('Ctrl+Shift+Left - Previous position');
					$('#scPosCurrent').trigger('touchspin.downonce');
				},
				39: function () {
					console.logHotkey('Ctrl+Shift+Right - Next position');
					$('#scPosCurrent').trigger('touchspin.uponce');
				},
				107: function(plus) {
					if (!app.modeEdit)
						return;

					plus &= 2;
					console.logHotkey('Ctrl+Shift+Num' + (!!plus ? 'Plus' : 'Minus') + ' - Transpose octave');

					var p = app.player, t,
						sel = app.tracklist.selection,
						ch = sel.len ? sel.channel : app.modeEditChannel,
						line = sel.len ? sel.line : p.currentLine,
						end = line + sel.len,
						pos = p.position[p.currentPosition] || p.nullPosition,
						pp = p.pattern[pos.ch[ch].pattern];

					for (plus = (plus - 1) * 12; line <= end; line++) {
						if (line >= pp.end)
							break;

						if (!(t = pp.data[line].tone))
							continue;

						t += plus;
						if (t > 0 && t <= 96)
							pp.data[line].tone = t;
					}

					app.updateTracklist();
					app.file.modified = true;
				}
			}[key];

		case 'editorShift':
			if (!keydown || !app.modeEdit || !app.player.position.length)
				return;

			return {
				9: function () {
					console.logHotkey('Shift+Tab - Previous channel');
					if (app.modeEditChannel > 0)
						app.modeEditChannel--;
					else
						app.modeEditChannel = 5;

					app.updateTracklist();
				}
			}[key];

		case 'editorKeys':
			if (!(keydown || (type === 'repeat' && cursors)))
				return;

			// unite Numpad +/- into one handler (transposition)
			if (key === 109)
				key = 107;

			if (cursors) {
				if (app.modePlay)
					app.onCmdStop();
				else if (!app.player.position.length || (!app.modeEdit && app.modePlay))
					return;
			}

			return {
				9: function () {
					if (!app.player.position.length || !app.modeEdit)
						return;

					console.logHotkey('Tab - Next channel');
					if (app.modeEditChannel < 5)
						app.modeEditChannel++;
					else
						app.modeEditChannel = 0;

					app.updateTracklist();
				},
				32: function () {
					console.logHotkey('Space - Edit mode');
					if (app.modePlay)
						app.onCmdStop();
					if (app.player.position.length)
						app.onCmdToggleEditMode();
				},
				33: function () {
					console.logHotkey('PageUp - Move cursor up by half of tracklines');

					var lines = app.settings.tracklistLines + 1;
					app.tracklist.moveCurrentline(-(lines >> 1), true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				34: function () {
					console.logHotkey('PageDown - Move cursor down by half of tracklines');

					var lines = app.settings.tracklistLines + 1;
					app.tracklist.moveCurrentline((lines >> 1), true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				35: function () {
					console.logHotkey('End - Move cursor to end of the position');
					app.tracklist.moveCurrentline(Player.maxPatternLen, true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				36: function () {
					console.logHotkey('Home - Move cursor to start of the position');
					app.tracklist.moveCurrentline(-Player.maxPatternLen, true);
					app.updateTracklist();
					app.updatePanelInfo();
				},
				37: function () {
					if (!app.modeEdit)
						return;

					console.logHotkey('Left - Cursor movement');
					if (app.modeEditColumn > 0)
						app.modeEditColumn--;
					else {
						app.modeEditColumn = 7;
						if (app.modeEditChannel > 0)
							app.modeEditChannel--;
						else
							app.modeEditChannel = 5;
					}

					app.updateTracklist();
				},
				38: function () {
					console.logHotkey('Up - Cursor movement');
					app.updateEditorCombo(-1);
				},
				39: function () {
					if (!app.modeEdit)
						return;

					console.logHotkey('Right - Cursor movement');
					if (app.modeEditColumn < 7)
						app.modeEditColumn++;
					else {
						app.modeEditColumn = 0;
						if (app.modeEditChannel < 5)
							app.modeEditChannel++;
						else
							app.modeEditChannel = 0;
					}

					app.updateTracklist();
				},
				40: function () {
					console.logHotkey('Down - Cursor movement');
					app.updateEditorCombo(1);
				},
				107: function(plus) {
					if (!app.modeEdit)
						return;

					plus &= 2;
					console.logHotkey('Num' + (!!plus ? 'Plus' : 'Minus') + ' - Transpose half-tone');

					var p = app.player,
						sel = app.tracklist.selection,
						ch = sel.len ? sel.channel : app.modeEditChannel,
						line = sel.len ? sel.line : p.currentLine,
						end = line + sel.len,
						pos = p.position[p.currentPosition] || p.nullPosition,
						pp = p.pattern[pos.ch[ch].pattern];

					for (--plus; line <= end; line++)
						if (line >= pp.end)
							break;
						else if (pp.data[line].tone)
							pp.data[line].tone = Math.min(Math.max(pp.data[line].tone + plus, 1), 96);

					app.updateTracklist();
					app.file.modified = true;
				}
			}[key];

		case 'editorEdit':
			if (!keydown)
				return;

			var cl = app.player.currentLine,
				pp = app.player.position[app.player.currentPosition] || app.player.nullPosition,
				cp = pp.ch[app.modeEditChannel].pattern,
				pt = app.player.pattern[cp],
				pl = pt.data[cl];

			if (cl < pt.end) switch (key) {
				case 8:
					return function () {
						console.logHotkey('Backspace - Delete trackline from pattern');

						var A = cl + 1, B = cl, data = pt.data,
							max = Player.maxPatternLen - 1;

						for (; A < max; A++, B++) {
							data[B].tone = data[A].tone;
							data[B].release = data[A].release;
							data[B].smp = data[A].smp;
							data[B].orn = data[A].orn;
							data[B].orn_release = data[A].orn_release;
							data[B].volume.byte = data[A].volume.byte;
							data[B].cmd = data[A].cmd;
							data[B].cmd_data = data[A].cmd_data;
						}

						data[A].tone = data[A].smp = data[A].orn = 0;
						data[A].release = data[A].orn_release = false;
						data[A].cmd = data[A].cmd_data = data[A].volume.byte = 0;

						app.updateTracklist();
						app.file.modified = true;
					};

				case 45:
					return function () {
						console.logHotkey('Insert - New trackline into pattern');

						var max = Player.maxPatternLen,
							A = max - 2, B = max - 1, data = pt.data;

						for (; A >= cl; A--, B--) {
							data[B].tone = data[A].tone;
							data[B].release = data[A].release;
							data[B].smp = data[A].smp;
							data[B].orn = data[A].orn;
							data[B].orn_release = data[A].orn_release;
							data[B].volume.byte = data[A].volume.byte;
							data[B].cmd = data[A].cmd;
							data[B].cmd_data = data[A].cmd_data;
						}

						data[B].tone = data[B].smp = data[B].orn = 0;
						data[B].release = data[B].orn_release = false;
						data[B].cmd = data[B].cmd_data = data[B].volume.byte = 0;

						app.updateTracklist();
						app.file.modified = true;
					};

				case 46:
					return function () {
						console.logHotkey('Delete - Clear trackline data');

						switch (app.modeEditColumn) {
							default: case 0:		// NOTE column
								pl.tone = 0;
								pl.release = 0;
								break;
							case 1: 				// SAMPLE column
								pl.smp = 0;
								break;
							case 2: 				// ORNAMENT column
								pl.orn = 0;
								pl.orn_release = 0;
								break;
							case 3: case 4:			// ATTENUATION columns
								pl.volume.byte = 0;
								break;
							case 5: 				// COMMAND column
								pl.cmd = 0;
								pl.cmd_data = 0;
								break;
							case 6: 				// COMMAND DATA 1 column
								pl.cmd_data &= 0x0F;
								break;
							case 7: 				// COMMAND DATA 2 column
								pl.cmd_data &= 0xF0;
								break;
						}

						app.updateEditorCombo();
						app.file.modified = true;
					};

				default:
					var columnHandler = {
					// NOTE column
						0: function (key, test) {
							var tone = Math.min(app.getKeynote(key), 96);

							if (tone < 0)
								return false;
							else if (test)
								return true;
							else if (tone > 0) {
								pl.release = false;
								pl.tone = tone;
								if (app.ctrlSample && !pl.smp)
									pl.smp = app.ctrlSample;
								if (app.ctrlOrnament && !pl.orn) {
									pl.orn = app.ctrlOrnament;
									pl.orn_release = false;
								}
							}
							else {
								pl.release = true;
								pl.tone = 0;
								pl.smp = 0;
								pl.orn = 0;
								pl.orn_release = false;
							}

							app.updateEditorCombo();
						},
					// SAMPLE column
						1: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.smp = (key - 48);
							}
							else if (key >= 65 && key <= 86) { // A - V
								if (test)
									return true;

								pl.smp = (key - 55);
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// ORNAMENT column
						2: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.orn_release = false;
								pl.orn = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.orn_release = false;
								pl.orn = (key - 55);
							}
							else if (key === 88 || key === 189) { // X | -
								if (test)
									return true;

								pl.orn_release = true;
								pl.orn = 0;
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// ATTENUATION 1 column
						3: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.volume.L = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.volume.L = (key - 55);
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// ATTENUATION 2 column
						4: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.volume.R = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.volume.R = (key - 55);
							}
							else
								return false;

							app.updateEditorCombo();
						},
					// COMMAND column
						5: function (key, test) {
							if (key >= 48 && key <= 57) { // 0 - 9
								if (test)
									return true;

								pl.cmd = (key - 48);
							}
							else if (key >= 65 && key <= 70) { // A - F
								if (test)
									return true;

								pl.cmd = (key - 55);

								// recalculate position frames if we changing speed
								if (pl.cmd == 0xF && pl.cmd_data)
									app.player.countPositionFrames(app.player.currentPosition);
							}
							else return;

							app.updateEditorCombo();
						},
					// COMMAND DATA 1 column
						6: function (key, test) {
							if (key >= 48 && key <= 57) // 0 - 9
								key -= 48;
							else if (key >= 65 && key <= 70) // A - F
								key -= 55;
							else
								return false;

							if (test)
								return true;

							pl.cmd_data &= 0x0F;
							pl.cmd_data |= key << 4;

							// recalculate position frames if we changing speed
							if (pl.cmd == 0xF && pl.cmd_data)
								app.player.countPositionFrames(app.player.currentPosition);

							app.updateEditorCombo();
						},
					// COMMAND DATA 2 column
						7: function (key, test) {
							if (key >= 48 && key <= 57) // 0 - 9
								key -= 48;
							else if (key >= 65 && key <= 70) // A - F
								key -= 55;
							else
								return false;

							if (test)
								return true;

							pl.cmd_data &= 0xF0;
							pl.cmd_data |= key;

							// recalculate position frames if we changing speed
							if (pl.cmd == 0xF && pl.cmd_data)
								app.player.countPositionFrames(app.player.currentPosition);

							app.updateEditorCombo();
						}
					}[app.modeEditColumn];

					if (columnHandler(key, true)) {
						app.file.modified = true;
						return columnHandler;
					}
			}

		case 'smpornCtrl':
			if (!keydown)
				return;

			if (key > 48 && key < 57) { // numbers 1-8 (octave)
				return function (key) {
					var oct = (key - 49),
						base = app.workingSampleTone,
						tone = ((base - 1) % 12) + (oct * 12) + 1;

					if (base !== tone) {
						console.logHotkey('Ctrl+' + String.fromCharCode(key) + ' - Set octave for sample/ornament editor test tone');
						app.workingSampleTone = tone;

						$('#scSampleTone,#scOrnTone')
							.val(tone.toString())
							.prev().val(app.player.tones[tone].txt);
					}
				};
			}
			break;

		case 'smpornCtrlShift':
			if (!keydown)
				return;

			if ((key > 48 && key <= 57) || (key > 64 && key <= 90)) { // 1-9 | A-V
				return function (key) {
					var num = key - 48,
						orn = (app.activeTab === 2);

					if (num > 9)
						num -= 7;

					if (num >= (orn ? 16 : 32))
						return;

					console.logHotkey('Ctrl+Shift' + String.fromCharCode(key) +
						' - Set active ' + (orn ? 'ornament' : 'sample'));

					$(orn ? '#scOrnNumber' : '#scSampleNumber')
						.val(num.toString(32).toUpperCase())
						.trigger('change');
				};
			}
			break;

		case 'smpornKeys':
			if (!keydown)
				return;

			// 2.5 octave piano-roll on keyboard
			var oct  = app.player.tones[app.workingSampleTone].oct,
				tone = Math.min(app.getKeynote(key, oct), 96),
				sample = (app.activeTab === 1) ? app.workingSample : app.workingOrnTestSample,
				ornament = (app.activeTab === 2) ? app.workingOrnament : 0;

			if (tone > 0)
				return function () { app.player.playSample(sample, ornament, tone) };
			break;

		default:
			return;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.handleKeyEvent = function (e) {
	var o = this.globalKeyState,
		type = e.type,
		isInput = (e.target && (/^a|input|button$/i.test(e.target.tagName)) || e.target.id === 'documodal'),
		textInput = (isInput && e.target.id.indexOf('tx') === 0),
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

	if (type === 'keydown') {
		if (key >= 16 && key <= 18) {
			o.modsHandled = false;
			if (e.location === 2)
				key += 256;
		}

		if (e.repeat || (browser.isFirefox && o[key]))
			type = 'repeat';

		// add new key to the keymapper
		else if (!o[key]) {
			o[key] = true;
			o.length++;
		}

		if (isInput && !this.handleHotkeys('test', key, isInput, textInput))
			return true;

		if (!this.handleHotkeys(type, key, isInput, textInput)) {
			if (!o.inDialog && this.activeTab === 0) {
				// ENTER (hold to play position at current line)
				if (o[13] && o.length === 1 && canPlay && !this.modePlay && !o.lastPlayMode) {
					this.modePlay = this.player.playPosition(false, false, false);
					o.lastPlayMode = 3;
					SyncTimer.resume();
				}
				else if (o[13] && o.length > 1 && this.modePlay && o.lastPlayMode === 3) {
					SyncTimer.pause();
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					o.lastPlayMode = 0;
				}
			}
		}
	}
	else if (type === 'keyup') {
		if (o[key] && this.handleHotkeys(type, key, isInput, textInput))
			isInput = false;

		if (!o.modsHandled && !o.inDialog && canPlay) {
			// RIGHT SHIFT (play position)
			if (o.length === 1 && o[272]) {
				if (this.modePlay && o.lastPlayMode === 1) {
					SyncTimer.pause();
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					o.lastPlayMode = 0;
				}
				else {
					this.modePlay = this.player.playPosition(false, false, true);
					o.lastPlayMode = 1;
					SyncTimer.resume();
				}

				o.modsHandled = true;
			}
			// RIGHT CTRL (play song)
			else if (o.length === 1 && o[273]) {
				if (this.modePlay && o.lastPlayMode === 2) {
					SyncTimer.pause();
					this.modePlay = false;
					this.player.stopChannel();
					this.updateTracklist();
					o.lastPlayMode = 0;
				}
				else {
					this.modePlay = this.player.playPosition(false, true, true);
					o.lastPlayMode = 2;
					SyncTimer.resume();
				}

				o.modsHandled = true;
			}
		}

		if (!o.inDialog && this.activeTab === 0) {
			// ENTER (hold to play position at current line)
			if (o[13] && this.modePlay && o.lastPlayMode === 3) {
				SyncTimer.pause();
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
Tracker.prototype.handleHotkeys = function (type, key, isInput, textInput) {
	var o = this.globalKeyState,
		fn = false,
		restrict = o.inDialog || isInput;

	if (o[17] && key !== 17) { // handle Left Ctrl
		if (key === 90 && o[16]) { // convert Ctrl+Shift+Z to Ctrl+Y
			delete o[key];
			delete o[16];
			if (o.length)
				o.length--;
			o[--key] = true;
		}

		if (o.length === 2) {
			if (textInput && (key === 67 || key === 86))
				return false;
			else if (key === 82 || key === 116) {
				fn = true; // disable refresh browser hotkeys
				type = 'test';
			}
			else if (!o.inDialog && !(fn = this.hotkeyMap(type, 'globalCtrl', key)) && !isInput) {
				if (this.activeTab === 0)
					fn = this.hotkeyMap(type, 'trackerCtrl', key);
				else
					fn = this.hotkeyMap(type, 'smpornCtrl', key);
			}
		}
		else if (!o.inDialog && o.length === 3 && o[16]) {
			if (this.activeTab === 0)
				fn = this.hotkeyMap(type, 'trackerCtrlShift', key);
			else
				fn = this.hotkeyMap(type, 'smpornCtrlShift', key);
		}

		if (o.inDialog && !fn) {
			fn = true; // restrict all ctrl hotkeys in dialogs
			type = 'test';
			o.modsHandled = true;
		}
	}
	else if (o[273] && key !== 273) { // handle Right Ctrl
		fn = true; // restrict all right ctrl hotkeys
		type = 'test';
		o.modsHandled = true;
	}
	else if (!restrict && o[16] && key !== 16 && o.length === 2 && this.activeTab === 0)
		fn = this.hotkeyMap(type, 'editorShift', key);
	else if (o.length === 1) {
		if (o.inDialog && (key >= 112 && key <= 123) || key === 272) {
			fn = true; // disable F1-F12 keys in dialogs
			type = 'test';
			o.modsHandled = true;
		}
		else if (!o.inDialog && !(fn = this.hotkeyMap(type, 'globalFs', key)) && !isInput) {
			if (this.activeTab === 0) {
				if (!(fn = this.hotkeyMap(type, 'editorKeys', key)) && this.player.position.length && this.modeEdit)
					fn = this.hotkeyMap(type, 'editorEdit', key);
			}
			else
				fn = this.hotkeyMap(type, 'smpornKeys', key);
		}
	}

	if (fn) {
		if (type !== 'test') {
			fn(key);
			o.modsHandled = true;
		}

		return true;
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.getKeynote = function (key, octave) {
	var t = ((octave !== void 0) ? octave : (this.ctrlOctave - 1)) * 12,
		c = String.fromCharCode(key),
		i = ' ZSXDCVGBHNJMQ2W3ER5T6Y7UI9O0P'.indexOf(c);

	if (i > 0)
		return (t + i);
	else if ((i = {
		49 : 0,      // 1
		65 : 0,      // A
		192: 0,      // `
		189: 0,      // -
		222: 0,      // '
		188: t + 13, // ,
		76 : t + 14, // L
		190: t + 15, // .
		186: t + 16, // ;
		191: t + 17, // /
		219: t + 30, // [
		187: t + 31, // =
		221: t + 32  // ]
	}[key]) >= 0)
		return i;

	return -1;
};
//---------------------------------------------------------------------------------------
