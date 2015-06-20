/** Tracker.tracklist submodule */
//---------------------------------------------------------------------------------------
var TracklistPosition = (function () {
	function TracklistPosition() {
		this.y = 0;
		this.line = 0;
		this.channel = 0;
		this.column = 0;
		this.start = { x: 0, y: 0 };
		this.compare = function (p) {
			return (this.y === p.y &&
			this.line === p.line &&
			this.channel === p.channel &&
			this.column === p.column);
		}
	}

	return TracklistPosition;
})();
//---------------------------------------------------------------------------------------
var Tracklist = (function () {
	function Tracklist(app) {
		this.obj = null;
		this.ctx = null;
		this.zoom = 2;

		this.countTracklines = function() {
			var a = $('#statusbar').offset(),
				b = $('#tracklist').offset(),
				c = app.settings.tracklistLineHeight;
			return Math.max(((((a.top - b.top) / c / this.zoom) | 1) - 2), 9);
		};

		this.setHeight = function(height) {
			if (height === void 0) {
				height = app.settings.tracklistAutosize
					? this.countTracklines()
					: app.settings.tracklistLines;
			}

			app.settings.tracklistLines = height;
			height *= app.settings.tracklistLineHeight;

			$(this.obj).prop('height', height).css({ 'height': height * this.zoom });
		};

		this.moveCurrentline = function(delta) {
			if (!app.player.position.length || app.modePlay)
				return;

			var line = app.player.currentLine + delta,
				pos = app.player.currentPosition,
				pp = app.player.position[pos];

			if (line < 0)
				line += pp.length;
			else if (line >= pp.length)
				line -= pp.length;

			app.player.currentLine = line;
		}
	}

	return Tracklist;
})();
//---------------------------------------------------------------------------------------
