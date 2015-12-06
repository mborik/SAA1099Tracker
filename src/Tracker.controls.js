/** Tracker.controls submodule */
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanels = function () {
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
Tracker.prototype.updateEditorCombo = function (step) {
	if (step === void 0) {
		this.player.playLine();
		step = this.ctrlRowStep;
	}

	this.tracklist.moveCurrentline(step);
	this.updateTracklist();
	this.updatePanelInfo();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelInfo = function () {
	var p = this.player,
		el = $('#stInfoPanel u'),
		int = this.settings.audioInterrupt,
		total = 0, current = 0,
		curpos = p.currentPosition,
		len = p.position.length,
		pos = p.position[curpos],
		posi = null,
		line = p.currentLine,
		even = line & -2,
		bpm, i = int * 60;

	if (len) {
		bpm = (i / (pos.frames[even + 2] - pos.frames[even])) >> 1;

		for (i = 0; i < len; i++) {
			posi = p.position[i];
			if (i === curpos)
				current = total;
			total += posi.frames[posi.length];
		}

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
	var a = [ '#scPattern', '#scPatternLen', '#btPatternDelete', '#btPatternClean', '#btPatternInfo'],
		lastState = $(a[0]).prop('disabled'),
		pat = this.workingPattern,
		len = this.player.pattern.length,
		min = 0, max = 0,
		d = true, i;

	len--;
	if (len) {
		min = 1;
		max = len;
		pat = Math.max(Math.min(pat, max), min);
	}
	else
		pat = 0;

	for (i = 1; i <= 6; i++)
		$('#scChnPattern' + i).trigger('touchspin.updatesettings', { min: 0, max: max });

	if (pat) {
		d = false;
		$(a[1]).val(this.player.pattern[pat].end);
	}
	else
		$(a[1]).val(64);

	this.workingPattern = pat;
	$(a[0]).trigger('touchspin.updatesettings', { min: min, max: max, initval: pat }).val(pat);

	$('#txPatternUsed').val(this.player.countPatternUsage(pat));
	$('#txPatternTotal').val(len);

	if (d !== lastState) {
		for (i = 0, len = a.length; i < len; i++)
			$(a[i] + ',' + a[i] + '~span>button').prop('disabled', d);
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.updatePanelPosition = function () {
	var a = [ '#scPosCurrent', '#scPosLength', '#scPosSpeed', '#txPosTotal', '#scPosRepeat' ],
		lastState = $(a[0]).prop('disabled'),
		pos = this.player.nullPosition, buf,
		len = this.player.position.length,
		p = this.player.currentPosition,
		d = true, i;

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

	for (i = 0; i < 6; i++) {
		a.push((buf = '#scChnPattern' + (i + 1)));
		$(buf).val(pos.ch[i].pattern);

		a.push((buf = '#scChnTrans' + (i + 1)));
		$(buf).val(pos.ch[i].pitch);
	}

	if (d !== lastState) {
		a.splice(3, 1);
		for (i = 0, len = a.length; i < len; i++)
			$(a[i] + ',' + a[i] + '~span>button').prop('disabled', d);
	}

	pos = null;
};
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Tracker.prototype.onCmdFileNew = function () {
	var file = this.file;
	if (this.modePlay || !file.yetSaved && !file.modified && !file.fileName)
		return;

	$('#dialoque').confirm({
		title: 'Create new file\u2026',
		text: 'Do you really want to clear all song data and lost all of your changes?',
		buttons: 'yesno',
		style: 'danger',
		callback: function (btn) {
			if (btn !== 'yes')
				return;
			file.new();
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileOpen = function () {
	if (this.modePlay)
		return;

	var file = this.file;
	if (file.modified) {
		$('#dialoque').confirm({
			title: 'Open file\u2026',
			text: 'You should lost all of your changes! Do you really want to continue?',
			buttons: 'yesno',
			style: 'warning',
			callback: function (btn) {
				if (btn !== 'yes')
					return;
				file.dialog('load');
			}
		});
	}
	else
		file.dialog('load');
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdFileSave = function (as) {
	if (this.modePlay || !this.player.position.length)
		return;

	var file = this.file;
	if (as || !file.yetSaved || file.modified)
		file.dialog('save');
	else if (!as && file.yetSaved && file.fileName)
		file.saveFile(file.fileName, $('#stInfoPanel u:eq(3)').text());
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdStop = function () {
	this.player.stopChannel();
	this.modePlay = false;
	this.globalKeyState.lastPlayMode = 0;

	if (this.activeTab === 0)
		this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlay = function () {
	if (this.globalKeyState.lastPlayMode === 2)
		return;
	if (this.activeTab === 0)
		this.doc.setStatusText();
	if (this.modeEdit)
		this.player.storePositionRuntime(this.player.currentPosition);
	this.modePlay = this.player.playPosition(false, true, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlayStart = function () {
	if (this.activeTab === 0)
		this.doc.setStatusText();
	if (this.modeEdit)
		this.player.storePositionRuntime(this.player.currentPosition);
	this.modePlay = this.player.playPosition(true, true, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlay = function () {
	if (this.globalKeyState.lastPlayMode === 1)
		return;
	if (this.activeTab === 0)
		this.doc.setStatusText();
	if (this.modeEdit)
		this.player.storePositionRuntime(this.player.currentPosition);
	this.modePlay = this.player.playPosition(false, false, false);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlayStart = function () {
	if (this.activeTab === 0)
		this.doc.setStatusText();
	if (this.modeEdit)
		this.player.storePositionRuntime(this.player.currentPosition);
	this.modePlay = this.player.playPosition(false, false, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleLoop = function (newState) {
	var state = (typeof newState === 'boolean') ? newState : (this.player.loopMode = !this.player.loopMode),
		el = $('a#miToggleLoop>span'),
		icon1 = 'glyphicon-repeat', icon2 = 'glyphicon-remove-circle',
		glyph = state ? icon1 : icon2,
		color = state ? '#000' : '#ccc';

	el.removeClass(icon1 + ' ' + icon2);
	el.addClass(glyph).css({ 'color': color });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleEditMode = function (newState) {
	var state = (typeof newState === 'boolean') ? newState : (this.modeEdit = !this.modeEdit),
		el = $('.tracklist-panel');

	if (!state) {
		this.doc.setStatusText();
		this.player.storePositionRuntime(this.player.currentPosition);
	}

	el[state ? 'addClass' : 'removeClass']('edit');
	this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdShowDocumentation = function (name) {
	var filename = 'doc/' + name + '.txt',
		cache = this.doc.txtCache,
		data = cache[name],

		dialog = $('#documodal'),
		button = $('<button/>').attr({
			'type': 'button',
			'class': 'close',
			'data-dismiss': 'modal'
		}).text('\xd7');

	if (!!data)
		dialog.modal('show')
			.on('hidden.bs.modal', function () { $(this).find('.modal-body').empty() })
			.find('.modal-body')
			.html(data)
			.prepend(button);

	else {
		$.ajax(filename, {
			cache: true,
			contentType: 'text/plain',
			dataType: 'text',
			isLocal: true,
			success: function (data) {
				data = ('<pre>\n' + data + '</pre>')
					.replace(/\s*?^\=\=\s*([^\=]+?)\s*[\=\s]+$/gm, '</pre><h3>$1</h3><pre>')
					.replace(/<pre><\/pre>/g, '');

				cache[name] = data;
				dialog.modal('show')
					.on('hidden.bs.modal', function () { $(this).find('.modal-body').empty() })
					.find('.modal-body')
					.html(data)
					.prepend(button);
			}
		});
	}
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdAbout = function () {
	var dialog = $('#about'),
		data = dialog.data();

	if (!data.hasOwnProperty('bs.modal'))
		dialog.find('.ver').text('v' + this.version);

	dialog.modal('toggle');
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatCreate = function () {
	if (this.modePlay)
		return;

	var id = this.player.addNewPattern(),
		pt = this.player.pattern[id],
		len = (this.workingPattern && this.player.pattern[this.workingPattern].end) || 64;

	pt.end = len;
	this.workingPattern = id;
	this.updatePanelPattern();
	this.file.modified = true;

	$('#scPatternLen').focus();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatDelete = function () {
	if (this.modePlay || !this.workingPattern)
		return;

	var app = this,
		p = this.player,
		pt = this.workingPattern,
		len = p.pattern.length - 1,
		msg = null;

	if (p.countPatternUsage(pt) > 0)
		msg = 'This pattern is used in some positions!\nAre you sure to delete it?';
	if (pt !== len)
		msg = 'This is not the last pattern in a row and there is necessary to renumber all of the next patterns in the positions!\n\nPlease, take a note that all of your undo history will be lost because of pattern/position data inconsistency that occurs with this irreversible operation.\n\nDo you really want to continue?';
	if (!msg)
		msg = 'Are you sure to delete this pattern?';

	$('#dialoque').confirm({
		title: 'Delete pattern\u2026',
		text: msg,
		buttons: 'yesno',
		style: (pt !== len) ? 'warning' : 'info',
		callback: function (btn) {
			if (btn !== 'yes')
				return;

			for (var i = 0, l = p.position.length, pos, chn; i < l; i++) {
				for (pos = p.position[i], chn = 0; chn < 6; chn++) {
					if (pos.ch[chn].pattern === pt)
						pos.ch[chn].pattern = 0;
					else if (pos.ch[chn].pattern > pt)
						pos.ch[chn].pattern--;
				}
			}

			p.pattern.splice(pt, 1);
			if (pt === len)
				pt--;

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
Tracker.prototype.onCmdPatClean = function () {
	if (this.modePlay || !this.workingPattern)
		return;

	var app = this,
		pt = this.player.pattern[this.workingPattern].data;

	$('#dialoque').confirm({
		title: 'Clean pattern\u2026',
		text: 'Are you ready to clean a content of this pattern?',
		buttons: 'yesno',
		style: 'info',
		callback: function (btn) {
			if (btn !== 'yes')
				return;

			for (var i = 0, data = pt[i]; i < Player.maxPatternLen; i++, data = pt[i]) {
				data.tone = 0;
				data.release = false;
				data.smp = 0;
				data.orn = 0;
				data.orn_release = false;
				data.volume.byte = 0;
				data.cmd = 0;
				data.cmd_data = 0;
			}

			app.updatePanelInfo();
			app.updateTracklist();
			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatInfo = function () {
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosCreate = function () {
	if (this.modePlay)
		return;

	var p = this.player,
		total = p.position.length,
		current = p.position[p.currentPosition] || p.nullPosition;

	p.addNewPosition(current.length, current.speed);
	p.currentPosition = total;
	p.currentLine = 0;

	this.updatePanelInfo();
	this.updatePanelPosition();
	this.updateTracklist();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosInsert = function () {
	if (this.modePlay)
		return;
	if (!this.player.position.length)
		return this.onCmdPosCreate();

	var p = this.player, chn,
		i = p.currentPosition,
		current = p.position[i] || p.nullPosition,
		pt = p.addNewPosition(current.length, current.speed, false);

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
Tracker.prototype.onCmdPosDelete = function () {
	if (this.modePlay || !this.player.position.length)
		return;

	var app = this;
	$('#dialoque').confirm({
		title: 'Delete position\u2026',
		text: 'Are you ready to delete this position?',
		buttons: 'yesno',
		style: 'info',
		callback: function (btn) {
			if (btn !== 'yes')
				return;

			app.player.position.splice(app.player.currentPosition, 1);
			app.player.currentLine = 0;

			app.updatePanelInfo();
			app.updatePanelPattern();
			app.updatePanelPosition();
			app.updateTracklist();
			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosMoveUp = function () {
	var p = this.player,
		i = p.currentPosition,
		swap = p.position[i];

	if (this.modePlay || !p.position.length || !i)
		return;

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
Tracker.prototype.onCmdPosMoveDown = function () {
	var p = this.player,
		i = p.currentPosition,
		total = p.position.length,
		swap = p.position[i];

	if (this.modePlay || !total || i === (total - 1))
		return;

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
Tracker.prototype.onCmdSmpPlay = function () {
	this.player.playSample(this.workingSample, 0, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpClear = function () {
	var app = this,
		smp = this.player.sample[this.workingSample];

	$('#dialoque').confirm({
		title: 'Clear sample\u2026',
		text: 'Which sample data do you want to clear?',
		style: 'warning',
		buttons:  [
			{ caption: 'All', id: 7 },
			{ caption: 'Amplitude', id: 1 },
			{ caption: 'Noise', id: 2 },
			{ caption: 'Pitch-shift', id: 4 },
			{ caption: 'Cancel', id: 'cancel' }
		],
		callback: function (mask) {
			if (mask === 'cancel')
				return;

			var data = smp.data, i,
				all = (mask === 7);

			for (i = 0; i < 256; i++) {
				if (mask & 1) {
					data[i].volume.byte = 0;
					data[i].enable_freq = false;
				}
				if (mask & 2) {
					data[i].enable_noise = false;
					data[i].noise_value = 0;
				}
				if (mask & 4)
					data[i].shift = 0;
			}

			if (all) {
				smp.name = '';
				smp.loop = 0;
				smp.end = 0;
				smp.releasable = false;
			}

			app.updateSampleEditor(all);
			if (mask & 4)
				app.smpornedit.updateSamplePitchShift();

			app.file.modified = true;
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpSwap = function () {
	for (var data = this.player.sample[this.workingSample].data, swap, i = 0; i < 256; i++) {
		swap = data[i].volume.L;
		data[i].volume.L = data[i].volume.R;
		data[i].volume.R = swap;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolUp = function () {
	for (var smp = this.player.sample[this.workingSample], data = smp.data, i = 0; i < 256; i++) {
		if ((i <  smp.end && data[i].volume.L < 15) ||
			(i >= smp.end && data[i].volume.L > 0 && data[i].volume.L < 15))
				data[i].volume.L++;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolDown = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		if (data[i].volume.L > 0)
			data[i].volume.L--;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolUp = function () {
	for (var smp = this.player.sample[this.workingSample], data = smp.data, i = 0; i < 256; i++) {
		if ((i <  smp.end && data[i].volume.R < 15) ||
			(i >= smp.end && data[i].volume.R > 0 && data[i].volume.R < 15))
				data[i].volume.R++;
	}

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolDown = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		if (data[i].volume.R > 0)
			data[i].volume.R--;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyLR = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		data[i].volume.R = data[i].volume.L;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyRL = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		data[i].volume.L = data[i].volume.R;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotL = function () {
	var i = 0, ref,
		data = this.player.sample[this.workingSample].data,
		backup = $.extend(true, {}, data[i]);

	for (; i < 256; i++) {
		ref = (i < 255) ? data[i + 1] : backup;

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
Tracker.prototype.onCmdSmpRotR = function () {
	var i = 255, ref,
		data = this.player.sample[this.workingSample].data,
		backup = $.extend(true, {}, data[i]);

	for (; i >= 0; i--) {
		ref = (i > 0) ? data[i - 1] : backup;

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
Tracker.prototype.onCmdSmpEnable = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		if (!!data[i].volume.byte)
			data[i].enable_freq = true;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpDisable = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		data[i].enable_freq = false;

	this.updateSampleEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnPlay = function () {
	this.player.playSample(this.workingOrnTestSample, this.workingOrnament, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnClear = function () {
	var orn = this.player.ornament[this.workingOrnament];

	orn.name = '';
	orn.data.fill(0);
	orn.loop = orn.end = 0;

	this.smpornedit.updateOrnamentEditor(true);
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnShiftLeft = function () {
	var i = 0,
		data = this.player.ornament[this.workingOrnament].data,
		ref = data[i];

	for (; i < 256; i++)
		data[i] = (i < 255) ? data[i + 1] : ref;

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnShiftRight = function () {
	var i = 255,
		data = this.player.ornament[this.workingOrnament].data,
		ref = data[i];

	for (; i >= 0; i--)
		data[i] = (i > 0) ? data[i - 1] : ref;

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransUp = function () {
	for (var orn = this.player.ornament[this.workingOrnament], l = orn.end, i = 0; i < l; i++)
		orn.data[i]++;

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnTransDown = function () {
	for (var orn = this.player.ornament[this.workingOrnament], l = orn.end, i = 0; i < l; i++)
		orn.data[i]--;

	this.smpornedit.updateOrnamentEditor();
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnCompress = function () {
	var orn = this.player.ornament[this.workingOrnament],
		data = orn.data,
		i = 0, k = 0;

	for (; k < 256; i++, k += 2)
		data[i] = data[k];
	data.fill(0, i);

	orn.loop >>= 1;
	orn.end >>= 1;

	this.smpornedit.updateOrnamentEditor(true);
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdOrnExpand = function () {
	var orn = this.player.ornament[this.workingOrnament],
		data = orn.data,
		i = 127, k = 256;

	for (; k > 0; i--) {
		data[--k] = data[i];
		data[--k] = data[i];
	}

	orn.loop <<= 1;
	orn.end <<= 1;

	this.smpornedit.updateOrnamentEditor(true);
	this.file.modified = true;
};
//---------------------------------------------------------------------------------------
