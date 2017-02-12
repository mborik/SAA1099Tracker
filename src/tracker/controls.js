/** Tracker.controls submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanels = function() {
	$('#scOctave').val(this.ctrlOctave);
	$('#scAutoSmp').val(this.ctrlSample);
	$('#scAutoOrn').val(this.ctrlOrnament);
	$('#scRowStep').val(this.ctrlRowStep);

	$('#txHeaderTitle').val(this.songTitle);
	$('#txHeaderAuthor').val(this.songAuthor);

	this.updatePanelInfo();
	this.updatePanelPattern();
	this.updatePanelPosition();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updateEditorCombo = function(step) {
	if (step === undefined) {
		this.player.playLine();
		step = this.ctrlRowStep;
	}

	this.tracklist.moveCurrentline(step);
	this.updateTracklist();
	this.updatePanelInfo();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelInfo = function() {
	let p = this.player;
	let el = $('#stInfoPanel u');
	let int = this.settings.audioInterrupt;
	let total = 0;
	let current = 0;
	let curpos = p.currentPosition;
	let len = p.position.length;
	let pos = p.position[curpos];
	let line = p.currentLine;
	let even = line & -2;
	let i = int * 60;
	let bpm;

	if (len) {
		bpm = (i / (pos.frames[even + 2] - pos.frames[even])) >> 1;

		p.position.forEach((posi, i) => {
			if (i === curpos) {
				current = total;
			}
			total += posi.frames[posi.length];
		});

		current += pos.frames[line];

		i = total.toString().length;
		el[4].textContent = current.toWidth(i);
		el[5].textContent = total.toWidth(i);

		el[2].textContent = (current / int).toTimeString();
		el[3].textContent = (total / int).toTimeString();
	}
	else {
		bpm = (i / this.player.currentSpeed) >> 2;

		el[2].textContent = el[3].textContent = (0).toTimeString();
		el[4].textContent = el[5].textContent = '0';
	}

	el[0].textContent = bpm;
	el[1].textContent = int;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPattern = function() {
	let a = [ '#scPattern', '#scPatternLen', '#btPatternDelete', '#btPatternClean', '#btPatternInfo'];
	let lastState = $(a[0]).prop('disabled');
	let pat = this.workingPattern;
	let len = this.player.pattern.length;
	let min = 0, max = 0;
	let d = true;

	len--;
	if (len) {
		min = 1;
		max = len;
		pat = Math.max(Math.min(pat, max), min);
	}
	else {
		pat = 0;
	}

	for (let i = 1; i <= 6; i++) {
		$('#scChnPattern' + i).trigger('touchspin.updatesettings', { min: 0, max: max });
	}

	if (pat) {
		d = false;
		$(a[1]).val(this.player.pattern[pat].end);
	}
	else {
		$(a[1]).val(64);
	}

	this.workingPattern = pat;
	$(a[0]).trigger('touchspin.updatesettings', { min: min, max: max, initval: pat }).val(pat);

	$('#txPatternUsed').val(this.player.countPatternUsage(pat));
	$('#txPatternTotal').val(len);

	if (d !== lastState) {
		a.forEach(selector => {
			$(selector + ',' + selector + '~span>button').prop('disabled', d);
		});
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPosition = function() {
	let a = [ '#scPosCurrent', '#scPosLength', '#scPosSpeed', '#txPosTotal', '#scPosRepeat' ];
	let lastState = $(a[0]).prop('disabled');
	let pos = this.player.nullPosition, buf;
	let len = this.player.position.length;
	let p = this.player.currentPosition;
	let d = true;

	if (len) {
		d = false;
		$(a[0] + ',' + a[4]).trigger('touchspin.updatesettings', { min: 1, max: len });
		$(a[0]).val(p + 1);
		$(a[3]).val(len);
		$(a[4]).val(this.player.repeatPosition + 1);

		pos = this.player.position[p];
	}
	else {
		$(a[0] + ',' + a[4]).val(0).trigger('touchspin.updatesettings', { min: 0, max: 0 });
		$(a[3]).val(0);
	}

	$(a[1]).val(pos.length);
	$(a[2]).val(pos.speed);

	for (let i = 0; i < 6; i++) {
		a.push((buf = '#scChnPattern' + (i + 1)));
		$(buf).val(pos.ch[i].pattern);

		a.push((buf = '#scChnTrans' + (i + 1)));
		$(buf).val(pos.ch[i].pitch);
	}

	if (d !== lastState) {
		a.splice(3, 1);
		a.forEach(selector => {
			$(selector + ',' + selector + '~span>button').prop('disabled', d);
		});
	}

	pos = null;
};
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tracker.prototype.onCmdFileNew = function() {
	let keys = this.globalKeyState;
	let file = this.file;
	if (this.modePlay || !file.yetSaved && !file.modified && !file.fileName) {
		return;
	}

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.file.new.title,
		text: i18n.dialog.file.new.msg,
		buttons: 'yesno',
		style: 'danger',
		callback: (btn) => {
			keys.inDialog = false;
			if (btn !== 'yes') {
				return;
			}

			file.new();
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileOpen = function() {
	if (this.modePlay) {
		return;
	}

	let keys = this.globalKeyState;
	let file = this.file;

	if (file.modified) {
		keys.inDialog = true;

		$('#dialoque').confirm({
			title: i18n.dialog.file.open.title,
			text: i18n.dialog.file.open.msg,
			buttons: 'yesno',
			style: 'warning',
			callback: (btn) => {
				keys.inDialog = false;
				if (btn !== 'yes') {
					return;
				}

				file.dialog.load();
			}
		});
	}
	else {
		file.dialog.load();
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileSave = function(as) {
	if (this.modePlay || !this.player.position.length) {
		return;
	}

	let file = this.file;
	if (as || !file.yetSaved || file.modified) {
		file.dialog.save();
	}
	else if (!as && file.yetSaved && file.fileName) {
		file.saveFile(file.fileName, $('#stInfoPanel u:eq(3)').text());
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditCut = function() {
	if (this.activeTab === 0 && this.modeEdit) {
		this.manager.copyFromTracklist();
		this.manager.clearFromTracklist();

		this.player.countPositionFrames(this.player.currentPosition);
		this.updateEditorCombo(0);
	}
	else if (this.activeTab === 1) {
		this.manager.copySample();
		this.manager.clearSample();
		this.updateSampleEditor(true);
		this.smpornedit.updateSamplePitchShift();
	}
	else if (this.activeTab === 2) {
		this.manager.copyOrnament();
		this.manager.clearOrnament();
		this.smpornedit.updateOrnamentEditor(true);
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditCopy = function() {
	if (this.activeTab === 0 && this.modeEdit) {
		this.manager.copyFromTracklist();
	}
	else if (this.activeTab === 1) {
		this.manager.copySample();
	}
	else if (this.activeTab === 2) {
		this.manager.copyOrnament();
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditPaste = function() {
	if (this.activeTab === 0 && this.modeEdit) {
		if (this.manager.pasteToTracklist()) {
			this.player.countPositionFrames(this.player.currentPosition);
			this.updateEditorCombo(this.ctrlRowStep);
		}
	}
	else if (this.activeTab === 1) {
		this.manager.pasteSample();
		this.updateSampleEditor(true);
		this.smpornedit.updateSamplePitchShift();
	}
	else if (this.activeTab === 2) {
		this.manager.pasteOrnament();
		this.smpornedit.updateOrnamentEditor(true);
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdEditClear = function() {
	if (this.activeTab === 0 && this.modeEdit) {
		this.manager.clearFromTracklist();
		this.player.countPositionFrames(this.player.currentPosition);
		this.updateEditorCombo(0);
	}
	else if (this.activeTab === 1) {
		this.onCmdSmpClear();
	}
	else if (this.activeTab === 2) {
		this.onCmdOrnClear();
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdStop = function() {
	SyncTimer.pause();

	this.player.stopChannel();
	this.modePlay = false;
	this.globalKeyState.lastPlayMode = 0;

	if (this.activeTab === 0) {
		this.updateTracklist(true);
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlay = function() {
	if (this.globalKeyState.lastPlayMode === 2) {
		return;
	}
	if (this.activeTab === 0) {
		this.doc.setStatusText();
	}
	if (this.modeEdit) {
		this.player.storePositionRuntime(this.player.currentPosition);
	}

	this.modePlay = this.player.playPosition(false, true, true);
	SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlayStart = function() {
	if (this.activeTab === 0) {
		this.doc.setStatusText();
	}
	if (this.modeEdit) {
		this.player.storePositionRuntime(this.player.currentPosition);
	}

	this.modePlay = this.player.playPosition(true, true, true);
	SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlay = function() {
	if (this.globalKeyState.lastPlayMode === 1) {
		return;
	}
	if (this.activeTab === 0) {
		this.doc.setStatusText();
	}
	if (this.modeEdit) {
		this.player.storePositionRuntime(this.player.currentPosition);
	}

	this.modePlay = this.player.playPosition(false, false, false);
	SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlayStart = function() {
	if (this.activeTab === 0) {
		this.doc.setStatusText();
	}
	if (this.modeEdit) {
		this.player.storePositionRuntime(this.player.currentPosition);
	}

	this.modePlay = this.player.playPosition(false, false, true);
	SyncTimer.resume();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleLoop = function(newState) {
	let state = (typeof newState === 'boolean') ? newState : (this.player.loopMode = !this.player.loopMode);
	let el = $('a#miToggleLoop>span');
	let icon1 = 'glyphicon-repeat', icon2 = 'glyphicon-remove-circle';
	let glyph = state ? icon1 : icon2;
	let color = state ? '#000' : '#ccc';

	el.removeClass(icon1 + ' ' + icon2);
	el.addClass(glyph).css({ 'color': color });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleEditMode = function(newState) {
	let state = (typeof newState === 'boolean') ? newState : (this.modeEdit = !this.modeEdit);
	let el = $('.tracklist-panel');

	if (!state) {
		this.doc.setStatusText();
		this.player.storePositionRuntime(this.player.currentPosition);
	}

	el[state ? 'addClass' : 'removeClass']('edit');
	this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdShowDocumentation = function(name) {
	let filename = 'doc/' + name + '.txt';
	let cache = this.doc.txtCache;
	let keys = this.globalKeyState;
	let data = cache[name];

	let dialog = $('#documodal');
	let button = $('<button/>').attr({
		'type': 'button',
		'class': 'close',
		'data-dismiss': 'modal'
	}).text('\xd7');

	if (!!data) {
		keys.inDialog = true;
		dialog.modal('show')
			.find('.modal-body')
			.html(data)
			.prepend(button)
			.on('hidden.bs.modal', () => {
				keys.inDialog = false;
				$(this).find('.modal-body').empty();
			});
	}
	else {
		$.ajax(filename, {
			cache: true,
			contentType: 'text/plain',
			dataType: 'text',
			isLocal: true,
			success: (data) => {
				data = ('<pre>\n' + data + '</pre>')
					.replace(/\s*?^\=\=\s*([^\=]+?)\s*[\=\s]+$/gm, '</pre><h3>$1</h3><pre>')
					.replace(/<pre><\/pre>/g, '');

				cache[name] = data;
				dialog.modal('show')
					.find('.modal-body')
					.html(data)
					.prepend(button)
					.on('hidden.bs.modal', () => {
						keys.inDialog = false;
						$(this).find('.modal-body').empty();
					});
			}
		});
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdAbout = function() {
	let keys = this.globalKeyState;
	let dialog = $('#about');
	let data = dialog.data();

	if (!data.hasOwnProperty('bs.modal')) {
		dialog
			.on('show.bs.modal', () => keys.inDialog = true)
			.on('hidden.bs.modal', () => keys.inDialog = false);
	}

	dialog.modal('toggle');
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatCreate = function() {
	if (this.modePlay) {
		return;
	}

	let id = this.player.addNewPattern();
	let pt = this.player.pattern[id];
	let len = (this.workingPattern && this.player.pattern[this.workingPattern].end) || 64;

	pt.end = len;
	this.workingPattern = id;
	this.updatePanelPattern();
	this.file.modified = true;

	$('#scPatternLen').focus();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatDelete = function() {
	if (this.modePlay || !this.workingPattern) {
		return;
	}

	let app = this;
	let p = this.player;
	let pt = this.workingPattern;
	let keys = this.globalKeyState;
	let len = p.pattern.length - 1;
	let msg = null;

	if (p.countPatternUsage(pt) > 0) {
		msg = i18n.dialog.pattern.delete.msg.used;
	}
	if (pt !== len) {
		msg = i18n.dialog.pattern.delete.msg.notlast;
	}
	if (!msg) {
		msg = i18n.dialog.pattern.delete.msg.sure;
	}

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.pattern.delete.title,
		text: msg,
		buttons: 'yesno',
		style: (pt !== len) ? 'warning' : 'info',
		callback: (btn) => {
			keys.inDialog = false;
			if (btn !== 'yes') {
				return;
			}

			for (let i = 0, l = p.position.length, pos, chn; i < l; i++) {
				for (pos = p.position[i], chn = 0; chn < 6; chn++) {
					if (pos.ch[chn].pattern === pt) {
						pos.ch[chn].pattern = 0;
					}
					else if (pos.ch[chn].pattern > pt) {
						pos.ch[chn].pattern--;
					}
				}
			}

			p.pattern.splice(pt, 1);
			if (pt === len) {
				pt--;
			}

			app.workingPattern = pt;
			app.updatePanelInfo();
			app.updatePanelPattern();
			app.updatePanelPosition();
			app.updateTracklist();
			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatClean = function() {
	if (this.modePlay || !this.workingPattern) {
		return;
	}

	let app = this;
	let keys = this.globalKeyState;
	let pt = this.player.pattern[this.workingPattern].data;

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.pattern.clean.title,
		text: i18n.dialog.pattern.clean.msg,
		buttons: 'yesno',
		style: 'info',
		callback: (btn) => {
			keys.inDialog = false;
			if (btn !== 'yes') {
				return;
			}

			pt.forEach(line => {
				line.tone = 0;
				line.release = false;
				line.smp = 0;
				line.orn = 0;
				line.orn_release = false;
				line.volume.byte = 0;
				line.cmd = 0;
				line.cmd_data = 0;
			});

			app.updatePanelInfo();
			app.updateTracklist();
			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatInfo = function() {
	// TODO
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosCreate = function() {
	if (this.modePlay) {
		return;
	}

	let p = this.player;
	let total = p.position.length;
	let current = p.position[p.currentPosition] || p.nullPosition;

	p.addNewPosition(current.length, current.speed);
	p.currentPosition = total;
	p.currentLine = 0;

	this.updatePanelInfo();
	this.updatePanelPosition();
	this.updateTracklist();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosInsert = function() {
	if (this.modePlay) {
		return;
	}
	if (!this.player.position.length) {
		return this.onCmdPosCreate();
	}

	let p = this.player, chn;
	let i = p.currentPosition;
	let current = p.position[i] || p.nullPosition;
	let pt = p.addNewPosition(current.length, current.speed, false);

	for (chn = 0; chn < 6; chn++) {
		pt.ch[chn].pattern = current.ch[chn].pattern;
		pt.ch[chn].pitch = current.ch[chn].pitch;
	}

	p.position.splice(i, 0, pt);
	p.countPositionFrames(i);
	p.storePositionRuntime(i);
	p.currentLine = 0;

	this.updatePanelInfo();
	this.updatePanelPattern();
	this.updatePanelPosition();
	this.updateTracklist();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosDelete = function() {
	if (this.modePlay || !this.player.position.length) {
		return;
	}

	let keys = this.globalKeyState;
	let pos = this.player.currentPosition;
	let app = this;

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.position.delete.title,
		text: i18n.dialog.position.delete.msg,
		buttons: 'yesno',
		style: 'info',
		callback: (btn) => {
			keys.inDialog = false;
			if (btn !== 'yes') {
				return;
			}

			app.player.currentLine = 0;
			app.player.position.splice(pos, 1);
			if (pos >= app.player.position.length) {
				app.player.currentPosition--;
			}

			app.updatePanelInfo();
			app.updatePanelPattern();
			app.updatePanelPosition();
			app.updateTracklist();
			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosMoveUp = function() {
	let p = this.player;
	let i = p.currentPosition;
	let swap = p.position[i];

	if (this.modePlay || !p.position.length || !i) {
		return;
	}

	p.position[i] = p.position[--i];
	p.position[i] = swap;

	p.currentPosition = i;
	p.currentLine = 0;

	this.updatePanelInfo();
	this.updatePanelPosition();
	this.updateTracklist();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosMoveDown = function() {
	let p = this.player;
	let i = p.currentPosition;
	let total = p.position.length;
	let swap = p.position[i];

	if (this.modePlay || !total || i === (total - 1)) {
		return;
	}

	p.position[i] = p.position[++i];
	p.position[i] = swap;

	p.currentPosition = i;
	p.currentLine = 0;

	this.updatePanelInfo();
	this.updatePanelPosition();
	this.updateTracklist();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpPlay = function() {
	this.player.playSample(this.workingSample, 0, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpClear = function() {
	let app = this;
	let smp = this.player.sample[this.workingSample];

	this.globalKeyState.inDialog = true;

	$('#dialoque').confirm({
		title: i18n.dialog.sample.clear.title,
		text: i18n.dialog.sample.clear.msg,
		style: 'warning',
		buttons:  [
			{ caption: i18n.dialog.sample.clear.options[0], id: 7 },
			{ caption: i18n.dialog.sample.clear.options[1], id: 1 },
			{ caption: i18n.dialog.sample.clear.options[2], id: 2 },
			{ caption: i18n.dialog.sample.clear.options[3], id: 4 },
			{ caption: i18n.dialog.sample.clear.options[4], id: 'cancel' }
		],
		callback: (mask) => {
			app.globalKeyState.inDialog = false;
			if (mask === 'cancel') {
				return;
			}

			smp.data.forEach(tick => {
				if (mask & 1) {
					tick.volume.byte = 0;
					tick.enable_freq = false;
				}
				if (mask & 2) {
					tick.enable_noise = false;
					tick.noise_value = 0;
				}
				if (mask & 4) {
					tick.shift = 0;
				}
			});

			let all = (mask === 7);
			if (all) {
				smp.name = '';
				smp.loop = 0;
				smp.end = 0;
				smp.releasable = false;
			}

			app.updateSampleEditor(all);
			if (mask & 4) {
				app.smpornedit.updateSamplePitchShift();
			}

			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpSwap = function() {
	let smp = this.player.sample[this.workingSample];

	smp.data.forEach(tick => {
		let swap = tick.volume.L;
		tick.volume.L = tick.volume.R;
		tick.volume.R = swap;
	});

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolUp = function() {
	let smp = this.player.sample[this.workingSample];

	smp.data.forEach(tick => {
		if ((i <  smp.end && tick.volume.L < 15) ||
			(i >= smp.end && tick.volume.L > 0 && tick.volume.L < 15)) {

			tick.volume.L++;
		}
	});

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolDown = function() {
	let smp = this.player.sample[this.workingSample];

	smp.data.forEach(tick => {
		if (tick.volume.L > 0) {
			tick.volume.L--;
		}
	});

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolUp = function() {
	let smp = this.player.sample[this.workingSample];

	smp.data.forEach(tick => {
		if ((i <  smp.end && tick.volume.R < 15) ||
			(i >= smp.end && tick.volume.R > 0 && tick.volume.R < 15)) {

			tick.volume.R++;
		}
	});

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolDown = function() {
	let smp = this.player.sample[this.workingSample];

	smp.data.forEach(tick => {
		if (tick.volume.R > 0) {
			tick.volume.R--;
		}
	});

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyLR = function() {
	let smp = this.player.sample[this.workingSample];

	smp.data.forEach(tick => (tick.volume.R = tick.volume.L));

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyRL = function() {
	let smp = this.player.sample[this.workingSample];

	smp.data.forEach(tick => (tick.volume.L = tick.volume.R));

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotL = function() {
	let smp = this.player.sample[this.workingSample];
	let data = smp.data;
	let backup = $.extend(true, {}, data[i]);

	for (let i = 0; i < 256; i++) {
		let ref = (i < 255) ? data[i + 1] : backup;

		data[i].volume.byte  = ref.volume.byte;
		data[i].enable_freq  = ref.enable_freq;
		data[i].enable_noise = ref.enable_noise;
		data[i].noise_value  = ref.noise_value;
		data[i].shift        = ref.shift;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotR = function() {
	let smp = this.player.sample[this.workingSample];
	let data = smp.data;
	let backup = $.extend(true, {}, data[i]);

	for (let i = 255; i >= 0; i--) {
		let ref = (i > 0) ? data[i - 1] : backup;

		data[i].volume.byte  = ref.volume.byte;
		data[i].enable_freq  = ref.enable_freq;
		data[i].enable_noise = ref.enable_noise;
		data[i].noise_value  = ref.noise_value;
		data[i].shift        = ref.shift;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpEnable = function() {
	let smp = this.player.sample[this.workingSample];

	smp.data.forEach(tick => {
		if (!!tick.volume.byte) {
			tick.enable_freq = true;
		}
	});

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpDisable = function() {
	let smp = this.player.sample[this.workingSample];

	smp.data.forEach(tick => tick.enable_freq = false);

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnPlay = function() {
	this.player.playSample(this.workingOrnTestSample, this.workingOrnament, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnClear = function() {
	let keys = this.globalKeyState;
	let orn = this.player.ornament[this.workingOrnament];
	let app = this;

	keys.inDialog = true;
	$('#dialoque').confirm({
		title: i18n.dialog.ornament.clear.title,
		text: i18n.dialog.ornament.clear.msg,
		style: 'warning',
		buttons: 'yesno',
		callback: (btn) => {
			keys.inDialog = false;
			if (btn !== 'yes') {
				return;
			}

			orn.name = '';
			orn.data.fill(0);
			orn.loop = orn.end = 0;

			app.smpornedit.updateOrnamentEditor(true);
			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnShiftLeft = function() {
	let orn = this.player.ornament[this.workingOrnament];
	let data = orn.data;

	for (let i = 0, ref = data[i]; i < 256; i++) {
		data[i] = (i < 255) ? data[i + 1] : ref;
	}

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnShiftRight = function() {
	let orn = this.player.ornament[this.workingOrnament];
	let data = orn.data;

	for (let i = 255, ref = data[i]; i >= 0; i--) {
		data[i] = (i > 0) ? data[i - 1] : ref;
	}

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransUp = function() {
	let orn = this.player.ornament[this.workingOrnament];

	for (let i = 0, l = orn.end; i < l; i++) {
		orn.data[i]++;
	}

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransDown = function() {
	let orn = this.player.ornament[this.workingOrnament];

	for (let i = 0, l = orn.end; i < l; i++) {
		orn.data[i]--;
	}

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnCompress = function() {
	let orn = this.player.ornament[this.workingOrnament];
	let data = orn.data;
	let i = 0;

	for (let k = 0; k < 256; i++, k += 2) {
		data[i] = data[k];
	}
	data.fill(0, i);

	orn.loop >>= 1;
	orn.end >>= 1;

	this.smpornedit.updateOrnamentEditor(true);
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnExpand = function() {
	let orn = this.player.ornament[this.workingOrnament];
	let data = orn.data;

	for (let i = 127, k = 256; k > 0; i--) {
		data[--k] = data[i];
		data[--k] = data[i];
	}

	orn.loop <<= 1;
	orn.end <<= 1;

	this.smpornedit.updateOrnamentEditor(true);
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
