/** Tracker.gui submodule - element populator with jQuery */
//---------------------------------------------------------------------------------------
Tracker.prototype.populateGUI = function () {
	var i, app = this, populatedElementsTable = [
		{
			selector: '[data-toggle="tooltip"]',
			method:   'tooltip'
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
			}
		}, {
			selector: '#scPattern',
			method:   'change',
			handler:  function() {
				if (app.player.pattern.length <= 1)
					return;
				app.workingPattern = $(this).val();
				app.updatePanelPattern();
			}
		}, {
			selector: 'a[id^="miFileImportDemo"]',
			method:   'click',
			handler:  function() { app.loadDemosong($(this).data().filename) }
		}, {
			selector: '#miStop',
			method:   'click',
			handler:  function() {
				app.player.stopChannel();
				app.modePlay = false;
			}
		}, {
			selector: '#miSongPlay',
			method:   'click',
			handler:  function() {
				app.modePlay = app.player.playPosition(false, true, true);
			}
		}, {
			selector: '#miSongPlayStart',
			method:   'click',
			handler:  function() {
				app.modePlay = app.player.playPosition(true, true, true);
			}
		}, {
			selector: '#miPosPlay',
			method:   'click',
			handler:  function() {
				app.modePlay = app.player.playPosition(false, false, false);
			}
		}, {
			selector: '#miPosPlayStart',
			method:   'click',
			handler:  function() {
				app.modePlay = app.player.playPosition(false, false, true);
			}
		}, {
			selector: '#miToggleLoop',
			method:   'click',
			handler:  function() {
				var state = app.player.loopMode = !app.player.loopMode,
					el = $(this).find('span'),
					icon1 = 'glyphicon-repeat', icon2 = 'glyphicon-remove-circle',
					glyph = state ? icon1 : icon2,
					color = state ? '#000' : '#ccc';

				el.removeClass(icon1 + ' ' + icon2);
				el.addClass(glyph).css({ 'color': color });
			}
		}
	];

//---------------------------------------------------------------------------------------
	for (i in populatedElementsTable) {
		if (!populatedElementsTable.hasOwnProperty(i))
			continue;

		var obj = populatedElementsTable[i],
			param = obj.handler || obj.data;
		eval("$('" + obj.selector + "')." + (obj.param
			? (obj.method + "('" + obj.param + "', param)")
			: (obj.method + "(param)")));
	}
};
//---------------------------------------------------------------------------------------
