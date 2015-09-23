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
	this.tracklist.moveCurrentline(step || this.ctrlRowStep);
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
		el[4].innerText = current.toWidth(i);
		el[5].innerText = total.toWidth(i);

		el[2].innerText = (current / int).toTimeString();
		el[3].innerText = (total / int).toTimeString();
	}
	else {
		bpm = (i / this.player.currentSpeed) >> 2;

		el[2].innerText = el[3].innerText = (0).toTimeString();
		el[4].innerText = el[5].innerText = '0';
	}

	el[0].innerText = bpm;
	el[1].innerText = int;
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
	this.modePlay = this.player.playPosition(false, true, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlayStart = function () {
	if (this.activeTab === 0)
		this.doc.setStatusText();
	this.modePlay = this.player.playPosition(true, true, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlay = function () {
	if (this.globalKeyState.lastPlayMode === 1)
		return;
	if (this.activeTab === 0)
		this.doc.setStatusText();
	this.modePlay = this.player.playPosition(false, false, false);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlayStart = function () {
	if (this.activeTab === 0)
		this.doc.setStatusText();
	this.modePlay = this.player.playPosition(false, false, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleLoop = function () {
	var state = (this.player.loopMode = !this.player.loopMode),
		el = $('a#miToggleLoop>span'),
		icon1 = 'glyphicon-repeat', icon2 = 'glyphicon-remove-circle',
		glyph = state ? icon1 : icon2,
		color = state ? '#000' : '#ccc';

	el.removeClass(icon1 + ' ' + icon2);
	el.addClass(glyph).css({ 'color': color });
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdToggleEditMode = function () {
	var state = (this.modeEdit = !this.modeEdit),
		el = $('.tracklist-panel');

	if (!state)
		this.doc.setStatusText();

	el[state ? 'addClass' : 'removeClass']('edit');
	this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdShowDocumentation = function (name, title) {
	var filename = 'doc/' + name + '.txt',
		modal = $('#documodal'),
		cache = this.doc.txtCache,
		data = cache[name];

	if (!!data) {
		modal.find('.modal-title').text(title);
		modal.modal('show').find('pre').text(data);
	}
	else {
		$.ajax(filename, {
			contentType: 'text/plain',
			dataType: 'text',
			success: function(data) {
				cache[name] = data.trim();

				modal.find('.modal-title').text(title);
				modal.modal('show').find('pre').text(data);
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

	$('#scPatternLen').focus();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatDelete = function () {
	if (this.modePlay || !this.workingPattern)
		return;

	var i, l,
		pt = this.workingPattern,
		len = this.player.pattern.length - 1,
		chn, pos, msg = null;

	if (this.player.countPatternUsage(pt) > 0)
		msg = 'This pattern is used in some positions!\nAre you sure to delete it?';
	if (pt !== len)
		msg = 'This is not the last pattern in a row and there is necessary to renumber all of the next patterns in the positions!\n\nPlease, take a note that all of your undo history will be lost because of pattern/position data inconsistency that occurs with this irreversible operation.\n\nDo you really want to continue?';
	if (!msg)
		msg = 'Are you sure to delete this pattern?';
	// TODO prompt bootstrap dialog

	for (i = 0, l = this.player.position.length; i < l; i++) {
		for (pos = this.player.position[i], chn = 0; chn < 6; chn++) {
			if (pos.ch[chn].pattern === pt)
				pos.ch[chn].pattern = 0;
			else if (pos.ch[chn].pattern > pt)
				pos.ch[chn].pattern--;
		}
	}

	this.player.pattern.splice(pt, 1);
	if (pt === len)
		pt--;

	this.workingPattern = pt;
	this.updatePanelInfo();
	this.updatePanelPattern();
	this.updatePanelPosition();
	this.updateTracklist();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPatClean = function () {
	if (this.modePlay || !this.workingPattern)
		return;

	for (var pt = this.player.pattern[this.workingPattern].data,
	         i = 0, data = pt[i]; i < 96; i++, data = pt[i]) {
		data.tone = 0;
		data.release = false;
		data.smp = 0;
		data.orn = 0;
		data.orn_release = false;
		data.volume.byte = 0;
		data.cmd = 0;
		data.cmd_data = 0;
	}
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
		current = p.position[p.currentPosition] || p.nullPosition,
		ps = new pPosition(current.length, current.speed);

	p.position.push(ps);
	p.countPositionFrames(total);
	p.currentPosition = total;
	p.currentLine = 0;

	this.updatePanelInfo();
	this.updatePanelPosition();
	this.updateTracklist();
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
		pt = new pPosition(current.length, current.speed);

	for (chn = 0; chn < 6; chn++) {
		pt.ch[chn].pattern = current.ch[chn].pattern;
		pt.ch[chn].pitch = current.ch[chn].pitch;
	}

	p.position.splice(i, 0, pt);
	p.countPositionFrames(i);
	p.currentLine = 0;

	this.updatePanelInfo();
	this.updatePanelPattern();
	this.updatePanelPosition();
	this.updateTracklist();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosDelete = function () {
	if (this.modePlay || !this.player.position.length)
		return;

	// TODO prompt bootstrap dialog

	this.player.position.splice(this.player.currentPosition, 1);
	this.player.currentLine = 0;

	this.updatePanelInfo();
	this.updatePanelPattern();
	this.updatePanelPosition();
	this.updateTracklist();
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
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpPlay = function () {
	this.player.playSample(this.workingSample, 0, this.workingSampleTone);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpClear = function () {
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpSwap = function () {
	for (var data = this.player.sample[this.workingSample].data, swap, i = 0; i < 256; i++) {
		swap = data[i].volume.L;
		data[i].volume.L = data[i].volume.R;
		data[i].volume.R = swap;
	}

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolUp = function () {
	for (var smp = this.player.sample[this.workingSample], data = smp.data, i = 0; i < 256; i++) {
		if ((i <  smp.end && data[i].volume.L < 15) ||
			(i >= smp.end && data[i].volume.L > 0 && data[i].volume.L < 15))
				data[i].volume.L++;
	}

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpLVolDown = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		if (data[i].volume.L > 0)
			data[i].volume.L--;

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolUp = function () {
	for (var smp = this.player.sample[this.workingSample], data = smp.data, i = 0; i < 256; i++) {
		if ((i <  smp.end && data[i].volume.R < 15) ||
			(i >= smp.end && data[i].volume.R > 0 && data[i].volume.R < 15))
				data[i].volume.R++;
	}

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRVolDown = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		if (data[i].volume.R > 0)
			data[i].volume.R--;

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyLR = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		data[i].volume.R = data[i].volume.L;

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpCopyRL = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		data[i].volume.L = data[i].volume.R;

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotL = function () {
	for (var data = this.player.sample[this.workingSample].data, ref, i = 0; i < 256; i++) {
		ref = data[(i + 1) % 256];

		data[i].volume.byte  = ref.volume.byte;
		data[i].enable_freq  = ref.enable_freq;
		data[i].enable_noise = ref.enable_noise;
		data[i].noise_value  = ref.noise_value;
		data[i].shift        = ref.shift;
	}

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpRotR = function () {
	for (var data = this.player.sample[this.workingSample].data, ref, i = 255; i >= 0; i--) {
		ref = data[(i - 1) & 255];

		data[i].volume.byte  = ref.volume.byte;
		data[i].enable_freq  = ref.enable_freq;
		data[i].enable_noise = ref.enable_noise;
		data[i].noise_value  = ref.noise_value;
		data[i].shift        = ref.shift;
	}

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpEnable = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		if (!!data[i].volume.byte)
			data[i].enable_freq = true;

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSmpDisable = function () {
	for (var data = this.player.sample[this.workingSample].data, i = 0; i < 256; i++)
		data[i].enable_freq = false;

	this.updateSampleEditor();
};
//---------------------------------------------------------------------------------------
