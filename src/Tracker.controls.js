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
	var int = this.settings.audioInterrupt,
		buf, pos = null, posi = null,
		total = 0, current = 0,
		p = this.player.currentPosition,
		len = this.player.position.length,
		line = this.player.currentLine,
		even = line & -2,
		bpm, i = int * 60;

	if (len) {
		pos = this.player.position[p];
		bpm = (i / (pos.frames[even + 2] - pos.frames[even])) >> 1;

		for (i = 0; i < len; i++) {
			posi = this.player.position[i];
			if (i === p)
				current = total;
			total += posi.frames[posi.length];
		}

		current += pos.frames[line];

		i = total.toString().length;
		buf = '(' + current.toWidth(i) + '/' + total.toWidth(i) + ')';
		$('#stInfoPanelFrames').text(buf);

		current /= int;
		total /= int;
		buf = (current / 60).toWidth(2) + ':' +
		      (current % 60).toWidth(2) + ' / ' +
		        (total / 60).toWidth(2) + ':' +
		        (total % 60).toWidth(2);

		$('#stInfoPanelTime').text(buf);
	}
	else {
		$('#stInfoPanelTime').text('00:00 / 00:00');
		$('#stInfoPanelFrames').text('(0/0)');

		bpm = (i / this.player.currentSpeed) >> 2;
	}
	$('#stInfoPanelBPM').text('BPM: ' + bpm + ' (' + int + ' Hz)');
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
}
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
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlay = function () {
	if (this.globalKeyState.lastPlayMode === 2)
		return;
	this.modePlay = this.player.playPosition(false, true, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdSongPlayStart = function () {
	this.modePlay = this.player.playPosition(true, true, true);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlay = function () {
	if (this.globalKeyState.lastPlayMode === 1)
		return;
	this.modePlay = this.player.playPosition(false, false, false);
};
//---------------------------------------------------------------------------------------
Tracker.prototype.onCmdPosPlayStart = function () {
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

	if (state)
		el.addClass('edit');
	else
		el.removeClass('edit');

	this.updateTracklist(true);
};
//---------------------------------------------------------------------------------------
