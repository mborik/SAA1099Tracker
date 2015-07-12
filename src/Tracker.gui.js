/** Tracker.gui submodule - element populator with jQuery */
//---------------------------------------------------------------------------------------
Tracker.prototype.populateGUI = function () {
	var app = this, populatedElementsTable = [
		{
			global:   'document',
			method:   'bind',
			param:    'contextmenu',
			handler:  function(e) {
				e.preventDefault();
				return false;
			}
		}, {
			global:   'window',
			method:   'resize',
			handler:  function() {
				var c = app.tracklist.countTracklines();
				if (c !== app.settings.tracklistLineHeight) {
					app.tracklist.setHeight(c);
					app.updateTracklist(true);
				}
			}
		}, {
			global:   'window',
			method:   'bind',
			param:    'keyup keydown',
			handler:  function(e) { return app.handleKeyEvent(e.originalEvent) }
		}, {
			selector: '[data-toggle="tooltip"]',
			method:   'tooltip',
			data:     {
				animation: false,
				container: '.tooltip-target',
				viewport:  { selector: '.tooltip-target', padding: 0 },
				template:  '<div class="tooltip tooltip-custom" role="tooltip"><div class="tooltip-inner"></div></div>'
			}
		}, {
			selector: 'img.pixelfont',
			method:   'load',
			handler:  function(e) {
				app.initPixelFont(e.target);
				app.updateTracklist(true);
			}
		}, {
			selector: 'canvas',
			method:   'each',
			handler:  function(i, el) {
				var name = el.id, o = app[name];
				if (o !== undefined) {
					o.obj = el;
					o.ctx = el.getContext('2d');

					// first height initialization
					if (name === 'tracklist')
						o.setHeight();
				}
			}
		}, {
			selector: '#tracklist',
			method:   'on',
			param:    'mousewheel DOMMouseScroll',
			handler:  function(e) {
				if (!app.player.position.length || app.modePlay)
					return;

				var delta = e.originalEvent.wheelDelta || -e.originalEvent.deltaY || -e.originalEvent.detail;

				e.stopPropagation();
				e.preventDefault();
				e.target.focus();

				if (delta < 0)
					app.tracklist.moveCurrentline(1);
				else if (delta > 0)
					app.tracklist.moveCurrentline(-1);

				app.updateTracklist();
				app.updatePanelInfo();
			}
		}, {
			selector: '#scOctave',
			method:   'TouchSpin',
			data: {
				initval: '2',
				min: 1, max: 8
			}
		}, {
			selector: '#scAutoSmp',
			method:   'TouchSpin',
			data: {
				initval: '0',
				radix: 32,
				min: 0, max: 31
			}
		}, {
			selector: '#scAutoOrn',
			method:   'TouchSpin',
			data: {
				initval: '0',
				radix: 16,
				min: 0, max: 15
			}
		}, {
			selector: '#scRowStep',
			method:   'TouchSpin',
			data: {
				initval: '0',
				min: 0, max: 8
			}
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
				min: 1, max: 96
			}
		}, {
			selector: '#scPosSpeed',
			method:   'TouchSpin',
			data: {
				initval: '6',
				min: 1, max: 31
			}
		}, {
			selector: 'input[id^="scChnTrans"]',
			method:   'TouchSpin',
			data: {
				initval: '0',
				min: -24, max: 24
			}
		}, {
			selector: 'input[id^="scChnButton"]',
			method:   'each',
			handler:  function(i, el) {
				var cc = el.id.substr(-1);
				$(this).bootstrapToggle({
					on: cc,
					off: cc,
					onstyle: 'default',
					offstyle: 'default',
					size: 'mini',
					width: 58
				}).change(function(e) {
					var el = e.target;
					app.player.SAA1099.mute((el.value - 1), !el.checked);
				});
			}
		}, {
			selector: '#scPosCurrent',
			method:   'change',
			handler:  function() {
				if (!app.player.position.length)
					return;
				app.player.currentPosition = $(this).val() - 1;
				app.updatePanelInfo();
				app.updatePanelPosition();
				app.updateTracklist();
			}
		}, {
			selector: '#scPattern',
			method:   'change',
			handler:  function() {
				if (app.player.pattern.length <= 1)
					return;
				app.workingPattern = $(this).val() - 0;
				app.updatePanelPattern();
			}
		}, {
			selector: 'a[id^="miFileImportDemo"]',
			method:   'click',
			handler:  function() {
				var data = $(this).data(), fn = data.filename;
				if (!fn)
					return false;
				app.loadDemosong(fn);
			}
		}, {
			selector: '#miStop',
			method:   'click',
			handler:  function() { app.onCmdStop() }
		}, {
			selector: '#miSongPlay',
			method:   'click',
			handler:  function() { app.onCmdSongPlay() }
		}, {
			selector: '#miSongPlayStart',
			method:   'click',
			handler:  function() { app.onCmdSongPlayStart() }
		}, {
			selector: '#miPosPlay',
			method:   'click',
			handler:  function() { app.onCmdPosPlay() }
		}, {
			selector: '#miPosPlayStart',
			method:   'click',
			handler:  function() { app.onCmdPosPlayStart() }
		}, {
			selector: '#miToggleLoop',
			method:   'click',
			handler:  function() { app.onCmdToggleLoop() }
		}
	];

//---------------------------------------------------------------------------------------
	for (var i = 0, l = populatedElementsTable.length; i < l; i++) {
		var obj = populatedElementsTable[i],
			param = obj.handler || obj.data,
			selector = (obj.selector) ? "'" + obj.selector + "'" : obj.global;
		eval("$(" + selector + ")." + (obj.param
			? (obj.method + "('" + obj.param + "', param)")
			: (obj.method + "(param)")));
	}
};
//---------------------------------------------------------------------------------------
