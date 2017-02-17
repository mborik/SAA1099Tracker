/** Tracker.gui submodule - template loader and element populator with jQuery */
//---------------------------------------------------------------------------------------
Tracker.prototype.populateGUI = function() {
	let app = this;

	let populatedElementsTable = [
		{
			global:   'document',
			method:   'contextmenu',
			handler:  e => {
				e.preventDefault();
				return false;
			}
		}, {
			global:   'window',
			method:   'resize',
			handler:  (e, force) => {
				let c = 0;
				let smpedit = app.smpornedit;

				if (app.activeTab === 0) {
					c = app.tracklist.countTracklines();
					if (c !== app.settings.tracklistLines || force) {
						app.tracklist.setHeight(c);
						app.updateTracklist(true);
					}
				}
				else if (app.activeTab === 1 &&
					smpedit.initialized &&
					!smpedit.smpeditShiftShown &&
					!!(c = $(smpedit.amp.obj).offset().left)) {

					smpedit.smpeditOffset.left = c | 0;
				}

				if (!!(c = $(document).height())) {
					$('#documodal .modal-body').css('height', (c * 0.9) | 0);
				}
			}
		}, {
			global:   'window',
			method:   'on',
			param:    'beforeunload',
			handler:  () => {
				if (electron) {
					return app.onCmdAppExit();
				}
				else if (!dev) {
					app.onCmdStop();
					return i18n.app.msg.unsaved;
				}
			}
		}, {
			global:   'window',
			method:   'on',
			param:    'keyup keydown',
			handler:  e => app.handleKeyEvent(e.originalEvent)
		}, {
			global:   'window',
			method:   'on',
			param:    'blur',
			handler:  () => {
				let o = app.globalKeyState;
				for (let key in o) {
					if (!!+key) {
						delete o[key];
						o.length--;
					}
				}
			}
		}, {
			selector: '[data-tooltip]',
			method:   'each',
			handler:  (i, el) => {
				let data = (el.dataset || $(el).data()).tooltip || '';
				let id = data.length ? data : el.id || el.htmlFor || el.name;
				let delay = /^mi/.test(id) ? 500 : 2000;
				let ttTitle = app.doc.tooltip[id];

				if (!ttTitle) {
					return;
				}

				ttTitle = ttTitle
					.replace(/\.{3}/g, '&hellip;')
					.replace(/\n/g, '<br>')
					.replace(/(\[.+?\])$/, '<kbd>$1</kbd>');

				$(el).tooltip({
					html: true,
					animation: false,
					delay: { "show": delay, "hide": 0 },
					placement: 'auto top',
					trigger: 'hover',
					title: ttTitle
				});
			}
		}, {
			selector: 'canvas',
			method:   'each',
			handler:  (i, el) => {
				let name = el.className;
				let o = app[name];

				if (name === 'tracklist') {
					o.obj = el;
					o.ctx = el.getContext('2d');
					getCompatible(o.ctx, 'imageSmoothingEnabled', true, false);

					$(el).on('focus', e => {
						if (app.player.position.length && !app.modeEdit) {
							app.onCmdToggleEditMode();
						}
					});
				}
				else if (name === 'smpornedit') {
					name = el.id.replace('smpedit_', '');

					o[name].obj = el;
					o[name].ctx = el.getContext('2d');
					getCompatible(o[name].ctx, 'imageSmoothingEnabled', true, false);
				}

				$(el).on('mousedown mouseup mousemove dblclick mousewheel DOMMouseScroll', e => {
					let delta = e.originalEvent.wheelDelta || -e.originalEvent.deltaY ||
						(e.originalEvent.type === 'DOMMouseScroll' && -e.originalEvent.detail);

					if (delta) {
						e.stopPropagation();
						e.preventDefault();

						e.delta = delta;
						e.type = 'mousewheel';
					}

					app.handleMouseEvent(name, o, e);
				});
			}
		}, {
			selector: '#main-tabpanel a[data-toggle="tab"]',
			method:   'on',
			param:    'shown.bs.tab',
			handler:  e => {
				let data = $(e.currentTarget).data();
				app.activeTab = +data.value || 0;
				$(window).trigger('resize');

				if (app.activeTab === 0) {
					$('#statusbar').show();
					$('#tracklist').focus();
				}
			}
		}, {
			selector: '#txHeaderTitle',
			method:   'change',
			handler:  e => (app.songTitle = e.currentTarget.value.trim())
		}, {
			selector: '#txHeaderAuthor',
			method:   'change',
			handler:  e => (app.songAuthor = e.currentTarget.value.trim())
		}, {
			selector: '#scOctave',
			method:   'TouchSpin',
			data: {
				initval: '2',
				min: 1, max: 8
			}
		}, {
			selector: '#scOctave',
			method:   'change',
			handler:  e => (app.ctrlOctave = +e.currentTarget.value)
		}, {
			selector: '#scAutoSmp',
			method:   'TouchSpin',
			data: {
				initval: '0',
				radix: 32,
				min: 0, max: 31
			}
		}, {
			selector: '#scAutoSmp',
			method:   'change',
			handler:  e => (app.ctrlSample = parseInt(e.currentTarget.value, 32))
		}, {
			selector: '#scAutoOrn',
			method:   'TouchSpin',
			data: {
				initval: '0',
				radix: 16,
				min: 0, max: 15
			}
		}, {
			selector: '#scAutoOrn',
			method:   'change',
			handler:  e => (app.ctrlOrnament = parseInt(e.currentTarget.value, 16))
		}, {
			selector: '#scRowStep',
			method:   'TouchSpin',
			data: {
				initval: '0',
				min: 0, max: 8
			}
		}, {
			selector: '#scRowStep',
			method:   'change',
			handler:  e => (app.ctrlRowStep = +e.currentTarget.value)
		}, {
			selector: '#scPattern,#scPosCurrent,#scPosRepeat,input[id^="scChnPattern"]',
			method:   'TouchSpin',
			data: {
				initval: '0',
				min: 0, max: 0
			}
		}, {
			selector: '#scPatternLen,#scPosLength',
			method:   'TouchSpin',
			data: {
				initval: '64',
				min: 1, max: Player.maxPatternLen
			}
		}, {
			selector: '#scPattern',
			method:   'change',
			handler:  e => {
				if (app.player.pattern.length <= 1) {
					return false;
				}

				app.workingPattern = +e.currentTarget.value;
				app.updatePanelPattern();
			}
		}, {
			selector: '#scPatternLen',
			method:   'change',
			handler:  e => {
				let el = $(e.currentTarget);
				let pp = app.player.pattern[app.workingPattern];

				if (app.player.pattern.length <= 1) {
					return false;
				}
				else if (app.modePlay) {
					el.val(pp.end);
					return false;
				}

				pp.end = +(el.val());
				app.player.countPositionFrames();
				app.updatePanelPattern();
				app.updateTracklist();
				app.updatePanelInfo();
				app.file.modified = true;
			}
		}, {
			selector: '#scPosCurrent',
			method:   'change',
			handler:  e => {
				let el = $(e.currentTarget);

				if (!app.player.position.length) {
					return false;
				}
				else if (app.modePlay) {
					el.val(app.player.currentPosition + 1);
					return false;
				}

				let pos = el.val() - 1;

				app.player.currentPosition = pos;
				app.player.currentLine = 0;

				app.player.storePositionRuntime(pos);

				app.updatePanelInfo();
				app.updatePanelPosition();
				app.updateTracklist();
			}
		}, {
			selector: '#scPosLength',
			method:   'change',
			handler:  e => {
				let el = e.currentTarget;
				let pp = app.player.currentPosition;
				let pos = app.player.position[pp];

				if (!app.player.position.length) {
					return false;
				}
				else if (app.modePlay) {
					el.value = pos.length;
					return false;
				}

				pos.length = +el.value;

				if (app.player.currentLine >= pos.length) {
					app.player.currentLine = pos.length - 1;
				}

				app.player.countPositionFrames(pp);
				app.updateTracklist();
				app.updatePanelInfo();
				app.file.modified = true;
			}
		}, {
			selector: '#scPosSpeed',
			method:   'TouchSpin',
			data: {
				initval: '6',
				min: 1, max: 31
			}
		}, {
			selector: '#scPosSpeed',
			method:   'change',
			handler:  e => {
				let el = e.currentTarget;
				let pp = app.player.currentPosition;
				let pos = app.player.position[pp];

				if (!app.player.position.length) {
					return false;
				}
				else if (app.modePlay) {
					el.value = pos.speed;
					return false;
				}

				pos.speed = +el.value;

				app.player.countPositionFrames(pp);
				app.updateTracklist();
				app.updatePanelInfo();
				app.file.modified = true;
			}
		}, {
			selector: '#scPosRepeat',
			method:   'change',
			handler:  e => {
				let el = e.currentTarget;

				if (!app.player.position.length) {
					return false;
				}
				else if (app.modePlay) {
					el.value = (app.player.repeatPosition + 1);
					return false;
				}
				else {
					app.player.repeatPosition = +el.value - 1;
				}

				app.file.modified = true;
			}
		}, {
			selector: 'input[id^="scChnPattern"]',
			method:   'change',
			handler:  e => {
				let el = e.currentTarget;
				let pp = app.player.currentPosition;
				let chn = el.id.substr(-1) - 1;
				let pos = app.player.position[pp] || app.player.nullPosition;
				let val = +el.value;
				let prev = pos.ch[chn].pattern;

				if (!app.player.position.length) {
					return false;
				}
				else if (app.modePlay) {
					el.value = prev;
					return false;
				}

				pos.ch[chn].pattern = val;

				if (app.workingPattern === val || app.workingPattern === prev) {
					app.updatePanelPattern();
				}

				app.player.countPositionFrames(pp);
				app.updateTracklist();
				app.updatePanelInfo();
				app.file.modified = true;
			}
		}, {
			selector: 'input[id^="scChnTrans"]',
			method:   'each',
			handler:  (i, el) => {
				$(el).TouchSpin({
					initval: '0',
					min: -24, max: 24
				}).change(e => {
					let el = e.currentTarget;
					let chn = el.id.substr(-1) - 1;
					let pos = app.player.position[app.player.currentPosition];

					if (!app.player.position.length) {
						return false;
					}
					else if (app.modePlay) {
						el.value = pos.ch[chn].pitch;
						return false;
					}
					else {
						pos.ch[chn].pitch = +el.value;
					}

					app.file.modified = true;
				});
			}
		}, {
			selector: 'input[id^="scChnButton"]',
			method:   'each',
			handler:  (i, el) => {
				let cc = el.id.substr(-1);
				$(el).bootstrapToggle({
					on: cc,
					off: cc,
					onstyle: 'default',
					offstyle: 'default',
					size: 'mini',
					width: 58
				}).change(e => {
					let el = e.currentTarget;
					app.player.rtSong.muted[(+el.value - 1)] = !el.checked;
				});
			}
		}, {
			selector: '#sample-tabpanel a[data-toggle="tab"]',
			method:   'on',
			param:    'shown.bs.tab',
			handler:  e => {
				let c = 0;
				let smpedit = app.smpornedit;
				let shiftShown = (e.currentTarget.id === 'tab-pitchshift');

				smpedit.smpeditShiftShown = shiftShown;
				if (shiftShown && e.relatedTarget.id === 'tab-sampledata') {
					smpedit.updateSamplePitchShift();
				}
				else if (!!(c = $(smpedit.amp.obj).offset().left)) {
					smpedit.smpeditOffset.left = c | 0;
				}
			}
		}, {
			selector: '#scSampleNumber,#scOrnTestSample',
			method:   'TouchSpin',
			data: {
				initval: '1',
				radix: 32,
				min: 1, max: 31
			}
		}, {
			selector: '#scSampleNumber',
			method:   'change',
			handler:  e => {
				app.workingSample = parseInt(e.currentTarget.value, 32);
				app.workingOrnTestSample = app.workingSample;
				app.updateSampleEditor(true);
				app.smpornedit.updateSamplePitchShift();

				$('#sbSampleScroll').scrollLeft(0);
				$('#scOrnTestSample').val(app.workingOrnTestSample.toString(32).toUpperCase());
			}
		}, {
			selector: '#scOrnTestSample',
			method:   'change',
			handler:  e => (app.workingOrnTestSample = parseInt(e.currentTarget.value, 32))
		}, {
			selector: '#scOrnNumber',
			method:   'TouchSpin',
			data: {
				initval: '1',
				radix: 16,
				min: 1, max: 15
			}
		}, {
			selector: '#scOrnNumber',
			method:   'change',
			handler:  e => {
				app.workingOrnament = parseInt(e.currentTarget.value, 16);
				app.smpornedit.updateOrnamentEditor(true);
			}
		}, {
			selector: '#txSampleName',
			method:   'change',
			handler:  e => {
				app.player.sample[app.workingSample].name = e.currentTarget.value;
				app.file.modified = true;
			}
		}, {
			selector: '#txOrnName',
			method:   'change',
			handler:  e => {
				app.player.ornament[app.workingOrnament].name = e.currentTarget.value;
				app.file.modified = true;
			}
		}, {
			selector: '#scSampleTone,#scOrnTone',
			method:   'each',
			handler:  (i, el) => {
				let cc = 'tx' + el.id.substr(2);
				$(el).TouchSpin({
					initval: app.workingSampleTone,
					min: 1, max: 96
				}).change(e => {
					let el = e.currentTarget;
					let val = +el.value;
					app.workingSampleTone = val;

					$('#scSampleTone,#scOrnTone')
						.val(val.toString())
						.prev().val(app.player.tones[val].txt);

				}).wrapAll(`<div id="${cc}"/>`)
				  .removeAttr('style')
				  .prop('readonly', true)
				  .clone(false)
				  .removeAttr('id')
				  .removeAttr('tabindex')
				  .insertBefore(el);

				$(el).trigger('change');
			}
		}, {
			selector: '#sbSampleScroll',
			method:   'scroll',
			handler:  e => {
				app.smpornedit.smpeditScroll = ((e.target.scrollLeft / 1000) * 64).abs();
				app.updateSampleEditor();
			}
		}, {
			selector: '#scSampleLength,#scSampleRepeat,#scOrnLength,#scOrnRepeat',
			method:   'TouchSpin',
			data: {
				initval: '0',
				min: 0, max: 255
			}
		}, {
			selector: '#chSampleRelease',
			method:   'change',
			handler:  e => {
				let sample = app.player.sample[app.workingSample];
				if (sample.end !== sample.loop) {
					sample.releasable = e.currentTarget.checked;
				}
				app.updateSampleEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#scSampleLength',
			method:   'change',
			handler:  e => {
				let sample = app.player.sample[app.workingSample];
				let offset = +e.currentTarget.value - sample.end;
				let looper = (sample.loop += offset);

				sample.end += offset;
				sample.loop = ((sample.end - looper) < 0) ? 0 : looper;

				app.updateSampleEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#scSampleRepeat',
			method:   'change',
			handler:  e => {
				let sample = app.player.sample[app.workingSample];
				let value = +e.currentTarget.value;

				sample.loop = sample.end - value;
				app.updateSampleEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#fxOrnChords button',
			method:   'each',
			handler:  (i, el) => {
				let id = $(el).text();
				let chord = app.smpornedit.chords[id];
				let seqtxt = JSON.stringify(chord.sequence, null, 1).replace(/^\[|\]$|\s+/g, '');

				$(el).tooltip({
					html: true,
					animation: false,
					trigger: 'hover',
					delay: { "show": 500, "hide": 0 },
					title: chord.name + `<kbd>{ ${seqtxt} }</kbd>`
				}).click(() => {
					let orn = app.player.ornament[app.workingOrnament];
					let l = chord.sequence.length;

					orn.data.fill(0);
					orn.name = chord.name;
					orn.loop = 0;
					orn.end  = l;

					for (let i = 0; i < l; i++) {
						orn.data[i] = chord.sequence[i];
					}

					app.smpornedit.updateOrnamentEditor(true);
					app.file.modified = true;
				});
			}
		}, {
			selector: '#scOrnLength',
			method:   'change',
			handler:  e => {
				let orn = app.player.ornament[app.workingOrnament];
				let offset = +e.currentTarget.value - orn.end;
				let looper = (orn.loop += offset);

				orn.end += offset;
				orn.loop = ((orn.end - looper) < 0) ? 0 : looper;

				app.smpornedit.updateOrnamentEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#scOrnRepeat',
			method:   'change',
			handler:  e => {
				let orn = app.player.ornament[app.workingOrnament];
				let value = +e.currentTarget.value;

				orn.loop = orn.end - value;
				app.smpornedit.updateOrnamentEditor(true);
				app.file.modified = true;
			}
		}, {
			selector: '#scSetTrkLines',
			method:   'TouchSpin',
			data: {
				initval: '17',
				min: 5, max: 127, step: 2
			}
		}, {
			selector: '#scSetTrkLines',
			method:   'change',
			handler:  e => (app.settings.tracklistLines = +e.currentTarget.value)
		}, {
			selector: '#scSetTrkLineHeight',
			method:   'TouchSpin',
			data: {
				initval: '9',
				min: 7, max: 15, step: 2
			}
		}, {
			selector: '#scSetTrkLineHeight',
			method:   'change',
			handler:  e => (app.settings.tracklistLineHeight = +e.currentTarget.value)
		}, {
			selector: '#chSetTrkAutosize',
			method:   'change',
			handler:  e => {
				let state = !!e.currentTarget.checked;
				app.settings.tracklistAutosize = state;

				$('label[for=scSetTrkLines]').toggleClass('disabled', state);
				$('#scSetTrkLines').toggleClass('disabled', state).prop('disabled', state);
			}
		}, {
			selector: '#chSetHexTracklist',
			method:   'change',
			handler:  e => (app.settings.hexTracklines = !!e.currentTarget.checked)
		}, {
			selector: '#chSetHexFreqShifts',
			method:   'change',
			handler:  e => (app.settings.hexSampleFreq = !!e.currentTarget.checked)
		}, {
			selector: '#rgSetAudioVolume',
			method:   'on',
			param:    'input change',
			handler:  e => {
				let el = e.currentTarget;
				app.settings.audioGain = +el.value;
				$(el).tooltip('show');
			}
		}, {
			selector: '#rgSetAudioVolume',
			method:   'tooltip',
			data: {
				animation: false,
				trigger: 'hover',
				placement: 'right',
				delay: { "show": 0, "hide": 500 },
				title: function() {
					return `${this.value}%`;
				}
			}
		}, {
			selector: '#rgSetAudioBuffers',
			method:   'on',
			param:    'input change',
			handler:  e => {
				let el = e.currentTarget;
				app.settings.audioBuffers = +el.value;
				app.settings.updateLatencyInfo();
			}
		}, {
			selector: 'input[name=rdSetAudioInt]',
			method:   'on',
			param:    'input change',
			handler:  e => {
				let el = e.currentTarget;
				app.settings.audioInterrupt = +el.value;
				app.settings.updateLatencyInfo();
			}
		}, {
			selector: 'a[id^="mi"]', // all menu items
			method:   'click',
			handler:  e => {
				let el = e.currentTarget;
				let name = el.id.replace(/^mi/, 'onCmd');

				if (app[name]) {
					app[name]();
				}
				else if (name === 'onCmdFileSaveAs') {
					app.onCmdFileSave(true);
				}
				else if (el.id.match(/^miFileImportDemo/)) {
					let fn = $(el).data().filename;
					if (!fn || app.modePlay || app.globalKeyState.lastPlayMode) {
						return false;
					}
					app.file.loadDemosong(fn);
				}
				else if (el.id.match(/^miHelp/)) {
					let fn = $(el).data().filename;
					if (!fn) {
						return false;
					}
					app.onCmdShowDocumentation(fn);
				}
				else {
					return false;
				}
			}
		}, {
			selector: 'button[id^="btPattern"]',
			method:   'click',
			handler:  e => {
				let id = e.currentTarget.id;
				let name = id.replace(/^btPattern/, 'onCmdPat');
				if (app[name]) {
					app[name]();
				}
			}
		}, {
			selector: 'button[id^="btPos"]',
			method:   'click',
			handler:  e => {
				let id = e.currentTarget.id;
				let name = id.replace(/^bt/, 'onCmd');
				if (app[name]) {
					app[name]();
				}
			}
		}, {
			selector: 'button[id^="btSample"]',
			method:   'click',
			handler:  e => {
				let id = e.currentTarget.id;
				let name = id.replace('btSample', 'onCmdSmp');
				if (name.match(/Stop$/)) {
					return app.onCmdStop();
				}
				if (app[name]) {
					app[name]();
				}
			}
		}, {
			selector: 'button[id^="btOrn"]',
			method:   'click',
			handler:  e => {
				let id = e.currentTarget.id;
				let name = id.replace('btOrn', 'onCmdOrn');
				if (name.match(/Stop$/)) {
					return app.onCmdStop();
				}
				if (app[name]) {
					app[name]();
				}
			}
		}
	];

//---------------------------------------------------------------------------------------
	console.log('Tracker.gui', 'Populating elements...');

	populatedElementsTable.forEach(o => {
		let data = o.handler || o.data;
		let selector = o.selector || (o.global && window[o.global]);

		if (selector && o.method) {
			if (o.param) {
				$(selector)[o.method](o.param, data);
			}
			else {
				$(selector)[o.method](data);
			}
		}
	});
};
//---------------------------------------------------------------------------------------
Tracker.prototype.initializeGUI = function() {
	let initSteps = [
		function() {
			let pixelfont = $('img.pixelfont')[0];
			this.initPixelFont(pixelfont);
			return true;
		},
		function() {
			if (this.smpornedit.initialized || this.activeTab === 1) {
				return false;
			}

			console.log('Tracker.gui', 'Force initialization of Sample/Ornament editors...');
			this.smpornedit.img = $('img.smpedit')[0];
			$('#tab-smpedit').tab('show');
			return true;
		},
		function() {
			if (this.smpornedit.initialized || !this.smpornedit.img || this.activeTab !== 1) {
				return false;
			}

			this.smpornedit.init();
			$('#tab-ornedit').tab('show');
			return true;
		},
		function() {
			if (this.tracklist.initialized || !this.pixelfont.ctx || this.activeTab === 0) {
				return false;
			}

			console.log('Tracker.gui', 'Force initialization of Tracklist editor by triggering of window resize event...');
			$('#tab-tracker').tab('show');
			$(window).trigger('resize', [ true ]);
			return true;
		},
		function() {
			if (this.tracklist.initialized || !this.pixelfont.ctx || this.activeTab) {
				return false;
			}

			console.log('Tracker.gui', 'Redrawing all tracklist elements and canvas...');
			this.updatePanels();
			this.updateTracklist(true);
			this.tracklist.initialized = true;
			return true;
		},
		function() {
			console.log('Tracker.gui', 'Starting audio playback and initializing screen refresh timer...');
			SyncTimer.start(this.baseTimer.bind(this));
			return true;
		},
		function() {
			console.log('Tracker.gui', 'Initialization done, everything is ready!');
			document.body.className = '';
			return (this.loaded = true);
		},
		function() {
			if (!(this.loaded && electron && electron.remote)) {
				return false;
			}

			let win = electron.remote.getCurrentWindow();
			let updater = win && win.updater;
			if (updater) {
				console.log('Tracker.updater', 'Checking for updates...');
				updater.check(this.onCmdAppUpdate.bind(this));
			}

			return true;
		}
	];

	let initFn = (i => {
		let fn = initSteps[i];
		if (!!fn) {
			if (fn.call(this, i)) {
				i++;
			}

			setTimeout(initFn, 50, i);
		}
	}).bind(this);

	initFn(0);
};
//---------------------------------------------------------------------------------------
$(document).ready(function() { window.Tracker = new Tracker('<%= pkg.version %>') });
//---------------------------------------------------------------------------------------
